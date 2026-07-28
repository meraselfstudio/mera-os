-- Add JSONB metadata column to products
-- Used by kiosk frame overlays (frame_url, thumbnail_url, type, slots)
ALTER TABLE products ADD COLUMN IF NOT EXISTS metadata JSONB;
