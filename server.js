// server.js
require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3001;

// PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false
});

// CORS configuration for production
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://trackmansucks.com', 'https://www.trackmansucks.com']
    : ['http://localhost:8000', 'http://localhost:3000'],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

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
        email VARCHAR(255) UNIQUE,
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
    // For now, return empty array until leaderboard logic is implemented
    res.json([]);
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

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 