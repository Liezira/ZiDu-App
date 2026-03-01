// src/lib/constants.js
// Konstanta sentral untuk konfigurasi aplikasi ZiDu
// Menggantikan magic numbers yang tersebar di seluruh codebase

// ── Konfigurasi Ujian ─────────────────────────────────────────────
export const EXAM_CONFIG = {
    /** Threshold waktu (detik) sebelum timer berubah merah — 5 menit */
    TIMER_WARNING_THRESHOLD_SECS: 300,

    /** Panjang minimum token ujian */
    MIN_TOKEN_LENGTH: 4,

    /** Panjang maksimum token ujian */
    MAX_TOKEN_LENGTH: 8,

    /** Interval auto-save ke DB dalam milidetik — 30 detik */
    AUTOSAVE_INTERVAL_MS: 30_000,

    /** Grace period sebelum violation dicatat (ms) — 1.2 detik */
    VIOLATION_GRACE_MS: 1_200,
};

// ── Konfigurasi Cache ─────────────────────────────────────────────
export const CACHE_CONFIG = {
    /** TTL cache profil user di localStorage — 30 menit */
    PROFILE_TTL_MS: 30 * 60 * 1000,

    /** Jumlah maksimum notifikasi yang ditampilkan */
    MAX_NOTIFICATIONS: 50,

    /** Interval polling notifikasi — 60 detik */
    NOTIFICATION_POLL_MS: 60_000,
};

// ── Role constants ────────────────────────────────────────────────
export const ROLES = {
    SUPER_ADMIN: 'super_admin',
    SCHOOL_ADMIN: 'school_admin',
    TEACHER: 'teacher',
    STUDENT: 'student',
};

// ── Route mapping per role ────────────────────────────────────────
export const ROLE_ROUTES = {
    super_admin: '/admin',
    school_admin: '/school',
    teacher: '/teacher',
    student: '/student',
};

// ── Tipe ujian ────────────────────────────────────────────────────
export const EXAM_TYPES = [
    'Ulangan Harian',
    'UTS',
    'UAS',
    'Try Out',
    'Kuis',
];

// ── Status subscription sekolah ───────────────────────────────────
export const SUBSCRIPTION_STATUS = {
    ACTIVE: 'active',
    SUSPENDED: 'suspended',
    EXPIRED: 'expired',
    TRIAL: 'trial',
};
