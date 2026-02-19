<?php
/**
 * BODA E-Commerce - Core API Configuration
 * Handles security, sessions, and common utilities.
 */

// Enable error reporting for development (disable in production)
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Security Headers
header('Content-Type: application/json');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');

// CORS Configuration
$allowed_origins = ['http://localhost', 'http://127.0.0.1'];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: $origin");
}
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

// Session Security
ini_set('session.cookie_httponly', 1);
ini_set('session.use_only_cookies', 1);
ini_set('session.cookie_samesite', 'Lax');
if (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') {
    ini_set('session.cookie_secure', 1);
}

session_start();

/**
 * Utility: Standard JSON Response
 */
function sendResponse($status, $message, $data = [], $code = 200) {
    http_response_code($code);
    
    // Always include a CSRF token for the frontend to use in subsequent requests
    $csrfToken = generateCSRFToken();
    
    echo json_encode([
        'status' => $status,
        'message' => $message,
        'data' => $data,
        'csrfToken' => $csrfToken,
        'timestamp' => date('c')
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Utility: Check if CSRF is valid for POST requests
 */
function validateCSRF() {
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // For login/register endpoints, skip CSRF validation (no session yet)
        $action = $_REQUEST['action'] ?? '';
        if (in_array($action, ['login', 'register', 'check_session'])) {
            return; // Skip CSRF for auth endpoints
        }
        
        $input = json_decode(file_get_contents('php://input'), true);
        $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? $input['csrfToken'] ?? '';
        
        if (!verifyCSRFToken($token)) {
            sendResponse('error', 'خطأ في التحقق من صحة الطلب (CSRF). يرجى تحديث الصفحة.', [], 403);
        }
    }
}

/**
 * Utility: Input Sanitization
 */
function sanitizeInput($data) {
    if (is_array($data)) {
        return array_map('sanitizeInput', $data);
    }
    return htmlspecialchars(trim($data), ENT_QUOTES, 'UTF-8');
}

/**
 * Utility: CSRF Protection
 */
function generateCSRFToken() {
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function verifyCSRFToken($token) {
    return isset($_SESSION['csrf_token']) && hash_equals($_SESSION['csrf_token'], $token);
}

/**
 * Utility: Check if user is logged in
 */
function isAuthenticated() {
    return isset($_SESSION['user_id']);
}

function requireAuth() {
    if (!isAuthenticated()) {
        sendResponse('error', 'غير مصرح لك بالوصول. يرجى تسجيل الدخول.', [], 401);
    }
}

/**
 * Utility: Log errors to file
 */
function logError($message, $data = []) {
    $errorLog = __DIR__ . '/error.log';
    $logMessage = sprintf(
        "[%s] %s | %s\n",
        date('Y-m-d H:i:s'),
        $message,
        json_encode($data, JSON_UNESCAPED_UNICODE)
    );
    @file_put_contents($errorLog, $logMessage, FILE_APPEND);
}
