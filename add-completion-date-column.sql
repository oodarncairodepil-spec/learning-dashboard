-- Add completion_date column to cards table
ALTER TABLE cards ADD COLUMN IF NOT EXISTS completion_date TIMESTAMP WITH TIME ZONE;

-- Update the specific Python bootcamp card that was completed on 11 Sep 2025
-- Find and update the card with title containing "Advanced Python Modules Part 1"
UPDATE cards 
SET completion_date = '2025-09-11 08:59:00+00'
WHERE title LIKE '%Advanced Python Modules Part 1%' 
  AND user_id = (SELECT id FROM users WHERE email = 'kalantara.waranggana@gmail.com')
  AND column_id = (SELECT id FROM columns WHERE title = 'Done' AND user_id = (SELECT id FROM users WHERE email = 'kalantara.waranggana@gmail.com'));