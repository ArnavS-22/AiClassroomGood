-- Create table for storing AI-generated lesson content
CREATE TABLE IF NOT EXISTS lesson_ai_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  content JSONB NOT NULL,
  quiz JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE lesson_ai_content ENABLE ROW LEVEL SECURITY;

-- Teachers can view AI content for their lessons
CREATE POLICY "Teachers can view AI content for their lessons" ON lesson_ai_content
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM lessons
    WHERE lessons.id = lesson_ai_content.lesson_id
    AND lessons.teacher_id = auth.uid()
  )
);

-- Students can view AI content for lessons assigned to them
CREATE POLICY "Students can view AI content for assigned lessons" ON lesson_ai_content
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM assignments
    JOIN classrooms ON assignments.classroom_id = classrooms.id
    JOIN classroom_students ON classrooms.id = classroom_students.classroom_id
    WHERE assignments.lesson_id = lesson_ai_content.lesson_id
    AND classroom_students.student_id = auth.uid()
  )
);

-- Add columns to lessons table to track AI processing
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS ai_processed BOOLEAN DEFAULT FALSE;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS ai_processing_needed BOOLEAN DEFAULT FALSE;
