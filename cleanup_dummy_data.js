const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function cleanupDummyData() {
  try {
    console.log('Cleaning up dummy data...');
    
    // Delete dummy weekly scorecards
    const result = await pool.query(`
      DELETE FROM weekly_scorecards 
      WHERE tournament_id = 19 
      AND user_id IN (32309007, 20684701)
      AND week_start_date = '2025-07-22'
    `);
    
    console.log(`Deleted ${result.rowCount} dummy scorecards`);
    
    // Delete dummy weekly leaderboard entries
    const leaderboardResult = await pool.query(`
      DELETE FROM weekly_leaderboards 
      WHERE tournament_id = 19 
      AND user_id IN (32309007, 20684701)
      AND week_start_date = '2025-07-22'
    `);
    
    console.log(`Deleted ${leaderboardResult.rowCount} dummy leaderboard entries`);
    
    // Delete dummy weekly matches
    const matchesResult = await pool.query(`
      DELETE FROM weekly_matches 
      WHERE tournament_id = 19 
      AND week_start_date = '2025-07-22'
    `);
    
    console.log(`Deleted ${matchesResult.rowCount} dummy matches`);
    
    console.log('Cleanup complete!');
    
  } catch (error) {
    console.error('Error cleaning up dummy data:', error);
  } finally {
    await pool.end();
  }
}

cleanupDummyData(); 