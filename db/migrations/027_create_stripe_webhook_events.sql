-- Migration: Create Stripe webhook events tracking table
-- Description: Track all webhook events for idempotency and debugging
-- Created: 2025-12-02

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id SERIAL PRIMARY KEY,
  event_id VARCHAR(255) UNIQUE NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  event_data JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  processing_error TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX idx_webhook_events_event_id ON stripe_webhook_events(event_id);
CREATE INDEX idx_webhook_events_type ON stripe_webhook_events(event_type);
CREATE INDEX idx_webhook_events_processed ON stripe_webhook_events(processed);
CREATE INDEX idx_webhook_events_created_at ON stripe_webhook_events(created_at);

-- Add comments
COMMENT ON TABLE stripe_webhook_events IS 'Tracks all Stripe webhook events for idempotency and debugging';
COMMENT ON COLUMN stripe_webhook_events.event_id IS 'Unique Stripe event ID (evt_xxx)';
COMMENT ON COLUMN stripe_webhook_events.event_data IS 'Full webhook event data as JSON';
COMMENT ON COLUMN stripe_webhook_events.processed IS 'Whether the event was successfully processed';
COMMENT ON COLUMN stripe_webhook_events.processing_error IS 'Error message if processing failed';
