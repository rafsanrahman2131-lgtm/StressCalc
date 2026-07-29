package com.stresscalc.controller;

import com.stresscalc.model.TelemetryLog;
import com.stresscalc.model.User;
import com.stresscalc.repository.TelemetryRepository;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
public class TelemetryDataController {

    @Autowired
    private TelemetryRepository telemetryRepository;

    @GetMapping("/telemetry-data")
    public ResponseEntity<?> getTelemetryData(HttpSession session) {
        Long userId = (Long) session.getAttribute("userId");
        if (userId == null) {
            User user = (User) session.getAttribute("user");
            if (user != null) {
                userId = user.getUserId();
            }
        }

        if (userId == null) {
            userId = 1L; // Demo fallback user
        }

        List<TelemetryLog> logs = telemetryRepository.findTop20ByUserIdOrderByLogTimestampAsc(userId);

        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("HH:mm:ss");

        List<Map<String, Object>> responseList = logs.stream().map(log -> {
            Map<String, Object> map = new HashMap<>();
            map.put("timestamp", log.getLogTimestamp() != null ? log.getLogTimestamp().format(formatter) : "");
            map.put("bandwidth_percent", log.getCognitiveBandwidth());
            map.put("context_switches", log.getContextSwitches());
            map.put("focus_index", log.getFocusIndex());
            map.put("ambient_noise_db", log.getAmbientNoiseDb());
            map.put("tab_density", log.getTabDensity());
            return map;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(responseList);
    }

    @PostMapping("/telemetry-data")
    public ResponseEntity<?> saveTelemetryData(@RequestBody Map<String, Object> payload, HttpSession session) {
        try {
            Long userId = (Long) session.getAttribute("userId");
            if (userId == null) {
                User user = (User) session.getAttribute("user");
                if (user != null) {
                    userId = user.getUserId();
                }
            }

            if (userId == null) {
                userId = 1L;
            }

            int contextSwitches = payload.containsKey("contextSwitches") ? ((Number) payload.get("contextSwitches")).intValue() : 0;
            int uninterruptedSeconds = payload.containsKey("uninterruptedSeconds") ? ((Number) payload.get("uninterruptedSeconds")).intValue() : 0;
            
            // Query most recent focus_index from database state model
            List<TelemetryLog> existingLogs = telemetryRepository.findTop20ByUserIdOrderByLogTimestampAsc(userId);
            double previousFocus = 10.0;
            if (!existingLogs.isEmpty()) {
                TelemetryLog latest = existingLogs.get(existingLogs.size() - 1);
                if (latest.getFocusIndex() != null) {
                    previousFocus = latest.getFocusIndex().doubleValue();
                }
            }

            // Scientific Formula:
            // Recovery: +0.5 per 60s of uninterrupted focus
            // Penalty: -1.5 per context switch
            double recovery = (uninterruptedSeconds / 60.0) * 0.5;
            double penalty = contextSwitches * 1.5;

            double calculatedFocus = previousFocus + recovery - penalty;
            calculatedFocus = Math.max(0.0, Math.min(10.0, calculatedFocus));
            
            BigDecimal focusDecimal = BigDecimal.valueOf(calculatedFocus).setScale(1, RoundingMode.HALF_UP);

            int cognitiveBandwidth = (int) Math.round(focusDecimal.doubleValue() * 10);
            cognitiveBandwidth = Math.max(10, Math.min(100, cognitiveBandwidth));

            TelemetryLog log = new TelemetryLog();
            log.setUserId(userId);
            log.setCognitiveBandwidth(cognitiveBandwidth);
            log.setContextSwitches(contextSwitches);
            log.setFocusIndex(focusDecimal);
            log.setAmbientNoiseDb(payload.containsKey("ambientNoiseDb") ? ((Number) payload.get("ambientNoiseDb")).intValue() : 42);
            log.setTabDensity(payload.containsKey("tabDensity") ? ((Number) payload.get("tabDensity")).intValue() : 6);
            log.setLogTimestamp(LocalDateTime.now());

            telemetryRepository.save(log);

            Map<String, Object> res = new HashMap<>();
            res.put("status", "success");
            res.put("focus_index", focusDecimal.doubleValue());
            res.put("uninterrupted_seconds", uninterruptedSeconds);
            return ResponseEntity.ok(res);

        } catch (Exception e) {
            Map<String, String> err = new HashMap<>();
            err.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(err);
        }
    }
}
