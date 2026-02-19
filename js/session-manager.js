/**
 * BODA E-Commerce - Session Manager
 * Centralized session handling and UI updates.
 */

class BODASessionManager {
    constructor() {
        this.isLoggedIn = false;
        this.userData = null;
        this.init();
    }

    async init() {
        await this.checkSession();
        this.updateUI();
        
        // Signal that session is ready
        document.dispatchEvent(new CustomEvent('sessionReady', { detail: { isLoggedIn: this.isLoggedIn, userData: this.userData } }));
        
        // Listen for storage changes (for multi-tab support)
        window.addEventListener('storage', (e) => {
            if (e.key === 'userEmail') {
                this.checkSession().then(() => this.updateUI());
            }
        });
    }

    async checkSession() {
        try {
            // Priority 1: Check sessionStorage (for Mock API)
            const userId = sessionStorage.getItem('user_id');
            const userName = sessionStorage.getItem('user_name');
            const userEmail = sessionStorage.getItem('user_email');

            if (userId && userName && userEmail) {
                this.isLoggedIn = true;
                this.userData = {
                    name: userName,
                    email: userEmail,
                    role: sessionStorage.getItem('user_role') || localStorage.getItem('userRole') || 'customer'
                };
                // Sync with localStorage for quick access
                localStorage.setItem('userEmail', userEmail);
                localStorage.setItem('userFullName', userName);
                localStorage.setItem('isLoggedIn', 'true');
                sessionStorage.setItem('user_role', this.userData.role);
                return;
            }

            // Priority 2: Check localStorage as fallback
            const localEmail = localStorage.getItem('userEmail');
            const localName = localStorage.getItem('userFullName');
            
            if (localEmail && localName) {
                this.isLoggedIn = true;
                this.userData = {
                    name: localName,
                    email: localEmail,
                    role: sessionStorage.getItem('user_role') || localStorage.getItem('userRole') || 'customer'
                };
                // Restore to sessionStorage
                sessionStorage.setItem('user_id', 'user_' + Date.now());
                sessionStorage.setItem('user_name', localName);
                sessionStorage.setItem('user_email', localEmail);
                sessionStorage.setItem('user_role', this.userData.role);
                return;
            }

            // Priority 3: Try API (for PHP backend if available)
            try {
                const response = await bodaAPI.checkSession();
                if (response.status === 'success') {
                    this.isLoggedIn = true;
                    this.userData = response.data;
                    this.userData.role = sessionStorage.getItem('user_role') || localStorage.getItem('userRole') || 'customer';
                    localStorage.setItem('userEmail', this.userData.email);
                    localStorage.setItem('userFullName', this.userData.name);
                    localStorage.setItem('isLoggedIn', 'true');
                    sessionStorage.setItem('user_role', this.userData.role);
                    return;
                }
            } catch (e) {
                console.log('API check failed, using storage fallback');
            }

            // Not logged in
            this.handleLoggedOutState();
        } catch (error) {
            console.error('Session check error:', error);
            this.handleLoggedOutState();
        }
    }

    handleLoggedOutState() {
        this.isLoggedIn = false;
        this.userData = null;
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userFullName');
    }

    updateUI() {
        const loginLink = document.getElementById('login-link');
        const userMenu = document.getElementById('user-menu');
        
        if (this.isLoggedIn && this.userData) {
            if (loginLink) loginLink.style.display = 'none';
            
            // Show user info securely
            this.renderUserMenu();
        } else {
            if (loginLink) loginLink.style.display = 'block';
            if (userMenu) userMenu.remove();
        }
    }

    renderUserMenu() {
        let userMenu = document.getElementById('user-menu');
        if (!userMenu) {
            userMenu = document.createElement('div');
            userMenu.id = 'user-menu';
            userMenu.className = 'user-menu';
            
            const nav = document.querySelector('.nav-menu');
            if (nav) nav.appendChild(userMenu);
        }

        // Use textContent to prevent XSS
        userMenu.innerHTML = '';
        
        // Create container for avatar and dropdown
        const userMenuContainer = document.createElement('div');
        userMenuContainer.className = 'user-menu-container';
        userMenuContainer.style.display = 'flex';
        userMenuContainer.style.alignItems = 'center';
        userMenuContainer.style.gap = '0.5rem';
        userMenuContainer.style.position = 'relative';

        // Create avatar element
        const avatar = document.createElement('div');
        avatar.className = 'user-avatar';
        avatar.id = 'user-avatar';
        
        // Get user name initials for avatar background
        const initials = this.userData.name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
        
        avatar.textContent = initials;
        avatar.style.cssText = `
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: linear-gradient(135deg, #00d4ff, #0099cc);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 16px;
            cursor: pointer;
            border: 2px solid #00d4ff;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 2px 8px rgba(0, 212, 255, 0.2);
            user-select: none;
        `;
        
        // Add hover effect
        avatar.onmouseover = () => {
            avatar.style.boxShadow = '0 0 20px rgba(0, 212, 255, 0.5), inset 0 0 10px rgba(0, 212, 255, 0.2)';
            avatar.style.transform = 'scale(1.15) rotate(5deg)';
            avatar.style.borderColor = '#00ffd9';
        };
        avatar.onmouseout = () => {
            avatar.style.boxShadow = '0 2px 8px rgba(0, 212, 255, 0.2)';
            avatar.style.transform = 'scale(1) rotate(0deg)';
            avatar.style.borderColor = '#00d4ff';
        };

        // Create dropdown menu
        const dropdown = document.createElement('div');
        dropdown.className = 'user-dropdown';
        dropdown.id = 'user-dropdown';
        dropdown.style.cssText = `
            position: absolute;
            top: 50px;
            right: 0;
            background: linear-gradient(135deg, #ffffff 0%, #f5fbff 100%);
            border: 2px solid #00d4ff;
            border-radius: 12px;
            min-width: 220px;
            box-shadow: 0 10px 30px rgba(0, 212, 255, 0.25);
            display: none;
            z-index: 1000;
            overflow: hidden;
            animation: slideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        `;

        // Add animation styles
        if (!document.querySelector('style[data-user-menu-animations]')) {
            const animStyle = document.createElement('style');
            animStyle.setAttribute('data-user-menu-animations', 'true');
            animStyle.textContent = `
                @keyframes slideDown {
                    from {
                        opacity: 0;
                        transform: translateY(-10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                @keyframes slideUp {
                    from {
                        opacity: 1;
                        transform: translateY(0);
                    }
                    to {
                        opacity: 0;
                        transform: translateY(-10px);
                    }
                }
            `;
            document.head.appendChild(animStyle);
        }

        // Add user info section
        const userInfo = document.createElement('div');
        userInfo.style.cssText = `
            padding: 16px;
            border-bottom: 1px solid rgba(0, 212, 255, 0.1);
            background: linear-gradient(135deg, rgba(0, 212, 255, 0.05), rgba(0, 212, 255, 0.02));
        `;
        
        const userName = document.createElement('div');
        userName.textContent = this.userData.name;
        userName.style.cssText = `
            font-weight: bold;
            color: #00d4ff;
            margin-bottom: 6px;
            font-size: 15px;
            letter-spacing: 0.3px;
        `;
        
        const userEmail = document.createElement('div');
        userEmail.textContent = this.userData.email;
        userEmail.style.cssText = `
            font-size: 12px;
            color: #666;
            word-break: break-word;
            font-family: 'Courier New', monospace;
        `;
        
        userInfo.append(userName, userEmail);
        dropdown.appendChild(userInfo);

        // Add user role if available
        if (this.userData.role && this.userData.role !== 'customer') {
            const userRole = document.createElement('div');
            userRole.style.cssText = `
                padding: 8px 15px;
                background: #f0f0f0;
                font-size: 12px;
                color: #00d4ff;
                font-weight: bold;
                border-bottom: 1px solid #e0e0e0;
            `;
            userRole.textContent = `👤 ${this.userData.role}`;
            dropdown.appendChild(userRole);
        }

        // Add logout button
        const logoutBtn = document.createElement('button');
        logoutBtn.textContent = '🚪 تسجيل الخروج';
        logoutBtn.className = 'btn-logout-dropdown';
        logoutBtn.style.cssText = `
            width: 100%;
            padding: 14px 16px;
            border: none;
            background: linear-gradient(135deg, #ff6b6b, #ff5252);
            color: white;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            text-align: right;
            direction: rtl;
            letter-spacing: 0.5px;
        `;
        logoutBtn.onmouseover = () => {
            logoutBtn.style.background = 'linear-gradient(135deg, #ff5252, #ff3838)';
            logoutBtn.style.transform = 'translateX(-3px)';
            logoutBtn.style.boxShadow = '0 5px 15px rgba(255, 75, 43, 0.3)';
        };
        logoutBtn.onmouseout = () => {
            logoutBtn.style.background = 'linear-gradient(135deg, #ff6b6b, #ff5252)';
            logoutBtn.style.transform = 'translateX(0)';
            logoutBtn.style.boxShadow = 'none';
        };
        logoutBtn.onmousedown = () => {
            logoutBtn.style.transform = 'translateX(-3px) scale(0.98)';
        };
        logoutBtn.onmouseup = () => {
            logoutBtn.style.transform = 'translateX(-3px)';
        };
        logoutBtn.onclick = () => this.logout();
        dropdown.appendChild(logoutBtn);

        // Toggle dropdown on avatar click
        avatar.onclick = (e) => {
            e.stopPropagation();
            const isVisible = dropdown.style.display === 'block';
            
            if (!isVisible) {
                // Opening dropdown
                dropdown.style.animation = 'slideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
                dropdown.style.display = 'block';
                avatar.style.borderColor = '#00ffd9';
            } else {
                // Closing dropdown
                dropdown.style.animation = 'slideUp 0.2s cubic-bezier(0.4, 0, 0.2, 1)';
                setTimeout(() => {
                    dropdown.style.display = 'none';
                    avatar.style.borderColor = '#00d4ff';
                }, 200);
            }
        };

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!userMenuContainer.contains(e.target)) {
                dropdown.style.animation = 'slideUp 0.2s cubic-bezier(0.4, 0, 0.2, 1)';
                setTimeout(() => {
                    dropdown.style.display = 'none';
                    avatar.style.borderColor = '#00d4ff';
                }, 200);
            }
        });

        userMenuContainer.append(avatar, dropdown);
        userMenu.appendChild(userMenuContainer);
    }

    async logout() {
        try {
            console.log('Starting logout process...');
            
            // تنظيف البيانات محلياً أولاً قبل محاولة API
            this.handleLoggedOutState();
            
            // محاولة تنبيه API (لكن لا نتوقف عليها)
            try {
                await bodaAPI.logout();
            } catch (e) {
                console.warn('API logout warning (non-blocking):', e);
                // نستمر حتى لو فشل API
            }
            
            console.log('Logout completed, clearing everything');
            
            // تنظيف شامل من جميع التخزينات
            localStorage.clear();
            sessionStorage.clear();
            
            // إعادة تحديث واجهة المستخدم
            this.updateUI();
            
            // توجيه آمن مع تأخير صغير للتأكد من التنظيف
            setTimeout(() => {
                const isSubPage = window.location.pathname.includes('/pages/');
                window.location.href = isSubPage ? '../pages/login.html' : 'pages/login.html';
            }, 300);
            
        } catch (error) {
            console.error('Logout error:', error);
            
            // حتى عند حدوث خطأ، نذهب لصفحة تسجيل الدخول
            localStorage.clear();
            sessionStorage.clear();
            
            setTimeout(() => {
                const isSubPage = window.location.pathname.includes('/pages/');
                window.location.href = isSubPage ? '../pages/login.html' : 'pages/login.html';
            }, 300);
        }
    }
}

// Global instance
const bodaSession = new BODASessionManager();
