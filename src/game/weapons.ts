import * as THREE from 'three';
import { WeaponId } from './types';
import { WEAPON_CONFIGS } from './rules';

export interface WeaponRig {
  root: THREE.Group;
  weaponGroups: Record<WeaponId, THREE.Group>;
  muzzlePoints: Record<WeaponId, THREE.Vector3>;
  muzzleFlash: THREE.Mesh;
  muzzleLight: THREE.PointLight;
  currentWeapon: WeaponId;
  recoil: number;
  recoilYaw: number;
  bobPhase: number;
  adsProgress: number; // 0 = hip, 1 = ADS
  isReloading: boolean;
  reloadProgress: number; // 0 to 1
  switchWeapon: (id: WeaponId) => void;
  triggerShootAnimation: (id: WeaponId) => void;
  update: (dt: number, isMoving: boolean, isADS: boolean) => void;
}

export function createWeaponRig(camera: THREE.Camera): WeaponRig {
  const root = new THREE.Group();
  camera.add(root);

  // Position relative to camera (right side hipfire)
  const defaultHipPos = new THREE.Vector3(0.24, -0.22, -0.48);
  const adsPos = new THREE.Vector3(0.0, -0.15, -0.36);

  root.position.copy(defaultHipPos);

  const weaponGroups: Record<WeaponId, THREE.Group> = {
    pistol: new THREE.Group(),
    shotgun: new THREE.Group(),
    rifle: new THREE.Group(),
    magnum: new THREE.Group(),
  };

  const muzzlePoints: Record<WeaponId, THREE.Vector3> = {
    pistol: new THREE.Vector3(0, 0.04, -0.32),
    shotgun: new THREE.Vector3(0, 0.05, -0.65),
    rifle: new THREE.Vector3(0, 0.06, -0.72),
    magnum: new THREE.Vector3(0, 0.07, -0.48),
  };

  // Materials
  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    metalness: 0.25,
    roughness: 0.45,
  });
  const gunGripMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.1,
    roughness: 0.85,
  });
  const silverSteelMat = new THREE.MeshStandardMaterial({
    color: 0xd1d5db,
    metalness: 0.35,
    roughness: 0.3,
  });
  const tritiumGreenMat = new THREE.MeshBasicMaterial({ color: 0x4ade80 });
  const holoAmberMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });

  // 1. PISTOL MODEL
  {
    const p = weaponGroups.pistol;
    // Frame & slide
    const slideGeo = new THREE.BoxGeometry(0.046, 0.06, 0.28);
    const slide = new THREE.Mesh(slideGeo, darkMetalMat);
    slide.position.set(0, 0.03, -0.12);
    p.add(slide);

    // Grip
    const gripGeo = new THREE.BoxGeometry(0.042, 0.14, 0.07);
    const grip = new THREE.Mesh(gripGeo, gunGripMat);
    grip.position.set(0, -0.06, -0.04);
    grip.rotation.x = 0.22;
    p.add(grip);

    // Barrel tip
    const barrelGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.08, 12);
    const barrel = new THREE.Mesh(barrelGeo, silverSteelMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.03, -0.28);
    p.add(barrel);

    // Front sight dot
    const sightGeo = new THREE.BoxGeometry(0.008, 0.012, 0.01);
    const sight = new THREE.Mesh(sightGeo, tritiumGreenMat);
    sight.position.set(0, 0.065, -0.24);
    p.add(sight);

    root.add(p);
  }

  // 2. SHOTGUN MODEL
  {
    const s = weaponGroups.shotgun;
    // Main heavy receiver
    const recGeo = new THREE.BoxGeometry(0.06, 0.08, 0.32);
    const receiver = new THREE.Mesh(recGeo, darkMetalMat);
    receiver.position.set(0, 0.02, -0.16);
    s.add(receiver);

    // Long barrel
    const barrelGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.45, 14);
    const barrel = new THREE.Mesh(barrelGeo, silverSteelMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.04, -0.44);
    s.add(barrel);

    // Tube magazine underneath
    const tubeGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.42, 12);
    const tube = new THREE.Mesh(tubeGeo, darkMetalMat);
    tube.rotation.x = Math.PI / 2;
    tube.position.set(0, 0.01, -0.42);
    s.add(tube);

    // Ribbed pump forend
    const pumpGeo = new THREE.CylinderGeometry(0.026, 0.026, 0.16, 12);
    const pump = new THREE.Mesh(pumpGeo, gunGripMat);
    pump.rotation.x = Math.PI / 2;
    pump.position.set(0, 0.01, -0.36);
    s.add(pump);

    // Stock
    const stockGeo = new THREE.BoxGeometry(0.05, 0.1, 0.24);
    const stock = new THREE.Mesh(stockGeo, gunGripMat);
    stock.position.set(0, -0.04, 0.06);
    stock.rotation.x = 0.1;
    s.add(stock);

    s.visible = false;
    root.add(s);
  }

  // 3. ASSAULT RIFLE MODEL
  {
    const r = weaponGroups.rifle;
    // Upper & lower receiver
    const recGeo = new THREE.BoxGeometry(0.052, 0.09, 0.36);
    const rec = new THREE.Mesh(recGeo, darkMetalMat);
    rec.position.set(0, 0.02, -0.18);
    r.add(rec);

    // Handguard / Shroud
    const handGeo = new THREE.BoxGeometry(0.05, 0.06, 0.28);
    const handguard = new THREE.Mesh(handGeo, darkMetalMat);
    handguard.position.set(0, 0.02, -0.46);
    r.add(handguard);

    // Barrel & flash hider
    const bGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.28, 12);
    const b = new THREE.Mesh(bGeo, silverSteelMat);
    b.rotation.x = Math.PI / 2;
    b.position.set(0, 0.02, -0.62);
    r.add(b);

    // Curved 30-round magazine
    const magGeo = new THREE.BoxGeometry(0.04, 0.18, 0.08);
    const mag = new THREE.Mesh(magGeo, gunGripMat);
    mag.position.set(0, -0.1, -0.22);
    mag.rotation.x = 0.25;
    r.add(mag);

    // Holographic sight frame
    const sightFrameGeo = new THREE.BoxGeometry(0.038, 0.04, 0.06);
    const sightFrame = new THREE.Mesh(sightFrameGeo, darkMetalMat);
    sightFrame.position.set(0, 0.08, -0.2);
    r.add(sightFrame);

    // Holographic reticle glass
    const holoGeo = new THREE.PlaneGeometry(0.025, 0.025);
    const holo = new THREE.Mesh(holoGeo, holoAmberMat);
    holo.position.set(0, 0.08, -0.22);
    r.add(holo);

    // Stock
    const stockGeo = new THREE.BoxGeometry(0.045, 0.11, 0.24);
    const stock = new THREE.Mesh(stockGeo, gunGripMat);
    stock.position.set(0, -0.02, 0.08);
    r.add(stock);

    r.visible = false;
    root.add(r);
  }

  // 4. MAGNUM REVOLVER MODEL
  {
    const m = weaponGroups.magnum;
    // Heavy frame
    const frameGeo = new THREE.BoxGeometry(0.045, 0.07, 0.24);
    const frame = new THREE.Mesh(frameGeo, silverSteelMat);
    frame.position.set(0, 0.03, -0.12);
    m.add(frame);

    // Fluted Cylinder
    const cylGeo = new THREE.CylinderGeometry(0.032, 0.032, 0.11, 14);
    const cylinder = new THREE.Mesh(cylGeo, darkMetalMat);
    cylinder.rotation.x = Math.PI / 2;
    cylinder.position.set(0, 0.03, -0.14);
    m.add(cylinder);

    // Vented rib barrel
    const barrelGeo = new THREE.BoxGeometry(0.034, 0.05, 0.26);
    const barrel = new THREE.Mesh(barrelGeo, silverSteelMat);
    barrel.position.set(0, 0.045, -0.32);
    m.add(barrel);

    // Ergonomic wood/rubber grip
    const gripGeo = new THREE.BoxGeometry(0.046, 0.15, 0.08);
    const grip = new THREE.Mesh(gripGeo, gunGripMat);
    grip.position.set(0, -0.07, -0.03);
    grip.rotation.x = 0.28;
    m.add(grip);

    m.visible = false;
    root.add(m);
  }

  // --- MUZZLE FLASH VISUAL & POINT LIGHT ---
  const flashGeo = new THREE.OctahedronGeometry(0.12, 0);
  const flashMat = new THREE.MeshBasicMaterial({
    color: 0xffea75,
    transparent: true,
    opacity: 0,
  });
  const muzzleFlash = new THREE.Mesh(flashGeo, flashMat);
  root.add(muzzleFlash);

  const muzzleLight = new THREE.PointLight(0xffb703, 0, 8);
  root.add(muzzleLight);

  let currentWeapon: WeaponId = 'pistol';
  let recoil = 0;
  let recoilYaw = 0;
  let bobPhase = 0;
  let adsProgress = 0;
  let isReloading = false;
  let reloadProgress = 0;
  let flashTimer = 0;

  function switchWeapon(id: WeaponId) {
    if (!weaponGroups[id] || isReloading) return;
    Object.keys(weaponGroups).forEach((k) => {
      weaponGroups[k as WeaponId].visible = k === id;
    });
    currentWeapon = id;
    // Brief weapon pull-up animation
    recoil = 0.1;
  }

  function triggerShootAnimation(id: WeaponId) {
    const config = WEAPON_CONFIGS[id];
    recoil = config.recoilPitch;
    recoilYaw = (Math.random() - 0.5) * config.recoilYaw;

    // Position muzzle flash at active gun's tip
    const mPos = muzzlePoints[id];
    muzzleFlash.position.copy(mPos);
    muzzleFlash.scale.setScalar(1 + Math.random() * 0.4);
    (muzzleFlash.material as THREE.MeshBasicMaterial).opacity = 0.95;
    muzzleLight.position.copy(mPos);
    muzzleLight.intensity = 3.5;
    flashTimer = 0.05; // 50ms flash
  }

  function update(dt: number, isMoving: boolean, isADS: boolean) {
    // Smooth ADS transition
    const targetAds = isADS ? 1 : 0;
    adsProgress = THREE.MathUtils.damp(adsProgress, targetAds, 14, dt);

    // Decay recoil
    recoil = THREE.MathUtils.damp(recoil, 0, 18, dt);
    recoilYaw = THREE.MathUtils.damp(recoilYaw, 0, 18, dt);

    // Muzzle flash timer decay
    if (flashTimer > 0) {
      flashTimer -= dt;
      if (flashTimer <= 0) {
        (muzzleFlash.material as THREE.MeshBasicMaterial).opacity = 0;
        muzzleLight.intensity = 0;
      }
    }

    // Walking bobbing motion
    if (isMoving && !isADS) {
      bobPhase += dt * 10;
    } else {
      bobPhase += dt * 2; // Subtle breathing idle
    }

    const bobX = isMoving ? Math.sin(bobPhase * 0.5) * 0.015 : Math.sin(bobPhase * 0.5) * 0.003;
    const bobY = isMoving ? Math.abs(Math.sin(bobPhase)) * 0.012 : Math.sin(bobPhase) * 0.003;

    // Reload animation (drops gun down and rotates)
    let reloadOffsetY = 0;
    let reloadRotX = 0;
    if (isReloading) {
      // Curve down then back up
      const rPhase = Math.sin(reloadProgress * Math.PI);
      reloadOffsetY = -0.22 * rPhase;
      reloadRotX = -0.4 * rPhase;
    }

    // Blend position from Hip to ADS
    const targetBasePos = defaultHipPos.clone().lerp(adsPos, adsProgress);
    root.position.x = targetBasePos.x + bobX + recoilYaw;
    root.position.y = targetBasePos.y - bobY - recoil * 0.5 + reloadOffsetY;
    root.position.z = targetBasePos.z + recoil;

    // Weapon kick angles
    root.rotation.x = recoil * 2.2 + reloadRotX;
    root.rotation.y = recoilYaw * 1.5;
    root.rotation.z = -bobX * 2;
  }

  return {
    root,
    weaponGroups,
    muzzlePoints,
    muzzleFlash,
    muzzleLight,
    get currentWeapon() {
      return currentWeapon;
    },
    get recoil() {
      return recoil;
    },
    set recoil(v: number) {
      recoil = v;
    },
    get recoilYaw() {
      return recoilYaw;
    },
    set recoilYaw(v: number) {
      recoilYaw = v;
    },
    get bobPhase() {
      return bobPhase;
    },
    set bobPhase(v: number) {
      bobPhase = v;
    },
    get adsProgress() {
      return adsProgress;
    },
    get isReloading() {
      return isReloading;
    },
    set isReloading(v: boolean) {
      isReloading = v;
    },
    get reloadProgress() {
      return reloadProgress;
    },
    set reloadProgress(v: number) {
      reloadProgress = v;
    },
    switchWeapon,
    triggerShootAnimation,
    update,
  };
}
