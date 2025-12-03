# Migration 020: Signup System

## Overview

This migration creates a complete signup system that decouples user registration and payment from tournament creation. It allows admins to:

- Create signups independently of tournaments
- Accept user registrations with Stripe or Venmo payments
- Link signups to tournaments and sync paid participants automatically
- Track payment status and verify manual payments

## Database Changes

### New Tables

1. **signups** - First-class signup objects with pricing, registration windows, and payment settings
2. **signup_registrations** - User registrations linked to signups with payment status
3. **signup_payments** - Detailed payment tracking (Stripe, Venmo, manual payments)
4. **tournament_signup_links** - Many-to-many relationship between tournaments and signups

### Modified Tables

- **participation** - Added optional `signup_id` column to track signup source

### New Permissions

- `manage_signups` - Create, edit, delete signups (Admin, Club Pro)
- `verify_signup_payments` - Verify manual payments (Admin, Club Pro)
- `view_signup_analytics` - View revenue and analytics (Admin)

## How to Run

### Apply Migration

```bash
# Using psql
psql $DATABASE_URL -f db/migrations/020_create_signup_system.sql

# Or using node/pg
node -e "
const { Pool } = require('pg');
const fs = require('fs');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const sql = fs.readFileSync('db/migrations/020_create_signup_system.sql', 'utf8');
pool.query(sql).then(() => {
  console.log('Migration 020 applied successfully');
  pool.end();
}).catch(err => {
  console.error('Migration failed:', err);
  pool.end();
  process.exit(1);
});
"
```

### Rollback Migration

```bash
# Using psql
psql $DATABASE_URL -f db/migrations/020_rollback.sql

# Or using node/pg
node -e "
const { Pool } = require('pg');
const fs = require('fs');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const sql = fs.readFileSync('db/migrations/020_rollback.sql', 'utf8');
pool.query(sql).then(() => {
  console.log('Migration 020 rolled back successfully');
  pool.end();
}).catch(err => {
  console.error('Rollback failed:', err);
  pool.end();
  process.exit(1);
});
"
```

## Schema Details

### signups Table

```sql
- id: Serial primary key
- title: Signup name (e.g., "Summer League 2025")
- slug: URL-friendly identifier (/signup/summer-league-2025)
- entry_fee: Cost to register
- registration_opens_at/closes_at: Registration window
- max_registrations: Capacity limit (NULL = unlimited)
- stripe_enabled: Accept credit card payments
- venmo_url/venmo_username: Fallback payment method
- status: draft, open, closed, archived
- created_by: Admin who created the signup
```

### signup_registrations Table

```sql
- id: Serial primary key
- signup_id: References signups
- user_id: References users (member_id)
- registration_data: JSONB for custom form fields
- payment_amount: Overrides signup entry_fee if set
- status: pending, paid, cancelled, refunded
```

### signup_payments Table

```sql
- id: Serial primary key
- registration_id: References signup_registrations
- amount: Payment amount
- payment_method: stripe, venmo, cash, check
- payment_status: pending, processing, completed, failed, refunded
- stripe_payment_intent_id: For Stripe webhook matching
- verified_by/verified_at: Admin verification for manual payments
```

### tournament_signup_links Table

```sql
- id: Serial primary key
- tournament_id: References tournaments
- signup_id: References signups
- auto_sync: Automatically add new paid registrations
- last_synced_at: Last sync timestamp
- sync_count: Number of sync operations performed
```

## Data Flow

### User Registration Flow

1. Admin creates signup with title, fee, dates
2. User browses signups at `/signup/:slug`
3. User registers (creates `signup_registration` with status='pending')
4. User pays via:
   - **Stripe**: Creates `signup_payment` with Stripe intent ID → Webhook updates status to 'completed' → Registration status becomes 'paid'
   - **Venmo**: Creates `signup_payment` with status='pending' → Admin verifies → Updates to 'completed' → Registration status becomes 'paid'

### Tournament Sync Flow

1. Admin creates tournament (independent of signup)
2. Admin links signup to tournament (`tournament_signup_links`)
3. Admin clicks "Sync Participants"
4. System queries all registrations where `status='paid'`
5. Inserts into `participation` table with `signup_id` reference
6. Updates `last_synced_at` and increments `sync_count`

### Auto-Sync (Optional)

If `auto_sync=true` on tournament_signup_link:
- Automatically add new paid registrations to tournament
- Triggered when registration status changes to 'paid'
- No admin action required

## Indexes

All critical queries are optimized with indexes:

- **signups**: status, slug, created_by, registration_window
- **signup_registrations**: signup_id, user_id, status, paid status
- **signup_payments**: registration_id, payment_status, stripe_intent_id, payment_method
- **tournament_signup_links**: tournament_id, signup_id, auto_sync flag
- **participation**: signup_id (for tracking source)

## Backward Compatibility

- ✅ Existing `participation` records unaffected (signup_id is NULL)
- ✅ Existing tournament registration endpoints continue to work
- ✅ New signup system is optional - can be adopted gradually
- ✅ Old tournaments remain read-only with existing data

## Testing the Migration

After running the migration, verify:

```sql
-- Check tables created
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'signup%';

-- Check permissions added
SELECT permission_key, permission_name FROM permissions WHERE permission_key LIKE '%signup%';

-- Check role assignments
SELECT r.role_name, p.permission_key
FROM role_permissions rp
JOIN roles r ON rp.role_id = r.id
JOIN permissions p ON rp.permission_id = p.id
WHERE p.permission_key LIKE '%signup%';

-- Check participation column added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'participation' AND column_name = 'signup_id';
```

## Next Steps

After running this migration:

1. **Backend**: Implement signup API endpoints (Phase 2-3)
2. **Frontend**: Create admin signup management UI (Phase 4)
3. **Frontend**: Create user registration UI (Phase 5)
4. **Integration**: Add signup linking to tournament management
5. **Testing**: Test full flow end-to-end

See the main implementation plan for detailed steps.

## Rollback Impact

Rolling back this migration will:

- ✅ Remove all signup-related tables and data
- ✅ Remove signup permissions from roles
- ✅ Remove `signup_id` column from `participation` table
- ⚠️ **Data Loss**: All signup and registration data will be permanently deleted
- ✅ Tournament participation data remains intact (only `signup_id` reference is removed)

**Note**: Only rollback if you haven't started using the signup system yet, or if you have a backup of the data.
