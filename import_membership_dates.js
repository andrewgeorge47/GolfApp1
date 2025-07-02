require('dotenv').config();
const fs = require('fs');
const csv = require('csv-parser');
const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function importMembershipDates() {
  const results = [];
  
  // Read CSV file
  fs.createReadStream('NN_Users_MembershipDate.csv')
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      console.log(`Found ${results.length} membership records`);
      
      try {
        let updatedCount = 0;
        let notFoundCount = 0;
        
        for (const record of results) {
          const values = Object.values(record);
          const memberId = values[0]; // Member ID is the first column
          const joinDate = values[4]; // Join Date is the fifth column
          
          console.log(`Processing: Member ID = ${memberId}, Join Date = ${joinDate}`);
          
          if (!memberId || !joinDate) {
            console.log(`Skipping invalid record: ${JSON.stringify(record)}`);
            continue;
          }
          
          // Parse the date (format: M/D/YY)
          const [month, day, year] = joinDate.split('/');
          const fullYear = parseInt(year) < 50 ? 2000 + parseInt(year) : 1900 + parseInt(year);
          const formattedDate = `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          
          // Update the user's created_at field
          const query = `
            UPDATE users 
            SET created_at = $1::date 
            WHERE member_id = $2
          `;
          
          const result = await pool.query(query, [formattedDate, memberId]);
          
          if (result.rowCount > 0) {
            updatedCount++;
            console.log(`Updated member ${memberId} with join date ${formattedDate}`);
          } else {
            notFoundCount++;
            console.log(`Member ${memberId} not found in database`);
          }
        }
        
        console.log(`\nImport completed:`);
        console.log(`- Updated: ${updatedCount} users`);
        console.log(`- Not found: ${notFoundCount} users`);
        
      } catch (error) {
        console.error('Error importing membership dates:', error);
      } finally {
        await pool.end();
      }
    });
}

// Run the import
importMembershipDates().catch(console.error); 