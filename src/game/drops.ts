import * as THREE from 'three';
import { DropType } from './types';
import { createCrateTexture } from './textures';

export interface DropInstance {
  id: number;
  type: DropType;
  mesh: THREE.Group;
  light: THREE.PointLight;
  position: THREE.Vector3;
  duration: number;
  maxDuration: number;
}

export interface SupplyDropManager {
  drops: DropInstance[];
  spawnDrop: (type: DropType, x: number, z: number) => DropInstance;
  checkPickup: (playerPos: THREE.Vector3, radius?: number) => DropInstance | null;
  clearAll: () => void;
  update: (dt: number) => void;
  dispose: () => void;
}

let dropIdCounter = 1;

export function createSupplyDropManager(scene: THREE.Scene): SupplyDropManager {
  const drops: DropInstance[] = [];
  const parentGroup = new THREE.Group();
  scene.add(parentGroup);

  const dropColors: Record<DropType, { hex: number; str: string; label: string }> = {
    ammo: { hex: 0x38bdf8, str: '#38bdf8', label: 'AMMO' },
    medkit: { hex: 0x22c55e, str: '#22c55e', label: 'MEDKIT' },
    quad_damage: { hex: 0xf59e0b, str: '#f59e0b', label: 'QUAD' },
    speed_boost: { hex: 0xa855f7, str: '#a855f7', label: 'SPEED' },
  };

  function spawnDrop(type: DropType, x: number, z: number): DropInstance {
    const config = dropColors[type];
    const group = new THREE.Group();
    group.position.set(x, 0.7, z);

    // Crate box with procedural canvas texture
    const tex = createCrateTexture(config.label, config.str);
    const boxMat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.5,
      metalness: 0.6,
      emissive: config.hex,
      emissiveIntensity: 0.15,
    });
    const boxGeo = new THREE.BoxGeometry(0.7, 0.7, 0.7);
    const boxMesh = new THREE.Mesh(boxGeo, boxMat);
    boxMesh.castShadow = true;
    group.add(boxMesh);

    // Vertical beacon beam
    const beamGeo = new THREE.CylinderGeometry(0.04, 0.12, 5.0, 8);
    const beamMat = new THREE.MeshBasicMaterial({
      color: config.hex,
      transparent: true,
      opacity: 0.35,
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.y = 2.5;
    group.add(beam);

    // Glowing point light
    const pointLight = new THREE.PointLight(config.hex, 2.2, 8);
    pointLight.position.y = 0.5;
    group.add(pointLight);

    // Contact shadow
    const shadowGeo = new THREE.CircleGeometry(0.45, 12);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
    });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -0.68;
    group.add(shadow);

    parentGroup.add(group);

    const instance: DropInstance = {
      id: dropIdCounter++,
      type,
      mesh: group,
      light: pointLight,
      position: group.position,
      duration: 35, // 35 seconds to despawn
      maxDuration: 35,
    };

    drops.push(instance);
    return instance;
  }

  function checkPickup(playerPos: THREE.Vector3, radius: number = 1.8): DropInstance | null {
    for (let i = drops.length - 1; i >= 0; i--) {
      const drop = drops[i];
      const dist = Math.hypot(playerPos.x - drop.position.x, playerPos.z - drop.position.z);
      if (dist < radius) {
        parentGroup.remove(drop.mesh);
        drops.splice(i, 1);
        return drop;
      }
    }
    return null;
  }

  function clearAll() {
    for (const d of drops) {
      parentGroup.remove(d.mesh);
    }
    drops.length = 0;
  }

  function update(dt: number) {
    const time = performance.now() * 0.001;
    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i];
      d.duration -= dt;

      // Despawn on timer
      if (d.duration <= 0) {
        parentGroup.remove(d.mesh);
        drops.splice(i, 1);
        continue;
      }

      // Rotate and float up/down
      d.mesh.rotation.y += dt * 1.5;
      d.mesh.position.y = 0.7 + Math.sin(time * 3 + d.id) * 0.12;

      // Blink when close to expiring
      if (d.duration < 6) {
        d.mesh.visible = Math.floor(d.duration * 5) % 2 === 0;
      }
    }
  }

  function dispose() {
    clearAll();
    scene.remove(parentGroup);
  }

  return {
    drops,
    spawnDrop,
    checkPickup,
    clearAll,
    update,
    dispose,
  };
}
