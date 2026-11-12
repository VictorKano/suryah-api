-- V10: Add subscription price to plan
-- For SUBSCRIPTION plans this is the price per billing cycle (monthly/semester/annual).
-- For PER_SESSION plans this column stays NULL (price_per_attendance is used instead).
ALTER TABLE plan ADD COLUMN price DECIMAL(10,2) NULL;
