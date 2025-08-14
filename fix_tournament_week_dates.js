const { Pool } = require('pg');

// Database connection configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost/golf_league',
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// Helper function to get the correct Monday of the week containing a given date
function getCorrectWeekStartFromDate(dateString) {
  const date = new Date(dateString);
  
  // For tournament purposes, we want to ensure we get the Monday of the week
  // that contains the tournament dates, not necessarily the Monday of the week
  // containing the start date if it falls on a weekend
  
  // If the start date is Saturday or Sunday, we want the Monday of the NEXT week
  // If it's Monday-Friday, we want the Monday of the current week
  const day = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  let diff;
  if (day === 0) { // Sunday
    // For Sunday, go forward to next Monday (not backward to previous Monday)
    diff = 1;
  } else if (day === 6) { // Saturday
    // For Saturday, go forward to next Monday
    diff = 2;
  } else {
    // For Monday-Friday, go back to Monday of current week
    diff = date.getDate() - day + 1;
  }
  
  const monday = new Date(date);
  monday.setDate(diff);
  
  // Format as YYYY-MM-DD
  const year = monday.getFullYear();
  const month = String(monday.getMonth() + 1).padStart(2, '0');
  const dayOfMonth = String(monday.getDate()).padStart(2, '0');
  const result = `${year}-${month}-${dayOfMonth}`;
  
  return result;
}

async function fixTournamentWeekDates() {
  try {
    console.log('=== FIXING TOURNAMENT WEEK START DATES ===');
    
    // Get all tournaments with their current week_start_date
    const tournamentsResult = await pool.query(
      `SELECT id, name, start_date, end_date, week_start_date 
       FROM tournaments 
       WHERE start_date IS NOT NULL 
       ORDER BY id`,
      []
    );
    
    console.log(`Found ${tournamentsResult.rows.length} tournaments to check`);
    
    let fixedCount = 0;
    
    for (const tournament of tournamentsResult.rows) {
      console.log(`\n--- Tournament: ${tournament.name} (ID: ${tournament.id}) ---`);
      console.log(`  Start date: ${tournament.start_date}`);
      console.log(`  End date: ${tournament.end_date}`);
      console.log(`  Current week_start_date: ${tournament.week_start_date}`);
      
      // Calculate the correct week start date
      const correctWeekStart = getCorrectWeekStartFromDate(tournament.start_date);
      console.log(`  Correct week_start_date: ${correctWeekStart}`);
      
      // Check if the current week_start_date is incorrect
      if (tournament.week_start_date !== correctWeekStart) {
        console.log(`  ❌ INCORRECT - needs to be updated`);
        
        // Update the tournament
        const updateResult = await pool.query(
          `UPDATE tournaments 
           SET week_start_date = $1, updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [correctWeekStart, tournament.id]
        );
        
        if (updateResult.rowCount > 0) {
          console.log(`  ✅ Updated week_start_date to ${correctWeekStart}`);
          fixedCount++;
        } else {
          console.log(`  ❌ Failed to update tournament`);
        }
      } else {
        console.log(`  ✅ CORRECT - no update needed`);
      }
    }
    
    console.log(`\n=== COMPLETED TOURNAMENT WEEK DATE FIXES ===`);
    console.log(`Total tournaments checked: ${tournamentsResult.rows.length}`);
    console.log(`Tournaments fixed: ${fixedCount}`);
    
    if (fixedCount > 0) {
      console.log(`\n⚠️  IMPORTANT: After fixing tournament week dates, you should:`);
      console.log(`1. Clean up any duplicate matches that may have been created`);
      console.log(`2. Recalculate matches for the corrected weeks`);
      console.log(`3. Update leaderboards`);
    }
    
  } catch (err) {
    console.error('Error fixing tournament week dates:', err);
  }
}

async function main() {
  try {
    await fixTournamentWeekDates();
    console.log('Week date fixes completed successfully');
  } catch (err) {
    console.error('Week date fixes failed:', err);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main();
}

module.exports = { fixTournamentWeekDates, getCorrectWeekStartFromDate }; 