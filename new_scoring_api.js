// New Scoring System API Implementation
// This implements the backend logic for the new 9-hole scoring format

// Helper function to get week start date (Monday)
function getWeekStartDate(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  return new Date(d.setDate(diff)).toISOString().split('T')[0];
}

// Helper function to calculate hole-level points
function calculateHolePoints(player1Scores, player2Scores) {
  let player1HolePoints = 0;
  let player2HolePoints = 0;
  
  for (let i = 0; i < 9; i++) {
    const p1Score = player1Scores[i];
    const p2Score = player2Scores[i];
    
    if (p1Score < p2Score) {
      player1HolePoints += 0.5; // Hole win = 0.5 points
    } else if (p2Score < p1Score) {
      player2HolePoints += 0.5; // Hole win = 0.5 points
    }
    // Tie = 0 points for both
  }
  
  return { player1HolePoints, player2HolePoints };
}

// Helper function to calculate round-level points
function calculateRoundPoints(player1Scores, player2Scores) {
  const rounds = [
    { start: 0, end: 3, name: 'round1' }, // Holes 1-3
    { start: 3, end: 6, name: 'round2' }, // Holes 4-6
    { start: 6, end: 9, name: 'round3' }  // Holes 7-9
  ];
  
  const roundPoints = {
    round1: { player1: 0, player2: 0 },
    round2: { player1: 0, player2: 0 },
    round3: { player1: 0, player2: 0 }
  };
  
  rounds.forEach(round => {
    let player1Wins = 0;
    let player2Wins = 0;
    
    for (let i = round.start; i < round.end; i++) {
      if (player1Scores[i] < player2Scores[i]) {
        player1Wins++;
      } else if (player2Scores[i] < player1Scores[i]) {
        player2Wins++;
      }
    }
    
    // Round scoring: Win = 1, Tie = 0.5, Loss = 0
    if (player1Wins > player2Wins) {
      roundPoints[round.name].player1 = 1;
      roundPoints[round.name].player2 = 0;
    } else if (player2Wins > player1Wins) {
      roundPoints[round.name].player1 = 0;
      roundPoints[round.name].player2 = 1;
    } else {
      roundPoints[round.name].player1 = 0.5;
      roundPoints[round.name].player2 = 0.5;
    }
  });
  
  return roundPoints;
}

// Helper function to determine match winner
function determineMatchWinner(roundPoints) {
  let player1RoundsWon = 0;
  let player2RoundsWon = 0;
  let roundsTied = 0;
  
  Object.values(roundPoints).forEach(round => {
    if (round.player1 > round.player2) {
      player1RoundsWon++;
    } else if (round.player2 > round.player1) {
      player2RoundsWon++;
    } else {
      roundsTied++;
    }
  });
  
  // Match win conditions:
  // - Win 2 or more rounds, OR
  // - Win 1 round and tie the other 2
  if (player1RoundsWon >= 2 || (player1RoundsWon === 1 && roundsTied === 2)) {
    return 'player1';
  } else if (player2RoundsWon >= 2 || (player2RoundsWon === 1 && roundsTied === 2)) {
    return 'player2';
  } else {
    return 'tie';
  }
}

// Helper function to calculate live match bonus (DISABLED - no longer used)
function calculateLiveMatchBonus(matchWinner, isLive, maxLiveMatches = 3) {
  // Live bonus points are no longer awarded
  return 0;
}

// API Endpoint: Submit 9-hole scorecard
app.post('/api/tournaments/:id/weekly-scorecard', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { hole_scores, is_live = false, group_id = null } = req.body;
  
  try {
    // Validate tournament exists
    const tournamentResult = await pool.query(
      'SELECT * FROM tournaments WHERE id = $1',
      [id]
    );
    
    if (tournamentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    
    // Validate hole scores (must be 9 holes)
    if (!Array.isArray(hole_scores) || hole_scores.length !== 9) {
      return res.status(400).json({ error: 'Must provide exactly 9 hole scores' });
    }
    
    // For real-time scoring, allow partial submissions (some holes can be 0)
    // But validate that submitted scores are valid numbers >= 1
    const submittedScores = hole_scores.filter(score => score > 0);
    if (submittedScores.length === 0) {
      return res.status(400).json({ error: 'Must provide at least one valid hole score' });
    }
    
    if (!submittedScores.every(score => typeof score === 'number' && score >= 1)) {
      return res.status(400).json({ error: 'All submitted hole scores must be valid numbers >= 1' });
    }
    
    const totalScore = hole_scores.reduce((sum, score) => sum + score, 0);
    const weekStartDate = getWeekStartDate();
    
    // Check if player already submitted for this week
    const existingScorecard = await pool.query(
      'SELECT * FROM weekly_scorecards WHERE user_id = $1 AND tournament_id = $2 AND week_start_date = $3',
      [req.user.member_id, id, weekStartDate]
    );
    
    if (existingScorecard.rows.length > 0) {
      // For real-time scoring, allow updates to existing scorecard
      const existing = existingScorecard.rows[0];
      const existingScores = existing.hole_scores;
      
      // Merge new scores with existing scores (new scores take precedence)
      const mergedScores = existingScores.map((existingScore, index) => 
        hole_scores[index] > 0 ? hole_scores[index] : existingScore
      );
      
      const newTotalScore = mergedScores.reduce((sum, score) => sum + score, 0);
      
      // Update existing scorecard
      const { rows } = await pool.query(
        `UPDATE weekly_scorecards 
         SET hole_scores = $1, total_score = $2, is_live = $3, group_id = $4, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $5 AND tournament_id = $6 AND week_start_date = $7 RETURNING *`,
        [JSON.stringify(mergedScores), newTotalScore, is_live, group_id, req.user.member_id, id, weekStartDate]
      );
      
      // Trigger match calculations for this week
      await calculateWeeklyMatches(id, weekStartDate);
      
      // Update leaderboard to reflect new total points
      await updateWeeklyLeaderboard(id, weekStartDate);
      
      res.json(rows[0]);
      return;
    }
    
    // Insert scorecard
    const { rows } = await pool.query(
      `INSERT INTO weekly_scorecards 
       (user_id, tournament_id, week_start_date, hole_scores, total_score, is_live, group_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.user.member_id, id, weekStartDate, JSON.stringify(hole_scores), totalScore, is_live, group_id]
    );
    
    // Trigger match calculations for this week
    await calculateWeeklyMatches(id, weekStartDate);
    
    // Update leaderboard to reflect new total points
    await updateWeeklyLeaderboard(id, weekStartDate);
    
    res.json(rows[0]);
  } catch (err) {
    console.error('Error submitting weekly scorecard:', err);
    res.status(500).json({ error: 'Failed to submit scorecard' });
  }
});

// Helper function to canonicalize player pairs
// Always store the pair so that player1_id < player2_id
function canonicalizePair(a, b) {
  return a.user_id < b.user_id ? [a, b] : [b, a];
}

// Helper function to swap match stats when the pair is flipped
function swapMatchStats(stats) {
  return {
    player1HolePoints: stats.player2HolePoints,
    player2HolePoints: stats.player1HolePoints,
    roundPoints: {
      round1: { player1: stats.roundPoints.round1.player2, player2: stats.roundPoints.round1.player1 },
      round2: { player1: stats.roundPoints.round2.player2, player2: stats.roundPoints.round2.player1 },
      round3: { player1: stats.roundPoints.round3.player2, player2: stats.roundPoints.round3.player1 }
    },
    player1TotalPoints: stats.player2TotalPoints,
    player2TotalPoints: stats.player1TotalPoints,
    winnerId: stats.winnerId === null ? null
              : (stats.winnerId === stats.p1Id ? stats.p2Id : stats.p1Id),
  };
}

// Helper function to calculate all matches for a week
async function calculateWeeklyMatches(tournamentId, weekStartDate) {
  try {
    console.log(`=== CALCULATING WEEKLY MATCHES ===`);
    console.log(`Tournament ID: ${tournamentId}, Week: ${weekStartDate}`);
    
    // Get all scorecards for this tournament and week
    // Use DISTINCT ON to ensure one scorecard per user per week (latest)
    const scorecardsResult = await pool.query(
      `SELECT ws.*, u.first_name, u.last_name
       FROM (
         SELECT DISTINCT ON (tournament_id, week_start_date, user_id)
                *
         FROM weekly_scorecards
         WHERE tournament_id = $1 AND week_start_date = $2
         ORDER BY tournament_id, week_start_date, user_id, submitted_at DESC
       ) ws
       JOIN users u ON ws.user_id = u.member_id
       ORDER BY ws.user_id`,
      [tournamentId, weekStartDate]
    );
    
    const scorecards = scorecardsResult.rows;
    console.log(`Found ${scorecards.length} scorecards for tournament ${tournamentId}, week ${weekStartDate}`);
    
    if (scorecards.length < 2) {
      console.log('Not enough scorecards to calculate matches (need at least 2 players)');
      return;
    }
    
    // Generate all possible player pairs
    let matchCount = 0;
    for (let i = 0; i < scorecards.length; i++) {
      for (let j = i + 1; j < scorecards.length; j++) {
        let a = scorecards[i];
        let b = scorecards[j];
        
        // Skip self-matches (guardrail in code)
        if (a.user_id === b.user_id) {
          console.log(`Skipping self-match for user ${a.user_id}`);
          continue;
        }
        
        // Canonicalize the pair - ensure player1_id < player2_id
        const [player1, player2] = canonicalizePair(a, b);
        
        console.log(`\n--- Creating Match ${++matchCount} ---`);
        console.log(`Player 1: ${player1.first_name} ${player1.last_name} (${player1.user_id})`);
        console.log(`Player 2: ${player2.first_name} ${player2.last_name} (${player2.user_id})`);
        console.log(`Canonical order: ${player1.user_id} < ${player2.user_id}`);
        
        // Calculate match results using the canonical pair
        const player1Scores = player1.hole_scores;
        const player2Scores = player2.hole_scores;
        
        // For real-time scoring, only compare holes that both players have completed
        const commonHoles = [];
        for (let k = 0; k < 9; k++) {
          if (player1Scores[k] > 0 && player2Scores[k] > 0) {
            commonHoles.push({
              player1Score: player1Scores[k],
              player2Score: player2Scores[k],
              holeIndex: k
            });
          }
        }
        
        // Only calculate match if both players have at least 3 holes in common
        if (commonHoles.length < 3) {
          console.log(`Skipping match - only ${commonHoles.length} common holes (need at least 3)`);
          continue;
        }
        
        // Create arrays with only the common holes for comparison
        const player1CommonScores = player1Scores.map((score, k) => 
          commonHoles.some(ch => ch.holeIndex === k) ? score : 0
        );
        const player2CommonScores = player2Scores.map((score, k) => 
          commonHoles.some(ch => ch.holeIndex === k) ? score : 0
        );
        
        // Calculate hole points
        const { player1HolePoints, player2HolePoints } = calculateHolePoints(player1CommonScores, player2CommonScores);
        
        // Calculate round points
        const roundPoints = calculateRoundPoints(player1CommonScores, player2CommonScores);
        
        // Determine match winner
        const matchWinner = determineMatchWinner(roundPoints);
        
        // Determine winner ID
        let winnerId = null;
        if (matchWinner === 'player1') winnerId = player1.user_id;
        else if (matchWinner === 'player2') winnerId = player2.user_id;
        
        // Calculate total points (no live bonus)
        const player1TotalPoints = player1HolePoints + 
          roundPoints.round1.player1 + roundPoints.round2.player1 + roundPoints.round3.player1;
        
        const player2TotalPoints = player2HolePoints + 
          roundPoints.round1.player2 + roundPoints.round2.player2 + roundPoints.round3.player2;
        
        console.log(`Hole points: P1=${player1HolePoints}, P2=${player2HolePoints}`);
        console.log(`Round points: P1=${JSON.stringify(roundPoints)}, P2=${JSON.stringify(roundPoints)}`);
        console.log(`Total points: P1=${player1TotalPoints}, P2=${player2TotalPoints}`);
        console.log(`Match winner: ${matchWinner} (ID: ${winnerId})`);
        
        // Insert or update match with canonical player order
        try {
          console.log(`Inserting match with canonical order: player1_id=${player1.user_id}, player2_id=${player2.user_id}`);
          
          const result = await pool.query(
            `INSERT INTO weekly_matches 
             (tournament_id, week_start_date, player1_id, player2_id, 
              player1_scorecard_id, player2_scorecard_id,
              hole_points_player1, hole_points_player2,
              round1_points_player1, round1_points_player2,
              round2_points_player1, round2_points_player2,
              round3_points_player1, round3_points_player2,
              match_winner_id, match_live_bonus_player1, match_live_bonus_player2,
              total_points_player1, total_points_player2)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
             ON CONFLICT (tournament_id, week_start_date, player1_id, player2_id)
             DO UPDATE SET
               player1_scorecard_id = EXCLUDED.player1_scorecard_id,
               player2_scorecard_id = EXCLUDED.player2_scorecard_id,
               hole_points_player1 = EXCLUDED.hole_points_player1,
               hole_points_player2 = EXCLUDED.hole_points_player2,
               round1_points_player1 = EXCLUDED.round1_points_player1,
               round1_points_player2 = EXCLUDED.round1_points_player2,
               round2_points_player1 = EXCLUDED.round2_points_player1,
               round2_points_player2 = EXCLUDED.round2_points_player2,
               round3_points_player1 = EXCLUDED.round3_points_player1,
               round3_points_player2 = EXCLUDED.round3_points_player2,
               match_winner_id = EXCLUDED.match_winner_id,
               match_live_bonus_player1 = EXCLUDED.match_live_bonus_player1,
               match_live_bonus_player2 = EXCLUDED.match_live_bonus_player2,
               total_points_player1 = EXCLUDED.total_points_player1,
               total_points_player2 = EXCLUDED.total_points_player2
             RETURNING id`,
            [tournamentId, weekStartDate, player1.user_id, player2.user_id,
             player1.id, player2.id,
             player1HolePoints, player2HolePoints,
             roundPoints.round1.player1, roundPoints.round1.player2,
             roundPoints.round2.player1, roundPoints.round2.player2,
             roundPoints.round3.player1, roundPoints.round3.player2,
             winnerId, 0, 0,
             player1TotalPoints, player2TotalPoints]
          );
          
          console.log(`Match inserted/updated successfully. Match ID: ${result.rows[0]?.id || 'N/A'}`);
          
        } catch (insertError) {
          console.error(`Error inserting match between ${player1.first_name} and ${player2.first_name}:`, insertError);
          console.error('Insert error details:', insertError.message);
          console.error('Error code:', insertError.code);
          console.error('Error constraint:', insertError.constraint);
          console.error('Error detail:', insertError.detail);
          
          // Continue with other matches even if one fails
          continue;
        }
      }
    }
    
    console.log(`=== COMPLETED WEEKLY MATCH CALCULATION ===`);
    console.log(`Tournament ${tournamentId}, Week ${weekStartDate}: Created ${matchCount} matches`);
    
    // Update leaderboard
    await updateWeeklyLeaderboard(tournamentId, weekStartDate);
    
  } catch (err) {
    console.error('Error calculating weekly matches:', err);
  }
}

// Helper function to update weekly leaderboard
async function updateWeeklyLeaderboard(tournamentId, weekStartDate) {
  try {
    // Get all matches for this tournament and week
    const matchesResult = await pool.query(
      `SELECT * FROM weekly_matches 
       WHERE tournament_id = $1 AND week_start_date = $2`,
      [tournamentId, weekStartDate]
    );
    
    const matches = matchesResult.rows;
    
    // Get all players who participated
    const players = new Set();
    matches.forEach(match => {
      players.add(match.player1_id);
      players.add(match.player2_id);
    });
    
    // Calculate leaderboard for each player
    for (const playerId of players) {
      let totalHolePoints = 0;
      let totalRoundPoints = 0;
      let totalMatchBonus = 0;
      let matchesPlayed = 0;
      let matchesWon = 0;
      let matchesTied = 0;
      let matchesLost = 0;
      let liveMatchesPlayed = 0;
      
      matches.forEach(match => {
        if (match.player1_id === playerId) {
          totalHolePoints += parseFloat(match.hole_points_player1);
          totalRoundPoints += parseFloat(match.round1_points_player1) + 
                            parseFloat(match.round2_points_player1) + 
                            parseFloat(match.round3_points_player1);
          totalMatchBonus += parseFloat(match.match_live_bonus_player1);
          matchesPlayed++;
          
          if (match.match_winner_id === playerId) matchesWon++;
          else if (match.match_winner_id === null) matchesTied++;
          else matchesLost++;
          
          if (parseFloat(match.match_live_bonus_player1) > 0) liveMatchesPlayed++;
        } else if (match.player2_id === playerId) {
          totalHolePoints += parseFloat(match.hole_points_player2);
          totalRoundPoints += parseFloat(match.round1_points_player2) + 
                            parseFloat(match.round2_points_player2) + 
                            parseFloat(match.round3_points_player2);
          totalMatchBonus += parseFloat(match.match_live_bonus_player2);
          matchesPlayed++;
          
          if (match.match_winner_id === playerId) matchesWon++;
          else if (match.match_winner_id === null) matchesTied++;
          else matchesLost++;
          
          if (parseFloat(match.match_live_bonus_player2) > 0) liveMatchesPlayed++;
        }
      });
      
      const totalScore = totalHolePoints + totalRoundPoints;
      
      // Insert or update leaderboard entry
      await pool.query(
        `INSERT INTO weekly_leaderboards 
         (tournament_id, week_start_date, user_id, total_hole_points, total_round_points, 
          total_match_bonus, total_score, matches_played, matches_won, matches_tied, 
          matches_lost, live_matches_played)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (tournament_id, week_start_date, user_id)
         DO UPDATE SET
           total_hole_points = EXCLUDED.total_hole_points,
           total_round_points = EXCLUDED.total_round_points,
           total_match_bonus = EXCLUDED.total_match_bonus,
           total_score = EXCLUDED.total_score,
           matches_played = EXCLUDED.matches_played,
           matches_won = EXCLUDED.matches_won,
           matches_tied = EXCLUDED.matches_tied,
           matches_lost = EXCLUDED.matches_lost,
           live_matches_played = EXCLUDED.live_matches_played,
           updated_at = CURRENT_TIMESTAMP`,
        [tournamentId, weekStartDate, playerId, totalHolePoints, totalRoundPoints,
         totalMatchBonus, totalScore, matchesPlayed, matchesWon, matchesTied,
         matchesLost, liveMatchesPlayed]
      );
    }
  } catch (err) {
    console.error('Error updating weekly leaderboard:', err);
  }
}

// API Endpoint: Get weekly leaderboard
app.get('/api/tournaments/:id/weekly-leaderboard', async (req, res) => {
  const { id } = req.params;
  const { week_start_date } = req.query;
  
  try {
    const weekDate = week_start_date || getWeekStartDate();
    
    const { rows } = await pool.query(
      `SELECT wl.*, u.first_name, u.last_name, u.club
       FROM weekly_leaderboards wl
       JOIN users u ON wl.user_id = u.member_id
       WHERE wl.tournament_id = $1 AND wl.week_start_date = $2
       ORDER BY wl.total_score DESC, wl.total_hole_points DESC`,
      [id, weekDate]
    );
    
    res.json(rows);
  } catch (err) {
    console.error('Error fetching weekly leaderboard:', err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// API Endpoint: Get current player's weekly scorecard
app.get('/api/tournaments/:id/weekly-scorecard/current', async (req, res) => {
  const { id } = req.params;
  const { week_start_date } = req.query;
  
  try {
    const weekDate = week_start_date || getWeekStartDate();
    
    const { rows } = await pool.query(
      `SELECT * FROM weekly_scorecards 
       WHERE tournament_id = $1 AND week_start_date = $2 AND user_id = $3`,
      [id, weekDate, req.user.member_id]
    );
    
    if (rows.length > 0) {
      res.json(rows[0]);
    } else {
      res.json(null);
    }
  } catch (err) {
    console.error('Error fetching current player scorecard:', err);
    res.status(500).json({ error: 'Failed to fetch scorecard' });
  }
});

// API Endpoint: Get player's weekly matches
app.get('/api/tournaments/:id/weekly-matches/:userId', async (req, res) => {
  const { id, userId } = req.params;
  const { week_start_date } = req.query;
  
  try {
    const weekDate = week_start_date || getWeekStartDate();
    
    const { rows } = await pool.query(
      `SELECT wm.*, 
              u1.first_name as player1_first_name, u1.last_name as player1_last_name,
              u2.first_name as player2_first_name, u2.last_name as player2_last_name,
              ws1.hole_scores as player1_scores, ws2.hole_scores as player2_scores
       FROM weekly_matches wm
       JOIN users u1 ON wm.player1_id = u1.member_id
       JOIN users u2 ON wm.player2_id = u2.member_id
       JOIN weekly_scorecards ws1 ON wm.player1_scorecard_id = ws1.id
       JOIN weekly_scorecards ws2 ON wm.player2_scorecard_id = ws2.id
       WHERE wm.tournament_id = $1 AND wm.week_start_date = $2 
       AND (wm.player1_id = $3 OR wm.player2_id = $3)
       ORDER BY wm.created_at`,
      [id, weekDate, userId]
    );
    
    res.json(rows);
  } catch (err) {
    console.error('Error fetching weekly matches:', err);
    res.status(500).json({ error: 'Failed to fetch matches' });
  }
});

// API Endpoint: Get player's scorecard for a week
app.get('/api/tournaments/:id/weekly-scorecard/:userId', async (req, res) => {
  const { id, userId } = req.params;
  const { week_start_date } = req.query;
  
  try {
    const weekDate = week_start_date || getWeekStartDate();
    
    const { rows } = await pool.query(
      `SELECT ws.*, u.first_name, u.last_name, u.club
       FROM weekly_scorecards ws
       JOIN users u ON ws.user_id = u.member_id
       WHERE ws.tournament_id = $1 AND ws.week_start_date = $2 AND ws.user_id = $3`,
      [id, weekDate, userId]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Scorecard not found' });
    }
    
    res.json(rows[0]);
  } catch (err) {
    console.error('Error fetching weekly scorecard:', err);
    res.status(500).json({ error: 'Failed to fetch scorecard' });
  }
}); 