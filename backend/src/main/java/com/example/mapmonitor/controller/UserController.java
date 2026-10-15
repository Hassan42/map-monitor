package com.example.mapmonitor.controller;

import com.example.mapmonitor.model.User;
import com.example.mapmonitor.service.UserService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/public/health")
    public String health() {
        return "OK - no auth needed";
    }

    @GetMapping("/me")
    public String getCurrentUser(Authentication authentication) {
        String uid = (String) authentication.getPrincipal();
        return "Hello, your Firebase UID is: " + uid;
    }

    @PostMapping
    public User createUserProfile(Authentication authentication) {
        String uid = (String) authentication.getPrincipal();
        return userService.syncUser(uid);
    }
}