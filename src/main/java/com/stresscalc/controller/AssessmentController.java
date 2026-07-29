package com.stresscalc.controller;

import com.stresscalc.model.StressAssessment;
import com.stresscalc.model.TelemetryLog;
import com.stresscalc.model.User;
import com.stresscalc.repository.AssessmentRepository;
import com.stresscalc.repository.TelemetryRepository;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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

            // Extract incoming payload metrics cleanly
            int facialTension = payload.containsKey("facialTension") ? ((Number) payload.get("facialTension")).intValue() : 20;
            int overwhelm = payload.containsKey("overwhelm") ? ((Number) payload.get("overwhelm")).intValue() : 5;
            int reactionTimeMs = payload.containsKey("reactionTimeMs") ? ((Number) payload.get("reactionTimeMs")).intValue() : 450;
            int accuracy = payload.containsKey("accuracy") ? ((Number) payload.get("accuracy")).intValue() : 90;
            int errorRatePercent = Math.max(0, 100 - accuracy);

            // 1. Calculate Weighted Composite Stress Index Formula
            // F = Facial Tension (0-100)
            double F = Math.min(100, Math.max(0, facialTension));
            
            // Q = Subjective Overwhelm Questionnaire Score (1-10 mapped to 0-100)
            double Q = Math.min(100, Math.max(0, overwhelm * 10.0));
            
            // C = Cognitive Penalty (derived from error rate % and high reaction time)
            double reactionPenalty = Math.min(100.0, (reactionTimeMs / 10.0));
            double C = Math.min(100.0, (errorRatePercent * 0.5) + (reactionPenalty * 0.5));

            // S_index = (F * 0.3) + (Q * 0.3) + (C * 0.4)
            int finalStressIndex = (int) Math.round((F * 0.3) + (Q * 0.3) + (C * 0.4));
            finalStressIndex = Math.min(100, Math.max(0, finalStressIndex));

            // 2. Save Assessment to MySQL stress_assessments table
            StressAssessment assessment = new StressAssessment();
            assessment.setUserId(userId);
            assessment.setFacialTensionScore((int) F);
            assessment.setSubjectiveScore(overwhelm);
            assessment.setReactionTimeMs(reactionTimeMs);
            assessment.setErrorRatePercent(errorRatePercent);
            assessment.setFinalStressIndex(finalStressIndex);
            
            assessmentRepository.save(assessment);

            // 3. Save corresponding entry to telemetry_logs table to keep main Chart.js graph updated
            int cognitiveBandwidth = Math.max(10, 100 - finalStressIndex);
            double focusIndexDouble = Math.max(1.0, Math.min(10.0, 10.0 - (finalStressIndex / 10.0)));

            TelemetryLog log = new TelemetryLog();
            log.setUserId(userId);
            log.setCognitiveBandwidth(cognitiveBandwidth);
            log.setContextSwitches(10 + (int)(Math.random() * 8));
            log.setFocusIndex(BigDecimal.valueOf(focusIndexDouble).setScale(2, RoundingMode.HALF_UP));
            log.setAmbientNoiseDb(42 + (int)(Math.random() * 10));
            log.setTabDensity(6 + (int)(Math.random() * 5));
            log.setLogTimestamp(LocalDateTime.now());
            
            telemetryRepository.save(log);

            // 4. Return JSON response
            Map<String, Object> response = new HashMap<>();
            response.put("status", "success");
            response.put("final_stress_index", finalStressIndex);
            response.put("facial_tension", (int) F);
            response.put("subjective_score", overwhelm);
            response.put("reaction_time_ms", reactionTimeMs);
            response.put("error_rate_percent", errorRatePercent);
            response.put("message", "Guided Check-In Assessment saved cleanly to MySQL!");

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            Map<String, String> errorMap = new HashMap<>();
            errorMap.put("error", "Failed to process assessment: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorMap);
        }
    }
}
