-- Insert Spanish Course data for kalantara.waranggana@gmail.com
-- Insert into cards table with proper foreign key references

INSERT INTO cards (user_id, title, description, category_id, column_id, duration, position, created_at, updated_at) 
SELECT 
    u.id as user_id,
    course_data.title,
    '' as description,
    c.id as category_id,
    col.id as column_id,
    course_data.duration,
    ROW_NUMBER() OVER (ORDER BY course_data.title) - 1 as position,
    NOW() as created_at,
    NOW() as updated_at
FROM users u
CROSS JOIN categories c
CROSS JOIN columns col
CROSS JOIN (
    VALUES
('el-metodo-spanish-1 Lesson 1 Level 1', 16),
('el-metodo-spanish-1 Lesson 2 Level 1', 14),
('el-metodo-spanish-1 Lesson 3 Level 1', 9),
('el-metodo-spanish-1 Lesson 4 Level 1', 16),
('el-metodo-spanish-1 Lesson 5 Level 1', 11),
('el-metodo-spanish-1 Lesson 6 Level 1', 13),
('el-metodo-spanish-1 Lesson 7 Level 1', 14),
('el-metodo-spanish-1 Lesson 8 Level 1', 13),
('el-metodo-spanish-1 Lesson 9 Level 1', 10),
('el-metodo-spanish-1 Lesson 10 Level 1', 15),
('el-metodo-spanish-1 Lesson 11 Level 1', 9),
('el-metodo-spanish-1 Lesson 12 Level 1', 12),
('el-metodo-spanish-1 Lesson 13 Level 1', 10),
('el-metodo-spanish-1 Lesson 14 Level 1', 12),
('el-metodo-spanish-1 Lesson 15 Level 1', 7),
('el-metodo-spanish-1 Lesson 16 Level 1', 10),
('el-metodo-spanish-1 Lesson 17 Level 1', 9),
('el-metodo-spanish-1 Lesson 18 Level 1', 10),
('el-metodo-spanish-1 Lesson 19 Level 1', 9),
('el-metodo-spanish-1 Lesson 20 Level 1', 9)
) AS course_data(title, duration)
WHERE u.email = 'kalantara.waranggana@gmail.com'
AND c.name = 'Language'
AND col.title = 'Backlog';

-- Note: Execute this script in your Supabase SQL Editor after running the main database-schema.sql
-- This will add all 20 Spanish course lessons to kalantara.waranggana@gmail.com's account in the Language category