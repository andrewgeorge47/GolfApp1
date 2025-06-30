const fs = require('fs');
const { Pool } = require('pg');
require('dotenv').config();

// PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function createTrackmanCoursesTable() {
  try {
    // Create the Trackman courses table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS trackman_courses (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for better performance
    await pool.query('CREATE INDEX IF NOT EXISTS idx_trackman_courses_name ON trackman_courses(name)');

    console.log('Trackman courses table created successfully');
  } catch (error) {
    console.error('Error creating Trackman courses table:', error);
    throw error;
  }
}

async function importTrackmanCourses() {
  try {
    // Read the CSV file
    const csvData = fs.readFileSync('Competition Courses - Trackman.csv', 'utf8');
    const lines = csvData.split('\n');
    
    // Skip header row (first line is "Trackman")
    const dataLines = lines.slice(1);
    
    console.log(`Found ${dataLines.length} courses to import`);
    
    // Clear existing data
    await pool.query('DELETE FROM trackman_courses');
    console.log('Cleared existing Trackman courses data');
    
    let importedCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i].trim();
      if (!line) continue;
      
      try {
        // Remove quotes if present
        const courseName = line.replace(/^"|"$/g, '');
        
        if (!courseName) {
          console.warn(`Skipping line ${i + 2}: empty course name`);
          errorCount++;
          continue;
        }
        
        // Insert the course data
        await pool.query(`
          INSERT INTO trackman_courses (name) VALUES ($1)
        `, [courseName]);
        
        importedCount++;
        
        if (importedCount % 50 === 0) {
          console.log(`Imported ${importedCount} courses...`);
        }
        
      } catch (error) {
        console.error(`Error importing line ${i + 2}:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`\nImport completed!`);
    console.log(`Successfully imported: ${importedCount} courses`);
    console.log(`Errors: ${errorCount} lines`);
    
    // Get some statistics
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_courses
      FROM trackman_courses
    `);
    
    console.log('\nDatabase Statistics:');
    console.log(`Total courses: ${stats.rows[0].total_courses}`);
    
  } catch (error) {
    console.error('Error importing Trackman courses:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('Starting Trackman courses import...');
    
    // Create the table
    await createTrackmanCoursesTable();
    
    // Import the data
    await importTrackmanCourses();
    
    console.log('Trackman courses import completed successfully!');
  } catch (error) {
    console.error('Failed to import Trackman courses:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the import if this script is executed directly
if (require.main === module) {
  main();
}

module.exports = { createTrackmanCoursesTable, importTrackmanCourses }; 