<?php
/**
 * Evaluation Model - Driving Behavior Analysis
 * Compatible with PHP 5.6+
 * 
 * @author Mr.Nattakit Rookkason
 * @version 1.0
 * @date 30 October 2025
 */

require_once '../utils/PDOConnection.php';
require_once 'DrivingLog.php';
require_once 'Session.php';

class Evaluation {
    private $db;
    
    public function __construct() {
        $this->db = PDOConnection::getInstance();
    }
    
    public function evaluateSession($sessionId) {
        try {
            // Get session data
            $sessionModel = new Session();
            $session = $sessionModel->getSessionById($sessionId);
            
            if (!$session) {
                throw new Exception("Session not found");
            }
            
            // Get driving logs analysis
            $drivingLog = new DrivingLog();
            $behaviorAnalysis = $drivingLog->analyzeBehaviorPatterns($sessionId);
            $logStats = $drivingLog->getLogStatistics($sessionId);
            
            // Calculate behavior metrics
            $metrics = $this->calculateBehaviorMetrics($sessionId, $session, $behaviorAnalysis, $logStats);
            
            // Calculate final score
            $score = $this->calculateScore($metrics);
            
            // Determine grade
            $grade = $this->determineGrade($score);
            
            // Create evaluation record
            $evaluationData = array(
                'session_id' => $sessionId,
                'overspeed_count' => $metrics['overspeed_count'],
                'sudden_brake_count' => $metrics['sudden_brake_count'],
                'sudden_acceleration_count' => $metrics['sudden_acceleration_count'],
                'lane_violation_count' => $metrics['lane_violation_count'],
                'collision_count' => $metrics['collision_count'],
                'signal_violation_count' => $metrics['signal_violation_count'],
                'total_score' => $score,
                'grade' => $grade,
                'max_speed' => $logStats['max_speed'],
                'avg_speed' => $logStats['avg_speed'],
                'harsh_braking_events' => $metrics['harsh_braking_events'],
                'smooth_driving_percentage' => $metrics['smooth_driving_percentage'],
                'evaluation_data' => json_encode($this->generateDetailedReport($metrics, $logStats, $session))
            );
            
            // Check if evaluation already exists
            $existingEval = $this->getEvaluationBySession($sessionId);
            if ($existingEval) {
                $result = $this->db->update('evaluations', $evaluationData, 'session_id = :id', array('id' => $sessionId));
                $evalId = $existingEval['eval_id'];
            } else {
                $evalId = $this->db->insert('evaluations', $evaluationData);
            }
            
            if ($evalId) {
                return array(
                    'success' => true, 
                    'evaluation_id' => $evalId,
                    'score' => $score,
                    'grade' => $grade,
                    'metrics' => $metrics,
                    'message' => 'Session evaluated successfully'
                );
            } else {
                throw new Exception("Failed to save evaluation");
            }
            
        } catch (Exception $e) {
            return array('success' => false, 'message' => $e->getMessage());
        }
    }
    
    private function calculateBehaviorMetrics($sessionId, $session, $behaviorAnalysis, $logStats) {
        // Get environment-specific thresholds
        $speedLimit = ($session['environment_type'] === 'highway') ? SPEED_LIMIT_HIGHWAY : SPEED_LIMIT_CITY;
        
        // Basic metrics from behavior analysis
        $metrics = array(
            'overspeed_count' => $behaviorAnalysis['overspeed'],
            'sudden_brake_count' => $behaviorAnalysis['sudden_braking'],
            'lane_violation_count' => $behaviorAnalysis['lane_violations'],
            'collision_count' => $behaviorAnalysis['collisions'],
            'sudden_acceleration_count' => $this->calculateSuddenAcceleration($sessionId),
            'signal_violation_count' => 0, // TODO: Implement traffic signal detection
            'harsh_braking_events' => $this->calculateHarshBraking($sessionId),
            'speed_limit' => $speedLimit,
            'max_speed_violation' => max(0, $logStats['max_speed'] - $speedLimit),
            'avg_speed_efficiency' => $this->calculateSpeedEfficiency($logStats['avg_speed'], $speedLimit),
            'steering_smoothness' => $this->calculateSteeringSmoothness($sessionId),
            'smooth_driving_percentage' => $this->calculateSmoothDriving($sessionId, $logStats['total_logs'])
        );
        
        return $metrics;
    }
    
    private function calculateScore($metrics) {
        // Base score
        $score = 100;
        
        // Deduct points for violations
        $score -= ($metrics['overspeed_count'] * 2);           // -2 points per overspeed
        $score -= ($metrics['sudden_brake_count'] * 1);        // -1 point per sudden brake
        $score -= ($metrics['sudden_acceleration_count'] * 1); // -1 point per sudden acceleration
        $score -= ($metrics['lane_violation_count'] * 3);      // -3 points per lane violation
        $score -= ($metrics['collision_count'] * 5);           // -5 points per collision
        $score -= ($metrics['signal_violation_count'] * 4);    // -4 points per signal violation
        
        // Bonus points for smooth driving
        $score += ($metrics['smooth_driving_percentage'] * 0.1); // Up to 10 bonus points
        
        // Deduct for excessive speed violations
        $score -= min(10, $metrics['max_speed_violation'] * 0.5);
        
        // Ensure score is between 0 and 100
        return max(0, min(100, round($score)));
    }
    
    private function determineGrade($score) {
        if ($score >= 95) return 'A+';
        if ($score >= 90) return 'A';
        if ($score >= 85) return 'B+';
        if ($score >= 80) return 'B';
        if ($score >= 75) return 'C+';
        if ($score >= 70) return 'C';
        if ($score >= 65) return 'D+';
        if ($score >= 60) return 'D';
        return 'F';
    }
    
    private function calculateSuddenAcceleration($sessionId) {
        try {
            // Look for rapid throttle increases
            $sql = "SELECT COUNT(*) as count
                    FROM (
                        SELECT 
                            throttle_force,
                            LAG(throttle_force) OVER (ORDER BY timestamp) as prev_throttle
                        FROM driving_logs 
                        WHERE session_id = :session_id
                    ) t
                    WHERE (throttle_force - IFNULL(prev_throttle, 0)) > 0.6";
            
            $stmt = $this->db->query($sql, array('session_id' => $sessionId));
            $result = $stmt->fetch();
            return $result ? (int) $result['count'] : 0;
        } catch (Exception $e) {
            return 0;
        }
    }
    
    private function calculateHarshBraking($sessionId) {
        try {
            // More strict threshold for harsh braking
            $sql = "SELECT COUNT(*) as count 
                    FROM driving_logs 
                    WHERE session_id = :session_id 
                    AND brake_force > 0.8 
                    AND speed > 20";
            
            $stmt = $this->db->query($sql, array('session_id' => $sessionId));
            $result = $stmt->fetch();
            return $result ? (int) $result['count'] : 0;
        } catch (Exception $e) {
            return 0;
        }
    }
    
    private function calculateSpeedEfficiency($avgSpeed, $speedLimit) {
        if ($speedLimit == 0) return 100;
        
        $efficiency = ($avgSpeed / $speedLimit) * 100;
        
        // Optimal efficiency is 80-95% of speed limit
        if ($efficiency >= 80 && $efficiency <= 95) {
            return 100;
        } else if ($efficiency < 80) {
            return $efficiency * 1.25; // Penalty for driving too slow
        } else {
            return max(0, 100 - ($efficiency - 95) * 2); // Penalty for speeding
        }
    }
    
    private function calculateSteeringSmoothness($sessionId) {
        try {
            $sql = "SELECT 
                        AVG(ABS(steering_angle - LAG(steering_angle) OVER (ORDER BY timestamp))) as avg_steering_change
                    FROM driving_logs 
                    WHERE session_id = :session_id
                    AND speed > 5"; // Only when moving
            
            $stmt = $this->db->query($sql, array('session_id' => $sessionId));
            $result = $stmt->fetch();
            
            if ($result && $result['avg_steering_change'] !== null) {
                // Convert to percentage (lower change = smoother = higher percentage)
                return max(0, min(100, (1 - $result['avg_steering_change']) * 100));
            }
            
            return 100;
        } catch (Exception $e) {
            return 100;
        }
    }
    
    private function calculateSmoothDriving($sessionId, $totalLogs) {
        try {
            if ($totalLogs == 0) return 0;
            
            $sql = "SELECT COUNT(*) as smooth_count
                    FROM driving_logs 
                    WHERE session_id = :session_id
                    AND brake_force < 0.3 
                    AND throttle_force < 0.8
                    AND ABS(steering_angle) < 0.5
                    AND collision = 0";
            
            $stmt = $this->db->query($sql, array('session_id' => $sessionId));
            $result = $stmt->fetch();
            
            if ($result) {
                return ($result['smooth_count'] / $totalLogs) * 100;
            }
            
            return 0;
        } catch (Exception $e) {
            return 0;
        }
    }
    
    private function generateDetailedReport($metrics, $logStats, $session) {
        return array(
            'session_info' => array(
                'environment' => $session['environment_type'],
                'vehicle_type' => $session['vehicle_type'],
                'input_device' => $session['input_device'],
                'duration' => $logStats['session_duration']
            ),
            'speed_analysis' => array(
                'max_speed' => $logStats['max_speed'],
                'avg_speed' => $logStats['avg_speed'],
                'speed_limit' => $metrics['speed_limit'],
                'overspeed_incidents' => $metrics['overspeed_count'],
                'speed_efficiency' => $metrics['avg_speed_efficiency']
            ),
            'behavior_analysis' => array(
                'sudden_braking' => $metrics['sudden_brake_count'],
                'harsh_braking' => $metrics['harsh_braking_events'],
                'sudden_acceleration' => $metrics['sudden_acceleration_count'],
                'lane_violations' => $metrics['lane_violation_count'],
                'collisions' => $metrics['collision_count'],
                'steering_smoothness' => $metrics['steering_smoothness'],
                'smooth_driving_percentage' => $metrics['smooth_driving_percentage']
            ),
            'recommendations' => $this->generateRecommendations($metrics),
            'generated_at' => date('Y-m-d H:i:s')
        );
    }
    
    private function generateRecommendations($metrics) {
        $recommendations = array();
        
        if ($metrics['overspeed_count'] > 5) {
            $recommendations[] = "พยายามรักษาความเร็วให้อยู่ในขีดจำกัดที่กำหนด";
        }
        
        if ($metrics['sudden_brake_count'] > 3) {
            $recommendations[] = "ควรเบรกอย่างค่อยเป็นค่อยไปเพื่อความปลอดภัย";
        }
        
        if ($metrics['lane_violation_count'] > 2) {
            $recommendations[] = "ควรรักษาตำแหน่งรถให้อยู่ในเลนอย่างถูกต้อง";
        }
        
        if ($metrics['collision_count'] > 0) {
            $recommendations[] = "ต้องระมัดระวังมากขึ้นเพื่อหลีกเลี่ยงการชน";
        }
        
        if ($metrics['steering_smoothness'] < 70) {
            $recommendations[] = "ควรหมุนพวงมาลัยอย่างนุ่มนวลและต่อเนื่อง";
        }
        
        if (empty($recommendations)) {
            $recommendations[] = "การขับขี่ของคุณดีมาก! คงสภาพการขับขี่นี้ต่อไป";
        }
        
        return $recommendations;
    }
    
    public function getEvaluationBySession($sessionId) {
        try {
            $evaluations = $this->db->select('evaluations', '*', 'session_id = :id', array('id' => $sessionId));
            return $evaluations ? $evaluations[0] : null;
        } catch (Exception $e) {
            return null;
        }
    }
    
    public function getUserEvaluations($userId, $limit = 10) {
        try {
            $sql = "SELECT e.*, s.start_time, s.environment_type, s.total_time, s.total_distance
                    FROM evaluations e
                    JOIN sessions s ON e.session_id = s.session_id
                    WHERE s.user_id = :user_id
                    ORDER BY s.start_time DESC
                    LIMIT :limit";
            
            $stmt = $this->db->query($sql, array('user_id' => $userId, 'limit' => $limit));
            return $stmt->fetchAll();
        } catch (Exception $e) {
            return array();
        }
    }
    
    public function getEvaluationStats($userId = null, $days = 30) {
        try {
            $whereClause = "s.start_time >= DATE_SUB(NOW(), INTERVAL :days DAY)";
            $params = array('days' => $days);
            
            if ($userId) {
                $whereClause .= " AND s.user_id = :user_id";
                $params['user_id'] = $userId;
            }
            
            $sql = "SELECT 
                        COUNT(*) as total_evaluations,
                        AVG(e.total_score) as avg_score,
                        MIN(e.total_score) as min_score,
                        MAX(e.total_score) as max_score,
                        AVG(e.overspeed_count) as avg_overspeed,
                        AVG(e.collision_count) as avg_collisions,
                        COUNT(CASE WHEN e.grade IN ('A+', 'A') THEN 1 END) as excellent_count,
                        COUNT(CASE WHEN e.grade = 'F' THEN 1 END) as fail_count
                    FROM evaluations e
                    JOIN sessions s ON e.session_id = s.session_id
                    WHERE {$whereClause}";
            
            $stmt = $this->db->query($sql, $params);
            return $stmt->fetch();
        } catch (Exception $e) {
            return array();
        }
    }
}
?>