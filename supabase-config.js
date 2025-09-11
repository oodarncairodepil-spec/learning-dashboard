// Supabase Configuration
const SUPABASE_CONFIG = {
    url: 'https://mvvtycgyrmsqrjzjkzvj.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12dnR5Y2d5cm1zcXJqemprenZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1NzQ1MjksImV4cCI6MjA3MzE1MDUyOX0.jKe202aiLKVClATNpHKEx_IE5j-aZmSGuCiRjCiIgzY',
    serviceRoleKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12dnR5Y2d5cm1zcXJqemprenZqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzU3NDUyOSwiZXhwIjoyMDczMTUwNTI5fQ.AbReC3nb9Aqts2APwUQ6L-4gKBdRMxIrLkCT78RQxUM'
};

// Initialize Supabase client
let supabase;

// Function to initialize Supabase
function initSupabase() {
    if (typeof supabase === 'undefined') {
        // Load Supabase from CDN if not already loaded
        if (typeof window.supabase === 'undefined') {
            console.error('Supabase library not loaded. Please include the Supabase CDN script.');
            return null;
        }
        
        supabase = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
    }
    return supabase;
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SUPABASE_CONFIG, initSupabase };
}