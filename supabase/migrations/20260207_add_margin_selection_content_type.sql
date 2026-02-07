-- Migration: Add 'margin_selection' to message_content_type enum
-- Required for persisting customer/margin selection summary cards in chat threads

ALTER TYPE message_content_type ADD VALUE IF NOT EXISTS 'margin_selection';
