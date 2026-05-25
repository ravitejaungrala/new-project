// WorkDrive API client - talks to the FastAPI `/workdrive` router that is
// mounted in the shared NeuzenAI HRMS backend.
import { API_URL } from '../../config.js';

const BASE = `${API_URL}/workdrive`;

async function req(path, opts = {}) {
  const isForm = opts.body instanceof FormData;
  const headers = isForm
    ? { ...(opts.headers || {}) }
    : { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  const res = await fetch(`${BASE}${path}`, { ...opts, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`WorkDrive API ${res.status}: ${text}`);
  }
  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : res;
}

export const wdApi = {
  // Full workspace snapshot for the signed-in user.
  getState(user) {
    const q = new URLSearchParams();
    if (user?.email) q.set('email', user.email);
    if (user?.name) q.set('name', user.name);
    return req(`/state?${q.toString()}`);
  },

  createItem(item) {
    return req('/items', { method: 'POST', body: JSON.stringify(item) });
  },

  patchItem(id, patch) {
    return req(`/items/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
  },

  deleteItems(ids) {
    return req('/items/delete', { method: 'POST', body: JSON.stringify({ ids }) });
  },

  upload(folderId, ownerId, files) {
    const fd = new FormData();
    fd.append('folder_id', folderId);
    fd.append('owner_id', ownerId);
    files.forEach((f) => fd.append('files', f));
    return req('/upload', { method: 'POST', body: fd });
  },

  createTeamFolder(tf) {
    return req('/team-folders', { method: 'POST', body: JSON.stringify(tf) });
  },

  addMember(tfId, userId, role) {
    return req(`/team-folders/${tfId}/members`, {
      method: 'POST',
      body: JSON.stringify({ userId, role }),
    });
  },

  changeRole(tfId, userId, role) {
    return req(`/team-folders/${tfId}/members/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  },

  removeMember(tfId, userId) {
    return req(`/team-folders/${tfId}/members/${userId}/remove`, { method: 'POST' });
  },

  setShare(itemId, share) {
    return req(`/shares/${itemId}`, { method: 'PUT', body: JSON.stringify({ share }) });
  },

  // Direct download URL for a stored file.
  downloadUrl(id) {
    return `${BASE}/download/${id}`;
  },
};
