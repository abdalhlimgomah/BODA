/**
 * BODA Payment & Order Manager - إدارة الطلبات والدفع
 * Advanced Payment and Order Management System
 */

class OrderManager {
    constructor(database, stateManager, validator) {
        this.db = database;
        this.state = stateManager;
        this.validator = validator;
        this.orders = [];
        this.paymentMethods = [
            { id: 'card', name: 'بطاقة ائتمان', icon: '💳' },
            { id: 'transfer', name: 'تحويل بنكي', icon: '🏦' },
            { id: 'wallet', name: 'المحفظة الرقمية', icon: '👝' },
            { id: 'cash', name: 'الدفع عند الاستلام', icon: '💰' }
        ];
        this.shippingMethods = [
            { id: 'standard', name: 'توصيل عادي', cost: 25, duration: '3-5 أيام' },
            { id: 'express', name: 'توصيل سريع', cost: 50, duration: 'يوم واحد' },
            { id: 'next-day', name: 'توصيل غداً', cost: 75, duration: 'غداً' }
        ];
    }

    // ============================================
    // إنشاء الطلب
    // ============================================

    async createOrder(orderData) {
        try {
            // التحقق من البيانات
            const validation = this.validateOrderData(orderData);
            if (!validation.valid) {
                return { success: false, errors: validation.errors };
            }

            const cartItems = this.state.getCart();
            if (cartItems.length === 0) {
                return { success: false, error: 'السلة فارغة' };
            }

            // حساب الإجمالي
            const subtotal = this.state.getCartTotal();
            const shippingCost = this.getShippingCost(orderData.shippingMethod);
            const tax = subtotal * 0.15; // ضريبة 15%
            const total = subtotal + shippingCost + tax;

            const order = {
                id: this.generateOrderNumber(),
                customerId: this.state.getUser()?.id,
                items: cartItems,
                subtotal,
                tax,
                shippingCost,
                total,
                shippingAddress: orderData.shippingAddress,
                shippingMethod: orderData.shippingMethod,
                paymentMethod: orderData.paymentMethod,
                status: 'pending',
                paymentStatus: 'pending',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                notes: orderData.notes || '',
                trackingNumber: null
            };

            // حفظ في قاعدة البيانات
            if (this.db) {
                const result = await this.db.createOrder(order);
                if (!result.success) {
                    return { success: false, error: 'خطأ في حفظ الطلب' };
                }
            }

            // إضافة للحالة
            this.state.addOrder(order);
            this.orders.push(order);

            // مسح السلة
            this.state.clearCart();

            return { success: true, order };
        } catch (error) {
            console.error('خطأ في إنشاء الطلب:', error);
            return { success: false, error: error.message };
        }
    }

    // ============================================
    // معالجة الدفع
    // ============================================

    async processPayment(orderId, paymentDetails) {
        try {
            const order = this.getOrder(orderId);
            if (!order) {
                return { success: false, error: 'الطلب غير موجود' };
            }

            // التحقق من بيانات الدفع
            const validation = this.validatePaymentDetails(paymentDetails);
            if (!validation.valid) {
                return { success: false, errors: validation.errors };
            }

            // معالجة الدفع حسب الطريقة
            let paymentResult;
            switch (paymentDetails.method) {
                case 'card':
                    paymentResult = await this.processCardPayment(paymentDetails);
                    break;
                case 'transfer':
                    paymentResult = this.processTransferPayment(paymentDetails);
                    break;
                case 'wallet':
                    paymentResult = await this.processWalletPayment(paymentDetails);
                    break;
                case 'cash':
                    paymentResult = { success: true, transactionId: `CASH_${Date.now()}` };
                    break;
                default:
                    return { success: false, error: 'طريقة دفع غير معروفة' };
            }

            if (paymentResult.success) {
                // تحديث الطلب
                order.paymentStatus = 'completed';
                order.status = 'processing';
                order.transactionId = paymentResult.transactionId;
                order.updatedAt = new Date().toISOString();

                // تحديث في قاعدة البيانات
                if (this.db) {
                    await this.db.updateOrder(orderId, {
                        paymentStatus: 'completed',
                        status: 'processing',
                        transactionId: paymentResult.transactionId
                    });
                }

                return { success: true, order, transactionId: paymentResult.transactionId };
            }

            return { success: false, error: paymentResult.error || 'فشلت عملية الدفع' };
        } catch (error) {
            console.error('خطأ في معالجة الدفع:', error);
            return { success: false, error: error.message };
        }
    }

    async processCardPayment(paymentDetails) {
        try {
            // التحقق من بيانات البطاقة
            const cardValidation = {
                number: this.validator.validateCreditCard(paymentDetails.cardNumber),
                cvv: this.validator.validateCVV(paymentDetails.cvv),
                expiry: this.validator.validateExpiryDate(paymentDetails.expiryMonth, paymentDetails.expiryYear)
            };

            for (const [field, result] of Object.entries(cardValidation)) {
                if (!result.valid) {
                    return { success: false, error: result.error };
                }
            }

            // محاكاة معالجة الدفع
            return new Promise((resolve) => {
                setTimeout(() => {
                    // 95% نسبة النجاح
                    if (Math.random() < 0.95) {
                        resolve({
                            success: true,
                            transactionId: `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                        });
                    } else {
                        resolve({ success: false, error: 'فشل الدفع - تحقق من بيانات البطاقة' });
                    }
                }, 2000);
            });
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    processTransferPayment(paymentDetails) {
        // معلومات التحويل البنكي
        return {
            success: true,
            transactionId: `TRANSFER_${Date.now()}`,
            bankDetails: {
                accountNumber: '1234567890',
                bankName: 'البنك الوطني',
                iban: 'SA0000000000000000000000'
            }
        };
    }

    async processWalletPayment(paymentDetails) {
        try {
            // التحقق من رصيد المحفظة
            const walletBalance = parseFloat(localStorage.getItem('wallet_balance') || '0');
            
            if (walletBalance < paymentDetails.amount) {
                return { success: false, error: 'رصيد المحفظة غير كافي' };
            }

            // خصم من المحفظة
            const newBalance = walletBalance - paymentDetails.amount;
            localStorage.setItem('wallet_balance', newBalance.toString());

            return {
                success: true,
                transactionId: `WALLET_${Date.now()}`,
                remainingBalance: newBalance
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // ============================================
    // إدارة الطلبات
    // ============================================

    getOrder(orderId) {
        return this.orders.find(o => o.id === orderId) || 
               this.state.getOrder(orderId);
    }

    getOrders(customerId) {
        return this.orders.filter(o => o.customerId === customerId);
    }

    getOrdersByStatus(status) {
        return this.orders.filter(o => o.status === status);
    }

    updateOrderStatus(orderId, status) {
        const order = this.getOrder(orderId);
        if (order) {
            order.status = status;
            order.updatedAt = new Date().toISOString();

            if (this.db) {
                this.db.updateOrder(orderId, { status });
            }

            return { success: true, order };
        }
        return { success: false, error: 'الطلب غير موجود' };
    }

    generateTrackingNumber(orderId) {
        const tracking = `BODA${orderId}${Date.now().toString().slice(-5)}`;
        const order = this.getOrder(orderId);
        if (order) {
            order.trackingNumber = tracking;
        }
        return tracking;
    }

    // ============================================
    // التحقق من البيانات
    // ============================================

    validateOrderData(orderData) {
        const errors = {};

        // التحقق من العنوان
        const addressValidation = this.validator.validateAddress(
            orderData.shippingAddress,
            'عنوان التوصيل'
        );
        if (!addressValidation.valid) {
            errors.shippingAddress = addressValidation.error;
        }

        // التحقق من طريقة التوصيل
        if (!this.shippingMethods.find(m => m.id === orderData.shippingMethod)) {
            errors.shippingMethod = 'طريقة توصيل غير صحيحة';
        }

        // التحقق من طريقة الدفع
        if (!this.paymentMethods.find(m => m.id === orderData.paymentMethod)) {
            errors.paymentMethod = 'طريقة دفع غير صحيحة';
        }

        return {
            valid: Object.keys(errors).length === 0,
            errors
        };
    }

    validatePaymentDetails(paymentDetails) {
        const errors = {};

        switch (paymentDetails.method) {
            case 'card':
                const cardValidation = this.validator.validateCreditCard(paymentDetails.cardNumber);
                if (!cardValidation.valid) errors.cardNumber = cardValidation.error;

                const cvvValidation = this.validator.validateCVV(paymentDetails.cvv);
                if (!cvvValidation.valid) errors.cvv = cvvValidation.error;

                const expiryValidation = this.validator.validateExpiryDate(
                    paymentDetails.expiryMonth,
                    paymentDetails.expiryYear
                );
                if (!expiryValidation.valid) errors.expiry = expiryValidation.error;
                break;

            case 'transfer':
                if (!paymentDetails.bankAccount) {
                    errors.bankAccount = 'رقم الحساب مطلوب';
                }
                break;

            case 'wallet':
                if (!paymentDetails.walletPin) {
                    errors.walletPin = 'الرقم السري مطلوب';
                }
                break;
        }

        return {
            valid: Object.keys(errors).length === 0,
            errors
        };
    }

    // ============================================
    // الحسابات والتقارير
    // ============================================

    getShippingCost(method) {
        const shipping = this.shippingMethods.find(m => m.id === method);
        return shipping ? shipping.cost : 0;
    }

    getOrderSummary(orderId) {
        const order = this.getOrder(orderId);
        if (!order) return null;

        return {
            orderId: order.id,
            date: order.createdAt,
            status: order.status,
            paymentStatus: order.paymentStatus,
            items: order.items,
            subtotal: order.subtotal.toFixed(2),
            tax: order.tax.toFixed(2),
            shipping: order.shippingCost.toFixed(2),
            total: order.total.toFixed(2),
            shippingAddress: order.shippingAddress,
            trackingNumber: order.trackingNumber
        };
    }

    getTotalRevenue() {
        return this.orders
            .filter(o => o.paymentStatus === 'completed')
            .reduce((sum, o) => sum + o.total, 0);
    }

    getAverageOrderValue() {
        if (this.orders.length === 0) return 0;
        return this.getTotalRevenue() / this.orders.length;
    }

    // ============================================
    // المساعدات
    // ============================================

    generateOrderNumber() {
        return `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    }

    getPaymentMethods() {
        return this.paymentMethods;
    }

    getShippingMethods() {
        return this.shippingMethods;
    }

    exportOrders() {
        return JSON.stringify(this.orders, null, 2);
    }
}

// تصدير الفئة
window.OrderManager = OrderManager;
