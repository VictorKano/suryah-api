-- ── 1. Plan table ─────────────────────────────────────────────────────────────
CREATE TABLE plan (
    id                   BIGSERIAL    PRIMARY KEY,
    name                 VARCHAR(100) NOT NULL UNIQUE,
    price_per_attendance DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    active               BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── 2. Seed the three default plans matching existing plan_type values ─────────
INSERT INTO plan (name, price_per_attendance) VALUES
    ('Particular', 0.00),
    ('TotalPass',  0.00),
    ('Wellhub',    0.00);
-- Admin will configure the actual values via the UI.

-- ── 3. Add plan_id FK to student ───────────────────────────────────────────────
ALTER TABLE student ADD COLUMN plan_id BIGINT REFERENCES plan(id);

-- ── 4. Auto-associate existing students by plan_type name ──────────────────────
UPDATE student SET plan_id = (SELECT id FROM plan WHERE name = 'Particular') WHERE plan_type = 'PRIVATE';
UPDATE student SET plan_id = (SELECT id FROM plan WHERE name = 'TotalPass')  WHERE plan_type = 'TOTALPASS';
UPDATE student SET plan_id = (SELECT id FROM plan WHERE name = 'Wellhub')    WHERE plan_type = 'WELLHUB';

-- ── 5. Add price_per_attendance snapshot to booking ───────────────────────────
-- Null until attendance is marked. Set when attended=true to lock the historical price.
ALTER TABLE booking ADD COLUMN price_per_attendance DECIMAL(10,2) DEFAULT NULL;
