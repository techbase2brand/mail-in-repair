-- Add estimated_cost column to repair_tickets table
ALTER TABLE repair_tickets ADD COLUMN IF NOT EXISTS estimated_cost DECIMAL(10, 2);