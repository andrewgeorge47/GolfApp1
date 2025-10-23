-- Add registration form fields to tournaments table
-- This migration safely adds the new columns only if they don't already exist

DO $$
BEGIN
    -- Add has_registration_form column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tournaments' 
        AND column_name = 'has_registration_form'
    ) THEN
        ALTER TABLE tournaments ADD COLUMN has_registration_form boolean DEFAULT false;
        RAISE NOTICE 'Added has_registration_form column to tournaments table';
    ELSE
        RAISE NOTICE 'has_registration_form column already exists in tournaments table';
    END IF;

    -- Add registration_form_template column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tournaments' 
        AND column_name = 'registration_form_template'
    ) THEN
        ALTER TABLE tournaments ADD COLUMN registration_form_template character varying(100) DEFAULT NULL;
        RAISE NOTICE 'Added registration_form_template column to tournaments table';
    ELSE
        RAISE NOTICE 'registration_form_template column already exists in tournaments table';
    END IF;

    -- Add registration_form_data column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tournaments' 
        AND column_name = 'registration_form_data'
    ) THEN
        ALTER TABLE tournaments ADD COLUMN registration_form_data jsonb DEFAULT NULL;
        RAISE NOTICE 'Added registration_form_data column to tournaments table';
    ELSE
        RAISE NOTICE 'registration_form_data column already exists in tournaments table';
    END IF;

END $$;

-- Add index for registration form queries (only if it doesn't exist)
CREATE INDEX IF NOT EXISTS idx_tournaments_has_registration_form ON tournaments(has_registration_form);

-- Verify the changes
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'tournaments' 
AND column_name IN ('has_registration_form', 'registration_form_template', 'registration_form_data')
ORDER BY column_name; 