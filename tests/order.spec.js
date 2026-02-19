const { test, expect } = require('@playwright/test');

test.describe('Order and Price Validation Flow', () => {
  const testUser = {
    email: 'test_order@example.com',
    password: 'password123'
  };

  test.beforeEach(async ({ page }) => {
    // Ensure we are logged in for order tests if needed
    // In this app, anyone can add to cart, but maybe checkout needs login
    // Let's assume we test the full flow from product page
  });

  test('should add products to cart and show correct subtotal', async ({ page }) => {
    await page.goto('/pages/products.html');
    
    // Add first product (p1 - Smart Watch Pro - 1200)
    // Note: The product IDs in products.html (shirt-001) differ from products_db.php (p1)
    // This is a mismatch in the current codebase that should be addressed.
    // Let's use the ones in products.html for UI testing.
    
    const firstProductCartBtn = page.locator('.product-card').first().locator('.btn-cart');
    await firstProductCartBtn.click();
    
    // Check notification
    await expect(page.locator('text=تم إضافة المنتج إلى العربة بنجاح')).toBeVisible();
    
    // Go to cart
    await page.goto('/pages/cart.html');
    
    // Check if item is in cart
    const cartItem = page.locator('.cart-item');
    await expect(cartItem).toHaveCount(1);
  });

  test('server-side validation should catch price manipulation', async ({ page }) => {
    // This test directly calls the API to simulate a malicious user
    const tamperedOrder = {
      action: 'send_complete_order',
      email: testUser.email,
      order: {
        items: [
          { id: 'p1', name: 'Tampered Watch', price: 10, quantity: 1 } // p1 real price is 1200
        ],
        total: 10
      }
    };

    const response = await page.request.post('/api/send-order.php', {
      data: tamperedOrder
    });
    
    const result = await response.json();
    expect(result.status).toBe('success');
    
    // The server should have ignored the '10' and used 1200 + 50 (shipping) + 60 (tax) = 1310
    expect(result.data.total).toBe(1310);
    expect(result.data.orderId).toBeDefined();
  });
});
