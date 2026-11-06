package br.com.suryah.classtype;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ClassTypeRepository extends JpaRepository<ClassType, Long> {
    List<ClassType> findAllByOrderByName();
    boolean existsByName(String name);
}
