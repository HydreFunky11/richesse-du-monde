import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';

const SERVER_URL = import.meta.env.VITE_WS_SERVER_URL || 'http://localhost:3001';

interface SkyjoCard {
  id: string;
  value: number;
  faceUp: boolean;
}

interface SkyjoPlayer {
  id: string;
  username: string;
  color: string;
  grid: SkyjoCard[][];
  roundScore: number;
  totalScore: number;
  hasFinished: boolean;
}

interface SkyjoGameState {
  status: 'LOBBY' | 'REVEAL_TWO' | 'PLAYING' | 'ROUND_END' | 'FINISHED';
  players: SkyjoPlayer[];
  currentPlayerIndex: number;
  discardPile: SkyjoCard[];
  drawPileCount: number;
  drawnCard: SkyjoCard | null;
  isDrawnFromDiscard: boolean;
  mustRevealCard: boolean;
  roundEnderId: string | null;
  log: string[];
  winner: SkyjoPlayer | null;
}

export default function SkyjoApp() {
  const navigate = useNavigate();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameState, setGameState] = useState<SkyjoGameState | null>(null);
  const [username, setUsername] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState('');

  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const s = io(SERVER_URL);
    setSocket(s);

    s.on('skyjoStateUpdate', (state: SkyjoGameState) => {
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
    socket.emit('joinGame', { username, roomCode, gameType: 'skyjo' });
  };

  const handleStartGame = () => {
    if (socket) socket.emit('skyjo:startGame');
  };

  const handleDrawFromDraw = () => {
    if (socket) {
      socket.emit('skyjo:drawFromDrawPile');
    }
  };

  const handleDrawFromDiscard = () => {
    if (socket) {
      socket.emit('skyjo:drawFromDiscardPile');
    }
  };

  const handleDiscardDrawnCard = () => {
    if (socket) {
      socket.emit('skyjo:discardDrawnCard');
    }
  };

  const handleCardClick = (row: number, col: number) => {
    if (!socket || !gameState) return;

    if (gameState.status === 'REVEAL_TWO') {
      socket.emit('skyjo:revealCardInitial', { row, col });
      return;
    }

    const isMyTurn = gameState.players[gameState.currentPlayerIndex]?.id === socket.id;
    if (!isMyTurn || gameState.status !== 'PLAYING') return;

    if (gameState.mustRevealCard) {
      const targetCard = gameState.players[gameState.currentPlayerIndex].grid[row][col];
      if (targetCard.faceUp) {
        setError("⚠️ Vous devez choisir une carte face cachée à révéler !");
        setTimeout(() => setError(''), 3000);
        return;
      }
      socket.emit('skyjo:revealCard', { row, col });
    } else if (gameState.drawnCard) {
      socket.emit('skyjo:swapDrawnCard', { row, col });
    }
  };

  const handleNextRound = () => {
    if (socket) socket.emit('skyjo:nextRound');
  };

  const handleResetGame = () => {
    if (socket) socket.emit('skyjo:resetGame');
  };

  // Card color helper
  const getCardColor = (val: number) => {
    if (val < 0) return 'bg-blue-600 text-white border-blue-400';
    if (val === 0) return 'bg-cyan-500 text-slate-950 border-cyan-300';
    if (val <= 4) return 'bg-green-600 text-white border-green-400';
    if (val <= 8) return 'bg-yellow-500 text-slate-950 border-yellow-300';
    return 'bg-red-600 text-white border-red-400';
  };

  const me = gameState?.players.find(p => p.id === socket?.id);
  const isMyTurn = gameState && gameState.status === 'PLAYING' && gameState.players[gameState.currentPlayerIndex]?.id === socket?.id;
  const isHost = gameState && gameState.players[0]?.id === socket?.id;

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
            <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] uppercase font-bold px-2 py-0.5 rounded">
              SKYJO 🃟
            </span>
          </div>

          <h1 className="text-3xl font-extrabold text-center mb-2 tracking-tight bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent">
            Skyjo 🃟
          </h1>
          <p className="text-center text-slate-400 text-sm mb-6">
            Optimisez votre grille de 12 cartes et minimisez vos points
          </p>

          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Votre Pseudo</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ex: Mathis"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Code de la Salle</label>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                placeholder="Ex: SKYJO"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-750 text-white font-bold py-3 rounded-lg shadow-lg hover:shadow-emerald-950/30 transition transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              Rejoindre / Créer la salle
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* Navbar */}
      <header className="bg-slate-900 border-b border-slate-850 p-4 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="text-xs bg-slate-800 hover:bg-slate-750 px-3 py-1.5 rounded text-slate-300 border border-slate-700 flex items-center gap-1 cursor-pointer"
          >
            ← Accueil
          </button>
          <span className="font-bold text-lg bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent">
            Skyjo 🃟
          </span>
          <span className="text-slate-500 text-xs font-mono font-bold bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800">
            Salon : {roomCode.toUpperCase()}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {gameState.status === 'LOBBY' && isHost && (
            <button
              onClick={handleStartGame}
              disabled={gameState.players.length < 2}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs px-4 py-2 rounded shadow transition cursor-pointer"
            >
              Démarrer la partie 🚀
            </button>
          )}
          {gameState.status === 'ROUND_END' && isHost && (
            <button
              onClick={handleNextRound}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded shadow transition cursor-pointer"
            >
              Manche Suivante ➔
            </button>
          )}
          {gameState.status === 'FINISHED' && isHost && (
            <button
              onClick={handleResetGame}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded shadow transition cursor-pointer"
            >
              Réinitialiser la partie 🔄
            </button>
          )}
        </div>
      </header>

      {gameState.status === 'LOBBY' ? (
        /* Lobby State */
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl max-w-md w-full shadow-2xl">
            <div className="text-5xl mb-4 animate-bounce">🃟</div>
            <h2 className="text-xl font-bold mb-4">Salon de jeu</h2>
            <div className="space-y-2 mb-6">
              {gameState.players.map((p, idx) => (
                <div key={p.id} className="bg-slate-850 p-2.5 rounded border border-slate-800 flex items-center gap-2 text-sm justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full block" style={{ backgroundColor: p.color }} />
                    <span className="font-semibold">{p.username}</span>
                  </div>
                  {idx === 0 && <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-bold uppercase">Hôte</span>}
                </div>
              ))}
            </div>
            <p className="text-slate-500 text-xs leading-relaxed mb-6">
              Il faut un minimum de 2 joueurs pour démarrer la partie.
            </p>

            {/* Section Règles */}
            <div className="pt-6 border-t border-slate-800 text-left w-full">
              <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-3">📜 Règles de Skyjo :</h3>
              <ul className="text-xs text-slate-400 space-y-2 list-disc list-inside leading-relaxed">
                <li>Chaque joueur reçoit **12 cartes face cachée** (grille 3x4).</li>
                <li>Début de manche : retournez **2 cartes** face visible. Le plus grand total commence.</li>
                <li>À votre tour, piochez de la **pioche** (cachée) ou de la **défausse** (visible) :
                  <ul className="pl-4 list-circle space-y-1 mt-1 text-[11px] text-slate-500">
                    <li>*Pioche défausse* : Remplacez immédiatement une carte de votre grille.</li>
                    <li>*Pioche cachée* : Remplacez une carte OU défaussez-la et révélez une de vos cartes cachées.</li>
                  </ul>
                </li>
                <li>**Alignement** : Alignez 3 cartes identiques sur une même **colonne** pour supprimer la colonne !</li>
                <li>Dès qu'un joueur révèle toute sa grille, la manche prend fin après un dernier tour. Le score le plus bas l'emporte.</li>
              </ul>
            </div>
          </div>
        </div>
      ) : (
        /* Playing / End round state */
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 p-6 overflow-hidden">
          
          {/* Left Panel: Other players grids */}
          <div className="lg:col-span-1 space-y-4 overflow-y-auto max-h-[calc(100vh-200px)] pr-1">
            <h3 className="font-bold text-xs text-slate-400 uppercase tracking-wider">Adversaires</h3>
            {gameState.players.map((p) => {
              if (p.id === socket?.id) return null;

              const isTheirTurn = gameState.players[gameState.currentPlayerIndex]?.id === p.id && gameState.status === 'PLAYING';

              return (
                <div
                  key={p.id}
                  className={`p-3 rounded-xl border transition ${
                    isTheirTurn ? 'bg-emerald-950/20 border-emerald-500/50' : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                      <span className="font-bold text-xs">{p.username}</span>
                    </div>
                    <span className="text-[10px] text-slate-400">Total : {p.totalScore} pts</span>
                  </div>

                  {/* Tiny 3x4 Grid */}
                  <div className="flex flex-col gap-1 select-none">
                    {p.grid.map((rowArr, rIdx) => (
                      <div key={rIdx} className="grid grid-cols-4 gap-1">
                        {rowArr.map((card, cIdx) => (
                          <div
                            key={card.id || `${rIdx}_${cIdx}`}
                            className={`h-7 rounded border text-[9px] font-bold flex items-center justify-center ${
                              card.faceUp ? getCardColor(card.value) : 'bg-slate-850 text-slate-500 border-slate-700'
                            }`}
                          >
                            {card.faceUp ? card.value : '🃟'}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Center Column: Active Player Grid (Large, right in the center) */}
          <div className="lg:col-span-2 flex flex-col justify-between">
            {me && (
              <div className={`bg-slate-900 border rounded-2xl p-6 shadow-inner flex flex-col items-center relative transition-all duration-300 ${
                isMyTurn ? 'border-emerald-500 shadow-[0_0_25px_rgba(16,185,129,0.25)]' : 'border-slate-850'
              }`}>
                
                {/* Overlay for round end */}
                {gameState.status === 'ROUND_END' && (
                  <div className="absolute inset-0 bg-slate-950/90 rounded-2xl flex flex-col items-center justify-center p-6 z-25">
                    <div className="text-4xl mb-2">📊</div>
                    <h3 className="text-lg font-bold text-emerald-400">Fin de la Manche !</h3>
                    <div className="mt-4 w-full max-w-xs space-y-2">
                      {gameState.players.map(p => (
                        <div key={p.id} className="flex justify-between text-xs border-b border-slate-800 pb-1.5">
                          <span className="font-semibold">{p.username} :</span>
                          <span className="text-slate-300">
                            {p.roundScore} pts (Cumulé : {p.totalScore} pts)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Overlay for game finished */}
                {gameState.status === 'FINISHED' && gameState.winner && (
                  <div className="absolute inset-0 bg-slate-950/95 rounded-2xl flex flex-col items-center justify-center p-6 z-25 text-center">
                    <div className="text-5xl mb-4">🏆</div>
                    <h2 className="text-2xl font-black bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent">
                      {gameState.winner.username} Gagne !
                    </h2>
                    <p className="text-xs text-slate-400 mt-2">
                      La partie est terminée avec un score final de {gameState.winner.totalScore} points.
                    </p>
                    <div className="mt-6 space-y-1.5 w-full max-w-xs">
                      {gameState.players.map(p => (
                        <div key={p.id} className="flex justify-between text-xs text-slate-350 border-b border-slate-850 pb-1">
                          <span>{p.username} :</span>
                          <span className="font-bold">{p.totalScore} pts</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Large Pulsing Turn Notification Banner */}
                {isMyTurn ? (
                  <div className="w-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-center py-2.5 rounded-xl font-bold text-xs mb-6 animate-pulse uppercase tracking-wider flex items-center justify-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 block" />
                    🟢 C'est votre tour de jouer !
                  </div>
                ) : (
                  <div className="w-full bg-slate-950/40 border border-slate-850 text-slate-500 text-center py-2.5 rounded-xl font-medium text-[10px] mb-6 uppercase tracking-wider flex items-center justify-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-slate-700 block animate-ping" />
                    Tour de : {gameState.players[gameState.currentPlayerIndex]?.username}
                  </div>
                )}

                <div className="flex justify-between items-center w-full max-w-md mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: me.color }} />
                    <span className="font-bold text-sm text-slate-200">Votre Grille</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400 font-mono">Cumulé : <span className="text-white font-bold">{me.totalScore}</span> pts</span>
                  </div>
                </div>

                {/* 3x4 grid rendering */}
                <div className="flex flex-col gap-3 select-none w-full max-w-md">
                  {me.grid.map((rowArr, rIdx) => (
                    <div key={rIdx} className="grid grid-cols-4 gap-3">
                      {rowArr.map((card, cIdx) => {
                        const canClick =
                          gameState.status === 'REVEAL_TWO' ||
                          (isMyTurn && (!!gameState.drawnCard || gameState.mustRevealCard));

                        return (
                          <button
                            key={card.id || `${rIdx}_${cIdx}`}
                            onClick={() => handleCardClick(rIdx, cIdx)}
                            disabled={!canClick}
                            className={`h-24 rounded-lg border-2 flex items-center justify-center font-extrabold text-2xl shadow-md transition transform ${
                              card.faceUp ? getCardColor(card.value) : 'bg-slate-850 border-slate-750 text-slate-500'
                            } ${
                              canClick ? 'hover:scale-105 hover:border-white cursor-pointer' : 'cursor-default opacity-85'
                            }`}
                          >
                            {card.faceUp ? card.value : '🃟'}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>

                {/* Turn assistance instructions */}
                {isMyTurn && (
                  <div className="text-[10px] text-emerald-400 bg-emerald-950/20 border border-emerald-900/30 font-semibold mt-4 text-center px-4 py-2 rounded-lg w-full max-w-md">
                    {gameState.mustRevealCard
                      ? "📍 Cliquez sur l'une de vos cartes cachées pour la révéler."
                      : gameState.drawnCard
                      ? "📍 Cliquez sur l'une de vos cartes pour l'échanger avec la carte piochée."
                      : "📍 Piochez dans la pioche cachée ou récupérez la défausse."}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Board piles & Game Logs */}
          <div className="lg:col-span-1 space-y-4 flex flex-col justify-between">
            {/* Draw and Discard pile (Vertical layout) */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-4 shadow-lg items-center">
              <h3 className="font-bold text-xs text-slate-400 uppercase tracking-wider self-start">Pioches</h3>
              
              <div className="flex gap-4 items-center justify-center w-full">
                {/* Draw Pile */}
                <div className="text-center flex flex-col items-center">
                  <span className="text-[9px] text-slate-400 uppercase font-semibold mb-1">Pioche ({gameState.drawPileCount})</span>
                  <button
                    onClick={handleDrawFromDraw}
                    disabled={!isMyTurn || !!gameState.drawnCard || gameState.mustRevealCard}
                    className={`w-16 h-24 rounded-lg border-2 flex items-center justify-center font-bold text-lg shadow-xl transition transform select-none ${
                      isMyTurn && !gameState.drawnCard && !gameState.mustRevealCard
                        ? 'bg-slate-850 border-emerald-500 hover:-translate-y-1 cursor-pointer hover:bg-slate-800 text-white'
                        : 'bg-slate-900 border-slate-850 text-slate-700 opacity-60'
                    }`}
                  >
                    🃟
                  </button>
                </div>

                {/* Drawn Card display with discard option */}
                {gameState.drawnCard && (
                  <div className="text-center flex flex-col items-center gap-1">
                    <span className="text-[9px] text-emerald-400 font-bold uppercase mb-1">Piochée</span>
                    <div
                      className={`w-16 h-24 rounded-lg border-2 flex flex-col items-center justify-center font-extrabold text-2xl shadow-xl ${getCardColor(
                        gameState.drawnCard.value
                      )}`}
                    >
                      <span>{gameState.drawnCard.value}</span>
                    </div>
                    {isMyTurn && !gameState.isDrawnFromDiscard && (
                      <button
                        onClick={handleDiscardDrawnCard}
                        className="bg-red-950/85 hover:bg-red-900 text-red-400 border border-red-900/40 font-bold text-[8px] px-1.5 py-0.5 rounded cursor-pointer transition w-full"
                      >
                        🗑️ Jetter
                      </button>
                    )}
                  </div>
                )}

                {/* Discard Pile */}
                <div className="text-center flex flex-col items-center">
                  <span className="text-[9px] text-slate-400 uppercase font-semibold mb-1">Défausse</span>
                  {gameState.discardPile.length > 0 ? (
                    <button
                      onClick={handleDrawFromDiscard}
                      disabled={!isMyTurn || !!gameState.drawnCard || gameState.mustRevealCard}
                      className={`w-16 h-24 rounded-lg border-2 flex items-center justify-center font-extrabold text-2xl shadow-xl transition transform select-none ${
                        gameState.discardPile[gameState.discardPile.length - 1]
                          ? getCardColor(gameState.discardPile[gameState.discardPile.length - 1].value)
                          : ''
                      } ${
                        isMyTurn && !gameState.drawnCard && !gameState.mustRevealCard
                          ? 'hover:-translate-y-1 border-white hover:border-emerald-400 cursor-pointer'
                          : 'border-slate-850 opacity-60'
                      }`}
                    >
                      {gameState.discardPile[gameState.discardPile.length - 1]?.value}
                    </button>
                  ) : (
                    <div className="w-16 h-24 rounded-lg border-2 border-dashed border-slate-800 flex items-center justify-center text-slate-650 italic text-[10px]">
                      Vide
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Round end / ender alert */}
            {gameState.roundEnderId && (
              <div className="bg-emerald-950/20 border border-emerald-500/30 p-3 rounded-xl shadow text-xs">
                <span className="font-bold text-emerald-400 block mb-0.5 font-sans">🏁 Fin de manche</span>
                Un joueur a retourné toutes ses cartes. Dernier tour de table !
              </div>
            )}

            {/* Game Logs */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex-1 flex flex-col max-h-[300px]">
              <h3 className="font-bold text-xs text-slate-400 mb-3 uppercase tracking-wider">Journal du salon</h3>
              <div className="overflow-y-auto font-mono text-[10px] text-slate-350 space-y-1.5 pr-1">
                {gameState.log.map((line, idx) => (
                  <div key={idx} className="border-b border-slate-850/50 pb-1 last:border-none">
                    {line}
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            </div>     </div>
        </div>
      )}
    </div>
  );
}
