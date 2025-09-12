const { Pool } = require('pg');
const fs = require('fs');

// Load environment variables
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkAndAddColumns() {
  try {
    console.log('Checking if scorecard photo columns exist...');
    
    // First, check if the columns already exist
    const checkResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'club_championship_matches' 
      AND column_name LIKE '%scorecard_photo%'
    `);
    
    console.log('Existing scorecard photo columns:', checkResult.rows);
    
    if (checkResult.rows.length === 0) {
      console.log('No scorecard photo columns found. Adding them...');
      
      // Run the migration
      const sql = fs.readFileSync('add_scorecard_photo_columns.sql', 'utf8');
      await pool.query(sql);
      console.log('✅ Migration completed successfully');
      
      // Verify the columns were added
      const verifyResult = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'club_championship_matches' 
        AND column_name LIKE '%scorecard_photo%'
      `);
      console.log('✅ Verified scorecard photo columns:', verifyResult.rows);
    } else {
      console.log('✅ Scorecard photo columns already exist');
    }
    
    // Check a sample match to see if it has scorecard photo data
    const sampleResult = await pool.query(`
      SELECT 
        id, 
        player1_scorecard_photo_url, 
        player2_scorecard_photo_url,
        match_status
      FROM club_championship_matches 
      LIMIT 3
    `);
    
    console.log('Sample match data:');
    sampleResult.rows.forEach((row, index) => {
      console.log(`Match ${index + 1}:`, {
        id: row.id,
        player1_photo: row.player1_scorecard_photo_url,
        player2_photo: row.player2_scorecard_photo_url,
        status: row.match_status
      });
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkAndAddColumns();
