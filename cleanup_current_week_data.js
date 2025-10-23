const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function cleanupCurrentWeekData() {
  const client = await pool.connect();
  
  try {
    console.log('Starting cleanup of corrupted weekly data for tournament 19, week 2025-08-04...');
    
    // Delete corrupted weekly matches for the current week
    const matchesResult = await client.query(
      'DELETE FROM weekly_matches WHERE tournament_id = 19 AND week_start_date = $1',
      ['2025-08-04']
    );
    console.log(`Deleted ${matchesResult.rowCount} corrupted weekly matches`);
    
    // Delete weekly leaderboard entries for the current week (will be recalculated)
    const leaderboardResult = await client.query(
      'DELETE FROM weekly_leaderboards WHERE tournament_id = 19 AND week_start_date = $1',
      ['2025-08-04']
    );
    console.log(`Deleted ${leaderboardResult.rowCount} weekly leaderboard entries`);
    
    console.log('Cleanup completed successfully!');
    console.log('The weekly matches and leaderboard will be recalculated automatically on the next API call.');
    
  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

cleanupCurrentWeekData(); 