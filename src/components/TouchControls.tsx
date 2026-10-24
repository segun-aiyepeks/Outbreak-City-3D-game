import React, { useRef, useState, useEffect } from 'react';
import { Crosshair, RotateCcw, ArrowUpCircle, ChevronRight } from 'lucide-react';

interface TouchControlsProps {
  onMoveChange: (x: number, y: number) => void;
  onLookDelta: (dx: number, dy: number) => void;
  onFireStart: () => void;
  onFireEnd: () => void;
  onReload: () => void;
  onJump: () => void;
  onToggleAim: () => void;
  onNextWeapon: () => void;
  isAiming: boolean;
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  onMoveChange,
  onLookDelta,
  onFireStart,
  onFireEnd,
  onReload,
  onJump,
  onToggleAim,
  onNextWeapon,
  isAiming,
}) => {
  const joystickZoneRef = useRef<HTMLDivElement>(null);
  const lookZoneRef = useRef<HTMLDivElement>(null);

  // Joystick state
  const [joystickActive, setJoystickActive] = useState(false);
  const [joystickCenter, setJoystickCenter] = useState({ x: 0, y: 0 });
  const [joystickKnob, setJoystickKnob] = useState({ x: 0, y: 0 });
  const joystickTouchId = useRef<number | null>(null);

  // Look touch state
  const lookTouchId = useRef<number | null>(null);
  const lastLookPos = useRef({ x: 0, y: 0 });

  // Joystick Touch Events
  useEffect(() => {
    const zone = joystickZoneRef.current;
    if (!zone) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (joystickTouchId.current !== null) return;
      const touch = e.changedTouches[0];
      joystickTouchId.current = touch.identifier;

      const rect = zone.getBoundingClientRect();
      const startX = touch.clientX - rect.left;
      const startY = touch.clientY - rect.top;

      setJoystickActive(true);
      setJoystickCenter({ x: startX, y: startY });
      setJoystickKnob({ x: 0, y: 0 });
      onMoveChange(0, 0);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (joystickTouchId.current === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === joystickTouchId.current) {
          const rect = zone.getBoundingClientRect();
          const curX = touch.clientX - rect.left;
          const curY = touch.clientY - rect.top;

          const dx = curX - joystickCenter.x;
          const dy = curY - joystickCenter.y;
          const dist = Math.hypot(dx, dy);
          const maxRadius = 45;

          const clampedDist = Math.min(dist, maxRadius);
          const angle = Math.atan2(dy, dx);

          const knobX = Math.cos(angle) * clampedDist;
          const knobY = Math.sin(angle) * clampedDist;

          setJoystickKnob({ x: knobX, y: knobY });

          // Send normalized values (Y is forward so inverted)
          onMoveChange(knobX / maxRadius, -knobY / maxRadius);
          break;
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === joystickTouchId.current) {
          joystickTouchId.current = null;
          setJoystickActive(false);
          setJoystickKnob({ x: 0, y: 0 });
          onMoveChange(0, 0);
          break;
        }
      }
    };

    zone.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      zone.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [joystickCenter, onMoveChange]);

  // Look Touchpad Events
  useEffect(() => {
    const zone = lookZoneRef.current;
    if (!zone) return;

    const handleTouchStart = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        // Don't claim if clicking button elements
        const target = touch.target as HTMLElement;
        if (target.closest('button')) continue;

        if (lookTouchId.current === null) {
          lookTouchId.current = touch.identifier;
          lastLookPos.current = { x: touch.clientX, y: touch.clientY };
          break;
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (lookTouchId.current === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === lookTouchId.current) {
          const dx = touch.clientX - lastLookPos.current.x;
          const dy = touch.clientY - lastLookPos.current.y;
          lastLookPos.current = { x: touch.clientX, y: touch.clientY };

          onLookDelta(dx, dy);
          break;
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === lookTouchId.current) {
          lookTouchId.current = null;
          break;
        }
      }
    };

    zone.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      zone.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [onLookDelta]);

  return (
    <div className="fixed inset-0 pointer-events-none select-none z-30 flex">
      {/* LEFT HALF: VIRTUAL JOYSTICK ZONE */}
      <div
        ref={joystickZoneRef}
        className="w-1/2 h-full pointer-events-auto relative touch-none"
      >
        {/* Render joystick base and knob when active or idle hint */}
        {joystickActive ? (
          <div
            className="absolute rounded-full border-2 border-white/30 bg-black/40 flex items-center justify-center -translate-x-1/2 -translate-y-1/2"
            style={{
              left: joystickCenter.x,
              top: joystickCenter.y,
              width: 110,
              height: 110,
            }}
          >
            {/* Knob */}
            <div
              className="w-12 h-12 rounded-full bg-amber-500/80 shadow-lg border border-white/60"
              style={{
                transform: `translate(${joystickKnob.x}px, ${joystickKnob.y}px)`,
              }}
            />
          </div>
        ) : (
          <div className="absolute bottom-28 left-6 md:bottom-24 md:left-12 w-24 h-24 md:w-28 md:h-28 rounded-full border border-dashed border-zinc-600/50 flex items-center justify-center pointer-events-none">
            <span className="text-[10px] md:text-[11px] font-mono text-zinc-500 uppercase tracking-widest">
              MOVE
            </span>
          </div>
        )}
      </div>

      {/* RIGHT HALF: LOOK SWIPE ZONE + ACTION BUTTONS */}
      <div
        ref={lookZoneRef}
        className="w-1/2 h-full pointer-events-auto relative touch-none flex flex-col justify-end items-end p-3 md:p-8"
      >
        {/* Action Buttons Matrix */}
        <div className="flex flex-col items-end gap-2.5 md:gap-3 pointer-events-auto mb-20 md:mb-16">
          <div className="flex items-center gap-3">
            {/* Cycle Weapon Button */}
            <button
              onClick={onNextWeapon}
              aria-label="Next Weapon"
              className="w-13 h-13 rounded-full bg-black/60 border border-zinc-700 active:scale-95 text-zinc-300 flex items-center justify-center shadow-lg"
            >
              <ChevronRight className="w-6 h-6" />
            </button>

            {/* Jump Button */}
            <button
              onClick={onJump}
              aria-label="Jump"
              className="w-13 h-13 rounded-full bg-zinc-800/80 border border-zinc-600 active:scale-95 text-white flex items-center justify-center shadow-lg"
            >
              <ArrowUpCircle className="w-6 h-6" />
            </button>

            {/* Aim / ADS Toggle */}
            <button
              onClick={onToggleAim}
              aria-label="Aim Down Sights"
              className={`w-13 h-13 rounded-full border active:scale-95 flex items-center justify-center shadow-lg transition-colors ${
                isAiming
                  ? 'bg-amber-500 border-white text-black font-bold'
                  : 'bg-black/60 border-zinc-700 text-zinc-300'
              }`}
            >
              <Crosshair className="w-6 h-6" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Reload Button */}
            <button
              onClick={onReload}
              aria-label="Reload Weapon"
              className="w-14 h-14 rounded-full bg-zinc-900/90 border border-amber-500/60 active:scale-95 text-amber-400 flex items-center justify-center shadow-xl"
            >
              <RotateCcw className="w-6 h-6" />
            </button>

            {/* Primary Big FIRE Button */}
            <button
              onTouchStart={(e) => {
                e.preventDefault();
                onFireStart();
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                onFireEnd();
              }}
              onMouseDown={onFireStart}
              onMouseUp={onFireEnd}
              aria-label="Fire Weapon"
              className="w-20 h-20 rounded-full bg-red-600 active:bg-red-700 active:scale-95 border-2 border-red-300 text-white font-teko text-2xl tracking-widest flex items-center justify-center shadow-[0_0_20px_rgba(220,38,38,0.5)]"
            >
              FIRE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
