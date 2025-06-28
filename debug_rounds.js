const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function debugRounds() {
  try {
    // Check Tommy Testa specifically
    console.log('=== Tommy Testa Round Analysis ===');
    
    // Get all scorecards for Tommy Testa
    const { rows: tommyScorecards } = await pool.query(`
      SELECT id, user_id, player_name, date_played, round_type, differential, csv_timestamp
      FROM scorecards 
      WHERE player_name LIKE '%Tommy Testa%' OR user_id IN (
        SELECT member_id FROM users WHERE first_name = 'Tommy' AND last_name = 'Testa'
      )
      ORDER BY date_played DESC
    `);
    
    console.log(`Total scorecards found for Tommy Testa: ${tommyScorecards.length}`);
    console.log('Scorecards:');
    tommyScorecards.forEach((card, index) => {
      console.log(`${index + 1}. ID: ${card.id}, Date: ${card.date_played}, Type: ${card.round_type}, Differential: ${card.differential}`);
    });
    
    // Count how many are NULL or NaN
    const { rows: nullDiffs } = await pool.query(`
      SELECT COUNT(*) as null_count
      FROM scorecards
      WHERE (player_name ILIKE '%Tommy Testa%' OR user_id IN (
        SELECT member_id FROM users WHERE first_name = 'Tommy' AND last_name = 'Testa'
      ))
      AND (differential IS NULL OR differential::text = 'NaN')
    `);
    console.log(`\nTommy Testa scorecards with NULL or NaN differential: ${nullDiffs[0].null_count}`);
    
    // Check for duplicate users
    console.log('\n=== Duplicate User Check ===');
    const { rows: duplicateUsers } = await pool.query(`
      SELECT first_name, last_name, COUNT(*) as count, array_agg(member_id) as member_ids
      FROM users 
      GROUP BY first_name, last_name 
      HAVING COUNT(*) > 1
      ORDER BY count DESC
    `);
    
    console.log('Duplicate users found:');
    duplicateUsers.forEach(user => {
      console.log(`${user.first_name} ${user.last_name}: ${user.count} accounts (IDs: ${user.member_ids.join(', ')})`);
    });
    
    // Check total scorecards by user
    console.log('\n=== Scorecard Count by User ===');
    const { rows: userScorecardCounts } = await pool.query(`
      SELECT u.first_name, u.last_name, u.member_id,
             COUNT(s.id) as total_scorecards,
             COUNT(CASE WHEN s.round_type = 'sim' OR s.round_type IS NULL THEN 1 END) as sim_rounds,
             COUNT(CASE WHEN s.round_type = 'grass' THEN 1 END) as grass_rounds
      FROM users u
      LEFT JOIN scorecards s ON u.member_id = s.user_id
      GROUP BY u.member_id, u.first_name, u.last_name
      HAVING COUNT(s.id) > 0
      ORDER BY total_scorecards DESC
      LIMIT 20
    `);
    
    console.log('Top 20 users by scorecard count:');
    userScorecardCounts.forEach(user => {
      console.log(`${user.first_name} ${user.last_name}: ${user.total_scorecards} total (${user.sim_rounds} sim, ${user.grass_rounds} grass)`);
    });
    
  } catch (error) {
    console.error('Error debugging rounds:', error);
  } finally {
    await pool.end();
  }
}

debugRounds(); 