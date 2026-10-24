import * as THREE from 'three';
import { LocationDef, LocationId } from './types';
import {
  createAsphaltTexture,
  createBuildingFacadeTexture,
  createBarricadeTexture,
  createCrateTexture,
  createWetConcreteTexture,
  createRustedSteelTexture,
  createGothicStoneTexture,
  createMudGroundTexture,
  createSubwayTileTexture,
} from './textures';

export interface ObstacleBox {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface AnimatedLight {
  light: THREE.PointLight;
  baseIntensity: number;
  flickerType: 'fire' | 'fluorescent' | 'pulse' | 'subway';
}

export interface GameEnvironment {
  id: LocationId;
  group: THREE.Group;
  obstacles: ObstacleBox[];
  animatedLights: AnimatedLight[];
  update: (time: number) => void;
  dispose: () => void;
}

export const LOCATION_REGISTRY: Record<LocationId, LocationDef> = {
  bunker: {
    id: 'bunker',
    name: 'Research Bunker Alpha',
    subtitle: 'Deep Subterranean Biohazard Containment Facility',
    description: 'Sub-level 4 wet concrete containment vault with flickering fluorescent strips, bio-stasis tanks, and sealed blast doors.',
    badge: 'BIO-FACILITY',
    fogColor: 0x071518,
    fogDensity: 0.018,
    skyColor: 0x051014,
    ambientColor: 0x164e63,
    ambientIntensity: 0.8,
    keyLightColor: 0xa5f3fc,
    keyLightIntensity: 2.2,
    hemiSkyColor: 0x22d3ee,
    hemiGroundColor: 0x082f49,
    themeHue: 'cyan',
    accentHex: '#06b6d4',
  },
  cemetery: {
    id: 'cemetery',
    name: 'Foggy Ruined Cemetery',
    subtitle: 'Desecrated Victorian Necropolis & Mausoleums',
    description: 'Muddy graveyard shrouded in dense midnight fog, gnarled dead trees, gothic wrought iron fences, and flickering tomb lanterns.',
    badge: 'NECROPOLIS',
    fogColor: 0x0f1124,
    fogDensity: 0.024,
    skyColor: 0x0a0c1a,
    ambientColor: 0x312e81,
    ambientIntensity: 0.75,
    keyLightColor: 0xc7d2fe,
    keyLightIntensity: 2.0,
    hemiSkyColor: 0x818cf8,
    hemiGroundColor: 0x1e1b4b,
    themeHue: 'indigo',
    accentHex: '#6366f1',
  },
  subway: {
    id: 'subway',
    name: 'Metro Transit Concourse',
    subtitle: 'Derelict Underground Station & Train Depots',
    description: 'Glossy beveled subway tile concourse, abandoned rusted train carriages, turnstiles, and amber emergency halogen floodlights.',
    badge: 'TRANSIT TERMINAL',
    fogColor: 0x1c1917,
    fogDensity: 0.016,
    skyColor: 0x141210,
    ambientColor: 0x44403c,
    ambientIntensity: 0.9,
    keyLightColor: 0xfef08a,
    keyLightIntensity: 2.3,
    hemiSkyColor: 0xfde047,
    hemiGroundColor: 0x292524,
    themeHue: 'amber',
    accentHex: '#f59e0b',
  },
  city: {
    id: 'city',
    name: 'Ruined City Sector 4',
    subtitle: 'Evacuated Quarantine Zone & Rubble Corridors',
    description: 'Rain-slicked asphalt streets, high-rise silhouettes, burning fuel barrels, and heavy military barricade checkpoints.',
    badge: 'QUARANTINE ZONE',
    fogColor: 0x231828,
    fogDensity: 0.013,
    skyColor: 0x1c1020,
    ambientColor: 0xffffff,
    ambientIntensity: 0.7,
    keyLightColor: 0xffedd5,
    keyLightIntensity: 2.4,
    hemiSkyColor: 0x93c5fd,
    hemiGroundColor: 0x431407,
    themeHue: 'red',
    accentHex: '#ef4444',
  },
};

/**
 * Procedurally builds the chosen high-fidelity environment.
 */
export function buildEnvironment(scene: THREE.Scene, locationId: LocationId): GameEnvironment {
  const group = new THREE.Group();
  scene.add(group);

  const obstacles: ObstacleBox[] = [];
  const animatedLights: AnimatedLight[] = [];

  if (locationId === 'bunker') {
    buildBunker(group, obstacles, animatedLights);
  } else if (locationId === 'cemetery') {
    buildCemetery(group, obstacles, animatedLights);
  } else if (locationId === 'subway') {
    buildSubway(group, obstacles, animatedLights);
  } else {
    buildCity(group, obstacles, animatedLights);
  }

  function update(time: number) {
    for (const item of animatedLights) {
      if (item.flickerType === 'fire') {
        const flicker =
          Math.sin(time * 12) * 0.15 +
          Math.cos(time * 23) * 0.12 +
          (Math.random() - 0.5) * 0.18;
        item.light.intensity = Math.max(0.2, item.baseIntensity * (1 + flicker));
      } else if (item.flickerType === 'fluorescent') {
        // Occasional realistic neon tube buzz drop
        const isBlinking = Math.random() < 0.015;
        const microBuzz = Math.sin(time * 60) * 0.08;
        item.light.intensity = isBlinking ? item.baseIntensity * 0.2 : item.baseIntensity * (1 + microBuzz);
      } else if (item.flickerType === 'pulse') {
        const pulse = Math.sin(time * 3) * 0.35 + 0.65;
        item.light.intensity = item.baseIntensity * pulse;
      } else if (item.flickerType === 'subway') {
        const hum = Math.sin(time * 8) * 0.1 + (Math.random() - 0.5) * 0.08;
        item.light.intensity = Math.max(0.5, item.baseIntensity * (1 + hum));
      }
    }
  }

  function dispose() {
    scene.remove(group);
    group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
      }
    });
  }

  return {
    id: locationId,
    group,
    obstacles,
    animatedLights,
    update,
    dispose,
  };
}

// ============================================================================
// 1. RESEARCH BUNKER ALPHA
// ============================================================================
function buildBunker(
  group: THREE.Group,
  obstacles: ObstacleBox[],
  animatedLights: AnimatedLight[]
) {
  const concreteTex = createWetConcreteTexture();
  concreteTex.repeat.set(16, 16);
  const floorMat = new THREE.MeshStandardMaterial({
    map: concreteTex,
    roughness: 0.35, // Polished wet sheen
    metalness: 0.15,
  });

  // Large Bunker Floor (140x140m)
  const floorGeo = new THREE.PlaneGeometry(140, 140);
  const floorMesh = new THREE.Mesh(floorGeo, floorMat);
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.receiveShadow = true;
  group.add(floorMesh);

  const steelMat = new THREE.MeshStandardMaterial({
    map: createRustedSteelTexture(),
    roughness: 0.5,
    metalness: 0.8,
  });

  const wallMat = new THREE.MeshStandardMaterial({
    map: concreteTex,
    roughness: 0.65,
    metalness: 0.2,
  });

  // Perimeter High Reinforced Concrete Bulkhead Walls (4 walls at 40m distance)
  const wallH = 12;
  const wallPositions = [
    { x: 0, z: -45, w: 90, d: 3 },
    { x: 0, z: 45, w: 90, d: 3 },
    { x: -45, z: 0, w: 3, d: 90 },
    { x: 45, z: 0, w: 3, d: 90 },
  ];

  for (const wp of wallPositions) {
    const wallGeo = new THREE.BoxGeometry(wp.w, wallH, wp.d);
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.set(wp.x, wallH / 2, wp.z);
    wall.castShadow = true;
    wall.receiveShadow = true;
    group.add(wall);

    obstacles.push({
      minX: wp.x - wp.w / 2 - 0.5,
      maxX: wp.x + wp.w / 2 + 0.5,
      minZ: wp.z - wp.d / 2 - 0.5,
      maxZ: wp.z + wp.d / 2 + 0.5,
    });
  }

  // Overhead Heavy Steel Support Bulkhead Arches
  for (let z = -32; z <= 32; z += 16) {
    const archGroup = new THREE.Group();
    archGroup.position.set(0, 0, z);

    // Left pillar
    const pillarL = new THREE.Mesh(new THREE.BoxGeometry(1.8, wallH, 1.8), steelMat);
    pillarL.position.set(-28, wallH / 2, 0);
    pillarL.castShadow = true;
    archGroup.add(pillarL);

    // Right pillar
    const pillarR = new THREE.Mesh(new THREE.BoxGeometry(1.8, wallH, 1.8), steelMat);
    pillarR.position.set(28, wallH / 2, 0);
    pillarR.castShadow = true;
    archGroup.add(pillarR);

    // Overhead beam
    const beam = new THREE.Mesh(new THREE.BoxGeometry(58, 1.4, 1.6), steelMat);
    beam.position.set(0, wallH - 0.7, 0);
    beam.castShadow = true;
    archGroup.add(beam);

    // Fluorescent light strip attached to beam
    const tubeGeo = new THREE.CylinderGeometry(0.08, 0.08, 12, 8);
    const tubeMat = new THREE.MeshBasicMaterial({ color: 0xe0f2fe });
    const tube = new THREE.Mesh(tubeGeo, tubeMat);
    tube.rotation.z = Math.PI / 2;
    tube.position.set(0, wallH - 1.6, 0);
    archGroup.add(tube);

    // Point Light for realistic fluorescent glare
    const tubeLight = new THREE.PointLight(0xa5f3fc, 3.2, 38, 1.2);
    tubeLight.position.set(0, wallH - 2.0, 0);
    archGroup.add(tubeLight);
    animatedLights.push({
      light: tubeLight,
      baseIntensity: 3.2,
      flickerType: 'fluorescent',
    });

    group.add(archGroup);

    obstacles.push(
      { minX: -29.2, maxX: -26.8, minZ: z - 1.2, maxZ: z + 1.2 },
      { minX: 26.8, maxX: 29.2, minZ: z - 1.2, maxZ: z + 1.2 }
    );
  }

  // Bio-Containment Stasis Tanks (4 central specimen cylinders with glowing fluid)
  const stasisPositions = [
    { x: -12, z: -12 },
    { x: 12, z: -12 },
    { x: -12, z: 12 },
    { x: 12, z: 12 },
  ];

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x10b981,
    transmission: 0.75,
    roughness: 0.1,
    metalness: 0.1,
    transparent: true,
    opacity: 0.85,
  });

  const liquidMat = new THREE.MeshStandardMaterial({
    color: 0x059669,
    emissive: 0x047857,
    emissiveIntensity: 0.8,
    roughness: 0.2,
  });

  for (const sp of stasisPositions) {
    const tankGroup = new THREE.Group();
    tankGroup.position.set(sp.x, 0, sp.z);

    // Base pedestal
    const baseMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.9, 0.8, 12), steelMat);
    baseMesh.position.y = 0.4;
    tankGroup.add(baseMesh);

    // Glass cylinder
    const glassMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 3.6, 16), glassMat);
    glassMesh.position.y = 2.6;
    tankGroup.add(glassMesh);

    // Inner glowing bubbling liquid core
    const coreMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 3.0, 12), liquidMat);
    coreMesh.position.y = 2.5;
    tankGroup.add(coreMesh);

    // Top cap
    const topMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.4, 0.8, 12), steelMat);
    topMesh.position.y = 4.8;
    tankGroup.add(topMesh);

    // Glowing green bio-light
    const tankLight = new THREE.PointLight(0x34d399, 2.8, 14, 1.5);
    tankLight.position.set(0, 2.5, 0);
    tankGroup.add(tankLight);
    animatedLights.push({
      light: tankLight,
      baseIntensity: 2.8,
      flickerType: 'pulse',
    });

    group.add(tankGroup);

    obstacles.push({
      minX: sp.x - 1.8,
      maxX: sp.x + 1.8,
      minZ: sp.z - 1.8,
      maxZ: sp.z + 1.8,
    });
  }

  // Scattered Tactical Crate clusters & Barricades for combat cover
  const cratePositions = [
    { x: -6, z: 0, rot: 0.1 },
    { x: 6, z: 0, rot: -0.2 },
    { x: 0, z: -20, rot: 0.4 },
    { x: 0, z: 20, rot: -0.1 },
    { x: -22, z: -18, rot: 0 },
    { x: 22, z: 18, rot: 0.5 },
  ];

  const crateTex = createCrateTexture('BIO-HZ', '#06b6d4');
  const crateMat = new THREE.MeshStandardMaterial({
    map: crateTex,
    roughness: 0.6,
    metalness: 0.3,
  });

  for (const cp of cratePositions) {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.4, 2.4), crateMat);
    crate.position.set(cp.x, 1.2, cp.z);
    crate.rotation.y = cp.rot;
    crate.castShadow = true;
    crate.receiveShadow = true;
    group.add(crate);

    obstacles.push({
      minX: cp.x - 1.5,
      maxX: cp.x + 1.5,
      minZ: cp.z - 1.5,
      maxZ: cp.z + 1.5,
    });
  }
}

// ============================================================================
// 2. FOGGY RUINED CEMETERY
// ============================================================================
function buildCemetery(
  group: THREE.Group,
  obstacles: ObstacleBox[],
  animatedLights: AnimatedLight[]
) {
  const mudTex = createMudGroundTexture();
  mudTex.repeat.set(14, 14);
  const groundMat = new THREE.MeshStandardMaterial({
    map: mudTex,
    roughness: 0.85,
    metalness: 0.08,
  });

  // Vast Muddy Cemetery Ground (140x140m)
  const groundMesh = new THREE.Mesh(new THREE.PlaneGeometry(140, 140), groundMat);
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.receiveShadow = true;
  group.add(groundMesh);

  const stoneTex = createGothicStoneTexture();
  const stoneMat = new THREE.MeshStandardMaterial({
    map: stoneTex,
    roughness: 0.9,
    metalness: 0.05,
  });

  const ironMat = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    roughness: 0.6,
    metalness: 0.85,
  });

  // Mausoleum 1 (North)
  function buildMausoleum(x: number, z: number, angle: number) {
    const mGroup = new THREE.Group();
    mGroup.position.set(x, 0, z);
    mGroup.rotation.y = angle;

    // Main tomb body
    const baseMesh = new THREE.Mesh(new THREE.BoxGeometry(8, 5, 10), stoneMat);
    baseMesh.position.y = 2.5;
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    mGroup.add(baseMesh);

    // Arched pediment roof
    const roofMesh = new THREE.Mesh(new THREE.ConeGeometry(6, 3, 4), stoneMat);
    roofMesh.position.set(0, 6.5, 0);
    roofMesh.rotation.y = Math.PI / 4;
    roofMesh.castShadow = true;
    mGroup.add(roofMesh);

    // Stone cross on peak
    const crossVert = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.8, 0.3), stoneMat);
    crossVert.position.set(0, 8.5, 0);
    mGroup.add(crossVert);
    const crossHoriz = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.3, 0.3), stoneMat);
    crossHoriz.position.set(0, 8.8, 0);
    mGroup.add(crossHoriz);

    // Gothic wrought iron gate
    const gateMesh = new THREE.Mesh(new THREE.BoxGeometry(3.2, 4.2, 0.2), ironMat);
    gateMesh.position.set(0, 2.1, 5.05);
    mGroup.add(gateMesh);

    group.add(mGroup);

    obstacles.push({
      minX: x - 4.5,
      maxX: x + 4.5,
      minZ: z - 5.5,
      maxZ: z + 5.5,
    });
  }

  buildMausoleum(0, -32, 0);
  buildMausoleum(-28, 20, Math.PI / 6);
  buildMausoleum(28, 20, -Math.PI / 6);

  // Wrought Iron Spiked Fences (Graveyard Perimeter)
  const fencePositions = [
    { x: 0, z: -44, w: 90, d: 0.4 },
    { x: 0, z: 44, w: 90, d: 0.4 },
    { x: -44, z: 0, w: 0.4, d: 90 },
    { x: 44, z: 0, w: 0.4, d: 90 },
  ];

  for (const fp of fencePositions) {
    const fence = new THREE.Mesh(new THREE.BoxGeometry(fp.w, 3.5, fp.d), ironMat);
    fence.position.set(fp.x, 1.75, fp.z);
    fence.castShadow = true;
    group.add(fence);

    obstacles.push({
      minX: fp.x - fp.w / 2 - 0.4,
      maxX: fp.x + fp.w / 2 + 0.4,
      minZ: fp.z - fp.d / 2 - 0.4,
      maxZ: fp.z + fp.d / 2 + 0.4,
    });
  }

  // Ancient Twisted Leafless Dead Trees (6 sprawling gnarled trees)
  const treePositions = [
    { x: -18, z: -14 },
    { x: 18, z: -14 },
    { x: -20, z: 12 },
    { x: 20, z: 12 },
    { x: 0, z: 18 },
    { x: -32, z: -2 },
  ];

  const woodMat = new THREE.MeshStandardMaterial({
    color: 0x1f1d19,
    roughness: 0.95,
  });

  for (const tp of treePositions) {
    const treeGroup = new THREE.Group();
    treeGroup.position.set(tp.x, 0, tp.z);

    // Twisted trunk
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.8, 6.5, 6), woodMat);
    trunk.position.y = 3.25;
    trunk.castShadow = true;
    treeGroup.add(trunk);

    // Gnarled branches
    for (let b = 0; b < 4; b++) {
      const branchAngle = (b / 4) * Math.PI * 2;
      const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.25, 4.0, 5), woodMat);
      branch.position.set(Math.cos(branchAngle) * 1.5, 5.5, Math.sin(branchAngle) * 1.5);
      branch.rotation.z = Math.PI / 3;
      branch.rotation.y = branchAngle;
      branch.castShadow = true;
      treeGroup.add(branch);
    }

    group.add(treeGroup);

    obstacles.push({
      minX: tp.x - 1.2,
      maxX: tp.x + 1.2,
      minZ: tp.z - 1.2,
      maxZ: tp.z + 1.2,
    });
  }

  // Scattered Carved Gravestones & Obelisks
  const gravestoneGrid = [
    { x: -10, z: -6, tilt: 0.12 },
    { x: -6, z: -8, tilt: -0.08 },
    { x: -12, z: -10, tilt: 0.15 },
    { x: 8, z: -6, tilt: -0.1 },
    { x: 12, z: -8, tilt: 0.05 },
    { x: 6, z: -10, tilt: -0.14 },
    { x: -8, z: 6, tilt: 0.1 },
    { x: 8, z: 6, tilt: -0.12 },
    { x: -14, z: 18, tilt: 0.06 },
    { x: 14, z: 18, tilt: -0.1 },
  ];

  for (const gs of gravestoneGrid) {
    const grave = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.4, 0.25), stoneMat);
    grave.position.set(gs.x, 0.7, gs.z);
    grave.rotation.z = gs.tilt;
    grave.castShadow = true;
    grave.receiveShadow = true;
    group.add(grave);

    obstacles.push({
      minX: gs.x - 0.5,
      maxX: gs.x + 0.5,
      minZ: gs.z - 0.5,
      maxZ: gs.z + 0.5,
    });
  }

  // Warm Flickering Tomb Lantern Posts (4 lanterns)
  const lanternPositions = [
    { x: -12, z: -12 },
    { x: 12, z: -12 },
    { x: -12, z: 12 },
    { x: 12, z: 12 },
  ];

  for (const lp of lanternPositions) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 3.2, 6), ironMat);
    post.position.set(lp.x, 1.6, lp.z);
    post.castShadow = true;
    group.add(post);

    const lantern = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.6, 0.4),
      new THREE.MeshBasicMaterial({ color: 0xf59e0b })
    );
    lantern.position.set(lp.x, 3.2, lp.z);
    group.add(lantern);

    const fireLight = new THREE.PointLight(0xf97316, 2.5, 18, 1.4);
    fireLight.position.set(lp.x, 3.2, lp.z);
    group.add(fireLight);

    animatedLights.push({
      light: fireLight,
      baseIntensity: 2.5,
      flickerType: 'fire',
    });
  }
}

// ============================================================================
// 3. OVERGROWN SUBWAY CONCOURSE
// ============================================================================
function buildSubway(
  group: THREE.Group,
  obstacles: ObstacleBox[],
  animatedLights: AnimatedLight[]
) {
  const tileTex = createSubwayTileTexture();
  tileTex.repeat.set(12, 12);
  const floorMat = new THREE.MeshStandardMaterial({
    map: createWetConcreteTexture(),
    roughness: 0.5,
    metalness: 0.2,
  });

  const wallMat = new THREE.MeshStandardMaterial({
    map: tileTex,
    roughness: 0.35, // Glossy subway tiles
    metalness: 0.1,
  });

  const steelMat = new THREE.MeshStandardMaterial({
    map: createRustedSteelTexture(),
    roughness: 0.6,
    metalness: 0.85,
  });

  // Concourse Floor (140x140m)
  const floorMesh = new THREE.Mesh(new THREE.PlaneGeometry(140, 140), floorMat);
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.receiveShadow = true;
  group.add(floorMesh);

  // High Vaulted Subway Tile Boundary Walls
  const wallH = 10;
  const wallPositions = [
    { x: 0, z: -40, w: 80, d: 2 },
    { x: 0, z: 40, w: 80, d: 2 },
    { x: -40, z: 0, w: 2, d: 80 },
    { x: 40, z: 0, w: 2, d: 80 },
  ];

  for (const wp of wallPositions) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(wp.w, wallH, wp.d), wallMat);
    wall.position.set(wp.x, wallH / 2, wp.z);
    wall.castShadow = true;
    wall.receiveShadow = true;
    group.add(wall);

    obstacles.push({
      minX: wp.x - wp.w / 2 - 0.4,
      maxX: wp.x + wp.w / 2 + 0.4,
      minZ: wp.z - wp.d / 2 - 0.4,
      maxZ: wp.z + wp.d / 2 + 0.4,
    });
  }

  // Heavy Structural Steel I-Beam Pillars running down concourse
  for (let z = -28; z <= 28; z += 14) {
    for (let x of [-16, 16]) {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(1.6, wallH, 1.6), steelMat);
      pillar.position.set(x, wallH / 2, z);
      pillar.castShadow = true;
      group.add(pillar);

      obstacles.push({
        minX: x - 1.0,
        maxX: x + 1.0,
        minZ: z - 1.0,
        maxZ: z + 1.0,
      });
    }
  }

  // Abandoned Subway Train Carriages (2 massive steel train hulls on track side)
  function buildTrainCar(x: number, z: number, length: number) {
    const carGroup = new THREE.Group();
    carGroup.position.set(x, 0, z);

    // Car hull
    const hullGeo = new THREE.BoxGeometry(4.2, 4.0, length);
    const hullMat = new THREE.MeshStandardMaterial({
      color: 0x3f3f46,
      map: createRustedSteelTexture(),
      roughness: 0.5,
      metalness: 0.75,
    });
    const hull = new THREE.Mesh(hullGeo, hullMat);
    hull.position.y = 2.4;
    hull.castShadow = true;
    hull.receiveShadow = true;
    carGroup.add(hull);

    // Under-carriage wheels/tracks
    const trackGeo = new THREE.BoxGeometry(4.6, 0.4, length);
    const track = new THREE.Mesh(trackGeo, steelMat);
    track.position.y = 0.2;
    carGroup.add(track);

    // Yellow warning stripe along car side
    const stripeGeo = new THREE.BoxGeometry(4.24, 0.35, length);
    const stripeMat = new THREE.MeshBasicMaterial({ color: 0xeab308 });
    const stripe = new THREE.Mesh(stripeGeo, stripeMat);
    stripe.position.y = 1.8;
    carGroup.add(stripe);

    // Flickering passenger window light from inside train
    const trainLight = new THREE.PointLight(0xfef08a, 2.4, 18, 1.3);
    trainLight.position.set(0, 2.5, 0);
    carGroup.add(trainLight);
    animatedLights.push({
      light: trainLight,
      baseIntensity: 2.4,
      flickerType: 'subway',
    });

    group.add(carGroup);

    obstacles.push({
      minX: x - 2.4,
      maxX: x + 2.4,
      minZ: z - length / 2 - 0.5,
      maxZ: z + length / 2 + 0.5,
    });
  }

  buildTrainCar(-28, 0, 36);
  buildTrainCar(28, 6, 32);

  // Turnstile Gates & Caution Barricades
  const barrierTex = createBarricadeTexture();
  const barrierMat = new THREE.MeshStandardMaterial({
    map: barrierTex,
    roughness: 0.7,
  });

  const barrierPositions = [
    { x: -6, z: -15, rot: 0 },
    { x: 6, z: -15, rot: 0 },
    { x: -6, z: 15, rot: 0 },
    { x: 6, z: 15, rot: 0 },
    { x: 0, z: 0, rot: Math.PI / 4 },
  ];

  for (const bp of barrierPositions) {
    const barrier = new THREE.Mesh(new THREE.BoxGeometry(3.5, 1.4, 0.5), barrierMat);
    barrier.position.set(bp.x, 0.7, bp.z);
    barrier.rotation.y = bp.rot;
    barrier.castShadow = true;
    group.add(barrier);

    obstacles.push({
      minX: bp.x - 2.0,
      maxX: bp.x + 2.0,
      minZ: bp.z - 1.0,
      maxZ: bp.z + 1.0,
    });
  }

  // Amber Emergency Halogen Worklights on Tripods
  const halogenPositions = [
    { x: -10, z: -6 },
    { x: 10, z: 6 },
    { x: 0, z: -24 },
    { x: 0, z: 24 },
  ];

  for (const hp of halogenPositions) {
    const tripod = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.3, 2.5, 4), steelMat);
    tripod.position.set(hp.x, 1.25, hp.z);
    group.add(tripod);

    const lamp = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.4, 0.3),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
    );
    lamp.position.set(hp.x, 2.5, hp.z);
    group.add(lamp);

    const spot = new THREE.PointLight(0xf59e0b, 3.0, 24, 1.2);
    spot.position.set(hp.x, 2.5, hp.z);
    group.add(spot);

    animatedLights.push({
      light: spot,
      baseIntensity: 3.0,
      flickerType: 'subway',
    });
  }
}

// ============================================================================
// 4. RUINED CITY SECTOR 4 (Enhanced)
// ============================================================================
function buildCity(
  group: THREE.Group,
  obstacles: ObstacleBox[],
  animatedLights: AnimatedLight[]
) {
  const asphaltTex = createAsphaltTexture();
  asphaltTex.repeat.set(16, 16);
  const groundMat = new THREE.MeshStandardMaterial({
    map: asphaltTex,
    roughness: 0.8,
    metalness: 0.05,
  });

  const groundGeo = new THREE.PlaneGeometry(160, 160);
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(ground);

  const bldgTex1 = createBuildingFacadeTexture(0);
  bldgTex1.repeat.set(2, 4);
  const bldgMat1 = new THREE.MeshStandardMaterial({ map: bldgTex1, roughness: 0.7 });

  const bldgTex2 = createBuildingFacadeTexture(1);
  bldgTex2.repeat.set(2, 5);
  const bldgMat2 = new THREE.MeshStandardMaterial({ map: bldgTex2, roughness: 0.7 });

  const bldgMats = [bldgMat1, bldgMat2];

  function createBuilding(x: number, z: number, w: number, d: number, h: number, matIdx: number) {
    const bGroup = new THREE.Group();
    bGroup.position.set(x, 0, z);

    const mainMesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), bldgMats[matIdx % bldgMats.length]);
    mainMesh.position.y = h / 2;
    mainMesh.castShadow = true;
    mainMesh.receiveShadow = true;
    bGroup.add(mainMesh);

    // Parapet roof
    const roofMesh = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.6, 4, d * 0.6),
      new THREE.MeshStandardMaterial({ color: 0x1f2229, roughness: 0.6, metalness: 0.4 })
    );
    roofMesh.position.y = h + 2;
    bGroup.add(roofMesh);

    group.add(bGroup);

    obstacles.push({
      minX: x - w / 2 - 0.5,
      maxX: x + w / 2 + 0.5,
      minZ: z - d / 2 - 0.5,
      maxZ: z + d / 2 + 0.5,
    });
  }

  // Skyline Perimeter
  createBuilding(-36, -36, 18, 18, 45, 0);
  createBuilding(36, -36, 18, 18, 50, 1);
  createBuilding(-36, 36, 18, 18, 40, 1);
  createBuilding(36, 36, 18, 18, 48, 0);

  createBuilding(0, -42, 28, 12, 38, 0);
  createBuilding(0, 42, 28, 12, 35, 1);
  createBuilding(-42, 0, 12, 28, 42, 1);
  createBuilding(42, 0, 12, 28, 40, 0);

  // Burning Fuel Oil Barrels (Dynamic firelight)
  const barrelPositions = [
    { x: -14, z: -14 },
    { x: 14, z: -14 },
    { x: -14, z: 14 },
    { x: 14, z: 14 },
  ];

  const barrelMat = new THREE.MeshStandardMaterial({
    map: createRustedSteelTexture(),
    roughness: 0.5,
    metalness: 0.7,
  });

  for (const bp of barrelPositions) {
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.4, 10), barrelMat);
    barrel.position.set(bp.x, 0.7, bp.z);
    barrel.castShadow = true;
    group.add(barrel);

    const fireGlow = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xf97316 })
    );
    fireGlow.position.set(bp.x, 1.6, bp.z);
    group.add(fireGlow);

    const fireLight = new THREE.PointLight(0xff6b00, 3.5, 22, 1.5);
    fireLight.position.set(bp.x, 1.8, bp.z);
    group.add(fireLight);

    animatedLights.push({
      light: fireLight,
      baseIntensity: 3.5,
      flickerType: 'fire',
    });

    obstacles.push({
      minX: bp.x - 0.7,
      maxX: bp.x + 0.7,
      minZ: bp.z - 0.7,
      maxZ: bp.z + 0.7,
    });
  }

  // Barricades in central plaza
  const barMat = new THREE.MeshStandardMaterial({ map: createBarricadeTexture(), roughness: 0.7 });
  const barPositions = [
    { x: -5, z: 0 },
    { x: 5, z: 0 },
    { x: 0, z: -8 },
    { x: 0, z: 8 },
  ];
  for (const bar of barPositions) {
    const bMesh = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.2, 0.6), barMat);
    bMesh.position.set(bar.x, 0.6, bar.z);
    bMesh.castShadow = true;
    group.add(bMesh);

    obstacles.push({
      minX: bar.x - 2.0,
      maxX: bar.x + 2.0,
      minZ: bar.z - 0.6,
      maxZ: bar.z + 0.6,
    });
  }
}
