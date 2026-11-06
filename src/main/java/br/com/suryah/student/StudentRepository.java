package br.com.suryah.student;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface StudentRepository extends JpaRepository<Student, Long> {
    Optional<Student> findByEmail(String email);
    boolean existsByEmail(String email);

    List<Student> findByAtivoTrueOrderByNameAsc();
    List<Student> findByAtivoTrueAndNameContainingIgnoreCaseOrderByNameAsc(String name);

    // Full listing (includes inactive) for admin student detail page
    List<Student> findAllByOrderByNameAsc();
    List<Student> findByNameContainingIgnoreCaseOrderByNameAsc(String name);
}
