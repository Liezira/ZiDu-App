import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { ErrorBoundary } from './components/shared/ErrorBoundary';


// ── Static imports ────────────────────────────────────────────────
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ResetPassword from './pages/auth/ResetPassword';
import JoinPage from './pages/auth/JoinPage';

// ── Lazy imports ──────────────────────────────────────────────────
const DashboardLayout = lazy(() => import('./components/layout/DashboardLayout'));
const SuperAdminDashboard = lazy(() => import('./pages/admin/SuperAdminDashboard'));
const SchoolManagement = lazy(() => import('./pages/admin/SchoolManagement'));
const GlobalAnalytics = lazy(() => import('./pages/admin/GlobalAnalytics'));
const SchoolAdminDashboard = lazy(() => import('./pages/school/SchoolAdminDashboard'));
const StaffManagement = lazy(() => import('./pages/school/StaffManagement'));
const SubjectManagement = lazy(() => import('./pages/school/SubjectManagement'));
const ClassManagement = lazy(() => import('./pages/school/ClassManagement'));
const TeacherDashboard = lazy(() => import('./pages/teacher/TeacherDashboard'));
const StudentDashboard = lazy(() => import('./pages/student/StudentDashboard'));
const QuestionBank = lazy(() => import('./pages/teacher/QuestionBank'));
const ExamManagement = lazy(() => import('./pages/teacher/ExamManagement'));
const GradesPage = lazy(() => import('./pages/teacher/GradesPage'));
const ExamRoom = lazy(() => import('./pages/student/ExamRoom'));
const StudentResults = lazy(() => import('./pages/student/StudentResults'));
const MyClassPage   = lazy(() => import('./pages/student/MyClassPage'));
const ClassesPage      = lazy(() => import('./pages/teacher/ClassesPage'));
const TeacherAnalytics = lazy(() => import('./pages/teacher/TeacherAnalytics'));
const RemedialPage          = lazy(() => import('./pages/teacher/RemedialPage'));
const TeacherAnnouncements  = lazy(() => import('./pages/teacher/TeacherAnnouncements'));
const SchoolAnnouncements   = lazy(() => import('./pages/school/SchoolAnnouncements'));
const StudentAnnouncements  = lazy(() => import('./pages/student/StudentAnnouncements'));
const AttendancePage        = lazy(() => import('./pages/teacher/AttendancePage'));
const ReportCardPage        = lazy(() => import('./pages/teacher/ReportCardPage'));
const ProfilePage = lazy(() => import('./pages/shared/ProfilePage'));
const StudentApprovals = lazy(() => import('./pages/school/StudentApprovals'));
const PendingApproval = lazy(() => import('./pages/shared/PendingApproval'));
const LandingPage = lazy(() => import('./pages/LandingPage'));

// ── Loading fallback ──────────────────────────────────────────────
const PageLoader = () => (
  <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F7F8FA', fontFamily: "'DM Sans', sans-serif", gap: '16px' }}>
    {/* Animated skeleton bars */}
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', width: '280px' }}>
      <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(79,70,229,.25)', marginBottom: '8px' }}>
        <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </div>
      <div style={{ fontFamily: 'Sora, sans-serif', fontSize: '18px', fontWeight: '700', color: '#0F172A' }}>ZiDu</div>
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        {[0,1,2].map(i => (
          <div key={i} style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4F46E5', animation: `bounce .9s ease ${i * 0.15}s infinite alternate`, opacity: 0.7 }} />
        ))}
      </div>
    </div>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Sora:wght@700&display=swap');
      @keyframes bounce { from{transform:translateY(0);opacity:.4;} to{transform:translateY(-8px);opacity:1;} }
    `}</style>
  </div>
);

const Lazy = ({ children }) => (
  <ErrorBoundary>
    <Suspense fallback={<PageLoader />}>{children}</Suspense>
  </ErrorBoundary>
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

  // Block students who are pending or rejected
  if (profile.role === 'student') {
    if (profile.status === 'pending' || profile.status === 'rejected') {
      return <Lazy><PendingApproval /></Lazy>;
    }
  }

  if (profile.role !== 'super_admin') {
    const status = profile.schools?.subscription_status;
    if (status === 'suspended' || status === 'expired')
      return <AccessSuspended />;
  }

  return children;
};

// ── Root Redirect ─────────────────────────────────────────────────
const ROLE_ROUTES = {
  super_admin: '/admin',
  school_admin: '/school',
  teacher: '/teacher',
  student: '/student',
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
      <Route path="/login" element={<AuthRoute><Login /></AuthRoute>} />
      <Route path="/register" element={<AuthRoute><Register /></AuthRoute>} />
      <Route path="/reset-password" element={<ResetPassword />} />
      {/* Signup via invite link — tidak perlu AuthRoute, boleh diakses siapapun */}
      <Route path="/join" element={<JoinPage />} />

      {/* ── ROOT → redirect ke dashboard sesuai role ── */}
      <Route path="/" element={<Lazy><LandingPage /></Lazy>} />
      <Route path="/dashboard" element={<RootRedirect />} />

      {/* ── SUPER ADMIN ── */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['super_admin']}>
            <Lazy><DashboardLayout /></Lazy>
          </ProtectedRoute>
        }
      >
        <Route index element={<Lazy><SuperAdminDashboard /></Lazy>} />
        <Route path="schools" element={<Lazy><SchoolManagement /></Lazy>} />
        <Route path="analytics" element={<Lazy><GlobalAnalytics /></Lazy>} />
        <Route path="profile" element={<Lazy><ProfilePage /></Lazy>} />
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
        <Route index element={<Lazy><SchoolAdminDashboard /></Lazy>} />
        <Route path="staff" element={<Lazy><StaffManagement /></Lazy>} />
        <Route path="classes" element={<Lazy><ClassManagement /></Lazy>} />
        <Route path="subjects" element={<Lazy><SubjectManagement /></Lazy>} />
        <Route path="approvals" element={<Lazy><StudentApprovals /></Lazy>} />
        <Route path="announcements" element={<Lazy><SchoolAnnouncements /></Lazy>} />
        <Route path="profile" element={<Lazy><ProfilePage /></Lazy>} />
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
        <Route index element={<Lazy><TeacherDashboard /></Lazy>} />
        <Route path="questions" element={<Lazy><QuestionBank /></Lazy>} />
        <Route path="exams" element={<Lazy><ExamManagement /></Lazy>} />
        <Route path="grades" element={<Lazy><GradesPage /></Lazy>} />
        <Route path="classes"   element={<Lazy><ClassesPage /></Lazy>} />
        <Route path="analytics" element={<Lazy><TeacherAnalytics /></Lazy>} />
        <Route path="remedial"  element={<Lazy><RemedialPage /></Lazy>} />
        <Route path="announcements" element={<Lazy><TeacherAnnouncements /></Lazy>} />
        <Route path="attendance"    element={<Lazy><AttendancePage /></Lazy>} />
        <Route path="report-card"   element={<Lazy><ReportCardPage /></Lazy>} />
        <Route path="profile"   element={<Lazy><ProfilePage /></Lazy>} />
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
        <Route index element={<Lazy><StudentDashboard /></Lazy>} />
        <Route path="results" element={<Lazy><StudentResults /></Lazy>} />
        <Route path="class" element={<Lazy><MyClassPage /></Lazy>} />
        <Route path="announcements" element={<Lazy><StudentAnnouncements /></Lazy>} />
        <Route path="exam" element={<Lazy><ExamRoom /></Lazy>} />
        <Route path="profile" element={<Lazy><ProfilePage /></Lazy>} />
      </Route>

      {/* ── 403 ── */}
      <Route
        path="/unauthorized"
        element={
          <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-center p-4">
            <div className="text-8xl font-extrabold text-gray-200 leading-none">403</div>
            <h2 className="text-2xl font-bold text-gray-800 mt-4 mb-2">Akses Ditolak</h2>
            <p className="text-gray-500 mb-6">Anda mencoba masuk ke ruangan yang salah.</p>
            <a href="/login" className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium">
              Kembali ke Login
            </a>
          </div>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;