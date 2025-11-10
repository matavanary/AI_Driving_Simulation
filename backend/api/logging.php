<?php
/**
 * Data Logging API Endpoints
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

require_once '../models/User.php';
require_once '../models/Session.php';
require_once '../models/DrivingLog.php';
require_once '../utils/Security.php';

// Rate limiting for logging (higher limit)
$clientIP = $_SERVER['REMOTE_ADDR'];
if (!Security::rateLimitCheck($clientIP . '_logging', 1000, 3600)) {
    http_response_code(429);
    echo json_encode(array('success' => false, 'message' => 'Rate limit exceeded'));
    exit;
}

// Start session
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

$user = new User();
$sessionModel = new Session();
$drivingLog = new DrivingLog();

// Check authentication
if (!$user->isLoggedIn()) {
    http_response_code(401);
    echo json_encode(array('success' => false, 'message' => 'Authentication required'));
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true);

// Sanitize input
if ($input) {
    $input = Security::sanitizeInput($input);
}

try {
    switch ($method) {
        case 'POST':
            handlePost($user, $sessionModel, $drivingLog, $input);
            break;
        case 'GET':
            handleGet($user, $sessionModel, $drivingLog);
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

function handlePost($user, $sessionModel, $drivingLog, $input) {
    if (!isset($_GET['action'])) {
        http_response_code(400);
        echo json_encode(array('success' => false, 'message' => 'Action parameter required'));
        return;
    }
    
    $action = $_GET['action'];
    
    switch ($action) {
        case 'start-session':
            handleStartSession($user, $sessionModel, $input);
            break;
        case 'end-session':
            handleEndSession($user, $sessionModel, $input);
            break;
        case 'log-data':
            handleLogData($user, $drivingLog, $input);
            break;
        case 'batch-log':
            handleBatchLog($user, $drivingLog, $input);
            break;
        case 'flush-buffer':
            handleFlushBuffer($drivingLog);
            break;
        default:
            http_response_code(400);
            echo json_encode(array('success' => false, 'message' => 'Invalid action'));
            break;
    }
}

function handleGet($user, $sessionModel, $drivingLog) {
    if (!isset($_GET['action'])) {
        http_response_code(400);
        echo json_encode(array('success' => false, 'message' => 'Action parameter required'));
        return;
    }
    
    $action = $_GET['action'];
    
    switch ($action) {
        case 'active-session':
            handleGetActiveSession($user, $sessionModel);
            break;
        case 'session-logs':
            handleGetSessionLogs($drivingLog);
            break;
        case 'latest-logs':
            handleGetLatestLogs($drivingLog);
            break;
        case 'session-stats':
            handleGetSessionStats($drivingLog);
            break;
        case 'user-sessions':
            handleGetUserSessions($user, $sessionModel);
            break;
        default:
            http_response_code(400);
            echo json_encode(array('success' => false, 'message' => 'Invalid action'));
            break;
    }
}

function handleStartSession($user, $sessionModel, $input) {
    $currentUser = $user->getCurrentUser();
    
    // Default values
    $environmentType = isset($input['environment_type']) ? $input['environment_type'] : 'city';
    $vehicleType = isset($input['vehicle_type']) ? $input['vehicle_type'] : 'sedan';
    $inputDevice = isset($input['input_device']) ? $input['input_device'] : 'keyboard';
    
    $result = $sessionModel->createSession($currentUser['id'], $environmentType, $vehicleType, $inputDevice);
    
    if ($result['success']) {
        // Log session start
        error_log("Session started: ID " . $result['session_id'] . " by user " . $currentUser['username']);
        http_response_code(201);
    } else {
        http_response_code(400);
    }
    
    echo json_encode($result);
}

function handleEndSession($user, $sessionModel, $input) {
    if (!isset($input['session_id'])) {
        http_response_code(400);
        echo json_encode(array('success' => false, 'message' => 'Session ID required'));
        return;
    }
    
    $status = isset($input['status']) ? $input['status'] : 'completed';
    $result = $sessionModel->endSession($input['session_id'], $status);
    
    if ($result['success']) {
        $currentUser = $user->getCurrentUser();
        error_log("Session ended: ID " . $input['session_id'] . " by user " . $currentUser['username']);
        http_response_code(200);
    } else {
        http_response_code(400);
    }
    
    echo json_encode($result);
}

function handleLogData($user, $drivingLog, $input) {
    if (!isset($input['session_id']) || !isset($input['data'])) {
        http_response_code(400);
        echo json_encode(array('success' => false, 'message' => 'Session ID and data required'));
        return;
    }
    
    // Validate session belongs to user
    $currentUser = $user->getCurrentUser();
    $sessionModel = new Session();
    $session = $sessionModel->getSessionById($input['session_id']);
    
    if (!$session || $session['user_id'] != $currentUser['id']) {
        http_response_code(403);
        echo json_encode(array('success' => false, 'message' => 'Access denied'));
        return;
    }
    
    if ($session['status'] !== 'active') {
        http_response_code(400);
        echo json_encode(array('success' => false, 'message' => 'Session is not active'));
        return;
    }
    
    $result = $drivingLog->logData($input['session_id'], $input['data']);
    
    if ($result['success']) {
        http_response_code(200);
    } else {
        http_response_code(400);
    }
    
    echo json_encode($result);
}

function handleBatchLog($user, $drivingLog, $input) {
    if (!isset($input['session_id']) || !isset($input['data']) || !is_array($input['data'])) {
        http_response_code(400);
        echo json_encode(array('success' => false, 'message' => 'Session ID and data array required'));
        return;
    }
    
    // Validate session belongs to user
    $currentUser = $user->getCurrentUser();
    $sessionModel = new Session();
    $session = $sessionModel->getSessionById($input['session_id']);
    
    if (!$session || $session['user_id'] != $currentUser['id']) {
        http_response_code(403);
        echo json_encode(array('success' => false, 'message' => 'Access denied'));
        return;
    }
    
    $result = $drivingLog->batchLogData($input['session_id'], $input['data']);
    
    if ($result['success']) {
        http_response_code(200);
    } else {
        http_response_code(400);
    }
    
    echo json_encode($result);
}

function handleFlushBuffer($drivingLog) {
    $result = $drivingLog->flushBuffer();
    echo json_encode($result);
}

function handleGetActiveSession($user, $sessionModel) {
    $currentUser = $user->getCurrentUser();
    $session = $sessionModel->getActiveSession($currentUser['id']);
    
    if ($session) {
        echo json_encode(array('success' => true, 'session' => $session));
    } else {
        echo json_encode(array('success' => false, 'message' => 'No active session'));
    }
}

function handleGetSessionLogs($drivingLog) {
    if (!isset($_GET['session_id'])) {
        http_response_code(400);
        echo json_encode(array('success' => false, 'message' => 'Session ID required'));
        return;
    }
    
    $sessionId = (int) $_GET['session_id'];
    $limit = isset($_GET['limit']) ? (int) $_GET['limit'] : 1000;
    $offset = isset($_GET['offset']) ? (int) $_GET['offset'] : 0;
    
    $logs = $drivingLog->getSessionLogs($sessionId, $limit, $offset);
    echo json_encode(array('success' => true, 'logs' => $logs, 'count' => count($logs)));
}

function handleGetLatestLogs($drivingLog) {
    if (!isset($_GET['session_id'])) {
        http_response_code(400);
        echo json_encode(array('success' => false, 'message' => 'Session ID required'));
        return;
    }
    
    $sessionId = (int) $_GET['session_id'];
    $seconds = isset($_GET['seconds']) ? (int) $_GET['seconds'] : 30;
    
    $logs = $drivingLog->getLatestLogs($sessionId, $seconds);
    echo json_encode(array('success' => true, 'logs' => $logs, 'count' => count($logs)));
}

function handleGetSessionStats($drivingLog) {
    if (!isset($_GET['session_id'])) {
        http_response_code(400);
        echo json_encode(array('success' => false, 'message' => 'Session ID required'));
        return;
    }
    
    $sessionId = (int) $_GET['session_id'];
    $stats = $drivingLog->getLogStatistics($sessionId);
    
    echo json_encode(array('success' => true, 'statistics' => $stats));
}

function handleGetUserSessions($user, $sessionModel) {
    $currentUser = $user->getCurrentUser();
    $page = isset($_GET['page']) ? (int) $_GET['page'] : 1;
    $limit = isset($_GET['limit']) ? (int) $_GET['limit'] : 10;
    
    $sessions = $sessionModel->getUserSessions($currentUser['id'], $page, $limit);
    echo json_encode(array('success' => true, 'sessions' => $sessions, 'count' => count($sessions)));
}
?>