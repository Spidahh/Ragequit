/**
 * main.js
 * Entry point for RageQuit: Phoenix.
 */
import { Game } from './core/Game.js';

window.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  game.init();

  // Expose game instance for debugging
  window.game = game;
});
