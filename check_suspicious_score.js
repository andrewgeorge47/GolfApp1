// Check suspicious 28-stroke scorecard
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkSuspiciousScore() {
  try {
    console.log('Checking suspicious 28-stroke scorecard...\n');

    // Get details of the 28-stroke round
    const { rows: suspiciousScore } = await pool.query(`
      SELECT 
        s.id,
        s.total_strokes,
        s.final_score,
        s.total_mulligans,
        s.scores,
        s.date_played,
        s.course_name,
        s.course_id,
        s.type,
        s.round_type,
        u.first_name,
        u.last_name,
        u.club
      FROM scorecards s
      JOIN users u ON s.user_id = u.member_id
      WHERE s.total_strokes = 28
      ORDER BY s.date_played DESC
      LIMIT 1
    `);

    if (suspiciousScore.length > 0) {
      const score = suspiciousScore[0];
      console.log('28-stroke scorecard details:');
      console.log(`- ID: ${score.id}`);
      console.log(`- Player: ${score.first_name} ${score.last_name} (${score.club})`);
      console.log(`- Date: ${score.date_played}`);
      console.log(`- Course: ${score.course_name}`);
      console.log(`- Course ID: ${score.course_id}`);
      console.log(`- Type: ${score.type}`);
      console.log(`- Round Type: ${score.round_type}`);
      console.log(`- Total Strokes: ${score.total_strokes}`);
      console.log(`- Final Score: ${score.final_score}`);
      console.log(`- Total Mulligans: ${score.total_mulligans}`);
      console.log(`- Scores JSON: ${JSON.stringify(score.scores, null, 2)}`);
    }

    // Check if this is a par-3 course or short course
    if (suspiciousScore.length > 0 && suspiciousScore[0].course_id) {
      const { rows: courseInfo } = await pool.query(`
        SELECT 
          name,
          location,
          designer,
          platforms,
          course_types,
          par_values
        FROM simulator_courses_combined
        WHERE id = $1
      `, [suspiciousScore[0].course_id]);

      if (courseInfo.length > 0) {
        console.log('\nCourse information:');
        console.log(`- Name: ${courseInfo[0].name}`);
        console.log(`- Location: ${courseInfo[0].location}`);
        console.log(`- Designer: ${courseInfo[0].designer}`);
        console.log(`- Platforms: ${courseInfo[0].platforms}`);
        console.log(`- Course Types: ${courseInfo[0].course_types}`);
        console.log(`- Par Values: ${JSON.stringify(courseInfo[0].par_values, null, 2)}`);
      }
    }

    // Check for other very low scores
    console.log('\n--- Other very low scores ---');
    const { rows: lowScores } = await pool.query(`
      SELECT 
        s.total_strokes,
        s.course_name,
        s.date_played,
        u.first_name,
        u.last_name,
        u.club
      FROM scorecards s
      JOIN users u ON s.user_id = u.member_id
      WHERE (s.round_type = 'sim' OR s.round_type IS NULL) 
      AND s.total_strokes IS NOT NULL 
      AND s.total_strokes > 0
      AND s.total_strokes <= 60
      ORDER BY s.total_strokes ASC
      LIMIT 10
    `);

    console.log('Top 10 lowest scores:');
    lowScores.forEach((score, index) => {
      console.log(`${index + 1}. ${score.total_strokes} strokes by ${score.first_name} ${score.last_name} (${score.club}) on ${score.date_played} at ${score.course_name || 'Unknown course'}`);
    });

    // Check if there are any par-3 courses or short courses
    console.log('\n--- Checking for par-3 or short courses ---');
    const { rows: shortCourses } = await pool.query(`
      SELECT 
        name,
        location,
        course_types,
        par_values
      FROM simulator_courses_combined
      WHERE course_types && ARRAY['par3'] 
      OR name ILIKE '%par 3%'
      OR name ILIKE '%short%'
      OR name ILIKE '%executive%'
      LIMIT 10
    `);

    console.log('Par-3 or short courses found:');
    shortCourses.forEach((course, index) => {
      console.log(`${index + 1}. ${course.name} (${course.location}) - Types: ${course.course_types}, Par: ${JSON.stringify(course.par_values)}`);
    });

  } catch (error) {
    console.error('Error checking suspicious score:', error);
  } finally {
    await pool.end();
  }
}

checkSuspiciousScore(); 