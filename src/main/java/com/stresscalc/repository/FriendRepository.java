package com.stresscalc.repository;

import com.stresscalc.model.Friend;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FriendRepository extends JpaRepository<Friend, Long> {
    List<Friend> findByUserIdAndStatus(Long userId, String status);
    List<Friend> findByFriendIdAndStatus(Long friendId, String status);
    Optional<Friend> findByUserIdAndFriendId(Long userId, Long friendId);
    boolean existsByUserIdAndFriendId(Long userId, Long friendId);
}
