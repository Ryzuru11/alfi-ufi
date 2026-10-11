const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { createSession, getSession } = require('../services/sessionStore');

/**
 * POST /api/session/start
 * Tamu scan QR → sistem buat sesi baru dan beri token
 */
router.post('/start', (req, res) => {
  const sessionId = uuidv4();
  const session = createSession(sessionId);

  res.json({
    sessionId: session.sessionId,
    tokensRemaining: session.tokensRemaining,
    message: `Selamat datang! Kamu punya ${session.tokensRemaining} kesempatan foto.`,
  });
});

/**
 * GET /api/session/:sessionId
 * Cek status sesi (berapa token sisa)
 */
router.get('/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const session = getSession(sessionId);

  if (!session) {
    return res.status(404).json({ error: 'Sesi tidak ditemukan' });
  }

  res.json({
    sessionId: session.sessionId,
    tokensRemaining: session.tokensRemaining,
    photosUploaded: session.photosUploaded,
  });
});

module.exports = router;
