require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrateToMultipleRoles() {
  try {
    console.log('Starting migration to multiple roles...');

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

    // 2. Insert default roles
    console.log('Inserting default roles...');
    await pool.query(`
      INSERT INTO roles (name, description, permissions) VALUES
      ('Member', 'Standard member with basic access', '{"view_leaderboard": true, "submit_scores": true}'),
      ('Admin', 'Full administrative access', '{"view_leaderboard": true, "submit_scores": true, "manage_users": true, "manage_tournaments": true, "view_admin_dashboard": true}'),
      ('Club Pro', 'Club professional with enhanced access', '{"view_leaderboard": true, "submit_scores": true, "manage_tournaments": true, "view_admin_dashboard": true}'),
      ('Ambassador', 'Community ambassador with promotional access', '{"view_leaderboard": true, "submit_scores": true, "promote_events": true}')
      ON CONFLICT (name) DO NOTHING
    `);

    // 3. Get role mappings
    const { rows: roles } = await pool.query('SELECT id, name FROM roles');
    const roleMap = {};
    roles.forEach(role => {
      roleMap[role.name.toLowerCase()] = role.id;
    });

    // 4. Get all users with their current roles
    console.log('Migrating existing users...');
    const { rows: users } = await pool.query('SELECT member_id, role FROM users WHERE role IS NOT NULL');

    // 5. Assign roles based on current role field
    for (const user of users) {
      if (user.role) {
        const roleName = user.role.toLowerCase();
        const roleId = roleMap[roleName];
        
        if (roleId) {
          console.log(`Assigning role ${user.role} to user ${user.member_id}`);
          await pool.query(
            'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT (user_id, role_id) DO NOTHING',
            [user.member_id, roleId]
          );
        } else {
          console.log(`Unknown role "${user.role}" for user ${user.member_id}, assigning Member role`);
          // Assign Member role as default for unknown roles
          await pool.query(
            'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT (user_id, role_id) DO NOTHING',
            [user.member_id, roleMap['member']]
          );
        }
      } else {
        // Users without roles get Member role
        console.log(`User ${user.member_id} has no role, assigning Member role`);
        await pool.query(
          'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT (user_id, role_id) DO NOTHING',
          [user.member_id, roleMap['member']]
        );
      }
    }

    // 6. Create indexes
    console.log('Creating indexes...');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id)');

    console.log('Migration completed successfully!');
    console.log(`Migrated ${users.length} users to the new role system.`);

  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the migration
migrateToMultipleRoles().catch(console.error); 