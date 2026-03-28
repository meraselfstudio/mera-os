# 6. SECURITY, RBAC & API - MÉRA OS

## 6.1 Role-Based Access Control (RBAC) & PIN System
Tidak ada sistem *login* dengan email/password yang lambat untuk kru. Menggunakan sistem Visual/PIN:
- **Owner/Admin (Level 1):** Menggunakan PIN rahasia (`1609`). Memiliki akses penuh ke Dashboard Finance, Laba Kotor, dan pengaturan *Tiered Pricing*.
- **Kasir / Crew (Level 2):** Akses masuk menggunakan ketukan (klik profil) tanpa PIN untuk mempercepat operasional. HANYA bisa mengakses modul POS, Absensi, dan Monitor Jadwal. Tidak bisa melihat total omset bulanan studio.
- **Pelanggan (Level 3 - Tablet):** Hanya memiliki antarmuka khusus (`os.meraselfstudio.com/select`) yang terkunci pada timer 5 menit. Butuh PIN (`8080`) dari kru untuk keluar dari layar tersebut (Kiosk Mode).

## 6.2 Supabase Real-time Subscriptions (The Magic)
Agar Kolom 1 (Lobby) bergerak tanpa perlu *refresh* (F5):
- Web menghubungkan *WebSocket* ke tabel `registrations`.
- Ketika Pelanggan menekan "Submit" dari HP mereka, `INSERT` *event* terdeteksi.
- React merender kartu nama baru di Kolom 1 dalam waktu kurang dari 500ms.

## 6.3 Perlindungan API & Edge Functions
- **Auto-Expire Trigger:** Menjalankan `purge_expired_slots()` secara periodik (30 menit untuk OTS, 6 jam untuk Online) untuk membuang antrean yang tidak valid.
- **Row Level Security (RLS):** Kru hanya bisa melihat riwayat gajinya sendiri di modul absensi. Data gaji Umar tidak bisa dilihat oleh Satria.