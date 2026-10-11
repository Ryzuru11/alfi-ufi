"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, type Transition } from "framer-motion";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface Stats {
  totalSessions: number;
  totalPhotos: number;
  activeSessions: number;
  recentUploads: {
    sessionId: string;
    fileName: string;
    webViewLink: string;
    uploadedAt: string;
  }[];
}

interface DriveFile {
  id: string;
  name: string;
  createdTime: string;
  size: string;
  webViewLink: string;
  thumbnailLink?: string;
}

const cardTransition = (i: number): Transition => ({
  delay: i * 0.08,
  duration: 0.4,
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
});

const cardInitial = { opacity: 0, y: 20 };
const cardAnimate = { opacity: 1, y: 0 };

export default function AdminPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [photos, setPhotos] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"stats" | "photos">("stats");

  const fetchData = useCallback(async (pwd: string) => {
    setLoading(true);
    try {
      const [statsRes, photosRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/stats`, { headers: { password: pwd } }),
        fetch(`${API_URL}/api/admin/photos`, { headers: { password: pwd } }),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (photosRes.ok) {
        const d = await photosRes.json();
        setPhotos(d.files || []);
      }
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    try {
      const res = await fetch(`${API_URL}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        setIsLoggedIn(true);
        sessionStorage.setItem("admin_pwd", password);
        fetchData(password);
      } else {
        setLoginError("Password salah. Coba lagi!");
      }
    } catch {
      setLoginError("Tidak bisa terhubung ke server.");
    }
  };

  useEffect(() => {
    const saved = sessionStorage.getItem("admin_pwd");
    if (saved) { setPassword(saved); setIsLoggedIn(true); fetchData(saved); }
  }, [fetchData]);

  useEffect(() => {
    if (!isLoggedIn) return;
    const iv = setInterval(() => fetchData(sessionStorage.getItem("admin_pwd") || ""), 30000);
    return () => clearInterval(iv);
  }, [isLoggedIn, fetchData]);

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

  const formatSize = (bytes: string) => {
    const b = parseInt(bytes);
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
    return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  };

  // ═══════════════════════════════════════════
  // LOGIN
  // ═══════════════════════════════════════════
  if (!isLoggedIn) {
    return (
      <main className="min-h-screen flex items-center justify-center px-5 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-10 w-40 h-40 rounded-full bg-[#C9A84C]/5 blur-3xl" />
          <div className="absolute bottom-20 right-10 w-60 h-60 rounded-full bg-[#D4736A]/5 blur-3xl" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-sm w-full space-y-6 relative z-10"
        >
          <div className="text-center space-y-2">
            <div className="text-5xl mb-3">🔐</div>
            <h1 className="font-serif text-3xl font-light text-[#1A1208]">Dashboard</h1>
            <p className="text-[#8B7355] text-sm tracking-widest uppercase">Foto Nikah Alfi & Ufi</p>
            <div className="flex items-center gap-3 mt-2">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent to-[#C9A84C]/30" />
              <span className="text-[#C9A84C] text-xs">✦</span>
              <div className="flex-1 h-px bg-gradient-to-l from-transparent to-[#C9A84C]/30" />
            </div>
          </div>

          <form onSubmit={handleLogin} className="glass-card rounded-3xl p-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#8B7355] mb-2 tracking-wider uppercase">
                Password Admin
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password..."
                className="w-full border border-[#C9A84C]/20 rounded-2xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/30 focus:border-[#C9A84C]/40 text-[#1A1208] bg-white/50 backdrop-blur placeholder:text-[#C9A84C]/30 transition-all"
                required
              />
            </div>
            <AnimatePresence>
              {loginError && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-sm text-red-500"
                >
                  {loginError}
                </motion.p>
              )}
            </AnimatePresence>
            <button
              type="submit"
              className="btn-gold w-full text-white font-semibold py-3.5 rounded-2xl tracking-wide"
            >
              Masuk ke Dashboard
            </button>
          </form>
        </motion.div>
      </main>
    );
  }

  // ═══════════════════════════════════════════
  // DASHBOARD
  // ═══════════════════════════════════════════
  return (
    <main className="min-h-screen px-4 py-6 max-w-2xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6"
      >
        <div>
          <h1 className="font-serif text-2xl text-[#1A1208]">💍 Dashboard</h1>
          <p className="text-xs text-[#8B7355] tracking-widest uppercase mt-0.5">Foto Nikah Alfi & Ufi</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => fetchData(sessionStorage.getItem("admin_pwd") || "")}
            disabled={loading}
            className="text-sm bg-[#C9A84C]/10 text-[#C9A84C] px-3 py-1.5 rounded-full border border-[#C9A84C]/20 hover:bg-[#C9A84C]/20 transition-colors disabled:opacity-40"
          >
            {loading ? "⏳" : "🔄"}
          </button>
          <button
            onClick={() => { sessionStorage.removeItem("admin_pwd"); setIsLoggedIn(false); }}
            className="text-sm bg-gray-100 text-gray-500 px-3 py-1.5 rounded-full hover:bg-gray-200 transition-colors"
          >
            Keluar
          </button>
        </div>
      </motion.div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "Total Foto", value: stats.totalPhotos, color: "text-[#C9A84C]", icon: "📸" },
            { label: "Tamu Scan", value: stats.totalSessions, color: "text-[#D4736A]", icon: "👥" },
            { label: "Sesi Aktif", value: stats.activeSessions, color: "text-green-600", icon: "✅" },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={cardInitial}
              animate={cardAnimate}
              transition={cardTransition(i)}
              className="glass-card rounded-2xl p-4 text-center"
            >
              <div className="text-xl mb-1">{s.icon}</div>
              <div className={`text-2xl font-bold ${s.color} font-serif`}>{s.value}</div>
              <div className="text-xs text-[#8B7355] mt-0.5">{s.label}</div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex bg-[#F5EFE6] rounded-2xl p-1 mb-5 border border-[#C9A84C]/10">
        {(["stats", "photos"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 relative ${
              activeTab === tab ? "text-[#1A1208]" : "text-[#8B7355]"
            }`}
          >
            {activeTab === tab && (
              <motion.div
                layoutId="tabBg"
                className="absolute inset-0 bg-white rounded-xl shadow-sm border border-[#C9A84C]/15"
              />
            )}
            <span className="relative z-10">
              {tab === "stats" ? "📊 Aktivitas" : `🖼️ Foto (${photos.length})`}
            </span>
          </button>
        ))}
      </div>

      {/* Tab: Aktivitas */}
      <AnimatePresence mode="wait">
        {activeTab === "stats" && (
          <motion.div
            key="stats"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="space-y-2"
          >
            <h2 className="text-xs font-medium text-[#8B7355] tracking-widest uppercase mb-3">Upload Terbaru</h2>
            {!stats || stats.recentUploads.length === 0 ? (
              <div className="glass-card rounded-2xl p-10 text-center text-[#8B7355]">
                <div className="text-4xl mb-3">📸</div>
                <p className="text-sm">Belum ada foto yang masuk</p>
              </div>
            ) : (
              stats.recentUploads.map((u, i) => (
                <motion.div
                  key={i}
                  initial={cardInitial}
                  animate={cardAnimate}
                  transition={cardTransition(i)}
                  className="glass-card rounded-2xl p-3.5 flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C9A84C]/20 to-[#A07830]/20 flex items-center justify-center text-xl flex-shrink-0">
                    📷
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1A1208] truncate">{u.fileName}</p>
                    <p className="text-xs text-[#8B7355]">{formatTime(u.uploadedAt)}</p>
                  </div>
                  <a
                    href={u.webViewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#C9A84C] hover:text-[#A07830] flex-shrink-0 font-medium"
                  >
                    Lihat →
                  </a>
                </motion.div>
              ))
            )}
          </motion.div>
        )}

        {/* Tab: Foto Grid */}
        {activeTab === "photos" && (
          <motion.div
            key="photos"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
          >
            {photos.length === 0 ? (
              <div className="glass-card rounded-2xl p-10 text-center text-[#8B7355]">
                <div className="text-4xl mb-3">📁</div>
                <p className="text-sm">Belum ada foto di Google Drive</p>
              </div>
            ) : (
              <>
                <p className="text-xs text-[#8B7355] mb-3">
                  {photos.length} foto tersimpan di Google Drive
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {photos.map((file, i) => (
                    <motion.a
                      key={file.id}
                      initial={cardInitial}
                      animate={cardAnimate}
                      transition={cardTransition(i)}
                      href={file.webViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative aspect-square rounded-2xl overflow-hidden bg-[#F5EFE6]"
                    >
                      {file.thumbnailLink ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={file.thumbnailLink}
                          alt={file.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-[#8B7355]">
                          <div className="text-2xl">📷</div>
                          <p className="text-xs mt-1">{formatSize(file.size)}</p>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </motion.a>
                  ))}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <p className="text-center text-xs text-[#C9A84C]/40 mt-8">Auto-refresh setiap 30 detik ✦</p>
    </main>
  );
}
