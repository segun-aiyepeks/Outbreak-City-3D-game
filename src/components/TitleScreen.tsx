import React from 'react';
import {
  Play,
  Crosshair,
  Skull,
  Smartphone,
  Wrench,
  MapPin,
  Building2,
  Flame,
  Check,
} from 'lucide-react';
import { WEAPON_CONFIGS } from '../game/rules';
import { LocationId } from '../game/types';
import { LOCATION_REGISTRY } from '../game/locations';

interface TitleScreenProps {
  highScore: number;
  highestWave: number;
  currency: number;
  selectedLocation: LocationId;
  onSelectLocation: (locId: LocationId) => void;
  onStart: () => void;
  onOpenArmory: () => void;
  isTouchDevice: boolean;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  highScore,
  highestWave,
  currency,
  selectedLocation,
  onSelectLocation,
  onStart,
  onOpenArmory,
}) => {
  const locationsList: LocationId[] = ['bunker', 'cemetery', 'subway', 'city'];

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-between items-center p-4 md:p-8 bg-gradient-to-t from-black via-black/85 to-transparent select-none overflow-y-auto">
      {/* Top Banner & Stats */}
      <div className="w-full flex items-center justify-between max-w-5xl">
        <div className="flex items-center gap-2 border border-zinc-800 bg-zinc-950/80 px-3 py-1.5 rounded-lg text-xs font-mono text-zinc-400">
          <Skull className="w-4 h-4 text-red-500" />
          <span>OUTBREAK 3D · SECTOR OPS</span>
        </div>

        <div className="flex items-center gap-3 md:gap-5 text-xs font-mono">
          <div className="text-zinc-400 flex items-center gap-1.5 bg-zinc-900/60 border border-amber-500/30 px-2.5 py-1 rounded-lg">
            <Wrench className="w-3.5 h-3.5 text-amber-400" />
            <span>SCRAP:</span>
            <span className="text-amber-300 font-bold font-mono text-sm ml-0.5" data-testid="title-scrap">
              {currency.toLocaleString()}
            </span>
          </div>
          <div className="text-zinc-400 hidden sm:block">
            HIGH SCORE:{' '}
            <span className="text-amber-400 font-bold font-teko text-xl ml-1">
              {highScore.toLocaleString()}
            </span>
          </div>
          <div className="text-zinc-400">
            BEST WAVE:{' '}
            <span className="text-red-400 font-bold font-teko text-xl ml-1">
              {highestWave}
            </span>
          </div>
        </div>
      </div>

      {/* Main Hero & Location Picker */}
      <div className="flex flex-col items-center text-center my-auto max-w-4xl w-full py-4">
        {/* Biohazard Emblem */}
        <div className="relative mb-2">
          <svg
            className="w-16 h-16 md:w-20 md:h-20 text-red-600 drop-shadow-[0_0_25px_rgba(239,68,68,0.6)]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="m4.93 4.93 4.24 4.24" />
            <path d="m14.83 9.17 4.24-4.24" />
            <path d="m14.83 14.83 4.24 4.24" />
            <path d="m9.17 14.83-4.24 4.24" />
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v4" />
            <path d="M12 18v4" />
            <path d="M4.93 19.07l2.83-2.83" />
            <path d="M16.24 7.76l2.83-2.83" />
          </svg>
        </div>

        <h1 className="font-teko text-5xl sm:text-7xl md:text-8xl tracking-wider text-white font-bold leading-none uppercase drop-shadow-lg">
          OUTBREAK <span className="text-red-600">HORDE 3D</span>
        </h1>
        <p className="font-rajdhani text-xs sm:text-sm md:text-base text-zinc-300 font-semibold tracking-widest uppercase mb-5 max-w-lg">
          Near-Realistic 3D Post-Apocalyptic First-Person Zombie Survivor
        </p>

        {/* Tactical Location Selection Grid */}
        <div className="w-full max-w-3xl mb-6">
          <div className="flex items-center justify-between text-xs font-mono text-zinc-400 mb-2 px-1">
            <span className="flex items-center gap-1.5 text-zinc-200">
              <MapPin className="w-3.5 h-3.5 text-red-500" />
              <span>SELECT DEPLOYMENT LOCATION</span>
            </span>
            <span className="text-[11px] text-zinc-500">
              CURRENT: <strong className="text-white uppercase">{LOCATION_REGISTRY[selectedLocation].name}</strong>
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            {locationsList.map((locId) => {
              const loc = LOCATION_REGISTRY[locId];
              const isSelected = selectedLocation === locId;

              return (
                <button
                  key={locId}
                  onClick={() => onSelectLocation(locId)}
                  className={`group relative text-left p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-zinc-900/90 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.35)] scale-[1.02]'
                      : 'bg-black/70 border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900/50'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                          isSelected
                            ? 'bg-red-600 text-white'
                            : 'bg-zinc-800 text-zinc-400 group-hover:text-zinc-200'
                        }`}
                      >
                        {loc.badge}
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-red-400" />}
                    </div>
                    <div className="font-teko text-lg text-white font-bold leading-tight uppercase">
                      {loc.name}
                    </div>
                    <p className="text-[11px] font-rajdhani text-zinc-400 line-clamp-2 mt-0.5 leading-snug">
                      {loc.subtitle}
                    </p>
                  </div>

                  <div className="mt-2 pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[10px] font-mono text-zinc-500">
                    <span className="flex items-center gap-1">
                      {locId === 'bunker' && <Building2 className="w-3 h-3 text-cyan-400" />}
                      {locId === 'cemetery' && <Skull className="w-3 h-3 text-indigo-400" />}
                      {locId === 'subway' && <Crosshair className="w-3 h-3 text-amber-400" />}
                      {locId === 'city' && <Flame className="w-3 h-3 text-red-400" />}
                      <span>ATMOSPHERE</span>
                    </span>
                    <span className="text-zinc-400 capitalize">{loc.themeHue}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Action CTAs */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <button
            onClick={onStart}
            data-start="true"
            className="group relative inline-flex items-center justify-center gap-3 px-10 py-4 bg-red-600 hover:bg-red-500 active:scale-95 text-white font-teko text-3xl tracking-widest rounded-xl shadow-[0_0_30px_rgba(220,38,38,0.6)] border border-red-400 transition-all cursor-pointer w-full sm:w-auto"
          >
            <Play className="w-7 h-7 fill-white group-hover:scale-110 transition-transform" />
            <span>START SURVIVAL</span>
          </button>

          <button
            onClick={onOpenArmory}
            data-open-armory="true"
            className="group inline-flex items-center justify-center gap-2.5 px-8 py-4 bg-zinc-900/90 hover:bg-zinc-800 border border-amber-500/50 hover:border-amber-400 text-amber-300 font-teko text-2xl tracking-widest rounded-xl shadow-lg transition-all cursor-pointer w-full sm:w-auto"
          >
            <Wrench className="w-5 h-5 text-amber-400 group-hover:rotate-45 transition-transform" />
            <span>UPGRADE ARMORY</span>
          </button>
        </div>

        {/* Arsenal Preview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mt-6 w-full max-w-3xl">
          {Object.values(WEAPON_CONFIGS).map((w) => (
            <div
              key={w.id}
              className="bg-black/60 border border-zinc-800 p-2.5 rounded-lg text-left"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-mono font-bold text-amber-400 uppercase">
                  {w.category}
                </span>
                <span className="text-[10px] font-mono text-zinc-500">
                  {w.damage} DMG
                </span>
              </div>
              <div className="font-teko text-lg text-white font-medium leading-none">
                {w.name}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Clean Control Hints Line */}
      <div className="w-full max-w-4xl border-t border-zinc-800/80 pt-3 flex flex-col md:flex-row items-center justify-between text-xs font-mono text-zinc-400 gap-2">
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap justify-center">
          <span className="flex items-center gap-1.5 text-zinc-300">
            <Crosshair className="w-3.5 h-3.5 text-red-400" />
            <span>WASD · Move</span>
          </span>
          <span>·</span>
          <span>Mouse / Swipe · Aim</span>
          <span>·</span>
          <span>Click · Shoot</span>
          <span>·</span>
          <span>R · Reload</span>
          <span>·</span>
          <span>Q · ADS</span>
        </div>

        <div className="flex items-center gap-2 text-zinc-500 text-[11px]">
          <Smartphone className="w-3.5 h-3.5 text-amber-400" />
          <span>Touch & Desktop Ready</span>
        </div>
      </div>
    </div>
  );
};
