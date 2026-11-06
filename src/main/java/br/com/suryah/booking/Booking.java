package br.com.suryah.booking;

import br.com.suryah.classsession.ClassSession;
import br.com.suryah.student.Student;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;

@Entity
@Table(name = "booking",
       uniqueConstraints = @UniqueConstraint(name = "uq_booking_class_session_student", columnNames = {"class_session_id", "student_id"}))
@Getter
@Setter
@NoArgsConstructor
public class Booking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "class_session_id")
    private ClassSession classSession;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "student_id")
    private Student student;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private BookingStatus status = BookingStatus.CONFIRMED;

    /** Attendance mark set by an admin after the session.
     *  null = not yet marked, true = attended, false = no-show. */
    @Column(nullable = true)
    private Boolean attended;

    /** Set to true once the 12-hour reminder e-mail has been sent.
     *  Prevents duplicate reminders if the scheduler runs multiple times. */
    @Column(name = "reminder_sent", nullable = true)
    private Boolean reminderSent;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();
}
