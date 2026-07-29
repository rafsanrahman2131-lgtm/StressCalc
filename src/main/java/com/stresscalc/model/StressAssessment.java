package com.stresscalc.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "stress_assessments")
public class StressAssessment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "assessment_id")
    private Long assessmentId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "facial_tension_score", nullable = false)
    private Integer facialTensionScore;

    @Column(name = "subjective_score", nullable = false)
    private Integer subjectiveScore;

    @Column(name = "reaction_time_ms", nullable = false)
    private Integer reactionTimeMs;

    @Column(name = "error_rate_percent", nullable = false)
    private Integer errorRatePercent;

    @Column(name = "final_stress_index", nullable = false)
    private Integer finalStressIndex;

    @Column(name = "timestamp", insertable = false, updatable = false)
    private LocalDateTime timestamp;

    public StressAssessment() {}

    public StressAssessment(Long userId, Integer facialTensionScore, Integer subjectiveScore, 
                            Integer reactionTimeMs, Integer errorRatePercent, Integer finalStressIndex) {
        this.userId = userId;
        this.facialTensionScore = facialTensionScore;
        this.subjectiveScore = subjectiveScore;
        this.reactionTimeMs = reactionTimeMs;
        this.errorRatePercent = errorRatePercent;
        this.finalStressIndex = finalStressIndex;
    }

    public Long getAssessmentId() {
        return assessmentId;
    }

    public void setAssessmentId(Long assessmentId) {
        this.assessmentId = assessmentId;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public Integer getFacialTensionScore() {
        return facialTensionScore;
    }

    public void setFacialTensionScore(Integer facialTensionScore) {
        this.facialTensionScore = facialTensionScore;
    }

    public Integer getSubjectiveScore() {
        return subjectiveScore;
    }

    public void setSubjectiveScore(Integer subjectiveScore) {
        this.subjectiveScore = subjectiveScore;
    }

    public Integer getReactionTimeMs() {
        return reactionTimeMs;
    }

    public void setReactionTimeMs(Integer reactionTimeMs) {
        this.reactionTimeMs = reactionTimeMs;
    }

    public Integer getErrorRatePercent() {
        return errorRatePercent;
    }

    public void setErrorRatePercent(Integer errorRatePercent) {
        this.errorRatePercent = errorRatePercent;
    }

    public Integer getFinalStressIndex() {
        return finalStressIndex;
    }

    public void setFinalStressIndex(Integer finalStressIndex) {
        this.finalStressIndex = finalStressIndex;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }
}
