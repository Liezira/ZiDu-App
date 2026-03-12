// ── Shared Announcement Utilities ────────────────────────────
// Pure constants dan helper functions — tidak ada supabase import di sini

export const ANN_TYPES = {
  info:     { label: 'Informasi', color: '#0891B2', bg: '#EFF6FF', icon: 'ℹ️' },
  urgent:   { label: 'Mendesak',  color: '#DC2626', bg: '#FEF2F2', icon: '🚨' },
  deadline: { label: 'Deadline',  color: '#D97706', bg: '#FFFBEB', icon: '⏰' },
  event:    { label: 'Acara',     color: '#7C3AED', bg: '#F5F3FF', icon: '📅' },
};

export const TARGET_LABELS = {
  all:      'Semua (Guru & Siswa)',
  teachers: 'Guru & Staff',
  students: 'Semua Siswa',
  class:    'Kelas Tertentu',
};

export const fmtAgo = (d) => {
  if (!d) return '';
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'Baru saja';
  if (mins < 60) return `${mins} menit lalu`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs} jam lalu`;
  const days = Math.floor(hrs / 24);
  if (days < 7)  return `${days} hari lalu`;
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  : '';