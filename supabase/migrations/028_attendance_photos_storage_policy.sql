-- =============================================================
-- Migration 028: Storage Bucket & RLS for attendance-photos
-- =============================================================

-- 1. Pastikan bucket 'attendance-photos' terdaftar di storage.buckets
INSERT INTO storage.buckets (id, name, public)
VALUES ('attendance-photos', 'attendance-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Hapus policy lama jika ada untuk mencegah duplikasi
DROP POLICY IF EXISTS "attendance_photos_insert" ON storage.objects;
DROP POLICY IF EXISTS "attendance_photos_select" ON storage.objects;
DROP POLICY IF EXISTS "attendance_photos_update" ON storage.objects;

-- 3. Policy INSERT: Izinkan upload foto absensi ke bucket attendance-photos
CREATE POLICY "attendance_photos_insert"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'attendance-photos');

-- 4. Policy SELECT: Izinkan akses lihat/baca foto absensi
CREATE POLICY "attendance_photos_select"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'attendance-photos');

-- 5. Policy UPDATE: Izinkan upsert foto
CREATE POLICY "attendance_photos_update"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'attendance-photos')
    WITH CHECK (bucket_id = 'attendance-photos');
