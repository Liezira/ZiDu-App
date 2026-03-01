# ZiDu App — Analisis Arsitektur & Rekomendasi Perbaikan

> **Stack:** React 19 + Vite + Supabase (PostgreSQL, Auth, Realtime) + Tailwind CSS v4  
> **Tanggal Review:** Maret 2026  
> **Scope:** Frontend Architecture, Database Design, Security, Performance, Maintainability

---

## Daftar Isi

1. [Ringkasan Eksekutif](#1-ringkasan-eksekutif)
2. [Yang Sudah Bagus — Jangan Diubah](#2-yang-sudah-bagus--jangan-diubah)
3. [Critical Issues — P1 🔴](#3-critical-issues--p1-)
4. [Medium Issues — P2 🟠](#4-medium-issues--p2-)
5. [Optimasi & Efisiensi — P3 🟡](#5-optimasi--efisiensi--p3-)
6. [Maintainability & Code Quality](#6-maintainability--code-quality)
7. [Roadmap Implementasi](#7-roadmap-implementasi)

---

## 1. Ringkasan Eksekutif

ZiDu adalah platform SaaS multi-tenant untuk manajemen ujian sekolah Indonesia. Secara keseluruhan, ini adalah proyek yang **jauh lebih matang dari rata-rata** aplikasi edtech di skala yang sama. Lazy loading sudah diimplementasikan dari awal, AuthContext punya cache-first strategy yang thoughtful, dan UX ExamRoom cukup solid.

Namun ada beberapa **masalah arsitektur serius** yang akan terasa menyakitkan saat user base bertumbuh — terutama di area scoring di client-side, violations tracking, dan inline styling masif yang akan sulit di-maintain.

**Prioritas perbaikan:**

| Kode | Jumlah | Deskripsi |
|------|--------|-----------|
| 🔴 P1 | 4 item | Harus diperbaiki sebelum scale |
| 🟠 P2 | 4 item | Perlu ditangani dalam sprint berikutnya |
| 🟡 P3 | 4 item | Optimasi jangka menengah |

---

## 2. Yang Sudah Bagus — Jangan Diubah

### ✅ Lazy Loading Sudah Benar Dari Awal
```jsx
// App.jsx — ini sudah bagus, jangan diganggu
const SuperAdminDashboard  = lazy(() => import('./pages/admin/SuperAdminDashboard'));
const ExamRoom             = lazy(() => import('./pages/student/ExamRoom'));
// dst...
```
Semua halaman di-lazy-load dengan benar. Initial bundle minimal. Ini salah satu keputusan terbaik di codebase ini.

### ✅ Cache-First AuthContext dengan Background Refresh
```jsx
// contexts/AuthContext.jsx
const getCached = (uid) => { /* TTL 30 menit */ };

// Cache-first → set UI langsung, refresh di background
if (cached) {
  setProfile(cached);
  setLoading(false);
  setTimeout(() => fetchFromDB(authUser), 500); // Silent refresh
  return;
}
```
Pattern ini tepat: user langsung melihat UI tanpa loading, sementara data diverifikasi di background. Banyak developer melupakan pattern ini dan membiarkan loading screen lebih lama dari seharusnya.

### ✅ Guard Double-Fetch di Auth
```jsx
// Mencegah double fetch saat init() dan onAuthStateChange() berjalan bersamaan
if (!initDoneRef.current) return;
```
Fix subtle race condition yang sering menyebabkan "flash of loading screen" saat login. Sudah ditangani dengan benar.

### ✅ Validasi Env Variable Sebelum Client Dibuat
```js
// lib/supabase.js — fail-fast yang tepat
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('❌ Missing VITE_SUPABASE_URL...');
}
```
Ini mencegah silent failure yang sulit di-debug.

### ✅ Optimistic Update di Notifications
```jsx
// useNotifications.js
setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, is_read: true } : n));
setUnreadCount(prev => Math.max(0, prev - 1));
// KEMUDIAN baru update ke DB
await supabase.from('notifications').update(...)
```
UI terasa instan. Pattern yang benar.

### ✅ Bulk Import CSV di QuestionBank
Fitur ini meningkatkan produktivitas guru secara signifikan. Sudah ada template, preview, dan error handling per baris.

---

## 3. Critical Issues — P1 🔴

### 3.1 — Scoring Dilakukan di Client (KERENTANAN KEAMANAN SERIUS)

Ini adalah masalah paling kritis di seluruh codebase.

**Masalah — ExamRoom.jsx:**
```jsx
// ❌ BAHAYA: Logika scoring ada di browser siswa
const handleSubmit = async (answersArray, violations, autoSubmit) => {
  let totalCorrect = 0, totalWrong = 0, totalScore = 0;

  questions.forEach((q, i) => {
    const ans = answersArray[i]?.answer;
    if (ans === q.correct_answer) {  // ← correct_answer ada di client!
      totalCorrect++;
      totalScore += q.score_weight || 1;
    }
  });

  const mcScore = Math.round((totalScore / nonEssayMax) * 100);

  // Lalu mengirim nilai yang sudah dihitung client ke database
  await supabase.from('exam_results').update({
    score: finalScore,  // ← siswa bisa manipulasi ini via DevTools
    mc_score: mcScore,
    total_correct: totalCorrect,
    ...
  })
```

**Masalah ganda:**
1. `correct_answer` di-fetch ke browser saat load soal (`questions.select('*')`) — artinya siswa yang tahu caranya bisa melihat semua jawaban sebelum mengerjakan ujian
2. Nilai dihitung di client — siswa bisa intercept request dan mengirim skor 100 untuk semua soal

**Solusi — Pindahkan scoring ke Supabase RPC:**

```sql
-- supabase/migrations.sql
-- Buat fungsi server-side yang melakukan scoring
CREATE OR REPLACE FUNCTION calculate_and_submit_exam(
  p_result_id UUID,
  p_answers   JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session       exam_sessions%ROWTYPE;
  v_result        exam_results%ROWTYPE;
  v_questions     JSONB;
  v_total_correct INT := 0;
  v_total_wrong   INT := 0;
  v_total_blank   INT := 0;
  v_essay_pending INT := 0;
  v_total_score   NUMERIC := 0;
  v_max_score     NUMERIC := 0;
  v_mc_max        NUMERIC := 0;
  v_mc_score      NUMERIC;
  v_final_score   NUMERIC;
  v_passed        BOOLEAN;
  v_q             JSONB;
  v_answer        TEXT;
BEGIN
  -- Ambil result dan validasi kepemilikan
  SELECT * INTO v_result FROM exam_results WHERE id = p_result_id;
  IF NOT FOUND OR v_result.student_id <> auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Ambil session
  SELECT * INTO v_session FROM exam_sessions WHERE id = v_result.exam_session_id;

  -- Ambil soal DENGAN jawaban benar (aman karena di server)
  SELECT jsonb_agg(row_to_json(q)) INTO v_questions
  FROM questions q WHERE q.bank_id = v_session.question_bank_id;

  -- Hitung skor per soal
  FOR v_q IN SELECT * FROM jsonb_array_elements(v_questions)
  LOOP
    v_max_score := v_max_score + COALESCE((v_q->>'score_weight')::NUMERIC, 1);

    IF v_q->>'type' = 'essay' THEN
      v_essay_pending := v_essay_pending + 1;
      CONTINUE;
    END IF;

    v_mc_max := v_mc_max + COALESCE((v_q->>'score_weight')::NUMERIC, 1);

    -- Cari jawaban siswa untuk soal ini
    SELECT a->>'answer' INTO v_answer
    FROM jsonb_array_elements(p_answers) a
    WHERE a->>'question_id' = v_q->>'id'
    LIMIT 1;

    IF v_answer IS NULL THEN
      v_total_blank := v_total_blank + 1;
    ELSIF v_answer = v_q->>'correct_answer' THEN
      v_total_correct := v_total_correct + 1;
      v_total_score := v_total_score + COALESCE((v_q->>'score_weight')::NUMERIC, 1);
    ELSE
      v_total_wrong := v_total_wrong + 1;
    END IF;
  END LOOP;

  -- Kalkulasi nilai akhir
  v_mc_score := CASE WHEN v_mc_max > 0 THEN ROUND((v_total_score / v_mc_max) * 100) ELSE NULL END;
  v_final_score := CASE WHEN v_essay_pending > 0 THEN NULL ELSE v_mc_score END;
  v_passed := CASE WHEN v_final_score IS NOT NULL THEN v_final_score >= v_session.passing_score ELSE NULL END;

  -- Update result
  UPDATE exam_results SET
    answers             = p_answers,
    score               = v_final_score,
    mc_score            = v_mc_score,
    total_correct       = v_total_correct,
    total_wrong         = v_total_wrong,
    total_unanswered    = v_total_blank,
    total_essay_pending = v_essay_pending,
    status              = CASE WHEN v_essay_pending > 0 THEN 'grading' ELSE 'submitted' END,
    passed              = v_passed,
    submitted_at        = NOW(),
    updated_at          = NOW()
  WHERE id = p_result_id;

  RETURN jsonb_build_object(
    'score', v_final_score, 'mc_score', v_mc_score,
    'total_correct', v_total_correct, 'total_wrong', v_total_wrong,
    'status', CASE WHEN v_essay_pending > 0 THEN 'grading' ELSE 'submitted' END,
    'passed', v_passed
  );
END;
$$;
```

```jsx
// ExamRoom.jsx — update handleSubmit
const handleSubmit = async (answersArray, violations, autoSubmit) => {
  setSubmitting(true);
  try {
    // Kirim HANYA jawaban mentah — server yang hitung skor
    const { data, error } = await supabase.rpc('calculate_and_submit_exam', {
      p_result_id: result.id,
      p_answers: answersArray,
    });
    if (error) throw error;
    setResult({ ...result, ...data });
    setScreen('result');
  } catch (err) {
    console.error('Submit error:', err);
  } finally {
    setSubmitting(false);
  }
};
```

```jsx
// ExamRoom.jsx — saat load soal, JANGAN ambil correct_answer
const { data: qs } = await supabase
  .from('questions')
  .select('id, bank_id, type, question, options, image_url, difficulty, tags, score_weight')
  // ↑ Tidak ada correct_answer di sini
  .eq('bank_id', sessions.question_bank_id);
```

---

### 3.2 — Violation Tracking Menggunakan Direct Update (Race Condition)

**Masalah — ExamRoom.jsx:**
```jsx
// ❌ Ini adalah read-modify-write yang bisa race condition
// Jika dua violations terjadi hampir bersamaan:
violationsRef.current++;
await supabase.from('exam_results').update({
  violation_count: violationsRef.current,  // Tab A kirim 1, Tab B kirim 1 — salah satunya hilang
}).eq('id', result.id);
```

Ada dua masalah tambahan:
```jsx
// ❌ Violations array tidak pernah di-update, hanya violation_count
violations: supabase.rpc ? undefined : undefined, // ← ini tidak melakukan apa-apa!
```
Artinya tidak ada audit trail untuk tipe pelanggaran apa yang terjadi — hanya angka.

**Solusi — Atomic RPC:**
```sql
-- Buat fungsi atomic untuk append violation
CREATE OR REPLACE FUNCTION append_violation(
  p_result_id  UUID,
  p_type       TEXT,
  p_time       TIMESTAMPTZ DEFAULT NOW()
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_new_count INT;
  v_violation JSONB;
BEGIN
  -- Validasi kepemilikan
  IF NOT EXISTS (
    SELECT 1 FROM exam_results
    WHERE id = p_result_id AND student_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  v_violation := jsonb_build_object('type', p_type, 'time', p_time);

  UPDATE exam_results
  SET
    violations      = violations || v_violation,
    violation_count = violation_count + 1,
    updated_at      = NOW()
  WHERE id = p_result_id
  RETURNING violation_count INTO v_new_count;

  RETURN jsonb_build_object('violation_count', v_new_count);
END;
$$;
```

```jsx
// ExamRoom.jsx — update handleVisibility
const handleVisibility = async () => {
  if (document.hidden) {
    try {
      const { data } = await supabase.rpc('append_violation', {
        p_result_id: result.id,
        p_type: 'tab_switch',
      });
      const newCount = data?.violation_count ?? violationsRef.current + 1;
      violationsRef.current = newCount;
      
      if (newCount >= session.max_violations) {
        handleSubmit(true);
      }
    } catch (err) {
      console.error('Failed to record violation:', err);
      // Fallback: increment local dan tetap submit jika perlu
      violationsRef.current++;
    }
  }
};
```

---

### 3.3 — `broadcastToStudents` Membuat N Baris Notifikasi dari Client

**Masalah — useNotifications.js:**
```jsx
// ❌ Fetch semua siswa lalu INSERT massal dari browser
const broadcastToStudents = useCallback(async ({ schoolId, ... }) => {
  const { data: students } = await supabase
    .from('profiles')
    .select('id')
    .eq('school_id', schoolId)
    .eq('role', 'student'); // ← bisa 500+ siswa

  const rows = students.map(s => ({ user_id: s.id, ... }));
  await supabase.from('notifications').insert(rows); // ← 500 baris sekaligus dari browser
}, []);
```

Ini bermasalah karena: payload request besar, bisa timeout, dan tidak scalable.

**Solusi — Edge Function atau Database Function:**
```sql
-- Fungsi server-side untuk broadcast
CREATE OR REPLACE FUNCTION broadcast_notification_to_class(
  p_school_id UUID,
  p_class_id  UUID,
  p_type      TEXT,
  p_title     TEXT,
  p_body      TEXT,
  p_link      TEXT DEFAULT NULL,
  p_metadata  JSONB DEFAULT NULL
)
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_inserted INT;
BEGIN
  INSERT INTO notifications (user_id, type, title, body, link, metadata)
  SELECT id, p_type, p_title, p_body, p_link, p_metadata
  FROM profiles
  WHERE school_id = p_school_id
    AND class_id  = p_class_id
    AND role      = 'student'
    AND status    = 'active';
  
  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$$;
```

```jsx
// useNotifications.js — update broadcastToStudents
const broadcastToStudents = useCallback(async ({ schoolId, classId, ...rest }) => {
  const { data, error } = await supabase.rpc('broadcast_notification_to_class', {
    p_school_id: schoolId,
    p_class_id:  classId,
    p_type:      rest.type,
    p_title:     rest.title,
    p_body:      rest.body,
    p_link:      rest.link ?? null,
    p_metadata:  rest.metadata ?? null,
  });
  return { error, count: data };
}, []);
```

---

### 3.4 — Tidak Ada Offline/Reconnect Handling di ExamRoom

**Masalah:**
```jsx
// ExamRoom.jsx — tidak ada auto-save, tidak ada deteksi offline
// Jika koneksi putus saat ujian, semua jawaban hilang
const setAnswers = (a => ({ ...a, [current]: label }))
// ↑ Hanya di state React, tidak pernah disimpan ke DB sampai submit
```

**Solusi — Auto-save + localStorage backup:**
```jsx
// ExamRoom.jsx — ExamRoomContent component
const SAVE_KEY = (id) => `zidu_exam_answers_${id}`;

// Auto-save ke localStorage setiap kali jawaban berubah
useEffect(() => {
  try {
    localStorage.setItem(SAVE_KEY(result.id), JSON.stringify(answers));
  } catch {}
}, [answers, result.id]);

// Auto-save ke DB setiap 30 detik
useEffect(() => {
  const interval = setInterval(async () => {
    if (Object.keys(answers).length === 0) return;
    const answersArray = questions.map((q, i) => ({
      question_id: q.id,
      answer: answers[i] ?? null,
      type: q.type,
    }));
    try {
      await supabase
        .from('exam_results')
        .update({ answers: answersArray, updated_at: new Date().toISOString() })
        .eq('id', result.id);
    } catch (err) {
      console.warn('[AutoSave] Failed, answers still in localStorage');
    }
  }, 30_000);
  return () => clearInterval(interval);
}, [answers, questions, result.id]);

// Restore dari localStorage saat halaman reload
useEffect(() => {
  try {
    const saved = localStorage.getItem(SAVE_KEY(result.id));
    if (saved) {
      const parsed = JSON.parse(saved);
      setAnswers(parsed);
    }
  } catch {}
}, [result.id]);

// Bersihkan localStorage setelah submit berhasil
const handleSubmit = async (...) => {
  // ... submit logic ...
  localStorage.removeItem(SAVE_KEY(result.id));
};
```

---

## 4. Medium Issues — P2 🟠

### 4.1 — Inline Styles Masif: Maintainability Nightmare

Ini adalah masalah terbesar di seluruh codebase dari sisi maintainability.

**Masalah:**
```jsx
// ExamRoom.jsx — ratusan baris seperti ini
<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center',
  justifyContent: 'center', background: 'linear-gradient(135deg, #0F172A 0%,
  #1E293B 50%, #0F172A 100%)', padding: '20px', fontFamily: "'DM Sans', sans-serif" }}>
```

Proyek sudah punya **Tailwind CSS v4** terpasang tapi hampir tidak digunakan. Ini paradoks yang menyebabkan:
- File seperti ExamRoom.jsx, QuestionBank.jsx, ExamManagement.jsx sangat sulit dibaca
- Tidak bisa memanfaatkan dark mode, responsive variants, atau theming Tailwind
- Sulit di-refactor karena styling dan logic tercampur dalam satu baris panjang
- Atom components seperti `Btn`, `Input`, `SelectField`, `Shimmer`, `Toast` di-duplicate di setiap file

**Solusi — Gunakan Tailwind yang sudah ada:**
```jsx
// ❌ SEBELUM
<div style={{ display: 'flex', alignItems: 'center', gap: '12px',
  padding: '28px', background: '#fff', borderRadius: '16px',
  border: '1px solid #F1F5F9', boxShadow: '0 2px 8px rgba(0,0,0,.04)' }}>

// ✅ SESUDAH
<div className="flex items-center gap-3 p-7 bg-white rounded-2xl
                border border-slate-100 shadow-sm">
```

**Langkah strategis:** Buat `src/components/ui/` yang terpusat dengan komponen yang sudah digunakan berulang:

```jsx
// src/components/ui/Card.jsx
export const Card = ({ children, className = '', ...props }) => (
  <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm p-6 ${className}`} {...props}>
    {children}
  </div>
);

// src/components/ui/Badge.jsx
const VARIANTS = {
  easy:   'bg-green-50 text-green-700 border border-green-200',
  medium: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  hard:   'bg-red-50 text-red-700 border border-red-200',
  info:   'bg-sky-50 text-sky-700 border border-sky-200',
};
export const Badge = ({ variant = 'info', children }) => (
  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${VARIANTS[variant]}`}>
    {children}
  </span>
);

// src/components/ui/Button.jsx — unified, bukan duplikat di setiap file
const STYLES = {
  primary:   'bg-sky-600 hover:bg-sky-700 text-white border-sky-600',
  secondary: 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200',
  danger:    'bg-red-600 hover:bg-red-700 text-white border-red-600',
  success:   'bg-green-600 hover:bg-green-700 text-white border-green-600',
  ghost:     'bg-transparent hover:bg-slate-100 text-slate-600 border-transparent',
};
export const Button = ({ variant = 'primary', size = 'md', loading, icon: Icon, children, ...props }) => (
  <button
    {...props}
    disabled={loading || props.disabled}
    className={`inline-flex items-center gap-1.5 font-semibold rounded-lg border
      transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed
      ${size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2.5 text-sm'}
      ${STYLES[variant]}`}
  >
    {loading ? <Loader2 size={14} className="animate-spin" /> : Icon && <Icon size={14} />}
    {children}
  </button>
);
```

---

### 4.2 — Token Generator Tidak Aman (Math.random)

**Masalah — ExamManagement.jsx:**
```jsx
// ❌ Math.random() BUKAN cryptographically secure
const generateToken = () => Math.random().toString(36).substring(2, 8).toUpperCase();
```

Token ujian menggunakan `Math.random()` yang predictable dan bisa di-brute force. Dengan 6 karakter base-36, hanya ada ~2 miliar kombinasi — mudah di-enumerate oleh script.

**Solusi:**
```jsx
// Gunakan Web Crypto API yang tersedia di semua browser modern
const generateToken = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Hapus karakter ambigu (0,O,I,1)
  const array = new Uint8Array(8);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => chars[byte % chars.length]).join('');
};
```

Atau lebih baik, generate di server saat create exam:
```sql
-- Fungsi generate token yang collision-resistant
CREATE OR REPLACE FUNCTION generate_exam_token()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  token TEXT;
BEGIN
  LOOP
    token := '';
    FOR i IN 1..8 LOOP
      token := token || substr(chars, (random() * 31 + 1)::int, 1);
    END LOOP;
    -- Pastikan tidak collision
    EXIT WHEN NOT EXISTS (SELECT 1 FROM exam_sessions WHERE exam_sessions.token = token);
  END LOOP;
  RETURN token;
END;
$$;
```

---

### 4.3 — `fetchProfile` Melakukan Dua Query Terpisah

**Masalah — AuthContext.jsx:**
```jsx
// ❌ Dua round-trip ke database
const { data: p } = await supabase.from('profiles').select('...').eq('id', authUser.id).maybeSingle();

if (p.role !== 'super_admin' && p.school_id) {
  const { data: s } = await supabase.from('schools').select('...').eq('id', p.school_id).maybeSingle();
  school = s;
}
```

Setiap login atau session restore melakukan 2 query sequential. Di koneksi lambat (yang umum di sekolah Indonesia), ini menambah latency yang tidak perlu.

**Solusi — JOIN dengan Supabase select syntax:**
```jsx
const { data: p, error } = await supabase
  .from('profiles')
  .select(`
    id, school_id, role, name, email, phone,
    avatar_url, nis, class_id, status, rejection_reason,
    schools (
      id, name, subscription_status, subscription_end_date,
      subscription_tier, max_students, max_teachers, school_type
    )
  `)
  .eq('id', authUser.id)
  .maybeSingle();

// Sekarang p.schools sudah berisi data sekolah dalam satu query
const full = p; // Tidak perlu merge manual lagi
```

---

### 4.4 — Atom Components Duplikat di Setiap File

**Masalah:**
Komponen `Input`, `SelectField`, `Btn`, `Shimmer`, `Toast`, `ConfirmDialog` didefinisikan ulang secara lokal di setiap halaman besar:
- `QuestionBank.jsx` — mendefinisikan sendiri
- `ExamManagement.jsx` — mendefinisikan versi berbeda
- `GradesPage.jsx` — mendefinisikan lagi

Ini menyebabkan: bug fix harus diulangi di banyak tempat, style yang tidak konsisten antar halaman, dan file yang sangat panjang (1000+ baris).

**Solusi — Centralize ke `src/components/ui/`:**
```
src/
  components/
    ui/
      Button.jsx     ← sudah ada, perlu diperkaya
      Input.jsx      ← sudah ada, perlu diperkaya
      Badge.jsx      ← buat baru
      Card.jsx       ← buat baru
      Modal.jsx      ← buat baru (menggantikan inline modals)
      Toast.jsx      ← buat baru (singleton, pakai context)
      Shimmer.jsx    ← buat baru
      ConfirmDialog.jsx ← buat baru
      Select.jsx     ← buat baru
```

Kemudian di tiap halaman tinggal import:
```jsx
import { Button, Input, Badge, Card, Modal, useToast } from '@/components/ui';
```

---

## 5. Optimasi & Efisiensi — P3 🟡

### 5.1 — Realtime Connections: Satu per User yang Login

**Masalah — useNotifications.js:**
```jsx
// Setiap user yang login membuka persistent WebSocket ke Supabase
channelRef.current = supabase
  .channel(`notifications:${userId}`)
  .on('postgres_changes', { event: 'INSERT', ... })
  .subscribe();
```

Di Supabase Free tier: 200 concurrent realtime connections. Professional: 500. Jika sekolah punya 300 siswa yang login bersamaan = sudah habis jatah di Free tier.

**Solusi — Polling untuk notifikasi, Realtime hanya untuk exam events:**
```jsx
// useNotifications.js — ganti Realtime dengan polling
useEffect(() => {
  if (!userId) return;
  
  fetchNotifications(); // fetch awal

  // Poll setiap 60 detik — cukup untuk notifikasi
  const interval = setInterval(fetchNotifications, 60_000);
  
  return () => clearInterval(interval);
}, [userId, fetchNotifications]);
```

```jsx
// ExamRoom.jsx — Realtime HANYA untuk exam-critical events
// (misalnya: guru broadcast "exam ended" atau force submit)
const channel = supabase
  .channel(`exam:${result.id}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'exam_results',
    filter: `id=eq.${result.id}`,
  }, (payload) => {
    if (payload.new.status === 'submitted') navigate('/student');
  })
  .subscribe();
```

---

### 5.2 — Profile Cache Disimpan di localStorage Tanpa Enkripsi

**Masalah — AuthContext.jsx:**
```jsx
// Data sensitif (role, NIS, status approval) disimpan plain di localStorage
localStorage.setItem(CACHE_KEY, JSON.stringify({ data, id: uid, ts: Date.now() }));
```

Siapapun yang punya akses ke browser bisa melihat dan bahkan memodifikasi data ini.

**Solusi — Minimal obfuscation + validasi server:**
```jsx
// Opsi 1: Hapus data sensitif dari cache, hanya simpan non-sensitive
const SAFE_CACHE_FIELDS = ['id', 'name', 'email', 'role', 'avatar_url', 'school_id'];

const setCache = (uid, data) => {
  const safeData = Object.fromEntries(
    Object.entries(data).filter(([k]) => SAFE_CACHE_FIELDS.includes(k))
  );
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data: safeData, id: uid, ts: Date.now() }));
  } catch {}
};

// Opsi 2: Selalu re-validate dari server di background (sudah dilakukan)
// tapi tambahkan: jika role di cache berbeda dari server, invalidate session
if (cached.role !== freshData.role) {
  clearCache();
  await supabase.auth.signOut(); // Role berubah → paksa login ulang
}
```

---

### 5.3 — Tidak Ada Error Boundary di Level Halaman

**Masalah — App.jsx:**
```jsx
// Semua lazy-loaded pages dibungkus Suspense tapi tidak ErrorBoundary
const Lazy = ({ children }) => (
  <Suspense fallback={<PageLoader />}>{children}</Suspense>
  // ↑ Jika komponen throw error saat render, seluruh app crash
);
```

**Solusi:**
```jsx
// src/components/shared/ErrorBoundary.jsx
export class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info);
    // TODO: kirim ke Sentry atau monitoring service
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Terjadi Kesalahan</h2>
          <p className="text-slate-500 mb-6 max-w-sm">
            Halaman ini mengalami error. Silakan muat ulang atau kembali ke beranda.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="px-4 py-2 bg-sky-600 text-white rounded-lg text-sm font-semibold"
          >
            Coba Lagi
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// App.jsx — bungkus dengan ErrorBoundary
const Lazy = ({ children }) => (
  <ErrorBoundary>
    <Suspense fallback={<PageLoader />}>{children}</Suspense>
  </ErrorBoundary>
);
```

---

### 5.4 — `window.innerWidth` Dipanggil Saat SSR / Pre-render

**Masalah — DashboardLayout.jsx:**
```jsx
// Crash jika di-render di lingkungan tanpa window (SSR, testing)
const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
```

**Solusi:**
```jsx
const [isMobile, setIsMobile] = useState(
  typeof window !== 'undefined' ? window.innerWidth < 1024 : false
);
```

---

## 6. Maintainability & Code Quality

### 6.1 — Tidak Ada TypeScript

Proyek menggunakan JSX murni tanpa type checking. Untuk aplikasi yang menangani data sensitif (nilai ujian, profil siswa), TypeScript sangat direkomendasikan.

**Minimal JSDoc sebagai alternatif:**
```jsx
/**
 * @typedef {Object} ExamSession
 * @property {string} id
 * @property {string} title
 * @property {number} duration_minutes
 * @property {string} token
 * @property {number} passing_score
 */

/**
 * @param {Object} props
 * @param {ExamSession} props.session
 * @param {() => void} props.onStart
 */
const ExamConfirm = ({ session, onStart }) => { ... };
```

### 6.2 — Magic Numbers Tersebar

```jsx
// ❌ Tersebar di mana-mana tanpa penjelasan
if (timeLeft < 300)   // ← 5 menit? mengapa 300?
token.length > 6      // ← berapa panjang token yang valid?
.limit(MAX_NOTIFS)    // ← ini sudah bagus karena pakai konstanta

// ✅ Ekstrak ke constants file
// src/lib/constants.js
export const EXAM_CONFIG = {
  TIMER_WARNING_THRESHOLD_SECS: 300,  // 5 menit
  MIN_TOKEN_LENGTH: 4,
  MAX_TOKEN_LENGTH: 8,
  AUTOSAVE_INTERVAL_MS: 30_000,
  VIOLATION_GRACE_MS: 1_200,
};

export const CACHE_CONFIG = {
  PROFILE_TTL_MS: 30 * 60 * 1000,
  MAX_NOTIFICATIONS: 50,
};
```

### 6.3 — useEffect Dependencies Tidak Lengkap

```jsx
// ExamRoom.jsx — handleVisibility menggunakan result.id dan session
// tapi dependencies array tidak mencantumkannya
useEffect(() => {
  const handleVisibility = async () => {
    // menggunakan: result.id, session.max_violations, handleSubmit
  };
  document.addEventListener('visibilitychange', handleVisibility);
  return () => document.removeEventListener('visibilitychange', handleVisibility);
}, [result?.id]); // ← session.max_violations dan handleSubmit hilang
```

Aktifkan ESLint rule `react-hooks/exhaustive-deps` untuk catch ini secara otomatis:
```json
// eslint.config.js
rules: {
  "react-hooks/exhaustive-deps": "warn",
}
```

---

## 7. Roadmap Implementasi

Urutkan berdasarkan **dampak × kemudahan implementasi:**

### Sprint 1 — Security Foundation (3-4 hari)
- [ ] `calculate_and_submit_exam` RPC — pindahkan scoring ke server
- [ ] Hapus `correct_answer` dari query load soal di client
- [ ] `append_violation` RPC — atomic violation tracking
- [ ] Update `generateToken` ke `crypto.getRandomValues()`

### Sprint 2 — Reliability (2-3 hari)
- [ ] Auto-save answers ke localStorage setiap perubahan
- [ ] Periodic sync ke DB setiap 30 detik selama exam
- [ ] Restore dari localStorage saat page reload
- [ ] `broadcast_notification_to_class` RPC

### Sprint 3 — Architecture Cleanup (3-4 hari)
- [ ] Centralize komponen UI (`Button`, `Input`, `Badge`, `Card`, `Modal`, `Toast`)
- [ ] Migrasi `fetchProfile` ke single JOIN query
- [ ] Tambahkan `ErrorBoundary` di level halaman
- [ ] Ganti Realtime notifications dengan polling

### Sprint 4 — Code Quality (2-3 hari)
- [ ] Ekstrak magic numbers ke `src/lib/constants.js`
- [ ] Fix `useEffect` dependencies yang tidak lengkap
- [ ] Fix `window.innerWidth` SSR-safety
- [ ] Mulai migrasi inline styles ke Tailwind (halaman per halaman)

### Estimasi Total
~10-14 hari kerja untuk satu developer. Sprint 1 dan 2 adalah **blocker** untuk production deployment yang aman.

---

## Quick Reference — Perubahan Terpenting

| # | File | Perubahan | Prioritas |
|---|------|-----------|-----------|
| 1 | `ExamRoom.jsx` | Pindahkan scoring ke RPC `calculate_and_submit_exam` | 🔴 P1 |
| 2 | `ExamRoom.jsx` | Hapus `correct_answer` dari query soal | 🔴 P1 |
| 3 | `ExamRoom.jsx` | Ganti violation tracking ke RPC `append_violation` | 🔴 P1 |
| 4 | `ExamRoom.jsx` | Tambahkan auto-save + localStorage backup | 🔴 P1 |
| 5 | `useNotifications.js` | `broadcastToStudents` via RPC, bukan client | 🟠 P2 |
| 6 | `ExamManagement.jsx` | Ganti `Math.random()` ke `crypto.getRandomValues()` | 🟠 P2 |
| 7 | `AuthContext.jsx` | Merge dua query profile+school jadi satu JOIN | 🟠 P2 |
| 8 | Semua halaman besar | Centralize atom components ke `src/components/ui/` | 🟠 P2 |
| 9 | `useNotifications.js` | Ganti Realtime dengan polling 60 detik | 🟡 P3 |
| 10 | `App.jsx` | Tambahkan `ErrorBoundary` di `Lazy` wrapper | 🟡 P3 |
| 11 | Semua file | Ekstrak magic numbers ke `constants.js` | 🟡 P3 |
| 12 | Semua halaman | Migrasi inline styles ke Tailwind secara bertahap | 🟡 P3 |

---

*ZiDu Architecture Analysis — Maret 2026*
