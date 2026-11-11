package com.example.mapmonitor.controller;

import com.example.mapmonitor.dto.CreateUserRequest;
import com.example.mapmonitor.dto.MonitorsResponse;
import com.example.mapmonitor.dto.ProfileResponse;
import com.example.mapmonitor.dto.UpdateDescriptionRequest;
import com.example.mapmonitor.dto.UserResponse;
import com.example.mapmonitor.model.User;
import com.example.mapmonitor.service.UserService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;

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

    // open to visitors. /profile/ so it can't clash with /me, even for a user named
    // "me"
    @GetMapping("/profile/{username}")
    public ProfileResponse getProfile(Authentication authentication, @PathVariable String username) {
        String uid = authentication != null ? (String) authentication.getPrincipal() : null; // null for a visitor
        return userService.getProfile(username, uid);
    }

    @PatchMapping("/me/description")
    public UpdateDescriptionRequest changeDescription(Authentication authentication,
            @RequestBody UpdateDescriptionRequest request) {
        String uid = (String) authentication.getPrincipal();
        return new UpdateDescriptionRequest(userService.changeDescription(uid, request.description()));
    }

    @GetMapping("/me")
    public UserResponse getCurrentUser(Authentication authentication) {
        return UserResponse.from(userService.findOrCreate((String) authentication.getPrincipal()));
    }

    @PatchMapping("/me")
    public UserResponse chooseUsername(Authentication authentication, @RequestBody CreateUserRequest request) {
        String uid = (String) authentication.getPrincipal();
        User user = userService.chooseUsername(uid, request.username());
        return UserResponse.from(user);
    }

    @PostMapping("/monitorMap")
    public MonitorsResponse monitorMap(Authentication authentication, @RequestBody Long mapID) {
        String uid = (String) authentication.getPrincipal();
        return userService.monitorMap(uid, mapID);
    }

    @GetMapping ("/me/mapsMonitored")
    public List<Long> mapMonitored(Authentication authentication, String username){
        return userService.getMonitoredMapsIDs(username);
    }
}