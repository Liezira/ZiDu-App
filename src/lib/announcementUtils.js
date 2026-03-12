// ── Shared Announcement Components ───────────────────────────
// Dipakai oleh TeacherAnnouncements, SchoolAnnouncements, StudentAnnouncements

import { supabase } from '../../lib/supabase';

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

// Fetch announcements for a given role/class
export const fetchAnnouncements = async ({ schoolId, role, classId }) => {
  let query = supabase
    .from('announcements')
    .select('*, profiles(name, role), classes(name)')
    .eq('school_id', schoolId)
    .or(`expires_at.is.null,expires_at.gte.${new Date().toISOString()}`)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(50);

  return query;
};

// Toggle pin
export const togglePin = async (id, currentVal) => {
  return supabase.from('announcements').update({ is_pinned: !currentVal }).eq('id', id);
};

// Delete
export const deleteAnn = async (id) => {
  return supabase.from('announcements').delete().eq('id', id);
};