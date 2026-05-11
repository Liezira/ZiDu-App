import React, { useState, useEffect, useRef } from 'react';
import { useNotifications } from '../../hooks/useNotifications';
import NotificationBell from '../notifications/NotificationBell';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard, BookOpen, Users, LogOut, School,
  FileText, Award, Menu, X, Layers, UserCircle,
  ClipboardCheck, BarChart2, Megaphone, RotateCcw,
  ClipboardList, NotebookPen, Globe, ChevronRight,
} from 'lucide-react';

// ─── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  bg: '#f4f3f0', sidebar: '#ebe9e3', surface: '#ffffff', surface2: '#f9f8f5',
  border: '#ddd9d2', border2: '#c5c2bc',
  text1: '#1a1c26', text2: '#4a4c5e', text3: '#9a9790',
  indigo: '#6366f1', indigoHov: '#4f51c9', indigoBg: '#ede9ff',
  teal: '#14b8a6', amber: '#f59e0b', red: '#E24B4A', green: '#1D9E75',
};

const MENUS = {
  super_admin: [
    { group: 'Utama', items: [
      { label: 'Overview', icon: LayoutDashboard, path: '/admin' },
      { label: 'Sekolah', icon: School, path: '/admin/schools' },
      { label: 'Analitik Global', icon: Globe, path: '/admin/analytics' },
    ]},
    { group: 'Akun', items: [
      { label: 'Profil Saya', icon: UserCircle, path: '/admin/profile' },
    ]},
  ],
  school_admin: [
    { group: 'Utama', items: [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/school' },
      { label: 'Pengumuman', icon: Megaphone, path: '/school/announcements' },
    ]},
    { group: 'Manajemen', items: [
      { label: 'Guru & Murid', icon: Users, path: '/school/staff' },
      { label: 'Kelas', icon: Layers, path: '/school/classes' },
      { label: 'Mata Pelajaran', icon: BookOpen, path: '/school/subjects' },
      { label: 'Persetujuan Siswa', icon: ClipboardCheck, path: '/school/approvals', badgeKey: 'approvals' },
    ]},
    { group: 'Akademik', items: [
      { label: 'Rapor Siswa', icon: NotebookPen, path: '/school/report-card' },
    ]},
    { group: 'Akun', items: [
      { label: 'Profil Saya', icon: UserCircle, path: '/school/profile' },
    ]},
  ],
  teacher: [
    { group: 'Utama', items: [
      { label: 'Beranda', icon: LayoutDashboard, path: '/teacher' },
      { label: 'Pengumuman', icon: Megaphone, path: '/teacher/announcements' },
    ]},
    { group: 'Ujian', items: [
      { label: 'Bank Soal', icon: BookOpen, path: '/teacher/questions' },
      { label: 'Kelola Ujian', icon: FileText, path: '/teacher/exams' },
      { label: 'Remedial', icon: RotateCcw, path: '/teacher/remedial' },
    ]},
    { group: 'Akademik', items: [
      { label: 'Rekap Nilai', icon: Award, path: '/teacher/grades' },
      { label: 'Laporan Nilai', icon: NotebookPen, path: '/teacher/report-card' },
      { label: 'Analitik', icon: BarChart2, path: '/teacher/analytics' },
      { label: 'AB Testing', icon: BarChart2, path: '/teacher/ab-testing' },
      { label: 'Absensi', icon: ClipboardList, path: '/teacher/attendance' },
    ]},
    { group: 'Akun', items: [
      { label: 'Kelas Saya', icon: Layers, path: '/teacher/classes' },
      { label: 'Profil Saya', icon: UserCircle, path: '/teacher/profile' },
    ]},
  ],
  student: [
    { group: 'Belajar', items: [
      { label: 'Ujian Saya', icon: FileText, path: '/student' },
      { label: 'Riwayat Nilai', icon: Award, path: '/student/results' },
      { label: 'Kelas Saya', icon: Layers, path: '/student/class' },
      { label: 'Pengumuman', icon: Megaphone, path: '/student/announcements' },
    ]},
    { group: 'Akun', items: [
      { label: 'Profil Saya', icon: UserCircle, path: '/student/profile' },
    ]},
  ],
};

const PAGE_NAMES = {
  '/admin': 'Overview', '/admin/schools': 'Manajemen Sekolah',
  '/admin/analytics': 'Analitik Global', '/admin/profile': 'Profil Saya',
  '/school': 'Dashboard', '/school/staff': 'Guru & Murid',
  '/school/classes': 'Manajemen Kelas', '/school/subjects': 'Mata Pelajaran',
  '/school/approvals': 'Persetujuan Siswa', '/school/announcements': 'Pengumuman',
  '/school/profile': 'Profil Saya', '/school/report-card': 'Rapor Siswa',
  '/teacher': 'Beranda', '/teacher/questions': 'Bank Soal',
  '/teacher/exams': 'Kelola Ujian', '/teacher/grades': 'Rekap Nilai',
  '/teacher/analytics': 'Analitik', '/teacher/ab-testing': 'AB Testing',
  '/teacher/remedial': 'Remedial', '/teacher/announcements': 'Pengumuman',
  '/teacher/attendance': 'Absensi', '/teacher/report-card': 'Laporan Nilai',
  '/teacher/classes': 'Kelas Saya', '/teacher/profile': 'Profil Saya',
  '/student': 'Ujian Saya', '/student/results': 'Riwayat Nilai',
  '/student/class': 'Kelas Saya', '/student/announcements': 'Pengumuman',
  '/student/profile': 'Profil Saya',
};

const ROLE_LABEL = {
  super_admin: 'Super Admin', school_admin: 'Admin Sekolah',
  teacher: 'Guru', student: 'Siswa',
};

const PLAN_STYLE = {
  Starter:    { bg: '#FAEEDA', color: '#854F0B' },
  Pro:        { bg: '#E1F5EE', color: '#0F6E56' },
  Enterprise: { bg: '#EEEDFE', color: '#534AB7' },
};

const AVATAR_PALETTE = [
  { bg: '#EEEDFE', color: '#3C3489' }, { bg: '#E1F5EE', color: '#085041' },
  { bg: '#FAEEDA', color: '#633806' }, { bg: '#E6F1FB', color: '#185FA5' },
  { bg: '#FCEBEB', color: '#A32D2D' }, { bg: '#F0F4FF', color: '#3B5BDB' },
];
const avatarColor = (name = '') => AVATAR_PALETTE[(name.charCodeAt(0) || 0) % AVATAR_PALETTE.length];
const isRootPath = (path) => ['/admin', '/school', '/teacher', '/student'].includes(path);
const isActive = (itemPath, currentPath) =>
  isRootPath(itemPath) ? currentPath === itemPath : currentPath.startsWith(itemPath);

// ─── Floating tooltip ──────────────────────────────────────────────────────────
const Tooltip = ({ label, anchorEl }) => {
  const [pos, setPos] = useState(null);
  useEffect(() => {
    if (anchorEl) {
      const r = anchorEl.getBoundingClientRect();
      setPos({ top: r.top + r.height / 2 });
    }
  }, [anchorEl]);

  if (!pos) return null;
  return (
    <div style={{
      position: 'fixed', left: '64px', top: pos.top,
      transform: 'translateY(-50%)',
      background: T.text1, color: '#fff',
      fontSize: '11px', fontWeight: '500', padding: '4px 10px',
      borderRadius: '5px', whiteSpace: 'nowrap',
      zIndex: 9999, pointerEvents: 'none',
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
    }}>
      {label}
      <span style={{
        position: 'absolute', left: '-4px', top: '50%', transform: 'translateY(-50%)',
        borderTop: '4px solid transparent', borderBottom: '4px solid transparent',
        borderRight: `4px solid ${T.text1}`, width: 0, height: 0, display: 'block',
      }} />
    </div>
  );
};

// ─── Single sidebar nav icon ───────────────────────────────────────────────────
const NavIcon = ({ item, currentPath, badgeCount = 0 }) => {
  const [hoverEl, setHoverEl] = useState(null);
  const Icon = item.icon;
  const active = isActive(item.path, currentPath);

  return (
    <>
      <NavLink
        to={item.path}
        onMouseEnter={e => setHoverEl(e.currentTarget)}
        onMouseLeave={() => setHoverEl(null)}
        style={({ isActive: _ }) => ({
          position: 'relative',
          width: '38px', height: '36px', borderRadius: '8px',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: '2px',
          textDecoration: 'none', cursor: 'pointer',
          transition: 'background 0.12s, box-shadow 0.12s',
          background: active ? T.indigoBg : 'transparent',
          boxShadow: active ? `inset 2px 0 0 0 ${T.indigo}` : 'none',
        })}
        onMouseEnterCapture={e => {
          if (!active) e.currentTarget.style.background = '#e0ddd6';
        }}
        onMouseLeaveCapture={e => {
          if (!active) e.currentTarget.style.background = 'transparent';
        }}
      >
        <Icon size={15} style={{
          color: active ? T.indigo : T.text3,
          strokeWidth: active ? 2.2 : 1.8,
        }} />
        <span style={{
          fontSize: '7px', fontFamily: 'JetBrains Mono, monospace',
          fontWeight: active ? '600' : '400',
          color: active ? T.indigo : T.text3,
          letterSpacing: '0.02em', lineHeight: 1,
        }}>
          {item.label.split(' ')[0].toLowerCase().slice(0, 5)}
        </span>
        {badgeCount > 0 && (
          <span style={{
            position: 'absolute', top: '3px', right: '3px',
            minWidth: '13px', height: '13px', borderRadius: '999px',
            background: T.red, color: '#fff',
            fontSize: '7px', fontWeight: '700',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 2px', border: `1.5px solid ${T.sidebar}`,
          }}>
            {badgeCount > 9 ? '9+' : badgeCount}
          </span>
        )}
      </NavLink>
      {hoverEl && !active && <Tooltip label={item.label} anchorEl={hoverEl} />}
    </>
  );
};

// ─── Collapsed desktop sidebar (56px) ─────────────────────────────────────────
const Sidebar = ({ groups, currentPath, profile, displayName, onLogout, badges }) => {
  const navigate = useNavigate();
  const role = profile?.role || '';
  const ac = avatarColor(displayName);
  const initials = displayName.slice(0, 2).toUpperCase();
  const profileBase = role === 'super_admin' ? 'admin' : role === 'school_admin' ? 'school' : role;

  return (
    <aside style={{
      width: '56px', flexShrink: 0,
      background: T.sidebar, borderRight: `0.5px solid ${T.border}`,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '10px 0',
      position: 'sticky', top: 0, height: '100vh', zIndex: 40,
    }}>
      {/* Logo */}
      <div
        onClick={() => navigate('/')}
        title="ZiDu"
        style={{
          width: '30px', height: '30px', borderRadius: '8px',
          background: T.indigo, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: '800', fontSize: '14px', letterSpacing: '-0.5px',
          fontFamily: 'Sora, sans-serif',
          cursor: 'pointer', marginBottom: '12px', flexShrink: 0,
        }}
      >Z</div>

      {/* Nav */}
      <nav style={{
        flex: 1, width: '100%',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: '2px', padding: '0 9px',
        overflowY: 'auto', scrollbarWidth: 'none',
      }}>
        {groups.map((group, gi) => (
          <React.Fragment key={gi}>
            {gi > 0 && (
              <div style={{
                width: '20px', height: '0.5px',
                background: T.border2, margin: '5px 0', flexShrink: 0,
              }} />
            )}
            {group.items.map((item, ii) => (
              <NavIcon
                key={ii}
                item={item}
                currentPath={currentPath}
                badgeCount={item.badgeKey ? (badges[item.badgeKey] || 0) : 0}
              />
            ))}
          </React.Fragment>
        ))}
      </nav>

      {/* User avatar → profile */}
      <div style={{ paddingBottom: '4px', flexShrink: 0 }}>
        <div
          onClick={() => navigate(`/${profileBase}/profile`)}
          title={displayName}
          style={{
            width: '30px', height: '30px', borderRadius: '50%',
            background: ac.bg, color: ac.color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: '700', fontSize: '10px',
            border: `1.5px solid ${T.border2}`,
            cursor: 'pointer', transition: 'opacity 0.12s',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >{initials}</div>
      </div>
    </aside>
  );
};

// ─── Mobile drawer sidebar (full labels) ──────────────────────────────────────
const DrawerSidebar = ({ groups, currentPath, profile, displayName, onClose, onLogout, badges }) => {
  const navigate = useNavigate();
  const role = profile?.role || '';
  const ac = avatarColor(displayName);
  const initials = displayName.slice(0, 2).toUpperCase();
  const profileBase = role === 'super_admin' ? 'admin' : role === 'school_admin' ? 'school' : role;

  return (
    <div style={{
      width: '220px', height: '100%',
      background: T.sidebar, borderRight: `0.5px solid ${T.border}`,
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        height: '52px', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 14px', borderBottom: `0.5px solid ${T.border}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '26px', height: '26px', borderRadius: '7px',
            background: T.indigo, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Sora, sans-serif', fontWeight: '800', fontSize: '13px',
          }}>Z</div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '700', color: T.text1, fontFamily: 'Sora, sans-serif', lineHeight: 1.1 }}>ZiDu</div>
            <div style={{ fontSize: '9px', color: T.indigo, fontWeight: '600', letterSpacing: '0.04em' }}>{ROLE_LABEL[role] || ''}</div>
          </div>
        </div>
        <button onClick={onClose} style={{
          width: '26px', height: '26px', borderRadius: '5px',
          border: `0.5px solid ${T.border}`, background: 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: T.text3,
        }}><X size={13} /></button>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '10px 8px', scrollbarWidth: 'none' }}>
        {groups.map((group, gi) => (
          <div key={gi} style={{ marginBottom: '14px' }}>
            <div style={{
              fontSize: '9px', fontFamily: 'JetBrains Mono, monospace',
              fontWeight: '600', color: T.text3,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              padding: '0 8px', marginBottom: '4px',
            }}>{group.group}</div>
            {group.items.map((item, ii) => {
              const Icon = item.icon;
              const active = isActive(item.path, currentPath);
              const badge = item.badgeKey ? (badges[item.badgeKey] || 0) : 0;
              return (
                <NavLink
                  key={ii}
                  to={item.path}
                  onClick={onClose}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '9px',
                    padding: '7px 8px', borderRadius: '7px',
                    textDecoration: 'none', marginBottom: '1px',
                    background: active ? T.indigoBg : 'transparent',
                    boxShadow: active ? `inset 2px 0 0 0 ${T.indigo}` : 'none',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#e0ddd6'; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                >
                  <Icon size={14} style={{ color: active ? T.indigo : T.text3, flexShrink: 0 }} />
                  <span style={{
                    flex: 1, fontSize: '12px',
                    fontWeight: active ? '600' : '400',
                    color: active ? T.indigo : T.text2,
                  }}>{item.label}</span>
                  {badge > 0 && (
                    <span style={{
                      background: T.red, color: '#fff', fontSize: '8px',
                      fontWeight: '700', padding: '1px 5px', borderRadius: '999px',
                    }}>{badge > 9 ? '9+' : badge}</span>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User + logout */}
      <div style={{ padding: '10px', borderTop: `0.5px solid ${T.border}`, flexShrink: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '7px 8px', borderRadius: '7px',
          background: T.surface2, border: `0.5px solid ${T.border}`,
          marginBottom: '4px', cursor: 'pointer',
        }}
          onClick={() => { navigate(`/${profileBase}/profile`); onClose(); }}
        >
          <div style={{
            width: '26px', height: '26px', borderRadius: '50%',
            background: ac.bg, color: ac.color, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: '700', fontSize: '9px',
          }}>{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '11px', fontWeight: '600', color: T.text1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</div>
            <div style={{ fontSize: '9px', color: T.text3, fontFamily: 'JetBrains Mono, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile?.email || ''}</div>
          </div>
        </div>
        <button onClick={onLogout} style={{
          display: 'flex', alignItems: 'center', gap: '7px',
          width: '100%', padding: '7px 8px',
          border: 'none', background: 'transparent', borderRadius: '7px',
          cursor: 'pointer', fontSize: '12px', fontWeight: '500', color: T.red,
          transition: 'background 0.12s',
        }}
          onMouseEnter={e => e.currentTarget.style.background = '#FCEBEB'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <LogOut size={13} /> Keluar Aplikasi
        </button>
      </div>
    </div>
  );
};

// ─── Topbar ────────────────────────────────────────────────────────────────────
const Topbar = ({ schoolName, currentPageName, profile, displayName, isMobile, onMenuOpen, notifications, unreadCount, nLoading, onMarkRead, onMarkAllRead, onDeleteNotif }) => {
  const navigate = useNavigate();
  const role = profile?.role || '';
  const ac = avatarColor(displayName);
  const initials = displayName.slice(0, 2).toUpperCase();
  const planLabel = profile?.schools?.plan_name || profile?.plan || 'Starter';
  const planStyle = PLAN_STYLE[planLabel] || PLAN_STYLE.Starter;
  const profileBase = role === 'super_admin' ? 'admin' : role === 'school_admin' ? 'school' : role;

  const C = {
    border: T.border, bg: T.surface2,
    brand: T.indigo, brandBg: T.indigoBg, brandText: T.text1,
  };

  return (
    <header style={{
      height: '52px', flexShrink: 0,
      background: T.surface, borderBottom: `0.5px solid ${T.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: isMobile ? '0 12px' : '0 24px',
      position: 'sticky', top: 0, zIndex: 30,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {isMobile && (
          <button onClick={onMenuOpen} style={{
            width: '32px', height: '32px', borderRadius: '7px',
            border: `0.5px solid ${T.border}`, background: 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: T.text3,
          }}><Menu size={15} /></button>
        )}
        <div>
          <div style={{
            fontSize: isMobile ? '13px' : '15px', fontWeight: '500',
            color: T.text1, fontFamily: 'Sora, sans-serif',
            lineHeight: 1.15, display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            {schoolName}
            {planLabel && !isMobile && (
              <span style={{
                fontSize: '9px', padding: '2px 7px', borderRadius: '4px',
                fontWeight: '600', fontFamily: 'JetBrains Mono, monospace',
                letterSpacing: '0.04em',
                background: planStyle.bg, color: planStyle.color,
              }}>{planLabel}</span>
            )}
          </div>
          <div style={{
            fontSize: '9px', color: T.text3,
            fontFamily: 'JetBrains Mono, monospace',
            letterSpacing: '0.05em', textTransform: 'uppercase', lineHeight: 1,
            display: 'flex', alignItems: 'center', gap: '4px',
          }}>
            <span>{ROLE_LABEL[role] || 'Pengguna'}</span>
            {!isMobile && (
              <><ChevronRight size={9} /><span style={{ color: T.text2 }}>{currentPageName}</span></>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '6px' : '8px' }}>
        <NotificationBell
          notifications={notifications} unreadCount={unreadCount}
          loading={nLoading} onMarkRead={onMarkRead}
          onMarkAllRead={onMarkAllRead} onDelete={onDeleteNotif}
          C={C}
        />
        {!isMobile && <div style={{ width: '0.5px', height: '20px', background: T.border }} />}
        <div
          onClick={() => navigate(`/${profileBase}/profile`)}
          title="Profil saya"
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '4px 6px', borderRadius: '7px',
            cursor: 'pointer', transition: 'background 0.12s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = T.surface2}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          {!isMobile && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: T.text1, lineHeight: 1.2 }}>{displayName}</div>
              <div style={{ fontSize: '9px', color: T.text3, fontFamily: 'JetBrains Mono, monospace' }}>{ROLE_LABEL[role]}</div>
            </div>
          )}
          {profile?.avatar_url
            ? <img src={profile.avatar_url} alt="avatar" style={{
                width: '30px', height: '30px', borderRadius: '50%',
                objectFit: 'cover', border: `1.5px solid ${T.border}`,
              }} />
            : <div style={{
                width: '30px', height: '30px', borderRadius: '50%',
                background: ac.bg, color: ac.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: '700', fontSize: '10px',
                border: `1.5px solid ${T.border}`,
              }}>{initials}</div>
          }
        </div>
      </div>
    </header>
  );
};

// ─── Root Layout ───────────────────────────────────────────────────────────────
const DashboardLayout = () => {
  const { profile, signOut } = useAuth();
  const { notifications, unreadCount, loading: nLoading, markRead, markAllRead, deleteNotif } = useNotifications(profile?.id, profile?.role);
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 1024 : false
  );

  useEffect(() => {
    const handle = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth >= 1024) setDrawerOpen(false);
    };
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, []);

  useEffect(() => { setDrawerOpen(false); }, [location.pathname]);

  const handleLogout = async () => { await signOut(); navigate('/login'); };

  const role = profile?.role || '';
  const groups = MENUS[role] || [];
  const displayName = profile?.full_name || profile?.name || 'Pengguna';
  const schoolName = role === 'super_admin' ? 'ZiDu HQ' : (profile?.schools?.name || profile?.school_name || 'Ruang Simulasi');
  const currentPageName = PAGE_NAMES[location.pathname] || 'Halaman';

  // TODO: wire up real pending counts from Supabase per key
  const badges = { approvals: 0 };

  const sharedProps = { groups, currentPath: location.pathname, profile, displayName, onLogout: handleLogout, badges };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=DM+Sans:opsz,wght@9..40,400;450;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        body { margin: 0; background: ${T.bg}; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        @keyframes zidu-fade-up {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes zidu-slide-in {
          from { transform: translateX(-100%); }
          to   { transform: translateX(0); }
        }
        .zidu-main   { animation: zidu-fade-up 0.22s ease both; }
        .zidu-drawer { animation: zidu-slide-in 0.2s cubic-bezier(0.16,1,0.3,1) both; }
      `}</style>

      <div style={{
        display: 'flex', minHeight: '100vh', background: T.bg,
        fontFamily: 'DM Sans, sans-serif',
        WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale',
      }}>
        {/* Mobile backdrop */}
        {isMobile && drawerOpen && (
          <div
            onClick={() => setDrawerOpen(false)}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(2px)',
              zIndex: 50,
            }}
          />
        )}

        {/* Desktop sidebar / Mobile drawer */}
        {!isMobile
          ? <Sidebar {...sharedProps} />
          : drawerOpen
            ? (
              <aside className="zidu-drawer" style={{
                position: 'fixed', top: 0, left: 0, bottom: 0,
                width: '220px', zIndex: 60,
              }}>
                <DrawerSidebar {...sharedProps} onClose={() => setDrawerOpen(false)} />
              </aside>
            )
            : null
        }

        {/* Main */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
          <Topbar
            schoolName={schoolName}
            currentPageName={currentPageName}
            profile={profile}
            displayName={displayName}
            isMobile={isMobile}
            onMenuOpen={() => setDrawerOpen(true)}
            notifications={notifications}
            unreadCount={unreadCount}
            nLoading={nLoading}
            onMarkRead={markRead}
            onMarkAllRead={markAllRead}
            onDeleteNotif={deleteNotif}
          />
          <main className="zidu-main" style={{
            flex: 1, overflowY: 'auto', background: T.bg,
            padding: isMobile ? '18px 14px' : '24px 28px',
          }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </>
  );
};

export default DashboardLayout;
