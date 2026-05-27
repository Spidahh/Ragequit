import * as THREE from 'three'

export class VfxTextures {
  static fire: THREE.Texture
  static slash: THREE.Texture
  static ice: THREE.Texture
  static lightning: THREE.Texture
  static dark: THREE.Texture
  static nature: THREE.Texture
  static shield: THREE.Texture
  static smoke: THREE.Texture
  static muzzle: THREE.Texture
  static blood: THREE.Texture

  // Aliases for general VFX pools
  static get glow(): THREE.Texture {
    return this.fire
  }
  static get ring(): THREE.Texture {
    return this.dark
  }
  static get spark(): THREE.Texture {
    return this.lightning
  }

  private static loader = new THREE.TextureLoader()
  private static initialized = false

  static init(): void {
    if (this.initialized) return

    this.fire = this.load('vfx_fire.png')
    this.slash = this.load('vfx_slash.png')
    this.ice = this.load('vfx_ice.png')
    this.lightning = this.load('vfx_lightning.png')
    this.dark = this.load('vfx_dark.png')
    this.nature = this.load('vfx_nature.png')
    this.shield = this.load('vfx_shield.png')
    this.smoke = this.load('vfx_smoke.png')
    this.muzzle = this.load('vfx_muzzle.png')
    this.blood = this.load('vfx_blood.png')

    this.initialized = true
  }

  private static load(filename: string): THREE.Texture {
    const tex = this.loader.load(`/vfx/${filename}`)
    tex.wrapS = THREE.ClampToEdgeWrapping
    tex.wrapT = THREE.ClampToEdgeWrapping
    tex.minFilter = THREE.LinearFilter
    tex.magFilter = THREE.LinearFilter
    return tex
  }
}
