require('dotenv').config();

const AIRTABLE_PERSONAL_ACCESS_TOKEN = process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

console.log('🔍 Testing Airtable Token');
console.log(`Base ID: ${AIRTABLE_BASE_ID}`);
console.log(`Token: ${AIRTABLE_PERSONAL_ACCESS_TOKEN ? 'Present' : 'Missing'}`);

if (!AIRTABLE_PERSONAL_ACCESS_TOKEN) {
    console.error('❌ No token found in .env file');
    process.exit(1);
}

const AIRTABLE_API_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}`;
const AIRTABLE_HEADERS = {
    'Authorization': `Bearer ${AIRTABLE_PERSONAL_ACCESS_TOKEN}`,
    'Content-Type': 'application/json'
};

async function testToken() {
    try {
        console.log('Testing connection to Players table...');
        
        const response = await fetch(`${AIRTABLE_API_URL}/Players?maxRecords=1`, {
            headers: AIRTABLE_HEADERS
        });
        
        console.log(`Response status: ${response.status}`);
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Token is working!');
            console.log(`Found ${data.records?.length || 0} player records`);
        } else {
            const errorData = await response.json();
            console.error('❌ Token test failed:');
            console.error('Status:', response.status);
            console.error('Error:', errorData);
        }
    } catch (error) {
        console.error('❌ Connection error:', error.message);
    }
}

testToken(); 