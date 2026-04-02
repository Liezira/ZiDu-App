import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { createTracker, trackExamEvent } from '../../lib/examEvents';
import { EXAM_EVENTS }   from '../../lib/experimentUtils';
import { useExperiment } from '../../hooks/useExperiment';
import {
  Key, AlertCircle, Clock, ChevronLeft, ChevronRight,
  CheckCircle2, Send, Shield, BookOpen, AlertTriangle,
  XCircle, Pause, Play, Monitor, Grid, X,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────
const AUTOSAVE_INTERVAL_MS    = 30_000;
const TIMER_WARNING_THRESHOLD = 300;
const EXAM_SAVE_KEY = (id) => `zidu_exam_answers_${id}`;

// ── SISTEM SKORING PELANGGARAN (sinkron dengan UTBK SecurityMonitor) ──────────
// Setiap kategori memiliki: deduction (poin per kejadian), grace (gratis pertama N kali)
const VIOLATION_SCORING = {
  types: {
    tab_switch:   { label: 'Pindah Tab / Window',       deduction: 5,  grace: 1 },
    fullscreen:   { label: 'Keluar Fullscreen',          deduction: 3,  grace: 2 },
    copy_paste:   { label: 'Copy / Paste',               deduction: 8,  grace: 0 },
    devtools:     { label: 'Buka DevTools',              deduction: 20, grace: 0 },
    split_screen: { label: 'Split Screen / Floating',    deduction: 10, grace: 0 },
  },
  maxTotalScore:   20,   // Threshold auto-submit
  warnThreshold:   10,   // Peringatan keras muncul di atas nilai ini
  debounceMs:      1500, // Anti double-fire per kategori
};

// Map tipe raw event → kategori scoring
const VIOLATION_TYPE_MAP = {
  tab_switch:       'tab_switch',
  visibility:       'tab_switch',
  blur:             'tab_switch',
  fullscreen:       'fullscreen',
  fullscreen_exit:  'fullscreen',
  copy_paste:       'copy_paste',
  devtools:         'devtools',
  split_screen:     'split_screen',
  split_screen_h:   'split_screen',
  split_screen_w:   'split_screen',
  rightClick:       null,  // Diblok tapi tidak menambah poin
};

// Shorthand untuk kompatibilitas komponen lama
const VIOLATION_CFG    = Object.fromEntries(
  Object.entries(VIOLATION_SCORING.types).map(([k,v]) => [k, { label: v.label }])
);
const MAX_VIOLATION_SCORE  = VIOLATION_SCORING.maxTotalScore;
const WARN_VIOLATION_SCORE = VIOLATION_SCORING.warnThreshold;
// Grace fullscreen: 800ms (sedikit lebih longgar untuk transisi UI)
const FS_EXIT_GRACE_MS     = 800;
const MAX_PAUSE            = 2;
const PAUSE_DUR            = 300; // 5 menit

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────
const pad        = (n) => String(n).padStart(2, '0');
const formatTime = (s) => `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
const checkIOS   = () => /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

const calcRemainingTime = (result, session) => {
  if (!result?.started_at) return session.duration_minutes * 60;
  const endTime   = new Date(result.started_at).getTime() + session.duration_minutes * 60 * 1000;
  const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
  return remaining;
};

// ─────────────────────────────────────────────────────────────────
// WAKE LOCK
// ─────────────────────────────────────────────────────────────────
function useWakeLock(active) {
  const ref = useRef(null);
  useEffect(() => {
    if (!active) {
      ref.current?.release().catch(() => {}).finally(() => { ref.current = null; });
      return;
    }
    const request = async () => {
      try {
        if ('wakeLock' in navigator) ref.current = await navigator.wakeLock.request('screen');
      } catch { /* ignored */ }
    };
    request();
    const onVis = () => { if (document.visibilityState === 'visible' && active && !ref.current) request(); };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      ref.current?.release().catch(() => {}).finally(() => { ref.current = null; });
    };
  }, [active]);
}

// ─────────────────────────────────────────────────────────────────
// TOKEN ENTRY
// ─────────────────────────────────────────────────────────────────
const TokenEntry = ({ onEnter, loading, error }) => {
  const [token, setToken] = useState('');
  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(135deg,#0F172A,#1E293B)', padding:20, fontFamily:"'DM Sans',sans-serif" }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width:'100%', maxWidth:400, animation:'fadeUp .4s ease' }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ width:56, height:56, borderRadius:16, background:'rgba(8,145,178,.2)', border:'1px solid rgba(8,145,178,.3)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
            <Key size={24} color="#0891B2" />
          </div>
          <h1 style={{ fontFamily:'Sora,sans-serif', fontSize:24, fontWeight:700, color:'#F1F5F9', margin:'0 0 8px' }}>Masuk Ruang Ujian</h1>
          <p style={{ fontSize:14, color:'#64748B', margin:0 }}>Masukkan token ujian dari guru</p>
        </div>
        <div style={{ background:'rgba(8,145,178,.08)', border:'1px solid rgba(8,145,178,.2)', borderRadius:12, padding:'14px 16px', marginBottom:20, fontSize:12, color:'#94A3B8', lineHeight:1.7 }}>
          <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:8, color:'#0891B2', fontWeight:700, fontSize:13 }}>
            <Shield size={14} /> Sistem Pengamanan — Skoring Pelanggaran
          </div>
          {[
            `✅ Grace period: tab-switch (1×), fullscreen (2×) tidak langsung kena poin`,
            `⚠️ Pindah tab/window: +5 poin per kejadian`,
            `⚠️ Keluar fullscreen: +3 poin per kejadian`,
            `🚫 Copy/Paste: +8 poin — langsung diblok`,
            `🚫 Split Screen / Floating: +10 poin`,
            `🚫 Buka DevTools: +20 poin — hampir pasti auto-submit`,
            `❌ Total ≥ ${MAX_VIOLATION_SCORE} poin → Submit Otomatis`,
          ].map(t => (
            <div key={t} style={{ display:'flex', gap:7 }}><span style={{ color:'#0891B2', flexShrink:0 }}>·</span>{t}</div>
          ))}
        </div>
        </div>
        <div style={{ background:'rgba(255,255,255,.04)', borderRadius:20, border:'1px solid rgba(255,255,255,.08)', padding:28 }}>
          <label style={{ fontSize:12, fontWeight:700, color:'#94A3B8', display:'block', marginBottom:8, letterSpacing:'.05em' }}>TOKEN UJIAN</label>
          <input type="text" value={token} onChange={e => setToken(e.target.value.toUpperCase().slice(0,8))}
            onKeyDown={e => e.key==='Enter' && token.length>=4 && onEnter(token)}
            placeholder="Contoh: AB12CD" autoFocus
            style={{ width:'100%', padding:'14px 16px', borderRadius:12, border:`1.5px solid ${error?'#EF4444':'rgba(255,255,255,.12)'}`, background:'rgba(255,255,255,.06)', color:'#F1F5F9', fontSize:20, fontFamily:'Sora,sans-serif', fontWeight:700, letterSpacing:'.2em', outline:'none', textAlign:'center', boxSizing:'border-box' }} />
          {error && <div style={{ marginTop:8, fontSize:13, color:'#EF4444', display:'flex', alignItems:'center', gap:6 }}><AlertCircle size={13}/>{error}</div>}
          <button onClick={() => onEnter(token)} disabled={token.length<4||loading}
            style={{ width:'100%', padding:13, marginTop:16, borderRadius:12, border:'none', background:token.length>=4&&!loading?'#0891B2':'rgba(255,255,255,.08)', color:token.length>=4&&!loading?'#fff':'#475569', fontSize:14, fontWeight:700, cursor:token.length>=4&&!loading?'pointer':'not-allowed', fontFamily:"'DM Sans',sans-serif", display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
            {loading?<><div style={{ width:16, height:16, border:'2px solid rgba(255,255,255,.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin .7s linear infinite' }}/>Memverifikasi…</>:<><Key size={15}/>Masuk Ujian</>}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// EXAM CONFIRM
// ─────────────────────────────────────────────────────────────────
const ExamConfirm = ({ session, onStart, onBack }) => (
  <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(135deg,#0F172A,#1E293B)', padding:20, fontFamily:"'DM Sans',sans-serif" }}>
    <div style={{ width:'100%', maxWidth:500 }}>
      <div style={{ background:'rgba(255,255,255,.04)', borderRadius:20, border:'1px solid rgba(255,255,255,.08)', padding:32 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
          <div style={{ width:44, height:44, borderRadius:12, background:'rgba(8,145,178,.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <BookOpen size={20} color="#0891B2" />
          </div>
          <div>
            <div style={{ fontSize:12, color:'#64748B', fontWeight:600 }}>{session.exam_type?.toUpperCase()}</div>
            <h2 style={{ fontFamily:'Sora,sans-serif', fontSize:18, fontWeight:700, color:'#F1F5F9', margin:0 }}>{session.title}</h2>
          </div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:20 }}>
          {[['Jumlah Soal',`${session.total_questions} soal`],['Durasi',`${session.duration_minutes} menit`],['KKM',session.passing_score],['Auto-Submit',`≥ ${MAX_VIOLATION_SCORE} poin`]].map(([k,v]) => (
            <div key={k} style={{ background:'rgba(255,255,255,.04)', borderRadius:10, padding:12 }}>
              <div style={{ fontSize:11, color:'#64748B', fontWeight:600, marginBottom:3 }}>{k}</div>
              <div style={{ fontFamily:'Sora,sans-serif', fontSize:15, fontWeight:700, color:'#F1F5F9' }}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{ background:'rgba(245,158,11,.1)', border:'1px solid rgba(245,158,11,.25)', borderRadius:12, padding:'12px 14px', marginBottom:24, fontSize:13, color:'#FDE68A', lineHeight:1.7 }}>
          <strong>⚠️ SISTEM SKORING PELANGGARAN:</strong>
          <div style={{ marginTop:6, fontSize:12, color:'#94A3B8', lineHeight:1.8 }}>
            Pindah tab (+5) · Keluar fullscreen (+3) · Copy/Paste (+8) · Split screen (+10) · DevTools (+20).
            Ada grace period untuk pelanggaran tidak sengaja. Total ≥ <strong style={{color:'#FCA5A5'}}>{MAX_VIOLATION_SCORE} poin</strong> = ujian otomatis dikumpulkan.
          </div>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onBack} style={{ flex:1, padding:12, borderRadius:10, border:'1px solid rgba(255,255,255,.1)', background:'transparent', color:'#94A3B8', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>Kembali</button>
          <button onClick={onStart} style={{ flex:2, padding:12, borderRadius:10, border:'none', background:'#0891B2', color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:"'DM Sans',sans-serif", display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
            <CheckCircle2 size={16}/> Mulai Ujian Sekarang
          </button>
        </div>
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────
// VIOLATION MODAL
// ─────────────────────────────────────────────────────────────────
const ViolationModal = ({ message, violationScore, isHard, onClose }) => {
  const remaining = MAX_VIOLATION_SCORE - violationScore;
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.85)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:20, backdropFilter:'blur(4px)' }}>
      <div style={{ background:'#fff', borderRadius:20, width:'100%', maxWidth:400, overflow:'hidden', border:`3px solid ${isHard?'#DC2626':'#F59E0B'}`, animation:'fadeUp .2s ease' }}>
        <div style={{ padding:'20px 24px', background:isHard?'#DC2626':'#F59E0B', textAlign:'center' }}>
          <AlertTriangle size={40} color="#fff" style={{ margin:'0 auto 8px', display:'block', animation:'pulse 1s infinite' }}/>
          <h2 style={{ fontFamily:'Sora,sans-serif', fontSize:18, fontWeight:800, color:'#fff', margin:0 }}>
            {isHard?'⛔ PERINGATAN KERAS!':'⚠️ PELANGGARAN TERDETEKSI'}
          </h2>
          <p style={{ fontSize:11, color:'rgba(255,255,255,.8)', margin:'4px 0 0' }}>
            {isHard ? 'Poin mendekati batas — hati-hati!' : 'Poin pelanggaran bertambah'}
          </p>
        </div>
        <div style={{ padding:'20px 24px' }}>
          <p style={{ fontSize:13, color:'#374151', background:'#F9FAFB', padding:'10px 14px', borderRadius:10, border:'1px solid #E5E7EB', marginBottom:16, fontStyle:'italic' }}>"{message}"</p>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:14 }}>
            <div style={{ textAlign:'center', padding:'10px 6px', background:isHard?'#FEF2F2':'#FFFBEB', borderRadius:10, border:`1px solid ${isHard?'#FECACA':'#FDE68A'}` }}>
              <div style={{ fontFamily:'Sora,sans-serif', fontSize:22, fontWeight:800, color:isHard?'#DC2626':'#D97706' }}>{violationScore}</div>
              <div style={{ fontSize:10, fontWeight:700, color:isHard?'#DC2626':'#D97706', letterSpacing:'.03em' }}>POIN SEKARANG</div>
            </div>
            <div style={{ textAlign:'center', padding:'10px 6px', background:'#F8FAFC', borderRadius:10, border:'1px solid #E2E8F0' }}>
              <div style={{ fontFamily:'Sora,sans-serif', fontSize:22, fontWeight:800, color:'#374151' }}>{MAX_VIOLATION_SCORE}</div>
              <div style={{ fontSize:10, fontWeight:700, color:'#64748B', letterSpacing:'.03em' }}>BATAS AUTO-SUBMIT</div>
            </div>
            <div style={{ textAlign:'center', padding:'10px 6px', background: remaining <= 5 ? '#FEF2F2' : '#F0FDF4', borderRadius:10, border:`1px solid ${remaining <= 5 ? '#FECACA' : '#BBF7D0'}` }}>
              <div style={{ fontFamily:'Sora,sans-serif', fontSize:22, fontWeight:800, color: remaining <= 5 ? '#DC2626' : '#16A34A' }}>{remaining}</div>
              <div style={{ fontSize:10, fontWeight:700, color: remaining <= 5 ? '#DC2626' : '#16A34A', letterSpacing:'.03em' }}>SISA AMAN</div>
            </div>
          </div>
          {/* Progress bar pelanggaran */}
          <div style={{ marginBottom:14 }}>
            <div style={{ height:8, background:'#F1F5F9', borderRadius:99, overflow:'hidden' }}>
              <div style={{ height:'100%', borderRadius:99, background: isHard ? '#DC2626' : '#F59E0B', width:`${Math.min(100,(violationScore/MAX_VIOLATION_SCORE)*100)}%`, transition:'width .3s' }}/>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'#94A3B8', marginTop:3 }}>
              <span>0</span><span style={{color:'#F59E0B'}}>{WARN_VIOLATION_SCORE} (peringatan)</span><span style={{color:'#DC2626'}}>{MAX_VIOLATION_SCORE}</span>
            </div>
          </div>
          {isHard
            ? <div style={{ background:'#FEF2F2', borderLeft:'4px solid #DC2626', padding:'10px 12px', borderRadius:'0 8px 8px 0', fontSize:12, color:'#7F1D1D' }}>
                <strong>⛔ Peringatan Keras:</strong> Satu pelanggaran besar berikutnya → <strong>Submit Otomatis</strong>. Tetap di tab ini.
              </div>
            : <div style={{ background:'#FFFBEB', borderLeft:'4px solid #F59E0B', padding:'10px 12px', borderRadius:'0 8px 8px 0', fontSize:12, color:'#78350F' }}>
                <strong>⚠ Perhatian:</strong> Setiap pelanggaran mengurangi sisa aman. Kembali ke mode ujian normal.
              </div>}
        </div>
        <div style={{ padding:'0 24px 20px' }}>
          <button onClick={onClose} style={{ width:'100%', padding:11, borderRadius:10, border:'none', background:isHard?'#DC2626':'#F59E0B', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
            Mengerti — Kembali ke Ujian
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// PAUSE MODAL
// ─────────────────────────────────────────────────────────────────
const PauseModal = ({ timeLeft, count, onResume }) => (
  <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,.98)', zIndex:9998, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
    <div style={{ background:'#fff', borderRadius:24, width:'100%', maxWidth:380, overflow:'hidden', boxShadow:'0 32px 64px rgba(0,0,0,.4)' }}>
      <div style={{ background:'linear-gradient(135deg,#1E3A5F,#2563EB)', padding:'28px 24px', textAlign:'center' }}>
        <Pause size={44} color="#fff" style={{ margin:'0 auto 12px', display:'block', opacity:.9 }}/>
        <h2 style={{ fontFamily:'Sora,sans-serif', fontSize:20, fontWeight:800, color:'#fff', margin:'0 0 4px' }}>WAKTU JEDA</h2>
        <p style={{ fontSize:13, color:'rgba(255,255,255,.7)', margin:0 }}>Timer ujian berhenti sementara</p>
      </div>
      <div style={{ padding:24 }}>
        <div style={{ textAlign:'center', background:'#EFF6FF', borderRadius:16, padding:16, marginBottom:16 }}>
          <div style={{ fontSize:11, fontWeight:700, color:'#3B82F6', letterSpacing:'.08em', marginBottom:6 }}>SISA WAKTU JEDA</div>
          <div style={{ fontFamily:'Sora,sans-serif', fontSize:44, fontWeight:800, color:'#1E3A5F', lineHeight:1 }}>{formatTime(timeLeft)}</div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
          <div style={{ background:'#F8FAFC', borderRadius:10, padding:10, textAlign:'center' }}>
            <div style={{ fontFamily:'Sora,sans-serif', fontSize:20, fontWeight:700, color:'#0F172A' }}>5:00</div>
            <div style={{ fontSize:10, color:'#94A3B8', fontWeight:700 }}>MAKS DURASI</div>
          </div>
          <div style={{ background:'#F8FAFC', borderRadius:10, padding:10, textAlign:'center' }}>
            <div style={{ fontFamily:'Sora,sans-serif', fontSize:20, fontWeight:700, color:'#0F172A' }}>{count}/{MAX_PAUSE}</div>
            <div style={{ fontSize:10, color:'#94A3B8', fontWeight:700 }}>JEDA TERPAKAI</div>
          </div>
        </div>
        <div style={{ background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:10, padding:'10px 12px', marginBottom:16, fontSize:12, color:'#78350F' }}>
          <strong>⚠ Catatan:</strong> Timer ujian tidak berjalan. Sistem keamanan tetap aktif — jangan pindah tab.
        </div>
        <button onClick={onResume} style={{ width:'100%', padding:14, borderRadius:12, border:'none', background:'#2563EB', color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:"'DM Sans',sans-serif", display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
          <Play size={16}/> Lanjutkan Ujian
        </button>
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────
// SECURITY MONITOR
// ─────────────────────────────────────────────────────────────────
const SecurityMonitor = ({ active, onViolation }) => {
  const fsTimer = useRef(null);
  const checkIv = useRef(null);
  const ios     = checkIOS();

  useEffect(() => {
    if (!active) return;

    const style = document.createElement('style');
    style.textContent = `body{-webkit-user-select:none;-moz-user-select:none;user-select:none;}@media print{html,body{display:none!important;}}`;
    document.head.appendChild(style);

    const onVis   = () => { if (document.hidden) onViolation('tab_switch','Pindah tab atau window terdeteksi'); };
    const onBlur  = () => onViolation('tab_switch','Fokus window hilang');
    const onCopy  = e => { e.preventDefault(); onViolation('copy_paste','Mencoba menyalin teks (Ctrl+C)'); };
    const onPaste = e => { e.preventDefault(); onViolation('copy_paste','Mencoba menempelkan teks (Ctrl+V)'); };
    const onCtx   = e => e.preventDefault();
    const onKey   = e => {
      if (e.key==='F12') { e.preventDefault(); onViolation('devtools','Shortcut DevTools (F12)'); return; }
      if (e.ctrlKey && e.shiftKey && ['I','J','C','K'].includes(e.key.toUpperCase())) {
        e.preventDefault(); onViolation('devtools',`Shortcut DevTools (Ctrl+Shift+${e.key})`);
      }
      if (e.ctrlKey && e.key.toUpperCase()==='U') e.preventDefault();
    };
    const onFS = () => {
      if (ios) return;
      if (!document.fullscreenElement) {
        if (fsTimer.current) clearTimeout(fsTimer.current);
        fsTimer.current = setTimeout(() => { if (!document.fullscreenElement) onViolation('fullscreen','Keluar dari mode fullscreen'); }, FS_EXIT_GRACE_MS);
      } else { if (fsTimer.current) { clearTimeout(fsTimer.current); fsTimer.current=null; } }
    };

    // UTBK-style detection: threshold ketat, interval 500ms
    checkIv.current = setInterval(() => {
      // DevTools detection (dari UTBK: threshold 160px)
      const devW = window.outerWidth  - window.innerWidth  > 160;
      const devH = !ios && (window.outerHeight - window.innerHeight > 160);
      if (devW || devH) { onViolation('devtools', 'DevTools / Console terbuka'); return; }

      const tag    = document.activeElement?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA';
      if (!typing && !ios) {
        // Split screen H: tinggi window < 80% layar (dari UTBK: < 0.80)
        const availH = window.screen.availHeight || window.screen.height;
        if (window.innerHeight < availH * 0.80) {
          onViolation('split_screen', 'Split screen terdeteksi'); return;
        }
        // Split screen W / floating window: dari UTBK < 0.90
        if (window.innerWidth < window.outerWidth * 0.90) {
          onViolation('split_screen', 'Floating window terdeteksi'); return;
        }
      }
    }, 500);

    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('blur', onBlur);
    document.addEventListener('fullscreenchange', onFS);
    document.addEventListener('copy', onCopy);
    document.addEventListener('paste', onPaste);
    document.addEventListener('contextmenu', onCtx);
    document.addEventListener('keydown', onKey);

    return () => {
      clearInterval(checkIv.current);
      if (fsTimer.current) clearTimeout(fsTimer.current);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('fullscreenchange', onFS);
      document.removeEventListener('copy', onCopy);
      document.removeEventListener('paste', onPaste);
      document.removeEventListener('contextmenu', onCtx);
      document.removeEventListener('keydown', onKey);
      if (document.head.contains(style)) document.head.removeChild(style);
    };
  }, [active, onViolation, ios]);

  return null;
};

// ─────────────────────────────────────────────────────────────────
// QUESTION NAVIGATOR
// ─────────────────────────────────────────────────────────────────
const QuestionNav = ({ total, current, answers, questions, onGo }) => (
  <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
    {Array.from({length:total},(_,i) => {
      const qid      = questions?.[i]?.id;
      const answered = qid && answers[qid]!==undefined && answers[qid]!==null && answers[qid]!=='';
      const curr     = i===current;
      return (
        <button key={i} onClick={()=>onGo(i)} style={{ width:36, height:36, borderRadius:8, border:`1.5px solid ${curr?'#0891B2':answered?'#BAE6FD':'#E2E8F0'}`, background:curr?'#0891B2':answered?'#EFF6FF':'#F8FAFC', color:curr?'#fff':answered?'#0891B2':'#94A3B8', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'Sora,sans-serif', touchAction:'manipulation' }}>
          {i+1}
        </button>
      );
    })}
  </div>
);

// ─────────────────────────────────────────────────────────────────
// MOBILE NAV DRAWER
// ─────────────────────────────────────────────────────────────────
const NavDrawer = ({ open, onClose, total, current, answers, questions, onGo, answered, submitting, onSubmit }) => {
  if (!open) return null;
  return (
    <div style={{ position:'fixed', inset:0, zIndex:500 }}>
      <div style={{ position:'absolute', inset:0, background:'rgba(15,23,42,.5)' }} onClick={onClose}/>
      <div style={{ position:'absolute', bottom:0, left:0, right:0, background:'#fff', borderRadius:'20px 20px 0 0', padding:'20px 20px 32px', maxHeight:'70vh', overflowY:'auto', boxShadow:'0 -8px 32px rgba(0,0,0,.15)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <div>
            <div style={{ fontFamily:'Sora,sans-serif', fontSize:14, fontWeight:700, color:'#0F172A' }}>Navigasi Soal</div>
            <div style={{ fontSize:12, color:'#94A3B8' }}>{answered}/{total} dijawab</div>
          </div>
          <button onClick={onClose} style={{ width:30, height:30, borderRadius:8, border:'none', background:'#F1F5F9', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <X size={14} color="#64748B"/>
          </button>
        </div>
        <div style={{ display:'flex', gap:12, marginBottom:12, fontSize:11, color:'#64748B' }}>
          <div style={{ display:'flex', alignItems:'center', gap:4 }}><div style={{ width:12, height:12, borderRadius:3, background:'#0891B2' }}/> Sekarang</div>
          <div style={{ display:'flex', alignItems:'center', gap:4 }}><div style={{ width:12, height:12, borderRadius:3, background:'#EFF6FF', border:'1.5px solid #BAE6FD' }}/> Dijawab</div>
          <div style={{ display:'flex', alignItems:'center', gap:4 }}><div style={{ width:12, height:12, borderRadius:3, background:'#F8FAFC', border:'1.5px solid #E2E8F0' }}/> Belum</div>
        </div>
        <QuestionNav total={total} current={current} answers={answers} questions={questions} onGo={(i)=>{ onGo(i); onClose(); }}/>
        <div style={{ marginTop:16, height:6, borderRadius:99, background:'#F1F5F9', overflow:'hidden' }}>
          <div style={{ height:'100%', borderRadius:99, background:'#0891B2', width:`${(answered/total)*100}%`, transition:'width .3s' }}/>
        </div>
        <button onClick={()=>{ onClose(); onSubmit(); }} disabled={submitting}
          style={{ width:'100%', marginTop:16, padding:14, borderRadius:12, border:'none', background:'#16A34A', color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:"'DM Sans',sans-serif", display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
          <Send size={15}/> Kumpulkan Jawaban
        </button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// EXAM ROOM CONTENT
// ─────────────────────────────────────────────────────────────────
const ExamRoomContent = ({ session, questions, result, onSubmit, submitting, submitError, variant }) => {
  const { profile } = useAuth();
  const [current,         setCurrent]        = useState(0);
  const [answers,         setAnswers]        = useState({});
  const [timeLeft,        setTimeLeft]       = useState(() => calcRemainingTime(result, session));
  const [showSubmit,      setShowSubmit]     = useState(false);
  const [showNavDrawer,   setShowNavDrawer]  = useState(false);
  const [securityActive,      setSecurityActive]      = useState(true);
  const [violationScore,      setViolationScore]      = useState(result.violation_score||0);
  const [violationCounts,     setViolationCounts]     = useState(result.violation_counts||{});
  const [forceSubmitted,      setForceSubmitted]      = useState(false);
  const [showViolationWarning,setShowViolationWarning]= useState(false);
  const [lastViolationMsg,    setLastViolationMsg]    = useState('');
  const [currentViolScore,    setCurrentViolScore]    = useState(result.violation_score||0);
  const [isPaused,            setIsPaused]            = useState(false);
  const [pauseCount,          setPauseCount]          = useState(0);
  const [pauseTimeLeft,       setPauseTimeLeft]       = useState(PAUSE_DUR);
  const [isMobile,            setIsMobile]            = useState(() => window.innerWidth < 768);

  const handleSubmitRef  = useRef(null);
  const lastViolTime     = useRef({});
  const violScoreRef     = useRef(result.violation_score||0);   // sync ref agar closure handleViolation selalu fresh
  const violCountsRef    = useRef(result.violation_counts||{}); // idem
  const pauseEnd         = useRef(null);

  // ── LANGKAH D: Buat tracker
  const track = useMemo(() => createTracker({
    studentId:      profile?.id,
    schoolId:       profile?.school_id,
    examSessionId:  session.id,
    examResultId:   result.id,
    experimentId:   session.experiment_id ?? null,
    variant,
  }), [profile?.id, profile?.school_id, result.id, session.id, session.experiment_id, variant]);

  // ── LANGKAH E: Tambah event di useEffect mount (exam_started) 
  useEffect(() => {
    track(EXAM_EVENTS.EXAM_STARTED, {
      question_count: questions.length,
      shuffle:        session.shuffle_questions,
      duration_min:   session.duration_minutes,
    });
  }, []); // eslint-disable-line

  useWakeLock(securityActive && !isPaused);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    try { const s=localStorage.getItem(EXAM_SAVE_KEY(result.id)); if(s) setAnswers(JSON.parse(s)); } catch {}
  }, [result.id]);

  useEffect(() => {
    try { localStorage.setItem(EXAM_SAVE_KEY(result.id), JSON.stringify(answers)); } catch {}
  }, [answers, result.id]);

  useEffect(() => {
    const iv=setInterval(async()=>{
      if(!Object.keys(answers).length) return;
      const arr=questions.map(q=>({question_id:q.id,answer:answers[q.id]??null,type:q.type}));
      try { await supabase.from('exam_results').update({answers:arr,updated_at:new Date().toISOString()}).eq('id',result.id); } catch {}
    }, AUTOSAVE_INTERVAL_MS);
    return ()=>clearInterval(iv);
  }, [answers,questions,result.id]);

  useEffect(() => {
    if(isPaused) return;
    if(timeLeft <= 0) { handleSubmitRef.current?.(true); return; }
    const iv=setInterval(()=>{
      setTimeLeft(t=>{ if(t<=1){clearInterval(iv);handleSubmitRef.current?.(true);return 0;} return t-1; });
    }, 1000);
    return ()=>clearInterval(iv);
  }, [isPaused]); // eslint-disable-line

  useEffect(() => {
    if(!isPaused) return;
    const iv=setInterval(()=>{
      const rem=Math.max(0,Math.floor((pauseEnd.current-Date.now())/1000));
      setPauseTimeLeft(rem);
      if(rem<=0){clearInterval(iv);handleResume();}
    }, 1000);
    return ()=>clearInterval(iv);
  }, [isPaused]); // eslint-disable-line

  const handleSubmit = useCallback((auto=false)=>{
    track(auto ? EXAM_EVENTS.FORCE_SUBMITTED : EXAM_EVENTS.SUBMIT_INITIATED, {
      answered_count:  Object.keys(answers).length,
      total:           questions.length,
      violation_score: violationScore,
      violation_counts:violationCounts,
      time_left:       timeLeft,
      auto_reason:     auto ? `poin pelanggaran ≥ ${MAX_VIOLATION_SCORE}` : null,
    });
    setSecurityActive(false);
    const arr=questions.map(q=>({question_id:q.id,answer:answers[q.id]??null,type:q.type}));
    onSubmit(arr,violationScore,auto);
  },[answers,questions,onSubmit,violationScore, track, timeLeft]);

  useEffect(()=>{handleSubmitRef.current=handleSubmit;},[handleSubmit]);

  // ── SCORING VIOLATION HANDLER — ala UTBK SecurityMonitor ─────────────────────
  // Grace → poin akumulasi → warning modal → auto-submit saat ≥ maxTotalScore
  const handleViolation = useCallback(async (type, detail) => {
    if (!securityActive || isPaused || forceSubmitted || showViolationWarning) return;

    const now = Date.now();
    if ((now - (lastViolTime.current[type] || 0)) < VIOLATION_SCORING.debounceMs) return;
    lastViolTime.current[type] = now;

    // Resolve kategori; rightClick (null) = blok tanpa poin
    const category = VIOLATION_TYPE_MAP[type] ?? type;
    if (!category) return;
    const cfg = VIOLATION_SCORING.types[category];
    if (!cfg) return;

    // Count per kategori via ref (fresh selalu, aman di closure)
    const prevCount = (violCountsRef.current[category] || 0);
    const newCount  = prevCount + 1;
    const isGrace   = newCount <= cfg.grace;
    const deduction = isGrace ? 0 : cfg.deduction;

    const newCounts = { ...violCountsRef.current, [category]: newCount };
    const newScore  = violScoreRef.current + deduction;
    violCountsRef.current = newCounts;
    violScoreRef.current  = newScore;
    setViolationCounts(newCounts);
    setViolationScore(newScore);
    setCurrentViolScore(newScore);

    track(EXAM_EVENTS.VIOLATION_TRIGGERED, {
      violation_type:  type,
      category,
      detail,
      deduction,
      is_grace:        isGrace,
      violation_score: newScore,
    });

    // Log ke Supabase (fire-and-forget)
    supabase.rpc('append_violation', {
      p_result_id:   result.id,
      p_type:        category,
      p_detail:      detail,
      p_deduction:   deduction,
      p_is_grace:    isGrace,
      p_score_total: newScore,
    }).catch(() => {});

    // Grace: diam-diam, tidak ganggu siswa
    if (isGrace) {
      console.warn(`[GRACE] ${category} #${newCount}/${cfg.grace}: ${detail}`);
      return;
    }

    // Auto-submit jika poin capai threshold
    if (newScore >= VIOLATION_SCORING.maxTotalScore) {
      setForceSubmitted(true);
      setSecurityActive(false);
      setShowViolationWarning(false);
      handleSubmitRef.current?.(true);
      return;
    }

    // Tampilkan warning modal untuk pelanggaran non-fatal
    setLastViolationMsg(detail);
    setShowViolationWarning(true);
  }, [securityActive, isPaused, forceSubmitted, showViolationWarning, result.id, track]);

  const handlePause=useCallback(()=>{
    if(pauseCount>=MAX_PAUSE) return;
    // ── LANGKAH H: Tambah event di handlePause
    track(EXAM_EVENTS.PAUSE_USED, { pause_count_used: pauseCount + 1 });
    setPauseCount(c=>c+1); setPauseTimeLeft(PAUSE_DUR);
    pauseEnd.current=Date.now()+PAUSE_DUR*1000;
    setIsPaused(true);
    if(!checkIOS()&&document.fullscreenElement) document.exitFullscreen().catch(()=>{});
  },[pauseCount, track]);

  const handleResume=useCallback(()=>{
    setIsPaused(false);
    if(!checkIOS()) document.documentElement.requestFullscreen().catch(()=>{});
  },[]);

  useEffect(()=>{
    if(!checkIOS()&&!document.fullscreenElement) document.documentElement.requestFullscreen().catch(()=>{});
    return()=>{ if(!checkIOS()&&document.fullscreenElement) document.exitFullscreen().catch(()=>{}); };
  },[]);

  const q        = questions[current];
  if(!q) return null;
  const answered = questions.filter(q=>answers[q.id]!==undefined&&answers[q.id]!==null&&answers[q.id]!=='').length;
  const crit     = timeLeft<TIMER_WARNING_THRESHOLD;
  const pct      = Math.min(100,(violationScore/MAX_VIOLATION_SCORE)*100);
  // 3 level: hijau (aman) → kuning (mendekati warn) → merah (danger ≥ warn threshold)
  const sc       = violationScore >= WARN_VIOLATION_SCORE ? '#DC2626'
                 : violationScore > 0                     ? '#F59E0B'
                 :                                          '#16A34A';
  const opts     = ['A','B','C','D'];

  return (
    <div style={{ minHeight:'100vh', background:'#F8FAFC', fontFamily:"'DM Sans',sans-serif" }} onContextMenu={e=>e.preventDefault()}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@600 ;700;800&family=DM+Sans:wght@400;500;600&display=swap');
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .opt-btn{border:2px solid #E2E8F0;background:#F8FAFC;transition:all .12s;cursor:pointer;}
        .opt-btn:active{transform:scale(.98);}
      `}</style>

      <SecurityMonitor active={securityActive&&!isPaused} onViolation={handleViolation}/>
      {isPaused&&<PauseModal timeLeft={pauseTimeLeft} count={pauseCount} onResume={handleResume}/>}

      {/* ── Violation Warning Modal — tampil saat poin belum capai threshold ── */}
      {showViolationWarning && !isPaused && (
        <ViolationModal
          message={lastViolationMsg}
          violationScore={currentViolScore}
          isHard={currentViolScore >= WARN_VIOLATION_SCORE}
          onClose={() => {
            setShowViolationWarning(false);
            // Re-aktifkan fullscreen setelah menutup modal
            if (!checkIOS() && !document.fullscreenElement) {
              document.documentElement.requestFullscreen().catch(() => {});
            }
          }}
        />
      )}
      
      <NavDrawer
        open={showNavDrawer} onClose={()=>setShowNavDrawer(false)}
        total={questions.length} current={current} answers={answers} questions={questions}
        onGo={setCurrent} answered={answered} submitting={submitting}
        onSubmit={()=>setShowSubmit(true)}
      />

      {/* ── TOP BAR ── */}
      <div style={{ background:'#fff', borderBottom:'1px solid #F1F5F9', position:'sticky', top:0, zIndex:10, boxShadow:'0 1px 8px rgba(0,0,0,.04)' }}>
        <div style={{ padding: isMobile ? '10px 14px' : '10px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:0 }}>
            <div style={{ width:28, height:28, borderRadius:8, background:'#EFF6FF', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <BookOpen size={14} color="#0891B2"/>
            </div>
            <div style={{ minWidth:0 }}>
              <div style={{ fontFamily:'Sora,sans-serif', fontSize: isMobile ? 12 : 14, fontWeight:700, color:'#0F172A', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth: isMobile ? 120 : 280 }}>{session.title}</div>
              <div style={{ fontSize:11, color:'#94A3B8' }}>{answered}/{questions.length} dijawab</div>
            </div>
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
            {isMobile && (
              <button onClick={()=>setShowNavDrawer(true)}
                style={{ display:'flex', alignItems:'center', gap:4, padding:'7px 10px', borderRadius:8, border:'1.5px solid #E2E8F0', background:'#fff', fontSize:12, fontWeight:600, color:'#475569', cursor:'pointer' }}>
                <Grid size={12}/><span>{current+1}/{questions.length}</span>
              </button>
            )}
            <button onClick={handlePause} disabled={pauseCount>=MAX_PAUSE}
              style={{ display:'flex', alignItems:'center', gap:4, padding:'6px 10px', borderRadius:8, border:'1.5px solid #E2E8F0', background:pauseCount>=MAX_PAUSE?'#F8FAFC':'#fff', fontSize:12, fontWeight:600, color:pauseCount>=MAX_PAUSE?'#CBD5E1':'#475569', cursor:pauseCount>=MAX_PAUSE?'not-allowed':'pointer' }}>
              <Pause size={12}/>{!isMobile&&<span>{MAX_PAUSE-pauseCount}</span>}
            </button>
            {violationScore>0&&(
              <div style={{ display:'flex', alignItems:'center', gap:4, padding:'6px 8px', borderRadius:8,
                background: violationScore>=WARN_VIOLATION_SCORE ? '#FEF2F2' : '#FFFBEB',
                border: `1px solid ${violationScore>=WARN_VIOLATION_SCORE?'#FECACA':'#FDE68A'}`,
                fontSize:12, fontWeight:700, color:sc,
                animation: violationScore>=WARN_VIOLATION_SCORE ? 'pulse 1s infinite' : 'none' }}>
                <Shield size={11}/>{violationScore}/{MAX_VIOLATION_SCORE}
              </div>
            )}
            <div style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 12px', borderRadius:10, background:crit?'#FEF2F2':'#EFF6FF', border:`1px solid ${crit?'#FECACA':'#BAE6FD'}` }}>
              <Clock size={13} color={crit?'#DC2626':'#0891B2'}/>
              <span style={{ fontFamily:'Sora,sans-serif', fontSize: isMobile ? 14 : 16, fontWeight:700, color:crit?'#DC2626':'#0891B2', animation:crit?'pulse 1s infinite':'none' }}>{formatTime(timeLeft)}</span>
            </div>
          </div>
        </div>
        {violationScore>0&&<div style={{ height:3, background:'#F1F5F9' }}><div style={{ height:'100%', background:sc, width:`${pct}%`, transition:'width .3s,background .3s' }}/></div>}
      </div>

      {submitError && (
        <div style={{ background:'#FEF2F2', borderBottom:'1px solid #FECACA', padding:'10px 20px', display:'flex', alignItems:'center', gap:8, fontSize:13, color:'#DC2626' }}>
          <AlertCircle size={14}/> Gagal mengumpulkan: {submitError}. Coba lagi.
        </div>
      )}

      {/* ── MAIN CONTENT ── */}
      <div style={{
        maxWidth: 900,
        margin: '0 auto',
        padding: isMobile ? '16px 14px 100px' : '24px 20px',
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 220px',
        gap: 20,
        alignItems: 'start',
      }}>

        <div style={{ background:'#fff', borderRadius:16, border:'1px solid #F1F5F9', padding: isMobile ? 18 : 28, boxShadow:'0 2px 8px rgba(0,0,0,.04)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
            <div style={{ width:34, height:34, borderRadius:10, background:'#EFF6FF', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Sora,sans-serif', fontWeight:700, fontSize:14, color:'#0891B2', flexShrink:0 }}>{current+1}</div>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              <span style={{ fontSize:11, fontWeight:700, padding:'2px 9px', borderRadius:999, background:'#EFF6FF', color:'#0891B2' }}>
                {q.type==='multiple_choice'?'Pilihan Ganda':q.type==='essay'?'Essay':'Benar/Salah'}
              </span>
              <span style={{ fontSize:11, fontWeight:700, padding:'2px 9px', borderRadius:999, background:q.difficulty==='easy'?'#F0FDF4':q.difficulty==='hard'?'#FEF2F2':'#FFFBEB', color:q.difficulty==='easy'?'#16A34A':q.difficulty==='hard'?'#DC2626':'#D97706' }}>
                {q.difficulty==='easy'?'Mudah':q.difficulty==='hard'?'Sulit':'Sedang'}
              </span>
            </div>
          </div>

          <div style={{ fontSize: isMobile ? 15 : 16, lineHeight:1.8, color:'#0F172A', marginBottom:20 }}>{q.question}</div>

          {q.type==='multiple_choice'&&(
            <div style={{ display:'flex', flexDirection:'column', gap: isMobile ? 10 : 10 }}>
              {q.options?.map((opt,i)=>{
                const lbl=opts[i]; const sel=answers[q.id]===lbl;
                return (
                  <button key={i} className="opt-btn" onClick={()=>setAnswers(a=>({...a,[q.id]:lbl}))}
                    style={{ display:'flex', alignItems:'center', gap:12, padding: isMobile ? '14px 14px' : '13px 16px', borderRadius:12, border:`2px solid ${sel?'#0891B2':'#E2E8F0'}`, background:sel?'#EFF6FF':'#F8FAFC', cursor:'pointer', textAlign:'left', fontFamily:"'DM Sans',sans-serif", minHeight:52, touchAction:'manipulation' }}>
                    <div style={{ width:30, height:30, borderRadius:'50%', border:`2px solid ${sel?'#0891B2':'#E2E8F0'}`, background:sel?'#0891B2':'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Sora,sans-serif', fontWeight:700, fontSize:13, color:sel?'#fff':'#94A3B8', flexShrink:0 }}>{lbl}</div>
                    <span style={{ fontSize: isMobile ? 14 : 14, color:sel?'#0C4A6E':'#374151', fontWeight:sel?500:400, lineHeight:1.5 }}>{opt}</span>
                  </button>
                );
              })}
            </div>
          )}

          {q.type==='true_false'&&(
            <div style={{ display:'flex', gap:12 }}>
              {['Benar','Salah'].map(v=>{
                const sel=answers[q.id]===v;
                return (
                  <button key={v} onClick={()=>setAnswers(a=>({...a,[q.id]:v}))}
                    style={{ flex:1, padding: isMobile ? 18 : 16, borderRadius:12, border:`2px solid ${sel?'#0891B2':'#E2E8F0'}`, background:sel?'#EFF6FF':'#F8FAFC', cursor:'pointer', fontFamily:'Sora,sans-serif', fontWeight:700, fontSize: isMobile ? 16 : 15, color:sel?'#0891B2':'#94A3B8', touchAction:'manipulation', minHeight:52 }}>
                    {v==='Benar'?'✓ Benar':'✗ Salah'}
                  </button>
                );
              })}
            </div>
          )}

          {q.type==='essay'&&(
            <textarea value={answers[q.id]||''} onChange={e=>setAnswers(a=>({...a,[q.id]:e.target.value}))}
              placeholder="Tulis jawaban kamu di sini..." rows={isMobile?5:6}
              style={{ width:'100%', padding:'13px 16px', borderRadius:12, border:'1.5px solid #E2E8F0', background:'#F8FAFC', fontSize:14, color:'#0F172A', fontFamily:"'DM Sans',sans-serif", outline:'none', resize:'vertical', boxSizing:'border-box', lineHeight:1.6 }}
              onFocus={e=>e.target.style.borderColor='#0891B2'} onBlur={e=>e.target.style.borderColor='#E2E8F0'}/>
          )}

          {!isMobile && (
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:28, paddingTop:20, borderTop:'1px solid #F1F5F9' }}>
              <button onClick={()=>setCurrent(c=>Math.max(0,c-1))} disabled={current===0}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 16px', borderRadius:9, border:'1.5px solid #E2E8F0', background:'#fff', fontSize:13, fontWeight:600, color:'#374151', cursor:current===0?'not-allowed':'pointer', opacity:current===0?0.4:1, fontFamily:"'DM Sans',sans-serif" }}>
                <ChevronLeft size={14}/> Sebelumnya
              </button>
              {current<questions.length-1
                ?<button onClick={()=>setCurrent(c=>Math.min(questions.length-1,c+1))}
                  style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 16px', borderRadius:9, border:'none', background:'#0891B2', fontSize:13, fontWeight:600, color:'#fff', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                  Berikutnya <ChevronRight size={14}/>
                </button>
                :<button onClick={()=>setShowSubmit(true)}
                  style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 18px', borderRadius:9, border:'none', background:'#16A34A', fontSize:13, fontWeight:700, color:'#fff', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                  <Send size={14}/> Kumpulkan
                </button>}
            </div>
          )}
        </div>

        {!isMobile && (
          <div style={{ display:'flex', flexDirection:'column', gap:14, position:'sticky', top:72 }}>
            <div style={{ background:'#fff', borderRadius:14, border:'1px solid #F1F5F9', padding:16 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#94A3B8', marginBottom:10, letterSpacing:'.05em' }}>NAVIGASI SOAL</div>
              <QuestionNav total={questions.length} current={current} answers={answers} questions={questions} onGo={setCurrent}/>
            </div>
            <div style={{ background:'#fff', borderRadius:14, border:'1px solid #F1F5F9', padding:16 }}>
              <div style={{ fontSize:11, color:'#94A3B8', marginBottom:4 }}>Progres</div>
              <div style={{ fontSize:13, fontWeight:700, color:'#0F172A', marginBottom:8 }}>{answered}/{questions.length} soal</div>
              <div style={{ height:6, borderRadius:99, background:'#F1F5F9', overflow:'hidden' }}>
                <div style={{ height:'100%', borderRadius:99, background:'#0891B2', width:`${(answered/questions.length)*100}%`, transition:'width .3s' }}/>
              </div>
            </div>
            {violationScore>0&&<div style={{ background:violationScore>=WARN_VIOLATION_SCORE?'#FEF2F2':'#FFFBEB', borderRadius:14, border:`1px solid ${violationScore>=WARN_VIOLATION_SCORE?'#FECACA':'#FDE68A'}`, padding:14 }}>
              <div style={{ fontSize:11, fontWeight:700, color:sc, letterSpacing:'.05em', marginBottom:8, display:'flex', alignItems:'center', gap:5 }}><Shield size={11}/>PELANGGARAN</div>
              {Object.entries(violationCounts).map(([t,c])=>(
                <div key={t} style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'#64748B', marginBottom:4 }}>
                  <span>{VIOLATION_CFG[t]?.label||t}</span><span style={{ fontWeight:700 }}>{c}×</span>
                </div>
              ))}
              <div style={{ marginTop:8, paddingTop:8, borderTop:`1px solid ${violationScore>=WARN_VIOLATION_SCORE?'#FECACA':'#FDE68A'}`, display:'flex', justifyContent:'space-between', fontSize:12, fontWeight:700, color:sc }}>
                <span>Total Poin</span><span>{violationScore}/{MAX_VIOLATION_SCORE}</span>
              </div>
            </div>}
            <button onClick={()=>setShowSubmit(true)} style={{ width:'100%', padding:12, borderRadius:12, border:'none', background:'#16A34A', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:"'DM Sans',sans-serif", display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}>
              <Send size={14}/> Kumpulkan Jawaban
            </button>
          </div>
        )}
      </div>

      {isMobile && (
        <div style={{ position:'fixed', bottom:0, left:0, right:0, background:'#fff', borderTop:'1px solid #F1F5F9', padding:'10px 14px 16px', display:'flex', gap:8, alignItems:'center', boxShadow:'0 -4px 16px rgba(0,0,0,.08)', zIndex:20 }}>
          <button onClick={()=>setCurrent(c=>Math.max(0,c-1))} disabled={current===0}
            style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:4, padding:13, borderRadius:10, border:'1.5px solid #E2E8F0', background:'#fff', fontSize:13, fontWeight:600, color:current===0?'#CBD5E1':'#374151', cursor:current===0?'not-allowed':'pointer', touchAction:'manipulation', minHeight:48 }}>
            <ChevronLeft size={16}/>
          </button>
          {current<questions.length-1
            ?<button onClick={()=>setCurrent(c=>Math.min(questions.length-1,c+1))}
              style={{ flex:3, display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:13, borderRadius:10, border:'none', background:'#0891B2', fontSize:13, fontWeight:700, color:'#fff', cursor:'pointer', touchAction:'manipulation', minHeight:48 }}>
              Soal Berikutnya <ChevronRight size={15}/>
            </button>
            :<button onClick={()=>setShowSubmit(true)}
              style={{ flex:3, display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:13, borderRadius:10, border:'none', background:'#16A34A', fontSize:13, fontWeight:700, color:'#fff', cursor:'pointer', touchAction:'manipulation', minHeight:48 }}>
              <Send size={14}/> Kumpulkan
            </button>}
          {current<questions.length-1
            ?<button onClick={()=>setCurrent(c=>Math.min(questions.length-1,c+1))}
              style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:4, padding:13, borderRadius:10, border:'1.5px solid #E2E8F0', background:'#fff', fontSize:13, fontWeight:600, color:'#374151', cursor:'pointer', touchAction:'manipulation', minHeight:48 }}>
              <ChevronRight size={16}/>
            </button>
            :<button onClick={()=>setShowNavDrawer(true)}
              style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:13, borderRadius:10, border:'1.5px solid #E2E8F0', background:'#fff', cursor:'pointer', touchAction:'manipulation', minHeight:48 }}>
              <Grid size={16} color="#64748B"/>
            </button>}
        </div>
      )}

      {showSubmit&&(
        <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,.7)', backdropFilter:'blur(6px)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div style={{ background:'#fff', borderRadius:20, padding:32, width:'100%', maxWidth:400, textAlign:'center', animation:'fadeUp .2s ease', fontFamily:"'DM Sans',sans-serif" }}>
            <div style={{ width:56, height:56, borderRadius:16, background:'#F0FDF4', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}><Send size={24} color="#16A34A"/></div>
            <h3 style={{ fontFamily:'Sora,sans-serif', fontSize:18, fontWeight:700, color:'#0F172A', marginBottom:8 }}>Kumpulkan Jawaban?</h3>
            <p style={{ fontSize:14, color:'#64748B', lineHeight:1.6, marginBottom:8 }}>Sudah menjawab <strong>{answered}</strong> dari <strong>{questions.length}</strong> soal.</p>
            {answered<questions.length&&<p style={{ fontSize:13, color:'#D97706', background:'#FFFBEB', borderRadius:8, padding:'8px 12px', marginBottom:8 }}>⚠ {questions.length-answered} soal belum dijawab</p>}
            {violationScore>0&&<p style={{ fontSize:12, color:'#DC2626', background:'#FEF2F2', borderRadius:8, padding:'8px 12px', marginBottom:8 }}>🛡 {violationScore} poin pelanggaran tercatat</p>}
            <p style={{ fontSize:12, color:'#94A3B8', marginBottom:24 }}>Setelah dikumpulkan, tidak bisa diubah lagi.</p>
            {submitError&&<p style={{ fontSize:12, color:'#DC2626', background:'#FEF2F2', borderRadius:8, padding:'8px 12px', marginBottom:16 }}>❌ {submitError}</p>}
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={()=>setShowSubmit(false)} disabled={submitting}
                style={{ flex:1, padding:13, borderRadius:10, border:'1.5px solid #E2E8F0', background:'#fff', fontSize:13, fontWeight:600, color:'#374151', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", minHeight:48 }}>
                Kembali
              </button>
              <button onClick={()=>{ setShowSubmit(false); handleSubmit(false); }} disabled={submitting}
                style={{ flex:2, padding:13, borderRadius:10, border:'none', background:submitting?'#E2E8F0':'#16A34A', color:submitting?'#94A3B8':'#fff', fontSize:13, fontWeight:700, cursor:submitting?'not-allowed':'pointer', fontFamily:"'DM Sans',sans-serif", display:'flex', alignItems:'center', justifyContent:'center', gap:7, minHeight:48 }}>
                {submitting
                  ?<><div style={{ width:14, height:14, border:'2px solid rgba(255,255,255,.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin .7s linear infinite' }}/>Mengumpulkan…</>
                  :<><CheckCircle2 size={14}/>Ya, Kumpulkan</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// RESULT SCREEN
// ─────────────────────────────────────────────────────────────────
const ResultScreen = ({ result, session, onBack }) => {
  const score=result.score!==null?Math.round(result.score):null;
  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(135deg,#0F172A,#1E293B)', padding:20, fontFamily:"'DM Sans',sans-serif" }}>
      <div style={{ width:'100%', maxWidth:460, textAlign:'center' }}>
        {result.force_submitted&&<div style={{ background:'rgba(220,38,38,.2)', border:'1px solid rgba(220,38,38,.4)', borderRadius:12, padding:'14px 18px', marginBottom:20, display:'flex', alignItems:'center', gap:10 }}>
          <XCircle size={20} color="#F87171"/><div style={{ textAlign:'left' }}>
            <div style={{ fontFamily:'Sora,sans-serif', fontSize:14, fontWeight:700, color:'#F87171' }}>Submit Otomatis</div>
            <div style={{ fontSize:12, color:'#94A3B8' }}>{result.force_submit_reason||'Poin pelanggaran melebihi batas'}</div>
          </div>
        </div>}
        <div style={{ marginBottom:28 }}>
          <div style={{ width:80, height:80, borderRadius:24, background:result.passed?'rgba(22,163,74,.2)':'rgba(220,38,38,.1)', border:`2px solid ${result.passed?'rgba(22,163,74,.4)':'rgba(220,38,38,.2)'}`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
            {result.passed?<CheckCircle2 size={40} color="#16A34A"/>:<BookOpen size={40} color="#0891B2"/>}
          </div>
          <h1 style={{ fontFamily:'Sora,sans-serif', fontSize:26, fontWeight:700, color:'#F1F5F9', margin:'0 0 8px' }}>{result.passed===true?'Selamat! Kamu Lulus 🎉':result.passed===false?'Ujian Selesai':'Jawaban Dikumpulkan'}</h1>
          <p style={{ fontSize:14, color:'#64748B', margin:0 }}>{session.title}</p>
        </div>
        <div style={{ background:'rgba(255,255,255,.05)', borderRadius:20, border:'1px solid rgba(255,255,255,.08)', padding:28, marginBottom:20 }}>
          {score!==null
            ?<><div style={{ fontFamily:'Sora,sans-serif', fontSize:64, fontWeight:700, color:result.passed?'#4ADE80':'#F87171', lineHeight:1, marginBottom:6 }}>{score}</div><div style={{ fontSize:14, color:'#64748B', marginBottom:20 }}>dari 100 · KKM {session.passing_score}</div></>
            :<div style={{ fontSize:16, color:'#94A3B8', marginBottom:20, padding:'16px 0' }}>Jawaban essay akan dinilai guru</div>}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {[{label:'Benar',value:result.total_correct??'—',color:'#4ADE80'},{label:'Salah',value:result.total_wrong??'—',color:'#F87171'},{label:'Kosong',value:result.total_unanswered??'—',color:'#94A3B8'},{label:'Poin Viol.',value:result.violation_score??0,color:(result.violation_score||0)>0?'#FBBF24':'#94A3B8'}].map(s=>(
              <div key={s.label} style={{ background:'rgba(255,255,255,.04)', borderRadius:10, padding:12 }}>
                <div style={{ fontFamily:'Sora,sans-serif', fontSize:20, fontWeight:700, color:s.color }}>{s.value}</div>
                <div style={{ fontSize:11, color:'#64748B', marginTop:2 }}>{s.label}</div>
              </div>
            ))}
          </div>
          {(result.violation_score||0)>0&&<div style={{ marginTop:16, paddingTop:16, borderTop:'1px solid rgba(255,255,255,.06)', display:'flex', alignItems:'center', gap:8, background:'rgba(251,191,36,.06)', borderRadius:10, padding:'12px 14px' }}>
            <Monitor size={14} color="#FBBF24"/><span style={{ fontSize:12, color:'#94A3B8' }}>Poin pelanggaran terlihat oleh guru/pengawas.</span>
          </div>}
        </div>
        <button onClick={onBack} style={{ width:'100%', padding:14, borderRadius:12, border:'none', background:'#0891B2', color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>Kembali ke Dashboard</button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// MAIN EXAM ROOM
// ─────────────────────────────────────────────────────────────────
export default function ExamRoom() {
  const { profile }   = useAuth();
  const navigate      = useNavigate();
  const [screen,      setScreen]      = useState('token');
  const [session,     setSession]     = useState(null);
  
  // ── LANGKAH B: Ambil experiment_id dari session yang sudah di-fetch
  const { variant } = useExperiment(session?.experiment_id ?? null);

  const [questions,   setQuestions]   = useState([]);
  const [result,      setResult]      = useState(null);
  const [tokenError,  setTokenError]  = useState('');
  const [tokenLoading,setTokenLoading]= useState(false);
  const [submitting,  setSubmitting]  = useState(false);
  const [submitError, setSubmitError] = useState('');

  // FIX: resolve variant langsung saat token valid (bukan dari hook yang masih null)
  const resolveVariantForSession = async (sess) => {
    if (!sess.experiment_id || !profile?.class_id) return null;
    const cacheKey = `zidu_exp_${sess.experiment_id}_${profile.class_id}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) return cached;
    try {
      const { data } = await supabase.rpc('get_or_assign_variant', {
        p_experiment_id: sess.experiment_id,
        p_class_id:      profile.class_id,
      });
      const resolved = data ?? 'control';
      sessionStorage.setItem(cacheKey, resolved);
      return resolved;
    } catch { return 'control'; }
  };

  const handleEnterToken=async(input)=>{
    setTokenLoading(true);setTokenError('');
    try {
      const {data:sess,error}=await supabase.from('exam_sessions').select('*').eq('token',input.trim().toUpperCase()).eq('class_id',profile.class_id).single();
      if(error||!sess){setTokenError('Token tidak valid atau bukan untuk kelasmu.');return;}
      const now=new Date(),start=new Date(sess.start_time),end=new Date(sess.end_time);
      if(now<start){setTokenError(`Ujian belum dimulai. Mulai: ${start.toLocaleString('id-ID')}`);return;}
      if(now>end){setTokenError('Ujian sudah berakhir.');return;}
      const {data:existing}=await supabase.from('exam_results').select('*').eq('exam_session_id',sess.id).eq('student_id',profile.id).maybeSingle();
      if(existing?.status==='submitted'||existing?.status==='graded'){setSession(sess);setResult(existing);setScreen('result');return;}
      const {data:qs,error:qErr}=await supabase.from('questions').select('id,bank_id,type,question,options,image_url,difficulty,tags,score_weight').eq('bank_id',sess.question_bank_id);
      if(qErr||!qs?.length){setTokenError('Bank soal kosong. Hubungi guru.');return;}
      let qShow=qs;
      if(sess.shuffle_questions) qShow=[...qs].sort(()=>Math.random()-.5);
      // FIX: potong sesuai total_questions yang dikonfigurasi guru
      if(sess.total_questions && sess.total_questions < qShow.length){
        qShow = qShow.slice(0, sess.total_questions);
      }

      setSession(sess);setQuestions(qShow);

      // FIX: resolve variant langsung (bukan dari hook yang async dan masih null)
      const resolvedVariant = await resolveVariantForSession(sess);

      trackExamEvent({
        eventType:      EXAM_EVENTS.TOKEN_VALID,
        studentId:      profile.id,
        schoolId:       profile.school_id,
        examSessionId:  sess.id,
        experimentId:   sess.experiment_id ?? null,
        variant:        resolvedVariant,
        properties: { exam_type: sess.exam_type, class_id: profile.class_id },
      });

      if(!existing){
        const {data:nr}=await supabase.from('exam_results').insert([{
          exam_session_id:sess.id,
          student_id:profile.id,
          answers:[],
          status:'in_progress',
          violation_count:0,
          violation_score:0,
          violation_counts:{},
          violations:[],
          started_at:new Date().toISOString(),
          created_at:new Date().toISOString(),
          updated_at:new Date().toISOString(),
          experiment_id: sess.experiment_id ?? null,
          variant_name:  resolvedVariant,  // FIX: tidak null lagi
        }]).select().single();
        setResult(nr);
      } else {setResult(existing);}
      setScreen('confirm');
    } catch(err){
      const msg = err.message||'Terjadi kesalahan.';
      setTokenError(msg);
      // ── LANGKAH C: Untuk token invalid, di catch block handleEnterToken
      trackExamEvent({
        eventType:      EXAM_EVENTS.TOKEN_INVALID,
        studentId:      profile.id,
        schoolId:       profile.school_id,
        properties: { reason: msg },
      });
    }
    finally{setTokenLoading(false);}
  };

  const handleSubmit=async(arr,vScore,auto)=>{
    setSubmitting(true);
    setSubmitError('');
    try {
      const {data,error}=await supabase.rpc('calculate_and_submit_exam',{p_result_id:result.id,p_answers:arr});
      if(error) throw error;
      try{localStorage.removeItem(EXAM_SAVE_KEY(result.id));}catch{}
      setResult(p=>({...p,...data}));
      setScreen('result');

      // ── LANGKAH I: Di handleSubmit di ExamRoom (parent), setelah berhasil
      trackExamEvent({
        eventType:     EXAM_EVENTS.EXAM_SUBMITTED,
        studentId:     profile.id,
        schoolId:      profile.school_id,
        examSessionId: session.id,
        examResultId:  result.id,
        experimentId:  session.experiment_id ?? null,
        variant,
        properties: {
          score:           data.score,
          passed:          data.passed,
          violation_score: vScore,
          auto_submitted:  auto,
        },
      });

    } catch(err){
      const msg = err?.message || 'Koneksi gagal. Cek internet lalu coba lagi.';
      setSubmitError(msg);
      console.error('[ExamRoom submit error]', err);
    }
    finally{setSubmitting(false);}
  };

  if(screen==='token')   return <TokenEntry onEnter={handleEnterToken} loading={tokenLoading} error={tokenError}/>;
  if(screen==='confirm') return <ExamConfirm session={session} onStart={()=>setScreen('exam')} onBack={()=>setScreen('token')}/>;
  if(screen==='exam'){
    if(!result?.id||!questions.length) return(
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#F8FAFC', fontFamily:"'DM Sans',sans-serif" }}>
        <div style={{ textAlign:'center' }}>
          <div style={{ width:40, height:40, borderRadius:'50%', border:'3px solid #E2E8F0', borderTopColor:'#0891B2', animation:'spin .8s linear infinite', margin:'0 auto 16px' }}/>
          <p style={{ color:'#64748B', fontSize:14 }}>Memuat soal ujian…</p>
        </div>
      </div>
    );
    // ── Kirim prop variant ke ExamRoomContent
    return <ExamRoomContent session={session} questions={questions} result={result} onSubmit={handleSubmit} submitting={submitting} submitError={submitError} variant={variant}/>;
  }
  if(screen==='result') return <ResultScreen result={result} session={session} onBack={()=>navigate('/student')}/>;
  return null;
}