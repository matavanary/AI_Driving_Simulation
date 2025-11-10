<?php
/**
 * Driving Log Model
 * Compatible with PHP 5.6+
 * 
 * @author Mr.Nattakit Rookkason
 * @version 1.0
 * @date 30 October 2025
 */

require_once '../utils/PDOConnection.php';

class DrivingLog {
    private $db;
    private $buffer = array();
    private $bufferSize = 10;
    
    public function __construct() {
        $this->db = PDOConnection::getInstance();
    }
    
    public function logData($sessionId, $data) {
        try {
            // Validate required fields
            $required = array('speed', 'steering_angle', 'brake_force', 'throttle_force');
            foreach ($required as $field) {
                if (!isset($data[$field])) {
                    $data[$field] = 0;
                }
            }
            
            // Sanitize and validate data
            $logData = array(
                'session_id' => (int) $sessionId,
                'timestamp' => date('Y-m-d H:i:s'),
                'speed' => (float) $data['speed'],
                'steering_angle' => max(-1, min(1, (float) $data['steering_angle'])),
                'brake_force' => max(0, min(1, (float) $data['brake_force'])),
                'throttle_force' => max(0, min(1, (float) $data['throttle_force'])),
                'gear' => isset($data['gear']) ? (int) $data['gear'] : 1,
                'rpm' => isset($data['rpm']) ? (float) $data['rpm'] : 0,
                'lane_position' => isset($data['lane_position']) ? 
                    max(-1, min(1, (float) $data['lane_position'])) : 0,
                'position_x' => isset($data['position_x']) ? (float) $data['position_x'] : 0,
                'position_y' => isset($data['position_y']) ? (float) $data['position_y'] : 0,
                'position_z' => isset($data['position_z']) ? (float) $data['position_z'] : 0,
                'collision' => isset($data['collision']) ? (bool) $data['collision'] : false
            );
            
            // Add to buffer for batch processing
            $this->buffer[] = $logData;
            
            // Flush buffer when full
            if (count($this->buffer) >= $this->bufferSize) {
                return $this->flushBuffer();
            }
            
            return array('success' => true, 'message' => 'Data logged to buffer');
            
        } catch (Exception $e) {
            return array('success' => false, 'message' => $e->getMessage());
        }
    }
    
    public function batchLogData($sessionId, $dataArray) {
        try {
            if (empty($dataArray) || !is_array($dataArray)) {
                throw new Exception("Invalid data array");
            }
            
            $this->db->beginTransaction();
            
            $sql = "INSERT INTO driving_logs 
                    (session_id, timestamp, speed, steering_angle, brake_force, throttle_force, 
                     gear, rpm, lane_position, position_x, position_y, position_z, collision) 
                    VALUES ";
            
            $values = array();
            $params = array();
            $paramIndex = 0;
            
            foreach ($dataArray as $data) {
                $values[] = "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
                
                $params[] = $sessionId;
                $params[] = isset($data['timestamp']) ? $data['timestamp'] : date('Y-m-d H:i:s');
                $params[] = (float) $data['speed'];
                $params[] = max(-1, min(1, (float) $data['steering_angle']));
                $params[] = max(0, min(1, (float) $data['brake_force']));
                $params[] = max(0, min(1, (float) $data['throttle_force']));
                $params[] = isset($data['gear']) ? (int) $data['gear'] : 1;
                $params[] = isset($data['rpm']) ? (float) $data['rpm'] : 0;
                $params[] = isset($data['lane_position']) ? 
                    max(-1, min(1, (float) $data['lane_position'])) : 0;
                $params[] = isset($data['position_x']) ? (float) $data['position_x'] : 0;
                $params[] = isset($data['position_y']) ? (float) $data['position_y'] : 0;
                $params[] = isset($data['position_z']) ? (float) $data['position_z'] : 0;
                $params[] = isset($data['collision']) ? (bool) $data['collision'] : false;
            }
            
            $finalSql = $sql . implode(',', $values);
            $stmt = $this->db->getConnection()->prepare($finalSql);
            $result = $stmt->execute($params);
            
            if ($result) {
                $this->db->commit();
                return array('success' => true, 'inserted' => count($dataArray), 'message' => 'Batch data logged successfully');
            } else {
                $this->db->rollback();
                throw new Exception("Failed to insert batch data");
            }
            
        } catch (Exception $e) {
            $this->db->rollback();
            return array('success' => false, 'message' => $e->getMessage());
        }
    }
    
    public function flushBuffer() {
        if (empty($this->buffer)) {
            return array('success' => true, 'message' => 'Buffer is empty');
        }
        
        try {
            $sessionId = $this->buffer[0]['session_id'];
            $result = $this->batchLogData($sessionId, $this->buffer);
            
            if ($result['success']) {
                $this->buffer = array(); // Clear buffer
            }
            
            return $result;
        } catch (Exception $e) {
            return array('success' => false, 'message' => $e->getMessage());
        }
    }
    
    public function getSessionLogs($sessionId, $limit = 1000, $offset = 0) {
        try {
            $sql = "SELECT * FROM driving_logs 
                    WHERE session_id = :session_id 
                    ORDER BY timestamp ASC 
                    LIMIT :limit OFFSET :offset";
            
            $stmt = $this->db->query($sql, array(
                'session_id' => $sessionId,
                'limit' => $limit,
                'offset' => $offset
            ));
            
            return $stmt->fetchAll();
        } catch (Exception $e) {
            return array();
        }
    }
    
    public function getLatestLogs($sessionId, $seconds = 30) {
        try {
            $sql = "SELECT * FROM driving_logs 
                    WHERE session_id = :session_id 
                    AND timestamp >= DATE_SUB(NOW(), INTERVAL :seconds SECOND)
                    ORDER BY timestamp DESC";
            
            $stmt = $this->db->query($sql, array(
                'session_id' => $sessionId,
                'seconds' => $seconds
            ));
            
            return $stmt->fetchAll();
        } catch (Exception $e) {
            return array();
        }
    }
    
    public function getLogStatistics($sessionId) {
        try {
            $sql = "SELECT 
                        COUNT(*) as total_logs,
                        MIN(timestamp) as start_time,
                        MAX(timestamp) as end_time,
                        MAX(speed) as max_speed,
                        AVG(speed) as avg_speed,
                        MIN(speed) as min_speed,
                        AVG(ABS(steering_angle)) as avg_steering,
                        AVG(brake_force) as avg_brake,
                        AVG(throttle_force) as avg_throttle,
                        SUM(CASE WHEN collision = 1 THEN 1 ELSE 0 END) as collision_count,
                        AVG(ABS(lane_position)) as avg_lane_deviation
                    FROM driving_logs 
                    WHERE session_id = :session_id";
            
            $stmt = $this->db->query($sql, array('session_id' => $sessionId));
            $result = $stmt->fetch();
            
            if ($result) {
                // Calculate additional metrics
                $startTime = strtotime($result['start_time']);
                $endTime = strtotime($result['end_time']);
                $result['session_duration'] = $endTime - $startTime;
                $result['data_points_per_second'] = $result['session_duration'] > 0 ? 
                    $result['total_logs'] / $result['session_duration'] : 0;
            }
            
            return $result;
        } catch (Exception $e) {
            return array();
        }
    }
    
    public function analyzeBehaviorPatterns($sessionId) {
        try {
            // Detect sudden braking
            $suddenBraking = $this->detectSuddenBraking($sessionId);
            
            // Detect overspeed incidents
            $overspeed = $this->detectOverspeed($sessionId);
            
            // Detect lane violations
            $laneViolations = $this->detectLaneViolations($sessionId);
            
            // Detect collisions
            $collisions = $this->detectCollisions($sessionId);
            
            return array(
                'sudden_braking' => $suddenBraking,
                'overspeed' => $overspeed,
                'lane_violations' => $laneViolations,
                'collisions' => $collisions,
                'analysis_timestamp' => date('Y-m-d H:i:s')
            );
            
        } catch (Exception $e) {
            return array('error' => $e->getMessage());
        }
    }
    
    private function detectSuddenBraking($sessionId) {
        try {
            $sql = "SELECT COUNT(*) as count 
                    FROM driving_logs 
                    WHERE session_id = :session_id 
                    AND brake_force > :threshold";
            
            $stmt = $this->db->query($sql, array(
                'session_id' => $sessionId,
                'threshold' => SUDDEN_BRAKE_THRESHOLD
            ));
            
            $result = $stmt->fetch();
            return $result ? (int) $result['count'] : 0;
        } catch (Exception $e) {
            return 0;
        }
    }
    
    private function detectOverspeed($sessionId) {
        try {
            // Get session environment to determine speed limit
            $session = new Session();
            $sessionData = $session->getSessionById($sessionId);
            
            $speedLimit = SPEED_LIMIT_CITY;
            if ($sessionData && $sessionData['environment_type'] === 'highway') {
                $speedLimit = SPEED_LIMIT_HIGHWAY;
            }
            
            $sql = "SELECT COUNT(*) as count 
                    FROM driving_logs 
                    WHERE session_id = :session_id 
                    AND speed > :speed_limit";
            
            $stmt = $this->db->query($sql, array(
                'session_id' => $sessionId,
                'speed_limit' => $speedLimit + OVERSPEED_THRESHOLD
            ));
            
            $result = $stmt->fetch();
            return $result ? (int) $result['count'] : 0;
        } catch (Exception $e) {
            return 0;
        }
    }
    
    private function detectLaneViolations($sessionId) {
        try {
            $sql = "SELECT COUNT(*) as count 
                    FROM driving_logs 
                    WHERE session_id = :session_id 
                    AND ABS(lane_position) > :threshold";
            
            $stmt = $this->db->query($sql, array(
                'session_id' => $sessionId,
                'threshold' => LANE_VIOLATION_THRESHOLD
            ));
            
            $result = $stmt->fetch();
            return $result ? (int) $result['count'] : 0;
        } catch (Exception $e) {
            return 0;
        }
    }
    
    private function detectCollisions($sessionId) {
        try {
            $sql = "SELECT COUNT(*) as count 
                    FROM driving_logs 
                    WHERE session_id = :session_id 
                    AND collision = 1";
            
            $stmt = $this->db->query($sql, array('session_id' => $sessionId));
            $result = $stmt->fetch();
            return $result ? (int) $result['count'] : 0;
        } catch (Exception $e) {
            return 0;
        }
    }
    
    public function __destruct() {
        // Flush any remaining buffer data
        $this->flushBuffer();
    }
}
?>