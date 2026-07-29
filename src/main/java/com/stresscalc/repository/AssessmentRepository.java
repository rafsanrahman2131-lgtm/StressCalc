package com.stresscalc.repository;

import com.stresscalc.model.StressAssessment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AssessmentRepository extends JpaRepository<StressAssessment, Long> {
    List<StressAssessment> findTop10ByUserIdOrderByTimestampDesc(Long userId);

    @Query("SELECT s FROM StressAssessment s WHERE s.userId = :userId AND (s.timestamp >= :sinceDate OR s.timestamp IS NULL) ORDER BY s.assessmentId DESC")
    List<StressAssessment> findLast30DaysByUserId(@Param("userId") Long userId, @Param("sinceDate") LocalDateTime sinceDate);

    List<StressAssessment> findTop30ByUserIdOrderByAssessmentIdDesc(Long userId);
}
