"""
WorkDrive API
=============
A WorkDrive-style team file workspace, integrated into the NeuzenAI HRMS
backend. It reuses the shared MongoDB connection (document metadata) and the
shared S3 client (file blobs).

Mongo collections
-----------------
- workdrive_users         : { id, name, email, color }
- workdrive_team_folders  : { id, name, color, members: [{ userId, role }] }
- workdrive_items         : { id, name, type, parentId, ownerId, size?,
                              modified, starred, s3_key?, content_type? }
- workdrive_shares        : { itemId, enabled, link, access, password,
                              expiry, allowDownload }

The first request seeds a realistic sample workspace so the module is usable
immediately. The endpoints mirror the actions dispatched by the React store.
"""
from __future__ import annotations

import datetime
import uuid
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel

from database.mongo_client import mongo_db
from database.s3_client import s3_db

workdrive_router = APIRouter()

# Collection names ----------------------------------------------------------
C_USERS = "workdrive_users"
C_TEAM_FOLDERS = "workdrive_team_folders"
C_ITEMS = "workdrive_items"
C_SHARES = "workdrive_shares"

# Default placeholder user - represents whoever is signed in when their HRMS
# email does not match a pre-seeded WorkDrive user.
DEFAULT_USER_ID = "u1"
SHARE_FIELDS = ("enabled", "link", "access", "password", "expiry", "allowDownload")


# --------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------
def _col(name: str):
    """Return a Mongo collection, or 503 if the database is unavailable."""
    if mongo_db.db is None:
        raise HTTPException(status_code=503, detail="WorkDrive database unavailable")
    return mongo_db.db[name]


def _now() -> str:
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


# --------------------------------------------------------------------------
# Seed data (mirrors the frontend sample workspace)
# --------------------------------------------------------------------------
def _seed_users() -> List[Dict[str, Any]]:
    return [
        {"id": "u1", "name": "You", "email": "you@z-ninth.com", "color": "#2E75B6"},
        {"id": "u2", "name": "Priya Nair", "email": "priya@z-ninth.com", "color": "#E2574C"},
        {"id": "u3", "name": "Arjun Rao", "email": "arjun@z-ninth.com", "color": "#1E8E5A"},
        {"id": "u4", "name": "Sara Khan", "email": "sara@z-ninth.com", "color": "#E08B2D"},
        {"id": "u5", "name": "Dev Patel", "email": "dev@z-ninth.com", "color": "#9B59B6"},
        {"id": "u6", "name": "Meera Iyer", "email": "meera@z-ninth.com", "color": "#C0398A"},
    ]


def _seed_team_folders() -> List[Dict[str, Any]]:
    return [
        {
            "id": "tf-design",
            "name": "Product Design",
            "color": "#2E75B6",
            "members": [
                {"userId": "u1", "role": "Admin"},
                {"userId": "u2", "role": "Organizer"},
                {"userId": "u3", "role": "Editor"},
                {"userId": "u4", "role": "Commenter"},
            ],
        },
        {
            "id": "tf-mktg",
            "name": "Marketing",
            "color": "#E2574C",
            "members": [
                {"userId": "u4", "role": "Admin"},
                {"userId": "u1", "role": "Editor"},
                {"userId": "u5", "role": "Viewer"},
                {"userId": "u6", "role": "Organizer"},
            ],
        },
        {
            "id": "tf-eng",
            "name": "Engineering Docs",
            "color": "#1E8E5A",
            "members": [
                {"userId": "u1", "role": "Admin"},
                {"userId": "u3", "role": "Organizer"},
                {"userId": "u5", "role": "Editor"},
            ],
        },
    ]


def _seed_items() -> List[Dict[str, Any]]:
    def folder(id_, name, parent, owner, modified, starred=False):
        return {
            "id": id_, "name": name, "type": "folder", "parentId": parent,
            "ownerId": owner, "modified": modified, "starred": starred,
        }

    def file(id_, name, parent, owner, size, modified, starred=False):
        return {
            "id": id_, "name": name, "type": "file", "parentId": parent,
            "ownerId": owner, "size": size, "modified": modified, "starred": starred,
        }

    return [
        # --- Product Design ---
        folder("d-wire", "Wireframes", "tf-design", "u2", "2026-05-19T10:20:00", True),
        folder("d-brand", "Brand Assets", "tf-design", "u1", "2026-05-12T09:00:00"),
        file("d-sys", "Design-System.pdf", "tf-design", "u1", 4820000, "2026-05-21T14:30:00", True),
        file("d-home", "Homepage-Mockup.png", "tf-design", "u2", 2140000, "2026-05-20T16:05:00"),
        file("d-road", "Q3-Roadmap.docx", "tf-design", "u3", 88000, "2026-05-18T11:45:00"),
        file("d-notes", "Research-Notes.md", "tf-design", "u4", 12400, "2026-05-15T08:30:00"),
        file("d-login", "Login-Flow.png", "d-wire", "u2", 1330000, "2026-05-19T10:18:00"),
        file("d-dash", "Dashboard-v2.png", "d-wire", "u2", 1870000, "2026-05-19T10:22:00", True),
        file("d-mobile", "Mobile-Screens.fig", "d-wire", "u3", 6010000, "2026-05-17T13:00:00"),
        file("d-logo", "Logo-Pack.zip", "d-brand", "u1", 9450000, "2026-05-12T09:10:00"),
        file("d-color", "Color-Tokens.xlsx", "d-brand", "u1", 46000, "2026-05-11T17:20:00"),
        # --- Marketing ---
        folder("m-camp", "Campaigns", "tf-mktg", "u4", "2026-05-20T12:00:00"),
        file("m-plan", "Launch-Plan.docx", "tf-mktg", "u4", 124000, "2026-05-21T09:15:00", True),
        file("m-cal", "Social-Calendar.xlsx", "tf-mktg", "u6", 71000, "2026-05-19T15:40:00"),
        file("m-deck", "Investor-Deck.pptx", "tf-mktg", "u1", 5220000, "2026-05-16T10:00:00"),
        file("m-spring", "Spring-Promo.pdf", "m-camp", "u4", 2980000, "2026-05-20T12:05:00"),
        file("m-copy", "Ad-Copy.docx", "m-camp", "u6", 54000, "2026-05-18T14:25:00"),
        # --- Engineering Docs ---
        folder("e-arch", "Architecture", "tf-eng", "u3", "2026-05-18T18:00:00", True),
        file("e-api", "API-Reference.pdf", "tf-eng", "u1", 3410000, "2026-05-22T08:50:00", True),
        file("e-onb", "Onboarding.md", "tf-eng", "u3", 21000, "2026-05-14T11:30:00"),
        file("e-rel", "Release-Notes.docx", "tf-eng", "u5", 67000, "2026-05-13T16:10:00"),
        file("e-sys", "System-Design.pdf", "e-arch", "u3", 2660000, "2026-05-18T17:55:00"),
        file("e-db", "DB-Schema.png", "e-arch", "u5", 940000, "2026-05-17T09:40:00"),
        # --- My Folders (personal space) ---
        folder("p-personal", "Personal", "my-root", "u1", "2026-05-10T10:00:00"),
        file("p-notes", "Meeting-Notes.md", "my-root", "u1", 8900, "2026-05-22T19:20:00", True),
        file("p-budget", "Budget-2026.xlsx", "my-root", "u1", 58000, "2026-05-21T13:05:00"),
        file("p-draft", "Draft-Proposal.docx", "p-personal", "u1", 33000, "2026-05-10T10:05:00"),
    ]


def _seed_shares() -> List[Dict[str, Any]]:
    return [
        {
            "itemId": "d-sys", "enabled": True,
            "link": "https://workdrive.z-ninth.com/s/a1b2c3/design-system-pdf",
            "access": "view", "password": "", "expiry": "2026-06-30", "allowDownload": True,
        },
        {
            "itemId": "m-plan", "enabled": True,
            "link": "https://workdrive.z-ninth.com/s/x9y8z7/launch-plan-docx",
            "access": "comment", "password": "spring26", "expiry": "", "allowDownload": False,
        },
    ]


def _ensure_seeded() -> None:
    """Populate the sample workspace once, on first use."""
    tf_col = _col(C_TEAM_FOLDERS)
    if tf_col.count_documents({}, limit=1) > 0:
        return
    _col(C_USERS).insert_many(_seed_users())
    tf_col.insert_many(_seed_team_folders())
    _col(C_ITEMS).insert_many(_seed_items())
    _col(C_SHARES).insert_many(_seed_shares())


# --------------------------------------------------------------------------
# Request models
# --------------------------------------------------------------------------
class ItemCreate(BaseModel):
    id: str
    name: str
    type: str = "folder"
    parentId: str
    ownerId: str
    modified: Optional[str] = None
    starred: bool = False


class ItemPatch(BaseModel):
    name: Optional[str] = None
    starred: Optional[bool] = None


class DeleteRequest(BaseModel):
    ids: List[str]


class TeamFolderCreate(BaseModel):
    id: str
    name: str
    color: str
    ownerId: str


class MemberAdd(BaseModel):
    userId: str
    role: str


class RolePatch(BaseModel):
    role: str


class ShareModel(BaseModel):
    enabled: bool = False
    link: str = ""
    access: str = "view"
    password: str = ""
    expiry: str = ""
    allowDownload: bool = True


class SharePut(BaseModel):
    share: Optional[ShareModel] = None


# --------------------------------------------------------------------------
# Endpoints
# --------------------------------------------------------------------------
@workdrive_router.get("/workdrive/health")
def workdrive_health():
    return {"module": "workdrive", "database": mongo_db.get_status()}


# --------------------------------------------------------------------------
# One-time cleanup of demo data an earlier build seeded into MongoDB
# --------------------------------------------------------------------------
_LEGACY_TF = ["tf-design", "tf-mktg", "tf-eng"]
_LEGACY_ITEMS = [
    "d-wire", "d-brand", "d-sys", "d-home", "d-road", "d-notes", "d-login",
    "d-dash", "d-mobile", "d-logo", "d-color", "m-camp", "m-plan", "m-cal",
    "m-deck", "m-spring", "m-copy", "e-arch", "e-api", "e-onb", "e-rel",
    "e-sys", "e-db", "p-personal", "p-notes", "p-budget", "p-draft",
]
_LEGACY_USERS = ["u1", "u2", "u3", "u4", "u5", "u6"]


def _purge_legacy_seed():
    """Remove the demo folders/files/users an earlier version seeded.
    Safe and idempotent - real content uses generated ids and is untouched."""
    try:
        _col(C_TEAM_FOLDERS).delete_many({"id": {"$in": _LEGACY_TF}})
        _col(C_ITEMS).delete_many({"id": {"$in": _LEGACY_ITEMS}})
        _col(C_SHARES).delete_many({"itemId": {"$in": ["d-sys", "m-plan"]}})
        _col(C_USERS).delete_many({"id": {"$in": _LEGACY_USERS}})
    except Exception:
        pass


def _wd_color(seed):
    """Deterministic avatar colour for a user."""
    palette = ["#2E75B6", "#E2574C", "#1E8E5A", "#E08B2D", "#9B59B6",
               "#C0398A", "#2AA3A3", "#3B7DD8"]
    h = 0
    for ch in str(seed or "x"):
        h = (h * 31 + ord(ch)) & 0xFFFFFFFF
    return palette[h % len(palette)]


def _workdrive_users():
    """WorkDrive users are the real HRMS employees (no demo accounts)."""
    if mongo_db.users is None:
        return []
    out, seen = [], set()
    for u in mongo_db.users.find({}, {"_id": 0, "password": 0}):
        email = (u.get("email") or "").strip()
        uid_ = u.get("employee_id") or email or u.get("name")
        if not uid_ or str(uid_) in seen:
            continue
        seen.add(str(uid_))
        out.append({
            "id": str(uid_),
            "name": u.get("name") or email or "Employee",
            "email": email,
            "color": _wd_color(uid_),
        })
    return out


@workdrive_router.get("/workdrive/state")
def get_state(email=None, name=None):
    """Live workspace snapshot. Users are the real HRMS employees; folders,
    files and shares are only what users have actually created and saved."""
    _purge_legacy_seed()
    users = _workdrive_users()
    team_folders = list(_col(C_TEAM_FOLDERS).find({}, {"_id": 0}))
    items = list(_col(C_ITEMS).find({}, {"_id": 0}))
    share_docs = list(_col(C_SHARES).find({}, {"_id": 0}))

    shares = {}
    for doc in share_docs:
        item_id = doc.get("itemId")
        if item_id:
            shares[item_id] = {k: doc.get(k) for k in SHARE_FIELDS}

    # Resolve the signed-in HRMS user.
    current_user_id = None
    if email:
        m = next((u for u in users if (u.get("email") or "").lower() == email.lower()), None)
        if m:
            current_user_id = m["id"]
    if current_user_id is None:
        me = {
            "id": email or "me",
            "name": name or email or "You",
            "email": email or "",
            "color": _wd_color(email or "me"),
        }
        users = [me] + users
        current_user_id = me["id"]

    return {
        "users": users,
        "currentUserId": current_user_id,
        "teamFolders": team_folders,
        "items": items,
        "shares": shares,
    }


@workdrive_router.post("/workdrive/items")
def create_item(payload: ItemCreate):
    """Create a folder (or a metadata-only item)."""
    if _col(C_ITEMS).count_documents({"id": payload.id}, limit=1) > 0:
        raise HTTPException(status_code=409, detail="Item id already exists")
    item = {
        "id": payload.id,
        "name": payload.name,
        "type": payload.type,
        "parentId": payload.parentId,
        "ownerId": payload.ownerId,
        "modified": payload.modified or _now(),
        "starred": payload.starred,
    }
    _col(C_ITEMS).insert_one(dict(item))
    return item


@workdrive_router.post("/workdrive/upload")
async def upload_files(
    folder_id: str = Form(...),
    owner_id: str = Form(...),
    files: List[UploadFile] = File(...),
):
    """Upload one or more files into a folder. Blobs go to S3, metadata to Mongo."""
    created: List[Dict[str, Any]] = []
    for upload in files:
        content = await upload.read()
        item_id = "file-" + uuid.uuid4().hex[:12]
        filename = upload.filename or "untitled"
        s3_key = "workdrive/" + item_id + "/" + filename
        content_type = upload.content_type or "application/octet-stream"
        s3_db.save_file(s3_key, content, content_type)
        item = {
            "id": item_id,
            "name": filename,
            "type": "file",
            "parentId": folder_id,
            "ownerId": owner_id,
            "size": len(content),
            "modified": _now(),
            "starred": False,
            "s3_key": s3_key,
            "content_type": content_type,
        }
        _col(C_ITEMS).insert_one(dict(item))
        created.append(item)
    return {"items": created}


@workdrive_router.patch("/workdrive/items/{item_id}")
def patch_item(item_id: str, payload: ItemPatch):
    """Rename or (un)star an item."""
    update: Dict[str, Any] = {}
    if payload.name is not None:
        update["name"] = payload.name
        update["modified"] = _now()
    if payload.starred is not None:
        update["starred"] = payload.starred
    if not update:
        raise HTTPException(status_code=400, detail="Nothing to update")
    result = _col(C_ITEMS).update_one({"id": item_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return _col(C_ITEMS).find_one({"id": item_id}, {"_id": 0})


@workdrive_router.post("/workdrive/items/delete")
def delete_items(payload: DeleteRequest):
    """Delete items and all of their descendants (folders + files + shares)."""
    items = list(_col(C_ITEMS).find({}, {"_id": 0}))
    by_parent: Dict[str, List[Dict[str, Any]]] = {}
    for it in items:
        by_parent.setdefault(it.get("parentId"), []).append(it)

    to_delete: Dict[str, Dict[str, Any]] = {}

    def collect(item_id: str):
        for child in by_parent.get(item_id, []):
            if child["id"] not in to_delete:
                to_delete[child["id"]] = child
                collect(child["id"])

    items_by_id = {it["id"]: it for it in items}
    for item_id in payload.ids:
        if item_id in items_by_id:
            to_delete[item_id] = items_by_id[item_id]
        collect(item_id)

    deleted_ids = list(to_delete.keys())
    if deleted_ids:
        # Best-effort removal of stored blobs.
        for it in to_delete.values():
            key = it.get("s3_key")
            if key:
                try:
                    if not s3_db.mock_mode and s3_db.s3_client:
                        s3_db.s3_client.delete_object(Bucket=s3_db.bucket_name, Key=key)
                    elif s3_db.mock_mode:
                        s3_db.local_storage.pop(key, None)
                except Exception:
                    pass
        _col(C_ITEMS).delete_many({"id": {"$in": deleted_ids}})
        _col(C_SHARES).delete_many({"itemId": {"$in": deleted_ids}})

    return {"deleted": deleted_ids}


@workdrive_router.post("/workdrive/team-folders")
def create_team_folder(payload: TeamFolderCreate):
    """Create a Team Folder with the creator as Admin."""
    if _col(C_TEAM_FOLDERS).count_documents({"id": payload.id}, limit=1) > 0:
        raise HTTPException(status_code=409, detail="Team Folder id already exists")
    tf = {
        "id": payload.id,
        "name": payload.name,
        "color": payload.color,
        "members": [{"userId": payload.ownerId, "role": "Admin"}],
    }
    _col(C_TEAM_FOLDERS).insert_one(dict(tf))
    return tf


@workdrive_router.post("/workdrive/team-folders/{tf_id}/members")
def add_member(tf_id: str, payload: MemberAdd):
    tf = _col(C_TEAM_FOLDERS).find_one({"id": tf_id})
    if not tf:
        raise HTTPException(status_code=404, detail="Team Folder not found")
    members = tf.get("members", [])
    if any(m["userId"] == payload.userId for m in members):
        raise HTTPException(status_code=409, detail="Already a member")
    members.append({"userId": payload.userId, "role": payload.role})
    _col(C_TEAM_FOLDERS).update_one({"id": tf_id}, {"$set": {"members": members}})
    return {"ok": True, "members": members}


@workdrive_router.patch("/workdrive/team-folders/{tf_id}/members/{user_id}")
def change_role(tf_id: str, user_id: str, payload: RolePatch):
    result = _col(C_TEAM_FOLDERS).update_one(
        {"id": tf_id, "members.userId": user_id},
        {"$set": {"members.$.role": payload.role}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Member not found")
    return {"ok": True}


@workdrive_router.post("/workdrive/team-folders/{tf_id}/members/{user_id}/remove")
def remove_member(tf_id: str, user_id: str):
    result = _col(C_TEAM_FOLDERS).update_one(
        {"id": tf_id}, {"$pull": {"members": {"userId": user_id}}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Team Folder not found")
    return {"ok": True}


@workdrive_router.put("/workdrive/shares/{item_id}")
def set_share(item_id: str, payload: SharePut):
    """Enable/update a share link, or turn sharing off."""
    share = payload.share
    if share and share.enabled:
        doc = {"itemId": item_id}
        for k in SHARE_FIELDS:
            doc[k] = getattr(share, k)
        _col(C_SHARES).update_one({"itemId": item_id}, {"$set": doc}, upsert=True)
        return {"ok": True, "share": {k: getattr(share, k) for k in SHARE_FIELDS}}
    _col(C_SHARES).delete_one({"itemId": item_id})
    return {"ok": True, "share": None}


@workdrive_router.get("/workdrive/download/{item_id}")
def download_item(item_id: str):
    """Stream a stored file back to the browser."""
    item = _col(C_ITEMS).find_one({"id": item_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    key = item.get("s3_key")
    if not key:
        raise HTTPException(status_code=404, detail="This item has no stored file")
    data = s3_db.get_image(key)
    if data is None:
        raise HTTPException(status_code=404, detail="File not found in storage")
    disposition = 'attachment; filename="' + str(item.get("name", "download")) + '"'
    return Response(
        content=data,
        media_type=item.get("content_type") or "application/octet-stream",
        headers={"Content-Disposition": disposition},
    )
