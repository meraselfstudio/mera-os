# 1. ARSITEKTUR SISTEM MÉRA OS (REVISED 2026)

## 1.1 Overview Arsitektur
Sistem hibrida yang memisahkan beban kerja lokal (RAW Processing) dengan beban kerja awan (POS & Data Management), diikat oleh jaringan Wi-Fi berkecepatan tinggi.

## 1.2 Infrastruktur Jaringan (Kritis)
- **Primary Backbone:** Jaringan LAN/Wi-Fi berkecepatan tinggi (Router Dedicated).
- **Failover:** Hotspot seluler kru (HANYA digunakan saat internet utama mati).
- **Local Bridge:** Komunikasi antara Mac Mini (Capture One) dan Tablet Android (Select App) harus berada dalam satu subnet IP Lokal untuk kecepatan transfer gambar tanpa latensi.

## 1.3 Strategi Penyimpanan (The Storage Divide)
Sistem MERA OS tidak mencampuradukkan beban penyimpanan.
1. **Supabase Storage:** Khusus untuk komputasi awan, data booking, data POS, data crew data gaji data finance
2. **Local Hard Drive (Hardisk Dock 2TB Powered):** Menyimpan seluruh aset RAW (Sony A7II/A6000) dan dieksekusi oleh Mac Mini M1.
3. **Google Drive Desktop Sync:** Berjalan di latar belakang Mac Mini murni untuk sinkronisasi folder ekspor akhir (2MB JPEG) yang tautannya akan dikirim via Instagram DM pelanggan. Menyimpan foto absensi kru (webcam) dan hasil foto dari fitur photobooth gratis 

## 1.4 UI/UX Philosophy & Layout
- **Design Language:** Apple Human Interface Guidelines.
- **Color Palette:** Off-white (#F5F5F7), tipografi high-contrast (San Francisco).
- **POS Core Interface:** Layout 3-Kolom di layar iMac 27-inci (Zero Page Reload):
  - Kolom 1: LOBBY (Antrean masuk & Verifikasi QRIS).
  - Kolom 2: IN-STUDIO (Sesi aktif & Generator Nomenklatur).
  - Kolom 3: CASHIER (Penyelesaian tagihan & Upselling cetak).