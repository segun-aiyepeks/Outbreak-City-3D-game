import React, { useState } from 'react';
import { WeaponId, AllWeaponUpgrades, UpgradeAttribute } from '../game/types';
import {
  WEAPON_CONFIGS,
  MAX_UPGRADE_LEVEL,
  UPGRADE_METRICS,
  getUpgradeCost,
  getEffectiveWeaponStats,
  canAffordUpgrade,
} from '../game/rules';
import { Wrench, Shield, Crosshair, ArrowRight, X, Sparkles, Check, Flame, Zap } from 'lucide-react';

interface ArmoryModalProps {
  currency: number;
  upgrades: AllWeaponUpgrades;
  onPurchaseUpgrade: (weaponId: WeaponId, attribute: UpgradeAttribute) => void;
  onClose: () => void;
  onScavengeDebug?: () => void;
}

export const ArmoryModal: React.FC<ArmoryModalProps> = ({
  currency,
  upgrades,
  onPurchaseUpgrade,
  onClose,
  onScavengeDebug,
}) => {
  const [selectedWeaponId, setSelectedWeaponId] = useState<WeaponId>('pistol');

  const weaponList: WeaponId[] = ['pistol', 'shotgun', 'rifle', 'magnum'];
  const activeCfg = WEAPON_CONFIGS[selectedWeaponId];
  const activeLevels = upgrades[selectedWeaponId];
  const currentStats = getEffectiveWeaponStats(activeCfg, activeLevels);

  const attributes: UpgradeAttribute[] = ['damage', 'reload', 'clip'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/85 backdrop-blur-sm select-none overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-zinc-950 border border-amber-900/40 rounded-2xl shadow-[0_0_60px_rgba(245,158,11,0.2)] flex flex-col overflow-hidden max-h-[92vh]">
        {/* TOP HEADER */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-zinc-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-teko text-3xl text-white tracking-wider uppercase leading-none">
                OUTPOST ARMORY
              </h2>
              <span className="text-[11px] font-mono text-zinc-400 tracking-wider">
                UPGRADE PERMANENT WEAPON METRICS WITH SALVAGED SCRAP
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Scrap Balance Badge */}
            <div className="flex items-center gap-2 bg-black/80 border border-amber-500/60 px-3.5 py-1.5 rounded-xl shadow-inner">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
              <div className="flex flex-col text-left">
                <span className="text-[9px] font-mono uppercase text-zinc-400 tracking-wider">
                  AVAILABLE SCRAP
                </span>
                <span className="font-mono text-lg md:text-xl font-bold text-amber-300 leading-none" data-testid="scrap-balance">
                  {currency.toLocaleString()}
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              data-close-armory="true"
              className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title="Close Armory"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* WEAPON SELECTOR TABS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-3 bg-zinc-900/30 border-b border-zinc-800">
          {weaponList.map((id) => {
            const cfg = WEAPON_CONFIGS[id];
            const isSelected = selectedWeaponId === id;
            const lvls = upgrades[id];
            const totalLvl = lvls.damageLevel + lvls.reloadLevel + lvls.clipLevel;

            return (
              <button
                key={id}
                onClick={() => setSelectedWeaponId(id)}
                data-weapon-tab={id}
                className={`flex flex-col p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-amber-950/40 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.25)] text-white'
                    : 'bg-zinc-900/50 border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[10px] font-mono tracking-widest uppercase text-amber-400 font-bold">
                    {cfg.category}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400">
                    LVL {totalLvl}/15
                  </span>
                </div>
                <div className="font-teko text-xl tracking-wide uppercase leading-tight truncate">
                  {cfg.name}
                </div>
              </button>
            );
          })}
        </div>

        {/* ACTIVE WEAPON SHOWCASE & UPGRADE ATTRIBUTES */}
        <div className="p-4 md:p-6 flex-1 overflow-y-auto space-y-4">
          {/* Weapon Overview Card */}
          <div className="bg-gradient-to-r from-zinc-900/80 via-zinc-900/50 to-zinc-900/20 border border-zinc-800 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono font-bold text-amber-400 tracking-wider uppercase px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 rounded">
                  {activeCfg.category}
                </span>
                <span className="text-xs font-mono text-zinc-400">
                  {activeCfg.automatic ? 'Full-Auto Rapid Fire' : 'Semi-Automatic Action'}
                </span>
              </div>
              <h3 className="font-teko text-3xl md:text-4xl text-white tracking-wider uppercase leading-none">
                {activeCfg.name}
              </h3>
              <p className="text-xs text-zinc-400 font-mono mt-0.5">
                {activeCfg.fireRate} shots/sec · {activeCfg.range}m range · {activeCfg.headshotMultiplier}x headshot crit
              </p>
            </div>

            {/* Current Combined Stat Badges */}
            <div className="flex items-center gap-2.5 sm:gap-3 text-center">
              <div className="bg-black/60 border border-zinc-800 px-3 py-1.5 rounded-lg">
                <span className="text-[9px] font-mono text-zinc-500 uppercase block">DAMAGE</span>
                <span className="font-teko text-2xl text-red-400 font-bold leading-none">
                  {currentStats.damage}
                </span>
              </div>
              <div className="bg-black/60 border border-zinc-800 px-3 py-1.5 rounded-lg">
                <span className="text-[9px] font-mono text-zinc-500 uppercase block">RELOAD</span>
                <span className="font-teko text-2xl text-blue-400 font-bold leading-none">
                  {currentStats.reloadTime}s
                </span>
              </div>
              <div className="bg-black/60 border border-zinc-800 px-3 py-1.5 rounded-lg">
                <span className="text-[9px] font-mono text-zinc-500 uppercase block">MAGAZINE</span>
                <span className="font-teko text-2xl text-emerald-400 font-bold leading-none">
                  {currentStats.magSize}
                </span>
              </div>
            </div>
          </div>

          {/* ATTRIBUTE UPGRADE NODES */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {attributes.map((attr) => {
              const meta = UPGRADE_METRICS[attr];
              const attrKey = `${attr}Level` as keyof typeof activeLevels;
              const curLevel = activeLevels[attrKey];
              const isMax = curLevel >= MAX_UPGRADE_LEVEL;
              const cost = isMax ? 0 : getUpgradeCost(curLevel);
              const canAfford = !isMax && currency >= cost;

              // Calculate preview for next level
              const nextLevels = {
                ...activeLevels,
                [attrKey]: Math.min(MAX_UPGRADE_LEVEL, curLevel + 1),
              };
              const nextStats = getEffectiveWeaponStats(activeCfg, nextLevels);

              let currentVal = '';
              let nextVal = '';
              let boostLabel = '';

              if (attr === 'damage') {
                currentVal = `${currentStats.damage} DMG`;
                nextVal = isMax ? 'MAX' : `${nextStats.damage} DMG`;
                boostLabel = '+18% DMG';
              } else if (attr === 'reload') {
                currentVal = `${currentStats.reloadTime}s`;
                nextVal = isMax ? 'MAX' : `${nextStats.reloadTime}s`;
                boostLabel = '-15% TIME';
              } else if (attr === 'clip') {
                currentVal = `${currentStats.magSize} RDS`;
                nextVal = isMax ? 'MAX' : `${nextStats.magSize} RDS`;
                boostLabel = '+25% MAG';
              }

              return (
                <div
                  key={attr}
                  className="bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 p-4 rounded-xl flex flex-col justify-between transition-colors shadow-lg"
                >
                  <div>
                    {/* Header & Level Tag */}
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        {attr === 'damage' && <Flame className="w-4 h-4 text-red-500" />}
                        {attr === 'reload' && <Zap className="w-4 h-4 text-blue-400" />}
                        {attr === 'clip' && <Shield className="w-4 h-4 text-emerald-400" />}
                        <span className="font-teko text-xl text-white tracking-wide uppercase">
                          {meta.name}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-amber-400 font-bold">
                        LVL {curLevel}/{MAX_UPGRADE_LEVEL}
                      </span>
                    </div>

                    <p className="text-[11px] font-mono text-zinc-400 mb-3">
                      {meta.description}
                    </p>

                    {/* 5-pip Progress Indicator */}
                    <div className="flex items-center gap-1.5 mb-4">
                      {Array.from({ length: MAX_UPGRADE_LEVEL }).map((_, idx) => {
                        const isFilled = idx < curLevel;
                        return (
                          <div
                            key={idx}
                            className={`h-2 flex-1 rounded-sm transition-all ${
                              isFilled
                                ? 'bg-gradient-to-r from-amber-500 to-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.6)]'
                                : 'bg-zinc-800'
                            }`}
                          />
                        );
                      })}
                    </div>

                    {/* Stat Transition Preview */}
                    <div className="flex items-center justify-between p-2.5 bg-black/60 rounded-lg border border-zinc-800/80 mb-4 font-mono text-xs">
                      <div className="text-zinc-400">
                        <span className="text-[9px] uppercase block text-zinc-500">CURRENT</span>
                        <span className="font-bold text-zinc-200">{currentVal}</span>
                      </div>
                      {!isMax && (
                        <>
                          <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                          <div className="text-right">
                            <span className="text-[9px] uppercase block text-amber-400 font-bold">
                              NEXT ({boostLabel})
                            </span>
                            <span className="font-bold text-amber-300">{nextVal}</span>
                          </div>
                        </>
                      )}
                      {isMax && (
                        <div className="text-right flex items-center gap-1 text-emerald-400 font-bold">
                          <Check className="w-4 h-4" />
                          <span>MAXED OUT</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Upgrade Button */}
                  <button
                    onClick={() => onPurchaseUpgrade(selectedWeaponId, attr)}
                    disabled={isMax || !canAfford}
                    data-upgrade={attr}
                    data-testid={`upgrade-btn-${selectedWeaponId}-${attr}`}
                    className={`w-full py-2.5 px-3 rounded-xl font-teko text-xl tracking-wider uppercase transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      isMax
                        ? 'bg-zinc-900 border border-zinc-800 text-zinc-500 cursor-not-allowed'
                        : canAfford
                        ? 'bg-amber-600 hover:bg-amber-500 active:scale-98 text-white shadow-[0_0_15px_rgba(245,158,11,0.35)] border border-amber-400'
                        : 'bg-zinc-900/80 border border-zinc-800 text-zinc-500 cursor-not-allowed'
                    }`}
                  >
                    {isMax ? (
                      <span>MAX LEVEL REACHED</span>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>UPGRADE • {cost} SCRAP</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Salvage Scrap Help Hint */}
          <div className="flex flex-col sm:flex-row items-center justify-between p-3.5 bg-black/40 border border-zinc-800 rounded-xl text-xs font-mono text-zinc-400">
            <div className="flex items-center gap-2 mb-2 sm:mb-0">
              <span className="text-amber-400 font-bold">PRO-TIP:</span>
              <span>All weapon upgrades are automatically saved between runs to your browser.</span>
            </div>
            {onScavengeDebug && (
              <button
                onClick={onScavengeDebug}
                data-testid="scavenge-scrap-btn"
                className="text-[11px] font-mono px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-amber-500/30 text-amber-300 rounded cursor-pointer transition-colors"
              >
                +250 TEST SCRAP
              </button>
            )}
          </div>
        </div>

        {/* BOTTOM ACTION BAR */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/60 flex items-center justify-between">
          <div className="text-xs font-mono text-zinc-400 hidden sm:block">
            TACTICAL OUTPOST • WEAPON FORGE READY
          </div>
          <button
            onClick={onClose}
            data-close-armory="true"
            className="w-full sm:w-auto px-8 py-2.5 bg-red-600 hover:bg-red-500 active:scale-98 text-white font-teko text-2xl tracking-wider rounded-xl shadow-[0_0_20px_rgba(220,38,38,0.4)] border border-red-400 cursor-pointer transition-all"
          >
            RETURN TO COMBAT
          </button>
        </div>
      </div>
    </div>
  );
};
