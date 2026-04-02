# 3. DATA FLOW & CUSTOMER JOURNEY - MÉRA OS

## 3.1 The 5-Phase Strict Pipeline
Alur operasional mutlak. Pelanggan dilarang dilayani jika tidak melalui Fase 1 secara mandiri.

### FASE 1: DATA INPUT (Self-Service via meraselfstudio.com)
- **Aktor:** Pelanggan.
- **Tindakan:** Pelanggan mengisi formulir mandiri via booking web.
- **Hasil:** Data masuk ke tabel `registrations`. Pelanggan mendapat tiket warna (Oranye: KeepSlot, Kuning: Lunas QRIS).

### FASE 2: VERIFIKASI (POS Kolom 1: Lobby)
- **Aktor:** Kru (Satria/Feby).
- **Tindakan:** Kru mencocokkan tiket pelanggan dengan daftar di Kolom 1 POS (diurutkan berdasarkan `created_at`). 
- **Validasi:** Cek mutasi Livin' Mandiri untuk tiket Kuning.
- **Eksekusi:** Klik "Proses", nama berpindah ke Kolom 2.

### FASE 3: PHOTO SESSION (POS Kolom 2: In-Studio)
- **Aktor:** Kru & Pelanggan.
- **Tindakan:** 1. Kru menekan tombol raksasa **"COPY SESSION ID"** di POS.
  2. Paste ke Capture One di Mac Mini (`[Tanggal]-[Nama]-[Kode]`).
  3. Sesi foto berjalan. 
  4. Pelanggan pindah ke Tablet Android (Waktu seleksi ketat: **5 Menit**, layar otomatis terkunci di 00:00).

### FASE 4: THE GOLDEN UPSELL (POS Kolom 3: Cashier)
- **Aktor:** Kru.
- **Tindakan:** 1. Drag & drop nama pelanggan dari Kolom 2 ke Kolom 3.
  2. Tawarkan Add Print (ID 9) atau Special Frame (ID 10) saat pelanggan sedang antusias.
  3. POS menghitung *Tiered Pricing* otomatis.
  4. Selesaikan pembayaran.

### FASE 5: DISTRIBUSI (Zero WhatsApp Policy)
- **Aktor:** Kru.
- **Tindakan:** 1. Klik "Kirim via IG" di POS. Link Drive dan pesan template otomatis di-copy ke clipboard.
  2. Buka Instagram Web di iMac, paste pesan, kirim.
  3. Folder Drive tersetting otomatis hapus dalam 5 hari.