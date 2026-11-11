package com.example.mapmonitor.service;

import com.example.mapmonitor.dto.MapSummaryResponse;
import com.example.mapmonitor.dto.MonitorsResponse;
import com.example.mapmonitor.dto.ProfileResponse;
import com.example.mapmonitor.model.Map;
import com.example.mapmonitor.model.MapMonitor;
import com.example.mapmonitor.model.User;
import com.example.mapmonitor.model.Visibility;
import com.example.mapmonitor.repository.MapMonitorRepository;
import com.example.mapmonitor.repository.MapRepository;
import com.example.mapmonitor.repository.UserRepository;

import java.util.List;
import java.util.regex.Pattern;

import javax.management.RuntimeErrorException;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class UserService {

    private static final int MAX_DESCRIPTION = 300;

    private final UserRepository userRepository;
    private final MapRepository mapRepository;
    private final MapService mapService;
    private final MapMonitorRepository mapMonitorRepository;

    public UserService(UserRepository userRepository, MapRepository mapRepository, MapService mapService,
            MapMonitorRepository mapMonitorRepository) {
        this.userRepository = userRepository;
        this.mapRepository = mapRepository;
        this.mapService = mapService;
        this.mapMonitorRepository = mapMonitorRepository;
    }

    // the public profile page: only public maps, also for the owner. viewerUid is
    // null for a visitor
    public ProfileResponse getProfile(String username, String viewerUid) {
        User user = userRepository.findByUsernameIgnoreCase(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        List<MapSummaryResponse> maps = mapRepository
                .findByUserIdAndVisibilityOrderByIdDesc(user.getId(), Visibility.PUBLIC).stream()
                .map((map) -> MapSummaryResponse.from(map, viewerUid))
                .toList();

        return new ProfileResponse(user.getUsername(), user.getDescription(), user.getFirebaseUid().equals(viewerUid),
                maps);
    }

    public String changeDescription(String firebaseUid, String description) {
        User user = findOrCreate(firebaseUid);
        String text = description == null ? "" : description.trim();
        if (text.length() > MAX_DESCRIPTION)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "At most " + MAX_DESCRIPTION + " characters");
        user.setDescription(text.isEmpty() ? null : text);
        userRepository.save(user);
        return user.getDescription();
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

    @Transactional
    public MonitorsResponse monitorMap(String firebaseUid, long mapID) {
        User user = userRepository.findByFirebaseUid(firebaseUid)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Map map = mapService.getReadableMap(firebaseUid, mapID);

        if (map == null)
            throw new RuntimeException("Map not found");

        if (!mapMonitorRepository.existsByUserIdAndMapId(user.getId(), map.getId())) { // pressing twice doesn't add it twice
            mapMonitorRepository.save(new MapMonitor(user, map));
        }

        return new MonitorsResponse(mapMonitorRepository.countByMapId(map.getId()), true);
    }

    @Transactional(readOnly = true)
    public List<Long> getMonitoredMapsIDs(String username){
        User user = userRepository.findByUsername(username).orElseThrow(() -> new RuntimeException("User not found."));

        return mapMonitorRepository.findMapIdsByUserId(user.getId());
    }

}
