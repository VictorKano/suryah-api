package br.com.suryah.booking;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@RestController
public class BookingController {

    private final BookingService bookingService;
    private final BookingRepository bookingRepository;

    public BookingController(BookingService bookingService, BookingRepository bookingRepository) {
        this.bookingService = bookingService;
        this.bookingRepository = bookingRepository;
    }

    /**
     * Book a spot (or join the waitlist) in a class session.
     * Requires an authenticated student; resolves student ID from the JWT subject.
     */
    @PostMapping("/api/class-sessions/{id}/bookings")
    @PreAuthorize("hasRole('STUDENT')")
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public BookingResponse book(@PathVariable Long id, Authentication authentication) {
        Long studentId = resolveStudentId(authentication);
        try {
            Booking booking = bookingService.book(id, studentId);
            return toResponse(booking);
        } catch (jakarta.persistence.EntityNotFoundException e) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, e.getMessage());
        } catch (IllegalStateException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, e.getMessage());
        }
    }

    /**
     * Cancel own booking. Verifies ownership inside the service layer.
     */
    @DeleteMapping("/api/bookings/{id}")
    @PreAuthorize("hasRole('STUDENT')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void cancel(@PathVariable Long id, Authentication authentication) {
        Long studentId = resolveStudentId(authentication);
        try {
            bookingService.cancel(id, studentId);
        } catch (jakarta.persistence.EntityNotFoundException e) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, e.getMessage());
        } catch (IllegalStateException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, e.getMessage());
        }
    }

    /**
     * List the authenticated student's own bookings, newest first.
     */
    @GetMapping("/api/bookings")
    @PreAuthorize("hasRole('STUDENT')")
    @Transactional(readOnly = true)
    public List<BookingResponse> listOwn(Authentication authentication) {
        Long studentId = resolveStudentId(authentication);
        return bookingRepository.findByStudentIdOrderByCreatedAtDesc(studentId).stream()
                .map(this::toResponse)
                .toList();
    }

    /**
     * List all bookings for a specific session (admin only).
     * Ordered by status (CONFIRMED first, then WAITLIST) then by booking time.
     */
    @GetMapping("/api/class-sessions/{id}/bookings")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional(readOnly = true)
    public List<SessionBookingResponse> listForSession(@PathVariable Long id) {
        return bookingRepository
                .findByClassSessionIdOrderByStatusAscCreatedAtAsc(id)
                .stream()
                .filter(b -> b.getStatus() != BookingStatus.CANCELLED)
                .map(b -> new SessionBookingResponse(
                        b.getId(),
                        b.getStudent().getId(),
                        b.getStudent().getName(),
                        b.getStudent().getEmail(),
                        b.getStatus(),
                        b.getAttended(),
                        b.getCreatedAt()))
                .toList();
    }

    /**
     * Mark or unmark a student's attendance for a session (admin only).
     * PATCH /api/bookings/{id}/attendance with body {"attended": true|false|null}
     */
    @PatchMapping("/api/bookings/{id}/attendance")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public SessionBookingResponse markAttendance(
            @PathVariable Long id,
            @RequestBody AttendanceRequest request) {
        Booking booking = bookingRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found"));

        if (booking.getStatus() != BookingStatus.CONFIRMED) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "Attendance can only be marked for CONFIRMED bookings");
        }

        booking.setAttended(request.attended());
        Booking saved = bookingRepository.save(booking);

        return new SessionBookingResponse(
                saved.getId(),
                saved.getStudent().getId(),
                saved.getStudent().getName(),
                saved.getStudent().getEmail(),
                saved.getStatus(),
                saved.getAttended(),
                saved.getCreatedAt());
    }

    // --- helpers ---

    private Long resolveStudentId(Authentication authentication) {
        if (authentication == null || authentication.getPrincipal() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated");
        }
        Object principal = authentication.getPrincipal();
        if (principal instanceof Long id) {
            return id;
        }
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid authentication principal");
    }

    private BookingResponse toResponse(Booking booking) {
        return new BookingResponse(
                booking.getId(),
                booking.getClassSession().getId(),
                booking.getClassSession().getClassType().getName(),
                booking.getClassSession().getStartDateTime(),
                booking.getStatus(),
                booking.getCreatedAt()
        );
    }
}
