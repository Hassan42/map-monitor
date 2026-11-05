package com.example.mapmonitor.repository;

import com.example.mapmonitor.model.Map;
import com.example.mapmonitor.model.Visibility;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Set;

public interface MapRepository extends JpaRepository<Map, Long> {
    List<Map> findByUserId(Long userId);

    long countByUserId(Long userId);

    List<Map> findByUserIdAndVisibilityOrderByIdDesc(Long userId, Visibility visibility);

    List<Map> findByVisibilityOrderByIdDesc(Visibility visibility, Pageable pageable);

    @Query("select distinct m from Map m join m.countries c where m.visibility = :visibility and c in :countries order by m.id desc")
    List<Map> findByVisibilityAndCountries(@Param("visibility") Visibility visibility, @Param("countries") Set<String> countries, Pageable pageable);
}