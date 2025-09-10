const { Pool } = require('pg');

// PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkAndCreateTables() {
  try {
    console.log('Checking if club_championship_matches table exists...');
    
    // Check if table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'club_championship_matches'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('club_championship_matches table does not exist. Creating it...');
      
      // Create the table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS club_championship_matches (
            id SERIAL PRIMARY KEY,
            tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
            club_group VARCHAR(100) NOT NULL,
            player1_id INTEGER NOT NULL REFERENCES users(member_id) ON DELETE CASCADE,
            player2_id INTEGER NOT NULL REFERENCES users(member_id) ON DELETE CASCADE,
            match_number INTEGER NOT NULL, -- 1, 2, or 3
            player1_holes_won INTEGER DEFAULT 0,
            player2_holes_won INTEGER DEFAULT 0,
            player1_holes_lost INTEGER DEFAULT 0,
            player2_holes_lost INTEGER DEFAULT 0,
            player1_net_holes INTEGER DEFAULT 0, -- holes_won - holes_lost
            player2_net_holes INTEGER DEFAULT 0, -- holes_won - holes_lost
            winner_id INTEGER REFERENCES users(member_id) ON DELETE CASCADE,
            match_status VARCHAR(50) DEFAULT 'pending', -- pending, completed, in_progress
            match_date DATE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(tournament_id, club_group, player1_id, player2_id, match_number)
        );
      `);
      
      console.log('✅ Created club_championship_matches table');
    } else {
      console.log('✅ club_championship_matches table already exists');
    }
    
    // Check if club_groups table has participant_count column
    console.log('Checking if club_groups has participant_count column...');
    const columnCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'club_groups'
        AND column_name = 'participant_count'
      );
    `);
    
    if (!columnCheck.rows[0].exists) {
      console.log('participant_count column does not exist. Adding it...');
      
      await pool.query(`
        ALTER TABLE club_groups 
        ADD COLUMN IF NOT EXISTS participant_count INTEGER DEFAULT 0;
      `);
      
      console.log('✅ Added participant_count column to club_groups');
    } else {
      console.log('✅ participant_count column already exists');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkAndCreateTables();

