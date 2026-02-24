import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

const MAX_NOTIFS = 50;

export const useNotifications = (userId, role) => {
  const [notifications, setNotifications] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const channelRef = useRef(null);

  // ── Fetch initial notifications ─────────────────────────────────
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

  // ── Supabase Realtime subscription ─────────────────────────────
  useEffect(() => {
    if (!userId) return;

    fetchNotifications();

    // Subscribe to INSERT events on notifications for this user
    channelRef.current = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotif = payload.new;
          setNotifications(prev => [newNotif, ...prev].slice(0, MAX_NOTIFS));
          setUnreadCount(prev => prev + 1);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const updated = payload.new;
          setNotifications(prev =>
            prev.map(n => n.id === updated.id ? updated : n)
          );
          // Recompute unread count
          setNotifications(prev => {
            setUnreadCount(prev.filter(n => !n.is_read).length);
            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
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

  // ── Send to multiple users (exam_new broadcast) ─────────────────
  const broadcastToStudents = useCallback(async ({ schoolId, type, title, body, link, metadata }) => {
    // Get all active students of the school
    const { data: students } = await supabase
      .from('profiles')
      .select('id')
      .eq('school_id', schoolId)
      .eq('role', 'student')
      .eq('status', 'active');

    if (!students?.length) return { error: null };

    const rows = students.map(s => ({
      user_id: s.id, type, title, body, link, metadata,
    }));

    const { error } = await supabase.from('notifications').insert(rows);
    return { error };
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