package br.com.suryah.auth;

import br.com.suryah.student.PlanType;

public record RegisterRequest(
        String name,
        String email,
        String phone,
        Integer age,
        String password,
        PlanType planType
) {}
