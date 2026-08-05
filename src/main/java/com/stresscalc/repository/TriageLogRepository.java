package com.stresscalc.repository;

import com.stresscalc.model.TriageLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TriageLogRepository extends JpaRepository<TriageLog, Long> {
    List<TriageLog> findByUserIdOrderByCreatedAtDesc(Long userId);
}
