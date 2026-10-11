const express = require('express');
const router = express.Router();
const { getStats } = require('../services/sessionStore');
const { getFilesFromDrive } = require('../services/driveService');

/**
 * Middleware: cek password admin
 */
function checkAdminAuth(req, res, next) {
  const { password } = req.headers;
  const adminPassword = process.env.ADMIN_PASSWORD || 'alfiufi2025';

  if (password !== adminPassword) {
    return res.status(401).json({ error: 'Password salah' });
  }
  next();
}

/**
 * POST /api/admin/login
 * Verifikasi password admin
 */
router.post('/login', (req, res) => {
  const { password } = req.body;
  const adminPassword = process.env.ADMIN_PASSWORD || 'alfiufi2025';

  if (password !== adminPassword) {
    return res.status(401).json({ error: 'Password salah' });
  }

  res.json({ success: true, message: 'Login berhasil!' });
});

/**
 * GET /api/admin/stats
 * Statistik sesi dan foto (dari memory)
 */
router.get('/stats', checkAdminAuth, (req, res) => {
  const stats = getStats();
  res.json(stats);
});

/**
 * GET /api/admin/photos
 * Ambil daftar foto dari Google Drive
 */
router.get('/photos', checkAdminAuth, async (req, res) => {
  try {
    const files = await getFilesFromDrive();
    res.json({ files, total: files.length });
  } catch (error) {
    console.error('Error ambil foto Drive:', error.message);
    res.status(500).json({ error: 'Gagal ambil foto dari Drive: ' + error.message });
  }
});

module.exports = router;
