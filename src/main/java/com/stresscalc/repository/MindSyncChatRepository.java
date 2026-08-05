package com.stresscalc.repository;

import com.stresscalc.model.MindSyncChat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MindSyncChatRepository extends JpaRepository<MindSyncChat, Long> {
    List<MindSyncChat> findByUserIdOrderByTimestampDesc(Long userId);
}
