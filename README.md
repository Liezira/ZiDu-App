# ZiDu — Platform Manajemen Sekolah Digital

Platform absensi, ujian online, rapor, dan analitik berbasis web untuk SMP/SMA/SMK/MA.

## Stack Teknologi

| Layer | Teknologi |
|---|---|
| Frontend | React 19, Vite 7, Tailwind CSS v4 |
| Backend | Supabase (PostgreSQL, Auth, Realtime) |
| Hosting | Vercel |
| Error Monitoring | Sentry (opsional) |
| CI/CD | GitHub Actions |

## Prasyarat

- **Node.js** >= 20
- **npm** >= 10
- Akun [Supabase](https://supabase.com)

## Setup Development

```bash
# 1. Clone & install
git clone https://github.com/your-org/zidu-app.git
cd zidu-app
npm install

# 2. Setup env
cp .env.example .env
# Isi .env dengan Supabase URL dan anon key dari dashboard

# 3. Jalankan
npm run dev
```

## Scripts

| Command | Fungsi |
|---|---|
| `npm run dev` | Dev server dengan HMR |
| `npm run build` | Production build |
| `npm run lint` | ESLint check |

## Arsitektur

```
src/
├── components/
│   ├── layout/         # DashboardLayout, Sidebar
│   ├── shared/         # ErrorBoundary, NavigationProgress, PageLoader
│   └── ui/             # Design system: Button, Input, Select, Modal
├── contexts/           # AuthContext — auth state & profile
├── hooks/              # useDebounce, useExperiment, useNotifications
├── lib/                # supabase, constants, logger, examEvents
├── pages/
│   ├── admin/          # Super admin pages
│   ├── school/         # School admin pages
│   ├── teacher/        # Teacher pages
│   ├── student/        # Student pages (ExamRoom!)
│   └── shared/         # ProfilePage, PendingApproval
└── services/           # Service layer — abstraksi Supabase queries
    ├── examService.js
    ├── attendanceService.js
    └── profileService.js
```

## Role & Akses

| Role | Kemampuan |
|---|---|
| `super_admin` | Kelola semua sekolah & subscription |
| `school_admin` | Kelola guru, siswa, kelas di sekolahnya |
| `teacher` | Buat absensi, ujian, bank soal, input nilai |
| `student` | Ikut ujian, lihat nilai & absensi |

## Deployment (Vercel)

Set environment variables di Vercel Dashboard, lalu:
```bash
vercel --prod
```

Atau connect GitHub repo ke Vercel untuk auto-deploy saat push ke `main`.

## Error Monitoring

1. Buat project di [sentry.io](https://sentry.io)
2. Tambahkan ke `.env`: `VITE_SENTRY_DSN=https://...`
3. Deploy ulang
