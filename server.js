const express = require('express');
const app = express();
app.use(express.json());

// In-memory data structures
let teams = [
  { id: 1, name: 'Team 1', scores: [] },
  { id: 2, name: 'Team 2', scores: [] }
];
let closestToPinHole = null;
let closestToPinDistance = null;

function getLowestScores() {
  const holeCount = Math.max(...teams.map(t => t.scores.length));
  const lowest = [];
  for (let i = 0; i < holeCount; i++) {
    let min = Infinity;
    teams.forEach(t => {
      if (typeof t.scores[i] === 'number' && t.scores[i] < min) {
        min = t.scores[i];
      }
    });
    if (min !== Infinity) {
      lowest.push({ hole: i + 1, score: min });
    }
  }
  return lowest;
}

app.post('/team/:id/score', (req, res) => {
  const team = teams.find(t => t.id === parseInt(req.params.id));
  if (!team) return res.status(404).send('Team not found');
  const { hole, strokes } = req.body;
  if (typeof hole !== 'number' || typeof strokes !== 'number') {
    return res.status(400).send('Invalid payload');
  }
  team.scores[hole - 1] = strokes;
  res.json(team);
});

app.get('/skins', (req, res) => {
  const lowest = getLowestScores();
  res.json({ lowest });
});

app.post('/closest-to-pin', (req, res) => {
  const { hole, distance } = req.body;
  if (typeof hole !== 'number' || typeof distance !== 'number') {
    return res.status(400).send('Invalid payload');
  }
  closestToPinHole = hole;
  closestToPinDistance = distance;
  res.json({ hole: closestToPinHole, distance: closestToPinDistance });
});

app.get('/closest-to-pin', (req, res) => {
  res.json({ hole: closestToPinHole, distance: closestToPinDistance });
});

app.listen(4000, () => console.log('Server running on port 4000'));
