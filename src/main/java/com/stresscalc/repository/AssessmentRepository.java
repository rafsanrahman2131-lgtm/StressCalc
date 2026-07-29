package com.stresscalc.repository;

import com.stresscalc.model.StressAssessment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AssessmentRepository extends JpaRepository<StressAssessment, Long> {
    List<StressAssessment> findTop10ByUserIdOrderByTimestampDesc(Long userId);
}
