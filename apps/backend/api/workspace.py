"""
Workspace API
=============
Persistence-backed API for the Z-ninth Workspace portal (27 apps).

- HR-linked apps (people, payroll, calendar, shifts, expense) return LIVE data
  read straight from the existing HRMS collections, so they always reflect the
  real company database.
- Every other app gets full create / read / update / delete on its own
  `workspace_<app>` MongoDB collection. Collections start empty and fill up
  with whatever users actually create - there is no predefined demo data.
"""
from __future__ import annotations

import datetime
import uuid
from typing import Any, Dict

from fastapi import APIRouter, Body, HTTPException

from database.mongo_client import mongo_db

workspace_router = APIRouter()

# The 26 portal apps backed by this router (WorkDrive has its own router).
WORKSPACE_APPS = {
    "mail", "cliq", "teams", "meetings", "teaminbox", "connect", "notebook",
    "calendar", "todo", "sheets", "officesuite", "bookings", "vault", "sign",
    "crm", "forms", "campaigns", "desk", "analytics", "people", "payroll",
    "shifts", "expense", "recruit", "workerly", "projects",
}
# Apps that read straight from the HRMS database (read-only live views).
HR_LINKED = {"people", "payroll", "calendar", "shifts", "expense"}


# --------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------
def _col(name: str):
    if mongo_db.db is None:
        raise HTTPException(status_code=503, detail="Workspace database unavailable")
    return mongo_db.db[name]


def _now() -> str:
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def _check_app(app: str) -> None:
    if app not in WORKSPACE_APPS:
        raise HTTPException(status_code=404, detail="Unknown workspace app: " + str(app))


# --------------------------------------------------------------------------
# HR-linked live readers (real company data)
# --------------------------------------------------------------------------
def _hr_people():
    if mongo_db.users is None:
        return []
    out = []
    for u in mongo_db.users.find({}, {"_id": 0, "password": 0}):
        out.append({
            "id": str(u.get("employee_id") or u.get("email") or uuid.uuid4().hex[:8]),
            "name": u.get("name") or "-",
            "email": u.get("email") or "-",
            "department": u.get("department") or "-",
            "role": u.get("role") or u.get("designation") or u.get("employment_type") or "-",
            "status": u.get("status") or "Active",
        })
    return out


def _money(value):
    try:
        return "$" + format(int(float(value)), ",")
    except (TypeError, ValueError):
        return str(value) if value not in (None, "") else "-"


def _hr_payroll():
    if mongo_db.users is None:
        return []
    out = []
    for u in mongo_db.users.find({}, {"_id": 0, "password": 0}):
        out.append({
            "id": str(u.get("employee_id") or u.get("email") or uuid.uuid4().hex[:8]),
            "name": u.get("name") or "-",
            "department": u.get("department") or "-",
            "salary": _money(u.get("monthly_salary") or u.get("salary")),
            "status": u.get("status") or "Active",
        })
    return out


def _hr_calendar():
    if mongo_db.holidays is None:
        return []
    out = []
    for h in mongo_db.holidays.find({}, {"_id": 0}):
        out.append({
            "id": str(h.get("date") or uuid.uuid4().hex[:8]),
            "title": h.get("name") or "Holiday",
            "date": h.get("date") or "",
            "type": h.get("type") or "Holiday",
        })
    return out


def _hr_shifts():
    if mongo_db.attendance is None:
        return []
    out = []
    for a in mongo_db.attendance.find({}, {"_id": 0}).limit(80):
        out.append({
            "id": str(a.get("id") or uuid.uuid4().hex[:8]),
            "employee": str(a.get("employee_id") or a.get("name") or "-"),
            "date": str(a.get("date") or "-"),
            "shift": str(a.get("action") or a.get("type") or "Work"),
            "status": str(a.get("status") or "Logged"),
        })
    return out


def _hr_expense():
    if mongo_db.item_requests is None:
        return []
    out = []
    for r in mongo_db.item_requests.find({}, {"_id": 0}).limit(120):
        out.append({
            "id": str(r.get("id") or r.get("request_id") or uuid.uuid4().hex[:8]),
            "item": str(r.get("item") or r.get("title") or r.get("type") or "Request"),
            "employee": str(r.get("employee_name") or r.get("employee_id") or "-"),
            "amount": _money(r.get("amount") or r.get("cost")),
            "status": str(r.get("status") or "Pending"),
        })
    return out


HR_READERS = {
    "people": _hr_people,
    "payroll": _hr_payroll,
    "calendar": _hr_calendar,
    "shifts": _hr_shifts,
    "expense": _hr_expense,
}


# --------------------------------------------------------------------------
# Endpoints
# --------------------------------------------------------------------------
@workspace_router.get("/workspace/summary")
def summary():
    """Record counts per app - powers the portal home screen."""
    out: Dict[str, int] = {}
    for app in WORKSPACE_APPS:
        try:
            if app in HR_READERS:
                out[app] = len(HR_READERS[app]())
            else:
                out[app] = _col("workspace_" + app).count_documents({})
        except Exception:
            out[app] = 0
    return out


@workspace_router.get("/workspace/{app}/records")
def list_records(app: str):
    """List every record for an app. HR-linked apps return live HRMS data."""
    _check_app(app)
    if app in HR_READERS:
        return {"app": app, "readOnly": True, "records": HR_READERS[app]()}
    docs = list(_col("workspace_" + app).find({}, {"_id": 0}))
    return {"app": app, "readOnly": False, "records": docs}


@workspace_router.post("/workspace/{app}/records")
def create_record(app: str, payload: Dict[str, Any] = Body(...)):
    """Create and persist a new record."""
    _check_app(app)
    if app in HR_LINKED:
        raise HTTPException(status_code=400, detail=app + " is a live HRMS view and is read-only")
    rec = dict(payload or {})
    rec["id"] = rec.get("id") or ("rec-" + uuid.uuid4().hex[:12])
    rec.setdefault("createdAt", _now())
    _col("workspace_" + app).insert_one(dict(rec))
    return rec


@workspace_router.patch("/workspace/{app}/records/{rid}")
def update_record(app: str, rid: str, payload: Dict[str, Any] = Body(...)):
    """Update fields of an existing record."""
    _check_app(app)
    if app in HR_LINKED:
        raise HTTPException(status_code=400, detail=app + " is read-only")
    patch = {k: v for k, v in (payload or {}).items() if k != "id"}
    if not patch:
        raise HTTPException(status_code=400, detail="Nothing to update")
    patch["updatedAt"] = _now()
    result = _col("workspace_" + app).update_one({"id": rid}, {"$set": patch})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Record not found")
    return _col("workspace_" + app).find_one({"id": rid}, {"_id": 0})


@workspace_router.delete("/workspace/{app}/records/{rid}")
def delete_record(app: str, rid: str):
    """Delete a record."""
    _check_app(app)
    if app in HR_LINKED:
        raise HTTPException(status_code=400, detail=app + " is read-only")
    _col("workspace_" + app).delete_one({"id": rid})
    return {"ok": True, "deleted": rid}
