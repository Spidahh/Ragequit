// drop-in/src/character.ts
// ──────────────────────────────────────────────────────────────────────
// Drop-in for `makeCharacter()` in packages/client/src/main.ts
//
// Replaces the existing box-stack capsule with a proper layered fighter:
//   • Cuirass + faulds + tassets + bracers + pauldron caps + cape
//   • Element-tinted trim that lights up under Mastery
//   • 3 head cosmetics: helm | hood | circlet (gameplay-neutral)
//   • Better weapons (winged crossguard sword, recurve bow, claw-cradle staff)
//
// Same capsule (2.0 × 0.4r), same shading model (MeshToonMaterial), same
// poly budget (~520 tris) — no perf regression vs the current implementation.
// ──────────────────────────────────────────────────────────────────────

import * as THREE from 'three';

export const CAPSULE_HEIGHT_M = 2.0;
export const CAPSULE_RADIUS_M = 0.4;

/** Element colors per 01_DESIGN/09_visual.md. */
export const ELEMENT_COLORS = {
  none:      0xffe080,   // accent (brass-gold)
  fire:      0xff5733,
  ice:       0x5cd0ff,
  lightning: 0xffeb47,
  dark:      0x9a4dff,
  nature:    0x5cdb53,
} as const;

export type ElementId  = keyof typeof ELEMENT_COLORS;
export type HeadId     = 'helm' | 'hood' | 'circlet';
export type WeaponId   = 'sword' | 'bow' | 'staff';

export interface CharacterOpts {
  head?: HeadId;
  element?: ElementId;
}

interface CharGroupUserData extends Record<string, unknown> {
  armorMat:    THREE.MeshToonMaterial;
  darkMat:     THREE.MeshToonMaterial;
  trimMat:     THREE.MeshToonMaterial;
  element:     ElementId;
  head:        HeadId;
  weaponGroup: THREE.Group;
}

const TOON_RAMP: THREE.DataTexture = (() => {
  const steps = 6;
  const data = new Uint8Array(steps * 3);
  const ramp: number[] = [28, 68, 120, 172, 220, 255];
  for (let i = 0; i < steps; i++) {
    data[i * 3] = ramp[i]!;
    data[i * 3 + 1] = ramp[i]!;
    data[i * 3 + 2] = ramp[i]!;
  }
  // RGBFormat is removed in r152+; use RGBAFormat with 4 channels instead.
  // Three.js r160 still tolerates DataTexture with format RedFormat for ramps.
  const rgba = new Uint8Array(steps * 4);
  for (let i = 0; i < steps; i++) {
    rgba[i * 4]     = ramp[i]!;
    rgba[i * 4 + 1] = ramp[i]!;
    rgba[i * 4 + 2] = ramp[i]!;
    rgba[i * 4 + 3] = 255;
  }
  const t = new THREE.DataTexture(rgba, steps, 1, THREE.RGBAFormat);
  t.minFilter = THREE.NearestFilter;
  t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
})();

/**
 * Build a fighter group.
 * @param teamColor  hex int (0x3a8fde = blue self, 0xe04a4a = red enemy)
 * @param opts       { head, element }
 */
export function makeCharacter(teamColor: number, opts: CharacterOpts = {}): THREE.Group {
  const head    = opts.head    ?? 'helm';
  const element = opts.element ?? 'none';
  const trimColor    = ELEMENT_COLORS[element] ?? ELEMENT_COLORS.none;
  const masteryActive = element !== 'none';

  const g = new THREE.Group();

  const armorMat = new THREE.MeshToonMaterial({
    color: teamColor, gradientMap: TOON_RAMP,
  });
  const armorDarkMat = new THREE.MeshToonMaterial({
    color: new THREE.Color(teamColor).multiplyScalar(0.65).getHex(),
    gradientMap: TOON_RAMP,
  });
  const clothMat   = new THREE.MeshToonMaterial({ color: 0x1c2030, gradientMap: TOON_RAMP });
  const leatherMat = new THREE.MeshToonMaterial({ color: 0x3a2618, gradientMap: TOON_RAMP });
  const steelMat   = new THREE.MeshToonMaterial({ color: 0x6b7186, gradientMap: TOON_RAMP });
  const trimMat    = new THREE.MeshToonMaterial({
    color: trimColor,
    emissive: masteryActive ? trimColor : 0x000000,
    emissiveIntensity: masteryActive ? 0.55 : 0,
    gradientMap: TOON_RAMP,
  });
  const skinMat   = new THREE.MeshToonMaterial({ color: 0xc89868, gradientMap: TOON_RAMP });
  const visorMat  = new THREE.MeshBasicMaterial({
    color: masteryActive ? trimColor : 0x50d8ff,
    transparent: true, opacity: 0.92, side: THREE.DoubleSide,
  });

  const ud = g.userData as CharGroupUserData;
  ud.armorMat = armorMat;
  ud.darkMat  = clothMat;
  ud.trimMat  = trimMat;
  ud.element  = element;
  ud.head     = head;

  const add = (
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    x: number, y: number, z: number,
    rx = 0, ry = 0, rz = 0,
  ): THREE.Mesh => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.castShadow = true;
    g.add(m);
    return m;
  };

  // ─── LEGS ───────────────────────────────────────────────────
  add(new THREE.CylinderGeometry(0.085, 0.075, 0.32, 8), armorDarkMat, -0.13, -0.69, 0.02, 0.05, 0, 0);
  add(new THREE.CylinderGeometry(0.085, 0.075, 0.32, 8), armorDarkMat,  0.13, -0.69, 0.02, 0.05, 0, 0);
  add(new THREE.BoxGeometry(0.08, 0.10, 0.16), trimMat, -0.13, -0.60, 0.05);
  add(new THREE.BoxGeometry(0.08, 0.10, 0.16), trimMat,  0.13, -0.60, 0.05);
  add(new THREE.CylinderGeometry(0.10, 0.09, 0.35, 8), clothMat, -0.13, -0.38, 0);
  add(new THREE.CylinderGeometry(0.10, 0.09, 0.35, 8), clothMat,  0.13, -0.38, 0);
  add(new THREE.BoxGeometry(0.18, 0.10, 0.32), leatherMat, -0.13, -0.88, 0.06);
  add(new THREE.BoxGeometry(0.18, 0.10, 0.32), leatherMat,  0.13, -0.88, 0.06);
  add(new THREE.BoxGeometry(0.18, 0.06, 0.10), steelMat, -0.13, -0.89, 0.18);
  add(new THREE.BoxGeometry(0.18, 0.06, 0.10), steelMat,  0.13, -0.89, 0.18);

  // ─── HIPS / FAULDS ──────────────────────────────────────────
  add(new THREE.BoxGeometry(0.48, 0.10, 0.30), leatherMat, 0, -0.16, 0);
  add(new THREE.BoxGeometry(0.10, 0.10, 0.32), trimMat, 0, -0.16, 0);
  add(new THREE.BoxGeometry(0.13, 0.20, 0.04), armorMat, -0.10, -0.27, 0.16);
  add(new THREE.BoxGeometry(0.13, 0.20, 0.04), armorMat,  0.10, -0.27, 0.16);

  // ─── TORSO ──────────────────────────────────────────────────
  add(new THREE.BoxGeometry(0.50, 0.58, 0.30), armorMat, 0, 0.17, 0);
  add(new THREE.BoxGeometry(0.09, 0.50, 0.32), trimMat, 0, 0.17, 0);
  add(new THREE.BoxGeometry(0.46, 0.14, 0.28), armorDarkMat, 0, -0.06, 0);
  add(new THREE.BoxGeometry(0.06, 0.32, 0.04), armorDarkMat, -0.24, 0.18, 0.16);
  add(new THREE.BoxGeometry(0.06, 0.32, 0.04), armorDarkMat,  0.24, 0.18, 0.16);

  // ─── SHOULDERS / PAULDRONS ──────────────────────────────────
  add(new THREE.BoxGeometry(0.16, 0.10, 0.22), clothMat, -0.34, 0.42, 0);
  add(new THREE.BoxGeometry(0.16, 0.10, 0.22), clothMat,  0.34, 0.42, 0);
  const pauldronGeo = new THREE.BoxGeometry(0.20, 0.16, 0.26);
  add(pauldronGeo, armorMat, -0.36, 0.48, 0);
  add(pauldronGeo, armorMat,  0.36, 0.48, 0);
  add(new THREE.BoxGeometry(0.22, 0.04, 0.28), trimMat, -0.36, 0.56, 0);
  add(new THREE.BoxGeometry(0.22, 0.04, 0.28), trimMat,  0.36, 0.56, 0);

  // ─── ARMS ───────────────────────────────────────────────────
  add(new THREE.CylinderGeometry(0.078, 0.072, 0.30, 8), clothMat, -0.32, 0.22, 0, 0, 0,  0.18);
  add(new THREE.CylinderGeometry(0.078, 0.072, 0.30, 8), clothMat,  0.32, 0.22, 0, 0, 0, -0.18);
  add(new THREE.CylinderGeometry(0.068, 0.062, 0.28, 8), clothMat, -0.34, -0.07, 0.03, 0.22, 0,  0.10);
  add(new THREE.CylinderGeometry(0.068, 0.062, 0.28, 8), clothMat,  0.34, -0.07, 0.03, 0.22, 0, -0.10);
  add(new THREE.CylinderGeometry(0.082, 0.078, 0.20, 8), armorDarkMat, -0.34, -0.05, 0.03, 0.22, 0,  0.10);
  add(new THREE.CylinderGeometry(0.082, 0.078, 0.20, 8), armorDarkMat,  0.34, -0.05, 0.03, 0.22, 0, -0.10);
  add(new THREE.CylinderGeometry(0.084, 0.084, 0.025, 8), trimMat, -0.34, 0.03, 0.04, 0.22, 0,  0.10);
  add(new THREE.CylinderGeometry(0.084, 0.084, 0.025, 8), trimMat,  0.34, 0.03, 0.04, 0.22, 0, -0.10);
  add(new THREE.BoxGeometry(0.13, 0.12, 0.13), leatherMat, -0.36, -0.23, 0.08);
  add(new THREE.BoxGeometry(0.13, 0.12, 0.13), leatherMat,  0.36, -0.23, 0.08);

  // ─── NECK + HEAD ────────────────────────────────────────────
  add(new THREE.CylinderGeometry(0.068, 0.068, 0.12, 8), clothMat, 0, 0.53, 0);

  if (head === 'helm') {
    add(new THREE.SphereGeometry(0.195, 14, 10), armorMat, 0, 0.71, 0);
    add(new THREE.BoxGeometry(0.40, 0.10, 0.04), armorDarkMat, 0, 0.73, -0.18);
    add(new THREE.CircleGeometry(0.062, 10), visorMat, -0.075, 0.73, -0.19);
    add(new THREE.CircleGeometry(0.062, 10), visorMat,  0.075, 0.73, -0.19);
    add(new THREE.BoxGeometry(0.05, 0.10, 0.30), trimMat, 0, 0.86, 0);
    add(new THREE.BoxGeometry(0.36, 0.06, 0.24), armorDarkMat, 0, 0.59, 0);
  } else if (head === 'hood') {
    add(new THREE.SphereGeometry(0.17, 14, 10), skinMat, 0, 0.71, 0);
    add(new THREE.SphereGeometry(0.23, 12, 8), clothMat, 0, 0.74, 0.03);
    add(
      new THREE.BoxGeometry(0.30, 0.22, 0.10),
      new THREE.MeshBasicMaterial({ color: 0x000000 }),
      0, 0.70, -0.16,
    );
    add(new THREE.ConeGeometry(0.10, 0.20, 4), clothMat, 0, 0.95, 0.10, 0.4, 0, 0);
    add(new THREE.TorusGeometry(0.22, 0.018, 4, 16), trimMat, 0, 0.74, -0.05, Math.PI / 2, 0, 0);
  } else {
    // circlet
    add(new THREE.SphereGeometry(0.19, 14, 10),
        new THREE.MeshToonMaterial({ color: 0x1a1a1a, gradientMap: TOON_RAMP }), 0, 0.71, 0);
    add(new THREE.SphereGeometry(0.165, 14, 10), skinMat, 0, 0.69, -0.04);
    add(new THREE.CircleGeometry(0.025, 8),
        new THREE.MeshBasicMaterial({ color: 0x0a0a0a }), -0.05, 0.71, -0.16);
    add(new THREE.CircleGeometry(0.025, 8),
        new THREE.MeshBasicMaterial({ color: 0x0a0a0a }),  0.05, 0.71, -0.16);
    add(new THREE.TorusGeometry(0.19, 0.012, 4, 18), steelMat, 0, 0.81, 0, Math.PI / 2, 0, 0);
    add(new THREE.OctahedronGeometry(0.03), trimMat, 0, 0.84, -0.18);
  }

  // ─── CAPE ───────────────────────────────────────────────────
  const capeGeo = new THREE.PlaneGeometry(0.46, 0.85);
  const capeMat = new THREE.MeshToonMaterial({
    color: new THREE.Color(teamColor).multiplyScalar(0.5).getHex(),
    gradientMap: TOON_RAMP,
    side: THREE.DoubleSide,
  });
  const cape = new THREE.Mesh(capeGeo, capeMat);
  cape.position.set(0, 0.05, 0.18);
  cape.rotation.x = -0.04;
  cape.castShadow = true;
  g.add(cape);
  const capeTrim = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.04), trimMat);
  capeTrim.position.set(0, -0.37, 0.19);
  g.add(capeTrim);

  // ─── BLOB SHADOW ────────────────────────────────────────────
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(CAPSULE_RADIUS_M * 1.15, 24),
    new THREE.MeshBasicMaterial({
      color: 0x000000, transparent: true, opacity: 0.45, depthWrite: false,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -CAPSULE_HEIGHT_M / 2 + 0.015;
  g.add(shadow);

  // ─── WEAPON ATTACH POINT ────────────────────────────────────
  const weaponGroup = new THREE.Group();
  weaponGroup.position.set(0.40, -0.22, -0.08);
  weaponGroup.rotation.set(0.25, 0, -0.18);
  ud.weaponGroup = weaponGroup;
  g.add(weaponGroup);

  return g;
}

/**
 * Replace the weapon prop on a character group. Pass `elementHex` to tint
 * the glowing parts (sword fuller, bow tip caps, staff orb + halo) to match
 * the player's active Mastery element. Defaults to brass-gold.
 */
export function applyWeaponProp(
  charGroup: THREE.Group,
  weapon: WeaponId,
  elementHex: number = 0xffe080,
): void {
  const wg = (charGroup.userData as CharGroupUserData).weaponGroup;
  if (!wg) return;

  while (wg.children.length > 0) {
    const child = wg.children[0] as THREE.Mesh;
    child.geometry?.dispose();
    const mat = child.material as THREE.Material | THREE.Material[];
    if (Array.isArray(mat)) mat.forEach(m => m.dispose());
    else mat?.dispose();
    wg.remove(child);
  }

  const add = (
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    x = 0, y = 0, z = 0,
    rx = 0, ry = 0, rz = 0,
  ) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.castShadow = true;
    wg.add(m);
  };

  const elMat = new THREE.MeshToonMaterial({
    color: elementHex, emissive: elementHex, emissiveIntensity: 0.5,
    gradientMap: TOON_RAMP,
  });

  if (weapon === 'sword') {
    const blade  = new THREE.MeshToonMaterial({ color: 0xc8daf0, gradientMap: TOON_RAMP });
    const edge   = new THREE.MeshBasicMaterial({ color: 0xe8f4ff, transparent: true, opacity: 0.85 });
    const guard  = new THREE.MeshToonMaterial({ color: 0x9a7c38, gradientMap: TOON_RAMP });
    const handle = new THREE.MeshToonMaterial({ color: 0x4a2c10, gradientMap: TOON_RAMP });

    add(new THREE.SphereGeometry(0.04, 8, 6), guard, 0, -0.10, 0);
    add(new THREE.CylinderGeometry(0.025, 0.025, 0.18, 8), handle, 0, 0.0, 0);
    add(new THREE.BoxGeometry(0.30, 0.040, 0.06), guard, 0, 0.10, 0);
    add(new THREE.BoxGeometry(0.04, 0.06, 0.07), elMat, -0.13, 0.10, 0);
    add(new THREE.BoxGeometry(0.04, 0.06, 0.07), elMat,  0.13, 0.10, 0);
    add(new THREE.BoxGeometry(0.058, 0.78, 0.022), blade, 0, 0.50, 0);
    add(new THREE.BoxGeometry(0.012, 0.74, 0.030), edge,  0, 0.50, 0.022);
    add(new THREE.BoxGeometry(0.016, 0.65, 0.026), elMat, 0, 0.50, 0);
    add(new THREE.ConeGeometry(0.03, 0.08, 4), blade, 0, 0.93, 0);
  } else if (weapon === 'bow') {
    const wood   = new THREE.MeshToonMaterial({ color: 0x4a2e18, gradientMap: TOON_RAMP });
    const string = new THREE.MeshBasicMaterial({ color: 0xd8c8a0 });
    add(new THREE.BoxGeometry(0.025, 0.46, 0.055), wood, 0, 0.32, 0, 0, 0, 0.20);
    add(new THREE.BoxGeometry(0.025, 0.46, 0.055), wood, 0, -0.32, 0, 0, 0, -0.20);
    add(new THREE.BoxGeometry(0.022, 0.10, 0.04), elMat, 0.07, 0.62, 0, 0, 0, 0.20);
    add(new THREE.BoxGeometry(0.022, 0.10, 0.04), elMat, 0.07, -0.62, 0, 0, 0, -0.20);
    add(new THREE.BoxGeometry(0.04, 0.16, 0.08), elMat, 0, 0, 0);
    add(new THREE.BoxGeometry(0.04, 0.06, 0.10), wood, 0, 0.05, 0.04);
    add(new THREE.CylinderGeometry(0.005, 0.005, 1.24, 4), string, 0.06, 0, 0);
  } else if (weapon === 'staff') {
    const wood  = new THREE.MeshToonMaterial({ color: 0x3a2a18, gradientMap: TOON_RAMP });
    const metal = new THREE.MeshToonMaterial({ color: 0x808898, gradientMap: TOON_RAMP });
    add(new THREE.CylinderGeometry(0.025, 0.025, 1.20, 8), wood, 0, 0.0, 0);
    add(new THREE.CylinderGeometry(0.030, 0.030, 0.16, 8), elMat, 0, -0.10, 0);
    add(new THREE.SphereGeometry(0.040, 8, 6), metal, 0, -0.62, 0);
    add(new THREE.BoxGeometry(0.012, 0.18, 0.012), metal,  0.06, 0.58, 0, 0, 0, 0.30);
    add(new THREE.BoxGeometry(0.012, 0.18, 0.012), metal, -0.06, 0.58, 0, 0, 0, -0.30);
    add(new THREE.BoxGeometry(0.012, 0.18, 0.012), metal,  0, 0.58, 0.06, 0.30, 0, 0);
    add(new THREE.BoxGeometry(0.012, 0.18, 0.012), metal,  0, 0.58, -0.06, -0.30, 0, 0);
    add(new THREE.SphereGeometry(0.085, 12, 8), elMat, 0, 0.68, 0);

    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 10, 6),
      new THREE.MeshBasicMaterial({ color: elementHex, transparent: true, opacity: 0.95 }),
    );
    core.position.set(0, 0.68, 0);
    wg.add(core);

    const halo = new THREE.Mesh(
      new THREE.RingGeometry(0.10, 0.13, 18),
      new THREE.MeshBasicMaterial({
        color: elementHex, transparent: true, opacity: 0.5, side: THREE.DoubleSide,
      }),
    );
    halo.position.set(0, 0.68, 0);
    halo.rotation.x = Math.PI / 2;
    wg.add(halo);
  }
}
