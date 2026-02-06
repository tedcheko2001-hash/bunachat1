-- Create storage bucket for posts if not exists
INSERT INTO storage.buckets (id, name, public) VALUES ('posts', 'posts', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for avatars if not exists
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for posts bucket
CREATE POLICY "Posts images are publicly accessible" ON storage.objects 
FOR SELECT USING (bucket_id = 'posts');

CREATE POLICY "Users can upload post images" ON storage.objects 
FOR INSERT WITH CHECK (bucket_id = 'posts' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create storage policies for avatars bucket
CREATE POLICY "Avatars are publicly accessible" ON storage.objects 
FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" ON storage.objects 
FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own avatar" ON storage.objects 
FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);