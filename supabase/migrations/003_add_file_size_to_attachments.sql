-- Add file_size column to attachments table
ALTER TABLE attachments ADD COLUMN file_size BIGINT;

-- Add comment to explain the column
COMMENT ON COLUMN attachments.file_size IS 'File size in bytes';
