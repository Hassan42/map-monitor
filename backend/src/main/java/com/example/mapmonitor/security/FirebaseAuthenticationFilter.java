package com.example.mapmonitor.security;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.FirebaseToken;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

// Not a @Component on purpose: SecurityConfig builds this with `new` so it only
// runs inside the /api/** security chain. Making it a bean would make Spring Boot
// also auto-register (duplicate) it as a global servlet filter on /*, blocking static files.
public class FirebaseAuthenticationFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {
        String idToken = request.getHeader("Authorization");

        if (idToken == null || idToken.isEmpty()) {
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }

        try {
            // Uses the default FirebaseApp set up in FirebaseConfig
            FirebaseToken token = FirebaseAuth.getInstance().verifyIdToken(idToken.replace("Bearer ", ""));
            // TODO: We don't implement authorities yet
            //List<GrantedAuthority> authorities = getAuthoritiesFromToken(token);
            FirebaseAuthenticationToken authToken = new FirebaseAuthenticationToken(idToken, token, List.of());
            authToken.setAuthenticated(true);
            SecurityContextHolder.getContext().setAuthentication(authToken);
        } catch (FirebaseAuthException e) {
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid Firebase ID-Token");
            return;
        }

        filterChain.doFilter(request, response);
    }
}
