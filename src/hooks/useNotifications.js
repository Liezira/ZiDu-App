import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

const MAX_NOTIFS = 50;
const POLL_INTERVAL = 60_000; // 60 detik (hemat Realtime connections)

export const useNotifications = (userId, role) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  // ── Fetch notifications ─────────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(MAX_NOTIFS);
      if (error) throw error;
      const notifs = data || [];
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.is_read).length);
    } catch (err) {
      console.error('fetchNotifications error:', err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // ── Polling setiap 60 detik (hemat concurrent Realtime connections) ──
  // Realtime WebSocket dibatasi (200 di Free tier, 500 di Pro).
  // Notifikasi tidak butuh real-time sub-detik — 60 detik sudah cukup.
  useEffect(() => {
    if (!userId) return;

    fetchNotifications(); // fetch awal

    const interval = setInterval(fetchNotifications, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [userId, fetchNotifications]);

  // ── Mark single as read ─────────────────────────────────────────
  const markRead = useCallback(async (notifId) => {
    const notif = notifications.find(n => n.id === notifId);
    if (!notif || notif.is_read) return;

    // Optimistic update
    setNotifications(prev =>
      prev.map(n => n.id === notifId ? { ...n, is_read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notifId)
      .eq('user_id', userId);
  }, [notifications, userId]);

  // ── Mark all as read ────────────────────────────────────────────
  const markAllRead = useCallback(async () => {
    const unread = notifications.filter(n => !n.is_read);
    if (unread.length === 0) return;

    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);
  }, [notifications, userId]);

  // ── Delete notification ─────────────────────────────────────────
  const deleteNotif = useCallback(async (notifId) => {
    const notif = notifications.find(n => n.id === notifId);
    setNotifications(prev => prev.filter(n => n.id !== notifId));
    if (notif && !notif.is_read) setUnreadCount(prev => Math.max(0, prev - 1));

    await supabase
      .from('notifications')
      .delete()
      .eq('id', notifId)
      .eq('user_id', userId);
  }, [notifications, userId]);

  // ── Send notification (untuk school_admin/teacher) ──────────────
  const sendNotification = useCallback(async ({ targetUserId, type, title, body, link, metadata }) => {
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: targetUserId,
        type,
        title,
        body,
        link,
        metadata,
      });
    return { error };
  }, []);

  // ── Broadcast ke seluruh kelas via server RPC ───────────────────
  // Insert massal dilakukan server-side — tidak ada payload besar dari browser,
  // tidak ada timeout, tidak ada N fetch ke profiles table.
  const broadcastToStudents = useCallback(async ({ schoolId, classId, type, title, body, link, metadata }) => {
    const { data, error } = await supabase.rpc('broadcast_notification_to_class', {
      p_school_id: schoolId,
      p_class_id: classId,
      p_type: type,
      p_title: title,
      p_body: body,
      p_link: link ?? null,
      p_metadata: metadata ?? null,
    });
    return { error, count: data };
  }, []);

  return {
    notifications,
    loading,
    unreadCount,
    markRead,
    markAllRead,
    deleteNotif,
    sendNotification,
    broadcastToStudents,
    refetch: fetchNotifications,
  };
};