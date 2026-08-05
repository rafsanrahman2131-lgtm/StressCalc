package com.stresscalc.model;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_id")
    private Long userId;

    @Column(name = "full_name", nullable = false, length = 100)
    private String fullName;

    @Column(name = "email", nullable = false, unique = true, length = 255)
    private String email;

    @Column(name = "dob", nullable = true)
    private LocalDate dob;

    @Column(name = "occupation", nullable = true, length = 100)
    private String occupation;

    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    @Column(name = "activity_level", nullable = true, length = 50)
    private String activityLevel;

    @Column(name = "sleep_duration", nullable = true, length = 50)
    private String sleepDuration;

    @Column(name = "caffeine_intake", nullable = true, length = 50)
    private String caffeine;

    @Column(name = "wearable_tracker", nullable = true, length = 50)
    private String wearable;

    @Column(name = "focus_audio", nullable = true, length = 50)
    private String focusAudio;

    @Column(name = "timezone", nullable = true, length = 50)
    private String timezone;

    @Column(name = "account_created", insertable = false, updatable = false)
    private LocalDateTime accountCreated;

    // Constructors
    public User() {}

    public User(String fullName, String email, LocalDate dob, String occupation, String passwordHash) {
        this.fullName = fullName;
        this.email = email;
        this.dob = dob;
        this.occupation = occupation;
        this.passwordHash = passwordHash;
    }

    public User(String fullName, String email, LocalDate dob, String occupation, String passwordHash,
                String activityLevel, String sleepDuration, String caffeine, String wearable,
                String focusAudio, String timezone) {
        this.fullName = fullName;
        this.email = email;
        this.dob = dob;
        this.occupation = occupation;
        this.passwordHash = passwordHash;
        this.activityLevel = activityLevel;
        this.sleepDuration = sleepDuration;
        this.caffeine = caffeine;
        this.wearable = wearable;
        this.focusAudio = focusAudio;
        this.timezone = timezone;
    }

    // Getters and Setters
    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public LocalDate getDob() {
        return dob;
    }

    public void setDob(LocalDate dob) {
        this.dob = dob;
    }

    public String getOccupation() {
        return occupation;
    }

    public void setOccupation(String occupation) {
        this.occupation = occupation;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public String getActivityLevel() {
        return activityLevel;
    }

    public void setActivityLevel(String activityLevel) {
        this.activityLevel = activityLevel;
    }

    public String getSleepDuration() {
        return sleepDuration;
    }

    public void setSleepDuration(String sleepDuration) {
        this.sleepDuration = sleepDuration;
    }

    public String getCaffeine() {
        return caffeine;
    }

    public void setCaffeine(String caffeine) {
        this.caffeine = caffeine;
    }

    public String getWearable() {
        return wearable;
    }

    public void setWearable(String wearable) {
        this.wearable = wearable;
    }

    public String getFocusAudio() {
        return focusAudio;
    }

    public void setFocusAudio(String focusAudio) {
        this.focusAudio = focusAudio;
    }

    public String getTimezone() {
        return timezone;
    }

    public void setTimezone(String timezone) {
        this.timezone = timezone;
    }

    public LocalDateTime getAccountCreated() {
        return accountCreated;
    }
}
