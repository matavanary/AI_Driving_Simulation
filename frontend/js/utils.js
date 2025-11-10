/**
 * Global Utility Functions
 * Safe wrappers for common UI operations
 * Author: Mr.Nattakit Rookkason
 * Version: 1.0
 * Date: 31 October 2025
 */

// Safe Loading Functions
window.safeShowLoading = function(message = 'กำลังโหลด...') {
    console.log('🔄 Safe loading:', message);
    
    // Try main.js function first
    if (typeof showLoading === 'function') {
        showLoading(message);
        return;
    }
    
    // Fallback implementation
    showFallbackLoadingGlobal(message);
};

window.safeHideLoading = function() {
    console.log('✅ Safe hide loading');
    
    // Try main.js function first
    if (typeof hideLoading === 'function') {
        hideLoading();
        return;
    }
    
    // Fallback implementation
    hideFallbackLoadingGlobal();
};

// Safe Notification Functions
window.safeShowNotification = function(message, type = 'info') {
    console.log(`📢 Safe notification [${type}]:`, message);
    
    // Try main.js function first
    if (typeof showNotification === 'function') {
        showNotification(message, type);
        return;
    }
    
    // Fallback implementation
    showFallbackNotificationGlobal(message, type);
};

// Global Fallback Implementations
function showFallbackLoadingGlobal(message) {
    hideFallbackLoadingGlobal(); // Remove existing
    
    const loading = document.createElement('div');
    loading.id = 'global-fallback-loading';
    loading.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 99999;
        color: white;
        font-family: 'Kanit', sans-serif;
    `;
    loading.innerHTML = `
        <div style="text-align: center;">
            <div class="spinner-global"></div>
            <p style="margin: 20px 0 0; font-size: 16px;">${message}</p>
        </div>
        <style>
            .spinner-global {
                border: 4px solid #f3f3f3;
                border-top: 4px solid #3498db;
                border-radius: 50%;
                width: 40px;
                height: 40px;
                animation: spin-global 1s linear infinite;
                margin: 0 auto;
            }
            @keyframes spin-global {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        </style>
    `;
    document.body.appendChild(loading);
}

function hideFallbackLoadingGlobal() {
    const loading = document.getElementById('global-fallback-loading');
    if (loading) {
        loading.remove();
    }
}

function showFallbackNotificationGlobal(message, type) {
    const colors = {
        success: '#27ae60',
        error: '#e74c3c',
        warning: '#f39c12',
        info: '#3498db'
    };
    
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${colors[type] || colors.info};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        z-index: 99998;
        font-family: 'Kanit', sans-serif;
        font-size: 14px;
        max-width: 350px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        animation: slideIn 0.3s ease-out;
    `;
    
    notification.innerHTML = `
        <span style="margin-right: 8px;">${icons[type] || icons.info}</span>
        ${message}
        <button onclick="this.parentElement.remove()" style="
            float: right;
            background: none;
            border: none;
            color: white;
            cursor: pointer;
            font-size: 18px;
            margin-left: 10px;
        ">×</button>
        <style>
            @keyframes slideIn {
                from { opacity: 0; transform: translateX(100%); }
                to { opacity: 1; transform: translateX(0); }
            }
        </style>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        safeShowLoading,
        safeHideLoading,
        safeShowNotification
    };
}

console.log('🛡️ Global utilities loaded');