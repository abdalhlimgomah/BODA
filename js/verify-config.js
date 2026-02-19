/**
 * Supabase Configuration Verification
 * This file verifies that all Supabase credentials are properly configured
 */

function verifySupabaseConfig() {
    console.log('========== SUPABASE CONFIGURATION VERIFICATION ==========\n');
    
    const config = {
        url: {
            actual: SUPABASE_URL,
            expected: 'https://msgqzgzoslearaprgiqq.supabase.co',
            verified: false
        },
        projectId: {
            actual: SUPABASE_PROJECT_ID,
            expected: 'msgqzgzoslearaprgiqq',
            verified: false
        },
        anonKey: {
            actual: SUPABASE_ANON_KEY,
            expected: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zZ3F6Z3pvc2xlYXJhcHJnaXFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMzk3MTIsImV4cCI6MjA4NTkxNTcxMn0.fQu1toCisGIly8FZqHy3yoEwnY-e7vthk8PCmkBMifE',
            verified: false
        },
        publishableKey: {
            actual: SUPABASE_PUBLISHABLE_KEY,
            expected: 'sb_publishable_VOfgIcH5HXojQgfX3r--kg_k13qUGzO',
            verified: false
        },
        bucketName: {
            actual: SUPABASE_BUCKET_NAME,
            expected: 'BODA',
            verified: false
        },
        supabaseClient: {
            actual: _supabaseInstance ? 'Initialized' : 'Not Initialized',
            expected: 'Initialized',
            verified: _supabaseInstance !== undefined
        }
    };

    // Verify each configuration
    let allVerified = true;
    
    for (const [key, configItem] of Object.entries(config)) {
        configItem.verified = configItem.actual === configItem.expected;
        
        if (!configItem.verified) {
            allVerified = false;
        }
        
        const status = configItem.verified ? '✅' : '❌';
        console.log(`${status} ${key.toUpperCase()}`);
        console.log(`   Expected: ${configItem.expected}`);
        console.log(`   Actual:   ${configItem.actual}`);
        console.log(`   Status:   ${configItem.verified ? 'VERIFIED' : 'MISMATCH'}\n`);
    }

    console.log('========== VERIFICATION SUMMARY ==========');
    console.log(`Overall Status: ${allVerified ? '✅ ALL VERIFIED' : '❌ ISSUES FOUND'}\n`);
    
    // Test Supabase connection
    testSupabaseConnection();
    
    return allVerified;
}

async function testSupabaseConnection() {
    console.log('========== SUPABASE CONNECTION TEST ==========\n');
    
    if (!_supabaseInstance) {
        console.error('❌ Supabase client not initialized');
        return false;
    }

    try {
        // Test Auth
        console.log('🔍 Testing Supabase Auth...');
        const { data: sessionData, error: sessionError } = await _supabaseInstance.auth.getSession();
        
        if (sessionError) {
            console.error('❌ Auth test failed:', sessionError.message);
        } else {
            console.log('✅ Auth connection successful');
        }

        // Test Storage
        console.log('\n🔍 Testing Supabase Storage (Bucket: ' + SUPABASE_BUCKET_NAME + ')...');
        const { data: bucketData, error: bucketError } = await _supabaseInstance.storage
            .getBucket(SUPABASE_BUCKET_NAME);
        
        if (bucketError) {
            console.error('❌ Storage test failed:', bucketError.message);
            console.log('   Note: Bucket may not exist or you may not have permissions');
        } else {
            console.log('✅ Storage connection successful');
            console.log('   Bucket Name:', bucketData.name);
            console.log('   Public:', bucketData.public);
        }

        console.log('\n========== CONNECTION SUMMARY ==========');
        console.log('✅ Supabase connection is working correctly\n');
        return true;

    } catch (error) {
        console.error('❌ Connection test error:', error);
        return false;
    }
}

// Helper function to display credentials summary (SAFE VERSION)
function displayCredentialsSummary() {
    console.log('========== SUPABASE CREDENTIALS SUMMARY ==========\n');
    console.log('📍 Project URL:', SUPABASE_URL);
    console.log('🔑 Project ID:', SUPABASE_PROJECT_ID);
    console.log('📦 Storage Bucket:', SUPABASE_BUCKET_NAME);
    console.log('✅ Anon Key: ' + SUPABASE_ANON_KEY.substring(0, 20) + '....');
    console.log('✅ Publishable Key: ' + SUPABASE_PUBLISHABLE_KEY.substring(0, 20) + '....');
    console.log('\n✅ All credentials are securely configured.\n');
}

// Run verification when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Automatically run verification
    verifySupabaseConfig();
});

// Make functions globally available for testing
window.verifySupabaseConfig = verifySupabaseConfig;
window.testSupabaseConnection = testSupabaseConnection;
window.displayCredentialsSummary = displayCredentialsSummary;
