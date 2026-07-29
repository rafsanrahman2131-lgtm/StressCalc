package com.stresscalc.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "telemetry_logs")
public class TelemetryLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "log_id")
    private Long logId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "cognitive_bandwidth", nullable = false)
    private Integer cognitiveBandwidth;

    @Column(name = "context_switches", nullable = false)
    private Integer contextSwitches = 0;

    @Column(name = "focus_index", nullable = false, precision = 4, scale = 2)
    private BigDecimal focusIndex;

    @Column(name = "ambient_noise_db")
    private Integer ambientNoiseDb;

    @Column(name = "tab_density")
    private Integer tabDensity;

    @Column(name = "log_timestamp", insertable = false, updatable = false)
    private LocalDateTime logTimestamp;

    // Constructors
    public TelemetryLog() {}

    public TelemetryLog(Long userId, Integer cognitiveBandwidth, Integer contextSwitches, BigDecimal focusIndex, Integer ambientNoiseDb, Integer tabDensity) {
        this.userId = userId;
        this.cognitiveBandwidth = cognitiveBandwidth;
        this.contextSwitches = contextSwitches;
        this.focusIndex = focusIndex;
        this.ambientNoiseDb = ambientNoiseDb;
        this.tabDensity = tabDensity;
    }

    // Getters and Setters
    public Long getLogId() {
        return logId;
    }

    public void setLogId(Long logId) {
        this.logId = logId;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public Integer getCognitiveBandwidth() {
        return cognitiveBandwidth;
    }

    public void setCognitiveBandwidth(Integer cognitiveBandwidth) {
        this.cognitiveBandwidth = cognitiveBandwidth;
    }

    public Integer getContextSwitches() {
        return contextSwitches;
    }

    public void setContextSwitches(Integer contextSwitches) {
        this.contextSwitches = contextSwitches;
    }

    public BigDecimal getFocusIndex() {
        return focusIndex;
    }

    public void setFocusIndex(BigDecimal focusIndex) {
        this.focusIndex = focusIndex;
    }

    public Integer getAmbientNoiseDb() {
        return ambientNoiseDb;
    }

    public void setAmbientNoiseDb(Integer ambientNoiseDb) {
        this.ambientNoiseDb = ambientNoiseDb;
    }

    public Integer getTabDensity() {
        return tabDensity;
    }

    public void setTabDensity(Integer tabDensity) {
        this.tabDensity = tabDensity;
    }

    public LocalDateTime getLogTimestamp() {
        return logTimestamp;
    }

    public void setLogTimestamp(LocalDateTime logTimestamp) {
        this.logTimestamp = logTimestamp;
    }
}
