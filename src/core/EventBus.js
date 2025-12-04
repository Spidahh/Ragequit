/**
 * EventBus.js
 * A simple Publish-Subscribe system for decoupled communication between game components.
 */
class EventBus {
  constructor() {
    this.listeners = {};
  }

  /**
   * Subscribe to an event.
   * @param {string} event - The event name.
   * @param {Function} callback - The function to call when event is emitted.
   */
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  /**
   * Unsubscribe from an event.
   * @param {string} event - The event name.
   * @param {Function} callback - The callback to remove.
   */
  off(event, callback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }

  /**
   * Emit an event.
   * @param {string} event - The event name.
   * @param {any} data - Data to pass to listeners.
   */
  emit(event, data) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach(callback => callback(data));
  }
}

// Export a singleton instance
export const eventBus = new EventBus();
