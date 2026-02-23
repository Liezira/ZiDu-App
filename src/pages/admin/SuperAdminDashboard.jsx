import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import {
  School, Users, CheckCircle2, Clock, XCircle, AlertCircle,
  RefreshCw, Crown, Zap, Search, ChevronDown, Edit2, X,
  Save, ArrowLeft, Calendar, Plus, Shield,
} from 'lucide-react';

const TIERS = ['starter', 'professional', 'enterprise'];
const STATUSES = ['active', 'trial', 'suspended', 'expired'];
const TIER_META = {
  starter:      { label: 'Starter',      bg: '#F0FDF4', color: '#16A34A', border: '#BBF7D0' },
  professional: { label: 'Professional', bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE' },
  enterprise:   { label: 'Enterprise',   bg: '#FDF4FF', color: '#9333EA', border: '#E9D5FF' },
};
const STATUS_META = {
  active:    { label: 'Aktif',   bg: '#F0FDF4', color: '#16A34A', border: '#BBF7D0', icon: CheckCircle2 },
  trial:     { label: 'Trial',   bg: '#FFFBEB', color: '#D97706', border: '#FDE68A', icon: Clock },
  suspended: { label: 'Suspend', bg: '#FEF2F2', color: '#DC2626', border: '#FECACA', icon: XCircle },
  expired:   { label: 'Expired', bg: '#F8FAFC', color: '#94A3B8', border: '#E2E8F0', icon: AlertCircle },
};
const fmt = (n) => (n ?? 0).toLocaleString('id-ID');
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const TierBadge = ({ tier }) => {
  const m = TIER_META[tier] || { label: tier, bg: '#F8FAFC', color: '#64748B', border: '#E2E8F0' };
  return <span style={{ padding: '2px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: '700', background: m.bg, color: m.color, border: `1px solid ${m.border}`, whiteSpace: 'nowrap' }}>{m.label}</span>;
};

const StatusBadge = ({ status }) => {
  const m = STATUS_META[status] || { label: status, bg: '#F8FAFC', color: '#64748B', border: '#E2E8F0', icon: AlertCircle };
  const Icon = m.icon;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: '700', background: m.bg, color: m.color, border: `1px solid ${m.border}`, whiteSpace: 'nowrap' }}>
      <Icon size={10} />{m.label}
    </span>
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

const FieldInput = ({ label, required, error, ...props }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
    {label && <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151' }}>{label}{required && <span style={{ color: '#EF4444', marginLeft: '2px' }}>*</span>}</label>}
    <input {...props} style={{ padding: '9px 12px', borderRadius: '9px', fontSize: '13px', color: '#0F172A', fontFamily: "'DM Sans', sans-serif", border: `1.5px solid ${error ? '#FCA5A5' : '#E2E8F0'}`, background: '#F8FAFC', outline: 'none', width: '100%', boxSizing: 'border-box', transition: 'border-color .15s', ...props.style }}
      onFocus={e => { e.target.style.borderColor = '#4F46E5'; e.target.style.boxShadow = '0 0 0 3px rgba(79,70,229,.1)'; e.target.style.background = '#fff'; }}
      onBlur={e => { e.target.style.borderColor = error ? '#FCA5A5' : '#E2E8F0'; e.target.style.boxShadow = 'none'; e.target.style.background = '#F8FAFC'; }} />
    {error && <span style={{ fontSize: '11px', color: '#EF4444' }}>{error}</span>}
  </div>
);

const FieldSelect = ({ label, required, options, ...props }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
    {label && <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151' }}>{label}{required && <span style={{ color: '#EF4444', marginLeft: '2px' }}>*</span>}</label>}
    <div style={{ position: 'relative' }}>
      <select {...props} style={{ padding: '9px 32px 9px 12px', borderRadius: '9px', fontSize: '13px', color: '#0F172A', fontFamily: "'DM Sans', sans-serif", border: '1.5px solid #E2E8F0', background: '#F8FAFC', outline: 'none', width: '100%', appearance: 'none', cursor: 'pointer', ...props.style }}
        onFocus={e => { e.target.style.borderColor = '#4F46E5'; e.target.style.boxShadow = '0 0 0 3px rgba(79,70,229,.1)'; }}
        onBlur={e => { e.target.style.borderColor = '#E2E8F0'; e.target.style.boxShadow = 'none'; }}>
        {options.map(o => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
      </select>
      <ChevronDown size={13} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
    </div>
  </div>
);

const SchoolModal = ({ open, school, onClose, onSaved }) => {
  const isEdit = !!school?.id;
  const EMPTY = { name: '', email: '', phone: '', address: '', school_type: 'SMA', subscription_tier: 'starter', subscription_status: 'trial', max_students: 200, max_teachers: 20, subscription_end_date: '' };
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState('');

  useEffect(() => {
    if (open) {
      setForm(school ? {
        name: school.name || '', email: school.email || '', phone: school.phone || '',
        address: school.address || '', school_type: school.school_type || 'SMA',
        subscription_tier: school.subscription_tier || 'starter',
        subscription_status: school.subscription_status || 'trial',
        max_students: school.max_students || 200, max_teachers: school.max_teachers || 20,
        subscription_end_date: school.subscription_end_date ? school.subscription_end_date.split('T')[0] : '',
      } : EMPTY);
      setErrors({}); setSaveErr('');
    }
  }, [open, school]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Nama sekolah wajib diisi';
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true); setSaveErr('');
    try {
      const payload = { name: form.name.trim(), email: form.email.trim() || null, phone: form.phone.trim() || null, address: form.address.trim() || null, school_type: form.school_type, subscription_tier: form.subscription_tier, subscription_status: form.subscription_status, max_students: parseInt(form.max_students) || 200, max_teachers: parseInt(form.max_teachers) || 20, subscription_end_date: form.subscription_end_date || null, updated_at: new Date().toISOString() };
      const { error } = isEdit
        ? await supabase.from('schools').update(payload).eq('id', school.id)
        : await supabase.from('schools').insert([{ ...payload, created_at: new Date().toISOString() }]);
      if (error) throw error;
      onSaved(); onClose();
    } catch (err) { setSaveErr(err.message); }
    finally { setSaving(false); }
  };

  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.65)', backdropFilter: 'blur(6px)', zIndex: 190, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '560px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 30px 80px rgba(0,0,0,.25)', animation: 'scaleIn .2s ease' }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <School size={16} style={{ color: '#4F46E5' }} />
            </div>
            <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: '16px', fontWeight: '700', color: '#0F172A', margin: 0 }}>{isEdit ? 'Edit Sekolah' : 'Tambah Sekolah Baru'}</h2>
          </div>
          <button onClick={onClose} style={{ width: '30px', height: '30px', borderRadius: '8px', border: '1px solid #F1F5F9', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#94A3B8' }}><X size={14} /></button>
        </div>
        <div style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <FieldInput label="Nama Sekolah" required placeholder="Contoh: SMA Negeri 1 Jakarta" value={form.name} onChange={e => set('name', e.target.value)} error={errors.name} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <FieldInput label="Email" type="email" placeholder="admin@sekolah.sch.id" value={form.email} onChange={e => set('email', e.target.value)} />
            <FieldInput label="Telepon" placeholder="021-xxx" value={form.phone} onChange={e => set('phone', e.target.value)} />
          </div>
          <FieldInput label="Alamat" placeholder="Jl. ..." value={form.address} onChange={e => set('address', e.target.value)} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <FieldSelect label="Jenis Sekolah" value={form.school_type} onChange={e => set('school_type', e.target.value)} options={['SMA','SMK','SMP','MA','MTS'].map(t => ({ value: t, label: t }))} />
            <FieldSelect label="Paket Langganan" value={form.subscription_tier} onChange={e => set('subscription_tier', e.target.value)} options={TIERS.map(t => ({ value: t, label: TIER_META[t].label }))} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <FieldSelect label="Status Langganan" value={form.subscription_status} onChange={e => set('subscription_status', e.target.value)} options={STATUSES.map(s => ({ value: s, label: STATUS_META[s].label }))} />
            <FieldInput label="Tanggal Kadaluarsa" type="date" value={form.subscription_end_date} onChange={e => set('subscription_end_date', e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <FieldInput label="Maks. Siswa" type="number" min="1" value={form.max_students} onChange={e => set('max_students', e.target.value)} />
            <FieldInput label="Maks. Guru" type="number" min="1" value={form.max_teachers} onChange={e => set('max_teachers', e.target.value)} />
          </div>
          {saveErr && <div style={{ padding: '11px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '9px', color: '#DC2626', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}><AlertCircle size={14} />{saveErr}</div>}
        </div>
        <div style={{ padding: '14px 24px', borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'flex-end', gap: '10px', flexShrink: 0 }}>
          <button onClick={onClose} disabled={saving} style={{ padding: '9px 16px', borderRadius: '9px', border: '1.5px solid #E2E8F0', background: '#fff', fontSize: '13px', fontWeight: '600', color: '#374151', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Batal</button>
          <button onClick={handleSave} disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 16px', borderRadius: '9px', border: 'none', background: '#4F46E5', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, fontFamily: "'DM Sans', sans-serif" }}>
            {saving ? <div style={{ width: '13px', height: '13px', border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .7s linear infinite' }} /> : <Save size={14} />}
            {isEdit ? 'Simpan' : 'Tambah Sekolah'}
          </button>
        </div>
      </div>
    </div>
  );
};

const SchoolDrawer = ({ school, onClose, onEdit }) => {
  const [profiles, setProfiles] = useState([]);
  const [pLoading, setPLoading] = useState(true);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    if (!school) return;
    setPLoading(true);
    supabase.from('profiles').select('id, name, email, role, nis, created_at')
      .eq('school_id', school.id).order('role')
      .then(({ data }) => { setProfiles(data || []); setPLoading(false); });
  }, [school?.id]);

  if (!school) return null;
  const teachers = profiles.filter(p => p.role === 'teacher');
  const students = profiles.filter(p => p.role === 'student');
  const admins   = profiles.filter(p => p.role === 'school_admin');
  const days = school.subscription_end_date ? Math.ceil((new Date(school.subscription_end_date) - new Date()) / (1000 * 60 * 60 * 24)) : null;
  const ROLE_META = {
    school_admin: { label: 'Admin', bg: '#EEF2FF', color: '#4F46E5' },
    teacher:      { label: 'Guru',  bg: '#EFF6FF', color: '#0891B2' },
    student:      { label: 'Siswa', bg: '#F0FDF4', color: '#16A34A' },
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 180, display: 'flex' }}>
      <div style={{ flex: 1, background: 'rgba(15,23,42,.4)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div style={{ width: '100%', maxWidth: '480px', background: '#fff', height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '-20px 0 60px rgba(0,0,0,.15)', animation: 'slideLeft .3s ease' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #F1F5F9', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <button onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#64748B', padding: 0, fontFamily: "'DM Sans', sans-serif" }}><ArrowLeft size={14} /> Tutup</button>
            <button onClick={onEdit} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 12px', borderRadius: '8px', border: '1.5px solid #E2E8F0', background: '#fff', fontSize: '12px', fontWeight: '600', color: '#374151', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
              <Edit2 size={12} /> Edit
            </button>
          </div>
          <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Sora, sans-serif', fontWeight: '700', fontSize: '18px', color: '#4F46E5', flexShrink: 0 }}>
              {school.name.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: '16px', fontWeight: '700', color: '#0F172A', margin: '0 0 6px', lineHeight: 1.3 }}>{school.name}</h2>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <TierBadge tier={school.subscription_tier} />
                <StatusBadge status={school.subscription_status} />
                <span style={{ fontSize: '11px', fontWeight: '600', color: '#94A3B8', background: '#F8FAFC', padding: '2px 8px', borderRadius: '999px', border: '1px solid #F1F5F9' }}>{school.school_type}</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid #F1F5F9', flexShrink: 0 }}>
          {[{ key: 'overview', label: 'Overview' }, { key: 'users', label: `Pengguna (${profiles.length})` }].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ flex: 1, padding: '12px', border: 'none', background: 'none', fontSize: '13px', fontWeight: '600', color: tab === t.key ? '#4F46E5' : '#64748B', borderBottom: `2px solid ${tab === t.key ? '#4F46E5' : 'transparent'}`, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '16px 24px' }}>
          {tab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {[
                  { label: 'Guru',    value: `${teachers.length} / ${school.max_teachers}`, icon: Users,    color: '#0891B2', bg: '#EFF6FF' },
                  { label: 'Siswa',   value: `${students.length} / ${school.max_students}`, icon: Users,    color: '#16A34A', bg: '#F0FDF4' },
                  { label: 'Admin',   value: admins.length,                                  icon: Shield,   color: '#4F46E5', bg: '#EEF2FF' },
                  { label: 'Sisa Hari', value: days !== null ? (days < 0 ? `${Math.abs(days)}h lalu` : `${days}h`) : '—', icon: Calendar, color: days !== null && days < 14 ? '#DC2626' : '#D97706', bg: days !== null && days < 14 ? '#FEF2F2' : '#FFFBEB' },
                ].map(c => (
                  <div key={c.label} style={{ background: '#F8FAFC', borderRadius: '12px', padding: '14px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <c.icon size={13} style={{ color: c.color }} />
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: '600' }}>{c.label}</div>
                      <div style={{ fontFamily: 'Sora, sans-serif', fontSize: '15px', fontWeight: '700', color: '#0F172A' }}>{c.value}</div>
                    </div>
                  </div>
                ))}
              </div>
              {[
                { label: 'Kapasitas Guru',  current: teachers.length, max: school.max_teachers, color: '#0891B2' },
                { label: 'Kapasitas Siswa', current: students.length, max: school.max_students, color: '#16A34A' },
              ].map(b => (
                <div key={b.label} style={{ background: '#F8FAFC', borderRadius: '12px', padding: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', color: '#64748B', fontWeight: '600' }}>{b.label}</span>
                    <span style={{ fontSize: '12px', fontFamily: 'Sora, sans-serif', fontWeight: '700', color: '#0F172A' }}>{b.current} / {b.max}</span>
                  </div>
                  <div style={{ height: '7px', borderRadius: '99px', background: '#E2E8F0', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: '99px', background: b.current / b.max > 0.85 ? '#EF4444' : b.color, width: `${Math.min(100, (b.current / b.max) * 100)}%`, transition: 'width .8s ease' }} />
                  </div>
                </div>
              ))}
              <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '14px' }}>
                {[
                  { label: 'Email',    value: school.email || '—' },
                  { label: 'Telepon',  value: school.phone || '—' },
                  { label: 'Alamat',   value: school.address || '—' },
                  { label: 'Bergabung',value: fmtDate(school.created_at) },
                  { label: 'Tipe',     value: school.school_type },
                ].map((row, i, arr) => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: i < arr.length - 1 ? '1px solid #F1F5F9' : 'none', gap: '12px' }}>
                    <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: '600', flexShrink: 0 }}>{row.label}</span>
                    <span style={{ fontSize: '13px', color: '#0F172A', textAlign: 'right', wordBreak: 'break-all' }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {tab === 'users' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {pLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} style={{ padding: '12px', background: '#F8FAFC', borderRadius: '10px', display: 'flex', gap: '10px' }}>
                      <Shimmer w="36px" h={36} r={8} /><div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}><Shimmer h={13} /><Shimmer w="60%" h={11} /></div>
                    </div>
                  ))
                : profiles.length === 0
                ? <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94A3B8', fontSize: '13px' }}>Belum ada pengguna terdaftar</div>
                : profiles.map(p => {
                    const rm = ROLE_META[p.role] || { label: p.role, bg: '#F8FAFC', color: '#64748B' };
                    return (
                      <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#F8FAFC', borderRadius: '10px', border: '1px solid #F1F5F9' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: rm.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Sora, sans-serif', fontWeight: '700', fontSize: '14px', color: rm.color, flexShrink: 0 }}>
                          {p.name?.charAt(0) || '?'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: '600', color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                          <div style={{ fontSize: '11px', color: '#94A3B8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.email || p.nis || '—'}</div>
                        </div>
                        <span style={{ padding: '2px 8px', borderRadius: '999px', fontSize: '10px', fontWeight: '700', background: rm.bg, color: rm.color, flexShrink: 0 }}>{rm.label}</span>
                      </div>
                    );
                  })
              }
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const SuperAdminDashboard = () => {
  const [schools, setSchools] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterTier, setFilterTier] = useState('all');
  const [modal, setModal] = useState(false);
  const [editSch, setEditSch] = useState(null);
  const [drawer, setDrawer] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const fetchData = useCallback(async () => {
    try {
      const [schoolsRes, profilesRes] = await Promise.all([
        supabase.from('schools').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('school_id, role'),
      ]);
      if (schoolsRes.error) throw schoolsRes.error;
      if (profilesRes.error) throw profilesRes.error;

      const countMap = {};
      (profilesRes.data || []).forEach(p => {
        if (!p.school_id) return;
        if (!countMap[p.school_id]) countMap[p.school_id] = { student: 0, teacher: 0, school_admin: 0 };
        countMap[p.school_id][p.role] = (countMap[p.school_id][p.role] || 0) + 1;
      });

      setSchools((schoolsRes.data || []).map(s => ({ ...s, _counts: countMap[s.id] || { student: 0, teacher: 0, school_admin: 0 } })));
      setProfiles(profilesRes.data || []);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const stats = {
    total: schools.length,
    active: schools.filter(s => s.subscription_status === 'active').length,
    trial: schools.filter(s => s.subscription_status === 'trial').length,
    suspended: schools.filter(s => ['suspended','expired'].includes(s.subscription_status)).length,
    totalStudents: profiles.filter(p => p.role === 'student').length,
    totalTeachers: profiles.filter(p => p.role === 'teacher').length,
  };

  const filtered = schools.filter(s => {
    const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.email?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || s.subscription_status === filterStatus || (filterStatus === 'problem' && ['suspended','expired'].includes(s.subscription_status));
    const matchTier   = filterTier === 'all' || s.subscription_tier === filterTier;
    return matchSearch && matchStatus && matchTier;
  });

  const daysDiff = (d) => d ? Math.ceil((new Date(d) - new Date()) / (1000*60*60*24)) : null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&family=DM+Sans:wght@400;500;600&display=swap');
        @keyframes fadeUp    { from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);} }
        @keyframes shimmer   { 0%{background-position:-400px 0;}100%{background-position:400px 0;} }
        @keyframes scaleIn   { from{opacity:0;transform:scale(.95);}to{opacity:1;transform:scale(1);} }
        @keyframes slideLeft { from{opacity:0;transform:translateX(40px);}to{opacity:1;transform:translateX(0);} }
        @keyframes slideUp   { from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);} }
        @keyframes spin      { to{transform:rotate(360deg);} }
        .school-row:hover { background: #FAFBFF !important; cursor: pointer; }
      `}</style>

      <div style={{ fontFamily: "'DM Sans', sans-serif", display: 'flex', flexDirection: 'column', gap: '22px' }}>

        <div style={{ opacity: 0, animation: 'fadeUp .4s ease forwards', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Crown size={15} style={{ color: '#4F46E5' }} />
              </div>
              <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: '22px', fontWeight: '700', color: '#0F172A', margin: 0 }}>Super Admin</h1>
            </div>
            <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>Pantau dan kelola seluruh ekosistem sekolah ZiDu</p>
          </div>
          <div style={{ display: 'flex', gap: '9px' }}>
            <button onClick={() => { setRefreshing(true); fetchData(); }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '9px 14px', borderRadius: '9px', border: '1.5px solid #E2E8F0', background: '#fff', fontSize: '13px', fontWeight: '600', color: '#475569', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
              <RefreshCw size={13} style={{ animation: refreshing ? 'spin .7s linear infinite' : 'none' }} />Refresh
            </button>
            <button onClick={() => { setEditSch(null); setModal(true); }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '9px 14px', borderRadius: '9px', border: 'none', background: '#4F46E5', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
              <Plus size={14} />Tambah Sekolah
            </button>
          </div>
        </div>

        {error && <div style={{ padding: '14px 18px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '12px', color: '#DC2626', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}><AlertCircle size={14} />{error}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: '12px', opacity: 0, animation: 'fadeUp .4s ease 60ms forwards' }}>
          {[
            { icon: School, label: 'Total Sekolah', value: loading ? '—' : stats.total, sub: 'Di platform', color: '#4F46E5', bg: '#EEF2FF' },
            { icon: CheckCircle2, label: 'Aktif', value: loading ? '—' : stats.active, sub: 'Langganan berjalan', color: '#16A34A', bg: '#F0FDF4' },
            { icon: Clock, label: 'Trial', value: loading ? '—' : stats.trial, sub: 'Masa percobaan', color: '#D97706', bg: '#FFFBEB' },
            { icon: AlertCircle, label: 'Bermasalah', value: loading ? '—' : stats.suspended, sub: 'Suspended/expired', color: '#DC2626', bg: '#FEF2F2' },
            { icon: Users, label: 'Total Siswa', value: loading ? '—' : fmt(stats.totalStudents), sub: 'Semua sekolah', color: '#0891B2', bg: '#EFF6FF' },
            { icon: Users, label: 'Total Guru', value: loading ? '—' : fmt(stats.totalTeachers), sub: 'Semua sekolah', color: '#7C3AED', bg: '#F5F3FF' },
          ].map((c, i) => (
            <div key={c.label} style={{ background: '#fff', borderRadius: '14px', border: '1px solid #F1F5F9', padding: '18px', boxShadow: '0 1px 4px rgba(0,0,0,.03)', opacity: 0, animation: `fadeUp .35s ease ${i * 40}ms forwards` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748B' }}>{c.label}</span>
                <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <c.icon size={15} style={{ color: c.color }} />
                </div>
              </div>
              <div style={{ fontFamily: 'Sora, sans-serif', fontSize: '24px', fontWeight: '700', color: '#0F172A', lineHeight: 1 }}>{c.value}</div>
              <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>{c.sub}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', opacity: 0, animation: 'fadeUp .4s ease 120ms forwards' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <Search size={13} style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
            <input type="text" placeholder="Cari nama atau email sekolah..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', padding: '9px 12px 9px 32px', borderRadius: '10px', border: '1.5px solid #E2E8F0', background: '#F8FAFC', fontSize: '13px', color: '#0F172A', outline: 'none', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' }}
              onFocus={e => { e.target.style.borderColor = '#4F46E5'; e.target.style.boxShadow = '0 0 0 3px rgba(79,70,229,.1)'; }}
              onBlur={e => { e.target.style.borderColor = '#E2E8F0'; e.target.style.boxShadow = 'none'; }} />
          </div>
          {[
            { v: filterStatus, s: setFilterStatus, p: 'Semua Status', opts: [{ value: 'active', label: 'Aktif' }, { value: 'trial', label: 'Trial' }, { value: 'problem', label: 'Bermasalah' }] },
            { v: filterTier,   s: setFilterTier,   p: 'Semua Paket',  opts: TIERS.map(t => ({ value: t, label: TIER_META[t].label })) },
          ].map((f, i) => (
            <div key={i} style={{ position: 'relative' }}>
              <select value={f.v} onChange={e => f.s(e.target.value)}
                style={{ padding: '9px 28px 9px 11px', borderRadius: '10px', border: '1.5px solid #E2E8F0', background: '#F8FAFC', fontSize: '13px', color: f.v !== 'all' ? '#0F172A' : '#94A3B8', outline: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", appearance: 'none' }}>
                <option value="all">{f.p}</option>
                {f.opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <ChevronDown size={12} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
            </div>
          ))}
          <span style={{ fontSize: '12px', color: '#94A3B8', alignSelf: 'center' }}>{filtered.length} sekolah</span>
        </div>

        <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #F1F5F9', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.03)', opacity: 0, animation: 'fadeUp .4s ease 160ms forwards' }}>
          {loading
            ? <div style={{ padding: '16px 20px' }}>{Array.from({ length: 6 }).map((_, i) => <div key={i} style={{ padding: '14px 0', borderBottom: '1px solid #F8FAFC', display: 'flex', gap: '16px' }}><Shimmer w="36px" h={36} r={10} /><Shimmer w="180px" /><Shimmer w="80px" /><Shimmer w="60px" /></div>)}</div>
            : filtered.length === 0
            ? <div style={{ padding: '64px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>🏫</div>
                <div style={{ fontFamily: 'Sora, sans-serif', fontSize: '16px', fontWeight: '700', color: '#0F172A', marginBottom: '6px' }}>
                  {search || filterStatus !== 'all' || filterTier !== 'all' ? 'Tidak ada sekolah ditemukan' : 'Belum ada sekolah'}
                </div>
                <div style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '20px' }}>
                  {search || filterStatus !== 'all' || filterTier !== 'all' ? 'Coba ubah filter' : 'Mulai dengan menambahkan sekolah pertama'}
                </div>
                {!search && filterStatus === 'all' && filterTier === 'all' && (
                  <button onClick={() => { setEditSch(null); setModal(true); }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 16px', borderRadius: '9px', border: 'none', background: '#4F46E5', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                    <Plus size={14} />Tambah Sekolah
                  </button>
                )}
              </div>
            : <>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '680px' }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #F1F5F9' }}>
                        {['Sekolah', 'Paket', 'Status', 'Guru', 'Siswa', 'Kadaluarsa', ''].map(h => (
                          <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: '#94A3B8', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((s, idx) => {
                        const days = daysDiff(s.subscription_end_date);
                        const isExpiring = days !== null && days > 0 && days <= 14;
                        return (
                          <tr key={s.id} className="school-row" onClick={() => setDrawer(s)}
                            style={{ borderBottom: '1px solid #F8FAFC', background: '#fff', transition: 'background .1s', opacity: 0, animation: `fadeUp .3s ease ${Math.min(idx,12)*30}ms forwards` }}>
                            <td style={{ padding: '14px 16px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Sora, sans-serif', fontWeight: '700', fontSize: '14px', color: '#4F46E5', flexShrink: 0 }}>
                                  {s.name.charAt(0).toUpperCase()}
                                </div>
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>{s.name}</div>
                                  <div style={{ fontSize: '11px', color: '#94A3B8' }}>{s.school_type} · {s.email || '—'}</div>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '14px 16px' }}><TierBadge tier={s.subscription_tier} /></td>
                            <td style={{ padding: '14px 16px' }}><StatusBadge status={s.subscription_status} /></td>
                            <td style={{ padding: '14px 16px' }}>
                              <span style={{ fontFamily: 'Sora, sans-serif', fontSize: '13px', fontWeight: '700', color: '#0F172A' }}>{s._counts.teacher}</span>
                              <span style={{ fontSize: '11px', color: '#94A3B8' }}> / {s.max_teachers}</span>
                            </td>
                            <td style={{ padding: '14px 16px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontFamily: 'Sora, sans-serif', fontSize: '13px', fontWeight: '700', color: '#0F172A' }}>{s._counts.student}</span>
                                <span style={{ fontSize: '11px', color: '#94A3B8' }}>/ {s.max_students}</span>
                                <div style={{ width: '40px', height: '4px', borderRadius: '99px', background: '#F1F5F9', overflow: 'hidden' }}>
                                  <div style={{ height: '100%', borderRadius: '99px', background: s._counts.student/s.max_students > 0.85 ? '#EF4444' : '#4F46E5', width: `${Math.min(100,(s._counts.student/s.max_students)*100)}%` }} />
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '14px 16px' }}>
                              <span style={{ fontSize: '12px', fontWeight: '600', color: days === null ? '#CBD5E1' : days < 0 ? '#DC2626' : isExpiring ? '#D97706' : '#64748B' }}>
                                {days === null ? '—' : days < 0 ? `${Math.abs(days)}h lalu` : isExpiring ? `⚠ ${days}h` : `${days}h`}
                              </span>
                            </td>
                            <td style={{ padding: '14px 16px' }} onClick={e => e.stopPropagation()}>
                              <button onClick={() => { setEditSch(s); setModal(true); }}
                                style={{ width: '28px', height: '28px', borderRadius: '7px', border: '1px solid #F1F5F9', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#94A3B8' }}
                                onMouseEnter={e => e.currentTarget.style.background = '#EEF2FF'}
                                onMouseLeave={e => e.currentTarget.style.background = '#F8FAFC'}>
                                <Edit2 size={13} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div style={{ padding: '10px 16px', borderTop: '1px solid #F8FAFC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: '#94A3B8' }}>Menampilkan {filtered.length} dari {schools.length} sekolah</span>
                  <span style={{ fontSize: '11px', color: '#CBD5E1', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Zap size={10} style={{ color: '#4F46E5' }} /> Real-time dari Supabase
                  </span>
                </div>
              </>
          }
        </div>
      </div>

      <SchoolModal open={modal} school={editSch}
        onClose={() => { setModal(false); setEditSch(null); }}
        onSaved={() => { fetchData(); showToast(editSch ? 'Sekolah diperbarui' : 'Sekolah berhasil ditambahkan'); }} />

      {drawer && (
        <SchoolDrawer school={drawer}
          onClose={() => setDrawer(null)}
          onEdit={() => { setEditSch(drawer); setDrawer(null); setModal(true); }} />
      )}

      {toast && <Toast {...toast} />}
    </>
  );
};

export default SuperAdminDashboard;