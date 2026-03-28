# 2. DATABASE SCHEMA - MÉRA OS

## 2.1 Entity Relationship Diagram (ERD) & Struktur Tabel

### Tabel: `registrations` (The Queue Engine - Baru)
Menampung data mentah dari Pelanggan (Fase 1) sebelum disahkan menjadi Transaksi.
- `id` (UUID, PK)
- `customer_name` (String, validated)
- `instagram_handle` (String, wajib untuk distribusi file)
- `studio_choice` (String)
- `background_code` (String, enum: MR, LG, DG, dll)
- `booking_type` (Enum: 'ONLINE', 'OTS')
- `status` (Enum: 'PENDING', 'KEEPSLOT', 'UNVERIFIED_QRIS', 'PROCESSED', 'EXPIRED')
- `created_at` (Timestamp)

### Tabel: `transactions` (The Financial Truth)
- `id` (UUID, PK)
- `session_id` (String, Unique) -> Format wajib: DD-NAME-CODE (contoh: 27-AYU-MR) Bulan menyesuaikan real clock
- `registration_id` (UUID, FK ke registrations)
- `crew_id` (UUID, FK ke tabel kru)
- `total_amount` (Integer)
- `discount_amount` (Integer, default 0 - untuk refund/kompensasi)
- `payment_method` (Enum: 'CASH', 'QRIS')
- `status` (Enum: 'ACTIVE', 'DONE')

### Tabel: `products` (The Tiered Pricing Logic)
Skema untuk menangani harga bertingkat tanpa hardcoding di UI.
- `id` (Int, PK)
- `nama` (String)
- `kategori` (String)
- `tipe_harga` (Enum: 'NORMAL', 'TIERED')
- `harga_dasar` (Int, untuk tipe NORMAL)
- `tier_1` (Int) -- cth: 15000
- `tier_2` (Int) -- cth: 30000
- `tier_3` (Int) -- cth: 35000
- `tier_lebih` (Int) -- cth: 13000

## 2.2 SQL Trigger: Auto-Expire KeepSlot
Menjaga Kolom 1 POS dari "Antrean Hantu".

```sql
CREATE OR REPLACE FUNCTION purge_expired_slots()
RETURNS void AS $$
BEGIN
  -- 1. Expire Online Bookings after 6 hours
  UPDATE registrations 
  SET status = 'EXPIRED' 
  WHERE status = 'KEEPSLOT' AND booking_type = 'ONLINE' 
  AND created_at < NOW() - INTERVAL '6 hours';

  -- 2. Expire Walk-in/OTS after 30 minutes
  UPDATE registrations 
  SET status = 'EXPIRED' 
  WHERE status = 'KEEPSLOT' AND booking_type = 'OTS' 
  AND created_at < NOW() - INTERVAL '30 minutes';
END;
$$ LANGUAGE plpgsql;