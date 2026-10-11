require('dotenv').config();
const express = require('express');
const cors = require('cors');

const sessionRoutes = require('./routes/session');
const photoRoutes = require('./routes/photo');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: true, // allow semua origin saat development
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server foto nikah Alfi & Ufi berjalan!' });
});

// Routes
app.use('/api/session', sessionRoutes);
app.use('/api/photo', photoRoutes);
app.use('/api/admin', adminRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint tidak ditemukan' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: 'Terjadi kesalahan server', detail: err.message });
});

app.listen(PORT, () => {
  console.log(`🎉 Server berjalan di http://localhost:${PORT}`);
  console.log(`📁 Folder Drive: ${process.env.GOOGLE_DRIVE_FOLDER_ID || 'belum dikonfigurasi'}`);
});
