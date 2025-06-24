const https = require('https');

// These should match what's in Render
const AIRTABLE_PERSONAL_ACCESS_TOKEN = 'patWWFiqh3KS61Q5f.1234567890abcdef'; // Replace with actual token
const AIRTABLE_BASE_ID = 'appWWFiqh3KS61Q5f';

async function testAirtableConnection() {
    console.log('Testing Airtable connection...');
    console.log('Base ID:', AIRTABLE_BASE_ID);
    console.log('Token present:', !!AIRTABLE_PERSONAL_ACCESS_TOKEN);
    
    // Test basic connection
    try {
        const response = await makeRequest(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Players`);
        console.log('✅ Players table accessible');
        console.log('Sample record:', response.records[0]);
    } catch (error) {
        console.log('❌ Players table error:', error.message);
    }
    
    // Test CheckedInPlayers table
    try {
        const response = await makeRequest(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/CheckedInPlayers`);
        console.log('✅ CheckedInPlayers table accessible');
        console.log('Sample record:', response.records[0]);
        if (response.records[0]) {
            console.log('Available fields:', Object.keys(response.records[0].fields));
        }
    } catch (error) {
        console.log('❌ CheckedInPlayers table error:', error.message);
    }
    
    // Test other tables
    const tables = ['Matches', 'Leaderboard', 'MatchQueue', 'Settings'];
    for (const table of tables) {
        try {
            const response = await makeRequest(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${table}`);
            console.log(`✅ ${table} table accessible`);
            if (response.records[0]) {
                console.log(`${table} fields:`, Object.keys(response.records[0].fields));
            }
        } catch (error) {
            console.log(`❌ ${table} table error:`, error.message);
        }
    }
}

function makeRequest(url) {
    return new Promise((resolve, reject) => {
        const req = https.request(url, {
            headers: {
                'Authorization': `Bearer ${AIRTABLE_PERSONAL_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    resolve(JSON.parse(data));
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                }
            });
        });
        
        req.on('error', reject);
        req.end();
    });
}

testAirtableConnection().catch(console.error); 