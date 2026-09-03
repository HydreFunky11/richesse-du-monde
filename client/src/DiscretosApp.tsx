import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import { soundFx } from './utils/audio';

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
  location: string | null;        // The citizen character name
  spyCharacter: string | null;    // The impostor's character (only shown to spy)
  themeName: string | null;       // The theme name, shown to everyone
  locationsList: string[];        // List of theme names for reference
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
  const [muted, setMuted] = useState(soundFx.isMuted());

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

      if (state.status === 'FINISHED') {
        soundFx.victory();
      }
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
    soundFx.click();
    socket.emit('joinGame', { username, roomCode, gameType: 'discretos' });
  };

  const handleStartGame = () => {
    if (socket) {
      soundFx.playCard();
      socket.emit('discretos:startGame');
    }
  };

  const handleSendClue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clueInput.trim() || !socket) return;
    soundFx.playCard();
    socket.emit('discretos:submitClue', { clueText: clueInput });
    setClueInput('');
  };

  const handleVote = (targetId: string) => {
    if (socket) {
      soundFx.click();
      socket.emit('discretos:accusePlayer', { targetId });
    }
  };

  const handleResetGame = () => {
    if (socket) {
      soundFx.click();
      socket.emit('discretos:resetGame');
    }
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-typewriter select-none">
      {/* Header */}
      <header className="bg-slate-900 border-b border-cyan-900/40 p-4 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              soundFx.click();
              navigate('/');
            }}
            className="text-xs bg-slate-850 hover:bg-slate-800 px-3 py-1.5 rounded-xl text-slate-300 border border-slate-700 flex items-center gap-1 cursor-pointer font-bold"
          >
            ← Accueil
          </button>
          <span className="font-typewriter font-black text-xl tracking-wider bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Discretos 🥸
          </span>
          <span className="text-cyan-400 text-xs font-mono font-bold bg-slate-950 px-2.5 py-1 rounded-lg border border-cyan-500/30">
            Dossier : {roomCode.toUpperCase()}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Sound toggle button */}
          <button
            onClick={() => {
              const isNowMuted = soundFx.toggleMute();
              setMuted(isNowMuted);
              if (!isNowMuted) soundFx.click();
            }}
            className="bg-slate-850 hover:bg-slate-800 border border-cyan-500/30 px-3 py-1.5 rounded-xl text-xs text-cyan-200 cursor-pointer transition flex items-center gap-1.5"
            title="Activer / Désactiver les effets sonores"
          >
            <span>{muted ? '🔇' : '🔊'}</span>
            <span className="font-mono text-[10px] hidden sm:inline">{muted ? 'Muet' : 'Audio ON'}</span>
          </button>

          {gameState.status === 'LOBBY' && isHost && (
            <button
              onClick={handleStartGame}
              disabled={gameState.players.length < 3}
              className="btn-3d-purple disabled:opacity-40 disabled:cursor-not-allowed font-bold text-xs px-4 py-2 rounded-xl transition cursor-pointer"
            >
              Lancer l'Enquête 🚀
            </button>
          )}
          {gameState.status === 'FINISHED' && isHost && (
            <button
              onClick={handleResetGame}
              className="btn-3d-amber font-bold text-xs px-4 py-2 rounded-xl transition cursor-pointer"
            >
              Nouveau Dossier 🔄
            </button>
          )}
        </div>
      </header>

      {gameState.status === 'LOBBY' ? (
        /* Lobby State */
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-[#1c150e] border-2 border-amber-800/70 p-8 rounded-3xl max-w-md w-full shadow-2xl relative">
            <div className="absolute -top-3 right-6 border-2 border-red-600 text-red-500 font-black text-[10px] px-3 py-0.5 uppercase tracking-widest rotate-[-8deg] shadow-lg bg-red-950/40">
              SECRET-DÉFENSE
            </div>
            <div className="text-5xl mb-4 animate-bounce">🥸</div>
            <h2 className="text-xl font-black mb-1 text-amber-200 uppercase tracking-wider">Dossier d'Enquête</h2>
            <p className="text-xs text-amber-400/60 mb-6 italic font-serif">Enregistrement des agents secrets pour la mission</p>
            
            <div className="space-y-2 mb-6">
              {gameState.players.map((p, idx) => (
                <div key={p.id} className="bg-[#261c14] p-3 rounded-xl border border-amber-700/40 flex items-center gap-2 text-xs justify-between shadow">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full border border-amber-500/50" style={{ backgroundColor: p.color }} />
                    <span className="font-bold text-amber-100">{p.username}</span>
                  </div>
                  {idx === 0 && <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded font-bold uppercase tracking-wider">Chef de Mission</span>}
                </div>
              ))}
            </div>
            <p className="text-amber-300/60 text-xs leading-relaxed mb-6 font-serif italic">
              Au moins 3 agents sont requis pour ouvrir l'interrogatoire.
            </p>

            {/* Section Règles */}
            <div className="pt-6 border-t border-amber-900/50 text-left w-full">
              <h3 className="text-xs font-black text-amber-400 uppercase tracking-widest mb-3">📋 Protocole de la Mission :</h3>
              <ul className="text-xs text-amber-200/80 space-y-2 list-disc list-inside leading-relaxed font-serif">
                <li>Un <strong>thème secret</strong> est tiré (ex: <em>🧙 Sorciers</em>). Tous les citoyens reçoivent le <strong>même personnage</strong> (ex: Gandalf).</li>
                <li><strong>1 agent</strong> est l'<strong>Imposteur 🥸</strong> : il reçoit un <strong>personnage similaire du même thème</strong> (ex: Dumbledore) sans savoir qu'il l'est !</li>
                <li><strong>Tour par Tour</strong> : chaque agent tape un télégramme avec un <em>indice subtil</em> sans jamais nommer son personnage.</li>
                <li>Après <strong>3 tours</strong>, ouverture du vote d'accusation pour neutraliser l'imposteur.</li>
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
            <div className="bg-[#1c150e] border-2 border-amber-800/60 rounded-2xl p-4 shadow-2xl flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-xs text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                  <span>🕵️</span>
                  <span>Agents Suspects</span>
                </h3>
                {gameState.status === 'PLAYING' && (
                  <span className="bg-[#0e0a07] text-amber-300 font-bold px-2 py-0.5 rounded border border-amber-800/60 text-[10px] font-mono">
                    Tour {gameState.currentRound}/3
                  </span>
                )}
                {gameState.status === 'VOTING' && (
                  <span className="bg-red-950 text-red-400 font-bold px-2 py-0.5 rounded border border-red-700 text-[10px] animate-pulse">
                    VOTE 🗳️
                  </span>
                )}
              </div>
              
              <div className="space-y-2">
                {gameState.players.map((p) => {
                  const hasVoted = p.hasVotedToAccuse !== null;
                  const votesAgainst = gameState.players.filter(pl => pl.hasVotedToAccuse === p.id).length;
                  const isMe = p.id === socket?.id;

                  return (
                    <div
                      key={p.id}
                      className={`p-3 rounded-xl border-2 bg-[#251b13] flex flex-col gap-1.5 transition text-xs shadow ${
                        gameState.status === 'FINISHED' && p.isSpy ? 'border-red-500' : 'border-amber-900/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full border border-amber-400/50" style={{ backgroundColor: p.color }} />
                          <span className="font-bold text-amber-100">
                            {p.username} {isMe && '(Vous)'}
                          </span>
                          {gameState.status === 'FINISHED' && p.isSpy && (
                            <span className="text-[8px] bg-red-950 text-red-300 px-1.5 py-0.5 rounded font-black border border-red-600">🥸 IMPOSTEUR</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {gameState.status === 'VOTING' && (
                            <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold ${hasVoted ? 'bg-green-950 text-green-300 border border-green-700' : 'bg-[#15100b] text-amber-500/60 border border-amber-900'}`}>
                              {hasVoted ? 'A VOTÉ' : 'EN ATTENTE'}
                            </span>
                          )}
                          {gameState.status === 'VOTING' && votesAgainst > 0 && (
                            <span className="text-[8px] bg-red-950 text-red-300 px-1.5 py-0.5 rounded font-bold border border-red-700">
                              🗳️ {votesAgainst}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* In FINISHED, reveal each player's character */}
                      {gameState.status === 'FINISHED' && (
                        <div className={`text-[10px] font-mono px-2 py-1 rounded border ${p.isSpy ? 'bg-red-950/40 border-red-700 text-red-200' : 'bg-[#120d08] border-amber-900 text-amber-300'}`}>
                          🎭 Identité : {p.role}
                        </div>
                      )}

                      {/* Vote/Accuse button during voting round */}
                      {gameState.status === 'VOTING' && !isMe && !me?.hasVotedToAccuse && (
                        <button
                          onClick={() => handleVote(p.id)}
                          className="btn-3d-red w-full text-center font-bold text-[10px] py-1.5 rounded-lg cursor-pointer mt-1"
                        >
                          Accuser {p.username} 🗳️
                        </button>
                      )}

                      {/* Show who voted for whom at FINISHED state */}
                      {gameState.status === 'FINISHED' && p.hasVotedToAccuse && (
                        <div className="text-[9px] text-amber-400/70 font-mono">
                          👉 A accusé : <span className="text-white font-bold">{gameState.players.find(pl => pl.id === p.hasVotedToAccuse)?.username}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Identity Card Details (Badge d'Agent Secret) */}
            {me && (
              <div className="border-2 border-amber-600/70 rounded-2xl flex flex-col gap-3 p-4 text-center shadow-2xl relative bg-gradient-to-b from-[#2c2016] to-[#1a130d]">
                <div className="absolute top-2 right-2 border border-red-600 text-red-500 font-black text-[8px] px-2 py-0.5 uppercase tracking-widest rotate-[-8deg] shadow bg-red-950/20">
                  CLASSIFIÉ
                </div>
                <div className="text-3xl filter drop-shadow">📎</div>

                {/* Theme — visible to everyone */}
                {gameState.themeName && (
                  <div className="bg-[#120d08] p-2 rounded-xl border border-amber-800/40">
                    <h3 className="text-[9px] text-amber-400/80 font-bold uppercase tracking-widest">Thème d'Enquête :</h3>
                    <h2 className="text-xs font-black text-amber-300 mt-0.5">{gameState.themeName}</h2>
                  </div>
                )}

                {/* Character */}
                <div className="bg-gradient-to-r from-amber-950 via-[#1f150e] to-amber-950 p-3 rounded-xl border-2 border-amber-500/50 shadow-inner">
                  <h3 className="text-[9px] text-amber-400/80 font-bold uppercase tracking-widest">Votre Identité Secrète :</h3>
                  <h2 className="text-xl font-black text-white mt-1 tracking-wide leading-snug drop-shadow">{me.role}</h2>
                </div>

                <p className="text-[10px] text-amber-200/70 leading-relaxed italic font-serif">
                  Distillez des indices sans révéler votre nom. Si vos camarades ont un personnage différent du même thème, vous êtes l'imposteur !
                </p>

                <div className="text-[8px] text-amber-500/50 uppercase tracking-widest font-mono border-t border-amber-900/40 pt-2">
                  DOSSIER D'AGENT ACTIF • N° 81-F058
                </div>
              </div>
            )}
          </div>

          {/* Center Column: Big Chat Room (Télétype d'interrogatoire) */}
          <div className="lg:col-span-2 flex flex-col justify-between bg-[#150f09] border-2 border-amber-800/60 rounded-3xl shadow-2xl overflow-hidden min-h-[480px]">
            
            {/* Chat Header */}
            <div className="bg-[#241a11] border-b-2 border-amber-800/60 p-4 flex justify-between items-center shadow">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                <span className="font-bold text-sm text-amber-200 uppercase tracking-wider">Télétype des Indices</span>
              </div>
              {activeCluePlayer && (
                <div className="text-xs text-amber-300/80 font-mono">
                  Tour de parole : <span className="text-amber-400 font-bold">{activeCluePlayer.username}</span>
                </div>
              )}
            </div>

            {/* Chat Body (Messages List) */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 flex flex-col justify-end min-h-0">
              <div className="space-y-3 overflow-y-auto max-h-[360px] pr-1">
                {gameState.clues.length === 0 ? (
                  <div className="text-xs text-amber-400/60 italic text-center my-8 font-serif">
                    📜 L'interrogatoire commence. En attente du premier indice tapé au télex...
                  </div>
                ) : (
                  gameState.clues.map((c, idx) => {
                    const player = gameState.players.find(p => p.id === c.playerId);
                    const isSelf = c.playerId === socket?.id;

                    return (
                      <div
                        key={idx}
                        className={`flex flex-col max-w-[85%] ${
                          isSelf ? 'ml-auto items-end' : 'mr-auto items-start'
                        }`}
                      >
                        <div className="flex items-center gap-1 text-[9px] text-amber-400/70 mb-0.5 font-mono">
                          <span className="font-bold" style={{ color: player?.color || '#FBBF24' }}>{c.username}</span>
                          <span>• Dépêche Tour {c.round}</span>
                        </div>
                        <div
                          className={`rounded-2xl px-4 py-3 text-xs shadow-md border leading-relaxed ${
                            isSelf
                              ? 'bg-gradient-to-r from-amber-900 to-[#3d2a19] text-amber-100 border-amber-600/60 rounded-tr-none'
                              : 'bg-[#261b12] text-amber-100 rounded-tl-none border-amber-800/60'
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
            <div className="bg-[#20160e] border-t-2 border-amber-800/60 p-4">
              {gameState.status === 'PLAYING' && (
                isMyTurnToClue ? (
                  <form onSubmit={handleSendClue} className="flex gap-2">
                    <input
                      type="text"
                      value={clueInput}
                      onChange={(e) => setClueInput(e.target.value)}
                      placeholder="Tapez votre indice confidentiel au télex sans nommer votre personnage..."
                      className="flex-1 bg-[#0c0805] border-2 border-amber-800/70 rounded-xl px-4 py-3 text-xs text-amber-100 placeholder-amber-500/40 focus:outline-none focus:ring-2 focus:ring-amber-500 font-typewriter"
                      maxLength={120}
                      required
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="btn-3d-amber text-slate-950 font-black px-6 py-3 rounded-xl text-xs cursor-pointer shadow-lg tracking-wider"
                    >
                      Transmettre 📡
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

          {/* Right Column: Reference list of themes & Journal */}
          <div className="lg:col-span-1 space-y-4">
            {/* List of themes for reference */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col">
              <h3 className="font-bold text-xs text-slate-400 mb-2.5 uppercase tracking-wider">Thèmes (Réf.)</h3>
              <div className="space-y-1.5 overflow-y-auto max-h-[200px] font-mono text-[9.5px] text-slate-400 pr-1">
                {gameState.locationsList.map((theme) => (
                  <div key={theme} className="flex items-center gap-1 py-0.5 border-b border-slate-850/50 last:border-none">
                    <span className="truncate">{theme}</span>
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
