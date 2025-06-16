import express from 'express';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = process.env.PORT || 4000;
const DATA_FILE = './data.json';

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

// Player CRUD
app.get('/players', (req, res) => {
  const data = readData();
  res.json(data.players);
});

app.post('/players', (req, res) => {
  const data = readData();
  const player = { id: uuidv4(), ...req.body };
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
