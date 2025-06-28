const fs = require('fs');
const csv = require('csv-parser');
const { Pool } = require('pg');
require('dotenv').config();

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function fixImportedScores() {
  const results = [];
  
  // Read CSV file
  fs.createReadStream('NN_Handicaps.csv')
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      console.log(`Read ${results.length} records from CSV`);
      
      try {
        let updated = 0;
        let skipped = 0;
        let errors = 0;
        
        for (const record of results) {
          try {
            // Parse date
            const datePlayed = new Date(record['Date Played']);
            if (isNaN(datePlayed.getTime())) {
              console.log(`Invalid date for ${record['First Name']} ${record['Last Name']}: ${record['Date Played']}`);
              skipped++;
              continue;
            }
            
            // Find the scorecard by date, course name, and user name
            const { rows: scorecards } = await pool.query(
              `SELECT s.id, s.user_id, s.course_name, s.date_played, u.first_name, u.last_name 
               FROM scorecards s 
               JOIN users u ON s.user_id = u.member_id 
               WHERE s.date_played = $1 
               AND s.course_name = $2
               AND u.first_name ILIKE $3 
               AND u.last_name ILIKE $4`,
              [datePlayed.toISOString().split('T')[0], record['Name of Course Played'], record['First Name'], record['Last Name']]
            );
            
            if (scorecards.length === 0) {
              console.log(`No scorecard found for: ${record['First Name']} ${record['Last Name']} - ${record['Date Played']} - ${record['Name of Course Played']}`);
              skipped++;
              continue;
            }
            
            const scorecard = scorecards[0];
            const totalScore = parseInt(record['Total Score']) || 0;
            
            // Update the scorecard with the correct total_strokes
            await pool.query(
              'UPDATE scorecards SET total_strokes = $1 WHERE id = $2',
              [totalScore, scorecard.id]
            );
            
            updated++;
            console.log(`Updated: ${record['First Name']} ${record['Last Name']} - Scorecard ID: ${scorecard.id} - Total Score: ${totalScore}`);
            
          } catch (error) {
            console.error(`Error processing record for ${record['First Name']} ${record['Last Name']}:`, error.message);
            errors++;
          }
        }
        
        console.log('\n=== Fix Summary ===');
        console.log(`Total records processed: ${results.length}`);
        console.log(`Successfully updated: ${updated}`);
        console.log(`Skipped (no scorecard found): ${skipped}`);
        console.log(`Errors: ${errors}`);
        
      } catch (error) {
        console.error('Database error:', error);
      } finally {
        await pool.end();
      }
    });
}

// Run the fix
fixImportedScores().catch(console.error); 