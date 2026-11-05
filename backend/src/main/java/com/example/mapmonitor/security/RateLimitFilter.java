package com.example.mapmonitor.security;

import io.github.bucket4j.Bucket;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

// One bucket per person. Not a @Component, same reason as FirebaseAuthenticationFilter
public class RateLimitFilter extends OncePerRequestFilter {

    private static final int MAX_BUCKETS = 100_000;

    private final int visitorLimit;
    private final int userLimit;
    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    public RateLimitFilter(int visitorLimit, int userLimit) {
        this.visitorLimit = visitorLimit;
        this.userLimit = userLimit;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        boolean signedIn = auth instanceof FirebaseAuthenticationToken;
        String key = signedIn ? auth.getName() : clientIp(request);
        int limit = signedIn ? userLimit : visitorLimit;

        // so memory can't grow forever: everyone just starts again with a full bucket
        if (buckets.size() > MAX_BUCKETS) {
            buckets.clear();
        }

        Bucket bucket = buckets.computeIfAbsent(key, k -> Bucket.builder()
                .addLimit(l -> l.capacity(limit).refillGreedy(limit, Duration.ofMinutes(1)))
                .build());

        if (!bucket.tryConsume(1)) {
            response.setStatus(429);
            response.setHeader("Retry-After", "60");
            response.getWriter().write("Too many requests, try again in a minute");
            return;
        }

        filterChain.doFilter(request, response);
    }

    // Railway sits in front of the app, so getRemoteAddr() is Railway's address, not the visitor's
    private String clientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Real-IP");
        return ip != null ? ip : request.getRemoteAddr();
    }
}
