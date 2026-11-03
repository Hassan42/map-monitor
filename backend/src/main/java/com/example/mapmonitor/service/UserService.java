package com.example.mapmonitor.service;

import com.example.mapmonitor.model.User;
import com.example.mapmonitor.repository.UserRepository;
import java.util.regex.Pattern;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    // signed in with Google: find the user, or create them on their first sign in
    // (no username yet)
    public User findOrCreate(String firebaseUid) {
        return userRepository.findByFirebaseUid(firebaseUid).orElseGet(() -> {
            User user = new User();
            user.setFirebaseUid(firebaseUid);
            return userRepository.save(user);
        });
    }

    private static final Pattern USERNAME = Pattern.compile("[A-Za-z0-9_-]{3,30}");

    // the username, picked once after the first sign in; it can't change later
    // (layer credits show it)
    public User chooseUsername(String firebaseUid, String username) {
        User user = findOrCreate(firebaseUid);
        if (user.getUsername() != null)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Username already chosen");
        if (username == null || !USERNAME.matcher(username).matches())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "3-30 letters, digits, _ or -");
        if (userRepository.findByUsernameIgnoreCase(username).isPresent())
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Username taken");
        user.setUsername(username);
        return userRepository.save(user);
    }
}
