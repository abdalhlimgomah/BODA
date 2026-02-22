// ========== إدارة لوحة التحكم ==========

class DashboardManager {
    constructor() {
        this.userEmail = this.getCurrentUserEmail();
        this.products = this.loadProducts();
        this.owner = this.loadOwnerData();
        this.settings = this.loadSettings();
        this.init();
    }

    // ========== الحصول على البريد الحالي ==========
    getCurrentUserEmail() {
        // تفقد البائع الجديد أولاً
        const currentSellerEmail = localStorage.getItem('currentSellerEmail');
        if (currentSellerEmail) {
            return currentSellerEmail;
        }
        // ثم البريد العادي
        return localStorage.getItem('userEmail') || '';
    }

    init() {
        this.setupEventListeners();
        this.loadOwnerProfile();
        this.updateStats();
        this.loadThemeSettings();
        this.loadCurrencySettings();
        
        // تحديث الإحصائيات عند تفعيل الصفحة
        window.addEventListener('focus', () => {
            this.updateStats();
        });
    }

    // ========== إعداد المستمعين للأحداث ==========
    setupEventListeners() {
        // رفع صورة المالك
        document.getElementById('imageUpload').addEventListener('change', (e) => this.handleImageUpload(e));

        // تبديل الأقسام
        document.querySelectorAll('.menu-link').forEach(link => {
            if (link.getAttribute('data-section')) {
                link.addEventListener('click', (e) => this.switchSection(e));
            }
        });

        // نموذج إضافة منتج
        if (document.getElementById('addProductForm')) {
            document.getElementById('addProductForm').addEventListener('submit', (e) => this.handleAddProduct(e));
        }

        // تسجيل الخروج
        document.getElementById('logoutBtn').addEventListener('click', () => this.handleLogout());

        // نموذج الإعدادات
        if (document.getElementById('settingsForm')) {
            document.getElementById('settingsForm').addEventListener('submit', (e) => this.handleSettingsSubmit(e));
        }

        // نموذج العملة
        if (document.getElementById('currencyForm')) {
            document.getElementById('currencyForm').addEventListener('submit', (e) => this.handleCurrencySubmit(e));
        }

        // تبديل الوضع الليلي
        if (document.getElementById('themeToggle')) {
            document.getElementById('themeToggle').addEventListener('change', (e) => this.toggleTheme(e));
        }
    }

    // ========== التعامل مع رفع صورة المالك ==========
    handleImageUpload(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const imageData = e.target.result;
                document.getElementById('profileImage').src = imageData;
                
                // حفظ الصورة في LocalStorage
                this.owner.profileImage = imageData;
                this.saveOwnerData();
                
                this.showNotification('تم تحديث صورة المالك بنجاح', 'success');
            };
            reader.readAsDataURL(file);
        }
    }

    // ========== تحميل بيانات المالك ==========
    loadOwnerProfile() {
        const ownerName = document.getElementById('ownerName');
        const ownerEmail = document.getElementById('ownerEmail');
        const profileImage = document.getElementById('profileImage');

        ownerName.textContent = this.owner.name || 'اسم المالك';
        ownerEmail.textContent = this.owner.email || 'البريد الإلكتروني';
        
        if (this.owner.profileImage) {
            profileImage.src = this.owner.profileImage;
        }

        // تعبئة الإعدادات
        if (document.getElementById('storeName')) {
            document.getElementById('storeName').value = this.owner.name || '';
            document.getElementById('storeDescription').value = this.owner.description || '';
        }
    }

    // ========== تبديل الأقسام ==========
    switchSection(event) {
        event.preventDefault();
        
        // إزالة الفئة النشطة من جميع الروابط الداخلية فقط
        document.querySelectorAll('.menu-link[data-section]').forEach(link => {
            link.parentElement.classList.remove('active');
        });

        // إضافة الفئة النشطة للرابط الحالي
        event.currentTarget.parentElement.classList.add('active');

        // إخفاء جميع الأقسام
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });

        // إظهار القسم المختار
        const sectionId = event.currentTarget.getAttribute('data-section');
        const section = document.getElementById(sectionId);
        if (section) {
            section.classList.add('active');
            
            // تحميل البيانات الديناميكية
            if (sectionId === 'products') {
                this.loadProductsList();
            }
        }
    }

    // ========== التعامل مع إضافة منتج ==========
    handleAddProduct(event) {
        event.preventDefault();

        const productName = document.getElementById('productName').value;
        const productDescription = document.getElementById('productDescription').value;
        const productPrice = document.getElementById('productPrice').value;
        const productQuantity = document.getElementById('productQuantity').value;
        const productImageInput = document.getElementById('productImage');

        if (!productImageInput.files[0]) {
            this.showNotification('يرجى اختيار صورة المنتج', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const product = {
                id: Date.now(),
                name: productName,
                description: productDescription,
                price: parseFloat(productPrice),
                quantity: parseInt(productQuantity),
                image: e.target.result,
                createdAt: new Date().toLocaleString('ar-SA')
            };

            this.products.push(product);
            this.saveProducts();
            this.updateStats();
            this.loadProductsList();

            // إعادة تعيين النموذج
            document.getElementById('addProductForm').reset();
            this.showNotification('تم إضافة المنتج بنجاح', 'success');

            // الانتقال إلى قسم المنتجات
            // setTimeout(() => {
            //     document.querySelector('[data-section="products"]').click();
            // }, 500);
        };
        reader.readAsDataURL(productImageInput.files[0]);
    }

    // ========== تحميل قائمة المنتجات ==========
    loadProductsList() {
        const productsList = document.getElementById('productsList');
        
        // الحصول على بريد المستخدم (يستخدم البائع الحالي أو userEmail العادي)
        const userEmail = this.userEmail;
        const sellerProductsKey = `seller_products_${userEmail}`;
        const sellerProducts = JSON.parse(localStorage.getItem(sellerProductsKey) || '[]');
        
        if (sellerProducts.length === 0) {
            productsList.innerHTML = '<p class="empty-message">لا توجد منتجات حالياً</p>';
            return;
        }

        productsList.innerHTML = sellerProducts.map(product => `
            <div class="product-card">
                <img src="${product.images && product.images[0] ? product.images[0] : 'https://via.placeholder.com/200'}" alt="${product.name}" class="product-image">
                <div class="product-info">
                    <div class="product-name">${product.name}</div>
                    <div class="product-description">${product.description ? product.description.substring(0, 50) : 'بدون وصف'}...</div>
                    <div class="product-price">${product.price.toFixed(2)} ${this.getCurrencySymbol()}</div>
                    <div style="font-size: 13px; color: #7f8c8d; margin-bottom: 15px;">
                        <strong>الكمية:</strong> ${product.stock || product.quantity || 0}
                    </div>
                    <div class="product-actions">
                        <button class="btn-secondary" onclick="dashboardManager.deleteProductFromDashboard('${product.id}')">
                            <i class="fas fa-trash"></i> حذف
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // ========== تحميل قائمة الطلبات ==========
    loadOrdersList() {
        // الطلبات الآن في صفحة منفصلة shacksd.html
        // بقاء الدالة للتوافق
        console.log('الطلبات موجودة في صفحة منفصلة');
    }

    // ========== حذف منتج ==========
    deleteProductFromDashboard(productId) {
        if (confirm('هل أنت متأكد من حذف هذا المنتج؟')) {
            const userEmail = localStorage.getItem('userEmail');
            const sellerProductsKey = `seller_products_${userEmail}`;
            
            let sellerProducts = JSON.parse(localStorage.getItem(sellerProductsKey) || '[]');
            sellerProducts = sellerProducts.filter(p => p.id !== productId);
            
            localStorage.setItem(sellerProductsKey, JSON.stringify(sellerProducts));
            
            // تحديث البيانات والإحصائيات
            this.updateStats();
            this.loadProductsList();
            this.showNotification('تم حذف المنتج بنجاح', 'success');
        }
    }
    
    deleteProduct(productId) {
        if (confirm('هل أنت متأكد من حذف هذا المنتج؟')) {
            this.products = this.products.filter(p => p.id !== productId);
            this.saveProducts();
            this.updateStats();
            this.loadProductsList();
            this.showNotification('تم حذف المنتج بنجاح', 'success');
        }
    }

    // ========== تعديل منتج ==========
    editProduct(productId) {
        alert('سيتم تطوير وظيفة التعديل قريباً');
    }

    // ========== تحديث الإحصائيات ==========
    updateStats() {
        // الحصول على بريد المستخدم (يستخدم البائع الحالي أو userEmail العادي)
        const userEmail = this.userEmail;
        
        // 1. حساب عدد المنتجات من seller_products
        const sellerProductsKey = `seller_products_${userEmail}`;
        const sellerProducts = JSON.parse(localStorage.getItem(sellerProductsKey) || '[]');
        const productCount = sellerProducts.length;
        
        // 2. حساب الطلبات والمبيعات والإيرادات
        const sellerOrdersKey = `seller_orders`;
        const allOrders = JSON.parse(localStorage.getItem(sellerOrdersKey) || '[]');
        
        // تصفية الطلبات للبائع الحالي فقط (حالة الطلب = تم التوصيل)
        const completedOrders = allOrders.filter(order => {
            return order.seller_email === userEmail && order.status === 'delivered';
        });
        
        // حساب إجمالي الطلبات (جميع الحالات)
        const totalOrders = allOrders.filter(order => order.seller_email === userEmail).length;
        
        // حساب المبيعات من الطلبات المسلّمة فقط
        const totalSales = completedOrders.reduce((sum, order) => {
            return sum + (order.total || 0);
        }, 0);
        
        // الإيرادات (نفس المبيعات أو يمكن تطبيق نسبة%)
        const totalRevenue = totalSales;
        
        const currencySymbol = this.getCurrencySymbol();

        document.getElementById('productCount').textContent = productCount;
        document.getElementById('orderCount').textContent = totalOrders;
        document.getElementById('salesAmount').textContent = totalSales.toFixed(2) + ' ' + currencySymbol;
        document.getElementById('revenueAmount').textContent = totalRevenue.toFixed(2) + ' ' + currencySymbol;
    }

    // ========== التعامل مع إرسال الإعدادات ==========
    handleSettingsSubmit(event) {
        event.preventDefault();

        this.owner.name = document.getElementById('storeName').value;
        this.owner.description = document.getElementById('storeDescription').value;
        this.owner.email = document.getElementById('storeDescription').value || this.owner.email;

        this.saveOwnerData();
        this.loadOwnerProfile();
        this.showNotification('تم حفظ الإعدادات بنجاح', 'success');
    }

    // ========== التعامل مع تسجيل الخروج ==========
    handleLogout() {
        if (confirm('هل تريد تسجيل الخروج؟')) {
            localStorage.removeItem('dashboardProducts');
            localStorage.removeItem('dashboardOwner');
            window.location.href = '../pages/login.html';
        }
    }

    // ========== حفظ وتحميل البيانات ==========
    saveProducts() {
        localStorage.setItem('dashboardProducts', JSON.stringify(this.products));
    }

    loadProducts() {
        const data = localStorage.getItem('dashboardProducts');
        return data ? JSON.parse(data) : [];
    }

    saveOwnerData() {
        localStorage.setItem('dashboardOwner', JSON.stringify(this.owner));
    }

    loadOwnerData() {
        const data = localStorage.getItem('dashboardOwner');
        return data ? JSON.parse(data) : {
            name: 'اسم المالك',
            email: 'البريد الإلكتروني',
            description: '',
            profileImage: null
        };
    }

    loadOrders() {
        const data = localStorage.getItem('orders') || '[]';
        return JSON.parse(data);
    }

    saveSettings() {
        localStorage.setItem('dashboardSettings', JSON.stringify(this.settings));
    }

    loadSettings() {
        const data = localStorage.getItem('dashboardSettings');
        return data ? JSON.parse(data) : {
            theme: 'light',
            currency: 'EGP'
        };
    }

    // ========== إدارة العملة ==========
    getCurrencySymbol() {
        const currency = this.settings.currency || 'EGP';
        const symbols = {
            'EGP': 'ج.م',
            'USD': '$',
            'EUR': '€',
            'SAR': 'ر.س',
            'AED': 'd.إ',
            'KWD': 'd.k',
            'QAR': 'r.q',
            'BHD': 'd.b',
            'OMR': 'r.o',
            'JOD': 'd.a',
            'LBP': 'l.l',
            'SYP': 'l.s'
        };
        return symbols[currency] || 'ج.م';
    }

    handleCurrencySubmit(event) {
        event.preventDefault();
        const currency = document.getElementById('currencySelect').value;
        this.settings.currency = currency;
        this.saveSettings();
        this.updateStats();
        this.loadProductsList();
        this.showNotification('تم تحديث العملة بنجاح', 'success');
    }

    loadCurrencySettings() {
        const currencySelect = document.getElementById('currencySelect');
        if (currencySelect) {
            currencySelect.value = this.settings.currency || 'EGP';
        }
    }

    // ========== إدارة الوضع الليلي ==========
    loadThemeSettings() {
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            const isDarkMode = this.settings.theme === 'dark';
            themeToggle.checked = isDarkMode;
            if (isDarkMode) {
                document.body.classList.add('dark-mode');
            }
        }
    }

    toggleTheme(event) {
        const isDarkMode = event.target.checked;
        this.settings.theme = isDarkMode ? 'dark' : 'light';
        this.saveSettings();

        if (isDarkMode) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }

        this.showNotification(isDarkMode ? 'تم تفعيل الوضع الليلي' : 'تم تعطيل الوضع الليلي', 'info');
    }

    // ========== إظهار الإشعارات ==========
    showNotification(message, type = 'info') {
        // البحث عن حاوية الإشعارات أو إنشاء واحدة
        let notificationContainer = document.getElementById('notificationContainer');
        if (!notificationContainer) {
            notificationContainer = document.createElement('div');
            notificationContainer.id = 'notificationContainer';
            notificationContainer.style.cssText = `
                position: fixed;
                top: 20px;
                left: 20px;
                z-index: 9999;
                display: flex;
                flex-direction: column;
                gap: 10px;
            `;
            document.body.appendChild(notificationContainer);
        }

        const notification = document.createElement('div');
        const colors = {
            success: '#27ae60',
            error: '#e74c3c',
            info: '#3498db',
            warning: '#f39c12'
        };

        notification.style.cssText = `
            background-color: ${colors[type]};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
            animation: slideIn 0.3s ease;
            min-width: 300px;
        `;

        notification.textContent = message;
        notificationContainer.appendChild(notification);

        // إضافة الرسم المتحرك
        const style = document.createElement('style');
        if (!document.getElementById('notificationStyles')) {
            style.id = 'notificationStyles';
            style.textContent = `
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
            `;
            document.head.appendChild(style);
        }

        // إزالة الإشعار بعد 3 ثوانٍ
        setTimeout(() => {
            notification.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// ========== تهيئة مدير اللوحة عند تحميل الصفحة ==========
let dashboardManager;
document.addEventListener('DOMContentLoaded', () => {
    dashboardManager = new DashboardManager();
    
    // معالجة البيانات التجريبية (اختياري)
    initializeSampleData();
});

// ========== بيانات تجريبية للاختبار ==========
function initializeSampleData() {
    const existingProducts = localStorage.getItem('dashboardProducts');
    if (!existingProducts) {
        // عدم إضافة بيانات تجريبية - اترك للمستخدم إضافة المنتجات
        console.log('اللوحة جاهزة للاستخدام');
    }
}
