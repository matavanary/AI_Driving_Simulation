/**
 * Dashboard JavaScript Controller
 * Author: Mr.Nattakit Rookkason
 * Version: 1.0
 * Date: 30 October 2025
 */

class DashboardController {
    constructor() {
        this.charts = {};
        this.currentSessionDetails = null;
        this.statsData = {};
        
        this.init();
    }
    
    async init() {
        console.log('📊 Initializing Dashboard...');
        
        try {
            // Check authentication
            await this.checkAuthentication();
            
            // Load dashboard data
            await this.loadDashboardData();
            
            // Initialize charts
            this.initializeCharts();
            
            // Setup event listeners
            this.setupEventListeners();
            
            console.log('✅ Dashboard initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize dashboard:', error);
            showNotification('ไม่สามารถโหลดข้อมูลแดชบอร์ดได้', 'error');
        }
    }
    
    async checkAuthentication() {
        try {
            const response = await api.checkSession();
            
            if (!response.success || !response.logged_in) {
                window.location.href = 'index.html';
                return;
            }
            
            // Update user info
            const userName = document.getElementById('dashboard-user-name');
            if (userName) {
                userName.textContent = response.user.fullname || response.user.username;
            }
            
        } catch (error) {
            console.error('Authentication check failed:', error);
            window.location.href = 'index.html';
        }
    }
    
    async loadDashboardData() {
        try {
            showLoading('กำลังโหลดข้อมูล...');
            
            // Load statistics
            const [statsResponse, sessionsResponse, evaluationsResponse] = await Promise.all([
                this.loadStatistics(),
                this.loadRecentSessions(),
                this.loadEvaluationStats()
            ]);
            
            // Update UI with data
            this.updateStatisticsUI(statsResponse);
            this.updateRecentSessionsUI(sessionsResponse);
            this.updatePerformanceAnalysis(evaluationsResponse);
            
            hideLoading();
            
        } catch (error) {
            hideLoading();
            console.error('Failed to load dashboard data:', error);
            showNotification('เกิดข้อผิดพลาดในการโหลดข้อมูล', 'error');
        }
    }
    
    async loadStatistics() {
        try {
            // Load user sessions for statistics calculation
            const sessions = await api.getUserSessions(1, 100);
            
            if (sessions.success) {
                const sessionData = sessions.sessions;
                
                // Calculate statistics
                const stats = {
                    totalSessions: sessionData.length,
                    totalDistance: sessionData.reduce((sum, session) => sum + (session.total_distance || 0), 0),
                    totalTime: sessionData.reduce((sum, session) => sum + (session.total_time || 0), 0),
                    avgScore: sessionData.length > 0 ? 
                        sessionData.reduce((sum, session) => sum + (session.total_score || 0), 0) / sessionData.length : 0
                };
                
                return stats;
            }
            
            return { totalSessions: 0, totalDistance: 0, totalTime: 0, avgScore: 0 };
            
        } catch (error) {
            console.error('Failed to load statistics:', error);
            return { totalSessions: 0, totalDistance: 0, totalTime: 0, avgScore: 0 };
        }
    }
    
    async loadRecentSessions() {
        try {
            const response = await api.getUserSessions(1, 10);
            return response.success ? response.sessions : [];
        } catch (error) {
            console.error('Failed to load recent sessions:', error);
            return [];
        }
    }
    
    async loadEvaluationStats() {
        try {
            const response = await api.getEvaluationStats(30);
            return response.success ? response.statistics : {};
        } catch (error) {
            console.error('Failed to load evaluation stats:', error);
            return {};
        }
    }
    
    updateStatisticsUI(stats) {
        // Update stat cards
        document.getElementById('total-sessions').textContent = stats.totalSessions || '-';
        document.getElementById('avg-score').textContent = stats.avgScore ? Math.round(stats.avgScore) : '-';
        document.getElementById('total-distance').textContent = stats.totalDistance ? 
            `${stats.totalDistance.toFixed(1)} km` : '-';
        
        // Convert total time to hours and minutes
        if (stats.totalTime) {
            const hours = Math.floor(stats.totalTime / 3600);
            const minutes = Math.floor((stats.totalTime % 3600) / 60);
            document.getElementById('total-time').textContent = `${hours}h ${minutes}m`;
        } else {
            document.getElementById('total-time').textContent = '-';
        }
        
        // Store for chart updates
        this.statsData = stats;
    }
    
    updateRecentSessionsUI(sessions) {
        const tableBody = document.getElementById('sessions-table-body');
        if (!tableBody) return;
        
        if (sessions.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center">
                        <div style="padding: 2rem; color: var(--text-muted);">
                            <i class="fas fa-inbox" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                            <p>ยังไม่มีข้อมูลเซสชัน</p>
                            <a href="simulator.html" class="btn btn-primary">
                                <i class="fas fa-play"></i> เริ่มจำลองการขับ
                            </a>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        const rows = sessions.map(session => {
            const date = new Date(session.start_time).toLocaleDateString('th-TH', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
            
            const duration = this.formatDuration(session.total_time);
            const distance = session.total_distance ? `${session.total_distance.toFixed(1)} km` : '-';
            const score = session.total_score || '-';
            const grade = session.grade || '-';
            
            const environmentBadge = `<span class="environment-badge environment-${session.environment_type}">
                ${this.getEnvironmentName(session.environment_type)}
            </span>`;
            
            const gradeBadge = grade !== '-' ? 
                `<span class="grade-badge grade-${grade.toLowerCase().replace('+', '')}">${grade}</span>` : 
                '-';
            
            return `
                <tr>
                    <td>${date}</td>
                    <td>${environmentBadge}</td>
                    <td>${duration}</td>
                    <td>${distance}</td>
                    <td>${score}</td>
                    <td>${gradeBadge}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-sm btn-view" onclick="dashboard.viewSessionDetails(${session.session_id})">
                                <i class="fas fa-eye"></i> ดู
                            </button>
                            <button class="btn-sm btn-download" onclick="dashboard.downloadSessionReport(${session.session_id})">
                                <i class="fas fa-download"></i> PDF
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
        
        tableBody.innerHTML = rows;
    }
    
    updatePerformanceAnalysis(evalStats) {
        // Update latest score and improvement
        if (evalStats.avg_score) {
            document.getElementById('latest-score').textContent = Math.round(evalStats.avg_score);
            
            // Calculate improvement (mock calculation)
            const improvement = Math.round(Math.random() * 20 - 10); // -10 to +10
            const changeElement = document.getElementById('score-change');
            const progressElement = document.getElementById('improvement-progress');
            
            if (changeElement) {
                changeElement.textContent = improvement > 0 ? `+${improvement}` : `${improvement}`;
                changeElement.style.color = improvement > 0 ? 'var(--success-color)' : 'var(--danger-color)';
            }
            
            if (progressElement) {
                const progressPercent = Math.max(0, Math.min(100, 50 + improvement * 2));
                progressElement.style.width = `${progressPercent}%`;
            }
        }
        
        // Update improvement suggestions
        this.updateImprovementSuggestions(evalStats);
        
        // Update driving strengths
        this.updateDrivingStrengths(evalStats);
    }
    
    updateImprovementSuggestions(evalStats) {
        const container = document.getElementById('improvement-suggestions');
        if (!container) return;
        
        const suggestions = [];
        
        if (evalStats.avg_overspeed > 2) {
            suggestions.push({
                icon: 'fas fa-tachometer-alt',
                text: 'ควรลดการขับรถเร็วเกินกำหนด'
            });
        }
        
        if (evalStats.avg_collisions > 0.5) {
            suggestions.push({
                icon: 'fas fa-car-crash',
                text: 'เพิ่มความระมัดระวังเพื่อหลีกเลี่ยงการชน'
            });
        }
        
        if (evalStats.fail_count > evalStats.excellent_count) {
            suggestions.push({
                icon: 'fas fa-graduation-cap',
                text: 'ฝึกฝนการขับรถเพิ่มเติมเพื่อปรับปรุงคะแนน'
            });
        }
        
        if (suggestions.length === 0) {
            suggestions.push({
                icon: 'fas fa-thumbs-up',
                text: 'การขับรถของคุณดีมาก! คงสภาพนี้ต่อไป'
            });
        }
        
        container.innerHTML = suggestions.map(suggestion => `
            <div class="behavior-item">
                <div class="behavior-icon improvement">
                    <i class="${suggestion.icon}"></i>
                </div>
                <span>${suggestion.text}</span>
            </div>
        `).join('');
    }
    
    updateDrivingStrengths(evalStats) {
        const container = document.getElementById('driving-strengths');
        if (!container) return;
        
        const strengths = [];
        
        if (evalStats.excellent_count > evalStats.fail_count) {
            strengths.push({
                icon: 'fas fa-trophy',
                text: 'คะแนนการขับรถอยู่ในระดับดีเยี่ยม'
            });
        }
        
        if (evalStats.avg_score > 80) {
            strengths.push({
                icon: 'fas fa-star',
                text: 'รักษาคะแนนเฉลี่ยในระดับสูง'
            });
        }
        
        if (evalStats.total_evaluations > 10) {
            strengths.push({
                icon: 'fas fa-road',
                text: 'มีประสบการณ์การขับรถจำลองเยอะ'
            });
        }
        
        if (strengths.length === 0) {
            strengths.push({
                icon: 'fas fa-seedling',
                text: 'กำลังพัฒนาทักษะการขับรถ'
            });
        }
        
        container.innerHTML = strengths.map(strength => `
            <div class="strength-item">
                <div class="behavior-icon strength">
                    <i class="${strength.icon}"></i>
                </div>
                <span>${strength.text}</span>
            </div>
        `).join('');
    }
    
    initializeCharts() {
        this.initializeScoreTrendChart();
        this.initializeBehaviorChart();
    }
    
    initializeScoreTrendChart() {
        const ctx = document.getElementById('score-trend-chart');
        if (!ctx) return;
        
        // Generate mock data for score trend
        const labels = [];
        const data = [];
        
        for (let i = 7; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            labels.push(date.toLocaleDateString('th-TH', { month: 'short', day: 'numeric' }));
            data.push(Math.floor(Math.random() * 30) + 70); // Random scores between 70-100
        }
        
        this.charts.scoreTrend = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'คะแนน',
                    data: data,
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    pointBackgroundColor: '#2563eb',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        min: 0,
                        max: 100,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        ticks: {
                            color: '#64748b'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#64748b'
                        }
                    }
                },
                elements: {
                    point: {
                        hoverBackgroundColor: '#2563eb'
                    }
                }
            }
        });
    }
    
    initializeBehaviorChart() {
        const ctx = document.getElementById('behavior-chart');
        if (!ctx) return;
        
        // Generate mock behavior data
        const behaviorData = {
            labels: ['การขับปกติ', 'ขับเร็วเกิน', 'เบรกกะทันหัน', 'ออกนอกเลน', 'การชน'],
            datasets: [{
                data: [75, 15, 5, 3, 2],
                backgroundColor: [
                    '#10b981',
                    '#f59e0b',
                    '#ef4444',
                    '#8b5cf6',
                    '#f87171'
                ],
                borderWidth: 0,
                hoverOffset: 4
            }]
        };
        
        this.charts.behavior = new Chart(ctx, {
            type: 'doughnut',
            data: behaviorData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true,
                            color: '#64748b',
                            font: {
                                size: 12
                            }
                        }
                    }
                },
                cutout: '60%'
            }
        });
    }
    
    setupEventListeners() {
        // Score period selector
        const scorePeriodSelect = document.getElementById('score-period');
        if (scorePeriodSelect) {
            scorePeriodSelect.addEventListener('change', (e) => {
                this.updateScoreTrendChart(e.target.value);
            });
        }
    }
    
    updateScoreTrendChart(days) {
        if (!this.charts.scoreTrend) return;
        
        // Generate new data based on selected period
        const labels = [];
        const data = [];
        
        for (let i = parseInt(days); i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            
            if (days === '7') {
                labels.push(date.toLocaleDateString('th-TH', { weekday: 'short' }));
            } else {
                labels.push(date.toLocaleDateString('th-TH', { month: 'short', day: 'numeric' }));
            }
            
            data.push(Math.floor(Math.random() * 30) + 70);
        }
        
        this.charts.scoreTrend.data.labels = labels;
        this.charts.scoreTrend.data.datasets[0].data = data;
        this.charts.scoreTrend.update();
    }
    
    async viewSessionDetails(sessionId) {
        try {
            showLoading('กำลังโหลดรายละเอียด...');
            
            // Load session evaluation
            const evaluation = await api.getSessionEvaluation(sessionId);
            
            if (!evaluation.success) {
                throw new Error('ไม่สามารถโหลดข้อมูลเซสชันได้');
            }
            
            this.currentSessionDetails = evaluation.evaluation;
            this.populateSessionDetailsModal(evaluation.evaluation);
            
            hideLoading();
            showModal('session-details-modal');
            
        } catch (error) {
            hideLoading();
            console.error('Failed to load session details:', error);
            showNotification('ไม่สามารถโหลดรายละเอียดเซสชันได้', 'error');
        }
    }
    
    populateSessionDetailsModal(evaluation) {
        // Basic info
        if (evaluation.created_at) {
            document.getElementById('detail-date').textContent = 
                new Date(evaluation.created_at).toLocaleDateString('th-TH');
        }
        
        // Stats (from detailed_report if available)
        if (evaluation.detailed_report && evaluation.detailed_report.session_info) {
            const sessionInfo = evaluation.detailed_report.session_info;
            document.getElementById('detail-environment').textContent = 
                this.getEnvironmentName(sessionInfo.environment);
            document.getElementById('detail-vehicle').textContent = sessionInfo.vehicle_type || '-';
            document.getElementById('detail-input').textContent = sessionInfo.input_device || '-';
            document.getElementById('detail-duration').textContent = 
                this.formatDuration(sessionInfo.duration);
        }
        
        // Speed analysis
        if (evaluation.detailed_report && evaluation.detailed_report.speed_analysis) {
            const speedAnalysis = evaluation.detailed_report.speed_analysis;
            document.getElementById('detail-avg-speed').textContent = 
                `${Math.round(speedAnalysis.avg_speed)} km/h`;
            document.getElementById('detail-max-speed').textContent = 
                `${Math.round(speedAnalysis.max_speed)} km/h`;
        }
        
        // Evaluation results
        document.getElementById('detail-score').textContent = evaluation.total_score || '-';
        
        const gradeElement = document.getElementById('detail-grade');
        if (gradeElement) {
            gradeElement.textContent = evaluation.grade || '-';
            gradeElement.className = `grade-display-large grade-${(evaluation.grade || 'f').toLowerCase().replace('+', '')}`;
        }
        
        // Behavior counts
        document.getElementById('detail-overspeed').textContent = evaluation.overspeed_count || 0;
        document.getElementById('detail-sudden-brake').textContent = evaluation.sudden_brake_count || 0;
        document.getElementById('detail-lane-violation').textContent = evaluation.lane_violation_count || 0;
        document.getElementById('detail-collision').textContent = evaluation.collision_count || 0;
        
        // Recommendations
        this.populateRecommendations(evaluation);
    }
    
    populateRecommendations(evaluation) {
        const container = document.getElementById('detail-recommendations');
        if (!container) return;
        
        let recommendations = [];
        
        // Get recommendations from detailed_report
        if (evaluation.detailed_report && evaluation.detailed_report.recommendations) {
            recommendations = evaluation.detailed_report.recommendations;
        } else {
            // Generate basic recommendations based on behavior counts
            if (evaluation.overspeed_count > 3) {
                recommendations.push('ควรลดความเร็วให้อยู่ในขีดจำกัดที่กำหนด');
            }
            if (evaluation.sudden_brake_count > 2) {
                recommendations.push('ควรเบรกอย่างค่อยเป็นค่อยไป');
            }
            if (evaluation.lane_violation_count > 1) {
                recommendations.push('ควรรักษาตำแหน่งรถให้อยู่ในเลน');
            }
            if (evaluation.collision_count > 0) {
                recommendations.push('ควรระมัดระวังมากขึ้นเพื่อหลีกเลี่ยงการชน');
            }
            
            if (recommendations.length === 0) {
                recommendations.push('การขับรถของคุณดีมาก! คงสภาพนี้ต่อไป');
            }
        }
        
        if (recommendations.length > 0) {
            container.innerHTML = recommendations.map((rec, index) => `
                <div class="recommendation-item">
                    <div class="recommendation-icon">
                        <i class="fas fa-lightbulb"></i>
                    </div>
                    <div class="recommendation-text">${rec}</div>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<p class="text-muted">ไม่มีคำแนะนำเพิ่มเติม</p>';
        }
    }
    
    async downloadSessionReport(sessionId) {
        try {
            showLoading('กำลังสร้างรายงาน...');
            
            // Get session evaluation if not already loaded
            let evaluation = this.currentSessionDetails;
            if (!evaluation || evaluation.session_id !== sessionId) {
                const response = await api.getSessionEvaluation(sessionId);
                if (!response.success) {
                    throw new Error('ไม่สามารถโหลดข้อมูลเซสชันได้');
                }
                evaluation = response.evaluation;
            }
            
            // Generate PDF report
            this.generatePDFReport(evaluation);
            
            hideLoading();
            
        } catch (error) {
            hideLoading();
            console.error('Failed to download report:', error);
            showNotification('ไม่สามารถสร้างรายงานได้', 'error');
        }
    }
    
    generatePDFReport(evaluation) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Set Thai font (if available)
        doc.setFont('helvetica');
        
        // Header
        doc.setFontSize(20);
        doc.text('รายงานผลการจำลองการขับรถ', 20, 30);
        
        // Session info
        doc.setFontSize(14);
        doc.text('ข้อมูลเซสชัน', 20, 50);
        doc.setFontSize(12);
        doc.text(`วันที่: ${new Date(evaluation.created_at).toLocaleDateString('th-TH')}`, 20, 60);
        doc.text(`คะแนน: ${evaluation.total_score}/100`, 20, 70);
        doc.text(`เกรด: ${evaluation.grade}`, 20, 80);
        
        // Behavior analysis
        doc.setFontSize(14);
        doc.text('การวิเคราะห์พฤติกรรม', 20, 100);
        doc.setFontSize(12);
        doc.text(`ขับเร็วเกิน: ${evaluation.overspeed_count} ครั้ง`, 20, 110);
        doc.text(`เบรกกะทันหัน: ${evaluation.sudden_brake_count} ครั้ง`, 20, 120);
        doc.text(`ออกนอกเลน: ${evaluation.lane_violation_count} ครั้ง`, 20, 130);
        doc.text(`การชน: ${evaluation.collision_count} ครั้ง`, 20, 140);
        
        // Speed analysis
        if (evaluation.detailed_report && evaluation.detailed_report.speed_analysis) {
            const speedAnalysis = evaluation.detailed_report.speed_analysis;
            doc.setFontSize(14);
            doc.text('การวิเคราะห์ความเร็ว', 20, 160);
            doc.setFontSize(12);
            doc.text(`ความเร็วสูงสุด: ${Math.round(speedAnalysis.max_speed)} km/h`, 20, 170);
            doc.text(`ความเร็วเฉลี่ย: ${Math.round(speedAnalysis.avg_speed)} km/h`, 20, 180);
            doc.text(`ขีดจำกัดความเร็ว: ${speedAnalysis.speed_limit} km/h`, 20, 190);
        }
        
        // Recommendations
        if (evaluation.detailed_report && evaluation.detailed_report.recommendations) {
            doc.setFontSize(14);
            doc.text('คำแนะนำเพื่อการปรับปรุง', 20, 210);
            doc.setFontSize(10);
            
            evaluation.detailed_report.recommendations.forEach((rec, index) => {
                doc.text(`${index + 1}. ${rec}`, 25, 220 + (index * 10));
            });
        }
        
        // Footer
        doc.setFontSize(8);
        doc.text(`สร้างโดย DriveSim Pro - ${new Date().toLocaleDateString('th-TH')}`, 20, 280);
        
        // Save PDF
        const fileName = `driving_report_${evaluation.session_id}_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);
        
        showNotification('ดาวน์โหลดรายงานสำเร็จ!', 'success');
    }
    
    // Utility methods
    formatDuration(seconds) {
        if (!seconds) return '-';
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${secs.toString().padStart(2, '0')}`;
        }
    }
    
    getEnvironmentName(environment) {
        const names = {
            'city': 'เมือง',
            'highway': 'ทางด่วน',
            'night': 'กลางคืน',
            'rain': 'ฝนตก'
        };
        return names[environment] || environment;
    }
    
    async loadAllSessions() {
        try {
            showLoading('กำลังโหลดเซสชันทั้งหมด...');
            
            const response = await api.getUserSessions(1, 50);
            
            if (response.success) {
                this.updateRecentSessionsUI(response.sessions);
                showNotification('โหลดข้อมูลสำเร็จ', 'success');
            } else {
                throw new Error('ไม่สามารถโหลดข้อมูลได้');
            }
            
            hideLoading();
            
        } catch (error) {
            hideLoading();
            console.error('Failed to load all sessions:', error);
            showNotification('ไม่สามารถโหลดข้อมูลเซสชันได้', 'error');
        }
    }
    
    // Cleanup
    destroy() {
        // Destroy charts
        Object.values(this.charts).forEach(chart => {
            if (chart) {
                chart.destroy();
            }
        });
        
        this.charts = {};
    }
}

// Global functions for modal actions
window.downloadSessionReport = function() {
    if (window.dashboard && window.dashboard.currentSessionDetails) {
        window.dashboard.generatePDFReport(window.dashboard.currentSessionDetails);
        closeModal('session-details-modal');
    }
};

window.showReportsModal = function() {
    showNotification('ฟีเจอร์รายงานขั้นสูงกำลังพัฒนา', 'info');
};

window.loadAllSessions = function() {
    if (window.dashboard) {
        window.dashboard.loadAllSessions();
    }
};

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('📊 Initializing Dashboard Controller...');
    
    // Create global dashboard instance
    window.dashboard = new DashboardController();
    
    // Handle page unload
    window.addEventListener('beforeunload', () => {
        if (window.dashboard) {
            window.dashboard.destroy();
        }
    });
});

// Export for debugging
window.DashboardController = DashboardController;