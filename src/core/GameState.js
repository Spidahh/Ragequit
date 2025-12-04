/**
 * GameState.js
 * Manages the high-level state of the application using a Finite State Machine (FSM).
 * States: LOGIN -> LOBBY -> MATCH -> PAUSED -> GAMEOVER
 */
import { eventBus } from './EventBus.js';

export const STATES = {
    LOGIN: 'LOGIN',
    LOBBY: 'LOBBY',
    MATCH: 'MATCH',
    PAUSED: 'PAUSED',
    GAMEOVER: 'GAMEOVER'
};

export class GameState {
    constructor() {
        this.currentState = STATES.LOGIN;
        this.previousState = null;

        console.log('🧠 GameState System Initialized');
    }

    setState(newState) {
        if (this.currentState === newState) return;

        console.log(`🔄 State Change: ${this.currentState} -> ${newState}`);
        this.previousState = this.currentState;
        this.currentState = newState;

        eventBus.emit('state:changed', {
            from: this.previousState,
            to: this.currentState
        });

        // Specific Entry Logic
        switch (newState) {
            case STATES.MATCH:
                // eventBus.emit('game:start'); // Caused infinite loop/undefined data
                break;
            case STATES.LOBBY:
                eventBus.emit('game:reset');
                break;
            case STATES.PAUSED:
                // Pause logic handled by MenuManager usually, but good to track here
                break;
        }
    }

    is(state) {
        return this.currentState === state;
    }

    isMatchActive() {
        return this.currentState === STATES.MATCH;
    }
}
