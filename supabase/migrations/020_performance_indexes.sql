-- 020_performance_indexes.sql
-- Optimizes Disk IO and query performance for Méra OS

-- 1. Accelerate bookings lookup by preferred_date (heavily used in daily and weekly schedule views)
CREATE INDEX IF NOT EXISTS idx_registrations_preferred_date 
  ON public.registrations(preferred_date);

-- 2. Accelerate composite filter on preferred_date and preferred_time
CREATE INDEX IF NOT EXISTS idx_registrations_date_time 
  ON public.registrations(preferred_date, preferred_time);

-- 3. Accelerate transaction foreign key lookups to registrations
CREATE INDEX IF NOT EXISTS idx_transactions_registration_id 
  ON public.transactions(registration_id);

-- 4. Accelerate expense lookups by date
CREATE INDEX IF NOT EXISTS idx_expenses_tanggal 
  ON public.expenses(tanggal);

-- 5. Accelerate active attendance status checks
CREATE INDEX IF NOT EXISTS idx_attendance_status 
  ON public.attendance(status);
