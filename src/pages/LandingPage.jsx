import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// ── Intersection Observer hook ────────────────────────────────────
const useInView = (threshold = 0.12) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
};

// ── Counter animation ─────────────────────────────────────────────
const useCounter = (target, visible, duration = 1600) => {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!visible) return;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setVal(Math.floor(ease * target));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [visible, target, duration]);
  return val;
};

// ── Animated section wrapper ──────────────────────────────────────
const FadeUp = ({ children, delay = 0, className = '' }) => {
  const [ref, visible] = useInView();
  return (
    <div ref={ref} className={className} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(28px)',
      transition: `opacity .6s ease ${delay}ms, transform .6s ease ${delay}ms`,
    }}>
      {children}
    </div>
  );
};

// ── Data ──────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: '🗂️',
    title: 'Bank Soal Terstruktur',
    desc: 'Buat dan kelola soal pilihan ganda, benar/salah, dan esai dalam satu tempat. Import via CSV, tambah gambar, atur bobot nilai.',
    color: '#4F46E5', bg: '#EEF2FF',
  },
  {
    icon: '🛡️',
    title: 'Anti-Cheat Canggih',
    desc: 'Deteksi tab switching, fullscreen enforcement, batas pelanggaran otomatis, dan token ujian unik per sesi.',
    color: '#0891B2', bg: '#EFF6FF',
  },
  {
    icon: '⚡',
    title: 'Penilaian Otomatis',
    desc: 'Nilai PG dan B/S langsung setelah submit. Essay dinilai manual dengan interface yang bersih dan efisien.',
    color: '#16A34A', bg: '#F0FDF4',
  },
  {
    icon: '📊',
    title: 'Rekap Nilai Real-time',
    desc: 'Lihat distribusi nilai, persentase lulus, dan detail per siswa. Export rekap kapanpun dibutuhkan.',
    color: '#D97706', bg: '#FFFBEB',
  },
  {
    icon: '🔔',
    title: 'Notifikasi Otomatis',
    desc: 'Siswa langsung dapat notifikasi saat ujian baru tersedia atau nilai keluar. Admin dapat alert pendaftaran masuk.',
    color: '#7C3AED', bg: '#F5F3FF',
  },
  {
    icon: '👥',
    title: 'Manajemen Multi-Peran',
    desc: 'Super admin, admin sekolah, guru, dan siswa — masing-masing punya dashboard dan akses yang tepat.',
    color: '#DC2626', bg: '#FEF2F2',
  },
];

const PRICING = [
  {
    tier: 'Starter',
    price: 'Gratis',
    period: '30 hari pertama',
    color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0',
    desc: 'Cocok untuk sekolah yang baru mulai digitalisasi ujian.',
    features: ['500 siswa', '20 guru', 'Bank soal unlimited', 'Anti-cheat dasar', 'Support email'],
    cta: 'Mulai Gratis',
    highlight: false,
  },
  {
    tier: 'Professional',
    price: 'Rp 299k',
    period: '/bulan',
    color: '#4F46E5', bg: '#EEF2FF', border: '#A5B4FC',
    desc: 'Untuk sekolah aktif dengan kebutuhan ujian rutin.',
    features: ['2.000 siswa', '50 guru', 'Analytics lengkap', 'Anti-cheat penuh', 'Notifikasi email siswa', 'Support prioritas'],
    cta: 'Pilih Professional',
    highlight: true,
  },
  {
    tier: 'Enterprise',
    price: 'Custom',
    period: 'hubungi kami',
    color: '#0891B2', bg: '#EFF6FF', border: '#BAE6FD',
    desc: 'Untuk jaringan sekolah atau dinas pendidikan.',
    features: ['Siswa & guru unlimited', 'Multi-sekolah dashboard', 'Custom domain', 'Integrasi DAPODIK', 'Dedicated support', 'SLA guarantee'],
    cta: 'Hubungi Sales',
    highlight: false,
  },
];

const TESTIMONIALS = [
  {
    name: 'Budi Santoso, S.Pd',
    role: 'Kepala Sekolah · SMAN 1 Bandung',
    avatar: 'B',
    color: '#4F46E5', bg: '#EEF2FF',
    quote: 'ZiDu mengubah cara kami mengadakan ujian. Tidak ada lagi kecurangan, tidak ada lagi kertas bertumpuk. Nilai langsung keluar setelah ujian selesai.',
  },
  {
    name: 'Siti Rahma, M.Pd',
    role: 'Guru Matematika · SMKN 3 Surabaya',
    avatar: 'S',
    color: '#0891B2', bg: '#EFF6FF',
    quote: 'Bank soal yang terstruktur bikin saya bisa fokus ngajar. Buat ujian tinggal pilih soal dari bank, selesai dalam 5 menit.',
  },
  {
    name: 'Ahmad Fauzi',
    role: 'Admin IT · MAN 2 Jakarta',
    avatar: 'A',
    color: '#16A34A', bg: '#F0FDF4',
    quote: 'Setup-nya mudah banget. Dalam satu hari sekolah kami sudah bisa pakai ZiDu untuk ujian semester. Tim support-nya juga responsif.',
  },
];

const FAQS = [
  {
    q: 'Apakah siswa perlu install aplikasi?',
    a: 'Tidak. ZiDu berbasis web — siswa cukup buka browser di laptop atau HP. Tidak ada install apapun.',
  },
  {
    q: 'Bagaimana keamanan data ujian kami?',
    a: 'Data disimpan di Supabase dengan enkripsi end-to-end. Setiap sekolah memiliki isolasi data penuh — data satu sekolah tidak bisa diakses sekolah lain.',
  },
  {
    q: 'Bisakah dipakai untuk ujian nasional atau ANBK?',
    a: 'ZiDu dirancang untuk ujian internal sekolah seperti UH, UTS, UAS, dan Try Out. Untuk ANBK, tetap menggunakan sistem pemerintah.',
  },
  {
    q: 'Bagaimana jika internet putus saat ujian berlangsung?',
    a: 'Jawaban siswa di-save secara otomatis setiap beberapa detik. Jika koneksi terputus, siswa bisa lanjut setelah koneksi kembali tanpa kehilangan jawaban.',
  },
  {
    q: 'Apakah bisa import soal dari Word atau Excel?',
    a: 'Ya! ZiDu mendukung import soal via file CSV. Tersedia template yang bisa langsung diisi dari Excel atau Google Sheets.',
  },
  {
    q: 'Berapa lama proses onboarding sekolah?',
    a: 'Rata-rata sekolah bisa aktif dalam 1 hari kerja. Daftar → verifikasi → setup kelas & guru → langsung bisa buat ujian.',
  },
];

// ── Stat counter card ─────────────────────────────────────────────
const StatCounter = ({ target, suffix, label, visible }) => {
  const val = useCounter(target, visible);
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: '700', color: '#0F172A', lineHeight: 1 }}>
        {val.toLocaleString('id-ID')}{suffix}
      </div>
      <div style={{ fontSize: '14px', color: '#64748B', marginTop: '6px', fontWeight: '500' }}>{label}</div>
    </div>
  );
};

// ── FAQ Item ──────────────────────────────────────────────────────
const FAQItem = ({ q, a, idx }) => {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: '1px solid #F1F5F9' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', textAlign: 'left', padding: '20px 0', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}
      >
        <span style={{ fontFamily: 'Sora, sans-serif', fontSize: '15px', fontWeight: '600', color: '#0F172A', lineHeight: 1.5 }}>{q}</span>
        <span style={{ flexShrink: 0, width: '28px', height: '28px', borderRadius: '8px', background: open ? '#4F46E5' : '#F1F5F9', color: open ? '#fff' : '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: '300', transition: 'all .2s', transform: open ? 'rotate(45deg)' : 'none' }}>+</span>
      </button>
      <div style={{ overflow: 'hidden', maxHeight: open ? '300px' : '0', transition: 'max-height .35s ease', }}>
        <p style={{ paddingBottom: '20px', margin: 0, fontSize: '14px', color: '#475569', lineHeight: 1.75 }}>{a}</p>
      </div>
    </div>
  );
};

// ── Navbar ────────────────────────────────────────────────────────
const Navbar = ({ scrolled }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: scrolled ? 'rgba(255,255,255,.92)' : 'transparent', backdropFilter: scrolled ? 'blur(16px)' : 'none', borderBottom: scrolled ? '1px solid #F1F5F9' : 'none', transition: 'all .3s', }}>
      <div style={{ maxWidth: '1120px', margin: '0 auto', padding: '0 24px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Logo */}
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'linear-gradient(135deg,#4F46E5,#6366F1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: 'Sora, sans-serif', fontSize: '16px', fontWeight: '700', color: '#fff' }}>Z</span>
          </div>
          <span style={{ fontFamily: 'Sora, sans-serif', fontSize: '18px', fontWeight: '700', color: '#0F172A' }}>ZiDu</span>
        </Link>

        {/* Desktop links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }} className="nav-desktop">
          {['Fitur', 'Harga', 'FAQ'].map(l => (
            <a key={l} href={`#${l.toLowerCase()}`}
              style={{ fontSize: '14px', fontWeight: '500', color: '#475569', textDecoration: 'none', transition: 'color .15s' }}
              onMouseEnter={e => e.target.style.color = '#4F46E5'}
              onMouseLeave={e => e.target.style.color = '#475569'}>
              {l}
            </a>
          ))}
        </div>

        {/* CTA buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Link to="/login"
            style={{ padding: '8px 16px', borderRadius: '9px', fontSize: '14px', fontWeight: '600', color: '#475569', textDecoration: 'none', border: '1.5px solid #E2E8F0', background: '#fff', transition: 'all .15s' }}
            onMouseEnter={e => { e.target.style.borderColor = '#4F46E5'; e.target.style.color = '#4F46E5'; }}
            onMouseLeave={e => { e.target.style.borderColor = '#E2E8F0'; e.target.style.color = '#475569'; }}>
            Masuk
          </Link>
          <Link to="/register"
            style={{ padding: '8px 18px', borderRadius: '9px', fontSize: '14px', fontWeight: '700', color: '#fff', textDecoration: 'none', background: 'linear-gradient(135deg,#4F46E5,#6366F1)', boxShadow: '0 2px 8px rgba(79,70,229,.3)', transition: 'transform .15s, box-shadow .15s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(79,70,229,.4)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(79,70,229,.3)'; }}>
            Coba Gratis
          </Link>
        </div>
      </div>
    </nav>
  );
};

// ── Main Landing Page ─────────────────────────────────────────────
const ROLE_ROUTES = { super_admin: '/admin', school_admin: '/school', teacher: '/teacher', student: '/student' };

const LandingPage = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  // Redirect logged-in users to their dashboard
  useEffect(() => {
    if (user && profile) {
      navigate(ROLE_ROUTES[profile.role] ?? '/dashboard', { replace: true });
    }
  }, [user, profile, navigate]);
  const [statsRef, statsVisible] = useInView(0.3);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=DM+Sans:wght@400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { font-family: 'DM Sans', sans-serif; color: #0F172A; background: #fff; overflow-x: hidden; }
        .nav-desktop { display: flex; }
        @media (max-width: 768px) {
          .nav-desktop { display: none; }
          .hero-grid { flex-direction: column !important; }
          .features-grid { grid-template-columns: 1fr !important; }
          .pricing-grid { grid-template-columns: 1fr !important; }
          .stats-grid { grid-template-columns: 1fr 1fr !important; }
          .testimonials-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <Navbar scrolled={scrolled} />

      {/* ── HERO ──────────────────────────────────────────────────── */}
      <section style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', background: 'linear-gradient(160deg, #F8FAFF 0%, #EEF2FF 40%, #F0F9FF 100%)', padding: '100px 24px 80px', position: 'relative', overflow: 'hidden' }}>
        {/* Decorative blobs */}
        <div style={{ position: 'absolute', top: '10%', right: '-100px', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '5%', left: '-80px', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(8,145,178,.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: '1120px', margin: '0 auto', width: '100%' }}>
          <div className="hero-grid" style={{ display: 'flex', alignItems: 'center', gap: '60px' }}>

            {/* Left: Copy */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Badge */}
              <div style={{ opacity: 0, animation: 'fadeUp .5s ease .1s forwards' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 12px', borderRadius: '999px', background: '#EEF2FF', border: '1px solid #C7D2FE', fontSize: '12px', fontWeight: '700', color: '#4F46E5', marginBottom: '24px' }}>
                  ✨ Platform Ujian Digital untuk Sekolah Indonesia
                </span>
              </div>

              <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 'clamp(36px, 5vw, 64px)', fontWeight: '800', lineHeight: 1.15, color: '#0F172A', marginBottom: '20px', opacity: 0, animation: 'fadeUp .5s ease .2s forwards' }}>
                Ujian digital
                <span style={{ display: 'block', background: 'linear-gradient(135deg, #4F46E5, #0891B2)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  tanpa kertas,
                </span>
                tanpa kecurangan.
              </h1>

              <p style={{ fontSize: 'clamp(15px, 2vw, 18px)', color: '#475569', lineHeight: 1.75, maxWidth: '520px', marginBottom: '36px', opacity: 0, animation: 'fadeUp .5s ease .3s forwards' }}>
                ZiDu membantu sekolah mengadakan ujian online yang aman, efisien, dan terukur — dari bank soal hingga rekap nilai, semua dalam satu platform.
              </p>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', opacity: 0, animation: 'fadeUp .5s ease .4s forwards' }}>
                <Link to="/register"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '13px 28px', borderRadius: '12px', background: 'linear-gradient(135deg,#4F46E5,#6366F1)', color: '#fff', fontSize: '15px', fontWeight: '700', textDecoration: 'none', boxShadow: '0 4px 20px rgba(79,70,229,.35)', transition: 'all .2s', fontFamily: 'Sora, sans-serif' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(79,70,229,.4)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(79,70,229,.35)'; }}>
                  Coba Gratis 30 Hari →
                </Link>
                <Link to="/login"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '13px 24px', borderRadius: '12px', border: '1.5px solid #E2E8F0', background: '#fff', color: '#475569', fontSize: '15px', fontWeight: '600', textDecoration: 'none', transition: 'all .2s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#4F46E5'; e.currentTarget.style.color = '#4F46E5'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.color = '#475569'; }}>
                  Sudah punya akun
                </Link>
              </div>

              {/* Trust badges */}
              <div style={{ display: 'flex', gap: '20px', marginTop: '32px', flexWrap: 'wrap', opacity: 0, animation: 'fadeUp .5s ease .5s forwards' }}>
                {['✅ Gratis 30 hari', '🏫 Tanpa kartu kredit', '⚡ Setup < 1 hari'].map(b => (
                  <span key={b} style={{ fontSize: '13px', color: '#64748B', fontWeight: '500' }}>{b}</span>
                ))}
              </div>
            </div>

            {/* Right: UI mockup */}
            <div style={{ flex: '0 0 420px', maxWidth: '420px', opacity: 0, animation: 'fadeUp .6s ease .3s forwards' }}>
              <div style={{ background: '#fff', borderRadius: '20px', boxShadow: '0 24px 64px rgba(0,0,0,.1), 0 2px 8px rgba(0,0,0,.04)', overflow: 'hidden', border: '1px solid #F1F5F9' }}>
                {/* Mockup header */}
                <div style={{ background: 'linear-gradient(135deg,#0F172A,#1E293B)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {['#EF4444','#F59E0B','#22C55E'].map(c => <div key={c} style={{ width: '10px', height: '10px', borderRadius: '50%', background: c }} />)}
                  <div style={{ flex: 1, height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,.1)', marginLeft: '8px' }} />
                </div>
                {/* Mockup content */}
                <div style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div>
                      <div style={{ fontFamily: 'Sora, sans-serif', fontSize: '14px', fontWeight: '700', color: '#0F172A' }}>UAS Matematika XII IPA</div>
                      <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px' }}>40 soal · 90 menit</div>
                    </div>
                    <span style={{ padding: '3px 10px', borderRadius: '999px', background: '#F0FDF4', color: '#16A34A', fontSize: '11px', fontWeight: '700' }}>● Live</span>
                  </div>
                  {/* Progress bars */}
                  {[
                    { name: 'Sedang mengerjakan', val: 28, total: 36, color: '#4F46E5' },
                    { name: 'Selesai', val: 6, total: 36, color: '#16A34A' },
                    { name: 'Belum mulai', val: 2, total: 36, color: '#F59E0B' },
                  ].map(item => (
                    <div key={item.name} style={{ marginBottom: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <span style={{ fontSize: '12px', color: '#475569' }}>{item.name}</span>
                        <span style={{ fontSize: '12px', fontWeight: '600', color: item.color }}>{item.val}/{item.total}</span>
                      </div>
                      <div style={{ height: '6px', borderRadius: '3px', background: '#F1F5F9', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(item.val/item.total)*100}%`, borderRadius: '3px', background: item.color, transition: 'width 1s ease' }} />
                      </div>
                    </div>
                  ))}
                  {/* Stats row */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '16px' }}>
                    {[
                      { label: 'Rata-rata', value: '78.4', color: '#4F46E5' },
                      { label: 'Lulus', value: '83%', color: '#16A34A' },
                      { label: 'Pelanggaran', value: '2', color: '#DC2626' },
                    ].map(s => (
                      <div key={s.label} style={{ background: '#F8FAFC', borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
                        <div style={{ fontFamily: 'Sora, sans-serif', fontSize: '18px', fontWeight: '700', color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '2px' }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── STATS ─────────────────────────────────────────────────── */}
      <section ref={statsRef} style={{ background: '#fff', padding: '64px 24px', borderTop: '1px solid #F1F5F9', borderBottom: '1px solid #F1F5F9' }}>
        <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
          <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '40px' }}>
            {[
              { target: 500,   suffix: '+',  label: 'Sekolah Aktif' },
              { target: 150000, suffix: '+', label: 'Siswa Terdaftar' },
              { target: 2500000, suffix: '+', label: 'Soal Dikerjakan' },
              { target: 99,    suffix: '%',  label: 'Uptime Platform' },
            ].map((s, i) => (
              <StatCounter key={s.label} {...s} visible={statsVisible} />
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────────────── */}
      <section id="fitur" style={{ padding: '96px 24px', background: '#FAFBFF' }}>
        <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
          <FadeUp>
            <div style={{ textAlign: 'center', marginBottom: '56px' }}>
              <span style={{ display: 'inline-block', padding: '4px 14px', borderRadius: '999px', background: '#EEF2FF', color: '#4F46E5', fontSize: '12px', fontWeight: '700', marginBottom: '14px' }}>FITUR UNGGULAN</span>
              <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: '800', color: '#0F172A', marginBottom: '14px' }}>Semua yang dibutuhkan sekolah,<br />dalam satu platform</h2>
              <p style={{ fontSize: '16px', color: '#64748B', maxWidth: '520px', margin: '0 auto', lineHeight: 1.7 }}>Dirancang khusus untuk kebutuhan ujian sekolah di Indonesia — tidak perlu tools lain.</p>
            </div>
          </FadeUp>

          <div className="features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
            {FEATURES.map((f, i) => (
              <FadeUp key={f.title} delay={i * 60}>
                <div
                  style={{ background: '#fff', borderRadius: '16px', padding: '28px', border: '1px solid #F1F5F9', boxShadow: '0 1px 4px rgba(0,0,0,.03)', transition: 'transform .2s, box-shadow .2s', cursor: 'default' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,.08)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,.03)'; }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: f.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', marginBottom: '16px' }}>
                    {f.icon}
                  </div>
                  <h3 style={{ fontFamily: 'Sora, sans-serif', fontSize: '16px', fontWeight: '700', color: '#0F172A', marginBottom: '8px' }}>{f.title}</h3>
                  <p style={{ fontSize: '14px', color: '#64748B', lineHeight: 1.7 }}>{f.desc}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ───────────────────────────────────────────────── */}
      <section id="harga" style={{ padding: '96px 24px', background: '#fff' }}>
        <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
          <FadeUp>
            <div style={{ textAlign: 'center', marginBottom: '56px' }}>
              <span style={{ display: 'inline-block', padding: '4px 14px', borderRadius: '999px', background: '#F0FDF4', color: '#16A34A', fontSize: '12px', fontWeight: '700', marginBottom: '14px' }}>HARGA TRANSPARAN</span>
              <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: '800', color: '#0F172A', marginBottom: '14px' }}>Mulai gratis, bayar saat berkembang</h2>
              <p style={{ fontSize: '16px', color: '#64748B', maxWidth: '480px', margin: '0 auto', lineHeight: 1.7 }}>Tidak ada biaya tersembunyi. Tidak perlu kartu kredit untuk mulai.</p>
            </div>
          </FadeUp>

          <div className="pricing-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', alignItems: 'start' }}>
            {PRICING.map((p, i) => (
              <FadeUp key={p.tier} delay={i * 80}>
                <div style={{ borderRadius: '20px', padding: '32px', border: p.highlight ? `2px solid ${p.color}` : '1.5px solid #F1F5F9', background: p.highlight ? '#fff' : '#FAFBFF', boxShadow: p.highlight ? `0 16px 48px rgba(79,70,229,.12)` : '0 1px 4px rgba(0,0,0,.03)', position: 'relative' }}>
                  {p.highlight && (
                    <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', padding: '4px 16px', borderRadius: '999px', background: '#4F46E5', color: '#fff', fontSize: '11px', fontWeight: '700', whiteSpace: 'nowrap' }}>
                      ⭐ PALING POPULER
                    </div>
                  )}
                  <div style={{ marginBottom: '20px' }}>
                    <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '999px', background: p.bg, color: p.color, fontSize: '12px', fontWeight: '700', marginBottom: '12px' }}>{p.tier}</span>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                      <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 'clamp(28px, 4vw, 36px)', fontWeight: '800', color: '#0F172A' }}>{p.price}</span>
                      <span style={{ fontSize: '14px', color: '#94A3B8' }}>{p.period}</span>
                    </div>
                    <p style={{ fontSize: '13px', color: '#64748B', marginTop: '8px', lineHeight: 1.6 }}>{p.desc}</p>
                  </div>

                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '28px' }}>
                    {p.features.map(f => (
                      <li key={f} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#374151' }}>
                        <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: p.bg, color: p.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '700', flexShrink: 0 }}>✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>

                  <Link to="/register"
                    style={{ display: 'block', textAlign: 'center', padding: '12px', borderRadius: '11px', fontSize: '14px', fontWeight: '700', textDecoration: 'none', background: p.highlight ? `linear-gradient(135deg,${p.color},#6366F1)` : p.bg, color: p.highlight ? '#fff' : p.color, border: p.highlight ? 'none' : `1.5px solid ${p.border}`, transition: 'all .2s', fontFamily: 'Sora, sans-serif', boxShadow: p.highlight ? `0 4px 16px rgba(79,70,229,.3)` : 'none' }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
                    {p.cta}
                  </Link>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ──────────────────────────────────────────── */}
      <section style={{ padding: '96px 24px', background: 'linear-gradient(160deg,#F8FAFF,#EEF2FF)' }}>
        <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
          <FadeUp>
            <div style={{ textAlign: 'center', marginBottom: '56px' }}>
              <span style={{ display: 'inline-block', padding: '4px 14px', borderRadius: '999px', background: '#FFFBEB', color: '#D97706', fontSize: '12px', fontWeight: '700', marginBottom: '14px' }}>TESTIMONI</span>
              <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: '800', color: '#0F172A' }}>Dipercaya oleh pendidik Indonesia</h2>
            </div>
          </FadeUp>

          <div className="testimonials-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
            {TESTIMONIALS.map((t, i) => (
              <FadeUp key={t.name} delay={i * 80}>
                <div style={{ background: '#fff', borderRadius: '16px', padding: '28px', border: '1px solid #F1F5F9', boxShadow: '0 2px 12px rgba(0,0,0,.04)' }}>
                  <p style={{ fontSize: '15px', color: '#374151', lineHeight: 1.75, marginBottom: '20px', fontStyle: 'italic' }}>"{t.quote}"</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Sora, sans-serif', fontWeight: '700', fontSize: '16px', color: t.color, flexShrink: 0 }}>
                      {t.avatar}
                    </div>
                    <div>
                      <div style={{ fontFamily: 'Sora, sans-serif', fontSize: '14px', fontWeight: '700', color: '#0F172A' }}>{t.name}</div>
                      <div style={{ fontSize: '12px', color: '#94A3B8' }}>{t.role}</div>
                    </div>
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────── */}
      <section id="faq" style={{ padding: '96px 24px', background: '#fff' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          <FadeUp>
            <div style={{ textAlign: 'center', marginBottom: '56px' }}>
              <span style={{ display: 'inline-block', padding: '4px 14px', borderRadius: '999px', background: '#F5F3FF', color: '#7C3AED', fontSize: '12px', fontWeight: '700', marginBottom: '14px' }}>FAQ</span>
              <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: 'clamp(28px, 4vw, 38px)', fontWeight: '800', color: '#0F172A' }}>Pertanyaan yang sering ditanya</h2>
            </div>
          </FadeUp>

          <FadeUp delay={100}>
            <div style={{ background: '#FAFBFF', borderRadius: '16px', padding: '8px 32px', border: '1px solid #F1F5F9' }}>
              {FAQS.map((faq, i) => <FAQItem key={i} {...faq} idx={i} />)}
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── CTA BANNER ────────────────────────────────────────────── */}
      <section style={{ padding: '80px 24px', background: 'linear-gradient(135deg,#1E1B4B 0%,#312E81 50%,#1E40AF 100%)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(99,102,241,.2)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-80px', left: '10%', width: '350px', height: '350px', borderRadius: '50%', background: 'rgba(8,145,178,.15)', pointerEvents: 'none' }} />
        <FadeUp>
          <div style={{ maxWidth: '680px', margin: '0 auto', textAlign: 'center', position: 'relative' }}>
            <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: '800', color: '#fff', marginBottom: '16px', lineHeight: 1.2 }}>
              Siap membawa ujian sekolahmu ke era digital?
            </h2>
            <p style={{ fontSize: '16px', color: 'rgba(255,255,255,.7)', marginBottom: '36px', lineHeight: 1.7 }}>
              Bergabung dengan ratusan sekolah yang sudah menggunakan ZiDu. Gratis 30 hari, tidak perlu kartu kredit.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/register"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '14px 32px', borderRadius: '12px', background: '#fff', color: '#4F46E5', fontSize: '15px', fontWeight: '700', textDecoration: 'none', boxShadow: '0 4px 20px rgba(0,0,0,.2)', transition: 'all .2s', fontFamily: 'Sora, sans-serif' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(0,0,0,.25)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,.2)'; }}>
                Daftar Sekolah Gratis →
              </Link>
              <Link to="/login"
                style={{ display: 'inline-flex', alignItems: 'center', padding: '14px 28px', borderRadius: '12px', border: '1.5px solid rgba(255,255,255,.3)', color: '#fff', fontSize: '15px', fontWeight: '600', textDecoration: 'none', transition: 'all .2s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,.7)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,.3)'}>
                Masuk ke Akun
              </Link>
            </div>
          </div>
        </FadeUp>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────── */}
      <footer style={{ background: '#0F172A', padding: '48px 24px 32px' }}>
        <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '40px', marginBottom: '40px' }}>
            {/* Brand */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: 'linear-gradient(135deg,#4F46E5,#6366F1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontFamily: 'Sora, sans-serif', fontSize: '15px', fontWeight: '700', color: '#fff' }}>Z</span>
                </div>
                <span style={{ fontFamily: 'Sora, sans-serif', fontSize: '17px', fontWeight: '700', color: '#fff' }}>ZiDu</span>
              </div>
              <p style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.7 }}>Platform ujian digital untuk sekolah Indonesia. Aman, efisien, dan mudah digunakan.</p>
            </div>

            {/* Links */}
            {[
              { title: 'Produk', links: ['Fitur', 'Harga', 'Keamanan', 'Roadmap'] },
              { title: 'Sekolah', links: ['Daftar Sekolah', 'Masuk', 'Demo', 'Panduan'] },
              { title: 'Perusahaan', links: ['Tentang Kami', 'Blog', 'Karir', 'Kontak'] },
            ].map(col => (
              <div key={col.title}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#94A3B8', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '14px' }}>{col.title}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {col.links.map(l => (
                    <a key={l} href="#" style={{ fontSize: '14px', color: '#475569', textDecoration: 'none', transition: 'color .15s' }}
                      onMouseEnter={e => e.target.style.color = '#fff'}
                      onMouseLeave={e => e.target.style.color = '#475569'}>{l}</a>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div style={{ borderTop: '1px solid #1E293B', paddingTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <p style={{ fontSize: '13px', color: '#475569' }}>© 2026 ZiDu. All Right Reserved.</p>
            <div style={{ display: 'flex', gap: '20px' }}>
              {['Kebijakan Privasi', 'Syarat & Ketentuan'].map(l => (
                <a key={l} href="#" style={{ fontSize: '13px', color: '#475569', textDecoration: 'none', transition: 'color .15s' }}
                  onMouseEnter={e => e.target.style.color = '#94A3B8'}
                  onMouseLeave={e => e.target.style.color = '#475569'}>{l}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
};

export default LandingPage;