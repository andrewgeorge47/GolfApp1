require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function setupTestDatabase() {
  try {
    console.log('Setting up test database for multiple roles...');

    // 1. Create the new tables
    console.log('Creating roles table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE,
        description TEXT,
        permissions JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Creating user_roles table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_roles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(member_id) ON DELETE CASCADE,
        role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        assigned_by INTEGER REFERENCES users(member_id),
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, role_id)
      )
    `);

    // 2. Insert test roles
    console.log('Inserting test roles...');
    await pool.query(`
      INSERT INTO roles (name, description, permissions) VALUES
      ('Member', 'Standard member with basic access', '{"view_leaderboard": true, "submit_scores": true}'),
      ('Admin', 'Full administrative access', '{"view_leaderboard": true, "submit_scores": true, "manage_users": true, "manage_tournaments": true, "view_admin_dashboard": true}'),
      ('Club Pro', 'Club professional with enhanced access', '{"view_leaderboard": true, "submit_scores": true, "manage_tournaments": true, "view_admin_dashboard": true}'),
      ('Ambassador', 'Community ambassador with promotional access', '{"view_leaderboard": true, "submit_scores": true, "promote_events": true}'),
      ('Tournament Director', 'Can manage tournaments and view admin data', '{"view_leaderboard": true, "submit_scores": true, "manage_tournaments": true, "view_admin_dashboard": true}')
      ON CONFLICT (name) DO NOTHING
    `);

    // 3. Create test users with multiple roles
    console.log('Creating test users...');
    
    // Test user 1: Admin + Club Pro
    await pool.query(`
      INSERT INTO users (member_id, first_name, last_name, email_address, club, role) VALUES
      (999999, 'Test', 'Admin', 'testadmin@example.com', 'Test Club', 'Admin')
      ON CONFLICT (member_id) DO NOTHING
    `);

    // Test user 2: Member + Ambassador
    await pool.query(`
      INSERT INTO users (member_id, first_name, last_name, email_address, club, role) VALUES
      (999998, 'Test', 'Member', 'testmember@example.com', 'Test Club', 'Member')
      ON CONFLICT (member_id) DO NOTHING
    `);

    // Test user 3: Club Pro + Tournament Director
    await pool.query(`
      INSERT INTO users (member_id, first_name, last_name, email_address, club, role) VALUES
      (999997, 'Test', 'Pro', 'testpro@example.com', 'Test Club', 'Club Pro')
      ON CONFLICT (member_id) DO NOTHING
    `);

    // 4. Assign multiple roles to test users
    console.log('Assigning multiple roles to test users...');
    
    // Get role IDs
    const { rows: roles } = await pool.query('SELECT id, name FROM roles');
    const roleMap = {};
    roles.forEach(role => {
      roleMap[role.name.toLowerCase()] = role.id;
    });

    // Assign roles to test users
    const testUserRoles = [
      { userId: 999999, roles: ['Admin', 'Club Pro'] }, // Admin + Club Pro
      { userId: 999998, roles: ['Member', 'Ambassador'] }, // Member + Ambassador
      { userId: 999997, roles: ['Club Pro', 'Tournament Director'] }, // Club Pro + Tournament Director
    ];

    for (const userRole of testUserRoles) {
      for (const roleName of userRole.roles) {
        const roleId = roleMap[roleName.toLowerCase()];
        if (roleId) {
          await pool.query(
            'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT (user_id, role_id) DO NOTHING',
            [userRole.userId, roleId]
          );
          console.log(`Assigned ${roleName} role to user ${userRole.userId}`);
        }
      }
    }

    // 5. Create indexes
    console.log('Creating indexes...');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id)');

    console.log('✅ Test database setup completed successfully!');
    console.log('\nTest Users Created:');
    console.log('- Test Admin (ID: 999999): Admin + Club Pro roles');
    console.log('- Test Member (ID: 999998): Member + Ambassador roles');
    console.log('- Test Pro (ID: 999997): Club Pro + Tournament Director roles');
    console.log('\nYou can now test the multiple roles system with these users.');

  } catch (error) {
    console.error('❌ Test database setup failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the setup
setupTestDatabase().catch(console.error); 