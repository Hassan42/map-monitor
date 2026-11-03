package com.example.mapmonitor.repository;

import com.example.mapmonitor.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByFirebaseUid(String firebaseUid);
    Optional<User> findByUsername(String username);
    Optional<User> findByUsernameIgnoreCase(String username);
}