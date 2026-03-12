import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  ClipboardCheck, Plus, RefreshCw, X, AlertCircle,
  CheckCircle2, XCircle, Clock, Users, Download,
  ChevronDown, Calendar, QrCode, Hash, Edit3,
  TrendingUp, BookOpen, Layers,
} from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────
const fmtDate   = (d) => d ? new Date(d).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '—';
const fmtShort  = (d) => d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const todayStr  = () => new Date().toISOString().slice(0, 10);
const genToken  = () => {
  const arr = new Uint8Array(3);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase().slice(0, 6);
};

const STATUS_META = {
  hadir: { label: 'Hadir',  color: '#16A34A', bg: '#F0FDF4', icon: '✅' },
  izin:  { label: 'Izin',   color: '#0891B2', bg: '#EFF6FF', icon: '📋' },
  sakit: { label: 'Sakit',  color: '#D97706', bg: '#FFFBEB', icon: '🤒' },
  alpha: { label: 'Alpha',  color: '#DC2626', bg: '#FEF2F2', icon: '❌' },
};

const Shimmer = ({ h = 60, r = 12 }) => (
  <div style={{ height: h, borderRadius: r, background: 'linear-gradient(90deg,#F1F5F9 25%,#E2E8F0 50%,#F1F5F9 75%)', backgroundSize: '800px 100%', animation: 'shimmer 1.2s infinite' }} />
);

const Badge = ({ status }) => {
  const m = STATUS_META[status] || STATUS_META.alpha;
  return <span style={{ padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: '700', background: m.bg, color: m.color }}>{m.icon} {m.label}</span>;
};

// ── QR Code display (inline SVG — no library needed) ──────────
const QRDisplay = ({ token }) => {
  // Simple visual placeholder — real QR generated via qrcode.react or similar
  // Since we can't install packages here, we show the token prominently
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '20px', background: '#F8FAFC', borderRadius: '14px', border: '2px dashed #E2E8F0' }}>
      <QrCode size={48} style={{ color: '#CBD5E1' }} />
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '11px', fontWeight: '700', color: '#94A3B8', letterSpacing: '0.1em', marginBottom: '6px' }}>TOKEN ABSENSI</div>
        <div style={{ fontFamily: 'Sora, sans-serif', fontSize: '36px', fontWeight: '800', color: '#0F172A', letterSpacing: '0.25em' }}>{token}</div>
        <div style={{ fontSize: '12px', color: '#64748B', marginTop: '6px' }}>Siswa ketik token ini di app untuk check-in</div>
      </div>
    </div>
  );
};

// ── Create Session Modal ──────────────────────────────────────
const CreateSessionModal = ({ classes, subjects, profile, onClose, onCreated }) => {
  const [form, setForm] = useState({
    title:      '',
    class_id:   '',
    subject_id: '',
    date:       todayStr(),
    token_expires_hours: 2,
  });
  const [token,  setToken]  = useState(genToken());
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState('');
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleCreate = async () => {
    if (!form.title.trim()) { setErr('Judul tidak boleh kosong'); return; }
    if (!form.class_id)     { setErr('Pilih kelas'); return; }
    setSaving(true); setErr('');
    try {
      const expires = new Date();
      expires.setHours(expires.getHours() + parseInt(form.token_expires_hours));

      const { data, error } = await supabase.from('attendance_sessions').insert({
        school_id:        profile.school_id,
        teacher_id:       profile.id,
        class_id:         form.class_id,
        subject_id:       form.subject_id || null,
        title:            form.title,
        date:             form.date,
        token:            token,
        token_expires_at: expires.toISOString(),
        is_open:          true,
      }).select('*, classes(name)').single();

      if (error) throw error;

      // Auto-populate alpha for all students in class
      const { data: students } = await supabase
        .from('profiles')
        .select('id')
        .eq('class_id', form.class_id)
        .eq('role', 'student')
        .eq('status', 'active');

      if (students?.length) {
        await supabase.from('attendance_records').insert(
          students.map(s => ({
            attendance_session_id: data.id,
            student_id: s.id,
            status: 'alpha',
            method: 'manual',
          }))
        );
      }

      onCreated(data);
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  };

  const inp = { width: '100%', padding: '10px 12px', borderRadius: '9px', border: '1.5px solid #E2E8F0', fontSize: '13px', color: '#0F172A', outline: 'none', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '520px', maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,.15)', animation: 'slideUp .25s ease' }}>

        <div style={{ padding: '20px 24px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ClipboardCheck size={14} style={{ color: '#16A34A' }} />
            </div>
            <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: '16px', fontWeight: '700', color: '#0F172A', margin: 0 }}>Buat Sesi Absensi</h2>
          </div>
          <button onClick={onClose} style={{ width: '32px', height: '32px', borderRadius: '8px', border: 'none', background: '#F8FAFC', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={15} style={{ color: '#64748B' }} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '6px' }}>JUDUL SESI</label>
            <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="contoh: Matematika — Pertemuan 5"
              style={inp} onFocus={e => e.target.style.borderColor='#16A34A'} onBlur={e => e.target.style.borderColor='#E2E8F0'} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '6px' }}>KELAS</label>
              <div style={{ position: 'relative' }}>
                <select value={form.class_id} onChange={e => set('class_id', e.target.value)} style={{ ...inp, appearance: 'none', paddingRight: '32px' }}>
                  <option value="">Pilih kelas...</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <ChevronDown size={13} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748B', pointerEvents: 'none' }} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '6px' }}>MATA PELAJARAN</label>
              <div style={{ position: 'relative' }}>
                <select value={form.subject_id} onChange={e => set('subject_id', e.target.value)} style={{ ...inp, appearance: 'none', paddingRight: '32px' }}>
                  <option value="">Pilih mapel... (opsional)</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <ChevronDown size={13} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748B', pointerEvents: 'none' }} />
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '6px' }}>TANGGAL</label>
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)} style={inp} />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '6px' }}>TOKEN BERLAKU (JAM)</label>
              <div style={{ position: 'relative' }}>
                <select value={form.token_expires_hours} onChange={e => set('token_expires_hours', e.target.value)} style={{ ...inp, appearance: 'none', paddingRight: '32px' }}>
                  {[1,2,4,8,24].map(h => <option key={h} value={h}>{h} jam</option>)}
                </select>
                <ChevronDown size={13} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748B', pointerEvents: 'none' }} />
              </div>
            </div>
          </div>

          {/* Token display */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>TOKEN ABSENSI</label>
              <button onClick={() => setToken(genToken())}
                style={{ fontSize: '11px', fontWeight: '600', color: '#4F46E5', background: 'none', border: 'none', cursor: 'pointer' }}>
                🔄 Generate Ulang
              </button>
            </div>
            <QRDisplay token={token} />
          </div>

          <div style={{ background: '#F0FDF4', borderRadius: '10px', padding: '12px 14px', display: 'flex', gap: '8px' }}>
            <CheckCircle2 size={13} style={{ color: '#16A34A', flexShrink: 0, marginTop: '1px' }} />
            <p style={{ fontSize: '12px', color: '#166534', margin: 0, lineHeight: 1.5 }}>
              Semua siswa otomatis tercatat <strong>Alpha</strong>. Guru bisa ubah status manual, atau siswa check-in sendiri dengan token.
            </p>
          </div>

          {err && <div style={{ padding: '10px 14px', background: '#FEF2F2', borderRadius: '9px', color: '#DC2626', fontSize: '13px', display: 'flex', gap: '8px' }}><AlertCircle size={13} />{err}</div>}
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid #F1F5F9', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: '9px', border: '1.5px solid #E2E8F0', background: '#fff', fontSize: '13px', fontWeight: '600', color: '#475569', cursor: 'pointer' }}>Batal</button>
          <button onClick={handleCreate} disabled={saving}
            style={{ padding: '10px 22px', borderRadius: '9px', border: 'none', background: saving ? '#E2E8F0' : '#16A34A', fontSize: '13px', fontWeight: '700', color: saving ? '#94A3B8' : '#fff', cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '7px', fontFamily: "'DM Sans', sans-serif" }}>
            {saving ? <><div style={{ width: '13px', height: '13px', borderRadius: '50%', border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', animation: 'spin .7s linear infinite' }} />Membuat...</> : <><ClipboardCheck size={13} />Buat Sesi</>}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Session Detail Drawer (input absensi manual + lihat token) ─
const SessionDrawer = ({ session, onClose, onUpdated }) => {
  const [records,  setRecords]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState({});
  const [toast,    setToast]    = useState(null);
  const [showToken,setShowToken]= useState(false);

  const showMsg = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  useEffect(() => {
    supabase.from('attendance_records')
      .select('*, profiles(name, nis, avatar_url)')
      .eq('attendance_session_id', session.id)
      .order('profiles(name)')
      .then(({ data }) => { setRecords(data || []); setLoading(false); });
  }, [session.id]);

  const updateStatus = async (recordId, newStatus) => {
    setSaving(p => ({ ...p, [recordId]: true }));
    const { error } = await supabase.from('attendance_records')
      .update({ status: newStatus, method: 'manual', updated_at: new Date().toISOString() })
      .eq('id', recordId);
    if (!error) {
      setRecords(p => p.map(r => r.id === recordId ? { ...r, status: newStatus } : r));
      onUpdated?.();
      showMsg('Status diperbarui');
    }
    setSaving(p => ({ ...p, [recordId]: false }));
  };

  const toggleSession = async () => {
    const { error } = await supabase.from('attendance_sessions')
      .update({ is_open: !session.is_open }).eq('id', session.id);
    if (!error) {
      session.is_open = !session.is_open;
      onUpdated?.();
      showMsg(session.is_open ? 'Sesi dibuka kembali' : 'Sesi ditutup');
    }
  };

  const stats = {
    hadir: records.filter(r => r.status === 'hadir').length,
    izin:  records.filter(r => r.status === 'izin').length,
    sakit: records.filter(r => r.status === 'sakit').length,
    alpha: records.filter(r => r.status === 'alpha').length,
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 900, display: 'flex', justifyContent: 'flex-end' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,.3)' }} onClick={onClose} />
      <div style={{ position: 'relative', width: '100%', maxWidth: '480px', background: '#fff', height: '100%', overflowY: 'auto', boxShadow: '-8px 0 32px rgba(0,0,0,.12)', animation: 'slideLeft .25s ease', display: 'flex', flexDirection: 'column' }}>

        {toast && (
          <div style={{ position: 'absolute', top: '12px', left: '50%', transform: 'translateX(-50%)', zIndex: 10, padding: '8px 16px', borderRadius: '10px', background: '#0F172A', color: '#fff', fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap', boxShadow: '0 4px 16px rgba(0,0,0,.2)' }}>
            {toast}
          </div>
        )}

        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: '15px', fontWeight: '700', color: '#0F172A', margin: '0 0 4px' }}>{session.title}</h2>
            <div style={{ fontSize: '12px', color: '#94A3B8' }}>
              {session.classes?.name} · {fmtShort(session.date)}
            </div>
            <div style={{ marginTop: '8px', display: 'flex', gap: '6px' }}>
              <span style={{ padding: '2px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: '700', background: session.is_open ? '#F0FDF4' : '#F8FAFC', color: session.is_open ? '#16A34A' : '#64748B' }}>
                {session.is_open ? '● Terbuka' : '■ Ditutup'}
              </span>
              <button onClick={toggleSession}
                style={{ padding: '2px 8px', borderRadius: '999px', border: '1px solid #E2E8F0', background: '#fff', fontSize: '11px', fontWeight: '600', color: '#475569', cursor: 'pointer' }}>
                {session.is_open ? 'Tutup Sesi' : 'Buka Kembali'}
              </button>
            </div>
          </div>
          <button onClick={onClose} style={{ width: '32px', height: '32px', borderRadius: '8px', border: 'none', background: '#F8FAFC', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <X size={15} style={{ color: '#64748B' }} />
          </button>
        </div>

        {/* Stats */}
        <div style={{ padding: '16px 24px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', borderBottom: '1px solid #F1F5F9' }}>
          {Object.entries(STATUS_META).map(([k, v]) => (
            <div key={k} style={{ textAlign: 'center', padding: '10px 4px', background: v.bg, borderRadius: '10px' }}>
              <div style={{ fontFamily: 'Sora, sans-serif', fontSize: '18px', fontWeight: '700', color: v.color }}>{stats[k]}</div>
              <div style={{ fontSize: '10px', fontWeight: '700', color: v.color }}>{v.label.toUpperCase()}</div>
            </div>
          ))}
        </div>

        {/* Token display toggle */}
        <div style={{ padding: '12px 24px', borderBottom: '1px solid #F1F5F9' }}>
          <button onClick={() => setShowToken(p => !p)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #E2E8F0', background: showToken ? '#F8FAFC' : '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#475569', fontFamily: "'DM Sans', sans-serif" }}>
            <Hash size={13} style={{ color: '#4F46E5' }} />
            {showToken ? 'Sembunyikan Token' : 'Tampilkan Token & QR'}
            <ChevronDown size={13} style={{ marginLeft: 'auto', transform: showToken ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
          </button>
          {showToken && (
            <div style={{ marginTop: '12px' }}>
              <QRDisplay token={session.token} />
            </div>
          )}
        </div>

        {/* Student list */}
        <div style={{ flex: 1, padding: '16px 24px', overflowY: 'auto' }}>
          <h3 style={{ fontFamily: 'Sora, sans-serif', fontSize: '13px', fontWeight: '700', color: '#0F172A', margin: '0 0 12px' }}>
            Input Absensi Manual ({records.length} siswa)
          </h3>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[...Array(5)].map((_, i) => <Shimmer key={i} h={60} />)}
            </div>
          ) : records.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', color: '#94A3B8', fontSize: '13px' }}>
              Belum ada siswa di kelas ini
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {records.map(r => (
                <div key={r.id} style={{ padding: '12px 14px', background: '#F8FAFC', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px', border: `1px solid ${STATUS_META[r.status]?.bg || '#F1F5F9'}` }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.profiles?.name || '—'}</div>
                    <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                      NIS: {r.profiles?.nis || '—'}
                      {r.method !== 'manual' && <span style={{ marginLeft: '6px', color: '#16A34A', fontWeight: '600' }}>· {r.method === 'token' ? '📱 Token' : '📷 QR'}</span>}
                    </div>
                  </div>
                  {/* Status buttons */}
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {Object.entries(STATUS_META).map(([k, v]) => (
                      <button key={k} onClick={() => updateStatus(r.id, k)} disabled={saving[r.id]}
                        style={{ width: '34px', height: '28px', borderRadius: '7px', border: `1.5px solid ${r.status === k ? v.color : '#E2E8F0'}`, background: r.status === k ? v.bg : '#fff', fontSize: '12px', cursor: saving[r.id] ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s', title: v.label }}>
                        {saving[r.id] && r.status !== k ? '·' : v.icon}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Rekap Modal ───────────────────────────────────────────────
const RekapModal = ({ classes, profile, onClose }) => {
  const [classId,   setClassId]   = useState('');
  const [dateFrom,  setDateFrom]  = useState(() => { const d = new Date(); d.setMonth(d.getMonth()-1); return d.toISOString().slice(0,10); });
  const [dateTo,    setDateTo]    = useState(todayStr());
  const [data,      setData]      = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [err,       setErr]       = useState('');
  const [className, setClassName] = useState('');

  const fetchRekap = async () => {
    if (!classId) { setErr('Pilih kelas'); return; }
    setLoading(true); setErr('');
    try {
      const { data: rows, error } = await supabase.rpc('get_attendance_summary', {
        p_class_id:  classId,
        p_date_from: dateFrom,
        p_date_to:   dateTo,
      });
      if (error) throw error;
      setData(rows || []);
      setClassName(classes.find(c => c.id === classId)?.name || '');
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  };

  const exportPDF = () => {
    const win = window.open('', '_blank');
    const rows = data.map(r => `
      <tr>
        <td>${r.student_name}</td>
        <td>${r.nis || '—'}</td>
        <td style="color:#16A34A;font-weight:700;text-align:center">${r.total_hadir}</td>
        <td style="color:#0891B2;text-align:center">${r.total_izin}</td>
        <td style="color:#D97706;text-align:center">${r.total_sakit}</td>
        <td style="color:#DC2626;text-align:center">${r.total_alpha}</td>
        <td style="text-align:center">${r.total_sesi}</td>
        <td style="font-weight:700;text-align:center;color:${r.pct_hadir >= 75 ? '#16A34A' : '#DC2626'}">${r.pct_hadir ?? 0}%</td>
      </tr>`).join('');

    win.document.write(`<!DOCTYPE html><html><head><title>Rekap Absensi</title>
    <style>
      body { font-family: 'Segoe UI', sans-serif; padding: 32px; color: #0F172A; }
      h1 { font-size: 20px; margin: 0 0 4px; }
      p { color: #64748B; margin: 0 0 24px; font-size: 13px; }
      table { width: 100%; border-collapse: collapse; font-size: 13px; }
      th { background: #F8FAFC; padding: 10px 12px; text-align: left; font-weight: 700; border-bottom: 2px solid #E2E8F0; }
      td { padding: 9px 12px; border-bottom: 1px solid #F1F5F9; }
      tr:nth-child(even) td { background: #FAFAFA; }
      .footer { margin-top: 24px; font-size: 11px; color: #94A3B8; }
      @media print { body { padding: 16px; } }
    </style></head><body>
    <h1>Rekap Absensi — ${className}</h1>
    <p>${fmtShort(dateFrom)} s/d ${fmtShort(dateTo)} · Dicetak: ${fmtShort(todayStr())}</p>
    <table>
      <thead><tr>
        <th>Nama Siswa</th><th>NIS</th><th>Hadir</th><th>Izin</th><th>Sakit</th><th>Alpha</th><th>Total Sesi</th><th>% Hadir</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="footer">ZiDu — Sistem Manajemen Ujian Sekolah · ${new Date().toLocaleString('id-ID')}</div>
    <script>window.onload=()=>window.print();</script>
    </body></html>`);
    win.document.close();
  };

  const exportCSV = () => {
    const header = 'Nama,NIS,Hadir,Izin,Sakit,Alpha,Total Sesi,% Hadir\n';
    const rows   = data.map(r => `"${r.student_name}","${r.nis||''}",${r.total_hadir},${r.total_izin},${r.total_sakit},${r.total_alpha},${r.total_sesi},${r.pct_hadir??0}`).join('\n');
    const blob   = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url    = URL.createObjectURL(blob);
    const a      = document.createElement('a');
    a.href = url; a.download = `rekap-absensi-${className}-${dateFrom}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const inp = { padding: '9px 12px', borderRadius: '9px', border: '1.5px solid #E2E8F0', fontSize: '13px', color: '#0F172A', outline: 'none', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '720px', maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,.15)', animation: 'slideUp .25s ease' }}>

        <div style={{ padding: '20px 24px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: '16px', fontWeight: '700', color: '#0F172A', margin: 0 }}>📊 Rekap Absensi</h2>
          <button onClick={onClose} style={{ width: '32px', height: '32px', borderRadius: '8px', border: 'none', background: '#F8FAFC', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={15} style={{ color: '#64748B' }} />
          </button>
        </div>

        <div style={{ padding: '16px 24px', borderBottom: '1px solid #F1F5F9', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '5px' }}>KELAS</label>
            <div style={{ position: 'relative' }}>
              <select value={classId} onChange={e => setClassId(e.target.value)} style={{ ...inp, appearance: 'none', paddingRight: '28px', minWidth: '160px' }}>
                <option value="">Pilih kelas...</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <ChevronDown size={12} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', color: '#64748B', pointerEvents: 'none' }} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '5px' }}>DARI</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={inp} />
          </div>
          <div>
            <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '5px' }}>SAMPAI</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={inp} />
          </div>
          <button onClick={fetchRekap} disabled={loading}
            style={{ padding: '9px 18px', borderRadius: '9px', border: 'none', background: loading ? '#E2E8F0' : '#4F46E5', fontSize: '13px', fontWeight: '700', color: loading ? '#94A3B8' : '#fff', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: "'DM Sans', sans-serif" }}>
            {loading ? <><div style={{ width: '12px', height: '12px', borderRadius: '50%', border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', animation: 'spin .7s linear infinite' }} />Loading...</> : 'Tampilkan'}
          </button>
          {data.length > 0 && (
            <>
              <button onClick={exportPDF}
                style={{ padding: '9px 14px', borderRadius: '9px', border: '1.5px solid #E2E8F0', background: '#fff', fontSize: '13px', fontWeight: '600', color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Download size={13} />PDF
              </button>
              <button onClick={exportCSV}
                style={{ padding: '9px 14px', borderRadius: '9px', border: '1.5px solid #E2E8F0', background: '#fff', fontSize: '13px', fontWeight: '600', color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Download size={13} />CSV
              </button>
            </>
          )}
        </div>

        {err && <div style={{ margin: '12px 24px', padding: '10px 14px', background: '#FEF2F2', borderRadius: '9px', color: '#DC2626', fontSize: '13px' }}>{err}</div>}

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
          {data.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px', color: '#94A3B8' }}>
              <TrendingUp size={36} style={{ color: '#E2E8F0', marginBottom: '12px' }} />
              <div style={{ fontSize: '14px' }}>Pilih kelas dan rentang tanggal, lalu klik Tampilkan</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC' }}>
                    {['Nama Siswa', 'NIS', 'Hadir', 'Izin', 'Sakit', 'Alpha', 'Total', '% Hadir'].map(h => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: h === 'Nama Siswa' || h === 'NIS' ? 'left' : 'center', fontSize: '11px', fontWeight: '700', color: '#475569', borderBottom: '2px solid #E2E8F0', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map((r, i) => (
                    <tr key={r.student_id} style={{ background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                      <td style={{ padding: '10px 12px', fontWeight: '600', color: '#0F172A' }}>{r.student_name}</td>
                      <td style={{ padding: '10px 12px', color: '#94A3B8', fontSize: '12px' }}>{r.nis || '—'}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '700', color: '#16A34A' }}>{r.total_hadir}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', color: '#0891B2' }}>{r.total_izin}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', color: '#D97706' }}>{r.total_sakit}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', color: '#DC2626' }}>{r.total_alpha}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', color: '#64748B' }}>{r.total_sesi}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <span style={{ fontFamily: 'Sora, sans-serif', fontWeight: '700', color: (r.pct_hadir ?? 0) >= 75 ? '#16A34A' : '#DC2626' }}>
                          {r.pct_hadir ?? 0}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Main AttendancePage ───────────────────────────────────────
const AttendancePage = () => {
  const { profile } = useAuth();
  const [sessions,    setSessions]    = useState([]);
  const [classes,     setClasses]     = useState([]);
  const [subjects,    setSubjects]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [error,       setError]       = useState('');
  const [createModal, setCreateModal] = useState(false);
  const [detailSess,  setDetailSess]  = useState(null);
  const [rekapModal,  setRekapModal]  = useState(false);
  const [toast,       setToast]       = useState(null);
  const [filterClass, setFilterClass] = useState('all');
  const [filterDate,  setFilterDate]  = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const fetchAll = useCallback(async () => {
    if (!profile?.id) return;
    try {
      const [sessRes, classRes, subjRes] = await Promise.all([
        supabase.from('attendance_sessions')
          .select('*, classes(name), subjects(name)')
          .eq('teacher_id', profile.id)
          .order('date', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(60),
        supabase.from('classes').select('id, name').eq('school_id', profile.school_id).order('name'),
        supabase.from('subjects').select('id, name').eq('school_id', profile.school_id).order('name'),
      ]);
      if (sessRes.error) throw sessRes.error;
      setSessions(sessRes.data || []);
      setClasses(classRes.data || []);
      setSubjects(subjRes.data || []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, [profile?.id, profile?.school_id]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const displayed = sessions.filter(s => {
    if (filterClass !== 'all' && s.class_id !== filterClass) return false;
    if (filterDate && s.date !== filterDate) return false;
    return true;
  });

  // Stats
  const todaySessions = sessions.filter(s => s.date === todayStr()).length;
  const openSessions  = sessions.filter(s => s.is_open).length;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=DM+Sans:wght@400;500;600&display=swap');
        @keyframes fadeUp   { from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);} }
        @keyframes shimmer  { 0%{background-position:-400px 0;}100%{background-position:400px 0;} }
        @keyframes slideUp  { from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);} }
        @keyframes slideLeft{ from{opacity:0;transform:translateX(40px);}to{opacity:1;transform:translateX(0);} }
        @keyframes spin     { to{transform:rotate(360deg);} }
        .sess-row:hover { background: #F8FAFC !important; cursor: pointer; }
      `}</style>

      {toast && (
        <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 2000, padding: '12px 18px', borderRadius: '12px', background: '#0F172A', color: '#fff', fontSize: '13px', fontWeight: '600', boxShadow: '0 8px 24px rgba(0,0,0,.15)', animation: 'slideUp .2s ease', fontFamily: "'DM Sans', sans-serif" }}>
          {toast}
        </div>
      )}

      <div style={{ fontFamily: "'DM Sans', sans-serif", display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* Header */}
        <div style={{ opacity: 0, animation: 'fadeUp .4s ease forwards', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ClipboardCheck size={15} style={{ color: '#16A34A' }} />
              </div>
              <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: '22px', fontWeight: '700', color: '#0F172A', margin: 0 }}>Absensi Digital</h1>
            </div>
            <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>Kelola kehadiran siswa dengan token atau input manual</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button onClick={() => { setRefreshing(true); fetchAll(); }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 14px', borderRadius: '9px', border: '1.5px solid #E2E8F0', background: '#fff', fontSize: '13px', fontWeight: '600', color: '#475569', cursor: 'pointer' }}>
              <RefreshCw size={13} style={{ animation: refreshing ? 'spin .7s linear infinite' : 'none' }} />
            </button>
            <button onClick={() => setRekapModal(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '9px 16px', borderRadius: '9px', border: '1.5px solid #E2E8F0', background: '#fff', fontSize: '13px', fontWeight: '600', color: '#475569', cursor: 'pointer' }}>
              <TrendingUp size={13} />Rekap
            </button>
            <button onClick={() => setCreateModal(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '9px 18px', borderRadius: '9px', border: 'none', background: '#16A34A', fontSize: '13px', fontWeight: '700', color: '#fff', cursor: 'pointer' }}>
              <Plus size={14} />Buat Sesi
            </button>
          </div>
        </div>

        {/* Stats */}
        {!loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', opacity: 0, animation: 'fadeUp .4s ease 60ms forwards' }}>
            {[
              { icon: ClipboardCheck, label: 'Total Sesi',   value: sessions.length,                       color: '#4F46E5', bg: '#EFF6FF' },
              { icon: Calendar,       label: 'Sesi Hari Ini', value: todaySessions,                         color: '#16A34A', bg: '#F0FDF4' },
              { icon: Clock,          label: 'Masih Terbuka', value: openSessions,                          color: '#D97706', bg: '#FFFBEB' },
              { icon: Layers,         label: 'Kelas Aktif',  value: new Set(sessions.map(s=>s.class_id)).size, color: '#0891B2', bg: '#EFF6FF' },
            ].map(s => (
              <div key={s.label} style={{ background: '#fff', borderRadius: '14px', border: '1px solid #F1F5F9', padding: '16px 18px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <s.icon size={16} style={{ color: s.color }} />
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '600' }}>{s.label}</div>
                  <div style={{ fontFamily: 'Sora, sans-serif', fontSize: '20px', fontWeight: '700', color: '#0F172A' }}>{s.value}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {error && <div style={{ padding: '14px', background: '#FEF2F2', borderRadius: '12px', color: '#DC2626', fontSize: '13px' }}>{error}</div>}

        {/* Filters */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <select value={filterClass} onChange={e => setFilterClass(e.target.value)}
              style={{ padding: '8px 28px 8px 12px', borderRadius: '9px', border: '1.5px solid #E2E8F0', background: '#F8FAFC', fontSize: '13px', fontWeight: '600', color: '#0F172A', appearance: 'none', outline: 'none', fontFamily: "'DM Sans', sans-serif" }}>
              <option value="all">Semua Kelas</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <ChevronDown size={12} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', color: '#64748B', pointerEvents: 'none' }} />
          </div>
          <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '9px', border: '1.5px solid #E2E8F0', background: '#F8FAFC', fontSize: '13px', color: '#0F172A', outline: 'none', fontFamily: "'DM Sans', sans-serif" }} />
          {filterDate && (
            <button onClick={() => setFilterDate('')}
              style={{ padding: '8px 12px', borderRadius: '9px', border: '1px solid #E2E8F0', background: '#fff', fontSize: '12px', fontWeight: '600', color: '#64748B', cursor: 'pointer' }}>
              Reset
            </button>
          )}
        </div>

        {/* Session list */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[...Array(4)].map((_, i) => <Shimmer key={i} h={72} />)}
          </div>
        ) : displayed.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 20px', color: '#94A3B8' }}>
            <ClipboardCheck size={36} style={{ color: '#E2E8F0', marginBottom: '12px' }} />
            <div style={{ fontFamily: 'Sora, sans-serif', fontSize: '16px', fontWeight: '600', color: '#CBD5E1', marginBottom: '6px' }}>Belum ada sesi absensi</div>
            <button onClick={() => setCreateModal(true)}
              style={{ marginTop: '8px', padding: '9px 18px', borderRadius: '9px', border: 'none', background: '#16A34A', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
              Buat Sesi Pertama
            </button>
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #F1F5F9', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.03)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #F1F5F9' }}>
                  {['Sesi', 'Kelas', 'Tanggal', 'Token', 'Status', 'Aksi'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: '#64748B', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayed.map((s, i) => {
                  const isToday   = s.date === todayStr();
                  const isExpired = s.token_expires_at && new Date(s.token_expires_at) < new Date();
                  return (
                    <tr key={s.id} className="sess-row"
                      onClick={() => setDetailSess(s)}
                      style={{ borderBottom: i < displayed.length - 1 ? '1px solid #F8FAFC' : 'none', transition: 'background .15s' }}>
                      <td style={{ padding: '13px 16px' }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#0F172A' }}>{s.title}</div>
                        {s.subjects?.name && <div style={{ fontSize: '11px', color: '#94A3B8' }}>{s.subjects.name}</div>}
                      </td>
                      <td style={{ padding: '13px 16px', fontSize: '13px', color: '#475569' }}>{s.classes?.name || '—'}</td>
                      <td style={{ padding: '13px 16px' }}>
                        <div style={{ fontSize: '13px', color: '#374151' }}>{fmtShort(s.date)}</div>
                        {isToday && <span style={{ fontSize: '10px', fontWeight: '700', color: '#16A34A', background: '#F0FDF4', padding: '1px 6px', borderRadius: '4px' }}>Hari ini</span>}
                      </td>
                      <td style={{ padding: '13px 16px' }}>
                        <span style={{ fontFamily: 'Sora, sans-serif', fontSize: '13px', fontWeight: '700', color: isExpired ? '#94A3B8' : '#0F172A', letterSpacing: '0.15em', background: '#F8FAFC', padding: '3px 8px', borderRadius: '6px', border: '1px solid #F1F5F9' }}>
                          {s.token}
                        </span>
                        {isExpired && <div style={{ fontSize: '10px', color: '#DC2626', marginTop: '2px' }}>Kedaluwarsa</div>}
                      </td>
                      <td style={{ padding: '13px 16px' }}>
                        <span style={{ padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: '700', background: s.is_open ? '#F0FDF4' : '#F8FAFC', color: s.is_open ? '#16A34A' : '#64748B' }}>
                          {s.is_open ? '● Terbuka' : '■ Ditutup'}
                        </span>
                      </td>
                      <td style={{ padding: '13px 16px' }} onClick={e => e.stopPropagation()}>
                        <button onClick={() => setDetailSess(s)}
                          style={{ padding: '5px 12px', borderRadius: '7px', border: '1px solid #E2E8F0', background: '#F8FAFC', fontSize: '12px', fontWeight: '600', color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Edit3 size={11} />Input
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {createModal && (
        <CreateSessionModal
          classes={classes} subjects={subjects} profile={profile}
          onClose={() => setCreateModal(false)}
          onCreated={(sess) => { setCreateModal(false); fetchAll(); setDetailSess(sess); showToast(`Sesi "${sess.title}" berhasil dibuat!`); }}
        />
      )}

      {detailSess && (
        <SessionDrawer
          session={detailSess}
          onClose={() => { setDetailSess(null); fetchAll(); }}
          onUpdated={fetchAll}
        />
      )}

      {rekapModal && (
        <RekapModal classes={classes} profile={profile} onClose={() => setRekapModal(false)} />
      )}
    </>
  );
};

export default AttendancePage;