package br.com.suryah.auth;

public record LoginRequest(
        String email,
        String password
) {}
