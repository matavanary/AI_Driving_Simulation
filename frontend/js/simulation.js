/**
 * Three.js 3D Simulation Engine
 * Author: Mr.Nattakit Rookkason
 * Version: 1.0
 * Date: 30 October 2025
 */

class SimulationEngine {
    constructor(canvasElement) {
        this.canvas = canvasElement;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.vehicle = null;
        this.world = null;
        
        // Environment settings
        this.environment = 'city';
        this.weather = 'clear';
        this.timeOfDay = 'day';
        
        // Camera modes
        this.cameraMode = 'follow'; // 'cockpit', 'follow', 'top'
        this.cameraTarget = new THREE.Vector3();
        this.cameraOffset = new THREE.Vector3(0, 5, -10);
        
        // Physics simulation
        this.physics = {
            gravity: -9.81,
            friction: 0.7,
            airResistance: 0.02,
            groundLevel: 0
        };
        
        // Vehicle physics
        this.vehicleState = {
            position: new THREE.Vector3(0, 0.5, 0),
            velocity: new THREE.Vector3(0, 0, 0),
            rotation: new THREE.Euler(0, 0, 0),
            angularVelocity: new THREE.Vector3(0, 0, 0),
            speed: 0,
            rpm: 800,
            gear: 1,
            onGround: true
        };
        
        // Input state
        this.inputState = {
            steering: 0,
            throttle: 0,
            brake: 0,
            handbrake: false
        };
        
        // Track/Road system
        this.track = {
            centerLine: [],
            leftBoundary: [],
            rightBoundary: [],
            width: 6,
            segments: []
        };
        
        // Performance monitoring
        this.stats = {
            fps: 0,
            frameTime: 0,
            lastTime: performance.now()
        };
        
        // Event callbacks
        this.onPositionUpdate = null;
        this.onCollision = null;
        this.onLaneViolation = null;
        
        // Initialize
        this.init();
    }
    
    init() {
        console.log('🌍 Initializing Simulation Engine...');
        
        try {
            // Check prerequisites
            if (!this.canvas) {
                throw new Error('Canvas element is required');
            }
            
            if (typeof THREE === 'undefined') {
                throw new Error('Three.js library not loaded');
            }
            
            console.log('✅ Prerequisites check passed');
            
            // Initialize components
            this.setupRenderer();
            this.setupScene();
            this.setupLighting();
            this.setupCamera();
            this.setupVehicle();
            this.setupWorld();
            this.setupEventListeners();
            
            console.log('✅ Simulation engine initialized successfully');
            
            // Update canvas debug info
            this.updateCanvasDebug('Ready');
            
        } catch (error) {
            console.error('❌ Simulation engine initialization failed:', error);
            this.showInitError(error.message);
            throw error;
        }
    }
    
    updateCanvasDebug(status) {
        const debugElement = document.getElementById('canvas-status');
        if (debugElement) {
            debugElement.textContent = `${status} | ${this.canvas.width}x${this.canvas.height} | WebGL: ${this.renderer ? 'OK' : 'Failed'}`;
        }
    }
    
    showInitError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(220, 53, 69, 0.9);
            color: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            font-family: 'Kanit', sans-serif;
            z-index: 1000;
        `;
        errorDiv.innerHTML = `
            <h3><i class="fas fa-exclamation-triangle"></i> เกิดข้อผิดพลาด</h3>
            <p>ไม่สามารถเริ่มต้นระบบจำลอง 3D ได้</p>
            <p><strong>สาเหตุ:</strong> ${message}</p>
        `;
        
        if (this.canvas && this.canvas.parentElement) {
            this.canvas.parentElement.appendChild(errorDiv);
        }
    }
    
    setupRenderer() {
        console.log('🎨 Setting up WebGL renderer...');
        
        try {
            // Get canvas dimensions
            const containerRect = this.canvas.parentElement.getBoundingClientRect();
            const width = containerRect.width || 800;
            const height = containerRect.height || 600;
            
            console.log('Canvas container size:', { width, height });
            
            // Set canvas size explicitly
            this.canvas.width = width;
            this.canvas.height = height;
            this.canvas.style.width = width + 'px';
            this.canvas.style.height = height + 'px';
            
            // Create WebGL renderer
            this.renderer = new THREE.WebGLRenderer({
                canvas: this.canvas,
                antialias: true,
                alpha: false,
                powerPreference: "high-performance"
            });
            
            // Set renderer properties
            this.renderer.setSize(width, height, false);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit pixel ratio for performance
            this.renderer.setClearColor(0x87CEEB, 1); // Sky blue background
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            
            console.log('✅ WebGL renderer created successfully');
            console.log('Renderer info:', {
                width: this.renderer.domElement.width,
                height: this.renderer.domElement.height,
                pixelRatio: this.renderer.getPixelRatio()
            });
            
            this.updateCanvasDebug('Renderer OK');
            
        } catch (error) {
            console.error('❌ Failed to setup renderer:', error);
            this.updateCanvasDebug('Renderer Failed');
            throw error;
        }
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        
        // Enable fog for atmosphere
        this.renderer.fog = new THREE.Fog(0x87CEEB, 50, 200);
    }
    
    setupScene() {
        console.log('🎬 Setting up 3D scene...');
        
        try {
            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(0x87CEEB); // Sky blue
            this.scene.fog = new THREE.Fog(0x87CEEB, 50, 200);
            
            console.log('✅ Scene created successfully');
            this.updateCanvasDebug('Scene OK');
            
            // Add immediate test objects for visual confirmation
            this.addTestObjects();
            
        } catch (error) {
            console.error('❌ Failed to setup scene:', error);
            this.updateCanvasDebug('Scene Failed');
            throw error;
        }
    }
    
    addTestObjects() {
        console.log('🎯 Adding test objects for immediate visibility...');
        
        try {
            // Test cube to verify rendering
            const geometry = new THREE.BoxGeometry(2, 2, 2);
            const material = new THREE.MeshLambertMaterial({ color: 0xff6b6b });
            this.testCube = new THREE.Mesh(geometry, material);
            this.testCube.position.set(0, 1, 0);
            this.testCube.castShadow = true;
            this.scene.add(this.testCube);
            
            // Ground plane
            const groundGeometry = new THREE.PlaneGeometry(100, 100);
            const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x4a4a4a });
            this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
            this.ground.rotation.x = -Math.PI / 2;
            this.ground.receiveShadow = true;
            this.scene.add(this.ground);
            
            // Reference grid
            const gridHelper = new THREE.GridHelper(50, 50, 0xffffff, 0x666666);
            this.scene.add(gridHelper);
            
            console.log('✅ Test objects added successfully');
            
        } catch (error) {
            console.error('❌ Failed to add test objects:', error);
        }
    }
    
    setupLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
        this.scene.add(ambientLight);
        
        // Directional light (sun)
        this.sunLight = new THREE.DirectionalLight(0xffffff, 1.0);
        this.sunLight.position.set(50, 50, 50);
        this.sunLight.castShadow = true;
        this.sunLight.shadow.mapSize.width = 2048;
        this.sunLight.shadow.mapSize.height = 2048;
        this.sunLight.shadow.camera.near = 0.5;
        this.sunLight.shadow.camera.far = 200;
        this.sunLight.shadow.camera.left = -50;
        this.sunLight.shadow.camera.right = 50;
        this.sunLight.shadow.camera.top = 50;
        this.sunLight.shadow.camera.bottom = -50;
        this.scene.add(this.sunLight);
        
        // Hemisphere light for realistic sky lighting
        const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x362d1d, 0.3);
        this.scene.add(hemisphereLight);
    }
    
    setupCamera() {
        console.log('📷 Setting up camera...');
        
        try {
            const aspect = this.canvas.clientWidth / this.canvas.clientHeight || 1.33;
            
            this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
            
            // Set default camera position for immediate view
            this.camera.position.set(0, 10, 15);
            this.camera.lookAt(0, 0, 0);
            
            console.log('✅ Camera setup complete');
            console.log('Camera position:', this.camera.position);
            console.log('Camera aspect:', aspect);
            
            this.updateCanvasDebug('Camera OK');
            
            // Force initial render after camera setup
            setTimeout(() => {
                this.forceRender();
            }, 100);
            
        } catch (error) {
            console.error('❌ Failed to setup camera:', error);
            this.updateCanvasDebug('Camera Failed');
            throw error;
        }
    }
    
    setupVehicle() {
        // Create simple car model
        const vehicleGroup = new THREE.Group();
        
        // Car body
        const bodyGeometry = new THREE.BoxGeometry(2, 0.8, 4);
        const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x0066cc });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.4;
        body.castShadow = true;
        body.receiveShadow = true;
        vehicleGroup.add(body);
        
        // Car roof
        const roofGeometry = new THREE.BoxGeometry(1.6, 0.6, 2.5);
        const roofMaterial = new THREE.MeshLambertMaterial({ color: 0x004499 });
        const roof = new THREE.Mesh(roofGeometry, roofMaterial);
        roof.position.y = 1.0;
        roof.position.z = -0.3;
        roof.castShadow = true;
        vehicleGroup.add(roof);
        
        // Wheels
        const wheelGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 16);
        const wheelMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
        
        this.wheels = [];
        const wheelPositions = [
            { x: -1.1, z: 1.3 },   // Front left
            { x: 1.1, z: 1.3 },    // Front right
            { x: -1.1, z: -1.3 },  // Rear left
            { x: 1.1, z: -1.3 }    // Rear right
        ];
        
        wheelPositions.forEach((pos, index) => {
            const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
            wheel.position.set(pos.x, 0.4, pos.z);
            wheel.rotation.z = Math.PI / 2;
            wheel.castShadow = true;
            this.wheels.push(wheel);
            vehicleGroup.add(wheel);
        });
        
        // Headlights
        const lightGeometry = new THREE.SphereGeometry(0.2, 8, 8);
        const lightMaterial = new THREE.MeshBasicMaterial({ color: 0xffffaa });
        
        [-0.6, 0.6].forEach(x => {
            const headlight = new THREE.Mesh(lightGeometry, lightMaterial);
            headlight.position.set(x, 0.5, 2.1);
            vehicleGroup.add(headlight);
        });
        
        // Position vehicle
        vehicleGroup.position.copy(this.vehicleState.position);
        
        this.vehicle = vehicleGroup;
        this.scene.add(vehicleGroup);
    }
    
    setupWorld() {
        this.createGround();
        this.createTrack();
        this.createEnvironment();
    }
    
    createGround() {
        // Ground plane
        const groundGeometry = new THREE.PlaneGeometry(500, 500);
        const groundMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x3a5f3a,
            transparent: true,
            opacity: 0.8
        });
        
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);
        
        // Add some texture variation
        const textureLoader = new THREE.TextureLoader();
        
        // Create grass texture programmatically if no external textures
        this.createGrassTexture(groundMaterial);
    }
    
    createGrassTexture(material) {
        // Create a simple grass-like texture
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const context = canvas.getContext('2d');
        
        // Base green
        context.fillStyle = '#4a6741';
        context.fillRect(0, 0, 256, 256);
        
        // Add noise for grass texture
        for (let i = 0; i < 10000; i++) {
            const x = Math.random() * 256;
            const y = Math.random() * 256;
            const brightness = Math.random() * 60 - 30;
            context.fillStyle = `rgb(${74 + brightness}, ${103 + brightness}, ${65 + brightness})`;
            context.fillRect(x, y, 1, 1);
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(50, 50);
        
        material.map = texture;
        material.needsUpdate = true;
    }
    
    createTrack() {
        // Create a simple oval track
        const trackRadius = 30;
        const trackWidth = this.track.width;
        const segments = 64;
        
        // Generate track center line
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const x = Math.cos(angle) * trackRadius;
            const z = Math.sin(angle) * trackRadius;
            
            this.track.centerLine.push(new THREE.Vector3(x, 0, z));
            this.track.leftBoundary.push(new THREE.Vector3(
                x + Math.cos(angle + Math.PI/2) * trackWidth/2,
                0,
                z + Math.sin(angle + Math.PI/2) * trackWidth/2
            ));
            this.track.rightBoundary.push(new THREE.Vector3(
                x + Math.cos(angle - Math.PI/2) * trackWidth/2,
                0,
                z + Math.sin(angle - Math.PI/2) * trackWidth/2
            ));
        }
        
        // Create road surface
        this.createRoadSurface();
        
        // Create road markings
        this.createRoadMarkings();
        
        // Create barriers
        this.createBarriers();
    }
    
    createRoadSurface() {
        const points = [];
        
        // Create road geometry using the track boundaries
        for (let i = 0; i < this.track.leftBoundary.length - 1; i++) {
            const left1 = this.track.leftBoundary[i];
            const right1 = this.track.rightBoundary[i];
            const left2 = this.track.leftBoundary[i + 1];
            const right2 = this.track.rightBoundary[i + 1];
            
            // Create two triangles for each road segment
            points.push(
                left1.x, left1.y + 0.01, left1.z,
                right1.x, right1.y + 0.01, right1.z,
                left2.x, left2.y + 0.01, left2.z,
                
                right1.x, right1.y + 0.01, right1.z,
                right2.x, right2.y + 0.01, right2.z,
                left2.x, left2.y + 0.01, left2.z
            );
        }
        
        const roadGeometry = new THREE.BufferGeometry();
        roadGeometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
        roadGeometry.computeVertexNormals();
        
        const roadMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x444444,
            transparent: true,
            opacity: 0.9
        });
        
        const road = new THREE.Mesh(roadGeometry, roadMaterial);
        road.receiveShadow = true;
        this.scene.add(road);
    }
    
    createRoadMarkings() {
        // Center line
        const centerLineGeometry = new THREE.BufferGeometry();
        const centerLinePoints = [];
        
        for (let i = 0; i < this.track.centerLine.length - 1; i++) {
            const p1 = this.track.centerLine[i];
            const p2 = this.track.centerLine[i + 1];
            
            // Create dashed line effect
            if (i % 4 < 2) {
                centerLinePoints.push(p1.x, p1.y + 0.02, p1.z);
                centerLinePoints.push(p2.x, p2.y + 0.02, p2.z);
            }
        }
        
        centerLineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(centerLinePoints, 3));
        
        const centerLineMaterial = new THREE.LineBasicMaterial({ 
            color: 0xffffff,
            linewidth: 3
        });
        
        const centerLine = new THREE.LineSegments(centerLineGeometry, centerLineMaterial);
        this.scene.add(centerLine);
    }
    
    createBarriers() {
        // Create simple barriers along the track
        const barrierHeight = 1.5;
        const barrierGeometry = new THREE.BoxGeometry(0.2, barrierHeight, 2);
        const barrierMaterial = new THREE.MeshLambertMaterial({ color: 0xff3333 });
        
        // Left barriers
        for (let i = 0; i < this.track.leftBoundary.length; i += 4) {
            const pos = this.track.leftBoundary[i];
            const barrier = new THREE.Mesh(barrierGeometry, barrierMaterial);
            barrier.position.set(pos.x, barrierHeight/2, pos.z);
            barrier.castShadow = true;
            this.scene.add(barrier);
        }
        
        // Right barriers
        for (let i = 0; i < this.track.rightBoundary.length; i += 4) {
            const pos = this.track.rightBoundary[i];
            const barrier = new THREE.Mesh(barrierGeometry, barrierMaterial);
            barrier.position.set(pos.x, barrierHeight/2, pos.z);
            barrier.castShadow = true;
            this.scene.add(barrier);
        }
    }
    
    createEnvironment() {
        // Add some trees and buildings based on environment type
        if (this.environment === 'city') {
            this.createBuildings();
        } else {
            this.createTrees();
        }
        
        // Add sky dome
        this.createSky();
    }
    
    createBuildings() {
        const buildingGeometries = [
            new THREE.BoxGeometry(4, 15, 4),
            new THREE.BoxGeometry(3, 20, 3),
            new THREE.BoxGeometry(5, 12, 5),
            new THREE.BoxGeometry(2.5, 25, 2.5)
        ];
        
        const buildingMaterials = [
            new THREE.MeshLambertMaterial({ color: 0x888888 }),
            new THREE.MeshLambertMaterial({ color: 0x666666 }),
            new THREE.MeshLambertMaterial({ color: 0x999999 }),
            new THREE.MeshLambertMaterial({ color: 0x555555 })
        ];
        
        // Place buildings around the track
        for (let i = 0; i < 20; i++) {
            const angle = (i / 20) * Math.PI * 2;
            const distance = 50 + Math.random() * 30;
            const x = Math.cos(angle) * distance;
            const z = Math.sin(angle) * distance;
            
            const geometryIndex = Math.floor(Math.random() * buildingGeometries.length);
            const building = new THREE.Mesh(
                buildingGeometries[geometryIndex],
                buildingMaterials[geometryIndex]
            );
            
            const height = buildingGeometries[geometryIndex].parameters.height;
            building.position.set(x, height/2, z);
            building.castShadow = true;
            building.receiveShadow = true;
            
            this.scene.add(building);
        }
    }
    
    createTrees() {
        // Simple tree models
        const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.5, 4, 8);
        const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        
        const leavesGeometry = new THREE.SphereGeometry(2.5, 8, 6);
        const leavesMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 });
        
        for (let i = 0; i < 30; i++) {
            const treeGroup = new THREE.Group();
            
            const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
            trunk.position.y = 2;
            trunk.castShadow = true;
            treeGroup.add(trunk);
            
            const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
            leaves.position.y = 5;
            leaves.castShadow = true;
            treeGroup.add(leaves);
            
            // Random position around track
            const angle = (i / 30) * Math.PI * 2;
            const distance = 45 + Math.random() * 25;
            const x = Math.cos(angle) * distance;
            const z = Math.sin(angle) * distance;
            
            treeGroup.position.set(x, 0, z);
            this.scene.add(treeGroup);
        }
    }
    
    createSky() {
        const skyGeometry = new THREE.SphereGeometry(400, 32, 32);
        const skyMaterial = new THREE.MeshBasicMaterial({
            color: 0x87CEEB,
            side: THREE.BackSide,
            transparent: true,
            opacity: 0.8
        });
        
        const sky = new THREE.Mesh(skyGeometry, skyMaterial);
        this.scene.add(sky);
    }
    
    setupEventListeners() {
        // Handle window resize
        window.addEventListener('resize', () => {
            this.handleResize();
        });
        
        // Handle canvas resize
        const resizeObserver = new ResizeObserver(() => {
            this.handleResize();
        });
        resizeObserver.observe(this.canvas);
    }
    
    handleResize() {
        const width = this.canvas.clientWidth;
        const height = this.canvas.clientHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        
        this.renderer.setSize(width, height);
    }
    
    // Public methods for controlling the simulation
    updateInput(input) {
        this.inputState = { ...input };
    }
    
    setCameraMode(mode) {
        this.cameraMode = mode;
        
        switch (mode) {
            case 'cockpit':
                this.cameraOffset.set(0, 1.5, 0.5);
                break;
            case 'follow':
                this.cameraOffset.set(0, 5, -10);
                break;
            case 'top':
                this.cameraOffset.set(0, 20, 0);
                break;
        }
    }
    
    setEnvironment(environment) {
        this.environment = environment;
        
        // Update lighting and atmosphere based on environment
        switch (environment) {
            case 'night':
                this.sunLight.intensity = 0.2;
                this.scene.background = new THREE.Color(0x001122);
                this.scene.fog.color = new THREE.Color(0x001122);
                break;
            case 'rain':
                this.sunLight.intensity = 0.5;
                this.scene.background = new THREE.Color(0x666666);
                this.scene.fog.color = new THREE.Color(0x666666);
                this.scene.fog.near = 20;
                this.scene.fog.far = 100;
                break;
            default:
                this.sunLight.intensity = 1.0;
                this.scene.background = new THREE.Color(0x87CEEB);
                this.scene.fog.color = new THREE.Color(0x87CEEB);
                this.scene.fog.near = 50;
                this.scene.fog.far = 200;
        }
    }
    
    // Main update loop
    update(deltaTime) {
        this.updatePhysics(deltaTime);
        this.updateCamera();
        this.updateWheels();
        this.checkCollisions();
        this.updateStats(deltaTime);
    }
    
    updatePhysics(deltaTime) {
        if (!this.vehicle) return;
        
        const input = this.inputState;
        const state = this.vehicleState;
        
        // Calculate forces
        const engineForce = input.throttle * 200; // Max engine force
        const brakeForce = input.brake * 150;     // Max brake force
        const steeringAngle = input.steering * 0.5; // Max steering angle
        
        // Update vehicle rotation based on steering and speed
        if (Math.abs(state.speed) > 0.1) {
            const turnRadius = 1 / (Math.tan(steeringAngle) || 0.001);
            const angularVelocity = state.speed / turnRadius;
            state.rotation.y += angularVelocity * deltaTime;
        }
        
        // Calculate forward vector
        const forward = new THREE.Vector3(
            Math.sin(state.rotation.y),
            0,
            Math.cos(state.rotation.y)
        );
        
        // Apply forces
        let acceleration = (engineForce - brakeForce) / 1000; // Vehicle mass = 1000kg
        
        // Air resistance
        acceleration -= state.speed * state.speed * this.physics.airResistance;
        
        // Friction when not accelerating
        if (Math.abs(input.throttle) < 0.1 && Math.abs(input.brake) < 0.1) {
            acceleration -= Math.sign(state.speed) * this.physics.friction;
        }
        
        // Update speed and velocity
        state.speed += acceleration * deltaTime;
        state.speed = Math.max(-20, Math.min(60, state.speed)); // Speed limits
        
        // Update position
        const velocity = forward.multiplyScalar(state.speed * deltaTime);
        state.position.add(velocity);
        
        // Keep vehicle on ground
        state.position.y = this.physics.groundLevel + 0.5;
        
        // Update vehicle transform
        this.vehicle.position.copy(state.position);
        this.vehicle.rotation.copy(state.rotation);
        
        // Calculate RPM based on speed and gear
        const gearRatios = [0, 3.5, 2.2, 1.5, 1.0, 0.8, 0.65];
        const finalDrive = 3.9;
        const wheelCircumference = 2 * Math.PI * 0.4; // wheel radius = 0.4
        
        if (state.gear > 0 && state.gear < gearRatios.length) {
            const wheelRPM = (Math.abs(state.speed) * 1000 / 60) / wheelCircumference;
            state.rpm = wheelRPM * gearRatios[state.gear] * finalDrive;
            state.rpm = Math.max(800, Math.min(7000, state.rpm)); // Engine limits
        }
        
        // Call position update callback
        if (this.onPositionUpdate) {
            this.onPositionUpdate({
                position: state.position,
                speed: Math.abs(state.speed),
                rpm: state.rpm,
                gear: state.gear
            });
        }
    }
    
    updateCamera() {
        if (!this.vehicle || !this.camera) return;
        
        const vehiclePosition = this.vehicle.position;
        const vehicleRotation = this.vehicle.rotation;
        
        switch (this.cameraMode) {
            case 'cockpit':
                // Inside the car
                this.camera.position.copy(vehiclePosition);
                this.camera.position.y += this.cameraOffset.y;
                this.camera.position.z += this.cameraOffset.z * Math.cos(vehicleRotation.y);
                this.camera.position.x += this.cameraOffset.z * Math.sin(vehicleRotation.y);
                this.camera.rotation.copy(vehicleRotation);
                break;
                
            case 'follow':
                // Following behind the car
                const followDistance = 10;
                const followHeight = 5;
                
                const targetPosition = new THREE.Vector3();
                targetPosition.copy(vehiclePosition);
                targetPosition.x -= Math.sin(vehicleRotation.y) * followDistance;
                targetPosition.z -= Math.cos(vehicleRotation.y) * followDistance;
                targetPosition.y += followHeight;
                
                // Smooth camera movement
                this.camera.position.lerp(targetPosition, 0.05);
                this.camera.lookAt(vehiclePosition);
                break;
                
            case 'top':
                // Top-down view
                this.camera.position.copy(vehiclePosition);
                this.camera.position.y += 20;
                this.camera.lookAt(vehiclePosition);
                break;
        }
    }
    
    updateWheels() {
        if (!this.wheels) return;
        
        const steeringAngle = this.inputState.steering * 0.5;
        const wheelRotation = this.vehicleState.speed * 0.1;
        
        // Front wheels steering
        this.wheels[0].rotation.y = steeringAngle; // Front left
        this.wheels[1].rotation.y = steeringAngle; // Front right
        
        // All wheels rotation
        this.wheels.forEach(wheel => {
            wheel.rotation.x += wheelRotation;
        });
    }
    
    checkCollisions() {
        // Check track boundaries
        const pos = this.vehicleState.position;
        const trackWidth = this.track.width / 2;
        
        // Simple circular track collision detection
        const distanceFromCenter = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
        const trackRadius = 30; // Should match the track creation radius
        
        // Check if outside track boundaries
        if (distanceFromCenter > trackRadius + trackWidth || 
            distanceFromCenter < trackRadius - trackWidth) {
            
            if (this.onLaneViolation) {
                this.onLaneViolation({
                    position: pos,
                    distanceFromCenter: distanceFromCenter,
                    trackRadius: trackRadius
                });
            }
        }
        
        // Check collision with barriers (simplified)
        if (distanceFromCenter > trackRadius + trackWidth + 2) {
            // Hit outer barrier
            if (this.onCollision) {
                this.onCollision({
                    type: 'barrier',
                    position: pos,
                    force: Math.abs(this.vehicleState.speed)
                });
            }
            
            // Bounce back
            this.vehicleState.speed *= -0.5;
        }
    }
    
    updateStats(deltaTime) {
        const currentTime = performance.now();
        this.stats.frameTime = currentTime - this.stats.lastTime;
        this.stats.fps = 1000 / this.stats.frameTime;
        this.stats.lastTime = currentTime;
    }
    
    // Render the scene
    render() {
        if (!this.renderer || !this.scene || !this.camera) {
            console.warn('⚠️ Render called but components not ready');
            return;
        }
        
        try {
            // Animate test cube for visual confirmation
            if (this.testCube) {
                this.testCube.rotation.x += 0.01;
                this.testCube.rotation.y += 0.01;
            }
            
            // Render the scene
            this.renderer.render(this.scene, this.camera);
            
        } catch (error) {
            console.error('❌ Render error:', error);
            this.updateCanvasDebug('Render Error');
        }
    }
    
    // Force immediate render for testing
    forceRender() {
        console.log('🎬 Force rendering scene...');
        if (this.renderer && this.scene && this.camera) {
            try {
                this.renderer.render(this.scene, this.camera);
                console.log('✅ Force render successful');
                this.updateCanvasDebug('Force Rendered');
            } catch (error) {
                console.error('❌ Force render failed:', error);
                this.updateCanvasDebug('Force Render Failed');
            }
        } else {
            console.error('❌ Cannot force render - missing components');
            this.updateCanvasDebug('Missing Components');
        }
    }
    
    // Get current vehicle state
    getVehicleState() {
        return {
            position: this.vehicleState.position.clone(),
            velocity: this.vehicleState.velocity.clone(),
            speed: Math.abs(this.vehicleState.speed),
            rpm: this.vehicleState.rpm,
            gear: this.vehicleState.gear,
            steering: this.inputState.steering,
            throttle: this.inputState.throttle,
            brake: this.inputState.brake
        };
    }
    
    // Reset vehicle to starting position
    resetVehicle() {
        this.vehicleState.position.set(0, 0.5, 0);
        this.vehicleState.velocity.set(0, 0, 0);
        this.vehicleState.rotation.set(0, 0, 0);
        this.vehicleState.speed = 0;
        this.vehicleState.rpm = 800;
        this.vehicleState.gear = 1;
        
        if (this.vehicle) {
            this.vehicle.position.copy(this.vehicleState.position);
            this.vehicle.rotation.copy(this.vehicleState.rotation);
        }
    }
    
    // Get performance stats
    getStats() {
        return { ...this.stats };
    }
    
    // Cleanup
    destroy() {
        if (this.renderer) {
            this.renderer.dispose();
        }
        
        // Dispose of geometries and materials
        this.scene?.traverse((object) => {
            if (object.geometry) {
                object.geometry.dispose();
            }
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(material => material.dispose());
                } else {
                    object.material.dispose();
                }
            }
        });
    }
}

// Export for global use
window.SimulationEngine = SimulationEngine;