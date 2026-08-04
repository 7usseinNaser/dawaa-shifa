-- Enable Realtime for bug_reports and suggestions tables
-- Fix #6: Bug reports should appear instantly in admin panel via Realtime
ALTER TABLE bug_reports REPLICA IDENTITY FULL;
ALTER TABLE suggestions REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE bug_reports;
ALTER PUBLICATION supabase_realtime ADD TABLE suggestions;
