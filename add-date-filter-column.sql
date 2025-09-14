-- Add date_filter_type column to column_settings table
ALTER TABLE column_settings 
ADD COLUMN IF NOT EXISTS date_filter_type VARCHAR(20) DEFAULT 'assigned_date' 
CHECK (date_filter_type IN ('assigned_date', 'completed_date'));

-- Add comment for documentation
COMMENT ON COLUMN column_settings.date_filter_type IS 'Which date to use for grouping cards in day_category mode: assigned_date (use assigned date) or completed_date (use completion date)';

-- Update existing records to have the default value
UPDATE column_settings 
SET date_filter_type = 'assigned_date' 
WHERE date_filter_type IS NULL;