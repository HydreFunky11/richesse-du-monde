import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

type ChaosCellType = 'DEPART' | 'NORMAL' | 'GOLD' | 'GAMBLE' | 'DEBT' | 'FIGHT' | 'PATCH' | 'LAVA' | 'BUFF' | 'CURSE';

interface ChaosCell {
  index: number;
  type: ChaosCellType;
  modifier?: string;
}

interface ChaosPlayer {
  id: string;
  username: string;
  color: string;
  position: number;
  health: number;
  gold: number;
  power: number;
  debt: number;
  isEliminated: boolean;
  eliminatedBy?: string;
}

interface ChaosGameState {
  status: 'LOBBY' | 'PLAYING' | 'FINISHED';
  players: ChaosPlayer[];
  currentPlayerIndex: number;
  board: ChaosCell[];
  lastDiceRoll: number | null;
  globalModifiers: string[];
  winner: ChaosPlayer | null;
  log: string[];
}

export default function ChaosApp() {
  const navigate = useNavigate();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameState, setGameState] = useState<ChaosGameState | null>(null);
  const [username, setUsername] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState('');
  const [betAmount, setBetAmount] = useState('100');
  const [selectedCellToModify, setSelectedCellToModify] = useState<number | null>(null);

  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const s = io(SERVER_URL);
    setSocket(s);

    s.on('chaosStateUpdate', (state: ChaosGameState) => {
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
    socket.emit('joinGame', { username, roomCode, gameType: 'chaos' });
  };

  const handleStartGame = () => {
    if (socket) socket.emit('chaos:startGame');
  };

  const handleRollDice = () => {
    if (socket) socket.emit('chaos:rollDice');
  };

  const handlePlayAction = (actionType: string, params: any = {}) => {
    if (socket) socket.emit('chaos:playAction', { actionType, params });
  };

  const handlePassTurn = () => {
    if (socket) socket.emit('chaos:passTurn');
  };

  const handleModifyCell = (cellIndex: number, newType: ChaosCellType) => {
    if (socket) {
      socket.emit('chaos:modifyCell', { cellIndex, newType });
      setSelectedCellToModify(null);
    }
  };

  const handleResetGame = () => {
    if (socket) socket.emit('chaos:resetGame');
  };

  const me = gameState?.players.find((p) => p.id === socket?.id);
  const isMyTurn = gameState && gameState.players[gameState.currentPlayerIndex]?.id === socket?.id;

  if (!joined || !gameState) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="bg-slate-900 p-8 rounded-2xl shadow-2xl w-full max-w-md border border-slate-800">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => navigate('/')}
              className="text-xs text-slate-400 hover:text-white transition flex items-center gap-1"
            >
              ← Accueil
            </button>
            <span className="bg-orange-500/20 text-orange-400 border border-orange-500/30 text-[10px] uppercase font-bold px-2 py-0.5 rounded">
              BÊTA CHAOS
            </span>
          </div>

          <h1 className="text-3xl font-extrabold text-center mb-2 tracking-tight bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
            Chaos Board 🎭
          </h1>
          <p className="text-center text-slate-400 text-sm mb-6">
            Modifiez les règles en direct et survivez au plateau
          </p>

          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Votre Pseudo</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ex: Alexandre"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Code de la Salle</label>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                placeholder="Ex: CHAOS"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
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
              className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-bold py-3 rounded-lg shadow-lg hover:shadow-orange-950/30 transition transform hover:-translate-y-0.5 active:translate-y-0"
            >
              Rejoindre / Créer la partie
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-850 p-4 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="text-xs bg-slate-800 hover:bg-slate-750 px-3 py-1.5 rounded text-slate-300 border border-slate-700 flex items-center gap-1"
          >
            ← Accueil
          </button>
          <span className="font-bold text-lg bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
            Chaos Board 🎭
          </span>
          <span className="text-slate-500 text-xs font-mono font-bold bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800">
            Salle : {roomCode.toUpperCase()}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {gameState.status === 'LOBBY' && gameState.players[0]?.id === socket?.id && (
            <button
              onClick={handleStartGame}
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs px-4 py-2 rounded shadow transition"
            >
              Démarrer la partie 🚀
            </button>
          )}
          {gameState.status === 'FINISHED' && (
            <button
              onClick={handleResetGame}
              className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-4 py-2 rounded shadow transition"
            >
              Réinitialiser 🔄
            </button>
          )}
        </div>
      </header>

      {/* Main Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 p-6">
        
        {/* Left Side: Players & Rules */}
        <div className="lg:col-span-1 space-y-4">
          {/* Players status */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
            <h3 className="font-bold text-xs text-slate-400 mb-3 uppercase tracking-wider">Joueurs</h3>
            <div className="space-y-3">
              {gameState.players.map((p, idx) => {
                const isCurrent = idx === gameState.currentPlayerIndex;
                return (
                  <div
                    key={p.id}
                    className={`p-3 rounded-lg border flex flex-col gap-1.5 transition ${
                      p.isEliminated
                        ? 'bg-red-950/10 border-red-900/50 opacity-60'
                        : isCurrent
                        ? 'bg-orange-950/20 border-orange-500/80 ring-2 ring-orange-500/30'
                        : 'bg-slate-850 border-slate-750'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                        <span className="font-semibold text-sm">{p.username}</span>
                      </div>
                      {p.isEliminated ? (
                        <span className="text-[9px] bg-red-900/80 text-red-200 px-1.5 py-0.5 rounded font-bold uppercase">
                          SPECTC.
                        </span>
                      ) : (
                        isCurrent && (
                          <span className="text-[9px] bg-orange-500 text-white px-1.5 py-0.5 rounded font-bold uppercase animate-pulse">
                            TOUR
                          </span>
                        )
                      )}
                    </div>

                    {!p.isEliminated && (
                      <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs text-slate-300 font-mono">
                        <div>❤️ HP : <span className="font-bold text-green-400">{p.health}</span></div>
                        <div>💪 Force : <span className="font-bold text-cyan-400">{p.power}</span></div>
                        <div>💰 Or : <span className="font-bold text-yellow-400">{p.gold}</span></div>
                        <div>🏦 Dette : <span className={`font-bold ${p.debt > 0 ? 'text-red-400' : 'text-slate-400'}`}>{p.debt}/2000</span></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Patches Modifiers */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
            <h3 className="font-bold text-xs text-slate-400 mb-3 uppercase tracking-wider">Patchs Globaux</h3>
            <div className="space-y-2">
              {gameState.globalModifiers.length === 0 ? (
                <div className="text-xs text-slate-500 italic">Aucun patch actif pour l'instant.</div>
              ) : (
                gameState.globalModifiers.map((mod) => (
                  <div key={mod} className="bg-slate-800/80 border border-orange-500/20 text-orange-300 text-xs px-2.5 py-1.5 rounded font-mono">
                    ⚠️ {mod === 'LAVA_BUFF' ? 'Lave dévastatrice (50 PV)' : mod === 'INTEREST_BUFF' ? 'Intérêts à +20%' : 'Départ Boosté (500 Or)'}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Center: The Board & Game Interactions */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* Circular Board Layout */}
          <div className="bg-slate-900 border border-slate-850 rounded-2xl p-6 shadow-inner flex items-center justify-center relative min-h-[450px]">
            {gameState.status === 'LOBBY' ? (
              <div className="text-center text-slate-500">
                <div className="text-5xl mb-3 animate-bounce">⏱️</div>
                <div className="text-sm font-bold">En attente du lancement par l'hôte...</div>
                <div className="text-xs mt-1">Invitez des amis en leur donnant le code de salle.</div>
              </div>
            ) : (
              <div className="grid grid-cols-6 grid-rows-6 gap-2 w-[420px] h-[420px]">
                {gameState.board.map((cell) => {
                  // Coordinate placement for 6x6 grid loop around the borders
                  let gridRow = 1;
                  let gridColumn = 1;
                  const idx = cell.index;
                  if (idx <= 5) { gridRow = 1; gridColumn = idx + 1; }
                  else if (idx <= 9) { gridRow = idx - 4; gridColumn = 6; }
                  else if (idx <= 14) { gridRow = 6; gridColumn = 6 - (idx - 10); }
                  else { gridRow = 6 - (idx - 15); gridColumn = 1; }

                  // Color code cell based on type
                  let cellColor = 'bg-slate-800 border-slate-700 hover:bg-slate-750';
                  if (cell.type === 'DEPART') cellColor = 'bg-amber-950/40 border-amber-500 font-bold';
                  else if (cell.type === 'LAVA') cellColor = 'bg-red-950/60 border-red-500 text-red-300 font-bold animate-pulse';
                  else if (cell.type === 'DEBT') cellColor = 'bg-slate-900 border-yellow-800 text-yellow-300';
                  else if (cell.type === 'GAMBLE') cellColor = 'bg-slate-900 border-emerald-700 text-emerald-300';
                  else if (cell.type === 'FIGHT') cellColor = 'bg-slate-900 border-cyan-700 text-cyan-300';
                  else if (cell.type === 'PATCH') cellColor = 'bg-slate-900 border-purple-700 text-purple-300';
                  else if (cell.type === 'BUFF') cellColor = 'bg-green-950/40 border-green-500 text-green-300';
                  else if (cell.type === 'CURSE') cellColor = 'bg-purple-950/40 border-purple-500 text-purple-300';

                  const cellPlayers = gameState.players.filter(p => !p.isEliminated && p.position === idx);

                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        if (me?.isEliminated) {
                          setSelectedCellToModify(idx);
                        }
                      }}
                      style={{ gridRow, gridColumn }}
                      className={`border rounded-lg p-1.5 flex flex-col justify-between items-center text-[10px] cursor-pointer transition select-none ${cellColor}`}
                    >
                      <div className="font-mono text-[9px] text-slate-500">#{idx}</div>
                      <div className="font-bold text-center leading-none text-[8.5px] truncate max-w-full">
                        {cell.type}
                      </div>

                      {/* Render pawns inside the cell */}
                      <div className="flex flex-wrap gap-0.5 justify-center w-full mt-1">
                        {cellPlayers.map(p => (
                          <span
                            key={p.id}
                            style={{ backgroundColor: p.color }}
                            className="w-2.5 h-2.5 rounded-full border border-slate-950 block"
                            title={p.username}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}

                {/* Center Control Console */}
                <div 
                  style={{ gridRow: "2 / 6", gridColumn: "2 / 6" }}
                  className="bg-slate-950 rounded-xl border border-slate-800 p-4 flex flex-col justify-center items-center gap-3 text-center"
                >
                  {gameState.status === 'FINISHED' ? (
                    <div>
                      <div className="text-3xl">👑</div>
                      <div className="font-bold text-orange-400 mt-2">Partie Terminée !</div>
                      <div className="text-xs text-slate-400 mt-1">
                        {gameState.winner ? `Vainqueur: ${gameState.winner.username}` : "Aucun survivant !"}
                      </div>
                    </div>
                  ) : (
                    <>
                      {isMyTurn ? (
                        <div className="w-full flex flex-col items-center gap-2">
                          <div className="text-xs font-bold text-orange-400 uppercase tracking-wider animate-pulse">
                            C'est votre tour !
                          </div>

                          {gameState.lastDiceRoll === null ? (
                            <button
                              onClick={handleRollDice}
                              className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-bold py-2 px-6 rounded-lg text-sm transition shadow-lg"
                            >
                              Lancer le dé 🎲
                            </button>
                          ) : (
                            <div className="w-full space-y-3">
                              <div className="text-xs text-slate-300">
                                Résolution de la case : <span className="font-bold">{gameState.board[me!.position].type}</span>
                              </div>

                              {/* Interactive choices based on landing cell */}
                              <div className="flex justify-center gap-2">
                                {gameState.board[me!.position].type === 'GAMBLE' && (
                                  <div className="flex flex-col items-center gap-1.5 bg-slate-900 p-2 rounded border border-slate-800">
                                    <div className="flex gap-1">
                                      <input
                                        type="number"
                                        value={betAmount}
                                        onChange={(e) => setBetAmount(e.target.value)}
                                        className="bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-xs w-16"
                                      />
                                      <button
                                        onClick={() => handlePlayAction('GAMBLE', { betAmount })}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2 py-0.5 rounded text-xs transition"
                                      >
                                        Parier 🎰
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {gameState.board[me!.position].type === 'FIGHT' && (
                                  <button
                                    onClick={() => handlePlayAction('FIGHT')}
                                    className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold px-4 py-1 rounded text-xs transition"
                                  >
                                    Combattre ⚔️
                                  </button>
                                )}

                                {gameState.board[me!.position].type === 'PATCH' && (
                                  <button
                                    onClick={() => handlePlayAction('PATCH')}
                                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-4 py-1 rounded text-xs transition"
                                  >
                                    Modifier les règles 🛠️
                                  </button>
                                )}
                              </div>

                              <button
                                onClick={handlePassTurn}
                                className="w-full bg-slate-800 hover:bg-slate-750 text-white font-bold py-1 px-4 rounded text-xs border border-slate-700 transition"
                              >
                                Terminer le tour ➡️
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-xs text-slate-500">
                          {me?.isEliminated ? (
                            <div className="text-orange-400">
                              <div>💀 Vous êtes éliminé !</div>
                              <div className="text-[10px] mt-1 text-slate-400">Cliquez sur une case du plateau pour placer un piège.</div>
                            </div>
                          ) : (
                            <div>Attente du tour de {gameState.players[gameState.currentPlayerIndex]?.username}...</div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Spectator modale / prompt for trap placement */}
          {me?.isEliminated && selectedCellToModify !== null && (
            <div className="bg-slate-900 border border-slate-850 p-4 rounded-xl shadow-lg flex flex-col gap-2">
              <div className="text-xs font-bold text-orange-400">
                🎭 Placer un piège sur la case #{selectedCellToModify} :
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {(['LAVA', 'DEBT', 'GAMBLE', 'BUFF', 'CURSE', 'NORMAL'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => handleModifyCell(selectedCellToModify, type)}
                    className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-3 py-1 rounded text-xs transition font-bold"
                  >
                    {type}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setSelectedCellToModify(null)}
                className="text-[10px] text-slate-500 hover:underline text-center"
              >
                Annuler
              </button>
            </div>
          )}
        </div>

        {/* Right Side: Game Logs */}
        <div className="lg:col-span-1">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg h-full flex flex-col">
            <h3 className="font-bold text-xs text-slate-400 mb-3 uppercase tracking-wider">Logs du Chaos</h3>
            <div className="flex-1 overflow-y-auto max-h-[400px] lg:max-h-[450px] font-mono text-[10px] text-slate-300 space-y-1.5 pr-2">
              {gameState.log.map((line, idx) => (
                <div key={idx} className="border-b border-slate-850/50 pb-1">
                  {line}
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
