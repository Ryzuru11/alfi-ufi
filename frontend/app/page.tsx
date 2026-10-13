"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import FloatingPetals from "./components/FloatingPetals";

const API_URL = "";
const MAX_TOKENS = 5;

type AppState = "welcome" | "camera" | "preview" | "uploading" | "success" | "done";
interface Session { sessionId: string; tokensRemaining: number; photosUploaded: number }

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (d = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.55, delay: d, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] } }),
};

export default function Page() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [state, setState] = useState<AppState>("welcome");
  const [session, setSession] = useState<Session | null>(null);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [imgBlob, setImgBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [flash, setFlash] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);

  // Restore session
  useEffect(() => {
    const s = localStorage.getItem("fs");
    if (!s) return;
    try {
      const p: Session = JSON.parse(s);
      // Verifikasi sesi masih valid di server
      fetch(`${API_URL}/api/session/${p.sessionId}`)
        .then(r => {
          if (!r.ok) throw new Error("expired");
          return r.json();
        })
        .then((data: Session) => {
          setSession(data);
          setUploadCount(data.photosUploaded || 0);
          if (data.tokensRemaining <= 0) setState("done");
        })
        .catch(() => {
          // Sesi expired atau server restart, hapus
          localStorage.removeItem("fs");
        });
    } catch { localStorage.removeItem("fs"); }
  }, []);

  useEffect(() => { if (session) localStorage.setItem("fs", JSON.stringify(session)); }, [session]);

  // ── helpers ──
  const stopStream = () => { streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null; };

  const openCamera = useCallback(async (mode: "environment" | "user") => {
    setError(null);
    try {
      stopStream();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setState("camera");
    } catch {
      setError("Izinkan akses kamera di browser ya, lalu coba lagi.");
    }
  }, []);

  useEffect(() => () => stopStream(), []);

  const startNew = async () => {
    setError(null);
    try {
      const r = await fetch(`${API_URL}/api/session/start`, { method: "POST" });
      if (!r.ok) throw new Error();
      const d: Session = await r.json();
      setSession(d);
      openCamera(facing);
    } catch { setError("Server tidak bisa dihubungi. Coba lagi!"); }
  };

  const capture = () => {
    const v = videoRef.current; const c = canvasRef.current;
    if (!v || !c) return;
    setFlash(true); setTimeout(() => setFlash(false), 250);
    c.width = v.videoWidth; c.height = v.videoHeight;
    const ctx = c.getContext("2d")!;
    if (facing === "user") { ctx.translate(c.width, 0); ctx.scale(-1, 1); }
    ctx.drawImage(v, 0, 0);
    c.toBlob(blob => {
      if (!blob) return;
      if (imgUrl) URL.revokeObjectURL(imgUrl);
      setImgUrl(URL.createObjectURL(blob));
      setImgBlob(blob);
      stopStream();
      setState("preview");
    }, "image/jpeg", 0.92);
  };

  const sendPhoto = async () => {
    if (!imgBlob || !session) return;
    setState("uploading");
    setError(null);
    try {
      const fd = new FormData();
      fd.append("photo", imgBlob, `foto_${Date.now()}.jpg`);
      fd.append("sessionId", session.sessionId);
      const r = await fetch(`${API_URL}/api/photo/upload`, { method: "POST", body: fd });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setUploadCount(c => c + 1);
      setSession(prev => prev ? { ...prev, tokensRemaining: d.tokensRemaining, photosUploaded: d.photosUploaded } : prev);
      setState(d.tokensRemaining <= 0 ? "done" : "success");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Gagal mengirim foto");
      setState("preview");
    }
  };

  const retake = () => { if (imgUrl) URL.revokeObjectURL(imgUrl); setImgUrl(null); setImgBlob(null); openCamera(facing); };
  const nextSnap = () => { if (imgUrl) URL.revokeObjectURL(imgUrl); setImgUrl(null); setImgBlob(null); openCamera(facing); };
  const flipCam = () => { const m = facing === "environment" ? "user" : "environment"; setFacing(m); openCamera(m); };

  const tokensLeft = session?.tokensRemaining ?? MAX_TOKENS;

  // ════════════════════════════════════════════
  // WELCOME
  // ════════════════════════════════════════════
  if (state === "welcome") return (
    <main className="min-h-screen bg-romantic flex flex-col items-center justify-center px-5 relative overflow-hidden">
      <FloatingPetals />

      <div className="w-full max-w-xs relative z-10 flex flex-col items-center gap-5">

        {/* ── Hero ── */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0} className="text-center">
          <div className="text-5xl mb-3">💍</div>
          <p className="font-body text-xs tracking-[0.25em] text-[#B8963E] uppercase mb-1">The Wedding of</p>
          <h1 className="font-display text-[2.6rem] leading-tight text-[#3D2B1F]">
            Alfi <span className="text-[#B8963E] italic">&amp;</span> Ufi
          </h1>
          <div className="divider mt-3"><span>✦</span></div>
        </motion.div>

        {/* ── Card info ── */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0.15}
          className="card rounded-3xl p-5 w-full text-center space-y-3">
          <p className="font-body text-xs text-[#9B8060] tracking-widest uppercase">Kamu mendapat</p>

          {/* Token dots */}
          <div className="flex justify-center gap-2">
            {Array.from({ length: MAX_TOKENS }, (_, i) => (
              <motion.div key={i} className="token-dot active"
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ delay: 0.3 + i * 0.07, type: "spring", stiffness: 260, damping: 18 }} />
            ))}
          </div>

          <p className="font-display text-3xl text-[#B8963E]">5 Foto Gratis</p>
          <p className="font-body text-xs text-[#9B8060] leading-relaxed">
            Foto kamu langsung tersimpan sebagai kenangan kami bersama 🌸
          </p>
        </motion.div>

        {/* ── Error ── */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="font-body text-sm text-red-600 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 w-full text-center">
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── CTA ── */}
        <motion.button variants={fadeUp} initial="hidden" animate="show" custom={0.3}
          onClick={session && tokensLeft > 0 ? () => openCamera(facing) : startNew}
          className="btn-primary w-full py-4 rounded-2xl text-base"
        >
          {session && tokensLeft > 0 ? `📷  Lanjut Foto  ·  ${tokensLeft} sisa` : "📷  Mulai Foto"}
        </motion.button>

        <motion.p variants={fadeUp} initial="hidden" animate="show" custom={0.4}
          className="font-body text-xs text-[#B8963E] opacity-50 tracking-widest">
          Dengan penuh cinta  ✦  Alfi &amp; Ufi
        </motion.p>
      </div>
    </main>
  );

  // ════════════════════════════════════════════
  // CAMERA
  // ════════════════════════════════════════════
  if (state === "camera") return (
    <main className="fixed inset-0 flex flex-col bg-black overflow-hidden" style={{ height: '100dvh' }}>
      {/* Flash */}
      <AnimatePresence>
        {flash && <motion.div initial={{ opacity: 0.9 }} animate={{ opacity: 0 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }} className="absolute inset-0 bg-white z-50 pointer-events-none" />}
      </AnimatePresence>

      {/* Top bar */}
      <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between px-4 py-3
        bg-gradient-to-b from-black/70 to-transparent">
        <button onClick={() => { stopStream(); setState("welcome"); }}
          className="font-body text-white/75 text-sm bg-white/10 px-3 py-1.5 rounded-full border border-white/15">
          ← Kembali
        </button>
        <div className="flex gap-1.5">
          {Array.from({ length: MAX_TOKENS }, (_, i) => (
            <div key={i} className={`token-dot ${i < tokensLeft ? "active" : "used"}`} />
          ))}
        </div>
        <button onClick={flipCam}
          className="font-body text-white/75 text-sm bg-white/10 px-3 py-1.5 rounded-full border border-white/15">
          🔄
        </button>
      </div>

      {/* Video */}
      <div className="flex-1 relative">
        <video ref={videoRef} autoPlay playsInline muted
          className={`w-full h-full object-cover ${facing === "user" ? "scale-x-[-1]" : ""}`} />
        {/* Grid thirds */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.07) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.07) 1px,transparent 1px)", backgroundSize: "33.33% 33.33%" }} />
      </div>

      {/* Bottom — shutter */}
      <div className="bg-black/80 pb-10 pt-6 flex flex-col items-center gap-2">
        <p className="font-body text-white/40 text-xs tracking-widest mb-1">
          {tokensLeft} kesempatan foto tersisa
        </p>
        <button onClick={capture}
          className="shutter w-20 h-20 rounded-full border-4 border-white/80 flex items-center justify-center active:scale-95 transition-transform">
          <div className="w-14 h-14 rounded-full bg-white" />
        </button>
        <p className="font-body text-white/30 text-xs mt-1">Ketuk untuk foto</p>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </main>
  );

  // ════════════════════════════════════════════
  // PREVIEW
  // ════════════════════════════════════════════
  if (state === "preview") return (
    <main className="fixed inset-0 flex flex-col bg-black" style={{ height: '100dvh' }}>
      <div className="flex-1 relative overflow-hidden">
        {imgUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <motion.img src={imgUrl} alt="Preview" initial={{ opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }} className="w-full h-full object-contain" />
        )}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.45) 100%)" }} />
      </div>

      <AnimatePresence>
        {error && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="font-body mx-4 mb-2 text-sm text-white bg-red-500/90 backdrop-blur rounded-2xl p-3 text-center">
          {error}
        </motion.div>}
      </AnimatePresence>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="p-4 flex gap-3 bg-gradient-to-t from-black via-black/90 to-transparent pt-10">
        <button onClick={retake} className="btn-outline flex-1 py-4 rounded-2xl font-body text-sm text-white/70 border-white/20">
          🔄  Foto Ulang
        </button>
        <button onClick={sendPhoto} className="btn-primary flex-[2] py-4 rounded-2xl font-body">
          Kirim Foto  ✉️
        </button>
      </motion.div>
    </main>
  );

  // ════════════════════════════════════════════
  // UPLOADING
  // ════════════════════════════════════════════
  if (state === "uploading") return (
    <main className="fixed inset-0 flex items-center justify-center bg-black">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-5 px-6">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
          className="w-14 h-14 rounded-full border-2 border-[#B8963E]/30 border-t-[#D4AF6A] mx-auto" />
        <div>
          <p className="font-display text-2xl text-white font-light">Mengirim foto...</p>
          <p className="font-body text-white/40 text-sm mt-1">Tunggu sebentar 🌸</p>
        </div>
        <div className="flex justify-center gap-1.5">
          {[0, 1, 2].map(i => (
            <motion.div key={i} animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1, 0.8] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
              className="w-2 h-2 rounded-full bg-[#D4AF6A]" />
          ))}
        </div>
      </motion.div>
    </main>
  );

  // ════════════════════════════════════════════
  // SUCCESS
  // ════════════════════════════════════════════
  if (state === "success") return (
    <main className="min-h-screen bg-romantic flex flex-col items-center justify-center px-5 relative overflow-hidden">
      <FloatingPetals />
      <div className="w-full max-w-xs relative z-10 flex flex-col items-center gap-5">

        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 220, damping: 14 }}
          className="w-20 h-20 rounded-full flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #D4AF6A, #B8963E)", boxShadow: "0 8px 32px rgba(184,150,62,0.4)" }}>
          <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <motion.path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.45, delay: 0.2 }} />
          </svg>
        </motion.div>

        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0.1} className="text-center">
          <h2 className="font-display text-3xl text-[#3D2B1F]">Foto Terkirim!</h2>
          <p className="font-body text-sm text-[#9B8060] mt-1">Terima kasih sudah mengabadikan momen ini 💕</p>
        </motion.div>

        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0.2}
          className="card rounded-3xl p-5 w-full text-center space-y-2">
          <p className="font-body text-xs text-[#9B8060] tracking-widest uppercase">Token tersisa</p>
          <div className="flex justify-center gap-2 py-1">
            {Array.from({ length: MAX_TOKENS }, (_, i) => (
              <div key={i} className={`token-dot ${i < tokensLeft ? "active" : "used"}`} />
            ))}
          </div>
          <p className="font-display text-2xl text-[#B8963E]">
            {tokensLeft} <span className="font-body text-sm text-[#9B8060]">foto lagi</span>
          </p>
        </motion.div>

        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0.3} className="w-full space-y-2">
          <button onClick={nextSnap} className="btn-primary w-full py-4 rounded-2xl font-body">
            📸  Foto Lagi
          </button>
          <button onClick={() => setState("welcome")}
            className="font-body w-full py-2 text-sm text-[#9B8060] hover:text-[#B8963E] transition-colors">
            Kembali ke beranda
          </button>
        </motion.div>
      </div>
    </main>
  );

  // ════════════════════════════════════════════
  // DONE
  // ════════════════════════════════════════════
  if (state === "done") return (
    <main className="min-h-screen bg-romantic flex flex-col items-center justify-center px-5 relative overflow-hidden">
      <FloatingPetals />
      <div className="w-full max-w-xs relative z-10 flex flex-col items-center gap-5">

        <motion.div animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 3, repeat: Infinity }}
          className="text-7xl">🌸</motion.div>

        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0} className="text-center">
          <h2 className="font-display text-4xl text-[#3D2B1F] font-light">Terima Kasih!</h2>
          <div className="divider mt-3"><span>✦</span></div>
        </motion.div>

        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0.15}
          className="card rounded-3xl p-6 w-full text-center space-y-2">
          <div className="text-4xl">📷</div>
          <p className="font-display text-2xl text-[#B8963E]">{uploadCount} foto tersimpan</p>
          <p className="font-body text-sm text-[#9B8060] leading-relaxed">
            Foto kamu akan menjadi kenangan indah bagi Alfi &amp; Ufi 💍
          </p>
        </motion.div>

        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0.3}
          className="w-full rounded-3xl p-5 text-center border border-[#D4AF6A]/30"
          style={{ background: "linear-gradient(135deg, #FDF8F0, #FBF0E4)" }}>
          <p className="font-display text-xl text-[#B8963E] italic">&ldquo;Alfi &amp; Ufi&rdquo;</p>
          <p className="font-body text-sm text-[#9B8060] mt-1.5 leading-relaxed">
            Mengucapkan terima kasih atas kehadiran<br />dan doa restu kamu 🙏
          </p>
        </motion.div>
      </div>
    </main>
  );

  return null;
}
