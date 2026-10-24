import { WeaponId, DamagePopup, LocationId } from '../game/types';
import { WEAPON_CONFIGS } from '../game/rules';
import { LOCATION_REGISTRY } from '../game/locations';
import { Volume2, VolumeX, Pause, HelpCircle, Shield, Zap, Flame, Wrench } from 'lucide-react';

interface HUDProps {
  hp: number;
  maxHp: number;
  clip: number;
  reserve: number;
  weaponId: WeaponId;
  locationId: LocationId;
  wave: number;
  remainingZombies: number;
  totalWaveZombies: number;
  score: number;
  combo: number;
  currency: number;
  hitmarker: 'hit' | 'headshot' | 'kill' | null;
  damagePopups: DamagePopup[];
  quadTimer: number;
  speedTimer: number;
  isMuted: boolean;
  onToggleMute: () => void;
  onPause: () => void;
  onOpenArmory: () => void;
  onOpenHelp: () => void;
  onSwitchWeapon: (id: WeaponId) => void;
  onReload: () => void;
  isTouchDevice: boolean;
  showTouchControls: boolean;
  onToggleTouchControls: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  hp,
  maxHp,
  clip,
  reserve,
  weaponId,
  locationId,
  wave,
  remainingZombies,
  totalWaveZombies,
  score,
  combo,
  currency,
  hitmarker,
  damagePopups,
  quadTimer,
  speedTimer,
  isMuted,
  onToggleMute,
  onPause,
  onOpenArmory,
  onOpenHelp,
  onSwitchWeapon,
  onReload,
  showTouchControls,
  onToggleTouchControls,
}) => {
  const activeWeapon = WEAPON_CONFIGS[weaponId];
  const hpPercent = Math.max(0, Math.min(100, (hp / maxHp) * 100));
  const isLowHp = hp <= 25;
  const currentLoc = LOCATION_REGISTRY[locationId] || LOCATION_REGISTRY.bunker;

  const weaponsList: WeaponId[] = ['pistol', 'shotgun', 'rifle', 'magnum'];

  return (
    <div className="fixed inset-0 pointer-events-none select-none z-20 flex flex-col justify-between p-3 md:p-6 overflow-hidden">
      {/* Low HP blood vignette overlay */}
      {isLowHp && (
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-300"
          style={{
            boxShadow: 'inset 0 0 100px rgba(220, 38, 38, 0.65)',
            border: '2px solid rgba(239, 68, 68, 0.4)',
          }}
        />
      )}

      {/* TOP BAR CLUSTER */}
      <div className="flex items-start justify-between w-full">
        {/* Wave and Remaining Meter */}
        <div className="flex flex-col gap-1">
          {/* Location Badge */}
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-300 bg-black/70 border border-zinc-800 px-2.5 py-0.5 rounded-md w-fit shadow-md">
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: currentLoc.accentHex }}
            />
            <span className="uppercase font-bold tracking-wider">{currentLoc.name}</span>
          </div>

          <div className="flex items-center gap-2 bg-black/60 border border-zinc-800 px-3 py-1.5 rounded-lg shadow-lg">
            <span className="text-red-500 font-teko text-2xl tracking-wider uppercase leading-none">
              WAVE {String(wave).padStart(2, '0')}
            </span>
            <div className="h-4 w-px bg-zinc-700" />
            <div className="flex flex-col">
              <span className="text-[10px] text-zinc-400 font-mono tracking-widest uppercase">
                INFECTED REMAINING
              </span>
              <div className="flex items-center gap-1.5">
                <div className="w-24 md:w-36 h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                  <div
                    className="h-full bg-red-600 transition-all duration-200"
                    style={{
                      width: `${totalWaveZombies > 0 ? (remainingZombies / totalWaveZombies) * 100 : 0}%`,
                    }}
                  />
                </div>
                <span className="text-xs font-mono font-bold text-red-400">
                  {remainingZombies}
                </span>
              </div>
            </div>
          </div>

          {/* Active Powerup Badges */}
          <div className="flex items-center gap-2 mt-1">
            {quadTimer > 0 && (
              <div className="flex items-center gap-1 bg-amber-500/20 border border-amber-500 px-2 py-0.5 rounded text-[11px] font-bold text-amber-400 animate-pulse">
                <Flame className="w-3.5 h-3.5" />
                <span>QUAD DAMAGE ({quadTimer.toFixed(0)}s)</span>
              </div>
            )}
            {speedTimer > 0 && (
              <div className="flex items-center gap-1 bg-purple-500/20 border border-purple-500 px-2 py-0.5 rounded text-[11px] font-bold text-purple-400 animate-pulse">
                <Zap className="w-3.5 h-3.5" />
                <span>SPEED BOOST ({speedTimer.toFixed(0)}s)</span>
              </div>
            )}
          </div>
        </div>

        {/* Score & Scrap Cluster */}
        <div className="flex items-center gap-2">
          {/* Score & Combo */}
          <div className="flex flex-col items-center">
            <div className="bg-black/60 border border-zinc-800 px-3 md:px-4 py-1 rounded-lg text-center shadow-lg">
              <span className="text-[10px] text-zinc-400 tracking-widest font-mono uppercase">
                SCORE
              </span>
              <div className="text-xl md:text-2xl font-teko text-amber-400 font-bold tracking-wider leading-none">
                {score.toLocaleString()}
              </div>
            </div>
            {combo > 1 && (
              <div className="mt-1 bg-red-600/90 text-white font-rajdhani font-bold px-2 py-0.5 rounded-full text-xs shadow-md border border-red-400">
                COMBO x{combo}!
              </div>
            )}
          </div>

          {/* Salvage Scrap Badge */}
          <div className="bg-black/60 border border-amber-500/40 px-3 py-1 rounded-lg text-center shadow-lg hidden sm:flex sm:flex-col items-center">
            <span className="text-[10px] text-amber-400/80 tracking-widest font-mono uppercase flex items-center gap-1">
              <Wrench className="w-2.5 h-2.5" /> SCRAP
            </span>
            <div className="text-xl md:text-2xl font-mono text-amber-300 font-bold tracking-wider leading-none" data-testid="hud-scrap">
              {currency.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Top Right Utility Buttons */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          <button
            onClick={onOpenArmory}
            title="Armory & Weapon Upgrades"
            data-open-armory="true"
            className="px-2.5 py-1.5 rounded-lg bg-amber-950/60 border border-amber-500/60 text-amber-300 hover:text-white hover:bg-amber-900 transition-colors flex items-center gap-1.5 text-xs font-mono font-bold cursor-pointer shadow-lg"
          >
            <Wrench className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">ARMORY</span>
          </button>
          <button
            onClick={onToggleTouchControls}
            title="Toggle On-Screen Touch Controls"
            aria-label="Toggle Touch Controls"
            className={`p-2 rounded-lg border text-xs font-mono transition-colors ${
              showTouchControls
                ? 'bg-amber-600/30 border-amber-500 text-amber-300'
                : 'bg-black/60 border-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            TOUCH
          </button>
          <button
            onClick={onOpenHelp}
            title="Controls Guide"
            aria-label="Controls Guide"
            className="p-2 rounded-lg bg-black/60 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
          <button
            onClick={onToggleMute}
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            aria-label={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            className="p-2 rounded-lg bg-black/60 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button
            onClick={onPause}
            title="Pause Game [P / Esc]"
            aria-label="Pause Game"
            className="p-2 rounded-lg bg-black/60 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* CENTER RETICLE & HITMARKER */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center">
        {/* Dynamic Crosshair */}
        <div className="relative w-8 h-8 flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-white/80 shadow-[0_0_4px_white]" />
          {/* Outer cross ticks */}
          <div className="absolute top-0 w-0.5 h-2 bg-white/70" />
          <div className="absolute bottom-0 w-0.5 h-2 bg-white/70" />
          <div className="absolute left-0 w-2 h-0.5 bg-white/70" />
          <div className="absolute right-0 w-2 h-0.5 bg-white/70" />

          {/* Hitmarker animation */}
          {hitmarker && (
            <div
              className={`absolute inset-0 flex items-center justify-center transition-transform ${
                hitmarker === 'headshot'
                  ? 'scale-150 text-amber-400'
                  : hitmarker === 'kill'
                  ? 'scale-125 text-red-500'
                  : 'scale-100 text-white'
              }`}
            >
              <svg className="w-8 h-8" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <line x1="4" y1="4" x2="8" y2="8" />
                <line x1="20" y1="4" x2="16" y2="8" />
                <line x1="4" y1="20" x2="8" y2="16" />
                <line x1="20" y1="20" x2="16" y2="16" />
              </svg>
            </div>
          )}
        </div>

        {/* Floating Damage Numbers */}
        {damagePopups.map((d) => (
          <div
            key={d.id}
            className={`absolute font-teko text-xl font-bold pointer-events-none transition-all duration-300 ${
              d.isHeadshot
                ? 'text-amber-400 text-2xl -translate-y-8 scale-125'
                : d.isCrit
                ? 'text-red-500 text-xl -translate-y-6'
                : 'text-white text-lg -translate-y-4'
            }`}
          >
            {d.isHeadshot ? `CRIT ${d.amount}` : d.amount}
          </div>
        ))}
      </div>

      {/* BOTTOM CLUSTERS */}
      <div className="flex items-end justify-between w-full gap-2">
        {/* Vitality / Health Box */}
        <div className="bg-black/75 border border-zinc-800 p-2 md:p-3 rounded-xl shadow-2xl flex flex-col gap-1 w-36 md:min-w-[210px] z-10 pointer-events-auto">
          <div className="flex items-center justify-between text-[11px] md:text-xs font-mono font-bold">
            <span className="flex items-center gap-1 text-emerald-400">
              <Shield className="w-3 h-3 md:w-3.5 md:h-3.5" />
              <span>HP</span>
            </span>
            <span
              className={`text-xs md:text-sm ${
                isLowHp ? 'text-red-500 font-extrabold animate-pulse' : 'text-zinc-200'
              }`}
            >
              {hp}
            </span>
          </div>

          <div className="w-full h-2 md:h-3 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800 p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-200 ${
                isLowHp
                  ? 'bg-red-600'
                  : hpPercent < 50
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${hpPercent}%` }}
            />
          </div>

          <div className="hidden md:flex items-center justify-between text-[10px] text-zinc-500 font-mono mt-0.5">
            <span>ARMOR: 100%</span>
            <span>STATUS: {isLowHp ? 'CRITICAL' : 'OPTIMAL'}</span>
          </div>
        </div>

        {/* Weapon Arsenal & Ammo Dock */}
        <div className="bg-black/75 border border-zinc-800 p-2 md:p-3 rounded-xl shadow-2xl flex flex-col items-end gap-1.5 pointer-events-auto max-w-[220px] md:max-w-none">
          {/* Active Ammo Count */}
          <div className="flex items-baseline gap-2">
            <span className="text-zinc-400 text-[10px] md:text-xs font-mono uppercase tracking-wider truncate max-w-[100px] md:max-w-none">
              {activeWeapon.name}
            </span>
            <div className="flex items-baseline font-teko">
              <span
                className={`text-3xl md:text-5xl font-bold leading-none ${
                  clip <= 3 ? 'text-red-500 animate-pulse' : 'text-amber-400'
                }`}
              >
                {clip}
              </span>
              <span className="text-sm md:text-xl text-zinc-500 font-normal ml-1">
                / {reserve}
              </span>
            </div>
          </div>

          {/* Quick Reload Button if low */}
          {clip < activeWeapon.magSize && (
            <button
              onClick={onReload}
              className="text-[10px] md:text-[11px] font-mono font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 px-2 py-0.5 rounded transition-all"
            >
              RELOAD [R]
            </button>
          )}

          {/* Weapon Slots Selector (1, 2, 3, 4) */}
          <div className="flex items-center gap-1 mt-0.5">
            {weaponsList.map((id, idx) => {
              const cfg = WEAPON_CONFIGS[id];
              const isSelected = id === weaponId;
              return (
                <button
                  key={id}
                  onClick={() => onSwitchWeapon(id)}
                  className={`px-2 py-0.5 md:px-2.5 md:py-1 rounded text-[10px] md:text-xs font-mono font-bold transition-all border ${
                    isSelected
                      ? 'bg-zinc-800 border-amber-400 text-amber-400 shadow-md scale-105'
                      : 'bg-zinc-900/80 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <span className="text-[9px] text-zinc-600 mr-0.5">{idx + 1}</span>
                  {cfg.category.slice(0, 3)}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
