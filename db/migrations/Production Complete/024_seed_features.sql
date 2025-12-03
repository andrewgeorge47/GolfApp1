-- Seed Data: Feature Testing System
-- Date: 2025-12-02
-- Description: Populate feature testing with navigation bar features

-- Note: Using member_id = 20684701 as created_by

-- ============================================================================
-- PLAY FEATURES
-- ============================================================================
INSERT INTO feature_testing (name, description, status, category, icon, route, created_by) VALUES
(
  'Simulator Builder',
  'Build and customize simulator courses with hole-by-hole details, par values, and teebox data',
  'coming-soon',
  'Play',
  'Target',
  '/simulator-builder',
  20684701
),
(
  'Simulator Booking',
  'Reserve simulator bays and manage booking schedules for your club',
  'coming-soon',
  'Play',
  'Target',
  '/simulator-booking',
  20684701
);

-- ============================================================================
-- COMPETE FEATURES
-- ============================================================================
INSERT INTO feature_testing (name, description, status, category, icon, route, created_by) VALUES
(
  'Captain Dashboard',
  'Manage your team, set lineups, and coordinate with players for league matches',
  'coming-soon',
  'Compete',
  'Trophy',
  '/captain-dashboard',
  20684701
),
(
  'League Scoring',
  'Submit match scores and track results for your league competitions',
  'coming-soon',
  'Compete',
  'Trophy',
  '/league-scoring',
  20684701
),
(
  'League Standings',
  'View league tables, division rankings, and team performance statistics',
  'coming-soon',
  'Compete',
  'Trophy',
  '/league-standings/1',
  20684701
),
(
  'Challenges',
  'Participate in skill-based challenges and compete with other members',
  'coming-soon',
  'Compete',
  'Trophy',
  '/challenges',
  20684701
),
(
  'Event Signups',
  'Register for club events, tournaments, and special competitions',
  'coming-soon',
  'Compete',
  'Trophy',
  '/signups',
  20684701
),
(
  'Player Availability',
  'Set your availability for upcoming league matches and team events',
  'coming-soon',
  'Compete',
  'Trophy',
  '/player/availability',
  20684701
),
(
  'Team View',
  'View your team roster, statistics, and performance history',
  'coming-soon',
  'Compete',
  'Trophy',
  '/player/team',
  20684701
);

-- ============================================================================
-- ADMIN FEATURES
-- ============================================================================
INSERT INTO feature_testing (name, description, status, category, icon, route, created_by) VALUES
(
  'Admin Dashboard',
  'Central hub for all administrative functions and system management',
  'coming-soon',
  'Admin',
  'Settings',
  '/admin',
  20684701
),
(
  'User Tracking',
  'Monitor user activity, account claims, and engagement metrics',
  'coming-soon',
  'Admin',
  'Settings',
  '/user-tracking',
  20684701
),
(
  'Club Management',
  'Manage club settings, associations, and member relationships',
  'coming-soon',
  'Admin',
  'Settings',
  '/admin/club-management',
  20684701
),
(
  'Tournament Management',
  'Create and manage tournaments, formats, and registration rules',
  'coming-soon',
  'Admin',
  'Settings',
  '/tournament-management',
  20684701
),
(
  'League Management',
  'Set up leagues, divisions, schedules, and scoring formats',
  'coming-soon',
  'Admin',
  'Settings',
  '/admin/league-management',
  20684701
),
(
  'Permissions Management',
  'Control user roles and access permissions across the platform',
  'coming-soon',
  'Admin',
  'Settings',
  '/admin/permissions',
  20684701
);

SELECT 'Feature testing seed data inserted successfully' as status;
