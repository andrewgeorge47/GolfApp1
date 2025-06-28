const fs = require('fs');
const csv = require('csv-parser');
const { Pool } = require('pg');
require('dotenv').config();

// Database configuration - use the same approach as server.js
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function importHandicaps() {
  const results = [];
  
  // Read CSV file
  fs.createReadStream('NN_Handicaps.csv')
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      console.log(`Read ${results.length} records from CSV`);
      
      try {
        // Get all users from database
        const { rows: users } = await pool.query('SELECT member_id, first_name, last_name FROM users');
        console.log(`Found ${users.length} users in database`);
        
        let imported = 0;
        let skipped = 0;
        let errors = 0;
        
        for (const record of results) {
          try {
            // Find matching user by first and last name
            const user = users.find(u => 
              u.first_name?.toLowerCase() === record['First Name']?.toLowerCase() &&
              u.last_name?.toLowerCase() === record['Last Name']?.toLowerCase()
            );
            
            if (!user) {
              console.log(`No user found for: ${record['First Name']} ${record['Last Name']}`);
              skipped++;
              continue;
            }
            
            // Parse date
            const datePlayed = new Date(record['Date Played']);
            if (isNaN(datePlayed.getTime())) {
              console.log(`Invalid date for ${record['First Name']} ${record['Last Name']}: ${record['Date Played']}`);
              errors++;
              continue;
            }
            
            // Parse scores and other data
            const totalScore = parseInt(record['Total Score']) || 0;
            const differential = parseFloat(record['Differential']) || 0;
            
            // Parse course rating and slope from the long CSV header
            const courseRating = parseFloat(record["Rating of Course/Tees - generally ranges from the high 60's to low 70's"]) || null;
            const courseSlope = parseInt(record['Slope of Course/Tees - generally ranges from 120-140']) || null;
            
            // Check for existing scorecard with same timestamp (better duplicate detection)
            const existingCheck = await pool.query(
              'SELECT id FROM scorecards WHERE user_id = $1 AND csv_timestamp = $2',
              [user.member_id, record['Timestamp']]
            );

            if (existingCheck.rows.length > 0) {
              console.log(`Skipping duplicate for ${user.first_name} ${user.last_name} - ${record['Name of Course Played']} on ${datePlayed.toISOString().split('T')[0]}`);
              skipped++;
              continue;
            }
            
            // Insert the scorecard with all the new fields
            await pool.query(
              `INSERT INTO scorecards (
                user_id, type, player_name, date_played, handicap, scores, 
                teebox, course_rating, course_slope, software, course_name, 
                differential, csv_timestamp, round_type
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
              [
                user.member_id,
                'stroke_play', // Default type for imported rounds
                `${user.first_name} ${user.last_name}`,
                datePlayed.toISOString().split('T')[0],
                0, // Default handicap
                JSON.stringify({
                  course: record['Name of Course Played'],
                  holes: []
                }),
                record['Color of Tees Played'],
                courseRating,
                courseSlope,
                record['Software Played On'],
                record['Name of Course Played'],
                parseFloat(record['Differential']) || null,
                record['Timestamp'],
                'sim' // All imported rounds are simulator rounds
              ]
            );
            
            imported++;
            console.log(`Imported: ${record['First Name']} ${record['Last Name']} - ${record['Date Played']} - ${record['Name of Course Played']} - ${record['Color of Tees Played']} - Score: ${totalScore} - Differential: ${differential}`);
            
          } catch (error) {
            console.error(`Error processing record for ${record['First Name']} ${record['Last Name']}:`, error.message);
            errors++;
          }
        }
        
        console.log('\n=== Import Summary ===');
        console.log(`Total records processed: ${results.length}`);
        console.log(`Successfully imported: ${imported}`);
        console.log(`Skipped (no user match or duplicate): ${skipped}`);
        console.log(`Errors: ${errors}`);
        
      } catch (error) {
        console.error('Database error:', error);
      } finally {
        await pool.end();
      }
    });
}

// Run the import
importHandicaps().catch(console.error); 