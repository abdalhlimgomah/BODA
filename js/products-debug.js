/**
 * Products Page Debug Helper
 * Add this to help debug the products display issue
 */

console.log('Products Debug Helper Loaded');

// Check if script.js is loaded
window.addEventListener('load', () => {
    console.log('=== Products Page Status ===');
    
    // Check if functions exist
    const functions = [
        'getAllProducts',
        'displayProducts',
        'filterProducts',
        'sortProducts',
        'addToCart',
        'getImagePath',
        'renderStars',
        'viewProduct',
        'toggleWishlist',
        'updateCartCount',
        'showNotification'
    ];
    
    console.log('\n=== Required Functions ===');
    functions.forEach(func => {
        const exists = typeof window[func] === 'function';
        console.log(`${func}: ${exists ? '✓' : '✗'}`);
    });
    
    // Check if DOM elements exist
    console.log('\n=== Required Elements ===');
    const elements = [
        'productsGrid',
        'productsList',
        'searchInput',
        'categoryFilter',
        'sortFilter',
        'gridView',
        'listView',
        'productsStats'
    ];
    
    elements.forEach(id => {
        const el = document.getElementById(id);
        console.log(`#${id}: ${el ? '✓' : '✗'}`);
    });
    
    // Check products data
    console.log('\n=== Products Data ===');
    if (typeof getAllProducts === 'function') {
        try {
            const products = getAllProducts();
            const productArray = Object.values(products);
            console.log(`Products loaded: ${productArray.length}`);
            
            if (productArray.length > 0) {
                console.log('Sample product:', productArray[0]);
            }
        } catch (e) {
            console.error('Error loading products:', e);
        }
    }
    
    // Check localStorage
    console.log('\n=== localStorage ===');
    console.log('cart:', localStorage.getItem('cart') ? 'Yes' : 'No');
    console.log('wishlist:', localStorage.getItem('wishlist') ? 'Yes' : 'No');
    console.log('boda_all_products:', localStorage.getItem('boda_all_products') ? 'Yes' : 'No');
    
    // Run initialization test
    console.log('\n=== Initialization Test ===');
    testProductsDisplay();
});

function testProductsDisplay() {
    console.log('Testing products display...');
    
    try {
        if (typeof getAllProducts === 'function') {
            const products = getAllProducts();
            const productArray = Object.values(products);
            
            if (productArray.length === 0) {
                console.warn('⚠️ No products found!');
            } else {
                console.log(`✓ Found ${productArray.length} products`);
                
                // Try to display products
                if (typeof displayProducts === 'function') {
                    console.log('Attempting to display products...');
                    // This should be called after page load
                } else {
                    console.error('✗ displayProducts function not found');
                }
            }
        } else {
            console.error('✗ getAllProducts function not found');
        }
    } catch (error) {
        console.error('Test failed:', error);
    }
}

// Add this test function for manual testing
window.productsTest = {
    reload: function() {
        console.log('Reloading products...');
        location.reload();
    },
    
    checkAll: function() {
        testProductsDisplay();
    },
    
    manualDisplay: function() {
        if (typeof getAllProducts === 'function') {
            window.allProducts = Object.values(getAllProducts());
            window.filteredProducts = [...window.allProducts];
            
            if (typeof displayProducts === 'function') {
                displayProducts();
                console.log('✓ Products displayed manually');
            }
        }
    },
    
    showFirstProduct: function() {
        if (typeof getAllProducts === 'function') {
            const products = Object.values(getAllProducts());
            if (products.length > 0) {
                console.log('First product:', products[0]);
            }
        }
    },
    
    listCategories: function() {
        if (typeof getAllProducts === 'function') {
            const products = Object.values(getAllProducts());
            const categories = [...new Set(products.map(p => p.category))];
            console.log('Categories:', categories);
        }
    }
};

console.log('Test functions available:');
console.log('- productsTest.reload()');
console.log('- productsTest.checkAll()');
console.log('- productsTest.manualDisplay()');
console.log('- productsTest.showFirstProduct()');
console.log('- productsTest.listCategories()');
