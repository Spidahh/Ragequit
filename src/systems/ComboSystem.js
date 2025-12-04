/**
 * ComboSystem.js
 * Tracks consecutive hits and applies damage multiplier
 * Adds depth and reward for sustained offense
 */
import TuningConfig from '../config/TuningConfig.js';

export class ComboSystem {
  constructor(scene, hudManager) {
    this.scene = scene;
    this.hudManager = hudManager;
    
    // Combo tracking
    this.comboCount = 0;
    this.comboWindow = 2.0;  // 2 seconds to chain hits
    this.comboTimer = 0;
    this.comboResetTime = 0.15;  // Time between hits to count as combo
    this.lastHitTime = 0;
    
    // Combo multiplier tiers
    this.tiers = [
      { hits: 1, multiplier: 1.0 },
      { hits: 3, multiplier: 1.1 },
      { hits: 5, multiplier: 1.2 },
      { hits: 10, multiplier: 1.35 },
      { hits: 15, multiplier: 1.5 },
      { hits: 20, multiplier: 1.75 }
    ];
    
    console.log('🔗 ComboSystem Initialized');
  }
  
  registerHit(skillId) {
    /**
     * Register a hit to the combo counter
     * Returns current multiplier
     */
    const currentTime = performance.now() / 1000;
    const timeSinceLastHit = currentTime - this.lastHitTime;
    
    // Reset combo if window expired
    if (timeSinceLastHit > this.comboWindow) {
      this.comboCount = 0;
      this.comboTimer = 0;
    }
    
    // Increment combo
    this.comboCount++;
    this.lastHitTime = currentTime;
    this.comboTimer = this.comboWindow;  // Reset timer
    
    // Display combo
    this.updateComboDisplay();
    
    return this.getMultiplier();
  }
  
  getMultiplier() {
    /**
     * Get current damage multiplier based on combo count
     */
    for (let i = this.tiers.length - 1; i >= 0; i--) {
      if (this.comboCount >= this.tiers[i].hits) {
        return this.tiers[i].multiplier;
      }
    }
    return 1.0;
  }
  
  updateComboDisplay() {
    /**
     * Update UI to show combo counter with animations
     */
    const comboElement = document.getElementById('combo-counter');
    if (!comboElement) {
      // Create combo counter if doesn't exist
      const counter = document.createElement('div');
      counter.id = 'combo-counter';
      counter.style.position = 'fixed';
      counter.style.top = '50%';
      counter.style.left = '50%';
      counter.style.transform = 'translate(-50%, -50%)';
      counter.style.color = '#ffff00';
      counter.style.fontSize = '48px';
      counter.style.fontWeight = 'bold';
      counter.style.textShadow = '0 0 10px rgba(255, 255, 0, 0.8)';
      counter.style.pointerEvents = 'none';
      counter.style.zIndex = '100';
      counter.style.opacity = '0';
      counter.style.transition = 'opacity 0.1s';
      document.body.appendChild(counter);
    }
    
    if (this.comboCount > 1) {
      comboElement.textContent = `${this.comboCount} HIT COMBO! x${this.getMultiplier().toFixed(2)}`;
      comboElement.style.opacity = '1';
      
      // ✅ GDD: Pulse animation on combo hits
      comboElement.style.animation = 'none';
      setTimeout(() => {
        comboElement.style.animation = 'combo-pulse 0.3s ease-out';
      }, 10);
      
      // Color changes based on combo tier
      if (this.comboCount >= 20) {
        comboElement.style.color = '#ff00ff';  // Magenta - insane
        comboElement.style.textShadow = '0 0 20px rgba(255, 0, 255, 1)';
      } else if (this.comboCount >= 15) {
        comboElement.style.color = '#ff0000';  // Red - massive
        comboElement.style.textShadow = '0 0 15px rgba(255, 0, 0, 0.8)';
      } else if (this.comboCount >= 10) {
        comboElement.style.color = '#ff6600';  // Orange - great
        comboElement.style.textShadow = '0 0 12px rgba(255, 102, 0, 0.8)';
      } else {
        comboElement.style.color = '#ffff00';  // Yellow - good
        comboElement.style.textShadow = '0 0 10px rgba(255, 255, 0, 0.8)';
      }
    } else {
      comboElement.style.opacity = '0';
    }
  }
  
  update(dt) {
    /**
     * Decay combo counter
     */
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      
      if (this.comboTimer <= 0) {
        // Combo expired
        this.comboCount = 0;
        this.comboTimer = 0;
        
        // Hide combo display
        const comboElement = document.getElementById('combo-counter');
        if (comboElement) {
          comboElement.style.opacity = '0';
        }
      }
    }
  }
  
  reset() {
    /**
     * Hard reset combo
     */
    this.comboCount = 0;
    this.comboTimer = 0;
    this.lastHitTime = 0;
    
    const comboElement = document.getElementById('combo-counter');
    if (comboElement) {
      comboElement.style.opacity = '0';
    }
  }
  
  getComboCount() {
    return this.comboCount;
  }
}
