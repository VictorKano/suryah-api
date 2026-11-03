package br.com.suryah.classsession;

public record ClassSessionUpdateRequest(
        Integer capacity,
        ClassStatus status
) {}
