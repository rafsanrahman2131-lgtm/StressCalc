package com.stresscalc.controller;

import com.stresscalc.model.TelemetryLog;
import com.stresscalc.model.User;
import com.stresscalc.repository.TelemetryRepository;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@RestController
@RequestMapping("/api")
public class TelemetryDataController {

    @Autowired
    private TelemetryRepository telemetryRepository;

    @GetMapping(value = "/telemetry-data", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> getTelemetryData(HttpSession session) {
        try {
            Long userId = (Long) session.getAttribute("userId");
            if (userId == null) {
                User user = (User) session.getAttribute("user");
                if (user != null) {
                    userId = user.getUserId();
                }
            }

            // Fallback for session-less preview: default to User ID 1L
            if (userId == null) {
                userId = 1L;
            }

            // Fetch recent 20 records ordered by timestamp descending, then reverse for ascending chart flow
            List<TelemetryLog> rawLogs = telemetryRepository.findRecentLogsByUserId(userId, PageRequest.of(0, 20));
            
            // If empty, generate & seed realistic telemetry records into MySQL database for demo
            if (rawLogs.isEmpty()) {
                rawLogs = seedDemoTelemetryLogs(userId);
            } else {
                Collections.reverse(rawLogs); // Order by timestamp ascending for chart
            }

            DateTimeFormatter timeFormatter = DateTimeFormatter.ofPattern("HH:mm");
            List<Map<String, Object>> responseList = new ArrayList<>();

            for (TelemetryLog log : rawLogs) {
                Map<String, Object> item = new HashMap<>();
                LocalDateTime ts = (log.getLogTimestamp() != null) ? log.getLogTimestamp() : LocalDateTime.now();
                
                item.put("timestamp", ts.format(timeFormatter));
                item.put("focus_index", log.getFocusIndex());
                item.put("bandwidth_percent", log.getCognitiveBandwidth());
                item.put("ambient_noise_db", log.getAmbientNoiseDb());
                item.put("tab_density", log.getTabDensity());
                item.put("context_switches", log.getContextSwitches());
                
                responseList.add(item);
            }

            return ResponseEntity.ok(responseList);

        } catch (Exception e) {
            Map<String, String> errorMap = new HashMap<>();
            errorMap.append("error", "Failed to retrieve telemetry logs: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorMap);
        }
    }

    private List<TelemetryLog> seedDemoTelemetryLogs(Long userId) {
        List<TelemetryLog> seeded = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now().minusMinutes(100);

        double[] baseFocus = {6.5, 7.0, 7.5, 8.2, 8.5, 8.0, 7.2, 6.8, 7.4, 8.1, 8.6, 9.0, 8.4, 7.8, 8.2, 8.7, 8.3, 7.9, 8.4, 8.8};
        int[] baseBandwidth = {60, 65, 70, 78, 82, 75, 68, 62, 72, 80, 85, 90, 84, 76, 80, 86, 82, 78, 83, 88};

        for (int i = 0; i < 20; i++) {
            TelemetryLog log = new TelemetryLog();
            log.setUserId(userId);
            log.setCognitiveBandwidth(baseBandwidth[i]);
            log.setContextSwitches((int) (Math.random() * 5) + 1);
            log.setFocusIndex(BigDecimal.valueOf(baseFocus[i]).setScale(2, RoundingMode.HALF_UP));
            log.setAmbientNoiseDb(40 + (int)(Math.random() * 15));
            log.setTabDensity(5 + (int)(Math.random() * 8));
            log.setLogTimestamp(now.plusMinutes(i * 5));

            telemetryRepository.save(log);
            seeded.add(log);
        }

        return seeded;
    }
}
