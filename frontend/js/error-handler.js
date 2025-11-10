/**
 * Global Error Handler for Driving Simulator
 * Author: Mr.Nattakit Rookkason
 * Version: 1.0
 * Date: 31 October 2025
 */

class ErrorHandler {
    constructor() {
        this.setupGlobalErrorHandlers();
        this.errorQueue = [];
        this.maxErrors = 100;
    }

    // Setup global error handlers
    setupGlobalErrorHandlers() {
        // JavaScript errors
        window.addEventListener('error', (event) => {
            this.handleJavaScriptError(event);
        });

        // Unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.handlePromiseRejection(event);
        });

        // Chrome extension errors (to prevent runtime.lastError)
        if (typeof chrome !== 'undefined' && chrome.runtime) {
            chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
                try {
                    // Handle chrome extension messages safely
                    return false; // Don't keep message channel open
                } catch (error) {
                    console.warn('Chrome runtime message error (safely ignored):', error);
                    return false;
                }
            });
        }
    }

    // Handle JavaScript errors
    handleJavaScriptError(event) {
        const error = {
            type: 'javascript',
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            stack: event.error?.stack,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent
        };

        this.logError(error);
        
        // Don't show error to user for minor issues
        if (!this.isMinorError(error)) {
            this.showUserFriendlyError(error);
        }
    }

    // Handle promise rejections
    handlePromiseRejection(event) {
        const error = {
            type: 'promise',
            message: event.reason?.message || event.reason,
            stack: event.reason?.stack,
            timestamp: new Date().toISOString(),
            url: window.location.href
        };

        this.logError(error);

        // Prevent default browser error handling for known safe errors
        if (this.isSafePromiseError(event.reason)) {
            event.preventDefault();
            return;
        }

        this.showUserFriendlyError(error);
    }

    // Check if error is minor (don't show to user)
    isMinorError(error) {
        const minorPatterns = [
            'ResizeObserver loop limit exceeded',
            'Non-Error promise rejection captured',
            'Loading chunk',
            'dynamically imported module',
            'webkitCancel',
            'runtime.lastError'
        ];

        return minorPatterns.some(pattern => 
            error.message?.includes(pattern) || 
            error.stack?.includes(pattern)
        );
    }

    // Check if promise error is safe to ignore
    isSafePromiseError(reason) {
        if (typeof reason === 'string') {
            return reason.includes('runtime.lastError') || 
                   reason.includes('Extension context invalidated') ||
                   reason.includes('message port closed');
        }

        if (reason?.message) {
            return reason.message.includes('runtime.lastError') ||
                   reason.message.includes('Extension context invalidated') ||
                   reason.message.includes('message port closed');
        }

        return false;
    }

    // Log error to console and storage
    logError(error) {
        console.warn('🐛 Error captured:', error);
        
        // Add to error queue
        this.errorQueue.push(error);
        
        // Keep queue size manageable
        if (this.errorQueue.length > this.maxErrors) {
            this.errorQueue.shift();
        }

        // Store in localStorage for debugging
        try {
            const storedErrors = JSON.parse(localStorage.getItem('drivesim_errors') || '[]');
            storedErrors.push(error);
            
            // Keep only last 50 errors
            if (storedErrors.length > 50) {
                storedErrors.splice(0, storedErrors.length - 50);
            }
            
            localStorage.setItem('drivesim_errors', JSON.stringify(storedErrors));
        } catch (e) {
            console.warn('Could not store error in localStorage:', e);
        }
    }

    // Show user-friendly error message
    showUserFriendlyError(error) {
        // Don't overwhelm user with too many error messages
        if (this.getRecentErrorCount() > 3) {
            return;
        }

        const message = this.getUserFriendlyMessage(error);
        
        // Show notification if available
        if (window.showNotification) {
            window.showNotification(message, 'error');
        } else {
            console.error('User Error:', message);
        }
    }

    // Get user-friendly error message
    getUserFriendlyMessage(error) {
        if (error.message?.includes('fetch')) {
            return 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจสอบการเชื่อมต่ออินเตอร์เน็ต';
        }

        if (error.message?.includes('JSON')) {
            return 'ข้อมูลจากเซิร์ฟเวอร์ไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง';
        }

        if (error.type === 'javascript') {
            return 'เกิดข้อผิดพลาดในระบบ กรุณารีเฟรชหน้าเว็บ';
        }

        return 'เกิดข้อผิดพลาดที่ไม่คาดคิด กรุณาลองใหม่อีกครั้ง';
    }

    // Get count of recent errors (last 30 seconds)
    getRecentErrorCount() {
        const now = Date.now();
        const thirtySecondsAgo = now - (30 * 1000);
        
        return this.errorQueue.filter(error => 
            new Date(error.timestamp).getTime() > thirtySecondsAgo
        ).length;
    }

    // Get all errors for debugging
    getAllErrors() {
        return this.errorQueue;
    }

    // Clear error queue
    clearErrors() {
        this.errorQueue = [];
        localStorage.removeItem('drivesim_errors');
    }

    // Send errors to server (if needed)
    async sendErrorsToServer() {
        if (this.errorQueue.length === 0) return;

        try {
            const response = await fetch('../backend/api/logging.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'log_errors',
                    errors: this.errorQueue
                })
            });

            if (response.ok) {
                console.log('Errors sent to server successfully');
                this.clearErrors();
            }
        } catch (error) {
            console.warn('Failed to send errors to server:', error);
        }
    }
}

// Initialize error handler
const errorHandler = new ErrorHandler();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ErrorHandler;
}

// Make available globally
window.ErrorHandler = ErrorHandler;
window.errorHandler = errorHandler;