package com.stresscalc.repository;

import com.stresscalc.model.TelemetryLog;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TelemetryRepository extends JpaRepository<TelemetryLog, Long> {

    @Query("SELECT t FROM TelemetryLog t WHERE t.userId = :userId ORDER BY t.logTimestamp DESC")
    List<TelemetryLog> findRecentLogsByUserId(@Param("userId") Long userId, Pageable pageable);

    List<TelemetryLog> findTop20ByUserIdOrderByLogTimestampAsc(Long userId);
}
