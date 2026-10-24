/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { FPSEngine } from './game/fpsEngine';
import { WeaponId, DamagePopup, AllWeaponUpgrades, UpgradeAttribute, LocationId } from './game/types';
import {
  loadSavedUpgrades,
  saveUpgrades,
  loadSavedCurrency,
  saveCurrency,
  purchaseUpgrade,
} from './game/rules';
import { soundManager } from './game/audio';
import { HUD } from './components/HUD';
import { TouchControls } from './components/TouchControls';
import { TitleScreen } from './components/TitleScreen';
import { PauseModal } from './components/PauseModal';
import { GameOverModal } from './components/GameOverModal';
import { ControlsModal } from './components/ControlsModal';
import { ArmoryModal } from './components/ArmoryModal';

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<FPSEngine | null>(null);

  // Game Phases: 'title' | 'playing' | 'paused' | 'gameover'
  const [phase, setPhase] = useState<'title' | 'playing' | 'paused' | 'gameover'>('title');

  // Persistent Weapon Upgrades & Scrap Currency
  const [upgrades, setUpgrades] = useState<AllWeaponUpgrades>(() => loadSavedUpgrades());
  const [currency, setCurrency] = useState<number>(() => loadSavedCurrency());
  const [showArmory, setShowArmory] = useState(false);

  // Selected Tactical Location
  const [selectedLocation, setSelectedLocation] = useState<LocationId>(() => {
    try {
      const saved = localStorage.getItem('outbreak_location') as LocationId;
      if (saved && ['bunker', 'cemetery', 'subway', 'city'].includes(saved)) {
        return saved;
      }
    } catch {
      // ignore
    }
    return 'bunker';
  });

  const handleSelectLocation = useCallback((locId: LocationId) => {
    setSelectedLocation(locId);
    try {
      localStorage.setItem('outbreak_location', locId);
    } catch {
      // ignore
    }
    engineRef.current?.setLocation(locId);
  }, []);

  // Player & Combat state for HUD
  const [hp, setHp] = useState(100);
  const [maxHp] = useState(100);
  const [clip, setClip] = useState(12);
  const [reserve, setReserve] = useState(60);
  const [weaponId, setWeaponId] = useState<WeaponId>('pistol');
  const [wave, setWave] = useState(1);
  const [remainingZombies, setRemainingZombies] = useState(0);
  const [totalWaveZombies, setTotalWaveZombies] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(1);
  const [quadTimer, setQuadTimer] = useState(0);
  const [speedTimer, setSpeedTimer] = useState(0);
  const [hitmarker, setHitmarker] = useState<'hit' | 'headshot' | 'kill' | null>(null);
  const [damagePopups, setDamagePopups] = useState<DamagePopup[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [isAiming, setIsAiming] = useState(false);

  // Mobile Touch Controls
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [showTouchControls, setShowTouchControls] = useState(true);

  // End of run stats
  const [gameOverStats, setGameOverStats] = useState({
    score: 0,
    wave: 1,
    kills: 0,
    headshots: 0,
    accuracy: 0,
    timeSurvived: 0,
    currencyEarned: 0,
  });

  // High Scores from localStorage
  const [highScore, setHighScore] = useState(() => {
    try {
      return Number(localStorage.getItem('outbreak_high_score')) || 0;
    } catch {
      return 0;
    }
  });

  const [highestWave, setHighestWave] = useState(() => {
    try {
      return Number(localStorage.getItem('outbreak_highest_wave')) || 1;
    } catch {
      return 1;
    }
  });

  // Synchronize document.body.dataset.state with current phase
  useEffect(() => {
    document.body.dataset.state = phase;
  }, [phase]);

  // Detect touch capability
  useEffect(() => {
    const hasTouch =
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      window.matchMedia('(pointer: coarse)').matches;
    setIsTouchDevice(hasTouch);
  }, []);

  // Initialize FPS Engine once on mount
  useEffect(() => {
    if (!canvasMountRef.current) return;

    const initialUps = loadSavedUpgrades();
    const initialCurr = loadSavedCurrency();

    const engine = new FPSEngine(
      canvasMountRef.current,
      {
        onHealthChange: (curHp) => {
          setHp(curHp);
        },
        onAmmoChange: (c, r, wId) => {
          setClip(c);
          setReserve(r);
          setWeaponId(wId);
        },
        onWaveChange: (w, rem, total) => {
          setWave(w);
          setRemainingZombies(rem);
          setTotalWaveZombies(total);
          setHighestWave((prev) => {
            const next = Math.max(prev, w);
            try {
              localStorage.setItem('outbreak_highest_wave', String(next));
            } catch {
              // ignore
            }
            return next;
          });
        },
        onScoreChange: (newScore, newCombo) => {
          setScore(newScore);
          setCombo(newCombo);
          setHighScore((prev) => {
            const next = Math.max(prev, newScore);
            try {
              localStorage.setItem('outbreak_high_score', String(next));
            } catch {
              // ignore
            }
            return next;
          });
        },
        onCurrencyChange: (totCurrency, _earnedInRun) => {
          setCurrency(totCurrency);
          saveCurrency(totCurrency);
        },
        onHitMarker: (type) => {
          setHitmarker(type);
          setTimeout(() => setHitmarker(null), 160);
        },
        onDamagePopup: (popup) => {
          setDamagePopups((prev) => [...prev.slice(-8), popup]);
          setTimeout(() => {
            setDamagePopups((prev) => prev.filter((p) => p.id !== popup.id));
          }, 800);
        },
        onPowerupChange: (quad, speed) => {
          setQuadTimer(quad);
          setSpeedTimer(speed);
        },
        onGameOver: (stats) => {
          setGameOverStats({
            ...stats,
            currencyEarned: stats.currencyEarned ?? 0,
          });
          setPhase('gameover');
          if (document.pointerLockElement) {
            document.exitPointerLock?.();
          }
        },
        onWaveCleared: (_w) => {
          // Handled cleanly
        },
      },
      initialUps,
      initialCurr,
      selectedLocation
    );

    engineRef.current = engine;

    // Start engine render loop
    engine.start();

    // Check ?autostart=1
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      setPhase('playing');
    }

    const handleResize = () => {
      engine.handleResize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  // Pointer Lock handling for desktop
  const requestGamePointerLock = useCallback(() => {
    if (phase !== 'playing' || isTouchDevice || showArmory) return;
    const canvas = canvasMountRef.current?.querySelector('canvas');
    if (canvas && document.pointerLockElement !== canvas) {
      canvas.requestPointerLock?.();
    }
  }, [phase, isTouchDevice, showArmory]);

  // Upgrade Actions
  const handlePurchaseUpgrade = (wId: WeaponId, attr: UpgradeAttribute) => {
    const res = purchaseUpgrade(upgrades, wId, attr, currency);
    if (res.success) {
      setUpgrades(res.newUpgrades);
      setCurrency(res.remainingCurrency);
      saveUpgrades(res.newUpgrades);
      saveCurrency(res.remainingCurrency);
      engineRef.current?.setUpgrades(res.newUpgrades);
      soundManager.playUpgrade();
    }
  };

  const handleScavengeDebug = () => {
    const nextVal = currency + 250;
    setCurrency(nextVal);
    saveCurrency(nextVal);
    engineRef.current?.addCurrency(250);
    soundManager.playPickup();
  };

  const handleOpenArmory = () => {
    if (phase === 'playing') {
      engineRef.current?.setPaused(true);
      setPhase('paused');
    }
    if (document.pointerLockElement) {
      document.exitPointerLock?.();
    }
    setShowArmory(true);
  };

  const handleCloseArmory = () => {
    setShowArmory(false);
  };

  // Keyboard and Mouse Event Listeners
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle Armory on U or B hotkey
      if ((e.code === 'KeyU' || e.code === 'KeyB') && !showHelp) {
        e.preventDefault();
        if (showArmory) {
          handleCloseArmory();
        } else {
          handleOpenArmory();
        }
        return;
      }

      // Close modal on Escape if Armory open
      if (e.code === 'Escape' && showArmory) {
        e.preventDefault();
        handleCloseArmory();
        return;
      }

      // Title start on Space or Enter
      if (phase === 'title' && !showArmory && (e.code === 'Space' || e.code === 'Enter')) {
        e.preventDefault();
        startGame();
        return;
      }

      // Game over restart on Space or Enter
      if (phase === 'gameover' && !showArmory && (e.code === 'Space' || e.code === 'Enter')) {
        e.preventDefault();
        restartGame();
        return;
      }

      // Pause toggle
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (phase === 'playing') {
          pauseGame();
        } else if (phase === 'paused' && !showArmory) {
          resumeGame();
        }
        return;
      }

      // Mute toggle
      if (e.code === 'KeyM') {
        toggleMute();
        return;
      }

      if (phase !== 'playing' || showArmory) return;

      // Weapon hotkeys (1-4)
      if (e.code === 'Digit1') engine.switchWeapon('pistol');
      if (e.code === 'Digit2') engine.switchWeapon('shotgun');
      if (e.code === 'Digit3') engine.switchWeapon('rifle');
      if (e.code === 'Digit4') engine.switchWeapon('magnum');

      // Reload
      if (e.code === 'KeyR') {
        engine.reload();
      }

      engine.keys[e.code] = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (engine) {
        engine.keys[e.code] = false;
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (phase !== 'playing' || showArmory) return;
      if (e.button === 0) {
        engine.isMouseDown = true;
        engine.shoot();
      } else if (e.button === 2) {
        // Right Click ADS toggle
        e.preventDefault();
        engine.touchAimToggle = !engine.touchAimToggle;
        setIsAiming(engine.touchAimToggle);
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) {
        engine.isMouseDown = false;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (phase !== 'playing' || showArmory) return;
      if (document.pointerLockElement) {
        engine.applyMouseDelta(e.movementX, e.movementY);
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [phase, showArmory, showHelp, currency, upgrades]);

  // Lifecycle control helpers
  const startGame = () => {
    soundManager.init();
    setPhase('playing');
    engineRef.current?.setPaused(false);
    requestGamePointerLock();
  };

  const pauseGame = () => {
    setPhase('paused');
    engineRef.current?.setPaused(true);
    if (document.pointerLockElement) {
      document.exitPointerLock?.();
    }
  };

  const resumeGame = () => {
    setShowArmory(false);
    setPhase('playing');
    engineRef.current?.setPaused(false);
    requestGamePointerLock();
  };

  const restartGame = () => {
    setShowArmory(false);
    engineRef.current?.restart();
    setPhase('playing');
    requestGamePointerLock();
  };

  const goHome = () => {
    setShowArmory(false);
    setPhase('title');
    engineRef.current?.setPaused(true);
    if (document.pointerLockElement) {
      document.exitPointerLock?.();
    }
  };

  const toggleMute = () => {
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
  };

  // Touch control callbacks
  const handleTouchMove = (x: number, y: number) => {
    if (engineRef.current) {
      engineRef.current.touchJoystick.x = x;
      engineRef.current.touchJoystick.y = y;
    }
  };

  const handleTouchLook = (dx: number, dy: number) => {
    if (engineRef.current) {
      engineRef.current.touchLookDelta.x += dx;
      engineRef.current.touchLookDelta.y += dy;
    }
  };

  const handleTouchFireStart = () => {
    if (engineRef.current) {
      engineRef.current.touchFireHeld = true;
      engineRef.current.shoot();
    }
  };

  const handleTouchFireEnd = () => {
    if (engineRef.current) {
      engineRef.current.touchFireHeld = false;
    }
  };

  const handleTouchReload = () => {
    engineRef.current?.reload();
  };

  const handleTouchJump = () => {
    if (engineRef.current) {
      engineRef.current.keys['Space'] = true;
    }
  };

  const handleTouchAimToggle = () => {
    if (engineRef.current) {
      const nextAim = !engineRef.current.touchAimToggle;
      engineRef.current.touchAimToggle = nextAim;
      setIsAiming(nextAim);
    }
  };

  const handleNextWeapon = () => {
    const list: WeaponId[] = ['pistol', 'shotgun', 'rifle', 'magnum'];
    const curIdx = list.indexOf(weaponId);
    const nextIdx = (curIdx + 1) % list.length;
    engineRef.current?.switchWeapon(list[nextIdx]);
  };

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden bg-black select-none font-rajdhani">
      {/* 3D WebGL Canvas Mount Container (isolated) */}
      <div
        ref={canvasMountRef}
        onClick={requestGamePointerLock}
        className="absolute inset-0 w-full h-full z-0 cursor-crosshair"
      />

      {/* Atmospheric scanlines overlay */}
      <div className="absolute inset-0 pointer-events-none apocalyptic-scanlines z-10 opacity-30" />

      {/* Title Screen Overlay */}
      {phase === 'title' && (
        <TitleScreen
          highScore={highScore}
          highestWave={highestWave}
          currency={currency}
          selectedLocation={selectedLocation}
          onSelectLocation={handleSelectLocation}
          onStart={startGame}
          onOpenArmory={handleOpenArmory}
          isTouchDevice={isTouchDevice}
        />
      )}

      {/* Active Playing HUD */}
      {phase === 'playing' && (
        <>
          <HUD
            hp={hp}
            maxHp={maxHp}
            clip={clip}
            reserve={reserve}
            weaponId={weaponId}
            locationId={selectedLocation}
            wave={wave}
            remainingZombies={remainingZombies}
            totalWaveZombies={totalWaveZombies}
            score={score}
            combo={combo}
            currency={currency}
            hitmarker={hitmarker}
            damagePopups={damagePopups}
            quadTimer={quadTimer}
            speedTimer={speedTimer}
            isMuted={isMuted}
            onToggleMute={toggleMute}
            onPause={pauseGame}
            onOpenArmory={handleOpenArmory}
            onOpenHelp={() => setShowHelp(true)}
            onSwitchWeapon={(id) => engineRef.current?.switchWeapon(id)}
            onReload={() => engineRef.current?.reload()}
            isTouchDevice={isTouchDevice}
            showTouchControls={showTouchControls}
            onToggleTouchControls={() => setShowTouchControls(!showTouchControls)}
          />

          {/* Virtual Touch Controls (shown on touch devices or if user enabled) */}
          {(isTouchDevice || showTouchControls) && (
            <TouchControls
              onMoveChange={handleTouchMove}
              onLookDelta={handleTouchLook}
              onFireStart={handleTouchFireStart}
              onFireEnd={handleTouchFireEnd}
              onReload={handleTouchReload}
              onJump={handleTouchJump}
              onToggleAim={handleTouchAimToggle}
              onNextWeapon={handleNextWeapon}
              isAiming={isAiming}
            />
          )}
        </>
      )}

      {/* Pause Modal */}
      {phase === 'paused' && !showArmory && (
        <PauseModal
          onResume={resumeGame}
          onRestart={restartGame}
          onHome={goHome}
          onOpenArmory={handleOpenArmory}
          currency={currency}
          isMuted={isMuted}
          onToggleMute={toggleMute}
          wave={wave}
          score={score}
          selectedLocation={selectedLocation}
          onSelectLocation={handleSelectLocation}
        />
      )}

      {/* Game Over Modal */}
      {phase === 'gameover' && !showArmory && (
        <GameOverModal
          stats={gameOverStats}
          totalCurrency={currency}
          highScore={highScore}
          selectedLocation={selectedLocation}
          onSelectLocation={handleSelectLocation}
          onRestart={restartGame}
          onHome={goHome}
          onOpenArmory={handleOpenArmory}
        />
      )}

      {/* Armory & Weapon Upgrade Modal */}
      {showArmory && (
        <ArmoryModal
          currency={currency}
          upgrades={upgrades}
          onPurchaseUpgrade={handlePurchaseUpgrade}
          onClose={handleCloseArmory}
          onScavengeDebug={handleScavengeDebug}
        />
      )}

      {/* Controls Help Modal */}
      {showHelp && <ControlsModal onClose={() => setShowHelp(false)} />}
    </div>
  );
}
