import * as THREE from 'three';
import {
  createAsphaltTexture,
  createBuildingFacadeTexture,
  createBarricadeTexture,
} from './textures';

export interface ObstacleBox {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface CityEnvironment {
  group: THREE.Group;
  obstacles: ObstacleBox[];
  burningBarrels: { light: THREE.PointLight; baseY: number; baseIntensity: number }[];
  update: (time: number) => void;
  dispose: () => void;
}

export function buildCityEnvironment(scene: THREE.Scene): CityEnvironment {
  const cityGroup = new THREE.Group();
  scene.add(cityGroup);

  const obstacles: ObstacleBox[] = [];
  const burningBarrels: { light: THREE.PointLight; baseY: number; baseIntensity: number }[] = [];

  // Reusable materials & geometries
  const asphaltTex = createAsphaltTexture();
  asphaltTex.repeat.set(16, 16);
  const groundMat = new THREE.MeshStandardMaterial({
    map: asphaltTex,
    color: 0xffffff,
    roughness: 0.8,
    metalness: 0.05,
  });

  // Vast Ground Plane extending beyond playable radius (160x160m)
  const groundGeo = new THREE.PlaneGeometry(160, 160);
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  cityGroup.add(ground);

  // Sidewalk concrete material
  const sidewalkMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    roughness: 0.8,
    metalness: 0.05,
  });

  // Building textures
  const bldgTex1 = createBuildingFacadeTexture(0);
  bldgTex1.repeat.set(2, 4);
  const bldgMat1 = new THREE.MeshStandardMaterial({
    map: bldgTex1,
    color: 0xffffff,
    roughness: 0.7,
    metalness: 0.05,
  });

  const bldgTex2 = createBuildingFacadeTexture(1);
  bldgTex2.repeat.set(2, 5);
  const bldgMat2 = new THREE.MeshStandardMaterial({
    map: bldgTex2,
    color: 0xffffff,
    roughness: 0.7,
    metalness: 0.05,
  });

  const bldgTex3 = createBuildingFacadeTexture(2);
  bldgTex3.repeat.set(3, 6);
  const bldgMat3 = new THREE.MeshStandardMaterial({
    map: bldgTex3,
    color: 0xffffff,
    roughness: 0.7,
    metalness: 0.05,
  });

  const bldgMats = [bldgMat1, bldgMat2, bldgMat3];

  // Helper to add a composite building (Group with main tower, roof structure, antennae, fire escapes)
  function createCompositeBuilding(
    x: number,
    z: number,
    width: number,
    depth: number,
    height: number,
    matIdx: number
  ) {
    const bGroup = new THREE.Group();
    bGroup.position.set(x, 0, z);

    // Primary silhouette (Main tower)
    const mainGeo = new THREE.BoxGeometry(width, height, depth);
    const mainMesh = new THREE.Mesh(mainGeo, bldgMats[matIdx % bldgMats.length]);
    mainMesh.position.y = height / 2;
    mainMesh.castShadow = true;
    mainMesh.receiveShadow = true;
    bGroup.add(mainMesh);

    // Secondary read (Roof parapet / HVAC box)
    const roofWidth = width * 0.55;
    const roofDepth = depth * 0.55;
    const roofHeight = 4.0;
    const roofGeo = new THREE.BoxGeometry(roofWidth, roofHeight, roofDepth);
    const roofMat = new THREE.MeshStandardMaterial({
      color: 0x1f2229,
      roughness: 0.6,
      metalness: 0.4,
    });
    const roofMesh = new THREE.Mesh(roofGeo, roofMat);
    roofMesh.position.y = height + roofHeight / 2;
    roofMesh.castShadow = true;
    bGroup.add(roofMesh);

    // Accent detail (Radio tower antenna)
    const antennaGeo = new THREE.CylinderGeometry(0.12, 0.35, 12, 6);
    const antennaMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.8,
      roughness: 0.2,
    });
    const antenna = new THREE.Mesh(antennaGeo, antennaMat);
    antenna.position.set(0, height + roofHeight + 6, 0);
    bGroup.add(antenna);

    // Red warning light beacon atop antenna
    const beaconGeo = new THREE.SphereGeometry(0.3, 8, 8);
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
    beacon.position.set(0, height + roofHeight + 12, 0);
    bGroup.add(beacon);

    cityGroup.add(bGroup);

    // Register collidable obstacle
    obstacles.push({
      minX: x - width / 2 - 0.5,
      maxX: x + width / 2 + 0.5,
      minZ: z - depth / 2 - 0.5,
      maxZ: z + depth / 2 + 0.5,
    });
  }

  // --- PERIMETER & BACKGROUND SKYSCRAPERS ---
  // North Block
  createCompositeBuilding(-35, -55, 26, 22, 54, 0);
  createCompositeBuilding(0, -58, 32, 24, 68, 1);
  createCompositeBuilding(35, -55, 26, 22, 48, 2);

  // South Block
  createCompositeBuilding(-35, 55, 28, 22, 58, 1);
  createCompositeBuilding(0, 58, 30, 24, 62, 0);
  createCompositeBuilding(35, 55, 26, 22, 52, 2);

  // West Block
  createCompositeBuilding(-58, -25, 22, 30, 60, 2);
  createCompositeBuilding(-58, 25, 22, 30, 56, 0);

  // East Block
  createCompositeBuilding(58, -25, 22, 30, 64, 0);
  createCompositeBuilding(58, 25, 22, 30, 58, 1);

  // Distant mega silhouettes for scale and horizon depth
  const megaSilhouettes = [
    { x: -80, z: -80, w: 40, d: 40, h: 95 },
    { x: 80, z: -85, w: 45, d: 40, h: 110 },
    { x: -85, z: 85, w: 42, d: 42, h: 88 },
    { x: 85, z: 80, w: 38, d: 38, h: 102 },
  ];
  megaSilhouettes.forEach((m, idx) => {
    createCompositeBuilding(m.x, m.z, m.w, m.d, m.h, idx);
  });

  // --- STREET CORRIDORS & SIDEWALKS ---
  // Raised sidewalk slabs
  const swGeo1 = new THREE.BoxGeometry(70, 0.35, 8);
  const sw1 = new THREE.Mesh(swGeo1, sidewalkMat);
  sw1.position.set(0, 0.175, -28);
  sw1.receiveShadow = true;
  cityGroup.add(sw1);

  const sw2 = new THREE.Mesh(swGeo1, sidewalkMat);
  sw2.position.set(0, 0.175, 28);
  sw2.receiveShadow = true;
  cityGroup.add(sw2);

  const swGeo2 = new THREE.BoxGeometry(8, 0.35, 70);
  const sw3 = new THREE.Mesh(swGeo2, sidewalkMat);
  sw3.position.set(-28, 0.175, 0);
  sw3.receiveShadow = true;
  cityGroup.add(sw3);

  const sw4 = new THREE.Mesh(swGeo2, sidewalkMat);
  sw4.position.set(28, 0.175, 0);
  sw4.receiveShadow = true;
  cityGroup.add(sw4);

  // --- BARRICADES & TACTICAL COVER (Composite props) ---
  const barricadeTex = createBarricadeTexture();
  const barricadeMat = new THREE.MeshStandardMaterial({
    map: barricadeTex,
    roughness: 0.8,
    metalness: 0.1,
  });

  function createBarricade(x: number, z: number, rotY: number) {
    const bGroup = new THREE.Group();
    bGroup.position.set(x, 0, z);
    bGroup.rotation.y = rotY;

    // Concrete barrier
    const barGeo = new THREE.BoxGeometry(3.6, 1.2, 0.7);
    const barMesh = new THREE.Mesh(barGeo, barricadeMat);
    barMesh.position.y = 0.6;
    barMesh.castShadow = true;
    barMesh.receiveShadow = true;
    bGroup.add(barMesh);

    // Rebar / metal top rail
    const railGeo = new THREE.CylinderGeometry(0.04, 0.04, 3.8, 6);
    const railMat = new THREE.MeshStandardMaterial({ color: 0x27272a, metalness: 0.8, roughness: 0.3 });
    const rail = new THREE.Mesh(railGeo, railMat);
    rail.rotation.z = Math.PI / 2;
    rail.position.y = 1.25;
    bGroup.add(rail);

    cityGroup.add(bGroup);

    // Box bounds
    const isRot = Math.abs(rotY) > 0.7 && Math.abs(rotY) < 2.4;
    const hw = isRot ? 0.7 : 2.0;
    const hd = isRot ? 2.0 : 0.7;
    obstacles.push({
      minX: x - hw,
      maxX: x + hw,
      minZ: z - hd,
      maxZ: z + hd,
    });
  }

  // Tactical barricade positions around central crossroad
  createBarricade(0, -16, 0); // Directly ahead landmark
  createBarricade(-12, -10, 0.3);
  createBarricade(14, -12, -0.2);
  createBarricade(-10, 14, 1.5);
  createBarricade(12, 10, -1.2);
  createBarricade(-20, 0, 1.57);
  createBarricade(20, 0, 1.57);

  // --- ABANDONED / DESTROYED CARS (Composite 6-part vehicle models) ---
  function createWreckedCar(x: number, z: number, rotY: number, colorHex: number) {
    const carGroup = new THREE.Group();
    carGroup.position.set(x, 0, z);
    carGroup.rotation.y = rotY;

    const bodyMat = new THREE.MeshStandardMaterial({
      color: colorHex,
      roughness: 0.7,
      metalness: 0.4,
    });
    const rustMat = new THREE.MeshStandardMaterial({
      color: 0x3e2723,
      roughness: 0.95,
      metalness: 0.1,
    });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.15,
      metalness: 0.6,
    });
    const tireMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.9,
    });

    // Lower chassis
    const chassisGeo = new THREE.BoxGeometry(2.1, 0.65, 4.4);
    const chassis = new THREE.Mesh(chassisGeo, bodyMat);
    chassis.position.y = 0.55;
    chassis.castShadow = true;
    chassis.receiveShadow = true;
    carGroup.add(chassis);

    // Cabin / Roof
    const cabinGeo = new THREE.BoxGeometry(1.8, 0.6, 2.3);
    const cabin = new THREE.Mesh(cabinGeo, glassMat);
    cabin.position.set(0, 1.05, -0.2);
    cabin.castShadow = true;
    carGroup.add(cabin);

    // Smashed Hood dent
    const hoodGeo = new THREE.BoxGeometry(1.9, 0.2, 1.2);
    const hood = new THREE.Mesh(hoodGeo, rustMat);
    hood.position.set(0, 0.85, 1.2);
    hood.rotation.x = 0.12;
    carGroup.add(hood);

    // 4 Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.28, 12);
    const wheelPositions = [
      [-1.05, 0.36, 1.3],
      [1.05, 0.36, 1.3],
      [-1.05, 0.36, -1.3],
      [1.05, 0.36, -1.3],
    ];
    wheelPositions.forEach(([wx, wy, wz]) => {
      const wheel = new THREE.Mesh(wheelGeo, tireMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, wy, wz);
      carGroup.add(wheel);
    });

    cityGroup.add(carGroup);

    obstacles.push({
      minX: x - 1.5,
      maxX: x + 1.5,
      minZ: z - 2.5,
      maxZ: z + 2.5,
    });
  }

  // Wrecked cars in street
  createWreckedCar(-7, 6, 0.45, 0xd97706); // Amber Taxi
  createWreckedCar(8, -5, -0.6, 0x0284c7); // Blue Sedan
  createWreckedCar(-16, -20, 1.3, 0x475569); // Dark Police Cruiser
  createWreckedCar(18, 22, -1.1, 0xb91c1c); // Red Wreck

  // --- BURNING OIL BARRELS (Atmospheric fire point lights & glow) ---
  function createBurningBarrel(x: number, z: number) {
    const barrelGroup = new THREE.Group();
    barrelGroup.position.set(x, 0, z);

    // Drum cylinder
    const drumGeo = new THREE.CylinderGeometry(0.5, 0.5, 1.3, 14);
    const drumMat = new THREE.MeshStandardMaterial({
      color: 0x52525b,
      roughness: 0.65,
      metalness: 0.5,
    });
    const drum = new THREE.Mesh(drumGeo, drumMat);
    drum.position.y = 0.65;
    drum.castShadow = true;
    barrelGroup.add(drum);

    // Glowing fire core inside top
    const fireCoreGeo = new THREE.SphereGeometry(0.35, 8, 8);
    const fireCoreMat = new THREE.MeshBasicMaterial({ color: 0xff6600 });
    const fireCore = new THREE.Mesh(fireCoreGeo, fireCoreMat);
    fireCore.position.y = 1.35;
    barrelGroup.add(fireCore);

    // Flickering fire point light
    const fireLight = new THREE.PointLight(0xff5511, 2.8, 18, 1.5);
    fireLight.position.set(0, 1.6, 0);
    barrelGroup.add(fireLight);

    cityGroup.add(barrelGroup);

    burningBarrels.push({
      light: fireLight,
      baseY: 1.6,
      baseIntensity: 2.8,
    });

    obstacles.push({
      minX: x - 0.7,
      maxX: x + 0.7,
      minZ: z - 0.7,
      maxZ: z + 0.7,
    });
  }

  createBurningBarrel(-6, -14);
  createBurningBarrel(14, 14);
  createBurningBarrel(-18, 16);
  createBurningBarrel(22, -16);

  // --- STREET LIGHTS & OVERHEAD DEBRIS ---
  function createStreetLamp(x: number, z: number, rotY: number) {
    const lampGroup = new THREE.Group();
    lampGroup.position.set(x, 0, z);
    lampGroup.rotation.y = rotY;

    // Pole
    const poleGeo = new THREE.CylinderGeometry(0.12, 0.16, 6.5, 8);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x27272a, metalness: 0.8, roughness: 0.3 });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.y = 3.25;
    lampGroup.add(pole);

    // Horizontal arm
    const armGeo = new THREE.BoxGeometry(1.6, 0.12, 0.12);
    const arm = new THREE.Mesh(armGeo, poleMat);
    arm.position.set(0.8, 6.4, 0);
    lampGroup.add(arm);

    // Broken hanging fixture
    const fixtureGeo = new THREE.BoxGeometry(0.4, 0.25, 0.3);
    const fixtureMat = new THREE.MeshStandardMaterial({ color: 0x18181b });
    const fixture = new THREE.Mesh(fixtureGeo, fixtureMat);
    fixture.position.set(1.5, 6.2, 0);
    fixture.rotation.z = -0.2; // Dangling
    lampGroup.add(fixture);

    cityGroup.add(lampGroup);

    obstacles.push({
      minX: x - 0.4,
      maxX: x + 0.4,
      minZ: z - 0.4,
      maxZ: z + 0.4,
    });
  }

  createStreetLamp(-14, -8, 0);
  createStreetLamp(14, -8, Math.PI);
  createStreetLamp(-14, 8, 0);
  createStreetLamp(14, 8, Math.PI);

  // Play area boundary walls (collapsed highway overpass chunks)
  // Bounds player to approximately [-45, 45] x [-45, 45]
  const boundaryBarrierGeo = new THREE.BoxGeometry(90, 4.5, 3.0);
  const boundaryBarrierMat = new THREE.MeshStandardMaterial({
    color: 0x1f2329,
    roughness: 0.9,
    metalness: 0.1,
  });

  const bNorth = new THREE.Mesh(boundaryBarrierGeo, boundaryBarrierMat);
  bNorth.position.set(0, 2.25, -45);
  cityGroup.add(bNorth);
  obstacles.push({ minX: -45, maxX: 45, minZ: -47, maxZ: -43 });

  const bSouth = new THREE.Mesh(boundaryBarrierGeo, boundaryBarrierMat);
  bSouth.position.set(0, 2.25, 45);
  cityGroup.add(bSouth);
  obstacles.push({ minX: -45, maxX: 45, minZ: 43, maxZ: 47 });

  const bWest = new THREE.Mesh(boundaryBarrierGeo, boundaryBarrierMat);
  bWest.rotation.y = Math.PI / 2;
  bWest.position.set(-45, 2.25, 0);
  cityGroup.add(bWest);
  obstacles.push({ minX: -47, maxX: -43, minZ: -45, maxZ: 45 });

  const bEast = new THREE.Mesh(boundaryBarrierGeo, boundaryBarrierMat);
  bEast.rotation.y = Math.PI / 2;
  bEast.position.set(45, 2.25, 0);
  cityGroup.add(bEast);
  obstacles.push({ minX: 43, maxX: 47, minZ: -45, maxZ: 45 });

  function update(time: number) {
    // Subtle fire flicker for burning barrels
    for (let i = 0; i < burningBarrels.length; i++) {
      const b = burningBarrels[i];
      const flicker = Math.sin(time * 12 + i * 2.3) * 0.4 + Math.cos(time * 19 + i * 1.7) * 0.2;
      b.light.intensity = b.baseIntensity + flicker;
      b.light.position.y = b.baseY + Math.sin(time * 8 + i) * 0.05;
    }
  }

  function dispose() {
    scene.remove(cityGroup);
    groundGeo.dispose();
    groundMat.dispose();
    asphaltTex.dispose();
    bldgTex1.dispose();
    bldgTex2.dispose();
    bldgTex3.dispose();
    barricadeTex.dispose();
    bldgMats.forEach((m) => m.dispose());
  }

  return {
    group: cityGroup,
    obstacles,
    burningBarrels,
    update,
    dispose,
  };
}
