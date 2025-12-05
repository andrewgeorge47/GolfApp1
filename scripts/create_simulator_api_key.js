/**
 * Create Simulator API Key - Admin Utility
 *
 * This script creates a new simulator API key in the database.
 * Run this script to provision a new simulator PC for shot uploads.
 *
 * Usage:
 *   node scripts/create_simulator_api_key.js
 *
 * Or with parameters:
 *   SIM_NAME="NN Club - Bay 1" SIM_LOCATION="123 Main St" node scripts/create_simulator_api_key.js
 */

require('dotenv').config();
const { Pool } = require('pg');
const crypto = require('crypto');
const readline = require('readline');

// PostgreSQL connection - handle both local and production
const isProduction = process.env.DATABASE_URL && process.env.DATABASE_URL.includes('render.com');
const poolConfig = {
  connectionString: process.env.DATABASE_URL
};

// Only use SSL for production databases (like Render)
if (isProduction) {
  poolConfig.ssl = { rejectUnauthorized: false };
}

const pool = new Pool(poolConfig);

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer);
    });
  });
}

/**
 * Generate a secure random API key
 * Format: nn-sim-{simId}-{randomString}
 */
function generateAPIKey(simId) {
  const randomBytes = crypto.randomBytes(16).toString('hex');
  return `nn-sim-${simId}-${randomBytes}`;
}

/**
 * Generate a sim_id from sim_name
 * Example: "NN Club - Bay 1" -> "nn-club-bay1"
 */
function generateSimId(simName) {
  return simName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-')         // Replace spaces with dashes
    .replace(/-+/g, '-')          // Replace multiple dashes with single
    .replace(/^-|-$/g, '');       // Remove leading/trailing dashes
}

/**
 * Check if sim_id already exists
 */
async function checkSimIdExists(simId) {
  const result = await pool.query(
    'SELECT sim_id FROM simulator_api_keys WHERE sim_id = $1',
    [simId]
  );
  return result.rows.length > 0;
}

/**
 * Create a new simulator API key
 */
async function createSimulatorAPIKey() {
  console.log('\n=== Create Simulator API Key ===\n');

  try {
    // Get simulator details from user
    const simName = process.env.SIM_NAME || await question('Simulator Name (e.g., "NN Club - Bay 1"): ');
    const simLocation = process.env.SIM_LOCATION || await question('Location (e.g., "123 Main St, Anytown, USA"): ');

    // Auto-generate sim_id or let user provide one
    const defaultSimId = generateSimId(simName);
    let simId = process.env.SIM_ID || await question(`Simulator ID (default: ${defaultSimId}): `);
    simId = simId.trim() || defaultSimId;

    // Check if sim_id already exists
    const exists = await checkSimIdExists(simId);
    if (exists) {
      console.error(`\n❌ Error: Simulator ID "${simId}" already exists!`);
      console.log('Please choose a different ID or use a different name.\n');
      rl.close();
      process.exit(1);
    }

    // Generate secure API key
    const apiKey = generateAPIKey(simId);

    // Confirm before creating
    console.log('\n--- Preview ---');
    console.log(`Simulator ID: ${simId}`);
    console.log(`Simulator Name: ${simName}`);
    console.log(`Location: ${simLocation}`);
    console.log(`API Key: ${apiKey}`);
    console.log('---------------\n');

    const confirm = await question('Create this simulator? (yes/no): ');
    if (confirm.toLowerCase() !== 'yes' && confirm.toLowerCase() !== 'y') {
      console.log('\n❌ Cancelled.\n');
      rl.close();
      return;
    }

    // Insert into database
    const result = await pool.query(
      `INSERT INTO simulator_api_keys (sim_id, api_key, sim_name, location, is_active)
       VALUES ($1, $2, $3, $4, true)
       RETURNING id, sim_id, sim_name, location, created_at`,
      [simId, apiKey, simName, simLocation]
    );

    const sim = result.rows[0];

    console.log('\n✅ Simulator API Key Created Successfully!\n');
    console.log('='.repeat(60));
    console.log(`ID: ${sim.id}`);
    console.log(`Simulator ID: ${sim.sim_id}`);
    console.log(`Name: ${sim.sim_name}`);
    console.log(`Location: ${sim.location}`);
    console.log(`Created: ${sim.created_at}`);
    console.log('='.repeat(60));
    console.log('\n📋 IMPORTANT: Save this API key securely!\n');
    console.log(`API Key: ${apiKey}`);
    console.log('\nThis is the ONLY time you will see this API key!');
    console.log('\n📝 Next Steps:');
    console.log(`1. Provide this API key to the simulator PC developer`);
    console.log(`2. Configure the listener service on the sim PC with:`);
    console.log(`   - SIM_ID: ${sim.sim_id}`);
    console.log(`   - API_KEY: ${apiKey}`);
    console.log(`3. Test shot uploads to staging environment first`);
    console.log(`4. Monitor sync status at /api/sims/sync-status (admin only)\n`);

  } catch (err) {
    console.error('\n❌ Error creating simulator API key:', err.message);
    console.error(err);
  } finally {
    rl.close();
    await pool.end();
  }
}

/**
 * List all existing simulator API keys
 */
async function listSimulators() {
  console.log('\n=== Existing Simulators ===\n');

  try {
    const result = await pool.query(
      `SELECT
         sak.id,
         sak.sim_id,
         sak.sim_name,
         sak.location,
         sak.is_active,
         sak.last_used_at,
         sak.created_at,
         sss.total_shots_received,
         sss.last_sync_at
       FROM simulator_api_keys sak
       LEFT JOIN sim_sync_status sss ON sak.sim_id = sss.sim_id
       ORDER BY sak.created_at DESC`
    );

    if (result.rows.length === 0) {
      console.log('No simulators found.\n');
      return;
    }

    console.table(result.rows.map(sim => ({
      ID: sim.id,
      'Sim ID': sim.sim_id,
      'Name': sim.sim_name,
      'Location': sim.location,
      'Active': sim.is_active ? '✅' : '❌',
      'Total Shots': sim.total_shots_received || 0,
      'Last Sync': sim.last_sync_at ? new Date(sim.last_sync_at).toLocaleString() : 'Never',
      'Last Used': sim.last_used_at ? new Date(sim.last_used_at).toLocaleString() : 'Never'
    })));

    console.log(`\nTotal: ${result.rows.length} simulator(s)\n`);

  } catch (err) {
    console.error('Error listing simulators:', err.message);
  } finally {
    await pool.end();
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--list') || args.includes('-l')) {
    await listSimulators();
  } else if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage:
  node scripts/create_simulator_api_key.js           Create a new simulator
  node scripts/create_simulator_api_key.js --list    List all simulators
  node scripts/create_simulator_api_key.js --help    Show this help

Environment Variables:
  SIM_NAME      Simulator name (optional, will prompt if not provided)
  SIM_LOCATION  Simulator location (optional, will prompt if not provided)
  SIM_ID        Simulator ID (optional, auto-generated from name if not provided)

Examples:
  # Interactive mode
  node scripts/create_simulator_api_key.js

  # Non-interactive mode
  SIM_NAME="NN Club - Bay 1" SIM_LOCATION="123 Main St" node scripts/create_simulator_api_key.js

  # List all simulators
  node scripts/create_simulator_api_key.js --list
    `);
  } else {
    await createSimulatorAPIKey();
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
