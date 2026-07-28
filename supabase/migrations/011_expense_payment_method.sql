-- Add payment method field to expenses table
-- Tracks whether each expense was paid by CASH or QRIS/TRANSFER

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS metode_bayar TEXT NOT NULL DEFAULT 'CASH'
  CHECK (metode_bayar IN ('CASH', 'QRIS'));
