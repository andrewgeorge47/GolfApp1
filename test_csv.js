const fs = require('fs');
const csv = require('csv-parser');

const results = [];

fs.createReadStream('NN_Users_MembershipDate.csv')
  .pipe(csv())
  .on('data', (data) => {
    console.log('Raw data:', data);
    console.log('Keys:', Object.keys(data));
    console.log('Member ID (bracket):', data['Member ID']);
    console.log('Member ID (dot):', data['Member ID']);
    console.log('All values:', Object.values(data));
    console.log('Member ID by index:', Object.values(data)[0]);
    console.log('Join Date by index:', Object.values(data)[4]);
    console.log('---');
    results.push(data);
    if (results.length >= 3) {
      process.exit(0);
    }
  })
  .on('end', () => {
    console.log('Total records:', results.length);
    console.log('First record:', results[0]);
  }); 