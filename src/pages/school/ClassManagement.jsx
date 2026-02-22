import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { getSchoolConfig, SCHOOL_TYPES, GRADE_META, JURUSAN_META } from '../../lib/schoolConfig';
import {
  School, Plus, Search, RefreshCw, Edit2, Trash2, X, Save,
  AlertCircle, CheckCircle2, Users, ChevronDown, MoreVertical,
  Eye, GraduationCap, UserCheck, BookOpen, Layers, Upload,
} from 'lucide-react';

// ── Constants ─────────────────────────────────────────────────────
const CURRENT_YEAR = `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`;
const YEAR_OPTIONS = Array.from({ length: 4 }, (_, i) => {
  const y = new Date().getFullYear() - 1 + i;
  return `${y}/${y + 1}`;
});

// ── Helpers ───────────────────────────────────────────────────────
const fmt     = (n) => (n ?? 0).toLocaleString('id-ID');
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

// ── Atoms ─────────────────────────────────────────────────────────
const JurusanBadge = ({ jurusan }) => {
  const m = JURUSAN_META[jurusan] || JURUSAN_META.Umum;
  return <span style={{ display: 'inline-flex', padding: '2px 9px', borderRadius: '999px', fontSize: '11px', fontWeight: '700', background: m.bg, color: m.color, border: `1px solid ${m.border}` }}>{jurusan}</span>;
};

const GradeBadge = ({ grade }) => {
  const m = GRADE_META[grade] || { bg: '#F8FAFC', color: '#64748B' };
  return <span style={{ display: 'inline-flex', padding: '2px 9px', borderRadius: '999px', fontSize: '11px', fontWeight: '700', background: m.bg, color: m.color }}>Kelas {grade}</span>;
};

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
      <select {...props} style={{ padding: '9px 32px 9px 12px', borderRadius: '9px', fontSize: '13px', color: '#0F172A', fontFamily: "'DM Sans', sans-serif", border: '1.5px solid #E2E8F0', background: '#F8FAFC', outline: 'none', width: '100%', appearance: 'none', cursor: 'pointer', transition: 'border-color .15s', ...props.style }}
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

const Avatar = ({ name, size = 32, color = '#4F46E5', bg = '#EEF2FF' }) => (
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

// ── Class Modal (Add / Edit) ──────────────────────────────────────
const ClassModal = ({ open, cls, teachers, schoolId, profile, onClose, onSaved }) => {
  const isEdit = !!cls?.id;
  const schoolType  = profile?.schools?.school_type || 'SMA';
  const schoolCfg   = getSchoolConfig(schoolType);
  const gradeList   = schoolCfg.grades;
  const jurusanList = schoolCfg.jurusan;
  const EMPTY  = { name: '', grade_level: '10', jurusan: 'Umum', academic_year: CURRENT_YEAR, max_students: 32, wali_kelas_id: '' };

  const [form,    setForm]    = useState(EMPTY);
  const [errors,  setErrors]  = useState({});
  const [saving,  setSaving]  = useState(false);
  const [saveErr, setSaveErr] = useState('');

  useEffect(() => {
    if (open) {
      setForm(cls ? {
        name:          cls.name || '',
        grade_level:   String(cls.grade_level || '10'),
        jurusan:       cls.jurusan || 'Umum',
        academic_year: cls.academic_year || CURRENT_YEAR,
        max_students:  cls.max_students || 32,
        wali_kelas_id: cls.wali_kelas_id || '',
      } : EMPTY);
      setErrors({}); setSaveErr('');
    }
  }, [open, cls]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Nama kelas wajib diisi';
    if (!form.grade_level)  e.grade_level = 'Tingkat kelas wajib dipilih';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true); setSaveErr('');
    try {
      const payload = {
        name:          form.name.trim(),
        grade_level:   parseInt(form.grade_level),
        jurusan:       form.jurusan,
        academic_year: form.academic_year,
        max_students:  parseInt(form.max_students) || 32,
        wali_kelas_id: form.wali_kelas_id || null,
        updated_at:    new Date().toISOString(),
      };
      const { error } = isEdit
        ? await supabase.from('classes').update(payload).eq('id', cls.id)
        : await supabase.from('classes').insert([{ ...payload, school_id: schoolId, created_at: new Date().toISOString() }]);
      if (error) throw error;
      onSaved(); onClose();
    } catch (err) {
      setSaveErr(err.message?.includes('duplicate') ? 'Nama kelas sudah ada di tahun ajaran ini.' : err.message);
    } finally { setSaving(false); }
  };

  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.6)', backdropFilter: 'blur(6px)', zIndex: 190, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 30px 80px rgba(0,0,0,.25)', animation: 'scaleIn .2s ease' }}>

        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <School size={16} style={{ color: '#4F46E5' }} />
            </div>
            <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: '16px', fontWeight: '700', color: '#0F172A', margin: 0 }}>
              {isEdit ? 'Edit Kelas' : 'Tambah Kelas Baru'}
            </h2>
          </div>
          <button onClick={onClose} style={{ width: '30px', height: '30px', borderRadius: '8px', border: '1px solid #F1F5F9', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#94A3B8' }}>
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>

          <Input label="Nama Kelas" required placeholder="Contoh: X MIPA 1 atau X-A" value={form.name} onChange={e => set('name', e.target.value)} error={errors.name} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <SelectField label="Tingkat" required value={form.grade_level} onChange={e => set('grade_level', e.target.value)} error={errors.grade_level}
              options={gradeList.map(g => ({ value: String(g), label: `Kelas ${g}` }))} />
            <SelectField label="Jurusan" value={form.jurusan} onChange={e => set('jurusan', e.target.value)}
              options={jurusanList.map(j => ({ value: j, label: j }))} />
            <SelectField label="Tahun Ajaran" value={form.academic_year} onChange={e => set('academic_year', e.target.value)}
              options={YEAR_OPTIONS.map(y => ({ value: y, label: y }))} />
            <Input label="Maks. Siswa" type="number" min="1" max="60" value={form.max_students} onChange={e => set('max_students', e.target.value)} />
          </div>

          <SelectField label="Wali Kelas" placeholder="— Pilih Wali Kelas —" value={form.wali_kelas_id} onChange={e => set('wali_kelas_id', e.target.value)}
            options={teachers.map(t => ({ value: t.id, label: t.name }))} />

          {saveErr && (
            <div style={{ padding: '11px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '9px', color: '#DC2626', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={14} />{saveErr}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'flex-end', gap: '10px', flexShrink: 0 }}>
          <Btn variant="secondary" onClick={onClose} disabled={saving}>Batal</Btn>
          <Btn icon={Save} loading={saving} onClick={handleSave}>{isEdit ? 'Simpan' : 'Tambah Kelas'}</Btn>
        </div>
      </div>
    </div>
  );
};

// ── Detail Drawer ─────────────────────────────────────────────────
const DetailDrawer = ({ cls, students, teachers, allStudents, onClose, onEdit, onDelete, onBulkAssign, onImport }) => {
  if (!cls) return null;
  const wali = teachers.find(t => t.id === cls.wali_kelas_id);
  const classStudents = students.filter(s => s.class_id === cls.id);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.5)', backdropFilter: 'blur(4px)', zIndex: 180, display: 'flex', justifyContent: 'flex-end' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ width: '100%', maxWidth: '400px', height: '100%', background: '#fff', boxShadow: '-20px 0 60px rgba(0,0,0,.15)', display: 'flex', flexDirection: 'column', animation: 'slideInRight .25s cubic-bezier(.16,1,.3,1)' }}>

        {/* Header */}
        <div style={{ padding: '22px', borderBottom: '1px solid #F1F5F9', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '13px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: GRADE_META[cls.grade_level]?.bg || '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <School size={22} style={{ color: GRADE_META[cls.grade_level]?.color || '#4F46E5' }} />
              </div>
              <div>
                <h3 style={{ fontFamily: 'Sora, sans-serif', fontSize: '16px', fontWeight: '700', color: '#0F172A', margin: '0 0 5px' }}>{cls.name}</h3>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <GradeBadge grade={cls.grade_level} />
                  {cls.jurusan && <JurusanBadge jurusan={cls.jurusan} />}
                </div>
              </div>
            </div>
            <button onClick={onClose} style={{ width: '30px', height: '30px', borderRadius: '8px', border: '1px solid #F1F5F9', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#94A3B8', flexShrink: 0 }}>
              <X size={14} />
            </button>
          </div>
          <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' }}>
            <Btn variant="secondary" icon={Edit2} onClick={() => onEdit(cls)} style={{ flex: 1 }}>Edit</Btn>
            <Btn variant="secondary" icon={Users} onClick={() => onBulkAssign(cls)} style={{ flex: 1 }}>Assign</Btn>
            <Btn variant="secondary" icon={Upload} onClick={() => onImport(cls)} style={{ flex: 1 }}>Import CSV</Btn>
            <Btn variant="danger" icon={Trash2} onClick={() => onDelete(cls)} sm style={{ flexShrink: 0 }}>Hapus</Btn>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: '18px' }}>

          {/* Info */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '10px' }}>Informasi Kelas</div>
            {[
              { label: 'Tahun Ajaran', value: cls.academic_year || '—' },
              { label: 'Kapasitas',    value: `${classStudents.length} / ${cls.max_students || '—'} siswa` },
              { label: 'Dibuat',       value: fmtDate(cls.created_at) },
            ].map((row, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #F8FAFC' }}>
                <span style={{ fontSize: '12px', color: '#94A3B8' }}>{row.label}</span>
                <span style={{ fontSize: '13px', color: '#0F172A', fontWeight: '500' }}>{row.value}</span>
              </div>
            ))}
          </div>

          {/* Capacity bar */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '12px', color: '#64748B' }}>Kapasitas terisi</span>
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#0F172A' }}>{Math.round((classStudents.length / (cls.max_students || 1)) * 100)}%</span>
            </div>
            <div style={{ height: '6px', borderRadius: '99px', background: '#F1F5F9', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: '99px', background: classStudents.length / cls.max_students > 0.9 ? '#EF4444' : classStudents.length / cls.max_students > 0.7 ? '#D97706' : '#4F46E5', width: `${Math.min(100, (classStudents.length / (cls.max_students || 1)) * 100)}%`, transition: 'width .8s ease' }} />
            </div>
          </div>

          {/* Wali kelas */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '10px' }}>Wali Kelas</div>
            {wali ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: '#F8FAFC', borderRadius: '10px' }}>
                <Avatar name={wali.name} size={36} />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#0F172A' }}>{wali.name}</div>
                  <div style={{ fontSize: '11px', color: '#94A3B8' }}>{wali.email}</div>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '13px', color: '#CBD5E1', fontStyle: 'italic' }}>Belum ada wali kelas</div>
            )}
          </div>

          {/* Daftar siswa */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '10px' }}>
              Daftar Siswa ({classStudents.length})
            </div>
            {classStudents.length === 0
              ? <div style={{ fontSize: '13px', color: '#CBD5E1', fontStyle: 'italic' }}>Belum ada siswa di kelas ini</div>
              : classStudents.map((s, i) => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: i < classStudents.length - 1 ? '1px solid #F8FAFC' : 'none' }}>
                  <Avatar name={s.name} size={30} color="#0891B2" bg="#EFF6FF" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                    {s.nis && <div style={{ fontSize: '11px', color: '#94A3B8' }}>NIS: {s.nis}</div>}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Bulk Assign Modal ─────────────────────────────────────────────
const BulkAssignModal = ({ open, cls, allStudents, onClose, onSaved }) => {
  const [search,    setSearch]    = useState('');
  const [selected,  setSelected]  = useState([]);
  const [saving,    setSaving]    = useState(false);
  const [saveErr,   setSaveErr]   = useState('');

  // Unassigned students + students already in this class
  const currentIds = allStudents.filter(s => s.class_id === cls?.id).map(s => s.id);
  const unassigned  = allStudents.filter(s => !s.class_id || s.class_id === cls?.id);

  useEffect(() => {
    if (open) { setSelected(currentIds); setSearch(''); setSaveErr(''); }
  }, [open, cls?.id]);

  const filtered = unassigned.filter(s => {
    const q = search.toLowerCase();
    return !q || s.name?.toLowerCase().includes(q) || s.nis?.toLowerCase()?.includes(q) || s.email?.toLowerCase().includes(q);
  });

  const toggle = (id) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleAll = () => {
    const filteredIds = filtered.map(s => s.id);
    const allSelected = filteredIds.every(id => selected.includes(id));
    setSelected(prev => allSelected ? prev.filter(id => !filteredIds.includes(id)) : [...new Set([...prev, ...filteredIds])]);
  };

  const handleSave = async () => {
    if (!cls) return;
    setSaving(true); setSaveErr('');
    try {
      // Remove students who were unselected
      const toRemove = currentIds.filter(id => !selected.includes(id));
      if (toRemove.length) {
        const { error } = await supabase.from('profiles').update({ class_id: null, updated_at: new Date().toISOString() }).in('id', toRemove);
        if (error) throw error;
      }
      // Add newly selected students
      const toAdd = selected.filter(id => !currentIds.includes(id));
      if (toAdd.length) {
        const { error } = await supabase.from('profiles').update({ class_id: cls.id, updated_at: new Date().toISOString() }).in('id', toAdd);
        if (error) throw error;
      }
      onSaved(); onClose();
    } catch (err) { setSaveErr(err.message); }
    finally { setSaving(false); }
  };

  if (!open || !cls) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.6)', backdropFilter: 'blur(6px)', zIndex: 190, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '540px', maxHeight: '88vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 30px 80px rgba(0,0,0,.25)', animation: 'scaleIn .2s ease' }}>

        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #F1F5F9', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: '16px', fontWeight: '700', color: '#0F172A', margin: 0 }}>Assign Siswa ke Kelas</h2>
            <button onClick={onClose} style={{ width: '30px', height: '30px', borderRadius: '8px', border: '1px solid #F1F5F9', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#94A3B8' }}>
              <X size={14} />
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <span style={{ fontSize: '13px', color: '#64748B' }}>Kelas:</span>
            <span style={{ fontSize: '13px', fontWeight: '700', color: '#4F46E5' }}>{cls.name}</span>
            <GradeBadge grade={cls.grade_level} />
            {cls.jurusan && <JurusanBadge jurusan={cls.jurusan} />}
          </div>
        </div>

        {/* Search + select all */}
        <div style={{ padding: '14px 24px', borderBottom: '1px solid #F8FAFC', flexShrink: 0, display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={13} style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
            <input type="text" placeholder="Cari nama / NIS / email..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', padding: '8px 12px 8px 32px', borderRadius: '9px', border: '1.5px solid #E2E8F0', background: '#F8FAFC', fontSize: '13px', color: '#0F172A', outline: 'none', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box', transition: 'border-color .15s' }}
              onFocus={e => { e.target.style.borderColor = '#4F46E5'; e.target.style.boxShadow = '0 0 0 3px rgba(79,70,229,.1)'; }}
              onBlur={e => { e.target.style.borderColor = '#E2E8F0'; e.target.style.boxShadow = 'none'; }} />
          </div>
          <button onClick={toggleAll} style={{ fontSize: '12px', fontWeight: '600', color: '#4F46E5', background: '#EEF2FF', border: 'none', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            {filtered.every(s => selected.includes(s.id)) ? 'Batal semua' : 'Pilih semua'}
          </button>
        </div>

        {/* Info bar */}
        <div style={{ padding: '8px 24px', background: '#FAFBFF', borderBottom: '1px solid #F8FAFC', flexShrink: 0, display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '12px', color: '#64748B' }}>{filtered.length} siswa tersedia</span>
          <span style={{ fontSize: '12px', fontWeight: '600', color: '#4F46E5' }}>{selected.length} dipilih</span>
        </div>

        {/* Student list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 24px' }}>
          {filtered.length === 0
            ? <div style={{ padding: '32px 0', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>🎓</div>
                <div style={{ fontSize: '13px', color: '#94A3B8' }}>Tidak ada siswa yang bisa di-assign</div>
              </div>
            : filtered.map((s, i) => {
              const isSelected = selected.includes(s.id);
              const isCurrentMember = currentIds.includes(s.id);
              return (
                <div key={s.id} onClick={() => toggle(s.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: i < filtered.length - 1 ? '1px solid #F8FAFC' : 'none', cursor: 'pointer', transition: 'opacity .1s' }}>
                  {/* Checkbox */}
                  <div style={{ width: '20px', height: '20px', borderRadius: '6px', border: `2px solid ${isSelected ? '#4F46E5' : '#E2E8F0'}`, background: isSelected ? '#4F46E5' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .15s' }}>
                    {isSelected && <CheckCircle2 size={12} style={{ color: '#fff' }} />}
                  </div>
                  <Avatar name={s.name} size={32} color="#0891B2" bg="#EFF6FF" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                    <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                      {s.nis && `NIS: ${s.nis} · `}{s.email}
                    </div>
                  </div>
                  {isCurrentMember && (
                    <span style={{ fontSize: '10px', fontWeight: '700', color: '#16A34A', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '999px', padding: '2px 7px', flexShrink: 0 }}>Di sini</span>
                  )}
                </div>
              );
            })}
        </div>

        {saveErr && <div style={{ padding: '10px 24px', background: '#FEF2F2', color: '#DC2626', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}><AlertCircle size={13} />{saveErr}</div>}

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'flex-end', gap: '10px', flexShrink: 0 }}>
          <Btn variant="secondary" onClick={onClose} disabled={saving}>Batal</Btn>
          <Btn icon={UserCheck} loading={saving} onClick={handleSave}>Simpan ({selected.length} siswa)</Btn>
        </div>
      </div>
    </div>
  );
};

// ── Action Dropdown ───────────────────────────────────────────────
const ActionMenu = ({ cls, onView, onEdit, onAssign, onImport, onDelete }) => {
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
        <div style={{ position: 'absolute', right: 0, top: '34px', background: '#fff', borderRadius: '12px', border: '1px solid #F1F5F9', boxShadow: '0 8px 30px rgba(0,0,0,.12)', zIndex: 51, minWidth: '160px', padding: '4px' }}>
          {[{ icon: Eye,      label: 'Detail',         action: () => { onView(cls);    setOpen(false); }, color: '#374151' },
            { icon: Edit2,    label: 'Edit',           action: () => { onEdit(cls);    setOpen(false); }, color: '#374151' },
            { icon: Users,    label: 'Assign Siswa',   action: () => { onAssign(cls);  setOpen(false); }, color: '#0891B2' },
            { icon: Upload,   label: 'Import CSV',     action: () => { onImport(cls);  setOpen(false); }, color: '#7C3AED' },
            { icon: Trash2,   label: 'Hapus',          action: () => { onDelete(cls);  setOpen(false); }, color: '#DC2626' }]
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
const ClassManagement = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [classes,   setClasses]   = useState([]);
  const [teachers,  setTeachers]  = useState([]);
  const [students,  setStudents]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [refreshing,setRefreshing]= useState(false);
  const [error,     setError]     = useState(null);

  const [search,       setSearch]       = useState('');
  const [filterGrade,  setFilterGrade]  = useState('all');
  const [filterJurusan,setFilterJurusan]= useState('all');
  const [filterYear,   setFilterYear]   = useState('all');

  const [modalOpen,    setModalOpen]    = useState(false);
  const [editClass,    setEditClass]    = useState(null);
  const [detailClass,  setDetailClass]  = useState(null);
  const [assignClass,  setAssignClass]  = useState(null);
  const [confirm,      setConfirm]      = useState({ open: false });
  const [actLoading,   setActLoading]   = useState(false);
  const [toast,        setToast]        = useState(null);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const fetchData = useCallback(async () => {
    if (!profile?.school_id) { setLoading(false); return; }
    const sid = profile.school_id;
    try {
      const [clsRes, teachRes, studRes] = await Promise.all([
        supabase.from('classes').select('*').eq('school_id', sid).order('grade_level').order('name'),
        supabase.from('profiles').select('id, name, email').eq('school_id', sid).eq('role', 'teacher').order('name'),
        supabase.from('profiles').select('id, name, email, nis, class_id').eq('school_id', sid).eq('role', 'student').order('name'),
      ]);
      if (clsRes.error) throw clsRes.error;
      setClasses(clsRes.data || []);
      setTeachers(teachRes.data || []);
      setStudents(studRes.data || []);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, [profile?.school_id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleBulkImport = (cls) => {
    navigate('/school/staff', {
      state: { openCsvImport: true, importClass: cls }
    });
  };

  const handleDelete = (cls) => {
    setConfirm({
      open: true,
      title: 'Hapus Kelas',
      message: `Hapus "${cls.name}"? Siswa di kelas ini akan menjadi tidak berkelas, namun tidak dihapus.`,
      onConfirm: async () => {
        setActLoading(true);
        // Unassign all students first
        await supabase.from('profiles').update({ class_id: null }).eq('class_id', cls.id);
        const { error } = await supabase.from('classes').delete().eq('id', cls.id);
        if (error) showToast(error.message, 'error');
        else { showToast(`${cls.name} berhasil dihapus`); fetchData(); if (detailClass?.id === cls.id) setDetailClass(null); }
        setActLoading(false); setConfirm({ open: false });
      },
      onCancel: () => setConfirm({ open: false }),
    });
  };

  const jurusanInUse  = [...new Set(classes.map(c => c.jurusan).filter(Boolean))];
  const yearsInUse    = [...new Set(classes.map(c => c.academic_year).filter(Boolean))];

  const filtered = classes.filter(c => {
    const q = search.toLowerCase();
    const matchSearch   = !q || c.name.toLowerCase().includes(q);
    const matchGrade    = filterGrade === 'all' || c.grade_level === parseInt(filterGrade);
    const matchJurusan  = filterJurusan === 'all' || c.jurusan === filterJurusan;
    const matchYear     = filterYear === 'all' || c.academic_year === filterYear;
    return matchSearch && matchGrade && matchJurusan && matchYear;
  });

  // Group by grade for display stats
  const schoolType = profile?.schools?.school_type || 'SMA';
  const schoolCfg  = getSchoolConfig(schoolType);
  const gradeList  = schoolCfg.grades;

  const byGrade = gradeList.reduce((acc, g) => {
    acc[g] = classes.filter(c => c.grade_level === g).length;
    return acc;
  }, {});

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
        .cls-row:hover { background: #FAFBFF !important; cursor: pointer; }
      `}</style>

      <div style={{ fontFamily: "'DM Sans', sans-serif", display: 'flex', flexDirection: 'column', gap: '22px' }}>

        {/* Header */}
        <div style={{ opacity: 0, animation: 'fadeUp .4s ease forwards', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <School size={15} style={{ color: '#4F46E5' }} />
              </div>
              <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: '22px', fontWeight: '700', color: '#0F172A', margin: 0 }}>Manajemen Kelas</h1>
            </div>
            <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>Kelola kelas, wali kelas, dan penugasan siswa</p>
          </div>
          <div style={{ display: 'flex', gap: '9px' }}>
            <Btn variant="secondary" icon={RefreshCw} loading={refreshing} onClick={() => { setRefreshing(true); fetchData(); }}>Refresh</Btn>
            <Btn icon={Plus} onClick={() => { setEditClass(null); setModalOpen(true); }}>Tambah Kelas</Btn>
          </div>
        </div>

        {/* Grade summary cards */}
        <div style={{ opacity: 0, animation: 'fadeUp .4s ease 60ms forwards', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
          {[
            { label: 'Total Kelas',  value: classes.length, color: '#4F46E5', bg: '#EEF2FF', icon: Layers },
            ...gradeList.map((g, i) => {
              const colors = [['#4F46E5','#EEF2FF'],['#0891B2','#EFF6FF'],['#9333EA','#F5F3FF']];
              const [color, bg] = colors[i % colors.length];
              return { label: `Kelas ${g}`, value: byGrade[g] || 0, color, bg, icon: School };
            }),
            { label: 'Total Siswa',  value: students.filter(s => s.class_id).length, color: '#16A34A', bg: '#F0FDF4', icon: GraduationCap },
          ].map(card => (
            <div key={card.label} style={{ background: '#fff', borderRadius: '14px', border: '1px solid #F1F5F9', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 1px 4px rgba(0,0,0,.03)' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <card.icon size={16} style={{ color: card.color }} />
              </div>
              <div>
                <div style={{ fontSize: '22px', fontWeight: '700', color: '#0F172A', fontFamily: 'Sora, sans-serif', lineHeight: 1 }}>{loading ? '—' : card.value}</div>
                <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '3px' }}>{card.label}</div>
              </div>
            </div>
          ))}
        </div>

        {error && <div style={{ padding: '14px 18px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '12px', color: '#DC2626', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}><AlertCircle size={14} />{error}</div>}

        {/* Table card */}
        <div style={{ opacity: 0, animation: 'fadeUp .4s ease 140ms forwards', background: '#fff', borderRadius: '16px', border: '1px solid #F1F5F9', boxShadow: '0 1px 4px rgba(0,0,0,.03)', overflow: 'hidden' }}>

          {/* Toolbar */}
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #F8FAFC', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '160px' }}>
              <Search size={13} style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
              <input type="text" placeholder="Cari nama kelas..." value={search} onChange={e => setSearch(e.target.value)}
                style={{ width: '100%', padding: '8px 12px 8px 32px', borderRadius: '9px', border: '1.5px solid #E2E8F0', background: '#F8FAFC', fontSize: '13px', color: '#0F172A', outline: 'none', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box', transition: 'border-color .15s' }}
                onFocus={e => { e.target.style.borderColor = '#4F46E5'; e.target.style.boxShadow = '0 0 0 3px rgba(79,70,229,.1)'; }}
                onBlur={e => { e.target.style.borderColor = '#E2E8F0'; e.target.style.boxShadow = 'none'; }} />
            </div>
            {[
              { value: filterGrade, set: setFilterGrade, placeholder: 'Semua Tingkat', options: gradeList.map(g => ({ value: String(g), label: `Kelas ${g}` })) },
              ...(jurusanInUse.length > 1 ? [{ value: filterJurusan, set: setFilterJurusan, placeholder: 'Semua Jurusan', options: jurusanInUse.map(j => ({ value: j, label: j })) }] : []),
              ...(yearsInUse.length > 1 ? [{ value: filterYear, set: setFilterYear, placeholder: 'Semua Tahun', options: yearsInUse.map(y => ({ value: y, label: y })) }] : []),
            ].map((f, i) => (
              <div key={i} style={{ position: 'relative' }}>
                <select value={f.value} onChange={e => f.set(e.target.value)}
                  style={{ padding: '8px 28px 8px 11px', borderRadius: '9px', border: '1.5px solid #E2E8F0', background: '#F8FAFC', fontSize: '13px', color: f.value !== 'all' ? '#0F172A' : '#94A3B8', outline: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", appearance: 'none' }}>
                  <option value="all">{f.placeholder}</option>
                  {f.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <ChevronDown size={12} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
              </div>
            ))}
            <span style={{ fontSize: '12px', color: '#94A3B8', marginLeft: 'auto' }}>{filtered.length} kelas</span>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
              <thead>
                <tr style={{ background: '#FAFBFF', borderBottom: '1px solid #F1F5F9' }}>
                  {['Nama Kelas', 'Tingkat', 'Jurusan', 'Wali Kelas', 'Siswa', 'Tahun Ajaran', ''].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.06em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={7} style={{ padding: '13px 16px' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: '#F1F5F9', flexShrink: 0 }} />
                      {[120, 70, 70, 100, 50, 80].map((w, j) => <Shimmer key={j} w={`${w}px`} />)}
                    </div>
                  </td></tr>
                )) : filtered.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding: '48px', textAlign: 'center' }}>
                    <div style={{ fontSize: '28px', marginBottom: '8px' }}>🏫</div>
                    <div style={{ fontSize: '14px', color: '#94A3B8' }}>Tidak ada kelas ditemukan</div>
                    {!search && <Btn icon={Plus} onClick={() => setModalOpen(true)} style={{ marginTop: '14px' }}>Tambah Kelas Pertama</Btn>}
                  </td></tr>
                ) : filtered.map(c => {
                  const wali         = teachers.find(t => t.id === c.wali_kelas_id);
                  const studentCount = students.filter(s => s.class_id === c.id).length;
                  const capPct       = c.max_students ? (studentCount / c.max_students) * 100 : 0;
                  return (
                    <tr key={c.id} className="cls-row" style={{ borderBottom: '1px solid #F8FAFC', transition: 'background .1s' }} onClick={() => setDetailClass(c)}>
                      <td style={{ padding: '13px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
                          <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: GRADE_META[c.grade_level]?.bg || '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <School size={15} style={{ color: GRADE_META[c.grade_level]?.color || '#94A3B8' }} />
                          </div>
                          <span style={{ fontSize: '13px', fontWeight: '700', color: '#0F172A' }}>{c.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '13px 16px' }}><GradeBadge grade={c.grade_level} /></td>
                      <td style={{ padding: '13px 16px' }}><JurusanBadge jurusan={c.jurusan || 'Umum'} /></td>
                      <td style={{ padding: '13px 16px' }}>
                        {wali ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                            <Avatar name={wali.name} size={26} />
                            <span style={{ fontSize: '12px', fontWeight: '600', color: '#374151' }}>{wali.name}</span>
                          </div>
                        ) : <span style={{ fontSize: '12px', color: '#CBD5E1' }}>—</span>}
                      </td>
                      <td style={{ padding: '13px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '13px', fontWeight: '600', color: '#0F172A' }}>{studentCount}</span>
                          <span style={{ fontSize: '11px', color: '#94A3B8' }}>/{c.max_students}</span>
                          <div style={{ width: '32px', height: '4px', borderRadius: '99px', background: '#F1F5F9', overflow: 'hidden' }}>
                            <div style={{ height: '100%', borderRadius: '99px', background: capPct > 90 ? '#EF4444' : capPct > 70 ? '#D97706' : '#4F46E5', width: `${Math.min(100, capPct)}%` }} />
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '13px 16px', fontSize: '12px', color: '#64748B' }}>{c.academic_year || '—'}</td>
                      <td style={{ padding: '13px 16px' }} onClick={e => e.stopPropagation()}>
                        <ActionMenu cls={c}
                          onView={setDetailClass}
                          onEdit={c => { setEditClass(c); setModalOpen(true); }}
                          onAssign={setAssignClass}
                          onImport={handleBulkImport}
                          onDelete={handleDelete} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {!loading && filtered.length > 0 && (
            <div style={{ padding: '10px 18px', borderTop: '1px solid #F8FAFC', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', color: '#94A3B8' }}>Menampilkan {filtered.length} dari {classes.length} kelas</span>
              <span style={{ fontSize: '11px', color: '#CBD5E1', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ color: '#4F46E5', fontSize: '10px' }}>⚡</span> Real-time dari Supabase
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <ClassModal open={modalOpen} cls={editClass} teachers={teachers} schoolId={profile?.school_id} profile={profile}
        onClose={() => { setModalOpen(false); setEditClass(null); }}
        onSaved={() => { fetchData(); showToast(editClass ? 'Kelas berhasil diperbarui' : 'Kelas berhasil ditambahkan'); }} />

      <DetailDrawer cls={detailClass} students={students} teachers={teachers} allStudents={students}
        onClose={() => setDetailClass(null)}
        onEdit={c => { setDetailClass(null); setEditClass(c); setModalOpen(true); }}
        onDelete={c => { setDetailClass(null); handleDelete(c); }}
        onBulkAssign={c => { setDetailClass(null); setAssignClass(c); }}
        onImport={c => { setDetailClass(null); handleBulkImport(c); }} />

      <BulkAssignModal open={!!assignClass} cls={assignClass} allStudents={students}
        onClose={() => setAssignClass(null)}
        onSaved={() => { fetchData(); showToast('Penugasan siswa berhasil disimpan'); }} />

      <ConfirmDialog {...confirm} loading={actLoading} />
      {toast && <Toast {...toast} />}
    </>
  );
};

export default ClassManagement;