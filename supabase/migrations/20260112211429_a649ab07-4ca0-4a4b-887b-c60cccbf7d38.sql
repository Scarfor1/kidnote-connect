-- Create note_shares table for collaborative sharing
CREATE TABLE public.note_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  shared_with_email TEXT NOT NULL,
  shared_with_user_id UUID,
  permission TEXT NOT NULL DEFAULT 'view' CHECK (permission IN ('view', 'edit')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique constraint to prevent duplicate shares
CREATE UNIQUE INDEX idx_note_shares_unique ON public.note_shares(note_id, shared_with_email);

-- Enable RLS
ALTER TABLE public.note_shares ENABLE ROW LEVEL SECURITY;

-- Owners can view shares they created
CREATE POLICY "Owners can view their shares"
ON public.note_shares
FOR SELECT
USING (auth.uid() = owner_id);

-- Users can view shares where they are the recipient
CREATE POLICY "Recipients can view shares"
ON public.note_shares
FOR SELECT
USING (auth.uid() = shared_with_user_id);

-- Owners can create shares for their notes
CREATE POLICY "Owners can create shares"
ON public.note_shares
FOR INSERT
WITH CHECK (auth.uid() = owner_id);

-- Owners can delete shares
CREATE POLICY "Owners can delete shares"
ON public.note_shares
FOR DELETE
USING (auth.uid() = owner_id);

-- Owners can update shares
CREATE POLICY "Owners can update shares"
ON public.note_shares
FOR UPDATE
USING (auth.uid() = owner_id);

-- Update notes RLS to allow shared users to view
CREATE POLICY "Shared users can view notes"
ON public.notes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.note_shares
    WHERE note_shares.note_id = notes.id
    AND note_shares.shared_with_user_id = auth.uid()
  )
);

-- Update notes RLS to allow edit-permission users to update
CREATE POLICY "Shared users with edit permission can update notes"
ON public.notes
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.note_shares
    WHERE note_shares.note_id = notes.id
    AND note_shares.shared_with_user_id = auth.uid()
    AND note_shares.permission = 'edit'
  )
);

-- Enable realtime for note_shares
ALTER PUBLICATION supabase_realtime ADD TABLE public.note_shares;