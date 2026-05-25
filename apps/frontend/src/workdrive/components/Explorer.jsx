import React, { useState } from 'react';
import { useStore, visibleItems, getUser } from '../store.jsx';
import { kindOf, fmtDate, formatBytes, initials } from '../lib/helpers.js';
import { IconFolder, IconFile, IconStar, IconMore, IconShare, IconSearch } from './Icons.jsx';
import ContextMenu from './ContextMenu.jsx';

function Avatar({ user, size = 22 }) {
  return (
    <span
      className="flex items-center justify-center rounded-full font-bold text-white"
      style={{ background: user.color, width: size, height: size, fontSize: size * 0.42 }}
      title={user.name}
    >
      {initials(user.name)}
    </span>
  );
}

function Thumb({ item, size }) {
  return item.type === 'folder' ? (
    <IconFolder size={size} />
  ) : (
    <IconFile kind={kindOf(item.name)} size={size} />
  );
}

function GridCard({ item, selected, shared, owner, onSelect, onOpen, onMenu, onStar }) {
  return (
    <div
      onClick={onSelect}
      onDoubleClick={onOpen}
      onContextMenu={onMenu}
      className={`group relative cursor-pointer rounded-xl border bg-white p-3 transition-all ${
        selected
          ? 'border-wd-blue ring-2 ring-wd-blue/25'
          : 'border-wd-line hover:border-wd-blue/40 hover:shadow-card'
      }`}
    >
      <div className="absolute right-2 top-2 flex items-center gap-1">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onStar();
          }}
          className={`rounded-md p-1 ${
            item.starred
              ? 'text-amber-400'
              : 'text-slate-300 opacity-0 hover:text-amber-400 group-hover:opacity-100'
          }`}
          title={item.starred ? 'Unstar' : 'Star'}
        >
          <IconStar size={16} filled={item.starred} />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onMenu(e);
          }}
          className="rounded-md p-1 text-slate-400 opacity-0 hover:bg-slate-100 group-hover:opacity-100"
          title="More actions"
        >
          <IconMore size={16} />
        </button>
      </div>

      <div className="flex h-24 items-center justify-center">
        <Thumb item={item} size={62} />
      </div>

      <div className="mt-1 truncate text-sm font-semibold text-wd-navy" title={item.name}>
        {item.name}
      </div>
      <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-400">
        <Avatar user={owner} size={18} />
        <span className="truncate">
          {item.type === 'folder' ? 'Folder' : formatBytes(item.size)} &middot; {fmtDate(item.modified)}
        </span>
      </div>
      {shared && (
        <span className="absolute bottom-2 right-2 text-wd-blue" title="Shared">
          <IconShare size={14} />
        </span>
      )}
    </div>
  );
}

function ListRow({ item, selected, shared, owner, onSelect, onOpen, onMenu, onStar }) {
  return (
    <div
      onClick={onSelect}
      onDoubleClick={onOpen}
      onContextMenu={onMenu}
      className={`group grid cursor-pointer grid-cols-[1fr_140px_150px_100px_70px] items-center gap-2 border-b border-wd-line px-3 py-2 text-sm ${
        selected ? 'bg-wd-sky' : 'hover:bg-slate-50'
      }`}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <Thumb item={item} size={30} />
        <span className="truncate font-medium text-wd-navy" title={item.name}>
          {item.name}
        </span>
        {shared && (
          <span className="text-wd-blue" title="Shared">
            <IconShare size={13} />
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5 text-xs text-slate-500">
        <Avatar user={owner} size={20} />
        <span className="truncate">{owner.name}</span>
      </div>
      <div className="text-xs text-slate-500">{fmtDate(item.modified)}</div>
      <div className="text-xs text-slate-500">
        {item.type === 'folder' ? '—' : formatBytes(item.size)}
      </div>
      <div className="flex items-center justify-end gap-1">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onStar();
          }}
          className={`rounded p-1 ${
            item.starred
              ? 'text-amber-400'
              : 'text-slate-300 opacity-0 hover:text-amber-400 group-hover:opacity-100'
          }`}
        >
          <IconStar size={15} filled={item.starred} />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onMenu(e);
          }}
          className="rounded p-1 text-slate-400 opacity-0 hover:bg-slate-200 group-hover:opacity-100"
        >
          <IconMore size={15} />
        </button>
      </div>
    </div>
  );
}

function EmptyState({ location, search }) {
  let title = 'This folder is empty';
  let sub = 'Upload files or create a folder to get started.';
  if (search) {
    title = 'No matches found';
    sub = `Nothing matched "${search}". Try a different search.`;
  } else if (location.kind === 'starred') {
    title = 'No starred items';
    sub = 'Star files and folders to find them quickly here.';
  } else if (location.kind === 'recent') {
    title = 'Nothing recent';
    sub = 'Files you work on will appear here.';
  } else if (location.kind === 'shared') {
    title = 'Nothing shared yet';
    sub = 'Files you share will be listed here.';
  }
  return (
    <div className="flex h-full flex-col items-center justify-center py-20 text-center">
      <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-wd-sky text-wd-blue">
        <IconSearch size={28} />
      </div>
      <div className="text-base font-bold text-wd-navy">{title}</div>
      <div className="mt-1 max-w-xs text-sm text-slate-400">{sub}</div>
    </div>
  );
}

export default function Explorer() {
  const { state, dispatch } = useStore();
  const [menu, setMenu] = useState(null);
  const list = visibleItems(state);
  const { view, selection, location, search, shares } = state;

  const openMenu = (item) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    setMenu({ item, x: e.clientX, y: e.clientY });
  };

  const handleSelect = (item) => (e) => {
    e.stopPropagation();
    dispatch({
      type: 'SELECT',
      id: item.id,
      mode: e.ctrlKey || e.metaKey ? 'toggle' : 'replace',
    });
  };

  const handleOpen = (item) => () => {
    if (item.type === 'folder') {
      if (location.kind === 'team' || location.kind === 'my') {
        dispatch({ type: 'OPEN_FOLDER', folderId: item.id });
      } else {
        dispatch({ type: 'SHOW_TOAST', msg: 'Open the folder from its Team Folder' });
      }
    } else {
      dispatch({ type: 'OPEN_MODAL', modalType: 'preview', payload: { id: item.id } });
    }
  };

  return (
    <div
      className="flex-1 overflow-y-auto p-6"
      onClick={() => selection.length && dispatch({ type: 'CLEAR_SELECTION' })}
    >
      {list.length === 0 ? (
        <EmptyState location={location} search={search} />
      ) : view === 'grid' ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {list.map((item) => (
            <GridCard
              key={item.id}
              item={item}
              owner={getUser(state, item.ownerId)}
              selected={selection.includes(item.id)}
              shared={!!shares[item.id]}
              onSelect={handleSelect(item)}
              onOpen={handleOpen(item)}
              onMenu={openMenu(item)}
              onStar={() => dispatch({ type: 'TOGGLE_STAR', id: item.id })}
            />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-wd-line bg-white">
          <div className="grid grid-cols-[1fr_140px_150px_100px_70px] gap-2 border-b border-wd-line bg-wd-bg px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
            <span>Name</span>
            <span>Owner</span>
            <span>Modified</span>
            <span>Size</span>
            <span />
          </div>
          {list.map((item) => (
            <ListRow
              key={item.id}
              item={item}
              owner={getUser(state, item.ownerId)}
              selected={selection.includes(item.id)}
              shared={!!shares[item.id]}
              onSelect={handleSelect(item)}
              onOpen={handleOpen(item)}
              onMenu={openMenu(item)}
              onStar={() => dispatch({ type: 'TOGGLE_STAR', id: item.id })}
            />
          ))}
        </div>
      )}

      {menu && (
        <ContextMenu item={menu.item} x={menu.x} y={menu.y} onClose={() => setMenu(null)} />
      )}
    </div>
  );
}
