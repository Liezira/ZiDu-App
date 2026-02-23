import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  BookOpen, Plus, Search, RefreshCw, Edit2, Trash2, X, Save,
  AlertCircle, CheckCircle2, ChevronDown, MoreVertical, Eye,
  FileText, List, ToggleLeft, ChevronRight, ChevronLeft,
  ArrowLeft, Copy, Filter, Upload, Download,
} from 'lucide-react';

// ── Constants ─────────────────────────────────────────────────────
const EXAM_TYPES   = ['Ulangan Harian', 'UTS', 'UAS', 'Try Out', 'Kuis'];
const DIFFICULTIES = ['easy', 'medium', 'hard'];
const DIFF_META    = {
  easy:   { label: 'Mudah',  bg: '#F0FDF4', color: '#16A34A', border: '#BBF7D0' },
  medium: { label: 'Sedang', bg: '#FFFBEB', color: '#D97706', border: '#FDE68A' },
  hard:   { label: 'Sulit',  bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' },
};
const TYPE_META = {
  multiple_choice: { label: 'Pilihan Ganda', icon: List,       color: '#4F46E5', bg: '#EEF2FF' },
  essay:           { label: 'Essay',         icon: FileText,   color: '#0891B2', bg: '#EFF6FF' },
  true_false:      { label: 'Benar/Salah',   icon: ToggleLeft, color: '#7C3AED', bg: '#F5F3FF' },
};

// ── Atoms ─────────────────────────────────────────────────────────
const DiffBadge = ({ diff }) => {
  const m = DIFF_META[diff] || DIFF_META.easy;
  return <span style={{ padding: '2px 9px', borderRadius: '999px', fontSize: '11px', fontWeight: '700', background: m.bg, color: m.color, border: `1px solid ${m.border}` }}>{m.label}</span>;
};

const TypeBadge = ({ type }) => {
  const m = TYPE_META[type] || TYPE_META.multiple_choice;
  const Icon = m.icon;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 9px', borderRadius: '999px', fontSize: '11px', fontWeight: '700', background: m.bg, color: m.color }}>
      <Icon size={10} />{m.label}
    </span>
  );
};

const Input = ({ label, required, error, hint, ...props }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
    {label && <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151' }}>{label}{required && <span style={{ color: '#EF4444', marginLeft: '2px' }}>*</span>}</label>}
    <input {...props} style={{ padding: '9px 12px', borderRadius: '9px', fontSize: '13px', color: '#0F172A', fontFamily: "'DM Sans', sans-serif", border: `1.5px solid ${error ? '#FCA5A5' : '#E2E8F0'}`, background: '#F8FAFC', outline: 'none', width: '100%', boxSizing: 'border-box', transition: 'border-color .15s, box-shadow .15s', ...props.style }}
      onFocus={e => { e.target.style.borderColor = '#4F46E5'; e.target.style.boxShadow = '0 0 0 3px rgba(79,70,229,.1)'; e.target.style.background = '#fff'; }}
      onBlur={e => { e.target.style.borderColor = error ? '#FCA5A5' : '#E2E8F0'; e.target.style.boxShadow = 'none'; e.target.style.background = '#F8FAFC'; }} />
    {error && <span style={{ fontSize: '11px', color: '#EF4444' }}>{error}</span>}
    {hint && !error && <span style={{ fontSize: '11px', color: '#94A3B8' }}>{hint}</span>}
  </div>
);

const Textarea = ({ label, required, error, ...props }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
    {label && <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151' }}>{label}{required && <span style={{ color: '#EF4444', marginLeft: '2px' }}>*</span>}</label>}
    <textarea {...props} style={{ padding: '9px 12px', borderRadius: '9px', fontSize: '13px', color: '#0F172A', fontFamily: "'DM Sans', sans-serif", border: `1.5px solid ${error ? '#FCA5A5' : '#E2E8F0'}`, background: '#F8FAFC', outline: 'none', width: '100%', boxSizing: 'border-box', resize: 'vertical', transition: 'border-color .15s', minHeight: '80px', ...props.style }}
      onFocus={e => { e.target.style.borderColor = '#4F46E5'; e.target.style.boxShadow = '0 0 0 3px rgba(79,70,229,.1)'; e.target.style.background = '#fff'; }}
      onBlur={e => { e.target.style.borderColor = error ? '#FCA5A5' : '#E2E8F0'; e.target.style.boxShadow = 'none'; e.target.style.background = '#F8FAFC'; }} />
    {error && <span style={{ fontSize: '11px', color: '#EF4444' }}>{error}</span>}
  </div>
);

const SelectField = ({ label, required, error, options, placeholder, ...props }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
    {label && <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151' }}>{label}{required && <span style={{ color: '#EF4444', marginLeft: '2px' }}>*</span>}</label>}
    <div style={{ position: 'relative' }}>
      <select {...props} style={{ padding: '9px 32px 9px 12px', borderRadius: '9px', fontSize: '13px', color: '#0F172A', fontFamily: "'DM Sans', sans-serif", border: `1.5px solid ${error ? '#FCA5A5' : '#E2E8F0'}`, background: '#F8FAFC', outline: 'none', width: '100%', appearance: 'none', cursor: 'pointer', transition: 'border-color .15s', ...props.style }}
        onFocus={e => { e.target.style.borderColor = '#4F46E5'; e.target.style.boxShadow = '0 0 0 3px rgba(79,70,229,.1)'; }}
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


// ── Bulk Import Modal ─────────────────────────────────────────────
const CSV_TEMPLATE = `type,question,option_a,option_b,option_c,option_d,correct_answer,difficulty,score_weight
multiple_choice,Ibu kota Indonesia adalah?,Jakarta,Surabaya,Bandung,Medan,A,easy,1
multiple_choice,2 + 2 = ?,3,4,5,6,B,easy,1
true_false,Matahari terbit dari timur,,,,,Benar,easy,1
essay,Jelaskan proses fotosintesis!,,,,,,medium,2`;

const BulkImportModal = ({ open, bankId, onClose, onImported }) => {
  const [rows,      setRows]      = useState([]);
  const [preview,   setPreview]   = useState(false);
  const [importing, setImporting] = useState(false);
  const [result,    setResult]    = useState(null);
  const [error,     setError]     = useState('');
  const fileRef = useRef();

  const reset = () => { setRows([]); setPreview(false); setResult(null); setError(''); if (fileRef.current) fileRef.current.value = ''; };

  const parseCSV = (text) => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) { setError('File harus punya minimal 1 header + 1 baris data.'); return; }
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/["\']/g, ''));
    const idx = (name) => headers.findIndex(h => h === name);

    const typeI    = idx('type');
    const qI       = idx('question');
    const aI       = idx('option_a');
    const bI       = idx('option_b');
    const cI       = idx('option_c');
    const dI       = idx('option_d');
    const ansI     = idx('correct_answer');
    const diffI    = idx('difficulty');
    const weightI  = idx('score_weight');

    if (qI < 0) { setError('Kolom "question" wajib ada.'); return; }

    const parsed = lines.slice(1).map((line, i) => {
      // Handle commas inside quotes
      const cols = [];
      let cur = '', inQ = false;
      for (const ch of line) {
        if (ch === '"') { inQ = !inQ; }
        else if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = ''; }
        else cur += ch;
      }
      cols.push(cur.trim());

      const type    = typeI >= 0 ? (cols[typeI] || 'multiple_choice').trim() : 'multiple_choice';
      const qText   = qI >= 0 ? cols[qI] || '' : '';
      const optA    = aI >= 0 ? cols[aI] || '' : '';
      const optB    = bI >= 0 ? cols[bI] || '' : '';
      const optC    = cI >= 0 ? cols[cI] || '' : '';
      const optD    = dI >= 0 ? cols[dI] || '' : '';
      const answer  = ansI >= 0 ? cols[ansI] || '' : '';
      const diff    = diffI >= 0 ? (cols[diffI] || 'medium').trim() : 'medium';
      const weight  = weightI >= 0 ? parseFloat(cols[weightI]) || 1 : 1;

      const validTypes = ['multiple_choice', 'essay', 'true_false'];
      const validDiffs = ['easy', 'medium', 'hard'];

      let _errors = [];
      if (!qText) _errors.push('Teks soal kosong');
      if (!validTypes.includes(type)) _errors.push(`Tipe tidak valid: ${type}`);
      if (!validDiffs.includes(diff)) _errors.push(`Kesulitan tidak valid: ${diff}`);
      if (type === 'multiple_choice') {
        if (!optA || !optB) _errors.push('Min. 2 pilihan (option_a, option_b)');
        if (!answer) _errors.push('Jawaban wajib diisi');
        const validAnswers = ['A','B','C','D'];
        if (answer && !validAnswers.includes(answer.toUpperCase())) _errors.push('Jawaban harus A/B/C/D');
      }
      if (type === 'true_false') {
        const validTF = ['Benar','Salah','benar','salah','true','false'];
        if (!validTF.includes(answer)) _errors.push('Jawaban harus Benar/Salah');
      }

      const options = type === 'multiple_choice' ? [optA, optB, optC, optD].filter(Boolean) : null;
      const correctAnswer = type === 'multiple_choice' ? answer.toUpperCase()
        : type === 'true_false' ? (['benar','true'].includes(answer.toLowerCase()) ? 'Benar' : 'Salah')
        : answer;

      return { _row: i + 2, type, question: qText, options, correct_answer: correctAnswer, difficulty: diff, score_weight: weight, _errors, _valid: _errors.length === 0 };
    });

    setRows(parsed);
    setPreview(true);
    setError('');
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.csv')) { setError('Hanya file .csv yang didukung.'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => { try { parseCSV(ev.target.result); } catch { setError('Gagal membaca file CSV.'); } };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    const valid = rows.filter(r => r._valid);
    if (!valid.length) return;
    setImporting(true);
    let success = 0, failed = 0;
    for (const row of valid) {
      const { error } = await supabase.from('questions').insert([{
        bank_id: bankId, type: row.type, question: row.question,
        options: row.options, correct_answer: row.correct_answer,
        difficulty: row.difficulty, score_weight: row.score_weight,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }]);
      error ? failed++ : success++;
    }
    // Sync total_questions dari COUNT aktual di DB (bukan increment)
    if (success > 0) {
      const { count } = await supabase.from('questions').select('*', { count: 'exact', head: true }).eq('bank_id', bankId);
      await supabase.from('question_banks').update({ total_questions: count ?? 0 }).eq('id', bankId);
    }
    setResult({ success, failed, skipped: rows.length - valid.length });
    setImporting(false);
    if (success > 0) onImported();
  };

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'template_soal.csv'; a.click();
  };

  if (!open) return null;

  const validCount   = rows.filter(r => r._valid).length;
  const invalidCount = rows.filter(r => !r._valid).length;

  const DIFF_COLOR = { easy: '#16A34A', medium: '#D97706', hard: '#DC2626' };
  const TYPE_LABEL = { multiple_choice: 'PG', essay: 'Essay', true_false: 'B/S' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.6)', backdropFilter: 'blur(6px)', zIndex: 190, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '680px', maxHeight: '88vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 30px 80px rgba(0,0,0,.25)', animation: 'scaleIn .2s ease' }}>

        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Upload size={16} style={{ color: '#0891B2' }} />
            </div>
            <div>
              <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: '16px', fontWeight: '700', color: '#0F172A', margin: 0 }}>Import Soal via CSV</h2>
              <p style={{ fontSize: '11px', color: '#94A3B8', margin: 0 }}>Pilihan ganda, essay, dan benar/salah</p>
            </div>
          </div>
          <button onClick={() => { reset(); onClose(); }} style={{ width: '30px', height: '30px', borderRadius: '8px', border: '1px solid #F1F5F9', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#94A3B8' }}><X size={14} /></button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {!preview && !result && (
            <div style={{ padding: '24px' }}>
              {/* Template download */}
              <div style={{ background: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '16px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>Format CSV yang diperlukan</span>
                  <button onClick={downloadTemplate} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#fff', fontSize: '12px', fontWeight: '600', color: '#4F46E5', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                    <Download size={11} /> Download Template
                  </button>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ fontSize: '11px', borderCollapse: 'collapse', width: '100%', minWidth: '500px' }}>
                    <thead>
                      <tr style={{ background: '#EEF2FF' }}>
                        {['type','question','option_a','option_b','option_c','option_d','correct_answer','difficulty','score_weight'].map(col => (
                          <th key={col} style={{ padding: '6px 10px', textAlign: 'left', color: '#4F46E5', fontWeight: '700', whiteSpace: 'nowrap', borderRadius: '4px' }}>{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr><td style={{ padding: '5px 10px', color: '#64748B', fontSize: '11px' }} colSpan={9}>
                        <span style={{ color: '#4F46E5', fontWeight: '600' }}>type</span>: multiple_choice | essay | true_false &nbsp;·&nbsp;
                        <span style={{ color: '#4F46E5', fontWeight: '600' }}>correct_answer</span>: A/B/C/D (PG), Benar/Salah (B/S), teks (essay) &nbsp;·&nbsp;
                        <span style={{ color: '#4F46E5', fontWeight: '600' }}>difficulty</span>: easy | medium | hard
                      </td></tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Drop zone */}
              <div style={{ border: '2px dashed #C7D2FE', borderRadius: '14px', padding: '40px 24px', textAlign: 'center', background: '#FAFAFF', cursor: 'pointer', transition: 'all .2s' }}
                onClick={() => fileRef.current?.click()}
                onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = '#4F46E5'; e.currentTarget.style.background = '#EEF2FF'; }}
                onDragLeave={e => { e.currentTarget.style.borderColor = '#C7D2FE'; e.currentTarget.style.background = '#FAFAFF'; }}
                onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = '#C7D2FE'; e.currentTarget.style.background = '#FAFAFF'; const file = e.dataTransfer.files[0]; if (file) { const dt = new DataTransfer(); dt.items.add(file); fileRef.current.files = dt.files; handleFile({ target: { files: [file] } }); } }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                  <Upload size={22} style={{ color: '#4F46E5' }} />
                </div>
                <div style={{ fontFamily: 'Sora, sans-serif', fontSize: '15px', fontWeight: '700', color: '#0F172A', marginBottom: '6px' }}>Drag & drop file CSV</div>
                <div style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '16px' }}>atau klik untuk pilih file dari komputer</div>
                <div style={{ display: 'inline-block', padding: '8px 18px', borderRadius: '9px', background: '#4F46E5', color: '#fff', fontSize: '13px', fontWeight: '600', fontFamily: "'DM Sans', sans-serif" }}>Pilih File</div>
                <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} style={{ display: 'none' }} />
              </div>

              {error && (
                <div style={{ marginTop: '14px', padding: '11px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '9px', color: '#DC2626', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={14} />{error}
                </div>
              )}
            </div>
          )}

          {/* Preview table */}
          {preview && !result && (
            <div style={{ padding: '20px 24px' }}>
              {/* Summary bar */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <div style={{ padding: '8px 14px', borderRadius: '10px', background: '#F0FDF4', border: '1px solid #BBF7D0', fontSize: '13px', fontWeight: '600', color: '#16A34A' }}>
                  ✓ {validCount} soal siap diimport
                </div>
                {invalidCount > 0 && (
                  <div style={{ padding: '8px 14px', borderRadius: '10px', background: '#FEF2F2', border: '1px solid #FECACA', fontSize: '13px', fontWeight: '600', color: '#DC2626' }}>
                    ✗ {invalidCount} soal tidak valid (akan dilewati)
                  </div>
                )}
              </div>

              {/* Table */}
              <div style={{ border: '1px solid #F1F5F9', borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto', maxHeight: '380px', overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '500px' }}>
                    <thead style={{ position: 'sticky', top: 0, background: '#F8FAFC', zIndex: 1 }}>
                      <tr>
                        {['#', 'Tipe', 'Teks Soal', 'Jawaban', 'Kesulitan', 'Bobot', 'Status'].map(h => (
                          <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: '700', color: '#374151', borderBottom: '1px solid #F1F5F9', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, i) => (
                        <tr key={i} style={{ background: row._valid ? '#fff' : '#FEF9F9', borderBottom: '1px solid #F8FAFC' }}>
                          <td style={{ padding: '9px 12px', color: '#94A3B8', fontWeight: '600' }}>{row._row}</td>
                          <td style={{ padding: '9px 12px' }}>
                            <span style={{ padding: '2px 7px', borderRadius: '999px', fontSize: '10px', fontWeight: '700',
                              background: row.type === 'multiple_choice' ? '#EEF2FF' : row.type === 'essay' ? '#EFF6FF' : '#F5F3FF',
                              color: row.type === 'multiple_choice' ? '#4F46E5' : row.type === 'essay' ? '#0891B2' : '#7C3AED' }}>
                              {TYPE_LABEL[row.type] || row.type}
                            </span>
                          </td>
                          <td style={{ padding: '9px 12px', color: '#0F172A', maxWidth: '200px' }}>
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.question || '—'}</div>
                          </td>
                          <td style={{ padding: '9px 12px', color: '#374151', maxWidth: '80px' }}>
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.correct_answer || '—'}</div>
                          </td>
                          <td style={{ padding: '9px 12px' }}>
                            <span style={{ fontWeight: '600', color: DIFF_COLOR[row.difficulty] || '#94A3B8' }}>
                              {row.difficulty === 'easy' ? 'Mudah' : row.difficulty === 'medium' ? 'Sedang' : 'Sulit'}
                            </span>
                          </td>
                          <td style={{ padding: '9px 12px', color: '#374151' }}>{row.score_weight}</td>
                          <td style={{ padding: '9px 12px' }}>
                            {row._valid
                              ? <span style={{ color: '#16A34A', fontWeight: '600', fontSize: '11px' }}>✓ Valid</span>
                              : <span title={row._errors.join(', ')} style={{ color: '#DC2626', fontWeight: '600', fontSize: '11px', cursor: 'help', borderBottom: '1px dashed #DC2626' }}>✗ {row._errors[0]}</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <button onClick={reset} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '12px', background: 'none', border: 'none', fontSize: '12px', color: '#94A3B8', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                ← Pilih file lain
              </button>
            </div>
          )}

          {/* Result */}
          {result && (
            <div style={{ padding: '40px 24px', textAlign: 'center' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: result.success > 0 ? '#F0FDF4' : '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                {result.success > 0 ? <CheckCircle2 size={26} style={{ color: '#16A34A' }} /> : <AlertCircle size={26} style={{ color: '#DC2626' }} />}
              </div>
              <div style={{ fontFamily: 'Sora, sans-serif', fontSize: '18px', fontWeight: '700', color: '#0F172A', marginBottom: '8px' }}>Import Selesai!</div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '16px', flexWrap: 'wrap' }}>
                {[
                  { label: 'Berhasil', value: result.success, color: '#16A34A', bg: '#F0FDF4' },
                  { label: 'Gagal', value: result.failed, color: '#DC2626', bg: '#FEF2F2' },
                  { label: 'Dilewati', value: result.skipped, color: '#D97706', bg: '#FFFBEB' },
                ].map(s => (
                  <div key={s.label} style={{ padding: '12px 20px', borderRadius: '12px', background: s.bg, textAlign: 'center' }}>
                    <div style={{ fontFamily: 'Sora, sans-serif', fontSize: '22px', fontWeight: '700', color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: '12px', color: s.color, fontWeight: '600' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          {result
            ? <Btn variant="secondary" onClick={() => { reset(); onClose(); }}>Tutup</Btn>
            : <>
                <Btn variant="secondary" onClick={() => { reset(); onClose(); }}>Batal</Btn>
                {preview && <Btn icon={Upload} loading={importing} onClick={handleImport} disabled={validCount === 0}>
                  Import {validCount} Soal
                </Btn>}
              </>}
        </div>
      </div>
    </div>
  );
};

// ── Bank Modal (Add/Edit) ─────────────────────────────────────────
const BankModal = ({ open, bank, subjects, schoolId, teacherId, onClose, onSaved }) => {
  const isEdit = !!bank?.id;
  const EMPTY  = { name: '', subject_id: '', exam_type: 'Ulangan Harian', description: '' };
  const [form, setForm]     = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState('');

  useEffect(() => {
    if (open) {
      setForm(bank ? { name: bank.name || '', subject_id: bank.subject_id || '', exam_type: bank.exam_type || 'Ulangan Harian', description: bank.description || '' } : EMPTY);
      setErrors({}); setSaveErr('');
    }
  }, [open, bank]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Nama bank soal wajib diisi';
    if (!form.subject_id)   e.subject_id = 'Mata pelajaran wajib dipilih';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true); setSaveErr('');
    try {
      const payload = { name: form.name.trim(), subject_id: form.subject_id, exam_type: form.exam_type, description: form.description.trim() || null, updated_at: new Date().toISOString() };
      const { error } = isEdit
        ? await supabase.from('question_banks').update(payload).eq('id', bank.id)
        : await supabase.from('question_banks').insert([{ ...payload, teacher_id: teacherId, school_id: schoolId, total_questions: 0, created_at: new Date().toISOString() }]);
      if (error) throw error;
      onSaved(); onClose();
    } catch (err) { setSaveErr(err.message); }
    finally { setSaving(false); }
  };

  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.6)', backdropFilter: 'blur(6px)', zIndex: 190, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '460px', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 30px 80px rgba(0,0,0,.25)', animation: 'scaleIn .2s ease' }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BookOpen size={16} style={{ color: '#4F46E5' }} />
            </div>
            <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: '16px', fontWeight: '700', color: '#0F172A', margin: 0 }}>
              {isEdit ? 'Edit Bank Soal' : 'Buat Bank Soal Baru'}
            </h2>
          </div>
          <button onClick={onClose} style={{ width: '30px', height: '30px', borderRadius: '8px', border: '1px solid #F1F5F9', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#94A3B8' }}><X size={14} /></button>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <Input label="Nama Bank Soal" required placeholder="Contoh: UH Bab 1 - Trigonometri" value={form.name} onChange={e => set('name', e.target.value)} error={errors.name} />
          <SelectField label="Mata Pelajaran" required placeholder="— Pilih Mapel —" value={form.subject_id} onChange={e => set('subject_id', e.target.value)} error={errors.subject_id}
            options={subjects.map(s => ({ value: s.id, label: `${s.name}${s.code ? ` (${s.code})` : ''}` }))} />
          <SelectField label="Jenis Ujian" value={form.exam_type} onChange={e => set('exam_type', e.target.value)}
            options={EXAM_TYPES.map(t => ({ value: t, label: t }))} />
          <Textarea label="Deskripsi (opsional)" placeholder="Keterangan singkat bank soal ini..." value={form.description} onChange={e => set('description', e.target.value)} rows={2} />
          {saveErr && <div style={{ padding: '11px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '9px', color: '#DC2626', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}><AlertCircle size={14} />{saveErr}</div>}
        </div>
        <div style={{ padding: '14px 24px', borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <Btn variant="secondary" onClick={onClose} disabled={saving}>Batal</Btn>
          <Btn icon={Save} loading={saving} onClick={handleSave}>{isEdit ? 'Simpan' : 'Buat Bank Soal'}</Btn>
        </div>
      </div>
    </div>
  );
};

// ── Question Editor ───────────────────────────────────────────────
const OPTS_DEFAULT = ['', '', '', ''];

const QuestionEditor = ({ open, question, bankId, onClose, onSaved }) => {
  const isEdit = !!question?.id;
  const EMPTY  = { type: 'multiple_choice', question: '', options: [...OPTS_DEFAULT], correct_answer: '', difficulty: 'medium', score_weight: 1 };
  const [form, setForm]     = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState('');

  useEffect(() => {
    if (open) {
      if (question) {
        setForm({
          type:           question.type || 'multiple_choice',
          question:       question.question || '',
          options:        question.options ? [...question.options, ...OPTS_DEFAULT].slice(0, 4) : [...OPTS_DEFAULT],
          correct_answer: question.correct_answer || '',
          difficulty:     question.difficulty || 'medium',
          score_weight:   question.score_weight || 1,
        });
      } else {
        setForm({ ...EMPTY, options: [...OPTS_DEFAULT] });
      }
      setErrors({}); setSaveErr('');
    }
  }, [open, question]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setOpt = (i, v) => setForm(f => { const o = [...f.options]; o[i] = v; return { ...f, options: o }; });

  const validate = () => {
    const e = {};
    if (!form.question.trim()) e.question = 'Teks soal wajib diisi';
    if (form.type === 'multiple_choice') {
      const filled = form.options.filter(o => o.trim());
      if (filled.length < 2) e.options = 'Minimal 2 pilihan jawaban harus diisi';
      if (!form.correct_answer) e.correct_answer = 'Pilih jawaban yang benar';
    }
    if (form.type === 'true_false' && !form.correct_answer) e.correct_answer = 'Pilih jawaban yang benar';
    if (form.type === 'essay' && !form.correct_answer.trim()) e.correct_answer = 'Isi kunci jawaban / rubrik penilaian';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true); setSaveErr('');
    try {
      const payload = {
        type:           form.type,
        question:       form.question.trim(),
        options:        form.type === 'multiple_choice' ? form.options.filter(o => o.trim()) : null,
        correct_answer: form.correct_answer,
        difficulty:     form.difficulty,
        score_weight:   parseFloat(form.score_weight) || 1,
        updated_at:     new Date().toISOString(),
      };

      if (isEdit) {
        const { error } = await supabase.from('questions').update(payload).eq('id', question.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('questions').insert([{ ...payload, bank_id: bankId, created_at: new Date().toISOString() }]);
        if (error) throw error;
        // Sync total_questions dari COUNT aktual (bukan increment agar tidak drift)
        const { count } = await supabase.from('questions').select('*', { count: 'exact', head: true }).eq('bank_id', bankId);
        await supabase.from('question_banks').update({ total_questions: count ?? 0 }).eq('id', bankId);
      }
      onSaved(); onClose();
    } catch (err) { setSaveErr(err.message); }
    finally { setSaving(false); }
  };

  const optLabels = ['A', 'B', 'C', 'D'];

  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.6)', backdropFilter: 'blur(6px)', zIndex: 190, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '600px', maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 30px 80px rgba(0,0,0,.25)', animation: 'scaleIn .2s ease' }}>

        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: '16px', fontWeight: '700', color: '#0F172A', margin: 0 }}>
            {isEdit ? 'Edit Soal' : 'Tambah Soal Baru'}
          </h2>
          <button onClick={onClose} style={{ width: '30px', height: '30px', borderRadius: '8px', border: '1px solid #F1F5F9', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#94A3B8' }}><X size={14} /></button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Type + Difficulty + Weight */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <SelectField label="Tipe Soal" value={form.type} onChange={e => { set('type', e.target.value); set('correct_answer', ''); }}
              options={Object.entries(TYPE_META).map(([v, m]) => ({ value: v, label: m.label }))} />
            <SelectField label="Tingkat Kesulitan" value={form.difficulty} onChange={e => set('difficulty', e.target.value)}
              options={DIFFICULTIES.map(d => ({ value: d, label: DIFF_META[d].label }))} />
            <Input label="Bobot Nilai" type="number" min="0.5" max="10" step="0.5" value={form.score_weight} onChange={e => set('score_weight', e.target.value)} hint="Default: 1" />
          </div>

          {/* Question text */}
          <Textarea label="Teks Soal" required placeholder="Tulis pertanyaan di sini..." value={form.question} onChange={e => set('question', e.target.value)} error={errors.question} rows={4} />

          {/* Multiple Choice options */}
          {form.type === 'multiple_choice' && (
            <div>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                Pilihan Jawaban <span style={{ color: '#EF4444' }}>*</span>
                <span style={{ fontWeight: '400', color: '#94A3B8', marginLeft: '6px' }}>— klik radio untuk set jawaban benar</span>
              </div>
              {errors.options && <div style={{ fontSize: '11px', color: '#EF4444', marginBottom: '8px' }}>{errors.options}</div>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {form.options.map((opt, i) => {
                  const isCorrect = form.correct_answer === optLabels[i];
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <button type="button" onClick={() => set('correct_answer', optLabels[i])}
                        style={{ width: '28px', height: '28px', borderRadius: '50%', border: `2px solid ${isCorrect ? '#4F46E5' : '#E2E8F0'}`, background: isCorrect ? '#4F46E5' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, transition: 'all .15s' }}>
                        <span style={{ fontFamily: 'Sora, sans-serif', fontSize: '11px', fontWeight: '700', color: isCorrect ? '#fff' : '#94A3B8' }}>{optLabels[i]}</span>
                      </button>
                      <input value={opt} onChange={e => setOpt(i, e.target.value)} placeholder={`Pilihan ${optLabels[i]}`}
                        style={{ flex: 1, padding: '8px 12px', borderRadius: '9px', border: `1.5px solid ${isCorrect ? '#4F46E5' : '#E2E8F0'}`, background: isCorrect ? '#EEF2FF' : '#F8FAFC', fontSize: '13px', color: '#0F172A', outline: 'none', fontFamily: "'DM Sans', sans-serif", transition: 'all .15s' }}
                        onFocus={e => { e.target.style.borderColor = '#4F46E5'; e.target.style.background = '#fff'; }}
                        onBlur={e => { e.target.style.borderColor = isCorrect ? '#4F46E5' : '#E2E8F0'; e.target.style.background = isCorrect ? '#EEF2FF' : '#F8FAFC'; }} />
                    </div>
                  );
                })}
              </div>
              {errors.correct_answer && <div style={{ fontSize: '11px', color: '#EF4444', marginTop: '6px' }}>{errors.correct_answer}</div>}
            </div>
          )}

          {/* True/False */}
          {form.type === 'true_false' && (
            <div>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>Jawaban Benar <span style={{ color: '#EF4444' }}>*</span></div>
              <div style={{ display: 'flex', gap: '10px' }}>
                {['Benar', 'Salah'].map(v => (
                  <button key={v} type="button" onClick={() => set('correct_answer', v)}
                    style={{ flex: 1, padding: '10px', borderRadius: '10px', border: `2px solid ${form.correct_answer === v ? '#4F46E5' : '#E2E8F0'}`, background: form.correct_answer === v ? '#EEF2FF' : '#F8FAFC', fontSize: '13px', fontWeight: '600', color: form.correct_answer === v ? '#4F46E5' : '#64748B', cursor: 'pointer', transition: 'all .15s' }}>
                    {v === 'Benar' ? '✓ Benar' : '✗ Salah'}
                  </button>
                ))}
              </div>
              {errors.correct_answer && <div style={{ fontSize: '11px', color: '#EF4444', marginTop: '6px' }}>{errors.correct_answer}</div>}
            </div>
          )}

          {/* Essay rubric */}
          {form.type === 'essay' && (
            <Textarea label="Kunci Jawaban / Rubrik Penilaian" required placeholder="Tulis kunci jawaban atau rubrik penilaian untuk soal essay ini..." value={form.correct_answer} onChange={e => set('correct_answer', e.target.value)} error={errors.correct_answer} rows={4} />
          )}

          {saveErr && <div style={{ padding: '11px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '9px', color: '#DC2626', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}><AlertCircle size={14} />{saveErr}</div>}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'flex-end', gap: '10px', flexShrink: 0 }}>
          <Btn variant="secondary" onClick={onClose} disabled={saving}>Batal</Btn>
          <Btn icon={Save} loading={saving} onClick={handleSave}>{isEdit ? 'Simpan' : 'Tambah Soal'}</Btn>
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
        style={{ width: '28px', height: '28px', borderRadius: '7px', border: '1px solid #F1F5F9', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#94A3B8' }}
        onMouseEnter={e => e.currentTarget.style.background = '#EEF2FF'}
        onMouseLeave={e => e.currentTarget.style.background = '#F8FAFC'}>
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

// ── Question Preview ──────────────────────────────────────────────
const QuestionPreview = ({ question, number }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{ background: '#fff', border: '1px solid #F1F5F9', borderRadius: '12px', overflow: 'hidden', transition: 'box-shadow .2s' }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,.06)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }} onClick={() => setExpanded(e => !e)}>
        <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: 'Sora, sans-serif', fontWeight: '700', fontSize: '12px', color: '#4F46E5' }}>{number}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '13px', color: '#0F172A', margin: '0 0 8px', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: expanded ? 'unset' : 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{question.question}</p>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <TypeBadge type={question.type} />
            <DiffBadge diff={question.difficulty} />
            <span style={{ fontSize: '11px', color: '#94A3B8', padding: '2px 8px', background: '#F8FAFC', borderRadius: '999px' }}>Bobot: {question.score_weight}</span>
          </div>
        </div>
        <ChevronDown size={14} style={{ color: '#94A3B8', flexShrink: 0, transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform .2s', marginTop: '2px' }} />
      </div>
      {expanded && (
        <div style={{ padding: '0 16px 14px 56px', borderTop: '1px solid #F8FAFC' }}>
          {question.type === 'multiple_choice' && question.options && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '12px' }}>
              {question.options.map((opt, i) => {
                const label = ['A','B','C','D'][i];
                const isCorrect = question.correct_answer === label;
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 10px', borderRadius: '8px', background: isCorrect ? '#F0FDF4' : '#F8FAFC', border: `1px solid ${isCorrect ? '#BBF7D0' : '#F1F5F9'}` }}>
                    <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: isCorrect ? '#16A34A' : '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '700', color: isCorrect ? '#fff' : '#64748B', flexShrink: 0 }}>{label}</span>
                    <span style={{ fontSize: '13px', color: isCorrect ? '#15803D' : '#374151', fontWeight: isCorrect ? '600' : '400' }}>{opt}</span>
                    {isCorrect && <CheckCircle2 size={13} style={{ color: '#16A34A', marginLeft: 'auto' }} />}
                  </div>
                );
              })}
            </div>
          )}
          {question.type === 'true_false' && (
            <div style={{ marginTop: '10px', fontSize: '13px', color: '#374151' }}>
              Jawaban: <span style={{ fontWeight: '700', color: '#4F46E5' }}>{question.correct_answer}</span>
            </div>
          )}
          {question.type === 'essay' && (
            <div style={{ marginTop: '10px', padding: '10px 12px', background: '#F8FAFC', borderRadius: '8px', fontSize: '13px', color: '#374151', lineHeight: 1.6 }}>
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#94A3B8', display: 'block', marginBottom: '4px' }}>KUNCI JAWABAN</span>
              {question.correct_answer}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Main ──────────────────────────────────────────────────────────
const QuestionBank = () => {
  const { profile } = useAuth();
  const [view, setView]   = useState('banks'); // 'banks' | 'questions'
  const [banks,    setBanks]    = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [activeBank, setActiveBank] = useState(null);

  const [loading,    setLoading]    = useState(true);
  const [qLoading,   setQLoading]   = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState(null);

  const [search,       setSearch]       = useState('');
  const [filterType,   setFilterType]   = useState('all');
  const [filterDiff,   setFilterDiff]   = useState('all');
  const [filterSubject,setFilterSubject]= useState('all');

  const [bankModal,  setBankModal]  = useState(false);
  const [editBank,   setEditBank]   = useState(null);
  const [qModal,     setQModal]     = useState(false);
  const [editQ,      setEditQ]      = useState(null);
  const [confirm,    setConfirm]    = useState({ open: false });
  const [bulkModal,  setBulkModal]  = useState(false);
  const [actLoading, setActLoading] = useState(false);
  const [toast,      setToast]      = useState(null);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  // Fetch banks + subjects
  const fetchBanks = useCallback(async () => {
    if (!profile?.id) return;
    try {
      const [banksRes, subjectsRes] = await Promise.all([
        supabase.from('question_banks')
          .select('*, subjects(name, code)')
          .eq('teacher_id', profile.id)
          .order('created_at', { ascending: false }),
        supabase.from('subjects')
          .select('id, name, code')
          .eq('school_id', profile.school_id)
          .order('name'),
      ]);
      if (banksRes.error) throw banksRes.error;
      setBanks(banksRes.data || []);
      setSubjects(subjectsRes.data || []);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, [profile?.id, profile?.school_id]);

  // Fetch questions for active bank
  const fetchQuestions = useCallback(async (bankId) => {
    setQLoading(true);
    try {
      const { data, error } = await supabase.from('questions')
        .select('*')
        .eq('bank_id', bankId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setQuestions(data || []);
    } catch (err) { setError(err.message); }
    finally { setQLoading(false); }
  }, []);

  useEffect(() => { fetchBanks(); }, [fetchBanks]);

  const openBank = (bank) => {
    setActiveBank(bank);
    setView('questions');
    setSearch(''); setFilterType('all'); setFilterDiff('all');
    fetchQuestions(bank.id);
  };

  const backToList = () => { setView('banks'); setActiveBank(null); setQuestions([]); setSearch(''); };

  const handleDeleteBank = (bank) => {
    setConfirm({
      open: true, title: 'Hapus Bank Soal',
      message: `Hapus "${bank.name}"? Semua ${bank.total_questions} soal di dalamnya akan ikut terhapus.`,
      onConfirm: async () => {
        setActLoading(true);
        await supabase.from('questions').delete().eq('bank_id', bank.id);
        const { error } = await supabase.from('question_banks').delete().eq('id', bank.id);
        if (error) showToast(error.message, 'error');
        else { showToast('Bank soal berhasil dihapus'); fetchBanks(); }
        setActLoading(false); setConfirm({ open: false });
      },
      onCancel: () => setConfirm({ open: false }),
    });
  };

  const handleDeleteQuestion = (q) => {
    setConfirm({
      open: true, title: 'Hapus Soal',
      message: 'Soal ini akan dihapus permanen.',
      onConfirm: async () => {
        setActLoading(true);
        const { error } = await supabase.from('questions').delete().eq('id', q.id);
        if (error) { showToast(error.message, 'error'); }
        else {
          // Sync total_questions dari COUNT aktual setelah hapus
          const { count } = await supabase.from('questions').select('*', { count: 'exact', head: true }).eq('bank_id', activeBank.id);
          await supabase.from('question_banks').update({ total_questions: count ?? 0 }).eq('id', activeBank.id);
          showToast('Soal berhasil dihapus');
          fetchQuestions(activeBank.id);
          fetchBanks();
        }
        setActLoading(false); setConfirm({ open: false });
      },
      onCancel: () => setConfirm({ open: false }),
    });
  };

  // Filtered questions
  const filteredQ = questions.filter(q => {
    const matchSearch = !search || q.question.toLowerCase().includes(search.toLowerCase());
    const matchType   = filterType === 'all' || q.type === filterType;
    const matchDiff   = filterDiff === 'all' || q.difficulty === filterDiff;
    return matchSearch && matchType && matchDiff;
  });

  // Filtered banks
  const filteredBanks = banks.filter(b => {
    const matchSearch  = !search || b.name.toLowerCase().includes(search.toLowerCase()) || b.subjects?.name?.toLowerCase().includes(search.toLowerCase());
    const matchSubject = filterSubject === 'all' || b.subject_id === filterSubject;
    return matchSearch && matchSubject;
  });

  const qStats = {
    total: questions.length,
    mc:    questions.filter(q => q.type === 'multiple_choice').length,
    essay: questions.filter(q => q.type === 'essay').length,
    tf:    questions.filter(q => q.type === 'true_false').length,
    easy:  questions.filter(q => q.difficulty === 'easy').length,
    medium:questions.filter(q => q.difficulty === 'medium').length,
    hard:  questions.filter(q => q.difficulty === 'hard').length,
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&family=DM+Sans:wght@400;500;600&display=swap');
        @keyframes fadeUp       { from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);} }
        @keyframes shimmer      { 0%{background-position:-400px 0;}100%{background-position:400px 0;} }
        @keyframes scaleIn      { from{opacity:0;transform:scale(.95);}to{opacity:1;transform:scale(1);} }
        @keyframes slideDown    { from{opacity:0;transform:translateY(-8px);}to{opacity:1;transform:translateY(0);} }
        @keyframes spin         { to{transform:rotate(360deg);} }
        .bank-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,.08) !important; }
      `}</style>

      <div style={{ fontFamily: "'DM Sans', sans-serif", display: 'flex', flexDirection: 'column', gap: '22px' }}>

        {/* ── VIEW: BANKS ── */}
        {view === 'banks' && <>

          {/* Header */}
          <div style={{ opacity: 0, animation: 'fadeUp .4s ease forwards', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <BookOpen size={15} style={{ color: '#4F46E5' }} />
                </div>
                <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: '22px', fontWeight: '700', color: '#0F172A', margin: 0 }}>Bank Soal</h1>
              </div>
              <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>Kelola kumpulan soal untuk ujian</p>
            </div>
            <div style={{ display: 'flex', gap: '9px' }}>
              <Btn variant="secondary" icon={RefreshCw} loading={refreshing} onClick={() => { setRefreshing(true); fetchBanks(); }}>Refresh</Btn>
              <Btn icon={Plus} onClick={() => { setEditBank(null); setBankModal(true); }}>Buat Bank Soal</Btn>
            </div>
          </div>

          {error && <div style={{ padding: '14px 18px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '12px', color: '#DC2626', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}><AlertCircle size={14} />{error}</div>}

          {/* Toolbar */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
              <Search size={13} style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
              <input type="text" placeholder="Cari bank soal atau mapel..." value={search} onChange={e => setSearch(e.target.value)}
                style={{ width: '100%', padding: '9px 12px 9px 32px', borderRadius: '10px', border: '1.5px solid #E2E8F0', background: '#F8FAFC', fontSize: '13px', color: '#0F172A', outline: 'none', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box', transition: 'border-color .15s' }}
                onFocus={e => { e.target.style.borderColor = '#4F46E5'; e.target.style.boxShadow = '0 0 0 3px rgba(79,70,229,.1)'; }}
                onBlur={e => { e.target.style.borderColor = '#E2E8F0'; e.target.style.boxShadow = 'none'; }} />
            </div>
            {subjects.length > 0 && (
              <div style={{ position: 'relative' }}>
                <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)}
                  style={{ padding: '9px 28px 9px 11px', borderRadius: '10px', border: '1.5px solid #E2E8F0', background: '#F8FAFC', fontSize: '13px', color: filterSubject !== 'all' ? '#0F172A' : '#94A3B8', outline: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", appearance: 'none' }}>
                  <option value="all">Semua Mapel</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <ChevronDown size={12} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
              </div>
            )}
            <span style={{ fontSize: '12px', color: '#94A3B8' }}>{filteredBanks.length} bank soal</span>
          </div>

          {/* Bank Cards Grid */}
          {loading
            ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} style={{ background: '#fff', borderRadius: '16px', border: '1px solid #F1F5F9', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <Shimmer h={18} w="70%" /><Shimmer h={13} w="50%" /><Shimmer h={13} w="40%" />
                  </div>
                ))}
              </div>
            : filteredBanks.length === 0
            ? <div style={{ padding: '64px 20px', textAlign: 'center', background: '#fff', borderRadius: '16px', border: '1px solid #F1F5F9' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>📚</div>
                <div style={{ fontFamily: 'Sora, sans-serif', fontSize: '16px', fontWeight: '700', color: '#0F172A', marginBottom: '6px' }}>Belum ada bank soal</div>
                <div style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '20px' }}>Buat bank soal pertama untuk mulai menambahkan soal</div>
                <Btn icon={Plus} onClick={() => { setEditBank(null); setBankModal(true); }}>Buat Bank Soal</Btn>
              </div>
            : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
                {filteredBanks.map((bank, idx) => (
                  <div key={bank.id} className="bank-card"
                    style={{ background: '#fff', borderRadius: '16px', border: '1px solid #F1F5F9', padding: '20px', cursor: 'pointer', transition: 'all .2s', boxShadow: '0 1px 4px rgba(0,0,0,.03)', opacity: 0, animation: `fadeUp .35s ease ${idx * 40}ms forwards`, position: 'relative' }}
                    onClick={() => openBank(bank)}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <BookOpen size={18} style={{ color: '#4F46E5' }} />
                      </div>
                      <div onClick={e => e.stopPropagation()}>
                        <ActionMenu items={[
                          { icon: Edit2,  label: 'Edit',  action: () => { setEditBank(bank); setBankModal(true); } },
                          { icon: Trash2, label: 'Hapus', action: () => handleDeleteBank(bank), color: '#DC2626' },
                        ]} />
                      </div>
                    </div>
                    <h3 style={{ fontFamily: 'Sora, sans-serif', fontSize: '14px', fontWeight: '700', color: '#0F172A', margin: '0 0 5px', lineHeight: 1.3 }}>{bank.name}</h3>
                    <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '12px' }}>
                      {bank.subjects?.name || '—'} {bank.subjects?.code && `· ${bank.subjects.code}`}
                    </div>
                    {bank.description && (
                      <div style={{ fontSize: '12px', color: '#94A3B8', lineHeight: 1.5, marginBottom: '12px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{bank.description}</div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid #F8FAFC' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: '#4F46E5', fontFamily: 'Sora, sans-serif' }}>{bank.total_questions}</span>
                        <span style={{ fontSize: '12px', color: '#94A3B8' }}>soal</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: '11px', fontWeight: '600', color: '#94A3B8', background: '#F8FAFC', padding: '2px 8px', borderRadius: '999px' }}>{bank.exam_type}</span>
                        <ChevronRight size={13} style={{ color: '#CBD5E1' }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
          }
        </>}

        {/* ── VIEW: QUESTIONS ── */}
        {view === 'questions' && activeBank && <>

          {/* Header */}
          <div style={{ opacity: 0, animation: 'fadeUp .35s ease forwards' }}>
            <button onClick={backToList} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#64748B', background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 8px', fontFamily: "'DM Sans', sans-serif", fontWeight: '500' }}>
              <ArrowLeft size={14} /> Kembali ke Bank Soal
            </button>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: '20px', fontWeight: '700', color: '#0F172A', margin: '0 0 4px' }}>{activeBank.name}</h1>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: '#64748B' }}>{activeBank.subjects?.name || '—'}</span>
                  <span style={{ color: '#CBD5E1' }}>·</span>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: '#94A3B8', background: '#F8FAFC', padding: '2px 8px', borderRadius: '999px' }}>{activeBank.exam_type}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '9px' }}>
                <Btn variant="secondary" icon={RefreshCw} loading={qLoading} onClick={() => fetchQuestions(activeBank.id)} sm>Refresh</Btn>
                <Btn variant="secondary" icon={Upload} onClick={() => setBulkModal(true)} sm>Import CSV</Btn>
                <Btn icon={Plus} onClick={() => { setEditQ(null); setQModal(true); }}>Tambah Soal</Btn>
              </div>
            </div>
          </div>

          {/* Stats pills */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', opacity: 0, animation: 'fadeUp .35s ease 60ms forwards' }}>
            {[
              { label: 'Total',         value: qStats.total,  color: '#4F46E5', bg: '#EEF2FF' },
              { label: 'Pilihan Ganda', value: qStats.mc,     color: '#4F46E5', bg: '#EEF2FF' },
              { label: 'Essay',         value: qStats.essay,  color: '#0891B2', bg: '#EFF6FF' },
              { label: 'Benar/Salah',   value: qStats.tf,     color: '#7C3AED', bg: '#F5F3FF' },
              { label: 'Mudah',         value: qStats.easy,   color: '#16A34A', bg: '#F0FDF4' },
              { label: 'Sedang',        value: qStats.medium, color: '#D97706', bg: '#FFFBEB' },
              { label: 'Sulit',         value: qStats.hard,   color: '#DC2626', bg: '#FEF2F2' },
            ].map(p => (
              <div key={p.label} style={{ padding: '5px 12px', borderRadius: '999px', background: p.bg, color: p.color, fontSize: '12px', fontWeight: '600' }}>
                {p.label}: <span style={{ fontFamily: 'Sora, sans-serif', fontWeight: '700' }}>{p.value}</span>
              </div>
            ))}
          </div>

          {/* Filter toolbar */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', opacity: 0, animation: 'fadeUp .35s ease 100ms forwards' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
              <Search size={13} style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
              <input type="text" placeholder="Cari teks soal..." value={search} onChange={e => setSearch(e.target.value)}
                style={{ width: '100%', padding: '9px 12px 9px 32px', borderRadius: '10px', border: '1.5px solid #E2E8F0', background: '#F8FAFC', fontSize: '13px', color: '#0F172A', outline: 'none', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' }}
                onFocus={e => { e.target.style.borderColor = '#4F46E5'; e.target.style.boxShadow = '0 0 0 3px rgba(79,70,229,.1)'; }}
                onBlur={e => { e.target.style.borderColor = '#E2E8F0'; e.target.style.boxShadow = 'none'; }} />
            </div>
            {[
              { value: filterType, set: setFilterType, placeholder: 'Semua Tipe', options: Object.entries(TYPE_META).map(([v, m]) => ({ value: v, label: m.label })) },
              { value: filterDiff, set: setFilterDiff, placeholder: 'Semua Kesulitan', options: DIFFICULTIES.map(d => ({ value: d, label: DIFF_META[d].label })) },
            ].map((f, i) => (
              <div key={i} style={{ position: 'relative' }}>
                <select value={f.value} onChange={e => f.set(e.target.value)}
                  style={{ padding: '9px 28px 9px 11px', borderRadius: '10px', border: '1.5px solid #E2E8F0', background: '#F8FAFC', fontSize: '13px', color: f.value !== 'all' ? '#0F172A' : '#94A3B8', outline: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", appearance: 'none' }}>
                  <option value="all">{f.placeholder}</option>
                  {f.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <ChevronDown size={12} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
              </div>
            ))}
            <span style={{ fontSize: '12px', color: '#94A3B8', alignSelf: 'center' }}>{filteredQ.length} dari {questions.length} soal</span>
          </div>

          {/* Question list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', opacity: 0, animation: 'fadeUp .35s ease 140ms forwards' }}>
            {qLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} style={{ background: '#fff', borderRadius: '12px', border: '1px solid #F1F5F9', padding: '16px', display: 'flex', gap: '12px' }}>
                    <Shimmer w="28px" h={28} r={8} /><div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}><Shimmer h={14} /><Shimmer h={12} w="60%" /></div>
                  </div>
                ))
              : filteredQ.length === 0
              ? <div style={{ padding: '48px 20px', textAlign: 'center', background: '#fff', borderRadius: '16px', border: '1px solid #F1F5F9' }}>
                  <div style={{ fontSize: '32px', marginBottom: '10px' }}>📝</div>
                  <div style={{ fontFamily: 'Sora, sans-serif', fontSize: '15px', fontWeight: '700', color: '#0F172A', marginBottom: '6px' }}>
                    {search || filterType !== 'all' || filterDiff !== 'all' ? 'Tidak ada soal yang cocok' : 'Belum ada soal'}
                  </div>
                  <div style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '20px' }}>
                    {search || filterType !== 'all' || filterDiff !== 'all' ? 'Coba ubah filter pencarian' : 'Tambahkan soal pertama untuk bank soal ini'}
                  </div>
                  {!search && filterType === 'all' && filterDiff === 'all' && <Btn icon={Plus} onClick={() => { setEditQ(null); setQModal(true); }}>Tambah Soal</Btn>}
                </div>
              : filteredQ.map((q, i) => (
                  <div key={q.id} style={{ position: 'relative' }}>
                    <QuestionPreview question={q} number={i + 1} />
                    <div style={{ position: 'absolute', top: '12px', right: '12px' }} onClick={e => e.stopPropagation()}>
                      <ActionMenu items={[
                        { icon: Edit2,  label: 'Edit',  action: () => { setEditQ(q); setQModal(true); } },
                        { icon: Trash2, label: 'Hapus', action: () => handleDeleteQuestion(q), color: '#DC2626' },
                      ]} />
                    </div>
                  </div>
                ))
            }
          </div>

          {/* Floating add button */}
          {!qLoading && questions.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: '8px' }}>
              <Btn icon={Plus} onClick={() => { setEditQ(null); setQModal(true); }}>Tambah Soal Lagi</Btn>
            </div>
          )}
        </>}
      </div>

      {/* Modals */}
      <BankModal open={bankModal} bank={editBank} subjects={subjects} schoolId={profile?.school_id} teacherId={profile?.id}
        onClose={() => { setBankModal(false); setEditBank(null); }}
        onSaved={() => { fetchBanks(); showToast(editBank ? 'Bank soal diperbarui' : 'Bank soal berhasil dibuat'); }} />

      <QuestionEditor open={qModal} question={editQ} bankId={activeBank?.id}
        onClose={() => { setQModal(false); setEditQ(null); }}
        onSaved={() => {
          fetchQuestions(activeBank?.id);
          fetchBanks();
          showToast(editQ ? 'Soal diperbarui' : 'Soal berhasil ditambahkan');
        }} />

      <BulkImportModal open={bulkModal} bankId={activeBank?.id}
        onClose={() => setBulkModal(false)}
        onImported={() => { fetchQuestions(activeBank?.id); fetchBanks(); showToast('Import soal berhasil!'); setBulkModal(false); }} />

      <ConfirmDialog {...confirm} loading={actLoading} />
      {toast && <Toast {...toast} />}
    </>
  );
};

export default QuestionBank;