package com.stresscalc.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "friends",
    uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "friend_id"}))
public class Friend {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "friend_id", nullable = false)
    private Long friendId;

    @Column(name = "status", nullable = false, length = 20)
    private String status; // "pending" or "accepted"

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    public Friend() {}

    public Friend(Long userId, Long friendId, String status) {
        this.userId = userId;
        this.friendId = friendId;
        this.status = status;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public Long getFriendId() { return friendId; }
    public void setFriendId(Long friendId) { this.friendId = friendId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
}
