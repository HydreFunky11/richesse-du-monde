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

  const handleSendAnnouncement = (claimedDefuses?: number, claimsBomb?: boolean, text?: string) => {
    soundFx.click();
    socketRef.current?.emit('timebomb:announce', { claimedDefuses, claimsBomb, text });
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
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center p-4">
        <div className="w-full max-w-4xl">
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left: Players list */}
            <div className="md:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
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
                    { id: 'STANDARD' as TimeBombVariant, label: 'Standard', desc: '1 Bombe, Désamorçages = Joueurs' },
                    { id: 'MORT_SUBITE' as TimeBombVariant, label: '💣 Mort Subite', desc: '2 Bombes (Valet ♠️ + Valet ♣️)' },
                    { id: 'DEBUTANT' as TimeBombVariant, label: '✂️ Débutant', desc: '+1 Désamorçage de sécurité' },
                    { id: 'EXPERT' as TimeBombVariant, label: '⏱️ Expert', desc: '-1 Désamorçage (zéro erreur)' },
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
      <header className="bg-slate-900/90 border-b border-slate-800 px-4 py-3 sticky top-0 z-30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="text-slate-400 hover:text-white text-xs cursor-pointer"
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
          <div className="flex items-center gap-4 text-xs font-bold">
            <div className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl">
              <span className="text-slate-400">Manche : </span>
              <span className="text-amber-400 font-mono text-sm">{gameState.round} / {gameState.maxRounds}</span>
            </div>

            <div className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl">
              <span className="text-slate-400">Fils coupés : </span>
              <span className="text-white font-mono text-sm">
                {gameState.cutsThisRound} / {gameState.totalCutsThisRoundTarget}
              </span>
            </div>

            <div className="px-3 py-1.5 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-emerald-300">
              <span>✂️ Désamorçages : </span>
              <span className="font-mono text-sm font-black">
                {gameState.defusesFound} / {gameState.totalDefusesNeeded}
              </span>
            </div>

            <div className="px-3 py-1.5 bg-rose-950/60 border border-rose-500/40 rounded-xl text-rose-300">
              <span>💣 Bombe : </span>
              <span className="font-mono text-sm font-black">
                {gameState.bombsFound} / {gameState.totalBombsInGame}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={copyRoomCode}
              className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-300 hover:text-white"
            >
              {gameState.roomCode}
            </button>
          </div>
        </div>
      </header>

      {/* Main Game Arena */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-6">
        {/* Banner: Whose turn is it? & Anti-ping-pong alert */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-rose-600 flex items-center justify-center text-2xl shadow-lg">
              ✂️
            </div>
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wider font-bold">
                Porteur de la pince coupante
              </div>
              <div className="text-lg font-black text-white flex items-center gap-2">
                <span>
                  {gameState.players.find((p) => p.id === gameState.activeCutterId)?.username || 'Inconnu'}
                </span>
                {isMyTurn && (
                  <span className="px-2 py-0.5 bg-rose-600 text-white text-xs font-black rounded-full animate-pulse">
                    C'EST À VOUS DE COUPER !
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Anti-ping-pong rule reminder */}
          {gameState.lastCutterId && (
            <div className="text-xs bg-slate-950/80 border border-amber-500/30 text-amber-300 px-3.5 py-2 rounded-xl">
              ⚠️ <strong>Aller-retour interdit :</strong> Le porteur de la pince ne peut pas couper chez{' '}
              <span className="font-bold underline">
                {gameState.players.find((p) => p.id === gameState.lastCutterId)?.username}
              </span>
            </div>
          )}
        </div>

        {/* Secret Role and Cards Knowledge (Accordion / Card) */}
        {mySecret && !isFinished && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{isDemineur ? '🕵️‍♂️' : '👿'}</span>
                <div>
                  <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                    Votre Rôle Secret
                  </div>
                  <div className="text-base font-black flex items-center gap-2">
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
                className="text-xs text-slate-400 hover:text-white px-3 py-1 bg-slate-950 rounded-lg border border-slate-800 cursor-pointer"
              >
                {showRoleInfo ? 'Masquer mes infos' : 'Afficher mes infos'}
              </button>
            </div>

            {showRoleInfo && (
              <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="text-slate-300">
                  <span className="font-bold text-slate-200">Reçu pour cette manche : </span>
                  <span className="px-2 py-1 bg-emerald-950 border border-emerald-500/40 rounded text-emerald-300 font-bold mr-2">
                    ✂️ {mySecret.roundKnowledge.defuses} Désamorçage(s)
                  </span>
                  <span className="px-2 py-1 bg-rose-950 border border-rose-500/40 rounded text-rose-300 font-bold mr-2">
                    💣 {mySecret.roundKnowledge.bombs} Bombe
                  </span>
                  <span className="px-2 py-1 bg-slate-800 rounded text-slate-300 font-bold">
                    ⚪ {mySecret.roundKnowledge.neutrals} Neutres
                  </span>
                </div>
                <div className="text-slate-500 italic text-[11px]">
                  * Vos cartes sont disposées face cachée dans un ordre aléatoire que vous ignorez.
                </div>
              </div>
            )}
          </div>
        )}

        {/* Victory / Defeat Modal Banner if Finished */}
        {isFinished && (
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 border-2 border-amber-500/60 rounded-3xl p-6 sm:p-8 text-center shadow-2xl animate-fade-in">
            <div className="text-6xl mb-3">
              {gameState.winner === 'DEMINEURS' ? '🏆' : '💥'}
            </div>
            <h2 className="text-3xl sm:text-4xl font-black mb-2">
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
            <p className="text-slate-300 text-sm max-w-xl mx-auto mb-6">
              {gameState.winReason}
            </p>

            {/* Revealed Roles */}
            <div className="max-w-2xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 text-xs">
              {gameState.players.map((p) => (
                <div
                  key={p.id}
                  className={`p-3 rounded-xl border text-center ${
                    p.role === 'DEMINEUR'
                      ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-200'
                      : 'bg-rose-950/50 border-rose-500/40 text-rose-200'
                  }`}
                >
                  <div className="font-bold">{p.username}</div>
                  <div className="text-[11px] opacity-80 mt-1">
                    {p.role === 'DEMINEUR' ? '🕵️‍♂️ Démineur' : '👿 Terroriste'}
                  </div>
                  <div className="text-[10px] text-slate-400">{p.roleCardName}</div>
                </div>
              ))}
            </div>

            <button
              onClick={handleRestart}
              className="px-8 py-3.5 bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-slate-950 font-black rounded-xl uppercase tracking-wider text-sm shadow-xl cursor-pointer"
            >
              🔄 Rejouer une Partie
            </button>
          </div>
        )}

        {/* The Players & Their Face-Down Cards Table */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {gameState.players.map((player) => {
            const isTargetBlockedPingPong = gameState.lastCutterId === player.id;
            const isMe = player.id === myId;
            const hasCutter = gameState.activeCutterId === player.id;
            const canCutHere = isMyTurn && !isMe && !isTargetBlockedPingPong && player.cards.some((c) => !c.isCut);

            return (
              <div
                key={player.id}
                className={`bg-slate-900/80 border rounded-2xl p-4 transition-all shadow-lg flex flex-col justify-between ${
                  hasCutter
                    ? 'border-amber-400 ring-2 ring-amber-400/20 shadow-amber-900/20'
                    : canCutHere
                    ? 'border-emerald-500/70 hover:border-emerald-400'
                    : 'border-slate-800'
                }`}
              >
                {/* Player header */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs text-white shadow"
                        style={{ backgroundColor: player.color }}
                      >
                        {player.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-sm flex items-center gap-1.5">
                          <span>{player.username}</span>
                          {isMe && <span className="text-[10px] text-rose-400 font-bold">(VOUS)</span>}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {player.cardCount} carte(s) restante(s)
                        </div>
                      </div>
                    </div>

                    {/* Status badges */}
                    <div>
                      {hasCutter && (
                        <span className="px-2.5 py-1 bg-amber-400 text-slate-950 font-black rounded-full text-[11px] flex items-center gap-1 shadow">
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

                  {/* Player Announcement Banner */}
                  {player.announcement && (
                    <div className="mb-3 px-3 py-1.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs flex items-center justify-between text-slate-300">
                      <span>
                        {player.announcement.claimedDefuses !== undefined && (
                          <span className="text-emerald-400 font-bold mr-2">
                            ✂️ {player.announcement.claimedDefuses} Désam.
                          </span>
                        )}
                        {player.announcement.claimsBomb && (
                          <span className="text-rose-400 font-bold">💣 Prétend avoir la Bombe</span>
                        )}
                      </span>
                    </div>
                  )}

                  {/* Cards Row in front of this player */}
                  <div className="flex flex-wrap gap-2 py-2">
                    {player.cards.map((card, cIdx) => {
                      const isCut = card.isCut;
                      const cardType = card.type;

                      if (isCut || isFinished) {
                        // REVEALED CARD
                        let bgStyle = 'bg-slate-800 border-slate-700 text-slate-300';
                        let icon = '⚪';
                        if (cardType === 'BOMB') {
                          bgStyle = 'bg-rose-950 border-rose-500 text-rose-200 shadow-[0_0_12px_#f43f5e] animate-bounce';
                          icon = '💣';
                        } else if (cardType === 'DEFUSE') {
                          bgStyle = 'bg-emerald-950 border-emerald-400 text-emerald-200 shadow-[0_0_10px_#10b981]';
                          icon = '✂️';
                        }

                        return (
                          <div
                            key={card.id}
                            className={`w-14 h-20 rounded-xl border-2 flex flex-col items-center justify-between p-1.5 text-xs font-bold transition transform shadow ${bgStyle}`}
                          >
                            <span className="text-base">{icon}</span>
                            <span className="text-[10px] text-center leading-tight font-mono">
                              {card.value}{card.suit}
                            </span>
                            <span className="text-[8px] uppercase tracking-tighter opacity-75">
                              {cardType === 'BOMB' ? 'BOMBE' : cardType === 'DEFUSE' ? 'DÉSAM.' : 'NEUTRE'}
                            </span>
                          </div>
                        );
                      }

                      // FACE DOWN CARD
                      return (
                        <button
                          key={card.id}
                          disabled={!canCutHere}
                          onClick={() => canCutHere && handleCutWire(player.id, cIdx)}
                          className={`w-14 h-20 rounded-xl border-2 flex flex-col items-center justify-center p-1 transition-all ${
                            canCutHere
                              ? 'bg-gradient-to-br from-rose-950 via-slate-900 to-amber-950 border-rose-500/80 hover:border-amber-300 hover:scale-105 hover:shadow-lg hover:shadow-rose-500/30 cursor-pointer animate-pulse'
                              : 'bg-slate-950 border-slate-800 text-slate-600 opacity-80 cursor-default'
                          }`}
                          title={canCutHere ? 'Couper ce fil avec la pince !' : 'Carte face cachée'}
                        >
                          <div className="w-8 h-12 rounded border border-rose-500/30 bg-rose-900/20 flex items-center justify-center text-sm font-bold text-rose-400/50">
                            {canCutHere ? '✂️' : '🔒'}
                          </div>
                          <span className="text-[9px] mt-1 text-slate-500 font-mono">
                            #{cIdx + 1}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Helper prompt when player is clickable */}
                {canCutHere && (
                  <div className="mt-2 text-center text-[11px] font-bold text-emerald-400 animate-pulse">
                    👉 Cliquez sur une carte pour couper ce fil !
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bluffing Actions & Chat Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Quick Bluff Actions (left) */}
          <div className="lg:col-span-1 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                🗣️ Bluff & Annonces Rapides
              </h3>
              <p className="text-[11px] text-slate-400 mb-3">
                Vous avez le droit de mentir librement pour orienter le porteur de la pince !
              </p>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  onClick={() => handleSendAnnouncement(1, false, "J'ai 1 Désamorçage garanti ✂️ venez couper chez moi !")}
                  className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-emerald-500/40 text-emerald-300 rounded-xl font-bold cursor-pointer transition text-left"
                >
                  ✂️ J'ai 1 Désam.
                </button>
                <button
                  onClick={() => handleSendAnnouncement(2, false, "J'ai 2 Désamorçages ✂️✂️ foncez !")}
                  className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-emerald-500/40 text-emerald-300 rounded-xl font-bold cursor-pointer transition text-left"
                >
                  ✂️✂️ J'ai 2 Désam.
                </button>
                <button
                  onClick={() => handleSendAnnouncement(0, true, "⚠️ ATTENTION j'ai la Bombe, ne venez surtout pas !")}
                  className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-rose-500/40 text-rose-300 rounded-xl font-bold cursor-pointer transition text-left"
                >
                  💣 J'ai la Bombe !
                </button>
                <button
                  onClick={() => handleSendAnnouncement(0, false, "Je n'ai que des fils neutres ⚪ rien d'intéressant.")}
                  className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-xl font-bold cursor-pointer transition text-left"
                >
                  ⚪ Tout est neutre
                </button>
              </div>
            </div>

            {/* Cuts history feed */}
            <div className="mt-4 pt-3 border-t border-slate-800">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Dernières Coupes
              </div>
              <div className="max-h-24 overflow-y-auto space-y-1 text-xs">
                {gameState.history.slice(0, 5).map((h, i) => (
                  <div key={i} className="text-slate-400 flex items-center justify-between text-[11px]">
                    <span>
                      {h.cutterName} ➔ {h.targetName}
                    </span>
                    <span className={h.cardType === 'DEFUSE' ? 'text-emerald-400 font-bold' : h.cardType === 'BOMB' ? 'text-rose-400 font-bold' : 'text-slate-500'}>
                      {h.cardLabel}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Room Live Chat (right) */}
          <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between h-72">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              💬 Débat autour de la table
            </h3>

            <div className="flex-1 overflow-y-auto space-y-1.5 p-2 bg-slate-950/70 rounded-xl border border-slate-800 text-xs mb-3">
              {gameState.messages.map((m) => (
                <div key={m.id} className="flex items-start gap-2">
                  <span className="font-bold shrink-0" style={{ color: m.senderColor }}>
                    {m.senderName}:
                  </span>
                  <span className="text-slate-300 break-words">{m.text}</span>
                </div>
              ))}
              {gameState.messages.length === 0 && (
                <div className="text-slate-500 italic text-center py-6">
                  Aucun message pour l'instant. Discutez et bluffez !
                </div>
              )}
            </div>

            <form onSubmit={handleSendChat} className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Bluffez, accusez ou conseillez le coupeur..."
                maxLength={140}
                className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-rose-500 focus:outline-none"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold cursor-pointer"
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
