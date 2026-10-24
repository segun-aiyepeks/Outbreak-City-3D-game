import { Play, RotateCcw, Home, Volume2, VolumeX, Wrench, MapPin } from 'lucide-react';
import { LocationId } from '../game/types';
import { LOCATION_REGISTRY } from '../game/locations';

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onHome: () => void;
  onOpenArmory: () => void;
  currency: number;
  isMuted: boolean;
  onToggleMute: () => void;
  wave: number;
  score: number;
  selectedLocation: LocationId;
  onSelectLocation: (locId: LocationId) => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onRestart,
  onHome,
  onOpenArmory,
  currency,
  isMuted,
  onToggleMute,
  wave,
  score,
  selectedLocation,
  onSelectLocation,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 select-none">
      <div className="bg-zinc-950 border border-zinc-800 p-6 md:p-8 rounded-2xl max-w-md w-full shadow-2xl flex flex-col items-center text-center">
        <h2 className="font-teko text-5xl text-white font-bold tracking-wider uppercase mb-1">
          MISSION PAUSED
        </h2>
        <p className="text-zinc-400 font-mono text-xs uppercase tracking-widest mb-6">
          TACTICAL SURVIVAL SUSPENDED
        </p>

        {/* Current Run Metrics */}
        <div className="grid grid-cols-2 gap-3 w-full mb-4">
          <div className="bg-zinc-900/80 border border-zinc-800 p-3 rounded-lg text-center">
            <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider block">
              CURRENT WAVE
            </span>
            <span className="font-teko text-3xl text-red-500 font-bold leading-none">
              {wave}
            </span>
          </div>
          <div className="bg-zinc-900/80 border border-zinc-800 p-3 rounded-lg text-center">
            <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider block">
              TOTAL SCORE
            </span>
            <span className="font-teko text-3xl text-amber-400 font-bold leading-none">
              {score.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Scrap Indicator */}
        <div className="w-full bg-black/50 border border-amber-500/40 px-3.5 py-2 rounded-xl flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-mono text-zinc-400">SALVAGED SCRAP</span>
          </div>
          <span className="font-mono text-lg font-bold text-amber-300">
            {currency.toLocaleString()}
          </span>
        </div>

        {/* Change Location Selector */}
        <div className="w-full mb-5 text-left">
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-400 mb-1.5">
            <MapPin className="w-3.5 h-3.5 text-red-500" />
            <span>DEPLOYMENT LOCATION:</span>
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

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5 w-full">
          <button
            onClick={onResume}
            className="w-full py-3 bg-red-600 hover:bg-red-500 active:scale-98 text-white font-teko text-2xl tracking-wider rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <Play className="w-5 h-5 fill-white" />
            <span>RESUME MISSION</span>
          </button>

          <button
            onClick={onOpenArmory}
            data-open-armory="true"
            className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-amber-500/50 text-amber-300 font-teko text-xl tracking-wider rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <Wrench className="w-4 h-4 text-amber-400" />
            <span>UPGRADE ARMORY ({currency} SCRAP)</span>
          </button>

          <button
            onClick={onRestart}
            className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 font-teko text-xl tracking-wider rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            <span>RESTART FROM WAVE 1</span>
          </button>

          <div className="grid grid-cols-2 gap-2 mt-1">
            <button
              onClick={onToggleMute}
              className="py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-mono rounded-lg flex items-center justify-center gap-1.5 transition-all"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
              <span>{isMuted ? 'UNMUTE' : 'MUTE'}</span>
            </button>

            <button
              onClick={onHome}
              className="py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-mono rounded-lg flex items-center justify-center gap-1.5 transition-all"
            >
              <Home className="w-4 h-4" />
              <span>MAIN MENU</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
