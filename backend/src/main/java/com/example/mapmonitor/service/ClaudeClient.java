package com.example.mapmonitor.service;

import com.example.mapmonitor.model.EventCategory;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

import com.example.mapmonitor.dto.PostClassification;

@Service
public class ClaudeClient {

    private final RestClient rest;
    private final ObjectMapper mapper;
    private final String systemPrompt;
    private final String userTemplate;
    private final JsonNode schema;

    public ClaudeClient(ObjectMapper mapper,
                        @Value("${anthropic.api-key}") String apiKey,
                        @Value("classpath:prompts/post-to-event/system.txt") Resource system,
                        @Value("classpath:prompts/post-to-event/user.txt") Resource user,
                        @Value("classpath:prompts/post-to-event/schema.json") Resource schemaFile) throws IOException {
        this.rest = RestClient.builder().baseUrl("https://api.anthropic.com/v1")
                .defaultHeader("x-api-key", apiKey)
                .defaultHeader("anthropic-version", "2023-06-01")
                .build();
        this.mapper = mapper;
        this.systemPrompt = system.getContentAsString(StandardCharsets.UTF_8);
        this.userTemplate = user.getContentAsString(StandardCharsets.UTF_8);

        // load schema and inject categories from the Java enum
        ObjectNode s = (ObjectNode) mapper.readTree(schemaFile.getInputStream());
        ArrayNode catEnum = (ArrayNode) s.at("/properties/event/properties/category/enum");
        for (EventCategory c : EventCategory.values()) catEnum.add(c.name());
        this.schema = s;
    }

    public PostClassification classifyPost(String postText, String postDate, String countries,
                             String factions, String recentEvents) {

        String userContent = fill(userTemplate, Map.of(
                "post_date", postDate,
                "post_text", postText,
                "countries", countries,
                "factions", factions,
                "recent_events", recentEvents
        ));

        Map<String, Object> body = Map.of(
                "model", "claude-haiku-5-5",
                "max_tokens", 1024,
                "system", systemPrompt,
                "tools", List.of(Map.of(
                        "name", "classify_post",
                        "description", "Classify the post and, if kind=event, extract the event. event must be null unless kind=event.",
                        "input_schema", schema)),
                "tool_choice", Map.of("type", "tool", "name", "classify_post"),
                "messages", List.of(Map.of("role", "user", "content", userContent))
        );

        JsonNode res = rest.post().uri("/messages")
                .contentType(MediaType.APPLICATION_JSON)
                .body(body).retrieve().body(JsonNode.class);

        if (res == null) throw new IllegalStateException("Empty Claude response");
        try {
            return mapper.treeToValue(res.at("/content/0/input"), PostClassification.class);
        } catch (JacksonException e) {
            throw new IllegalStateException("Bad Claude response: " + res, e);
        }
    }

    private static String fill(String template, Map<String, String> values) {
        String out = template;
        for (var e : values.entrySet()) out = out.replace("{{" + e.getKey() + "}}", e.getValue());
        return out;
    }

}
