const { Pool } = require('pg');
require('dotenv').config();

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function fixCourseMatching() {
  console.log('Fixing course matching by adding missing courses and fixing name variations...\n');
  
  try {
    // Course name mappings (scorecard name -> standardized name)
    const courseMappings = {
      // Fix spelling variations
      'Quail Hallow': 'Quail Hollow',
      'Pine Neddles': 'Pine Needles',
      'Palm Ceach Country Club': 'Palm Beach Country Club',
      'Redlanda Mesa': 'Redlands Mesa',
      'Cheyenne shaddows': 'Cheyenne Shadows',
      
      // Fix name variations
      'Bay Hill Golf Club': 'Bay Hill',
      'Bear Dance': 'Bear Dance Golf Club',
      'ChampionsGate CC': 'Championsgate Country Club',
      'Firestone': 'Firestone Country Club',
      'Pebble Beach': 'Pebble Beach Golf Links',
      'Muirfield Village': 'Muirfield Village Golf Club',
      'Oakmont': 'Oakmont Country Club',
      'PGA West': 'PGA West Stadium Course',
      'Spanish Bay': 'Pebble Beach - Spanish Bay',
      'Shinnecock': 'Shinnecock Hills',
      'Sand Hills': 'Sand Hills Golf Club',
      'Shadow Creek': 'Shadow Creek Golf Club',
      'Waialae Country Club': 'Waialae Country Club',
      'The Royal Montreal': 'Royal Montreal Golf Club',
      'Royal County Down': 'Royal County Down Golf Club',
      'Royal Liverpool': 'Royal Liverpool Golf Club',
      'Royal Fox': 'Royal Fox Country Club',
      'San Antonio Country Club': 'San Antonio Country Club',
      'Seven Canyons Golf Club': 'Seven Canyons',
      'Troubadour': 'Troubadour Golf Club',
      'Yeamans Hall': 'Yeamans Hall Club',
      'Porters Neck': 'Porters Neck Country Club',
      'Old Works Golf Club': 'Old Works',
      'Clearwater golf club': 'Clearwater Golf Club',
      'Cypress point': 'Cypress Point Club',
      'Dallas National': 'Dallas National Golf Club',
      'Chimera': 'Chimera Golf Club',
      'Winter Wonderland': 'Winter Wonderland Golf Course'
    };

    // Courses to add to simulator_courses_combined (these don't exist yet)
    const coursesToAdd = [
      { name: 'Barefoot - Dye', location: 'North Myrtle Beach, SC', designer: 'Pete Dye', platforms: ['GSPro'] },
      { name: 'Barefoot Dye', location: 'North Myrtle Beach, SC', designer: 'Pete Dye', platforms: ['GSPro'] },
      { name: 'Black Berry Oaks', location: 'Illinois', designer: 'Unknown', platforms: ['GSPro'] },
      { name: 'Blue Bayou', location: 'Unknown', designer: 'Unknown', platforms: ['GSPro'] },
      { name: 'Brandon Dunes', location: 'Unknown', designer: 'Unknown', platforms: ['GSPro'] },
      { name: 'Broadmoore East', location: 'Colorado', designer: 'Unknown', platforms: ['GSPro'] },
      { name: 'Bulls Bridge', location: 'Connecticut', designer: 'Unknown', platforms: ['GSPro'] },
      { name: 'Firestone Country Club South', location: 'Akron, OH', designer: 'Bert Way', platforms: ['GSPro'] },
      { name: 'Greywalls (Beta)', location: 'Michigan', designer: 'Mike DeVries', platforms: ['GSPro'] },
      { name: 'Harbour Town at Hilton Head', location: 'Hilton Head, SC', designer: 'Pete Dye', platforms: ['GSPro'] },
      { name: 'Kapalua Plantation Course', location: 'Maui, HI', designer: 'Bill Coore & Ben Crenshaw', platforms: ['GSPro'] },
      { name: 'Linfield National', location: 'Unknown', designer: 'Unknown', platforms: ['GSPro'] },
      { name: 'Los Angeles County Club', location: 'Los Angeles, CA', designer: 'George C. Thomas Jr.', platforms: ['GSPro'] },
      { name: 'Old Course St. Andrews', location: 'St Andrews, Scotland', designer: 'Unknown', platforms: ['GSPro'] },
      { name: 'Olympia Fields North', location: 'Olympia Fields, IL', designer: 'Willie Park Jr.', platforms: ['GSPro'] },
      { name: 'Redlands Mesa', location: 'Grand Junction, CO', designer: 'Jim Engh', platforms: ['GSPro'] },
      { name: 'Royal Melbourne West', location: 'Melbourne, Australia', designer: 'Alister MacKenzie', platforms: ['GSPro'] },
      { name: 'Royal Portrush Dunluce Links', location: 'Portrush, Northern Ireland', designer: 'Harry Colt', platforms: ['GSPro'] },
      { name: 'SGT West Stadium Course', location: 'Unknown', designer: 'Unknown', platforms: ['GSPro'] },
      { name: 'Silverado Resort & Spa', location: 'Napa, CA', designer: 'Robert Trent Jones Jr.', platforms: ['GSPro'] },
      { name: 'Sod Grass', location: 'Unknown', designer: 'Unknown', platforms: ['GSPro'] },
      { name: 'STG Stadium Course', location: 'Unknown', designer: 'Unknown', platforms: ['GSPro'] },
      { name: 'Teton Pines', location: 'Jackson Hole, WY', designer: 'Arnold Palmer', platforms: ['GSPro'] },
      { name: 'The Home Of The Players', location: 'Ponte Vedra Beach, FL', designer: 'Pete Dye', platforms: ['GSPro'] },
      { name: 'Tobacco Road', location: 'Sanford, NC', designer: 'Mike Strantz', platforms: ['GSPro'] },
      { name: 'Torrey Pines South', location: 'La Jolla, CA', designer: 'William F. Bell', platforms: ['GSPro'] },
      { name: 'TPC Sodgrass', location: 'Unknown', designer: 'Unknown', platforms: ['GSPro'] },
      { name: 'Trump National GC - LA', location: 'Los Angeles, CA', designer: 'Tom Fazio', platforms: ['GSPro'] },
      { name: 'Whisper Rock Lower', location: 'Scottsdale, AZ', designer: 'Tom Fazio', platforms: ['GSPro'] },
      { name: 'Whisper Rock Upper', location: 'Scottsdale, AZ', designer: 'Phil Mickelson', platforms: ['GSPro'] }
    ];

    console.log('Step 1: Adding missing courses to simulator_courses_combined...');
    let addedCount = 0;
    
    for (const course of coursesToAdd) {
      try {
        const { rows } = await pool.query(`
          INSERT INTO simulator_courses_combined (name, location, designer, platforms, course_types)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (name) DO NOTHING
          RETURNING id
        `, [
          course.name,
          course.location,
          course.designer,
          course.platforms,
          ['parkland'] // Default course type
        ]);
        
        if (rows.length > 0) {
          addedCount++;
          console.log(`✅ Added: ${course.name}`);
        } else {
          console.log(`⏭️  Already exists: ${course.name}`);
        }
      } catch (err) {
        console.error(`❌ Error adding ${course.name}:`, err.message);
      }
    }
    
    console.log(`\nAdded ${addedCount} new courses to simulator_courses_combined.\n`);

    console.log('Step 2: Updating scorecards with corrected course names...');
    let updatedCount = 0;
    
    for (const [oldName, newName] of Object.entries(courseMappings)) {
      try {
        const { rowCount } = await pool.query(`
          UPDATE scorecards 
          SET course_name = $1 
          WHERE course_name = $2
        `, [newName, oldName]);
        
        if (rowCount > 0) {
          updatedCount++;
          console.log(`✅ Updated ${rowCount} scorecards: "${oldName}" -> "${newName}"`);
        }
      } catch (err) {
        console.error(`❌ Error updating ${oldName}:`, err.message);
      }
    }
    
    console.log(`\nUpdated ${updatedCount} course name mappings in scorecards.\n`);

    console.log('Step 3: Re-running course database build with improved matching...');
    
    // Now run the original build script again
    const { buildCourseDatabase } = require('./build_course_database.js');
    await buildCourseDatabase();
    
    console.log('\n✅ Course matching fix completed successfully!');
    
  } catch (error) {
    console.error('Error fixing course matching:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the script
if (require.main === module) {
  fixCourseMatching()
    .then(() => {
      console.log('Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

module.exports = { fixCourseMatching }; 