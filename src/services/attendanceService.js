// src/services/attendanceService.js
// [FIX-M5] Service layer untuk semua operasi absensi.

import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

// ── Sessions ──────────────────────────────────────────────────────

/**
 * Buat sesi absensi baru.
 * @param {object} payload - { school_id, teacher_id, class_id, subject_id, title, token, ... }
 */
export async function createAttendanceSession(payload) {
  const { data, error } = await supabase
    .from('attendance_sessions')
    .insert([payload])
    .select()
    .single();

  if (error) {
    logger.error('[attendanceService] createSession error:', error.message);
    return { data: null, error: error.message };
  }
  return { data, error: null };
}

/**
 * Fetch semua sesi absensi untuk seorang guru.
 * @param {string} teacherId
 * @param {string} schoolId
 * @param {string|null} classId - Optional filter by class
 */
export async function getTeacherSessions(teacherId, schoolId, classId = null) {
  let query = supabase
    .from('attendance_sessions')
    .select(`
      *,
      classes (id, name),
      subjects (id, name),
      attendance_records (id, status, student_id)
    `)
    .eq('teacher_id', teacherId)
    .eq('school_id', schoolId)
    .order('date', { ascending: false });

  if (classId) query = query.eq('class_id', classId);

  const { data, error } = await query;

  if (error) {
    logger.error('[attendanceService] getTeacherSessions error:', error.message);
    return { data: [], error: error.message };
  }
  return { data: data ?? [], error: null };
}

/**
 * Fetch session by ID beserta semua records.
 * @param {string} sessionId
 */
export async function getSessionWithRecords(sessionId) {
  const { data, error } = await supabase
    .from('attendance_sessions')
    .select(`
      *,
      attendance_records (
        id, status, method, note, checked_in_at,
        profiles!student_id (id, name, nis, avatar_url)
      )
    `)
    .eq('id', sessionId)
    .single();

  if (error) {
    logger.error('[attendanceService] getSessionWithRecords error:', error.message);
    return { data: null, error: error.message };
  }
  return { data, error: null };
}

/**
 * Buka/tutup sesi absensi.
 * @param {string} sessionId
 * @param {boolean} isOpen
 */
export async function toggleSession(sessionId, isOpen) {
  const { error } = await supabase
    .from('attendance_sessions')
    .update({ is_open: isOpen, updated_at: new Date().toISOString() })
    .eq('id', sessionId);

  if (error) {
    logger.error('[attendanceService] toggleSession error:', error.message);
  }
  return { error: error ?? null };
}

// ── Records ───────────────────────────────────────────────────────

/**
 * Upsert attendance records secara batch.
 * Digunakan untuk manual entry oleh guru.
 * @param {Array} records - [{ attendance_session_id, student_id, status, method, note }]
 */
export async function upsertAttendanceRecords(records) {
  const { error } = await supabase
    .from('attendance_records')
    .upsert(records, {
      onConflict: 'attendance_session_id,student_id',
      ignoreDuplicates: false,
    });

  if (error) {
    logger.error('[attendanceService] upsertAttendanceRecords error:', error.message);
    return { error: error.message };
  }
  return { error: null };
}

/**
 * Check-in siswa via token/QR.
 * @param {string} sessionId
 * @param {string} studentId
 * @param {string} method - 'token' | 'qr'
 */
export async function studentCheckIn(sessionId, studentId, method = 'token') {
  const { error } = await supabase
    .from('attendance_records')
    .upsert(
      [{
        attendance_session_id: sessionId,
        student_id: studentId,
        status: 'hadir',
        method,
        checked_in_at: new Date().toISOString(),
      }],
      { onConflict: 'attendance_session_id,student_id' }
    );

  if (error) {
    logger.error('[attendanceService] studentCheckIn error:', error.message);
    return { error: error.message };
  }
  return { error: null };
}

// ── Analytics ─────────────────────────────────────────────────────

/**
 * Ambil ringkasan absensi per kelas via RPC.
 * @param {string} classId
 * @param {string} schoolId
 * @param {string} periode - e.g. '2024-01'
 */
export async function getAttendanceSummary(classId, schoolId, periode) {
  const { data, error } = await supabase.rpc('get_attendance_summary', {
    p_class_id: classId,
    p_school_id: schoolId,
    p_periode: periode,
  });

  if (error) {
    logger.error('[attendanceService] getAttendanceSummary error:', error.message);
    return { data: null, error: error.message };
  }
  return { data, error: null };
}
