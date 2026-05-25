import React from 'react';
import { useStore, currentRole, getTeamFolder, pathTo, getUser } from '../store.jsx';
import { caps, initials } from '../lib/helpers.js';
import {
  IconGrid,
  IconList,
  IconUpload,
  IconFolderPlus,
  IconChevronRight,
  IconUsers,
  IconShare,
  IconTrash,
  IconClose,
} from './Icons.jsx';

const KIND_TITLES = { starred: 'Starred', recent: 'Recent', shared: 'Shared with the team' };

function RolePill({ role }) {
  const tone =
    {
      Admin: 'bg-wd-blue text-white',
      Organizer: 'bg-emerald-100 text-emerald-700',
      Editor: 'bg-amber-100 text-amber-700',
      Commenter: 'bg-violet-100 text-violet-700',
      Viewer: 'bg-slate-200 text-slate-600',
    }[role] || 'bg-slate-200 text-slate-600';
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${tone}`}>
      {role}
    </span>
  );
}

function MemberStack({ tf, onClick }) {
  const { state } = useStore();
  const shown = tf.members.slice(0, 4);
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 rounded-lg border border-wd-line bg-white px-2 py-1 hover:bg-slate-50"
      title="Manage members"
    >
      <div className="flex -space-x-2">
        {shown.map((m) => {
          const u = getUser(state, m.userId);
          return (
            <span
              key={m.userId}
              className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-[10px] font-bold text-white"
              style={{ background: u.color }}
              title={`${u.name} - ${m.role}`}
            >
              {initials(u.name)}
            </span>
          );
        })}
      </div>
      {tf.members.length > 4 && (
        <span className="text-xs text-slate-500">+{tf.members.length - 4}</span>
      )}
    </button>
  );
}

export default function Toolbar() {
  const { state, dispatch } = useStore();
  const { location, folderId, view, sort, selection } = state;
  const role = currentRole(state);
  const c = caps(role);

  // Build breadcrumb crumbs --------------------------------------------------
  const crumbs = [];
  if (location.kind === 'team') {
    const tf = getTeamFolder(state, location.rootId);
    if (tf) crumbs.push({ label: tf.name, folderId: tf.id });
  } else if (location.kind === 'my') {
    crumbs.push({ label: 'My Folders', folderId: 'my-root' });
  }
  if (location.kind === 'team' || location.kind === 'my') {
    pathTo(state, folderId).forEach((fld) => crumbs.push({ label: fld.name, folderId: fld.id }));
  }
  const title =
    location.kind === 'team' || location.kind === 'my'
      ? crumbs[crumbs.length - 1]?.label
      : KIND_TITLES[location.kind];

  const tf = location.kind === 'team' ? getTeamFolder(state, location.rootId) : null;
  const inFolderView = location.kind === 'team' || location.kind === 'my';

  const sortValue = `${sort.key}-${sort.dir}`;
  const onSort = (e) => {
    const [key, dir] = e.target.value.split('-');
    dispatch({ type: 'SET_SORT', sort: { key, dir } });
  };

  return (
    <div className="shrink-0 border-b border-wd-line bg-white px-6 pt-4 pb-3">
      {/* Row 1: breadcrumb + role + members */}
      <div className="flex items-center gap-3">
        <nav className="flex min-w-0 flex-1 items-center gap-1 text-sm">
          {inFolderView ? (
            crumbs.map((cr, i) => (
              <span key={cr.folderId} className="flex items-center gap-1">
                {i > 0 && <IconChevronRight size={14} className="text-slate-300" />}
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'OPEN_FOLDER', folderId: cr.folderId })}
                  className={`truncate rounded px-1.5 py-0.5 ${
                    i === crumbs.length - 1
                      ? 'font-bold text-wd-navy'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-wd-blue'
                  }`}
                >
                  {cr.label}
                </button>
              </span>
            ))
          ) : (
            <span className="px-1.5 text-base font-bold text-wd-navy">{title}</span>
          )}
        </nav>

        {tf && (
          <>
            <RolePill role={role} />
            <MemberStack
              tf={tf}
              onClick={() =>
                dispatch({ type: 'OPEN_DRAWER', drawerType: 'members', tfId: tf.id })
              }
            />
            <button
              type="button"
              onClick={() =>
                dispatch({ type: 'OPEN_DRAWER', drawerType: 'members', tfId: tf.id })
              }
              className="flex items-center gap-1.5 rounded-lg bg-wd-navy px-3 py-2 text-xs font-semibold text-white hover:bg-wd-blue"
            >
              <IconUsers size={16} /> Members
            </button>
          </>
        )}
      </div>

      {/* Row 2: actions + view controls */}
      <div className="mt-3 flex items-center gap-2">
        {selection.length > 0 ? (
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-wd-sky px-2.5 py-1.5 text-xs font-semibold text-wd-navy">
              {selection.length} selected
            </span>
            {selection.length === 1 && c.share && (
              <button
                type="button"
                onClick={() =>
                  dispatch({ type: 'OPEN_MODAL', modalType: 'share', payload: { id: selection[0] } })
                }
                className="flex items-center gap-1.5 rounded-lg border border-wd-line px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                <IconShare size={15} /> Share
              </button>
            )}
            {c.remove && (
              <button
                type="button"
                onClick={() =>
                  dispatch({ type: 'OPEN_MODAL', modalType: 'delete', payload: { ids: selection } })
                }
                className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
              >
                <IconTrash size={15} /> Delete
              </button>
            )}
            <button
              type="button"
              onClick={() => dispatch({ type: 'CLEAR_SELECTION' })}
              className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-slate-500 hover:bg-slate-100"
            >
              <IconClose size={15} /> Clear
            </button>
          </div>
        ) : (
          inFolderView && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={!c.edit}
                onClick={() => dispatch({ type: 'OPEN_MODAL', modalType: 'upload' })}
                className="flex items-center gap-1.5 rounded-lg bg-wd-blue px-3.5 py-2 text-xs font-semibold text-white hover:bg-wd-navy disabled:cursor-not-allowed disabled:bg-slate-300"
                title={c.edit ? 'Upload files' : `${role} role cannot upload`}
              >
                <IconUpload size={16} /> Upload
              </button>
              <button
                type="button"
                disabled={!c.edit}
                onClick={() => dispatch({ type: 'OPEN_MODAL', modalType: 'newFolder' })}
                className="flex items-center gap-1.5 rounded-lg border border-wd-line px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
                title={c.edit ? 'Create folder' : `${role} role cannot create folders`}
              >
                <IconFolderPlus size={16} /> New Folder
              </button>
              {!c.edit && (
                <span className="text-xs text-slate-400">
                  Read-only &mdash; your role is {role}
                </span>
              )}
            </div>
          )
        )}

        {/* Right side: sort + view toggle */}
        <div className="ml-auto flex items-center gap-2">
          {location.kind !== 'recent' && (
            <select
              value={sortValue}
              onChange={onSort}
              className="h-8 rounded-lg border border-wd-line bg-white px-2 text-xs text-slate-600 outline-none focus:border-wd-blue"
            >
              <option value="name-asc">Name (A&ndash;Z)</option>
              <option value="name-desc">Name (Z&ndash;A)</option>
              <option value="modified-desc">Modified (newest)</option>
              <option value="modified-asc">Modified (oldest)</option>
              <option value="size-desc">Size (largest)</option>
              <option value="size-asc">Size (smallest)</option>
            </select>
          )}
          <div className="flex overflow-hidden rounded-lg border border-wd-line">
            <button
              type="button"
              onClick={() => dispatch({ type: 'SET_VIEW', view: 'grid' })}
              className={`p-1.5 ${
                view === 'grid' ? 'bg-wd-sky text-wd-blue' : 'text-slate-400 hover:bg-slate-50'
              }`}
              title="Grid view"
            >
              <IconGrid size={17} />
            </button>
            <button
              type="button"
              onClick={() => dispatch({ type: 'SET_VIEW', view: 'list' })}
              className={`p-1.5 ${
                view === 'list' ? 'bg-wd-sky text-wd-blue' : 'text-slate-400 hover:bg-slate-50'
              }`}
              title="List view"
            >
              <IconList size={17} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
