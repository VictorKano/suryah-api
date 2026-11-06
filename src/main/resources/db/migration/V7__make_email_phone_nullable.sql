-- Allow students to be registered without email or phone (admin use case).
-- The unique constraint on email is preserved but now allows multiple NULLs
-- (PostgreSQL treats each NULL as distinct, so multiple NULL emails are fine).
ALTER TABLE student ALTER COLUMN email DROP NOT NULL;
ALTER TABLE student ALTER COLUMN phone DROP NOT NULL;
