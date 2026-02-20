import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { Loader2 } from 'lucide-react';

// =====================================================================
// PENTING DI STACKBLITZ:
// Kita import Login & Register dulu. Jika file belum ada, buat file kosong
// bernama Login.jsx dan Register.jsx di folder src/pages/auth/
// =====================================================================
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import DashboardLayout from './components/layout/DashboardLayout';

// Komponen Dummy agar routing bisa berjalan sebelum Layout asli kita buat
const PlaceholderPage = ({ title, role }) => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
    <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm text-center">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
      <p className="text-gray-500">
        Anda login sebagai:{' '}
        <span className="font-bold text-primary-600">{role}</span>
      </p>
      <p className="text-sm mt-4 text-gray-400">
        Layout & Halaman sedang dalam tahap pengembangan...
      </p>
      <button
        onClick={() => (window.location.href = '/')}
        className="mt-6 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
      >
        Refresh Status
      </button>
    </div>
  </div>
);

// --- KOMPONEN KEAMANAN (SECURITY GUARD) ---
const ProtectedRoute = ({ allowedRoles, children }) => {
  const { user, profile, loading } = useAuth();

  if (loading) return null; // Loading ditangani oleh App utama

  // 1. Jika belum login, tendang ke halaman login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 2. Jika role tidak sesuai (misal Siswa maksa masuk link /teacher), tendang ke 403
  if (!profile || !allowedRoles.includes(profile.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // 3. Pengecekan Masa Aktif Sekolah (Sesuai Visi SaaS Anda)
  // Super Admin kebal dari aturan ini
  if (profile.role !== 'super_admin') {
    const status = profile.schools?.subscription_status;
    const isActive = profile.schools?.is_active; // Misal di-banned manual oleh owner

    if (status === 'suspended' || status === 'expired' || isActive === false) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-error-50 p-4">
          <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md text-center">
            <h1 className="text-6xl mb-4">⛔</h1>
            <h2 className="text-2xl font-bold text-error-600 mb-2">
              Akses Ditangguhkan
            </h2>
            <p className="text-gray-600 mb-6">
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

// --- APP UTAMA ---
const App = () => {
  const { user, profile, loading } = useAuth();

  // Layar Loading Utama saat baru buka website
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-primary-600 mb-4" size={40} />
        <p className="text-gray-500 font-medium animate-pulse">
          Memuat ZiDu Workspace...
        </p>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* --- AUTHENTICATION ROUTES --- */}
        <Route
          path="/login"
          element={loading ? null : (!user ? <Login /> : <Navigate to="/" replace />)}
        />
        <Route
          path="/register"
          element={loading ? null : (!user ? <Register /> : <Navigate to="/" replace />)}
        />

        {/* --- 1. SUPER ADMIN (OWNER) ROUTES --- */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['super_admin']}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route
            index
            element={
              <PlaceholderPage
                title="Dashboard Super Admin"
                role="Super Admin"
              />
            }
          />
          {/* Nanti kita tambah route /schools, /analytics di sini */}
        </Route>

        {/* --- 2. SCHOOL ADMIN (TU/OPERATOR) ROUTES --- */}
        <Route
          path="/school"
          element={
            <ProtectedRoute allowedRoles={['school_admin']}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route
            index
            element={
              <PlaceholderPage
                title="Dashboard Admin Sekolah"
                role="Admin Sekolah"
              />
            }
          />
        </Route>

        {/* --- 3. TEACHER (GURU) ROUTES --- */}
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
            element={
              <PlaceholderPage
                title="Dashboard Guru (Bank Soal & Ujian)"
                role="Guru"
              />
            }
          />
          <Route
            path="questions"
            element={<PlaceholderPage title="Bank Soal" role="Guru" />}
          />
          <Route
            path="exams"
            element={<PlaceholderPage title="Kelola Ujian" role="Guru" />}
          />
        </Route>

        {/* --- 4. STUDENT (SISWA) ROUTES --- */}
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
            element={
              <PlaceholderPage
                title="Dashboard Siswa (Ruang Ujian)"
                role="Siswa"
              />
            }
          />
        </Route>

        {/* --- ERROR ROUTES --- */}
        <Route
          path="/unauthorized"
          element={
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-center p-4">
              <h1 className="text-display-lg text-gray-300 mb-2">403</h1>
              <h2 className="text-h3 text-gray-800 mb-2">Akses Ditolak</h2>
              <p className="text-gray-500 mb-6">
                Anda mencoba masuk ke ruangan yang salah.
              </p>
              <a
                href="/"
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
              >
                Kembali ke Beranda
              </a>
            </div>
          }
        />

        {/* Tangkap URL ngawur (404) dan kembalikan ke Root */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
};

export default App;