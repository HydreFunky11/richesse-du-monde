import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { PropHunt3DScene } from './propHunt3D';
import {
  MAP_METADATA,
  PROP_NAMES,
  type PropHuntGameState,
  type PropHuntMapId,
  type PropHuntPlayer
} from './propHuntTypes';
import { propAudio } from './propHuntAudio';
import { modelLoader } from './propHuntModelLoader';
import { SERVER_URL } from '../config/serverUrl';

export default function PropHuntApp() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<PropHunt3DScene | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // Connection & Room state
  const [username, setUsername] = useState(() => localStorage.getItem('prophunt_username') || '');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [joined, setJoined] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [gameState, setGameState] = useState<PropHuntGameState | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  // Local cooldown tracking
  const [dashCooldown, setDashCooldown] = useState(0);
  const dashCooldownRef = useRef(0);
  dashCooldownRef.current = dashCooldown;
  const [changePropCooldown, setChangePropCooldown] = useState(0);
  const [ammoStatus, setAmmoStatus] = useState({ hasAmmo: true, isReloading: false, reloadProgress: 1 });
  const [hitmarker, setHitmarker] = useState(false);
  const [screenLog, setScreenLog] = useState<string[]>([]);
  const [isMuted, setIsMuted] = useState(propAudio.isMuted());
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    const onLock = () => {
      setIsLocked(document.pointerLockElement === containerRef.current);
    };
    document.addEventListener('pointerlockchange', onLock);
    return () => document.removeEventListener('pointerlockchange', onLock);
  }, []);

  useEffect(() => {
    modelLoader.preloadAll().catch(console.error);
  }, []);

  // Socket setup
  useEffect(() => {
    const s = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      timeout: 60000, // 60s to accommodate Render cold start
      reconnection: true,
      reconnectionAttempts: 30,
      reconnectionDelay: 1500,
      reconnectionDelayMax: 5000,
    });
    socketRef.current = s;

    s.on('connect', () => {
      console.log('Connecté au serveur Prop Hunt !', s.id);
      setIsConnected(true);
      setErrorMsg('');
      if (engineRef.current && s.id) {
        engineRef.current.setMyPlayerId(s.id);
      }
    });

    s.on('disconnect', (reason) => {
      console.log('[PropHunt] Déconnecté:', reason);
      setIsConnected(false);
      if (reason === 'io server disconnect') {
        s.connect();
      }
    });

    s.on('connect_error', (err) => {
      console.error('[PropHunt] Erreur de connexion:', err);
      setIsConnected(false);
      if (err.message.includes('timeout')) {
        setErrorMsg('Réveil du serveur Render en cours (~30-60s au premier chargement)... Reconnexion automatique...');
      } else {
        setErrorMsg(`Connexion au serveur : ${err.message}. Nouvelle tentative...`);
      }
    });

    s.on('prophuntStateUpdate', (st: PropHuntGameState) => {
      setGameState(st);
      setJoined(true);
      setErrorMsg('');
      if (engineRef.current) {
        engineRef.current.updateGameState(st);
      }
    });

    s.on('prophunt:playerMoved', (data: { id: string; position: [number, number, number]; rotation: [number, number, number] }) => {
      if (engineRef.current) {
        engineRef.current.updateRemotePlayerMovement(data.id, data.position, data.rotation);
      }
    });

    s.on('prophunt:dashCooldown', (sec: number) => {
      setDashCooldown(sec);
      if (sec > 0 && engineRef.current) {
        engineRef.current.triggerDash();
      }
    });

    s.on('prophunt:changePropCooldown', (sec: number) => {
      setChangePropCooldown(sec);
    });

    s.on('prophunt:shootResult', (res: { hit: boolean; killed: boolean; hunterDamageTaken: number }) => {
      if (res.hit) {
        setHitmarker(true);
        setTimeout(() => setHitmarker(false), 200);
      }
      if (res.hunterDamageTaken > 0) {
        // Hunter took damage
      }
    });

    s.on('error', (err: string) => {
      setErrorMsg(err);
      setTimeout(() => setErrorMsg(''), 4000);
    });

    return () => {
      s.disconnect();
    };
  }, []);

  // Periodic cooldown ticker
  useEffect(() => {
    const interval = setInterval(() => {
      setDashCooldown(prev => Math.max(0, prev - 1));
      setChangePropCooldown(prev => Math.max(0, prev - 1));
      if (engineRef.current) {
        setAmmoStatus(engineRef.current.getAmmoStatus());
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Initialize 3D Scene when joined
  useEffect(() => {
    if (!joined || !containerRef.current || engineRef.current) return;

    const engine = new PropHunt3DScene(containerRef.current, {
      onShoot: (hitPlayerId) => {
        socketRef.current?.emit('prophunt:shoot', { hitPlayerId });
      },
      onDash: () => {
        if (dashCooldownRef.current === 0) {
          engine.triggerDash();
        }
        socketRef.current?.emit('prophunt:dash');
      },
      onChangeProp: () => {
        socketRef.current?.emit('prophunt:changeProp');
      },
      onToggleFreeze: () => {
        socketRef.current?.emit('prophunt:freeze');
      },
      onTaunt: () => {
        socketRef.current?.emit('prophunt:taunt');
      },
      onMovement: (position, rotation) => {
        socketRef.current?.emit('prophunt:playerMove', { position, rotation });
      }
    });

    if (socketRef.current?.id) {
      engine.setMyPlayerId(socketRef.current.id);
    }
    if (gameState?.selectedMap) {
      engine.buildMap(gameState.selectedMap);
    }
    if (gameState) {
      engine.updateGameState(gameState);
    }

    engineRef.current = engine;

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [joined]);

  // Keep screen logs up to date
  useEffect(() => {
    if (gameState?.logs) {
      setScreenLog(gameState.logs.slice(-4));
    }
  }, [gameState?.logs]);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = username.trim();
    const cleanRoom = roomCodeInput.trim().toUpperCase();

    if (!cleanUser) {
      setErrorMsg('Veuillez entrer un pseudo');
      return;
    }
    if (!cleanRoom) {
      setErrorMsg('Veuillez entrer un code de salon');
      return;
    }
    if (!socketRef.current?.connected) {
      setErrorMsg('Connexion au serveur en cours (réveil Render ~30s)... Veuillez patienter.');
      return;
    }

    localStorage.setItem('prophunt_username', cleanUser);
    socketRef.current?.emit('joinGame', {
      username: cleanUser,
      roomCode: cleanRoom,
      gameType: 'prophunt'
    });
  };

  const handleVoteMap = (mapId: PropHuntMapId) => {
    socketRef.current?.emit('prophunt:voteMap', { mapId });
  };

  const handleStartGame = () => {
    socketRef.current?.emit('prophunt:startGame');
  };

  const handleResetGame = () => {
    socketRef.current?.emit('prophunt:resetGame');
  };

  const handleCopyCode = () => {
    if (!gameState?.roomCode) return;
    navigator.clipboard.writeText(gameState.roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const getMyPlayer = (): PropHuntPlayer | undefined => {
    return gameState?.players.find((p) => p.id === socketRef.current?.id);
  };

  const myPlayer = getMyPlayer();
  const isHost = myPlayer?.isHost;
  const isHunter = myPlayer?.role === 'SEEKER';
  const isHider = myPlayer?.role === 'HIDER';
  const isSpectator = myPlayer?.role === 'SPECTATOR';

  // Format timer MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative w-screen h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden select-none">
      {/* 3D WEBGL CANVAS CONTAINER */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full z-0 cursor-crosshair" />

      {/* TOP HEADER BAR */}
      <header className="absolute top-0 left-0 right-0 px-4 py-3 bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80 flex items-center justify-between z-30 pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          <button
            onClick={() => navigate('/')}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
          >
            ← Accueil
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xl">🕵️‍♂️</span>
            <span className="font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-300 to-yellow-400 hidden sm:inline">
              PROP HUNT 3D
            </span>
          </div>
        </div>

        {joined && gameState && (
          <div className="flex items-center gap-3 pointer-events-auto">
            {/* Map badge */}
            <div className="px-3 py-1 bg-slate-800/90 border border-slate-700 rounded-xl text-xs flex items-center gap-1.5">
              <span>{MAP_METADATA[gameState.selectedMap]?.icon}</span>
              <span className="font-bold text-amber-300">{MAP_METADATA[gameState.selectedMap]?.name}</span>
            </div>

            {/* Room code badge */}
            <button
              onClick={handleCopyCode}
              className="px-3 py-1 bg-slate-800/90 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-mono text-slate-300 flex items-center gap-1.5 transition cursor-pointer"
            >
              <span>Salon :</span>
              <strong className="text-amber-400 font-black">{gameState.roomCode}</strong>
              <span className="text-xs">{copiedCode ? '✅' : '📋'}</span>
            </button>

            {/* Mute button */}
            <button
              onClick={() => {
                const next = !isMuted;
                propAudio.setMuted(next);
                setIsMuted(next);
              }}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 text-xs cursor-pointer"
            >
              {isMuted ? '🔇' : '🔊'}
            </button>
          </div>
        )}
      </header>

      {/* ERROR BANNER */}
      {errorMsg && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-red-600/90 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-2xl animate-bounce z-50">
          ⚠️ {errorMsg}
        </div>
      )}

      {/* ─── 1. JOIN VIEW ────────────────────────────────────────────────────── */}
      {!joined || !gameState ? (
        <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm pointer-events-auto">
          <div className="max-w-md w-full bg-slate-900 border-2 border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-amber-950/40 text-center">
            <div className="text-6xl mb-3">🛒</div>
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-300 to-yellow-400 mb-1">
              PROP HUNT 3D
            </h1>
            <p className="text-xs text-amber-300/80 font-bold uppercase tracking-widest mb-4">
              Cache-Cache en 3D dans la Supérette & Entrepôt
            </p>

            {/* Server connection indicator */}
            <div className="flex items-center justify-center gap-2 mb-6 text-xs font-bold">
              <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-amber-400 animate-ping'}`} />
              <span className={isConnected ? 'text-emerald-400' : 'text-amber-300'}>
                {isConnected ? 'Serveur en ligne' : 'Connexion au serveur... (hébergement Render)'}
              </span>
            </div>

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
                  placeholder="Ex: Ghost"
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold focus:border-amber-400 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Code du Salon
                </label>
                <input
                  type="text"
                  maxLength={10}
                  required
                  value={roomCodeInput}
                  onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                  placeholder="Ex: SALON1"
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono uppercase focus:border-amber-400 focus:outline-none transition"
                />
              </div>

              <button
                type="submit"
                disabled={!isConnected}
                className={`w-full py-4 mt-2 font-black rounded-xl text-base uppercase tracking-wider transition shadow-xl cursor-pointer transform hover:scale-[1.02] active:scale-[0.98] ${
                  isConnected
                    ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-slate-950 shadow-amber-500/20'
                    : 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed opacity-80'
                }`}
              >
                {isConnected ? 'Rejoindre ou Créer le Salon 🚀' : 'Connexion au serveur en cours... ⏳'}
              </button>
            </form>
          </div>
        </div>
      ) : gameState.phase === 'LOBBY' ? (
        /* ─── 2. LOBBY VIEW & MAP VOTING ────────────────────────────────────── */
        <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md pointer-events-auto overflow-y-auto">
          <div className="max-w-3xl w-full bg-slate-900/95 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6 my-auto">
            <div className="text-center space-y-1">
              <div className="text-4xl">🗳️</div>
              <h2 className="text-2xl font-black text-amber-400">Salon & Vote de la Map</h2>
              <p className="text-xs text-slate-400">
                Votez pour l'environnement de jeu ! Minimum 2 joueurs humains requis.
              </p>
            </div>

            {/* MAP VOTE CARDS */}
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                Choisissez votre terrain de jeu
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {(Object.keys(MAP_METADATA) as PropHuntMapId[]).map((mapId) => {
                  const meta = MAP_METADATA[mapId];
                  const myVote = gameState.mapVotes[socketRef.current?.id || ''] === mapId;
                  const voteCount = Object.values(gameState.mapVotes).filter((v) => v === mapId).length;

                  return (
                    <button
                      key={mapId}
                      onClick={() => handleVoteMap(mapId)}
                      className={`p-4 rounded-2xl border text-left transition relative cursor-pointer ${
                        myVote
                          ? 'bg-amber-950/50 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                          : 'bg-slate-950/80 border-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-3xl">{meta.icon}</span>
                        <span className="px-2 py-0.5 bg-slate-800 rounded-full text-[10px] font-black text-amber-400 border border-slate-700">
                          {voteCount} {voteCount > 1 ? 'votes' : 'vote'}
                        </span>
                      </div>
                      <div className="font-bold text-sm text-white">{meta.name}</div>
                      <div className="text-[11px] text-slate-400 line-clamp-2 mt-1">
                        {meta.description}
                      </div>
                      {myVote && (
                        <div className="mt-2 text-[10px] font-black text-amber-400 uppercase tracking-wider">
                          ✓ Votre choix
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* PLAYERS LIST */}
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                <span>Joueurs ({gameState.players.length} / 10)</span>
                <span className="text-amber-400">Manche de 5 minutes min.</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {gameState.players.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex items-center gap-2"
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: p.color }}
                    />
                    <div className="truncate text-xs font-bold text-white">
                      {p.username} {p.isHost && '👑'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* START BUTTON */}
            {isHost ? (
              <button
                onClick={handleStartGame}
                disabled={gameState.players.length < 2}
                className={`w-full py-4 rounded-2xl font-black text-base uppercase tracking-wider transition cursor-pointer ${
                  gameState.players.length >= 2
                    ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-slate-950 shadow-xl shadow-amber-500/20 transform hover:scale-[1.01]'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                {gameState.players.length >= 2
                  ? 'Lancer la Partie 🚀'
                  : 'En attente de joueurs (min. 2)...'}
              </button>
            ) : (
              <div className="text-center py-3 text-sm text-slate-400 animate-pulse">
                ⏳ En attente que l'hôte lance la partie...
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ─── 3. IN-GAME HUD ─────────────────────────────────────────────────── */
        <>
          {/* HUNTER BLACK SCREEN DURING HIDING PHASE */}
          {gameState.phase === 'HIDING' && isHunter && (
            <div className="absolute inset-0 z-40 bg-black flex flex-col items-center justify-center text-center p-6 select-none">
              <div className="text-7xl mb-4 animate-pulse">🙈</div>
              <h2 className="text-3xl font-black text-red-500 mb-2 tracking-wider">
                VOUS ÊTES LE CHERCHEUR !
              </h2>
              <p className="text-sm text-slate-400 max-w-md mb-6">
                Écran noir pendant la phase de cachette. Les objets sont en train de se disperser et de se cacher dans la pièce !
              </p>
              <div className="text-6xl font-black font-mono text-amber-400 animate-bounce">
                {gameState.hidingTimeRemaining}s
              </div>
              <p className="text-xs text-slate-500 uppercase tracking-widest mt-4">
                Libération imminente...
              </p>
            </div>
          )}

          {/* HIDER HIDING NOTICE */}
          {gameState.phase === 'HIDING' && isHider && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 bg-amber-500/90 text-slate-950 px-6 py-2 rounded-2xl font-black text-sm shadow-2xl animate-pulse">
              🏃 COUREZ VOUS CACHER ! Libération du chercheur dans {gameState.hidingTimeRemaining}s
            </div>
          )}

          {/* CLICK TO LOCK PROMPT WHEN NOT LOCKED IN GAME */}
          {!isLocked && gameState.phase !== 'FINISHED' && !(gameState.phase === 'HIDING' && isHunter) && (
            <div
              onClick={() => containerRef.current?.requestPointerLock()}
              className="absolute inset-0 z-25 flex items-center justify-center bg-black/40 backdrop-blur-[2px] cursor-pointer"
            >
              <div className="bg-slate-900/95 border-2 border-amber-500/60 text-white px-8 py-5 rounded-3xl text-center shadow-2xl animate-pulse space-y-2 max-w-sm">
                <div className="text-4xl">🖱️</div>
                <div className="text-lg font-black text-amber-400">Cliquez pour jouer</div>
                <div className="text-xs text-slate-300 leading-relaxed">
                  {isHunter ? (
                    <>
                      <p className="font-bold text-red-400">🕵️ Rôle : Chasseur (Vue FPS 1ère personne)</p>
                      <p>• ZQSD / WASD pour marcher • [Espace] Sauter</p>
                      <p>• Clic gauche : Tirer (1 balle) • [R] Recharger</p>
                    </>
                  ) : (
                    <>
                      <p className="font-bold text-amber-400">🎭 Rôle : Caché (Vue 3ème personne)</p>
                      <p>• ZQSD / WASD pour marcher • [Espace] Sauter sur les décors</p>
                      <p>• Molette de la souris : Zoomer / Dézoomer</p>
                      <p>• [F] Figer la position • [E] Métamorphose • [Shift] Dash</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TOP ROUND TIMER & REMAINING PROPS */}
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 flex items-center gap-4 bg-slate-900/90 backdrop-blur-md px-5 py-2 rounded-2xl border border-slate-700 shadow-xl">
            <div className="flex items-center gap-2">
              <span className="text-base">⏱️</span>
              <span className="font-mono font-black text-lg text-white">
                {formatTime(gameState.roundTimeRemaining)}
              </span>
            </div>
            <div className="h-4 w-px bg-slate-700" />
            <div className="text-xs font-bold text-amber-400">
              {gameState.players.filter((p) => p.role === 'HIDER' && p.health > 0).length} cachés en vie
            </div>
          </div>

          {/* HUNTER RETICLE / CROSSHAIR */}
          {isHunter && gameState.phase === 'HUNTING' && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
              <div
                className={`w-6 h-6 border-2 rounded-full transition-transform duration-75 ${
                  hitmarker ? 'border-red-500 scale-150' : 'border-amber-400/80'
                }`}
              >
                <div className="w-1 h-1 bg-amber-400 rounded-full m-auto mt-2" />
              </div>
              {hitmarker && (
                <div className="absolute text-red-500 font-black text-xl animate-ping">
                  💥 HIT !
                </div>
              )}
            </div>
          )}

          {/* HUNTER WEAPON / AMMO HUD (BOTTOM RIGHT) */}
          {isHunter && (
            <div className="absolute bottom-6 right-6 z-20 bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl border border-slate-800 shadow-2xl flex flex-col items-end gap-2 pointer-events-none">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Fusil de Chasse
              </div>
              <div className="flex items-center gap-3">
                <span className="text-3xl">🎯</span>
                <div className="text-3xl font-black font-mono flex items-center gap-1.5">
                  <span className={ammoStatus.hasAmmo ? 'text-amber-400' : 'text-red-500'}>
                    {ammoStatus.hasAmmo ? '1' : '0'}
                  </span>
                  <span className="text-slate-600 text-lg">/ 1</span>
                </div>
              </div>

              {ammoStatus.isReloading ? (
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-400 h-full transition-all duration-75"
                    style={{ width: `${ammoStatus.reloadProgress * 100}%` }}
                  />
                </div>
              ) : !ammoStatus.hasAmmo ? (
                <div className="text-xs font-black text-amber-400 animate-pulse">
                  Appuyez sur [R] pour recharger !
                </div>
              ) : (
                <div className="text-[10px] text-slate-400">Tir unique • Rechargez après chaque tir</div>
              )}

              {/* Recoil Warning */}
              <div className="text-[10px] text-red-400/90 font-bold border-t border-slate-800 pt-1 mt-1">
                ⚠️ Faux objet = -5 PV
              </div>
            </div>
          )}

          {/* HIDER ABILITIES HUD (BOTTOM CENTER) */}
          {isHider && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 bg-slate-900/90 backdrop-blur-md p-3 rounded-2xl border border-slate-800 shadow-2xl pointer-events-none">
              {/* Current Prop Badge */}
              <div className="px-3 py-2 bg-slate-950 rounded-xl border border-slate-800 flex items-center gap-2">
                <span className="text-2xl">
                  {PROP_NAMES[myPlayer?.currentProp || '']?.icon || '📦'}
                </span>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Objet actuel</div>
                  <div className="text-xs font-black text-amber-400">
                    {PROP_NAMES[myPlayer?.currentProp || '']?.label || 'Objet'}
                  </div>
                </div>
              </div>

              {/* Ability 1: Change Prop (E, 120s cooldown) */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center border font-bold text-xs ${
                    changePropCooldown > 0
                      ? 'bg-slate-950/80 border-slate-800 text-slate-500'
                      : 'bg-amber-500/20 border-amber-400 text-amber-300'
                  }`}
                >
                  <span>{changePropCooldown > 0 ? `${changePropCooldown}s` : '✨'}</span>
                  <span className="text-[9px] font-black">[E]</span>
                </div>
                <span className="text-[9px] text-slate-400 mt-1">Changer</span>
              </div>

              {/* Ability 2: Dash (Shift, 5s cooldown) */}
              <div
                className="flex flex-col items-center cursor-pointer active:scale-95 transition-transform"
                onClick={() => {
                  if (dashCooldown === 0) {
                    engineRef.current?.triggerDash();
                    socketRef.current?.emit('prophunt:dash');
                  }
                }}
              >
                <div
                  className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center border font-bold text-xs ${
                    dashCooldown > 0
                      ? 'bg-slate-950/80 border-slate-800 text-slate-500'
                      : 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                  }`}
                >
                  <span>{dashCooldown > 0 ? `${dashCooldown}s` : '⚡'}</span>
                  <span className="text-[9px] font-black">[Shift]</span>
                </div>
                <span className="text-[9px] text-slate-400 mt-1">Dash</span>
              </div>

              {/* Ability 3: Freeze (F) */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center border font-bold text-xs ${
                    myPlayer?.isFrozen
                      ? 'bg-emerald-500/30 border-emerald-400 text-emerald-300 ring-2 ring-emerald-500/50'
                      : 'bg-slate-950 border-slate-700 text-slate-300'
                  }`}
                >
                  <span>{myPlayer?.isFrozen ? '🔒' : '🔓'}</span>
                  <span className="text-[9px] font-black">[F]</span>
                </div>
                <span className="text-[9px] text-slate-400 mt-1">
                  {myPlayer?.isFrozen ? 'Figé' : 'Libre'}
                </span>
              </div>

              {/* Ability 4: Taunt (T) */}
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-xl flex flex-col items-center justify-center border bg-purple-500/20 border-purple-400 text-purple-300 font-bold text-xs">
                  <span>🎺</span>
                  <span className="text-[9px] font-black">[T]</span>
                </div>
                <span className="text-[9px] text-slate-400 mt-1">Taunt</span>
              </div>
            </div>
          )}

          {/* HEALTH BAR (BOTTOM LEFT) */}
          {myPlayer && !isSpectator && (
            <div className="absolute bottom-6 left-6 z-20 bg-slate-900/90 backdrop-blur-md p-3.5 rounded-2xl border border-slate-800 shadow-2xl pointer-events-none min-w-[180px]">
              <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                <span className="text-slate-400">Points de Vie</span>
                <span className="font-mono text-white font-black">{myPlayer.health} PV</span>
              </div>
              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    myPlayer.health > 50
                      ? 'bg-emerald-500'
                      : myPlayer.health > 25
                      ? 'bg-amber-500'
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${(myPlayer.health / myPlayer.maxHealth) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* SPECTATOR MODE OVERLAY */}
          {isSpectator && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 bg-slate-900/90 border border-slate-700 text-slate-200 px-6 py-2.5 rounded-2xl font-bold text-xs shadow-2xl flex items-center gap-2">
              <span className="text-xl">👻</span>
              <span>Vous êtes éliminé • Mode Spectateur jusqu'à la fin de la partie</span>
            </div>
          )}

          {/* SCREEN ACTION LOGS */}
          <div className="absolute top-24 left-6 z-20 space-y-1 pointer-events-none">
            {screenLog.map((log, idx) => (
              <div
                key={idx}
                className="text-[11px] font-bold text-slate-300 bg-slate-950/70 px-2.5 py-1 rounded-lg border border-slate-800/80 shadow backdrop-blur-sm max-w-sm truncate"
              >
                {log}
              </div>
            ))}
          </div>

          {/* ─── 4. FINISHED GAME VIEW ───────────────────────────────────────── */}
          {gameState.phase === 'FINISHED' && (
            <div className="absolute inset-0 z-40 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 pointer-events-auto">
              <div className="max-w-md w-full bg-slate-900 border-2 border-amber-500/50 rounded-3xl p-8 shadow-2xl text-center space-y-6">
                <div className="text-6xl animate-bounce">
                  {gameState.winner === 'HUNTER' ? '🕵️‍♂️' : '🎉'}
                </div>
                <div>
                  <h2 className="text-3xl font-black text-amber-400">
                    {gameState.winner === 'HUNTER' ? 'Victoire du Chercheur !' : 'Victoire des Cachés !'}
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    {gameState.winner === 'HUNTER'
                      ? 'Tous les accessoires ont été débusqués et neutralisés.'
                      : 'Les objets ont survécu jusqu’à la fin du temps réglementaire !'}
                  </p>
                </div>

                {isHost && (
                  <button
                    onClick={handleResetGame}
                    className="w-full py-4 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 text-slate-950 font-black rounded-2xl text-base uppercase tracking-wider transition shadow-xl shadow-amber-500/20 cursor-pointer"
                  >
                    Rejouer (Retour au Salon) 🔄
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
