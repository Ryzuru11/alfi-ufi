const express = require('express');
const router = express.Router();
const multer = require('multer');
const { getSession, useToken, recordUpload } = require('../services/sessionStore');
const { uploadToDrive } = require('../services/driveService');

// Multer: simpan di memory, max 10MB per file
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Hanya file gambar yang diizinkan'));
    }
  },
});

/**
 * POST /api/photo/upload
 * Upload 1 foto dari tamu ke Google Drive
 * Body: multipart/form-data dengan field "photo" dan "sessionId"
 */
router.post('/upload', upload.single('photo'), async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId diperlukan' });
    }

    // Cek sesi ada
    const session = getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Sesi tidak ditemukan. Silakan scan QR ulang.' });
    }

    // Cek token masih ada
    if (session.tokensRemaining <= 0) {
      return res.status(403).json({ error: 'Token foto kamu sudah habis!' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'File foto tidak ditemukan' });
    }

    // Kurangi token dulu (supaya tidak bisa double upload)
    const tokenUsed = useToken(sessionId);
    if (!tokenUsed) {
      return res.status(403).json({ error: 'Token foto kamu sudah habis!' });
    }

    // Buat nama file unik dengan timestamp
    const now = new Date();
    const timestamp = now.toISOString()
      .replace(/T/, '_')
      .replace(/:/g, '-')
      .replace(/\..+/, '');
    const ext = req.file.originalname.split('.').pop() || 'jpg';
    const fileName = `foto_${timestamp}_${Math.random().toString(36).substr(2, 5)}.${ext}`;

    // Upload ke Google Drive
    const fileInfo = await uploadToDrive(req.file.buffer, fileName, req.file.mimetype);

    // Catat di log
    recordUpload(sessionId, {
      fileId: fileInfo.id,
      fileName: fileInfo.name,
      webViewLink: fileInfo.webViewLink,
    });

    // Ambil sesi terbaru setelah update
    const updatedSession = getSession(sessionId);

    res.json({
      success: true,
      message: 'Foto berhasil dikirim!',
      tokensRemaining: updatedSession.tokensRemaining,
      photosUploaded: updatedSession.photosUploaded,
      file: {
        name: fileInfo.name,
        webViewLink: fileInfo.webViewLink,
      },
    });

  } catch (error) {
    console.error('Upload error:', error.message);
    res.status(500).json({ error: 'Gagal mengirim foto: ' + error.message });
  }
});

module.exports = router;
