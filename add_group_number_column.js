require('dotenv').config();
const { Pool } = require('pg');

// Always use SSL for cloud Postgres compatibility
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function addGroupNumberColumn() {
  const client = await pool.connect();
  
  try {
    console.log('Adding group_number column to tournament_matches table...');
    
    // Check if the column already exists
    const { rows: columnCheck } = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'tournament_matches' 
      AND column_name = 'group_number'
    `);
    
    if (columnCheck.length === 0) {
      console.log('Adding group_number column...');
      await client.query(`
        ALTER TABLE tournament_matches
        ADD COLUMN group_number INTEGER
      `);
      console.log('✅ Successfully added group_number column to tournament_matches table');
    } else {
      console.log('✅ group_number column already exists in tournament_matches table');
    }
    
    // Verify the column was added
    const { rows: verifyCheck } = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'tournament_matches' 
      AND column_name = 'group_number'
    `);
    
    if (verifyCheck.length > 0) {
      console.log(`✅ Verified: group_number column exists with type ${verifyCheck[0].data_type}`);
    } else {
      console.log('❌ group_number column was not found after adding');
    }
    
  } catch (error) {
    console.error('Error adding group_number column:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
addGroupNumberColumn()
  .then(() => {
    console.log('Group number column migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Group number column migration failed:', error);
    process.exit(1);
  }); 