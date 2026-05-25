import React, { useEffect, useState } from 'react';
import { useStore, getTeamFolder, getUser, currentRole } from '../store.jsx';
import { ROLES, ROLE_DESC, caps, initials } from '../lib/helpers.js';
import { IconClose, IconUsers, IconPlus, IconTrash } from './Icons.jsx';

export default function MembersDrawer() {
  const { state, dispatch } = useStore();
  const drawer = state.drawer;
  const open = drawer && drawer.type === 'members';
  const tf = open ? getTeamFolder(state, drawer.tfId) : null;

  const [newUser, setNewUser] = useState('');
  const [newRole, setNewRole] = useState('Editor');

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && dispatch({ type: 'CLOSE_DRAWER' });
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, dispatch]);

  if (!open || !tf) return null;

  const close = () => dispatch({ type: 'CLOSE_DRAWER' });
  const myRole = currentRole(state);
  const myCaps = caps(myRole);
  const canManage = myCaps.manage; // Admin
  const canAdd = myCaps.manage || myCaps.organize; // Admin or Organizer

  const adminCount = tf.members.filter((m) => m.role === 'Admin').length;
  const available = state.users.filter((u) => !tf.members.some((m) => m.userId === u.id));
  // Organizers cannot assign the Admin role.
  const assignableRoles = canManage ? ROLES : ROLES.filter((r) => r !== 'Admin');

  const addMember = () => {
    if (!newUser) return;
    dispatch({ type: 'ADD_MEMBER', tfId: tf.id, userId: newUser, role: newRole });
    setNewUser('');
    setNewRole('Editor');
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-wd-navy/40" onClick={close}>
      <div
        className="wd-fade flex h-full w-[390px] flex-col bg-white shadow-pop"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex items-center justify-between border-b border-wd-line px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-lg text-white"
              style={{ background: tf.color }}
            >
              <IconUsers size={18} />
            </span>
            <div>
              <div className="text-sm font-bold text-wd-navy">{tf.name}</div>
              <div className="text-[11px] text-slate-400">{tf.members.length} members</div>
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
          >
            <IconClose size={18} />
          </button>
        </div>

        {/* add member */}
        {canAdd && (
          <div className="border-b border-wd-line bg-wd-bg px-5 py-4">
            <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
              Add member
            </div>
            {available.length === 0 ? (
              <p className="text-xs text-slate-400">Everyone is already a member.</p>
            ) : (
              <div className="flex gap-2">
                <select
                  value={newUser}
                  onChange={(e) => setNewUser(e.target.value)}
                  className="min-w-0 flex-1 rounded-lg border border-wd-line bg-white px-2 py-1.5 text-sm outline-none focus:border-wd-blue"
                >
                  <option value="">Select person…</option>
                  {available.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="rounded-lg border border-wd-line bg-white px-2 py-1.5 text-sm outline-none focus:border-wd-blue"
                >
                  {assignableRoles.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={addMember}
                  disabled={!newUser}
                  className="flex items-center rounded-lg bg-wd-blue px-2.5 text-white hover:bg-wd-navy disabled:bg-slate-300"
                  title="Add"
                >
                  <IconPlus size={18} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* member list */}
        <div className="flex-1 overflow-y-auto px-3 py-3">
          {tf.members.map((m) => {
            const u = getUser(state, m.userId);
            const isMe = m.userId === state.currentUserId;
            const lastAdmin = m.role === 'Admin' && adminCount === 1;
            const canEditRow = canManage && !isMe;
            return (
              <div
                key={m.userId}
                className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-50"
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ background: u.color }}
                >
                  {initials(u.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-wd-navy">
                    {u.name}
                    {isMe && <span className="ml-1 text-[11px] text-slate-400">(you)</span>}
                  </div>
                  <div className="truncate text-[11px] text-slate-400">{u.email}</div>
                </div>
                <select
                  value={m.role}
                  disabled={!canEditRow || lastAdmin}
                  onChange={(e) =>
                    dispatch({
                      type: 'CHANGE_ROLE',
                      tfId: tf.id,
                      userId: m.userId,
                      role: e.target.value,
                    })
                  }
                  title={ROLE_DESC[m.role]}
                  className="rounded-lg border border-wd-line bg-white px-2 py-1 text-xs font-semibold text-slate-600 outline-none focus:border-wd-blue disabled:bg-slate-100 disabled:text-slate-400"
                >
                  {(canManage ? ROLES : [m.role]).map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                {canManage && !isMe && !lastAdmin && (
                  <button
                    type="button"
                    onClick={() =>
                      dispatch({ type: 'REMOVE_MEMBER', tfId: tf.id, userId: m.userId })
                    }
                    className="rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-500"
                    title="Remove member"
                  >
                    <IconTrash size={16} />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* role legend */}
        <div className="border-t border-wd-line bg-wd-bg px-5 py-3">
          <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">
            Role &mdash; {myRole} (you)
          </div>
          <p className="text-[11px] leading-relaxed text-slate-500">{ROLE_DESC[myRole]}</p>
          {!canAdd && (
            <p className="mt-1 text-[11px] text-slate-400">
              Only Admins and Organizers can add members.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
