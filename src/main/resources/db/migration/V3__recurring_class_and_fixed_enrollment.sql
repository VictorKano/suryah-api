-- =============================================================================
-- V3: Add recurring_class and fixed_enrollment tables, link class_session to
--     recurring_class, and seed the initial admin user.
--
-- Runs on top of V2__rename_to_english.sql.
--
-- Ordering rationale:
--   1. Create recurring_class (no dependencies besides class_type).
--   2. Create fixed_enrollment (depends on recurring_class and student).
--   3. Add nullable recurring_class_id FK column to class_session.
--   4. Insert admin user (depends on student table being in its English form).
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Create recurring_class table
-- -----------------------------------------------------------------------------
CREATE TABLE recurring_class (
    id             BIGSERIAL PRIMARY KEY,
    day_of_week    VARCHAR(10)  NOT NULL
                       CHECK (day_of_week IN
                              ('MONDAY','TUESDAY','WEDNESDAY','THURSDAY',
                               'FRIDAY','SATURDAY','SUNDAY')),
    start_time     TIME         NOT NULL,
    duration_min   INTEGER      NOT NULL CHECK (duration_min > 0),
    class_type_id  BIGINT       NOT NULL REFERENCES class_type (id),
    capacity       INTEGER      NOT NULL CHECK (capacity > 0),
    active         BOOLEAN      NOT NULL DEFAULT TRUE,
    CONSTRAINT uq_recurring_class_slot UNIQUE (day_of_week, start_time, class_type_id)
);


-- -----------------------------------------------------------------------------
-- 2. Create fixed_enrollment table
-- -----------------------------------------------------------------------------
CREATE TABLE fixed_enrollment (
    id                  BIGSERIAL    PRIMARY KEY,
    recurring_class_id  BIGINT       NOT NULL REFERENCES recurring_class (id),
    student_id          BIGINT       NOT NULL REFERENCES student (id),
    active              BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_fixed_enrollment UNIQUE (recurring_class_id, student_id)
);


-- -----------------------------------------------------------------------------
-- 3. Link class_session to recurring_class (nullable — ad-hoc sessions have no
--    recurring parent)
-- -----------------------------------------------------------------------------
ALTER TABLE class_session
    ADD COLUMN recurring_class_id BIGINT REFERENCES recurring_class (id);


-- -----------------------------------------------------------------------------
-- 4. Seed admin user
--    Credentials are injected via environment variables at migration time.
--    Defaults are provided for local development only — change in production.
--
--    ADMIN_EMAIL          — defaults to admin@suryah.com
--    ADMIN_PASSWORD_HASH  — defaults to BCrypt hash of 'admin123'
--      ($2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.)
-- -----------------------------------------------------------------------------
INSERT INTO student (name, email, phone, age, plan_type, password_hash, role, active)
VALUES (
    'Admin',
    coalesce(current_setting('app.admin_email',        true), 'admin@suryah.com'),
    '00000000000',
    30,
    'PRIVATE',
    coalesce(current_setting('app.admin_password_hash', true),
             '$2a$12$ZnN22Fkhe50OVk/t6ZXgMeDJbtYoy534SXC0pu.7SIiXp56N.Oyny'),
    'ADMIN',
    TRUE
);
