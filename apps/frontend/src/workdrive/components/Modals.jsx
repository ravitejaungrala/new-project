import React, { useEffect, useState } from 'react';
import { useStore, descendantCount } from '../store.jsx';
import { kindOf, fmtDate, formatBytes, makeShareLink } from '../lib/helpers.js';
import {
  IconClose,
  IconFile,
  IconUpload,
  IconLink,
  IconLock,
  IconCalendar,
  IconCopy,
  IconTrash,
  IconShare,
  IconDownload,
} from './Icons.jsx';

const TF_COLORS = ['#2E75B6', '#E2574C', '#1E8E5A', '#E08B2D', '#9B59B6', '#C0398A', '#2AA3A3'];

/* ---------- shared shell ---------- */
function Shell({ title, subtitle, onClose, children, width = 'max-w-md' }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-wd-navy/40 p-4"
      onClick={onClose}
    >
      <div
        className={`wd-fade w-full ${width} overflow-hidden rounded-2xl bg-white shadow-pop`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-wd-line px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-wd-navy">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
          >
            <IconClose size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Btn({ children, variant = 'primary', ...rest }) {
  const cls =
    variant === 'primary'
      ? 'bg-wd-blue text-white hover:bg-wd-navy disabled:bg-slate-300'
      : variant === 'danger'
      ? 'bg-red-600 text-white hover:bg-red-700 disabled:bg-slate-300'
      : 'border border-wd-line text-slate-600 hover:bg-slate-50';
  return (
    <button
      type="button"
      {...rest}
      className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed ${cls}`}
    >
      {children}
    </button>
  );
}

const inputCls =
  'w-full rounded-lg border border-wd-line px-3 py-2 text-sm outline-none focus:border-wd-blue';

/* ---------- new folder ---------- */
function NewFolderModal({ onClose }) {
  const { dispatch } = useStore();
  const [name, setName] = useState('Untitled folder');
  const submit = () => name.trim() && dispatch({ type: 'CREATE_FOLDER', name: name.trim() });
  return (
    <Shell title="New folder" onClose={onClose}>
      <div className="px-5 py-4">
        <label className="mb-1.5 block text-xs font-semibold text-slate-500">Folder name</label>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          onFocus={(e) => e.target.select()}
          className={inputCls}
        />
      </div>
      <div className="flex justify-end gap-2 border-t border-wd-line px-5 py-3">
        <Btn variant="ghost" onClick={onClose}>
          Cancel
        </Btn>
        <Btn onClick={submit} disabled={!name.trim()}>
          Create folder
        </Btn>
      </div>
    </Shell>
  );
}

/* ---------- rename ---------- */
function RenameModal({ item, onClose }) {
  const { dispatch } = useStore();
  const [name, setName] = useState(item ? item.name : '');
  if (!item) return null;
  const submit = () => name.trim() && dispatch({ type: 'RENAME', id: item.id, name: name.trim() });
  return (
    <Shell title="Rename" subtitle={item.name} onClose={onClose}>
      <div className="px-5 py-4">
        <label className="mb-1.5 block text-xs font-semibold text-slate-500">New name</label>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          onFocus={(e) => e.target.select()}
          className={inputCls}
        />
      </div>
      <div className="flex justify-end gap-2 border-t border-wd-line px-5 py-3">
        <Btn variant="ghost" onClick={onClose}>
          Cancel
        </Btn>
        <Btn onClick={submit} disabled={!name.trim()}>
          Save
        </Btn>
      </div>
    </Shell>
  );
}

/* ---------- new team folder ---------- */
function NewTeamFolderModal({ onClose }) {
  const { dispatch } = useStore();
  const [name, setName] = useState('');
  const [color, setColor] = useState(TF_COLORS[0]);
  const submit = () =>
    name.trim() && dispatch({ type: 'CREATE_TEAM_FOLDER', name: name.trim(), color });
  return (
    <Shell
      title="Create Team Folder"
      subtitle="A shared workspace for your team"
      onClose={onClose}
    >
      <div className="space-y-4 px-5 py-4">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-500">Name</label>
          <input
            autoFocus
            value={name}
            placeholder="e.g. Sales Collateral"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            className={inputCls}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-500">Colour</label>
          <div className="flex gap-2">
            {TF_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`h-7 w-7 rounded-full transition-transform ${
                  color === c ? 'scale-110 ring-2 ring-offset-2 ring-wd-navy' : ''
                }`}
                style={{ background: c }}
              />
            ))}
          </div>
        </div>
        <p className="rounded-lg bg-wd-sky px-3 py-2 text-xs text-wd-navy">
          You will be added as <strong>Admin</strong>. Invite members afterwards from the
          Members panel.
        </p>
      </div>
      <div className="flex justify-end gap-2 border-t border-wd-line px-5 py-3">
        <Btn variant="ghost" onClick={onClose}>
          Cancel
        </Btn>
        <Btn onClick={submit} disabled={!name.trim()}>
          Create
        </Btn>
      </div>
    </Shell>
  );
}

/* ---------- delete confirm ---------- */
function DeleteModal({ ids, onClose }) {
  const { state, dispatch } = useStore();
  if (!ids || !ids.length) return null;
  const names = ids.map((id) => state.items[id]?.name).filter(Boolean);
  const nested = ids.reduce((n, id) => {
    const it = state.items[id];
    return n + (it && it.type === 'folder' ? descendantCount(state, id) : 0);
  }, 0);
  return (
    <Shell title={`Delete ${ids.length} item${ids.length > 1 ? 's' : ''}?`} onClose={onClose}>
      <div className="px-5 py-4 text-sm text-slate-600">
        <p>
          {ids.length === 1 ? (
            <>
              <strong className="text-wd-navy">{names[0]}</strong> will be permanently removed.
            </>
          ) : (
            <>The selected items will be permanently removed.</>
          )}
        </p>
        {nested > 0 && (
          <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
            This also deletes {nested} item{nested > 1 ? 's' : ''} inside the selected folder
            {ids.length > 1 ? 's' : ''}.
          </p>
        )}
      </div>
      <div className="flex justify-end gap-2 border-t border-wd-line px-5 py-3">
        <Btn variant="ghost" onClick={onClose}>
          Cancel
        </Btn>
        <Btn variant="danger" onClick={() => dispatch({ type: 'DELETE', ids })}>
          Delete
        </Btn>
      </div>
    </Shell>
  );
}

/* ---------- upload ---------- */
function UploadModal({ onClose }) {
  const { dispatch } = useStore();
  const [staged, setStaged] = useState([]);

  const addFiles = (fileList) => {
    // Keep the real File objects so they can be uploaded to the backend.
    const next = Array.from(fileList);
    setStaged((s) => [...s, ...next]);
  };

  const submit = () => {
    if (staged.length) dispatch({ type: 'UPLOAD_FILES', files: staged });
    onClose();
  };

  return (
    <Shell title="Upload files" subtitle="Files are added to the current folder" onClose={onClose}>
      <div className="px-5 py-4">
        <label
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            addFiles(e.dataTransfer.files);
          }}
          className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-wd-line py-8 text-center hover:border-wd-blue hover:bg-wd-sky/40"
        >
          <span className="mb-2 text-wd-blue">
            <IconUpload size={30} />
          </span>
          <span className="text-sm font-semibold text-wd-navy">
            Click to browse or drop files here
          </span>
          <span className="mt-0.5 text-xs text-slate-400">Any file type, up to 250 GB each</span>
          <input
            type="file"
            multiple
            className="hidden"
            onChange={(e) => addFiles(e.target.files)}
          />
        </label>

        {staged.length > 0 && (
          <div className="mt-3 max-h-44 space-y-1.5 overflow-y-auto">
            {staged.map((f, i) => (
              <div
                key={`${f.name}-${i}`}
                className="flex items-center gap-2.5 rounded-lg border border-wd-line px-2.5 py-1.5"
              >
                <IconFile kind={kindOf(f.name)} size={26} />
                <span className="flex-1 truncate text-sm text-wd-navy">{f.name}</span>
                <span className="text-xs text-slate-400">{formatBytes(f.size)}</span>
                <button
                  type="button"
                  onClick={() => setStaged((s) => s.filter((_, idx) => idx !== i))}
                  className="rounded p-0.5 text-slate-400 hover:bg-slate-100"
                >
                  <IconClose size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center justify-between border-t border-wd-line px-5 py-3">
        <span className="text-xs text-slate-400">
          {staged.length} file{staged.length === 1 ? '' : 's'} ready
        </span>
        <div className="flex gap-2">
          <Btn variant="ghost" onClick={onClose}>
            Cancel
          </Btn>
          <Btn onClick={submit} disabled={!staged.length}>
            Upload {staged.length || ''}
          </Btn>
        </div>
      </div>
    </Shell>
  );
}

/* ---------- share ---------- */
function ShareModal({ item, onClose }) {
  const { state, dispatch } = useStore();
  const existing = item ? state.shares[item.id] : null;
  const [share, setShare] = useState(
    existing || {
      enabled: false,
      link: makeShareLink(item ? item.name : ''),
      access: 'view',
      password: '',
      expiry: '',
      allowDownload: true,
    }
  );
  const [copied, setCopied] = useState(false);
  if (!item) return null;

  const set = (patch) => setShare((s) => ({ ...s, ...patch }));

  const copy = () => {
    try {
      navigator.clipboard.writeText(share.link);
    } catch (e) {
      /* clipboard unavailable in some environments */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const save = () => dispatch({ type: 'SET_SHARE', itemId: item.id, share });

  return (
    <Shell title="Share" subtitle={item.name} onClose={onClose} width="max-w-lg">
      <div className="space-y-4 px-5 py-4">
        {/* enable toggle */}
        <div className="flex items-center justify-between rounded-lg bg-wd-sky px-3 py-2.5">
          <div className="flex items-center gap-2 text-sm font-semibold text-wd-navy">
            <IconShare size={16} /> Share with link
          </div>
          <button
            type="button"
            onClick={() => set({ enabled: !share.enabled })}
            className={`relative h-6 w-11 rounded-full transition-colors ${
              share.enabled ? 'bg-wd-blue' : 'bg-slate-300'
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
                share.enabled ? 'left-[22px]' : 'left-0.5'
              }`}
            />
          </button>
        </div>

        {share.enabled && (
          <>
            {/* link */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-500">
                Shareable link
              </label>
              <div className="flex gap-2">
                <div className="flex flex-1 items-center gap-2 rounded-lg border border-wd-line px-3 py-2">
                  <IconLink size={15} className="text-slate-400" />
                  <span className="truncate text-xs text-slate-600">{share.link}</span>
                </div>
                <Btn variant="ghost" onClick={copy}>
                  <span className="flex items-center gap-1.5">
                    <IconCopy size={15} /> {copied ? 'Copied' : 'Copy'}
                  </span>
                </Btn>
              </div>
            </div>

            {/* access level */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-500">
                Access level
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { v: 'view', l: 'Can view' },
                  { v: 'comment', l: 'Can comment' },
                  { v: 'edit', l: 'Can edit' },
                ].map((o) => (
                  <button
                    key={o.v}
                    type="button"
                    onClick={() => set({ access: o.v })}
                    className={`rounded-lg border px-2 py-2 text-xs font-semibold ${
                      share.access === o.v
                        ? 'border-wd-blue bg-wd-sky text-wd-navy'
                        : 'border-wd-line text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {o.l}
                  </button>
                ))}
              </div>
            </div>

            {/* password + expiry */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-slate-500">
                  <IconLock size={13} /> Password
                </label>
                <input
                  value={share.password}
                  placeholder="Optional"
                  onChange={(e) => set({ password: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-slate-500">
                  <IconCalendar size={13} /> Expires on
                </label>
                <input
                  type="date"
                  value={share.expiry}
                  onChange={(e) => set({ expiry: e.target.value })}
                  className={inputCls}
                />
              </div>
            </div>

            {/* allow download */}
            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={share.allowDownload}
                onChange={(e) => set({ allowDownload: e.target.checked })}
                className="h-4 w-4 accent-wd-blue"
              />
              <span className="flex items-center gap-1.5">
                <IconDownload size={15} className="text-slate-400" /> Allow viewers to download
              </span>
            </label>
          </>
        )}

        {!share.enabled && (
          <p className="text-sm text-slate-400">
            Link sharing is off. Turn it on to generate a secure link with optional password and
            expiry.
          </p>
        )}
      </div>

      <div className="flex justify-end gap-2 border-t border-wd-line px-5 py-3">
        <Btn variant="ghost" onClick={onClose}>
          Cancel
        </Btn>
        <Btn onClick={save}>{share.enabled ? 'Save share settings' : 'Turn off sharing'}</Btn>
      </div>
    </Shell>
  );
}

/* ---------- preview ---------- */
function PreviewModal({ item, onClose }) {
  const { state } = useStore();
  if (!item) return null;
  const owner = state.users.find((u) => u.id === item.ownerId);
  const share = state.shares[item.id];
  return (
    <Shell title="File preview" onClose={onClose} width="max-w-lg">
      <div className="px-5 py-5">
        <div className="flex items-center justify-center rounded-xl bg-wd-bg py-10">
          <IconFile kind={kindOf(item.name)} size={96} />
        </div>
        <div className="mt-4 text-center">
          <div className="text-base font-bold text-wd-navy">{item.name}</div>
          <div className="text-xs text-slate-400">
            Demo preview &mdash; rendering is not available in this prototype
          </div>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div className="text-slate-400">Owner</div>
          <div className="text-right font-medium text-wd-navy">{owner ? owner.name : '—'}</div>
          <div className="text-slate-400">Size</div>
          <div className="text-right font-medium text-wd-navy">{formatBytes(item.size)}</div>
          <div className="text-slate-400">Modified</div>
          <div className="text-right font-medium text-wd-navy">{fmtDate(item.modified)}</div>
          <div className="text-slate-400">Sharing</div>
          <div className="text-right font-medium text-wd-navy">
            {share ? `Link (${share.access})` : 'Private'}
          </div>
        </dl>
      </div>
      <div className="flex justify-end gap-2 border-t border-wd-line px-5 py-3">
        <Btn variant="ghost" onClick={onClose}>
          Close
        </Btn>
      </div>
    </Shell>
  );
}

/* ---------- router ---------- */
export default function Modals() {
  const { state, dispatch } = useStore();
  const modal = state.modal;
  if (!modal) return null;
  const close = () => dispatch({ type: 'CLOSE_MODAL' });
  const item = modal.payload && modal.payload.id ? state.items[modal.payload.id] : null;

  switch (modal.type) {
    case 'newFolder':
      return <NewFolderModal onClose={close} />;
    case 'rename':
      return <RenameModal item={item} onClose={close} />;
    case 'newTeamFolder':
      return <NewTeamFolderModal onClose={close} />;
    case 'delete':
      return <DeleteModal ids={modal.payload && modal.payload.ids} onClose={close} />;
    case 'upload':
      return <UploadModal onClose={close} />;
    case 'share':
      return <ShareModal item={item} onClose={close} />;
    case 'preview':
      return <PreviewModal item={item} onClose={close} />;
    default:
      return null;
  }
}
