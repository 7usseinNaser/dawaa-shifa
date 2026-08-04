-- Fix #6: Add missing bug_type column to bug_reports table
-- The AdminPanel queries for bug_type but it doesn't exist in the schema
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS bug_type text DEFAULT 'bug';

-- Add realtime replica identity so INSERT events carry full row data
ALTER TABLE bug_reports REPLICA IDENTITY FULL;
