const http = require('http');
const url = require('url');
const querystring = require('querystring');
require('dotenv').config();

const AIRTABLE_PERSONAL_ACCESS_TOKEN = process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const PORT = process.env.PORT || 3001;

// Validate required environment variables
if (!AIRTABLE_PERSONAL_ACCESS_TOKEN || !AIRTABLE_BASE_ID) {
    console.error('❌ Missing required environment variables:');
    console.error('   AIRTABLE_PERSONAL_ACCESS_TOKEN:', AIRTABLE_PERSONAL_ACCESS_TOKEN ? '✅ Set' : '❌ Missing');
    console.error('   AIRTABLE_BASE_ID:', AIRTABLE_BASE_ID ? '✅ Set' : '❌ Missing');
    console.error('Please set these environment variables in your deployment platform.');
    process.exit(1);
}

const AIRTABLE_API_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}`;
const AIRTABLE_HEADERS = {
    'Authorization': `Bearer ${AIRTABLE_PERSONAL_ACCESS_TOKEN}`,
    'Content-Type': 'application/json'
};

console.log('🔍 Environment check:');
console.log(`   PORT: ${PORT}`);
console.log(`   AIRTABLE_BASE_ID: ${AIRTABLE_BASE_ID}`);
console.log(`   AIRTABLE_PERSONAL_ACCESS_TOKEN: ${AIRTABLE_PERSONAL_ACCESS_TOKEN ? '✅ Present' : '❌ Missing'}`);

// Helper function to make Airtable API calls
async function airtableRequest(endpoint, options = {}) {
    const url = `${AIRTABLE_API_URL}${endpoint}`;
    const config = {
        headers: AIRTABLE_HEADERS,
        ...options
    };

    try {
        console.log(`Making Airtable request to: ${endpoint}`);
        const response = await fetch(url, config);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error(`Airtable API Error (${endpoint}):`, {
                status: response.status,
                statusText: response.statusText,
                error: errorData
            });
            throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`Airtable request successful (${endpoint}):`, data.records?.length || 0, 'records');
        return data;
    } catch (error) {
        console.error(`Airtable API Error (${endpoint}):`, error);
        throw error;
    }
}

// Helper to fetch and expand linked records from Airtable
async function airtableRequestExpand(endpoint, expandFields = []) {
    let url = endpoint;
    if (expandFields.length > 0) {
        const expandParam = expandFields.map(f => `expand[]=${encodeURIComponent(f)}`).join('&');
        url += (url.includes('?') ? '&' : '?') + expandParam;
    }
    return await airtableRequest(url);
}

// Get all users (for user selection in frontend)
async function getUsers() {
    const response = await airtableRequest('/Users');
    return response.records.map(record => ({
        id: record.id,
        memberId: record.fields['Member ID'],
        firstName: record.fields['First Name'],
        lastName: record.fields['Last Name'],
        email: record.fields['Email Address'],
        club: record.fields['Club'],
        role: record.fields['Role'],
    }));
}

// Get all tournaments
async function getTournaments() {
    const response = await airtableRequest('/Tournaments');
    return response.records.map(record => ({
        id: record.id,
        name: record.fields.TournamentName,
        minMatches: record.fields.MinMatches,
        notes: record.fields.Notes,
        start: record.fields.Start,
        end: record.fields.End,
    }));
}

// Get all players (expanded with User and Tournament)
async function getPlayers() {
    const response = await airtableRequestExpand('/Players', ['User', 'Tournaments']);
    return response.records.map(record => {
        // Safely handle User field
        let user = null;
        if (record.fields.User && record.fields.User[0] && record.fields.User[0].fields) {
            const userFields = record.fields.User[0].fields;
            user = {
                id: record.fields.User[0].id,
                firstName: userFields['First Name'] || 'Unknown',
                lastName: userFields['Last Name'] || 'Unknown',
                email: userFields['Email Address'] || '',
            };
        }
        
        // Safely handle Tournaments field
        let tournament = null;
        if (record.fields.Tournaments && record.fields.Tournaments[0] && record.fields.Tournaments[0].fields) {
            const tournamentFields = record.fields.Tournaments[0].fields;
            tournament = {
                id: record.fields.Tournaments[0].id,
                name: tournamentFields.TournamentName || 'Unknown Tournament'
            };
        }
        
        return {
            id: record.id,
            playerID: record.fields.PlayerID || null,
            user: user,
            tournament: tournament,
        };
    });
}

// Get checked-in players (expanded)
async function getCheckedInPlayers() {
    const response = await airtableRequestExpand('/CheckedInPlayers', ['Player', 'Player.User']);
    return response.records.map(record => {
        const player = record.fields.Player && record.fields.Player[0];
        
        // Safely handle User field
        let user = null;
        if (player && player.fields.User && player.fields.User[0] && player.fields.User[0].fields) {
            const userFields = player.fields.User[0].fields;
            user = {
                id: player.fields.User[0].id,
                firstName: userFields['First Name'] || 'Unknown',
                lastName: userFields['Last Name'] || 'Unknown',
            };
        }
        
        return {
            id: record.id,
            playerID: player && player.fields.PlayerID ? player.fields.PlayerID : null,
            user: user,
            checkedInAt: record.fields.CheckedInAt
        };
    });
}

// Get match queue (expanded)
async function getMatchQueue() {
    const response = await airtableRequestExpand('/MatchQueue', ['Player1', 'Player2', 'Player1.User', 'Player2.User']);
    return response.records.map(record => {
        const p1 = record.fields.Player1 && record.fields.Player1[0];
        const p2 = record.fields.Player2 && record.fields.Player2[0];
        
        // Helper function to safely extract user info
        const extractUser = (player) => {
            if (player && player.fields.User && player.fields.User[0] && player.fields.User[0].fields) {
                const userFields = player.fields.User[0].fields;
                return {
                    id: player.fields.User[0].id,
                    firstName: userFields['First Name'] || 'Unknown',
                    lastName: userFields['Last Name'] || 'Unknown',
                };
            }
            return null;
        };
        
        return {
            id: record.id,
            player1: p1 ? {
                id: p1.id,
                playerID: p1.fields.PlayerID || null,
                user: extractUser(p1)
            } : null,
            player2: p2 ? {
                id: p2.id,
                playerID: p2.fields.PlayerID || null,
                user: extractUser(p2)
            } : null,
            status: record.fields.Status || 'pending',
            matchNumber: record.fields.MatchNumber || 0
        };
    });
}

// Get matches (expanded)
async function getMatches() {
    const response = await airtableRequestExpand('/Matches?sort[0][field]=PlayedAt&sort[0][direction]=desc', ['Player1', 'Player2', 'Player1.User', 'Player2.User']);
    return response.records.map(record => {
        let scores = {};
        let points = {};
        let holeResults = {};
        try { if (record.fields.Scores) scores = JSON.parse(record.fields.Scores); } catch (e) { scores = {}; }
        try { if (record.fields.Points) points = JSON.parse(record.fields.Points); } catch (e) { points = {}; }
        try { if (record.fields.HoleResults) holeResults = JSON.parse(record.fields.HoleResults); } catch (e) { holeResults = {}; }
        
        const p1 = record.fields.Player1 && record.fields.Player1[0];
        const p2 = record.fields.Player2 && record.fields.Player2[0];
        
        // Helper function to safely extract user info
        const extractUser = (player) => {
            if (player && player.fields.User && player.fields.User[0] && player.fields.User[0].fields) {
                const userFields = player.fields.User[0].fields;
                return {
                    id: player.fields.User[0].id,
                    firstName: userFields['First Name'] || 'Unknown',
                    lastName: userFields['Last Name'] || 'Unknown',
                };
            }
            return null;
        };
        
        return {
            id: record.id,
            player1: p1 ? {
                id: p1.id,
                playerID: p1.fields.PlayerID || null,
                user: extractUser(p1)
            } : null,
            player2: p2 ? {
                id: p2.id,
                playerID: p2.fields.PlayerID || null,
                user: extractUser(p2)
            } : null,
            scores,
            winner: record.fields.Winner || 'Unknown',
            points,
            holeResults,
            timestamp: record.fields.PlayedAt || new Date().toISOString()
        };
    });
}

// Get leaderboard (expanded)
async function getLeaderboard() {
    const response = await airtableRequestExpand('/Leaderboard', ['Player', 'Player.User']);
    return response.records.map(record => {
        const player = record.fields.Player && record.fields.Player[0];
        
        // Safely handle User field
        let user = null;
        if (player && player.fields.User && player.fields.User[0] && player.fields.User[0].fields) {
            const userFields = player.fields.User[0].fields;
            user = {
                id: player.fields.User[0].id,
                firstName: userFields['First Name'] || 'Unknown',
                lastName: userFields['Last Name'] || 'Unknown',
            };
        }
        
        return {
            id: record.id,
            player: player ? {
                id: player.id,
                playerID: player.fields.PlayerID || null,
                user: user
            } : null,
            points: record.fields.Points || 0,
            matches: record.fields.Matches || 0,
            wins: record.fields.Wins || 0
        };
    });
}

// Get tournament settings (first tournament for now)
async function getSettings() {
    const response = await airtableRequest('/Tournaments');
    if (response.records.length > 0) {
        return {
            tournamentName: response.records[0].fields.TournamentName || 'Golf League Tournament',
            minMatches: response.records[0].fields.MinMatches || 3,
            notes: response.records[0].fields.Notes || '',
            start: response.records[0].fields.Start || '',
            end: response.records[0].fields.End || ''
        };
    }
    return {
        tournamentName: 'Golf League Tournament',
        minMatches: 3,
        notes: '',
        start: '',
        end: ''
    };
}

// Helper function to update leaderboard
async function updateLeaderboard(playerName, points, isWinner) {
    try {
        const records = await airtableRequest(`/Leaderboard?filterByFormula={Player}='${encodeURIComponent(playerName)}'`);
        
        if (records.records.length > 0) {
            const record = records.records[0];
            const currentPoints = record.fields.Points || 0;
            const currentMatches = record.fields.Matches || 0;
            const currentWins = record.fields.Wins || 0;
            
            await airtableRequest('/Leaderboard', {
                method: 'PATCH',
                body: JSON.stringify({
                    records: [{
                        id: record.id,
                        fields: {
                            Points: currentPoints + points,
                            Matches: currentMatches + 1,
                            Wins: currentWins + (isWinner ? 1 : 0)
                        }
                    }]
                })
            });
        } else {
            await airtableRequest('/Leaderboard', {
                method: 'POST',
                body: JSON.stringify({
                    records: [{
                        fields: {
                            Player: playerName,
                            Points: points,
                            Matches: 1,
                            Wins: isWinner ? 1 : 0
                        }
                    }]
                })
            });
        }
    } catch (error) {
        console.error('Error updating leaderboard:', error);
    }
}

// Helper to escape single quotes for Airtable formula values
function escapeAirtableFormulaValue(value) {
    return value.replace(/'/g, "\\'");
}

// Simple HTTP server
const server = http.createServer(async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    const parsedUrl = url.parse(req.url, true);
    const path = parsedUrl.pathname;

    try {
        // Test endpoint
        if (path === '/api/test') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                message: 'Golf League HTTP server is working!',
                timestamp: new Date().toISOString()
            }));
        }
        
        // Simple test endpoint without Airtable
        else if (path === '/api/test-simple' && req.method === 'GET') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                message: 'Simple test successful',
                timestamp: new Date().toISOString(),
                environment: {
                    port: PORT,
                    baseId: AIRTABLE_BASE_ID,
                    tokenPresent: !!AIRTABLE_PERSONAL_ACCESS_TOKEN
                }
            }));
        }
        
        // Health check
        else if (path === '/api/health') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                airtable: {
                    configured: !!(AIRTABLE_PERSONAL_ACCESS_TOKEN && AIRTABLE_BASE_ID),
                    baseId: AIRTABLE_BASE_ID
                }
            }));
        }
        
        // Get all data
        else if (path === '/api/data' && req.method === 'GET') {
            try {
                console.log('Starting to fetch all data...');
                const [players, matches, leaderboard, checkedInPlayers, matchQueue, settings] = await Promise.all([
                    getPlayers(),
                    getMatches(),
                    getLeaderboard(),
                    getCheckedInPlayers(),
                    getMatchQueue(),
                    getSettings()
                ]);

                console.log('All data fetched successfully');

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    players,
                    matches,
                    leaderboard,
                    checkedInPlayers,
                    matchQueue,
                    currentMatchIndex: 0,
                    lastUpdated: new Date().toISOString()
                }));
            } catch (error) {
                console.error('Error in /api/data endpoint:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    error: 'Failed to fetch data',
                    details: error.message,
                    timestamp: new Date().toISOString()
                }));
            }
        }
        
        // Players endpoints
        else if (path === '/api/players' && req.method === 'GET') {
            const players = await getPlayers();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(players));
        }
        
        // Users endpoint
        else if (path === '/api/users' && req.method === 'GET') {
            const users = await getUsers();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(users));
        }
        
        else if (path === '/api/players' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
                try {
                    const { name, userId } = JSON.parse(body);
                    
                    if (userId) {
                        // Add player from existing user
                        const user = await airtableRequest(`/Users/${userId}`);
                        const userName = `${user.fields['First Name']} ${user.fields['Last Name']}`;
                        
                        // Create player record linked to user
                        const playerPayload = {
                            records: [{
                                fields: {
                                    User: [userId]
                                }
                            }]
                        };
                        
                        console.log('Creating player with payload:', JSON.stringify(playerPayload, null, 2));
                        console.log('User ID being used:', userId);
                        console.log('User ID type:', typeof userId);
                        
                        const playerRecord = await airtableRequest('/Players', {
                            method: 'POST',
                            body: JSON.stringify(playerPayload)
                        });

                        // Initialize leaderboard entry
                        await airtableRequest('/Leaderboard', {
                            method: 'POST',
                            body: JSON.stringify({
                                records: [{
                                    fields: {
                                        Player: userName,
                                        Points: 0,
                                        Matches: 0,
                                        Wins: 0
                                    }
                                }]
                            })
                        });

                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true, player: playerRecord.records[0] }));
                    } else if (name) {
                        // Legacy: Add player by name only
                        const playerRecord = await airtableRequest('/Players', {
                            method: 'POST',
                            body: JSON.stringify({
                                records: [{
                                    fields: {
                                        Name: name
                                    }
                                }]
                            })
                        });

                        // Initialize leaderboard entry
                        await airtableRequest('/Leaderboard', {
                            method: 'POST',
                            body: JSON.stringify({
                                records: [{
                                    fields: {
                                        Player: name,
                                        Points: 0,
                                        Matches: 0,
                                        Wins: 0
                                    }
                                }]
                            })
                        });

                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true, player: playerRecord.records[0] }));
                    } else {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Either name or userId is required' }));
                    }
                } catch (error) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: error.message }));
                }
            });
            return;
        }
        
        // Remove player endpoint
        else if (path.startsWith('/api/players/') && req.method === 'DELETE') {
            const playerName = decodeURIComponent(path.split('/api/players/')[1]);
            const safeName = escapeAirtableFormulaValue(playerName);
            try {
                // Get and delete player records
                const playerRecords = await airtableRequest(`/Players?filterByFormula={Name}='${safeName}'`);
                if (playerRecords.records.length > 0) {
                    const recordIds = playerRecords.records.map(r => r.id);
                    await airtableRequest('/Players', {
                        method: 'DELETE',
                        body: JSON.stringify({ records: recordIds })
                    });
                }

                // Get and delete leaderboard entry
                const leaderboardRecords = await airtableRequest(`/Leaderboard?filterByFormula={Player}='${safeName}'`);
                if (leaderboardRecords.records.length > 0) {
                    const recordIds = leaderboardRecords.records.map(r => r.id);
                    await airtableRequest('/Leaderboard', {
                        method: 'DELETE',
                        body: JSON.stringify({ records: recordIds })
                    });
                }

                // Remove from checked in players
                const checkedInRecords = await airtableRequest(`/CheckedInPlayers?filterByFormula={Player}='${safeName}'`);
                if (checkedInRecords.records.length > 0) {
                    const recordIds = checkedInRecords.records.map(r => r.id);
                    await airtableRequest('/CheckedInPlayers', {
                        method: 'DELETE',
                        body: JSON.stringify({ records: recordIds })
                    });
                }

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            } catch (error) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: error.message }));
            }
        }
        
        // Check-in endpoint
        else if (path === '/api/checkin' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
                try {
                    const { playerName, checkedIn } = JSON.parse(body);
                    
                    if (checkedIn) {
                        await airtableRequest('/CheckedInPlayers', {
                            method: 'POST',
                            body: JSON.stringify({
                                records: [{
                                    fields: {
                                        Player: playerName
                                    }
                                }]
                            })
                        });
                    } else {
                        const records = await airtableRequest(`/CheckedInPlayers?filterByFormula={Player}='${encodeURIComponent(playerName)}'`);
                        if (records.records.length > 0) {
                            const recordIds = records.records.map(r => r.id);
                            await airtableRequest('/CheckedInPlayers', {
                                method: 'DELETE',
                                body: JSON.stringify({ records: recordIds })
                            });
                        }
                    }

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                } catch (error) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: error.message }));
                }
            });
            return;
        }
        
        // Record match endpoint
        else if (path === '/api/matches' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
                try {
                    const { player1, player2, scores, winner, points, holeResults } = JSON.parse(body);
                    
                    const matchRecord = await airtableRequest('/Matches', {
                        method: 'POST',
                        body: JSON.stringify({
                            records: [{
                                fields: {
                                    Player1: player1,
                                    Player2: player2,
                                    Scores: JSON.stringify(scores),
                                    Winner: winner,
                                    Points: JSON.stringify(points),
                                    HoleResults: JSON.stringify(holeResults)
                                }
                            }]
                        })
                    });

                    // Update leaderboard
                    await updateLeaderboard(player1, points[player1], winner === player1);
                    await updateLeaderboard(player2, points[player2], winner === player2);

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, match: matchRecord.records[0] }));
                } catch (error) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: error.message }));
                }
            });
            return;
        }
        
        // Match Queue API
        else if (path === '/api/match-queue' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
                try {
                    const { matches } = JSON.parse(body);
                    
                    // Clear existing queue
                    const existingRecords = await airtableRequest('/MatchQueue');
                    if (existingRecords.records.length > 0) {
                        const recordIds = existingRecords.records.map(r => r.id);
                        await airtableRequest('/MatchQueue', {
                            method: 'DELETE',
                            body: JSON.stringify({ records: recordIds })
                        });
                    }

                    // Add new matches
                    if (matches.length > 0) {
                        const records = matches.map(match => ({
                            fields: {
                                Player1: match.player1,
                                Player2: match.player2,
                                Status: match.status,
                                MatchNumber: match.matchNumber
                            }
                        }));

                        await airtableRequest('/MatchQueue', {
                            method: 'POST',
                            body: JSON.stringify({ records })
                        });
                    }

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                } catch (error) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: error.message }));
                }
            });
            return;
        }
        
        // Update match status
        else if (path.startsWith('/api/match-queue/') && req.method === 'PUT') {
            const matchNumber = path.split('/api/match-queue/')[1];
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
                try {
                    const { status } = JSON.parse(body);
                    const validStatuses = ['pending', 'active', 'completed'];
                    if (!validStatuses.includes(status)) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: `Invalid status value: ${status}` }));
                        return;
                    }

                    const records = await airtableRequest(`/MatchQueue?filterByFormula={MatchNumber}=${matchNumber}`);
                    if (!records.records.length) {
                        res.writeHead(404, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: `Match with MatchNumber ${matchNumber} not found` }));
                        return;
                    }

                    await airtableRequest('/MatchQueue', {
                        method: 'PATCH',
                        body: JSON.stringify({
                            records: [{
                                id: records.records[0].id,
                                fields: { Status: status }
                            }]
                        })
                    });

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                } catch (error) {
                    console.error('Error updating match status:', error);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: error.message }));
                }
            });
            return;
        }
        
        // Settings API
        else if (path === '/api/settings' && req.method === 'GET') {
            const settings = await getSettings();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(settings));
        }

        else if (path === '/api/settings' && req.method === 'PUT') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
                try {
                    const { tournamentName, minMatches, notes } = JSON.parse(body);
                    
                    const existingRecords = await airtableRequest('/Settings');
                    
                    if (existingRecords.records.length > 0) {
                        await airtableRequest('/Settings', {
                            method: 'PATCH',
                            body: JSON.stringify({
                                records: [{
                                    id: existingRecords.records[0].id,
                                    fields: {
                                        TournamentName: tournamentName,
                                        MinMatches: minMatches,
                                        Notes: notes
                                    }
                                }]
                            })
                        });
                    } else {
                        await airtableRequest('/Settings', {
                            method: 'POST',
                            body: JSON.stringify({
                                records: [{
                                    fields: {
                                        TournamentName: tournamentName,
                                        MinMatches: minMatches,
                                        Notes: notes
                                    }
                                }]
                            })
                        });
                    }

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                } catch (error) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: error.message }));
                }
            });
            return;
        }
        
        else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Not found' }));
        }
    } catch (error) {
        console.error('Server error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
    }
});

console.log('🚀 Golf League HTTP Server starting...');
server.listen(PORT, () => {
    console.log(`✅ Server started on port ${PORT}`);
    console.log(`📊 Test endpoint: http://localhost:${PORT}/api/test`);
    console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
    console.log(`📈 All data: http://localhost:${PORT}/api/data`);
    console.log(`👥 Players: http://localhost:${PORT}/api/players`);
    console.log(`⚙️ Settings: http://localhost:${PORT}/api/settings`);
    console.log(`🔐 Using Airtable Personal Access Token`);
}); 