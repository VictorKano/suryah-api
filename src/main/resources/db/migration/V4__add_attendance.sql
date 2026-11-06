-- Add attendance tracking to the booking table.
-- NULL  = not yet marked (default, preserves existing rows)
-- TRUE  = attended
-- FALSE = did not attend (no-show)
ALTER TABLE booking ADD COLUMN attended BOOLEAN DEFAULT NULL;
