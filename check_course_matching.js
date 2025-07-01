const { Pool } = require('pg');
require('dotenv').config();

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkCourseMatching() {
  console.log('Analyzing course name matching between scorecards and simulator_courses_combined...\n');
  
  try {
    // Get all unique course names from scorecards
    const { rows: scorecardCourses } = await pool.query(`
      SELECT DISTINCT course_name 
      FROM scorecards 
      WHERE course_name IS NOT NULL 
        AND course_name != ''
        AND teebox IS NOT NULL 
        AND course_rating IS NOT NULL 
        AND course_slope IS NOT NULL
      ORDER BY course_name
    `);
    
    console.log(`Found ${scorecardCourses.length} unique courses in scorecards table:\n`);
    
    // Get all course names from simulator_courses_combined
    const { rows: combinedCourses } = await pool.query(`
      SELECT name FROM simulator_courses_combined ORDER BY name
    `);
    
    console.log(`Found ${combinedCourses.length} courses in simulator_courses_combined table.\n`);
    
    // Check which scorecard courses exist in combined table
    const scorecardCourseNames = scorecardCourses.map(c => c.course_name);
    const combinedCourseNames = combinedCourses.map(c => c.name);
    
    const found = [];
    const notFound = [];
    
    for (const scorecardCourse of scorecardCourseNames) {
      // Try exact match first
      if (combinedCourseNames.includes(scorecardCourse)) {
        found.push(scorecardCourse);
      } else {
        // Try case-insensitive match
        const lowerScorecard = scorecardCourse.toLowerCase();
        const match = combinedCourseNames.find(name => 
          name.toLowerCase() === lowerScorecard
        );
        
        if (match) {
          found.push(`${scorecardCourse} -> ${match}`);
        } else {
          notFound.push(scorecardCourse);
        }
      }
    }
    
    console.log('=== COURSE MATCHING RESULTS ===\n');
    console.log(`✅ Found matches: ${found.length}`);
    console.log(`❌ Not found: ${notFound.length}\n`);
    
    if (notFound.length > 0) {
      console.log('Courses in scorecards but not in simulator_courses_combined:');
      notFound.forEach(course => {
        console.log(`  - "${course}"`);
      });
      console.log();
    }
    
    // Show some examples of potential matches
    console.log('=== POTENTIAL MATCHES ===\n');
    const potentialMatches = [];
    
    for (const notFoundCourse of notFound.slice(0, 10)) { // Check first 10
      const normalized = notFoundCourse
        .toLowerCase()
        .replace(/\s+(golf club|country club|the|gc|cc|golf course|course)$/gi, '')
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      
      if (normalized) {
        const matches = combinedCourseNames.filter(name => 
          name.toLowerCase().includes(normalized) || 
          normalized.includes(name.toLowerCase())
        );
        
        if (matches.length > 0) {
          potentialMatches.push({
            scorecard: notFoundCourse,
            normalized: normalized,
            potential: matches.slice(0, 3) // Show top 3 matches
          });
        }
      }
    }
    
    if (potentialMatches.length > 0) {
      console.log('Potential matches (scorecard -> possible combined table matches):');
      potentialMatches.forEach(match => {
        console.log(`  "${match.scorecard}" (normalized: "${match.normalized}")`);
        match.potential.forEach(p => console.log(`    -> "${p}"`));
        console.log();
      });
    }
    
  } catch (error) {
    console.error('Error checking course matching:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the script
if (require.main === module) {
  checkCourseMatching()
    .then(() => {
      console.log('Analysis completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Analysis failed:', error);
      process.exit(1);
    });
}

module.exports = { checkCourseMatching }; 