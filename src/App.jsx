import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { Loader2 } from 'lucide-react';

import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import DashboardLayout from './components/layout/DashboardLayout';

// ── Dashboard Pages ──────────────────────────────────────────────
import SuperAdminDashboard from './pages/admin/SuperAdminDashboard';
import SchoolAdminDashboard from './pages/school/SchoolAdminDashboard';

// ── Placeholder (untuk halaman yang belum dibuat) ─────────────────
const PlaceholderPage = ({ title, role }) => (
  <div
    style={{
      minHeight: '60vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px',
    }}
  >
    <div
      style={{
        background: '#fff',
        padding: '40px',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
        textAlign: 'center',
        maxWidth: '400px',
        width: '100%',
      }}
    >
      <div
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '16px',
          background: '#EEF2FF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          fontSize: '24px',
        }}
      >
        📋
      </div>
      <h1
        style={{
          fontSize: '20px',
          fontWeight: '700',
          color: '#0f172a',
          marginBottom: '8px',
          fontFamily: 'Sora, sans-serif',
        }}
      >
        {title}
      </h1>
      <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '6px' }}>
        Login sebagai: <strong style={{ color: '#4F46E5' }}>{role}</strong>
      </p>
      <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '12px' }}>
        Halaman sedang dalam pengembangan...
      </p>
    </div>
  </div>
);

// ── Protected Route ───────────────────────────────────────────────
const ProtectedRoute = ({ allowedRoles, children }) => {
  const { user, profile, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!profile || !allowedRoles.includes(profile.role))
    return <Navigate to="/unauthorized" replace />;
  if (profile.role !== 'super_admin') {
    const status = profile.schools?.subscription_status;
    const isActive = profile.schools?.is_active;
    if (status === 'suspended' || status === 'expired' || isActive === false) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#fef2f2',
            padding: '32px',
          }}
        >
          <div
            style={{
              background: '#fff',
              padding: '40px',
              borderRadius: '20px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.1)',
              maxWidth: '400px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '56px', marginBottom: '16px' }}>⛔</div>
            <h2
              style={{
                fontSize: '22px',
                fontWeight: '700',
                color: '#dc2626',
                marginBottom: '12px',
                fontFamily: 'Sora, sans-serif',
              }}
            >
              Akses Ditangguhkan
            </h2>
            <p
              style={{ fontSize: '14px', color: '#64748b', lineHeight: '1.6' }}
            >
              Sistem sekolah Anda sedang ditangguhkan atau masa langganan telah
              habis. Silakan hubungi Administrator.
            </p>
          </div>
        </div>
      );
    }
  }
  return children;
};

// ── Root Smart Redirect ───────────────────────────────────────────
const RootRedirect = () => {
  const { user, profile, loading } = useAuth();
  if (loading) return null;
  if (!user || !profile) return <Navigate to="/login" replace />;
  switch (profile.role) {
    case 'super_admin':
      return <Navigate to="/admin" replace />;
    case 'school_admin':
      return <Navigate to="/school" replace />;
    case 'teacher':
      return <Navigate to="/teacher" replace />;
    case 'student':
      return <Navigate to="/student" replace />;
    default:
      return <Navigate to="/unauthorized" replace />;
  }
};

// ── App ───────────────────────────────────────────────────────────
const App = () => {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f8fafc',
        }}
      >
        <div
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            border: '3px solid #e0e7ff',
            borderTopColor: '#4F46E5',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <p
          style={{
            marginTop: '16px',
            fontSize: '14px',
            color: '#94a3b8',
            fontWeight: '500',
          }}
        >
          Memuat ZiDu Workspace...
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* ── AUTH ── */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<RootRedirect />} />

        {/* ── SUPER ADMIN ── */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['super_admin']}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<SuperAdminDashboard />} />
          <Route
            path="schools"
            element={
              <PlaceholderPage title="Manajemen Sekolah" role="Super Admin" />
            }
          />
          <Route
            path="analytics"
            element={
              <PlaceholderPage title="Analitik Global" role="Super Admin" />
            }
          />
        </Route>

        {/* ── SCHOOL ADMIN ── */}
        <Route
          path="/school"
          element={
            <ProtectedRoute allowedRoles={['school_admin']}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<SchoolAdminDashboard />} />
          <Route
            path="teachers"
            element={<PlaceholderPage title="Data Guru" role="Admin Sekolah" />}
          />
          <Route
            path="students"
            element={
              <PlaceholderPage title="Data Siswa" role="Admin Sekolah" />
            }
          />
          <Route
            path="subjects"
            element={
              <PlaceholderPage title="Mata Pelajaran" role="Admin Sekolah" />
            }
          />
        </Route>

        {/* ── TEACHER ── */}
        <Route
          path="/teacher"
          element={
            <ProtectedRoute allowedRoles={['teacher']}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route
            index
            element={<PlaceholderPage title="Beranda Guru" role="Guru" />}
          />
          <Route
            path="questions"
            element={<PlaceholderPage title="Bank Soal" role="Guru" />}
          />
          <Route
            path="exams"
            element={<PlaceholderPage title="Kelola Ujian" role="Guru" />}
          />
          <Route
            path="grades"
            element={<PlaceholderPage title="Rekap Nilai" role="Guru" />}
          />
        </Route>

        {/* ── STUDENT ── */}
        <Route
          path="/student"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route
            index
            element={<PlaceholderPage title="Ujian Saya" role="Siswa" />}
          />
          <Route
            path="results"
            element={<PlaceholderPage title="Riwayat Nilai" role="Siswa" />}
          />
        </Route>

        {/* ── ERRORS ── */}
        <Route
          path="/unauthorized"
          element={
            <div
              style={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#f8fafc',
                textAlign: 'center',
                padding: '32px',
              }}
            >
              <div
                style={{
                  fontSize: '80px',
                  fontWeight: '800',
                  color: '#e2e8f0',
                  fontFamily: 'Sora, sans-serif',
                  lineHeight: 1,
                }}
              >
                403
              </div>
              <h2
                style={{
                  fontSize: '22px',
                  fontWeight: '700',
                  color: '#0f172a',
                  margin: '16px 0 8px',
                  fontFamily: 'Sora, sans-serif',
                }}
              >
                Akses Ditolak
              </h2>
              <p
                style={{
                  fontSize: '14px',
                  color: '#64748b',
                  marginBottom: '24px',
                }}
              >
                Anda mencoba masuk ke ruangan yang salah.
              </p>
              <a
                href="/"
                style={{
                  padding: '10px 28px',
                  background: '#4F46E5',
                  color: '#fff',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: '600',
                }}
              >
                Kembali ke Beranda
              </a>
            </div>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App;
