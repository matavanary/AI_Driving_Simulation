/**
 * Main JavaScript for Driving Simulator
 * Author: Mr.Nattakit Rookkason
 * Version: 1.0
 * Date: 30 October 2025
 */

// Global Variables
let currentUser = null;

// DOM Elements (with safe checking)
const authButtons = document.getElementById('auth-buttons');
const userMenu = document.getElementById('user-menu');
const userName = document.getElementById('user-name');
const loadingOverlay = document.getElementById('loading-overlay');
const notification = document.getElementById('notification');

// Log element availability for debugging
console.log('🔍 DOM Elements Status:', {
    authButtons: !!authButtons,
    userMenu: !!userMenu,
    userName: !!userName,
    loadingOverlay: !!loadingOverlay,
    notification: !!notification,
    page: window.location.pathname
});

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Prevent multiple initialization
    if (window.__appInitialized) {
        console.log('App already initialized, skipping...');
        return;
    }
    
    window.__appInitialized = true;
    
    // Add delay to prevent race conditions with API initialization
    setTimeout(() => {
        initializeApp();
    }, 2000); // Wait 2 seconds after DOM load
});

// Initialize Application
async function initializeApp() {
    console.log('🚗 Driving Simulator initialized');
    
    // Wait for API to be ready before proceeding
    if (!window.api) {
        console.log('Waiting for API to initialize...');
        await new Promise(resolve => {
            const checkAPI = () => {
                if (window.api) {
                    console.log('API ready, continuing initialization...');
                    resolve();
                } else {
                    setTimeout(checkAPI, 100);
                }
            };
            checkAPI();
        });
    }
    
    // Setup event listeners FIRST (most important)
    setupEventListeners();
    
    // Check if user is already logged in (only if there's a stored session)
    checkUserSessionIfNeeded();
    
    // Setup service worker for offline support (with proper error handling)
    if ('serviceWorker' in navigator && 'https:' === location.protocol) {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered successfully:', registration.scope);
            })
            .catch(error => {
                console.warn('SW registration failed (this is normal in development):', error.message);
            });
    }
    
    // Setup performance monitoring
    if ('performance' in window) {
        window.addEventListener('load', () => {
            const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
            console.log(`Page loaded in ${loadTime}ms`);
        });
    }
    
    // Animate statistics on scroll
    setupScrollAnimations();
    
    // Add debug tools in development
    addSessionCheckButton();
}

// Setup Event Listeners
function setupEventListeners() {
    // Form submissions
    document.getElementById('login-form')?.addEventListener('submit', handleLogin);
    document.getElementById('register-form')?.addEventListener('submit', handleRegister);
    document.getElementById('profile-form')?.addEventListener('submit', handleUpdateProfile);
    document.getElementById('change-password-form')?.addEventListener('submit', handleChangePassword);
    
    // Password strength checker
    document.getElementById('register-password')?.addEventListener('input', checkPasswordStrength);
    
    // Password confirmation
    document.getElementById('register-confirm-password')?.addEventListener('input', checkPasswordConfirmation);
    
    // Close modals on outside click
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            closeModal(e.target.id);
        }
    });
    
    // Close notification
    document.querySelector('.notification-close')?.addEventListener('click', hideNotification);
    
    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Setup Mobile Menu
function setupMobileMenu() {
    // Add mobile menu button if not exists
    if (window.innerWidth <= 768 && !document.querySelector('.mobile-menu-btn')) {
        const nav = document.querySelector('.nav');
        const mobileBtn = document.createElement('button');
        mobileBtn.className = 'mobile-menu-btn';
        mobileBtn.innerHTML = '<i class="fas fa-bars"></i>';
        mobileBtn.addEventListener('click', toggleMobileMenu);
        
        // Insert before auth buttons
        authButtons.parentNode.insertBefore(mobileBtn, authButtons);
    }
}

// Toggle Mobile Menu
function toggleMobileMenu() {
    const nav = document.querySelector('.nav');
    nav.classList.toggle('show');
    
    const icon = document.querySelector('.mobile-menu-btn i');
    icon.className = nav.classList.contains('show') ? 'fas fa-times' : 'fas fa-bars';
}

// Setup Scroll Animations
function setupScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
                
                // Animate statistics
                if (entry.target.classList.contains('stats')) {
                    animateStats();
                }
            }
        });
    }, observerOptions);
    
    // Observe sections
    document.querySelectorAll('section').forEach(section => {
        observer.observe(section);
    });
}

// Animate Statistics
function animateStats() {
    const stats = [
        { id: 'total-users', target: 1250, suffix: '+' },
        { id: 'total-sessions', target: 15600, suffix: '+' },
        { id: 'avg-improvement', target: 85, suffix: '%' },
        { id: 'success-rate', target: 92, suffix: '%' }
    ];
    
    stats.forEach(stat => {
        const element = document.getElementById(stat.id);
        if (element && !element.classList.contains('animated')) {
            element.classList.add('animated');
            animateValue(element, 0, stat.target, 2000, stat.suffix);
        }
    });
}

// Animate Value Counter
function animateValue(element, start, end, duration, suffix = '') {
    const startTime = performance.now();
    const startValue = start;
    const endValue = end;
    
    function updateValue(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const currentValue = Math.floor(startValue + (endValue - startValue) * easeOutQuart);
        
        element.textContent = currentValue.toLocaleString() + suffix;
        
        if (progress < 1) {
            requestAnimationFrame(updateValue);
        }
    }
    
    requestAnimationFrame(updateValue);
}

// Authentication Functions
// Prevent multiple CSRF token requests
let csrfTokenFetching = false;

// CSRF token is now handled by API helper

// Debounce session checks to prevent multiple simultaneous calls
let sessionCheckInProgress = false;

// Smart session check - only check if there might be an active session
async function checkUserSessionIfNeeded() {
    // Check if there's any indication of an existing session
    const hasSessionIndicators = 
        localStorage.getItem('csrf_token') ||
        localStorage.getItem('user_session') ||
        document.cookie.includes('PHPSESSID') ||
        window.location.hash.includes('login') ||
        window.location.search.includes('session');
    
    // Only check session if there are indicators or user explicitly requests it
    if (hasSessionIndicators) {
        console.log('Found session indicators, checking user session...');
        await checkUserSession();
    } else {
        console.log('No session indicators found, skipping session check');
        updateUIForLoggedOutUser();
    }
}

// Manual session check (for explicit user actions)
async function checkUserSession() {
    // Prevent multiple simultaneous session checks
    if (sessionCheckInProgress) {
        return;
    }
    
    sessionCheckInProgress = true;
    
    try {
        // Use API helper if available for better error handling
        if (window.api && typeof window.api.checkSession === 'function') {
            const data = await window.api.checkSession();
            
            if (data.success && data.logged_in) {
                currentUser = data.user;
                updateUIForLoggedInUser();
            } else {
                updateUIForLoggedOutUser();
            }
        } else {
            const response = await fetch('backend/api/auth.php?action=check-session');
            const data = await response.json();
            
            if (data.success && data.logged_in) {
                currentUser = data.user;
                updateUIForLoggedInUser();
            } else {
                updateUIForLoggedOutUser();
            }
        }
    } catch (error) {
        console.error('Session check failed:', error);
        updateUIForLoggedOutUser();
    } finally {
        sessionCheckInProgress = false;
    }
}

function updateUIForLoggedInUser() {
    authButtons.classList.add('hidden');
    userMenu.classList.remove('hidden');
    userName.textContent = currentUser.fullname || currentUser.username;
    
    // Update profile form
    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
        document.getElementById('profile-fullname').value = currentUser.fullname || '';
        document.getElementById('profile-email').value = currentUser.email || '';
        document.getElementById('profile-phone').value = currentUser.phone || '';
    }
}

function updateUIForLoggedOutUser() {
    authButtons.classList.remove('hidden');
    userMenu.classList.add('hidden');
    currentUser = null;
}

// Add session check button for development (only in debug mode)
function addSessionCheckButton() {
    if (typeof DEBUG_MODE !== 'undefined' && DEBUG_MODE) {
        const button = document.createElement('button');
        button.textContent = '🔍 Check Session';
        button.style.position = 'fixed';
        button.style.bottom = '10px';
        button.style.right = '10px';
        button.style.zIndex = '9999';
        button.style.padding = '5px 10px';
        button.style.background = '#007bff';
        button.style.color = 'white';
        button.style.border = 'none';
        button.style.borderRadius = '3px';
        button.style.cursor = 'pointer';
        button.onclick = () => {
            console.log('Manual session check triggered');
            checkUserSession();
        };
        document.body.appendChild(button);
    }
}

// Handle Login
async function handleLogin(e) {
    e.preventDefault(); // ป้องกันการ reload page
    
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    
    if (!username || !password) {
        showNotification('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน', 'error');
        return;
    }
    
    const loginBtn = document.getElementById('login-btn');
    const originalText = loginBtn.textContent;
    
    try {
        // แสดงสถานะ loading
        loginBtn.disabled = true;
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> กำลังเข้าสู่ระบบ...';
        showLoading();
        
        // ใช้ API helper แทนการเรียก fetch โดยตรง
        const result = await window.api.request('/auth.php?action=login', {
            method: 'POST',
            body: JSON.stringify({
                username: username,
                password: password
            })
        });
        
        if (result.success) {
            currentUser = result.user;
            closeModal('login-modal');
            updateUIForLoggedInUser();
            showNotification('เข้าสู่ระบบสำเร็จ!', 'success');
            
            // Store session indicator
            localStorage.setItem('user_session', 'active');
            
            // Reset form
            document.getElementById('login-form').reset();
        } else {
            showNotification(result.message || 'เข้าสู่ระบบไม่สำเร็จ', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification('เกิดข้อผิดพลาดในการเข้าสู่ระบบ', 'error');
    } finally {
        hideLoading();
        loginBtn.disabled = false;
        loginBtn.textContent = originalText;
    }
}

// Handle Register
async function handleRegister(e) {
    e.preventDefault(); // ป้องกันการ reload page
    
    const username = document.getElementById('register-username').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm-password').value;
    const fullname = document.getElementById('register-fullname').value.trim();
    const phone = document.getElementById('register-phone').value.trim();
    const agreeTerms = document.getElementById('agree-terms').checked;
    
    // Validation
    if (!username || !email || !password || !fullname) {
        showNotification('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showNotification('รหัสผ่านไม่ตรงกัน', 'error');
        return;
    }
    
    if (!agreeTerms) {
        showNotification('กรุณายอมรับข้อตกลงการใช้งาน', 'error');
        return;
    }
    
    const registerBtn = document.getElementById('register-btn');
    const originalText = registerBtn.textContent;
    
    try {
        // แสดงสถานะ loading
        registerBtn.disabled = true;
        registerBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> กำลังสมัครสมาชิก...';
        showLoading();
        
        // ใช้ API helper แทนการเรียก fetch โดยตรง
        const result = await window.api.request('/auth.php?action=register', {
            method: 'POST',
            body: JSON.stringify({
                username: username,
                email: email,
                password: password,
                fullname: fullname,
                phone: phone
            })
        });
        
        if (result.success) {
            closeModal('register-modal');
            showNotification('สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ', 'success');
            
            // Reset form
            document.getElementById('register-form').reset();
            
            // Reset form และแสดง login modal
            document.getElementById('register-form').reset();
            setTimeout(() => {
                showLoginModal();
            }, 1000);
        } else {
            showNotification(result.message || 'สมัครสมาชิกไม่สำเร็จ', 'error');
        }
    } catch (error) {
        console.error('Register error:', error);
        showNotification('เกิดข้อผิดพลาดในการสมัครสมาชิก', 'error');
    } finally {
        hideLoading();
        registerBtn.disabled = false;
        registerBtn.textContent = originalText;
    }
}

// Handle Update Profile
async function handleUpdateProfile(e) {
    e.preventDefault(); // ป้องกันการ reload page
    
    const fullname = document.getElementById('profile-fullname').value.trim();
    const email = document.getElementById('profile-email').value.trim();
    const phone = document.getElementById('profile-phone').value.trim();
    
    if (!fullname || !email) {
        showNotification('กรุณากรอกชื่อและอีเมล', 'error');
        return;
    }
    
    try {
        showLoading();
        
        // ใช้ API helper
        const result = await window.api.request('/auth.php?action=update-profile', {
            method: 'POST',
            body: JSON.stringify({
                fullname: fullname,
                email: email,
                phone: phone
            })
        });
        
        if (result.success) {
            showNotification('อัพเดทโปรไฟล์สำเร็จ!', 'success');
            
            // Update current user info
            currentUser.fullname = fullname;
            currentUser.email = email;
            currentUser.phone = phone;
            
            // Update UI
            userName.textContent = fullname;
        } else {
            showNotification(result.message || 'อัพเดทโปรไฟล์ไม่สำเร็จ', 'error');
        }
    } catch (error) {
        console.error('Update profile error:', error);
        showNotification('เกิดข้อผิดพลาดในการอัพเดทโปรไฟล์', 'error');
    } finally {
        hideLoading();
    }
}

// Handle Change Password
async function handleChangePassword(e) {
    e.preventDefault(); // ป้องกันการ reload page
    
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmNewPassword = document.getElementById('confirm-new-password').value;
    
    if (!currentPassword || !newPassword || !confirmNewPassword) {
        showNotification('กรุณากรอกข้อมูลให้ครบถ้วน', 'error');
        return;
    }
    
    if (newPassword !== confirmNewPassword) {
        showNotification('รหัสผ่านใหม่ไม่ตรงกัน', 'error');
        return;
    }
    
    try {
        showLoading();
        
        // ใช้ API helper
        const result = await window.api.request('/auth.php?action=change-password', {
            method: 'POST',
            body: JSON.stringify({
                current_password: currentPassword,
                new_password: newPassword,
                confirm_password: confirmNewPassword
            })
        });
        
        if (result.success) {
            showNotification('เปลี่ยนรหัสผ่านสำเร็จ!', 'success');
            document.getElementById('change-password-form').reset();
        } else {
            showNotification(result.message || 'เปลี่ยนรหัสผ่านไม่สำเร็จ', 'error');
        }
    } catch (error) {
        console.error('Change password error:', error);
        showNotification('เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน', 'error');
    } finally {
        hideLoading();
    }
}

// Handle Logout
async function logout() {
    try {
        // ใช้ API helper
        const result = await window.api.logout();
        
        if (result.success) {
            updateUIForLoggedOutUser();
            
            // Clear session indicators
            localStorage.removeItem('user_session');
            localStorage.removeItem('csrf_token');
            localStorage.removeItem('csrf_token_expiry');
            
            showNotification('ออกจากระบบสำเร็จ', 'success');
            
            // Redirect to home if on protected page
            if (window.location.pathname.includes('dashboard') || 
                window.location.pathname.includes('simulator')) {
                window.location.href = '/';
            }
        } else {
            showNotification(result.message || 'ออกจากระบบไม่สำเร็จ', 'error');
        }
    } catch (error) {
        console.error('Logout error:', error);
        showNotification('เกิดข้อผิดพลาดในการออกจากระบบ', 'error');
    }
}

// Password Strength Checker
function checkPasswordStrength() {
    const password = document.getElementById('register-password').value;
    const strengthIndicator = document.getElementById('password-strength');
    
    let strength = 0;
    
    // Length check
    if (password.length >= 8) strength++;
    
    // Uppercase check
    if (/[A-Z]/.test(password)) strength++;
    
    // Lowercase check
    if (/[a-z]/.test(password)) strength++;
    
    // Number check
    if (/\d/.test(password)) strength++;
    
    // Special character check
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;
    
    // Update strength indicator
    strengthIndicator.className = 'password-strength';
    
    if (strength <= 2) {
        strengthIndicator.classList.add('weak');
    } else if (strength <= 3) {
        strengthIndicator.classList.add('medium');
    } else {
        strengthIndicator.classList.add('strong');
    }
}

// Password Confirmation Checker
function checkPasswordConfirmation() {
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm-password').value;
    const confirmInput = document.getElementById('register-confirm-password');
    
    if (confirmPassword && password !== confirmPassword) {
        confirmInput.style.borderColor = 'var(--danger-color)';
    } else {
        confirmInput.style.borderColor = 'var(--border-color)';
    }
}

// Modal Functions
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
        
        // Focus first input
        const firstInput = modal.querySelector('input:not([type="hidden"])');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = 'auto';
        
        // Reset forms
        const forms = modal.querySelectorAll('form');
        forms.forEach(form => form.reset());
    }
}

function showLoginModal() {
    showModal('login-modal');
}

function showRegisterModal() {
    showModal('register-modal');
}

function showProfileModal() {
    showModal('profile-modal');
}

function switchToRegister() {
    closeModal('login-modal');
    setTimeout(() => showRegisterModal(), 300);
}

function switchToLogin() {
    closeModal('register-modal');
    setTimeout(() => showLoginModal(), 300);
}

// Toggle Password Visibility
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const button = input.nextElementSibling;
    const icon = button.querySelector('i');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fas fa-eye-slash';
    } else {
        input.type = 'password';
        icon.className = 'fas fa-eye';
    }
}

// Loading Functions
function showLoading(message = 'กำลังโหลด...') {
    // Check if loadingOverlay exists (some pages might not have it)
    if (!loadingOverlay) {
        console.log('📄 Loading overlay not found, showing fallback loading...');
        showFallbackLoading(message);
        return;
    }
    
    const loadingText = loadingOverlay.querySelector('p');
    if (loadingText) {
        loadingText.textContent = message;
    }
    loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
    // Check if loadingOverlay exists
    if (!loadingOverlay) {
        console.log('📄 Loading overlay not found, hiding fallback loading...');
        hideFallbackLoading();
        return;
    }
    
    loadingOverlay.classList.add('hidden');
}

// Fallback loading for pages without loading overlay
function showFallbackLoading(message) {
    // Remove existing fallback
    hideFallbackLoading();
    
    const fallbackLoading = document.createElement('div');
    fallbackLoading.id = 'fallback-loading';
    fallbackLoading.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        color: white;
        font-family: 'Kanit', sans-serif;
    `;
    fallbackLoading.innerHTML = `
        <div style="text-align: center;">
            <div style="border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 40px; height: 40px; animation: spin 2s linear infinite; margin: 0 auto 20px;"></div>
            <p style="margin: 0; font-size: 16px;">${message}</p>
        </div>
        <style>
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        </style>
    `;
    document.body.appendChild(fallbackLoading);
}

function hideFallbackLoading() {
    const fallbackLoading = document.getElementById('fallback-loading');
    if (fallbackLoading) {
        fallbackLoading.remove();
    }
}

// Notification Functions
function showNotification(message, type = 'info') {
    // Check if notification element exists
    if (!notification) {
        console.log('📄 Notification element not found, showing fallback notification...');
        showFallbackNotification(message, type);
        return;
    }
    
    const notificationMessage = notification.querySelector('.notification-message');
    const notificationIcon = notification.querySelector('.notification-icon');
    
    notificationMessage.textContent = message;
    
    // Reset classes
    notification.className = 'notification';
    
    // Add type class
    notification.classList.add(type);
    
    // Set icon
    let iconClass = 'fas fa-info-circle';
    switch (type) {
        case 'success':
            iconClass = 'fas fa-check-circle';
            break;
        case 'error':
            iconClass = 'fas fa-exclamation-circle';
            break;
        case 'warning':
            iconClass = 'fas fa-exclamation-triangle';
            break;
    }
    notificationIcon.className = `notification-icon ${iconClass}`;
    
    // Show notification
    notification.classList.add('show');
    
    // Auto hide after 5 seconds
    setTimeout(hideNotification, 5000);
}

function hideNotification() {
    if (notification) {
        notification.classList.remove('show');
    }
}

// Fallback notification for pages without notification element
function showFallbackNotification(message, type = 'info') {
    console.log(`📢 Fallback Notification [${type}]:`, message);
    
    const colors = {
        success: '#27ae60',
        error: '#e74c3c',
        warning: '#f39c12',
        info: '#3498db'
    };
    
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-triangle',
        warning: 'fas fa-exclamation-circle',
        info: 'fas fa-info-circle'
    };
    
    const fallbackNotification = document.createElement('div');
    fallbackNotification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${colors[type] || colors.info};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        z-index: 10001;
        font-family: 'Kanit', sans-serif;
        font-size: 14px;
        max-width: 350px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        animation: slideInRight 0.3s ease-out;
    `;
    
    fallbackNotification.innerHTML = `
        <i class="${icons[type] || icons.info}" style="margin-right: 8px;"></i>
        ${message}
        <button onclick="this.parentElement.remove()" style="
            float: right;
            background: none;
            border: none;
            color: white;
            cursor: pointer;
            font-size: 16px;
            margin-left: 10px;
        ">×</button>
        <style>
            @keyframes slideInRight {
                from {
                    opacity: 0;
                    transform: translateX(100%);
                }
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }
        </style>
    `;
    
    document.body.appendChild(fallbackNotification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (fallbackNotification.parentElement) {
            fallbackNotification.style.animation = 'slideInRight 0.3s ease-out reverse';
            setTimeout(() => fallbackNotification.remove(), 300);
        }
    }, 5000);
}

// Simulation Functions
function startSimulation() {
    if (!currentUser) {
        showNotification('กรุณาเข้าสู่ระบบก่อนใช้งานจำลองการขับ', 'warning');
        showLoginModal();
        return;
    }
    
    window.location.href = 'frontend/simulator.html';
}

function watchDemo() {
    // Implementation for demo video
    showNotification('ฟีเจอร์นี้กำลังพัฒนา', 'info');
}

// Utility Functions
function formatNumber(num) {
    return num.toLocaleString('th-TH');
}

function formatDate(date) {
    return new Intl.DateTimeFormat('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(new Date(date));
}

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

// Handle window resize
window.addEventListener('resize', debounce(() => {
    setupMobileMenu();
}, 250));

// Export functions for global access
window.showLoginModal = showLoginModal;
window.showRegisterModal = showRegisterModal;
window.showProfileModal = showProfileModal;
window.closeModal = closeModal;
window.switchToRegister = switchToRegister;
window.switchToLogin = switchToLogin;
window.togglePassword = togglePassword;
window.logout = logout;
window.startSimulation = startSimulation;
window.watchDemo = watchDemo;
window.showNotification = showNotification;
// Session management functions
window.checkUserSession = checkUserSession;
window.checkUserSessionIfNeeded = checkUserSessionIfNeeded;

// Additional error prevention for Chrome extensions
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.lastError) {
    console.warn('Chrome runtime error detected and cleared:', chrome.runtime.lastError.message);
}

// Prevent extension-related errors from bubbling up
window.addEventListener('beforeunload', () => {
    // Clear any pending chrome runtime operations
    if (typeof chrome !== 'undefined' && chrome.runtime) {
        try {
            // Safely disconnect any open ports
            if (chrome.runtime.Port) {
                chrome.runtime.Port.disconnect();
            }
        } catch (e) {
            // Silently ignore cleanup errors
        }
    }
});