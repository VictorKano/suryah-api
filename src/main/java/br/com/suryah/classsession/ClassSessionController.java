package br.com.suryah.classsession;

import br.com.suryah.booking.BookingRepository;
import br.com.suryah.booking.BookingStatus;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;

@RestController
@RequestMapping("/api/class-sessions")
public class ClassSessionController {

    private final ClassSessionRepository classSessionRepository;
    private final BookingRepository bookingRepository;

    public ClassSessionController(ClassSessionRepository classSessionRepository,
                                  BookingRepository bookingRepository) {
        this.classSessionRepository = classSessionRepository;
        this.bookingRepository = bookingRepository;
    }

    @GetMapping
    public List<ClassSessionResponse> listUpcoming(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime to,
            Authentication authentication) {

        OffsetDateTime effectiveFrom = from != null ? from : OffsetDateTime.now(ZoneOffset.UTC);
        OffsetDateTime effectiveTo = to != null ? to : effectiveFrom.plusDays(30);

        Long studentId = resolveStudentId(authentication);

        return classSessionRepository.findUpcoming(effectiveFrom, effectiveTo).stream()
                .map(session -> toResponse(session, studentId))
                .toList();
    }

    @GetMapping("/{id}")
    public ClassSessionResponse getById(@PathVariable Long id, Authentication authentication) {
        ClassSession session = classSessionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Class session not found"));

        Long studentId = resolveStudentId(authentication);
        return toResponse(session, studentId);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ClassSessionResponse update(@PathVariable Long id,
                                       @RequestBody ClassSessionUpdateRequest request,
                                       Authentication authentication) {
        ClassSession session = classSessionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Class session not found"));

        if (request.capacity() != null) {
            if (request.capacity() <= 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Capacity must be greater than 0");
            }
            session.setCapacity(request.capacity());
        }

        if (request.status() != null) {
            session.setStatus(request.status());
        }

        ClassSession saved = classSessionRepository.save(session);
        return toResponse(saved, null);
    }

    // --- helpers ---

    private Long resolveStudentId(Authentication authentication) {
        if (authentication == null || authentication.getPrincipal() == null) {
            return null;
        }
        Object principal = authentication.getPrincipal();
        if (principal instanceof Long id) {
            return id;
        }
        return null;
    }

    private ClassSessionResponse toResponse(ClassSession session, Long studentId) {
        long confirmedCount = bookingRepository.countByClassSessionIdAndStatus(
                session.getId(), BookingStatus.CONFIRMED);
        long availableSpots = Math.max(0, session.getCapacity() - confirmedCount);

        String myBookingStatus = null;
        if (studentId != null) {
            myBookingStatus = bookingRepository
                    .findByClassSessionIdAndStudentId(session.getId(), studentId)
                    .filter(b -> b.getStatus() != BookingStatus.CANCELLED)
                    .map(b -> b.getStatus().name())
                    .orElse(null);
        }

        return new ClassSessionResponse(
                session.getId(),
                session.getClassType().getName(),
                session.getStartDateTime(),
                session.getDurationMin(),
                session.getCapacity(),
                confirmedCount,
                availableSpots,
                myBookingStatus
        );
    }
}
