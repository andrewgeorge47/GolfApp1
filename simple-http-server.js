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

// Helper functions
async function getPlayers() {
    const response = await airtableRequest('/Players');
    return response.records.map(record => record.fields.Name || 'Unknown Player');
}

async function getMatches() {
    const response = await airtableRequest('/Matches?sort[0][field]=PlayedAt&sort[0][direction]=desc');
    
    return response.records.map(record => ({
        player1: record.fields.Player1 || 'Unknown',
        player2: record.fields.Player2 || 'Unknown',
        scores: record.fields.Scores ? JSON.parse(record.fields.Scores) : {},
        winner: record.fields.Winner || 'Unknown',
        points: record.fields.Points ? JSON.parse(record.fields.Points) : {},
        holeResults: record.fields.HoleResults ? JSON.parse(record.fields.HoleResults) : {},
        timestamp: record.fields.PlayedAt || new Date().toISOString()
    }));
}

async function getLeaderboard() {
    const response = await airtableRequest('/Leaderboard');
    const leaderboard = {};
    
    response.records.forEach(record => {
        leaderboard[record.fields.Player || 'Unknown'] = {
            points: record.fields.Points || 0,
            matches: record.fields.Matches || 0,
            wins: record.fields.Wins || 0
        };
    });
    
    return leaderboard;
}

async function getCheckedInPlayers() {
    const response = await airtableRequest('/CheckedInPlayers');
    return response.records.map(record => record.fields.Player || 'Unknown');
}

async function getMatchQueue() {
    const response = await airtableRequest('/MatchQueue?sort[0][field]=MatchNumber&sort[0][direction]=asc');
    
    return response.records.map(record => ({
        player1: record.fields.Player1 || 'Unknown',
        player2: record.fields.Player2 || 'Unknown',
        status: record.fields.Status || 'pending',
        matchNumber: record.fields.MatchNumber || 0
    }));
}

async function getSettings() {
    const response = await airtableRequest('/Settings');
    if (response.records.length > 0) {
        return {
            tournamentName: response.records[0].fields.TournamentName || 'Golf League Tournament',
            minMatches: response.records[0].fields.MinMatches || 3,
            notes: response.records[0].fields.Notes || ''
        };
    }
    return {
        tournamentName: 'Golf League Tournament',
        minMatches: 3,
        notes: ''
    };
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
        
        else if (path === '/api/players' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
                try {
                    const { name } = JSON.parse(body);
                    if (!name) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Player name is required' }));
                        return;
                    }

                    // Create player record
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
                } catch (error) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: error.message }));
                }
            });
            return;
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
        
        // Settings endpoint
        else if (path === '/api/settings' && req.method === 'GET') {
            const settings = await getSettings();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(settings));
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