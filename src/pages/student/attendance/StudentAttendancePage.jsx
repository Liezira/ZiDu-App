import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import {
  QrCode, CheckCircle2, AlertCircle,
  CameraOff, Loader2, Clock, RefreshCw,
} from 'lucide-react';

const fmtJam = (ts) =>
  ts ? new Date(ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB' : '—';
const todayISO = () => new Date().toISOString().slice(0, 10);

const BARCODE_FORMATS = [
  'qr_code', 'code_128', 'code_39', 'code_93',
  'codabar', 'ean_13', 'ean_8', 'upc_a', 'upc_e',
  'itf', 'pdf417', 'data_matrix', 'aztec',
];

// ─── Single unified scanner (QR + Barcode otomatis) ───────────────
const Scanner = ({ onScan, isProcessing }) => {
  const videoRef      = useRef(null);
  const streamRef     = useRef(null);
  const rafRef        = useRef(null);
  const detectorRef   = useRef(null);
  const processingRef = useRef(isProcessing);
  useEffect(() => { processingRef.current = isProcessing; }, [isProcessing]);

  // 'idle' | 'requesting' | 'active' | 'error' | 'unsupported'
  const [camStatus, setCamStatus] = useState('idle');

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera();
    setCamStatus('requesting');

    if (!('BarcodeDetector' in window)) {
      setCamStatus('unsupported');
      return;
    }

    try {
      let formats = BARCODE_FORMATS;
      try {
        const supported = await window.BarcodeDetector.getSupportedFormats();
        if (Array.isArray(supported) && supported.length) {
          formats = BARCODE_FORMATS.filter(f => supported.includes(f));
        }
      } catch (_) {}
      if (!formats.length) formats = ['qr_code'];
      detectorRef.current = new window.BarcodeDetector({ formats });

      // getUserMedia — browser akan tampilkan permission bubble
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCamStatus('active');

      const scan = async () => {
        if (!videoRef.current || videoRef.current.readyState < 2 || processingRef.current) {
          rafRef.current = requestAnimationFrame(scan);
          return;
        }
        try {
          const codes = await detectorRef.current.detect(videoRef.current);
          if (codes.length > 0) onScan(codes[0].rawValue.trim());
        } catch (_) {}
        rafRef.current = requestAnimationFrame(scan);
      };
      rafRef.current = requestAnimationFrame(scan);
    } catch (err) {
      // NotAllowedError = izin ditolak, yang lain = error lain
      setCamStatus('error');
    }
  }, [onScan, stopCamera]);

  // Jangan auto-start — tunggu user klik tombol agar permission bubble muncul
  // dari interaksi user langsung (bukan dari useEffect), supaya bisa diklik
  useEffect(() => {
    return stopCamera;
  }, [stopCamera]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>

      {/* Viewfinder */}
      <div style={{
        position: 'relative', width: '100%', maxWidth: 340, aspectRatio: '1',
        borderRadius: 18, overflow: 'hidden', background: '#0F172A',
        boxShadow: '0 8px 40px rgba(0,0,0,.22)',
      }}>
        <video ref={videoRef} muted playsInline
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: camStatus === 'active' ? 'block' : 'none' }}
        />

        {/* Overlay scan UI */}
        {camStatus === 'active' && (
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.38)' }} />
            {/* Frame bersih */}
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%,-50%)',
              width: '65%', height: '65%',
              boxShadow: '0 0 0 9999px rgba(0,0,0,.48)',
              borderRadius: 10,
            }} />
            {/* Sudut hijau */}
            {[['top','left'],['top','right'],['bottom','left'],['bottom','right']].map(([v,h]) => (
              <div key={`${v}-${h}`} style={{
                position: 'absolute',
                [v]: 'calc(17.5% - 2px)',
                [h]: 'calc(17.5% - 2px)',
                width: 24, height: 24,
                borderTop:    v === 'top'    ? '3px solid #22C55E' : 'none',
                borderBottom: v === 'bottom' ? '3px solid #22C55E' : 'none',
                borderLeft:   h === 'left'   ? '3px solid #22C55E' : 'none',
                borderRight:  h === 'right'  ? '3px solid #22C55E' : 'none',
                borderRadius:
                  v==='top'&&h==='left' ? '4px 0 0 0' : v==='top'&&h==='right' ? '0 4px 0 0' :
                  v==='bottom'&&h==='left' ? '0 0 0 4px' : '0 0 4px 0',
              }} />
            ))}
            {/* Scan line */}
            <div style={{
              position: 'absolute', left: '17.5%', right: '17.5%', height: 2,
              background: 'linear-gradient(90deg, transparent, #22C55E, transparent)',
              animation: 'scanLine 2s linear infinite',
            }} />
            <div style={{
              position: 'absolute', bottom: 14, left: 0, right: 0,
              textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,.6)',
              fontWeight: 600, letterSpacing: '0.06em',
            }}>
              QR &amp; BARCODE SCANNER
            </div>
          </div>
        )}

        {/* Status overlays */}
        {camStatus === 'idle' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24 }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(34,197,94,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <QrCode size={28} color="#22C55E" />
            </div>
            <p style={{ fontSize: 13, color: '#94A3B8', textAlign: 'center', margin: 0, lineHeight: 1.5 }}>
              Tekan tombol di bawah untuk<br />membuka kamera
            </p>
          </div>
        )}

        {camStatus === 'requesting' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <Loader2 size={32} color="#94A3B8" style={{ animation: 'spin .7s linear infinite' }} />
            <span style={{ fontSize: 13, color: '#64748B' }}>Menunggu izin kamera…</span>
          </div>
        )}

        {camStatus === 'error' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 }}>
            <CameraOff size={32} color="#EF4444" />
            <span style={{ fontSize: 13, color: '#EF4444', textAlign: 'center', lineHeight: 1.5 }}>
              Akses kamera ditolak.<br />Izinkan akses kamera di pengaturan browser, lalu coba lagi.
            </span>
          </div>
        )}

        {camStatus === 'unsupported' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 }}>
            <QrCode size={32} color="#F59E0B" />
            <span style={{ fontSize: 13, color: '#92400E', textAlign: 'center', lineHeight: 1.5 }}>
              Browser tidak mendukung scan.<br />Gunakan Chrome atau Edge terbaru.
            </span>
          </div>
        )}

        {/* Processing overlay */}
        {isProcessing && camStatus === 'active' && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.65)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <Loader2 size={28} color="#fff" style={{ animation: 'spin .7s linear infinite' }} />
            <span style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>Memproses…</span>
          </div>
        )}
      </div>

      {/* Tombol aksi */}
      {camStatus === 'idle' && (
        <button
          onClick={startCamera}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '12px 28px', borderRadius: 12, border: 'none',
            background: '#16A34A', color: '#fff',
            fontSize: 14, fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(22,163,74,.35)',
          }}
        >
          <QrCode size={16} /> Buka Kamera
        </button>
      )}

      {camStatus === 'active' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <p style={{ fontSize: 13, color: '#64748B', textAlign: 'center', margin: 0 }}>
            Arahkan ke <strong>QR Code</strong> atau <strong>Barcode</strong> dari guru
          </p>
          <button onClick={() => { stopCamera(); setCamStatus('idle'); }} style={{
            fontSize: 12, color: '#94A3B8', background: 'none',
            border: 'none', cursor: 'pointer', textDecoration: 'underline',
          }}>Tutup kamera</button>
        </div>
      )}

      {(camStatus === 'error' || camStatus === 'unsupported') && (
        <button onClick={startCamera} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px',
          borderRadius: 10, border: '1.5px solid #E2E8F0', background: '#fff',
          fontSize: 13, fontWeight: 600, color: '#475569', cursor: 'pointer',
        }}>
          <RefreshCw size={13} /> Coba Lagi
        </button>
      )}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────
export default function StudentAttendancePage() {
  const { profile } = useAuth();
  const [processing, setProcessing]           = useState(false);
  const [result, setResult]                   = useState(null);
  const [todaySessions, setTodaySessions]     = useState([]);
  const [loadingSess, setLoadingSess]         = useState(true);
  const lastScanned = useRef('');

  useEffect(() => {
    if (!result) return;
    const t = setTimeout(() => { setResult(null); lastScanned.current = ''; }, 6000);
    return () => clearTimeout(t);
  }, [result]);

  useEffect(() => {
    if (!profile?.class_id) { setLoadingSess(false); return; }
    supabase
      .from('attendance_sessions')
      .select('id, title, jam_ke, start_time, is_open, subjects(name)')
      .eq('class_id', profile.class_id)
      .eq('date', todayISO())
      .order('jam_ke')
      .then(({ data }) => { setTodaySessions(data || []); setLoadingSess(false); });
  }, [profile?.class_id]);

  const processToken = useCallback(async (raw) => {
    if (processing || raw === lastScanned.current) return;
    lastScanned.current = raw;
    setProcessing(true);
    try {
      const { data: sessions, error: e1 } = await supabase
        .from('attendance_sessions')
        .select('id, title, jam_ke, class_id, is_open, token_expires_at')
        .eq('token', raw)
        .eq('is_open', true);

      if (e1) throw new Error('Gagal memverifikasi kode.');
      if (!sessions?.length) throw new Error('Kode tidak valid atau sesi sudah ditutup.');

      const sess = sessions[0];
      if (sess.class_id !== profile.class_id) throw new Error('Kode ini bukan untuk kelasmu.');
      if (sess.token_expires_at && new Date(sess.token_expires_at) < new Date())
        throw new Error('Kode absensi sudah kadaluarsa.');

      const { data: records, error: e2 } = await supabase
        .from('attendance_records')
        .select('id, status')
        .eq('attendance_session_id', sess.id)
        .eq('student_id', profile.id);

      if (e2) throw new Error('Gagal membaca data absensi.');
      if (!records?.length) throw new Error('Kamu tidak terdaftar di sesi ini. Hubungi guru.');

      const record = records[0];
      if (record.status === 'hadir') {
        setResult({ ok: true, title: 'Sudah Tercatat', message: `Kamu sudah hadir untuk ${sess.title}.` });
        return;
      }

      const { error: e3 } = await supabase
        .from('attendance_records')
        .update({ status: 'hadir', method: 'qr', checked_in_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', record.id);

      if (e3) throw new Error('Gagal menyimpan kehadiran: ' + e3.message);

      setResult({
        ok: true,
        title: '✅ Hadir Tercatat!',
        message: `Kehadiranmu untuk ${sess.title} tercatat pukul ${fmtJam(new Date().toISOString())}.`,
      });
      setTodaySessions(p => p.map(s => s.id === sess.id ? { ...s, _myStatus: 'hadir' } : s));
    } catch (err) {
      setResult({ ok: false, title: 'Gagal', message: err.message });
    } finally {
      setProcessing(false);
    }
  }, [processing, profile?.class_id, profile?.id]);

  return (
    <>
      <style>{`
        @keyframes fadeUp  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:none} }
        @keyframes spin    { to{transform:rotate(360deg)} }
        @keyframes popIn   { 0%{transform:scale(.85);opacity:0} 60%{transform:scale(1.04)} 100%{transform:scale(1);opacity:1} }
        @keyframes scanLine { 0%{top:17.5%} 50%{top:calc(82.5% - 2px)} 100%{top:17.5%} }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 440, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ opacity: 0, animation: 'fadeUp .35s ease forwards' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <QrCode size={15} color="#16A34A" />
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', margin: 0 }}>Absensi QR</h1>
          </div>
          <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>
            Scan QR Code atau barcode dari guru untuk mencatat kehadiran
          </p>
        </div>

        {/* Result banner */}
        {result && (
          <div style={{
            padding: '13px 15px', borderRadius: 13, animation: 'popIn .3s ease',
            background: result.ok ? '#F0FDF4' : '#FEF2F2',
            border: `1.5px solid ${result.ok ? '#86EFAC' : '#FECACA'}`,
            display: 'flex', gap: 10, alignItems: 'flex-start',
          }}>
            {result.ok
              ? <CheckCircle2 size={20} color="#16A34A" style={{ flexShrink: 0, marginTop: 1 }} />
              : <AlertCircle  size={20} color="#DC2626" style={{ flexShrink: 0, marginTop: 1 }} />}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: result.ok ? '#166534' : '#DC2626', marginBottom: 2 }}>{result.title}</div>
              <div style={{ fontSize: 12, color: result.ok ? '#166534' : '#DC2626', lineHeight: 1.5 }}>{result.message}</div>
            </div>
          </div>
        )}

        {/* Scanner card */}
        <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #F1F5F9', padding: 20, boxShadow: '0 2px 12px rgba(0,0,0,.05)' }}>
          <Scanner onScan={processToken} isProcessing={processing} />
        </div>

        {/* Sesi hari ini */}
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #F1F5F9', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,.04)' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={14} color="#4F46E5" />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Sesi Hari Ini</span>
            {todaySessions.filter(s => s.is_open).length > 0 && (
              <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: '#F0FDF4', color: '#16A34A' }}>
                {todaySessions.filter(s => s.is_open).length} Aktif
              </span>
            )}
          </div>
          <div style={{ padding: '6px 16px' }}>
            {loadingSess ? (
              <div style={{ padding: '16px 0', textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>Memuat…</div>
            ) : todaySessions.length === 0 ? (
              <div style={{ padding: '20px 0', textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>Belum ada sesi absensi hari ini</div>
            ) : (
              todaySessions.map((s, i) => (
                <div key={s.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0',
                  borderBottom: i < todaySessions.length - 1 ? '1px solid #F8FAFC' : 'none',
                }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: s.is_open ? '#F0FDF4' : '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: s.is_open ? '#16A34A' : '#94A3B8' }}>{s.jam_ke}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.subjects?.name || s.title}
                    </div>
                    <div style={{ fontSize: 11, color: '#94A3B8' }}>Jam ke-{s.jam_ke} · {fmtJam(s.start_time)}</div>
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 6, flexShrink: 0,
                    background: s._myStatus === 'hadir' ? '#F0FDF4' : s.is_open ? '#FFF7ED' : '#F8FAFC',
                    color: s._myStatus === 'hadir' ? '#16A34A' : s.is_open ? '#D97706' : '#94A3B8',
                  }}>
                    {s._myStatus === 'hadir' ? '✅ Hadir' : s.is_open ? 'Scan QR' : 'Ditutup'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </>
  );
}