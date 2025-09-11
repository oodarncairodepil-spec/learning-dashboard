-- Insert Python Bootcamp course data for kalantara.waranggana@gmail.com
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
('complete-python-bootcamp Course Overview', 19),
('complete-python-bootcamp Python Setup', 63),
('complete-python-bootcamp Python Object & Data structure - Part 1', 61),
('complete-python-bootcamp Python Object & Data structure - Part 2', 61),
('complete-python-bootcamp Python Comparison Operators', 9),
('complete-python-bootcamp Python Statements', 75),
('complete-python-bootcamp Milestone 1', 30),
('complete-python-bootcamp Methods and Functions - Part 1', 58),
('complete-python-bootcamp Methods and Functions - Part 2', 58),
('complete-python-bootcamp Methods and Functions - Part 3', 58),
('complete-python-bootcamp Milestone 2', 30),
('complete-python-bootcamp Object Oriented Programming', 81),
('complete-python-bootcamp Modules and Packages', 29),
('complete-python-bootcamp Errors and Exceptions Handling', 46),
('complete-python-bootcamp Milestone 3', 30),
('complete-python-bootcamp Python Decorators', 23),
('complete-python-bootcamp Python Generators', 17),
('complete-python-bootcamp Advanced Python Modules Part 1', 71),
('complete-python-bootcamp Advanced Python Modules Part 2', 71),
('complete-python-bootcamp Milestone 4', 30),
('complete-python-bootcamp Web Scraping with Python', 100),
('complete-python-bootcamp Milestone 5', 30),
('complete-python-bootcamp Working with Images with Python', 24),
('complete-python-bootcamp Working with PDFs and Spreadsheet CSV Files', 45),
('complete-python-bootcamp Emails with Python', 28),
('complete-python-bootcamp Final Milestone 6', 30),
('complete-python-bootcamp Advanced Python Objects and Data Structures', 41),
('complete-python-bootcamp Bonus Material - Introduction to GUIs', 45)
) AS course_data(title, duration)
WHERE u.email = 'kalantara.waranggana@gmail.com'
AND c.name = 'Programming'
AND col.title = 'Backlog';

-- Note: Execute this script in your Supabase SQL Editor after running the main database-schema.sql
-- This will add all 28 Python bootcamp courses to kalantara.waranggana@gmail.com's account