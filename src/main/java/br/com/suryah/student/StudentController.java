package br.com.suryah.student;

import br.com.suryah.booking.BookingRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/students")
public class StudentController {

    private final StudentRepository studentRepository;
    private final BookingRepository bookingRepository;

    public StudentController(StudentRepository studentRepository,
                              BookingRepository bookingRepository) {
        this.studentRepository = studentRepository;
        this.bookingRepository = bookingRepository;
    }

    // ── Lightweight list (fixed-enrollment dropdown) ──────────────────────────

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional(readOnly = true)
    public List<StudentSummary> list(@RequestParam(required = false) String search) {
        List<Student> students = (search != null && !search.isBlank())
                ? studentRepository.findByAtivoTrueAndNameContainingIgnoreCaseOrderByNameAsc(search)
                : studentRepository.findByAtivoTrueOrderByNameAsc();
        return students.stream()
                .map(s -> new StudentSummary(s.getId(), s.getName(), s.getEmail()))
                .toList();
    }

    // ── Full detail list (admin Alunos page) ──────────────────────────────────

    @GetMapping("/details")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional(readOnly = true)
    public List<StudentDetail> listDetails(@RequestParam(required = false) String search) {
        List<Student> students = (search != null && !search.isBlank())
                ? studentRepository.findByNameContainingIgnoreCaseOrderByNameAsc(search)
                : studentRepository.findAllByOrderByNameAsc();
        return students.stream().map(this::toDetail).toList();
    }

    // ── Edit student (admin) ──────────────────────────────────────────────────

    @PatchMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public StudentDetail update(@PathVariable Long id,
                                @Valid @RequestBody AdminUpdateStudentRequest request) {
        Student student = studentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student not found"));

        if (request.name() != null && !request.name().isBlank()) {
            student.setName(request.name());
        }
        if (request.email() != null && !request.email().isBlank()
                && !request.email().equalsIgnoreCase(student.getEmail())) {
            if (studentRepository.existsByEmail(request.email())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Este e-mail j\u00e1 est\u00e1 cadastrado.");
            }
            student.setEmail(request.email());
        }
        if (request.phone() != null) student.setPhone(request.phone());
        if (request.age()   != null) student.setAge(request.age());
        if (request.planType() != null) student.setPlanType(request.planType());

        return toDetail(studentRepository.save(student));
    }

    // ── Toggle active / inactive ──────────────────────────────────────────────

    @PatchMapping("/{id}/active")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public StudentDetail setActive(@PathVariable Long id,
                                   @RequestBody ActiveStudentRequest request) {
        Student student = studentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student not found"));
        student.setAtivo(request.active());
        return toDetail(studentRepository.save(student));
    }

    // ── Student booking history (admin) ───────────────────────────────────────

    @GetMapping("/{id}/bookings")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional(readOnly = true)
    public List<StudentBookingEntry> bookingHistory(@PathVariable Long id) {
        studentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student not found"));

        return bookingRepository.findByStudentIdOrderByCreatedAtDesc(id).stream()
                .map(b -> new StudentBookingEntry(
                        b.getId(),
                        b.getClassSession().getId(),
                        b.getClassSession().getClassType().getName(),
                        b.getClassSession().getStartDateTime(),
                        b.getStatus(),
                        b.getAttended(),
                        b.getCreatedAt()
                ))
                .toList();
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private StudentDetail toDetail(Student s) {
        return new StudentDetail(
                s.getId(), s.getName(), s.getEmail(), s.getPhone(),
                s.getAge(), s.getPlanType(), s.isAtivo(), s.getCreatedAt());
    }

    /** Inner DTO for booking history entries. */
    public record StudentBookingEntry(
            Long bookingId,
            Long sessionId,
            String classTypeName,
            OffsetDateTime startDateTime,
            br.com.suryah.booking.BookingStatus status,
            Boolean attended,
            OffsetDateTime createdAt
    ) {}
}
