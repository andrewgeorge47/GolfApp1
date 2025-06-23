import express from 'express';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 4000;
const DATA_FILE = './data.json';

app.use(cors());
app.use(express.json());

function readData() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    return { players: [], events: [] };
  }
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Calculate ranking based on handicap
function calcRanking(handicap) {
  if (handicap <= 5) return 'A';
  if (handicap <= 10) return 'B';
  if (handicap <= 15) return 'C';
  return 'D';
}

// Team generation logic
function buildPairHistory(events) {
  const map = new Map();
  for (const ev of events) {
    for (const team of ev.teams || []) {
      for (let i = 0; i < team.length; i++) {
        for (let j = i + 1; j < team.length; j++) {
          const key = [team[i], team[j]].sort().join('-');
          map.set(key, (map.get(key) || 0) + 1);
        }
      }
    }
  }
  return map;
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function pairScore(teams, history) {
  let score = 0;
  for (const team of teams) {
    for (let i = 0; i < team.length; i++) {
      for (let j = i + 1; j < team.length; j++) {
        const key = [team[i].id, team[j].id].sort().join('-');
        score += history.get(key) || 0;
      }
    }
  }
  return score;
}

function generateTeams(playerIds, allPlayers, pastEvents) {
  const eligible = allPlayers.filter(p => playerIds.includes(p.id));
  const byRank = { A: [], B: [], C: [], D: [] };
  eligible.forEach(p => byRank[p.ranking].push(p));
  Object.values(byRank).forEach(shuffle);

  const numTeams = Math.ceil(eligible.length / 4) || 1;
  const teams = Array.from({ length: numTeams }, () => []);

  ['A', 'B', 'C', 'D'].forEach(rank => {
    byRank[rank].forEach((p, idx) => {
      teams[idx % numTeams].push(p);
    });
  });

  const history = buildPairHistory(pastEvents);
  let best = teams.map(t => t.slice());
  let bestScore = pairScore(best, history);

  for (let iter = 0; iter < 100; iter++) {
    const all = best.flat();
    shuffle(all);
    const newTeams = best.map(t => []);
    let idx = 0;
    best.forEach((t, i) => {
      for (let j = 0; j < t.length; j++) newTeams[i].push(all[idx++]);
    });
    const score = pairScore(newTeams, history);
    if (score < bestScore) {
      bestScore = score;
      best = newTeams;
    }
  }

  return best;
}

// Player CRUD
app.get('/api/players', (req, res) => {
  const data = readData();
  // Add ranking to each player if not present
  const playersWithRanking = data.players.map(player => ({
    ...player,
    ranking: player.ranking || calcRanking(player.handicap || 20)
  }));
  res.json(playersWithRanking);
});

app.post('/players', (req, res) => {
  const data = readData();
  const player = { 
    id: uuidv4(), 
    ...req.body,
    ranking: calcRanking(req.body.handicap || 20)
  };
  data.players.push(player);
  writeData(data);
  res.status(201).json(player);
});

app.get('/players/:id', (req, res) => {
  const data = readData();
  const player = data.players.find(p => p.id === req.params.id);
  if (!player) return res.status(404).send('Player not found');
  res.json(player);
});

app.put('/players/:id', (req, res) => {
  const data = readData();
  const idx = data.players.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).send('Player not found');
  data.players[idx] = { ...data.players[idx], ...req.body };
  writeData(data);
  res.json(data.players[idx]);
});

app.delete('/players/:id', (req, res) => {
  const data = readData();
  const idx = data.players.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).send('Player not found');
  const removed = data.players.splice(idx, 1)[0];
  writeData(data);
  res.json(removed);
});

// Events
app.get('/events', (req, res) => {
  const data = readData();
  res.json(data.events);
});

app.post('/events', (req, res) => {
  const data = readData();
  const event = { id: uuidv4(), date: req.body.date, teeTime: req.body.teeTime, signedUp: [], teams: [] };
  data.events.push(event);
  writeData(data);
  res.status(201).json(event);
});

app.get('/events/:id', (req, res) => {
  const data = readData();
  const event = data.events.find(e => e.id === req.params.id);
  if (!event) return res.status(404).send('Event not found');
  res.json(event);
});

// Sign up a player for an event
app.post('/events/:id/signup', (req, res) => {
  const { playerId } = req.body;
  const data = readData();
  const event = data.events.find(e => e.id === req.params.id);
  if (!event) return res.status(404).send('Event not found');
  if (!data.players.some(p => p.id === playerId)) return res.status(400).send('Invalid player');
  if (!event.signedUp.includes(playerId)) {
    event.signedUp.push(playerId);
    writeData(data);
  }
  res.json(event);
});

// Remove signup
app.delete('/events/:id/signup/:playerId', (req, res) => {
  const data = readData();
  const event = data.events.find(e => e.id === req.params.id);
  if (!event) return res.status(404).send('Event not found');
  event.signedUp = event.signedUp.filter(id => id !== req.params.playerId);
  writeData(data);
  res.json(event);
});

// Form teams (simple random groups of 4)
app.post('/events/:id/form-teams', (req, res) => {
  const data = readData();
  const event = data.events.find(e => e.id === req.params.id);
  if (!event) return res.status(404).send('Event not found');
  const players = event.signedUp.slice();
  // shuffle
  for (let i = players.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [players[i], players[j]] = [players[j], players[i]];
  }
  const teams = [];
  for (let i = 0; i < players.length; i += 4) {
    teams.push(players.slice(i, i + 4));
  }
  event.teams = teams;
  writeData(data);
  res.json(event);
});

// Team generation endpoint
app.post('/api/pairings', (req, res) => {
  const { playerIds } = req.body;
  if (!Array.isArray(playerIds)) {
    return res.status(400).json({ error: 'playerIds required' });
  }
  
  const data = readData();
  const teams = generateTeams(playerIds, data.players, data.events);
  res.json({ teams });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
