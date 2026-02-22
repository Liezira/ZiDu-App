// ── schoolConfig.js ───────────────────────────────────────────────
// Taruh di: src/lib/schoolConfig.js

export const SCHOOL_CONFIG = {
  SMA: { label: 'SMA', grades: [10, 11, 12], jurusan: ['Umum', 'IPA', 'IPS', 'Bahasa'] },
  SMK: { label: 'SMK', grades: [10, 11, 12], jurusan: ['Umum', 'TKJ', 'RPL', 'Akuntansi', 'Teknik Mesin', 'Multimedia'] },
  SMP: { label: 'SMP', grades: [7, 8, 9],    jurusan: ['Umum'] },
  MA:  { label: 'MA',  grades: [10, 11, 12], jurusan: ['Umum', 'IPA', 'IPS', 'Agama'] },
  MTS: { label: 'MTS', grades: [7, 8, 9],    jurusan: ['Umum'] },
};

export const SCHOOL_TYPES = Object.keys(SCHOOL_CONFIG);

export const getSchoolConfig = (schoolType) =>
  SCHOOL_CONFIG[schoolType] || SCHOOL_CONFIG.SMA;

export const GRADE_META = {
  7:  { bg: '#F0FDF4', color: '#16A34A' },
  8:  { bg: '#ECFDF5', color: '#059669' },
  9:  { bg: '#D1FAE5', color: '#047857' },
  10: { bg: '#EEF2FF', color: '#4F46E5' },
  11: { bg: '#EFF6FF', color: '#0891B2' },
  12: { bg: '#FDF4FF', color: '#9333EA' },
};

export const JURUSAN_META = {
  IPA:            { bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE' },
  IPS:            { bg: '#FDF4FF', color: '#9333EA', border: '#E9D5FF' },
  Bahasa:         { bg: '#FFFBEB', color: '#D97706', border: '#FDE68A' },
  Agama:          { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' },
  TKJ:            { bg: '#F0FDF4', color: '#16A34A', border: '#BBF7D0' },
  RPL:            { bg: '#F0FDF4', color: '#059669', border: '#A7F3D0' },
  Akuntansi:      { bg: '#FFF7ED', color: '#EA580C', border: '#FED7AA' },
  'Teknik Mesin': { bg: '#F8FAFC', color: '#475569', border: '#CBD5E1' },
  Multimedia:     { bg: '#FDF4FF', color: '#7C3AED', border: '#DDD6FE' },
  Umum:           { bg: '#F8FAFC', color: '#64748B', border: '#E2E8F0' },
};