package com.example.mapmonitor.controller;

import com.example.mapmonitor.dto.ChannelWatchResponse;
import com.example.mapmonitor.dto.CreateChannelWatchRequest;
import com.example.mapmonitor.service.ChannelWatchService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

// the Telegram channels a map watches (owner only)
@RestController
@RequestMapping("/api/maps/{mapId}/channels")
public class ChannelWatchController {

    private final ChannelWatchService channelWatchService;

    public ChannelWatchController(ChannelWatchService channelWatchService) {
        this.channelWatchService = channelWatchService;
    }

    @GetMapping
    public List<ChannelWatchResponse> getWatches(Authentication authentication, @PathVariable Long mapId) {
        String uid = (String) authentication.getPrincipal();
        return channelWatchService.getWatches(uid, mapId);
    }

    @PostMapping
    public ChannelWatchResponse addWatch(Authentication authentication, @PathVariable Long mapId,
                                         @RequestBody CreateChannelWatchRequest request) {
        String uid = (String) authentication.getPrincipal();
        return channelWatchService.addWatch(uid, mapId, request.getChannel());
    }
}
