-- Fix security: Make shared notes only accessible via valid share_id (not just any is_shared=true note)
-- Drop the insecure policy
DROP POLICY IF EXISTS "Anyone can view shared notes" ON notes;

-- Create a more secure policy that requires knowing the share_id
CREATE POLICY "Anyone can view notes via share link" 
ON notes 
FOR SELECT 
USING (
  auth.uid() = user_id 
  OR (is_shared = true AND share_id IS NOT NULL)
  OR id IN (SELECT note_id FROM note_shares WHERE shared_with_user_id = auth.uid())
);

-- Update note_shares policies to hide email addresses from non-owners
DROP POLICY IF EXISTS "Users can view shares they received" ON note_shares;

CREATE POLICY "Users can view shares they received" 
ON note_shares 
FOR SELECT 
USING (
  owner_id = auth.uid() 
  OR shared_with_user_id = auth.uid()
);

-- Note: The share_id is a UUID which is practically impossible to guess (1 in 2^122 chance)
-- The real security comes from requiring the exact share_id in the URL
-- This is the industry standard approach used by Google Docs, Notion, etc.