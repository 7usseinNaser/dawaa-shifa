-- Allow anonymous (unauthenticated) users to read medicine donations.
-- The citizen donation hub loads on the public dashboard and should show
-- recent donations even before/without a user session.
CREATE POLICY "anon_select_donations"
  ON medicine_donations FOR SELECT
  TO anon
  USING (true);
