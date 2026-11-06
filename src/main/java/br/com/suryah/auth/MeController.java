package br.com.suryah.auth;

import br.com.suryah.student.Student;
import br.com.suryah.student.StudentRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/me")
public class MeController {

    private final StudentRepository studentRepository;
    private final PasswordEncoder passwordEncoder;

    public MeController(StudentRepository studentRepository,
                        PasswordEncoder passwordEncoder) {
        this.studentRepository = studentRepository;
        this.passwordEncoder = passwordEncoder;
    }

    /** Returns the authenticated user's profile. */
    @GetMapping
    @Transactional(readOnly = true)
    public StudentResponse me(Authentication authentication) {
        Student student = resolve(authentication);
        return toResponse(student);
    }

    /** Updates the authenticated user's profile. */
    @PutMapping
    @Transactional
    public StudentResponse update(Authentication authentication,
                                  @RequestBody UpdateProfileRequest request) {
        Student student = resolve(authentication);

        // Name
        if (request.name() != null && !request.name().isBlank()) {
            student.setName(request.name());
        }

        // Email — check uniqueness if changing
        if (request.email() != null && !request.email().isBlank()
                && !request.email().equalsIgnoreCase(student.getEmail())) {
            if (studentRepository.existsByEmail(request.email())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Este e-mail j\u00e1 est\u00e1 cadastrado.");
            }
            student.setEmail(request.email());
        }

        if (request.phone() != null) {
            student.setPhone(request.phone());
        }

        if (request.age() != null) {
            student.setAge(request.age());
        }

        if (request.planType() != null) {
            student.setPlanType(request.planType());
        }

        // Password — only change if newPassword is provided
        if (request.newPassword() != null && !request.newPassword().isBlank()) {
            if (request.currentPassword() == null || request.currentPassword().isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Informe a senha atual para alter\u00e1-la.");
            }
            if (!passwordEncoder.matches(request.currentPassword(), student.getPasswordHash())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Senha atual incorreta.");
            }
            student.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        }

        Student saved = studentRepository.save(student);
        return toResponse(saved);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private Student resolve(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof Long id)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated");
        }
        return studentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student not found"));
    }

    private StudentResponse toResponse(Student student) {
        return new StudentResponse(
                student.getId(),
                student.getName(),
                student.getEmail(),
                student.getPhone(),
                student.getAge(),
                student.getPlanType(),
                student.getRole()
        );
    }
}
