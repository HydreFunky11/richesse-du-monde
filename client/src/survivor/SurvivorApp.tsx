import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SurvivorEngine } from './survivorEngine';
import { SurvivorRenderer } from './survivorRenderer';
import type { WeaponId, UpgradeOption } from './survivorTypes';
import { WEAPONS, RARITIES } from './survivorConfig';
import { survivorSound } from './survivorSound';

export default function SurvivorApp() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [engine] = useState(() => new SurvivorEngine());
  const rendererRef = useRef<SurvivorRenderer | null>(null);

  const [gameState, setGameState] = useState(engine.gameState);
  const [selectedWeapon, setSelectedWeapon] = useState<WeaponId>('sword');
  const [levelUpChoices, setLevelUpChoices] = useState<UpgradeOption[]>([]);
  const [isMuted, setIsMuted] = useState(survivorSound.isMuted());
  const [aimMode, setAimMode] = useState<'mouse' | 'auto'>(engine.aimMode);

  // Input keys tracking
  const keysRef = useRef({ up: false, down: false, left: false, right: false });

  // Initialize Canvas & Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const renderer = new SurvivorRenderer(ctx);
    rendererRef.current = renderer;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      renderer.setSize(canvas.width, canvas.height);
      engine.setViewportSize(canvas.width, canvas.height);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      engine.setMousePos(x, y);
    };

    window.addEventListener('mousemove', handleMouseMove);

    let animId: number;

    const loop = (timestamp: number) => {
      engine.update(timestamp, keysRef.current);
      renderer.render(engine);

      // Synchronize state changes with React UI
      if (engine.gameState !== gameState) {
        setGameState(engine.gameState);
        if (engine.gameState === 'LEVEL_UP') {
          setLevelUpChoices([...engine.levelUpChoices]);
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [engine, gameState]);

  // Keyboard Event Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const code = e.code;
      if (code === 'KeyW' || code === 'KeyZ' || code === 'ArrowUp') keysRef.current.up = true;
      if (code === 'KeyS' || code === 'ArrowDown') keysRef.current.down = true;
      if (code === 'KeyA' || code === 'KeyQ' || code === 'ArrowLeft') keysRef.current.left = true;
      if (code === 'KeyD' || code === 'ArrowRight') keysRef.current.right = true;

      // Toggle Aiming Mode: [V]
      if (code === 'KeyV') {
        const next = engine.toggleAimMode();
        setAimMode(next);
        engine.notification = {
          text: next === 'mouse' ? '🎯 VISÉE SOURIS ACTIVÉE' : '🤖 VISÉE AUTO ACTIVÉE',
          color: next === 'mouse' ? '#38bdf8' : '#f59e0b',
          timer: 1.8
        };
        survivorSound.uiClick();
      }

      // Level up shortcuts: [1], [2], [3]
      if (engine.gameState === 'LEVEL_UP') {
        if (code === 'Digit1' && engine.levelUpChoices[0]) {
          handlePickUpgrade(engine.levelUpChoices[0]);
        } else if (code === 'Digit2' && engine.levelUpChoices[1]) {
          handlePickUpgrade(engine.levelUpChoices[1]);
        } else if (code === 'Digit3' && engine.levelUpChoices[2]) {
          handlePickUpgrade(engine.levelUpChoices[2]);
        }
      }

      // Escape to pause
      if (code === 'Escape') {
        if (engine.gameState === 'PLAYING') {
          engine.gameState = 'PAUSED';
          setGameState('PAUSED');
        } else if (engine.gameState === 'PAUSED') {
          engine.gameState = 'PLAYING';
          setGameState('PLAYING');
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const code = e.code;
      if (code === 'KeyW' || code === 'KeyZ' || code === 'ArrowUp') keysRef.current.up = false;
      if (code === 'KeyS' || code === 'ArrowDown') keysRef.current.down = false;
      if (code === 'KeyA' || code === 'KeyQ' || code === 'ArrowLeft') keysRef.current.left = false;
      if (code === 'KeyD' || code === 'ArrowRight') keysRef.current.right = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [engine]);

  const handleStartRun = () => {
    engine.startRun(selectedWeapon);
    setGameState(engine.gameState);
  };

  const handlePickUpgrade = (up: UpgradeOption) => {
    engine.selectUpgrade(up);
    setGameState(engine.gameState);
  };

  const handleToggleSound = () => {
    const muted = engine ? survivorSound.toggleMute() : false;
    setIsMuted(muted);
  };

  const handleToggleAimMode = () => {
    const next = engine.toggleAimMode();
    setAimMode(next);
    engine.notification = {
      text: next === 'mouse' ? '🎯 VISÉE SOURIS ACTIVÉE' : '🤖 VISÉE AUTO ACTIVÉE',
      color: next === 'mouse' ? '#38bdf8' : '#f59e0b',
      timer: 1.8
    };
    survivorSound.uiClick();
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none text-slate-100">
      {/* 1. Main 60 FPS Canvas Viewport */}
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 block w-full h-full ${aimMode === 'mouse' ? 'cursor-none' : 'cursor-crosshair'}`}
      />

      {/* 2. Top Header Navigation Controls */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-30">
        <button
          onClick={() => navigate('/')}
          className="pointer-events-auto px-3.5 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition shadow-lg cursor-pointer flex items-center gap-1.5"
        >
          <span>←</span> Accueil
        </button>

        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Aim Mode Toggle Button */}
          <button
            onClick={handleToggleAimMode}
            title="Basculer le mode de visée : Souris ou Automatique (Touche V)"
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition shadow-lg cursor-pointer ${
              aimMode === 'mouse'
                ? 'bg-emerald-950/90 border-emerald-500/80 text-emerald-300 hover:bg-emerald-900/90'
                : 'bg-slate-900/90 border-slate-700/80 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <span>{aimMode === 'mouse' ? '🎯 Visée : Souris' : '🤖 Visée : Auto'}</span>
            <span className="text-[10px] text-slate-400 font-mono bg-slate-800/80 px-1 py-0.5 rounded border border-slate-700/60">[V]</span>
          </button>

          <button
            onClick={handleToggleSound}
            className="w-9 h-9 rounded-xl bg-slate-900/90 border border-slate-700/80 text-sm flex items-center justify-center hover:bg-slate-800 transition cursor-pointer shadow-lg"
            title={isMuted ? 'Activer le son' : 'Couper le son'}
          >
            {isMuted ? '🔇' : '🔊'}
          </button>
          {gameState === 'PLAYING' && (
            <button
              onClick={() => {
                engine.gameState = 'PAUSED';
                setGameState('PAUSED');
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-xs font-bold hover:bg-slate-800 transition cursor-pointer shadow-lg"
            >
              ⏸️ Pause
            </button>
          )}
        </div>
      </div>

      {/* 3. Class & Weapon Selection Screen (Lobby) */}
      {gameState === 'SELECT_CLASS' && (
        <div className="absolute inset-0 bg-slate-950/92 backdrop-blur-md flex flex-col items-center justify-center p-6 z-40 animate-fade-in overflow-y-auto">
          <div className="max-w-4xl w-full text-center my-auto">
            {/* Logo & Subtitle */}
            <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 font-mono text-xs font-black tracking-widest uppercase mb-3">
              ⛏️ SURVIVOR ROGUELITE • ÉDITION MINECRAFT
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-yellow-300 to-amber-500 tracking-wide drop-shadow-md mb-2">
              MINECRAFT SURVIVOR
            </h1>
            <p className="text-sm text-slate-400 max-w-xl mx-auto mb-6">
              Affrontez 50 vagues de mobs hostiles et 5 Boss Titanesques. Choisissez votre arme unique pour toute la partie !
            </p>

            {/* Weapon Unlock Notification */}
            {engine.newUnlockAnnounced && (
              <div className="mb-6 p-3 rounded-2xl bg-amber-500/20 border-2 border-amber-400 text-amber-200 text-xs font-bold animate-bounce">
                🎉 {engine.newUnlockAnnounced}
              </div>
            )}

            {/* Weapon / Class Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6 text-left">
              {(Object.keys(WEAPONS) as WeaponId[]).map(wid => {
                const def = WEAPONS[wid];
                const isUnlocked = engine.unlockedWeapons[wid];
                const mastery = engine.weaponMasteryLevels[wid] || 1;
                const isSelected = selectedWeapon === wid;

                return (
                  <div
                    key={wid}
                    onClick={() => isUnlocked && setSelectedWeapon(wid)}
                    className={`relative p-4 rounded-2xl border-2 transition-all flex flex-col justify-between select-none ${
                      !isUnlocked
                        ? 'bg-slate-950/60 border-slate-800 opacity-60 cursor-not-allowed'
                        : isSelected
                        ? 'bg-gradient-to-b from-slate-900 to-slate-950 border-emerald-400 shadow-xl shadow-emerald-500/20 ring-2 ring-emerald-500/40 cursor-pointer scale-102'
                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-600 hover:bg-slate-900 cursor-pointer'
                    }`}
                  >
                    <div>
                      {/* Weapon Icon & Name */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-3xl">{def.icon}</span>
                        {isUnlocked ? (
                          <span className="px-2 py-0.5 rounded-full bg-slate-950 border border-slate-700 text-[10px] font-mono text-emerald-400">
                            Palier {mastery} / 30
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-rose-950/80 border border-rose-800 text-[10px] font-bold text-rose-300">
                            🔒 Verrouillé
                          </span>
                        )}
                      </div>

                      <div className="font-black text-sm text-white mb-0.5">{def.name}</div>
                      <div className="text-[11px] font-bold text-amber-400 mb-2">{def.className}</div>
                      <p className="text-xs text-slate-300 leading-relaxed mb-3">{def.description}</p>
                    </div>

                    {/* Stats or Unlock condition */}
                    {isUnlocked ? (
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-[10px] font-mono text-slate-400">
                        <div>⚔️ Dégâts : <strong className="text-white">{def.baseDamage}</strong></div>
                        <div>⚡ Vitesse : <strong className="text-white">{def.baseCooldownMs}ms</strong></div>
                        <div>🎯 Cibles : <strong className="text-white">{def.basePierce}</strong></div>
                        <div>📏 Portée : <strong className="text-white">{def.baseRange}px</strong></div>
                      </div>
                    ) : (
                      <div className="pt-2 border-t border-slate-800/80 text-[10px] text-rose-300 font-semibold">
                        Débloquez au <strong>Palier 30</strong> ou en <strong>terminant le jeu</strong> avec {WEAPONS[def.unlockReq!.weaponId].name}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Launch Button */}
            <button
              onClick={handleStartRun}
              className="px-10 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-black text-base uppercase tracking-wider transition-all shadow-xl shadow-emerald-500/25 cursor-pointer transform hover:scale-105 active:scale-95"
            >
              LANCER LA PARTIE ⛏️
            </button>

            {/* Controls hints */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs font-mono text-slate-400">
              <span className="flex items-center gap-1.5 bg-slate-900/80 px-3 py-1 rounded-lg border border-slate-800">
                ⌨️ Déplacement : <strong className="text-white">ZQSD / WASD / Flèches</strong>
              </span>
              <span className="flex items-center gap-1.5 bg-slate-900/80 px-3 py-1 rounded-lg border border-slate-800">
                🎯 Visée : <strong className="text-emerald-300">Souris</strong> (Touche <kbd className="px-1.5 py-0.5 bg-slate-800 text-white rounded border border-slate-700">V</kbd> pour Auto)
              </span>
              <span className="flex items-center gap-1.5 bg-slate-900/80 px-3 py-1 rounded-lg border border-slate-800">
                ⏸️ Pause : <strong className="text-white">Échap</strong>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 4. Level-Up Upgrade Selection Modal */}
      {gameState === 'LEVEL_UP' && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="max-w-3xl w-full bg-slate-900 border-2 border-emerald-500/80 rounded-3xl p-6 shadow-2xl text-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950 border border-emerald-600 text-emerald-300 font-mono text-xs font-black uppercase tracking-widest mb-2">
              ✨ MONTÉE DE NIVEAU !
            </div>
            <h2 className="text-3xl font-black text-white mb-1">
              NIVEAU {engine.player.level} ATTEINT
            </h2>
            <p className="text-xs text-slate-400 mb-6">
              Choisissez une amélioration pour affronter les prochaines vagues • <span className="text-emerald-400 font-mono font-bold">🍀 Chance: +{Math.round((engine.player.luck - 1) * 100)}%</span>
            </p>

            {/* Upgrades Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {levelUpChoices.map((up, idx) => {
                const rCfg = RARITIES[up.rarity];
                return (
                  <div
                    key={up.id}
                    onClick={() => handlePickUpgrade(up)}
                    className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between text-left hover:scale-104 shadow-xl ${rCfg.bgGradient} ${rCfg.border} hover:shadow-2xl`}
                  >
                    <div>
                      {/* Top rarity & icon */}
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-3xl">{up.icon}</span>
                        <span
                          className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full border shadow-sm"
                          style={{
                            color: rCfg.color,
                            borderColor: rCfg.color,
                            backgroundColor: 'rgba(0,0,0,0.5)'
                          }}
                        >
                          {rCfg.name}
                        </span>
                      </div>

                      <div className="font-black text-sm text-white mb-1">{up.name}</div>
                      <div className="text-xs text-slate-200 leading-relaxed font-medium">
                        {up.description}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
                      <span className="text-emerald-400 font-bold">Touche [{idx + 1}]</span>
                      <span className="text-white font-bold">Choisir ➔</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 5. Pause Menu */}
      {gameState === 'PAUSED' && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-center">
            <h2 className="text-2xl font-black text-white mb-4">PARTIE EN PAUSE ⏸️</h2>
            <div className="space-y-2 mb-6">
              <button
                onClick={() => {
                  engine.gameState = 'PLAYING';
                  setGameState('PLAYING');
                }}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-sm transition cursor-pointer"
              >
                Reprendre le Combat ▶️
              </button>
              <button
                onClick={() => {
                  engine.gameState = 'SELECT_CLASS';
                  setGameState('SELECT_CLASS');
                }}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-sm transition cursor-pointer"
              >
                Changer de Classe 🔄
              </button>
              <button
                onClick={() => navigate('/')}
                className="w-full py-3 bg-slate-950 hover:bg-rose-950 text-rose-300 font-bold rounded-xl text-sm transition cursor-pointer border border-slate-800"
              >
                Quitter vers l'Accueil 🚪
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Game Over Screen */}
      {gameState === 'GAME_OVER' && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="max-w-md w-full bg-slate-900 border-2 border-rose-500 rounded-3xl p-6 shadow-2xl text-center">
            <div className="text-4xl mb-2">💀</div>
            <h2 className="text-3xl font-black text-rose-500 mb-1">VOUS ÊTES MORT</h2>
            <p className="text-xs text-slate-400 mb-6">Votre âme a succombé aux créatures de la nuit...</p>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 grid grid-cols-2 gap-3 mb-6 text-left font-mono text-xs">
              <div>Vague atteinte : <strong className="text-amber-400">{engine.currentWave} / 50</strong></div>
              <div>Niveau atteint : <strong className="text-emerald-400">{engine.player.level}</strong></div>
              <div>Éliminations : <strong className="text-white">{engine.player.kills}</strong></div>
              <div>Temps de survie : <strong className="text-cyan-400">{Math.floor(engine.timeAlive)}s</strong></div>
            </div>

            {engine.newUnlockAnnounced && (
              <div className="mb-4 p-3 rounded-xl bg-amber-500/20 border border-amber-400 text-amber-300 text-xs font-bold">
                🎉 {engine.newUnlockAnnounced}
              </div>
            )}

            <div className="space-y-2">
              <button
                onClick={handleStartRun}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black rounded-xl text-sm transition cursor-pointer"
              >
                Réessayer la Vague 1 🔄
              </button>
              <button
                onClick={() => {
                  engine.checkRetroactiveUnlocks();
                  engine.gameState = 'SELECT_CLASS';
                  setGameState('SELECT_CLASS');
                }}
                className="w-full py-3 bg-slate-800 text-slate-200 font-bold rounded-xl text-sm transition cursor-pointer"
              >
                Retour au Choix de Classe
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Victory Screen (Finished Wave 50!) */}
      {gameState === 'VICTORY' && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="max-w-md w-full bg-slate-900 border-2 border-yellow-400 rounded-3xl p-6 shadow-2xl text-center">
            <div className="text-5xl mb-2">🏆</div>
            <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-amber-500 mb-1">
              VICTOIRE TOTALE !
            </h2>
            <p className="text-xs text-slate-400 mb-6">
              Vous avez terrassé The Warden et survécu aux 50 vagues de l'apocalypse !
            </p>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 grid grid-cols-2 gap-3 mb-6 text-left font-mono text-xs">
              <div>Vagues : <strong className="text-emerald-400">50 / 50 (100%)</strong></div>
              <div>Niveau : <strong className="text-amber-400">{engine.player.level}</strong></div>
              <div>Éliminations : <strong className="text-white">{engine.player.kills}</strong></div>
              <div>Temps total : <strong className="text-cyan-400">{Math.floor(engine.timeAlive)}s</strong></div>
            </div>

            {engine.newUnlockAnnounced && (
              <div className="mb-6 p-4 rounded-2xl bg-amber-500/20 border-2 border-amber-400 text-amber-200 text-xs font-bold animate-bounce shadow-xl">
                🎉 {engine.newUnlockAnnounced}
              </div>
            )}

            <button
              onClick={() => {
                engine.checkRetroactiveUnlocks();
                engine.gameState = 'SELECT_CLASS';
                setGameState('SELECT_CLASS');
              }}
              className="w-full py-3.5 bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black rounded-xl text-sm transition cursor-pointer shadow-lg hover:scale-102"
            >
              Retour aux Classes & Succès
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
