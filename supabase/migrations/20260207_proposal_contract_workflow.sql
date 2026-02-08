-- Proposal-to-Contract Workflow Migration
-- Migration: 20260207_proposal_contract_workflow.sql
-- Description: Add customer lock trigger, proposal versioning, and new workflow statuses
-- Created: 2026-02-07

-- ============================================================================
-- 1. CUSTOMER LOCK TRIGGER
-- Once proposals exist for a request, client_profile_id cannot change
-- ============================================================================

CREATE OR REPLACE FUNCTION enforce_customer_lock()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.client_profile_id IS NOT NULL
     AND NEW.client_profile_id IS DISTINCT FROM OLD.client_profile_id
     AND EXISTS (SELECT 1 FROM proposals WHERE request_id = OLD.id)
  THEN
    RAISE EXCEPTION 'Cannot change customer after proposals exist for this request';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_enforce_customer_lock
  BEFORE UPDATE ON requests
  FOR EACH ROW EXECUTE FUNCTION enforce_customer_lock();

-- ============================================================================
-- 2. PROPOSAL VERSIONING COLUMNS
-- ============================================================================

ALTER TABLE proposals ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS previous_version_id UUID REFERENCES proposals(id);

-- ============================================================================
-- 3. NEW WORKFLOW STATUSES FOR request_status ENUM
-- These extend the existing lifecycle past proposal_sent
-- ============================================================================

ALTER TYPE request_status ADD VALUE IF NOT EXISTS 'contract_generated';
ALTER TYPE request_status ADD VALUE IF NOT EXISTS 'contract_sent';
ALTER TYPE request_status ADD VALUE IF NOT EXISTS 'payment_pending';
ALTER TYPE request_status ADD VALUE IF NOT EXISTS 'closed_won';
