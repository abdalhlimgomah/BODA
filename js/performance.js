// ========== PERFORMANCE OPTIMIZATIONS ==========

/**
 * تفعيل Intersection Observer للـ Lazy Loading المتقدم
 */
function initLazyLoading() {
    if ('IntersectionObserver' in window) {
        const images = document.querySelectorAll('img[loading="lazy"]');
        
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    
                    // تحميل الصورة
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                    }
                    if (img.dataset.srcset) {
                        img.srcset = img.dataset.srcset;
                    }
                    
                    img.classList.add('loaded');
                    observer.unobserve(img);
                }
            });
        }, {
            rootMargin: '50px 0px',
            threshold: 0.01
        });

        images.forEach(img => imageObserver.observe(img));
    }
}

/**
 * تحسين الأداء - تقليل استهلاك البيانات على الاتصالات البطيئة
 */
function checkConnectionSpeed() {
    if ('connection' in navigator) {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        
        if (connection) {
            const effectiveType = connection.effectiveType; // '4g', '3g', '2g', 'slow-2g'
            
            if (effectiveType === '2g' || effectiveType === 'slow-2g' || effectiveType === '3g') {
                // تعطيل الصور عالية الدقة
                document.documentElement.classList.add('low-bandwidth');
                
                // تقليل جودة الصور
                const images = document.querySelectorAll('img');
                images.forEach(img => {
                    img.loading = 'lazy';
                });
            }
        }
    }
}

/**
 * تحسين الأداء - تقليل الحركات على الأجهزة منخفضة الموارد
 */
function optimizeAnimations() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        document.documentElement.classList.add('reduce-motion');
    }
}

/**
 * مراقبة استخدام الذاكرة والمعالج
 */
function monitorPerformance() {
    if ('memory' in performance) {
        setInterval(() => {
            const memory = performance.memory;
            const usagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
            
            if (usagePercent > 90) {
                console.warn('⚠️ استخدام الذاكرة مرتفع:', usagePercent.toFixed(2) + '%');
                // تنظيف الذاكرة إذا لزم الأمر
                if (window.gc) {
                    window.gc();
                }
            }
        }, 10000);
    }
}

/**
 * تحسين الأداء - معالجة النوافذ المنبثقة بكفاءة
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * تحسين الأداء - التحميل الكسول للبيانات
 */
function lazyLoadData(url, callback) {
    const script = document.createElement('script');
    script.src = url;
    script.onload = callback;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
}

/**
 * تقليل حجم الصور تلقائياً
 */
function optimizeImages() {
    const images = document.querySelectorAll('img');
    
    images.forEach(img => {
        // إضافة srcset للصور المختلفة
        if (!img.srcset) {
            // تعديل الصور ليكون لها نسخ متعددة
            const src = img.src;
            if (src) {
                // استخدام صيغ مختلفة للصور بناءً على الدقة
                img.loading = 'lazy';
                img.decoding = 'async';
            }
        }
    });
}

/**
 * تحسين الأداء - استخدام Service Worker للتخزين المؤقت
 */
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        // يمكنك إنشاء service worker لاحقاً
        // navigator.serviceWorker.register('/sw.js');
    }
}

/**
 * تحسين الأداء - تقليل عدد الانتقالات CSS
 */
function minimizeTransitions() {
    // تقليل الانتقالات من 0.3s إلى 0.15s على الأجهزة منخفضة الموارد
    if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) {
        document.document.setProperty('--transition-time', '0.15s');
    }
}

/**
 * تحسين الأداء - معالجة النقرات بكفاءة
 */
function optimizeClickHandling() {
    document.addEventListener('touchstart', function() {}, { passive: true });
    document.addEventListener('touchmove', function() {}, { passive: true });
    document.addEventListener('touchend', function() {}, { passive: true });
}

// ========== INITIALIZATION ==========

// تشغيل جميع تحسينات الأداء عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    initLazyLoading();
    checkConnectionSpeed();
    optimizeAnimations();
    optimizeImages();
    minimizeTransitions();
    optimizeClickHandling();
    monitorPerformance();
});

// تفعيل requestIdleCallback للمهام غير الحرجة
if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
        registerServiceWorker();
    });
}
