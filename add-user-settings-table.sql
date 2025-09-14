-- Add user_settings table to store user preferences
CREATE TABLE IF NOT EXISTS user_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Column display settings
    column_display_mode VARCHAR(20) DEFAULT 'category' CHECK (column_display_mode IN ('none', 'category', 'day_category')),
    
    -- Column count display settings
    count_display_type VARCHAR(20) DEFAULT 'cards' CHECK (count_display_type IN ('cards', 'duration')),
    
    -- Card data visibility settings
    show_card_duration BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one settings record per user
    UNIQUE(user_id)
);

-- Create trigger to update updated_at
CREATE TRIGGER update_user_settings_updated_at 
    BEFORE UPDATE ON user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default settings for existing users
INSERT INTO user_settings (user_id, column_display_mode, count_display_type, show_card_duration)
SELECT id, 'category', 'cards', true
FROM users
ON CONFLICT (user_id) DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE user_settings IS 'Stores user preferences for dashboard display settings';
COMMENT ON COLUMN user_settings.column_display_mode IS 'How cards are grouped in columns: none (flat list), category (by category), day_category (by day then category)';
COMMENT ON COLUMN user_settings.count_display_type IS 'What to show in column count: cards (number of cards) or duration (total time)';
COMMENT ON COLUMN user_settings.show_card_duration IS 'Whether to display duration on individual cards';