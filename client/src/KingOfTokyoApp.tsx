import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';

const SERVER_URL = import.meta.env.VITE_WS_SERVER_URL || import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

interface KotCard {
  id: string;
  name: string;
  cost: number;
  effect: 'keep' | 'discard';
  description: string;
}

interface KotPlayer {
  id: string;
  username: string;
  color: string;
  monsterName: string;
  hp: number;
  vp: number;
  energy: number;
  cards: KotCard[];
  isDead: boolean;
}

interface KotGameState {
  status: 'LOBBY' | 'PLAYING' | 'RESOLVING_ATTACK' | 'FINISHED';
  players: KotPlayer[];
  currentPlayerIndex: number;
  tokyoMonsterId: string | null;
  dice: string[];
  diceKept: boolean[];
  rollCount: number;
  store: KotCard[];
  log: string[];
  winner: KotPlayer | null;
  pendingYieldRequest: {
    tokyoMonsterId: string;
    attackerId: string;
    damage: number;
  } | null;
}

export default function KingOfTokyoApp() {
  const navigate = useNavigate();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameState, setGameState] = useState<KotGameState | null>(null);
  const [username, setUsername] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState('');

  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const s = io(SERVER_URL);
    setSocket(s);

    s.on('kingStateUpdate', (state: KotGameState) => {
      setGameState(state);
      setJoined(true);
      setError('');
    });

    s.on('error', (msg: string) => {
      setError(msg);
    });

    return () => {
      s.disconnect();
    };
  }, []);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [gameState?.log]);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !roomCode.trim() || !socket) return;
    socket.emit('joinGame', { username, roomCode, gameType: 'kingoftokyo' });
  };

  const handleStartGame = () => {
    if (socket) socket.emit('king:startGame');
  };

  const handleToggleKeep = (index: number) => {
    if (socket) socket.emit('king:toggleKeep', { index });
  };

  const handleRollDice = () => {
    if (socket) socket.emit('king:rollDice');
  };

  const handleResolveDice = () => {
    if (socket) socket.emit('king:resolveDice');
  };

  const handleRespondYield = (yieldTokyo: boolean) => {
    if (socket) socket.emit('king:respondYield', { yieldTokyo });
  };

  const handleBuyCard = (cardId: string) => {
    if (socket) socket.emit('king:buyCard', { cardId });
  };

  const handleEndTurn = () => {
    if (socket) socket.emit('king:endTurn');
  };

  const handleResetGame = () => {
    if (socket) socket.emit('king:resetGame');
  };

  const getDieIcon = (val: string) => {
    switch (val) {
      case 'ATTACK': return '💥';
      case 'HEAL': return '❤️';
      case 'ENERGY': return '⚡';
      default: return val;
    }
  };

  const getDieColor = (val: string) => {
    switch (val) {
      case 'ATTACK': return 'bg-red-950/40 text-red-400 border-red-500/40';
      case 'HEAL': return 'bg-emerald-950/40 text-emerald-400 border-emerald-500/40';
      case 'ENERGY': return 'bg-amber-950/40 text-amber-400 border-amber-500/40';
      default: return 'bg-slate-900 text-slate-300 border-slate-700';
    }
  };

  const me = gameState?.players.find(p => p.id === socket?.id);
  const isMyTurn = gameState && gameState.status === 'PLAYING' && gameState.players[gameState.currentPlayerIndex]?.id === socket?.id;
  const isHost = gameState && gameState.players[0]?.id === socket?.id;
  const tokyoMonster = gameState?.players.find(p => p.id === gameState.tokyoMonsterId);

  if (!joined || !gameState) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="bg-slate-900 p-8 rounded-2xl shadow-2xl w-full max-w-md border border-slate-800">
          <div className="flex justify-between items-center mb-6">
            <button
              onClick={() => navigate('/')}
              className="text-xs text-slate-400 hover:text-white transition flex items-center gap-1 cursor-pointer"
            >
              ← Accueil
            </button>
            <span className="bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] uppercase font-bold px-2 py-0.5 rounded">
              KING OF TOKYO 🦖
            </span>
          </div>

          <h1 className="text-3xl font-black text-center mb-2 tracking-tight bg-gradient-to-r from-red-500 to-amber-500 bg-clip-text text-transparent">
            King of Tokyo 🦖
          </h1>
          <p className="text-center text-slate-400 text-sm mb-6">
            Devenez le roi suprême de Tokyo en baffant vos rivaux
          </p>

          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Votre Pseudo</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ex: MiaouZilla"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-550"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Code de la Salle</label>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                placeholder="Ex: TOKYO"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-550"
                required
              />
            </div>

            {error && (
              <div className="bg-red-950/40 border border-red-500/40 text-red-300 text-xs p-3 rounded-lg">
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-red-555 to-amber-600 hover:from-red-600 hover:to-amber-700 text-white font-bold py-3 rounded-lg shadow-lg hover:shadow-red-950/30 transition transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              Rejoindre / Créer le combat
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-955 text-slate-100 flex flex-col justify-between">
      {/* Navbar */}
      <header className="bg-slate-900 border-b border-slate-850 p-4 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="text-xs bg-slate-800 hover:bg-slate-750 px-3 py-1.5 rounded text-slate-300 border border-slate-700 flex items-center gap-1 cursor-pointer"
          >
            ← Accueil
          </button>
          <span className="font-black text-lg bg-gradient-to-r from-red-500 to-amber-500 bg-clip-text text-transparent">
            King of Tokyo 🦖
          </span>
          <span className="text-slate-500 text-xs font-mono font-bold bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800">
            Arène : {roomCode.toUpperCase()}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {gameState.status === 'LOBBY' && isHost && (
            <button
              onClick={handleStartGame}
              disabled={gameState.players.length < 2}
              className="bg-red-655 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs px-4 py-2 rounded shadow transition cursor-pointer"
            >
              Lancer la bagarre ! ⚔️
            </button>
          )}
          {gameState.status === 'FINISHED' && isHost && (
            <button
              onClick={handleResetGame}
              className="bg-red-655 hover:bg-red-700 text-white font-bold text-xs px-4 py-2 rounded shadow transition cursor-pointer"
            >
              Nouvelle partie 🔄
            </button>
          )}
        </div>
      </header>

      {gameState.status === 'LOBBY' ? (
        /* Lobby Section */
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl max-w-md w-full shadow-2xl">
            <div className="text-5xl mb-4 animate-bounce">🦖</div>
            <h2 className="text-xl font-bold mb-4 font-sans tracking-wide">Monstres en approche</h2>
            <div className="space-y-2 mb-6">
              {gameState.players.map((p) => (
                <div key={p.id} className="bg-slate-850 p-2.5 rounded border border-slate-800 flex items-center gap-2 text-sm justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full block" style={{ backgroundColor: p.color }} />
                    <span className="font-semibold">{p.username}</span>
                  </div>
                  <span className="text-[10px] text-red-400 font-mono font-bold bg-slate-900/60 px-2 py-0.5 rounded border border-slate-800">
                    {p.monsterName}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-slate-500 text-xs leading-relaxed mb-6">
              Il faut un minimum de 2 monstres pour commencer la destruction de Tokyo.
            </p>

            {/* Section Règles */}
            <div className="pt-6 border-t border-slate-800 text-left w-full">
              <h3 className="text-xs font-bold text-red-400 uppercase tracking-wider mb-3">📜 Règles de Tokyo :</h3>
              <ul className="text-xs text-slate-400 space-y-2 list-disc list-inside leading-relaxed">
                <li>But : Atteindre **20 points de victoire (PV)** ou être le **dernier monstre en vie**.</li>
                <li>**Tokyo City** : Le monstre dans Tokyo gagne +1 PV en y entrant, et +2 PV s'il y commence son tour.</li>
                <li>**Attaques** : Les baffes (claws) de l'intérieur attaquent tous les monstres à l'extérieur. De l'extérieur, elles ciblent uniquement celui à l'intérieur.</li>
                <li>**Soin** : On ne peut pas se soigner avec les cœurs ❤️ quand on est **dans Tokyo** !</li>
                <li>**Cartes** : Achetez des cartes de pouvoir au magasin grâce à l'énergie ⚡ piochée !</li>
              </ul>
            </div>
          </div>
        </div>
      ) : (
        /* Game Playing State */
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 p-6 overflow-hidden select-none">
          
          {/* Left panel: Player List */}
          <div className="lg:col-span-1 space-y-4 overflow-y-auto max-h-[calc(100vh-130px)] pr-1">
            <h3 className="font-bold text-xs text-slate-450 uppercase tracking-wider">Monstres en lice</h3>
            
            {gameState.players.map((p) => {
              const isCurrent = gameState.players[gameState.currentPlayerIndex]?.id === p.id && gameState.status === 'PLAYING';
              const isInTokyo = gameState.tokyoMonsterId === p.id;

              return (
                <div
                  key={p.id}
                  className={`p-3.5 rounded-xl border transition flex flex-col gap-2 relative ${
                    p.isDead 
                      ? 'bg-slate-950/40 border-slate-900 opacity-40' 
                      : isCurrent 
                      ? 'bg-red-950/20 border-red-500 shadow-lg' 
                      : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  {isInTokyo && (
                    <span className="absolute top-2.5 right-2.5 text-xs bg-amber-500/10 text-amber-400 border border-amber-500/25 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider animate-pulse flex items-center gap-1">
                      👑 TOKYO
                    </span>
                  )}

                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                    <span className="font-black text-xs">{p.username}</span>
                  </div>

                  <div className="text-[10px] text-slate-400 font-mono font-bold bg-slate-950/60 px-2 py-0.5 rounded border border-slate-800/80 w-fit">
                    {p.monsterName}
                  </div>

                  {/* Stats Row */}
                  <div className="grid grid-cols-3 gap-2 mt-1 text-center font-mono">
                    <div className="bg-red-950/40 border border-red-900/30 py-1 rounded text-red-400">
                      <div className="text-[9px] uppercase text-slate-500">Vie</div>
                      <div className="text-xs font-black">❤️ {p.hp}/10</div>
                    </div>
                    <div className="bg-amber-950/40 border border-amber-900/30 py-1 rounded text-amber-400">
                      <div className="text-[9px] uppercase text-slate-500">Points</div>
                      <div className="text-xs font-black">⭐ {p.vp}/20</div>
                    </div>
                    <div className="bg-cyan-950/40 border border-cyan-900/30 py-1 rounded text-cyan-400">
                      <div className="text-[9px] uppercase text-slate-500">Énergie</div>
                      <div className="text-xs font-black">⚡ {p.energy}</div>
                    </div>
                  </div>

                  {/* Player Hand Cards */}
                  {p.cards.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {p.cards.map(c => (
                        <span key={c.id} className="text-[8px] bg-slate-800 text-slate-300 border border-slate-700 px-1 rounded font-medium" title={c.description}>
                          {c.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Center Column: Tokyo City & Dice Board */}
          <div className="lg:col-span-2 flex flex-col justify-between gap-6">
            
            {/* Tokyo City visual arena */}
            <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-850 rounded-2xl p-6 shadow-inner relative flex flex-col items-center justify-center min-h-[220px]">
              <div className="absolute top-3 left-3 text-[10px] text-slate-400 font-bold uppercase tracking-widest bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
                🏢 Quartier de Tokyo City
              </div>

              {tokyoMonster ? (
                <div className="text-center flex flex-col items-center gap-3 animate-fade-in">
                  <div className="w-16 h-16 rounded-full bg-amber-500/10 border-2 border-amber-500 flex items-center justify-center text-4xl shadow-xl shadow-amber-950/30 animate-pulse">
                    🦖
                  </div>
                  <div>
                    <h3 className="text-xs text-amber-400 font-black tracking-wider uppercase">Monstre occupant Tokyo</h3>
                    <h2 className="text-xl font-extrabold text-white mt-0.5">{tokyoMonster.username}</h2>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">{tokyoMonster.monsterName} • ❤️ {tokyoMonster.hp} PV</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 flex flex-col items-center gap-2">
                  <div className="text-4xl text-slate-650 animate-bounce">🏙️</div>
                  <h3 className="text-xs font-bold text-slate-450 uppercase tracking-widest">Tokyo est libre !</h3>
                  <p className="text-[10px] text-slate-500 italic max-w-xs leading-relaxed">
                    Le premier monstre qui réalisera une attaque 💥 entrera dans la ville pour y semer le chaos.
                  </p>
                </div>
              )}

              {/* Yield Action Overlay */}
              {gameState.status === 'RESOLVING_ATTACK' && gameState.pendingYieldRequest && (
                <div className="absolute inset-0 bg-slate-950/90 rounded-2xl flex flex-col items-center justify-center p-6 z-30">
                  <div className="text-3xl mb-1">🏃💨</div>
                  <h3 className="text-sm font-black text-red-400 uppercase tracking-wider">Attaque subie !</h3>
                  
                  {gameState.pendingYieldRequest.tokyoMonsterId === socket?.id ? (
                    <div className="mt-3 text-center max-w-sm">
                      <p className="text-xs text-slate-300 leading-relaxed mb-4">
                        Vous avez subi **{gameState.pendingYieldRequest.damage} dégâts** ! Voulez-vous fuir Tokyo et céder votre place ?
                      </p>
                      <div className="flex gap-4 justify-center">
                        <button
                          onClick={() => handleRespondYield(true)}
                          className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition cursor-pointer"
                        >
                          Fuir Tokyo 🏃
                        </button>
                        <button
                          onClick={() => handleRespondYield(false)}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs px-4 py-2 rounded-xl border border-slate-700 transition cursor-pointer"
                        >
                          Rester 💪
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic text-center mt-2">
                      Attente de la décision de l'occupant de fuir ou rester dans Tokyo...
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Dice and turn control board */}
            {me && (
              <div className={`bg-slate-900 border rounded-2xl p-6 shadow-md flex flex-col items-center relative transition ${
                isMyTurn ? 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.15)]' : 'border-slate-850'
              }`}>
                {/* Large Pulsing Turn Notification Banner */}
                {isMyTurn ? (
                  <div className="w-full bg-red-500/20 border border-red-550/30 text-red-400 text-center py-2 rounded-xl font-bold text-xs mb-4 animate-pulse uppercase tracking-wider">
                    💥 C'est votre tour de ravager la ville !
                  </div>
                ) : (
                  <div className="w-full bg-slate-950/40 border border-slate-850 text-slate-500 text-center py-2 rounded-xl font-medium text-[10px] mb-4 uppercase tracking-wider">
                    Tour de : {gameState.players[gameState.currentPlayerIndex]?.username}
                  </div>
                )}

                {/* 6 Dice grid */}
                <div className="grid grid-cols-6 gap-3 mb-6 select-none w-full max-w-md">
                  {gameState.dice.map((val, idx) => {
                    const isKept = gameState.diceKept[idx];
                    const clickable = isMyTurn && gameState.rollCount > 0 && gameState.rollCount < 3;

                    return (
                      <button
                        key={idx}
                        onClick={() => clickable && handleToggleKeep(idx)}
                        disabled={!clickable}
                        className={`h-16 rounded-xl border-2 flex flex-col items-center justify-center font-extrabold text-lg shadow transition transform relative ${getDieColor(
                          val
                        )} ${
                          isKept ? 'ring-2 ring-amber-500 border-amber-500' : ''
                        } ${
                          clickable ? 'hover:scale-105 cursor-pointer' : 'cursor-default'
                        }`}
                      >
                        {isKept && (
                          <span className="absolute -top-1.5 -right-1 text-[8px] bg-amber-500 text-slate-950 px-1 rounded font-black font-sans">
                            GARDÉ
                          </span>
                        )}
                        <span className="text-2xl">{getDieIcon(val)}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Dice actions buttons */}
                {isMyTurn && (
                  <div className="flex gap-4 items-center justify-center w-full max-w-sm">
                    {gameState.rollCount < 3 && (
                      <button
                        onClick={handleRollDice}
                        className="flex-1 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow transition cursor-pointer"
                      >
                        {gameState.rollCount === 0 ? "Lancer les dés 🎲" : `Relancer non-gardés (${gameState.rollCount}/3) 🔄`}
                      </button>
                    )}

                    {gameState.rollCount > 0 && (
                      <button
                        onClick={handleResolveDice}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow transition cursor-pointer"
                      >
                        Valider & Résoudre ✔️
                      </button>
                    )}

                    {gameState.rollCount >= 3 && (
                      <button
                        onClick={handleEndTurn}
                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 px-4 rounded-xl text-xs border border-slate-700 transition cursor-pointer"
                      >
                        Finir le tour ➔
                      </button>
                    )}
                  </div>
                )}

                {/* Instructions */}
                {isMyTurn && (
                  <div className="text-[10px] text-slate-400 mt-4 text-center font-mono">
                    {gameState.rollCount === 0
                      ? "📍 Lancez les dés pour commencer votre tour."
                      : gameState.rollCount < 3
                      ? "📍 Sélectionnez les dés à VERROUILLER (cliquez dessus) puis relancez, ou résolvez."
                      : "📍 Vos dés sont définitifs. Résolvez leurs effets puis terminez votre tour."}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Store & Logs */}
          <div className="lg:col-span-1 space-y-4 flex flex-col justify-between">
            {/* Cards Power Store */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col gap-3">
              <h3 className="font-bold text-xs text-slate-400 uppercase tracking-wider">🛒 Boutique de Pouvoirs</h3>
              
              <div className="space-y-2">
                {gameState.store.length === 0 ? (
                  <div className="text-[10px] text-slate-500 italic py-2">
                    Boutique épuisée.
                  </div>
                ) : (
                  gameState.store.map((c) => {
                    const canAfford = me && me.energy >= c.cost && isMyTurn && gameState.rollCount > 0;

                    return (
                      <div
                        key={c.id}
                        className="p-2.5 bg-slate-850 rounded border border-slate-750 flex flex-col justify-between gap-1 text-[10px]"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-slate-200">{c.name}</span>
                          <span className="text-cyan-400 font-mono font-bold">⚡ {c.cost}</span>
                        </div>
                        <p className="text-[9px] text-slate-400 leading-snug">{c.description}</p>
                        
                        {canAfford && (
                          <button
                            onClick={() => handleBuyCard(c.id)}
                            className="mt-1 w-full bg-cyan-950 text-cyan-400 hover:bg-cyan-900 hover:text-white border border-cyan-800 py-0.5 rounded font-bold text-[9px] transition cursor-pointer text-center"
                          >
                            Acheter 🛒
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Game Logs */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex-1 flex flex-col max-h-[220px]">
              <h3 className="font-bold text-xs text-slate-400 mb-2 uppercase tracking-wider">Journal du salon</h3>
              <div className="overflow-y-auto font-mono text-[9px] text-slate-350 space-y-1.5 pr-1">
                {gameState.log.map((line, idx) => (
                  <div key={idx} className="border-b border-slate-850/50 pb-1 last:border-none">
                    {line}
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
