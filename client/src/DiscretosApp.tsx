import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';

const SERVER_URL = import.meta.env.VITE_WS_SERVER_URL || import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

interface DiscretosPlayer {
  id: string;
  username: string;
  color: string;
  role: string;
  isSpy: boolean;
  hasVotedToAccuse: string | null;
}

interface DiscretosClue {
  playerId: string;
  username: string;
  clueText: string;
  round: number;
}

interface DiscretosGameState {
  status: 'LOBBY' | 'PLAYING' | 'VOTING' | 'FINISHED';
  players: DiscretosPlayer[];
  currentPlayerIndex: number;
  currentRound: number;
  location: string | null;
  locationsList: string[];
  clues: DiscretosClue[];
  log: string[];
  winner: 'CITIZENS' | 'SPY' | null;
  winReason: string | null;
}

export default function DiscretosApp() {
  const navigate = useNavigate();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameState, setGameState] = useState<DiscretosGameState | null>(null);
  const [username, setUsername] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState('');

  // Clue input state
  const [clueInput, setClueInput] = useState('');

  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const s = io(SERVER_URL);
    setSocket(s);

    s.on('discretosStateUpdate', (state: DiscretosGameState) => {
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
  }, [gameState?.log, gameState?.clues]);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !roomCode.trim() || !socket) return;
    socket.emit('joinGame', { username, roomCode, gameType: 'discretos' });
  };

  const handleStartGame = () => {
    if (socket) socket.emit('discretos:startGame');
  };

  const handleSendClue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clueInput.trim() || !socket) return;
    socket.emit('discretos:submitClue', { clueText: clueInput });
    setClueInput('');
  };

  const handleVote = (targetId: string) => {
    if (socket) socket.emit('discretos:accusePlayer', { targetId });
  };

  const handleResetGame = () => {
    if (socket) socket.emit('discretos:resetGame');
  };

  const me = gameState?.players.find((p) => p.id === socket?.id);
  const isHost = gameState && gameState.players[0]?.id === socket?.id;
  const isMyTurnToClue = gameState && gameState.status === 'PLAYING' && gameState.players[gameState.currentPlayerIndex]?.id === socket?.id;
  const activeCluePlayer = gameState && gameState.status === 'PLAYING' ? gameState.players[gameState.currentPlayerIndex] : null;

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
            <span className="bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-[10px] uppercase font-bold px-2 py-0.5 rounded">
              DISCRETOS 🥸
            </span>
          </div>

          <h1 className="text-3xl font-extrabold text-center mb-2 tracking-tight bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Discretos 🥸
          </h1>
          <p className="text-center text-slate-400 text-sm mb-6">
            Menez l'enquête ou infiltrez-vous sans vous faire repérer
          </p>

          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Votre Pseudo</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ex: Hugo"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Code de la Salle</label>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                placeholder="Ex: SPY"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
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
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold py-3 rounded-lg shadow-lg hover:shadow-cyan-950/30 transition transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
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
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-850 p-4 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="text-xs bg-slate-800 hover:bg-slate-750 px-3 py-1.5 rounded text-slate-300 border border-slate-700 flex items-center gap-1 cursor-pointer"
          >
            ← Accueil
          </button>
          <span className="font-bold text-lg bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Discretos 🥸
          </span>
          <span className="text-slate-500 text-xs font-mono font-bold bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800">
            Salon : {roomCode.toUpperCase()}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {gameState.status === 'LOBBY' && isHost && (
            <button
              onClick={handleStartGame}
              disabled={gameState.players.length < 3}
              className="bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs px-4 py-2 rounded shadow transition cursor-pointer"
            >
              Démarrer la partie 🚀
            </button>
          )}
          {gameState.status === 'FINISHED' && isHost && (
            <button
              onClick={handleResetGame}
              className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs px-4 py-2 rounded shadow transition cursor-pointer"
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
            <div className="text-5xl mb-4 animate-bounce">🥸</div>
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
              Il faut un minimum de 3 joueurs pour démarrer la partie.
            </p>

            {/* Section Règles */}
            <div className="pt-6 border-t border-slate-800 text-left w-full">
              <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-3">📜 Règles de Discretos :</h3>
              <ul className="text-xs text-slate-400 space-y-2 list-disc list-inside leading-relaxed">
                <li>Au départ, un lieu secret farfelu ou normal est choisi (ex: *Kebab Spatial*).</li>
                <li>Tout le monde connaît le lieu et reçoit un rôle, **sauf 1 joueur** : **L'Intrus** 🥸.</li>
                <li>**Tour par tour** : Chacun son tour, donnez un indice textuel pas trop évident sur le lieu.</li>
                <li>Après **3 tours d'indices complets**, la phase de vote s'ouvre.</li>
                <li>Découvrez qui est l'imposteur en votant tous ensemble !</li>
              </ul>
            </div>
          </div>
        </div>
      ) : (
        /* Game Playing State */
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 p-6 overflow-hidden">
          
          {/* Left panel: Player List & Votes Status */}
          <div className="lg:col-span-1 space-y-4 overflow-y-auto max-h-[calc(100vh-220px)] pr-1">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-xs text-slate-400 uppercase tracking-wider">Membres</h3>
                {gameState.status === 'PLAYING' && (
                  <span className="bg-slate-950 text-cyan-400 font-bold px-2 py-0.5 rounded border border-slate-800 text-xs">
                    Tour d'indices {gameState.currentRound}/3
                  </span>
                )}
                {gameState.status === 'VOTING' && (
                  <span className="bg-red-950 text-red-400 font-bold px-2 py-0.5 rounded border border-red-900/40 text-xs animate-pulse">
                    PHASE VOTE 🗳️
                  </span>
                )}
              </div>
              
              <div className="space-y-3">
                {gameState.players.map((p) => {
                  const hasVoted = p.hasVotedToAccuse !== null;
                  const votesAgainst = gameState.players.filter(pl => pl.hasVotedToAccuse === p.id).length;

                  return (
                    <div
                      key={p.id}
                      className="p-3 rounded-lg border bg-slate-850 border-slate-750 flex flex-col gap-2 transition"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                          <span className="font-semibold text-sm">
                            {p.username} {p.id === socket?.id && '(Vous)'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          {gameState.status === 'VOTING' && (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${hasVoted ? 'bg-green-950 text-green-400' : 'bg-slate-800 text-slate-550'}`}>
                              {hasVoted ? 'A VOTÉ' : 'ATTENTE'}
                            </span>
                          )}
                          {gameState.status === 'VOTING' && votesAgainst > 0 && (
                            <span className="text-[9px] bg-red-950/60 text-red-400 px-1.5 py-0.5 rounded font-bold border border-red-900/30">
                              🗳️ {votesAgainst}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Vote/Accuse button during voting round */}
                      {gameState.status === 'VOTING' && p.id !== socket?.id && !me?.hasVotedToAccuse && (
                        <button
                          onClick={() => handleVote(p.id)}
                          className="w-full text-center font-bold text-[10px] py-1 bg-red-900 hover:bg-red-800 text-white rounded transition border border-red-700 cursor-pointer"
                        >
                          Voter contre {p.username} 🗳️
                        </button>
                      )}

                      {/* Show who voted for whom at FINISHED state */}
                      {gameState.status === 'FINISHED' && p.hasVotedToAccuse && (
                        <div className="text-[10px] text-slate-400 font-mono">
                          👉 A voté contre : <span className="text-white font-bold">{gameState.players.find(pl => pl.id === p.hasVotedToAccuse)?.username}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Center Column: Role Card & Turn Clue Input */}
          <div className="lg:col-span-2 flex flex-col gap-6 justify-between">
            {/* Identity Card */}
            {me && (
              <div className="bg-slate-900 border border-slate-850 rounded-2xl p-6 shadow-inner flex flex-col items-center justify-center relative min-h-[300px]">
                
                {gameState.status === 'FINISHED' && gameState.winner && (
                  <div className="text-center bg-slate-950/80 border border-cyan-500/30 p-6 rounded-xl shadow-2xl max-w-sm absolute z-30 animate-pulse">
                    <div className="text-4xl mb-3">🏆</div>
                    <h3 className="text-lg font-bold text-cyan-400">
                      {gameState.winner === 'CITIZENS' ? 'Victoire des Citoyens !' : "L'Intrus l'emporte !"}
                    </h3>
                    <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                      {gameState.winReason}
                    </p>
                  </div>
                )}

                {/* Identity Card Details */}
                <div className={`w-64 h-80 border-2 rounded-xl flex flex-col justify-between p-6 text-center shadow-2xl relative ${
                  me.isSpy 
                    ? 'border-red-500 bg-red-950/10 text-red-300' 
                    : 'border-cyan-500 bg-cyan-950/10 text-cyan-300'
                }`}>
                  <div className="text-3xl">{me.isSpy ? '🥸' : '🗺️'}</div>
                  
                  <div>
                    <h3 className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Votre Rôle :</h3>
                    <h2 className="text-2xl font-extrabold text-white mt-1 leading-snug">{me.role}</h2>
                  </div>

                  {!me.isSpy ? (
                    <div>
                      <h3 className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Lieu Secret :</h3>
                      <h2 className="text-lg font-bold text-cyan-400 mt-1 leading-snug">{gameState.location}</h2>
                    </div>
                  ) : (
                    <div>
                      <h3 className="text-[10px] text-red-400 font-bold uppercase tracking-wider">🥸 Vous êtes l'Intrus</h3>
                      <p className="text-[9.5px] text-slate-400 mt-1.5 leading-relaxed">
                        Écoutez bien les indices des autres pour essayer de deviner le lieu et ne pas vous faire griller !
                      </p>
                    </div>
                  )}

                  <div className="text-[9px] text-slate-500 uppercase tracking-widest font-mono">
                    DISCRETOS CARD
                  </div>
                </div>
              </div>
            )}

            {/* Turn Clue Submission Input Panel */}
            {gameState.status === 'PLAYING' && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col gap-3">
                {isMyTurnToClue ? (
                  <form onSubmit={handleSendClue} className="flex flex-col gap-2">
                    <div className="text-xs font-bold text-cyan-400 animate-pulse">
                      ✨ C'est votre tour ! Donnez un indice textuel sur le lieu secret :
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={clueInput}
                        onChange={(e) => setClueInput(e.target.value)}
                        placeholder="Ex: C'est un endroit bruyant..."
                        className="flex-1 bg-slate-950 border border-slate-700 rounded px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        maxLength={100}
                        required
                      />
                      <button
                        type="submit"
                        className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold px-4 py-2 rounded text-xs transition cursor-pointer"
                      >
                        Envoyer 📝
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="text-xs text-slate-400 italic text-center py-2">
                    📢 Attente de l'indice de <span className="font-bold text-white">{activeCluePlayer?.username}</span>...
                  </div>
                )}
              </div>
            )}

            {/* Voting round instructions */}
            {gameState.status === 'VOTING' && (
              <div className="bg-slate-900 border border-red-950 p-4 rounded-xl shadow text-center">
                <div className="text-sm font-bold text-red-400 animate-pulse">🗳️ PHASE DE VOTE ACTIVE</div>
                <div className="text-xs text-slate-400 mt-1">
                  {me?.hasVotedToAccuse 
                    ? "Vous avez voté. En attente du vote des autres joueurs..." 
                    : "Observez les indices donnés et cliquez sur le bouton de vote à gauche pour accuser l'intrus !"}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Game Logs & Locations List */}
          <div className="lg:col-span-1 space-y-4">
            {/* Clues logs (Turn-based indices board) */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col max-h-[300px]">
              <h3 className="font-bold text-xs text-slate-400 mb-2 uppercase tracking-wider">Indices Donnés</h3>
              <div className="overflow-y-auto space-y-2 max-h-[220px] pr-1">
                {gameState.clues.length === 0 ? (
                  <div className="text-xs text-slate-500 italic">Aucun indice pour le moment.</div>
                ) : (
                  gameState.clues.map((c, idx) => (
                    <div key={idx} className="bg-slate-950 p-2 rounded border border-slate-850 text-[10px]">
                      <div className="flex justify-between text-[9px] text-slate-500 mb-0.5">
                        <span className="font-bold">{c.username}</span>
                        <span>Tour {c.round}</span>
                      </div>
                      <p className="text-slate-200 italic">"{c.clueText}"</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* List of possible locations for reference */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
              <h3 className="font-bold text-xs text-slate-400 mb-2 uppercase tracking-wider">Lieux (Réf.)</h3>
              <div className="space-y-1 overflow-y-auto max-h-[140px] font-mono text-[9px] text-slate-400">
                {gameState.locationsList.map((loc) => (
                  <div key={loc} className="flex items-center gap-1">
                    <span>📍</span>
                    <span>{loc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
