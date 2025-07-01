const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function topCourses() {
  const query = `
    SELECT course_name, COUNT(*) as scorecard_count
    FROM scorecards
    WHERE course_name IS NOT NULL
    GROUP BY course_name
    ORDER BY scorecard_count DESC
    LIMIT 20;
  `;
  try {
    const { rows } = await pool.query(query);
    console.log('Top 20 courses by scorecard count:');
    rows.forEach((row, idx) => {
      console.log(`${idx + 1}. ${row.course_name} (${row.scorecard_count} scorecards)`);
    });
  } catch (err) {
    console.error('Error fetching top courses:', err);
  } finally {
    await pool.end();
  }
}

topCourses(); 