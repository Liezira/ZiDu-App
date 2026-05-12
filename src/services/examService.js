// src/services/examService.js
// [FIX-M5] Service layer — mengabstraksi semua Supabase queries untuk exam.
// Manfaat:
//   ✅ Mudah di-test (mock service, bukan mock supabase secara langsung)
//   ✅ Logika bisnis terpusat — satu tempat untuk bug fix
//   ✅ Komponen jadi murni presentational
//   ✅ Mudah diganti backend di masa depan

import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

// ── Session ───────────────────────────────────────────────────────

/**
 * Fetch exam session dan validasi token.
 * @param {string} token - Token ujian 8 karakter
 * @returns {{ data: object|null, error: string|null }}
 */
export async function getExamSessionByToken(token) {
  const { data, error } = await supabase
    .from('exam_sessions')
    .select(`
      *,
      question_banks (id, name, subject_id,
        subjects (id, name)
      ),
      classes (id, name)
    `)
    .eq('token', token.toUpperCase())
    .single();

  if (error) {
    logger.error('[examService] getExamSessionByToken error:', error.message);
    return { data: null, error: error.message };
  }
  return { data, error: null };
}

/**
 * Fetch semua exam sessions milik seorang guru.
 * @param {string} teacherId
 * @param {string} schoolId
 */
export async function getTeacherExamSessions(teacherId, schoolId) {
  const { data, error } = await supabase
    .from('exam_sessions')
    .select(`
      *,
      classes (id, name),
      question_banks (id, name, subjects (id, name))
    `)
    .eq('teacher_id', teacherId)
    .eq('school_id', schoolId)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('[examService] getTeacherExamSessions error:', error.message);
    return { data: [], error: error.message };
  }
  return { data: data ?? [], error: null };
}

// ── Results ───────────────────────────────────────────────────────

/**
 * Ambil atau buat exam result untuk student.
 * @param {string} sessionId
 * @param {string} studentId
 */
export async function getOrCreateExamResult(sessionId, studentId) {
  // Check existing
  const { data: existing } = await supabase
    .from('exam_results')
    .select('*')
    .eq('exam_session_id', sessionId)
    .eq('student_id', studentId)
    .in('status', ['in_progress', 'submitted', 'graded'])
    .maybeSingle();

  if (existing) return { data: existing, error: null, created: false };

  // Create new
  const { data: created, error } = await supabase
    .from('exam_results')
    .insert([{
      exam_session_id: sessionId,
      student_id: studentId,
      answers: [],
      status: 'in_progress',
      started_at: new Date().toISOString(),
    }])
    .select()
    .single();

  if (error) {
    logger.error('[examService] getOrCreateExamResult error:', error.message);
    return { data: null, error: error.message, created: false };
  }
  return { data: created, error: null, created: true };
}

/**
 * Auto-save jawaban ke database.
 * @param {string} resultId
 * @param {Array}  answers
 */
export async function autoSaveAnswers(resultId, answers) {
  const { error } = await supabase
    .from('exam_results')
    .update({
      answers,
      updated_at: new Date().toISOString(),
    })
    .eq('id', resultId);

  if (error) {
    logger.error('[examService] autoSaveAnswers error:', error.message);
  }
  return { error: error ?? null };
}

/**
 * Submit ujian dan hitung nilai via RPC.
 * @param {string} resultId
 * @param {Array}  answers
 * @param {number} violationScore
 */
export async function submitExam(resultId, answers, violationScore = 0) {
  const { data, error } = await supabase.rpc('calculate_and_submit_exam', {
    p_result_id: resultId,
    p_answers: answers,
    p_violation_score: violationScore,
  });

  if (error) {
    logger.error('[examService] submitExam RPC error:', error.message);
    return { data: null, error: error.message };
  }
  return { data, error: null };
}

/**
 * Append violation ke exam result.
 * @param {string} resultId
 * @param {string} violationType
 * @param {object} meta
 */
export async function appendViolation(resultId, violationType, meta = {}) {
  const { error } = await supabase.rpc('append_violation', {
    p_result_id: resultId,
    p_type: violationType,
    p_meta: meta,
  });

  if (error) {
    logger.error('[examService] appendViolation error:', error.message);
  }
  return { error: error ?? null };
}

/**
 * Fetch exam results untuk satu session (guru view).
 * @param {string} sessionId
 */
export async function getSessionResults(sessionId) {
  const { data, error } = await supabase
    .from('exam_results')
    .select(`
      *,
      profiles!student_id (id, name, nis, avatar_url)
    `)
    .eq('exam_session_id', sessionId)
    .order('submitted_at', { ascending: false });

  if (error) {
    logger.error('[examService] getSessionResults error:', error.message);
    return { data: [], error: error.message };
  }
  return { data: data ?? [], error: null };
}

// ── Questions ─────────────────────────────────────────────────────

/**
 * Fetch questions untuk satu bank soal.
 * @param {string} bankId
 * @param {object} options - { shuffle, limit }
 */
export async function getQuestions(bankId, { shuffle = true, limit = null } = {}) {
  let query = supabase
    .from('questions')
    .select('*')
    .eq('bank_id', bankId);

  if (limit) query = query.limit(limit);

  const { data, error } = await query;

  if (error) {
    logger.error('[examService] getQuestions error:', error.message);
    return { data: [], error: error.message };
  }

  let questions = data ?? [];
  if (shuffle) {
    // Fisher-Yates shuffle
    for (let i = questions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [questions[i], questions[j]] = [questions[j], questions[i]];
    }
  }

  return { data: questions, error: null };
}
