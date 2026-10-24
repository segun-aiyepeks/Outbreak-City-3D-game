import * as THREE from 'three';
import { ZombieStats, ZombieType } from './types';
import { getScaledZombieHp, ZOMBIE_TEMPLATES } from './rules';
import {
  createDecayedFleshTexture,
  createBoneTexture,
  createZombieClothTexture,
  createRustedSteelTexture,
} from './textures';

export interface ZombieInstance {
  id: number;
  type: ZombieType;
  stats: ZombieStats;
  mesh: THREE.Group;
  headMesh: THREE.Mesh;
  bodyMesh: THREE.Mesh;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  eyeLight?: THREE.PointLight;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  rotationY: number;
  hp: number;
  maxHp: number;
  isTelegraphing: boolean;
  telegraphTimer: number;
  attackCooldown: number;
  isDying: boolean;
  deathTimer: number;
  hitFlashTimer: number;
  walkPhase: number;
  headPositionWorld: THREE.Vector3;
  centerPositionWorld: THREE.Vector3;
  flashMaterials: THREE.MeshStandardMaterial[];
}

export interface ZombieManager {
  zombies: ZombieInstance[];
  spawnZombie: (type: ZombieType, x: number, z: number, wave: number) => ZombieInstance;
  removeZombie: (id: number) => void;
  clearAll: () => void;
  update: (
    dt: number,
    playerPos: THREE.Vector3,
    onPlayerDamage: (amount: number) => void,
    onAcidSpit: (from: THREE.Vector3, dir: THREE.Vector3) => void
  ) => void;
}

let zombieIdCounter = 1;

export function createZombieManager(scene: THREE.Scene): ZombieManager {
  const zombies: ZombieInstance[] = [];
  const parentGroup = new THREE.Group();
  scene.add(parentGroup);

  // Cached materials for realistic PBR rendering
  const fleshMaterials: Record<ZombieType, THREE.MeshStandardMaterial> = {
    walker: new THREE.MeshStandardMaterial({
      map: createDecayedFleshTexture('walker'),
      roughness: 0.85,
      metalness: 0.1,
      bumpScale: 0.04,
    }),
    runner: new THREE.MeshStandardMaterial({
      map: createDecayedFleshTexture('runner'),
      roughness: 0.7,
      metalness: 0.15,
      bumpScale: 0.05,
    }),
    spitter: new THREE.MeshStandardMaterial({
      map: createDecayedFleshTexture('spitter'),
      roughness: 0.6,
      metalness: 0.2,
      bumpScale: 0.05,
    }),
    brute: new THREE.MeshStandardMaterial({
      map: createDecayedFleshTexture('brute'),
      roughness: 0.9,
      metalness: 0.3,
      bumpScale: 0.06,
    }),
  };

  const boneMaterial = new THREE.MeshStandardMaterial({
    map: createBoneTexture(),
    roughness: 0.75,
    metalness: 0.05,
  });

  const clothTactical = new THREE.MeshStandardMaterial({
    map: createZombieClothTexture('tactical'),
    roughness: 0.9,
    metalness: 0.1,
  });
  const clothHazmat = new THREE.MeshStandardMaterial({
    map: createZombieClothTexture('hazmat'),
    roughness: 0.85,
    metalness: 0.15,
  });
  const clothCivilian = new THREE.MeshStandardMaterial({
    map: createZombieClothTexture('civilian'),
    roughness: 0.9,
    metalness: 0.05,
  });
  const clothParamedic = new THREE.MeshStandardMaterial({
    map: createZombieClothTexture('paramedic'),
    roughness: 0.88,
    metalness: 0.1,
  });

  const clothPool = [clothTactical, clothHazmat, clothCivilian, clothParamedic];

  const rustedMetalMat = new THREE.MeshStandardMaterial({
    map: createRustedSteelTexture(),
    roughness: 0.65,
    metalness: 0.75,
  });

  const visceraMat = new THREE.MeshStandardMaterial({
    color: 0x4a0a0a,
    roughness: 0.35,
    metalness: 0.1,
  });

  const eyeMaterials: Record<ZombieType, THREE.MeshBasicMaterial> = {
    walker: new THREE.MeshBasicMaterial({ color: 0xfacc15 }), // Creepy glowing amber
    runner: new THREE.MeshBasicMaterial({ color: 0xef4444 }), // Burning predatory blood red
    spitter: new THREE.MeshBasicMaterial({ color: 0x84cc16 }), // Corrosive biohazard lime
    brute: new THREE.MeshBasicMaterial({ color: 0xf97316 }), // Industrial furnace orange
  };

  const pustuleMat = new THREE.MeshStandardMaterial({
    color: 0xa3e635,
    emissive: 0x4d7c0f,
    emissiveIntensity: 0.8,
    roughness: 0.25,
    metalness: 0.1,
  });

  /**
   * Constructs an anatomically-detailed 3D procedural zombie mesh.
   * Multi-part anatomy: Cranium, jaw, eye sockets, glowing pupils, exposed ribcage,
   * spine column, visceral cavity, jointed upper/lower limbs, claws, tattered clothing.
   */
  function buildZombieMesh(type: ZombieType, scale: number) {
    const root = new THREE.Group();
    root.scale.setScalar(scale);

    const fleshMat = fleshMaterials[type];
    const clothMat =
      type === 'spitter'
        ? clothHazmat
        : type === 'runner'
        ? clothCivilian
        : clothPool[Math.floor(Math.random() * clothPool.length)];
    const eyeMat = eyeMaterials[type];
    const flashMaterials: THREE.MeshStandardMaterial[] = [fleshMat, clothMat];

    // --- 1. TORSO & SKELETAL RIBCAGE ---
    const torsoGroup = new THREE.Group();
    torsoGroup.position.y = 1.15;
    root.add(torsoGroup);

    // Main torso body (tattered shirt / jacket)
    const torsoGeo = new THREE.BoxGeometry(0.56, 0.76, 0.34);
    const torso = new THREE.Mesh(torsoGeo, clothMat);
    torso.castShadow = true;
    torso.receiveShadow = true;
    torsoGroup.add(torso);

    // Open visceral thoracic wound in chest
    const chestCavityGeo = new THREE.BoxGeometry(0.32, 0.44, 0.14);
    const chestCavity = new THREE.Mesh(chestCavityGeo, visceraMat);
    chestCavity.position.set(0.04, 0.05, 0.15);
    torso.add(chestCavity);

    // Anatomical Ribs bridging across the chest cavity (3 pairs)
    for (let r = 0; r < 3; r++) {
      const ribY = 0.14 - r * 0.11;
      // Left rib
      const ribGeoL = new THREE.CylinderGeometry(0.018, 0.022, 0.16, 6);
      const ribMeshL = new THREE.Mesh(ribGeoL, boneMaterial);
      ribMeshL.rotation.z = Math.PI / 3;
      ribMeshL.position.set(-0.08, ribY, 0.2);
      torso.add(ribMeshL);

      // Right rib
      const ribGeoR = new THREE.CylinderGeometry(0.018, 0.022, 0.16, 6);
      const ribMeshR = new THREE.Mesh(ribGeoR, boneMaterial);
      ribMeshR.rotation.z = -Math.PI / 3;
      ribMeshR.position.set(0.12, ribY, 0.2);
      torso.add(ribMeshR);
    }

    // Spine Column along the back (segmented vertebrae)
    for (let s = 0; s < 5; s++) {
      const vertGeo = new THREE.BoxGeometry(0.06, 0.08, 0.05);
      const vert = new THREE.Mesh(vertGeo, boneMaterial);
      vert.position.set(0, 0.22 - s * 0.11, -0.18);
      torso.add(vert);
    }

    // Spitter: Swollen glowing acid pustules along neck and back
    if (type === 'spitter') {
      const pustulePositions = [
        [0.2, 0.32, 0.08, 0.13],
        [-0.18, 0.36, -0.06, 0.16],
        [0.15, 0.18, -0.16, 0.12],
        [-0.08, 0.28, 0.15, 0.1],
      ];
      for (const [px, py, pz, pr] of pustulePositions) {
        const pGeo = new THREE.SphereGeometry(pr, 8, 8);
        const pMesh = new THREE.Mesh(pGeo, pustuleMat);
        pMesh.position.set(px, py, pz);
        torso.add(pMesh);
      }
    }

    // Brute: Heavy welded steel rebar armor strapped to chest & shoulders
    if (type === 'brute') {
      const armorPlateGeo = new THREE.BoxGeometry(0.68, 0.5, 0.06);
      const armorPlate = new THREE.Mesh(armorPlateGeo, rustedMetalMat);
      armorPlate.position.set(0, 0.08, 0.21);
      armorPlate.castShadow = true;
      torso.add(armorPlate);

      // Steel rebar spikes on shoulders
      for (let side of [-1, 1]) {
        const spikeGeo = new THREE.ConeGeometry(0.06, 0.35, 6);
        const spike = new THREE.Mesh(spikeGeo, rustedMetalMat);
        spike.position.set(side * 0.38, 0.42, 0);
        spike.rotation.z = side * -0.4;
        torso.add(spike);
      }
    }

    // Runner: Spine spikes protruding through ripped back flesh
    if (type === 'runner') {
      for (let sp = 0; sp < 4; sp++) {
        const spikeGeo = new THREE.ConeGeometry(0.035, 0.2, 5);
        const spike = new THREE.Mesh(spikeGeo, boneMaterial);
        spike.position.set(0, 0.2 - sp * 0.12, -0.25);
        spike.rotation.x = -Math.PI / 4;
        torso.add(spike);
      }
    }

    // --- 2. HEAD, CRANIUM & JAW ---
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.74, 0.04);
    if (type === 'runner') {
      // Runner hunches head forward
      headGroup.position.set(0, 1.62, 0.18);
      headGroup.rotation.x = 0.25;
    }
    root.add(headGroup);

    // Cranium
    const headGeo = new THREE.BoxGeometry(0.36, 0.38, 0.36);
    const head = new THREE.Mesh(headGeo, fleshMat);
    head.castShadow = true;
    headGroup.add(head);

    // Exposed skull bone on one side of head (scalped necrotic wound)
    const skullPatchGeo = new THREE.BoxGeometry(0.18, 0.18, 0.03);
    const skullPatch = new THREE.Mesh(skullPatchGeo, boneMaterial);
    skullPatch.position.set(-0.1, 0.12, 0.17);
    head.add(skullPatch);

    // Sunken dark eye sockets
    const socketGeo = new THREE.BoxGeometry(0.09, 0.09, 0.05);
    const socketMat = new THREE.MeshBasicMaterial({ color: 0x050507 });

    const leftSocket = new THREE.Mesh(socketGeo, socketMat);
    leftSocket.position.set(-0.09, 0.06, 0.18);
    head.add(leftSocket);

    const rightSocket = new THREE.Mesh(socketGeo, socketMat);
    rightSocket.position.set(0.09, 0.06, 0.18);
    head.add(rightSocket);

    // Glowing menacing pupils
    const eyeGeo = new THREE.SphereGeometry(0.035, 8, 8);
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.09, 0.06, 0.195);
    head.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.09, 0.06, 0.195);
    head.add(rightEye);

    // Articulated snarling open lower jaw
    const jawGeo = new THREE.BoxGeometry(0.24, 0.12, 0.18);
    const jaw = new THREE.Mesh(jawGeo, fleshMat);
    jaw.position.set(0, -0.16, 0.14);
    jaw.rotation.x = 0.35; // Drooping open jaw
    head.add(jaw);

    // Sharp jagged teeth row inside mouth
    for (let t = -2; t <= 2; t++) {
      const toothGeo = new THREE.ConeGeometry(0.012, 0.045, 4);
      const tooth = new THREE.Mesh(toothGeo, boneMaterial);
      tooth.position.set(t * 0.04, 0.04, 0.07);
      jaw.add(tooth);
    }

    // Gory bloody oral cavity
    const mouthInteriorGeo = new THREE.BoxGeometry(0.18, 0.08, 0.12);
    const mouthInterior = new THREE.Mesh(mouthInteriorGeo, visceraMat);
    mouthInterior.position.set(0, -0.08, 0.15);
    head.add(mouthInterior);

    // --- 3. ARMS & CLAWED HANDS ---
    const leftArmGroup = new THREE.Group();
    leftArmGroup.position.set(-0.38, 1.48, 0);
    root.add(leftArmGroup);

    const rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(0.38, 1.48, 0);
    root.add(rightArmGroup);

    // Left Arm (Upper + Forearm + Claw)
    const upperArmGeo = new THREE.CylinderGeometry(0.07, 0.06, 0.36, 6);
    const upperArmL = new THREE.Mesh(upperArmGeo, clothMat);
    upperArmL.position.y = -0.18;
    upperArmL.castShadow = true;
    leftArmGroup.add(upperArmL);

    const forearmGeo = new THREE.CylinderGeometry(0.06, 0.05, 0.36, 6);
    const forearmL = new THREE.Mesh(forearmGeo, fleshMat);
    forearmL.position.set(0, -0.48, 0.08);
    forearmL.rotation.x = -0.3;
    forearmL.castShadow = true;
    leftArmGroup.add(forearmL);

    // Left Clawed Hand with extended skeletal fingers
    const palmGeo = new THREE.BoxGeometry(0.1, 0.06, 0.12);
    const palmL = new THREE.Mesh(palmGeo, fleshMat);
    palmL.position.set(0, -0.68, 0.18);
    leftArmGroup.add(palmL);

    for (let f = -1; f <= 1; f++) {
      const fingerGeo = new THREE.ConeGeometry(0.015, 0.1, 4);
      const finger = new THREE.Mesh(fingerGeo, boneMaterial);
      finger.position.set(f * 0.035, -0.04, 0.08);
      finger.rotation.x = Math.PI / 2 + 0.2;
      palmL.add(finger);
    }

    // Right Arm (Asymmetric: Exposed Skeletal Radius/Ulna or Industrial Graft)
    if (type === 'brute') {
      // Brute has heavy welded rebar club / cybernetic gauntlet
      const clubGeo = new THREE.CylinderGeometry(0.12, 0.16, 0.85, 8);
      const club = new THREE.Mesh(clubGeo, rustedMetalMat);
      club.position.set(0, -0.45, 0.15);
      club.castShadow = true;
      rightArmGroup.add(club);

      // Spikes on club
      for (let sp = 0; sp < 6; sp++) {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.18, 5), rustedMetalMat);
        spike.position.set((Math.random() - 0.5) * 0.2, -0.2 - sp * 0.08, 0.15 + (Math.random() - 0.5) * 0.2);
        spike.rotation.z = (Math.random() - 0.5) * Math.PI;
        rightArmGroup.add(spike);
      }
    } else {
      // Normal zombie right arm with partly exposed bone
      const upperArmR = new THREE.Mesh(upperArmGeo, clothMat);
      upperArmR.position.y = -0.18;
      upperArmR.castShadow = true;
      rightArmGroup.add(upperArmR);

      // Skeletal ulna/radius bone forearm
      const boneForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.025, 0.38, 6), boneMaterial);
      boneForearm.position.set(0, -0.48, 0.08);
      boneForearm.rotation.x = -0.3;
      boneForearm.castShadow = true;
      rightArmGroup.add(boneForearm);

      // Right claw
      const palmR = new THREE.Mesh(palmGeo, fleshMat);
      palmR.position.set(0, -0.68, 0.18);
      rightArmGroup.add(palmR);

      for (let f = -1; f <= 1; f++) {
        const finger = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.11, 4), boneMaterial);
        finger.position.set(f * 0.035, -0.04, 0.08);
        finger.rotation.x = Math.PI / 2 + 0.2;
        palmR.add(finger);
      }
    }

    // Default Reaching / Threatening Posture
    leftArmGroup.rotation.x = -1.15;
    rightArmGroup.rotation.x = -1.15;

    // --- 4. LEGS, KNEES & COMBAT BOOTS ---
    const legThighGeo = new THREE.CylinderGeometry(0.1, 0.085, 0.42, 6);
    const legCalfGeo = new THREE.CylinderGeometry(0.08, 0.07, 0.42, 6);
    const bootGeo = new THREE.BoxGeometry(0.16, 0.16, 0.28);
    const bootMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.8 });

    // Left Leg
    const leftLegGroup = new THREE.Group();
    leftLegGroup.position.set(-0.18, 0.8, 0);
    root.add(leftLegGroup);

    const thighL = new THREE.Mesh(legThighGeo, clothMat);
    thighL.position.y = -0.21;
    thighL.castShadow = true;
    leftLegGroup.add(thighL);

    // Bloody exposed knee joint
    const kneeL = new THREE.Mesh(new THREE.SphereGeometry(0.075, 6, 6), visceraMat);
    kneeL.position.set(0, -0.42, 0.02);
    leftLegGroup.add(kneeL);

    const calfL = new THREE.Mesh(legCalfGeo, clothMat);
    calfL.position.y = -0.62;
    calfL.castShadow = true;
    leftLegGroup.add(calfL);

    const bootL = new THREE.Mesh(bootGeo, bootMat);
    bootL.position.set(0, -0.84, 0.04);
    bootL.castShadow = true;
    leftLegGroup.add(bootL);

    // Right Leg
    const rightLegGroup = new THREE.Group();
    rightLegGroup.position.set(0.18, 0.8, 0);
    root.add(rightLegGroup);

    const thighR = new THREE.Mesh(legThighGeo, clothMat);
    thighR.position.y = -0.21;
    thighR.castShadow = true;
    rightLegGroup.add(thighR);

    const kneeR = new THREE.Mesh(new THREE.SphereGeometry(0.075, 6, 6), visceraMat);
    kneeR.position.set(0, -0.42, 0.02);
    rightLegGroup.add(kneeR);

    const calfR = new THREE.Mesh(legCalfGeo, clothMat);
    calfR.position.y = -0.62;
    calfR.castShadow = true;
    rightLegGroup.add(calfR);

    const bootR = new THREE.Mesh(bootGeo, bootMat);
    bootR.position.set(0, -0.84, 0.04);
    bootR.castShadow = true;
    rightLegGroup.add(bootR);

    // Contact shadow beneath zombie
    const shadowGeo = new THREE.CircleGeometry(0.55 * scale, 12);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = 0.02;
    root.add(shadowMesh);

    return {
      root,
      head,
      torso,
      leftArmGroup,
      rightArmGroup,
      leftLegGroup,
      rightLegGroup,
      flashMaterials,
    };
  }

  function spawnZombie(type: ZombieType, x: number, z: number, wave: number): ZombieInstance {
    const template = ZOMBIE_TEMPLATES[type];
    const scaledHp = getScaledZombieHp(template.hp, wave);
    const { root, head, torso, leftArmGroup, rightArmGroup, leftLegGroup, rightLegGroup, flashMaterials } =
      buildZombieMesh(type, template.scale);

    root.position.set(x, 0, z);
    parentGroup.add(root);

    const instance: ZombieInstance = {
      id: zombieIdCounter++,
      type,
      stats: template,
      mesh: root,
      headMesh: head,
      bodyMesh: torso,
      leftArm: leftArmGroup,
      rightArm: rightArmGroup,
      leftLeg: leftLegGroup,
      rightLeg: rightLegGroup,
      position: root.position,
      velocity: new THREE.Vector3(),
      rotationY: 0,
      hp: scaledHp,
      maxHp: scaledHp,
      isTelegraphing: false,
      telegraphTimer: 0,
      attackCooldown: 1.0,
      isDying: false,
      deathTimer: 0,
      hitFlashTimer: 0,
      walkPhase: Math.random() * Math.PI * 2,
      headPositionWorld: new THREE.Vector3(),
      centerPositionWorld: new THREE.Vector3(),
      flashMaterials,
    };

    zombies.push(instance);
    return instance;
  }

  function removeZombie(id: number) {
    const idx = zombies.findIndex((z) => z.id === id);
    if (idx !== -1) {
      const z = zombies[idx];
      parentGroup.remove(z.mesh);
      zombies.splice(idx, 1);
    }
  }

  function clearAll() {
    for (const z of zombies) {
      parentGroup.remove(z.mesh);
    }
    zombies.length = 0;
  }

  function update(
    dt: number,
    playerPos: THREE.Vector3,
    onPlayerDamage: (amount: number) => void,
    onAcidSpit: (from: THREE.Vector3, dir: THREE.Vector3) => void
  ) {
    for (let i = zombies.length - 1; i >= 0; i--) {
      const z = zombies[i];

      // Handle dying animation
      if (z.isDying) {
        z.deathTimer += dt;
        // Violent backward ragdoll collapse
        z.mesh.rotation.x = THREE.MathUtils.damp(z.mesh.rotation.x, Math.PI / 2, 8, dt);
        z.mesh.position.y = Math.max(0, z.mesh.position.y - dt * 1.5);
        // Fade & sink
        if (z.deathTimer > 0.45) {
          const fade = Math.max(0, 1 - (z.deathTimer - 0.45) / 0.45);
          z.mesh.scale.setScalar(z.stats.scale * fade);
        }
        if (z.deathTimer >= 0.9) {
          parentGroup.remove(z.mesh);
          zombies.splice(i, 1);
        }
        continue;
      }

      // Hit flash visual recovery
      if (z.hitFlashTimer > 0) {
        z.hitFlashTimer -= dt;
        if (z.hitFlashTimer <= 0) {
          for (const mat of z.flashMaterials) {
            mat.emissive.setHex(0x000000);
          }
        }
      }

      // Distance and angle to player
      const dx = playerPos.x - z.position.x;
      const dz = playerPos.z - z.position.z;
      const dist = Math.hypot(dx, dz);

      // Rotate toward player
      const targetAngle = Math.atan2(dx, dz);
      z.rotationY = targetAngle;
      z.mesh.rotation.y = targetAngle;

      // Update world positions for hit detection
      z.headMesh.getWorldPosition(z.headPositionWorld);
      z.bodyMesh.getWorldPosition(z.centerPositionWorld);

      // Attack cooldown
      if (z.attackCooldown > 0) {
        z.attackCooldown -= dt;
      }

      // AI Decision logic based on archetype
      if (z.type === 'spitter') {
        // Spitter keeps medium distance (10-14m)
        if (dist > 14) {
          const moveSpeed = z.stats.speed;
          z.position.x += (dx / dist) * moveSpeed * dt;
          z.position.z += (dz / dist) * moveSpeed * dt;
          z.walkPhase += dt * 6;
        } else if (dist < 8) {
          const moveSpeed = z.stats.speed * 0.7;
          z.position.x -= (dx / dist) * moveSpeed * dt;
          z.position.z -= (dz / dist) * moveSpeed * dt;
          z.walkPhase += dt * 6;
        }

        // Ranged spit attack
        if (dist <= z.stats.attackRange && z.attackCooldown <= 0) {
          if (!z.isTelegraphing) {
            z.isTelegraphing = true;
            z.telegraphTimer = 0.6; // 600ms windup
            for (const mat of z.flashMaterials) {
              mat.emissive.setHex(0x84cc16);
            }
          } else {
            z.telegraphTimer -= dt;
            if (z.telegraphTimer <= 0) {
              z.isTelegraphing = false;
              z.attackCooldown = z.stats.attackCooldown;
              for (const mat of z.flashMaterials) {
                mat.emissive.setHex(0x000000);
              }

              // Launch projectile
              const from = z.headPositionWorld.clone();
              const dir = playerPos.clone().sub(from).normalize();
              onAcidSpit(from, dir);
            }
          }
        }
      } else {
        // Melee types (Walker, Runner, Brute)
        if (dist > z.stats.attackRange * 0.85) {
          const moveSpeed = z.stats.speed;
          z.position.x += (dx / dist) * moveSpeed * dt;
          z.position.z += (dz / dist) * moveSpeed * dt;
          z.walkPhase += dt * (z.type === 'runner' ? 14 : 7);
        }

        // Melee attack range
        if (dist <= z.stats.attackRange && z.attackCooldown <= 0) {
          if (z.type === 'brute') {
            if (!z.isTelegraphing) {
              z.isTelegraphing = true;
              z.telegraphTimer = 0.5;
              z.leftArm.rotation.x = -2.2;
              z.rightArm.rotation.x = -2.2;
            } else {
              z.telegraphTimer -= dt;
              if (z.telegraphTimer <= 0) {
                z.isTelegraphing = false;
                z.attackCooldown = z.stats.attackCooldown;
                onPlayerDamage(z.stats.damage);
              }
            }
          } else {
            z.attackCooldown = z.stats.attackCooldown;
            onPlayerDamage(z.stats.damage);
            z.leftArm.rotation.x = -0.3;
            z.rightArm.rotation.x = -0.3;
          }
        }
      }

      // Dynamic gait animation (natural limp & torso sway)
      const swing = Math.sin(z.walkPhase);
      z.leftLeg.rotation.x = swing * 0.6;
      z.rightLeg.rotation.x = -swing * 0.6;
      if (!z.isTelegraphing) {
        z.leftArm.rotation.x = -1.15 + swing * 0.35;
        z.rightArm.rotation.x = -1.15 - swing * 0.35;
      }
      // Subtle torso bob
      z.bodyMesh.position.y = Math.abs(Math.sin(z.walkPhase * 2)) * 0.04;
    }
  }

  return {
    zombies,
    spawnZombie,
    removeZombie,
    clearAll,
    update,
  };
}
