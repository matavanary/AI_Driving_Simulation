<?php
/**
 * Test Configuration Integration
 * Author: Mr.Nattakit Rookkason
 * Version: 1.0
 * Date: 31 October 2025
 */

echo "<h1>Configuration Test</h1>\n";

echo "<h2>Testing Backend Config</h2>\n";
require_once '../backend/config/config.php';
echo "✅ Backend config loaded successfully<br/>\n";

echo "<h2>Testing Database Wrapper</h2>\n";
require_once 'database.php';
echo "✅ Database wrapper loaded successfully<br/>\n";

echo "<h2>Database Constants Test</h2>\n";
echo "DB_HOST: " . DB_HOST . "<br/>\n";
echo "DB_NAME: " . DB_NAME . "<br/>\n";
echo "DB_USERNAME: " . (defined('DB_USERNAME') ? DB_USERNAME : 'Not defined') . "<br/>\n";
echo "DB_USER: " . (defined('DB_USER') ? DB_USER : 'Not defined') . "<br/>\n";
echo "DB_PASSWORD: " . (defined('DB_PASSWORD') ? '***' : 'Not defined') . "<br/>\n";
echo "DB_PASS: " . (defined('DB_PASS') ? '***' : 'Not defined') . "<br/>\n";

echo "<h2>Application Constants Test</h2>\n";
echo "APP_NAME: " . APP_NAME . "<br/>\n";
echo "APP_VERSION: " . APP_VERSION . "<br/>\n";
echo "APP_DEBUG: " . (APP_DEBUG ? 'true' : 'false') . "<br/>\n";
echo "DEBUG_MODE: " . (DEBUG_MODE ? 'true' : 'false') . "<br/>\n";

echo "<h2>Security Constants Test</h2>\n";
echo "CSRF_TOKEN_LIFETIME: " . CSRF_TOKEN_LIFETIME . " seconds<br/>\n";
echo "SESSION_TIMEOUT: " . (defined('SESSION_TIMEOUT') ? SESSION_TIMEOUT : 'Not defined') . " seconds<br/>\n";
echo "SESSION_LIFETIME: " . (defined('SESSION_LIFETIME') ? SESSION_LIFETIME : 'Not defined') . " seconds<br/>\n";
echo "JWT_SECRET: " . (defined('JWT_SECRET') ? '***' : 'Not defined') . "<br/>\n";

echo "<h2>Evaluation Constants Test</h2>\n";
echo "SPEED_LIMIT_CITY: " . SPEED_LIMIT_CITY . " km/h<br/>\n";
echo "SPEED_LIMIT_HIGHWAY: " . SPEED_LIMIT_HIGHWAY . " km/h<br/>\n";
echo "OVERSPEED_THRESHOLD: " . OVERSPEED_THRESHOLD . " km/h<br/>\n";
echo "SUDDEN_BRAKE_THRESHOLD: " . SUDDEN_BRAKE_THRESHOLD . "<br/>\n";

echo "<h2>Helper Functions Test</h2>\n";
require_once '../backend/config/helper.php';

echo "<h3>Database Config:</h3>\n";
$dbConfig = getDatabaseConfig();
foreach ($dbConfig as $key => $value) {
    if (strpos($key, 'pass') !== false) $value = '***';
    echo "$key: $value<br/>\n";
}

echo "<h3>App Info:</h3>\n";
$appInfo = getAppInfo();
foreach ($appInfo as $key => $value) {
    echo "$key: " . ($value === true ? 'true' : ($value === false ? 'false' : $value)) . "<br/>\n";
}

echo "<h3>Evaluation Thresholds:</h3>\n";
$thresholds = getEvaluationThresholds();
foreach ($thresholds as $key => $value) {
    echo "$key: $value<br/>\n";
}

echo "<h2>✅ All Tests Completed Successfully!</h2>\n";
?>