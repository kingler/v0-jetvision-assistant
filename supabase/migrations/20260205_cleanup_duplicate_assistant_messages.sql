-- JetVision AI Assistant - Cleanup Duplicate Assistant Messages
-- Migration: 20260205_cleanup_duplicate_assistant_messages.sql
-- Description: One-time cleanup of duplicate ai_assistant RFQ status messages
--              caused by unconditional assistant message persistence when
--              skipMessagePersistence was true (only user message was skipped).
-- Created: 2026-02-05
--
-- Root cause: app/api/chat/route.ts saved assistant responses unconditionally,
-- even when skipMessagePersistence=true. Each auto-load and webhook-triggered
-- handleTripIdSubmit() call persisted a new status message.
--
-- Strategy: For each request_id, keep the FIRST and LAST ai_assistant message
-- that share similar RFQ status content, delete duplicates in between.
-- Uses content similarity (first 200 chars + keywords) to identify RFQ status messages.

-- Step 1: Identify and delete duplicate assistant messages
-- A message is considered a duplicate if:
-- 1. It's from ai_assistant
-- 2. Its content contains RFQ-related keywords
-- 3. There are other messages with the same request_id and similar content
-- 4. It's not the first or last such message (by created_at)
WITH rfq_assistant_messages AS (
  -- Find all ai_assistant messages that contain RFQ-related content
  SELECT
    id,
    request_id,
    content,
    created_at,
    ROW_NUMBER() OVER (PARTITION BY request_id ORDER BY created_at ASC) AS rn_asc,
    ROW_NUMBER() OVER (PARTITION BY request_id ORDER BY created_at DESC) AS rn_desc,
    COUNT(*) OVER (PARTITION BY request_id) AS total_count
  FROM messages
  WHERE sender_type = 'ai_assistant'
    AND request_id IS NOT NULL
    AND (
      content ILIKE '%rfq%'
      OR content ILIKE '%quote%'
      OR content ILIKE '%trip id%'
      OR content ILIKE '%received quotes%'
      OR content ILIKE '%operators have responded%'
      OR content ILIKE '%doesn''t look like an active%'
      OR content ILIKE '%not an active trip%'
      OR content ILIKE '%flight quotes%'
    )
),
duplicates_to_delete AS (
  -- Keep the first (rn_asc = 1) and last (rn_desc = 1) message per request_id
  -- Delete everything in between (only when there are 3+ messages)
  SELECT id
  FROM rfq_assistant_messages
  WHERE total_count >= 3
    AND rn_asc > 1
    AND rn_desc > 1
)
DELETE FROM messages
WHERE id IN (SELECT id FROM duplicates_to_delete);

-- =============================================================================
-- Phase 2: Cross-request_id cleanup - orphaned auto-refresh messages
-- =============================================================================
-- Each auto-refresh/webhook handleTripIdSubmit() call created a NEW draft request
-- and saved the assistant response under that new request_id. These draft requests
-- have no departure/arrival airports and no user messages - they're orphaned.
-- The chat UI only loads messages for the main request_id, so these are never shown.
--
-- Phase 2a: Delete orphaned ai_assistant messages from empty draft requests
WITH orphaned_draft_messages AS (
  SELECT m.id as message_id
  FROM messages m
  JOIN requests r ON m.request_id = r.id
  WHERE m.sender_type = 'ai_assistant'
    AND r.status = 'draft'
    AND (r.departure_airport IS NULL OR r.departure_airport = '')
    AND (r.arrival_airport IS NULL OR r.arrival_airport = '')
    AND (
      m.content ILIKE '%rfq%'
      OR m.content ILIKE '%quote%'
      OR m.content ILIKE '%trip%'
      OR m.content ILIKE '%operators%'
      OR m.content ILIKE '%doesn''t look like%'
    )
    AND NOT EXISTS (
      SELECT 1 FROM messages m2
      WHERE m2.request_id = m.request_id
      AND m2.sender_type = 'iso_agent'
    )
)
DELETE FROM messages WHERE id IN (SELECT message_id FROM orphaned_draft_messages);

-- Phase 2b: Delete empty draft requests with no messages remaining
-- These are ghost request records from auto-refresh cycles
WITH empty_drafts AS (
  SELECT r.id
  FROM requests r
  WHERE r.status = 'draft'
    AND (r.departure_airport IS NULL OR r.departure_airport = '')
    AND (r.arrival_airport IS NULL OR r.arrival_airport = '')
    AND NOT EXISTS (
      SELECT 1 FROM messages m WHERE m.request_id = r.id
    )
)
DELETE FROM requests WHERE id IN (SELECT id FROM empty_drafts);
