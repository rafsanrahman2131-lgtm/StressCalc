-- ===================================================
-- StressCalculator Database Schema Definition
-- MySQL 8.0 / Spring Boot JPA Pre-Wiring
-- ===================================================

-- 1. Create the Database
CREATE DATABASE IF NOT EXISTS stress_calculator;
USE stress_calculator;

-- 2. Create the Users Table (Maps to auth.html Signup Form)
CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    dob DATE NOT NULL,
    occupation VARCHAR(50) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    account_created TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create the Telemetry Logs Table (Maps to dashboard.html Data)
CREATE TABLE IF NOT EXISTS telemetry_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    cognitive_bandwidth INT NOT NULL COMMENT 'Percentage 0-100',
    context_switches INT NOT NULL DEFAULT 0,
    focus_index DECIMAL(4,2) NOT NULL COMMENT 'Score out of 10',
    ambient_noise_db INT DEFAULT NULL,
    tab_density INT DEFAULT NULL,
    log_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- 4. Create the Action Events Table (Maps to "Recent Stressors" List)
CREATE TABLE IF NOT EXISTS action_events (
    event_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    event_description VARCHAR(255) NOT NULL,
    event_type VARCHAR(50) DEFAULT 'stressor',
    event_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);
