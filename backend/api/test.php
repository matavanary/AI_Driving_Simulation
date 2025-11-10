<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once '../utils/PDOConnection.php';

try {
    $db = PDOConnection::getInstance();
    $stmt = $db->query("SELECT 1 as test");
    $result = $stmt->fetch();
    
    if ($result) {
        echo json_encode([
            'success' => true,
            'message' => 'Database connection successful',
            'timestamp' => date('Y-m-d H:i:s')
        ]);
    } else {
        throw new Exception('Database query failed');
    }
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ]);
}
?>