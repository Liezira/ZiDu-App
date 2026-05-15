import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  QrCode, Keyboard, CheckCircle2, AlertCircle,
  Camera, CameraOff, Loader2, Clock, RefreshCw,
} from 'lucide-react';

// ─── helpers ──────────────────────────────────────────────────────
const fmtJam = (ts) =>
  ts ? new Date(ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB' : '—';
const todayISO = () => new Date().toISOString().slice(0, 10);

// ─── QR scanner menggunakan BarcodeDetector API ───────────────────
const QRScanner = ({ onScan, isProcessing }) => {
  const videoRef   = useRef(null);
  const canvasRef  = useRef(null);
  const streamRef  = useRef(null);
  const rafRef     = useRef(null);
  const detectorRef = useRef(null);

  const [camStatus, setCamStatus] = useState('idle'); // idle | starting | active | error | unsupported

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
    setCamStatus('starting');

    // Cek dukungan BarcodeDetector
    if (!('BarcodeDetector' in window)) {
      setCamStatus('unsupported');
      return;
    }

    try {
      detectorRef.current = new window.BarcodeDetector({ formats: ['qr_code'] });
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
        if (!videoRef.current || videoRef.current.readyState < 2 || isProcessing) {
          rafRef.current = requestAnimationFrame(scan);
          return;
        }
        try {
          const codes = await detectorRef.current.detect(videoRef.current);
          if (codes.length > 0) {
            const raw = codes[0].rawValue.trim();
            onScan(raw);
          }
        } catch (_) { /* silent */ }
        rafRef.current = requestAnimationFrame(scan);
      };
      rafRef.current = requestAnimationFrame(scan);
    } catch (e) {
      setCamStatus('error');
    }
  }, [onScan, isProcessing, stopCamera]);

  useEffect(() => {
    startCamera();
    return stopCamera;
  }, [startCamera, stopCamera]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      {/* Viewfinder */}
      <div style={{ position: 'relative', width: '100%', maxWidth: 320, aspectRatio: '1', borderRadius: 16, overflow: 'hidden', background: '#0F172A', boxShadow: '0 8px 32px rgba(0,0,0,.2)' }}>
        <video
          ref={videoRef}
          muted playsInline
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: camStatus === 'active' ? 'block' : 'none' }}
        />
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* Corner guides */}
        {camStatus === 'active' && (
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            {/* Overlay gelap */}
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.35)' }} />
            {/* Area scan bersih */}
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%,-50%)',
              width: '65%', aspectRatio: '1',
              boxShadow: '0 0 0 9999px rgba(0,0,0,.45)',
              borderRadius: 8,
            }} />
            {/* Sudut */}
            {[['top','left'],['top','right'],['bottom','left'],['bottom','right']].map(([v,h]) => (
              <div key={`${v}-${h}`} style={{
                position: 'absolute',
                [v]: 'calc(17.5% - 2px)', [h]: 'calc(17.5% - 2px)',
                width: 22, height: 22,
                borderTop: v === 'top' ? '3px solid #4ADE80' : 'none',
                borderBottom: v === 'bottom' ? '3px solid #4ADE80' : 'none',
                borderLeft: h === 'left' ? '3px solid #4ADE80' : 'none',
                borderRight: h === 'right' ? '3px solid #4ADE80' : 'none',
                borderRadius: v === 'top' && h === 'left' ? '4px 0 0 0'
                            : v === 'top' && h === 'right' ? '0 4px 0 0'
                            : v === 'bottom' && h === 'left' ? '0 0 0 4px' : '0 0 4px 0',
              }} />
            ))}
            {/* Scan line animasi */}
            <div style={{
              position: 'absolute', left: '17.5%', right: '17.5%',
              height: 2, background: 'linear-gradient(90deg, transparent, #4ADE80, transparent)',
              animation: 'scanLine 2s linear infinite',
            }} />
          </div>
        )}

        {/* Status overlay */}
        {camStatus !== 'active' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 20 }}>
            {camStatus === 'starting' && (
              <>
                <Loader2 size={32} color="#94A3B8" style={{ animation: 'spin .7s linear infinite' }} />
                <span style={{ fontSize: 13, color: '#64748B', textAlign: 'center' }}>Memulai kamera…</span>
              </>
            )}
            {camStatus === 'error' && (
              <>
                <CameraOff size={32} color="#EF4444" />
                <span style={{ fontSize: 13, color: '#EF4444', textAlign: 'center' }}>Kamera tidak dapat diakses.<br />Izinkan akses kamera atau gunakan token manual.</span>
              </>
            )}
            {camStatus === 'unsupported' && (
              <>
                <Camera size={32} color="#F59E0B" />
                <span style={{ fontSize: 13, color: '#92400E', textAlign: 'center' }}>Browser ini tidak mendukung scan QR.<br />Gunakan Chrome/Edge terbaru, atau input token manual.</span>
              </>
            )}
          </div>
        )}

        {/* Processing overlay */}
        {isProcessing && camStatus === 'active' && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.6)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <Loader2 size={28} color="#fff" style={{ animation: 'spin .7s linear infinite' }} />
            <span style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>Memproses…</span>
          </div>
        )}
      </div>

      {camStatus === 'active' && (
        <p style={{ fontSize: 12, color: '#64748B', textAlign: 'center', margin: 0 }}>
          Arahkan kamera ke QR code yang ditampilkan guru
        </p>
      )}
      {(camStatus === 'error' || camStatus === 'unsupported') && (
        <button onClick={startCamera}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 9, border: '1.5px solid #E2E8F0', background: '#fff', fontSize: 13, fontWeight: 600, color: '#475569', cursor: 'pointer' }}>
          <RefreshCw size={13} /> Coba Lagi
        </button>
      )}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────
export default function StudentAttendancePage() {
  const { profile } = useAuth();

  const [tab, setTab] = useState('scan'); // scan | manual
  const [manualToken, setManualToken] = useState('');
  const [processing, setProcessing]   = useState(false);
  const [result, setResult]           = useState(null); // { ok, title, message, session }
  const [todaySessions, setTodaySessions] = useState([]);
  const [loadingSess, setLoadingSess]     = useState(true);

  // Reset result after 6 detik agar bisa scan lagi
  const lastScanned = useRef('');

  useEffect(() => {
    if (!result) return;
    const t = setTimeout(() => {
      setResult(null);
      lastScanned.current = '';
    }, 6000);
    return () => clearTimeout(t);
  }, [result]);

  // Ambil sesi absensi hari ini untuk kelas siswa
  useEffect(() => {
    if (!profile?.class_id) { setLoadingSess(false); return; }
    supabase
      .from('attendance_sessions')
      .select('id, title, jam_ke, start_time, is_open, subjects(name), classes(name)')
      .eq('class_id', profile.class_id)
      .eq('date', todayISO())
      .order('jam_ke')
      .then(({ data }) => {
        setTodaySessions(data || []);
        setLoadingSess(false);
      });
  }, [profile?.class_id]);

  // ── Logic absen via token ──────────────────────────────────────
  const processToken = useCallback(async (raw) => {
    // Hindari proses duplikat token yang sama berturut-turut
    if (processing || raw === lastScanned.current) return;
    lastScanned.current = raw;
    setProcessing(true);

    try {
      // Cari sesi by token (is_open masih true)
      const { data: sessions, error: e1 } = await supabase
        .from('attendance_sessions')
        .select('id, title, jam_ke, class_id, is_open, token_expires_at')
        .eq('token', raw)
        .eq('is_open', true);

      if (e1) throw new Error('Gagal memverifikasi token.');
      if (!sessions || sessions.length === 0)
        throw new Error('Token tidak valid atau sesi absensi sudah ditutup.');

      const sess = sessions[0];

      // Pastikan siswa berada di kelas yang benar
      if (sess.class_id !== profile.class_id)
        throw new Error('Token ini bukan untuk kelas kamu.');

      // Cek apakah token masih berlaku (token_expires_at)
      if (sess.token_expires_at && new Date(sess.token_expires_at) < new Date())
        throw new Error('Token absensi sudah kadaluarsa.');

      // Cari record absensi siswa ini di sesi tsb
      const { data: records, error: e2 } = await supabase
        .from('attendance_records')
        .select('id, status')
        .eq('attendance_session_id', sess.id)
        .eq('student_id', profile.id);

      if (e2) throw new Error('Gagal membaca data absensi.');

      if (!records || records.length === 0)
        throw new Error('Kamu tidak terdaftar di sesi absensi ini. Hubungi guru.');

      const record = records[0];

      if (record.status === 'hadir') {
        setResult({
          ok: true,
          title: 'Sudah Tercatat Hadir',
          message: `Kamu sudah tercatat Hadir untuk ${sess.title}.`,
          session: sess,
        });
        return;
      }

      // Update ke hadir
      const { error: e3 } = await supabase
        .from('attendance_records')
        .update({
          status: 'hadir',
          method: 'qr',
          checked_in_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', record.id);

      if (e3) throw new Error('Gagal menyimpan kehadiran: ' + e3.message);

      setResult({
        ok: true,
        title: '✅ Hadir Tercatat!',
        message: `Kehadiranmu untuk ${sess.title} berhasil tercatat pukul ${fmtJam(new Date().toISOString())}.`,
        session: sess,
      });
      // Refresh sesi hari ini
      setTodaySessions(p =>
        p.map(s => s.id === sess.id ? { ...s, _myStatus: 'hadir' } : s)
      );
    } catch (err) {
      setResult({ ok: false, title: 'Gagal', message: err.message });
    } finally {
      setProcessing(false);
    }
  }, [processing, profile?.class_id, profile?.id]);

  const handleManualSubmit = () => {
    const t = manualToken.trim().toUpperCase();
    if (!t) return;
    setManualToken('');
    processToken(t);
  };

  const inp = {
    width: '100%', boxSizing: 'border-box',
    padding: '12px 14px', borderRadius: 10,
    border: '1.5px solid #E2E8F0', fontSize: 15, letterSpacing: 3,
    fontWeight: 700, color: '#0F172A', outline: 'none',
    fontFamily: "'DM Sans', sans-serif", textTransform: 'uppercase',
    background: '#F8FAFC', textAlign: 'center',
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=DM+Sans:wght@400;500;600&display=swap');
        @keyframes fadeUp  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:none} }
        @keyframes spin    { to{transform:rotate(360deg)} }
        @keyframes scanLine {
          0%   { top: 17.5% }
          50%  { top: calc(82.5% - 2px) }
          100% { top: 17.5% }
        }
        @keyframes popIn { 0%{transform:scale(.85);opacity:0} 60%{transform:scale(1.04)} 100%{transform:scale(1);opacity:1} }
      `}</style>

      <div style={{ fontFamily: "'DM Sans', sans-serif", display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 480, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ opacity: 0, animation: 'fadeUp .4s ease forwards' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <QrCode size={15} color="#16A34A" />
            </div>
            <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 22, fontWeight: 700, color: '#0F172A', margin: 0 }}>Absensi QR</h1>
          </div>
          <p style={{ fontSize: 14, color: '#64748B', margin: 0 }}>
            Scan QR code dari guru untuk mencatat kehadiranmu
          </p>
        </div>

        {/* Result banner */}
        {result && (
          <div style={{
            padding: '16px 18px', borderRadius: 14,
            background: result.ok ? '#F0FDF4' : '#FEF2F2',
            border: `1.5px solid ${result.ok ? '#86EFAC' : '#FECACA'}`,
            display: 'flex', gap: 12, alignItems: 'flex-start',
            animation: 'popIn .3s ease',
          }}>
            {result.ok
              ? <CheckCircle2 size={22} color="#16A34A" style={{ flexShrink: 0, marginTop: 2 }} />
              : <AlertCircle  size={22} color="#DC2626" style={{ flexShrink: 0, marginTop: 2 }} />}
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: result.ok ? '#166534' : '#DC2626', marginBottom: 3 }}>{result.title}</div>
              <div style={{ fontSize: 13, color: result.ok ? '#166534' : '#DC2626', lineHeight: 1.5 }}>{result.message}</div>
            </div>
          </div>
        )}

        {/* Tab selector */}
        <div style={{ display: 'flex', gap: 0, borderRadius: 12, border: '1.5px solid #E2E8F0', overflow: 'hidden', background: '#F8FAFC' }}>
          {[
            { key: 'scan',   label: 'Scan QR',     icon: <QrCode size={13} /> },
            { key: 'manual', label: 'Token Manual', icon: <Keyboard size={13} /> },
          ].map(({ key, label, icon }) => (
            <button key={key} onClick={() => setTab(key)}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '11px 0', border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 700, fontFamily: "'DM Sans', sans-serif",
                background: tab === key ? '#16A34A' : 'transparent',
                color: tab === key ? '#fff' : '#64748B',
                transition: 'all .15s',
              }}>
              {icon} {label}
            </button>
          ))}
        </div>

        {/* Tab: Scan QR */}
        {tab === 'scan' && (
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #F1F5F9', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,.04)' }}>
            <QRScanner onScan={processToken} isProcessing={processing} />
          </div>
        )}

        {/* Tab: Manual Token */}
        {tab === 'manual' && (
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #F1F5F9', padding: '24px 20px', boxShadow: '0 2px 8px rgba(0,0,0,.04)', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ textAlign: 'center', marginBottom: 4 }}>
              <div style={{ width: 48, height: 48, borderRadius: 13, background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                <Keyboard size={20} color="#16A34A" />
              </div>
              <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 15, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>Masukkan Token Absensi</div>
              <div style={{ fontSize: 12, color: '#94A3B8' }}>Minta token 6 karakter kepada guru kamu</div>
            </div>
            <input
              value={manualToken}
              onChange={e => setManualToken(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              onKeyDown={e => e.key === 'Enter' && handleManualSubmit()}
              placeholder="CONTOH: AB3X7K"
              maxLength={6}
              style={inp}
              autoFocus
            />
            <button
              onClick={handleManualSubmit}
              disabled={manualToken.length < 6 || processing}
              style={{
                padding: '13px', borderRadius: 10, border: 'none',
                background: manualToken.length < 6 || processing ? '#E2E8F0' : '#16A34A',
                color: manualToken.length < 6 || processing ? '#94A3B8' : '#fff',
                fontSize: 14, fontWeight: 700, cursor: manualToken.length < 6 || processing ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                fontFamily: "'DM Sans', sans-serif",
              }}>
              {processing
                ? <><Loader2 size={15} style={{ animation: 'spin .7s linear infinite' }} />Memproses…</>
                : <><CheckCircle2 size={15} />Absen Sekarang</>}
            </button>
          </div>
        )}

        {/* Sesi absensi hari ini */}
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #F1F5F9', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,.04)' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={14} color="#4F46E5" />
            <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Sesi Hari Ini</span>
            {todaySessions.filter(s => s.is_open).length > 0 && (
              <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: '#F0FDF4', color: '#16A34A' }}>
                {todaySessions.filter(s => s.is_open).length} Aktif
              </span>
            )}
          </div>
          <div style={{ padding: '10px 18px' }}>
            {loadingSess ? (
              <div style={{ padding: '16px 0', textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>Memuat…</div>
            ) : todaySessions.length === 0 ? (
              <div style={{ padding: '20px 0', textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
                Belum ada sesi absensi hari ini
              </div>
            ) : (
              todaySessions.map((s, i) => (
                <div key={s.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 0',
                  borderBottom: i < todaySessions.length - 1 ? '1px solid #F8FAFC' : 'none',
                }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                    background: s.is_open ? '#F0FDF4' : '#F8FAFC',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ fontSize: 15, fontFamily: 'Sora, sans-serif', fontWeight: 700, color: s.is_open ? '#16A34A' : '#94A3B8' }}>
                      {s.jam_ke}
                    </span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.subjects?.name || s.title}
                    </div>
                    <div style={{ fontSize: 11, color: '#94A3B8' }}>
                      Jam ke-{s.jam_ke} · {fmtJam(s.start_time)}
                    </div>
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