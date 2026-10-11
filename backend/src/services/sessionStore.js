/**
 * Session store sederhana menggunakan Map di memory.
 * Menyimpan sesi tamu beserta jumlah token dan foto yang sudah dikirim.
 * 
 * Format data:
 * {
 *   sessionId: string,
 *   tokensRemaining: number,
 *   photosUploaded: number,
 *   createdAt: Date,
 *   lastActivity: Date,
 * }
 */

const sessions = new Map();
const uploadLog = []; // log semua upload untuk dashboard

const TOKENS_PER_SESSION = parseInt(process.env.TOKENS_PER_SESSION) || 5;

/**
 * Buat sesi baru dan kembalikan sessionId + token awal
 */
function createSession(sessionId) {
  const session = {
    sessionId,
    tokensRemaining: TOKENS_PER_SESSION,
    photosUploaded: 0,
    createdAt: new Date(),
    lastActivity: new Date(),
  };
  sessions.set(sessionId, session);
  return session;
}

/**
 * Ambil sesi berdasarkan ID, return null kalau tidak ada
 */
function getSession(sessionId) {
  return sessions.get(sessionId) || null;
}

/**
 * Kurangi 1 token dari sesi. Return false kalau token habis.
 */
function useToken(sessionId) {
  const session = sessions.get(sessionId);
  if (!session || session.tokensRemaining <= 0) return false;

  session.tokensRemaining -= 1;
  session.lastActivity = new Date();
  return true;
}

/**
 * Catat foto berhasil diupload
 */
function recordUpload(sessionId, fileInfo) {
  const session = sessions.get(sessionId);
  if (session) {
    session.photosUploaded += 1;
    session.lastActivity = new Date();
  }

  // Tambahkan ke log global
  uploadLog.unshift({
    sessionId,
    ...fileInfo,
    uploadedAt: new Date(),
  });

  // Batasi log maksimal 500 entri
  if (uploadLog.length > 500) uploadLog.pop();
}

/**
 * Kembalikan statistik untuk dashboard admin
 */
function getStats() {
  const allSessions = Array.from(sessions.values());
  const totalSessions = allSessions.length;
  const totalPhotos = uploadLog.length;
  const activeSessions = allSessions.filter(s => s.tokensRemaining > 0).length;

  return {
    totalSessions,
    totalPhotos,
    activeSessions,
    recentUploads: uploadLog.slice(0, 20),
  };
}

module.exports = { createSession, getSession, useToken, recordUpload, getStats };
