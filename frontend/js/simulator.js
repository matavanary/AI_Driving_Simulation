/**
 * Main Simulator Controller
 * Integrates all components together
 * Author: Mr.Nattakit Rookkason
 * Version: 1.0
 * Date: 30 October 2025
 */

class SimulatorController {
    constructor() {
        // Core components
        this.gamepad = null;
        this.simulation = null;
        this.chart = null;
        
        // Session management
        this.currentSession = null;
        this.sessionActive = false;
        this.sessionStartTime = null;
        this.sessionData = [];
        
        // Real-time stats
        this.stats = {
            maxSpeed: 0,
            distance: 0,
            elapsedTime: 0,
            overspeedCount: 0,
            suddenBrakeCount: 0,
            laneViolationCount: 0,
            collisionCount: 0,
            currentScore: 100
        };
        
        // Data logging
        this.logBuffer = [];
        this.lastLogTime = 0;
        this.logInterval = 500; // 0.5 seconds
        
        // Speed chart data
        this.speedChartData = {
            labels: [],
            datasets: [{
                label: 'Speed (km/h)',
                data: [],
                borderColor: '#2563eb',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                fill: true,
                tension: 0.4
            }]
        };
        
        // UI elements
        this.ui = {
            startBtn: document.getElementById('start-session-btn'),
            stopBtn: document.getElementById('stop-session-btn'),
            environmentSelect: document.getElementById('environment-select'),
            vehicleSelect: document.getElementById('vehicle-select'),
            inputDeviceSelect: document.getElementById('input-device-select'),
            
            // HUD elements
            speedValue: document.getElementById('speed-value'),
            speedNeedle: document.getElementById('speed-needle'),
            gearValue: document.getElementById('gear-value'),
            rpmValue: document.getElementById('rpm-value'),
            sessionTime: document.getElementById('session-time'),
            
            // Stats elements
            currentSpeed: document.getElementById('current-speed'),
            maxSpeed: document.getElementById('max-speed'),
            distance: document.getElementById('distance'),
            elapsedTime: document.getElementById('elapsed-time'),
            
            // Behavior elements
            overspeedCount: document.getElementById('overspeed-count'),
            suddenBrakeCount: document.getElementById('sudden-brake-count'),
            laneViolationCount: document.getElementById('lane-violation-count'),
            collisionCount: document.getElementById('collision-count'),
            
            // Score elements
            currentScore: document.getElementById('current-score'),
            currentGrade: document.getElementById('current-grade'),
            
            // Warning display
            warningDisplay: document.getElementById('warning-display'),
            warningIcon: document.querySelector('.warning-icon'),
            warningText: document.querySelector('.warning-text'),
            
            // Loading
            simulationLoading: document.getElementById('simulation-loading'),
            loadingProgress: document.getElementById('loading-progress'),
            hudOverlay: document.getElementById('hud-overlay')
        };
        
        // Performance tracking
        this.lastUIUpdate = 0;
        this.performanceMode = false;
        
        // Initialize
        this.init();
    }
    
    async init() {
        console.log('🎮 Initializing Simulator Controller...');
        
        try {
            // Performance monitoring
            const startTime = performance.now();
            
            // Check authentication
            await this.checkAuthentication();
            
            // Initialize components
            await this.initializeComponents();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Load user preferences
            this.loadPreferences();
            
            // Performance debug info
            const initTime = performance.now() - startTime;
            console.log(`✅ Simulator Controller initialized in ${initTime.toFixed(2)}ms`);
            
            // Add performance monitor
            this.startPerformanceMonitor();
            
        } catch (error) {
            console.error('❌ Failed to initialize simulator:', error);
            this.showError('ไม่สามารถเริ่มต้นระบบจำลองได้: ' + error.message);
        }
    }
    
    startPerformanceMonitor() {
        let frameCount = 0;
        let lastTime = performance.now();
        
        const monitor = () => {
            frameCount++;
            
            if (frameCount % 60 === 0) { // Check every 60 frames
                const currentTime = performance.now();
                const fps = 60000 / (currentTime - lastTime);
                
                if (fps < 30 && !this.performanceMode) {
                    console.warn(`⚠️ Low FPS detected: ${fps.toFixed(1)} fps`);
                    this.enablePerformanceMode();
                }
                
                lastTime = currentTime;
            }
            
            requestAnimationFrame(monitor);
        };
        
        requestAnimationFrame(monitor);
    }
    
    enablePerformanceMode() {
        this.performanceMode = true;
        console.log('🚀 Performance mode enabled');
        
        // Reduce update frequency
        this.logInterval = 1000; // Increase to 1 second
        
        safeShowNotification('เปิดโหมดประสิทธิภาพเพื่อปรับปรุงความเร็ว', 'info');
    }
    
    async checkAuthentication() {
        try {
            // ใช้ API helper เหมือน main.js
            let response;
            if (window.api && typeof window.api.checkSession === 'function') {
                response = await window.api.checkSession();
            } else {
                const res = await fetch('backend/api/auth.php?action=check-session');
                response = await res.json();
            }
    
            if (response.success && response.logged_in) {
                // อัพเดท UI สำหรับผู้ใช้ที่ login แล้ว
                const userName = document.getElementById('current-user');
                if (userName) {
                    userName.textContent = response.user.fullname || response.user.username;
                }
                // สามารถเก็บ currentUser ไว้ใช้งานต่อได้
                window.currentUser = response.user;
            } else {
                // ไม่ได้ login → redirect ไปหน้า index.html
                window.location.href = '../';
            }
        } catch (error) {
            console.error('Authentication check failed:', error);
            window.location.href = '../';
        }
    }
    
    async initializeComponents() {
        // Show loading
        this.updateLoadingProgress(0, 'กำลังเริ่มต้นระบบ...');
        
        // Initialize gamepad controller
        this.updateLoadingProgress(20, 'กำลังตรวจจับอุปกรณ์ควบคุม...');
        this.gamepad = new GamepadController();
        this.setupGamepadCallbacks();
        
        // Initialize 3D simulation
        this.updateLoadingProgress(40, 'กำลังสร้างโลก 3D...');
        const canvas = document.getElementById('three-canvas');
        this.simulation = new SimulationEngine(canvas);
        this.setupSimulationCallbacks();
        
        // Initialize speed chart
        this.updateLoadingProgress(60, 'กำลังตั้งค่ากราฟ...');
        this.initializeChart();
        
        // Setup camera controls
        this.updateLoadingProgress(80, 'กำลังตั้งค่ากล้อง...');
        this.setupCameraControls();
        
        // Start render loop
        this.updateLoadingProgress(100, 'เสร็จสิ้น!');
        this.startRenderLoop();
        
        // Hide loading after a brief delay
        setTimeout(() => {
            this.ui.simulationLoading.classList.add('hidden');
            this.ui.hudOverlay.classList.remove('hidden');
        }, 500);
    }
    
    updateLoadingProgress(percent, message) {
        if (this.ui.loadingProgress) {
            this.ui.loadingProgress.textContent = `${percent}% - ${message}`;
        }
    }
    
    setupGamepadCallbacks() {
        this.gamepad.onInputChange = (inputs) => {
            if (this.sessionActive && this.simulation) {
                this.simulation.updateInput(inputs);
                
                // Handle reset command
                if (inputs.reset) {
                    this.resetVehicle();
                }
            }
        };
        
        this.gamepad.onConnect = (gamepad) => {
            console.log('🎮 Gamepad connected:', gamepad.id);
            safeShowNotification('เชื่อมต่ออุปกรณ์ควบคุมแล้ว: ' + gamepad.id, 'success');
        };
        
        this.gamepad.onDisconnect = (gamepad) => {
            console.log('🎮 Gamepad disconnected:', gamepad.id);
            safeShowNotification('อุปกรณ์ควบคุมขาดการเชื่อมต่อ', 'warning');
        };
    }
    
    setupSimulationCallbacks() {
        this.simulation.onPositionUpdate = (data) => {
            this.handlePositionUpdate(data);
        };
        
        this.simulation.onCollision = (data) => {
            this.handleCollision(data);
        };
        
        this.simulation.onLaneViolation = (data) => {
            this.handleLaneViolation(data);
        };
    }
    
    initializeChart() {
        const ctx = document.getElementById('speed-chart');
        if (!ctx) return;
        
        this.chart = new Chart(ctx, {
            type: 'line',
            data: this.speedChartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        display: false
                    },
                    y: {
                        beginAtZero: true,
                        max: 140,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.7)',
                            font: {
                                size: 10
                            }
                        }
                    }
                },
                elements: {
                    point: {
                        radius: 0
                    }
                },
                animation: {
                    duration: 0
                }
            }
        });
    }
    
    setupCameraControls() {
        document.getElementById('camera-cockpit')?.addEventListener('click', () => {
            this.simulation.setCameraMode('cockpit');
            this.updateCameraButtons('camera-cockpit');
        });
        
        document.getElementById('camera-follow')?.addEventListener('click', () => {
            this.simulation.setCameraMode('follow');
            this.updateCameraButtons('camera-follow');
        });
        
        document.getElementById('camera-top')?.addEventListener('click', () => {
            this.simulation.setCameraMode('top');
            this.updateCameraButtons('camera-top');
        });
        
        // Set default active camera
        this.updateCameraButtons('camera-follow');
    }
    
    updateCameraButtons(activeId) {
        document.querySelectorAll('.camera-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById(activeId)?.classList.add('active');
    }
    
    setupEventListeners() {
        // Session controls
        this.ui.startBtn?.addEventListener('click', () => this.startSession());
        this.ui.stopBtn?.addEventListener('click', () => this.endSession());
        
        // Environment change
        this.ui.environmentSelect?.addEventListener('change', (e) => {
            if (this.simulation) {
                this.simulation.setEnvironment(e.target.value);
            }
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            switch (e.code) {
                case 'F1':
                    e.preventDefault();
                    this.toggleHelp();
                    break;
                case 'F2':
                    e.preventDefault();
                    this.toggleStats();
                    break;
                case 'Escape':
                    if (this.sessionActive) {
                        this.endSession();
                    }
                    break;
            }
        });
        
        // Window focus/blur
        window.addEventListener('blur', () => {
            if (this.sessionActive) {
                this.pauseSession();
            }
        });
        
        window.addEventListener('focus', () => {
            if (this.sessionActive) {
                this.resumeSession();
            }
        });
    }
    
    loadPreferences() {
        // Load saved preferences from localStorage
        const preferences = JSON.parse(localStorage.getItem('simulator-preferences')) || {};
        
        if (preferences.environment) {
            this.ui.environmentSelect.value = preferences.environment;
        }
        
        if (preferences.vehicle) {
            this.ui.vehicleSelect.value = preferences.vehicle;
        }
        
        if (preferences.inputDevice) {
            this.ui.inputDeviceSelect.value = preferences.inputDevice;
        }
    }
    
    savePreferences() {
        const preferences = {
            environment: this.ui.environmentSelect?.value,
            vehicle: this.ui.vehicleSelect?.value,
            inputDevice: this.ui.inputDeviceSelect?.value
        };
        
        localStorage.setItem('simulator-preferences', JSON.stringify(preferences));
    }
    
    async startSession() {
        try {
            safeShowLoading('กำลังเริ่มเซสชันใหม่...');
            
            // Get session settings
            const environment = this.ui.environmentSelect?.value || 'city';
            const vehicle = this.ui.vehicleSelect?.value || 'sedan';
            const inputDevice = this.ui.inputDeviceSelect?.value || 'keyboard';
            
            // Start session via API
            const response = await api.startSession({
                environment_type: environment,
                vehicle_type: vehicle,
                input_device: inputDevice
            });
            
            if (!response.success) {
                throw new Error(response.message);
            }
            
            // Store session info
            this.currentSession = response.session_id;
            this.sessionActive = true;
            this.sessionStartTime = Date.now();
            
            // Reset stats
            this.resetStats();
            
            // Update UI
            this.ui.startBtn?.classList.add('hidden');
            this.ui.stopBtn?.classList.remove('hidden');
            
            // Set simulation environment
            this.simulation.setEnvironment(environment);
            
            // Save preferences
            this.savePreferences();
            
            // Start session timer
            this.startSessionTimer();
            
            // 🚀 Activate render loop for session
            if (this.startRendering) {
                this.startRendering();
            }
            
            safeHideLoading();
            safeShowNotification('เริ่มเซสชันการขับรถแล้ว!', 'success');
            
            console.log('🚀 Session started:', this.currentSession);
            
        } catch (error) {
            safeHideLoading();
            console.error('Failed to start session:', error);
            safeShowNotification('ไม่สามารถเริ่มเซสชันได้: ' + error.message, 'error');
        }
    }
    
    async endSession() {
        if (!this.sessionActive || !this.currentSession) {
            return;
        }
        
        try {
            safeShowLoading('กำลังสิ้นสุดเซสชัน...');
            
            // Stop session timer
            this.stopSessionTimer();
            
            // End session via API
            const response = await api.endSession(this.currentSession, 'completed');
            
            if (response.success) {
                console.log('✅ Session ended successfully');
            }
            
            // Evaluate session
            await this.evaluateSession();
            
            // Update UI
            this.ui.startBtn?.classList.remove('hidden');
            this.ui.stopBtn?.classList.add('hidden');
            
            // Reset flags
            this.sessionActive = false;
            this.currentSession = null;
            
            // 🛑 Deactivate render loop
            if (this.stopRendering) {
                this.stopRendering();
            }
            
            safeHideLoading();
            
            // Show results modal
            this.showSessionResults();
            
        } catch (error) {
            safeHideLoading();
            console.error('Failed to end session:', error);
            safeShowNotification('เกิดข้อผิดพลาดในการสิ้นสุดเซสชัน', 'error');
        }
    }
    
    async evaluateSession() {
        if (!this.currentSession) return;
        
        try {
            const response = await api.evaluateSession(this.currentSession);
            
            if (response.success) {
                this.sessionEvaluation = response;
                console.log('📊 Session evaluation completed:', response);
            }
            
        } catch (error) {
            console.error('Failed to evaluate session:', error);
        }
    }
    
    resetStats() {
        this.stats = {
            maxSpeed: 0,
            distance: 0,
            elapsedTime: 0,
            overspeedCount: 0,
            suddenBrakeCount: 0,
            laneViolationCount: 0,
            collisionCount: 0,
            currentScore: 100
        };
        
        this.sessionData = [];
        this.logBuffer = [];
        
        // Reset speed chart
        this.speedChartData.labels = [];
        this.speedChartData.datasets[0].data = [];
        
        if (this.chart) {
            this.chart.update('none');
        }
        
        // Update UI
        this.updateStatsUI();
    }
    
    startSessionTimer() {
        this.sessionTimer = setInterval(() => {
            if (this.sessionActive && this.sessionStartTime) {
                this.stats.elapsedTime = Date.now() - this.sessionStartTime;
                this.updateTimerUI();
            }
        }, 1000);
    }
    
    stopSessionTimer() {
        if (this.sessionTimer) {
            clearInterval(this.sessionTimer);
            this.sessionTimer = null;
        }
    }
    
    startRenderLoop() {
        let lastTime = 0;
        let isRunning = false;
        
        const animate = (currentTime) => {
            // Only run animation if needed
            if (!isRunning && !this.sessionActive) {
                // Slow down rendering when inactive (10 FPS instead of 60 FPS)
                setTimeout(() => requestAnimationFrame(animate), 100);
                return;
            }
            
            const deltaTime = (currentTime - lastTime) / 1000;
            lastTime = currentTime;
            
            // Update simulation only if active
            if (this.simulation && (this.sessionActive || isRunning)) {
                this.simulation.update(deltaTime);
                this.simulation.render();
            }
            
            // Continue loop
            requestAnimationFrame(animate);
        };
        
        // Control render loop state
        this.startRendering = () => {
            isRunning = true;
            console.log('🎬 Render loop activated');
        };
        
        this.stopRendering = () => {
            isRunning = false;
            console.log('⏸️ Render loop deactivated');
        };
        
        requestAnimationFrame(animate);
    }
    
    handlePositionUpdate(data) {
        // ⚠️ CRITICAL: Only process when session is ACTIVE
        if (!this.sessionActive || !this.currentSession) {
            return; // Ignore all updates when not in session
        }
        
        // Validate data integrity
        if (!data || typeof data.speed !== 'number') {
            return;
        }
        
        // Update current stats
        const speed = Math.max(0, data.speed || 0); // Ensure positive speed
        
        // Update max speed
        if (speed > this.stats.maxSpeed) {
            this.stats.maxSpeed = speed;
        }
        
        // Update distance (simplified calculation)
        if (speed > 0.1) { // Only count when actually moving
            this.stats.distance += speed * 0.001 / 3.6; // Convert to km
        }
        
        // Log data for evaluation (throttled)
        this.logDrivingData({
            speed: speed,
            position: data.position,
            rpm: data.rpm,
            gear: data.gear,
            steering: this.gamepad?.getInputs().steering || 0,
            throttle: this.gamepad?.getInputs().throttle || 0,
            brake: this.gamepad?.getInputs().brake || 0,
            timestamp: Date.now()
        });
        
        // Update UI (throttled for performance)
        if (!this.lastUIUpdate || Date.now() - this.lastUIUpdate > 100) { // Max 10 FPS UI updates
            this.updateSpeedUI(speed);
            this.updateVehicleUI(data);
            this.updateStatsUI();
            this.updateSpeedChart(speed);
            this.lastUIUpdate = Date.now();
        }
        
        // Real-time behavior analysis (only for significant speeds)
        if (speed > 1) { // Only analyze when actually driving
            this.analyzeRealTimeBehavior(data);
        }
    }
    
    handleCollision(data) {
        // 🚫 CRITICAL FIX: Only process during active session
        if (!this.sessionActive || !this.currentSession) {
            console.log('💥 Ignoring collision - no active session');
            return;
        }
        
        // Validate collision data
        if (!data) {
            console.log('💥 Invalid collision data');
            return;
        }
        
        // Check session runtime (avoid false positives at startup)
        const sessionTime = Date.now() - this.sessionStartTime;
        if (sessionTime < 2000) {
            console.log('💥 Ignoring collision - session just started');
            return;
        }
        
        // Process valid collision
        this.stats.collisionCount++;
        this.stats.currentScore = Math.max(0, this.stats.currentScore - 5);
        
        this.showWarning('การชน!', 'fas fa-exclamation-triangle');
        this.updateScoreUI();
        
        // Vibrate gamepad if supported
        if (this.gamepad && this.gamepad.vibrate) {
            this.gamepad.vibrate(500, 1.0);
        }
        
        console.log('💥 Collision confirmed:', {
            sessionTime: sessionTime / 1000 + 's',
            data: data,
            count: this.stats.collisionCount
        });
    }
    
    handleLaneViolation(data) {
        // 🚫 CRITICAL FIX: Only process during active session
        if (!this.sessionActive || !this.currentSession) {
            console.log('🚧 Ignoring lane violation - no active session');
            return;
        }
        
        // Validate this is a real violation (not initialization glitch)
        if (!data || !data.position) {
            console.log('🚧 Invalid lane violation data');
            return;
        }
        
        // Check if we've been driving for at least 3 seconds
        const sessionTime = Date.now() - this.sessionStartTime;
        if (sessionTime < 3000) {
            console.log('🚧 Ignoring lane violation - session just started');
            return;
        }
        
        // Check if vehicle is moving (avoid false positives when stationary)
        const currentSpeed = this.stats.maxSpeed > 0 ? true : false;
        if (!currentSpeed) {
            console.log('🚧 Ignoring lane violation - vehicle not moving');
            return;
        }
        
        // Process valid lane violation
        this.stats.laneViolationCount++;
        this.stats.currentScore = Math.max(0, this.stats.currentScore - 3);
        
        this.showWarning('ออกนอกเลน!', 'fas fa-road');
        this.updateScoreUI();
        
        console.log('🚧 Lane violation confirmed:', {
            sessionTime: sessionTime / 1000 + 's',
            position: data.position,
            count: this.stats.laneViolationCount
        });
    }
    
    analyzeRealTimeBehavior(data) {
        const speed = data.speed || 0;
        const inputs = this.gamepad?.getInputs() || {};
        
        // Check for overspeed
        const speedLimit = this.getSpeedLimit();
        if (speed > speedLimit + 10) {
            this.stats.overspeedCount++;
            this.stats.currentScore = Math.max(0, this.stats.currentScore - 2);
            this.showWarning('ขับเร็วเกิน!', 'fas fa-tachometer-alt');
        }
        
        // Check for sudden braking
        if (inputs.brake > 0.7 && speed > 20) {
            this.stats.suddenBrakeCount++;
            this.stats.currentScore = Math.max(0, this.stats.currentScore - 1);
            this.showWarning('เบรกกะทันหัน!', 'fas fa-hand-paper');
        }
        
        this.updateScoreUI();
    }
    
    getSpeedLimit() {
        const environment = this.ui.environmentSelect?.value || 'city';
        switch (environment) {
            case 'highway': return 120;
            case 'rain': return 40;
            default: return 50;
        }
    }
    
    logDrivingData(data) {
        const currentTime = Date.now();
        
        // Add to buffer
        this.logBuffer.push(data);
        
        // Send batch data every 0.5 seconds
        if (currentTime - this.lastLogTime >= this.logInterval) {
            this.sendLogData();
            this.lastLogTime = currentTime;
        }
    }
    
    async sendLogData() {
        if (!this.sessionActive || !this.currentSession || this.logBuffer.length === 0) {
            return;
        }
        
        try {
            await api.batchLogData(this.currentSession, [...this.logBuffer]);
            this.logBuffer = []; // Clear buffer after successful send
        } catch (error) {
            console.error('Failed to log data:', error);
            // Keep data in buffer for retry
        }
    }
    
    updateSpeedUI(speed) {
        if (this.ui.speedValue) {
            this.ui.speedValue.textContent = Math.round(speed);
        }
        
        if (this.ui.currentSpeed) {
            this.ui.currentSpeed.textContent = `${Math.round(speed)} km/h`;
        }
        
        // Update speedometer needle
        if (this.ui.speedNeedle) {
            const maxSpeed = 140;
            const angle = (speed / maxSpeed) * 180 - 90;
            this.ui.speedNeedle.style.transform = `translateX(-50%) rotate(${angle}deg)`;
        }
    }
    
    updateVehicleUI(data) {
        if (this.ui.gearValue) {
            this.ui.gearValue.textContent = data.gear || 1;
        }
        
        if (this.ui.rpmValue) {
            this.ui.rpmValue.textContent = Math.round(data.rpm || 0);
        }
    }
    
    updateStatsUI() {
        if (this.ui.maxSpeed) {
            this.ui.maxSpeed.textContent = `${Math.round(this.stats.maxSpeed)} km/h`;
        }
        
        if (this.ui.distance) {
            this.ui.distance.textContent = `${this.stats.distance.toFixed(1)} km`;
        }
        
        if (this.ui.overspeedCount) {
            this.ui.overspeedCount.textContent = this.stats.overspeedCount;
        }
        
        if (this.ui.suddenBrakeCount) {
            this.ui.suddenBrakeCount.textContent = this.stats.suddenBrakeCount;
        }
        
        if (this.ui.laneViolationCount) {
            this.ui.laneViolationCount.textContent = this.stats.laneViolationCount;
        }
        
        if (this.ui.collisionCount) {
            this.ui.collisionCount.textContent = this.stats.collisionCount;
        }
    }
    
    updateTimerUI() {
        const elapsed = this.stats.elapsedTime;
        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        
        const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        if (this.ui.sessionTime) {
            this.ui.sessionTime.textContent = timeString;
        }
        
        if (this.ui.elapsedTime) {
            this.ui.elapsedTime.textContent = timeString;
        }
    }
    
    updateScoreUI() {
        if (this.ui.currentScore) {
            this.ui.currentScore.textContent = Math.round(this.stats.currentScore);
        }
        
        if (this.ui.currentGrade) {
            const grade = this.calculateGrade(this.stats.currentScore);
            this.ui.currentGrade.textContent = grade;
            this.ui.currentGrade.className = `grade-${grade.toLowerCase().replace('+', '')}`;
        }
    }
    
    calculateGrade(score) {
        if (score >= 95) return 'A+';
        if (score >= 90) return 'A';
        if (score >= 85) return 'B+';
        if (score >= 80) return 'B';
        if (score >= 75) return 'C+';
        if (score >= 70) return 'C';
        if (score >= 65) return 'D+';
        if (score >= 60) return 'D';
        return 'F';
    }
    
    updateSpeedChart(speed) {
        const now = Date.now();
        
        // Add new data point
        this.speedChartData.labels.push('');
        this.speedChartData.datasets[0].data.push(speed);
        
        // Keep only last 30 seconds of data
        const maxPoints = 60; // 30 seconds at 2 FPS
        if (this.speedChartData.labels.length > maxPoints) {
            this.speedChartData.labels.shift();
            this.speedChartData.datasets[0].data.shift();
        }
        
        // Update chart
        if (this.chart) {
            this.chart.update('none');
        }
    }
    
    showWarning(message, iconClass) {
        if (!this.ui.warningDisplay) return;
        
        this.ui.warningIcon.className = `warning-icon ${iconClass}`;
        this.ui.warningText.textContent = message;
        
        this.ui.warningDisplay.classList.remove('hidden');
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            this.ui.warningDisplay.classList.add('hidden');
        }, 3000);
    }
    
    showSessionResults() {
        const modal = document.getElementById('end-session-modal');
        if (!modal) return;
        
        // Populate summary data
        const summaryElements = {
            time: document.getElementById('summary-time'),
            distance: document.getElementById('summary-distance'),
            avgSpeed: document.getElementById('summary-avg-speed'),
            maxSpeed: document.getElementById('summary-max-speed'),
            finalScore: document.getElementById('final-score'),
            finalGrade: document.getElementById('final-grade'),
            overspeed: document.getElementById('summary-overspeed'),
            suddenBrake: document.getElementById('summary-sudden-brake'),
            laneViolation: document.getElementById('summary-lane-violation'),
            collision: document.getElementById('summary-collision')
        };
        
        // Update summary
        if (summaryElements.time) {
            const minutes = Math.floor(this.stats.elapsedTime / 60000);
            const seconds = Math.floor((this.stats.elapsedTime % 60000) / 1000);
            summaryElements.time.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
        
        if (summaryElements.distance) {
            summaryElements.distance.textContent = `${this.stats.distance.toFixed(1)} km`;
        }
        
        if (summaryElements.avgSpeed) {
            const avgSpeed = this.stats.distance > 0 ? 
                (this.stats.distance / (this.stats.elapsedTime / 3600000)) : 0;
            summaryElements.avgSpeed.textContent = `${avgSpeed.toFixed(1)} km/h`;
        }
        
        if (summaryElements.maxSpeed) {
            summaryElements.maxSpeed.textContent = `${Math.round(this.stats.maxSpeed)} km/h`;
        }
        
        if (summaryElements.finalScore) {
            summaryElements.finalScore.textContent = Math.round(this.stats.currentScore);
        }
        
        if (summaryElements.finalGrade) {
            const grade = this.calculateGrade(this.stats.currentScore);
            summaryElements.finalGrade.textContent = grade;
            summaryElements.finalGrade.className = `final-grade grade-${grade.toLowerCase().replace('+', '')}`;
        }
        
        // Update behavior counts
        if (summaryElements.overspeed) {
            summaryElements.overspeed.textContent = this.stats.overspeedCount;
        }
        if (summaryElements.suddenBrake) {
            summaryElements.suddenBrake.textContent = this.stats.suddenBrakeCount;
        }
        if (summaryElements.laneViolation) {
            summaryElements.laneViolation.textContent = this.stats.laneViolationCount;
        }
        if (summaryElements.collision) {
            summaryElements.collision.textContent = this.stats.collisionCount;
        }
        
        // Show modal
        showModal('end-session-modal');
    }
    
    resetVehicle() {
        if (this.simulation) {
            this.simulation.resetVehicle();
            safeShowNotification('รีเซ็ตตำแหน่งรถแล้ว', 'info');
        }
    }
    
    pauseSession() {
        // Implementation for pausing session
        console.log('Session paused');
    }
    
    resumeSession() {
        // Implementation for resuming session
        console.log('Session resumed');
    }
    
    toggleHelp() {
        // Show/hide help overlay
        console.log('Toggle help');
    }
    
    toggleStats() {
        // Show/hide detailed stats
        console.log('Toggle stats');
    }
    
    // Cleanup
    destroy() {
        // Stop session if active
        if (this.sessionActive) {
            this.endSession();
        }
        
        // Stop timers
        this.stopSessionTimer();
        
        // Destroy components
        if (this.gamepad) {
            this.gamepad.destroy();
        }
        
        if (this.simulation) {
            this.simulation.destroy();
        }
        
        if (this.chart) {
            this.chart.destroy();
        }
    }
}

// Global functions for modal actions
window.startNewSession = function() {
    closeModal('end-session-modal');
    if (window.simulator) {
        setTimeout(() => {
            window.simulator.startSession();
        }, 500);
    }
};

window.viewDetailedReport = function() {
    closeModal('end-session-modal');
    window.location.href = 'dashboard.html';
};

// Initialize simulator when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎮 Initializing Driving Simulator...');
    
    // Create global simulator instance
    window.simulator = new SimulatorController();
    
    // Handle page unload
    window.addEventListener('beforeunload', (e) => {
        if (window.simulator && window.simulator.sessionActive) {
            e.preventDefault();
            e.returnValue = 'คุณมีเซสชันที่กำลังดำเนินอยู่ ต้องการออกจากหน้านี้หรือไม่?';
            return e.returnValue;
        }
    });
    
    // Handle page visibility change
    document.addEventListener('visibilitychange', () => {
        if (window.simulator) {
            if (document.hidden) {
                window.simulator.pauseSession();
            } else {
                window.simulator.resumeSession();
            }
        }
    });
});

// Export for debugging
window.SimulatorController = SimulatorController;