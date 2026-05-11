import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  UserCheck, UserX, Search, RefreshCw, ChevronDown,
  AlertCircle, CheckCircle2, Clock, Users, GraduationCap,
  XCircle, Filter, Mail, Phone, Calendar, School,
  Eye, MoreHorizontal, Inbox,
} from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('id-ID', {
  day: 'numeric', month: 'short', year: 'numeric',
}) : '—';
const fmtTime = (d) => d ? new Date(d).toLocaleTimeString('id-ID', {
  hour: '2-digit', minute: '2-digit',
}) : '';

const STATUS_META = {
  pending:  { label: 'Menunggu',  bg: '#FFFBEB', color: '#D97706', icon: Clock,        dot: '#F59E0B' },
  active:   { label: 'Aktif',     bg: '#F0FDF4', color: '#16A34A', icon: CheckCircle2, dot: '#22C55E' },
  rejected: { label: 'Ditolak',   bg: '#FEF2F2', color: '#DC2626', icon: XCircle,      dot: '#EF4444' },
};

// ── Atoms ─────────────────────────────────────────────────────────
const Shimmer = ({ h = 14, w = '100%', r = 8 }) => (
  <div style={{ height: h, width: w, borderRadius: r, background: 'linear-gradient(90deg,#F1F5F9 25%,#E2E8F0 50%,#F1F5F9 75%)', backgroundSize: '800px 100%', animation: 'shimmer 1.2s infinite' }} />
);

const Avatar = ({ name, size = 40, color = '#0891B2', bg = '#EFF6FF' }) => (
  <div style={{ width: size, height: size, borderRadius: size * 0.28, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Sora, sans-serif', fontWeight: '700', fontSize: size * 0.38, color, flexShrink: 0 }}>
    {(name || '?').charAt(0).toUpperCase()}
  </div>
);

const StatCard = ({ icon: Icon, label, value, color, bg, highlight }) => (
  <div style={{ background: highlight ? color : '#fff', borderRadius: '14px', border: `1.5px solid ${highlight ? color : '#F1F5F9'}`, padding: '16px 18px', display: 'flex', gap: '12px', alignItems: 'center', boxShadow: highlight ? `0 4px 16px ${color}30` : '0 1px 4px rgba(0,0,0,.03)', opacity: 0, animation: 'fadeUp .4s ease forwards' }}>
    <div style={{ width: '38px', height: '38px', borderRadius: '11px', background: highlight ? 'rgba(255,255,255,.2)' : bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Icon size={17} style={{ color: highlight ? '#fff' : color }} />
    </div>
    <div>
      <div style={{ fontSize: '11px', fontWeight: '600', color: highlight ? 'rgba(255,255,255,.8)' : '#64748B', marginBottom: '2px' }}>{label}</div>
      <div style={{ fontFamily: 'Sora, sans-serif', fontSize: '22px', fontWeight: '700', color: highlight ? '#fff' : '#0F172A', lineHeight: 1 }}>{value}</div>
    </div>
  </div>
);

// ── Reject Modal ──────────────────────────────────────────────────
const RejectModal = ({ student, onClose, onConfirm, loading }) => {
  const [reason, setReason] = useState('');
  if (!student) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.55)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: '#fff', borderRadius: '20px', padding: '28px', width: '100%', maxWidth: '440px', boxShadow: '0 25px 60px rgba(0,0,0,.2)', animation: 'scaleIn .2s cubic-bezier(.34,1.56,.64,1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <UserX size={20} style={{ color: '#DC2626' }} />
          </div>
          <div>
            <h3 style={{ fontFamily: 'Sora, sans-serif', fontSize: '16px', fontWeight: '700', color: '#0F172A', margin: 0 }}>Tolak Pendaftaran</h3>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '2px 0 0' }}>{student.name}</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '20px' }}>
          <label style={{ fontSize: '12px', fontWeight: '700', color: '#374151' }}>Alasan Penolakan <span style={{ color: '#94A3B8', fontWeight: '400' }}>(opsional, dikirim ke siswa)</span></label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Contoh: NIS tidak terdaftar di sistem sekolah kami, silakan hubungi tata usaha..."
            rows={3}
            style={{ padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #E2E8F0', background: '#F8FAFC', fontSize: '13px', color: '#0F172A', fontFamily: "'DM Sans', sans-serif", resize: 'none', outline: 'none', transition: 'border-color .15s' }}
            onFocus={e => e.target.style.borderColor = '#EF4444'}
            onBlur={e => e.target.style.borderColor = '#E2E8F0'}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} disabled={loading}
            style={{ padding: '9px 18px', borderRadius: '10px', border: '1.5px solid #E2E8F0', background: '#F8FAFC', fontSize: '13px', fontWeight: '600', color: '#64748B', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
            Batal
          </button>
          <button onClick={() => onConfirm(reason)} disabled={loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '9px 18px', borderRadius: '10px', border: 'none', background: '#DC2626', fontSize: '13px', fontWeight: '700', color: '#fff', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, fontFamily: "'DM Sans', sans-serif" }}>
            {loading
              ? <div style={{ width: '13px', height: '13px', border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
              : <UserX size={13} />}
            Tolak & Kirim Email
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Approve Modal ─────────────────────────────────────────────────
const ApproveModal = ({ student, classes, onClose, onConfirm, loading }) => {
  const [classId, setClassId] = useState(student?.class_id || '');
  if (!student) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.55)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: '#fff', borderRadius: '20px', padding: '28px', width: '100%', maxWidth: '440px', boxShadow: '0 25px 60px rgba(0,0,0,.2)', animation: 'scaleIn .2s cubic-bezier(.34,1.56,.64,1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <UserCheck size={20} style={{ color: '#16A34A' }} />
          </div>
          <div>
            <h3 style={{ fontFamily: 'Sora, sans-serif', fontSize: '16px', fontWeight: '700', color: '#0F172A', margin: 0 }}>Setujui Pendaftaran</h3>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '2px 0 0' }}>{student.name}</p>
          </div>
        </div>

        {/* Student info preview */}
        <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '14px 16px', marginBottom: '18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[
            { label: 'Email',    value: student.email || '—' },
            { label: 'NIS',      value: student.nis   || '—' },
            { label: 'Telepon',  value: student.phone || '—' },
            { label: 'Mendaftar',value: fmtDate(student.created_at) },
          ].map(r => (
            <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', gap: '12px' }}>
              <span style={{ color: '#94A3B8', fontWeight: '600', flexShrink: 0 }}>{r.label}</span>
              <span style={{ color: '#0F172A', textAlign: 'right' }}>{r.value}</span>
            </div>
          ))}
        </div>

        {/* Class assignment */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '20px' }}>
          <label style={{ fontSize: '12px', fontWeight: '700', color: '#374151' }}>
            Assign ke Kelas <span style={{ color: '#EF4444' }}>*</span>
          </label>
          <div style={{ position: 'relative' }}>
            <select value={classId} onChange={e => setClassId(e.target.value)}
              style={{ width: '100%', padding: '10px 32px 10px 12px', borderRadius: '10px', border: `1.5px solid ${!classId ? '#FCA5A5' : '#E2E8F0'}`, background: '#F8FAFC', fontSize: '13px', color: classId ? '#0F172A' : '#94A3B8', fontFamily: "'DM Sans', sans-serif", appearance: 'none', cursor: 'pointer', outline: 'none' }}
              onFocus={e => e.target.style.borderColor = '#16A34A'}
              onBlur={e => e.target.style.borderColor = !classId ? '#FCA5A5' : '#E2E8F0'}>
              <option value="">— Pilih kelas —</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <ChevronDown size={13} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
          </div>
          {!classId && <span style={{ fontSize: '11px', color: '#EF4444' }}>Kelas wajib dipilih sebelum menyetujui</span>}
        </div>

        <div style={{ padding: '12px 14px', background: '#EFF6FF', borderRadius: '10px', border: '1px solid #BAE6FD', marginBottom: '20px' }}>
          <p style={{ fontSize: '12px', color: '#0369A1', lineHeight: 1.6, margin: 0 }}>
            <strong>Setelah disetujui:</strong> Siswa akan di-assign ke kelas yang dipilih, status diubah ke aktif, dan <strong>link aktivasi akun</strong> akan dikirim ke email siswa via Supabase.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} disabled={loading}
            style={{ padding: '9px 18px', borderRadius: '10px', border: '1.5px solid #E2E8F0', background: '#F8FAFC', fontSize: '13px', fontWeight: '600', color: '#64748B', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
            Batal
          </button>
          <button onClick={() => classId && onConfirm(classId)} disabled={loading || !classId}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '9px 18px', borderRadius: '10px', border: 'none', background: !classId ? '#94A3B8' : '#16A34A', fontSize: '13px', fontWeight: '700', color: '#fff', cursor: (loading || !classId) ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, fontFamily: "'DM Sans', sans-serif", transition: 'background .15s' }}>
            {loading
              ? <div style={{ width: '13px', height: '13px', border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
              : <UserCheck size={13} />}
            Setujui & Kirim Link
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Detail Drawer ─────────────────────────────────────────────────
const DetailDrawer = ({ student, classes, onClose, onApprove, onReject }) => {
  if (!student) return null;
  const sm = STATUS_META[student.status] || STATUS_META.pending;
  const classObj = classes.find(c => c.id === student.class_id);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 190, display: 'flex' }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ flex: 1, background: 'rgba(15,23,42,.45)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div style={{ width: '100%', maxWidth: '380px', background: '#fff', height: '100%', display: 'flex', flexDirection: 'column', boxShadow: '-20px 0 60px rgba(0,0,0,.15)', animation: 'slideLeft .28s cubic-bezier(.16,1,.3,1)' }}>
        {/* Header */}
        <div style={{ padding: '22px', borderBottom: '1px solid #F1F5F9', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 0, display: 'flex' }}>
              <XCircle size={18} />
            </button>
            <span style={{ padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: '700', background: sm.bg, color: sm.color, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <sm.icon size={10} />{sm.label}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <Avatar name={student.name} size={52} color="#0891B2" bg="#EFF6FF" />
            <div>
              <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: '17px', fontWeight: '700', color: '#0F172A', margin: '0 0 3px' }}>{student.name}</h2>
              <div style={{ fontSize: '12px', color: '#64748B' }}>{student.email}</div>
            </div>
          </div>
        </div>

        {/* Info */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {[
              { icon: Mail,     label: 'Email',         value: student.email   || '—' },
              { icon: GraduationCap, label: 'NIS',      value: student.nis     || '—' },
              { icon: Phone,    label: 'Telepon',        value: student.phone   || '—' },
              { icon: School,   label: 'Kelas Dipilih',  value: classObj?.name  || 'Belum dipilih' },
              { icon: Calendar, label: 'Tanggal Daftar', value: `${fmtDate(student.created_at)} · ${fmtTime(student.created_at)}` },
            ].map((r, i, arr) => (
              <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '13px 0', borderBottom: i < arr.length - 1 ? '1px solid #F8FAFC' : 'none' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <r.icon size={14} style={{ color: '#94A3B8' }} />
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: '600', marginBottom: '1px' }}>{r.label}</div>
                  <div style={{ fontSize: '13px', color: '#0F172A', wordBreak: 'break-all' }}>{r.value}</div>
                </div>
              </div>
            ))}
          </div>

          {student.rejection_reason && (
            <div style={{ marginTop: '16px', padding: '12px 14px', background: '#FEF2F2', borderRadius: '10px', border: '1px solid #FECACA' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#DC2626', marginBottom: '5px' }}>ALASAN PENOLAKAN</div>
              <div style={{ fontSize: '13px', color: '#B91C1C', lineHeight: 1.5 }}>{student.rejection_reason}</div>
            </div>
          )}
        </div>

        {/* Actions (only for pending) */}
        {student.status === 'pending' && (
          <div style={{ padding: '16px 20px', borderTop: '1px solid #F1F5F9', display: 'flex', gap: '10px', flexShrink: 0 }}>
            <button onClick={() => onReject(student)}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', padding: '11px', borderRadius: '11px', border: '1.5px solid #FECACA', background: '#FEF2F2', fontSize: '13px', fontWeight: '700', color: '#DC2626', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
              <UserX size={14} />Tolak
            </button>
            <button onClick={() => onApprove(student)}
              style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', padding: '11px', borderRadius: '11px', border: 'none', background: '#16A34A', fontSize: '13px', fontWeight: '700', color: '#fff', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
              <UserCheck size={14} />Setujui & Assign Kelas
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Main ──────────────────────────────────────────────────────────
const StudentApprovals = () => {
  const { profile } = useAuth();

  const [students,   setStudents]   = useState([]);
  const [classes,    setClasses]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actLoading, setActLoading] = useState(false);
  const [error,      setError]      = useState(null);

  const [filter,     setFilter]     = useState('pending');
  const [search,     setSearch]     = useState('');

  const [detailStudent, setDetailStudent] = useState(null);
  const [approveModal,  setApproveModal]  = useState(null);
  const [rejectModal,   setRejectModal]   = useState(null);
  const [toast,         setToast]         = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchData = useCallback(async () => {
    if (!profile?.school_id) return;
    try {
      const [studRes, classRes] = await Promise.all([
        supabase.from('profiles')
          .select('id, name, email, nis, phone, class_id, status, rejection_reason, created_at, approved_at')
          .eq('school_id', profile.school_id)
          .eq('role', 'student')
          .order('created_at', { ascending: false }),
        supabase.from('classes')
          .select('id, name')
          .eq('school_id', profile.school_id)
          .order('name'),
      ]);
      if (studRes.error) throw studRes.error;
      setStudents(studRes.data || []);
      setClasses(classRes.data || []);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, [profile?.school_id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Call Edge Function ─────────────────────────────────────────
  const callEdgeFunction = async (payload) => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-activation-email`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify(payload),
      }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Edge function error');
    return data;
  };

  // ── Approve ────────────────────────────────────────────────────
  const handleApproveConfirm = async (classId) => {
    if (!approveModal) return;
    setActLoading(true);
    try {
      const result = await callEdgeFunction({
        student_id: approveModal.id,
        action: 'approve',
        class_id: classId,
      });

      // Update local state
      setStudents(prev => prev.map(s =>
        s.id === approveModal.id
          ? { ...s, status: 'active', class_id: classId, approved_at: new Date().toISOString() }
          : s
      ));

      setApproveModal(null);
      setDetailStudent(null);
      const emailInfo = result.email_sent ? ' · Link aktivasi dikirim ke email' : ' · (email gagal terkirim)';
      showToast(`${approveModal.name} disetujui${emailInfo}`);
    } catch (err) { showToast(err.message, 'error'); }
    finally { setActLoading(false); }
  };

  // ── Reject ─────────────────────────────────────────────────────
  const handleRejectConfirm = async (reason) => {
    if (!rejectModal) return;
    setActLoading(true);
    try {
      await callEdgeFunction({
        student_id: rejectModal.id,
        action: 'reject',
        rejection_reason: reason || null,
      });

      setStudents(prev => prev.map(s =>
        s.id === rejectModal.id
          ? { ...s, status: 'rejected', rejection_reason: reason || null }
          : s
      ));

      setRejectModal(null);
      setDetailStudent(null);
      showToast(`Pendaftaran ${rejectModal.name} ditolak · Email notifikasi dikirim`, 'warning');
    } catch (err) { showToast(err.message, 'error'); }
    finally { setActLoading(false); }
  };

  // ── Quick actions (from row) ───────────────────────────────────
  const quickApprove = (s) => { setApproveModal(s); setDetailStudent(null); };
  const quickReject  = (s) => { setRejectModal(s);  setDetailStudent(null); };

  // ── Stats ──────────────────────────────────────────────────────
  const pending  = students.filter(s => s.status === 'pending').length;
  const active   = students.filter(s => s.status === 'active').length;
  const rejected = students.filter(s => s.status === 'rejected').length;

  // ── Filtered list ──────────────────────────────────────────────
  const displayed = students.filter(s => {
    const matchFilter = filter === 'all' || s.status === filter;
    const q = search.toLowerCase();
    const matchSearch = !search
      || s.name?.toLowerCase().includes(q)
      || s.email?.toLowerCase().includes(q)
      || s.nis?.toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  const FILTERS = [
    { v: 'pending',  label: 'Menunggu',  count: pending  },
    { v: 'active',   label: 'Aktif',     count: active   },
    { v: 'rejected', label: 'Ditolak',   count: rejected },
    { v: 'all',      label: 'Semua',     count: students.length },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&family=DM+Sans:wght@400;500;600&display=swap');
        @keyframes fadeUp    { from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);} }
        @keyframes shimmer   { 0%{background-position:-400px 0;}100%{background-position:400px 0;} }
        @keyframes slideLeft { from{opacity:0;transform:translateX(30px);}to{opacity:1;transform:translateX(0);} }
        @keyframes scaleIn   { from{opacity:0;transform:scale(.93);}to{opacity:1;transform:scale(1);} }
        @keyframes spin      { to{transform:rotate(360deg);} }
        @keyframes slideDown { from{opacity:0;transform:translateY(-8px);}to{opacity:1;transform:translateY(0);} }
        .appr-row { transition: background .12s; }
        .appr-row:hover { background: #F8FAFC !important; }
        .appr-row:hover .row-actions { opacity: 1 !important; }
        .row-actions { opacity: 0; transition: opacity .15s; }
      `}</style>

      <div style={{ fontFamily: "'DM Sans', sans-serif", display: 'flex', flexDirection: 'column', gap: '22px' }}>

        {/* Header */}
        <div style={{ opacity: 0, animation: 'fadeUp .4s ease forwards', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#FFFBEB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <UserCheck size={15} style={{ color: '#D97706' }} />
              </div>
              <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: '22px', fontWeight: '700', color: '#0F172A', margin: 0 }}>Persetujuan Siswa</h1>
            </div>
            <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>
              {pending > 0
                ? <span style={{ color: '#D97706', fontWeight: '600' }}>● {pending} pendaftaran menunggu persetujuanmu</span>
                : 'Kelola pendaftaran siswa baru ke sekolahmu'}
            </p>
          </div>
          <button onClick={() => { setRefreshing(true); fetchData(); }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 14px', borderRadius: '9px', border: '1.5px solid #E2E8F0', background: '#fff', fontSize: '13px', fontWeight: '600', color: '#475569', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
            <RefreshCw size={13} style={{ animation: refreshing ? 'spin .7s linear infinite' : 'none' }} />
            Refresh
          </button>
        </div>

        {error && (
          <div style={{ padding: '14px 18px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '12px', color: '#DC2626', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={14} />{error}
          </div>
        )}

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
          {[
            { icon: Clock,       label: 'Menunggu',  value: pending,          color: '#D97706', bg: '#FFFBEB', highlight: pending > 0 },
            { icon: CheckCircle2,label: 'Aktif',     value: active,           color: '#16A34A', bg: '#F0FDF4' },
            { icon: XCircle,     label: 'Ditolak',   value: rejected,         color: '#DC2626', bg: '#FEF2F2' },
            { icon: Users,       label: 'Total Siswa',value: students.length, color: '#4F46E5', bg: '#EEF2FF' },
          ].map((c, i) => (
            <div key={c.label} style={{ animationDelay: `${i * 40}ms` }}>
              <StatCard {...c} />
            </div>
          ))}
        </div>

        {/* Filters + Search */}
        <div style={{ opacity: 0, animation: 'fadeUp .4s ease 120ms forwards', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Status tabs */}
          <div style={{ display: 'flex', background: '#F8FAFC', borderRadius: '10px', padding: '3px', gap: '2px', border: '1px solid #F1F5F9' }}>
            {FILTERS.map(f => {
              const sm = STATUS_META[f.v] || { color: '#64748B' };
              const active = filter === f.v;
              return (
                <button key={f.v} onClick={() => setFilter(f.v)}
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '8px', border: 'none', background: active ? '#fff' : 'transparent', boxShadow: active ? '0 1px 4px rgba(0,0,0,.08)' : 'none', fontSize: '12px', fontWeight: active ? '700' : '500', color: active ? sm.color : '#94A3B8', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'all .15s', whiteSpace: 'nowrap' }}>
                  {f.label}
                  {f.count > 0 && (
                    <span style={{ padding: '1px 6px', borderRadius: '999px', fontSize: '10px', fontWeight: '700', background: active ? sm.color : '#E2E8F0', color: active ? '#fff' : '#64748B' }}>
                      {f.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <Search size={13} style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
            <input type="text" placeholder="Cari nama, email, atau NIS..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', padding: '9px 12px 9px 32px', borderRadius: '10px', border: '1.5px solid #E2E8F0', background: '#F8FAFC', fontSize: '13px', color: '#0F172A', outline: 'none', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box', transition: 'border-color .15s' }}
              onFocus={e => { e.target.style.borderColor = '#D97706'; e.target.style.boxShadow = '0 0 0 3px rgba(217,119,6,.1)'; }}
              onBlur={e => { e.target.style.borderColor = '#E2E8F0'; e.target.style.boxShadow = 'none'; }} />
          </div>

          <span style={{ fontSize: '12px', color: '#94A3B8' }}>{displayed.length} siswa</span>
        </div>

        {/* Table */}
        <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #F1F5F9', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.03)', opacity: 0, animation: 'fadeUp .4s ease 160ms forwards' }}>
          {loading
            ? <div style={{ padding: '20px' }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} style={{ display: 'flex', gap: '16px', padding: '14px 0', borderBottom: '1px solid #F8FAFC', alignItems: 'center' }}>
                    <Shimmer w="40px" h={40} r={11} />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '7px' }}>
                      <Shimmer h={13} w="45%" />
                      <Shimmer h={11} w="30%" />
                    </div>
                    <Shimmer w="60px" h={22} r={999} />
                    <Shimmer w="80px" />
                  </div>
                ))}
              </div>
            : displayed.length === 0
            ? <div style={{ padding: '64px 20px', textAlign: 'center' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                  <Inbox size={24} style={{ color: '#CBD5E1' }} />
                </div>
                <div style={{ fontFamily: 'Sora, sans-serif', fontSize: '16px', fontWeight: '700', color: '#0F172A', marginBottom: '6px' }}>
                  {filter === 'pending' ? 'Tidak ada yang menunggu' : 'Tidak ada siswa'}
                </div>
                <div style={{ fontSize: '13px', color: '#94A3B8' }}>
                  {filter === 'pending'
                    ? 'Semua pendaftaran sudah diproses 🎉'
                    : search ? 'Coba kata kunci lain' : 'Siswa akan muncul setelah mendaftar'}
                </div>
              </div>
            : <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '640px' }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #F1F5F9' }}>
                      {['Siswa', 'NIS', 'Kelas', 'Tanggal Daftar', 'Status', ''].map(h => (
                        <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: '#94A3B8', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {displayed.map((s, idx) => {
                      const sm = STATUS_META[s.status] || STATUS_META.pending;
                      const classObj = classes.find(c => c.id === s.class_id);
                      return (
                        <tr key={s.id} className="appr-row"
                          style={{ borderBottom: '1px solid #F8FAFC', background: '#fff', cursor: 'pointer', opacity: 0, animation: `fadeUp .3s ease ${Math.min(idx, 15) * 25}ms forwards` }}
                          onClick={() => setDetailStudent(s)}>
                          <td style={{ padding: '13px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
                              <Avatar name={s.name} size={38} color="#0891B2" bg="#EFF6FF" />
                              <div>
                                <div style={{ fontSize: '13px', fontWeight: '600', color: '#0F172A' }}>{s.name}</div>
                                <div style={{ fontSize: '11px', color: '#94A3B8' }}>{s.email}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '13px 16px', fontSize: '12px', color: '#64748B', fontFamily: 'Sora, sans-serif' }}>{s.nis || '—'}</td>
                          <td style={{ padding: '13px 16px', fontSize: '13px', color: '#374151' }}>{classObj?.name || <span style={{ color: '#CBD5E1', fontStyle: 'italic' }}>Belum assigned</span>}</td>
                          <td style={{ padding: '13px 16px' }}>
                            <div style={{ fontSize: '12px', color: '#374151' }}>{fmtDate(s.created_at)}</div>
                            <div style={{ fontSize: '11px', color: '#94A3B8' }}>{fmtTime(s.created_at)}</div>
                          </td>
                          <td style={{ padding: '13px 16px' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: '700', background: sm.bg, color: sm.color }}>
                              <sm.icon size={10} />{sm.label}
                            </span>
                          </td>
                          <td style={{ padding: '13px 16px' }}>
                            {s.status === 'pending' && (
                              <div className="row-actions" style={{ display: 'flex', gap: '6px' }} onClick={e => e.stopPropagation()}>
                                <button onClick={() => quickReject(s)}
                                  style={{ padding: '5px 10px', borderRadius: '7px', border: '1.5px solid #FECACA', background: '#FEF2F2', fontSize: '12px', fontWeight: '600', color: '#DC2626', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <UserX size={11} />Tolak
                                </button>
                                <button onClick={() => quickApprove(s)}
                                  style={{ padding: '5px 10px', borderRadius: '7px', border: 'none', background: '#16A34A', fontSize: '12px', fontWeight: '600', color: '#fff', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <UserCheck size={11} />Setuju
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div style={{ padding: '10px 16px', borderTop: '1px solid #F8FAFC', fontSize: '12px', color: '#94A3B8' }}>
                  Klik baris untuk detail · Hover untuk aksi cepat
                </div>
              </div>
          }
        </div>
      </div>

      {/* Detail Drawer */}
      {detailStudent && (
        <DetailDrawer
          student={detailStudent}
          classes={classes}
          onClose={() => setDetailStudent(null)}
          onApprove={s => { setApproveModal(s); setDetailStudent(null); }}
          onReject={s => { setRejectModal(s); setDetailStudent(null); }}
        />
      )}

      {/* Approve Modal */}
      {approveModal && (
        <ApproveModal
          student={approveModal}
          classes={classes}
          onClose={() => setApproveModal(null)}
          onConfirm={handleApproveConfirm}
          loading={actLoading}
        />
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <RejectModal
          student={rejectModal}
          onClose={() => setRejectModal(null)}
          onConfirm={handleRejectConfirm}
          loading={actLoading}
        />
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 300, display: 'flex', alignItems: 'center', gap: '10px', padding: '13px 18px', borderRadius: '12px', background: toast.type === 'error' ? '#DC2626' : toast.type === 'warning' ? '#D97706' : '#0F172A', color: '#fff', fontSize: '13px', fontWeight: '500', boxShadow: '0 8px 30px rgba(0,0,0,.2)', fontFamily: "'DM Sans', sans-serif", animation: 'slideDown .25s ease' }}>
          {toast.type === 'error' ? <AlertCircle size={15} /> : <CheckCircle2 size={15} style={{ color: '#4ADE80' }} />}
          {toast.msg}
        </div>
      )}
    </>
  );
};

export default StudentApprovals;