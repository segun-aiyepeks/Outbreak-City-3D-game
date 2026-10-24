export type WeaponId = 'pistol' | 'shotgun' | 'rifle' | 'magnum';

export type UpgradeAttribute = 'damage' | 'reload' | 'clip';

export interface WeaponUpgradeLevels {
  damageLevel: number; // 1 to 5
  reloadLevel: number; // 1 to 5
  clipLevel: number;   // 1 to 5
}

export type AllWeaponUpgrades = Record<WeaponId, WeaponUpgradeLevels>;

export interface WeaponConfig {
  id: WeaponId;
  name: string;
  category: string;
  damage: number;
  fireRate: number; // rounds per second
  magSize: number;
  maxReserve: number;
  reloadTime: number; // in seconds
  pellets: number; // 1 for bullet, 8 for shotgun
  spread: number; // base angular spread
  adsSpread: number; // spread when aiming down sights
  headshotMultiplier: number;
  range: number;
  automatic: boolean;
  recoilPitch: number; // vertical kick
  recoilYaw: number; // horizontal kick
  color: string;
}

export interface PlayerWeaponState {
  currentAmmo: number;
  reserveAmmo: number;
  isReloading: boolean;
  reloadTimer: number;
  timeSinceLastShot: number;
}

export type ZombieType = 'walker' | 'runner' | 'spitter' | 'brute';

export interface ZombieStats {
  type: ZombieType;
  name: string;
  hp: number;
  speed: number;
  damage: number;
  attackRange: number;
  attackCooldown: number;
  scoreValue: number;
  scale: number;
  color: string;
}

export type DropType = 'ammo' | 'medkit' | 'quad_damage' | 'speed_boost';

export interface SupplyDrop {
  id: number;
  type: DropType;
  x: number;
  y: number;
  z: number;
  duration: number;
}

export interface DamagePopup {
  id: number;
  x: number;
  y: number;
  z: number;
  amount: number;
  isHeadshot: boolean;
  isCrit: boolean;
  lifetime: number;
  maxLifetime: number;
}

export interface GameSummary {
  score: number;
  highScore: number;
  wave: number;
  kills: number;
  headshots: number;
  accuracy: number;
  shotsFired: number;
  shotsHit: number;
  timeSurvived: number;
  currencyEarned: number;
}

export type LocationId = 'bunker' | 'cemetery' | 'subway' | 'city';

export interface LocationDef {
  id: LocationId;
  name: string;
  subtitle: string;
  description: string;
  badge: string;
  fogColor: number;
  fogDensity: number;
  skyColor: number;
  ambientColor: number;
  ambientIntensity: number;
  keyLightColor: number;
  keyLightIntensity: number;
  hemiSkyColor: number;
  hemiGroundColor: number;
  themeHue: string; // Tailwind color class e.g. 'emerald' | 'purple' | 'amber' | 'red'
  accentHex: string;
}

