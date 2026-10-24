import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { WeaponId, DamagePopup, SupplyDrop, AllWeaponUpgrades, LocationId } from './types';
import {
  calculateDamage,
  calculateKillScore,
  calculateReload,
  getWaveComposition,
  updateCombo,
  WEAPON_CONFIGS,
  DEFAULT_UPGRADES,
  getEffectiveWeaponStats,
  getZombieCurrency,
  getWaveClearCurrency,
} from './rules';
import { soundManager } from './audio';
import { buildEnvironment, GameEnvironment, LOCATION_REGISTRY } from './locations';
import { createWeaponRig, WeaponRig } from './weapons';
import { createZombieManager, ZombieManager, ZombieInstance } from './zombies';
import { createParticleSystem, ParticleSystem } from './particles';
import { createSupplyDropManager, SupplyDropManager } from './drops';

export interface EngineCallbacks {
  onHealthChange: (hp: number, maxHp: number) => void;
  onAmmoChange: (clip: number, reserve: number, weaponId: WeaponId) => void;
  onWaveChange: (wave: number, remainingZombies: number, totalWaveZombies: number) => void;
  onScoreChange: (score: number, combo: number) => void;
  onHitMarker: (type: 'hit' | 'headshot' | 'kill') => void;
  onDamagePopup: (popup: DamagePopup) => void;
  onPowerupChange: (quadTimer: number, speedTimer: number) => void;
  onCurrencyChange: (totalCurrency: number, earnedInRun: number) => void;
  onGameOver: (stats: {
    score: number;
    wave: number;
    kills: number;
    headshots: number;
    accuracy: number;
    timeSurvived: number;
    currencyEarned: number;
  }) => void;
  onWaveCleared: (wave: number) => void;
}

export interface AcidProjectile {
  mesh: THREE.Mesh;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
}

export class FPSEngine {
  public renderer: THREE.WebGLRenderer;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  private container: HTMLElement;
  private callbacks: EngineCallbacks;

  // Environment & modules
  private environment: GameEnvironment;
  public currentLocationId: LocationId = 'bunker';
  private keyLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private ambLight: THREE.AmbientLight;
  private weaponRig: WeaponRig;
  private zombieManager: ZombieManager;
  private particles: ParticleSystem;
  private drops: SupplyDropManager;
  private acidProjectiles: AcidProjectile[] = [];

  // Software WebGL flag
  public isSoftwareGl: boolean = false;
  private frameId: number = 0;
  private isRunning: boolean = false;
  private isPaused: boolean = false;

  // Player State
  public playerHp: number = 100;
  public playerMaxHp: number = 100;
  private playerPos: THREE.Vector3 = new THREE.Vector3(0, 1.7, 0);
  private playerVel: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private cameraPitch: number = 0;
  private cameraYaw: number = 0;
  private isGrounded: boolean = true;
  private trauma: number = 0; // camera shake

  // Weapons & Upgrades State
  private currentWeaponId: WeaponId = 'pistol';
  private weaponUpgrades: AllWeaponUpgrades;
  private totalCurrency: number;
  private currencyEarnedInRun: number = 0;
  private ammoState: Record<WeaponId, { current: number; reserve: number }> = {
    pistol: { current: 12, reserve: 60 },
    shotgun: { current: 6, reserve: 24 },
    rifle: { current: 30, reserve: 120 },
    magnum: { current: 5, reserve: 20 },
  };
  private isReloading: boolean = false;
  private reloadTimer: number = 0;
  private shootCooldown: number = 0;
  private isADS: boolean = false;

  // Input states (desktop & virtual touch)
  public keys: Record<string, boolean> = {};
  public isMouseDown: boolean = false;
  public touchJoystick: { x: number; y: number } = { x: 0, y: 0 };
  public touchLookDelta: { x: number; y: number } = { x: 0, y: 0 };
  public touchFireHeld: boolean = false;
  public touchAimToggle: boolean = false;

  // Game Progress & Stats
  private wave: number = 1;
  private zombiesSpawnQueue: string[] = [];
  private spawnIntervalTimer: number = 0;
  private waveZombiesRemaining: number = 0;
  private waveTotalZombies: number = 0;
  private score: number = 0;
  private kills: number = 0;
  private headshots: number = 0;
  private shotsFired: number = 0;
  private shotsHit: number = 0;
  private timeSurvived: number = 0;
  private combo: number = 1;
  private comboTimer: number = 0;
  private hitstopTimer: number = 0;

  // Powerups
  private quadDamageTimer: number = 0;
  private speedBoostTimer: number = 0;

  // Between wave delay
  private waveIntermissionTimer: number = 0;

  constructor(
    container: HTMLElement,
    callbacks: EngineCallbacks,
    initialUpgrades: AllWeaponUpgrades = DEFAULT_UPGRADES,
    initialCurrency: number = 0,
    initialLocation: LocationId = 'bunker'
  ) {
    this.container = container;
    this.callbacks = callbacks;
    this.weaponUpgrades = initialUpgrades;
    this.totalCurrency = initialCurrency;
    this.currentLocationId = initialLocation;

    // Initialize weapon ammo capacities with effective upgraded stats
    this.ammoState = {
      pistol: { current: getEffectiveWeaponStats(WEAPON_CONFIGS.pistol, this.weaponUpgrades.pistol).magSize, reserve: 60 },
      shotgun: { current: getEffectiveWeaponStats(WEAPON_CONFIGS.shotgun, this.weaponUpgrades.shotgun).magSize, reserve: 24 },
      rifle: { current: getEffectiveWeaponStats(WEAPON_CONFIGS.rifle, this.weaponUpgrades.rifle).magSize, reserve: 120 },
      magnum: { current: getEffectiveWeaponStats(WEAPON_CONFIGS.magnum, this.weaponUpgrades.magnum).magSize, reserve: 20 },
    };

    // 1. Detect Software WebGL
    this.isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 2. Setup Three.js Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2)
    );
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    this.renderer.setSize(width, height);
    container.appendChild(this.renderer.domElement);

    // 3. Scene, Camera & Lighting Rig
    this.scene = new THREE.Scene();
    const locDef = LOCATION_REGISTRY[this.currentLocationId] || LOCATION_REGISTRY.bunker;
    this.scene.background = new THREE.Color(locDef.skyColor);
    this.scene.fog = new THREE.FogExp2(locDef.fogColor, locDef.fogDensity);

    this.camera = new THREE.PerspectiveCamera(72, width / height, 0.1, 200);
    this.camera.position.copy(this.playerPos);
    this.scene.add(this.camera);

    // Key Directional Light
    this.keyLight = new THREE.DirectionalLight(locDef.keyLightColor, locDef.keyLightIntensity);
    this.keyLight.position.set(35, 50, -25);
    if (!this.isSoftwareGl) {
      this.keyLight.castShadow = true;
      this.keyLight.shadow.mapSize.width = 1024;
      this.keyLight.shadow.mapSize.height = 1024;
      this.keyLight.shadow.camera.near = 10;
      this.keyLight.shadow.camera.far = 100;
      this.keyLight.shadow.camera.left = -45;
      this.keyLight.shadow.camera.right = 45;
      this.keyLight.shadow.camera.top = 45;
      this.keyLight.shadow.camera.bottom = -45;
      this.keyLight.shadow.bias = -0.0005;
      this.keyLight.shadow.normalBias = 0.02;
    }
    this.scene.add(this.keyLight);

    // Hemisphere Fill Light
    this.hemiLight = new THREE.HemisphereLight(locDef.hemiSkyColor, locDef.hemiGroundColor, 1.2);
    this.scene.add(this.hemiLight);

    // Ambient light baseline
    this.ambLight = new THREE.AmbientLight(locDef.ambientColor, locDef.ambientIntensity);
    this.scene.add(this.ambLight);

    // 4. Initialize Subsystems & Procedural Environment
    this.environment = buildEnvironment(this.scene, this.currentLocationId);
    this.weaponRig = createWeaponRig(this.camera);
    this.zombieManager = createZombieManager(this.scene);
    this.particles = createParticleSystem(this.scene);
    this.drops = createSupplyDropManager(this.scene);

    // Prewarm compilation if GPU
    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    // Start wave 1
    this.startWave(1);
  }

  /** Dynamically transitions the battleground to a new location with unique atmosphere and props */
  public setLocation(locId: LocationId) {
    if (this.currentLocationId === locId && this.environment) return;
    this.currentLocationId = locId;
    const locDef = LOCATION_REGISTRY[locId] || LOCATION_REGISTRY.bunker;

    // 1. Dispose old environment
    if (this.environment) {
      this.environment.dispose();
    }

    // 2. Build new procedural environment
    this.environment = buildEnvironment(this.scene, locId);

    // 3. Update scene atmosphere
    this.scene.background = new THREE.Color(locDef.skyColor);
    this.scene.fog = new THREE.FogExp2(locDef.fogColor, locDef.fogDensity);

    // 4. Update lighting rig
    this.keyLight.color.setHex(locDef.keyLightColor);
    this.keyLight.intensity = locDef.keyLightIntensity;
    this.hemiLight.color.setHex(locDef.hemiSkyColor);
    this.hemiLight.groundColor.setHex(locDef.hemiGroundColor);
    this.ambLight.color.setHex(locDef.ambientColor);
    this.ambLight.intensity = locDef.ambientIntensity;

    // 5. Reset player position safely to center
    this.playerPos.set(0, 1.7, 0);
    this.playerVel.set(0, 0, 0);

    // 6. Prewarm compilation if GPU
    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }
  }

  // --- START / PAUSE / RESTART LIFECYCLE ---

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.isPaused = false;
    this.lastTime = performance.now();
    this.loop();
  }

  public setPaused(paused: boolean) {
    this.isPaused = paused;
  }

  public restart() {
    this.playerHp = 100;
    this.playerPos.set(0, 1.7, 0);
    this.playerVel.set(0, 0, 0);
    this.cameraPitch = 0;
    this.cameraYaw = 0;
    this.score = 0;
    this.kills = 0;
    this.headshots = 0;
    this.shotsFired = 0;
    this.shotsHit = 0;
    this.timeSurvived = 0;
    this.combo = 1;
    this.comboTimer = 0;
    this.quadDamageTimer = 0;
    this.speedBoostTimer = 0;

    // Reset ammo with effective upgraded stats
    this.ammoState = {
      pistol: { current: getEffectiveWeaponStats(WEAPON_CONFIGS.pistol, this.weaponUpgrades.pistol).magSize, reserve: 60 },
      shotgun: { current: getEffectiveWeaponStats(WEAPON_CONFIGS.shotgun, this.weaponUpgrades.shotgun).magSize, reserve: 24 },
      rifle: { current: getEffectiveWeaponStats(WEAPON_CONFIGS.rifle, this.weaponUpgrades.rifle).magSize, reserve: 120 },
      magnum: { current: getEffectiveWeaponStats(WEAPON_CONFIGS.magnum, this.weaponUpgrades.magnum).magSize, reserve: 20 },
    };
    this.currencyEarnedInRun = 0;
    this.currentWeaponId = 'pistol';
    this.weaponRig.switchWeapon('pistol');

    this.zombieManager.clearAll();
    this.drops.clearAll();
    this.clearAcidProjectiles();

    this.startWave(1);
    this.isPaused = false;
    this.syncHUD();
  }

  private startWave(waveNum: number) {
    this.wave = waveNum;
    const waveInfo = getWaveComposition(waveNum);
    this.zombiesSpawnQueue = [...waveInfo.types];
    this.waveTotalZombies = waveInfo.totalZombies;
    this.waveZombiesRemaining = waveInfo.totalZombies;
    this.spawnIntervalTimer = 0.5;

    soundManager.playWaveStart();
    this.callbacks.onWaveChange(this.wave, this.waveZombiesRemaining, this.waveTotalZombies);

    // Spawn initial wave vanguard in player view
    if (this.zombiesSpawnQueue.length > 0) {
      const t1 = this.zombiesSpawnQueue.shift() as 'walker' | 'runner' | 'spitter' | 'brute';
      this.zombieManager.spawnZombie(t1, -3.5, -17, this.wave);
    }
    if (this.zombiesSpawnQueue.length > 0) {
      const t2 = this.zombiesSpawnQueue.shift() as 'walker' | 'runner' | 'spitter' | 'brute';
      this.zombieManager.spawnZombie(t2, 4.5, -21, this.wave);
    }

    // Spawn a supply drop near the center at wave start
    if (waveNum > 1) {
      const dropTypes: ('ammo' | 'medkit' | 'quad_damage' | 'speed_boost')[] = [
        'ammo',
        'medkit',
        'quad_damage',
        'speed_boost',
      ];
      const randomDrop = dropTypes[Math.floor(Math.random() * dropTypes.length)];
      const dropAngle = Math.random() * Math.PI * 2;
      const dropRadius = 6 + Math.random() * 8;
      this.drops.spawnDrop(
        randomDrop,
        Math.cos(dropAngle) * dropRadius,
        Math.sin(dropAngle) * dropRadius
      );
    }
  }

  // --- WEAPON ACTIONS ---

  public switchWeapon(id: WeaponId) {
    if (this.currentWeaponId === id || this.isReloading) return;
    this.currentWeaponId = id;
    this.weaponRig.switchWeapon(id);
    soundManager.playWeaponSwitch?.();
    this.syncHUD();
  }

  public setUpgrades(upgrades: AllWeaponUpgrades) {
    this.weaponUpgrades = upgrades;
    this.syncHUD();
  }

  public addCurrency(amount: number) {
    this.totalCurrency += amount;
    this.currencyEarnedInRun += amount;
    this.callbacks.onCurrencyChange(this.totalCurrency, this.currencyEarnedInRun);
  }

  public reload() {
    if (this.isReloading) return;
    const config = WEAPON_CONFIGS[this.currentWeaponId];
    const effective = getEffectiveWeaponStats(config, this.weaponUpgrades[this.currentWeaponId]);
    const ammo = this.ammoState[this.currentWeaponId];
    if (ammo.current >= effective.magSize || ammo.reserve <= 0) return;

    this.isReloading = true;
    this.reloadTimer = effective.reloadTime;
    this.weaponRig.isReloading = true;
    this.weaponRig.reloadProgress = 0;
    soundManager.playReload();
  }

  public shoot() {
    if (this.isReloading || this.shootCooldown > 0) return;

    const config = WEAPON_CONFIGS[this.currentWeaponId];
    const ammo = this.ammoState[this.currentWeaponId];

    if (ammo.current <= 0) {
      soundManager.playEmptyClick();
      this.reload();
      return;
    }

    // Deduct ammo & set cooldown
    ammo.current -= 1;
    this.shootCooldown = 1 / config.fireRate;
    this.shotsFired += config.pellets;

    // Visual & audio feedback
    this.weaponRig.triggerShootAnimation(this.currentWeaponId);
    this.trauma = Math.min(1.0, this.trauma + config.recoilPitch * 1.5);

    // Play weapon sound
    if (this.currentWeaponId === 'pistol') soundManager.playPistol();
    else if (this.currentWeaponId === 'shotgun') soundManager.playShotgun();
    else if (this.currentWeaponId === 'rifle') soundManager.playRifle();
    else if (this.currentWeaponId === 'magnum') soundManager.playMagnum();

    // Bullet Raycasts
    const camDir = new THREE.Vector3();
    this.camera.getWorldDirection(camDir);

    const isQuad = this.quadDamageTimer > 0;
    const spreadAngle = this.isADS ? config.adsSpread : config.spread;

    let hitAny = false;

    for (let p = 0; p < config.pellets; p++) {
      // Apply spread
      const shootDir = camDir.clone();
      if (spreadAngle > 0) {
        const spreadX = (Math.random() - 0.5) * spreadAngle * 2;
        const spreadY = (Math.random() - 0.5) * spreadAngle * 2;
        shootDir.x += spreadX;
        shootDir.y += spreadY;
        shootDir.normalize();
      }

      // Check hit against all living zombies
      const hitResult = this.raycastZombies(this.camera.position, shootDir, config.range);

      if (hitResult) {
        hitAny = true;
        this.shotsHit += 1;
        const { zombie, isHeadshot, hitPoint, hitNormal, distance } = hitResult;

        const effective = getEffectiveWeaponStats(config, this.weaponUpgrades[this.currentWeaponId]);
        const { damage, isCrit } = calculateDamage(
          effective.damage,
          isHeadshot,
          config.headshotMultiplier,
          isQuad,
          distance,
          config.range
        );

        // Apply damage to zombie
        zombie.hp -= damage;
        zombie.hitFlashTimer = 0.08;
        (zombie.headMesh.material as THREE.MeshStandardMaterial).emissive.setHex(0xffffff);
        (zombie.bodyMesh.material as THREE.MeshStandardMaterial).emissive.setHex(0xffffff);

        // Spawn visceral arterial blood spray, flesh/bone chunks, armor shrapnel, and floor decals
        this.particles.spawnZombieHit(
          hitPoint,
          shootDir,
          hitNormal,
          isHeadshot,
          zombie.type,
          damage
        );

        // Spawn floating damage popup
        this.callbacks.onDamagePopup({
          id: Math.random(),
          x: hitPoint.x,
          y: hitPoint.y + 0.3,
          z: hitPoint.z,
          amount: damage,
          isHeadshot,
          isCrit,
          lifetime: 0,
          maxLifetime: 0.9,
        });

        // Kill check
        if (zombie.hp <= 0 && !zombie.isDying) {
          zombie.isDying = true;
          this.kills += 1;
          if (isHeadshot) this.headshots += 1;

          // Sound & hitmarker
          if (isHeadshot) soundManager.playHeadshot();
          else soundManager.playHitmarker();
          this.callbacks.onHitMarker(isHeadshot ? 'headshot' : 'kill');

          // Combo & Score
          const comboRes = updateCombo(this.combo, this.comboTimer, 0, true);
          this.combo = comboRes.combo;
          this.comboTimer = comboRes.timer;
          const killScore = calculateKillScore(zombie.stats.scoreValue, this.combo, isHeadshot);
          this.score += killScore;

          // Award scrap currency
          const scrapEarned = getZombieCurrency(zombie.type, isHeadshot);
          this.addCurrency(scrapEarned);

          // Sim-level hitstop (brief pause for cinematic impact)
          this.hitstopTimer = isHeadshot ? 0.06 : 0.035;

          // Possible supply drop from zombie (12% chance)
          if (Math.random() < 0.12) {
            const types: ('ammo' | 'medkit')[] = ['ammo', 'medkit'];
            this.drops.spawnDrop(
              types[Math.floor(Math.random() * types.length)],
              zombie.position.x,
              zombie.position.z
            );
          }

          // Decrement wave counter
          this.waveZombiesRemaining -= 1;
          this.callbacks.onWaveChange(this.wave, this.waveZombiesRemaining, this.waveTotalZombies);

          // Wave Complete check
          if (this.waveZombiesRemaining <= 0 && this.zombiesSpawnQueue.length === 0) {
            soundManager.playWaveVictory();
            const waveScrap = getWaveClearCurrency(this.wave);
            this.addCurrency(waveScrap);
            this.callbacks.onWaveCleared(this.wave);
            this.waveIntermissionTimer = 4.0; // 4 seconds intermission
          }
        } else {
          // Non-fatal hit marker
          soundManager.playHitmarker();
          this.callbacks.onHitMarker('hit');
        }
      } else {
        // Bullet hit environment/ground/obstacles -> dust cloud, rubble debris, and sparks
        let hitEnv = false;
        if (shootDir.y < -0.001) {
          const tGround = (0.02 - this.camera.position.y) / shootDir.y;
          if (tGround > 0 && tGround < config.range) {
            const groundHit = this.camera.position.clone().add(shootDir.clone().multiplyScalar(tGround));
            this.particles.spawnEnvironmentImpact(groundHit, new THREE.Vector3(0, 1, 0), 'concrete');
            hitEnv = true;
          }
        }

        if (!hitEnv) {
          const ray = new THREE.Ray(this.camera.position, shootDir);
          let closestObstacleDist = 30;
          let obsHitPoint: THREE.Vector3 | null = null;
          const obsNormal = new THREE.Vector3(0, 1, 0);

          for (const obs of this.environment.obstacles) {
            const box = new THREE.Box3(
              new THREE.Vector3(obs.minX, 0, obs.minZ),
              new THREE.Vector3(obs.maxX, 8, obs.maxZ)
            );
            const targetPoint = new THREE.Vector3();
            if (ray.intersectBox(box, targetPoint)) {
              const d = this.camera.position.distanceTo(targetPoint);
              if (d < closestObstacleDist) {
                closestObstacleDist = d;
                obsHitPoint = targetPoint.clone();
                if (Math.abs(targetPoint.x - obs.minX) < 0.1) obsNormal.set(-1, 0, 0);
                else if (Math.abs(targetPoint.x - obs.maxX) < 0.1) obsNormal.set(1, 0, 0);
                else if (Math.abs(targetPoint.z - obs.minZ) < 0.1) obsNormal.set(0, 0, -1);
                else if (Math.abs(targetPoint.z - obs.maxZ) < 0.1) obsNormal.set(0, 0, 1);
                else obsNormal.set(0, 1, 0);
              }
            }
          }

          if (obsHitPoint) {
            this.particles.spawnEnvironmentImpact(obsHitPoint, obsNormal, 'concrete');
          } else {
            const rayEnd = this.camera.position.clone().add(shootDir.clone().multiplyScalar(22));
            if (rayEnd.y <= 0.2) {
              rayEnd.y = 0.05;
              this.particles.spawnEnvironmentImpact(rayEnd, new THREE.Vector3(0, 1, 0), 'concrete');
            }
          }
        }
      }
    }

    this.syncHUD();
  }

  private raycastZombies(
    rayOrigin: THREE.Vector3,
    rayDir: THREE.Vector3,
    maxDistance: number
  ): {
    zombie: ZombieInstance;
    isHeadshot: boolean;
    hitPoint: THREE.Vector3;
    hitNormal: THREE.Vector3;
    distance: number;
  } | null {
    let closestDist = maxDistance;
    let bestResult: {
      zombie: ZombieInstance;
      isHeadshot: boolean;
      hitPoint: THREE.Vector3;
      hitNormal: THREE.Vector3;
      distance: number;
    } | null = null;

    const ray = new THREE.Ray(rayOrigin, rayDir);

    for (const z of this.zombieManager.zombies) {
      if (z.isDying) continue;

      // 1. Check Headshot sphere first (radius ~0.28m)
      const headRadius = 0.28 * z.stats.scale;
      const headDist = ray.distanceToPoint(z.headPositionWorld);
      if (headDist < headRadius) {
        const proj = new THREE.Vector3();
        ray.closestPointToPoint(z.headPositionWorld, proj);
        const distAlongRay = ray.origin.distanceTo(proj);
        if (distAlongRay < closestDist) {
          closestDist = distAlongRay;
          const halfChord = Math.sqrt(Math.max(0, headRadius * headRadius - headDist * headDist));
          const hitPoint = proj.clone().sub(rayDir.clone().multiplyScalar(halfChord));
          const hitNormal = hitPoint.clone().sub(z.headPositionWorld).normalize();

          bestResult = {
            zombie: z,
            isHeadshot: true,
            hitPoint,
            hitNormal,
            distance: distAlongRay,
          };
        }
      }

      // 2. Check Body cylinder/sphere (radius ~0.55m)
      const bodyRadius = 0.55 * z.stats.scale;
      const bodyDist = ray.distanceToPoint(z.centerPositionWorld);
      if (bodyDist < bodyRadius) {
        const proj = new THREE.Vector3();
        ray.closestPointToPoint(z.centerPositionWorld, proj);
        const distAlongRay = ray.origin.distanceTo(proj);
        if (distAlongRay < closestDist) {
          closestDist = distAlongRay;
          const halfChord = Math.sqrt(Math.max(0, bodyRadius * bodyRadius - bodyDist * bodyDist));
          const hitPoint = proj.clone().sub(rayDir.clone().multiplyScalar(halfChord));
          const hitNormal = hitPoint.clone().sub(z.centerPositionWorld).normalize();

          bestResult = {
            zombie: z,
            isHeadshot: false,
            hitPoint,
            hitNormal,
            distance: distAlongRay,
          };
        }
      }
    }

    return bestResult;
  }

  // --- ACID PROJECTILES FROM SPITTERS ---

  public spawnAcidSpit(from: THREE.Vector3, dir: THREE.Vector3) {
    soundManager.playSpitterAcid();
    const spitGeo = new THREE.SphereGeometry(0.24, 8, 8);
    const spitMat = new THREE.MeshBasicMaterial({ color: 0x84cc16 });
    const spitMesh = new THREE.Mesh(spitGeo, spitMat);
    spitMesh.position.copy(from);
    this.scene.add(spitMesh);

    this.acidProjectiles.push({
      mesh: spitMesh,
      position: spitMesh.position,
      velocity: dir.clone().multiplyScalar(15),
      life: 0,
    });
  }

  private updateAcidProjectiles(dt: number) {
    for (let i = this.acidProjectiles.length - 1; i >= 0; i--) {
      const proj = this.acidProjectiles[i];
      proj.life += dt;
      proj.position.addScaledVector(proj.velocity, dt);

      // Hit player check
      const distToPlayer = proj.position.distanceTo(this.playerPos);
      if (distToPlayer < 1.2) {
        this.applyDamageToPlayer(24);
        this.particles.spawnAcidGoo(proj.position, 16);
        this.scene.remove(proj.mesh);
        this.acidProjectiles.splice(i, 1);
        continue;
      }

      // Hit ground or expire
      if (proj.position.y <= 0.1 || proj.life > 3.0) {
        this.particles.spawnAcidGoo(proj.position, 14);
        this.scene.remove(proj.mesh);
        this.acidProjectiles.splice(i, 1);
      }
    }
  }

  private clearAcidProjectiles() {
    for (const p of this.acidProjectiles) {
      this.scene.remove(p.mesh);
    }
    this.acidProjectiles.length = 0;
  }

  // --- PLAYER DAMAGE & HEALTH ---

  public applyDamageToPlayer(amount: number) {
    if (this.playerHp <= 0) return;
    this.playerHp = Math.max(0, this.playerHp - amount);
    this.trauma = Math.min(1.0, this.trauma + 0.5);
    soundManager.playPlayerHurt();
    this.callbacks.onHealthChange(this.playerHp, this.playerMaxHp);

    if (this.playerHp <= 0) {
      this.triggerGameOver();
    }
  }

  private triggerGameOver() {
    this.isPaused = true;
    const acc = this.shotsFired > 0 ? Math.round((this.shotsHit / this.shotsFired) * 100) : 0;
    this.callbacks.onGameOver({
      score: this.score,
      wave: this.wave,
      kills: this.kills,
      headshots: this.headshots,
      accuracy: acc,
      timeSurvived: Math.round(this.timeSurvived),
      currencyEarned: this.currencyEarnedInRun,
    });
  }

  // --- ROTATION / CAMERA LOOK ---

  public applyMouseDelta(dx: number, dy: number, sensitivity: number = 0.0022) {
    this.cameraYaw -= dx * sensitivity;
    this.cameraPitch -= dy * sensitivity;
    // Clamp vertical pitch (-80 to 80 deg)
    this.cameraPitch = Math.max(-1.4, Math.min(1.4, this.cameraPitch));
  }

  // --- MAIN LOOP ---

  private lastTime: number = performance.now();

  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    let pollCount = 0;
    const poll = () => {
      pollCount++;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED && pollCount < 8) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 40);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private loop = () => {
    const now = performance.now();
    const rawDt = (now - this.lastTime) * 0.001;
    this.lastTime = now;

    // Clamped dt <= 0.05
    const dt = Math.min(rawDt, 0.05);

    if (this.isRunning && !this.isPaused) {
      this.tick(dt);
    }

    this.renderer.render(this.scene, this.camera);

    if (this.isSoftwareGl) {
      this.afterDraw(this.loop);
    } else {
      this.frameId = requestAnimationFrame(this.loop);
    }
  };

  private tick(dt: number) {
    this.timeSurvived += dt;

    // Sim-level hitstop freeze
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      return;
    }

    // 1. Process Touch Look input
    if (this.touchLookDelta.x !== 0 || this.touchLookDelta.y !== 0) {
      this.applyMouseDelta(this.touchLookDelta.x, this.touchLookDelta.y, 0.005);
      this.touchLookDelta.x = 0;
      this.touchLookDelta.y = 0;
    }

    // 2. Process Auto-Fire if fire button held
    const activeCfg = WEAPON_CONFIGS[this.currentWeaponId];
    if (this.touchFireHeld || (this.isMouseDown && activeCfg.automatic)) {
      this.shoot();
    }

    // 3. Shoot cooldown & reload progress
    if (this.shootCooldown > 0) {
      this.shootCooldown -= dt;
    }

    if (this.isReloading) {
      this.reloadTimer -= dt;
      const effective = getEffectiveWeaponStats(activeCfg, this.weaponUpgrades[this.currentWeaponId]);
      const progress = 1 - this.reloadTimer / effective.reloadTime;
      this.weaponRig.reloadProgress = progress;

      if (this.reloadTimer <= 0) {
        this.isReloading = false;
        this.weaponRig.isReloading = false;
        const curAmmo = this.ammoState[this.currentWeaponId];
        const res = calculateReload(curAmmo.current, curAmmo.reserve, effective.magSize);
        curAmmo.current = res.newCurrent;
        curAmmo.reserve = res.newReserve;
        this.syncHUD();
      }
    }

    // 4. Update Powerup Timers
    if (this.quadDamageTimer > 0) {
      this.quadDamageTimer = Math.max(0, this.quadDamageTimer - dt);
    }
    if (this.speedBoostTimer > 0) {
      this.speedBoostTimer = Math.max(0, this.speedBoostTimer - dt);
    }
    this.callbacks.onPowerupChange(this.quadDamageTimer, this.speedBoostTimer);

    // 5. Update Combo decay
    if (this.comboTimer > 0) {
      const comboRes = updateCombo(this.combo, this.comboTimer, dt, false);
      this.combo = comboRes.combo;
      this.comboTimer = comboRes.timer;
      this.callbacks.onScoreChange(this.score, this.combo);
    }

    // 6. Player Movement Physics with Obstacle Collision
    this.updatePlayerMovement(dt);

    // 7. Camera Orientation & Trauma Shake
    this.updateCameraRig(dt);

    // 8. Weapon Rig Update
    const isMoving = this.playerVel.lengthSq() > 0.05;
    this.isADS = this.touchAimToggle || (this.keys['KeyQ'] ?? false);
    this.weaponRig.update(dt, isMoving, this.isADS);

    // 9. Environment update (flickering lights, bio-tanks, ambient effects)
    this.environment.update(this.timeSurvived);

    // 10. Zombie Manager update & wave spawning
    this.updateWaveSpawning(dt);
    this.zombieManager.update(
      dt,
      this.playerPos,
      (dmg) => this.applyDamageToPlayer(dmg),
      (from, dir) => this.spawnAcidSpit(from, dir)
    );

    // 11. Acid projectiles
    this.updateAcidProjectiles(dt);

    // 12. Particles & Supply Drops
    this.particles.update(dt);
    this.drops.update(dt);

    // Check supply drop pickup
    const picked = this.drops.checkPickup(this.playerPos);
    if (picked) {
      soundManager.playPickup();
      if (picked.type === 'ammo') {
        Object.keys(this.ammoState).forEach((w) => {
          const cfg = WEAPON_CONFIGS[w as WeaponId];
          this.ammoState[w as WeaponId].reserve = cfg.maxReserve;
        });
      } else if (picked.type === 'medkit') {
        this.playerHp = Math.min(this.playerMaxHp, this.playerHp + 45);
        this.callbacks.onHealthChange(this.playerHp, this.playerMaxHp);
      } else if (picked.type === 'quad_damage') {
        this.quadDamageTimer = 14;
      } else if (picked.type === 'speed_boost') {
        this.speedBoostTimer = 12;
      }
      this.syncHUD();
    }
  }

  private updatePlayerMovement(dt: number) {
    // Inputs from Keyboard + Virtual Touch Joystick
    let moveForward = 0;
    let moveRight = 0;

    if (this.keys['KeyW'] || this.keys['ArrowUp']) moveForward += 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) moveForward -= 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) moveRight -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) moveRight += 1;

    // Add touch joystick input
    moveForward += this.touchJoystick.y;
    moveRight += this.touchJoystick.x;

    // Movement direction in world space
    const moveLen = Math.hypot(moveForward, moveRight);
    let baseSpeed = 5.2; // standard move speed (m/s)

    const isSprinting = this.keys['ShiftLeft'] || this.keys['ShiftRight'];
    if (isSprinting) baseSpeed *= 1.45;
    if (this.speedBoostTimer > 0) baseSpeed *= 1.35;
    if (this.isADS) baseSpeed *= 0.65; // slower while aiming down sights

    let targetVx = 0;
    let targetVz = 0;

    if (moveLen > 0.05) {
      const normF = moveForward / Math.max(1, moveLen);
      const normR = moveRight / Math.max(1, moveLen);

      const sinYaw = Math.sin(this.cameraYaw);
      const cosYaw = Math.cos(this.cameraYaw);

      // Forward is (-sinYaw, -cosYaw), Right is (cosYaw, -sinYaw)
      targetVx = (-sinYaw * normF + cosYaw * normR) * baseSpeed;
      targetVz = (-cosYaw * normF - sinYaw * normR) * baseSpeed;
    }

    // Accelerate smoothly
    this.playerVel.x = THREE.MathUtils.damp(this.playerVel.x, targetVx, 12, dt);
    this.playerVel.z = THREE.MathUtils.damp(this.playerVel.z, targetVz, 12, dt);

    // Jump physics
    if ((this.keys['Space'] || this.keys['KeyJ']) && this.isGrounded) {
      this.playerVel.y = 6.8;
      this.isGrounded = false;
      this.keys['Space'] = false; // consume edge
    }

    // Gravity
    if (!this.isGrounded) {
      this.playerVel.y -= 18.0 * dt;
      this.playerPos.y += this.playerVel.y * dt;
      if (this.playerPos.y <= 1.7) {
        this.playerPos.y = 1.7;
        this.playerVel.y = 0;
        this.isGrounded = true;
      }
    }

    // Proposed new X and Z
    const newX = this.playerPos.x + this.playerVel.x * dt;
    const newZ = this.playerPos.z + this.playerVel.z * dt;

    // Sliding collision check with environment obstacles
    const playerRadius = 0.5;

    // Check X collision separately
    let canMoveX = true;
    for (const obs of this.environment.obstacles) {
      if (
        newX + playerRadius > obs.minX &&
        newX - playerRadius < obs.maxX &&
        this.playerPos.z + playerRadius > obs.minZ &&
        this.playerPos.z - playerRadius < obs.maxZ
      ) {
        canMoveX = false;
        break;
      }
    }
    if (canMoveX) this.playerPos.x = newX;

    // Check Z collision separately
    let canMoveZ = true;
    for (const obs of this.environment.obstacles) {
      if (
        this.playerPos.x + playerRadius > obs.minX &&
        this.playerPos.x - playerRadius < obs.maxX &&
        newZ + playerRadius > obs.minZ &&
        newZ - playerRadius < obs.maxZ
      ) {
        canMoveZ = false;
        break;
      }
    }
    if (canMoveZ) this.playerPos.z = newZ;
  }

  private updateCameraRig(dt: number) {
    // Decay trauma shake
    this.trauma = Math.max(0, this.trauma - dt * 1.8);
    const shakeAmount = this.trauma * this.trauma * 0.08;
    const shakePitch = (Math.random() - 0.5) * shakeAmount;
    const shakeYaw = (Math.random() - 0.5) * shakeAmount;
    const shakeRoll = (Math.random() - 0.5) * shakeAmount * 0.5;

    this.camera.position.copy(this.playerPos);

    // Apply pitch, yaw, and shake
    this.camera.rotation.set(0, 0, 0);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.cameraYaw + shakeYaw;
    this.camera.rotation.x = this.cameraPitch + shakePitch;
    this.camera.rotation.z = shakeRoll;
  }

  private updateWaveSpawning(dt: number) {
    // Intermission countdown
    if (this.waveIntermissionTimer > 0) {
      this.waveIntermissionTimer -= dt;
      if (this.waveIntermissionTimer <= 0) {
        this.startWave(this.wave + 1);
      }
      return;
    }

    if (this.zombiesSpawnQueue.length === 0) return;

    this.spawnIntervalTimer -= dt;
    if (this.spawnIntervalTimer <= 0) {
      this.spawnIntervalTimer = Math.max(0.6, 2.2 - this.wave * 0.15); // faster spawns on later waves
      const type = this.zombiesSpawnQueue.shift() as 'walker' | 'runner' | 'spitter' | 'brute';

      // Pick spawn location in streets at least 18m away from player
      const angle = Math.random() * Math.PI * 2;
      const dist = 20 + Math.random() * 12;
      const sx = Math.max(-42, Math.min(42, this.playerPos.x + Math.cos(angle) * dist));
      const sz = Math.max(-42, Math.min(42, this.playerPos.z + Math.sin(angle) * dist));

      this.zombieManager.spawnZombie(type, sx, sz, this.wave);
    }
  }

  private syncHUD() {
    const cur = this.ammoState[this.currentWeaponId];
    this.callbacks.onAmmoChange(cur.current, cur.reserve, this.currentWeaponId);
    this.callbacks.onHealthChange(this.playerHp, this.playerMaxHp);
    this.callbacks.onScoreChange(this.score, this.combo);
    this.callbacks.onCurrencyChange(this.totalCurrency, this.currencyEarnedInRun);
  }

  public handleResize() {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  public dispose() {
    this.isRunning = false;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    this.environment.dispose();
    this.zombieManager.clearAll();
    this.drops.dispose();
    this.particles.dispose();
    this.clearAcidProjectiles();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
