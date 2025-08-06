-- Rename media_files table to repair_media and update column names
ALTER TABLE IF EXISTS media_files RENAME TO repair_media;

-- Rename columns to match the new schema 
-- Column already named repair_ticket_id, no need to rename
ALTER TABLE IF EXISTS repair_media RENAME COLUMN public_url TO file_url;

-- Add new columns
ALTER TABLE IF EXISTS repair_media ADD COLUMN IF NOT EXISTS is_before BOOLEAN DEFAULT true;

-- Drop columns that are no longer needed
ALTER TABLE IF EXISTS repair_media DROP COLUMN IF EXISTS file_path;
ALTER TABLE IF EXISTS repair_media DROP COLUMN IF EXISTS file_size;
ALTER TABLE IF EXISTS repair_media DROP COLUMN IF EXISTS status;

-- Rename file_name to description
ALTER TABLE IF EXISTS repair_media RENAME COLUMN file_name TO description;