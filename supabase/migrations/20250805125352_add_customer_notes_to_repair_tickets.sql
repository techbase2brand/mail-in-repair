-- Add customer_notes column to repair_tickets table
ALTER TABLE repair_tickets ADD COLUMN IF NOT EXISTS customer_notes TEXT;