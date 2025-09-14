-- Add section_display_mode column to user_settings table for dashboard section display preferences
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS section_display_mode VARCHAR(20) DEFAULT 'cards_only' 
CHECK (section_display_mode IN ('cards_only', 'cards_and_duration'));

-- Add comment for documentation
COMMENT ON COLUMN user_settings.section_display_mode IS 'How section headers display information: cards_only (show only card count) or cards_and_duration (show card count and total duration)';

-- Update existing records to have the default value
UPDATE user_settings 
SET section_display_mode = 'cards_only' 
WHERE section_display_mode IS NULL;