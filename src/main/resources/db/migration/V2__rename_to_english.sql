-- =============================================================================
-- V2: Rename the Portuguese schema (tables, columns, CHECK constraints,
--     enum string values and indexes) to English so the database matches
--     the already-renamed JPA entities.
--
-- Runs on top of V1__init.sql. Hibernate runs with ddl-auto=validate, so the
-- resulting table/column names MUST exactly match the @Table/@Column mappings.
--
-- Ordering rationale:
--   1. Rename tables.
--   2. Rename columns (CHECK expressions auto-follow the renamed columns, but
--      the constraint NAMES stay based on the old table name).
--   3. Drop the old auto-named CHECK constraints BEFORE the enum UPDATEs, since
--      the new English values would otherwise violate the old Portuguese CHECKs.
--   4. Convert stored enum strings to English.
--   5. Update column defaults to English values.
--   6. Re-add CHECK constraints with English enum values and English names.
--   7. Drop and recreate indexes with English names.
--   8. Rename the booking unique constraint.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Rename tables
-- -----------------------------------------------------------------------------
ALTER TABLE tipo_aula RENAME TO class_type;
ALTER TABLE aluno     RENAME TO student;
ALTER TABLE aula      RENAME TO class_session;
ALTER TABLE reserva   RENAME TO booking;


-- -----------------------------------------------------------------------------
-- 2. Rename columns
-- -----------------------------------------------------------------------------

-- class_type (was tipo_aula)
ALTER TABLE class_type RENAME COLUMN nome      TO name;
ALTER TABLE class_type RENAME COLUMN descricao TO description;
ALTER TABLE class_type RENAME COLUMN ativo     TO active;

-- student (was aluno) -- email and role keep their column names
ALTER TABLE student RENAME COLUMN nome       TO name;
ALTER TABLE student RENAME COLUMN telefone   TO phone;
ALTER TABLE student RENAME COLUMN idade      TO age;
ALTER TABLE student RENAME COLUMN tipo_plano TO plan_type;
ALTER TABLE student RENAME COLUMN senha_hash TO password_hash;
ALTER TABLE student RENAME COLUMN ativo      TO active;
ALTER TABLE student RENAME COLUMN criado_em  TO created_at;

-- class_session (was aula) -- status and version keep their column names
ALTER TABLE class_session RENAME COLUMN tipo_aula_id     TO class_type_id;
ALTER TABLE class_session RENAME COLUMN data_hora_inicio TO start_datetime;
ALTER TABLE class_session RENAME COLUMN duracao_min      TO duration_min;
ALTER TABLE class_session RENAME COLUMN capacidade       TO capacity;

-- booking (was reserva) -- status keeps its column name
ALTER TABLE booking RENAME COLUMN aula_id   TO class_session_id;
ALTER TABLE booking RENAME COLUMN aluno_id  TO student_id;
ALTER TABLE booking RENAME COLUMN criado_em TO created_at;


-- -----------------------------------------------------------------------------
-- 3. Drop old auto-named CHECK constraints.
--    Inline CHECK constraints created in V1 were auto-named
--    "{old_table}_{old_column}_check". Renaming the table/columns does NOT
--    change these names, so we drop them by their original Portuguese names.
--    This must happen before step 4: the new English enum values would violate
--    the old Portuguese value lists.
-- -----------------------------------------------------------------------------
ALTER TABLE student       DROP CONSTRAINT IF EXISTS aluno_idade_check;
ALTER TABLE student       DROP CONSTRAINT IF EXISTS aluno_tipo_plano_check;
ALTER TABLE student       DROP CONSTRAINT IF EXISTS aluno_role_check;
ALTER TABLE class_session DROP CONSTRAINT IF EXISTS aula_duracao_min_check;
ALTER TABLE class_session DROP CONSTRAINT IF EXISTS aula_capacidade_check;
ALTER TABLE class_session DROP CONSTRAINT IF EXISTS aula_status_check;
ALTER TABLE booking       DROP CONSTRAINT IF EXISTS reserva_status_check;


-- -----------------------------------------------------------------------------
-- 4. Convert stored enum string values from Portuguese to English
-- -----------------------------------------------------------------------------
UPDATE student        SET plan_type = 'PRIVATE'    WHERE plan_type = 'PARTICULAR';
UPDATE student        SET role      = 'STUDENT'    WHERE role      = 'ALUNO';

UPDATE class_session  SET status = 'ACTIVE'    WHERE status = 'ATIVA';
UPDATE class_session  SET status = 'CANCELLED' WHERE status = 'CANCELADA';

UPDATE booking        SET status = 'CONFIRMED' WHERE status = 'CONFIRMADA';
UPDATE booking        SET status = 'CANCELLED' WHERE status = 'CANCELADA';
UPDATE booking        SET status = 'WAITLIST'  WHERE status = 'LISTA_ESPERA';


-- -----------------------------------------------------------------------------
-- 5. Update column defaults to English values
-- -----------------------------------------------------------------------------
ALTER TABLE student       ALTER COLUMN role   SET DEFAULT 'STUDENT';
ALTER TABLE class_session ALTER COLUMN status SET DEFAULT 'ACTIVE';


-- -----------------------------------------------------------------------------
-- 6. Re-add CHECK constraints with English enum values and English names
-- -----------------------------------------------------------------------------
ALTER TABLE student ADD CONSTRAINT student_age_check        CHECK (age > 0 AND age < 120);
ALTER TABLE student ADD CONSTRAINT student_plan_type_check  CHECK (plan_type IN ('PRIVATE', 'TOTALPASS', 'WELLHUB'));
ALTER TABLE student ADD CONSTRAINT student_role_check        CHECK (role IN ('STUDENT', 'ADMIN'));

ALTER TABLE class_session ADD CONSTRAINT class_session_duration_min_check CHECK (duration_min > 0);
ALTER TABLE class_session ADD CONSTRAINT class_session_capacity_check      CHECK (capacity > 0);
ALTER TABLE class_session ADD CONSTRAINT class_session_status_check       CHECK (status IN ('ACTIVE', 'CANCELLED'));

ALTER TABLE booking ADD CONSTRAINT booking_status_check CHECK (status IN ('CONFIRMED', 'CANCELLED', 'WAITLIST'));


-- -----------------------------------------------------------------------------
-- 7. Drop and recreate indexes with English names
-- -----------------------------------------------------------------------------
DROP INDEX IF EXISTS idx_aula_data;
CREATE INDEX idx_class_session_start ON class_session (start_datetime);

DROP INDEX IF EXISTS idx_reserva_aluno;
CREATE INDEX idx_booking_student ON booking (student_id);


-- -----------------------------------------------------------------------------
-- 8. Rename the booking unique constraint
--    (columns were renamed above; the constraint now covers
--    class_session_id + student_id, we only rename the constraint itself)
-- -----------------------------------------------------------------------------
ALTER TABLE booking RENAME CONSTRAINT uq_reserva_aula_aluno TO uq_booking_class_session_student;
