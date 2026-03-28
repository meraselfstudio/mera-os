```markdown
# 8. DEPLOYMENT & OPERATIONS GUIDE - MÉRA OS

## 8.1 Manajemen Lingkungan (Environment)
Aplikasi mematuhi pemisahan kredensial yang ketat di Vercel:
- **Development/Trial:** Menggunakan Supabase Project A (Untuk presentasi kru).
- **Production/Live:** Menggunakan Supabase Project B (Bersih, untuk hari H operasional).

## 8.2 Standard Operating Procedure (SOP) Kesalahan
Sistem didesain untuk mencegah *human error* di kasir, namun kru harus mengikuti protokol ini:
- **Salah Harga/Refund:** Kru tidak bisa menghapus transaksi di Kolom 3. Kru harus memanggil Owner (membutuhkan PIN `1609`) untuk memasukkan nominal di kolom `discount_amount` beserta catatan *Refund*.
- **Browser Refresh Accident:** State aplikasi diamankan di `localStorage`. Jika iMac ter- *restart*, data keranjang belanja pelanggan di Kolom 3 tidak akan hilang.

## 8.3 Hardware Readiness
- Kabel LAN wajib tertancap dari Mac Mini M1 ke Router utama.
- Layar Tablet Android pelanggan harus di- *pin* pada mode *Kiosk* agar mereka tidak bisa menutup browser pemilihan foto.