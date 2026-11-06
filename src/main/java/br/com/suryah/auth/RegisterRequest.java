package br.com.suryah.auth;

import br.com.suryah.student.PlanType;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank(message = "Name is required") String name,
        // Email is optional when registered by an admin — validated for format when present
        @Email(message = "Invalid email format") String email,
        String phone,
        Integer age,
        @NotBlank(message = "Password is required") @Size(min = 6, message = "Password must be at least 6 characters") String password,
        PlanType planType
) {}
