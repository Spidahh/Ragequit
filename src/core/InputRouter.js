/**
 * InputRouter.js
 * Responsibilities:
 * - Route raw input events from InputManager to the appropriate system based on GameState.
 * - Prevent "Input Bleed" (e.g., shooting while clicking a menu button).
 */
import { STATES } from './GameState.js';
import { eventBus } from './EventBus.js';

export class InputRouter {
    constructor(gameState) {
        this.state = gameState;
        this.initListeners();
        console.log('🔀 InputRouter Initialized');
    }

    initListeners() {
        // Keyboard
        eventBus.on('input:keydown', (code) => this.routeKey(code, true));
        eventBus.on('input:keyup', (code) => this.routeKey(code, false));

        // Mouse
        eventBus.on('input:mousedown', (button) => this.routeMouse(button, true));
        eventBus.on('input:mouseup', (button) => this.routeMouse(button, false));
        eventBus.on('input:mousemove', (delta) => this.routeMouseMove(delta));
    }

    routeKey(code, isDown) {
        const currentState = this.state.currentState;
        const eventType = isDown ? 'keydown' : 'keyup';

        // console.log(`InputRouter: Key ${code} (${eventType}) in State: ${currentState}`);

        // Global Keys (e.g., Toggle Debug, Mute)
        if (code === 'F1') {
            eventBus.emit('debug:toggle');
            return;
        }

        switch (currentState) {
            case STATES.LOGIN:
            case STATES.LOBBY:
            case STATES.PAUSED:
                // Route to UI Systems
                eventBus.emit(`ui:${eventType}`, code);
                break;

            case STATES.MATCH:
                // Route to Gameplay Systems
                eventBus.emit(`game:${eventType}`, code);

                // ESC is special: It triggers Pause, which is a State Change
                if (code === 'Escape' && isDown) {
                    eventBus.emit('game:pause');
                }
                break;
        }
    }

    routeMouse(button, isDown) {
        const currentState = this.state.currentState;
        const eventType = isDown ? 'mousedown' : 'mouseup';

        // console.log(`InputRouter: Mouse ${button} (${eventType}) in State: ${currentState}`);

        switch (currentState) {
            case STATES.LOGIN:
            case STATES.LOBBY:
            case STATES.PAUSED:
                // UI handles its own clicks via DOM listeners usually, 
                // but we can emit generic UI events if needed.
                // For now, we mostly BLOCK gameplay input here.
                break;

            case STATES.MATCH:
                // Gameplay Input
                eventBus.emit(`game:${eventType}`, button);
                break;
        }
    }

    routeMouseMove(delta) {
        if (this.state.currentState === STATES.MATCH) {
            eventBus.emit('game:mousemove', delta);
        }
    }
}
