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

    public User syncUser(String firebaseUid) {
        return userRepository.findByFirebaseUid(firebaseUid)
                .orElseGet(() -> {
                    User user = new User();
                    user.setFirebaseUid(firebaseUid);
                    return userRepository.save(user);
                });
    }
}