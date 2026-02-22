import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { Loader2 } from 'lucide-react';

// ── Static imports ────────────────────────────────────────────────
import Login    from './pages/auth/Login';
import Register from './pages/auth/Register';

// ── Lazy imports ──────────────────────────────────────────────────
const DashboardLayout      = lazy(() => import('./components/layout/DashboardLayout'));
const SuperAdminDashboard  = lazy(() => import('./pages/admin/SuperAdminDashboard'));
const SchoolManagement     = lazy(() => import('./pages/admin/SchoolManagement'));
const GlobalAnalytics      = lazy(() => import('./pages/admin/GlobalAnalytics'));
const SchoolAdminDashboard = lazy(() => import('./pages/school/SchoolAdminDashboard'));
const StaffManagement      = lazy(() => import('./pages/school/StaffManagement'));
const SubjectManagement    = lazy(() => import('./pages/school/SubjectManagement'));
const ClassManagement      = lazy(() => import('./pages/school/ClassManagement'));
const TeacherDashboard     = lazy(() => import('./pages/teacher/TeacherDashboard'));
const StudentDashboard     = lazy(() => import('./pages/student/StudentDashboard'));

// ── Loading fallback ──────────────────────────────────────────────
const PageLoader = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
    <Loader2 className="animate-spin text-primary-600 mb-4" size={40} />
    <p className="text-gray-500 font-medium animate-pulse">Memuat ZiDu Workspace...</p>
  </div>
);

const Lazy = ({ children }) => (
  <Suspense fallback={<PageLoader />}>{children}</Suspense>
);

// ── Placeholder ───────────────────────────────────────────────────
const PlaceholderPage = ({ title, role }) => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center bg-gray-50 p-4">
    <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm text-center max-w-md">
      <div className="w-14 h-14 rounded-2xl bg-primary-50 flex items-center justify-center mx-auto mb-4 text-2xl">📋</div>
      <h1 className="text-xl font-bold text-gray-900 mb-2">{title}</h1>
      <p className="text-sm text-gray-500">Login sebagai: <strong className="text-primary-600">{role}</strong></p>
      <p className="text-xs text-gray-400 mt-3">Halaman sedang dalam pengembangan...</p>
    </div>
  </div>
);

// ── Akses ditangguhkan ────────────────────────────────────────────
const AccessSuspended = () => (
  <div className="min-h-screen flex items-center justify-center bg-error-50 p-4">
    <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md text-center">
      <div className="text-6xl mb-4">⛔</div>
      <h2 className="text-2xl font-bold text-error-600 mb-2">Akses Ditangguhkan</h2>
      <p className="text-gray-600">
        Sistem sekolah Anda sedang ditangguhkan atau masa langganan habis.
        Silakan hubungi Administrator.
      </p>
    </div>
  </div>
);

// ── Protected Route ───────────────────────────────────────────────
const ProtectedRoute = ({ allowedRoles, children }) => {
  const { user, profile, loading } = useAuth();

  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (!profile || !allowedRoles.includes(profile.role))
    return <Navigate to="/unauthorized" replace />;

  if (profile.role !== 'super_admin') {
    const { subscription_status: status } = profile.schools ?? {};
    if (status === 'suspended' || status === 'expired')
      return <AccessSuspended />;
  }

  return children;
};

// ── Root Redirect ─────────────────────────────────────────────────
const ROLE_ROUTES = {
  super_admin:  '/admin',
  school_admin: '/school',
  teacher:      '/teacher',
  student:      '/student',
};

const RootRedirect = () => {
  const { user, profile, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user || !profile) return <Navigate to="/login" replace />;
  return <Navigate to={ROLE_ROUTES[profile.role] ?? '/unauthorized'} replace />;
};

// ── Auth Guard ────────────────────────────────────────────────────
const AuthRoute = ({ children }) => {
  const { user, profile, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (user && profile) return <Navigate to={ROLE_ROUTES[profile.role] ?? '/'} replace />;
  return children;
};

// ── App ───────────────────────────────────────────────────────────
const App = () => {
  return (
    <Routes>
      {/* ── AUTH ── */}
      <Route path="/login"    element={<AuthRoute><Login /></AuthRoute>} />
      <Route path="/register" element={<AuthRoute><Register /></AuthRoute>} />

      {/* ── ROOT ── */}
      <Route path="/" element={<RootRedirect />} />

      {/* ── SUPER ADMIN ── */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['super_admin']}>
            <Lazy><DashboardLayout /></Lazy>
          </ProtectedRoute>
        }
      >
        <Route index            element={<Lazy><SuperAdminDashboard /></Lazy>} />
        <Route path="schools"   element={<Lazy><SchoolManagement /></Lazy>} />
        <Route path="analytics" element={<Lazy><GlobalAnalytics /></Lazy>} />
      </Route>

      {/* ── SCHOOL ADMIN ── */}
      <Route
        path="/school"
        element={
          <ProtectedRoute allowedRoles={['school_admin']}>
            <Lazy><DashboardLayout /></Lazy>
          </ProtectedRoute>
        }
      >
        <Route index           element={<Lazy><SchoolAdminDashboard /></Lazy>} />
        <Route path="staff"    element={<Lazy><StaffManagement /></Lazy>} />
        <Route path="classes"  element={<Lazy><ClassManagement /></Lazy>} />
        <Route path="subjects" element={<Lazy><SubjectManagement /></Lazy>} />
      </Route>

      {/* ── TEACHER ── */}
      <Route
        path="/teacher"
        element={
          <ProtectedRoute allowedRoles={['teacher']}>
            <Lazy><DashboardLayout /></Lazy>
          </ProtectedRoute>
        }
      >
        <Route index            element={<Lazy><TeacherDashboard /></Lazy>} />
        <Route path="questions" element={<PlaceholderPage title="Bank Soal"    role="Guru" />} />
        <Route path="exams"     element={<PlaceholderPage title="Kelola Ujian" role="Guru" />} />
        <Route path="grades"    element={<PlaceholderPage title="Rekap Nilai"  role="Guru" />} />
      </Route>

      {/* ── STUDENT ── */}
      <Route
        path="/student"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <Lazy><DashboardLayout /></Lazy>
          </ProtectedRoute>
        }
      >
        <Route index          element={<Lazy><StudentDashboard /></Lazy>} />
        <Route path="results" element={<PlaceholderPage title="Riwayat Nilai" role="Siswa" />} />
      </Route>

      {/* ── 403 ── */}
      <Route
        path="/unauthorized"
        element={
          <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-center p-4">
            <div className="text-8xl font-extrabold text-gray-200 leading-none">403</div>
            <h2 className="text-2xl font-bold text-gray-800 mt-4 mb-2">Akses Ditolak</h2>
            <p className="text-gray-500 mb-6">Anda mencoba masuk ke ruangan yang salah.</p>
            <a href="/" className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium">
              Kembali ke Beranda
            </a>
          </div>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;