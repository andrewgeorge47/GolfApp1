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
    created_by
  } = req.body;
  
  if (!name) return res.status(400).json({ error: 'Name is required' });
  
  try {
    const { rows } = await pool.query(
      `INSERT INTO tournaments (
        name, description, start_date, end_date, registration_deadline,
        max_participants, min_participants, tournament_format, status,
        registration_open, entry_fee, location, course, course_id, rules, notes, type, 
        club_restriction, team_size, hole_configuration, tee, pins, putting_gimme, elevation,
        stimp, mulligan, game_play, firmness, wind, handicap_enabled, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31) RETURNING *`,
      [
        name, description, start_date, end_date, registration_deadline,
        max_participants, min_participants || 2, tournament_format || 'match_play', 
        status || 'draft', registration_open !== false, entry_fee || 0,
        location, course, course_id, rules, notes, type || 'tournament', 
        club_restriction || 'open', team_size, hole_configuration || '18', tee || 'Red',
        pins || 'Friday', putting_gimme || '8', elevation || 'Course', stimp || '11',
        mulligan || 'No', game_play || 'Force Realistic', firmness || 'Normal',
        wind || 'None', handicap_enabled || false, created_by
      ]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('Error creating tournament:', err);
    res.status(500).json({ error: 'Failed to create tournament' });
  }
});

// Get all tournaments
app.get('/api/tournaments', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM tournaments ORDER BY start_date DESC, id DESC');
    res.json(rows);
  } catch (err) {
    console.error('Error fetching tournaments:', err);
    res.status(500).json({ error: 'Failed to fetch tournaments' });
  }
});

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
    created_by
  } = req.body;
  
  try {
    const { rows } = await pool.query(
      `UPDATE tournaments SET 
        name = $1, description = $2, start_date = $3, end_date = $4, 
        registration_deadline = $5, max_participants = $6, min_participants = $7,
        tournament_format = $8, status = $9, registration_open = $10,
        entry_fee = $11, location = $12, course = $13, course_id = $14, rules = $15,
        notes = $16, type = $17, club_restriction = $18, team_size = $19, hole_configuration = $20,
        tee = $21, pins = $22, putting_gimme = $23, elevation = $24, stimp = $25,
        mulligan = $26, game_play = $27, firmness = $28, wind = $29, handicap_enabled = $30,
        created_by = $31, updated_at = CURRENT_TIMESTAMP
       WHERE id = $32 RETURNING *`,
      [
        name, description, start_date, end_date, registration_deadline,
        max_participants, min_participants, tournament_format, status,
        registration_open, entry_fee, location, course, course_id, rules, notes, type,
        club_restriction, team_size, hole_configuration, tee, pins, putting_gimme, elevation,
        stimp, mulligan, game_play, firmness, wind, handicap_enabled, created_by, id
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
      `SELECT p.*, u.first_name, u.last_name, u.email_address, u.club, u.role 
       FROM participation p 
       JOIN users u ON p.user_member_id = u.member_id 
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

// Register user for tournament
app.post('/api/tournaments/:id/register', async (req, res) => {
  const { id } = req.params;
  const { user_id } = req.body;
  
  if (!user_id) {
    return res.status(400).json({ error: 'User ID is required' });
  }
  
  try {
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
    if (tournament.registration_deadline && new Date(tournament.registration_deadline) < new Date()) {
      return res.status(400).json({ error: 'Registration deadline has passed' });
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
    res.status(500).json({ error: 'Failed to register user for tournament' });
  }
});

// Unregister user from tournament
app.delete('/api/tournaments/:id/unregister/:userId', async (req, res) => {
  const { id, userId } = req.params;
  
  try {
    const { rows } = await pool.query(
      'DELETE FROM participation WHERE tournament_id = $1 AND user_member_id = $2 RETURNING *',
      [id, userId]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Registration not found' });
    }
    
    res.json({ success: true, message: 'User unregistered successfully' });
  } catch (err) {
    console.error('Error unregistering user from tournament:', err);
    res.status(500).json({ error: 'Failed to unregister user from tournament' });
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
    
    if (existingCheck.rows.length > 0) {
      return res.status(409).json({ error: 'User is already checked in for this tournament' });
    }
    
    const { rows } = await pool.query(
      'INSERT INTO check_ins (tournament_id, user_member_id, notes) VALUES ($1, $2, $3) RETURNING *',
      [id, user_id, notes || null]
    );
    
    // Get user details for response
    const userResult = await pool.query(
      'SELECT member_id, first_name, last_name, email_address, club FROM users WHERE member_id = $1',
      [user_id]
    );
    
    res.json({
      ...rows[0],
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

// ===== TEAM MANAGEMENT ENDPOINTS =====

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
    // Get teams with captain information
    const teamsResult = await pool.query(
      `SELECT 
        tt.*,
        u.first_name as captain_first_name,
        u.last_name as captain_last_name,
        u.club as captain_club
       FROM tournament_teams tt
       JOIN users u ON tt.captain_id = u.member_id
       WHERE tt.tournament_id = $1
       ORDER BY tt.name`,
      [id]
    );
    
    // Get team members for each team
    const teams = await Promise.all(teamsResult.rows.map(async (team) => {
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
      
      return {
        ...team,
        players: membersResult.rows
      };
    }));
    
    res.json(teams);
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
    
    // Get updated team data
    const updatedTeamResult = await pool.query(
      `SELECT 
        tt.*,
        u.first_name as captain_first_name,
        u.last_name as captain_last_name,
        u.club as captain_club
       FROM tournament_teams tt
       JOIN users u ON tt.captain_id = u.member_id
       WHERE tt.id = $1`,
      [teamId]
    );
    
    // Get updated team members
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
      [teamId]
    );
    
    const updatedTeam = {
      ...updatedTeamResult.rows[0],
      players: membersResult.rows
    };
    
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
    const { rows } = await pool.query(
      `SELECT 
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
       ORDER BY tts.total_score ASC, tts.submitted_at ASC`,
      [id]
    );
    
    // For each team score, fetch the team members
    const teamScoresWithPlayers = await Promise.all(
      rows.map(async (score) => {
        const teamMembersResult = await pool.query(
          `SELECT 
            tm.user_member_id,
            u.first_name,
            u.last_name,
            u.club,
            tm.is_captain
           FROM team_members tm
           JOIN users u ON tm.user_member_id = u.member_id
           WHERE tm.team_id = $1 AND tm.tournament_id = $2
           ORDER BY tm.is_captain DESC, u.first_name ASC`,
          [score.team_id, id]
        );
        
        return {
          ...score,
          players: teamMembersResult.rows
        };
      })
    );
    
    res.json(teamScoresWithPlayers);
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
      `SELECT 
        tts.*,
        tt.name as team_name,
        u.first_name as captain_first_name,
        u.last_name as captain_last_name,
        u.club as captain_club
       FROM tournament_team_scores tts
       JOIN tournament_teams tt ON tts.team_id = tt.id
       JOIN users u ON tts.submitted_by = u.member_id
       WHERE tts.tournament_id = $1 AND tts.team_id = $2`,
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
        [2, 4], [2, 5],
        [3, 4], [3, 5],
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

    // Create profiles if they don't exist
    if (!profile1) {
      await pool.query(
        'INSERT INTO user_profiles (user_id, total_matches, wins, losses, ties, total_points, win_rate) VALUES ($1, 0, 0, 0, 0, 0, 0)',
        [player1Id]
      );
      profile1 = { total_matches: 0, wins: 0, losses: 0, ties: 0, total_points: 0 };
    }

    if (!profile2) {
      await pool.query(
        'INSERT INTO user_profiles (user_id, total_matches, wins, losses, ties, total_points, win_rate) VALUES ($1, 0, 0, 0, 0, 0, 0)',
        [player2Id]
      );
      profile2 = { total_matches: 0, wins: 0, losses: 0, ties: 0, total_points: 0 };
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
        ADD COLUMN IF NOT EXISTS nine_type VARCHAR(10) DEFAULT NULL
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
  const { type, player_name, date_played, handicap, scores, total_strokes, total_mulligans, final_score, round_type, course_rating, course_slope, course_name, teebox } = req.body;
  
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
      `INSERT INTO scorecards (user_id, type, player_name, date_played, handicap, scores, total_strokes, total_mulligans, final_score, round_type, course_rating, course_slope, differential, course_name, course_id, teebox, holes_played, nine_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) RETURNING *`,
      [
        req.user.member_id,
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

// Get available tournaments (open for registration)
app.get('/api/tournaments/available', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT * FROM tournaments 
      WHERE status IN ('open') 
      AND registration_open = true 
      AND (registration_deadline IS NULL OR registration_deadline >= CURRENT_DATE)
      ORDER BY start_date ASC, id DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching available tournaments:', err);
    res.status(500).json({ error: 'Failed to fetch available tournaments' });
  }
});

// Get tournaments that a user is registered for
app.get('/api/tournaments/user/:userId', async (req, res) => {
  const { userId } = req.params;
  
  try {
    const { rows } = await pool.query(`
      SELECT t.*
      FROM tournaments t
      INNER JOIN participation p ON t.id = p.tournament_id
      WHERE p.user_member_id = $1
      ORDER BY t.start_date ASC, t.id DESC
    `, [userId]);
    
    res.json(rows);
  } catch (err) {
    console.error('Error fetching user tournaments:', err);
    res.status(500).json({ error: 'Failed to fetch user tournaments' });
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
        registration_deadline_passed: tournament.registration_deadline ? new Date(tournament.registration_deadline) < new Date() : false
      }
    };
    
    res.json(stats);
  } catch (err) {
    console.error('Error fetching tournament formation stats:', err);
    res.status(500).json({ error: 'Failed to fetch tournament formation stats' });
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

// Combined Simulator Courses API
app.get('/api/simulator-courses', async (req, res) => {
  try {
    const { search, platform, server, designer, location, courseType, limit = 20, offset = 0 } = req.query;
    let query = 'SELECT * FROM simulator_courses_combined WHERE 1=1';
    const params = [];
    let paramCount = 0;

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
    for (const row of rows) {
      const p = row.platforms;
      if (p.includes('GSPro') && p.includes('Trackman')) shared_courses++;
      else if (p.includes('GSPro')) unique_gspro++;
      else if (p.includes('Trackman')) unique_trackman++;
      if (p.includes('GSPro')) gspro_courses++;
      if (p.includes('Trackman')) trackman_courses++;
    }
    res.json({
      total_courses,
      gspro_courses,
      trackman_courses,
      shared_courses,
      unique_gspro,
      unique_trackman
    });
  } catch (error) {
    console.error('Error fetching combined simulator stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
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
    
    if (userRows.length === 0 || userRows[0].role !== 'Admin') {
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
    
    if (userRows.length === 0 || userRows[0].role !== 'Admin') {
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

// --- Simulator Bay Booking ---
// Create tables if not exists
(async () => {
  try {
    // Create simulator_bookings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS simulator_bookings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(member_id) ON DELETE CASCADE,
        date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        type VARCHAR(10) DEFAULT 'solo',
        participants INTEGER[] DEFAULT '{}',
        bay INTEGER DEFAULT 1
      )
    `);
    console.log('simulator_bookings table ready.');

    // Create club_booking_settings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS club_booking_settings (
        id SERIAL PRIMARY KEY,
        club_name VARCHAR(100) UNIQUE NOT NULL,
        number_of_bays INTEGER DEFAULT 4,
        opening_time TIME DEFAULT '07:00',
        closing_time TIME DEFAULT '22:00',
        days_of_operation VARCHAR(50) DEFAULT 'Mon,Tue,Wed,Thu,Fri,Sat,Sun',
        booking_duration_options VARCHAR(100) DEFAULT '30,60,90,120',
        max_advance_booking_days INTEGER DEFAULT 30,
        min_booking_duration INTEGER DEFAULT 30,
        max_booking_duration INTEGER DEFAULT 240,
        enabled BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('club_booking_settings table ready.');

    // Insert default settings for No. 5 club if not exists
    await pool.query(`
      INSERT INTO club_booking_settings (club_name, number_of_bays, opening_time, closing_time)
      VALUES ('No. 5', 4, '07:00', '22:00')
      ON CONFLICT (club_name) DO NOTHING
    `);
    console.log('Default booking settings for No. 5 created.');
  } catch (err) {
    console.error('Error creating booking tables:', err);
  }
})();

// Middleware to restrict to admin users only
async function requireAdminForBooking(req, res, next) {
  try {
    const userId = req.user?.member_id || req.user?.user_id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });
    const { rows } = await pool.query('SELECT role FROM users WHERE member_id = $1', [userId]);
    if (!rows[0] || rows[0].role?.toLowerCase() !== 'admin') {
      return res.status(403).json({ error: 'Access restricted to administrators only' });
    }
    next();
  } catch (err) {
    res.status(500).json({ error: 'Failed to check admin access' });
  }
}

// Middleware to restrict to admin users only (general purpose)
async function requireAdmin(req, res, next) {
  try {
    const userId = req.user?.member_id || req.user?.user_id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });
    const { rows } = await pool.query('SELECT role FROM users WHERE member_id = $1', [userId]);
    if (!rows[0] || rows[0].role?.toLowerCase() !== 'admin') {
      return res.status(403).json({ error: 'Access restricted to administrators only' });
    }
    next();
  } catch (err) {
    res.status(500).json({ error: 'Failed to check admin access' });
  }
}

// Get bookings (all or for a specific date)
app.get('/api/simulator-bookings', authenticateToken, requireAdminForBooking, async (req, res) => {
  const { date } = req.query;
  try {
    let query = 'SELECT b.*, u.first_name, u.last_name FROM simulator_bookings b JOIN users u ON b.user_id = u.member_id';
    let params = [];
    
    if (date) {
      query += ' WHERE b.date = $1 ORDER BY b.start_time';
      params = [date];
    } else {
      query += ' ORDER BY b.date, b.start_time';
    }
    
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// Create a booking
app.post('/api/simulator-bookings', authenticateToken, requireAdminForBooking, async (req, res) => {
  const userId = req.user?.member_id || req.user?.user_id;
  const { date, start_time, end_time, type, bay } = req.body;
  if (!date || !start_time || !end_time) return res.status(400).json({ error: 'Missing fields' });
  try {
    // Prevent double booking for the same bay
    const conflict = await pool.query(
      'SELECT 1 FROM simulator_bookings WHERE date = $1 AND bay = $2 AND ((start_time, end_time) OVERLAPS ($3::time, $4::time))',
      [date, bay || 1, start_time, end_time]
    );
    if (conflict.rows.length > 0) {
      return res.status(409).json({ error: 'Time slot already booked for this bay' });
    }
    const { rows } = await pool.query(
      'INSERT INTO simulator_bookings (user_id, date, start_time, end_time, type, participants, bay) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [userId, date, start_time, end_time, type || 'solo', type === 'social' ? [userId] : [], bay || 1]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

// Delete a booking (only by owner)
app.delete('/api/simulator-bookings/:id', authenticateToken, requireAdminForBooking, async (req, res) => {
  const userId = req.user?.member_id || req.user?.user_id;
  const { id } = req.params;
  try {
    const { rows } = await pool.query('SELECT * FROM simulator_bookings WHERE id = $1', [id]);
    if (!rows[0]) return res.status(404).json({ error: 'Booking not found' });
    if (rows[0].user_id !== userId) return res.status(403).json({ error: 'Can only delete your own bookings' });
    await pool.query('DELETE FROM simulator_bookings WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete booking' });
  }
});

// Reschedule a booking (only by owner)
app.put('/api/simulator-bookings/:id', authenticateToken, requireAdminForBooking, async (req, res) => {
  const userId = req.user?.member_id || req.user?.user_id;
  const { id } = req.params;
  const { date, start_time, end_time, type, bay } = req.body;
  if (!date || !start_time || !end_time) return res.status(400).json({ error: 'Missing fields' });
  try {
    const { rows } = await pool.query('SELECT * FROM simulator_bookings WHERE id = $1', [id]);
    if (!rows[0]) return res.status(404).json({ error: 'Booking not found' });
    if (rows[0].user_id !== userId) return res.status(403).json({ error: 'Can only reschedule your own bookings' });
    // Prevent double booking for the same bay
    const conflict = await pool.query(
      'SELECT 1 FROM simulator_bookings WHERE id != $1 AND date = $2 AND bay = $3 AND ((start_time, end_time) OVERLAPS ($4::time, $5::time))',
      [id, date, bay || rows[0].bay || 1, start_time, end_time]
    );
    if (conflict.rows.length > 0) {
      return res.status(409).json({ error: 'Time slot already booked for this bay' });
    }
    const updated = await pool.query(
      'UPDATE simulator_bookings SET date = $1, start_time = $2, end_time = $3, type = $4, bay = $5 WHERE id = $6 RETURNING *',
      [date, start_time, end_time, type || rows[0].type, bay || rows[0].bay || 1, id]
    );
    res.json(updated.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to reschedule booking' });
  }
});

// Join a social booking
app.post('/api/simulator-bookings/:id/join', authenticateToken, requireAdminForBooking, async (req, res) => {
  const userId = req.user?.member_id || req.user?.user_id;
  const { id } = req.params;
  try {
    const { rows } = await pool.query('SELECT * FROM simulator_bookings WHERE id = $1', [id]);
    const booking = rows[0];
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.type !== 'social') return res.status(400).json({ error: 'Only social bookings can be joined' });
    if (booking.participants && booking.participants.includes(userId)) {
      return res.status(409).json({ error: 'Already joined' });
    }
    const newParticipants = booking.participants ? [...booking.participants, userId] : [userId];
    const updated = await pool.query(
      'UPDATE simulator_bookings SET participants = $1 WHERE id = $2 RETURNING *',
      [newParticipants, id]
    );
    res.json(updated.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to join booking' });
  }
});

// Migration: add type, participants, and bay columns if not exist
(async () => {
  try {
    await pool.query(`ALTER TABLE simulator_bookings ADD COLUMN IF NOT EXISTS type VARCHAR(10) DEFAULT 'solo'`);
    await pool.query(`ALTER TABLE simulator_bookings ADD COLUMN IF NOT EXISTS participants INTEGER[] DEFAULT '{}'`);
    await pool.query(`ALTER TABLE simulator_bookings ADD COLUMN IF NOT EXISTS bay INTEGER DEFAULT 1`);
  } catch (err) {
    // Ignore if already exists
  }
})();

// --- Club Booking Settings API ---

// Get all club booking settings
app.get('/api/club-booking-settings', authenticateToken, requireAdminForBooking, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM club_booking_settings ORDER BY club_name');
    res.json(rows);
  } catch (err) {
    console.error('Error fetching club booking settings:', err);
    res.status(500).json({ error: 'Failed to fetch club booking settings' });
  }
});

// Get booking settings for a specific club
app.get('/api/club-booking-settings/:clubName', authenticateToken, requireAdminForBooking, async (req, res) => {
  const { clubName } = req.params;
  try {
    const { rows } = await pool.query('SELECT * FROM club_booking_settings WHERE club_name = $1', [clubName]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Club booking settings not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Error fetching club booking settings:', err);
    res.status(500).json({ error: 'Failed to fetch club booking settings' });
  }
});

// Create new club booking settings
app.post('/api/club-booking-settings', authenticateToken, requireAdminForBooking, async (req, res) => {
  const {
    club_name,
    number_of_bays,
    opening_time,
    closing_time,
    days_of_operation,
    booking_duration_options,
    max_advance_booking_days,
    min_booking_duration,
    max_booking_duration,
    enabled
  } = req.body;

  if (!club_name) {
    return res.status(400).json({ error: 'Club name is required' });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO club_booking_settings
       (club_name, number_of_bays, opening_time, closing_time, days_of_operation,
        booking_duration_options, max_advance_booking_days, min_booking_duration,
        max_booking_duration, enabled, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
       RETURNING *`,
      [
        club_name,
        number_of_bays || 4,
        opening_time || '07:00',
        closing_time || '22:00',
        days_of_operation || 'Mon,Tue,Wed,Thu,Fri,Sat,Sun',
        booking_duration_options || '30,60,90,120',
        max_advance_booking_days || 30,
        min_booking_duration || 30,
        max_booking_duration || 240,
        enabled !== undefined ? enabled : true
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Error creating club booking settings:', err);
    if (err.code === '23505') { // Unique violation
      return res.status(409).json({ error: 'Settings for this club already exist' });
    }
    res.status(500).json({ error: 'Failed to create club booking settings' });
  }
});

// Update club booking settings
app.put('/api/club-booking-settings/:id', authenticateToken, requireAdminForBooking, async (req, res) => {
  const { id } = req.params;
  const {
    club_name,
    number_of_bays,
    opening_time,
    closing_time,
    days_of_operation,
    booking_duration_options,
    max_advance_booking_days,
    min_booking_duration,
    max_booking_duration,
    enabled
  } = req.body;

  try {
    const { rows } = await pool.query(
      `UPDATE club_booking_settings
       SET club_name = COALESCE($1, club_name),
           number_of_bays = COALESCE($2, number_of_bays),
           opening_time = COALESCE($3, opening_time),
           closing_time = COALESCE($4, closing_time),
           days_of_operation = COALESCE($5, days_of_operation),
           booking_duration_options = COALESCE($6, booking_duration_options),
           max_advance_booking_days = COALESCE($7, max_advance_booking_days),
           min_booking_duration = COALESCE($8, min_booking_duration),
           max_booking_duration = COALESCE($9, max_booking_duration),
           enabled = COALESCE($10, enabled),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $11
       RETURNING *`,
      [
        club_name,
        number_of_bays,
        opening_time,
        closing_time,
        days_of_operation,
        booking_duration_options,
        max_advance_booking_days,
        min_booking_duration,
        max_booking_duration,
        enabled,
        id
      ]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Club booking settings not found' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('Error updating club booking settings:', err);
    if (err.code === '23505') { // Unique violation
      return res.status(409).json({ error: 'Settings with this club name already exist' });
    }
    res.status(500).json({ error: 'Failed to update club booking settings' });
  }
});

// Delete club booking settings
app.delete('/api/club-booking-settings/:id', authenticateToken, requireAdminForBooking, async (req, res) => {
  const { id } = req.params;

  try {
    const { rows } = await pool.query('DELETE FROM club_booking_settings WHERE id = $1 RETURNING *', [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Club booking settings not found' });
    }

    res.json({ message: 'Club booking settings deleted successfully', deleted: rows[0] });
  } catch (err) {
    console.error('Error deleting club booking settings:', err);
    res.status(500).json({ error: 'Failed to delete club booking settings' });
  }
});

// ============================================
// LEAGUE MANAGEMENT API ENDPOINTS
// ============================================

// --------------------------------------------
// League CRUD Operations
// --------------------------------------------

// POST /api/leagues - Create a new league (Admin only)
app.post('/api/leagues', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      name,
      season,
      description,
      start_date,
      end_date,
      teams_per_division = 4,
      divisions_count = 2,
      weeks_per_season,
      playoff_format = 'top_per_division',
      points_for_win = 1.0,
      points_for_tie = 0.5,
      points_for_loss = 0.0,
      format = 'hybrid',
      individual_holes = 9,
      alternate_shot_holes = 9,
      active_players_per_week = 3,
      roster_size_min = 4,
      roster_size_max = 5
    } = req.body;

    // Validation
    if (!name || !start_date || !end_date) {
      return res.status(400).json({ error: 'name, start_date, and end_date are required' });
    }

    // Insert league
    const result = await pool.query(
      `INSERT INTO leagues (
        name, season, description, start_date, end_date,
        teams_per_division, divisions_count, weeks_per_season, playoff_format,
        points_for_win, points_for_tie, points_for_loss,
        format, individual_holes, alternate_shot_holes,
        active_players_per_week, roster_size_min, roster_size_max,
        created_by, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, 'draft')
      RETURNING *`,
      [
        name, season, description, start_date, end_date,
        teams_per_division, divisions_count, weeks_per_season, playoff_format,
        points_for_win, points_for_tie, points_for_loss,
        format, individual_holes, alternate_shot_holes,
        active_players_per_week, roster_size_min, roster_size_max,
        req.user.member_id
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating league:', err);
    res.status(500).json({ error: 'Failed to create league' });
  }
});

// GET /api/leagues - List all leagues
app.get('/api/leagues', async (req, res) => {
  try {
    const { status } = req.query;

    let query = `
      SELECT l.*,
        u.first_name || ' ' || u.last_name AS created_by_name,
        COUNT(DISTINCT tt.id) AS team_count,
        COUNT(DISTINCT ld.id) AS division_count
      FROM leagues l
      LEFT JOIN users u ON l.created_by = u.member_id
      LEFT JOIN tournament_teams tt ON l.id = tt.league_id
      LEFT JOIN league_divisions ld ON l.id = ld.id
    `;

    const params = [];
    if (status) {
      query += ` WHERE l.status = $1`;
      params.push(status);
    }

    query += ` GROUP BY l.id, u.first_name, u.last_name ORDER BY l.created_at DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching leagues:', err);
    res.status(500).json({ error: 'Failed to fetch leagues' });
  }
});

// GET /api/leagues/:id - Get specific league details
app.get('/api/leagues/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT l.*,
        u.first_name || ' ' || u.last_name AS created_by_name,
        COUNT(DISTINCT tt.id) AS team_count,
        COUNT(DISTINCT ld.id) AS division_count,
        COUNT(DISTINCT ls.id) AS weeks_scheduled
      FROM leagues l
      LEFT JOIN users u ON l.created_by = u.member_id
      LEFT JOIN tournament_teams tt ON l.id = tt.league_id
      LEFT JOIN league_divisions ld ON l.id = ld.league_id
      LEFT JOIN league_schedule ls ON l.id = ls.league_id
      WHERE l.id = $1
      GROUP BY l.id, u.first_name, u.last_name`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'League not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching league:', err);
    res.status(500).json({ error: 'Failed to fetch league' });
  }
});

// PUT /api/leagues/:id - Update league (Admin only)
app.put('/api/leagues/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      season,
      description,
      start_date,
      end_date,
      status,
      teams_per_division,
      divisions_count,
      weeks_per_season,
      playoff_format,
      points_for_win,
      points_for_tie,
      points_for_loss
    } = req.body;

    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (season !== undefined) {
      updates.push(`season = $${paramCount++}`);
      values.push(season);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }
    if (start_date !== undefined) {
      updates.push(`start_date = $${paramCount++}`);
      values.push(start_date);
    }
    if (end_date !== undefined) {
      updates.push(`end_date = $${paramCount++}`);
      values.push(end_date);
    }
    if (status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      values.push(status);
    }
    if (teams_per_division !== undefined) {
      updates.push(`teams_per_division = $${paramCount++}`);
      values.push(teams_per_division);
    }
    if (divisions_count !== undefined) {
      updates.push(`divisions_count = $${paramCount++}`);
      values.push(divisions_count);
    }
    if (weeks_per_season !== undefined) {
      updates.push(`weeks_per_season = $${paramCount++}`);
      values.push(weeks_per_season);
    }
    if (playoff_format !== undefined) {
      updates.push(`playoff_format = $${paramCount++}`);
      values.push(playoff_format);
    }
    if (points_for_win !== undefined) {
      updates.push(`points_for_win = $${paramCount++}`);
      values.push(points_for_win);
    }
    if (points_for_tie !== undefined) {
      updates.push(`points_for_tie = $${paramCount++}`);
      values.push(points_for_tie);
    }
    if (points_for_loss !== undefined) {
      updates.push(`points_for_loss = $${paramCount++}`);
      values.push(points_for_loss);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await pool.query(
      `UPDATE leagues SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'League not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating league:', err);
    res.status(500).json({ error: 'Failed to update league' });
  }
});

// DELETE /api/leagues/:id - Delete league (Admin only)
app.delete('/api/leagues/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM leagues WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'League not found' });
    }

    res.json({ message: 'League deleted successfully', league: result.rows[0] });
  } catch (err) {
    console.error('Error deleting league:', err);
    res.status(500).json({ error: 'Failed to delete league' });
  }
});

// --------------------------------------------
// Division Management
// --------------------------------------------

// POST /api/leagues/:id/divisions - Create division (Admin only)
app.post('/api/leagues/:leagueId/divisions', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { leagueId } = req.params;
    const { division_name, division_order = 1 } = req.body;

    if (!division_name) {
      return res.status(400).json({ error: 'division_name is required' });
    }

    // Check if league exists
    const leagueCheck = await pool.query('SELECT id FROM leagues WHERE id = $1', [leagueId]);
    if (leagueCheck.rows.length === 0) {
      return res.status(404).json({ error: 'League not found' });
    }

    // Insert division
    const result = await pool.query(
      `INSERT INTO league_divisions (league_id, division_name, division_order)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [leagueId, division_name, division_order]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') { // Unique constraint violation
      return res.status(409).json({ error: 'Division name already exists in this league' });
    }
    console.error('Error creating division:', err);
    res.status(500).json({ error: 'Failed to create division' });
  }
});

// GET /api/leagues/:id/divisions - List divisions
app.get('/api/leagues/:leagueId/divisions', async (req, res) => {
  try {
    const { leagueId } = req.params;

    const result = await pool.query(
      `SELECT ld.*,
        COUNT(DISTINCT tt.id) AS team_count
      FROM league_divisions ld
      LEFT JOIN tournament_teams tt ON ld.id = tt.division_id
      WHERE ld.league_id = $1
      GROUP BY ld.id
      ORDER BY ld.division_order, ld.division_name`,
      [leagueId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching divisions:', err);
    res.status(500).json({ error: 'Failed to fetch divisions' });
  }
});

// PUT /api/leagues/:leagueId/divisions/:divisionId - Update division (Admin only)
app.put('/api/leagues/:leagueId/divisions/:divisionId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { leagueId, divisionId } = req.params;
    const { division_name, division_order } = req.body;

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (division_name !== undefined) {
      updates.push(`division_name = $${paramCount++}`);
      values.push(division_name);
    }
    if (division_order !== undefined) {
      updates.push(`division_order = $${paramCount++}`);
      values.push(division_order);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(divisionId, leagueId);

    const result = await pool.query(
      `UPDATE league_divisions SET ${updates.join(', ')}
       WHERE id = $${paramCount} AND league_id = $${paramCount + 1}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Division not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating division:', err);
    res.status(500).json({ error: 'Failed to update division' });
  }
});

// DELETE /api/leagues/:leagueId/divisions/:divisionId - Delete division (Admin only)
app.delete('/api/leagues/:leagueId/divisions/:divisionId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { leagueId, divisionId } = req.params;

    // Check if division has teams
    const teamCheck = await pool.query(
      'SELECT COUNT(*) FROM tournament_teams WHERE division_id = $1',
      [divisionId]
    );

    if (parseInt(teamCheck.rows[0].count) > 0) {
      return res.status(400).json({
        error: 'Cannot delete division with teams. Please reassign or remove teams first.'
      });
    }

    const result = await pool.query(
      'DELETE FROM league_divisions WHERE id = $1 AND league_id = $2 RETURNING *',
      [divisionId, leagueId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Division not found' });
    }

    res.json({ message: 'Division deleted successfully', division: result.rows[0] });
  } catch (err) {
    console.error('Error deleting division:', err);
    res.status(500).json({ error: 'Failed to delete division' });
  }
});

// --------------------------------------------
// League Team Management (extends existing team endpoints)
// --------------------------------------------

// GET /api/leagues/:id/teams - Get all teams in a league
app.get('/api/leagues/:leagueId/teams', async (req, res) => {
  try {
    const { leagueId } = req.params;

    const result = await pool.query(
      `SELECT
        tt.*,
        ld.division_name,
        u.first_name || ' ' || u.last_name AS captain_name,
        u.email_address AS captain_email,
        ts.wins, ts.losses, ts.ties, ts.total_points,
        ts.aggregate_net_total, ts.playoff_qualified
      FROM tournament_teams tt
      LEFT JOIN league_divisions ld ON tt.division_id = ld.id
      LEFT JOIN users u ON tt.captain_id = u.member_id
      LEFT JOIN team_standings ts ON tt.id = ts.team_id AND ts.league_id = $1
      WHERE tt.league_id = $1
      ORDER BY ld.division_order, tt.league_points DESC, tt.aggregate_net_score ASC`,
      [leagueId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching league teams:', err);
    res.status(500).json({ error: 'Failed to fetch league teams' });
  }
});

// POST /api/leagues/:id/teams - Create team in league (Admin or Captain)
app.post('/api/leagues/:leagueId/teams', authenticateToken, async (req, res) => {
  try {
    const { leagueId } = req.params;
    const { name, captain_id, division_id, color = '#3B82F6' } = req.body;

    if (!name || !captain_id) {
      return res.status(400).json({ error: 'name and captain_id are required' });
    }

    // Check if league exists
    const leagueCheck = await pool.query('SELECT id FROM leagues WHERE id = $1', [leagueId]);
    if (leagueCheck.rows.length === 0) {
      return res.status(404).json({ error: 'League not found' });
    }

    // Check if division exists (if provided)
    if (division_id) {
      const divisionCheck = await pool.query(
        'SELECT id FROM league_divisions WHERE id = $1 AND league_id = $2',
        [division_id, leagueId]
      );
      if (divisionCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Division not found in this league' });
      }
    }

    // Note: We'll need to create a tournament entry for backward compatibility
    // For now, just create the team record
    const result = await pool.query(
      `INSERT INTO tournament_teams (name, captain_id, league_id, division_id, color, player_count, tournament_id)
       VALUES ($1, $2, $3, $4, $5, 1, 0)
       RETURNING *`,
      [name, captain_id, leagueId, division_id, color]
    );

    const team = result.rows[0];

    // Add captain as team member
    await pool.query(
      `INSERT INTO team_members (team_id, user_member_id, is_captain, tournament_id)
       VALUES ($1, $2, true, 0)`,
      [team.id, captain_id]
    );

    // Create initial team standings record
    await pool.query(
      `INSERT INTO team_standings (team_id, league_id, division_id, tournament_id)
       VALUES ($1, $2, $3, 0)`,
      [team.id, leagueId, division_id]
    );

    res.status(201).json(team);
  } catch (err) {
    console.error('Error creating team:', err);
    res.status(500).json({ error: 'Failed to create team' });
  }
});

// PUT /api/leagues/:leagueId/teams/:teamId - Update team
app.put('/api/leagues/:leagueId/teams/:teamId', authenticateToken, async (req, res) => {
  try {
    const { leagueId, teamId } = req.params;
    const { name, division_id, captain_id, color } = req.body;

    // Check if user is admin or team captain
    const team = await pool.query(
      'SELECT * FROM tournament_teams WHERE id = $1 AND league_id = $2',
      [teamId, leagueId]
    );

    if (team.rows.length === 0) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const isAdmin = req.user.role === 'Admin';
    const isCaptain = team.rows[0].captain_id === req.user.member_id;

    if (!isAdmin && !isCaptain) {
      return res.status(403).json({ error: 'Only team captain or admin can update team' });
    }

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (division_id !== undefined) {
      updates.push(`division_id = $${paramCount++}`);
      values.push(division_id);
    }
    if (captain_id !== undefined && isAdmin) { // Only admin can change captain
      updates.push(`captain_id = $${paramCount++}`);
      values.push(captain_id);
    }
    if (color !== undefined) {
      updates.push(`color = $${paramCount++}`);
      values.push(color);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(teamId, leagueId);

    const result = await pool.query(
      `UPDATE tournament_teams SET ${updates.join(', ')}
       WHERE id = $${paramCount} AND league_id = $${paramCount + 1}
       RETURNING *`,
      values
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating team:', err);
    res.status(500).json({ error: 'Failed to update team' });
  }
});

// --------------------------------------------
// Schedule Generation
// --------------------------------------------

// POST /api/leagues/:id/schedule/generate - Generate weekly schedule (Admin only)
app.post('/api/leagues/:leagueId/schedule/generate', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { leagueId } = req.params;
    const { weeks, start_date } = req.body;

    if (!weeks || !start_date) {
      return res.status(400).json({ error: 'weeks and start_date are required' });
    }

    // Get league details
    const league = await pool.query('SELECT * FROM leagues WHERE id = $1', [leagueId]);
    if (league.rows.length === 0) {
      return res.status(404).json({ error: 'League not found' });
    }

    // Clear existing schedule
    await pool.query('DELETE FROM league_schedule WHERE league_id = $1', [leagueId]);

    // Generate weekly schedule
    const scheduleEntries = [];
    let currentDate = new Date(start_date);

    for (let week = 1; week <= weeks; week++) {
      const weekStart = new Date(currentDate);
      const weekEnd = new Date(currentDate);
      weekEnd.setDate(weekEnd.getDate() + 6); // 7-day weeks

      const result = await pool.query(
        `INSERT INTO league_schedule (league_id, week_number, week_start_date, week_end_date, status)
         VALUES ($1, $2, $3, $4, 'scheduled')
         RETURNING *`,
        [leagueId, week, weekStart.toISOString().split('T')[0], weekEnd.toISOString().split('T')[0]]
      );

      scheduleEntries.push(result.rows[0]);

      // Move to next week
      currentDate.setDate(currentDate.getDate() + 7);
    }

    // Update league with weeks count
    await pool.query(
      'UPDATE leagues SET weeks_per_season = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [weeks, leagueId]
    );

    res.status(201).json({
      message: `Generated ${weeks} weeks of schedule`,
      schedule: scheduleEntries
    });
  } catch (err) {
    console.error('Error generating schedule:', err);
    res.status(500).json({ error: 'Failed to generate schedule' });
  }
});

// GET /api/leagues/:id/schedule - Get full league schedule
app.get('/api/leagues/:leagueId/schedule', async (req, res) => {
  try {
    const { leagueId } = req.params;

    const result = await pool.query(
      `SELECT ls.*,
        COUNT(DISTINCT lm.id) AS matchup_count
      FROM league_schedule ls
      LEFT JOIN league_matchups lm ON ls.id = lm.schedule_id
      WHERE ls.league_id = $1
      GROUP BY ls.id
      ORDER BY ls.week_number`,
      [leagueId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching schedule:', err);
    res.status(500).json({ error: 'Failed to fetch schedule' });
  }
});

// GET /api/leagues/:id/schedule/week/:weekNumber - Get specific week
app.get('/api/leagues/:leagueId/schedule/week/:weekNumber', async (req, res) => {
  try {
    const { leagueId, weekNumber } = req.params;

    const result = await pool.query(
      `SELECT * FROM league_schedule
       WHERE league_id = $1 AND week_number = $2`,
      [leagueId, weekNumber]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Week not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching week:', err);
    res.status(500).json({ error: 'Failed to fetch week' });
  }
});

// --------------------------------------------
// Matchup Generation & Management
// --------------------------------------------

// POST /api/leagues/:id/matchups/generate - Generate round-robin matchups (Admin only)
app.post('/api/leagues/:leagueId/matchups/generate', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { leagueId } = req.params;

    // Get league details
    const league = await pool.query('SELECT * FROM leagues WHERE id = $1', [leagueId]);
    if (league.rows.length === 0) {
      return res.status(404).json({ error: 'League not found' });
    }

    // Get all divisions
    const divisions = await pool.query(
      'SELECT * FROM league_divisions WHERE league_id = $1 ORDER BY division_order',
      [leagueId]
    );

    if (divisions.rows.length === 0) {
      return res.status(400).json({ error: 'No divisions found. Create divisions first.' });
    }

    // Get schedule
    const schedule = await pool.query(
      'SELECT * FROM league_schedule WHERE league_id = $1 ORDER BY week_number',
      [leagueId]
    );

    if (schedule.rows.length === 0) {
      return res.status(400).json({ error: 'No schedule found. Generate schedule first.' });
    }

    // Clear existing matchups
    await pool.query('DELETE FROM league_matchups WHERE league_id = $1', [leagueId]);

    let totalMatchups = 0;

    // Generate matchups for each division
    for (const division of divisions.rows) {
      // Get teams in this division
      const teams = await pool.query(
        'SELECT id FROM tournament_teams WHERE league_id = $1 AND division_id = $2 ORDER BY id',
        [leagueId, division.id]
      );

      if (teams.rows.length < 2) {
        console.log(`Skipping division ${division.division_name} - not enough teams`);
        continue;
      }

      const teamIds = teams.rows.map(t => t.id);
      const numTeams = teamIds.length;
      const numWeeks = schedule.rows.length;

      // Generate round-robin schedule
      const matchups = generateRoundRobinSchedule(teamIds, numWeeks);

      // Insert matchups into database
      for (let weekIndex = 0; weekIndex < matchups.length; weekIndex++) {
        const weekMatchups = matchups[weekIndex];
        const scheduleWeek = schedule.rows[weekIndex];

        for (const matchup of weekMatchups) {
          await pool.query(
            `INSERT INTO league_matchups
            (league_id, schedule_id, week_number, division_id, team1_id, team2_id, status)
            VALUES ($1, $2, $3, $4, $5, $6, 'scheduled')`,
            [leagueId, scheduleWeek.id, scheduleWeek.week_number, division.id, matchup.team1, matchup.team2]
          );
          totalMatchups++;
        }
      }
    }

    res.status(201).json({
      message: `Generated ${totalMatchups} matchups across ${divisions.rows.length} divisions`,
      matchupsCreated: totalMatchups
    });
  } catch (err) {
    console.error('Error generating matchups:', err);
    res.status(500).json({ error: 'Failed to generate matchups' });
  }
});

// Helper function: Generate round-robin schedule
function generateRoundRobinSchedule(teamIds, numWeeks) {
  const teams = [...teamIds];
  const n = teams.length;
  const schedule = [];

  // If odd number of teams, add a "bye" (null)
  if (n % 2 !== 0) {
    teams.push(null);
  }

  const totalTeams = teams.length;
  const roundsNeeded = totalTeams - 1;

  for (let week = 0; week < numWeeks; week++) {
    const weekMatches = [];
    const round = week % roundsNeeded;

    // Rotate teams (except first team stays fixed)
    const rotatedTeams = [teams[0]];
    for (let i = 1; i < totalTeams; i++) {
      rotatedTeams.push(teams[((i - round - 1 + roundsNeeded) % roundsNeeded) + 1]);
    }

    // Pair teams
    for (let i = 0; i < totalTeams / 2; i++) {
      const team1 = rotatedTeams[i];
      const team2 = rotatedTeams[totalTeams - 1 - i];

      // Skip if either team is a "bye"
      if (team1 !== null && team2 !== null) {
        weekMatches.push({ team1, team2 });
      }
    }

    schedule.push(weekMatches);
  }

  return schedule;
}

// GET /api/leagues/:id/matchups - Get all matchups
app.get('/api/leagues/:leagueId/matchups', async (req, res) => {
  try {
    const { leagueId } = req.params;
    const { week_number, division_id, status } = req.query;

    let query = `
      SELECT lm.*,
        ls.week_start_date, ls.week_end_date,
        ld.division_name,
        t1.name as team1_name, t1.captain_id as team1_captain_id,
        t2.name as team2_name, t2.captain_id as team2_captain_id,
        u1.first_name || ' ' || u1.last_name as team1_captain_name,
        u2.first_name || ' ' || u2.last_name as team2_captain_name,
        sc.name as course_name
      FROM league_matchups lm
      LEFT JOIN league_schedule ls ON lm.schedule_id = ls.id
      LEFT JOIN league_divisions ld ON lm.division_id = ld.id
      LEFT JOIN tournament_teams t1 ON lm.team1_id = t1.id
      LEFT JOIN tournament_teams t2 ON lm.team2_id = t2.id
      LEFT JOIN users u1 ON t1.captain_id = u1.member_id
      LEFT JOIN users u2 ON t2.captain_id = u2.member_id
      LEFT JOIN simulator_courses_combined sc ON lm.course_id = sc.id
      WHERE lm.league_id = $1
    `;

    const params = [leagueId];
    let paramCount = 2;

    if (week_number) {
      query += ` AND lm.week_number = $${paramCount++}`;
      params.push(week_number);
    }

    if (division_id) {
      query += ` AND lm.division_id = $${paramCount++}`;
      params.push(division_id);
    }

    if (status) {
      query += ` AND lm.status = $${paramCount++}`;
      params.push(status);
    }

    query += ` ORDER BY lm.week_number, ld.division_order, lm.id`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching matchups:', err);
    res.status(500).json({ error: 'Failed to fetch matchups' });
  }
});

// GET /api/leagues/:id/matchups/week/:weekNumber - Get matchups for a specific week
app.get('/api/leagues/:leagueId/matchups/week/:weekNumber', async (req, res) => {
  try {
    const { leagueId, weekNumber } = req.params;

    const result = await pool.query(
      `SELECT lm.*,
        ls.week_start_date, ls.week_end_date,
        ld.division_name,
        t1.name as team1_name, t1.captain_id as team1_captain_id,
        t2.name as team2_name, t2.captain_id as team2_captain_id,
        u1.first_name || ' ' || u1.last_name as team1_captain_name,
        u2.first_name || ' ' || u2.last_name as team2_captain_name
      FROM league_matchups lm
      LEFT JOIN league_schedule ls ON lm.schedule_id = ls.id
      LEFT JOIN league_divisions ld ON lm.division_id = ld.id
      LEFT JOIN tournament_teams t1 ON lm.team1_id = t1.id
      LEFT JOIN tournament_teams t2 ON lm.team2_id = t2.id
      LEFT JOIN users u1 ON t1.captain_id = u1.member_id
      LEFT JOIN users u2 ON t2.captain_id = u2.member_id
      WHERE lm.league_id = $1 AND lm.week_number = $2
      ORDER BY ld.division_order, lm.id`,
      [leagueId, weekNumber]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching week matchups:', err);
    res.status(500).json({ error: 'Failed to fetch week matchups' });
  }
});

// GET /api/matchups/:id - Get specific matchup details
app.get('/api/matchups/:matchupId', async (req, res) => {
  try {
    const { matchupId } = req.params;

    const result = await pool.query(
      `SELECT lm.*,
        ls.week_start_date, ls.week_end_date, ls.week_number,
        ld.division_name,
        t1.name as team1_name, t1.captain_id as team1_captain_id,
        t2.name as team2_name, t2.captain_id as team2_captain_id,
        u1.first_name || ' ' || u1.last_name as team1_captain_name,
        u2.first_name || ' ' || u2.last_name as team2_captain_name,
        sc.name as course_name, sc.par_values, sc.location
      FROM league_matchups lm
      LEFT JOIN league_schedule ls ON lm.schedule_id = ls.id
      LEFT JOIN league_divisions ld ON lm.division_id = ld.id
      LEFT JOIN tournament_teams t1 ON lm.team1_id = t1.id
      LEFT JOIN tournament_teams t2 ON lm.team2_id = t2.id
      LEFT JOIN users u1 ON t1.captain_id = u1.member_id
      LEFT JOIN users u2 ON t2.captain_id = u2.member_id
      LEFT JOIN simulator_courses_combined sc ON lm.course_id = sc.id
      WHERE lm.id = $1`,
      [matchupId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Matchup not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching matchup:', err);
    res.status(500).json({ error: 'Failed to fetch matchup' });
  }
});

// PUT /api/matchups/:id - Update matchup (Admin only)
app.put('/api/matchups/:matchupId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { matchupId } = req.params;
    const { course_id, course_name, course_rating, course_slope, course_par, hole_indexes, match_date, status } = req.body;

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (course_id !== undefined) {
      updates.push(`course_id = $${paramCount++}`);
      values.push(course_id);
    }
    if (course_name !== undefined) {
      updates.push(`course_name = $${paramCount++}`);
      values.push(course_name);
    }
    if (course_rating !== undefined) {
      updates.push(`course_rating = $${paramCount++}`);
      values.push(course_rating);
    }
    if (course_slope !== undefined) {
      updates.push(`course_slope = $${paramCount++}`);
      values.push(course_slope);
    }
    if (course_par !== undefined) {
      updates.push(`course_par = $${paramCount++}`);
      values.push(course_par);
    }
    if (hole_indexes !== undefined) {
      updates.push(`hole_indexes = $${paramCount++}`);
      values.push(JSON.stringify(hole_indexes));
    }
    if (match_date !== undefined) {
      updates.push(`match_date = $${paramCount++}`);
      values.push(match_date);
    }
    if (status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      values.push(status);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(matchupId);

    const result = await pool.query(
      `UPDATE league_matchups SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Matchup not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating matchup:', err);
    res.status(500).json({ error: 'Failed to update matchup' });
  }
});

// DELETE /api/matchups/:id - Delete matchup (Admin only)
app.delete('/api/matchups/:matchupId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { matchupId } = req.params;

    const result = await pool.query('DELETE FROM league_matchups WHERE id = $1 RETURNING *', [matchupId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Matchup not found' });
    }

    res.json({ message: 'Matchup deleted successfully', matchup: result.rows[0] });
  } catch (err) {
    console.error('Error deleting matchup:', err);
    res.status(500).json({ error: 'Failed to delete matchup' });
  }
});

// --------------------------------------------
// Availability Tracking
// --------------------------------------------

// POST /api/teams/:teamId/availability - Submit availability (Player)
app.post('/api/teams/:teamId/availability', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;
    const { league_id, week_number, is_available, availability_notes } = req.body;
    const userId = req.user.member_id;

    if (!league_id || !week_number) {
      return res.status(400).json({ error: 'league_id and week_number are required' });
    }

    // Check if user is a member of this team
    const memberCheck = await pool.query(
      'SELECT * FROM team_members WHERE team_id = $1 AND user_member_id = $2',
      [teamId, userId]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You are not a member of this team' });
    }

    // Upsert availability
    const result = await pool.query(
      `INSERT INTO team_member_availability
        (team_id, user_id, league_id, week_number, is_available, availability_notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (team_id, user_id, league_id, week_number)
       DO UPDATE SET
         is_available = EXCLUDED.is_available,
         availability_notes = EXCLUDED.availability_notes,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [teamId, userId, league_id, week_number, is_available !== false, availability_notes]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error submitting availability:', err);
    res.status(500).json({ error: 'Failed to submit availability' });
  }
});

// GET /api/teams/:teamId/availability/week/:weekNumber - Get team availability for a week
app.get('/api/teams/:teamId/availability/week/:weekNumber', authenticateToken, async (req, res) => {
  try {
    const { teamId, weekNumber } = req.params;
    const { league_id } = req.query;

    if (!league_id) {
      return res.status(400).json({ error: 'league_id query parameter is required' });
    }

    // Get all team members with their availability
    const result = await pool.query(
      `SELECT
        tm.user_member_id,
        u.first_name,
        u.last_name,
        u.email_address,
        u.handicap,
        tm.is_captain,
        tma.is_available,
        tma.availability_notes,
        tma.submitted_at,
        tma.updated_at
      FROM team_members tm
      JOIN users u ON tm.user_member_id = u.member_id
      LEFT JOIN team_member_availability tma ON
        tm.team_id = tma.team_id AND
        tm.user_member_id = tma.user_id AND
        tma.league_id = $2 AND
        tma.week_number = $3
      WHERE tm.team_id = $1
      ORDER BY tm.is_captain DESC, u.last_name, u.first_name`,
      [teamId, league_id, weekNumber]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching team availability:', err);
    res.status(500).json({ error: 'Failed to fetch team availability' });
  }
});

// GET /api/availability/:availabilityId - Get specific availability record
app.get('/api/availability/:availabilityId', authenticateToken, async (req, res) => {
  try {
    const { availabilityId } = req.params;

    const result = await pool.query('SELECT * FROM team_member_availability WHERE id = $1', [availabilityId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Availability record not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching availability:', err);
    res.status(500).json({ error: 'Failed to fetch availability' });
  }
});

// PUT /api/availability/:availabilityId - Update availability
app.put('/api/availability/:availabilityId', authenticateToken, async (req, res) => {
  try {
    const { availabilityId } = req.params;
    const { is_available, availability_notes } = req.body;

    // Check ownership
    const availability = await pool.query(
      'SELECT * FROM team_member_availability WHERE id = $1',
      [availabilityId]
    );

    if (availability.rows.length === 0) {
      return res.status(404).json({ error: 'Availability record not found' });
    }

    if (availability.rows[0].user_id !== req.user.member_id) {
      return res.status(403).json({ error: 'You can only update your own availability' });
    }

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (is_available !== undefined) {
      updates.push(`is_available = $${paramCount++}`);
      values.push(is_available);
    }
    if (availability_notes !== undefined) {
      updates.push(`availability_notes = $${paramCount++}`);
      values.push(availability_notes);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(availabilityId);

    const result = await pool.query(
      `UPDATE team_member_availability SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating availability:', err);
    res.status(500).json({ error: 'Failed to update availability' });
  }
});

// --------------------------------------------
// Lineup Management
// --------------------------------------------

// POST /api/matchups/:matchupId/lineup - Submit lineup for a matchup (Captain or Admin)
app.post('/api/matchups/:matchupId/lineup', authenticateToken, async (req, res) => {
  try {
    const { matchupId } = req.params;
    const {
      team_id,
      player1_id,
      player2_id,
      player3_id,
      player1_holes = [1, 2, 3],
      player2_holes = [4, 5, 6],
      player3_holes = [7, 8, 9]
    } = req.body;

    if (!team_id || !player1_id || !player2_id || !player3_id) {
      return res.status(400).json({ error: 'team_id and all three player IDs are required' });
    }

    // Get matchup details
    const matchup = await pool.query('SELECT * FROM league_matchups WHERE id = $1', [matchupId]);
    if (matchup.rows.length === 0) {
      return res.status(404).json({ error: 'Matchup not found' });
    }

    const matchupData = matchup.rows[0];

    // Verify user is captain of this team or admin
    const team = await pool.query('SELECT * FROM tournament_teams WHERE id = $1', [team_id]);
    if (team.rows.length === 0) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const isAdmin = req.user.role === 'Admin';
    const isCaptain = team.rows[0].captain_id === req.user.member_id;

    if (!isAdmin && !isCaptain) {
      return res.status(403).json({ error: 'Only team captain or admin can submit lineup' });
    }

    // Verify team is in this matchup
    if (team_id !== matchupData.team1_id && team_id !== matchupData.team2_id) {
      return res.status(400).json({ error: 'Team is not part of this matchup' });
    }

    // Verify all players are members of the team
    const playerIds = [player1_id, player2_id, player3_id];
    for (const playerId of playerIds) {
      const memberCheck = await pool.query(
        'SELECT * FROM team_members WHERE team_id = $1 AND user_member_id = $2',
        [team_id, playerId]
      );
      if (memberCheck.rows.length === 0) {
        return res.status(400).json({ error: `Player ${playerId} is not a member of this team` });
      }
    }

    // Get player handicaps
    const players = await pool.query(
      'SELECT member_id, handicap FROM users WHERE member_id = ANY($1)',
      [playerIds]
    );

    const playerMap = {};
    players.rows.forEach(p => {
      playerMap[p.member_id] = p.handicap || 0;
    });

    const player1_handicap = playerMap[player1_id];
    const player2_handicap = playerMap[player2_id];
    const player3_handicap = playerMap[player3_id];
    const team_handicap = ((player1_handicap + player2_handicap + player3_handicap) / 3).toFixed(2);

    // Calculate team course handicap if course info available
    let team_course_handicap = null;
    if (matchupData.course_slope && matchupData.course_rating) {
      team_course_handicap = Math.round((team_handicap * matchupData.course_slope) / 113);
    }

    // Upsert lineup
    const result = await pool.query(
      `INSERT INTO weekly_lineups
        (matchup_id, team_id, league_id, week_number,
         player1_id, player2_id, player3_id,
         player1_holes, player2_holes, player3_holes,
         player1_handicap, player2_handicap, player3_handicap,
         team_handicap, team_course_handicap,
         submitted_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       ON CONFLICT (team_id, league_id, week_number)
       DO UPDATE SET
         matchup_id = EXCLUDED.matchup_id,
         player1_id = EXCLUDED.player1_id,
         player2_id = EXCLUDED.player2_id,
         player3_id = EXCLUDED.player3_id,
         player1_holes = EXCLUDED.player1_holes,
         player2_holes = EXCLUDED.player2_holes,
         player3_holes = EXCLUDED.player3_holes,
         player1_handicap = EXCLUDED.player1_handicap,
         player2_handicap = EXCLUDED.player2_handicap,
         player3_handicap = EXCLUDED.player3_handicap,
         team_handicap = EXCLUDED.team_handicap,
         team_course_handicap = EXCLUDED.team_course_handicap,
         submitted_by = EXCLUDED.submitted_by,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        matchupId, team_id, matchupData.league_id, matchupData.week_number,
        player1_id, player2_id, player3_id,
        player1_holes, player2_holes, player3_holes,
        player1_handicap, player2_handicap, player3_handicap,
        team_handicap, team_course_handicap,
        req.user.member_id
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error submitting lineup:', err);
    res.status(500).json({ error: 'Failed to submit lineup' });
  }
});

// GET /api/matchups/:matchupId/lineups - Get lineups for a matchup
app.get('/api/matchups/:matchupId/lineups', async (req, res) => {
  try {
    const { matchupId } = req.params;

    const result = await pool.query(
      `SELECT wl.*,
        tt.name as team_name,
        u1.first_name || ' ' || u1.last_name as player1_name,
        u2.first_name || ' ' || u2.last_name as player2_name,
        u3.first_name || ' ' || u3.last_name as player3_name,
        sub.first_name || ' ' || sub.last_name as submitted_by_name
      FROM weekly_lineups wl
      LEFT JOIN tournament_teams tt ON wl.team_id = tt.id
      LEFT JOIN users u1 ON wl.player1_id = u1.member_id
      LEFT JOIN users u2 ON wl.player2_id = u2.member_id
      LEFT JOIN users u3 ON wl.player3_id = u3.member_id
      LEFT JOIN users sub ON wl.submitted_by = sub.member_id
      WHERE wl.matchup_id = $1`,
      [matchupId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching lineups:', err);
    res.status(500).json({ error: 'Failed to fetch lineups' });
  }
});

// GET /api/teams/:teamId/lineups - Get all lineups for a team
app.get('/api/teams/:teamId/lineups', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;
    const { league_id } = req.query;

    let query = `
      SELECT wl.*,
        lm.week_number, lm.status as matchup_status,
        t1.name as opponent_name
      FROM weekly_lineups wl
      LEFT JOIN league_matchups lm ON wl.matchup_id = lm.id
      LEFT JOIN tournament_teams t1 ON
        CASE
          WHEN lm.team1_id = wl.team_id THEN lm.team2_id
          ELSE lm.team1_id
        END = t1.id
      WHERE wl.team_id = $1
    `;

    const params = [teamId];

    if (league_id) {
      query += ` AND wl.league_id = $2`;
      params.push(league_id);
    }

    query += ` ORDER BY wl.week_number DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching team lineups:', err);
    res.status(500).json({ error: 'Failed to fetch team lineups' });
  }
});

// POST /api/lineups/:lineupId/lock - Lock lineup (Captain or Admin)
app.post('/api/lineups/:lineupId/lock', authenticateToken, async (req, res) => {
  try {
    const { lineupId } = req.params;

    // Get lineup details
    const lineup = await pool.query('SELECT * FROM weekly_lineups WHERE id = $1', [lineupId]);
    if (lineup.rows.length === 0) {
      return res.status(404).json({ error: 'Lineup not found' });
    }

    const lineupData = lineup.rows[0];

    // Check if user is captain or admin
    const team = await pool.query('SELECT captain_id FROM tournament_teams WHERE id = $1', [lineupData.team_id]);
    const isAdmin = req.user.role === 'Admin';
    const isCaptain = team.rows[0].captain_id === req.user.member_id;

    if (!isAdmin && !isCaptain) {
      return res.status(403).json({ error: 'Only team captain or admin can lock lineup' });
    }

    // Lock the lineup
    const result = await pool.query(
      `UPDATE weekly_lineups
       SET locked = true, locked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [lineupId]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error locking lineup:', err);
    res.status(500).json({ error: 'Failed to lock lineup' });
  }
});

// PUT /api/lineups/:lineupId - Update lineup (Captain or Admin, only if not locked)
app.put('/api/lineups/:lineupId', authenticateToken, async (req, res) => {
  try {
    const { lineupId } = req.params;
    const {
      player1_id,
      player2_id,
      player3_id,
      player1_holes,
      player2_holes,
      player3_holes
    } = req.body;

    // Get lineup details
    const lineup = await pool.query('SELECT * FROM weekly_lineups WHERE id = $1', [lineupId]);
    if (lineup.rows.length === 0) {
      return res.status(404).json({ error: 'Lineup not found' });
    }

    const lineupData = lineup.rows[0];

    // Check if locked
    if (lineupData.locked) {
      return res.status(400).json({ error: 'Cannot update locked lineup' });
    }

    // Check if user is captain or admin
    const team = await pool.query('SELECT captain_id FROM tournament_teams WHERE id = $1', [lineupData.team_id]);
    const isAdmin = req.user.role === 'Admin';
    const isCaptain = team.rows[0].captain_id === req.user.member_id;

    if (!isAdmin && !isCaptain) {
      return res.status(403).json({ error: 'Only team captain or admin can update lineup' });
    }

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (player1_id !== undefined) {
      updates.push(`player1_id = $${paramCount++}`);
      values.push(player1_id);
    }
    if (player2_id !== undefined) {
      updates.push(`player2_id = $${paramCount++}`);
      values.push(player2_id);
    }
    if (player3_id !== undefined) {
      updates.push(`player3_id = $${paramCount++}`);
      values.push(player3_id);
    }
    if (player1_holes !== undefined) {
      updates.push(`player1_holes = $${paramCount++}`);
      values.push(player1_holes);
    }
    if (player2_holes !== undefined) {
      updates.push(`player2_holes = $${paramCount++}`);
      values.push(player2_holes);
    }
    if (player3_holes !== undefined) {
      updates.push(`player3_holes = $${paramCount++}`);
      values.push(player3_holes);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(lineupId);

    const result = await pool.query(
      `UPDATE weekly_lineups SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating lineup:', err);
    res.status(500).json({ error: 'Failed to update lineup' });
  }
});

// --------------------------------------------
// Captain Dashboard Helpers
// --------------------------------------------

// GET /api/captain/team/:teamId/dashboard - Captain dashboard overview
app.get('/api/captain/team/:teamId/dashboard', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;
    const { league_id } = req.query;

    // Verify user is captain
    const team = await pool.query('SELECT * FROM tournament_teams WHERE id = $1', [teamId]);
    if (team.rows.length === 0) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const isAdmin = req.user.role === 'Admin';
    const isCaptain = team.rows[0].captain_id === req.user.member_id;

    if (!isAdmin && !isCaptain) {
      return res.status(403).json({ error: 'Only team captain or admin can view dashboard' });
    }

    // Get team roster
    const roster = await pool.query(
      `SELECT tm.*, u.first_name, u.last_name, u.email_address, u.handicap
       FROM team_members tm
       JOIN users u ON tm.user_member_id = u.member_id
       WHERE tm.team_id = $1
       ORDER BY tm.is_captain DESC, u.last_name`,
      [teamId]
    );

    // Get upcoming matches
    const upcomingMatches = await pool.query(
      `SELECT lm.*, ls.week_start_date, ls.week_end_date,
        CASE
          WHEN lm.team1_id = $1 THEN t2.name
          ELSE t1.name
        END as opponent_name
       FROM league_matchups lm
       JOIN league_schedule ls ON lm.schedule_id = ls.id
       LEFT JOIN tournament_teams t1 ON lm.team1_id = t1.id
       LEFT JOIN tournament_teams t2 ON lm.team2_id = t2.id
       WHERE (lm.team1_id = $1 OR lm.team2_id = $1)
         AND lm.league_id = $2
         AND lm.status IN ('scheduled', 'lineup_submitted')
       ORDER BY lm.week_number
       LIMIT 5`,
      [teamId, league_id]
    );

    // Get team standings
    const standings = await pool.query(
      `SELECT * FROM team_standings
       WHERE team_id = $1 AND league_id = $2`,
      [teamId, league_id]
    );

    res.json({
      team: team.rows[0],
      roster: roster.rows,
      upcomingMatches: upcomingMatches.rows,
      standings: standings.rows[0] || null
    });
  } catch (err) {
    console.error('Error fetching captain dashboard:', err);
    res.status(500).json({ error: 'Failed to fetch captain dashboard' });
  }
});

// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
