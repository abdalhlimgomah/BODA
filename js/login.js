// Professional Login/Register System
// Integrates with BODA PHP API

let isRegistering = false;

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('login');
    if (loginForm) loginForm.addEventListener('submit', handleLogin);

    const registerForm = document.getElementById('register');
    if (registerForm) registerForm.addEventListener('submit', handleRegister);

    const googleBtn = document.getElementById('google-login-btn');
    if (googleBtn) googleBtn.addEventListener('click', handleGoogleAuth);

    updateCartCount();
    checkExistingSession();
});

/**
 * Handle login form submission
 */
async function handleLogin(e) {
    e.preventDefault();

    const email = document.querySelector('#login input[name="email"]').value.trim().toLowerCase();
    const password = document.querySelector('#login input[name="password"]').value;
    const submitBtn = e.target.querySelector('button[type="submit"]');

    if (!email || !password) {
        showAuthMessage('يرجى إدخال البريد الإلكتروني وكلمة المرور', 'error');
        return;
    }

    try {
        setButtonLoading(submitBtn, 'جاري تسجيل الدخول...');
        const response = await bodaAPI.login(email, password);
        
        if (response.status === 'success') {
            // حفظ بيانات المستخدم
            localStorage.setItem('userEmail', response.data.email);
            localStorage.setItem('userFullName', response.data.name);
            localStorage.setItem('isLoggedIn', 'true');
            sessionStorage.setItem('user_role', 'customer');
            localStorage.setItem('userRole', 'customer');
            
            showAuthMessage('تم تسجيل الدخول بنجاح!', 'success');
            
            const params = new URLSearchParams(window.location.search);
            const redirectPage = params.get('redirect');
            
            if (redirectPage) {
                // If redirect is present, go there (safely)
                const safePages = ['orders', 'products-management', 'cart'];
                if (safePages.includes(redirectPage)) {
                    window.location.href = redirectPage + '.html';
                } else {
                    window.location.href = '../index.html';
                }
            } else {
                window.location.href = '../index.html';
            }
        } else {
            showAuthMessage(response.message || 'فشل تسجيل الدخول', 'error');
        }

    } catch (error) {
        showAuthMessage(error.message || 'فشل تسجيل الدخول. تأكد من البيانات.', 'error');
    } finally {
        setButtonLoading(submitBtn, null);
    }
}

/**
 * Handle register form submission with Email OTP Verification
 */
async function handleRegister(e) {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    if (submitBtn.disabled || isRegistering) return;
    isRegistering = true;

    const fullName = document.querySelector('#register input[name="fullName"]').value.trim();
    const email = document.querySelector('#register input[name="email"]').value.trim().toLowerCase();
    const phone = document.querySelector('#register input[name="phone"]').value.trim();
    const password = document.querySelector('#register input[name="password"]').value;
    const confirmPassword = document.querySelector('#register input[name="confirmPassword"]').value;

    if (password !== confirmPassword) {
        showAuthMessage('كلمات المرور غير متطابقة', 'error');
        return;
    }

    if (fullName.length < 3 || !email || password.length < 6) {
        showAuthMessage('يرجى التأكد من صحة البيانات (كلمة المرور 6 أحرف على الأقل)', 'error');
        return;
    }

    try {
        setButtonLoading(submitBtn, 'جاري إنشاء الحساب...');
        const response = await bodaAPI.register({ fullName, email, phone, password });
        if (response.status === 'success') {
            showAuthMessage(response.message || 'تم إنشاء الحساب بنجاح', 'success');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1600);
        } else {
            showAuthMessage(response.message || 'فشل عملية التسجيل.', 'error');
        }
    } catch (error) {
        showAuthMessage(error.message || 'فشل عملية التسجيل.', 'error');
    } finally {
        setButtonLoading(submitBtn, null);
    }
}

function updateCartCount() {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    const cartCountElement = document.getElementById('cart-count');
    if (cartCountElement) {
        cartCountElement.textContent = cart.length;
    }
}

async function handleGoogleAuth() {
    try {
        showAuthMessage('جاري تحويلك إلى Google...', 'success');
        const response = await bodaAPI.loginWithGoogle();
        if (response.status === 'error') {
            showAuthMessage(response.message || 'تعذر تسجيل الدخول عبر Google', 'error');
        }
    } catch (error) {
        showAuthMessage(error.message || 'تعذر تسجيل الدخول عبر Google', 'error');
    }
}

async function checkExistingSession() {
    try {
        const response = await bodaAPI.checkSession();
        if (response.status === 'success') {
            localStorage.setItem('userEmail', response.data.email);
            localStorage.setItem('userFullName', response.data.name);
            localStorage.setItem('isLoggedIn', 'true');
            sessionStorage.setItem('user_role', 'customer');
            localStorage.setItem('userRole', 'customer');
        }
    } catch (error) {}
}

function showAuthMessage(message, type) {
    const messageEl = document.getElementById('auth-message');
    if (!messageEl) {
        if (type === 'error') {
            alert(message);
        }
        return;
    }
    messageEl.textContent = message;
    messageEl.classList.remove('success', 'error');
    if (type) messageEl.classList.add(type);
}

function setButtonLoading(button, loadingText) {
    if (!button) return;
    if (!button.dataset.originalText) {
        button.dataset.originalText = button.textContent;
    }
    if (loadingText) {
        button.disabled = true;
        button.textContent = loadingText;
    } else {
        button.disabled = false;
        button.textContent = button.dataset.originalText || button.textContent;
    }
}

async function logout() {
    try {
        await bodaAPI.logout();
        localStorage.clear();
        window.location.href = '../pages/login.html';
    } catch (error) {
        console.error('Logout failed:', error);
    }
}
