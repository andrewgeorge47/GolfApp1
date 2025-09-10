const { Pool } = require('pg');

// PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function addParticipantCountColumn() {
  try {
    console.log('Adding participant_count column to club_groups table...');
    
    // Add the column if it doesn't exist
    await pool.query(`
      ALTER TABLE club_groups 
      ADD COLUMN IF NOT EXISTS participant_count INTEGER DEFAULT 0;
    `);
    
    console.log('✅ Successfully added participant_count column to club_groups table');
    
    // Add comment for the column
    await pool.query(`
      COMMENT ON COLUMN club_groups.participant_count IS 'Actual number of participants in this group';
    `);
    
    console.log('✅ Added comment for participant_count column');
    
  } catch (error) {
    console.error('❌ Error adding participant_count column:', error);
  } finally {
    await pool.end();
  }
}

addParticipantCountColumn();
