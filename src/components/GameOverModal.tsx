import { RotateCcw, Home, Skull, Target, Award, Clock, Wrench, MapPin } from 'lucide-react';
import { LocationId } from '../game/types';
import { LOCATION_REGISTRY } from '../game/locations';

interface GameOverModalProps {
  stats: {
    score: number;
    wave: number;
    kills: number;
    headshots: number;
    accuracy: number;
    timeSurvived: number;
    currencyEarned?: number;
  };
  totalCurrency: number;
  highScore: number;
  selectedLocation: LocationId;
  onSelectLocation: (locId: LocationId) => void;
  onRestart: () => void;
  onHome: () => void;
  onOpenArmory: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  stats,
  totalCurrency,
  highScore,
  selectedLocation,
  onSelectLocation,
  onRestart,
  onHome,
  onOpenArmory,
}) => {
  const isNewHigh = stats.score >= highScore && stats.score > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 select-none overflow-y-auto">
      <div className="bg-zinc-950 border border-red-900/60 p-6 md:p-8 rounded-2xl max-w-lg w-full shadow-[0_0_50px_rgba(220,38,38,0.35)] flex flex-col items-center text-center my-auto">
        {/* Skull Icon */}
        <div className="w-16 h-16 rounded-full bg-red-950/80 border border-red-600/60 flex items-center justify-center mb-3 text-red-500 shadow-lg">
          <Skull className="w-9 h-9" />
        </div>

        <h2 className="font-teko text-5xl md:text-6xl text-white font-bold tracking-wider uppercase leading-none mb-1">
          KILLED IN <span className="text-red-600">ACTION</span>
        </h2>
        <p className="text-zinc-400 font-mono text-xs uppercase tracking-widest mb-6">
          YOU WERE OVERRUN BY THE HORDE
        </p>

        {/* New High Score Callout */}
        {isNewHigh && (
          <div className="mb-4 bg-amber-500/20 border border-amber-500 text-amber-300 font-mono text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 animate-bounce">
            <Award className="w-4 h-4 text-amber-400" />
            <span>NEW HIGH SCORE RECORD!</span>
          </div>
        )}

        {/* Detailed Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 w-full mb-4">
          <div className="bg-zinc-900/90 border border-zinc-800 p-2.5 rounded-xl">
            <span className="text-[10px] text-zinc-500 font-mono uppercase block">
              FINAL SCORE
            </span>
            <span className="font-teko text-2xl md:text-3xl text-amber-400 font-bold leading-none">
              {stats.score.toLocaleString()}
            </span>
          </div>

          <div className="bg-zinc-900/90 border border-zinc-800 p-2.5 rounded-xl">
            <span className="text-[10px] text-zinc-500 font-mono uppercase block">
              WAVE REACHED
            </span>
            <span className="font-teko text-2xl md:text-3xl text-red-500 font-bold leading-none">
              {stats.wave}
            </span>
          </div>

          <div className="bg-zinc-900/90 border border-zinc-800 p-2.5 rounded-xl">
            <span className="text-[10px] text-zinc-500 font-mono uppercase block">
              INFECTED KILLS
            </span>
            <span className="font-teko text-2xl md:text-3xl text-white font-bold leading-none">
              {stats.kills}
            </span>
          </div>

          <div className="bg-zinc-900/90 border border-zinc-800 p-2.5 rounded-xl">
            <span className="text-[10px] text-zinc-500 font-mono uppercase block">
              HEADSHOTS
            </span>
            <span className="font-teko text-2xl md:text-3xl text-emerald-400 font-bold leading-none">
              {stats.headshots}
            </span>
          </div>
        </div>

        {/* Secondary metrics */}
        <div className="flex items-center justify-between w-full text-xs font-mono text-zinc-400 px-3 py-2 bg-zinc-900/50 rounded-lg mb-4 border border-zinc-800">
          <div className="flex items-center gap-1">
            <Target className="w-3.5 h-3.5 text-amber-400" />
            <span>ACCURACY: {stats.accuracy}%</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span>TIME: {Math.floor(stats.timeSurvived / 60)}m {stats.timeSurvived % 60}s</span>
          </div>
        </div>

        {/* Scrap Earned Highlight */}
        <div className="flex items-center justify-between w-full px-4 py-2.5 bg-amber-950/30 border border-amber-500/40 rounded-xl mb-4">
          <div className="flex items-center gap-2 text-left">
            <Wrench className="w-5 h-5 text-amber-400" />
            <div>
              <span className="text-[10px] text-zinc-400 font-mono uppercase block">SALVAGE COLLECTED</span>
              <span className="text-xs text-amber-300 font-mono">TOTAL BANK: {totalCurrency.toLocaleString()} SCRAP</span>
            </div>
          </div>
          <div className="font-mono text-2xl font-bold text-amber-400">
            +{stats.currencyEarned ?? 0} SCRAP
          </div>
        </div>

        {/* Change Deployment Location */}
        <div className="w-full mb-4 text-left">
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-400 mb-1.5">
            <MapPin className="w-3.5 h-3.5 text-red-500" />
            <span>DEPLOYMENT ZONE:</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {(['bunker', 'cemetery', 'subway', 'city'] as LocationId[]).map((locId) => {
              const loc = LOCATION_REGISTRY[locId];
              const isSelected = selectedLocation === locId;
              return (
                <button
                  key={locId}
                  onClick={() => onSelectLocation(locId)}
                  className={`px-2 py-1.5 rounded-lg border text-left text-xs font-mono transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-zinc-800 border-red-500 text-white font-bold shadow'
                      : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <span className="truncate">{loc.name}</span>
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0 ml-1"
                    style={{ backgroundColor: loc.accentHex }}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-col gap-2.5 w-full">
          <button
            onClick={onRestart}
            data-start="true"
            className="w-full py-3.5 bg-red-600 hover:bg-red-500 active:scale-98 text-white font-teko text-2xl tracking-wider rounded-xl shadow-[0_0_20px_rgba(220,38,38,0.5)] flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <RotateCcw className="w-5 h-5" />
            <span>DEPLOY AGAIN (SPACE / ENTER)</span>
          </button>

          <button
            onClick={onOpenArmory}
            data-open-armory="true"
            className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 border border-amber-500/60 text-amber-300 font-teko text-2xl tracking-wider rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <Wrench className="w-5 h-5 text-amber-400" />
            <span>UPGRADE ARMORY ({totalCurrency.toLocaleString()} SCRAP)</span>
          </button>

          <button
            onClick={onHome}
            className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-teko text-xl tracking-wider rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <Home className="w-4 h-4" />
            <span>RETURN TO BASE</span>
          </button>
        </div>
      </div>
    </div>
  );
};
