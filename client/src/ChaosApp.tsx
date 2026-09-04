import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import type { ChaosGameState, ChaosCell, ChaosDuelState } from './chaos/chaosTypes';

// Use production websocket url or origin, never localhost on deployed domains
const SERVER_URL =
  import.meta.env.VITE_WS_SERVER_URL ||
  import.meta.env.VITE_SERVER_URL ||
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost'
    ? 'https://richesse-du-monde-server.onrender.com'
    : 'http://localhost:3001');

const RULE_SUGGESTIONS = [
  "Invoquer un Dragon Ancestral (3 ATK) sur le plateau !",
  "Ajouter une nouvelle case Donjon Maudit en (3, 0) !",
  "Supprimer la case du milieu du plateau !",
  "Transformer la case (0, 0) en Fosse de Lave mortelle (-1 PV) !",
  "Ajouter une nouvelle stat Armure (base 1) !",
  "Tous les duels PvP font perdre 2 PV au perdant au lieu de 1 !",
  "Chaque déplacement redonne 1 PV."
];

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT: ROULETTE DU DESTIN (WHEEL OF FORTUNE MODAL)
// ─────────────────────────────────────────────────────────────────────────────
function RouletteModal({ duel, onResolve }: { duel: ChaosDuelState; onResolve: () => void }) {
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(true);
  const [hasLanded, setHasLanded] = useState(false);

  useEffect(() => {
    // Start rotation shortly after mount
    const spinTimer = setTimeout(() => {
      setRotation(duel.targetAngle);
    }, 120);

    const landTimer = setTimeout(() => {
      setIsSpinning(false);
      setHasLanded(true);
    }, 3350);

    return () => {
      clearTimeout(spinTimer);
      clearTimeout(landTimer);
    };
  }, [duel]);

  const attackerSliceDeg = (duel.attackerChance / 100) * 360;
  const gradient = `conic-gradient(${duel.attackerColor || '#ef4444'} 0deg ${attackerSliceDeg}deg, ${duel.defenderColor || '#3b82f6'} ${attackerSliceDeg}deg 360deg)`;

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in select-none">
      <div className="max-w-lg w-full bg-slate-900 border-2 border-amber-500 rounded-3xl p-6 shadow-2xl text-center relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-44 h-44 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="mb-3">
          <span className="text-[10px] uppercase font-black tracking-widest text-amber-400 bg-amber-950/80 px-2.5 py-1 rounded-full border border-amber-800">
            🎰 Duel PvP • La Roulette du Destin
          </span>
          <h2 className="text-2xl font-black text-white mt-1">
            {isSpinning ? 'LA ROUE DU DESTIN TOURNE...' : 'LE VERDICT EST TOMBÉ !'}
          </h2>
        </div>

        {/* Duelists Cards: Attacker vs Defender */}
        <div className="grid grid-cols-5 items-center gap-2 mb-4">
          {/* Attacker */}
          <div className="col-span-2 p-2.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col items-center">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black text-white shadow-lg mb-1"
              style={{ backgroundColor: duel.attackerColor }}
            >
              {duel.attackerName[0].toUpperCase()}
            </div>
            <div className="font-bold text-xs text-white truncate max-w-[120px]">{duel.attackerName}</div>
            <div className="text-[10px] text-amber-400 font-mono">⚔️ {duel.attackerAtk} ATK</div>
            <div className="mt-1 px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-[10px] font-black text-emerald-400">
              {duel.attackerChance}% de chances
            </div>
          </div>

          {/* VS badge */}
          <div className="col-span-1 flex flex-col items-center justify-center">
            <div className="w-9 h-9 rounded-full bg-amber-500/20 border border-amber-500/50 flex items-center justify-center font-black text-xs text-amber-400">
              VS
            </div>
          </div>

          {/* Defender */}
          <div className="col-span-2 p-2.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col items-center">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black text-white shadow-lg mb-1"
              style={{ backgroundColor: duel.defenderColor }}
            >
              {duel.defenderName[0].toUpperCase()}
            </div>
            <div className="font-bold text-xs text-white truncate max-w-[120px]">{duel.defenderName}</div>
            <div className="text-[10px] text-amber-400 font-mono">⚔️ {duel.defenderAtk} ATK</div>
            <div className="mt-1 px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-[10px] font-black text-emerald-400">
              {duel.defenderChance}% de chances
            </div>
          </div>
        </div>

        {/* THE WHEEL */}
        <div className="relative w-64 h-64 mx-auto my-3 flex items-center justify-center">
          {/* Top Golden Pointer */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center">
            <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[20px] border-t-amber-400 drop-shadow-[0_4px_6px_rgba(0,0,0,0.9)] animate-pulse" />
          </div>

          {/* Outer Ring */}
          <div className="w-full h-full rounded-full p-2 bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-700 shadow-2xl shadow-purple-950/80 border-2 border-amber-300 flex items-center justify-center">
            {/* Spinning Disk */}
            <div
              className="w-full h-full rounded-full relative overflow-hidden shadow-inner flex items-center justify-center"
              style={{
                background: gradient,
                transform: `rotate(${rotation}deg)`,
                transition: 'transform 3200ms cubic-bezier(0.12, 0.8, 0.18, 1)'
              }}
            >
              {/* Dividers */}
              <div className="absolute w-full h-[2px] bg-slate-950/80" style={{ transform: 'rotate(0deg)' }} />
              <div className="absolute w-full h-[2px] bg-slate-950/80" style={{ transform: `rotate(${attackerSliceDeg}deg)` }} />

              {/* Attacker Label */}
              <div
                className="absolute text-center text-white font-black text-xs drop-shadow-[0_2px_4px_rgba(0,0,0,1)] pointer-events-none"
                style={{
                  transform: `rotate(${attackerSliceDeg / 2}deg) translateY(-60px)`
                }}
              >
                <div className="truncate max-w-[90px]">{duel.attackerName}</div>
                <div className="text-[10px] opacity-90">{duel.attackerChance}%</div>
              </div>

              {/* Defender Label */}
              <div
                className="absolute text-center text-white font-black text-xs drop-shadow-[0_2px_4px_rgba(0,0,0,1)] pointer-events-none"
                style={{
                  transform: `rotate(${attackerSliceDeg + (360 - attackerSliceDeg) / 2}deg) translateY(-60px)`
                }}
              >
                <div className="truncate max-w-[90px]">{duel.defenderName}</div>
                <div className="text-[10px] opacity-90">{duel.defenderChance}%</div>
              </div>
            </div>
          </div>

          {/* Center Hub */}
          <div className="absolute w-14 h-14 rounded-full bg-gradient-to-tr from-amber-600 to-yellow-300 border-2 border-white shadow-xl flex items-center justify-center text-lg z-10 font-bold">
            ⚔️
          </div>
        </div>

        {/* Result & Continue */}
        {hasLanded ? (
          <div className="mt-3 space-y-2 animate-fade-in">
            <div className="p-3 rounded-2xl bg-emerald-950/60 border border-emerald-500/80 text-emerald-200 text-xs font-bold">
              🎉 <strong>{duel.winnerName}</strong> remporte le duel ! <strong>{duel.loserName}</strong> perd 1 PV !
            </div>
            <button
              onClick={onResolve}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black rounded-xl text-xs transition shadow-lg cursor-pointer"
            >
              Continuer le Combat ⏩
            </button>
          </div>
        ) : (
          <div className="text-xs text-slate-400 animate-pulse font-bold mt-2">
            La roue tourne... Que le sort décide du vainqueur !
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT: ChaosApp
// ─────────────────────────────────────────────────────────────────────────────
export default function ChaosApp() {
  const navigate = useNavigate();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [joined, setJoined] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [roomCodeInput, setRoomCodeInput] = useState('CHAOS1');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Game state
  const [gameState, setGameState] = useState<ChaosGameState | null>(null);
  const [customRuleInput, setCustomRuleInput] = useState('');

  // UI state
  const [dismissedAnnouncementId, setDismissedAnnouncementId] = useState<string | null>(null);
  const [rightTab, setRightTab] = useState<'RULES' | 'AILOGS' | 'CHRONICLE'>('RULES');

  const logEndRef = useRef<HTMLDivElement | null>(null);
  const aiLogEndRef = useRef<HTMLDivElement | null>(null);

  const me = gameState?.players.find(p => p.id === socket?.id);
  const isMyTurn = gameState && gameState.status === 'PLAYING' && gameState.players[gameState.currentPlayerIndex]?.id === socket?.id;
  const isMeDrafting = gameState && gameState.status === 'DRAFTING_RULE' && gameState.draftingPlayerId === socket?.id;

  // ─── SOCKET CONNECTION ───────────────────────────────────────────────────
  useEffect(() => {
    console.log('[CHAOS] Connexion au serveur :', SERVER_URL);
    const s = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });
    setSocket(s);

    s.on('connect', () => {
      console.log('[CHAOS] Connecté avec socket ID :', s.id);
    });

    s.on('chaosStateUpdate', (newState: ChaosGameState) => {
      setGameState(newState);
      setJoined(true);
      setErrorMsg(null);
    });

    s.on('error', (err: string) => {
      setErrorMsg(err);
    });

    return () => {
      s.disconnect();
    };
  }, []);

  // Auto-scroll logs
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [gameState?.log]);

  useEffect(() => {
    aiLogEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [gameState?.aiLogs]);

  // ─── ACTIONS ─────────────────────────────────────────────────────────────
  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput.trim()) return;
    const colors = ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
    const assignedColor = colors[Math.floor(Math.random() * colors.length)];

    socket?.emit('joinGame', {
      username: usernameInput.trim(),
      roomCode: roomCodeInput.trim().toUpperCase() || 'CHAOS1',
      color: assignedColor,
      gameType: 'chaos'
    });
  };

  const handleStartGame = () => {
    socket?.emit('chaos:startGame');
  };

  const handleCellClick = (cell: ChaosCell) => {
    if (!isMyTurn || !me || gameState?.activeDuel) return;
    const currentCell = gameState?.cells.find(c => c.id === me.cellId);
    if (!currentCell) return;

    const dx = Math.abs(cell.x - currentCell.x);
    const dy = Math.abs(cell.y - currentCell.y);
    const speed = me.customStats['Vitesse'] || me.customStats['vitesse'] || 1;

    if (cell.id !== currentCell.id && dx <= speed && dy <= speed) {
      socket?.emit('chaos:move', { targetCellId: cell.id });
    }
  };

  const handleResolveDuel = () => {
    socket?.emit('chaos:resolveDuel');
  };

  const handleSubmitRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customRuleInput.trim()) return;
    socket?.emit('chaos:draftRule', { ruleText: customRuleInput.trim() });
    setCustomRuleInput('');
  };

  const handleResetGame = () => {
    socket?.emit('chaos:resetGame');
  };

  // ─────────────────────────────────────────────────────────────────────────
  // VIEW: JOIN SCREEN
  // ─────────────────────────────────────────────────────────────────────────
  if (!joined || !gameState) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-rose-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl relative z-10">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => navigate('/')}
              className="text-xs text-slate-400 hover:text-white transition flex items-center gap-1.5 cursor-pointer"
            >
              ← Retour à l'accueil
            </button>
            <span className="text-[10px] font-black tracking-widest uppercase text-amber-400 px-2.5 py-0.5 rounded bg-amber-950/60 border border-amber-800">
              TACTIQUE & IA ROGUELITE
            </span>
          </div>

          <div className="text-center mb-8">
            <div className="text-6xl mb-3 animate-bounce">⚔️🎰</div>
            <h1 className="text-3xl font-black bg-gradient-to-r from-amber-400 via-purple-400 to-rose-400 bg-clip-text text-transparent">
              CHAOS BOARD
            </h1>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Plateau 3x2 • Déplacement par clic • Roulette PvP pondérée par l'ATK • Décrets illimités par l'IA !
            </p>
          </div>

          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Votre Pseudo</label>
              <input
                type="text"
                value={usernameInput}
                onChange={e => setUsernameInput(e.target.value)}
                placeholder="Ex: Gladiateur du Chaos"
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 transition text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Code de Salon</label>
              <input
                type="text"
                value={roomCodeInput}
                onChange={e => setRoomCodeInput(e.target.value.toUpperCase())}
                placeholder="CHAOS1"
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 uppercase font-mono tracking-wider focus:outline-none focus:border-amber-500 transition text-sm"
                required
              />
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-xl text-xs text-rose-300">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-slate-950 font-black rounded-xl shadow-lg transition transform active:scale-98 text-sm cursor-pointer"
            >
              REJOINDRE L'ARÈNE 🔥
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // VIEW: LOBBY
  // ─────────────────────────────────────────────────────────────────────────
  if (gameState.status === 'LOBBY') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 relative font-sans">
        <div className="max-w-xl w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => navigate('/')}
              className="text-xs text-slate-400 hover:text-white transition cursor-pointer"
            >
              ← Quitter le salon
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Salon :</span>
              <span className="font-mono text-xs font-bold text-amber-400 bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
                {gameState.roomCode}
              </span>
            </div>
          </div>

          <div className="text-center mb-6">
            <h2 className="text-2xl font-black text-white">Conseil des Combattants</h2>
            <p className="text-xs text-slate-400 mt-1">Préparez-vous au combat tactique...</p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            {gameState.players.map(p => (
              <div
                key={p.id}
                className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-3"
              >
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs text-white shadow-md"
                  style={{ backgroundColor: p.color }}
                >
                  {p.username[0].toUpperCase()}
                </div>
                <div className="truncate">
                  <div className="font-bold text-xs text-white truncate">
                    {p.username} {p.id === socket?.id && <span className="text-amber-400 text-[10px]">(Vous)</span>}
                  </div>
                  <div className="text-[10px] text-slate-500 flex items-center gap-2">
                    <span>❤️ {p.hp} PV</span>
                    <span>⚔️ {p.atk} ATK</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 mb-6 text-xs text-slate-400 space-y-1.5">
            <div className="font-bold text-slate-300">Règles du Chaos Tactique :</div>
            <div>• Stats de départ : <strong>3 PV</strong> et <strong>1 ATK</strong>. Perdre un combat fait perdre <strong>1 PV</strong>.</div>
            <div>• Plateau initial de <strong>6 cases (3 x 2)</strong> neutres. Cliquez pour vous déplacer.</div>
            <div>• Duel PvP à la <strong>Roulette du Destin</strong> : 50/50 si même ATK, sinon pourcentage selon l'ATK !</div>
            <div>• Manches <strong>illimitées</strong> : le joueur à 0 PV dicte une règle et tout le monde ressuscite !</div>
          </div>

          <button
            onClick={handleStartGame}
            disabled={gameState.players.length < 1}
            className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black rounded-2xl shadow-xl transition transform active:scale-98 text-sm cursor-pointer disabled:opacity-40"
          >
            LANCER LA MANCHE 1 🏁
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // VIEW: PLAYING
  // ─────────────────────────────────────────────────────────────────────────
  const activePlayer = gameState.players[gameState.currentPlayerIndex];
  const myCurrentCell = gameState.cells.find(c => c.id === me?.cellId);

  const maxX = gameState.cells.reduce((max, c) => Math.max(max, c.x), 2);
  const maxY = gameState.cells.reduce((max, c) => Math.max(max, c.y), 1);

  const occupiedSet = new Set(gameState.cells.map(c => `${c.x},${c.y}`));
  const emptySlots: Array<{ x: number; y: number }> = [];
  for (let y = 0; y <= maxY; y++) {
    for (let x = 0; x <= maxX; x++) {
      if (!occupiedSet.has(`${x},${y}`)) {
        emptySlots.push({ x, y });
      }
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden font-sans">
      {/* 1. Header Bar */}
      <header className="h-14 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between px-6 z-20">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 transition cursor-pointer"
          >
            ← Quitter
          </button>
          <div className="flex items-center gap-2">
            <span className="text-lg">⚔️</span>
            <span className="font-black text-white text-sm tracking-wider">CHAOS BOARD</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
              MANCHE {gameState.roundNumber} ♾️
            </span>
            <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
              {gameState.cells.length} Cases
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-xs text-slate-300 flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            <span className="text-slate-500">Au tour de :</span>
            <span className="font-bold flex items-center gap-1.5" style={{ color: activePlayer?.color }}>
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: activePlayer?.color }} />
              {activePlayer?.username} {activePlayer?.id === socket?.id && '(Vous)'}
            </span>
          </div>

          <div className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl">
            📜 {gameState.activeRules.length} Décret(s) Actif(s)
          </div>
        </div>
      </header>

      {/* 2. Main Game Layout */}
      <div className="flex-1 grid grid-cols-12 gap-4 p-4 overflow-hidden">
        {/* Left Column: Player Stats */}
        <div className="col-span-3 flex flex-col gap-3 overflow-y-auto">
          {/* Active Turn Banner */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
            <div className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center justify-between">
              <span>Tour de Jeu</span>
              {isMyTurn ? (
                <span className="text-emerald-400 font-black animate-pulse">● C'EST À VOUS !</span>
              ) : (
                <span className="text-slate-500">En attente...</span>
              )}
            </div>
            {isMyTurn ? (
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-xs text-emerald-200">
                👉 <strong>Cliquez sur une case adjacente</strong> pour vous déplacer ou lancer un duel à la roulette !
              </div>
            ) : (
              <div className="text-xs text-slate-400">
                {activePlayer?.username} réfléchit à son prochain déplacement...
              </div>
            )}
          </div>

          {/* Players Roster */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex-1 flex flex-col">
            <div className="text-xs font-bold text-slate-400 uppercase mb-3">Combattants & Statistiques</div>
            <div className="space-y-2.5 flex-1 overflow-y-auto">
              {gameState.players.map(p => (
                <div
                  key={p.id}
                  className={`p-3 rounded-xl border transition ${
                    p.id === activePlayer?.id
                      ? 'bg-slate-950 border-amber-500/60 shadow-md ring-1 ring-amber-500/40'
                      : 'bg-slate-950/60 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-sm text-white flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                      {p.username}
                      {p.id === socket?.id && <span className="text-[10px] text-amber-400">(Vous)</span>}
                    </span>
                    <span className="text-[11px] text-rose-400 font-mono font-bold">
                      💀 {p.kills} Kills
                    </span>
                  </div>

                  {/* HP Bar */}
                  <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden mb-2 border border-slate-800">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
                      style={{ width: `${Math.max(0, Math.min(100, (p.hp / p.maxHp) * 100))}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="text-emerald-400">❤️ {p.hp} / {p.maxHp} PV</span>
                    <span className="text-amber-400">⚔️ {p.atk} ATK</span>
                  </div>

                  {/* Custom Stats */}
                  {Object.keys(p.customStats).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-slate-800/60">
                      {Object.entries(p.customStats).map(([stat, val]) => (
                        <span key={stat} className="px-1.5 py-0.5 rounded bg-purple-950/80 border border-purple-800/60 text-[10px] text-purple-300">
                          {stat}: <strong>{val}</strong>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center: The Tactical 2D Grid Board */}
        <div className="col-span-6 flex flex-col gap-3">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3 text-xs">
              <span className="font-bold text-slate-200 flex items-center gap-2">
                <span>🗺️</span> Plateau Tactique ({maxX + 1} x {maxY + 1})
              </span>
              <span className="text-slate-500">
                {isMyTurn ? 'Cases lumineuses = Déplacement cliquable' : 'Déplacement tour par tour'}
              </span>
            </div>

            {/* Tactical Grid Render */}
            <div className="flex-1 overflow-auto flex items-center justify-center p-4">
              <div
                className="grid gap-3 w-full max-w-3xl"
                style={{
                  gridTemplateColumns: `repeat(${maxX + 1}, minmax(130px, 1fr))`,
                  gridTemplateRows: `repeat(${maxY + 1}, minmax(140px, auto))`
                }}
              >
                {/* Visual empty slot placeholders for topological clarity */}
                {emptySlots.map(({ x, y }) => (
                  <div
                    key={`empty_${x}_${y}`}
                    style={{ gridColumnStart: x + 1, gridRowStart: y + 1 }}
                    className="border border-dashed border-slate-800/40 rounded-2xl min-h-[140px] flex flex-col items-center justify-center p-3 text-slate-700/60 select-none bg-slate-950/20"
                  >
                    <span className="text-[10px] font-mono opacity-40">({x}, {y})</span>
                    <span className="text-[11px] text-slate-700 mt-1">Vide</span>
                  </div>
                ))}

                {/* Actual cells placed strictly at their cartesian (x, y) coordinates */}
                {gameState.cells.map(cell => {
                  const playersOnCell = gameState.players.filter(p => p.cellId === cell.id && !p.isEliminated);
                  const isCurrentCell = me?.cellId === cell.id;

                  let isReachable = false;
                  if (isMyTurn && myCurrentCell && cell.id !== myCurrentCell.id && !gameState.activeDuel) {
                    const dx = Math.abs(cell.x - myCurrentCell.x);
                    const dy = Math.abs(cell.y - myCurrentCell.y);
                    const speed = me?.customStats['Vitesse'] || me?.customStats['vitesse'] || 1;
                    if (dx <= speed && dy <= speed) {
                      isReachable = true;
                    }
                  }

                  const hasEnemyPlayers = playersOnCell.some(p => p.id !== me?.id);
                  const hasMonsters = cell.enemies && cell.enemies.length > 0;

                  return (
                    <div
                      key={cell.id}
                      onClick={() => isReachable && handleCellClick(cell)}
                      style={{
                        gridColumnStart: cell.x + 1,
                        gridRowStart: cell.y + 1
                      }}
                      className={`relative p-3 rounded-2xl border transition-all duration-200 flex flex-col justify-between min-h-[140px] select-none ${
                        cell.colorTheme || 'from-slate-900 to-slate-950 border-slate-800 text-slate-300'
                      } bg-gradient-to-b ${
                        isReachable
                          ? 'cursor-pointer ring-2 ring-emerald-400 border-emerald-400 shadow-lg shadow-emerald-500/20 hover:scale-102 hover:brightness-110'
                          : isCurrentCell
                          ? 'ring-2 ring-amber-400/80 border-amber-400 shadow-md'
                          : 'opacity-90'
                      }`}
                    >
                      {/* Top Header of Cell */}
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold opacity-60">
                          ({cell.x}, {cell.y})
                        </span>
                        <div className="flex items-center gap-1">
                          {isCurrentCell && (
                            <span className="text-[8px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 px-1.5 py-0.5 rounded">
                              VOUS
                            </span>
                          )}
                          <span className="text-xl">{cell.icon}</span>
                        </div>
                      </div>

                      {/* Cell Info */}
                      <div className="my-1">
                        <div className="font-black text-xs text-white truncate" title={cell.name}>
                          {cell.name}
                        </div>
                        <div className="text-[10px] text-slate-300 opacity-80 line-clamp-2 leading-tight">
                          {cell.description}
                        </div>
                      </div>

                      {/* Monsters */}
                      {hasMonsters && (
                        <div className="space-y-1 my-1">
                          {cell.enemies.map(en => (
                            <div
                              key={en.id}
                              className="p-1 rounded bg-rose-950/80 border border-rose-800/80 flex items-center justify-between text-[9px] text-rose-200"
                            >
                              <span className="font-bold flex items-center gap-1">
                                <span>{en.icon}</span> {en.name}
                              </span>
                              <span className="font-mono text-rose-300">
                                {en.hp}PV | {en.atk}ATK
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Players Tokens */}
                      <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-white/10">
                        <div className="flex items-center gap-1 flex-wrap">
                          {playersOnCell.map(p => (
                            <div
                              key={p.id}
                              className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-black text-white shadow-md"
                              style={{ backgroundColor: p.color }}
                              title={`${p.username} (${p.hp}/${p.maxHp} PV, ${p.atk} ATK)`}
                            >
                              {p.username[0].toUpperCase()}
                            </div>
                          ))}
                        </div>

                        {isReachable && (
                          <div className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500 text-slate-950 shadow animate-pulse">
                            {hasEnemyPlayers ? '🎰 ROULETTE PVP' : hasMonsters ? '🗡️ COMBAT' : '🚶 ALLER'}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Multi-tab Panel */}
        <div className="col-span-3 flex flex-col gap-3 overflow-hidden">
          <div className="bg-slate-900/90 border border-purple-900/60 rounded-2xl p-4 shadow-xl flex-1 flex flex-col overflow-hidden">
            {/* Tab Selector */}
            <div className="flex border-b border-purple-900/40 pb-2 mb-3 gap-1">
              <button
                onClick={() => setRightTab('RULES')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                  rightTab === 'RULES'
                    ? 'bg-purple-950 text-purple-200 border border-purple-700/60 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                📜 Décrets ({gameState.activeRules.length})
              </button>
              <button
                onClick={() => setRightTab('AILOGS')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer relative ${
                  rightTab === 'AILOGS'
                    ? 'bg-purple-950 text-purple-200 border border-purple-700/60 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                🤖 Logs IA ({gameState.aiLogs?.length || 0})
                {gameState.isAiGenerating && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 absolute top-1 right-1 animate-ping" />
                )}
              </button>
              <button
                onClick={() => setRightTab('CHRONICLE')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                  rightTab === 'CHRONICLE'
                    ? 'bg-purple-950 text-purple-200 border border-purple-700/60 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                📋 Combats
              </button>
            </div>

            {/* Tab 1: RULES */}
            {rightTab === 'RULES' && (
              <div className="space-y-2 flex-1 overflow-y-auto pr-1">
                {gameState.activeRules.length === 0 ? (
                  <div className="text-slate-500 text-xs text-center py-12">
                    Aucun décret actif pour l'instant. Dès qu'un joueur meurt, il réécrit le jeu ! 😈
                  </div>
                ) : (
                  gameState.activeRules.map((rule, idx) => (
                    <div
                      key={rule.id}
                      className="p-3 rounded-xl bg-purple-950/30 border border-purple-800/40 text-xs shadow-sm hover:border-purple-600 transition"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-amber-300 truncate">
                          #{idx + 1} {rule.title}
                        </span>
                        <span className="text-[10px] text-purple-400 font-mono">M{rule.roundIntroduced}</span>
                      </div>
                      <p className="text-slate-200 text-[11px] leading-snug mb-1.5">{rule.description}</p>
                      <div className="text-[10px] text-purple-400 italic">
                        — Proclamé par {rule.authorName}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab 2: AI LOGS */}
            {rightTab === 'AILOGS' && (
              <div className="flex-1 overflow-y-auto space-y-2 font-mono text-[11px] pr-1">
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
                  <span>Moteur : OpenRouter API</span>
                  <span className="text-emerald-400 font-bold">● Connecté</span>
                </div>

                {(!gameState.aiLogs || gameState.aiLogs.length === 0) ? (
                  <div className="text-slate-500 text-xs text-center py-12">
                    Aucun log IA pour l'instant. Les requêtes s'afficheront dès qu'un joueur décédé rédigera son décret.
                  </div>
                ) : (
                  gameState.aiLogs.map((log, idx) => {
                    const statusColor =
                      log.status === 'SUCCESS' ? 'text-emerald-400 bg-emerald-950/40 border-emerald-800/50' :
                      log.status === 'ERROR' ? 'text-rose-400 bg-rose-950/40 border-rose-800/50' :
                      log.status === 'FALLBACK' ? 'text-amber-400 bg-amber-950/40 border-amber-800/50' :
                      'text-sky-400 bg-sky-950/40 border-sky-800/50';

                    return (
                      <div key={idx} className={`p-2 rounded-xl border ${statusColor} space-y-1`}>
                        <div className="flex items-center justify-between text-[9px] opacity-80">
                          <span>[{log.timestamp}] {log.model || 'OpenRouter'}</span>
                          <span className="font-black uppercase">{log.status}</span>
                        </div>
                        <div className="text-slate-200 leading-tight">{log.message}</div>
                        {log.latencyMs !== undefined && (
                          <div className="text-[9px] text-slate-400">Latence : {log.latencyMs}ms</div>
                        )}
                        {log.responseSnippet && (
                          <details className="mt-1 text-[9px] text-slate-400">
                            <summary className="cursor-pointer hover:text-white">Voir détails JSON</summary>
                            <pre className="mt-1 p-1.5 rounded bg-slate-950 border border-slate-800 overflow-x-auto whitespace-pre-wrap">
                              {log.responseSnippet}
                            </pre>
                          </details>
                        )}
                      </div>
                    );
                  })
                )}
                <div ref={aiLogEndRef} />
              </div>
            )}

            {/* Tab 3: CHRONICLE */}
            {rightTab === 'CHRONICLE' && (
              <div className="flex-1 overflow-y-auto space-y-1 text-xs text-slate-300 font-mono pr-1">
                {gameState.log.map((entry, idx) => (
                  <div key={idx} className="leading-tight py-0.5 border-b border-slate-800/30">
                    {entry}
                  </div>
                ))}
                <div ref={logEndRef} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────
          MODAL 0: ROULETTE DU DESTIN (ACTIVE DUEL)
      ────────────────────────────────────────────────────────────────────── */}
      {gameState.activeDuel && (
        <RouletteModal duel={gameState.activeDuel} onResolve={handleResolveDuel} />
      )}

      {/* ─────────────────────────────────────────────────────────────────────
          MODAL 1: DRAFTING RULE (THE CORE HOOK WHEN SOMEONE DIES)
      ────────────────────────────────────────────────────────────────────── */}
      {gameState.status === 'DRAFTING_RULE' && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-6 z-50 animate-fade-in">
          <div className="max-w-xl w-full bg-slate-900 border-2 border-purple-500 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute -top-16 -right-16 w-44 h-44 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

            {isMeDrafting ? (
              <div>
                <div className="text-center mb-6">
                  <div className="text-5xl mb-2 animate-bounce">💀📜</div>
                  <h2 className="text-2xl font-black bg-gradient-to-r from-purple-400 to-amber-400 bg-clip-text text-transparent">
                    VOUS AVEZ PÉRI !
                  </h2>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    En tant que <strong>Législateur du Chaos</strong>, vous avez le pouvoir absolu de dicter <strong>N'IMPORTE QUELLE MODIFICATION</strong> :
                    créer ou détruire une case, invoquer un monstre, inventer une nouvelle statistique, ou modifier les duels PvP !
                  </p>
                </div>

                <form onSubmit={handleSubmitRule} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Votre Décret Divin (texte libre) :
                    </label>
                    <textarea
                      value={customRuleInput}
                      onChange={e => setCustomRuleInput(e.target.value)}
                      placeholder="Ex: Invoquer un Dragon Ancestral (3 ATK), ou ajouter une stat Armure (base 1)..."
                      rows={3}
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 text-xs transition"
                      required
                    />
                  </div>

                  <div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold mb-1.5">Idées & Inspirations :</div>
                    <div className="flex flex-wrap gap-1.5">
                      {RULE_SUGGESTIONS.map((sug, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setCustomRuleInput(sug)}
                          className="px-2.5 py-1 bg-slate-950 hover:bg-purple-950/60 border border-slate-800 hover:border-purple-500 rounded-lg text-[10px] text-slate-400 hover:text-purple-300 transition text-left cursor-pointer"
                        >
                          {sug}
                        </button>
                      ))}
                    </div>
                  </div>

                  {gameState.isAiGenerating ? (
                    <div className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-purple-950/40 border border-purple-800 text-purple-300 text-xs">
                      <div className="flex items-center gap-2 font-bold">
                        <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                        <span>L'IA analyse et matérialise votre décret...</span>
                      </div>
                      {gameState.aiLogs && gameState.aiLogs.length > 0 && (
                        <div className="text-[10px] text-slate-400 font-mono truncate max-w-full">
                          {gameState.aiLogs[gameState.aiLogs.length - 1].message}
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      type="submit"
                      className="w-full py-3.5 bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:from-purple-500 hover:to-amber-400 text-white font-black rounded-xl shadow-lg transition transform active:scale-98 text-xs cursor-pointer"
                    >
                      PROMULGUER CE DÉCRET PAR L'IA ⚡
                    </button>
                  )}
                </form>
              </div>
            ) : (
              <div className="text-center py-6 space-y-4">
                <div className="text-5xl animate-pulse">⚖️👑</div>
                <h2 className="text-2xl font-black text-amber-400">UN COMBATTANT EST MORT !</h2>
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
                  {gameState.isAiGenerating ? (
                    <div className="flex flex-col items-center justify-center gap-2 text-purple-300 font-bold">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                        L'IA matérialise le nouveau décret...
                      </div>
                      {gameState.aiLogs && gameState.aiLogs.length > 0 && (
                        <div className="text-[10px] text-slate-400 font-mono truncate max-w-full">
                          {gameState.aiLogs[gameState.aiLogs.length - 1].message}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span>
                      <strong>{gameState.draftingPlayerName}</strong> est actuellement en train de réécrire la réalité du jeu avec l'IA...
                    </span>
                  )}
                </div>

                <div className="text-[11px] text-slate-500">
                  Tous les joueurs ressusciteront à la Manche {gameState.roundNumber + 1} avec leurs PV restaurés.
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────
          MODAL 2: NEW RULE ANNOUNCEMENT POPUP (SHOWN ONCE PER ANNOUNCEMENT)
      ────────────────────────────────────────────────────────────────────── */}
      {gameState.lastAnnouncement &&
        gameState.lastAnnouncement.id !== dismissedAnnouncementId &&
        gameState.status === 'PLAYING' && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-6 z-40 animate-fade-in">
          <div className="max-w-md w-full bg-slate-900 border-2 border-amber-500 rounded-3xl p-6 shadow-2xl text-center">
            <div className="text-4xl mb-2">📜✨</div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-amber-400">Nouveau Décret du Chaos</span>
            <h3 className="text-xl font-black text-white mt-1 mb-3">
              {gameState.lastAnnouncement.title}
            </h3>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 mb-4 leading-relaxed">
              {gameState.lastAnnouncement.message}
            </div>

            <button
              onClick={() => {
                if (gameState.lastAnnouncement) {
                  setDismissedAnnouncementId(gameState.lastAnnouncement.id);
                }
              }}
              className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-bold rounded-xl text-xs transition cursor-pointer"
            >
              C'est compris, au combat ! ⚔️
            </button>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────
          MODAL 3: FINISHED / VICTORY SCREEN
      ────────────────────────────────────────────────────────────────────── */}
      {gameState.status === 'FINISHED' && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-6 z-50">
          <div className="max-w-md w-full bg-slate-900 border-2 border-amber-500 rounded-3xl p-8 text-center shadow-2xl">
            <div className="text-5xl mb-4 animate-bounce">🏆👑</div>
            <h2 className="text-3xl font-black text-amber-400 mb-2">FIN DE LA PARTIE !</h2>
            <p className="text-sm text-slate-300 mb-4">
              Après <strong>{gameState.roundNumber} manches</strong> d'apocalypse et <strong>{gameState.activeRules.length} décrets</strong> accumulés :
            </p>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-white font-bold mb-6">
              Champion Suprême : <span className="text-amber-400 text-lg">{gameState.winner?.username}</span> (avec {gameState.winner?.kills} éliminations !)
            </div>

            <button
              onClick={handleResetGame}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-xl text-sm transition cursor-pointer"
            >
              Rejouer une Partie du Chaos 😈
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
