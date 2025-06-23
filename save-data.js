const fs = require('fs');
const path = require('path');

// Get data from command line arguments
const data = process.argv[2];

if (!data) {
    console.error('No data provided');
    process.exit(1);
}

try {
    // Parse the data
    const parsedData = JSON.parse(data);
    
    // Add timestamp
    parsedData.lastUpdated = new Date().toISOString();
    
    // Write to data.json
    fs.writeFileSync(path.join(__dirname, 'data.json'), JSON.stringify(parsedData, null, 2));
    
    console.log('Data saved successfully');
} catch (error) {
    console.error('Error saving data:', error.message);
    process.exit(1);
} 