-- ============================================================
-- 010: PhoneBooth — photo strip storage + promo consent
-- ============================================================

-- Table to track phonebooth photo strips
CREATE TABLE IF NOT EXISTS phonebooth_photos (
    id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
    strip_url   text        NOT NULL,
    filter      text        NOT NULL DEFAULT 'bw',
    photo_count smallint    NOT NULL DEFAULT 3,
    promo_consent boolean   NOT NULL DEFAULT false,
    created_at  timestamptz DEFAULT now()
);

ALTER TABLE phonebooth_photos ENABLE ROW LEVEL SECURITY;

-- Anyone (anonymous / no auth) can insert — photobooth is public
CREATE POLICY "phonebooth_insert"
    ON phonebooth_photos FOR INSERT
    WITH CHECK (true);

-- Only authenticated users (admin dashboard) can read
CREATE POLICY "phonebooth_select_authenticated"
    ON phonebooth_photos FOR SELECT
    USING (auth.role() = 'authenticated');

-- ── Storage bucket for phonebooth strips ────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('phonebooth', 'phonebooth', true)
ON CONFLICT (id) DO NOTHING;

-- Anyone can upload to the phonebooth bucket (no auth required)
CREATE POLICY "phonebooth_storage_insert"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'phonebooth');

-- Public read access for phonebooth bucket
CREATE POLICY "phonebooth_storage_select"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'phonebooth');
