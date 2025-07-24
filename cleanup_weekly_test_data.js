const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function cleanupWeeklyTestData() {
  const client = await pool.connect();
  
  try {
    console.log('Starting cleanup of weekly test data for tournament 19...');
    
    // Delete old weekly leaderboard entries
    const leaderboardResult = await client.query(
      'DELETE FROM weekly_leaderboards WHERE tournament_id = 19 AND week_start_date = $1',
      ['2025-07-21']
    );
    console.log(`Deleted ${leaderboardResult.rowCount} weekly leaderboard entries`);
    
    // Delete old weekly matches
    const matchesResult = await client.query(
      'DELETE FROM weekly_matches WHERE tournament_id = 19 AND week_start_date = $1',
      ['2025-07-21']
    );
    console.log(`Deleted ${matchesResult.rowCount} weekly matches`);
    
    // Delete old weekly scorecards
    const scorecardsResult = await client.query(
      'DELETE FROM weekly_scorecards WHERE tournament_id = 19 AND week_start_date = $1',
      ['2025-07-21']
    );
    console.log(`Deleted ${scorecardsResult.rowCount} weekly scorecards`);
    
    console.log('Cleanup completed successfully!');
    
  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

cleanupWeeklyTestData(); 