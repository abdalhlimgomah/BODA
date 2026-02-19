/**
 * BODA Validation System - نظام التحقق من البيانات
 * التحقق الشامل من جميع المدخلات والبيانات
 */

class ValidationManager {
    constructor() {
        this.errors = {};
        this.patterns = {
            email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            phone: /^[0-9\s\-\+\(\)]{10,}$/,
            password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
            url: /^https?:\/\/.+/i,
            arabicText: /[\u0600-\u06FF]/,
            strongPassword: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/,
            username: /^[a-zA-Z0-9_-]{3,16}$/,
            creditCard: /^\d{13,19}$/,
            zipCode: /^\d{5}(-\d{4})?$/
        };
    }

    // ============================================
    // التحقق الأساسي
    // ============================================

    isEmpty(value) {
        return !value || value.toString().trim().length === 0;
    }

    isEmail(email) {
        return this.patterns.email.test(email.toLowerCase());
    }

    isPhone(phone) {
        return this.patterns.phone.test(phone.replace(/\s/g, ''));
    }

    isPassword(password) {
        return this.patterns.password.test(password);
    }

    isStrongPassword(password) {
        return this.patterns.strongPassword.test(password);
    }

    isUsername(username) {
        return this.patterns.username.test(username);
    }

    isUrl(url) {
        return this.patterns.url.test(url);
    }

    isNumber(value) {
        return !isNaN(parseFloat(value)) && isFinite(value);
    }

    isInteger(value) {
        return Number.isInteger(Number(value));
    }

    isPositive(value) {
        return this.isNumber(value) && parseFloat(value) > 0;
    }

    isLength(value, min, max) {
        const len = value.toString().length;
        return len >= min && len <= max;
    }

    isMinLength(value, min) {
        return value.toString().length >= min;
    }

    isMaxLength(value, max) {
        return value.toString().length <= max;
    }

    // ============================================
    // التحقق المتقدم
    // ============================================

    validateEmail(email, fieldName = 'البريد الإلكتروني') {
        if (this.isEmpty(email)) {
            return { valid: false, error: `${fieldName} مطلوب` };
        }
        if (!this.isEmail(email)) {
            return { valid: false, error: `${fieldName} غير صحيح` };
        }
        return { valid: true };
    }

    validatePassword(password, fieldName = 'كلمة المرور') {
        if (this.isEmpty(password)) {
            return { valid: false, error: `${fieldName} مطلوبة` };
        }
        if (password.length < 8) {
            return { valid: false, error: `${fieldName} يجب أن تكون 8 أحرف على الأقل` };
        }
        if (!this.isPassword(password)) {
            return {
                valid: false,
                error: `${fieldName} يجب أن تحتوي على أحرف كبيرة وصغيرة وأرقام ورموز`
            };
        }
        return { valid: true };
    }

    validateConfirmPassword(password, confirmPassword, fieldName = 'تأكيد كلمة المرور') {
        if (password !== confirmPassword) {
            return { valid: false, error: 'كلمات المرور غير متطابقة' };
        }
        return { valid: true };
    }

    validateName(name, fieldName = 'الاسم', minLength = 2) {
        if (this.isEmpty(name)) {
            return { valid: false, error: `${fieldName} مطلوب` };
        }
        if (name.length < minLength) {
            return { valid: false, error: `${fieldName} يجب أن يكون ${minLength} أحرف على الأقل` };
        }
        if (!/^[a-zA-Z\u0600-\u06FF\s-]+$/.test(name)) {
            return { valid: false, error: `${fieldName} يحتوي على أحرف غير صحيحة` };
        }
        return { valid: true };
    }

    validatePhone(phone, fieldName = 'رقم الهاتف') {
        if (this.isEmpty(phone)) {
            return { valid: false, error: `${fieldName} مطلوب` };
        }
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length < 10) {
            return { valid: false, error: `${fieldName} يجب أن يكون 10 أرقام على الأقل` };
        }
        return { valid: true };
    }

    validatePrice(price, fieldName = 'السعر', minPrice = 0) {
        if (this.isEmpty(price)) {
            return { valid: false, error: `${fieldName} مطلوب` };
        }
        const numPrice = parseFloat(price);
        if (isNaN(numPrice)) {
            return { valid: false, error: `${fieldName} يجب أن يكون رقماً` };
        }
        if (numPrice < minPrice) {
            return { valid: false, error: `${fieldName} يجب أن يكون ${minPrice} على الأقل` };
        }
        return { valid: true };
    }

    validateCreditCard(cardNumber, fieldName = 'رقم البطاقة') {
        if (this.isEmpty(cardNumber)) {
            return { valid: false, error: `${fieldName} مطلوب` };
        }
        const cleaned = cardNumber.replace(/\D/g, '');
        if (!this.patterns.creditCard.test(cleaned)) {
            return { valid: false, error: `${fieldName} غير صحيح` };
        }
        // Luhn algorithm
        if (!this.luhnCheck(cleaned)) {
            return { valid: false, error: `${fieldName} فشل التحقق` };
        }
        return { valid: true };
    }

    validateCVV(cvv, fieldName = 'CVV') {
        if (this.isEmpty(cvv)) {
            return { valid: false, error: `${fieldName} مطلوب` };
        }
        if (!/^\d{3,4}$/.test(cvv)) {
            return { valid: false, error: `${fieldName} يجب أن يكون 3 أو 4 أرقام` };
        }
        return { valid: true };
    }

    validateExpiryDate(month, year, fieldName = 'تاريخ الانتهاء') {
        const m = parseInt(month);
        const y = parseInt(year);
        if (m < 1 || m > 12) {
            return { valid: false, error: `${fieldName} - الشهر غير صحيح` };
        }
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;
        if (y < currentYear || (y === currentYear && m < currentMonth)) {
            return { valid: false, error: `${fieldName} قد انتهت صلاحيتها` };
        }
        return { valid: true };
    }

    validateAddress(address, fieldName = 'العنوان') {
        if (this.isEmpty(address)) {
            return { valid: false, error: `${fieldName} مطلوب` };
        }
        if (address.length < 5) {
            return { valid: false, error: `${fieldName} يجب أن يكون 5 أحرف على الأقل` };
        }
        return { valid: true };
    }

    // ============================================
    // التحقق من النماذج
    // ============================================

    validateForm(formData, rules) {
        this.errors = {};
        let isValid = true;

        for (const [field, rule] of Object.entries(rules)) {
            const value = formData[field];

            for (const [ruleType, ruleValue] of Object.entries(rule)) {
                const result = this.validateField(value, ruleType, ruleValue, field);
                if (!result.valid) {
                    if (!this.errors[field]) this.errors[field] = [];
                    this.errors[field].push(result.error);
                    isValid = false;
                    break;
                }
            }
        }

        return { valid: isValid, errors: this.errors };
    }

    validateField(value, ruleType, ruleValue, fieldName = 'الحقل') {
        switch (ruleType) {
            case 'required':
                if (ruleValue && this.isEmpty(value)) {
                    return { valid: false, error: `${fieldName} مطلوب` };
                }
                break;
            case 'email':
                if (!this.isEmpty(value) && !this.isEmail(value)) {
                    return { valid: false, error: `${fieldName} يجب أن يكون بريداً إلكترونياً صحيحاً` };
                }
                break;
            case 'minLength':
                if (!this.isEmpty(value) && value.toString().length < ruleValue) {
                    return { valid: false, error: `${fieldName} يجب أن يكون ${ruleValue} أحرف على الأقل` };
                }
                break;
            case 'maxLength':
                if (!this.isEmpty(value) && value.toString().length > ruleValue) {
                    return { valid: false, error: `${fieldName} يجب ألا يتجاوز ${ruleValue} أحرف` };
                }
                break;
            case 'min':
                if (!this.isEmpty(value) && parseFloat(value) < ruleValue) {
                    return { valid: false, error: `${fieldName} يجب أن يكون ${ruleValue} على الأقل` };
                }
                break;
            case 'max':
                if (!this.isEmpty(value) && parseFloat(value) > ruleValue) {
                    return { valid: false, error: `${fieldName} لا يجب أن يتجاوز ${ruleValue}` };
                }
                break;
            case 'pattern':
                if (!this.isEmpty(value) && !ruleValue.test(value)) {
                    return { valid: false, error: `${fieldName} صيغة غير صحيحة` };
                }
                break;
        }
        return { valid: true };
    }

    // ============================================
    // وظائف مساعدة
    // ============================================

    luhnCheck(cardNumber) {
        let sum = 0;
        let isEven = false;

        for (let i = cardNumber.length - 1; i >= 0; i--) {
            let digit = parseInt(cardNumber[i], 10);

            if (isEven) {
                digit *= 2;
                if (digit > 9) {
                    digit -= 9;
                }
            }

            sum += digit;
            isEven = !isEven;
        }

        return sum % 10 === 0;
    }

    getErrors() {
        return this.errors;
    }

    clearErrors() {
        this.errors = {};
    }

    getFieldError(fieldName) {
        return this.errors[fieldName]?.[0] || null;
    }
}

// تصدير الفئة
window.ValidationManager = ValidationManager;
