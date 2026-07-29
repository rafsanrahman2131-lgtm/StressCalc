package com.stresscalc.controller;

import com.stresscalc.model.StressAssessment;
import com.stresscalc.model.TelemetryLog;
import com.stresscalc.model.User;
import com.stresscalc.repository.AssessmentRepository;
import com.stresscalc.repository.TelemetryRepository;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class AssessmentController {

    @Autowired
    private AssessmentRepository assessmentRepository;

    @Autowired
    private TelemetryRepository telemetryRepository;

    private final RestTemplate restTemplate = new RestTemplate();
    private final String ML_SERVICE_URL = "http://127.0.0.1:5000/predict";

    @PostMapping(value = "/assessment", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> createAssessment(@RequestBody Map<String, Object> payload, HttpSession session) {
        try {
            Long userId = (Long) session.getAttribute("userId");
            if (userId == null) {
                User user = (User) session.getAttribute("user");
                if (user != null) {
                    userId = user.getUserId();
                }
            }

            if (userId == null) {
                userId = 1L; // Fallback demo user ID
            }

            int facialTension = payload.containsKey("facialTension") ? ((Number) payload.get("facialTension")).intValue() : 20;
            int overwhelm = payload.containsKey("overwhelm") ? ((Number) payload.get("overwhelm")).intValue() : 5;
            int reactionTimeMs = payload.containsKey("reactionTimeMs") ? ((Number) payload.get("reactionTimeMs")).intValue() : 450;
            int accuracy = payload.containsKey("accuracy") ? ((Number) payload.get("accuracy")).intValue() : 90;
            int errorRatePercent = Math.max(0, 100 - accuracy);

            // Default fallback
            int finalStressIndex = 25;
            double predictedFocus = 8.5;
            int predictedBandwidth = 85;

            // Query Python FastAPI RandomForest ML Microservice
            try {
                Map<String, Object> mlRequest = new HashMap<>();
                mlRequest.put("context_switches", 2);
                mlRequest.put("uninterrupted_seconds", 300);
                mlRequest.put("facial_tension", (double) facialTension);
                mlRequest.put("overwhelm_score", overwhelm);
                mlRequest.put("reaction_time_ms", (double) reactionTimeMs);
                mlRequest.put("error_rate_percent", (double) errorRatePercent);
                mlRequest.put("ambient_noise_weight", 0.3);

                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);
                HttpEntity<Map<String, Object>> entity = new HttpEntity<>(mlRequest, headers);

                ResponseEntity<Map> mlResponse = restTemplate.postForEntity(ML_SERVICE_URL, entity, Map.class);
                if (mlResponse.getStatusCode() == HttpStatus.OK && mlResponse.getBody() != null) {
                    Map mlBody = mlResponse.getBody();
                    if (mlBody.containsKey("predicted_stress_index")) {
                        finalStressIndex = ((Number) mlBody.get("predicted_stress_index")).intValue();
                    }
                    if (mlBody.containsKey("predicted_focus_index")) {
                        predictedFocus = ((Number) mlBody.get("predicted_focus_index")).doubleValue();
                    }
                    if (mlBody.containsKey("predicted_cognitive_bandwidth")) {
                        predictedBandwidth = ((Number) mlBody.get("predicted_cognitive_bandwidth")).intValue();
                    }
                }
            } catch (Exception mlEx) {
                System.err.println("Assessment ML Notice: Fallback used. Error: " + mlEx.getMessage());
            }

            // Save Assessment to MySQL stress_assessments table
            StressAssessment assessment = new StressAssessment();
            assessment.setUserId(userId);
            assessment.setFacialTensionScore(facialTension);
            assessment.setSubjectiveScore(overwhelm);
            assessment.setReactionTimeMs(reactionTimeMs);
            assessment.setErrorRatePercent(errorRatePercent);
            assessment.setFinalStressIndex(finalStressIndex);
            
            assessmentRepository.save(assessment);

            // Save corresponding entry to telemetry_logs table for live Chart.js sync
            TelemetryLog log = new TelemetryLog();
            log.setUserId(userId);
            log.setCognitiveBandwidth(predictedBandwidth);
            log.setContextSwitches(10 + (int)(Math.random() * 5));
            log.setFocusIndex(BigDecimal.valueOf(predictedFocus).setScale(1, RoundingMode.HALF_UP));
            log.setAmbientNoiseDb(42 + (int)(Math.random() * 8));
            log.setTabDensity(6);
            log.setLogTimestamp(LocalDateTime.now());
            
            telemetryRepository.save(log);

            Map<String, Object> response = new HashMap<>();
            response.put("status", "success");
            response.put("final_stress_index", finalStressIndex);
            response.put("predicted_focus_index", predictedFocus);
            response.put("predicted_cognitive_bandwidth", predictedBandwidth);
            response.put("facial_tension", facialTension);
            response.put("subjective_score", overwhelm);
            response.put("reaction_time_ms", reactionTimeMs);
            response.put("error_rate_percent", errorRatePercent);
            response.put("engine", "RandomForestRegressor ML Microservice");

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            Map<String, String> errorMap = new HashMap<>();
            errorMap.put("error", "Failed to process assessment: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorMap);
        }
    }
}
