"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import FloatingPetals from "./components/FloatingPetals";

const API_URL = "";
const MAX_TOKENS = 5;
const STORAGE_KEY = "foto_tokens";

type AppState = "welcome" | "camera" | "preview" | "uploading" | "success" | "done";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (d = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.5, delay: d, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }
  }),
};

export default function Page() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const facingRef = useRef<"environment" | "user">("environment");

  const [state, setState] = useState<AppState>("welcome");
  const [tokensLeft, setTokensLeft] = useState(MAX_TOKENS);
  const [uploadCount, setUploadCount] = useState(0);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [imgBlob, setImgBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [flash, setFlash] = useState(false);

  // Load token dari localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const { tokens, uploads } = JSON.parse(saved);
        setTokensLeft(tokens ?? MAX_TOKENS);
        setUploadCount(uploads ?? 0);
        if ((tokens ?? MAX_TOKENS) <= 0) setState("done");
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  // Simpan token ke localStorage setiap berubah
  const saveTokens = useCallback((tokens: number, uploads: number) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ tokens, uploads }));
  }, []);

  // ── Camera helpers ──
  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  // Assign stream ke video setelah render
  useEffect(() => {
    if (state !== "camera") return;
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream) return;

    // Kalau sudah ada stream yang sama, skip
    if (video.srcObject === stream) return;

    video.srcObject = stream;
    const play = () => { video.play().catch(() => {}); };
    video.addEventListener("loadedmetadata", play, { once: true });
    if (video.readyState >= 2) play();

    return () => video.removeEventListener("loadedmetadata", play);
  }, [state, facing]); // re-run juga saat facing berubah

  useEffect(() => () => stopStream(), [stopStream]);

  const openCamera = useCallback(async (mode: "environment" | "user") => {
    setError(null);

    // Stop semua track lama
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;

    // Reset video element
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    try {
      const constraints = {
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      facingRef.current = mode;
      setFacing(mode);

      // Langsung assign jika video element sudah ada di DOM
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }

      setState("camera");
    } catch (err) {
      console.error("Camera error:", err);
      setError("Izinkan akses kamera di browser ya, lalu coba lagi.");
    }
  }, []);

  // ── Actions ──
  const capture = () => {
    const v = videoRef.current;
    const c = canvasRef.current;
    if (!v || !c) return;

    setFlash(true);
    setTimeout(() => setFlash(false), 250);

    c.width = v.videoWidth || 1280;
    c.height = v.videoHeight || 720;
    const ctx = c.getContext("2d")!;

    if (facingRef.current === "user") {
      ctx.translate(c.width, 0);
      ctx.scale(-1, 1);
    }
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
    if (!imgBlob) return;

    // Cek token di sisi client
    if (tokensLeft <= 0) {
      setError("Token foto kamu sudah habis!");
      return;
    }

    setState("uploading");
    setError(null);

    try {
      const fd = new FormData();
      fd.append("photo", imgBlob, `foto_${Date.now()}.jpg`);
      fd.append("tokenCount", String(uploadCount + 1));

      const r = await fetch(`${API_URL}/api/photo/upload`, {
        method: "POST",
        body: fd,
      });

      const d = await r.json();

      if (!r.ok) throw new Error(d.error || "Gagal upload");

      // Update token di client
      const newTokens = tokensLeft - 1;
      const newUploads = uploadCount + 1;
      setTokensLeft(newTokens);
      setUploadCount(newUploads);
      saveTokens(newTokens, newUploads);

      setState(newTokens <= 0 ? "done" : "success");

    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Gagal mengirim foto, coba lagi.");
      setState("preview");
    }
  };

  const retake = useCallback(() => {
    if (imgUrl) URL.revokeObjectURL(imgUrl);
    setImgUrl(null); setImgBlob(null);
    openCamera(facingRef.current);
  }, [imgUrl, openCamera]);

  const nextSnap = useCallback(() => {
    if (imgUrl) URL.revokeObjectURL(imgUrl);
    setImgUrl(null); setImgBlob(null);
    openCamera(facingRef.current);
  }, [imgUrl, openCamera]);

  const flipCam = useCallback(() => {
    const newMode = facingRef.current === "environment" ? "user" : "environment";
    openCamera(newMode);
  }, [openCamera]);

  const resetAndStart = () => {
    localStorage.removeItem(STORAGE_KEY);
    setTokensLeft(MAX_TOKENS);
    setUploadCount(0);
    openCamera("environment");
  };

  // ════════════════════════════════════════════
  // WELCOME
  // ════════════════════════════════════════════
  if (state === "welcome") return (
    <main className="min-h-screen bg-romantic flex flex-col items-center justify-center px-5 relative overflow-hidden">
      <FloatingPetals />
      <div className="w-full max-w-xs relative z-10 flex flex-col items-center gap-5">

        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0} className="text-center">
          <div className="text-5xl mb-3">💍</div>
          <p className="font-body text-xs tracking-[0.25em] text-[#B8963E] uppercase mb-1">The Wedding of</p>
          <h1 className="font-display text-[2.6rem] leading-tight text-[#3D2B1F]">
            Alfi <span className="text-[#B8963E] italic">&amp;</span> Ufi
          </h1>
          <div className="divider mt-3"><span>✦</span></div>
        </motion.div>

        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0.15}
          className="card rounded-3xl p-5 w-full text-center space-y-3">
          <p className="font-body text-xs text-[#9B8060] tracking-widest uppercase">Kamu mendapat</p>
          <div className="flex justify-center gap-2">
            {Array.from({ length: MAX_TOKENS }, (_, i) => (
              <motion.div key={i}
                className={`token-dot ${i < tokensLeft ? "active" : "used"}`}
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ delay: 0.3 + i * 0.07, type: "spring", stiffness: 260, damping: 18 }}
              />
            ))}
          </div>
          <p className="font-display text-3xl text-[#B8963E]">
            {tokensLeft === MAX_TOKENS ? `${MAX_TOKENS} Foto Gratis` : `${tokensLeft} Foto Tersisa`}
          </p>
          <p className="font-body text-xs text-[#9B8060] leading-relaxed">
            Foto kamu langsung tersimpan sebagai kenangan kami bersama 🌸
          </p>
        </motion.div>

        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="font-body text-sm text-red-600 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 w-full text-center">
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button variants={fadeUp} initial="hidden" animate="show" custom={0.3}
          onClick={() => openCamera("environment")}
          className="btn-primary w-full py-4 rounded-2xl text-base"
        >
          {tokensLeft > 0 ? `📷  Mulai Foto` : "Token Habis"}
        </motion.button>

        <motion.p variants={fadeUp} initial="hidden" animate="show" custom={0.4}
          className="font-body text-xs text-[#B8963E] opacity-50 tracking-widest">
          Dengan penuh cinta ✦ Alfi &amp; Ufi
        </motion.p>
      </div>
    </main>
  );

  // ════════════════════════════════════════════
  // CAMERA
  // ════════════════════════════════════════════
  if (state === "camera") return (
    <main style={{
      position: "fixed", inset: 0, height: "100dvh",
      display: "flex", flexDirection: "column",
      background: "#000", overflow: "hidden",
      WebkitUserSelect: "none", userSelect: "none",
    }}>
      {/* Flash */}
      <AnimatePresence>
        {flash && (
          <motion.div initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 0.25 }}
            style={{ position: "absolute", inset: 0, background: "white", zIndex: 50, pointerEvents: "none" }} />
        )}
      </AnimatePresence>

      {/* Top bar */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, zIndex: 20,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 16px",
        background: "linear-gradient(to bottom, rgba(0,0,0,0.65), transparent)",
      }}>
        <button onClick={() => { stopStream(); setState("welcome"); }}
          style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 999, padding: "6px 14px" }}>
          ← Kembali
        </button>
        <div style={{ display: "flex", gap: 6 }}>
          {Array.from({ length: MAX_TOKENS }, (_, i) => (
            <div key={i} style={{
              width: 10, height: 10, borderRadius: "50%",
              background: i < tokensLeft ? "linear-gradient(135deg,#D4AF6A,#B8963E)" : "rgba(255,255,255,0.2)",
              boxShadow: i < tokensLeft ? "0 0 6px rgba(212,175,106,0.7)" : "none",
            }} />
          ))}
        </div>
        <button onClick={flipCam}
          style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 999, padding: "6px 14px" }}>
          🔄 Balik
        </button>
      </div>

      {/* Video */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden", minHeight: 0 }}>
        <video ref={videoRef} autoPlay playsInline muted
          style={{
            width: "100%", height: "100%", objectFit: "cover", display: "block",
            transform: facing === "user" ? "scaleX(-1)" : "none",
          }} />
      </div>

      {/* Shutter */}
      <div style={{
        flexShrink: 0, background: "rgba(0,0,0,0.85)",
        paddingTop: 20, paddingBottom: 36,
        display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
      }}>
        <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase" }}>
          {tokensLeft} kesempatan tersisa
        </p>
        <button onClick={capture} aria-label="Ambil foto"
          style={{
            width: 80, height: 80, borderRadius: "50%",
            border: "4px solid rgba(255,255,255,0.85)",
            background: "transparent", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            WebkitTapHighlightColor: "transparent",
          }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "white" }} />
        </button>
        <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 11 }}>Ketuk untuk foto</p>
      </div>

      <canvas ref={canvasRef} style={{ display: "none" }} />
    </main>
  );

  // ════════════════════════════════════════════
  // PREVIEW
  // ════════════════════════════════════════════
  if (state === "preview") return (
    <main style={{ position: "fixed", inset: 0, height: "100dvh", display: "flex", flexDirection: "column", background: "#000" }}>
      <div style={{ flex: 1, position: "relative", overflow: "hidden", minHeight: 0 }}>
        {imgUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <motion.img src={imgUrl} alt="Preview"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}
            style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
        )}
      </div>

      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ margin: "0 16px 8px", background: "rgba(239,68,68,0.9)", color: "white", borderRadius: 16, padding: "12px 16px", textAlign: "center", fontSize: 14 }}>
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        style={{ flexShrink: 0, padding: "16px 16px 36px", display: "flex", gap: 12, background: "rgba(0,0,0,0.9)" }}>
        <button onClick={retake}
          style={{ flex: 1, padding: "16px 0", borderRadius: 20, border: "1.5px solid rgba(255,255,255,0.2)", background: "transparent", color: "rgba(255,255,255,0.75)", fontSize: 15, fontWeight: 500, cursor: "pointer" }}>
          🔄 Foto Ulang
        </button>
        <button onClick={sendPhoto}
          style={{ flex: 2, padding: "16px 0", borderRadius: 20, border: "none", background: "linear-gradient(135deg,#C9A84C,#E2C97E,#B8963E)", color: "white", fontSize: 15, fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 20px rgba(184,150,62,0.4)" }}>
          Kirim Foto ✉️
        </button>
      </motion.div>
    </main>
  );

  // ════════════════════════════════════════════
  // UPLOADING
  // ════════════════════════════════════════════
  if (state === "uploading") return (
    <main style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#000" }}>
      <div style={{ textAlign: "center" }}>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
          style={{ width: 56, height: 56, borderRadius: "50%", border: "3px solid rgba(184,150,62,0.3)", borderTopColor: "#D4AF6A", margin: "0 auto 20px" }} />
        <p style={{ color: "white", fontFamily: "Georgia,serif", fontSize: 22, fontWeight: 300 }}>Mengirim foto...</p>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginTop: 6 }}>Tunggu sebentar 🌸</p>
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 16 }}>
          {[0,1,2].map(i => (
            <motion.div key={i} animate={{ opacity: [0.2,1,0.2], scale: [0.8,1,0.8] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
              style={{ width: 8, height: 8, borderRadius: "50%", background: "#D4AF6A" }} />
          ))}
        </div>
      </div>
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
          style={{ width: 80, height: 80, borderRadius: "50%", background: "linear-gradient(135deg,#D4AF6A,#B8963E)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 32px rgba(184,150,62,0.4)" }}>
          <svg style={{ width: 40, height: 40, color: "white" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
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
            📸 Foto Lagi
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
        {/* Reset untuk tamu baru */}
        <button onClick={resetAndStart}
          className="font-body text-xs text-[#B8963E]/40 py-2">
          Tamu baru? Mulai dari sini
        </button>
      </div>
    </main>
  );

  return null;
}
