import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import type { ChaosGameState, ChaosCellType } from './chaos/chaosTypes';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

const CELL_BG_COLORS: Record<ChaosCellType, string> = {
  DEPART: 'from-emerald-950/80 to-teal-900/60 border-emerald-500/60 text-emerald-300',
  NORMAL: 'from-slate-900 to-slate-950 border-slate-800 text-slate-300',
  GOLD: 'from-amber-950/80 to-yellow-900/60 border-amber-500/60 text-amber-300',
  GAMBLE: 'from-purple-950/80 to-indigo-900/60 border-purple-500/60 text-purple-300',
  DEBT: 'from-rose-950/80 to-red-950/60 border-rose-500/60 text-rose-300',
  FIGHT: 'from-amber-950 to-red-950/80 border-amber-500/80 text-amber-200',
  LAVA: 'from-red-950 to-orange-900/80 border-red-500/80 text-red-200 animate-pulse',
  BUFF: 'from-blue-950/80 to-cyan-900/60 border-blue-500/60 text-blue-300',
  CURSE: 'from-fuchsia-950/80 to-purple-900/60 border-fuchsia-500/60 text-fuchsia-300',
  CHEST: 'from-yellow-950/80 to-amber-900/60 border-yellow-500/60 text-yellow-300',
  PORTAL: 'from-cyan-950/80 to-blue-900/60 border-cyan-500/60 text-cyan-300',
  CHAOS: 'from-violet-950 to-pink-900/80 border-pink-500/70 text-pink-200 animate-pulse'
};

const RULE_SUGGESTIONS = [
  "Ajouter une case Casino Clandestin sur le plateau !",
  "Créer une nouvelle case Fosse de Lave mortelle (-30 PV) !",
  "Transformer la case 4 en Banque Toxique (+500 dette) !",
  "Si un joueur fait un 6, il subit 25 dégâts et donne 50 or à tous !",
  "Toutes les cases paires deviennent des fosses de lave brûlantes !",
  "Chaque passage par la case départ vole 50 d'or aux autres joueurs !"
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

  // Popup & UI tabs
  const [dismissedAnnouncementId, setDismissedAnnouncementId] = useState<string | null>(null);
  const [rightTab, setRightTab] = useState<'RULES' | 'AILOGS' | 'CHRONICLE'>('RULES');

  const logEndRef = useRef<HTMLDivElement | null>(null);
  const aiLogEndRef = useRef<HTMLDivElement | null>(null);

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
      // NOTE: We deliberately do NOT reset dismissedAnnouncementId here!
      // This prevents the announcement popup from reappearing on every subsequent action/roll.
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

  const handleRollDice = () => {
    if (!isMyTurn || diceRolling || gameState?.lastDiceRoll !== null) return;
    setDiceRolling(true);
    socket?.emit('chaos:rollDice');
  };

  const handlePlayAction = (actionType: 'GAMBLE' | 'FIGHT', params: any = {}) => {
    socket?.emit('chaos:playAction', { actionType, params });
  };

  const handleEndTurn = () => {
    socket?.emit('chaos:endTurn');
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
              className="text-xs text-slate-400 hover:text-white transition flex items-center gap-1.5"
            >
              ← Retour à l'accueil
            </button>
            <span className="text-xs font-black tracking-widest uppercase text-amber-400 px-2.5 py-0.5 rounded bg-amber-950/60 border border-amber-800">
              OpenRouter IA Active
            </span>
          </div>

          <div className="text-center mb-8">
            <div className="text-6xl mb-3 animate-bounce">🎲</div>
            <h1 className="text-3xl font-black bg-gradient-to-r from-amber-400 via-purple-400 to-rose-400 bg-clip-text text-transparent">
              CHAOS BOARD
            </h1>
            <p className="text-xs text-slate-400 mt-2">
              Le roguelite de plateau où le joueur éliminé décrète une règle créée par l'IA qui s'accumule à chaque manche !
            </p>
          </div>

          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Pseudo</label>
              <input
                type="text"
                value={usernameInput}
                onChange={e => setUsernameInput(e.target.value)}
                placeholder="Ex: Législateur Fou"
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
              REJOINDRE L'ARÈNE DU CHAOS 🔥
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
              className="text-xs text-slate-400 hover:text-white transition"
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
            <h2 className="text-2xl font-black text-white">Conseil des Législateurs</h2>
            <p className="text-xs text-slate-400 mt-1">En attente des joueurs pour démarrer la Manche 1...</p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            {gameState.players.map((p, idx) => (
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
                  <div className="text-[10px] text-slate-500">Joueur #{idx + 1}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 mb-6 text-xs text-slate-400 space-y-1.5">
            <div className="font-bold text-slate-300">Règles du Chaos :</div>
            <div>• Le premier joueur à 0 PV ou 2 000 pièces de dette meurt sur-le-champ.</div>
            <div>• Le joueur éliminé dicte une <strong>NOUVELLE RÈGLE</strong> (ou crée une nouvelle case) rédigée par l'IA.</div>
            <div>• Tous les joueurs ressuscitent, et les règles <strong>s'accumulent manche après manche</strong> !</div>
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
  // VIEW: PLAYING & BOARD
  // ─────────────────────────────────────────────────────────────────────────
  const activePlayer = gameState.players[gameState.currentPlayerIndex];
  const activeCell = gameState.board[me?.position || 0] || gameState.board[0];

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
            <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
              {gameState.board.length} Cases
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
                          onClick={() => handlePlayAction('GAMBLE', { amount: betAmount })}
                          className="w-full py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-lg transition"
                        >
                          Tenter le Pari ({betAmount}g) 🎲
                        </button>
                      </div>
                    )}

                    {activeCell.type === 'FIGHT' && (
                      <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs">
                        <div className="font-bold text-rose-300 mb-2">⚔️ Antre du Monstre</div>
                        <button
                          onClick={() => handlePlayAction('FIGHT')}
                          className="w-full py-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold rounded-lg transition"
                        >
                          Combattre la Bête ! 🗡️
                        </button>
                      </div>
                    )}

                    <button
                      onClick={handleEndTurn}
                      className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl text-xs transition"
                    >
                      Terminer mon Tour ⏩
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center text-xs text-slate-500">
                En attente du coup de {activePlayer?.username}...
              </div>
            )}
          </div>

          {/* Players Status List */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex-1 flex flex-col">
            <div className="text-xs font-bold text-slate-400 uppercase mb-3">Joueurs & Survie</div>
            <div className="space-y-2.5 flex-1 overflow-y-auto">
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

        {/* Center: The Board (Dynamic Grid Cells) */}
        <div className="col-span-6 flex flex-col gap-3">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3 text-xs">
              <span className="font-bold text-slate-300">
                Plateau du Chaos ({gameState.board.length} Cases)
              </span>
              <span className="text-slate-500">Sens horaire • Cases mutables par les décrets de l'IA</span>
            </div>

            {/* Grid of Cells with auto-wrap and scrolling */}
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5 flex-1 overflow-y-auto pr-1">
              {gameState.board.map(cell => {
                const playersHere = gameState.players.filter(p => p.position === cell.index);
                const theme = CELL_BG_COLORS[cell.type] || CELL_BG_COLORS.NORMAL;
                const isNewTile = cell.index >= 20;

                return (
                  <div
                    key={cell.index}
                    className={`relative p-2.5 rounded-xl border bg-gradient-to-b ${theme} flex flex-col justify-between transition hover:scale-102 shadow-md min-h-[92px]`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold opacity-60">#{cell.index}</span>
                      {isNewTile && (
                        <span className="text-[8px] font-black uppercase tracking-wider bg-amber-500 text-slate-950 px-1 rounded">
                          NOUVELLE
                        </span>
                      )}
                      <span className="text-base">{cell.icon}</span>
                    </div>

                    <div>
                      <div className="font-bold text-xs truncate" title={cell.name}>{cell.name}</div>
                      <div className="text-[9px] opacity-75 truncate" title={cell.description}>{cell.description}</div>
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

        {/* Right Column: Multi-tab Panel (Décrets / Logs IA / Chronique) */}
        <div className="col-span-3 flex flex-col gap-3 overflow-hidden">
          <div className="bg-slate-900/90 border border-purple-900/60 rounded-2xl p-4 shadow-xl flex-1 flex flex-col overflow-hidden">
            {/* Tab Selector */}
            <div className="flex border-b border-purple-900/40 pb-2 mb-3 gap-1">
              <button
                onClick={() => setRightTab('RULES')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                  rightTab === 'RULES'
                    ? 'bg-purple-950 text-purple-200 border border-purple-700/60 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                📜 Décrets ({gameState.activeRules.length})
              </button>
              <button
                onClick={() => setRightTab('AILOGS')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition relative ${
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
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                  rightTab === 'CHRONICLE'
                    ? 'bg-purple-950 text-purple-200 border border-purple-700/60 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                📋 Chronique
              </button>
            </div>

            {/* Tab 1: RULES */}
            {rightTab === 'RULES' && (
              <div className="space-y-2 flex-1 overflow-y-auto pr-1">
                {gameState.activeRules.length === 0 ? (
                  <div className="text-slate-500 text-xs text-center py-12">
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
                        — Décrété par {rule.authorName}
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
                    Aucun appel IA pour l'instant. Les logs d'analyse apparaîtront dès qu'un joueur formulera un décret.
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
                  <h2 className="text-2xl font-black bg-gradient-to-r from-purple-400 to-amber-400 bg-clip-text text-transparent">
                    VOUS AVEZ PÉRI !
                  </h2>
                  <p className="text-xs text-slate-300 mt-1">
                    En tant que <strong>Législateur du Chaos</strong>, vous avez le droit divin d'inventer une NOUVELLE RÈGLE ou de CRÉER UNE NOUVELLE CASE sur le plateau.
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
                      placeholder="Ex: Ajouter une case Casino Clandestin sur le plateau, ou faire un 6 inflige 30 dégâts à tout le monde..."
                      rows={3}
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 text-xs transition"
                      required
                    />
                  </div>

                  {/* Suggestion Chips */}
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold mb-1.5">Idées de Décrets & Cases :</div>
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
                        <span>L'IA analyse et structure votre décret...</span>
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
              // Surviving players wait for the dead player
              <div className="text-center py-6 space-y-4">
                <div className="text-5xl animate-pulse">⚖️👑</div>
                <h2 className="text-2xl font-black text-amber-400">UN JOUEUR EST MORT !</h2>
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
                  {gameState.isAiGenerating ? (
                    <div className="flex flex-col items-center justify-center gap-2 text-purple-300 font-bold">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                        L'IA structure le nouveau décret...
                      </div>
                      {gameState.aiLogs && gameState.aiLogs.length > 0 && (
                        <div className="text-[10px] text-slate-400 font-mono truncate max-w-full">
                          {gameState.aiLogs[gameState.aiLogs.length - 1].message}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span>
                      <strong>{gameState.draftingPlayerName}</strong> est actuellement en train de rédiger un décret divin... Préparez-vous à revivre avec cette nouvelle règle active !
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
