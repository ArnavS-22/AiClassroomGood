-- Add is_fallback column to lesson_ai_content table if it doesn't exist
ALTER TABLE lesson_ai_content 
ADD COLUMN IF NOT EXISTS is_fallback BOOLEAN DEFAULT FALSE;
