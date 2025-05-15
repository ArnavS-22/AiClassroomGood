-- Create table for tracking student progress through lessons
CREATE TABLE IF NOT EXISTS student_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  completed_sections INTEGER[] DEFAULT '{}',
  last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure each student has only one progress record per lesson
  UNIQUE(student_id, lesson_id)
);

-- Add RLS policies
ALTER TABLE student_progress ENABLE ROW LEVEL SECURITY;

-- Students can view and update their own progress
CREATE POLICY "Students can view their own progress" ON student_progress
FOR SELECT
USING (student_id = auth.uid());

CREATE POLICY "Students can update their own progress" ON student_progress
FOR UPDATE
USING (student_id = auth.uid());

CREATE POLICY "Students can insert their own progress" ON student_progress
FOR INSERT
WITH CHECK (student_id = auth.uid());

-- Teachers can view progress for students in their classrooms
CREATE POLICY "Teachers can view progress for their students" ON student_progress
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM classroom_students
    JOIN classrooms ON classroom_students.classroom_id = classrooms.id
    WHERE classroom_students.student_id = student_progress.student_id
    AND classrooms.teacher_id = auth.uid()
  )
);
