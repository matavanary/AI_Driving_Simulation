-- ===================================================
-- Driving Behavior Simulation Database Schema
-- Compatible with MySQL 5.7+
-- Author: Mr.Nattakit Rookkason
-- Date: 30 October 2025
-- ===================================================

-- Create database
CREATE DATABASE IF NOT EXISTS driving_simulation 
CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE driving_simulation;

-- Table: users
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    fullname VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    role ENUM('user', 'admin') DEFAULT 'user',
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_role (role)
) ENGINE=InnoDB;

-- Table: sessions
CREATE TABLE sessions (
    session_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    end_time DATETIME NULL,
    environment_type ENUM('city', 'highway', 'night', 'rain') DEFAULT 'city',
    vehicle_type VARCHAR(50) DEFAULT 'sedan',
    input_device ENUM('keyboard', 'gamepad', 'g29') DEFAULT 'keyboard',
    status ENUM('active', 'completed', 'aborted') DEFAULT 'active',
    total_distance FLOAT DEFAULT 0,
    total_time INT DEFAULT 0, -- in seconds
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_sessions (user_id, start_time),
    INDEX idx_environment (environment_type),
    INDEX idx_status (status)
) ENGINE=InnoDB;

-- Table: driving_logs
CREATE TABLE driving_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    speed FLOAT NOT NULL DEFAULT 0,
    steering_angle FLOAT NOT NULL DEFAULT 0, -- -1 to 1
    brake_force FLOAT NOT NULL DEFAULT 0,    -- 0 to 1
    throttle_force FLOAT NOT NULL DEFAULT 0, -- 0 to 1
    gear INT DEFAULT 1,
    rpm FLOAT DEFAULT 0,
    lane_position FLOAT DEFAULT 0, -- -1 (left) to 1 (right)
    position_x FLOAT DEFAULT 0,
    position_y FLOAT DEFAULT 0,
    position_z FLOAT DEFAULT 0,
    collision BOOLEAN DEFAULT FALSE,
    
    FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE,
    INDEX idx_session_timestamp (session_id, timestamp),
    INDEX idx_collision (collision)
) ENGINE=InnoDB;

-- Table: evaluations
CREATE TABLE evaluations (
    eval_id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    overspeed_count INT DEFAULT 0,
    sudden_brake_count INT DEFAULT 0,
    sudden_acceleration_count INT DEFAULT 0,
    lane_violation_count INT DEFAULT 0,
    collision_count INT DEFAULT 0,
    signal_violation_count INT DEFAULT 0,
    total_score INT DEFAULT 100,
    grade ENUM('A+', 'A', 'B+', 'B', 'C+', 'C', 'D+', 'D', 'F') DEFAULT 'F',
    max_speed FLOAT DEFAULT 0,
    avg_speed FLOAT DEFAULT 0,
    harsh_braking_events INT DEFAULT 0,
    smooth_driving_percentage FLOAT DEFAULT 0,
    evaluation_data JSON,
    report_generated BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE,
    INDEX idx_session_eval (session_id),
    INDEX idx_grade (grade),
    INDEX idx_score (total_score)
) ENGINE=InnoDB;

-- Table: system_settings
CREATE TABLE system_settings (
    setting_id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Insert default settings
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
('speed_limit_city', '50', 'Speed limit in city environment (km/h)'),
('speed_limit_highway', '120', 'Speed limit in highway environment (km/h)'),
('overspeed_threshold', '10', 'Speed over limit threshold (km/h)'),
('sudden_brake_threshold', '0.7', 'Brake force threshold for sudden braking'),
('lane_violation_threshold', '0.8', 'Lane position threshold for violation'),
('evaluation_interval', '0.5', 'Data logging interval (seconds)'),
('max_session_time', '1800', 'Maximum session time (seconds)');

-- Create views for reporting
CREATE VIEW session_summary AS
SELECT 
    s.session_id,
    s.user_id,
    u.username,
    u.fullname,
    s.start_time,
    s.end_time,
    s.environment_type,
    s.total_distance,
    s.total_time,
    e.total_score,
    e.grade,
    e.overspeed_count,
    e.collision_count
FROM sessions s
LEFT JOIN users u ON s.user_id = u.id
LEFT JOIN evaluations e ON s.session_id = e.session_id;

-- Create sample admin user (password: admin123)
INSERT INTO users (username, email, password, fullname, role) VALUES 
('admin', 'admin@driving-sim.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'System Administrator', 'admin');

-- Create sample test user (password: test123)
INSERT INTO users (username, email, password, fullname, role) VALUES 
('testuser', 'test@driving-sim.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Test User', 'user');