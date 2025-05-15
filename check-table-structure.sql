-- Check if the assignment_submissions table exists and what columns it has
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'assignment_submissions';
