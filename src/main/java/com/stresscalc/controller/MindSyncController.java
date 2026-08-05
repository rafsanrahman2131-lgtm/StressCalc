package com.stresscalc.controller;

import com.stresscalc.model.MindSyncChat;
import com.stresscalc.model.User;
import com.stresscalc.repository.MindSyncChatRepository;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/mindsync")
public class MindSyncController {

    @Autowired
    private MindSyncChatRepository chatRepository;

    @PostMapping("/chat")
    public ResponseEntity<?> chatWithMindSync(@RequestBody Map<String, String> payload, HttpSession session) {
        try {
            Long userId = (Long) session.getAttribute("userId");
            if (userId == null) {
                User user = (User) session.getAttribute("user");
                if (user != null) userId = user.getUserId();
            }
            if (userId == null) userId = 1L;

            String message = payload.get("message");
            if (message == null || message.trim().isEmpty()) {
                Map<String, String> err = new HashMap<>();
                err.put("error", "Message cannot be empty");
                return ResponseEntity.badRequest().body(err);
            }

            String moodState = payload.getOrDefault("moodState", "neutral");
            String responseText = generateAIResponse(message, moodState);

            MindSyncChat chat = new MindSyncChat(userId, message, responseText, moodState, LocalDateTime.now());
            chatRepository.save(chat);

            Map<String, Object> res = new HashMap<>();
            res.put("status", "success");
            res.put("reply", responseText);
            res.put("timestamp", LocalDateTime.now().toString());
            return ResponseEntity.ok(res);

        } catch (Exception e) {
            Map<String, String> err = new HashMap<>();
            err.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(err);
        }
    }

    @GetMapping("/history")
    public ResponseEntity<?> getChatHistory(HttpSession session) {
        try {
            Long userId = (Long) session.getAttribute("userId");
            if (userId == null) {
                User user = (User) session.getAttribute("user");
                if (user != null) userId = user.getUserId();
            }
            if (userId == null) userId = 1L;

            List<MindSyncChat> history = chatRepository.findByUserIdOrderByTimestampDesc(userId);
            return ResponseEntity.ok(history);
        } catch (Exception e) {
            Map<String, String> err = new HashMap<>();
            err.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(err);
        }
    }

    private String generateAIResponse(String input, String moodState) {
        String msg = input.toLowerCase();
        if (msg.contains("anxious") || msg.contains("panic") || msg.contains("scared") || msg.contains("stress")) {
            return "I hear you. Take a slow, deep breath with me. Inhale for 4 seconds, hold for 4, and exhale for 6. Your body is safe right now, and we can take this one step at a time.";
        } else if (msg.contains("tired") || msg.contains("exhausted") || msg.contains("burnout") || msg.contains("sleep")) {
            return "Cognitive fatigue is a clear sign your brain needs rest. Consider stepping away from screens for 15 minutes, hydrating, and letting your mind wander without digital input.";
        } else if (msg.contains("focus") || msg.contains("work") || msg.contains("study") || msg.contains("task")) {
            return "Let's optimize your cognitive flow state. Try breaking your current work into a 25-minute single-task sprint, followed by a complete 5-minute break.";
        } else if (msg.contains("hello") || msg.contains("hi") || msg.contains("hey")) {
            return "Hello! I am MindSync AI, your personal cognitive companion. How are you feeling right now?";
        } else {
            return "Thank you for sharing that with me. I am tracking your telemetry data. Would you like to try a grounding exercise, or discuss what is currently on your mind?";
        }
    }
}
