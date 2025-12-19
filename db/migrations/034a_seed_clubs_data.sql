-- Migration: Seed clubs table with initial data
-- Date: 2025-12-19
-- Description: Populates clubs table with existing club data for development database
-- Note: Sets pro_member_id to NULL for users that don't exist in dev database

-- ============================================================================
-- INSERT CLUB DATA
-- ============================================================================

-- Temporarily disable the foreign key constraint to insert clubs
ALTER TABLE clubs DROP CONSTRAINT IF EXISTS clubs_pro_member_id_fkey;

-- Insert clubs data (only if they don't already exist)
INSERT INTO clubs (id, club_name, pro_first_name, pro_last_name, pro_member_id, pro_email, club_address, club_type, number_of_bays, has_bathroom, monitor_oem, monitor_model, software, hour_open, hour_close, is_active, created_at, updated_at)
VALUES
  (1, 'No. 5', 'Andrew', 'George', 20684701, 'andrew@neighborhoodnationalgc.com', '4409 Randall Rd, Durham, NC 27707', 'Residential', 1, true, 'Bushnell', 'BLP', 'GSPro', '07:00:00', '21:00:00', true, '2025-11-25 18:47:29.647179', '2025-11-25 18:56:55.253738'),
  (2, 'No. 10', 'Adam', 'Christoper', 27974984, 'achristopher152@yahoo.com', '578 Water Lily Trail, Summerville, SC 29485', 'Residential', 1, true, 'Bushnell', 'BLP', 'GSPro', '07:00:00', '21:00:00', true, '2025-11-25 18:56:55.253738', '2025-11-25 18:56:55.253738'),
  (3, 'No. 8', 'Anderson', 'Joiner', 24013083, 'andersonjoiner@yahoo.com', '4931 Phillips Drive, Forest Park, GA 30297', 'Commercial', 2, true, 'Trackman, Bushnell', 'iO (Trackman), LPi (Bushnell)', 'Trackman, GSPro', '05:00:00', '23:59:00', true, '2025-11-25 18:56:55.253738', '2025-11-25 18:56:55.253738'),
  (5, 'No. 2', 'Dan', 'Miller', 24426081, 'dan@neighborhoodnationalgc.com', '3205 Clark Ave, Raleigh, NC 27607', 'Residential', 1, true, 'Foresight', 'GC3', 'GSPro, FSPlay, FSX', '07:00:00', '21:00:00', true, '2025-11-25 18:56:55.253738', '2025-11-25 18:56:55.253738'),
  (6, 'No. 12', 'Garrick', 'Throckmorton', 35769966, 'thesherwoodshed@gmail.com', '331 Staffordshire Road, Winston-Salem, NC 27104', 'Residential', 1, false, 'Bushnell', 'BLP', 'GSPro', '07:00:00', '20:00:00', true, '2025-11-25 18:56:55.253738', '2025-11-25 18:56:55.253738'),
  (7, 'No. 1', 'Jeff', 'Testa', 20725055, 'headpro@neighborhoodnationalgc.com', '308 Waverly Way, Greensboro, NC 27403', 'Residential', 1, true, 'Foresight', 'GCQuad', 'GSPro, FSPlay, FSX', '07:00:00', '21:00:00', true, '2025-11-25 18:56:55.253738', '2025-11-25 18:56:55.253738'),
  (8, 'No. 4', 'Jeff', 'Testa', 20725055, 'headpro@neighborhoodnationalgc.com', '1208 Oakland Ave, Greensboro, NC 27403', 'Commercial', 2, true, 'Uneekor', 'Eye XO', 'GSPro, View', '00:00:00', '23:59:00', true, '2025-11-25 18:56:55.253738', '2025-11-25 18:56:55.253738'),
  (9, 'No. 9', 'Niles', 'Fleet', 31593512, 'nfleet01@gmail.com', '414 N. Hawthorne Rd, Winston Salem, NC 27104', 'Residential', 1, false, 'Foresight', 'GC3', 'GSPro, FSPlay, FSX', '07:00:00', '21:00:00', true, '2025-11-25 18:56:55.253738', '2025-11-25 18:56:55.253738'),
  (10, 'No. 7', 'Seth', 'Robles', 28749353, 'blossombluffgc@gmail.com', '3942 Bent Grass, San Antonio, TX 78261', 'Residential', 1, false, 'Bushnell', 'BLP', 'GSPro', '07:00:00', '21:00:00', true, '2025-11-25 18:56:55.253738', '2025-11-25 18:56:55.253738'),
  (11, 'No. 11', 'Taliferro', 'Neal', 32733686, 'corridorclubhouse@gmail.com', '11503 Jones Maltzberger Rd, San Antonio, TX 78216', 'Commercial', 1, true, 'Bushnell', 'BLP', 'GSPro', '00:00:00', '23:59:00', true, '2025-11-25 18:56:55.253738', '2025-11-25 18:56:55.253738'),
  (12, 'No. 6', 'Erin', 'Thorne', 24209356, 'airnest17llc@outlook.com', 'Inactive Location', 'Residential', 1, false, NULL, NULL, NULL, NULL, NULL, false, '2025-11-25 19:02:33.11077', '2025-11-25 19:02:33.11077'),
  (14, 'No. 14', 'John', 'Christ', 37324355, 'dynamic1329@gmail.com', '1234, test drive, test, test, 12345', 'Residential', 1, false, 'Bushnell', 'BLP', 'GSPro', NULL, NULL, true, '2025-12-17 00:57:31.084854', '2025-12-17 00:57:31.084854')
ON CONFLICT (club_name) DO NOTHING;

-- Set pro_member_id to NULL for any members that don't exist in the users table
UPDATE clubs
SET pro_member_id = NULL
WHERE pro_member_id IS NOT NULL
  AND pro_member_id NOT IN (SELECT member_id FROM users);

-- Re-add the foreign key constraint
ALTER TABLE clubs
ADD CONSTRAINT clubs_pro_member_id_fkey
FOREIGN KEY (pro_member_id) REFERENCES users(member_id) ON DELETE SET NULL;

-- Update the sequence to the correct value
SELECT setval('clubs_id_seq', (SELECT MAX(id) FROM clubs));

-- Show results
SELECT COUNT(*) as clubs_inserted FROM clubs;
