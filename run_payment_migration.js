require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runPaymentMigration() {
  try {
    console.log('Running migration to add payment system to tournaments and participation tables...');
    
    // Read the SQL migration file
    const sql = fs.readFileSync('add_payment_system.sql', 'utf8');
    // Split by semicolon, filter out empty statements
    const statements = sql.split(';').map(s => s.trim()).filter(Boolean);
    
    for (const statement of statements) {
      if (statement) {
        await pool.query(statement);
      }
    }
    
    console.log('Payment system migration completed successfully!');
    
    // Verify the columns were added to tournaments table
    const tournamentResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'tournaments' AND column_name IN (
        'payment_organizer', 'payment_organizer_name', 'payment_venmo_url'
      )
    `);
    
    if (tournamentResult.rows.length === 3) {
      console.log('✅ All payment organizer columns successfully added to tournaments table');
    } else {
      console.log('❌ Some payment organizer columns not found in tournaments table');
      console.log('Found columns:', tournamentResult.rows.map(r => r.column_name));
      console.log('Expected 3 columns, found', tournamentResult.rows.length);
    }
    
    // Verify the columns were added to participation table
    const participationResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'participation' AND column_name IN (
        'payment_submitted', 'payment_method', 'payment_amount', 'payment_notes', 'payment_submitted_at'
      )
    `);
    
    if (participationResult.rows.length === 5) {
      console.log('✅ All payment tracking columns successfully added to participation table');
    } else {
      console.log('❌ Some payment tracking columns not found in participation table');
      console.log('Found columns:', participationResult.rows.map(r => r.column_name));
      console.log('Expected 5 columns, found', participationResult.rows.length);
    }
    
    // Check how many tournaments were updated with payment organizers
    const updateResult = await pool.query(`
      SELECT 
        COUNT(*) as total_tournaments_with_entry_fees,
        COUNT(CASE WHEN payment_organizer IS NOT NULL THEN 1 END) as tournaments_with_payment_organizer,
        COUNT(CASE WHEN payment_organizer = 'jeff' THEN 1 END) as jeff_tournaments,
        COUNT(CASE WHEN payment_organizer = 'adam' THEN 1 END) as adam_tournaments
      FROM tournaments 
      WHERE entry_fee > 0
    `);
    
    const stats = updateResult.rows[0];
    console.log('\n📊 Migration Summary:');
    console.log(`- Tournaments with entry fees: ${stats.total_tournaments_with_entry_fees}`);
    console.log(`- Tournaments with payment organizers: ${stats.tournaments_with_payment_organizer}`);
    console.log(`- Jeff tournaments: ${stats.jeff_tournaments}`);
    console.log(`- Adam tournaments: ${stats.adam_tournaments}`);
    
  } catch (error) {
    console.error('Error running payment migration:', error);
  } finally {
    await pool.end();
  }
}

// Run the migration
runPaymentMigration().catch(console.error); 