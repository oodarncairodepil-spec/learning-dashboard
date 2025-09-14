-- Add date_sort_order column to column_settings table
-- This column will store the user's preference for sorting dates (ascending or descending)

ALTER TABLE column_settings 
ADD COLUMN date_sort_order VARCHAR(10) DEFAULT 'descending';

-- Add a check constraint to ensure only valid values
ALTER TABLE column_settings 
ADD CONSTRAINT check_date_sort_order 
CHECK (date_sort_order IN ('ascending', 'descending'));

-- Update existing records to have the default value
UPDATE column_settings 
SET date_sort_order = 'descending' 
WHERE date_sort_order IS NULL;