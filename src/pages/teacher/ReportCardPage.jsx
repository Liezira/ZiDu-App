-- ============================================================
-- FIX: get_report_card — column es.subject_id does not exist
-- 
-- ROOT CAUSE:
--   Tabel exam_sessions TIDAK memiliki kolom subject_id.
--   Subject hanya bisa diambil melalui:
--   exam_sessions → question_banks → subjects
--
-- CARA APPLY:
--   Supabase Dashboard → SQL Editor → Paste & Run
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_report_card(
  p_student_id  uuid,
  p_date_from   date,
  p_date_to     date,
  p_teacher_id  uuid DEFAULT NULL   -- NULL = semua guru (untuk admin)
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_student       jsonb;
  v_class         jsonb;
  v_school        jsonb;
  v_grades        jsonb;
  v_attendance    jsonb;
  v_ranking       jsonb;
  v_class_id      uuid;
  v_school_id     uuid;
  v_avg_score     numeric;
  v_student_rank  int;
  v_total_siswa   int;
BEGIN

  -- ── 1. DATA SISWA ─────────────────────────────────────────
  SELECT
    jsonb_build_object(
      'id',        p.id,
      'name',      p.name,
      'nis',       p.nis,
      'email',     p.email,
      'avatar_url',p.avatar_url,
      'class_id',  p.class_id
    ),
    p.class_id,
    p.school_id
  INTO v_student, v_class_id, v_school_id
  FROM public.profiles p
  WHERE p.id = p_student_id;

  IF v_student IS NULL THEN
    RETURN jsonb_build_object('error', 'Student not found');
  END IF;

  -- ── 2. DATA KELAS ─────────────────────────────────────────
  SELECT jsonb_build_object(
    'id',            c.id,
    'name',          c.name,
    'grade_level',   c.grade_level,
    'academic_year', c.academic_year,
    'jurusan',       c.jurusan
  )
  INTO v_class
  FROM public.classes c
  WHERE c.id = v_class_id;

  -- ── 3. DATA SEKOLAH ───────────────────────────────────────
  SELECT jsonb_build_object(
    'id',      s.id,
    'name',    s.name,
    'address', s.address,
    'phone',   s.phone,
    'email',   s.email
  )
  INTO v_school
  FROM public.schools s
  WHERE s.id = v_school_id;

  -- ── 4. NILAI UJIAN (GRADES) ───────────────────────────────
  -- FIX UTAMA: subject_id diambil dari question_banks (qb),
  -- BUKAN dari exam_sessions (es) yang tidak punya kolom tsb.
  SELECT jsonb_agg(
    jsonb_build_object(
      'exam_session_id', es.id,
      'title',           es.title,
      'exam_type',       es.exam_type,
      'date',            es.start_time::date,
      'score',           er.score,
      'mc_score',        er.mc_score,
      'essay_score',     er.essay_score,
      'passed',          er.passed,
      'passing_score',   es.passing_score,
      'subject_id',      qb.subject_id,          -- ✅ dari question_banks
      'subject_name',    subj.name,               -- ✅ join via question_banks
      'subject_code',    subj.code                -- ✅ join via question_banks
    )
    ORDER BY es.start_time ASC
  )
  INTO v_grades
  FROM public.exam_results er
  JOIN public.exam_sessions es  ON es.id  = er.exam_session_id
  JOIN public.question_banks qb ON qb.id  = es.question_bank_id   -- ✅ FIX: lewat sini
  JOIN public.subjects subj     ON subj.id = qb.subject_id         -- ✅ FIX: baru ke subjects
  WHERE er.student_id  = p_student_id
    AND er.status       IN ('submitted', 'graded')
    AND es.start_time  >= p_date_from::timestamptz
    AND es.start_time  <  (p_date_to + interval '1 day')::timestamptz
    AND (p_teacher_id IS NULL OR es.teacher_id = p_teacher_id)  -- filter guru jika ada
    AND es.is_remedial  = false;  -- exclude sesi remedial dari rapor utama

  -- ── 5. REKAP KEHADIRAN ────────────────────────────────────
  SELECT jsonb_build_object(
    'total_sesi',   COUNT(*)                                          FILTER (WHERE TRUE),
    'total_hadir',  COUNT(*) FILTER (WHERE ar.status = 'hadir'),
    'total_izin',   COUNT(*) FILTER (WHERE ar.status = 'izin'),
    'total_sakit',  COUNT(*) FILTER (WHERE ar.status = 'sakit'),
    'total_alpha',  COUNT(*) FILTER (WHERE ar.status = 'alpha'),
    'pct_hadir',    ROUND(
                      COUNT(*) FILTER (WHERE ar.status = 'hadir') * 100.0
                      / NULLIF(COUNT(*), 0)
                    , 1)
  )
  INTO v_attendance
  FROM public.attendance_records ar
  JOIN public.attendance_sessions att_s ON att_s.id = ar.attendance_session_id
  WHERE ar.student_id  = p_student_id
    AND att_s.class_id = v_class_id
    AND att_s.date    >= p_date_from
    AND att_s.date    <= p_date_to
    AND (p_teacher_id IS NULL OR att_s.teacher_id = p_teacher_id);

  -- ── 6. RANKING KELAS ──────────────────────────────────────
  -- Hitung rata-rata nilai siswa ini dalam periode
  SELECT ROUND(AVG(er2.score), 1)
  INTO v_avg_score
  FROM public.exam_results er2
  JOIN public.exam_sessions es2 ON es2.id = er2.exam_session_id
  WHERE er2.student_id = p_student_id
    AND er2.status     IN ('submitted', 'graded')
    AND es2.start_time >= p_date_from::timestamptz
    AND es2.start_time <  (p_date_to + interval '1 day')::timestamptz
    AND (p_teacher_id IS NULL OR es2.teacher_id = p_teacher_id)
    AND es2.is_remedial = false;

  -- Hitung total siswa aktif di kelas
  SELECT COUNT(*)
  INTO v_total_siswa
  FROM public.profiles
  WHERE class_id = v_class_id
    AND role      = 'student'
    AND status    = 'active';

  -- Hitung ranking: berapa siswa di kelas ini yang avg-nya > avg siswa ini
  WITH class_avgs AS (
    SELECT
      p2.id,
      ROUND(AVG(er3.score), 1) AS avg_score
    FROM public.profiles p2
    JOIN public.exam_results er3  ON er3.student_id = p2.id
    JOIN public.exam_sessions es3 ON es3.id = er3.exam_session_id
    WHERE p2.class_id   = v_class_id
      AND p2.role       = 'student'
      AND p2.status     = 'active'
      AND er3.status    IN ('submitted', 'graded')
      AND es3.start_time >= p_date_from::timestamptz
      AND es3.start_time <  (p_date_to + interval '1 day')::timestamptz
      AND (p_teacher_id IS NULL OR es3.teacher_id = p_teacher_id)
      AND es3.is_remedial = false
    GROUP BY p2.id
  )
  SELECT COUNT(*) + 1
  INTO v_student_rank
  FROM class_avgs
  WHERE avg_score > COALESCE(v_avg_score, 0);

  v_ranking := jsonb_build_object(
    'avg_score',    COALESCE(v_avg_score, 0),
    'rank',         v_student_rank,
    'total_siswa',  v_total_siswa
  );

  -- ── 7. RETURN SEMUA DATA ──────────────────────────────────
  RETURN jsonb_build_object(
    'student',    v_student,
    'class',      v_class,
    'school',     v_school,
    'grades',     COALESCE(v_grades, '[]'::jsonb),
    'attendance', COALESCE(v_attendance, jsonb_build_object(
                    'total_sesi',  0, 'total_hadir', 0, 'total_izin',  0,
                    'total_sakit', 0, 'total_alpha', 0, 'pct_hadir',   0
                  )),
    'ranking',    v_ranking,
    'period',     jsonb_build_object(
                    'date_from', p_date_from,
                    'date_to',   p_date_to
                  )
  );

END;
$$;

-- ── Grant akses ke authenticated users ──────────────────────
GRANT EXECUTE ON FUNCTION public.get_report_card(uuid, date, date, uuid)
  TO authenticated;