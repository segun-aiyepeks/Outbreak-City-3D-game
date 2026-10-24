import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WEAPON_CONFIGS,
  ZOMBIE_TEMPLATES,
  getWaveComposition,
  getScaledZombieHp,
  calculateDamage,
  calculateReload,
  calculateKillScore,
  updateCombo,
  getUpgradeCost,
  getEffectiveWeaponStats,
  purchaseUpgrade,
  getZombieCurrency,
} from './rules.ts';

test('WEAPON_CONFIGS has all 4 primary arsenal weapons defined', () => {
  assert.ok(WEAPON_CONFIGS.pistol);
  assert.ok(WEAPON_CONFIGS.shotgun);
  assert.ok(WEAPON_CONFIGS.rifle);
  assert.ok(WEAPON_CONFIGS.magnum);

  assert.equal(WEAPON_CONFIGS.pistol.magSize, 12);
  assert.equal(WEAPON_CONFIGS.shotgun.pellets, 8);
  assert.equal(WEAPON_CONFIGS.rifle.automatic, true);
  assert.equal(WEAPON_CONFIGS.magnum.damage, 140);
});

test('calculateReload correctly transfers ammo from reserve to magazine', () => {
  // Partial reload with ample reserve
  const res1 = calculateReload(4, 50, 12);
  assert.equal(res1.newCurrent, 12);
  assert.equal(res1.newReserve, 42);

  // Reload with insufficient reserve
  const res2 = calculateReload(2, 5, 12);
  assert.equal(res2.newCurrent, 7);
  assert.equal(res2.newReserve, 0);

  // Already full magazine does not consume reserve
  const res3 = calculateReload(12, 50, 12);
  assert.equal(res3.newCurrent, 12);
  assert.equal(res3.newReserve, 50);

  // Empty reserve does not reload
  const res4 = calculateReload(0, 0, 12);
  assert.equal(res4.newCurrent, 0);
  assert.equal(res4.newReserve, 0);
});

test('calculateDamage handles base, headshots, range falloff and powerups', () => {
  // Base shot close range
  const hit1 = calculateDamage(40, false, 2.0, false, 10, 60);
  assert.equal(hit1.damage, 40);
  assert.equal(hit1.isCrit, false);

  // Headshot with 2x multiplier
  const hitHeadshot = calculateDamage(40, true, 2.0, false, 10, 60);
  assert.equal(hitHeadshot.damage, 80);
  assert.equal(hitHeadshot.isCrit, true);

  // Quad damage powerup
  const hitQuad = calculateDamage(40, false, 2.0, true, 10, 60);
  assert.equal(hitQuad.damage, 100);
  assert.equal(hitQuad.isCrit, true);

  // Range falloff at maximum range
  const hitFar = calculateDamage(40, false, 2.0, false, 60, 60);
  assert.ok(hitFar.damage < 40);
  assert.ok(hitFar.damage >= 16);
});

test('getWaveComposition scales zombie count and introduces archetypes', () => {
  const wave1 = getWaveComposition(1);
  assert.equal(wave1.totalZombies, 8);
  assert.ok(wave1.types.every((t) => t === 'walker'));

  const wave4 = getWaveComposition(4);
  assert.ok(wave4.totalZombies >= 20);
});

test('getScaledZombieHp scales HP smoothly across higher waves', () => {
  const hpW1 = getScaledZombieHp(100, 1);
  assert.equal(hpW1, 100);

  const hpW5 = getScaledZombieHp(100, 5);
  assert.ok(hpW5 > hpW1);
  assert.equal(hpW5, 148);
});

test('calculateKillScore and updateCombo reward kill chains and headshots', () => {
  const baseScore = 100;
  const standardKill = calculateKillScore(baseScore, 1, false);
  assert.equal(standardKill, 100);

  const headshotKillCombo2 = calculateKillScore(baseScore, 2, true);
  // (100 * 2) + (50 * 2) = 300
  assert.equal(headshotKillCombo2, 300);

  // Combo step forward
  const step1 = updateCombo(1, 0, 0.1, true);
  assert.equal(step1.combo, 2);
  assert.equal(step1.timer, 3.5);

  // Combo decay after time expires
  const step2 = updateCombo(2, 0.2, 0.3, false);
  assert.equal(step2.combo, 1);
  assert.equal(step2.timer, 0);
});

test('getUpgradeCost scales progressively and caps at MAX_UPGRADE_LEVEL', () => {
  assert.equal(getUpgradeCost(1), 120);
  assert.equal(getUpgradeCost(2), 250);
  assert.equal(getUpgradeCost(3), 450);
  assert.equal(getUpgradeCost(4), 750);
  assert.equal(getUpgradeCost(5), Infinity);
});

test('getEffectiveWeaponStats correctly scales damage, reload, and clip size', () => {
  const basePistol = WEAPON_CONFIGS.pistol; // 38 dmg, 1.2s reload, 12 mag

  // Level 1: exact base
  const lv1Stats = getEffectiveWeaponStats(basePistol, { damageLevel: 1, reloadLevel: 1, clipLevel: 1 });
  assert.equal(lv1Stats.damage, 38);
  assert.equal(lv1Stats.reloadTime, 1.2);
  assert.equal(lv1Stats.magSize, 12);

  // Level 3 Damage (+36%): 38 * 1.36 = 51.68 -> 52
  const lv3DmgStats = getEffectiveWeaponStats(basePistol, { damageLevel: 3, reloadLevel: 1, clipLevel: 1 });
  assert.equal(lv3DmgStats.damage, 52);

  // Level 2 Reload (-15%): 1.2 * 0.85 = 1.02
  const lv2ReloadStats = getEffectiveWeaponStats(basePistol, { damageLevel: 1, reloadLevel: 2, clipLevel: 1 });
  assert.equal(lv2ReloadStats.reloadTime, 1.02);

  // Level 3 Clip (+50%): 12 * 1.5 = 18
  const lv3ClipStats = getEffectiveWeaponStats(basePistol, { damageLevel: 1, reloadLevel: 1, clipLevel: 3 });
  assert.equal(lv3ClipStats.magSize, 18);
});

test('purchaseUpgrade validates scrap currency and advances weapon levels', () => {
  const initialUpgrades = {
    pistol: { damageLevel: 1, reloadLevel: 1, clipLevel: 1 },
    shotgun: { damageLevel: 1, reloadLevel: 1, clipLevel: 1 },
    rifle: { damageLevel: 1, reloadLevel: 1, clipLevel: 1 },
    magnum: { damageLevel: 1, reloadLevel: 1, clipLevel: 1 },
  };

  // Attempt purchase with insufficient funds
  const fail = purchaseUpgrade(initialUpgrades, 'pistol', 'damage', 50);
  assert.equal(fail.success, false);
  assert.equal(fail.remainingCurrency, 50);

  // Successful purchase Lv 1 -> 2 (costs 120)
  const pass = purchaseUpgrade(initialUpgrades, 'pistol', 'damage', 300);
  assert.equal(pass.success, true);
  assert.equal(pass.cost, 120);
  assert.equal(pass.remainingCurrency, 180);
  assert.equal(pass.newUpgrades.pistol.damageLevel, 2);
  assert.equal(pass.newUpgrades.pistol.reloadLevel, 1);

  // Purchasing when already at MAX_UPGRADE_LEVEL fails
  const maxedUpgrades = {
    ...initialUpgrades,
    pistol: { damageLevel: 5, reloadLevel: 1, clipLevel: 1 },
  };
  const atMax = purchaseUpgrade(maxedUpgrades, 'pistol', 'damage', 9999);
  assert.equal(atMax.success, false);
});

test('getZombieCurrency awards currency with archetype scaling and headshots', () => {
  assert.equal(getZombieCurrency('walker', false), 15);
  assert.equal(getZombieCurrency('walker', true), 25);
  assert.equal(getZombieCurrency('brute', false), 85);
  assert.equal(getZombieCurrency('brute', true), 105);
});

