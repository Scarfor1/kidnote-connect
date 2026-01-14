-- Create storage bucket for note images
INSERT INTO storage.buckets (id, name, public)
VALUES ('note-images', 'note-images', true);

-- Allow authenticated users to upload images
CREATE POLICY "Users can upload their own note images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'note-images' 
  AND auth.uid() IS NOT NULL
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to update their own images
CREATE POLICY "Users can update their own note images"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'note-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to delete their own images
CREATE POLICY "Users can delete their own note images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'note-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public read access to all note images (since bucket is public)
CREATE POLICY "Anyone can view note images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'note-images');