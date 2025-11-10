<?php
/**
 * Configuration Helper Functions
 * Author: Mr.Nattakit Rookkason
 * Version: 1.0
 * Date: 31 October 2025
 */

// Include main config if not already included
if (!defined('SYSTEM_PATH')) {
    require_once __DIR__ . '/config.php';
}

/**
 * Get database configuration as array
 */
function getDatabaseConfig() {
    return array(
        'host' => DB_HOST,
        'username' => defined('DB_USERNAME') ? DB_USERNAME : (defined('DB_USER') ? DB_USER : 'root'),
        'password' => defined('DB_PASSWORD') ? DB_PASSWORD : (defined('DB_PASS') ? DB_PASS : ''),
        'database' => DB_NAME,
        'charset' => DB_CHARSET,
        // Legacy support
        'user' => defined('DB_USER') ? DB_USER : (defined('DB_USERNAME') ? DB_USERNAME : 'root'),
        'pass' => defined('DB_PASS') ? DB_PASS : (defined('DB_PASSWORD') ? DB_PASSWORD : '')
    );
}

/**
 * Get allowed file types as array
 */
function getAllowedFileTypesArray() {
    if (function_exists('getAllowedFileTypes')) {
        return getAllowedFileTypes();
    }
    return explode(',', ALLOWED_FILE_TYPES);
}

/**
 * Check if file type is allowed
 */
function isAllowedFileType($extension) {
    $allowed = getAllowedFileTypesArray();
    return in_array(strtolower($extension), array_map('strtolower', $allowed));
}

/**
 * Get rate limit configuration
 */
function getRateLimitConfig() {
    return array(
        'general' => RATE_LIMIT_GENERAL,
        'csrf' => RATE_LIMIT_CSRF,
        'login' => RATE_LIMIT_LOGIN,
        'window' => RATE_LIMIT_WINDOW
    );
}

/**
 * Check if in debug mode
 */
function isDebugMode() {
    return defined('DEBUG_MODE') && DEBUG_MODE === true;
}

/**
 * Get application info
 */
function getAppInfo() {
    return array(
        'name' => APP_NAME,
        'version' => APP_VERSION,
        'url' => defined('APP_URL') ? APP_URL : '',
        'environment' => defined('ENVIRONMENT') ? ENVIRONMENT : 'production',
        'debug' => defined('APP_DEBUG') ? APP_DEBUG : (defined('DEBUG_MODE') ? DEBUG_MODE : false)
    );
}

/**
 * Get evaluation thresholds for driving simulator
 */
function getEvaluationThresholds() {
    return array(
        'speed_limit_city' => SPEED_LIMIT_CITY,
        'speed_limit_highway' => SPEED_LIMIT_HIGHWAY,
        'overspeed_threshold' => OVERSPEED_THRESHOLD,
        'sudden_brake_threshold' => SUDDEN_BRAKE_THRESHOLD,
        'lane_violation_threshold' => LANE_VIOLATION_THRESHOLD,
        'evaluation_interval' => EVALUATION_INTERVAL
    );
}

/**
 * Get security configuration
 */
function getSecurityConfig() {
    return array(
        'csrf_token_lifetime' => CSRF_TOKEN_LIFETIME,
        'session_timeout' => defined('SESSION_TIMEOUT') ? SESSION_TIMEOUT : SESSION_LIFETIME,
        'password_min_length' => PASSWORD_MIN_LENGTH,
        'jwt_secret' => defined('JWT_SECRET') ? JWT_SECRET : '',
        'encryption_key' => ENCRYPTION_KEY
    );
}
?>