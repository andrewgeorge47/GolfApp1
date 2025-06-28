const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function cleanupDuplicates() {
  try {
    console.log('=== Truncating scorecards table ===');
    await pool.query('TRUNCATE scorecards RESTART IDENTITY CASCADE');
    console.log('All scorecards deleted and ID counter reset.');
  } catch (error) {
    console.error('Error truncating scorecards table:', error);
  } finally {
    await pool.end();
  }
}

cleanupDuplicates(); 