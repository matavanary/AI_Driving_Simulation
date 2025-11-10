/**
 * Gamepad Controller for Driving Simulator
 * Supports Logitech G29/G923 and generic gamepads
 * Author: Mr.Nattakit Rookkason
 * Version: 1.0
 * Date: 30 October 2025
 */

class GamepadController {
    constructor() {
        this.gamepad = null;
        this.gamepadIndex = -1;
        this.isConnected = false;
        this.isG29 = false;
        this.animationFrame = null;
        
        // Input states
        this.inputs = {
            steering: 0,        // -1 (left) to 1 (right)
            throttle: 0,        // 0 to 1
            brake: 0,           // 0 to 1
            clutch: 0,          // 0 to 1
            handbrake: false,   // boolean
            gear: 1,            // current gear
            buttons: {}         // button states
        };
        
        // G29 specific mappings
        this.g29Mapping = {
            axes: {
                steering: 0,    // Left stick X
                throttle: 1,    // Right trigger
                brake: 2,       // Left trigger
                clutch: 3       // Clutch pedal (if available)
            },
            buttons: {
                cross: 0,       // X button
                square: 1,      // Square button
                circle: 2,      // Circle button
                triangle: 3,    // Triangle button
                L1: 4,          // L1 button
                R1: 5,          // R1 button
                L2: 6,          // L2 button
                R2: 7,          // R2 button
                share: 8,       // Share button
                options: 9,     // Options button
                L3: 10,         // Left stick button
                R3: 11,         // Right stick button
                dpadUp: 12,     // D-pad up
                dpadDown: 13,   // D-pad down
                dpadLeft: 14,   // D-pad left
                dpadRight: 15,  // D-pad right
                ps: 16          // PS button
            }
        };
        
        // Generic gamepad mappings
        this.genericMapping = {
            axes: {
                steering: 0,
                throttle: 7,
                brake: 6
            },
            buttons: {
                a: 0,
                b: 1,
                x: 2,
                y: 3,
                lb: 4,
                rb: 5,
                lt: 6,
                rt: 7,
                back: 8,
                start: 9,
                leftStick: 10,
                rightStick: 11,
                dpadUp: 12,
                dpadDown: 13,
                dpadLeft: 14,
                dpadRight: 15
            }
        };
        
        // Callbacks
        this.onInputChange = null;
        this.onConnect = null;
        this.onDisconnect = null;
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Start polling
        this.startPolling();
    }
    
    setupEventListeners() {
        // Gamepad connection events
        window.addEventListener('gamepadconnected', (e) => {
            console.log('🎮 Gamepad connected:', e.gamepad.id);
            this.handleGamepadConnected(e.gamepad);
        });
        
        window.addEventListener('gamepaddisconnected', (e) => {
            console.log('🎮 Gamepad disconnected:', e.gamepad.id);
            this.handleGamepadDisconnected(e.gamepad);
        });
        
        // Keyboard fallback
        document.addEventListener('keydown', (e) => {
            this.handleKeyDown(e);
        });
        
        document.addEventListener('keyup', (e) => {
            this.handleKeyUp(e);
        });
    }
    
    handleGamepadConnected(gamepad) {
        this.gamepad = gamepad;
        this.gamepadIndex = gamepad.index;
        this.isConnected = true;
        
        // Detect G29
        this.isG29 = this.detectG29(gamepad.id);
        
        if (this.isG29) {
            console.log('🏎️ Logitech G29/G923 detected!');
            this.updateDeviceStatus('g29', true);
        } else {
            console.log('🎮 Generic gamepad detected');
            this.updateDeviceStatus('gamepad', true);
        }
        
        if (this.onConnect) {
            this.onConnect(gamepad);
        }
    }
    
    handleGamepadDisconnected(gamepad) {
        if (gamepad.index === this.gamepadIndex) {
            this.isConnected = false;
            this.gamepad = null;
            this.gamepadIndex = -1;
            
            // Reset inputs
            this.resetInputs();
            
            if (this.isG29) {
                this.updateDeviceStatus('g29', false);
            } else {
                this.updateDeviceStatus('gamepad', false);
            }
            
            if (this.onDisconnect) {
                this.onDisconnect(gamepad);
            }
        }
    }
    
    detectG29(gamepadId) {
        const g29Identifiers = [
            'logitech',
            'g29',
            'g923',
            'driving force',
            '046d'  // Logitech vendor ID
        ];
        
        const id = gamepadId.toLowerCase();
        return g29Identifiers.some(identifier => id.includes(identifier));
    }
    
    updateDeviceStatus(device, connected) {
        const statusElement = document.getElementById(`${device}-status`);
        if (statusElement) {
            statusElement.textContent = connected ? 'เชื่อมต่อแล้ว' : 'ไม่ได้เชื่อมต่อ';
            statusElement.className = connected ? 'status-connected' : 'status-disconnected';
        }
    }
    
    startPolling() {
        const poll = () => {
            this.update();
            this.animationFrame = requestAnimationFrame(poll);
        };
        poll();
    }
    
    stopPolling() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }
    
    update() {
        if (!this.isConnected || this.gamepadIndex === -1) {
            return;
        }
        
        // Get fresh gamepad data
        const gamepads = navigator.getGamepads();
        const gamepad = gamepads[this.gamepadIndex];
        
        if (!gamepad) {
            return;
        }
        
        const prevInputs = { ...this.inputs };
        
        if (this.isG29) {
            this.updateG29Inputs(gamepad);
        } else {
            this.updateGenericGamepadInputs(gamepad);
        }
        
        // Check for input changes
        if (this.hasInputChanged(prevInputs, this.inputs) && this.onInputChange) {
            this.onInputChange(this.inputs);
        }
    }
    
    updateG29Inputs(gamepad) {
        const mapping = this.g29Mapping;
        
        // Steering wheel (axis 0)
        this.inputs.steering = this.deadzone(gamepad.axes[mapping.axes.steering], 0.05);
        
        // Pedals
        // G29 pedals are often inverted and use different axes
        const rawThrottle = gamepad.axes[mapping.axes.throttle];
        const rawBrake = gamepad.axes[mapping.axes.brake];
        
        // Convert from -1,1 range to 0,1 and invert if necessary
        this.inputs.throttle = Math.max(0, (1 - rawThrottle) / 2);
        this.inputs.brake = Math.max(0, (1 - rawBrake) / 2);
        
        // Clutch (if available)
        if (gamepad.axes[mapping.axes.clutch] !== undefined) {
            const rawClutch = gamepad.axes[mapping.axes.clutch];
            this.inputs.clutch = Math.max(0, (1 - rawClutch) / 2);
        }
        
        // Buttons
        this.updateButtonStates(gamepad, mapping.buttons);
        
        // Gear shifting (using paddle shifters or buttons)
        this.updateGearShifting(gamepad, mapping.buttons);
    }
    
    updateGenericGamepadInputs(gamepad) {
        const mapping = this.genericMapping;
        
        // Left stick for steering
        this.inputs.steering = this.deadzone(gamepad.axes[mapping.axes.steering], 0.1);
        
        // Triggers for throttle and brake
        this.inputs.throttle = Math.max(0, gamepad.axes[mapping.axes.throttle]);
        this.inputs.brake = Math.max(0, gamepad.axes[mapping.axes.brake]);
        
        // Buttons
        this.updateButtonStates(gamepad, mapping.buttons);
        
        // Simple gear shifting with shoulder buttons
        if (gamepad.buttons[mapping.buttons.rb]?.pressed && !this.inputs.buttons.rb) {
            this.inputs.gear = Math.min(6, this.inputs.gear + 1);
        }
        if (gamepad.buttons[mapping.buttons.lb]?.pressed && !this.inputs.buttons.lb) {
            this.inputs.gear = Math.max(1, this.inputs.gear - 1);
        }
    }
    
    updateButtonStates(gamepad, buttonMapping) {
        for (const [name, index] of Object.entries(buttonMapping)) {
            const button = gamepad.buttons[index];
            this.inputs.buttons[name] = button ? button.pressed : false;
        }
        
        // Handbrake (space or specific button)
        this.inputs.handbrake = this.inputs.buttons.cross || 
                               this.inputs.buttons.a || 
                               this.keyboardInputs.handbrake;
    }
    
    updateGearShifting(gamepad, buttonMapping) {
        // G29 paddle shifters or sequential buttons
        const shiftUp = this.inputs.buttons.R1 || this.inputs.buttons.dpadUp;
        const shiftDown = this.inputs.buttons.L1 || this.inputs.buttons.dpadDown;
        
        if (shiftUp && !this.previousButtons.shiftUp) {
            this.inputs.gear = Math.min(6, this.inputs.gear + 1);
        }
        if (shiftDown && !this.previousButtons.shiftDown) {
            this.inputs.gear = Math.max(1, this.inputs.gear - 1);
        }
        
        this.previousButtons = {
            shiftUp: shiftUp,
            shiftDown: shiftDown
        };
    }
    
    deadzone(value, threshold = 0.1) {
        if (Math.abs(value) < threshold) {
            return 0;
        }
        
        // Scale the remaining range
        const sign = Math.sign(value);
        const scaledValue = (Math.abs(value) - threshold) / (1 - threshold);
        return sign * scaledValue;
    }
    
    hasInputChanged(prev, current) {
        const threshold = 0.01;
        
        return Math.abs(prev.steering - current.steering) > threshold ||
               Math.abs(prev.throttle - current.throttle) > threshold ||
               Math.abs(prev.brake - current.brake) > threshold ||
               Math.abs(prev.clutch - current.clutch) > threshold ||
               prev.handbrake !== current.handbrake ||
               prev.gear !== current.gear;
    }
    
    // Keyboard fallback inputs
    keyboardInputs = {
        throttle: false,
        brake: false,
        steerLeft: false,
        steerRight: false,
        handbrake: false
    };
    
    handleKeyDown(e) {
        switch (e.code) {
            case 'KeyW':
                this.keyboardInputs.throttle = true;
                break;
            case 'KeyS':
                this.keyboardInputs.brake = true;
                break;
            case 'KeyA':
                this.keyboardInputs.steerLeft = true;
                break;
            case 'KeyD':
                this.keyboardInputs.steerRight = true;
                break;
            case 'Space':
                e.preventDefault();
                this.keyboardInputs.handbrake = true;
                break;
            case 'KeyR':
                // Reset vehicle
                if (this.onInputChange) {
                    this.onInputChange({ ...this.inputs, reset: true });
                }
                break;
        }
        
        this.updateKeyboardInputs();
    }
    
    handleKeyUp(e) {
        switch (e.code) {
            case 'KeyW':
                this.keyboardInputs.throttle = false;
                break;
            case 'KeyS':
                this.keyboardInputs.brake = false;
                break;
            case 'KeyA':
                this.keyboardInputs.steerLeft = false;
                break;
            case 'KeyD':
                this.keyboardInputs.steerRight = false;
                break;
            case 'Space':
                this.keyboardInputs.handbrake = false;
                break;
        }
        
        this.updateKeyboardInputs();
    }
    
    updateKeyboardInputs() {
        if (!this.isConnected) {
            // Use keyboard inputs when no gamepad is connected
            this.inputs.throttle = this.keyboardInputs.throttle ? 1 : 0;
            this.inputs.brake = this.keyboardInputs.brake ? 1 : 0;
            this.inputs.handbrake = this.keyboardInputs.handbrake;
            
            // Steering
            let steering = 0;
            if (this.keyboardInputs.steerLeft) steering -= 1;
            if (this.keyboardInputs.steerRight) steering += 1;
            this.inputs.steering = steering;
            
            // Trigger input change callback
            if (this.onInputChange) {
                this.onInputChange(this.inputs);
            }
        }
    }
    
    resetInputs() {
        this.inputs = {
            steering: 0,
            throttle: 0,
            brake: 0,
            clutch: 0,
            handbrake: false,
            gear: 1,
            buttons: {}
        };
    }
    
    // Force feedback methods (for G29)
    setForceFeedback(strength, direction = 0) {
        // Note: Web Gamepad API doesn't support force feedback yet
        // This is a placeholder for future implementation or native app integration
        console.log(`Force feedback: ${strength} @ ${direction}°`);
    }
    
    vibrate(duration = 100, strength = 1.0) {
        // Gamepad vibration (if supported by browser/device)
        if (this.gamepad && this.gamepad.vibrationActuator) {
            this.gamepad.vibrationActuator.playEffect('dual-rumble', {
                duration: duration,
                strongMagnitude: strength,
                weakMagnitude: strength * 0.5
            });
        }
    }
    
    // Calibration methods
    calibrateDeadzone(axis, value) {
        // Allow runtime deadzone adjustment
        this[`${axis}Deadzone`] = value;
    }
    
    calibrateSensitivity(axis, value) {
        // Allow runtime sensitivity adjustment
        this[`${axis}Sensitivity`] = value;
    }
    
    // Get current inputs (public method)
    getInputs() {
        return { ...this.inputs };
    }
    
    // Check if specific device type is connected
    isG29Connected() {
        return this.isConnected && this.isG29;
    }
    
    isGamepadConnected() {
        return this.isConnected && !this.isG29;
    }
    
    // Cleanup
    destroy() {
        this.stopPolling();
        
        // Remove event listeners
        window.removeEventListener('gamepadconnected', this.handleGamepadConnected);
        window.removeEventListener('gamepaddisconnected', this.handleGamepadDisconnected);
        document.removeEventListener('keydown', this.handleKeyDown);
        document.removeEventListener('keyup', this.handleKeyUp);
    }
}

// Helper function to format gamepad info for debugging
function getGamepadInfo() {
    const gamepads = navigator.getGamepads();
    const info = [];
    
    for (let i = 0; i < gamepads.length; i++) {
        const gamepad = gamepads[i];
        if (gamepad) {
            info.push({
                index: i,
                id: gamepad.id,
                connected: gamepad.connected,
                axes: gamepad.axes.length,
                buttons: gamepad.buttons.length,
                mapping: gamepad.mapping
            });
        }
    }
    
    return info;
}

// Export for global use
window.GamepadController = GamepadController;
window.getGamepadInfo = getGamepadInfo;