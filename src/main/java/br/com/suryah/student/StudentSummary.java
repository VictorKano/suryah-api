package br.com.suryah.student;

/**
 * Lightweight student representation for the fixed-enrollment search dropdown.
 * Excludes sensitive fields like password hash.
 */
public record StudentSummary(Long id, String name, String email) {}
