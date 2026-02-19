const { test, expect } = require('@playwright/test');

test.describe('Security and Authentication Flow', () => {
  const testUser = {
    fullName: 'Test User',
    email: `test_${Date.now()}@example.com`,
    password: 'password123'
  };

  test('should register a new user and login automatically', async ({ page }) => {
    await page.goto('/pages/register.html');
    
    await page.fill('input[name="fullName"]', testUser.fullName);
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.click('button[type="submit"]');

    // Should redirect or show success message
    await expect(page).toHaveURL(/.*index.html|.*products.html/);
    
    // Verify session via API check
    const sessionResponse = await page.request.get('/api/auth.php?action=check_session');
    const sessionData = await sessionResponse.json();
    expect(sessionData.status).toBe('success');
    expect(sessionData.data.email).toBe(testUser.email);
  });

  test('should fail login with incorrect credentials', async ({ page }) => {
    await page.goto('/pages/login.html');
    
    await page.fill('input[name="email"]', 'wrong@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Should show error message
    const errorMsg = page.locator('.error-message');
    await expect(errorMsg).toBeVisible();
  });

  test('should prevent access to protected pages when not logged in', async ({ page }) => {
    // Logout first to be sure
    await page.request.post('/api/auth.php?action=logout');
    
    await page.goto('/pages/orders.html');
    // Depending on implementation, it might redirect to login or show error
    // If it uses requireAuth() on API, the frontend should handle it
    await expect(page).toHaveURL(/.*login.html/);
  });

  test('server-side price validation should prevent tampering', async ({ page }) => {
    // Login
    await page.goto('/pages/login.html');
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.click('button[type="submit"]');

    // Tamper with order data in a direct API call
    const tamperedOrder = {
      action: 'send_complete_order',
      email: testUser.email,
      order: {
        items: [
          { id: 'p1', name: 'Tampered Product', price: 1.00, quantity: 1 }
        ],
        total: 1.00 // User tries to set price to 1.00
      }
    };

    const response = await page.request.post('/api/send-order.php', {
      data: tamperedOrder
    });
    
    const result = await response.json();
    expect(result.status).toBe('success');
    
    // Total should be re-calculated on server, not the tampered 1.00
    // p1 price is 1200, + 20 shipping + 5% tax = 1200 + 60 + 20 = 1280
    expect(result.data.total).toBe(1280);
  });

  test('XSS protection: UI should not execute injected scripts', async ({ page }) => {
    const maliciousName = '<script>alert("XSS")</script><b>Injected</b>';
    
    await page.goto('/pages/register.html');
    await page.fill('input[name="fullName"]', maliciousName);
    await page.fill('input[name="email"]', `xss_${Date.now()}@example.com`);
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Go to profile or wherever name is displayed
    // Assuming name is displayed on home page after login
    await page.goto('/index.html');
    
    const userNameElement = page.locator('#user-name'); // Adjust selector as needed
    // textContent should contain the literal script tag, not be rendered as HTML
    await expect(userNameElement).toHaveText(maliciousName);
    
    // Check that <b> tag is not rendered as an element
    const boldElement = page.locator('#user-name b');
    await expect(boldElement).toHaveCount(0);
  });
});
