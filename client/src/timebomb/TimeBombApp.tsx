import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { SERVER_URL } from '../config/serverUrl';
import { soundFx } from '../utils/audio';
import type {
  TimeBombGameState,
  TimeBombVariant,
} from './timebombTypes';

export default function TimeBombApp() {
  const navigate = useNavigate();
  const socketRef = useRef<Socket | null>(null);

  // Connection & Room state
  const [username, setUsername] = useState(() => localStorage.getItem('timebomb_username') || '');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [joined, setJoined] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [gameState, setGameState] = useState<TimeBombGameState | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [showRoleInfo, setShowRoleInfo] = useState(true);

  // Connect socket on mount
  useEffect(() => {
    const s = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      timeout: 60000,
      reconnection: true,
      reconnectionAttempts: 30,
      reconnectionDelay: 1500,
      reconnectionDelayMax: 5000,
    });
    socketRef.current = s;

    s.on('connect', () => {
      setIsConnected(true);
      setErrorMsg('');
    });

    s.on('disconnect', () => {
      setIsConnected(false);
    });

    s.on('connect_error', (err) => {
      setIsConnected(false);
      if (err.message.includes('timeout')) {
        setErrorMsg('Réveil du serveur Render (~30-60s au premier lancement)... Reconnexion...');
      } else {
        setErrorMsg(`Connexion au serveur : ${err.message}`);
      }
    });

    s.on('timebombStateUpdate', (st: TimeBombGameState) => {
      setGameState(st);
      setJoined(true);
      setRoomCode(st.roomCode);
      setErrorMsg('');
    });

    s.on('error', (msg: string) => {
      setErrorMsg(msg);
    });

    return () => {
      s.disconnect();
    };
  }, []);

  const handleJoin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanUser = username.trim();
    let cleanRoom = roomCodeInput.trim().toUpperCase();
    if (!cleanUser) {
      setErrorMsg('Veuillez entrer un pseudo.');
      return;
    }
    if (!cleanRoom) {
      cleanRoom = `BOMB${Math.floor(100 + Math.random() * 900)}`;
      setRoomCodeInput(cleanRoom);
    }

    localStorage.setItem('timebomb_username', cleanUser);
    setErrorMsg('');
    socketRef.current?.emit('joinGame', {
      username: cleanUser,
      roomCode: cleanRoom,
      gameType: 'timebomb',
    });
  };

  const handleStartGame = () => {
    soundFx.click();
    socketRef.current?.emit('timebomb:startGame');
  };

  const handleCutWire = (targetId: string, cardIndex: number) => {
    soundFx.click();
    socketRef.current?.emit('timebomb:cutWire', { targetId, cardIndex });
  };

  const handleSetVariant = (variant: TimeBombVariant) => {
    soundFx.click();
    socketRef.current?.emit('timebomb:setVariant', { variant });
  };

  const handleAddBot = () => {
    soundFx.click();
    socketRef.current?.emit('timebomb:addBot');
  };

  const handleRemoveBot = (botId: string) => {
    soundFx.click();
    socketRef.current?.emit('timebomb:removeBot', { botId });
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    socketRef.current?.emit('timebomb:chat', { text: chatInput.trim() });
    setChatInput('');
  };

  const handleRestart = () => {
    soundFx.click();
    socketRef.current?.emit('timebomb:restart');
  };

  const copyRoomCode = () => {
    if (!roomCode) return;
    navigator.clipboard.writeText(roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const myId = socketRef.current?.id || '';
  const isMyTurn = gameState?.activeCutterId === myId;
  const isHost = gameState?.players[0]?.id === myId;

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: LOGIN / JOIN SCREEN
  // ─────────────────────────────────────────────────────────────────────────────
  if (!joined || !gameState) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-between items-center p-4 selection:bg-rose-500 selection:text-white">
        <div className="w-full max-w-lg mt-6">
          <button
            onClick={() => navigate('/')}
            className="text-slate-400 hover:text-white text-sm flex items-center gap-2 mb-6 cursor-pointer transition"
          >
            ← Retour à l'accueil
          </button>

          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md text-center">
            <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-rose-600 via-red-600 to-amber-600 rounded-3xl flex items-center justify-center text-4xl shadow-xl shadow-rose-600/30">
              💣
            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-red-400 to-amber-300 mb-1">
              TIME BOMB
            </h1>
            <p className="text-xs text-rose-300 font-bold uppercase tracking-widest mb-4">
              Jeu de Cartes 52 • Démineurs vs Terroristes
            </p>

            {/* Server status indicator */}
            <div className="flex items-center justify-center gap-2 mb-6 text-xs font-bold">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isConnected ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-amber-400 animate-ping'
                }`}
              />
              <span className={isConnected ? 'text-emerald-400' : 'text-amber-300'}>
                {isConnected ? 'Serveur en ligne' : 'Connexion au serveur... (hébergement Render)'}
              </span>
            </div>

            {errorMsg && (
              <div className="bg-red-950/70 border border-red-500/50 text-red-200 p-3 rounded-xl mb-4 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleJoin} className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Votre Pseudo
                </label>
                <input
                  type="text"
                  maxLength={16}
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ex: Sherlock"
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-rose-500 focus:outline-none transition text-sm"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Code du Salon
                  </label>
                  <button
                    type="button"
                    onClick={() => setRoomCodeInput(`BOMB${Math.floor(100 + Math.random() * 900)}`)}
                    className="text-[11px] text-rose-400 hover:text-rose-300 font-bold cursor-pointer"
                  >
                    🎲 Générer un code
                  </button>
                </div>
                <input
                  type="text"
                  maxLength={10}
                  value={roomCodeInput}
                  onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                  placeholder="Laisser vide pour créer (ou ex: BOMB42)"
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono uppercase focus:border-rose-500 focus:outline-none transition text-sm"
                />
              </div>

              <button
                type="submit"
                className="w-full py-4 mt-2 font-black rounded-xl text-base uppercase tracking-wider transition shadow-xl cursor-pointer bg-gradient-to-r from-rose-500 via-red-600 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-white shadow-rose-600/30 active:scale-[0.98]"
              >
                Rejoindre ou Créer le Salon 💣
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-slate-800 text-xs text-slate-400 space-y-2 text-left">
              <p className="font-bold text-slate-300">📖 Règle express :</p>
              <p>• 🕵️‍♂️ <strong>Démineurs (Rois Rouges)</strong> : Coupez tous les As/Dames avant la fin de la 4ᵉ manche pour désamorcer la bombe !</p>
              <p>• 👿 <strong>Terroristes (Rois Noirs)</strong> : Faites couper le Valet de Pique ♠️ ou épuisez les 4 manches pour faire exploser la bombe !</p>
              <p>• ✂️ <strong>Aller-retour interdit</strong> : Vous ne pouvez jamais couper chez la personne qui vient juste de couper chez vous !</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: LOBBY SCREEN
  // ─────────────────────────────────────────────────────────────────────────────
  if (gameState.status === 'LOBBY') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-6xl">
          {/* Header */}
          <div className="flex items-center justify-between py-4 border-b border-slate-800 mb-6">
            <button
              onClick={() => navigate('/')}
              className="text-slate-400 hover:text-white text-sm flex items-center gap-1 cursor-pointer"
            >
              ← Accueil
            </button>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400">Salon :</span>
              <button
                onClick={copyRoomCode}
                className="px-3 py-1 bg-slate-900 border border-rose-500/40 hover:border-rose-400 rounded-lg font-mono font-bold text-rose-300 flex items-center gap-2 cursor-pointer transition text-sm"
              >
                <span>{gameState.roomCode}</span>
                <span>{copiedCode ? '✅' : '📋'}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Players list */}
            <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <span>👥 Joueurs</span>
                  <span className="text-xs px-2 py-0.5 bg-rose-950 text-rose-300 border border-rose-500/40 rounded-full font-bold">
                    {gameState.players.length} / 8 (min 3)
                  </span>
                </h2>
                {isHost && gameState.players.length < 8 && (
                  <button
                    onClick={handleAddBot}
                    className="px-3 py-1.5 bg-purple-900/50 hover:bg-purple-800 border border-purple-500/50 text-purple-200 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <span>+ Ajouter un Bot IA 🤖</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                {gameState.players.map((p, idx) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white shadow"
                        style={{ backgroundColor: p.color }}
                      >
                        {p.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-sm flex items-center gap-1.5">
                          <span>{p.username}</span>
                          {idx === 0 && <span className="text-[10px] text-amber-400 font-bold">👑 HÔTE</span>}
                          {p.id === myId && <span className="text-[10px] text-rose-400 font-bold">(VOUS)</span>}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {p.isBot ? 'Bot IA Virtuel' : 'Joueur en ligne'}
                        </div>
                      </div>
                    </div>
                    {isHost && p.isBot && (
                      <button
                        onClick={() => handleRemoveBot(p.id)}
                        className="text-slate-500 hover:text-red-400 text-xs px-2 py-1 cursor-pointer"
                        title="Retirer ce bot"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Start game button */}
              {isHost ? (
                <div>
                  <button
                    onClick={handleStartGame}
                    disabled={gameState.players.length < 3}
                    className={`w-full py-4 rounded-xl font-black uppercase tracking-wider text-base transition shadow-xl cursor-pointer ${
                      gameState.players.length >= 3
                        ? 'bg-gradient-to-r from-rose-600 via-red-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white shadow-rose-600/30'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                    }`}
                  >
                    {gameState.players.length >= 3
                      ? 'Lancer la Partie 💣'
                      : `Il manque ${3 - gameState.players.length} joueur(s) (ou Bots)`}
                  </button>
                </div>
              ) : (
                <div className="text-center py-3 text-sm text-slate-400 bg-slate-950/50 rounded-xl border border-slate-800">
                  En attente que l'hôte lance la partie...
                </div>
              )}
            </div>

            {/* Right: Variants & Rules summary */}
            <div className="space-y-4">
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
                <h3 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-2">
                  <span>⚙️ Variante</span>
                </h3>
                <div className="space-y-2">
                  {[
                    { id: 'STANDARD' as TimeBombVariant, label: 'Standard', desc: '1 Bombe, Désamorçages = Nombre de joueurs' },
                    { id: 'DEBUTANT' as TimeBombVariant, label: '✂️ Débutant', desc: '-1 Désamorçage requis (plus facile pour les Démineurs)' },
                    { id: 'EXPERT' as TimeBombVariant, label: '⏱️ Expert', desc: '+1 Désamorçage requis (plus difficile pour les Démineurs)' },
                    { id: 'MORT_SUBITE' as TimeBombVariant, label: '💣 Mort Subite', desc: '2 Bombes (Valet ♠️ + Valet ♣️)' },
                  ].map((v) => (
                    <button
                      key={v.id}
                      onClick={() => isHost && handleSetVariant(v.id)}
                      disabled={!isHost}
                      className={`w-full text-left p-3 rounded-xl border transition text-xs ${
                        gameState.variant === v.id
                          ? 'bg-rose-950/70 border-rose-500 text-rose-200 font-bold'
                          : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
                      } ${!isHost ? 'cursor-default' : 'cursor-pointer'}`}
                    >
                      <div className="font-bold">{v.label}</div>
                      <div className="text-[11px] opacity-75">{v.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 text-xs text-slate-400 space-y-2">
                <h3 className="font-bold text-slate-200 text-sm mb-2">📋 Rôles selon effectif</h3>
                <p>• <strong>3 joueurs :</strong> 2 Démineurs, 1 Terroriste</p>
                <p>• <strong>4 joueurs :</strong> 3 Démineurs, 1 Terroriste</p>
                <p>• <strong>5 joueurs :</strong> 3 Démineurs, 2 Terroristes</p>
                <p>• <strong>6-7 joueurs :</strong> 4-5 Démineurs, 2 Terroristes</p>
                <p>• <strong>8 joueurs :</strong> 5 Démineurs, 3 Terroristes</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: ACTIVE GAME & FINISHED SCREEN
  // ─────────────────────────────────────────────────────────────────────────────
  const isFinished = gameState.status === 'FINISHED';
  const mySecret = gameState.mySecret;
  const isDemineur = mySecret?.role === 'DEMINEUR';

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col selection:bg-rose-500 selection:text-white">
      {/* Top Navigation & Status Bar */}
      <header className="bg-slate-900/90 border-b border-slate-800 px-4 sm:px-6 lg:px-8 py-3 sticky top-0 z-30 backdrop-blur-md">
        <div className="max-w-[1800px] w-full mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="text-slate-400 hover:text-white text-xs cursor-pointer font-medium"
            >
              ← Quitter
            </button>
            <div className="h-4 w-px bg-slate-800" />
            <div className="flex items-center gap-2">
              <span className="text-xl">💣</span>
              <span className="font-black text-rose-400 uppercase tracking-wider text-sm">Time Bomb</span>
            </div>
          </div>

          {/* Central gauges: Round, Defuses, Bombs */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs font-bold">
            <div className="px-3 sm:px-4 py-1.5 bg-slate-950 border border-slate-800 rounded-xl">
              <span className="text-slate-400">Manche : </span>
              <span className="text-amber-400 font-mono text-xs sm:text-sm">{gameState.round} / {gameState.maxRounds}</span>
            </div>

            <div className="px-3 sm:px-4 py-1.5 bg-slate-950 border border-slate-800 rounded-xl">
              <span className="text-slate-400">Fils coupés : </span>
              <span className="text-white font-mono text-xs sm:text-sm">
                {gameState.cutsThisRound} / {gameState.totalCutsThisRoundTarget}
              </span>
            </div>

            <div className="px-3 sm:px-4 py-1.5 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-emerald-300">
              <span>✂️ Désamorçages : </span>
              <span className="font-mono text-xs sm:text-sm font-black">
                {gameState.defusesFound} / {gameState.totalDefusesNeeded}
              </span>
            </div>

            <div className="px-3 sm:px-4 py-1.5 bg-rose-950/60 border border-rose-500/40 rounded-xl text-rose-300">
              <span>💣 Bombe : </span>
              <span className="font-mono text-xs sm:text-sm font-black">
                {gameState.bombsFound} / {gameState.totalBombsInGame}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={copyRoomCode}
              className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-300 hover:text-white cursor-pointer"
            >
              {gameState.roomCode}
            </button>
          </div>
        </div>
      </header>

      {/* Main Game Arena */}
      <main className="flex-1 max-w-[1800px] w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        {/* Banner: Whose turn is it? & Anti-ping-pong alert */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-rose-600 flex items-center justify-center text-2xl sm:text-3xl shadow-lg shrink-0">
              ✂️
            </div>
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wider font-bold">
                Porteur de la pince coupante
              </div>
              <div className="text-lg sm:text-xl font-black text-white flex flex-wrap items-center gap-2">
                <span>
                  {gameState.players.find((p) => p.id === gameState.activeCutterId)?.username || 'Inconnu'}
                </span>
                {isMyTurn && (
                  <span className="px-2.5 py-0.5 bg-rose-600 text-white text-xs font-black rounded-full animate-pulse shadow">
                    C'EST À VOUS DE COUPER !
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Anti-ping-pong rule reminder */}
          {gameState.lastCutterId && (
            <div className="text-xs sm:text-sm bg-slate-950/80 border border-amber-500/30 text-amber-300 px-4 py-2.5 rounded-xl">
              ⚠️ <strong>Aller-retour interdit :</strong> Le porteur de la pince ne peut pas couper chez{' '}
              <span className="font-bold underline">
                {gameState.players.find((p) => p.id === gameState.lastCutterId)?.username}
              </span>
            </div>
          )}
        </div>

        {/* Secret Role and Cards Knowledge */}
        {mySecret && !isFinished && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <span className="text-2xl sm:text-3xl">{isDemineur ? '🕵️‍♂️' : '👿'}</span>
                <div>
                  <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                    Votre Rôle Secret
                  </div>
                  <div className="text-base sm:text-lg font-black flex items-center gap-2">
                    <span className={isDemineur ? 'text-emerald-400' : 'text-rose-400'}>
                      {isDemineur ? 'DÉMINEUR' : 'TERRORISTE'}
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-slate-800 rounded text-slate-300 font-normal">
                      {mySecret.roleCardName}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowRoleInfo(!showRoleInfo)}
                className="text-xs text-slate-400 hover:text-white px-3 py-1.5 bg-slate-950 rounded-lg border border-slate-800 cursor-pointer"
              >
                {showRoleInfo ? 'Masquer mes infos' : 'Afficher mes infos'}
              </button>
            </div>

            {showRoleInfo && (
              <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
                <div className="text-slate-300 flex flex-wrap items-center gap-2">
                  <span className="font-bold text-slate-200">Reçu pour cette manche : </span>
                  <span className="px-2.5 py-1 bg-emerald-950 border border-emerald-500/40 rounded text-emerald-300 font-bold">
                    ✂️ {mySecret.roundKnowledge.defuses} Désamorçage(s)
                  </span>
                  <span className="px-2.5 py-1 bg-rose-950 border border-rose-500/40 rounded text-rose-300 font-bold">
                    💣 {mySecret.roundKnowledge.bombs} Bombe
                  </span>
                  <span className="px-2.5 py-1 bg-slate-800 rounded text-slate-300 font-bold">
                    ⚪ {mySecret.roundKnowledge.neutrals} Neutres
                  </span>
                </div>
                <div className="text-slate-400 italic text-[11px] sm:text-xs">
                  * Vos cartes en main sont visibles sur votre profil ci-dessous. Les autres joueurs les voient face cachée.
                </div>
              </div>
            )}
          </div>
        )}

        {/* Victory / Defeat Modal Banner if Finished */}
        {isFinished && (
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 border-2 border-amber-500/60 rounded-3xl p-6 sm:p-10 text-center shadow-2xl animate-fade-in max-w-4xl mx-auto w-full">
            <div className="text-6xl sm:text-7xl mb-3">
              {gameState.winner === 'DEMINEURS' ? '🏆' : '💥'}
            </div>
            <h2 className="text-3xl sm:text-5xl font-black mb-2">
              {gameState.winner === 'DEMINEURS' ? (
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
                  VICTOIRE DES DÉMINEURS !
                </span>
              ) : (
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-amber-500">
                  VICTOIRE DES TERRORISTES !
                </span>
              )}
            </h2>
            <p className="text-slate-300 text-sm sm:text-base max-w-xl mx-auto mb-6">
              {gameState.winReason}
            </p>

            {/* Revealed Roles */}
            <div className="max-w-3xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 text-xs sm:text-sm">
              {gameState.players.map((p) => (
                <div
                  key={p.id}
                  className={`p-3.5 rounded-xl border text-center ${
                    p.role === 'DEMINEUR'
                      ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-200'
                      : 'bg-rose-950/50 border-rose-500/40 text-rose-200'
                  }`}
                >
                  <div className="font-bold">{p.username}</div>
                  <div className="text-xs opacity-80 mt-1">
                    {p.role === 'DEMINEUR' ? '🕵️‍♂️ Démineur' : '👿 Terroriste'}
                  </div>
                  <div className="text-[11px] text-slate-400">{p.roleCardName}</div>
                </div>
              ))}
            </div>

            <button
              onClick={handleRestart}
              className="px-8 py-4 bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-slate-950 font-black rounded-xl uppercase tracking-wider text-sm sm:text-base shadow-xl cursor-pointer"
            >
              🔄 Rejouer une Partie
            </button>
          </div>
        )}

        {/* The Players & Their Face-Down Cards Table */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-5 lg:gap-6">
          {gameState.players.map((player) => {
            const isTargetBlockedPingPong = gameState.lastCutterId === player.id;
            const isMe = player.id === myId;
            const hasCutter = gameState.activeCutterId === player.id;
            const canCutHere = isMyTurn && !isMe && !isTargetBlockedPingPong && player.cards.some((c) => !c.isCut);

            return (
              <div
                key={player.id}
                className={`bg-slate-900/80 border rounded-2xl p-4 sm:p-5 transition-all shadow-lg flex flex-col justify-between ${
                  hasCutter
                    ? 'border-amber-400 ring-2 ring-amber-400/20 shadow-amber-900/20'
                    : isMe
                    ? 'border-indigo-500/70 ring-2 ring-indigo-500/20 shadow-indigo-950/40'
                    : canCutHere
                    ? 'border-emerald-500/70 hover:border-emerald-400'
                    : 'border-slate-800'
                }`}
              >
                {/* Player header */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center font-black text-sm text-white shadow"
                        style={{ backgroundColor: player.color }}
                      >
                        {player.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-base flex items-center gap-1.5">
                          <span>{player.username}</span>
                          {isMe && (
                            <span className="px-2 py-0.5 bg-indigo-950 border border-indigo-500/50 text-indigo-300 font-black text-[10px] rounded-full uppercase tracking-wider">
                              (VOUS)
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400">
                          {player.cardCount} carte(s) restante(s)
                        </div>
                      </div>
                    </div>

                    {/* Status badges */}
                    <div>
                      {hasCutter && (
                        <span className="px-2.5 py-1 bg-amber-400 text-slate-950 font-black rounded-full text-xs flex items-center gap-1 shadow">
                          <span>✂️</span>
                          <span>PINCE</span>
                        </span>
                      )}
                      {isMyTurn && isTargetBlockedPingPong && !isMe && (
                        <span className="px-2 py-0.5 bg-red-950 border border-red-500/50 text-red-300 font-bold rounded text-[10px]">
                          🚫 Ping-pong interdit
                        </span>
                      )}
                    </div>
                  </div>


                  {/* Cards Row in front of this player */}
                  <div className="flex flex-wrap gap-2.5 sm:gap-3 py-3 items-center">
                    {player.cards.map((card, cIdx) => {
                      const isCut = card.isCut;
                      const cardType = card.type;

                      // 1. CARTE COUPÉE (Révélée pour tout le monde)
                      if (isCut) {
                        let bgStyle = 'bg-slate-800/80 border-slate-700 text-slate-400 opacity-75';
                        let icon = '⚪';
                        if (cardType === 'BOMB') {
                          bgStyle = 'bg-rose-950 border-rose-500 text-rose-200 shadow-[0_0_16px_#f43f5e] animate-bounce';
                          icon = '💣';
                        } else if (cardType === 'DEFUSE') {
                          bgStyle = 'bg-emerald-950 border-emerald-400 text-emerald-200 shadow-[0_0_14px_#10b981]';
                          icon = '✂️';
                        }

                        return (
                          <div
                            key={card.id}
                            className={`w-16 h-24 sm:w-20 sm:h-28 rounded-xl border-2 flex flex-col items-center justify-between p-1.5 sm:p-2 text-xs font-bold transition transform shadow-md relative ${bgStyle}`}
                          >
                            <div className="w-full flex items-center justify-between text-[10px] leading-none">
                              <span className="font-mono text-slate-400 font-bold">#{cIdx + 1}</span>
                              <span className="text-[9px] bg-red-950 border border-red-500/60 text-red-300 px-1 rounded font-black">
                                COUPÉ ✂️
                              </span>
                            </div>
                            <span className="text-xl sm:text-2xl my-auto">{icon}</span>
                            <div className="w-full text-center">
                              <div className="text-xs sm:text-sm leading-tight font-mono font-black">
                                {card.value}{card.suit}
                              </div>
                              <div className="text-[8px] sm:text-[9px] uppercase tracking-wider opacity-85 font-black">
                                {cardType === 'BOMB' ? 'BOMBE' : cardType === 'DEFUSE' ? 'DÉSAM.' : 'NEUTRE'}
                              </div>
                            </div>
                          </div>
                        );
                      }

                      // 2. PARTIE TERMINÉE : TOUT LE MONDE EST RÉVÉLÉ
                      if (isFinished) {
                        let bgStyle = 'bg-slate-800 border-slate-700 text-slate-300';
                        let icon = '⚪';
                        if (cardType === 'BOMB') {
                          bgStyle = 'bg-rose-950 border-rose-500 text-rose-200 shadow-[0_0_16px_#f43f5e]';
                          icon = '💣';
                        } else if (cardType === 'DEFUSE') {
                          bgStyle = 'bg-emerald-950 border-emerald-400 text-emerald-200 shadow-[0_0_14px_#10b981]';
                          icon = '✂️';
                        }

                        return (
                          <div
                            key={card.id}
                            className={`w-16 h-24 sm:w-20 sm:h-28 rounded-xl border-2 flex flex-col items-center justify-between p-1.5 sm:p-2 text-xs font-bold transition transform shadow-md ${bgStyle}`}
                          >
                            <span className="text-xl sm:text-2xl">{icon}</span>
                            <span className="text-xs sm:text-sm text-center leading-tight font-mono font-black">
                              {card.value}{card.suit}
                            </span>
                            <span className="text-[8px] sm:text-[9px] uppercase tracking-wider opacity-85 font-black">
                              {cardType === 'BOMB' ? 'BOMBE' : cardType === 'DEFUSE' ? 'DÉSAM.' : 'NEUTRE'}
                            </span>
                          </div>
                        );
                      }

                      // 3. VOS PROPRES CARTES EN MAIN (NON COUPÉES) : VISIBLES PAR VOUS UNIQUEMENT
                      if (isMe) {
                        let bgStyle = 'bg-slate-900 border-slate-700 text-slate-200';
                        let icon = '⚪';
                        let badgeColor = 'bg-slate-800 text-slate-300 border-slate-700';
                        let typeText = 'NEUTRE';

                        if (cardType === 'BOMB') {
                          bgStyle = 'bg-gradient-to-b from-rose-950 via-slate-900 to-rose-950/80 border-rose-500 text-rose-200 ring-1 ring-rose-500/50 shadow-md shadow-rose-950/40';
                          icon = '💣';
                          badgeColor = 'bg-rose-950 text-rose-300 border-rose-500/60';
                          typeText = 'BOMBE';
                        } else if (cardType === 'DEFUSE') {
                          bgStyle = 'bg-gradient-to-b from-emerald-950 via-slate-900 to-emerald-950/80 border-emerald-500 text-emerald-200 ring-1 ring-emerald-500/50 shadow-md shadow-emerald-950/40';
                          icon = '✂️';
                          badgeColor = 'bg-emerald-950 text-emerald-300 border-emerald-500/60';
                          typeText = 'DÉSAM.';
                        }

                        return (
                          <div
                            key={card.id}
                            className={`w-16 h-24 sm:w-20 sm:h-28 rounded-xl border-2 flex flex-col items-center justify-between p-1.5 sm:p-2 text-xs font-bold transition transform shadow-md relative ${bgStyle}`}
                            title={`Votre carte en main #${cIdx + 1} : ${card.label || typeText}`}
                          >
                            <div className="w-full flex items-center justify-between text-[10px] leading-none opacity-85">
                              <span className="font-mono text-slate-400 font-bold">#{cIdx + 1}</span>
                              <span className="text-base sm:text-lg">{icon}</span>
                            </div>
                            <div className="text-sm sm:text-base text-center leading-tight font-mono font-black my-auto">
                              {card.value}{card.suit}
                            </div>
                            <div className="w-full flex items-center justify-center">
                              <span className={`text-[8px] sm:text-[9px] uppercase tracking-wider font-black px-1.5 py-0.5 rounded border ${badgeColor}`}>
                                {typeText}
                              </span>
                            </div>
                          </div>
                        );
                      }

                      // 4. CARTES DES AUTRES JOUEURS (FACE CACHÉE, CLIQUABLES SI PINCE ACTIVE)
                      return (
                        <button
                          key={card.id}
                          disabled={!canCutHere}
                          onClick={() => canCutHere && handleCutWire(player.id, cIdx)}
                          className={`w-16 h-24 sm:w-20 sm:h-28 rounded-xl border-2 flex flex-col items-center justify-center p-1.5 sm:p-2 transition-all ${
                            canCutHere
                              ? 'bg-gradient-to-br from-rose-950 via-slate-900 to-amber-950 border-rose-500/80 hover:border-amber-300 hover:scale-105 hover:shadow-xl hover:shadow-rose-500/40 cursor-pointer animate-pulse'
                              : 'bg-slate-950 border-slate-800 text-slate-600 opacity-80 cursor-default'
                          }`}
                          title={canCutHere ? 'Couper ce fil avec la pince !' : 'Carte face cachée'}
                        >
                          <div className="w-10 h-14 sm:w-12 sm:h-16 rounded-lg border border-rose-500/30 bg-rose-900/20 flex items-center justify-center text-base sm:text-xl font-bold text-rose-400/60 shadow-inner">
                            {canCutHere ? '✂️' : '🔒'}
                          </div>
                          <span className="text-[10px] sm:text-xs mt-1 text-slate-400 font-mono font-semibold">
                            #{cIdx + 1}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Helper prompt when player is clickable or own hand */}
                {isMe && (
                  <div className="mt-2 text-center text-xs text-indigo-300/80 font-medium italic">
                    👀 Vos cartes en main (visibles uniquement par vous)
                  </div>
                )}
                {canCutHere && (
                  <div className="mt-2 text-center text-xs sm:text-sm font-bold text-emerald-400 animate-pulse">
                    👉 Cliquez sur une carte pour couper ce fil !
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Cuts History & Room Chat */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
          {/* Cuts history feed (left) */}
          <div className="lg:col-span-5 xl:col-span-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between h-80 sm:h-96">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <span>📜 Historique des Coupes</span>
                </h3>
                <span className="text-[11px] text-slate-500 font-mono">
                  {gameState.history.length} coupure(s)
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-2">
                🗣️ Les annonces et bluffs se font directement à l'oral autour de la table !
              </p>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 p-3 bg-slate-950/70 rounded-xl border border-slate-800 text-xs sm:text-sm my-2">
              {gameState.history.length === 0 ? (
                <div className="text-slate-500 italic text-center py-12 text-xs">
                  Aucun fil coupé pour l'instant.
                </div>
              ) : (
                gameState.history.map((h, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/80 flex items-center justify-between text-xs sm:text-sm"
                  >
                    <div className="text-slate-300">
                      <span className="font-bold text-white">{h.cutterName}</span>
                      <span className="text-slate-500 mx-1.5">➔</span>
                      <span className="font-bold text-slate-200">{h.targetName}</span>
                    </div>
                    <span
                      className={`font-black font-mono px-2 py-0.5 rounded text-xs ${
                        h.cardType === 'DEFUSE'
                          ? 'bg-emerald-950 border border-emerald-500/40 text-emerald-300'
                          : h.cardType === 'BOMB'
                          ? 'bg-rose-950 border border-rose-500/40 text-rose-300 animate-pulse'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {h.cardLabel}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="text-[11px] text-slate-500 text-center italic">
              Tournez la pince coupante après chaque fil coupé.
            </div>
          </div>

          {/* Room Live Chat (right) */}
          <div className="lg:col-span-7 xl:col-span-8 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between h-80 sm:h-96">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              💬 Débat & Notes autour de la table
            </h3>

            <div className="flex-1 overflow-y-auto space-y-2 p-3 bg-slate-950/70 rounded-xl border border-slate-800 text-xs sm:text-sm mb-3">
              {gameState.messages.map((m) => (
                <div key={m.id} className="flex items-start gap-2">
                  <span className="font-bold shrink-0" style={{ color: m.senderColor }}>
                    {m.senderName}:
                  </span>
                  <span className="text-slate-300 break-words">{m.text}</span>
                </div>
              ))}
              {gameState.messages.length === 0 && (
                <div className="text-slate-500 italic text-center py-12 text-xs">
                  Aucun message écrit. Discutez à l'oral ou tapez vos remarques ici !
                </div>
              )}
            </div>

            <form onSubmit={handleSendChat} className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Discutez, accusez ou notez des indices..."
                maxLength={140}
                className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs sm:text-sm focus:border-rose-500 focus:outline-none"
              />
              <button
                type="submit"
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs sm:text-sm font-bold cursor-pointer"
              >
                Envoyer
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
