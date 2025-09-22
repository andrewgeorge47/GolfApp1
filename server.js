// server.js
require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Storage } = require('@google-cloud/storage');

const app = express();
const port = process.env.PORT || 3001;

// PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// CORS configuration for production
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://play.nngolf.co', 'https://trackmansucks.com', 'https://www.trackmansucks.com']
    : ['http://localhost:8000', 'http://localhost:3000'],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

// JWT middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
}

// Test route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// List tournaments (for tournaments page and management)
app.get('/api/tournaments', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM tournaments ORDER BY COALESCE(week_start_date, start_date) DESC NULLS LAST, id DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error('Error listing tournaments:', err);
    res.status(500).json({ error: 'Failed to list tournaments' });
  }
});

// Available tournaments route (consolidated)
app.get('/api/tournaments/available', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM tournaments
       WHERE (COALESCE(registration_open, false) = true OR status IN ('open','active'))
       AND (registration_deadline IS NULL OR registration_deadline >= CURRENT_DATE)
       ORDER BY COALESCE(week_start_date, start_date) DESC NULLS LAST, id DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching available tournaments:', err);
    res.status(500).json({ error: 'Failed to fetch available tournaments' });
  }
});

// Note: General tournament route moved to end of file to avoid conflicts with specific routes

// Cleanup endpoint for testing data
app.post('/api/cleanup-weekly-test-data', async (req, res) => {
  try {
    console.log('Starting cleanup of weekly test data for tournament 19...');
    
    // Delete old weekly leaderboard entries
    const leaderboardResult = await pool.query(
      'DELETE FROM weekly_leaderboards WHERE tournament_id = 19 AND week_start_date = $1',
      ['2025-07-21']
    );
    console.log(`Deleted ${leaderboardResult.rowCount} weekly leaderboard entries`);
    
    // Delete old weekly matches
    const matchesResult = await pool.query(
      'DELETE FROM weekly_matches WHERE tournament_id = 19 AND week_start_date = $1',
      ['2025-07-21']
    );
    console.log(`Deleted ${matchesResult.rowCount} weekly matches`);
    
    // Delete old weekly scorecards
    const scorecardsResult = await pool.query(
      'DELETE FROM weekly_scorecards WHERE tournament_id = 19 AND week_start_date = $1',
      ['2025-07-21']
    );
    console.log(`Deleted ${scorecardsResult.rowCount} weekly scorecards`);
    
    res.json({ 
      success: true, 
      message: 'Cleanup completed successfully!',
      deleted: {
        leaderboardEntries: leaderboardResult.rowCount,
        matches: matchesResult.rowCount,
        scorecards: scorecardsResult.rowCount
      }
    });
    
  } catch (error) {
    console.error('Error during cleanup:', error);
    res.status(500).json({ error: 'Cleanup failed', details: error.message });
  }
});

// Cleanup endpoint for current week corrupted data
app.post('/api/cleanup-current-week-data', async (req, res) => {
  try {
    console.log('Starting cleanup of corrupted weekly data for tournament 19, week 2025-08-04...');
    
    // Delete corrupted weekly matches for the current week
    const matchesResult = await pool.query(
      'DELETE FROM weekly_matches WHERE tournament_id = 19 AND week_start_date = $1',
      ['2025-08-04']
    );
    console.log(`Deleted ${matchesResult.rowCount} corrupted weekly matches`);
    
    // Delete weekly leaderboard entries for the current week (will be recalculated)
    const leaderboardResult = await pool.query(
      'DELETE FROM weekly_leaderboards WHERE tournament_id = 19 AND week_start_date = $1',
      ['2025-08-04']
    );
    console.log(`Deleted ${leaderboardResult.rowCount} weekly leaderboard entries`);
    
    res.json({ 
      success: true, 
      message: 'Cleanup completed successfully! The weekly matches and leaderboard will be recalculated automatically.',
      deleted: {
        matches: matchesResult.rowCount,
        leaderboardEntries: leaderboardResult.rowCount
      }
    });
    
  } catch (error) {
    console.error('Error during cleanup:', error);
    res.status(500).json({ error: 'Cleanup failed', details: error.message });
  }
});

// Test endpoint to manually trigger calculateWeeklyMatches
app.post('/api/test-calculate-matches', async (req, res) => {
  try {
    console.log('Manually testing calculateWeeklyMatches for tournament 19, week 2025-08-04...');
    
    // Clear the cache first
    const cacheKey = getWeeklyMatchCacheKey(19, '2025-08-04');
    weeklyMatchCache.delete(cacheKey);
    console.log('Cleared cache for tournament 19, week 2025-08-04');
    
    // Manually call the function
    await calculateWeeklyMatches(19, '2025-08-04');
    
    // Check what was created
    const matchesResult = await pool.query(
      'SELECT COUNT(*) as match_count FROM weekly_matches WHERE tournament_id = 19 AND week_start_date = $1',
      ['2025-08-04']
    );
    
    const sampleMatch = await pool.query(
      'SELECT * FROM weekly_matches WHERE tournament_id = 19 AND week_start_date = $1 LIMIT 1',
      ['2025-08-04']
    );
    
    res.json({ 
      success: true, 
      message: 'calculateWeeklyMatches executed manually',
      results: {
        totalMatches: matchesResult.rows[0]?.match_count || 0,
        sampleMatch: sampleMatch.rows[0] || null
      }
    });
    
  } catch (error) {
    console.error('Error testing calculateWeeklyMatches:', error);
    res.status(500).json({ error: 'Test failed', details: error.message });
  }
});

// Database setup endpoint
app.post('/api/setup-database', async (req, res) => {
  try {
    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        member_id SERIAL PRIMARY KEY,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email_address VARCHAR(255) UNIQUE,
        club VARCHAR(100),
        role VARCHAR(50) DEFAULT 'player',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create league_settings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS league_settings (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL DEFAULT 'Weekly Match Play League',
        description TEXT,
        min_matches INTEGER DEFAULT 3,
        scoring_rules JSONB DEFAULT '{"win": 3, "tie": 1, "loss": 0}',
        status VARCHAR(50) DEFAULT 'active',
        tournament_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add tournament_date column if it doesn't exist (migration)
    try {
      await pool.query('ALTER TABLE league_settings ADD COLUMN IF NOT EXISTS tournament_date DATE');
    } catch (migrationErr) {
      console.log('Migration note:', migrationErr.message);
    }

    // Create league_participants table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS league_participants (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(member_id),
        status VARCHAR(50) DEFAULT 'active',
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id)
      )
    `);

    // Create matches table
    await pool.query(`DROP TABLE IF EXISTS matches CASCADE`);
    await pool.query(`
      CREATE TABLE matches (
        id SERIAL PRIMARY KEY,
        player1_id INTEGER REFERENCES users(member_id),
        player2_id INTEGER REFERENCES users(member_id),
        scores JSONB NOT NULL,
        winner VARCHAR(255),
        match_date DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create user_profiles table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_profiles (
        user_id INTEGER REFERENCES users(member_id) PRIMARY KEY,
        total_matches INTEGER DEFAULT 0,
        wins INTEGER DEFAULT 0,
        losses INTEGER DEFAULT 0,
        ties INTEGER DEFAULT 0,
        total_points INTEGER DEFAULT 0,
        win_rate DECIMAL(5,2) DEFAULT 0.00,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert default league settings if none exist
    const settingsCheck = await pool.query('SELECT COUNT(*) FROM league_settings');
    if (parseInt(settingsCheck.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO league_settings (name, description, min_matches, scoring_rules)
        VALUES ('Weekly Match Play League', '3-hole match play league', 3, '{"win": 3, "tie": 1, "loss": 0}')
      `);
    }

    // Add password_hash column if it doesn't exist (migration, compatible with all PostgreSQL versions)
    try {
      const colCheck = await pool.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name='users' AND column_name='password_hash'
      `);
      if (colCheck.rows.length === 0) {
        await pool.query('ALTER TABLE users ADD COLUMN password_hash VARCHAR(255)');
        console.log('Added password_hash column to users table.');
      }
    } catch (migrationErr) {
      console.log('Migration note:', migrationErr.message);
    }

    // Add handicap column if it doesn't exist
    try {
      const handicapCheck = await pool.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name='users' AND column_name='handicap'
      `);
      if (handicapCheck.rows.length === 0) {
        await pool.query('ALTER TABLE users ADD COLUMN handicap INTEGER DEFAULT 0');
        console.log('Added handicap column to users table.');
      }
    } catch (migrationErr) {
      console.log('Migration note:', migrationErr.message);
    }

    // Create course_records table
    console.log('About to create course_records table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS course_records (
        id SERIAL PRIMARY KEY,
        course_id INTEGER REFERENCES simulator_courses_combined(id),
        club VARCHAR(50), -- NULL for community/global records, club name for club-specific records
        user_id INTEGER REFERENCES users(member_id),
        scorecard_id INTEGER REFERENCES scorecards(id),
        total_strokes INTEGER NOT NULL,
        date_played DATE NOT NULL,
        is_current BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(course_id, club)
      )
    `);
    console.log('Course records table ready.');

    // Populate course_records with existing best scores
    try {
      const { rows: existingRecords } = await pool.query('SELECT COUNT(*) FROM course_records');
      if (parseInt(existingRecords[0].count) === 0) {
        console.log('Populating course_records table with existing best scores...');
        
        // Insert community records (global best scores)
        await pool.query(`
          INSERT INTO course_records (course_id, club, user_id, scorecard_id, total_strokes, date_played)
          SELECT 
            s.course_id,
            NULL as club,
            s.user_id,
            s.id as scorecard_id,
            s.total_strokes,
            s.date_played
          FROM scorecards s
          INNER JOIN (
            SELECT 
              course_id,
              MIN(total_strokes) as best_score
            FROM scorecards 
            WHERE course_id IS NOT NULL AND round_type = 'sim'
            GROUP BY course_id
          ) best_scores ON s.course_id = best_scores.course_id 
            AND s.total_strokes = best_scores.best_score
            AND s.round_type = 'sim'
          ON CONFLICT (course_id, club) DO NOTHING
        `);

        // Insert club records (best scores per club)
        await pool.query(`
          INSERT INTO course_records (course_id, club, user_id, scorecard_id, total_strokes, date_played)
          SELECT 
            s.course_id,
            u.club,
            s.user_id,
            s.id as scorecard_id,
            s.total_strokes,
            s.date_played
          FROM scorecards s
          INNER JOIN users u ON s.user_id = u.member_id
          INNER JOIN (
            SELECT 
              s2.course_id,
              u2.club,
              MIN(s2.total_strokes) as best_score
            FROM scorecards s2
            INNER JOIN users u2 ON s2.user_id = u2.member_id
            WHERE s2.course_id IS NOT NULL AND s2.round_type = 'sim' AND u2.club IS NOT NULL
            GROUP BY s2.course_id, u2.club
          ) best_scores ON s.course_id = best_scores.course_id 
            AND u.club = best_scores.club
            AND s.total_strokes = best_scores.best_score
            AND s.round_type = 'sim'
          ON CONFLICT (course_id, club) DO NOTHING
        `);

        console.log('Course records populated successfully');
      }
    } catch (courseRecordsErr) {
      console.log('Course records migration note:', courseRecordsErr.message);
    }

    res.json({ 
      success: true, 
      message: 'Database tables created successfully',
      tables: ['league_settings', 'league_participants', 'matches', 'user_profiles']
    });
  } catch (err) {
    console.error('Error setting up database:', err);
    res.status(500).json({ error: 'Failed to setup database', details: err.message });
  }
});

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM users ORDER BY member_id');
    res.json(rows);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Create new user (admin only)
app.post('/api/users', authenticateToken, async (req, res) => {
  // Check if user is admin
  if (req.user?.role?.toLowerCase() !== 'admin') {
    return res.status(403).json({ error: 'Only admins can create users' });
  }
  
  const { member_id, first_name, last_name, email_address, club, role, handicap } = req.body;
  
  // Validate required fields
  if (!member_id || !first_name || !last_name || !email_address || !club) {
    return res.status(400).json({ error: 'Missing required fields: member_id, first_name, last_name, email_address, club' });
  }
  
  try {
    // Check if user already exists
    const existingUser = await pool.query('SELECT member_id FROM users WHERE member_id = $1 OR email_address = $2', [member_id, email_address]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'User with this member_id or email already exists' });
    }
    
    // Insert new user
    const { rows } = await pool.query(
      `INSERT INTO users (member_id, first_name, last_name, email_address, club, role, handicap) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [member_id, first_name, last_name, email_address, club, role || 'member', handicap || 0]
    );
    
    res.status(201).json(transformUserData(rows[0]));
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Delete user (admin only)
app.delete('/api/users/:id', authenticateToken, async (req, res) => {
  // Check if user is admin
  if (req.user?.role?.toLowerCase() !== 'admin') {
    return res.status(403).json({ error: 'Only admins can delete users' });
  }
  
  const { id } = req.params;
  
  try {
    // Check if user exists
    const existingUser = await pool.query('SELECT member_id, first_name, last_name FROM users WHERE member_id = $1', [id]);
    if (existingUser.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check for dependencies before deleting
    const dependencies = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM scorecards WHERE user_id = $1) as scorecards_count,
        (SELECT COUNT(*) FROM participation WHERE user_member_id = $1) as participation_count,
        (SELECT COUNT(*) FROM league_participants WHERE user_id = $1) as league_participants_count,
        (SELECT COUNT(*) FROM registration_form_responses WHERE user_member_id = $1) as registration_responses_count,
        (SELECT COUNT(*) FROM course_records WHERE user_id = $1) as course_records_count
    `, [id]);
    
    const deps = dependencies.rows[0];
    const totalDeps = parseInt(deps.scorecards_count) + parseInt(deps.participation_count) + 
                     parseInt(deps.league_participants_count) + parseInt(deps.registration_responses_count) + 
                     parseInt(deps.course_records_count);
    
    if (totalDeps > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete user. User has associated data that must be removed first.',
        details: {
          scorecards: parseInt(deps.scorecards_count),
          tournament_participation: parseInt(deps.participation_count),
          league_participation: parseInt(deps.league_participants_count),
          registration_responses: parseInt(deps.registration_responses_count),
          course_records: parseInt(deps.course_records_count)
        }
      });
    }
    
    // Delete the user
    await pool.query('DELETE FROM users WHERE member_id = $1', [id]);
    
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Update user profile
app.put('/api/users/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { first_name, last_name, email, club, handicap, role } = req.body;
  
  // Check if user is admin (only admins can update roles)
  if (role && req.user?.role?.toLowerCase() !== 'admin') {
    return res.status(403).json({ error: 'Only admins can update user roles' });
  }
  
  try {
    let query, params;
    
    if (role) {
      // Update including role
      query = `UPDATE users SET first_name = $1, last_name = $2, email_address = $3, club = $4, handicap = $5, role = $6 WHERE member_id = $7 RETURNING *`;
      params = [first_name, last_name, email, club, handicap, role, id];
    } else {
      // Update without role
      query = `UPDATE users SET first_name = $1, last_name = $2, email_address = $3, club = $4, handicap = $5 WHERE member_id = $6 RETURNING *`;
      params = [first_name, last_name, email, club, handicap, id];
    }
    
    const { rows } = await pool.query(query, params);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(transformUserData(rows[0]));
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Get all players (users participating in tournaments)
app.get('/api/players', async (req, res) => {
  try {
    // For now, return all users as potential players
    // Later this can be filtered by participation status
    const { rows } = await pool.query('SELECT * FROM users ORDER BY member_id');
    res.json(rows);
  } catch (err) {
    console.error('Error fetching players:', err);
    res.status(500).json({ error: 'Failed to fetch players' });
  }
});

// Get league settings
app.get('/api/league/settings', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM league_settings ORDER BY id DESC LIMIT 1');
    res.json(rows[0] || {});
  } catch (err) {
    console.error('Error fetching league settings:', err);
    res.status(500).json({ error: 'Failed to fetch league settings' });
  }
});

// Update league settings
app.put('/api/league/settings', async (req, res) => {
  const { name, description, min_matches, scoring_rules, status, tournament_date } = req.body;
  try {
    // First check if settings exist
    const checkResult = await pool.query('SELECT COUNT(*) as count FROM league_settings');
    const settingsExist = parseInt(checkResult.rows[0].count) > 0;
    
    let result;
    if (settingsExist) {
      // Update existing settings
      const { rows } = await pool.query(
        `UPDATE league_settings SET name = $1, description = $2, min_matches = $3, scoring_rules = $4, status = $5, tournament_date = $6, created_at = CURRENT_TIMESTAMP RETURNING *`,
        [name, description, min_matches, scoring_rules, status, tournament_date]
      );
      result = rows[0];
    } else {
      // Create new settings
      const { rows } = await pool.query(
        `INSERT INTO league_settings (name, description, min_matches, scoring_rules, status, tournament_date, created_at) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP) RETURNING *`,
        [name, description, min_matches, scoring_rules, status, tournament_date]
      );
      result = rows[0];
    }
    
    res.json(result);
  } catch (err) {
    console.error('Error updating league settings:', err);
    res.status(500).json({ error: 'Failed to update league settings' });
  }
});

// Get league participants
app.get('/api/league/players', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT lp.*, u.first_name, u.last_name, u.club, u.role FROM league_participants lp JOIN users u ON lp.user_id = u.member_id WHERE lp.status = 'active' ORDER BY u.last_name, u.first_name`
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching league players:', err);
    res.status(500).json({ error: 'Failed to fetch league players' });
  }
});

// Add player to league
app.post('/api/league/players', async (req, res) => {
  const { user_id } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO league_participants (user_id, status) VALUES ($1, 'active') ON CONFLICT (user_id) DO UPDATE SET status = 'active', joined_at = CURRENT_TIMESTAMP RETURNING *`,
      [user_id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('Error adding player to league:', err);
    res.status(500).json({ error: 'Failed to add player to league' });
  }
});

// Remove player from league
app.delete('/api/league/players/:userId', async (req, res) => {
  const userId = req.params.userId;
  try {
    await pool.query(
      `UPDATE league_participants SET status = 'removed' WHERE user_id = $1`,
      [userId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Error removing player from league:', err);
    res.status(500).json({ error: 'Failed to remove player from league' });
  }
});

// Get all matches
app.get('/api/matches', async (req, res) => {
  try {
    // First, let's check what columns exist in the matches table
    const { rows } = await pool.query(
      `SELECT m.*, 
              u1.first_name AS player1_first_name, u1.last_name AS player1_last_name, 
              u2.first_name AS player2_first_name, u2.last_name AS player2_last_name 
       FROM matches m 
       JOIN users u1 ON m.player1_id = u1.member_id 
       JOIN users u2 ON m.player2_id = u2.member_id 
       ORDER BY m.match_date DESC, m.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching matches:', err);
    // If the join fails, just return the basic match data
    try {
      const { rows } = await pool.query('SELECT * FROM matches ORDER BY created_at DESC');
      res.json(rows);
    } catch (innerErr) {
      console.error('Error fetching basic matches:', innerErr);
      res.status(500).json({ error: 'Failed to fetch matches' });
    }
  }
});

// Add a match
app.post('/api/matches', async (req, res) => {
  const { player1_id, player2_id, scores, winner, match_date } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO matches (player1_id, player2_id, scores, winner, match_date) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [player1_id, player2_id, scores, winner, match_date]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('Error adding match:', err);
    res.status(500).json({ error: 'Failed to add match' });
  }
});

// Update a match
app.put('/api/matches/:matchId', async (req, res) => {
  const matchId = req.params.matchId;
  const { player1_id, player2_id, scores, winner, match_date } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE matches SET player1_id = $1, player2_id = $2, scores = $3, winner = $4, match_date = $5 WHERE id = $6 RETURNING *`,
      [player1_id, player2_id, scores, winner, match_date, matchId]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Match not found' });
    }
    
    res.json(rows[0]);
  } catch (err) {
    console.error('Error updating match:', err);
    res.status(500).json({ error: 'Failed to update match' });
  }
});

// Delete a match
app.delete('/api/matches/:matchId', async (req, res) => {
  const matchId = req.params.matchId;
  try {
    const { rows } = await pool.query(
      `DELETE FROM matches WHERE id = $1 RETURNING *`,
      [matchId]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Match not found' });
    }
    
    res.json({ success: true, message: 'Match deleted successfully' });
  } catch (err) {
    console.error('Error deleting match:', err);
    res.status(500).json({ error: 'Failed to delete match' });
  }
});

// Get leaderboard
app.get('/api/leaderboard', async (req, res) => {
  try {
    const { tournament_id } = req.query;
    
    let usersQuery, recentMatchesQuery;
    
    if (tournament_id) {
      // Tournament-specific leaderboard
      usersQuery = `
        SELECT u.member_id, u.first_name, u.last_name, u.club, u.role,
               COALESCE(up.total_matches, 0) as total_matches,
               COALESCE(up.wins, 0) as wins,
               COALESCE(up.losses, 0) as losses,
               COALESCE(up.ties, 0) as ties,
               COALESCE(up.total_points, 0) as total_points,
               COALESCE(up.win_rate, 0) as win_rate
        FROM users u
        LEFT JOIN user_profiles up ON u.member_id = up.user_id
        WHERE u.member_id IN (
          SELECT DISTINCT player1_id FROM tournament_matches WHERE tournament_id = $1
          UNION
          SELECT DISTINCT player2_id FROM tournament_matches WHERE tournament_id = $1
        )
        ORDER BY up.total_points DESC NULLS LAST, up.win_rate DESC NULLS LAST, u.last_name, u.first_name
      `;
      
      recentMatchesQuery = `
        SELECT tm.*, 
               u1.first_name as player1_first_name, u1.last_name as player1_last_name,
               u2.first_name as player2_first_name, u2.last_name as player2_last_name,
               w.first_name as winner_first_name, w.last_name as winner_last_name,
               t.name as tournament_name
        FROM tournament_matches tm
        JOIN users u1 ON tm.player1_id = u1.member_id
        JOIN users u2 ON tm.player2_id = u2.member_id
        LEFT JOIN users w ON tm.winner_id = w.member_id
        JOIN tournaments t ON tm.tournament_id = t.id
        WHERE tm.tournament_id = $1 AND tm.status = 'completed'
        ORDER BY tm.created_at DESC
        LIMIT 10
      `;
    } else {
      // Global leaderboard (all tournaments)
      usersQuery = `
        SELECT u.member_id, u.first_name, u.last_name, u.club, u.role,
               COALESCE(up.total_matches, 0) as total_matches,
               COALESCE(up.wins, 0) as wins,
               COALESCE(up.losses, 0) as losses,
               COALESCE(up.ties, 0) as ties,
               COALESCE(up.total_points, 0) as total_points,
               COALESCE(up.win_rate, 0) as win_rate
        FROM users u
        LEFT JOIN user_profiles up ON u.member_id = up.user_id
        ORDER BY up.total_points DESC NULLS LAST, up.win_rate DESC NULLS LAST, u.last_name, u.first_name
      `;
      
      recentMatchesQuery = `
        SELECT tm.*, 
               u1.first_name as player1_first_name, u1.last_name as player1_last_name,
               u2.first_name as player2_first_name, u2.last_name as player2_last_name,
               w.first_name as winner_first_name, w.last_name as winner_last_name,
               t.name as tournament_name
        FROM tournament_matches tm
        JOIN users u1 ON tm.player1_id = u1.member_id
        JOIN users u2 ON tm.player2_id = u2.member_id
        LEFT JOIN users w ON tm.winner_id = w.member_id
        JOIN tournaments t ON tm.tournament_id = t.id
        WHERE tm.status = 'completed'
        ORDER BY tm.created_at DESC
        LIMIT 10
      `;
    }

    // Execute queries
    const usersResult = tournament_id 
      ? await pool.query(usersQuery, [tournament_id])
      : await pool.query(usersQuery);
    
    const recentMatchesResult = tournament_id
      ? await pool.query(recentMatchesQuery, [tournament_id])
      : await pool.query(recentMatchesQuery);

    const users = usersResult.rows;
    const recentMatches = recentMatchesResult.rows;

    // Calculate additional stats
    const totalPlayers = users.length;
    const totalMatches = users.reduce((sum, user) => sum + user.total_matches, 0);
    const totalPoints = users.reduce((sum, user) => sum + user.total_points, 0);

    res.json({
      players: users,
      recentMatches,
      stats: {
        totalPlayers,
        totalMatches,
        totalPoints,
        averagePoints: totalPlayers > 0 ? Math.round(totalPoints / totalPlayers) : 0
      },
      type: tournament_id ? 'tournament' : 'global',
      tournament_id: tournament_id || null
    });
  } catch (err) {
    console.error('Error fetching leaderboard:', err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});
// Get tournament settings
app.get('/api/settings', async (req, res) => {
  try {
    // Return default settings for now
    res.json({
      tournamentName: 'Golf League Tournament',
      minMatches: 3,
      notes: 'Welcome to the Golf League!'
    });
  } catch (err) {
    console.error('Error fetching settings:', err);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Get tournament status
app.get('/api/tournament/status', async (req, res) => {
  try {
    // Get basic stats for tournament status
    const usersResult = await pool.query('SELECT COUNT(*) as total_users FROM users');
    const totalUsers = parseInt(usersResult.rows[0].total_users);
    
    res.json({
      totalUsers,
      totalPlayers: 0, // Will be updated when players table is implemented
      totalMatches: 0, // Will be updated when matches table is implemented
      activeMatches: 0,
      status: totalUsers > 0 ? 'ready' : 'waiting'
    });
  } catch (err) {
    console.error('Error fetching tournament status:', err);
    res.status(500).json({ error: 'Failed to fetch tournament status' });
  }
});

// Get recent activity
app.get('/api/activity', async (req, res) => {
  try {
    // For now, return empty array until activity tracking is implemented
    res.json([]);
  } catch (err) {
    console.error('Error fetching activity:', err);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

// Register endpoint (optional)
app.post('/api/auth/register', async (req, res) => {
  const { first_name, last_name, email, password, club, role } = req.body;
  if (!email || !password || !first_name || !last_name) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (first_name, last_name, email_address, club, role, password_hash) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [first_name, last_name, email, club || '', role || 'player', hashedPassword]
    );
    const user = result.rows[0];

    // Immediately create the user profile
    await pool.query(
      'INSERT INTO user_profiles (user_id, total_matches, wins, losses, ties, total_points, win_rate, last_updated) VALUES ($1, 0, 0, 0, 0, 0, 0, NOW())',
      [user.member_id]
    );

    const token = jwt.sign({ member_id: user.member_id, email_address: user.email_address, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: transformUserData(user) });
  } catch (err) {
    if (err.code === '23505') {
      res.status(409).json({ error: 'Email already exists' });
    } else {
      console.error('Error registering user:', err);
      res.status(500).json({ error: 'Failed to register user' });
    }
  }
});

// Check if email exists for account claiming
app.post('/api/auth/check-email', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  try {
    const result = await pool.query('SELECT member_id, first_name, last_name, email_address, club, role, password_hash FROM users WHERE email_address = $1', [email]);
    const user = result.rows[0];
    if (!user) {
      return res.status(404).json({ error: 'No account found with this email address' });
    }
    
    // Return user info but don't include password_hash
    const { password_hash, ...userInfo } = user;
    res.json({ 
      user: userInfo,
      hasPassword: !!password_hash 
    });
  } catch (err) {
    console.error('Error checking email:', err);
    res.status(500).json({ error: 'Failed to check email' });
  }
});

// Set password for existing user (account claiming)
app.post('/api/auth/claim-account', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }
  
  try {
    // Check if user exists
    const userCheck = await pool.query('SELECT member_id, password_hash FROM users WHERE email_address = $1', [email]);
    const user = userCheck.rows[0];
    
    if (!user) {
      return res.status(404).json({ error: 'No account found with this email address' });
    }
    
    if (user.password_hash) {
      return res.status(409).json({ error: 'Account already has a password set' });
    }
    
    // Hash and set the password
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'UPDATE users SET password_hash = $1 WHERE member_id = $2 RETURNING member_id, first_name, last_name, email_address, club, role',
      [hashedPassword, user.member_id]
    );
    
    const updatedUser = result.rows[0];
    
    // Create user profile if it doesn't exist
    await pool.query(
      'INSERT INTO user_profiles (user_id, total_matches, wins, losses, ties, total_points, win_rate, last_updated) VALUES ($1, 0, 0, 0, 0, 0, 0, NOW()) ON CONFLICT (user_id) DO NOTHING',
      [user.member_id]
    );
    
    // Generate token and log user in
    const token = jwt.sign({ member_id: updatedUser.member_id, email_address: updatedUser.email_address, role: updatedUser.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: transformUserData(updatedUser) });
  } catch (err) {
    console.error('Error claiming account:', err);
    res.status(500).json({ error: 'Failed to claim account' });
  }
});

// Reset password for existing user
app.post('/api/auth/reset-password', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }
  
  try {
    // Check if user exists and has a password
    const userCheck = await pool.query('SELECT member_id, password_hash FROM users WHERE email_address = $1', [email]);
    const user = userCheck.rows[0];
    
    if (!user) {
      return res.status(404).json({ error: 'No account found with this email address' });
    }
    
    if (!user.password_hash) {
      return res.status(400).json({ error: 'Account has not been claimed yet. Please use "Claim Account" instead.' });
    }
    
    // Hash and update the password
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'UPDATE users SET password_hash = $1 WHERE member_id = $2 RETURNING member_id, first_name, last_name, email_address, club, role',
      [hashedPassword, user.member_id]
    );
    
    const updatedUser = result.rows[0];
    
    // Generate token and log user in
    const token = jwt.sign({ member_id: updatedUser.member_id, email_address: updatedUser.email_address, role: updatedUser.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: transformUserData(updatedUser) });
  } catch (err) {
    console.error('Error resetting password:', err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Missing email or password' });
  }
  try {
    const result = await pool.query('SELECT * FROM users WHERE email_address = $1', [email]);
    const user = result.rows[0];
    if (!user || !user.password_hash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Check if user is deactivated
    if (user.role === 'Deactivated') {
      return res.status(403).json({ error: 'Account has been deactivated. Please contact an administrator.' });
    }
    
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ member_id: user.member_id, email_address: user.email_address, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: transformUserData(user) });
  } catch (err) {
    console.error('Error logging in:', err);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// Get current user info
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE member_id = $1', [req.user.member_id]);
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user: transformUserData(user) });
  } catch (err) {
    console.error('Error fetching user info:', err);
    res.status(500).json({ error: 'Failed to fetch user info' });
  }
});

// Setup password for existing users
app.post('/api/auth/setup-password', authenticateToken, async (req, res) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }
  
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'UPDATE users SET password_hash = $1 WHERE member_id = $2 RETURNING *',
      [hashedPassword, req.user.member_id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ message: 'Password set successfully' });
  } catch (err) {
    console.error('Error setting password:', err);
    res.status(500).json({ error: 'Failed to set password' });
  }
});

// Debug route to check database connection and users
app.get('/api/debug-db', async (req, res) => {
  console.log('DEBUG ROUTE HIT');
  try {
    const db = await pool.query('SELECT current_database()');
    const users = await pool.query('SELECT member_id, first_name, email_address, role, club FROM users LIMIT 5');
    const scorecards = await pool.query('SELECT COUNT(*) as count FROM scorecards');
    const userCount = await pool.query('SELECT COUNT(*) as count FROM users');
    console.log('Debug response:', {
      db: db.rows[0],
      userCount: userCount.rows[0],
      scorecardCount: scorecards.rows[0],
      sampleUser: users.rows[0]
    });
    res.json({ 
      db: db.rows[0], 
      users: users.rows,
      userCount: userCount.rows[0],
      scorecardCount: scorecards.rows[0]
    });
  } catch (err) {
    console.error('Debug endpoint error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Migration: Add type column to tournaments if missing
(async () => {
  try {
    const colCheck = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name='tournaments' AND column_name='type'
    `);
    if (colCheck.rows.length === 0) {
      await pool.query("ALTER TABLE tournaments ADD COLUMN type VARCHAR(50) DEFAULT 'tournament'");
      console.log('Added type column to tournaments table.');
    }
  } catch (migrationErr) {
    console.log('Migration note:', migrationErr.message);
  }
})();

// Migration: Add enhanced tournament formation fields
(async () => {
  try {
    const columns = [
      { name: 'description', type: 'TEXT' },
      { name: 'registration_deadline', type: 'DATE' },
      { name: 'max_participants', type: 'INTEGER' },
      { name: 'min_participants', type: 'INTEGER DEFAULT 2' },
      { name: 'tournament_format', type: 'VARCHAR(50) DEFAULT \'match_play\'' },
      { name: 'status', type: 'VARCHAR(50) DEFAULT \'draft\'' },
      { name: 'registration_open', type: 'BOOLEAN DEFAULT true' },
      { name: 'entry_fee', type: 'NUMERIC(10,2) DEFAULT 0' },
      { name: 'location', type: 'VARCHAR(255)' },
      { name: 'course', type: 'VARCHAR(255)' },
      { name: 'rules', type: 'TEXT' },
      { name: 'created_by', type: 'INTEGER REFERENCES users(member_id)' },
      { name: 'created_at', type: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' },
      { name: 'updated_at', type: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' }
    ];

    for (const column of columns) {
      const colCheck = await pool.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name='tournaments' AND column_name='${column.name}'
      `);
      if (colCheck.rows.length === 0) {
        await pool.query(`ALTER TABLE tournaments ADD COLUMN ${column.name} ${column.type}`);
        console.log(`Added ${column.name} column to tournaments table.`);
      }
    }

    // Add indexes for better performance
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status)',
      'CREATE INDEX IF NOT EXISTS idx_tournaments_registration_deadline ON tournaments(registration_deadline)',
      'CREATE INDEX IF NOT EXISTS idx_tournaments_start_date ON tournaments(start_date)',
      'CREATE INDEX IF NOT EXISTS idx_tournaments_created_by ON tournaments(created_by)'
    ];

    for (const index of indexes) {
      try {
        await pool.query(index);
      } catch (indexErr) {
        console.log(`Index creation note: ${indexErr.message}`);
      }
    }

    console.log('Tournament formation migration completed.');
  } catch (migrationErr) {
    console.log('Tournament formation migration note:', migrationErr.message);
  }
})();

// Create a new tournament
app.post('/api/tournaments', async (req, res) => {
  const { 
    name, 
    description,
    start_date, 
    end_date, 
    registration_deadline,
    max_participants,
    min_participants,
    tournament_format,
    status,
    registration_open,
    entry_fee,
    location,
    course,
    course_id,
    gspro_course,
    gspro_course_id,
    trackman_course,
    trackman_course_id,
    rules,
    notes, 
    type,
    club_restriction,
    team_size,
    hole_configuration,
    tee,
    pins,
    putting_gimme,
    elevation,
    stimp,
    mulligan,
    game_play,
    firmness,
    wind,
    handicap_enabled,
    has_registration_form,
    registration_form_template,
    registration_form_data,
    payment_organizer,
    payment_organizer_name,
    payment_venmo_url,
    created_by
  } = req.body;
  
  if (!name) return res.status(400).json({ error: 'Name is required' });
  
  try {
    // Calculate the week start date (Monday) from the tournament start date
    const weekStartDate = start_date ? getWeekStartFromDate(start_date) : null;
    
    const { rows } = await pool.query(
      `INSERT INTO tournaments (
        name, description, start_date, end_date, registration_deadline,
        max_participants, min_participants, tournament_format, status,
        registration_open, entry_fee, location, course, course_id, gspro_course, gspro_course_id, 
        trackman_course, trackman_course_id, rules, notes, type, 
        club_restriction, team_size, hole_configuration, tee, pins, putting_gimme, elevation,
        stimp, mulligan, game_play, firmness, wind, handicap_enabled, has_registration_form,
        registration_form_template, registration_form_data, payment_organizer, payment_organizer_name,
        payment_venmo_url, created_by, week_start_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42) RETURNING *`,
      [
        name, description, start_date, end_date, registration_deadline,
        max_participants, min_participants || 2, tournament_format || 'match_play', 
        status || 'draft', registration_open !== false, entry_fee || 0,
        location, course, course_id, gspro_course, gspro_course_id, trackman_course, trackman_course_id,
        rules, notes, type || 'tournament', 
        club_restriction || 'open', team_size, hole_configuration || '18', tee || 'Red',
        pins || 'Friday', putting_gimme || '8', elevation || 'Course', stimp || '11',
        mulligan || 'No', game_play || 'Force Realistic', firmness || 'Normal',
        wind || 'None', handicap_enabled || false, has_registration_form || false,
        registration_form_template, registration_form_data, payment_organizer, payment_organizer_name,
        payment_venmo_url, created_by, weekStartDate
      ]
    );
    
    console.log('Tournament created with week_start_date:', weekStartDate);
    res.json(rows[0]);
  } catch (err) {
    console.error('Error creating tournament:', err);
    res.status(500).json({ error: 'Failed to create tournament' });
  }
});

// Note: Duplicate endpoint removed - consolidated with the main tournaments endpoint above

// Update a tournament
app.put('/api/tournaments/:id', async (req, res) => {
  const { id } = req.params;
  const { 
    name, 
    description,
    start_date, 
    end_date, 
    registration_deadline,
    max_participants,
    min_participants,
    tournament_format,
    status,
    registration_open,
    entry_fee,
    location,
    course,
    course_id,
    gspro_course,
    gspro_course_id,
    trackman_course,
    trackman_course_id,
    rules,
    notes, 
    type,
    club_restriction,
    team_size,
    hole_configuration,
    tee,
    pins,
    putting_gimme,
    elevation,
    stimp,
    mulligan,
    game_play,
    firmness,
    wind,
    handicap_enabled,
    has_registration_form,
    registration_form_template,
    registration_form_data,
    payment_organizer,
    payment_organizer_name,
    payment_venmo_url,
    created_by
  } = req.body;
  
  try {
    // Calculate the week start date (Monday) from the tournament start date
    const weekStartDate = start_date ? getWeekStartFromDate(start_date) : null;
    
    const { rows } = await pool.query(
      `UPDATE tournaments SET 
        name = $1, description = $2, start_date = $3, end_date = $4, 
        registration_deadline = $5, max_participants = $6, min_participants = $7,
        tournament_format = $8, status = $9, registration_open = $10,
        entry_fee = $11, location = $12, course = $13, course_id = $14, 
        gspro_course = $15, gspro_course_id = $16, trackman_course = $17, trackman_course_id = $18,
        rules = $19, notes = $20, type = $21, club_restriction = $22, team_size = $23, hole_configuration = $24,
        tee = $25, pins = $26, putting_gimme = $27, elevation = $28, stimp = $29,
        mulligan = $30, game_play = $31, firmness = $32, wind = $33, handicap_enabled = $34,
        has_registration_form = $35, registration_form_template = $36, registration_form_data = $37,
        payment_organizer = $38, payment_organizer_name = $39, payment_venmo_url = $40,
        created_by = $41, week_start_date = $42, updated_at = CURRENT_TIMESTAMP
       WHERE id = $43 RETURNING *`,
      [
        name, description, start_date, end_date, registration_deadline,
        max_participants, min_participants, tournament_format, status,
        registration_open, entry_fee, location, course, course_id, 
        gspro_course, gspro_course_id, trackman_course, trackman_course_id,
        rules, notes, type, club_restriction, team_size, hole_configuration, tee, pins, putting_gimme, elevation,
        stimp, mulligan, game_play, firmness, wind, handicap_enabled, has_registration_form,
        registration_form_template, registration_form_data, payment_organizer, payment_organizer_name,
        payment_venmo_url, created_by, weekStartDate, id
      ]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Tournament not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Error updating tournament:', err);
    res.status(500).json({ error: 'Failed to update tournament' });
  }
});

// Delete a tournament
app.delete('/api/tournaments/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query('DELETE FROM tournaments WHERE id = $1 RETURNING *', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Tournament not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting tournament:', err);
    res.status(500).json({ error: 'Failed to delete tournament' });
  }
});

// Get tournament participants
app.get('/api/tournaments/:id/participants', async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT p.*, u.first_name, u.last_name, u.email_address, u.club, u.role,
              u.handicap, u.sim_handicap, u.grass_handicap,
              rfr.form_data as registration_form_data
       FROM participation p 
       JOIN users u ON p.user_member_id = u.member_id 
       LEFT JOIN registration_form_responses rfr ON p.tournament_id = rfr.tournament_id AND p.user_member_id = rfr.user_member_id
       WHERE p.tournament_id = $1 
       ORDER BY u.last_name, u.first_name`,
      [id]
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching tournament participants:', err);
    res.status(500).json({ error: 'Failed to fetch tournament participants' });
  }
});

// Get tournament weekly scorecards
app.get('/api/tournaments/:id/weekly-scorecards', async (req, res) => {
  const { id } = req.params;
  const { override_week } = req.query;
  
  try {
    const period = await resolveTournamentPeriod(id);
    const weekDate = normalizeDateYMD(override_week) || period.week_start_date;
    
    const { rows } = await pool.query(
      `SELECT wsc.*, u.first_name, u.last_name, u.email_address, u.club
       FROM weekly_scorecards wsc
       JOIN users u ON wsc.user_id = u.member_id
       WHERE wsc.tournament_id = $1 AND wsc.week_start_date = $2
       ORDER BY u.last_name, u.first_name`,
      [id, weekDate]
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching tournament weekly scorecards:', err);
    res.status(500).json({ error: 'Failed to fetch tournament weekly scorecards' });
  }
});

// Register user for tournament
app.post('/api/tournaments/:id/register', async (req, res) => {
  const { id } = req.params;
  const { user_id } = req.body;
  
  if (!user_id) {
    return res.status(400).json({ error: 'User ID is required' });
  }
  
  try {
    // Check if user exists
    const userCheck = await pool.query(
      'SELECT member_id FROM users WHERE member_id = $1',
      [user_id]
    );
    
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get tournament details to check registration rules
    const tournamentResult = await pool.query(
      'SELECT * FROM tournaments WHERE id = $1',
      [id]
    );
    
    if (tournamentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    
    const tournament = tournamentResult.rows[0];
    
    // Check if tournament is accepting registrations
    if (tournament.status === 'completed' || tournament.status === 'cancelled') {
      return res.status(400).json({ error: 'Tournament is not accepting registrations' });
    }
    
    // Check if registration is open
    if (tournament.registration_open === false) {
      return res.status(400).json({ error: 'Registration is closed for this tournament' });
    }
    
    // Check registration deadline
    if (tournament.registration_deadline) {
      const deadlineDate = new Date(tournament.registration_deadline);
      const currentDate = new Date();
      
      // Compare dates at day level (ignore time)
      const deadlineDay = new Date(deadlineDate.getFullYear(), deadlineDate.getMonth(), deadlineDate.getDate());
      const currentDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
      
      if (currentDay > deadlineDay) {
        return res.status(400).json({ error: 'Registration deadline has passed' });
      }
    }
    
    // Check if user is already registered
    const existingCheck = await pool.query(
      'SELECT * FROM participation WHERE tournament_id = $1 AND user_member_id = $2',
      [id, user_id]
    );
    
    if (existingCheck.rows.length > 0) {
      return res.status(409).json({ error: 'User is already registered for this tournament' });
    }
    
    // Check participant limits
    if (tournament.max_participants) {
      const participantCount = await pool.query(
        'SELECT COUNT(*) as count FROM participation WHERE tournament_id = $1',
        [id]
      );
      
      if (parseInt(participantCount.rows[0].count) >= tournament.max_participants) {
        return res.status(400).json({ error: 'Tournament has reached maximum participant limit' });
      }
    }
    
    const { rows } = await pool.query(
      'INSERT INTO participation (tournament_id, user_member_id) VALUES ($1, $2) RETURNING *',
      [id, user_id]
    );
    
    // Get user details for response
    const userResult = await pool.query(
      'SELECT member_id, first_name, last_name, email_address, club, role FROM users WHERE member_id = $1',
      [user_id]
    );
    
    res.json({
      ...rows[0],
      user: userResult.rows[0]
    });
  } catch (err) {
    console.error('Error registering user for tournament:', err);
    console.error('Error code:', err.code);
    console.error('Error detail:', err.detail);
    if (err.code === '23505') {
      res.status(409).json({ error: 'User is already registered for this tournament' });
    } else {
      res.status(500).json({ error: 'Failed to register user for tournament' });
    }
  }
});
// Register user for tournament with form data
app.post('/api/tournaments/:id/register-with-form', async (req, res) => {
  const { id } = req.params;
  const { user_id, form_data } = req.body;
  
  if (!user_id) {
    return res.status(400).json({ error: 'User ID is required' });
  }
  
  try {
    // Check if user exists
    const userCheck = await pool.query(
      'SELECT member_id FROM users WHERE member_id = $1',
      [user_id]
    );
    
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get tournament details to check registration rules
    const tournamentResult = await pool.query(
      'SELECT * FROM tournaments WHERE id = $1',
      [id]
    );
    
    if (tournamentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    
    const tournament = tournamentResult.rows[0];
    
    // Check if tournament has registration form enabled
    if (!tournament.has_registration_form) {
      return res.status(400).json({ error: 'Tournament does not require registration form' });
    }
    
    // Check if tournament is accepting registrations
    if (tournament.status === 'completed' || tournament.status === 'cancelled') {
      return res.status(400).json({ error: 'Tournament is not accepting registrations' });
    }
    
    // Check if registration is open
    if (tournament.registration_open === false) {
      return res.status(400).json({ error: 'Registration is closed for this tournament' });
    }
    
    // Check registration deadline
    if (tournament.registration_deadline) {
      const deadlineDate = new Date(tournament.registration_deadline);
      const currentDate = new Date();
      
      // Compare dates at day level (ignore time)
      const deadlineDay = new Date(deadlineDate.getFullYear(), deadlineDate.getMonth(), deadlineDate.getDate());
      const currentDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
      
      if (currentDay > deadlineDay) {
        return res.status(400).json({ error: 'Registration deadline has passed' });
      }
    }
    
    // Check if user is already registered
    const existingCheck = await pool.query(
      'SELECT * FROM participation WHERE tournament_id = $1 AND user_member_id = $2',
      [id, user_id]
    );
    
    if (existingCheck.rows.length > 0) {
      return res.status(409).json({ error: 'User is already registered for this tournament' });
    }
    
    // Check participant limits
    if (tournament.max_participants) {
      const participantCount = await pool.query(
        'SELECT COUNT(*) as count FROM participation WHERE tournament_id = $1',
        [id]
      );
      
      if (parseInt(participantCount.rows[0].count) >= tournament.max_participants) {
        return res.status(400).json({ error: 'Tournament has reached maximum participant limit' });
      }
    }
    
    // Register user for tournament
    const { rows } = await pool.query(
      'INSERT INTO participation (tournament_id, user_member_id) VALUES ($1, $2) RETURNING *',
      [id, user_id]
    );
    
    // Store registration form data
    await pool.query(
      'INSERT INTO registration_form_responses (tournament_id, user_member_id, form_data) VALUES ($1, $2, $3)',
      [id, user_id, JSON.stringify(form_data)]
    );
    
    // Get user details for response
    const userResult = await pool.query(
      'SELECT member_id, first_name, last_name, email_address, club, role FROM users WHERE member_id = $1',
      [user_id]
    );
    
    res.json({
      ...rows[0],
      user: userResult.rows[0],
      form_data: form_data
    });
  } catch (err) {
    console.error('Error registering user for tournament with form:', err);
    console.error('Error code:', err.code);
    console.error('Error detail:', err.detail);
    if (err.code === '23505') {
      res.status(409).json({ error: 'User is already registered for this tournament' });
    } else {
      res.status(500).json({ error: 'Failed to register user for tournament' });
    }
  }
});

// Unregister user from tournament
app.delete('/api/tournaments/:id/unregister/:userId', async (req, res) => {
  const { id, userId } = req.params;
  
  try {
    // Start a transaction to ensure both operations succeed or fail together
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Remove user from tournament participation
      const participationResult = await client.query(
        'DELETE FROM participation WHERE tournament_id = $1 AND user_member_id = $2 RETURNING *',
        [id, userId]
      );
      
      if (participationResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Registration not found' });
      }
      
      // Also remove any registration form responses
      await client.query(
        'DELETE FROM registration_form_responses WHERE tournament_id = $1 AND user_member_id = $2',
        [id, userId]
      );
      
      await client.query('COMMIT');
      
      res.json({ success: true, message: 'User unregistered successfully and form data removed' });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error unregistering user from tournament:', err);
    res.status(500).json({ error: 'Failed to unregister user from tournament' });
  }
});

// Get registration form responses for a tournament
app.get('/api/tournaments/:id/registration-responses', async (req, res) => {
  const { id } = req.params;
  
  try {
    const { rows } = await pool.query(
      `SELECT rfr.*, u.first_name, u.last_name, u.email_address, u.club
       FROM registration_form_responses rfr
       JOIN users u ON rfr.user_member_id = u.member_id
       WHERE rfr.tournament_id = $1
       ORDER BY rfr.submitted_at DESC`,
      [id]
    );
    
    res.json(rows);
  } catch (err) {
    console.error('Error fetching registration form responses:', err);
    res.status(500).json({ error: 'Failed to fetch registration form responses' });
  }
});

// Create check-ins table if it doesn't exist
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS check_ins (
        id SERIAL PRIMARY KEY,
        tournament_id INTEGER REFERENCES tournaments(id) ON DELETE CASCADE,
        user_member_id INTEGER REFERENCES users(member_id) ON DELETE CASCADE,
        check_in_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        check_out_time TIMESTAMP,
        status VARCHAR(50) DEFAULT 'checked_in',
        notes TEXT,
        UNIQUE(tournament_id, user_member_id)
      )
    `);
    console.log('Check-ins table ready.');
  } catch (migrationErr) {
    console.log('Migration note:', migrationErr.message);
  }
})();

// Get tournament check-ins
app.get('/api/tournaments/:id/check-ins', async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT c.*, u.first_name, u.last_name, u.email_address, u.club 
       FROM check_ins c 
       JOIN users u ON c.user_member_id = u.member_id 
       WHERE c.tournament_id = $1 
       ORDER BY c.check_in_time DESC`,
      [id]
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching tournament check-ins:', err);
    res.status(500).json({ error: 'Failed to fetch tournament check-ins' });
  }
});

// Check in user for tournament
app.post('/api/tournaments/:id/check-in', async (req, res) => {
  const { id } = req.params;
  const { user_id, notes } = req.body;
  
  if (!user_id) {
    return res.status(400).json({ error: 'User ID is required' });
  }
  
  try {
    // Check if user is registered for tournament
    const registrationCheck = await pool.query(
      'SELECT * FROM participation WHERE tournament_id = $1 AND user_member_id = $2',
      [id, user_id]
    );
    
    if (registrationCheck.rows.length === 0) {
      return res.status(400).json({ error: 'User must be registered for tournament before checking in' });
    }
    
    // Check if already checked in
    const existingCheck = await pool.query(
      'SELECT * FROM check_ins WHERE tournament_id = $1 AND user_member_id = $2',
      [id, user_id]
    );
    
    let result;
    
    if (existingCheck.rows.length > 0) {
      const existingRecord = existingCheck.rows[0];
      
      // If user is already checked in, return error
      if (existingRecord.status === 'checked_in') {
        return res.status(409).json({ error: 'User is already checked in for this tournament' });
      }
      
      // If user was checked out, re-check them in
      if (existingRecord.status === 'checked_out') {
        result = await pool.query(
          `UPDATE check_ins 
           SET status = 'checked_in', check_out_time = NULL, notes = $1
           WHERE tournament_id = $2 AND user_member_id = $3 
           RETURNING *`,
          [notes || existingRecord.notes, id, user_id]
        );
      }
    } else {
      // Create new check-in record
      result = await pool.query(
        'INSERT INTO check_ins (tournament_id, user_member_id, notes) VALUES ($1, $2, $3) RETURNING *',
        [id, user_id, notes || null]
      );
    }
    
    // Get user details for response
    const userResult = await pool.query(
      'SELECT member_id, first_name, last_name, email_address, club FROM users WHERE member_id = $1',
      [user_id]
    );
    
    res.json({
      ...result.rows[0],
      user: userResult.rows[0]
    });
  } catch (err) {
    console.error('Error checking in user:', err);
    res.status(500).json({ error: 'Failed to check in user' });
  }
});

// Check out user from tournament
app.put('/api/tournaments/:id/check-out/:userId', async (req, res) => {
  const { id, userId } = req.params;
  
  try {
    const { rows } = await pool.query(
      `UPDATE check_ins 
       SET check_out_time = CURRENT_TIMESTAMP, status = 'checked_out' 
       WHERE tournament_id = $1 AND user_member_id = $2 
       RETURNING *`,
      [id, userId]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Check-in not found' });
    }
    
    res.json(rows[0]);
  } catch (err) {
    console.error('Error checking out user:', err);
    res.status(500).json({ error: 'Failed to check out user' });
  }
});

// Get tournament statistics
app.get('/api/tournaments/:id/stats', async (req, res) => {
  const { id } = req.params;
  try {
    // Get participant count
    const participantResult = await pool.query(
      'SELECT COUNT(*) as total_participants FROM participation WHERE tournament_id = $1',
      [id]
    );
    
    // Get checked in count
    const checkedInResult = await pool.query(
      'SELECT COUNT(*) as checked_in_count FROM check_ins WHERE tournament_id = $1 AND status = $2',
      [id, 'checked_in']
    );
    
    // Get checked out count
    const checkedOutResult = await pool.query(
      'SELECT COUNT(*) as checked_out_count FROM check_ins WHERE tournament_id = $1 AND status = $2',
      [id, 'checked_out']
    );
    
    res.json({
      total_participants: parseInt(participantResult.rows[0].total_participants),
      checked_in_count: parseInt(checkedInResult.rows[0].checked_in_count),
      checked_out_count: parseInt(checkedOutResult.rows[0].checked_out_count)
    });
  } catch (err) {
    console.error('Error fetching tournament stats:', err);
    res.status(500).json({ error: 'Failed to fetch tournament statistics' });
  }
});

// Create tournament_matches table if it doesn't exist
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tournament_matches (
        id SERIAL PRIMARY KEY,
        tournament_id INTEGER REFERENCES tournaments(id) ON DELETE CASCADE,
        player1_id INTEGER REFERENCES users(member_id) ON DELETE CASCADE,
        player2_id INTEGER REFERENCES users(member_id) ON DELETE CASCADE,
        match_number INTEGER,
        status VARCHAR(50) DEFAULT 'pending',
        winner_id INTEGER REFERENCES users(member_id),
        scores JSONB,
        match_date DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        group_number INTEGER,
        UNIQUE(tournament_id, player1_id, player2_id)
      )
    `);
    
    // Add group_number column if it doesn't exist
    await pool.query(`
      ALTER TABLE tournament_matches 
      ADD COLUMN IF NOT EXISTS group_number INTEGER
    `);
    console.log('Tournament matches table ready.');
  } catch (migrationErr) {
    console.log('Migration note:', migrationErr.message);
  }
})();

// Create new weekly scoring system tables
(async () => {
  try {
    // Create weekly_scorecards table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS weekly_scorecards (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(member_id) ON DELETE CASCADE,
        tournament_id INTEGER REFERENCES tournaments(id) ON DELETE CASCADE,
        week_start_date DATE NOT NULL,
        hole_scores JSONB NOT NULL,
        total_score INTEGER NOT NULL,
        is_live BOOLEAN DEFAULT false,
        group_id VARCHAR(50),
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, tournament_id, week_start_date)
      )
    `);
    console.log('Weekly scorecards table ready.');

    // Create weekly_matches table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS weekly_matches (
        id SERIAL PRIMARY KEY,
        tournament_id INTEGER REFERENCES tournaments(id) ON DELETE CASCADE,
        week_start_date DATE NOT NULL,
        player1_id INTEGER REFERENCES users(member_id) ON DELETE CASCADE,
        player2_id INTEGER REFERENCES users(member_id) ON DELETE CASCADE,
        player1_scorecard_id INTEGER REFERENCES weekly_scorecards(id) ON DELETE CASCADE,
        player2_scorecard_id INTEGER REFERENCES weekly_scorecards(id) ON DELETE CASCADE,
        
        hole_points_player1 DECIMAL(5,2) DEFAULT 0,
        hole_points_player2 DECIMAL(5,2) DEFAULT 0,
        
        round1_points_player1 DECIMAL(5,2) DEFAULT 0,
        round1_points_player2 DECIMAL(5,2) DEFAULT 0,
        round2_points_player1 DECIMAL(5,2) DEFAULT 0,
        round2_points_player2 DECIMAL(5,2) DEFAULT 0,
        round3_points_player1 DECIMAL(5,2) DEFAULT 0,
        round3_points_player2 DECIMAL(5,2) DEFAULT 0,
        
        match_winner_id INTEGER REFERENCES users(member_id),
        match_live_bonus_player1 DECIMAL(5,2) DEFAULT 0,
        match_live_bonus_player2 DECIMAL(5,2) DEFAULT 0,
        
        total_points_player1 DECIMAL(5,2) DEFAULT 0,
        total_points_player2 DECIMAL(5,2) DEFAULT 0,
        
        player1_scores JSONB,
        player2_scores JSONB,
        
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(tournament_id, week_start_date, player1_id, player2_id)
      )
    `);
    console.log('Weekly matches table ready.');

    // Add missing columns to weekly_matches table if they don't exist
    await pool.query(`
      ALTER TABLE weekly_matches 
      ADD COLUMN IF NOT EXISTS player1_scores JSONB,
      ADD COLUMN IF NOT EXISTS player2_scores JSONB
    `);
    console.log('Weekly matches table columns updated.');

    // Create weekly_leaderboards table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS weekly_leaderboards (
        id SERIAL PRIMARY KEY,
        tournament_id INTEGER REFERENCES tournaments(id) ON DELETE CASCADE,
        week_start_date DATE NOT NULL,
        user_id INTEGER REFERENCES users(member_id) ON DELETE CASCADE,
        
        total_hole_points DECIMAL(5,2) DEFAULT 0,
        total_round_points DECIMAL(5,2) DEFAULT 0,
        total_match_bonus DECIMAL(5,2) DEFAULT 0,
        total_score DECIMAL(5,2) DEFAULT 0,
        
        matches_played INTEGER DEFAULT 0,
        matches_won INTEGER DEFAULT 0,
        matches_tied INTEGER DEFAULT 0,
        matches_lost INTEGER DEFAULT 0,
        
        live_matches_played INTEGER DEFAULT 0,
        
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(tournament_id, week_start_date, user_id)
      )
    `);
    console.log('Weekly leaderboards table ready.');

    // Add scoring configuration to tournaments table
    await pool.query(`
      ALTER TABLE tournaments 
      ADD COLUMN IF NOT EXISTS scoring_format VARCHAR(50) DEFAULT 'traditional',
      ADD COLUMN IF NOT EXISTS live_match_bonus_enabled BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS max_live_matches_per_week INTEGER DEFAULT 3
    `);
    console.log('Tournament scoring configuration columns added.');

    // Create indexes for performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_weekly_scorecards_tournament_week ON weekly_scorecards(tournament_id, week_start_date);
      CREATE INDEX IF NOT EXISTS idx_weekly_scorecards_user_week ON weekly_scorecards(user_id, week_start_date);
      CREATE INDEX IF NOT EXISTS idx_weekly_matches_tournament_week ON weekly_matches(tournament_id, week_start_date);
      CREATE INDEX IF NOT EXISTS idx_weekly_leaderboards_tournament_week ON weekly_leaderboards(tournament_id, week_start_date);
    `);
    console.log('Weekly scoring system indexes created.');

  } catch (migrationErr) {
    console.log('Weekly scoring system migration note:', migrationErr.message);
  }
})();

// Get tournament matches
app.get('/api/tournaments/:id/matches', async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT tm.*, 
              u1.first_name AS player1_first_name, u1.last_name AS player1_last_name,
              u2.first_name AS player2_first_name, u2.last_name AS player2_last_name,
              w.first_name AS winner_first_name, w.last_name AS winner_last_name
       FROM tournament_matches tm 
       JOIN users u1 ON tm.player1_id = u1.member_id 
       JOIN users u2 ON tm.player2_id = u2.member_id 
       LEFT JOIN users w ON tm.winner_id = w.member_id
       WHERE tm.tournament_id = $1 
       ORDER BY tm.match_number`,
      [id]
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching tournament matches:', err);
    res.status(500).json({ error: 'Failed to fetch tournament matches' });
  }
});

// Generate matches for tournament
app.post('/api/tournaments/:id/generate-matches', async (req, res) => {
  const { id } = req.params;
  const { format = 'optimized', minMatchesPerPlayer = 3 } = req.body;
  
  try {
    // Get checked-in players for this tournament
    const checkedInResult = await pool.query(
      `SELECT c.user_member_id, u.first_name, u.last_name 
       FROM check_ins c 
       JOIN users u ON c.user_member_id = u.member_id 
       WHERE c.tournament_id = $1 AND c.status = 'checked_in'
       ORDER BY u.last_name, u.first_name`,
      [id]
    );
    
    const players = checkedInResult.rows;
    
    if (players.length < 2) {
      return res.status(400).json({ error: 'Need at least 2 checked-in players to generate matches' });
    }
    
    // Clear existing matches for this tournament
    await pool.query('DELETE FROM tournament_matches WHERE tournament_id = $1', [id]);
    
    let matches = [];
    
    if (format === 'optimized') {
      // Generate optimized matches with minimum match requirement
      matches = generateOptimizedMatches(players, minMatchesPerPlayer);
    } else if (format === 'round_robin') {
      // Generate single round-robin tournament
      matches = generateRoundRobinMatches(players, 1);
    } else if (format === 'single_elimination') {
      // Generate single elimination bracket
      matches = generateSingleEliminationMatches(players);
    } else if (format === 'random_pairs') {
      // Generate random pairs (single round)
      matches = generateRandomPairs(players);
    } else if (format === 'par3_match_play') {
      // Generate 3-hole match play matches (4-player groups)
      matches = generatePar3MatchPlayMatches(players);
    }
    
    // Insert matches into database
    if (matches.length > 0) {
      console.log(`Generating matches for format: ${format}`);
      console.log(`Sample match data:`, matches.slice(0, 2));
      
      const matchValues = matches.map((match, index) => {
        const groupNumber = match.group_number ? `, ${match.group_number}` : '';
        return `(${id}, ${match.player1_id}, ${match.player2_id}, ${index + 1}, 'pending'${groupNumber})`;
      }).join(', ');
      
      const columns = format === 'par3_match_play' 
        ? '(tournament_id, player1_id, player2_id, match_number, status, group_number)'
        : '(tournament_id, player1_id, player2_id, match_number, status)';
      
      console.log(`Using columns: ${columns}`);
      console.log(`Sample match values:`, matchValues.split(',').slice(0, 2));
      
      await pool.query(`
        INSERT INTO tournament_matches ${columns}
        VALUES ${matchValues}
      `);
    }
    
    // Calculate match distribution stats
    const playerMatchCounts = {};
    matches.forEach(match => {
      playerMatchCounts[match.player1_id] = (playerMatchCounts[match.player1_id] || 0) + 1;
      playerMatchCounts[match.player2_id] = (playerMatchCounts[match.player2_id] || 0) + 1;
    });
    
    const matchStats = {
      total_matches: matches.length,
      players_count: players.length,
      min_matches_per_player: Math.min(...Object.values(playerMatchCounts)),
      max_matches_per_player: Math.max(...Object.values(playerMatchCounts)),
      average_matches_per_player: (matches.length * 2) / players.length
    };
    
    res.json({ 
      success: true, 
      message: `Generated ${matches.length} matches for ${players.length} players`,
      matches_count: matches.length,
      players_count: players.length,
      stats: matchStats
    });
    
  } catch (err) {
    console.error('Error generating matches:', err);
    res.status(500).json({ error: 'Failed to generate matches' });
  }
});

// Create tournament match
app.post('/api/tournaments/:id/matches', async (req, res) => {
  const { id } = req.params;
  const { player1_id, player2_id, status = 'pending', scores, winner_id } = req.body;
  
  console.log('Creating tournament match - Tournament ID:', id);
  console.log('Request body:', req.body);
  console.log('Parsed data:', { player1_id, player2_id, status, scores, winner_id });
  
  try {
    // Validate that the tournament exists
    const tournamentCheck = await pool.query(
      'SELECT id FROM tournaments WHERE id = $1',
      [id]
    );
    
    if (tournamentCheck.rows.length === 0) {
      console.log('Tournament not found:', id);
      return res.status(404).json({ error: 'Tournament not found' });
    }
    
    console.log('Tournament found, getting next match number...');
    
    // Get the next match number for this tournament
    const matchNumberResult = await pool.query(
      'SELECT COALESCE(MAX(match_number), 0) + 1 as next_match_number FROM tournament_matches WHERE tournament_id = $1',
      [id]
    );
    const nextMatchNumber = matchNumberResult.rows[0].next_match_number;
    
    console.log('Next match number:', nextMatchNumber);
    console.log('About to insert match with data:', {
      tournament_id: id,
      player1_id,
      player2_id,
      match_number: nextMatchNumber,
      status,
      scores: JSON.stringify(scores),
      winner_id
    });
    
    // Create the match
    const { rows } = await pool.query(
      `INSERT INTO tournament_matches 
       (tournament_id, player1_id, player2_id, match_number, status, scores, winner_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [id, player1_id, player2_id, nextMatchNumber, status, scores, winner_id]
    );
    
    console.log('Match created successfully:', rows[0]);
    res.json(rows[0]);
  } catch (err) {
    console.error('Error creating tournament match:', err);
    console.error('Error details:', err.message);
    console.error('Error stack:', err.stack);
    res.status(500).json({ error: 'Failed to create tournament match', details: err.message });
  }
});

// Update match result
app.put('/api/tournaments/:id/matches/:matchId', async (req, res) => {
  const { id, matchId } = req.params;
  const { winner_id, scores, status = 'completed' } = req.body;
  
  try {
    // Get the match details first
    const matchResult = await pool.query(
      'SELECT * FROM tournament_matches WHERE id = $1 AND tournament_id = $2',
      [matchId, id]
    );
    
    if (matchResult.rows.length === 0) {
      return res.status(404).json({ error: 'Match not found' });
    }
    
    const match = matchResult.rows[0];
    
    // Update the match
    const { rows } = await pool.query(
      `UPDATE tournament_matches 
       SET winner_id = $1, scores = $2, status = $3 
       WHERE id = $4 AND tournament_id = $5 
       RETURNING *`,
      [winner_id, scores, status, matchId, id]
    );
    
    // If match is being completed and has a winner, update user profiles
    if (status === 'completed' && winner_id && match.status !== 'completed') {
      // Get scoring rules from league settings
      const settingsResult = await pool.query('SELECT scoring_rules FROM league_settings ORDER BY id DESC LIMIT 1');
      const scoringRules = settingsResult.rows[0]?.scoring_rules || { win: 3, tie: 1, loss: 0 };
      
      // Update user profiles
      await updateUserProfilesAfterMatch(match.player1_id, match.player2_id, winner_id, scoringRules);
    }
    
    res.json(rows[0]);
  } catch (err) {
    console.error('Error updating match:', err);
    res.status(500).json({ error: 'Failed to update match' });
  }
});

// Clean up old cache entries (older than 1 hour)
setInterval(() => {
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  for (const [key, value] of weeklyMatchCache.entries()) {
    if (value.timestamp < oneHourAgo) {
      weeklyMatchCache.delete(key);
    }
  }
}, 30 * 60 * 1000); // Clean up every 30 minutes

// Function to clean up duplicate matches
async function cleanupDuplicateMatches(tournamentId) {
  try {
    console.log(`=== CLEANING UP DUPLICATE MATCHES ===`);
    console.log(`Tournament ID: ${tournamentId}`);
    
    // Find duplicate matches (same tournament, week, and player pair)
    const duplicateResult = await pool.query(
      `SELECT tournament_id, week_start_date, player1_id, player2_id, COUNT(*) as match_count
       FROM weekly_matches 
       WHERE tournament_id = $1
       GROUP BY tournament_id, week_start_date, player1_id, player2_id
       HAVING COUNT(*) > 1
       ORDER BY week_start_date, player1_id, player2_id`,
      [tournamentId]
    );
    
    if (duplicateResult.rows.length === 0) {
      console.log('No duplicate matches found');
      return;
    }
    
    console.log(`Found ${duplicateResult.rows.length} duplicate match groups`);
    
    for (const duplicate of duplicateResult.rows) {
      console.log(`Processing duplicates for tournament ${duplicate.tournament_id}, week ${duplicate.week_start_date}, players ${duplicate.player1_id} vs ${duplicate.player2_id}`);
      
      // Get all matches for this group, ordered by creation time
      const matchesResult = await pool.query(
        `SELECT id, created_at 
         FROM weekly_matches 
         WHERE tournament_id = $1 AND week_start_date = $2 
         AND player1_id = $3 AND player2_id = $4
         ORDER BY created_at ASC`,
        [duplicate.tournament_id, duplicate.week_start_date, duplicate.player1_id, duplicate.player2_id]
      );
      
      const matches = matchesResult.rows;
      console.log(`Found ${matches.length} matches for this group`);
      
      // Keep the first (oldest) match, delete the rest
      if (matches.length > 1) {
        const matchesToDelete = matches.slice(1); // All except the first
        const deleteIds = matchesToDelete.map(m => m.id);
        
        console.log(`Keeping match ID ${matches[0].id}, deleting IDs: ${deleteIds.join(', ')}`);
        
        const deleteResult = await pool.query(
          `DELETE FROM weekly_matches WHERE id = ANY($1)`,
          [deleteIds]
        );
        
        console.log(`Deleted ${deleteResult.rowCount} duplicate matches`);
      }
    }
    
    console.log(`=== COMPLETED DUPLICATE MATCH CLEANUP ===`);
    
  } catch (err) {
    console.error('Error cleaning up duplicate matches:', err);
  }
}
// Create a new team for a tournament
app.post('/api/tournaments/:id/teams', async (req, res) => {
  const { id } = req.params;
  const { name, captain_id, player_ids = [] } = req.body;
  
  if (!name || !captain_id) {
    return res.status(400).json({ error: 'Team name and captain are required' });
  }
  
  try {
    // Check if tournament exists and is a scramble format
    const tournamentResult = await pool.query(
      'SELECT * FROM tournaments WHERE id = $1',
      [id]
    );
    
    if (tournamentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    
    const tournament = tournamentResult.rows[0];
    if (tournament.tournament_format !== 'scramble') {
      return res.status(400).json({ error: 'Teams can only be created for scramble tournaments' });
    }
    
    // Check if captain is registered for tournament
    const captainCheck = await pool.query(
      'SELECT * FROM participation WHERE tournament_id = $1 AND user_member_id = $2',
      [id, captain_id]
    );
    
    if (captainCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Captain must be registered for the tournament' });
    }
    
    // Check if team name is unique for this tournament
    const nameCheck = await pool.query(
      'SELECT * FROM tournament_teams WHERE tournament_id = $1 AND name = $2',
      [id, name]
    );
    
    if (nameCheck.rows.length > 0) {
      return res.status(409).json({ error: 'Team name already exists for this tournament' });
    }
    
    // Create the team
    const teamResult = await pool.query(
      'INSERT INTO tournament_teams (tournament_id, name, captain_id) VALUES ($1, $2, $3) RETURNING *',
      [id, name, captain_id]
    );
    
    const team = teamResult.rows[0];
    
    // Add captain as team member with is_captain = true
    await pool.query(
      'INSERT INTO team_members (team_id, tournament_id, user_member_id, is_captain) VALUES ($1, $2, $3, true)',
      [team.id, id, captain_id]
    );
    
    // Add other team members (excluding captain)
    if (player_ids.length > 0) {
      const memberIds = player_ids.filter(playerId => playerId !== captain_id);
      if (memberIds.length > 0) {
        const memberValues = memberIds.map(playerId => `(${team.id}, ${id}, ${playerId}, false)`).join(', ');
        await pool.query(
          `INSERT INTO team_members (team_id, tournament_id, user_member_id, is_captain) VALUES ${memberValues}`
        );
      }
    }
    
    // Get complete team data with captain and members
    const completeTeamResult = await pool.query(
      `SELECT 
        tt.*,
        u.first_name as captain_first_name,
        u.last_name as captain_last_name,
        u.club as captain_club
       FROM tournament_teams tt
       JOIN users u ON tt.captain_id = u.member_id
       WHERE tt.id = $1`,
      [team.id]
    );
    
    // Get team members
    const membersResult = await pool.query(
      `SELECT 
        tm.user_member_id,
        u.first_name,
        u.last_name,
        u.club,
        tm.is_captain
       FROM team_members tm
       JOIN users u ON tm.user_member_id = u.member_id
       WHERE tm.team_id = $1 AND tm.is_captain = false
       ORDER BY u.last_name, u.first_name`,
      [team.id]
    );
    
    const completeTeam = {
      ...completeTeamResult.rows[0],
      players: membersResult.rows
    };
    
    res.json(completeTeam);
  } catch (err) {
    console.error('Error creating team:', err);
    res.status(500).json({ error: 'Failed to create team' });
  }
});

// Get all teams for a tournament
app.get('/api/tournaments/:id/teams', async (req, res) => {
  const { id } = req.params;
  
  try {
    // Get teams with captain information and all team members in a single optimized query
    const { rows } = await pool.query(
      `WITH teams_data AS (
        SELECT 
          tt.*,
          captain.first_name as captain_first_name,
          captain.last_name as captain_last_name,
          captain.club as captain_club
         FROM tournament_teams tt
         JOIN users captain ON tt.captain_id = captain.member_id
         WHERE tt.tournament_id = $1
       ),
       team_members_data AS (
         SELECT 
           tm.team_id,
           json_agg(
             json_build_object(
               'user_member_id', tm.user_member_id,
               'first_name', u.first_name,
               'last_name', u.last_name,
               'club', u.club,
               'is_captain', tm.is_captain
             ) ORDER BY tm.is_captain DESC, u.last_name ASC, u.first_name ASC
           ) as players
         FROM team_members tm
         JOIN users u ON tm.user_member_id = u.member_id
         WHERE tm.tournament_id = $1
         GROUP BY tm.team_id
       )
       SELECT 
         td.*,
         COALESCE(tmd.players, '[]'::json) as players
       FROM teams_data td
       LEFT JOIN team_members_data tmd ON td.id = tmd.team_id
       ORDER BY td.name`,
      [id]
    );
    
    res.json(rows);
  } catch (err) {
    console.error('Error fetching teams:', err);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

// Update a team
app.put('/api/tournaments/:id/teams/:teamId', async (req, res) => {
  const { id, teamId } = req.params;
  const { name, captain_id, player_ids = [] } = req.body;
  
  try {
    // Check if team exists
    const teamCheck = await pool.query(
      'SELECT * FROM tournament_teams WHERE id = $1 AND tournament_id = $2',
      [teamId, id]
    );
    
    if (teamCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    // Update team name and captain if provided
    if (name || captain_id) {
      const updateFields = [];
      const updateValues = [];
      let paramCount = 1;
      
      if (name) {
        updateFields.push(`name = $${paramCount}`);
        updateValues.push(name);
        paramCount++;
      }
      
      if (captain_id) {
        updateFields.push(`captain_id = $${paramCount}`);
        updateValues.push(captain_id);
        paramCount++;
      }
      
      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      updateValues.push(teamId);
      
      await pool.query(
        `UPDATE tournament_teams SET ${updateFields.join(', ')} WHERE id = $${paramCount}`,
        updateValues
      );
    }
    
    // Update team members if provided
    if (player_ids.length >= 0) {
      // Remove existing members (but keep captain)
      await pool.query(
        'DELETE FROM team_members WHERE team_id = $1 AND is_captain = false',
        [teamId]
      );
      
      // Add new members (excluding captain)
      const newCaptainId = captain_id || teamCheck.rows[0].captain_id;
      const memberIds = player_ids.filter(playerId => playerId !== newCaptainId);
      
      if (memberIds.length > 0) {
        const memberValues = memberIds.map(playerId => `(${teamId}, ${id}, ${playerId}, false)`).join(', ');
        await pool.query(
          `INSERT INTO team_members (team_id, tournament_id, user_member_id, is_captain) VALUES ${memberValues}`
        );
      }
    }
    
    // Get updated team data with all team members in a single optimized query
    const updatedTeamResult = await pool.query(
      `WITH team_data AS (
        SELECT 
          tt.*,
          captain.first_name as captain_first_name,
          captain.last_name as captain_last_name,
          captain.club as captain_club
         FROM tournament_teams tt
         JOIN users captain ON tt.captain_id = captain.member_id
         WHERE tt.id = $1
       ),
       team_members_data AS (
         SELECT 
           tm.team_id,
           json_agg(
             json_build_object(
               'user_member_id', tm.user_member_id,
               'first_name', u.first_name,
               'last_name', u.last_name,
               'club', u.club,
               'is_captain', tm.is_captain
             ) ORDER BY tm.is_captain DESC, u.last_name ASC, u.first_name ASC
           ) as players
         FROM team_members tm
         JOIN users u ON tm.user_member_id = u.member_id
         WHERE tm.team_id = $1
         GROUP BY tm.team_id
       )
       SELECT 
         td.*,
         COALESCE(tmd.players, '[]'::json) as players
       FROM team_data td
       LEFT JOIN team_members_data tmd ON td.id = tmd.team_id`,
      [teamId]
    );
    
    const updatedTeam = updatedTeamResult.rows[0];
    
    res.json(updatedTeam);
  } catch (err) {
    console.error('Error updating team:', err);
    res.status(500).json({ error: 'Failed to update team' });
  }
});

// Delete a team
app.delete('/api/tournaments/:id/teams/:teamId', async (req, res) => {
  const { id, teamId } = req.params;
  
  try {
    const { rows } = await pool.query(
      'DELETE FROM tournament_teams WHERE id = $1 AND tournament_id = $2 RETURNING *',
      [teamId, id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    res.json({ success: true, message: 'Team deleted successfully' });
  } catch (err) {
    console.error('Error deleting team:', err);
    res.status(500).json({ error: 'Failed to delete team' });
  }
});

// Submit team score
app.post('/api/tournaments/:id/teams/:teamId/score', async (req, res) => {
  const { id, teamId } = req.params;
  const { total_score, hole_scores, submitted_by } = req.body;
  
  if (!total_score || !submitted_by) {
    return res.status(400).json({ error: 'Total score and submitter are required' });
  }
  
  try {
    // Check if team exists and belongs to tournament
    const teamCheck = await pool.query(
      'SELECT * FROM tournament_teams WHERE id = $1 AND tournament_id = $2',
      [teamId, id]
    );
    
    if (teamCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    const team = teamCheck.rows[0];
    
    // Check if submitter is the team captain or an admin
    console.log('Checking user permissions:', { submitted_by, team_captain_id: team.captain_id });
    
    const userCheck = await pool.query(
      'SELECT role FROM users WHERE member_id = $1',
      [submitted_by]
    );
    
    console.log('User check result:', userCheck.rows);
    
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found', submitted_by });
    }
    
    const user = userCheck.rows[0];
    const isAdmin = user.role === 'admin' || user.role === 'Admin';
    const isClubPro = user.role === 'Club Pro';
    const isCaptain = submitted_by === team.captain_id;
    
    console.log('Permission check:', { isAdmin, isClubPro, isCaptain, user_role: user.role });
    
    if (!isAdmin && !isClubPro && !isCaptain) {
      return res.status(403).json({ error: 'Only team captain, admin, or club pro can submit scores' });
    }
    
    // Convert hole_scores from array format to object format for storage
    let holeScoresObject = null;
    if (hole_scores && Array.isArray(hole_scores)) {
      holeScoresObject = {};
      hole_scores.forEach(hole => {
        if (hole.hole && hole.score !== undefined) {
          holeScoresObject[hole.hole] = hole.score;
        }
      });
    } else if (hole_scores && typeof hole_scores === 'object') {
      holeScoresObject = hole_scores;
    }
    
    // Store hole-by-hole scores in tournament_team_scores table
    const teamScoreResult = await pool.query(
      `INSERT INTO tournament_team_scores (team_id, tournament_id, total_score, hole_scores, submitted_by)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (team_id, tournament_id) 
       DO UPDATE SET 
         total_score = $3,
         hole_scores = $4,
         submitted_by = $5,
         submitted_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [teamId, id, total_score, holeScoresObject, submitted_by]
    );
    
    // Update or create team standings
    const standingsResult = await pool.query(
      `INSERT INTO team_standings (tournament_id, team_id, total_score, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (tournament_id, team_id) 
       DO UPDATE SET 
         total_score = $3,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [id, teamId, total_score]
    );
    
    res.json({
      success: true,
      team_id: teamId,
      tournament_id: id,
      total_score: total_score,
      hole_scores: hole_scores,
      standings: standingsResult.rows[0]
    });
  } catch (err) {
    console.error('Error submitting team score:', err);
    console.error('Request body:', req.body);
    console.error('Team ID:', teamId, 'Tournament ID:', id);
    res.status(500).json({ error: 'Failed to submit team score', details: err.message });
  }
});

// Get team scores for a tournament
app.get('/api/tournaments/:id/team-scores', async (req, res) => {
  const { id } = req.params;
  
  try {
    // Get team scores with all team members in a single optimized query
    const { rows } = await pool.query(
      `WITH team_scores AS (
        SELECT 
          tts.*,
          tt.name as team_name,
          captain.first_name as captain_first_name,
          captain.last_name as captain_last_name,
          captain.club as captain_club,
          submitter.first_name as submitted_by_first_name,
          submitter.last_name as submitted_by_last_name
         FROM tournament_team_scores tts
         JOIN tournament_teams tt ON tts.team_id = tt.id
         JOIN users captain ON tt.captain_id = captain.member_id
         JOIN users submitter ON tts.submitted_by = submitter.member_id
         WHERE tts.tournament_id = $1
       ),
       team_members_data AS (
         SELECT 
           tm.team_id,
           tm.tournament_id,
           json_agg(
             json_build_object(
               'user_member_id', tm.user_member_id,
               'first_name', u.first_name,
               'last_name', u.last_name,
               'club', u.club,
               'is_captain', tm.is_captain
             ) ORDER BY tm.is_captain DESC, u.first_name ASC
           ) as players
         FROM team_members tm
         JOIN users u ON tm.user_member_id = u.member_id
         WHERE tm.tournament_id = $1
         GROUP BY tm.team_id, tm.tournament_id
       )
       SELECT 
         ts.*,
         COALESCE(tmd.players, '[]'::json) as players
       FROM team_scores ts
       LEFT JOIN team_members_data tmd ON ts.team_id = tmd.team_id
       ORDER BY ts.total_score ASC, ts.submitted_at ASC`,
      [id]
    );
    
    res.json(rows);
  } catch (err) {
    console.error('Error fetching team scores:', err);
    res.status(500).json({ error: 'Failed to fetch team scores' });
  }
});

// Get detailed team score with hole-by-hole scores
app.get('/api/tournaments/:id/teams/:teamId/score-details', async (req, res) => {
  const { id, teamId } = req.params;
  
  try {
    const { rows } = await pool.query(
      `WITH team_score AS (
        SELECT 
          tts.*,
          tt.name as team_name,
          captain.first_name as captain_first_name,
          captain.last_name as captain_last_name,
          captain.club as captain_club,
          submitter.first_name as submitted_by_first_name,
          submitter.last_name as submitted_by_last_name
         FROM tournament_team_scores tts
         JOIN tournament_teams tt ON tts.team_id = tt.id
         JOIN users captain ON tt.captain_id = captain.member_id
         JOIN users submitter ON tts.submitted_by = submitter.member_id
         WHERE tts.tournament_id = $1 AND tts.team_id = $2
       ),
       team_members_data AS (
         SELECT 
           tm.team_id,
           tm.tournament_id,
           json_agg(
             json_build_object(
               'user_member_id', tm.user_member_id,
               'first_name', u.first_name,
               'last_name', u.last_name,
               'club', u.club,
               'is_captain', tm.is_captain
             ) ORDER BY tm.is_captain DESC, u.first_name ASC
           ) as players
         FROM team_members tm
         JOIN users u ON tm.user_member_id = u.member_id
         WHERE tm.tournament_id = $1 AND tm.team_id = $2
         GROUP BY tm.team_id, tm.tournament_id
       )
       SELECT 
         ts.*,
         COALESCE(tmd.players, '[]'::json) as players
       FROM team_score ts
       LEFT JOIN team_members_data tmd ON ts.team_id = tmd.team_id`,
      [id, teamId]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Team score not found' });
    }
    
    res.json(rows[0]);
  } catch (err) {
    console.error('Error fetching team score details:', err);
    res.status(500).json({ error: 'Failed to fetch team score details' });
  }
});

// Helper function to generate round-robin matches
function generateRoundRobinMatches(players, round) {
  const matches = [];
  const n = players.length;
  
  if (n < 2) return matches;
  
  // Create a list of player IDs
  const playerIds = players.map(p => p.user_member_id).filter(id => id !== null);
  
  // If odd number of players, we'll handle byes differently
  const isOdd = playerIds.length % 2 === 1;
  const workingPlayers = [...playerIds];
  
  if (isOdd) {
    // Add a "bye" player for odd numbers
    workingPlayers.push(null);
  }
  
  const numPlayers = workingPlayers.length;
  const halfSize = numPlayers / 2;
  
  // Generate matches using circle method
  for (let i = 0; i < halfSize; i++) {
    const player1 = workingPlayers[i];
    const player2 = workingPlayers[numPlayers - 1 - i];
    
    // Skip matches with BYE player
    if (player1 !== null && player2 !== null) {
      matches.push({
        player1_id: player1,
        player2_id: player2
      });
    }
  }
  
  return matches;
}

// Helper function to generate single elimination matches
function generateSingleEliminationMatches(players) {
  const matches = [];
  const playerIds = players.map(p => p.user_member_id).filter(id => id !== null);
  
  if (playerIds.length < 2) return matches;
  
  // Shuffle players for random seeding
  const shuffledPlayers = [...playerIds].sort(() => Math.random() - 0.5);
  const numPlayers = shuffledPlayers.length;
  
  // Calculate number of rounds needed
  const rounds = Math.ceil(Math.log2(numPlayers));
  const totalSlots = Math.pow(2, rounds);
  
  // Fill with byes if needed
  while (shuffledPlayers.length < totalSlots) {
    shuffledPlayers.push(null);
  }
  
  // Generate first round matches
  for (let i = 0; i < totalSlots / 2; i++) {
    const player1 = shuffledPlayers[i];
    const player2 = shuffledPlayers[totalSlots - 1 - i];
    
    // Skip matches with BYE player
    if (player1 !== null && player2 !== null) {
      matches.push({
        player1_id: player1,
        player2_id: player2
      });
    }
  }
  
  return matches;
}

// Helper function to generate random pairs
function generateRandomPairs(players) {
  const matches = [];
  const playerIds = players.map(p => p.user_member_id).filter(id => id !== null);
  
  if (playerIds.length < 2) return matches;
  
  // Track match history to avoid duplicates
  const matchHistory = new Set();
  const availablePlayers = [...playerIds];
  
  // Shuffle players for this round
  availablePlayers.sort(() => Math.random() - 0.5);
  
  while (availablePlayers.length >= 2) {
    const player1 = availablePlayers.shift();
    let player2Index = -1;
    
    // Find a player2 that hasn't played against player1
    for (let i = 0; i < availablePlayers.length; i++) {
      const potentialPlayer2 = availablePlayers[i];
      const matchKey1 = `${player1}-${potentialPlayer2}`;
      const matchKey2 = `${potentialPlayer2}-${player1}`;
      
      if (!matchHistory.has(matchKey1) && !matchHistory.has(matchKey2)) {
        player2Index = i;
        break;
      }
    }
    
    // If no unique opponent found, take the first available
    if (player2Index === -1 && availablePlayers.length > 0) {
      player2Index = 0;
    }
    
    if (player2Index !== -1) {
      const player2 = availablePlayers.splice(player2Index, 1)[0];
      
      // Record this match in history
      const matchKey = `${player1}-${player2}`;
      matchHistory.add(matchKey);
      
      matches.push({
        player1_id: player1,
        player2_id: player2
      });
    }
  }
  
  return matches;
}

// New function to generate optimized matches with minimum match requirement
function generateOptimizedMatches(players, minMatchesPerPlayer = 3) {
  const matches = [];
  const playerIds = players.map(p => p.user_member_id).filter(id => id !== null);
  
  if (playerIds.length < 2) return matches;
  
  // Track matches per player and match history
  const playerMatchCounts = {};
  const matchHistory = new Set();
  
  // Initialize player match counts
  playerIds.forEach(id => {
    playerMatchCounts[id] = 0;
  });
  
  // Calculate target total matches based on minMatchesPerPlayer
  const targetTotalMatches = Math.ceil((playerIds.length * minMatchesPerPlayer) / 2);
  
  // Generate matches until we reach the target or can't create more unique matches
  let attempts = 0;
  const maxAttempts = targetTotalMatches * 10; // Allow more attempts for higher match counts
  
  while (matches.length < targetTotalMatches && attempts < maxAttempts) {
    attempts++;
    
    // Find players with least matches
    const sortedPlayers = Object.entries(playerMatchCounts)
      .sort(([,a], [,b]) => a - b)
      .map(([id]) => parseInt(id));
    
    // Try to create a match
    let matchCreated = false;
    
    for (let i = 0; i < sortedPlayers.length - 1; i++) {
      const player1 = sortedPlayers[i];
      
      for (let j = i + 1; j < sortedPlayers.length; j++) {
        const player2 = sortedPlayers[j];
        
        // Check if this match already exists
        const matchKey1 = `${player1}-${player2}`;
        const matchKey2 = `${player2}-${player1}`;
        
        if (!matchHistory.has(matchKey1) && !matchHistory.has(matchKey2)) {
          // Create the match
          matches.push({
            player1_id: player1,
            player2_id: player2
          });
          
          // Update tracking
          matchHistory.add(matchKey1);
          playerMatchCounts[player1]++;
          playerMatchCounts[player2]++;
          matchCreated = true;
          break;
        }
      }
      
      if (matchCreated) break;
    }
    
    // If no match was created, break to prevent infinite loop
    if (!matchCreated) {
      break;
    }
  }
  
  return matches;
}

// Helper function to generate 3-hole match play matches (4-player groups, partial round robin for 5-7)
function generatePar3MatchPlayMatches(players) {
  const matches = [];
  const playerIds = players.map(p => p.user_member_id).filter(id => id !== null);
  if (playerIds.length < 4) {
    // If less than 4 players, fall back to regular match play
    return generateOptimizedMatches(players, 3);
  }
  const shuffledPlayers = [...playerIds].sort(() => Math.random() - 0.5);
  let groups = [];
  let i = 0;
  while (i < shuffledPlayers.length) {
    let remaining = shuffledPlayers.length - i;
    let groupSize = 4;
    if (remaining === 5 || remaining === 6 || remaining === 7) {
      groupSize = remaining;
    } else if (remaining < 4) {
      groupSize = remaining;
    }
    groups.push(shuffledPlayers.slice(i, i + groupSize));
    i += groupSize;
  }
  groups.forEach((group, groupIndex) => {
    const n = group.length;
    if (n <= 4) {
      // Full round robin
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          matches.push({ player1_id: group[i], player2_id: group[j], group_number: groupIndex + 1 });
        }
      }
    } else if (n === 5) {
      // Partial round robin for 5: each player gets 3 matches
      const schedule = [
        [0, 4], [0, 2], [0, 3],
        [1, 2], [1, 3], [1, 4],
        [2, 4], [2, 3]
      ];
      schedule.forEach(([a, b]) => {
        matches.push({ player1_id: group[a], player2_id: group[b], group_number: groupIndex + 1 });
      });
    } else if (n === 6) {
      // Partial round robin for 6: each player gets 3 matches
      const schedule = [
        [0, 1], [0, 2], [0, 3],
        [1, 2], [1, 4], [1, 5],
        [2, 4], [2, 6],
        [3, 4], [3, 5], [3, 6],
        [4, 5], [3, 0],
      ];
      schedule.forEach(([a, b]) => {
        matches.push({ player1_id: group[a], player2_id: group[b], group_number: groupIndex + 1 });
      });
    } else if (n === 7) {
      // Partial round robin for 7: each player gets 3 matches
      const schedule = [
        [0, 1], [0, 2], [0, 3],
        [1, 2], [1, 4], [1, 5],
        [2, 4], [2, 6],
        [3, 4], [3, 5], [3, 6],
        [4, 5], [4, 6],
        [5, 6], [5, 0],
        [6, 1],
      ];
      schedule.forEach(([a, b]) => {
        matches.push({ player1_id: group[a], player2_id: group[b], group_number: groupIndex + 1 });
      });
    }
  });
  return matches;
}
// Helper function to update user profiles after match completion
async function updateUserProfilesAfterMatch(player1Id, player2Id, winnerId, scoringRules) {
  try {
    // Get current profiles or create new ones
    const [profile1Result, profile2Result] = await Promise.all([
      pool.query('SELECT * FROM user_profiles WHERE user_id = $1', [player1Id]),
      pool.query('SELECT * FROM user_profiles WHERE user_id = $1', [player2Id])
    ]);

    let profile1 = profile1Result.rows[0];
    let profile2 = profile2Result.rows[0];

    // Create profiles if they don't exist using ON CONFLICT DO NOTHING
    if (!profile1) {
      await pool.query(
        'INSERT INTO user_profiles (user_id, total_matches, wins, losses, ties, total_points, win_rate) VALUES ($1, 0, 0, 0, 0, 0, 0) ON CONFLICT (user_id) DO NOTHING',
        [player1Id]
      );
      // Re-fetch the profile in case it was created by another concurrent operation
      const updatedProfile1Result = await pool.query('SELECT * FROM user_profiles WHERE user_id = $1', [player1Id]);
      profile1 = updatedProfile1Result.rows[0] || { total_matches: 0, wins: 0, losses: 0, ties: 0, total_points: 0 };
    }

    if (!profile2) {
      await pool.query(
        'INSERT INTO user_profiles (user_id, total_matches, wins, losses, ties, total_points, win_rate) VALUES ($1, 0, 0, 0, 0, 0, 0) ON CONFLICT (user_id) DO NOTHING',
        [player2Id]
      );
      // Re-fetch the profile in case it was created by another concurrent operation
      const updatedProfile2Result = await pool.query('SELECT * FROM user_profiles WHERE user_id = $1', [player2Id]);
      profile2 = updatedProfile2Result.rows[0] || { total_matches: 0, wins: 0, losses: 0, ties: 0, total_points: 0 };
    }

    // Update player 1 stats
    let p1Wins = profile1.wins;
    let p1Losses = profile1.losses;
    let p1Ties = profile1.ties;
    let p1Points = profile1.total_points;

    // Update player 2 stats
    let p2Wins = profile2.wins;
    let p2Losses = profile2.losses;
    let p2Ties = profile2.ties;
    let p2Points = profile2.total_points;

    if (winnerId === player1Id) {
      p1Wins++;
      p2Losses++;
      p1Points += scoringRules.win;
      p2Points += scoringRules.loss;
    } else if (winnerId === player2Id) {
      p2Wins++;
      p1Losses++;
      p2Points += scoringRules.win;
      p1Points += scoringRules.loss;
    } else {
      // Tie
      p1Ties++;
      p2Ties++;
      p1Points += scoringRules.tie;
      p2Points += scoringRules.tie;
    }

    const p1TotalMatches = p1Wins + p1Losses + p1Ties;
    const p2TotalMatches = p2Wins + p2Losses + p2Ties;
    const p1WinRate = p1TotalMatches > 0 ? p1Wins / p1TotalMatches : 0;
    const p2WinRate = p2TotalMatches > 0 ? p2Wins / p2TotalMatches : 0;

    // Update both profiles
    await Promise.all([
      pool.query(
        `UPDATE user_profiles 
         SET total_matches = $1, wins = $2, losses = $3, ties = $4, 
             total_points = $5, win_rate = $6, last_updated = CURRENT_TIMESTAMP
         WHERE user_id = $7`,
        [p1TotalMatches, p1Wins, p1Losses, p1Ties, p1Points, p1WinRate, player1Id]
      ),
      pool.query(
        `UPDATE user_profiles 
         SET total_matches = $1, wins = $2, losses = $3, ties = $4, 
             total_points = $5, win_rate = $6, last_updated = CURRENT_TIMESTAMP
         WHERE user_id = $7`,
        [p2TotalMatches, p2Wins, p2Losses, p2Ties, p2Points, p2WinRate, player2Id]
      )
    ]);

  } catch (err) {
    console.error('Error updating user profiles:', err);
  }
}

// Helper function to retroactively update user profiles for existing completed matches
async function updateUserProfilesForExistingMatches() {
  try {
    console.log('Updating user profiles for existing completed matches...');
    
    // Get all completed matches (including ties where winner_id is null)
    const { rows: completedMatches } = await pool.query(`
      SELECT tm.*, t.name as tournament_name
      FROM tournament_matches tm
      JOIN tournaments t ON tm.tournament_id = t.id
      WHERE tm.status = 'completed'
    `);
    
    // Get scoring rules
    const settingsResult = await pool.query('SELECT scoring_rules FROM league_settings ORDER BY id DESC LIMIT 1');
    const scoringRules = settingsResult.rows[0]?.scoring_rules || { win: 3, tie: 1, loss: 0 };
    
    // Clear existing user profiles
    await pool.query('DELETE FROM user_profiles');
    
    // Process each completed match
    for (const match of completedMatches) {
      // For matches with null winner_id, treat as tie
      const winnerId = match.winner_id || null;
      await updateUserProfilesAfterMatch(match.player1_id, match.player2_id, winnerId, scoringRules);
    }
    
    console.log(`Updated user profiles for ${completedMatches.length} completed matches`);
  } catch (err) {
    console.error('Error updating user profiles for existing matches:', err);
  }
}

// Update user profiles for existing matches on server start
(async () => {
  await updateUserProfilesForExistingMatches();
})();

// Create scorecards table if it doesn't exist
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS scorecards (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(member_id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL CHECK (type IN ('stroke_play', 'mully_golf')),
        player_name VARCHAR(255) NOT NULL,
        date_played DATE NOT NULL,
        handicap NUMERIC(5,2) DEFAULT 0,
        scores JSONB NOT NULL,
        total_strokes INTEGER DEFAULT 0,
        total_mulligans INTEGER DEFAULT 0,
        final_score INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Scorecards table ready.');
    
    // Add new columns for CSV import data
    await pool.query(`
      ALTER TABLE scorecards
        ADD COLUMN IF NOT EXISTS teebox VARCHAR(100),
        ADD COLUMN IF NOT EXISTS course_rating NUMERIC,
        ADD COLUMN IF NOT EXISTS course_slope INTEGER,
        ADD COLUMN IF NOT EXISTS software VARCHAR(100),
        ADD COLUMN IF NOT EXISTS course_name VARCHAR(255),
        ADD COLUMN IF NOT EXISTS differential NUMERIC,
        ADD COLUMN IF NOT EXISTS csv_timestamp VARCHAR(50),
        ADD COLUMN IF NOT EXISTS round_type VARCHAR(20) DEFAULT 'sim',
        ADD COLUMN IF NOT EXISTS holes_played INTEGER DEFAULT 18,
        ADD COLUMN IF NOT EXISTS nine_type VARCHAR(10) DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS tournament_id INTEGER REFERENCES tournaments(id) ON DELETE CASCADE
      `);
    console.log('Scorecards table migration complete.');
    
    // Add par_values column to simulator_courses_combined table
    await pool.query(`
      ALTER TABLE simulator_courses_combined
        ADD COLUMN IF NOT EXISTS par_values JSONB
      `);
    console.log('Simulator courses table par_values column added.');
    
    // Change handicap column to NUMERIC to support decimal values
    try {
      await pool.query(`
        ALTER TABLE users 
        ALTER COLUMN handicap TYPE NUMERIC(5,2) USING handicap::numeric
      `);
      console.log('Users table handicap column updated to NUMERIC.');
    } catch (handicapErr) {
      console.log('Handicap column migration note:', handicapErr.message);
    }
    
    // Change scorecards table handicap column to NUMERIC to support decimal values
    try {
      // Drop the view first since it depends on the handicap column
      await pool.query(`DROP VIEW IF EXISTS scorecards_with_courses`);
      
      await pool.query(`
        ALTER TABLE scorecards 
        ALTER COLUMN handicap TYPE NUMERIC(5,2) USING handicap::numeric
      `);
      console.log('Scorecards table handicap column updated to NUMERIC.');
      
      // Recreate the view
      await pool.query(`
        CREATE OR REPLACE VIEW scorecards_with_courses AS
        SELECT 
          s.*,
          c.name as course_full_name,
          c.platforms as course_platforms,
          c.location as course_location,
          c.designer as course_designer,
          c.elevation as course_elevation,
          c.course_types as course_types
        FROM scorecards s
        LEFT JOIN simulator_courses_combined c ON s.course_id = c.id
        ORDER BY s.date_played DESC, s.created_at DESC
      `);
      console.log('Scorecards with courses view recreated.');
    } catch (scorecardHandicapErr) {
      console.log('Scorecards handicap column migration note:', scorecardHandicapErr.message);
    }
    
    // Add separate handicap fields for sim and grass rounds
    try {
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS sim_handicap NUMERIC(5,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS grass_handicap NUMERIC(5,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS profile_photo_url VARCHAR(255)
      `);
      console.log('Users table separate handicap columns and profile photo URL added.');
    } catch (separateHandicapErr) {
      console.log('Separate handicap columns migration note:', separateHandicapErr.message);
    }
  } catch (migrationErr) {
    console.log('Migration note:', migrationErr.message);
  }
})();

// Save scorecard
app.post('/api/scorecards', authenticateToken, async (req, res) => {
  const { type, player_name, date_played, handicap, scores, total_strokes, total_mulligans, final_score, round_type, course_rating, course_slope, course_name, teebox, tournament_id } = req.body;
  
  console.log('Received scorecard data:', req.body); // Debug log
  console.log('User ID:', req.user.member_id); // Debug log
  console.log('Differential calculation inputs:', { total_strokes, course_rating, course_slope }); // Debug log
  
  if (!type || !player_name || !date_played || !scores) {
    console.log('Missing required fields:', { type, player_name, date_played, scores: !!scores });
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Calculate differential if possible
  let differential = null;
  if (
    typeof total_strokes !== 'undefined' &&
    typeof course_rating !== 'undefined' &&
    typeof course_slope !== 'undefined' &&
    !isNaN(parseFloat(total_strokes)) &&
    !isNaN(parseFloat(course_rating)) &&
    !isNaN(parseFloat(course_slope)) &&
    parseFloat(course_slope) !== 0
  ) {
    // Get holes played from request body, default to 18
    const holesPlayed = req.body.holes_played || 18;
    const nineType = req.body.nine_type || null;
    let usedRating = parseFloat(course_rating);
    let usedSlope = parseFloat(course_slope);
    let baseDifferential;
    if (holesPlayed === 9) {
      // Always halve rating and slope for 9-hole rounds (since all are 18-hole values)
      usedRating = usedRating / 2;
      usedSlope = usedSlope / 2;
      baseDifferential = ((parseFloat(total_strokes) - usedRating) * 113) / usedSlope;
      baseDifferential = baseDifferential * 2; // Double for USGA 9-hole rule
      console.log('9-hole round: halved rating/slope, doubled differential');
    } else {
      baseDifferential = ((parseFloat(total_strokes) - usedRating) * 113) / usedSlope;
    }
    differential = Math.round(baseDifferential * 1000000) / 1000000; // round to 6 decimals for consistency
    console.log('Differential calculated:', differential, 'for', holesPlayed, 'holes'); // Debug log
  } else {
    console.log('Differential calculation failed - missing or invalid data'); // Debug log
  }
  
  try {
    // Ensure scores is properly formatted as JSON
    let scoresData = scores;
    if (typeof scores === 'string') {
      try {
        scoresData = JSON.parse(scores);
      } catch (parseErr) {
        console.error('Error parsing scores JSON:', parseErr);
        return res.status(400).json({ error: 'Invalid scores format' });
      }
    }
    
    console.log('Processed scores data:', scoresData); // Debug log
    
    // Try to find course_id if course_name is provided
    let course_id = null;
    if (course_name) {
      try {
        // First try exact match
        let { rows: courseRows } = await pool.query(
          'SELECT id FROM simulator_courses_combined WHERE LOWER(name) = LOWER($1) LIMIT 1',
          [course_name]
        );
        
        // If no exact match, try normalized matching
        if (courseRows.length === 0) {
          const normalizedCourseName = course_name
            .toLowerCase()
            .replace(/\s+(golf club|country club|the|gc|cc|golf course|course)$/gi, '')
            .replace(/[^\w\s]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
          
          if (normalizedCourseName) {
            ({ rows: courseRows } = await pool.query(
              'SELECT id FROM simulator_courses_combined WHERE LOWER(name) LIKE $1 LIMIT 1',
              [`%${normalizedCourseName}%`]
            ));
          }
        }
        
        if (courseRows.length > 0) {
          course_id = courseRows[0].id;
          console.log(`Linked course: "${course_name}" -> ID: ${course_id}`);
        } else {
          console.log(`No course match found for: "${course_name}"`);
        }
      } catch (courseErr) {
        console.error('Error finding course:', courseErr);
        // Don't fail the scorecard save if course linking fails
      }
    }
    
    // Parse handicap to ensure it's a number
    const parsedHandicap = handicap ? parseFloat(handicap) : 0;
    
    const { rows } = await pool.query(
      `INSERT INTO scorecards (user_id, tournament_id, type, player_name, date_played, handicap, scores, total_strokes, total_mulligans, final_score, round_type, course_rating, course_slope, differential, course_name, course_id, teebox, holes_played, nine_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19) RETURNING *`,
      [
        req.user.member_id,
        tournament_id || null,
        type,
        player_name,
        date_played,
        parsedHandicap,
        JSON.stringify(scoresData),
        total_strokes || 0,
        total_mulligans || 0,
        final_score || 0,
        round_type || 'sim',
        course_rating || null,
        course_slope || null,
        differential,
        course_name || null,
        course_id,
        teebox || null,
        req.body.holes_played || 18,
        req.body.nine_type || null
      ]
    );
    
    console.log('Scorecard saved successfully:', rows[0]); // Debug log
    
    // Check and update course records for simulator rounds with course_id
    if (round_type === 'sim' && course_id && total_strokes) {
      try {
        // Get user's club
        const { rows: userRows } = await pool.query(
          'SELECT club FROM users WHERE member_id = $1',
          [req.user.member_id]
        );
        
        if (userRows.length > 0) {
          await checkAndUpdateCourseRecords(
            rows[0].id, // scorecardId
            course_id,  // courseId
            req.user.member_id, // userId
            total_strokes, // totalStrokes
            date_played, // datePlayed
            userRows[0].club // userClub
          );
        }
      } catch (recordErr) {
        console.error('Error updating course records:', recordErr);
        // Don't fail the scorecard save if course record update fails
      }
    }
    
    // Update teebox data in simulator_courses_combined for simulator rounds
    if (round_type === 'sim' && course_id && teebox && course_rating && course_slope) {
      try {
        await updateCourseTeeboxData(course_id, teebox, course_rating, course_slope, date_played);
        console.log('Teebox data updated after scorecard save');
      } catch (teeboxErr) {
        console.error('Error updating teebox data:', teeboxErr);
        // Don't fail the scorecard save if teebox update fails
      }
    }
    
    // Recalculate handicap for this user after saving scorecard
    try {
      await calculateAndUpdateUserHandicap(req.user.member_id);
      console.log('Handicap recalculated for current user after scorecard save');
    } catch (handicapErr) {
      console.error('Error recalculating handicap:', handicapErr);
      // Don't fail the scorecard save if handicap calculation fails
    }
    
    res.json(rows[0]);
  } catch (err) {
    console.error('Error saving scorecard:', err);
    res.status(500).json({ error: 'Failed to save scorecard', details: err.message });
  }
});

// Get user's scorecards
app.get('/api/scorecards', authenticateToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM scorecards WHERE user_id = $1 ORDER BY date_played DESC, created_at DESC',
      [req.user.member_id]
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching scorecards:', err);
    res.status(500).json({ error: 'Failed to fetch scorecards' });
  }
});

// Get tournament strokeplay scores
app.get('/api/tournaments/:id/strokeplay-scores', async (req, res) => {
  const { id } = req.params;
  
  try {
    const { rows } = await pool.query(
      `SELECT s.*, u.first_name, u.last_name, u.club
       FROM scorecards s
       JOIN users u ON s.user_id = u.member_id
       WHERE s.tournament_id = $1 AND s.type = 'stroke_play'
       ORDER BY s.total_strokes ASC, s.created_at ASC`,
      [id]
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching tournament strokeplay scores:', err);
    res.status(500).json({ error: 'Failed to fetch tournament scores' });
  }
});

// Get all tournament scores (strokeplay and matchplay)
app.get('/api/tournaments/:id/scores', async (req, res) => {
  const { id } = req.params;
  
  try {
    // Get strokeplay scores
    const strokeplayScores = await pool.query(
      `SELECT s.*, u.first_name, u.last_name, u.club, 'strokeplay' as score_type
       FROM scorecards s
       JOIN users u ON s.user_id = u.member_id
       WHERE s.tournament_id = $1 AND s.type = 'stroke_play'`,
      [id]
    );
    
    // Get matchplay scores (from matches table)
    const matchplayScores = await pool.query(
      `SELECT 
         m.id,
         m.tournament_id,
         m.player1_id as user_id,
         u1.first_name,
         u1.last_name,
         u1.club,
         'matchplay' as score_type,
         m.scores,
         m.winner_id,
         m.created_at
       FROM tournament_matches m
       JOIN users u1 ON m.player1_id = u1.member_id
       WHERE m.tournament_id = $1 AND m.status = 'completed'
       UNION ALL
       SELECT 
         m.id,
         m.tournament_id,
         m.player2_id as user_id,
         u2.first_name,
         u2.last_name,
         u2.club,
         'matchplay' as score_type,
         m.scores,
         m.winner_id,
         m.created_at
       FROM tournament_matches m
       JOIN users u2 ON m.player2_id = u2.member_id
       WHERE m.tournament_id = $1 AND m.status = 'completed'`,
      [id]
    );
    
    // Combine and return all scores
    const allScores = [...strokeplayScores.rows, ...matchplayScores.rows];
    res.json(allScores);
  } catch (err) {
    console.error('Error fetching tournament scores:', err);
    res.status(500).json({ error: 'Failed to fetch tournament scores' });
  }
});

// Submit tournament strokeplay score
app.post('/api/tournaments/:id/strokeplay-score', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { total_score, hole_scores, notes, scorecard_photo_url, player_id } = req.body;
  
  console.log('Submitting tournament strokeplay score:', { tournament_id: id, ...req.body });
  console.log('User ID:', req.user.member_id);
  console.log('Request body validation:', { total_score, hole_scores: hole_scores?.length, notes, scorecard_photo_url: !!scorecard_photo_url });
  
  try {
    // Validate required fields
    if (!total_score || isNaN(parseInt(total_score))) {
      console.log('Missing or invalid total_score:', total_score);
      return res.status(400).json({ error: 'total_score is required and must be a valid number' });
    }
    
    // Validate tournament exists and is strokeplay format
    const tournamentResult = await pool.query(
      'SELECT * FROM tournaments WHERE id = $1',
      [id]
    );
    
    if (tournamentResult.rows.length === 0) {
      console.log('Tournament not found:', id);
      return res.status(404).json({ error: 'Tournament not found' });
    }
    
    const tournament = tournamentResult.rows[0];
    console.log('Tournament found:', { id: tournament.id, name: tournament.name, format: tournament.tournament_format });
    
    if (!tournament.tournament_format?.includes('stroke_play') && !tournament.tournament_format?.includes('strokeplay')) {
      console.log('Tournament format validation failed:', tournament.tournament_format);
      return res.status(400).json({ error: 'This endpoint is only for strokeplay tournaments' });
    }
    
    // Use the specified player_id or fall back to authenticated user
    const targetPlayerId = player_id || req.user.member_id;
    
    // Check if the target player is registered for tournament
    const participationResult = await pool.query(
      'SELECT * FROM participation WHERE tournament_id = $1 AND user_member_id = $2',
      [id, targetPlayerId]
    );
    
    console.log('Player participation check:', { 
      tournament_id: id, 
      player_id: targetPlayerId, 
      is_registered: participationResult.rows.length > 0 
    });
    
    if (participationResult.rows.length === 0) {
      console.log('Player not registered for tournament');
      return res.status(403).json({ error: 'The specified player must be registered for this tournament to submit scores' });
    }
    
    // Check if the target player already submitted a score for this tournament
    const existingScoreResult = await pool.query(
      'SELECT * FROM scorecards WHERE tournament_id = $1 AND user_id = $2 AND type = $3',
      [id, targetPlayerId, 'stroke_play']
    );
    
    if (existingScoreResult.rows.length > 0) {
      return res.status(409).json({ error: 'This player has already submitted a score for this tournament' });
    }
    
    // Get target player's data
    const userResult = await pool.query(
      'SELECT first_name, last_name, sim_handicap, grass_handicap FROM users WHERE member_id = $1',
      [targetPlayerId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    const user = userResult.rows[0];
    const handicap = user?.sim_handicap || user?.grass_handicap || 0;
    
    // Prepare scores data
    const scoresData = {
      hole_scores: hole_scores || [],
      total_score: total_score,
      notes: notes,
      scorecard_photo_url: scorecard_photo_url
    };
    
    // Insert scorecard
    const { rows } = await pool.query(
      `INSERT INTO scorecards (
        user_id, tournament_id, type, player_name, date_played, handicap, 
        scores, total_strokes, final_score, round_type, holes_played
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [
        targetPlayerId,
        id,
        'stroke_play',
        `${user.first_name || 'Unknown'} ${user.last_name || 'Player'}`,
        new Date().toISOString().split('T')[0],
        handicap,
        JSON.stringify(scoresData),
        total_score,
        total_score,
        'sim',
        hole_scores?.length || 18
      ]
    );
    
    console.log('Tournament strokeplay score saved:', rows[0]);
    res.json(rows[0]);
  } catch (err) {
    console.error('Error submitting tournament strokeplay score:', err);
    res.status(500).json({ error: 'Failed to submit tournament score', details: err.message });
  }
});

// Get user's scorecards with course information
app.get('/api/scorecards/with-courses', authenticateToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM scorecards_with_courses WHERE user_id = $1 ORDER BY date_played DESC, created_at DESC',
      [req.user.member_id]
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching scorecards with courses:', err);
    res.status(500).json({ error: 'Failed to fetch scorecards with courses' });
  }
});

// Get specific scorecard
app.get('/api/scorecards/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  
  try {
    const { rows } = await pool.query(
      'SELECT * FROM scorecards WHERE id = $1 AND user_id = $2',
      [id, req.user.member_id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Scorecard not found' });
    }
    
    res.json(rows[0]);
  } catch (err) {
    console.error('Error fetching scorecard:', err);
    res.status(500).json({ error: 'Failed to fetch scorecard' });
  }
});

// Delete scorecard
app.delete('/api/scorecards/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  
  try {
    const { rows } = await pool.query(
      'DELETE FROM scorecards WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, req.user.member_id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Scorecard not found' });
    }
    
    res.json({ success: true, message: 'Scorecard deleted successfully' });
  } catch (err) {
    console.error('Error deleting scorecard:', err);
    res.status(500).json({ error: 'Failed to delete scorecard' });
  }
});

// Get all user profiles
app.get('/api/user-profiles', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM user_profiles ORDER BY user_id');
    res.json(rows);
  } catch (err) {
    console.error('Error fetching user profiles:', err);
    res.status(500).json({ error: 'Failed to fetch user profiles' });
  }
});

// Get specific user profile
app.get('/api/user-profiles/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const { rows } = await pool.query(
      'SELECT * FROM user_profiles WHERE user_id = $1',
      [userId]
    );
    
    if (rows.length === 0) {
      // Create a default profile if none exists
      const { rows: newProfile } = await pool.query(
        'INSERT INTO user_profiles (user_id, total_matches, wins, losses, ties, total_points, win_rate) VALUES ($1, 0, 0, 0, 0, 0, 0) RETURNING *',
        [userId]
      );
      res.json(newProfile[0]);
    } else {
      res.json(rows[0]);
    }
  } catch (err) {
    console.error('Error fetching user profile:', err);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// Get tournaments by status
app.get('/api/tournaments/status/:status', async (req, res) => {
  const { status } = req.params;
  try {
    const { rows } = await pool.query(
      'SELECT * FROM tournaments WHERE status = $1 ORDER BY start_date DESC, id DESC',
      [status]
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching tournaments by status:', err);
    res.status(500).json({ error: 'Failed to fetch tournaments' });
  }
});

// Note: Duplicate endpoint removed - consolidated with the main available tournaments endpoint above

// Get tournaments that a user is registered for
app.get('/api/tournaments/user/:userId', async (req, res) => {
  const { userId } = req.params;
  
  try {
    const { rows } = await pool.query(`
      SELECT 
        t.*,
        CASE 
          WHEN ws.id IS NOT NULL THEN true 
          ELSE false 
        END as has_submitted_score,
        ws.week_start_date as last_score_date
      FROM tournaments t
      INNER JOIN participation p ON t.id = p.tournament_id
      LEFT JOIN weekly_scorecards ws ON t.id = ws.tournament_id AND ws.user_id = $1
      WHERE p.user_member_id = $1
      ORDER BY t.start_date ASC, t.id DESC
    `, [userId]);
    
    res.json(rows);
  } catch (err) {
    console.error('Error fetching user tournaments:', err);
    res.status(500).json({ error: 'Failed to fetch user tournaments' });
  }
});

// =====================================================
// CLUB CHAMPIONSHIP MANAGEMENT API ENDPOINTS
// =====================================================

// Get club participant counts for a tournament
app.get('/api/tournaments/:id/club-participants', async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query(`
      SELECT 
        u.club,
        COUNT(p.user_member_id) as participant_count,
        ARRAY_AGG(
          JSON_BUILD_OBJECT(
            'user_id', u.member_id,
            'first_name', u.first_name,
            'last_name', u.last_name,
            'email', u.email_address
          )
        ) as participants
      FROM participation p
      JOIN users u ON p.user_member_id = u.member_id
      WHERE p.tournament_id = $1 AND u.club IS NOT NULL
      GROUP BY u.club
      ORDER BY participant_count DESC, u.club
    `, [id]);
    
    res.json(rows);
  } catch (err) {
    console.error('Error fetching club participants:', err);
    res.status(500).json({ error: 'Failed to fetch club participants' });
  }
});

// Auto-group clubs for championship
app.post('/api/tournaments/:id/auto-group-clubs', async (req, res) => {
  const { id } = req.params;
  const { minParticipants = 4 } = req.body;
  
  try {
    // Get tournament details
    const tournamentResult = await pool.query(
      'SELECT * FROM tournaments WHERE id = $1',
      [id]
    );
    
    if (tournamentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    
    const tournament = tournamentResult.rows[0];
    
    // Get club participant counts
    const clubCountsResult = await pool.query(`
      SELECT 
        u.club,
        COUNT(p.user_member_id) as participant_count,
        ARRAY_AGG(u.member_id) as user_ids
      FROM participation p
      JOIN users u ON p.user_member_id = u.member_id
      WHERE p.tournament_id = $1 AND u.club IS NOT NULL
      GROUP BY u.club
      ORDER BY participant_count ASC
    `, [id]);
    
    const clubCounts = clubCountsResult.rows;
    console.log(`Found ${clubCounts.length} clubs with participants for tournament ${id}:`, clubCounts.map(c => `${c.club}: ${c.participant_count}`));
    
    // Group clubs based on minimum participants
    const groups = [];
    let currentGroup = [];
    let currentGroupCount = 0;
    let groupNumber = 1;
    
    for (const club of clubCounts) {
      if (parseInt(club.participant_count) >= minParticipants) {
        // Club has enough participants - create individual group
        if (currentGroup.length > 0) {
          groups.push({
            group_name: `Combined Group ${groupNumber}`,
            clubs: currentGroup.map(c => c.club),
            participant_count: currentGroupCount,
            user_ids: currentGroup.flatMap(c => c.user_ids)
          });
          groupNumber++;
          currentGroup = [];
          currentGroupCount = 0;
        }
        
        groups.push({
          group_name: `${club.club} Championship`,
          clubs: [club.club],
          participant_count: club.participant_count,
          user_ids: club.user_ids
        });
      } else {
        // Club needs to be grouped with others
        currentGroup.push(club);
        currentGroupCount += parseInt(club.participant_count);
        
        if (currentGroupCount >= minParticipants) {
          groups.push({
            group_name: `Combined Group ${groupNumber}`,
            clubs: currentGroup.map(c => c.club),
            participant_count: currentGroupCount,
            user_ids: currentGroup.flatMap(c => c.user_ids)
          });
          groupNumber++;
          currentGroup = [];
          currentGroupCount = 0;
        }
      }
    }
    
    // Handle remaining clubs - combine them into one group
    if (currentGroup.length > 0) {
      groups.push({
        group_name: `Combined Group ${groupNumber}`,
        clubs: currentGroup.map(c => c.club),
        participant_count: currentGroupCount,
        user_ids: currentGroup.flatMap(c => c.user_ids)
      });
    }
    
    // If we still have groups with insufficient participants, combine them
    const insufficientGroups = groups.filter(g => g.participant_count < minParticipants);
    if (insufficientGroups.length > 1) {
      // Remove insufficient groups and create one combined group
      const validGroups = groups.filter(g => g.participant_count >= minParticipants);
      const combinedGroup = {
        group_name: `Combined Group ${groupNumber}`,
        clubs: insufficientGroups.flatMap(g => g.clubs),
        participant_count: insufficientGroups.reduce((sum, g) => sum + g.participant_count, 0),
        user_ids: insufficientGroups.flatMap(g => g.user_ids)
      };
      groups.splice(0, groups.length, ...validGroups, combinedGroup);
    }
    
    console.log(`Created ${groups.length} groups:`, groups.map(g => `${g.group_name}: ${g.clubs.join(', ')} (${g.participant_count} participants)`));
    
    // Save groups to database
    for (const group of groups) {
      await pool.query(`
        INSERT INTO club_groups (
          tournament_id, 
          group_name, 
          participating_clubs, 
          min_participants, 
          participant_count
        ) VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (tournament_id, group_name) 
        DO UPDATE SET 
          participating_clubs = EXCLUDED.participating_clubs,
          participant_count = EXCLUDED.participant_count
      `, [
        id,
        group.group_name,
        group.clubs,
        minParticipants,
        group.participant_count
      ]);
    }
    
    res.json({
      success: true,
      groups: groups,
      message: `Created ${groups.length} club groups`
    });
    
  } catch (err) {
    console.error('Error auto-grouping clubs:', err);
    res.status(500).json({ error: 'Failed to auto-group clubs' });
  }
});

// Create manual club group
app.post('/api/tournaments/:id/create-club-group', async (req, res) => {
  const { id } = req.params;
  const { groupName, participantIds } = req.body;
  
  try {
    // Get participant details
    const participantResult = await pool.query(`
      SELECT u.member_id, u.club, u.first_name, u.last_name
      FROM users u
      WHERE u.member_id = ANY($1)
    `, [participantIds]);
    
    const participants = participantResult.rows;
    const clubs = [...new Set(participants.map(p => p.club))];
    const participantCount = participants.length;
    
    // Create the group
    const result = await pool.query(`
      INSERT INTO club_groups (
        tournament_id,
        group_name,
        participating_clubs,
        min_participants,
        participant_count,
        user_ids
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [id, groupName, clubs, 4, participantCount, participantIds]);
    
    res.json({
      success: true,
      group: result.rows[0],
      message: `Created club group "${groupName}"`
    });
    
  } catch (err) {
    console.error('Error creating club group:', err);
    res.status(500).json({ error: 'Failed to create club group' });
  }
});

// Update club group
app.put('/api/tournaments/:id/club-groups/:groupId', async (req, res) => {
  const { id, groupId } = req.params;
  const { participantIds, groupName } = req.body;
  
  try {
    // Get participant details
    const participantResult = await pool.query(`
      SELECT u.member_id, u.club, u.first_name, u.last_name
      FROM users u
      WHERE u.member_id = ANY($1)
    `, [participantIds]);
    
    const participants = participantResult.rows;
    const clubs = [...new Set(participants.map(p => p.club))];
    const participantCount = participants.length;
    
    // Update the group
    const result = await pool.query(`
      UPDATE club_groups 
      SET 
        group_name = $1,
        participating_clubs = $2,
        participant_count = $3,
        user_ids = $4
      WHERE id = $5 AND tournament_id = $6
      RETURNING *
    `, [groupName, clubs, participantCount, participantIds, groupId, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    res.json({
      success: true,
      group: result.rows[0],
      message: `Updated club group`
    });
    
  } catch (err) {
    console.error('Error updating club group:', err);
    res.status(500).json({ error: 'Failed to update club group' });
  }
});

// Delete club group
app.delete('/api/tournaments/:id/club-groups/:groupId', async (req, res) => {
  const { id, groupId } = req.params;
  
  try {
    // Delete associated matches first
    await pool.query(`
      DELETE FROM club_championship_matches 
      WHERE tournament_id = $1 AND club_group IN (
        SELECT group_name FROM club_groups WHERE id = $2 AND tournament_id = $1
      )
    `, [id, groupId]);
    
    // Delete the group
    const result = await pool.query(`
      DELETE FROM club_groups 
      WHERE id = $1 AND tournament_id = $2
      RETURNING *
    `, [groupId, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    res.json({
      success: true,
      message: `Deleted club group`
    });
    
  } catch (err) {
    console.error('Error deleting club group:', err);
    res.status(500).json({ error: 'Failed to delete club group' });
  }
});

// Create individual match
app.post('/api/tournaments/:id/create-match', async (req, res) => {
  const { id } = req.params;
  const { groupId, player1Id, player2Id } = req.body;
  
  try {
    // Get group details
    const groupResult = await pool.query(`
      SELECT group_name FROM club_groups WHERE id = $1 AND tournament_id = $2
    `, [groupId, id]);
    
    if (groupResult.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    const groupName = groupResult.rows[0].group_name;
    
    // Get next match number for this group
    const matchNumberResult = await pool.query(`
      SELECT COALESCE(MAX(match_number), 0) + 1 as next_match_number
      FROM club_championship_matches 
      WHERE tournament_id = $1 AND club_group = $2
    `, [id, groupName]);
    
    const matchNumber = matchNumberResult.rows[0].next_match_number;
    
    // Create the match
    const result = await pool.query(`
      INSERT INTO club_championship_matches (
        tournament_id,
        club_group,
        player1_id,
        player2_id,
        match_number,
        match_status
      ) VALUES ($1, $2, $3, $4, $5, 'pending')
      RETURNING *
    `, [id, groupName, player1Id, player2Id, matchNumber]);
    
    res.json({
      success: true,
      match: result.rows[0],
      message: `Created match ${matchNumber}`
    });
    
  } catch (err) {
    console.error('Error creating match:', err);
    res.status(500).json({ error: 'Failed to create match' });
  }
});

// Update match result
app.put('/api/tournaments/:id/matches/:matchId/result', async (req, res) => {
  const { id, matchId } = req.params;
  const { 
    player1_score, 
    player2_score, 
    winner_id,
    player1_hole_scores,
    player2_hole_scores,
    player1_net_hole_scores,
    player2_net_hole_scores,
    player1_holes_won,
    player2_holes_won,
    player1_holes_lost,
    player2_holes_lost,
    player1_net_holes,
    player2_net_holes,
    course_id,
    teebox,
    match_status
  } = req.body;
  
  try {
    // Build dynamic query based on provided fields
    let updateFields = [];
    let values = [];
    let paramCount = 1;

    if (player1_score !== undefined) {
      updateFields.push(`player1_score = $${paramCount++}`);
      values.push(player1_score);
    }
    if (player2_score !== undefined) {
      updateFields.push(`player2_score = $${paramCount++}`);
      values.push(player2_score);
    }
    if (winner_id !== undefined) {
      updateFields.push(`winner_id = $${paramCount++}`);
      values.push(winner_id);
    }
    if (player1_hole_scores !== undefined) {
      updateFields.push(`player1_hole_scores = $${paramCount++}`);
      values.push(player1_hole_scores);
    }
    if (player2_hole_scores !== undefined) {
      updateFields.push(`player2_hole_scores = $${paramCount++}`);
      values.push(player2_hole_scores);
    }
    if (player1_net_hole_scores !== undefined) {
      updateFields.push(`player1_net_hole_scores = $${paramCount++}`);
      values.push(player1_net_hole_scores);
    }
    if (player2_net_hole_scores !== undefined) {
      updateFields.push(`player2_net_hole_scores = $${paramCount++}`);
      values.push(player2_net_hole_scores);
    }
    if (player1_holes_won !== undefined) {
      updateFields.push(`player1_holes_won = $${paramCount++}`);
      values.push(player1_holes_won);
    }
    if (player2_holes_won !== undefined) {
      updateFields.push(`player2_holes_won = $${paramCount++}`);
      values.push(player2_holes_won);
    }
    if (player1_holes_lost !== undefined) {
      updateFields.push(`player1_holes_lost = $${paramCount++}`);
      values.push(player1_holes_lost);
    }
    if (player2_holes_lost !== undefined) {
      updateFields.push(`player2_holes_lost = $${paramCount++}`);
      values.push(player2_holes_lost);
    }
    if (player1_net_holes !== undefined) {
      updateFields.push(`player1_net_holes = $${paramCount++}`);
      values.push(player1_net_holes);
    }
    if (player2_net_holes !== undefined) {
      updateFields.push(`player2_net_holes = $${paramCount++}`);
      values.push(player2_net_holes);
    }
    if (course_id !== undefined) {
      updateFields.push(`course_id = $${paramCount++}`);
      values.push(course_id);
    }
    if (teebox !== undefined) {
      updateFields.push(`teebox = $${paramCount++}`);
      values.push(teebox);
    }
    if (match_status !== undefined) {
      updateFields.push(`match_status = $${paramCount++}`);
      values.push(match_status);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    // Add match ID and tournament ID as final parameters
    values.push(matchId, id);

    const query = `
      UPDATE club_championship_matches 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount++} AND tournament_id = $${paramCount++}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Match not found' });
    }
    
    res.json({
      success: true,
      match: result.rows[0],
      message: `Updated match result`
    });
    
  } catch (err) {
    console.error('Error updating match result:', err);
    res.status(500).json({ error: 'Failed to update match result' });
  }
});

// Delete match
app.delete('/api/tournaments/:id/matches/:matchId', async (req, res) => {
  const { id, matchId } = req.params;
  
  try {
    const result = await pool.query(`
      DELETE FROM club_championship_matches 
      WHERE id = $1 AND tournament_id = $2
      RETURNING *
    `, [matchId, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Match not found' });
    }
    
    res.json({
      success: true,
      message: `Deleted match`
    });
    
  } catch (err) {
    console.error('Error deleting match:', err);
    res.status(500).json({ error: 'Failed to delete match' });
  }
});

// Get club groups for a tournament
app.get('/api/tournaments/:id/club-groups', async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query(`
      SELECT * FROM club_groups 
      WHERE tournament_id = $1 
      ORDER BY group_name
    `, [id]);
    
    // Ensure user_ids is always an array and participating_clubs is always an array
    const groupsWithDefaults = rows.map(group => ({
      ...group,
      user_ids: group.user_ids || [],
      participating_clubs: group.participating_clubs || []
    }));
    
    res.json(groupsWithDefaults);
  } catch (err) {
    console.error('Error fetching club groups:', err);
    res.status(500).json({ error: 'Failed to fetch club groups' });
  }
});

// Generate matches for club groups
app.post('/api/tournaments/:id/generate-championship-matches', async (req, res) => {
  const { id } = req.params;
  
  try {
    // Get all club groups for this tournament
    const groupsResult = await pool.query(`
      SELECT cg.*, 
             ARRAY_AGG(u.member_id) as user_ids
      FROM club_groups cg
      JOIN participation p ON p.tournament_id = cg.tournament_id
      JOIN users u ON p.user_member_id = u.member_id AND u.club = ANY(cg.participating_clubs)
      WHERE cg.tournament_id = $1
      GROUP BY cg.id, cg.group_name, cg.participating_clubs, cg.min_participants, cg.participant_count
    `, [id]);
    
    const groups = groupsResult.rows;
    console.log(`Found ${groups.length} club groups for tournament ${id}`);
    
    if (groups.length === 0) {
      return res.status(400).json({ 
        error: 'No club groups found. Please create club groups first using the auto-group or manual grouping feature.' 
      });
    }
    
    // Clear existing matches for this tournament first
    await pool.query(
      'DELETE FROM club_championship_matches WHERE tournament_id = $1',
      [id]
    );
    console.log(`Cleared existing matches for tournament ${id}`);
    
    const matches = [];
    
    for (const group of groups) {
      const userIds = group.user_ids;
      console.log(`Processing group ${group.group_name} with ${userIds.length} users:`, userIds);
      
      // Generate exactly 3 matches per player
      const playerMatches = new Map(); // Track how many matches each player has
      const allMatches = []; // Store all possible matchups
      
      // Initialize match count for each player
      userIds.forEach(userId => {
        playerMatches.set(userId, 0);
      });
      
      // Generate all possible matchups
      for (let i = 0; i < userIds.length; i++) {
        for (let j = i + 1; j < userIds.length; j++) {
          allMatches.push([userIds[i], userIds[j]]);
        }
      }
      
      console.log(`  Found ${allMatches.length} possible matchups for ${userIds.length} players`);
      
      // Select matches ensuring each player gets exactly 3 matches
      const selectedMatches = [];
      let matchNumber = 1;
      
      // First pass: give each player their first match
      for (const [player1, player2] of allMatches) {
        if (playerMatches.get(player1) < 3 && playerMatches.get(player2) < 3) {
          selectedMatches.push([player1, player2, matchNumber]);
          playerMatches.set(player1, playerMatches.get(player1) + 1);
          playerMatches.set(player2, playerMatches.get(player2) + 1);
          matchNumber++;
        }
      }
      
      // Second pass: fill remaining matches for players who need more
      for (const [player1, player2] of allMatches) {
        if (playerMatches.get(player1) < 3 && playerMatches.get(player2) < 3) {
          selectedMatches.push([player1, player2, matchNumber]);
          playerMatches.set(player1, playerMatches.get(player1) + 1);
          playerMatches.set(player2, playerMatches.get(player2) + 1);
          matchNumber++;
        }
      }
      
      // Third pass: fill any remaining matches (some players might need more)
      for (const [player1, player2] of allMatches) {
        if (playerMatches.get(player1) < 3 && playerMatches.get(player2) < 3) {
          selectedMatches.push([player1, player2, matchNumber]);
          playerMatches.set(player1, playerMatches.get(player1) + 1);
          playerMatches.set(player2, playerMatches.get(player2) + 1);
          matchNumber++;
        }
      }
      
      console.log(`  Selected ${selectedMatches.length} matches for group ${group.group_name}`);
      
      // Insert the selected matches into the database
      for (const [player1, player2, matchNum] of selectedMatches) {
        try {
          console.log(`    Creating match: ${player1} vs ${player2} (Match ${matchNum})`);
          const matchResult = await pool.query(`
            INSERT INTO club_championship_matches (
              tournament_id,
              club_group,
              player1_id,
              player2_id,
              match_number,
              match_status
            ) VALUES ($1, $2, $3, $4, $5, 'pending')
            RETURNING *
          `, [id, group.group_name, player1, player2, matchNum]);
          
          matches.push(matchResult.rows[0]);
          console.log(`    ✅ Match created successfully`);
        } catch (matchError) {
          console.error(`    ❌ Error creating match:`, matchError.message);
          throw matchError;
        }
      }
    }
    
    res.json({
      success: true,
      matches: matches,
      message: `Generated ${matches.length} matches for ${groups.length} groups`
    });
    
  } catch (err) {
    console.error('Error generating matches:', err);
    console.error('Error details:', {
      message: err.message,
      code: err.code,
      detail: err.detail,
      hint: err.hint
    });
    res.status(500).json({ 
      error: 'Failed to generate matches',
      details: err.message 
    });
  }
});

// Get championship matches for a tournament
app.get('/api/tournaments/:id/championship-matches', async (req, res) => {
  const { id } = req.params;
  
  try {
    const { rows } = await pool.query(`
      SELECT 
        ccm.*,
        u1.first_name as player1_name,
        u1.last_name as player1_last_name,
        u1.sim_handicap as player1_handicap,
        u1.handicap as player1_grass_handicap,
        u2.first_name as player2_name,
        u2.last_name as player2_last_name,
        u2.sim_handicap as player2_handicap,
        u2.handicap as player2_grass_handicap
      FROM club_championship_matches ccm
      JOIN users u1 ON ccm.player1_id = u1.member_id
      JOIN users u2 ON ccm.player2_id = u2.member_id
      WHERE ccm.tournament_id = $1
      ORDER BY ccm.club_group, ccm.match_number, ccm.id
    `, [id]);
    
    console.log('Championship matches query result:', rows.length, 'matches');
    if (rows.length > 0) {
      console.log('Sample match data:', {
        id: rows[0].id,
        player1_scorecard_photo_url: rows[0].player1_scorecard_photo_url,
        player2_scorecard_photo_url: rows[0].player2_scorecard_photo_url,
        allColumns: Object.keys(rows[0])
      });
    }
    
    res.json(rows);
  } catch (err) {
    console.error('Error fetching championship matches:', err);
    res.status(500).json({ error: 'Failed to fetch championship matches' });
  }
});

// Update championship match players
app.put('/api/tournaments/:id/championship-matches/:matchId', async (req, res) => {
  const { id, matchId } = req.params;
  const { player1Id, player2Id } = req.body;
  
  try {
    // Validate that both players are provided
    if (!player1Id || !player2Id) {
      return res.status(400).json({ error: 'Both player1Id and player2Id are required' });
    }

    if (player1Id === player2Id) {
      return res.status(400).json({ error: 'Players must be different' });
    }

    // Validate that the match exists and belongs to the tournament
    const matchResult = await pool.query(
      'SELECT * FROM club_championship_matches WHERE id = $1 AND tournament_id = $2',
      [matchId, id]
    );
    
    if (matchResult.rows.length === 0) {
      return res.status(404).json({ error: 'Match not found' });
    }

    // Validate that both players exist
    const playersResult = await pool.query(
      'SELECT member_id FROM users WHERE member_id IN ($1, $2)',
      [player1Id, player2Id]
    );
    
    if (playersResult.rows.length !== 2) {
      return res.status(400).json({ error: 'One or both players not found' });
    }

    // Update the match
    const updateResult = await pool.query(
      `UPDATE club_championship_matches 
       SET player1_id = $1, player2_id = $2, updated_at = NOW()
       WHERE id = $3 AND tournament_id = $4
       RETURNING *`,
      [player1Id, player2Id, matchId, id]
    );
    
    if (updateResult.rows.length === 0) {
      return res.status(500).json({ error: 'Failed to update match' });
    }
    
    res.json({
      success: true,
      match: updateResult.rows[0],
      message: 'Match updated successfully'
    });
    
  } catch (err) {
    console.error('Error updating championship match:', err);
    res.status(500).json({ error: 'Failed to update match' });
  }
});

// Helper function to calculate net score for match play
function calculateNetScore(grossScore, handicap, holeIndex, opponentHandicap = 0) {
  if (holeIndex === 0) return grossScore;
  
  // Calculate the handicap differential (max 8 strokes for match play)
  const rawDifferential = Math.abs(handicap - opponentHandicap);
  const handicapDifferential = Math.min(Math.round(rawDifferential), 8);
  
  // Determine which player gets strokes (the higher handicap player)
  const playerGetsStrokes = handicap > opponentHandicap;
  
  if (!playerGetsStrokes) {
    // This player doesn't get strokes, return gross score
    return grossScore;
  }
  
  // Calculate handicap strokes for this hole
  // Distribute strokes across holes 1-18, with harder holes (lower index) getting strokes first
  const handicapStrokes = Math.floor(handicapDifferential / 18) + 
    (handicapDifferential % 18 >= holeIndex ? 1 : 0);
  
  // Return net score (gross - handicap strokes), minimum 1
  return Math.max(1, grossScore - handicapStrokes);
}

// Helper function to calculate net score with proper course handicap indexes
function calculateNetScoreWithIndex(grossScore, playerHandicap, holeIndex, handicapDifferential, playerGetsStrokes) {
  if (holeIndex === 0) return grossScore;
  
  if (!playerGetsStrokes) {
    // This player doesn't get strokes, return gross score
    return grossScore;
  }
  
  // Calculate handicap strokes for this hole based on course handicap index
  // Distribute strokes across holes based on their handicap index (1-18)
  // Note: handicapDifferential should already be rounded when passed to this function
  const handicapStrokes = Math.floor(handicapDifferential / 18) + 
    (handicapDifferential % 18 >= holeIndex ? 1 : 0);
  
  // Return net score (gross - handicap strokes), minimum 1
  return Math.max(1, grossScore - handicapStrokes);
}

// Update championship match result
app.put('/api/tournaments/:id/championship-matches/:matchId/result', async (req, res) => {
  const { id, matchId } = req.params;
  const { 
    player1_score, 
    player2_score, 
    winner_id,
    player1_hole_scores,
    player2_hole_scores,
    player1_net_hole_scores,
    player2_net_hole_scores,
    player1_holes_won,
    player2_holes_won,
    player1_holes_lost,
    player2_holes_lost,
    player1_net_holes,
    player2_net_holes,
    player1_scorecard_photo_url,
    player2_scorecard_photo_url,
    course_id,
    teebox,
    match_status
  } = req.body;
  
  console.log('Championship match result update request:', {
    matchId,
    tournamentId: id,
    player1_scorecard_photo_url,
    player2_scorecard_photo_url,
    match_status,
    allBodyKeys: Object.keys(req.body)
  });
  
  try {
    // Build dynamic query based on provided fields
    let updateFields = [];
    let values = [];
    let paramCount = 1;

    if (player1_score !== undefined) {
      updateFields.push(`player1_score = $${paramCount++}`);
      values.push(player1_score);
    }
    if (player2_score !== undefined) {
      updateFields.push(`player2_score = $${paramCount++}`);
      values.push(player2_score);
    }
    if (winner_id !== undefined) {
      updateFields.push(`winner_id = $${paramCount++}`);
      values.push(winner_id);
    }
    if (player1_hole_scores !== undefined) {
      updateFields.push(`player1_hole_scores = $${paramCount++}`);
      values.push(player1_hole_scores);
    }
    if (player2_hole_scores !== undefined) {
      updateFields.push(`player2_hole_scores = $${paramCount++}`);
      values.push(player2_hole_scores);
    }
    if (player1_net_hole_scores !== undefined) {
      updateFields.push(`player1_net_hole_scores = $${paramCount++}`);
      values.push(player1_net_hole_scores);
    }
    if (player2_net_hole_scores !== undefined) {
      updateFields.push(`player2_net_hole_scores = $${paramCount++}`);
      values.push(player2_net_hole_scores);
    }
    if (player1_holes_won !== undefined) {
      updateFields.push(`player1_holes_won = $${paramCount++}`);
      values.push(player1_holes_won);
    }
    if (player2_holes_won !== undefined) {
      updateFields.push(`player2_holes_won = $${paramCount++}`);
      values.push(player2_holes_won);
    }
    if (player1_holes_lost !== undefined) {
      updateFields.push(`player1_holes_lost = $${paramCount++}`);
      values.push(player1_holes_lost);
    }
    if (player2_holes_lost !== undefined) {
      updateFields.push(`player2_holes_lost = $${paramCount++}`);
      values.push(player2_holes_lost);
    }
    if (player1_net_holes !== undefined) {
      updateFields.push(`player1_net_holes = $${paramCount++}`);
      values.push(player1_net_holes);
    }
    if (player2_net_holes !== undefined) {
      updateFields.push(`player2_net_holes = $${paramCount++}`);
      values.push(player2_net_holes);
    }
    if (course_id !== undefined) {
      updateFields.push(`course_id = $${paramCount++}`);
      values.push(course_id);
    }
    if (teebox !== undefined) {
      updateFields.push(`teebox = $${paramCount++}`);
      values.push(teebox);
    }
    if (match_status !== undefined) {
      updateFields.push(`match_status = $${paramCount++}`);
      values.push(match_status);
    }
    if (player1_scorecard_photo_url !== undefined) {
      updateFields.push(`player1_scorecard_photo_url = $${paramCount++}`);
      values.push(player1_scorecard_photo_url);
    }
    if (player2_scorecard_photo_url !== undefined) {
      updateFields.push(`player2_scorecard_photo_url = $${paramCount++}`);
      values.push(player2_scorecard_photo_url);
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    // Add match ID and tournament ID as final parameters
    values.push(matchId, id);

    const query = `
      UPDATE club_championship_matches 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount++} AND tournament_id = $${paramCount++}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Championship match not found' });
    }
    
    const updatedMatch = result.rows[0];
    
    // Check if both players have submitted their scores and auto-complete the match
    if (updatedMatch.player1_hole_scores && updatedMatch.player2_hole_scores && updatedMatch.match_status === 'in_progress') {
      try {
        // Debug logging
        console.log('Attempting to auto-complete match:', {
          matchId,
          player1_hole_scores: updatedMatch.player1_hole_scores,
          player2_hole_scores: updatedMatch.player2_hole_scores,
          player1_type: typeof updatedMatch.player1_hole_scores,
          player2_type: typeof updatedMatch.player2_hole_scores
        });
        
        // Calculate match results - handle both JSON strings and arrays
        let player1Scores, player2Scores;
        
        // Handle player1 scores - could be JSON string or already parsed array
        if (typeof updatedMatch.player1_hole_scores === 'string') {
          try {
            player1Scores = JSON.parse(updatedMatch.player1_hole_scores);
          } catch (e) {
            console.error('Error parsing player1_hole_scores:', updatedMatch.player1_hole_scores, e);
            player1Scores = [];
          }
        } else if (Array.isArray(updatedMatch.player1_hole_scores)) {
          player1Scores = updatedMatch.player1_hole_scores;
        } else {
          console.error('Invalid player1_hole_scores type:', typeof updatedMatch.player1_hole_scores);
          player1Scores = [];
        }
        
        // Handle player2 scores - could be JSON string or already parsed array
        if (typeof updatedMatch.player2_hole_scores === 'string') {
          try {
            player2Scores = JSON.parse(updatedMatch.player2_hole_scores);
          } catch (e) {
            console.error('Error parsing player2_hole_scores:', updatedMatch.player2_hole_scores, e);
            player2Scores = [];
          }
        } else if (Array.isArray(updatedMatch.player2_hole_scores)) {
          player2Scores = updatedMatch.player2_hole_scores;
        } else {
          console.error('Invalid player2_hole_scores type:', typeof updatedMatch.player2_hole_scores);
          player2Scores = [];
        }
        
        // Validate that we have valid score arrays
        if (!Array.isArray(player1Scores) || !Array.isArray(player2Scores)) {
          console.error('Invalid score arrays:', { player1Scores, player2Scores });
          return res.json({
            success: true,
            match: updatedMatch,
            message: `Updated championship match result`
          });
        }
        
        let player1HolesWon = 0;
        let player2HolesWon = 0;
        
        // Get both players' handicaps for proper net score calculation
        const player1HandicapResult = await pool.query(
          'SELECT sim_handicap, handicap FROM users WHERE member_id = $1',
          [updatedMatch.player1_id]
        );
        const player2HandicapResult = await pool.query(
          'SELECT sim_handicap, handicap FROM users WHERE member_id = $1',
          [updatedMatch.player2_id]
        );
        
        const player1Handicap = parseFloat(player1HandicapResult.rows[0]?.sim_handicap || player1HandicapResult.rows[0]?.handicap || 0);
        const player2Handicap = parseFloat(player2HandicapResult.rows[0]?.sim_handicap || player2HandicapResult.rows[0]?.handicap || 0);
        
        // Get course data for handicap index calculation
        let courseData = null;
        console.log('Course data lookup:', {
          matchCourseId: updatedMatch.course_id,
          hasCourseId: !!updatedMatch.course_id
        });
        
        if (updatedMatch.course_id) {
          const courseResult = await pool.query(
            'SELECT hole_indexes, par_values FROM simulator_courses_combined WHERE id = $1',
            [updatedMatch.course_id]
          );
          if (courseResult.rows.length > 0) {
            courseData = courseResult.rows[0];
            console.log('Course data found:', {
              courseId: updatedMatch.course_id,
              holeIndexes: courseData.hole_indexes,
              parValues: courseData.par_values
            });
          }
        } else {
          // Try to get course data from the tournament
          console.log('No course_id in match, trying to get course from tournament');
          const tournamentResult = await pool.query(
            'SELECT course_id, trackman_course_id, gspro_course_id FROM tournaments WHERE id = $1',
            [id]
          );
          
          if (tournamentResult.rows.length > 0) {
            const tournament = tournamentResult.rows[0];
            const courseId = tournament.course_id || tournament.trackman_course_id || tournament.gspro_course_id;
            
            if (courseId) {
              console.log('Found tournament course_id:', courseId);
              const courseResult = await pool.query(
                'SELECT hole_indexes, par_values FROM simulator_courses_combined WHERE id = $1',
                [courseId]
              );
              if (courseResult.rows.length > 0) {
                courseData = courseResult.rows[0];
                console.log('Tournament course data found:', {
                  courseId: courseId,
                  holeIndexes: courseData.hole_indexes,
                  parValues: courseData.par_values
                });
              }
            }
          }
          
          // If still no course data, try to get a default course
          if (!courseData) {
            console.log('No tournament course found, trying default course');
            const defaultCourseResult = await pool.query(
              'SELECT hole_indexes, par_values FROM simulator_courses_combined WHERE is_default = true LIMIT 1'
            );
            if (defaultCourseResult.rows.length > 0) {
              courseData = defaultCourseResult.rows[0];
              console.log('Default course data found:', {
                holeIndexes: courseData.hole_indexes,
                parValues: courseData.par_values
              });
            } else {
              // Last resort: get any course with handicap indexes
              console.log('No default course found, trying any course with handicap indexes');
              const anyCourseResult = await pool.query(
                'SELECT hole_indexes, par_values FROM simulator_courses_combined WHERE hole_indexes IS NOT NULL LIMIT 1'
              );
              if (anyCourseResult.rows.length > 0) {
                courseData = anyCourseResult.rows[0];
                console.log('Any course with handicap indexes found:', {
                  holeIndexes: courseData.hole_indexes,
                  parValues: courseData.par_values
                });
              }
            }
          }
        }
        
        // Default hole indexes if no course data (1-18, with 1 being hardest)
        const holeIndexes = courseData?.hole_indexes || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
        
        console.log('Final hole indexes being used:', {
          holeIndexes: holeIndexes.slice(0, 10), // Show first 10
          source: courseData ? 'course_data' : 'default',
          courseId: updatedMatch.course_id
        });
        
        console.log('Player handicaps:', { 
          player1: player1Handicap, 
          player2: player2Handicap,
          player1_id: updatedMatch.player1_id,
          player2_id: updatedMatch.player2_id
        });
        
        console.log('Score arrays:', {
          player1Scores: player1Scores.slice(0, 5), // Show first 5 scores
          player2Scores: player2Scores.slice(0, 5), // Show first 5 scores
          player1Length: player1Scores.length,
          player2Length: player2Scores.length
        });
        
        // Calculate handicap differential (max 8 strokes for match play)
        const rawDifferential = Math.abs(player1Handicap - player2Handicap);
        const handicapDifferential = Math.min(Math.round(rawDifferential), 8);
        const higherHandicapPlayer = player1Handicap > player2Handicap ? 1 : 2;
        
        console.log('Handicap calculation:', {
          player1Handicap,
          player2Handicap,
          handicapDifferential,
          higherHandicapPlayer,
          holeIndexes: holeIndexes.slice(0, 5) // Show first 5 hole indexes
        });
        
        // Recalculate net scores with proper handicap differentials and course indexes
        const recalculatedPlayer1NetScores = player1Scores.map((score, index) => {
          if (score === 0) return 0;
          const holeNumber = index + 1; // Hole numbers are 1-18
          const holeHandicapIndex = holeIndexes[index] || (index + 1); // The handicap index for this hole
          const netScore = calculateNetScoreWithIndex(score, player1Handicap, holeHandicapIndex, handicapDifferential, higherHandicapPlayer === 1);
          return netScore;
        });
        
        const recalculatedPlayer2NetScores = player2Scores.map((score, index) => {
          if (score === 0) return 0;
          const holeNumber = index + 1; // Hole numbers are 1-18
          const holeHandicapIndex = holeIndexes[index] || (index + 1); // The handicap index for this hole
          const netScore = calculateNetScoreWithIndex(score, player2Handicap, holeHandicapIndex, handicapDifferential, higherHandicapPlayer === 2);
          return netScore;
        });
        
        console.log('Net score calculation:', {
          player1Handicap: player1Handicap,
          player2Handicap: player2Handicap,
          handicapDifferential: handicapDifferential,
          higherHandicapPlayer: higherHandicapPlayer,
          player1GetsStrokes: higherHandicapPlayer === 1,
          player2GetsStrokes: higherHandicapPlayer === 2,
          player1NetScores: recalculatedPlayer1NetScores.slice(0, 5), // First 5 holes
          player2NetScores: recalculatedPlayer2NetScores.slice(0, 5), // First 5 holes
          player1GrossScores: player1Scores.slice(0, 5),
          player2GrossScores: player2Scores.slice(0, 5)
        });
        
        // Show detailed calculation for first few holes
        console.log('Detailed net score calculation (first 3 holes):');
        for (let i = 0; i < Math.min(3, player1Scores.length); i++) {
          const holeNumber = i + 1;
          const holeHandicapIndex = holeIndexes[i] || (i + 1);
          const p1Gross = player1Scores[i];
          const p2Gross = player2Scores[i];
          const p1Net = recalculatedPlayer1NetScores[i];
          const p2Net = recalculatedPlayer2NetScores[i];
          
          console.log(`Hole ${holeNumber} (Index ${holeHandicapIndex}): P1 ${p1Gross}->${p1Net}, P2 ${p2Gross}->${p2Net}`);
        }
        
        // Simple match play scoring - compare hole by hole using net scores
        for (let i = 0; i < Math.min(recalculatedPlayer1NetScores.length, recalculatedPlayer2NetScores.length); i++) {
          if (recalculatedPlayer1NetScores[i] > 0 && recalculatedPlayer2NetScores[i] > 0) { // Both players played the hole
            if (recalculatedPlayer1NetScores[i] < recalculatedPlayer2NetScores[i]) {
              player1HolesWon++;
            } else if (recalculatedPlayer2NetScores[i] < recalculatedPlayer1NetScores[i]) {
              player2HolesWon++;
            }
          }
        }
        
        const player1HolesLost = player2HolesWon;
        const player2HolesLost = player1HolesWon;
        const player1NetHoles = player1HolesWon - player1HolesLost;
        const player2NetHoles = player2HolesWon - player2HolesLost;
        
        // Determine winner
        let winnerId = null;
        if (player1NetHoles > player2NetHoles) {
          winnerId = updatedMatch.player1_id;
        } else if (player2NetHoles > player1NetHoles) {
          winnerId = updatedMatch.player2_id;
        }
        
        // Update match with calculated results and recalculated net scores
        await pool.query(`
          UPDATE club_championship_matches 
          SET player1_holes_won = $1, player2_holes_won = $2, 
              player1_holes_lost = $3, player2_holes_lost = $4,
              player1_net_holes = $5, player2_net_holes = $6,
              player1_net_hole_scores = $7, player2_net_hole_scores = $8,
              winner_id = $9, match_status = 'completed'
          WHERE id = $10
        `, [player1HolesWon, player2HolesWon, player1HolesLost, player2HolesLost, 
            player1NetHoles, player2NetHoles, 
            JSON.stringify(recalculatedPlayer1NetScores), 
            JSON.stringify(recalculatedPlayer2NetScores),
            winnerId, matchId]);
        
        // Get the final updated match
        const finalResult = await pool.query(
          'SELECT * FROM club_championship_matches WHERE id = $1',
          [matchId]
        );
        
        return res.json({
          success: true,
          match: finalResult.rows[0],
          message: `Match completed automatically - both players submitted scores`
        });
        
      } catch (error) {
        console.error('Error processing match completion:', error);
        // If there's an error in processing, just return the updated match without auto-completion
        return res.json({
          success: true,
          match: updatedMatch,
          message: `Updated championship match result`
        });
      }
    }
    
    res.json({
      success: true,
      match: updatedMatch,
      message: `Updated championship match result`
    });
    
  } catch (err) {
    console.error('Error updating championship match result:', err);
    res.status(500).json({ error: 'Failed to update championship match result' });
  }
});

// Get championship standings
app.get('/api/tournaments/:id/championship-standings', async (req, res) => {
  const { id } = req.params;
  
  try {
    // Get all club groups for this tournament
    const groupsResult = await pool.query(`
      SELECT id, group_name, participating_clubs, participant_count, user_ids
      FROM club_groups 
      WHERE tournament_id = $1
      ORDER BY group_name
    `, [id]);

    const standings = [];

    for (const group of groupsResult.rows) {
      // Get participants for this group from participation table
      const participantsResult = await pool.query(`
        SELECT 
          p.user_member_id as user_id,
          u.first_name,
          u.last_name,
          u.club
        FROM participation p
        JOIN users u ON p.user_member_id = u.member_id
        WHERE p.tournament_id = $1 
        AND p.user_member_id = ANY($2)
        ORDER BY u.first_name, u.last_name
      `, [id, group.user_ids || []]);

      // Calculate match statistics for each participant
      const participantsWithStats = [];
      
      for (const participant of participantsResult.rows) {
        // Get match statistics from club_championship_matches
        const matchStatsResult = await pool.query(`
          SELECT 
            COUNT(*) as total_matches,
            COUNT(CASE WHEN winner_id = $1 THEN 1 END) as match_wins,
            COUNT(CASE WHEN winner_id != $1 AND winner_id IS NOT NULL THEN 1 END) as match_losses,
            COUNT(CASE WHEN winner_id IS NULL AND match_status = 'completed' THEN 1 END) as match_ties,
            COALESCE(SUM(CASE WHEN player1_id = $1 THEN player1_holes_won ELSE player2_holes_won END), 0) as total_holes_won,
            COALESCE(SUM(CASE WHEN player1_id = $1 THEN player1_holes_lost ELSE player2_holes_lost END), 0) as total_holes_lost,
            COALESCE(SUM(CASE WHEN player1_id = $1 THEN player1_net_holes ELSE player2_net_holes END), 0) as net_holes
          FROM club_championship_matches 
          WHERE tournament_id = $2 
          AND (player1_id = $1 OR player2_id = $1)
          AND match_status = 'completed'
        `, [participant.user_id, id]);

        const stats = matchStatsResult.rows[0];
        
        // Calculate tiebreaker points (total holes won)
        const tiebreakerPoints = parseInt(stats.total_holes_won) || 0;
        
        participantsWithStats.push({
          ...participant,
          match_wins: parseInt(stats.match_wins) || 0,
          match_losses: parseInt(stats.match_losses) || 0,
          match_ties: parseInt(stats.match_ties) || 0,
          total_matches: parseInt(stats.total_matches) || 0,
          tiebreaker_points: tiebreakerPoints,
          total_holes_won: parseInt(stats.total_holes_won) || 0,
          total_holes_lost: parseInt(stats.total_holes_lost) || 0,
          net_holes: parseInt(stats.net_holes) || 0
        });
      }

      // Sort participants by wins, then tiebreaker points, then net holes
      participantsWithStats.sort((a, b) => {
        // First by match wins (descending)
        if (b.match_wins !== a.match_wins) {
          return b.match_wins - a.match_wins;
        }
        // Then by tiebreaker points (descending)
        if (b.tiebreaker_points !== a.tiebreaker_points) {
          return b.tiebreaker_points - a.tiebreaker_points;
        }
        // Finally by net holes (descending)
        return b.net_holes - a.net_holes;
      });

      standings.push({
        group_id: group.id,
        group_name: group.group_name,
        participants: participantsWithStats
      });
    }

    res.json(standings);
  } catch (err) {
    console.error('Error fetching championship standings:', err);
    res.status(500).json({ error: 'Failed to fetch championship standings' });
  }
});

// Determine club champions
app.post('/api/tournaments/:id/determine-champions', async (req, res) => {
  const { id } = req.params;
  
  try {
    // Get all completed matches with results
    const matchesResult = await pool.query(`
      SELECT 
        ccm.*,
        u1.first_name as player1_name,
        u1.last_name as player1_last_name,
        u2.first_name as player2_name,
        u2.last_name as player2_last_name
      FROM club_championship_matches ccm
      JOIN users u1 ON ccm.player1_id = u1.member_id
      JOIN users u2 ON ccm.player2_id = u2.member_id
      WHERE ccm.tournament_id = $1 AND ccm.match_status = 'completed'
    `, [id]);
    
    const matches = matchesResult.rows;
    
    // Calculate standings for each group
    const groupStandings = {};
    
    for (const match of matches) {
      const group = match.club_group;
      if (!groupStandings[group]) {
        groupStandings[group] = {};
      }
      
      const standings = groupStandings[group];
      
      // Initialize players if not exists
      if (!standings[match.player1_id]) {
        standings[match.player1_id] = {
          user_id: match.player1_id,
          name: `${match.player1_name} ${match.player1_last_name}`,
          match_wins: 0,
          match_losses: 0,
          match_ties: 0,
          tiebreaker_points: 0,
          total_holes_won: 0,
          total_holes_lost: 0
        };
      }
      
      if (!standings[match.player2_id]) {
        standings[match.player2_id] = {
          user_id: match.player2_id,
          name: `${match.player2_name} ${match.player2_last_name}`,
          match_wins: 0,
          match_losses: 0,
          match_ties: 0,
          tiebreaker_points: 0,
          total_holes_won: 0,
          total_holes_lost: 0
        };
      }
      
      // Update standings based on match result
      if (match.winner_id === match.player1_id) {
        standings[match.player1_id].match_wins++;
        standings[match.player2_id].match_losses++;
        standings[match.player1_id].tiebreaker_points += match.player1_net_holes;
        standings[match.player2_id].tiebreaker_points += match.player2_net_holes;
      } else if (match.winner_id === match.player2_id) {
        standings[match.player2_id].match_wins++;
        standings[match.player1_id].match_losses++;
        standings[match.player2_id].tiebreaker_points += match.player2_net_holes;
        standings[match.player1_id].tiebreaker_points += match.player1_net_holes;
      } else {
        // Tie
        standings[match.player1_id].match_ties++;
        standings[match.player2_id].match_ties++;
      }
      
      standings[match.player1_id].total_holes_won += match.player1_holes_won;
      standings[match.player1_id].total_holes_lost += match.player1_holes_lost;
      standings[match.player2_id].total_holes_won += match.player2_holes_won;
      standings[match.player2_id].total_holes_lost += match.player2_holes_lost;
    }
    
    // Determine champions for each group
    const champions = [];
    
    for (const [groupName, standings] of Object.entries(groupStandings)) {
      const players = Object.values(standings);
      
      // Sort by match record, then tiebreaker points
      players.sort((a, b) => {
        if (a.match_wins !== b.match_wins) return b.match_wins - a.match_wins;
        if (a.match_ties !== b.match_ties) return b.match_ties - a.match_ties;
        return b.tiebreaker_points - a.tiebreaker_points;
      });
      
      const champion = players[0];
      champions.push({
        group_name: groupName,
        champion: champion,
        standings: players
      });
      
      // Update database with championship results
      await pool.query(`
        UPDATE club_championship_participants 
        SET 
          match_wins = $1,
          match_losses = $2,
          match_ties = $3,
          tiebreaker_points = $4,
          total_holes_won = $5,
          total_holes_lost = $6,
          net_holes = $7,
          is_club_champion = $8,
          championship_rank = $9
        WHERE tournament_id = $10 AND user_id = $11
      `, [
        champion.match_wins,
        champion.match_losses,
        champion.match_ties,
        champion.tiebreaker_points,
        champion.total_holes_won,
        champion.total_holes_lost,
        champion.total_holes_won - champion.total_holes_lost,
        true,
        1
      ]);
    }
    
    res.json({
      success: true,
      champions: champions,
      message: `Determined ${champions.length} club champions`
    });
    
  } catch (err) {
    console.error('Error determining champions:', err);
    res.status(500).json({ error: 'Failed to determine champions' });
  }
});

// Update tournament status
app.put('/api/tournaments/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }
  
  const validStatuses = ['draft', 'active', 'completed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status. Must be one of: ' + validStatuses.join(', ') });
  }
  
  try {
    const { rows } = await pool.query(
      'UPDATE tournaments SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [status, id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    
    res.json(rows[0]);
  } catch (err) {
    console.error('Error updating tournament status:', err);
    res.status(500).json({ error: 'Failed to update tournament status' });
  }
});
// Toggle registration open/closed
app.put('/api/tournaments/:id/registration', async (req, res) => {
  const { id } = req.params;
  const { registration_open } = req.body;
  
  if (typeof registration_open !== 'boolean') {
    return res.status(400).json({ error: 'registration_open must be a boolean' });
  }
  
  try {
    const { rows } = await pool.query(
      'UPDATE tournaments SET registration_open = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [registration_open, id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    
    res.json(rows[0]);
  } catch (err) {
    console.error('Error updating tournament registration:', err);
    res.status(500).json({ error: 'Failed to update tournament registration' });
  }
});

// Get tournament formation statistics
app.get('/api/tournaments/:id/formation-stats', async (req, res) => {
  const { id } = req.params;
  
  try {
    // Get tournament details
    const tournamentResult = await pool.query(
      'SELECT * FROM tournaments WHERE id = $1',
      [id]
    );
    
    if (tournamentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    
    const tournament = tournamentResult.rows[0];
    
    // Get participant count
    const participantResult = await pool.query(
      'SELECT COUNT(*) as count FROM participation WHERE tournament_id = $1',
      [id]
    );
    
    const participantCount = parseInt(participantResult.rows[0].count);
    
    // Calculate formation progress
    const stats = {
      tournament: {
        id: tournament.id,
        name: tournament.name,
        status: tournament.status,
        registration_open: tournament.registration_open,
        registration_deadline: tournament.registration_deadline,
        min_participants: tournament.min_participants,
        max_participants: tournament.max_participants
      },
      participants: {
        current: participantCount,
        min_required: tournament.min_participants || 2,
        max_allowed: tournament.max_participants,
        spots_remaining: tournament.max_participants ? tournament.max_participants - participantCount : null
      },
      formation: {
        can_start: participantCount >= (tournament.min_participants || 2),
        is_full: tournament.max_participants ? participantCount >= tournament.max_participants : false,
        registration_deadline_passed: tournament.registration_deadline ? (() => {
          const deadlineDate = new Date(tournament.registration_deadline);
          const currentDate = new Date();
          const deadlineDay = new Date(deadlineDate.getFullYear(), deadlineDate.getMonth(), deadlineDate.getDate());
          const currentDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
          return currentDay > deadlineDay;
        })() : false
      }
    };
    
    res.json(stats);
  } catch (err) {
    console.error('Error fetching tournament formation stats:', err);
    res.status(500).json({ error: 'Failed to fetch tournament formation stats' });
  }
});

// Submit payment for tournament
app.post('/api/tournaments/:id/payment', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { user_id, payment_method, payment_amount, payment_notes } = req.body;
  
  if (!user_id || !payment_method || !payment_amount) {
    return res.status(400).json({ error: 'Missing required payment information' });
  }
  
  try {
    // Check if user is registered for tournament
    const participantCheck = await pool.query(
      'SELECT * FROM participation WHERE tournament_id = $1 AND user_member_id = $2',
      [id, user_id]
    );
    
    if (participantCheck.rows.length === 0) {
      return res.status(400).json({ error: 'User is not registered for this tournament' });
    }
    
    // Check if payment already submitted
    const paymentCheck = await pool.query(
      'SELECT * FROM participation WHERE tournament_id = $1 AND user_member_id = $2 AND payment_submitted = true',
      [id, user_id]
    );
    
    if (paymentCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Payment already submitted for this tournament' });
    }
    
    // Update participation record to mark payment as submitted
    await pool.query(
      `UPDATE participation SET 
        payment_submitted = true,
        payment_method = $1,
        payment_amount = $2,
        payment_notes = $3,
        payment_submitted_at = CURRENT_TIMESTAMP
       WHERE tournament_id = $4 AND user_member_id = $5`,
      [payment_method, payment_amount, payment_notes, id, user_id]
    );
    
    res.json({ 
      success: true, 
      message: 'Payment submitted successfully. Tournament admin will verify your payment.' 
    });
  } catch (err) {
    console.error('Error submitting payment:', err);
    res.status(500).json({ error: 'Failed to submit payment' });
  }
});

// Get payment status for user
app.get('/api/tournaments/:id/payment-status/:userId', authenticateToken, async (req, res) => {
  const { id, userId } = req.params;
  
  try {
    const { rows } = await pool.query(
      `SELECT 
        payment_submitted,
        payment_method,
        payment_amount,
        payment_notes,
        payment_submitted_at
       FROM participation 
       WHERE tournament_id = $1 AND user_member_id = $2`,
      [id, userId]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found in tournament' });
    }
    
    res.json(rows[0]);
  } catch (err) {
    console.error('Error fetching payment status:', err);
    res.status(500).json({ error: 'Failed to fetch payment status' });
  }
});

// Get all check-in statuses for a user across all tournaments
app.get('/api/users/:userId/check-in-statuses', authenticateToken, async (req, res) => {
  const { userId } = req.params;
  
  try {
    const { rows } = await pool.query(
      `SELECT 
        p.tournament_id,
        c.status as check_in_status,
        c.check_in_time,
        c.notes,
        t.name as tournament_name,
        t.entry_fee
       FROM participation p
       JOIN tournaments t ON p.tournament_id = t.id
       LEFT JOIN check_ins c ON p.tournament_id = c.tournament_id AND p.user_member_id = c.user_member_id
       WHERE p.user_member_id = $1`,
      [userId]
    );
    
    res.json(rows);
  } catch (err) {
    console.error('Error fetching check-in statuses:', err);
    res.status(500).json({ error: 'Failed to fetch check-in statuses' });
  }
});

// Calculate and update handicaps for a single user
async function calculateAndUpdateUserHandicap(userId) {
  try {
    // Get user info
    const { rows: userRows } = await pool.query(
      'SELECT member_id, first_name, last_name FROM users WHERE member_id = $1',
      [userId]
    );

    if (userRows.length === 0) {
      console.log(`User ${userId} not found for handicap calculation`);
      return;
    }

    const user = userRows[0];

    // Calculate sim handicap
    const { rows: simScorecards } = await pool.query(`
      SELECT differential, date_played, holes_played, nine_type
      FROM scorecards
      WHERE user_id = $1 
        AND differential IS NOT NULL 
        AND (round_type = 'sim' OR round_type IS NULL)
      ORDER BY date_played DESC
      LIMIT 20
    `, [userId]);

    // Calculate grass handicap
    const { rows: grassScorecards } = await pool.query(`
      SELECT differential, date_played, holes_played, nine_type
      FROM scorecards
      WHERE user_id = $1 
        AND differential IS NOT NULL 
        AND round_type = 'grass'
      ORDER BY date_played DESC
      LIMIT 20
    `, [userId]);

    // Calculate sim handicap
    let simHandicap = 0;
    if (simScorecards.length > 0) {
      const simDifferentials = simScorecards
        .map(s => parseFloat(s.differential))
        .filter(diff => !isNaN(diff) && isFinite(diff))
        .sort((a, b) => a - b);

      if (simDifferentials.length > 0) {
        simHandicap = calculateHandicapFromDifferentials(simDifferentials);
      }
    }

    // Calculate grass handicap
    let grassHandicap = 0;
    if (grassScorecards.length > 0) {
      const grassDifferentials = grassScorecards
        .map(s => parseFloat(s.differential))
        .filter(diff => !isNaN(diff) && isFinite(diff))
        .sort((a, b) => a - b);

      if (grassDifferentials.length > 0) {
        grassHandicap = calculateHandicapFromDifferentials(grassDifferentials);
      }
    }

    // Update the user's handicaps
    await pool.query(
      'UPDATE users SET sim_handicap = $1, grass_handicap = $2 WHERE member_id = $3',
      [simHandicap, grassHandicap, userId]
    );

    // Log 9-hole round information
    const simNineHoleRounds = simScorecards.filter(s => s.holes_played === 9).length;
    const grassNineHoleRounds = grassScorecards.filter(s => s.holes_played === 9).length;
    
    console.log(`${user.first_name} ${user.last_name}: Sim: ${simHandicap} (${simScorecards.length} rounds, ${simNineHoleRounds} 9-hole), Grass: ${grassHandicap} (${grassScorecards.length} rounds, ${grassNineHoleRounds} 9-hole)`);
  } catch (error) {
    console.error('Error calculating handicap for user:', error);
  }
}

// Calculate and update user handicaps based on scorecard differentials
async function calculateAndUpdateHandicaps() {
  try {
    // Get all users who have scorecards
    const { rows: users } = await pool.query(`
      SELECT DISTINCT u.member_id, u.first_name, u.last_name
      FROM users u
      INNER JOIN scorecards s ON u.member_id = s.user_id
      WHERE s.differential IS NOT NULL
      ORDER BY u.member_id
    `);

    console.log(`Calculating handicaps for ${users.length} users...`);

    for (const user of users) {
      // Calculate sim handicap
      const { rows: simScorecards } = await pool.query(`
        SELECT differential, date_played, holes_played, nine_type
        FROM scorecards
        WHERE user_id = $1 
          AND differential IS NOT NULL 
          AND (round_type = 'sim' OR round_type IS NULL)
        ORDER BY date_played DESC
        LIMIT 20
      `, [user.member_id]);

      // Calculate grass handicap
      const { rows: grassScorecards } = await pool.query(`
        SELECT differential, date_played, holes_played, nine_type
        FROM scorecards
        WHERE user_id = $1 
          AND differential IS NOT NULL 
          AND round_type = 'grass'
        ORDER BY date_played DESC
        LIMIT 20
      `, [user.member_id]);

      // Calculate sim handicap
      let simHandicap = 0;
      if (simScorecards.length > 0) {
        const simDifferentials = simScorecards
          .map(s => parseFloat(s.differential))
          .filter(diff => !isNaN(diff) && isFinite(diff))
          .sort((a, b) => a - b);

        if (simDifferentials.length > 0) {
          simHandicap = calculateHandicapFromDifferentials(simDifferentials);
        }
      }

      // Calculate grass handicap
      let grassHandicap = 0;
      if (grassScorecards.length > 0) {
        const grassDifferentials = grassScorecards
          .map(s => parseFloat(s.differential))
          .filter(diff => !isNaN(diff) && isFinite(diff))
          .sort((a, b) => a - b);

        if (grassDifferentials.length > 0) {
          grassHandicap = calculateHandicapFromDifferentials(grassDifferentials);
        }
      }

      // Update the user's handicaps
      await pool.query(
        'UPDATE users SET sim_handicap = $1, grass_handicap = $2 WHERE member_id = $3',
        [simHandicap, grassHandicap, user.member_id]
      );

      // Log 9-hole round information
      const simNineHoleRounds = simScorecards.filter(s => s.holes_played === 9).length;
      const grassNineHoleRounds = grassScorecards.filter(s => s.holes_played === 9).length;
      
      console.log(`${user.first_name} ${user.last_name}: Sim: ${simHandicap} (${simScorecards.length} rounds, ${simNineHoleRounds} 9-hole), Grass: ${grassHandicap} (${grassScorecards.length} rounds, ${grassNineHoleRounds} 9-hole)`);
    }

    console.log('Handicap calculation complete!');
  } catch (error) {
    console.error('Error calculating handicaps:', error);
  }
}

// Helper function to calculate handicap from differentials
function calculateHandicapFromDifferentials(differentials) {
  if (differentials.length >= 20) {
    // Use best 8 out of last 20
    const best8 = differentials.slice(0, 8);
    const average = best8.reduce((sum, diff) => sum + diff, 0) / 8;
    return Math.round(average * 0.96 * 10) / 10; // USGA formula
  } else if (differentials.length >= 15) {
    // Use best 7 out of last 15
    const best7 = differentials.slice(0, 7);
    const average = best7.reduce((sum, diff) => sum + diff, 0) / 7;
    return Math.round(average * 0.96 * 10) / 10;
  } else if (differentials.length >= 10) {
    // Use best 6 out of last 10
    const best6 = differentials.slice(0, 6);
    const average = best6.reduce((sum, diff) => sum + diff, 0) / 6;
    return Math.round(average * 0.96 * 10) / 10;
  } else if (differentials.length >= 5) {
    // Use best 5 out of last 5
    const best5 = differentials.slice(0, 5);
    const average = best5.reduce((sum, diff) => sum + diff, 0) / 5;
    return Math.round(average * 0.96 * 10) / 10;
  } else if (differentials.length >= 3) {
    // Use best 3 out of last 3
    const best3 = differentials.slice(0, 3);
    const average = best3.reduce((sum, diff) => sum + diff, 0) / 3;
    return Math.round(average * 0.96 * 10) / 10;
  } else if (differentials.length >= 1) {
    // Use best 1 out of last 1
    const best1 = differentials[0];
    return Math.round(best1 * 0.96 * 10) / 10;
  } else {
    // No differentials available
    return 0;
  }
}

// Calculate handicaps endpoint (for all users - admin use only)
app.post('/api/calculate-handicaps', async (req, res) => {
  try {
    await calculateAndUpdateHandicaps();
    res.json({ success: true, message: 'Handicaps calculated and updated successfully' });
  } catch (error) {
    console.error('Error in calculate handicaps endpoint:', error);
    res.status(500).json({ error: 'Failed to calculate handicaps' });
  }
});

// Calculate handicap for specific user endpoint
app.post('/api/calculate-handicaps/:userId', authenticateToken, async (req, res) => {
  const { userId } = req.params;
  
  // Only allow users to calculate their own handicap or admins to calculate any
  if (req.user.member_id !== parseInt(userId) && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  try {
    await calculateAndUpdateUserHandicap(parseInt(userId));
    res.json({ success: true, message: 'Handicap calculated and updated successfully' });
  } catch (error) {
    console.error('Error in calculate user handicap endpoint:', error);
    res.status(500).json({ error: 'Failed to calculate handicap' });
  }
});

// Get user handicaps
app.get('/api/handicaps', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT u.member_id, u.first_name, u.last_name, 
             u.sim_handicap, u.grass_handicap,
             COUNT(s.id) as total_rounds,
             COUNT(CASE WHEN s.round_type = 'sim' OR s.round_type IS NULL THEN 1 END) as sim_rounds,
             COUNT(CASE WHEN s.round_type = 'grass' THEN 1 END) as grass_rounds,
             MIN(s.differential) as best_differential,
             AVG(s.differential) as avg_differential
      FROM users u
      LEFT JOIN scorecards s ON u.member_id = s.user_id AND s.differential IS NOT NULL
      GROUP BY u.member_id, u.first_name, u.last_name, u.sim_handicap, u.grass_handicap
      ORDER BY u.first_name, u.last_name
    `);
    
    res.json(rows);
  } catch (error) {
    console.error('Error fetching handicaps:', error);
    res.status(500).json({ error: 'Failed to fetch handicaps' });
  }
});

// Get user's course records
app.get('/api/user-course-records/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Only allow users to view their own records or admins to view any
    if (req.user.member_id !== parseInt(userId) && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const { rows } = await pool.query(`
      SELECT 
        cr.course_id,
        cr.club as record_club,
        cr.total_strokes as best_score,
        cr.date_played,
        cr.scorecard_id,
        sc.name as course_name,
        sc.location,
        sc.designer,
        sc.platforms,
        EXTRACT(DAYS FROM NOW() - cr.date_played) as days_standing
      FROM course_records cr
      INNER JOIN simulator_courses_combined sc ON cr.course_id = sc.id
      WHERE cr.user_id = $1 AND cr.is_current = true
      ORDER BY cr.date_played DESC
    `, [userId]);
    
    res.json(rows);
  } catch (error) {
    console.error('Error fetching user course records:', error);
    res.status(500).json({ error: 'Failed to fetch course records' });
  }
});

// Get user simulator round statistics
app.get('/api/users/:id/sim-stats', authenticateToken, async (req, res) => {
  const { id } = req.params;
  
  console.log('Sim stats requested for user ID:', id);
  console.log('Authenticated user:', req.user);
  
  try {
    // Get simulator round statistics for the user
    const { rows } = await pool.query(`
      SELECT 
        COUNT(*) as total_rounds,
        COUNT(CASE WHEN differential IS NOT NULL THEN 1 END) as rounds_with_differential,
        AVG(differential) as avg_differential,
        MIN(differential) as best_differential,
        MAX(differential) as worst_differential,
        AVG(total_strokes) as avg_strokes,
        MIN(total_strokes) as best_strokes,
        MAX(total_strokes) as worst_strokes,
        COUNT(DISTINCT course_name) as unique_courses,
        COUNT(DISTINCT DATE(date_played)) as unique_dates,
        MIN(date_played) as first_round,
        MAX(date_played) as last_round
      FROM scorecards
      WHERE user_id = $1 
        AND (round_type = 'sim' OR round_type IS NULL)
    `, [id]);
    
    console.log('Query result:', rows);
    
    if (rows.length === 0) {
      console.log('No rows returned, sending empty stats');
      return res.json({
        total_rounds: 0,
        rounds_with_differential: 0,
        avg_differential: null,
        best_differential: null,
        worst_differential: null,
        avg_strokes: null,
        best_strokes: null,
        worst_strokes: null,
        unique_courses: 0,
        unique_dates: 0,
        first_round: null,
        last_round: null,
        recent_rounds: []
      });
    }
    
    const stats = rows[0];
    
    // Get recent rounds (last 20)
    const { rows: recentRounds } = await pool.query(`
      SELECT 
        id,
        date_played,
        course_name,
        total_strokes,
        differential,
        round_type
      FROM scorecards
      WHERE user_id = $1 
        AND (round_type = 'sim' OR round_type IS NULL)
      ORDER BY date_played DESC
      LIMIT 20
    `, [id]);
    
    // Get course breakdown
    const { rows: courseBreakdown } = await pool.query(`
      SELECT 
        course_name,
        COUNT(*) as rounds_played,
        AVG(total_strokes) as avg_strokes,
        MIN(total_strokes) as best_strokes,
        AVG(differential) as avg_differential,
        MIN(differential) as best_differential
      FROM scorecards
      WHERE user_id = $1 
        AND (round_type = 'sim' OR round_type IS NULL)
        AND course_name IS NOT NULL
      GROUP BY course_name
      ORDER BY rounds_played DESC
      LIMIT 5
    `, [id]);
    
    res.json({
      ...stats,
      recent_rounds: recentRounds,
      course_breakdown: courseBreakdown
    });
    
  } catch (error) {
    console.error('Error fetching user sim stats:', error);
    res.status(500).json({ error: 'Failed to fetch user simulator statistics' });
  }
});

// Get user outdoor/grass round statistics
app.get('/api/users/:id/grass-stats', authenticateToken, async (req, res) => {
  const { id } = req.params;
  
  console.log('Grass stats requested for user ID:', id);
  console.log('Authenticated user:', req.user);
  
  try {
    // Get outdoor/grass round statistics for the user
    const { rows } = await pool.query(`
      SELECT 
        COUNT(*) as total_rounds,
        COUNT(CASE WHEN differential IS NOT NULL THEN 1 END) as rounds_with_differential,
        AVG(differential) as avg_differential,
        MIN(differential) as best_differential,
        MAX(differential) as worst_differential,
        AVG(total_strokes) as avg_strokes,
        MIN(total_strokes) as best_strokes,
        MAX(total_strokes) as worst_strokes,
        COUNT(DISTINCT course_name) as unique_courses,
        COUNT(DISTINCT DATE(date_played)) as unique_dates,
        MIN(date_played) as first_round,
        MAX(date_played) as last_round
      FROM scorecards
      WHERE user_id = $1 
        AND round_type = 'grass'
    `, [id]);
    
    console.log('Query result:', rows);
    
    if (rows.length === 0) {
      console.log('No rows returned, sending empty stats');
      return res.json({
        total_rounds: 0,
        rounds_with_differential: 0,
        avg_differential: null,
        best_differential: null,
        worst_differential: null,
        avg_strokes: null,
        best_strokes: null,
        worst_strokes: null,
        unique_courses: 0,
        unique_dates: 0,
        first_round: null,
        last_round: null,
        recent_rounds: []
      });
    }
    
    const stats = rows[0];
    
    // Get recent rounds (last 20)
    const { rows: recentRounds } = await pool.query(`
      SELECT 
        id,
        date_played,
        course_name,
        total_strokes,
        differential,
        round_type
      FROM scorecards
      WHERE user_id = $1 
        AND round_type = 'grass'
      ORDER BY date_played DESC
      LIMIT 20
    `, [id]);
    
    // Get course breakdown
    const { rows: courseBreakdown } = await pool.query(`
      SELECT 
        course_name,
        COUNT(*) as rounds_played,
        AVG(total_strokes) as avg_strokes,
        MIN(total_strokes) as best_strokes,
        AVG(differential) as avg_differential,
        MIN(differential) as best_differential
      FROM scorecards
      WHERE user_id = $1 
        AND round_type = 'grass'
        AND course_name IS NOT NULL
      GROUP BY course_name
      ORDER BY rounds_played DESC
      LIMIT 5
    `, [id]);
    
    res.json({
      ...stats,
      recent_rounds: recentRounds,
      course_breakdown: courseBreakdown
    });
    
  } catch (error) {
    console.error('Error fetching user grass stats:', error);
    res.status(500).json({ error: 'Failed to fetch user outdoor statistics' });
  }
});

// Get user combined statistics (sim + grass)
app.get('/api/users/:id/combined-stats', authenticateToken, async (req, res) => {
  const { id } = req.params;
  
  console.log('Combined stats requested for user ID:', id);
  console.log('Authenticated user:', req.user);
  
  try {
    // Get combined statistics for the user
    const { rows } = await pool.query(`
      SELECT 
        COUNT(*) as total_rounds,
        COUNT(CASE WHEN differential IS NOT NULL THEN 1 END) as rounds_with_differential,
        AVG(differential) as avg_differential,
        MIN(differential) as best_differential,
        MAX(differential) as worst_differential,
        AVG(total_strokes) as avg_strokes,
        MIN(total_strokes) as best_strokes,
        MAX(total_strokes) as worst_strokes,
        COUNT(DISTINCT course_name) as unique_courses,
        COUNT(DISTINCT DATE(date_played)) as unique_dates,
        MIN(date_played) as first_round,
        MAX(date_played) as last_round,
        COUNT(CASE WHEN round_type = 'sim' OR round_type IS NULL THEN 1 END) as sim_rounds,
        COUNT(CASE WHEN round_type = 'grass' THEN 1 END) as grass_rounds
      FROM scorecards
      WHERE user_id = $1
    `, [id]);
    
    console.log('Combined stats query result:', rows);
    
    if (rows.length === 0) {
      console.log('No rows returned, sending empty combined stats');
      return res.json({
        total_rounds: 0,
        rounds_with_differential: 0,
        avg_differential: null,
        best_differential: null,
        worst_differential: null,
        avg_strokes: null,
        best_strokes: null,
        worst_strokes: null,
        unique_courses: 0,
        unique_dates: 0,
        first_round: null,
        last_round: null,
        sim_rounds: 0,
        grass_rounds: 0,
        recent_rounds: []
      });
    }
    
    const stats = rows[0];
    
    // Get recent rounds (last 20) from both types
    const { rows: recentRounds } = await pool.query(`
      SELECT 
        id,
        date_played,
        course_name,
        total_strokes,
        differential,
        round_type
      FROM scorecards
      WHERE user_id = $1
      ORDER BY date_played DESC
      LIMIT 20
    `, [id]);
    
    res.json({
      ...stats,
      recent_rounds: recentRounds
    });
    
  } catch (error) {
    console.error('Error fetching user combined stats:', error);
    res.status(500).json({ error: 'Failed to fetch user combined statistics' });
  }
});

// Google Cloud Storage setup using environment variables (conditional)
let gcs = null;
let bucket = null;

if (process.env.GCP_PROJECT_ID && process.env.GCS_BUCKET_NAME && process.env.GCS_KEYFILE_PATH) {
  try {
    gcs = new Storage({
      projectId: process.env.GCP_PROJECT_ID,
      keyFilename: process.env.GCS_KEYFILE_PATH
    });
    bucket = gcs.bucket(process.env.GCS_BUCKET_NAME);
    console.log('Google Cloud Storage initialized successfully');
  } catch (error) {
    console.warn('Google Cloud Storage initialization failed:', error.message);
    gcs = null;
    bucket = null;
  }
} else {
  console.log('Google Cloud Storage not configured - file uploads will be disabled');
}

// Use memory storage for multer
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});
// Upload profile photo endpoint (GCS version)
app.post('/api/users/profile-photo', authenticateToken, upload.single('profilePhoto'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Check if GCS is configured
    if (!gcs || !bucket) {
      return res.status(503).json({ error: 'File upload service is not configured' });
    }

    const userId = req.user.member_id;
    const ext = path.extname(req.file.originalname);
    const gcsFileName = `profile-photos/user_${userId}_${Date.now()}${ext}`;
    const blob = bucket.file(gcsFileName);

    // Upload to GCS
    await blob.save(req.file.buffer, {
      contentType: req.file.mimetype,
      metadata: { cacheControl: 'public, max-age=31536000' }
    });

    const photoUrl = `https://storage.googleapis.com/${bucket.name}/${gcsFileName}`;

    // Update user's profile photo URL in database
    await pool.query(
      'UPDATE users SET profile_photo_url = $1 WHERE member_id = $2',
      [photoUrl, userId]
    );

    res.json({ 
      success: true, 
      photoUrl,
      message: 'Profile photo uploaded successfully' 
    });
  } catch (error) {
    console.error('Error uploading profile photo:', error);
    res.status(500).json({ error: 'Failed to upload profile photo' });
  }
});

// Upload scorecard photo endpoint (GCS version with fallback)
app.post('/api/tournaments/scorecard-photo', authenticateToken, upload.single('scorecardPhoto'), async (req, res) => {
  try {
    console.log('Scorecard photo upload request received');
    console.log('Request user:', req.user);
    console.log('Request file:', req.file ? 'File present' : 'No file');
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('File details:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    });

    const userId = req.user.member_id;
    let photoUrl;

    // Check if GCS is configured
    if (gcs && bucket) {
      console.log('Using GCS for photo upload');
      try {
        // Use GCS for production
        const ext = path.extname(req.file.originalname);
        const gcsFileName = `scorecard-photos/user_${userId}_${Date.now()}${ext}`;
        const blob = bucket.file(gcsFileName);

        console.log('Uploading to GCS:', gcsFileName);

        // Upload to GCS
        await blob.save(req.file.buffer, {
          contentType: req.file.mimetype,
          metadata: { cacheControl: 'public, max-age=31536000' }
        });

        photoUrl = `https://storage.googleapis.com/${bucket.name}/${gcsFileName}`;
        console.log('GCS upload successful, URL:', photoUrl);
      } catch (gcsError) {
        console.error('GCS upload failed:', gcsError);
        throw gcsError;
      }
    } else {
      console.log('GCS not configured, using data URL fallback');
      // Fallback: Convert to data URL for development
      const base64Data = req.file.buffer.toString('base64');
      const mimeType = req.file.mimetype;
      photoUrl = `data:${mimeType};base64,${base64Data}`;
      
      console.log('Data URL fallback created, length:', photoUrl.length);
    }

    console.log('Photo upload successful, returning response');
    res.json({ 
      success: true, 
      photoUrl,
      message: 'Scorecard photo uploaded successfully' 
    });
  } catch (error) {
    console.error('Error uploading scorecard photo:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to upload scorecard photo',
      details: error.message 
    });
  }
});

// GSPro Courses API endpoints

// Get all GSPro courses with optional filtering
app.get('/api/gspro-courses', async (req, res) => {
  try {
    const { 
      search, 
      server, 
      designer, 
      location, 
      courseType, 
      limit = 50, 
      offset = 0 
    } = req.query;
    
    // Define course type mapping
    const courseTypeMap = {
      'par3': 'is_par3',
      'beginner': 'is_beginner',
      'coastal': 'is_coastal',
      'desert': 'is_desert',
      'fantasy': 'is_fantasy',
      'heathland': 'is_heathland',
      'historic': 'is_historic',
      'links': 'is_links',
      'lowpoly': 'is_lowpoly',
      'major_venue': 'is_major_venue',
      'mountain': 'is_mountain',
      'parkland': 'is_parkland',
      'tour_stop': 'is_tour_stop',
      'training': 'is_training',
      'tropical': 'is_tropical'
    };
    
    let query = `
      SELECT 
        id, server, name, updated_date, location, designer, elevation,
        is_par3, is_beginner, is_coastal, is_desert, is_fantasy, is_heathland,
        is_historic, is_links, is_lowpoly, is_major_venue, is_mountain, 
        is_parkland, is_tour_stop, is_training, is_tropical
      FROM gspro_courses
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;
    
    // Add search filter
    if (search) {
      paramCount++;
      query += ` AND (name ILIKE $${paramCount} OR location ILIKE $${paramCount} OR designer ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }
    
    // Add server filter
    if (server) {
      paramCount++;
      query += ` AND server = $${paramCount}`;
      params.push(server);
    }
    
    // Add designer filter
    if (designer) {
      paramCount++;
      query += ` AND designer ILIKE $${paramCount}`;
      params.push(`%${designer}%`);
    }
    
    // Add location filter
    if (location) {
      paramCount++;
      query += ` AND location ILIKE $${paramCount}`;
      params.push(`%${location}%`);
    }
    
    // Add course type filter
    if (courseType && courseTypeMap[courseType]) {
      query += ` AND ${courseTypeMap[courseType]} = true`;
    }
    
    // Add ordering and pagination
    query += ` ORDER BY name ASC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(parseInt(limit), parseInt(offset));
    
    const { rows } = await pool.query(query, params);
    
    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM gspro_courses
      WHERE 1=1
    `;
    
    const countParams = [];
    let countParamCount = 0;
    
    if (search) {
      countParamCount++;
      countQuery += ` AND (name ILIKE $${countParamCount} OR location ILIKE $${countParamCount} OR designer ILIKE $${countParamCount})`;
      countParams.push(`%${search}%`);
    }
    
    if (server) {
      countParamCount++;
      countQuery += ` AND server = $${countParamCount}`;
      countParams.push(server);
    }
    
    if (designer) {
      countParamCount++;
      countQuery += ` AND designer ILIKE $${countParamCount}`;
      countParams.push(`%${designer}%`);
    }
    
    if (location) {
      countParamCount++;
      countQuery += ` AND location ILIKE $${countParamCount}`;
      countParams.push(`%${location}%`);
    }
    
    if (courseType && courseTypeMap[courseType]) {
      countQuery += ` AND ${courseTypeMap[courseType]} = true`;
    }
    
    const { rows: countResult } = await pool.query(countQuery, countParams);
    const total = parseInt(countResult[0].total);
    
    res.json({
      courses: rows,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + parseInt(limit)) < total
      }
    });
    
  } catch (error) {
    console.error('Error fetching GSPro courses:', error);
    res.status(500).json({ error: 'Failed to fetch GSPro courses' });
  }
});

// Get GSPro courses statistics
app.get('/api/gspro-courses/stats', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        COUNT(*) as total_courses,
        COUNT(DISTINCT server) as unique_servers,
        COUNT(DISTINCT designer) as unique_designers,
        COUNT(DISTINCT location) as unique_locations,
        COUNT(CASE WHEN is_par3 = true THEN 1 END) as par3_courses,
        COUNT(CASE WHEN is_beginner = true THEN 1 END) as beginner_courses,
        COUNT(CASE WHEN is_coastal = true THEN 1 END) as coastal_courses,
        COUNT(CASE WHEN is_desert = true THEN 1 END) as desert_courses,
        COUNT(CASE WHEN is_fantasy = true THEN 1 END) as fantasy_courses,
        COUNT(CASE WHEN is_heathland = true THEN 1 END) as heathland_courses,
        COUNT(CASE WHEN is_historic = true THEN 1 END) as historic_courses,
        COUNT(CASE WHEN is_links = true THEN 1 END) as links_courses,
        COUNT(CASE WHEN is_major_venue = true THEN 1 END) as major_venue_courses,
        COUNT(CASE WHEN is_mountain = true THEN 1 END) as mountain_courses,
        COUNT(CASE WHEN is_parkland = true THEN 1 END) as parkland_courses,
        COUNT(CASE WHEN is_tour_stop = true THEN 1 END) as tour_stop_courses,
        COUNT(CASE WHEN is_training = true THEN 1 END) as training_courses,
        COUNT(CASE WHEN is_tropical = true THEN 1 END) as tropical_courses
      FROM gspro_courses
    `);
    
    res.json(rows[0]);
    
  } catch (error) {
    console.error('Error fetching GSPro courses statistics:', error);
    res.status(500).json({ error: 'Failed to fetch GSPro courses statistics' });
  }
});

// Get unique values for filters
app.get('/api/gspro-courses/filters', async (req, res) => {
  try {
    const [servers, designers, locations] = await Promise.all([
      pool.query('SELECT DISTINCT server FROM gspro_courses WHERE server IS NOT NULL ORDER BY server'),
      pool.query('SELECT DISTINCT designer FROM gspro_courses WHERE designer IS NOT NULL ORDER BY designer'),
      pool.query('SELECT DISTINCT location FROM gspro_courses WHERE location IS NOT NULL ORDER BY location')
    ]);
    
    res.json({
      servers: servers.rows.map(row => row.server),
      designers: designers.rows.map(row => row.designer),
      locations: locations.rows.map(row => row.location)
    });
    
  } catch (error) {
    console.error('Error fetching GSPro courses filters:', error);
    res.status(500).json({ error: 'Failed to fetch GSPro courses filters' });
  }
});

// Get a specific GSPro course by ID
app.get('/api/gspro-courses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { rows } = await pool.query(`
      SELECT 
        id, server, name, updated_date, location, designer, elevation,
        is_par3, is_beginner, is_coastal, is_desert, is_fantasy, is_heathland,
        is_historic, is_links, is_lowpoly, is_major_venue, is_mountain, 
        is_parkland, is_tour_stop, is_training, is_tropical, created_at
      FROM gspro_courses
      WHERE id = $1
    `, [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    res.json(rows[0]);
    
  } catch (error) {
    console.error('Error fetching GSPro course:', error);
    res.status(500).json({ error: 'Failed to fetch GSPro course' });
  }
});

// Import GSPro courses endpoint (admin only)
app.post('/api/gspro-courses/import', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    const { rows: userRows } = await pool.query(
      'SELECT role FROM users WHERE member_id = $1',
      [req.user.member_id]
    );
    
    if (userRows.length === 0 || userRows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    // Import the courses using the import script
    const { createGsproCoursesTable, importGsproCourses } = require('./import_gspro_courses');
    
    await createGsproCoursesTable();
    await importGsproCourses();
    
    res.json({ 
      success: true, 
      message: 'GSPro courses imported successfully' 
    });
    
  } catch (error) {
    console.error('Error importing GSPro courses:', error);
    res.status(500).json({ error: 'Failed to import GSPro courses' });
  }
});

// Trackman Courses API endpoints

// Get all Trackman courses with optional filtering
app.get('/api/trackman-courses', async (req, res) => {
  try {
    const { 
      search, 
      limit = 50, 
      offset = 0 
    } = req.query;
    
    let query = `
      SELECT id, name, created_at
      FROM trackman_courses
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;
    
    // Add search filter
    if (search) {
      paramCount++;
      query += ` AND name ILIKE $${paramCount}`;
      params.push(`%${search}%`);
    }
    
    // Add ordering and pagination
    query += ` ORDER BY name ASC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(parseInt(limit), parseInt(offset));
    
    const { rows } = await pool.query(query, params);
    
    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM trackman_courses
      WHERE 1=1
    `;
    
    const countParams = [];
    let countParamCount = 0;
    
    if (search) {
      countParamCount++;
      countQuery += ` AND name ILIKE $${countParamCount}`;
      countParams.push(`%${search}%`);
    }
    
    const { rows: countResult } = await pool.query(countQuery, countParams);
    const total = parseInt(countResult[0].total);
    
    res.json({
      courses: rows,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + parseInt(limit)) < total
      }
    });
    
  } catch (error) {
    console.error('Error fetching Trackman courses:', error);
    res.status(500).json({ error: 'Failed to fetch Trackman courses' });
  }
});

// Get a specific Trackman course by ID
app.get('/api/trackman-courses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { rows } = await pool.query(`
      SELECT id, name, created_at
      FROM trackman_courses
      WHERE id = $1
    `, [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    res.json(rows[0]);
    
  } catch (error) {
    console.error('Error fetching Trackman course:', error);
    res.status(500).json({ error: 'Failed to fetch Trackman course' });
  }
});

// Get Trackman courses statistics
app.get('/api/trackman-courses/stats', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        COUNT(*) as total_courses
      FROM trackman_courses
    `);
    
    res.json(rows[0]);
    
  } catch (error) {
    console.error('Error fetching Trackman courses statistics:', error);
    res.status(500).json({ error: 'Failed to fetch Trackman courses statistics' });
  }
});

// Import Trackman courses endpoint (admin only)
app.post('/api/trackman-courses/import', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    const { rows: userRows } = await pool.query(
      'SELECT role FROM users WHERE member_id = $1',
      [req.user.member_id]
    );
    
    if (userRows.length === 0 || userRows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    // Import the courses using the import script
    const { createTrackmanCoursesTable, importTrackmanCourses } = require('./import_trackman_courses');
    
    await createTrackmanCoursesTable();
    await importTrackmanCourses();
    
    res.json({ 
      success: true, 
      message: 'Trackman courses imported successfully' 
    });
    
  } catch (error) {
    console.error('Error importing Trackman courses:', error);
    res.status(500).json({ error: 'Failed to import Trackman courses' });
  }
});

// Combined Simulator Courses Stats
app.get('/api/simulator-courses/stats', async (req, res) => {
  try {
    // Get all courses from the combined table
    const { rows } = await pool.query('SELECT platforms FROM simulator_courses_combined');
    let total_courses = rows.length;
    let gspro_courses = 0;
    let trackman_courses = 0;
    let shared_courses = 0;
    let unique_gspro = 0;
    let unique_trackman = 0;
    
    // Debug: Log a few sample platforms to see the format
    console.log('Sample platforms from database:');
    for (let i = 0; i < Math.min(5, rows.length); i++) {
      console.log(`Row ${i}:`, rows[i].platforms);
    }
    
    for (const row of rows) {
      let platforms = row.platforms;
      
      // Handle different possible formats of the platforms data
      if (typeof platforms === 'string') {
        // If it's a string, try to parse it as JSON
        try {
          platforms = JSON.parse(platforms);
        } catch (e) {
          console.log('Failed to parse platforms as JSON:', platforms);
          continue;
        }
      }
      
      // Ensure platforms is an array
      if (!Array.isArray(platforms)) {
        console.log('Platforms is not an array:', platforms);
        continue;
      }
      
      console.log('Processing platforms:', platforms, 'Type:', typeof platforms, 'Is array:', Array.isArray(platforms));
      
      // Check if this course has both platforms
      const hasGSPro = platforms.includes('GSPro');
      const hasTrackman = platforms.includes('Trackman');
      
      if (hasGSPro && hasTrackman) {
        shared_courses++;
        console.log('Found shared course');
      } else if (hasGSPro) {
        unique_gspro++;
        console.log('Found GSPro course');
      } else if (hasTrackman) {
        unique_trackman++;
        console.log('Found Trackman course');
      }
      
      // Count total courses for each platform
      if (hasGSPro) gspro_courses++;
      if (hasTrackman) trackman_courses++;
    }
    
    const result = {
      total_courses,
      gspro_courses,
      trackman_courses,
      shared_courses,
      unique_gspro,
      unique_trackman
    };
    
    console.log('Stats result:', result);
    res.json(result);
  } catch (error) {
    console.error('Error fetching combined simulator stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Get a single simulator course by ID
app.get('/api/simulator-courses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { rows } = await pool.query(`
      SELECT * FROM simulator_courses_combined WHERE id = $1
    `, [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching simulator course:', error);
    res.status(500).json({ error: 'Failed to fetch course' });
  }
});

// Combined Simulator Courses API
app.get('/api/simulator-courses', async (req, res) => {
  try {
    const { search, platform, server, designer, location, courseType, id, limit = 20, offset = 0 } = req.query;
    let query = 'SELECT * FROM simulator_courses_combined WHERE 1=1';
    const params = [];
    let paramCount = 0;

    // ID filter
    if (id) {
      paramCount++;
      query += ` AND id = $${paramCount}`;
      params.push(parseInt(id));
    }

    // Platform filter
    if (platform === 'gspro') {
      query += ` AND platforms @> ARRAY['GSPro'] AND NOT platforms @> ARRAY['Trackman']`;
    } else if (platform === 'trackman') {
      query += ` AND platforms @> ARRAY['Trackman'] AND NOT platforms @> ARRAY['GSPro']`;
    } else if (platform === 'shared') {
      query += ` AND platforms @> ARRAY['GSPro'] AND platforms @> ARRAY['Trackman']`;
    }

    // Search filter
    if (search) {
      paramCount++;
      query += ` AND (name ILIKE $${paramCount}`;
      params.push(`%${search}%`);
      paramCount++;
      query += ` OR location ILIKE $${paramCount}`;
      params.push(`%${search}%`);
      paramCount++;
      query += ` OR designer ILIKE $${paramCount}`;
      params.push(`%${search}%`);
      query += ')';
    }

    // Server filter (GSPro only)
    if (server) {
      paramCount++;
      query += ` AND (platforms @> ARRAY['GSPro'] AND server = $${paramCount})`;
      params.push(server);
    }
    // Designer filter (GSPro only)
    if (designer) {
      paramCount++;
      query += ` AND designer = $${paramCount}`;
      params.push(designer);
    }
    // Location filter (GSPro only)
    if (location) {
      paramCount++;
      query += ` AND location = $${paramCount}`;
      params.push(location);
    }
    // Course type filter (GSPro only)
    if (courseType) {
      paramCount++;
      query += ` AND $${paramCount} = ANY(course_types)`;
      params.push(courseType.replace('_', ' '));
    }

    // Pagination
    paramCount++;
    query += ` ORDER BY name ASC LIMIT $${paramCount}`;
    params.push(parseInt(limit));
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(parseInt(offset));

    const { rows } = await pool.query(query, params);

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) as total FROM simulator_courses_combined WHERE 1=1';
    const countParams = [];
    let countParamCount = 0;
    
    if (platform === 'gspro') {
      countQuery += ` AND platforms @> ARRAY['GSPro'] AND NOT platforms @> ARRAY['Trackman']`;
    } else if (platform === 'trackman') {
      countQuery += ` AND platforms @> ARRAY['Trackman'] AND NOT platforms @> ARRAY['GSPro']`;
    } else if (platform === 'shared') {
      countQuery += ` AND platforms @> ARRAY['GSPro'] AND platforms @> ARRAY['Trackman']`;
    }
    
    if (search) {
      countParamCount++;
      countQuery += ` AND (name ILIKE $${countParamCount}`;
      countParams.push(`%${search}%`);
      countParamCount++;
      countQuery += ` OR location ILIKE $${countParamCount}`;
      countParams.push(`%${search}%`);
      countParamCount++;
      countQuery += ` OR designer ILIKE $${countParamCount}`;
      countParams.push(`%${search}%`);
      countQuery += ')';
    }
    
    if (server) {
      countParamCount++;
      countQuery += ` AND (platforms @> ARRAY['GSPro'] AND server = $${countParamCount})`;
      countParams.push(server);
    }
    if (designer) {
      countParamCount++;
      countQuery += ` AND designer = $${countParamCount}`;
      countParams.push(designer);
    }
    if (location) {
      countParamCount++;
      countQuery += ` AND location = $${countParamCount}`;
      countParams.push(location);
    }
    if (courseType) {
      countParamCount++;
      countQuery += ` AND $${countParamCount} = ANY(course_types)`;
      countParams.push(courseType.replace('_', ' '));
    }
    
    const { rows: countResult } = await pool.query(countQuery, countParams);
    const total = parseInt(countResult[0].total);
    res.json({
      courses: rows,
      total,
      page: Math.floor(offset / limit) + 1,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error fetching combined simulator courses:', error);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

// Update course par values
app.put('/api/simulator-courses/:id/par-values', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { par_values } = req.body;
    
    console.log('Par values update request:', { id, par_values, userId: req.user.member_id });
    
    // Validate par values
    if (!Array.isArray(par_values) || par_values.length === 0) {
      console.log('Validation failed: par_values is not a non-empty array');
      return res.status(400).json({ error: 'Par values must be a non-empty array' });
    }
    
    // Validate each par value is between 3 and 6
    if (par_values.some(par => !Number.isInteger(par) || par < 3 || par > 6)) {
      console.log('Validation failed: par values out of range');
      return res.status(400).json({ error: 'Par values must be integers between 3 and 6' });
    }
    
    // Check if course exists first
    const { rows: courseCheck } = await pool.query(`
      SELECT id, name FROM simulator_courses_combined WHERE id = $1
    `, [id]);
    
    if (courseCheck.length === 0) {
      console.log('Course not found with ID:', id);
      return res.status(404).json({ error: 'Course not found' });
    }
    
    console.log('Found course:', courseCheck[0]);
    
    // Update the course with par values
    const { rows } = await pool.query(`
      UPDATE simulator_courses_combined 
      SET par_values = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, name, par_values
    `, [JSON.stringify(par_values), id]);
    
    console.log('Update result:', rows[0]);
    
    res.json({
      message: 'Par values updated successfully',
      course: rows[0]
    });
    
  } catch (error) {
    console.error('Error updating course par values:', error);
    res.status(500).json({ error: 'Failed to update par values', details: error.message });
  }
});

// Update course hole indexes
app.put('/api/simulator-courses/:id/hole-indexes', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { hole_indexes } = req.body;
    
    console.log('Hole indexes update request:', { id, hole_indexes, userId: req.user.member_id });
    
    // Validate hole indexes
    if (!Array.isArray(hole_indexes) || hole_indexes.length === 0) {
      console.log('Validation failed: hole_indexes is not a non-empty array');
      return res.status(400).json({ error: 'Hole indexes must be a non-empty array' });
    }
    
    // Validate each hole index is between 1 and 18
    if (hole_indexes.some(index => !Number.isInteger(index) || index < 1 || index > 18)) {
      console.log('Validation failed: hole indexes out of range');
      return res.status(400).json({ error: 'Hole indexes must be integers between 1 and 18' });
    }
    
    // Check if course exists first
    const { rows: courseCheck } = await pool.query(`
      SELECT id, name FROM simulator_courses_combined WHERE id = $1
    `, [id]);
    
    if (courseCheck.length === 0) {
      console.log('Course not found with ID:', id);
      return res.status(404).json({ error: 'Course not found' });
    }
    
    console.log('Found course:', courseCheck[0]);
    
    // Update the course with hole indexes
    const { rows } = await pool.query(`
      UPDATE simulator_courses_combined 
      SET hole_indexes = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, name, hole_indexes
    `, [JSON.stringify(hole_indexes), id]);
    
    console.log('Update result:', rows[0]);
    
    res.json({
      message: 'Hole indexes updated successfully',
      course: rows[0]
    });
    
  } catch (error) {
    console.error('Error updating course hole indexes:', error);
    res.status(500).json({ error: 'Failed to update hole indexes', details: error.message });
  }
});
// Get existing teebox data for a course
app.get('/api/simulator-courses/:id/teebox-data', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get teebox data directly from simulator_courses_combined table
    const { rows } = await pool.query(`
      SELECT 
        teebox_data
      FROM simulator_courses_combined 
      WHERE id = $1
    `, [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    let teeboxData = rows[0].teebox_data || {};
    console.log('Raw teebox data from database:', teeboxData);
    console.log('Teebox data type:', typeof teeboxData);
    console.log('Is array?', Array.isArray(teeboxData));
    
    // Handle case where teebox_data might be stored as an array instead of object
    if (Array.isArray(teeboxData)) {
      console.log('Converting array to object format...');
      const arrayData = teeboxData;
      teeboxData = {};
      arrayData.forEach((item, index) => {
        if (item && typeof item === 'object' && item.teebox) {
          teeboxData[item.teebox] = {
            rating: item.course_rating || item.rating,
            slope: item.course_slope || item.slope,
            usage_count: item.usage_count || 1,
            last_used: item.last_used || null
          };
        }
      });
      console.log('Converted to object:', teeboxData);
    }
    
    // Transform the JSONB data to match the expected format
    const transformedData = Object.entries(teeboxData).map(([teebox, data]) => {
      console.log(`Processing teebox ${teebox}:`, data);
      return {
        teebox,
        course_rating: data.rating,
        course_slope: data.slope,
        usage_count: data.usage_count || null,
        last_used: data.last_used || null
      };
    });
    
    console.log('Transformed teebox data:', transformedData);
    
    res.json({
      teeboxData: transformedData,
      totalTeeboxes: transformedData.length
    });
    
  } catch (error) {
    console.error('Error fetching teebox data:', error);
    res.status(500).json({ error: 'Failed to fetch teebox data' });
  }
});

// Update course teebox data
app.put('/api/simulator-courses/:id/teebox-data', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { teebox, course_rating, course_slope } = req.body;
    
    console.log('Teebox data update request:', { id, teebox, course_rating, course_slope, userId: req.user.member_id });
    
    // Validate input
    if (!teebox || !course_rating || !course_slope) {
      return res.status(400).json({ error: 'Teebox, course rating, and course slope are required' });
    }
    
    // Validate rating and slope ranges
    if (course_rating < 60 || course_rating > 80) {
      return res.status(400).json({ error: 'Course rating must be between 60 and 80' });
    }
    
    if (course_slope < 55 || course_slope > 155) {
      return res.status(400).json({ error: 'Course slope must be between 55 and 155' });
    }
    
    // Check if course exists
    const { rows: courseCheck } = await pool.query(`
      SELECT id, name FROM simulator_courses_combined WHERE id = $1
    `, [id]);
    
    if (courseCheck.length === 0) {
      console.log('Course not found with ID:', id);
      return res.status(404).json({ error: 'Course not found' });
    }
    
    console.log('Found course:', courseCheck[0]);
    
    // Update teebox data using the existing function
    await updateCourseTeeboxData(id, teebox, course_rating, course_slope, new Date().toISOString().split('T')[0]);
    
    res.json({
      message: 'Teebox data updated successfully',
      course: courseCheck[0]
    });
    
  } catch (error) {
    console.error('Error updating course teebox data:', error);
    res.status(500).json({ error: 'Failed to update teebox data', details: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// Get course records and player statistics for leaderboard
app.get('/api/leaderboard-stats', async (req, res) => {
  try {
    // Get player statistics with more detailed stats
    const { rows: playerStats } = await pool.query(`
      SELECT 
        u.member_id,
        u.first_name,
        u.last_name,
        u.club,
        u.role,
        u.sim_handicap,
        u.grass_handicap,
        COALESCE(up.total_matches, 0) as total_matches,
        COALESCE(up.wins, 0) as wins,
        COALESCE(up.losses, 0) as losses,
        COALESCE(up.ties, 0) as ties,
        COALESCE(up.total_points, 0) as total_points,
        COALESCE(up.win_rate, 0) as win_rate,
        -- Simulator round stats
        COALESCE(sim_stats.total_sim_rounds, 0) as total_sim_rounds,
        COALESCE(sim_stats.avg_sim_score, 0) as avg_sim_score,
        COALESCE(sim_stats.best_sim_score, 0) as best_sim_score,
        COALESCE(sim_stats.unique_sim_courses, 0) as unique_sim_courses,
        -- Recent activity
        COALESCE(recent_activity.rounds_this_month, 0) as rounds_this_month
      FROM users u
      LEFT JOIN user_profiles up ON u.member_id = up.user_id
      LEFT JOIN (
        SELECT 
          user_id,
          COUNT(*) as total_sim_rounds,
          ROUND(AVG(total_strokes), 1) as avg_sim_score,
          MIN(total_strokes) as best_sim_score,
          COUNT(DISTINCT course_id) as unique_sim_courses
        FROM scorecards 
        WHERE round_type = 'sim'
        GROUP BY user_id
      ) sim_stats ON u.member_id = sim_stats.user_id
      LEFT JOIN (
        SELECT 
          user_id,
          COUNT(*) as rounds_this_month
        FROM scorecards 
        WHERE round_type = 'sim' 
        AND date_played >= DATE_TRUNC('month', CURRENT_DATE)
        GROUP BY user_id
      ) recent_activity ON u.member_id = recent_activity.user_id
      WHERE u.role IN ('Member', 'Admin', 'Club Pro')
      ORDER BY sim_stats.total_sim_rounds DESC NULLS LAST, u.last_name, u.first_name
    `);

    // Get course records
    let courseRecords = [];
    try {
      const { rows } = await pool.query(`
        SELECT 
          cr.course_id,
          sc.name as course_name,
          sc.location,
          sc.designer,
          sc.platforms,
          cr.total_strokes as best_score,
          cr.date_played,
          u.first_name,
          u.last_name,
          u.club,
          cr.user_id,
          cr.scorecard_id,
          cr.club as record_club -- NULL for community records, club name for club records
        FROM course_records cr
        INNER JOIN simulator_courses_combined sc ON cr.course_id = sc.id
        INNER JOIN users u ON cr.user_id = u.member_id
        WHERE cr.is_current = true
        ORDER BY sc.name, cr.club NULLS FIRST
      `);
      courseRecords = rows;
    } catch (courseRecordsErr) {
      console.log('Course records table not available yet:', courseRecordsErr.message);
      // Return empty array if table doesn't exist
      courseRecords = [];
    }

    // Get recent matches
    const { rows: recentMatches } = await pool.query(`
      SELECT 
        m.id,
        p1.first_name as player1_first_name,
        p1.last_name as player1_last_name,
        p2.first_name as player2_first_name,
        p2.last_name as player2_last_name,
        CASE 
          WHEN m.winner = p1.first_name || ' ' || p1.last_name THEN p1.first_name || ' ' || p1.last_name
          WHEN m.winner = p2.first_name || ' ' || p2.last_name THEN p2.first_name || ' ' || p2.last_name
          ELSE NULL
        END as winner_name,
        m.created_at
      FROM matches m
      LEFT JOIN users p1 ON m.player1_id = p1.member_id
      LEFT JOIN users p2 ON m.player2_id = p2.member_id
      ORDER BY m.created_at DESC
      LIMIT 10
    `);

    // Get overall statistics
    const { rows: overallStats } = await pool.query(`
      SELECT 
        COUNT(DISTINCT u.member_id) as total_players,
        COUNT(DISTINCT m.id) as total_matches,
        COUNT(DISTINCT s.id) as total_rounds,
        COUNT(DISTINCT s.course_id) as total_courses_played,
        ROUND(AVG(s.total_strokes), 1) as avg_score,
        MIN(s.total_strokes) as best_score_overall
      FROM users u
      LEFT JOIN matches m ON (u.member_id = m.player1_id OR u.member_id = m.player2_id)
      LEFT JOIN scorecards s ON u.member_id = s.user_id AND (s.round_type = 'sim' OR s.round_type IS NULL)
      WHERE u.role IN ('Member', 'Admin', 'Club Pro')
    `);

    res.json({
      players: playerStats,
      courseRecords,
      recentMatches,
      overallStats: overallStats[0] || {
        total_players: 0,
        total_matches: 0,
        total_rounds: 0,
        total_courses_played: 0,
        avg_score: 0,
        best_score_overall: 0
      }
    });
  } catch (err) {
    console.error('Error fetching leaderboard stats:', err);
    res.status(500).json({ error: 'Failed to fetch leaderboard stats' });
  }
}); 

// Function to check and update course records
async function checkAndUpdateCourseRecords(scorecardId, courseId, userId, totalStrokes, datePlayed, userClub) {
  try {
    // First check if the course_records table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'course_records'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('Course records table does not exist yet, skipping record update');
      return;
    }

    // Check if this is a new club record
    const clubRecordCheck = await pool.query(`
      SELECT id, total_strokes FROM course_records 
      WHERE course_id = $1 AND club = $2 AND is_current = true
    `, [courseId, userClub]);

    if (clubRecordCheck.rows.length === 0 || totalStrokes < clubRecordCheck.rows[0].total_strokes) {
      // New club record - mark old record as not current and insert new one
      if (clubRecordCheck.rows.length > 0) {
        await pool.query(`
          UPDATE course_records SET is_current = false, updated_at = NOW()
          WHERE id = $1
        `, [clubRecordCheck.rows[0].id]);
      }

      await pool.query(`
        INSERT INTO course_records (course_id, club, user_id, scorecard_id, total_strokes, date_played)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (course_id, club) DO UPDATE SET
          user_id = EXCLUDED.user_id,
          scorecard_id = EXCLUDED.scorecard_id,
          total_strokes = EXCLUDED.total_strokes,
          date_played = EXCLUDED.date_played,
          is_current = true,
          updated_at = NOW()
      `, [courseId, userClub, userId, scorecardId, totalStrokes, datePlayed]);

      console.log(`New club record set for course ${courseId} at ${userClub}: ${totalStrokes} strokes`);
    }

    // Check if this is a new community/global record
    const globalRecordCheck = await pool.query(`
      SELECT id, total_strokes FROM course_records 
      WHERE course_id = $1 AND club IS NULL AND is_current = true
    `, [courseId]);

    if (globalRecordCheck.rows.length === 0 || totalStrokes < globalRecordCheck.rows[0].total_strokes) {
      // New global record - mark old record as not current and insert new one
      if (globalRecordCheck.rows.length > 0) {
        await pool.query(`
          UPDATE course_records SET is_current = false, updated_at = NOW()
          WHERE id = $1
        `, [globalRecordCheck.rows[0].id]);
      }

      await pool.query(`
        INSERT INTO course_records (course_id, club, user_id, scorecard_id, total_strokes, date_played)
        VALUES ($1, NULL, $2, $3, $4, $5)
        ON CONFLICT (course_id, club) DO UPDATE SET
          user_id = EXCLUDED.user_id,
          scorecard_id = EXCLUDED.scorecard_id,
          total_strokes = EXCLUDED.total_strokes,
          date_played = EXCLUDED.date_played,
          is_current = true,
          updated_at = NOW()
      `, [courseId, userId, scorecardId, totalStrokes, datePlayed]);

      console.log(`New community record set for course ${courseId}: ${totalStrokes} strokes`);
    }

  } catch (error) {
    console.error('Error updating course records:', error);
  }
}

// Function to update teebox data in simulator_courses_combined
async function updateCourseTeeboxData(courseId, teebox, courseRating, courseSlope, datePlayed) {
  try {
    console.log(`Updating teebox data for course ${courseId}: ${teebox} (${courseRating}/${courseSlope})`);
    
    // Get current teebox data for this course
    const { rows } = await pool.query(`
      SELECT teebox_data FROM simulator_courses_combined WHERE id = $1
    `, [courseId]);
    
    if (rows.length === 0) {
      console.log(`Course ${courseId} not found, skipping teebox update`);
      return;
    }
    
    let teeboxData = rows[0].teebox_data || {};
    console.log('Current teebox data:', teeboxData);
    
    // Ensure teeboxData is an object, not an array
    if (Array.isArray(teeboxData)) {
      console.log('Converting array teebox data to object...');
      teeboxData = {};
    }
    
    // Check if this teebox already exists with the same rating/slope
    if (teeboxData[teebox] && 
        teeboxData[teebox].rating === parseFloat(courseRating) && 
        teeboxData[teebox].slope === parseInt(courseSlope)) {
      // Update existing teebox usage count
      teeboxData[teebox].usage_count = (teeboxData[teebox].usage_count || 0) + 1;
      teeboxData[teebox].last_used = datePlayed;
      console.log(`Updated existing teebox ${teebox} usage count to ${teeboxData[teebox].usage_count}`);
    } else {
      // Add new teebox or update with new rating/slope
      teeboxData[teebox] = {
        rating: parseFloat(courseRating),
        slope: parseInt(courseSlope),
        usage_count: 1,
        first_used: datePlayed,
        last_used: datePlayed
      };
      console.log(`Added new teebox ${teebox} with rating ${courseRating} and slope ${courseSlope}`);
    }
    
    // Update the course with new teebox data
    console.log('About to save teebox data:', JSON.stringify(teeboxData, null, 2));
    await pool.query(`
      UPDATE simulator_courses_combined 
      SET teebox_data = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2
    `, [JSON.stringify(teeboxData), courseId]);
    
    // Verify the data was saved correctly
    const { rows: verifyRows } = await pool.query(`
      SELECT teebox_data FROM simulator_courses_combined WHERE id = $1
    `, [courseId]);
    
    console.log('Verified saved teebox data:', verifyRows[0].teebox_data);
    console.log(`Successfully updated teebox data for course ${courseId}`);
    
  } catch (error) {
    console.error('Error updating course teebox data:', error);
  }
}

// Create course records table endpoint
app.post('/api/setup-course-records', async (req, res) => {
  try {
    console.log('Setting up course records table...');
    
    // First, ensure the simulator_courses_combined table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS simulator_courses_combined (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        location VARCHAR(255),
        designer VARCHAR(255),
        platforms TEXT[],
        course_types TEXT[],
        par_values JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Simulator courses combined table ready.');

    // Create course_records table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS course_records (
        id SERIAL PRIMARY KEY,
        course_id INTEGER REFERENCES simulator_courses_combined(id),
        club VARCHAR(50), -- NULL for community/global records, club name for club-specific records
        user_id INTEGER REFERENCES users(member_id),
        scorecard_id INTEGER REFERENCES scorecards(id),
        total_strokes INTEGER NOT NULL,
        date_played DATE NOT NULL,
        is_current BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(course_id, club)
      )
    `);
    console.log('Course records table ready.');

    // Populate course_records with existing best scores if the table is empty
    const { rows: existingRecords } = await pool.query('SELECT COUNT(*) FROM course_records');
    if (parseInt(existingRecords[0].count) === 0) {
      console.log('Populating course_records table with existing best scores...');
      
      // Insert community records (global best scores)
      await pool.query(`
        INSERT INTO course_records (course_id, club, user_id, scorecard_id, total_strokes, date_played)
        SELECT 
          s.course_id,
          NULL as club,
          s.user_id,
          s.id as scorecard_id,
          s.total_strokes,
          s.date_played
        FROM scorecards s
        INNER JOIN (
          SELECT 
            course_id,
            MIN(total_strokes) as best_score
          FROM scorecards 
          WHERE course_id IS NOT NULL AND round_type = 'sim'
          GROUP BY course_id
        ) best_scores ON s.course_id = best_scores.course_id 
          AND s.total_strokes = best_scores.best_score
          AND s.round_type = 'sim'
        ON CONFLICT (course_id, club) DO NOTHING
      `);

      // Insert club records (best scores per club)
      await pool.query(`
        INSERT INTO course_records (course_id, club, user_id, scorecard_id, total_strokes, date_played)
        SELECT 
          s.course_id,
          u.club,
          s.user_id,
          s.id as scorecard_id,
          s.total_strokes,
          s.date_played
        FROM scorecards s
        INNER JOIN users u ON s.user_id = u.member_id
        INNER JOIN (
          SELECT 
            s2.course_id,
            u2.club,
            MIN(s2.total_strokes) as best_score
          FROM scorecards s2
          INNER JOIN users u2 ON s2.user_id = u2.member_id
          WHERE s2.course_id IS NOT NULL AND s2.round_type = 'sim' AND u2.club IS NOT NULL
          GROUP BY s2.course_id, u2.club
        ) best_scores ON s.course_id = best_scores.course_id 
          AND u.club = best_scores.club
          AND s.total_strokes = best_scores.best_score
          AND s.round_type = 'sim'
        ON CONFLICT (course_id, club) DO NOTHING
      `);

      console.log('Course records populated successfully');
    }

    res.json({ 
      success: true, 
      message: 'Course records table created and populated successfully',
      tables: ['simulator_courses_combined', 'course_records']
    });
  } catch (err) {
    console.error('Error setting up course records:', err);
    res.status(500).json({ error: 'Failed to setup course records', details: err.message });
  }
});

// Get all users

// Get global community leaderboard statistics
app.get('/api/global-leaderboard', async (req, res) => {
  try {
    // Community highlight statistics
    const { rows: communityStats } = await pool.query(`
      SELECT 
        COUNT(DISTINCT u.member_id) as total_players,
        COUNT(DISTINCT u.club) as total_clubs,
        COUNT(DISTINCT s.id) as total_rounds,
        COUNT(DISTINCT cr.course_id) as total_course_records,
        COUNT(DISTINCT s.course_id) as total_courses_played
      FROM users u
      LEFT JOIN scorecards s ON u.member_id = s.user_id 
        AND (s.round_type = 'sim' OR s.round_type IS NULL) 
        AND s.total_strokes IS NOT NULL 
        AND s.total_strokes > 0
      LEFT JOIN course_records cr ON u.member_id = cr.user_id AND cr.is_current = true
      WHERE u.role IN ('Member', 'Admin', 'Club Pro')
    `);

    // Count courses with no records
    const { rows: coursesWithNoRecords } = await pool.query(`
      SELECT COUNT(*) as courses_without_records
      FROM (
        SELECT DISTINCT s.course_id
        FROM scorecards s
        JOIN users u ON s.user_id = u.member_id
        WHERE (s.round_type = 'sim' OR s.round_type IS NULL)
        AND s.total_strokes IS NOT NULL 
        AND s.total_strokes > 0
        AND u.role IN ('Member', 'Admin', 'Club Pro')
        AND s.course_id NOT IN (
          SELECT DISTINCT course_id FROM course_records WHERE is_current = true
        )
      ) as courses_played
    `);

    // Club standings - Course Records (All Time)
    const { rows: courseRecordsAllTime } = await pool.query(`
      SELECT 
        u.club,
        COUNT(DISTINCT cr.course_id) as record_count
      FROM users u
      JOIN course_records cr ON u.member_id = cr.user_id
      WHERE cr.is_current = true
      GROUP BY u.club
      ORDER BY record_count DESC
    `);

    // Club standings - Course Records (Monthly)
    const { rows: courseRecordsMonthly } = await pool.query(`
      SELECT 
        u.club,
        COUNT(DISTINCT cr.course_id) as record_count
      FROM users u
      JOIN course_records cr ON u.member_id = cr.user_id
      WHERE cr.is_current = true
      AND cr.date_played >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY u.club
      ORDER BY record_count DESC
    `);

    // Club standings - Rounds Logged (All Time)
    const { rows: roundsLoggedAllTime } = await pool.query(`
      SELECT 
        u.club,
        COUNT(*) as rounds_count
      FROM users u
      JOIN scorecards s ON u.member_id = s.user_id
      WHERE (s.round_type = 'sim' OR s.round_type IS NULL)
      AND s.total_strokes IS NOT NULL 
      AND s.total_strokes > 0
      GROUP BY u.club
      ORDER BY rounds_count DESC
    `);

    // Club standings - Rounds Logged (Monthly)
    const { rows: roundsLoggedMonthly } = await pool.query(`
      SELECT 
        u.club,
        COUNT(*) as rounds_count
      FROM users u
      JOIN scorecards s ON u.member_id = s.user_id
      WHERE (s.round_type = 'sim' OR s.round_type IS NULL)
      AND s.total_strokes IS NOT NULL 
      AND s.total_strokes > 0
      AND s.date_played >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY u.club
      ORDER BY rounds_count DESC
    `);

    // Club standings - Average Score (All Time)
    const { rows: avgScoreAllTime } = await pool.query(`
      SELECT 
        u.club,
        ROUND(AVG(s.total_strokes), 1) as avg_score,
        COUNT(*) as rounds_count
      FROM users u
      JOIN scorecards s ON u.member_id = s.user_id
      WHERE (s.round_type = 'sim' OR s.round_type IS NULL)
      AND s.total_strokes IS NOT NULL 
      AND s.total_strokes > 0
      GROUP BY u.club
      HAVING COUNT(*) >= 5
      ORDER BY avg_score ASC
    `);

    // Club standings - Average Score (Monthly)
    const { rows: avgScoreMonthly } = await pool.query(`
      SELECT 
        u.club,
        ROUND(AVG(s.total_strokes), 1) as avg_score,
        COUNT(*) as rounds_count
      FROM users u
      JOIN scorecards s ON u.member_id = s.user_id
      WHERE (s.round_type = 'sim' OR s.round_type IS NULL)
      AND s.total_strokes IS NOT NULL 
      AND s.total_strokes > 0
      AND s.date_played >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY u.club
      HAVING COUNT(*) >= 3
      ORDER BY avg_score ASC
    `);

    res.json({
      communityStats: {
        ...communityStats[0],
        courses_without_records: coursesWithNoRecords[0]?.courses_without_records || 0
      },
      clubStandings: {
        courseRecords: {
          allTime: courseRecordsAllTime,
          monthly: courseRecordsMonthly
        },
        roundsLogged: {
          allTime: roundsLoggedAllTime,
          monthly: roundsLoggedMonthly
        },
        averageScore: {
          allTime: avgScoreAllTime,
          monthly: avgScoreMonthly
        }
      }
    });
  } catch (err) {
    console.error('Error fetching global leaderboard:', err);
    res.status(500).json({ error: 'Failed to fetch global leaderboard' });
  }
});

// Get all clubs (for admin functionality)
app.get('/api/clubs', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT DISTINCT club 
      FROM users 
      WHERE club IS NOT NULL AND club != '' 
      AND role IN ('Member', 'Admin', 'Club Pro')
      ORDER BY club
    `);
    
    const clubs = rows.map(row => row.club);
    res.json(clubs);
  } catch (err) {
    console.error('Error fetching clubs:', err);
    res.status(500).json({ error: 'Failed to fetch clubs' });
  }
});
// Get individual club leaderboard (legacy)
app.get('/api/club-leaderboard/:club', async (req, res) => {
  try {
    const { club } = req.params;
    
    // Top 3 Players with Most Course Records
    const { rows: topRecordHolders } = await pool.query(`
      SELECT 
        u.member_id,
        u.first_name,
        u.last_name,
        COUNT(DISTINCT cr.course_id) as record_count
      FROM users u
      JOIN course_records cr ON u.member_id = cr.user_id
      WHERE u.club = $1 AND cr.is_current = true
      GROUP BY u.member_id, u.first_name, u.last_name
      ORDER BY record_count DESC
      LIMIT 3
    `, [club]);

    // Longest Standing Record (in their club)
    const { rows: longestStandingRecord } = await pool.query(`
      SELECT 
        cr.course_id,
        cr.date_played,
        EXTRACT(DAYS FROM NOW() - cr.date_played) as days_standing,
        u.first_name,
        u.last_name,
        sc.name as course_name
      FROM course_records cr
      JOIN users u ON cr.user_id = u.member_id
      JOIN simulator_courses_combined sc ON cr.course_id = sc.id
      WHERE cr.club = $1 AND cr.is_current = true
      ORDER BY cr.date_played ASC
      LIMIT 1
    `, [club]);

    // Most Active Members
    const { rows: mostActiveMembers } = await pool.query(`
      SELECT 
        u.member_id,
        u.first_name,
        u.last_name,
        COUNT(*) as total_rounds,
        COUNT(CASE WHEN s.date_played >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as rounds_this_month
      FROM users u
      JOIN scorecards s ON u.member_id = s.user_id
      WHERE u.club = $1 AND (s.round_type = 'sim' OR s.round_type IS NULL)
      GROUP BY u.member_id, u.first_name, u.last_name
      ORDER BY total_rounds DESC
      LIMIT 5
    `, [club]);

    // Average Score Across All Club Rounds
    const { rows: clubAverageScore } = await pool.query(`
      SELECT 
        ROUND(AVG(s.total_strokes), 1) as avg_score,
        COUNT(*) as total_rounds,
        MIN(s.total_strokes) as best_score,
        MAX(s.total_strokes) as worst_score
      FROM users u
      JOIN scorecards s ON u.member_id = s.user_id
      WHERE u.club = $1 AND (s.round_type = 'sim' OR s.round_type IS NULL)
    `, [club]);

    // Most Played Course (by the club)
    const { rows: mostPlayedCourse } = await pool.query(`
      SELECT 
        sc.name as course_name,
        COUNT(*) as play_count,
        ROUND(AVG(s.total_strokes), 1) as avg_score
      FROM users u
      JOIN scorecards s ON u.member_id = s.user_id
      JOIN simulator_courses_combined sc ON s.course_id = sc.id
      WHERE u.club = $1 AND (s.round_type = 'sim' OR s.round_type IS NULL)
      GROUP BY sc.name
      ORDER BY play_count DESC
      LIMIT 1
    `, [club]);

    // Most Recent Record Set
    const { rows: mostRecentRecord } = await pool.query(`
      SELECT 
        cr.course_id,
        cr.date_played,
        u.first_name,
        u.last_name,
        sc.name as course_name,
        cr.total_strokes
      FROM course_records cr
      JOIN users u ON cr.user_id = u.member_id
      JOIN simulator_courses_combined sc ON cr.course_id = sc.id
      WHERE cr.club = $1 AND cr.is_current = true
      ORDER BY cr.date_played DESC
      LIMIT 1
    `, [club]);

    // Club course records
    const { rows: clubCourseRecords } = await pool.query(`
      SELECT 
        cr.course_id,
        cr.total_strokes,
        cr.date_played,
        u.first_name,
        u.last_name,
        sc.name as course_name,
        EXTRACT(DAYS FROM NOW() - cr.date_played) as days_standing
      FROM course_records cr
      JOIN users u ON cr.user_id = u.member_id
      JOIN simulator_courses_combined sc ON cr.course_id = sc.id
      WHERE cr.club = $1 AND cr.is_current = true
      ORDER BY cr.date_played DESC
    `, [club]);

    // Club member statistics
    const { rows: clubMemberStats } = await pool.query(`
      SELECT 
        u.member_id,
        u.first_name,
        u.last_name,
        u.sim_handicap,
        u.grass_handicap,
        COALESCE(up.total_matches, 0) as total_matches,
        COALESCE(up.wins, 0) as wins,
        COALESCE(up.losses, 0) as losses,
        COALESCE(up.ties, 0) as ties,
        COALESCE(up.total_points, 0) as total_points,
        COALESCE(up.win_rate, 0) as win_rate,
        COUNT(s.id) as total_rounds,
        ROUND(AVG(s.total_strokes), 1) as avg_score,
        MIN(s.total_strokes) as best_score,
        COUNT(DISTINCT s.course_id) as unique_courses,
        COUNT(CASE WHEN s.date_played >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as rounds_this_month
      FROM users u
      LEFT JOIN user_profiles up ON u.member_id = up.user_id
      LEFT JOIN scorecards s ON u.member_id = s.user_id AND (s.round_type = 'sim' OR s.round_type IS NULL)
      WHERE u.club = $1 AND u.role IN ('Member', 'Admin', 'Club Pro')
      GROUP BY u.member_id, u.first_name, u.last_name, u.sim_handicap, u.grass_handicap, up.total_matches, up.wins, up.losses, up.ties, up.total_points, up.win_rate
      ORDER BY up.total_points DESC NULLS LAST, up.win_rate DESC NULLS LAST
    `, [club]);

    res.json({
      club,
      topRecordHolders,
      longestStandingRecord: longestStandingRecord[0] || null,
      mostActiveMembers,
      clubAverageScore: clubAverageScore[0] || {},
      mostPlayedCourse: mostPlayedCourse[0] || null,
      mostRecentRecord: mostRecentRecord[0] || null,
      clubCourseRecords,
      clubMemberStats
    });
  } catch (err) {
    console.error('Error fetching club leaderboard:', err);
    res.status(500).json({ error: 'Failed to fetch club leaderboard' });
  }
});

// Get individual club leaderboard (new format for ClubLeaderboard component)
app.get('/api/leaderboard/club/:club', async (req, res) => {
  try {
    const { club } = req.params;
    const { timeFrame = 'allTime' } = req.query;
    
    // Determine date filter based on timeFrame
    const dateFilter = timeFrame === 'monthly' 
      ? "AND s.date_played >= CURRENT_DATE - INTERVAL '30 days'"
      : "";
    
    // Get club stats - separate queries for better accuracy
    const { rows: playerCount } = await pool.query(`
      SELECT COUNT(DISTINCT u.member_id) as total_players
      FROM users u
      WHERE u.club = $1 AND u.role IN ('Member', 'Admin', 'Club Pro')
    `, [club]);

    const { rows: roundsCount } = await pool.query(`
      SELECT COUNT(s.id) as total_rounds
      FROM users u
      LEFT JOIN scorecards s ON u.member_id = s.user_id AND (s.round_type = 'sim' OR s.round_type IS NULL) ${dateFilter}
      WHERE u.club = $1 AND u.role IN ('Member', 'Admin', 'Club Pro')
    `, [club]);

    const { rows: recordsCount } = await pool.query(`
      SELECT COUNT(DISTINCT cr.course_id) as total_records
      FROM users u
      LEFT JOIN course_records cr ON u.member_id = cr.user_id AND cr.is_current = true ${timeFrame === 'monthly' ? "AND cr.date_played >= CURRENT_DATE - INTERVAL '30 days'" : ""}
      WHERE u.club = $1 AND u.role IN ('Member', 'Admin', 'Club Pro')
    `, [club]);



    // Get both monthly and all-time data regardless of requested timeFrame
    const monthlyDateFilter = "AND s.date_played >= CURRENT_DATE - INTERVAL '30 days'";
    const allTimeDateFilter = "";
    
    // Get course records rankings for both time frames
    const monthlyRecordsFilter = "AND cr.date_played >= CURRENT_DATE - INTERVAL '30 days'";
    const allTimeRecordsFilter = "";
    
    const { rows: courseRecordsMonthly } = await pool.query(`
      SELECT 
        u.member_id as player_id,
        CONCAT(u.first_name, ' ', u.last_name) as player_name,
        COUNT(DISTINCT cr.course_id) as record_count
      FROM users u
      LEFT JOIN course_records cr ON u.member_id = cr.user_id AND cr.is_current = true ${monthlyRecordsFilter}
      WHERE u.club = $1 AND u.role IN ('Member', 'Admin', 'Club Pro')
      GROUP BY u.member_id, u.first_name, u.last_name
      HAVING COUNT(DISTINCT cr.course_id) > 0
      ORDER BY record_count DESC
    `, [club]);

    const { rows: courseRecordsAllTime } = await pool.query(`
      SELECT 
        u.member_id as player_id,
        CONCAT(u.first_name, ' ', u.last_name) as player_name,
        COUNT(DISTINCT cr.course_id) as record_count
      FROM users u
      LEFT JOIN course_records cr ON u.member_id = cr.user_id AND cr.is_current = true ${allTimeRecordsFilter}
      WHERE u.club = $1 AND u.role IN ('Member', 'Admin', 'Club Pro')
      GROUP BY u.member_id, u.first_name, u.last_name
      HAVING COUNT(DISTINCT cr.course_id) > 0
      ORDER BY record_count DESC
    `, [club]);

    // Get rounds logged rankings for both time frames
    const { rows: roundsLoggedMonthly } = await pool.query(`
      SELECT 
        u.member_id as player_id,
        CONCAT(u.first_name, ' ', u.last_name) as player_name,
        COUNT(s.id) as rounds_count
      FROM users u
      LEFT JOIN scorecards s ON u.member_id = s.user_id AND (s.round_type = 'sim' OR s.round_type IS NULL) ${monthlyDateFilter}
      WHERE u.club = $1 AND u.role IN ('Member', 'Admin', 'Club Pro')
      GROUP BY u.member_id, u.first_name, u.last_name
      HAVING COUNT(s.id) > 0
      ORDER BY rounds_count DESC
    `, [club]);

    const { rows: roundsLoggedAllTime } = await pool.query(`
      SELECT 
        u.member_id as player_id,
        CONCAT(u.first_name, ' ', u.last_name) as player_name,
        COUNT(s.id) as rounds_count
      FROM users u
      LEFT JOIN scorecards s ON u.member_id = s.user_id AND (s.round_type = 'sim' OR s.round_type IS NULL) ${allTimeDateFilter}
      WHERE u.club = $1 AND u.role IN ('Member', 'Admin', 'Club Pro')
      GROUP BY u.member_id, u.first_name, u.last_name
      HAVING COUNT(s.id) > 0
      ORDER BY rounds_count DESC
    `, [club]);

    // Get average score rankings for both time frames
    const { rows: averageScoreMonthly } = await pool.query(`
      SELECT 
        u.member_id as player_id,
        CONCAT(u.first_name, ' ', u.last_name) as player_name,
        ROUND(AVG(s.total_strokes), 1) as avg_score,
        COUNT(s.id) as rounds_count
      FROM users u
      LEFT JOIN scorecards s ON u.member_id = s.user_id AND (s.round_type = 'sim' OR s.round_type IS NULL) ${monthlyDateFilter}
      WHERE u.club = $1 AND u.role IN ('Member', 'Admin', 'Club Pro')
      GROUP BY u.member_id, u.first_name, u.last_name
      HAVING COUNT(s.id) > 0
      ORDER BY avg_score ASC
    `, [club]);

    const { rows: averageScoreAllTime } = await pool.query(`
      SELECT 
        u.member_id as player_id,
        CONCAT(u.first_name, ' ', u.last_name) as player_name,
        ROUND(AVG(s.total_strokes), 1) as avg_score,
        COUNT(s.id) as rounds_count
      FROM users u
      LEFT JOIN scorecards s ON u.member_id = s.user_id AND (s.round_type = 'sim' OR s.round_type IS NULL) ${allTimeDateFilter}
      WHERE u.club = $1 AND u.role IN ('Member', 'Admin', 'Club Pro')
      GROUP BY u.member_id, u.first_name, u.last_name
      HAVING COUNT(s.id) > 0
      ORDER BY avg_score ASC
    `, [club]);

    res.json({
      clubStats: {
        total_players: playerCount[0]?.total_players || 0,
        total_rounds: roundsCount[0]?.total_rounds || 0,
        total_records: recordsCount[0]?.total_records || 0
      },
      playerRankings: {
        courseRecords: {
          monthly: courseRecordsMonthly,
          allTime: courseRecordsAllTime
        },
        roundsLogged: {
          monthly: roundsLoggedMonthly,
          allTime: roundsLoggedAllTime
        },
        averageScore: {
          monthly: averageScoreMonthly,
          allTime: averageScoreAllTime
        }
      }
    });
  } catch (err) {
    console.error('Error fetching club leaderboard:', err);
    res.status(500).json({ error: 'Failed to fetch club leaderboard' });
  }
});

// Helper function to transform user data from database format to frontend format
function transformUserData(user) {
  if (!user) return null;
  return {
    ...user,
    email: user.email_address, // Map email_address to email for frontend
    email_address: user.email_address // Keep original for backward compatibility
  };
}

// Get admin user tracking statistics
app.get('/api/admin/user-tracking-stats', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    const { rows: userRows } = await pool.query(
      'SELECT role FROM users WHERE member_id = $1',
      [req.user.member_id]
    );
    
    if (userRows.length === 0) {
      return res.status(403).json({ error: 'User not found' });
    }
    
    const userRole = userRows[0].role;
    const isAdmin = userRole === 'Admin' || userRole === 'admin' || userRole === 'super_admin' || userRole === 'Super Admin';
    
    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Get total users and claimed accounts
    console.log('Fetching user stats...');
    const { rows: userStats } = await pool.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN password_hash IS NOT NULL THEN 1 END) as claimed_accounts,
        COUNT(CASE WHEN password_hash IS NULL THEN 1 END) as unclaimed_accounts
      FROM users
    `);
    console.log('User stats result:', userStats);

    // Get rounds tracked by day for the last 30 days
    console.log('Fetching rounds by day...');
    const { rows: roundsByDay } = await pool.query(`
      SELECT 
        DATE(date_played) as date,
        COUNT(*) as rounds_count
      FROM scorecards 
      WHERE date_played >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE(date_played)
      ORDER BY date DESC
    `);
    console.log('Rounds by day result:', roundsByDay);

    // Get rounds tracked by day for the last 7 days (more detailed)
    console.log('Fetching recent rounds by day...');
    const { rows: recentRoundsByDay } = await pool.query(`
      SELECT 
        DATE(date_played) as date,
        COUNT(*) as rounds_count,
        COUNT(CASE WHEN round_type = 'sim' OR round_type IS NULL THEN 1 END) as sim_rounds,
        COUNT(CASE WHEN round_type = 'grass' THEN 1 END) as grass_rounds
      FROM scorecards 
      WHERE date_played >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY DATE(date_played)
      ORDER BY date DESC
    `);
    console.log('Recent rounds by day result:', recentRoundsByDay);

    // Get top users by rounds in last 30 days
    console.log('Fetching top users...');
    const { rows: topUsers } = await pool.query(`
      SELECT 
        u.first_name,
        u.last_name,
        u.club,
        COUNT(s.id) as rounds_count
      FROM users u
      LEFT JOIN scorecards s ON u.member_id = s.user_id 
        AND s.date_played >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY u.member_id, u.first_name, u.last_name, u.club
      HAVING COUNT(s.id) > 0
      ORDER BY rounds_count DESC
      LIMIT 10
    `);
    console.log('Top users result:', topUsers);

    // Get club statistics
    console.log('Fetching club stats...');
    const { rows: clubStats } = await pool.query(`
      SELECT 
        club,
        COUNT(*) as total_users,
        COUNT(CASE WHEN password_hash IS NOT NULL THEN 1 END) as claimed_accounts,
        COUNT(CASE WHEN password_hash IS NULL THEN 1 END) as unclaimed_accounts
      FROM users
      WHERE club IS NOT NULL
      GROUP BY club
      ORDER BY total_users DESC
    `);
    console.log('Club stats result:', clubStats);

    res.json({
      userStats: userStats[0],
      roundsByDay,
      recentRoundsByDay,
      topUsers,
      clubStats
    });
  } catch (err) {
    console.error('Error fetching admin user tracking stats:', err);
    res.status(500).json({ error: 'Failed to fetch admin user tracking stats' });
  }
});

// Get detailed user tracking data for a specific date range
app.get('/api/admin/user-tracking-details', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    const { rows: userRows } = await pool.query(
      'SELECT role FROM users WHERE member_id = $1',
      [req.user.member_id]
    );
    
    if (userRows.length === 0) {
      return res.status(403).json({ error: 'User not found' });
    }
    
    const userRole = userRows[0].role;
    const isAdmin = userRole === 'Admin' || userRole === 'admin' || userRole === 'super_admin' || userRole === 'Super Admin';
    
    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { startDate, endDate, club } = req.query;
    
    let whereClause = '';
    let params = [];
    let paramIndex = 1;

    if (startDate && endDate) {
      whereClause += `WHERE s.date_played >= $${paramIndex} AND s.date_played <= $${paramIndex + 1}`;
      params.push(startDate, endDate);
      paramIndex += 2;
    } else if (startDate) {
      whereClause += `WHERE s.date_played >= $${paramIndex}`;
      params.push(startDate);
      paramIndex += 1;
    } else if (endDate) {
      whereClause += `WHERE s.date_played <= $${paramIndex}`;
      params.push(endDate);
      paramIndex += 1;
    }

    if (club) {
      const clubCondition = whereClause ? 'AND' : 'WHERE';
      whereClause += ` ${clubCondition} u.club = $${paramIndex}`;
      params.push(club);
    }

    const { rows: detailedStats } = await pool.query(`
      SELECT 
        u.member_id,
        u.first_name,
        u.last_name,
        u.email_address,
        u.club,
        u.role,
        CASE WHEN u.password_hash IS NOT NULL THEN true ELSE false END as has_claimed_account,
        COUNT(s.id) as total_rounds,
        COUNT(CASE WHEN s.round_type = 'sim' OR s.round_type IS NULL THEN 1 END) as sim_rounds,
        COUNT(CASE WHEN s.round_type = 'grass' THEN 1 END) as grass_rounds,
        MIN(s.date_played) as first_round_date,
        MAX(s.date_played) as last_round_date
      FROM users u
      LEFT JOIN scorecards s ON u.member_id = s.user_id
      ${whereClause}
      GROUP BY u.member_id, u.first_name, u.last_name, u.email_address, u.club, u.role, u.password_hash
      ORDER BY total_rounds DESC, u.last_name, u.first_name
    `, params);

    res.json(detailedStats);
  } catch (err) {
    console.error('Error fetching detailed user tracking data:', err);
    res.status(500).json({ error: 'Failed to fetch detailed user tracking data' });
  }
});

// ============================================================================
// NEW WEEKLY SCORING SYSTEM API ENDPOINTS
// ============================================================================

// Resolve canonical tournament period from DB (single source of truth)
async function resolveTournamentPeriod(tournamentId) {
  const result = await pool.query(
    'SELECT start_date, end_date, week_start_date FROM tournaments WHERE id = $1',
    [tournamentId]
  );
  if (result.rows.length === 0) {
    throw new Error('Tournament not found');
  }
  const t = result.rows[0];
  const weekDate = normalizeDateYMD(t.week_start_date) || normalizeDateYMD(t.start_date);
  return {
    start_date: t.start_date,
    end_date: t.end_date,
    week_start_date: weekDate
  };
}

// Normalize any date-like input to YYYY-MM-DD (UTC)
function normalizeDateYMD(dateInput) {
  if (!dateInput) return null;
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return null;
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  } catch (e) {
    const str = String(dateInput);
    return str.includes('T') ? str.split('T')[0] : str;
  }
}

// Helper function to get the Monday of the week containing a given date
// For tournaments, we want the Monday of the week that contains the tournament period
function getWeekStartFromDate(dateString) {
  const date = new Date(dateString);
  
  // For tournament purposes, we want to ensure we get the Monday of the week
  // that contains the tournament dates, not necessarily the Monday of the week
  // containing the start date if it falls on a weekend
  
  // If the start date is Saturday or Sunday, we want the Monday of the NEXT week
  // If it's Monday-Friday, we want the Monday of the current week
  const day = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  let diff;
  if (day === 0) { // Sunday
    // For Sunday, go forward to next Monday (not backward to previous Monday)
    diff = 1;
  } else if (day === 6) { // Saturday
    // For Saturday, go forward to next Monday
    diff = 2;
  } else {
    // For Monday-Friday, go back to Monday of current week
    diff = date.getDate() - day + 1;
  }
  
  const monday = new Date(date);
  monday.setDate(diff);
  
  // Format as YYYY-MM-DD
  const year = monday.getFullYear();
  const month = String(monday.getMonth() + 1).padStart(2, '0');
  const dayOfMonth = String(monday.getDate()).padStart(2, '0');
  const result = `${year}-${month}-${dayOfMonth}`;
  
  console.log(`getWeekStartFromDate: ${dateString} (day ${day}) -> Monday of week: ${result}`);
  return result;
}

// Helper function to determine which course a user should use based on their club
function getUserCoursePreference(userClub) {
  // Club No. 8 uses Trackman, all other clubs use GSPro
  return userClub === 'No. 8' ? 'trackman' : 'gspro';
}

// Helper function to get the appropriate course for a user
function getUserCourse(tournament, userClub) {
  const preference = getUserCoursePreference(userClub);
  
  if (preference === 'trackman' && tournament.trackman_course_id) {
    return {
      course: tournament.trackman_course,
      course_id: tournament.trackman_course_id,
      platform: 'trackman'
    };
  } else if (preference === 'gspro' && tournament.gspro_course_id) {
    return {
      course: tournament.gspro_course,
      course_id: tournament.gspro_course_id,
      platform: 'gspro'
    };
  }
  
  // Fallback to legacy course if platform-specific course not available
  return {
    course: tournament.course,
    course_id: tournament.course_id,
    platform: 'legacy'
  };
}

// Helper function to get week start date (Monday) for current date
function getWeekStartDate(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  const weekStart = new Date(d.setDate(diff));
  const year = weekStart.getFullYear();
  const month = String(weekStart.getMonth() + 1).padStart(2, '0');
  const dayOfMonth = String(weekStart.getDate()).padStart(2, '0');
  const result = year + '-' + month + '-' + dayOfMonth;
  console.log('getWeekStartDate input:', date.toISOString().split('T')[0], 'output:', result);
  return result;
}

// Helper function to get all possible week start dates for a given date range
async function getPossibleWeekStartDates(tournamentId, weekStartDate) {
  try {
    // Query the database to find all actual week_start_date values for this tournament
    const result = await pool.query(
      `SELECT DISTINCT week_start_date 
       FROM weekly_scorecards 
       WHERE tournament_id = $1 
       ORDER BY week_start_date DESC`,
      [tournamentId]
    );
    
    const actualDates = result.rows.map(row => row.week_start_date);
    
    // Return the provided weekStartDate plus any actual dates from the database
    // No more calculated dates - only use actual data
    const allDates = weekStartDate ? [weekStartDate, ...actualDates] : actualDates;
    return [...new Set(allDates)]; // Remove duplicates
  } catch (error) {
    console.error('Error getting possible week start dates:', error);
    // Fallback to just the provided weekStartDate
    return weekStartDate ? [weekStartDate] : [];
  }
}

// Helper function to calculate hole-level points
function calculateHolePoints(player1Scores, player2Scores) {
  let player1HolePoints = 0;
  let player2HolePoints = 0;
  
  for (let i = 0; i < 9; i++) {
    const p1Score = player1Scores[i];
    const p2Score = player2Scores[i];
    
    // Only compare holes where both players have actually played (score > 0)
    if (p1Score > 0 && p2Score > 0) {
    if (p1Score < p2Score) {
      player1HolePoints += 0.5; // Hole win = 0.5 points
    } else if (p2Score < p1Score) {
      player2HolePoints += 0.5; // Hole win = 0.5 points
    }
    // Tie = 0 points for both
    }
  }
  
  return { player1HolePoints, player2HolePoints };
}

// Helper function to calculate round-level points
function calculateRoundPoints(player1Scores, player2Scores) {
  const rounds = [
    { start: 0, end: 3, name: 'round1' }, // Holes 1-3
    { start: 3, end: 6, name: 'round2' }, // Holes 4-6
    { start: 6, end: 9, name: 'round3' }  // Holes 7-9
  ];
  
  const roundPoints = {
    round1: { player1: 0, player2: 0 },
    round2: { player1: 0, player2: 0 },
    round3: { player1: 0, player2: 0 }
  };
  
  rounds.forEach(round => {
    let player1Wins = 0;
    let player2Wins = 0;
    let holesPlayed = 0;
    
    for (let i = round.start; i < round.end; i++) {
      // Only compare holes where both players have actually played (score > 0)
      if (player1Scores[i] > 0 && player2Scores[i] > 0) {
        holesPlayed++;
      if (player1Scores[i] < player2Scores[i]) {
        player1Wins++;
      } else if (player2Scores[i] < player1Scores[i]) {
        player2Wins++;
        }
      }
    }
    
    // Round scoring: Win = 1, Tie = 0, Loss = 0
    // Only calculate round points if at least 2 holes were played in this round
    if (holesPlayed >= 2) {
    if (player1Wins > player2Wins) {
      roundPoints[round.name].player1 = 1;
      roundPoints[round.name].player2 = 0;
    } else if (player2Wins > player1Wins) {
      roundPoints[round.name].player1 = 0;
      roundPoints[round.name].player2 = 1;
    } else {
      roundPoints[round.name].player1 = 0;
      roundPoints[round.name].player2 = 0;
      }
    } else {
      // Not enough holes played in this round to determine winner
      roundPoints[round.name].player1 = 0;
      roundPoints[round.name].player2 = 0;
    }
  });
  
  return roundPoints;
}

// Helper function to determine match winner
function determineMatchWinner(roundPoints) {
  let player1RoundsWon = 0;
  let player2RoundsWon = 0;
  let roundsTied = 0;
  let roundsPlayed = 0;
  
  Object.values(roundPoints).forEach(round => {
    if (round.player1 > 0 || round.player2 > 0) {
      roundsPlayed++;
    if (round.player1 > round.player2) {
      player1RoundsWon++;
    } else if (round.player2 > round.player1) {
      player2RoundsWon++;
    } else {
      roundsTied++;
      }
    }
  });
  
  // Need at least 2 rounds played to determine a match winner
  if (roundsPlayed < 2) {
    return 'tie'; // Not enough rounds played yet
  }
  
  // Match win conditions:
  // - Win 2 or more rounds, OR
  // - Win 1 round and tie the other 2
  if (player1RoundsWon >= 2 || (player1RoundsWon === 1 && roundsTied === 2)) {
    return 'player1';
  } else if (player2RoundsWon >= 2 || (player2RoundsWon === 1 && roundsTied === 2)) {
    return 'player2';
  } else {
    return 'tie';
  }
}

// Helper function to calculate live match bonus (DISABLED - no longer used)
function calculateLiveMatchBonus(matchWinner, isLive, maxLiveMatches = 3) {
  // Live bonus points are no longer awarded
  return 0;
}

// Cache for weekly match calculations to avoid unnecessary recalculations
const weeklyMatchCache = new Map();

// Helper function to get cache key
function getWeeklyMatchCacheKey(tournamentId, weekStartDate) {
  return `${tournamentId}-${weekStartDate}`;
}

// Helper function to get scorecard hash for change detection
async function getScorecardHash(tournamentId, weekStartDate) {
  const possibleDates = await getPossibleWeekStartDates(tournamentId, weekStartDate);
  const datePlaceholders = possibleDates.map((_, i) => `$${i + 2}`).join(', ');
  
  const result = await pool.query(
    `SELECT ws.id, ws.hole_scores, ws.updated_at
     FROM weekly_scorecards ws
     WHERE ws.tournament_id = $1 AND ws.week_start_date IN (${datePlaceholders})
     ORDER BY ws.id`,
    [tournamentId, ...possibleDates]
  );
  
  // Create a hash based on scorecard IDs, scores, and update timestamps
  const hashData = result.rows.map(row => ({
    id: row.id,
    scores: row.hole_scores,
    updated: row.updated_at
  }));
  
  return JSON.stringify(hashData);
}
// Helper function to canonicalize player pairs
// Always store the pair so that player1_id < player2_id
function canonicalizePair(a, b) {
  return a.user_id < b.user_id ? [a, b] : [b, a];
}

// Helper function to calculate all matches for a week with smart caching
// IMPORTANT: This function should ONLY be called by:
// 1. Scorecard submission endpoints (when new/updated scorecards are submitted)
// 2. Manual trigger endpoints (for debugging/testing)
// 3. NOT by data fetching endpoints (to prevent duplicate match creation)
async function calculateWeeklyMatches(tournamentId, weekStartDate) {
  try {
    console.log(`=== CALCULATING WEEKLY MATCHES ===`);
    console.log(`Tournament ID: ${tournamentId}, Week: ${weekStartDate}`);
    
    // Check if we need to recalculate
    const cacheKey = getWeeklyMatchCacheKey(tournamentId, weekStartDate);
    const currentHash = await getScorecardHash(tournamentId, weekStartDate);
    
    console.log(`Cache key: ${cacheKey}`);
    console.log(`Current hash: ${currentHash}`);
    
    // Check cache (but allow bypass for debugging)
    const forceRecalculate = process.env.FORCE_RECALCULATE === 'true';
    if (!forceRecalculate && weeklyMatchCache.has(cacheKey)) {
      const cached = weeklyMatchCache.get(cacheKey);
      if (cached.hash === currentHash) {
        console.log(`Using cached weekly matches for tournament ${tournamentId}, week ${weekStartDate}`);
        return; // No changes, use cached data
      }
    }
    
    if (forceRecalculate) {
      console.log(`Force recalculating matches (bypassing cache)`);
    }
    
    console.log(`Recalculating weekly matches for tournament ${tournamentId}, week ${weekStartDate} (data changed)`);
    
    // Get all scorecards for this tournament and week
    // IMPORTANT: Only process scorecards for the specific week, not all possible dates
    // This prevents duplicate match creation across different weeks
    const scorecardsResult = await pool.query(
      `SELECT ws.*, u.first_name, u.last_name
       FROM weekly_scorecards ws
       JOIN users u ON ws.user_id = u.member_id
       WHERE ws.tournament_id = $1 AND ws.week_start_date = $2`,
      [tournamentId, weekStartDate]
    );
    
    const scorecards = scorecardsResult.rows;
    console.log(`Found ${scorecards.length} scorecards for tournament ${tournamentId}, week ${weekStartDate}`);
    
    // Debug: Show scorecard details
    scorecards.forEach((scorecard, index) => {
      console.log(`  Scorecard ${index + 1}: User ${scorecard.user_id} (${scorecard.first_name} ${scorecard.last_name}), Week: ${scorecard.week_start_date}, Scores: ${JSON.stringify(scorecard.hole_scores)}`);
    });
    
    if (scorecards.length < 2) {
      console.log('Not enough scorecards to calculate matches (need at least 2 players)');
      // Cache the empty result
      weeklyMatchCache.set(cacheKey, { hash: currentHash, timestamp: Date.now() });
      return;
    }
    
    // Generate all possible player pairs
    const matches = [];
    let matchCount = 0;
    
    for (let i = 0; i < scorecards.length; i++) {
      for (let j = i + 1; j < scorecards.length; j++) {
        let a = scorecards[i];
        let b = scorecards[j];
        
        // Skip self-matches (guardrail in code)
        if (a.user_id === b.user_id) {
          console.log(`Skipping self-match for user ${a.user_id}`);
          continue;
        }
        
        // Canonicalize the pair - ensure player1_id < player2_id
        const [player1, player2] = canonicalizePair(a, b);
        
        console.log(`\n--- Creating Match ${++matchCount} ---`);
        console.log(`Player 1: ${player1.first_name} ${player1.last_name} (${player1.user_id})`);
        console.log(`Player 2: ${player2.first_name} ${player2.last_name} (${player2.user_id})`);
        console.log(`Canonical order: ${player1.user_id} < ${player2.user_id}`);
        
        // Calculate match results using the canonical pair
        const player1Scores = player1.hole_scores;
        const player2Scores = player2.hole_scores;
        
        console.log(`Player 1 scores: ${JSON.stringify(player1Scores)}`);
        console.log(`Player 2 scores: ${JSON.stringify(player2Scores)}`);
        
        // Verify scorecard IDs exist
        console.log(`Verifying scorecard IDs: P1=${player1.id}, P2=${player2.id}`);
        const scorecardCheck = await pool.query(
          `SELECT id FROM weekly_scorecards WHERE id IN ($1, $2)`,
          [player1.id, player2.id]
        );
        console.log(`Found ${scorecardCheck.rows.length} scorecards with IDs ${player1.id}, ${player2.id}`);
        
        // Check for existing match - use the specific week_start_date, not all possible dates
        const existingMatch = await pool.query(
          `SELECT id FROM weekly_matches 
           WHERE tournament_id = $1 AND week_start_date = $2 
           AND player1_id = $3 AND player2_id = $4`,
          [tournamentId, weekStartDate, player1.user_id, player2.user_id]
        );
        console.log(`Found ${existingMatch.rows.length} existing matches for this pair in week ${weekStartDate}`);
        
        // Calculate hole points
        const { player1HolePoints, player2HolePoints } = calculateHolePoints(player1Scores, player2Scores);
        
        // Calculate round points
        const roundPoints = calculateRoundPoints(player1Scores, player2Scores);
        
        // Determine match winner
        const matchWinner = determineMatchWinner(roundPoints);
        
        // Determine winner ID
        let winnerId = null;
        if (matchWinner === 'player1') winnerId = player1.user_id;
        else if (matchWinner === 'player2') winnerId = player2.user_id;
        
        // Calculate total points (no live bonus)
        const player1TotalPoints = player1HolePoints + 
          roundPoints.round1.player1 + roundPoints.round2.player1 + roundPoints.round3.player1;
        
        const player2TotalPoints = player2HolePoints + 
          roundPoints.round1.player2 + roundPoints.round2.player2 + roundPoints.round3.player2;
        
        console.log(`Hole points: P1=${player1HolePoints}, P2=${player2HolePoints}`);
        console.log(`Round points: P1=${JSON.stringify(roundPoints)}, P2=${JSON.stringify(roundPoints)}`);
        console.log(`Total points: P1=${player1TotalPoints}, P2=${player2TotalPoints}`);
        console.log(`Match winner: ${matchWinner} (ID: ${winnerId})`);
        
        // Insert or update match with canonical player order
        try {
          console.log(`Inserting match with canonical order: player1_id=${player1.user_id}, player2_id=${player2.user_id}`);
          
          const result = await pool.query(
            `INSERT INTO weekly_matches 
             (tournament_id, week_start_date, player1_id, player2_id, 
              player1_scorecard_id, player2_scorecard_id,
              hole_points_player1, hole_points_player2,
              round1_points_player1, round1_points_player2,
              round2_points_player1, round2_points_player2,
              round3_points_player1, round3_points_player2,
              match_winner_id, match_live_bonus_player1, match_live_bonus_player2,
              total_points_player1, total_points_player2)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
             ON CONFLICT (tournament_id, week_start_date, player1_id, player2_id)
             DO UPDATE SET
               player1_scorecard_id = EXCLUDED.player1_scorecard_id,
               player2_scorecard_id = EXCLUDED.player2_scorecard_id,
               hole_points_player1 = EXCLUDED.hole_points_player1,
               hole_points_player2 = EXCLUDED.hole_points_player2,
               round1_points_player1 = EXCLUDED.round1_points_player1,
               round1_points_player2 = EXCLUDED.round1_points_player2,
               round2_points_player1 = EXCLUDED.round2_points_player1,
               round2_points_player2 = EXCLUDED.round2_points_player2,
               round3_points_player1 = EXCLUDED.round3_points_player1,
               round3_points_player2 = EXCLUDED.round3_points_player2,
               match_winner_id = EXCLUDED.match_winner_id,
               match_live_bonus_player1 = EXCLUDED.match_live_bonus_player1,
               match_live_bonus_player2 = EXCLUDED.match_live_bonus_player2,
               total_points_player1 = EXCLUDED.total_points_player1,
               total_points_player2 = EXCLUDED.total_points_player2
             RETURNING id`,
            [tournamentId, weekStartDate, player1.user_id, player2.user_id,
             player1.id, player2.id,
             player1HolePoints, player2HolePoints,
             roundPoints.round1.player1, roundPoints.round1.player2,
             roundPoints.round2.player1, roundPoints.round2.player2,
             roundPoints.round3.player1, roundPoints.round3.player2,
             winnerId, 0, 0,
             player1TotalPoints, player2TotalPoints]
          );
          
          console.log(`Match inserted/updated successfully. Match ID: ${result.rows[0]?.id || 'N/A'}`);
          console.log(`Rows affected: ${result.rowCount}`);
        } catch (insertError) {
          console.error(`Error inserting match between ${player1.first_name} and ${player2.first_name}:`, insertError);
          console.error('Insert error details:', insertError.message);
          console.error('Error code:', insertError.code);
          console.error('Error constraint:', insertError.constraint);
          console.error('Error detail:', insertError.detail);
          
          // Clear cache on error to force recalculation
          weeklyMatchCache.delete(cacheKey);
          console.log(`Cleared cache due to insertion error`);
        }
      }
    }
    
    // Cache the result (only if we successfully created matches)
    if (matchCount > 0) {
      weeklyMatchCache.set(cacheKey, { 
        hash: currentHash, 
        timestamp: Date.now(),
        matchCount: matchCount 
      });
      console.log(`Cached ${matchCount} matches for tournament ${tournamentId}, week ${weekStartDate}`);

      console.log(`Updating leaderboard after match calculation...`);
      await updateWeeklyLeaderboard(tournamentId, weekStartDate);
      
    } else {
      console.log(`No matches created, not caching result`);
    }
    
    console.log(`=== COMPLETED WEEKLY MATCH CALCULATION ===`);
    console.log(`Tournament ${tournamentId}, Week ${weekStartDate}: Created ${matchCount} matches`);
    
  } catch (err) {
    console.error('Error calculating weekly matches:', err);
    console.error('Stack trace:', err.stack);
  }
}

// Clean up old cache entries (older than 1 hour)
setInterval(() => {
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  for (const [key, value] of weeklyMatchCache.entries()) {
    if (value.timestamp < oneHourAgo) {
      weeklyMatchCache.delete(key);
    }
  }
}, 30 * 60 * 1000); // Clean up every 30 minutes

// Helper function to update weekly leaderboard
async function updateWeeklyLeaderboard(tournamentId, weekStartDate) {
  try {
    console.log(`=== UPDATING WEEKLY LEADERBOARD ===`);
    console.log(`Tournament ID: ${tournamentId}, Week: ${weekStartDate}`);
    
    // Get all registered participants for this tournament
    const participantsResult = await pool.query(
      `SELECT p.user_member_id, u.first_name, u.last_name, u.club
       FROM participation p 
       JOIN users u ON p.user_member_id = u.member_id 
       WHERE p.tournament_id = $1`,
      [tournamentId]
    );
    
    const allParticipants = participantsResult.rows;
    console.log(`Found ${allParticipants.length} registered participants`);
    
    // Get all possible week start dates for this tournament
    const possibleDates = await getPossibleWeekStartDates(tournamentId, weekStartDate);
    console.log(`Possible week dates for tournament ${tournamentId}: ${possibleDates.join(', ')}`);
    
    // Get all scorecards for this tournament across all possible weeks
    const scorecardsResult = await pool.query(
      `SELECT ws.*, u.first_name, u.last_name, u.club
       FROM weekly_scorecards ws
       JOIN users u ON ws.user_id = u.member_id
       WHERE ws.tournament_id = $1 AND ws.week_start_date IN (${possibleDates.map((_, i) => `$${i + 2}`).join(', ')})`,
      [tournamentId, ...possibleDates]
    );
    
    const scorecards = scorecardsResult.rows;
    console.log(`Found ${scorecards.length} scorecards across all possible weeks`);
    
    // Get all matches for this tournament across all possible weeks
    const matchesResult = await pool.query(
      `SELECT * FROM weekly_matches 
       WHERE tournament_id = $1 AND week_start_date IN (${possibleDates.map((_, i) => `$${i + 2}`).join(', ')})`,
      [tournamentId, ...possibleDates]
    );
    
    const matches = matchesResult.rows;
    console.log(`Found ${matches.length} matches across all possible weeks`);
    
    // Create a map of scorecards by user_id for quick lookup
    const scorecardMap = new Map();
    scorecards.forEach(scorecard => {
      scorecardMap.set(scorecard.user_id, scorecard);
    });
    
    // Calculate leaderboard for each registered participant
    for (const participant of allParticipants) {
      const playerId = participant.user_member_id;
      let totalHolePoints = 0;
      let totalRoundPoints = 0;
      let totalMatchBonus = 0;
      let matchesPlayed = 0;
      let matchesWon = 0;
      let matchesTied = 0;
      let matchesLost = 0;
      let liveMatchesPlayed = 0;
      
      // Calculate points from matches
      matches.forEach(match => {
        if (match.player1_id === playerId) {
          totalHolePoints += parseFloat(match.hole_points_player1 || 0);
          totalRoundPoints += parseFloat(match.round1_points_player1 || 0) + 
                            parseFloat(match.round2_points_player1 || 0) + 
                            parseFloat(match.round3_points_player1 || 0);
          totalMatchBonus += parseFloat(match.match_live_bonus_player1 || 0);
          matchesPlayed++;
          
          if (match.match_winner_id === playerId) matchesWon++;
          else if (match.match_winner_id === null) matchesTied++;
          else matchesLost++;
          
          if (parseFloat(match.match_live_bonus_player1 || 0) > 0) liveMatchesPlayed++;
        } else if (match.player2_id === playerId) {
          totalHolePoints += parseFloat(match.hole_points_player2 || 0);
          totalRoundPoints += parseFloat(match.round1_points_player2 || 0) + 
                            parseFloat(match.round2_points_player2 || 0) + 
                            parseFloat(match.round3_points_player2 || 0);
          totalMatchBonus += parseFloat(match.match_live_bonus_player2 || 0);
          matchesPlayed++;
          
          if (match.match_winner_id === playerId) matchesWon++;
          else if (match.match_winner_id === null) matchesTied++;
          else matchesLost++;
          
          if (parseFloat(match.match_live_bonus_player2 || 0) > 0) liveMatchesPlayed++;
        }
      });
      
      // If player has no matches but has submitted a scorecard, they still appear on leaderboard
      // with 0 points until other players join
      const totalScore = totalHolePoints + totalRoundPoints;
      
      console.log(`Player ${playerId}: Hole Points: ${totalHolePoints}, Round Points: ${totalRoundPoints}, Total: ${totalScore}, Matches: ${matchesPlayed}`);
      
      // Insert or update leaderboard entry
      console.log(`Inserting/updating leaderboard entry: Tournament ${tournamentId}, Week ${weekStartDate}, User ${playerId}, Total Score ${totalScore}`);
      
      await pool.query(
        `INSERT INTO weekly_leaderboards 
         (tournament_id, week_start_date, user_id, total_hole_points, total_round_points, 
          total_match_bonus, total_score, matches_played, matches_won, matches_tied, 
          matches_lost, live_matches_played)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (tournament_id, week_start_date, user_id)
         DO UPDATE SET
           total_hole_points = EXCLUDED.total_hole_points,
           total_round_points = EXCLUDED.total_round_points,
           total_match_bonus = EXCLUDED.total_match_bonus,
           total_score = EXCLUDED.total_score,
           matches_played = EXCLUDED.matches_played,
           matches_won = EXCLUDED.matches_won,
           matches_tied = EXCLUDED.matches_tied,
           matches_lost = EXCLUDED.matches_lost,
           live_matches_played = EXCLUDED.live_matches_played,
           updated_at = CURRENT_TIMESTAMP`,
        [tournamentId, weekStartDate, playerId, totalHolePoints, totalRoundPoints, 
         totalMatchBonus, totalScore, matchesPlayed, matchesWon, matchesTied, 
         matchesLost, liveMatchesPlayed]
      );
    }
    
    console.log(`Updated leaderboard for ${allParticipants.length} participants`);
  } catch (err) {
    console.error('Error updating weekly leaderboard:', err);
    throw err;
  }
}

// Test endpoint for weekly scoring (no authentication required)
app.post('/api/test/weekly-scorecard', async (req, res) => {
  const { tournament_id = 1, user_id = 1, hole_scores, is_live = false, group_id = null } = req.body;
  
  try {
    // Validate hole scores (must be 9 holes)
    if (!Array.isArray(hole_scores) || hole_scores.length !== 9) {
      return res.status(400).json({ error: 'Must provide exactly 9 hole scores' });
    }
    
    // Validate all scores are valid numbers
    if (!hole_scores.every(score => typeof score === 'number' && score >= 1)) {
      return res.status(400).json({ error: 'All hole scores must be valid numbers >= 1' });
    }
    
    const totalScore = hole_scores.reduce((sum, score) => sum + score, 0);
    // For test endpoint, use current date as week start date
    const weekStartDate = new Date().toISOString().split('T')[0];
    
    console.log('Attempting to insert scorecard:', {
      user_id,
      tournament_id,
      weekStartDate,
      hole_scores,
      totalScore,
      is_live,
      group_id
    });
    
    // Insert scorecard
    const { rows } = await pool.query(
      `INSERT INTO weekly_scorecards 
       (user_id, tournament_id, week_start_date, hole_scores, total_score, is_live, group_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [user_id, tournament_id, weekStartDate, JSON.stringify(hole_scores), totalScore, is_live, group_id]
    );
    
    console.log('Scorecard inserted successfully:', rows[0]);
    
    // Trigger match calculations for this week
    await calculateWeeklyMatches(tournament_id, weekStartDate);
    
    res.json(rows[0]);
  } catch (err) {
    console.error('Error submitting weekly scorecard:', err);
    res.status(500).json({ error: 'Failed to submit scorecard', details: err.message });
  }
});

// NEW: Test endpoint to manually update leaderboard for completed tournaments
app.post('/api/test/update-completed-tournament-leaderboard', async (req, res) => {
  const { tournament_id, week_start_date } = req.body;
  
  try {
    console.log(`=== MANUALLY UPDATING COMPLETED TOURNAMENT LEADERBOARD ===`);
    console.log(`Tournament ID: ${tournament_id}, Week: ${week_start_date}`);
    
    if (!tournament_id) {
      return res.status(400).json({ error: 'tournament_id is required' });
    }
    
    // Get tournament dates
    const tournamentResult = await pool.query(
      'SELECT start_date, end_date, week_start_date FROM tournaments WHERE id = $1',
      [tournament_id]
    );
    
    if (tournamentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    
    const tournament = tournamentResult.rows[0];
    const weekDate = normalizeDateYMD(week_start_date) || normalizeDateYMD(tournament.week_start_date);
    
    console.log(`Tournament start: ${tournament.start_date}, Tournament end: ${tournament.end_date}`);
    console.log(`Using week date: ${weekDate}`);
    
    // Get all possible week start dates for this tournament
    const possibleDates = await getPossibleWeekStartDates(tournament_id, weekDate);
    console.log(`Possible week dates for tournament ${tournament_id}: ${possibleDates.join(', ')}`);
    
    // Check what scorecards exist across all possible weeks
    const scorecardResult = await pool.query(
      `SELECT COUNT(*) FROM weekly_scorecards WHERE tournament_id = $1 AND week_start_date IN (${possibleDates.map((_, i) => `$${i + 2}`).join(', ')})`,
      [tournament_id, ...possibleDates]
    );
    
    console.log(`Found ${scorecardResult.rows[0].count} scorecards for tournament ${tournament_id}, possible weeks: ${possibleDates.join(', ')}`);
    
    // Update the leaderboard for each possible week
    for (const date of possibleDates) {
      await updateWeeklyLeaderboard(tournament_id, date);
    }
    
    // Check what leaderboard entries were created across all possible weeks
    const leaderboardResult = await pool.query(
      `SELECT COUNT(*) FROM weekly_leaderboards WHERE tournament_id = $1 AND week_start_date IN (${possibleDates.map((_, i) => `$${i + 2}`).join(', ')})`,
      [tournament_id, ...possibleDates]
    );
    
    console.log(`Created ${leaderboardResult.rows[0].count} leaderboard entries for tournament ${tournament_id}, possible weeks: ${possibleDates.join(', ')}`);
    
    res.json({ 
      success: true, 
      message: 'Leaderboard updated successfully',
      tournament_id,
      week_start_date: weekDate,
      scorecards: parseInt(scorecardResult.rows[0].count),
      leaderboard_entries: parseInt(leaderboardResult.rows[0].count)
    });
    
  } catch (err) {
    console.error('Error updating completed tournament leaderboard:', err);
    res.status(500).json({ error: 'Failed to update leaderboard', details: err.message });
  }
});

// API Endpoint: Submit 9-hole scorecard
app.post('/api/tournaments/:id/weekly-scorecard', authenticateToken, async (req, res) => {
  console.log('=== WEEKLY SCORECARD SUBMISSION ENDPOINT CALLED ===');
  console.log('Tournament ID:', req.params.id);
  console.log('User ID:', req.user?.member_id);
  console.log('Request body:', req.body);
  
  const { id } = req.params;
  const { hole_scores, is_live = false, group_id = null } = req.body;
  
  try {
    // Validate tournament exists and get tournament settings
    const tournamentResult = await pool.query(
      'SELECT * FROM tournaments WHERE id = $1',
      [id]
    );
    
    if (tournamentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    
    const tournament = tournamentResult.rows[0];
    console.log('Tournament settings:', tournament);
    
    // Check if this is a par 3 tournament (either by format or teebox selection)
    const isPar3Tournament = tournament.tee === 'Par 3' || tournament.tournament_format === 'par3_match_play';
    console.log('Tournament tee:', tournament.tee);
    console.log('Tournament format:', tournament.tournament_format);
    console.log('Is par 3 tournament:', isPar3Tournament);
    
    // Validate hole scores (must be 9 holes)
    if (!Array.isArray(hole_scores) || hole_scores.length !== 9) {
      return res.status(400).json({ error: 'Must provide exactly 9 hole scores' });
    }
    
    // For real-time scoring, allow partial submissions (some holes can be 0)
    // But validate that submitted scores are valid numbers >= 1
    const submittedScores = hole_scores.filter(score => score > 0);
    if (submittedScores.length === 0) {
      return res.status(400).json({ error: 'Must provide at least one valid hole score' });
    }
    
    if (!submittedScores.every(score => typeof score === 'number' && score >= 1)) {
      return res.status(400).json({ error: 'All submitted hole scores must be valid numbers >= 1' });
    }
    
    const totalScore = hole_scores.reduce((sum, score) => sum + score, 0);
    
    // Get tournament dates and week_start_date to validate submission period
    const tournamentDatesResult = await pool.query(
      'SELECT start_date, end_date, week_start_date FROM tournaments WHERE id = $1',
      [id]
    );
    
    if (tournamentDatesResult.rows.length === 0) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    
    const tournamentDates = tournamentDatesResult.rows[0];
    const currentDate = new Date().toISOString().split('T')[0];
    
    // Check if current date is within tournament period
    if (tournamentDates.start_date && tournamentDates.end_date) {
      const startDate = new Date(tournamentDates.start_date);
      const endDate = new Date(tournamentDates.end_date);
      const submissionDate = new Date(currentDate);
      
      if (submissionDate < startDate || submissionDate > endDate) {
        return res.status(400).json({ 
          error: `Score submission is only allowed during tournament period (${tournamentDates.start_date} to ${tournamentDates.end_date})` 
        });
      }
    }
    
    // Use the tournament's stored week_start_date as the reference period
    // This ensures all scores for the same tournament use the same reference date
    // IMPORTANT: Always use the tournament's week_start_date to prevent duplicate matches
    const tournamentPeriod = tournamentDates.week_start_date || currentDate;
    
    console.log('=== SCORECARD SUBMISSION ===');
    console.log('Client provided week_start_date:', req.body.week_start_date);
    console.log('Tournament period:', tournamentPeriod);
    console.log('Current date:', currentDate);
    console.log('Tournament start:', tournamentDates.start_date);
    console.log('Tournament end:', tournamentDates.end_date);
    console.log('Tournament week_start_date:', tournamentDates.week_start_date);
    console.log('Using tournament week_start_date:', tournamentDates.week_start_date);
    
    // Check if player already submitted for this tournament period
    const existingScorecard = await pool.query(
      'SELECT * FROM weekly_scorecards WHERE user_id = $1 AND tournament_id = $2 AND week_start_date = $3',
      [req.user.member_id, id, tournamentPeriod]
    );
    
    if (existingScorecard.rows.length > 0) {
      // For real-time scoring, allow updates to existing scorecard
      const existing = existingScorecard.rows[0];
      const existingScores = existing.hole_scores;
      
      // Merge new scores with existing scores (new scores take precedence)
      const mergedScores = existingScores.map((existingScore, index) => 
        hole_scores[index] > 0 ? hole_scores[index] : existingScore
      );
      
      const newTotalScore = mergedScores.reduce((sum, score) => sum + score, 0);
      
      // Log par 3 tournament detection for debugging (update)
      console.log('Par 3 tournament detected (update):', isPar3Tournament);
      console.log('Note: Par values should be set to 3 for all holes in par 3 tournaments');
      
      // Update existing scorecard
      const { rows } = await pool.query(
        `UPDATE weekly_scorecards 
         SET hole_scores = $1, total_score = $2, is_live = $3, group_id = $4, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $5 AND tournament_id = $6 AND week_start_date = $7 RETURNING *`,
        [JSON.stringify(mergedScores), newTotalScore, is_live, group_id, req.user.member_id, id, tournamentPeriod]
      );
      
      // Trigger match calculations for this tournament period
      await calculateWeeklyMatches(id, tournamentPeriod);
      
      // Update leaderboard to reflect new total points
      await updateWeeklyLeaderboard(id, tournamentPeriod);
      
      res.json(rows[0]);
      return;
    }
    
    // Log par 3 tournament detection for debugging
    console.log('Par 3 tournament detected:', isPar3Tournament);
    console.log('Note: Par values should be set to 3 for all holes in par 3 tournaments');
    
    // Insert scorecard
    const { rows } = await pool.query(
      `INSERT INTO weekly_scorecards 
       (user_id, tournament_id, week_start_date, hole_scores, total_score, is_live, group_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.user.member_id, id, tournamentPeriod, JSON.stringify(hole_scores), totalScore, is_live, group_id]
    );
    
    console.log(`Inserted scorecard for user ${req.user.member_id}, tournament ${id}, tournament period ${tournamentPeriod}`);
    
    // Trigger match calculations for this tournament period
    await calculateWeeklyMatches(id, tournamentPeriod);
    
    // Update leaderboard to reflect new total points
    await updateWeeklyLeaderboard(id, tournamentPeriod);
    
    res.json(rows[0]);
  } catch (err) {
    console.error('Error submitting weekly scorecard:', err);
    res.status(500).json({ error: 'Failed to submit scorecard' });
  }
});

// API Endpoint: Get current player's weekly scorecard
app.get('/api/tournaments/:id/weekly-scorecard/current', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { week_start_date, fallback_date } = req.query;
  
  try {
    // Get tournament dates to determine the correct reference period
    const tournamentResult = await pool.query(
      'SELECT start_date, end_date, week_start_date FROM tournaments WHERE id = $1',
      [id]
    );
    
    if (tournamentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    
    const tournament = tournamentResult.rows[0];
    
    // Use the provided date, tournament week_start_date, or current date as fallback
    const weekDate = normalizeDateYMD(week_start_date) || normalizeDateYMD(tournament.week_start_date) || new Date().toISOString().split('T')[0];
    
    // Get all possible dates for this tournament
    const possibleDates = await getPossibleWeekStartDates(id, weekDate);
    const datePlaceholders = possibleDates.map((_, i) => `$${i + 2}`).join(', ');
    
    let { rows } = await pool.query(
      `SELECT * FROM weekly_scorecards 
       WHERE tournament_id = $1 AND week_start_date IN (${datePlaceholders}) AND user_id = $${possibleDates.length + 2}`,
      [id, ...possibleDates, req.user.member_id]
    );
    
    if (rows.length > 0) {
      res.json(rows[0]);
    } else {
      res.json(null);
    }
  } catch (err) {
    console.error('Error fetching current player scorecard:', err);
    res.status(500).json({ error: 'Failed to fetch scorecard' });
  }
});

// API Endpoint: Manually trigger leaderboard update (for debugging)
app.post('/api/tournaments/:id/update-leaderboard', async (req, res) => {
  const { id } = req.params;
  const { override_week } = req.query;
  
  try {
    const period = await resolveTournamentPeriod(id);
    const weekDate = normalizeDateYMD(override_week) || period.week_start_date;
    console.log(`Manually updating leaderboard for tournament ${id}, week ${weekDate}`);
    console.log(`Tournament start: ${period.start_date}, Tournament end: ${period.end_date}`);
    
    await updateWeeklyLeaderboard(id, weekDate);
    
    res.json({ success: true, message: 'Leaderboard updated successfully' });
  } catch (err) {
    console.error('Error manually updating leaderboard:', err);
    res.status(500).json({ error: 'Failed to update leaderboard' });
  }
});

// API Endpoint: Manually trigger match calculation (for debugging)
app.post('/api/tournaments/:id/calculate-matches', async (req, res) => {
  const { id } = req.params;
  const { override_week, force = false } = req.query;
  
  try {
    const period = await resolveTournamentPeriod(id);
    const weekDate = normalizeDateYMD(override_week) || period.week_start_date;
    console.log(`Manually calculating matches for tournament ${id}, week ${weekDate}, force: ${force}`);
    
    if (force === 'true') {
      // Clear cache to force recalculation
      const cacheKey = getWeeklyMatchCacheKey(id, weekDate);
      weeklyMatchCache.delete(cacheKey);
      console.log(`Cleared cache for key: ${cacheKey}`);
    }
    
    await calculateWeeklyMatches(id, weekDate);
    
    res.json({ success: true, message: 'Matches calculated successfully' });
  } catch (err) {
    console.error('Error manually calculating matches:', err);
    res.status(500).json({ error: 'Failed to calculate matches' });
  }
});

// API Endpoint: Clean up duplicate matches (for fixing existing duplicates)
app.post('/api/tournaments/:id/cleanup-duplicates', async (req, res) => {
  const { id } = req.params;
  
  try {
    console.log(`Manually cleaning up duplicate matches for tournament ${id}`);
    
    // Find duplicate matches (same tournament, week, and player pair)
    const duplicateResult = await pool.query(
      `SELECT tournament_id, week_start_date, player1_id, player2_id, COUNT(*) as match_count
       FROM weekly_matches 
       WHERE tournament_id = $1
       GROUP BY tournament_id, week_start_date, player1_id, player2_id
       HAVING COUNT(*) > 1
       ORDER BY week_start_date, player1_id, player2_id`,
      [id]
    );
    
    if (duplicateResult.rows.length === 0) {
      return res.json({ success: true, message: 'No duplicate matches found' });
    }
    
    console.log(`Found ${duplicateResult.rows.length} duplicate match groups`);
    let totalDeleted = 0;
    
    for (const duplicate of duplicateResult.rows) {
      console.log(`Processing duplicates for tournament ${duplicate.tournament_id}, week ${duplicate.week_start_date}, players ${duplicate.player1_id} vs ${duplicate.player2_id}`);
      
      // Get all matches for this group, ordered by creation time
      const matchesResult = await pool.query(
        `SELECT id, created_at 
         FROM weekly_matches 
         WHERE tournament_id = $1 AND week_start_date = $2 
         AND player1_id = $3 AND player2_id = $4
         ORDER BY created_at ASC`,
        [duplicate.tournament_id, duplicate.week_start_date, duplicate.player1_id, duplicate.player2_id]
      );
      
      const matches = matchesResult.rows;
      console.log(`Found ${matches.length} matches for this group`);
      
      // Keep the first (oldest) match, delete the rest
      if (matches.length > 1) {
        const matchesToDelete = matches.slice(1); // All except the first
        const deleteIds = matchesToDelete.map(m => m.id);
        
        console.log(`Keeping match ID ${matches[0].id}, deleting IDs: ${deleteIds.join(', ')}`);
        
        const deleteResult = await pool.query(
          `DELETE FROM weekly_matches WHERE id = ANY($1)`,
          [deleteIds]
        );
        
        totalDeleted += deleteResult.rowCount;
        console.log(`Deleted ${deleteResult.rowCount} duplicate matches`);
      }
    }
    
    // Clear cache after cleanup
    const cacheKey = getWeeklyMatchCacheKey(id, 'all');
    weeklyMatchCache.delete(cacheKey);
    
    res.json({ 
      success: true, 
      message: `Cleanup completed. Deleted ${totalDeleted} duplicate matches.`,
      duplicatesFound: duplicateResult.rows.length,
      duplicatesDeleted: totalDeleted
    });
    
  } catch (err) {
    console.error('Error cleaning up duplicate matches:', err);
    res.status(500).json({ error: 'Failed to cleanup duplicate matches', details: err.message });
  }
});

// API Endpoint: Fix tournament week start date (for fixing incorrect week_start_date)
app.post('/api/tournaments/:id/fix-week-date', async (req, res) => {
  const { id } = req.params;
  
  try {
    console.log(`Manually fixing week start date for tournament ${id}`);
    
    // Get the tournament details
    const tournamentResult = await pool.query(
      `SELECT id, name, start_date, end_date, week_start_date 
       FROM tournaments 
       WHERE id = $1`,
      [id]
    );
    
    if (tournamentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    
    const tournament = tournamentResult.rows[0];
    console.log(`Tournament: ${tournament.name}`);
    console.log(`  Start date: ${tournament.start_date}`);
    console.log(`  Current week_start_date: ${tournament.week_start_date}`);
    
    // Calculate the correct week start date
    const correctWeekStart = getWeekStartFromDate(tournament.start_date);
    console.log(`  Correct week_start_date: ${correctWeekStart}`);
    
    // Check if the current week_start_date is incorrect
    if (tournament.week_start_date === correctWeekStart) {
      return res.json({ 
        success: true, 
        message: 'Tournament week start date is already correct',
        current: tournament.week_start_date,
        correct: correctWeekStart
      });
    }
    
    // Update the tournament
    const updateResult = await pool.query(
      `UPDATE tournaments 
       SET week_start_date = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [correctWeekStart, id]
    );
    
    if (updateResult.rowCount > 0) {
      console.log(`Updated tournament ${id} week_start_date from ${tournament.week_start_date} to ${correctWeekStart}`);
      
      // Clear any related caches
      const cacheKey = getWeeklyMatchCacheKey(id, 'all');
      weeklyMatchCache.delete(cacheKey);
      
      res.json({ 
        success: true, 
        message: `Tournament week start date fixed successfully`,
        previous: tournament.week_start_date,
        current: correctWeekStart,
        note: 'You may need to clean up duplicate matches and recalculate after this change'
      });
    } else {
      res.status(500).json({ error: 'Failed to update tournament week start date' });
    }
    
  } catch (err) {
    console.error('Error fixing tournament week start date:', err);
    res.status(500).json({ error: 'Failed to fix tournament week start date', details: err.message });
  }
});
// API Endpoint: Test match insertion (for debugging)
app.post('/api/tournaments/:id/test-match-insert', async (req, res) => {
  const { id } = req.params;
  const { override_week } = req.query;
  
  try {
    const period = await resolveTournamentPeriod(id);
    const weekDate = normalizeDateYMD(override_week) || period.week_start_date;
    console.log(`Testing match insertion for tournament ${id}, week ${weekDate}`);
    
    // Get all possible week start dates for this tournament
    const possibleDates = await getPossibleWeekStartDates(id, weekDate);
    console.log(`Possible week dates for tournament ${id}: ${possibleDates.join(', ')}`);
    
    // Get two scorecards to test with from any of the possible weeks
    const scorecardsResult = await pool.query(
      `SELECT ws.*, u.first_name, u.last_name
       FROM weekly_scorecards ws
       JOIN users u ON ws.user_id = u.member_id
       WHERE ws.tournament_id = $1 AND ws.week_start_date IN (${possibleDates.map((_, i) => `$${i + 2}`).join(', ')})
       LIMIT 2`,
      [id, ...possibleDates]
    );
    
    if (scorecardsResult.rows.length < 2) {
      return res.status(400).json({ 
        error: 'Need at least 2 scorecards to test match insertion',
        scorecards: scorecardsResult.rows.length 
      });
    }
    
    const player1 = scorecardsResult.rows[0];
    const player2 = scorecardsResult.rows[1];
    
    console.log(`Testing with players: ${player1.first_name} vs ${player2.first_name}`);
    
    // Try to insert a simple test match
    const testResult = await pool.query(
      `INSERT INTO weekly_matches 
       (tournament_id, week_start_date, player1_id, player2_id, 
        player1_scorecard_id, player2_scorecard_id,
        hole_points_player1, hole_points_player2,
        total_points_player1, total_points_player2)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (tournament_id, week_start_date, player1_id, player2_id)
       DO UPDATE SET
         hole_points_player1 = EXCLUDED.hole_points_player1,
         hole_points_player2 = EXCLUDED.hole_points_player2,
         total_points_player1 = EXCLUDED.total_points_player1,
         total_points_player2 = EXCLUDED.total_points_player2
       RETURNING id`,
      [id, weekDate, player1.user_id, player2.user_id,
       player1.id, player2.id, 1.5, 2.0, 1.5, 2.0]
    );
    
    console.log(`Test match inserted successfully. ID: ${testResult.rows[0]?.id}`);
    
    res.json({ 
      success: true, 
      message: 'Test match inserted successfully',
      match_id: testResult.rows[0]?.id,
      player1: player1.first_name,
      player2: player2.first_name
    });
  } catch (err) {
    console.error('Error testing match insertion:', err);
    res.status(500).json({ error: 'Failed to test match insertion', details: err.message });
  }
});

// API Endpoint: Debug database state (for debugging)
app.get('/api/tournaments/:id/debug-state', async (req, res) => {
  const { id } = req.params;
  const { override_week } = req.query;
  
  try {
    const period = await resolveTournamentPeriod(id);
    const weekDate = normalizeDateYMD(override_week) || period.week_start_date;
    console.log(`Debugging state for tournament ${id}, week ${weekDate}`);
    
    // Get all possible week start dates for this tournament
    const possibleDates = await getPossibleWeekStartDates(id, weekDate);
    console.log(`Possible week dates for tournament ${id}: ${possibleDates.join(', ')}`);
    
    // Check scorecards
    const scorecardsResult = await pool.query(
      `SELECT ws.*, u.first_name, u.last_name
       FROM weekly_scorecards ws
       JOIN users u ON ws.user_id = u.member_id
       WHERE ws.tournament_id = $1 AND ws.week_start_date IN (${possibleDates.map((_, i) => `$${i + 2}`).join(', ')})`,
      [id, ...possibleDates]
    );
    
    // Check matches
    const matchesResult = await pool.query(
      `SELECT wm.*, u1.first_name as p1_name, u2.first_name as p2_name
       FROM weekly_matches wm
       JOIN users u1 ON wm.player1_id = u1.member_id
       JOIN users u2 ON wm.player2_id = u2.member_id
       WHERE wm.tournament_id = $1 AND wm.week_start_date IN (${possibleDates.map((_, i) => `$${i + 2}`).join(', ')})`,
      [id, ...possibleDates]
    );
    
    // Check leaderboard
    const leaderboardResult = await pool.query(
      `SELECT wl.*, u.first_name, u.last_name
       FROM weekly_leaderboards wl
       JOIN users u ON wl.user_id = u.member_id
       WHERE wl.tournament_id = $1 AND wl.week_start_date IN (${possibleDates.map((_, i) => `$${i + 2}`).join(', ')})`,
      [id, ...possibleDates]
    );
    
    res.json({
      tournament_id: id,
      week_start_date: weekDate,
      scorecards: scorecardsResult.rows,
      matches: matchesResult.rows,
      leaderboard: leaderboardResult.rows,
      cache_keys: Array.from(weeklyMatchCache.keys())
    });
  } catch (err) {
    console.error('Error debugging state:', err);
    res.status(500).json({ error: 'Failed to debug state' });
  }
});

// API Endpoint: Get weekly leaderboard
app.get('/api/tournaments/:id/weekly-leaderboard', async (req, res) => {
  const { id } = req.params;
  const { override_week } = req.query;
  
  try {
    console.log(`=== FETCHING WEEKLY LEADERBOARD ===`);
    console.log(`Tournament ID: ${id}, Week: ${override_week || 'canonical'}`);
    
    // Resolve canonical week
    const period = await resolveTournamentPeriod(id);
    const weekDate = normalizeDateYMD(override_week) || period.week_start_date;
    console.log(`Using week date: ${weekDate}`);
    console.log(`Tournament start: ${period.start_date}, Tournament end: ${period.end_date}`);
    
    // Note: updateWeeklyLeaderboard is only called when data changes (score submissions, match updates)
    // Not on every leaderboard view to prevent duplicate data creation
    
    console.log(`Using week date: ${weekDate}`);
    
    // Debug: Check what's actually in the leaderboard table
    const debugResult = await pool.query(
      `SELECT * FROM weekly_leaderboards WHERE tournament_id = $1`,
      [id]
    );
    console.log(`Debug: Found ${debugResult.rows.length} total leaderboard entries for tournament ${id}`);
    debugResult.rows.forEach(row => {
      console.log(`  - User ${row.user_id}, Week ${row.week_start_date}, Total Score: ${row.total_score}`);
    });
    
    // Debug: Check what scorecards exist for this tournament
    const scorecardDebugResult = await pool.query(
      `SELECT * FROM weekly_scorecards WHERE tournament_id = $1`,
      [id]
    );
    console.log(`Debug: Found ${scorecardDebugResult.rows.length} total scorecards for tournament ${id}`);
    scorecardDebugResult.rows.forEach(row => {
      console.log(`  - User ${row.user_id}, Week ${row.week_start_date}, Total Score: ${row.total_score}`);
    });
    
    // Debug: Check what matches exist for this tournament
    const matchDebugResult = await pool.query(
      `SELECT * FROM weekly_matches WHERE tournament_id = $1`,
      [id]
    );
    console.log(`Debug: Found ${matchDebugResult.rows.length} total matches for tournament ${id}`);
    matchDebugResult.rows.forEach(row => {
      console.log(`  - Match ${row.id}: Player1 ${row.player1_id} vs Player2 ${row.player2_id}, Week ${row.week_start_date}`);
    });
    
    // Get all registered participants for this tournament
    const participantsResult = await pool.query(
      `SELECT p.user_member_id, u.first_name, u.last_name, u.club
       FROM participation p 
       JOIN users u ON p.user_member_id = u.member_id 
       WHERE p.tournament_id = $1`,
      [id]
    );
    
    const allParticipants = participantsResult.rows;
    console.log(`Found ${allParticipants.length} registered participants`);
    
    // Get all possible week start dates for this tournament
    const possibleDates = await getPossibleWeekStartDates(id, weekDate);
    console.log(`Possible week dates for tournament ${id}: ${possibleDates.join(', ')}`);
    
    // Get leaderboard entries for any of the possible weeks
    let leaderboardResult;
    if (possibleDates.length > 0) {
      const datePlaceholders = possibleDates.map((_, i) => `$${i + 2}`).join(', ');
      leaderboardResult = await pool.query(
        `SELECT wl.*, u.first_name, u.last_name, u.club, ws.hole_scores
         FROM weekly_leaderboards wl
         JOIN users u ON wl.user_id = u.member_id
         LEFT JOIN weekly_scorecards ws ON wl.user_id = ws.user_id 
           AND wl.tournament_id = ws.tournament_id 
           AND ws.week_start_date::date = wl.week_start_date::date
         WHERE wl.tournament_id = $1 AND wl.week_start_date::date IN (${datePlaceholders})
         ORDER BY wl.total_score DESC, wl.total_hole_points DESC`,
        [id, ...possibleDates]
      );
    } else {
      // No dates found, return empty result
      leaderboardResult = { rows: [] };
    }
    
    console.log(`Leaderboard query executed with tournament_id: ${id}, possible dates: ${possibleDates.join(', ')}`);
    console.log(`SQL: SELECT ... WHERE tournament_id = ${id} AND week_start_date IN (${possibleDates.map(d => `'${d}'`).join(', ')})`);
    
    const leaderboardEntries = leaderboardResult.rows;
    console.log(`Found ${leaderboardEntries.length} leaderboard entries for week ${weekDate}`);
    
    // Create a map of leaderboard entries by user_id for quick lookup
    const leaderboardMap = new Map();
    leaderboardEntries.forEach(entry => {
      leaderboardMap.set(entry.user_id, entry);
    });
    
    // Combine all participants with their leaderboard data
    const rows = allParticipants.map(participant => {
      const leaderboardEntry = leaderboardMap.get(participant.user_member_id);
      
      if (leaderboardEntry) {
        // Participant has leaderboard data
        return leaderboardEntry;
      } else {
        // Participant has no leaderboard data yet - create default entry
        return {
          user_id: participant.user_member_id,
          first_name: participant.first_name,
          last_name: participant.last_name,
          club: participant.club,
          total_hole_points: 0,
          total_round_points: 0,
          total_match_bonus: 0,
          total_score: 0,
          matches_played: 0,
          matches_won: 0,
          matches_tied: 0,
          matches_lost: 0,
          live_matches_played: 0,
          hole_scores: null
        };
      }
    });
    
    console.log(`Found ${rows.length} leaderboard entries for week ${weekDate}`);
    
    // Sort rows by total score (descending), then by total hole points (descending)
    // Participants with no scores will appear at the bottom
    rows.sort((a, b) => {
      const scoreA = parseFloat(a.total_score || 0);
      const scoreB = parseFloat(b.total_score || 0);
      
      if (scoreA !== scoreB) {
        return scoreB - scoreA; // Descending order
      }
      
      // If scores are equal, sort by hole points
      const holePointsA = parseFloat(a.total_hole_points || 0);
      const holePointsB = parseFloat(b.total_hole_points || 0);
      
      if (holePointsA !== holePointsB) {
        return holePointsB - holePointsA; // Descending order
      }
      
      // If hole points are also equal, sort alphabetically by name
      const nameA = `${a.last_name} ${a.first_name}`.toLowerCase();
      const nameB = `${b.last_name} ${b.first_name}`.toLowerCase();
      return nameA.localeCompare(nameB);
    });
    
    // Handle hole_scores (already arrays from PostgreSQL JSONB)
    const processedRows = rows.map(row => {
      let holeScores = null;
      if (row.hole_scores) {
        if (Array.isArray(row.hole_scores)) {
          // Already an array from PostgreSQL JSONB
          holeScores = row.hole_scores;
        } else if (typeof row.hole_scores === 'string') {
          // String that needs parsing
          try {
            holeScores = JSON.parse(row.hole_scores);
          } catch (e) {
            console.log('Failed to parse hole_scores for user:', row.user_id, 'Error:', e);
            holeScores = null;
          }
        }
      }
      return {
        ...row,
        hole_scores: holeScores
      };
    });
    
    console.log(`Returning ${processedRows.length} processed leaderboard entries`);
    res.json(processedRows);
  } catch (err) {
    console.error('Error fetching weekly leaderboard:', err);
    console.error('Stack trace:', err.stack);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// API Endpoint: Get player's weekly matches
app.get('/api/tournaments/:id/weekly-matches/:userId', async (req, res) => {
  const { id, userId } = req.params;
  const { override_week } = req.query;
  
  try {
    const period = await resolveTournamentPeriod(id);
    const weekDate = normalizeDateYMD(override_week) || period.week_start_date;
    
    // Get all possible week start dates for this tournament
    const possibleDates = await getPossibleWeekStartDates(id, weekDate);
    console.log(`Possible week dates for tournament ${id}: ${possibleDates.join(', ')}`);
    
    // Note: calculateWeeklyMatches is called by scorecard submission endpoints, not here
    // This prevents duplicate match creation and ensures data consistency
    
    let { rows } = await pool.query(
      `SELECT wm.*, 
              u1.first_name as player1_first_name, u1.last_name as player1_last_name,
              u2.first_name as player2_first_name, u2.last_name as player2_last_name,
              ws1.hole_scores as player1_scores, ws2.hole_scores as player2_scores
       FROM weekly_matches wm
       JOIN users u1 ON wm.player1_id = u1.member_id
       JOIN users u2 ON wm.player2_id = u2.member_id
       JOIN weekly_scorecards ws1 ON wm.player1_scorecard_id = ws1.id
       JOIN weekly_scorecards ws2 ON wm.player2_scorecard_id = ws2.id
       WHERE wm.tournament_id = $1 AND wm.week_start_date IN (${possibleDates.map((_, i) => `$${i + 2}`).join(', ')})
       AND (wm.player1_id = $${possibleDates.length + 2} OR wm.player2_id = $${possibleDates.length + 2})
       ORDER BY wm.created_at`,
      [id, ...possibleDates, userId]
    );
    

    
    // Handle score arrays (already arrays from PostgreSQL JSONB)
    const processedRows = rows.map(row => {
      let player1Scores = null;
      let player2Scores = null;
      
      if (row.player1_scores) {
        if (Array.isArray(row.player1_scores)) {
          player1Scores = row.player1_scores;
        } else if (typeof row.player1_scores === 'string') {
          try {
            player1Scores = JSON.parse(row.player1_scores);
          } catch (e) {
            console.log('Failed to parse player1_scores for match:', row.id, 'Error:', e);
          }
        }
      }
      
      if (row.player2_scores) {
        if (Array.isArray(row.player2_scores)) {
          player2Scores = row.player2_scores;
        } else if (typeof row.player2_scores === 'string') {
          try {
            player2Scores = JSON.parse(row.player2_scores);
          } catch (e) {
            console.log('Failed to parse player2_scores for match:', row.id, 'Error:', e);
          }
        }
      }
      
      return {
        ...row,
        player1_scores: player1Scores,
        player2_scores: player2Scores
      };
    });
    
    res.json(processedRows);
  } catch (err) {
    console.error('Error fetching weekly matches:', err);
    res.status(500).json({ error: 'Failed to fetch matches' });
  }
});

// API Endpoint: Get player's total hole points across all matches
app.get('/api/tournaments/:id/weekly-hole-points/:userId', async (req, res) => {
  const { id, userId } = req.params;
  const { override_week } = req.query;
  
  try {
    const period = await resolveTournamentPeriod(id);
    const weekDate = normalizeDateYMD(override_week) || period.week_start_date;
    
    // Get all possible week start dates for this tournament
    const possibleDates = await getPossibleWeekStartDates(id, weekDate);
    console.log(`Possible week dates for tournament ${id}: ${possibleDates.join(', ')}`);
    
    // Note: calculateWeeklyMatches is called by scorecard submission endpoints, not here
    // This prevents duplicate match creation and ensures data consistency
    
    let { rows } = await pool.query(
      `SELECT wm.*, 
              ws1.hole_scores as player1_scores, ws2.hole_scores as player2_scores
       FROM weekly_matches wm
       JOIN weekly_scorecards ws1 ON wm.player1_scorecard_id = ws1.id
       JOIN weekly_scorecards ws2 ON wm.player2_scorecard_id = ws2.id
       WHERE wm.tournament_id = $1 AND wm.week_start_date IN (${possibleDates.map((_, i) => `$${i + 2}`).join(', ')})
       AND (wm.player1_id = $${possibleDates.length + 2} OR wm.player2_id = $${possibleDates.length + 2})`,
      [id, ...possibleDates, userId]
    );
    
    // Calculate total hole points across all matches
    const holePoints = {};
    const roundPoints = {};
    
    for (let hole = 1; hole <= 9; hole++) {
      let totalPoints = 0;
      let wins = 0;
      let losses = 0;
      let ties = 0;
      
      rows.forEach(row => {
        const isPlayer1 = row.player1_id === userId;
        const playerScores = isPlayer1 ? row.player1_scores : row.player2_scores;
        const opponentScores = isPlayer1 ? row.player2_scores : row.player1_scores;
        
        // Handle score arrays
        let playerScore = 0;
        let opponentScore = 0;
        
        if (playerScores) {
          if (Array.isArray(playerScores)) {
            playerScore = playerScores[hole - 1] || 0;
          } else if (typeof playerScores === 'string') {
            try {
              const parsed = JSON.parse(playerScores);
              playerScore = parsed[hole - 1] || 0;
            } catch (e) {
              console.log('Failed to parse player scores for hole calculation');
            }
          }
        }
        
        if (opponentScores) {
          if (Array.isArray(opponentScores)) {
            opponentScore = opponentScores[hole - 1] || 0;
          } else if (typeof opponentScores === 'string') {
            try {
              const parsed = JSON.parse(opponentScores);
              opponentScore = parsed[hole - 1] || 0;
            } catch (e) {
              console.log('Failed to parse opponent scores for hole calculation');
            }
          }
        }
        
        if (playerScore > 0 && opponentScore > 0) {
          if (playerScore < opponentScore) {
            totalPoints += 0.5; // Win
            wins++;
          } else if (playerScore > opponentScore) {
            losses++;
          } else {
            ties++;
          }
        }
      });
      
      // Determine result based on wins vs losses
      let result = null;
      if (wins > losses) {
        result = 'W';
      } else if (losses > wins) {
        result = 'L';
      } else {
        result = 'T';
      }
      
      holePoints[hole] = {
        points: totalPoints,
        result,
        wins,
        losses,
        ties,
        totalMatches: wins + losses + ties,
        record: `${wins}-${ties}-${losses}`
      };
      
      console.log(`Hole ${hole} record:`, holePoints[hole]);
    }
    
    // Calculate round-level W-T-L records
    for (let round = 1; round <= 3; round++) {
      let roundWins = 0;
      let roundLosses = 0;
      let roundTies = 0;
      
      rows.forEach(row => {
        const isPlayer1 = row.player1_id === userId;
        const playerScores = isPlayer1 ? row.player1_scores : row.player2_scores;
        const opponentScores = isPlayer1 ? row.player2_scores : row.player1_scores;
        
        if (playerScores && opponentScores) {
          let playerScoresArray = [];
          let opponentScoresArray = [];
          
          if (Array.isArray(playerScores)) {
            playerScoresArray = playerScores;
          } else if (typeof playerScores === 'string') {
            try {
              playerScoresArray = JSON.parse(playerScores);
            } catch (e) {
              console.log('Failed to parse player scores for round calculation');
            }
          }
          
          if (Array.isArray(opponentScores)) {
            opponentScoresArray = opponentScores;
          } else if (typeof opponentScores === 'string') {
            try {
              opponentScoresArray = JSON.parse(opponentScores);
            } catch (e) {
              console.log('Failed to parse opponent scores for round calculation');
            }
          }
          
          // Calculate round scores (sum of 3 holes)
          const roundStartHole = (round - 1) * 3;
          const playerRoundScore = playerScoresArray.slice(roundStartHole, roundStartHole + 3)
            .filter(score => score > 0)
            .reduce((sum, score) => sum + score, 0);
          const opponentRoundScore = opponentScoresArray.slice(roundStartHole, roundStartHole + 3)
            .filter(score => score > 0)
            .reduce((sum, score) => sum + score, 0);
          
          if (playerRoundScore > 0 && opponentRoundScore > 0) {
            if (playerRoundScore < opponentRoundScore) {
              roundWins++;
            } else if (playerRoundScore > opponentRoundScore) {
              roundLosses++;
            } else {
              roundTies++;
            }
          }
        }
      });
      
      // Determine round result
      let roundResult = null;
      if (roundWins > roundLosses) {
        roundResult = 'W';
      } else if (roundLosses > roundWins) {
        roundResult = 'L';
      } else {
        roundResult = 'T';
      }
      
      roundPoints[round] = {
        wins: roundWins,
        losses: roundLosses,
        ties: roundTies,
        result: roundResult,
        record: `${roundWins}-${roundTies}-${roundLosses}`
      };
      
      console.log(`Round ${round} record:`, roundPoints[round]);
    }
    
    console.log('Final hole points response:', holePoints);
    console.log('Round points response:', roundPoints);
    res.json({ holePoints, roundPoints });
  } catch (err) {
    console.error('Error calculating hole points:', err);
    res.status(500).json({ error: 'Failed to calculate hole points' });
  }
});

// API Endpoint: Get field statistics for a week
app.get('/api/tournaments/:id/weekly-field-stats', async (req, res) => {
  const { id } = req.params;
  const { override_week } = req.query;
  
  try {
    const period = await resolveTournamentPeriod(id);
    const weekDate = normalizeDateYMD(override_week) || period.week_start_date;
    
    // Get all possible week start dates for this tournament
    const possibleDates = await getPossibleWeekStartDates(id, weekDate);
    console.log(`Possible week dates for tournament ${id}: ${possibleDates.join(', ')}`);
    
    // Get all scorecards with hole scores from any of the possible weeks
    let { rows } = await pool.query(
      `SELECT ws.hole_scores, ws.user_id
       FROM weekly_scorecards ws
       WHERE ws.tournament_id = $1 AND ws.week_start_date IN (${possibleDates.map((_, i) => `$${i + 2}`).join(', ')})`,
      [id, ...possibleDates]
    );
    
          // Calculate field statistics for each hole
      const fieldStats = [];
      for (let hole = 1; hole <= 9; hole++) {
        const holeScores = rows
          .filter(row => {
            if (!row.hole_scores) return false;
            let scores = null;
            if (Array.isArray(row.hole_scores)) {
              scores = row.hole_scores;
            } else if (typeof row.hole_scores === 'string') {
              try {
                scores = JSON.parse(row.hole_scores);
              } catch (e) {
                console.log('Failed to parse hole_scores for field stats, hole:', hole, 'Error:', e);
                return false;
              }
            }
            return Array.isArray(scores) && scores[hole - 1] > 0;
          })
          .map(row => {
            let scores = null;
            if (Array.isArray(row.hole_scores)) {
              scores = row.hole_scores;
            } else if (typeof row.hole_scores === 'string') {
              try {
                scores = JSON.parse(row.hole_scores);
              } catch (e) {
                console.log('Failed to parse hole_scores for field stats mapping, hole:', hole, 'Error:', e);
                return null;
              }
            }
            return scores ? scores[hole - 1] : null;
          })
          .filter(score => score !== null);
      
      if (holeScores.length > 0) {
        const average = holeScores.reduce((a, b) => a + b, 0) / holeScores.length;
        const best = Math.min(...holeScores);
        fieldStats.push({
          hole,
          averageScore: Math.round(average * 10) / 10,
          totalPlayers: holeScores.length,
          bestScore: best
        });
      } else {
        fieldStats.push({
          hole,
          averageScore: 0,
          totalPlayers: 0,
          bestScore: 0
        });
      }
    }
    
    res.json(fieldStats);
  } catch (err) {
    console.error('Error fetching field statistics:', err);
    res.status(500).json({ error: 'Failed to fetch field statistics' });
  }
});

// API Endpoint: Get player's scorecard for a week
app.get('/api/tournaments/:id/weekly-scorecard/:userId', async (req, res) => {
  const { id, userId } = req.params;
  const { week_start_date } = req.query;
  
  try {
    // Get tournament dates to determine the correct reference period
    const tournamentResult = await pool.query(
      'SELECT start_date, end_date, week_start_date FROM tournaments WHERE id = $1',
      [id]
    );
    
    if (tournamentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    
    const tournament = tournamentResult.rows[0];
    
    // Use the provided date, tournament week_start_date, or current date as fallback
    const weekDate = normalizeDateYMD(week_start_date) || normalizeDateYMD(tournament.week_start_date) || new Date().toISOString().split('T')[0];
    
    // Get all possible week start dates for this tournament
    const possibleDates = await getPossibleWeekStartDates(id, weekDate);
    console.log(`Possible week dates for tournament ${id}: ${possibleDates.join(', ')}`);
    
    // Get scorecard from any of the possible weeks
    let { rows } = await pool.query(
      `SELECT ws.*, u.first_name, u.last_name, u.club
       FROM weekly_scorecards ws
       JOIN users u ON ws.user_id = u.member_id
       WHERE ws.tournament_id = $1 AND ws.week_start_date IN (${possibleDates.map((_, i) => `$${i + 2}`).join(', ')}) AND ws.user_id = $${possibleDates.length + 2}`,
      [id, ...possibleDates, userId]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Scorecard not found' });
    }
    
    res.json(rows[0]);
  } catch (err) {
    console.error('Error fetching weekly scorecard:', err);
    res.status(500).json({ error: 'Failed to fetch scorecard' });
  }
});

// Admin endpoint: Get all scorecards for a tournament (admin only)
app.get('/api/tournaments/:id/admin/scorecards', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { week_start_date } = req.query;
  
  try {
    // Check if user is admin or super admin (Andrew George)
    const userResult = await pool.query(
      'SELECT role, first_name, last_name FROM users WHERE member_id = $1',
      [req.user.member_id]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(403).json({ error: 'User not found' });
    }
    
    const user = userResult.rows[0];
    const isSuperAdmin = user.first_name === 'Andrew' && user.last_name === 'George';
    const isAdmin = user.role === 'admin';
    
    if (!isAdmin && !isSuperAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    // Get tournament dates to determine the correct reference period
    const tournamentResult = await pool.query(
      'SELECT start_date, end_date, week_start_date FROM tournaments WHERE id = $1',
      [id]
    );
    
    if (tournamentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    
    const tournament = tournamentResult.rows[0];
    
    // Use the provided date, tournament week_start_date, or current date as fallback
    const weekDate = normalizeDateYMD(week_start_date) || normalizeDateYMD(tournament.week_start_date) || new Date().toISOString().split('T')[0];
    
    console.log(`Admin scorecards request - Tournament: ${id}, Requested week: ${week_start_date}, Normalized week: ${weekDate}`);
    console.log(`Tournament dates - start: ${tournament.start_date}, end: ${tournament.end_date}, week_start: ${tournament.week_start_date}`);
    
    // Get all possible week start dates for this tournament
    const possibleDates = await getPossibleWeekStartDates(id, weekDate);
    
    console.log(`Possible dates found: ${JSON.stringify(possibleDates)}`);
    
    // If no possible dates, return empty array
    if (possibleDates.length === 0) {
      console.log(`No possible dates found for tournament ${id}, returning empty array`);
      return res.json([]);
    }
    
    // Get all scorecards for the tournament and week
    let { rows } = await pool.query(
      `SELECT ws.*, u.first_name, u.last_name, u.club, u.email_address
       FROM weekly_scorecards ws
       JOIN users u ON ws.user_id = u.member_id
       WHERE ws.tournament_id = $1 AND ws.week_start_date IN (${possibleDates.map((_, i) => `$${i + 2}`).join(', ')})
       ORDER BY u.last_name, u.first_name`,
      [id, ...possibleDates]
    );
    
    res.json(rows);
  } catch (err) {
    console.error('Error fetching admin scorecards:', err);
    res.status(500).json({ error: 'Failed to fetch scorecards' });
  }
});

// Admin endpoint: Update a scorecard (admin only)
app.put('/api/tournaments/:id/admin/scorecards/:scorecardId', authenticateToken, async (req, res) => {
  const { id, scorecardId } = req.params;
  const { hole_scores, total_score, week_start_date } = req.body;
  
  try {
    // Check if user is admin or super admin (Andrew George)
    const userResult = await pool.query(
      'SELECT role, first_name, last_name FROM users WHERE member_id = $1',
      [req.user.member_id]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(403).json({ error: 'User not found' });
    }
    
    const user = userResult.rows[0];
    const isSuperAdmin = user.first_name === 'Andrew' && user.last_name === 'George';
    const isAdmin = user.role === 'admin';
    
    if (!isAdmin && !isSuperAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    // Validate scorecard exists and belongs to the tournament
    const scorecardResult = await pool.query(
      'SELECT * FROM weekly_scorecards WHERE id = $1 AND tournament_id = $2',
      [scorecardId, id]
    );
    
    if (scorecardResult.rows.length === 0) {
      return res.status(404).json({ error: 'Scorecard not found' });
    }
    
    // Get the week date from the scorecard or request body
    const weekDate = week_start_date || scorecardResult.rows[0].week_start_date;
    
    // Update the scorecard
    const updateResult = await pool.query(
      `UPDATE weekly_scorecards 
       SET hole_scores = $1, total_score = $2
       WHERE id = $3`,
      [JSON.stringify(hole_scores), total_score, scorecardId]
    );
    
    if (updateResult.rowCount === 0) {
      return res.status(500).json({ error: 'Failed to update scorecard' });
    }
    
    // Get the updated scorecard
    const updatedScorecard = await pool.query(
      `SELECT ws.*, u.first_name, u.last_name, u.club
       FROM weekly_scorecards ws
       JOIN users u ON ws.user_id = u.member_id
       WHERE ws.id = $1`,
      [scorecardId]
    );
    
    // Recalculate matches for this tournament
    try {
      console.log(`Recalculating matches for tournament ${id}, week ${weekDate}`);
      await calculateWeeklyMatches(id, weekDate);
      console.log(`Recalculation completed successfully`);
      // TODO: Implement calculateWeeklyLeaderboard function
      // await calculateWeeklyLeaderboard(id, weekDate);
    } catch (calcError) {
      console.error('Error recalculating after scorecard update:', calcError);
      console.error('Error stack:', calcError.stack);
      // Don't fail the request if recalculation fails, but log the error
    }
    
    res.json({
      message: 'Scorecard updated successfully',
      scorecard: updatedScorecard.rows[0]
    });
  } catch (err) {
    console.error('Error updating admin scorecard:', err);
    console.error('Error stack:', err.stack);
    console.error('Error details:', {
      tournamentId: id,
      scorecardId: scorecardId,
      requestBody: req.body,
      userId: req.user?.member_id
    });
    res.status(500).json({ error: 'Failed to update scorecard' });
  }
});

// Admin endpoint: Delete a scorecard (admin only)
app.delete('/api/tournaments/:id/admin/scorecards/:scorecardId', authenticateToken, async (req, res) => {
  const { id, scorecardId } = req.params;
  
  try {
    // Check if user is admin or super admin (Andrew George)
    const userResult = await pool.query(
      'SELECT role, first_name, last_name FROM users WHERE member_id = $1',
      [req.user.member_id]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(403).json({ error: 'User not found' });
    }
    
    const user = userResult.rows[0];
    const isSuperAdmin = user.first_name === 'Andrew' && user.last_name === 'George';
    const isAdmin = user.role === 'admin';
    
    if (!isAdmin && !isSuperAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    // Validate scorecard exists and belongs to the tournament
    const scorecardResult = await pool.query(
      'SELECT * FROM weekly_scorecards WHERE id = $1 AND tournament_id = $2',
      [scorecardId, id]
    );
    
    if (scorecardResult.rows.length === 0) {
      return res.status(404).json({ error: 'Scorecard not found' });
    }
    
    // Delete the scorecard
    const deleteResult = await pool.query(
      'DELETE FROM weekly_scorecards WHERE id = $1',
      [scorecardId]
    );
    
    if (deleteResult.rowCount === 0) {
      return res.status(500).json({ error: 'Failed to delete scorecard' });
    }
    
    res.json({ message: 'Scorecard deleted successfully' });
  } catch (err) {
    console.error('Error deleting admin scorecard:', err);
    res.status(500).json({ error: 'Failed to delete scorecard' });
  }
});

// Admin endpoint: Get all strokeplay scorecards for a tournament (admin only)
app.get('/api/tournaments/:id/admin/strokeplay-scorecards', authenticateToken, async (req, res) => {
  const { id } = req.params;
  
  try {
    // Check if user is admin or super admin (Andrew George)
    const userResult = await pool.query(
      'SELECT role, first_name, last_name FROM users WHERE member_id = $1',
      [req.user.member_id]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(403).json({ error: 'User not found' });
    }
    
    const user = userResult.rows[0];
    const isSuperAdmin = user.first_name === 'Andrew' && user.last_name === 'George';
    const isAdmin = user.role === 'admin';
    
    if (!isAdmin && !isSuperAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    // Get all strokeplay scorecards for the tournament
    let { rows } = await pool.query(
      `SELECT s.*, u.first_name, u.last_name, u.club, u.email_address
       FROM scorecards s
       JOIN users u ON s.user_id = u.member_id
       WHERE s.tournament_id = $1 AND s.type = 'strokeplay'
       ORDER BY u.last_name, u.first_name`,
      [id]
    );
    
    res.json(rows);
  } catch (err) {
    console.error('Error fetching admin strokeplay scorecards:', err);
    res.status(500).json({ error: 'Failed to fetch scorecards' });
  }
});

// Admin endpoint: Update a strokeplay scorecard (admin only)
app.put('/api/tournaments/:id/admin/strokeplay-scorecards/:scorecardId', authenticateToken, async (req, res) => {
  const { id, scorecardId } = req.params;
  const { hole_scores, total_score, notes } = req.body;
  
  try {
    // Check if user is admin or super admin (Andrew George)
    const userResult = await pool.query(
      'SELECT role, first_name, last_name FROM users WHERE member_id = $1',
      [req.user.member_id]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(403).json({ error: 'User not found' });
    }
    
    const user = userResult.rows[0];
    const isSuperAdmin = user.first_name === 'Andrew' && user.last_name === 'George';
    const isAdmin = user.role === 'admin';
    
    if (!isAdmin && !isSuperAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    // Validate scorecard exists and belongs to the tournament
    const scorecardResult = await pool.query(
      'SELECT * FROM scorecards WHERE id = $1 AND tournament_id = $2 AND type = $3',
      [scorecardId, id, 'strokeplay']
    );
    
    if (scorecardResult.rows.length === 0) {
      return res.status(404).json({ error: 'Scorecard not found' });
    }
    
    // Update the scorecard
    const updateResult = await pool.query(
      `UPDATE scorecards 
       SET scores = $1, total_strokes = $2, notes = $3, updated_at = NOW()
       WHERE id = $4`,
      [JSON.stringify(hole_scores), total_score, notes, scorecardId]
    );
    
    if (updateResult.rowCount === 0) {
      return res.status(500).json({ error: 'Failed to update scorecard' });
    }
    
    // Get the updated scorecard
    const updatedScorecard = await pool.query(
      `SELECT s.*, u.first_name, u.last_name, u.club
       FROM scorecards s
       JOIN users u ON s.user_id = u.member_id
       WHERE s.id = $1`,
      [scorecardId]
    );
    
    res.json({
      message: 'Scorecard updated successfully',
      scorecard: updatedScorecard.rows[0]
    });
  } catch (err) {
    console.error('Error updating admin strokeplay scorecard:', err);
    res.status(500).json({ error: 'Failed to update scorecard' });
  }
});

// Admin endpoint: Delete a strokeplay scorecard (admin only)
app.delete('/api/tournaments/:id/admin/strokeplay-scorecards/:scorecardId', authenticateToken, async (req, res) => {
  const { id, scorecardId } = req.params;
  
  try {
    // Check if user is admin or super admin (Andrew George)
    const userResult = await pool.query(
      'SELECT role, first_name, last_name FROM users WHERE member_id = $1',
      [req.user.member_id]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(403).json({ error: 'User not found' });
    }
    
    const user = userResult.rows[0];
    const isSuperAdmin = user.first_name === 'Andrew' && user.last_name === 'George';
    const isAdmin = user.role === 'admin';
    
    if (!isAdmin && !isSuperAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    // Validate scorecard exists and belongs to the tournament
    const scorecardResult = await pool.query(
      'SELECT * FROM scorecards WHERE id = $1 AND tournament_id = $2 AND type = $3',
      [scorecardId, id, 'strokeplay']
    );
    
    if (scorecardResult.rows.length === 0) {
      return res.status(404).json({ error: 'Scorecard not found' });
    }
    
    // Delete the scorecard
    const deleteResult = await pool.query(
      'DELETE FROM scorecards WHERE id = $1',
      [scorecardId]
    );
    
    if (deleteResult.rowCount === 0) {
      return res.status(500).json({ error: 'Failed to delete scorecard' });
    }
    
    res.json({ message: 'Scorecard deleted successfully' });
  } catch (err) {
    console.error('Error deleting admin strokeplay scorecard:', err);
    res.status(500).json({ error: 'Failed to delete scorecard' });
  }
});


// Admin endpoint: Add regular scorecards for handicap tracking (admin only)
app.post('/api/admin/scorecards', authenticateToken, async (req, res) => {
  const { user_id, hole_scores, total_score, notes, round_type, course_id, course_name, teebox, course_rating, course_slope, handicap, date_played } = req.body;
  
  try {
    // Check if user is admin or super admin
    const userResult = await pool.query(
      'SELECT role, first_name, last_name FROM users WHERE member_id = $1',
      [req.user.member_id]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(403).json({ error: 'User not found' });
    }
    
    const user = userResult.rows[0];
    const isSuperAdmin = user.first_name === 'Andrew' && user.last_name === 'George';
    const isAdmin = user.role === 'admin';
    
    if (!isAdmin && !isSuperAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Validate required fields
    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }

    if (!hole_scores || !Array.isArray(hole_scores)) {
      return res.status(400).json({ error: 'hole_scores must be an array' });
    }

    // Check if user exists
    const userCheck = await pool.query(
      'SELECT member_id, first_name, last_name FROM users WHERE member_id = $1',
      [user_id]
    );
    
    if (userCheck.rows.length === 0) {
      return res.status(400).json({ error: 'User not found' });
    }

    // Calculate total score if not provided
    const calculatedTotal = total_score || hole_scores.reduce((sum, score) => sum + (score || 0), 0);

    // Calculate differential for handicap tracking
    let differential = null;
    if (course_rating && course_slope && calculatedTotal) {
      differential = ((calculatedTotal - course_rating) * 113) / course_slope;
    }

    // Insert into regular scorecards table (no tournament_id for handicap tracking)
    const insertQuery = `
      INSERT INTO scorecards (user_id, tournament_id, type, player_name, date_played, handicap, scores, total_strokes, total_mulligans, final_score, round_type, course_rating, course_slope, differential, course_name, course_id, teebox, holes_played, nine_type, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING *
    `;
    
    const insertValues = [
      user_id,
      null, // tournament_id - null for regular scorecards
      'stroke_play', // type
      `${userCheck.rows[0].first_name} ${userCheck.rows[0].last_name}`, // player_name
      date_played || new Date().toISOString().split('T')[0], // date_played
      handicap || 0, // handicap
      JSON.stringify(hole_scores), // scores
      calculatedTotal, // total_strokes
      0, // total_mulligans
      calculatedTotal, // final_score
      round_type || 'sim', // round_type
      course_rating || null, // course_rating
      course_slope || null, // course_slope
      differential, // differential
      course_name || null, // course_name
      course_id || null, // course_id
      teebox || null, // teebox
      hole_scores.length, // holes_played
      null, // nine_type
      new Date() // created_at
    ];

    const { rows } = await pool.query(insertQuery, insertValues);
    
    // Recalculate handicap for this user after saving scorecard
    try {
      await calculateAndUpdateUserHandicap(user_id);
      console.log('Handicap recalculated for user after admin scorecard save');
    } catch (handicapErr) {
      console.error('Error recalculating handicap:', handicapErr);
      // Don't fail the scorecard save if handicap calculation fails
    }
    
    console.log(`Admin added scorecard for user ${user_id}:`, rows[0]);
    
    res.json({ 
      success: true, 
      scorecard: rows[0],
      message: 'Scorecard added successfully for handicap tracking' 
    });
    
  } catch (err) {
    console.error('Error adding admin scorecard:', err);
    res.status(500).json({ error: 'Failed to add scorecard', details: err.message });
  }
});

// Admin endpoint: Add multiple rounds for users (admin only)
app.post('/api/tournaments/:id/admin/rounds/bulk', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { rounds } = req.body;
  
  try {
    // Check if user is admin or super admin (Andrew George)
    const userResult = await pool.query(
      'SELECT role, first_name, last_name FROM users WHERE member_id = $1',
      [req.user.member_id]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(403).json({ error: 'User not found' });
    }
    
    const user = userResult.rows[0];
    const isSuperAdmin = user.first_name === 'Andrew' && user.last_name === 'George';
    const isAdmin = user.role === 'admin';
    
    if (!isAdmin && !isSuperAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    if (!rounds || !Array.isArray(rounds) || rounds.length === 0) {
      return res.status(400).json({ error: 'rounds array is required' });
    }

    const results = [];
    const errors = [];

    for (let i = 0; i < rounds.length; i++) {
      const round = rounds[i];
      const { user_id, week_start_date, hole_scores, total_score, notes, round_type, course_id, course_name, teebox, course_rating, course_slope, handicap, date_played } = round;
      
      try {
        // Validate required fields
        if (!user_id || !hole_scores || !Array.isArray(hole_scores) || hole_scores.length === 0) {
          errors.push({ index: i, error: 'user_id and hole_scores are required' });
          continue;
        }

        // Check if user exists
        const userCheck = await pool.query(
          'SELECT member_id, first_name, last_name FROM users WHERE member_id = $1',
          [user_id]
        );
        
        if (userCheck.rows.length === 0) {
          errors.push({ index: i, error: 'User not found' });
          continue;
        }

        // Calculate total score if not provided
        const calculatedTotal = total_score || hole_scores.reduce((sum, score) => sum + (score || 0), 0);
        
        // Determine the appropriate table based on tournament format
        let tableName, insertQuery, insertValues;
        
        if (week_start_date) {
          // Use weekly_scorecards table
          tableName = 'weekly_scorecards';
          insertQuery = `
            INSERT INTO weekly_scorecards (user_id, tournament_id, week_start_date, hole_scores, total_score, is_live, group_id, submitted_at, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
          `;
          insertValues = [
            user_id,
            id,
            week_start_date,
            JSON.stringify(hole_scores),
            calculatedTotal,
            false,
            'admin_added',
            new Date(),
            new Date()
          ];
        } else {
          // Use regular scorecards table
          tableName = 'scorecards';
          insertQuery = `
            INSERT INTO scorecards (user_id, tournament_id, type, player_name, date_played, handicap, scores, total_strokes, total_mulligans, final_score, round_type, course_rating, course_slope, course_name, course_id, teebox, holes_played, nine_type, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
            RETURNING *
          `;
          insertValues = [
            user_id,
            id,
            'stroke_play',
            `${userCheck.rows[0].first_name} ${userCheck.rows[0].last_name}`,
            date_played || new Date().toISOString().split('T')[0],
            handicap || 0,
            JSON.stringify(hole_scores),
            calculatedTotal,
            0,
            calculatedTotal,
            round_type || 'sim',
            course_rating || null,
            course_slope || null,
            course_name || null,
            course_id || null,
            teebox || null,
            hole_scores.length,
            null,
            new Date()
          ];
        }

        const { rows } = await pool.query(insertQuery, insertValues);
        results.push({ index: i, scorecard: rows[0] });
        
      } catch (err) {
        console.error(`Error adding round ${i}:`, err);
        errors.push({ index: i, error: err.message });
      }
    }
    
    console.log(`Admin bulk added rounds: ${results.length} successful, ${errors.length} failed`);
    
    res.status(201).json({
      message: `Bulk round addition completed: ${results.length} successful, ${errors.length} failed`,
      results,
      errors
    });
  } catch (err) {
    console.error('Error in bulk round addition:', err);
    res.status(500).json({ error: 'Failed to add rounds' });
  }
});

// Admin endpoint: Get all matchplay matches for a tournament (admin only)
app.get('/api/tournaments/:id/admin/matchplay-matches', authenticateToken, async (req, res) => {
  const { id } = req.params;
  
  try {
    // Check if user is admin or super admin (Andrew George)
    const userResult = await pool.query(
      'SELECT role, first_name, last_name FROM users WHERE member_id = $1',
      [req.user.member_id]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(403).json({ error: 'User not found' });
    }
    
    const user = userResult.rows[0];
    const isSuperAdmin = user.first_name === 'Andrew' && user.last_name === 'George';
    const isAdmin = user.role === 'admin';
    
    if (!isAdmin && !isSuperAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    // Get all matchplay matches for the tournament
    let { rows } = await pool.query(
      `SELECT m.*, 
              p1.first_name as player1_first_name, p1.last_name as player1_last_name, p1.club as player1_club,
              p2.first_name as player2_first_name, p2.last_name as player2_last_name, p2.club as player2_club
       FROM tournament_matches m
       JOIN users p1 ON m.player1_id = p1.member_id
       JOIN users p2 ON m.player2_id = p2.member_id
       WHERE m.tournament_id = $1
       ORDER BY m.match_number`,
      [id]
    );
    
    res.json(rows);
  } catch (err) {
    console.error('Error fetching admin matchplay matches:', err);
    res.status(500).json({ error: 'Failed to fetch matches' });
  }
});

// Admin endpoint: Update a matchplay match (admin only)
app.put('/api/tournaments/:id/admin/matchplay-matches/:matchId', authenticateToken, async (req, res) => {
  const { id, matchId } = req.params;
  const { player1_score, player2_score, winner_id, scores } = req.body;
  
  try {
    // Check if user is admin or super admin (Andrew George)
    const userResult = await pool.query(
      'SELECT role, first_name, last_name FROM users WHERE member_id = $1',
      [req.user.member_id]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(403).json({ error: 'User not found' });
    }
    
    const user = userResult.rows[0];
    const isSuperAdmin = user.first_name === 'Andrew' && user.last_name === 'George';
    const isAdmin = user.role === 'admin';
    
    if (!isAdmin && !isSuperAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    // Validate match exists and belongs to the tournament
    const matchResult = await pool.query(
      'SELECT * FROM tournament_matches WHERE id = $1 AND tournament_id = $2',
      [matchId, id]
    );
    
    if (matchResult.rows.length === 0) {
      return res.status(404).json({ error: 'Match not found' });
    }
    
    // Update the match
    const updateResult = await pool.query(
      `UPDATE tournament_matches 
       SET player1_score = $1, player2_score = $2, winner_id = $3, scores = $4, updated_at = NOW()
       WHERE id = $5`,
      [player1_score, player2_score, winner_id, JSON.stringify(scores), matchId]
    );
    
    if (updateResult.rowCount === 0) {
      return res.status(500).json({ error: 'Failed to update match' });
    }
    
    // Get the updated match
    const updatedMatch = await pool.query(
      `SELECT m.*, 
              p1.first_name as player1_first_name, p1.last_name as player1_last_name, p1.club as player1_club,
              p2.first_name as player2_first_name, p2.last_name as player2_last_name, p2.club as player2_club
       FROM tournament_matches m
       JOIN users p1 ON m.player1_id = p1.member_id
       JOIN users p2 ON m.player2_id = p2.member_id
       WHERE m.id = $1`,
      [matchId]
    );
    
    res.json({
      message: 'Match updated successfully',
      match: updatedMatch.rows[0]
    });
  } catch (err) {
    console.error('Error updating admin matchplay match:', err);
    res.status(500).json({ error: 'Failed to update match' });
  }
});

// Get available weeks for a tournament
app.get('/api/tournaments/:id/available-weeks', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate that id is a number
    if (isNaN(Number(id))) {
      return res.status(400).json({ error: 'Tournament ID must be a number' });
    }
    
    // Get all possible week start dates for this tournament
    const possibleDates = await getPossibleWeekStartDates(id, new Date().toISOString().split('T')[0]);
    
    // Also include the tournament's week_start_date if it exists
    const tournamentResult = await pool.query(
      'SELECT week_start_date FROM tournaments WHERE id = $1',
      [id]
    );
    
    let allDates = [...new Set(possibleDates)];
    
    if (tournamentResult.rows.length > 0 && tournamentResult.rows[0].week_start_date) {
      const tournamentWeekDate = normalizeDateYMD(tournamentResult.rows[0].week_start_date);
      if (tournamentWeekDate && !allDates.includes(tournamentWeekDate)) {
        allDates.push(tournamentWeekDate);
      }
    }
    
    // Sort dates in ascending order
    allDates.sort();
    
    res.json(allDates);
  } catch (err) {
    console.error('Error fetching available weeks:', err);
    res.status(500).json({ error: 'Failed to fetch available weeks' });
  }
});

// Get user's appropriate course for a tournament based on their club
app.get('/api/tournaments/:id/user-course/:userId', async (req, res) => {
  try {
    const { id, userId } = req.params;
    
    // Validate that id is a number
    if (isNaN(Number(id)) || isNaN(Number(userId))) {
      return res.status(400).json({ error: 'Tournament ID and User ID must be numbers' });
    }
    
    // Get tournament details
    const tournamentResult = await pool.query(
      `SELECT id, name, course, course_id, gspro_course, gspro_course_id, trackman_course, trackman_course_id
       FROM tournaments WHERE id = $1`,
      [Number(id)]
    );
    
    if (tournamentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    
    // Get user's club
    const userResult = await pool.query(
      'SELECT member_id, first_name, last_name, club FROM users WHERE member_id = $1',
      [Number(userId)]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const tournament = tournamentResult.rows[0];
    const user = userResult.rows[0];
    
    // Get the appropriate course for this user
    const userCourse = getUserCourse(tournament, user.club);
    
    res.json({
      tournament_id: tournament.id,
      tournament_name: tournament.name,
      user_id: user.member_id,
      user_name: `${user.first_name} ${user.last_name}`,
      user_club: user.club,
      course_preference: getUserCoursePreference(user.club),
      ...userCourse
    });
  } catch (err) {
    console.error('Error fetching user course:', err);
    res.status(500).json({ error: 'Failed to fetch user course' });
  }
});

// General tournament route - must be placed AFTER all specific routes to avoid conflicts
app.get('/api/tournaments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate that id is a number
    if (isNaN(Number(id))) {
      return res.status(400).json({ error: 'Tournament ID must be a number' });
    }
    
    const { rows } = await pool.query(
      `SELECT id, name, description, start_date, end_date, week_start_date, status, type, club_restriction,
              team_size, hole_configuration, handicap_enabled, created_by, created_at, updated_at,
              course, course_id, gspro_course, gspro_course_id, trackman_course, trackman_course_id,
              location, rules, notes, tournament_format, registration_deadline, max_participants, 
              min_participants, registration_open, entry_fee, tee, pins, putting_gimme, elevation,
              stimp, mulligan, game_play, firmness, wind, has_registration_form, registration_form_template,
              registration_form_data, payment_organizer, payment_organizer_name, payment_venmo_url
       FROM tournaments WHERE id = $1`,
      [Number(id)]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Error fetching tournament details:', err);
    res.status(500).json({ error: 'Failed to fetch tournament details' });
  }
});

// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});