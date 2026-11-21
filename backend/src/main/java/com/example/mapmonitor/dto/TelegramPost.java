package com.example.mapmonitor.dto;

import org.jsoup.nodes.Element;
import java.time.OffsetDateTime;

public record TelegramPost(
        long id,
        String channel,
        String text,
        OffsetDateTime date
) {

    /** Builds a post from a div.tgme_widget_message element on t.me/s/<channel>. */
    public static TelegramPost from(Element msg) {
        String dataPost = msg.attr("data-post");                          // "channel/123"
        int slash = dataPost.lastIndexOf('/');
        String channel = dataPost.substring(0, slash);
        long id = Long.parseLong(dataPost.substring(slash + 1));

        Element textEl = msg.selectFirst(".tgme_widget_message_text");
        String text = textEl != null ? textEl.text() : "";

        String dt = msg.select("time").attr("datetime");                  // "2026-11-15T14:05:00+00:00"
        OffsetDateTime date = dt.isEmpty() ? null : OffsetDateTime.parse(dt);

        return new TelegramPost(id, channel, text, date);
    }

    public String url() {
        return "https://t.me/" + channel + "/" + id;
    }
}