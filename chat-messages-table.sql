-- Create messages table to store chat history
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  lesson_id UUID NOT NULL REFERENCES lessons(id),
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Add foreign key constraints
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT fk_lesson FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
);

-- Add RLS policies
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Users can view their own messages
CREATE POLICY "Users can view their own messages" ON chat_messages
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can insert their own messages
CREATE POLICY "Users can insert their own messages" ON chat_messages
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Teachers can view messages for their lessons
CREATE POLICY "Teachers can view messages for their lessons" ON chat_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM lessons
      WHERE lessons.id = chat_messages.lesson_id
      AND lessons.teacher_id = auth.uid()
    )
  );
