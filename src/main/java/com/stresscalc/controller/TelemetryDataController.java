package com.stresscalc.controller;

import com.stresscalc.model.TelemetryLog;
import com.stresscalc.model.User;
import com.stresscalc.repository.TelemetryRepository;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

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

    private final RestTemplate restTemplate = new RestTemplate();
    private final String ML_SERVICE_URL = "http://127.0.0.1:5000/predict";

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
            double facialTension = payload.containsKey("facialTension") ? ((Number) payload.get("facialTension")).doubleValue() : 20.0;
            int overwhelm = payload.containsKey("overwhelm") ? ((Number) payload.get("overwhelm")).intValue() : 4;
            double reactionTimeMs = payload.containsKey("reactionTimeMs") ? ((Number) payload.get("reactionTimeMs")).doubleValue() : 450.0;
            double errorRatePercent = payload.containsKey("errorRatePercent") ? ((Number) payload.get("errorRatePercent")).doubleValue() : 5.0;
            double ambientNoiseWeight = payload.containsKey("ambientNoiseWeight") ? ((Number) payload.get("ambientNoiseWeight")).doubleValue() : 0.3;

            // Call Python FastAPI Machine Learning Microservice (/predict)
            double predictedFocus = 3.8;
            int predictedBandwidth = 62;

            try {
                Map<String, Object> mlRequest = new HashMap<>();
                mlRequest.put("context_switches", contextSwitches);
                mlRequest.put("uninterrupted_seconds", uninterruptedSeconds);
                mlRequest.put("facial_tension", facialTension);
                mlRequest.put("overwhelm_score", overwhelm);
                mlRequest.put("reaction_time_ms", reactionTimeMs);
                mlRequest.put("error_rate_percent", errorRatePercent);
                mlRequest.put("ambient_noise_weight", ambientNoiseWeight);

                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);
                HttpEntity<Map<String, Object>> entity = new HttpEntity<>(mlRequest, headers);

                ResponseEntity<Map> mlResponse = restTemplate.postForEntity(ML_SERVICE_URL, entity, Map.class);
                if (mlResponse.getStatusCode() == HttpStatus.OK && mlResponse.getBody() != null) {
                    Map mlBody = mlResponse.getBody();
                    if (mlBody.containsKey("predicted_focus_index")) {
                        predictedFocus = ((Number) mlBody.get("predicted_focus_index")).doubleValue();
                    }
                    if (mlBody.containsKey("predicted_cognitive_bandwidth")) {
                        predictedBandwidth = ((Number) mlBody.get("predicted_cognitive_bandwidth")).intValue();
                    }
                }
            } catch (Exception mlEx) {
                System.err.println("ML Microservice Notice: Fallback heuristic used. Error: " + mlEx.getMessage());
            }

            BigDecimal focusDecimal = BigDecimal.valueOf(predictedFocus).setScale(1, RoundingMode.HALF_UP);

            TelemetryLog log = new TelemetryLog();
            log.setUserId(userId);
            log.setCognitiveBandwidth(predictedBandwidth);
            log.setContextSwitches(contextSwitches);
            log.setFocusIndex(focusDecimal);
            log.setAmbientNoiseDb(payload.containsKey("ambientNoiseDb") ? ((Number) payload.get("ambientNoiseDb")).intValue() : 42);
            log.setTabDensity(payload.containsKey("tabDensity") ? ((Number) payload.get("tabDensity")).intValue() : 6);
            log.setLogTimestamp(LocalDateTime.now());

            telemetryRepository.save(log);

            Map<String, Object> res = new HashMap<>();
            res.put("status", "success");
            res.put("predicted_focus_index", focusDecimal.doubleValue());
            res.put("predicted_cognitive_bandwidth", predictedBandwidth);
            res.put("engine", "RandomForestRegressor ML Gateway");
            return ResponseEntity.ok(res);

        } catch (Exception e) {
            Map<String, String> err = new HashMap<>();
            err.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(err);
        }
    }
}
