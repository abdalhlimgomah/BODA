
// ========== SUPABASE CONFIGURATION ==========
// Initialize Supabase Client
// CDN: <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

// 🔐 Supabase Project Configuration
const SUPABASE_URL = 'https://msgqzgzoslearaprgiqq.supabase.co';
const SUPABASE_PROJECT_ID = 'msgqzgzoslearaprgiqq';

// 🔑 API Keys
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zZ3F6Z3pvc2xlYXJhcHJnaXFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMzk3MTIsImV4cCI6MjA4NTkxNTcxMn0.fQu1toCisGIly8FZqHy3yoEwnY-e7vthk8PCmkBMifE';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_VOfgIcH5HXojQgfX3r--kg_k13qUGzO';

// 📦 Storage Configuration
const SUPABASE_BUCKET_NAME = 'BODA';

// ✅ Configuration Verification
console.log('✅ Supabase Configuration Loaded:');
console.log('   Project ID:', SUPABASE_PROJECT_ID);
console.log('   URL:', SUPABASE_URL);
console.log('   Bucket:', SUPABASE_BUCKET_NAME);

// استخدام متغير فريد لتجنب التكرار
let _supabaseInstance;

try {
    if (typeof supabase !== 'undefined' && supabase.createClient) {
        _supabaseInstance = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('✅ Supabase client initialized successfully');
    } else if (typeof createClient !== 'undefined') {
        _supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } else if (window.supabase && window.supabase.createClient) {
        _supabaseInstance = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } else {
        console.error('❌ Supabase library not found. Please include the Supabase CDN.');
    }
} catch (e) {
    console.error('❌ Error initializing Supabase:', e);
}

// تصدير العميل للاستخدام العام
window.supabaseClient = _supabaseInstance;

// ========== HELPER FUNCTIONS ==========

/**
 * Upload file to Supabase storage
 * @param {File} file - File to upload
 * @param {string} path - Path in bucket (e.g., 'products/image.jpg')
 * @returns {Promise<Object>} Upload result
 */
async function uploadToSupabase(file, path) {
    try {
        if (!_supabaseInstance) {
            throw new Error('Supabase client not initialized');
        }

        const { data, error } = await _supabaseInstance.storage
            .from(SUPABASE_BUCKET_NAME)
            .upload(path, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('❌ Upload error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get public URL for file in storage
 * @param {string} path - Path in bucket
 * @returns {string} Public URL
 */
function getSupabasePublicUrl(path) {
    if (!_supabaseInstance) return null;
    
    const { data } = _supabaseInstance.storage
        .from(SUPABASE_BUCKET_NAME)
        .getPublicUrl(path);
    
    return data?.publicUrl;
}

/**
 * Delete file from Supabase storage
 * @param {string} path - Path in bucket
 * @returns {Promise<Object>} Delete result
 */
async function deleteFromSupabase(path) {
    try {
        if (!_supabaseInstance) {
            throw new Error('Supabase client not initialized');
        }

        const { data, error } = await _supabaseInstance.storage
            .from(SUPABASE_BUCKET_NAME)
            .remove([path]);

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('❌ Delete error:', error);
        return { success: false, error: error.message };
    }
}
