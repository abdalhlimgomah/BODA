/**
 * BODA Analytics System - نظام التحليلات والإحصائيات
 * Comprehensive Analytics and Statistics Management
 */

class AnalyticsManager {
    constructor() {
        this.events = [];
        this.sessions = new Map();
        this.pageViews = [];
        this.userActions = [];
        this.maxEvents = 500;
        this.init();
    }

    init() {
        this.trackPageView();
        this.attachEventListeners();
        this.startSessionTracking();
    }

    // ============================================
    // تتبع الصفحات والجلسات
    // ============================================

    trackPageView() {
        const pageView = {
            id: `pv_${Date.now()}`,
            timestamp: new Date().toISOString(),
            page: window.location.pathname,
            title: document.title,
            referrer: document.referrer,
            url: window.location.href,
            duration: 0
        };

        this.pageViews.push(pageView);
        sessionStorage.setItem('current_page', JSON.stringify(pageView));

        // تتبع مدة الزيارة
        window.addEventListener('beforeunload', () => {
            pageView.duration = Date.now() - new Date(pageView.timestamp).getTime();
            this.saveEvent({
                type: 'PAGE_DURATION',
                page: pageView.page,
                duration: pageView.duration
            });
        });
    }

    startSessionTracking() {
        const sessionId = `session_${Date.now()}`;
        const session = {
            id: sessionId,
            startTime: Date.now(),
            lastActivity: Date.now(),
            pageViews: 0,
            interactions: 0,
            deviceInfo: this.getDeviceInfo()
        };

        this.sessions.set(sessionId, session);
        sessionStorage.setItem('analytics_session', sessionId);

        // تحديث النشاط
        document.addEventListener('click', () => {
            session.lastActivity = Date.now();
            session.interactions++;
        });

        document.addEventListener('scroll', () => {
            session.lastActivity = Date.now();
        });
    }

    // ============================================
    // تتبع الأحداث
    // ============================================

    trackEvent(eventType, data = {}) {
        const event = {
            id: `event_${Date.now()}`,
            type: eventType,
            timestamp: new Date().toISOString(),
            page: window.location.pathname,
            data,
            sessionId: sessionStorage.getItem('analytics_session'),
            userId: localStorage.getItem('user_id'),
            userAgent: navigator.userAgent
        };

        this.events.push(event);

        // الاحتفاظ بحد أقصى من الأحداث
        if (this.events.length > this.maxEvents) {
            this.events.shift();
        }

        // حفظ في localStorage
        this.persistEvents();

        return event;
    }

    trackProductView(productId, productName, price) {
        return this.trackEvent('PRODUCT_VIEW', {
            productId,
            productName,
            price
        });
    }

    trackProductClick(productId, action = 'click') {
        return this.trackEvent('PRODUCT_INTERACTION', {
            productId,
            action
        });
    }

    trackAddToCart(productId, quantity = 1) {
        return this.trackEvent('ADD_TO_CART', {
            productId,
            quantity
        });
    }

    trackSearch(query, resultsCount = 0) {
        return this.trackEvent('SEARCH', {
            query,
            resultsCount
        });
    }

    trackCheckout(cartValue, itemCount) {
        return this.trackEvent('CHECKOUT_STARTED', {
            cartValue,
            itemCount
        });
    }

    trackPurchase(orderId, totalAmount, items = []) {
        return this.trackEvent('PURCHASE', {
            orderId,
            totalAmount,
            itemCount: items.length,
            items
        });
    }

    trackUserAction(action, target = null) {
        return this.trackEvent('USER_ACTION', {
            action,
            target: target?.id || target?.class || target?.textContent || null
        });
    }

    trackError(errorType, errorMessage, stack = '') {
        return this.trackEvent('ERROR', {
            type: errorType,
            message: errorMessage,
            stack
        });
    }

    trackFormSubmit(formName, fieldCount = 0) {
        return this.trackEvent('FORM_SUBMIT', {
            formName,
            fieldCount
        });
    }

    // ============================================
    // جمع البيانات
    // ============================================

    getDeviceInfo() {
        return {
            userAgent: navigator.userAgent,
            language: navigator.language,
            platform: navigator.platform,
            screenWidth: window.screen.width,
            screenHeight: window.screen.height,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            cookiesEnabled: navigator.cookieEnabled,
            doNotTrack: navigator.doNotTrack
        };
    }

    getEngagementMetrics() {
        const session = Array.from(this.sessions.values())[0];
        if (!session) return null;

        return {
            sessionDuration: Date.now() - session.startTime,
            pageViews: this.pageViews.length,
            interactions: session.interactions,
            avgTimePerPage: this.pageViews.length > 0 
                ? (Date.now() - session.startTime) / this.pageViews.length 
                : 0
        };
    }

    // ============================================
    // التحليلات والإحصائيات
    // ============================================

    getTopProducts() {
        const products = new Map();

        this.events
            .filter(e => e.type === 'PRODUCT_VIEW')
            .forEach(e => {
                const productId = e.data.productId;
                const count = (products.get(productId) || 0) + 1;
                products.set(productId, {
                    id: productId,
                    name: e.data.productName,
                    views: count
                });
            });

        return Array.from(products.values())
            .sort((a, b) => b.views - a.views)
            .slice(0, 10);
    }

    getConversionRate() {
        const purchases = this.events.filter(e => e.type === 'PURCHASE').length;
        const checkouts = this.events.filter(e => e.type === 'CHECKOUT_STARTED').length;

        if (checkouts === 0) return 0;
        return (purchases / checkouts) * 100;
    }

    getAverageOrderValue() {
        const purchases = this.events.filter(e => e.type === 'PURCHASE');
        if (purchases.length === 0) return 0;

        const totalValue = purchases.reduce((sum, e) => sum + (e.data.totalAmount || 0), 0);
        return totalValue / purchases.length;
    }

    getMostSearchedTerms() {
        const searches = new Map();

        this.events
            .filter(e => e.type === 'SEARCH')
            .forEach(e => {
                const query = e.data.query.toLowerCase();
                const count = (searches.get(query) || 0) + 1;
                searches.set(query, count);
            });

        return Array.from(searches.entries())
            .map(([term, count]) => ({ term, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
    }

    getErrorStats() {
        const errors = new Map();

        this.events
            .filter(e => e.type === 'ERROR')
            .forEach(e => {
                const type = e.data.type;
                const count = (errors.get(type) || 0) + 1;
                errors.set(type, count);
            });

        return Array.from(errors.entries())
            .map(([type, count]) => ({ type, count }))
            .sort((a, b) => b.count - a.count);
    }

    getPageStats() {
        const pages = new Map();

        this.pageViews.forEach(pv => {
            const page = pv.page;
            const data = pages.get(page) || { page, views: 0, totalDuration: 0 };
            data.views++;
            data.totalDuration += pv.duration || 0;
            pages.set(page, data);
        });

        return Array.from(pages.values())
            .map(p => ({
                ...p,
                avgDuration: p.totalDuration / p.views
            }))
            .sort((a, b) => b.views - a.views);
    }

    // ============================================
    // تصدير البيانات
    // ============================================

    persistEvents() {
        try {
            localStorage.setItem('analytics_events', JSON.stringify(this.events));
            localStorage.setItem('analytics_pageviews', JSON.stringify(this.pageViews));
        } catch (e) {
            console.warn('Failed to persist analytics events');
        }
    }

    loadPersistedEvents() {
        try {
            const events = localStorage.getItem('analytics_events');
            const pageViews = localStorage.getItem('analytics_pageviews');

            if (events) this.events = JSON.parse(events);
            if (pageViews) this.pageViews = JSON.parse(pageViews);
        } catch (e) {
            console.warn('Failed to load persisted analytics');
        }
    }

    exportAnalytics() {
        return {
            summary: {
                totalEvents: this.events.length,
                totalPageViews: this.pageViews.length,
                activeSessions: this.sessions.size,
                conversionRate: this.getConversionRate(),
                averageOrderValue: this.getAverageOrderValue()
            },
            topProducts: this.getTopProducts(),
            pageStats: this.getPageStats(),
            searchTerms: this.getMostSearchedTerms(),
            errors: this.getErrorStats(),
            rawEvents: this.events
        };
    }

    exportCSV() {
        const headers = ['Timestamp', 'Type', 'Page', 'UserID', 'Data'];
        const rows = this.events.map(e => [
            e.timestamp,
            e.type,
            e.page,
            e.userId || 'anonymous',
            JSON.stringify(e.data)
        ]);

        let csv = headers.join(',') + '\n';
        rows.forEach(row => {
            csv += row.map(cell => `"${cell}"`).join(',') + '\n';
        });

        return csv;
    }

    downloadReport(filename = 'analytics-report.json') {
        const data = this.exportAnalytics();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    // ============================================
    // إدارة الأحداث
    // ============================================

    attachEventListeners() {
        // تتبع النقرات
        document.addEventListener('click', (e) => {
            const target = e.target.closest('button, a, input[type="submit"]');
            if (target) {
                this.trackUserAction('click', target);
            }
        }, true);

        // تتبع الأخطاء
        window.addEventListener('error', (event) => {
            this.trackError('JAVASCRIPT_ERROR', event.message, event.error?.stack);
        });

        // تتبع التحذيرات
        const originalWarn = console.warn;
        console.warn = (...args) => {
            this.trackError('CONSOLE_WARNING', args.join(' '));
            originalWarn.apply(console, args);
        };

        // تتبع أخطاء الشبكة
        window.addEventListener('online', () => {
            this.trackEvent('NETWORK_ONLINE');
        });

        window.addEventListener('offline', () => {
            this.trackEvent('NETWORK_OFFLINE');
        });
    }

    clearAnalytics() {
        this.events = [];
        this.pageViews = [];
        this.sessions.clear();
        localStorage.removeItem('analytics_events');
        localStorage.removeItem('analytics_pageviews');
    }

    getAnalyticsSummary() {
        return {
            totalEvents: this.events.length,
            totalPageViews: this.pageViews.length,
            dateRange: {
                start: this.events.length > 0 ? this.events[0].timestamp : null,
                end: this.events.length > 0 ? this.events[this.events.length - 1].timestamp : null
            },
            engagement: this.getEngagementMetrics(),
            topProducts: this.getTopProducts(),
            conversionRate: this.getConversionRate(),
            errors: this.getErrorStats()
        };
    }
}

// تصدير الفئة
window.AnalyticsManager = AnalyticsManager;
