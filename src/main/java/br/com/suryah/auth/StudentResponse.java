package br.com.suryah.auth;

import br.com.suryah.student.PlanType;
import br.com.suryah.student.Role;

public record StudentResponse(
        Long id,
        String name,
        String email,
        String phone,
        Integer age,
        PlanType planType,
        Role role
) {}
