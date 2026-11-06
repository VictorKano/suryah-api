package br.com.suryah.classsession;

/**
 * Snapshot of a class session for use in @Async email methods.
 */
public record SessionSnapshot(String classTypeName, String formattedDateTime) {}
