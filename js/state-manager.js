/**
 * BODA State Manager - إدارة الحالة المركزية
 * Centralized State Management System
 */

class StateManager {
    constructor() {
        this.state = {
            user: null,
            cart: [],
            wishlist: [],
            orders: [],
            products: [],
            filters: {},
            notifications: [],
            theme: localStorage.getItem('theme') || 'light'
        };
        
        this.observers = new Map();
        this.history = [];
        this.historyIndex = -1;
        this.maxHistory = 50;
        this.init();
    }

    init() {
        this.loadFromLocalStorage();
        this.setupTheme();
        this.attachGlobalListeners();
    }

    // ============================================
    // إدارة الحالة
    // ============================================

    getState(path = null) {
        if (!path) return this.state;
        
        return path.split('.').reduce((obj, key) => obj?.[key], this.state);
    }

    setState(path, value) {
        const previousState = JSON.parse(JSON.stringify(this.state));
        
        // تحديث الحالة
        const keys = path.split('.');
        let current = this.state;
        
        for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]]) {
                current[keys[i]] = {};
            }
            current = current[keys[i]];
        }
        
        current[keys[keys.length - 1]] = value;
        
        // إضافة للسجل
        this.addToHistory(previousState, this.state);
        
        // إخطار المراقبين
        this.notifyObservers(path, value);
        
        // حفظ إلى LocalStorage
        this.saveToLocalStorage();
    }

    updateState(updates) {
        const previousState = JSON.parse(JSON.stringify(this.state));
        
        for (const [path, value] of Object.entries(updates)) {
            const keys = path.split('.');
            let current = this.state;
            
            for (let i = 0; i < keys.length - 1; i++) {
                if (!current[keys[i]]) {
                    current[keys[i]] = {};
                }
                current = current[keys[i]];
            }
            
            current[keys[keys.length - 1]] = value;
        }
        
        this.addToHistory(previousState, this.state);
        this.notifyObservers('global', this.state);
        this.saveToLocalStorage();
    }

    // ============================================
    // إدارة المستخدم
    // ============================================

    setUser(user) {
        this.setState('user', user);
        localStorage.setItem('user', JSON.stringify(user));
    }

    getUser() {
        return this.state.user;
    }

    clearUser() {
        this.setState('user', null);
        localStorage.removeItem('user');
    }

    // ============================================
    // إدارة سلة الشراء
    // ============================================

    addToCart(product) {
        const cart = this.state.cart;
        const existingItem = cart.find(item => item.id === product.id);
        
        if (existingItem) {
            existingItem.quantity += product.quantity || 1;
        } else {
            cart.push({
                id: product.id,
                name: product.name,
                price: product.price,
                image: product.image,
                quantity: product.quantity || 1
            });
        }
        
        this.setState('cart', cart);
        this.notifyObservers('cart.added', product);
    }

    removeFromCart(productId) {
        const cart = this.state.cart.filter(item => item.id !== productId);
        this.setState('cart', cart);
        this.notifyObservers('cart.removed', productId);
    }

    updateCartItemQuantity(productId, quantity) {
        const item = this.state.cart.find(item => item.id === productId);
        if (item) {
            if (quantity <= 0) {
                this.removeFromCart(productId);
            } else {
                item.quantity = quantity;
                this.setState('cart', this.state.cart);
            }
        }
    }

    getCart() {
        return this.state.cart;
    }

    getCartTotal() {
        return this.state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }

    getCartItemCount() {
        return this.state.cart.reduce((sum, item) => sum + item.quantity, 0);
    }

    clearCart() {
        this.setState('cart', []);
        this.notifyObservers('cart.cleared', null);
    }

    // ============================================
    // إدارة قائمة الرغبات
    // ============================================

    addToWishlist(product) {
        const wishlist = this.state.wishlist;
        if (!wishlist.find(item => item.id === product.id)) {
            wishlist.push(product);
            this.setState('wishlist', wishlist);
            this.notifyObservers('wishlist.added', product);
        }
    }

    removeFromWishlist(productId) {
        const wishlist = this.state.wishlist.filter(item => item.id !== productId);
        this.setState('wishlist', wishlist);
        this.notifyObservers('wishlist.removed', productId);
    }

    toggleWishlist(product) {
        if (this.isInWishlist(product.id)) {
            this.removeFromWishlist(product.id);
        } else {
            this.addToWishlist(product);
        }
    }

    isInWishlist(productId) {
        return this.state.wishlist.some(item => item.id === productId);
    }

    getWishlist() {
        return this.state.wishlist;
    }

    // ============================================
    // إدارة الطلبات
    // ============================================

    addOrder(order) {
        const orders = this.state.orders;
        orders.push({
            id: `order_${Date.now()}`,
            timestamp: new Date().toISOString(),
            ...order
        });
        this.setState('orders', orders);
        this.notifyObservers('order.created', order);
    }

    getOrders() {
        return this.state.orders;
    }

    getOrder(orderId) {
        return this.state.orders.find(o => o.id === orderId);
    }

    // ============================================
    // إدارة المنتجات
    // ============================================

    setProducts(products) {
        this.setState('products', products);
    }

    getProducts(filters = {}) {
        let products = this.state.products;
        
        if (filters.category) {
            products = products.filter(p => p.category === filters.category);
        }
        
        if (filters.search) {
            const searchTerm = filters.search.toLowerCase();
            products = products.filter(p =>
                p.name.toLowerCase().includes(searchTerm) ||
                p.description?.toLowerCase().includes(searchTerm)
            );
        }
        
        if (filters.minPrice) {
            products = products.filter(p => p.price >= filters.minPrice);
        }
        
        if (filters.maxPrice) {
            products = products.filter(p => p.price <= filters.maxPrice);
        }
        
        if (filters.sort) {
            products.sort((a, b) => {
                switch (filters.sort) {
                    case 'price-asc': return a.price - b.price;
                    case 'price-desc': return b.price - a.price;
                    case 'newest': return new Date(b.createdAt) - new Date(a.createdAt);
                    case 'rating': return b.rating - a.rating;
                    default: return 0;
                }
            });
        }
        
        return products;
    }

    searchProducts(query) {
        return this.getProducts({ search: query });
    }

    // ============================================
    // إدارة الإشعارات
    // ============================================

    addNotification(notification) {
        const notifications = this.state.notifications;
        const id = `notif_${Date.now()}`;
        
        notifications.push({
            id,
            ...notification,
            timestamp: Date.now()
        });
        
        this.setState('notifications', notifications);
        this.notifyObservers('notification.added', notification);
        
        // حذف الإشعار بعد مدة
        if (notification.duration !== false) {
            setTimeout(() => {
                this.removeNotification(id);
            }, notification.duration || 5000);
        }
        
        return id;
    }

    removeNotification(notificationId) {
        const notifications = this.state.notifications.filter(n => n.id !== notificationId);
        this.setState('notifications', notifications);
    }

    getNotifications() {
        return this.state.notifications;
    }

    clearNotifications() {
        this.setState('notifications', []);
    }

    // ============================================
    // إدارة التصفية والترتيب
    // ============================================

    setFilters(filters) {
        this.setState('filters', filters);
        this.notifyObservers('filters.changed', filters);
    }

    getFilters() {
        return this.state.filters;
    }

    // ============================================
    // إدارة الثيم
    // ============================================

    setTheme(theme) {
        this.setState('theme', theme);
        localStorage.setItem('theme', theme);
        this.setupTheme();
        this.notifyObservers('theme.changed', theme);
    }

    getTheme() {
        return this.state.theme;
    }

    setupTheme() {
        const theme = this.state.theme;
        document.documentElement.setAttribute('data-theme', theme);
        
        if (theme === 'dark') {
            document.body.style.backgroundColor = '#1f2937';
            document.body.style.color = '#f9fafb';
        } else {
            document.body.style.backgroundColor = '#ffffff';
            document.body.style.color = '#1f2937';
        }
    }

    toggleTheme() {
        const newTheme = this.state.theme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
    }

    // ============================================
    // المراقبين والاشتراكات
    // ============================================

    subscribe(path, callback) {
        if (!this.observers.has(path)) {
            this.observers.set(path, []);
        }
        
        this.observers.get(path).push(callback);
        
        // إرجاع دالة الإلغاء
        return () => {
            const callbacks = this.observers.get(path);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        };
    }

    notifyObservers(path, value) {
        if (this.observers.has(path)) {
            this.observers.get(path).forEach(callback => {
                try {
                    callback(value);
                } catch (error) {
                    console.error('Error in observer callback:', error);
                }
            });
        }
    }

    // ============================================
    // السجل والرجوع للخلف
    // ============================================

    addToHistory(previousState, currentState) {
        // إزالة أي إدخالات مستقبلية إذا كنا في المنتصف
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }
        
        this.history.push({
            previousState,
            currentState,
            timestamp: Date.now()
        });
        
        // الاحتفاظ بحد أقصى من السجل
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        } else {
            this.historyIndex++;
        }
    }

    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            const { previousState } = this.history[this.historyIndex];
            this.state = JSON.parse(JSON.stringify(previousState));
            this.saveToLocalStorage();
            this.notifyObservers('global', this.state);
        }
    }

    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            const { currentState } = this.history[this.historyIndex];
            this.state = JSON.parse(JSON.stringify(currentState));
            this.saveToLocalStorage();
            this.notifyObservers('global', this.state);
        }
    }

    // ============================================
    // الحفظ والتحميل
    // ============================================

    saveToLocalStorage() {
        try {
            localStorage.setItem('app_state', JSON.stringify({
                user: this.state.user,
                cart: this.state.cart,
                wishlist: this.state.wishlist,
                orders: this.state.orders,
                filters: this.state.filters
            }));
        } catch (e) {
            console.warn('Failed to save state to localStorage');
        }
    }

    loadFromLocalStorage() {
        try {
            const saved = localStorage.getItem('app_state');
            if (saved) {
                const parsed = JSON.parse(saved);
                this.state = { ...this.state, ...parsed };
            }
        } catch (e) {
            console.warn('Failed to load state from localStorage');
        }
    }

    // ============================================
    // المساعدات
    // ============================================

    reset() {
        this.state = {
            user: null,
            cart: [],
            wishlist: [],
            orders: [],
            products: [],
            filters: {},
            notifications: [],
            theme: 'light'
        };
        this.observers.clear();
        this.history = [];
        this.historyIndex = -1;
        localStorage.removeItem('app_state');
        this.notifyObservers('global', this.state);
    }

    exportState() {
        return JSON.stringify(this.state, null, 2);
    }

    attachGlobalListeners() {
        // حفظ عند إغلاق الصفحة
        window.addEventListener('beforeunload', () => {
            this.saveToLocalStorage();
        });
    }
}

// إنشاء نسخة واحدة من StateManager
const stateManager = new StateManager();

// تصدير الفئة والنسخة
window.StateManager = StateManager;
window.state = stateManager;
