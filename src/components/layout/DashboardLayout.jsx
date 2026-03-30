import React, { useState, useEffect } from 'react';
import { useNotifications } from '../../hooks/useNotifications';
import NotificationBell from '../notifications/NotificationBell';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  LogOut,
  School,
  FileText,
  Award,
  Menu,
  X,
  Layers,
  UserCircle,
  ClipboardCheck,
  BarChart2,
  Megaphone,
  RotateCcw,
  ClipboardList,
  NotebookPen,
  Globe,
} from 'lucide-react';

// ─── Menu config per role, dengan grouping ────────────────────────────────────
const MENUS = {
  super_admin: [
    {
      group: 'Utama',
      items: [
        { label: 'Overview',        icon: LayoutDashboard, path: '/admin' },
        { label: 'Sekolah',         icon: School,          path: '/admin/schools' },
        { label: 'Analitik Global', icon: Globe,           path: '/admin/analytics' },
      ],
    },
    {
      group: 'Akun',
      items: [
        { label: 'Profil Saya', icon: UserCircle, path: '/admin/profile' },
      ],
    },
  ],
  school_admin: [
    {
      group: 'Utama',
      items: [
        { label: 'Dashboard',  icon: LayoutDashboard, path: '/school' },
        { label: 'Pengumuman', icon: Megaphone,       path: '/school/announcements' },
      ],
    },
    {
      group: 'Manajemen',
      items: [
        { label: 'Guru & Murid',      icon: Users,          path: '/school/staff' },
        { label: 'Kelas',             icon: Layers,         path: '/school/classes' },
        { label: 'Mata Pelajaran',    icon: BookOpen,       path: '/school/subjects' },
        { label: 'Persetujuan Siswa', icon: ClipboardCheck, path: '/school/approvals' },
      ],
    },
    {
      group: 'Akademik',
      items: [
        { label: 'Rapor Siswa', icon: NotebookPen, path: '/school/report-card' },
      ],
    },
    {
      group: 'Akun',
      items: [
        { label: 'Profil Saya', icon: UserCircle, path: '/school/profile' },
      ],
    },
  ],
  teacher: [
    {
      group: 'Utama',
      items: [
        { label: 'Beranda',    icon: LayoutDashboard, path: '/teacher' },
        { label: 'Pengumuman', icon: Megaphone,       path: '/teacher/announcements' },
      ],
    },
    {
      group: 'Ujian',
      items: [
        { label: 'Bank Soal',    icon: BookOpen,  path: '/teacher/questions' },
        { label: 'Kelola Ujian', icon: FileText,  path: '/teacher/exams' },
        { label: 'Remedial',     icon: RotateCcw, path: '/teacher/remedial' },
      ],
    },
    {
      group: 'Akademik',
      items: [
        { label: 'Rekap Nilai',   icon: Award,         path: '/teacher/grades' },
        { label: 'Laporan Nilai', icon: NotebookPen,   path: '/teacher/report-card' },
        { label: 'Analitik',      icon: BarChart2,     path: '/teacher/analytics' },
        { label: 'AB Testing',    icon: BarChart2,     path: '/teacher/ab-testing' },
        { label: 'Absensi',       icon: ClipboardList, path: '/teacher/attendance' },
      ],
    },
    {
      group: 'Akun',
      items: [
        { label: 'Kelas Saya',  icon: Layers,     path: '/teacher/classes' },
        { label: 'Profil Saya', icon: UserCircle, path: '/teacher/profile' },
      ],
    },
  ],
  student: [
    {
      group: 'Belajar',
      items: [
        { label: 'Ujian Saya',    icon: FileText,  path: '/student' },
        { label: 'Riwayat Nilai', icon: Award,     path: '/student/results' },
        { label: 'Kelas Saya',    icon: Layers,    path: '/student/class' },
        { label: 'Pengumuman',    icon: Megaphone, path: '/student/announcements' },
      ],
    },
    {
      group: 'Akun',
      items: [
        { label: 'Profil Saya', icon: UserCircle, path: '/student/profile' },
      ],
    },
  ],
};

// ─── Role display config ──────────────────────────────────────────────────────
const ROLE_META = {
  super_admin:  { label: 'Super Admin',   color: '#7C3AED', bg: '#F5F3FF', accent: '#8B5CF6' },
  school_admin: { label: 'Admin Sekolah', color: '#0284C7', bg: '#F0F9FF', accent: '#0EA5E9' },
  teacher:      { label: 'Guru',          color: '#059669', bg: '#ECFDF5', accent: '#10B981' },
  student:      { label: 'Siswa',         color: '#D97706', bg: '#FFFBEB', accent: '#F59E0B' },
};

// ─── Breadcrumb map ───────────────────────────────────────────────────────────
const PAGE_NAMES = {
  '/admin':                 'Overview',
  '/admin/schools':         'Manajemen Sekolah',
  '/admin/analytics':       'Analitik Global',
  '/admin/profile':         'Profil Saya',
  '/school':                'Dashboard',
  '/school/staff':          'Guru & Murid',
  '/school/classes':        'Manajemen Kelas',
  '/school/subjects':       'Mata Pelajaran',
  '/school/approvals':      'Persetujuan Siswa',
  '/school/announcements':  'Pengumuman',
  '/school/profile':        'Profil Saya',
  '/teacher':               'Beranda',
  '/teacher/questions':     'Bank Soal',
  '/teacher/exams':         'Kelola Ujian',
  '/teacher/grades':        'Rekap Nilai',
  '/teacher/analytics':     'Analitik',
  '/teacher/ab-testing':    'AB Testing',
  '/teacher/remedial':      'Remedial',
  '/teacher/announcements': 'Pengumuman',
  '/teacher/attendance':    'Absensi',
  '/teacher/report-card':   'Laporan Nilai',
  '/school/report-card':    'Rapor Siswa',
  '/teacher/classes':       'Kelas Saya',
  '/teacher/profile':       'Profil Saya',
  '/student':               'Ujian Saya',
  '/student/results':       'Riwayat Nilai',
  '/student/class':         'Kelas Saya',
  '/student/announcements': 'Pengumuman',
  '/student/profile':       'Profil Saya',
};

// ─── NavItem ──────────────────────────────────────────────────────────────────
const NavItem = ({ item, active, accent }) => {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.path}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '8px 10px',
        borderRadius: '8px',
        textDecoration: 'none',
        fontSize: '13.5px',
        fontWeight: active ? '600' : '450',
        color: active ? accent : '#64748B',
        background: active ? `${accent}18` : 'transparent',
        transition: 'all 0.15s ease',
        position: 'relative',
      }}
      onMouseEnter={e => {
        if (!active) {
          e.currentTarget.style.background = '#F8FAFC';
          e.currentTarget.style.color = '#1E293B';
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = '#64748B';
        }
      }}
    >
      {active && (
        <span style={{
          position: 'absolute',
          left: 0, top: '50%',
          transform: 'translateY(-50%)',
          width: '3px', height: '18px',
          borderRadius: '0 3px 3px 0',
          background: accent,
        }} />
      )}
      <Icon size={16} style={{ color: active ? accent : '#94A3B8', flexShrink: 0 }} />
      <span style={{ flex: 1, lineHeight: 1.3 }}>{item.label}</span>
    </NavLink>
  );
};

// ─── SidebarContent ───────────────────────────────────────────────────────────
const SidebarContent = ({ groups, role, profile, displayName, initials, onClose, onLogout, isMobile, currentPath }) => {
  const meta = ROLE_META[role] || ROLE_META.student;
  const navigate = useNavigate();

  const isActive = (path) => {
    const roots = ['/admin', '/school', '/teacher', '/student'];
    if (roots.includes(path)) return currentPath === path;
    return currentPath.startsWith(path);
  };

  const profilePath = `/${role === 'super_admin' ? 'admin' : role === 'school_admin' ? 'school' : role}/profile`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* ── Header / Logo ── */}
      <div style={{
        padding: '0 16px',
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #F1F5F9',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px', height: '32px',
            borderRadius: '9px',
            background: meta.color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: '800',
            color: '#fff',
            fontSize: '15px',
            letterSpacing: '-0.5px',
            fontFamily: "'Sora', sans-serif",
            flexShrink: 0,
          }}>Z</div>
          <div>
            <div style={{
              fontFamily: "'Sora', sans-serif",
              fontWeight: '700',
              fontSize: '15px',
              color: '#0F172A',
              lineHeight: 1.1,
            }}>ZiDu</div>
            <div style={{
              fontSize: '10px',
              fontWeight: '600',
              color: meta.color,
              letterSpacing: '0.05em',
              lineHeight: 1,
              marginTop: '2px',
            }}>{meta.label}</div>
          </div>
        </div>
        {isMobile && (
          <button onClick={onClose} style={{
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '7px',
            width: '30px', height: '30px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#94A3B8',
          }}>
            <X size={15} />
          </button>
        )}
      </div>

      {/* ── Nav ── */}
      <nav style={{
        flex: 1,
        overflowY: 'auto',
        padding: '12px 10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        scrollbarWidth: 'thin',
        scrollbarColor: '#E2E8F0 transparent',
      }}>
        {groups.map((group, gi) => (
          <div key={gi}>
            <div style={{
              fontSize: '10px',
              fontWeight: '700',
              color: '#CBD5E1',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              padding: '0 10px',
              marginBottom: '4px',
            }}>
              {group.group}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
              {group.items.map((item, ii) => (
                <NavItem
                  key={ii}
                  item={item}
                  active={isActive(item.path)}
                  accent={meta.accent}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* ── User Card + Logout ── */}
      <div style={{
        padding: '10px',
        borderTop: '1px solid #F1F5F9',
        flexShrink: 0,
      }}>
        <div
          onClick={() => navigate(profilePath)}
          style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '8px 10px',
            borderRadius: '9px',
            background: '#F8FAFC',
            border: '1px solid #F1F5F9',
            marginBottom: '6px',
            cursor: 'pointer',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#F1F5F9'}
          onMouseLeave={e => e.currentTarget.style.background = '#F8FAFC'}
          title="Lihat profil"
        >
          {profile?.avatar_url
            ? <img src={profile.avatar_url} alt="avatar" style={{
                width: '32px', height: '32px', borderRadius: '50%',
                objectFit: 'cover', flexShrink: 0,
                border: `2px solid ${meta.color}30`,
              }} />
            : <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: meta.bg, color: meta.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: '700', fontSize: '13px', flexShrink: 0,
                border: `2px solid ${meta.color}30`,
              }}>{initials}</div>
          }
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: '13px', fontWeight: '600', color: '#0F172A',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              lineHeight: 1.3,
            }}>{displayName}</div>
            <div style={{
              fontSize: '11px', color: '#94A3B8',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{profile?.email || ''}</div>
          </div>
        </div>

        <button
          onClick={onLogout}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            width: '100%', padding: '8px 10px',
            borderRadius: '8px', border: 'none',
            background: 'none', cursor: 'pointer',
            fontSize: '13px', fontWeight: '500',
            color: '#EF4444',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#FEF2F2'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
        >
          <LogOut size={15} />
          Keluar Aplikasi
        </button>
      </div>
    </div>
  );
};

// ─── DashboardLayout (main) ───────────────────────────────────────────────────
const DashboardLayout = () => {
  const { profile, signOut } = useAuth();
  const { notifications, unreadCount, loading: nLoading, markRead, markAllRead, deleteNotif } = useNotifications(profile?.id, profile?.role);
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 1024 : false
  );

  useEffect(() => {
    const handle = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth >= 1024) setSidebarOpen(false);
    };
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, []);

  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  const handleLogout = async () => { await signOut(); navigate('/login'); };

  const role = profile?.role || '';
  const meta = ROLE_META[role] || ROLE_META.student;
  const groups = MENUS[role] || [];
  const displayName = profile?.full_name || profile?.name || 'User';
  const initials = displayName.charAt(0).toUpperCase();
  const schoolName = role === 'super_admin' ? 'ZiDu HQ' : (profile?.schools?.name || 'Ruang Simulasi');
  const currentPageName = PAGE_NAMES[location.pathname] || 'Halaman';

  const C = { border: '#F1F5F9', bg: '#F8FAFC' };

  const sidebarProps = {
    groups, role, profile, displayName, initials,
    onClose: () => setSidebarOpen(false),
    onLogout: handleLogout,
    isMobile,
    currentPath: location.pathname,
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=Plus+Jakarta+Sans:wght@400;450;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        body { margin: 0; }
        @keyframes fadeUp  { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes slideIn { from { transform:translateX(-100%); } to { transform:translateX(0); } }
        .main-content   { animation: fadeUp 0.25s ease both; }
        .sidebar-drawer { animation: slideIn 0.22s cubic-bezier(0.16,1,0.3,1) both; }
        nav::-webkit-scrollbar       { width: 4px; }
        nav::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 4px; }
      `}</style>

      <div style={{
        display: 'flex', minHeight: '100vh',
        background: C.bg,
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}>

        {/* Mobile backdrop */}
        {isMobile && sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(15,23,42,0.45)',
              backdropFilter: 'blur(3px)',
              zIndex: 40,
            }}
          />
        )}

        {/* ── Sidebar desktop ── */}
        {!isMobile ? (
          <aside style={{
            width: '220px', flexShrink: 0,
            background: '#FFFFFF',
            borderRight: `1px solid ${C.border}`,
            position: 'sticky', top: 0,
            height: '100vh', overflow: 'hidden',
          }}>
            <SidebarContent {...sidebarProps} />
          </aside>
        ) : sidebarOpen ? (
          <aside className="sidebar-drawer" style={{
            position: 'fixed', top: 0, left: 0, bottom: 0,
            width: '240px', background: '#FFFFFF',
            borderRight: `1px solid ${C.border}`,
            zIndex: 50,
          }}>
            <SidebarContent {...sidebarProps} />
          </aside>
        ) : null}

        {/* ── Main area ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

          {/* Topbar */}
          <header style={{
            height: '60px',
            background: '#FFFFFF',
            borderBottom: `1px solid ${C.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: isMobile ? '0 12px' : '0 20px',
            position: 'sticky', top: 0, zIndex: 30,
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {isMobile && (
                <button
                  onClick={() => setSidebarOpen(true)}
                  style={{
                    width: '34px', height: '34px',
                    borderRadius: '8px',
                    border: `1px solid ${C.border}`,
                    background: C.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: '#64748B',
                  }}
                >
                  <Menu size={17} />
                </button>
              )}
              <div>
                <div style={{
                  fontSize: '14px', fontWeight: '600', color: '#0F172A',
                  fontFamily: "'Sora', sans-serif", lineHeight: 1.2,
                  maxWidth: isMobile ? '140px' : 'none',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {schoolName}
                </div>
                <div style={{ fontSize: '11px', color: '#94A3B8', lineHeight: 1 }}>
                  {currentPageName}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '4px' : '6px' }}>
              <NotificationBell
                notifications={notifications}
                unreadCount={unreadCount}
                loading={nLoading}
                onMarkRead={markRead}
                onMarkAllRead={markAllRead}
                onDelete={deleteNotif}
                C={{ ...C, brand: meta.accent, brandBg: meta.bg, brandText: meta.color }}
              />
              {!isMobile && <div style={{ width: '1px', height: '22px', background: C.border, margin: '0 2px' }} />}
              <div
                onClick={() => {
                  const base = role === 'super_admin' ? 'admin' : role === 'school_admin' ? 'school' : role;
                  navigate(`/${base}/profile`);
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '4px 8px', borderRadius: '8px',
                  cursor: 'pointer', transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = C.bg}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                title="Profil saya"
              >
                {/* Sembunyikan nama & role di mobile agar topbar tidak sesak */}
                {!isMobile && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#0F172A', lineHeight: 1.2 }}>
                      {displayName}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94A3B8' }}>{meta.label}</div>
                  </div>
                )}
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt="avatar" style={{
                      width: '32px', height: '32px', borderRadius: '50%',
                      objectFit: 'cover',
                      border: `2px solid ${meta.color}30`,
                    }} />
                  : <div style={{
                      width: '32px', height: '32px', borderRadius: '50%',
                      background: meta.bg, color: meta.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: '700', fontSize: '13px',
                      border: `2px solid ${meta.color}30`,
                    }}>{initials}</div>
                }
              </div>
            </div>
          </header>

          {/* Page content */}
          <main
            className="main-content"
            style={{
              flex: 1,
              padding: isMobile ? '20px 16px' : '28px 32px',
              overflowY: 'auto',
              background: C.bg,
            }}
          >
            <div style={{ maxWidth: '1280px', margin: '0 auto', width: '100%' }}>
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </>
  );
};

export default DashboardLayout;