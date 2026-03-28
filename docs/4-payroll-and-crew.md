# 4. CREW MANAGEMENT & PAYROLL ENGINE - MÉRA OS

## 4.1 Identitas & Struktur Kru
- **Data Inti:** Satria, Feby.
- **Role System:** Tidak ada perbedaan level akses kasir antar kru. Semua kru memiliki hak akses yang sama di POS, namun terikat pada `crew_id` masing-masing saat melakukan absensi dan transaksi untuk pelacakan performa.
- **Integritas Data (Soft-Delete):** Kru yang *resign* tidak pernah dihapus dari database (`DELETE`), melainkan diubah statusnya menjadi `is_active: false`. Ini WAJIB agar data laporan keuangan masa lalu tidak *crash* saat mencari relasi ID kasir. Penambahan sistem tambah crew baru.

## 4.2 Skema Gaji Pokok (Base Rate)
Sistem (via `PapaParse` CSV atau Supabase Edge Functions) harus menghitung gaji harian berdasarkan tipe hari dan durasi *shift* yang dipilih kru saat *clock-in*.

| Tipe Hari | Jenis Shift | Rate Gaji (Rp) | Keterangan Waktu |
| :--- | :--- | :--- | :--- |
| **Weekday** (Senin-Kamis) | Full Day | **75.000** | 1 Shift panjang (Buka - Tutup) |
| **Weekend** (Jumat-Minggu) | Half Shift | **35.000** | Shift terbagi (Pagi/Malam) |
| **Weekend** (Jumat-Minggu) | Full Day | **100.000** | Buka - Tutup |

## 4.3 Logika Penalti & Disiplin (Late Penalty)
Mesin absensi membaca jam *clock-in* kru vs jadwal *shift* baku.
- **Grace Period (Toleransi):** 10 Menit. (Contoh: Masuk 09:10 masih aman).
- **Trigger Penalti:** Dimulai tepat pada menit ke-11.
- **Kalkulasi:** `late_minutes` dikalkulasi oleh sistem, lalu dikonversi menjadi potongan Rp. 5.000 per 10 menit keterlambatan (berlaku kelipatan).

## 4.4 Sistem Bonus Tim (Team Target / Upsell)
Bonus tidak dihitung per individu untuk menghindari persaingan tidak sehat antar kru (Satria vs Feby), melainkan berbasis omset kumulatif harian studio.

- **Target Weekday:** Rp 1.000.000 / hari.
- **Target Weekend:** Rp 1.500.000 / hari.
- **Mekanisme:** Jika target tercapai, maka seluruh kru yang bekerja pada hari tersebut mendapatkan pembagian persentase 50:50 dari bonus omset hari itu.   

## 4.5 Alur Kerja Modul Absensi (UI/UX)
1. Kru membuka tab Absensi di layar iMac.
2. Tidak ada ketik PIN manual (untuk mempercepat). Kru memilih foto wajah/nama mereka di layar.
3. Web menyalakan *Webcam* iMac -> Jepret foto *Clock-in*.
4. Sistem mencatat jam masuk, foto di-*upload* ke Google Drive.
5. Sistem mengunci status `is_working: true`.
6. Saat pulang, kru klik *Clock-out* -> Cek Omset hari ini -> Cek Rekap QRIS hari ini -> Cek Rekap Tunai hari ini -> Jepret foto -> Sistem otomatis menghitung `Total Gaji Hari Ini` (Base + Bonus - Penalti).