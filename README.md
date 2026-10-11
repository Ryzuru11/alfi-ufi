# 📸 Foto Booth Nikah Alfi & Ufi

Web app foto booth untuk acara pernikahan. Tamu scan QR → foto pakai HP → foto langsung masuk Google Drive mempelai.

## Struktur Project

```
weading1.1/
├── frontend/     → Next.js (halaman tamu + dashboard admin)
├── backend/      → Express.js API (token, upload Drive)
└── README.md
```

---

## 🚀 Cara Menjalankan (Development)

### 1. Setup Backend

```bash
cd backend
cp .env.example .env
# Edit .env dengan credentials Google Drive kamu
npm install
npm run dev
```

### 2. Setup Frontend

```bash
cd frontend
cp .env.local.example .env.local
# Edit NEXT_PUBLIC_API_URL jika diperlukan
npm install
npm run dev
```

Frontend berjalan di `http://localhost:3000`
Backend berjalan di `http://localhost:3001`

---

## ⚙️ Setup Google Cloud (WAJIB sebelum deploy)

### Langkah-langkah:

1. **Buka** https://console.cloud.google.com
2. **Buat project baru** → nama: `foto-nikah-alfi-ufi`
3. **Enable Google Drive API:**
   - Menu → APIs & Services → Library
   - Cari "Google Drive API" → Enable
4. **Buat Service Account:**
   - Menu → IAM & Admin → Service Accounts
   - Klik "Create Service Account"
   - Nama: `foto-booth`
   - Klik Done
5. **Download credentials JSON:**
   - Klik service account yang baru dibuat
   - Tab "Keys" → Add Key → JSON
   - Simpan file JSON-nya (jangan share!)
6. **Buat folder di Google Drive:**
   - Nama folder: `Foto Nikah Alfi & Ufi`
   - Klik kanan folder → Share
   - Masukkan email service account (ada di file JSON, field `client_email`)
   - Beri akses **Editor**
   - Copy ID folder dari URL: `drive.google.com/drive/folders/[INI_ID_NYA]`
7. **Isi .env backend:**
   ```
   GOOGLE_SERVICE_ACCOUNT_EMAIL=xxx@xxx.iam.gserviceaccount.com
   GOOGLE_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n"
   GOOGLE_DRIVE_FOLDER_ID=id_folder_kamu
   ```

---

## 📱 QR Code

Setelah deploy ke Vercel, buat QR code dari URL Vercel kamu:
- Pakai https://qr.io atau https://qrcode-monkey.com
- URL: `https://nama-app-kamu.vercel.app`
- Cetak dan pajang di pintu masuk acara

---

## 🌐 Deploy

### Backend → Railway

1. Daftar di https://railway.app
2. New Project → Deploy from GitHub
3. Pilih folder `backend`
4. Tambahkan semua variabel dari `.env` di tab Variables
5. Copy URL Railway untuk langkah berikutnya

### Frontend → Vercel

1. Daftar di https://vercel.com
2. New Project → Import dari GitHub
3. Set Root Directory ke `frontend`
4. Tambahkan environment variable:
   - `NEXT_PUBLIC_API_URL` = URL Railway kamu
5. Deploy!

---

## 🔐 Dashboard Admin

Akses di: `https://nama-app.vercel.app/admin`

Password default: `alfiufi2025` (ubah di `.env` backend)

Fitur:
- Total foto masuk
- Total tamu yang scan QR
- Log upload terbaru
- Grid foto dari Google Drive

---

## 📋 Alur Penggunaan

1. QR dipajang di pintu masuk → tamu scan
2. Browser tamu terbuka → halaman sambutan
3. Tap "Mulai Foto" → kamera aktif
4. Tamu foto (dapat 5x)
5. Setelah foto → preview → tap "Kirim Foto"
6. Foto langsung masuk Google Drive mempelai
7. Token habis → halaman terima kasih

---

## ⚠️ Catatan Penting

- Token disimpan di browser (localStorage) — kalau browser dibersihkan, bisa scan ulang
- Foto masuk real-time ke Drive, tidak perlu internet stabil untuk mempelai
- Dashboard auto-refresh tiap 30 detik
