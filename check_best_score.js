// Check best score ever data
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkBestScoreData() {
  try {
    console.log('Checking best score ever data...\n');

    // Check total scorecards
    const { rows: totalScorecards } = await pool.query(`
      SELECT COUNT(*) as total_scorecards 
      FROM scorecards 
      WHERE (round_type = 'sim' OR round_type IS NULL)
    `);
    console.log(`Total simulator scorecards: ${totalScorecards[0].total_scorecards}`);

    // Check scorecards with valid total_strokes
    const { rows: validScorecards } = await pool.query(`
      SELECT COUNT(*) as valid_scorecards 
      FROM scorecards 
      WHERE (round_type = 'sim' OR round_type IS NULL) 
      AND total_strokes IS NOT NULL 
      AND total_strokes > 0
    `);
    console.log(`Scorecards with valid total_strokes: ${validScorecards[0].valid_scorecards}`);

    // Get best score ever
    const { rows: bestScore } = await pool.query(`
      SELECT MIN(total_strokes) as best_score_ever
      FROM scorecards 
      WHERE (round_type = 'sim' OR round_type IS NULL) 
      AND total_strokes IS NOT NULL 
      AND total_strokes > 0
    `);
    console.log(`Best score ever: ${bestScore[0].best_score_ever}`);

    // Get details of the best score
    const { rows: bestScoreDetails } = await pool.query(`
      SELECT 
        s.id,
        s.total_strokes,
        s.date_played,
        s.course_name,
        s.course_id,
        u.first_name,
        u.last_name,
        u.club
      FROM scorecards s
      JOIN users u ON s.user_id = u.member_id
      WHERE (s.round_type = 'sim' OR s.round_type IS NULL) 
      AND s.total_strokes IS NOT NULL 
      AND s.total_strokes > 0
      ORDER BY s.total_strokes ASC
      LIMIT 5
    `);
    console.log('\nTop 5 best scores:');
    bestScoreDetails.forEach((score, index) => {
      console.log(`${index + 1}. ${score.total_strokes} strokes by ${score.first_name} ${score.last_name} (${score.club}) on ${score.date_played} at ${score.course_name || 'Unknown course'}`);
    });

    // Check average score
    const { rows: avgScore } = await pool.query(`
      SELECT ROUND(AVG(total_strokes), 1) as avg_score_community
      FROM scorecards 
      WHERE (round_type = 'sim' OR round_type IS NULL) 
      AND total_strokes IS NOT NULL 
      AND total_strokes > 0
    `);
    console.log(`\nCommunity average score: ${avgScore[0].avg_score_community}`);

    // Check recent activity
    const { rows: recentRounds } = await pool.query(`
      SELECT COUNT(*) as rounds_this_month
      FROM scorecards 
      WHERE (round_type = 'sim' OR round_type IS NULL) 
      AND date_played >= CURRENT_DATE - INTERVAL '30 days'
    `);
    console.log(`Rounds this month: ${recentRounds[0].rounds_this_month}`);

    // Check course records
    const { rows: courseRecords } = await pool.query(`
      SELECT COUNT(*) as total_course_records
      FROM course_records 
      WHERE is_current = true
    `);
    console.log(`Total course records: ${courseRecords[0].total_course_records}`);

    // Test the exact query from the leaderboard
    console.log('\n--- Testing Leaderboard Query ---');
    const { rows: leaderboardStats } = await pool.query(`
      SELECT 
        COUNT(DISTINCT u.member_id) as total_players,
        COUNT(DISTINCT u.club) as total_clubs,
        COUNT(DISTINCT s.id) as total_rounds,
        COUNT(DISTINCT s.course_id) as total_courses_played,
        COUNT(DISTINCT cr.course_id) as total_course_records,
        ROUND(AVG(s.total_strokes), 1) as avg_score_community,
        MIN(s.total_strokes) as best_score_ever,
        COUNT(DISTINCT CASE WHEN s.date_played >= CURRENT_DATE - INTERVAL '7 days' THEN s.id END) as rounds_this_week,
        COUNT(DISTINCT CASE WHEN s.date_played >= CURRENT_DATE - INTERVAL '30 days' THEN s.id END) as rounds_this_month
      FROM users u
      LEFT JOIN scorecards s ON u.member_id = s.user_id AND (s.round_type = 'sim' OR s.round_type IS NULL)
      LEFT JOIN course_records cr ON u.member_id = cr.user_id AND cr.is_current = true
      WHERE u.role IN ('Member', 'Admin', 'Club Pro')
    `);

    const stats = leaderboardStats[0];
    console.log('Leaderboard stats:');
    console.log(`- Total players: ${stats.total_players}`);
    console.log(`- Total clubs: ${stats.total_clubs}`);
    console.log(`- Total rounds: ${stats.total_rounds}`);
    console.log(`- Total courses played: ${stats.total_courses_played}`);
    console.log(`- Total course records: ${stats.total_course_records}`);
    console.log(`- Average score: ${stats.avg_score_community}`);
    console.log(`- Best score ever: ${stats.best_score_ever}`);
    console.log(`- Rounds this week: ${stats.rounds_this_week}`);
    console.log(`- Rounds this month: ${stats.rounds_this_month}`);

  } catch (error) {
    console.error('Error checking best score data:', error);
  } finally {
    await pool.end();
  }
}

checkBestScoreData(); 