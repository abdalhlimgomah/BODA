/**
 * BODA Security Manager - إدارة الأمان والحماية
 * Advanced Security and Protection Management System
 */

const SECURITY_CONFIG = {
    encryption: {
        algorithm: 'AES-256-GCM',
        saltLength: 16,
        iterations: 100000
    },
    session: {
        timeout: 30 * 60 * 1000, // 30 دقائق
        refreshInterval: 5 * 60 * 1000, // 5 دقائق
        maxSessions: 3,
        secureCookie: true
    },
    csrf: {
        enabled: true,
        tokenLength: 32,
        headerName: 'X-CSRF-Token'
    },
    rateLimit: {
        loginAttempts: 5,
        loginWindow: 15 * 60 * 1000,
        apiRequests: 100,
        apiWindow: 60 * 60 * 1000
    },
    headers: {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'SAMEORIGIN',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'Referrer-Policy': 'strict-origin-when-cross-origin'
    }
};

class SecurityManager {
    constructor() {
        this.sessionToken = null;
        this.csrfToken = null;
        this.encryptionKey = null;
        this.rateLimit = new Map();
        this.activeSessions = new Map();
        this.blockedUsers = new Set();
        this.securityLogs = [];
        this.maxLogs = 200;
        this.init();
    }

    init() {
        this.setupSecurityHeaders();
        this.generateCSRFToken();
        this.initSession();
        this.preventClickjacking();
        this.attachSecurityListeners();
        this.setupContentSecurityPolicy();
    }

    // ============================================
    // توليد التوكنات
    // ============================================

    generateSecureToken(length = 32) {
        const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        const array = new Uint8Array(length);
        crypto.getRandomValues(array);
        return Array.from(array, byte => charset[byte % charset.length]).join('');
    }

    generateCSRFToken() {
        this.csrfToken = this.generateSecureToken(SECURITY_CONFIG.csrf.tokenLength);
        sessionStorage.setItem('csrf_token', this.csrfToken);
        this.logSecurityEvent('CSRF_TOKEN_GENERATED');
        return this.csrfToken;
    }

    getCSRFToken() {
        return this.csrfToken || sessionStorage.getItem('csrf_token');
    }

    verifyCSRFToken(token) {
        const storedToken = this.getCSRFToken();
        if (!token || token !== storedToken) {
            this.logSecurityEvent('CSRF_TOKEN_VERIFICATION_FAILED');
            return false;
        }
        return true;
    }

    // ============================================
    // إدارة الجلسات
    // ============================================

    initSession() {
        const existingToken = sessionStorage.getItem('session_token');
        this.sessionToken = existingToken || this.generateSecureToken();
        sessionStorage.setItem('session_token', this.sessionToken);
        sessionStorage.setItem('session_start', Date.now().toString());
        sessionStorage.setItem('last_activity', Date.now().toString());

        this.activeSessions.set(this.sessionToken, {
            startTime: Date.now(),
            lastActivity: Date.now()
        });

        // فحص انتهاء الجلسة
        this.sessionCheckInterval = setInterval(() => {
            this.checkSessionTimeout();
        }, SECURITY_CONFIG.session.refreshInterval);

        // تحديث آخر نشاط
        ['mousemove', 'keypress', 'click', 'scroll'].forEach(event => {
            document.addEventListener(event, () => {
                sessionStorage.setItem('last_activity', Date.now().toString());
                if (this.activeSessions.has(this.sessionToken)) {
                    this.activeSessions.get(this.sessionToken).lastActivity = Date.now();
                }
            }, { passive: true });
        });

        this.logSecurityEvent('SESSION_INITIALIZED');
    }

    checkSessionTimeout() {
        const lastActivity = parseInt(sessionStorage.getItem('last_activity') || '0');
        if (lastActivity && Date.now() - lastActivity > SECURITY_CONFIG.session.timeout) {
            this.endSession('TIMEOUT');
        }
    }

    endSession(reason = 'MANUAL') {
        clearInterval(this.sessionCheckInterval);
        this.logSecurityEvent('SESSION_ENDED', { reason });
        sessionStorage.clear();
        localStorage.removeItem('auth_token');
        window.location.href = '/pages/login.html';
    }

    // ============================================
    // حماية المدخلات
    // ============================================

    sanitizeInput(input, type = 'text') {
        if (!input) return '';

        let sanitized = String(input).trim();

        // إزالة الأحرف الخطرة
        const dangerousChars = /[<>\"'`]/g;
        sanitized = sanitized.replace(dangerousChars, (char) => {
            const entities = {
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;',
                '`': '&#96;'
            };
            return entities[char];
        });

        switch (type) {
            case 'html':
                sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
                sanitized = sanitized.replace(/on\w+\s*=\s*"[^"]*"/gi, '');
                break;
            case 'url':
                try {
                    const url = new URL(sanitized, window.location.origin);
                    if (!url.origin.startsWith(window.location.origin)) {
                        throw new Error('Invalid origin');
                    }
                    sanitized = url.toString();
                } catch {
                    sanitized = '';
                }
                break;
            case 'email':
                sanitized = sanitized.toLowerCase().trim();
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitized)) {
                    sanitized = '';
                }
                break;
            case 'number':
                sanitized = sanitized.replace(/[^\d.-]/g, '');
                break;
            case 'phone':
                sanitized = sanitized.replace(/[^\d+\-() ]/g, '');
                break;
        }

        this.logSecurityEvent('INPUT_SANITIZED', { type, length: sanitized.length });
        return sanitized;
    }

    // ============================================
    // حماية كلمة المرور
    // ============================================

    validatePassword(password) {
        const rules = {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            numbers: /\d/.test(password),
            special: /[@$!%*?&#^()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
        };

        const strength = this.calculatePasswordStrength(rules);
        const valid = Object.values(rules).every(v => v);

        return { valid, strength, rules };
    }

    calculatePasswordStrength(rules) {
        const passedRules = Object.values(rules).filter(v => v).length;
        if (passedRules <= 2) return 'weak';
        if (passedRules <= 3) return 'medium';
        if (passedRules <= 4) return 'strong';
        return 'very-strong';
    }

    hashPassword(password) {
        // في بيئة الإنتاج، استخدم bcryptjs
        return btoa(password); // لأغراض التطوير فقط
    }

    // ============================================
    // حماية من الهجمات
    // ============================================

    setupSecurityHeaders() {
        const cspMeta = document.createElement('meta');
        cspMeta.httpEquiv = 'Content-Security-Policy';
        cspMeta.content = "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https:;";
        document.head.appendChild(cspMeta);

        const referrerMeta = document.createElement('meta');
        referrerMeta.name = 'referrer';
        referrerMeta.content = 'strict-origin-when-cross-origin';
        document.head.appendChild(referrerMeta);
    }

    setupContentSecurityPolicy() {
        if (typeof document.domain !== 'undefined') {
            Object.defineProperty(document, 'domain', { value: document.domain });
        }
    }

    preventClickjacking() {
        if (window.self !== window.top) {
            window.top.location = window.self.location;
        }
    }

    preventXSS(input) {
        const div = document.createElement('div');
        div.textContent = input;
        return div.innerHTML;
    }

    // ============================================
    // حماية من Brute Force
    // ============================================

    checkRateLimit(identifier, maxAttempts = 5, windowMs = 15 * 60 * 1000) {
        const now = Date.now();
        const key = `ratelimit_${identifier}`;

        if (!this.rateLimit.has(key)) {
            this.rateLimit.set(key, []);
        }

        let attempts = this.rateLimit.get(key);
        attempts = attempts.filter(timestamp => now - timestamp < windowMs);

        if (attempts.length >= maxAttempts) {
            this.blockedUsers.add(identifier);
            this.logSecurityEvent('RATE_LIMIT_EXCEEDED', { identifier, attempts: attempts.length });
            return {
                allowed: false,
                remainingTime: Math.ceil((attempts[0] + windowMs - now) / 1000),
                blocked: true
            };
        }

        attempts.push(now);
        this.rateLimit.set(key, attempts);

        return { allowed: true, blocked: false };
    }

    isUserBlocked(identifier) {
        return this.blockedUsers.has(identifier);
    }

    unblockUser(identifier) {
        this.blockedUsers.delete(identifier);
        this.logSecurityEvent('USER_UNBLOCKED', { identifier });
    }

    // ============================================
    // المراقبة والتسجيل
    // ============================================

    attachSecurityListeners() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.monitorDOMChanges();
                this.protectSensitiveElements();
            });
        } else {
            this.monitorDOMChanges();
            this.protectSensitiveElements();
        }

        // تعطيل الكليك اليمين على العناصر المحمية
        document.addEventListener('contextmenu', (e) => {
            if (e.target.closest('[data-protected]')) {
                e.preventDefault();
                this.logSecurityEvent('CONTEXT_MENU_BLOCKED');
            }
        });

        // منع الاختيار على العناصر الحساسة
        document.addEventListener('selectstart', (e) => {
            if (e.target.closest('[data-no-select]')) {
                e.preventDefault();
            }
        });

        // كشف التطبيقات المريبة
        window.addEventListener('beforeunload', () => {
            this.logSecurityEvent('PAGE_UNLOAD');
        });
    }

    monitorDOMChanges() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeName === 'SCRIPT' && !node.hasAttribute('data-allowed')) {
                            console.warn('⚠️ Suspicious script detected and removed');
                            node.remove();
                            this.logSecurityEvent('MALICIOUS_SCRIPT_REMOVED');
                        }
                        if (node.tagName === 'IFRAME' && !node.hasAttribute('data-allowed')) {
                            console.warn('⚠️ Suspicious iframe detected');
                            this.logSecurityEvent('MALICIOUS_IFRAME_DETECTED');
                        }
                    });
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    protectSensitiveElements() {
        const sensitiveElements = document.querySelectorAll('[data-protected]');
        sensitiveElements.forEach(element => {
            element.addEventListener('copy', (e) => {
                e.preventDefault();
                this.logSecurityEvent('COPY_BLOCKED', { element: element.tagName });
            });
        });
    }

    logSecurityEvent(event, details = {}) {
        const log = {
            id: `log_${this.generateSecureToken(8)}`,
            timestamp: new Date().toISOString(),
            event,
            details,
            userAgent: navigator.userAgent,
            url: window.location.href,
            sessionToken: this.sessionToken
        };

        this.securityLogs.push(log);

        if (this.securityLogs.length > this.maxLogs) {
            this.securityLogs.shift();
        }

        try {
            localStorage.setItem('security_logs', JSON.stringify(this.securityLogs));
        } catch (e) {
            console.warn('Failed to save security logs');
        }
    }

    getSecurityLogs() {
        return this.securityLogs;
    }

    exportSecurityLogs() {
        return JSON.stringify(this.securityLogs, null, 2);
    }

    clearSecurityLogs() {
        this.securityLogs = [];
        localStorage.removeItem('security_logs');
        this.logSecurityEvent('SECURITY_LOGS_CLEARED');
    }
}

// تصدير الفئة
window.SecurityManager = SecurityManager;
