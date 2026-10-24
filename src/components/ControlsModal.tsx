import React from 'react';
import { X, Keyboard, Smartphone } from 'lucide-react';

interface ControlsModalProps {
  onClose: () => void;
}

export const ControlsModal: React.FC<ControlsModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 select-none">
      <div className="bg-zinc-950 border border-zinc-800 p-6 md:p-8 rounded-2xl max-w-lg w-full shadow-2xl flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-teko text-3xl text-white font-bold tracking-wider uppercase">
            COMBAT CONTROLS GUIDE
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col gap-5 text-xs font-mono text-zinc-300">
          {/* Desktop Controls */}
          <div>
            <div className="flex items-center gap-1.5 text-amber-400 font-bold mb-2">
              <Keyboard className="w-4 h-4" />
              <span>DESKTOP (MOUSE & KEYBOARD)</span>
            </div>
            <div className="grid grid-cols-2 gap-2 bg-zinc-900/70 p-3 rounded-lg border border-zinc-800/80">
              <div><span className="text-zinc-500">W, A, S, D:</span> Move Character</div>
              <div><span className="text-zinc-500">Mouse:</span> Look & Aim</div>
              <div><span className="text-zinc-500">Left Click:</span> Fire Weapon</div>
              <div><span className="text-zinc-500">Q / Right Click:</span> Aim Down Sights</div>
              <div><span className="text-zinc-500">R:</span> Reload Magazine</div>
              <div><span className="text-zinc-500">Space / J:</span> Jump / Vault</div>
              <div><span className="text-zinc-500">1, 2, 3, 4:</span> Switch Weapons</div>
              <div><span className="text-zinc-500">P / Esc:</span> Pause Mission</div>
            </div>
          </div>

          {/* Mobile Touch Controls */}
          <div>
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold mb-2">
              <Smartphone className="w-4 h-4" />
              <span>MOBILE & TOUCH SCREEN</span>
            </div>
            <div className="grid grid-cols-2 gap-2 bg-zinc-900/70 p-3 rounded-lg border border-zinc-800/80">
              <div><span className="text-zinc-500">Left Screen:</span> Virtual Stick (Move)</div>
              <div><span className="text-zinc-500">Right Screen:</span> Swipe (Look & Aim)</div>
              <div><span className="text-zinc-500">Red Button:</span> Fire (Tap or Hold)</div>
              <div><span className="text-zinc-500">Crosshair Icon:</span> Toggle ADS Zoom</div>
              <div><span className="text-zinc-500">Reload Icon:</span> Quick Reload</div>
              <div><span className="text-zinc-500">Chevron Icon:</span> Next Weapon</div>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full py-2.5 bg-red-600 hover:bg-red-500 text-white font-teko text-xl tracking-wider rounded-xl cursor-pointer"
        >
          BACK TO ACTION
        </button>
      </div>
    </div>
  );
};
