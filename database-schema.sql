-- Learning Progress Dashboard Database Schema for Supabase

-- Drop existing tables if they exist (in correct order due to foreign keys)
DROP TABLE IF EXISTS cards CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS columns CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create users table
CREATE TABLE users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default users
INSERT INTO users (email, password_hash) VALUES 
    ('kalantara.waranggana@gmail.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'), -- abc123
    ('ligar.pandika@gmail.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'); -- cba321

-- Create columns table
CREATE TABLE columns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create categories table
CREATE TABLE categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    color VARCHAR(7) DEFAULT '#007bff',
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(name, user_id)
);

-- Create cards table
CREATE TABLE cards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    column_id UUID REFERENCES columns(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    duration INTEGER DEFAULT 0, -- in minutes
    date_created DATE DEFAULT CURRENT_DATE,
    completion_date TIMESTAMP WITH TIME ZONE, -- when card was moved to Done column
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_cards_column_id ON cards(column_id);
CREATE INDEX IF NOT EXISTS idx_cards_category_id ON cards(category_id);
CREATE INDEX IF NOT EXISTS idx_cards_position ON cards(position);
CREATE INDEX IF NOT EXISTS idx_columns_position ON columns(position);

-- Insert default categories for kalantara.waranggana@gmail.com
INSERT INTO categories (name, color, user_id) 
SELECT 'Programming', '#007bff', u.id FROM users u WHERE u.email = 'kalantara.waranggana@gmail.com'
UNION ALL
SELECT 'Design', '#28a745', u.id FROM users u WHERE u.email = 'kalantara.waranggana@gmail.com'
UNION ALL
SELECT 'Marketing', '#ffc107', u.id FROM users u WHERE u.email = 'kalantara.waranggana@gmail.com'
UNION ALL
SELECT 'Business', '#dc3545', u.id FROM users u WHERE u.email = 'kalantara.waranggana@gmail.com'
UNION ALL
SELECT 'Personal', '#6f42c1', u.id FROM users u WHERE u.email = 'kalantara.waranggana@gmail.com'
UNION ALL
SELECT 'Language', '#17a2b8', u.id FROM users u WHERE u.email = 'kalantara.waranggana@gmail.com';

-- Default columns will be created by the application when user first logs in
-- This prevents duplicate columns from being created

-- Disable Row Level Security (RLS) for custom authentication
-- Since we're using custom authentication instead of Supabase auth,
-- we'll handle data isolation in the application layer
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE columns DISABLE ROW LEVEL SECURITY;
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE cards DISABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can manage their own columns" ON columns;
DROP POLICY IF EXISTS "Users can manage their own categories" ON categories;
DROP POLICY IF EXISTS "Users can manage their own cards" ON cards;

-- Note: RLS policies are disabled since we use custom authentication
-- Data isolation is handled by filtering queries with user_id in the application

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_columns_updated_at ON columns;
DROP TRIGGER IF EXISTS update_cards_updated_at ON cards;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_columns_updated_at BEFORE UPDATE ON columns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cards_updated_at BEFORE UPDATE ON cards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update existing data to be owned by kalantara.waranggana@gmail.com
UPDATE cards SET user_id = (SELECT id FROM users WHERE email = 'kalantara.waranggana@gmail.com') WHERE user_id IS NULL;
UPDATE categories SET user_id = (SELECT id FROM users WHERE email = 'kalantara.waranggana@gmail.com') WHERE user_id IS NULL;
UPDATE columns SET user_id = (SELECT id FROM users WHERE email = 'kalantara.waranggana@gmail.com') WHERE user_id IS NULL;