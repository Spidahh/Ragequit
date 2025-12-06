/**
 * InputManager.js
 * Captures raw keyboard and mouse input.
 */
import { eventBus } from '../core/EventBus.js';
import InputInstrumentation from '../utils/InputInstrumentation.js';

export class InputManager {
    constructor() {
        this.keys = {};
        this.mouse = { x: 0, y: 0, left: false, right: false };
        this.isPointerLocked = false;
        this.inputTimestamps = new Map(); // Track input timing for instrumentation

        this.initListeners();
    }

    initListeners() {
        window.addEventListener('keydown', (e) => {
            const timestamp = performance.now();
            this.keys[e.code] = true;
            this.inputTimestamps.set(e.code, timestamp);
            eventBus.emit('input:keydown', e.code);
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
            eventBus.emit('input:keyup', e.code);
        });

        window.addEventListener('mousedown', (e) => {
            const timestamp = performance.now();
            if (e.button === 0) {
                this.mouse.left = true;
                this.inputTimestamps.set('mouse0', timestamp);
            }
            if (e.button === 2) {
                this.mouse.right = true;
                this.inputTimestamps.set('mouse2', timestamp);
            }
            eventBus.emit('input:mousedown', e.button);
        });

        window.addEventListener('mouseup', (e) => {
            if (e.button === 0) this.mouse.left = false;
            if (e.button === 2) this.mouse.right = false;
            eventBus.emit('input:mouseup', e.button);
        });

        window.addEventListener('mousemove', (e) => {
            if (this.isPointerLocked) {
                this.mouse.x += e.movementX;
                this.mouse.y += e.movementY;
                eventBus.emit('input:mousemove', { x: e.movementX, y: e.movementY });
            }
        });

        // Pointer Lock State Tracking (Passive)
        document.addEventListener('pointerlockchange', () => {
            this.isPointerLocked = !!document.pointerLockElement;
            eventBus.emit('input:pointerlock', this.isPointerLocked);
        });
    }

    // Helper for other systems to check state
    isKeyDown(code) {
        return !!this.keys[code];
    }

    // Helper to measure input→action latency
    measureLatency(inputKey, action = 'unknown') {
        const startTime = this.inputTimestamps.get(inputKey);
        if (startTime) {
            const endTime = performance.now();
            InputInstrumentation.measureLatency(startTime, endTime, action);
            this.inputTimestamps.delete(inputKey);
        }
    }
}
