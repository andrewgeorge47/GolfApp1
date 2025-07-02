-- Add created_at column to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS created_at timestamp without time zone;

-- Add index for better performance on created_at queries
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Update existing users to have a default created_at value
-- This will set all existing users to have joined on the earliest date from the CSV (12/13/23)
UPDATE public.users 
SET created_at = '2023-12-13 00:00:00' 
WHERE created_at IS NULL; 