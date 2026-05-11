// src/pages/teacher/ABTestingDashboard.jsx
// Dashboard sederhana untuk melihat hasil AB experiment.
// Lazy-loaded dari App.jsx seperti halaman teacher lainnya.

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { BarChart2, RefreshCw, Plus, Play, Square, AlertCircle } from 'lucide-react';

// ── Helpers ────────────────────────────────────────────────────────
const round1 = (n) => (n != null ? Math.round(n * 10) / 10 : null);

// Welch t-test sederhana untuk dua sampel independen
// Mengembalikan p-value (approx) — cukup untuk keputusan awal
function welchPValue(mean1, mean2, var1, var2, n1, n2) {
  if (!n1 || !n2 || (!var1 && !var2)) return null;
  const se = Math.sqrt((var1 / n1) + (var2 / n2));
  if (se === 0) return null;
  const t = Math.abs((mean1 - mean2) / se);
  const df = Math.pow((var1 / n1) + (var2 / n2), 2) /
    (Math.pow(var1 / n1, 2) / (n1 - 1) + Math.pow(var2 / n2, 2) / (n2 - 1));
  // Approximasi p-value dari t dan df (two-tailed)
  const p = 2 * (1 - tDistCDF(t, df));
  return Math.max(0, Math.min(1, p));
}

// CDF t-distribution approximation (Abramowitz & Stegun)
function tDistCDF(t, df) {
  const x = df / (df + t * t);
  const a = df / 2;
  const b = 0.5;
  return 1 - 0.5 * incompleteBeta(x, a, b);
}

function incompleteBeta(x, a, b) {
  // Simplified incomplete beta (good enough for df > 5)
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const lbeta = lgamma(a) + lgamma(b) - lgamma(a + b);
  return Math.exp(a * Math.log(x) + b * Math.log(1 - x) - lbeta) / a;
}

function lgamma(z) {
  const c = [76.18009172947146, -86.50532032941677, 24.01409824083091,
    -1.231739572450155, 0.001208650973866179, -0.000005395239384953];
  let x = z, y = z, tmp = z + 5.5;
  tmp -= (z + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) { y += 1; ser += c[j] / y; }
  return -tmp + Math.log(2.5066282746310005 * ser / x);
}

const significanceLabel = (p) => {
  if (p === null) return { text: 'Belum cukup data', color: '#94A3B8' };
  if (p < 0.01)   return { text: 'Sangat signifikan (p<0.01)', color: '#16A34A' };
  if (p < 0.05)   return { text: 'Signifikan (p<0.05)', color: '#16A34A' };
  if (p < 0.1)    return { text: 'Borderline (p<0.10)', color: '#D97706' };
  return            { text: 'Tidak signifikan', color: '#DC2626' };
};

// ── Main Component ─────────────────────────────────────────────────
export default function ABTestingDashboard() {
  const { profile } = useAuth();
  const [experiments, setExperiments]   = useState([]);
  const [selected,    setSelected]      = useState(null);
  const [results,     setResults]       = useState(null);
  const [loading,     setLoading]       = useState(true);
  const [creating,    setCreating]      = useState(false);
  const [form,        setForm]          = useState({ key:'', name:'', description:'', traffic_split:50 });
  const [saving,      setSaving]        = useState(false);
  const [error,       setError]         = useState('');

  const loadExperiments = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('ab_experiments')
      .select('*')
      .eq('school_id', profile.school_id)
      .order('created_at', { ascending: false });
    setExperiments(data ?? []);
    setLoading(false);
  }, [profile.school_id]);

  useEffect(() => { loadExperiments(); }, [loadExperiments]);

  const loadResults = useCallback(async (exp) => {
    setSelected(exp);
    setResults(null);

    // Query: aggregate exam_results per variant
    const { data } = await supabase
      .from('exam_results')
      .select('variant_name, score, violation_score, force_submitted, total_unanswered, passed')
      .eq('experiment_id', exp.id)
      .in('status', ['submitted','graded']);

    if (!data?.length) { setResults([]); return; }

    // Group by variant
    const groups = {};
    data.forEach(r => {
      const v = r.variant_name ?? 'control';
      if (!groups[v]) groups[v] = [];
      groups[v].push(r);
    });

    const summarize = (rows) => {
      const scores    = rows.map(r => r.score).filter(s => s != null);
      const mean      = scores.length ? scores.reduce((a,b) => a+b, 0) / scores.length : null;
      const variance  = scores.length > 1
        ? scores.reduce((s, x) => s + Math.pow(x - mean, 2), 0) / (scores.length - 1)
        : 0;
      return {
        n:              rows.length,
        mean_score:     round1(mean),
        variance,
        passed_rate:    round1(rows.filter(r => r.passed).length / rows.length * 100),
        force_rate:     round1(rows.filter(r => r.force_submitted).length / rows.length * 100),
        mean_unanswered: round1(rows.reduce((s,r) => s + (r.total_unanswered ?? 0), 0) / rows.length),
        mean_violation:  round1(rows.reduce((s,r) => s + (r.violation_score ?? 0), 0) / rows.length),
      };
    };

    const summary = Object.entries(groups).map(([variant, rows]) => ({
      variant, ...summarize(rows),
    }));

    // Hitung p-value antara control dan treatment
    const ctrl = summary.find(s => s.variant === exp.variant_control);
    const treat = summary.find(s => s.variant === exp.variant_treatment);
    if (ctrl && treat) {
      ctrl.pValue  = welchPValue(ctrl.mean_score, treat.mean_score, ctrl.variance, treat.variance, ctrl.n, treat.n);
      treat.pValue = ctrl.pValue;
    }

    setResults(summary);
  }, []);

  const handleCreate = async () => {
    if (!form.key || !form.name) { setError('Key dan Name wajib diisi'); return; }
    setSaving(true); setError('');
    const { error: err } = await supabase.from('ab_experiments').insert({
      ...form,
      school_id:  profile.school_id,
      created_by: profile.id,
    });
    if (err) { setError(err.message); setSaving(false); return; }
    setCreating(false);
    setForm({ key:'', name:'', description:'', traffic_split:50 });
    loadExperiments();
    setSaving(false);
  };

  const toggleStatus = async (exp) => {
    const next = exp.status === 'running' ? 'paused' : 'running';
    const patch = { status: next };
    if (next === 'running' && !exp.started_at) patch.started_at = new Date().toISOString();
    if (next === 'concluded') patch.concluded_at = new Date().toISOString();
    await supabase.from('ab_experiments').update(patch).eq('id', exp.id);
    loadExperiments();
  };

  const STATUS_COLOR = { draft:'#94A3B8', running:'#16A34A', paused:'#D97706', concluded:'#0891B2' };
  const MIN_SAMPLE = 30; // minimum per variant sebelum keputusan bisa diambil

  return (
    <div style={{ padding:'24px', fontFamily:"'DM Sans',sans-serif", maxWidth:1100, margin:'0 auto' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <BarChart2 size={22} color="#0891B2"/>
          <div>
            <h1 style={{ fontFamily:'Sora,sans-serif', fontSize:20, fontWeight:700, margin:0, color:'#0F172A' }}>AB Testing</h1>
            <p style={{ fontSize:13, color:'#64748B', margin:0 }}>Eksperimen ujian aktif di sekolahmu</p>
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={loadExperiments} style={{ padding:'8px 14px', borderRadius:9, border:'1.5px solid #E2E8F0', background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', gap:6, fontSize:13, fontWeight:600, color:'#374151' }}>
            <RefreshCw size={13}/> Refresh
          </button>
          <button onClick={() => setCreating(true)} style={{ padding:'8px 16px', borderRadius:9, border:'none', background:'#0891B2', color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', gap:6, fontSize:13, fontWeight:700 }}>
            <Plus size={13}/> Buat Eksperimen
          </button>
        </div>
      </div>

      {/* Create form */}
      {creating && (
        <div style={{ background:'#fff', borderRadius:14, border:'1px solid #E2E8F0', padding:24, marginBottom:20 }}>
          <h3 style={{ fontFamily:'Sora,sans-serif', fontSize:15, fontWeight:700, margin:'0 0 16px', color:'#0F172A' }}>Eksperimen Baru</h3>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div><label style={{ fontSize:12, fontWeight:700, color:'#374151', display:'block', marginBottom:4 }}>Key (slug) *</label>
              <input value={form.key} onChange={e => setForm(f=>({...f, key:e.target.value.toLowerCase().replace(/\s/g,'-')}))}
                placeholder="violation-modal-v1" style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:'1.5px solid #E2E8F0', fontSize:13, outline:'none', boxSizing:'border-box' }}/></div>
            <div><label style={{ fontSize:12, fontWeight:700, color:'#374151', display:'block', marginBottom:4 }}>Nama *</label>
              <input value={form.name} onChange={e => setForm(f=>({...f, name:e.target.value}))}
                placeholder="Test Violation Modal Style" style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:'1.5px solid #E2E8F0', fontSize:13, outline:'none', boxSizing:'border-box' }}/></div>
            <div style={{ gridColumn:'1/-1' }}><label style={{ fontSize:12, fontWeight:700, color:'#374151', display:'block', marginBottom:4 }}>Deskripsi</label>
              <input value={form.description} onChange={e => setForm(f=>({...f, description:e.target.value}))}
                placeholder="Hipotesis dan tujuan eksperimen" style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:'1.5px solid #E2E8F0', fontSize:13, outline:'none', boxSizing:'border-box' }}/></div>
            <div><label style={{ fontSize:12, fontWeight:700, color:'#374151', display:'block', marginBottom:4 }}>Traffic ke Treatment: {form.traffic_split}%</label>
              <input type="range" min={0} max={100} value={form.traffic_split} onChange={e => setForm(f=>({...f, traffic_split:+e.target.value}))} style={{ width:'100%' }}/></div>
          </div>
          {error && <div style={{ marginTop:12, fontSize:13, color:'#DC2626', display:'flex', alignItems:'center', gap:6 }}><AlertCircle size={13}/>{error}</div>}
          <div style={{ display:'flex', gap:8, marginTop:16 }}>
            <button onClick={() => setCreating(false)} style={{ padding:'9px 18px', borderRadius:9, border:'1.5px solid #E2E8F0', background:'#fff', fontSize:13, fontWeight:600, cursor:'pointer' }}>Batal</button>
            <button onClick={handleCreate} disabled={saving} style={{ padding:'9px 18px', borderRadius:9, border:'none', background:'#0891B2', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer' }}>
              {saving ? 'Menyimpan...' : 'Buat Eksperimen'}
            </button>
          </div>
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'300px 1fr', gap:20, alignItems:'start' }}>
        {/* Experiment list */}
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {loading ? (
            <div style={{ padding:20, textAlign:'center', color:'#94A3B8', fontSize:13 }}>Memuat...</div>
          ) : experiments.length === 0 ? (
            <div style={{ padding:20, textAlign:'center', color:'#94A3B8', fontSize:13 }}>Belum ada eksperimen</div>
          ) : experiments.map(exp => (
            <div key={exp.id} onClick={() => loadResults(exp)}
              style={{ padding:16, borderRadius:12, border:`1.5px solid ${selected?.id===exp.id?'#0891B2':'#E2E8F0'}`, background:'#fff', cursor:'pointer', transition:'border-color .15s' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:999, background:STATUS_COLOR[exp.status]+'22', color:STATUS_COLOR[exp.status] }}>{exp.status}</span>
                <button onClick={e => { e.stopPropagation(); toggleStatus(exp); }}
                  style={{ display:'flex', alignItems:'center', gap:4, padding:'4px 8px', borderRadius:7, border:'1px solid #E2E8F0', background:'#F8FAFC', fontSize:11, fontWeight:600, cursor:'pointer', color:'#374151' }}>
                  {exp.status==='running' ? <><Square size={10}/> Pause</> : <><Play size={10}/> Start</>}
                </button>
              </div>
              <div style={{ fontFamily:'Sora,sans-serif', fontSize:13, fontWeight:700, color:'#0F172A', marginBottom:2 }}>{exp.name}</div>
              <div style={{ fontSize:11, color:'#94A3B8', fontFamily:'monospace' }}>{exp.key}</div>
              <div style={{ fontSize:11, color:'#64748B', marginTop:4 }}>Traffic split: {exp.traffic_split}% treatment</div>
            </div>
          ))}
        </div>

        {/* Results panel */}
        <div>
          {!selected && (
            <div style={{ padding:40, textAlign:'center', color:'#94A3B8', fontSize:14, background:'#F8FAFC', borderRadius:14, border:'1px solid #E2E8F0' }}>
              Pilih eksperimen di kiri untuk lihat hasilnya
            </div>
          )}
          {selected && !results && (
            <div style={{ padding:40, textAlign:'center', color:'#94A3B8', fontSize:14 }}>Memuat data...</div>
          )}
          {selected && results?.length === 0 && (
            <div style={{ padding:40, textAlign:'center', color:'#94A3B8', fontSize:14, background:'#F8FAFC', borderRadius:14, border:'1px solid #E2E8F0' }}>
              Belum ada data ujian yang terhubung ke eksperimen ini.<br/>
              <span style={{ fontSize:12 }}>Pastikan exam_session.experiment_id sudah diset.</span>
            </div>
          )}
          {selected && results?.length > 0 && (() => {
            const pVal = results[0]?.pValue;
            const sigLabel = significanceLabel(pVal);
            const totalN = results.reduce((s,r) => s + r.n, 0);
            const needsMore = results.some(r => r.n < MIN_SAMPLE);
            return (
              <div>
                {/* Summary header */}
                <div style={{ background:'#fff', borderRadius:14, border:'1px solid #E2E8F0', padding:20, marginBottom:16 }}>
                  <h2 style={{ fontFamily:'Sora,sans-serif', fontSize:16, fontWeight:700, margin:'0 0 4px', color:'#0F172A' }}>{selected.name}</h2>
                  <p style={{ fontSize:13, color:'#64748B', margin:'0 0 12px' }}>{selected.description}</p>
                  <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
                    <div style={{ fontSize:13, color:'#374151' }}>Total siswa: <strong>{totalN}</strong></div>
                    {pVal !== null && <div style={{ fontSize:13, color:'#374151' }}>p-value: <strong>{pVal.toFixed(4)}</strong></div>}
                    <div style={{ fontSize:13, fontWeight:700, color:sigLabel.color }}>{sigLabel.text}</div>
                    {needsMore && <div style={{ fontSize:12, color:'#D97706', background:'#FFFBEB', padding:'2px 10px', borderRadius:999 }}>⚠ Belum min. {MIN_SAMPLE} siswa/variant</div>}
                  </div>
                </div>

                {/* Variant cards */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                  {results.map(r => (
                    <div key={r.variant} style={{ background:'#fff', borderRadius:14, border:'1px solid #E2E8F0', padding:20 }}>
                      <div style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:999, background:r.variant===selected.variant_treatment?'#EFF6FF':'#F8FAFC', color:r.variant===selected.variant_treatment?'#0891B2':'#64748B', display:'inline-block', marginBottom:12 }}>
                        {r.variant === selected.variant_treatment ? 'TREATMENT' : 'CONTROL'} — {r.variant}
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                        {[
                          { label:'Sampel (n)', value: r.n },
                          { label:'Rata-rata Skor', value: r.mean_score ?? '—' },
                          { label:'Pass Rate', value: r.passed_rate != null ? r.passed_rate+'%' : '—' },
                          { label:'Force Submit', value: r.force_rate != null ? r.force_rate+'%' : '—' },
                          { label:'Avg Unanswered', value: r.mean_unanswered ?? '—' },
                          { label:'Avg Violation Poin', value: r.mean_violation ?? '—' },
                        ].map(m => (
                          <div key={m.label} style={{ background:'#F8FAFC', borderRadius:10, padding:12 }}>
                            <div style={{ fontSize:11, color:'#94A3B8', marginBottom:3 }}>{m.label}</div>
                            <div style={{ fontFamily:'Sora,sans-serif', fontSize:18, fontWeight:700, color:'#0F172A' }}>{m.value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Decision guidance */}
                <div style={{ marginTop:16, background:'#F8FAFC', borderRadius:12, padding:16, border:'1px solid #E2E8F0' }}>
                  <div style={{ fontSize:12, fontWeight:700, color:'#374151', marginBottom:6 }}>Panduan Keputusan</div>
                  <div style={{ fontSize:12, color:'#64748B', lineHeight:1.7 }}>
                    Rekomendasi minimum: <strong>{MIN_SAMPLE} siswa per variant</strong> sebelum mengambil keputusan.
                    p-value &lt; 0.05 artinya perbedaan tidak terjadi karena kebetulan (confidence 95%).
                    Selalu periksa <strong>pass rate</strong> dan <strong>force_submitted rate</strong> — skor tinggi tidak berguna jika siswa banyak yang di-force submit.
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}