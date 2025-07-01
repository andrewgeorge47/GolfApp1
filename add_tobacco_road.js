const { Pool } = require('pg');
require('dotenv').config();

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function addTobaccoRoad() {
  console.log('Adding Tobacco Road and other missing courses to simulator_courses_combined...\n');
  
  try {
    // First, let's check if Tobacco Road already exists
    const { rows: existing } = await pool.query(`
      SELECT id, name FROM simulator_courses_combined 
      WHERE LOWER(name) LIKE '%tobacco%' OR LOWER(name) LIKE '%road%'
    `);
    
    if (existing.length > 0) {
      console.log('Found existing Tobacco Road entries:');
      existing.forEach(row => console.log(`  - ID: ${row.id}, Name: ${row.name}`));
    }
    
    // Add Tobacco Road and other important missing courses
    const coursesToAdd = [
      {
        name: 'Tobacco Road',
        location: 'Sanford, NC',
        designer: 'Mike Strantz',
        platforms: ['GSPro'],
        course_types: ['parkland', 'historic']
      },
      {
        name: 'Old Course St. Andrews',
        location: 'St Andrews, Scotland',
        designer: 'Unknown',
        platforms: ['GSPro'],
        course_types: ['links', 'historic', 'major_venue']
      },
      {
        name: 'Barefoot - Dye',
        location: 'North Myrtle Beach, SC',
        designer: 'Pete Dye',
        platforms: ['GSPro'],
        course_types: ['parkland']
      },
      {
        name: 'Firestone Country Club South',
        location: 'Akron, OH',
        designer: 'Bert Way',
        platforms: ['GSPro'],
        course_types: ['parkland', 'tour_stop']
      },
      {
        name: 'Harbour Town at Hilton Head',
        location: 'Hilton Head, SC',
        designer: 'Pete Dye',
        platforms: ['GSPro'],
        course_types: ['coastal', 'tour_stop']
      },
      {
        name: 'Kapalua Plantation Course',
        location: 'Maui, HI',
        designer: 'Bill Coore & Ben Crenshaw',
        platforms: ['GSPro'],
        course_types: ['tropical', 'tour_stop']
      },
      {
        name: 'Royal Portrush Dunluce Links',
        location: 'Portrush, Northern Ireland',
        designer: 'Harry Colt',
        platforms: ['GSPro'],
        course_types: ['links', 'historic', 'major_venue']
      },
      {
        name: 'Torrey Pines South',
        location: 'La Jolla, CA',
        designer: 'William F. Bell',
        platforms: ['GSPro'],
        course_types: ['coastal', 'tour_stop']
      },
      {
        name: 'Whisper Rock Lower',
        location: 'Scottsdale, AZ',
        designer: 'Tom Fazio',
        platforms: ['GSPro'],
        course_types: ['desert']
      },
      {
        name: 'Whisper Rock Upper',
        location: 'Scottsdale, AZ',
        designer: 'Phil Mickelson',
        platforms: ['GSPro'],
        course_types: ['desert']
      }
    ];
    
    console.log('Adding courses to simulator_courses_combined...');
    let addedCount = 0;
    
    for (const course of coursesToAdd) {
      try {
        // Check if course already exists
        const { rows: existing } = await pool.query(`
          SELECT id FROM simulator_courses_combined WHERE LOWER(name) = LOWER($1)
        `, [course.name]);
        
        if (existing.length > 0) {
          console.log(`⏭️  Already exists: ${course.name} (ID: ${existing[0].id})`);
          continue;
        }
        
        // Add the course
        const { rows } = await pool.query(`
          INSERT INTO simulator_courses_combined (name, location, designer, platforms, course_types)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id, name
        `, [
          course.name,
          course.location,
          course.designer,
          course.platforms,
          course.course_types
        ]);
        
        if (rows.length > 0) {
          addedCount++;
          console.log(`✅ Added: ${course.name} (ID: ${rows[0].id})`);
        }
      } catch (err) {
        console.error(`❌ Error adding ${course.name}:`, err.message);
      }
    }
    
    console.log(`\nAdded ${addedCount} new courses to simulator_courses_combined.\n`);
    
    // Now re-run the course database build to include the new courses
    console.log('Re-running course database build to include new courses...');
    
    const { buildCourseDatabase } = require('./build_course_database.js');
    await buildCourseDatabase();
    
    console.log('\n✅ Tobacco Road and other courses added successfully!');
    
  } catch (error) {
    console.error('Error adding courses:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the script
if (require.main === module) {
  addTobaccoRoad()
    .then(() => {
      console.log('Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

module.exports = { addTobaccoRoad }; 