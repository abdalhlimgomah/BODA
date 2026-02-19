/**
 * Products Manager Pro - Comprehensive Dashboard Logic with Supabase Integration
 */
class ProductsManager {
    constructor() {
        this.userEmail = null;
        this.products = [];
        this.orders = [];
        this.uploadedImages = [];
        this.currentSection = 'overview';
        this.editingProductId = null;
        this.pausedProducts = [];
        this.supabase = null;
        this.init();
    }

    async init() {
        // Initialize Supabase client
        if (window.supabaseClient) {
            this.supabase = window.supabaseClient;
        }
        
        if (window.bodaSession && bodaSession.isLoggedIn) {
            this.run();
        } else {
            document.addEventListener('sessionReady', () => this.run(), { once: true });
        }
    }

    async run() {
        if (!this.checkAuth()) return;
        
        this.userEmail = localStorage.getItem('userEmail');
        this.loadPausedProducts();
        await this.loadDataFromSupabase();
        this.setupEventListeners();
        this.loadProfile();
        this.loadSettings();
        this.updateStats();
        this.renderRecentProducts();
        this.renderProductsTable();
        this.renderOrdersTable();
        this.notifyNewOrders();
        this.handleInitialSection();
    }

    checkAuth() {
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        if (!isLoggedIn) {
            window.location.href = 'login.html';
            return false;
        }
        return true;
    }

    async loadDataFromSupabase() {
        try {
            if (!this.supabase) {
                console.warn('Supabase not initialized, using localStorage fallback');
                this.loadDataFromLocal();
                return;
            }

            // Load products from Supabase
            const { data: products, error: productsError } = await this.supabase
                .from('products')
                .select('*')
                .eq('seller_email', this.userEmail);
            
            if (productsError) throw productsError;
            
            this.products = (products || []).map(p => ({
                id: p.id,
                name: p.name,
                category: p.category,
                price: p.price,
                stock: p.stock,
                description: p.description,
                images: p.images || [],
                sellerEmail: p.seller_email,
                createdAt: p.created_at,
                sales: p.sales || 0,
                discountPrice: p.discount_price || null,
                stockStatus: p.stock_status || (p.stock > 0 ? 'in_stock' : 'out_of_stock')
            }));

            // Load orders from Supabase
            const { data: orders, error: ordersError } = await this.supabase
                .from('orders')
                .select('*')
                .eq('seller_email', this.userEmail);
            
            if (ordersError) throw ordersError;
            
            this.orders = (orders || []).map(o => ({
                id: o.id,
                customerName: o.customer_name,
                customerEmail: o.customer_email,
                total: o.total,
                status: o.status,
                createdAt: o.created_at,
                items: o.items || [],
                address: o.address,
                sellerEmail: o.seller_email
            }));

        } catch (error) {
            console.error('Error loading data from Supabase:', error);
            this.loadDataFromLocal();
        }
    }

    loadDataFromLocal() {
        const pKey = `seller_products_${this.userEmail}`;
        this.products = JSON.parse(localStorage.getItem(pKey) || '[]').map(p => ({
            ...p,
            discountPrice: p.discountPrice || null,
            stockStatus: p.stockStatus || (p.stock > 0 ? 'in_stock' : 'out_of_stock')
        }));

        const sellerOrders = JSON.parse(localStorage.getItem('seller_orders') || '[]');
        if (Array.isArray(sellerOrders) && sellerOrders.length > 0) {
            this.orders = sellerOrders.filter(o => o.sellerEmail === this.userEmail);
        } else {
            const allOrders = JSON.parse(localStorage.getItem('orders') || '[]');
            const derived = this.buildSellerOrdersFromCustomerOrders(allOrders);
            this.orders = derived.filter(o => o.sellerEmail === this.userEmail);
        }
    }

    async saveProducts() {
        try {
            if (!this.supabase) {
                this.saveProductsLocal();
                return;
            }

            // Save/update each product in Supabase
            for (const product of this.products) {
                const { id, name, category, price, stock, description, images, sales, createdAt, discountPrice, stockStatus } = product;
                
                const { error } = await this.supabase
                    .from('products')
                    .upsert({
                        id: id,
                        name: name,
                        category: category,
                        price: price,
                        stock: stock,
                        description: description,
                        images: images || [],
                        seller_email: this.userEmail,
                        sales: sales || 0,
                        discount_price: discountPrice || null,
                        stock_status: stockStatus || (stock > 0 ? 'in_stock' : 'out_of_stock'),
                        created_at: createdAt || new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'id' });

                if (error) {
                    console.error('Error saving product:', error);
                    throw error;
                }
            }
            this.syncGlobalProducts();
        } catch (error) {
            console.error('Error in saveProducts:', error);
            alert('خطأ في حفظ المنتج. سيتم الحفظ محلياً.');
            this.saveProductsLocal();
        }
    }

    saveProductsLocal() {
        const key = `seller_products_${this.userEmail}`;
        localStorage.setItem(key, JSON.stringify(this.products));
        this.syncGlobalProducts();
    }

    syncGlobalProducts() {
        let allProducts = JSON.parse(localStorage.getItem('boda_all_products') || '[]');
        allProducts = allProducts.filter(p => p.sellerEmail !== this.userEmail);
        
        const storeReady = this.products.map(p => ({
            id: p.id,
            name: p.name,
            price: p.price,
            category: p.category,
            image: p.images[0],
            images: p.images,
            description: p.description,
            sellerEmail: p.sellerEmail,
            discountPrice: p.discountPrice || null,
            originalPrice: p.discountPrice ? p.price : null,
            stockStatus: this.isProductPaused(p.id) ? 'out_of_stock' : (p.stockStatus || (p.stock > 0 ? 'in_stock' : 'out_of_stock'))
        }));
        
        localStorage.setItem('boda_all_products', JSON.stringify([...allProducts, ...storeReady]));
    }

    loadProfile() {
        if (document.getElementById('display-user-email')) 
            document.getElementById('display-user-email').textContent = this.userEmail;
        
        const savedAvatar = localStorage.getItem(`avatar_${this.userEmail}`);
        if (document.getElementById('user-avatar')) {
            if (savedAvatar) {
                document.getElementById('user-avatar').src = savedAvatar;
            } else {
                document.getElementById('user-avatar').src = this.getDefaultAvatar();
            }
        }

        const profile = JSON.parse(localStorage.getItem(`seller_profile_${this.userEmail}`) || '{}');
        const shopName = localStorage.getItem(`shop_name_${this.userEmail}`) || profile.businessName || 'البائع';
        const sellerName = profile.sellerName || '';
        if (document.getElementById('display-user-name')) {
            document.getElementById('display-user-name').textContent = shopName || sellerName || 'البائع';
        }
    }

    setupEventListeners() {
        // Sidebar Navigation
        document.querySelectorAll('.nav-link[data-section]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchSection(link.dataset.section);
            });
        });

        // Profile Avatar
        document.getElementById('profile-trigger')?.addEventListener('click', () => 
            document.getElementById('avatar-input').click());
        document.getElementById('avatar-input')?.addEventListener('change', (e) => 
            this.handleAvatarChange(e.target.files[0]));

        // Image Upload (Multiple)
        document.getElementById('upload-trigger')?.addEventListener('click', (e) => {
            if (e.target.id !== 'image-input') {
                document.getElementById('image-input').click();
            }
        });

        document.getElementById('image-input')?.addEventListener('change', (e) => 
            this.handleImageFiles(e.target.files));

        // Forms
        document.getElementById('add-product-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleFormSubmit(e.target);
        });

        document.querySelectorAll('#add-product-form input, #add-product-form select, #add-product-form textarea').forEach(field => {
            field.addEventListener('input', () => {
                this.updateDiscountInfo();
                this.updateProductPreview();
            });
            field.addEventListener('change', () => {
                this.updateDiscountInfo();
                this.updateProductPreview();
            });
        });

        document.getElementById('add-product-form')?.addEventListener('reset', () => {
            this.editingProductId = null;
            this.uploadedImages = [];
            this.renderImagePreviews();
            document.getElementById('page-title').textContent = 'إضافة منتج جديد';
            this.updateProductPreview(true);
        });

        document.getElementById('settings-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveSettings();
        });

        document.getElementById('logout-btn')?.addEventListener('click', () => {
            if (confirm('هل تريد تسجيل الخروج؟')) {
                localStorage.removeItem('isLoggedIn');
                window.location.href = '../index.html';
            }
        });

        // Mobile Menu Toggle
        const menuToggle = document.getElementById('menu-toggle');
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        const closeBtn = document.getElementById('close-sidebar');

        const toggleSidebar = () => {
            sidebar.classList.toggle('show');
            overlay.classList.toggle('active');
            if (menuToggle) {
                const icon = menuToggle.querySelector('i');
                if (sidebar.classList.contains('show')) {
                    icon.className = 'fas fa-times';
                } else {
                    icon.className = 'fas fa-bars';
                }
            }
        };

        menuToggle?.addEventListener('click', toggleSidebar);
        overlay?.addEventListener('click', toggleSidebar);
        closeBtn?.addEventListener('click', toggleSidebar);
        
        // Settings Data Load
        this.loadSettings();
    }

    loadSettings() {
        const shopName = localStorage.getItem(`shop_name_${this.userEmail}`) || 'متجري الجديد';
        const shopDesc = localStorage.getItem(`shop_desc_${this.userEmail}`) || '';
        const profile = JSON.parse(localStorage.getItem(`seller_profile_${this.userEmail}`) || '{}');
        if (document.getElementById('shop-name-input')) document.getElementById('shop-name-input').value = shopName;
        if (document.getElementById('shop-email-input')) document.getElementById('shop-email-input').value = this.userEmail;
        if (document.getElementById('shop-desc-input')) document.getElementById('shop-desc-input').value = shopDesc;
        if (document.getElementById('seller-name-input')) document.getElementById('seller-name-input').value = profile.sellerName || '';
        if (document.getElementById('seller-phone-input')) document.getElementById('seller-phone-input').value = profile.phone || '';
    }

    switchSection(sectionId) {
        this.currentSection = sectionId;
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        
        document.getElementById(sectionId)?.classList.add('active');
        document.querySelector(`.nav-link[data-section="${sectionId}"]`)?.classList.add('active');

        // Close sidebar on mobile after selection
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        const menuToggle = document.getElementById('menu-toggle');
        if (sidebar?.classList.contains('show')) {
            sidebar.classList.remove('show');
            overlay?.classList.remove('active');
            if (menuToggle) menuToggle.querySelector('i').className = 'fas fa-bars';
        }
        
        const titles = {
            'overview': 'نظرة عامة',
            'my-products': 'إدارة المنتجات',
            'add-product': this.editingProductId ? 'تعديل المنتج' : 'إضافة منتج جديد',
            'orders': 'طلبات العملاء',
            'settings': 'إعدادات المتجر'
        };
        document.getElementById('page-title').textContent = titles[sectionId] || 'لوحة التحكم';

        if (sectionId === 'my-products') this.renderProductsTable();
        if (sectionId === 'overview') {
            this.updateStats();
            this.renderRecentProducts();
        }
        if (sectionId === 'orders') this.renderOrdersTable();
    }

    handleInitialSection() {
        const hash = window.location.hash.replace('#', '');
        const validSections = ['overview', 'my-products', 'add-product', 'orders', 'settings'];
        if (validSections.includes(hash)) {
            this.switchSection(hash);
        }
    }

    handleAvatarChange(file) {
        if (!file) return;
        if (!file.type || !file.type.startsWith('image/')) {
            alert('يرجى اختيار صورة صحيحة');
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = e.target.result;
            localStorage.setItem(`avatar_${this.userEmail}`, data);
            if (document.getElementById('user-avatar')) document.getElementById('user-avatar').src = data;
        };
        reader.readAsDataURL(file);
    }

    async handleImageFiles(files) {
        const fileList = Array.from(files);
        if (this.uploadedImages.length + fileList.length > 6) {
            alert('يمكنك تحميل 6 صور كحد أقصى');
            return;
        }

        for (const file of fileList) {
            const reader = new FileReader();
            reader.onload = async (e) => {
                // Store image data (will be uploaded to Supabase with product)
                this.uploadedImages.push({
                    data: e.target.result,
                    filename: `${Date.now()}_${file.name}`
                });
                this.renderImagePreviews();
            };
            reader.readAsDataURL(file);
        }
    }

    renderImagePreviews() {
        const grid = document.getElementById('image-preview-grid');
        if (!grid) return;
        grid.innerHTML = this.uploadedImages.map((img, idx) => {
            const src = typeof img === 'string' ? img : img.data;
            return `
                <div class="preview-item">
                    <img src="${src}">
                    <button type="button" class="remove-img" onclick="window.productsManager.removeImage(${idx})">×</button>
                </div>
            `;
        }).join('');
        this.updateProductPreview();
        this.updateDiscountInfo();
    }

    removeImage(index) {
        this.uploadedImages.splice(index, 1);
        this.renderImagePreviews();
    }

    async handleFormSubmit(form) {
        if (this.uploadedImages.length === 0) {
            alert('يرجى إضافة صورة واحدة على الأقل');
            return;
        }

        const name = form.productName.value.trim();
        const description = form.description.value.trim();
        const priceValue = parseFloat(form.price.value);
        const discountValue = parseFloat(form.discountPrice.value || 0);
        const stockValue = parseInt(form.stock.value, 10);
        const statusValue = form.stockStatus?.value || 'in_stock';

        if (name.length < 3) {
            alert('اسم المنتج يجب أن يكون 3 أحرف على الأقل');
            return;
        }

        if (!priceValue || priceValue <= 0) {
            alert('يرجى إدخال سعر صحيح');
            return;
        }

        if (!Number.isInteger(stockValue) || stockValue < 0) {
            alert('يرجى إدخال كمية صحيحة');
            return;
        }

        if (discountValue && discountValue >= priceValue) {
            alert('سعر الخصم يجب أن يكون أقل من السعر الأصلي');
            return;
        }

        if (description.length < 20) {
            alert('وصف المنتج يجب أن يكون 20 حرفًا على الأقل');
            return;
        }

        try {
            let existingProduct = this.editingProductId ? this.products.find(p => p.id === this.editingProductId) : null;

            // Prepare image URLs (they're stored as base64 or URLs)
            const imageUrls = this.uploadedImages.map(img => {
                if (typeof img === 'string') {
                    return img; // Already a URL
                } else if (img.data) {
                    return img.data; // Base64 data
                }
                return img;
            });

            const data = {
                id: this.editingProductId || 'prod_' + Date.now(),
                name: name,
                category: form.category.value,
                price: priceValue,
                discountPrice: discountValue || null,
                stock: stockValue,
                stockStatus: statusValue,
                description: description,
                images: imageUrls,
                sellerEmail: this.userEmail,
                createdAt: existingProduct ? existingProduct.createdAt : new Date().toISOString(),
                sales: existingProduct ? existingProduct.sales : 0
            };

            if (statusValue === 'out_of_stock') {
                if (!this.pausedProducts.includes(data.id)) {
                    this.pausedProducts.push(data.id);
                }
            } else {
                this.pausedProducts = this.pausedProducts.filter(pid => pid !== data.id);
            }
            this.savePausedProducts();

            if (this.editingProductId) {
                const idx = this.products.findIndex(p => p.id === this.editingProductId);
                if (idx !== -1) this.products[idx] = data;
                this.editingProductId = null;
            } else {
                this.products.push(data);
            }

            await this.saveProducts();
            alert('تم حفظ المنتج بنجاح!');
            form.reset();
            this.uploadedImages = [];
            this.renderImagePreviews();
            this.updateProductPreview(true);
            this.switchSection('my-products');
        } catch (error) {
            console.error('Error submitting form:', error);
            alert('خطأ في حفظ المنتج');
        }
    }

    renderProductsTable() {
        const tbody = document.getElementById('products-table-body');
        if (!tbody) return;

        if (this.products.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 3rem;">لا توجد منتجات</td></tr>';
            return;
        }

        tbody.innerHTML = this.products.map(p => {
            const isPaused = this.isProductPaused(p.id);
            const effectiveStatus = p.stockStatus || (p.stock > 0 ? 'in_stock' : 'out_of_stock');
            const statusText = isPaused ? 'موقوف' : (effectiveStatus === 'in_stock' ? 'نشط' : 'غير متوفر');
            const statusClass = isPaused ? 'status-stockout' : (effectiveStatus === 'in_stock' ? 'status-active' : 'status-stockout');
            return `
            <tr>
                <td data-label="المنتج">
                    <div class="product-cell">
                        <img src="${(p.images && p.images[0]) ? p.images[0] : this.getDefaultAvatar()}" alt="">
                        <span>${p.name}</span>
                    </div>
                </td>
                <td data-label="التصنيف">${p.category}</td>
                <td data-label="السعر">${p.price} EGP</td>
                <td data-label="الكمية">${p.stock}</td>
                <td data-label="الحالة"><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td data-label="إجراءات">
                    <div style="display:flex; gap:10px;">
                        <button class="btn" style="padding:5px 12px; background:rgba(0,212,255,0.1); color:var(--primary);" onclick="window.productsManager.editProduct('${p.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn" style="padding:5px 12px; background:rgba(255,204,0,0.15); color:var(--warning);" onclick="window.productsManager.toggleProductPause('${p.id}')">
                            <i class="fas ${isPaused ? 'fa-play' : 'fa-pause'}"></i>
                        </button>
                        <button class="btn" style="padding:5px 12px; background:rgba(255,77,77,0.1); color:var(--danger);" onclick="window.productsManager.deleteProduct('${p.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;}).join('');
    }

    editProduct(id) {
        const p = this.products.find(item => item.id === id);
        if (!p) return;
        
        this.editingProductId = id;
        this.switchSection('add-product');
        
        const form = document.getElementById('add-product-form');
        form.productName.value = p.name;
        form.category.value = p.category;
        form.price.value = p.price;
        form.discountPrice.value = p.discountPrice || '';
        form.stock.value = p.stock;
        if (form.stockStatus) form.stockStatus.value = p.stockStatus || (p.stock > 0 ? 'in_stock' : 'out_of_stock');
        form.description.value = p.description;
        
        // Convert image URLs back to the format expected
        this.uploadedImages = (p.images || []).map(img => typeof img === 'string' ? img : img.data);
        this.renderImagePreviews();
        this.updateProductPreview();
        this.updateDiscountInfo();
        
        // Update page title
        document.getElementById('page-title').textContent = 'تعديل المنتج';
    }

    async deleteProduct(id) {
        if (confirm('حذف هذا المنتج؟')) {
            try {
                if (this.supabase) {
                    const { error } = await this.supabase
                        .from('products')
                        .delete()
                        .eq('id', id);
                    
                    if (error) throw error;
                }
                
                this.products = this.products.filter(p => p.id !== id);
                await this.saveProducts();
                this.renderProductsTable();
                alert('تم حذف المنتج بنجاح');
            } catch (error) {
                console.error('Error deleting product:', error);
                alert('خطأ في حذف المنتج');
            }
        }
    }

    toggleProductPause(id) {
        if (this.isProductPaused(id)) {
            this.pausedProducts = this.pausedProducts.filter(pid => pid !== id);
        } else {
            this.pausedProducts.push(id);
        }
        this.savePausedProducts();
        const product = this.products.find(p => p.id === id);
        if (product) {
            if (this.isProductPaused(id)) {
                product.stockStatus = 'out_of_stock';
            } else if (product.stock > 0) {
                product.stockStatus = 'in_stock';
            }
        }
        this.saveProductsLocal();
        this.syncGlobalProducts();
        this.renderProductsTable();
    }

    renderOrdersTable() {
        const tbody = document.getElementById('orders-table-body');
        if (!tbody) return;
        
        if (this.orders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 3rem;">لا توجد طلبات</td></tr>';
            return;
        }

        tbody.innerHTML = this.orders.map(o => {
            const orderId = o.orderId || o.id || '';
            const statusClass = this.getStatusClass(o.status);
            const statusLabel = this.getStatusLabel(o.status);
            const safeCustomer = o.customerName || o.customer || 'عميل';
            const createdAt = o.createdAt || o.timestamp || new Date().toISOString();
            const total = typeof o.total === 'number' ? o.total : parseFloat(o.total || 0);
            return `
            <tr>
                <td data-label="رقم الطلب">#${String(orderId).slice(-6)}</td>
                <td data-label="العميل">${safeCustomer}</td>
                <td data-label="التاريخ">${new Date(createdAt).toLocaleDateString('ar-EG')}</td>
                <td data-label="الإجمالي">${total.toLocaleString()} EGP</td>
                <td data-label="الحالة">
                    <div style="display:flex; gap:8px; align-items:center;">
                        <span class="status-badge ${statusClass}">${statusLabel}</span>
                        <select class="btn" style="padding:5px 10px; min-width:130px;" onchange="window.productsManager.changeOrderStatus('${orderId}', this.value)">
                            <option value="pending" ${o.status === 'pending' ? 'selected' : ''}>قيد الانتظار</option>
                            <option value="processing" ${o.status === 'processing' ? 'selected' : ''}>قيد التنفيذ</option>
                            <option value="completed" ${o.status === 'completed' ? 'selected' : ''}>مكتمل</option>
                            <option value="cancelled" ${o.status === 'cancelled' ? 'selected' : ''}>ملغي</option>
                        </select>
                    </div>
                </td>
                <td data-label="إجراءات"><button class="btn btn-primary" style="padding:5px 10px;" onclick="window.productsManager.viewOrderDetails('${orderId}')">تفاصيل</button></td>
            </tr>
        `;}).join('');
    }

    viewOrderDetails(orderId) {
        const order = this.orders.find(o => (o.orderId || o.id) === orderId);
        if (!order) return;
        
        const itemsList = (order.items || []).map(item => `
            <div style="display:flex; justify-content:space-between; margin-bottom:10px; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:5px;">
                <span>${item.name} (x${item.quantity || item.qty || 1})</span>
                <span>${(item.price || 0) * (item.quantity || item.qty || 1)} EGP</span>
            </div>
        `).join('');

        const modalHtml = `
            <div id="order-modal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:1000; display:flex; align-items:center; justify-content:center;">
                <div class="glass-card" style="width:90%; max-width:500px; max-height:80vh; overflow-y:auto;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2rem;">
                        <h2>تفاصيل الطلب #${String(order.orderId || order.id).slice(-6)}</h2>
                        <button onclick="document.getElementById('order-modal').remove()" style="background:none; border:none; color:white; font-size:1.5rem; cursor:pointer;">&times;</button>
                    </div>
                    <div style="margin-bottom:2rem;">
                        <p><strong>العميل:</strong> ${order.customerName || order.customer || 'عميل'}</p>
                        <p><strong>التاريخ:</strong> ${new Date(order.createdAt || order.timestamp || new Date().toISOString()).toLocaleString('ar-EG')}</p>
                        <p><strong>الحالة:</strong> ${this.getStatusLabel(order.status)}</p>
                        <p><strong>العنوان:</strong> ${order.address || (order.customer && order.customer.address) || 'غير متوفر'}</p>
                    </div>
                    <div style="margin-bottom:2rem;">
                        <h3>المنتجات:</h3>
                        ${itemsList}
                    </div>
                    <div style="text-align:left; font-size:1.2rem; font-weight:bold; color:var(--primary);">
                        الإجمالي: ${order.total} EGP
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    renderRecentProducts() {
        const container = document.getElementById('recent-products-list');
        if (!container) return;
        
        if (this.products.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:var(--text-muted);">لا توجد منتجات مضافة بعد</p>';
            return;
        }

        const recent = [...this.products].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
        
        container.innerHTML = recent.map(p => `
            <div style="display:flex; align-items:center; justify-content:space-between; padding:12px; background:rgba(255,255,255,0.03); border-radius:12px; margin-bottom:10px;">
                <div style="display:flex; align-items:center; gap:15px;">
                    <img src="${p.images[0]}" style="width:50px; height:50px; border-radius:8px; object-fit:cover;">
                    <div>
                        <h4 style="margin:0;">${p.name}</h4>
                        <small style="color:var(--text-muted);">${p.category}</small>
                    </div>
                </div>
                <div style="text-align:left;">
                    <div style="font-weight:bold; color:var(--primary);">${p.price} EGP</div>
                    <small style="color:var(--success);">مبيعات: ${p.sales || 0}</small>
                </div>
            </div>
        `).join('');
    }

    updateStats() {
        if (document.getElementById('stat-total-products'))
            document.getElementById('stat-total-products').textContent = this.products.length;
        
        const sales = this.products.reduce((acc, p) => acc + (p.sales || 0), 0);
        if (document.getElementById('stat-total-sales'))
            document.getElementById('stat-total-sales').textContent = sales;
        
        const rev = this.products.reduce((acc, p) => acc + ((p.sales || 0) * p.price), 0);
        if (document.getElementById('stat-total-revenue'))
            document.getElementById('stat-total-revenue').textContent = rev.toLocaleString() + ' EGP';

        if (document.getElementById('stat-total-orders'))
            document.getElementById('stat-total-orders').textContent = this.orders.length;

        const processing = this.orders.filter(o => (o.status || '').toLowerCase() === 'processing').length;
        const completed = this.orders.filter(o => (o.status || '').toLowerCase() === 'completed').length;
        const cancelled = this.orders.filter(o => (o.status || '').toLowerCase() === 'cancelled').length;
        if (document.getElementById('stat-processing-orders'))
            document.getElementById('stat-processing-orders').textContent = processing;
        if (document.getElementById('stat-completed-orders'))
            document.getElementById('stat-completed-orders').textContent = completed;
        if (document.getElementById('stat-cancelled-orders'))
            document.getElementById('stat-cancelled-orders').textContent = cancelled;
    }

    updateDiscountInfo() {
        const priceInput = document.getElementById('productPrice');
        const discountInput = document.getElementById('productDiscountPrice');
        const info = document.getElementById('discountInfo');
        const percentEl = document.getElementById('discountPercentage');
        if (!priceInput || !discountInput || !info || !percentEl) return;

        const price = parseFloat(priceInput.value || 0);
        const discount = parseFloat(discountInput.value || 0);
        if (price > 0 && discount > 0 && discount < price) {
            const pct = Math.round(((price - discount) / price) * 100);
            percentEl.textContent = `${pct}%`;
            info.style.display = 'flex';
        } else {
            info.style.display = 'none';
        }
    }

    updateProductPreview(reset = false) {
        const preview = document.getElementById('product-preview-card');
        const form = document.getElementById('add-product-form');
        if (!preview || !form) return;

        if (reset) {
            preview.innerHTML = '';
            return;
        }

        const name = form.productName.value || 'اسم المنتج';
        const category = form.category.value || 'التصنيف';
        const price = parseFloat(form.price.value || 0);
        const discountPrice = parseFloat(form.discountPrice.value || 0);
        const stock = parseInt(form.stock.value || 0);
        const description = form.description.value || 'وصف المنتج سيظهر هنا...';
        const statusLabel = form.stockStatus?.value === 'out_of_stock' ? 'غير متوفر' : 'متوفر';
        const hasDiscount = discountPrice > 0 && discountPrice < price;
        const imageSrc = this.uploadedImages[0] ? (typeof this.uploadedImages[0] === 'string' ? this.uploadedImages[0] : this.uploadedImages[0].data) : this.getDefaultAvatar();

        preview.innerHTML = `
            <div class="preview-card">
                <div class="preview-image">
                    <img src="${imageSrc}" alt="${name}">
                    ${hasDiscount ? `<span class="preview-badge">خصم</span>` : ''}
                </div>
                <div class="preview-content">
                    <h4>${name}</h4>
                    <p>${description}</p>
                    <div class="preview-meta">
                        <span>${category}</span>
                        <span>المخزون: ${stock}</span>
                    </div>
                    <div class="preview-meta">
                        <span>الحالة: ${statusLabel}</span>
                    </div>
                    <div class="preview-price">
                        ${hasDiscount ? `<span class="old-price">${price.toFixed(2)} ج.م</span><span class="current-price">${discountPrice.toFixed(2)} ج.م</span>` : `<span class="current-price">${price.toFixed(2)} ج.م</span>`}
                    </div>
                </div>
            </div>
        `;
    }

    loadPausedProducts() {
        const key = `seller_paused_${this.userEmail}`;
        this.pausedProducts = JSON.parse(localStorage.getItem(key) || '[]');
    }

    savePausedProducts() {
        const key = `seller_paused_${this.userEmail}`;
        localStorage.setItem(key, JSON.stringify(this.pausedProducts));
    }

    isProductPaused(id) {
        return this.pausedProducts.includes(id);
    }

    notifyNewOrders() {
        const key = `seller_order_count_${this.userEmail}`;
        const prevCount = parseInt(localStorage.getItem(key) || '0');
        const currentCount = this.orders.length;
        if (currentCount > prevCount) {
            const diff = currentCount - prevCount;
            this.showToast(`لديك ${diff} طلب جديد`, 'success');
        }
        localStorage.setItem(key, String(currentCount));
    }

    showToast(message, type = 'success') {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.style.cssText = 'position:fixed; top:20px; left:20px; z-index:2000; display:flex; flex-direction:column; gap:10px;';
            document.body.appendChild(container);
        }
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.cssText = `background:${type === 'success' ? 'rgba(46, 204, 113, 0.2)' : 'rgba(231, 76, 60, 0.2)'}; color:${type === 'success' ? '#2ecc71' : '#e74c3c'}; border:1px solid ${type === 'success' ? 'rgba(46, 204, 113, 0.5)' : 'rgba(231, 76, 60, 0.5)'}; padding:12px 16px; border-radius:10px; min-width:240px; backdrop-filter: blur(6px);`;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    }

    async saveSettings() {
        try {
            const name = document.getElementById('shop-name-input').value;
            const desc = document.getElementById('shop-desc-input').value;
            const sellerName = document.getElementById('seller-name-input')?.value.trim() || '';
            const sellerPhone = document.getElementById('seller-phone-input')?.value.trim() || '';
            
            if (this.supabase) {
                const { error } = await this.supabase
                    .from('seller_settings')
                    .upsert({
                        email: this.userEmail,
                        shop_name: name,
                        shop_description: desc,
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'email' });
                
                if (error) throw error;
            }
            
            localStorage.setItem(`shop_name_${this.userEmail}`, name);
            localStorage.setItem(`shop_desc_${this.userEmail}`, desc);
            const currentProfile = JSON.parse(localStorage.getItem(`seller_profile_${this.userEmail}`) || '{}');
            localStorage.setItem(`seller_profile_${this.userEmail}`, JSON.stringify({
                ...currentProfile,
                businessName: name || currentProfile.businessName,
                sellerName: sellerName || currentProfile.sellerName,
                phone: sellerPhone || currentProfile.phone,
                email: this.userEmail
            }));
            this.loadProfile();
            alert('تم الحفظ بنجاح');
        } catch (error) {
            console.error('Error saving settings:', error);
            alert('تم الحفظ محلياً');
            const name = document.getElementById('shop-name-input').value;
            const desc = document.getElementById('shop-desc-input').value;
            localStorage.setItem(`shop_name_${this.userEmail}`, name);
            localStorage.setItem(`shop_desc_${this.userEmail}`, desc);
            const sellerName = document.getElementById('seller-name-input')?.value.trim() || '';
            const sellerPhone = document.getElementById('seller-phone-input')?.value.trim() || '';
            const currentProfile = JSON.parse(localStorage.getItem(`seller_profile_${this.userEmail}`) || '{}');
            localStorage.setItem(`seller_profile_${this.userEmail}`, JSON.stringify({
                ...currentProfile,
                businessName: name || currentProfile.businessName,
                sellerName: sellerName || currentProfile.sellerName,
                phone: sellerPhone || currentProfile.phone,
                email: this.userEmail
            }));
        }
    }

    getDefaultAvatar() {
        return "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'><rect width='120' height='120' fill='%231b1b20'/><circle cx='60' cy='46' r='22' fill='%2300d4ff'/><path d='M20 110c6-22 28-32 40-32s34 10 40 32' fill='%2300d4ff'/></svg>";
    }

    getStatusLabel(status) {
        const map = {
            pending: 'قيد الانتظار',
            processing: 'قيد التنفيذ',
            completed: 'مكتمل',
            cancelled: 'ملغي',
            shipped: 'مشحونة',
            delivered: 'تم التوصيل'
        };
        return map[(status || '').toLowerCase()] || status || 'قيد الانتظار';
    }

    getStatusClass(status) {
        const value = (status || '').toLowerCase();
        if (value === 'cancelled') return 'status-stockout';
        return 'status-active';
    }

    async changeOrderStatus(orderId, newStatus) {
        const order = this.orders.find(o => (o.orderId || o.id) === orderId);
        if (!order) return;
        order.status = newStatus;

        if (this.supabase && order.id && !String(order.id).startsWith('seller_')) {
            try {
                await this.supabase.from('orders').update({ status: newStatus }).eq('id', order.id);
            } catch (e) {}
        }

        this.syncOrderStatusLocal(orderId, newStatus);
        this.renderOrdersTable();
        this.updateStats();
    }

    syncOrderStatusLocal(orderId, newStatus) {
        const sellerOrders = JSON.parse(localStorage.getItem('seller_orders') || '[]');
        const updatedSellerOrders = sellerOrders.map(o => {
            if ((o.orderId || o.id) === orderId) {
                return { ...o, status: newStatus };
            }
            return o;
        });
        localStorage.setItem('seller_orders', JSON.stringify(updatedSellerOrders));

        const allOrders = JSON.parse(localStorage.getItem('orders') || '[]');
        const updatedOrders = allOrders.map(o => {
            if (o.orderId === orderId) {
                return { ...o, status: newStatus };
            }
            return o;
        });
        localStorage.setItem('orders', JSON.stringify(updatedOrders));
    }

    buildSellerOrdersFromCustomerOrders(allOrders) {
        if (!Array.isArray(allOrders)) return [];
        const derived = [];
        allOrders.forEach(order => {
            const items = Array.isArray(order.items) ? order.items : [];
            const groups = {};
            items.forEach(item => {
                const seller = item.sellerEmail || item.seller_email || item.seller || 'unknown';
                if (!groups[seller]) groups[seller] = [];
                groups[seller].push(item);
            });
            Object.keys(groups).forEach(sellerEmail => {
                const sellerItems = groups[sellerEmail];
                const total = sellerItems.reduce((sum, i) => sum + (parseFloat(i.price || 0) * (i.quantity || i.qty || 1)), 0);
                derived.push({
                    id: `seller_${order.orderId || order.id}_${sellerEmail}`,
                    orderId: order.orderId || order.id,
                    customerName: order.customer?.name || order.customerName || 'عميل',
                    customerEmail: order.customerEmail || order.customer?.email || '',
                    total: total.toFixed(2),
                    status: order.status || 'pending',
                    createdAt: order.timestamp || order.createdAt || new Date().toISOString(),
                    items: sellerItems,
                    address: order.customer?.address || order.address || '',
                    sellerEmail: sellerEmail
                });
            });
        });
        return derived;
    }
}

window.productsManager = new ProductsManager();
