-- ── V9: Subscription plan support ────────────────────────────────────────────
-- Adds billing_type / billing_cycle / weekly_session_limit to plan,
-- and creates the subscription_payment table for manual payment tracking.

-- 1. New columns on plan
ALTER TABLE plan
    ADD COLUMN billing_type         VARCHAR(20)   NOT NULL DEFAULT 'PER_SESSION',
    ADD COLUMN billing_cycle        VARCHAR(20)   NULL,
    ADD COLUMN weekly_session_limit INT           NULL;

-- billing_type:  'PER_SESSION' | 'SUBSCRIPTION'
-- billing_cycle: 'MONTHLY' | 'SEMESTER' | 'ANNUAL'  (null for PER_SESSION plans)
-- weekly_session_limit: null = unlimited (PER_SESSION), integer = max bookings/week (SUBSCRIPTION)

-- 2. Manual subscription payment log
CREATE TABLE subscription_payment (
    id           BIGSERIAL     PRIMARY KEY,
    student_id   BIGINT        NOT NULL REFERENCES student(id),
    plan_id      BIGINT        NOT NULL REFERENCES plan(id),
    period_start DATE          NOT NULL,
    period_end   DATE          NOT NULL,
    amount_paid  DECIMAL(10,2) NOT NULL,
    note         TEXT          NULL,
    paid_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_period CHECK (period_end >= period_start)
);

CREATE INDEX idx_sub_payment_student ON subscription_payment(student_id);
CREATE INDEX idx_sub_payment_paid_at ON subscription_payment(paid_at);
