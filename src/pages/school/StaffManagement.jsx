import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  Users, GraduationCap, Search, RefreshCw, Plus, Edit2, Trash2,
  X, Save, AlertCircle, CheckCircle2, MoreVertical, Eye,
  Upload, Download, ChevronDown, BookOpen, School,
} from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────
const fmt     = (n) => (n ?? 0).toLocaleString('id-ID');
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

// ── UI Atoms ──────────────────────────────────────────────────────
const Input = ({ label, required, error, hint, ...props }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
    {label && <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151' }}>{label}{required && <span style={{ color: '#EF4444', marginLeft: '2px' }}>*</span>}</label>}
    <input {...props} style={{ padding: '9px 12px', borderRadius: '9px', fontSize: '13px', color: '#0F172A', fontFamily: "'DM Sans', sans-serif", border: `1.5px solid ${error ? '#FCA5A5' : '#E2E8F0'}`, background: error ? '#FFF5F5' : '#F8FAFC', outline: 'none', width: '100%', boxSizing: 'border-box', transition: 'border-color .15s, box-shadow .15s', ...props.style }}
      onFocus={e => { e.target.style.borderColor = '#4F46E5'; e.target.style.boxShadow = '0 0 0 3px rgba(79,70,229,.1)'; e.target.style.background = '#fff'; }}
      onBlur={e => { e.target.style.borderColor = error ? '#FCA5A5' : '#E2E8F0'; e.target.style.boxShadow = 'none'; e.target.style.background = error ? '#FFF5F5' : '#F8FAFC'; }} />
    {error && <span style={{ fontSize: '11px', color: '#EF4444' }}>{error}</span>}
    {hint && !error && <span style={{ fontSize: '11px', color: '#94A3B8' }}>{hint}</span>}
  </div>
);

const SelectField = ({ label, required, options, placeholder, ...props }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
    {label && <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151' }}>{label}{required && <span style={{ color: '#EF4444', marginLeft: '2px' }}>*</span>}</label>}
    <div style={{ position: 'relative' }}>
      <select {...props} style={{ padding: '9px 32px 9px 12px', borderRadius: '9px', fontSize: '13px', color: props.value ? '#0F172A' : '#94A3B8', fontFamily: "'DM Sans', sans-serif", border: '1.5px solid #E2E8F0', background: '#F8FAFC', outline: 'none', width: '100%', appearance: 'none', cursor: 'pointer', ...props.style }}
        onFocus={e => { e.target.style.borderColor = '#4F46E5'; e.target.style.boxShadow = '0 0 0 3px rgba(79,70,229,.1)'; }}
        onBlur={e => { e.target.style.borderColor = '#E2E8F0'; e.target.style.boxShadow = 'none'; }}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown size={13} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
    </div>
  </div>
);

const Btn = ({ children, variant = 'primary', icon: Icon, loading, sm, ...props }) => {
  const S = { primary: ['#4F46E5','#fff','#4F46E5','#4338CA'], secondary: ['#fff','#374151','#E2E8F0','#F1F5F9'], danger: ['#DC2626','#fff','#DC2626','#B91C1C'], ghost: ['transparent','#64748B','transparent','#F1F5F9'] };
  const [bg, color, border, hbg] = S[variant] || S.primary;
  const pad = sm ? '6px 12px' : '9px 16px';
  return (
    <button {...props} disabled={loading || props.disabled}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: pad, borderRadius: '9px', fontSize: sm ? '12px' : '13px', fontWeight: '600', cursor: loading || props.disabled ? 'not-allowed' : 'pointer', opacity: loading || props.disabled ? 0.6 : 1, background: bg, color, border: `1.5px solid ${border}`, fontFamily: "'DM Sans', sans-serif", transition: 'all .15s', whiteSpace: 'nowrap', ...props.style }}
      onMouseEnter={e => { if (!loading && !props.disabled) e.currentTarget.style.background = hbg; }}
      onMouseLeave={e => { e.currentTarget.style.background = bg; }}>
      {loading ? <div style={{ width: '13px', height: '13px', border: '2px solid rgba(255,255,255,.3)', borderTopColor: color, borderRadius: '50%', animation: 'spin .7s linear infinite' }} /> : Icon && <Icon size={sm ? 12 : 14} />}
      {children}
    </button>
  );
};

const Avatar = ({ name, size = 36, color = '#4F46E5', bg = '#EEF2FF' }) => (
  <div style={{ width: size, height: size, borderRadius: size * 0.28, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Sora, sans-serif', fontWeight: '700', fontSize: size * 0.38, color, flexShrink: 0 }}>
    {(name || '?').charAt(0).toUpperCase()}
  </div>
);

const Shimmer = ({ h = 14, w = '100%', r = 6 }) => (
  <div style={{ height: h, width: w, borderRadius: r, background: 'linear-gradient(90deg,#F1F5F9 25%,#E2E8F0 50%,#F1F5F9 75%)', backgroundSize: '800px 100%', animation: 'shimmer 1.2s infinite' }} />
);

const Toast = ({ msg, type }) => (
  <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 300, display: 'flex', alignItems: 'center', gap: '10px', padding: '13px 18px', borderRadius: '12px', background: type === 'error' ? '#DC2626' : '#0F172A', color: '#fff', fontSize: '13px', fontWeight: '500', boxShadow: '0 8px 30px rgba(0,0,0,.2)', fontFamily: "'DM Sans', sans-serif", animation: 'slideDown .25s ease' }}>
    {type === 'error' ? <AlertCircle size={15} /> : <CheckCircle2 size={15} style={{ color: '#4ADE80' }} />}{msg}
  </div>
);

const ConfirmDialog = ({ open, title, message, confirmLabel, variant = 'danger', onConfirm, onCancel, loading }) => {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.6)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: '#fff', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '400px', boxShadow: '0 25px 60px rgba(0,0,0,.2)', animation: 'scaleIn .2s ease' }}>
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

// ── Detail Drawer ─────────────────────────────────────────────────
const DetailDrawer = ({ person, classes, subjects, onClose, onEdit, onDelete, tab }) => {
  if (!person) return null;
  const isTeacher = tab === 'guru';
  const classObj = classes.find(c => c.id === person.class_id);
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.5)', backdropFilter: 'blur(4px)', zIndex: 180, display: 'flex', justifyContent: 'flex-end' }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ width: '100%', maxWidth: '380px', height: '100%', background: '#fff', boxShadow: '-20px 0 60px rgba(0,0,0,.15)', display: 'flex', flexDirection: 'column', animation: 'slideInRight .25s cubic-bezier(.16,1,.3,1)' }}>
        <div style={{ padding: '22px', borderBottom: '1px solid #F1F5F9', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '13px' }}>
              <Avatar name={person.name} size={48} color={isTeacher ? '#4F46E5' : '#0891B2'} bg={isTeacher ? '#EEF2FF' : '#EFF6FF'} />
              <div>
                <h3 style={{ fontFamily: 'Sora, sans-serif', fontSize: '16px', fontWeight: '700', color: '#0F172A', margin: '0 0 4px' }}>{person.name}</h3>
                <span style={{ fontSize: '12px', color: '#94A3B8' }}>{person.email}</span>
              </div>
            </div>
            <button onClick={onClose} style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #F1F5F9', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#94A3B8', flexShrink: 0 }}>
              <X size={15} />
            </button>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Btn variant="secondary" icon={Edit2} onClick={() => onEdit(person)} style={{ flex: 1 }}>Edit</Btn>
            <Btn variant="danger" icon={Trash2} onClick={() => onDelete(person)} style={{ flex: 1 }}>Hapus</Btn>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '10px' }}>Informasi</div>
            {[
              { label: 'Nama Lengkap', value: person.name || '—' },
              { label: 'Email',        value: person.email || '—' },
              { label: 'Telepon',      value: person.phone || '—' },
              !isTeacher && { label: 'NIS',  value: person.nis || '—' },
              !isTeacher && { label: 'Kelas', value: classObj?.name || '—' },
              { label: 'Terdaftar',   value: fmtDate(person.created_at) },
            ].filter(Boolean).map((row, i, arr) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '9px 0', borderBottom: i < arr.length - 1 ? '1px solid #F8FAFC' : 'none', gap: '12px' }}>
                <span style={{ fontSize: '12px', color: '#94A3B8', flexShrink: 0 }}>{row.label}</span>
                <span style={{ fontSize: '13px', color: '#0F172A', fontWeight: '500', textAlign: 'right', wordBreak: 'break-all' }}>{row.value}</span>
              </div>
            ))}
          </div>
          {isTeacher && Array.isArray(person.subject_ids) && person.subject_ids.length > 0 && (
            <div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '10px' }}>Mata Pelajaran</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
                {person.subject_ids.map(sid => {
                  const subj = subjects.find(s => s.id === sid);
                  return subj ? (
                    <span key={sid} style={{ padding: '4px 10px', borderRadius: '8px', background: '#EEF2FF', color: '#4F46E5', fontSize: '12px', fontWeight: '600' }}>{subj.name}</span>
                  ) : null;
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Person Modal (Add/Edit) ────────────────────────────────────────
const PersonModal = ({ open, person, tab, classes, subjects, schoolId, onClose, onSaved }) => {
  const isEdit    = !!person?.id;
  const isTeacher = tab === 'guru';
  const EMPTY = { name: '', email: '', phone: '', nis: '', class_id: '', subject_ids: [] };

  const [form, setForm]   = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState('');

  useEffect(() => {
    if (open) {
      setForm(person ? {
        name:        person.name || '',
        email:       person.email || '',
        phone:       person.phone || '',
        nis:         person.nis || '',
        class_id:    person.class_id || '',
        subject_ids: person.subject_ids || [],
      } : EMPTY);
      setErrors({});
      setSaveErr('');
    }
  }, [open, person]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleSubject = (sid) => {
    setForm(f => ({
      ...f,
      subject_ids: f.subject_ids.includes(sid)
        ? f.subject_ids.filter(s => s !== sid)
        : [...f.subject_ids, sid],
    }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim())  e.name  = 'Nama wajib diisi';
    if (isEdit && !form.email.trim()) e.email = 'Email wajib diisi';
    else if (!isEdit && !form.email.trim()) e.email = 'Email wajib diisi';
    else if (form.email && !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Format email tidak valid';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true); setSaveErr('');
    try {
      const payload = {
        name:  form.name.trim(),
        phone: form.phone.trim() || null,
        updated_at: new Date().toISOString(),
        ...(isTeacher
          ? { subject_ids: form.subject_ids }
          : { nis: form.nis.trim() || null, class_id: form.class_id || null }),
      };
      if (!isEdit) {
        payload.email = form.email.trim().toLowerCase();
      }

      const { error } = isEdit
        ? await supabase.from('profiles').update(payload).eq('id', person.id)
        : await supabase.from('profiles').insert([{
            ...payload,
            email:      form.email.trim().toLowerCase(),
            role:       isTeacher ? 'teacher' : 'student',
            school_id:  schoolId,
            created_at: new Date().toISOString(),
          }]);
      if (error) throw error;
      onSaved(); onClose();
    } catch (err) {
      setSaveErr(err.message?.includes('duplicate') ? 'Email sudah terdaftar.' : err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.6)', backdropFilter: 'blur(6px)', zIndex: 190, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 30px 80px rgba(0,0,0,.25)', animation: 'scaleIn .2s ease' }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: isTeacher ? '#EEF2FF' : '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isTeacher ? <Users size={16} style={{ color: '#4F46E5' }} /> : <GraduationCap size={16} style={{ color: '#0891B2' }} />}
            </div>
            <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: '16px', fontWeight: '700', color: '#0F172A', margin: 0 }}>
              {isEdit ? `Edit ${isTeacher ? 'Guru' : 'Siswa'}` : `Tambah ${isTeacher ? 'Guru' : 'Siswa'} Baru`}
            </h2>
          </div>
          <button onClick={onClose} style={{ width: '30px', height: '30px', borderRadius: '8px', border: '1px solid #F1F5F9', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#94A3B8' }}>
            <X size={14} />
          </button>
        </div>

        <div style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ gridColumn: '1/-1' }}>
              <Input label="Nama Lengkap" required placeholder="Masukkan nama lengkap" value={form.name} onChange={e => set('name', e.target.value)} error={errors.name} />
            </div>
            <Input label="Email" required type="email" placeholder="email@contoh.com" value={form.email} onChange={e => set('email', e.target.value)} error={errors.email} hint={isEdit ? 'Email tidak bisa diubah' : ''} disabled={isEdit} />
            <Input label="Nomor Telepon" placeholder="08xxxxxxxxxx" value={form.phone} onChange={e => set('phone', e.target.value)} />
            {!isTeacher && <>
              <Input label="NIS" placeholder="Nomor Induk Siswa" value={form.nis} onChange={e => set('nis', e.target.value)} />
              <SelectField label="Kelas" placeholder="— Pilih Kelas —" value={form.class_id} onChange={e => set('class_id', e.target.value)}
                options={classes.map(c => ({ value: c.id, label: c.name }))} />
            </>}
          </div>

          {isTeacher && subjects.length > 0 && (
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '8px' }}>Mata Pelajaran yang Diajar</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
                {subjects.map(s => {
                  const active = form.subject_ids.includes(s.id);
                  return (
                    <button key={s.id} type="button" onClick={() => toggleSubject(s.id)}
                      style={{ padding: '5px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', border: `1.5px solid ${active ? '#4F46E5' : '#E2E8F0'}`, background: active ? '#EEF2FF' : '#F8FAFC', color: active ? '#4F46E5' : '#64748B', transition: 'all .15s' }}>
                      {s.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {saveErr && (
            <div style={{ padding: '11px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '9px', color: '#DC2626', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={14} />{saveErr}
            </div>
          )}
        </div>

        <div style={{ padding: '14px 24px', borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'flex-end', gap: '10px', flexShrink: 0 }}>
          <Btn variant="secondary" onClick={onClose} disabled={saving}>Batal</Btn>
          <Btn icon={Save} loading={saving} onClick={handleSave}>{isEdit ? 'Simpan' : 'Tambah'}</Btn>
        </div>
      </div>
    </div>
  );
};

// ── CSV Import Modal ──────────────────────────────────────────────
const CsvImportModal = ({ open, classes, schoolId, preselectedClass, onClose, onImported }) => {
  const [rows, setRows]       = useState([]);
  const [preview, setPreview] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult]   = useState(null);
  const [error, setError]     = useState('');
  const fileRef = useRef();

  const reset = () => { setRows([]); setPreview(false); setResult(null); setError(''); };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const lines = ev.target.result.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length < 2) { setError('File CSV minimal harus punya 1 baris header + 1 baris data.'); return; }
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/["']/g,''));
        const nameIdx  = headers.findIndex(h => h.includes('nama') || h === 'name');
        const emailIdx = headers.findIndex(h => h.includes('email'));
        const nisIdx   = headers.findIndex(h => h.includes('nis'));
        const classIdx = headers.findIndex(h => h.includes('kelas') || h.includes('class'));
        if (nameIdx < 0 || emailIdx < 0) { setError('CSV harus memiliki kolom "nama" dan "email".'); return; }
        const parsed = lines.slice(1).map((line, i) => {
          const cols = line.split(',').map(c => c.trim().replace(/["']/g,''));
          const className = preselectedClass ? preselectedClass.name : (classIdx >= 0 ? cols[classIdx] : '');
          const classObj  = preselectedClass || classes.find(c => c.name.toLowerCase() === (classIdx >= 0 ? cols[classIdx] : '').toLowerCase());
          return {
            _row: i + 2,
            name:     cols[nameIdx] || '',
            email:    cols[emailIdx]?.toLowerCase() || '',
            nis:      nisIdx >= 0 ? cols[nisIdx] || '' : '',
            class_id: classObj?.id || '',
            _className: className,
            _valid: !!(cols[nameIdx] && cols[emailIdx] && /\S+@\S+\.\S+/.test(cols[emailIdx])),
          };
        });
        setRows(parsed); setPreview(true); setError('');
      } catch { setError('Gagal membaca file CSV. Pastikan format benar.'); }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!rows.length) return;
    setImporting(true);
    const valid = rows.filter(r => r._valid);
    let success = 0, failed = 0;
    for (const row of valid) {
      const { error } = await supabase.from('profiles').insert([{
        name: row.name, email: row.email, nis: row.nis || null,
        class_id: row.class_id || null, role: 'student',
        school_id: schoolId, created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }]);
      error ? failed++ : success++;
    }
    setResult({ success, failed, skipped: rows.length - valid.length });
    setImporting(false);
    if (success > 0) onImported();
  };

  const downloadTemplate = () => {
    const cls = preselectedClass?.name || 'X-A';
    const csv = preselectedClass
      ? `nama,email,nis\nBudi Santoso,budi@email.com,12345\nSiti Rahayu,siti@email.com,12346`
      : `nama,email,nis,kelas\nBudi Santoso,budi@email.com,12345,${cls}\nSiti Rahayu,siti@email.com,12346,X-B`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = preselectedClass ? `template_${preselectedClass.name.replace(/\s+/g,'_')}.csv` : 'template_siswa.csv';
    a.click();
  };

  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.6)', backdropFilter: 'blur(6px)', zIndex: 190, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '600px', maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 30px 80px rgba(0,0,0,.25)', animation: 'scaleIn .2s ease' }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Upload size={16} style={{ color: '#0891B2' }} />
            </div>
            <div>
              <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: '16px', fontWeight: '700', color: '#0F172A', margin: '0 0 2px' }}>Import Siswa via CSV</h2>
              {preselectedClass && <div style={{ fontSize: '12px', color: '#4F46E5', fontWeight: '600' }}>📌 Kelas: {preselectedClass.name}</div>}
            </div>
          </div>
          <button onClick={() => { reset(); onClose(); }} style={{ width: '30px', height: '30px', borderRadius: '8px', border: '1px solid #F1F5F9', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#94A3B8' }}>
            <X size={14} />
          </button>
        </div>

        <div style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {!preview && !result && <>
            <div style={{ padding: '16px', background: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>Format CSV yang dibutuhkan:</div>
              <code style={{ fontSize: '12px', color: '#4F46E5', background: '#EEF2FF', padding: '8px 12px', borderRadius: '8px', display: 'block', lineHeight: 1.6 }}>
                {preselectedClass
                  ? <>nama, email, nis<br />Budi Santoso, budi@email.com, 12345</>
                  : <>nama, email, nis, kelas<br />Budi Santoso, budi@email.com, 12345, X-A</>}
              </code>
              <button onClick={downloadTemplate} style={{ marginTop: '10px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#4F46E5', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                <Download size={12} /> Download template
              </button>
            </div>
            <div
              onClick={() => fileRef.current?.click()}
              style={{ border: '2px dashed #E2E8F0', borderRadius: '14px', padding: '32px', textAlign: 'center', cursor: 'pointer', transition: 'all .15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#4F46E5'; e.currentTarget.style.background = '#FAFBFF'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.background = 'transparent'; }}>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>📂</div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Klik untuk pilih file CSV</div>
              <div style={{ fontSize: '12px', color: '#94A3B8' }}>atau drag & drop di sini</div>
              <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} style={{ display: 'none' }} />
            </div>
            {error && <div style={{ padding: '11px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '9px', color: '#DC2626', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}><AlertCircle size={14} />{error}</div>}
          </>}

          {preview && !result && <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#0F172A', fontFamily: 'Sora, sans-serif' }}>Preview: {rows.length} baris</div>
                <div style={{ fontSize: '12px', color: '#94A3B8' }}>{rows.filter(r => r._valid).length} valid · {rows.filter(r => !r._valid).length} invalid</div>
              </div>
              <Btn variant="ghost" sm onClick={reset}>Ganti File</Btn>
            </div>
            <div style={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid #F1F5F9' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '400px' }}>
                <thead>
                  <tr style={{ background: '#FAFBFF' }}>
                    {['#','Nama','Email','NIS','Kelas','Status'].map(h => <th key={h} style={{ padding: '9px 12px', textAlign: 'left', color: '#94A3B8', fontWeight: '700', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '.05em', whiteSpace: 'nowrap' }}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 10).map((r, i) => (
                    <tr key={i} style={{ borderTop: '1px solid #F8FAFC', background: r._valid ? '#fff' : '#FFF5F5' }}>
                      <td style={{ padding: '8px 12px', color: '#94A3B8' }}>{r._row}</td>
                      <td style={{ padding: '8px 12px', fontWeight: '500', color: '#0F172A' }}>{r.name || <span style={{ color: '#EF4444' }}>—</span>}</td>
                      <td style={{ padding: '8px 12px', color: '#64748B' }}>{r.email || <span style={{ color: '#EF4444' }}>—</span>}</td>
                      <td style={{ padding: '8px 12px', color: '#64748B' }}>{r.nis || '—'}</td>
                      <td style={{ padding: '8px 12px', color: '#64748B' }}>{r._className || '—'}</td>
                      <td style={{ padding: '8px 12px' }}>
                        {r._valid
                          ? <span style={{ color: '#16A34A', fontWeight: '600', fontSize: '11px' }}>✓ Valid</span>
                          : <span style={{ color: '#DC2626', fontWeight: '600', fontSize: '11px' }}>✗ Invalid</span>}
                      </td>
                    </tr>
                  ))}
                  {rows.length > 10 && <tr><td colSpan={6} style={{ padding: '8px 12px', color: '#94A3B8', fontStyle: 'italic', fontSize: '11px' }}>...dan {rows.length - 10} baris lainnya</td></tr>}
                </tbody>
              </table>
            </div>
          </>}

          {result && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>{result.failed === 0 ? '🎉' : '⚠️'}</div>
              <div style={{ fontFamily: 'Sora, sans-serif', fontSize: '18px', fontWeight: '700', color: '#0F172A', marginBottom: '8px' }}>Import Selesai</div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#16A34A', fontFamily: 'Sora, sans-serif' }}>{result.success}</div>
                  <div style={{ fontSize: '12px', color: '#94A3B8' }}>Berhasil</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#DC2626', fontFamily: 'Sora, sans-serif' }}>{result.failed}</div>
                  <div style={{ fontSize: '12px', color: '#94A3B8' }}>Gagal</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#D97706', fontFamily: 'Sora, sans-serif' }}>{result.skipped}</div>
                  <div style={{ fontSize: '12px', color: '#94A3B8' }}>Dilewati</div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: '14px 24px', borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'flex-end', gap: '10px', flexShrink: 0 }}>
          {result
            ? <Btn onClick={() => { reset(); onClose(); }}>Selesai</Btn>
            : preview
            ? <><Btn variant="secondary" onClick={reset} disabled={importing}>Batal</Btn>
               <Btn icon={Upload} loading={importing} onClick={handleImport}>Import {rows.filter(r => r._valid).length} Siswa</Btn></>
            : <Btn variant="secondary" onClick={() => { reset(); onClose(); }}>Tutup</Btn>}
        </div>
      </div>
    </div>
  );
};

// ── Action Dropdown ───────────────────────────────────────────────
const ActionMenu = ({ person, onView, onEdit, onDelete }) => {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <button onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        style={{ width: '28px', height: '28px', borderRadius: '7px', border: '1px solid #F1F5F9', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#94A3B8' }}
        onMouseEnter={e => e.currentTarget.style.background = '#EEF2FF'}
        onMouseLeave={e => e.currentTarget.style.background = '#F8FAFC'}>
        <MoreVertical size={13} />
      </button>
      {open && <>
        <div style={{ position: 'fixed', inset: 0, zIndex: 50 }} onClick={() => setOpen(false)} />
        <div style={{ position: 'absolute', right: 0, top: '34px', background: '#fff', borderRadius: '12px', border: '1px solid #F1F5F9', boxShadow: '0 8px 30px rgba(0,0,0,.12)', zIndex: 51, minWidth: '150px', overflow: 'hidden', padding: '4px' }}>
          {[{ icon: Eye, label: 'Detail', action: () => { onView(person); setOpen(false); }, color: '#374151' },
            { icon: Edit2, label: 'Edit', action: () => { onEdit(person); setOpen(false); }, color: '#374151' },
            { icon: Trash2, label: 'Hapus', action: () => { onDelete(person); setOpen(false); }, color: '#DC2626' }]
            .map(item => (
              <button key={item.label} onClick={item.action}
                style={{ display: 'flex', alignItems: 'center', gap: '9px', width: '100%', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: item.color, borderRadius: '8px', fontFamily: "'DM Sans', sans-serif", fontWeight: '500', textAlign: 'left' }}
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

// ── Main Page ─────────────────────────────────────────────────────
const StaffManagement = () => {
  const { profile }  = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  // Auto-open CSV import if navigated from ClassManagement with a class
  useEffect(() => {
    if (location.state?.openCsvImport && location.state?.importClass) {
      setTab('siswa');
      setCsvPreselectedClass(location.state.importClass);
      setCsvOpen(true);
      // Clear state so refresh doesn't re-open
      window.history.replaceState({}, '');
    }
  }, []);
  const tab = searchParams.get('tab') === 'siswa' ? 'siswa' : 'guru';
  const setTab = (t) => setSearchParams({ tab: t });
  const setTabDirect = (t) => setSearchParams({ tab: t }, { replace: true });

  const [teachers,  setTeachers]  = useState([]);
  const [students,  setStudents]  = useState([]);
  const [classes,   setClasses]   = useState([]);
  const [subjects,  setSubjects]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [refreshing,setRefreshing]= useState(false);
  const [error,     setError]     = useState(null);

  const [search,     setSearch]     = useState('');
  const [filterClass,setFilterClass]= useState('');

  const [modalOpen,  setModalOpen]  = useState(false);
  const [editPerson, setEditPerson] = useState(null);
  const [detailPerson, setDetailPerson] = useState(null);
  const [csvOpen,    setCsvOpen]    = useState(false);
  const [csvPreselectedClass, setCsvPreselectedClass] = useState(null);

  const [confirm,    setConfirm]    = useState({ open: false });
  const [actLoading, setActLoading] = useState(false);
  const [toast,      setToast]      = useState(null);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const fetchData = useCallback(async () => {
    if (!profile?.school_id) { setLoading(false); return; }
    const sid = profile.school_id;
    try {
      const [tRes, sRes, cRes, subRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('school_id', sid).eq('role', 'teacher').order('name'),
        supabase.from('profiles').select('*').eq('school_id', sid).eq('role', 'student').order('name'),
        supabase.from('classes').select('id, name, grade_level').eq('school_id', sid).order('grade_level'),
        supabase.from('subjects').select('id, name, code').eq('school_id', sid).order('name'),
      ]);
      if (tRes.error) throw tRes.error;
      setTeachers(tRes.data || []);
      setStudents(sRes.data || []);
      setClasses(cRes.data || []);
      setSubjects(subRes.data || []);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, [profile?.school_id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = (person) => {
    setConfirm({
      open: true,
      title: `Hapus ${tab === 'guru' ? 'Guru' : 'Siswa'}`,
      message: `Hapus "${person.name}"? Data ini tidak bisa dikembalikan.`,
      confirmLabel: 'Ya, Hapus',
      onConfirm: async () => {
        setActLoading(true);
        const { error } = await supabase.from('profiles').delete().eq('id', person.id);
        if (error) showToast(error.message, 'error');
        else { showToast(`${person.name} berhasil dihapus`); fetchData(); if (detailPerson?.id === person.id) setDetailPerson(null); }
        setActLoading(false); setConfirm({ open: false });
      },
      onCancel: () => setConfirm({ open: false }),
    });
  };

  const list = tab === 'guru' ? teachers : students;
  const filtered = list.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.name?.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q) || p.nis?.toLowerCase()?.includes(q);
    const matchClass  = !filterClass || p.class_id === filterClass;
    return matchSearch && matchClass;
  });

  const isGuru = tab === 'guru';

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&family=DM+Sans:wght@400;500;600&display=swap');
        @keyframes fadeUp       { from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);} }
        @keyframes shimmer      { 0%{background-position:-400px 0;}100%{background-position:400px 0;} }
        @keyframes scaleIn      { from{opacity:0;transform:scale(.95);}to{opacity:1;transform:scale(1);} }
        @keyframes slideInRight { from{transform:translateX(100%);}to{transform:translateX(0);} }
        @keyframes slideDown    { from{opacity:0;transform:translateY(-8px);}to{opacity:1;transform:translateY(0);} }
        @keyframes spin         { to{transform:rotate(360deg);} }
        .sm-row:hover { background: #FAFBFF !important; cursor: pointer; }
      `}</style>

      <div style={{ fontFamily: "'DM Sans', sans-serif", display: 'flex', flexDirection: 'column', gap: '22px' }}>

        {/* Header */}
        <div style={{ opacity: 0, animation: 'fadeUp .4s ease forwards', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={15} style={{ color: '#4F46E5' }} />
              </div>
              <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: '22px', fontWeight: '700', color: '#0F172A', margin: 0 }}>Manajemen Staf</h1>
            </div>
            <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>Kelola guru dan siswa di {profile?.schools?.name || 'sekolah kamu'}</p>
          </div>
          <div style={{ display: 'flex', gap: '9px', flexWrap: 'wrap' }}>
            <Btn variant="secondary" icon={RefreshCw} loading={refreshing} onClick={() => { setRefreshing(true); fetchData(); }}>Refresh</Btn>
            {!isGuru && <Btn variant="secondary" icon={Upload} onClick={() => setCsvOpen(true)}>Import CSV</Btn>}
            <Btn icon={Plus} onClick={() => { setEditPerson(null); setModalOpen(true); }}>Tambah {isGuru ? 'Guru' : 'Siswa'}</Btn>
          </div>
        </div>

        {/* Stats pills */}
        <div style={{ opacity: 0, animation: 'fadeUp .4s ease 60ms forwards', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {[
            { label: 'Guru', count: teachers.length, max: profile?.schools?.max_teachers, color: '#4F46E5', bg: '#EEF2FF', key: 'guru' },
            { label: 'Siswa', count: students.length, max: profile?.schools?.max_students, color: '#0891B2', bg: '#EFF6FF', key: 'siswa' },
          ].map(f => (
            <button key={f.key} onClick={() => setTab(f.key)}
              style={{ padding: '8px 18px', borderRadius: '999px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', border: tab === f.key ? `2px solid ${f.color}` : '2px solid transparent', background: tab === f.key ? f.bg : '#F8FAFC', color: tab === f.key ? f.color : '#64748B', transition: 'all .15s', display: 'flex', alignItems: 'center', gap: '7px' }}>
              {f.label}
              <span style={{ fontWeight: '700' }}>{f.count}</span>
              {f.max && <span style={{ opacity: .5, fontWeight: '400' }}>/ {f.max}</span>}
            </button>
          ))}
        </div>

        {error && <div style={{ padding: '14px 18px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '12px', color: '#DC2626', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}><AlertCircle size={14} />{error}</div>}

        {/* Table */}
        <div style={{ opacity: 0, animation: 'fadeUp .4s ease 120ms forwards', background: '#fff', borderRadius: '16px', border: '1px solid #F1F5F9', boxShadow: '0 1px 4px rgba(0,0,0,.03)', overflow: 'hidden' }}>

          {/* Toolbar */}
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #F8FAFC', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
              <Search size={13} style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
              <input type="text" placeholder={`Cari ${isGuru ? 'nama / email guru' : 'nama / email / NIS siswa'}...`} value={search} onChange={e => setSearch(e.target.value)}
                style={{ width: '100%', padding: '8px 12px 8px 32px', borderRadius: '9px', border: '1.5px solid #E2E8F0', background: '#F8FAFC', fontSize: '13px', color: '#0F172A', outline: 'none', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box', transition: 'border-color .15s' }}
                onFocus={e => { e.target.style.borderColor = '#4F46E5'; e.target.style.boxShadow = '0 0 0 3px rgba(79,70,229,.1)'; }}
                onBlur={e => { e.target.style.borderColor = '#E2E8F0'; e.target.style.boxShadow = 'none'; }} />
            </div>
            {!isGuru && classes.length > 0 && (
              <div style={{ position: 'relative' }}>
                <select value={filterClass} onChange={e => setFilterClass(e.target.value)}
                  style={{ padding: '8px 28px 8px 11px', borderRadius: '9px', border: '1.5px solid #E2E8F0', background: '#F8FAFC', fontSize: '13px', color: filterClass ? '#0F172A' : '#94A3B8', outline: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", appearance: 'none' }}>
                  <option value="">Semua Kelas</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <ChevronDown size={12} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
              </div>
            )}
            <span style={{ fontSize: '12px', color: '#94A3B8', marginLeft: 'auto' }}>{filtered.length} dari {list.length}</span>
          </div>

          {/* Table content */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: isGuru ? '560px' : '620px' }}>
              <thead>
                <tr style={{ background: '#FAFBFF', borderBottom: '1px solid #F1F5F9' }}>
                  {(isGuru
                    ? ['Nama Guru', 'Email', 'Telepon', 'Mapel', '']
                    : ['Nama Siswa', 'Email', 'NIS', 'Kelas', '']
                  ).map(h => <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.06em', whiteSpace: 'nowrap' }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {loading ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={5} style={{ padding: '13px 16px' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: '#F1F5F9', flexShrink: 0 }} />
                      {[140, 160, 80, 80].map((w, j) => <Shimmer key={j} w={`${w}px`} />)}
                    </div>
                  </td></tr>
                )) : filtered.length === 0 ? (
                  <tr><td colSpan={5} style={{ padding: '48px', textAlign: 'center' }}>
                    <div style={{ fontSize: '28px', marginBottom: '8px' }}>{isGuru ? '👨‍🏫' : '🎓'}</div>
                    <div style={{ fontSize: '14px', color: '#94A3B8' }}>Tidak ada {isGuru ? 'guru' : 'siswa'} ditemukan</div>
                  </td></tr>
                ) : filtered.map(p => {
                  const classObj = classes.find(c => c.id === p.class_id);
                  const subjectCount = Array.isArray(p.subject_ids) ? p.subject_ids.length : 0;
                  return (
                    <tr key={p.id} className="sm-row" style={{ borderBottom: '1px solid #F8FAFC', transition: 'background .1s' }} onClick={() => setDetailPerson(p)}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
                          <Avatar name={p.name} size={34} color={isGuru ? '#4F46E5' : '#0891B2'} bg={isGuru ? '#EEF2FF' : '#EFF6FF'} />
                          <span style={{ fontSize: '13px', fontWeight: '600', color: '#0F172A' }}>{p.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: '#64748B' }}>{p.email}</td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: '#64748B' }}>{isGuru ? (p.phone || '—') : (p.nis || '—')}</td>
                      <td style={{ padding: '12px 16px' }}>
                        {isGuru
                          ? <span style={{ fontSize: '12px', fontWeight: '600', color: subjectCount > 0 ? '#4F46E5' : '#94A3B8' }}>{subjectCount > 0 ? `${subjectCount} mapel` : '—'}</span>
                          : <span style={{ fontSize: '12px', fontWeight: '600', color: classObj ? '#7C3AED' : '#94A3B8' }}>{classObj?.name || '—'}</span>
                        }
                      </td>
                      <td style={{ padding: '12px 16px' }} onClick={e => e.stopPropagation()}>
                        <ActionMenu person={p} onView={setDetailPerson} onEdit={p => { setEditPerson(p); setModalOpen(true); }} onDelete={handleDelete} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {!loading && filtered.length > 0 && (
            <div style={{ padding: '10px 18px', borderTop: '1px solid #F8FAFC', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', color: '#94A3B8' }}>Menampilkan {filtered.length} dari {list.length} {isGuru ? 'guru' : 'siswa'}</span>
              <span style={{ fontSize: '11px', color: '#CBD5E1', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ color: '#4F46E5', fontSize: '10px' }}>⚡</span> Real-time dari Supabase
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <PersonModal open={modalOpen} person={editPerson} tab={tab} classes={classes} subjects={subjects} schoolId={profile?.school_id}
        onClose={() => { setModalOpen(false); setEditPerson(null); }}
        onSaved={() => { fetchData(); showToast(editPerson ? 'Data berhasil diperbarui' : `${isGuru ? 'Guru' : 'Siswa'} berhasil ditambahkan`); }} />

      <DetailDrawer person={detailPerson} classes={classes} subjects={subjects} tab={tab}
        onClose={() => setDetailPerson(null)}
        onEdit={p => { setDetailPerson(null); setEditPerson(p); setModalOpen(true); }}
        onDelete={p => { setDetailPerson(null); handleDelete(p); }} />

      <CsvImportModal open={csvOpen} classes={classes} schoolId={profile?.school_id} preselectedClass={csvPreselectedClass}
        onClose={() => { setCsvOpen(false); setCsvPreselectedClass(null); }}
        onImported={() => { fetchData(); showToast('Import berhasil!'); }} />

      <ConfirmDialog {...confirm} loading={actLoading} />
      {toast && <Toast {...toast} />}
    </>
  );
};

export default StaffManagement;