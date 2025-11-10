<?php
/**
 * Database Configuration Wrapper for Driving Behavior Simulation
 * This file now redirects to the main config.php for centralized configuration
 * Compatible with PHP 5.6+
 * 
 * @author Mr.Nattakit Rookkason
 * @version 2.0
 * @date 31 October 2025
 */

// Check if we're in the backend folder structure
if (file_exists(__DIR__ . '/../backend/config/config.php')) {
    // Include main config from backend folder
    require_once __DIR__ . '/../backend/config/config.php';
} elseif (file_exists(__DIR__ . '/backend/config/config.php')) {
    // Include main config from current folder
    require_once __DIR__ . '/backend/config/config.php';
} elseif (file_exists(__DIR__ . '/../config/config.php')) {
    // Include main config from parent folder
    require_once __DIR__ . '/../config/config.php';
} else {
    // Fallback - define basic constants if config not found
    if (!defined('DB_HOST')) {
        define('DB_HOST', 'localhost');
        define('DB_NAME', 'driving_simulation');
        define('DB_USER', 'root');
        define('DB_PASS', '12345678');
        define('DB_CHARSET', 'utf8mb4');
        define('APP_NAME', 'Driving Behavior Simulation');
        define('APP_VERSION', '1.0');
        define('APP_DEBUG', true);
        
        // Set timezone
        date_default_timezone_set('Asia/Bangkok');
        
        // Error reporting
        if (APP_DEBUG) {
            error_reporting(E_ALL);
            ini_set('display_errors', 1);
        }
    }
}

// Ensure legacy constants exist for backward compatibility
if (!defined('DB_USER') && defined('DB_USERNAME')) {
    define('DB_USER', DB_USERNAME);
}
if (!defined('DB_PASS') && defined('DB_PASSWORD')) {
    define('DB_PASS', DB_PASSWORD);
}
if (!defined('APP_DEBUG') && defined('DEBUG_MODE')) {
    define('APP_DEBUG', DEBUG_MODE);
}
if (!defined('SESSION_LIFETIME') && defined('SESSION_TIMEOUT')) {
    define('SESSION_LIFETIME', SESSION_TIMEOUT);
}

// Legacy wrapper functions for backward compatibility
if (!function_exists('getDatabaseConfig')) {
    function getDatabaseConfig() {
        return array(
            'host' => DB_HOST,
            'username' => defined('DB_USERNAME') ? DB_USERNAME : DB_USER,
            'password' => defined('DB_PASSWORD') ? DB_PASSWORD : DB_PASS,
            'database' => DB_NAME,
            'charset' => DB_CHARSET
        );
    }
}
?>