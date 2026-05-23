import React, { useState, useEffect, useRef } from 'react';
import { useNotifications } from '../../hooks/useNotifications';
import NotificationBell from '../notifications/NotificationBell';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTutorial } from '../../hooks/useTutorial';
import {
  LayoutDashboard, BookOpen, Users, LogOut, School, FileText,
  Award, Menu, X, Layers, UserCircle, ClipboardCheck, BarChart2,
  Megaphone, RotateCcw, ClipboardList, NotebookPen, Globe,
  GraduationCap, QrCode, ChevronRight, Home,
} from 'lucide-react';

// ─── Menu config per role ─────────────────────────────────────────────────────
const MENUS = {
  super_admin: [
    { group: 'Utama', items: [
      { label: 'Overview',        icon: LayoutDashboard, path: '/admin' },
      { label: 'Sekolah',         icon: School,          path: '/admin/schools' },
      { label: 'Analitik Global', icon: Globe,           path: '/admin/analytics' },
    ]},
    { group: 'Akun', items: [
      { label: 'Profil Saya', icon: UserCircle, path: '/admin/profile' },
    ]},
  ],
  school_admin: [
    { group: 'Utama', items: [
      { label: 'Dashboard',  icon: LayoutDashboard, path: '/school' },
      { label: 'Pengumuman', icon: Megaphone,       path: '/school/announcements' },
    ]},
    { group: 'Manajemen', items: [
      { label: 'Guru & Murid',      icon: Users,          path: '/school/staff' },
      { label: 'Kelas',             icon: Layers,         path: '/school/classes' },
      { label: 'Mata Pelajaran',    icon: BookOpen,       path: '/school/subjects' },
      { label: 'Persetujuan Siswa', icon: ClipboardCheck, path: '/school/approvals' },
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
      { label: 'Beranda',    icon: LayoutDashboard, path: '/teacher' },
      { label: 'Pengumuman', icon: Megaphone,       path: '/teacher/announcements' },
    ]},
    { group: 'Ujian', items: [
      { label: 'Bank Soal',    icon: BookOpen,  path: '/teacher/questions' },
      { label: 'Kelola Ujian', icon: FileText,  path: '/teacher/exams' },
      { label: 'Remedial',     icon: RotateCcw, path: '/teacher/remedial' },
    ]},
    { group: 'Akademik', items: [
      { label: 'Rekap Nilai',   icon: Award,         path: '/teacher/grades' },
      { label: 'Laporan Nilai', icon: NotebookPen,   path: '/teacher/report-card' },
      { label: 'Analitik',      icon: BarChart2,     path: '/teacher/analytics' },
      { label: 'AB Testing',    icon: BarChart2,     path: '/teacher/ab-testing' },
      { label: 'Absensi',       icon: ClipboardList, path: '/teacher/attendance' },
    ]},
    { group: 'Akun', items: [
      { label: 'Kelas Saya',  icon: Layers,     path: '/teacher/classes' },
      { label: 'Profil Saya', icon: UserCircle, path: '/teacher/profile' },
    ]},
  ],
  student: [
    { group: 'Belajar', items: [
      { label: 'Ujian Saya',    icon: FileText,      path: '/student' },
      { label: 'Riwayat Nilai', icon: Award,         path: '/student/results' },
      { label: 'Kelas Saya',    icon: Layers,        path: '/student/class' },
      { label: 'Absensi QR',    icon: QrCode,        path: '/student/attendance' },
      { label: 'Pengumuman',    icon: Megaphone,     path: '/student/announcements' },
    ]},
    { group: 'Akun', items: [
      { label: 'Profil Saya', icon: UserCircle, path: '/student/profile' },
    ]},
  ],
};

// Bottom nav per role (max 5 — paling penting)
const BOTTOM_NAV = {
  super_admin: [
    { label: 'Overview', icon: Home,          path: '/admin' },
    { label: 'Sekolah',  icon: School,        path: '/admin/schools' },
    { label: 'Analitik', icon: BarChart2,     path: '/admin/analytics' },
    { label: 'Profil',   icon: UserCircle,    path: '/admin/profile' },
  ],
  school_admin: [
    { label: 'Dashboard', icon: Home,          path: '/school' },
    { label: 'Staff',     icon: Users,         path: '/school/staff' },
    { label: 'Kelas',     icon: Layers,        path: '/school/classes' },
    { label: 'Pengumuman',icon: Megaphone,     path: '/school/announcements' },
    { label: 'Profil',    icon: UserCircle,    path: '/school/profile' },
  ],
  teacher: [
    { label: 'Beranda',  icon: Home,          path: '/teacher' },
    { label: 'Absensi',  icon: ClipboardList, path: '/teacher/attendance' },
    { label: 'Ujian',    icon: FileText,      path: '/teacher/exams' },
    { label: 'Nilai',    icon: Award,         path: '/teacher/grades' },
    { label: 'Profil',   icon: UserCircle,    path: '/teacher/profile' },
  ],
  student: [
    { label: 'Ujian',    icon: FileText,   path: '/student' },
    { label: 'Absensi',  icon: QrCode,     path: '/student/attendance' },
    { label: 'Nilai',    icon: Award,      path: '/student/results' },
    { label: 'Kelas',    icon: Layers,     path: '/student/class' },
    { label: 'Profil',   icon: UserCircle, path: '/student/profile' },
  ],
};

const ROLE_META = {
  super_admin:  { label: 'Super Admin',   color: '#7C3AED', bg: '#F5F3FF', accent: '#8B5CF6', accentBg: '#F5F3FF' },
  school_admin: { label: 'Admin Sekolah', color: '#0284C7', bg: '#F0F9FF', accent: '#0EA5E9', accentBg: '#F0F9FF' },
  teacher:      { label: 'Guru',          color: '#059669', bg: '#ECFDF5', accent: '#10B981', accentBg: '#ECFDF5' },
  student:      { label: 'Siswa',         color: '#D97706', bg: '#FFFBEB', accent: '#F59E0B', accentBg: '#FFFBEB' },
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
  '/student/attendance': 'Absensi QR', '/student/profile': 'Profil Saya',
};

// ─── DrawerMenu ───────────────────────────────────────────────────────────────
const DrawerMenu = ({ groups, role, profile, displayName, initials, onClose, onLogout, currentPath, tutorialPath, hasSeenTutorial }) => {
  const meta = ROLE_META[role] || ROLE_META.student;
  const navigate = useNavigate();
  const profilePath = `/${role === 'super_admin' ? 'admin' : role === 'school_admin' ? 'school' : role}/profile`;

  const isActive = (path) => {
    const roots = ['/admin', '/school', '/teacher', '/student'];
    if (roots.includes(path)) return currentPath === path;
    return currentPath.startsWith(path);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#fff' }}>
      {/* Drawer header */}
      <div style={{
        padding: '0 16px', height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid #F1F5F9', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: `linear-gradient(135deg, ${meta.color}, ${meta.accent})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, color: '#fff', fontSize: 16,
            fontFamily: "'Sora', sans-serif",
          }}>Z</div>
          <div>
            <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 16, color: '#0F172A', lineHeight: 1.1 }}>ZiDu</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: meta.color, letterSpacing: '0.05em' }}>{meta.label}</div>
          </div>
        </div>
        <button onClick={onClose} style={{
          width: 34, height: 34, borderRadius: 9,
          border: '1px solid #E2E8F0', background: '#F8FAFC',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: '#64748B',
        }}>
          <X size={16} />
        </button>
      </div>

      {/* User card */}
      <div
        onClick={() => { navigate(profilePath); onClose(); }}
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          margin: '14px 14px 4px', padding: '12px 14px',
          borderRadius: 12, background: meta.accentBg,
          border: `1px solid ${meta.accent}25`, cursor: 'pointer',
        }}
      >
        {profile?.avatar_url
          ? <img src={profile.avatar_url} alt="avatar" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${meta.color}30` }} />
          : <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: meta.bg, color: meta.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 15, border: `2px solid ${meta.color}30`,
            }}>{initials}</div>
        }
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</div>
          <div style={{ fontSize: 11, color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile?.email || meta.label}</div>
        </div>
        <ChevronRight size={14} color={meta.color} />
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {groups.map((group, gi) => (
          <div key={gi}>
            <div style={{
              fontSize: 10, fontWeight: 700, color: '#CBD5E1',
              letterSpacing: '0.1em', textTransform: 'uppercase',
              padding: '0 8px', marginBottom: 4,
            }}>{group.group}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <NavLink key={item.path} to={item.path} onClick={onClose} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 10px', borderRadius: 9, textDecoration: 'none',
                    fontSize: 13.5, fontWeight: active ? 600 : 450,
                    color: active ? meta.accent : '#475569',
                    background: active ? `${meta.accent}15` : 'transparent',
                    borderLeft: active ? `3px solid ${meta.accent}` : '3px solid transparent',
                    transition: 'all 0.12s',
                  }}>
                    <Icon size={16} style={{ color: active ? meta.accent : '#94A3B8', flexShrink: 0 }} />
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {active && <div style={{ width: 6, height: 6, borderRadius: '50%', background: meta.accent }} />}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}

        {/* Tutorial link */}
        {tutorialPath && (
          <div style={{ marginTop: 4 }}>
            <NavLink to={tutorialPath} onClick={onClose} style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 10px', borderRadius: 9, textDecoration: 'none',
              fontSize: 13.5, fontWeight: 500,
              color: isActive ? meta.accent : '#64748B',
              background: isActive ? `${meta.accent}15` : '#F8FAFC',
              border: `1px solid ${!hasSeenTutorial ? meta.accent + '40' : '#F1F5F9'}`,
            })}>
              <GraduationCap size={16} style={{ color: meta.accent, flexShrink: 0 }} />
              <span style={{ flex: 1 }}>Panduan Penggunaan</span>
              {!hasSeenTutorial && (
                <span style={{
                  fontSize: 9, fontWeight: 700, padding: '2px 5px',
                  borderRadius: 4, background: meta.accent, color: '#fff',
                }}>BARU</span>
              )}
            </NavLink>
          </div>
        )}
      </nav>

      {/* Logout */}
      <div style={{ padding: '10px 10px 20px', borderTop: '1px solid #F1F5F9', flexShrink: 0 }}>
        <button onClick={onLogout} style={{
          display: 'flex', alignItems: 'center', gap: 10, width: '100%',
          padding: '10px 12px', borderRadius: 9, border: '1px solid #FEE2E2',
          background: '#FFF5F5', cursor: 'pointer',
          fontSize: 13.5, fontWeight: 600, color: '#EF4444',
        }}>
          <LogOut size={16} />
          Keluar Aplikasi
        </button>
      </div>
    </div>
  );
};

// ─── DashboardLayout ──────────────────────────────────────────────────────────
const DashboardLayout = () => {
  const { profile, signOut } = useAuth();
  const { notifications, unreadCount, loading: nLoading, markRead, markAllRead, deleteNotif } = useNotifications(profile?.id, profile?.role);
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => { setDrawerOpen(false); }, [location.pathname]);

  // Tutup drawer saat klik backdrop
  const handleLogout = async () => { await signOut(); navigate('/login'); };

  const role = profile?.role || '';
  const meta = ROLE_META[role] || ROLE_META.student;
  const groups = MENUS[role] || [];
  const bottomNav = BOTTOM_NAV[role] || [];
  const displayName = profile?.full_name || profile?.name || 'User';
  const initials = displayName.charAt(0).toUpperCase();
  const schoolName = role === 'super_admin' ? 'ZiDu HQ' : (profile?.schools?.name || 'Ruang Simulasi');
  const currentPageName = PAGE_NAMES[location.pathname] || 'Halaman';

  const TUTORIAL_PATHS = {
    super_admin: '/admin/tutorial', school_admin: '/school/tutorial',
    teacher: '/teacher/tutorial',  student: '/student/tutorial',
  };
  const tutorialPath = TUTORIAL_PATHS[role] || null;
  const { hasSeenTutorial } = useTutorial(profile?.id);

  const isBottomActive = (path) => {
    const roots = ['/admin', '/school', '/teacher', '/student'];
    if (roots.includes(path)) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  const C = { border: '#F1F5F9', bg: '#F7F8FA' };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=Plus+Jakarta+Sans:wght@400;450;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        body { margin: 0; }
        @keyframes fadeUp   { from { opacity:0; transform:translateY(8px);   } to { opacity:1; transform:none; } }
        @keyframes slideIn  { from { transform:translateX(-100%); opacity:0; } to { transform:none; opacity:1; } }
        @keyframes fadeIn   { from { opacity:0; } to { opacity:1; } }
        .main-content { animation: fadeUp 0.22s ease both; }
        .drawer-panel { animation: slideIn 0.22s cubic-bezier(0.16,1,0.3,1) both; }
        .backdrop     { animation: fadeIn 0.18s ease both; }
        nav::-webkit-scrollbar       { width: 4px; }
        nav::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 4px; }
        .bottom-nav-item:active { transform: scale(0.92); }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: C.bg, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

        {/* ── Backdrop ── */}
        {drawerOpen && (
          <div
            className="backdrop"
            onClick={() => setDrawerOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)', zIndex: 40 }}
          />
        )}

        {/* ── Hamburger Drawer ── */}
        {drawerOpen && (
          <aside className="drawer-panel" style={{
            position: 'fixed', top: 0, left: 0, bottom: 0,
            width: 272, zIndex: 50,
            boxShadow: '4px 0 32px rgba(0,0,0,.12)',
          }}>
            <DrawerMenu
              groups={groups} role={role} profile={profile}
              displayName={displayName} initials={initials}
              onClose={() => setDrawerOpen(false)}
              onLogout={handleLogout}
              currentPath={location.pathname}
              tutorialPath={tutorialPath}
              hasSeenTutorial={hasSeenTutorial}
            />
          </aside>
        )}

        {/* ── Header (sticky top) ── */}
        <header style={{
          height: 60, background: '#FFFFFF',
          borderBottom: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'center',
          padding: '0 14px',
          position: 'sticky', top: 0, zIndex: 30, flexShrink: 0,
          boxShadow: '0 1px 0 #F1F5F9',
        }}>
          {/* Left: Hamburger + Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
            <button
              onClick={() => setDrawerOpen(true)}
              style={{
                width: 36, height: 36, borderRadius: 10,
                border: `1.5px solid ${C.border}`, background: C.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#475569', flexShrink: 0,
                transition: 'all 0.12s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#EEF2FF'; e.currentTarget.style.color = meta.accent; }}
              onMouseLeave={e => { e.currentTarget.style.background = C.bg; e.currentTarget.style.color = '#475569'; }}
            >
              <Menu size={18} />
            </button>

            {/* Logo + Page info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <div style={{
                width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                background: `linear-gradient(135deg, ${meta.color}, ${meta.accent})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, color: '#fff', fontSize: 14,
                fontFamily: "'Sora', sans-serif",
              }}>Z</div>
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontFamily: "'Sora', sans-serif", fontSize: 13, fontWeight: 700,
                  color: '#0F172A', lineHeight: 1.2,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  maxWidth: 160,
                }}>{schoolName}</div>
                <div style={{ fontSize: 10.5, color: '#94A3B8', lineHeight: 1, fontWeight: 500 }}>{currentPageName}</div>
              </div>
            </div>
          </div>

          {/* Right: Notif + Avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <NotificationBell
              notifications={notifications} unreadCount={unreadCount}
              loading={nLoading} onMarkRead={markRead}
              onMarkAllRead={markAllRead} onDelete={deleteNotif}
              C={{ ...C, brand: meta.accent, brandBg: meta.bg, brandText: meta.color }}
            />
            <div style={{ width: 1, height: 20, background: C.border, margin: '0 2px' }} />
            <div
              onClick={() => {
                const base = role === 'super_admin' ? 'admin' : role === 'school_admin' ? 'school' : role;
                navigate(`/${base}/profile`);
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '4px 8px', borderRadius: 9,
                cursor: 'pointer', transition: 'background 0.12s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = C.bg}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ textAlign: 'right', display: 'none' }} className="hidden-mobile">
                <div style={{ fontSize: 12, fontWeight: 600, color: '#0F172A' }}>{displayName}</div>
                <div style={{ fontSize: 10, color: '#94A3B8' }}>{meta.label}</div>
              </div>
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="avatar" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', border: `2.5px solid ${meta.color}35` }} />
                : <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: meta.bg, color: meta.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: 13,
                    border: `2.5px solid ${meta.color}35`,
                  }}>{initials}</div>
              }
            </div>
          </div>
        </header>

        {/* ── Main content ── */}
        <main
          className="main-content"
          style={{
            flex: 1,
            padding: '20px 16px',
            overflowY: 'auto',
            paddingBottom: 80, // space for bottom nav
          }}
        >
          <div style={{ maxWidth: 720, margin: '0 auto', width: '100%' }}>
            {/* First-login tutorial banner */}
            {!hasSeenTutorial && tutorialPath && location.pathname !== tutorialPath && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '11px 14px', borderRadius: 12, marginBottom: 18,
                background: meta.accentBg,
                border: `1px solid ${meta.accent}35`,
              }}>
                <GraduationCap size={17} style={{ color: meta.accent, flexShrink: 0 }} />
                <div style={{ flex: 1, fontSize: 12.5, color: '#475569' }}>
                  <span style={{ fontWeight: 700, color: '#0F172A' }}>Baru pertama kali? </span>
                  Lihat panduan untuk mulai dengan cepat.
                </div>
                <NavLink to={tutorialPath} style={{
                  padding: '5px 12px', borderRadius: 8, textDecoration: 'none',
                  background: meta.accent, color: '#fff',
                  fontSize: 11.5, fontWeight: 700, flexShrink: 0,
                }}>Lihat</NavLink>
              </div>
            )}
            <Outlet />
          </div>
        </main>

        {/* ── Bottom Nav (sticky footer) ── */}
        {bottomNav.length > 0 && (
          <nav style={{
            position: 'fixed', bottom: 0, left: 0, right: 0,
            height: 62, background: '#FFFFFF',
            borderTop: `1.5px solid ${C.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-around',
            zIndex: 30, paddingBottom: 'env(safe-area-inset-bottom)',
            boxShadow: '0 -4px 20px rgba(0,0,0,.06)',
          }}>
            {bottomNav.map((item) => {
              const Icon = item.icon;
              const active = isBottomActive(item.path);
              return (
                <button
                  key={item.path}
                  className="bottom-nav-item"
                  onClick={() => navigate(item.path)}
                  style={{
                    flex: 1, height: '100%',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    gap: 3, border: 'none', background: 'none', cursor: 'pointer',
                    color: active ? meta.accent : '#94A3B8',
                    transition: 'color 0.15s',
                    position: 'relative',
                  }}
                >
                  {active && (
                    <div style={{
                      position: 'absolute', top: 0, left: '50%',
                      transform: 'translateX(-50%)',
                      width: 28, height: 3, borderRadius: '0 0 4px 4px',
                      background: meta.accent,
                    }} />
                  )}
                  <div style={{
                    width: 36, height: 28, borderRadius: 9,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: active ? `${meta.accent}18` : 'transparent',
                    transition: 'background 0.15s',
                  }}>
                    <Icon size={18} strokeWidth={active ? 2.5 : 1.8} />
                  </div>
                  <span style={{ fontSize: 10, fontWeight: active ? 700 : 500, lineHeight: 1 }}>{item.label}</span>
                </button>
              );
            })}
          </nav>
        )}
      </div>
    </>
  );
};

export default DashboardLayout;
