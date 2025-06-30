require('dotenv').config();
const { Pool } = require('pg');

// Create a connection pool using environment variables
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function updatePar3Courses() {
  const client = await pool.connect();
  
  try {
    console.log('Starting to update par3 courses with par values...');
    
    // First, let's check if the par_values column exists
    const { rows: columnCheck } = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'simulator_courses_combined' 
      AND column_name = 'par_values'
    `);
    
    if (columnCheck.length === 0) {
      console.log('Adding par_values column to simulator_courses_combined table...');
      await client.query(`
        ALTER TABLE simulator_courses_combined
        ADD COLUMN par_values JSONB
      `);
    }
    
    // Find all GSPro courses that are tagged as par3
    const { rows: par3Courses } = await client.query(`
      SELECT 
        c.id,
        c.name,
        c.platforms,
        c.par_values
      FROM simulator_courses_combined c
      INNER JOIN gspro_courses g ON c.gspro_id = g.id
      WHERE g.is_par3 = true
      AND (c.par_values IS NULL OR c.par_values = 'null'::jsonb)
    `);
    
    console.log(`Found ${par3Courses.length} par3 courses that need par values updated`);
    
    if (par3Courses.length === 0) {
      console.log('No par3 courses found that need updating.');
      return;
    }
    
    // Update each par3 course with par values (all holes = par 3)
    let updatedCount = 0;
    
    for (const course of par3Courses) {
      try {
        // For par3 courses, we'll set all holes to par 3
        // We'll assume 18 holes for most par3 courses, but we can adjust if needed
        const parValues = JSON.stringify(Array.from({ length: 18 }, () => 3)); // All par 3s
        
        await client.query(`
          UPDATE simulator_courses_combined 
          SET par_values = $1::jsonb, updated_at = NOW()
          WHERE id = $2
        `, [parValues, course.id]);
        
        updatedCount++;
        console.log(`✅ Updated: ${course.name} (${course.platforms.join(', ')}) - All holes set to par 3`);
        
      } catch (error) {
        console.error(`❌ Error updating course ${course.name}:`, error.message);
      }
    }
    
    console.log(`\n=== Update Summary ===`);
    console.log(`✅ Successfully updated ${updatedCount} par3 courses`);
    console.log(`❌ Failed to update ${par3Courses.length - updatedCount} courses`);
    
    // Show some statistics
    const { rows: stats } = await client.query(`
      SELECT 
        COUNT(*) as total_courses,
        COUNT(CASE WHEN par_values IS NOT NULL AND par_values != 'null'::jsonb THEN 1 END) as courses_with_par,
        COUNT(CASE WHEN par_values IS NULL OR par_values = 'null'::jsonb THEN 1 END) as courses_without_par
      FROM simulator_courses_combined
    `);
    
    console.log(`\n=== Database Statistics ===`);
    console.log(`Total courses: ${stats[0].total_courses}`);
    console.log(`Courses with par values: ${stats[0].courses_with_par}`);
    console.log(`Courses without par values: ${stats[0].courses_without_par}`);
    
  } catch (error) {
    console.error('Error updating par3 courses:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the update
updatePar3Courses()
  .then(() => {
    console.log('Par3 courses update completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Par3 courses update failed:', error);
    process.exit(1);
  }); 