require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  try {
    console.log('Running migration to add registration form fields to tournaments table...');
    
    // Read the SQL migration file
    const sql = fs.readFileSync('add_registration_form_fields.sql', 'utf8');
    
    // Execute the entire SQL file as one statement since it contains a DO block
    await pool.query(sql);
    
    console.log('Migration completed successfully!');
    
    // Verify the columns were added
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'tournaments' AND column_name IN (
        'has_registration_form', 'registration_form_template', 'registration_form_data'
      )
      ORDER BY column_name
    `);
    
    if (result.rows.length === 3) {
      console.log('✅ All registration form columns successfully added to tournaments table');
      console.log('Added columns:');
      result.rows.forEach(row => {
        console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable}, default: ${row.column_default})`);
      });
    } else {
      console.log('❌ Some columns not found in tournaments table');
      console.log('Found columns:', result.rows.map(r => r.column_name));
      console.log('Expected 3 columns, found', result.rows.length);
    }
    
  } catch (error) {
    console.error('Error running migration:', error);
  } finally {
    await pool.end();
  }
}

// Run the migration
runMigration().catch(console.error); 