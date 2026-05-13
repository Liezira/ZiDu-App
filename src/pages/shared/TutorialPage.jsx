// src/pages/shared/TutorialPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTutorial } from '../../hooks/useTutorial';
import {
  GraduationCap, CheckCircle2, Circle, ArrowRight, RotateCcw,
  Users, Layers, BookOpen, FileText, BarChart2, ClipboardList,
  Megaphone, Award, UserCircle, School, ClipboardCheck,
  NotebookPen, LayoutDashboard, Info, ChevronDown, ChevronUp,
} from 'lucide-react';

// ─── Konten tutorial per role ─────────────────────────────────────────────────
const TUTORIALS = {
  school_admin: {
    title: 'Selamat datang, Admin Sekolah!',
    subtitle: 'Ikuti 5 langkah berikut untuk menyiapkan sekolahmu di ZiDu.',
    accent: '#0284C7',
    accentBg: '#F0F9FF',
    steps: [
      {
        id: 'subjects',
        icon: BookOpen,
        title: 'Buat Mata Pelajaran',
        desc: 'Tambahkan semua mata pelajaran yang ada di sekolahmu. Ini akan digunakan oleh guru saat membuat bank soal dan ujian.',
        tips: ['Gunakan kode singkat, misal: MTK, IPA, BIN', 'Mata pelajaran bisa diedit kapan saja'],
        action: { label: 'Buka Mata Pelajaran', path: '/school/subjects' },
        icon_color: '#7C3AED',
      },
      {
        id: 'classes',
        icon: Layers,
        title: 'Buat Kelas',
        desc: 'Buat kelas untuk setiap angkatan. Tentukan wali kelas dan kapasitas maksimal siswa.',
        tips: ['Contoh nama: X IPA 1, XI IPS 2', 'Kelas bisa diisi siswa via invite link nanti'],
        action: { label: 'Buka Kelas', path: '/school/classes' },
        icon_color: '#0284C7',
      },
      {
        id: 'invite',
        icon: Users,
        title: 'Undang Guru & Siswa',
        desc: 'Bagikan link undangan agar guru dan siswa bisa mendaftar. Setiap link bisa dibatasi jumlah penggunaan dan waktu berlaku.',
        tips: ['Buat link terpisah untuk guru dan siswa', 'Link guru tidak perlu persetujuan manual'],
        action: { label: 'Buka Guru & Murid', path: '/school/staff' },
        icon_color: '#059669',
      },
      {
        id: 'approvals',
        icon: ClipboardCheck,
        title: 'Setujui Pendaftaran Siswa',
        desc: 'Siswa yang mendaftar perlu disetujui sebelum bisa login. Periksa dan setujui daftar siswa yang menunggu persetujuan.',
        tips: ['Notifikasi otomatis muncul saat ada pendaftar baru', 'Bisa setujui massal sekaligus'],
        action: { label: 'Buka Persetujuan', path: '/school/approvals' },
        icon_color: '#D97706',
      },
      {
        id: 'announcements',
        icon: Megaphone,
        title: 'Buat Pengumuman Pertama',
        desc: 'Sambut guru dan siswa dengan pengumuman pertama. Kamu bisa menargetkan pengumuman ke semua pengguna atau kelas tertentu.',
        tips: ['Pin pengumuman penting agar tampil di atas', 'Atur tanggal kadaluarsa agar tidak menumpuk'],
        action: { label: 'Buka Pengumuman', path: '/school/announcements' },
        icon_color: '#E11D48',
      },
    ],
  },

  teacher: {
    title: 'Selamat datang, Guru!',
    subtitle: 'Pelajari cara membuat ujian, mencatat absensi, dan memantau nilai siswa.',
    accent: '#059669',
    accentBg: '#ECFDF5',
    steps: [
      {
        id: 'profile',
        icon: UserCircle,
        title: 'Lengkapi Profil',
        desc: 'Isi foto profil dan nomor telepon. Pastikan juga mata pelajaran yang kamu ampu sudah dipilih dengan benar.',
        tips: ['Foto profil membantu siswa mengenalmu', 'Mata pelajaran menentukan akses bank soal'],
        action: { label: 'Buka Profil', path: '/teacher/profile' },
        icon_color: '#7C3AED',
      },
      {
        id: 'questions',
        icon: BookOpen,
        title: 'Buat Bank Soal',
        desc: 'Tambahkan soal pilihan ganda, benar/salah, atau esai ke bank soal. Soal bisa dikelompokkan per mata pelajaran dan tingkat kesulitan.',
        tips: ['Soal bisa ditambahkan satu per satu atau lewat import', 'Gunakan tag untuk memudahkan pencarian soal'],
        action: { label: 'Buka Bank Soal', path: '/teacher/questions' },
        icon_color: '#0284C7',
      },
      {
        id: 'exams',
        icon: FileText,
        title: 'Buat Sesi Ujian',
        desc: 'Buat ujian dari bank soal yang sudah ada. Atur durasi, waktu mulai, token akses, dan apakah soal akan diacak.',
        tips: ['Token 8 karakter dibuat otomatis, aman dan unik', 'Aktifkan "Acak soal" untuk mencegah contek'],
        action: { label: 'Buka Kelola Ujian', path: '/teacher/exams' },
        icon_color: '#D97706',
      },
      {
        id: 'attendance',
        icon: ClipboardList,
        title: 'Catat Absensi',
        desc: 'Buat sesi absensi dan bagikan token/QR ke siswa. Siswa bisa check-in sendiri, atau kamu input secara manual.',
        tips: ['Token absensi aktif selama 2 jam', 'Bisa edit status absensi setelah sesi ditutup'],
        action: { label: 'Buka Absensi', path: '/teacher/attendance' },
        icon_color: '#059669',
      },
      {
        id: 'grades',
        icon: Award,
        title: 'Lihat & Input Nilai',
        desc: 'Pantau nilai ujian siswa, input nilai manual untuk tugas/UTS, dan ekspor laporan nilai ke PDF.',
        tips: ['Nilai ujian otomatis terhitung setelah submit', 'Laporan nilai bisa dicetak per kelas'],
        action: { label: 'Buka Rekap Nilai', path: '/teacher/grades' },
        icon_color: '#E11D48',
      },
    ],
  },

  student: {
    title: 'Selamat datang, Siswa!',
    subtitle: 'Panduan singkat untuk mulai menggunakan ZiDu.',
    accent: '#D97706',
    accentBg: '#FFFBEB',
    steps: [
      {
        id: 'profile',
        icon: UserCircle,
        title: 'Lengkapi Profil',
        desc: 'Isi NIS (Nomor Induk Siswa) dan foto profil. NIS digunakan untuk identifikasi pada lembar ujian dan rapor.',
        tips: ['NIS bisa dilihat di kartu pelajar atau tanya ke admin', 'Foto profil bisa diubah kapan saja'],
        action: { label: 'Buka Profil', path: '/student/profile' },
        icon_color: '#7C3AED',
      },
      {
        id: 'exam',
        icon: FileText,
        title: 'Ikut Ujian',
        desc: 'Masukkan token 8 karakter yang diberikan gurumu untuk memulai ujian. Pastikan koneksi internet stabil dan jangan keluar dari layar ujian.',
        tips: ['Jawaban otomatis tersimpan setiap 30 detik', 'Keluar dari tab/fullscreen akan dicatat sebagai pelanggaran'],
        action: { label: 'Buka Ujian Saya', path: '/student' },
        icon_color: '#0284C7',
      },
      {
        id: 'results',
        icon: Award,
        title: 'Cek Hasil & Riwayat Nilai',
        desc: 'Lihat nilai ujian yang sudah selesai, termasuk detail jawaban benar dan salah (jika diizinkan guru).',
        tips: ['Nilai muncul langsung setelah submit (untuk pilihan ganda)', 'Esai dinilai manual oleh guru'],
        action: { label: 'Buka Riwayat Nilai', path: '/student/results' },
        icon_color: '#059669',
      },
      {
        id: 'class',
        icon: Layers,
        title: 'Lihat Info Kelasmu',
        desc: 'Cek jadwal, teman sekelas, wali kelas, dan pengumuman khusus kelasmu.',
        tips: ['Pengumuman sekolah juga bisa dilihat di halaman Pengumuman', 'Absensimu bisa dipantau di sini'],
        action: { label: 'Buka Kelas Saya', path: '/student/class' },
        icon_color: '#D97706',
      },
    ],
  },

  super_admin: {
    title: 'Selamat datang, Super Admin!',
    subtitle: 'Kelola semua sekolah yang terdaftar di platform ZiDu.',
    accent: '#7C3AED',
    accentBg: '#F5F3FF',
    steps: [
      {
        id: 'schools',
        icon: School,
        title: 'Kelola Sekolah',
        desc: 'Lihat semua sekolah yang terdaftar, tambahkan sekolah baru, dan kelola status subscription mereka.',
        tips: ['Sekolah baru bisa di-trial selama 30 hari', 'Notifikasi otomatis saat trial mendekati berakhir'],
        action: { label: 'Buka Manajemen Sekolah', path: '/admin/schools' },
        icon_color: '#0284C7',
      },
      {
        id: 'analytics',
        icon: BarChart2,
        title: 'Monitor Analitik Global',
        desc: 'Pantau metrik penggunaan platform secara keseluruhan: total ujian, siswa aktif, dan tren per sekolah.',
        tips: ['Data diperbarui setiap hari', 'Filter per periode atau per sekolah'],
        action: { label: 'Buka Analitik Global', path: '/admin/analytics' },
        icon_color: '#059669',
      },
      {
        id: 'abtest',
        icon: LayoutDashboard,
        title: 'A/B Testing',
        desc: 'Jalankan eksperimen A/B untuk menguji fitur baru ke subset kelas sebelum diluncurkan ke semua pengguna.',
        tips: ['Satu eksperimen = dua varian (control vs treatment)', 'Data event ujian otomatis ter-track'],
        action: { label: 'Buka Overview', path: '/admin' },
        icon_color: '#7C3AED',
      },
    ],
  },
};

// ─── StepCard ─────────────────────────────────────────────────────────────────
const StepCard = ({ step, index, completed, onToggle, accent }) => {
  const [open, setOpen] = useState(false);
  const Icon = step.icon;
  const navigate = useNavigate();

  return (
    <div style={{
      border: `1px solid ${completed ? accent + '40' : '#E2E8F0'}`,
      borderRadius: '12px',
      background: completed ? accent + '06' : '#fff',
      overflow: 'hidden',
      transition: 'border-color .2s, background .2s',
    }}>
      {/* ── Header row ── */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '14px 16px', cursor: 'pointer',
        }}
        onClick={() => setOpen(o => !o)}
      >
        {/* Step number / check */}
        <button
          onClick={e => { e.stopPropagation(); onToggle(step.id); }}
          style={{
            width: '28px', height: '28px', borderRadius: '50%',
            border: 'none', background: 'none',
            cursor: 'pointer', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: completed ? accent : '#CBD5E1',
            transition: 'color .15s',
          }}
          aria-label={completed ? 'Tandai belum selesai' : 'Tandai selesai'}
          title={completed ? 'Tandai belum selesai' : 'Tandai selesai'}
        >
          {completed
            ? <CheckCircle2 size={22} />
            : <Circle size={22} />
          }
        </button>

        {/* Icon */}
        <div style={{
          width: '36px', height: '36px', borderRadius: '9px', flexShrink: 0,
          background: step.icon_color + '15',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={18} style={{ color: step.icon_color }} />
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '14px', fontWeight: '600', color: '#0F172A',
            textDecoration: completed ? 'line-through' : 'none',
            opacity: completed ? 0.5 : 1,
          }}>
            <span style={{ color: '#94A3B8', marginRight: '6px', fontSize: '12px' }}>
              {String(index + 1).padStart(2, '0')}
            </span>
            {step.title}
          </div>
          {!open && (
            <div style={{
              fontSize: '12px', color: '#94A3B8', marginTop: '2px',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {step.desc.slice(0, 70)}…
            </div>
          )}
        </div>

        {/* Chevron */}
        <div style={{ color: '#CBD5E1', flexShrink: 0 }}>
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {/* ── Expanded body ── */}
      {open && (
        <div style={{
          padding: '0 16px 16px 16px',
          borderTop: '1px solid #F1F5F9',
        }}>
          <p style={{
            fontSize: '13px', color: '#475569', lineHeight: 1.7,
            margin: '12px 0',
          }}>
            {step.desc}
          </p>

          {/* Tips */}
          <div style={{
            background: '#F8FAFC', borderRadius: '8px',
            padding: '10px 12px', marginBottom: '14px',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              fontSize: '11px', fontWeight: '600', color: '#94A3B8',
              textTransform: 'uppercase', letterSpacing: '0.05em',
              marginBottom: '6px',
            }}>
              <Info size={12} /> Tips
            </div>
            {step.tips.map((tip, i) => (
              <div key={i} style={{
                display: 'flex', gap: '6px', alignItems: 'flex-start',
                fontSize: '12px', color: '#475569', lineHeight: 1.5,
                marginTop: i > 0 ? '4px' : 0,
              }}>
                <span style={{ color: accent, flexShrink: 0, marginTop: '2px' }}>·</span>
                {tip}
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate(step.action.path)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '7px 14px', borderRadius: '8px',
                border: 'none', background: accent,
                color: '#fff', fontSize: '13px', fontWeight: '600',
                cursor: 'pointer', transition: 'opacity .15s',
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '.85'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              {step.action.label} <ArrowRight size={14} />
            </button>
            <button
              onClick={() => onToggle(step.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '7px 14px', borderRadius: '8px',
                border: `1px solid ${completed ? '#E2E8F0' : accent}`,
                background: 'transparent',
                color: completed ? '#94A3B8' : accent,
                fontSize: '13px', fontWeight: '600',
                cursor: 'pointer', transition: 'all .15s',
              }}
            >
              {completed
                ? <><RotateCcw size={13} /> Batal</>
                : <><CheckCircle2 size={13} /> Tandai Selesai</>
              }
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── TutorialPage ─────────────────────────────────────────────────────────────
const TutorialPage = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const role = profile?.role || 'student';
  const config = TUTORIALS[role] || TUTORIALS.student;
  const { completedSteps, hasSeenTutorial, markSeen, toggleStep, resetTutorial } = useTutorial(profile?.id);

  const doneCount = config.steps.filter(s => completedSteps.includes(s.id)).length;
  const pct = Math.round((doneCount / config.steps.length) * 100);
  const allDone = doneCount === config.steps.length;

  // Tandai sudah dilihat saat halaman dibuka
  React.useEffect(() => { markSeen(); }, []);

  const dashPath = role === 'super_admin' ? '/admin'
    : role === 'school_admin' ? '/school'
    : role === 'teacher' ? '/teacher'
    : '/student';

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* ── Header ── */}
      <div style={{
        background: config.accentBg,
        border: `1px solid ${config.accent}25`,
        borderRadius: '16px',
        padding: '24px 28px',
        marginBottom: '24px',
        display: 'flex', alignItems: 'flex-start', gap: '16px',
      }}>
        <div style={{
          width: '48px', height: '48px', borderRadius: '14px',
          background: config.accent, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <GraduationCap size={24} color="#fff" />
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{
            margin: 0, fontSize: '20px', fontWeight: '700', color: '#0F172A',
            fontFamily: "'Sora', sans-serif",
          }}>
            {config.title}
          </h1>
          <p style={{ margin: '4px 0 16px', fontSize: '13px', color: '#64748B', lineHeight: 1.6 }}>
            {config.subtitle}
          </p>

          {/* Progress bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              flex: 1, height: '6px', borderRadius: '3px',
              background: config.accent + '25', overflow: 'hidden',
            }}>
              <div style={{
                height: '100%', borderRadius: '3px',
                width: `${pct}%`, background: config.accent,
                transition: 'width .4s ease',
              }} />
            </div>
            <span style={{
              fontSize: '12px', fontWeight: '600',
              color: config.accent, whiteSpace: 'nowrap',
            }}>
              {doneCount}/{config.steps.length} selesai
            </span>
          </div>
        </div>
      </div>

      {/* ── Semua selesai ── */}
      {allDone && (
        <div style={{
          background: '#F0FDF4', border: '1px solid #BBF7D0',
          borderRadius: '12px', padding: '14px 18px',
          display: 'flex', alignItems: 'center', gap: '10px',
          marginBottom: '20px',
        }}>
          <CheckCircle2 size={20} color="#16A34A" />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#15803D' }}>
              Semuanya selesai! Kamu sudah siap menggunakan ZiDu.
            </div>
            <div style={{ fontSize: '12px', color: '#4ADE80', marginTop: '2px' }}>
              Halaman ini tetap bisa diakses dari sidebar kapan saja.
            </div>
          </div>
          <button
            onClick={() => navigate(dashPath)}
            style={{
              padding: '6px 14px', borderRadius: '8px', border: 'none',
              background: '#16A34A', color: '#fff',
              fontSize: '12px', fontWeight: '600', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '5px',
              whiteSpace: 'nowrap',
            }}
          >
            Ke Dashboard <ArrowRight size={13} />
          </button>
        </div>
      )}

      {/* ── Step cards ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {config.steps.map((step, i) => (
          <StepCard
            key={step.id}
            step={step}
            index={i}
            completed={completedSteps.includes(step.id)}
            onToggle={toggleStep}
            accent={config.accent}
          />
        ))}
      </div>

      {/* ── Footer actions ── */}
      <div style={{
        marginTop: '28px', paddingTop: '20px',
        borderTop: '1px solid #F1F5F9',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: '10px',
      }}>
        <button
          onClick={resetTutorial}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '7px 14px', borderRadius: '8px',
            border: '1px solid #E2E8F0', background: 'transparent',
            color: '#94A3B8', fontSize: '12px', fontWeight: '500',
            cursor: 'pointer', transition: 'all .15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#64748B'; e.currentTarget.style.borderColor = '#CBD5E1'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#94A3B8'; e.currentTarget.style.borderColor = '#E2E8F0'; }}
          title="Reset semua progres tutorial"
        >
          <RotateCcw size={13} /> Ulangi Tutorial
        </button>

        <button
          onClick={() => navigate(dashPath)}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '7px 16px', borderRadius: '8px',
            border: 'none', background: config.accent,
            color: '#fff', fontSize: '13px', fontWeight: '600',
            cursor: 'pointer', transition: 'opacity .15s',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '.85'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          Ke Dashboard <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
};

export default TutorialPage;