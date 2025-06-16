const express = require('express');
const app = express();
const port = process.env.PORT || 4000;
app.use(express.json());

// Sample players with ranking calculated from handicap
const players = [
  { id: 1, name: 'John Smith', email: 'john@email.com', handicap: 12, totalEvents: 15, avgScore: 78 },
  { id: 2, name: 'Mike Johnson', email: 'mike@email.com', handicap: 8, totalEvents: 12, avgScore: 74 },
  { id: 3, name: 'Dave Wilson', email: 'dave@email.com', handicap: 15, totalEvents: 18, avgScore: 82 },
  { id: 4, name: 'Tom Brown', email: 'tom@email.com', handicap: 10, totalEvents: 10, avgScore: 76 }
];

function calcRanking(handicap) {
  if (handicap <= 5) return 'A';
  if (handicap <= 10) return 'B';
  if (handicap <= 15) return 'C';
  return 'D';
}

players.forEach(p => { p.ranking = calcRanking(p.handicap); });

const pastEvents = [];

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

function generateTeams(playerIds) {
  const eligible = players.filter(p => playerIds.includes(p.id));
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

  // update history
  pastEvents.push({ teams: best.map(t => t.map(p => p.id)) });

  return best;
}

app.post('/api/pairings', (req, res) => {
  const ids = req.body.playerIds;
  if (!Array.isArray(ids)) return res.status(400).json({ error: 'playerIds required' });
  const teams = generateTeams(ids);
  res.json({ teams });
});

app.get('/api/players', (req, res) => {
  res.json(players);
});

app.listen(port, () => console.log(`Server listening on ${port}`));
