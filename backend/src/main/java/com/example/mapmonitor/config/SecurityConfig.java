package com.example.mapmonitor.config;

import com.example.mapmonitor.security.FirebaseAuthenticationFilter;
import com.example.mapmonitor.security.RateLimitFilter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {

        // securityMatcher scopes this whole chain to /api/**, so static files
        // like index.html are served without going through auth at all.
        http.securityMatcher("/api/**")
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(AbstractHttpConfigurer::disable)
                .authorizeHttpRequests(auth -> auth
                        // reading one map and its contents is open to visitors; MapService still only
                        // serves them a public map's published version (drafts need the owner)
                        .requestMatchers(HttpMethod.GET,
                                "/api/maps/public",
                                "/api/maps/{mapId}",
                                "/api/maps/{mapId}/events",
                                "/api/maps/{mapId}/factions",
                                "/api/maps/{mapId}/territories",
                                "/api/maps/{mapId}/annotations",
                                "/api/maps/{mapId}/layers").permitAll()
                        .anyRequest().authenticated()
                )
                .addFilterBefore(new FirebaseAuthenticationFilter(), UsernamePasswordAuthenticationFilter.class)
                // after the Firebase filter, since it needs to know who is signed in
                .addFilterAfter(new RateLimitFilter(visitorLimit, userLimit), FirebaseAuthenticationFilter.class);

        return http.build();
    }

    // the frontend's addresses, from app.cors.allowed-origins (comma-separated): the dev server, the
    // production preview, and once deployed the real site (e.g. via the APP_CORS_ALLOWED_ORIGINS env var)
    @Value("${app.cors.allowed-origins}")
    private List<String> allowedOrigins;

    @Value("${app.rate-limit.visitor}")
    private int visitorLimit;

    @Value("${app.rate-limit.user}")
    private int userLimit;

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(allowedOrigins);
        config.setAllowedMethods(List.of("*"));
        config.setAllowedHeaders(List.of("*"));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}