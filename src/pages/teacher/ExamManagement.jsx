import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  FileText, Plus, Search, RefreshCw, Edit2, Trash2, X, Save,
  AlertCircle, CheckCircle2, ChevronDown, MoreVertical, Clock,
  Users, Key, Eye, Copy, Play, Square, Calendar, BookOpen,
  BarChart2, Zap, Shield, Timer, ArrowLeft, Radio,
} from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const fmtTime = (d) => d ? new Date(d).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '';
const fmtDateTime = (d) => d ? `${fmtDate(d)}, ${fmtTime(d)}` : '—';

const getSessionStatus = (session) => {
  const now = new Date();
  const start = new Date(session.start_time);
  const end   = new Date(session.end_time);
  if (now < start) return 'upcoming';
  if (now >= start && now <= end) return 'live';
  return 'ended';
};

const STATUS_META = {
  upcoming: { label: 'Akan Datang', bg: '#FFFBEB', color: '#D97706', border: '#FDE68A', dot: '#D97706' },
  live:     { label: 'Berlangsung', bg: '#F0FDF4', color: '#16A34A', border: '#BBF7D0', dot: '#16A34A' },
  ended:    { label: 'Selesai',     bg: '#F8FAFC', color: '#64748B', border: '#E2E8F0', dot: '#94A3B8' },
};

const TOKEN_STATUS_META = {
  active:  { label: 'Aktif',      bg: '#F0FDF4', color: '#16A34A' },
  used:    { label: 'Sudah Pakai', bg: '#F8FAFC', color: '#64748B' },
  expired: { label: 'Expired',    bg: '#FEF2F2', color: '#DC2626' },
};

const generateToken = () => Math.random().toString(36).substring(2, 8).toUpperCase();

// ── Atoms ─────────────────────────────────────────────────────────
const Input = ({ label, required, error, hint, ...props }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
    {label && <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151' }}>{label}{required && <span style={{ color: '#EF4444', marginLeft: '2px' }}>*</span>}</label>}
    <input {...props} style={{ padding: '9px 12px', borderRadius: '9px', fontSize: '13px', color: '#0F172A', fontFamily: "'DM Sans', sans-serif", border: `1.5px solid ${error ? '#FCA5A5' : '#E2E8F0'}`, background: '#F8FAFC', outline: 'none', width: '100%', boxSizing: 'border-box', transition: 'border-color .15s, box-shadow .15s', ...props.style }}
      onFocus={e => { e.target.style.borderColor = '#0891B2'; e.target.style.boxShadow = '0 0 0 3px rgba(8,145,178,.1)'; e.target.style.background = '#fff'; }}
      onBlur={e => { e.target.style.borderColor = error ? '#FCA5A5' : '#E2E8F0'; e.target.style.boxShadow = 'none'; e.target.style.background = '#F8FAFC'; }} />
    {error && <span style={{ fontSize: '11px', color: '#EF4444' }}>{error}</span>}
    {hint && !error && <span style={{ fontSize: '11px', color: '#94A3B8' }}>{hint}</span>}
  </div>
);

const SelectField = ({ label, required, error, options, placeholder, ...props }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
    {label && <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151' }}>{label}{required && <span style={{ color: '#EF4444', marginLeft: '2px' }}>*</span>}</label>}
    <div style={{ position: 'relative' }}>
      <select {...props} style={{ padding: '9px 32px 9px 12px', borderRadius: '9px', fontSize: '13px', color: props.value ? '#0F172A' : '#94A3B8', fontFamily: "'DM Sans', sans-serif", border: `1.5px solid ${error ? '#FCA5A5' : '#E2E8F0'}`, background: '#F8FAFC', outline: 'none', width: '100%', appearance: 'none', cursor: 'pointer', transition: 'border-color .15s', ...props.style }}
        onFocus={e => { e.target.style.borderColor = '#0891B2'; e.target.style.boxShadow = '0 0 0 3px rgba(8,145,178,.1)'; }}
        onBlur={e => { e.target.style.borderColor = error ? '#FCA5A5' : '#E2E8F0'; e.target.style.boxShadow = 'none'; }}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
      </select>
      <ChevronDown size={13} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
    </div>
    {error && <span style={{ fontSize: '11px', color: '#EF4444' }}>{error}</span>}
  </div>
);

const Btn = ({ children, variant = 'primary', icon: Icon, loading, sm, ...props }) => {
  const S = {
    primary:   ['#0891B2', '#fff', '#0891B2', '#0E7490'],
    secondary: ['#fff', '#374151', '#E2E8F0', '#F1F5F9'],
    danger:    ['#DC2626', '#fff', '#DC2626', '#B91C1C'],
    ghost:     ['transparent', '#64748B', 'transparent', '#F1F5F9'],
    success:   ['#16A34A', '#fff', '#16A34A', '#15803D'],
  };
  const [bg, color, border, hbg] = S[variant] || S.primary;
  return (
    <button {...props} disabled={loading || props.disabled}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: sm ? '6px 12px' : '9px 16px', borderRadius: '9px', fontSize: sm ? '12px' : '13px', fontWeight: '600', cursor: loading || props.disabled ? 'not-allowed' : 'pointer', opacity: loading || props.disabled ? 0.6 : 1, background: bg, color, border: `1.5px solid ${border}`, fontFamily: "'DM Sans', sans-serif", transition: 'all .15s', whiteSpace: 'nowrap', ...props.style }}
      onMouseEnter={e => { if (!loading && !props.disabled) e.currentTarget.style.background = hbg; }}
      onMouseLeave={e => { e.currentTarget.style.background = bg; }}>
      {loading ? <div style={{ width: '13px', height: '13px', border: '2px solid rgba(255,255,255,.3)', borderTopColor: color, borderRadius: '50%', animation: 'spin .7s linear infinite' }} /> : Icon && <Icon size={sm ? 12 : 14} />}
      {children}
    </button>
  );
};

const Shimmer = ({ h = 14, w = '100%', r = 6 }) => (
  <div style={{ height: h, width: w, borderRadius: r, background: 'linear-gradient(90deg,#F1F5F9 25%,#E2E8F0 50%,#F1F5F9 75%)', backgroundSize: '800px 100%', animation: 'shimmer 1.2s infinite' }} />
);

const Toast = ({ msg, type }) => (
  <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 300, display: 'flex', alignItems: 'center', gap: '10px', padding: '13px 18px', borderRadius: '12px', background: type === 'error' ? '#DC2626' : '#0F172A', color: '#fff', fontSize: '13px', fontWeight: '500', boxShadow: '0 8px 30px rgba(0,0,0,.2)', fontFamily: "'DM Sans', sans-serif", animation: 'slideUp .25s ease' }}>
    {type === 'error' ? <AlertCircle size={15} /> : <CheckCircle2 size={15} style={{ color: '#4ADE80' }} />}{msg}
  </div>
);

const ConfirmDialog = ({ open, title, message, onConfirm, onCancel, loading }) => {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.6)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: '#fff', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '400px', boxShadow: '0 25px 60px rgba(0,0,0,.2)', animation: 'scaleIn .2s ease' }}>
        <h3 style={{ fontFamily: 'Sora, sans-serif', fontSize: '17px', fontWeight: '700', color: '#0F172A', marginBottom: '10px' }}>{title}</h3>
        <p style={{ fontSize: '14px', color: '#64748B', lineHeight: '1.6', marginBottom: '24px' }}>{message}</p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <Btn variant="secondary" onClick={onCancel} disabled={loading}>Batal</Btn>
          <Btn variant="danger" onClick={onConfirm} loading={loading}>Ya, Hapus</Btn>
        </div>
      </div>
    </div>
  );
};

// ── Token Display ─────────────────────────────────────────────────
const TokenDisplay = ({ token, onCopy }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(token).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); onCopy?.(); });
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#0F172A', borderRadius: '12px', padding: '12px 16px' }}>
      <Key size={14} style={{ color: '#94A3B8', flexShrink: 0 }} />
      <span style={{ fontFamily: 'Sora, sans-serif', fontSize: '22px', fontWeight: '700', color: '#F0FDF4', letterSpacing: '0.2em', flex: 1 }}>{token}</span>
      <button onClick={copy} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '8px', border: 'none', background: copied ? '#16A34A' : '#1E293B', color: copied ? '#fff' : '#94A3B8', fontSize: '12px', fontWeight: '600', cursor: 'pointer', transition: 'all .2s', fontFamily: "'DM Sans', sans-serif" }}>
        {copied ? <><CheckCircle2 size={12} /> Tersalin</> : <><Copy size={12} /> Salin</>}
      </button>
    </div>
  );
};

// ── Exam Modal ────────────────────────────────────────────────────
const ExamModal = ({ open, session, banks, classes, schoolId, teacherId, onClose, onSaved }) => {
  const isEdit = !!session?.id;
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const toLocalDatetime = (d) => {
    if (!d) return '';
    const dt = new Date(d);
    return `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
  };

  const EMPTY = {
    title: '', description: '', exam_type: 'Ulangan Harian',
    question_bank_id: '', class_id: '',
    start_time: toLocalDatetime(new Date(now.getTime() + 60*60*1000)),
    end_time:   toLocalDatetime(new Date(now.getTime() + 3*60*60*1000)),
    duration_minutes: 90, passing_score: 75,
    allow_review: false, shuffle_questions: true, show_result_immediately: true,
    max_violations: 3, token: generateToken(),
  };

  const [form, setForm]     = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState('');

  useEffect(() => {
    if (open) {
      if (session) {
        setForm({
          title:                  session.title || '',
          description:            session.description || '',
          exam_type:              session.exam_type || 'Ulangan Harian',
          question_bank_id:       session.question_bank_id || '',
          class_id:               session.class_id || '',
          start_time:             toLocalDatetime(session.start_time),
          end_time:               toLocalDatetime(session.end_time),
          duration_minutes:       session.duration_minutes || 90,
          passing_score:          session.passing_score || 75,
          allow_review:           session.allow_review ?? false,
          shuffle_questions:      session.shuffle_questions ?? true,
          show_result_immediately:session.show_result_immediately ?? true,
          max_violations:         session.max_violations || 3,
          token:                  session.token || generateToken(),
        });
      } else {
        setForm({ ...EMPTY, token: generateToken() });
      }
      setErrors({}); setSaveErr('');
    }
  }, [open, session]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.title.trim())          e.title = 'Judul ujian wajib diisi';
    if (!form.question_bank_id)      e.question_bank_id = 'Bank soal wajib dipilih';
    if (!form.class_id)              e.class_id = 'Kelas wajib dipilih';
    if (!form.start_time)            e.start_time = 'Waktu mulai wajib diisi';
    if (!form.end_time)              e.end_time = 'Waktu selesai wajib diisi';
    if (form.start_time && form.end_time && new Date(form.start_time) >= new Date(form.end_time))
      e.end_time = 'Waktu selesai harus setelah waktu mulai';
    if (!form.duration_minutes || form.duration_minutes < 1) e.duration_minutes = 'Durasi minimal 1 menit';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true); setSaveErr('');
    try {
      const selectedBank = banks.find(b => b.id === form.question_bank_id);
      const payload = {
        title:                   form.title.trim(),
        description:             form.description.trim() || null,
        exam_type:               form.exam_type,
        question_bank_id:        form.question_bank_id,
        class_id:                form.class_id,
        start_time:              new Date(form.start_time).toISOString(),
        end_time:                new Date(form.end_time).toISOString(),
        duration_minutes:        parseInt(form.duration_minutes),
        passing_score:           parseInt(form.passing_score),
        total_questions:         selectedBank?.total_questions || 0,
        allow_review:            form.allow_review,
        shuffle_questions:       form.shuffle_questions,
        show_result_immediately: form.show_result_immediately,
        max_violations:          parseInt(form.max_violations),
        updated_at:              new Date().toISOString(),
      };
      const { error, data: savedData } = isEdit
        ? await supabase.from('exam_sessions').update(payload).eq('id', session.id).select('id').single()
        : await supabase.from('exam_sessions').insert([{
            ...payload, token: form.token, token_status: 'active',
            school_id: schoolId, teacher_id: teacherId,
            created_at: new Date().toISOString(),
          }]).select('id').single();
      if (error) throw error;

      // Kirim notifikasi ke semua siswa aktif di sekolah (hanya saat CREATE baru)
      if (!isEdit && form.class_id) {
        // Notify students in this class
        const { data: classStudents } = await supabase
          .from('profiles')
          .select('id')
          .eq('class_id', form.class_id)
          .eq('role', 'student')
          .eq('status', 'active');
        if (classStudents?.length) {
          await supabase.from('notifications').insert(
            classStudents.map(s => ({
              user_id:  s.id,
              type:     'exam_new',
              title:    'Ujian Baru Tersedia! 📝',
              body:     `${payload.title} — ${payload.exam_type}. Mulai: ${new Date(payload.start_time).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`,
              link:     '/student',
              metadata: { exam_session_id: savedData?.id },
            }))
          );
        }
      }

      onSaved(); onClose();
    } catch (err) { setSaveErr(err.message); }
    finally { setSaving(false); }
  };

  const Toggle = ({ label, checked, onChange, hint }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '9px', background: '#F8FAFC', border: '1px solid #F1F5F9' }}>
      <div>
        <div style={{ fontSize: '13px', fontWeight: '500', color: '#374151' }}>{label}</div>
        {hint && <div style={{ fontSize: '11px', color: '#94A3B8' }}>{hint}</div>}
      </div>
      <button type="button" onClick={() => onChange(!checked)}
        style={{ width: '40px', height: '22px', borderRadius: '999px', border: 'none', background: checked ? '#0891B2' : '#E2E8F0', cursor: 'pointer', position: 'relative', transition: 'background .2s', flexShrink: 0 }}>
        <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '3px', left: checked ? '21px' : '3px', transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
      </button>
    </div>
  );

  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.65)', backdropFilter: 'blur(6px)', zIndex: 190, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '620px', maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 30px 80px rgba(0,0,0,.25)', animation: 'scaleIn .2s ease' }}>

        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={16} style={{ color: '#0891B2' }} />
            </div>
            <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: '16px', fontWeight: '700', color: '#0F172A', margin: 0 }}>
              {isEdit ? 'Edit Sesi Ujian' : 'Buat Sesi Ujian Baru'}
            </h2>
          </div>
          <button onClick={onClose} style={{ width: '30px', height: '30px', borderRadius: '8px', border: '1px solid #F1F5F9', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#94A3B8' }}><X size={14} /></button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          <Input label="Judul Ujian" required placeholder="Contoh: UH Bab 3 - Persamaan Kuadrat" value={form.title} onChange={e => set('title', e.target.value)} error={errors.title} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <SelectField label="Bank Soal" required placeholder="— Pilih Bank Soal —" value={form.question_bank_id} onChange={e => set('question_bank_id', e.target.value)} error={errors.question_bank_id}
              options={banks.map(b => ({ value: b.id, label: `${b.name} (${b.total_questions} soal)` }))} />
            <SelectField label="Kelas" required placeholder="— Pilih Kelas —" value={form.class_id} onChange={e => set('class_id', e.target.value)} error={errors.class_id}
              options={classes.map(c => ({ value: c.id, label: c.name }))} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <SelectField label="Jenis Ujian" value={form.exam_type} onChange={e => set('exam_type', e.target.value)}
              options={['Ulangan Harian','UTS','UAS','Try Out','Kuis'].map(t => ({ value: t, label: t }))} />
            <Input label="Durasi (menit)" required type="number" min="1" max="480" value={form.duration_minutes} onChange={e => set('duration_minutes', e.target.value)} error={errors.duration_minutes} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Input label="Waktu Mulai" required type="datetime-local" value={form.start_time} onChange={e => set('start_time', e.target.value)} error={errors.start_time} />
            <Input label="Waktu Selesai" required type="datetime-local" value={form.end_time} onChange={e => set('end_time', e.target.value)} error={errors.end_time} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Input label="KKM / Passing Score" type="number" min="0" max="100" value={form.passing_score} onChange={e => set('passing_score', e.target.value)} hint="Nilai minimum lulus (0-100)" />
            <Input label="Maks. Pelanggaran" type="number" min="1" max="10" value={form.max_violations} onChange={e => set('max_violations', e.target.value)} hint="Sebelum otomatis submit" />
          </div>

          {/* Token */}
          {!isEdit && (
            <div>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Token Ujian</div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{ flex: 1, padding: '9px 14px', borderRadius: '9px', border: '1.5px solid #E2E8F0', background: '#F8FAFC', fontFamily: 'Sora, sans-serif', fontSize: '16px', fontWeight: '700', color: '#0F172A', letterSpacing: '0.15em' }}>{form.token}</div>
                <button type="button" onClick={() => set('token', generateToken())}
                  style={{ padding: '9px 14px', borderRadius: '9px', border: '1.5px solid #E2E8F0', background: '#F8FAFC', fontSize: '12px', fontWeight: '600', color: '#64748B', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}>
                  Generate Baru
                </button>
              </div>
            </div>
          )}

          {/* Toggles */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '2px' }}>Pengaturan Ujian</div>
            <Toggle label="Acak urutan soal" hint="Setiap siswa dapat urutan soal berbeda" checked={form.shuffle_questions} onChange={v => set('shuffle_questions', v)} />
            <Toggle label="Tampilkan hasil langsung" hint="Siswa langsung tahu nilainya setelah submit" checked={form.show_result_immediately} onChange={v => set('show_result_immediately', v)} />
            <Toggle label="Izinkan review jawaban" hint="Siswa bisa lihat kembali jawaban setelah selesai" checked={form.allow_review} onChange={v => set('allow_review', v)} />
          </div>

          {saveErr && <div style={{ padding: '11px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '9px', color: '#DC2626', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}><AlertCircle size={14} />{saveErr}</div>}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'flex-end', gap: '10px', flexShrink: 0 }}>
          <Btn variant="secondary" onClick={onClose} disabled={saving}>Batal</Btn>
          <Btn icon={Save} loading={saving} onClick={handleSave}>{isEdit ? 'Simpan' : 'Buat Ujian'}</Btn>
        </div>
      </div>
    </div>
  );
};

// ── Detail / Monitor Drawer ───────────────────────────────────────
const MonitorDrawer = ({ session, results, onClose, onEdit, onDelete, refreshResults }) => {
  const [refreshing, setRefreshing] = useState(false);
  const status = session ? getSessionStatus(session) : 'ended';
  const sm     = STATUS_META[status];

  // Auto-refresh every 15s if live
  useEffect(() => {
    if (status !== 'live') return;
    const interval = setInterval(() => { refreshResults(); }, 15000);
    return () => clearInterval(interval);
  }, [status, refreshResults]);

  if (!session) return null;

  const submitted  = results.filter(r => ['submitted','graded','grading'].includes(r.status)).length;
  const inProgress = results.filter(r => r.status === 'in_progress').length;
  const graded     = results.filter(r => r.status === 'graded').length;
  const avgScore   = results.filter(r => r.score !== null && r.status === 'graded').length
    ? Math.round(results.filter(r => r.score !== null).reduce((s, r) => s + r.score, 0) / results.filter(r => r.score !== null).length) : null;
  const passCount  = results.filter(r => r.passed).length;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 180, display: 'flex' }}>
      <div style={{ flex: 1, background: 'rgba(15,23,42,.4)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div style={{ width: '100%', maxWidth: '520px', background: '#fff', height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '-20px 0 60px rgba(0,0,0,.15)', animation: 'slideLeft .3s ease' }}>

        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #F1F5F9', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '10px' }}>
            <button onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#64748B', padding: 0, fontFamily: "'DM Sans', sans-serif" }}><ArrowLeft size={14} /> Tutup</button>
            <div style={{ display: 'flex', gap: '7px' }}>
              <Btn variant="secondary" icon={Edit2} sm onClick={onEdit}>Edit</Btn>
              <Btn variant="danger" icon={Trash2} sm onClick={onDelete}>Hapus</Btn>
            </div>
          </div>
          <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: '18px', fontWeight: '700', color: '#0F172A', margin: '0 0 8px', lineHeight: 1.3 }}>{session.title}</h2>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: '700', background: sm.bg, color: sm.color, border: `1px solid ${sm.border}` }}>
              {status === 'live' && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: sm.dot, animation: 'pulse 1.5s infinite', display: 'inline-block' }} />}
              {sm.label}
            </span>
            <span style={{ fontSize: '12px', color: '#94A3B8' }}>{session.exam_type}</span>
            <span style={{ fontSize: '12px', color: '#94A3B8' }}>·</span>
            <span style={{ fontSize: '12px', color: '#94A3B8' }}>{session.classes?.name}</span>
          </div>
        </div>

        {/* Token highlight */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #F1F5F9', flexShrink: 0 }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#94A3B8', marginBottom: '6px', letterSpacing: '0.05em' }}>TOKEN UJIAN</div>
          <TokenDisplay token={session.token} />
          <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '6px', display: 'flex', gap: '4px', alignItems: 'center' }}>
            <span style={{ padding: '1px 7px', borderRadius: '999px', fontSize: '10px', fontWeight: '700', background: TOKEN_STATUS_META[session.token_status]?.bg, color: TOKEN_STATUS_META[session.token_status]?.color }}>
              {TOKEN_STATUS_META[session.token_status]?.label || session.token_status}
            </span>
            <span>Bagikan token ini ke siswa untuk mulai ujian</span>
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Info cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {[
              { label: 'Waktu Mulai',   value: fmtDateTime(session.start_time), icon: Calendar, color: '#0891B2', bg: '#EFF6FF' },
              { label: 'Waktu Selesai', value: fmtDateTime(session.end_time),   icon: Square,   color: '#DC2626', bg: '#FEF2F2' },
              { label: 'Durasi',        value: `${session.duration_minutes} menit`, icon: Timer, color: '#D97706', bg: '#FFFBEB' },
              { label: 'KKM',           value: `${session.passing_score}`,      icon: Shield,   color: '#16A34A', bg: '#F0FDF4' },
              { label: 'Total Soal',    value: `${session.total_questions}`,    icon: BookOpen, color: '#4F46E5', bg: '#EEF2FF' },
              { label: 'Max Pelanggaran', value: `${session.max_violations}×`, icon: AlertCircle, color: '#DC2626', bg: '#FEF2F2' },
            ].map(c => (
              <div key={c.label} style={{ background: '#F8FAFC', borderRadius: '12px', padding: '12px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <c.icon size={13} style={{ color: c.color }} />
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: '600' }}>{c.label}</div>
                  <div style={{ fontSize: '13px', color: '#0F172A', fontWeight: '700', fontFamily: 'Sora, sans-serif' }}>{c.value}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Settings pills */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[
              { label: 'Soal Diacak',          active: session.shuffle_questions },
              { label: 'Hasil Langsung',        active: session.show_result_immediately },
              { label: 'Boleh Review',          active: session.allow_review },
            ].map(p => (
              <span key={p.label} style={{ padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: '600', background: p.active ? '#EFF6FF' : '#F8FAFC', color: p.active ? '#0891B2' : '#94A3B8', border: `1px solid ${p.active ? '#BAE6FD' : '#F1F5F9'}` }}>
                {p.active ? '✓' : '✗'} {p.label}
              </span>
            ))}
          </div>

          {/* Monitor section */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#0F172A', fontFamily: 'Sora, sans-serif', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <BarChart2 size={14} style={{ color: '#0891B2' }} /> Monitor Peserta
              </div>
              <button onClick={async () => { setRefreshing(true); await refreshResults(); setRefreshing(false); }}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: '#94A3B8', fontFamily: "'DM Sans', sans-serif" }}>
                <RefreshCw size={11} style={{ animation: refreshing ? 'spin .7s linear infinite' : 'none' }} /> Refresh
              </button>
            </div>

            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '12px' }}>
              {[
                { label: 'Submit',      value: submitted,  color: '#16A34A', bg: '#F0FDF4' },
                { label: 'Mengerjakan', value: inProgress, color: '#D97706', bg: '#FFFBEB' },
                { label: 'Sudah Dinilai', value: graded,  color: '#4F46E5', bg: '#EEF2FF' },
                { label: 'Rata-rata',   value: avgScore !== null ? avgScore : '—', color: '#0891B2', bg: '#EFF6FF' },
              ].map(s => (
                <div key={s.label} style={{ background: s.bg, borderRadius: '10px', padding: '10px 8px', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'Sora, sans-serif', fontSize: '18px', fontWeight: '700', color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: '10px', fontWeight: '600', color: s.color, opacity: 0.8 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Participant list */}
            {results.length === 0
              ? <div style={{ padding: '24px', textAlign: 'center', background: '#F8FAFC', borderRadius: '12px' }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>👥</div>
                  <div style={{ fontSize: '13px', color: '#94A3B8' }}>Belum ada peserta yang masuk</div>
                </div>
              : <div style={{ border: '1px solid #F1F5F9', borderRadius: '12px', overflow: 'hidden' }}>
                  <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                    {results.map((r, i) => {
                      const statusColor = r.status === 'graded' ? '#16A34A' : r.status === 'submitted' ? '#0891B2' : r.status === 'in_progress' ? '#D97706' : '#94A3B8';
                      const statusLabel = { graded: 'Dinilai', submitted: 'Submit', in_progress: 'Mengerjakan', grading: 'Dinilai' }[r.status] || r.status;
                      return (
                        <div key={r.id} style={{ padding: '10px 14px', borderBottom: i < results.length - 1 ? '1px solid #F8FAFC' : 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Sora, sans-serif', fontWeight: '700', fontSize: '11px', color: '#4F46E5', flexShrink: 0 }}>
                            {r.profiles?.name?.charAt(0) || '?'}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '13px', fontWeight: '600', color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.profiles?.name || 'Siswa'}</div>
                            <div style={{ fontSize: '11px', color: '#94A3B8' }}>{r.profiles?.nis || '—'}</div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            {r.score !== null && <div style={{ fontFamily: 'Sora, sans-serif', fontSize: '14px', fontWeight: '700', color: r.passed ? '#16A34A' : '#DC2626' }}>{Math.round(r.score)}</div>}
                            <div style={{ fontSize: '10px', fontWeight: '700', color: statusColor }}>{statusLabel}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {passCount > 0 && (
                    <div style={{ padding: '8px 14px', background: '#F8FAFC', borderTop: '1px solid #F1F5F9', fontSize: '11px', color: '#64748B' }}>
                      {passCount} dari {results.filter(r => r.status === 'graded').length} siswa lulus KKM
                    </div>
                  )}
                </div>
            }
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Action Menu ───────────────────────────────────────────────────
const ActionMenu = ({ items }) => {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <button onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        style={{ width: '28px', height: '28px', borderRadius: '7px', border: '1px solid #F1F5F9', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#94A3B8' }}>
        <MoreVertical size={13} />
      </button>
      {open && <>
        <div style={{ position: 'fixed', inset: 0, zIndex: 50 }} onClick={() => setOpen(false)} />
        <div style={{ position: 'absolute', right: 0, top: '34px', background: '#fff', borderRadius: '12px', border: '1px solid #F1F5F9', boxShadow: '0 8px 30px rgba(0,0,0,.12)', zIndex: 51, minWidth: '140px', padding: '4px' }}>
          {items.map(item => (
            <button key={item.label} onClick={() => { item.action(); setOpen(false); }}
              style={{ display: 'flex', alignItems: 'center', gap: '9px', width: '100%', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: item.color || '#374151', borderRadius: '8px', fontFamily: "'DM Sans', sans-serif", fontWeight: '500', textAlign: 'left' }}
              onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}>
              <item.icon size={13} />{item.label}
            </button>
          ))}
        </div>
      </>}
    </div>
  );
};

// ── Main ──────────────────────────────────────────────────────────
const ExamManagement = () => {
  const { profile } = useAuth();
  const [sessions,  setSessions]  = useState([]);
  const [banks,     setBanks]     = useState([]);
  const [classes,   setClasses]   = useState([]);
  const [results,   setResults]   = useState([]);

  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState(null);

  const [search,      setSearch]      = useState('');
  const [filterStatus,setFilterStatus]= useState('all');

  const [examModal,  setExamModal]  = useState(false);
  const [editSession,setEditSession]= useState(null);
  const [detailSess, setDetailSess] = useState(null);
  const [confirm,    setConfirm]    = useState({ open: false });
  const [actLoading, setActLoading] = useState(false);
  const [toast,      setToast]      = useState(null);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const fetchAll = useCallback(async () => {
    if (!profile?.id) return;
    try {
      const [sessRes, banksRes, classesRes] = await Promise.all([
        supabase.from('exam_sessions')
          .select('*, classes(name, grade_level), question_banks(name, total_questions)')
          .eq('teacher_id', profile.id)
          .order('start_time', { ascending: false }),
        supabase.from('question_banks')
          .select('id, name, total_questions, exam_type')
          .eq('teacher_id', profile.id)
          .order('name'),
        supabase.from('classes')
          .select('id, name, grade_level')
          .eq('school_id', profile.school_id)
          .order('name'),
      ]);
      if (sessRes.error) throw sessRes.error;
      setSessions(sessRes.data || []);
      setBanks(banksRes.data || []);
      setClasses(classesRes.data || []);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, [profile?.id, profile?.school_id]);

  const fetchResults = useCallback(async (sessionId) => {
    if (!sessionId) return;
    const { data } = await supabase.from('exam_results')
      .select('*, profiles(name, nis)')
      .eq('exam_session_id', sessionId)
      .order('submitted_at', { ascending: false });
    setResults(data || []);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openDetail = (sess) => {
    setDetailSess(sess);
    fetchResults(sess.id);
  };

  const handleDelete = (sess) => {
    setConfirm({
      open: true, title: 'Hapus Sesi Ujian',
      message: `Hapus "${sess.title}"? Semua data hasil ujian siswa pada sesi ini akan ikut terhapus.`,
      onConfirm: async () => {
        setActLoading(true);
        await supabase.from('exam_results').delete().eq('exam_session_id', sess.id);
        const { error } = await supabase.from('exam_sessions').delete().eq('id', sess.id);
        if (error) showToast(error.message, 'error');
        else { showToast('Sesi ujian dihapus'); fetchAll(); setDetailSess(null); }
        setActLoading(false); setConfirm({ open: false });
      },
      onCancel: () => setConfirm({ open: false }),
    });
  };

  const filtered = sessions.filter(s => {
    const matchSearch = !search || s.title.toLowerCase().includes(search.toLowerCase()) || s.classes?.name?.toLowerCase().includes(search.toLowerCase());
    const status = getSessionStatus(s);
    const matchStatus = filterStatus === 'all' || status === filterStatus;
    return matchSearch && matchStatus;
  });

  // Stats
  const liveCount     = sessions.filter(s => getSessionStatus(s) === 'live').length;
  const upcomingCount = sessions.filter(s => getSessionStatus(s) === 'upcoming').length;
  const endedCount    = sessions.filter(s => getSessionStatus(s) === 'ended').length;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&family=DM+Sans:wght@400;500;600&display=swap');
        @keyframes fadeUp    { from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);} }
        @keyframes shimmer   { 0%{background-position:-400px 0;}100%{background-position:400px 0;} }
        @keyframes scaleIn   { from{opacity:0;transform:scale(.95);}to{opacity:1;transform:scale(1);} }
        @keyframes slideUp   { from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);} }
        @keyframes slideLeft { from{opacity:0;transform:translateX(40px);}to{opacity:1;transform:translateX(0);} }
        @keyframes spin      { to{transform:rotate(360deg);} }
        @keyframes pulse     { 0%,100%{opacity:1;}50%{opacity:.4;} }
        .exam-row:hover { background: #FAFBFF !important; }
      `}</style>

      <div style={{ fontFamily: "'DM Sans', sans-serif", display: 'flex', flexDirection: 'column', gap: '22px' }}>

        {/* Header */}
        <div style={{ opacity: 0, animation: 'fadeUp .4s ease forwards', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileText size={15} style={{ color: '#0891B2' }} />
              </div>
              <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: '22px', fontWeight: '700', color: '#0F172A', margin: 0 }}>Kelola Ujian</h1>
            </div>
            <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>
              {liveCount > 0
                ? <span style={{ color: '#16A34A', fontWeight: '600' }}>● {liveCount} ujian sedang berlangsung</span>
                : 'Buat dan pantau sesi ujian siswa'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '9px' }}>
            <Btn variant="secondary" icon={RefreshCw} loading={refreshing} onClick={() => { setRefreshing(true); fetchAll(); }}>Refresh</Btn>
            <Btn icon={Plus} onClick={() => { setEditSession(null); setExamModal(true); }}>Buat Ujian</Btn>
          </div>
        </div>

        {error && <div style={{ padding: '14px 18px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '12px', color: '#DC2626', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}><AlertCircle size={14} />{error}</div>}

        {/* Stat pills */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', opacity: 0, animation: 'fadeUp .4s ease 60ms forwards' }}>
          {[
            { label: 'Total Ujian',    value: sessions.length, color: '#0891B2', bg: '#EFF6FF' },
            { label: 'Berlangsung',    value: liveCount,       color: '#16A34A', bg: '#F0FDF4' },
            { label: 'Akan Datang',   value: upcomingCount,   color: '#D97706', bg: '#FFFBEB' },
            { label: 'Selesai',        value: endedCount,      color: '#64748B', bg: '#F8FAFC' },
          ].map(p => (
            <div key={p.label} style={{ padding: '8px 14px', borderRadius: '999px', background: p.bg, color: p.color, fontSize: '12px', fontWeight: '600', display: 'flex', gap: '6px', alignItems: 'center' }}>
              {p.label}: <span style={{ fontFamily: 'Sora, sans-serif', fontWeight: '700', fontSize: '14px' }}>{p.value}</span>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', opacity: 0, animation: 'fadeUp .4s ease 100ms forwards' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <Search size={13} style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
            <input type="text" placeholder="Cari ujian atau kelas..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', padding: '9px 12px 9px 32px', borderRadius: '10px', border: '1.5px solid #E2E8F0', background: '#F8FAFC', fontSize: '13px', color: '#0F172A', outline: 'none', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' }}
              onFocus={e => { e.target.style.borderColor = '#0891B2'; e.target.style.boxShadow = '0 0 0 3px rgba(8,145,178,.1)'; }}
              onBlur={e => { e.target.style.borderColor = '#E2E8F0'; e.target.style.boxShadow = 'none'; }} />
          </div>
          <div style={{ position: 'relative' }}>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              style={{ padding: '9px 28px 9px 11px', borderRadius: '10px', border: '1.5px solid #E2E8F0', background: '#F8FAFC', fontSize: '13px', color: filterStatus !== 'all' ? '#0F172A' : '#94A3B8', outline: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", appearance: 'none' }}>
              <option value="all">Semua Status</option>
              <option value="live">Berlangsung</option>
              <option value="upcoming">Akan Datang</option>
              <option value="ended">Selesai</option>
            </select>
            <ChevronDown size={12} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
          </div>
          <span style={{ fontSize: '12px', color: '#94A3B8', alignSelf: 'center' }}>{filtered.length} ujian</span>
        </div>

        {/* Table */}
        <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #F1F5F9', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.03)', opacity: 0, animation: 'fadeUp .4s ease 140ms forwards' }}>
          {loading
            ? <div style={{ padding: '20px' }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} style={{ padding: '14px 0', borderBottom: '1px solid #F8FAFC', display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <Shimmer w="120px" h={20} r={999} /><Shimmer w="200px" /><Shimmer w="80px" /><Shimmer w="100px" /><Shimmer w="60px" />
                  </div>
                ))}
              </div>
            : filtered.length === 0
            ? <div style={{ padding: '64px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>📋</div>
                <div style={{ fontFamily: 'Sora, sans-serif', fontSize: '16px', fontWeight: '700', color: '#0F172A', marginBottom: '6px' }}>
                  {search || filterStatus !== 'all' ? 'Tidak ada ujian ditemukan' : 'Belum ada sesi ujian'}
                </div>
                <div style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '20px' }}>
                  {search || filterStatus !== 'all' ? 'Coba ubah filter' : 'Buat sesi ujian pertama sekarang'}
                </div>
                {!search && filterStatus === 'all' && <Btn icon={Plus} onClick={() => { setEditSession(null); setExamModal(true); }}>Buat Ujian</Btn>}
              </div>
            : <>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '640px' }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #F1F5F9' }}>
                        {['Status', 'Judul Ujian', 'Kelas', 'Waktu', 'Token', 'Soal', ''].map(h => (
                          <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: '#94A3B8', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((s, idx) => {
                        const status = getSessionStatus(s);
                        const sm     = STATUS_META[status];
                        return (
                          <tr key={s.id} className="exam-row" style={{ borderBottom: '1px solid #F8FAFC', cursor: 'pointer', transition: 'background .1s', background: '#fff', opacity: 0, animation: `fadeUp .3s ease ${idx * 30}ms forwards` }}
                            onClick={() => openDetail(s)}>
                            <td style={{ padding: '13px 16px' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: '700', background: sm.bg, color: sm.color, border: `1px solid ${sm.border}`, whiteSpace: 'nowrap' }}>
                                {status === 'live' && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: sm.dot, animation: 'pulse 1.5s infinite', display: 'inline-block' }} />}
                                {sm.label}
                              </span>
                            </td>
                            <td style={{ padding: '13px 16px' }}>
                              <div style={{ fontSize: '13px', fontWeight: '600', color: '#0F172A' }}>{s.title}</div>
                              <div style={{ fontSize: '11px', color: '#94A3B8' }}>{s.exam_type} · {s.duration_minutes} menit</div>
                            </td>
                            <td style={{ padding: '13px 16px', fontSize: '13px', color: '#374151', whiteSpace: 'nowrap' }}>{s.classes?.name || '—'}</td>
                            <td style={{ padding: '13px 16px' }}>
                              <div style={{ fontSize: '12px', color: '#374151', whiteSpace: 'nowrap' }}>{fmtDate(s.start_time)}</div>
                              <div style={{ fontSize: '11px', color: '#94A3B8' }}>{fmtTime(s.start_time)} – {fmtTime(s.end_time)}</div>
                            </td>
                            <td style={{ padding: '13px 16px' }}>
                              <span style={{ fontFamily: 'Sora, sans-serif', fontSize: '13px', fontWeight: '700', color: '#0F172A', letterSpacing: '0.1em', background: '#F8FAFC', padding: '4px 8px', borderRadius: '7px', border: '1px solid #F1F5F9' }}>{s.token}</span>
                            </td>
                            <td style={{ padding: '13px 16px', fontSize: '13px', color: '#374151', fontWeight: '600', fontFamily: 'Sora, sans-serif' }}>{s.total_questions}</td>
                            <td style={{ padding: '13px 16px' }} onClick={e => e.stopPropagation()}>
                              <ActionMenu items={[
                                { icon: Eye,   label: 'Detail',   action: () => openDetail(s) },
                                { icon: Edit2, label: 'Edit',     action: () => { setEditSession(s); setExamModal(true); } },
                                { icon: Trash2,label: 'Hapus',    action: () => handleDelete(s), color: '#DC2626' },
                              ]} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div style={{ padding: '10px 16px', borderTop: '1px solid #F8FAFC', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', color: '#94A3B8' }}>Menampilkan {filtered.length} dari {sessions.length} sesi ujian</span>
                  <span style={{ fontSize: '11px', color: '#CBD5E1', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Zap size={10} style={{ color: '#0891B2' }} /> Real-time dari Supabase
                  </span>
                </div>
              </>
          }
        </div>
      </div>

      {/* Modals */}
      <ExamModal open={examModal} session={editSession} banks={banks} classes={classes} schoolId={profile?.school_id} teacherId={profile?.id}
        onClose={() => { setExamModal(false); setEditSession(null); }}
        onSaved={() => { fetchAll(); showToast(editSession ? 'Sesi ujian diperbarui' : 'Sesi ujian berhasil dibuat'); }} />

      {detailSess && (
        <MonitorDrawer
          session={detailSess}
          results={results}
          onClose={() => { setDetailSess(null); setResults([]); }}
          onEdit={() => { setEditSession(detailSess); setExamModal(true); setDetailSess(null); }}
          onDelete={() => handleDelete(detailSess)}
          refreshResults={() => fetchResults(detailSess.id)}
        />
      )}

      <ConfirmDialog {...confirm} loading={actLoading} />
      {toast && <Toast {...toast} />}
    </>
  );
};

export default ExamManagement;