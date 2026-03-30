// src/lib/experimentUtils.js
// Utility murni (no side effects) untuk AB experiment logic.
// Tidak ada import Supabase di sini — ini pure functions.

/**
 * Simple djb2-style hash yang konsisten di semua browser.
 * Mengembalikan integer 0-99 (bucket).
 *
 * @param {string} classId  - UUID kelas siswa
 * @param {string} expKey   - slug eksperimen, misal "violation-modal-v1"
 * @returns {number} 0-99
 */
export function getExperimentBucket(classId, expKey) {
  const str = `${classId}::${expKey}`;
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash |= 0; // Clamp ke 32-bit integer
  }
  return Math.abs(hash) % 100;
}

/**
 * Tentukan variant berdasarkan bucket dan traffic split.
 * Ini hanya dipakai sebagai client-side fallback / optimistic read.
 * Source of truth tetap di Supabase RPC get_or_assign_variant().
 *
 * @param {number} bucket       - 0-99 dari getExperimentBucket()
 * @param {number} trafficSplit - persentase yang masuk treatment (0-100)
 * @returns {'control'|'treatment'}
 */
export function resolveVariant(bucket, trafficSplit) {
  return bucket < trafficSplit ? 'treatment' : 'control';
}

/**
 * Konstanta nama event. Import dari sini, jangan hardcode string.
 */
export const EXAM_EVENTS = {
  TOKEN_ENTERED:       'token_entered',
  TOKEN_VALID:         'token_valid',
  TOKEN_INVALID:       'token_invalid',
  EXAM_CONFIRMED:      'exam_confirmed',
  EXAM_STARTED:        'exam_started',
  QUESTION_ANSWERED:   'question_answered',
  PAUSE_USED:          'pause_used',
  VIOLATION_TRIGGERED: 'violation_triggered',
  SUBMIT_INITIATED:    'submit_initiated',
  EXAM_SUBMITTED:      'exam_submitted',
  FORCE_SUBMITTED:     'force_submitted',
};