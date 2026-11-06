-- Tracks whether a 12-hour reminder email has been sent for a booking.
-- NULL = not yet sent; TRUE = sent. Never set to FALSE.
ALTER TABLE booking ADD COLUMN reminder_sent BOOLEAN DEFAULT NULL;
