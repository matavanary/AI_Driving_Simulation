<?php
/**
 * Session Model for Driving Simulation
 * Compatible with PHP 5.6+
 * 
 * @author Mr.Nattakit Rookkason
 * @version 1.0
 * @date 30 October 2025
 */

require_once '../utils/PDOConnection.php';

class Session {
    private $db;
    
    public function __construct() {
        $this->db = PDOConnection::getInstance();
    }
    
    public function createSession($userId, $environmentType = 'city', $vehicleType = 'sedan', $inputDevice = 'keyboard') {
        try {
            // Validate input
            $validEnvironments = array('city', 'highway', 'night', 'rain');
            $validDevices = array('keyboard', 'gamepad', 'g29');
            
            if (!in_array($environmentType, $validEnvironments)) {
                throw new Exception("Invalid environment type");
            }
            
            if (!in_array($inputDevice, $validDevices)) {
                throw new Exception("Invalid input device");
            }
            
            // Check if user has active session
            $activeSession = $this->getActiveSession($userId);
            if ($activeSession) {
                // End previous session first
                $this->endSession($activeSession['session_id']);
            }
            
            $sessionData = array(
                'user_id' => $userId,
                'start_time' => date('Y-m-d H:i:s'),
                'environment_type' => $environmentType,
                'vehicle_type' => $vehicleType,
                'input_device' => $inputDevice,
                'status' => 'active'
            );
            
            $sessionId = $this->db->insert('sessions', $sessionData);
            
            if ($sessionId) {
                return array('success' => true, 'session_id' => $sessionId, 'message' => 'Session created successfully');
            } else {
                throw new Exception("Failed to create session");
            }
            
        } catch (Exception $e) {
            return array('success' => false, 'message' => $e->getMessage());
        }
    }
    
    public function endSession($sessionId, $status = 'completed') {
        try {
            $validStatuses = array('completed', 'aborted');
            if (!in_array($status, $validStatuses)) {
                $status = 'completed';
            }
            
            // Calculate session statistics
            $stats = $this->calculateSessionStats($sessionId);
            
            $updateData = array(
                'end_time' => date('Y-m-d H:i:s'),
                'status' => $status,
                'total_distance' => $stats['total_distance'],
                'total_time' => $stats['total_time']
            );
            
            $result = $this->db->update('sessions', $updateData, 'session_id = :id', array('id' => $sessionId));
            
            if ($result) {
                // Trigger evaluation
                $this->triggerEvaluation($sessionId);
                return array('success' => true, 'message' => 'Session ended successfully', 'stats' => $stats);
            } else {
                throw new Exception("Failed to end session");
            }
            
        } catch (Exception $e) {
            return array('success' => false, 'message' => $e->getMessage());
        }
    }
    
    public function getActiveSession($userId) {
        try {
            $sessions = $this->db->select(
                'sessions', 
                '*', 
                'user_id = :user_id AND status = :status', 
                array('user_id' => $userId, 'status' => 'active'),
                'start_time DESC',
                '1'
            );
            
            return $sessions ? $sessions[0] : null;
        } catch (Exception $e) {
            return null;
        }
    }
    
    public function getSessionById($sessionId) {
        try {
            $sessions = $this->db->select('sessions', '*', 'session_id = :id', array('id' => $sessionId));
            return $sessions ? $sessions[0] : null;
        } catch (Exception $e) {
            return null;
        }
    }
    
    public function getUserSessions($userId, $page = 1, $limit = 10) {
        try {
            $offset = ($page - 1) * $limit;
            
            $sql = "SELECT s.*, e.total_score, e.grade 
                    FROM sessions s 
                    LEFT JOIN evaluations e ON s.session_id = e.session_id 
                    WHERE s.user_id = :user_id 
                    ORDER BY s.start_time DESC 
                    LIMIT :limit OFFSET :offset";
            
            $stmt = $this->db->query($sql, array(
                'user_id' => $userId,
                'limit' => $limit,
                'offset' => $offset
            ));
            
            return $stmt->fetchAll();
        } catch (Exception $e) {
            return array();
        }
    }
    
    public function getAllSessions($page = 1, $limit = 20) {
        try {
            $offset = ($page - 1) * $limit;
            
            $sql = "SELECT s.*, u.username, u.fullname, e.total_score, e.grade 
                    FROM sessions s 
                    LEFT JOIN users u ON s.user_id = u.id 
                    LEFT JOIN evaluations e ON s.session_id = e.session_id 
                    ORDER BY s.start_time DESC 
                    LIMIT :limit OFFSET :offset";
            
            $stmt = $this->db->query($sql, array('limit' => $limit, 'offset' => $offset));
            return $stmt->fetchAll();
        } catch (Exception $e) {
            return array();
        }
    }
    
    private function calculateSessionStats($sessionId) {
        try {
            $sql = "SELECT 
                        COUNT(*) as total_logs,
                        MAX(speed) as max_speed,
                        AVG(speed) as avg_speed,
                        SUM(CASE WHEN speed > 0 THEN 1 ELSE 0 END) as moving_time,
                        MAX(timestamp) as last_log,
                        MIN(timestamp) as first_log
                    FROM driving_logs 
                    WHERE session_id = :session_id";
            
            $stmt = $this->db->query($sql, array('session_id' => $sessionId));
            $result = $stmt->fetch();
            
            if ($result && $result['total_logs'] > 0) {
                $firstTime = strtotime($result['first_log']);
                $lastTime = strtotime($result['last_log']);
                $totalTime = $lastTime - $firstTime;
                
                // Estimate distance (speed * time * conversion factor)
                $totalDistance = ($result['avg_speed'] * $totalTime) / 3600; // km
                
                return array(
                    'total_distance' => round($totalDistance, 2),
                    'total_time' => $totalTime,
                    'max_speed' => round($result['max_speed'], 2),
                    'avg_speed' => round($result['avg_speed'], 2),
                    'total_logs' => $result['total_logs']
                );
            }
            
            return array('total_distance' => 0, 'total_time' => 0, 'max_speed' => 0, 'avg_speed' => 0, 'total_logs' => 0);
            
        } catch (Exception $e) {
            return array('total_distance' => 0, 'total_time' => 0, 'max_speed' => 0, 'avg_speed' => 0, 'total_logs' => 0);
        }
    }
    
    private function triggerEvaluation($sessionId) {
        // This will be handled by the Evaluation class
        require_once 'Evaluation.php';
        $evaluation = new Evaluation();
        return $evaluation->evaluateSession($sessionId);
    }
    
    public function getSessionStatistics($userId = null, $days = 30) {
        try {
            $whereClause = "s.created_at >= DATE_SUB(NOW(), INTERVAL :days DAY)";
            $params = array('days' => $days);
            
            if ($userId) {
                $whereClause .= " AND s.user_id = :user_id";
                $params['user_id'] = $userId;
            }
            
            $sql = "SELECT 
                        COUNT(*) as total_sessions,
                        SUM(s.total_time) as total_driving_time,
                        SUM(s.total_distance) as total_distance,
                        AVG(e.total_score) as avg_score,
                        COUNT(CASE WHEN s.status = 'completed' THEN 1 END) as completed_sessions,
                        COUNT(CASE WHEN s.status = 'aborted' THEN 1 END) as aborted_sessions,
                        s.environment_type as popular_environment
                    FROM sessions s
                    LEFT JOIN evaluations e ON s.session_id = e.session_id
                    WHERE {$whereClause}
                    GROUP BY s.environment_type
                    ORDER BY COUNT(*) DESC";
            
            $stmt = $this->db->query($sql, $params);
            return $stmt->fetchAll();
        } catch (Exception $e) {
            return array();
        }
    }
}
?>