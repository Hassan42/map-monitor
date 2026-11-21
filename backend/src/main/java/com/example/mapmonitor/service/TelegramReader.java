package com.example.mapmonitor.service;

import com.example.mapmonitor.dto.TelegramPost;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.Comparator;
import java.util.List;

@Service
public class TelegramReader {

    // the latest posts with text on t.me/s/<channel> (its public preview page), oldest first
    public List<TelegramPost> fetchPosts(String channel) throws IOException {

        Document channelFeed = Jsoup.connect("https://t.me/s/" + channel)
                .userAgent("Mozilla/5.0")
                .timeout(15_000)
                .get();

        List<Element> posts = channelFeed.select("div.tgme_widget_message");

        return posts.stream()
                .map(TelegramPost::from)
                .filter(p -> !p.text().isBlank())   // skip media-only posts
                .sorted(Comparator.comparingLong(TelegramPost::id)) // oldest first
                .toList();
    }
}
