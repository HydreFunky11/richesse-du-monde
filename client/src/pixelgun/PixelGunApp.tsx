import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import { PixelGunEngine } from './pixelGunEngine';
import type { GameStats } from './pixelGunTypes';
import { pixelGunSound } from './pixelGunSound';

export default function PixelGunApp() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<PixelGunEngine | null>(null);

  const [isLocked, setIsLocked] = useState(false);
  const [stats, setStats] = useState<GameStats>({
    score: 0,
    kills: 0,
    headshots: 0,
    shotsFired: 0,
    shotsHit: 0,
    ammo: 30,
    maxAmmo: 30,
    isReloading: false,
    reloadProgress: 0,
    hp: 100,
    maxHp: 100,
    shield: 100,
    maxShield: 100
  });

  const [hitmarker, setHitmarker] = useState<{ active: boolean; isHeadshot: boolean }>({
    active: false,
    isHeadshot: false
  });

  const [sensitivity, setSensitivity] = useState(2.2);
  const [isMuted, setIsMuted] = useState(pixelGunSound.isMuted());
  const [screenDamageTexts, setScreenDamageTexts] = useState<
    { id: string; text: string; color: string; left: number; top: number; opacity: number }[]
  >([]);

  // Initialize 3D Engine
  useEffect(() => {
    if (!containerRef.current) return;
    const engine = new PixelGunEngine(containerRef.current);
    engineRef.current = engine;
    engine.sensitivity = sensitivity * 0.001;

    // Callbacks
    engine.onStatsChange = newStats => setStats(newStats);
    engine.onHitmarker = isHead => {
      setHitmarker({ active: true, isHeadshot: isHead });
      setTimeout(() => setHitmarker(prev => ({ ...prev, active: false })), 90);
    };

    let lastTime = performance.now();
    let animId: number;

    const loop = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      engine.update(dt);
      setIsLocked(engine.isLocked);

      // Project floating 3D damage numbers to 2D screen
      if (engine.floatingTexts.length > 0 && containerRef.current) {
        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight;
        const tempV = new THREE.Vector3();

        const projected = engine.floatingTexts
          .map(ft => {
            tempV.set(ft.x, ft.y, ft.z);
            tempV.project(engine.camera);

            // Is behind camera?
            if (tempV.z > 1) return null;

            const left = (tempV.x * 0.5 + 0.5) * w;
            const top = (-(tempV.y * 0.5) + 0.5) * h;
            const opacity = Math.min(1, ft.life / (ft.maxLife * 0.3));

            return {
              id: ft.id,
              text: ft.text,
              color: ft.color,
              left,
              top,
              opacity
            };
          })
          .filter(Boolean) as any[];

        setScreenDamageTexts(projected);
      } else {
        setScreenDamageTexts([]);
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  const handleSensitivityChange = (val: number) => {
    setSensitivity(val);
    if (engineRef.current) {
      engineRef.current.sensitivity = val * 0.001;
    }
  };

  const accuracy = stats.shotsFired > 0 ? Math.round((stats.shotsHit / stats.shotsFired) * 100) : 0;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 select-none font-sans">
      {/* 3D WebGL Canvas Container */}
      <div ref={containerRef} className="w-full h-full cursor-crosshair" />

      {/* 2D Projected Floating Damage Numbers */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
        {screenDamageTexts.map(t => (
          <div
            key={t.id}
            style={{
              left: `${t.left}px`,
              top: `${t.top}px`,
              opacity: t.opacity,
              color: t.color,
              transform: 'translate(-50%, -50%) scale(1.1)'
            }}
            className="absolute font-black text-base drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] tracking-wider"
          >
            {t.text}
          </div>
        ))}
      </div>

      {/* RETICLE / CROSSHAIR */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-30">
        <div className="relative flex items-center justify-center">
          {/* Center dot */}
          <div className="w-1.5 h-1.5 bg-white/90 rounded-full shadow-[0_0_4px_rgba(0,0,0,0.8)]" />

          {/* Cross lines */}
          <div className="absolute w-4 h-0.5 bg-white/80 -left-6" />
          <div className="absolute w-4 h-0.5 bg-white/80 -right-6" />
          <div className="absolute h-4 w-0.5 bg-white/80 -top-6" />
          <div className="absolute h-4 w-0.5 bg-white/80 -bottom-6" />

          {/* Hitmarker X */}
          {hitmarker.active && (
            <div
              className={`absolute font-black text-2xl animate-ping select-none ${
                hitmarker.isHeadshot ? 'text-amber-400 drop-shadow-[0_0_8px_#f59e0b]' : 'text-white'
              }`}
            >
              ✕
            </div>
          )}
        </div>
      </div>

      {/* TOP BAR: Score, Navigation, Audio */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-auto z-40">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (document.pointerLockElement) document.exitPointerLock();
              navigate('/');
            }}
            className="px-3.5 py-2 bg-slate-900/80 hover:bg-slate-800 text-white font-bold text-xs rounded-xl border border-slate-700 backdrop-blur-md transition flex items-center gap-1.5 shadow-lg cursor-pointer"
          >
            ← Accueil
          </button>

          <div className="px-3.5 py-1.5 bg-slate-900/80 backdrop-blur-md rounded-xl border border-slate-700 text-xs font-mono text-slate-300 flex items-center gap-3 shadow-lg">
            <span>
              Éliminations: <strong className="text-emerald-400 text-sm font-black">{stats.kills}</strong>
            </span>
            <span className="text-slate-600">•</span>
            <span>
              Headshots: <strong className="text-amber-400 text-sm font-black">{stats.headshots}</strong>
            </span>
            <span className="text-slate-600">•</span>
            <span>
              Précision: <strong className="text-cyan-400 text-sm font-black">{accuracy}%</strong>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMuted(pixelGunSound.toggleMute())}
            className="p-2 bg-slate-900/80 hover:bg-slate-800 text-white rounded-xl border border-slate-700 backdrop-blur-md transition cursor-pointer shadow-lg text-sm"
          >
            {isMuted ? '🔇' : '🔊'}
          </button>
        </div>
      </div>

      {/* BOTTOM-LEFT: Health & Shield Bar (Pixel Gun Style) */}
      <div className="absolute bottom-6 left-6 pointer-events-none z-40 flex flex-col gap-2">
        {/* Shield Bar */}
        <div className="flex items-center gap-2">
          <span className="text-sm">🛡️</span>
          <div className="w-48 h-4 bg-slate-950/80 border-2 border-cyan-600 rounded-md overflow-hidden p-0.5 shadow-lg">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-sm transition-all duration-150"
              style={{ width: `${(stats.shield / stats.maxShield) * 100}%` }}
            />
          </div>
          <span className="text-xs font-mono font-black text-cyan-400">{stats.shield}</span>
        </div>

        {/* Health Bar */}
        <div className="flex items-center gap-2">
          <span className="text-sm">❤️</span>
          <div className="w-48 h-4 bg-slate-950/80 border-2 border-red-600 rounded-md overflow-hidden p-0.5 shadow-lg">
            <div
              className="h-full bg-gradient-to-r from-rose-500 to-red-600 rounded-sm transition-all duration-150"
              style={{ width: `${(stats.hp / stats.maxHp) * 100}%` }}
            />
          </div>
          <span className="text-xs font-mono font-black text-rose-400">{stats.hp}</span>
        </div>
      </div>

      {/* BOTTOM-RIGHT: Pixel Ammo Counter & Reloading */}
      <div className="absolute bottom-6 right-6 pointer-events-none z-40 flex flex-col items-end gap-1">
        <div className="px-5 py-3 bg-slate-950/85 backdrop-blur-md rounded-2xl border-2 border-amber-500/60 shadow-2xl flex items-baseline gap-2">
          <span className="text-2xl font-black font-mono text-amber-400">
            {stats.isReloading ? '--' : stats.ammo}
          </span>
          <span className="text-xs font-mono text-slate-400">/ ∞</span>
          <span className="text-sm ml-1">🔫</span>
        </div>

        {/* Reload progress bar */}
        {stats.isReloading && (
          <div className="flex flex-col items-end gap-1 mt-1">
            <div className="w-36 h-3 bg-slate-900/90 border-2 border-amber-400 rounded-full overflow-hidden p-0.5 shadow-[0_0_12px_rgba(245,158,11,0.5)]">
              <div
                className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300 rounded-full transition-all duration-75 ease-out"
                style={{ width: `${Math.min(100, Math.max(0, stats.reloadProgress * 100))}%` }}
              />
            </div>
            <span className="text-[11px] font-mono font-black text-amber-300 tracking-wide animate-pulse">
              Rechargement... {Math.round(stats.reloadProgress * 100)}%
            </span>
          </div>
        )}

        {!stats.isReloading && (
          <span className="text-[10px] font-mono text-slate-400 mt-1">
            [R] Recharger
          </span>
        )}
      </div>

      {/* BOTTOM-CENTER: Controls Legend */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none z-30 text-[11px] font-mono text-slate-400/80 bg-slate-950/40 px-4 py-1 rounded-full border border-slate-800/40">
        [Z,Q,S,D] Déplacement • [ESPACE] Saut • [SHIFT] Sprint • [CLIC] Tir • [R] Recharger
      </div>

      {/* PAUSE / INSTRUCTIONS MODAL WHEN MOUSE IS UNLOCKED */}
      {!isLocked && (
        <div
          onClick={() => {
            if (containerRef.current) {
              containerRef.current.requestPointerLock();
            }
          }}
          className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 cursor-pointer"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="max-w-md w-full bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-amber-400 rounded-3xl p-6 shadow-2xl text-center cursor-default animate-fade-in"
          >
            <div className="text-5xl mb-2">🔫</div>
            <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-red-500 mb-1 tracking-wider">
              PIXEL GUN 3D
            </h2>
            <p className="text-xs font-bold text-amber-300/90 uppercase tracking-widest mb-5">
              Stand de Tir & Arène Cubique (Phase 1)
            </p>

            <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 text-left space-y-2 mb-5 text-xs text-slate-300">
              <div className="flex items-center justify-between">
                <span>🖱️ Viser & Tirer</span>
                <span className="font-mono text-amber-400 font-bold">Souris + Clic Gauche</span>
              </div>
              <div className="flex items-center justify-between">
                <span>🏃 Déplacement</span>
                <span className="font-mono text-emerald-400 font-bold">Z, Q, S, D</span>
              </div>
              <div className="flex items-center justify-between">
                <span>🦘 Sauter & Trampolines</span>
                <span className="font-mono text-cyan-400 font-bold">Espace</span>
              </div>
              <div className="flex items-center justify-between">
                <span>⚡ Sprint</span>
                <span className="font-mono text-purple-400 font-bold">Shift</span>
              </div>
              <div className="flex items-center justify-between">
                <span>🔄 Recharger</span>
                <span className="font-mono text-rose-400 font-bold">Touche R</span>
              </div>
            </div>

            {/* Sensitivity Slider */}
            <div className="mb-6 text-left">
              <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
                <span>Sensibilité Souris :</span>
                <span className="text-amber-400 font-bold">{sensitivity.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="6.0"
                step="0.1"
                value={sensitivity}
                onChange={e => handleSensitivityChange(parseFloat(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>

            {/* Play Button */}
            <button
              onClick={() => {
                if (containerRef.current) {
                  containerRef.current.requestPointerLock();
                }
              }}
              className="w-full py-4 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black rounded-2xl text-base uppercase tracking-wider transition shadow-xl shadow-amber-500/20 cursor-pointer transform hover:scale-102 active:scale-98"
            >
              Cliquer pour Jouer 🎯
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
