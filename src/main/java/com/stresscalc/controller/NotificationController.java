package com.stresscalc.controller;

import com.stresscalc.model.Notification;
import com.stresscalc.repository.NotificationRepository;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    @Autowired
    private NotificationRepository notificationRepository;

    // GET /api/notifications — returns all notifications for session user
    @GetMapping
    public ResponseEntity<?> getNotifications(HttpSession session) {
        Long userId = (Long) session.getAttribute("userId");
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Not authenticated"));
        }

        List<Notification> notifications = notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
        long unreadCount = notificationRepository.countByUserIdAndIsRead(userId, false);

        Map<String, Object> response = new HashMap<>();
        response.put("notifications", notifications);
        response.put("unreadCount", unreadCount);
        return ResponseEntity.ok(response);
    }

    // POST /api/notifications/read/{id} — mark a single notification as read
    @PostMapping("/read/{id}")
    public ResponseEntity<?> markRead(@PathVariable Long id, HttpSession session) {
        Long userId = (Long) session.getAttribute("userId");
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Not authenticated"));
        }

        Optional<Notification> notifOpt = notificationRepository.findById(id);
        if (notifOpt.isPresent() && notifOpt.get().getUserId().equals(userId)) {
            Notification notif = notifOpt.get();
            notif.setRead(true);
            notificationRepository.save(notif);
            return ResponseEntity.ok(Map.of("status", "ok"));
        }
        return ResponseEntity.status(404).body(Map.of("error", "Notification not found"));
    }

    // POST /api/notifications/read-all — mark all as read
    @PostMapping("/read-all")
    public ResponseEntity<?> markAllRead(HttpSession session) {
        Long userId = (Long) session.getAttribute("userId");
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Not authenticated"));
        }

        List<Notification> unread = notificationRepository.findByUserIdAndIsRead(userId, false);
        unread.forEach(n -> n.setRead(true));
        notificationRepository.saveAll(unread);
        return ResponseEntity.ok(Map.of("status", "ok", "markedRead", unread.size()));
    }
}
