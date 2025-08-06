-- Add actual_cost column to repair_tickets table
ALTER TABLE repair_tickets ADD COLUMN IF NOT EXISTS actual_cost DECIMAL(10, 2);