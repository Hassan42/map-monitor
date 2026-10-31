package com.example.mapmonitor.service;

import com.example.mapmonitor.model.User;
import com.example.mapmonitor.repository.UserRepository;
import org.springframework.stereotype.Service;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public User syncUser(String firebaseUid, String username) {

        userRepository.findByUsername(username).ifPresent(existingUser -> {
            if (!existingUser.getFirebaseUid().equals(firebaseUid)){
                throw new IllegalArgumentException("Username is not available.");
            }
        });

        return userRepository.findByFirebaseUid(firebaseUid)
                .orElseGet(() -> {
                    User user = new User();
                    user.setFirebaseUid(firebaseUid);
                    user.setUsername(username);
                    return userRepository.save(user);
                });
    }
}