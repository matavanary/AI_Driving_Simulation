/**
 * Chart.js Loader with Local Fallback
 * Author: Mr.Nattakit Rookkason  
 * Version: 1.0
 * Date: 31 October 2025
 */

// Create a simple chart implementation for offline use
window.Chart = window.Chart || {
    // Basic chart constructor for fallback
    Chart: function(ctx, config) {
        console.warn('Using fallback Chart implementation');
        this.ctx = ctx;
        this.config = config;
        this.data = config.data || {};
        this.options = config.options || {};
        
        // Simple canvas drawing fallback
        this.render = function() {
            const canvas = typeof ctx === 'string' ? document.getElementById(ctx) : ctx;
            if (!canvas || !canvas.getContext) return;
            
            const context = canvas.getContext('2d');
            const width = canvas.width;
            const height = canvas.height;
            
            // Clear canvas
            context.clearRect(0, 0, width, height);
            
            // Draw simple chart placeholder
            context.fillStyle = '#f8f9fa';
            context.fillRect(0, 0, width, height);
            
            context.fillStyle = '#6c757d';
            context.font = '14px Kanit, sans-serif';
            context.textAlign = 'center';
            context.fillText('Chart.js ไม่พร้อมใช้งาน', width/2, height/2 - 10);
            context.fillText('ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต', width/2, height/2 + 10);
        };
        
        this.update = function() { this.render(); };
        this.destroy = function() {};
        
        // Auto render
        setTimeout(() => this.render(), 100);
        
        return this;
    },
    
    // Chart types
    defaults: {
        global: {
            responsive: true,
            maintainAspectRatio: false
        }
    },
    
    // Register method stub
    register: function() {},
    
    // Default colors
    colors: [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', 
        '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF'
    ]
};

// Export for compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Chart;
}

console.log('Chart.js fallback loaded successfully');