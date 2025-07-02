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
    console.log('Running migration to add created_at column to users table...');
    
    // Read the SQL migration file
    const sql = fs.readFileSync('add_created_at_to_users.sql', 'utf8');
    // Split by semicolon, filter out empty statements
    const statements = sql.split(';').map(s => s.trim()).filter(Boolean);
    
    for (const statement of statements) {
      if (statement) {
        await pool.query(statement);
      }
    }
    
    console.log('Migration completed successfully!');
    
    // Verify the column was added
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'created_at'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ created_at column successfully added to users table');
    } else {
      console.log('❌ created_at column not found in users table');
    }
    
  } catch (error) {
    console.error('Error running migration:', error);
  } finally {
    await pool.end();
  }
}

// Run the migration
runMigration().catch(console.error); 