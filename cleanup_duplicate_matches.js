const { Pool } = require('pg');

// Database connection configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost/golf_league',
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

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

async function main() {
  const tournamentId = process.argv[2];
  
  if (!tournamentId) {
    console.error('Usage: node cleanup_duplicate_matches.js <tournament_id>');
    console.error('Example: node cleanup_duplicate_matches.js 19');
    process.exit(1);
  }
  
  try {
    await cleanupDuplicateMatches(tournamentId);
    console.log('Cleanup completed successfully');
  } catch (err) {
    console.error('Cleanup failed:', err);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main();
}

module.exports = { cleanupDuplicateMatches }; 