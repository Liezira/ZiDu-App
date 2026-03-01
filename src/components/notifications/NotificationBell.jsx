import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, CheckCheck, Trash2, X, GraduationCap,
  UserCheck, FileText, Award, Clock, Inbox,
} from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────
const fmtRelative = (d) => {
  if (!d) return '';
  const diff = (Date.now() - new Date(d).getTime()) / 1000;
  if (diff < 60)    return 'Baru saja';
  if (diff < 3600)  return `${Math.floor(diff / 60)} mnt lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  if (diff < 604800)return `${Math.floor(diff / 86400)} hari lalu`;
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
};

const TYPE_META = {
  exam_new:         { icon: FileText,      color: '#4F46E5', bg: '#EEF2FF', label: 'Ujian Baru'   },
  exam_graded:      { icon: Award,         color: '#D97706', bg: '#FFFBEB', label: 'Nilai Keluar' },
  approval_pending: { icon: UserCheck,     color: '#0891B2', bg: '#EFF6FF', label: 'Pendaftaran'  },
  approval_result:  { icon: GraduationCap, color: '#16A34A', bg: '#F0FDF4', label: 'Status Akun'  },
  exam_reminder:    { icon: Clock,         color: '#DC2626', bg: '#FEF2F2', label: 'Pengingat'    },
};

// ── Notification Item ─────────────────────────────────────────────
const NotifItem = ({ notif, onRead, onDelete, onNavigate }) => {
  const meta = TYPE_META[notif.type] || TYPE_META.exam_new;
  const Icon = meta.icon;

  return (
    <div
      onClick={() => { onRead(notif.id); onNavigate(notif.link); }}
      style={{
        display: 'flex', gap: '12px', padding: '12px 16px',
        background: notif.is_read ? '#fff' : '#F8FBFF',
        borderBottom: '1px solid #F1F5F9',
        cursor: notif.link ? 'pointer' : 'default',
        transition: 'background .12s',
        position: 'relative',
      }}
      onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
      onMouseLeave={e => e.currentTarget.style.background = notif.is_read ? '#fff' : '#F8FBFF'}
    >
      {/* Unread dot */}
      {!notif.is_read && (
        <div style={{ position: 'absolute', left: '6px', top: '50%', transform: 'translateY(-50%)', width: '5px', height: '5px', borderRadius: '50%', background: '#4F46E5', flexShrink: 0 }} />
      )}

      {/* Icon */}
      <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: '4px' }}>
        <Icon size={16} style={{ color: meta.color }} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: notif.is_read ? '500' : '700', color: '#0F172A', marginBottom: '2px', lineHeight: 1.4 }}>
          {notif.title}
        </div>
        {notif.body && (
          <div style={{ fontSize: '12px', color: '#64748B', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {notif.body}
          </div>
        )}
        <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ padding: '1px 6px', borderRadius: '999px', background: meta.bg, color: meta.color, fontWeight: '600', fontSize: '10px' }}>{meta.label}</span>
          {fmtRelative(notif.created_at)}
        </div>
      </div>

      {/* Delete button */}
      <button
        onClick={e => { e.stopPropagation(); onDelete(notif.id); }}
        style={{ flexShrink: 0, width: '24px', height: '24px', borderRadius: '6px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#CBD5E1', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .12s', alignSelf: 'flex-start', marginTop: '2px' }}
        onMouseEnter={e => { e.currentTarget.style.background = '#FEF2F2'; e.currentTarget.style.color = '#EF4444'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#CBD5E1'; }}
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
};

// ── Shimmer ───────────────────────────────────────────────────────
const Shimmer = () => (
  <div style={{ display: 'flex', gap: '12px', padding: '14px 16px', borderBottom: '1px solid #F1F5F9' }}>
    <div style={{ width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0, background: 'linear-gradient(90deg,#F1F5F9 25%,#E2E8F0 50%,#F1F5F9 75%)', backgroundSize: '400px 100%', animation: 'shimmer 1.2s infinite' }} />
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '7px' }}>
      <div style={{ height: '13px', width: '70%', borderRadius: '4px', background: 'linear-gradient(90deg,#F1F5F9 25%,#E2E8F0 50%,#F1F5F9 75%)', backgroundSize: '400px 100%', animation: 'shimmer 1.2s infinite' }} />
      <div style={{ height: '11px', width: '90%', borderRadius: '4px', background: 'linear-gradient(90deg,#F1F5F9 25%,#E2E8F0 50%,#F1F5F9 75%)', backgroundSize: '400px 100%', animation: 'shimmer 1.2s infinite' }} />
    </div>
  </div>
);

// ── Main NotificationBell ─────────────────────────────────────────
const NotificationBell = ({
  notifications = [],
  unreadCount   = 0,
  loading       = false,
  onMarkRead,
  onMarkAllRead,
  onDelete,
  C = {},   // colors from DashboardLayout
}) => {
  const [open, setOpen] = useState(false);
  const [tab,  setTab]  = useState('unread');
  const panelRef  = useRef(null);
  const buttonRef = useRef(null);
  const navigate  = useNavigate();

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (
        panelRef.current  && !panelRef.current.contains(e.target) &&
        buttonRef.current && !buttonRef.current.contains(e.target)
      ) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close on Esc
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const handleNavigate = (link) => {
    if (!link) return;
    setOpen(false);
    navigate(link);
  };

  const displayed = tab === 'unread'
    ? notifications.filter(n => !n.is_read)
    : notifications;

  return (
    <>
      <style>{`
        @keyframes shimmer { 0%{background-position:-400px 0;}100%{background-position:400px 0;} }
        @keyframes bellRing {
          0%,100%{transform:rotate(0);}
          10%{transform:rotate(14deg);}
          20%{transform:rotate(-12deg);}
          30%{transform:rotate(10deg);}
          40%{transform:rotate(-8deg);}
          50%{transform:rotate(0);}
        }
        @keyframes panelIn {
          from{opacity:0;transform:translateY(-8px) scale(.97);}
          to{opacity:1;transform:translateY(0) scale(1);}
        }
        @keyframes badgePop {
          0%{transform:scale(0);}
          70%{transform:scale(1.25);}
          100%{transform:scale(1);}
        }
        .notif-bell-btn { transition: background .15s; }
        .notif-bell-btn:hover { background: ${C.hover || '#F1F5F9'} !important; }
      `}</style>

      <div style={{ position: 'relative' }}>
        {/* Bell Button */}
        <button
          ref={buttonRef}
          onClick={() => setOpen(o => !o)}
          className="notif-bell-btn"
          style={{
            width: '36px', height: '36px', borderRadius: '10px',
            border: `1px solid ${C.border || '#E2E8F0'}`,
            background: open ? (C.hover || '#F1F5F9') : (C.bg || '#F8FAFC'),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: open ? '#4F46E5' : '#475569', position: 'relative',
          }}
        >
          <Bell
            size={17}
            style={{ animation: unreadCount > 0 && !open ? 'bellRing 1.5s ease 1s 1' : 'none' }}
          />
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute', top: '-4px', right: '-4px',
              minWidth: '18px', height: '18px', borderRadius: '999px',
              background: '#EF4444', color: '#fff',
              fontSize: '10px', fontWeight: '700',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid #fff', padding: '0 4px',
              animation: 'badgePop .3s cubic-bezier(.34,1.56,.64,1)',
              fontFamily: 'Sora, sans-serif',
            }}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* Dropdown Panel */}
        {open && (
          <div
            ref={panelRef}
            style={{
              position: 'absolute', top: 'calc(100% + 10px)', right: 0,
              width: '360px', maxWidth: 'calc(100vw - 24px)',
              background: '#fff', borderRadius: '16px',
              border: '1px solid #F1F5F9',
              boxShadow: '0 16px 48px rgba(0,0,0,.12), 0 2px 8px rgba(0,0,0,.04)',
              zIndex: 500, overflow: 'hidden',
              animation: 'panelIn .2s cubic-bezier(.16,1,.3,1)',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {/* Header */}
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontFamily: 'Sora, sans-serif', fontSize: '14px', fontWeight: '700', color: '#0F172A', margin: 0 }}>
                  Notifikasi
                </h3>
                {unreadCount > 0 && (
                  <div style={{ fontSize: '11px', color: '#64748B', marginTop: '1px' }}>
                    {unreadCount} belum dibaca
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                {unreadCount > 0 && (
                  <button
                    onClick={onMarkAllRead}
                    style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 9px', borderRadius: '7px', border: '1px solid #E2E8F0', background: '#F8FAFC', fontSize: '11px', fontWeight: '600', color: '#4F46E5', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
                  >
                    <CheckCheck size={11} />Tandai semua
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  style={{ width: '26px', height: '26px', borderRadius: '7px', border: 'none', background: '#F8FAFC', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}
                >
                  <X size={13} />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', padding: '8px 16px 0', gap: '4px', borderBottom: '1px solid #F1F5F9' }}>
              {[
                { v: 'unread', label: 'Belum Dibaca', count: unreadCount },
                { v: 'all',    label: 'Semua',         count: notifications.length },
              ].map(t => (
                <button
                  key={t.v}
                  onClick={() => setTab(t.v)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '5px',
                    padding: '6px 10px',
                    borderRadius: '7px 7px 0 0',
                    border: 'none',
                    borderBottom: tab === t.v ? '2px solid #4F46E5' : '2px solid transparent',
                    background: 'transparent',
                    fontSize: '12px', fontWeight: tab === t.v ? '700' : '500',
                    color: tab === t.v ? '#4F46E5' : '#94A3B8',
                    cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                    transition: 'all .15s',
                  }}
                >
                  {t.label}
                  {t.count > 0 && (
                    <span style={{ padding: '1px 5px', borderRadius: '999px', fontSize: '10px', fontWeight: '700', background: tab === t.v ? '#EEF2FF' : '#F1F5F9', color: tab === t.v ? '#4F46E5' : '#94A3B8' }}>
                      {t.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* List */}
            <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
              {loading
                ? Array.from({ length: 3 }).map((_, i) => <Shimmer key={i} />)
                : displayed.length === 0
                ? (
                  <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                      <Inbox size={22} style={{ color: '#CBD5E1' }} />
                    </div>
                    <div style={{ fontFamily: 'Sora, sans-serif', fontSize: '14px', fontWeight: '700', color: '#0F172A', marginBottom: '5px' }}>
                      {tab === 'unread' ? 'Semua sudah dibaca' : 'Belum ada notifikasi'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#94A3B8' }}>
                      {tab === 'unread' ? 'Notifikasi baru akan muncul di sini' : 'Kamu akan dapat notifikasi untuk ujian & nilai'}
                    </div>
                  </div>
                )
                : displayed.map(n => (
                  <NotifItem
                    key={n.id}
                    notif={n}
                    onRead={onMarkRead}
                    onDelete={onDelete}
                    onNavigate={handleNavigate}
                  />
                ))
              }
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div style={{ padding: '10px 16px', borderTop: '1px solid #F1F5F9', textAlign: 'center' }}>
                <span style={{ fontSize: '11px', color: '#94A3B8' }}>
                  {notifications.length} notifikasi tersimpan · Real-time via Supabase
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default NotificationBell;