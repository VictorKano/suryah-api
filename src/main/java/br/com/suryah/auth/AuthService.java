package br.com.suryah.auth;

import br.com.suryah.student.Role;
import br.com.suryah.student.Student;
import br.com.suryah.student.StudentRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final StudentRepository studentRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(StudentRepository studentRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService) {
        this.studentRepository = studentRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    public StudentResponse register(RegisterRequest request) {
        if (request.name() == null || request.name().isBlank()) {
            throw new IllegalArgumentException("Name is required");
        }
        if (request.email() == null || request.email().isBlank()) {
            throw new IllegalArgumentException("Email is required");
        }
        if (request.password() == null || request.password().isBlank()) {
            throw new IllegalArgumentException("Password is required");
        }
        if (request.planType() == null) {
            throw new IllegalArgumentException("Plan type is required");
        }

        if (studentRepository.existsByEmail(request.email())) {
            throw new IllegalStateException("Este e-mail j\u00e1 est\u00e1 cadastrado.");
        }

        Student student = new Student();
        student.setName(request.name());
        student.setEmail(request.email());
        student.setPhone(request.phone());
        student.setAge(request.age());
        student.setPasswordHash(passwordEncoder.encode(request.password()));
        student.setPlanType(request.planType());
        student.setRole(Role.STUDENT);

        Student saved = studentRepository.save(student);

        return new StudentResponse(
                saved.getId(),
                saved.getName(),
                saved.getEmail(),
                saved.getPhone(),
                saved.getAge(),
                saved.getPlanType(),
                saved.getRole()
        );
    }

    public TokenResponse login(LoginRequest request) {
        Student student = studentRepository.findByEmail(request.email())
                .orElseThrow(() -> new IllegalArgumentException("Invalid email or password"));

        if (!passwordEncoder.matches(request.password(), student.getPasswordHash())) {
            throw new IllegalArgumentException("Invalid email or password");
        }

        String token = jwtService.generateToken(student.getId(), student.getRole().name());

        return new TokenResponse(token, student.getRole());
    }
}
