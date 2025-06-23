const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3001;
const dataFile = path.join(__dirname, 'data.json');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

// Helper function to read data
async function readData() {
  try {
    const data = await fs.readFile(dataFile, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist, return default structure
    return {
      players: [],
      matches: [],
      leaderboard: {},
      checkedInPlayers: [],
      matchQueue: [],
      currentMatchIndex: 0,
      lastUpdated: null
    };
  }
}

// Helper function to write data
async function writeData(data) {
  data.lastUpdated = new Date().toISOString();
  await fs.writeFile(dataFile, JSON.stringify(data, null, 2));
}

// API Routes

// Get all data
app.get('/api/data', async (req, res) => {
  try {
    const data = await readData();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read data' });
  }
});

// Add player
app.post('/api/players', async (req, res) => {
  try {
    const { playerName } = req.body;
    if (!playerName || typeof playerName !== 'string') {
      return res.status(400).json({ error: 'Player name is required' });
    }

    const data = await readData();
    
    if (data.players.includes(playerName)) {
      return res.status(400).json({ error: 'Player already exists' });
    }

    data.players.push(playerName);
    data.leaderboard[playerName] = { points: 0, matches: 0, wins: 0 };
    
    await writeData(data);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add player' });
  }
});

// Remove player
app.delete('/api/players/:playerName', async (req, res) => {
  try {
    const { playerName } = req.params;
    const data = await readData();
    
    data.players = data.players.filter(p => p !== playerName);
    data.checkedInPlayers = data.checkedInPlayers.filter(p => p !== playerName);
    delete data.leaderboard[playerName];
    data.matches = data.matches.filter(m => m.player1 !== playerName && m.player2 !== playerName);
    data.matchQueue = data.matchQueue.filter(m => m.player1 !== playerName && m.player2 !== playerName);
    
    await writeData(data);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove player' });
  }
});

// Toggle check-in
app.post('/api/checkin', async (req, res) => {
  try {
    const { playerName } = req.body;
    const data = await readData();
    
    if (data.checkedInPlayers.includes(playerName)) {
      data.checkedInPlayers = data.checkedInPlayers.filter(p => p !== playerName);
    } else {
      data.checkedInPlayers.push(playerName);
    }
    
    await writeData(data);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle check-in' });
  }
});

// Generate matches
app.post('/api/matches/generate', async (req, res) => {
  try {
    const data = await readData();
    
    if (data.checkedInPlayers.length < 2) {
      return res.status(400).json({ error: 'Need at least 2 players checked in' });
    }

    data.matchQueue = [];
    data.currentMatchIndex = 0;

    const playersCopy = [...data.checkedInPlayers];
    const minMatches = 3;
    const playerMatchCount = {};
    
    playersCopy.forEach(player => {
      playerMatchCount[player] = 0;
    });

    let attempts = 0;
    const maxAttempts = 1000;
    
    while (attempts < maxAttempts) {
      const needsMatches = playersCopy.filter(player => 
        playerMatchCount[player] < minMatches
      ).sort((a, b) => playerMatchCount[a] - playerMatchCount[b]);
      
      if (needsMatches.length < 2) break;
      
      let matched = false;
      for (let i = 0; i < needsMatches.length - 1; i++) {
        for (let j = i + 1; j < needsMatches.length; j++) {
          const player1 = needsMatches[i];
          const player2 = needsMatches[j];
          
          const alreadyMatched = data.matchQueue.some(match => 
            (match.player1 === player1 && match.player2 === player2) ||
            (match.player1 === player2 && match.player2 === player1)
          );
          
          if (!alreadyMatched) {
            data.matchQueue.push({
              player1,
              player2,
              status: 'pending',
              matchNumber: data.matchQueue.length + 1
            });
            playerMatchCount[player1]++;
            playerMatchCount[player2]++;
            matched = true;
            break;
          }
        }
        if (matched) break;
      }
      
      if (!matched) {
        const player1 = needsMatches[0];
        const player2 = needsMatches[1];
        data.matchQueue.push({
          player1,
          player2,
          status: 'pending',
          matchNumber: data.matchQueue.length + 1
        });
        playerMatchCount[player1]++;
        playerMatchCount[player2]++;
      }
      
      attempts++;
    }

    if (data.checkedInPlayers.length >= 4) {
      const extraMatches = Math.floor(data.checkedInPlayers.length / 2);
      for (let i = 0; i < extraMatches; i++) {
        const sortedPlayers = playersCopy.sort((a, b) => 
          playerMatchCount[a] - playerMatchCount[b]
        );
        
        if (sortedPlayers.length >= 2) {
          const player1 = sortedPlayers[0];
          const player2 = sortedPlayers[1];
          
          data.matchQueue.push({
            player1,
            player2,
            status: 'pending',
            matchNumber: data.matchQueue.length + 1
          });
          playerMatchCount[player1]++;
          playerMatchCount[player2]++;
        }
      }
    }

    await writeData(data);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate matches' });
  }
});

// Start match
app.post('/api/matches/start', async (req, res) => {
  try {
    const { matchIndex } = req.body;
    const data = await readData();
    
    if (matchIndex < data.matchQueue.length) {
      data.matchQueue.forEach((match, i) => {
        if (i === matchIndex) {
          match.status = 'active';
          data.currentMatchIndex = i;
        } else if (match.status === 'active') {
          match.status = 'pending';
        }
      });
      
      await writeData(data);
      res.json({ success: true, data });
    } else {
      res.status(400).json({ error: 'Invalid match index' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to start match' });
  }
});

// Record match
app.post('/api/matches/record', async (req, res) => {
  try {
    const { player1, player2, scores } = req.body;
    
    if (!player1 || !player2 || player1 === player2) {
      return res.status(400).json({ error: 'Please select two different players' });
    }

    if (!scores || !scores.p1 || !scores.p2) {
      return res.status(400).json({ error: 'Scores are required' });
    }

    const data = await readData();

    // Calculate match result
    let p1Wins = 0;
    let p2Wins = 0;
    const holeResults = [];

    for (let i = 0; i < 3; i++) {
      if (scores.p1[i] < scores.p2[i]) {
        p1Wins++;
        holeResults.push(`${player1} wins hole ${i + 1}`);
      } else if (scores.p2[i] < scores.p1[i]) {
        p2Wins++;
        holeResults.push(`${player2} wins hole ${i + 1}`);
      } else {
        holeResults.push(`Hole ${i + 1} tied`);
      }
    }

    let winner, points;
    if (p1Wins > p2Wins) {
      winner = player1;
      points = { [player1]: 3, [player2]: 0 };
    } else if (p2Wins > p1Wins) {
      winner = player2;
      points = { [player1]: 0, [player2]: 3 };
    } else {
      winner = 'Tie';
      points = { [player1]: 1, [player2]: 1 };
    }

    // Record match
    const match = {
      player1,
      player2,
      scores,
      winner,
      points,
      holeResults,
      timestamp: new Date().toLocaleString()
    };

    data.matches.unshift(match);

    // Update match queue status
    const queueMatch = data.matchQueue.find(m => 
      (m.player1 === player1 && m.player2 === player2) ||
      (m.player1 === player2 && m.player2 === player1)
    );
    if (queueMatch) {
      queueMatch.status = 'completed';
    }

    // Update leaderboard
    if (!data.leaderboard[player1]) {
      data.leaderboard[player1] = { points: 0, matches: 0, wins: 0 };
    }
    if (!data.leaderboard[player2]) {
      data.leaderboard[player2] = { points: 0, matches: 0, wins: 0 };
    }

    data.leaderboard[player1].points += points[player1];
    data.leaderboard[player1].matches++;
    if (winner === player1) data.leaderboard[player1].wins++;

    data.leaderboard[player2].points += points[player2];
    data.leaderboard[player2].matches++;
    if (winner === player2) data.leaderboard[player2].wins++;

    await writeData(data);
    res.json({ success: true, data, match });
  } catch (error) {
    res.status(500).json({ error: 'Failed to record match' });
  }
});

// Serve the HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

app.listen(port, () => {
  console.log(`Golf League Server running on http://localhost:${port}`);
}); 