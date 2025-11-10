<?php
/**
 * Evaluation API Endpoints
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
require_once '../models/Evaluation.php';
require_once '../models/DrivingLog.php';
require_once '../utils/Security.php';

// Rate limiting
$clientIP = $_SERVER['REMOTE_ADDR'];
if (!Security::rateLimitCheck($clientIP . '_evaluation', 100, 3600)) {
    http_response_code(429);
    echo json_encode(array('success' => false, 'message' => 'Rate limit exceeded'));
    exit;
}

// Start session
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

$user = new User();
$evaluation = new Evaluation();

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
            handlePost($user, $evaluation, $input);
            break;
        case 'GET':
            handleGet($user, $evaluation);
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

function handlePost($user, $evaluation, $input) {
    if (!isset($_GET['action'])) {
        http_response_code(400);
        echo json_encode(array('success' => false, 'message' => 'Action parameter required'));
        return;
    }
    
    $action = $_GET['action'];
    
    switch ($action) {
        case 'evaluate':
            handleEvaluateSession($user, $evaluation, $input);
            break;
        case 'real-time-analysis':
            handleRealTimeAnalysis($user, $input);
            break;
        default:
            http_response_code(400);
            echo json_encode(array('success' => false, 'message' => 'Invalid action'));
            break;
    }
}

function handleGet($user, $evaluation) {
    if (!isset($_GET['action'])) {
        http_response_code(400);
        echo json_encode(array('success' => false, 'message' => 'Action parameter required'));
        return;
    }
    
    $action = $_GET['action'];
    
    switch ($action) {
        case 'session-evaluation':
            handleGetSessionEvaluation($evaluation);
            break;
        case 'user-evaluations':
            handleGetUserEvaluations($user, $evaluation);
            break;
        case 'evaluation-stats':
            handleGetEvaluationStats($user, $evaluation);
            break;
        case 'behavior-analysis':
            handleGetBehaviorAnalysis($user);
            break;
        case 'leaderboard':
            handleGetLeaderboard($evaluation);
            break;
        default:
            http_response_code(400);
            echo json_encode(array('success' => false, 'message' => 'Invalid action'));
            break;
    }
}

function handleEvaluateSession($user, $evaluation, $input) {
    if (!isset($input['session_id'])) {
        http_response_code(400);
        echo json_encode(array('success' => false, 'message' => 'Session ID required'));
        return;
    }
    
    // Validate session belongs to user or user is admin
    $currentUser = $user->getCurrentUser();
    $sessionModel = new Session();
    $session = $sessionModel->getSessionById($input['session_id']);
    
    if (!$session || ($session['user_id'] != $currentUser['id'] && $currentUser['role'] !== 'admin')) {
        http_response_code(403);
        echo json_encode(array('success' => false, 'message' => 'Access denied'));
        return;
    }
    
    $result = $evaluation->evaluateSession($input['session_id']);
    
    if ($result['success']) {
        http_response_code(200);
        error_log("Evaluation completed for session " . $input['session_id'] . " - Score: " . $result['score']);
    } else {
        http_response_code(400);
    }
    
    echo json_encode($result);
}

function handleRealTimeAnalysis($user, $input) {
    if (!isset($input['session_id']) || !isset($input['current_data'])) {
        http_response_code(400);
        echo json_encode(array('success' => false, 'message' => 'Session ID and current data required'));
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
    
    try {
        $data = $input['current_data'];
        $analysis = array();
        
        // Real-time behavior analysis
        $speedLimit = ($session['environment_type'] === 'highway') ? SPEED_LIMIT_HIGHWAY : SPEED_LIMIT_CITY;
        
        // Check overspeed
        if ($data['speed'] > ($speedLimit + OVERSPEED_THRESHOLD)) {
            $analysis['overspeed'] = true;
            $analysis['speed_violation'] = $data['speed'] - $speedLimit;
        } else {
            $analysis['overspeed'] = false;
        }
        
        // Check sudden braking
        if ($data['brake_force'] > SUDDEN_BRAKE_THRESHOLD && $data['speed'] > 10) {
            $analysis['sudden_brake'] = true;
        } else {
            $analysis['sudden_brake'] = false;
        }
        
        // Check lane violation
        if (abs($data['lane_position']) > LANE_VIOLATION_THRESHOLD) {
            $analysis['lane_violation'] = true;
            $analysis['lane_deviation'] = abs($data['lane_position']);
        } else {
            $analysis['lane_violation'] = false;
        }
        
        // Check collision
        if (isset($data['collision']) && $data['collision']) {
            $analysis['collision'] = true;
        } else {
            $analysis['collision'] = false;
        }
        
        // Calculate instant score penalty
        $penalty = 0;
        if ($analysis['overspeed']) $penalty += 2;
        if ($analysis['sudden_brake']) $penalty += 1;
        if ($analysis['lane_violation']) $penalty += 3;
        if ($analysis['collision']) $penalty += 5;
        
        $analysis['instant_penalty'] = $penalty;
        $analysis['timestamp'] = date('Y-m-d H:i:s');
        
        echo json_encode(array('success' => true, 'analysis' => $analysis));
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('success' => false, 'message' => $e->getMessage()));
    }
}

function handleGetSessionEvaluation($evaluation) {
    if (!isset($_GET['session_id'])) {
        http_response_code(400);
        echo json_encode(array('success' => false, 'message' => 'Session ID required'));
        return;
    }
    
    $sessionId = (int) $_GET['session_id'];
    $result = $evaluation->getEvaluationBySession($sessionId);
    
    if ($result) {
        // Decode evaluation_data if it's JSON
        if ($result['evaluation_data']) {
            $result['detailed_report'] = json_decode($result['evaluation_data'], true);
        }
        
        echo json_encode(array('success' => true, 'evaluation' => $result));
    } else {
        http_response_code(404);
        echo json_encode(array('success' => false, 'message' => 'Evaluation not found'));
    }
}

function handleGetUserEvaluations($user, $evaluation) {
    $currentUser = $user->getCurrentUser();
    $limit = isset($_GET['limit']) ? (int) $_GET['limit'] : 10;
    
    $evaluations = $evaluation->getUserEvaluations($currentUser['id'], $limit);
    
    // Decode evaluation_data for each evaluation
    foreach ($evaluations as &$eval) {
        if ($eval['evaluation_data']) {
            $eval['detailed_report'] = json_decode($eval['evaluation_data'], true);
        }
    }
    
    echo json_encode(array('success' => true, 'evaluations' => $evaluations, 'count' => count($evaluations)));
}

function handleGetEvaluationStats($user, $evaluation) {
    $currentUser = $user->getCurrentUser();
    $days = isset($_GET['days']) ? (int) $_GET['days'] : 30;
    $userId = ($currentUser['role'] === 'admin' && isset($_GET['user_id'])) ? (int) $_GET['user_id'] : $currentUser['id'];
    
    $stats = $evaluation->getEvaluationStats($userId, $days);
    echo json_encode(array('success' => true, 'statistics' => $stats));
}

function handleGetBehaviorAnalysis($user) {
    if (!isset($_GET['session_id'])) {
        http_response_code(400);
        echo json_encode(array('success' => false, 'message' => 'Session ID required'));
        return;
    }
    
    $sessionId = (int) $_GET['session_id'];
    
    // Validate session access
    $currentUser = $user->getCurrentUser();
    $sessionModel = new Session();
    $session = $sessionModel->getSessionById($sessionId);
    
    if (!$session || ($session['user_id'] != $currentUser['id'] && $currentUser['role'] !== 'admin')) {
        http_response_code(403);
        echo json_encode(array('success' => false, 'message' => 'Access denied'));
        return;
    }
    
    $drivingLog = new DrivingLog();
    $analysis = $drivingLog->analyzeBehaviorPatterns($sessionId);
    
    echo json_encode(array('success' => true, 'behavior_analysis' => $analysis));
}

function handleGetLeaderboard($evaluation) {
    $days = isset($_GET['days']) ? (int) $_GET['days'] : 30;
    $limit = isset($_GET['limit']) ? (int) $_GET['limit'] : 10;
    
    try {
        $db = PDOConnection::getInstance();
        
        $sql = "SELECT 
                    u.id,
                    u.username,
                    u.fullname,
                    COUNT(e.eval_id) as total_sessions,
                    AVG(e.total_score) as avg_score,
                    MAX(e.total_score) as best_score,
                    SUM(CASE WHEN e.grade IN ('A+', 'A') THEN 1 ELSE 0 END) as excellent_count
                FROM users u
                JOIN sessions s ON u.id = s.user_id
                JOIN evaluations e ON s.session_id = e.session_id
                WHERE s.start_time >= DATE_SUB(NOW(), INTERVAL :days DAY)
                AND u.role = 'user'
                GROUP BY u.id, u.username, u.fullname
                HAVING COUNT(e.eval_id) >= 3
                ORDER BY avg_score DESC, best_score DESC
                LIMIT :limit";
        
        $stmt = $db->query($sql, array('days' => $days, 'limit' => $limit));
        $leaderboard = $stmt->fetchAll();
        
        // Add ranking
        $rank = 1;
        foreach ($leaderboard as &$entry) {
            $entry['rank'] = $rank++;
            $entry['avg_score'] = round($entry['avg_score'], 1);
        }
        
        echo json_encode(array('success' => true, 'leaderboard' => $leaderboard));
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('success' => false, 'message' => $e->getMessage()));
    }
}
?>