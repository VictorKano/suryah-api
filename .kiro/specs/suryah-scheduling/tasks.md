# Suryah Scheduling — Implementation Tasks

Tasks are ordered by dependency. Each task ends with a build verification step.

---

## Task 1: Rename entities and packages to English

Rename all existing Portuguese entities, enums, repositories, packages, and JPA column mappings to English. Create V2 Flyway migration to rename DB tables, columns, constraints, and enum values.

- [x] 1.1 Rename package `br.com.suryah.aluno` → `br.com.suryah.student`
  - Rename `Aluno.java` → `Student.java`, class `Aluno` → `Student`
  - Rename `AlunoRepository.java` → `StudentRepository.java`, interface `AlunoRepository` → `StudentRepository`
  - Rename `TipoPlano.java` → `PlanType.java`, enum `TipoPlano` → `PlanType`, value `PARTICULAR` → `PRIVATE`
  - Rename `Role` value `ALUNO` → `STUDENT`
  - Update `@Column(name=...)` mappings: `nome`→`name`, `telefone`→`phone`, `idade`→`age`, `tipo_plano`→`plan_type`, `senha_hash`→`password_hash`, `criado_em`→`created_at`
  - Update `@Table(name = "aluno")` → `@Table(name = "student")`
- [x] 1.2 Rename package `br.com.suryah.aula` → `br.com.suryah.classsession`
  - Rename `Aula.java` → `ClassSession.java`, class `Aula` → `ClassSession`
  - Rename `AulaRepository.java` → `ClassSessionRepository.java`, interface `AulaRepository` → `ClassSessionRepository`
  - Rename `StatusAula.java` → `ClassStatus.java`, enum `StatusAula` → `ClassStatus`, values `ATIVA`→`ACTIVE`, `CANCELADA`→`CANCELLED`
  - Update `@Column(name=...)` mappings: `tipo_aula_id`→`class_type_id`, `data_hora_inicio`→`start_datetime`, `duracao_min`→`duration_min`, `capacidade`→`capacity`
  - Update `@Table(name = "aula")` → `@Table(name = "class_session")`
  - Update repository queries to use new field names (`dataHoraInicio`→`startDateTime`, etc.)
- [x] 1.3 Rename package `br.com.suryah.reserva` → `br.com.suryah.booking`
  - Rename `Reserva.java` → `Booking.java`, class `Reserva` → `Booking`
  - Rename `ReservaRepository.java` → `BookingRepository.java`, interface `ReservaRepository` → `BookingRepository`
  - Rename `StatusReserva.java` → `BookingStatus.java`, enum `StatusReserva` → `BookingStatus`, values `CONFIRMADA`→`CONFIRMED`, `CANCELADA`→`CANCELLED`, `LISTA_ESPERA`→`WAITLIST`
  - Update `@Column(name=...)` mappings: `aula_id`→`class_session_id`, `aluno_id`→`student_id`, `criado_em`→`created_at`
  - Update `@Table(name = "reserva")` → `@Table(name = "booking")`
  - Update `@UniqueConstraint` name and column names
- [x] 1.4 Rename package `br.com.suryah.tipoaula` → `br.com.suryah.classtype`
  - Rename `TipoAula.java` → `ClassType.java`, class `TipoAula` → `ClassType`
  - Rename `TipoAulaRepository.java` → `ClassTypeRepository.java`, interface `TipoAulaRepository` → `ClassTypeRepository`
  - Rename `TipoAulaController.java` → `ClassTypeController.java`, class `TipoAulaController` → `ClassTypeController`, path `/api/tipos-aula` → `/api/class-types`
  - Update `@Column(name=...)` mappings: `nome`→`name`, `descricao`→`description`, `ativo`→`active`
  - Update `@Table(name = "tipo_aula")` → `@Table(name = "class_type")`
- [x] 1.5 Create `V2__rename_to_english.sql` Flyway migration
  - `ALTER TABLE tipo_aula RENAME TO class_type` (rename columns: nome→name, descricao→description, ativo→active)
  - `ALTER TABLE aluno RENAME TO student` (rename columns: nome→name, telefone→phone, idade→age, tipo_plano→plan_type, senha_hash→password_hash, criado_em→created_at)
  - `ALTER TABLE aula RENAME TO class_session` (rename columns: tipo_aula_id→class_type_id, data_hora_inicio→start_datetime, duracao_min→duration_min, capacidade→capacity)
  - `ALTER TABLE reserva RENAME TO booking` (rename columns: aula_id→class_session_id, aluno_id→student_id, criado_em→created_at)
  - Drop and re-add CHECK constraints with English enum values on all tables
  - `UPDATE` statements to convert stored enum strings: `PARTICULAR`→`PRIVATE`, `ALUNO`→`STUDENT`, `ATIVA`→`ACTIVE`, `CANCELADA`→`CANCELLED`, `CONFIRMADA`→`CONFIRMED`, `LISTA_ESPERA`→`WAITLIST`
  - Drop and recreate indexes: `idx_aula_data`→`idx_class_session_start`, `idx_reserva_aluno`→`idx_booking_student`
- [x] 1.6 Verify build passes: `mvn compile`

---

## Task 2: Add new entities and V3 migration

Create `RecurringClass` and `FixedEnrollment` entities, add `recurringClass` relation to `ClassSession`, and create V3 migration.

- [ ] 2.1 Create `br.com.suryah.recurringclass` package
  - Create `RecurringClass.java` entity (id, dayOfWeek as `java.time.DayOfWeek`, startTime as `LocalTime`, durationMin, classType ManyToOne, capacity, active)
  - Create `RecurringClassRepository.java` (JpaRepository + findByActiveTrue, findByDayOfWeekAndActiveTrue)
- [ ] 2.2 Create `br.com.suryah.fixedenrollment` package
  - Create `FixedEnrollment.java` entity (id, recurringClass ManyToOne, student ManyToOne, active, createdAt)
  - Create `FixedEnrollmentRepository.java` (JpaRepository + findByRecurringClassIdAndActiveTrue, existsByRecurringClassIdAndStudentId)
- [ ] 2.3 Add `recurringClass` field to `ClassSession`
  - `@ManyToOne(fetch = FetchType.LAZY)` nullable, `@JoinColumn(name = "recurring_class_id")`
- [ ] 2.4 Create `V3__recurring_class_and_fixed_enrollment.sql` migration
  - `CREATE TABLE recurring_class` with all columns and unique constraint `(day_of_week, start_time, class_type_id)`
  - `CREATE TABLE fixed_enrollment` with all columns and unique constraint `(recurring_class_id, student_id)`
  - `ALTER TABLE class_session ADD COLUMN recurring_class_id BIGINT REFERENCES recurring_class (id)`
  - Insert admin user: `INSERT INTO student (name, email, phone, age, plan_type, password_hash, role, active) VALUES (...)` using `ADMIN_EMAIL` and `ADMIN_PASSWORD_HASH` env vars (or sensible defaults for dev)
- [ ] 2.5 Verify build passes: `mvn compile`

---

## Task 3: Security infrastructure

Add Spring Security and JWT dependencies, create the security configuration and JWT filter.

- [ ] 3.1 Add dependencies to `pom.xml`
  - `spring-boot-starter-security`
  - `jjwt-api` 0.12.6
  - `jjwt-impl` 0.12.6 (runtime)
  - `jjwt-jackson` 0.12.6 (runtime)
- [ ] 3.2 Create `br.com.suryah.auth` package
  - Create `JwtService.java` — `generateToken(Long studentId, String role)`, `validateToken(String token)`, `extractStudentId(String token)`, `extractRole(String token)` using jjwt with a configurable secret key (from `jwt.secret` property)
  - Create `JwtAuthenticationFilter.java` — extends `OncePerRequestFilter`, extracts Bearer token from Authorization header, validates via `JwtService`, sets `Authentication` in `SecurityContextHolder`
- [ ] 3.3 Create `SecurityConfig.java`
  - `SecurityFilterChain` bean: permit `/api/auth/**`, authenticate all others, add JWT filter before `UsernamePasswordAuthenticationFilter`, disable CSRF, stateless session
  - `PasswordEncoder` bean: `BCryptPasswordEncoder`
  - Enable `@EnableMethodSecurity` for `@PreAuthorize` support
- [ ] 3.4 Add JWT config to `application.yml`
  - `jwt.secret` property (default to a dev value, override via env var for prod)
  - `jwt.expiration-hours` (default 24)
- [ ] 3.5 Verify build passes: `mvn compile`

---

## Task 4: Auth endpoints (register and login)

Create the registration and login endpoints with DTOs and service logic.

- [ ] 4.1 Create DTOs (as Java records in `br.com.suryah.auth`)
  - `RegisterRequest` (name, email, phone, age, password, planType)
  - `LoginRequest` (email, password)
  - `TokenResponse` (token, role)
  - `StudentResponse` (id, name, email, phone, age, planType, role) — no password
- [ ] 4.2 Create `AuthService.java`
  - `register(RegisterRequest)`: validate, check email uniqueness via `StudentRepository.existsByEmail`, encode password, save `Student` with `STUDENT` role, return `StudentResponse`
  - `login(LoginRequest)`: find student by email, verify password with `PasswordEncoder.matches`, generate JWT via `JwtService`, return `TokenResponse`
  - Throw clear exceptions on invalid credentials / duplicate email
- [ ] 4.3 Create `AuthController.java`
  - `POST /api/auth/register` → `StudentResponse`
  - `POST /api/auth/login` → `TokenResponse`
- [ ] 4.4 Verify build passes: `mvn compile`

---

## Task 5: Class Type CRUD (admin)

Add create, update, and deactivate endpoints to `ClassTypeController`.

- [ ] 5.1 Create DTOs in `br.com.suryah.classtype`
  - `ClassTypeRequest` (name, description)
  - `ClassTypeResponse` (id, name, description, active)
- [ ] 5.2 Add admin endpoints to `ClassTypeController`
  - `POST /api/class-types` — create, `@PreAuthorize("hasRole('ADMIN')")`, validate name uniqueness
  - `PUT /api/class-types/{id}` — update name/description, `@PreAuthorize("hasRole('ADMIN')")`
  - `DELETE /api/class-types/{id}` — set active=false (soft delete), `@PreAuthorize("hasRole('ADMIN')")`
  - Update existing `GET /api/class-types` to return `ClassTypeResponse` DTOs instead of entities
- [ ] 5.3 Add repository methods as needed (`existsByName`, `findById`, `save`)
- [ ] 5.4 Verify build passes: `mvn compile`

---

## Task 6: Recurring Class CRUD (admin)

Create controller, service, DTOs, and repository methods for recurring class management.

- [ ] 6.1 Create DTOs in `br.com.suryah.recurringclass`
  - `RecurringClassRequest` (dayOfWeek, startTime, durationMin, classTypeId, capacity)
  - `RecurringClassResponse` (id, dayOfWeek, startTime, durationMin, classType name, capacity, active)
- [ ] 6.2 Add repository methods to `RecurringClassRepository`
  - `findByActiveTrueOrderByDayOfWeekAscStartTimeAsc`
  - `existsByDayOfWeekAndStartTimeAndClassTypeId` (for uniqueness validation)
- [ ] 6.3 Create `RecurringClassController.java`
  - `GET /api/recurring-classes` — list all (admin)
  - `POST /api/recurring-classes` — create, validate class type exists and is active, validate unique slot constraint
  - `PUT /api/recurring-classes/{id}` — update fields
  - `DELETE /api/recurring-classes/{id}` — set active=false (soft delete)
  - All endpoints `@PreAuthorize("hasRole('ADMIN')")`
- [ ] 6.4 Verify build passes: `mvn compile`

---

## Task 7: Class Session endpoints

Create the student-facing agenda endpoints with availability calculation and booking status.

- [ ] 7.1 Create DTOs in `br.com.suryah.classsession`
  - `ClassSessionResponse` (id, classTypeName, startDateTime, durationMin, capacity, confirmedCount, availableSpots, myBookingStatus)
  - `ClassSessionUpdateRequest` (capacity, status) — for admin edits
- [ ] 7.2 Add repository methods to `ClassSessionRepository`
  - `findUpcoming(OffsetDateTime from, OffsetDateTime to)` — join fetch classType, filter status=ACTIVE, order by startDateTime (rename existing `findAgenda`)
  - Keep `findByIdForUpdate` (already exists, just renamed)
- [ ] 7.3 Create `ClassSessionController.java`
  - `GET /api/class-sessions` — list upcoming with `from`/`to` query params, compute availableSpots and myBookingStatus per session
  - `GET /api/class-sessions/{id}` — detail with availability and caller's booking status
  - `PUT /api/class-sessions/{id}` — admin edit (override capacity, cancel session), `@PreAuthorize("hasRole('ADMIN')")`
- [ ] 7.4 Create availability logic
  - Method to count confirmed bookings per session (via `BookingRepository.countByClassSessionIdAndStatus`)
  - Method to find caller's booking for a session (via `BookingRepository.findByClassSessionIdAndStudentId`)
- [ ] 7.5 Verify build passes: `mvn compile`

---

## Task 8: Booking service and endpoints

Create the booking/cancellation service with pessimistic locking and waitlist promotion, plus controller endpoints.

- [ ] 8.1 Create DTOs in `br.com.suryah.booking`
  - `BookingResponse` (id, classSessionId, classTypeName, startDateTime, status, createdAt)
- [ ] 8.2 Add repository methods to `BookingRepository`
  - `countByClassSessionIdAndStatus(Long, BookingStatus)` — rename existing
  - `findByClassSessionIdAndStudentId(Long, Long)` — rename existing
  - `findFirstByClassSessionIdAndStatusOrderByCreatedAtAsc(Long, BookingStatus)` — find oldest waitlist entry for promotion
  - `findByStudentIdOrderByCreatedAtDesc(Long)` — list student's bookings
- [ ] 8.3 Create `BookingService.java`
  - `book(Long sessionId, Long studentId)`: lock session via `findByIdForUpdate`, validate ACTIVE, reject duplicate booking, count confirmed, create CONFIRMED if space else WAITLIST
  - `cancel(Long bookingId, Long studentId)`: lock session, find booking, verify ownership, if CONFIRMED → set CANCELLED + promote oldest WAITLIST to CONFIRMED, if WAITLIST → set CANCELLED
  - Both methods `@Transactional`
- [ ] 8.4 Create `BookingController.java`
  - `POST /api/class-sessions/{id}/bookings` — book a spot, resolve student from JWT
  - `DELETE /api/bookings/{id}` — cancel own booking, verify ownership
  - `GET /api/bookings` — list own bookings
- [ ] 8.5 Verify build passes: `mvn compile`

---

## Task 9: Fixed Enrollment CRUD (admin)

Create controller, DTOs, and repository methods for managing fixed enrollments.

- [ ] 9.1 Create DTOs in `br.com.suryah.fixedenrollment`
  - `FixedEnrollmentRequest` (studentId)
  - `FixedEnrollmentResponse` (id, studentId, studentName, recurringClassId, active, createdAt)
- [ ] 9.2 Add repository methods to `FixedEnrollmentRepository`
  - `findByRecurringClassIdAndActiveTrue(Long)` — list active fixed students
  - `existsByRecurringClassIdAndStudentIdAndActiveTrue(Long, Long)` — duplicate check
- [ ] 9.3 Create `FixedEnrollmentController.java`
  - `GET /api/recurring-classes/{id}/fixed-enrollments` — list fixed students
  - `POST /api/recurring-classes/{id}/fixed-enrollments` — enroll student as fixed, validate recurring class active and student exists/active, reject duplicates
  - `DELETE /api/fixed-enrollments/{id}` — remove (set active=false or delete)
  - All endpoints `@PreAuthorize("hasRole('ADMIN')")`
- [ ] 9.4 Verify build passes: `mvn compile`

---

## Task 10: Session generation

Create the session generation service that produces class sessions from recurring classes and auto-books fixed enrollments.

- [ ] 10.1 Create `GenerateSessionsRequest` DTO (from: LocalDate, to: LocalDate) in `br.com.suryah.recurringclass`
- [ ] 10.2 Create generation logic (in `RecurringClassService` or a dedicated `SessionGenerationService`)
  - For each active `RecurringClass`: for each date in [from, to] matching `dayOfWeek`:
    - Compute `startDateTime` = combine(date, recurringClass.startTime) at `America/Sao_Paulo` zone
    - Check idempotency: skip if `ClassSession` already exists for (recurringClassId, startDateTime)
    - Create `ClassSession` with inherited classType, durationMin, capacity
    - For each active `FixedEnrollment`: create `Booking` with CONFIRMED status, up to capacity; overflow gets WAITLIST
  - Return summary (sessions created, skipped, fixed bookings created)
- [ ] 10.3 Wire endpoint `POST /api/recurring-classes/generate` in `RecurringClassController`, `@PreAuthorize("hasRole('ADMIN')")`
- [ ] 10.4 Verify build passes: `mvn compile`

---

## Task 11: Global exception handler and integration tests

Add consistent error responses and integration tests for the core flows.

- [ ] 11.1 Create `br.com.suryah.common.exception.GlobalExceptionHandler.java`
  - `@RestControllerAdvice` handling: `EntityNotFoundException` (404), `IllegalStateException` / business rule violations (409), `MethodArgumentNotValidException` (400), `AccessDeniedException` (403), generic fallback (500)
  - Consistent error response body: `{ "error": "...", "message": "...", "status": 404 }`
- [ ] 11.2 Create integration test: booking flow
  - Testcontainers + PostgreSQL
  - Register student, create class type, create session, book (CONFIRMED), fill to capacity, next booking goes to WAITLIST, cancel a confirmed booking → waitlist auto-promoted
  - Assert capacity never exceeded, waitlist promotion correct
- [ ] 11.3 Create integration test: session generation
  - Create recurring class (e.g., MONDAY 07:00), add fixed enrollments, generate for a 2-week range
  - Assert sessions created on correct days, fixed students auto-booked as CONFIRMED, idempotent on repeat call
- [ ] 11.4 Run full test suite: `mvn test` — all tests pass
