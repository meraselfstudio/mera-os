# CLAUDE.md — Monorepo Méra OS

Ini adalah referensi utama pengembangan AI untuk proyek ini.
Baca dokumen ini secara penuh di awal setiap sesi sebelum mengubah kode apa pun.

---

## 1. Gambaran Proyek & Konteks Bisnis

**Méra SelfStudio** adalah self-photo studio di Mojokerto, Indonesia. Pelanggan memesan sesi, datang ke studio, memotret diri mereka sendiri, dan menerima file digital yang telah diedit melalui Instagram DM.

Monorepo ini (`mera-os`) adalah sistem operasi v2 yang menggerakkan tiga antarmuka:
- **Customer Portal (Portal Pelanggan)** — website publik untuk pemesanan dan photobooth online gratis
- **POS Dashboard** — alat internal staf untuk manajemen pemesanan, kasir (POS), absensi, penggajian, dan keuangan
- **Kiosk** — tablet photobooth perangkat keras di studio yang terhubung ke Capture Engine lokal di Mac Mini

Domain produksi: `meraselfstudio.com` | Instagram: `@mera.selfstudio`

### Alur Bisnis
1. Pelanggan memesan via portal pelanggan → baris `registrations` ditulis ke Supabase
2. Staf memverifikasi pemesanan via papan pemesanan POS → mengubah status registrasi
3. Pelanggan tiba → staf membuat baris `transactions`, memproses pembayaran
4. Sesi foto berjalan di Mac Mini (Capture One) dengan file disimpan ke folder yang dinamai sesuai `session_id`
5. Google Drive Desktop Sync mengekspor foto → staf membagikan tautan unduhan via IG DM
6. Kru melakukan clock-in/out via papan absensi POS (dengan verifikasi foto webcam)
7. Pemilik meninjau penggajian via panel keuangan backoffice

---

## 2. Stack Teknologi & Dependensi

### Runtime & Build
| Alat | Versi | Tujuan |
|------|---------|---------|
| pnpm | 9.15.4 | Package manager, orkestrasi workspace |
| Node | ≥ 18 | Persyaratan runtime |
| Turborepo | ^2.3.3 | Pipeline tugas monorepo |
| TypeScript | ^5.7.2 | Strict mode, semua package |

### Aplikasi
| Aplikasi | Framework | Port Default | Deployment |
|-----|-----------|-------------|------------|
| `customer-portal` | Next.js 15 + React 19 | 3000 | Vercel (auto-deploy `main`) |
| `pos-dashboard` | Vite 6 + React 19 | 5173 | Hanya iMac studio lokal |
| `kiosk` | Vite 6 + React 19 | 5174 | Jaringan lokal (Tablet Android) |
| `capture-engine` | Node.js + Express | 3100 | Jaringan lokal (Mac Mini) |

### Pustaka Kunci Per Aplikasi

**customer-portal**
- Next.js App Router (file-based routing)
- `react-qr-code` — pembuatan kode QR (QR check-in di `/admin/qr`)
- `html2canvas` — tidak ada (digunakan di POS untuk struk)
- Tanpa pustaka manajemen state — hanya state lokal React

**pos-dashboard**
- `zustand` 4 — state global (`usePOSStore`)
- `lucide-react` — set ikon
- `html2canvas` — menghasilkan JPEG struk untuk pencetakan
- `date-fns` — aritmetika tanggal
- `react-router-dom` — dependensi yang dideklarasikan (sebagian tidak digunakan; navigasi berbasis view-state)
- `@supabase/supabase-js` v2

**kiosk**
- `zustand` 4 — state global kiosk (`useKioskStore`)
- `qrcode.react` — kode QR untuk pengambilan foto
- Berkomunikasi dengan server backend **Capture Engine lokal** (bukan Supabase) untuk manajemen sesi foto

### Package Bersama
| Package | Isi |
|---------|---------|
| `@mera/supabase` | Singleton client Supabase + SEMUA tipe DB kanonikal + fungsi harga bersama |
| `@mera/ui` | Primitif UI Button, Card, Modal, Badge (diadopsi sebagian) |
| `@mera/config` | Konfigurasi TypeScript (`base.json`, `next.json`, `react.json`) + ESLint (`base.js`) |

### Backend
- **Supabase** (hosted, PostgreSQL 17): database, realtime, storage, RLS, edge functions
- **Supabase Storage buckets**: `attendance-photos` (privat, foto kru), `phonebooth` (publik)
- **Supabase Edge Function**: `calculate-payroll` (Deno runtime, service_role key, mengabaikan RLS)
- **Google Apps Script**: menerima unggahan strip photobooth dari proxy `POST /api/upload-strip`
- **Google Drive Desktop Sync**: berjalan di Mac Mini, menyinkronkan ekspor Capture One ke Google Drive
- **Capture Engine**: server HTTP lokal di `http://192.168.1.100:3100` — backend berbasis Mac Mini untuk kiosk perangkat keras (sesi foto, frame, cetak, render)

---

## 3. Struktur Folder

```
mera-os/
├── apps/
│   ├── capture-engine/             # Backend Node.js — pengontrol photobooth hardware lokal
│   ├── customer-portal/            # Next.js 15 — website publik
│   │   ├── vercel.json             # Konfigurasi deployment Vercel
│   │   └── src/
│   │       ├── app/                # Next.js App Router
│   │       │   ├── page.tsx        # Landing page (/)
│   │       │   ├── booking/page.tsx          # Alur pemesanan multi-langkah (/booking)
│   │       │   ├── photobooth/page.tsx        # Photobooth online gratis (/photobooth)
│   │       │   ├── checkin/page.tsx           # Check-in mandiri pelanggan (/checkin?sid=...)
│   │       │   ├── pricelist/page.tsx         # Daftar harga statis — HARDCODED, tidak dari DB
│   │       │   ├── cara-booking/page.tsx      # Panduan cara memesan (statis)
│   │       │   ├── admin/qr/page.tsx          # Printer kode QR staf (/admin/qr)
│   │       │   └── api/
│   │       │       └── upload-strip/route.ts  # Proxy → Google Apps Script
│   │       ├── components/
│   │       │   ├── LandingPage.tsx            # Beranda (hero, sections, CTA)
│   │       │   ├── BookingFlow.tsx            # State machine pemesanan multi-langkah
│   │       │   ├── PhotoboothPage.tsx         # Photobooth sisi klien (tanpa jaringan)
│   │       │   ├── CheckinPage.tsx            # Formulir check-in mandiri
│   │       │   └── PhotoStrip.tsx             # Renderer/compositor strip photobooth
│   │       └── lib/
│   │           └── sanitize.ts               # KRITIS: sanitizer session_id
│   │
│   ├── pos-dashboard/              # Vite React — alat internal staf
│   │   ├── index.html
│   │   └── src/
│   │       ├── index.css           # Token desain CSS + animasi + utilitas tata letak
│   │       ├── App.tsx             # SEMUA logika routing, gerbang PIN auth, semua view
│   │       └── components/
│   │           └── AttendanceBoard.tsx  # Clock-in/out, foto webcam, unggahan ganda
│   │
│   └── kiosk/                      # Vite React — kiosk photobooth hardware
│       └── src/
│           ├── App.tsx                         # Routing layar, timeout inaktivitas
│           ├── lib/
│           │   └── api.ts                      # Klien API Capture Engine
│           ├── screens/
│           │   ├── IdleScreen.tsx              # Layar attract/idle
│           │   ├── GalleryScreen.tsx           # Penampil galeri foto
│           │   ├── EditorScreen.tsx            # Editor filter/stiker
│           │   ├── PrintScreen.tsx             # Konfirmasi cetak
│           │   └── FrameGalleryScreen.tsx      # ⚠️ SEDANG DIKERJAKAN / KODE MATI — belum terhubung
│           └── store/
│               └── useKioskStore.ts            # State sesi, layar, editor
│
├── packages/
│   ├── supabase/                   # Klien Supabase bersama + tipe DB kanonikal
│   │   └── src/
│   │       ├── client.ts           # Singleton createClient() (berfungsi di Next.js + Vite)
│   │       ├── index.ts            # Ekspor publik
│   │       └── types/
│   │           └── database.types.ts   # SUMBER KEBENARAN untuk SEMUA tipe + logika harga
│   ├── ui/                         # Primitif UI bersama
│   │   └── src/
│   │       └── components/         # Button, Card, Modal, Badge
│   └── config/
│       ├── typescript/             # base.json, next.json, react.json
│       └── eslint/                 # base.js
│
├── supabase/
│   ├── config.toml
│   ├── migrations/                 # 001_initial.sql → 012_*.sql
│   └── functions/
│       └── calculate-payroll/      # Edge function Deno
│           └── index.ts
│
├── docs/                           # Dokumen arsitektur (mulai dengan docs 9–12)
├── scripts/                        # File .mjs pengujian e2e, runner migrasi
├── deploy.sh                       # Deploy dua langkah: POS langsung, portal via isolasi
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

---

## 4. Fitur yang Ada

### Customer Portal (`customer-portal`)
- **Landing page** (`/`) — hero, tentang, galeri, CTA harga, tautan ke pemesanan (termasuk perbaikan peta)
- **Booking flow** (`/booking`) — wizard multi-langkah: pemilihan ruangan → paket → pax → addon (dengan harga kuantitas) → tanggal/waktu (dengan pemblokiran slot per studio dan studio bersama) → kirim. Menulis ke `registrations`. Mendukung ONLINE_QRIS dan ONLINE_KEEPSLOT (penahanan 6 jam). Mengambil data produk langsung dari Supabase. Opsi OTS (On The Spot) dihapus.
- **Booking ticket** — halaman/tampilan tiket khusus yang baru
- **Reschedule modal** — ditambahkan untuk memungkinkan pelanggan/staf menjadwalkan ulang pemesanan
- **Free photobooth** (`/photobooth`) — 100% sisi klien, tidak ada unggahan selama sesi; kamera browser → strip dikomposisikan pada kanvas → unduhan lokal. Unggahan Google Apps Script bersifat opsional (opt-in) pasca-sesi.
- **Self check-in** (`/checkin?sid=...`) — pelanggan memindai QR di studio; mengatur `checked_in_at` pada registrasi mereka (perbaikan tabrakan session_id)
- **Price list** (`/pricelist`) — Halaman **STATIS, HARDCODED**; TIDAK disinkronkan dengan tabel `products`. Divergensi yang diketahui.
- **Panduan cara memesan** (`/cara-booking`) — halaman informasi statis
- **Printer kode QR** (`/admin/qr`) — utilitas untuk staf mencetak QR check-in mandiri yang mengarah ke `meraselfstudio.com/checkin`
- **Proxy unggahan strip** (`/api/upload-strip`) — proxy untuk permintaan POST strip photobooth ke Google Apps Script

### POS Dashboard (`pos-dashboard`)
Semua fitur berada di `App.tsx` atau sub-komponen. Navigasi adalah peralihan state view-key. **Sekarang menggunakan UI Mobile-First.**

- **Otentikasi PIN** — PIN Pemilik: `1609`, PIN Admin: `pin_hash` per-kru. Hanya sisi klien; tidak ada Auth Supabase.
- **Booking Management Board** (`/booking-management`) — langganan Supabase Realtime langsung pada `registrations`. Menampilkan status PENDING/VERIFIED/PROCESSED/COMPLETED/EXPIRED. Menangani pemeriksaan kedaluwarsa KEEPSLOT secara otomatis saat dimuat.
- **POS / Payment Modal** — mengambil `products` terbaru dari Supabase → membangun item baris menggunakan fungsi bersama `calcBookingLineItems()` → menerima CASH/TRANSFER/QRIS/ONLINE_QRIS → menulis ke `transactions`. Mendukung diskon dengan field alasan (reason) yang diwajibkan.
- **Pembuatan Struk** — `html2canvas` merender struk sebagai JPEG untuk pencetakan/dibagikan via WhatsApp.
- **Attendance Board** — clock-in/out kru dengan tangkapan foto webcam. Unggahan ganda: Supabase Storage (bucket `attendance-photos`) + Google Drive via endpoint proxy `/api/upload` (endpoint ini mungkin hilang/direncanakan — lihat Known Gotchas). Tarif shift hardcoded (lihat Aturan 11). Target bonus hardcoded.
- **Finance / Backoffice** — membaca transaksi PAID, menampilkan omzet. Membaca absensi untuk tinjauan penggajian. Pencatatan pengeluaran.
- **Payroll** — memanggil Supabase Edge Function `calculate-payroll`. Penggajian INTERN mengabaikan semua penalti/bonus.
- **Tampilan TV** (`/tv`) — layar tampilan pasif (pemesanan atau konten promosi)
- **Tampilan Kiosk** (`/kiosk`) — manajemen kiosk tersemat atau peluncur deep-link

### Kiosk (`kiosk`)
Aplikasi tablet perangkat keras di studio. Berkomunikasi dengan server lokal **Capture Engine** di Mac Mini pada `http://192.168.1.100:3100`. **Memiliki alur sesi kiosk yang lengkap.**

- **Layar idle** — attract loop, memulai sesi saat disentuh
- **Layar galeri** — menampilkan foto dari sesi saat ini (diambil dari Capture Engine)
- **Layar editor** — menerapkan filter/stiker pada strip foto yang dipilih
- **Layar cetak** — mengonfirmasi dan memicu pekerjaan cetak melalui Capture Engine
- **`FrameGalleryScreen.tsx`** — ⚠️ **TIDAK LENGKAP / TIDAK TERHUBUNG** — menggunakan data frame buatan (dummy), penataan gaya berbasis className (tidak konsisten dengan aplikasi lainnya), `useState(null)` tidak diketik (untyped). Tidak direferensikan dalam routing `App.tsx`. Mungkin ditinggalkan atau tertunda.

### Package Bersama: `@mera/supabase`
- Singleton klien Supabase
- Semua definisi tipe DB kanonikal
- `hitungHargaBertingkat(product, jumlahOrang)` — kalkulator harga bertingkat
- `calcBookingLineItems(products, addons)` — **fungsi harga bersama kanonikal** yang digunakan OLEH BookingFlow (customer portal) DAN modal pembayaran POS. Sumber kebenaran tunggal untuk rincian item baris.
- Antarmuka `BookingAddons`, `BookingLineItem`

---

## 5. Skema Database

Semua tipe TypeScript berada di `packages/supabase/src/types/database.types.ts`.

### `crew`
| Kolom | Tipe | Catatan |
|--------|------|-------|
| id | UUID PK | |
| nama | string | |
| role | `'Admin' \| 'Crew' \| 'Intern'` | |
| status_gaji | `'PRO' \| 'INTERN'` | Mengontrol logika penalti/bonus penggajian |
| pin_hash | string \| null | SHA-256 dari 4-digit PIN |
| is_active | boolean | |
| created_at | timestamp | |

### `attendance`
| Kolom | Tipe | Catatan |
|--------|------|-------|
| id | UUID PK | |
| crew_id | UUID FK → crew | |
| clock_in | timestamp | Terkunci saat clock-in |
| clock_out | timestamp \| null | |
| shift_type | string | `'Weekday Full Time' \| 'Weekend Shift 1' \| 'Weekend Shift 2' \| 'Weekend Full Time'` |
| base_rate | number | **Terkunci saat clock-in** — tidak pernah diperbarui secara retroaktif |
| late_minutes | number | Dihitung otomatis dibandingkan awal shift yang dijadwalkan |
| penalty_amount | number | `late_minutes / 10 * 5000 IDR` — selalu 0 untuk INTERN |
| bonus_amount | number | Dihitung saat clock-out — selalu 0 untuk INTERN |
| photo_in_url | string \| null | URL Supabase Storage |
| photo_out_url | string \| null | URL Supabase Storage |
| status | `'ACTIVE' \| 'COMPLETED'` | |
| created_at | timestamp | |

**KRITIS: JANGAN LAKUKAN JOIN tabel attendance dengan registrations atau transactions. Ini adalah tabel khusus HR.**

### `products`
| Kolom | Tipe | Catatan |
|--------|------|-------|
| id | integer PK (SERIAL) | **BUKAN UUID** |
| nama | string | |
| kategori | string | |
| tipe_harga | `'normal' \| 'bertingkat'` | |
| harga_dasar | number | Digunakan saat `tipe_harga = 'normal'`; juga merupakan harga add-on |
| tier_1 | number \| null | Harga untuk orang pertama |
| tier_2 | number \| null | Harga untuk orang ke-2 |
| tier_3 | number \| null | Harga untuk orang ke-3 |
| tier_lebih | number \| null | Harga per orang melebihi semua tier |
| is_active | boolean | |
| max_orang | number | Peserta maksimal per sesi |
| default_bw | boolean | TRUE = B&W secara default |
| is_addon | boolean | TRUE = add-on yang dapat dipilih, bukan paket utama |
| metadata | JSONB | Digunakan oleh overlay frame kiosk (frame_url, thumbnail_url, type, slots) |

### `registrations`
| Kolom | Tipe | Catatan |
|--------|------|-------|
| id | UUID PK | |
| customer_name | string | |
| instagram_handle | string | Format `@username` — digunakan untuk pengiriman file via IG DM |
| booking_type | `'ONLINE_QRIS' \| 'ONLINE_KEEPSLOT'` | |
| status | `'PENDING' \| 'VERIFIED' \| 'PROCESSED' \| 'EXPIRED'` | |
| session_id | string \| null | **DD-SANITIZEDNAME-CODE**, aman untuk folder macOS |
| preferred_date | string \| null | YYYY-MM-DD |
| preferred_time | string \| null | HH:MM |
| addons | JSON \| null | Lihat antarmuka `BookingAddons` di bawah |
| expires_at | string \| null | Hanya KEEPSLOT: `created_at + 6h` |
| checked_in_at | string \| null | Diatur via scan QR check-in mandiri di studio |
| created_at | timestamp | |

**Bentuk JSON `addons` (Antarmuka `BookingAddons`):**
```typescript
{
  room?: string | null           // contoh 'Basic Studio', 'Elevator Studio'
  variant?: string | null        // tidak digunakan/untuk masa depan
  selected_addons?: string[]     // contoh ['EDITED_COLORED']
  pax?: number                   // jumlah orang
  product_id?: number | null     // id produk utama — disimpan sejak v2.1; tidak ada di pemesanan lama
  computed_price?: number        // snapshot harga saat pemesanan (fallback untuk data lama)
}
```

### `transactions`
| Kolom | Tipe | Catatan |
|--------|------|-------|
| id | UUID PK | |
| session_id | string | Format DD-NAME-CODE — sama dengan folder Capture One macOS |
| registration_id | UUID FK \| null | Menautkan ke registrations |
| processed_by | UUID \| null | crew.id (jejak audit kasir) |
| selection_start_time | string \| null | Waktu mulai timer 5 menit pemilihan foto |
| total_amount | number | |
| discount_amount | number | Default 0 |
| discount_reason | string \| null | **DIBUTUHKAN jika discount_amount > 0** |
| payment_method | `'CASH' \| 'TRANSFER' \| 'QRIS' \| 'ONLINE_QRIS'` \| null | |
| status | `'ACTIVE' \| 'PAID' \| 'REFUNDED' \| 'VOID'` | |
| created_at | timestamp | |

### `expenses`
| Kolom | Tipe |
|--------|------|
| id | UUID PK |
| tanggal | string (YYYY-MM-DD) |
| keterangan | string |
| kategori | string |
| jumlah | number (IDR) |
| metode_bayar | string | `'CASH' \| 'QRIS'` (Ditambahkan via migrasi 011) |
| created_at | timestamp |

### `phonebooth_photos`
| Kolom | Tipe |
|--------|------|
| id | UUID PK |
| strip_url | string |
| filter | string |
| photo_count | number |
| promo_consent | boolean |
| created_at | timestamp |

### Postur RLS (Row Level Security)
- **Klien Anon** (tanpa Supabase Auth): SELECT + INSERT secara luas di sebagian besar tabel; UPDATE pada `registrations`, `transactions`, `attendance`
- **Penulisan `crew`**: hanya kunci `service_role` — tidak pernah dapat ditulis oleh klien anon
- Dashboard POS berjalan sebagai **anon**. Autentikasi PIN hanya di sisi klien. Auth Supabase TIDAK digunakan.

---

## 6. Integrasi API

### Supabase (Backend Utama)
- Semua baca/tulis DB melalui singleton `@mera/supabase/client`
- **Realtime**: tabel `registrations` (pembaruan langsung papan pemesanan POS)
- **Storage buckets**:
  - `attendance-photos` — tangkapan webcam clock-in/out kru (privat)
  - `phonebooth` — strip photobooth pelanggan (publik, tidak memerlukan auth)
- **Edge function**: `calculate-payroll` — Deno, menggunakan `SUPABASE_SERVICE_ROLE_KEY`

### Capture Engine (Backend perangkat keras Kiosk)
- Base URL: env var `VITE_API_BASE`, defaultnya `http://192.168.1.100:3100`
- Berjalan di Mac Mini di studio (hanya jaringan lokal)
- Endpoints (dari `apps/kiosk/src/lib/api.ts`):
  - `POST /api/sessions` — memulai sesi foto baru
  - `GET /api/sessions/:id/photos` — mengambil foto yang diambil
  - `GET /api/frames` — membuat daftar overlay frame yang tersedia
  - `POST /api/print` — memicu pekerjaan cetak
  - `POST /api/render` — memicu pekerjaan render (komposisi strip)

### Google Apps Script
- Menerima unggahan gambar strip photobooth dari portal pelanggan
- Dipanggil via proxy `POST /api/upload-strip` di customer-portal (menghindari CORS)
- URL dikonfigurasi melalui `NEXT_PUBLIC_APPS_SCRIPT_URL`
- Body POST: `multipart/form-data` dengan gambar + metadata

### Google Drive
- Mac Mini menjalankan Google Drive Desktop Sync di latar belakang
- Ekspor Capture One masuk ke folder macOS yang dinamai berdasarkan `session_id` → disinkronkan otomatis ke Google Drive
- Tautan unduhan dibagikan ke pelanggan melalui Instagram DM
- Foto absensi kru juga disimpan melalui Google Drive (direferensikan dalam unggahan ganda AttendanceBoard)

### Proxy `/api/upload` (Unggahan Ganda Foto Absensi)
- Direferensikan di `AttendanceBoard.tsx` untuk unggahan foto kru ke Google Drive
- **Status: mungkin hilang/direncanakan** — tidak ditemukan sebagai file route Next.js di repositori
- Mungkin dilayani oleh server Node lokal terpisah atau merupakan fitur yang direncanakan
- Tanpa endpoint ini, hanya jalur unggahan Supabase Storage yang berfungsi

### Instagram (Operasional, bukan teknis)
- Tidak ada integrasi API — IG DM adalah bagian dari alur kerja operasional manual
- Konfirmasi pemesanan, struk pembayaran, dan pengiriman file dilakukan melalui IG DM

---

## 7. Konvensi Kode & Pola (Patterns)

### Penataan Gaya (Styling)
- **Objek gaya inline (inline style) adalah pola dominan** — Tailwind TIDAK digunakan
- Perubahan visual hidup langsung di dalam file komponen, bukan dalam file CSS/class terpisah
- `apps/pos-dashboard/src/index.css` mendefinisikan sistem token desain CSS yang komprehensif:
  - Properti kustom CSS: `--color-bg-primary`, `--color-accent`, `--color-text-primary`, dll.
  - System font stack: `-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', sans-serif`
  - Bahasa desain terinspirasi Apple HIG: off-white `#F5F5F7`, teks gelap, krom minimal
  - Animasi: `realtime-pulse` (titik pembaruan langsung pemesanan), `slide-in-left`, `pin-shake`, `pin-dot-pop`
  - Utilitas tata letak: `.app-container`, `.main-content`, `.sidebar`, dll.
- Latar belakang customer portal: `#000000` (hitam) dengan teks putih/terang
- Primitif `@mera/ui` (Button, Card, Modal, Badge) tersedia tetapi adopsinya sebagian

### TypeScript
- `strict: true` di semua package
- `skipLibCheck: true` untuk menghindari masalah dengan Supabase TS
- `// eslint-disable-next-line @typescript-eslint/no-explicit-any` dapat diterima untuk pemanggilan klien Supabase langsung yang memerlukan type casting

### Manajemen State
- **Zustand** di pos-dashboard (`usePOSStore`) dan kiosk (`useKioskStore`)
- **State lokal React** di customer-portal — tanpa Zustand
- POS: sebagian besar state berada di `App.tsx` dengan pemanggilan `useState`; Zustand untuk state lintas-komponen

### Navigasi / Routing
- **customer-portal**: Next.js App Router (file-based routing)
- **pos-dashboard**: Peralihan state view-key di dalam `App.tsx` — `const [view, setView] = useState('booking-management')`. React Router dideklarasikan sebagai dependensi tetapi navigasi berbasis state.
- **kiosk**: Peralihan state screen-key di dalam `App.tsx` — pola yang mirip dengan POS

### Waktu (Waktu Indonesia, WIB UTC+7)
- **SELALU gunakan WIB (UTC+7)** untuk semua logika tanggal/waktu
- Pola: `new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10)` untuk kunci tanggal hari ini
- Waktu mulai shift dihitung sebagai WIB — penalti keterlambatan dihitung terhadap jadwal mulai shift dalam WIB

### Bahasa Indonesia
- Teks UI, beberapa nama variabel, dan semua nama kolom DB mencampur bahasa Indonesia dan Inggris
- Mata uang: IDR, diformat sebagai `Rp ${n.toLocaleString('id-ID')}` atau melalui helper `formatIDR()`

### Harga Bersama (Pola Kritis)
- **Jangan pernah menduplikasi logika harga di dalam kode aplikasi**
- Selalu gunakan `calcBookingLineItems(products, addons)` dari `@mera/supabase`
- Selalu ambil `products` segar dari Supabase sebelum tampilan harga apa pun — jangan pernah gunakan harga hardcoded di POS atau alur pemesanan
- `products.id` adalah integer (SERIAL), bukan UUID

---

## 8. Variabel Lingkungan (Environment Variables)

### `customer-portal` — `apps/customer-portal/.env.local`
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_APPS_SCRIPT_URL=        # URL aplikasi web Google Apps Script untuk unggahan strip
```

### `pos-dashboard` — `apps/pos-dashboard/.env.local`
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_CUSTOMER_PORTAL_URL=           # Origin portal pelanggan (fallback: http://localhost:3000)
VITE_PORTAL_URL=                    # Basis deep-link KioskView (fallback: https://meraselfstudio.com)
```

### `kiosk` — `apps/kiosk/.env.local`
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_BASE=                      # Base URL Capture Engine (default: http://192.168.1.100:3100)
```

### Supabase Edge Functions (diinjeksikan otomatis oleh runtime Supabase)
```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=          # Digunakan oleh calculate-payroll untuk mengabaikan RLS
```

---

## 9. Fitur Dalam Pengembangan atau Direncanakan

Ini adalah fitur yang belum selesai ditemukan melalui inspeksi kode — dikonfirmasi dari status kode, bukan asumsi.

| Fitur | Lokasi | Status | Bukti |
|---------|---------|--------|---------|
| Frame Gallery (Kiosk) | `apps/kiosk/src/screens/FrameGalleryScreen.tsx` | Mati / sedang dikerjakan — tidak terhubung ke router | Data dummy hardcoded, gaya berbasis className (tidak konsisten), `useState(null)` untyped, tidak ada rute di `App.tsx` |
| Proxy `/api/upload` untuk Google Drive | Direferensikan di `AttendanceBoard.tsx` | Hilang atau direncanakan | Tidak ditemukan sebagai API route Next.js; mungkin dilayani di tempat lain |
| Pricelist statis → Berbasis DB | `apps/customer-portal/src/app/pricelist/page.tsx` | Divergensi yang diketahui | Semua harga hardcoded; tidak mengambil dari Supabase |
| `product_id` di addons (v2.1) | `packages/supabase/src/types/database.types.ts` | Dirilis; pemesanan yang lebih lama tidak memiliki field ini | `addons.product_id` ditandai opsional; logika inferensi fallback dalam `calcBookingLineItems` menangani ketiadaannya |

---

## 10. Aturan Kritis — JANGAN Ubah Tanpa Konfirmasi

### Aturan 1: Sanitasi ID Sesi
**File:** `apps/customer-portal/src/lib/sanitize.ts`

ID Sesi adalah **nama folder macOS** yang digunakan di Capture One pada Mac Mini.
Karakter yang tidak didukung akan merusak sistem file atau membuat folder tidak cocok.
**Selalu** panggil `sanitizeSessionId()` sebelum menulis `session_id` ke Supabase.

Format: `DD-SANITIZEDNAME-CODE` (mis. `27-AYU-MR`). Hanya karakter `[a-zA-Z0-9-]`.

### Aturan 2: Harga Bersama — Jangan Pernah Berubah
**File:** `packages/supabase/src/types/database.types.ts`

`calcBookingLineItems(products, addons)` adalah sumber kebenaran tunggal untuk perhitungan harga.
Ini harus digunakan di KEDUA sisi: `BookingFlow.tsx` (customer-portal) DAN pemrosesan pembayaran POS (pos-dashboard).
`hitungHargaBertingkat(product, pax)` adalah kalkulator harga bertingkat — juga berada di sini.

**Jangan pernah melakukan hardcode harga atau menduplikasi perhitungan matematika harga dalam file komponen.**

### Aturan 3: Keuangan Hanya Menghitung Transaksi PAID
Omzet/pendapatan hanya menghitung `transactions.status === 'PAID'`.
Jangan mengubah state machine transaksi tanpa meninjau agregasi keuangan.

### Aturan 4: Bypass Penggajian INTERN
Di `supabase/functions/calculate-payroll/index.ts`:
Saat `status_gaji === 'INTERN'`: `penalty_amount = 0`, `bonus_amount = 0`, `net_pay = 0`.
Ini disengaja — status INTERN hanya untuk pencatatan operasional, bukan pemrosesan gaji.

### Aturan 5: Isolasi Absensi
**Jangan pernah melakukan JOIN `attendance` dengan `registrations` atau `transactions`.**
Absensi adalah data khusus HR. `base_rate` pada catatan absensi dikunci saat clock-in dan tidak boleh diperbarui secara retroaktif, bahkan jika data gaji kru berubah.

### Aturan 6: Photobooth 100% Sisi Klien
**File:** `apps/customer-portal/src/components/PhotoboothPage.tsx`

Selama pengambilan gambar: **nol pemanggilan jaringan** — tidak ada Supabase, tidak ada unggahan, tidak ada API eksternal.
Output hanya berupa unduhan lokal browser. Unggahan Google Apps Script adalah tindakan opt-in (pilihan) pasca-sesi.
Jangan tambahkan panggilan jaringan ke `PhotoboothPage.tsx` tanpa keputusan produk yang eksplisit.

### Aturan 7: Array Slot Waktu Harus Tetap Sinkron
Array slot waktu pemesanan ada di KEDUA file:
- `apps/customer-portal/src/components/BookingFlow.tsx`
- `apps/pos-dashboard/src/App.tsx`

Jika Anda menambah, menghapus, atau mengubah slot waktu: **perbarui kedua file tersebut.**

### Aturan 8: Alasan Diskon Diperlukan
`discount_reason` harus non-null ketika `discount_amount > 0` pada suatu transaksi.
Ini adalah persyaratan audit pemilik yang keras (mutlak).

### Aturan 9: Kedaluwarsa KEEPSLOT adalah 6 Jam
Registrasi `ONLINE_KEEPSLOT` kedaluwarsa tepat 6 jam setelah `created_at`.
Papan POS otomatis menetapkan kedaluwarsa saat dimuat. Alur pemesanan mengatur `expires_at = now + 6h`.
Jangan ubah ini tanpa keputusan produk/bisnis.

### Aturan 10: PIN Pemilik di-Hardcode
`OWNER_PIN = '1609'` di-hardcode dalam `apps/pos-dashboard/src/App.tsx`.
Dapat diterima untuk penggunaan internal saat ini. Jangan pindahkan ke `.env` tanpa menambahkan manajemen rahasia yang tepat.
Jangan me-log atau mengeksposnya dalam error atau output konsol.

### Aturan 11: Tarif Shift dan Target Bonus Hardcoded (Konstanta yang Diketahui)
Di `apps/pos-dashboard/src/components/AttendanceBoard.tsx`:
- Tarif Weekday Full Time: **75.000 IDR**
- Tarif Weekend Shift 1 / Shift 2: **35.000 IDR**
- Tarif Weekend Full Time: **100.000 IDR**
- Target bonus weekday: omzet **1.000.000 IDR**
- Target bonus weekend: omzet **1.500.000 IDR**

Ini adalah konstanta bisnis. Jangan ubah tanpa instruksi pemilik yang eksplisit.

### Aturan 12: `products.id` adalah Integer, Bukan UUID
Tabel `products` menggunakan primary key integer SERIAL. Jangan pernah memperlakukan `Product.id` sebagai UUID.
Saat menyimpan `product_id` di dalam JSON `addons`, nilainya adalah `number`.

### Aturan 13: RLS Terbuka Lebar untuk Anon — Tidak Ada Data Rahasia di Tabel yang Dapat Diakses Anon
Klien Supabase anon dapat melakukan SELECT ke semua tabel publik. Jangan simpan data sensitif (PIN, info kontak pribadi, kredensial pembayaran) di tabel yang dapat dibaca oleh anon.
Hash PIN Kru disimpan — pastikan mereka tetap ter-hash (tidak pernah berupa plaintext).

---

## 11. Perintah Kunci

```bash
# Install
pnpm install

# Dev (semua aplikasi)
pnpm dev

# Per-app dev
pnpm --filter customer-portal dev      # localhost:3000
pnpm --filter pos-dashboard dev        # localhost:5173
pnpm --filter kiosk dev               # localhost:5174

# Build
pnpm build
pnpm --filter customer-portal build

# Pengecekan tipe (Type check) — SELALU jalankan setelah menyentuh tipe bersama di @mera/supabase
pnpm --filter customer-portal type-check
pnpm --filter pos-dashboard type-check
pnpm --filter kiosk type-check

# Lint
pnpm lint

# Clean
pnpm clean
```

---

## 12. Deployment

### Customer Portal → Vercel
- Auto-deploys dari branch `main`
- Konfigurasi: `apps/customer-portal/vercel.json`
- **Deploy dua langkah via `deploy.sh`**: customer portal menggunakan `pnpm deploy --filter customer-portal` ke direktori sementara `.deploy-portal/` untuk menghindari masalah symlink monorepo dengan Vercel
- Konfigurasi Next.js (`next.config.ts`) men-transpile package workspace `@mera/ui` dan `@mera/supabase`

### POS Dashboard — Hanya Lokal
- Berjalan secara lokal di iMac studio (27-inci)
- `pnpm --filter pos-dashboard build` → menyajikan output statis `dist/` melalui server lokal mana pun
- `deploy.sh` menangani deployment dashboard POS secara terpisah (direct build)

### Kiosk — Jaringan Lokal
- Berjalan pada tablet Android di studio di WiFi lokal
- `pnpm --filter kiosk build` → menyajikan `dist/` di jaringan lokal

### Supabase
- Edge functions: `supabase functions deploy calculate-payroll`
- Migrasi: `supabase db push` atau melalui `scripts/run-migrations.mjs`

---

## 13. Peta File — Referensi Cepat

| Apa | Di Mana |
|------|-------|
| Semua tipe DB + harga bersama | `packages/supabase/src/types/database.types.ts` |
| Singleton klien Supabase | `packages/supabase/src/client.ts` |
| Ekspor publik package | `packages/supabase/src/index.ts` |
| Sanitizer ID Sesi | `apps/customer-portal/src/lib/sanitize.ts` |
| Alur pemesanan (pelanggan) | `apps/customer-portal/src/components/BookingFlow.tsx` |
| Landing page | `apps/customer-portal/src/components/LandingPage.tsx` |
| Photobooth gratis | `apps/customer-portal/src/components/PhotoboothPage.tsx` |
| Check-in mandiri | `apps/customer-portal/src/components/CheckinPage.tsx` |
| Proxy unggahan strip | `apps/customer-portal/src/app/api/upload-strip/route.ts` |
| Printer QR admin | `apps/customer-portal/src/app/admin/qr/page.tsx` |
| POS dashboard (semua logika) | `apps/pos-dashboard/src/App.tsx` |
| Papan absensi | `apps/pos-dashboard/src/components/AttendanceBoard.tsx` |
| Token desain CSS POS | `apps/pos-dashboard/src/index.css` |
| Entri aplikasi Kiosk | `apps/kiosk/src/App.tsx` |
| Klien Kiosk Capture Engine | `apps/kiosk/src/lib/api.ts` |
| Store state Kiosk | `apps/kiosk/src/store/useKioskStore.ts` |
| Edge function penggajian | `supabase/functions/calculate-payroll/index.ts` |
| Migrasi DB | `supabase/migrations/` (001 → 010) |
| Skrip deployment | `deploy.sh` |
| Dokumen arsitektur (mulai dari sini) | `docs/9-current-project-context.md` |

---

## 14. Gotchas yang Diketahui (Masalah yang Sering Terjadi)

1. **Inline styles di mana-mana** — perubahan visual mengharuskan pengeditan file komponen secara langsung; tidak ada Tailwind atau sistem class CSS global.

2. **`App.tsx` di POS bersifat monolitik** — sebagian besar logika POS berada dalam satu file besar. Navigasi adalah peralihan state `view` (`useState('booking-management')`), bukan React Router, terlepas dari adanya dependensi router.

3. **RLS terbuka lebar untuk anon** — registrations, transactions, dan attendance semuanya dapat ditulis oleh klien anonim (anonymous). Keamanan ditegakkan oleh gerbang PIN sisi klien dan penulisan hanya `service_role` ke tabel `crew`.

4. **`products.id` adalah integer SERIAL** — bukan UUID. Jangan perlakukan sebagai UUID.

5. **Halaman pricelist statis** — `apps/customer-portal/src/app/pricelist/page.tsx` memiliki harga hardcoded yang TIDAK bersumber dari Supabase. Jika harga produk berubah dalam DB, halaman daftar harga harus diperbarui secara manual.

6. **Pemesanan lama tidak memiliki `product_id`** — `addons.product_id` ditambahkan pada v2.1. `calcBookingLineItems()` menggunakan fallback inferensi label kamar → kategori untuk data lama.

7. **Slot waktu diduplikasi** — array slot waktu weekday/weekend ada di kedua `BookingFlow.tsx` dan `App.tsx`. Ubah satu → ubah keduanya.

8. **`/api/upload` mungkin hilang** — `AttendanceBoard.tsx` mereferensikan `/api/upload` untuk mengunggah foto clock-in kru ke Google Drive. Endpoint ini tidak ditemukan sebagai file route Next.js. Hanya jalur unggahan Supabase Storage yang dikonfirmasi bekerja.

9. **`FrameGalleryScreen.tsx` adalah kode mati** — layar kiosk ini tidak terhubung ke rute mana pun di `App.tsx`. Menggunakan gaya tidak konsisten dan data dummy. Jangan bergantung padanya atau mengembangkannya tanpa mengaudit state-nya terlebih dahulu.

10. **Penyimpangan (drift) dokumen lama** — file `docs/` 1–8 mereferensikan keputusan teknologi dan penamaan yang lebih lama. Percayai `docs/9-12` dan kodenya. Saat dokumen dan kode tidak setuju, kodenya yang benar.

11. **Harga di-snapshot saat pemesanan** — `registration.addons.computed_price` menangkap harga saat pengiriman. Mengubah harga produk dalam DB tidak secara retroaktif memperbarui harga perhitungan pada pemesanan lama.

12. **Kiosk adalah sistem perangkat keras** — aplikasi `kiosk` tidak menulis pemesanan atau berbicara dengan portal pelanggan secara langsung. Ini berkomunikasi dengan server Capture Engine lokal di Mac Mini (`http://192.168.1.100:3100`). Tanpa server tersebut berjalan, aplikasi kiosk tidak memiliki backend.
