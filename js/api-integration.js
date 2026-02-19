/**
 * BODA E-Commerce Platform
 * Frontend-Backend Integration
 */

const BODA_API_CONFIG = {
    // Dynamically determine base path
    getBaseURL: () => {
        const path = window.location.pathname;
        // من صفحات pages أو login/register
        if (path.includes('/pages/') || path.includes('/login.html') || path.includes('/register.html')) {
            return '..';
        }
        return '.';
    },
    
    endpoints: {
        // Authentication
        auth: {
            register: '/api/auth.php?action=register',
            login: '/api/auth.php?action=login',
            logout: '/api/auth.php?action=logout',
            checkSession: '/api/auth.php?action=check_session'
        },
        
        // Orders
        orders: {
            send: '/api/send-order.php?action=send_complete_order',
            status: '/api/send-order.php?action=get_order_status',
            list: '/api/send-order.php?action=get_user_orders'
        }
    },
    
    timeout: 30000
};

class BODAAPIClient {
    constructor(config = BODA_API_CONFIG) {
        this.basePath = config.getBaseURL();
        this.timeout = config.timeout;
        this.csrfToken = localStorage.getItem('csrfToken') || null;
        this.useMockAPI = false; // تعطيل Mock API واستخدام Supabase
    }

    async request(method, endpoint, data = null) {
        // إذا كنا نستخدم Supabase للتوثيق
        if (endpoint.includes('auth')) {
            return await this.requestSupabase(endpoint, data);
        }

        // وإلا استخدم الطريقة العادية
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
        const url = `${this.basePath}/${cleanEndpoint}`;
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        };

        if (this.csrfToken) {
            options.headers['X-CSRF-Token'] = this.csrfToken;
        }

        if (data && (method === 'POST' || method === 'PUT')) {
            options.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(url, options);
            const responseData = await response.json();

            if (responseData.csrfToken) {
                this.csrfToken = responseData.csrfToken;
                localStorage.setItem('csrfToken', this.csrfToken);
            }

            if (!response.ok) {
                throw {
                    status: response.status,
                    message: responseData.message || 'Error occurred'
                };
            }

            return responseData;

        } catch (error) {
            console.error('[API Error]:', error);
            throw error;
        }
    }

    async requestSupabase(endpoint, data = null) {
        if (!window.supabaseClient) {
            throw new Error('Supabase client not initialized');
        }

        const supabase = window.supabaseClient;

        if (endpoint.includes('login')) {
            // مسح أي بيانات سابقة
            this.clearSessionData();

            // محاولة تسجيل الدخول
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email: data.email,
                password: data.password
            });

            if (authError) {
                // رسالة خطأ توحي بأنه قد لا يكون لديه حساب
                return {
                    status: 'error',
                    message: 'فشل تسجيل الدخول. تأكد من أن لديك حساباً بالفعل في قاعدة البيانات، أو أن كلمة المرور صحيحة.',
                    data: []
                };
            }

            // تحديث بيانات الجلسة
            this.setSessionData(authData.user);

            const fullName = authData.user.user_metadata?.full_name || authData.user.email.split('@')[0];

            return {
                status: 'success',
                message: 'تم تسجيل الدخول بنجاح',
                data: {
                    name: fullName,
                    email: authData.user.email,
                    id: authData.user.id
                }
            };

        } else if (endpoint.includes('register')) {
            // مسح أي بيانات سابقة
            this.clearSessionData();

            // إنشاء حساب في Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: data.email,
                password: data.password,
                options: {
                    data: {
                        full_name: data.fullName
                    }
                }
            });

            if (authError) {
                return {
                    status: 'error',
                    message: authError.message,
                    data: []
                };
            }

            // تحديث بيانات الجلسة
            this.setSessionData(authData.user);

            return {
                status: 'success',
                message: 'تم التسجيل بنجاح',
                data: {
                    name: data.fullName,
                    email: data.email,
                    id: authData.user.id
                }
            };

        } else if (endpoint.includes('logout')) {
            await supabase.auth.signOut();
            this.clearSessionData();
            return { status: 'success', message: 'تم تسجيل الخروج' };
        } else if (endpoint.includes('check_session')) {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                return {
                    status: 'success',
                    data: {
                        name: session.user.user_metadata?.full_name || session.user.email.split('@')[0],
                        email: session.user.email,
                        id: session.user.id
                    }
                };
            }
            return { status: 'error', message: 'No session' };
        }

        return { status: 'error', message: 'Supabase endpoint not handled' };
    }

    setSessionData(authUser, dbUser = {}) {
        const name = dbUser.fullName || dbUser.name || authUser.user_metadata?.full_name || authUser.email;
        localStorage.setItem('userEmail', authUser.email);
        localStorage.setItem('userFullName', name);
        localStorage.setItem('isLoggedIn', 'true');
        
        sessionStorage.setItem('user_id', authUser.id);
        sessionStorage.setItem('user_name', name);
        sessionStorage.setItem('user_email', authUser.email);
        sessionStorage.setItem('user_role', dbUser.role || 'customer');
    }

    clearSessionData() {
        // مسح بيانات المستخدم والجلسة فقط مع الاحتفاظ بالسلة إذا كانت مرغوبة
        // ولكن بناءً على طلب المستخدم "بيانات الحساب القديم مترجعش" سنقوم بمسح السلة أيضاً
        // لضمان عدم تداخل البيانات بين الحسابات
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userFullName');
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('cart'); 
        localStorage.removeItem('orders');
        localStorage.removeItem('wishlist');
        
        sessionStorage.clear();
        
        // إشعار النظام بتغيير الحالة
        document.dispatchEvent(new CustomEvent('sessionCleared'));
    }

    async requestMock(endpoint, data = null) {
        // معالجة طلبات Mock API
        if (endpoint.includes('login')) {
            return await mockAPI.login(data.email, data.password);
        } else if (endpoint.includes('register')) {
            return await mockAPI.register(data);
        } else if (endpoint.includes('logout')) {
            return await mockAPI.logout();
        } else if (endpoint.includes('check_session')) {
            return await mockAPI.checkSession();
        } else {
            return {
                status: 'error',
                message: 'Endpoint not found',
                data: []
            };
        }
    }

    // Authentication Methods
    async login(email, password) {
        return await this.request('POST', BODA_API_CONFIG.endpoints.auth.login, { email, password });
    }

    async register(userData) {
        return await this.request('POST', BODA_API_CONFIG.endpoints.auth.register, userData);
    }

    async logout() {
        return await this.request('POST', BODA_API_CONFIG.endpoints.auth.logout);
    }

    async checkSession() {
        return await this.request('GET', BODA_API_CONFIG.endpoints.auth.checkSession);
    }

    async loginWithGoogle(redirectTo = null) {
        if (!window.supabaseClient) {
            return { status: 'error', message: 'Supabase client not initialized' };
        }
        const supabase = window.supabaseClient;
        const redirectUrl = redirectTo || `${window.location.origin}${window.location.pathname}`;
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: redirectUrl }
        });
        if (error) {
            return { status: 'error', message: error.message, data: [] };
        }
        return { status: 'success', data };
    }

    // Order Methods
    async sendOrder(orderData, email) {
        return await this.request('POST', BODA_API_CONFIG.endpoints.orders.send, {
            email,
            order: orderData
        });
    }

    async getUserOrders() {
        return await this.request('GET', BODA_API_CONFIG.endpoints.orders.list);
    }
}

const bodaAPI = new BODAAPIClient();
