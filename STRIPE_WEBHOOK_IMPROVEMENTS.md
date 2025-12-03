# Stripe Webhook Implementation - What's Missing

## Current Status
✅ Webhook endpoint exists and handles basic payment events
✅ Signature verification is implemented
✅ Payment and registration status updates work

## What Needs to Be Added

### 1. Webhook Event Logging (RECOMMENDED)

Create a table to track all webhook events for debugging and idempotency:

```sql
-- db/migrations/027_create_webhook_events.sql
CREATE TABLE stripe_webhook_events (
  id SERIAL PRIMARY KEY,
  event_id VARCHAR(255) UNIQUE NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  event_data JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  processing_error TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP
);

CREATE INDEX idx_webhook_events_id ON stripe_webhook_events(event_id);
CREATE INDEX idx_webhook_events_type ON stripe_webhook_events(event_type);
CREATE INDEX idx_webhook_events_processed ON stripe_webhook_events(processed);
```

### 2. Idempotency Handler (CRITICAL)

Update the webhook endpoint to prevent duplicate processing:

```javascript
// In server.js - Update webhook handler
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // CHECK FOR DUPLICATE EVENTS (IDEMPOTENCY)
  try {
    const existingEvent = await pool.query(
      'SELECT id, processed FROM stripe_webhook_events WHERE event_id = $1',
      [event.id]
    );

    if (existingEvent.rows.length > 0) {
      console.log(`Webhook event ${event.id} already processed, ignoring duplicate`);
      return res.status(200).json({ received: true, duplicate: true });
    }

    // Log the event
    await pool.query(
      `INSERT INTO stripe_webhook_events (event_id, event_type, event_data)
       VALUES ($1, $2, $3)`,
      [event.id, event.type, JSON.stringify(event)]
    );
  } catch (err) {
    console.error('Error checking webhook event:', err);
    // Continue processing even if logging fails
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object);
        break;

      case 'payment_intent.canceled':
        await handlePaymentIntentCanceled(event.data.object);
        break;

      case 'charge.refunded':
        await handleChargeRefunded(event.data.object);
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    // Mark event as processed
    await pool.query(
      `UPDATE stripe_webhook_events
       SET processed = true, processed_at = CURRENT_TIMESTAMP
       WHERE event_id = $1`,
      [event.id]
    );
  } catch (err) {
    console.error('Error processing webhook:', err);

    // Log the error
    await pool.query(
      `UPDATE stripe_webhook_events
       SET processing_error = $1
       WHERE event_id = $2`,
      [err.message, event.id]
    );

    // Return 500 so Stripe retries
    return res.status(500).json({ error: 'Webhook processing failed' });
  }

  // Return success quickly (Stripe expects response within 30 seconds)
  res.status(200).json({ received: true });
});
```

### 3. Refactored Event Handlers

```javascript
// Extract event handlers to separate functions
async function handlePaymentIntentSucceeded(paymentIntent) {
  console.log('PaymentIntent succeeded:', paymentIntent.id);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Update challenge payments
    await client.query(
      `UPDATE challenge_payments
       SET payment_status = 'completed', updated_at = CURRENT_TIMESTAMP
       WHERE payment_reference = $1`,
      [paymentIntent.id]
    );

    // Update signup payments
    const signupPaymentResult = await client.query(
      `UPDATE signup_payments
       SET payment_status = 'completed', updated_at = CURRENT_TIMESTAMP
       WHERE stripe_payment_intent_id = $1
       RETURNING registration_id, amount`,
      [paymentIntent.id]
    );

    // If signup payment was updated, update registration status to 'paid'
    if (signupPaymentResult.rows.length > 0) {
      const { registration_id, amount } = signupPaymentResult.rows[0];

      await client.query(
        `UPDATE signup_registrations
         SET status = 'paid', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [registration_id]
      );

      console.log(`Signup registration ${registration_id} marked as paid - $${amount}`);

      // TODO: Send confirmation email here
      // await sendPaymentConfirmationEmail(registration_id);
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function handlePaymentIntentFailed(paymentIntent) {
  console.log('PaymentIntent failed:', paymentIntent.id);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `UPDATE challenge_payments
       SET payment_status = 'failed', updated_at = CURRENT_TIMESTAMP
       WHERE payment_reference = $1`,
      [paymentIntent.id]
    );

    await client.query(
      `UPDATE signup_payments
       SET payment_status = 'failed', updated_at = CURRENT_TIMESTAMP
       WHERE stripe_payment_intent_id = $1`,
      [paymentIntent.id]
    );

    // TODO: Send payment failed notification
    // await sendPaymentFailedEmail(paymentIntent);

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function handlePaymentIntentCanceled(paymentIntent) {
  console.log('PaymentIntent canceled:', paymentIntent.id);

  await pool.query(
    `UPDATE signup_payments
     SET payment_status = 'canceled', updated_at = CURRENT_TIMESTAMP
     WHERE stripe_payment_intent_id = $1`,
    [paymentIntent.id]
  );
}

async function handleChargeRefunded(charge) {
  console.log('Charge refunded:', charge.id);

  // Get the payment intent from the charge
  const paymentIntentId = charge.payment_intent;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Update payment status to refunded
    const result = await client.query(
      `UPDATE signup_payments
       SET payment_status = 'refunded', updated_at = CURRENT_TIMESTAMP
       WHERE stripe_payment_intent_id = $1
       RETURNING registration_id`,
      [paymentIntentId]
    );

    if (result.rows.length > 0) {
      const { registration_id } = result.rows[0];

      // Update registration status
      await client.query(
        `UPDATE signup_registrations
         SET status = 'refunded', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [registration_id]
      );

      console.log(`Registration ${registration_id} refunded`);
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
```

### 4. Testing Webhooks Locally

Use Stripe CLI for local testing:

```bash
# Install Stripe CLI
# Mac: brew install stripe/stripe-cli/stripe
# Windows: scoop install stripe
# Linux: See https://stripe.com/docs/stripe-cli

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:5000/api/stripe/webhook

# This will output your webhook signing secret
# Add it to your .env file as STRIPE_WEBHOOK_SECRET

# Test the webhook
stripe trigger payment_intent.succeeded
```

### 5. Environment Variables Needed

```bash
# .env file
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx  # Or sk_live_ for production
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx  # From Stripe Dashboard or CLI
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx  # For frontend
```

### 6. Additional Webhook Events to Handle

Consider adding handlers for:
- `payment_intent.canceled` - User canceled before completing
- `payment_intent.requires_action` - 3D Secure authentication needed
- `charge.refunded` - Automatic refund handling
- `charge.dispute.created` - Handle chargebacks
- `customer.subscription.deleted` - If you add subscriptions later

### 7. Monitoring & Alerts

Add monitoring for webhook failures:

```javascript
// Optional: Send alert if webhook fails multiple times
async function checkWebhookHealth() {
  const result = await pool.query(`
    SELECT COUNT(*) as failed_count
    FROM stripe_webhook_events
    WHERE processed = false
      AND created_at > NOW() - INTERVAL '1 hour'
  `);

  if (result.rows[0].failed_count > 10) {
    // Send alert to admin
    console.error(`WARNING: ${result.rows[0].failed_count} webhooks failed in last hour`);
    // TODO: Send email/Slack notification
  }
}

// Run every 15 minutes
setInterval(checkWebhookHealth, 15 * 60 * 1000);
```

### 8. Webhook Retry Logic

Stripe automatically retries failed webhooks:
- Immediately
- After 5 minutes
- After 1 hour
- After 3 hours
- After 6 hours
- After 12 hours
- After 24 hours (up to 3 days)

Your endpoint should:
- ✅ Return 200 for successful processing
- ✅ Return 500 for failures that should retry
- ✅ Return 200 for duplicates (already processed)
- ✅ Respond within 30 seconds

## Summary of Required Actions

### Immediate (Critical)
1. ✅ Create `STRIPE_WEBHOOK_SECRET` in Stripe Dashboard
2. ✅ Add webhook endpoint URL to Stripe Dashboard
3. ✅ Add idempotency checking
4. ✅ Create webhook events logging table

### Important (Recommended)
5. ✅ Add `payment_intent.canceled` handler
6. ✅ Add `charge.refunded` handler
7. ✅ Refactor handlers into separate functions
8. ✅ Add transaction support with rollback

### Nice to Have
9. ⚪ Add email notifications on payment success/failure
10. ⚪ Add webhook monitoring and alerts
11. ⚪ Add test coverage for webhook handlers
12. ⚪ Document webhook testing process

## Testing Checklist

- [ ] Test with Stripe CLI locally
- [ ] Test duplicate webhook handling
- [ ] Test payment success flow
- [ ] Test payment failure flow
- [ ] Test refund flow
- [ ] Verify idempotency works
- [ ] Check webhook events are logged
- [ ] Verify database rollback on errors
- [ ] Test production webhook endpoint
- [ ] Monitor webhook failures in production
