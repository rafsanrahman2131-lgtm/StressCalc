package com.stresscalc.controller;

import com.stresscalc.model.TriageLog;
import com.stresscalc.model.User;
import com.stresscalc.repository.TriageLogRepository;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/triage")
public class TriageLogController {

    @Autowired
    private TriageLogRepository triageLogRepository;

    @PostMapping("/log")
    public ResponseEntity<?> logTriage(@RequestBody Map<String, String> payload, HttpSession session) {
        try {
            Long userId = (Long) session.getAttribute("userId");
            if (userId == null) {
                User user = (User) session.getAttribute("user");
                if (user != null) userId = user.getUserId();
            }
            if (userId == null) userId = 1L;

            String triageLevel = payload.getOrDefault("triageLevel", "MODERATE");
            String symptoms = payload.getOrDefault("symptoms", "Elevated cognitive load");
            String recommendation = payload.getOrDefault("recommendation", "10-minute micro-break");

            TriageLog log = new TriageLog(userId, triageLevel, symptoms, recommendation, LocalDateTime.now());
            triageLogRepository.save(log);

            Map<String, Object> res = new HashMap<>();
            res.put("status", "success");
            res.put("logId", log.getId());
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            Map<String, String> err = new HashMap<>();
            err.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(err);
        }
    }

    @GetMapping("/history")
    public ResponseEntity<?> getTriageLogs(HttpSession session) {
        try {
            Long userId = (Long) session.getAttribute("userId");
            if (userId == null) {
                User user = (User) session.getAttribute("user");
                if (user != null) userId = user.getUserId();
            }
            if (userId == null) userId = 1L;

            List<TriageLog> logs = triageLogRepository.findByUserIdOrderByCreatedAtDesc(userId);
            return ResponseEntity.ok(logs);
        } catch (Exception e) {
            Map<String, String> err = new HashMap<>();
            err.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(err);
        }
    }
}
