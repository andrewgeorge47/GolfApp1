const { Pool } = require('pg');
require('dotenv').config();

// Database configuration - use the same approach as server.js
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function calculateAndUpdateHandicaps() {
  try {
    // Get all users who have scorecards
    const { rows: users } = await pool.query(`
      SELECT DISTINCT u.member_id, u.first_name, u.last_name
      FROM users u
      INNER JOIN scorecards s ON u.member_id = s.user_id
      WHERE s.differential IS NOT NULL
      ORDER BY u.member_id
    `);

    console.log(`Calculating handicaps for ${users.length} users...`);

    for (const user of users) {
      // Calculate sim handicap
      const { rows: simScorecards } = await pool.query(`
        SELECT differential, date_played
        FROM scorecards
        WHERE user_id = $1 
          AND differential IS NOT NULL 
          AND (round_type = 'sim' OR round_type IS NULL)
        ORDER BY date_played DESC
        LIMIT 20
      `, [user.member_id]);

      // Calculate grass handicap
      const { rows: grassScorecards } = await pool.query(`
        SELECT differential, date_played
        FROM scorecards
        WHERE user_id = $1 
          AND differential IS NOT NULL 
          AND round_type = 'grass'
        ORDER BY date_played DESC
        LIMIT 20
      `, [user.member_id]);

      // Calculate sim handicap
      let simHandicap = 0;
      if (simScorecards.length > 0) {
        const simDifferentials = simScorecards
          .map(s => parseFloat(s.differential))
          .filter(diff => !isNaN(diff) && isFinite(diff))
          .sort((a, b) => a - b);

        if (simDifferentials.length > 0) {
          simHandicap = calculateHandicapFromDifferentials(simDifferentials);
        }
      }

      // Calculate grass handicap
      let grassHandicap = 0;
      if (grassScorecards.length > 0) {
        const grassDifferentials = grassScorecards
          .map(s => parseFloat(s.differential))
          .filter(diff => !isNaN(diff) && isFinite(diff))
          .sort((a, b) => a - b);

        if (grassDifferentials.length > 0) {
          grassHandicap = calculateHandicapFromDifferentials(grassDifferentials);
        }
      }

      // Update the user's handicaps
      await pool.query(
        'UPDATE users SET sim_handicap = $1, grass_handicap = $2 WHERE member_id = $3',
        [simHandicap, grassHandicap, user.member_id]
      );

      console.log(`${user.first_name} ${user.last_name}: Sim: ${simHandicap} (${simScorecards.length} rounds), Grass: ${grassHandicap} (${grassScorecards.length} rounds)`);
    }

    console.log('Handicap calculation complete!');
    
    // Show summary
    const { rows: handicapSummary } = await pool.query(`
      SELECT u.first_name, u.last_name, u.sim_handicap, u.grass_handicap,
             COUNT(s.id) as total_rounds,
             COUNT(CASE WHEN s.round_type = 'sim' OR s.round_type IS NULL THEN 1 END) as sim_rounds,
             COUNT(CASE WHEN s.round_type = 'grass' THEN 1 END) as grass_rounds
      FROM users u
      LEFT JOIN scorecards s ON u.member_id = s.user_id
      GROUP BY u.member_id, u.first_name, u.last_name, u.sim_handicap, u.grass_handicap
      ORDER BY u.first_name, u.last_name
    `);

    console.log('\n=== Handicap Summary ===');
    console.log('Player Name\t\tSim Hcp\tGrass Hcp\tSim Rounds\tGrass Rounds');
    console.log('-----------\t\t-------\t---------\t-----------\t------------');
    handicapSummary.forEach(player => {
      const simHcp = player.sim_handicap && !isNaN(player.sim_handicap) ? parseFloat(player.sim_handicap).toFixed(1) : 'N/A';
      const grassHcp = player.grass_handicap && !isNaN(player.grass_handicap) ? parseFloat(player.grass_handicap).toFixed(1) : 'N/A';
      console.log(`${player.first_name} ${player.last_name}\t\t${simHcp}\t${grassHcp}\t\t${player.sim_rounds}\t\t${player.grass_rounds}`);
    });

  } catch (error) {
    console.error('Error calculating handicaps:', error);
  } finally {
    await pool.end();
  }
}

// Helper function to calculate handicap from differentials
function calculateHandicapFromDifferentials(differentials) {
  if (differentials.length >= 20) {
    // Use best 8 out of last 20
    const best8 = differentials.slice(0, 8);
    const average = best8.reduce((sum, diff) => sum + diff, 0) / 8;
    return Math.round(average * 0.96 * 10) / 10;
  } else if (differentials.length >= 15) {
    // Use best 7 out of last 15
    const best7 = differentials.slice(0, 7);
    const average = best7.reduce((sum, diff) => sum + diff, 0) / 7;
    return Math.round(average * 0.96 * 10) / 10;
  } else if (differentials.length >= 10) {
    // Use best 6 out of last 10
    const best6 = differentials.slice(0, 6);
    const average = best6.reduce((sum, diff) => sum + diff, 0) / 6;
    return Math.round(average * 0.96 * 10) / 10;
  } else if (differentials.length >= 5) {
    // Use best 5 out of last 5
    const best5 = differentials.slice(0, 5);
    const average = best5.reduce((sum, diff) => sum + diff, 0) / 5;
    return Math.round(average * 0.96 * 10) / 10;
  } else if (differentials.length >= 3) {
    // Use best 3 out of last 3
    const best3 = differentials.slice(0, 3);
    const average = best3.reduce((sum, diff) => sum + diff, 0) / 3;
    return Math.round(average * 0.96 * 10) / 10;
  } else if (differentials.length >= 1) {
    // Use best 1 out of last 1
    const best1 = differentials[0];
    return Math.round(best1 * 0.96 * 10) / 10;
  } else {
    // No differentials available
    return 0;
  }
}

calculateAndUpdateHandicaps(); 