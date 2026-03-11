import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  Key, AlertCircle, Clock, ChevronLeft, ChevronRight,
  CheckCircle2, Send, Shield, Eye, EyeOff, BookOpen,
} from 'lucide-react';

// ── Constants ─────────────────────────────────────────────────────
const AUTOSAVE_INTERVAL_MS       = 30_000; // 30 detik
const TIMER_WARNING_THRESHOLD    = 300;    // 5 menit
const EXAM_SAVE_KEY = (id) => `zidu_exam_answers_${id}`;

// ── Helpers ───────────────────────────────────────────────────────
const pad = (n) => String(n).padStart(2, '0');
const formatTime = (secs) => `${pad(Math.floor(secs / 60))}:${pad(secs % 60)}`;

// ── Token Entry Screen ────────────────────────────────────────────
const TokenEntry = ({ onEnter, loading, error }) => {
  const [token, setToken] = useState('');
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0F172A 100%)', padding: '20px', fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ width: '100%', maxWidth: '400px', animation: 'fadeUp .4s ease' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(8,145,178,.2)', border: '1px solid rgba(8,145,178,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Key size={24} style={{ color: '#0891B2' }} />
          </div>
          <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: '24px', fontWeight: '700', color: '#F1F5F9', margin: '0 0 8px' }}>Masuk Ruang Ujian</h1>
          <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>Masukkan token ujian yang diberikan oleh guru</p>
        </div>

        <div style={{ background: 'rgba(255,255,255,.04)', borderRadius: '20px', border: '1px solid rgba(255,255,255,.08)', padding: '28px' }}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#94A3B8', display: 'block', marginBottom: '8px', letterSpacing: '0.05em' }}>TOKEN UJIAN</label>
            <input
              type="text"
              value={token}
              onChange={e => setToken(e.target.value.toUpperCase().slice(0, 8))}
              onKeyDown={e => e.key === 'Enter' && token.length >= 4 && onEnter(token)}
              placeholder="Contoh: AB12CD"
              style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: `1.5px solid ${error ? '#EF4444' : 'rgba(255,255,255,.12)'}`, background: 'rgba(255,255,255,.06)', color: '#F1F5F9', fontSize: '20px', fontFamily: 'Sora, sans-serif', fontWeight: '700', letterSpacing: '0.2em', outline: 'none', textAlign: 'center', boxSizing: 'border-box', transition: 'border-color .2s' }}
              onFocus={e => e.target.style.borderColor = '#0891B2'}
              onBlur={e => e.target.style.borderColor = error ? '#EF4444' : 'rgba(255,255,255,.12)'}
              autoFocus />
            {error && <div style={{ marginTop: '8px', fontSize: '13px', color: '#EF4444', display: 'flex', alignItems: 'center', gap: '6px' }}><AlertCircle size={13} />{error}</div>}
          </div>
          <button
            onClick={() => onEnter(token)}
            disabled={token.length < 4 || loading}
            style={{ width: '100%', padding: '13px', borderRadius: '12px', border: 'none', background: token.length >= 4 && !loading ? '#0891B2' : 'rgba(255,255,255,.08)', color: token.length >= 4 && !loading ? '#fff' : '#475569', fontSize: '14px', fontWeight: '700', cursor: token.length >= 4 && !loading ? 'pointer' : 'not-allowed', fontFamily: "'DM Sans', sans-serif", transition: 'all .2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            {loading
              ? <><div style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />Memverifikasi...</>
              : <><Key size={15} />Masuk Ujian</>}
          </button>
        </div>

        <p style={{ textAlign: 'center', fontSize: '12px', color: '#334155', marginTop: '20px' }}>
          Pastikan koneksi internet stabil sebelum memulai ujian
        </p>
      </div>
    </div>
  );
};

// ── Exam Confirmation Screen ──────────────────────────────────────
const ExamConfirm = ({ session, onStart, onBack }) => (
  <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0F172A 100%)', padding: '20px', fontFamily: "'DM Sans', sans-serif" }}>
    <div style={{ width: '100%', maxWidth: '500px', animation: 'fadeUp .4s ease' }}>
      <div style={{ background: 'rgba(255,255,255,.04)', borderRadius: '20px', border: '1px solid rgba(255,255,255,.08)', padding: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(8,145,178,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BookOpen size={20} style={{ color: '#0891B2' }} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748B', fontWeight: '600' }}>{session.exam_type}</div>
            <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: '18px', fontWeight: '700', color: '#F1F5F9', margin: 0 }}>{session.title}</h2>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '24px' }}>
          {[
            { label: 'Jumlah Soal',   value: `${session.total_questions} soal` },
            { label: 'Durasi',         value: `${session.duration_minutes} menit` },
            { label: 'KKM',            value: session.passing_score },
            { label: 'Max Pelanggaran',value: `${session.max_violations}×` },
          ].map(item => (
            <div key={item.label} style={{ background: 'rgba(255,255,255,.04)', borderRadius: '10px', padding: '12px' }}>
              <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '600', marginBottom: '3px' }}>{item.label}</div>
              <div style={{ fontFamily: 'Sora, sans-serif', fontSize: '16px', fontWeight: '700', color: '#F1F5F9' }}>{item.value}</div>
            </div>
          ))}
        </div>

        <div style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.2)', borderRadius: '12px', padding: '14px 16px', marginBottom: '24px', fontSize: '13px', color: '#FCA5A5', lineHeight: 1.6 }}>
          ⚠ Jangan berpindah tab atau membuka aplikasi lain selama ujian. Setiap pelanggaran akan dicatat.
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onBack}
            style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,.1)', background: 'transparent', color: '#94A3B8', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
            Kembali
          </button>
          <button onClick={onStart}
            style={{ flex: 2, padding: '12px', borderRadius: '10px', border: 'none', background: '#0891B2', color: '#fff', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <CheckCircle2 size={16} /> Mulai Ujian Sekarang
          </button>
        </div>
      </div>
    </div>
  </div>
);

// ── Question Navigator ────────────────────────────────────────────
const QuestionNav = ({ total, current, answers, questions, onGo }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
    {Array.from({ length: total }, (_, i) => {
      const qid = questions?.[i]?.id;
      const answered = qid && answers[qid] !== undefined && answers[qid] !== null && answers[qid] !== '';
      const isCurrent = i === current;
      return (
        <button key={i} onClick={() => onGo(i)}
          style={{ width: '32px', height: '32px', borderRadius: '8px', border: `1.5px solid ${isCurrent ? '#0891B2' : answered ? '#BAE6FD' : '#E2E8F0'}`, background: isCurrent ? '#0891B2' : answered ? '#EFF6FF' : '#F8FAFC', color: isCurrent ? '#fff' : answered ? '#0891B2' : '#94A3B8', fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Sora, sans-serif', transition: 'all .15s' }}>
          {i + 1}
        </button>
      );
    })}
  </div>
);

// ── Exam Room Content ─────────────────────────────────────────────
const ExamRoomContent = ({ session, questions, result, onSubmit, submitting }) => {
  const totalSecs = session.duration_minutes * 60;
  const [current,    setCurrent]    = useState(0);
  const [answers,    setAnswers]    = useState({});
  const [timeLeft,   setTimeLeft]   = useState(totalSecs);
  const [showSubmit, setShowSubmit] = useState(false);
  const violationsRef = useRef(result?.violation_count || 0);

  // ── Restore dari localStorage saat load ───────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem(EXAM_SAVE_KEY(result.id));
      if (saved) {
        const parsed = JSON.parse(saved);
        setAnswers(parsed);
      }
    } catch {}
  }, [result.id]);

  // ── Auto-save ke localStorage setiap jawaban berubah ─────────
  useEffect(() => {
    try {
      localStorage.setItem(EXAM_SAVE_KEY(result.id), JSON.stringify(answers));
    } catch {}
  }, [answers, result.id]);

  // ── Periodic sync ke DB setiap 30 detik ──────────────────────
  useEffect(() => {
    const interval = setInterval(async () => {
      if (Object.keys(answers).length === 0) return;
      const answersArray = questions.map((q) => ({
        question_id: q.id,
        answer: answers[q.id] ?? null,
        type: q.type,
      }));
      try {
        await supabase
          .from('exam_results')
          .update({ answers: answersArray, updated_at: new Date().toISOString() })
          .eq('id', result.id);
      } catch {
        console.warn('[AutoSave] Gagal sync, jawaban masih tersimpan di localStorage');
      }
    }, AUTOSAVE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [answers, questions, result.id]);

  // ── Timer countdown ───────────────────────────────────────────
  // ── Timer countdown ───────────────────────────────────────────
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timer); handleSubmitRef.current?.(true); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []); // intentionally empty: timer hanya boleh start sekali saat mount

  // ── Detect tab switch / visibility change ─────────────────────
  //    result.id & session.max_violations di-capture sebagai primitif
  //    agar deps array stabil dan tidak trigger re-subscribe terus
  useEffect(() => {
    const resultId      = result.id;
    const maxViolations = session.max_violations;

    const handleVisibility = async () => {
      if (document.hidden) {
        try {
          const { data } = await supabase.rpc('append_violation', {
            p_result_id: resultId,
            p_type: 'tab_switch',
          });
          const newCount = data?.violation_count ?? violationsRef.current + 1;
          violationsRef.current = newCount;

          if (newCount >= maxViolations) {
            handleSubmitRef.current?.(true);
          }
        } catch (err) {
          console.error('Gagal mencatat pelanggaran:', err);
          violationsRef.current++;
          if (violationsRef.current >= maxViolations) {
            handleSubmitRef.current?.(true);
          }
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [result.id, session.max_violations]); // primitif — aman & exhaustive

  // ── Submit — scoring dilakukan di server via RPC ──────────────
  const handleSubmit = useCallback((autoSubmit = false) => {
    const answersArray = questions.map((q) => ({
      question_id: q.id,
      answer: answers[q.id] ?? null,
      type: q.type,
    }));
    onSubmit(answersArray, violationsRef.current, autoSubmit);
  }, [answers, questions, onSubmit]);

  // Ref untuk handleSubmit — harus di-declare SETELAH handleSubmit
  // agar tidak terjadi "cannot access before initialization"
  const handleSubmitRef = useRef(null);
  useEffect(() => { handleSubmitRef.current = handleSubmit; }, [handleSubmit]);

  const q = questions[current];

  // Guard: soal tidak ditemukan (seharusnya tidak terjadi, tapi aman)
  if (!q) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
        <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: '18px', color: '#0F172A', marginBottom: '8px' }}>Soal tidak dapat dimuat</h2>
        <p style={{ fontSize: '14px', color: '#64748B' }}>Hubungi guru untuk memastikan bank soal sudah terisi.</p>
      </div>
    </div>
  );

  const answeredCount = questions.filter(q => answers[q.id] !== undefined && answers[q.id] !== null && answers[q.id] !== '').length;
  const timerCritical = timeLeft < TIMER_WARNING_THRESHOLD;
  const optLabels = ['A', 'B', 'C', 'D'];

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: "'DM Sans', sans-serif" }}>
      {/* Top Bar */}
      <div style={{ background: '#fff', borderBottom: '1px solid #F1F5F9', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10, boxShadow: '0 1px 8px rgba(0,0,0,.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BookOpen size={14} style={{ color: '#0891B2' }} />
          </div>
          <div>
            <div style={{ fontFamily: 'Sora, sans-serif', fontSize: '14px', fontWeight: '700', color: '#0F172A' }}>{session.title}</div>
            <div style={{ fontSize: '11px', color: '#94A3B8' }}>{answeredCount}/{questions.length} soal dijawab</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {violationsRef.current > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#DC2626', fontWeight: '600' }}>
              <Shield size={13} />
              {violationsRef.current}/{session.max_violations} pelanggaran
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '7px 14px', borderRadius: '10px', background: timerCritical ? '#FEF2F2' : '#EFF6FF', border: `1px solid ${timerCritical ? '#FECACA' : '#BAE6FD'}` }}>
            <Clock size={14} style={{ color: timerCritical ? '#DC2626' : '#0891B2' }} />
            <span style={{ fontFamily: 'Sora, sans-serif', fontSize: '16px', fontWeight: '700', color: timerCritical ? '#DC2626' : '#0891B2', animation: timerCritical ? 'pulse 1s infinite' : 'none' }}>
              {formatTime(timeLeft)}
            </span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px 20px', display: 'grid', gridTemplateColumns: '1fr 220px', gap: '20px', alignItems: 'start' }}>

        {/* Question Card */}
        <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #F1F5F9', padding: '28px', boxShadow: '0 2px 8px rgba(0,0,0,.04)' }}>
          {/* Question header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Sora, sans-serif', fontWeight: '700', fontSize: '14px', color: '#0891B2', flexShrink: 0 }}>{current + 1}</div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 9px', borderRadius: '999px', background: '#EFF6FF', color: '#0891B2' }}>
                {q.type === 'multiple_choice' ? 'Pilihan Ganda' : q.type === 'essay' ? 'Essay' : 'Benar/Salah'}
              </span>
              <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 9px', borderRadius: '999px', background: q.difficulty === 'easy' ? '#F0FDF4' : q.difficulty === 'hard' ? '#FEF2F2' : '#FFFBEB', color: q.difficulty === 'easy' ? '#16A34A' : q.difficulty === 'hard' ? '#DC2626' : '#D97706' }}>
                {q.difficulty === 'easy' ? 'Mudah' : q.difficulty === 'hard' ? 'Sulit' : 'Sedang'}
              </span>
              <span style={{ fontSize: '11px', fontWeight: '600', padding: '2px 9px', borderRadius: '999px', background: '#F8FAFC', color: '#94A3B8' }}>Bobot: {q.score_weight}</span>
            </div>
          </div>

          {/* Question text */}
          <div style={{ fontSize: '15px', lineHeight: '1.7', color: '#0F172A', marginBottom: '24px', fontWeight: '400' }}>{q.question}</div>

          {/* Answer area */}
          {q.type === 'multiple_choice' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {q.options?.map((opt, i) => {
                const label = optLabels[i];
                const selected = answers[q.id] === label;
                return (
                  <button key={i} onClick={() => setAnswers(a => ({ ...a, [q.id]: label }))}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '13px 16px', borderRadius: '12px', border: `2px solid ${selected ? '#0891B2' : '#E2E8F0'}`, background: selected ? '#EFF6FF' : '#F8FAFC', cursor: 'pointer', textAlign: 'left', transition: 'all .15s', fontFamily: "'DM Sans', sans-serif" }}
                    onMouseEnter={e => { if (!selected) e.currentTarget.style.borderColor = '#BAE6FD'; }}
                    onMouseLeave={e => { if (!selected) e.currentTarget.style.borderColor = '#E2E8F0'; }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: `2px solid ${selected ? '#0891B2' : '#E2E8F0'}`, background: selected ? '#0891B2' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Sora, sans-serif', fontWeight: '700', fontSize: '12px', color: selected ? '#fff' : '#94A3B8', flexShrink: 0, transition: 'all .15s' }}>{label}</div>
                    <span style={{ fontSize: '14px', color: selected ? '#0C4A6E' : '#374151', fontWeight: selected ? '500' : '400' }}>{opt}</span>
                  </button>
                );
              })}
            </div>
          )}

          {q.type === 'true_false' && (
            <div style={{ display: 'flex', gap: '12px' }}>
              {['Benar', 'Salah'].map(v => {
                const selected = answers[q.id] === v;
                return (
                  <button key={v} onClick={() => setAnswers(a => ({ ...a, [q.id]: v }))}
                    style={{ flex: 1, padding: '16px', borderRadius: '12px', border: `2px solid ${selected ? '#0891B2' : '#E2E8F0'}`, background: selected ? '#EFF6FF' : '#F8FAFC', cursor: 'pointer', fontFamily: 'Sora, sans-serif', fontWeight: '700', fontSize: '15px', color: selected ? '#0891B2' : '#94A3B8', transition: 'all .15s' }}>
                    {v === 'Benar' ? '✓ Benar' : '✗ Salah'}
                  </button>
                );
              })}
            </div>
          )}

          {q.type === 'essay' && (
            <textarea
              value={answers[q.id] || ''}
              onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
              placeholder="Tulis jawaban kamu di sini..."
              rows={6}
              style={{ width: '100%', padding: '13px 16px', borderRadius: '12px', border: '1.5px solid #E2E8F0', background: '#F8FAFC', fontSize: '14px', color: '#0F172A', fontFamily: "'DM Sans', sans-serif", outline: 'none', resize: 'vertical', boxSizing: 'border-box', transition: 'border-color .15s', lineHeight: 1.6 }}
              onFocus={e => e.target.style.borderColor = '#0891B2'}
              onBlur={e => e.target.style.borderColor = '#E2E8F0'} />
          )}

          {/* Navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '28px', paddingTop: '20px', borderTop: '1px solid #F1F5F9' }}>
            <button onClick={() => setCurrent(c => Math.max(0, c - 1))} disabled={current === 0}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', borderRadius: '9px', border: '1.5px solid #E2E8F0', background: '#fff', fontSize: '13px', fontWeight: '600', color: '#374151', cursor: current === 0 ? 'not-allowed' : 'pointer', opacity: current === 0 ? 0.4 : 1, fontFamily: "'DM Sans', sans-serif" }}>
              <ChevronLeft size={14} /> Sebelumnya
            </button>
            {current < questions.length - 1
              ? <button onClick={() => setCurrent(c => Math.min(questions.length - 1, c + 1))}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', borderRadius: '9px', border: 'none', background: '#0891B2', fontSize: '13px', fontWeight: '600', color: '#fff', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                  Berikutnya <ChevronRight size={14} />
                </button>
              : <button onClick={() => setShowSubmit(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px', borderRadius: '9px', border: 'none', background: '#16A34A', fontSize: '13px', fontWeight: '700', color: '#fff', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                  <Send size={14} /> Kumpulkan Jawaban
                </button>
            }
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', position: 'sticky', top: '72px' }}>
          <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #F1F5F9', padding: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#94A3B8', marginBottom: '10px', letterSpacing: '0.05em' }}>NAVIGASI SOAL</div>
            <QuestionNav total={questions.length} current={current} answers={answers} questions={questions} onGo={setCurrent} />
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #F8FAFC', display: 'flex', gap: '12px', fontSize: '11px', color: '#64748B' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#EFF6FF', border: '1px solid #BAE6FD', display: 'inline-block' }} /> Dijawab
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#F8FAFC', border: '1px solid #E2E8F0', display: 'inline-block' }} /> Belum
              </span>
            </div>
          </div>

          <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #F1F5F9', padding: '16px' }}>
            <div style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '6px' }}>Progres</div>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#0F172A', marginBottom: '8px' }}>{answeredCount} / {questions.length} soal</div>
            <div style={{ height: '6px', borderRadius: '99px', background: '#F1F5F9', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: '99px', background: '#0891B2', width: `${(answeredCount / questions.length) * 100}%`, transition: 'width .3s' }} />
            </div>
          </div>

          <button onClick={() => setShowSubmit(true)}
            style={{ width: '100%', padding: '12px', borderRadius: '12px', border: 'none', background: '#16A34A', color: '#fff', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px' }}>
            <Send size={14} /> Kumpulkan Jawaban
          </button>
        </div>
      </div>

      {/* Submit Confirm Modal */}
      {showSubmit && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.7)', backdropFilter: 'blur(6px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '20px', padding: '32px', width: '100%', maxWidth: '400px', textAlign: 'center', animation: 'scaleIn .2s ease', fontFamily: "'DM Sans', sans-serif" }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Send size={24} style={{ color: '#16A34A' }} />
            </div>
            <h3 style={{ fontFamily: 'Sora, sans-serif', fontSize: '18px', fontWeight: '700', color: '#0F172A', marginBottom: '8px' }}>Kumpulkan Jawaban?</h3>
            <p style={{ fontSize: '14px', color: '#64748B', lineHeight: 1.6, marginBottom: '8px' }}>
              Kamu sudah menjawab <strong>{answeredCount}</strong> dari <strong>{questions.length}</strong> soal.
            </p>
            {answeredCount < questions.length && (
              <p style={{ fontSize: '13px', color: '#D97706', background: '#FFFBEB', borderRadius: '8px', padding: '8px 12px', marginBottom: '8px' }}>
                ⚠ {questions.length - answeredCount} soal belum dijawab
              </p>
            )}
            <p style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '24px' }}>Setelah dikumpulkan, tidak bisa diubah lagi.</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowSubmit(false)} disabled={submitting}
                style={{ flex: 1, padding: '11px', borderRadius: '10px', border: '1.5px solid #E2E8F0', background: '#fff', fontSize: '13px', fontWeight: '600', color: '#374151', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                Kembali
              </button>
              <button onClick={() => handleSubmit(false)} disabled={submitting}
                style={{ flex: 2, padding: '11px', borderRadius: '10px', border: 'none', background: '#16A34A', color: '#fff', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px' }}>
                {submitting ? <><div style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />Mengumpulkan...</> : <><CheckCircle2 size={14} />Ya, Kumpulkan</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Result Screen ─────────────────────────────────────────────────
const ResultScreen = ({ result, session, onBack }) => {
  const score = result.score !== null ? Math.round(result.score) : null;
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 60%, #0F172A 100%)', padding: '20px', fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ width: '100%', maxWidth: '460px', textAlign: 'center', animation: 'fadeUp .5s ease' }}>
        <div style={{ marginBottom: '28px' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: result.passed ? 'rgba(22,163,74,.2)' : result.passed === false ? 'rgba(220,38,38,.2)' : 'rgba(8,145,178,.2)', border: `2px solid ${result.passed ? 'rgba(22,163,74,.4)' : result.passed === false ? 'rgba(220,38,38,.4)' : 'rgba(8,145,178,.4)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            {result.passed === true
              ? <CheckCircle2 size={40} style={{ color: '#16A34A' }} />
              : result.passed === false
              ? <span style={{ fontSize: '36px' }}>📋</span>
              : <BookOpen size={40} style={{ color: '#0891B2' }} />}
          </div>
          <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: '26px', fontWeight: '700', color: '#F1F5F9', margin: '0 0 8px' }}>
            {result.passed === true ? 'Selamat! Kamu Lulus 🎉' : result.passed === false ? 'Ujian Selesai' : 'Jawaban Dikumpulkan'}
          </h1>
          <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>{session.title}</p>
        </div>

        <div style={{ background: 'rgba(255,255,255,.05)', borderRadius: '20px', border: '1px solid rgba(255,255,255,.08)', padding: '28px', marginBottom: '20px' }}>
          {score !== null ? (
            <>
              <div style={{ fontFamily: 'Sora, sans-serif', fontSize: '64px', fontWeight: '700', color: result.passed ? '#4ADE80' : result.passed === false ? '#F87171' : '#38BDF8', lineHeight: 1, marginBottom: '6px' }}>{score}</div>
              <div style={{ fontSize: '14px', color: '#64748B', marginBottom: '20px' }}>dari 100 · KKM {session.passing_score}</div>
            </>
          ) : (
            <div style={{ fontSize: '16px', color: '#94A3B8', marginBottom: '20px', padding: '16px 0' }}>Jawaban essay akan dinilai oleh guru</div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {[
              { label: 'Benar',     value: result.total_correct    ?? '—', color: '#4ADE80' },
              { label: 'Salah',     value: result.total_wrong      ?? '—', color: '#F87171' },
              { label: 'Kosong',    value: result.total_unanswered ?? '—', color: '#94A3B8' },
              { label: 'Pelanggaran', value: result.violation_count ?? 0,  color: '#FBBF24' },
            ].map(s => (
              <div key={s.label} style={{ background: 'rgba(255,255,255,.04)', borderRadius: '10px', padding: '12px' }}>
                <div style={{ fontFamily: 'Sora, sans-serif', fontSize: '20px', fontWeight: '700', color: s.color }}>{s.value}</div>
                <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <button onClick={onBack}
          style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: '#0891B2', color: '#fff', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
          Kembali ke Dashboard
        </button>
      </div>
    </div>
  );
};

// ── Main ExamRoom Component ───────────────────────────────────────
const ExamRoom = () => {
  const { profile } = useAuth();
  const navigate    = useNavigate();

  const [screen,       setScreen]      = useState('token'); // token | confirm | exam | result
  const [token,        setToken]       = useState('');
  const [session,      setSession]     = useState(null);
  const [questions,    setQuestions]   = useState([]);
  const [result,       setResult]      = useState(null);
  const [tokenError,   setTokenError]  = useState('');
  const [tokenLoading, setTokenLoading]= useState(false);
  const [submitting,   setSubmitting]  = useState(false);

  // Verify token and load session
  const handleEnterToken = async (inputToken) => {
    setTokenLoading(true); setTokenError('');
    try {
      const { data: sessions, error } = await supabase.from('exam_sessions')
        .select('*')
        .eq('token', inputToken.trim().toUpperCase())
        .eq('class_id', profile.class_id)
        .single();

      if (error || !sessions) { setTokenError('Token tidak valid atau bukan untuk kelasmu.'); return; }

      const now   = new Date();
      const start = new Date(sessions.start_time);
      const end   = new Date(sessions.end_time);

      if (now < start) { setTokenError(`Ujian belum dimulai. Mulai: ${start.toLocaleString('id-ID')}`); return; }
      if (now > end)   { setTokenError('Ujian sudah berakhir.'); return; }

      // Check if student already submitted
      const { data: existing } = await supabase.from('exam_results')
        .select('*').eq('exam_session_id', sessions.id).eq('student_id', profile.id).maybeSingle();

      if (existing?.status === 'submitted' || existing?.status === 'graded') {
        setSession(sessions); setResult(existing); setScreen('result'); return;
      }

      // Load questions — TANPA correct_answer (keamanan: jawaban tidak dikirim ke browser)
      const { data: qs } = await supabase.from('questions')
        .select('id, bank_id, type, question, options, image_url, difficulty, tags, score_weight')
        .eq('bank_id', sessions.question_bank_id);

      let questionsToShow = qs || [];
      if (sessions.shuffle_questions) {
        questionsToShow = [...questionsToShow].sort(() => Math.random() - 0.5);
      }

      if (!questionsToShow.length) {
        setTokenError('Bank soal kosong atau belum ada soal. Hubungi guru.');
        return;
      }

      setSession(sessions);
      setQuestions(questionsToShow);

      // Create or resume result record
      if (!existing) {
        const { data: newResult } = await supabase.from('exam_results').insert([{
          exam_session_id: sessions.id,
          student_id: profile.id,
          answers: [],
          status: 'in_progress',
          violation_count: 0,
          violations: [],
          started_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }]).select().single();
        setResult(newResult);
      } else {
        setResult(existing);
      }

      setScreen('confirm');
    } catch (err) { setTokenError(err.message || 'Terjadi kesalahan. Coba lagi.'); }
    finally { setTokenLoading(false); }
  };

  // Submit — scoring dilakukan server-side via RPC (bukan di browser)
  const handleSubmit = async (answersArray, violations, autoSubmit) => {
    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc('calculate_and_submit_exam', {
        p_result_id: result.id,
        p_answers:   answersArray,
      });

      if (error) throw error;

      // Bersihkan localStorage setelah submit berhasil
      try { localStorage.removeItem(`zidu_exam_answers_${result.id}`); } catch {}

      setResult(prev => ({ ...prev, ...data }));
      setScreen('result');
    } catch (err) {
      console.error('Submit error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (screen === 'token')   return <TokenEntry onEnter={handleEnterToken} loading={tokenLoading} error={tokenError} />;
  if (screen === 'confirm') return <ExamConfirm session={session} onStart={() => setScreen('exam')} onBack={() => setScreen('token')} />;
  if (screen === 'exam') {
    // Guard: tunggu sampai result & questions benar-benar ready
    if (!result || !result.id || !questions.length) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', fontFamily: "'DM Sans', sans-serif" }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid #E2E8F0', borderTopColor: '#0891B2', animation: 'spin .8s linear infinite', margin: '0 auto 16px' }} />
            <p style={{ color: '#64748B', fontSize: '14px' }}>Memuat soal ujian...</p>
          </div>
        </div>
      );
    }
    return <ExamRoomContent session={session} questions={questions} result={result} onSubmit={handleSubmit} submitting={submitting} />;
  }
  if (screen === 'result')  return <ResultScreen result={result} session={session} onBack={() => navigate('/student')} />;

  return null;
};

export default ExamRoom;