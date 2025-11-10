<?php
/**
 * Rate Limit Cache Management Utility
 * Author: Mr.Nattakit Rookkason
 * Version: 1.0
 * Date: 31 October 2025
 */

require_once '../config/config.php';
require_once '../utils/Security.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

$method = $_SERVER['REQUEST_METHOD'];
$action = isset($_GET['action']) ? $_GET['action'] : '';

try {
    switch ($method) {
        case 'POST':
            if ($action === 'clear-rate-limit') {
                clearRateLimit();
            } else {
                http_response_code(400);
                echo json_encode(array('success' => false, 'message' => 'Invalid action'));
            }
            break;
        case 'GET':
            if ($action === 'check-rate-limit') {
                checkRateLimit();
            } else {
                http_response_code(400);
                echo json_encode(array('success' => false, 'message' => 'Invalid action'));
            }
            break;
        default:
            http_response_code(405);
            echo json_encode(array('success' => false, 'message' => 'Method not allowed'));
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array('success' => false, 'message' => 'Server error: ' . $e->getMessage()));
}

function clearRateLimit() {
    $clientIP = $_SERVER['REMOTE_ADDR'];
    
    // Clear rate limit files for this IP
    $patterns = array(
        md5($clientIP),
        md5($clientIP . '_csrf'),
        md5($clientIP . '_login')
    );
    
    $cleared = 0;
    foreach ($patterns as $pattern) {
        $file = sys_get_temp_dir() . '/rate_limit_' . $pattern;
        if (file_exists($file) && unlink($file)) {
            $cleared++;
        }
    }
    
    echo json_encode(array(
        'success' => true,
        'message' => "Rate limit cache cleared for IP: {$clientIP}",
        'files_cleared' => $cleared
    ));
}

function checkRateLimit() {
    $clientIP = $_SERVER['REMOTE_ADDR'];
    
    $limits = array(
        'general' => checkLimitForType($clientIP, RATE_LIMIT_GENERAL),
        'csrf' => checkLimitForType($clientIP . '_csrf', RATE_LIMIT_CSRF),
        'login' => checkLimitForType($clientIP . '_login', RATE_LIMIT_LOGIN)
    );
    
    echo json_encode(array(
        'success' => true,
        'ip' => $clientIP,
        'limits' => $limits
    ));
}

function checkLimitForType($identifier, $limit) {
    $file = sys_get_temp_dir() . '/rate_limit_' . md5($identifier);
    
    if (!file_exists($file)) {
        return array(
            'current' => 0,
            'limit' => $limit,
            'remaining' => $limit,
            'status' => 'ok'
        );
    }
    
    $data = json_decode(file_get_contents($file), true);
    if (!$data) {
        return array(
            'current' => 0,
            'limit' => $limit,
            'remaining' => $limit,
            'status' => 'ok'
        );
    }
    
    // Clean old entries
    $now = time();
    $window = RATE_LIMIT_WINDOW;
    $data = array_filter($data, function($timestamp) use ($now, $window) {
        return ($now - $timestamp) < $window;
    });
    
    $current = count($data);
    $remaining = max(0, $limit - $current);
    $status = $remaining > 0 ? 'ok' : 'limited';
    
    return array(
        'current' => $current,
        'limit' => $limit,
        'remaining' => $remaining,
        'status' => $status
    );
}
?>