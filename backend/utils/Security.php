<?php
/**
 * Security Helper Class
 * Compatible with PHP 5.6+
 * 
 * @author Mr.Nattakit Rookkason
 * @version 1.0
 */

class Security {
    
    public static function hashPassword($password) {
        return password_hash($password, PASSWORD_DEFAULT);
    }
    
    public static function verifyPassword($password, $hash) {
        return password_verify($password, $hash);
    }
    
    public static function generateToken($length = 32) {
        if (function_exists('random_bytes')) {
            return bin2hex(random_bytes($length));
        } elseif (function_exists('openssl_random_pseudo_bytes')) {
            return bin2hex(openssl_random_pseudo_bytes($length));
        } else {
            $token = '';
            for ($i = 0; $i < $length; $i++) {
                $token .= chr(mt_rand(0, 255));
            }
            return bin2hex($token);
        }
    }
    
    public static function sanitizeInput($input) {
        if (is_array($input)) {
            return array_map(array('Security', 'sanitizeInput'), $input);
        }
        
        $input = trim($input);
        $input = stripslashes($input);
        $input = htmlspecialchars($input, ENT_QUOTES, 'UTF-8');
        return $input;
    }
    
    public static function validateEmail($email) {
        return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
    }
    
    public static function validatePassword($password) {
        // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
        return preg_match('/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/', $password);
    }
    
    public static function generateCSRFToken() {
        if (session_status() == PHP_SESSION_NONE) {
            session_start();
        }
        
        $token = self::generateToken();
        $_SESSION['csrf_token'] = $token;
        $_SESSION['csrf_token_time'] = time();
        
        return $token;
    }
    
    public static function validateCSRFToken($token) {
        if (session_status() == PHP_SESSION_NONE) {
            session_start();
        }
        
        if (!isset($_SESSION['csrf_token']) || !isset($_SESSION['csrf_token_time'])) {
            return false;
        }
        
        // Check if token is expired (30 minutes)
        if (time() - $_SESSION['csrf_token_time'] > CSRF_TOKEN_LIFETIME) {
            unset($_SESSION['csrf_token']);
            unset($_SESSION['csrf_token_time']);
            return false;
        }
        
        return hash_equals($_SESSION['csrf_token'], $token);
    }
    
    public static function encryptData($data, $key) {
        $method = 'AES-256-CBC';
        $iv = openssl_random_pseudo_bytes(16);
        $encrypted = openssl_encrypt($data, $method, $key, 0, $iv);
        return base64_encode($encrypted . '::' . $iv);
    }
    
    public static function decryptData($data, $key) {
        $method = 'AES-256-CBC';
        list($encrypted_data, $iv) = explode('::', base64_decode($data), 2);
        return openssl_decrypt($encrypted_data, $method, $key, 0, $iv);
    }
    
    public static function rateLimitCheck($identifier, $limit = 100, $window = 3600) {
        // Simple file-based rate limiting (for production use Redis or Memcached)
        $file = sys_get_temp_dir() . '/rate_limit_' . md5($identifier);
        
        if (file_exists($file)) {
            $data = json_decode(file_get_contents($file), true);
            
            // Clean old entries
            $now = time();
            $data = array_filter($data, function($timestamp) use ($now, $window) {
                return ($now - $timestamp) < $window;
            });
            
            if (count($data) >= $limit) {
                return false;
            }
            
            $data[] = $now;
        } else {
            $data = array(time());
        }
        
        file_put_contents($file, json_encode($data));
        return true;
    }
}
?>