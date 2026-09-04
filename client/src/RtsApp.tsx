import { useState, useEffect, useRef } from 'react';
import type { FormEvent, MouseEvent, WheelEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { soundFx } from './utils/audio';
import {
  TECH_TREE,
  UNIT_CONFIGS,
  BUILDING_CONFIGS
} from './rts/rtsTypes';
import type {
  RtsFaction,
  BuildingType,
  RtsGameState
} from './rts/rtsTypes';
import { RtsRenderer } from './rts/rtsRenderer';
import type { Camera } from './rts/rtsRenderer';

const SERVER_URL = import.meta.env.VITE_WS_SERVER_URL || import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

export default function RtsApp() {
  const navigate = useNavigate();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [joined, setJoined] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [roomCodeInput, setRoomCodeInput] = useState('NEXUS1');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Game State
  const [gameState, setGameState] = useState<RtsGameState | null>(null);
  const [selectedFaction, setSelectedFaction] = useState<RtsFaction>('aegis');

  // RTS Interaction State
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [placementMode, setPlacementMode] = useState<BuildingType | null>(null);
  const [ultimateTargeting, setUltimateTargeting] = useState(false);
  const [techTreeOpen, setTechTreeOpen] = useState(false);

  // Camera & Canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<RtsRenderer | null>(null);
  const cameraRef = useRef<Camera>({ x: 400, y: 600, zoom: 1.0 });
  const isDraggingCameraRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });

  // Rubber-band Selection Box
  const isBoxSelectingRef = useRef(false);
  const boxStartRef = useRef({ x: 0, y: 0 });
  const [selectionBox, setSelectionBox] = useState<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null);
  const [mouseWorldPos, setMouseWorldPos] = useState({ x: 0, y: 0 });

  // Key tracking for WASD camera panning
  const keysDownRef = useRef<Record<string, boolean>>({});

  const me = gameState?.players.find(p => p.id === socket?.id);

  // ─── SOCKET CONNECTION ───────────────────────────────────────────────────

  useEffect(() => {
    const s = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });
    setSocket(s);

    s.on('connect', () => {
      console.log('[RTS] Connecté au serveur WebSocket :', s.id);
    });

    s.on('rtsStateUpdate', (newState: RtsGameState) => {
      setGameState(newState);
      setJoined(true);
      setErrorMsg(null);
    });

    s.on('error', (err: string) => {
      setErrorMsg(err);
    });

    return () => {
      s.disconnect();
    };
  }, []);

  // Keyboard navigation for camera
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysDownRef.current[e.key.toLowerCase()] = true;
      if (e.key === 'Escape') {
        setPlacementMode(null);
        setUltimateTargeting(false);
        setTechTreeOpen(false);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysDownRef.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // ─── RENDER & ANIMATION LOOP ─────────────────────────────────────────────

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    rendererRef.current = new RtsRenderer(ctx);

    let lastTime = performance.now();
    let animationId: number;

    const loop = (currentTime: number) => {
      const dt = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      // Handle WASD camera panning
      const panSpeed = 500 * dt;
      if (keysDownRef.current['z'] || keysDownRef.current['w'] || keysDownRef.current['arrowup']) cameraRef.current.y -= panSpeed;
      if (keysDownRef.current['s'] || keysDownRef.current['arrowdown']) cameraRef.current.y += panSpeed;
      if (keysDownRef.current['q'] || keysDownRef.current['a'] || keysDownRef.current['arrowleft']) cameraRef.current.x -= panSpeed;
      if (keysDownRef.current['d'] || keysDownRef.current['arrowright']) cameraRef.current.x += panSpeed;

      // Clamp camera to map boundaries
      if (gameState) {
        cameraRef.current.x = Math.max(200, Math.min(gameState.mapWidth - 200, cameraRef.current.x));
        cameraRef.current.y = Math.max(150, Math.min(gameState.mapHeight - 150, cameraRef.current.y));
      }

      if (rendererRef.current && gameState) {
        rendererRef.current.update(dt);

        let ghost = null;
        if (placementMode) {
          ghost = {
            type: placementMode,
            x: mouseWorldPos.x,
            y: mouseWorldPos.y,
            valid: canPlaceBuildingAt(placementMode, mouseWorldPos.x, mouseWorldPos.y)
          };
        }

        rendererRef.current.render(
          canvas.width,
          canvas.height,
          cameraRef.current,
          gameState.mapWidth,
          gameState.mapHeight,
          gameState.players,
          socket?.id || '',
          gameState.resourceNodes,
          gameState.buildings,
          gameState.units,
          gameState.projectiles,
          gameState.powerLines,
          selectedUnitIds,
          selectedBuildingId,
          ghost,
          selectionBox
        );
      }

      animationId = requestAnimationFrame(loop);
    };

    animationId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [gameState, placementMode, mouseWorldPos, selectedUnitIds, selectedBuildingId, selectionBox]);

  // Window resize handler
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ─── COORDINATE CONVERSION ───────────────────────────────────────────────

  const screenToWorld = (screenX: number, screenY: number) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const canvas = canvasRef.current;
    const cam = cameraRef.current;
    const relX = (screenX - canvas.width / 2) / cam.zoom;
    const relY = (screenY - canvas.height / 2) / cam.zoom;
    return {
      x: relX + cam.x,
      y: relY + cam.y
    };
  };

  const canPlaceBuildingAt = (type: BuildingType, x: number, y: number): boolean => {
    if (!gameState || !me) return false;
    const conf = BUILDING_CONFIGS[type];
    if (!conf) return false;
    if (x < 50 || x > gameState.mapWidth - 50 || y < 50 || y > gameState.mapHeight - 50) return false;

    // Must have resources
    if (me.resources.metal < conf.cost.metal || me.resources.wood < conf.cost.wood || me.resources.coal < conf.cost.coal) {
      return false;
    }

    // Check collision with other buildings
    for (const b of gameState.buildings) {
      const dist = Math.hypot(b.x - x, b.y - y);
      if (dist < (b.width + conf.width) / 2 + 10) return false;
    }
    return true;
  };

  // ─── MOUSE & POINTER EVENTS ──────────────────────────────────────────────

  const handleMouseDown = (e: MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 1) {
      // Middle click: pan camera
      isDraggingCameraRef.current = true;
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    const worldPos = screenToWorld(e.clientX, e.clientY);

    // Left Click
    if (e.button === 0) {
      // 1. Placement Mode: Place Building
      if (placementMode) {
        if (canPlaceBuildingAt(placementMode, worldPos.x, worldPos.y)) {
          soundFx.click();
          socket?.emit('rts:build', {
            buildingType: placementMode,
            x: Math.round(worldPos.x),
            y: Math.round(worldPos.y)
          });
          setPlacementMode(null);
        } else {
          soundFx.alert();
        }
        return;
      }

      // 2. Ultimate Ability Targeting
      if (ultimateTargeting) {
        soundFx.orbitalDrop();
        socket?.emit('rts:ability', {
          targetX: Math.round(worldPos.x),
          targetY: Math.round(worldPos.y)
        });
        setUltimateTargeting(false);
        return;
      }

      // 3. Check direct click on unit
      const clickedUnit = gameState?.units.find(u => Math.hypot(u.x - worldPos.x, u.y - worldPos.y) <= u.radius + 5);
      if (clickedUnit && clickedUnit.playerId === socket?.id) {
        soundFx.click();
        setSelectedUnitIds([clickedUnit.id]);
        setSelectedBuildingId(null);
        return;
      }

      // 4. Check direct click on building
      const clickedBld = gameState?.buildings.find(b => Math.hypot(b.x - worldPos.x, b.y - worldPos.y) <= b.width / 2);
      if (clickedBld) {
        soundFx.click();
        setSelectedBuildingId(clickedBld.id);
        setSelectedUnitIds([]);
        return;
      }

      // 5. Start Rubber-band Selection Box
      isBoxSelectingRef.current = true;
      boxStartRef.current = { x: e.clientX, y: e.clientY };
      setSelectionBox({
        startX: e.clientX,
        startY: e.clientY,
        currentX: e.clientX,
        currentY: e.clientY
      });
      setSelectedBuildingId(null);
    }

    // Right Click
    else if (e.button === 2) {
      e.preventDefault();

      // If in placement mode, cancel it
      if (placementMode) {
        setPlacementMode(null);
        soundFx.click();
        return;
      }
      if (ultimateTargeting) {
        setUltimateTargeting(false);
        return;
      }

      // Give order to selected units
      if (selectedUnitIds.length > 0) {
        // Check if right-clicked on an enemy unit
        const enemyUnit = gameState?.units.find(u => u.playerId !== socket?.id && Math.hypot(u.x - worldPos.x, u.y - worldPos.y) <= u.radius + 8);
        if (enemyUnit) {
          soundFx.laser();
          socket?.emit('rts:order', {
            unitIds: selectedUnitIds,
            orderType: 'attack',
            targetId: enemyUnit.id
          });
          return;
        }

        // Check if right-clicked on an enemy building
        const enemyBld = gameState?.buildings.find(b => b.playerId !== socket?.id && Math.hypot(b.x - worldPos.x, b.y - worldPos.y) <= b.width / 2 + 5);
        if (enemyBld) {
          soundFx.laser();
          socket?.emit('rts:order', {
            unitIds: selectedUnitIds,
            orderType: 'attack',
            targetId: enemyBld.id
          });
          return;
        }

        // Check if right-clicked on a resource node (gather order)
        const resourceNode = gameState?.resourceNodes.find(n => Math.hypot(n.x - worldPos.x, n.y - worldPos.y) <= n.radius + 10);
        if (resourceNode) {
          soundFx.click();
          socket?.emit('rts:order', {
            unitIds: selectedUnitIds,
            orderType: 'gather',
            targetX: resourceNode.x,
            targetY: resourceNode.y,
            targetId: resourceNode.id
          });
          return;
        }

        // Otherwise: Move order
        soundFx.click();
        socket?.emit('rts:order', {
          unitIds: selectedUnitIds,
          orderType: 'move',
          targetX: Math.round(worldPos.x),
          targetY: Math.round(worldPos.y)
        });
      }
    }
  };

  const handleMouseMove = (e: MouseEvent<HTMLCanvasElement>) => {
    const worldPos = screenToWorld(e.clientX, e.clientY);
    setMouseWorldPos(worldPos);

    if (isDraggingCameraRef.current) {
      const dx = (e.clientX - lastMousePosRef.current.x) / cameraRef.current.zoom;
      const dy = (e.clientY - lastMousePosRef.current.y) / cameraRef.current.zoom;
      cameraRef.current.x -= dx;
      cameraRef.current.y -= dy;
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    if (isBoxSelectingRef.current) {
      setSelectionBox({
        startX: boxStartRef.current.x,
        startY: boxStartRef.current.y,
        currentX: e.clientX,
        currentY: e.clientY
      });
    }
  };

  const handleMouseUp = (e: MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 1) {
      isDraggingCameraRef.current = false;
    }

    if (isBoxSelectingRef.current) {
      isBoxSelectingRef.current = false;

      if (selectionBox && gameState) {
        const p1 = screenToWorld(selectionBox.startX, selectionBox.startY);
        const p2 = screenToWorld(selectionBox.currentX, selectionBox.currentY);
        const minX = Math.min(p1.x, p2.x);
        const maxX = Math.max(p1.x, p2.x);
        const minY = Math.min(p1.y, p2.y);
        const maxY = Math.max(p1.y, p2.y);

        // Select all friendly units inside box
        const boxed = gameState.units
          .filter(u => u.playerId === socket?.id)
          .filter(u => u.x >= minX && u.x <= maxX && u.y >= minY && u.y <= maxY)
          .map(u => u.id);

        if (boxed.length > 0) {
          soundFx.click();
          setSelectedUnitIds(boxed);
        } else if (Math.hypot(selectionBox.currentX - selectionBox.startX, selectionBox.currentY - selectionBox.startY) < 5) {
          // Single click on empty ground clears selection
          setSelectedUnitIds([]);
        }
      }
      setSelectionBox(null);
    }
  };

  const handleWheel = (e: WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    cameraRef.current.zoom = Math.max(0.5, Math.min(2.0, cameraRef.current.zoom * zoomFactor));
  };

  // ─── LOBBY ACTIONS ───────────────────────────────────────────────────────

  const handleJoin = (e: FormEvent) => {
    e.preventDefault();
    if (!socket || !usernameInput.trim() || !roomCodeInput.trim()) return;
    soundFx.click();
    socket.emit('joinGame', {
      username: usernameInput.trim(),
      roomCode: roomCodeInput.trim(),
      gameType: 'rts'
    });
  };

  const handleSelectFaction = (faction: RtsFaction) => {
    setSelectedFaction(faction);
    soundFx.click();
    socket?.emit('rts:selectFaction', { faction });
  };

  const handleStartGame = () => {
    soundFx.click();
    socket?.emit('rts:startGame');
  };

  const handleAddBot = () => {
    soundFx.click();
    socket?.emit('rts:addBot');
  };

  // ─── LOBBY VIEW ──────────────────────────────────────────────────────────

  if (!joined || gameState?.status === 'LOBBY') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
        {/* Ambient Grid Background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />

        <button
          onClick={() => navigate('/')}
          className="absolute top-6 left-6 flex items-center gap-2 px-4 py-2 bg-slate-900/80 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-700 transition"
        >
          ← Accueil
        </button>

        <div className="max-w-4xl w-full z-10 flex flex-col items-center">
          <div className="text-center mb-8">
            <span className="px-3 py-1 bg-cyan-950/80 text-cyan-400 border border-cyan-500/50 rounded-full text-xs font-semibold tracking-widest uppercase mb-3 inline-block">
              RTS Futuriste & Stratégie Énergétique
            </span>
            <h1 className="text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400 mb-2">
              CYBER-GRID : NEXUS WARS
            </h1>
            <p className="text-slate-400 text-sm max-w-lg mx-auto">
              Bâtissez votre base, connectez votre réseau électrique, générez de la science et écrasez vos ennemis avec l'une des 4 factions d'élite.
            </p>
          </div>

          {!joined ? (
            <form onSubmit={handleJoin} className="bg-slate-900/90 p-8 rounded-2xl border border-slate-800 shadow-2xl backdrop-blur-xl w-full max-w-md flex flex-col gap-4">
              {errorMsg && (
                <div className="bg-red-950/80 border border-red-500 text-red-300 px-4 py-2 rounded-lg text-sm">
                  {errorMsg}
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Nom de Commandant</label>
                <input
                  type="text"
                  required
                  value={usernameInput}
                  onChange={e => setUsernameInput(e.target.value)}
                  placeholder="ex: Général Nova"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-lg focus:outline-none focus:border-cyan-500 text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Code du Salon</label>
                <input
                  type="text"
                  required
                  value={roomCodeInput}
                  onChange={e => setRoomCodeInput(e.target.value.toUpperCase())}
                  placeholder="ex: NEXUS1"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-lg focus:outline-none focus:border-cyan-500 text-slate-100 font-mono tracking-widest"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 mt-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 font-bold rounded-lg shadow-lg shadow-cyan-950 transition"
              >
                Rejoindre le Secteur
              </button>
            </form>
          ) : (
            <div className="w-full bg-slate-900/90 p-8 rounded-2xl border border-slate-800 shadow-2xl backdrop-blur-xl flex flex-col gap-6">
              <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-200">Salon de Déploiement : <span className="text-cyan-400 font-mono">{gameState?.roomCode}</span></h2>
                  <p className="text-xs text-slate-400">Choisissez votre faction (miroirs autorisés) puis lancez la partie.</p>
                </div>
                <div className="flex gap-2">
                  {gameState && gameState.players.length < 2 && (
                    <button
                      onClick={handleAddBot}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-lg border border-slate-700 transition"
                    >
                      🤖 Ajouter IA Ennemie
                    </button>
                  )}
                  <button
                    onClick={handleStartGame}
                    className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-lg shadow-lg shadow-cyan-950 transition"
                  >
                    ⚔️ Lancer la Bataille
                  </button>
                </div>
              </div>

              {/* 4 Factions Picker */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Nanite */}
                <div
                  onClick={() => handleSelectFaction('nanite')}
                  className={`p-5 rounded-xl border cursor-pointer transition ${
                    (me?.faction === 'nanite' || selectedFaction === 'nanite')
                      ? 'bg-emerald-950/40 border-emerald-500 shadow-lg shadow-emerald-950/50'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-3xl">🤖</span>
                    <div>
                      <h3 className="font-bold text-emerald-400">L'Essaim Nanite</h3>
                      <p className="text-xs text-emerald-300/80">Nuées Bio-Mécaniques & Auto-Régénération</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mb-3">
                    Faction agressive et rapide. Unités légères peu coûteuses (-20% minerai). Vos bâtiments s'auto-régénèrent sans arrêt.
                  </p>
                  <div className="bg-emerald-950/60 p-2 rounded border border-emerald-500/30 text-xs text-emerald-200">
                    <strong className="text-emerald-400">Ultime :</strong> Reconstitution d'Urgence (50% de vos unités détruites ressuscitent sur place pendant 10s).
                  </div>
                </div>

                {/* 2. Aegis */}
                <div
                  onClick={() => handleSelectFaction('aegis')}
                  className={`p-5 rounded-xl border cursor-pointer transition ${
                    (me?.faction === 'aegis' || selectedFaction === 'aegis')
                      ? 'bg-blue-950/40 border-blue-500 shadow-lg shadow-blue-950/50'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-3xl">🛡️</span>
                    <div>
                      <h3 className="font-bold text-blue-400">L'Ordre Aegis</h3>
                      <p className="text-xs text-blue-300/80">Blindages Titanesques & Boucliers Énergétiques</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mb-3">
                    Mechas colossaux et tourelles laser ultra-résistantes. Toutes vos unités disposent de boucliers énergétiques auto-rechargeables.
                  </p>
                  <div className="bg-blue-950/60 p-2 rounded border border-blue-500/30 text-xs text-blue-200">
                    <strong className="text-blue-400">Ultime :</strong> Dôme d'Invulnérabilité (champ de force impénétrable sur une zone pendant 6s).
                  </div>
                </div>

                {/* 3. Phantom */}
                <div
                  onClick={() => handleSelectFaction('phantom')}
                  className={`p-5 rounded-xl border cursor-pointer transition ${
                    (me?.faction === 'phantom' || selectedFaction === 'phantom')
                      ? 'bg-purple-950/40 border-purple-500 shadow-lg shadow-purple-950/50'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-3xl">⚡</span>
                    <div>
                      <h3 className="font-bold text-purple-400">Le Syndicat Fantôme</h3>
                      <p className="text-xs text-purple-300/80">Infiltration Camouflée & Sabotage EMP</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mb-3">
                    Unités invisibles tant qu'elles ne tirent pas. Snipers plasma à longue portée et spécialistes du piratage énergétique.
                  </p>
                  <div className="bg-purple-950/60 p-2 rounded border border-purple-500/30 text-xs text-purple-200">
                    <strong className="text-purple-400">Ultime :</strong> Blackout EMP (éteint totalement le réseau électrique ennemi pendant 10s !).
                  </div>
                </div>

                {/* 4. Vanguard */}
                <div
                  onClick={() => handleSelectFaction('vanguard')}
                  className={`p-5 rounded-xl border cursor-pointer transition ${
                    (me?.faction === 'vanguard' || selectedFaction === 'vanguard')
                      ? 'bg-orange-950/40 border-orange-500 shadow-lg shadow-orange-950/50'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-3xl">🚀</span>
                    <div>
                      <h3 className="font-bold text-orange-400">L'Avant-Garde Stellaire</h3>
                      <p className="text-xs text-orange-300/80">Mobilité Aéroglisseurs & Frappes Orbitales</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mb-3">
                    Aéroglisseurs rapides (+25% vitesse) ignorant le relief, et panneaux solaires suralimentés (+35% d'énergie).
                  </p>
                  <div className="bg-orange-950/60 p-2 rounded border border-orange-500/30 text-xs text-orange-200">
                    <strong className="text-orange-400">Ultime :</strong> Frappe de Capsule Orbitale (largue instantanément 3 Méchas lourds où vous voulez).
                  </div>
                </div>
              </div>

              {/* Players in lobby */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <h4 className="text-xs font-semibold text-slate-400 uppercase mb-2">Commandants Connectés</h4>
                <div className="flex gap-4">
                  {gameState?.players.map(p => (
                    <div key={p.id} className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 text-sm">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                      <span className="font-semibold text-slate-200">{p.username}</span>
                      <span className="text-xs text-slate-400 uppercase">({p.faction})</span>
                      {p.isBot && <span className="text-xs bg-red-950 text-red-400 px-1.5 py-0.5 rounded border border-red-800">IA</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── IN-GAME VIEW ────────────────────────────────────────────────────────

  const selectedBuilding = gameState?.buildings.find(b => b.id === selectedBuildingId);
  const selectedUnits = gameState?.units.filter(u => selectedUnitIds.includes(u.id)) || [];

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 text-slate-100 select-none font-sans">
      {/* 1. Main RTS Canvas Viewport */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onContextMenu={e => e.preventDefault()}
        className="absolute inset-0 cursor-crosshair"
      />

      {/* 2. Top Header Resources & Power Bar */}
      <div className="absolute top-0 left-0 right-0 h-14 bg-slate-950/90 border-b border-cyan-900/40 backdrop-blur-md flex items-center justify-between px-6 z-20">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded border border-slate-700 text-xs font-semibold transition"
          >
            ← Accueil
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded uppercase tracking-wider bg-cyan-950 text-cyan-400 border border-cyan-700">
              {me?.faction}
            </span>
            <span className="font-bold text-sm text-slate-200">{me?.username}</span>
          </div>
        </div>

        {/* Resources Badges */}
        <div className="flex items-center gap-6 text-sm font-semibold">
          <div className="flex items-center gap-2 text-cyan-300 bg-cyan-950/40 px-3 py-1 rounded-md border border-cyan-800/40">
            <span>🔩</span>
            <span>{me?.resources.metal || 0}</span>
            <span className="text-xs text-cyan-500 font-normal">Métal</span>
          </div>
          <div className="flex items-center gap-2 text-emerald-300 bg-emerald-950/40 px-3 py-1 rounded-md border border-emerald-800/40">
            <span>🪵</span>
            <span>{me?.resources.wood || 0}</span>
            <span className="text-xs text-emerald-500 font-normal">Bois</span>
          </div>
          <div className="flex items-center gap-2 text-orange-300 bg-orange-950/40 px-3 py-1 rounded-md border border-orange-800/40">
            <span>🪨</span>
            <span>{me?.resources.coal || 0}</span>
            <span className="text-xs text-orange-500 font-normal">Charbon</span>
          </div>
          <div className="flex items-center gap-2 text-purple-300 bg-purple-950/40 px-3 py-1 rounded-md border border-purple-800/40">
            <span>🔬</span>
            <span>{me?.resources.science || 0}</span>
            <span className="text-xs text-purple-500 font-normal">Science</span>
          </div>
        </div>

        {/* Power Grid Balance Gauge */}
        <div className="flex items-center gap-3 bg-slate-900/80 px-4 py-1.5 rounded-lg border border-slate-800">
          <span className="text-amber-400 text-lg">⚡</span>
          <div>
            <div className="flex justify-between items-center gap-3 text-xs">
              <span className="font-bold text-slate-200">{me?.power.net && me.power.net >= 0 ? `+${me.power.net}W` : `${me?.power.net || 0}W`}</span>
              <span className="text-slate-400">{me?.power.production || 0}W / {me?.power.consumption || 0}W</span>
            </div>
            <div className="w-28 h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1">
              <div
                className={`h-full transition-all ${
                  (me?.power.efficiency || 0) >= 1.0 ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'
                }`}
                style={{ width: `${Math.round((me?.power.efficiency || 0) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* EMP Blackout Alert Warning Banner */}
      {me && me.empRemainingTicks > 0 && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-red-950/90 border border-red-500 text-red-200 px-6 py-2 rounded-full font-bold text-sm shadow-xl flex items-center gap-3 animate-pulse z-20">
          <span>⚡ ALERTE : BLACKOUT EMP EN COURS ! TOURELLES & USINES HORS-TENSION ({Math.ceil(me.empRemainingTicks / 20)}s)</span>
        </div>
      )}

      {/* 3. Bottom Tactical Cyber HUD */}
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-slate-950/95 border-t border-cyan-900/40 backdrop-blur-xl flex items-stretch p-3 gap-3 z-20">
        {/* Left: Selected Unit(s) or Building Info */}
        <div className="w-80 bg-slate-900/80 rounded-xl border border-slate-800 p-3 flex flex-col justify-between">
          {selectedBuilding ? (
            <div>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-cyan-300 text-sm">{BUILDING_CONFIGS[selectedBuilding.type]?.name}</h3>
                  <p className="text-xs text-slate-400">
                    {selectedBuilding.isPowered ? '⚡ Alimenté' : '⚠️ Hors-Tension / Sous-Alimenté'}
                  </p>
                </div>
                <span className="text-xs px-2 py-0.5 bg-slate-800 rounded font-mono">
                  {selectedBuilding.hp} / {selectedBuilding.maxHp} PV
                </span>
              </div>

              {/* Action buttons on building */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {selectedBuilding.type === 'nexus' && (
                  <button
                    onClick={() => socket?.emit('rts:produce', { buildingId: selectedBuilding.id, unitType: 'harvester' })}
                    disabled={!me || me.resources.metal < 50}
                    className="px-2.5 py-1.5 bg-cyan-950 hover:bg-cyan-900 disabled:opacity-40 text-cyan-300 text-xs rounded border border-cyan-700 font-semibold"
                  >
                    🚜 Moissonneur (50🔩)
                  </button>
                )}

                {selectedBuilding.type === 'barracks' && (
                  <>
                    <button
                      onClick={() => socket?.emit('rts:produce', { buildingId: selectedBuilding.id, unitType: 'scout' })}
                      disabled={!me || me.resources.metal < 70}
                      className="px-2 py-1.5 bg-cyan-950 hover:bg-cyan-900 disabled:opacity-40 text-cyan-300 text-xs rounded border border-cyan-700 font-semibold"
                    >
                      ⚡ Éclaireur (70🔩)
                    </button>
                    <button
                      onClick={() => socket?.emit('rts:produce', { buildingId: selectedBuilding.id, unitType: 'assault' })}
                      disabled={!me || me.resources.metal < 110}
                      className="px-2 py-1.5 bg-cyan-950 hover:bg-cyan-900 disabled:opacity-40 text-cyan-300 text-xs rounded border border-cyan-700 font-semibold"
                    >
                      🛡️ Assaut (110🔩 20🪵)
                    </button>
                  </>
                )}

                {selectedBuilding.type === 'factory' && (
                  <>
                    <button
                      onClick={() => socket?.emit('rts:produce', { buildingId: selectedBuilding.id, unitType: 'heavy_mecha' })}
                      disabled={!me || me.resources.metal < 240}
                      className="px-2 py-1 bg-cyan-950 hover:bg-cyan-900 disabled:opacity-40 text-cyan-300 text-xs rounded border border-cyan-700 font-semibold"
                    >
                      🤖 Mecha Lourd (240🔩 50🪨)
                    </button>
                    <button
                      onClick={() => socket?.emit('rts:produce', { buildingId: selectedBuilding.id, unitType: 'hover_tank' })}
                      disabled={!me || me.resources.metal < 200}
                      className="px-2 py-1 bg-cyan-950 hover:bg-cyan-900 disabled:opacity-40 text-cyan-300 text-xs rounded border border-cyan-700 font-semibold"
                    >
                      🛸 Char Hover (200🔩 30🪵)
                    </button>
                  </>
                )}

                {selectedBuilding.type === 'thermal_plant' && !selectedBuilding.isUpgraded && me?.tech.researched.includes('advanced_mining') && (
                  <button
                    onClick={() => socket?.emit('rts:upgrade', { buildingId: selectedBuilding.id })}
                    disabled={!me || me.resources.metal < 100}
                    className="px-2.5 py-1.5 bg-orange-950 hover:bg-orange-900 text-orange-300 text-xs rounded border border-orange-600 font-bold"
                  >
                    🔥 Convertir au Charbon (+180W) (100🔩)
                  </button>
                )}
              </div>

              {/* Build Queue indicator */}
              {selectedBuilding.queue.length > 0 && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>En production ({selectedBuilding.queue.length})</span>
                    <span>{Math.round((selectedBuilding.queue[0].progress / selectedBuilding.queue[0].totalTicks) * 100)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-500"
                      style={{ width: `${(selectedBuilding.queue[0].progress / selectedBuilding.queue[0].totalTicks) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : selectedUnits.length > 0 ? (
            <div>
              <h3 className="font-bold text-slate-200 text-sm mb-1">
                {selectedUnits.length === 1 ? UNIT_CONFIGS[selectedUnits[0].type]?.name : `${selectedUnits.length} Unités sélectionnées`}
              </h3>
              {selectedUnits.length === 1 && (
                <div className="space-y-1 text-xs text-slate-400">
                  <p>PV : {selectedUnits[0].hp} / {selectedUnits[0].maxHp}</p>
                  {selectedUnits[0].maxShield > 0 && <p>Bouclier : {selectedUnits[0].shield} / {selectedUnits[0].maxShield}</p>}
                  <p>Dégâts : {selectedUnits[0].damage} • Portée : {selectedUnits[0].attackRange}</p>
                  {selectedUnits[0].type === 'harvester' && (
                    <p className="text-cyan-300">Cargaison : {selectedUnits[0].cargoAmount} / {selectedUnits[0].maxCargo} ({selectedUnits[0].cargoType || 'vide'})</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 text-xs text-center">
              <span>Aucune unité ni bâtiment sélectionné.</span>
              <span className="mt-1">Faites un clic ou glissez un rectangle pour sélectionner vos unités.</span>
            </div>
          )}
        </div>

        {/* Center: Command Grid & Build Bar */}
        <div className="flex-1 bg-slate-900/80 rounded-xl border border-slate-800 p-3 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Infrastructures & Énergie</span>
              <button
                onClick={() => setTechTreeOpen(true)}
                className="px-3 py-1 bg-purple-950 hover:bg-purple-900 text-purple-300 rounded border border-purple-700 text-xs font-bold transition flex items-center gap-1.5"
              >
                <span>🔬</span> Arbre de Science
              </button>
            </div>

            <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
              {/* Solar Panel */}
              <button
                onClick={() => setPlacementMode('solar_panel')}
                className={`p-2 rounded-lg border text-left flex flex-col justify-between transition ${
                  placementMode === 'solar_panel'
                    ? 'bg-cyan-950 border-cyan-400 shadow-lg'
                    : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="text-lg">☀️</div>
                <div className="text-xs font-bold text-slate-200">Solaire</div>
                <div className="text-[10px] text-cyan-400 font-mono">80🔩 • +20W</div>
              </button>

              {/* Wind Turbine */}
              <button
                onClick={() => setPlacementMode('wind_turbine')}
                className={`p-2 rounded-lg border text-left flex flex-col justify-between transition ${
                  placementMode === 'wind_turbine'
                    ? 'bg-cyan-950 border-cyan-400 shadow-lg'
                    : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="text-lg">💨</div>
                <div className="text-xs font-bold text-slate-200">Éolienne</div>
                <div className="text-[10px] text-cyan-400 font-mono">110🔩 • +25W</div>
              </button>

              {/* Thermal Plant */}
              <button
                onClick={() => setPlacementMode('thermal_plant')}
                className={`p-2 rounded-lg border text-left flex flex-col justify-between transition ${
                  placementMode === 'thermal_plant'
                    ? 'bg-orange-950 border-orange-400 shadow-lg'
                    : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="text-lg">🔥</div>
                <div className="text-xs font-bold text-slate-200">Centrale</div>
                <div className="text-[10px] text-orange-400 font-mono">150🔩 • +60W</div>
              </button>

              {/* Pylon */}
              <button
                onClick={() => setPlacementMode('pylon')}
                className={`p-2 rounded-lg border text-left flex flex-col justify-between transition ${
                  placementMode === 'pylon'
                    ? 'bg-cyan-950 border-cyan-400 shadow-lg'
                    : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="text-lg">⚡</div>
                <div className="text-xs font-bold text-slate-200">Pylône</div>
                <div className="text-[10px] text-cyan-400 font-mono">35🔩 • Relais</div>
              </button>

              {/* Barracks */}
              <button
                onClick={() => setPlacementMode('barracks')}
                className={`p-2 rounded-lg border text-left flex flex-col justify-between transition ${
                  placementMode === 'barracks'
                    ? 'bg-cyan-950 border-cyan-400 shadow-lg'
                    : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="text-lg">🛡️</div>
                <div className="text-xs font-bold text-slate-200">Caserne</div>
                <div className="text-[10px] text-cyan-400 font-mono">130🔩 20🪵</div>
              </button>

              {/* Factory */}
              <button
                onClick={() => setPlacementMode('factory')}
                disabled={!me?.tech.researched.includes('heavy_vehicles')}
                className={`p-2 rounded-lg border text-left flex flex-col justify-between transition disabled:opacity-40 ${
                  placementMode === 'factory'
                    ? 'bg-cyan-950 border-cyan-400 shadow-lg'
                    : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="text-lg">🏭</div>
                <div className="text-xs font-bold text-slate-200">Usine</div>
                <div className="text-[10px] text-cyan-400 font-mono">230🔩 40🪵</div>
              </button>

              {/* Science Lab */}
              <button
                onClick={() => setPlacementMode('science_lab')}
                className={`p-2 rounded-lg border text-left flex flex-col justify-between transition ${
                  placementMode === 'science_lab'
                    ? 'bg-purple-950 border-purple-400 shadow-lg'
                    : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="text-lg">🔬</div>
                <div className="text-xs font-bold text-slate-200">Labo</div>
                <div className="text-[10px] text-purple-400 font-mono">180🔩 • +1/s</div>
              </button>

              {/* Plasma Turret */}
              <button
                onClick={() => setPlacementMode('plasma_turret')}
                disabled={!me?.tech.researched.includes('plasma_turrets')}
                className={`p-2 rounded-lg border text-left flex flex-col justify-between transition disabled:opacity-40 ${
                  placementMode === 'plasma_turret'
                    ? 'bg-cyan-950 border-cyan-400 shadow-lg'
                    : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="text-lg">🎯</div>
                <div className="text-xs font-bold text-slate-200">Tourelle</div>
                <div className="text-[10px] text-cyan-400 font-mono">140🔩 10🪵</div>
              </button>
            </div>
          </div>

          {/* Commander Ultimate Ability Button */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setUltimateTargeting(!ultimateTargeting)}
                disabled={!me?.tech.researched.includes('ultimate_protocol') || (me?.ultimateCooldown || 0) > 0}
                className={`px-4 py-2 rounded-lg font-bold text-xs transition flex items-center gap-2 ${
                  ultimateTargeting
                    ? 'bg-amber-500 text-slate-950 animate-pulse'
                    : 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white disabled:opacity-40'
                }`}
              >
                <span>🌟</span>
                <span>
                  {me?.faction === 'nanite' && "Reconstitution d'Urgence"}
                  {me?.faction === 'aegis' && "Dôme d'Invulnérabilité"}
                  {me?.faction === 'phantom' && "Blackout EMP"}
                  {me?.faction === 'vanguard' && "Capsule Orbitale"}
                </span>
                {me && me.ultimateCooldown > 0 && (
                  <span className="font-mono">({Math.ceil(me.ultimateCooldown / 20)}s)</span>
                )}
              </button>
              {ultimateTargeting && (
                <span className="text-xs text-amber-300 animate-pulse">
                  Cliquez sur le champ de bataille pour déclencher l'ultime !
                </span>
              )}
            </div>

            <div className="text-xs text-slate-500">
              Clic gauche : Sélection / Placement • Clic droit : Ordre
            </div>
          </div>
        </div>

        {/* Right: Radar Minimap */}
        <div className="w-56 bg-slate-950 rounded-xl border border-slate-800 p-2 flex flex-col items-center justify-center relative overflow-hidden">
          <div className="w-full h-full relative bg-slate-900/60 rounded border border-slate-800">
            {/* Live Units blips on Minimap */}
            {gameState?.units.map(u => (
              <div
                key={u.id}
                className="absolute w-1.5 h-1.5 rounded-full -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: `${(u.x / gameState.mapWidth) * 100}%`,
                  top: `${(u.y / gameState.mapHeight) * 100}%`,
                  backgroundColor: u.playerId === socket?.id ? '#10b981' : '#ef4444'
                }}
              />
            ))}

            {/* Buildings on Minimap */}
            {gameState?.buildings.map(b => (
              <div
                key={b.id}
                className="absolute w-2.5 h-2.5 rounded-sm -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: `${(b.x / gameState.mapWidth) * 100}%`,
                  top: `${(b.y / gameState.mapHeight) * 100}%`,
                  backgroundColor: b.playerId === socket?.id ? '#38bdf8' : '#dc2626'
                }}
              />
            ))}

            {/* Camera Viewport Indicator */}
            {gameState && (
              <div
                className="absolute border border-cyan-400/80 pointer-events-none -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: `${(cameraRef.current.x / gameState.mapWidth) * 100}%`,
                  top: `${(cameraRef.current.y / gameState.mapHeight) * 100}%`,
                  width: `${((window.innerWidth / cameraRef.current.zoom) / gameState.mapWidth) * 100}%`,
                  height: `${((window.innerHeight / cameraRef.current.zoom) / gameState.mapHeight) * 100}%`
                }}
              />
            )}
          </div>
          <span className="text-[10px] text-slate-500 font-mono tracking-widest mt-1 uppercase">RADAR SECTEUR</span>
        </div>
      </div>

      {/* 4. Science Tech Tree Modal */}
      {techTreeOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-6 z-50">
          <div className="bg-slate-900 border border-purple-500/50 rounded-2xl max-w-2xl w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🔬</span>
                <h2 className="text-xl font-bold text-purple-300">Arbre des Technologies & Sciences</h2>
              </div>
              <button
                onClick={() => setTechTreeOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-6">
              Les Laboratoires de Recherche alimentés produisent passivement de la science (+1 🔬 / s par labo).
            </p>

            <div className="space-y-3">
              {Object.values(TECH_TREE).map(tech => {
                const isResearched = me?.tech.researched.includes(tech.id);
                const isResearching = me?.tech.currentlyResearching === tech.id;
                const canResearch = !isResearched && !isResearching && tech.prerequisites.every(p => me?.tech.researched.includes(p));

                return (
                  <div
                    key={tech.id}
                    className={`p-4 rounded-xl border flex items-center justify-between ${
                      isResearched
                        ? 'bg-purple-950/30 border-purple-500/60'
                        : isResearching
                        ? 'bg-cyan-950/30 border-cyan-500 animate-pulse'
                        : canResearch
                        ? 'bg-slate-950 border-slate-700'
                        : 'bg-slate-950/40 border-slate-800 opacity-50'
                    }`}
                  >
                    <div>
                      <h4 className="font-bold text-sm text-slate-200 flex items-center gap-2">
                        {tech.name}
                        {isResearched && <span className="text-xs text-emerald-400">✓ Recherché</span>}
                        {isResearching && <span className="text-xs text-cyan-400">⚡ En cours...</span>}
                      </h4>
                      <p className="text-xs text-slate-400 mt-1">{tech.description}</p>
                    </div>

                    <div>
                      {isResearched ? (
                        <span className="text-xs px-3 py-1 bg-purple-950 text-purple-300 border border-purple-800 rounded font-semibold">
                          Acquis
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            soundFx.click();
                            socket?.emit('rts:research', { techId: tech.id });
                          }}
                          disabled={!canResearch || (me?.resources.science || 0) < tech.scienceCost}
                          className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-30 text-white rounded-lg text-xs font-bold transition"
                        >
                          Rechercher ({tech.scienceCost} 🔬)
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 5. Victory / Defeat Modal */}
      {gameState?.status === 'FINISHED' && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-lg flex items-center justify-center p-6 z-50">
          <div className="bg-slate-900 border border-cyan-500 p-8 rounded-2xl max-w-md w-full text-center shadow-2xl">
            <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-2">
              FIN DE LA BATAILLE
            </h2>
            <p className="text-slate-300 font-semibold mb-6">
              {gameState.winner?.id === socket?.id ? '🎉 VICTOIRE ÉCLATANTE ! Le secteur est sous votre contrôle.' : `Vainqueur : ${gameState.winner?.username}`}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => socket?.emit('rts:resetGame')}
                className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 text-white font-bold rounded-lg transition"
              >
                Rejouer
              </button>
              <button
                onClick={() => navigate('/')}
                className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg transition"
              >
                Quitter vers l'Accueil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
