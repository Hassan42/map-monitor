package com.example.mapmonitor.service;

import tools.jackson.databind.JsonNode;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.Optional;
import java.util.Set;

// place name -> coordinates, through Photon (photon.komoot.io): free OpenStreetMap search, no key.
// It's a shared public server, so roughly one request per post
@Service
public class Geocoder {

    public record Coordinates(double latitude, double longitude) {}

    private final RestClient photon;

    public Geocoder() {
        this.photon = RestClient.builder()
                .baseUrl("https://photon.komoot.io")
                .defaultHeader("User-Agent", "map-monitor")
                .build();
    }

    // the first place with this name inside one of the map's countries (ISO codes like "LB"), or empty
    public Optional<Coordinates> locate(String place, Set<String> countries) {
        if (place == null || place.isBlank()) return Optional.empty();

        JsonNode result = photon.get()
                .uri(b -> b.path("/api/").queryParam("q", place).queryParam("limit", 5).build())
                .retrieve()
                .body(JsonNode.class);
        if (result == null) return Optional.empty();

        for (JsonNode feature : result.path("features")) {
            String code = feature.path("properties").path("countrycode").asText("").toUpperCase();
            if (!countries.isEmpty() && !countries.contains(code)) continue; // outside the map's area
            JsonNode lngLat = feature.path("geometry").path("coordinates"); // [lng, lat]
            if (lngLat.size() < 2) continue;
            return Optional.of(new Coordinates(lngLat.get(1).asDouble(), lngLat.get(0).asDouble()));
        }
        return Optional.empty();
    }
}
