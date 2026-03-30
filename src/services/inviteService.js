/**
 * inviteService.js
 * Buat, baca, dan nonaktifkan invite links di Supabase.
 */
import { supabase } from '../lib/supabase';

const EXPIRE_DAYS = 7;

// ─── CREATE ──────────────────────────────────────────────────────
/**
 * Buat invite link baru.
 * @param {object} p
 * @param {string} p.schoolId
 * @param {string} p.createdBy   - profile.id guru / admin
 * @param {'student'|'teacher'|'school_admin'} p.targetRole
 * @param {string|null} p.classId
 * @param {string|null} p.className
 * @param {string|null} p.label  - label opsional untuk mudah dikenali
 * @param {number} p.maxUses     - 0 = unlimited, default 100
 * @returns {Promise<string>} token
 */
export async function createInviteLink({
  schoolId, createdBy, targetRole, classId = null,
  className = null, label = null, maxUses = 100,
}) {
  const expiresAt = new Date(Date.now() + EXPIRE_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('invite_links')
    .insert([{
      school_id:   schoolId,
      created_by:  createdBy,
      target_role: targetRole,
      class_id:    classId,
      class_name:  className,
      label,
      max_uses:    maxUses,
      expires_at:  expiresAt,
    }])
    .select('token')
    .single();

  if (error) throw error;
  return data.token;
}

// ─── READ ─────────────────────────────────────────────────────────
/**
 * Ambil invite berdasarkan token.
 * Return null jika tidak ada, sudah kadaluarsa, nonaktif, atau kuota habis.
 */
export async function getInviteByToken(token) {
  const { data, error } = await supabase
    .from('invite_links')
    .select('*')
    .eq('token', token)
    .single();

  if (error || !data) return null;

  if (!data.is_active)                            return null;
  if (new Date(data.expires_at) < new Date())     return null;
  if (data.max_uses > 0 && data.use_count >= data.max_uses) return null;

  return data;
}

/**
 * Ambil semua invite links milik sekolah.
 */
export async function getInvitesBySchool(schoolId) {
  const { data, error } = await supabase
    .from('invite_links')
    .select('*, profiles!created_by(name)')
    .eq('school_id', schoolId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Ambil invite links untuk kelas tertentu.
 */
export async function getInvitesByClass(classId) {
  const { data, error } = await supabase
    .from('invite_links')
    .select('*')
    .eq('class_id', classId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// ─── USE INVITE (via RPC, atomic) ────────────────────────────────
/**
 * Increment use_count via RPC supbase.
 * Dipanggil setelah user berhasil signup.
 */
export async function useInviteLink(token, userId) {
  const { data, error } = await supabase.rpc('use_invite_link', {
    p_token:   token,
    p_user_id: userId,
  });
  if (error) throw error;
  return data; // { ok, school_id, class_id, class_name, target_role, label }
}

// ─── DEACTIVATE ───────────────────────────────────────────────────
export async function deactivateInvite(inviteId) {
  const { error } = await supabase
    .from('invite_links')
    .update({ is_active: false })
    .eq('id', inviteId);
  if (error) throw error;
}

// ─── HELPERS ──────────────────────────────────────────────────────
export function buildInviteUrl(token) {
  return `${window.location.origin}/join?invite=${token}`;
}

export function isExpired(invite) {
  return new Date(invite.expires_at) < new Date();
}

export function isQuotaFull(invite) {
  return invite.max_uses > 0 && invite.use_count >= invite.max_uses;
}