// Manta - My Products Management
// صفحة "منتجاتي" لإدارة منتجات الشركاء

class MantaManager {
    constructor() {
        this.userEmail = null;
        this.partnerData = null;
        this.products = [];
        this.init();
    }

    init() {
        console.log("[MANTA] Initializing...");
        
        // Wait for session-manager to be ready
        if (window.bodaSession && window.bodaSession.isLoggedIn) {
            this.runInit();
        } else {
            document.addEventListener('sessionReady', (e) => {
                console.log("[MANTA] sessionReady event received", e.detail);
                this.runInit();
            }, { once: true });
            
            // Safety timeout: try to recover session from storage if event missed
            setTimeout(() => {
                if (!this.userEmail) {
                    const localEmail = localStorage.getItem('userEmail');
                    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
                    if (isLoggedIn && localEmail) {
                        console.log("[MANTA] Recovery: Found session in localStorage");
                        this.runInit();
                    } else {
                        console.log("[MANTA] No session found after timeout");
                        this.displayNoSession();
                    }
                }
            }, 2000);
        }
    }

    runInit() {
        if (!this.checkAuth()) {
            console.warn("[MANTA] Auth failed, redirecting...");
            window.location.href = 'login.html';
            return;
        }

        console.log("[MANTA] Auth success for:", this.userEmail);
        this.setupEventListeners();
        this.loadProducts();
        this.displayProducts();
    }

    checkAuth() {
        // Prefer bodaSession data
        if (window.bodaSession && window.bodaSession.isLoggedIn && window.bodaSession.userData) {
            this.userEmail = window.bodaSession.userData.email.toLowerCase();
        } else {
            // Fallback to storage
            const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
            this.userEmail = (localStorage.getItem('userEmail') || '').trim().toLowerCase();
            if (!isLoggedIn || !this.userEmail) return false;
        }

        // Find partner data across all possible locations
        this.partnerData = this.findPartnerData();
        return true;
    }

    findPartnerData() {
        // 1. Check current partner key
        let partner = JSON.parse(localStorage.getItem('boda_current_partner') || 'null');
        if (partner && partner.email && partner.email.toLowerCase() === this.userEmail) {
            return partner;
        }

        // 2. Search in all partners list
        const partners = JSON.parse(localStorage.getItem('boda_partners') || '[]');
        partner = partners.find(p => p.email.toLowerCase() === this.userEmail);
        if (partner) {
            localStorage.setItem('boda_current_partner', JSON.stringify(partner));
            return partner;
        }

        return null;
    }

    getProductsKey() {
        if (this.partnerData && this.partnerData.id) {
            return `partner_products_${this.partnerData.id}`;
        }
        return `seller_products_${this.userEmail}`;
    }

    loadProducts() {
        const productsKey = this.getProductsKey();
        const storedProducts = JSON.parse(localStorage.getItem(productsKey) || '[]');
        
        // Sometimes products might be in the legacy key or global list
        if (storedProducts.length === 0) {
            const legacyKey = `seller_products_${this.userEmail}`;
            const legacyProducts = JSON.parse(localStorage.getItem(legacyKey) || '[]');
            if (legacyProducts.length > 0) {
                this.products = legacyProducts;
                console.log(`[MANTA] Loaded ${this.products.length} products from legacy key`);
                return;
            }
        }

        this.products = storedProducts;
        console.log(`[MANTA] Loaded ${this.products.length} products from ${productsKey}`);
    }

    setupEventListeners() {
        // Search and Sort
        const searchInput = document.getElementById('search-products');
        const sortSelect = document.getElementById('sort-products');

        if (searchInput) {
            searchInput.addEventListener('input', () => this.filterProducts());
        }
        if (sortSelect) {
            sortSelect.addEventListener('change', () => this.filterProducts());
        }

        // Edit Form
        const editForm = document.getElementById('edit-product-form');
        if (editForm) {
            editForm.addEventListener('submit', (e) => this.handleSaveEdit(e));
        }

        // Modal Close
        const closeModal = document.querySelector('.close-modal');
        if (closeModal) {
            closeModal.addEventListener('click', () => {
                document.getElementById('edit-product-modal').style.display = 'none';
            });
        }

        window.addEventListener('click', (e) => {
            const modal = document.getElementById('edit-product-modal');
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }

    displayProducts(filteredProducts = null) {
        const grid = document.getElementById('products-grid');
        if (!grid) return;

        const displayList = filteredProducts || this.products;

        if (displayList.length === 0) {
            grid.innerHTML = `
                <div class="no-products">
                    <div class="empty-icon">📦</div>
                    <h3>لا توجد منتجات لعرضها</h3>
                    <p>قم بإضافة منتجاتك من خلال لوحة التحكم</p>
                    <a href="add-product.html" class="btn-primary">➕ إضافة منتج جديد</a>
                </div>
            `;
            return;
        }

        grid.innerHTML = displayList.map(product => {
            const status = product.status || 'active';
            const statusClass = status === 'active' ? 'status-active' : 'status-inactive';
            const statusLabel = status === 'active' ? 'نشط' : 'مخفي';
            const date = product.createdAt ? new Date(product.createdAt).toLocaleDateString('ar-EG') : 'غير محدد';
            
            // Handle both name and productName fields
            const name = product.productName || product.name || 'منتج بدون اسم';
            const image = product.image || (product.images && product.images[0]) || 'default-product.jpg';

            return `
                <div class="product-card ${status === 'inactive' ? 'card-inactive' : ''}">
                    <div class="product-status-badge ${statusClass}">${statusLabel}</div>
                    <div class="product-card-image">
                        ${image.startsWith('data:') ? `<img src="${image}" alt="${name}">` : `<span>📦</span>`}
                        <div class="product-date-tag">${date}</div>
                    </div>
                    <div class="product-card-content">
                        <h3 class="product-card-title">${name}</h3>
                        <div class="product-card-price">${product.price} EGP</div>
                        <div class="product-card-stats">
                            <span title="الكمية المتوفرة">📦 ${product.stock !== undefined ? product.stock : (product.stockStatus === 'in_stock' ? 'متوفر' : '0')}</span>
                            <span title="عدد المبيعات">📊 ${product.sales || 0}</span>
                        </div>
                        <div class="product-card-actions">
                            <button class="btn-action btn-edit" onclick="mantaManager.editProduct('${product.id}')" title="تعديل">✎</button>
                            <button class="btn-action btn-status" onclick="mantaManager.toggleStatus('${product.id}')" title="${status === 'active' ? 'إخفاء المنتج' : 'إظهار المنتج'}">
                                ${status === 'active' ? '👁️' : '🙈'}
                            </button>
                            <button class="btn-action btn-copy" onclick="mantaManager.copyProductLink('${product.id}')" title="نسخ رابط المنتج">🔗</button>
                            <button class="btn-action btn-delete" onclick="mantaManager.deleteProduct('${product.id}')" title="حذف">🗑</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    displayNoSession() {
        const grid = document.getElementById('products-grid');
        if (grid) {
            grid.innerHTML = `
                <div class="no-products">
                    <div class="empty-icon">🔒</div>
                    <h3>يجب تسجيل الدخول</h3>
                    <p>يرجى تسجيل الدخول للوصول إلى منتجاتك</p>
                    <a href="login.html" class="btn-primary">🔑 تسجيل الدخول</a>
                </div>
            `;
        }
    }

    filterProducts() {
        const search = document.getElementById('search-products').value.toLowerCase();
        const sort = document.getElementById('sort-products').value;

        let filtered = this.products.filter(product => {
            const name = (product.productName || product.name || '').toLowerCase();
            return name.includes(search);
        });

        if (sort === 'price-low') {
            filtered.sort((a, b) => a.price - b.price);
        } else if (sort === 'price-high') {
            filtered.sort((a, b) => b.price - a.price);
        } else if (sort === 'sales') {
            filtered.sort((a, b) => (b.sales || 0) - (a.sales || 0));
        } else {
            filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }

        this.displayProducts(filtered);
    }

    toggleStatus(productId) {
        const index = this.products.findIndex(p => p.id === productId);
        if (index === -1) return;

        const currentStatus = this.products[index].status || 'active';
        this.products[index].status = currentStatus === 'active' ? 'inactive' : 'active';
        
        this.saveAndSync(this.products[index]);
        this.displayProducts();
    }

    deleteProduct(productId) {
        if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;

        const index = this.products.findIndex(p => p.id === productId);
        if (index === -1) return;

        const deletedProduct = this.products[index];
        this.products.splice(index, 1);
        
        // Remove from local storage
        const productsKey = this.getProductsKey();
        localStorage.setItem(productsKey, JSON.stringify(this.products));
        
        // Remove from global list
        let globalProducts = JSON.parse(localStorage.getItem('boda_all_products') || '[]');
        globalProducts = globalProducts.filter(p => p.id !== productId);
        localStorage.setItem('boda_all_products', JSON.stringify(globalProducts));

        // Update stats
        const countKey = `products_${this.userEmail}`;
        const count = Math.max(0, parseInt(localStorage.getItem(countKey) || '0') - 1);
        localStorage.setItem(countKey, count.toString());

        this.displayProducts();
    }

    editProduct(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;

        document.getElementById('edit-product-id').value = product.id;
        document.getElementById('edit-name').value = product.productName || product.name || '';
        document.getElementById('edit-price').value = product.price;
        document.getElementById('edit-discount-price').value = product.discountPrice || '';
        document.getElementById('edit-stock').value = product.stock !== undefined ? product.stock : (product.stockStatus === 'in_stock' ? 10 : 0);
        document.getElementById('edit-description').value = product.description || '';

        document.getElementById('edit-product-modal').style.display = 'block';
    }

    handleSaveEdit(e) {
        e.preventDefault();
        const id = document.getElementById('edit-product-id').value;
        const index = this.products.findIndex(p => p.id === id);

        if (index !== -1) {
            const newName = document.getElementById('edit-name').value.trim();
            // Update both possible name fields
            if (this.products[index].productName !== undefined) this.products[index].productName = newName;
            if (this.products[index].name !== undefined) this.products[index].name = newName;
            if (this.products[index].productName === undefined && this.products[index].name === undefined) {
                this.products[index].productName = newName;
            }

            this.products[index].price = parseFloat(document.getElementById('edit-price').value);
            const discPrice = parseFloat(document.getElementById('edit-discount-price').value);
            this.products[index].discountPrice = !isNaN(discPrice) ? discPrice : null;
            
            this.products[index].stock = parseInt(document.getElementById('edit-stock').value);
            this.products[index].stockStatus = this.products[index].stock > 0 ? 'in_stock' : 'out_of_stock';
            this.products[index].description = document.getElementById('edit-description').value.trim();

            this.saveAndSync(this.products[index]);
            document.getElementById('edit-product-modal').style.display = 'none';
            this.displayProducts();
            
            alert('✓ تم حفظ التعديلات بنجاح');
        }
    }

    saveAndSync(product) {
        const productsKey = this.getProductsKey();
        localStorage.setItem(productsKey, JSON.stringify(this.products));
        
        // Sync with global products
        let globalProducts = JSON.parse(localStorage.getItem('boda_all_products') || '[]');
        const gIndex = globalProducts.findIndex(p => p.id === product.id);
        
        if (gIndex !== -1) {
            const updatedName = product.productName || product.name;
            globalProducts[gIndex].name = updatedName;
            globalProducts[gIndex].productName = updatedName; // Keep both for safety
            globalProducts[gIndex].price = product.price;
            globalProducts[gIndex].discountPrice = product.discountPrice;
            globalProducts[gIndex].description = product.description;
            globalProducts[gIndex].stockStatus = (product.stock > 0 || product.stockStatus === 'in_stock') ? 'in_stock' : 'out_of_stock';
            globalProducts[gIndex].status = product.status;
            localStorage.setItem('boda_all_products', JSON.stringify(globalProducts));
        }
    }

    copyProductLink(productId) {
        const baseUrl = window.location.origin;
        const link = `${baseUrl}/pages/product.html?id=${productId}`;
        
        navigator.clipboard.writeText(link).then(() => {
            alert('✓ تم نسخ رابط المنتج بنجاح');
        }).catch(() => {
            alert('❌ فشل نسخ الرابط');
        });
    }
}

let mantaManager;
document.addEventListener('DOMContentLoaded', () => {
    mantaManager = new MantaManager();
});
