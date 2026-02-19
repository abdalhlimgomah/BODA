/**
 * BODA App Core - ملف تجميع جميع الخدمات
 * Application Initialization and Service Aggregator
 */

class BODAApp {
    constructor() {
        this.services = {};
        this.config = {
            environment: 'production',
            debug: false,
            cacheDuration: 5 * 60 * 1000 // 5 دقائق
        };
        this.initialized = false;
    }

    async init() {
        try {
            console.log('🚀 بدء تهيئة تطبيق BODA...');

            // التحقق من المكتبات المطلوبة
            this.verifyDependencies();

            // تهيئة الخدمات الأساسية
            this.initializeCoreServices();

            // تهيئة الخدمات المتقدمة
            this.initializeAdvancedServices();

            // إعداد الاستجابات العامة
            this.setupGlobalHandlers();

            // تحميل البيانات الأولية
            await this.loadInitialData();

            this.initialized = true;
            console.log('✅ تم تهيئة BODA بنجاح');

            return this;
        } catch (error) {
            console.error('❌ خطأ في تهيئة التطبيق:', error);
            this.notifyError('فشل تحميل التطبيق', error.message);
            throw error;
        }
    }

    verifyDependencies() {
        const required = [
            'SecurityManager',
            'ValidationManager',
            'NotificationManager',
            'AnalyticsManager',
            'StateManager',
            'BODADatabaseManager',
            'OrderManager'
        ];

        for (const dep of required) {
            if (!window[dep]) {
                throw new Error(`المكتبة المطلوبة غير موجودة: ${dep}`);
            }
        }

        console.log('✓ تم التحقق من جميع المكتبات المطلوبة');
    }

    initializeCoreServices() {
        // Security Manager
        this.services.security = new SecurityManager();

        // Validation Manager
        this.services.validator = new ValidationManager();

        // Notification Manager
        this.services.notifications = new NotificationManager();

        // State Manager (global)
        this.services.state = window.state;

        // Analytics Manager
        this.services.analytics = new AnalyticsManager();

        console.log('✓ تم تهيئة الخدمات الأساسية');
    }

    initializeAdvancedServices() {
        // Database Manager
        if (window.supabase) {
            this.services.database = new BODADatabaseManager(
                window.supabase,
                this.services.security
            );
        }

        // Order Manager
        this.services.orders = new OrderManager(
            this.services.database,
            this.services.state,
            this.services.validator
        );

        console.log('✓ تم تهيئة الخدمات المتقدمة');
    }

    setupGlobalHandlers() {
        // معالج الأخطاء العام
        window.addEventListener('error', (event) => {
            this.services.analytics.trackError(
                'GLOBAL_ERROR',
                event.message,
                event.error?.stack
            );
            this.handleError(event.error);
        });

        // معالج الأخطاء غير المعالجة في الـ Promises
        window.addEventListener('unhandledrejection', (event) => {
            this.services.analytics.trackError(
                'UNHANDLED_PROMISE',
                event.reason,
                new Error().stack
            );
            this.handleError(event.reason);
        });

        // معالج الاتصال بالشبكة
        window.addEventListener('online', () => {
            this.services.notifications.success('متصل', 'تم استعادة الاتصال بالإنترنت');
            this.services.analytics.trackEvent('NETWORK_ONLINE');
        });

        window.addEventListener('offline', () => {
            this.services.notifications.warning('غير متصل', 'فقدت الاتصال بالإنترنت');
            this.services.analytics.trackEvent('NETWORK_OFFLINE');
        });

        // معالج الانتظار قبل الإغلاق
        window.addEventListener('beforeunload', () => {
            this.services.state.saveToLocalStorage();
            this.services.analytics.persistEvents();
        });

        console.log('✓ تم إعداد معالجات الأخطاء والأحداث');
    }

    async loadInitialData() {
        try {
            // تحميل المستخدم من localStorage
            const savedUser = localStorage.getItem('user');
            if (savedUser) {
                this.services.state.setUser(JSON.parse(savedUser));
            }

            // تحميل الحالة السابقة
            this.services.state.loadFromLocalStorage();

            // تحميل التحليلات السابقة
            this.services.analytics.loadPersistedEvents();

            // محاولة تحميل المنتجات من Supabase
            if (this.services.database) {
                try {
                    const products = await this.services.database.getProducts();
                    this.services.state.setProducts(products);
                } catch (error) {
                    console.warn('فشل تحميل المنتجات من Supabase، استخدام البيانات المحلية');
                }
            }

            console.log('✓ تم تحميل البيانات الأولية');
        } catch (error) {
            console.warn('تحذير في تحميل البيانات الأولية:', error);
        }
    }

    // ============================================
    // إدارة الأخطاء
    // ============================================

    handleError(error) {
        const errorMessage = error?.message || 'حدث خطأ غير متوقع';
        const errorType = error?.name || 'Error';

        console.error(`[${errorType}] ${errorMessage}`);

        if (this.config.environment === 'production') {
            this.services.notifications.error(
                'حدث خطأ',
                'حدث خطأ ما. يرجى محاولة مرة أخرى لاحقاً.'
            );
        } else {
            this.services.notifications.error(
                `خطأ: ${errorType}`,
                errorMessage
            );
        }
    }

    notifyError(title, message) {
        if (this.services.notifications) {
            this.services.notifications.error(title, message);
        }
    }

    // ============================================
    // أدوات المساعدة
    // ============================================

    /**
     * الحصول على خدمة معينة
     */
    getService(serviceName) {
        return this.services[serviceName];
    }

    /**
     * جميع الخدمات
     */
    getServices() {
        return this.services;
    }

    /**
     * تسجيل دخول المستخدم
     */
    async login(email, password) {
        try {
            // التحقق من البيانات
            const emailValidation = this.services.validator.validateEmail(email);
            if (!emailValidation.valid) {
                throw new Error(emailValidation.error);
            }

            const passwordValidation = this.services.validator.validatePassword(password);
            if (!passwordValidation.valid) {
                throw new Error(passwordValidation.error);
            }

            // فحص معدل المحاولات
            const rateCheck = this.services.security.checkRateLimit(
                email,
                5,
                15 * 60 * 1000
            );

            if (!rateCheck.allowed) {
                throw new Error(
                    `تم حظر المحاولات. حاول بعد ${rateCheck.remainingTime} ثانية`
                );
            }

            // محاولة تسجيل الدخول من خلال قاعدة البيانات
            if (this.services.database) {
                // هنا يجب إضافة منطق تسجيل الدخول الفعلي
                // const user = await this.services.database.authenticateUser(email, password);
            }

            // في الوقت الحالي، استخدم بيانات وهمية للاختبار
            const user = {
                id: `user_${Date.now()}`,
                email,
                name: email.split('@')[0],
                role: 'customer',
                verified: true
            };

            this.services.state.setUser(user);
            localStorage.setItem('user', JSON.stringify(user));
            localStorage.setItem('auth_token', this.services.security.generateSecureToken());

            this.services.notifications.success(
                'مرحباً!',
                `أهلاً بك يا ${user.name}`
            );

            this.services.analytics.trackEvent('USER_LOGIN', { email });

            return { success: true, user };
        } catch (error) {
            this.services.analytics.trackError('LOGIN_ERROR', error.message);
            this.services.notifications.error('فشل تسجيل الدخول', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * تسجيل الخروج
     */
    logout() {
        this.services.state.clearUser();
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');

        this.services.notifications.info('مرحباً', 'تم تسجيل خروجك بنجاح');
        this.services.analytics.trackEvent('USER_LOGOUT');

        window.location.href = '/pages/login.html';
    }

    /**
     * الحصول على سلة الشراء الحالية
     */
    getCart() {
        return this.services.state.getCart();
    }

    /**
     * الحصول على إجمالي السلة
     */
    getCartTotal() {
        return this.services.state.getCartTotal();
    }

    /**
     * إضافة منتج للسلة
     */
    addToCart(product) {
        this.services.state.addToCart(product);
        this.services.notifications.success(
            'تمت الإضافة',
            `تمت إضافة "${product.name}" للسلة`
        );
        this.services.analytics.trackAddToCart(product.id, product.quantity);
    }

    /**
     * إنشاء طلب جديد
     */
    async createOrder(orderData) {
        try {
            const result = await this.services.orders.createOrder(orderData);

            if (result.success) {
                this.services.notifications.success(
                    'تم إنشاء الطلب',
                    `رقم الطلب: ${result.order.id}`
                );
                this.services.analytics.trackCheckout(
                    result.order.total,
                    result.order.items.length
                );
            }

            return result;
        } catch (error) {
            this.handleError(error);
            return { success: false, error: error.message };
        }
    }

    /**
     * معالجة الدفع
     */
    async processPayment(orderId, paymentDetails) {
        try {
            const result = await this.services.orders.processPayment(orderId, paymentDetails);

            if (result.success) {
                this.services.notifications.success(
                    'تم الدفع بنجاح',
                    `معرف العملية: ${result.transactionId}`
                );
                this.services.analytics.trackPurchase(
                    orderId,
                    result.order.total,
                    result.order.items
                );
            }

            return result;
        } catch (error) {
            this.handleError(error);
            return { success: false, error: error.message };
        }
    }

    /**
     * البحث عن المنتجات
     */
    searchProducts(query) {
        const results = this.services.state.searchProducts(query);
        this.services.analytics.trackSearch(query, results.length);
        return results;
    }

    /**
     * تغيير الثيم
     */
    toggleTheme() {
        this.services.state.toggleTheme();
        const theme = this.services.state.getTheme();
        this.services.analytics.trackEvent('THEME_CHANGED', { theme });
    }

    /**
     * الحصول على التقرير التحليلي
     */
    getAnalyticsReport() {
        return this.services.analytics.exportAnalytics();
    }

    /**
     * إعادة تعيين التطبيق
     */
    reset() {
        if (confirm('هل تريد حقاً إعادة تعيين جميع البيانات؟')) {
            this.services.state.reset();
            this.services.analytics.clearAnalytics();
            this.services.notifications.clear();
            localStorage.clear();
            window.location.reload();
        }
    }

    // ============================================
    // معلومات التشخيص
    // ============================================

    getDiagnostics() {
        return {
            initialized: this.initialized,
            environment: this.config.environment,
            services: Object.keys(this.services),
            user: this.services.state.getUser(),
            cartItems: this.services.state.getCartItemCount(),
            notifications: this.services.notifications.notifications.length,
            securityLogs: this.services.security.securityLogs.length,
            analyticsEvents: this.services.analytics.events.length,
            theme: this.services.state.getTheme(),
            memory: performance.memory ? {
                usedJSHeapSize: (performance.memory.usedJSHeapSize / 1048576).toFixed(2) + ' MB',
                totalJSHeapSize: (performance.memory.totalJSHeapSize / 1048576).toFixed(2) + ' MB',
                jsHeapSizeLimit: (performance.memory.jsHeapSizeLimit / 1048576).toFixed(2) + ' MB'
            } : 'Not available'
        };
    }

    /**
     * طباعة معلومات التشخيص
     */
    printDiagnostics() {
        const diagnostics = this.getDiagnostics();
        console.group('🔍 تشخيص BODA');
        console.table(diagnostics);
        console.groupEnd();
        return diagnostics;
    }
}

// إنشاء نسخة واحدة من التطبيق
let boda = null;

/**
 * تهيئة التطبيق عند تحميل الصفحة
 */
function initializeBODA() {
    if (!boda) {
        boda = new BODAApp();
        return boda.init();
    }
    return Promise.resolve(boda);
}

// تصدير الفئة والنسخة
window.BODAApp = BODAApp;
window.boda = boda;
window.initializeBODA = initializeBODA;

// تهيئة تلقائية عند الحاجة
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeBODA);
} else {
    initializeBODA();
}
