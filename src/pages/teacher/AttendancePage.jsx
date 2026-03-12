import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  ClipboardCheck, Plus, X, ChevronDown,
  Download, TrendingUp, Calendar, Clock,
  RefreshCw, AlertCircle, CheckCircle2,
} from 'lucide-react';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const todayISO = () => new Date().toISOString().slice(0, 10);
const nowHHMM  = () => new Date().toTimeString().slice(0, 5);

const fmtTanggal = (iso) =>
  iso ? new Date(iso).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '—';
const fmtShort = (iso) =>
  iso ? new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const fmtJam = (isoTs) =>
  isoTs ? new Date(isoTs).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB' : '—';

const STATUS = {
  hadir: { label: 'Hadir',  emoji: '✅', color: '#16A34A', bg: '#F0FDF4', border: '#86EFAC' },
  izin:  { label: 'Izin',   emoji: '📋', color: '#0891B2', bg: '#EFF6FF', border: '#BAE6FD' },
  sakit: { label: 'Sakit',  emoji: '🤒', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  alpha: { label: 'Alpha',  emoji: '❌', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
};

const JAM_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);

const Shimmer = ({ h = 52 }) => (
  <div style={{ height: h, borderRadius: 10, background: 'linear-gradient(90deg,#F1F5F9 25%,#E2E8F0 50%,#F1F5F9 75%)', backgroundSize: '600px 100%', animation: 'shimmer 1.2s infinite' }} />
);

// ─────────────────────────────────────────────
// Modal: Buat Sesi Absensi
// ─────────────────────────────────────────────
const BuatSesiModal = ({ teacherClasses, teacherSubjects, profile, onClose, onCreated }) => {
  const [classId,   setClassId]   = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [tanggal,   setTanggal]   = useState(todayISO());
  const [jamKe,     setJamKe]     = useState(1);
  const [pukul,     setPukul]     = useState(nowHHMM());
  const [catatan,   setCatatan]   = useState('');
  const [saving,    setSaving]    = useState(false);
  const [err,       setErr]       = useState('');

  const handleSimpan = async () => {
    if (!classId) { setErr('Pilih kelas terlebih dahulu'); return; }
    setSaving(true); setErr('');
    try {
      // 1. Buat sesi
      const { data: sess, error: e1 } = await supabase
        .from('attendance_sessions')
        .insert({
          school_id:  profile.school_id,
          teacher_id: profile.id,
          class_id:   classId,
          subject_id: subjectId || null,
          date:       tanggal,
          jam_ke:     jamKe,
          start_time: `${tanggal}T${pukul}:00+07:00`,
          catatan:    catatan.trim() || null,
        })
        .select('*, classes(id,name), subjects(name)')
        .single();
      if (e1) throw e1;

      // 2. Tarik semua siswa aktif di kelas, auto-alpha
      const { data: students, error: e2 } = await supabase
        .from('profiles')
        .select('id, name, nis')
        .eq('class_id', classId)
        .eq('role', 'student')
        .eq('status', 'active')
        .order('name');
      if (e2) throw e2;

      if (students.length) {
        const { error: e3 } = await supabase.from('attendance_records').insert(
          students.map(s => ({
            attendance_session_id: sess.id,
            student_id: s.id,
            status: 'alpha',
          }))
        );
        if (e3) throw e3;
      }

      onCreated({ ...sess, _students: students });
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  const inp = {
    width: '100%', boxSizing: 'border-box',
    padding: '10px 12px', borderRadius: 9,
    border: '1.5px solid #E2E8F0', fontSize: 13,
    color: '#0F172A', outline: 'none',
    fontFamily: "'DM Sans', sans-serif",
    background: '#FAFAFA',
    transition: 'border-color .15s',
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,.55)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:20, backdropFilter:'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:'#fff', borderRadius:20, width:'100%', maxWidth:480, maxHeight:'90vh', overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'0 24px 64px rgba(0,0,0,.18)', animation:'slideUp .22s ease' }}>

        {/* Header */}
        <div style={{ padding:'18px 22px', borderBottom:'1px solid #F1F5F9', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:30, height:30, borderRadius:8, background:'#F0FDF4', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <ClipboardCheck size={14} color="#16A34A" />
            </div>
            <h2 style={{ fontFamily:'Sora,sans-serif', fontSize:15, fontWeight:700, color:'#0F172A', margin:0 }}>Buat Sesi Absensi</h2>
          </div>
          <button onClick={onClose} style={{ width:30, height:30, borderRadius:8, border:'none', background:'#F8FAFC', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <X size={14} color="#64748B" />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex:1, overflowY:'auto', padding:'18px 22px', display:'flex', flexDirection:'column', gap:14 }}>

          {/* Kelas + Mapel */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div>
              <label style={{ display:'block', fontSize:11, fontWeight:700, color:'#475569', marginBottom:5 }}>KELAS *</label>
              <div style={{ position:'relative' }}>
                <select value={classId} onChange={e => setClassId(e.target.value)}
                  style={{ ...inp, appearance:'none', paddingRight:30 }}>
                  <option value="">Pilih kelas…</option>
                  {teacherClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <ChevronDown size={12} color="#94A3B8" style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} />
              </div>
            </div>
            <div>
              <label style={{ display:'block', fontSize:11, fontWeight:700, color:'#475569', marginBottom:5 }}>MATA PELAJARAN</label>
              <div style={{ position:'relative' }}>
                <select value={subjectId} onChange={e => setSubjectId(e.target.value)}
                  style={{ ...inp, appearance:'none', paddingRight:30 }}>
                  <option value="">— Opsional —</option>
                  {teacherSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <ChevronDown size={12} color="#94A3B8" style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} />
              </div>
            </div>
          </div>

          {/* Tanggal + Jam ke + Pukul */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
            <div>
              <label style={{ display:'block', fontSize:11, fontWeight:700, color:'#475569', marginBottom:5 }}>TANGGAL *</label>
              <input type="date" value={tanggal} onChange={e => setTanggal(e.target.value)} style={inp} />
            </div>
            <div>
              <label style={{ display:'block', fontSize:11, fontWeight:700, color:'#475569', marginBottom:5 }}>JAM KE- *</label>
              <div style={{ position:'relative' }}>
                <select value={jamKe} onChange={e => setJamKe(Number(e.target.value))}
                  style={{ ...inp, appearance:'none', paddingRight:28 }}>
                  {JAM_OPTIONS.map(j => <option key={j} value={j}>Jam ke-{j}</option>)}
                </select>
                <ChevronDown size={12} color="#94A3B8" style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} />
              </div>
            </div>
            <div>
              <label style={{ display:'block', fontSize:11, fontWeight:700, color:'#475569', marginBottom:5 }}>PUKUL</label>
              <input type="time" value={pukul} onChange={e => setPukul(e.target.value)} style={inp} />
            </div>
          </div>

          {/* Catatan */}
          <div>
            <label style={{ display:'block', fontSize:11, fontWeight:700, color:'#475569', marginBottom:5 }}>CATATAN <span style={{ fontWeight:400, color:'#94A3B8' }}>(opsional)</span></label>
            <input value={catatan} onChange={e => setCatatan(e.target.value)}
              placeholder="Misal: UTS, kunjungan industri, dll."
              style={inp} />
          </div>

          {/* Info */}
          <div style={{ background:'#F0FDF4', borderRadius:10, padding:'11px 13px', display:'flex', gap:8 }}>
            <CheckCircle2 size={13} color="#16A34A" style={{ flexShrink:0, marginTop:1 }} />
            <p style={{ fontSize:12, color:'#166534', margin:0, lineHeight:1.55 }}>
              Semua siswa kelas ini akan otomatis tercatat <strong>Alpha</strong>. Guru tinggal mengubah status siswa yang hadir, izin, atau sakit.
            </p>
          </div>

          {err && (
            <div style={{ padding:'10px 13px', background:'#FEF2F2', borderRadius:9, color:'#DC2626', fontSize:13, display:'flex', gap:8, alignItems:'center' }}>
              <AlertCircle size={13} />{err}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:'14px 22px', borderTop:'1px solid #F1F5F9', display:'flex', justifyContent:'flex-end', gap:10 }}>
          <button onClick={onClose}
            style={{ padding:'9px 18px', borderRadius:9, border:'1.5px solid #E2E8F0', background:'#fff', fontSize:13, fontWeight:600, color:'#475569', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
            Batal
          </button>
          <button onClick={handleSimpan} disabled={saving}
            style={{ padding:'9px 20px', borderRadius:9, border:'none', background: saving ? '#E2E8F0' : '#16A34A', fontSize:13, fontWeight:700, color: saving ? '#94A3B8' : '#fff', cursor: saving ? 'not-allowed' : 'pointer', display:'flex', alignItems:'center', gap:7, fontFamily:"'DM Sans',sans-serif" }}>
            {saving
              ? <><div style={{ width:13, height:13, borderRadius:'50%', border:'2px solid rgba(255,255,255,.3)', borderTopColor:'#fff', animation:'spin .7s linear infinite' }} />Menyimpan…</>
              : <><ClipboardCheck size={13} />Mulai Absensi</>}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Drawer: Input Absensi Siswa
// ─────────────────────────────────────────────
const InputAbsensiDrawer = ({ session, onClose, onUpdated }) => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState({});   // { [recordId]: bool }
  const [toast,   setToast]   = useState('');

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(''), 1800); };

  useEffect(() => {
    supabase
      .from('attendance_records')
      .select('id, status, student_id, profiles(name, nis)')
      .eq('attendance_session_id', session.id)
      .order('profiles(name)')
      .then(({ data, error }) => {
        if (!error) setRecords(data || []);
        setLoading(false);
      });
  }, [session.id]);

  const setStatus = async (recordId, newStatus) => {
    setSaving(p => ({ ...p, [recordId]: true }));
    const { error } = await supabase
      .from('attendance_records')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', recordId);
    if (!error) {
      setRecords(p => p.map(r => r.id === recordId ? { ...r, status: newStatus } : r));
      onUpdated?.();
      flash(STATUS[newStatus].emoji + ' ' + STATUS[newStatus].label);
    }
    setSaving(p => ({ ...p, [recordId]: false }));
  };

  const setAllHadir = async () => {
    const toUpdate = records.filter(r => r.status !== 'hadir');
    if (!toUpdate.length) return;
    await Promise.all(toUpdate.map(r =>
      supabase.from('attendance_records')
        .update({ status: 'hadir', updated_at: new Date().toISOString() })
        .eq('id', r.id)
    ));
    setRecords(p => p.map(r => ({ ...r, status: 'hadir' })));
    onUpdated?.();
    flash('✅ Semua siswa ditandai Hadir');
  };

  // Hitung ringkasan
  const counts = Object.fromEntries(Object.keys(STATUS).map(k => [k, records.filter(r => r.status === k).length]));
  const pct    = records.length ? Math.round(counts.hadir / records.length * 100) : 0;

  return (
    <div style={{ position:'fixed', inset:0, zIndex:900, display:'flex', justifyContent:'flex-end' }}>
      {/* Backdrop */}
      <div style={{ position:'absolute', inset:0, background:'rgba(15,23,42,.28)' }} onClick={onClose} />

      {/* Panel */}
      <div style={{ position:'relative', width:'100%', maxWidth:480, height:'100%', background:'#fff', display:'flex', flexDirection:'column', boxShadow:'-8px 0 32px rgba(0,0,0,.10)', animation:'slideLeft .22s ease' }}>

        {/* Toast */}
        {toast && (
          <div style={{ position:'absolute', top:14, left:'50%', transform:'translateX(-50%)', zIndex:10, padding:'7px 16px', borderRadius:10, background:'#0F172A', color:'#fff', fontSize:12, fontWeight:600, whiteSpace:'nowrap', animation:'slideUp .15s ease' }}>
            {toast}
          </div>
        )}

        {/* ── Header sticky ── */}
        <div style={{ padding:'18px 22px 14px', borderBottom:'1px solid #F1F5F9', position:'sticky', top:0, background:'#fff', zIndex:2 }}>

          {/* Judul + tutup */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
            <div>
              <div style={{ fontFamily:'Sora,sans-serif', fontSize:15, fontWeight:700, color:'#0F172A', marginBottom:5 }}>
                {session.subjects?.name
                  ? `${session.subjects.name} — ${session.classes?.name}`
                  : session.classes?.name || 'Absensi'}
              </div>
              {/* Timestamp baris */}
              <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
                <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:12, color:'#64748B' }}>
                  <Calendar size={11} color="#94A3B8" />
                  {fmtTanggal(session.date)}
                </span>
                <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:12, color:'#64748B' }}>
                  <Clock size={11} color="#94A3B8" />
                  Jam ke-<strong style={{ color:'#0F172A' }}>{session.jam_ke}</strong>
                  &nbsp;·&nbsp;{fmtJam(session.start_time)}
                </span>
              </div>
              {session.catatan && (
                <div style={{ marginTop:5, fontSize:11, color:'#94A3B8', fontStyle:'italic' }}>📝 {session.catatan}</div>
              )}
            </div>
            <button onClick={onClose}
              style={{ width:30, height:30, borderRadius:8, border:'none', background:'#F8FAFC', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <X size={14} color="#64748B" />
            </button>
          </div>

          {/* Stat chips */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6, marginBottom:10 }}>
            {Object.entries(STATUS).map(([k, v]) => (
              <div key={k} style={{ textAlign:'center', padding:'8px 4px', background:v.bg, borderRadius:8, border:`1px solid ${v.border}` }}>
                <div style={{ fontFamily:'Sora,sans-serif', fontSize:17, fontWeight:700, color:v.color }}>{counts[k]}</div>
                <div style={{ fontSize:10, fontWeight:700, color:v.color }}>{v.label.toUpperCase()}</div>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
              <span style={{ fontSize:11, color:'#64748B' }}>Kehadiran</span>
              <span style={{ fontSize:11, fontWeight:700, color: pct >= 75 ? '#16A34A' : '#DC2626' }}>{pct}%</span>
            </div>
            <div style={{ height:5, background:'#F1F5F9', borderRadius:3, overflow:'hidden' }}>
              <div style={{ width:`${pct}%`, height:'100%', background: pct >= 75 ? '#16A34A' : '#EF4444', borderRadius:3, transition:'width .4s ease' }} />
            </div>
          </div>
        </div>

        {/* ── Toolbar ── */}
        <div style={{ padding:'10px 22px', borderBottom:'1px solid #F1F5F9', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ fontSize:13, color:'#64748B' }}><strong style={{ color:'#0F172A' }}>{records.length}</strong> siswa</span>
          <button onClick={setAllHadir}
            style={{ padding:'5px 13px', borderRadius:7, border:`1px solid ${STATUS.hadir.border}`, background:STATUS.hadir.bg, fontSize:12, fontWeight:700, color:STATUS.hadir.color, cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
            ✅ Tandai Semua Hadir
          </button>
        </div>

        {/* ── Daftar siswa ── */}
        <div style={{ flex:1, overflowY:'auto', padding:'12px 22px' }}>
          {loading ? (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {[...Array(7)].map((_, i) => <Shimmer key={i} />)}
            </div>
          ) : records.length === 0 ? (
            <div style={{ textAlign:'center', padding:40, color:'#94A3B8', fontSize:13 }}>
              Tidak ada siswa aktif di kelas ini.
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {records.map((r, idx) => {
                const st = STATUS[r.status];
                return (
                  <div key={r.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 13px', borderRadius:10, background: st.bg, border:`1px solid ${r.status === 'alpha' ? st.border : '#F1F5F9'}`, transition:'background .12s' }}>

                    {/* Nomor */}
                    <div style={{ width:22, height:22, borderRadius:6, background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:'#94A3B8', flexShrink:0 }}>
                      {idx + 1}
                    </div>

                    {/* Nama + NIS */}
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:'#0F172A', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {r.profiles?.name || '—'}
                      </div>
                      <div style={{ fontSize:11, color:'#94A3B8' }}>NIS {r.profiles?.nis || '—'}</div>
                    </div>

                    {/* Status tombol */}
                    <div style={{ display:'flex', gap:3, flexShrink:0 }}>
                      {Object.entries(STATUS).map(([k, v]) => {
                        const active = r.status === k;
                        return (
                          <button key={k} onClick={() => setStatus(r.id, k)} disabled={saving[r.id]}
                            title={v.label}
                            style={{ width:34, height:30, borderRadius:7, border:`1.5px solid ${active ? v.color : '#E2E8F0'}`, background: active ? v.color : '#fff', fontSize:13, cursor: saving[r.id] ? 'wait' : 'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'all .1s', opacity: saving[r.id] ? .5 : 1 }}>
                            {v.emoji}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Modal: Rekap & Export
// ─────────────────────────────────────────────
const RekapModal = ({ teacherClasses, onClose }) => {
  const [classId,  setClassId]  = useState('');
  const [dateFrom, setDateFrom] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 10); });
  const [dateTo,   setDateTo]   = useState(todayISO());
  const [rows,     setRows]     = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [err,      setErr]      = useState('');

  const namaKelas = teacherClasses.find(c => c.id === classId)?.name || '';

  const fetch = async () => {
    if (!classId) { setErr('Pilih kelas terlebih dahulu'); return; }
    setLoading(true); setErr('');
    try {
      const { data, error } = await supabase.rpc('get_attendance_summary', {
        p_class_id: classId, p_date_from: dateFrom, p_date_to: dateTo,
      });
      if (error) throw error;
      setRows(data || []);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  };

  const exportPDF = () => {
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Rekap Absensi</title>
    <style>body{font-family:Segoe UI,sans-serif;padding:28px;color:#0F172A}h1{font-size:17px;margin:0 0 3px}p.sub{font-size:12px;color:#64748B;margin:0 0 18px}
    table{width:100%;border-collapse:collapse;font-size:12px}th{background:#F8FAFC;padding:8px 10px;text-align:left;font-size:11px;font-weight:700;border-bottom:2px solid #E2E8F0}
    td{padding:8px 10px;border-bottom:1px solid #F1F5F9}tr:nth-child(even) td{background:#FAFAFA}
    .num{text-align:center}.footer{margin-top:18px;font-size:10px;color:#94A3B8}@media print{body{padding:10px}}</style>
    </head><body>
    <h1>Rekap Absensi — ${namaKelas}</h1>
    <p class="sub">${fmtShort(dateFrom)} s/d ${fmtShort(dateTo)} &nbsp;·&nbsp; Dicetak: ${fmtShort(todayISO())}</p>
    <table><thead><tr>
      <th>No</th><th>Nama Siswa</th><th>NIS</th>
      <th class="num">✅ Hadir</th><th class="num">📋 Izin</th><th class="num">🤒 Sakit</th><th class="num">❌ Alpha</th>
      <th class="num">Total</th><th class="num">% Hadir</th>
    </tr></thead><tbody>
    ${rows.map((r, i) => `<tr>
      <td class="num" style="color:#94A3B8">${i + 1}</td>
      <td style="font-weight:600">${r.student_name}</td>
      <td style="color:#94A3B8">${r.nis || '—'}</td>
      <td class="num" style="color:#16A34A;font-weight:700">${r.total_hadir}</td>
      <td class="num" style="color:#0891B2">${r.total_izin}</td>
      <td class="num" style="color:#D97706">${r.total_sakit}</td>
      <td class="num" style="color:#DC2626">${r.total_alpha}</td>
      <td class="num" style="color:#64748B">${r.total_sesi}</td>
      <td class="num" style="font-weight:700;color:${(r.pct_hadir ?? 0) >= 75 ? '#16A34A' : '#DC2626'}">${r.pct_hadir ?? 0}%</td>
    </tr>`).join('')}
    </tbody></table>
    <div class="footer">ZiDu &nbsp;·&nbsp; ${new Date().toLocaleString('id-ID')}</div>
    <script>window.onload=()=>window.print()</script></body></html>`);
    w.document.close();
  };

  const exportCSV = () => {
    const header = 'No,Nama Siswa,NIS,Hadir,Izin,Sakit,Alpha,Total Sesi,% Hadir\n';
    const body   = rows.map((r, i) => `${i+1},"${r.student_name}","${r.nis||''}",${r.total_hadir},${r.total_izin},${r.total_sakit},${r.total_alpha},${r.total_sesi},${r.pct_hadir??0}`).join('\n');
    const a = document.createElement('a');
    a.href     = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(header + body);
    a.download = `rekap-absensi-${namaKelas.replace(/\s+/g,'-')}-${dateFrom}.csv`;
    a.click();
  };

  const inp = { padding:'8px 11px', borderRadius:8, border:'1.5px solid #E2E8F0', fontSize:13, color:'#0F172A', outline:'none', fontFamily:"'DM Sans',sans-serif", boxSizing:'border-box', background:'#FAFAFA' };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,.55)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:20, backdropFilter:'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:'#fff', borderRadius:20, width:'100%', maxWidth:720, maxHeight:'90vh', overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'0 24px 64px rgba(0,0,0,.18)', animation:'slideUp .22s ease' }}>

        <div style={{ padding:'18px 22px', borderBottom:'1px solid #F1F5F9', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h2 style={{ fontFamily:'Sora,sans-serif', fontSize:15, fontWeight:700, color:'#0F172A', margin:0 }}>📊 Rekap Absensi</h2>
          <button onClick={onClose} style={{ width:30, height:30, borderRadius:8, border:'none', background:'#F8FAFC', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <X size={14} color="#64748B" />
          </button>
        </div>

        {/* Filter */}
        <div style={{ padding:'12px 22px', borderBottom:'1px solid #F1F5F9', display:'flex', gap:10, flexWrap:'wrap', alignItems:'flex-end' }}>
          <div>
            <label style={{ display:'block', fontSize:11, fontWeight:700, color:'#475569', marginBottom:4 }}>KELAS</label>
            <div style={{ position:'relative' }}>
              <select value={classId} onChange={e => setClassId(e.target.value)}
                style={{ ...inp, appearance:'none', paddingRight:28, minWidth:150 }}>
                <option value="">Pilih kelas…</option>
                {teacherClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <ChevronDown size={12} color="#94A3B8" style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} />
            </div>
          </div>
          <div>
            <label style={{ display:'block', fontSize:11, fontWeight:700, color:'#475569', marginBottom:4 }}>DARI</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={inp} />
          </div>
          <div>
            <label style={{ display:'block', fontSize:11, fontWeight:700, color:'#475569', marginBottom:4 }}>SAMPAI</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={inp} />
          </div>
          <button onClick={fetch} disabled={loading}
            style={{ padding:'8px 16px', borderRadius:8, border:'none', background: loading ? '#E2E8F0' : '#4F46E5', fontSize:13, fontWeight:700, color: loading ? '#94A3B8' : '#fff', cursor: loading ? 'not-allowed' : 'pointer', display:'flex', alignItems:'center', gap:6, fontFamily:"'DM Sans',sans-serif", alignSelf:'flex-end' }}>
            {loading ? <><div style={{ width:12, height:12, borderRadius:'50%', border:'2px solid rgba(255,255,255,.3)', borderTopColor:'#fff', animation:'spin .7s linear infinite' }} />Memuat…</> : 'Tampilkan'}
          </button>
          {rows.length > 0 && <>
            <button onClick={exportPDF} style={{ padding:'8px 13px', borderRadius:8, border:'1.5px solid #E2E8F0', background:'#fff', fontSize:13, fontWeight:600, color:'#475569', cursor:'pointer', display:'flex', alignItems:'center', gap:5, alignSelf:'flex-end' }}>
              <Download size={13} />PDF
            </button>
            <button onClick={exportCSV} style={{ padding:'8px 13px', borderRadius:8, border:'1.5px solid #E2E8F0', background:'#fff', fontSize:13, fontWeight:600, color:'#475569', cursor:'pointer', display:'flex', alignItems:'center', gap:5, alignSelf:'flex-end' }}>
              <Download size={13} />CSV
            </button>
          </>}
        </div>

        {err && <div style={{ margin:'10px 22px 0', padding:'9px 12px', background:'#FEF2F2', borderRadius:9, color:'#DC2626', fontSize:13 }}>{err}</div>}

        <div style={{ flex:1, overflowY:'auto', padding:'14px 22px' }}>
          {rows.length === 0 ? (
            <div style={{ textAlign:'center', padding:48, color:'#94A3B8' }}>
              <TrendingUp size={34} color="#E2E8F0" style={{ marginBottom:10 }} />
              <div style={{ fontSize:13 }}>Pilih kelas &amp; rentang tanggal, lalu klik Tampilkan</div>
            </div>
          ) : (
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                <thead>
                  <tr style={{ background:'#F8FAFC' }}>
                    {['No','Nama Siswa','NIS','✅','📋','🤒','❌','Sesi','% Hadir'].map(h => (
                      <th key={h} style={{ padding:'9px 11px', textAlign: ['No','Nama Siswa','NIS'].includes(h) ? 'left' : 'center', fontSize:11, fontWeight:700, color:'#475569', borderBottom:'2px solid #E2E8F0', whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={r.student_id} style={{ background: i%2===0 ? '#fff' : '#FAFAFA' }}>
                      <td style={{ padding:'9px 11px', color:'#94A3B8', fontSize:12 }}>{i+1}</td>
                      <td style={{ padding:'9px 11px', fontWeight:600, color:'#0F172A' }}>{r.student_name}</td>
                      <td style={{ padding:'9px 11px', color:'#94A3B8', fontSize:12 }}>{r.nis||'—'}</td>
                      <td style={{ padding:'9px 11px', textAlign:'center', fontWeight:700, color:'#16A34A' }}>{r.total_hadir}</td>
                      <td style={{ padding:'9px 11px', textAlign:'center', color:'#0891B2' }}>{r.total_izin}</td>
                      <td style={{ padding:'9px 11px', textAlign:'center', color:'#D97706' }}>{r.total_sakit}</td>
                      <td style={{ padding:'9px 11px', textAlign:'center', color:'#DC2626' }}>{r.total_alpha}</td>
                      <td style={{ padding:'9px 11px', textAlign:'center', color:'#64748B' }}>{r.total_sesi}</td>
                      <td style={{ padding:'9px 11px', textAlign:'center' }}>
                        <span style={{ fontFamily:'Sora,sans-serif', fontSize:14, fontWeight:800, color:(r.pct_hadir??0)>=75 ? '#16A34A' : '#DC2626' }}>
                          {r.pct_hadir??0}%
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

// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────
export default function AttendancePage() {
  const { profile } = useAuth();

  const [sessions,        setSessions]        = useState([]);
  const [teacherClasses,  setTeacherClasses]  = useState([]);
  const [teacherSubjects, setTeacherSubjects] = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [refreshing,      setRefreshing]      = useState(false);
  const [error,           setError]           = useState('');

  const [showBuat,  setShowBuat]  = useState(false);
  const [activeSess,setActiveSess]= useState(null);   // sesi yg di-input
  const [showRekap, setShowRekap] = useState(false);
  const [toast,     setToast]     = useState('');

  // Filter
  const [fClass, setFClass] = useState('all');
  const [fDate,  setFDate]  = useState('');

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  // ── Fetch data ──────────────────────────────
  const load = useCallback(async () => {
    if (!profile?.id || !profile?.school_id) return;
    try {
      // Step 1: subject_ids guru
      const { data: stRows } = await supabase
        .from('subject_teachers')
        .select('subject_id')
        .eq('teacher_id', profile.id);

      const subjectIds = (stRows || []).map(r => r.subject_id);

      // Step 2: class_ids dari subject_classes
      let classIds = [];
      if (subjectIds.length) {
        const { data: scRows } = await supabase
          .from('subject_classes')
          .select('class_id')
          .in('subject_id', subjectIds);
        classIds = [...new Set((scRows || []).map(r => r.class_id))];
      }

      // Step 3: fetch paralel — kelas, mapel, dan sesi absensi
      const [sessRes, classRes, subjRes] = await Promise.all([
        supabase.from('attendance_sessions')
          .select('id, date, jam_ke, start_time, catatan, class_id, subject_id, classes(name), subjects(name)')
          .eq('teacher_id', profile.id)
          .order('date',   { ascending: false })
          .order('jam_ke', { ascending: true })
          .limit(100),

        classIds.length
          ? supabase.from('classes').select('id, name').in('id', classIds).order('name')
          : Promise.resolve({ data: [] }),

        subjectIds.length
          ? supabase.from('subjects').select('id, name').in('id', subjectIds).order('name')
          : Promise.resolve({ data: [] }),
      ]);

      if (sessRes.error) throw sessRes.error;

      setSessions(sessRes.data || []);
      setTeacherClasses(classRes.data || []);
      setTeacherSubjects(subjRes.data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile?.id, profile?.school_id]);

  useEffect(() => { load(); }, [load]);

  // ── Filter ──────────────────────────────────
  const displayed = sessions.filter(s => {
    if (fClass !== 'all' && s.class_id !== fClass) return false;
    if (fDate && s.date !== fDate)                  return false;
    return true;
  });

  const todaySess = sessions.filter(s => s.date === todayISO()).length;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=DM+Sans:wght@400;500;600&display=swap');
        @keyframes fadeUp   { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:none} }
        @keyframes shimmer  { 0%{background-position:-600px 0} 100%{background-position:600px 0} }
        @keyframes slideUp  { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:none} }
        @keyframes slideLeft{ from{opacity:0;transform:translateX(40px)} to{opacity:1;transform:none} }
        @keyframes spin     { to{transform:rotate(360deg)} }
        .row-hover:hover    { background:#F5F3FF !important; cursor:pointer }
      `}</style>

      {/* Global toast */}
      {toast && (
        <div style={{ position:'fixed', top:18, right:18, zIndex:2000, padding:'11px 18px', borderRadius:12, background:'#0F172A', color:'#fff', fontSize:13, fontWeight:600, boxShadow:'0 8px 24px rgba(0,0,0,.18)', animation:'slideUp .18s ease', fontFamily:"'DM Sans',sans-serif" }}>
          {toast}
        </div>
      )}

      <div style={{ fontFamily:"'DM Sans',sans-serif", display:'flex', flexDirection:'column', gap:24 }}>

        {/* ── Page header ── */}
        <div style={{ opacity:0, animation:'fadeUp .4s ease forwards', display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
              <div style={{ width:32, height:32, borderRadius:9, background:'#F0FDF4', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <ClipboardCheck size={15} color="#16A34A" />
              </div>
              <h1 style={{ fontFamily:'Sora,sans-serif', fontSize:22, fontWeight:700, color:'#0F172A', margin:0 }}>Absensi Digital</h1>
            </div>
            <p style={{ fontSize:14, color:'#64748B', margin:0 }}>
              Input kehadiran siswa per kelas — tanggal, jam ke-, dan pukul tercatat otomatis
            </p>
          </div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            <button onClick={() => { setRefreshing(true); load(); }}
              style={{ padding:'9px 13px', borderRadius:9, border:'1.5px solid #E2E8F0', background:'#fff', cursor:'pointer', display:'flex', alignItems:'center' }}>
              <RefreshCw size={13} color="#64748B" style={{ animation: refreshing ? 'spin .7s linear infinite' : 'none' }} />
            </button>
            <button onClick={() => setShowRekap(true)}
              style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'9px 16px', borderRadius:9, border:'1.5px solid #E2E8F0', background:'#fff', fontSize:13, fontWeight:600, color:'#475569', cursor:'pointer' }}>
              <TrendingUp size={13} />Rekap &amp; Export
            </button>
            <button onClick={() => setShowBuat(true)}
              style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'9px 18px', borderRadius:9, border:'none', background:'#16A34A', fontSize:13, fontWeight:700, color:'#fff', cursor:'pointer' }}>
              <Plus size={14} />Mulai Absensi
            </button>
          </div>
        </div>

        {/* ── Stat cards ── */}
        {!loading && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:12, opacity:0, animation:'fadeUp .4s ease 60ms forwards' }}>
            {[
              { icon: ClipboardCheck, label:'Total Sesi',     value: sessions.length,       color:'#4F46E5', bg:'#EFF6FF' },
              { icon: Calendar,       label:'Sesi Hari Ini',  value: todaySess,             color:'#16A34A', bg:'#F0FDF4' },
              { icon: Clock,          label:'Kelas Diampuh',  value: teacherClasses.length, color:'#0891B2', bg:'#EFF6FF' },
            ].map(s => (
              <div key={s.label} style={{ background:'#fff', borderRadius:14, border:'1px solid #F1F5F9', padding:'15px 18px', display:'flex', gap:12, alignItems:'center', boxShadow:'0 1px 4px rgba(0,0,0,.03)' }}>
                <div style={{ width:38, height:38, borderRadius:10, background:s.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <s.icon size={16} color={s.color} />
                </div>
                <div>
                  <div style={{ fontSize:11, color:'#64748B', fontWeight:600 }}>{s.label}</div>
                  <div style={{ fontFamily:'Sora,sans-serif', fontSize:20, fontWeight:700, color:'#0F172A' }}>{s.value}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {error && <div style={{ padding:14, background:'#FEF2F2', borderRadius:12, color:'#DC2626', fontSize:13 }}>{error}</div>}

        {/* ── Filter bar ── */}
        <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
          <div style={{ position:'relative' }}>
            <select value={fClass} onChange={e => setFClass(e.target.value)}
              style={{ padding:'8px 28px 8px 12px', borderRadius:9, border:'1.5px solid #E2E8F0', background:'#F8FAFC', fontSize:13, fontWeight:600, color:'#0F172A', appearance:'none', outline:'none', fontFamily:"'DM Sans',sans-serif" }}>
              <option value="all">Semua Kelas</option>
              {teacherClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <ChevronDown size={12} color="#94A3B8" style={{ position:'absolute', right:9, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} />
          </div>
          <input type="date" value={fDate} onChange={e => setFDate(e.target.value)}
            style={{ padding:'8px 12px', borderRadius:9, border:'1.5px solid #E2E8F0', background:'#F8FAFC', fontSize:13, color:'#0F172A', outline:'none' }} />
          {fDate && (
            <button onClick={() => setFDate('')}
              style={{ padding:'8px 11px', borderRadius:9, border:'1px solid #E2E8F0', background:'#fff', fontSize:12, fontWeight:600, color:'#64748B', cursor:'pointer' }}>
              Reset
            </button>
          )}
        </div>

        {/* ── Tabel sesi ── */}
        {loading ? (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {[...Array(5)].map((_, i) => <Shimmer key={i} h={60} />)}
          </div>
        ) : displayed.length === 0 ? (
          <div style={{ textAlign:'center', padding:'60px 20px', color:'#94A3B8' }}>
            <ClipboardCheck size={36} color="#E2E8F0" style={{ marginBottom:12 }} />
            <div style={{ fontFamily:'Sora,sans-serif', fontSize:16, fontWeight:600, color:'#CBD5E1', marginBottom:6 }}>Belum ada sesi absensi</div>
            <button onClick={() => setShowBuat(true)}
              style={{ marginTop:8, padding:'9px 20px', borderRadius:9, border:'none', background:'#16A34A', color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer' }}>
              Mulai Absensi Sekarang
            </button>
          </div>
        ) : (
          <div style={{ background:'#fff', borderRadius:14, border:'1px solid #F1F5F9', overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,.03)' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'#F8FAFC', borderBottom:'1px solid #F1F5F9' }}>
                  {['Tanggal','Kelas','Mata Pelajaran','Jam ke-','Pukul','Catatan',''].map(h => (
                    <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:700, color:'#64748B', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayed.map((s, i) => {
                  const isToday = s.date === todayISO();
                  return (
                    <tr key={s.id} className="row-hover"
                      onClick={() => setActiveSess(s)}
                      style={{ borderBottom: i < displayed.length - 1 ? '1px solid #F8FAFC' : 'none', transition:'background .12s' }}>

                      <td style={{ padding:'12px 14px' }}>
                        <div style={{ fontSize:13, fontWeight:600, color:'#0F172A' }}>{fmtShort(s.date)}</div>
                        {isToday && <span style={{ fontSize:10, fontWeight:700, color:'#16A34A', background:'#F0FDF4', padding:'1px 6px', borderRadius:4 }}>Hari ini</span>}
                      </td>

                      <td style={{ padding:'12px 14px', fontSize:13, fontWeight:600, color:'#374151' }}>{s.classes?.name || '—'}</td>

                      <td style={{ padding:'12px 14px', fontSize:13, color:'#64748B' }}>
                        {s.subjects?.name || <span style={{ color:'#CBD5E1' }}>—</span>}
                      </td>

                      <td style={{ padding:'12px 14px' }}>
                        <span style={{ fontFamily:'Sora,sans-serif', fontSize:14, fontWeight:700, color:'#4F46E5', background:'#EFF6FF', padding:'3px 10px', borderRadius:6 }}>
                          {s.jam_ke}
                        </span>
                      </td>

                      <td style={{ padding:'12px 14px' }}>
                        <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:13, color:'#475569' }}>
                          <Clock size={11} color="#94A3B8" />
                          {fmtJam(s.start_time)}
                        </span>
                      </td>

                      <td style={{ padding:'12px 14px', fontSize:12, color:'#94A3B8', maxWidth:130, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {s.catatan || '—'}
                      </td>

                      <td style={{ padding:'12px 14px' }} onClick={e => e.stopPropagation()}>
                        <button onClick={() => setActiveSess(s)}
                          style={{ padding:'5px 12px', borderRadius:7, border:'1px solid #E2E8F0', background:'#F8FAFC', fontSize:12, fontWeight:600, color:'#4F46E5', cursor:'pointer', whiteSpace:'nowrap' }}>
                          Input →
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

      {/* Modals / Drawers */}
      {showBuat && (
        <BuatSesiModal
          teacherClasses={teacherClasses}
          teacherSubjects={teacherSubjects}
          profile={profile}
          onClose={() => setShowBuat(false)}
          onCreated={(sess) => {
            setShowBuat(false);
            load();
            setActiveSess(sess);
            flash('Sesi dibuat! Silakan input kehadiran siswa.');
          }}
        />
      )}

      {activeSess && (
        <InputAbsensiDrawer
          session={activeSess}
          onClose={() => { setActiveSess(null); load(); }}
          onUpdated={load}
        />
      )}

      {showRekap && (
        <RekapModal teacherClasses={teacherClasses} onClose={() => setShowRekap(false)} />
      )}
    </>
  );
}