package com.example.mapmonitor.dto;
import com.example.mapmonitor.model.User;


public record UserResponse(String username, boolean admin) {
    public static UserResponse from(User user) {
        return new UserResponse(user.getUsername(),
                    user.isAdmin());
    }
}
