import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { getSchoolConfig, GRADE_META, JURUSAN_META } from '../../lib/schoolConfig';
import {
  BookOpen, Plus, Search, RefreshCw, Edit2, Trash2, X, Save,
  AlertCircle, CheckCircle2, Users, GraduationCap, ChevronDown,
  MoreVertical, Eye, Tag, Layers,
} from 'lucide-react';

// ── Constants loaded from schoolConfig.js ────────────────────────

const fmt = (n) => (n ?? 0).toLocaleString('id-ID');

// ── Atoms ─────────────────────────────────────────────────────────
const JurusanBadge = ({ jurusan }) => {
  const m = JURUSAN_META[jurusan] || JURUSAN_META.Umum;
  return <span style={{ display: 'inline-flex', padding: '2px 9px', borderRadius: '999px', fontSize: '11px', fontWeight: '700', background: m.bg, color: m.color, border: `1px solid ${m.border}` }}>{jurusan}</span>;
};

const GradeBadge = ({ grade }) => {
  const m = GRADE_META[grade] || { bg: '#F8FAFC', color: '#64748B' };
  return <span style={{ display: 'inline-flex', padding: '2px 9px', borderRadius: '999px', fontSize: '11px', fontWeight: '700', background: m.bg, color: m.color }}>Kelas {grade}</span>;
};

const Input = ({ label, required, error, ...props }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
    {label && <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151' }}>{label}{required && <span style={{ color: '#EF4444', marginLeft: '2px' }}>*</span>}</label>}
    <input {...props} style={{ padding: '9px 12px', borderRadius: '9px', fontSize: '13px', color: '#0F172A', fontFamily: "'DM Sans', sans-serif", border: `1.5px solid ${error ? '#FCA5A5' : '#E2E8F0'}`, background: error ? '#FFF5F5' : '#F8FAFC', outline: 'none', width: '100%', boxSizing: 'border-box', transition: 'border-color .15s, box-shadow .15s', ...props.style }}
      onFocus={e => { e.target.style.borderColor = '#4F46E5'; e.target.style.boxShadow = '0 0 0 3px rgba(79,70,229,.1)'; e.target.style.background = '#fff'; }}
      onBlur={e => { e.target.style.borderColor = error ? '#FCA5A5' : '#E2E8F0'; e.target.style.boxShadow = 'none'; e.target.style.background = error ? '#FFF5F5' : '#F8FAFC'; }} />
    {error && <span style={{ fontSize: '11px', color: '#EF4444' }}>{error}</span>}
  </div>
);

const Textarea = ({ label, ...props }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
    {label && <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151' }}>{label}</label>}
    <textarea {...props} rows={3} style={{ padding: '9px 12px', borderRadius: '9px', fontSize: '13px', color: '#0F172A', fontFamily: "'DM Sans', sans-serif", border: '1.5px solid #E2E8F0', background: '#F8FAFC', outline: 'none', width: '100%', boxSizing: 'border-box', resize: 'vertical', transition: 'border-color .15s', ...props.style }}
      onFocus={e => { e.target.style.borderColor = '#4F46E5'; e.target.style.boxShadow = '0 0 0 3px rgba(79,70,229,.1)'; e.target.style.background = '#fff'; }}
      onBlur={e => { e.target.style.borderColor = '#E2E8F0'; e.target.style.boxShadow = 'none'; e.target.style.background = '#F8FAFC'; }} />
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

// ── Detail Drawer ─────────────────────────────────────────────────
const DetailDrawer = ({ subject, teachers, classes, onClose, onEdit, onDelete }) => {
  if (!subject) return null;

  const assignedTeachers = teachers.filter(t =>
    subject.subject_teachers?.some(st => st.teacher_id === t.id)
  );
  const assignedClasses = classes.filter(c =>
    subject.subject_classes?.some(sc => sc.class_id === c.id)
  );

  // Group classes by grade
  const _grades = [7,8,9,10,11,12]; // all possible grades for drawer
  const byGrade = _grades.reduce((acc, g) => {
    const list = assignedClasses.filter(c => c.grade_level === g);
    if (list.length) acc[g] = list;
    return acc;
  }, {});

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.5)', backdropFilter: 'blur(4px)', zIndex: 180, display: 'flex', justifyContent: 'flex-end' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ width: '100%', maxWidth: '400px', height: '100%', background: '#fff', boxShadow: '-20px 0 60px rgba(0,0,0,.15)', display: 'flex', flexDirection: 'column', animation: 'slideInRight .25s cubic-bezier(.16,1,.3,1)' }}>

        {/* Header */}
        <div style={{ padding: '22px', borderBottom: '1px solid #F1F5F9', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '13px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BookOpen size={22} style={{ color: '#4F46E5' }} />
              </div>
              <div>
                <h3 style={{ fontFamily: 'Sora, sans-serif', fontSize: '16px', fontWeight: '700', color: '#0F172A', margin: '0 0 4px' }}>{subject.name}</h3>
                <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: '600', letterSpacing: '.05em' }}>{subject.code || '—'}</span>
              </div>
            </div>
            <button onClick={onClose} style={{ width: '30px', height: '30px', borderRadius: '8px', border: '1px solid #F1F5F9', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#94A3B8', flexShrink: 0 }}>
              <X size={14} />
            </button>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Btn variant="secondary" icon={Edit2} onClick={() => onEdit(subject)} style={{ flex: 1 }}>Edit</Btn>
            <Btn variant="danger" icon={Trash2} onClick={() => onDelete(subject)} style={{ flex: 1 }}>Hapus</Btn>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Info */}
          {subject.description && (
            <div style={{ padding: '12px 14px', background: '#F8FAFC', borderRadius: '10px', fontSize: '13px', color: '#475569', lineHeight: 1.6 }}>
              {subject.description}
            </div>
          )}

          {/* Stat pills */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1, padding: '12px', background: '#EEF2FF', borderRadius: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '22px', fontWeight: '700', color: '#4F46E5', fontFamily: 'Sora, sans-serif' }}>{assignedTeachers.length}</div>
              <div style={{ fontSize: '11px', color: '#6366F1', fontWeight: '600', marginTop: '2px' }}>Guru</div>
            </div>
            <div style={{ flex: 1, padding: '12px', background: '#EFF6FF', borderRadius: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '22px', fontWeight: '700', color: '#0891B2', fontFamily: 'Sora, sans-serif' }}>{assignedClasses.length}</div>
              <div style={{ fontSize: '11px', color: '#0891B2', fontWeight: '600', marginTop: '2px' }}>Kelas</div>
            </div>
          </div>

          {/* Guru */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '10px' }}>
              Guru Pengampu ({assignedTeachers.length})
            </div>
            {assignedTeachers.length === 0
              ? <div style={{ fontSize: '13px', color: '#CBD5E1', fontStyle: 'italic' }}>Belum ada guru yang ditugaskan</div>
              : assignedTeachers.map((t, i) => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 0', borderBottom: i < assignedTeachers.length - 1 ? '1px solid #F8FAFC' : 'none' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Sora, sans-serif', fontWeight: '700', fontSize: '13px', color: '#4F46E5', flexShrink: 0 }}>
                    {t.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#0F172A' }}>{t.name}</div>
                    <div style={{ fontSize: '11px', color: '#94A3B8' }}>{t.email}</div>
                  </div>
                </div>
              ))}
          </div>

          {/* Kelas per grade */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '10px' }}>
              Kelas yang Diajar ({assignedClasses.length})
            </div>
            {assignedClasses.length === 0
              ? <div style={{ fontSize: '13px', color: '#CBD5E1', fontStyle: 'italic' }}>Belum ada kelas yang ditugaskan</div>
              : Object.entries(byGrade).map(([grade, classList]) => (
                <div key={grade} style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '7px' }}>
                    <GradeBadge grade={parseInt(grade)} />
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', paddingLeft: '4px' }}>
                    {classList.map(c => (
                      <span key={c.id} style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: '600', background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#374151', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        {c.name}
                        {c.jurusan && c.jurusan !== 'Umum' && <JurusanBadge jurusan={c.jurusan} />}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Subject Modal (Add / Edit) ────────────────────────────────────
const SubjectModal = ({ open, subject, teachers, classes, schoolId, profile, onClose, onSaved }) => {
  const isEdit = !!subject?.id;
  const EMPTY  = { name: '', code: '', description: '', teacherIds: [], classIds: [] };

  const [form,    setForm]    = useState(EMPTY);
  const [errors,  setErrors]  = useState({});
  const [saving,  setSaving]  = useState(false);
  const [saveErr, setSaveErr] = useState('');

  // Group classes by grade+jurusan for display
  const schoolCfg = getSchoolConfig(profile?.schools?.school_type || 'SMA');
  const gradeList = schoolCfg.grades;
  const classesByGrade = gradeList.reduce((acc, g) => {
    const list = classes.filter(c => c.grade_level === g);
    if (list.length) acc[g] = list;
    return acc;
  }, {});

  useEffect(() => {
    if (open) {
      setForm(subject ? {
        name:        subject.name || '',
        code:        subject.code || '',
        description: subject.description || '',
        teacherIds:  subject.subject_teachers?.map(st => st.teacher_id) || [],
        classIds:    subject.subject_classes?.map(sc => sc.class_id) || [],
      } : EMPTY);
      setErrors({}); setSaveErr('');
    }
  }, [open, subject]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleItem = (key, id) => setForm(f => ({
    ...f,
    [key]: f[key].includes(id) ? f[key].filter(x => x !== id) : [...f[key], id],
  }));

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Nama mapel wajib diisi';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true); setSaveErr('');
    try {
      let subjectId = subject?.id;

      // Upsert subject
      if (isEdit) {
        const { error } = await supabase.from('subjects').update({
          name:        form.name.trim(),
          code:        form.code.trim() || null,
          description: form.description.trim() || null,
          updated_at:  new Date().toISOString(),
        }).eq('id', subjectId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('subjects').insert([{
          name:        form.name.trim(),
          code:        form.code.trim() || null,
          description: form.description.trim() || null,
          school_id:   schoolId,
          created_at:  new Date().toISOString(),
          updated_at:  new Date().toISOString(),
        }]).select('id').single();
        if (error) throw error;
        subjectId = data.id;
      }

      // Sync subject_teachers — delete all then re-insert
      await supabase.from('subject_teachers').delete().eq('subject_id', subjectId);
      if (form.teacherIds.length) {
        const { error } = await supabase.from('subject_teachers').insert(
          form.teacherIds.map(tid => ({ subject_id: subjectId, teacher_id: tid, school_id: schoolId }))
        );
        if (error) throw error;
      }

      // Sync subject_classes
      await supabase.from('subject_classes').delete().eq('subject_id', subjectId);
      if (form.classIds.length) {
        const { error } = await supabase.from('subject_classes').insert(
          form.classIds.map(cid => ({ subject_id: subjectId, class_id: cid, school_id: schoolId }))
        );
        if (error) throw error;
      }

      // Also sync profiles.subject_ids for assigned teachers
      for (const tid of form.teacherIds) {
        const teacher = teachers.find(t => t.id === tid);
        if (!teacher) continue;
        const currentIds = teacher.subject_ids || [];
        if (!currentIds.includes(subjectId)) {
          await supabase.from('profiles').update({
            subject_ids: [...currentIds, subjectId],
            updated_at: new Date().toISOString(),
          }).eq('id', tid);
        }
      }

      onSaved(); onClose();
    } catch (err) {
      setSaveErr(err.message?.includes('duplicate') ? 'Kode mapel sudah digunakan.' : err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.6)', backdropFilter: 'blur(6px)', zIndex: 190, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '620px', maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 30px 80px rgba(0,0,0,.25)', animation: 'scaleIn .2s ease' }}>

        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BookOpen size={16} style={{ color: '#4F46E5' }} />
            </div>
            <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: '16px', fontWeight: '700', color: '#0F172A', margin: 0 }}>
              {isEdit ? 'Edit Mata Pelajaran' : 'Tambah Mata Pelajaran'}
            </h2>
          </div>
          <button onClick={onClose} style={{ width: '30px', height: '30px', borderRadius: '8px', border: '1px solid #F1F5F9', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#94A3B8' }}>
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Info dasar */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: '12px' }}>Informasi Mata Pelajaran</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ gridColumn: '1/-1' }}>
                <Input label="Nama Mata Pelajaran" required placeholder="Contoh: Matematika Wajib" value={form.name} onChange={e => set('name', e.target.value)} error={errors.name} />
              </div>
              <Input label="Kode" placeholder="Contoh: MTK-W" value={form.code} onChange={e => set('code', e.target.value)} />
              <div />
              <div style={{ gridColumn: '1/-1' }}>
                <Textarea label="Deskripsi (opsional)" placeholder="Deskripsi singkat mata pelajaran..." value={form.description} onChange={e => set('description', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Guru */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: '10px' }}>
              Guru Pengampu <span style={{ color: '#CBD5E1', fontWeight: '400', textTransform: 'none', letterSpacing: 0 }}>({form.teacherIds.length} dipilih)</span>
            </div>
            {teachers.length === 0
              ? <div style={{ fontSize: '13px', color: '#94A3B8', fontStyle: 'italic' }}>Belum ada guru di sekolah ini</div>
              : <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {teachers.map(t => {
                  const active = form.teacherIds.includes(t.id);
                  return (
                    <button key={t.id} type="button" onClick={() => toggleItem('teacherIds', t.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '6px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', border: `1.5px solid ${active ? '#4F46E5' : '#E2E8F0'}`, background: active ? '#EEF2FF' : '#F8FAFC', color: active ? '#4F46E5' : '#64748B', transition: 'all .15s' }}>
                      <div style={{ width: '22px', height: '22px', borderRadius: '6px', background: active ? '#4F46E5' : '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '700', color: active ? '#fff' : '#94A3B8' }}>
                        {t.name?.charAt(0).toUpperCase()}
                      </div>
                      {t.name}
                    </button>
                  );
                })}
              </div>}
          </div>

          {/* Kelas per grade */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: '10px' }}>
              Kelas yang Diajar <span style={{ color: '#CBD5E1', fontWeight: '400', textTransform: 'none', letterSpacing: 0 }}>({form.classIds.length} dipilih)</span>
            </div>
            {classes.length === 0
              ? <div style={{ fontSize: '13px', color: '#94A3B8', fontStyle: 'italic' }}>Belum ada kelas di sekolah ini</div>
              : Object.entries(classesByGrade).map(([grade, classList]) => (
                <div key={grade} style={{ marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <GradeBadge grade={parseInt(grade)} />
                    <button type="button"
                      onClick={() => {
                        const allIds = classList.map(c => c.id);
                        const allSelected = allIds.every(id => form.classIds.includes(id));
                        setForm(f => ({
                          ...f,
                          classIds: allSelected
                            ? f.classIds.filter(id => !allIds.includes(id))
                            : [...new Set([...f.classIds, ...allIds])],
                        }));
                      }}
                      style={{ fontSize: '11px', color: '#4F46E5', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', borderRadius: '6px' }}>
                      {classList.every(c => form.classIds.includes(c.id)) ? 'Batal semua' : 'Pilih semua'}
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', paddingLeft: '4px' }}>
                    {classList.map(c => {
                      const active = form.classIds.includes(c.id);
                      return (
                        <button key={c.id} type="button" onClick={() => toggleItem('classIds', c.id)}
                          style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 11px', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', border: `1.5px solid ${active ? '#0891B2' : '#E2E8F0'}`, background: active ? '#EFF6FF' : '#F8FAFC', color: active ? '#0891B2' : '#64748B', transition: 'all .15s' }}>
                          {c.name}
                          {c.jurusan && c.jurusan !== 'Umum' && (
                            <span style={{ fontSize: '10px', fontWeight: '700', opacity: .8 }}>{c.jurusan}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
          </div>

          {saveErr && (
            <div style={{ padding: '11px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '9px', color: '#DC2626', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={14} />{saveErr}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'flex-end', gap: '10px', flexShrink: 0 }}>
          <Btn variant="secondary" onClick={onClose} disabled={saving}>Batal</Btn>
          <Btn icon={Save} loading={saving} onClick={handleSave}>{isEdit ? 'Simpan Perubahan' : 'Tambah Mapel'}</Btn>
        </div>
      </div>
    </div>
  );
};

// ── Action Dropdown ───────────────────────────────────────────────
const ActionMenu = ({ subject, onView, onEdit, onDelete }) => {
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
        <div style={{ position: 'absolute', right: 0, top: '34px', background: '#fff', borderRadius: '12px', border: '1px solid #F1F5F9', boxShadow: '0 8px 30px rgba(0,0,0,.12)', zIndex: 51, minWidth: '140px', padding: '4px' }}>
          {[{ icon: Eye, label: 'Detail', action: () => { onView(subject); setOpen(false); }, color: '#374151' },
            { icon: Edit2, label: 'Edit', action: () => { onEdit(subject); setOpen(false); }, color: '#374151' },
            { icon: Trash2, label: 'Hapus', action: () => { onDelete(subject); setOpen(false); }, color: '#DC2626' }]
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

// ── Main ──────────────────────────────────────────────────────────
const SubjectManagement = () => {
  const { profile } = useAuth();
  const [subjects,  setSubjects]  = useState([]);
  const [teachers,  setTeachers]  = useState([]);
  const [classes,   setClasses]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [refreshing,setRefreshing]= useState(false);
  const [error,     setError]     = useState(null);

  const [search,      setSearch]      = useState('');
  const [filterGrade, setFilterGrade] = useState('all');
  const [filterJurusan, setFilterJurusan] = useState('all');

  const [modalOpen,    setModalOpen]    = useState(false);
  const [editSubject,  setEditSubject]  = useState(null);
  const [detailSubject,setDetailSubject]= useState(null);
  const [confirm,      setConfirm]      = useState({ open: false });
  const [actLoading,   setActLoading]   = useState(false);
  const [toast,        setToast]        = useState(null);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const fetchData = useCallback(async () => {
    if (!profile?.school_id) { setLoading(false); return; }
    const sid = profile.school_id;
    try {
      const [subRes, teachRes, classRes] = await Promise.all([
        supabase.from('subjects')
          .select('*, subject_teachers(teacher_id), subject_classes(class_id)')
          .eq('school_id', sid)
          .order('name'),
        supabase.from('profiles')
          .select('id, name, email, subject_ids')
          .eq('school_id', sid)
          .eq('role', 'teacher')
          .order('name'),
        supabase.from('classes')
          .select('id, name, grade_level, jurusan, academic_year')
          .eq('school_id', sid)
          .order('grade_level')
          .order('name'),
      ]);
      if (subRes.error) throw subRes.error;
      setSubjects(subRes.data || []);
      setTeachers(teachRes.data || []);
      setClasses(classRes.data || []);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, [profile?.school_id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = (subject) => {
    setConfirm({
      open: true,
      title: 'Hapus Mata Pelajaran',
      message: `Hapus "${subject.name}"? Relasi dengan guru dan kelas juga akan dihapus.`,
      onConfirm: async () => {
        setActLoading(true);
        const { error } = await supabase.from('subjects').delete().eq('id', subject.id);
        if (error) showToast(error.message, 'error');
        else { showToast(`${subject.name} berhasil dihapus`); fetchData(); if (detailSubject?.id === subject.id) setDetailSubject(null); }
        setActLoading(false); setConfirm({ open: false });
      },
      onCancel: () => setConfirm({ open: false }),
    });
  };

  // Get jurusan list from actual classes
  const jurusanInUse = [...new Set(classes.map(c => c.jurusan).filter(Boolean))];

  // Filtered subjects based on search + grade + jurusan filters
  const schoolCfgMain = getSchoolConfig(profile?.schools?.school_type || 'SMA');
  const gradeListMain = schoolCfgMain.grades;

  const filtered = subjects.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !q || s.name.toLowerCase().includes(q) || s.code?.toLowerCase().includes(q);

    const subjectClassIds = s.subject_classes?.map(sc => sc.class_id) || [];
    const subjectClasses  = classes.filter(c => subjectClassIds.includes(c.id));

    const matchGrade   = filterGrade === 'all' || subjectClasses.some(c => c.grade_level === parseInt(filterGrade));
    const matchJurusan = filterJurusan === 'all' || subjectClasses.some(c => c.jurusan === filterJurusan);

    return matchSearch && matchGrade && matchJurusan;
  });

  // Group filtered subjects for display
  const getSubjectGrades = (s) => {
    const ids = s.subject_classes?.map(sc => sc.class_id) || [];
    return [...new Set(classes.filter(c => ids.includes(c.id)).map(c => c.grade_level))].sort();
  };

  const getSubjectJurusanList = (s) => {
    const ids = s.subject_classes?.map(sc => sc.class_id) || [];
    return [...new Set(classes.filter(c => ids.includes(c.id)).map(c => c.jurusan).filter(Boolean))];
  };

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
        .subj-row:hover { background: #FAFBFF !important; cursor: pointer; }
      `}</style>

      <div style={{ fontFamily: "'DM Sans', sans-serif", display: 'flex', flexDirection: 'column', gap: '22px' }}>

        {/* Header */}
        <div style={{ opacity: 0, animation: 'fadeUp .4s ease forwards', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BookOpen size={15} style={{ color: '#4F46E5' }} />
              </div>
              <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: '22px', fontWeight: '700', color: '#0F172A', margin: 0 }}>Mata Pelajaran</h1>
            </div>
            <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>Kelola mapel, guru pengampu, dan kelas yang diajar</p>
          </div>
          <div style={{ display: 'flex', gap: '9px' }}>
            <Btn variant="secondary" icon={RefreshCw} loading={refreshing} onClick={() => { setRefreshing(true); fetchData(); }}>Refresh</Btn>
            <Btn icon={Plus} onClick={() => { setEditSubject(null); setModalOpen(true); }}>Tambah Mapel</Btn>
          </div>
        </div>

        {/* Summary pills */}
        <div style={{ opacity: 0, animation: 'fadeUp .4s ease 60ms forwards', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {[
            { label: 'Total Mapel',  value: subjects.length,  color: '#4F46E5', bg: '#EEF2FF' },
            { label: 'Total Guru',   value: teachers.length,  color: '#0891B2', bg: '#EFF6FF' },
            { label: 'Total Kelas',  value: classes.length,   color: '#7C3AED', bg: '#F5F3FF' },
          ].map(p => (
            <div key={p.label} style={{ padding: '8px 16px', borderRadius: '999px', background: p.bg, color: p.color, fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {p.label}: <span style={{ fontWeight: '700' }}>{p.value}</span>
            </div>
          ))}
        </div>

        {error && <div style={{ padding: '14px 18px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '12px', color: '#DC2626', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}><AlertCircle size={14} />{error}</div>}

        {/* Table card */}
        <div style={{ opacity: 0, animation: 'fadeUp .4s ease 120ms forwards', background: '#fff', borderRadius: '16px', border: '1px solid #F1F5F9', boxShadow: '0 1px 4px rgba(0,0,0,.03)', overflow: 'hidden' }}>

          {/* Toolbar */}
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #F8FAFC', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
              <Search size={13} style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
              <input type="text" placeholder="Cari nama atau kode mapel..." value={search} onChange={e => setSearch(e.target.value)}
                style={{ width: '100%', padding: '8px 12px 8px 32px', borderRadius: '9px', border: '1.5px solid #E2E8F0', background: '#F8FAFC', fontSize: '13px', color: '#0F172A', outline: 'none', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box', transition: 'border-color .15s' }}
                onFocus={e => { e.target.style.borderColor = '#4F46E5'; e.target.style.boxShadow = '0 0 0 3px rgba(79,70,229,.1)'; }}
                onBlur={e => { e.target.style.borderColor = '#E2E8F0'; e.target.style.boxShadow = 'none'; }} />
            </div>

            {/* Filter Kelas */}
            <div style={{ position: 'relative' }}>
              <select value={filterGrade} onChange={e => setFilterGrade(e.target.value)}
                style={{ padding: '8px 28px 8px 11px', borderRadius: '9px', border: '1.5px solid #E2E8F0', background: '#F8FAFC', fontSize: '13px', color: filterGrade !== 'all' ? '#0F172A' : '#94A3B8', outline: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", appearance: 'none' }}>
                <option value="all">Semua Kelas</option>
                {gradeListMain.map(g => <option key={g} value={g}>Kelas {g}</option>)}
              </select>
              <ChevronDown size={12} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
            </div>

            {/* Filter Jurusan */}
            {jurusanInUse.length > 1 && (
              <div style={{ position: 'relative' }}>
                <select value={filterJurusan} onChange={e => setFilterJurusan(e.target.value)}
                  style={{ padding: '8px 28px 8px 11px', borderRadius: '9px', border: '1.5px solid #E2E8F0', background: '#F8FAFC', fontSize: '13px', color: filterJurusan !== 'all' ? '#0F172A' : '#94A3B8', outline: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", appearance: 'none' }}>
                  <option value="all">Semua Jurusan</option>
                  {jurusanInUse.map(j => <option key={j} value={j}>{j}</option>)}
                </select>
                <ChevronDown size={12} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
              </div>
            )}

            <span style={{ fontSize: '12px', color: '#94A3B8', marginLeft: 'auto' }}>{filtered.length} dari {subjects.length}</span>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '580px' }}>
              <thead>
                <tr style={{ background: '#FAFBFF', borderBottom: '1px solid #F1F5F9' }}>
                  {['Mata Pelajaran', 'Kelas', 'Jurusan', 'Guru', 'Kelas Diajar', ''].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.06em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={6} style={{ padding: '13px 16px' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: '#F1F5F9', flexShrink: 0 }} />
                      {[140, 80, 80, 60, 80].map((w, j) => <Shimmer key={j} w={`${w}px`} />)}
                    </div>
                  </td></tr>
                )) : filtered.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: '48px', textAlign: 'center' }}>
                    <div style={{ fontSize: '28px', marginBottom: '8px' }}>📚</div>
                    <div style={{ fontSize: '14px', color: '#94A3B8' }}>Tidak ada mata pelajaran ditemukan</div>
                  </td></tr>
                ) : filtered.map(s => {
                  const grades   = getSubjectGrades(s);
                  const jurusans = getSubjectJurusanList(s);
                  const teacherCount = s.subject_teachers?.length || 0;
                  const classCount   = s.subject_classes?.length  || 0;
                  return (
                    <tr key={s.id} className="subj-row" style={{ borderBottom: '1px solid #F8FAFC', transition: 'background .1s' }} onClick={() => setDetailSubject(s)}>
                      <td style={{ padding: '13px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
                          <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <BookOpen size={15} style={{ color: '#4F46E5' }} />
                          </div>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: '600', color: '#0F172A' }}>{s.name}</div>
                            {s.code && <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: '600', letterSpacing: '.04em' }}>{s.code}</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '13px 16px' }}>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {grades.length === 0
                            ? <span style={{ fontSize: '12px', color: '#CBD5E1' }}>—</span>
                            : grades.map(g => <GradeBadge key={g} grade={g} />)}
                        </div>
                      </td>
                      <td style={{ padding: '13px 16px' }}>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {jurusans.length === 0
                            ? <span style={{ fontSize: '12px', color: '#CBD5E1' }}>—</span>
                            : jurusans.map(j => <JurusanBadge key={j} jurusan={j} />)}
                        </div>
                      </td>
                      <td style={{ padding: '13px 16px' }}>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: teacherCount > 0 ? '#4F46E5' : '#CBD5E1' }}>
                          {teacherCount > 0 ? `${teacherCount} guru` : '—'}
                        </span>
                      </td>
                      <td style={{ padding: '13px 16px' }}>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: classCount > 0 ? '#0891B2' : '#CBD5E1' }}>
                          {classCount > 0 ? `${classCount} kelas` : '—'}
                        </span>
                      </td>
                      <td style={{ padding: '13px 16px' }} onClick={e => e.stopPropagation()}>
                        <ActionMenu subject={s}
                          onView={setDetailSubject}
                          onEdit={s => { setEditSubject(s); setModalOpen(true); }}
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
              <span style={{ fontSize: '12px', color: '#94A3B8' }}>Menampilkan {filtered.length} dari {subjects.length} mata pelajaran</span>
              <span style={{ fontSize: '11px', color: '#CBD5E1', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ color: '#4F46E5', fontSize: '10px' }}>⚡</span> Real-time dari Supabase
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <SubjectModal open={modalOpen} subject={editSubject} teachers={teachers} classes={classes} schoolId={profile?.school_id} profile={profile}
        onClose={() => { setModalOpen(false); setEditSubject(null); }}
        onSaved={() => { fetchData(); showToast(editSubject ? 'Mapel berhasil diperbarui' : 'Mapel berhasil ditambahkan'); }} />

      <DetailDrawer subject={detailSubject} teachers={teachers} classes={classes}
        onClose={() => setDetailSubject(null)}
        onEdit={s => { setDetailSubject(null); setEditSubject(s); setModalOpen(true); }}
        onDelete={s => { setDetailSubject(null); handleDelete(s); }} />

      <ConfirmDialog {...confirm} loading={actLoading} />
      {toast && <Toast {...toast} />}
    </>
  );
};

export default SubjectManagement;