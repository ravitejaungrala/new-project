import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import { users, currentUserId, teamFolders as seedTF, items as seedItems, seedShares } from './data/seed.js';
import { uid, timeValue } from './lib/helpers.js';
import { wdApi } from './lib/api.js';

// ---- initial state --------------------------------------------------------
// Seed data is the offline fallback: the UI is usable immediately and stays
// usable if the backend is unreachable. A successful HYDRATE replaces it with
// live data from the shared HRMS backend.
function buildItemsMap(list) {
  const map = {};
  list.forEach((it) => {
    map[it.id] = { ...it };
  });
  return map;
}

const initialState = {
  users,
  currentUserId,
  teamFolders: seedTF,
  items: buildItemsMap(seedItems),
  shares: { ...seedShares },
  view: 'grid', // 'grid' | 'list'
  sort: { key: 'name', dir: 'asc' }, // key: name | modified | size
  location: { kind: 'my', rootId: 'my-root' }, // kind: team | my | starred | recent | shared
  folderId: 'my-root',
  search: '',
  typeFilter: 'all', // all | folder | doc | sheet | slide | pdf | image
  selection: [],
  modal: null, // { type, payload }
  drawer: null, // { type: 'members', tfId }
  toast: null, // { msg }
  loading: true, // true until the first HYDRATE (or its failure)
  online: false, // true once live backend data has loaded
};

// ---- reducer --------------------------------------------------------------
function reducer(state, action) {
  switch (action.type) {
    case 'HYDRATE': {
      const d = action.data || {};
      const teamFolders = Array.isArray(d.teamFolders) ? d.teamFolders : [];
      const firstTf = teamFolders[0];
      return {
        ...state,
        users: Array.isArray(d.users) && d.users.length ? d.users : state.users,
        currentUserId: d.currentUserId || state.currentUserId,
        teamFolders,
        items: buildItemsMap(Array.isArray(d.items) ? d.items : []),
        shares: d.shares && typeof d.shares === 'object' ? d.shares : {},
        location: firstTf
          ? { kind: 'team', rootId: firstTf.id }
          : { kind: 'my', rootId: 'my-root' },
        folderId: firstTf ? firstTf.id : 'my-root',
        selection: [],
        loading: false,
        online: true,
      };
    }

    case 'HYDRATE_FAILED':
      return { ...state, loading: false, online: false };

    case 'NAVIGATE':
      return {
        ...state,
        location: action.location,
        folderId: action.folderId ?? state.folderId,
        selection: [],
        search: '',
        typeFilter: 'all',
      };

    case 'OPEN_FOLDER':
      return { ...state, folderId: action.folderId, selection: [] };

    case 'SET_VIEW':
      return { ...state, view: action.view };

    case 'SET_SORT':
      return { ...state, sort: action.sort };

    case 'SET_SEARCH':
      return { ...state, search: action.search };

    case 'SET_TYPE_FILTER':
      return { ...state, typeFilter: action.value };

    case 'SELECT': {
      if (action.mode === 'toggle') {
        const has = state.selection.includes(action.id);
        return {
          ...state,
          selection: has
            ? state.selection.filter((i) => i !== action.id)
            : [...state.selection, action.id],
        };
      }
      return { ...state, selection: action.id ? [action.id] : [] };
    }

    case 'CLEAR_SELECTION':
      return { ...state, selection: [] };

    case 'CREATE_FOLDER': {
      const item =
        action.item || {
          id: action.id || uid('fld'),
          name: action.name,
          type: 'folder',
          parentId: state.folderId,
          ownerId: state.currentUserId,
          modified: new Date().toISOString(),
          starred: false,
        };
      return {
        ...state,
        items: { ...state.items, [item.id]: item },
        modal: null,
        toast: { msg: `Folder "${item.name}" created` },
      };
    }

    // Files come back resolved (server upload) or built locally (offline).
    case 'ADD_ITEMS': {
      const added = {};
      (action.items || []).forEach((it) => {
        added[it.id] = it;
      });
      return {
        ...state,
        items: { ...state.items, ...added },
        modal: null,
        toast: action.toast ? { msg: action.toast } : state.toast,
      };
    }

    case 'RENAME': {
      const it = state.items[action.id];
      if (!it) return state;
      return {
        ...state,
        items: {
          ...state.items,
          [action.id]: { ...it, name: action.name, modified: new Date().toISOString() },
        },
        modal: null,
        toast: { msg: 'Item renamed' },
      };
    }

    case 'DELETE': {
      const toDelete = new Set();
      const collect = (parentId) => {
        Object.values(state.items).forEach((it) => {
          if (it.parentId === parentId) {
            toDelete.add(it.id);
            collect(it.id);
          }
        });
      };
      action.ids.forEach((id) => {
        toDelete.add(id);
        collect(id);
      });
      const items = {};
      Object.values(state.items).forEach((it) => {
        if (!toDelete.has(it.id)) items[it.id] = it;
      });
      const shares = { ...state.shares };
      toDelete.forEach((id) => delete shares[id]);
      const count = action.ids.length;
      return {
        ...state,
        items,
        shares,
        selection: [],
        modal: null,
        toast: { msg: `${count} item${count > 1 ? 's' : ''} deleted` },
      };
    }

    case 'TOGGLE_STAR': {
      const it = state.items[action.id];
      if (!it) return state;
      return {
        ...state,
        items: { ...state.items, [action.id]: { ...it, starred: !it.starred } },
      };
    }

    case 'CREATE_TEAM_FOLDER': {
      const id = action.id || uid('tf');
      const tf = {
        id,
        name: action.name,
        color: action.color,
        members: [{ userId: state.currentUserId, role: 'Admin' }],
      };
      return {
        ...state,
        teamFolders: [...state.teamFolders, tf],
        location: { kind: 'team', rootId: id },
        folderId: id,
        selection: [],
        modal: null,
        toast: { msg: `Team Folder "${action.name}" created` },
      };
    }

    case 'ADD_MEMBER': {
      const teamFolders = state.teamFolders.map((tf) =>
        tf.id === action.tfId
          ? { ...tf, members: [...tf.members, { userId: action.userId, role: action.role }] }
          : tf
      );
      return { ...state, teamFolders, toast: { msg: 'Member added' } };
    }

    case 'CHANGE_ROLE': {
      const teamFolders = state.teamFolders.map((tf) =>
        tf.id === action.tfId
          ? {
              ...tf,
              members: tf.members.map((m) =>
                m.userId === action.userId ? { ...m, role: action.role } : m
              ),
            }
          : tf
      );
      return { ...state, teamFolders, toast: { msg: 'Role updated' } };
    }

    case 'REMOVE_MEMBER': {
      const teamFolders = state.teamFolders.map((tf) =>
        tf.id === action.tfId
          ? { ...tf, members: tf.members.filter((m) => m.userId !== action.userId) }
          : tf
      );
      return { ...state, teamFolders, toast: { msg: 'Member removed' } };
    }

    case 'SET_SHARE': {
      const shares = { ...state.shares };
      if (action.share && action.share.enabled) {
        shares[action.itemId] = action.share;
      } else {
        delete shares[action.itemId];
      }
      return {
        ...state,
        shares,
        modal: null,
        toast: { msg: action.share && action.share.enabled ? 'Sharing updated' : 'Sharing turned off' },
      };
    }

    case 'OPEN_MODAL':
      return { ...state, modal: { type: action.modalType, payload: action.payload || null } };

    case 'CLOSE_MODAL':
      return { ...state, modal: null };

    case 'OPEN_DRAWER':
      return { ...state, drawer: { type: action.drawerType, tfId: action.tfId } };

    case 'CLOSE_DRAWER':
      return { ...state, drawer: null };

    case 'SHOW_TOAST':
      return { ...state, toast: { msg: action.msg } };

    case 'HIDE_TOAST':
      return { ...state, toast: null };

    default:
      return state;
  }
}

// ---- context --------------------------------------------------------------
const StoreContext = createContext(null);

export function StoreProvider({ user, children }) {
  const [state, rawDispatch] = useReducer(reducer, initialState);

  // Keep a live reference so the wrapped dispatch always reads fresh state.
  const stateRef = useRef(state);
  stateRef.current = state;

  // ---- hydrate from the backend on mount ----------------------------------
  useEffect(() => {
    let cancelled = false;
    wdApi
      .getState(user)
      .then((data) => {
        if (!cancelled) rawDispatch({ type: 'HYDRATE', data });
      })
      .catch(() => {
        if (cancelled) return;
        rawDispatch({ type: 'HYDRATE_FAILED' });
        rawDispatch({ type: 'SHOW_TOAST', msg: 'Offline - showing sample workspace' });
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  // ---- dispatch wrapper: UI updates optimistically, backend persists -------
  const dispatch = useCallback((action) => {
    const st = stateRef.current;
    const online = st.online;
    const fail = (msg) => () => rawDispatch({ type: 'SHOW_TOAST', msg });

    switch (action.type) {
      case 'CREATE_FOLDER': {
        const item = {
          id: uid('fld'),
          name: action.name,
          type: 'folder',
          parentId: st.folderId,
          ownerId: st.currentUserId,
          modified: new Date().toISOString(),
          starred: false,
        };
        rawDispatch({ type: 'CREATE_FOLDER', item });
        if (online) wdApi.createItem(item).catch(fail('Folder not saved to server'));
        return;
      }

      case 'CREATE_TEAM_FOLDER': {
        const id = uid('tf');
        rawDispatch({ type: 'CREATE_TEAM_FOLDER', id, name: action.name, color: action.color });
        if (online) {
          wdApi
            .createTeamFolder({ id, name: action.name, color: action.color, ownerId: st.currentUserId })
            .catch(fail('Team Folder not saved to server'));
        }
        return;
      }

      case 'UPLOAD_FILES': {
        const files = action.files || [];
        if (!files.length) return;
        const localItems = () =>
          files.map((f) => ({
            id: uid('file'),
            name: f.name,
            type: 'file',
            parentId: st.folderId,
            ownerId: st.currentUserId,
            size: f.size,
            modified: new Date().toISOString(),
            starred: false,
          }));
        if (!online) {
          const items = localItems();
          rawDispatch({
            type: 'ADD_ITEMS',
            items,
            toast: `${items.length} file${items.length > 1 ? 's' : ''} uploaded`,
          });
          return;
        }
        rawDispatch({ type: 'SHOW_TOAST', msg: 'Uploading...' });
        wdApi
          .upload(st.folderId, st.currentUserId, files)
          .then((res) => {
            const items = res.items || [];
            rawDispatch({
              type: 'ADD_ITEMS',
              items,
              toast: `${items.length} file${items.length > 1 ? 's' : ''} uploaded`,
            });
          })
          .catch(() => {
            const items = localItems();
            rawDispatch({
              type: 'ADD_ITEMS',
              items,
              toast: 'Upload saved locally (server unavailable)',
            });
          });
        return;
      }

      case 'RENAME': {
        rawDispatch(action);
        if (online) wdApi.patchItem(action.id, { name: action.name }).catch(fail('Rename not saved to server'));
        return;
      }

      case 'DELETE': {
        rawDispatch(action);
        if (online) wdApi.deleteItems(action.ids).catch(fail('Delete not saved to server'));
        return;
      }

      case 'TOGGLE_STAR': {
        const cur = st.items[action.id];
        rawDispatch(action);
        if (online && cur) wdApi.patchItem(action.id, { starred: !cur.starred }).catch(() => {});
        return;
      }

      case 'ADD_MEMBER': {
        rawDispatch(action);
        if (online) {
          wdApi.addMember(action.tfId, action.userId, action.role).catch(fail('Member change not saved'));
        }
        return;
      }

      case 'CHANGE_ROLE': {
        rawDispatch(action);
        if (online) {
          wdApi.changeRole(action.tfId, action.userId, action.role).catch(fail('Role change not saved'));
        }
        return;
      }

      case 'REMOVE_MEMBER': {
        rawDispatch(action);
        if (online) wdApi.removeMember(action.tfId, action.userId).catch(fail('Member change not saved'));
        return;
      }

      case 'SET_SHARE': {
        rawDispatch(action);
        if (online) {
          const payload = action.share && action.share.enabled ? action.share : null;
          wdApi.setShare(action.itemId, payload).catch(fail('Sharing not saved to server'));
        }
        return;
      }

      default:
        rawDispatch(action);
    }
  }, []);

  return <StoreContext.Provider value={{ state, dispatch }}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within a StoreProvider');
  return ctx;
}

// ---- selectors ------------------------------------------------------------
export function getUser(state, id) {
  return state.users.find((u) => u.id === id) || { id, name: 'Unknown', color: '#7A8699' };
}

export function getTeamFolder(state, id) {
  return state.teamFolders.find((t) => t.id === id) || null;
}

// Current user's role inside the active Team Folder (Admin everywhere in My Folders).
export function currentRole(state) {
  if (state.location.kind !== 'team') return 'Admin';
  const tf = getTeamFolder(state, state.location.rootId);
  if (!tf) return 'Viewer';
  const m = tf.members.find((mm) => mm.userId === state.currentUserId);
  return m ? m.role : 'Viewer';
}

export function childrenOf(state, folderId) {
  return Object.values(state.items).filter((it) => it.parentId === folderId);
}

// Breadcrumb path of folders from the root down to (and including) folderId.
export function pathTo(state, folderId) {
  const path = [];
  let cur = state.items[folderId];
  while (cur) {
    path.unshift(cur);
    cur = state.items[cur.parentId];
  }
  return path;
}

function descendantCount(state, folderId) {
  let n = 0;
  childrenOf(state, folderId).forEach((c) => {
    n += 1;
    if (c.type === 'folder') n += descendantCount(state, c.id);
  });
  return n;
}
export { descendantCount };

// The list of items currently visible, after location + search + filter + sort.
export function visibleItems(state) {
  let list;
  const { location } = state;
  if (location.kind === 'starred') {
    list = Object.values(state.items).filter((it) => it.starred);
  } else if (location.kind === 'recent') {
    list = Object.values(state.items)
      .filter((it) => it.type === 'file')
      .sort((a, b) => timeValue(b.modified) - timeValue(a.modified))
      .slice(0, 24);
  } else if (location.kind === 'shared') {
    list = Object.keys(state.shares)
      .map((id) => state.items[id])
      .filter(Boolean);
  } else {
    list = childrenOf(state, state.folderId);
  }

  const q = state.search.trim().toLowerCase();
  if (q) list = list.filter((it) => it.name.toLowerCase().includes(q));

  if (state.typeFilter !== 'all') {
    list = list.filter((it) => {
      if (state.typeFilter === 'folder') return it.type === 'folder';
      if (it.type !== 'file') return false;
      const ext = (it.name.split('.').pop() || '').toLowerCase();
      const map = {
        doc: ['doc', 'docx', 'md', 'txt', 'rtf'],
        sheet: ['xls', 'xlsx', 'csv'],
        slide: ['ppt', 'pptx', 'key'],
        pdf: ['pdf'],
        image: ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'fig'],
      };
      return (map[state.typeFilter] || []).includes(ext);
    });
  }

  // Recent keeps its own order; everything else respects the sort control.
  if (location.kind !== 'recent') {
    const { key, dir } = state.sort;
    const mul = dir === 'asc' ? 1 : -1;
    list = [...list].sort((a, b) => {
      // folders always before files
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      let av;
      let bv;
      if (key === 'modified') {
        av = timeValue(a.modified);
        bv = timeValue(b.modified);
      } else if (key === 'size') {
        av = a.size || 0;
        bv = b.size || 0;
      } else {
        av = a.name.toLowerCase();
        bv = b.name.toLowerCase();
      }
      if (av < bv) return -1 * mul;
      if (av > bv) return 1 * mul;
      return 0;
    });
  }
  return list;
}
