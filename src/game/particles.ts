import * as THREE from 'three';
import { ZombieType } from './types';

/**
 * Pre-allocated zero-GC Particle & Impact Debris System for 3D FPS.
 * Features:
 * - High-velocity arterial blood mist and gore spray.
 * - Solid flesh chunks, bone fragments, and armor shrapnel debris with physics and ground bounce.
 * - Environmental bullet impact dust clouds, rubble chips, and ricochet sparks.
 * - Floor blood splatters / decals that dynamically stamp beneath wounded zombies.
 * - Fully pre-allocated BufferGeometry with zero runtime garbage collection.
 */

interface Particle {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  r: number;
  g: number;
  b: number;
  size: number;
  life: number;
  maxLife: number;
  gravity: number;
  drag: number;
  bounce: number;
  particleType: 'blood' | 'flesh' | 'bone' | 'spark' | 'dust' | 'acid' | 'shrapnel';
}

interface FloorDecal {
  active: boolean;
  x: number;
  z: number;
  rotation: number;
  scale: number;
  alpha: number;
  life: number;
  maxLife: number;
  r: number;
  g: number;
  b: number;
}

export interface ParticleSystem {
  group: THREE.Group;
  spawnZombieHit: (
    hitPoint: THREE.Vector3,
    shotDir: THREE.Vector3,
    hitNormal: THREE.Vector3,
    isHeadshot: boolean,
    zombieType: ZombieType,
    damage: number
  ) => void;
  spawnEnvironmentImpact: (
    hitPoint: THREE.Vector3,
    surfaceNormal: THREE.Vector3,
    materialType?: 'concrete' | 'metal' | 'stone' | 'dirt'
  ) => void;
  spawnBlood: (pos: THREE.Vector3, count?: number) => void;
  spawnSparks: (pos: THREE.Vector3, count?: number) => void;
  spawnAcidGoo: (pos: THREE.Vector3, count?: number) => void;
  spawnExplosion: (pos: THREE.Vector3) => void;
  update: (dt: number) => void;
  dispose: () => void;
}

export function createParticleSystem(scene: THREE.Scene): ParticleSystem {
  const group = new THREE.Group();
  scene.add(group);

  // 1. Particle Pool (1,200 particles for high-octane firefights)
  const MAX_PARTICLES = 1200;
  const particles: Particle[] = [];

  for (let i = 0; i < MAX_PARTICLES; i++) {
    particles.push({
      active: false,
      x: 0,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      r: 1,
      g: 1,
      b: 1,
      size: 0.2,
      life: 0,
      maxLife: 1,
      gravity: 9.8,
      drag: 0.98,
      bounce: 0.25,
      particleType: 'blood',
    });
  }

  const positions = new Float32Array(MAX_PARTICLES * 3);
  const colors = new Float32Array(MAX_PARTICLES * 3);

  // Initialize off-screen
  for (let i = 0; i < MAX_PARTICLES; i++) {
    positions[i * 3 + 1] = -999;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  // Procedural jagged organic droplet texture
  const dropletCanvas = document.createElement('canvas');
  dropletCanvas.width = 64;
  dropletCanvas.height = 64;
  const dCtx = dropletCanvas.getContext('2d')!;

  // Smooth radial center with organic droplet splatter halo
  const grad = dCtx.createRadialGradient(32, 32, 2, 32, 32, 28);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.95)');
  grad.addColorStop(0.85, 'rgba(255, 255, 255, 0.4)');
  grad.addColorStop(1, 'transparent');
  dCtx.fillStyle = grad;
  dCtx.beginPath();
  dCtx.arc(32, 32, 28, 0, Math.PI * 2);
  dCtx.fill();

  // Little spatter flecks around the main drop
  dCtx.fillStyle = '#ffffff';
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const dist = 24 + (i % 3) * 4;
    dCtx.beginPath();
    dCtx.arc(32 + Math.cos(angle) * dist, 32 + Math.sin(angle) * dist, 2.5, 0, Math.PI * 2);
    dCtx.fill();
  }

  const pointTex = new THREE.CanvasTexture(dropletCanvas);
  pointTex.generateMipmaps = true;

  const pointsMaterial = new THREE.PointsMaterial({
    size: 0.42,
    vertexColors: true,
    map: pointTex,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });

  const pointsMesh = new THREE.Points(geometry, pointsMaterial);
  group.add(pointsMesh);

  // 2. Floor Blood Splatter Decal System (InstancedMesh)
  const MAX_FLOOR_DECALS = 80;
  const floorDecals: FloorDecal[] = [];
  for (let i = 0; i < MAX_FLOOR_DECALS; i++) {
    floorDecals.push({
      active: false,
      x: 0,
      z: 0,
      rotation: 0,
      scale: 1,
      alpha: 0,
      life: 0,
      maxLife: 15,
      r: 0.4,
      g: 0.05,
      b: 0.05,
    });
  }

  // Splatter decal texture on canvas
  const splatCanvas = document.createElement('canvas');
  splatCanvas.width = 128;
  splatCanvas.height = 128;
  const sCtx = splatCanvas.getContext('2d')!;

  // Dark central blood pool
  sCtx.fillStyle = '#ffffff';
  sCtx.beginPath();
  sCtx.ellipse(64, 64, 38, 30, Math.PI / 6, 0, Math.PI * 2);
  sCtx.fill();

  // Radial spatter tentacles
  for (let s = 0; s < 12; s++) {
    const sAngle = (s / 12) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
    const sLen = 42 + Math.random() * 20;
    sCtx.lineWidth = 4 + Math.random() * 5;
    sCtx.strokeStyle = '#ffffff';
    sCtx.beginPath();
    sCtx.moveTo(64, 64);
    sCtx.lineTo(64 + Math.cos(sAngle) * sLen, 64 + Math.sin(sAngle) * sLen);
    sCtx.stroke();

    // End droplets
    sCtx.beginPath();
    sCtx.arc(
      64 + Math.cos(sAngle) * (sLen + 5),
      64 + Math.sin(sAngle) * (sLen + 5),
      3 + Math.random() * 4,
      0,
      Math.PI * 2
    );
    sCtx.fill();
  }

  const splatTex = new THREE.CanvasTexture(splatCanvas);
  const decalGeo = new THREE.PlaneGeometry(1.6, 1.6);
  decalGeo.rotateX(-Math.PI / 2); // Flat on floor

  const decalMat = new THREE.MeshBasicMaterial({
    map: splatTex,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  });

  const decalMesh = new THREE.InstancedMesh(decalGeo, decalMat, MAX_FLOOR_DECALS);
  decalMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  if (decalMesh.instanceColor) {
    decalMesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
  }
  group.add(decalMesh);

  // Initialize all floor decals far away
  const dummyMatrix = new THREE.Matrix4().setPosition(0, -999, 0);
  for (let i = 0; i < MAX_FLOOR_DECALS; i++) {
    decalMesh.setMatrixAt(i, dummyMatrix);
  }
  decalMesh.instanceMatrix.needsUpdate = true;

  let nextParticleIdx = 0;
  function allocParticle(): Particle {
    const p = particles[nextParticleIdx];
    nextParticleIdx = (nextParticleIdx + 1) % MAX_PARTICLES;
    return p;
  }

  let nextDecalIdx = 0;
  function spawnFloorDecal(x: number, z: number, scale = 1, r = 0.45, g = 0.04, b = 0.06) {
    const d = floorDecals[nextDecalIdx];
    nextDecalIdx = (nextDecalIdx + 1) % MAX_FLOOR_DECALS;

    d.active = true;
    d.x = x + (Math.random() - 0.5) * 0.4;
    d.z = z + (Math.random() - 0.5) * 0.4;
    d.rotation = Math.random() * Math.PI * 2;
    d.scale = (0.7 + Math.random() * 0.6) * scale;
    d.alpha = 0.85;
    d.life = 0;
    d.maxLife = 12 + Math.random() * 6; // Persistent for 12-18 seconds
    d.r = r;
    d.g = g;
    d.b = b;

    updateDecalMatrix(nextDecalIdx - 1 < 0 ? MAX_FLOOR_DECALS - 1 : nextDecalIdx - 1, d);
  }

  function updateDecalMatrix(index: number, d: FloorDecal) {
    const mat = new THREE.Matrix4();
    if (!d.active) {
      mat.setPosition(0, -999, 0);
    } else {
      const position = new THREE.Vector3(d.x, 0.02, d.z);
      const quaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), d.rotation);
      const scale = new THREE.Vector3(d.scale, 1, d.scale);
      mat.compose(position, quaternion, scale);
    }
    decalMesh.setMatrixAt(index, mat);
    decalMesh.setColorAt(index, new THREE.Color(d.r * d.alpha, d.g * d.alpha, d.b * d.alpha));
    decalMesh.instanceMatrix.needsUpdate = true;
    if (decalMesh.instanceColor) decalMesh.instanceColor.needsUpdate = true;
  }

  /**
   * Spawns an impactful, visceral burst of arterial blood, flesh debris,
   * bone fragments, or armor shrapnel right at the bullet impact point.
   */
  function spawnZombieHit(
    hitPoint: THREE.Vector3,
    shotDir: THREE.Vector3,
    hitNormal: THREE.Vector3,
    isHeadshot: boolean,
    zombieType: ZombieType,
    damage: number
  ) {
    // Determine blood color palette based on archetype
    let bloodR = 0.75;
    let bloodG = 0.04;
    let bloodB = 0.07;
    let fleshR = 0.35;
    let fleshG = 0.02;
    let fleshB = 0.03;

    if (zombieType === 'spitter') {
      // Toxic neon lime acid blood
      bloodR = 0.5;
      bloodG = 0.95;
      bloodB = 0.05;
      fleshR = 0.25;
      fleshG = 0.45;
      fleshB = 0.05;
    } else if (zombieType === 'runner') {
      // High-pressure arterial bright scarlet
      bloodR = 0.95;
      bloodG = 0.02;
      bloodB = 0.05;
      fleshR = 0.5;
      fleshG = 0.05;
      fleshB = 0.08;
    } else if (zombieType === 'brute') {
      // Dark oily coagulated maroon
      bloodR = 0.45;
      bloodG = 0.05;
      bloodB = 0.08;
      fleshR = 0.2;
      fleshG = 0.04;
      fleshB = 0.04;
    }

    // 1. Directional Arterial Blood Mist (sprays back out along entry wound)
    const bloodCount = isHeadshot ? 28 : Math.min(22, 10 + Math.floor(damage * 0.25));
    const reverseDir = shotDir.clone().negate();

    for (let i = 0; i < bloodCount; i++) {
      const p = allocParticle();
      p.active = true;
      p.x = hitPoint.x + (Math.random() - 0.5) * 0.08;
      p.y = hitPoint.y + (Math.random() - 0.5) * 0.08;
      p.z = hitPoint.z + (Math.random() - 0.5) * 0.08;

      // Cone spray along reverse bullet vector plus wound normal
      const speed = 2.5 + Math.random() * (isHeadshot ? 7.5 : 5.0);
      const spreadX = (Math.random() - 0.5) * 1.2;
      const spreadY = (Math.random() - 0.2) * 1.2;
      const spreadZ = (Math.random() - 0.5) * 1.2;

      p.vx = (reverseDir.x * 0.7 + hitNormal.x * 0.3 + spreadX) * speed;
      p.vy = (reverseDir.y * 0.5 + 0.6 + spreadY) * speed;
      p.vz = (reverseDir.z * 0.7 + hitNormal.z * 0.3 + spreadZ) * speed;

      p.r = Math.min(1.0, bloodR + (Math.random() - 0.5) * 0.15);
      p.g = Math.min(1.0, bloodG + (Math.random() - 0.5) * 0.04);
      p.b = bloodB;

      p.size = 0.25 + Math.random() * 0.25;
      p.life = 0;
      p.maxLife = 0.35 + Math.random() * 0.3;
      p.gravity = 14;
      p.drag = 0.94;
      p.bounce = 0.15;
      p.particleType = 'blood';
    }

    // 2. Solid Flesh & Tissue Chunks (heavier chunks that fly and bounce)
    const chunkCount = isHeadshot ? 10 : 5;
    for (let c = 0; c < chunkCount; c++) {
      const p = allocParticle();
      p.active = true;
      p.x = hitPoint.x;
      p.y = hitPoint.y;
      p.z = hitPoint.z;

      const speed = 1.5 + Math.random() * 4;
      p.vx = (Math.random() - 0.5) * speed;
      p.vy = Math.random() * speed + 1.2;
      p.vz = (Math.random() - 0.5) * speed;

      p.r = fleshR;
      p.g = fleshG;
      p.b = fleshB;

      p.size = 0.35 + Math.random() * 0.25;
      p.life = 0;
      p.maxLife = 0.6 + Math.random() * 0.4;
      p.gravity = 18;
      p.drag = 0.96;
      p.bounce = 0.35; // Chunks bounce on floor
      p.particleType = 'flesh';
    }

    // 3. Bone Fragment Debris (Ivory / white skull fragments on headshot or critical hits)
    if (isHeadshot || damage > 80) {
      const boneCount = isHeadshot ? 12 : 4;
      for (let b = 0; b < boneCount; b++) {
        const p = allocParticle();
        p.active = true;
        p.x = hitPoint.x;
        p.y = hitPoint.y;
        p.z = hitPoint.z;

        const bSpeed = 3.0 + Math.random() * 6;
        p.vx = (Math.random() - 0.5) * bSpeed;
        p.vy = Math.random() * bSpeed * 0.8 + 1.5;
        p.vz = (Math.random() - 0.5) * bSpeed;

        // Calcified bone ivory with slight blood streak
        p.r = 0.92 + Math.random() * 0.08;
        p.g = 0.88 + Math.random() * 0.08;
        p.b = 0.78;

        p.size = 0.18 + Math.random() * 0.16;
        p.life = 0;
        p.maxLife = 0.7 + Math.random() * 0.5;
        p.gravity = 20;
        p.drag = 0.98;
        p.bounce = 0.45;
        p.particleType = 'bone';
      }
    }

    // 4. Brute Armor Shrapnel & Sparks (if hitting armored Brute)
    if (zombieType === 'brute') {
      for (let s = 0; s < 8; s++) {
        const p = allocParticle();
        p.active = true;
        p.x = hitPoint.x;
        p.y = hitPoint.y;
        p.z = hitPoint.z;

        const sSpeed = 4.0 + Math.random() * 6;
        p.vx = (hitNormal.x + (Math.random() - 0.5)) * sSpeed;
        p.vy = (hitNormal.y + Math.random() * 0.8) * sSpeed;
        p.vz = (hitNormal.z + (Math.random() - 0.5)) * sSpeed;

        p.r = 1.0;
        p.g = 0.8 + Math.random() * 0.2;
        p.b = 0.2;

        p.size = 0.15;
        p.life = 0;
        p.maxLife = 0.25 + Math.random() * 0.15;
        p.gravity = 12;
        p.drag = 0.99;
        p.bounce = 0.5;
        p.particleType = 'spark';
      }
    }

    // 5. Floor Decal Stamp (Splatter pool on floor beneath/behind zombie)
    spawnFloorDecal(hitPoint.x, hitPoint.z, isHeadshot ? 1.4 : 1.0, bloodR * 0.6, bloodG * 0.6, bloodB * 0.6);
  }

  /**
   * Spawns environment impact debris: concrete dust puffs, chipped rubble stones, and sparks
   * when bullets strike walls, barriers, or ground.
   */
  function spawnEnvironmentImpact(
    hitPoint: THREE.Vector3,
    surfaceNormal: THREE.Vector3,
    materialType: 'concrete' | 'metal' | 'stone' | 'dirt' = 'concrete'
  ) {
    // 1. Chipped Rubble Debris (stone / concrete pebbles flying off)
    const debrisCount = 6;
    for (let d = 0; d < debrisCount; d++) {
      const p = allocParticle();
      p.active = true;
      p.x = hitPoint.x;
      p.y = hitPoint.y;
      p.z = hitPoint.z;

      const speed = 2.5 + Math.random() * 4.5;
      p.vx = (surfaceNormal.x + (Math.random() - 0.5) * 0.8) * speed;
      p.vy = (surfaceNormal.y + Math.random() * 0.8) * speed + 0.5;
      p.vz = (surfaceNormal.z + (Math.random() - 0.5) * 0.8) * speed;

      if (materialType === 'metal') {
        p.r = 0.7;
        p.g = 0.7;
        p.b = 0.75;
      } else if (materialType === 'dirt') {
        p.r = 0.35;
        p.g = 0.3;
        p.b = 0.22;
      } else {
        // Concrete / stone
        p.r = 0.6 + Math.random() * 0.2;
        p.g = 0.6 + Math.random() * 0.2;
        p.b = 0.6 + Math.random() * 0.2;
      }

      p.size = 0.2 + Math.random() * 0.15;
      p.life = 0;
      p.maxLife = 0.5 + Math.random() * 0.3;
      p.gravity = 16;
      p.drag = 0.95;
      p.bounce = 0.4;
      p.particleType = 'flesh'; // uses standard physics
    }

    // 2. Dust Cloud Puff (soft gray/tan particulate expanding outward)
    for (let u = 0; u < 5; u++) {
      const p = allocParticle();
      p.active = true;
      p.x = hitPoint.x;
      p.y = hitPoint.y;
      p.z = hitPoint.z;

      p.vx = (surfaceNormal.x * 0.8 + (Math.random() - 0.5)) * 1.5;
      p.vy = (surfaceNormal.y * 0.8 + Math.random() * 0.6) * 1.5;
      p.vz = (surfaceNormal.z * 0.8 + (Math.random() - 0.5)) * 1.5;

      p.r = 0.55;
      p.g = 0.55;
      p.b = 0.58;

      p.size = 0.45 + Math.random() * 0.35;
      p.life = 0;
      p.maxLife = 0.4 + Math.random() * 0.25;
      p.gravity = 2; // slow hang time
      p.drag = 0.85; // fast air resistance
      p.bounce = 0;
      p.particleType = 'dust';
    }

    // 3. Ricochet Sparks
    const sparkCount = materialType === 'metal' ? 8 : 4;
    for (let s = 0; s < sparkCount; s++) {
      const p = allocParticle();
      p.active = true;
      p.x = hitPoint.x;
      p.y = hitPoint.y;
      p.z = hitPoint.z;

      const speed = 4.0 + Math.random() * 5.5;
      p.vx = (surfaceNormal.x + (Math.random() - 0.5) * 1.2) * speed;
      p.vy = (surfaceNormal.y + Math.random() * 0.9) * speed;
      p.vz = (surfaceNormal.z + (Math.random() - 0.5) * 1.2) * speed;

      p.r = 1.0;
      p.g = 0.85;
      p.b = 0.3;

      p.size = 0.12;
      p.life = 0;
      p.maxLife = 0.2 + Math.random() * 0.15;
      p.gravity = 14;
      p.drag = 0.98;
      p.bounce = 0.5;
      p.particleType = 'spark';
    }
  }

  // Legacy helper for generic blood spawn
  function spawnBlood(pos: THREE.Vector3, count = 16) {
    spawnZombieHit(pos, new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 1, 0), false, 'walker', 40);
  }

  function spawnSparks(pos: THREE.Vector3, count = 8) {
    spawnEnvironmentImpact(pos, new THREE.Vector3(0, 1, 0), 'metal');
  }

  function spawnAcidGoo(pos: THREE.Vector3, count = 14) {
    for (let i = 0; i < count; i++) {
      const p = allocParticle();
      p.active = true;
      p.x = pos.x;
      p.y = pos.y;
      p.z = pos.z;

      p.vx = (Math.random() - 0.5) * 5;
      p.vy = Math.random() * 3.5 + 0.5;
      p.vz = (Math.random() - 0.5) * 5;

      p.r = 0.45;
      p.g = 0.95;
      p.b = 0.12;

      p.size = 0.32 + Math.random() * 0.2;
      p.life = 0;
      p.maxLife = 0.5 + Math.random() * 0.3;
      p.gravity = 12;
      p.drag = 0.94;
      p.bounce = 0.1;
      p.particleType = 'acid';
    }
  }

  function spawnExplosion(pos: THREE.Vector3) {
    for (let i = 0; i < 45; i++) {
      const p = allocParticle();
      p.active = true;
      p.x = pos.x;
      p.y = pos.y;
      p.z = pos.z;

      const speed = 2.5 + Math.random() * 8.5;
      const angle = Math.random() * Math.PI * 2;
      const elev = (Math.random() - 0.2) * Math.PI;

      p.vx = Math.cos(angle) * Math.cos(elev) * speed;
      p.vy = Math.sin(elev) * speed + 2.5;
      p.vz = Math.sin(angle) * Math.cos(elev) * speed;

      if (Math.random() < 0.65) {
        p.r = 1.0;
        p.g = 0.4 + Math.random() * 0.4;
        p.b = 0.08;
      } else {
        p.r = 0.3;
        p.g = 0.3;
        p.b = 0.3;
      }

      p.size = 0.4 + Math.random() * 0.4;
      p.life = 0;
      p.maxLife = 0.6 + Math.random() * 0.4;
      p.gravity = 7;
      p.drag = 0.92;
      p.bounce = 0.2;
      p.particleType = 'dust';
    }
    spawnFloorDecal(pos.x, pos.z, 2.0, 0.15, 0.15, 0.15); // scorch mark
  }

  function update(dt: number) {
    // 1. Update In-Flight Particles
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = particles[i];
      if (!p.active) {
        positions[i * 3 + 1] = -999;
        continue;
      }

      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        positions[i * 3 + 1] = -999;
        continue;
      }

      // Physics integration (velocity, gravity, drag)
      p.vy -= p.gravity * dt;
      p.vx *= p.drag;
      p.vz *= p.drag;

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;

      // Floor bounce & friction
      if (p.y <= 0.05) {
        p.y = 0.05;
        p.vx *= 0.45;
        p.vz *= 0.45;
        p.vy = -p.vy * p.bounce;
      }

      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;

      // Alpha fade out over life
      const alpha = Math.max(0, 1 - p.life / p.maxLife);
      colors[i * 3] = p.r * alpha;
      colors[i * 3 + 1] = p.g * alpha;
      colors[i * 3 + 2] = p.b * alpha;
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;

    // 2. Update Floor Decals (gradual fade out)
    let needsDecalUpdate = false;
    for (let i = 0; i < MAX_FLOOR_DECALS; i++) {
      const d = floorDecals[i];
      if (!d.active) continue;

      d.life += dt;
      if (d.life >= d.maxLife) {
        d.active = false;
        updateDecalMatrix(i, d);
        needsDecalUpdate = true;
        continue;
      }

      // Start fading during the last 30% of its lifetime
      const fadeStart = d.maxLife * 0.7;
      if (d.life > fadeStart) {
        d.alpha = Math.max(0, 1 - (d.life - fadeStart) / (d.maxLife - fadeStart)) * 0.85;
        decalMesh.setColorAt(i, new THREE.Color(d.r * d.alpha, d.g * d.alpha, d.b * d.alpha));
        needsDecalUpdate = true;
      }
    }

    if (needsDecalUpdate && decalMesh.instanceColor) {
      decalMesh.instanceColor.needsUpdate = true;
    }
  }

  function dispose() {
    scene.remove(group);
    geometry.dispose();
    pointsMaterial.dispose();
    pointTex.dispose();
    decalGeo.dispose();
    decalMat.dispose();
    splatTex.dispose();
    decalMesh.dispose();
  }

  return {
    group,
    spawnZombieHit,
    spawnEnvironmentImpact,
    spawnBlood,
    spawnSparks,
    spawnAcidGoo,
    spawnExplosion,
    update,
    dispose,
  };
}
