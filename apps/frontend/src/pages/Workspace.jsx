import React from 'react';
import { API_URL } from '../config.js';

// Zoho One-style unified Workspace portal - 27 apps, every one backed by the
// live HRMS API. The signed-in user's identity is passed through so apps like
// Cliq (team chat) know who is sending messages.
export default function Workspace({ user }) {
  const params = new URLSearchParams({ api: API_URL });
  if (user?.name) params.set('me', user.name);
  if (user?.email) params.set('email', user.email);
  const src = `/workspace.html?${params.toString()}`;
  return (
    <div
      style={{
        height: 'calc(100vh - 4rem)',
        minHeight: 540,
        border: '1px solid #e5e7eb',
        borderRadius: 14,
        overflow: 'hidden',
        background: '#fffaf6',
        boxShadow: '0 1px 3px rgba(11,11,15,0.08)',
      }}
    >
      <iframe
        src={src}
        title="Dhanadurga Workspace"
        style={{ width: '100%', height: '100%', border: 0, display: 'block' }}
      />
    </div>
  );
}
