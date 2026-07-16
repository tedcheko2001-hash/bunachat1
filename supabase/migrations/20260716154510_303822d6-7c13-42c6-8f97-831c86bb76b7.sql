
-- RLS for stories bucket: users can upload to their own folder, and any authenticated user can read
CREATE POLICY "Authenticated users can read stories"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'stories');

CREATE POLICY "Users can upload their own stories"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'stories'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own stories"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'stories'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
