require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  try {
    console.log('Running migration to add team_size and hole_count columns to tournaments table...');
    
    // Read the SQL migration file
    const sql = fs.readFileSync('add_team_size_to_tournaments.sql', 'utf8');
    // Split by semicolon, filter out empty statements
    const statements = sql.split(';').map(s => s.trim()).filter(Boolean);
    
    for (const statement of statements) {
      if (statement) {
        await pool.query(statement);
      }
    }
    
    console.log('Migration completed successfully!');
    
    // Verify the columns were added
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'tournaments' AND column_name IN (
        'team_size', 'hole_count', 'tee', 'pins', 'putting_gimme', 
        'elevation', 'stimp', 'mulligan', 'game_play', 'firmness', 
        'wind', 'handicap_enabled'
      )
    `);
    
    if (result.rows.length === 12) {
      console.log('✅ All simulator settings columns successfully added to tournaments table');
    } else {
      console.log('❌ Some columns not found in tournaments table');
      console.log('Found columns:', result.rows.map(r => r.column_name));
      console.log('Expected 12 columns, found', result.rows.length);
    }
    
  } catch (error) {
    console.error('Error running migration:', error);
  } finally {
    await pool.end();
  }
}

// Run the migration
runMigration().catch(console.error); 