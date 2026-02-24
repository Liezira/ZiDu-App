import React, { useState, useEffect } from 'react';
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
  Bell,
  X,
  ChevronRight,
  Layers,
  UserCircle,
  ClipboardCheck,
} from 'lucide-react';

const DashboardLayout = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handle = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth >= 1024) setSidebarOpen(false);
    };
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, []);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const getMenus = () => {
    switch (profile?.role) {
      case 'super_admin':
        return [
          { label: 'Overview', icon: LayoutDashboard, path: '/admin' },
          { label: 'Manajemen Sekolah', icon: School, path: '/admin/schools' },
          {
            label: 'Analitik Global',
            icon: FileText,
            path: '/admin/analytics',
          },
          { label: 'Profil Saya', icon: UserCircle, path: '/admin/profile' },
        ];
      case 'school_admin':
        return [
          { label: 'Dashboard', icon: LayoutDashboard, path: '/school' },
          { label: 'Data Guru & Murid', icon: Users,     path: '/school/staff' },
          { label: 'Manajemen Kelas',   icon: Layers,    path: '/school/classes' },
          { label: 'Mata Pelajaran', icon: BookOpen, path: '/school/subjects' },
          { label: 'Persetujuan Siswa', icon: ClipboardCheck, path: '/school/approvals' },
          { label: 'Profil Saya', icon: UserCircle, path: '/school/profile' },
        ];
      case 'teacher':
        return [
          { label: 'Beranda', icon: LayoutDashboard, path: '/teacher' },
          { label: 'Bank Soal', icon: BookOpen, path: '/teacher/questions' },
          { label: 'Kelola Ujian', icon: FileText, path: '/teacher/exams' },
          { label: 'Rekap Nilai', icon: Award, path: '/teacher/grades' },
          { label: 'Profil Saya', icon: UserCircle, path: '/teacher/profile' },
        ];
      case 'student':
        return [
          { label: 'Ujian Saya', icon: FileText, path: '/student' },
          { label: 'Riwayat Nilai', icon: Award, path: '/student/results' },
          { label: 'Profil Saya', icon: UserCircle, path: '/student/profile' },
        ];
      default:
        return [];
    }
  };

  const menus = getMenus();
  const role = profile?.role || '';
  const schoolName =
    role === 'super_admin'
      ? 'ZiDu HQ'
      : profile?.schools?.name || 'Ruang Simulasi';
  const displayName = profile?.full_name || profile?.name || 'User';
  const roleLabel = role
    .replace('_', ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
  const initials = displayName.charAt(0).toUpperCase();

  const isActive = (path) => {
    const rootPaths = ['/admin', '/school', '/teacher', '/student'];
    if (rootPaths.includes(path)) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  // ── Colors ──
  const C = {
    sidebar: '#ffffff',
    border: '#f1f5f9',
    bg: '#f8fafc',
    brand: '#4F46E5',
    brandBg: '#EEF2FF',
    brandText: '#4338CA',
    text: '#0f172a',
    muted: '#94a3b8',
    hover: '#f8fafc',
    active: '#EEF2FF',
    activeText: '#4338CA',
    danger: '#dc2626',
    dangerBg: '#fef2f2',
  };

  const SidebarContent = () => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Logo */}
      <div
        style={{
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          borderBottom: `1px solid ${C.border}`,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '10px',
              background: C.brand,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'Sora, sans-serif',
              fontWeight: '700',
              color: '#fff',
              fontSize: '16px',
              flexShrink: 0,
            }}
          >
            Z
          </div>
          <div>
            <div
              style={{
                fontFamily: 'Sora, sans-serif',
                fontWeight: '700',
                fontSize: '16px',
                color: C.text,
                lineHeight: 1,
              }}
            >
              ZiDu
            </div>
            <div
              style={{
                fontSize: '10px',
                color: C.muted,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                fontWeight: '600',
                marginTop: '2px',
              }}
            >
              {roleLabel}
            </div>
          </div>
        </div>
        {isMobile && (
          <button
            onClick={() => setSidebarOpen(false)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: C.muted,
              display: 'flex',
              padding: '4px',
            }}
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav
        style={{
          flex: 1,
          padding: '16px 12px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
        }}
      >
        {menus.map((menu, i) => {
          const active = isActive(menu.path);
          return (
            <NavLink
              key={i}
              to={menu.path}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '9px 12px',
                borderRadius: '10px',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: active ? '600' : '500',
                color: active ? C.activeText : '#475569',
                background: active ? C.active : 'transparent',
                position: 'relative',
                transition: 'background 0.15s, color 0.15s',
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.background = C.hover;
                  e.currentTarget.style.color = C.text;
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#475569';
                }
              }}
            >
              {active && (
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '3px',
                    height: '20px',
                    background: C.brand,
                    borderRadius: '0 4px 4px 0',
                  }}
                />
              )}
              <menu.icon
                size={17}
                style={{ color: active ? C.brand : '#94a3b8', flexShrink: 0 }}
              />
              <span style={{ flex: 1 }}>{menu.label}</span>
              {active && (
                <ChevronRight
                  size={14}
                  style={{ color: C.brand, opacity: 0.6 }}
                />
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User + Logout */}
      <div
        style={{
          padding: '12px',
          borderTop: `1px solid ${C.border}`,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 10px',
            borderRadius: '10px',
            background: C.bg,
            marginBottom: '8px',
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: C.brandBg,
              color: C.brand,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '700',
              fontSize: '13px',
              flexShrink: 0,
            }}
          >
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: '13px',
                fontWeight: '600',
                color: C.text,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {displayName}
            </div>
            <div
              style={{
                fontSize: '11px',
                color: C.muted,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {profile?.email || ''}
            </div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            width: '100%',
            padding: '9px 12px',
            borderRadius: '10px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '500',
            color: C.danger,
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = C.dangerBg)}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
        >
          <LogOut size={16} />
          Keluar Aplikasi
        </button>
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&family=DM+Sans:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px);} to{opacity:1;transform:translateY(0);} }
        @keyframes slideIn { from{transform:translateX(-100%);} to{transform:translateX(0);} }
        .dashboard-main-content { animation: fadeIn 0.3s ease both; }
        .sidebar-slide { animation: slideIn 0.25s cubic-bezier(0.16,1,0.3,1) both; }
      `}</style>

      <div
        style={{
          display: 'flex',
          minHeight: '100vh',
          background: C.bg,
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        {/* Mobile overlay */}
        {isMobile && sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15,23,42,0.5)',
              backdropFilter: 'blur(4px)',
              zIndex: 40,
            }}
          />
        )}

        {/* Sidebar — desktop static, mobile drawer */}
        {!isMobile ? (
          <aside
            style={{
              width: '240px',
              flexShrink: 0,
              background: C.sidebar,
              borderRight: `1px solid ${C.border}`,
              display: 'flex',
              flexDirection: 'column',
              position: 'sticky',
              top: 0,
              height: '100vh',
              overflow: 'hidden',
            }}
          >
            <SidebarContent />
          </aside>
        ) : sidebarOpen ? (
          <aside
            className="sidebar-slide"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              bottom: 0,
              width: '260px',
              background: C.sidebar,
              borderRight: `1px solid ${C.border}`,
              zIndex: 50,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <SidebarContent />
          </aside>
        ) : null}

        {/* Main */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
            overflow: 'hidden',
          }}
        >
          {/* Topbar */}
          <header
            style={{
              height: '64px',
              background: '#fff',
              borderBottom: `1px solid ${C.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 20px',
              position: 'sticky',
              top: 0,
              zIndex: 30,
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {isMobile && (
                <button
                  onClick={() => setSidebarOpen(true)}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    border: `1px solid ${C.border}`,
                    background: C.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#475569',
                  }}
                >
                  <Menu size={18} />
                </button>
              )}
              <div>
                <div
                  style={{
                    fontSize: '15px',
                    fontWeight: '600',
                    color: C.text,
                    fontFamily: 'Sora, sans-serif',
                  }}
                >
                  {schoolName}
                </div>
                <div style={{ fontSize: '11px', color: C.muted }}>
                  {location.pathname.replace(/\//g, ' › ').slice(3) ||
                    'Dashboard'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* Bell */}
              <button
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  border: `1px solid ${C.border}`,
                  background: C.bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#475569',
                  position: 'relative',
                }}
              >
                <Bell size={17} />
                <span
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    width: '7px',
                    height: '7px',
                    background: C.danger,
                    borderRadius: '50%',
                    border: '2px solid #fff',
                  }}
                />
              </button>

              {/* Divider */}
              <div
                style={{
                  width: '1px',
                  height: '24px',
                  background: C.border,
                  margin: '0 4px',
                }}
              />

              {/* Avatar — clickable → profile */}
              <div
                onClick={() => navigate(`/${role === 'super_admin' ? 'admin' : role === 'school_admin' ? 'school' : role}/profile`)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '4px 8px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  transition: 'background .15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = C.hover || '#F8FAFC'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                title="Lihat profil"
              >
                <div style={{ textAlign: 'right' }}>
                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: '600',
                      color: C.text,
                      lineHeight: 1.2,
                    }}
                  >
                    {displayName}
                  </div>
                  <div style={{ fontSize: '11px', color: C.muted }}>
                    {roleLabel}
                  </div>
                </div>
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt="avatar" style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover', border: `2px solid ${C.border}`, flexShrink: 0 }} />
                  : <div
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '50%',
                        background: C.brandBg,
                        color: C.brand,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '700',
                        fontSize: '14px',
                        border: `2px solid ${C.border}`,
                        flexShrink: 0,
                      }}
                    >
                      {initials}
                    </div>
                }
              </div>
            </div>
          </header>

          {/* Page content */}
          <main
            className="dashboard-main-content"
            style={{
              flex: 1,
              padding: isMobile ? '20px 16px' : '28px 32px',
              overflowY: 'auto',
              background: C.bg,
            }}
          >
            <div
              style={{ maxWidth: '1280px', margin: '0 auto', width: '100%' }}
            >
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </>
  );
};

export default DashboardLayout;