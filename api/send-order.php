<?php
/**
 * BODA E-Commerce - Refactored Order System
 * Secure, modular, and server-side validated.
 */

require_once 'core.php';
require_once 'products_db.php';

// Validate CSRF for all POST requests
validateCSRF();

// Email Settings
define('SMTP_USER', 'mhmwjmmm17@gmail.com');
define('FROM_EMAIL', 'noreply@boda-platform.com');
define('FROM_NAME', 'منصة BODA');
define('ADMIN_EMAIL', 'mhmwjmmm17@gmail.com');

// Get Input
$input = json_decode(file_get_contents('php://input'), true) ?? [];
$action = sanitizeInput($_REQUEST['action'] ?? $input['action'] ?? '');

if (empty($action)) {
    sendResponse('error', 'لم يتم تحديد الإجراء المطلوب', [], 400);
}

// Routes
switch ($action) {
    case 'send_email_order':
    case 'send_complete_order':
        handleOrderSubmission($input);
        break;

    case 'get_order_status':
        handleGetOrderStatus($_REQUEST['orderId'] ?? '');
        break;

    case 'get_user_orders':
        handleGetUserOrders();
        break;

    case 'contact_us':
        handleContactUs($input);
        break;

    default:
        sendResponse('error', 'الإجراء غير مدعوم', [], 404);
}

/**
 * Handle Order Submission with Server-side Validation
 */
function handleOrderSubmission($input) {
    $email = filter_var($input['email'] ?? '', FILTER_VALIDATE_EMAIL);
    $phone = sanitizeInput($input['phone'] ?? '');
    $clientOrder = $input['order'] ?? [];

    if (!$email) {
        sendResponse('error', 'بريد إلكتروني غير صالح', [], 400);
    }

    if (empty($clientOrder['items'])) {
        sendResponse('error', 'سلة التسوق فارغة', [], 400);
    }

    // --- SECURITY: Re-calculate totals on server ---
    $calculated = calculateOrderTotal($clientOrder['items']);
    
    // Create professional order object
    $order = [
        'orderId' => 'ORD-' . strtoupper(substr(md5(uniqid()), 0, 8)),
        'timestamp' => date('c'),
        'items' => $clientOrder['items'],
        'subtotal' => $calculated['subtotal'],
        'tax' => $calculated['tax'],
        'shipping' => $calculated['shipping'],
        'total' => $calculated['total'],
        'paymentMethod' => sanitizeInput($clientOrder['paymentMethod'] ?? 'Cash'),
        'status' => 'Pending'
    ];

    // Build Email
    $subject = 'تأكيد طلبك #' . $order['orderId'];
    $htmlContent = buildEmailTemplate($order);

    // Send Email to Customer
    $emailSent = sendEmail($email, $subject, $htmlContent);
    
    // Send Email to Admin (Company)
    $adminSubject = 'طلب جديد: ' . $order['orderId'];
    sendEmail(ADMIN_EMAIL, $adminSubject, $htmlContent);

    // Save to "Database" (JSON file)
    saveOrderToStorage($email, $order);

    sendResponse('success', 'تم استلام طلبك بنجاح وجاري المراجعة', [
        'orderId' => $order['orderId'],
        'total' => $order['total'],
        'email_sent' => $emailSent
    ]);
}

/**
 * Build Professional Email Template
 */
function buildEmailTemplate($order) {
    $itemsHtml = '';
    foreach ($order['items'] as $item) {
        // Validation: Get name from our DB to prevent injection
        $pid = $item['id'] ?? '';
        $name = isset(PRODUCT_DATABASE[$pid]) ? PRODUCT_DATABASE[$pid]['name'] : sanitizeInput($item['name']);
        $price = isset(PRODUCT_DATABASE[$pid]) ? PRODUCT_DATABASE[$pid]['price'] : 0;
        $qty = (int)($item['quantity'] ?? 1);
        
        $itemsHtml .= "
            <tr style='border-bottom: 1px solid #eee;'>
                <td style='padding: 10px;'>{$name}</td>
                <td style='padding: 10px; text-align: center;'>{$qty}</td>
                <td style='padding: 10px; text-align: right;'>{$price} ج.م</td>
            </tr>
        ";
    }

    return "
    <div dir='rtl' style='font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;'>
        <div style='background: #00d4ff; color: white; padding: 20px; text-align: center;'>
            <h2>شكراً لطلبك من BODA</h2>
            <p>رقم الطلب: <strong>#{$order['orderId']}</strong></p>
        </div>
        <div style='padding: 20px;'>
            <table style='width: 100%; border-collapse: collapse;'>
                <thead>
                    <tr style='background: #f8f8f8;'>
                        <th style='text-align: right; padding: 10px;'>المنتج</th>
                        <th style='padding: 10px;'>الكمية</th>
                        <th style='text-align: left; padding: 10px;'>السعر</th>
                    </tr>
                </thead>
                <tbody>
                    {$itemsHtml}
                </tbody>
                <tfoot>
                    <tr><td colspan='2' style='padding: 10px; text-align: right;'>المجموع الفرعي:</td><td style='padding: 10px;'>{$order['subtotal']} ج.م</td></tr>
                    <tr><td colspan='2' style='padding: 10px; text-align: right;'>الشحن:</td><td style='padding: 10px;'>{$order['shipping']} ج.م</td></tr>
                    <tr style='font-weight: bold; font-size: 1.2em;'><td colspan='2' style='padding: 10px; text-align: right;'>الإجمالي:</td><td style='padding: 10px; color: #00d4ff;'>{$order['total']} ج.م</td></tr>
                </tfoot>
            </table>
        </div>
        <div style='background: #f4f4f4; padding: 15px; text-align: center; font-size: 0.9em; color: #666;'>
            <p>سيتم التواصل معك قريباً لتأكيد الشحن.</p>
        </div>
    </div>
    ";
}

function sendEmail($to, $subject, $html) {
    $headers = "MIME-Version: 1.0\r\n";
    $headers .= "Content-type: text/html; charset=UTF-8\r\n";
    $headers .= "From: " . FROM_NAME . " <" . FROM_EMAIL . ">\r\n";
    return @mail($to, $subject, $html, $headers);
}

function saveOrderToStorage($email, $order) {
    $file = 'orders_db.json';
    $orders = file_exists($file) ? json_decode(file_get_contents($file), true) : [];
    $order['customer_email'] = $email;
    $orders[] = $order;
    file_put_contents($file, json_encode($orders, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

function handleGetOrderStatus($orderId) {
    $file = 'orders_db.json';
    if (!file_exists($file)) sendResponse('error', 'لا توجد طلبات', [], 404);
    
    $orders = json_decode(file_get_contents($file), true);
    foreach ($orders as $o) {
        if ($o['orderId'] === $orderId) {
            sendResponse('success', 'تم العثور على الطلب', $o);
        }
    }
    sendResponse('error', 'الطلب غير موجود', [], 404);
}

function handleGetUserOrders() {
    requireAuth();
    $email = $_SESSION['user_email'];
    
    $file = 'orders_db.json';
    if (!file_exists($file)) {
        sendResponse('success', 'لا توجد طلبات بعد', []);
    }
    
    $allOrders = json_decode(file_get_contents($file), true) ?: [];
    $userOrders = array_filter($allOrders, function($order) use ($email) {
        return isset($order['customer_email']) && $order['customer_email'] === $email;
    });
    
    sendResponse('success', 'تم جلب الطلبات بنجاح', array_values($userOrders));
}

function handleContactUs($input) {
    $name = sanitizeInput($input['name'] ?? '');
    $email = filter_var($input['email'] ?? '', FILTER_VALIDATE_EMAIL);
    $msg = sanitizeInput($input['message'] ?? '');

    if (!$email || !$msg) sendResponse('error', 'بيانات ناقصة', [], 400);

    // In a real app, send email to admin here
    sendResponse('success', 'تم استلام رسالتك بنجاح');
}
