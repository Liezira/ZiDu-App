/**
 * InviteManager.jsx — Link undangan untuk siswa & guru
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  createInviteLink, getInvitesBySchool, getInvitesByClass,
  deactivateInvite, buildInviteUrl, isExpired, isQuotaFull,
} from '../services/inviteService';
import {
  Link2, Copy, Check, X, RefreshCw, Clock, Users,
  GraduationCap, BookOpen, AlertCircle, CheckCircle2,
  ExternalLink, School, ChevronDown,
} from 'lucide-react';

const T = {
  brand: '#4F46E5', brandBg: '#EEF2FF', brandBdr: '#C7D2FE',
  success: '#059669', sucBg: '#ECFDF5', sucBdr: '#A7F3D0',
  danger: '#DC2626', dangBg: '#FEF2F2', dangBdr: '#FECACA',
  student: { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  teacher: { color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
};

const fmtDate = (d) => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

function statusOf(inv) {
  if (!inv.is_active)   return { label: 'Nonaktif',   dot: '#94A3B8' };
  if (isExpired(inv))   return { label: 'Kadaluarsa', dot: '#D97706' };
  if (isQuotaFull(inv)) return { label: 'Penuh',      dot: '#7C3AED' };
  return                       { label: 'Aktif',      dot: '#059669' };
}

const Spin = () => (
  <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .7s linear infinite', flexShrink: 0 }} />
);

const CopyBtn = ({ text }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 8, border: `1.5px solid ${copied ? T.sucBdr : T.brandBdr}`, background: copied ? T.sucBg : T.brandBg, color: copied ? T.success : T.brand, fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all .15s', whiteSpace: 'nowrap', fontFamily: "'Plus Jakarta Sans',sans-serif", flexShrink: 0 }}>
      {copied ? <><Check size={11} /> Tersalin!</> : <><Copy size={11} /> Salin Link</>}
    </button>
  );
};

const Sel = ({ value, onChange, options }) => (
  <div style={{ position: 'relative' }}>
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ appearance: 'none', width: '100%', padding: '9px 28px 9px 12px', borderRadius: 9, border: '1.5px solid #E2E8F0', background: '#F8FAFC', fontSize: 13, color: '#0F172A', outline: 'none', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans',sans-serif", transition: 'border-color .15s' }}
      onFocus={e => e.target.style.borderColor = T.brand}
      onBlur={e => e.target.style.borderColor = '#E2E8F0'}>
      {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
    <ChevronDown size={13} style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
  </div>
);

// ── CreateForm ────────────────────────────────────────────────────
const CreateForm = ({ profile, classId, className, defaultRole, remainingSlots, maxStudents, onCreated }) => {
  const [role, setRole]       = useState(defaultRole || 'student');
  // Default kuota = sisa kapasitas kelas (jika ada), fallback 100
  const defaultMax = remainingSlots > 0 ? String(remainingSlots) : '100';
  const [maxUses, setMaxUses] = useState(defaultMax);
  const [days, setDays]       = useState('7');
  const [label, setLabel]     = useState(className ? `Link ${className}` : '');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handle = async () => {
    setLoading(true); setError('');
    try {
      const token = await createInviteLink({
        schoolId: profile.school_id, createdBy: profile.id,
        targetRole: role, classId: classId || null,
        className: className || null, label: label.trim() || null,
        maxUses: Number(maxUses),
      });
      onCreated({ token, role, label });
    } catch (err) { setError(err.message || 'Gagal membuat link.'); }
    finally { setLoading(false); }
  };

  const roles = [
    { id: 'student', label: 'Siswa', desc: 'Daftar ke kelas', Icon: GraduationCap, m: T.student },
    { id: 'teacher', label: 'Guru',  desc: 'Akun guru baru',  Icon: BookOpen,      m: T.teacher },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Role */}
      <div>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>Tipe Undangan</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {roles.map(({ id, label: lbl, desc, Icon, m }) => {
            const active = role === id;
            return (
              <button key={id} type="button" onClick={() => setRole(id)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 13px', borderRadius: 11, border: `2px solid ${active ? m.color : '#E2E8F0'}`, background: active ? m.bg : '#fff', cursor: 'pointer', transition: 'all .15s', textAlign: 'left' }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: active ? m.color : '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .15s' }}>
                  <Icon size={15} color={active ? '#fff' : '#94A3B8'} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: active ? m.color : '#374151', lineHeight: 1.2 }}>{lbl}</div>
                  <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>{desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Label */}
      <div>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px' }}>
          Label <span style={{ color: '#CBD5E1', fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: 11 }}>(opsional)</span>
        </p>
        <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Contoh: Link MIPA Test 1"
          style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: '1.5px solid #E2E8F0', background: '#F8FAFC', fontSize: 13, color: '#0F172A', outline: 'none', boxSizing: 'border-box', fontFamily: "'Plus Jakarta Sans',sans-serif", transition: 'border-color .15s' }}
          onFocus={e => { e.target.style.borderColor = T.brand; e.target.style.background = '#FAFBFF'; }}
          onBlur={e => { e.target.style.borderColor = '#E2E8F0'; e.target.style.background = '#F8FAFC'; }} />
      </div>

      {/* Kuota + masa berlaku */}
      {/* Kapasitas kelas */}
      {maxStudents > 0 && (
        <div style={{ padding: '10px 13px', borderRadius: 9, background: remainingSlots > 0 ? '#F0FDF4' : '#FEF2F2', border: `1px solid ${remainingSlots > 0 ? '#A7F3D0' : '#FECACA'}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={14} style={{ color: remainingSlots > 0 ? '#059669' : '#DC2626', flexShrink: 0 }} />
            <div>
              <span style={{ fontSize: 12, fontWeight: 700, color: remainingSlots > 0 ? '#065F46' : '#991B1B' }}>
                {remainingSlots > 0 ? `${remainingSlots} kursi tersisa` : 'Kelas penuh'}
              </span>
              <span style={{ fontSize: 11, color: '#94A3B8', marginLeft: 6 }}>dari {maxStudents} maks.</span>
            </div>
          </div>
          {remainingSlots > 0 && (
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: '#D1FAE5', color: '#059669' }}>
              Kuota otomatis = {remainingSlots}
            </span>
          )}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px' }}>Kuota Undangan</p>
          <Sel value={maxUses} onChange={setMaxUses} options={[
            { v: '5',   l: '5 orang'  }, { v: '10',  l: '10 orang' }, { v: '20',  l: '20 orang' },
            { v: '30',  l: '30 orang' }, { v: '50',  l: '50 orang' }, { v: '100', l: '100 orang' },
            { v: '200', l: '200 orang'}, { v: '0',   l: 'Tak terbatas' },
            ...(remainingSlots > 0 && ![5,10,20,30,50,100,200].includes(remainingSlots)
              ? [{ v: String(remainingSlots), l: `${remainingSlots} orang (sisa kelas)` }]
              : []),
          ].sort((a, b) => (Number(a.v) || 9999) - (Number(b.v) || 9999))} />
        </div>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px' }}>Masa Berlaku</p>
          <Sel value={days} onChange={setDays} options={[
            { v: '1', l: '1 hari' }, { v: '3', l: '3 hari' }, { v: '7', l: '7 hari' },
            { v: '14', l: '14 hari' }, { v: '30', l: '30 hari' },
          ]} />
        </div>
      </div>

      {error && (
        <div style={{ padding: '10px 13px', borderRadius: 9, background: T.dangBg, border: `1px solid ${T.dangBdr}`, color: T.danger, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle size={14} style={{ flexShrink: 0 }} />{error}
        </div>
      )}

      <button onClick={handle} disabled={loading}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: 13, borderRadius: 11, border: 'none', background: T.brand, color: '#fff', fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: "'Plus Jakarta Sans',sans-serif", transition: 'background .15s', opacity: loading ? 0.8 : 1 }}
        onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#4338CA'; }}
        onMouseLeave={e => { if (!loading) e.currentTarget.style.background = T.brand; }}>
        {loading ? <><Spin /> Membuat link...</> : <><Link2 size={15} /> Buat Link Undangan</>}
      </button>
    </div>
  );
};

// ── Result ────────────────────────────────────────────────────────
const ResultScreen = ({ newLink, onBack, onHistory }) => {
  const url = buildInviteUrl(newLink.token);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
      <div style={{ width: 54, height: 54, borderRadius: '50%', background: T.sucBg, border: `2px solid ${T.sucBdr}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
        <CheckCircle2 size={26} color={T.success} />
      </div>
      <h3 style={{ fontFamily: 'Sora,sans-serif', fontSize: 17, fontWeight: 800, color: '#0F172A', margin: '0 0 6px' }}>Link Siap Dibagikan!</h3>
      <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.6, margin: '0 0 20px', maxWidth: 340 }}>
        Bagikan ke {newLink.role === 'student' ? 'siswa' : 'guru'} via WhatsApp atau grup kelas. Link berlaku <strong>7 hari</strong>.
      </p>

      <div style={{ width: '100%', background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: 12, padding: '14px 16px', marginBottom: 12, textAlign: 'left' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Link Undangan</span>
          <CopyBtn text={url} />
        </div>
        <p style={{ fontSize: 12, color: '#374151', fontFamily: 'monospace', wordBreak: 'break-all', lineHeight: 1.55, margin: 0 }}>{url}</p>
      </div>

      <div style={{ width: '100%', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '11px 14px', marginBottom: 20, textAlign: 'left' }}>
        <p style={{ fontSize: 12, color: '#92400E', fontWeight: 700, margin: '0 0 3px' }}>💡 Cara pakai</p>
        <p style={{ fontSize: 12, color: '#B45309', lineHeight: 1.6, margin: 0 }}>
          Tempel link ini ke grup WhatsApp kelas. Siswa klik → isi nama, NIS, email, password → langsung bergabung!
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8, width: '100%' }}>
        <button onClick={onBack}
          style={{ flex: 1, padding: 10, borderRadius: 10, border: '1.5px solid #E2E8F0', background: '#fff', fontSize: 13, fontWeight: 600, color: '#374151', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans',sans-serif", transition: 'background .15s' }}
          onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
          onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
          Buat Link Lain
        </button>
        <button onClick={onHistory}
          style={{ flex: 1, padding: 10, borderRadius: 10, border: 'none', background: T.brand, fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans',sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          onMouseEnter={e => e.currentTarget.style.background = '#4338CA'}
          onMouseLeave={e => e.currentTarget.style.background = T.brand}>
          <Clock size={13} /> Riwayat Link
        </button>
      </div>
    </div>
  );
};

// ── InviteRow ─────────────────────────────────────────────────────
const InviteRow = ({ inv, onDeactivate }) => {
  const st = statusOf(inv);
  const url = buildInviteUrl(inv.token);
  const m = T[inv.target_role] || T.student;
  const Icon = inv.target_role === 'teacher' ? BookOpen : GraduationCap;
  const canUse = inv.is_active && !isExpired(inv) && !isQuotaFull(inv);
  const [busy, setBusy] = useState(false);

  const deact = async () => {
    if (!window.confirm('Nonaktifkan link ini?')) return;
    setBusy(true);
    try { await deactivateInvite(inv.id); onDeactivate(inv.id); }
    catch { alert('Gagal.'); }
    finally { setBusy(false); }
  };

  return (
    <div style={{ border: '1px solid #F1F5F9', borderRadius: 12, overflow: 'hidden', background: '#fff' }}>
      <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: m.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={14} color={m.color} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {inv.label || (inv.class_name ? `Link ${inv.class_name}` : 'Link Undangan')}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 3, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#94A3B8' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: st.dot, display: 'inline-block' }} />
              {st.label}
            </span>
            <span style={{ fontSize: 11, color: '#94A3B8' }}>
              {inv.use_count}{inv.max_uses > 0 ? `/${inv.max_uses}` : ''} pakai
            </span>
            <span style={{ fontSize: 11, color: '#94A3B8' }}>
              s/d {fmtDate(inv.expires_at)}
            </span>
          </div>
        </div>
        {canUse && (
          <button onClick={deact} disabled={busy}
            style={{ flexShrink: 0, padding: '5px 9px', borderRadius: 7, border: `1px solid ${T.dangBdr}`, background: T.dangBg, color: T.danger, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans',sans-serif", opacity: busy ? 0.6 : 1 }}>
            {busy ? '...' : 'Nonaktifkan'}
          </button>
        )}
      </div>
      {canUse && (
        <div style={{ padding: '8px 14px 12px', borderTop: '1px solid #F8FAFC', background: '#FAFAFA', display: 'flex', alignItems: 'center', gap: 8 }}>
          <ExternalLink size={11} style={{ color: '#CBD5E1', flexShrink: 0 }} />
          <span style={{ flex: 1, fontSize: 11, color: '#94A3B8', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{url}</span>
          <CopyBtn text={url} />
        </div>
      )}
    </div>
  );
};

// ── InviteManagerModal ────────────────────────────────────────────
const InviteManagerModal = ({ profile, classId, className, defaultRole, remainingSlots = 0, maxStudents = 0, onClose }) => {
  const [tab, setTab]         = useState('create');
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newLink, setNewLink] = useState(null);

  const loadInvites = useCallback(async () => {
    setLoading(true);
    try {
      const data = classId
        ? await getInvitesByClass(classId)
        : await getInvitesBySchool(profile.school_id);
      setInvites(data);
    } catch { } finally { setLoading(false); }
  }, [classId, profile.school_id]);

  useEffect(() => { if (tab === 'history') loadInvites(); }, [tab, loadInvites]);

  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const showTabs = tab === 'create' || tab === 'history';

  return (
    <>
      <style>{`
        @keyframes scaleIn { from{opacity:0;transform:scale(.96) translateY(10px);}to{opacity:1;transform:scale(1) translateY(0);} }
        @keyframes spin    { to{transform:rotate(360deg);} }
        @keyframes shimmer { 0%{background-position:-400px 0;}100%{background-position:400px 0;} }
      `}</style>

      {/* Backdrop */}
      <div onClick={e => e.target === e.currentTarget && onClose()}
        style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.55)', backdropFilter: 'blur(5px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>

        {/* Modal */}
        <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 480, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 32px 80px rgba(0,0,0,.3)', animation: 'scaleIn .22s cubic-bezier(.16,1,.3,1)', overflow: 'hidden' }}>

          {/* Header */}
          <div style={{ padding: '18px 22px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: T.brandBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Link2 size={16} color={T.brand} />
              </div>
              <div>
                <h2 style={{ fontFamily: 'Sora,sans-serif', fontSize: 15, fontWeight: 800, color: '#0F172A', margin: 0, lineHeight: 1.2 }}>Link Undangan</h2>
                {className && <p style={{ fontSize: 12, color: '#94A3B8', margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}><School size={11} />{className}</p>}
              </div>
            </div>
            <button onClick={onClose}
              style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #F1F5F9', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#94A3B8', transition: 'all .15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.color = '#374151'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.color = '#94A3B8'; }}>
              <X size={14} />
            </button>
          </div>

          {/* Tabs */}
          {showTabs && (
            <div style={{ display: 'flex', padding: '0 22px', borderBottom: '1px solid #F1F5F9', flexShrink: 0 }}>
              {[{ key: 'create', label: 'Buat Link' }, { key: 'history', label: 'Riwayat' }].map(t => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  style={{ padding: '12px 16px', fontSize: 13, fontWeight: tab === t.key ? 700 : 500, color: tab === t.key ? T.brand : '#94A3B8', background: 'none', border: 'none', borderBottom: `2px solid ${tab === t.key ? T.brand : 'transparent'}`, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans',sans-serif", transition: 'all .15s' }}>
                  {t.label}
                </button>
              ))}
            </div>
          )}

          {/* Body — scrollable */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 22, scrollbarWidth: 'thin', scrollbarColor: '#E2E8F0 transparent' }}>

            {tab === 'create' && (
              <CreateForm profile={profile} classId={classId} className={className} defaultRole={defaultRole}
                remainingSlots={remainingSlots} maxStudents={maxStudents}
                onCreated={info => { setNewLink(info); setTab('result'); }} />
            )}

            {tab === 'result' && newLink && (
              <ResultScreen newLink={newLink}
                onBack={() => { setNewLink(null); setTab('create'); }}
                onHistory={() => { loadInvites(); setTab('history'); }} />
            )}

            {tab === 'history' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <span style={{ fontSize: 12, color: '#94A3B8' }}>{invites.length} link</span>
                  <button onClick={loadInvites} disabled={loading}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 7, border: '1px solid #E2E8F0', background: '#F8FAFC', fontSize: 12, fontWeight: 600, color: '#374151', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                    <RefreshCw size={11} style={{ animation: loading ? 'spin .7s linear infinite' : 'none' }} /> Refresh
                  </button>
                </div>
                {loading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[1, 2, 3].map(i => <div key={i} style={{ height: 70, borderRadius: 12, background: 'linear-gradient(90deg,#F1F5F9 25%,#E2E8F0 50%,#F1F5F9 75%)', backgroundSize: '400px 100%', animation: 'shimmer 1.2s infinite' }} />)}
                  </div>
                ) : invites.length === 0 ? (
                  <div style={{ padding: '40px 20px', textAlign: 'center', border: '1px solid #F1F5F9', borderRadius: 12 }}>
                    <Link2 size={28} style={{ color: '#CBD5E1', display: 'block', margin: '0 auto 10px' }} />
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: '0 0 5px' }}>Belum ada link</p>
                    <p style={{ fontSize: 12, color: '#94A3B8', margin: 0 }}>Buat link undangan pertama</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {invites.map(inv => (
                      <InviteRow key={inv.id} inv={inv}
                        onDeactivate={id => setInvites(prev => prev.filter(i => i.id !== id))} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

// ── Public wrapper ────────────────────────────────────────────────
const InviteManager = ({ profile, classId = null, className = null, defaultRole = 'student', trigger }) => {
  const [open, setOpen] = useState(false);
  const defaultTrigger = (
    <button style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 8, border: `1.5px solid ${T.brandBdr}`, background: T.brandBg, color: T.brand, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans',sans-serif", transition: 'all .15s', whiteSpace: 'nowrap' }}>
      <Link2 size={13} /> Bagikan Link
    </button>
  );
  return (
    <>
      <div onClick={() => setOpen(true)} style={{ display: 'contents' }}>{trigger || defaultTrigger}</div>
      {open && <InviteManagerModal profile={profile} classId={classId} className={className} defaultRole={defaultRole} onClose={() => setOpen(false)} />}
    </>
  );
};

export default InviteManager;
export { InviteManagerModal };