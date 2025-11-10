<?php
/**
 * Configuration File for Web Driving Simulator
 * Author: Mr.Nattakit Rookkason
 * Version: 1.0
 * Date: 31 October 2025
 */

// Prevent direct access
if (!defined('SYSTEM_PATH')) {
    define('SYSTEM_PATH', __DIR__);
}

// Database Configuration
if (!defined('DB_HOST')) define('DB_HOST', 'localhost');
if (!defined('DB_USERNAME')) define('DB_USERNAME', 'root');
if (!defined('DB_PASSWORD')) define('DB_PASSWORD', '12345678');
if (!defined('DB_NAME')) define('DB_NAME', 'driving_simulation');
if (!defined('DB_CHARSET')) define('DB_CHARSET', 'utf8mb4');

// Legacy Database Constants (for backward compatibility)
if (!defined('DB_USER')) define('DB_USER', DB_USERNAME);
if (!defined('DB_PASS')) define('DB_PASS', DB_PASSWORD);

// Security Configuration
if (!defined('CSRF_TOKEN_LIFETIME')) define('CSRF_TOKEN_LIFETIME', 30 * 60); // 30 minutes in seconds
if (!defined('SESSION_TIMEOUT')) define('SESSION_TIMEOUT', 60 * 60); // 1 hour in seconds
if (!defined('SESSION_LIFETIME')) define('SESSION_LIFETIME', SESSION_TIMEOUT); // Legacy compatibility
if (!defined('PASSWORD_MIN_LENGTH')) define('PASSWORD_MIN_LENGTH', 8);
if (!defined('ENCRYPTION_KEY')) define('ENCRYPTION_KEY', 'your-encryption-key-here-change-this-in-production');
if (!defined('JWT_SECRET')) define('JWT_SECRET', '010339NattakitRookkason');

// Rate Limiting Configuration
define('RATE_LIMIT_GENERAL', 100); // General API requests per hour
define('RATE_LIMIT_CSRF', 300); // CSRF token requests per hour
define('RATE_LIMIT_LOGIN', 10); // Login attempts per hour
define('RATE_LIMIT_WINDOW', 3600); // 1 hour in seconds

// File Upload Configuration  
if (!defined('MAX_FILE_SIZE')) define('MAX_FILE_SIZE', 10 * 1024 * 1024); // 10MB (matching database.php)
if (!defined('ALLOWED_FILE_TYPES')) define('ALLOWED_FILE_TYPES', 'jpg,jpeg,png,gif,pdf,doc,docx'); // PHP 5.6 compatible
if (!defined('UPLOAD_PATH')) define('UPLOAD_PATH', __DIR__ . '/../uploads/');

// API Configuration
define('API_VERSION', '1.0');
define('API_TIMEOUT', 30); // seconds
define('API_MAX_REQUESTS_PER_MINUTE', 60);

// Legacy API Constants (for backward compatibility)
if (!defined('API_RATE_LIMIT')) define('API_RATE_LIMIT', RATE_LIMIT_GENERAL);

// Logging Configuration
define('LOG_LEVEL', 'INFO'); // DEBUG, INFO, WARNING, ERROR
define('LOG_PATH', __DIR__ . '/../logs/');
define('LOG_MAX_SIZE', 10 * 1024 * 1024); // 10MB

// Legacy Log Constants (for backward compatibility)
if (!defined('LOG_RETENTION_DAYS')) define('LOG_RETENTION_DAYS', 30);

// Development/Production Settings
define('ENVIRONMENT', 'development'); // development or production
define('DEBUG_MODE', true);
define('ERROR_REPORTING', true);

// Legacy Debug Constants (for backward compatibility)
if (!defined('APP_DEBUG')) define('APP_DEBUG', DEBUG_MODE);

// Email Configuration (if needed)
define('SMTP_HOST', 'smtp.gmail.com');
define('SMTP_PORT', 587);
define('SMTP_USERNAME', '');
define('SMTP_PASSWORD', '');
define('SMTP_FROM_EMAIL', '');
define('SMTP_FROM_NAME', 'Web Driving Simulator');

// Application Settings
if (!defined('APP_NAME')) define('APP_NAME', 'Web Driving Simulator');
if (!defined('APP_VERSION')) define('APP_VERSION', '1.0.0');
if (!defined('APP_URL')) define('APP_URL', 'http://localhost/enomban/AI/WebDrivingSimulator/');
if (!defined('FRONTEND_URL')) define('FRONTEND_URL', 'http://localhost/enomban/AI/WebDrivingSimulator/frontend/');
if (!defined('BACKEND_URL')) define('BACKEND_URL', 'http://localhost/enomban/AI/WebDrivingSimulator/backend/');

// Evaluation Configuration (Driving Simulator Specific)
define('SPEED_LIMIT_CITY', 50);
define('SPEED_LIMIT_HIGHWAY', 120);
define('OVERSPEED_THRESHOLD', 10);
define('SUDDEN_BRAKE_THRESHOLD', 0.7);
define('LANE_VIOLATION_THRESHOLD', 0.8);
define('EVALUATION_INTERVAL', 0.5);

// Timezone
date_default_timezone_set('Asia/Bangkok');

// Error handling for development
if (ENVIRONMENT === 'development') {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
} else {
    error_reporting(0);
    ini_set('display_errors', 0);
}

// Helper function to get allowed file types as array (PHP 5.6 compatible)
if (!function_exists('getAllowedFileTypes')) {
    function getAllowedFileTypes() {
        return explode(',', ALLOWED_FILE_TYPES);
    }
}
?>