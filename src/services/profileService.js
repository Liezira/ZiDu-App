// src/services/profileService.js
// [FIX-M5] Service layer untuk operasi profil dan manajemen user.

import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

/**
 * Fetch profil lengkap user beserta data sekolah.
 * Ini adalah sumber otoritatif — selalu dari DB, tidak dari cache.
 * @param {string} userId
 */
export async function getFullProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      *,
      schools (
        id, name, subscription_tier, subscription_status,
        subscription_start_date, subscription_end_date,
        max_students, max_teachers, school_type, city
      )
    `)
    .eq('id', userId)
    .single();

  if (error) {
    logger.error('[profileService] getFullProfile error:', error.message);
    return { data: null, error: error.message };
  }
  return { data, error: null };
}

/**
 * Update profil user.
 * @param {string} userId
 * @param {object} updates - Field yang ingin diupdate
 */
export async function updateProfile(userId, updates) {
  const allowed = ['name', 'phone', 'avatar_url'];
  const safe = Object.fromEntries(
    Object.entries(updates).filter(([k]) => allowed.includes(k))
  );

  const { data, error } = await supabase
    .from('profiles')
    .update({ ...safe, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    logger.error('[profileService] updateProfile error:', error.message);
    return { data: null, error: error.message };
  }
  return { data, error: null };
}

/**
 * Fetch semua profil dalam satu sekolah berdasarkan role.
 * @param {string} schoolId
 * @param {'student'|'teacher'|'school_admin'} role
 * @param {object} options - { classId, status }
 */
export async function getProfilesByRole(schoolId, role, { classId, status = 'active' } = {}) {
  let query = supabase
    .from('profiles')
    .select('id, name, email, nis, phone, avatar_url, class_id, status, created_at')
    .eq('school_id', schoolId)
    .eq('role', role);

  if (status) query = query.eq('status', status);
  if (classId) query = query.eq('class_id', classId);

  query = query.order('name');

  const { data, error } = await query;

  if (error) {
    logger.error('[profileService] getProfilesByRole error:', error.message);
    return { data: [], error: error.message };
  }
  return { data: data ?? [], error: null };
}

/**
 * Approve atau reject pending user.
 * @param {string} profileId
 * @param {'active'|'rejected'} newStatus
 * @param {string} approvedBy - ID admin yang approve
 * @param {string|null} rejectionReason
 */
export async function updateApprovalStatus(profileId, newStatus, approvedBy, rejectionReason = null) {
  const update = {
    status: newStatus,
    approved_by: approvedBy,
    updated_at: new Date().toISOString(),
    ...(newStatus === 'active'    && { approved_at: new Date().toISOString() }),
    ...(newStatus === 'rejected'  && { rejection_reason: rejectionReason }),
  };

  const { error } = await supabase
    .from('profiles')
    .update(update)
    .eq('id', profileId);

  if (error) {
    logger.error('[profileService] updateApprovalStatus error:', error.message);
    return { error: error.message };
  }
  return { error: null };
}
