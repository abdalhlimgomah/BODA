document.addEventListener('DOMContentLoaded', () => {
    // Check Authentication
    const partnerSystem = new PartnerSystem();
    const currentPartner = partnerSystem.getCurrentPartner();

    if (!currentPartner) {
        window.location.href = 'login.html';
        return;
    }

    // Initialize AddProductManager
    const manager = new AddProductManager(currentPartner);
});

class AddProductManager {
    constructor(partner) {
        this.partner = partner;
        this.images = [];
        this.maxImages = 6;
        this.maxFileSize = 2 * 1024 * 1024; // 2MB

        this.initElements();
        this.initEvents();
    }

    initElements() {
        this.form = document.getElementById('addProductForm');
        this.uploadArea = document.getElementById('uploadArea');
        this.imageInput = document.getElementById('imageInput');
        this.imagesGrid = document.getElementById('imagesGrid');
        this.submitBtn = document.getElementById('submitBtn');
        this.toast = document.getElementById('toast');
        
        // Discount fields
        this.priceInput = document.getElementById('productPrice');
        this.discountPriceInput = document.getElementById('productDiscountPrice');
        this.discountInfo = document.getElementById('discountInfo');
        this.discountPercentageDisplay = document.getElementById('discountPercentage');
    }

    initEvents() {
        // Drag & Drop
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            this.uploadArea.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            }, false);
        });

        this.uploadArea.addEventListener('dragover', () => this.uploadArea.classList.add('drag-over'));
        this.uploadArea.addEventListener('dragleave', () => this.uploadArea.classList.remove('drag-over'));
        this.uploadArea.addEventListener('drop', (e) => {
            this.uploadArea.classList.remove('drag-over');
            this.handleFiles(e.dataTransfer.files);
        });

        // Click to upload
        this.uploadArea.addEventListener('click', () => this.imageInput.click());
        this.imageInput.addEventListener('change', (e) => this.handleFiles(e.target.files));

        // Discount calculation
        this.priceInput.addEventListener('input', () => this.calculateDiscount());
        this.discountPriceInput.addEventListener('input', () => this.calculateDiscount());

        // Form Submit
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    calculateDiscount() {
        const price = parseFloat(this.priceInput.value);
        const discountPrice = parseFloat(this.discountPriceInput.value);

        if (price > 0 && discountPrice > 0 && discountPrice < price) {
            const percentage = Math.round(((price - discountPrice) / price) * 100);
            this.discountPercentageDisplay.textContent = `${percentage}%`;
            this.discountInfo.style.display = 'flex';
        } else {
            this.discountInfo.style.display = 'none';
        }
    }

    async handleFiles(files) {
        const remainingSlots = this.maxImages - this.images.length;
        if (remainingSlots <= 0) {
            this.showToast('لقد وصلت للحد الأقصى من الصور (6 صور)', 'error');
            this.imageInput.value = ''; // Clear input
            return;
        }

        const filesArray = Array.from(files).slice(0, remainingSlots);

        for (const file of filesArray) {
            if (!file.type.startsWith('image/')) {
                this.showToast(`الملف ${file.name} ليس صورة`, 'error');
                continue;
            }

            if (file.size > this.maxFileSize) {
                this.showToast(`الصورة ${file.name} أكبر من 2 ميجابايت`, 'error');
                continue;
            }

            try {
                const base64 = await this.readFileAsBase64(file);
                const compressed = await this.compressImage(base64);
                
                this.images.push({
                    id: Date.now() + Math.random(),
                    data: compressed,
                    file: file
                });
            } catch (err) {
                console.error('Error processing image:', err);
                this.showToast('حدث خطأ أثناء معالجة الصورة', 'error');
            }
        }

        this.imageInput.value = ''; // Clear input to allow re-selection
        this.renderImages();
    }

    readFileAsBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    compressImage(base64) {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = base64;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Max dimensions
                const MAX_WIDTH = 800;
                const MAX_HEIGHT = 800;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                
                resolve(canvas.toDataURL('image/jpeg', 0.7)); // 70% quality
            };
        });
    }

    renderImages() {
        this.imagesGrid.innerHTML = '';
        const errorMsg = document.getElementById('imagesError');
        if (errorMsg) errorMsg.style.display = 'none';

        this.images.forEach((img, index) => {
            const div = document.createElement('div');
            div.className = 'image-preview-card';
            div.innerHTML = `
                <img src="${img.data}" alt="Product Image">
                <button type="button" class="delete-btn" onclick="deleteImage(${index})">
                    <i class="fas fa-times"></i>
                </button>
                ${index === 0 ? '<div class="main-tag">الرئيسية</div>' : ''}
            `;
            this.imagesGrid.appendChild(div);
        });

        // Global helper for delete button (since it's inline onclick)
        window.deleteImage = (index) => {
            this.images.splice(index, 1);
            this.renderImages();
        };
    }

    validateForm() {
        let isValid = true;
        const requiredFields = ['productName', 'productPrice', 'productCategory', 'productDescription'];
        
        // Reset errors
        document.querySelectorAll('.form-group').forEach(g => g.classList.remove('error'));

        requiredFields.forEach(id => {
            const el = document.getElementById(id);
            if (!el.value.trim()) {
                el.parentElement.classList.add('error');
                isValid = false;
            }
        });

        // Specific validations
        const name = document.getElementById('productName').value;
        if (name.length < 3) {
            document.getElementById('productName').parentElement.classList.add('error');
            isValid = false;
        }

        const desc = document.getElementById('productDescription').value;
        if (desc.length < 20) {
            document.getElementById('productDescription').parentElement.classList.add('error');
            isValid = false;
        }

        if (this.images.length === 0) {
            document.getElementById('imagesError').style.display = 'block';
            isValid = false;
        }

        return isValid;
    }

    handleSubmit(e) {
        e.preventDefault();

        if (!this.validateForm()) {
            this.showToast('يرجى تصحيح الأخطاء في النموذج', 'error');
            return;
        }

        this.setLoading(true);

        try {
            const originalPrice = parseFloat(document.getElementById('productPrice').value);
            const discountPrice = parseFloat(document.getElementById('productDiscountPrice').value) || null;
            
            const name = this.sanitize(document.getElementById('productName').value.trim());
            const product = {
                id: 'prod_' + Date.now() + Math.random().toString(36).substr(2, 9),
                partnerId: this.partner.id,
                name: name,
                productName: name, // For compatibility with manta.js
                price: originalPrice,
                discountPrice: discountPrice,
                category: document.getElementById('productCategory').value,
                description: this.sanitize(document.getElementById('productDescription').value.trim()),
                image: this.images[0].data, // Main image
                images: this.images.map(img => img.data), // All images
                rating: 0,
                reviewCount: 0,
                sales: 0,
                stock: 10, // Default stock
                createdAt: new Date().toISOString(),
                status: 'active',
                stockStatus: 'in_stock'
            };

            this.saveProduct(product);

            this.showToast('تم إضافة المنتج بنجاح! سيظهر في المتجر قريباً', 'success');
            
            setTimeout(() => {
                window.location.href = 'manta.html';
            }, 2000);

        } catch (err) {
            console.error(err);
            this.showToast('حدث خطأ أثناء حفظ المنتج', 'error');
            this.setLoading(false);
        }
    }

    sanitize(str) {
        const temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
    }

    saveProduct(product) {
        // Save to Partner Products (for dashboard)
        const key = `partner_products_${this.partner.id}`;
        const existing = JSON.parse(localStorage.getItem(key) || '[]');
        existing.push(product);
        localStorage.setItem(key, JSON.stringify(existing));

        // Sync with Global Products (so they appear on products.html)
        let globalProducts = JSON.parse(localStorage.getItem('boda_all_products') || '[]');
        globalProducts.push(product);
        localStorage.setItem('boda_all_products', JSON.stringify(globalProducts));
    }

    setLoading(isLoading) {
        this.submitBtn.disabled = isLoading;
        this.submitBtn.querySelector('.btn-text').style.display = isLoading ? 'none' : 'inline';
        this.submitBtn.querySelector('.loading-spinner').style.display = isLoading ? 'inline' : 'none';
    }

    showToast(msg, type = 'success') {
        const toast = this.toast;
        const icon = toast.querySelector('i');
        const text = document.getElementById('toastMessage');

        text.textContent = msg;
        toast.style.background = type === 'success' ? 'rgba(46, 204, 113, 0.9)' : 'rgba(231, 76, 60, 0.9)';
        icon.className = type === 'success' ? 'fas fa-check-circle' : 'fas fa-exclamation-circle';

        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }
}
