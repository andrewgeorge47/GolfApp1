const fs = require('fs');
const { Pool } = require('pg');
require('dotenv').config();

// PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function createGsproCoursesTable() {
  try {
    // Create the GSPro courses table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS gspro_courses (
        id SERIAL PRIMARY KEY,
        server VARCHAR(100),
        name VARCHAR(255) NOT NULL,
        updated_date DATE,
        location VARCHAR(255),
        designer VARCHAR(255),
        elevation INTEGER,
        is_par3 BOOLEAN DEFAULT FALSE,
        is_beginner BOOLEAN DEFAULT FALSE,
        is_coastal BOOLEAN DEFAULT FALSE,
        is_desert BOOLEAN DEFAULT FALSE,
        is_fantasy BOOLEAN DEFAULT FALSE,
        is_heathland BOOLEAN DEFAULT FALSE,
        is_historic BOOLEAN DEFAULT FALSE,
        is_links BOOLEAN DEFAULT FALSE,
        is_lowpoly BOOLEAN DEFAULT FALSE,
        is_major_venue BOOLEAN DEFAULT FALSE,
        is_mountain BOOLEAN DEFAULT FALSE,
        is_parkland BOOLEAN DEFAULT FALSE,
        is_tour_stop BOOLEAN DEFAULT FALSE,
        is_training BOOLEAN DEFAULT FALSE,
        is_tropical BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for better performance
    await pool.query('CREATE INDEX IF NOT EXISTS idx_gspro_courses_name ON gspro_courses(name)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_gspro_courses_location ON gspro_courses(location)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_gspro_courses_designer ON gspro_courses(designer)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_gspro_courses_server ON gspro_courses(server)');

    console.log('GSPro courses table created successfully');
  } catch (error) {
    console.error('Error creating GSPro courses table:', error);
    throw error;
  }
}

function parseDate(dateString) {
  if (!dateString || dateString.trim() === '') return null;
  
  // Handle various date formats
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return null;
  
  return date.toISOString().split('T')[0]; // Return YYYY-MM-DD format
}

function parseElevation(elevationString) {
  if (!elevationString || elevationString.trim() === '') return null;
  
  // Remove commas and convert to integer
  const cleanElevation = elevationString.replace(/,/g, '');
  const elevation = parseInt(cleanElevation);
  
  return isNaN(elevation) ? null : elevation;
}

function parseBoolean(value) {
  return value === 'Y' || value === 'y' || value === 'true' || value === '1';
}

async function importGsproCourses() {
  try {
    // Read the CSV file
    const csvData = fs.readFileSync('gspromastercourselist.csv', 'utf8');
    const lines = csvData.split('\n');
    
    // Skip header row
    const dataLines = lines.slice(1);
    
    console.log(`Found ${dataLines.length} courses to import`);
    
    // Clear existing data
    await pool.query('DELETE FROM gspro_courses');
    console.log('Cleared existing GSPro courses data');
    
    let importedCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i].trim();
      if (!line) continue;
      
      try {
        // Parse CSV line (handling quoted fields)
        const fields = [];
        let currentField = '';
        let inQuotes = false;
        
        for (let j = 0; j < line.length; j++) {
          const char = line[j];
          
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            fields.push(currentField.trim());
            currentField = '';
          } else {
            currentField += char;
          }
        }
        fields.push(currentField.trim()); // Add the last field
        
        // Remove quotes from fields
        const cleanFields = fields.map(field => field.replace(/^"|"$/g, ''));
        
        if (cleanFields.length < 21) {
          console.warn(`Skipping line ${i + 2}: insufficient fields (${cleanFields.length})`);
          errorCount++;
          continue;
        }
        
        const [
          server, name, updated, location, designer, elevation,
          par3, beginner, coastal, desert, fantasy, heathland,
          historic, links, lowpoly, majorVenue, mountain, parkland,
          tourStop, training, tropical
        ] = cleanFields;
        
        // Insert the course data
        await pool.query(`
          INSERT INTO gspro_courses (
            server, name, updated_date, location, designer, elevation,
            is_par3, is_beginner, is_coastal, is_desert, is_fantasy, is_heathland,
            is_historic, is_links, is_lowpoly, is_major_venue, is_mountain, is_parkland,
            is_tour_stop, is_training, is_tropical
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
        `, [
          server || null,
          name || 'Unknown Course',
          parseDate(updated),
          location || null,
          designer || null,
          parseElevation(elevation),
          parseBoolean(par3),
          parseBoolean(beginner),
          parseBoolean(coastal),
          parseBoolean(desert),
          parseBoolean(fantasy),
          parseBoolean(heathland),
          parseBoolean(historic),
          parseBoolean(links),
          parseBoolean(lowpoly),
          parseBoolean(majorVenue),
          parseBoolean(mountain),
          parseBoolean(parkland),
          parseBoolean(tourStop),
          parseBoolean(training),
          parseBoolean(tropical)
        ]);
        
        importedCount++;
        
        if (importedCount % 100 === 0) {
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
        COUNT(*) as total_courses,
        COUNT(DISTINCT server) as unique_servers,
        COUNT(DISTINCT designer) as unique_designers,
        COUNT(DISTINCT location) as unique_locations
      FROM gspro_courses
    `);
    
    console.log('\nDatabase Statistics:');
    console.log(`Total courses: ${stats.rows[0].total_courses}`);
    console.log(`Unique servers: ${stats.rows[0].unique_servers}`);
    console.log(`Unique designers: ${stats.rows[0].unique_designers}`);
    console.log(`Unique locations: ${stats.rows[0].unique_locations}`);
    
  } catch (error) {
    console.error('Error importing GSPro courses:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('Starting GSPro courses import...');
    
    // Create the table
    await createGsproCoursesTable();
    
    // Import the data
    await importGsproCourses();
    
    console.log('GSPro courses import completed successfully!');
  } catch (error) {
    console.error('Failed to import GSPro courses:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the import if this script is executed directly
if (require.main === module) {
  main();
}

module.exports = { createGsproCoursesTable, importGsproCourses }; 