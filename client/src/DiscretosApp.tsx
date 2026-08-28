import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';

const SERVER_URL = import.meta.env.VITE_WS_SERVER_URL || 'http://localhost:3001';

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

  // Chat input state
  const [clueInput, setClueInput] = useState('');

  const chatEndRef = useRef<HTMLDivElement>(null);
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
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [gameState?.clues]);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [gameState?.log]);

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
                <li>**Chat en Tour par Tour** : Chacun son tour, envoyez un message dans le chat pour donner un indice pas trop évident.</li>
                <li>Après **3 tours d'indices complets**, la phase de vote s'ouvre.</li>
                <li>Découvrez qui est l'imposteur en votant tous ensemble !</li>
              </ul>
            </div>
          </div>
        </div>
      ) : (
        /* Game Playing State */
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 p-6 overflow-hidden">
          
          {/* Left panel: Player List & Identity Card */}
          <div className="lg:col-span-1 flex flex-col gap-4 overflow-y-auto max-h-[calc(100vh-130px)] pr-1">
            {/* Player list block */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-xs text-slate-400 uppercase tracking-wider">Membres</h3>
                {gameState.status === 'PLAYING' && (
                  <span className="bg-slate-950 text-cyan-400 font-bold px-2 py-0.5 rounded border border-slate-800 text-[10px]">
                    Tour {gameState.currentRound}/3
                  </span>
                )}
                {gameState.status === 'VOTING' && (
                  <span className="bg-red-950 text-red-400 font-bold px-2 py-0.5 rounded border border-red-900/40 text-[10px] animate-pulse">
                    VOTE 🗳️
                  </span>
                )}
              </div>
              
              <div className="space-y-2">
                {gameState.players.map((p) => {
                  const hasVoted = p.hasVotedToAccuse !== null;
                  const votesAgainst = gameState.players.filter(pl => pl.hasVotedToAccuse === p.id).length;

                  return (
                    <div
                      key={p.id}
                      className="p-2.5 rounded-lg border bg-slate-850 border-slate-750 flex flex-col gap-1.5 transition text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                          <span className="font-semibold">
                            {p.username} {p.id === socket?.id && '(Vous)'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          {gameState.status === 'VOTING' && (
                            <span className={`text-[8px] px-1 rounded font-bold ${hasVoted ? 'bg-green-950 text-green-400' : 'bg-slate-800 text-slate-550'}`}>
                              {hasVoted ? 'A VOTÉ' : 'ATTENTE'}
                            </span>
                          )}
                          {gameState.status === 'VOTING' && votesAgainst > 0 && (
                            <span className="text-[8px] bg-red-950/60 text-red-400 px-1 rounded font-bold border border-red-900/30">
                              🗳️ {votesAgainst}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Vote/Accuse button during voting round */}
                      {gameState.status === 'VOTING' && p.id !== socket?.id && !me?.hasVotedToAccuse && (
                        <button
                          onClick={() => handleVote(p.id)}
                          className="w-full text-center font-bold text-[9px] py-1 bg-red-900 hover:bg-red-800 text-white rounded transition border border-red-700 cursor-pointer"
                        >
                          Voter contre {p.username} 🗳️
                        </button>
                      )}

                      {/* Show who voted for whom at FINISHED state */}
                      {gameState.status === 'FINISHED' && p.hasVotedToAccuse && (
                        <div className="text-[9px] text-slate-400 font-mono">
                          👉 A voté contre : <span className="text-white font-bold">{gameState.players.find(pl => pl.id === p.hasVotedToAccuse)?.username}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Identity Card Details */}
            {me && (
              <div className={`border-2 rounded-xl flex flex-col justify-between p-4 text-center shadow-lg h-64 relative bg-slate-900 ${
                me.isSpy 
                  ? 'border-red-500 bg-red-950/5 text-red-300' 
                  : 'border-cyan-500 bg-cyan-950/5 text-cyan-300'
              }`}>
                <div className="text-2xl">{me.isSpy ? '🥸' : '🗺️'}</div>
                
                <div>
                  <h3 className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Votre Rôle :</h3>
                  <h2 className="text-lg font-extrabold text-white mt-0.5 leading-snug">{me.role}</h2>
                </div>

                {!me.isSpy ? (
                  <div>
                    <h3 className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Lieu Secret :</h3>
                    <h2 className="text-sm font-bold text-cyan-400 mt-0.5 leading-snug">{gameState.location}</h2>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-[9px] text-red-400 font-bold uppercase tracking-wider">🥸 Infiltration</h3>
                    <p className="text-[9px] text-slate-500 mt-0.5 leading-relaxed italic">
                      Écoutez les indices pour deviner le lieu !
                    </p>
                  </div>
                )}

                <div className="text-[8px] text-slate-500 uppercase tracking-widest font-mono">
                  DISCRETOS CARD
                </div>
              </div>
            )}
          </div>

          {/* Center Column: Big Chat Room */}
          <div className="lg:col-span-2 flex flex-col justify-between bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden min-h-[480px]">
            
            {/* Chat Header */}
            <div className="bg-slate-850 border-b border-slate-800 p-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse" />
                <span className="font-bold text-sm text-slate-200">Discussion des indices</span>
              </div>
              {activeCluePlayer && (
                <div className="text-xs text-slate-400">
                  C'est au tour de : <span className="text-cyan-400 font-bold">{activeCluePlayer.username}</span>
                </div>
              )}
            </div>

            {/* Chat Body (Messages List) */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 flex flex-col justify-end min-h-0">
              <div className="space-y-3 overflow-y-auto max-h-[360px] pr-1">
                {gameState.clues.length === 0 ? (
                  <div className="text-xs text-slate-500 italic text-center my-8">
                    La partie commence. Aucun indice n'a été partagé pour le moment.
                  </div>
                ) : (
                  gameState.clues.map((c, idx) => {
                    const player = gameState.players.find(p => p.id === c.playerId);
                    const isSelf = c.playerId === socket?.id;

                    return (
                      <div
                        key={idx}
                        className={`flex flex-col max-w-[80%] ${
                          isSelf ? 'ml-auto items-end' : 'mr-auto items-start'
                        }`}
                      >
                        <div className="flex items-center gap-1 text-[9px] text-slate-500 mb-0.5 font-mono">
                          <span className="font-bold" style={{ color: player?.color || '#94A3B8' }}>{c.username}</span>
                          <span>• Tour {c.round}</span>
                        </div>
                        <div
                          className={`rounded-2xl px-4 py-2.5 text-xs ${
                            isSelf
                              ? 'bg-cyan-600 text-white rounded-tr-none'
                              : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-750'
                          }`}
                        >
                          {c.clueText}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>
            </div>

            {/* Chat Input panel */}
            <div className="bg-slate-850 border-t border-slate-800 p-4">
              {gameState.status === 'PLAYING' && (
                isMyTurnToClue ? (
                  <form onSubmit={handleSendClue} className="flex gap-2">
                    <input
                      type="text"
                      value={clueInput}
                      onChange={(e) => setClueInput(e.target.value)}
                      placeholder="Écrivez votre message / indice sur le lieu..."
                      className="flex-1 bg-slate-950 border border-slate-750 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
                      maxLength={120}
                      required
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition cursor-pointer flex items-center gap-1 shadow-md hover:shadow-cyan-950/20"
                    >
                      Envoyer 🚀
                    </button>
                  </form>
                ) : (
                  <div className="flex items-center justify-center py-2.5 bg-slate-950/50 rounded-xl border border-slate-800 text-xs text-slate-500 italic">
                    ⏳ Attente de l'indice de {activeCluePlayer?.username}...
                  </div>
                )
              )}

              {gameState.status === 'VOTING' && (
                <div className="py-2 px-3 bg-red-950/20 border border-red-900/40 rounded-xl text-center text-xs text-red-400 font-medium animate-pulse">
                  🗳️ PHASE DE VOTE ACTIVE : Accusez l'intrus en cliquant sur "Voter" dans la liste à gauche !
                </div>
              )}

              {gameState.status === 'FINISHED' && gameState.winner && (
                <div className="py-3 px-4 bg-slate-950/60 border border-cyan-950 rounded-xl text-center">
                  <div className="text-sm font-bold text-cyan-400">
                    🏆 {gameState.winner === 'CITIZENS' ? 'Victoire des Citoyens !' : "L'Intrus gagne la partie !"}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                    {gameState.winReason}
                  </p>
                </div>
              )}
            </div>

          </div>

          {/* Right Column: Reference list of locations & Journal */}
          <div className="lg:col-span-1 space-y-4">
            {/* List of locations for reference */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col">
              <h3 className="font-bold text-xs text-slate-400 mb-2.5 uppercase tracking-wider">Lieux (Réf.)</h3>
              <div className="space-y-1.5 overflow-y-auto max-h-[200px] font-mono text-[9.5px] text-slate-400 pr-1">
                {gameState.locationsList.map((loc) => (
                  <div key={loc} className="flex items-center gap-1 py-0.5 border-b border-slate-850/50 last:border-none">
                    <span>📍</span>
                    <span className="truncate">{loc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Room log history */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col max-h-[220px]">
              <h3 className="font-bold text-xs text-slate-400 mb-2 uppercase tracking-wider">Journal du salon</h3>
              <div className="overflow-y-auto font-mono text-[9px] text-slate-450 space-y-1 pr-1">
                {gameState.log.map((line, idx) => (
                  <div key={idx} className="border-b border-slate-850/50 pb-0.5 last:border-none">
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
