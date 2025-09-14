-- Add column_settings table to store user preferences per column
CREATE TABLE IF NOT EXISTS column_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    column_id UUID NOT NULL REFERENCES columns(id) ON DELETE CASCADE,
    
    -- Column display settings
    column_display_mode VARCHAR(20) DEFAULT 'category' CHECK (column_display_mode IN ('none', 'category', 'day_category')),
    
    -- Column count display settings
    count_display_type VARCHAR(20) DEFAULT 'cards' CHECK (count_display_type IN ('cards', 'duration')),
    
    -- Card data visibility settings
    show_card_duration BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one settings record per user per column
    UNIQUE(user_id, column_id)
);

-- Create trigger to update updated_at
CREATE TRIGGER update_column_settings_updated_at 
    BEFORE UPDATE ON column_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default settings for existing user-column combinations
INSERT INTO column_settings (user_id, column_id, column_display_mode, count_display_type, show_card_duration)
SELECT c.user_id, c.id, 'category', 'cards', true
FROM columns c
ON CONFLICT (user_id, column_id) DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE column_settings IS 'Stores user preferences for dashboard display settings per column';
COMMENT ON COLUMN column_settings.column_display_mode IS 'How cards are grouped in this column: none (flat list), category (by category), day_category (by day then category)';
COMMENT ON COLUMN column_settings.count_display_type IS 'What to show in column count: cards (number of cards) or duration (total time)';
COMMENT ON COLUMN column_settings.show_card_duration IS 'Whether to display duration on individual cards in this column';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_column_settings_user_id ON column_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_column_settings_column_id ON column_settings(column_id);
CREATE INDEX IF NOT EXISTS idx_column_settings_user_column ON column_settings(user_id, column_id);