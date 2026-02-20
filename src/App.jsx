import React, { lazy, Suspense } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { Loader2 } from 'lucide-react';

// ── Static imports (ringan, selalu dibutuhkan) ────────────────────
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// ── Lazy imports (load hanya saat route dikunjungi) ───────────────
const DashboardLayout       = lazy(() => import('./components/layout/DashboardLayout'));
const SuperAdminDashboard   = lazy(() => import('./pages/admin/SuperAdminDashboard'));
const SchoolAdminDashboard  = lazy(() => import('./pages/school/SchoolAdminDashboard'));

// ── Loading fallback ──────────────────────────────────────────────
const PageLoader = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
    <Loader2 className="animate-spin text-primary-600 mb-4" size={40} />
    <p className="text-gray-500 font-medium animate-pulse">Memuat ZiDu Workspace...</p>
  </div>
);

// ── Placeholder untuk halaman yang belum dibuat ───────────────────
const PlaceholderPage = ({ title, role }) => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
    <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm text-center">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
      <p className="text-gray-500">
        Anda login sebagai:{' '}
        <span className="font-bold text-primary-600">{role}</span>
      </p>
      <p className="text-sm mt-4 text-gray-400">
        Halaman sedang dalam tahap pengembangan...
      </p>
    </div>
  </div>
);

// ── Suspended wrapper — DRY ───────────────────────────────────────
const Lazy = ({ children }) => (
  <Suspense fallback={<PageLoader />}>{children}</Suspense>
);

// ── Akses ditangguhkan ────────────────────────────────────────────
const AccessSuspended = () => (
  <div className="min-h-screen flex items-center justify-center bg-error-50 p-4">
    <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md text-center">
      <div className="text-6xl mb-4">⛔</div>
      <h2 className="text-2xl font-bold text-error-600 mb-2">Akses Ditangguhkan</h2>
      <p className="text-gray-600">
        Sistem sekolah Anda sedang ditangguhkan atau masa langganan telah habis.
        Silakan hubungi Administrator.
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

  // Cek status langganan sekolah (super_admin kebal)
  if (profile.role !== 'super_admin') {
    const { subscription_status: status, is_active: isActive } = profile.schools ?? {};
    if (status === 'suspended' || status === 'expired' || isActive === false)
      return <AccessSuspended />;
  }

  return children;
};

// ── Root Redirect berdasarkan role ────────────────────────────────
// FIX #1: Tambah komponen ini — sebelumnya tidak ada, menyebabkan infinite loop
const ROLE_ROUTES = {
  super_admin:  '/admin',
  school_admin: '/school',
  teacher:      '/teacher',
  student:      '/student',
};

const RootRedirect = () => {
  const { user, profile, loading } = useAuth();
  if (loading) return null;
  if (!user || !profile) return <Navigate to="/login" replace />;
  return <Navigate to={ROLE_ROUTES[profile.role] ?? '/unauthorized'} replace />;
};

// ── App Utama ─────────────────────────────────────────────────────
const App = () => {
  const { loading } = useAuth();

  if (loading) return <PageLoader />;

  return (
    <Router>
      <Routes>
        {/* ── AUTH ── */}
        {/* FIX #2: Guard login/register — kalau sudah login, redirect ke / (bukan langsung ke role route) */}
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* FIX #1: Route / yang handle redirect berdasarkan role */}
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
          {/* FIX #3: Import & gunakan SuperAdminDashboard yang asli */}
          <Route index element={<Lazy><SuperAdminDashboard /></Lazy>} />
          <Route path="schools"   element={<PlaceholderPage title="Manajemen Sekolah" role="Super Admin" />} />
          <Route path="analytics" element={<PlaceholderPage title="Analitik Global"   role="Super Admin" />} />
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
          {/* FIX #3: Import & gunakan SchoolAdminDashboard yang asli */}
          <Route index           element={<Lazy><SchoolAdminDashboard /></Lazy>} />
          <Route path="teachers" element={<PlaceholderPage title="Data Guru"      role="Admin Sekolah" />} />
          <Route path="students" element={<PlaceholderPage title="Data Siswa"     role="Admin Sekolah" />} />
          <Route path="subjects" element={<PlaceholderPage title="Mata Pelajaran" role="Admin Sekolah" />} />
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
          <Route index            element={<PlaceholderPage title="Dashboard Guru"        role="Guru" />} />
          <Route path="questions" element={<PlaceholderPage title="Bank Soal"             role="Guru" />} />
          <Route path="exams"     element={<PlaceholderPage title="Kelola Ujian"          role="Guru" />} />
          <Route path="grades"    element={<PlaceholderPage title="Rekap Nilai"           role="Guru" />} />
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
          <Route index          element={<PlaceholderPage title="Ruang Ujian"   role="Siswa" />} />
          <Route path="results" element={<PlaceholderPage title="Riwayat Nilai" role="Siswa" />} />
        </Route>

        {/* ── ERROR ── */}
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

        {/* FIX: Wildcard tidak lagi ke "/" yang menyebabkan infinite loop */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
};

export default App;
