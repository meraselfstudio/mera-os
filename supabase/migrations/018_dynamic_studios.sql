-- ============================================================
-- Migration 018: Dynamic Studios
-- ============================================================
-- Purpose:
-- Move hardcoded studio rooms from the frontend into the database
-- so that studios can be added, updated, or removed dynamically.

-- 1. Create studios table
CREATE TABLE IF NOT EXISTS public.studios (
    id TEXT PRIMARY KEY, -- e.g., 'Basic Studio', 'Elevator Studio' (used as foreign key or identifier in frontend)
    name TEXT NOT NULL,
    description TEXT,
    emoji TEXT,
    accent TEXT NOT NULL DEFAULT '#ffffffff',
    bg_gradient TEXT NOT NULL DEFAULT 'linear-gradient(160deg, #000000ff 0%, #1b1b1bff 100%)',
    image_url TEXT,
    shared_slots_group TEXT, -- e.g., 'thematic' for Majestic/Elevator to share slots
    allowed_categories JSONB, -- e.g., '["thematic"]' or '["basic", "special"]'
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Add RLS Policies
ALTER TABLE public.studios ENABLE ROW LEVEL SECURITY;

-- Select is allowed for everyone (public)
CREATE POLICY "studios_public_select"
    ON public.studios FOR SELECT
    USING (true);

-- Write operations are only for service_role
CREATE POLICY "studios_service_write"
    ON public.studios FOR ALL
    USING (auth.role() = 'service_role');


-- 3. Seed initial studios
INSERT INTO public.studios (id, name, emoji, image_url, sort_order, shared_slots_group, allowed_categories, is_active)
VALUES 
    (
        'Basic Studio',
        'Basic Studio',
        '🖤',
        '/photo-basic-lg-1.png',
        1,
        NULL,
        '["basic studio"]'::jsonb,
        true
    ),
    (
        'Pas Photo',
        'Pas Photo',
        '🎩',
        '/photo-pasphoto-bl.png',
        2,
        NULL,
        '["pas photo"]'::jsonb,
        true
    ),
    (
        'Majestic Studio',
        'Majestic Studio',
        '👑',
        '/photo-majestic-1.png',
        3,
        'thematic', -- Shares slots with Elevator
        '["thematic"]'::jsonb, -- Only shows thematic products
        false
    ),
    (
        'Elevator Studio',
        'Elevator Studio',
        '🛗',
        '/photo-elevator-1.png',
        4,
        'thematic', -- Shares slots with Majestic
        '["thematic"]'::jsonb, -- Only shows thematic products
        false
    )
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    emoji = EXCLUDED.emoji,
    image_url = EXCLUDED.image_url,
    shared_slots_group = EXCLUDED.shared_slots_group,
    allowed_categories = EXCLUDED.allowed_categories,
    is_active = EXCLUDED.is_active;
