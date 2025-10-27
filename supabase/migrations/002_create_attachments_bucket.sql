-- Create attachments storage bucket
-- This migration sets up the Supabase Storage bucket for file attachments

-- Create the attachments bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'attachments',
  'attachments', 
  true,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];

-- For the attachments bucket, we'll disable RLS to allow anonymous uploads
-- This is safe because we control access through the API routes
CREATE POLICY "Disable RLS for attachments bucket" ON storage.objects
FOR ALL TO public
USING (bucket_id = 'attachments')
WITH CHECK (bucket_id = 'attachments');
