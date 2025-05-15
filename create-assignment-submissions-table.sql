-- Create assignment_submissions table if it doesn't exist
CREATE TABLE IF NOT EXISTS assignment_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  answers JSONB NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Add unique constraint to prevent duplicate submissions
  UNIQUE(assignment_id, student_id)
);

-- Add RLS policies for assignment_submissions
ALTER TABLE assignment_submissions ENABLE ROW LEVEL SECURITY;

-- Students can view their own submissions
CREATE POLICY "Students can view their own submissions" ON assignment_submissions
FOR SELECT
USING (student_id = auth.uid());

-- Students can insert their own submissions
CREATE POLICY "Students can insert their own submissions" ON assignment_submissions
FOR INSERT
WITH CHECK (student_id = auth.uid());

-- Students can update their own submissions
CREATE POLICY "Students can update their own submissions" ON assignment_submissions
FOR UPDATE
USING (student_id = auth.uid());

-- Teachers can view submissions for assignments in their classrooms
CREATE POLICY "Teachers can view submissions for their classrooms" ON assignment_submissions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM assignments
    JOIN classrooms ON assignments.classroom_id = classrooms.id
    WHERE assignments.id = assignment_submissions.assignment_id
    AND classrooms.teacher_id = auth.uid()
  )
);
