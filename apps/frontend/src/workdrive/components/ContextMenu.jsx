import React, { useEffect } from 'react';
import { useStore, currentRole } from '../store.jsx';
import { caps } from '../lib/helpers.js';
import {
  IconShare,
  IconRename,
  IconStar,
  IconTrash,
  IconDownload,
  IconChevronRight,
} from './Icons.jsx';

function Row({ icon, label, danger, disabled, hint, onClick }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm ${
        disabled
          ? 'cursor-not-allowed text-slate-300'
          : danger
          ? 'text-red-600 hover:bg-red-50'
          : 'text-slate-700 hover:bg-wd-sky'
      }`}
    >
      <span className={disabled ? 'text-slate-300' : danger ? 'text-red-500' : 'text-slate-400'}>
        {icon}
      </span>
      <span className="flex-1">{label}</span>
      {hint && <span className="text-[10px] text-slate-400">{hint}</span>}
    </button>
  );
}

export default function ContextMenu({ item, x, y, onClose }) {
  const { state, dispatch } = useStore();
  const role = currentRole(state);
  const c = caps(role);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!item) return null;

  const run = (fn) => () => {
    fn();
    onClose();
  };

  // Keep the menu within the viewport.
  const menuW = 220;
  const menuH = 250;
  const left = Math.min(x, window.innerWidth - menuW - 8);
  const top = Math.min(y, window.innerHeight - menuH - 8);

  return (
    <div className="fixed inset-0 z-40" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }}>
      <div
        className="wd-fade absolute w-[220px] overflow-hidden rounded-xl border border-wd-line bg-white py-1 shadow-pop"
        style={{ left, top }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="truncate border-b border-wd-line px-3 pb-2 pt-1 text-xs font-bold text-slate-400">
          {item.name}
        </div>

        <Row
          icon={<IconChevronRight size={16} />}
          label={item.type === 'folder' ? 'Open' : 'Preview'}
          onClick={run(() => {
            if (item.type === 'folder') {
              dispatch({ type: 'OPEN_FOLDER', folderId: item.id });
            } else {
              dispatch({ type: 'OPEN_MODAL', modalType: 'preview', payload: { id: item.id } });
            }
          })}
        />
        <Row
          icon={<IconShare size={16} />}
          label="Share"
          disabled={!c.share}
          hint={!c.share ? role : ''}
          onClick={run(() =>
            dispatch({ type: 'OPEN_MODAL', modalType: 'share', payload: { id: item.id } })
          )}
        />
        <Row
          icon={<IconRename size={16} />}
          label="Rename"
          disabled={!c.edit}
          hint={!c.edit ? role : ''}
          onClick={run(() =>
            dispatch({ type: 'OPEN_MODAL', modalType: 'rename', payload: { id: item.id } })
          )}
        />
        <Row
          icon={<IconStar size={16} filled={item.starred} />}
          label={item.starred ? 'Remove from Starred' : 'Add to Starred'}
          onClick={run(() => dispatch({ type: 'TOGGLE_STAR', id: item.id }))}
        />
        <Row
          icon={<IconDownload size={16} />}
          label="Download"
          onClick={run(() => dispatch({ type: 'SHOW_TOAST', msg: `Downloading "${item.name}"` }))}
        />
        <div className="my-1 border-t border-wd-line" />
        <Row
          icon={<IconTrash size={16} />}
          label="Delete"
          danger
          disabled={!c.remove}
          hint={!c.remove ? role : ''}
          onClick={run(() =>
            dispatch({ type: 'OPEN_MODAL', modalType: 'delete', payload: { ids: [item.id] } })
          )}
        />
      </div>
    </div>
  );
}
