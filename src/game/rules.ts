import {
  WeaponConfig,
  WeaponId,
  ZombieStats,
  ZombieType,
  AllWeaponUpgrades,
  UpgradeAttribute,
  WeaponUpgradeLevels,
} from './types';

export const WEAPON_CONFIGS: Record<WeaponId, WeaponConfig> = {
  pistol: {
    id: 'pistol',
    name: 'Tactical 9mm',
    category: 'Sidearm',
    damage: 38,
    fireRate: 4.5, // 4.5 shots/sec
    magSize: 12,
    maxReserve: 120,
    reloadTime: 1.2,
    pellets: 1,
    spread: 0.02,
    adsSpread: 0.005,
    headshotMultiplier: 2.2,
    range: 60,
    automatic: false,
    recoilPitch: 0.04,
    recoilYaw: 0.01,
    color: '#38bdf8',
  },
  shotgun: {
    id: 'shotgun',
    name: 'Riot 12-Gauge',
    category: 'Shotgun',
    damage: 22, // 22 x 8 pellets = 176 max point blank
    fireRate: 1.2,
    magSize: 6,
    maxReserve: 48,
    reloadTime: 2.2,
    pellets: 8,
    spread: 0.08,
    adsSpread: 0.045,
    headshotMultiplier: 1.8,
    range: 35,
    automatic: false,
    recoilPitch: 0.12,
    recoilYaw: 0.03,
    color: '#f97316',
  },
  rifle: {
    id: 'rifle',
    name: 'M4 Carbine',
    category: 'Assault Rifle',
    damage: 32,
    fireRate: 9.0, // 9 shots/sec full auto
    magSize: 30,
    maxReserve: 180,
    reloadTime: 1.8,
    pellets: 1,
    spread: 0.035,
    adsSpread: 0.012,
    headshotMultiplier: 2.0,
    range: 85,
    automatic: true,
    recoilPitch: 0.05,
    recoilYaw: 0.02,
    color: '#a855f7',
  },
  magnum: {
    id: 'magnum',
    name: '.50 Cal Magnum',
    category: 'Heavy Revolver',
    damage: 140,
    fireRate: 1.0,
    magSize: 5,
    maxReserve: 30,
    reloadTime: 2.0,
    pellets: 1,
    spread: 0.015,
    adsSpread: 0.002,
    headshotMultiplier: 2.5,
    range: 120,
    automatic: false,
    recoilPitch: 0.15,
    recoilYaw: 0.04,
    color: '#eab308',
  },
};

export const ZOMBIE_TEMPLATES: Record<ZombieType, ZombieStats> = {
  walker: {
    type: 'walker',
    name: 'Infected Walker',
    hp: 80,
    speed: 3.2,
    damage: 18,
    attackRange: 2.0,
    attackCooldown: 1.1,
    scoreValue: 100,
    scale: 1.0,
    color: '#4ade80',
  },
  runner: {
    type: 'runner',
    name: 'Feral Runner',
    hp: 55,
    speed: 6.2,
    damage: 14,
    attackRange: 1.8,
    attackCooldown: 0.8,
    scoreValue: 150,
    scale: 0.9,
    color: '#f87171',
  },
  spitter: {
    type: 'spitter',
    name: 'Toxic Spitter',
    hp: 110,
    speed: 2.6,
    damage: 24,
    attackRange: 16.0,
    attackCooldown: 2.8,
    scoreValue: 220,
    scale: 1.05,
    color: '#a3e635',
  },
  brute: {
    type: 'brute',
    name: 'Goliath Tank',
    hp: 420,
    speed: 2.2,
    damage: 42,
    attackRange: 2.8,
    attackCooldown: 1.6,
    scoreValue: 500,
    scale: 1.6,
    color: '#fb923c',
  },
};

/**
 * Calculates wave parameters: total zombie count and archetype distribution.
 */
export function getWaveComposition(wave: number): {
  totalZombies: number;
  types: ZombieType[];
} {
  const safeWave = Math.max(1, Math.floor(wave));
  const totalZombies = Math.floor(8 + (safeWave - 1) * 4);
  const types: ZombieType[] = [];

  for (let i = 0; i < totalZombies; i++) {
    const roll = Math.random();
    if (safeWave === 1) {
      types.push('walker');
    } else if (safeWave === 2) {
      types.push(roll < 0.35 ? 'runner' : 'walker');
    } else if (safeWave === 3) {
      if (roll < 0.3) types.push('runner');
      else if (roll < 0.55) types.push('spitter');
      else types.push('walker');
    } else {
      // Wave 4+
      if (roll < 0.15 + Math.min(0.15, (safeWave - 4) * 0.03)) {
        types.push('brute');
      } else if (roll < 0.45) {
        types.push('runner');
      } else if (roll < 0.70) {
        types.push('spitter');
      } else {
        types.push('walker');
      }
    }
  }

  return { totalZombies, types };
}

/**
 * Scaled HP for zombie depending on current wave.
 */
export function getScaledZombieHp(baseHp: number, wave: number): number {
  const safeWave = Math.max(1, wave);
  const multiplier = 1 + (safeWave - 1) * 0.12; // 12% increase per wave
  return Math.round(baseHp * multiplier);
}

/**
 * Calculate total damage dealt for a bullet hit.
 */
export function calculateDamage(
  baseDamage: number,
  isHeadshot: boolean,
  headshotMultiplier: number,
  isQuadDamage: boolean,
  distance: number,
  maxRange: number
): { damage: number; isCrit: boolean } {
  let dmg = baseDamage;

  // Range falloff beyond 50% maxRange
  const halfRange = maxRange * 0.5;
  if (distance > halfRange) {
    const falloffFactor = Math.max(0.4, 1 - ((distance - halfRange) / halfRange) * 0.6);
    dmg *= falloffFactor;
  }

  if (isHeadshot) {
    dmg *= headshotMultiplier;
  }

  if (isQuadDamage) {
    dmg *= 2.5; // High power multiplier
  }

  return {
    damage: Math.round(dmg),
    isCrit: isHeadshot || isQuadDamage,
  };
}

/**
 * Calculate reload amounts (how many bullets move from reserve into clip).
 */
export function calculateReload(
  currentAmmo: number,
  reserveAmmo: number,
  magSize: number
): { newCurrent: number; newReserve: number } {
  const needed = magSize - currentAmmo;
  if (needed <= 0 || reserveAmmo <= 0) {
    return { newCurrent: currentAmmo, newReserve: reserveAmmo };
  }
  const take = Math.min(needed, reserveAmmo);
  return {
    newCurrent: currentAmmo + take,
    newReserve: reserveAmmo - take,
  };
}

/**
 * Calculates score earned for a kill including combo bonuses.
 */
export function calculateKillScore(
  baseScore: number,
  comboMultiplier: number,
  isHeadshot: boolean
): number {
  const mult = Math.max(1, Math.min(5, comboMultiplier));
  let score = baseScore * mult;
  if (isHeadshot) {
    score += 50 * mult;
  }
  return Math.round(score);
}

/**
 * Update combo state given delta time and whether a kill just happened.
 */
export function updateCombo(
  currentCombo: number,
  comboTimer: number,
  dt: number,
  hadKill: boolean
): { combo: number; timer: number } {
  if (hadKill) {
    return {
      combo: Math.min(5, currentCombo + 1),
      timer: 3.5, // 3.5 seconds to chain next kill
    };
  }

  const newTimer = comboTimer - dt;
  if (newTimer <= 0) {
    return {
      combo: 1,
      timer: 0,
    };
  }

  return {
    combo: currentCombo,
    timer: newTimer,
  };
}

// --- WEAPON UPGRADE & PERSISTENCE SYSTEM ---

export const MAX_UPGRADE_LEVEL = 5;

export const DEFAULT_UPGRADES: AllWeaponUpgrades = {
  pistol: { damageLevel: 1, reloadLevel: 1, clipLevel: 1 },
  shotgun: { damageLevel: 1, reloadLevel: 1, clipLevel: 1 },
  rifle: { damageLevel: 1, reloadLevel: 1, clipLevel: 1 },
  magnum: { damageLevel: 1, reloadLevel: 1, clipLevel: 1 },
};

export const UPGRADE_METRICS = {
  damage: {
    name: 'Firepower',
    description: '+18% Bullet Damage',
    unit: 'DMG',
  },
  reload: {
    name: 'Quick Loader',
    description: '-15% Reload Duration',
    unit: 's',
  },
  clip: {
    name: 'Extended Mag',
    description: '+25% Magazine Capacity',
    unit: 'Rounds',
  },
};

/**
 * Calculates scrap cost to advance from currentLevel to currentLevel + 1.
 */
export function getUpgradeCost(currentLevel: number): number {
  if (currentLevel >= MAX_UPGRADE_LEVEL) return Infinity;
  // Tiered costs: Lv1->2: 120, Lv2->3: 250, Lv3->4: 450, Lv4->5: 750
  const costs = [0, 120, 250, 450, 750];
  return costs[currentLevel] || Math.round(120 * Math.pow(currentLevel, 1.35));
}

/**
 * Calculates upgraded weapon stats given current upgrade levels.
 */
export function getEffectiveWeaponStats(
  base: WeaponConfig,
  levels: WeaponUpgradeLevels
): { damage: number; reloadTime: number; magSize: number } {
  const damageMult = 1 + (levels.damageLevel - 1) * 0.18;
  const reloadMult = Math.pow(0.85, levels.reloadLevel - 1);
  const clipMult = 1 + (levels.clipLevel - 1) * 0.25;

  return {
    damage: Math.round(base.damage * damageMult),
    reloadTime: Number((base.reloadTime * reloadMult).toFixed(2)),
    magSize: Math.round(base.magSize * clipMult),
  };
}

/**
 * Checks if a player can afford an upgrade.
 */
export function canAffordUpgrade(currency: number, currentLevel: number): boolean {
  if (currentLevel >= MAX_UPGRADE_LEVEL) return false;
  return currency >= getUpgradeCost(currentLevel);
}

/**
 * Applies an upgrade and deducts scrap currency.
 */
export function purchaseUpgrade(
  upgrades: AllWeaponUpgrades,
  weaponId: WeaponId,
  attribute: UpgradeAttribute,
  currency: number
): { success: boolean; newUpgrades: AllWeaponUpgrades; remainingCurrency: number; cost: number } {
  const currentLevels = upgrades[weaponId] || { damageLevel: 1, reloadLevel: 1, clipLevel: 1 };
  const attrKey = `${attribute}Level` as keyof WeaponUpgradeLevels;
  const currentLevel = currentLevels[attrKey];

  if (currentLevel >= MAX_UPGRADE_LEVEL) {
    return { success: false, newUpgrades: upgrades, remainingCurrency: currency, cost: 0 };
  }

  const cost = getUpgradeCost(currentLevel);
  if (currency < cost) {
    return { success: false, newUpgrades: upgrades, remainingCurrency: currency, cost: 0 };
  }

  const updatedWeaponLevels = {
    ...currentLevels,
    [attrKey]: currentLevel + 1,
  };

  const newUpgrades = {
    ...upgrades,
    [weaponId]: updatedWeaponLevels,
  };

  return {
    success: true,
    newUpgrades,
    remainingCurrency: currency - cost,
    cost,
  };
}

/**
 * Calculates scrap currency rewarded for zombie kills.
 */
export function getZombieCurrency(type: ZombieType, isHeadshot: boolean): number {
  const baseRewards: Record<ZombieType, number> = {
    walker: 15,
    runner: 20,
    spitter: 35,
    brute: 85,
  };
  const base = baseRewards[type] || 15;
  const headshotBonus = type === 'brute' ? 20 : 10;
  return isHeadshot ? base + headshotBonus : base;
}

/**
 * Calculates scrap currency bonus for completing a wave.
 */
export function getWaveClearCurrency(wave: number): number {
  return 75 + Math.max(1, wave) * 35;
}

// --- LOCAL STORAGE PERSISTENCE HELPERS ---

export const STORAGE_KEY_UPGRADES = 'outbreak_weapon_upgrades_v1';
export const STORAGE_KEY_CURRENCY = 'outbreak_player_scrap_v1';

export function loadSavedUpgrades(): AllWeaponUpgrades {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_UPGRADES);
    if (!raw) return { ...DEFAULT_UPGRADES };
    const parsed = JSON.parse(raw);
    return {
      pistol: { ...DEFAULT_UPGRADES.pistol, ...(parsed.pistol || {}) },
      shotgun: { ...DEFAULT_UPGRADES.shotgun, ...(parsed.shotgun || {}) },
      rifle: { ...DEFAULT_UPGRADES.rifle, ...(parsed.rifle || {}) },
      magnum: { ...DEFAULT_UPGRADES.magnum, ...(parsed.magnum || {}) },
    };
  } catch {
    return { ...DEFAULT_UPGRADES };
  }
}

export function saveUpgrades(upgrades: AllWeaponUpgrades): void {
  try {
    localStorage.setItem(STORAGE_KEY_UPGRADES, JSON.stringify(upgrades));
  } catch {
    // Ignore storage quota or disabled storage
  }
}

export function loadSavedCurrency(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CURRENCY);
    const parsed = Number(raw);
    return isNaN(parsed) ? 150 : Math.max(0, parsed); // Seed with 150 starter scrap for initial upgrades!
  } catch {
    return 150;
  }
}

export function saveCurrency(amount: number): void {
  try {
    localStorage.setItem(STORAGE_KEY_CURRENCY, String(Math.max(0, Math.round(amount))));
  } catch {
    // Ignore storage quota or disabled storage
  }
}

