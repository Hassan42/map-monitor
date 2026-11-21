package com.example.mapmonitor.repository;

import com.example.mapmonitor.model.ChannelWatch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Set;

public interface ChannelWatchRepository extends JpaRepository<ChannelWatch, Long> {
    List<ChannelWatch> findByMapId(Long mapId);

    List<ChannelWatch> findByActiveTrue(); // what the scheduled job reads

    // the active watches, with their maps and the maps' countries loaded in the same query (both are
    // lazy, and a @Scheduled job has no open session to load them later)
    @Query("select distinct w from ChannelWatch w join fetch w.map m left join fetch m.countries where w.active = true")
    List<ChannelWatch> findActiveWithMap();

    boolean existsByMapIdAndChannel(Long mapId, String channel);

    // maps with an active channel watch set up by an admin: they get the AI watch tag on their cards
    @Query("select distinct w.map.id from ChannelWatch w where w.active = true and w.map.user.admin = true")
    Set<Long> findAiWatchedMapIds();
}
