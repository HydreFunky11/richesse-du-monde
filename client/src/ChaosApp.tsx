import { useState, useEffect, useRef } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import type {
  ChaosGameState,
  ChaosCellType
} from './chaos/chaosTypes';

const SERVER_URL = import.meta.env.VITE_WS_SERVER_URL || import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

const CELL_BG_COLORS: Record<ChaosCellType, string> = {
  DEPART: 'from-emerald-950/80 to-teal-900/60 border-emerald-500/60 text-emerald-300',
  NORMAL: 'from-slate-900/90 to-slate-950 border-slate-700/60 text-slate-300',
  GOLD: 'from-amber-950/80 to-yellow-900/60 border-amber-500/60 text-amber-300',
  GAMBLE: 'from-purple-950/80 to-indigo-900/60 border-purple-500/60 text-purple-300',
  DEBT: 'from-rose-950/80 to-red-900/60 border-rose-500/60 text-rose-300',
  FIGHT: 'from-orange-950/80 to-red-950/80 border-orange-500/60 text-orange-300',
  LAVA: 'from-red-950 to-orange-900/80 border-red-500/80 text-red-200 animate-pulse',
  BUFF: 'from-blue-950/80 to-cyan-900/60 border-blue-500/60 text-blue-300',
  CURSE: 'from-fuchsia-950/80 to-purple-900/60 border-fuchsia-500/60 text-fuchsia-300',
  CHEST: 'from-yellow-950/80 to-amber-900/60 border-yellow-500/60 text-yellow-300',
  PORTAL: 'from-cyan-950/80 to-blue-900/60 border-cyan-500/60 text-cyan-300',
  CHAOS: 'from-violet-950 to-pink-900/80 border-pink-500/70 text-pink-200 animate-pulse'
};

const RULE_SUGGESTIONS = [
  "Si un joueur fait un 6, il perd 25 PV et donne 50 d'or à tout le monde !",
  "Toutes les cases paires deviennent des fosses de lave mortelles !",
  "Les lancers de dés impairs font reculer au lieu d'avancer.",
  "À chaque début de tour, le joueur le plus riche perd 100 d'or.",
  "Chaque passage par la case départ vole 50 d'or à tous les autres joueurs.",
  "Faire un lancer supérieur à 4 fait gagner +10 Force mais retire 15 PV !"
];

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
  const [betAmount, setBetAmount] = useState(100);
  const [diceRolling, setDiceRolling] = useState(false);
  const [dismissAnnouncement, setDismissAnnouncement] = useState(false);

  const logEndRef = useRef<HTMLDivElement | null>(null);

  const me = gameState?.players.find(p => p.id === socket?.id);
  const isMyTurn = gameState && gameState.status === 'PLAYING' && gameState.players[gameState.currentPlayerIndex]?.id === socket?.id;
  const isMeDrafting = gameState && gameState.status === 'DRAFTING_RULE' && gameState.draftingPlayerId === socket?.id;

  // ─── SOCKET CONNECTION ───────────────────────────────────────────────────
  useEffect(() => {
    const s = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });
    setSocket(s);

    s.on('connect', () => {
      console.log('[CHAOS] Connecté au serveur Socket.IO :', s.id);
    });

    s.on('chaosStateUpdate', (newState: ChaosGameState) => {
      setGameState(newState);
      setJoined(true);
      setErrorMsg(null);
      setDiceRolling(false);
      setDismissAnnouncement(false);
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
  }, [gameState?.log.length]);

  // ─── ACTIONS ─────────────────────────────────────────────────────────────
  const handleJoin = (e: FormEvent) => {
    e.preventDefault();
    if (!usernameInput.trim()) return;
    socket?.emit('joinGame', {
      username: usernameInput.trim(),
      roomCode: roomCodeInput.trim(),
      gameType: 'chaos'
    });
  };

  const handleStartGame = () => {
    socket?.emit('chaos:startGame');
  };

  const handleRollDice = () => {
    if (!isMyTurn || diceRolling || gameState?.lastDiceRoll !== null) return;
    setDiceRolling(true);
    setTimeout(() => {
      socket?.emit('chaos:rollDice');
    }, 600);
  };

  const handlePlayAction = (actionType: 'GAMBLE' | 'FIGHT', params: any = {}) => {
    socket?.emit('chaos:playAction', { actionType, params });
  };

  const handlePassTurn = () => {
    socket?.emit('chaos:passTurn');
  };

  const handleSubmitRule = (e: FormEvent) => {
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
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
        <button
          onClick={() => navigate('/')}
          className="absolute top-6 left-6 text-slate-400 hover:text-white flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 border border-slate-800 transition"
        >
          ← Accueil
        </button>

        <div className="max-w-md w-full bg-slate-900 border border-purple-900/50 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-36 h-36 bg-purple-600/10 rounded-full blur-2xl pointer-events-none" />

          <div className="text-center mb-6">
            <div className="inline-flex p-3 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-400 text-3xl mb-3 animate-pulse">
              🎲😈
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white">CHAOS BOARD</h1>
            <p className="text-xs text-purple-400 font-semibold uppercase tracking-wider mt-1">
              Le Jeu de l'Oie Roguelite où les Morts Dictent les Règles (IA)
            </p>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 bg-red-950/80 border border-red-800 rounded-xl text-red-200 text-sm">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Pseudo du Joueur
              </label>
              <input
                type="text"
                value={usernameInput}
                onChange={e => setUsernameInput(e.target.value)}
                placeholder="Ex: Lucifer, Gégé..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Code Salon
              </label>
              <input
                type="text"
                value={roomCodeInput}
                onChange={e => setRoomCodeInput(e.target.value.toUpperCase())}
                placeholder="CHAOS1"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white uppercase focus:outline-none focus:border-purple-500 transition font-mono tracking-wider"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-xl shadow-lg shadow-purple-900/40 transition transform active:scale-98 cursor-pointer"
            >
              Entrer dans le Conseil du Chaos 💀
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
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6">
        <button
          onClick={() => navigate('/')}
          className="absolute top-6 left-6 text-slate-400 hover:text-white flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 border border-slate-800 transition"
        >
          ← Accueil
        </button>

        <div className="max-w-xl w-full bg-slate-900 border border-purple-900/50 rounded-2xl p-6 shadow-2xl">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🎲</span>
              <div>
                <h2 className="text-xl font-black text-white">Salon du Chaos</h2>
                <p className="text-xs text-purple-400 font-mono">CODE: {gameState.roomCode}</p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-950 text-purple-300 border border-purple-800">
              {gameState.players.length} Joueur(s)
            </span>
          </div>

          {/* Concept explanation */}
          <div className="bg-purple-950/40 border border-purple-800/40 p-3.5 rounded-xl mb-6 text-xs text-purple-200 leading-relaxed">
            <span className="font-bold text-amber-300 block mb-1">📜 RÈGLE FONDAMENTALE :</span>
            Vous commencez tous avec 100 PV et 500 d'Or. Dès qu'un joueur meurt (PV à 0 ou dette excessive), la manche s'arrête ! Ce joueur rédige une <strong>NOUVELLE RÈGLE</strong> (interprétée en direct par l'IA OpenRouter), et la manche recommence avec tous les joueurs ressuscités. Les règles s'accumulent manche après manche jusqu'à l'apocalypse !
          </div>

          {/* Players List */}
          <div className="space-y-2 mb-6">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Joueurs prêts ({gameState.players.length}) :
            </h3>
            {gameState.players.map(p => (
              <div
                key={p.id}
                className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm text-white shadow-md"
                    style={{ backgroundColor: p.color }}
                  >
                    {p.username[0].toUpperCase()}
                  </div>
                  <span className="font-bold text-white text-sm">
                    {p.username} {p.id === socket?.id && <span className="text-amber-400 text-xs font-normal">(Vous)</span>}
                  </span>
                </div>
                <span className="text-xs text-emerald-400 font-semibold">Prêt ⚔️</span>
              </div>
            ))}
          </div>

          <button
            onClick={handleStartGame}
            className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-black rounded-xl shadow-lg transition transform active:scale-98 cursor-pointer tracking-wider"
          >
            LANCER LA MANCHE 1 🏁
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // VIEW: PLAYING & BOARD
  // ─────────────────────────────────────────────────────────────────────────
  const activePlayer = gameState.players[gameState.currentPlayerIndex];
  const activeCell = gameState.board[me?.position || 0];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden font-sans">
      {/* 1. Header Bar */}
      <header className="h-14 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between px-6 z-20">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 transition"
          >
            ← Quitter
          </button>
          <div className="flex items-center gap-2">
            <span className="text-lg">🎲</span>
            <span className="font-black text-white text-sm tracking-wider">CHAOS BOARD</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
              MANCHE {gameState.roundNumber} / {gameState.maxRounds}
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
            📜 {gameState.activeRules.length} Règle(s) Active(s)
          </div>
        </div>
      </header>

      {/* 2. Main Game Body (Board + Sidebars) */}
      <div className="flex-1 grid grid-cols-12 gap-4 p-4 overflow-hidden">
        {/* Left Column: Player Stats & Game Controls */}
        <div className="col-span-3 flex flex-col gap-3 overflow-y-auto">
          {/* Active Turn Actions Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
            <div className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center justify-between">
              <span>Votre Tour</span>
              {isMyTurn && <span className="text-emerald-400 animate-pulse">● C'est à vous !</span>}
            </div>

            {isMyTurn ? (
              <div className="space-y-3">
                {gameState.lastDiceRoll === null ? (
                  <button
                    onClick={handleRollDice}
                    disabled={diceRolling}
                    className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black rounded-xl shadow-lg transition transform active:scale-95 text-sm cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span className="text-xl">🎲</span>
                    {diceRolling ? 'Le dé roule...' : 'LANCER LE DÉ (1-6)'}
                  </button>
                ) : (
                  <div className="space-y-2">
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
                      <span className="text-xs text-slate-400">Vous avez obtenu un</span>
                      <div className="text-4xl font-black text-amber-400 my-1">{gameState.lastDiceRoll}</div>
                      <span className="text-[11px] text-slate-500">Case : {activeCell.name}</span>
                    </div>

                    {/* Interactive cell buttons */}
                    {activeCell.type === 'GAMBLE' && (
                      <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-800/60 text-xs">
                        <div className="font-bold text-purple-300 mb-2">🎰 Casino Maudit : Parier</div>
                        <div className="flex gap-2 mb-2">
                          <button
                            onClick={() => setBetAmount(50)}
                            className={`flex-1 py-1 rounded border ${betAmount === 50 ? 'bg-purple-600 border-purple-400 text-white' : 'bg-slate-900 border-slate-800 text-slate-400'}`}
                          >
                            50g
                          </button>
                          <button
                            onClick={() => setBetAmount(100)}
                            className={`flex-1 py-1 rounded border ${betAmount === 100 ? 'bg-purple-600 border-purple-400 text-white' : 'bg-slate-900 border-slate-800 text-slate-400'}`}
                          >
                            100g
                          </button>
                          <button
                            onClick={() => setBetAmount(250)}
                            className={`flex-1 py-1 rounded border ${betAmount === 250 ? 'bg-purple-600 border-purple-400 text-white' : 'bg-slate-900 border-slate-800 text-slate-400'}`}
                          >
                            250g
                          </button>
                        </div>
                        <button
                          onClick={() => handlePlayAction('GAMBLE', { betAmount })}
                          className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg transition"
                        >
                          Miser {betAmount}g (Double ou rien)
                        </button>
                      </div>
                    )}

                    {activeCell.type === 'FIGHT' && (
                      <div className="p-3 rounded-xl bg-orange-950/40 border border-orange-800/60 text-xs">
                        <div className="font-bold text-orange-300 mb-1">⚔️ Antre du Monstre</div>
                        <p className="text-slate-400 text-[11px] mb-2">Votre force : {me?.power}. Combattez pour 250g !</p>
                        <button
                          onClick={() => handlePlayAction('FIGHT')}
                          className="w-full py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg transition"
                        >
                          Engager le Combat !
                        </button>
                      </div>
                    )}

                    <button
                      onClick={handlePassTurn}
                      className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl text-xs transition"
                    >
                      Terminer mon tour →
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-500 text-xs">
                Patientez... {activePlayer?.username} joue son tour.
              </div>
            )}
          </div>

          {/* Players Roster Status */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex-1 overflow-y-auto">
            <h3 className="text-xs font-bold text-slate-400 uppercase mb-3">Statuts des Joueurs</h3>
            <div className="space-y-2.5">
              {gameState.players.map(p => (
                <div
                  key={p.id}
                  className={`p-3 rounded-xl border transition ${
                    p.id === activePlayer?.id
                      ? 'bg-slate-950 border-amber-500/60 shadow-md'
                      : 'bg-slate-950/60 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-sm text-white flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                      {p.username}
                      {p.id === socket?.id && <span className="text-[10px] text-amber-400">(Vous)</span>}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">Case #{p.position}</span>
                  </div>

                  {/* HP Bar */}
                  <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden mb-2 border border-slate-800">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-300"
                      style={{ width: `${Math.max(0, Math.min(100, (p.health / p.maxHealth) * 100))}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-4 gap-1 text-[10px] text-center">
                    <div className="bg-slate-900/80 p-1 rounded">
                      <span className="text-emerald-400 font-bold block">{p.health}</span>
                      <span className="text-slate-500">PV</span>
                    </div>
                    <div className="bg-slate-900/80 p-1 rounded">
                      <span className="text-amber-400 font-bold block">{p.gold}</span>
                      <span className="text-slate-500">Or</span>
                    </div>
                    <div className="bg-slate-900/80 p-1 rounded">
                      <span className="text-blue-400 font-bold block">{p.power}</span>
                      <span className="text-slate-500">Force</span>
                    </div>
                    <div className="bg-slate-900/80 p-1 rounded">
                      <span className="text-rose-400 font-bold block">{p.debt}</span>
                      <span className="text-slate-500">Dette</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center: The Board (20 Ring Track Cells) */}
        <div className="col-span-6 flex flex-col gap-3">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex-1 flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3 text-xs">
              <span className="font-bold text-slate-300">Plateau du Chaos (20 Cases)</span>
              <span className="text-slate-500">Tourne dans le sens des aiguilles d'une montre</span>
            </div>

            {/* Grid of 20 Track Cells */}
            <div className="grid grid-cols-5 gap-2.5 flex-1">
              {gameState.board.map(cell => {
                const playersHere = gameState.players.filter(p => p.position === cell.index);
                const theme = CELL_BG_COLORS[cell.type] || CELL_BG_COLORS.NORMAL;

                return (
                  <div
                    key={cell.index}
                    className={`relative p-2.5 rounded-xl border bg-gradient-to-b ${theme} flex flex-col justify-between transition hover:scale-102 shadow-md min-h-[90px]`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold opacity-60">#{cell.index}</span>
                      <span className="text-base">{cell.icon}</span>
                    </div>

                    <div>
                      <div className="font-bold text-xs truncate">{cell.name}</div>
                      <div className="text-[9px] opacity-75 truncate">{cell.description}</div>
                    </div>

                    {/* Players Pins on this cell */}
                    {playersHere.length > 0 && (
                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                        {playersHere.map(p => (
                          <div
                            key={p.id}
                            className="w-5 h-5 rounded-full border border-white text-[9px] font-black flex items-center justify-center text-white shadow-lg"
                            style={{ backgroundColor: p.color }}
                            title={`${p.username} (${p.health} PV)`}
                          >
                            {p.username[0].toUpperCase()}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Active Rules List (Décrets du Chaos) & Game Log */}
        <div className="col-span-3 flex flex-col gap-3 overflow-y-auto">
          {/* Active Rules List */}
          <div className="bg-slate-900/90 border border-purple-900/60 rounded-2xl p-4 shadow-xl flex-1 flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-purple-900/40 mb-3">
              <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                <span>📜</span> LES DÉCRETS DU CHAOS ({gameState.activeRules.length})
              </span>
            </div>

            <div className="space-y-2 flex-1 overflow-y-auto pr-1">
              {gameState.activeRules.length === 0 ? (
                <div className="text-slate-500 text-xs text-center py-8">
                  Aucun décret actif pour l'instant. Attendez la première mort d'un joueur... 😈
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
          </div>

          {/* Chronicle / Log */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl h-48 flex flex-col">
            <div className="text-xs font-bold text-slate-400 uppercase mb-2">Chronique du Chaos</div>
            <div className="flex-1 overflow-y-auto space-y-1 text-xs text-slate-300 font-mono">
              {gameState.log.map((entry, idx) => (
                <div key={idx} className="leading-tight py-0.5 border-b border-slate-800/30">
                  {entry}
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────
          MODAL 1: DRAFTING RULE (THE CORE HOOK WHEN SOMEONE DIES)
      ────────────────────────────────────────────────────────────────────── */}
      {gameState.status === 'DRAFTING_RULE' && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-6 z-50 animate-fade-in">
          <div className="max-w-xl w-full bg-slate-900 border-2 border-purple-500 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute -top-16 -right-16 w-44 h-44 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

            {isMeDrafting ? (
              // The dead player writes their rule!
              <div>
                <div className="text-center mb-6">
                  <div className="text-5xl mb-2 animate-bounce">💀📜</div>
                  <h2 className="text-2xl font-black text-rose-500 tracking-tight">
                    TU ES MORT ! MAIS TON SACRIFICE RÉÉCRIT LA RÉALITÉ !
                  </h2>
                  <p className="text-xs text-purple-300 mt-1">
                    Raison : {gameState.draftingReason}. La manche s'arrête immédiatement.
                  </p>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    Écris n'importe quelle règle, punition ou piège en français. L'IA <strong>OpenRouter (Minimax)</strong> va l'analyser et l'intégrer au code du jeu pour toutes les prochaines manches !
                  </p>
                </div>

                {gameState.isAiGenerating ? (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="font-bold text-sm text-purple-300 animate-pulse">
                      L'IA Minimax forge votre décret chaotique...
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmitRule} className="space-y-4">
                    <div>
                      <textarea
                        value={customRuleInput}
                        onChange={e => setCustomRuleInput(e.target.value)}
                        placeholder="Ex : Chaque fois que quelqu'un fait un 6, il perd 20 PV et donne 50 d'or à tout le monde !"
                        className="w-full h-24 bg-slate-950 border border-purple-900/80 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-purple-500 resize-none"
                        required
                      />
                    </div>

                    {/* Quick suggestion buttons */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold">Idées de règles :</span>
                      <div className="flex flex-wrap gap-1.5">
                        {RULE_SUGGESTIONS.map((sug, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setCustomRuleInput(sug)}
                            className="text-[10px] px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 transition text-left"
                          >
                            {sug}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-black rounded-xl shadow-lg shadow-purple-900/40 transition transform active:scale-98 cursor-pointer text-sm"
                    >
                      PROCLAMER CE DÉCRET & RELANCER LA MANCHE 📜🔥
                    </button>
                  </form>
                )}
              </div>
            ) : (
              // Other players wait for the dead player to draft
              <div className="text-center py-6">
                <div className="text-5xl mb-3 animate-pulse">💀⌛</div>
                <h2 className="text-xl font-black text-rose-400 mb-2">
                  {gameState.draftingPlayerName} A SUCCOMBÉ AU CHAOS !
                </h2>
                <p className="text-xs text-slate-400 mb-4">
                  Raison : {gameState.draftingReason}. La manche s'arrête ici.
                </p>

                <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-800/40 text-xs text-purple-200 leading-relaxed mb-6">
                  {gameState.isAiGenerating ? (
                    <div className="flex items-center justify-center gap-2 text-purple-300 animate-pulse font-bold">
                      <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                      L'IA Minimax génère le nouveau décret...
                    </div>
                  ) : (
                    <span>
                      <strong>{gameState.draftingPlayerName}</strong> est actuellement en train de rédiger une nouvelle règle avec l'IA... Préparez-vous à revivre avec cette nouvelle malédiction active !
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
          MODAL 2: NEW RULE ANNOUNCEMENT POPUP (AFTER AI GENERATION)
      ────────────────────────────────────────────────────────────────────── */}
      {gameState.lastAnnouncement && !dismissAnnouncement && gameState.status === 'PLAYING' && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-6 z-40 animate-fade-in">
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
              onClick={() => setDismissAnnouncement(true)}
              className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-bold rounded-xl text-xs transition"
            >
              C'est compris, que le Chaos commence ! 🎲
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
              Après <strong>{gameState.maxRounds} manches</strong> d'apocalypse et <strong>{gameState.activeRules.length} règles chaotiques</strong> accumulées :
            </p>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-white font-bold mb-6">
              Vainqueur Suprême : <span className="text-amber-400 text-lg">{gameState.winner?.username}</span> (avec {gameState.winner?.gold} d'or !)
            </div>

            <button
              onClick={handleResetGame}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-xl text-sm transition"
            >
              Rejouer une Partie du Chaos 😈
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
