import React from 'react';
import { useStore } from '../store.jsx';
import { formatBytes } from '../lib/helpers.js';
import { IconStar, IconClock, IconShare, IconHome, IconTeam, IconPlus } from './Icons.jsx';

const STORAGE_CAP = 5 * 1024 * 1024 * 1024 * 1024; // 5 TB pooled team storage

function NavItem({ active, icon, label, badge, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
        active
          ? 'bg-wd-sky font-semibold text-wd-navy'
          : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      <span className={active ? 'text-wd-blue' : 'text-slate-400'}>{icon}</span>
      <span className="flex-1 text-left truncate">{label}</span>
      {badge != null && (
        <span className="rounded-full bg-slate-200 px-1.5 text-xs text-slate-600">{badge}</span>
      )}
    </button>
  );
}

export default function Sidebar() {
  const { state, dispatch } = useStore();
  const { location, items, teamFolders } = state;

  const go = (loc, folderId) =>
    dispatch({ type: 'NAVIGATE', location: loc, folderId });

  const starredCount = Object.values(items).filter((i) => i.starred).length;
  const sharedCount = Object.keys(state.shares).length;

  const usedBytes = Object.values(items).reduce((sum, i) => sum + (i.size || 0), 0);
  const usedPct = Math.min(100, (usedBytes / STORAGE_CAP) * 100);

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-wd-line bg-white">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-wd-blue text-white">
          <IconTeam size={20} />
        </div>
        <div className="leading-tight">
          <div className="text-[15px] font-bold text-wd-navy">WorkDrive</div>
          <div className="text-[11px] text-slate-400">Dhanadurga</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {/* Quick access */}
        <nav className="space-y-0.5">
          <NavItem
            active={location.kind === 'my'}
            icon={<IconHome size={18} />}
            label="My Folders"
            onClick={() => go({ kind: 'my', rootId: 'my-root' }, 'my-root')}
          />
          <NavItem
            active={location.kind === 'recent'}
            icon={<IconClock size={18} />}
            label="Recent"
            onClick={() => go({ kind: 'recent' })}
          />
          <NavItem
            active={location.kind === 'starred'}
            icon={<IconStar size={18} />}
            label="Starred"
            badge={starredCount || null}
            onClick={() => go({ kind: 'starred' })}
          />
          <NavItem
            active={location.kind === 'shared'}
            icon={<IconShare size={18} />}
            label="Shared"
            badge={sharedCount || null}
            onClick={() => go({ kind: 'shared' })}
          />
        </nav>

        {/* Team Folders */}
        <div className="mt-6 mb-1 flex items-center justify-between px-3">
          <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
            Team Folders
          </span>
          <button
            type="button"
            title="New Team Folder"
            onClick={() => dispatch({ type: 'OPEN_MODAL', modalType: 'newTeamFolder' })}
            className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-wd-blue"
          >
            <IconPlus size={16} />
          </button>
        </div>
        <nav className="space-y-0.5">
          {teamFolders.map((tf) => {
            const active = location.kind === 'team' && location.rootId === tf.id;
            return (
              <button
                key={tf.id}
                type="button"
                onClick={() => go({ kind: 'team', rootId: tf.id }, tf.id)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  active
                    ? 'bg-wd-sky font-semibold text-wd-navy'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-sm"
                  style={{ background: tf.color }}
                />
                <span className="flex-1 truncate text-left">{tf.name}</span>
                <span className="text-xs text-slate-400">{tf.members.length}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Storage meter */}
      <div className="border-t border-wd-line px-5 py-4">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-600">Team storage</span>
          <span className="text-slate-400">{Math.round(usedPct * 10) / 10}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-wd-blue"
            style={{ width: `${Math.max(2, usedPct)}%` }}
          />
        </div>
        <div className="mt-1.5 text-[11px] text-slate-400">
          {formatBytes(usedBytes)} of 5 TB used
        </div>
      </div>
    </aside>
  );
}
