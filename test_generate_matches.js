const { Pool } = require('pg');

// Use the same connection as the server
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function testGenerateMatches() {
  const tournamentId = 28;
  
  try {
    console.log('Testing generate matches for tournament', tournamentId);
    
    // First, check if club_groups exist
    const groupsResult = await pool.query(`
      SELECT cg.*, 
             ARRAY_AGG(u.member_id) as user_ids
      FROM club_groups cg
      JOIN participation p ON p.tournament_id = cg.tournament_id
      JOIN users u ON p.user_member_id = u.member_id AND u.club = ANY(cg.participating_clubs)
      WHERE cg.tournament_id = $1
      GROUP BY cg.id, cg.group_name, cg.participating_clubs, cg.min_participants, cg.participant_count
    `, [tournamentId]);
    
    console.log('Found groups:', groupsResult.rows.length);
    
    if (groupsResult.rows.length === 0) {
      console.log('No groups found');
      return;
    }
    
    // Test if club_championship_matches table exists
    try {
      await pool.query('SELECT 1 FROM club_championship_matches LIMIT 1');
      console.log('✅ club_championship_matches table exists');
    } catch (err) {
      console.log('❌ club_championship_matches table does not exist:', err.message);
      
      // Create the table
      console.log('Creating club_championship_matches table...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS club_championship_matches (
            id SERIAL PRIMARY KEY,
            tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
            club_group VARCHAR(100) NOT NULL,
            player1_id INTEGER NOT NULL REFERENCES users(member_id) ON DELETE CASCADE,
            player2_id INTEGER NOT NULL REFERENCES users(member_id) ON DELETE CASCADE,
            match_number INTEGER NOT NULL,
            player1_holes_won INTEGER DEFAULT 0,
            player2_holes_won INTEGER DEFAULT 0,
            player1_holes_lost INTEGER DEFAULT 0,
            player2_holes_lost INTEGER DEFAULT 0,
            player1_net_holes INTEGER DEFAULT 0,
            player2_net_holes INTEGER DEFAULT 0,
            winner_id INTEGER REFERENCES users(member_id) ON DELETE CASCADE,
            match_status VARCHAR(50) DEFAULT 'pending',
            match_date DATE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(tournament_id, club_group, player1_id, player2_id, match_number)
        );
      `);
      console.log('✅ Created club_championship_matches table');
    }
    
    // Now try to generate matches
    const groups = groupsResult.rows;
    const matches = [];
    
    for (const group of groups) {
      const userIds = group.user_ids;
      console.log(`Processing group ${group.group_name} with ${userIds.length} users:`, userIds);
      
      // Generate 3 matches for each group
      for (let matchNumber = 1; matchNumber <= 3; matchNumber++) {
        // Create round-robin style matches
        for (let i = 0; i < userIds.length; i++) {
          for (let j = i + 1; j < userIds.length; j++) {
            try {
              const matchResult = await pool.query(`
                INSERT INTO club_championship_matches (
                  tournament_id,
                  club_group,
                  player1_id,
                  player2_id,
                  match_number,
                  match_status
                ) VALUES ($1, $2, $3, $4, $5, 'pending')
                RETURNING *
              `, [tournamentId, group.group_name, userIds[i], userIds[j], matchNumber]);
              
              matches.push(matchResult.rows[0]);
              console.log(`✅ Created match: ${userIds[i]} vs ${userIds[j]} (Match ${matchNumber})`);
            } catch (err) {
              console.error(`❌ Error creating match:`, err.message);
            }
          }
        }
      }
    }
    
    console.log(`✅ Generated ${matches.length} matches for ${groups.length} groups`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

testGenerateMatches();

