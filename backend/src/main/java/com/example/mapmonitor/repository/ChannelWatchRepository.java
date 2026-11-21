package com.example.mapmonitor.repository;

import com.example.mapmonitor.model.ChannelWatch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface ChannelWatchRepository extends JpaRepository<ChannelWatch, Long> {
    List<ChannelWatch> findByMapId(Long mapId);

    List<ChannelWatch> findByActiveTrue(); // what the scheduled job reads

    // the active watches, with their maps and the maps' countries loaded in the same query (both are
    // lazy, and a @Scheduled job has no open session to load them later)
    @Query("select distinct w from ChannelWatch w join fetch w.map m left join fetch m.countries where w.active = true")
    List<ChannelWatch> findActiveWithMap();

    boolean existsByMapIdAndChannel(Long mapId, String channel);
}
