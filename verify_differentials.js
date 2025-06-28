const { Pool } = require('pg');
const csv = require('csv-parser');
const fs = require('fs');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// USGA differential calculation formula
function calculateDifferential(score, courseRating, courseSlope) {
  return ((score - courseRating) * 113) / courseSlope;
}

async function verifyDifferentials() {
  try {
    console.log('=== Verifying Differential Calculations ===\n');
    
    // First, let's check the structure of the scores data
    const { rows: sampleScorecard } = await pool.query(`
      SELECT scores, course_rating, course_slope, differential, player_name, course_name
      FROM scorecards 
      WHERE differential IS NOT NULL 
      LIMIT 1
    `);
    
    console.log('Sample scorecard structure:');
    console.log(JSON.stringify(sampleScorecard[0], null, 2));
    
    // Now let's verify some differentials from the CSV data
    console.log('\n=== Verifying from CSV Data ===');
    
    const results = [];
    fs.createReadStream('NN_Handicaps.csv')
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        console.log(`\nChecking first 10 records from CSV:`);
        console.log('Player\t\tScore\tRating\tSlope\tStored Diff\tCalculated Diff\tMatch?');
        console.log('------\t\t-----\t------\t-----\t-----------\t---------------\t------');
        
        let matchCount = 0;
        let totalCount = 0;
        
        for (let i = 0; i < Math.min(50, results.length); i++) {
          const record = results[i];
          const score = parseFloat(record['Total Score']);
          const rating = parseFloat(record['Rating of Course/Tees - generally ranges from the high 60\'s to low 70\'s']);
          const slope = parseFloat(record['Slope of Course/Tees - generally ranges from 120-140']);
          const storedDiff = parseFloat(record['Differential']);
          
          if (score && rating && slope && storedDiff) {
            const calculatedDiff = calculateDifferential(score, rating, slope);
            const matches = Math.abs(storedDiff - calculatedDiff) < 0.01;
            
            console.log(
              `${record['First Name']} ${record['Last Name']}\t` +
              `${score}\t` +
              `${rating}\t` +
              `${slope}\t` +
              `${storedDiff.toFixed(2)}\t\t` +
              `${calculatedDiff.toFixed(2)}\t\t` +
              `${matches ? '✓' : '✗'}`
            );
            
            if (matches) matchCount++;
            totalCount++;
          }
        }
        
        console.log(`\n=== Summary ===`);
        console.log(`Total verified: ${totalCount}`);
        console.log(`Matching calculations: ${matchCount}`);
        console.log(`Accuracy: ${((matchCount / totalCount) * 100).toFixed(1)}%`);
        
        if (matchCount < totalCount) {
          console.log(`\n⚠️  Found ${totalCount - matchCount} differentials that don't match the USGA formula!`);
        } else {
          console.log(`\n✅ All differentials are calculated correctly using the USGA formula!`);
        }
        
        await pool.end();
      });
    
  } catch (error) {
    console.error('Error verifying differentials:', error);
    await pool.end();
  }
}

verifyDifferentials(); 