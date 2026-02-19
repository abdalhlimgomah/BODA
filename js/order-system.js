/**
 * BODA E-Commerce - Professional Order System
 * Handles order submission and secure UI updates.
 */

class OrderManagementSystem {
    constructor() {
        this.whatsappPhone = '201121068271';
    }

    /**
     * Create local order preview
     */
    createOrderPreview(paymentMethod = 'Cash') {
        const cart = JSON.parse(localStorage.getItem('cart') || '[]');
        
        return {
            items: cart.map(item => ({
                id: item.id,
                name: item.name,
                price: item.price,
                quantity: item.quantity
            })),
            paymentMethod: paymentMethod === 'card' ? 'بطاقة ائتمانية' : 'دفع عند الاستلام'
        };
    }

    /**
     * Submit order to secure PHP API
     */
    async submitOrder(email, paymentMethod) {
        try {
            if (!email) throw new Error('البريد الإلكتروني مطلوب');
            
            const orderPreview = this.createOrderPreview(paymentMethod);
            if (orderPreview.items.length === 0) throw new Error('السلة فارغة');

            console.log('📤 Submitting order...');
            
            const response = await bodaAPI.sendOrder(orderPreview, email);
            
            // Handle Success
            this.showSuccessMessage(response.data.orderId);
            
            // Clear cart
            localStorage.removeItem('cart');
            
            return response.data;

        } catch (error) {
            this.showErrorMessage(error.message || 'فشل إرسال الطلب');
            throw error;
        }
    }

    /**
     * Build WhatsApp Message (Client side helper)
     */
    openWhatsApp(orderId, total) {
        const message = `🛒 *BODA Order #${orderId}*\nTotal: ${total} ج.م\nتم استلام الطلب بنجاح!`;
        const encodedMessage = encodeURIComponent(message);
        window.open(`https://wa.me/${this.whatsappPhone}?text=${encodedMessage}`, '_blank');
    }

    /**
     * Professional UI Feedback (XSS Safe)
     */
    showSuccessMessage(orderId) {
        const overlay = document.createElement('div');
        overlay.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;z-index:10000;color:white;text-align:center;`;
        
        const content = document.createElement('div');
        content.style.cssText = `padding:2rem;background:#1a1a2e;border-radius:15px;border:2px solid #00d4ff;`;
        
        const title = document.createElement('h2');
        title.textContent = '✅ تم استلام طلبك بنجاح!';
        title.style.color = '#00d4ff';
        
        const text = document.createElement('p');
        text.textContent = `رقم الطلب الخاص بك هو: ${orderId}`;
        
        const note = document.createElement('p');
        note.textContent = 'سيتم توجيهك لصفحة التأكيد خلال 3 ثوانٍ...';
        note.style.fontSize = '0.8em';
        note.style.marginTop = '1rem';

        content.append(title, text, note);
        overlay.append(content);
        document.body.append(overlay);

        setTimeout(() => {
            window.location.href = '../pages/order-confirmation.html?orderId=' + encodeURIComponent(orderId);
        }, 3000);
    }

    showErrorMessage(message) {
        const errorToast = document.createElement('div');
        errorToast.style.cssText = `position:fixed;top:20px;right:20px;background:#ff4757;color:white;padding:1rem;border-radius:8px;z-index:10001;box-shadow:0 4px 12px rgba(0,0,0,0.1);`;
        errorToast.textContent = '❌ ' + message;
        
        document.body.append(errorToast);
        setTimeout(() => errorToast.remove(), 5000);
    }
}

const orderSystem = new OrderManagementSystem();
