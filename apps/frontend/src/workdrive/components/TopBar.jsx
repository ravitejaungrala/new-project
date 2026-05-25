import React from 'react';
import { useStore, getUser } from '../store.jsx';
import { initials } from '../lib/helpers.js';
import { IconSearch, IconClose } from './Icons.jsx';

const TYPE_OPTIONS = [
  { value: 'all', label: 'All items' },
  { value: 'folder', label: 'Folders' },
  { value: 'doc', label: 'Documents' },
  { value: 'sheet', label: 'Spreadsheets' },
  { value: 'slide', label: 'Presentations' },
  { value: 'pdf', label: 'PDFs' },
  { value: 'image', label: 'Images' },
];

export default function TopBar() {
  const { state, dispatch } = useStore();
  const me = getUser(state, state.currentUserId);

  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-wd-line bg-white px-6">
      {/* Search */}
      <div className="relative w-full max-w-xl">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          <IconSearch size={18} />
        </span>
        <input
          value={state.search}
          onChange={(e) => dispatch({ type: 'SET_SEARCH', search: e.target.value })}
          placeholder="Search files and folders..."
          className="h-10 w-full rounded-lg border border-wd-line bg-wd-bg pl-10 pr-9 text-sm outline-none transition-colors focus:border-wd-blue focus:bg-white"
        />
        {state.search && (
          <button
            type="button"
            onClick={() => dispatch({ type: 'SET_SEARCH', search: '' })}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:bg-slate-100"
          >
            <IconClose size={16} />
          </button>
        )}
      </div>

      {/* Type filter */}
      <select
        value={state.typeFilter}
        onChange={(e) => dispatch({ type: 'SET_TYPE_FILTER', value: e.target.value })}
        className="h-10 rounded-lg border border-wd-line bg-white px-3 text-sm text-slate-600 outline-none focus:border-wd-blue"
      >
        {TYPE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      <div className="ml-auto flex items-center gap-3">
        <div className="text-right leading-tight">
          <div className="text-sm font-semibold text-wd-navy">{me.name}</div>
          <div className="text-[11px] text-slate-400">{me.email}</div>
        </div>
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white"
          style={{ background: me.color }}
        >
          {initials(me.name)}
        </div>
      </div>
    </header>
  );
}
