<?php
/**
 * BODA E-Commerce - Authentication API
 * Secure session-based login and registration.
 */

require_once 'core.php';

// Validate CSRF for all POST requests
validateCSRF();

$input = json_decode(file_get_contents('php://input'), true) ?? [];
$action = sanitizeInput($_REQUEST['action'] ?? $input['action'] ?? '');

$users_file = 'users_db.json';

switch ($action) {
    case 'register':
        handleRegister($input, $users_file);
        break;

    case 'login':
        handleLogin($input, $users_file);
        break;

    case 'logout':
        handleLogout();
        break;

    case 'check_session':
        handleCheckSession();
        break;

    default:
        sendResponse('error', 'إجراء غير مدعوم', [], 404);
}

function handleRegister($input, $file) {
    $name = sanitizeInput($input['fullName'] ?? '');
    $email = filter_var($input['email'] ?? '', FILTER_VALIDATE_EMAIL);
    $password = $input['password'] ?? '';

    if (!$name || !$email || strlen($password) < 6) {
        sendResponse('error', 'بيانات غير صالحة. تأكد من إدخال اسم صحيح وبريد إلكتروني وكلمة مرور (6 أحرف على الأقل).', [], 400);
    }

    $users = file_exists($file) ? json_decode(file_get_contents($file), true) : [];

    // Check if user exists
    foreach ($users as $user) {
        if ($user['email'] === $email) {
            sendResponse('error', 'هذا البريد الإلكتروني مسجل بالفعل.', [], 400);
        }
    }

    // Hash password
    $hashedPassword = password_hash($password, PASSWORD_DEFAULT);

    $newUser = [
        'id' => uniqid(),
        'fullName' => $name,
        'email' => $email,
        'password' => $hashedPassword,
        'role' => 'customer',
        'created_at' => date('c')
    ];

    $users[] = $newUser;
    file_put_contents($file, json_encode($users, JSON_PRETTY_PRINT));

    // Auto-login
    $_SESSION['user_id'] = $newUser['id'];
    $_SESSION['user_name'] = $newUser['fullName'];
    $_SESSION['user_email'] = $newUser['email'];

    sendResponse('success', 'تم التسجيل بنجاح', [
        'name' => $newUser['fullName'],
        'email' => $newUser['email']
    ]);
}

function handleLogin($input, $file) {
    $email = filter_var($input['email'] ?? '', FILTER_VALIDATE_EMAIL);
    $password = $input['password'] ?? '';

    if (!$email || !$password) {
        sendResponse('error', 'البريد الإلكتروني وكلمة المرور مطلوبان.', [], 400);
    }

    $users = file_exists($file) ? json_decode(file_get_contents($file), true) : [];

    foreach ($users as $user) {
        if ($user['email'] === $email) {
            if (password_verify($password, $user['password'])) {
                // Success
                $_SESSION['user_id'] = $user['id'];
                $_SESSION['user_name'] = $user['fullName'];
                $_SESSION['user_email'] = $user['email'];
                $_SESSION['user_role'] = $user['role'] ?? 'customer';

                sendResponse('success', 'تم تسجيل الدخول بنجاح', [
                    'name' => $user['fullName'],
                    'email' => $user['email'],
                    'role' => $_SESSION['user_role']
                ]);
            }
            break;
        }
    }

    sendResponse('error', 'البريد الإلكتروني أو كلمة المرور غير صحيحة.', [], 401);
}

function handleLogout() {
    session_unset();
    session_destroy();
    sendResponse('success', 'تم تسجيل الخروج بنجاح');
}

function handleCheckSession() {
    if (isAuthenticated()) {
        sendResponse('success', 'جلسة نشطة', [
            'name' => $_SESSION['user_name'],
            'email' => $_SESSION['user_email'],
            'role' => $_SESSION['user_role'] ?? 'customer'
        ]);
    } else {
        sendResponse('error', 'لا توجد جلسة نشطة', [], 401);
    }
}
