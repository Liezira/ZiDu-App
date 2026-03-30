// src/lib/examEvents.js
// Wrapper ringan untuk insert ke tabel exam_events.
// Desain: fire-and-forget, tidak pernah throw (agar tidak ganggu UX ujian).

import { supabase } from './supabase';

/**
 * Kirim event ke tabel exam_events.
 * Selalu fire-and-forget — error di-log tapi tidak di-throw.
 *
 * @param {{
 *   eventType:      string,
 *   studentId:      string,
 *   schoolId:       string,
 *   examSessionId?: string,
 *   examResultId?:  string,
 *   experimentId?:  string,
 *   variant?:       string,
 *   properties?:    object,
 * }} params
 */
export async function trackExamEvent({
  eventType,
  studentId,
  schoolId,
  examSessionId = null,
  examResultId  = null,
  experimentId  = null,
  variant       = null,
  properties    = {},
}) {
  try {
    await supabase.from('exam_events').insert({
      event_type:      eventType,
      student_id:      studentId,
      school_id:       schoolId,
      exam_session_id: examSessionId,
      exam_result_id:  examResultId,
      experiment_id:   experimentId,
      variant,
      properties,
      client_ts:       new Date().toISOString(),
    });
  } catch (err) {
    // Sengaja silent — jangan sampai tracking error matikan ujian
    console.warn('[examEvents] Failed to track:', eventType, err?.message);
  }
}

/**
 * Factory: buat trackEvent yang sudah pre-filled context ujian.
 * Dipanggil sekali di awal ExamRoom, lalu gunakan hasilnya di mana saja.
 *
 * Contoh penggunaan:
 *   const track = createTracker({ studentId, schoolId, examSessionId, examResultId, experimentId, variant });
 *   track(EXAM_EVENTS.EXAM_STARTED, { question_count: 20 });
 */
export function createTracker({ studentId, schoolId, examSessionId, examResultId, experimentId, variant }) {
  return function track(eventType, properties = {}) {
    trackExamEvent({ eventType, studentId, schoolId, examSessionId, examResultId, experimentId, variant, properties });
  };
}