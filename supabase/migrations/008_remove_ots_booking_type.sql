-- ============================================================
-- Migration 008: Remove OTS booking type across live schema
-- - Converts legacy OTS rows to online keep-slot
-- - Enforces online-only booking_type in registrations
-- - Rebuilds bookings.booking_type enum without OTS
-- ============================================================

-- 1) Registrations (text booking_type)
UPDATE public.registrations
SET booking_type = 'ONLINE_KEEPSLOT'
WHERE booking_type = 'OTS';

ALTER TABLE public.registrations
  ALTER COLUMN booking_type SET DEFAULT 'ONLINE_KEEPSLOT';

ALTER TABLE public.registrations
  DROP CONSTRAINT IF EXISTS registrations_booking_type_check;

ALTER TABLE public.registrations
  ADD CONSTRAINT registrations_booking_type_check
  CHECK (booking_type IN ('ONLINE_KEEPSLOT', 'ONLINE_QRIS'));

-- 2) Bookings enum (KEEP_SLOT/QRIS only)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'bookings'
  ) THEN
    -- Map legacy OTS rows first
    UPDATE public.bookings
    SET booking_type = 'KEEP_SLOT'
    WHERE booking_type::text = 'OTS';

    -- Create replacement enum if needed
    IF NOT EXISTS (
      SELECT 1 FROM pg_type WHERE typname = 'booking_type_enum_v2'
    ) THEN
      CREATE TYPE public.booking_type_enum_v2 AS ENUM ('KEEP_SLOT', 'QRIS');
    END IF;

    -- Move column to new enum and set default
    ALTER TABLE public.bookings
      ALTER COLUMN booking_type DROP DEFAULT,
      ALTER COLUMN booking_type TYPE public.booking_type_enum_v2
        USING (
          CASE
            WHEN booking_type::text = 'OTS' THEN 'KEEP_SLOT'
            ELSE booking_type::text
          END
        )::public.booking_type_enum_v2,
      ALTER COLUMN booking_type SET DEFAULT 'KEEP_SLOT';

    -- Swap type names so app code keeps using booking_type_enum
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_type_enum') THEN
      DROP TYPE public.booking_type_enum;
    END IF;

    ALTER TYPE public.booking_type_enum_v2 RENAME TO booking_type_enum;
  END IF;
END $$;