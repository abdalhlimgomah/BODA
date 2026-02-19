/**
 * BODA Notification System - نظام الإشعارات المتقدم
 * إدارة الإشعارات والتنبيهات في الوقت الفعلي
 */

class NotificationManager {
    constructor() {
        this.notifications = [];
        this.maxNotifications = 10;
        this.notificationDuration = 5000; // 5 ثوان
        this.container = null;
        this.sound = new Audio('data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAAgAAABAAgAZGF0YQIAAAAAAAA=');
        this.init();
    }

    init() {
        // إنشاء مربع الإشعارات
        this.container = document.createElement('div');
        this.container.id = 'notifications-container';
        this.container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            max-width: 400px;
            pointer-events: none;
            direction: rtl;
        `;
        document.body.appendChild(this.container);

        // إضافة أنماط CSS
        this.addStyles();
    }

    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .notification {
                background: white;
                border-radius: 8px;
                padding: 16px;
                margin-bottom: 12px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                animation: slideIn 0.3s ease;
                pointer-events: auto;
                display: flex;
                align-items: flex-start;
                gap: 12px;
                direction: rtl;
                border-right: 4px solid;
            }

            .notification.success {
                border-right-color: #10b981;
                background: #ecfdf5;
            }

            .notification.error {
                border-right-color: #ef4444;
                background: #fef2f2;
            }

            .notification.warning {
                border-right-color: #f59e0b;
                background: #fffbeb;
            }

            .notification.info {
                border-right-color: #3b82f6;
                background: #eff6ff;
            }

            .notification-icon {
                font-size: 20px;
                flex-shrink: 0;
                margin-top: 2px;
            }

            .notification-content {
                flex: 1;
                min-width: 0;
            }

            .notification-title {
                font-weight: 600;
                margin-bottom: 4px;
                color: #1f2937;
            }

            .notification-message {
                font-size: 14px;
                color: #6b7280;
            }

            .notification-close {
                background: none;
                border: none;
                font-size: 20px;
                cursor: pointer;
                color: #9ca3af;
                padding: 0;
                flex-shrink: 0;
            }

            .notification-close:hover {
                color: #374151;
            }

            @keyframes slideIn {
                from {
                    transform: translateX(400px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }

            @keyframes slideOut {
                to {
                    transform: translateX(400px);
                    opacity: 0;
                }
            }

            .notification.removing {
                animation: slideOut 0.3s ease;
            }

            .notification-progress {
                height: 3px;
                background: rgba(0,0,0,0.1);
                border-radius: 2px;
                margin-top: 8px;
                overflow: hidden;
            }

            .notification-progress-bar {
                height: 100%;
                background: currentColor;
                animation: progress linear forwards;
            }

            @keyframes progress {
                from { width: 100%; }
                to { width: 0%; }
            }
        `;
        document.head.appendChild(style);
    }

    show(options = {}) {
        const {
            type = 'info',
            title = 'إشعار',
            message = '',
            duration = this.notificationDuration,
            action = null,
            sound = false
        } = options;

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };

        let html = `
            <div class="notification-icon">${icons[type]}</div>
            <div class="notification-content">
                <div class="notification-title">${this.sanitize(title)}</div>
                <div class="notification-message">${this.sanitize(message)}</div>
        `;

        if (duration > 0) {
            html += `<div class="notification-progress">
                <div class="notification-progress-bar" style="animation-duration: ${duration}ms;"></div>
            </div>`;
        }

        html += `</div>
            <button class="notification-close" aria-label="إغلاق">×</button>
        `;

        notification.innerHTML = html;

        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => this.remove(notification));

        this.container.appendChild(notification);
        this.notifications.push(notification);

        if (sound) {
            this.playSound();
        }

        if (duration > 0) {
            setTimeout(() => this.remove(notification), duration);
        }

        return notification;
    }

    success(title, message, options = {}) {
        return this.show({ type: 'success', title, message, ...options });
    }

    error(title, message, options = {}) {
        return this.show({ type: 'error', title, message, ...options });
    }

    warning(title, message, options = {}) {
        return this.show({ type: 'warning', title, message, ...options });
    }

    info(title, message, options = {}) {
        return this.show({ type: 'info', title, message, ...options });
    }

    remove(notification) {
        notification.classList.add('removing');
        setTimeout(() => {
            notification.remove();
            this.notifications = this.notifications.filter(n => n !== notification);
        }, 300);
    }

    clear() {
        this.notifications.forEach(n => this.remove(n));
    }

    sanitize(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    playSound() {
        if (this.sound && this.sound.play) {
            this.sound.play().catch(() => {});
        }
    }
}

// ============================================
// Toast Notifications
// ============================================

class ToastManager {
    static show(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            padding: 12px 20px;
            background: #333;
            color: white;
            border-radius: 4px;
            z-index: 10000;
            font-size: 14px;
            animation: toastIn 0.3s;
        `;

        const colors = {
            success: '#10b981',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6'
        };

        toast.style.background = colors[type] || colors.info;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'toastOut 0.3s';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
}

// تصدير الفئات
window.NotificationManager = NotificationManager;
window.ToastManager = ToastManager;
