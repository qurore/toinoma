-- Create storage buckets for problem PDFs and answer images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('problem-pdfs', 'problem-pdfs', true, 52428800, ARRAY['application/pdf']),
  ('answer-images', 'answer-images', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- RLS policies for problem-pdfs bucket
-- Anyone can read published problem PDFs
CREATE POLICY "Public read for problem PDFs"
ON storage.objects FOR SELECT
USING (bucket_id = 'problem-pdfs');

-- Sellers can upload to their own folder
CREATE POLICY "Sellers can upload problem PDFs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'problem-pdfs'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Sellers can update their own files
CREATE POLICY "Sellers can update own problem PDFs"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'problem-pdfs'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Sellers can delete their own files
CREATE POLICY "Sellers can delete own problem PDFs"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'problem-pdfs'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS policies for answer-images bucket
-- Users can upload to their own folder
CREATE POLICY "Users can upload answer images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'answer-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can read their own answer images
CREATE POLICY "Users can read own answer images"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'answer-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Sellers can read answer images for their problem sets (for review)
CREATE POLICY "Sellers can read answer images for their problems"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'answer-images'
  AND EXISTS (
    SELECT 1 FROM public.submissions s
    JOIN public.problem_sets ps ON s.problem_set_id = ps.id
    WHERE ps.seller_id = auth.uid()
    AND s.user_id::text = (storage.foldername(name))[1]
  )
);
