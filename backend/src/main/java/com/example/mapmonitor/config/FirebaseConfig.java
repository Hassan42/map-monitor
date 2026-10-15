package com.example.mapmonitor.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.auth.FirebaseAuth;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;

import java.io.IOException;
import java.io.InputStream;

@Configuration
public class FirebaseConfig {

    private static final Logger log = LoggerFactory.getLogger(FirebaseConfig.class);

    @Value("${firebase.service-account-path}")
    private Resource serviceAccountResource;

    @Bean
    public FirebaseApp initialize() throws IOException {
        try (InputStream serviceAccountStream = serviceAccountResource.getInputStream()) {
            FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.fromStream(serviceAccountStream))
                    .build();
            log.info("Firebase is initialized.");
            return FirebaseApp.initializeApp(options);
        } catch (IOException e) {
            log.error("Firebase config error", e);
            throw e;
        }
    }

    @Bean
    public FirebaseAuth firebaseAuth(FirebaseApp firebaseApp) {
        return FirebaseAuth.getInstance(firebaseApp);
    }
}