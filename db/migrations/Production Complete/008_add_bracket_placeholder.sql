-- Add a placeholder user for bracket matches that haven't been filled yet
INSERT INTO users (member_id, first_name, last_name, email_address, club, role)
VALUES (-1, 'TBD', 'TBD', 'placeholder@golf.com', 'TBD', 'Member')
ON CONFLICT (member_id) DO NOTHING;

-- Update the NOT NULL constraints for national_championship_matches
-- Allow NULL or we can keep NOT NULL and use placeholder
-- For now, let's keep NOT NULL and use TBD user
