/**
 * API Helper for Driving Simulator
 * Author: Mr.Nattakit Rookkason
 * Version: 1.0
 * Date: 30 October 2025
 */

class ApiHelper {
    constructor() {
        this.baseUrl = '/enomban/AI/WebDrivingSimulator/backend/api';
        this.csrfToken = null;
        this.csrfTokenExpiry = null;
        this.requestQueue = [];
        this.isOnline = navigator.onLine;
        this.rateLimitDelay = 1000; // 1 second delay between requests
        this.lastRequestTime = 0;
        this.maxRetries = 3;
        this.csrfTokenPromise = null; // Track ongoing CSRF token request
        this.isInitialized = false;
        this.csrfTokenRetryDelay = 10000; // 10 seconds delay for CSRF token retry
        
        // Setup offline/online listeners
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.processRequestQueue();
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
        });

        // Load cached token immediately
        this.loadCachedToken();
    }
    
    // Load cached token from localStorage
    loadCachedToken() {
        const cachedToken = localStorage.getItem('csrf_token');
        const cachedExpiry = localStorage.getItem('csrf_token_expiry');
        
        if (cachedToken && cachedExpiry && Date.now() < parseInt(cachedExpiry)) {
            this.csrfToken = cachedToken;
            this.csrfTokenExpiry = parseInt(cachedExpiry);
            console.log('Loaded valid CSRF token from cache');
        }
    }

    // Get CSRF Token with singleton pattern to prevent multiple simultaneous requests
    async getCsrfToken(forceRefresh = false) {
        // Return cached token if valid and not forcing refresh
        if (!forceRefresh && this.csrfToken && this.csrfTokenExpiry && Date.now() < (this.csrfTokenExpiry - 60000)) {
            // Return token if it has at least 1 minute left
            return this.csrfToken;
        }

        // If there's already a request in progress, wait for it
        if (this.csrfTokenPromise && !forceRefresh) {
            console.log('CSRF token request already in progress, waiting...');
            return await this.csrfTokenPromise;
        }

        // Create new promise for this request
        this.csrfTokenPromise = this._fetchCsrfToken();
        
        try {
            const token = await this.csrfTokenPromise;
            return token;
        } finally {
            // Clear the promise when done
            this.csrfTokenPromise = null;
        }
    }

    // Internal method to actually fetch CSRF token
    async _fetchCsrfToken(retryCount = 0) {
        try {
            // Rate limiting - wait if necessary
            await this.enforceRateLimit();

            console.log('Fetching new CSRF token...');
            const response = await fetch(`backend/api/auth.php?action=csrf-token`, {
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });

            if (response.status === 429) {
                if (retryCount < this.maxRetries) {
                    const delay = Math.min(this.csrfTokenRetryDelay * (retryCount + 1), 30000); // Max 30 seconds
                    console.warn(`Rate limited for CSRF token - retry ${retryCount + 1}/${this.maxRetries} after ${delay}ms`);
                    await this.sleep(delay);
                    return await this._fetchCsrfToken(retryCount + 1);
                } else {
                    throw new Error('Rate limited - max retries exceeded');
                }
            }

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            if (data.success && data.csrf_token) {
                this.csrfToken = data.csrf_token;
                // Cache token for 45 minutes (longer than server expiry)
                this.csrfTokenExpiry = Date.now() + (45 * 60 * 1000);
                
                // Store in localStorage as backup
                localStorage.setItem('csrf_token', this.csrfToken);
                localStorage.setItem('csrf_token_expiry', this.csrfTokenExpiry.toString());
                
                console.log('CSRF token fetched successfully');
                return this.csrfToken;
            } else {
                throw new Error('Invalid CSRF token response');
            }
        } catch (error) {
            console.error('Failed to get CSRF token:', error);
            
            // Try to use cached token from localStorage as fallback
            const cachedToken = localStorage.getItem('csrf_token');
            const cachedExpiry = localStorage.getItem('csrf_token_expiry');
            
            if (cachedToken && cachedExpiry && Date.now() < parseInt(cachedExpiry)) {
                console.warn('Using cached CSRF token due to fetch error');
                this.csrfToken = cachedToken;
                this.csrfTokenExpiry = parseInt(cachedExpiry);
                return this.csrfToken;
            }
            
            // If all else fails, throw error
            throw error;
        }
    }
    
    // Generic API Request with retry and rate limiting
    async request(endpoint, options = {}, retryCount = 0) {
        // Ensure we have a valid CSRF token for POST requests
        if (options.method === 'POST') {
            const token = await this.getCsrfToken();
            if (!token) {
                throw new Error('Unable to obtain CSRF token');
            }
        }

        const config = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
            ...options
        };
        
        // Add CSRF token for POST requests
        if (config.method === 'POST' && config.body) {
            const body = JSON.parse(config.body);
            body.csrf_token = this.csrfToken;
            config.body = JSON.stringify(body);
        }
        
        // If offline, queue request
        if (!this.isOnline && config.method === 'POST') {
            this.requestQueue.push({ endpoint, config });
            throw new Error('Offline: Request queued');
        }

        // Rate limiting - wait if necessary
        await this.enforceRateLimit();
        
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, config);
            
            // Handle rate limiting
            if (response.status === 429) {
                if (retryCount < this.maxRetries) {
                    const delay = Math.min(1000 * Math.pow(2, retryCount), 10000); // Exponential backoff
                    console.warn(`Rate limited - retrying after ${delay}ms (attempt ${retryCount + 1})`);
                    await this.sleep(delay);
                    return this.request(endpoint, options, retryCount + 1);
                } else {
                    throw new Error('Too many requests - please try again later');
                }
            }

            // Handle CSRF token expiry
            if (response.status === 403 && retryCount < this.maxRetries) {
                console.warn('CSRF token may be expired - refreshing and retrying');
                await this.getCsrfToken(true); // Force refresh
                return this.request(endpoint, options, retryCount + 1);
            }
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            // Handle specific error types
            if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                if (retryCount < this.maxRetries) {
                    console.warn(`Network error - retrying (attempt ${retryCount + 1})`);
                    await this.sleep(1000 * (retryCount + 1));
                    return this.request(endpoint, options, retryCount + 1);
                }
                console.warn('Network error - check server connection:', error.message);
                throw new Error('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจสอบการเชื่อมต่ออินเตอร์เน็ต');
            } else if (error.name === 'SyntaxError') {
                console.warn('Invalid JSON response:', error.message);
                throw new Error('ข้อมูลจากเซิร์ฟเวอร์ไม่ถูกต้อง');
            } else {
                console.error(`API request failed: ${endpoint}`, error);
                throw error;
            }
        }
    }
    
    // Enforce rate limiting between requests
    async enforceRateLimit() {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        
        if (timeSinceLastRequest < this.rateLimitDelay) {
            const waitTime = this.rateLimitDelay - timeSinceLastRequest;
            await this.sleep(waitTime);
        }
        
        this.lastRequestTime = Date.now();
    }

    // Sleep utility function
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Process queued requests when back online
    async processRequestQueue() {
        console.log(`Processing ${this.requestQueue.length} queued requests...`);
        
        while (this.requestQueue.length > 0) {
            const { endpoint, config } = this.requestQueue.shift();
            try {
                // Apply rate limiting to queued requests too
                await this.enforceRateLimit();
                
                const response = await fetch(`${this.baseUrl}${endpoint}`, config);
                if (response.ok) {
                    console.log(`Queued request processed: ${endpoint}`);
                } else if (response.status === 429) {
                    // Re-queue if rate limited
                    this.requestQueue.unshift({ endpoint, config });
                    await this.sleep(2000); // Wait longer before trying again
                    break;
                }
            } catch (error) {
                console.warn('Failed to process queued request:', {
                    endpoint,
                    error: error.message
                });
                // Re-queue if it's a network error
                if (error.message.includes('Failed to fetch')) {
                    this.requestQueue.unshift({ endpoint, config });
                    break; // Stop processing if network is still down
                }
            }
        }
    }
    
    // Authentication API
    async login(username, password) {
        return this.request('/auth.php?action=login', {
            method: 'POST',
            body: JSON.stringify({ 
                username, 
                password 
            })
        });
    }
    
    async register(userData) {
        return this.request('/auth.php?action=register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }
    
    async logout() {
        return this.request('/auth.php?action=logout', {
            method: 'POST'
        });
    }
    
    async checkSession() {
        return this.request('/auth.php?action=check-session');
    }
    
    async updateProfile(profileData) {
        return this.request('/auth.php?action=update-profile', {
            method: 'POST',
            body: JSON.stringify(profileData)
        });
    }
    
    async changePassword(passwordData) {
        return this.request('/auth.php?action=change-password', {
            method: 'POST',
            body: JSON.stringify(passwordData)
        });
    }
    
    // Session API
    async startSession(sessionData) {
        return this.request('/logging.php?action=start-session', {
            method: 'POST',
            body: JSON.stringify(sessionData)
        });
    }
    
    async endSession(sessionId, status = 'completed') {
        return this.request('/logging.php?action=end-session', {
            method: 'POST',
            body: JSON.stringify({ session_id: sessionId, status })
        });
    }
    
    async getActiveSession() {
        return this.request('/logging.php?action=active-session');
    }
    
    async getUserSessions(page = 1, limit = 10) {
        return this.request(`/logging.php?action=user-sessions&page=${page}&limit=${limit}`);
    }
    
    // Logging API
    async logData(sessionId, data) {
        return this.request('/logging.php?action=log-data', {
            method: 'POST',
            body: JSON.stringify({ session_id: sessionId, data })
        });
    }
    
    async batchLogData(sessionId, dataArray) {
        return this.request('/logging.php?action=batch-log', {
            method: 'POST',
            body: JSON.stringify({ session_id: sessionId, data: dataArray })
        });
    }
    
    async getSessionLogs(sessionId, limit = 1000, offset = 0) {
        return this.request(`/logging.php?action=session-logs&session_id=${sessionId}&limit=${limit}&offset=${offset}`);
    }
    
    async getLatestLogs(sessionId, seconds = 30) {
        return this.request(`/logging.php?action=latest-logs&session_id=${sessionId}&seconds=${seconds}`);
    }
    
    async getSessionStats(sessionId) {
        return this.request(`/logging.php?action=session-stats&session_id=${sessionId}`);
    }
    
    // Evaluation API
    async evaluateSession(sessionId) {
        return this.request('/evaluation.php?action=evaluate', {
            method: 'POST',
            body: JSON.stringify({ session_id: sessionId })
        });
    }
    
    async realTimeAnalysis(sessionId, currentData) {
        return this.request('/evaluation.php?action=real-time-analysis', {
            method: 'POST',
            body: JSON.stringify({ session_id: sessionId, current_data: currentData })
        });
    }
    
    async getSessionEvaluation(sessionId) {
        return this.request(`/evaluation.php?action=session-evaluation&session_id=${sessionId}`);
    }
    
    async getUserEvaluations(limit = 10) {
        return this.request(`/evaluation.php?action=user-evaluations&limit=${limit}`);
    }
    
    async getEvaluationStats(days = 30) {
        return this.request(`/evaluation.php?action=evaluation-stats&days=${days}`);
    }
    
    async getBehaviorAnalysis(sessionId) {
        return this.request(`/evaluation.php?action=behavior-analysis&session_id=${sessionId}`);
    }
    
    async getLeaderboard(days = 30, limit = 10) {
        return this.request(`/evaluation.php?action=leaderboard&days=${days}&limit=${limit}`);
    }
    
    // Authentication helper methods
    async checkSession() {
        return this.request('/auth.php?action=check-session');
    }
    
    async login(username, password) {
        return this.request('/auth.php?action=login', {
            method: 'POST',
            body: JSON.stringify({
                username: username,
                password: password
            })
        });
    }
    
    async register(userData) {
        return this.request('/auth.php?action=register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }
    
    async updateProfile(profileData) {
        return this.request('/auth.php?action=update-profile', {
            method: 'POST',
            body: JSON.stringify(profileData)
        });
    }
    
    async changePassword(passwordData) {
        return this.request('/auth.php?action=change-password', {
            method: 'POST',
            body: JSON.stringify(passwordData)
        });
    }
    
    async logout() {
        return this.request('/auth.php?action=logout', {
            method: 'POST'
        });
    }
}

// Singleton pattern - create global API instance only if it doesn't exist
if (!window.api) {
    console.log('Creating new API instance...');
    
    const api = new ApiHelper();
    
    // Store as singleton
    window.api = api;
    
    // Mark as initialized to prevent multiple instances
    window.__apiInitialized = true;
    
    // Add method to clear rate limit cache manually
    api.clearCaches = function() {
        localStorage.removeItem('csrf_token');
        localStorage.removeItem('csrf_token_expiry');
        this.csrfToken = null;
        this.csrfTokenExpiry = null;
        this.csrfTokenPromise = null;
        console.log('API caches cleared');
    };
    
    // Add method to clear server-side rate limits
    api.clearRateLimit = async function() {
        try {
            const response = await fetch('backend/api/rate-limit.php?action=clear-rate-limit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            const result = await response.json();
            console.log('Rate limit cleared:', result);
            return result;
        } catch (error) {
            console.error('Failed to clear rate limit:', error);
            throw error;
        }
    };
    
    // Add method to check current rate limit status
    api.checkRateLimit = async function() {
        try {
            const response = await fetch('backend/api/rate-limit.php?action=check-rate-limit');
            const result = await response.json();
            console.log('Rate limit status:', result);
            return result;
        } catch (error) {
            console.error('Failed to check rate limit:', error);
            throw error;
        }
    };
    
    // Initialize CSRF token with delay to prevent rate limiting
    // Only fetch if we don't have a valid cached token  
    setTimeout(() => {
        if (!api.csrfToken || !api.csrfTokenExpiry || Date.now() >= (api.csrfTokenExpiry - 120000)) {
            console.log('Initializing CSRF token...');
            api.getCsrfToken().catch(error => {
                console.warn('Initial CSRF token fetch failed:', error.message);
            });
        }
    }, 5000); // Wait 5 seconds before first fetch to avoid rate limiting
} else {
    console.log('API instance already exists, reusing existing instance');
}