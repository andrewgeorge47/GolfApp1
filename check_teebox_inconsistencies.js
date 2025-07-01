const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkTeeboxInconsistencies() {
  try {
    console.log('🔍 Checking for teebox inconsistencies...\n');

    // Query to find courses with multiple different rating/slope values for the same teebox
    const query = `
      WITH teebox_variations AS (
        SELECT 
          course_name,
          teebox,
          course_rating,
          course_slope,
          COUNT(*) as usage_count,
          MIN(date_played) as first_used,
          MAX(date_played) as last_used
        FROM scorecards 
        WHERE 
          teebox IS NOT NULL 
          AND course_rating IS NOT NULL 
          AND course_slope IS NOT NULL
          AND round_type = 'sim'
        GROUP BY course_name, teebox, course_rating, course_slope
      ),
      teebox_summary AS (
        SELECT 
          course_name,
          teebox,
          COUNT(*) as unique_combinations,
          STRING_AGG(
            CONCAT(course_rating, '/', course_slope, ' (', usage_count, '×)'), 
            ', ' 
            ORDER BY usage_count DESC, course_rating, course_slope
          ) as all_combinations,
          SUM(usage_count) as total_usage
        FROM teebox_variations
        GROUP BY course_name, teebox
        HAVING COUNT(*) > 1
      )
      SELECT 
        course_name,
        teebox,
        unique_combinations,
        all_combinations,
        total_usage
      FROM teebox_summary
      ORDER BY course_name, teebox;
    `;

    const { rows } = await pool.query(query);

    if (rows.length === 0) {
      console.log('✅ No teebox inconsistencies found! All courses have consistent rating/slope data for each teebox.');
      return;
    }

    console.log(`❌ Found ${rows.length} teeboxes with inconsistent rating/slope data:\n`);

    // Group by course for better readability
    const courseGroups = {};
    rows.forEach(row => {
      if (!courseGroups[row.course_name]) {
        courseGroups[row.course_name] = [];
      }
      courseGroups[row.course_name].push(row);
    });

    Object.keys(courseGroups).sort().forEach(courseName => {
      console.log(`🏌️  ${courseName}:`);
      courseGroups[courseName].forEach(teebox => {
        console.log(`   • ${teebox.teebox}: ${teebox.all_combinations} (${teebox.total_usage} total rounds)`);
      });
      console.log('');
    });

    // Summary statistics
    const totalCourses = Object.keys(courseGroups).length;
    const totalTeeboxes = rows.length;
    const totalRounds = rows.reduce((sum, row) => sum + parseInt(row.total_usage), 0);

    console.log('📊 Summary:');
    console.log(`   • Courses affected: ${totalCourses}`);
    console.log(`   • Teeboxes with inconsistencies: ${totalTeeboxes}`);
    console.log(`   • Total rounds affected: ${totalRounds}`);
    console.log('');

    // Show the most problematic courses (most variations)
    console.log('🚨 Most problematic courses:');
    const courseStats = Object.keys(courseGroups).map(courseName => ({
      course: courseName,
      teeboxCount: courseGroups[courseName].length,
      totalVariations: courseGroups[courseName].reduce((sum, t) => sum + parseInt(t.unique_combinations), 0)
    })).sort((a, b) => b.totalVariations - a.totalVariations);

    courseStats.slice(0, 10).forEach((stat, index) => {
      console.log(`   ${index + 1}. ${stat.course}: ${stat.teeboxCount} teeboxes, ${stat.totalVariations} total variations`);
    });

  } catch (error) {
    console.error('Error checking teebox inconsistencies:', error);
  } finally {
    await pool.end();
  }
}

// Run the check
checkTeeboxInconsistencies(); 