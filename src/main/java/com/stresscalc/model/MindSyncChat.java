package com.stresscalc.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "mindsync_chats")
public class MindSyncChat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long userId;

    @Column(columnDefinition = "TEXT")
    private String userMessage;

    @Column(columnDefinition = "TEXT")
    private String aiResponse;

    private String moodState;

    private LocalDateTime timestamp;

    public MindSyncChat() {}

    public MindSyncChat(Long userId, String userMessage, String aiResponse, String moodState, LocalDateTime timestamp) {
        this.userId = userId;
        this.userMessage = userMessage;
        this.aiResponse = aiResponse;
        this.moodState = moodState;
        this.timestamp = timestamp;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getUserMessage() { return userMessage; }
    public void setUserMessage(String userMessage) { this.userMessage = userMessage; }

    public String getAiResponse() { return aiResponse; }
    public void setAiResponse(String aiResponse) { this.aiResponse = aiResponse; }

    public String getMoodState() { return moodState; }
    public void setMoodState(String moodState) { this.moodState = moodState; }

    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }
}
