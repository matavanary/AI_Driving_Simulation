<?php
/**
 * User Model
 * Compatible with PHP 5.6+
 * 
 * @author Mr.Nattakit Rookkason
 * @version 1.0
 */

require_once '../utils/PDOConnection.php';
require_once '../utils/Security.php';

class User {
    private $db;
    
    public function __construct() {
        $this->db = PDOConnection::getInstance();
    }
    
    public function register($username, $email, $password, $fullname, $phone = '') {
        try {
            // Validate input
            if (empty($username) || empty($email) || empty($password) || empty($fullname)) {
                throw new Exception("All required fields must be filled");
            }
            
            if (!Security::validateEmail($email)) {
                throw new Exception("Invalid email format");
            }
            
            if (!Security::validatePassword($password)) {
                throw new Exception("Password must be at least 8 characters with uppercase, lowercase and number");
            }
            
            // Check if user already exists
            if ($this->getUserByUsername($username)) {
                throw new Exception("Username already exists");
            }
            
            if ($this->getUserByEmail($email)) {
                throw new Exception("Email already exists");
            }
            
            // Hash password
            $hashedPassword = Security::hashPassword($password);
            
            // Insert user
            $userData = array(
                'username' => $username,
                'email' => $email,
                'password' => $hashedPassword,
                'fullname' => $fullname,
                'phone' => $phone,
                'role' => 'user',
                'status' => 'active'
            );
            
            $userId = $this->db->insert('users', $userData);
            
            if ($userId) {
                return array('success' => true, 'user_id' => $userId, 'message' => 'User registered successfully');
            } else {
                throw new Exception("Failed to register user");
            }
            
        } catch (Exception $e) {
            return array('success' => false, 'message' => $e->getMessage());
        }
    }
    
    public function login($username, $password) {
        try {
            if (empty($username) || empty($password)) {
                throw new Exception("Username and password are required");
            }
            
            $user = $this->getUserByUsername($username);
            if (!$user) {
                $user = $this->getUserByEmail($username);
            }
            
            if (!$user) {
                throw new Exception("Invalid username or password");
            }
            
            if ($user['status'] !== 'active') {
                throw new Exception("Account is inactive");
            }
            
            if (!Security::verifyPassword($password, $user['password'])) {
                throw new Exception("Invalid username or password");
            }
            
            // Update last login
            $this->updateLastLogin($user['id']);
            
            // Create session
            $this->createSession($user);
            
            // Remove password from response
            unset($user['password']);
            
            return array('success' => true, 'user' => $user, 'message' => 'Login successful');
            
        } catch (Exception $e) {
            return array('success' => false, 'message' => $e->getMessage());
        }
    }
    
    public function logout() {
        if (session_status() == PHP_SESSION_NONE) {
            session_start();
        }
        
        session_destroy();
        return array('success' => true, 'message' => 'Logout successful');
    }
    
    public function getUserById($id) {
        try {
            $users = $this->db->select('users', '*', 'id = :id', array('id' => $id));
            return $users ? $users[0] : null;
        } catch (Exception $e) {
            return null;
        }
    }
    
    public function getUserByUsername($username) {
        try {
            $users = $this->db->select('users', '*', 'username = :username', array('username' => $username));
            return $users ? $users[0] : null;
        } catch (Exception $e) {
            return null;
        }
    }
    
    public function getUserByEmail($email) {
        try {
            $users = $this->db->select('users', '*', 'email = :email', array('email' => $email));
            return $users ? $users[0] : null;
        } catch (Exception $e) {
            return null;
        }
    }
    
    public function updateProfile($userId, $data) {
        try {
            $allowedFields = array('fullname', 'email', 'phone');
            $updateData = array();
            
            foreach ($allowedFields as $field) {
                if (isset($data[$field])) {
                    if ($field === 'email' && !Security::validateEmail($data[$field])) {
                        throw new Exception("Invalid email format");
                    }
                    $updateData[$field] = $data[$field];
                }
            }
            
            if (empty($updateData)) {
                throw new Exception("No valid fields to update");
            }
            
            $result = $this->db->update('users', $updateData, 'id = :id', array('id' => $userId));
            
            if ($result) {
                return array('success' => true, 'message' => 'Profile updated successfully');
            } else {
                throw new Exception("Failed to update profile");
            }
            
        } catch (Exception $e) {
            return array('success' => false, 'message' => $e->getMessage());
        }
    }
    
    public function changePassword($userId, $currentPassword, $newPassword) {
        try {
            $user = $this->getUserById($userId);
            if (!$user) {
                throw new Exception("User not found");
            }
            
            if (!Security::verifyPassword($currentPassword, $user['password'])) {
                throw new Exception("Current password is incorrect");
            }
            
            if (!Security::validatePassword($newPassword)) {
                throw new Exception("New password must be at least 8 characters with uppercase, lowercase and number");
            }
            
            $hashedPassword = Security::hashPassword($newPassword);
            $result = $this->db->update('users', array('password' => $hashedPassword), 'id = :id', array('id' => $userId));
            
            if ($result) {
                return array('success' => true, 'message' => 'Password changed successfully');
            } else {
                throw new Exception("Failed to change password");
            }
            
        } catch (Exception $e) {
            return array('success' => false, 'message' => $e->getMessage());
        }
    }
    
    private function createSession($user) {
        if (session_status() == PHP_SESSION_NONE) {
            session_start();
        }
        
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['username'] = $user['username'];
        $_SESSION['role'] = $user['role'];
        $_SESSION['login_time'] = time();
    }
    
    private function updateLastLogin($userId) {
        try {
            $this->db->update('users', array('updated_at' => date('Y-m-d H:i:s')), 'id = :id', array('id' => $userId));
        } catch (Exception $e) {
            // Log error but don't fail login
        }
    }
    
    public function isLoggedIn() {
        if (session_status() == PHP_SESSION_NONE) {
            session_start();
        }
        
        return isset($_SESSION['user_id']) && isset($_SESSION['login_time']) 
               && (time() - $_SESSION['login_time']) < SESSION_LIFETIME;
    }
    
    public function getCurrentUser() {
        if (!$this->isLoggedIn()) {
            return null;
        }
        
        $user = $this->getUserById($_SESSION['user_id']);
        if ($user) {
            unset($user['password']);
        }
        
        return $user;
    }
    
    public function getAllUsers($page = 1, $limit = 20) {
        try {
            $offset = ($page - 1) * $limit;
            $sql = "SELECT id, username, email, fullname, role, status, created_at 
                    FROM users 
                    ORDER BY created_at DESC";
            
            $stmt = $this->db->query($sql, array('limit' => $limit, 'offset' => $offset));
            return $stmt->fetchAll();
            
        } catch (Exception $e) {
            return array();
        }
    }
}
?>