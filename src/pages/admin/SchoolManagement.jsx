import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Plus, Search, RefreshCw, MoreVertical, Edit2, Trash2,
  CheckCircle2, XCircle, Clock, AlertCircle, X, Save,
  School, Users, GraduationCap, Calendar, ChevronDown,
  Eye, ShieldOff, ShieldCheck, Zap, Building2
} from 'lucide-react';

// ── Constants ─────────────────────────────────────────────────────
const TIERS = ['starter', 'professional', 'enterprise'];
const STATUSES = ['active', 'trial', 'suspended', 'expired'];

const TIER_META = {
  starter:      { label: 'Starter',      bg: '#F0FDF4', color: '#16A34A', border: '#BBF7D0' },
  professional: { label: 'Professional', bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE' },
  enterprise:   { label: 'Enterprise',   bg: '#FDF4FF', color: '#9333EA', border: '#E9D5FF' },
};
const STATUS_META = {
  active:    { label: 'Aktif',     bg: '#F0FDF4', color: '#16A34A', border: '#BBF7D0', icon: CheckCircle2 },
  trial:     { label: 'Trial',     bg: '#FFFBEB', color: '#D97706', border: '#FDE68A', icon: Clock },
  suspended: { label: 'Suspend',   bg: '#FEF2F2', color: '#DC2626', border: '#FECACA', icon: XCircle },
  expired:   { label: 'Expired',   bg: '#F8FAFC', color: '#94A3B8', border: '#E2E8F0', icon: AlertCircle },
};

const EMPTY_FORM = {
  name: '', address: '', phone: '', email: '',
  subscription_tier: 'starter', subscription_status: 'trial',
  subscription_start_date: '', subscription_end_date: '',
  max_students: 500, max_teachers: 20, max_admins: 3,
};

// ── Helpers ───────────────────────────────────────────────────────
const fmt = (n) => (n ?? 0).toLocaleString('id-ID');
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const daysDiff = (d) => d ? Math.ceil((new Date(d) - new Date()) / 86400000) : null;

// ── UI Atoms ──────────────────────────────────────────────────────
const Badge = ({ type, meta }) => {
  const m = meta[type] || { label: type, bg: '#F1F5F9', color: '#64748B', border: '#E2E8F0' };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: '600', background: m.bg, color: m.color, border: `1px solid ${m.border}`, whiteSpace: 'nowrap' }}>
      {m.icon && <m.icon size={10} />}{m.label}
    </span>
  );
};

const Input = ({ label, required, error, ...props }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
    {label && <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151' }}>{label}{required && <span style={{ color: '#EF4444', marginLeft: '2px' }}>*</span>}</label>}
    <input
      {...props}
      style={{
        padding: '9px 12px', borderRadius: '9px', fontSize: '13px', color: '#0F172A', fontFamily: "'DM Sans', sans-serif",
        border: `1.5px solid ${error ? '#FCA5A5' : '#E2E8F0'}`,
        background: error ? '#FFF5F5' : '#F8FAFC', outline: 'none', width: '100%', boxSizing: 'border-box',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        ...props.style,
      }}
      onFocus={e => { e.target.style.borderColor = '#4F46E5'; e.target.style.boxShadow = '0 0 0 3px rgba(79,70,229,0.1)'; e.target.style.background = '#fff'; }}
      onBlur={e => { e.target.style.borderColor = error ? '#FCA5A5' : '#E2E8F0'; e.target.style.boxShadow = 'none'; e.target.style.background = error ? '#FFF5F5' : '#F8FAFC'; }}
    />
    {error && <span style={{ fontSize: '11px', color: '#EF4444' }}>{error}</span>}
  </div>
);

const Select = ({ label, required, options, ...props }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
    {label && <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151' }}>{label}{required && <span style={{ color: '#EF4444', marginLeft: '2px' }}>*</span>}</label>}
    <div style={{ position: 'relative' }}>
      <select
        {...props}
        style={{ padding: '9px 36px 9px 12px', borderRadius: '9px', fontSize: '13px', color: '#0F172A', fontFamily: "'DM Sans', sans-serif", border: '1.5px solid #E2E8F0', background: '#F8FAFC', outline: 'none', width: '100%', appearance: 'none', cursor: 'pointer', ...props.style }}
        onFocus={e => { e.target.style.borderColor = '#4F46E5'; e.target.style.boxShadow = '0 0 0 3px rgba(79,70,229,0.1)'; }}
        onBlur={e => { e.target.style.borderColor = '#E2E8F0'; e.target.style.boxShadow = 'none'; }}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
    </div>
  </div>
);

const Btn = ({ children, variant = 'primary', icon: Icon, loading, ...props }) => {
  const styles = {
    primary:   { bg: '#4F46E5', color: '#fff', border: '#4F46E5', hoverBg: '#4338CA' },
    secondary: { bg: '#fff',    color: '#374151', border: '#E2E8F0', hoverBg: '#F8FAFC' },
    danger:    { bg: '#DC2626', color: '#fff', border: '#DC2626', hoverBg: '#B91C1C' },
    ghost:     { bg: 'transparent', color: '#64748B', border: 'transparent', hoverBg: '#F1F5F9' },
    success:   { bg: '#16A34A', color: '#fff', border: '#16A34A', hoverBg: '#15803D' },
    warning:   { bg: '#D97706', color: '#fff', border: '#D97706', hoverBg: '#B45309' },
  };
  const s = styles[variant];
  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 16px', borderRadius: '9px', fontSize: '13px', fontWeight: '600', cursor: loading || props.disabled ? 'not-allowed' : 'pointer', opacity: loading || props.disabled ? 0.6 : 1, background: s.bg, color: s.color, border: `1.5px solid ${s.border}`, fontFamily: "'DM Sans', sans-serif", transition: 'all 0.15s', whiteSpace: 'nowrap', ...props.style }}
      onMouseEnter={e => { if (!loading && !props.disabled) e.currentTarget.style.background = s.hoverBg; }}
      onMouseLeave={e => { e.currentTarget.style.background = s.bg; }}
    >
      {loading ? <div style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: s.color, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> : Icon && <Icon size={14} />}
      {children}
    </button>
  );
};

// ── Confirm Dialog ────────────────────────────────────────────────
const ConfirmDialog = ({ open, title, message, confirmLabel, variant = 'danger', onConfirm, onCancel, loading }) => {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: '#fff', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '400px', boxShadow: '0 25px 60px rgba(0,0,0,0.2)', animation: 'scaleIn 0.2s ease' }}>
        <h3 style={{ fontFamily: 'Sora, sans-serif', fontSize: '17px', fontWeight: '700', color: '#0F172A', marginBottom: '10px' }}>{title}</h3>
        <p style={{ fontSize: '14px', color: '#64748B', lineHeight: '1.6', marginBottom: '24px' }}>{message}</p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <Btn variant="secondary" onClick={onCancel} disabled={loading}>Batal</Btn>
          <Btn variant={variant} onClick={onConfirm} loading={loading}>{confirmLabel}</Btn>
        </div>
      </div>
    </div>
  );
};

// ── School Modal (Add / Edit) ─────────────────────────────────────
const SchoolModal = ({ open, school, onClose, onSaved }) => {
  const isEdit = !!school?.id;
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (open) {
      setForm(school ? {
        name: school.name || '',
        address: school.address || '',
        phone: school.phone || '',
        email: school.email || '',
        subscription_tier: school.subscription_tier || 'starter',
        subscription_status: school.subscription_status || 'trial',
        subscription_start_date: school.subscription_start_date ? school.subscription_start_date.substring(0, 10) : '',
        subscription_end_date: school.subscription_end_date ? school.subscription_end_date.substring(0, 10) : '',
        max_students: school.max_students ?? 500,
        max_teachers: school.max_teachers ?? 20,
        max_admins: school.max_admins ?? 3,
      } : EMPTY_FORM);
      setErrors({});
      setSaveError('');
    }
  }, [open, school]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.name.trim())  e.name  = 'Nama sekolah wajib diisi';
    if (!form.email.trim()) e.email = 'Email wajib diisi';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Format email tidak valid';
    if (form.max_students < 1)  e.max_students = 'Minimal 1';
    if (form.max_teachers < 1)  e.max_teachers = 'Minimal 1';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    setSaveError('');
    try {
      const payload = {
        name: form.name.trim(),
        address: form.address.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim().toLowerCase(),
        subscription_tier: form.subscription_tier,
        subscription_status: form.subscription_status,
        subscription_start_date: form.subscription_start_date || null,
        subscription_end_date: form.subscription_end_date || null,
        max_students: Number(form.max_students),
        max_teachers: Number(form.max_teachers),
        max_admins: Number(form.max_admins),
        updated_at: new Date().toISOString(),
      };

      let error;
      if (isEdit) {
        ({ error } = await supabase.from('schools').update(payload).eq('id', school.id));
      } else {
        ({ error } = await supabase.from('schools').insert([{ ...payload, created_at: new Date().toISOString() }]));
      }
      if (error) throw error;
      onSaved();
      onClose();
    } catch (err) {
      setSaveError(err.message?.includes('duplicate') ? 'Email sudah terdaftar untuk sekolah lain.' : err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(6px)', zIndex: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '620px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 30px 80px rgba(0,0,0,0.25)', animation: 'scaleIn 0.2s ease' }}>

        {/* Header */}
        <div style={{ padding: '22px 28px 18px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building2 size={18} style={{ color: '#4F46E5' }} />
            </div>
            <div>
              <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: '16px', fontWeight: '700', color: '#0F172A', margin: 0 }}>
                {isEdit ? 'Edit Sekolah' : 'Tambah Sekolah Baru'}
              </h2>
              <p style={{ fontSize: '12px', color: '#94A3B8', margin: 0 }}>{isEdit ? `ID: ${school.id.substring(0, 8)}...` : 'Isi data sekolah dengan lengkap'}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #F1F5F9', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#94A3B8' }}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px 28px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Informasi Sekolah */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '14px' }}>Informasi Sekolah</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
              <Input label="Nama Sekolah" required placeholder="Contoh: SMA Negeri 1 Jakarta" value={form.name} onChange={e => set('name', e.target.value)} error={errors.name} />
              <Input label="Alamat" placeholder="Jl. Contoh No. 1, Kota" value={form.address} onChange={e => set('address', e.target.value)} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Input label="Nomor Telepon" placeholder="08xxxxxxxxxx" value={form.phone} onChange={e => set('phone', e.target.value)} />
                <Input label="Email" required type="email" placeholder="admin@sekolah.sch.id" value={form.email} onChange={e => set('email', e.target.value)} error={errors.email} />
              </div>
            </div>
          </div>

          {/* Langganan */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '14px' }}>Langganan</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Select label="Paket" value={form.subscription_tier} onChange={e => set('subscription_tier', e.target.value)}
                options={TIERS.map(t => ({ value: t, label: TIER_META[t].label }))} />
              <Select label="Status" value={form.subscription_status} onChange={e => set('subscription_status', e.target.value)}
                options={STATUSES.map(s => ({ value: s, label: STATUS_META[s].label }))} />
              <Input label="Tanggal Mulai" type="date" value={form.subscription_start_date} onChange={e => set('subscription_start_date', e.target.value)} />
              <Input label="Tanggal Berakhir" type="date" value={form.subscription_end_date} onChange={e => set('subscription_end_date', e.target.value)} />
            </div>
          </div>

          {/* Kapasitas */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '14px' }}>Kapasitas</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <Input label="Maks. Siswa" type="number" min="1" value={form.max_students} onChange={e => set('max_students', e.target.value)} error={errors.max_students} />
              <Input label="Maks. Guru" type="number" min="1" value={form.max_teachers} onChange={e => set('max_teachers', e.target.value)} error={errors.max_teachers} />
              <Input label="Maks. Admin" type="number" min="1" value={form.max_admins} onChange={e => set('max_admins', e.target.value)} />
            </div>
          </div>

          {saveError && (
            <div style={{ padding: '12px 16px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', color: '#DC2626', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={15} />{saveError}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 28px', borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'flex-end', gap: '10px', flexShrink: 0 }}>
          <Btn variant="secondary" onClick={onClose} disabled={saving}>Batal</Btn>
          <Btn icon={Save} loading={saving} onClick={handleSave}>{isEdit ? 'Simpan Perubahan' : 'Tambah Sekolah'}</Btn>
        </div>
      </div>
    </div>
  );
};

// ── Detail Drawer ─────────────────────────────────────────────────
const DetailDrawer = ({ school, counts, onClose, onEdit, onToggleStatus }) => {
  if (!school) return null;
  const days = daysDiff(school.subscription_end_date);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)', zIndex: 80, display: 'flex', justifyContent: 'flex-end' }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ width: '100%', maxWidth: '400px', height: '100%', background: '#fff', boxShadow: '-20px 0 60px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', animation: 'slideInRight 0.25s cubic-bezier(0.16,1,0.3,1)' }}>

        {/* Header */}
        <div style={{ padding: '24px', borderBottom: '1px solid #F1F5F9', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Sora, sans-serif', fontWeight: '700', fontSize: '20px', color: '#4F46E5' }}>
                {school.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 style={{ fontFamily: 'Sora, sans-serif', fontSize: '16px', fontWeight: '700', color: '#0F172A', margin: '0 0 4px' }}>{school.name}</h3>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <Badge type={school.subscription_tier} meta={TIER_META} />
                  <Badge type={school.subscription_status} meta={STATUS_META} />
                </div>
              </div>
            </div>
            <button onClick={onClose} style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #F1F5F9', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#94A3B8', flexShrink: 0 }}>
              <X size={16} />
            </button>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Btn variant="secondary" icon={Edit2} onClick={() => onEdit(school)} style={{ flex: 1 }}>Edit</Btn>
            {school.subscription_status === 'suspended'
              ? <Btn variant="success" icon={ShieldCheck} onClick={() => onToggleStatus(school, 'active')} style={{ flex: 1 }}>Aktifkan</Btn>
              : <Btn variant="warning" icon={ShieldOff} onClick={() => onToggleStatus(school, 'suspended')} style={{ flex: 1 }}>Suspend</Btn>
            }
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {[
              { icon: GraduationCap, label: 'Siswa', value: counts?.student || 0, max: school.max_students, color: '#0891B2', bg: '#EFF6FF' },
              { icon: Users, label: 'Guru', value: counts?.teacher || 0, max: school.max_teachers, color: '#4F46E5', bg: '#EEF2FF' },
            ].map(s => (
              <div key={s.label} style={{ background: s.bg, borderRadius: '12px', padding: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <s.icon size={14} style={{ color: s.color }} />
                  <span style={{ fontSize: '12px', fontWeight: '600', color: s.color }}>{s.label}</span>
                </div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#0F172A', fontFamily: 'Sora, sans-serif', lineHeight: 1 }}>{fmt(s.value)}</div>
                <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>dari {fmt(s.max)}</div>
                <div style={{ height: '4px', borderRadius: '99px', background: 'rgba(0,0,0,0.08)', marginTop: '8px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: '99px', background: s.color, width: `${Math.min(100, (s.value / s.max) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>

          {/* Info */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>Informasi</div>
            {[
              { label: 'Email', value: school.email },
              { label: 'Telepon', value: school.phone || '—' },
              { label: 'Alamat', value: school.address || '—' },
              { label: 'ID Sekolah', value: school.id.substring(0, 16) + '...' },
              { label: 'Terdaftar', value: fmtDate(school.created_at) },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '9px 0', borderBottom: '1px solid #F8FAFC', gap: '12px' }}>
                <span style={{ fontSize: '12px', color: '#94A3B8', flexShrink: 0 }}>{row.label}</span>
                <span style={{ fontSize: '13px', color: '#0F172A', fontWeight: '500', textAlign: 'right', wordBreak: 'break-all' }}>{row.value}</span>
              </div>
            ))}
          </div>

          {/* Subscription */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>Langganan</div>
            <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { label: 'Paket', value: TIER_META[school.subscription_tier]?.label || school.subscription_tier },
                { label: 'Mulai', value: fmtDate(school.subscription_start_date) },
                { label: 'Berakhir', value: fmtDate(school.subscription_end_date) },
                { label: 'Sisa', value: days === null ? '—' : days < 0 ? `Expired ${Math.abs(days)} hari lalu` : `${days} hari lagi` },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', color: '#94A3B8' }}>{row.label}</span>
                  <span style={{ fontSize: '13px', color: days !== null && row.label === 'Sisa' && days < 14 ? '#DC2626' : '#0F172A', fontWeight: '500' }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Dropdown Menu ─────────────────────────────────────────────────
const ActionMenu = ({ school, onView, onEdit, onToggleStatus, onDelete }) => {
  const [open, setOpen] = useState(false);
  const isSuspended = school.subscription_status === 'suspended';

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        style={{ width: '30px', height: '30px', borderRadius: '7px', border: '1px solid #F1F5F9', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#94A3B8' }}
        onMouseEnter={e => e.currentTarget.style.background = '#EEF2FF'}
        onMouseLeave={e => e.currentTarget.style.background = '#F8FAFC'}
      >
        <MoreVertical size={14} />
      </button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 50 }} onClick={() => setOpen(false)} />
          <div style={{ position: 'absolute', right: 0, top: '36px', background: '#fff', borderRadius: '12px', border: '1px solid #F1F5F9', boxShadow: '0 8px 30px rgba(0,0,0,0.12)', zIndex: 51, minWidth: '160px', overflow: 'hidden', padding: '4px' }}>
            {[
              { icon: Eye, label: 'Lihat Detail', action: () => { onView(school); setOpen(false); }, color: '#374151' },
              { icon: Edit2, label: 'Edit', action: () => { onEdit(school); setOpen(false); }, color: '#374151' },
              { icon: isSuspended ? ShieldCheck : ShieldOff, label: isSuspended ? 'Aktifkan' : 'Suspend', action: () => { onToggleStatus(school, isSuspended ? 'active' : 'suspended'); setOpen(false); }, color: isSuspended ? '#16A34A' : '#D97706' },
              { icon: Trash2, label: 'Hapus', action: () => { onDelete(school); setOpen(false); }, color: '#DC2626' },
            ].map(item => (
              <button key={item.label} onClick={item.action}
                style={{ display: 'flex', alignItems: 'center', gap: '9px', width: '100%', padding: '9px 12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: item.color, borderRadius: '8px', fontFamily: "'DM Sans', sans-serif", fontWeight: '500', textAlign: 'left' }}
                onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <item.icon size={14} />{item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────
const SchoolManagement = () => {
  const [schools, setSchools] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterTier, setFilterTier] = useState('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [editSchool, setEditSchool] = useState(null);
  const [detailSchool, setDetailSchool] = useState(null);

  const [confirmDialog, setConfirmDialog] = useState({ open: false });
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = useCallback(async () => {
    try {
      const [{ data: schoolData, error: sErr }, { data: profileData, error: pErr }] = await Promise.all([
        supabase.from('schools').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('school_id, role'),
      ]);
      if (sErr) throw sErr;
      if (pErr) throw pErr;

      const countMap = {};
      (profileData || []).forEach(p => {
        if (!p.school_id) return;
        if (!countMap[p.school_id]) countMap[p.school_id] = { student: 0, teacher: 0, school_admin: 0 };
        countMap[p.school_id][p.role] = (countMap[p.school_id][p.role] || 0) + 1;
      });

      setSchools(schoolData || []);
      setCounts(countMap);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRefresh = () => { setRefreshing(true); fetchData(); };

  const handleToggleStatus = async (school, newStatus) => {
    setActionLoading(true);
    try {
      const { error } = await supabase.from('schools').update({ subscription_status: newStatus, updated_at: new Date().toISOString() }).eq('id', school.id);
      if (error) throw error;
      showToast(`${school.name} berhasil ${newStatus === 'active' ? 'diaktifkan' : 'di-suspend'}`);
      await fetchData();
      if (detailSchool?.id === school.id) setDetailSchool(prev => ({ ...prev, subscription_status: newStatus }));
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setActionLoading(false);
      setConfirmDialog({ open: false });
    }
  };

  const handleDelete = (school) => {
    setConfirmDialog({
      open: true,
      title: 'Hapus Sekolah',
      message: `Apakah kamu yakin ingin menghapus "${school.name}"? Tindakan ini tidak bisa dibatalkan dan akan menghapus semua data terkait.`,
      confirmLabel: 'Ya, Hapus',
      variant: 'danger',
      onConfirm: async () => {
        setActionLoading(true);
        try {
          const { error } = await supabase.from('schools').delete().eq('id', school.id);
          if (error) throw error;
          showToast(`${school.name} berhasil dihapus`);
          setConfirmDialog({ open: false });
          if (detailSchool?.id === school.id) setDetailSchool(null);
          await fetchData();
        } catch (err) {
          showToast(err.message, 'error');
          setActionLoading(false);
          setConfirmDialog({ open: false });
        }
      },
      onCancel: () => setConfirmDialog({ open: false }),
    });
  };

  const handleToggleConfirm = (school, newStatus) => {
    const isActivate = newStatus === 'active';
    setConfirmDialog({
      open: true,
      title: isActivate ? 'Aktifkan Sekolah' : 'Suspend Sekolah',
      message: isActivate
        ? `Aktifkan kembali akses untuk "${school.name}"? Semua pengguna di sekolah ini akan bisa login kembali.`
        : `Suspend akses untuk "${school.name}"? Semua guru dan siswa di sekolah ini tidak akan bisa login hingga diaktifkan kembali.`,
      confirmLabel: isActivate ? 'Ya, Aktifkan' : 'Ya, Suspend',
      variant: isActivate ? 'success' : 'warning',
      onConfirm: () => handleToggleStatus(school, newStatus),
      onCancel: () => setConfirmDialog({ open: false }),
    });
  };

  const filtered = schools.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !q || s.name.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q);
    const matchStatus = filterStatus === 'all' || s.subscription_status === filterStatus;
    const matchTier   = filterTier === 'all' || s.subscription_tier === filterTier;
    return matchSearch && matchStatus && matchTier;
  });

  const stats = {
    total:     schools.length,
    active:    schools.filter(s => s.subscription_status === 'active').length,
    trial:     schools.filter(s => s.subscription_status === 'trial').length,
    suspended: schools.filter(s => ['suspended', 'expired'].includes(s.subscription_status)).length,
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&family=DM+Sans:wght@400;500;600&display=swap');
        @keyframes fadeUp       { from{opacity:0;transform:translateY(12px);} to{opacity:1;transform:translateY(0);} }
        @keyframes scaleIn      { from{opacity:0;transform:scale(0.95);} to{opacity:1;transform:scale(1);} }
        @keyframes slideInRight { from{transform:translateX(100%);} to{transform:translateX(0);} }
        @keyframes slideDown    { from{opacity:0;transform:translateY(-8px);} to{opacity:1;transform:translateY(0);} }
        @keyframes spin         { to{transform:rotate(360deg);} }
        .sm-row:hover { background: #FAFBFF !important; cursor: pointer; }
        .sm-fadeup { opacity:0; animation: fadeUp 0.4s ease forwards; }
      `}</style>

      <div style={{ fontFamily: "'DM Sans', sans-serif", display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* ── Header ── */}
        <div className="sm-fadeup" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <School size={16} style={{ color: '#4F46E5' }} />
              </div>
              <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: '22px', fontWeight: '700', color: '#0F172A', margin: 0 }}>Manajemen Sekolah</h1>
            </div>
            <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>Kelola semua sekolah yang terdaftar di platform ZiDu</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <Btn variant="secondary" icon={RefreshCw} loading={refreshing} onClick={handleRefresh}>Refresh</Btn>
            <Btn icon={Plus} onClick={() => { setEditSchool(null); setModalOpen(true); }}>Tambah Sekolah</Btn>
          </div>
        </div>

        {/* ── Stat Pills ── */}
        <div className="sm-fadeup" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', animationDelay: '60ms' }}>
          {[
            { key: 'all',      label: 'Semua',    count: stats.total,     color: '#4F46E5', bg: '#EEF2FF' },
            { key: 'active',   label: '✓ Aktif',  count: stats.active,    color: '#16A34A', bg: '#F0FDF4' },
            { key: 'trial',    label: '◷ Trial',  count: stats.trial,     color: '#D97706', bg: '#FFFBEB' },
            { key: 'suspended',label: '⚠ Masalah',count: stats.suspended, color: '#DC2626', bg: '#FEF2F2' },
          ].map(f => (
            <button key={f.key} onClick={() => setFilterStatus(f.key)}
              style={{ padding: '8px 16px', borderRadius: '999px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', border: filterStatus === f.key ? `2px solid ${f.color}` : '2px solid transparent', background: filterStatus === f.key ? f.bg : '#F8FAFC', color: filterStatus === f.key ? f.color : '#64748B', transition: 'all 0.15s' }}>
              {f.label} <span style={{ opacity: 0.7 }}>({f.count})</span>
            </button>
          ))}
        </div>

        {/* ── Table Card ── */}
        <div className="sm-fadeup" style={{ background: '#fff', borderRadius: '16px', border: '1px solid #F1F5F9', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden', animationDelay: '120ms' }}>

          {/* Toolbar */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #F8FAFC', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {/* Search */}
            <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
              <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
              <input
                type="text" placeholder="Cari nama atau email sekolah..." value={search} onChange={e => setSearch(e.target.value)}
                style={{ width: '100%', padding: '9px 12px 9px 34px', borderRadius: '9px', border: '1.5px solid #E2E8F0', background: '#F8FAFC', fontSize: '13px', color: '#0F172A', outline: 'none', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box', transition: 'border-color 0.15s, box-shadow 0.15s' }}
                onFocus={e => { e.target.style.borderColor = '#4F46E5'; e.target.style.boxShadow = '0 0 0 3px rgba(79,70,229,0.1)'; }}
                onBlur={e => { e.target.style.borderColor = '#E2E8F0'; e.target.style.boxShadow = 'none'; }}
              />
            </div>
            {/* Tier filter */}
            <select value={filterTier} onChange={e => setFilterTier(e.target.value)}
              style={{ padding: '9px 32px 9px 12px', borderRadius: '9px', border: '1.5px solid #E2E8F0', background: '#F8FAFC', fontSize: '13px', color: '#64748B', outline: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", appearance: 'none' }}>
              <option value="all">Semua Paket</option>
              {TIERS.map(t => <option key={t} value={t}>{TIER_META[t].label}</option>)}
            </select>
            <span style={{ fontSize: '12px', color: '#94A3B8', marginLeft: 'auto' }}>
              {filtered.length} dari {schools.length} sekolah
            </span>
          </div>

          {/* Error */}
          {error && (
            <div style={{ margin: '16px 20px', padding: '12px 16px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', color: '#DC2626', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={14} />{error}
            </div>
          )}

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '750px' }}>
              <thead>
                <tr style={{ background: '#FAFBFF', borderBottom: '1px solid #F1F5F9' }}>
                  {['Nama Sekolah', 'Paket', 'Status', 'Guru', 'Siswa', 'Kadaluarsa', ''].map(h => (
                    <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={7} style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#F1F5F9' }} />
                          {[140, 80, 80, 40, 40, 60].map((w, j) => (
                            <div key={j} style={{ height: '13px', borderRadius: '6px', background: 'linear-gradient(90deg,#F1F5F9 25%,#E2E8F0 50%,#F1F5F9 75%)', backgroundSize: '800px 100%', animation: 'shimmer 1.2s infinite', width: `${w}px` }} />
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '56px 20px', textAlign: 'center' }}>
                      <div style={{ fontSize: '32px', marginBottom: '10px' }}>🏫</div>
                      <div style={{ fontSize: '14px', color: '#94A3B8' }}>Tidak ada sekolah ditemukan</div>
                    </td>
                  </tr>
                ) : (
                  filtered.map(s => {
                    const c = counts[s.id] || {};
                    const days = daysDiff(s.subscription_end_date);
                    const expiring = days !== null && days >= 0 && days <= 14;
                    return (
                      <tr key={s.id} className="sm-row" style={{ borderBottom: '1px solid #F8FAFC', transition: 'background 0.1s' }}
                        onClick={() => setDetailSchool(s)}>
                        <td style={{ padding: '13px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Sora, sans-serif', fontWeight: '700', fontSize: '14px', color: '#4F46E5', flexShrink: 0 }}>
                              {s.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: '600', color: '#0F172A' }}>{s.name}</div>
                              <div style={{ fontSize: '11px', color: '#94A3B8' }}>{s.email}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '13px 16px' }}><Badge type={s.subscription_tier} meta={TIER_META} /></td>
                        <td style={{ padding: '13px 16px' }}><Badge type={s.subscription_status} meta={STATUS_META} /></td>
                        <td style={{ padding: '13px 16px' }}>
                          <span style={{ fontSize: '13px', fontWeight: '600', color: '#0F172A' }}>{c.teacher || 0}</span>
                          <span style={{ fontSize: '11px', color: '#94A3B8' }}>/{s.max_teachers}</span>
                        </td>
                        <td style={{ padding: '13px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                            <span style={{ fontSize: '13px', fontWeight: '600', color: '#0F172A' }}>{c.student || 0}</span>
                            <span style={{ fontSize: '11px', color: '#94A3B8' }}>/{s.max_students}</span>
                            <div style={{ width: '36px', height: '4px', borderRadius: '99px', background: '#F1F5F9', overflow: 'hidden' }}>
                              <div style={{ height: '100%', borderRadius: '99px', background: (c.student || 0) / s.max_students > 0.8 ? '#EF4444' : '#4F46E5', width: `${Math.min(100, ((c.student || 0) / s.max_students) * 100)}%` }} />
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '13px 16px' }}>
                          {days === null ? <span style={{ color: '#CBD5E1', fontSize: '12px' }}>—</span>
                            : <span style={{ fontSize: '12px', fontWeight: '500', color: days < 0 ? '#DC2626' : expiring ? '#D97706' : '#64748B' }}>
                              {days < 0 ? `${Math.abs(days)}h lalu` : expiring ? `⚠ ${days}h lagi` : `${days}h`}
                            </span>}
                        </td>
                        <td style={{ padding: '13px 16px' }} onClick={e => e.stopPropagation()}>
                          <ActionMenu
                            school={s}
                            onView={setDetailSchool}
                            onEdit={s => { setEditSchool(s); setModalOpen(true); }}
                            onToggleStatus={handleToggleConfirm}
                            onDelete={handleDelete}
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          {!loading && filtered.length > 0 && (
            <div style={{ padding: '11px 20px', borderTop: '1px solid #F8FAFC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: '#94A3B8' }}>Menampilkan {filtered.length} dari {schools.length} sekolah</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#CBD5E1' }}>
                <Zap size={10} style={{ color: '#4F46E5' }} /> Real-time dari Supabase
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Modals & Overlays ── */}
      <SchoolModal
        open={modalOpen}
        school={editSchool}
        onClose={() => { setModalOpen(false); setEditSchool(null); }}
        onSaved={() => { fetchData(); showToast(editSchool ? 'Data sekolah berhasil diperbarui' : 'Sekolah baru berhasil ditambahkan'); }}
      />

      <DetailDrawer
        school={detailSchool}
        counts={detailSchool ? counts[detailSchool.id] : null}
        onClose={() => setDetailSchool(null)}
        onEdit={s => { setDetailSchool(null); setEditSchool(s); setModalOpen(true); }}
        onToggleStatus={handleToggleConfirm}
      />

      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        variant={confirmDialog.variant}
        onConfirm={confirmDialog.onConfirm}
        onCancel={confirmDialog.onCancel}
        loading={actionLoading}
      />

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 200, animation: 'slideDown 0.25s ease', display: 'flex', alignItems: 'center', gap: '10px', padding: '13px 18px', borderRadius: '12px', background: toast.type === 'error' ? '#DC2626' : '#0F172A', color: '#fff', fontSize: '13px', fontWeight: '500', boxShadow: '0 8px 30px rgba(0,0,0,0.2)', fontFamily: "'DM Sans', sans-serif" }}>
          {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} style={{ color: '#4ADE80' }} />}
          {toast.msg}
        </div>
      )}
    </>
  );
};

export default SchoolManagement;