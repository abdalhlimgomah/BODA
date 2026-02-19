<?php
/**
 * Email Configuration for Partnership System
 * إعدادات البريد الإلكتروني لنظام برنامج الشراكة
 */

// ============================================
// BASIC EMAIL SETTINGS
// ============================================

// المتلقي الرئيسي (الإدارة)
define('ADMIN_EMAIL', 'mhmwjmmm17@gmail.com');
define('ADMIN_NAME', 'فريق BODA - برنامج الشراكة');

// البريد العام للمنصة
define('FROM_EMAIL', 'noreply@boda-platform.com');
define('FROM_NAME', 'منصة BODA للتجارة الإلكترونية');

// ============================================
// SMTP SETTINGS (للإرسال المتقدم)
// ============================================

define('SMTP_HOST', 'smtp.gmail.com');
define('SMTP_PORT', 587);
define('SMTP_SECURE', 'tls');

// تحديث البيانات من متغيرات البيئة أو .env file
define('SMTP_USER', getenv('SMTP_USER') ?: 'your-email@gmail.com');
define('SMTP_PASS', getenv('SMTP_PASS') ?: 'your-app-password');

// ============================================
// EMAIL TEMPLATES
// ============================================

// نمط رسالة التأكيد للمتقدم
define('APPLICANT_EMAIL_SUBJECT', 'تأكيد استقبال طلب الشراكة - BODA');
define('APPLICANT_EMAIL_FROM', FROM_EMAIL);

// نمط رسالة الإخطار للإدارة
define('ADMIN_EMAIL_SUBJECT', '[نموذج الشراكة] طلب جديد من {applicant_name}');

// ============================================
// EMAIL FEATURES
// ============================================

// تفعيل/تعطيل الميزات
define('SEND_APPLICANT_EMAIL', true);      // إرسال بريد للمتقدم
define('SEND_ADMIN_EMAIL', true);          // إرسال بريد للإدارة
define('SEND_CONFIRMATION_SMS', false);    // إرسال رسالة نصية (مستقبلي)
define('LOG_EMAILS', true);                // حفظ سجل الرسائل المرسلة

// ============================================
// EMAIL RETRY SETTINGS
// ============================================

define('EMAIL_RETRY_COUNT', 3);            // عدد محاولات الإرسال
define('EMAIL_RETRY_DELAY', 5);            // التأخير بالثواني بين المحاولات
define('EMAIL_TIMEOUT', 30);               // الحد الأقصى للانتظار بالثواني

// ============================================
// EMAIL VALIDATION
// ============================================

define('VALIDATE_EMAIL_DOMAIN', true);     // التحقق من وجود Domain
define('BLOCK_DISPOSABLE_EMAILS', false);  // منع البريد المؤقت
define('REQUIRE_VERIFIED_EMAIL', false);   // طلب تأكيد البريد

// ============================================
// SECURITY SETTINGS
// ============================================

// تشفير البيانات الحساسة في البريد
define('MASK_SENSITIVE_DATA', true);
define('MASK_ID_NUMBER', true);            // إخفاء رقم الهوية
define('MASK_BANK_ACCOUNT', true);         // إخفاء رقم الحساب
define('MASK_PHONE_NUMBER', true);         // إخفاء رقم الهاتف

// ============================================
// MONITORING & LOGGING
// ============================================

define('LOG_DIRECTORY', __DIR__ . '/logs/');
define('EMAIL_LOG_FILE', LOG_DIRECTORY . 'emails.log');
define('ERROR_LOG_FILE', LOG_DIRECTORY . 'errors.log');
define('AUDIT_LOG_FILE', LOG_DIRECTORY . 'audit.log');

// ============================================
// RATE LIMITING
// ============================================

define('MAX_EMAILS_PER_HOUR', 100);        // الحد الأقصى للرسائل في الساعة
define('MAX_EMAILS_PER_USER_PER_DAY', 3);  // الحد الأقصى لكل مستخدم يومياً

// ============================================
// BACKUP & ARCHIVE
// ============================================

define('ARCHIVE_EMAILS', true);            // حفظ نسخة من الرسائل
define('ARCHIVE_DIRECTORY', LOG_DIRECTORY . 'archive/');
define('ARCHIVE_DAYS', 90);                // حفظ لمدة 90 يوم

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * إرسال بريد آمن مع المحاولة والتسجيل
 */
function sendSecureEmail($to, $subject, $htmlContent, $additionalHeaders = []) {
    // تحقق من التسجيل
    if (!email_log_enabled()) {
        return false;
    }

    // تحقق من حد المعدل
    if (!check_rate_limit($to)) {
        error_log("Rate limit exceeded for: $to");
        return false;
    }

    $headers = [
        'MIME-Version' => '1.0',
        'Content-type' => 'text/html; charset=UTF-8',
        'From' => FROM_NAME . ' <' . FROM_EMAIL . '>',
        'Reply-To' => ADMIN_EMAIL,
        'X-Mailer' => 'PHP/' . phpversion(),
        'X-Priority' => '3',
        'X-MSMail-Priority' => 'Normal'
    ];

    // دمج الرؤوس الإضافية
    $headers = array_merge($headers, $additionalHeaders);

    // تحويل الرؤوس إلى صيغة صحيحة
    $headerString = '';
    foreach ($headers as $key => $value) {
        $headerString .= $key . ': ' . $value . "\r\n";
    }

    // محاولة الإرسال
    $sent = false;
    for ($attempt = 1; $attempt <= EMAIL_RETRY_COUNT; $attempt++) {
        $result = @mail($to, $subject, $htmlContent, $headerString);
        
        if ($result) {
            $sent = true;
            break;
        }

        if ($attempt < EMAIL_RETRY_COUNT) {
            sleep(EMAIL_RETRY_DELAY);
        }
    }

    // تسجيل الرسالة
    if (LOG_EMAILS) {
        log_email($to, $subject, $sent, $attempt);
    }

    // حفظ نسخة إذا لزم الأمر
    if (ARCHIVE_EMAILS && $sent) {
        archive_email($to, $subject, $htmlContent);
    }

    return $sent;
}

/**
 * تسجيل الرسالة المرسلة
 */
function log_email($to, $subject, $success, $attempts) {
    $logMessage = sprintf(
        "[%s] %s | TO: %s | SUBJECT: %s | ATTEMPTS: %d | STATUS: %s\n",
        date('Y-m-d H:i:s'),
        $success ? 'SUCCESS' : 'FAILED',
        $to,
        $subject,
        $attempts,
        $success ? 'SENT' : 'FAILED'
    );

    if (!file_exists(LOG_DIRECTORY)) {
        mkdir(LOG_DIRECTORY, 0755, true);
    }

    file_put_contents(EMAIL_LOG_FILE, $logMessage, FILE_APPEND);
}

/**
 * فحص حد المعدل
 */
function check_rate_limit($email) {
    // يمكن تطبيق logic أكثر تقدماً هنا
    // مثل التحقق من Redis أو database
    return true;
}

/**
 * التحقق من تفعيل السجلات
 */
function email_log_enabled() {
    return defined('LOG_EMAILS') && LOG_EMAILS;
}

/**
 * حفظ نسخة من البريد
 */
function archive_email($to, $subject, $content) {
    if (!file_exists(ARCHIVE_DIRECTORY)) {
        mkdir(ARCHIVE_DIRECTORY, 0755, true);
    }

    $filename = ARCHIVE_DIRECTORY . date('Y-m-d_H-i-s') . '_' . md5($to) . '.eml';
    
    $archiveContent = "To: $to\n";
    $archiveContent .= "Subject: $subject\n";
    $archiveContent .= "Date: " . date('r') . "\n";
    $archiveContent .= "---\n";
    $archiveContent .= $content;

    file_put_contents($filename, $archiveContent);
}

/**
 * إخفاء البيانات الحساسة
 */
function mask_sensitive_data($type, $value) {
    if (!MASK_SENSITIVE_DATA) {
        return $value;
    }

    switch ($type) {
        case 'id':
            if (MASK_ID_NUMBER && strlen($value) > 6) {
                return substr($value, 0, 3) . '***' . substr($value, -3);
            }
            break;

        case 'account':
            if (MASK_BANK_ACCOUNT && strlen($value) > 6) {
                return '**** **** **** ' . substr($value, -4);
            }
            break;

        case 'phone':
            if (MASK_PHONE_NUMBER && strlen($value) > 4) {
                return '0****' . substr($value, -4);
            }
            break;
    }

    return $value;
}

/**
 * إنشء مجلد السجلات إذا لم يكن موجوداً
 */
if (!file_exists(LOG_DIRECTORY)) {
    @mkdir(LOG_DIRECTORY, 0755, true);
}

if (!file_exists(ARCHIVE_DIRECTORY)) {
    @mkdir(ARCHIVE_DIRECTORY, 0755, true);
}

// ============================================
// INITIALIZATION
// ============================================

// تسجيل نقطة الدخول
if (php_sapi_name() !== 'cli') {
    $initLog = sprintf(
        "[%s] Email Configuration loaded for: %s\n",
        date('Y-m-d H:i:s'),
        $_SERVER['REQUEST_URI'] ?? 'CLI'
    );
    
    @file_put_contents(AUDIT_LOG_FILE, $initLog, FILE_APPEND);
}

// التحقق من التكوين
function verify_email_configuration() {
    $errors = [];

    if (empty(ADMIN_EMAIL)) {
        $errors[] = "ADMIN_EMAIL is not configured";
    }

    if (SEND_APPLICANT_EMAIL && empty(FROM_EMAIL)) {
        $errors[] = "FROM_EMAIL is not configured";
    }

    return $errors;
}

// تشغيل التحقق
$configErrors = verify_email_configuration();
if (!empty($configErrors)) {
    error_log("Email Configuration Errors: " . implode(", ", $configErrors));
}

?>
