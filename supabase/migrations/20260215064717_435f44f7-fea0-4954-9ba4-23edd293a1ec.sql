
-- Allow users to delete their own sent messages (DMs and group)
CREATE POLICY "Users can delete their own messages"
ON public.messages
FOR DELETE
USING (auth.uid() = sender_id);
