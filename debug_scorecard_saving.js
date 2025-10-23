// Debug script to test scorecard photo saving
// Run this after submitting a score with a photo to see what's happening

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function debugScorecardSaving() {
  try {
    console.log('🔍 Checking recent championship match updates...\n');
    
    // Check the most recent updates to championship matches
    const result = await pool.query(`
      SELECT 
        id,
        player1_id,
        player2_id,
        player1_scorecard_photo_url,
        player2_scorecard_photo_url,
        match_status,
        updated_at,
        player1_hole_scores,
        player2_hole_scores
      FROM club_championship_matches 
      WHERE updated_at > NOW() - INTERVAL '1 hour'
      ORDER BY updated_at DESC
      LIMIT 5
    `);
    
    console.log('Recent championship match updates:');
    result.rows.forEach((match, index) => {
      console.log(`\nMatch ${index + 1} (ID: ${match.id}):`);
      console.log(`  Updated: ${match.updated_at}`);
      console.log(`  Status: ${match.match_status}`);
      console.log(`  Player1 Photo: ${match.player1_scorecard_photo_url || 'NULL'}`);
      console.log(`  Player2 Photo: ${match.player2_scorecard_photo_url || 'NULL'}`);
      console.log(`  Has Hole Scores: ${!!match.player1_hole_scores || !!match.player2_hole_scores}`);
    });
    
    // Check if any matches have scorecard photos
    const photoResult = await pool.query(`
      SELECT 
        id,
        player1_scorecard_photo_url,
        player2_scorecard_photo_url,
        match_status
      FROM club_championship_matches 
      WHERE player1_scorecard_photo_url IS NOT NULL 
         OR player2_scorecard_photo_url IS NOT NULL
      ORDER BY updated_at DESC
    `);
    
    console.log(`\n📸 Matches with scorecard photos: ${photoResult.rows.length}`);
    photoResult.rows.forEach((match, index) => {
      console.log(`\nPhoto Match ${index + 1} (ID: ${match.id}):`);
      console.log(`  Player1 Photo: ${match.player1_scorecard_photo_url}`);
      console.log(`  Player2 Photo: ${match.player2_scorecard_photo_url}`);
      console.log(`  Status: ${match.match_status}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

debugScorecardSaving();
