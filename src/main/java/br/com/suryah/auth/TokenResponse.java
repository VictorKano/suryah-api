package br.com.suryah.auth;

import br.com.suryah.student.Role;

public record TokenResponse(
        String token,
        Role role
) {}
