-- The active flag on class_type is no longer used.
-- Class types are now either present (active) or deleted permanently.
ALTER TABLE class_type DROP COLUMN IF EXISTS active;
