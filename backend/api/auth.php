<?php
/**
 * Authentication API Endpoints
 * Compatible with PHP 5.6+
 * 
 * @author Mr.Nattakit Rookkason
 * @version 1.0
 * @date 30 October 2025
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

require_once '../config/config.php';
require_once '../models/User.php';
require_once '../utils/Security.php';

// Rate limiting - different limits for different actions
$clientIP = $_SERVER['REMOTE_ADDR'];
$action = isset($_GET['action']) ? $_GET['action'] : '';

// CSRF token requests get higher limit
if ($action === 'csrf-token') {
    if (!Security::rateLimitCheck($clientIP . '_csrf', RATE_LIMIT_CSRF, RATE_LIMIT_WINDOW)) {
        http_response_code(429);
        echo json_encode(array(
            'success' => false, 
            'message' => 'Rate limit exceeded for CSRF token requests',
            'retry_after' => RATE_LIMIT_WINDOW
        ));
        exit;
    }
} elseif ($action === 'login') {
    // Login has stricter limits
    if (!Security::rateLimitCheck($clientIP . '_login', RATE_LIMIT_LOGIN, RATE_LIMIT_WINDOW)) {
        http_response_code(429);
        echo json_encode(array(
            'success' => false, 
            'message' => 'Too many login attempts',
            'retry_after' => RATE_LIMIT_WINDOW
        ));
        exit;
    }
} else {
    // Other requests use general limit
    if (!Security::rateLimitCheck($clientIP, RATE_LIMIT_GENERAL, RATE_LIMIT_WINDOW)) {
        http_response_code(429);
        echo json_encode(array(
            'success' => false, 
            'message' => 'Rate limit exceeded',
            'retry_after' => RATE_LIMIT_WINDOW
        ));
        exit;
    }
}

// Start session
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

$user = new User();
$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true);

// Sanitize input
if ($input) {
    $input = Security::sanitizeInput($input);
}

try {
    switch ($method) {
        case 'POST':
            handlePost($user, $input);
            break;
        case 'GET':
            handleGet($user);
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

function handlePost($user, $input) {
    if (!isset($_GET['action'])) {
        http_response_code(400);
        echo json_encode(array('success' => false, 'message' => 'Action parameter required'));
        return;
    }
    
    $action = $_GET['action'];
    
    switch ($action) {
        case 'register':
            handleRegister($user, $input);
            break;
        case 'login':
            handleLogin($user, $input);
            break;
        case 'logout':
            handleLogout($user);
            break;
        case 'change-password':
            handleChangePassword($user, $input);
            break;
        case 'update-profile':
            handleUpdateProfile($user, $input);
            break;
        default:
            http_response_code(400);
            echo json_encode(array('success' => false, 'message' => 'Invalid action'));
            break;
    }
}

function handleGet($user) {
    if (!isset($_GET['action'])) {
        http_response_code(400);
        echo json_encode(array('success' => false, 'message' => 'Action parameter required'));
        return;
    }
    
    $action = $_GET['action'];
    
    switch ($action) {
        case 'profile':
            handleGetProfile($user);
            break;
        case 'check-session':
            handleCheckSession($user);
            break;
        case 'csrf-token':
            handleGetCSRFToken();
            break;
        default:
            http_response_code(400);
            echo json_encode(array('success' => false, 'message' => 'Invalid action'));
            break;
    }
}

function handleRegister($user, $input) {
    // Validate required fields
    $required = array('username', 'email', 'password', 'fullname');
    foreach ($required as $field) {
        if (!isset($input[$field]) || empty($input[$field])) {
            http_response_code(400);
            echo json_encode(array('success' => false, 'message' => "Field '{$field}' is required"));
            return;
        }
    }
    
    // Validate CSRF token
    if (!isset($input['csrf_token']) || !Security::validateCSRFToken($input['csrf_token'])) {
        http_response_code(403);
        echo json_encode(array('success' => false, 'message' => 'Invalid CSRF token'));
        return;
    }
    
    $result = $user->register(
        $input['username'],
        $input['email'],
        $input['password'],
        $input['fullname'],
        isset($input['phone']) ? $input['phone'] : ''
    );
    
    if ($result['success']) {
        http_response_code(201);
    } else {
        http_response_code(400);
    }
    
    echo json_encode($result);
}

function handleLogin($user, $input) {
    // Validate required fields
    if (!isset($input['username']) || !isset($input['password'])) {
        http_response_code(400);
        echo json_encode(array('success' => false, 'message' => 'Username and password are required'));
        return;
    }
    
    // Validate CSRF token
    if (!isset($input['csrf_token']) || !Security::validateCSRFToken($input['csrf_token'])) {
        http_response_code(403);
        echo json_encode(array('success' => false, 'message' => 'Invalid CSRF token'));
        return;
    }
    
    $result = $user->login($input['username'], $input['password']);
    
    if ($result['success']) {
        // Log successful login
        error_log("User login: " . $input['username'] . " at " . date('Y-m-d H:i:s'));
        http_response_code(200);
    } else {
        // Log failed login attempt
        error_log("Failed login attempt: " . $input['username'] . " from " . $_SERVER['REMOTE_ADDR']);
        http_response_code(401);
    }
    
    echo json_encode($result);
}

function handleLogout($user) {
    $currentUser = $user->getCurrentUser();
    if ($currentUser) {
        error_log("User logout: " . $currentUser['username'] . " at " . date('Y-m-d H:i:s'));
    }
    
    $result = $user->logout();
    echo json_encode($result);
}

function handleChangePassword($user, $input) {
    // Check if user is logged in
    if (!$user->isLoggedIn()) {
        http_response_code(401);
        echo json_encode(array('success' => false, 'message' => 'Authentication required'));
        return;
    }
    
    // Validate required fields
    $required = array('current_password', 'new_password', 'confirm_password');
    foreach ($required as $field) {
        if (!isset($input[$field]) || empty($input[$field])) {
            http_response_code(400);
            echo json_encode(array('success' => false, 'message' => "Field '{$field}' is required"));
            return;
        }
    }
    
    // Validate password confirmation
    if ($input['new_password'] !== $input['confirm_password']) {
        http_response_code(400);
        echo json_encode(array('success' => false, 'message' => 'Password confirmation does not match'));
        return;
    }
    
    // Validate CSRF token
    if (!isset($input['csrf_token']) || !Security::validateCSRFToken($input['csrf_token'])) {
        http_response_code(403);
        echo json_encode(array('success' => false, 'message' => 'Invalid CSRF token'));
        return;
    }
    
    $currentUser = $user->getCurrentUser();
    $result = $user->changePassword($currentUser['id'], $input['current_password'], $input['new_password']);
    
    if ($result['success']) {
        http_response_code(200);
    } else {
        http_response_code(400);
    }
    
    echo json_encode($result);
}

function handleUpdateProfile($user, $input) {
    // Check if user is logged in
    if (!$user->isLoggedIn()) {
        http_response_code(401);
        echo json_encode(array('success' => false, 'message' => 'Authentication required'));
        return;
    }
    
    // Validate CSRF token
    if (!isset($input['csrf_token']) || !Security::validateCSRFToken($input['csrf_token'])) {
        http_response_code(403);
        echo json_encode(array('success' => false, 'message' => 'Invalid CSRF token'));
        return;
    }
    
    $currentUser = $user->getCurrentUser();
    $result = $user->updateProfile($currentUser['id'], $input);
    
    if ($result['success']) {
        http_response_code(200);
    } else {
        http_response_code(400);
    }
    
    echo json_encode($result);
}

function handleGetProfile($user) {
    // Check if user is logged in
    if (!$user->isLoggedIn()) {
        http_response_code(401);
        echo json_encode(array('success' => false, 'message' => 'Authentication required'));
        return;
    }
    
    $currentUser = $user->getCurrentUser();
    if ($currentUser) {
        echo json_encode(array('success' => true, 'user' => $currentUser));
    } else {
        http_response_code(404);
        echo json_encode(array('success' => false, 'message' => 'User not found'));
    }
}

function handleCheckSession($user) {
    $isLoggedIn = $user->isLoggedIn();
    $currentUser = null;
    
    if ($isLoggedIn) {
        $currentUser = $user->getCurrentUser();
    }
    
    echo json_encode(array(
        'success' => true,
        'logged_in' => $isLoggedIn,
        'user' => $currentUser,
        'server_time' => date('Y-m-d H:i:s')
    ));
}

function handleGetCSRFToken() {
    $token = Security::generateCSRFToken();
    echo json_encode(array('success' => true, 'csrf_token' => $token));
}
?>