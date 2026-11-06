package br.com.suryah.auth;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Simple in-memory rate limiter for the login and register endpoints.
 * Allows MAX_ATTEMPTS per IP within the WINDOW_MS time window.
 * When the limit is exceeded, returns 429 Too Many Requests.
 *
 * No external dependency — the state is per-JVM (fine for a single-instance deployment).
 * Entries are cleaned up lazily when accessed.
 */
@Component
@Order(1) // Run before the JWT filter
public class RateLimitFilter extends OncePerRequestFilter {

    private static final int MAX_ATTEMPTS = 10;
    private static final long WINDOW_MS = 60_000; // 1 minute

    // Tracks: IP -> {count, firstAttemptTimestamp}
    private final Map<String, RateEntry> attempts = new ConcurrentHashMap<>();

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String path = request.getRequestURI();

        // Only rate-limit auth endpoints
        if (!path.startsWith("/api/auth/")) {
            filterChain.doFilter(request, response);
            return;
        }

        String clientIp = getClientIp(request);
        String key = clientIp + ":" + path;

        RateEntry entry = attempts.compute(key, (k, existing) -> {
            long now = System.currentTimeMillis();
            if (existing == null || now - existing.timestamp > WINDOW_MS) {
                return new RateEntry(new AtomicInteger(1), now);
            }
            existing.count.incrementAndGet();
            return existing;
        });

        if (entry.count.get() > MAX_ATTEMPTS) {
            long retryAfter = (WINDOW_MS - (System.currentTimeMillis() - entry.timestamp)) / 1000;
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setHeader("Retry-After", String.valueOf(Math.max(1, retryAfter)));
            response.setContentType("application/json");
            response.getWriter().write(
                    "{\"error\":\"Too Many Requests\",\"message\":\"Muitas tentativas. Tente novamente em alguns segundos.\",\"status\":429}");
            return;
        }

        filterChain.doFilter(request, response);
    }

    private String getClientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            return xff.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private record RateEntry(AtomicInteger count, long timestamp) {}
}
