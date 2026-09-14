import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';

export type NotePhase =
  | 'LOBBY'
  | 'CHOOSING_QUESTION'
  | 'ANSWERING'
  | 'GUESSING'
  | 'REVEAL'
  | 'FINISHED';

export interface NoteRoundHistory {
  round: number;
  question: string;
  secretRating: number;
  guess: number;
  points: number;
  diff: number;
}

export interface NotePlayer {
  id: string;
  username: string;
  color: string;
  avatar: string;
  isBot: boolean;
  score: number;
  hasAnswered: boolean;
  history: NoteRoundHistory[];
}

export interface NoteAnswer {
  playerId: string;
  username: string;
  color: string;
  avatar: string;
  text: string;
  timestamp: number;
}

export interface NoteGameState {
  roomCode: string;
  phase: NotePhase;
  players: NotePlayer[];
  currentRound: number;
  maxRounds: number;
  activePlayerIndex: number;
  secretRating: number | null;
  currentQuestion: string | null;
  questionOptions: string[];
  usedQuestions: string[];
  answers: NoteAnswer[];
  guess: number | null;
  pointsAwarded: number | null;
  guessDiff: number | null;
  winner: NotePlayer | null;
  log: string[];
}

const RATING_DESCRIPTIONS = [
  { val: 0, label: 'Catastrophique 💀', color: 'text-red-500', bg: 'bg-red-950/60 border-red-500/50' },
  { val: 1, label: 'Horrible 🤮', color: 'text-red-400', bg: 'bg-red-900/60 border-red-400/50' },
  { val: 2, label: 'Très mauvais 💩', color: 'text-orange-500', bg: 'bg-orange-950/60 border-orange-500/50' },
  { val: 3, label: 'Médiocre 😕', color: 'text-amber-500', bg: 'bg-amber-950/60 border-amber-500/50' },
  { val: 4, label: 'Passable 😐', color: 'text-yellow-500', bg: 'bg-yellow-950/60 border-yellow-500/50' },
  { val: 5, label: 'Tout juste moyen ⚖️', color: 'text-slate-300', bg: 'bg-slate-800/80 border-slate-500/50' },
  { val: 6, label: 'Pas mal 🙂', color: 'text-lime-400', bg: 'bg-lime-950/60 border-lime-400/50' },
  { val: 7, label: 'Bon 👍', color: 'text-emerald-400', bg: 'bg-emerald-950/60 border-emerald-400/50' },
  { val: 8, label: 'Très bon 🌟', color: 'text-teal-400', bg: 'bg-teal-950/60 border-teal-400/50' },
  { val: 9, label: 'Incroyable 🔥', color: 'text-cyan-400', bg: 'bg-cyan-950/60 border-cyan-400/50' },
  { val: 10, label: 'Perfection divine 👑', color: 'text-amber-300', bg: 'bg-amber-900/80 border-amber-300 shadow-[0_0_15px_rgba(252,211,77,0.4)]' }
];

export default function NoteApp() {
  const navigate = useNavigate();

  // Connection & Room state
  const [username, setUsername] = useState(() => localStorage.getItem('note_username') || '');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [joined, setJoined] = useState(false);
  const [gameState, setGameState] = useState<NoteGameState | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  // In-Game local interaction state
  const [customQuestionInput, setCustomQuestionInput] = useState('');
  const [answerInput, setAnswerInput] = useState('');
  const [selectedGuess, setSelectedGuess] = useState<number>(5);
  const [showLog, setShowLog] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const logEndRef = useRef<HTMLDivElement | null>(null);

  // Connect socket
  useEffect(() => {
    const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
    const s = io(serverUrl);
    socketRef.current = s;

    s.on('connect', () => {
      console.log('Connecté au serveur de jeu Note !', s.id);
    });

    s.on('noteStateUpdate', (st: NoteGameState) => {
      setGameState(st);
      setJoined(true);
    });

    s.on('error', (err: string) => {
      setErrorMsg(err);
      setTimeout(() => setErrorMsg(''), 4000);
    });

    return () => {
      s.disconnect();
    };
  }, []);

  // Auto scroll logs
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [gameState?.log]);

  const handleCreateRoom = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanUser = username.trim();
    if (!cleanUser) {
      setErrorMsg('Veuillez entrer votre pseudo avant de créer un salon');
      return;
    }
    const randomCode = 'NOTE' + Math.floor(100 + Math.random() * 900);
    localStorage.setItem('note_username', cleanUser);
    setRoomCodeInput(randomCode);
    socketRef.current?.emit('joinGame', {
      username: cleanUser,
      roomCode: randomCode,
      gameType: 'note'
    });
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = username.trim();
    const cleanRoom = roomCodeInput.trim().toUpperCase();

    if (!cleanUser) {
      setErrorMsg('Veuillez entrer un pseudo');
      return;
    }

    if (!cleanRoom) {
      // If no room code provided, auto-create a new room
      handleCreateRoom();
      return;
    }

    localStorage.setItem('note_username', cleanUser);
    socketRef.current?.emit('joinGame', {
      username: cleanUser,
      roomCode: cleanRoom,
      gameType: 'note'
    });
  };

  const handleCopyCode = () => {
    if (!gameState?.roomCode) return;
    navigator.clipboard.writeText(gameState.roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const isMyTurn = () => {
    if (!gameState || !socketRef.current) return false;
    const activePlayer = gameState.players[gameState.activePlayerIndex];
    return activePlayer?.id === socketRef.current.id;
  };

  const getMyPlayer = (): NotePlayer | undefined => {
    if (!gameState || !socketRef.current) return undefined;
    return gameState.players.find(p => p.id === socketRef.current?.id);
  };

  const activePlayer = gameState?.players[gameState.activePlayerIndex];
  const myPlayer = getMyPlayer();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col select-none">
      {/* HEADER BAR */}
      <header className="px-4 py-3 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 flex items-center justify-between z-30 sticky top-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
          >
            ← Accueil
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xl">🔟</span>
            <span className="font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 hidden sm:inline">
              LE JEU DE LA NOTE
            </span>
          </div>
        </div>

        {joined && gameState && (
          <div className="flex items-center gap-2 sm:gap-4">
            {myPlayer && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-slate-800/80 border border-slate-700 rounded-xl text-xs">
                <span>{myPlayer.avatar}</span>
                <span className="font-bold" style={{ color: myPlayer.color }}>{myPlayer.username}</span>
                <span className="font-mono text-amber-300 font-black">{myPlayer.score} pts</span>
              </div>
            )}

            {/* Round indicator */}
            <div className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs font-black font-mono">
              MANCHE {gameState.currentRound} / {gameState.maxRounds}
            </div>

            {/* Room code badge */}
            <button
              onClick={handleCopyCode}
              title="Copier le code du salon"
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-mono text-slate-300 flex items-center gap-1.5 transition cursor-pointer"
            >
              <span>Salon :</span>
              <strong className="text-amber-400 font-black">{gameState.roomCode}</strong>
              <span className="text-xs">{copiedCode ? '✅' : '📋'}</span>
            </button>

            {/* Log toggle button */}
            <button
              onClick={() => setShowLog(!showLog)}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 text-xs cursor-pointer"
              title="Historique de la partie"
            >
              📜
            </button>
          </div>
        )}
      </header>

      {/* ERROR BANNER */}
      {errorMsg && (
        <div className="bg-red-500/90 text-white text-center py-2 text-sm font-bold shadow-lg animate-bounce z-40">
          ⚠️ {errorMsg}
        </div>
      )}

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 flex flex-col justify-center">
        {!joined || !gameState ? (
          /* ─── JOIN / LOBBY FORM ─────────────────────────────────────────── */
          <div className="max-w-md w-full mx-auto bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-amber-950/30 text-center">
            <div className="text-6xl mb-3">🔟</div>
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 mb-1">
              LE JEU DE LA NOTE
            </h1>
            <p className="text-xs text-amber-300/80 font-bold uppercase tracking-widest mb-6">
              Devinez votre note secrète de 0 à 10 en 5 manches
            </p>

            <div className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Votre Pseudo
                </label>
                <input
                  type="text"
                  maxLength={16}
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Ex: Julien"
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold focus:border-amber-400 focus:outline-none transition"
                />
              </div>

              {/* Action 1: Create room directly */}
              <button
                type="button"
                onClick={handleCreateRoom}
                className="w-full py-3.5 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black rounded-xl text-sm uppercase tracking-wider transition shadow-xl shadow-amber-500/20 cursor-pointer transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <span>✨</span>
                <span>Créer un Nouveau Salon</span>
              </button>

              <div className="flex items-center gap-3 py-1">
                <div className="flex-1 border-t border-slate-800"></div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">OU REJOINDRE</span>
                <div className="flex-1 border-t border-slate-800"></div>
              </div>

              {/* Action 2: Join existing room */}
              <form onSubmit={handleJoin} className="space-y-2">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Code du Salon d'un ami
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    value={roomCodeInput}
                    onChange={e => setRoomCodeInput(e.target.value.toUpperCase())}
                    placeholder="Ex: NOTE492"
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono uppercase focus:border-amber-400 focus:outline-none transition text-sm"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 hover:border-amber-400 text-white font-bold rounded-xl text-sm transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>🚀</span>
                  <span>Rejoindre le Salon</span>
                </button>
              </form>
            </div>

            <div className="mt-6 pt-5 border-t border-slate-800/80 text-xs text-slate-400 space-y-1 text-left">
              <p className="font-bold text-slate-300">📖 Règle express :</p>
              <p>• Recevez une note secrète de 0 à 10 que seuls les autres voient.</p>
              <p>• Posez-leur une question unique (ex: "Quel plat me cuisines-tu ?").</p>
              <p>• Les autres répondent selon votre note. Devinez votre note !</p>
              <p>• Écart de 0 = 3 pts • Écart de 1 = 2 pts • Écart de 2 = 1 pt • Plus de 2 = 0 pt.</p>
            </div>
          </div>
        ) : gameState.phase === 'LOBBY' ? (
          /* ─── LOBBY PHASE ─────────────────────────────────────────────────── */
          <div className="max-w-xl w-full mx-auto bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
            <div className="text-center space-y-1">
              <div className="text-4xl">🎲</div>
              <h2 className="text-2xl font-black text-amber-400">Salon d'attente</h2>
              <p className="text-xs text-slate-400">
                Partagez le code du salon <strong className="text-amber-300 font-mono font-black">{gameState.roomCode}</strong> à vos amis !
              </p>
            </div>

            {/* Players list */}
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                <span>Joueurs ({gameState.players.length} / 8)</span>
                <span className="text-[11px] text-amber-400/80">Partie en 5 manches</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {gameState.players.map((p, idx) => (
                  <div
                    key={p.id}
                    className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg border font-bold"
                        style={{ borderColor: p.color, backgroundColor: `${p.color}20` }}
                      >
                        {p.avatar}
                      </div>
                      <div>
                        <div className="font-black text-sm flex items-center gap-1.5">
                          <span style={{ color: p.color }}>{p.username}</span>
                          {idx === 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-md font-bold">
                              HÔTE
                            </span>
                          )}
                          {p.isBot && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 rounded-md font-bold">
                              BOT
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-500">Prêt pour la partie</span>
                      </div>
                    </div>

                    {p.isBot && (
                      <button
                        onClick={() => socketRef.current?.emit('note:removeBot', { botId: p.id })}
                        className="text-slate-500 hover:text-red-400 p-1.5 text-xs transition cursor-pointer"
                        title="Retirer ce bot"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3 pt-2">
              <button
                onClick={() => socketRef.current?.emit('note:addBot')}
                disabled={gameState.players.length >= 8}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-2xl text-xs uppercase tracking-wider border border-slate-700 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span>🤖</span>
                <span>Ajouter un Bot IA (+1)</span>
              </button>

              <button
                onClick={() => socketRef.current?.emit('note:startGame')}
                className="w-full py-4 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black rounded-2xl text-base uppercase tracking-wider transition shadow-xl shadow-amber-500/20 cursor-pointer transform hover:scale-[1.02] active:scale-[0.98]"
              >
                Lancer la Partie (5 Manches) 🚀
              </button>
            </div>
          </div>
        ) : gameState.phase === 'FINISHED' ? (
          /* ─── GAME OVER / PODIUM ─────────────────────────────────────────── */
          <div className="max-w-xl w-full mx-auto bg-slate-900/90 border-2 border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-6 animate-fade-in">
            <div className="text-6xl animate-bounce">🏆</div>
            <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500">
              FIN DE LA PARTIE !
            </h2>
            <p className="text-xs text-amber-300/80 font-bold uppercase tracking-widest">
              5 Manches terminées avec succès
            </p>

            {/* Podium leaderboard */}
            <div className="space-y-2 text-left">
              {[...gameState.players]
                .sort((a, b) => b.score - a.score)
                .map((p, rank) => (
                  <div
                    key={p.id}
                    className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                      rank === 0
                        ? 'bg-amber-950/40 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                        : 'bg-slate-950/70 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-black text-lg w-6 text-center">
                        {rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : `#${rank + 1}`}
                      </span>
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg border font-bold"
                        style={{ borderColor: p.color, backgroundColor: `${p.color}20` }}
                      >
                        {p.avatar}
                      </div>
                      <div>
                        <div className="font-black text-sm flex items-center gap-1.5">
                          <span style={{ color: p.color }}>{p.username}</span>
                          {p.isBot && <span className="text-[10px] text-cyan-400 font-bold">BOT</span>}
                        </div>
                        <span className="text-xs text-slate-400">
                          {p.history.filter(h => h.diff === 0).length} note(s) exacte(s)
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-2xl font-black font-mono text-amber-400">{p.score}</span>
                      <span className="text-xs text-slate-500 ml-1">pts</span>
                    </div>
                  </div>
                ))}
            </div>

            <button
              onClick={() => socketRef.current?.emit('note:resetGame')}
              className="w-full py-4 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black rounded-2xl text-base uppercase tracking-wider transition shadow-xl shadow-amber-500/20 cursor-pointer transform hover:scale-[1.02] active:scale-[0.98]"
            >
              Rejouer une Partie 🔄
            </button>
          </div>
        ) : (
          /* ─── ACTIVE GAME PHASES (CHOOSING, ANSWERING, GUESSING, REVEAL) ── */
          <div className="space-y-4">
            {/* TOP PLAYER STATUS BAR */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between overflow-x-auto gap-3">
              <div className="flex items-center gap-2">
                {gameState.players.map((p, idx) => {
                  const isActive = idx === gameState.activePlayerIndex;
                  return (
                    <div
                      key={p.id}
                      className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 transition ${
                        isActive
                          ? 'bg-amber-500/20 border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                          : 'bg-slate-950/60 border-slate-800 opacity-80'
                      }`}
                    >
                      <span className="text-sm">{p.avatar}</span>
                      <span className="text-xs font-black" style={{ color: p.color }}>
                        {p.username}
                      </span>
                      <span className="text-xs font-mono font-bold text-amber-300 ml-1">
                        {p.score} pts
                      </span>
                      {isActive && <span className="text-xs animate-pulse">⭐</span>}
                    </div>
                  );
                })}
              </div>

              <div className="text-xs font-mono text-slate-400 shrink-0">
                Tour : <strong className="text-amber-300">{activePlayer?.username}</strong>
              </div>
            </div>

            {/* CENTER STAGE: SECRET RATING BADGE */}
            <div className="bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-amber-500/40 rounded-3xl p-5 sm:p-7 shadow-2xl text-center relative overflow-hidden">
              <div className="mb-4">
                {isMyTurn() ? (
                  /* I AM ACTIVE: RATING IS SECRET FOR ME */
                  <div className="flex flex-col items-center">
                    <div className="w-24 h-28 sm:w-28 sm:h-34 rounded-2xl bg-gradient-to-b from-amber-500 via-amber-600 to-yellow-600 border-2 border-amber-300 p-2 shadow-2xl flex flex-col items-center justify-center relative animate-pulse">
                      <span className="text-3xl sm:text-4xl">❓</span>
                      <span className="text-xl sm:text-2xl font-black font-mono text-slate-950">/ 10</span>
                      <div className="absolute top-1 right-2 text-xs">🔒</div>
                    </div>
                    <p className="text-sm font-black text-amber-300 mt-2">
                      C'est votre tour ! Votre note est secrète.
                    </p>
                    <p className="text-xs text-slate-400 max-w-md">
                      Posez une question aux autres joueurs pour essayer de deviner cette note de 0 à 10 !
                    </p>
                  </div>
                ) : (
                  /* SOMEONE ELSE IS ACTIVE: I CAN SEE THEIR RATING */
                  <div className="flex flex-col items-center">
                    <div className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-amber-950/60 border-2 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)] mb-2">
                      <span className="text-2xl">🎯</span>
                      <div className="text-left">
                        <div className="text-[11px] font-bold text-amber-400/80 uppercase">
                          Note secrète de {activePlayer?.username}
                        </div>
                        <div className="text-3xl font-black font-mono text-amber-300">
                          {gameState.secretRating !== null ? `${gameState.secretRating} / 10` : '...'}
                        </div>
                      </div>
                    </div>

                    {/* Scale Guide */}
                    {gameState.secretRating !== null && (
                      <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                        <span>Échelle :</span>
                        <span className="text-red-400">0 (Pire/Nul)</span>
                        <span className="text-slate-500">←───</span>
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          {RATING_DESCRIPTIONS[gameState.secretRating]?.label || ''}
                        </span>
                        <span className="text-slate-500">───→</span>
                        <span className="text-emerald-400">10 (Parfait/Divin)</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ─── PHASE: CHOOSING_QUESTION ───────────────────────────────── */}
              {gameState.phase === 'CHOOSING_QUESTION' && (
                <div className="space-y-4 max-w-2xl mx-auto">
                  {isMyTurn() ? (
                    <div>
                      <h3 className="text-lg font-black text-amber-300 mb-1">
                        Choisissez votre question :
                      </h3>
                      <p className="text-xs text-slate-400 mb-4">
                        (Chaque question ne peut être posée qu'une seule fois dans la partie)
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-4">
                        {gameState.questionOptions.map((q, idx) => (
                          <button
                            key={idx}
                            onClick={() => socketRef.current?.emit('note:chooseQuestion', { question: q })}
                            className="p-3.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-amber-400 rounded-2xl text-left text-sm font-bold text-slate-100 hover:text-amber-300 transition shadow-md cursor-pointer flex items-center gap-2 group"
                          >
                            <span className="text-base group-hover:scale-125 transition">💬</span>
                            <span>{q}</span>
                          </button>
                        ))}
                      </div>

                      {/* Custom Question input */}
                      <div className="pt-3 border-t border-slate-800 flex gap-2">
                        <input
                          type="text"
                          value={customQuestionInput}
                          onChange={e => setCustomQuestionInput(e.target.value)}
                          placeholder="Ou inventez votre propre question..."
                          className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white focus:border-amber-400 focus:outline-none"
                        />
                        <button
                          onClick={() => {
                            if (customQuestionInput.trim()) {
                              socketRef.current?.emit('note:chooseQuestion', { question: customQuestionInput });
                              setCustomQuestionInput('');
                            }
                          }}
                          className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl cursor-pointer transition"
                        >
                          Poser
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="py-6 flex flex-col items-center gap-2">
                      <div className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin" />
                      <p className="text-sm font-bold text-slate-300">
                        En attente de la question de <strong className="text-amber-400">{activePlayer?.username}</strong>...
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ─── PHASE: ANSWERING & GUESSING & REVEAL: DISPLAY CURRENT QUESTION */}
              {gameState.currentQuestion && (
                <div className="my-4 px-5 py-3.5 bg-slate-950/80 border-2 border-amber-500/50 rounded-2xl max-w-xl mx-auto text-center shadow-lg">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-widest block mb-1">
                    Question posée :
                  </span>
                  <p className="text-base sm:text-lg font-black text-white italic">
                    "{gameState.currentQuestion}"
                  </p>
                </div>
              )}

              {/* ─── PHASE: ANSWERING ────────────────────────────────────────── */}
              {gameState.phase === 'ANSWERING' && (
                <div className="space-y-4 max-w-xl mx-auto">
                  {!isMyTurn() && (
                    <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl space-y-3 text-left">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-300">Votre réponse (calibrée sur {gameState.secretRating}/10) :</span>
                        <span className="text-amber-400 font-mono">Note : {gameState.secretRating}/10</span>
                      </div>

                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={answerInput}
                          onChange={e => setAnswerInput(e.target.value)}
                          placeholder="Ex: Une pizza brûlée... ou un repas de palace !"
                          className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white focus:border-amber-400 focus:outline-none"
                        />
                        <button
                          onClick={() => {
                            if (answerInput.trim()) {
                              socketRef.current?.emit('note:submitAnswer', { text: answerInput });
                              setAnswerInput('');
                            }
                          }}
                          className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs rounded-xl cursor-pointer transition shadow-md"
                        >
                          Envoyer
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Answers stream */}
                  <div className="space-y-2 text-left">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Réponses reçues ({gameState.answers.length} / {gameState.players.length - 1}) :
                    </div>
                    {gameState.answers.map(ans => (
                      <div
                        key={ans.playerId}
                        className="p-3 bg-slate-900/90 border border-slate-800 rounded-2xl flex items-start gap-3 animate-fade-in"
                      >
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm border font-bold shrink-0"
                          style={{ borderColor: ans.color, backgroundColor: `${ans.color}20` }}
                        >
                          {ans.avatar}
                        </div>
                        <div className="flex-1">
                          <span className="text-xs font-black block" style={{ color: ans.color }}>
                            {ans.username}
                          </span>
                          <p className="text-sm font-bold text-slate-200 mt-0.5">{ans.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {isMyTurn() && gameState.answers.length > 0 && (
                    <button
                      onClick={() => socketRef.current?.emit('note:forceGuessing')}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs rounded-xl border border-slate-700 transition cursor-pointer"
                    >
                      J'ai assez d'indices, passer à l'estimation ➔
                    </button>
                  )}
                </div>
              )}

              {/* ─── PHASE: GUESSING ─────────────────────────────────────────── */}
              {gameState.phase === 'GUESSING' && (
                <div className="space-y-5 max-w-xl mx-auto">
                  {/* Answers recap */}
                  <div className="space-y-2 text-left mb-4">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                      Les indices des autres joueurs :
                    </span>
                    <div className="grid grid-cols-1 gap-2">
                      {gameState.answers.map(ans => (
                        <div
                          key={ans.playerId}
                          className="p-3 bg-slate-900/90 border border-slate-800 rounded-2xl flex items-start gap-3"
                        >
                          <span className="text-lg">{ans.avatar}</span>
                          <div>
                            <span className="text-xs font-black" style={{ color: ans.color }}>
                              {ans.username} :
                            </span>
                            <span className="text-sm font-bold text-slate-200 ml-2">"{ans.text}"</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {isMyTurn() ? (
                    /* ACTIVE PLAYER: PICK GUESS 0 TO 10 */
                    <div className="bg-slate-900/90 border-2 border-amber-400 p-5 rounded-3xl space-y-4 shadow-xl text-center">
                      <div className="text-xs font-bold text-amber-300 uppercase tracking-widest">
                        À vous d'estimer votre note !
                      </div>

                      {/* Number buttons 0 to 10 */}
                      <div className="grid grid-cols-6 sm:grid-cols-11 gap-1.5 justify-center">
                        {Array.from({ length: 11 }, (_, i) => i).map(num => (
                          <button
                            key={num}
                            onClick={() => setSelectedGuess(num)}
                            className={`py-3 rounded-xl font-black font-mono text-sm border transition cursor-pointer ${
                              selectedGuess === num
                                ? 'bg-amber-400 text-slate-950 border-amber-300 scale-110 shadow-lg shadow-amber-500/30'
                                : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-700'
                            }`}
                          >
                            {num}
                          </button>
                        ))}
                      </div>

                      {/* Selected display */}
                      <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between px-6">
                        <span className="text-xs font-bold text-slate-400">Votre choix :</span>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-black font-mono text-amber-400">
                            {selectedGuess} / 10
                          </span>
                          <span className="text-xs font-bold text-slate-300">
                            ({RATING_DESCRIPTIONS[selectedGuess]?.label})
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => socketRef.current?.emit('note:submitGuess', { guess: selectedGuess })}
                        className="w-full py-4 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black rounded-2xl text-base uppercase tracking-wider transition shadow-xl shadow-amber-500/20 cursor-pointer transform hover:scale-[1.02] active:scale-[0.98]"
                      >
                        Valider mon estimation : {selectedGuess} / 10 🎯
                      </button>
                    </div>
                  ) : (
                    <div className="py-6 flex flex-col items-center gap-2">
                      <div className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin" />
                      <p className="text-sm font-bold text-slate-300">
                        <strong className="text-amber-400">{activePlayer?.username}</strong> analyse vos réponses et devine sa note...
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ─── PHASE: REVEAL ───────────────────────────────────────────── */}
              {gameState.phase === 'REVEAL' && (
                <div className="space-y-6 max-w-xl mx-auto animate-fade-in">
                  <div className="p-6 bg-slate-900/90 border-2 border-amber-400 rounded-3xl shadow-2xl space-y-4">
                    <div className="text-center space-y-1">
                      <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">
                        Révélation de la note
                      </span>
                      <h3 className="text-2xl font-black text-white">
                        Résultat pour {activePlayer?.username}
                      </h3>
                    </div>

                    {/* Comparison Card */}
                    <div className="grid grid-cols-2 gap-3 text-center">
                      <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800">
                        <span className="text-xs text-slate-400 font-bold block mb-1">Estimation :</span>
                        <span className="text-3xl font-black font-mono text-cyan-400">
                          {gameState.guess} / 10
                        </span>
                      </div>
                      <div className="p-4 bg-amber-950/40 rounded-2xl border border-amber-500/50">
                        <span className="text-xs text-amber-300 font-bold block mb-1">Vraie note :</span>
                        <span className="text-3xl font-black font-mono text-amber-400">
                          {gameState.secretRating} / 10
                        </span>
                      </div>
                    </div>

                    {/* Result badge */}
                    <div
                      className={`p-4 rounded-2xl border text-center font-black text-lg ${
                        gameState.guessDiff === 0
                          ? 'bg-emerald-950/80 border-emerald-400 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                          : (gameState.guessDiff ?? 99) <= 2
                          ? 'bg-amber-950/80 border-amber-400 text-amber-300'
                          : 'bg-red-950/80 border-red-500 text-red-300'
                      }`}
                    >
                      {gameState.guessDiff === 0 && '🎯 NOTE PILE POIL ! EXCELLENT ! (+3 points)'}
                      {gameState.guessDiff === 1 && '🔥 TRÈS PROCHE ! À 1 point près ! (+2 points)'}
                      {gameState.guessDiff === 2 && '👌 PAS MAL ! À 2 points près ! (+1 point)'}
                      {(gameState.guessDiff ?? 99) > 2 &&
                        `❌ ÉCART DE ${gameState.guessDiff} POINTS ! TROP LOIN (+0 point)`}
                    </div>

                    {/* Next button */}
                    <button
                      onClick={() => socketRef.current?.emit('note:nextTurn')}
                      className="w-full py-3.5 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black rounded-2xl text-sm uppercase tracking-wider transition shadow-lg cursor-pointer transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                      Tour Suivant ➔
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* SLIDE-OVER GAME LOG */}
      {showLog && (
        <div className="fixed inset-y-0 right-0 max-w-sm w-full bg-slate-900/95 border-l border-slate-800 p-4 shadow-2xl flex flex-col z-50 backdrop-blur-md">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
            <span className="font-black text-amber-400 text-sm flex items-center gap-1.5">
              <span>📜</span> Historique de la Partie
            </span>
            <button
              onClick={() => setShowLog(false)}
              className="text-slate-400 hover:text-white p-1 text-sm cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 text-xs font-mono text-slate-300 pr-1">
            {gameState?.log.map((entry, idx) => (
              <div key={idx} className="p-1.5 bg-slate-950/60 rounded border border-slate-800/60">
                {entry}
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>
      )}
    </div>
  );
}
