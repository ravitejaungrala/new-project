// Role -> capability map. Mirrors Zoho WorkDrive's five Team Folder roles.
export const ROLE_CAPS = {
  Admin:     { manage: true,  organize: true,  edit: true,  share: true,  remove: true,  comment: true },
  Organizer: { manage: false, organize: true,  edit: true,  share: true,  remove: true,  comment: true },
  Editor:    { manage: false, organize: false, edit: true,  share: false, remove: false, comment: true },
  Commenter: { manage: false, organize: false, edit: false, share: false, remove: false, comment: true },
  Viewer:    { manage: false, organize: false, edit: false, share: false, remove: false, comment: false },
};

export const ROLES = ['Admin', 'Organizer', 'Editor', 'Commenter', 'Viewer'];

export const ROLE_DESC = {
  Admin: 'Full control: manage members, settings and all content.',
  Organizer: 'Add members, and add, edit, move and share content.',
  Editor: 'View, add, edit, copy and rename content.',
  Commenter: 'View, comment on and download files.',
  Viewer: 'View, copy and download files only.',
};

export function caps(role) {
  return ROLE_CAPS[role] || ROLE_CAPS.Viewer;
}

export function formatBytes(b) {
  if (b == null) return '—';
  if (b === 0) return '0 KB';
  const k = 1024;
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(b) / Math.log(k)));
  return `${(b / Math.pow(k, i)).toFixed(i <= 1 ? 0 : 1)} ${units[i]}`;
}

export function extOf(name) {
  const m = /\.([a-z0-9]+)$/i.exec(name || '');
  return m ? m[1].toLowerCase() : '';
}

// Maps file extension -> a "kind" used for coloured icons.
const FILE_KINDS = {
  pdf: 'pdf',
  doc: 'doc', docx: 'doc', md: 'doc', txt: 'doc', rtf: 'doc',
  xls: 'sheet', xlsx: 'sheet', csv: 'sheet',
  ppt: 'slide', pptx: 'slide', key: 'slide',
  png: 'image', jpg: 'image', jpeg: 'image', gif: 'image', svg: 'image', webp: 'image', fig: 'image',
  zip: 'archive', rar: 'archive', '7z': 'archive', tar: 'archive', gz: 'archive',
  mp4: 'video', mov: 'video', avi: 'video',
  mp3: 'audio', wav: 'audio',
};

export function kindOf(name) {
  return FILE_KINDS[extOf(name)] || 'file';
}

export const KIND_COLOR = {
  pdf: '#E2574C',
  doc: '#2E75B6',
  sheet: '#1E8E5A',
  slide: '#E08B2D',
  image: '#9B59B6',
  archive: '#7A8699',
  video: '#C0398A',
  audio: '#2AA3A3',
  file: '#7A8699',
  folder: '#F0B428',
};

export function fmtDate(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso || '—';
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return 'Today ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function timeValue(iso) {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? 0 : d.getTime();
}

let counter = 0;
export function uid(prefix = 'id') {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}

export function initials(name) {
  return (name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0].toUpperCase())
    .join('');
}

export function makeShareLink(name) {
  const slug = (name || 'file').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `https://workdrive.z-ninth.com/s/${Math.random().toString(36).slice(2, 8)}/${slug}`;
}
