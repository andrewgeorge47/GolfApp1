const { Pool } = require('pg');
require('dotenv').config();

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function buildCourseDatabase() {
  console.log('Starting course database build from existing scorecard data...');
  
  try {
    // Step 1: Extract unique course-teebox combinations with rating/slope data
    console.log('\n1. Extracting course-teebox combinations from scorecards...');
    
    const { rows: courseData } = await pool.query(`
      SELECT 
        course_name,
        teebox,
        course_rating,
        course_slope,
        COUNT(*) as usage_count,
        MAX(date_played) as last_used,
        MIN(date_played) as first_used,
        AVG(course_rating) as avg_rating,
        AVG(course_slope) as avg_slope,
        COUNT(DISTINCT user_id) as unique_players
      FROM scorecards 
      WHERE course_name IS NOT NULL 
        AND teebox IS NOT NULL 
        AND course_rating IS NOT NULL 
        AND course_slope IS NOT NULL
        AND course_name != ''
        AND teebox != ''
      GROUP BY course_name, teebox, course_rating, course_slope
      ORDER BY usage_count DESC, last_used DESC
    `);
    
    console.log(`Found ${courseData.length} unique course-teebox combinations`);
    
    // Step 2: Add teebox_data column to simulator_courses_combined table
    console.log('\n2. Adding teebox_data column to simulator_courses_combined table...');
    
    await pool.query(`
      ALTER TABLE simulator_courses_combined
        ADD COLUMN IF NOT EXISTS teebox_data JSONB DEFAULT '[]'::jsonb
    `);
    
    // Step 3: Group teebox data by course and update the simulator_courses_combined table
    console.log('\n3. Updating simulator_courses_combined with teebox data...');
    
    // Group by course name
    const courseTeeboxMap = new Map();
    
    for (const record of courseData) {
      if (!courseTeeboxMap.has(record.course_name)) {
        courseTeeboxMap.set(record.course_name, []);
      }
      
      courseTeeboxMap.get(record.course_name).push({
        teebox: record.teebox,
        course_rating: parseFloat(record.course_rating),
        course_slope: parseInt(record.course_slope),
        usage_count: record.usage_count,
        first_used: record.first_used,
        last_used: record.last_used,
        unique_players: record.unique_players
      });
    }
    
    let updatedCount = 0;
    let notFoundCount = 0;
    
    for (const [courseName, teeboxData] of courseTeeboxMap) {
      try {
        // Find the course in simulator_courses_combined
        const { rows: courseRows } = await pool.query(
          'SELECT id FROM simulator_courses_combined WHERE LOWER(name) = LOWER($1) LIMIT 1',
          [courseName]
        );
        
        if (courseRows.length > 0) {
          // Update the course with teebox data
          await pool.query(
            'UPDATE simulator_courses_combined SET teebox_data = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [JSON.stringify(teeboxData), courseRows[0].id]
          );
          updatedCount++;
        } else {
          // Try normalized matching
          const normalizedCourseName = courseName
            .toLowerCase()
            .replace(/\s+(golf club|country club|the|gc|cc|golf course|course)$/gi, '')
            .replace(/[^\w\s]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
          
          if (normalizedCourseName) {
            const { rows: normalizedRows } = await pool.query(
              'SELECT id FROM simulator_courses_combined WHERE LOWER(name) LIKE $1 LIMIT 1',
              [`%${normalizedCourseName}%`]
            );
            
            if (normalizedRows.length > 0) {
              await pool.query(
                'UPDATE simulator_courses_combined SET teebox_data = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
                [JSON.stringify(teeboxData), normalizedRows[0].id]
              );
              updatedCount++;
            } else {
              notFoundCount++;
              console.log(`Course not found: "${courseName}"`);
            }
          } else {
            notFoundCount++;
            console.log(`Course not found: "${courseName}"`);
          }
        }
      } catch (err) {
        console.error(`Error updating course ${courseName}:`, err.message);
      }
    }
    
    console.log(`Updated: ${updatedCount} courses, Not found: ${notFoundCount}`);
    
    // Step 4: Create summary statistics
    console.log('\n4. Generating summary statistics...');
    
    const { rows: summary } = await pool.query(`
      SELECT 
        COUNT(*) as total_courses_with_teebox_data,
        COUNT(*) FILTER (WHERE teebox_data IS NOT NULL AND jsonb_array_length(teebox_data) > 0) as courses_with_teebox_data,
        AVG(jsonb_array_length(teebox_data)) FILTER (WHERE teebox_data IS NOT NULL) as avg_teeboxes_per_course,
        MAX(jsonb_array_length(teebox_data)) FILTER (WHERE teebox_data IS NOT NULL) as max_teeboxes_per_course
      FROM simulator_courses_combined
    `);
    
    console.log('\n=== COURSE DATABASE SUMMARY ===');
    console.log(`Total courses: ${summary[0].total_courses_with_teebox_data}`);
    console.log(`Courses with teebox data: ${summary[0].courses_with_teebox_data}`);
    console.log(`Average teeboxes per course: ${Math.round(summary[0].avg_teeboxes_per_course || 0)}`);
    console.log(`Maximum teeboxes per course: ${summary[0].max_teeboxes_per_course || 0}`);
    
    // Step 5: Show top courses by teebox usage
    console.log('\n5. Top 10 courses by teebox usage:');
    
    const { rows: topCourses } = await pool.query(`
      SELECT 
        name,
        jsonb_array_length(teebox_data) as teebox_count,
        (
          SELECT SUM((value->>'usage_count')::int)
          FROM jsonb_array_elements(teebox_data) as value
        ) as total_usage
      FROM simulator_courses_combined
      WHERE teebox_data IS NOT NULL AND jsonb_array_length(teebox_data) > 0
      ORDER BY total_usage DESC NULLS LAST
      LIMIT 10
    `);
    
    topCourses.forEach((course, index) => {
      console.log(`${index + 1}. ${course.name} - ${course.total_usage || 0} rounds (${course.teebox_count} teeboxes)`);
    });
    
    // Step 6: Show teebox distribution
    console.log('\n6. Teebox usage distribution:');
    
    const { rows: teeboxStats } = await pool.query(`
      SELECT 
        value->>'teebox' as teebox,
        COUNT(*) as course_count,
        SUM((value->>'usage_count')::int) as total_usage,
        AVG((value->>'course_rating')::numeric) as avg_rating,
        AVG((value->>'course_slope')::int) as avg_slope
      FROM simulator_courses_combined,
      jsonb_array_elements(teebox_data) as value
      WHERE teebox_data IS NOT NULL
      GROUP BY value->>'teebox'
      ORDER BY total_usage DESC
    `);
    
    teeboxStats.forEach(stat => {
      const avgRating = stat.avg_rating ? parseFloat(stat.avg_rating).toFixed(1) : 'N/A';
      const avgSlope = stat.avg_slope ? Math.round(parseFloat(stat.avg_slope)) : 'N/A';
      console.log(`${stat.teebox}: ${stat.total_usage} rounds, ${stat.course_count} courses, Rating: ${avgRating}, Slope: ${avgSlope}`);
    });
    
    console.log('\n✅ Course database build completed successfully!');
    
  } catch (error) {
    console.error('Error building course database:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the script
if (require.main === module) {
  buildCourseDatabase()
    .then(() => {
      console.log('Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

module.exports = { buildCourseDatabase }; 