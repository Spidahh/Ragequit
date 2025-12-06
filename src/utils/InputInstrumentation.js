// Input lag instrumentation utility
import TuningConfig from '../config/TuningConfig.js';

export class InputInstrumentation {
  constructor() {
    this.enabled = true;
    this.samples = [];
    this.warningThreshold = TuningConfig?.instrumentation?.inputLagBudgetMs ?? 30;
    this.sampleRate = 100; // Log every 100 frames
    this.frameCount = 0;
  }

  measureLatency(startTime, endTime, action = 'unknown') {
    if (!this.enabled) return;
    
    const latencyMs = endTime - startTime;
    this.samples.push({ action, latencyMs, timestamp: Date.now() });
    
    // Warn if over budget
    if (latencyMs > this.warningThreshold) {
      console.warn(`⚠️ Input lag: ${action} took ${latencyMs.toFixed(2)}ms (budget: ${this.warningThreshold}ms)`);
    }
    
    // Periodic summary
    this.frameCount++;
    if (this.frameCount >= this.sampleRate) {
      this.logSummary();
      this.frameCount = 0;
      this.samples = [];
    }
  }

  logSummary() {
    if (this.samples.length === 0) return;
    
    const avg = this.samples.reduce((sum, s) => sum + s.latencyMs, 0) / this.samples.length;
    const max = Math.max(...this.samples.map(s => s.latencyMs));
    const overBudget = this.samples.filter(s => s.latencyMs > this.warningThreshold).length;
    
    console.log(`📊 Input Lag Summary (${this.samples.length} samples):`);
    console.log(`   Avg: ${avg.toFixed(2)}ms | Max: ${max.toFixed(2)}ms | Over Budget: ${overBudget}`);
  }

  disable() {
    this.enabled = false;
  }

  enable() {
    this.enabled = true;
  }
}

export default new InputInstrumentation();
