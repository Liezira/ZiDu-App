import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  FileText, Search, Download, ChevronDown,
  RefreshCw, X, Users, TrendingUp, Award,
  BookOpen, ClipboardCheck, MessageSquare,
  Star, AlertCircle, Printer,
} from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────
const todayISO  = () => new Date().toISOString().slice(0, 10);
const fmtShort  = (iso) => iso ? new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const fmtFull   = (iso) => iso ? new Date(iso).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '—';

const EXAM_TYPE_LABEL = {
  ulangan_harian: 'Ulangan Harian',
  uts: 'UTS',
  uas: 'UAS',
  try_out: 'Try Out',
  remedial: 'Remedial',
};

const Shimmer = ({ h = 52 }) => (
  <div style={{ height: h, borderRadius: 10, background: 'linear-gradient(90deg,#F1F5F9 25%,#E2E8F0 50%,#F1F5F9 75%)', backgroundSize: '600px 100%', animation: 'shimmer 1.2s infinite' }} />
);

// ── PDF generator ─────────────────────────────────────────────
const generatePDF = (data, comment, periode) => {
  const { student, class: cls, school, grades, attendance, ranking } = data;

  // Group nilai by subject
  const bySubject = {};
  (grades || []).forEach(g => {
    const key = g.subject_name || 'Umum';
    if (!bySubject[key]) bySubject[key] = { code: g.subject_code, exams: [] };
    bySubject[key].exams.push(g);
  });

  const subjectRows = Object.entries(bySubject).map(([subj, val]) => {
    const avg = val.exams.length
      ? Math.round(val.exams.reduce((a, e) => a + (e.score || 0), 0) / val.exams.length)
      : 0;
    const examCols = val.exams.map(e =>
      `<td style="padding:6px 10px;text-align:center;border:1px solid #E2E8F0">
        <div style="font-weight:700;color:${e.score >= (e.passing_score||75) ? '#16A34A' : '#DC2626'}">${e.score ?? '—'}</div>
        <div style="font-size:10px;color:#94A3B8">${EXAM_TYPE_LABEL[e.exam_type] || e.exam_type}</div>
      </td>`
    ).join('');
    return `<tr>
      <td style="padding:7px 10px;font-weight:600;border:1px solid #E2E8F0">${subj}</td>
      <td style="padding:7px 10px;color:#64748B;text-align:center;border:1px solid #E2E8F0">${val.code || '—'}</td>
      ${examCols}
      <td style="padding:7px 10px;text-align:center;font-weight:800;font-size:15px;border:1px solid #E2E8F0;background:#F8FAFC;color:${avg >= 75 ? '#16A34A' : '#DC2626'}">${avg}</td>
    </tr>`;
  }).join('');

  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
  <title>Rapor — ${student.name}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; color: #0F172A; padding: 32px; background: #fff; }
    .header { text-align: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 3px solid #0F172A; }
    .header h1 { font-size: 18px; font-weight: 800; letter-spacing: .02em; }
    .header h2 { font-size: 13px; font-weight: 400; color: #475569; margin-top: 2px; }
    .badge { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
    .info-box { background: #F8FAFC; border-radius: 10px; padding: 14px 16px; }
    .info-box h3 { font-size: 11px; font-weight: 700; color: #94A3B8; letter-spacing: .06em; margin-bottom: 10px; }
    .info-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
    .info-label { color: #64748B; font-size: 12px; }
    .info-val { font-weight: 600; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
    th { background: #0F172A; color: #fff; padding: 9px 10px; text-align: center; font-size: 11px; font-weight: 700; border: 1px solid #0F172A; }
    th.left { text-align: left; }
    .section-title { font-size: 12px; font-weight: 700; color: #475569; letter-spacing: .06em; margin: 20px 0 8px; }
    .att-grid { display: grid; grid-template-columns: repeat(5,1fr); gap: 10px; margin-bottom: 20px; }
    .att-card { text-align: center; padding: 12px 8px; border-radius: 10px; }
    .att-num { font-size: 20px; font-weight: 800; }
    .att-lbl { font-size: 10px; font-weight: 700; margin-top: 2px; }
    .rank-box { background: linear-gradient(135deg,#1E3A5F,#2563EB); color:#fff; border-radius:10px; padding:16px 20px; display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; }
    .rank-num { font-size: 40px; font-weight: 800; line-height: 1; }
    .comment-box { background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 10px; padding: 14px 16px; margin-bottom: 20px; }
    .footer { margin-top: 32px; display: flex; justify-content: flex-end; }
    .sign-box { text-align: center; }
    .sign-line { width: 160px; border-top: 1.5px solid #0F172A; margin-top: 48px; padding-top: 6px; font-size: 12px; font-weight: 600; }
    @media print { body { padding: 16px; } }
  </style>
  </head><body>

  <div class="header">
    <h1>${school?.name || 'Nama Sekolah'}</h1>
    <h2>LAPORAN HASIL BELAJAR SISWA</h2>
    <div style="margin-top:6px;color:#475569;font-size:12px">${periode || `${fmtShort(data.period?.date_from)} s/d ${fmtShort(data.period?.date_to)}`}</div>
  </div>

  <div class="info-grid">
    <div class="info-box">
      <h3>DATA SISWA</h3>
      <div class="info-row"><span class="info-label">Nama</span><span class="info-val">${student.name}</span></div>
      <div class="info-row"><span class="info-label">NIS</span><span class="info-val">${student.nis || '—'}</span></div>
      <div class="info-row"><span class="info-label">Kelas</span><span class="info-val">${cls?.name || '—'}</span></div>
      <div class="info-row"><span class="info-label">Tahun Ajaran</span><span class="info-val">${cls?.academic_year || '—'}</span></div>
    </div>
    <div class="info-box">
      <h3>RINGKASAN NILAI</h3>
      <div class="info-row"><span class="info-label">Rata-rata Nilai</span><span class="info-val" style="font-size:16px;color:${(ranking?.avg_score||0) >= 75 ? '#16A34A' : '#DC2626'}">${ranking?.avg_score || 0}</span></div>
      <div class="info-row"><span class="info-label">Ranking Kelas</span><span class="info-val">${ranking?.rank || '—'} / ${ranking?.total_siswa || '—'}</span></div>
      <div class="info-row"><span class="info-label">Jumlah Ujian</span><span class="info-val">${(grades||[]).length}</span></div>
      <div class="info-row"><span class="info-label">% Kehadiran</span><span class="info-val" style="color:${(attendance?.pct_hadir||0) >= 75 ? '#16A34A' : '#DC2626'}">${attendance?.pct_hadir || 0}%</span></div>
    </div>
  </div>

  <div class="section-title">NILAI UJIAN PER MATA PELAJARAN</div>
  ${Object.keys(bySubject).length === 0
    ? '<p style="color:#94A3B8;font-size:12px;padding:12px 0">Belum ada nilai ujian dalam periode ini.</p>'
    : `<table>
      <thead><tr>
        <th class="left">Mata Pelajaran</th>
        <th>Kode</th>
        ${(Object.values(bySubject)[0]?.exams || []).map((_, i) => `<th>Ujian ${i+1}</th>`).join('')}
        <th>Rata-rata</th>
      </tr></thead>
      <tbody>${subjectRows}</tbody>
    </table>`
  }

  <div class="section-title">REKAP KEHADIRAN</div>
  <div class="att-grid">
    <div class="att-card" style="background:#F0FDF4">
      <div class="att-num" style="color:#16A34A">${attendance?.total_hadir || 0}</div>
      <div class="att-lbl" style="color:#16A34A">HADIR</div>
    </div>
    <div class="att-card" style="background:#EFF6FF">
      <div class="att-num" style="color:#0891B2">${attendance?.total_izin || 0}</div>
      <div class="att-lbl" style="color:#0891B2">IZIN</div>
    </div>
    <div class="att-card" style="background:#FFFBEB">
      <div class="att-num" style="color:#D97706">${attendance?.total_sakit || 0}</div>
      <div class="att-lbl" style="color:#D97706">SAKIT</div>
    </div>
    <div class="att-card" style="background:#FEF2F2">
      <div class="att-num" style="color:#DC2626">${attendance?.total_alpha || 0}</div>
      <div class="att-lbl" style="color:#DC2626">ALPHA</div>
    </div>
    <div class="att-card" style="background:#F8FAFC">
      <div class="att-num" style="color:#475569">${attendance?.total_sesi || 0}</div>
      <div class="att-lbl" style="color:#475569">TOTAL SESI</div>
    </div>
  </div>

  <div class="rank-box">
    <div>
      <div style="font-size:11px;font-weight:700;opacity:.7;letter-spacing:.08em">RANKING KELAS</div>
      <div style="display:flex;align-items:baseline;gap:8px;margin-top:4px">
        <div class="rank-num">${ranking?.rank || '—'}</div>
        <div style="font-size:13px;opacity:.8">dari ${ranking?.total_siswa || '—'} siswa</div>
      </div>
    </div>
    <div style="text-align:right">
      <div style="font-size:11px;opacity:.7;font-weight:700;letter-spacing:.08em">RATA-RATA NILAI</div>
      <div style="font-size:36px;font-weight:800;margin-top:2px">${ranking?.avg_score || 0}</div>
    </div>
  </div>

  ${comment ? `
  <div class="section-title">CATATAN GURU</div>
  <div class="comment-box">
    <p style="font-style:italic;color:#92400E;line-height:1.7">"${comment}"</p>
  </div>` : ''}

  <div class="footer">
    <div class="sign-box">
      <div style="font-size:12px;color:#64748B">Dicetak: ${fmtFull(todayISO())}</div>
      <div class="sign-line">Wali Kelas</div>
    </div>
  </div>

  <script>window.onload = () => window.print();</script>
  </body></html>`);
  win.document.close();
};

// ── Comment Modal ─────────────────────────────────────────────
const CommentModal = ({ student, periode, existingComment, profile, onClose, onSaved }) => {
  const [catatan, setCatatan] = useState(existingComment?.catatan || '');
  const [saving,  setSaving]  = useState(false);
  const [err,     setErr]     = useState('');

  const handleSave = async () => {
    if (!catatan.trim()) { setErr('Catatan tidak boleh kosong'); return; }
    setSaving(true); setErr('');
    try {
      const payload = {
        school_id:  profile.school_id,
        teacher_id: profile.id,
        student_id: student.id,
        class_id:   student.class_id,
        periode,
        catatan: catatan.trim(),
        updated_at: new Date().toISOString(),
      };
      if (existingComment?.id) {
        const { error } = await supabase.from('report_comments').update({ catatan: catatan.trim(), updated_at: payload.updated_at }).eq('id', existingComment.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('report_comments').insert(payload);
        if (error) throw error;
      }
      onSaved(catatan.trim());
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,.5)', zIndex:1100, display:'flex', alignItems:'center', justifyContent:'center', padding:20, backdropFilter:'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:'#fff', borderRadius:18, width:'100%', maxWidth:440, boxShadow:'0 24px 64px rgba(0,0,0,.18)', animation:'slideUp .22s ease', overflow:'hidden' }}>
        <div style={{ padding:'18px 22px', borderBottom:'1px solid #F1F5F9', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ display:'flex', alignItems:'center', gap:9 }}>
            <MessageSquare size={14} color="#7C3AED" />
            <h2 style={{ fontFamily:'Sora,sans-serif', fontSize:15, fontWeight:700, color:'#0F172A', margin:0 }}>Catatan Guru</h2>
          </div>
          <button onClick={onClose} style={{ width:28, height:28, borderRadius:7, border:'none', background:'#F8FAFC', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <X size={13} color="#64748B" />
          </button>
        </div>
        <div style={{ padding:'18px 22px' }}>
          <p style={{ fontSize:12, color:'#64748B', margin:'0 0 12px' }}>
            Catatan untuk <strong style={{ color:'#0F172A' }}>{student.name}</strong> · {periode}
          </p>
          <textarea
            value={catatan}
            onChange={e => setCatatan(e.target.value)}
            placeholder="Tulis catatan perkembangan siswa, sikap, dan rekomendasi..."
            rows={5}
            style={{ width:'100%', padding:'10px 12px', borderRadius:9, border:'1.5px solid #E2E8F0', fontSize:13, color:'#0F172A', outline:'none', resize:'vertical', fontFamily:"'DM Sans',sans-serif", lineHeight:1.6, boxSizing:'border-box' }}
          />
          {err && <div style={{ marginTop:8, color:'#DC2626', fontSize:12 }}>{err}</div>}
        </div>
        <div style={{ padding:'0 22px 18px', display:'flex', justifyContent:'flex-end', gap:10 }}>
          <button onClick={onClose} style={{ padding:'9px 18px', borderRadius:9, border:'1.5px solid #E2E8F0', background:'#fff', fontSize:13, fontWeight:600, color:'#475569', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>Batal</button>
          <button onClick={handleSave} disabled={saving}
            style={{ padding:'9px 20px', borderRadius:9, border:'none', background: saving ? '#E2E8F0' : '#7C3AED', fontSize:13, fontWeight:700, color: saving ? '#94A3B8' : '#fff', cursor: saving ? 'not-allowed' : 'pointer', display:'flex', alignItems:'center', gap:7, fontFamily:"'DM Sans',sans-serif" }}>
            {saving ? <><div style={{ width:12, height:12, borderRadius:'50%', border:'2px solid rgba(255,255,255,.3)', borderTopColor:'#fff', animation:'spin .7s linear infinite' }} />Menyimpan…</> : <><MessageSquare size={12} />Simpan Catatan</>}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Report Card Preview Drawer ────────────────────────────────
const ReportDrawer = ({ student, dateFrom, dateTo, periode, profile, onClose }) => {
  const [data,    setData]    = useState(null);
  const [comment, setComment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err,     setErr]     = useState('');
  const [showCommentModal, setShowCommentModal] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const [rcRes, cmtRes] = await Promise.all([
        supabase.rpc('get_report_card', {
          p_student_id: student.id,
          p_date_from:  dateFrom,
          p_date_to:    dateTo,
        }),
        supabase.from('report_comments')
          .select('id, catatan')
          .eq('student_id', student.id)
          .eq('periode', periode)
          .maybeSingle(),
      ]);
      if (rcRes.error) throw rcRes.error;
      setData(rcRes.data);
      setComment(cmtRes.data);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }, [student.id, dateFrom, dateTo, periode]);

  useEffect(() => { loadData(); }, [loadData]);

  const handlePrint = () => {
    if (!data) return;
    generatePDF(data, comment?.catatan || '', periode);
  };

  const rc = data;
  const att = rc?.attendance || {};
  const rnk = rc?.ranking || {};

  // Group grades by subject
  const bySubject = {};
  (rc?.grades || []).forEach(g => {
    const k = g.subject_name || 'Umum';
    if (!bySubject[k]) bySubject[k] = [];
    bySubject[k].push(g);
  });

  return (
    <div style={{ position:'fixed', inset:0, zIndex:1000, display:'flex', justifyContent:'flex-end' }}>
      <div style={{ position:'absolute', inset:0, background:'rgba(15,23,42,.28)' }} onClick={onClose} />
      <div style={{ position:'relative', width:'100%', maxWidth:540, height:'100%', background:'#fff', display:'flex', flexDirection:'column', boxShadow:'-8px 0 32px rgba(0,0,0,.12)', animation:'slideLeft .22s ease', overflow:'hidden' }}>

        {/* Header */}
        <div style={{ padding:'18px 22px', borderBottom:'1px solid #F1F5F9', display:'flex', justifyContent:'space-between', alignItems:'flex-start', background:'linear-gradient(135deg,#1E3A5F,#2563EB)', color:'#fff' }}>
          <div>
            <div style={{ fontSize:11, fontWeight:700, opacity:.7, letterSpacing:'.08em', marginBottom:4 }}>LAPORAN HASIL BELAJAR</div>
            <h2 style={{ fontFamily:'Sora,sans-serif', fontSize:17, fontWeight:700, margin:'0 0 3px' }}>{student.name}</h2>
            <div style={{ fontSize:12, opacity:.8 }}>NIS: {student.nis || '—'} · {student.class_name}</div>
            <div style={{ fontSize:12, opacity:.7, marginTop:2 }}>{periode}</div>
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <button onClick={handlePrint} disabled={loading || !data}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 13px', borderRadius:8, border:'1px solid rgba(255,255,255,.3)', background:'rgba(255,255,255,.15)', fontSize:12, fontWeight:700, color:'#fff', cursor: loading ? 'not-allowed' : 'pointer', backdropFilter:'blur(4px)' }}>
              <Printer size={12} />Print PDF
            </button>
            <button onClick={onClose} style={{ width:30, height:30, borderRadius:8, border:'none', background:'rgba(255,255,255,.15)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <X size={14} color="#fff" />
            </button>
          </div>
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:'20px 22px', display:'flex', flexDirection:'column', gap:20 }}>

          {loading && (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {[...Array(5)].map((_, i) => <Shimmer key={i} h={i === 0 ? 80 : 56} />)}
            </div>
          )}

          {err && <div style={{ padding:'12px 14px', background:'#FEF2F2', borderRadius:10, color:'#DC2626', fontSize:13 }}>{err}</div>}

          {!loading && data && <>

            {/* Ringkasan */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
              {[
                { label:'Rata-rata Nilai', value: rnk.avg_score || 0, color: (rnk.avg_score||0) >= 75 ? '#16A34A' : '#DC2626', bg:'#F0FDF4', icon: TrendingUp },
                { label:'Ranking Kelas',   value: `${rnk.rank || '—'}/${rnk.total_siswa || '—'}`, color:'#2563EB', bg:'#EFF6FF', icon: Award },
                { label:'Kehadiran',       value: `${att.pct_hadir || 0}%`, color: (att.pct_hadir||0) >= 75 ? '#16A34A' : '#DC2626', bg:'#FFFBEB', icon: ClipboardCheck },
              ].map(s => (
                <div key={s.label} style={{ background:s.bg, borderRadius:12, padding:'14px 12px', textAlign:'center' }}>
                  <s.icon size={16} color={s.color} style={{ margin:'0 auto 6px', display:'block' }} />
                  <div style={{ fontFamily:'Sora,sans-serif', fontSize:18, fontWeight:800, color:s.color }}>{s.value}</div>
                  <div style={{ fontSize:10, fontWeight:700, color:s.color, opacity:.8, marginTop:2 }}>{s.label.toUpperCase()}</div>
                </div>
              ))}
            </div>

            {/* Nilai per mapel */}
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:'#475569', letterSpacing:'.06em', marginBottom:10 }}>📚 NILAI UJIAN PER MATA PELAJARAN</div>
              {Object.keys(bySubject).length === 0 ? (
                <div style={{ padding:'20px', textAlign:'center', color:'#94A3B8', fontSize:13, background:'#F8FAFC', borderRadius:10 }}>
                  Belum ada nilai ujian dalam periode ini
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {Object.entries(bySubject).map(([subj, exams]) => {
                    const avg = Math.round(exams.reduce((a, e) => a + (e.score || 0), 0) / exams.length);
                    return (
                      <div key={subj} style={{ background:'#F8FAFC', borderRadius:10, padding:'12px 14px', border:'1px solid #F1F5F9' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                          <div>
                            <div style={{ fontSize:13, fontWeight:700, color:'#0F172A' }}>{subj}</div>
                            <div style={{ fontSize:11, color:'#94A3B8' }}>{exams.length} ujian</div>
                          </div>
                          <div style={{ textAlign:'right' }}>
                            <div style={{ fontFamily:'Sora,sans-serif', fontSize:20, fontWeight:800, color: avg >= 75 ? '#16A34A' : '#DC2626' }}>{avg}</div>
                            <div style={{ fontSize:10, color:'#94A3B8' }}>rata-rata</div>
                          </div>
                        </div>
                        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                          {exams.map((e, i) => (
                            <div key={i} style={{ padding:'4px 10px', borderRadius:7, background:'#fff', border:'1px solid #E2E8F0', textAlign:'center', minWidth:60 }}>
                              <div style={{ fontFamily:'Sora,sans-serif', fontSize:14, fontWeight:700, color: e.score >= (e.passing_score||75) ? '#16A34A' : '#DC2626' }}>{e.score ?? '—'}</div>
                              <div style={{ fontSize:10, color:'#94A3B8' }}>{EXAM_TYPE_LABEL[e.exam_type] || e.exam_type}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Absensi */}
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:'#475569', letterSpacing:'.06em', marginBottom:10 }}>📋 REKAP KEHADIRAN</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:8 }}>
                {[
                  { k:'total_hadir', label:'Hadir',  color:'#16A34A', bg:'#F0FDF4' },
                  { k:'total_izin',  label:'Izin',   color:'#0891B2', bg:'#EFF6FF' },
                  { k:'total_sakit', label:'Sakit',  color:'#D97706', bg:'#FFFBEB' },
                  { k:'total_alpha', label:'Alpha',  color:'#DC2626', bg:'#FEF2F2' },
                  { k:'total_sesi',  label:'Sesi',   color:'#475569', bg:'#F8FAFC' },
                ].map(s => (
                  <div key={s.k} style={{ textAlign:'center', padding:'10px 4px', background:s.bg, borderRadius:8 }}>
                    <div style={{ fontFamily:'Sora,sans-serif', fontSize:18, fontWeight:800, color:s.color }}>{att[s.k] ?? 0}</div>
                    <div style={{ fontSize:10, fontWeight:700, color:s.color }}>{s.label.toUpperCase()}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Catatan guru */}
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                <div style={{ fontSize:12, fontWeight:700, color:'#475569', letterSpacing:'.06em' }}>💬 CATATAN GURU</div>
                <button onClick={() => setShowCommentModal(true)}
                  style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 12px', borderRadius:7, border:'1px solid #E2E8F0', background:'#fff', fontSize:12, fontWeight:600, color:'#7C3AED', cursor:'pointer' }}>
                  <MessageSquare size={11} />{comment ? 'Edit' : 'Tambah'}
                </button>
              </div>
              {comment ? (
                <div style={{ background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:10, padding:'14px 16px' }}>
                  <p style={{ fontSize:13, color:'#92400E', lineHeight:1.7, margin:0, fontStyle:'italic' }}>"{comment.catatan}"</p>
                </div>
              ) : (
                <div style={{ background:'#F8FAFC', borderRadius:10, padding:'16px', textAlign:'center', color:'#94A3B8', fontSize:13, border:'1.5px dashed #E2E8F0' }}>
                  Belum ada catatan. Klik <strong>"Tambah"</strong> untuk menambahkan.
                </div>
              )}
            </div>
          </>}
        </div>
      </div>

      {showCommentModal && (
        <CommentModal
          student={student}
          periode={periode}
          existingComment={comment}
          profile={profile}
          onClose={() => setShowCommentModal(false)}
          onSaved={(txt) => {
            setComment(p => p ? { ...p, catatan: txt } : { catatan: txt });
            setShowCommentModal(false);
          }}
        />
      )}
    </div>
  );
};

// ── Main ReportCardPage ───────────────────────────────────────
export default function ReportCardPage() {
  const { profile } = useAuth();

  const [teacherClasses, setTeacherClasses] = useState([]);
  const [students,       setStudents]       = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [studLoading,    setStudLoading]    = useState(false);
  const [error,          setError]          = useState('');
  const [refreshing,     setRefreshing]     = useState(false);

  // Filter state
  const [classId,   setClassId]   = useState('');
  const [dateFrom,  setDateFrom]  = useState(() => { const d = new Date(); d.setMonth(d.getMonth()-5); return d.toISOString().slice(0,10); });
  const [dateTo,    setDateTo]    = useState(todayISO());
  const [periode,   setPeriode]   = useState('Semester 1 2025/2026');
  const [search,    setSearch]    = useState('');

  // Drawer
  const [activeStudent, setActiveStudent] = useState(null);

  // Batch export state
  const [batchLoading, setBatchLoading] = useState(false);

  // ── Load teacher classes ────────────────────────────────────
  const loadClasses = useCallback(async () => {
    if (!profile?.id) return;
    try {
      const { data: stRows } = await supabase.from('subject_teachers').select('subject_id').eq('teacher_id', profile.id);
      const subjectIds = (stRows || []).map(r => r.subject_id);
      if (!subjectIds.length) { setTeacherClasses([]); setLoading(false); return; }

      const { data: scRows } = await supabase.from('subject_classes').select('class_id').in('subject_id', subjectIds);
      const classIds = [...new Set((scRows || []).map(r => r.class_id))];
      if (!classIds.length) { setTeacherClasses([]); setLoading(false); return; }

      const { data } = await supabase.from('classes').select('id, name').in('id', classIds).order('name');
      setTeacherClasses(data || []);
      if (data?.length && !classId) setClassId(data[0].id);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, [profile?.id]);

  useEffect(() => { loadClasses(); }, [loadClasses]);

  // ── Load students when class selected ──────────────────────
  useEffect(() => {
    if (!classId) { setStudents([]); return; }
    setStudLoading(true);
    supabase.from('profiles')
      .select('id, name, nis, class_id, classes(name)')
      .eq('class_id', classId)
      .eq('role', 'student')
      .eq('status', 'active')
      .order('name')
      .then(({ data, error }) => {
        if (!error) setStudents((data || []).map(s => ({ ...s, class_name: s.classes?.name })));
        setStudLoading(false);
      });
  }, [classId]);

  const filtered = students.filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) || (s.nis || '').includes(search)
  );

  // ── Batch PDF export ────────────────────────────────────────
  const handleBatchExport = async () => {
    if (!filtered.length) return;
    setBatchLoading(true);
    try {
      // For batch, open each PDF sequentially with slight delay
      for (let i = 0; i < filtered.length; i++) {
        const { data } = await supabase.rpc('get_report_card', {
          p_student_id: filtered[i].id,
          p_date_from:  dateFrom,
          p_date_to:    dateTo,
        });
        const { data: cmt } = await supabase.from('report_comments')
          .select('catatan').eq('student_id', filtered[i].id).eq('periode', periode).maybeSingle();
        if (data) generatePDF(data, cmt?.catatan || '', periode);
        // Small delay between windows
        if (i < filtered.length - 1) await new Promise(r => setTimeout(r, 600));
      }
    } catch (e) { setError(e.message); }
    finally { setBatchLoading(false); }
  };

  const inp = { padding:'8px 12px', borderRadius:9, border:'1.5px solid #E2E8F0', fontSize:13, color:'#0F172A', outline:'none', fontFamily:"'DM Sans',sans-serif", background:'#F8FAFC', boxSizing:'border-box' };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=DM+Sans:wght@400;500;600&display=swap');
        @keyframes fadeUp   { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:none} }
        @keyframes shimmer  { 0%{background-position:-600px 0} 100%{background-position:600px 0} }
        @keyframes slideUp  { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:none} }
        @keyframes slideLeft{ from{opacity:0;transform:translateX(40px)} to{opacity:1;transform:none} }
        @keyframes spin     { to{transform:rotate(360deg)} }
        .stu-row:hover { background:#F5F3FF !important; cursor:pointer }
      `}</style>

      <div style={{ fontFamily:"'DM Sans',sans-serif", display:'flex', flexDirection:'column', gap:24 }}>

        {/* Header */}
        <div style={{ opacity:0, animation:'fadeUp .4s ease forwards', display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
              <div style={{ width:32, height:32, borderRadius:9, background:'#EFF6FF', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <FileText size={15} color="#2563EB" />
              </div>
              <h1 style={{ fontFamily:'Sora,sans-serif', fontSize:22, fontWeight:700, color:'#0F172A', margin:0 }}>Laporan Nilai</h1>
            </div>
            <p style={{ fontSize:14, color:'#64748B', margin:0 }}>Rekap nilai, absensi, dan ranking siswa per periode</p>
          </div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            <button onClick={() => { setRefreshing(true); loadClasses(); }}
              style={{ padding:'9px 13px', borderRadius:9, border:'1.5px solid #E2E8F0', background:'#fff', cursor:'pointer', display:'flex', alignItems:'center' }}>
              <RefreshCw size={13} color="#64748B" style={{ animation: refreshing ? 'spin .7s linear infinite' : 'none' }} />
            </button>
            <button onClick={handleBatchExport} disabled={batchLoading || !filtered.length}
              style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'9px 16px', borderRadius:9, border:'1.5px solid #E2E8F0', background: batchLoading ? '#F8FAFC' : '#fff', fontSize:13, fontWeight:600, color: batchLoading ? '#94A3B8' : '#475569', cursor: batchLoading || !filtered.length ? 'not-allowed' : 'pointer' }}>
              {batchLoading
                ? <><div style={{ width:12, height:12, borderRadius:'50%', border:'2px solid #E2E8F0', borderTopColor:'#4F46E5', animation:'spin .7s linear infinite' }} />Mengexport…</>
                : <><Download size={13} />Export Semua PDF</>}
            </button>
          </div>
        </div>

        {error && <div style={{ padding:14, background:'#FEF2F2', borderRadius:12, color:'#DC2626', fontSize:13, display:'flex', gap:8 }}><AlertCircle size={14} />{error}</div>}

        {/* Filter bar */}
        <div style={{ background:'#fff', borderRadius:14, border:'1px solid #F1F5F9', padding:'16px 20px', display:'flex', gap:12, flexWrap:'wrap', alignItems:'flex-end', boxShadow:'0 1px 4px rgba(0,0,0,.03)' }}>
          <div style={{ flex:'1 1 140px' }}>
            <label style={{ display:'block', fontSize:11, fontWeight:700, color:'#475569', marginBottom:5 }}>KELAS</label>
            <div style={{ position:'relative' }}>
              <select value={classId} onChange={e => setClassId(e.target.value)}
                style={{ ...inp, width:'100%', appearance:'none', paddingRight:28 }}>
                <option value="">Pilih kelas…</option>
                {teacherClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <ChevronDown size={12} color="#94A3B8" style={{ position:'absolute', right:9, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} />
            </div>
          </div>
          <div style={{ flex:'1 1 120px' }}>
            <label style={{ display:'block', fontSize:11, fontWeight:700, color:'#475569', marginBottom:5 }}>DARI TANGGAL</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ ...inp, width:'100%' }} />
          </div>
          <div style={{ flex:'1 1 120px' }}>
            <label style={{ display:'block', fontSize:11, fontWeight:700, color:'#475569', marginBottom:5 }}>SAMPAI TANGGAL</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ ...inp, width:'100%' }} />
          </div>
          <div style={{ flex:'2 1 180px' }}>
            <label style={{ display:'block', fontSize:11, fontWeight:700, color:'#475569', marginBottom:5 }}>LABEL PERIODE (UNTUK PDF)</label>
            <input value={periode} onChange={e => setPeriode(e.target.value)}
              placeholder="Semester 1 2025/2026"
              style={{ ...inp, width:'100%' }} />
          </div>
        </div>

        {/* Search */}
        <div style={{ position:'relative' }}>
          <Search size={14} color="#94A3B8" style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama atau NIS siswa…"
            style={{ ...inp, width:'100%', paddingLeft:36 }} />
        </div>

        {/* Students table */}
        {loading || studLoading ? (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {[...Array(6)].map((_, i) => <Shimmer key={i} h={60} />)}
          </div>
        ) : !classId ? (
          <div style={{ textAlign:'center', padding:'60px 20px', color:'#94A3B8' }}>
            <FileText size={36} color="#E2E8F0" style={{ marginBottom:12 }} />
            <div style={{ fontFamily:'Sora,sans-serif', fontSize:16, fontWeight:600, color:'#CBD5E1' }}>Pilih kelas untuk melihat daftar siswa</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:'center', padding:'60px 20px', color:'#94A3B8' }}>
            <Users size={36} color="#E2E8F0" style={{ marginBottom:12 }} />
            <div style={{ fontFamily:'Sora,sans-serif', fontSize:16, fontWeight:600, color:'#CBD5E1' }}>Tidak ada siswa ditemukan</div>
          </div>
        ) : (
          <div style={{ background:'#fff', borderRadius:14, border:'1px solid #F1F5F9', overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,.03)' }}>
            <div style={{ padding:'12px 18px', borderBottom:'1px solid #F1F5F9', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:13, fontWeight:600, color:'#475569' }}><strong style={{ color:'#0F172A' }}>{filtered.length}</strong> siswa · {teacherClasses.find(c=>c.id===classId)?.name}</span>
              <span style={{ fontSize:12, color:'#94A3B8' }}>Klik siswa untuk lihat rapor</span>
            </div>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'#F8FAFC', borderBottom:'1px solid #F1F5F9' }}>
                  {['No','Nama Siswa','NIS','Aksi'].map(h => (
                    <th key={h} style={{ padding:'10px 16px', textAlign: h==='Aksi' ? 'center' : 'left', fontSize:11, fontWeight:700, color:'#64748B' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => (
                  <tr key={s.id} className="stu-row" onClick={() => setActiveStudent(s)}
                    style={{ borderBottom: i < filtered.length-1 ? '1px solid #F8FAFC' : 'none', transition:'background .12s' }}>
                    <td style={{ padding:'13px 16px', fontSize:12, color:'#94A3B8' }}>{i+1}</td>
                    <td style={{ padding:'13px 16px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{ width:32, height:32, borderRadius:'50%', background:'linear-gradient(135deg,#4F46E5,#7C3AED)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:12, fontWeight:700, flexShrink:0 }}>
                          {s.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize:13, fontWeight:600, color:'#0F172A' }}>{s.name}</div>
                          <div style={{ fontSize:11, color:'#94A3B8' }}>{s.class_name}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding:'13px 16px', fontSize:13, color:'#64748B' }}>{s.nis || '—'}</td>
                    <td style={{ padding:'13px 16px', textAlign:'center' }} onClick={e => e.stopPropagation()}>
                      <button onClick={() => setActiveStudent(s)}
                        style={{ padding:'5px 14px', borderRadius:7, border:'1px solid #E2E8F0', background:'#F8FAFC', fontSize:12, fontWeight:600, color:'#2563EB', cursor:'pointer', display:'inline-flex', alignItems:'center', gap:5 }}>
                        <FileText size={11} />Lihat Rapor
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {activeStudent && (
        <ReportDrawer
          student={activeStudent}
          dateFrom={dateFrom}
          dateTo={dateTo}
          periode={periode}
          profile={profile}
          onClose={() => setActiveStudent(null)}
        />
      )}
    </>
  );
}