import * as THREE from 'three'
import { afterEach, describe, expect, it } from 'vitest'

import { configureGameRenderer } from './create-renderer.js'

// A WebGLRenderer needs a real GL context, which jsdom has not got. Everything
// configureGameRenderer touches is plain property assignment, so a stand-in with
// the same shape exercises the logic we care about here.
function fakeRenderer(maxAnisotropy: number): THREE.WebGLRenderer {
  return {
    capabilities: { getMaxAnisotropy: () => maxAnisotropy },
    shadowMap: {},
    domElement: { style: {}, tabIndex: 0 },
    setPixelRatio() {},
    setSize() {},
    setClearColor() {},
  } as unknown as THREE.WebGLRenderer
}

const original = THREE.Texture.DEFAULT_ANISOTROPY
afterEach(() => {
  THREE.Texture.DEFAULT_ANISOTROPY = original
})

describe('configureGameRenderer', () => {
  // Textures used to be created with a hardcoded anisotropy of 4 — below what
  // every current GPU offers. Anisotropic filtering is what keeps a surface
  // viewed at a grazing angle from blurring into mush, and in an arena that
  // surface is the sand floor: most of the screen, most of the match.
  it('raises the global texture anisotropy to what the hardware allows', () => {
    THREE.Texture.DEFAULT_ANISOTROPY = 1
    configureGameRenderer(fakeRenderer(16))
    expect(THREE.Texture.DEFAULT_ANISOTROPY).toBe(16)
  })

  it('follows the hardware down rather than asking for more than it has', () => {
    THREE.Texture.DEFAULT_ANISOTROPY = 1
    configureGameRenderer(fakeRenderer(2))
    expect(THREE.Texture.DEFAULT_ANISOTROPY).toBe(2)
  })

  it('still applies the tone mapping the look depends on', () => {
    const r = fakeRenderer(8)
    configureGameRenderer(r)
    expect(r.toneMapping).toBe(THREE.ACESFilmicToneMapping)
    expect(r.shadowMap.enabled).toBe(true)
  })
})
