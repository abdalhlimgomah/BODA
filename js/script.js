// ========== UTILITY FUNCTIONS ==========

/**
 * Get correct image path based on current location
 */
function getImagePath(path) {
    if (!path) return '../images/placeholder.jpg';
    if (path.startsWith('http') || path.startsWith('data:')) return path;
    
    // Check if we are in a sub-page (inside pages directory)
    const isSubPage = window.location.pathname.includes('/pages/');
    return isSubPage ? '../' + path : path;
}

// ========== SHOPPING CART FUNCTIONS ==========

/**
 * Get cart from localStorage
 */
function getCart() {
    // 🔐 عزل البيانات لكل مستخدم
    const userEmail = localStorage.getItem('userEmail');
    const key = userEmail ? `cart_${userEmail}` : 'cart';
    const cart = localStorage.getItem(key);
    return cart ? JSON.parse(cart) : [];
}

/**
 * Save cart to localStorage and update UI
 */
function saveCart(cart) {
    // 🔐 عزل البيانات لكل مستخدم
    const userEmail = localStorage.getItem('userEmail');
    const key = userEmail ? `cart_${userEmail}` : 'cart';
    localStorage.setItem(key, JSON.stringify(cart));
    updateCartCount();
    
    // If we are on a page with a specific renderUI function (like cart.html)
    if (typeof renderUI === 'function') {
        renderUI();
    }
}

// ========== WISHLIST FUNCTIONS ==========

/**
 * Get wishlist from localStorage
 */
function getWishlist() {
    // 🔐 عزل البيانات لكل مستخدم
    const userEmail = localStorage.getItem('userEmail');
    const key = userEmail ? `wishlist_${userEmail}` : 'wishlist';
    const wishlist = localStorage.getItem(key);
    return wishlist ? JSON.parse(wishlist) : [];
}

/**
 * Save wishlist to localStorage
 */
function saveWishlist(wishlist) {
    // 🔐 عزل البيانات لكل مستخدم
    const userEmail = localStorage.getItem('userEmail');
    const key = userEmail ? `wishlist_${userEmail}` : 'wishlist';
    localStorage.setItem(key, JSON.stringify(wishlist));
}

/**
 * Add product to cart
 */
function addToCart(product, quantity = 1) {
    try {
        // ✅ فحص تسجيل الدخول
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        if (!isLoggedIn) {
            showNotification('❌ يجب تسجيل الدخول أولاً');
            setTimeout(() => {
                window.location.href = '/pages/login.html';
            }, 1500);
            return;
        }
        
        console.log('Adding to cart:', product);
        
        // Ensure all required fields
        const itemToAdd = {
            id: product.id,
            name: product.name || product.productName,
            price: product.price || product.originalPrice,
            quantity: quantity,
            image: product.image || (product.images && product.images[0]),
            category: product.category,
            description: product.description,
            sellerEmail: product.sellerEmail || product.seller_email || product.seller,
            seller: product.seller || (product.sellerEmail ? product.sellerEmail.split('@')[0] : ''),
            seller_email: product.seller_email || product.sellerEmail,
            discountPrice: product.discountPrice,
            ...product // Keep any other properties
        };
        
        console.log('Item to add:', itemToAdd);
        
        const cart = getCart();
        const existingItem = cart.find(item => item.id === itemToAdd.id);
        
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            cart.push(itemToAdd);
        }
        
        saveCart(cart);
        console.log('✓ Added to cart, total items:', cart.length);
        showNotification('تم إضافة المنتج إلى العربة بنجاح! ✓');
    } catch (error) {
        console.error('Error adding to cart:', error);
        showNotification('❌ خطأ في إضافة المنتج: ' + error.message);
    }
}

/**
 * Remove product from cart
 */
function removeFromCart(productId) {
    let cart = getCart();
    cart = cart.filter(item => item.id !== productId);
    saveCart(cart);
    displayCart(); // Refresh cart display
}

/**
 * Update product quantity in cart
 */
function updateQuantity(productId, newQuantity) {
    let cart = getCart();
    const item = cart.find(item => item.id === productId);
    
    if (item) {
        newQuantity = parseInt(newQuantity);
        if (newQuantity <= 0) {
            removeFromCart(productId);
        } else {
            item.quantity = newQuantity;
            saveCart(cart);
            updateTotals(); // Recalculate totals
        }
    }
}

/**
 * Update cart count in header
 */
function updateCartCount() {
    const cart = getCart();
    const count = cart.reduce((total, item) => total + item.quantity, 0);
    
    // Update old style cart count (for backward compatibility)
    const cartCountElement = document.getElementById('cart-count');
    if (cartCountElement) {
        cartCountElement.textContent = count;
    }
    
    // Update new style nav cart count
    const navCartCount = document.getElementById('nav-cart-count');
    if (navCartCount) {
        navCartCount.textContent = count;
        // Update class for styling (pulse animation only when count changes)
        if (count > 0) {
            navCartCount.classList.remove('nav-cart-0');
        } else {
            navCartCount.classList.add('nav-cart-0');
        }
    }
}

/**
 * Calculate total with tax and shipping
 */
function calculateTotal(customShipping = null) {
    const cart = getCart();
    let subtotal = 0;
    
    cart.forEach(item => {
        subtotal += item.price * item.quantity;
    });
    
    const tax = subtotal * 0.05; // 5% tax
    const shipping = customShipping !== null ? customShipping : (cart.length > 0 ? 20 : 0);
    const total = subtotal + tax + shipping;
    
    return {
        subtotal: subtotal.toFixed(2),
        tax: tax.toFixed(2),
        shipping: shipping,
        total: total.toFixed(2)
    };
}

/**
 * Display cart items in cart page
 */
function displayCart() {
    const cart = getCart();
    const cartItemsContainer = document.getElementById('cart-items');
    
    // If renderUI exists, it handles its own rendering (like in cart.html)
    if (typeof renderUI === 'function') return;
    
    if (!cartItemsContainer) return; // Not on a page that needs this specific cart display
    
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = `
            <div class="empty-cart">
                <div class="empty-cart-icon">🛒</div>
                <div class="empty-cart-text">سلتك فارغة</div>
                <a href="index.html" class="empty-cart-btn">العودة للتسوق</a>
            </div>
        `;
        updateTotals();
        return;
    }
    
    cartItemsContainer.innerHTML = cart.map(item => `
        <div class="cart-item" data-id="${item.id}">
            <div class="cart-item-image">
                <img src="${getImagePath(item.image)}" alt="${item.name}">
            </div>
            <div class="cart-item-details">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-price">${item.price} جنيه مصري</div>
                <div class="cart-item-quantity">
                    <label>الكمية:</label>
                    <input type="number" value="${item.quantity}" min="1" onchange="updateQuantity('${item.id}', this.value)">
                </div>
                <div class="cart-item-subtotal">
                    الإجمالي: <strong>${(item.price * item.quantity).toFixed(2)}</strong> جنيه مصري
                </div>
                <button class="cart-item-remove" onclick="removeFromCart('${item.id}')">❌ حذف من العربة</button>
            </div>
        </div>
    `).join('');
    
    updateTotals();
}

/**
 * Update totals display on cart page
 */
function updateTotals() {
    const totals = calculateTotal();
    const itemCountElement = document.getElementById('total-items');
    const subtotalElement = document.getElementById('subtotal');
    const taxElement = document.getElementById('tax');
    const shippingElement = document.getElementById('shipping');
    const totalPriceElement = document.getElementById('total-price');
    
    if (itemCountElement) {
        itemCountElement.textContent = getCart().reduce((sum, item) => sum + item.quantity, 0);
    }
    if (subtotalElement) {
        subtotalElement.textContent = totals.subtotal + ' جنيه مصري';
    }
    if (taxElement) {
        taxElement.textContent = totals.tax + ' جنيه مصري';
    }
    if (shippingElement) {
        shippingElement.textContent = totals.shipping + ' جنيه مصري';
    }
    if (totalPriceElement) {
        totalPriceElement.textContent = totals.total + ' جنيه مصري';
    }
}

/**
 * Show notification message
 */
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.textContent = message;

    let background, icon;
    switch(type) {
        case 'success':
            background = 'linear-gradient(135deg, #4CAF50, #45a049)';
            icon = '✓';
            break;
        case 'error':
            background = 'linear-gradient(135deg, #f44336, #d32f2f)';
            icon = '✕';
            break;
        case 'warning':
            background = 'linear-gradient(135deg, #ff9800, #f57c00)';
            icon = '⚠';
            break;
        case 'info':
            background = 'linear-gradient(135deg, #2196F3, #1976D2)';
            icon = 'ℹ';
            break;
        default:
            background = 'linear-gradient(135deg, #00d4ff, #00a8cc)';
            icon = '🛍️';
    }

    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${background};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
        font-weight: 600;
        font-size: 0.95rem;
        max-width: 90vw;
        width: auto;
        min-height: 48px;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        backdrop-filter: blur(5px);
        border: 1px solid rgba(255,255,255,0.2);
    `;

    // إضافة أيقونة
    const iconElement = document.createElement('span');
    iconElement.textContent = icon;
    icon.fontSize = '1.2rem';
    icon.flexShrink = '0';
    notification.insertBefore(iconElement, notification.firstChild);

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => notification.remove(), 300);
    }, 3500);
}

/**
 * Search products
 */
function searchProducts() {
    const searchQuery = document.getElementById('search')?.value?.toLowerCase();
    if (!searchQuery) {
        alert('الرجاء إدخال كلمة البحث');
        return;
    }
    console.log('البحث عن:', searchQuery);
    // سيتم تنفيذه لاحقاً عند إضافة قاعدة بيانات المنتجات
}

/**
 * Filter by category
 */
function filterByCategory(category) {
    window.location.href = 'pages/products.html?category=' + encodeURIComponent(category);
}

/**
 * Filter products on homepage by category
 */
function filterProducts(category) {
    const products = document.querySelectorAll('#product-grid .product-item');
    const buttons = document.querySelectorAll('.filter-btn');
    
    // Update active button
    buttons.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Filter products
    products.forEach(product => {
        const productCategory = product.getAttribute('data-category');
        if (category === 'all' || productCategory === category) {
            product.style.display = 'block';
        } else {
            product.style.display = 'none';
        }
    });
}

/**
 * Go to payment page
 */
function goToPayment() {
    const cart = getCart();
    if (cart.length === 0) {
        alert('السلة فارغة! أضف منتجات أولاً');
        return;
    }
    // التحقق من المسار الحالي للصفحة
    const currentPath = window.location.pathname;
    if (currentPath.includes('/pages/')) {
        // إذا كنا في مجلد pages، نستخدم المسار النسبي
        window.location.href = 'checkout.html';
    } else {
        // إذا كنا في الجذر، نستخدم المسار الكامل
        window.location.href = 'pages/checkout.html';
    }
}

/**
 * Initialize cart on page load & Handle new user accounts
 */
document.addEventListener('DOMContentLoaded', function() {
    updateCartCount(); // Update header cart count
    displayCart(); // Display cart if on cart page
    
    // ✅ Handle new user accounts - clear old cart/wishlist data
    handleNewUserAccount();
});

/**
 * Handle new user account initialization and data isolation
 */
function handleNewUserAccount() {
    const isNewAccount = localStorage.getItem('isNewAccount') === 'true';
    const userEmail = localStorage.getItem('userEmail');
    
    if (!isNewAccount || !userEmail) return;
    
    // Clear old data and create fresh user-segregated storage
    const oldCart = localStorage.getItem('cart');
    const oldWishlist = localStorage.getItem('wishlist');
    
    // Remove old non-segregated keys
    localStorage.removeItem('cart');
    localStorage.removeItem('wishlist');
    
    // Initialize new user with empty segregated keys
    localStorage.setItem(`cart_${userEmail}`, JSON.stringify([]));
    localStorage.setItem(`wishlist_${userEmail}`, JSON.stringify([]));
    
    // Mark account as processed (not new anymore)
    localStorage.removeItem('isNewAccount');
    
    console.log(`✅ Initialized new user account for ${userEmail}`);
}

// Add CSS animation styles to document if not already present
if (!document.getElementById('cart-animations-style')) {
    const style = document.createElement('style');
    style.id = 'cart-animations-style';
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
        
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(400px);
                opacity: 0;
            }
        }

        .empty-cart {
            text-align: center;
            padding: 60px 20px;
            color: #00d4ff;
            font-size: 18px;
        }

        .empty-cart-icon {
            font-size: 80px;
            margin-bottom: 20px;
        }

        .empty-cart-text {
            margin-bottom: 20px;
            font-weight: bold;
        }

        .empty-cart-btn {
            display: inline-block;
            padding: 10px 30px;
            background: linear-gradient(135deg, #00d4ff, #00a8cc);
            color: white;
            text-decoration: none;
            border-radius: 8px;
            margin-top: 20px;
            transition: all 0.3s ease;
        }

        .empty-cart-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 32px rgba(0, 212, 255, 0.3);
        }

        .cart-item-subtotal {
            color: #00d4ff;
            margin-top: 5px;
            font-size: 14px;
        }
    `;
    document.head.appendChild(style);
}

// ========== PRODUCTS DATABASE ==========

const productsDatabase = {
    // ملابس
    'shirt-001': {
        id: 'shirt-001',
        name: 'قميص رجالي كلاسيكي',
        category: 'ملابس وأحذية',
        price: 89.99,
        originalPrice: 129.99,
        rating: 4.5,
        reviewCount: 145,
        image: 'images/0950a0e8-7f10-4804-98a9-62039206aa80.jpg',
        images: ['images/0950a0e8-7f10-4804-98a9-62039206aa80.jpg'],
        description: 'قميص رجالي فاخر مصنوع من القطن الطبيعي 100% بجودة عالية. يتميز بتصميم كلاسيكي أنيق يناسب جميع المناسبات.',
        features: ['قطن طبيعي 100%', 'مريح وقابل للتنفس', 'خياطة محكمة', 'متوفر بألوان متعددة'],
        reviews: [{ name: 'أحمد محمد', rating: 5, date: '2024-01-02', text: 'منتج ممتاز جداً، جودة عالية وسعر مناسب' }]
    },
    'jeans-001': {
        id: 'jeans-001',
        name: 'بنطال جينز رجالي',
        category: 'ملابس وأحذية',
        price: 149.99,
        originalPrice: 199.99,
        rating: 4.3,
        reviewCount: 98,
        image: 'images/b666b5e1-4df9-4c22-9ef8-ce04ccd627.jpg',
        images: ['images/b666b5e1-4df9-4c22-9ef8-ce04ccd627.jpg'],
        description: 'بنطال جينز عصري بأسلوب كاجوال مريح. مصنوع من الجينز الكثيف الذي يدوم طويلاً.',
        features: ['جينز كثيف الوزن', 'تصميم عصري وكاجوال', 'سحابة جودة عالية'],
        reviews: [{ name: 'محمود حسن', rating: 5, date: '2024-01-02', text: 'جودة ممتازة والسعر مناسب جداً' }]
    },
    // إلكترونيات
    'phone-001': {
        id: 'phone-001',
        name: 'هاتف ذكي 5G',
        category: 'إلكترونيات',
        price: 799.99,
        originalPrice: 999.99,
        rating: 4.7,
        reviewCount: 523,
        image: 'images/cdd9565a-22a5-49f9-903a-ec55a93d54fa.jpg',
        images: ['images/cdd9565a-22a5-49f9-903a-ec55a93d54fa.jpg'],
        description: 'هاتف ذكي حديث بتقنية 5G سريعة. شاشة OLED بدقة عالية وكاميرا احترافية.',
        features: ['تقنية 5G', 'شاشة OLED 6.7 بوصة', 'كاميرا 48 ميجا بكسل'],
        reviews: [{ name: 'خالد إبراهيم', rating: 5, date: '2024-01-02', text: 'هاتف رائع جداً وسعر معقول!' }]
    },
    'laptop-001': {
        id: 'laptop-001',
        name: 'لابتوب احترافي',
        category: 'إلكترونيات',
        price: 1299.99,
        originalPrice: 1599.99,
        rating: 4.8,
        reviewCount: 412,
        image: 'images/4c84d7a6-8257-473a-846c-ef2d58c30b2f.jpg',
        images: ['images/4c84d7a6-8257-473a-846c-ef2d58c30b2f.jpg'],
        description: 'لابتوب احترافي خفيف وقوي. مصمم للعمل والإنتاجية العالية.',
        features: ['معالج Intel i7', 'ذاكرة رام 16GB', 'تخزين SSD 512GB'],
        reviews: [{ name: 'أنس محمود', rating: 5, date: '2024-01-02', text: 'لابتوب ممتاز وسريع جداً' }]
    },
    'camera-001': {
        id: 'camera-001',
        name: 'كاميرا ديجيتال احترافية',
        category: 'إلكترونيات',
        price: 899.99,
        originalPrice: 1199.99,
        rating: 4.6,
        reviewCount: 287,
        image: 'images/32618787-22d7-46e5-9f80-423e2b39f8a7.jpg',
        images: ['images/32618787-22d7-46e5-9f80-423e2b39f8a7.jpg'],
        description: 'كاميرا ديجيتال احترافية لالتقاط الصور والفيديوهات بدقة عالية.',
        features: ['45 ميجا بكسل', 'تسجيل فيديو 4K', 'عدسة احترافية'],
        reviews: [{ name: 'محمد حسين', rating: 5, date: '2024-01-02', text: 'كاميرا احترافية بسعر رائع' }]
    },
    // جمال
    'skincare-001': {
        id: 'skincare-001',
        name: 'مجموعة العناية بالبشرة',
        category: 'جمال وعناية',
        price: 59.99,
        originalPrice: 89.99,
        rating: 4.4,
        reviewCount: 178,
        image: 'images/5f1a3ca3-36b5-49f8-aa46-fe4d0a45c7fb.jpg',
        images: ['images/5f1a3ca3-36b5-49f8-aa46-fe4d0a45c7fb.jpg'],
        description: 'مجموعة شاملة للعناية بالبشرة تضم منتجات طبيعية للترطيب والتنعيم.',
        features: ['مكونات طبيعية 100%', 'مناسب للبشرة الحساسة', 'ترطيب عميق'],
        reviews: [{ name: 'حنان محمد', rating: 5, date: '2024-01-02', text: 'منتج رائع وبشرتي احسنت كثير' }]
    },
    'perfume-001': {
        id: 'perfume-001',
        name: 'عطر فاخر',
        category: 'جمال وعناية',
        price: 79.99,
        originalPrice: 119.99,
        rating: 4.7,
        reviewCount: 234,
        image: 'images/e3ce92e4-aaeb-4d95-ac7c-3c4fffa74128..jpg',
        images: ['images/e3ce92e4-aaeb-4d95-ac7c-3c4fffa74128..jpg'],
        description: 'عطر فاخر برائحة ساحرة وطويلة الأمد. مزيج متوازن من الروائح الراقية.',
        features: ['رائحة فاخرة', 'يدوم 12 ساعة', 'زجاجة أنيقة'],
        reviews: [{ name: 'نسرين أحمد', rating: 5, date: '2024-01-02', text: 'أفضل عطر شريته' }]
    },
    'makeup-001': {
        id: 'makeup-001',
        name: 'مجموعة مستحضرات التجميل',
        category: 'جمال وعناية',
        price: 49.99,
        originalPrice: 74.99,
        rating: 4.5,
        reviewCount: 312,
        image: 'images/7d7a0e08-5ebb-44ff-9b3c-286cc7a779ba.jpg',
        images: ['images/7d7a0e08-5ebb-44ff-9b3c-286cc7a779ba.jpg'],
        description: 'مجموعة شاملة من مستحضرات التجميل مثالية للاستخدام اليومي والمناسبات.',
        features: ['12 قطعة متنوعة', 'ألوان متعددة', 'ماركة عالمية'],
        reviews: [{ name: 'ميسون علي', rating: 5, date: '2024-01-02', text: 'مجموعة رائعة وسعر ممتاز' }]
    },
    // رياضة
    'shoes-001': {
        id: 'shoes-001',
        name: 'حذاء رياضي احترافي',
        category: 'رياضة وترفيه',
        price: 129.99,
        originalPrice: 179.99,
        rating: 4.6,
        reviewCount: 267,
        image: 'images/1f2269e3-3b3c-4c33-9bfe-606c60be3058.jpg',
        images: ['images/1f2269e3-3b3c-4c33-9bfe-606c60be3058.jpg'],
        description: 'حذاء رياضي احترافي بتقنية تقليل الصدمات للراحة والدعم أثناء الجري.',
        features: ['تقنية تقليل الصدمات', 'مادة شبك تهوية', 'نعل متين'],
        reviews: [{ name: 'سامي حسن', rating: 5, date: '2024-01-02', text: 'حذاء رياضي ممتاز ومريح جداً' }]
    },
    'dumbbells-001': {
        id: 'dumbbells-001',
        name: 'مجموعة أوزان تمرين',
        category: 'رياضة وترفيه',
        price: 89.99,
        originalPrice: 129.99,
        rating: 4.5,
        reviewCount: 145,
        image: 'images/def93bdc-ec4d-4423-b7fe-5a61d3f38e99.jpg',
        images: ['images/def93bdc-ec4d-4423-b7fe-5a61d3f38e99.jpg'],
        description: 'مجموعة أوزان تمرين احترافية مثالية للتمارين المنزلية والجيم.',
        features: ['معادن عالية الجودة', 'أوزان متنوعة', 'سهلة التخزين'],
        reviews: [{ name: 'حمزة إبراهيم', rating: 5, date: '2024-01-02', text: 'أوزان ممتازة وسعر معقول' }]
    },
    // منزل
    'pillow-001': {
        id: 'pillow-001',
        name: 'وسادة شاطئ فاخرة',
        category: 'منزل ومطبخ',
        price: 39.99,
        originalPrice: 59.99,
        rating: 4.4,
        reviewCount: 89,
        image: 'images/40acd78f-ff3c-4e91-9861-32406a7a6633.jpg',
        images: ['images/40acd78f-ff3c-4e91-9861-32406a7a6633.jpg'],
        description: 'وسادة شاطئ فاخرة توفر راحة قصوى ودعم للعنق والرأس.',
        features: ['دعم طبي للعنق', 'مادة قطنية ناعمة', 'قابلة للغسيل'],
        reviews: [{ name: 'فؤاد محمود', rating: 5, date: '2024-01-02', text: 'وسادة ممتازة، نومي أحسن' }]
    }
};

/**
 * Get all products (static + dynamic from seller)
 */
function getAllProducts() {
    let all = { ...productsDatabase };
    
    // Load seller products from localStorage
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        
        // Support boda_all_products, seller_products_ and partner_products_ keys
        if (key === 'boda_all_products' || key.startsWith('seller_products_') || key.startsWith('partner_products_')) {
            try {
                const sellerProducts = JSON.parse(localStorage.getItem(key));
                if (Array.isArray(sellerProducts)) {
                    sellerProducts.forEach(p => {
                        // Avoid duplicates if same product exists in multiple keys
                        if (!all[p.id]) {
                            // استخرج معرف البائع من مفتاح localStorage إذا لم يكن موجوداً
                            let sellerEmail = p.sellerEmail || p.seller_email || p.seller;
                            if (!sellerEmail && key.startsWith('seller_products_')) {
                                sellerEmail = key.replace('seller_products_', '');
                            }
                            
                            all[p.id] = {
                                id: p.id,
                                name: p.productName || p.name,
                                category: p.category,
                                price: parseFloat(p.price),
                                originalPrice: parseFloat(p.discountPrice || p.originalPrice || p.price),
                                discountPrice: p.discountPrice ? parseFloat(p.discountPrice) : null,
                                rating: parseFloat(p.rating || 0),
                                reviewCount: parseInt(p.reviewCount || 0),
                                image: p.image || (p.images && p.images[0]) || 'images/placeholder.jpg',
                                images: p.images || [p.image] || [], // Support multiple images
                                description: p.description || 'لا يوجد وصف متاح لهذا المنتج.',
                                reviews: p.reviews || [],
                                stockStatus: p.stockStatus || 'in_stock',
                                stock: p.stock || 0,
                                seller: p.seller || (sellerEmail ? sellerEmail.split('@')[0] : 'boda'),
                                seller_email: sellerEmail || 'boda@platform.com',
                                sellerEmail: sellerEmail || 'boda@platform.com'
                            };
                        }
                    });
                }
            } catch(e) { console.error("Error loading products:", e); }
        }
    }
    return all;
}

/**
 * Get product by ID
 */
function getProductById(id) {
    const all = getAllProducts();
    return all[id] || null;
}

// ========== PRODUCT DETAIL FUNCTIONS ==========

/**
 * Render stars for rating
 */
function renderStars(rating) {
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;
    
    // Using FontAwesome icons if available, otherwise fallback to stars
    return '<i class="fa-solid fa-star"></i>'.repeat(full) + 
           (half ? '<i class="fa-solid fa-star-half-stroke"></i>' : '') + 
           '<i class="fa-regular fa-star"></i>'.repeat(empty);
}

/**
 * Navigate to product detail page
 */
function viewProduct(productId) {
    const isSubPage = window.location.pathname.includes('/pages/');
    window.location.href = isSubPage ? `product.html?id=${productId}` : `pages/product.html?id=${productId}`;
}

/**
 * Toggle wishlist for a product
 */
function toggleWishlist(productId) {
    // ✅ فحص تسجيل الدخول
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    if (!isLoggedIn) {
        showNotification('❌ يجب تسجيل الدخول أولاً لإضافة المفضلة');
        setTimeout(() => {
            window.location.href = '/pages/login.html';
        }, 1500);
        return;
    }
    
    const allProducts = getAllProducts();
    const product = allProducts[productId];
    if (!product) return;

    const wishlist = getWishlist();
    const existingIndex = wishlist.findIndex(item => item.id === productId);

    if (existingIndex !== -1) {
        // إزالة من المفضلة
        wishlist.splice(existingIndex, 1);
        saveWishlist(wishlist);
        showNotification(`تم إزالة "${product.name}" من المفضلة ❌`, 'warning');
    } else {
        // إضافة للمفضلة
        wishlist.push(product);
        saveWishlist(wishlist);
        showNotification(`تم إضافة "${product.name}" إلى المفضلة! ❤️`, 'success');
    }
    
    // Update UI if renderWishlist function exists (on wishlist.html)
    if (typeof renderWishlist === 'function') {
        renderWishlist();
    }
    
    // Update wishlist button state if we are on product.html
    const wishlistBtn = document.getElementById('wishlistBtn');
    if (wishlistBtn) {
        const isInWishlist = getWishlist().some(item => item.id === productId);
        wishlistBtn.classList.toggle('active', isInWishlist);
    }
}

/**
 * Remove product from wishlist
 */
function removeFromWishlist(productId) {
    let wishlist = getWishlist();
    wishlist = wishlist.filter(item => item.id !== productId);
    saveWishlist(wishlist);
    showNotification('تم إزالة المنتج من المفضلة ❌', 'warning');
}

// ========== PROMO IMAGE SLIDER ==========

/**
 * Auto-sliding promo images
 */
let promoImages = document.querySelectorAll('.promo-image');
let currentPromoIndex = 0;

function showNextPromoImage() {
    if (promoImages.length > 0) {
        promoImages[currentPromoIndex].classList.remove('active');
        currentPromoIndex = (currentPromoIndex + 1) % promoImages.length;
        promoImages[currentPromoIndex].classList.add('active');
    }
}

// Start the slider when page loads
document.addEventListener('DOMContentLoaded', function() {
    if (promoImages.length > 0) {
        promoImages[0].classList.add('active'); // Show first image initially
        setInterval(showNextPromoImage, 3000); // Change every 3 seconds
    }
});
