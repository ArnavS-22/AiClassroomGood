-- Update the check constraint for the role column
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_role_check;
ALTER TABLE messages ADD CONSTRAINT messages_role_check CHECK (role IN ('user', 'assistant'));

-- Update existing messages
UPDATE messages SET role = 'user' WHERE role = 'student';
UPDATE messages SET role = 'assistant' WHERE role = 'ai';
