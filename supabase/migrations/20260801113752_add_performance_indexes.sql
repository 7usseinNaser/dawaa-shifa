/*
# Add Performance Indexes

## Purpose
Speed up the most frequently-used query patterns in the app:
- Admin panel loads tables ordered by created_at (audit_logs, data_reports, batch_recalls, etc.)
- Citizen dashboard filters pharmacies/facilities by verified + approval_status + deleted_at
- Search logs are queried by area and query text
- Reviews are filtered by target_type + target_id

## New Indexes (all CREATE INDEX IF NOT EXISTS — safe to re-run)
1. audit_logs(created_at DESC) — admin panel orders by created_at
2. data_reports(created_at DESC) — admin panel orders by created_at
3. batch_recalls(created_at DESC) — admin panel orders by created_at
4. facility_warnings(created_at DESC) — admin panel orders by created_at
5. emergency_broadcasts(created_at DESC) — admin/citizen orders by created_at
6. med_exchange_requests(created_at DESC) — admin panel orders by created_at
7. medicine_donations(created_at DESC) — admin/donation hub orders by created_at
8. bug_reports(created_at DESC) — admin panel orders by created_at
9. pharmacies(verified, approval_status, deleted_at) — citizen dashboard compound filter
10. facilities(verified, approval_status, deleted_at) — citizen dashboard compound filter
11. medicines(deleted_at) — citizen dashboard filters soft-deleted
12. reviews(target_type, target_id) — compound index for review lookups
13. audit_logs(actor_id, created_at DESC) — user activity timeline

No tables or columns are created, modified, or deleted.
No RLS policy changes.
*/

CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_data_reports_created ON data_reports (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_batch_recalls_created ON batch_recalls (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_facility_warnings_created ON facility_warnings (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_emergency_broadcasts_created ON emergency_broadcasts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_med_exchange_created ON med_exchange_requests (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_medicine_donations_created ON medicine_donations (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bug_reports_created ON bug_reports (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pharmacies_status ON pharmacies (verified, approval_status, deleted_at);
CREATE INDEX IF NOT EXISTS idx_facilities_status ON facilities (verified, approval_status, deleted_at);
CREATE INDEX IF NOT EXISTS idx_medicines_deleted ON medicines (deleted_at);
CREATE INDEX IF NOT EXISTS idx_reviews_target_compound ON reviews (target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs (actor_id, created_at DESC);
