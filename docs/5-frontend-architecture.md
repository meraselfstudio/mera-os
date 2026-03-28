# 5. FRONTEND ARCHITECTURE & UI/UX - MÉRA OS

## 5.1 Tech Stack & State Management
- **Core:** React 18.3+ & Vite 5.x.
- **Styling:** Tailwind CSS (Utility-first, optimal untuk Apple UI style).
- **State Management (Kritis):** Menggunakan `React Context API` yang dikombinasikan dengan `localStorage`.
  - `BookingContext`: Menangani *real-time fetch* untuk Kolom 1 (Lobby).
  - `TransactionContext`: Menyimpan status keranjang belanja, kalkulasi *Tiered Pricing*, dan menahan data pelanggan yang sedang berada di Kolom 2 atau 3.

## 5.2 Filosofi Desain (Apple Human Interface)
- **Warna Latar:** Off-white (`#F5F5F7`) untuk mengurangi kelelahan mata kru.
- **Kartu/Elemen:** Putih solid (`#FFFFFF`) dengan *shadow* yang sangat halus (mirip antarmuka macOS 26).
- **Tipografi:** San Francisco (SF Pro) / Inter. Hierarki font harus jelas (Besar untuk Total Harga, Sedang untuk Nama, Kecil untuk Jam).
- **Interaksi:** Menerapkan sistem *Drag and Drop* (opsional, atau tombol panah "Proses") untuk memindahkan tiket antar 3 Kolom POS.

## 5.3 Spesifikasi 3-Kolom POS (Layar iMac 27-inci)
- **KOLOM 1 (LOBBY - Realtime):**
  - Lebar: 30% dari layar.
  - Perilaku: *Auto-refresh* via Supabase WebSockets. Muncul lencana (badge) warna berdasarkan tiket (Kuning/Oranye).
- **KOLOM 2 (IN-STUDIO):**
  - Lebar: 35% dari layar.
  - Komponen Utama: Menampilkan "SESSION ID" dalam ukuran raksasa dengan tombol *Copy to Clipboard*. Timer 5 menit (untuk fase seleksi tablet) diaktifkan dari sini.
- **KOLOM 3 (CASHIER & UPSELL):**
  - Lebar: 35% dari layar.
  - Perilaku: Menampilkan *Stepper* (+/-) untuk produk *Add Print* (ID 9). Kalkulator *Tiered Pricing* berjalan otomatis di kolom ini. Tombol "Kirim via IG" untuk otomatisasi *copy-paste* ke DM.