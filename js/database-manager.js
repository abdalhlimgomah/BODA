/**
 * BODA Database Manager - Advanced Database Management System
 * إدارة قاعدة البيانات المتقدمة مع Supabase
 */

class BODADatabaseManager {
    constructor(supabaseClient, securityManager) {
        this.client = supabaseClient;
        this.security = securityManager;
        this.tables = {
            users: 'users',
            products: 'products',
            orders: 'orders',
            reviews: 'reviews',
            wishlist: 'wishlist',
            cart: 'cart',
            sellers: 'sellers',
            transactions: 'transactions',
            analytics: 'analytics'
        };
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 دقائق
    }

    // ============================================
    // 👥 إدارة المستخدمين
    // ============================================

    async createUser(userData) {
        try {
            const sanitized = {
                id: this.security.generateSecureToken(16),
                email: this.security.sanitizeInput(userData.email),
                fullName: this.security.sanitizeInput(userData.fullName),
                password: await this.hashPassword(userData.password),
                role: userData.role || 'customer',
                status: 'active',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                verified: false
            };

            const { data, error } = await this.client
                .from(this.tables.users)
                .insert([sanitized])
                .select();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('خطأ في إنشاء المستخدم:', error);
            return { success: false, error };
        }
    }

    async getUserById(userId) {
        try {
            // التحقق من الكاش أولاً
            const cacheKey = `user_${userId}`;
            if (this.cache.has(cacheKey)) {
                const cached = this.cache.get(cacheKey);
                if (Date.now() - cached.timestamp < this.cacheTimeout) {
                    return cached.data;
                }
            }

            const { data, error } = await this.client
                .from(this.tables.users)
                .select('*')
                .eq('id', userId)
                .single();

            if (error) throw error;

            // حفظ في الكاش
            this.cache.set(cacheKey, { data, timestamp: Date.now() });
            return data;
        } catch (error) {
            console.error('خطأ في جلب المستخدم:', error);
            return null;
        }
    }

    async updateUserProfile(userId, updates) {
        try {
            const sanitized = {};
            for (const [key, value] of Object.entries(updates)) {
                if (typeof value === 'string') {
                    sanitized[key] = this.security.sanitizeInput(value);
                } else {
                    sanitized[key] = value;
                }
            }

            sanitized.updated_at = new Date().toISOString();

            const { data, error } = await this.client
                .from(this.tables.users)
                .update(sanitized)
                .eq('id', userId)
                .select();

            if (error) throw error;

            // تحديث الكاش
            this.cache.delete(`user_${userId}`);
            return { success: true, data };
        } catch (error) {
            console.error('خطأ في تحديث الملف الشخصي:', error);
            return { success: false, error };
        }
    }

    // ============================================
    // 📦 إدارة المنتجات
    // ============================================

    async createProduct(productData, sellerId) {
        try {
            const product = {
                id: `prod_${this.security.generateSecureToken(12)}`,
                seller_id: sellerId,
                name: this.security.sanitizeInput(productData.name),
                description: this.security.sanitizeInput(productData.description),
                price: parseFloat(productData.price),
                discount_price: productData.discountPrice ? parseFloat(productData.discountPrice) : null,
                category: productData.category,
                images: productData.images || [],
                stock: parseInt(productData.stock),
                rating: 0,
                review_count: 0,
                status: 'active',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            const { data, error } = await this.client
                .from(this.tables.products)
                .insert([product])
                .select();

            if (error) throw error;
            this.invalidateCache('products');
            return { success: true, data };
        } catch (error) {
            console.error('خطأ في إنشاء المنتج:', error);
            return { success: false, error };
        }
    }

    async getProducts(filters = {}) {
        try {
            const cacheKey = `products_${JSON.stringify(filters)}`;
            if (this.cache.has(cacheKey)) {
                const cached = this.cache.get(cacheKey);
                if (Date.now() - cached.timestamp < this.cacheTimeout) {
                    return cached.data;
                }
            }

            let query = this.client.from(this.tables.products).select('*');

            if (filters.category) {
                query = query.eq('category', filters.category);
            }
            if (filters.sellerId) {
                query = query.eq('seller_id', filters.sellerId);
            }
            if (filters.status) {
                query = query.eq('status', filters.status);
            }

            const { data, error } = await query;
            if (error) throw error;

            this.cache.set(cacheKey, { data, timestamp: Date.now() });
            return data;
        } catch (error) {
            console.error('خطأ في جلب المنتجات:', error);
            return [];
        }
    }

    async updateProduct(productId, updates) {
        try {
            const sanitized = {
                ...updates,
                updated_at: new Date().toISOString()
            };

            const { data, error } = await this.client
                .from(this.tables.products)
                .update(sanitized)
                .eq('id', productId)
                .select();

            if (error) throw error;
            this.invalidateCache('products');
            return { success: true, data };
        } catch (error) {
            console.error('خطأ في تحديث المنتج:', error);
            return { success: false, error };
        }
    }

    // ============================================
    // 📋 إدارة الطلبات
    // ============================================

    async createOrder(orderData) {
        try {
            const order = {
                id: `order_${this.security.generateSecureToken(12)}`,
                customer_id: orderData.customerId,
                items: orderData.items,
                total_amount: parseFloat(orderData.totalAmount),
                status: 'pending',
                payment_status: 'pending',
                delivery_address: this.security.sanitizeInput(orderData.address),
                shipping_method: orderData.shippingMethod,
                tracking_number: null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            const { data, error } = await this.client
                .from(this.tables.orders)
                .insert([order])
                .select();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('خطأ في إنشاء الطلب:', error);
            return { success: false, error };
        }
    }

    async getOrders(customerId) {
        try {
            const { data, error } = await this.client
                .from(this.tables.orders)
                .select('*')
                .eq('customer_id', customerId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('خطأ في جلب الطلبات:', error);
            return [];
        }
    }

    // ============================================
    // ⭐ إدارة التقييمات والمراجعات
    // ============================================

    async addReview(reviewData) {
        try {
            const review = {
                id: `review_${this.security.generateSecureToken(12)}`,
                product_id: reviewData.productId,
                customer_id: reviewData.customerId,
                rating: Math.min(5, Math.max(1, parseInt(reviewData.rating))),
                comment: this.security.sanitizeInput(reviewData.comment || ''),
                verified_purchase: reviewData.verifiedPurchase || false,
                created_at: new Date().toISOString()
            };

            const { data, error } = await this.client
                .from(this.tables.reviews)
                .insert([review])
                .select();

            if (error) throw error;

            // تحديث متوسط التقييم للمنتج
            await this.updateProductRating(reviewData.productId);

            return { success: true, data };
        } catch (error) {
            console.error('خطأ في إضافة التقييم:', error);
            return { success: false, error };
        }
    }

    async getProductReviews(productId) {
        try {
            const { data, error } = await this.client
                .from(this.tables.reviews)
                .select('*')
                .eq('product_id', productId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('خطأ في جلب التقييمات:', error);
            return [];
        }
    }

    // ============================================
    // 🔧 وظائف مساعدة
    // ============================================

    async hashPassword(password) {
        // في الإنتاج، استخدم bcrypt أو similar
        const encoded = new TextEncoder().encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
        return btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
    }

    async updateProductRating(productId) {
        try {
            const reviews = await this.getProductReviews(productId);
            if (reviews.length === 0) return;

            const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

            await this.client
                .from(this.tables.products)
                .update({
                    rating: Math.round(avgRating * 10) / 10,
                    review_count: reviews.length
                })
                .eq('id', productId);
        } catch (error) {
            console.error('خطأ في تحديث التقييم:', error);
        }
    }

    invalidateCache(pattern) {
        for (const key of this.cache.keys()) {
            if (key.includes(pattern)) {
                this.cache.delete(key);
            }
        }
    }

    clearCache() {
        this.cache.clear();
    }

    // ============================================
    // 📊 التحليلات
    // ============================================

    async logAnalytics(event) {
        try {
            const analytics = {
                id: `analytics_${this.security.generateSecureToken(12)}`,
                event_type: event.type,
                user_id: event.userId || null,
                product_id: event.productId || null,
                data: event.data || {},
                timestamp: new Date().toISOString(),
                user_agent: navigator.userAgent
            };

            await this.client
                .from(this.tables.analytics)
                .insert([analytics]);
        } catch (error) {
            console.error('خطأ في تسجيل التحليلات:', error);
        }
    }

    async getAnalytics(startDate, endDate) {
        try {
            const { data, error } = await this.client
                .from(this.tables.analytics)
                .select('*')
                .gte('timestamp', startDate)
                .lte('timestamp', endDate);

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('خطأ في جلب التحليلات:', error);
            return [];
        }
    }
}

// تصدير الفئة
window.BODADatabaseManager = BODADatabaseManager;
