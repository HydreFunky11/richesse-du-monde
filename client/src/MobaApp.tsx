import { useState, useEffect, useRef, useCallback } from 'react';
import type { FormEvent, MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import type {
  MobaGameState,
  ChampionId,
  SpellKey,
  MobaTeam
} from './moba/mobaTypes';
import { CHAMPIONS, MOBA_ITEMS } from './moba/mobaConstants';
import { renderMoba } from './moba/mobaRenderer';
import type { Camera, ClickFx } from './moba/mobaRenderer';

const SERVER_URL = import.meta.env.VITE_WS_SERVER_URL || import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

type ControlScheme = 'LOL_AZERTY' | 'LOL_QWERTY' | 'WASD_1234' | 'ZQSD_1234';

export default function MobaApp() {
  const navigate = useNavigate();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [joined, setJoined] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [roomCodeInput, setRoomCodeInput] = useState('ARENA1');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // State
  const [gameState, setGameState] = useState<MobaGameState | null>(null);
  const [selectedChampion, setSelectedChampion] = useState<ChampionId>('ignis');
  const [controlScheme, setControlScheme] = useState<ControlScheme>('LOL_AZERTY');
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [shopTab, setShopTab] = useState<'buy' | 'sell'>('buy');
  const [isScoreboardOpen, setIsScoreboardOpen] = useState(false);
  const [aimingSpell, setAimingSpell] = useState<SpellKey | null>(null);
  const [hoveredSpell, setHoveredSpell] = useState<SpellKey | null>(null);
  const [hoveredPassive, setHoveredPassive] = useState(false);

  // Canvas & Interaction
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cameraRef = useRef<Camera>({ x: 180, y: 700 });
  const keysDownRef = useRef<Record<string, boolean>>({});
  const clickFxListRef = useRef<ClickFx[]>([]);
  const mouseScreenPosRef = useRef({ x: 0, y: 0 });
  const mouseWorldPosRef = useRef({ x: 0, y: 0 });

  const me = gameState?.players.find(p => p.id === socket?.id);

  // ─── AUDIO SYNTHESIS ──────────────────────────────────────────────────────
  const playSfx = useCallback((type: 'hit' | 'kill' | 'levelup' | 'flash' | 'buy' | 'sell') => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'hit') {
        osc.frequency.setValueAtTime(180, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.08);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      } else if (type === 'kill') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } else if (type === 'levelup') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.setValueAtTime(554, ctx.currentTime + 0.1);
        osc.frequency.setValueAtTime(659, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      } else if (type === 'flash') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else if (type === 'buy') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523, ctx.currentTime);
        osc.frequency.setValueAtTime(659, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      } else if (type === 'sell') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(659, ctx.currentTime);
        osc.frequency.setValueAtTime(523, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      }
    } catch {
      // AudioContext unavailable or blocked
    }
  }, []);

  // ─── SOCKET CONNECTION ─────────────────────────────────────────────────────
  useEffect(() => {
    const s = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });
    setSocket(s);

    s.on('connect', () => {
      console.log('[MOBA] Connecté au serveur Socket.IO :', s.id);
    });

    s.on('mobaStateUpdate', (newState: MobaGameState) => {
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

  // Center camera on self when spawning or game begins
  useEffect(() => {
    if (me) {
      cameraRef.current.x = me.x;
      cameraRef.current.y = me.y;
    }
  }, [gameState?.status]);

  // ─── KEYBOARD & CONTROLS BINDINGS ──────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysDownRef.current[e.key.toLowerCase()] = true;

      if (e.key === 'p' || e.key === 'P') {
        setIsShopOpen(prev => !prev);
        return;
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        setIsScoreboardOpen(true);
        return;
      }
      if (e.key === 'Escape') {
        setIsShopOpen(false);
        setIsScoreboardOpen(false);
        setAimingSpell(null);
        return;
      }
      if (e.key === ' ') {
        // Space: center camera on local player
        if (me) {
          cameraRef.current.x = me.x;
          cameraRef.current.y = me.y;
        }
        return;
      }

      // Recall
      if (e.key === 'b' || e.key === 'B') {
        socket?.emit('moba:recall');
        return;
      }

      // Summoner Spells D and F
      if (e.key === 'd' || e.key === 'D') {
        socket?.emit('moba:summonerSpell', {
          key: 'd',
          mouseX: mouseWorldPosRef.current.x,
          mouseY: mouseWorldPosRef.current.y
        });
        playSfx('flash');
        return;
      }
      if (e.key === 'f' || e.key === 'F') {
        socket?.emit('moba:summonerSpell', {
          key: 'f',
          mouseX: mouseWorldPosRef.current.x,
          mouseY: mouseWorldPosRef.current.y
        });
        return;
      }

      // Spells mapping based on Control Scheme
      let castKey: SpellKey | null = null;
      if (controlScheme === 'LOL_AZERTY') {
        if (e.key === 'a' || e.key === 'A') castKey = 'q';
        else if (e.key === 'z' || e.key === 'Z') castKey = 'w';
        else if (e.key === 'e' || e.key === 'E') castKey = 'e';
        else if (e.key === 'r' || e.key === 'R') castKey = 'r';
      } else if (controlScheme === 'LOL_QWERTY') {
        if (e.key === 'q' || e.key === 'Q') castKey = 'q';
        else if (e.key === 'w' || e.key === 'W') castKey = 'w';
        else if (e.key === 'e' || e.key === 'E') castKey = 'e';
        else if (e.key === 'r' || e.key === 'R') castKey = 'r';
      } else if (controlScheme === 'WASD_1234' || controlScheme === 'ZQSD_1234') {
        if (e.key === '1' || e.key === '&') castKey = 'q';
        else if (e.key === '2' || e.key === 'é') castKey = 'w';
        else if (e.key === '3' || e.key === '"') castKey = 'e';
        else if (e.key === '4' || e.key === '\'') castKey = 'r';
      }

      if (castKey) {
        socket?.emit('moba:castSpell', {
          spellKey: castKey,
          mouseX: mouseWorldPosRef.current.x,
          mouseY: mouseWorldPosRef.current.y
        });
        playSfx('hit');
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysDownRef.current[e.key.toLowerCase()] = false;
      if (e.key === 'Tab') {
        setIsScoreboardOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [controlScheme, socket, me, playSfx]);

  // Direct ZQSD / WASD Movement Loop
  useEffect(() => {
    if (!socket || gameState?.status !== 'PLAYING') return;

    const interval = setInterval(() => {
      let vx = 0;
      let vy = 0;

      if (controlScheme === 'ZQSD_1234') {
        if (keysDownRef.current['z']) vy -= 1;
        if (keysDownRef.current['s']) vy += 1;
        if (keysDownRef.current['q']) vx -= 1;
        if (keysDownRef.current['d']) vx += 1;
      } else if (controlScheme === 'WASD_1234') {
        if (keysDownRef.current['w']) vy -= 1;
        if (keysDownRef.current['s']) vy += 1;
        if (keysDownRef.current['a']) vx -= 1;
        if (keysDownRef.current['d']) vx += 1;
      }

      if (vx !== 0 || vy !== 0) {
        socket.emit('moba:inputVelocity', { vx, vy });
      }
    }, 50);

    return () => clearInterval(interval);
  }, [controlScheme, socket, gameState?.status]);

  // ─── RENDER LOOP ───────────────────────────────────────────────────────────
  useEffect(() => {
    let animId: number;

    const render = () => {
      const canvas = canvasRef.current;
      if (canvas && gameState) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Keep canvas resolution synced to element size
          if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
            canvas.width = canvas.clientWidth;
            canvas.height = canvas.clientHeight;
          }

          // Camera smooth follow local player
          if (me) {
            cameraRef.current.x += (me.x - cameraRef.current.x) * 0.12;
            cameraRef.current.y += (me.y - cameraRef.current.y) * 0.12;
          }

          renderMoba(
            ctx,
            canvas.width,
            canvas.height,
            gameState,
            socket?.id || '',
            cameraRef.current,
            mouseWorldPosRef.current,
            aimingSpell,
            clickFxListRef.current
          );
        }
      }
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [gameState, me, socket?.id, aimingSpell]);

  // Mouse coordinate tracker
  const handleMouseMove = (e: MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    mouseScreenPosRef.current = { x: sx, y: sy };

    // Convert screen coordinates to world coordinates
    const wx = sx - canvas.width / 2 + cameraRef.current.x;
    const wy = sy - canvas.height / 2 + cameraRef.current.y;
    mouseWorldPosRef.current = { x: wx, y: wy };
  };

  // Mouse Click Handler (Right Click for Move / Attack, Left Click for Aim)
  const handleMouseDown = (e: MouseEvent<HTMLCanvasElement>) => {
    if (!socket || !gameState || gameState.status !== 'PLAYING') return;
    const wx = mouseWorldPosRef.current.x;
    const wy = mouseWorldPosRef.current.y;

    if (e.button === 2) {
      // RIGHT CLICK: Move or Attack!
      e.preventDefault();

      // Check if clicked on an enemy target
      const target = findEntityAtPos(wx, wy);

      if (target && target.team !== me?.team) {
        const targetId = target.id || (target.team === 'blue' ? 'nexus_blue' : 'nexus_red');
        socket.emit('moba:attack', { targetId });
        clickFxListRef.current.push({
          x: target.x,
          y: target.y,
          type: 'attack',
          life: 0,
          maxLife: 15
        });
      } else {
        socket.emit('moba:move', { targetX: wx, targetY: wy });
        clickFxListRef.current.push({
          x: wx,
          y: wy,
          type: 'move',
          life: 0,
          maxLife: 15
        });
      }
    } else if (e.button === 0) {
      // LEFT CLICK: If aiming a spell, cast it!
      if (aimingSpell) {
        socket.emit('moba:castSpell', {
          spellKey: aimingSpell,
          mouseX: wx,
          mouseY: wy
        });
        setAimingSpell(null);
        playSfx('hit');
      }
    }
  };

  // Improved entity detection for auto-attacks
  const findEntityAtPos = (wx: number, wy: number): any => {
    if (!gameState) return null;
    // 1. Enemy champions (priority)
    for (const p of gameState.players) {
      if (p.isAlive && Math.hypot(p.x - wx, p.y - wy) <= p.radius + 15) return p;
    }
    // 2. Enemy minions
    for (const m of gameState.minions) {
      if (m.hp > 0 && Math.hypot(m.x - wx, m.y - wy) <= m.radius + 18) return m;
    }
    // 3. Enemy turrets
    for (const t of gameState.turrets) {
      if (t.hp > 0 && Math.hypot(t.x - wx, t.y - wy) <= t.radius + 20) return t;
    }
    // 4. Enemy nexus
    for (const n of gameState.nexuses) {
      if (n.hp > 0 && Math.hypot(n.x - wx, n.y - wy) <= n.radius + 25) return n;
    }
    // 5. Jungle monsters & bosses
    for (const mon of gameState.jungleMonsters) {
      if (mon.isAlive && Math.hypot(mon.x - wx, mon.y - wy) <= mon.radius + 18) return mon;
    }
    return null;
  };

  // ─── LOBBY ACTIONS ─────────────────────────────────────────────────────────
  const handleJoin = (e: FormEvent) => {
    e.preventDefault();
    if (!usernameInput.trim()) return;
    socket?.emit('joinGame', {
      username: usernameInput.trim(),
      roomCode: roomCodeInput.trim(),
      gameType: 'moba'
    });
  };

  const handleSelectChampion = (champId: ChampionId) => {
    setSelectedChampion(champId);
    socket?.emit('moba:selectChampion', { championId: champId });
  };

  const handleSwitchTeam = () => {
    socket?.emit('moba:switchTeam');
  };

  const handleAddBot = (team?: MobaTeam) => {
    socket?.emit('moba:addBot', { team });
  };

  const handleStartGame = () => {
    socket?.emit('moba:startGame');
  };

  const handleUpgradeSpell = (spellKey: SpellKey) => {
    socket?.emit('moba:upgradeSpell', { spellKey });
    playSfx('levelup');
  };

  const handleBuyItem = (itemId: string) => {
    socket?.emit('moba:buyItem', { itemId });
    playSfx('buy');
  };

  const handleSellItem = (itemIndex: number) => {
    socket?.emit('moba:sellItem', { itemIndex });
    playSfx('sell');
  };

  const handleResetGame = () => {
    socket?.emit('moba:resetGame');
  };

  // Current champ def
  const curChampDef = me ? CHAMPIONS[me.championId] : CHAMPIONS[selectedChampion];

  // Key labels based on control scheme
  const getKeyLabel = (spell: SpellKey): string => {
    if (controlScheme === 'LOL_AZERTY') {
      return spell === 'q' ? 'A' : spell === 'w' ? 'Z' : spell === 'e' ? 'E' : 'R';
    } else if (controlScheme === 'LOL_QWERTY') {
      return spell.toUpperCase();
    } else {
      return spell === 'q' ? '1' : spell === 'w' ? '2' : spell === 'e' ? '3' : '4';
    }
  };

  // ───────────────────────────────────────────────────────────────────────────
  // VIEW: JOIN ROOM
  // ───────────────────────────────────────────────────────────────────────────
  if (!joined || !gameState) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
        <button
          onClick={() => navigate('/')}
          className="absolute top-6 left-6 text-slate-400 hover:text-white flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 border border-slate-800 transition"
        >
          ← Accueil
        </button>

        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-6">
            <div className="inline-flex p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-3xl mb-3">
              ⚔️
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white">NEXUS CLASH</h1>
            <p className="text-sm text-slate-400 mt-1">L'Arène MOBA Tactique en Temps Réel</p>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 bg-red-950/80 border border-red-800 rounded-xl text-red-200 text-sm">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Pseudo du Joueur
              </label>
              <input
                type="text"
                value={usernameInput}
                onChange={e => setUsernameInput(e.target.value)}
                placeholder="Ex: Faker, Caps..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Code Salon
              </label>
              <input
                type="text"
                value={roomCodeInput}
                onChange={e => setRoomCodeInput(e.target.value.toUpperCase())}
                placeholder="ARENA1"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white uppercase focus:outline-none focus:border-amber-500 transition font-mono tracking-wider"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-bold rounded-xl shadow-lg shadow-orange-500/20 transition transform active:scale-98"
            >
              Rejoindre l'Arène
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // VIEW: LOBBY & CHAMPION SELECT
  // ───────────────────────────────────────────────────────────────────────────
  if (gameState.status === 'LOBBY') {
    const blueTeam = gameState.players.filter(p => p.team === 'blue');
    const redTeam = gameState.players.filter(p => p.team === 'red');
    const champ = CHAMPIONS[selectedChampion];

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col p-6">
        {/* Header */}
        <header className="flex justify-between items-center pb-4 border-b border-slate-800">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="text-slate-400 hover:text-white px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-sm transition"
            >
              ← Accueil
            </button>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <span>⚔️ SÉLECTION DES CHAMPIONS</span>
              <span className="text-xs px-2.5 py-1 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 font-mono">
                SALON: {gameState.roomCode}
              </span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSwitchTeam}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl text-sm font-semibold transition"
            >
              🔄 Changer d'Équipe ({me?.team.toUpperCase()})
            </button>
            <button
              onClick={() => handleAddBot()}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-sm font-semibold text-slate-200 transition"
            >
              🤖 + Bot Aléatoire
            </button>
            <button
              onClick={handleStartGame}
              className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition"
            >
              DÉMARRER LA PARTIE ⚔️
            </button>
          </div>
        </header>

        {/* Main Selection Area */}
        <div className="flex-1 grid grid-cols-12 gap-6 mt-6">
          {/* Left: Blue Team Roster */}
          <div className="col-span-3 bg-slate-900/60 border border-blue-900/40 rounded-2xl p-4 flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-blue-900/40 mb-3">
              <span className="font-bold text-blue-400 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></span>
                ÉQUIPE BLEUE ({blueTeam.length})
              </span>
              <button
                onClick={() => handleAddBot('blue')}
                className="text-xs text-blue-400 hover:underline"
              >
                + Bot Bleu
              </button>
            </div>
            <div className="space-y-2.5 flex-1 overflow-y-auto">
              {blueTeam.map(p => {
                const c = CHAMPIONS[p.championId];
                return (
                  <div
                    key={p.id}
                    className={`p-3 rounded-xl border flex items-center gap-3 ${
                      p.id === socket?.id
                        ? 'bg-blue-950/80 border-blue-500 shadow-md'
                        : 'bg-slate-950/70 border-slate-800'
                    }`}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg text-white"
                      style={{ backgroundColor: c.color }}
                    >
                      {c.passive.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-white truncate flex items-center gap-1.5">
                        {p.username}
                        {p.id === socket?.id && <span className="text-[10px] text-amber-400 font-bold">(VOUS)</span>}
                      </div>
                      <div className="text-xs text-slate-400">
                        {c.name} • <span className="text-blue-400">{c.role}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Center: Champion Gallery & Preview */}
          <div className="col-span-6 flex flex-col gap-4">
            {/* 10 Champion Grid Cards */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                Choisissez votre Champion (10 Disponibles)
              </h2>
              <div className="grid grid-cols-5 gap-3">
                {Object.values(CHAMPIONS).map(c => {
                  const isSelected = selectedChampion === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => handleSelectChampion(c.id)}
                      className={`p-3 rounded-xl border text-left transition flex flex-col items-center gap-2 group ${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-500 shadow-lg scale-102 ring-2 ring-amber-500/30'
                          : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                      }`}
                    >
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-inner group-hover:scale-105 transition"
                        style={{ backgroundColor: c.color }}
                      >
                        {c.passive.icon}
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-xs text-white truncate">{c.name}</div>
                        <div className="text-[10px] text-slate-400">{c.role}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Champion Details & Spells */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex-1 flex flex-col">
              <div className="flex items-start justify-between pb-4 border-b border-slate-800 mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl text-white shadow-lg"
                    style={{ backgroundColor: champ.color }}
                  >
                    {champ.passive.icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      {champ.name}
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-amber-400 border border-amber-400/20">
                        {champ.role}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400">{champ.title}</p>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3 text-center text-xs">
                  <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                    <span className="text-emerald-400 font-bold block">{champ.baseStats.hp}</span>
                    <span className="text-[10px] text-slate-500 uppercase">PV</span>
                  </div>
                  <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                    <span className="text-blue-400 font-bold block">{champ.baseStats.mana}</span>
                    <span className="text-[10px] text-slate-500 uppercase">Mana</span>
                  </div>
                  <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                    <span className="text-amber-400 font-bold block">{champ.baseStats.attackDamage}</span>
                    <span className="text-[10px] text-slate-500 uppercase">Dégâts</span>
                  </div>
                  <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                    <span className="text-purple-400 font-bold block">{champ.baseStats.abilityPower}</span>
                    <span className="text-[10px] text-slate-500 uppercase">AP</span>
                  </div>
                </div>
              </div>

              {/* Passive */}
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-4">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs mb-1">
                  <span>{champ.passive.icon}</span>
                  <span>Passif : {champ.passive.name}</span>
                </div>
                <p className="text-xs text-slate-300">{champ.passive.description}</p>
              </div>

              {/* 4 Spells (Q, W, E, R) */}
              <div className="grid grid-cols-4 gap-2.5">
                {(['q', 'w', 'e', 'r'] as SpellKey[]).map(key => {
                  const sp = champ.spells[key];
                  return (
                    <div key={key} className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-black uppercase text-amber-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">
                          {key.toUpperCase()}
                        </span>
                        <span className="text-sm">{sp.icon}</span>
                      </div>
                      <div className="font-bold text-xs text-white truncate mb-1">{sp.name}</div>
                      <p className="text-[11px] text-slate-400 line-clamp-3 mb-2 flex-1">{sp.description}</p>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1.5 border-t border-slate-800/60">
                        <span>💧 {sp.manaCost}m</span>
                        <span>⏱️ {sp.cooldown / 20}s</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: Red Team Roster */}
          <div className="col-span-3 bg-slate-900/60 border border-red-900/40 rounded-2xl p-4 flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-red-900/40 mb-3">
              <span className="font-bold text-red-400 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></span>
                ÉQUIPE ROUGE ({redTeam.length})
              </span>
              <button
                onClick={() => handleAddBot('red')}
                className="text-xs text-red-400 hover:underline"
              >
                + Bot Rouge
              </button>
            </div>
            <div className="space-y-2.5 flex-1 overflow-y-auto">
              {redTeam.map(p => {
                const c = CHAMPIONS[p.championId];
                return (
                  <div
                    key={p.id}
                    className={`p-3 rounded-xl border flex items-center gap-3 ${
                      p.id === socket?.id
                        ? 'bg-red-950/80 border-red-500 shadow-md'
                        : 'bg-slate-950/70 border-slate-800'
                    }`}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg text-white"
                      style={{ backgroundColor: c.color }}
                    >
                      {c.passive.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-white truncate flex items-center gap-1.5">
                        {p.username}
                        {p.id === socket?.id && <span className="text-[10px] text-amber-400 font-bold">(VOUS)</span>}
                      </div>
                      <div className="text-xs text-slate-400">
                        {c.name} • <span className="text-red-400">{c.role}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // VIEW: IN-GAME MATCH (LoL HUD & ACTION ARENA)
  // ───────────────────────────────────────────────────────────────────────────
  const gameMinutes = Math.floor(gameState.gameTicks / (20 * 60));
  const gameSeconds = Math.floor((gameState.gameTicks / 20) % 60);
  const timeFormatted = `${gameMinutes}:${gameSeconds < 10 ? '0' : ''}${gameSeconds}`;

  return (
    <div className="relative w-screen h-screen bg-slate-950 overflow-hidden select-none font-sans">
      {/* 1. Main Canvas Arena */}
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onContextMenu={e => e.preventDefault()}
        className="w-full h-full cursor-crosshair block"
      />

      {/* 2. Top HUD Bar */}
      <div className="absolute top-0 left-0 right-0 h-14 bg-gradient-to-b from-slate-950/90 to-transparent flex items-center justify-between px-6 pointer-events-none">
        {/* Left: Back button & Control Scheme Selector */}
        <div className="flex items-center gap-3 pointer-events-auto">
          <button
            onClick={() => navigate('/')}
            className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 shadow-md"
          >
            ← Quitter
          </button>
          {/* Controls toggle dropdown */}
          <select
            value={controlScheme}
            onChange={e => setControlScheme(e.target.value as ControlScheme)}
            className="text-xs bg-slate-900/90 border border-slate-700 text-amber-400 font-semibold rounded-lg px-2.5 py-1.5 focus:outline-none shadow-md"
          >
            <option value="LOL_AZERTY">🎮 LoL AZERTY (Clic droit + A/Z/E/R)</option>
            <option value="LOL_QWERTY">🎮 LoL QWERTY (Clic droit + Q/W/E/R)</option>
            <option value="ZQSD_1234">⌨️ ZQSD Déplacement + 1/2/3/4 Sorts</option>
            <option value="WASD_1234">⌨️ WASD Déplacement + 1/2/3/4 Sorts</option>
          </select>
        </div>

        {/* Center: Match Score & Timer */}
        <div className="flex items-center gap-6 bg-slate-900/90 border border-slate-800 px-6 py-1.5 rounded-2xl shadow-xl pointer-events-auto">
          <div className="text-xl font-black text-blue-400 flex items-center gap-2">
            <span>🛡️</span> {gameState.killsBlue}
          </div>
          <div className="text-sm font-bold text-slate-300 font-mono tracking-widest px-3 border-x border-slate-700">
            {timeFormatted}
          </div>
          <div className="text-xl font-black text-red-400 flex items-center gap-2">
            {gameState.killsRed} <span>⚔️</span>
          </div>
        </div>

        {/* Right: Player KDA, CS & Gold */}
        <div className="flex items-center gap-4 bg-slate-900/90 border border-slate-800 px-4 py-1.5 rounded-2xl shadow-xl pointer-events-auto">
          <div className="text-xs text-slate-300">
            <span className="text-emerald-400 font-bold">{me?.kills || 0}</span> /{' '}
            <span className="text-rose-400 font-bold">{me?.deaths || 0}</span> /{' '}
            <span className="text-amber-400 font-bold">{me?.assists || 0}</span>
          </div>
          <div className="text-xs text-slate-400 flex items-center gap-1 border-l border-slate-700 pl-3">
            <span>🌾</span> <span className="text-white font-bold">{me?.cs || 0} CS</span>
          </div>
          <div className="text-xs text-amber-400 font-bold flex items-center gap-1 border-l border-slate-700 pl-3">
            <span>🪙</span> {me?.gold || 0}g
          </div>
        </div>
      </div>

      {/* 3. Kill Feed (Top Right) */}
      <div className="absolute top-16 right-6 flex flex-col gap-1.5 pointer-events-none max-w-sm">
        {gameState.killFeed.slice(0, 4).map(evt => (
          <div
            key={evt.id}
            className="px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs text-slate-200 flex items-center gap-2 shadow-md backdrop-blur-sm animate-fade-in"
          >
            <span className={evt.killerTeam === 'blue' ? 'text-blue-400 font-bold' : 'text-red-400 font-bold'}>
              {evt.killerName}
            </span>
            <span className="text-amber-400">⚔️</span>
            <span className={evt.victimTeam === 'blue' ? 'text-blue-400 font-bold' : 'text-red-400 font-bold'}>
              {evt.victimName}
            </span>
          </div>
        ))}
      </div>

      {/* 4. Rich In-Game Spell / Passive Tooltip (Hover) */}
      {hoveredSpell && me && (
        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 w-80 bg-slate-900/95 border-2 border-amber-500/80 rounded-2xl p-4 shadow-2xl backdrop-blur-md pointer-events-none z-50 text-xs animate-fade-in">
          {(() => {
            const sp = curChampDef.spells[hoveredSpell];
            const lvl = me.spellsLevel[hoveredSpell];
            const cd = sp.cooldown / 20;
            const keyLabel = getKeyLabel(hoveredSpell);

            return (
              <>
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{sp.icon}</span>
                    <div>
                      <div className="font-bold text-white text-sm flex items-center gap-1.5">
                        {sp.name}
                        <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/30">
                          [{keyLabel}]
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {sp.targetType === 'skillshot'
                          ? 'Tir de compétence'
                          : sp.targetType === 'area'
                          ? 'Zone d\'effet (AoE)'
                          : sp.targetType === 'dash'
                          ? 'Ruée rapide'
                          : sp.targetType === 'self'
                          ? 'Effet personnel'
                          : 'Ciblage direct'}
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-amber-400">
                    {lvl > 0 ? `Rang ${lvl}` : 'Non appris'}
                  </span>
                </div>

                <p className="text-slate-300 leading-relaxed mb-3">
                  {sp.description}
                </p>

                <div className="grid grid-cols-2 gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-[11px]">
                  <div className="text-blue-400 font-semibold flex items-center gap-1">
                    <span>💧 Coût :</span>
                    <span>{sp.manaCost} Mana</span>
                  </div>
                  <div className="text-amber-400 font-semibold flex items-center gap-1">
                    <span>⏱️ Rechargement :</span>
                    <span>{cd.toFixed(1)}s</span>
                  </div>
                  <div className="text-purple-400 font-semibold flex items-center gap-1">
                    <span>💥 Dégâts de base :</span>
                    <span>{sp.damage || 0}</span>
                  </div>
                  <div className="text-emerald-400 font-semibold flex items-center gap-1">
                    <span>🎯 Portée :</span>
                    <span>{sp.range} px</span>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Passive Tooltip (Hover) */}
      {hoveredPassive && me && (
        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 w-80 bg-slate-900/95 border-2 border-amber-500/80 rounded-2xl p-4 shadow-2xl backdrop-blur-md pointer-events-none z-50 text-xs animate-fade-in">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800 mb-2">
            <span className="text-2xl">{curChampDef.passive.icon}</span>
            <div>
              <div className="font-bold text-white text-sm">Passif : {curChampDef.passive.name}</div>
              <div className="text-[10px] text-amber-400 font-semibold">{curChampDef.name} ({curChampDef.role})</div>
            </div>
          </div>
          <p className="text-slate-300 leading-relaxed">
            {curChampDef.passive.description}
          </p>
        </div>
      )}

      {/* 5. Bottom Center LoL Action Bar with Stats Panel */}
      {me && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-end gap-2.5 pointer-events-auto">
          {/* Character Stats HUD Panel (AD, AP, AR, MR, AS, MS, Range) */}
          <div className="bg-slate-900/95 border-2 border-slate-800 rounded-2xl p-2.5 grid grid-cols-2 gap-x-3 gap-y-1 shadow-2xl backdrop-blur-md text-[11px]">
            {/* AD */}
            <div className="flex items-center gap-1.5 text-amber-400 font-bold" title="Dégâts d'Attaque (AD)">
              <span>🗡️</span>
              <span className="text-slate-400 text-[10px] font-normal">AD:</span>
              <span>{me.attackDamage}</span>
            </div>
            {/* AP */}
            <div className="flex items-center gap-1.5 text-purple-400 font-bold" title="Puissance Magique (AP)">
              <span>🧙</span>
              <span className="text-slate-400 text-[10px] font-normal">AP:</span>
              <span>{me.abilityPower}</span>
            </div>
            {/* Armor */}
            <div className="flex items-center gap-1.5 text-yellow-500 font-bold" title="Armure Physique (AR)">
              <span>🛡️</span>
              <span className="text-slate-400 text-[10px] font-normal">AR:</span>
              <span>{me.armor}</span>
            </div>
            {/* MR */}
            <div className="flex items-center gap-1.5 text-cyan-400 font-bold" title="Résistance Magique (RM)">
              <span>🔮</span>
              <span className="text-slate-400 text-[10px] font-normal">RM:</span>
              <span>{me.magicResist}</span>
            </div>
            {/* Attack Speed */}
            <div className="flex items-center gap-1.5 text-orange-400 font-bold" title="Vitesse d'Attaque (AS)">
              <span>⚡</span>
              <span className="text-slate-400 text-[10px] font-normal">AS:</span>
              <span>{me.attackSpeed.toFixed(2)}</span>
            </div>
            {/* Move Speed */}
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold" title="Vitesse de Déplacement (MS)">
              <span>👟</span>
              <span className="text-slate-400 text-[10px] font-normal">MS:</span>
              <span>{(me.moveSpeed * 100).toFixed(0)}</span>
            </div>
          </div>

          {/* Champion Avatar & HP/Mana Bars */}
          <div className="bg-slate-900/95 border-2 border-slate-800 rounded-2xl p-2.5 flex items-center gap-3 shadow-2xl backdrop-blur-md">
            <div
              className="relative cursor-pointer"
              onMouseEnter={() => setHoveredPassive(true)}
              onMouseLeave={() => setHoveredPassive(false)}
            >
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl shadow-md border-2 border-amber-500 hover:scale-105 transition"
                style={{ backgroundColor: curChampDef.color }}
              >
                {curChampDef.passive.icon}
              </div>
              <div className="absolute -bottom-1.5 -left-1.5 w-6 h-6 rounded-full bg-slate-950 border-2 border-amber-500 text-[11px] font-black text-amber-400 flex items-center justify-center">
                {me.level}
              </div>
            </div>

            {/* HP and Mana Bars */}
            <div className="w-44 flex flex-col gap-1.5">
              {/* HP Bar */}
              <div>
                <div className="flex justify-between text-[10px] font-bold text-emerald-400 mb-0.5">
                  <span>PV {me.shield > 0 && <span className="text-cyan-300">(+{me.shield})</span>}</span>
                  <span>{me.hp} / {me.maxHp}</span>
                </div>
                <div className="w-full h-3 bg-slate-950 rounded-md overflow-hidden border border-slate-700">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-green-400 transition-all duration-100"
                    style={{ width: `${Math.max(0, Math.min(100, (me.hp / me.maxHp) * 100))}%` }}
                  />
                </div>
              </div>
              {/* Mana Bar */}
              <div>
                <div className="flex justify-between text-[10px] font-bold text-blue-400 mb-0.5">
                  <span>MANA</span>
                  <span>{me.mana} / {me.maxMana}</span>
                </div>
                <div className="w-full h-2.5 bg-slate-950 rounded-md overflow-hidden border border-slate-700">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-100"
                    style={{ width: `${Math.max(0, Math.min(100, (me.mana / me.maxMana) * 100))}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Spell Slots (Q, W, E, R) with Hover Tooltip Trigger */}
          <div className="bg-slate-900/95 border-2 border-slate-800 rounded-2xl p-2.5 flex items-center gap-2 shadow-2xl backdrop-blur-md">
            {(['q', 'w', 'e', 'r'] as SpellKey[]).map(key => {
              const spell = curChampDef.spells[key];
              const cd = me.spellsCooldown[key];
              const level = me.spellsLevel[key];
              const canUpgrade = me.availableSpellPoints > 0 && (key !== 'r' || me.level >= 6);
              const keyLabel = getKeyLabel(key);

              return (
                <div key={key} className="flex flex-col items-center gap-1">
                  {/* Upgrade button */}
                  {canUpgrade ? (
                    <button
                      onClick={() => handleUpgradeSpell(key)}
                      className="w-7 h-5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-md flex items-center justify-center animate-bounce shadow-md"
                      title={`Améliorer ${spell.name}`}
                    >
                      +
                    </button>
                  ) : (
                    <div className="h-5 flex items-center gap-1">
                      {Array.from({ length: key === 'r' ? 3 : 5 }).map((_, i) => (
                        <div
                          key={i}
                          className={`w-1.5 h-1.5 rounded-full ${
                            i < level ? 'bg-amber-400' : 'bg-slate-700'
                          }`}
                        />
                      ))}
                    </div>
                  )}

                  {/* Spell Button */}
                  <button
                    onMouseEnter={() => setHoveredSpell(key)}
                    onMouseLeave={() => setHoveredSpell(null)}
                    onClick={() => {
                      if (level > 0 && cd <= 0) {
                        setAimingSpell(prev => (prev === key ? null : key));
                      }
                    }}
                    className={`relative w-14 h-14 rounded-xl border-2 flex flex-col items-center justify-center transition ${
                      aimingSpell === key
                        ? 'border-amber-400 bg-amber-500/20 ring-2 ring-amber-400'
                        : cd > 0 || level === 0
                        ? 'border-slate-800 bg-slate-950/80 opacity-60'
                        : 'border-slate-700 bg-slate-900 hover:border-slate-500 hover:bg-slate-800/80'
                    }`}
                  >
                    <span className="text-xl">{spell.icon}</span>
                    <span className="absolute bottom-1 right-1 text-[10px] font-black text-amber-400 bg-slate-950 px-1 rounded">
                      {keyLabel}
                    </span>

                    {/* Cooldown Overlay */}
                    {cd > 0 && (
                      <div className="absolute inset-0 bg-slate-950/80 rounded-xl flex items-center justify-center font-bold text-white text-base">
                        {Math.ceil(cd / 20)}
                      </div>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Summoners & Recall & Shop */}
          <div className="bg-slate-900/95 border-2 border-slate-800 rounded-2xl p-2.5 flex items-center gap-2 shadow-2xl backdrop-blur-md">
            {/* Flash (D) */}
            <div className="relative w-12 h-12 rounded-xl border-2 border-slate-700 bg-slate-900 flex flex-col items-center justify-center" title="Saut Éclair (Flash) [D]">
              <span className="text-lg">⚡</span>
              <span className="absolute bottom-0.5 right-1 text-[9px] font-black text-amber-400">D</span>
              {me.summonerSpells.d.cooldown > 0 && (
                <div className="absolute inset-0 bg-slate-950/80 rounded-xl flex items-center justify-center font-bold text-white text-xs">
                  {Math.ceil(me.summonerSpells.d.cooldown / 20)}
                </div>
              )}
            </div>

            {/* Heal (F) */}
            <div className="relative w-12 h-12 rounded-xl border-2 border-slate-700 bg-slate-900 flex flex-col items-center justify-center" title="Soins & Vitesse (Heal) [F]">
              <span className="text-lg">💚</span>
              <span className="absolute bottom-0.5 right-1 text-[9px] font-black text-amber-400">F</span>
              {me.summonerSpells.f.cooldown > 0 && (
                <div className="absolute inset-0 bg-slate-950/80 rounded-xl flex items-center justify-center font-bold text-white text-xs">
                  {Math.ceil(me.summonerSpells.f.cooldown / 20)}
                </div>
              )}
            </div>

            {/* Recall (B) */}
            <button
              onClick={() => socket?.emit('moba:recall')}
              className={`relative w-12 h-12 rounded-xl border-2 flex flex-col items-center justify-center transition ${
                me.isRecalling
                  ? 'border-blue-400 bg-blue-500/20 animate-pulse'
                  : 'border-slate-700 bg-slate-900 hover:border-slate-500'
              }`}
              title="Rappel à la base (Recall) [B]"
            >
              <span className="text-lg">🌀</span>
              <span className="absolute bottom-0.5 right-1 text-[9px] font-black text-amber-400">B</span>
            </button>

            {/* Shop Toggle Button */}
            <button
              onClick={() => setIsShopOpen(prev => !prev)}
              className="w-12 h-12 rounded-xl border-2 border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-bold flex flex-col items-center justify-center transition shadow-md"
              title="Ouvrir la Boutique / Vendre [P]"
            >
              <span className="text-lg">🛍️</span>
              <span className="text-[9px] font-black">P</span>
            </button>
          </div>

          {/* Item Inventory (6 slots) with click to open shop */}
          <div className="bg-slate-900/95 border-2 border-slate-800 rounded-2xl p-2.5 grid grid-cols-3 gap-1.5 shadow-2xl backdrop-blur-md">
            {Array.from({ length: 6 }).map((_, idx) => {
              const itemId = me.items[idx];
              const item = itemId ? MOBA_ITEMS[itemId] : null;

              return (
                <div
                  key={idx}
                  onClick={() => {
                    if (itemId) {
                      setShopTab('sell');
                      setIsShopOpen(true);
                    } else {
                      setShopTab('buy');
                      setIsShopOpen(true);
                    }
                  }}
                  className="w-9 h-9 rounded-lg border border-slate-800 bg-slate-950 hover:border-slate-600 cursor-pointer flex items-center justify-center text-sm shadow-inner transition"
                  title={item ? `${item.name} (${item.description}) - Cliquez pour gérer` : 'Emplacement vide (Boutique)'}
                >
                  {item ? item.icon : ''}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. Radar Minimap (Bottom Right) */}
      <div className="absolute bottom-4 right-4 w-52 h-32 bg-slate-900/90 border-2 border-slate-700 rounded-xl overflow-hidden shadow-2xl pointer-events-auto">
        <div className="relative w-full h-full bg-slate-950">
          {/* Lane indicator */}
          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-4 bg-slate-800/80" />

          {/* Nexuses */}
          {gameState.nexuses.map((n, i) => (
            <div
              key={i}
              className={`absolute w-3 h-3 rounded-full -translate-x-1/2 -translate-y-1/2 ${
                n.team === 'blue' ? 'bg-blue-500' : 'bg-red-500'
              }`}
              style={{
                left: `${(n.x / gameState.mapWidth) * 100}%`,
                top: `${(n.y / gameState.mapHeight) * 100}%`
              }}
            />
          ))}

          {/* Turrets */}
          {gameState.turrets.map(t => (
            <div
              key={t.id}
              className={`absolute w-2 h-2 rounded-full -translate-x-1/2 -translate-y-1/2 ${
                t.hp <= 0 ? 'hidden' : t.team === 'blue' ? 'bg-blue-400' : 'bg-red-400'
              }`}
              style={{
                left: `${(t.x / gameState.mapWidth) * 100}%`,
                top: `${(t.y / gameState.mapHeight) * 100}%`
              }}
            />
          ))}

          {/* Players */}
          {gameState.players.map(p => {
            if (!p.isAlive) return null;
            return (
              <div
                key={p.id}
                className={`absolute w-2.5 h-2.5 rounded-full -translate-x-1/2 -translate-y-1/2 ${
                  p.id === socket?.id
                    ? 'bg-amber-400 ring-2 ring-white z-10'
                    : p.team === 'blue'
                    ? 'bg-blue-400'
                    : 'bg-red-400'
                }`}
                style={{
                  left: `${(p.x / gameState.mapWidth) * 100}%`,
                  top: `${(p.y / gameState.mapHeight) * 100}%`
                }}
              />
            );
          })}

          {/* Camera Viewport Outline */}
          <div
            className="absolute border border-white/40 pointer-events-none -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${(cameraRef.current.x / gameState.mapWidth) * 100}%`,
              top: `${(cameraRef.current.y / gameState.mapHeight) * 100}%`,
              width: '35%',
              height: '40%'
            }}
          />
        </div>
      </div>

      {/* 7. Item Shop Modal (With 70% Resale Tab!) */}
      {isShopOpen && (
        <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <div className="max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
            {/* Shop Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🛍️</span>
                <h3 className="text-xl font-bold text-white">Boutique de l'Arène</h3>
                <span className="text-xs px-2.5 py-1 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold">
                  🪙 {me?.gold || 0} Or disponible
                </span>
              </div>
              <button
                onClick={() => setIsShopOpen(false)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* Shop Tabs: Acheter vs Vendre */}
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => setShopTab('buy')}
                className={`flex-1 py-2 px-4 rounded-xl font-bold text-xs transition ${
                  shopTab === 'buy'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                🛒 Catalogue des Objets
              </button>
              <button
                onClick={() => setShopTab('sell')}
                className={`flex-1 py-2 px-4 rounded-xl font-bold text-xs transition ${
                  shopTab === 'sell'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                💰 Vendre mes Objets (70% du prix) ({me?.items.length || 0}/6)
              </button>
            </div>

            {/* Tab 1: Buy Catalog */}
            {shopTab === 'buy' && (
              <div className="grid grid-cols-2 gap-3 max-h-[55vh] overflow-y-auto">
                {Object.values(MOBA_ITEMS).map(item => {
                  const canAfford = (me?.gold || 0) >= item.cost;
                  const isFull = (me?.items.length || 0) >= 6;

                  return (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-3xl">{item.icon}</div>
                        <div>
                          <div className="font-bold text-sm text-white">{item.name}</div>
                          <div className="text-xs text-slate-400">{item.description}</div>
                          <div className="text-xs font-bold text-amber-400 mt-1">🪙 {item.cost} Or</div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleBuyItem(item.id)}
                        disabled={!canAfford || isFull}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                          canAfford && !isFull
                            ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        Acheter
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Tab 2: Sell Owned Items */}
            {shopTab === 'sell' && (
              <div className="max-h-[55vh] overflow-y-auto">
                {(!me?.items || me.items.length === 0) ? (
                  <div className="p-8 text-center text-slate-500 text-sm">
                    Votre inventaire est vide. Aucun objet à revendre pour l'instant !
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {me.items.map((itemId, idx) => {
                      const item = MOBA_ITEMS[itemId];
                      if (!item) return null;
                      const resaleValue = Math.floor(item.cost * 0.7);

                      return (
                        <div
                          key={idx}
                          className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="text-3xl">{item.icon}</div>
                            <div>
                              <div className="font-bold text-sm text-white">{item.name}</div>
                              <div className="text-xs text-slate-400">{item.description}</div>
                              <div className="text-xs text-slate-500 mt-1">
                                Acheté : <span className="line-through">{item.cost}g</span> → Prix de vente :{' '}
                                <span className="font-bold text-emerald-400">+{resaleValue} Or (70%)</span>
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => handleSellItem(idx)}
                            className="px-4 py-2 rounded-lg text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500 hover:text-slate-950 transition shadow-md"
                          >
                            Vendre (+{resaleValue}g)
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 8. Tab Scoreboard Overlay */}
      {isScoreboardOpen && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-8 z-40 pointer-events-none">
          <div className="max-w-3xl w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-lg font-black text-white text-center pb-4 border-b border-slate-800 mb-4 tracking-wider">
              TABLEAU DES SCORES
            </h3>

            {/* Blue Team */}
            <div className="mb-4">
              <div className="text-xs font-bold text-blue-400 uppercase mb-2">Équipe Bleue</div>
              <div className="space-y-1.5">
                {gameState.players
                  .filter(p => p.team === 'blue')
                  .map(p => (
                    <div
                      key={p.id}
                      className="px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2 font-bold text-white">
                        <span>{CHAMPIONS[p.championId]?.passive.icon}</span>
                        <span>{p.username}</span>
                        <span className="text-slate-500 font-normal">({CHAMPIONS[p.championId]?.name})</span>
                      </div>
                      <div className="flex items-center gap-6">
                        <span className="text-slate-300">Niv. {p.level}</span>
                        <span className="text-slate-400">{p.cs} CS</span>
                        <span className="text-amber-400 font-bold">{p.kills}/{p.deaths}/{p.assists}</span>
                        <span className="text-amber-400">🪙 {p.gold}g</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Red Team */}
            <div>
              <div className="text-xs font-bold text-red-400 uppercase mb-2">Équipe Rouge</div>
              <div className="space-y-1.5">
                {gameState.players
                  .filter(p => p.team === 'red')
                  .map(p => (
                    <div
                      key={p.id}
                      className="px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2 font-bold text-white">
                        <span>{CHAMPIONS[p.championId]?.passive.icon}</span>
                        <span>{p.username}</span>
                        <span className="text-slate-500 font-normal">({CHAMPIONS[p.championId]?.name})</span>
                      </div>
                      <div className="flex items-center gap-6">
                        <span className="text-slate-300">Niv. {p.level}</span>
                        <span className="text-slate-400">{p.cs} CS</span>
                        <span className="text-amber-400 font-bold">{p.kills}/{p.deaths}/{p.assists}</span>
                        <span className="text-amber-400">🪙 {p.gold}g</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 9. Victory / Defeat Modal */}
      {gameState.status === 'FINISHED' && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-6 z-50">
          <div className="max-w-md w-full bg-slate-900 border-2 border-slate-800 rounded-3xl p-8 text-center shadow-2xl">
            <div className="text-5xl mb-4">
              {gameState.winner === me?.team ? '🏆' : '💀'}
            </div>
            <h2
              className={`text-4xl font-black mb-2 tracking-tight ${
                gameState.winner === me?.team ? 'text-emerald-400' : 'text-rose-500'
              }`}
            >
              {gameState.winner === me?.team ? 'VICTOIRE !' : 'DÉFAITE !'}
            </h2>
            <p className="text-slate-400 text-sm mb-6">
              L'équipe {gameState.winner?.toUpperCase()} a détruit le Nexus ennemi.
            </p>

            <button
              onClick={handleResetGame}
              className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-bold rounded-xl shadow-lg transition"
            >
              Rejouer une Partie ⚔️
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
