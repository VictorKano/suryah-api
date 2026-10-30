# Suryah Scheduling — Requirements

## Overview

A scheduling system for **Suryah**, a yoga studio. Students book class spots from their phone or computer; the studio admin manages recurring classes, class types, capacity, and fixed enrollments.

The backend is Java 21 + Spring Boot 3.4 with PostgreSQL.

---

## Requirements

### Requirement 1: Class Booking & Cancellation

**User Story:** As a student, I want to book a spot in an available class and cancel my booking, so that I can manage my attendance.

**Acceptance Criteria:**
- A student can book one spot per class session.
- Duplicate bookings for the same class by the same student are rejected.
- A student can cancel a confirmed booking.
- Booking is rejected when the class is full (capacity reached).
- When a class is full, the student can join the waitlist.
- Waitlisted students are auto-promoted when a confirmed booking is cancelled.
- Concurrent bookings cannot oversell a class (pessimistic lock guarantees capacity is never exceeded).

### Requirement 2: Student Registration

**User Story:** As a student, I want to register with my personal info and plan type, so that I can log in and book classes.

**Acceptance Criteria:**
- Registration requires: name, email, phone, age, password, plan type.
- Plan type is one of: `PRIVATE`, `TOTALPASS`, `WELLHUB`.
- Email must be unique.
- Password is stored as a hash (never plaintext).
- Registered students get the `STUDENT` role by default.
- Students can log in and receive a JWT.

### Requirement 3: Recurring Class Management

**User Story:** As an admin, I want to define recurring weekly classes and generate individual sessions, so that students can book without me creating each class manually.

**Acceptance Criteria:**
- An admin can create a recurring class: day of week, start time, duration, class type, capacity, active flag.
- An admin can edit a recurring class (change day, time, capacity, etc.).
- An admin can deactivate a recurring class (stops future generation, existing sessions remain).
- An admin can generate class sessions for a date range from active recurring classes.
- Each generated session inherits the recurring class's type, duration, and capacity.
- Sessions can be individually edited (e.g., change capacity for one specific day).

### Requirement 4: Capacity Management

**User Story:** As an admin, I want to set and change how many students each class holds, so that I can adapt to room size or demand.

**Acceptance Criteria:**
- Every recurring class has a capacity (students per session).
- Every generated session inherits the capacity but can be overridden individually.
- Available spots = capacity − confirmed bookings (waitlist does not count against capacity).

### Requirement 5: Class Type Management

**User Story:** As an admin, I want to register and manage class types (e.g., Hatha Yoga, Hot Yoga, Candlelight), so that students know what to expect.

**Acceptance Criteria:**
- An admin can create a class type with a name, description, and active flag.
- An admin can edit or deactivate a class type.
- Deactivated class types do not appear in student-facing listings.
- Students can view active class types.

### Requirement 6: Student Class View

**User Story:** As a logged-in student, I want to see upcoming classes with their type, date, time, and available spots, so that I can decide what to book.

**Acceptance Criteria:**
- A student sees a list of upcoming active class sessions.
- Each entry shows: class type name, date, start time, duration, total/available spots.
- A student can see whether they already have a booking (confirmed or waitlist) for a given session.
- Sessions can be filtered by date range.

### Requirement 7: Fixed Student Enrollment

**User Story:** As an admin, I want to mark students as "fixed" in a recurring class, so that they get a guaranteed spot every week without rebooking.

**Acceptance Criteria:**
- An admin can enroll a student as fixed in a recurring class.
- Fixed students receive an automatic confirmed booking when sessions are generated.
- A fixed enrollment guarantees a spot as long as the student is active and the recurring class is active.
- An admin can remove a fixed enrollment.
- A fixed student can still cancel an individual session booking without losing their fixed status.

---

## Non-Functional Requirements

### Authentication & Authorization

- JWT-based authentication via Spring Security.
- Two roles: `STUDENT` and `ADMIN`.
- Admin endpoints are protected (require `ADMIN` role).
- Student endpoints require authentication and scope data to the logged-in student.

### Concurrency

- Booking a spot uses a database-level pessimistic lock on the class session row to prevent overselling.
- Waitlist promotion on cancellation runs within the same locked transaction.

### Deployment (Free Tier)

- **Database:** Neon (managed PostgreSQL, free tier).
- **Backend:** Render (free tier, Docker/Java).
- **Frontend:** Vercel (static React build, free tier).
