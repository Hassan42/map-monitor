package com.example.mapmonitor.controller;

import com.example.mapmonitor.dto.CreateUserRequest;
import com.example.mapmonitor.dto.UserResponse;
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
    public UserResponse getCurrentUser(Authentication authentication) {
        String uid = (String) authentication.getPrincipal();
        User user = userService.syncUser(uid, null);
        return UserResponse.from(user);
    }

    @PostMapping
    public User createUserProfile(Authentication authentication, @RequestBody CreateUserRequest request) {
        String uid = (String) authentication.getPrincipal();
        return userService.syncUser(uid, request.username());
    }
}