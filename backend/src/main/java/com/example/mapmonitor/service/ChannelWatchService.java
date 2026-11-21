package com.example.mapmonitor.service;

import com.example.mapmonitor.dto.*;
import com.example.mapmonitor.model.ChannelWatch;
import com.example.mapmonitor.model.Map;
import com.example.mapmonitor.repository.ChannelWatchRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ChannelWatchService {

    private static final Logger log = LoggerFactory.getLogger(ChannelWatchService.class);

    private static final double MIN_CONFIDENCE = 0.6;

    private final FactionService factionService;
    private final ClaudeClient claudeClient;
    private final ChannelWatchRepository channelWatchRepository;
    private final EventMarkerService eventMarkerService;
    private final Geocoder geocoder;
    private final TelegramReader telegramReader;
    private final MapService mapService;

    public ChannelWatchService(FactionService factionService, ClaudeClient claudeClient,
                               ChannelWatchRepository channelWatchRepository, EventMarkerService eventMarkerService,
                               Geocoder geocoder, TelegramReader telegramReader, MapService mapService) {
        this.factionService = factionService;
        this.claudeClient = claudeClient;
        this.channelWatchRepository = channelWatchRepository;
        this.eventMarkerService = eventMarkerService;
        this.geocoder = geocoder;
        this.telegramReader = telegramReader;
        this.mapService = mapService;
    }

    public List<ChannelWatchResponse> getWatches(String firebaseUid, Long mapId) {
        mapService.getOwnedMap(firebaseUid, mapId); // owner only
        return channelWatchRepository.findByMapId(mapId).stream()
                .map(ChannelWatchResponse::from)
                .toList();
    }

    public ChannelWatchResponse addWatch(String firebaseUid, Long mapId, String input) {
        Map map = mapService.getOwnedMap(firebaseUid, mapId); // owner only

        String channel = channelName(input);
        if (channel == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Not a Telegram channel link or name");
        }
        if (channelWatchRepository.existsByMapIdAndChannel(mapId, channel)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This map already watches @" + channel);
        }

        return ChannelWatchResponse.from(channelWatchRepository.save(new ChannelWatch(map, channel)));
    }

    // "https://t.me/s/name", "t.me/name", "@name" or "name" -> "name"; null when it isn't a channel name
    private String channelName(String input) {
        if (input == null) return null;
        String name = input.trim()
                .replaceFirst("(?i)^https?://", "")
                .replaceFirst("(?i)^(www\\.)?t\\.me/", "")
                .replaceFirst("^s/", "")
                .replaceFirst("^@", "")
                .replaceFirst("[/?#].*$", ""); // a post number or query after the name
        // Telegram usernames: 5-32 letters, digits or underscores
        return name.matches("[A-Za-z0-9_]{5,32}") ? name : null;
    }


    @Scheduled(fixedRate = 10_000)
    public void importPosts() {

        for (ChannelWatch watch : channelWatchRepository.findActiveWithMap()) {
            // admins only: a watch whose map owner is no longer an admin stops reading (and calling the AI)
            if (!watch.getMap().getUser().isAdmin()) continue;
            try {
                importChannel(watch);
            } catch (Exception e) {
                // one channel failing doesn't stop the others
                log.error("Channel {} failed, will retry next run", watch.getChannel(), e);
            }
        }
    }

    private void importChannel(ChannelWatch watch) throws Exception {
        Map map = watch.getMap();
        String channel = watch.getChannel();
        String userID = map.getUser().getFirebaseUid();
        Long mapID = map.getId();
        Set<String> mapCountries = map.getCountries();

        List<TelegramPost> posts = telegramReader.fetchPosts(channel);

        if (posts.isEmpty()) return;

        // first read of this channel: start from its newest post, don't import the old ones
        if (watch.getLastPostId() == null) {
            watch.setLastPostId(posts.get(posts.size() - 1).id());
            channelWatchRepository.save(watch);
            return;
        }

        List<FactionSummaryResponse> mapFactions = factionService.getFactionsForMap(userID, mapID, true);
        List<EventMarkerSummaryResponse> mapEventMarkers = eventMarkerService.getRecentEvents(userID, mapID, 20);

        for (TelegramPost post : posts) {
            if (post.id() <= watch.getLastPostId()) continue; // already read

            try {
                PostClassification c = claudeClient.classifyPost(
                        post.text(), String.valueOf(post.date()),
                        countriesToText(mapCountries),
                        factionsToText(mapFactions),
                        recentEventsToText(mapEventMarkers));

                if ("event".equals(c.kind())) {
                    if (c.event() == null || c.event().confidence() < MIN_CONFIDENCE) {
                        log.info("Post {} skipped: low confidence ({})", post.id(), c.reason());
                    } else if (!isMapFaction(c.event().factionId(), mapFactions)) {
                        log.info("Post {} skipped: faction {} is not on the map ({})", post.id(), c.event().factionId(), c.reason());
                    } else {
                        CreateEventMarkerRequest req = toMarkerRequest(c.event(), post, mapCountries);
                        if (req == null) {
                            log.warn("Post {} skipped: place '{}' not found", post.id(), c.event().placeName());
                        } else {
                            eventMarkerService.createEvent(userID, mapID, req);
                            log.info("Post {} → new event '{}'", post.id(), req.getTitle());
                            mapEventMarkers = eventMarkerService.getRecentEvents(userID, mapID, 20);
                        }
                    }
                } else if ("duplicate".equals(c.kind())) {
                    log.info("Post {} → duplicate of {} ({})", post.id(), c.duplicateOfId(), c.reason());
                } else {
                    log.info("Post {} → ignored ({})", post.id(), c.reason());
                }

            } catch (ResponseStatusException e) {
                // the event itself was rejected (e.g. a bad time): retrying won't help, so move past it
                log.warn("Post {} skipped: {}", post.id(), e.getReason());
            } catch (Exception e) {
                // network or API trouble: stop here and try this post again next run
                log.error("Post {} failed, will retry next run", post.id(), e);
                return;
            }

            watch.setLastPostId(post.id());
            channelWatchRepository.save(watch);
        }
    }

    private boolean isMapFaction(Long factionId, List<FactionSummaryResponse> factions) {
        return factionId != null && factions.stream().anyMatch(f -> f.getId().equals(factionId));
    }

    private String countriesToText(Set<String> countries) {
        return countries.isEmpty() ? "none" : String.join(", ", countries);
    }

    private String factionsToText(List<FactionSummaryResponse> factions) {
        if (factions.isEmpty()) return "none";
        return factions.stream()
                .map(f -> f.getId() + " = " + f.getName())
                .collect(Collectors.joining("\n"));
    }

    private String recentEventsToText(List<EventMarkerSummaryResponse> events) {
        String text = events.stream()
                .map(e -> "%d | %s | %.4f,%.4f | %s".formatted(
                        e.getId(), e.getTitle(), e.getLatitude(), e.getLongitude(), e.getTimestamp()))
                .collect(Collectors.joining("\n"));
        return text.isEmpty() ? "none" : text;
    }

    private CreateEventMarkerRequest toMarkerRequest(PostClassification.ExtractedEvent e, TelegramPost post, Set<String> countries) {
        if (e.title() == null || e.title().isBlank()) return null;

        Optional<Geocoder.Coordinates> pos = geocoder.locate(e.placeName(), countries);
        if (pos.isEmpty()) return null;
        Geocoder.Coordinates c = pos.get();

        // the post's own time (UTC) when the AI gave none, or one after the post
        LocalDateTime postTime = post.date() != null
                ? post.date().withOffsetSameInstant(ZoneOffset.UTC).toLocalDateTime()
                : LocalDateTime.now(ZoneOffset.UTC);
        LocalDateTime time = e.timestamp() == null || e.timestamp().isAfter(postTime) ? postTime : e.timestamp();

        String description = e.description() == null ? "" : e.description();

        CreateEventMarkerRequest req = new CreateEventMarkerRequest();
        req.setTitle(e.title());
        req.setDescription(description.length() > 255 ? description.substring(0, 255) : description);
        req.setLatitude(c.latitude());
        req.setLongitude(c.longitude());
        req.setTimestamp(time);
        req.setCategory(e.category());
        req.setFactionId(e.factionId());
        req.setSourceURL(post.url());
        req.setOngoing(false);
        req.setRelations(List.of());
        return req;
    }
}
