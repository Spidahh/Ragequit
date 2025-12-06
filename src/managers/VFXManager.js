/**
 * VFXManager.js
 * Combat 2.0: High-Fidelity Visual Effects.
 */
import * as THREE from 'three';
import { CONSTANTS } from '../core/Utils.js';
import TuningConfig from '../config/TuningConfig.js';

export class VFXManager {
  constructor(scene) {
    this.scene = scene;
    this.effects = [];
    
    // ✅ DAMAGE NUMBER POOL - Reusable meshes to prevent canvas allocation spam
    this.damageNumberPool = [];
    this.activeDamageNumbers = [];
    this.damageNumberPoolSize = 30;  // Pre-allocate 30 damage numbers
    this.initDamageNumberPool();
    
    // ✅ GDD HIT MARKER - Screen-space visual feedback (<100ms)
    this.hitMarkerElement = null;
    this.hitMarkerTimer = 0;
    this.initHitMarker();
    
    console.log('✨ VFXManager 2.0 Initialized');
  }

  initHitMarker() {
    /**
     * Create screen-space hit marker element
     * Displays briefly when player hits target
     * GDD requirement: <100ms feedback for hit confirmation
     */
    if (document.getElementById('hit-marker')) return; // Already exists
    
    const hitMarker = document.createElement('div');
    hitMarker.id = 'hit-marker';
    hitMarker.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      width: 40px;
      height: 40px;
      border: 2px solid #ff0000;
      border-radius: 50%;
      transform: translate(-50%, -50%);
      pointer-events: none;
      opacity: 0;
      font-weight: bold;
      color: #ff0000;
      display: none;
      font-size: 16px;
      text-align: center;
      line-height: 40px;
      z-index: 9999;
      text-shadow: 0 0 4px rgba(255, 0, 0, 0.8);
    `;
    document.body.appendChild(hitMarker);
    this.hitMarkerElement = hitMarker;
  }

  showHitMarker(isCritical = false) {
    /**
     * Flash hit marker on screen
     * GDD: <100ms visual feedback for confirmed hit
     * Critical hits show yellow marker instead of red
     */
    if (!this.hitMarkerElement) this.initHitMarker();
    
    const marker = this.hitMarkerElement;
    marker.style.display = 'block';
    marker.style.opacity = '1';
    
    // Critical hit marker (yellow star burst effect)
    if (isCritical) {
      marker.style.borderColor = '#ffff00';
      marker.style.color = '#ffff00';
      marker.style.textShadow = '0 0 8px rgba(255, 255, 0, 1)';
      marker.style.width = '50px';
      marker.style.height = '50px';
      marker.style.lineHeight = '50px';
      marker.textContent = '✱';
      marker.style.fontSize = '20px';
      marker.style.animation = 'none';
      marker.style.borderWidth = '3px';
    } else {
      marker.style.borderColor = '#ff0000';
      marker.style.color = '#ff0000';
      marker.style.textShadow = '0 0 4px rgba(255, 0, 0, 0.8)';
      marker.style.width = '40px';
      marker.style.height = '40px';
      marker.style.lineHeight = '40px';
      marker.textContent = '✓';
      marker.style.fontSize = '16px';
      marker.style.borderWidth = '2px';
    }
    
    // Reset timer - use tuning config
    const duration = isCritical ? 
      (TuningConfig?.hitMarker?.critMs ?? 140) : 
      (TuningConfig?.hitMarker?.normalMs ?? 120);
    this.hitMarkerTimer = duration / 1000; // Convert ms to seconds
  }

  applyVFXOcclusion(vfxMesh, camera, occlusionDistance = null) {
    /**
     * VFX OCCLUSION: Reduce VFX opacity/scale when too close to camera
     * Prevents VFX from completely obscuring player view
     * Uses TuningConfig for centralized parameters
     */
    if (!camera || !vfxMesh) return;
    
    // Read from TuningConfig
    const cfg = TuningConfig?.vfxClamp ?? {};
    const nearDist = occlusionDistance ?? cfg.nearDistance ?? 2.0;
    const nearOpacity = cfg.nearOpacity ?? 0.3;
    const nearScale = cfg.nearScale ?? 0.85;
    
    const distanceToCamera = camera.position.distanceTo(vfxMesh.position);
    
    // Start reducing opacity at nearDist, fade to nearOpacity at half distance
    if (distanceToCamera < nearDist) {
      const minDistance = nearDist * 0.5;
      let opacity = 1.0;
      let scale = 1.0;
      
      if (distanceToCamera < minDistance) {
        // Very close: max occlusion
        opacity = nearOpacity;
        scale = nearScale;
      } else {
        // Transition zone: lerp
        const lerpFactor = (distanceToCamera - minDistance) / (nearDist - minDistance);
        opacity = nearOpacity + (lerpFactor * (1.0 - nearOpacity));
        scale = nearScale + (lerpFactor * (1.0 - nearScale));
      }
      
      // Apply to material if it has opacity
      if (vfxMesh.material && typeof vfxMesh.material.opacity === 'number') {
        vfxMesh.material.opacity = Math.max(nearOpacity, vfxMesh.material.opacity * opacity);
      }
      
      // Apply scale reduction
      if (vfxMesh.scale && scale < 1.0) {
        vfxMesh.scale.multiplyScalar(scale);
      }
    }
  }
  
  initDamageNumberPool() {
    /**
     * Pre-create reusable damage number meshes
     * This prevents new Canvas allocation every hit
     */
    for (let i = 0; i < this.damageNumberPoolSize; i++) {
      // Create canvas texture once
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 128;
      const texture = new THREE.CanvasTexture(canvas);
      
      // Create material + mesh
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide
      });
      
      const geometry = new THREE.PlaneGeometry(1, 0.5);
      const mesh = new THREE.Mesh(geometry, material);
      
      // Store for reuse
      mesh.userData = {
        canvas: canvas,
        texture: texture,
        material: material,
        isActive: false,
        velocity: new THREE.Vector3(),
        lifetime: 1.5,
        elapsed: 0
      };
      
      this.damageNumberPool.push(mesh);
    }
  }
  
  spawnDamageNumber(position, damage, isCritical = false) {
    /**
     * Reuse pooled damage number instead of creating new
     * ✅ Critical hits get larger scale + yellow color + glow
     */
    let dnum = this.damageNumberPool.pop();
    if (!dnum) {
      console.warn('⚠️ Damage number pool exhausted');
      return;
    }
    
    // Reuse mesh - just update texture
    this.updateDamageNumberTexture(dnum, damage, isCritical);
    
    dnum.position.copy(position);
    dnum.userData.isActive = true;
    dnum.userData.elapsed = 0;
    dnum.userData.lifetime = 1.5;
    dnum.userData.isCritical = isCritical;
    dnum.userData.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 2,
      3.0,
      0
    );
    
    // ✅ Critical hits start larger
    if (isCritical) {
      dnum.scale.setScalar(1.5);
    } else {
      dnum.scale.setScalar(1.0);
    }
    
    this.scene.add(dnum);
    this.activeDamageNumbers.push(dnum);
    
    this.effects.push({
      type: 'damageNumber',
      mesh: dnum,
      startOpacity: dnum.material.opacity
    });
  }
  
  updateDamageNumberTexture(dnum, damage, isCritical) {
    /**
     * Update canvas texture in-place (no new allocation)
     * ✅ Critical hits are larger, yellow, and glow
     */
    const canvas = dnum.userData.canvas;
    const ctx = canvas.getContext('2d');
    
    // Clear
    ctx.fillStyle = 'rgba(0, 0, 0, 0)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // ✅ Critical = bigger font + yellow + shadow glow
    if (isCritical) {
      ctx.fillStyle = '#ffff00';  // Yellow
      ctx.font = 'bold 100px Arial';  // Larger for crits
      
      // Add glow effect with shadow
      ctx.shadowColor = 'rgba(255, 255, 0, 0.8)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    } else {
      ctx.fillStyle = '#ff0000';  // Red
      ctx.font = 'bold 80px Arial';
      
      ctx.shadowColor = 'rgba(255, 0, 0, 0.4)';
      ctx.shadowBlur = 5;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }
    
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Draw damage number
    const displayDamage = Math.floor(damage);
    ctx.fillText(displayDamage, canvas.width / 2, canvas.height / 2);
    
    // Reset shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0)';
    
    // Update texture
    dnum.userData.texture.needsUpdate = true;
  }

  spawnImpact(position, color = 0xffffff) {
    // 1. Flash Light
    const light = new THREE.PointLight(color, 3, 5);
    light.position.copy(position);
    this.scene.add(light);

    // 2. Core Sphere (Glow) - SMALLER for muzzle flashes
    const geo = new THREE.SphereGeometry(0.15, 8, 8);  // ✅ Reduced from 0.3
    const mat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.8 });  // ✅ Reduced opacity
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(position);
    this.scene.add(mesh);

    // 3. Particles (Burst) - FEWER & SMALLER
    const particleCount = 6;  // ✅ Reduced from 15
    const particles = new THREE.Group();
    const pGeo = new THREE.BoxGeometry(0.05, 0.05, 0.05);  // ✅ Reduced from 0.1
    const pMat = new THREE.MeshBasicMaterial({ color: color });

    for (let i = 0; i < particleCount; i++) {
      const p = new THREE.Mesh(pGeo, pMat);
      p.position.copy(position);
      // Random spread - SMALLER
      p.position.add(new THREE.Vector3(
        (Math.random() - 0.5) * 0.3,  // ✅ Reduced from 0.5
        (Math.random() - 0.5) * 0.3,  // ✅ Reduced from 0.5
        (Math.random() - 0.5) * 0.3   // ✅ Reduced from 0.5
      ));

      p.userData.velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 4,  // ✅ Reduced from 8
        (Math.random() - 0.5) * 4 + 2, // ✅ Reduced from 4 to 2
        (Math.random() - 0.5) * 4   // ✅ Reduced from 8
      );
      particles.add(p);
    }
    this.scene.add(particles);

    this.effects.push({
      type: 'impact',
      light, mesh, particles,
      life: 0.2,  // ✅ Reduced from 0.4 - disappear faster
      maxLife: 0.2
    });
  }

  spawnAreaEffect(position, color, type = 'ring') {
    // Dynamic Light
    const light = new THREE.PointLight(color, 2, 10);
    light.position.copy(position).add(new THREE.Vector3(0, 1, 0));
    this.scene.add(light);

    let mesh;
    if (type === 'ring' || type === 'area_ring') {
      // Expanding Torus (Whirlwind)
      const geo = new THREE.TorusGeometry(0.5, 0.1, 8, 32); // Thicker
      const mat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.8 });
      mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = Math.PI / 2;
      mesh.position.copy(position).add(new THREE.Vector3(0, 0.5, 0));
    } else if (type === 'spikes' || type === 'area_spikes') {
      // Rising Cones
      mesh = new THREE.Group();
      for (let i = 0; i < 8; i++) { // More spikes
        const cone = new THREE.Mesh(
          new THREE.ConeGeometry(0.3, 1.5, 8),
          new THREE.MeshStandardMaterial({ color: color, roughness: 0.2, emissive: color, emissiveIntensity: 0.5 })
        );
        cone.position.set(
          (Math.random() - 0.5) * 4,
          -1.5, // Start deeper
          (Math.random() - 0.5) * 4
        );
        mesh.add(cone);
      }
      mesh.position.copy(position);
    } else if (type === 'slash') {
      // Arc
      const geo = new THREE.RingGeometry(1.5, 2, 32, 1, 0, Math.PI); // Larger
      const mat = new THREE.MeshBasicMaterial({ color: color, side: THREE.DoubleSide, transparent: true });
      mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.copy(position).add(new THREE.Vector3(0, 1, 0));
    }

    if (mesh) this.scene.add(mesh);

    this.effects.push({
      type: type,
      light, mesh,
      life: 0.8, // Faster
      maxLife: 0.8,
      timer: 0
    });
  }

  spawnBlood(position) {
    const particleCount = 20;
    const particles = new THREE.Group();
    const pGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
    const pMat = new THREE.MeshBasicMaterial({ color: 0x8a0303 }); // Dark Red

    for (let i = 0; i < particleCount; i++) {
      const p = new THREE.Mesh(pGeo, pMat);
      p.position.copy(position);

      // Random spread
      p.position.add(new THREE.Vector3(
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5
      ));

      // Velocity (Explosive but affected by gravity)
      p.userData.velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 5,
        (Math.random() * 5) + 2, // Upward burst
        (Math.random() - 0.5) * 5
      );
      particles.add(p);
    }
    this.scene.add(particles);

    this.effects.push({
      type: 'blood',
      particles,
      life: 1.0,
      maxLife: 1.0
    });
  }

  spawnDash(position, color = 0x00ffff) {
    /**
     * ✅ GDD DASH VFX - Quick cyan burst around player
     * Provides visual feedback for dash mechanic
     */
    // Quick expanding ring
    const geo = new THREE.TorusGeometry(0.5, 0.1, 16, 32);
    const mat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.8,
      wireframe: true  // Wireframe for speed effect
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = Math.PI / 2;
    mesh.position.copy(position);
    this.scene.add(mesh);

    // Quick disappear effect (50ms)
    this.effects.push({
      type: 'dash',
      mesh: mesh,
      light: null,
      particles: null,
      life: 0.05,  // Very quick
      maxLife: 0.05
    });
  }

  spawnExplosion(position, color = 0xffaa00) {
    // 1. Flash
    const light = new THREE.PointLight(color, 5, 10);
    light.position.copy(position);
    this.scene.add(light);

    // 2. Shockwave Ring
    this.spawnAreaEffect(position, color, 'area_ring');

    // 3. Debris/Particles
    const particleCount = 30;
    const particles = new THREE.Group();
    const pGeo = new THREE.BoxGeometry(0.15, 0.15, 0.15);
    const pMat = new THREE.MeshBasicMaterial({ color: color });

    for (let i = 0; i < particleCount; i++) {
      const p = new THREE.Mesh(pGeo, pMat);
      p.position.copy(position);
      p.userData.velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10
      );
      particles.add(p);
    }
    this.scene.add(particles);

    this.effects.push({
      type: 'explosion',
      light, particles,
      life: 0.5,
      maxLife: 0.5
    });

    // Screen Shake
    this.triggerScreenShake(0.5);
  }

  triggerScreenShake(intensity, duration = 0.3) {
    // Check Options
    const options = JSON.parse(localStorage.getItem('phoenix_options') || '{}');
    if (options.screenShake === false) return; // Default is true if undefined

    // Accumulate shake (multiple impacts should add up)
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    this.shakeTimer = Math.max(this.shakeTimer, duration);
  }

  update(dt, camera, player) {
    // ✅ GDD HIT MARKER - Update screen-space feedback timer
    if (this.hitMarkerTimer > 0) {
      this.hitMarkerTimer -= dt;
      
      if (this.hitMarkerElement) {
        // Fade out smoothly
        const fadeProgress = Math.max(0, this.hitMarkerTimer / 0.1);
        this.hitMarkerElement.style.opacity = fadeProgress.toString();
        
        // Hide when timer expires
        if (this.hitMarkerTimer <= 0) {
          this.hitMarkerElement.style.display = 'none';
        }
      }
    }
    
    // ✅ Pool Maintenance - Return expired damage numbers to pool
    for (let i = this.activeDamageNumbers.length - 1; i >= 0; i--) {
      const dnum = this.activeDamageNumbers[i];
      dnum.userData.elapsed += dt;
      
      // Move up and fade
      dnum.position.addScaledVector(dnum.userData.velocity, dt);
      dnum.material.opacity = 1.0 - (dnum.userData.elapsed / dnum.userData.lifetime);
      
      // ✅ Crits pulse: slightly shrink as they fade
      if (dnum.userData.isCritical) {
        const progress = dnum.userData.elapsed / dnum.userData.lifetime;
        const pulseScale = 1.5 * (1.0 - progress * 0.3);  // Shrink from 1.5 to ~1.05
        dnum.scale.setScalar(pulseScale);
      }
      
      if (dnum.userData.elapsed >= dnum.userData.lifetime) {
        // Return to pool
        this.scene.remove(dnum);
        this.activeDamageNumbers.splice(i, 1);
        this.damageNumberPool.push(dnum);
      }
    }
    
    // ✅ Screen Shake - Apply to player.shakeOffset instead of camera directly
    if (this.shakeTimer > 0 && player) {
      this.shakeTimer -= dt;
      const shake = this.shakeIntensity * (this.shakeTimer / 0.3);
      const offset = new THREE.Vector3(
        (Math.random() - 0.5) * shake,
        (Math.random() - 0.5) * shake,
        (Math.random() - 0.5) * shake
      );
      // Add to player's shake offset (which will be applied in Player.update)
      player.shakeOffset.add(offset);
    }

    for (let i = this.effects.length - 1; i >= 0; i--) {
      const fx = this.effects[i];
      fx.life -= dt;
      fx.timer = (fx.timer || 0) + dt;

      if (fx.life <= 0) {
        // Cleanup
        if (fx.light) this.scene.remove(fx.light);
        if (fx.mesh) this.scene.remove(fx.mesh);
        if (fx.particles) this.scene.remove(fx.particles);
        this.effects.splice(i, 1);
        continue;
      }

      // Animation
      const progress = 1 - (fx.life / fx.maxLife);

      if (fx.type === 'impact') {
        fx.light.intensity = 2 * (1 - progress);
        fx.mesh.scale.setScalar(1 + progress * 2);
        fx.mesh.material.opacity = 1 - progress;
        // ✅ GDD VFX OCCLUSION: Reduce visibility when near camera
        this.applyVFXOcclusion(fx.mesh, camera);

        // Particles
        fx.particles.children.forEach(p => {
          p.position.add(p.userData.velocity.clone().multiplyScalar(dt));
          p.userData.velocity.y -= 9.8 * dt; // Gravity
        });
      } else if (fx.type === 'blood') {
        fx.particles.children.forEach(p => {
          p.position.add(p.userData.velocity.clone().multiplyScalar(dt));
          p.userData.velocity.y -= 15.0 * dt; // Heavy Gravity
          p.rotation.x += dt * 5;
          p.rotation.z += dt * 5;
        });
        // ✅ GDD VFX OCCLUSION: Reduce visibility when near camera
        if (fx.particles.children.length > 0) {
          this.applyVFXOcclusion(fx.particles.children[0], camera);
        }
      } else if (fx.type === 'explosion') {
        fx.light.intensity = 5 * (1 - progress);
        fx.particles.children.forEach(p => {
          p.position.add(p.userData.velocity.clone().multiplyScalar(dt));
          p.scale.multiplyScalar(0.95); // Shrink
        });
        // ✅ GDD VFX OCCLUSION: Reduce visibility when near camera
        if (fx.particles.children.length > 0) {
          this.applyVFXOcclusion(fx.particles.children[0], camera);
        }
      } else if (fx.type === 'ring') {
        fx.mesh.scale.setScalar(1 + progress * 20); // Expand huge
        fx.mesh.material.opacity = 1 - progress;
        // ✅ GDD VFX OCCLUSION: Reduce visibility when near camera
        this.applyVFXOcclusion(fx.mesh, camera);
      } else if (fx.type === 'spikes') {
        fx.mesh.children.forEach(cone => {
          if (cone.position.y < 0) cone.position.y += dt * 5; // Rise
        });
        // ✅ GDD VFX OCCLUSION: Reduce visibility when near camera
        this.applyVFXOcclusion(fx.mesh, camera);
      } else if (fx.type === 'slash') {
        fx.mesh.rotation.z -= dt * 10; // Spin
        fx.mesh.material.opacity = 1 - progress;
        // ✅ GDD VFX OCCLUSION: Reduce visibility when near camera
        this.applyVFXOcclusion(fx.mesh, camera);
      } else if (fx.type === 'dash') {
        // ✅ GDD DASH VFX: Quick expanding ring
        fx.mesh.scale.setScalar(1 + progress * 3);  // Expand
        fx.mesh.material.opacity = 1 - progress;     // Fade out
      } else if (fx.type === 'damageNumber') {
        // Move upward and fade out
        const currentTime = performance.now() / 1000;
        const elapsed = currentTime - fx.mesh.userData.startTime;
        const lifePercent = elapsed / fx.mesh.userData.lifetime;

        if (lifePercent >= 1) {
          // Remove dead effect
          this.scene.remove(fx.mesh);
          this.effects.splice(i, 1);
          continue;
        }

        // Move upward
        fx.mesh.position.add(fx.mesh.userData.velocity.clone().multiplyScalar(dt));
        
        // Face camera (billboard effect)
        if (camera) {
          fx.mesh.lookAt(camera.position);
        }

        // Fade out
        fx.mesh.material.opacity = 1 - lifePercent;
      }
    }
  }

  spawnHealEffect(position) {
    /**
     * Green healing VFX - glow + upward particles
     */
    // 1. Heal Light (Green)
    const healLight = new THREE.PointLight(0x00ff00, 2, 8);
    healLight.position.copy(position);
    this.scene.add(healLight);

    // 2. Heal Orb
    const geo = new THREE.SphereGeometry(0.4, 16, 16);
    const mat = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.8 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(position).add(new THREE.Vector3(0, 1, 0)); // Slightly above
    this.scene.add(mesh);

    // 3. Heal Particles (upward spiral)
    const particleCount = 20;
    const particles = new THREE.Group();
    const pGeo = new THREE.SphereGeometry(0.05, 4, 4);
    const pMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });

    for (let i = 0; i < particleCount; i++) {
      const p = new THREE.Mesh(pGeo, pMat);
      p.position.copy(position);
      const angle = (i / particleCount) * Math.PI * 2;
      p.position.add(new THREE.Vector3(
        Math.cos(angle) * 0.3,
        0.5,
        Math.sin(angle) * 0.3
      ));

      p.userData.velocity = new THREE.Vector3(
        Math.cos(angle) * 3,
        Math.random() * 2 + 3,
        Math.sin(angle) * 3
      );
      particles.add(p);
    }
    this.scene.add(particles);

    // Register effect
    this.effects.push({
      type: 'heal',
      mesh: mesh,
      light: healLight,
      particles: particles,
      startTime: Date.now(),
      duration: 1.0
    });
  }

  spawnChannelEffect(position) {
    /**
     * Channel VFX - looping aura around caster
     */
    const geo = new THREE.TorusGeometry(1, 0.1, 16, 100);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 0.6
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(position);
    mesh.position.y = position.y + 0.5;
    mesh.rotation.x = Math.PI / 2; // Horizontal ring
    this.scene.add(mesh);

    this.effects.push({
      type: 'channel',
      mesh: mesh,
      startTime: Date.now(),
      duration: Infinity // Loop until cancelled
    });
  }

  spawnFireballExplosion(position, radius = 8) {
    /**
     * Fireball explosion - larger impact than normal
     */
    // Explosion light
    const light = new THREE.PointLight(0xff4500, 4, radius * 2);
    light.position.copy(position);
    this.scene.add(light);

    // Multiple expanding rings
    for (let i = 0; i < 3; i++) {
      const delay = i * 0.1;
      setTimeout(() => {
        this.spawnAreaEffect(position, 0xff4500, 'area_ring');
      }, delay * 1000);
    }

    // Heavy impact particles
    const particleCount = 30;
    const particles = new THREE.Group();
    const pGeo = new THREE.BoxGeometry(0.15, 0.15, 0.15);
    const pMat = new THREE.MeshBasicMaterial({ color: 0xff6600 });

    for (let i = 0; i < particleCount; i++) {
      const p = new THREE.Mesh(pGeo, pMat);
      p.position.copy(position);
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 10 + 5;

      p.userData.velocity = new THREE.Vector3(
        Math.cos(angle) * speed,
        Math.random() * 8 + 2,
        Math.sin(angle) * speed
      );
      particles.add(p);
    }
    this.scene.add(particles);

    this.effects.push({
      type: 'explosion',
      particles: particles,
      light: light,
      startTime: Date.now(),
      duration: 0.8
    });
  }

  stopChannelEffect(mesh) {
    /**
     * Stop a channel effect
     */
    const idx = this.effects.findIndex(fx => fx.mesh === mesh);
    if (idx >= 0) {
      const fx = this.effects[idx];
      this.scene.remove(fx.mesh);
      if (fx.light) this.scene.remove(fx.light);
      this.effects.splice(idx, 1);
    }
  }

  /**
   * Spawn floating damage number
   * @param {THREE.Vector3} position - World position where damage number appears
   * @param {number} damage - Damage amount to display
   * @param {boolean} isCritical - If true, use critical color (yellow) instead of red
   */
  spawnDamageNumber(position, damage, isCritical = false) {
    // Create canvas texture for number
    const canvas = document.createElement('canvas');
    canvas.width = CONSTANTS.CANVAS_WIDTH;
    canvas.height = CONSTANTS.CANVAS_HEIGHT;
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = isCritical ? 'rgba(255, 255, 0, 0.8)' : 'rgba(255, 100, 100, 0.8)';
    ctx.fillRect(10, 10, CONSTANTS.CANVAS_WIDTH - 20, CONSTANTS.CANVAS_HEIGHT - 20);

    // Text
    ctx.fillStyle = isCritical ? '#000000' : '#ffffff';
    ctx.font = CONSTANTS.CANVAS_FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(Math.floor(damage), CONSTANTS.CANVAS_WIDTH / 2, CONSTANTS.CANVAS_HEIGHT / 2);

    // Create texture and material
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide
    });

    // Create sprite-like plane facing camera
    const geometry = new THREE.PlaneGeometry(1, 0.5);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.userData.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 2,
      3.0, // Upward velocity
      0
    );
    mesh.userData.lifetime = CONSTANTS.FLOAT_DAMAGE_LIFETIME;
    mesh.userData.startTime = performance.now() / 1000;

    this.scene.add(mesh);

    // Store for update loop
    this.effects.push({
      type: 'damageNumber',
      mesh: mesh,
      startOpacity: material.opacity
    });
  }

  spawnBloodSplatter(position, intensity = 1) {
    /**
     * Blood splatter VFX - red particles with physics
     * intensity: 1-5, controls number of particles and spread
     */
    const particleCount = Math.max(5, Math.floor(10 * intensity));
    const particles = new THREE.Group();
    const pGeo = new THREE.SphereGeometry(0.05, 4, 4);
    const pMat = new THREE.MeshBasicMaterial({ color: 0xaa0000 }); // Dark red

    for (let i = 0; i < particleCount; i++) {
      const p = new THREE.Mesh(pGeo, pMat);
      p.position.copy(position);
      
      // Add small random spread
      p.position.add(new THREE.Vector3(
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5
      ));

      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 2;
      
      p.userData.velocity = new THREE.Vector3(
        Math.cos(angle) * speed,
        Math.random() * 2 - 1, // Some go down
        Math.sin(angle) * speed
      );
      
      p.userData.spin = new THREE.Vector3(
        Math.random() * 8,
        Math.random() * 8,
        Math.random() * 8
      );
      
      particles.add(p);
    }
    this.scene.add(particles);

    // Register effect
    this.effects.push({
      type: 'blood',
      particles: particles,
      light: null,
      mesh: null,
      life: 1.0,  // 1 second lifetime
      maxLife: 1.0
    });
  }

  spawnKnockbackTilt(intensity = 1) {
    /**
     * Signal knockback tilt to Game.js
     * intensity: 1-5, controls camera tilt magnitude
     * Sets this.currentTilt for Game.js render loop to apply
     * ✅ Now uses smooth easing + wobble for better juice
     */
    this.currentTilt = {
      intensity: Math.min(intensity, 5),
      duration: 0.3,  // Slightly longer for smooth lerp
      elapsed: 0,
      // ✅ Added for smooth animation
      easingCurve: 'easeOutCubic',
      wobblePhase: Math.random() * Math.PI * 2,
      wobbleAmount: 0.3
    };
  }
}