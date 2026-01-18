-- Migration: Rename avinode_rfp_id to avinode_rfq_id
-- Purpose: Standardize naming to match Avinode API terminology (RFQ = Request for Quote)
-- Date: 2026-01-18
--
-- Run this in Supabase Dashboard > SQL Editor

-- Step 1: Rename the column in requests table
ALTER TABLE requests
RENAME COLUMN avinode_rfp_id TO avinode_rfq_id;

-- Step 2: Update any indexes that reference the old column name
-- (Check if any exist first)
DROP INDEX IF EXISTS idx_requests_avinode_rfp_id;
CREATE INDEX IF NOT EXISTS idx_requests_avinode_rfq_id ON requests(avinode_rfq_id);

-- Step 3: Add comment explaining the field
COMMENT ON COLUMN requests.avinode_rfq_id IS 'Avinode RFQ (Request for Quote) ID - identifies an RFQ sent to a specific operator';

-- Verification query (run after migration)
-- SELECT id, avinode_trip_id, avinode_rfq_id, avinode_deep_link
-- FROM requests
-- WHERE avinode_rfq_id IS NOT NULL
-- LIMIT 5;
