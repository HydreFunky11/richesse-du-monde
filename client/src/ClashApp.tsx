import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { soundFx } from './utils/audio';

const SERVER_URL = import.meta.env.VITE_WS_SERVER_URL || import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

export type ClashTeam = 'blue' | 'red';
export type ClashCardId = 
  | 'knight'
  | 'archers'
  | 'skeletons'
  | 'giant'
  | 'wizard'
  | 'dragon'
  | 'tesla'
  | 'fireball';

export interface ClashCardDef {
  id: ClashCardId;
  name: string;
  cost: number;
  type: 'troop' | 'building' | 'spell';
  description: string;
  emoji: string;
  targetAir: boolean;
  targetOnlyBuildings: boolean;
}

export const CLASH_CARDS: Record<ClashCardId, ClashCardDef> = {
  knight: {
    id: 'knight',
    name: 'Chevalier Loyal',
    cost: 3,
    type: 'troop',
    description: 'Combattant solide au corps-à-corps.',
    emoji: '⚔️',
    targetAir: false,
    targetOnlyBuildings: false
  },
  archers: {
    id: 'archers',
    name: 'Archères Royales',
    cost: 3,
    type: 'troop',
    description: 'Duo d\'archères rapides au sol et en l\'air.',
    emoji: '🏹',
    targetAir: true,
    targetOnlyBuildings: false
  },
  skeletons: {
    id: 'skeletons',
    name: 'Nuée de Squelettes',
    cost: 3,
    type: 'troop',
    description: '6 squelettes redoutables contre les gros tanks.',
    emoji: '💀',
    targetAir: false,
    targetOnlyBuildings: false
  },
  giant: {
    id: 'giant',
    name: 'Géant de Pierre',
    cost: 5,
    type: 'troop',
    description: 'Ignore les troupes et détruit les tours.',
    emoji: '🗿',
    targetAir: false,
    targetOnlyBuildings: true
  },
  wizard: {
    id: 'wizard',
    name: 'Pyromancien',
    cost: 4,
    type: 'troop',
    description: 'Mage de feu aux dégâts de zone massifs.',
    emoji: '🧙',
    targetAir: true,
    targetOnlyBuildings: false
  },
  dragon: {
    id: 'dragon',
    name: 'Dragonnet Arcanique',
    cost: 4,
    type: 'troop',
    description: 'Cracheur de feu volant, ignore la rivière.',
    emoji: '🐉',
    targetAir: true,
    targetOnlyBuildings: false
  },
  tesla: {
    id: 'tesla',
    name: 'Tour Tesla',
    cost: 4,
    type: 'building',
    description: 'Défense statique foudroyante sol/air.',
    emoji: '⚡',
    targetAir: true,
    targetOnlyBuildings: false
  },
  fireball: {
    id: 'fireball',
    name: 'Boule de Feu',
    cost: 4,
    type: 'spell',
    description: 'Sort lancé n\'importe où. Dégâts de zone.',
    emoji: '☄️',
    targetAir: true,
    targetOnlyBuildings: false
  }
};

interface ClashTower {
  id: string;
  type: 'king' | 'princess_left' | 'princess_right';
  team: ClashTeam;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  range: number;
  damage: number;
  attackSpeed: number;
  isActive: boolean;
}

interface ClashUnit {
  id: string;
  cardId: ClashCardId;
  team: ClashTeam;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  range: number;
  isFlying: boolean;
  targetOnlyBuildings: boolean;
  targetAir: boolean;
  aoeRadius?: number;
}

interface ClashProjectile {
  id: string;
  fromX: number;
  fromY: number;
  targetX: number;
  targetY: number;
  currentX: number;
  currentY: number;
  speed: number;
  damage: number;
  aoeRadius?: number;
  type: 'arrow' | 'fireball' | 'cannon' | 'lightning';
  team: ClashTeam;
}

interface ClashPlayer {
  id: string;
  username: string;
  color: string;
  team: ClashTeam;
  elixir: number;
  hand: ClashCardId[];
  nextCard: ClashCardId;
  deck: ClashCardId[];
  isBot?: boolean;
}

interface ClashGameState {
  status: 'LOBBY' | 'PLAYING' | 'FINISHED';
  roomCode: string;
  players: ClashPlayer[];
  spectators: { id: string; username: string }[];
  towers: ClashTower[];
  units: ClashUnit[];
  projectiles: ClashProjectile[];
  timer: number;
  isDoubleElixir: boolean;
  isSuddenDeath: boolean;
  winnerTeam: ClashTeam | 'DRAW' | null;
  winnerUsername: string | null;
  blueScore: number;
  redScore: number;
  log: string[];
}

interface FloatingText {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  life: number; // 0 to 1
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

export default function ClashApp() {
  const navigate = useNavigate();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [joined, setJoined] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [gameState, setGameState] = useState<ClashGameState | null>(null);
  const [selectedCard, setSelectedCard] = useState<ClashCardId | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const prevHpsRef = useRef<Record<string, number>>({});
  const logContainerRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll log
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [gameState?.log]);

  // Connect socket
  useEffect(() => {
    const s = io(SERVER_URL);
    setSocket(s);

    s.on('connect', () => {
      setErrorMsg(null);
    });

    s.on('connect_error', (err) => {
      console.warn('[Clash] Erreur connexion socket:', err);
    });

    s.on('clashStateUpdate', (newState: ClashGameState) => {
      setJoined(true);
      setErrorMsg(null);

      // Check HP differences to spawn floating damage numbers & particles
      newState.towers.forEach(t => {
        const prev = prevHpsRef.current[t.id];
        if (prev !== undefined && t.hp < prev) {
          const dmg = prev - t.hp;
          spawnFloatingText(t.x, t.y - 4, `-${dmg}`, '#EF4444');
          spawnExplosion(t.x, t.y, '#F59E0B', 8);
          soundFx.attack();
        }
        prevHpsRef.current[t.id] = t.hp;
      });

      newState.units.forEach(u => {
        const prev = prevHpsRef.current[u.id];
        if (prev !== undefined && u.hp < prev) {
          const dmg = prev - u.hp;
          spawnFloatingText(u.x, u.y - 3, `-${dmg}`, '#F87171');
          spawnExplosion(u.x, u.y, '#EF4444', 3);
        }
        prevHpsRef.current[u.id] = u.hp;
      });

      setGameState(newState);
    });

    s.on('error', (err: string) => {
      setErrorMsg(err);
    });

    return () => {
      s.disconnect();
    };
  }, []);

  const spawnFloatingText = (x: number, y: number, text: string, color: string) => {
    floatingTextsRef.current.push({
      id: Math.random().toString(),
      x,
      y,
      text,
      color,
      life: 1.0
    });
  };

  const spawnExplosion = (x: number, y: number, color: string, count: number = 6) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 5 + Math.random() * 15;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: 2 + Math.random() * 3,
        life: 0.5,
        maxLife: 0.5
      });
    }
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socket || !usernameInput.trim() || !roomCodeInput.trim()) return;
    setErrorMsg(null);
    soundFx.click();

    if (!socket.connected) {
      setErrorMsg('Connexion au serveur en cours... Réessayez dans quelques secondes.');
      socket.connect();
      return;
    }

    socket.emit('joinGame', {
      username: usernameInput.trim(),
      roomCode: roomCodeInput.trim(),
      gameType: 'clash'
    });
  };

  const handleStartGame = () => {
    if (!socket) return;
    soundFx.click();
    socket.emit('clash:startGame');
  };

  const handleAddBot = () => {
    if (!socket) return;
    soundFx.click();
    socket.emit('clash:addBot');
  };

  const handleResetGame = () => {
    if (!socket) return;
    soundFx.click();
    socket.emit('clash:resetGame');
  };

  const me = gameState?.players.find(p => p.id === socket?.id);
  const isHost = gameState?.players[0]?.id === socket?.id;

  // Validate placement zone logic
  const isPlacementValid = (x: number, y: number, cardId: ClashCardId | null): boolean => {
    if (!cardId || !me) return false;
    const cardDef = CLASH_CARDS[cardId];
    if (!cardDef) return false;
    if (cardDef.type === 'spell') return true; // spells can be cast anywhere

    const redLeftDown = !gameState?.towers.some(t => t.id === 'red_princess_left' && t.hp > 0);
    const redRightDown = !gameState?.towers.some(t => t.id === 'red_princess_right' && t.hp > 0);
    const blueLeftDown = !gameState?.towers.some(t => t.id === 'blue_princess_left' && t.hp > 0);
    const blueRightDown = !gameState?.towers.some(t => t.id === 'blue_princess_right' && t.hp > 0);

    if (me.team === 'blue') {
      let minY = 80;
      if (redLeftDown && x <= 50) minY = 50;
      if (redRightDown && x > 50) minY = 50;
      return y >= minY && y <= 155 && x >= 5 && x <= 95;
    } else {
      let maxY = 80;
      if (blueLeftDown && x <= 50) maxY = 110;
      if (blueRightDown && x > 50) maxY = 110;
      return y <= maxY && y >= 5 && x >= 5 && x <= 95;
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !selectedCard || !me || !socket) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = 100 / rect.width;
    const scaleY = 160 / rect.height;

    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    if (isPlacementValid(clickX, clickY, selectedCard)) {
      soundFx.playCard();
      socket.emit('clash:playCard', {
        cardId: selectedCard,
        x: clickX,
        y: clickY
      });
      setSelectedCard(null);
    } else {
      soundFx.shield();
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = 100 / rect.width;
    const scaleY = 160 / rect.height;
    setHoverPos({
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    });
  };

  // Canvas render loop
  useEffect(() => {
    let animationId: number;
    let lastTime = performance.now();

    const render = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      const canvas = canvasRef.current;
      if (!canvas) {
        animationId = requestAnimationFrame(render);
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animationId = requestAnimationFrame(render);
        return;
      }

      const W = canvas.width;
      const H = canvas.height;
      const toX = (x: number) => (x / 100) * W;
      const toY = (y: number) => (y / 160) * H;
      const toSize = (s: number) => (s / 100) * W;

      // ─── 1. ARENA BACKGROUND (Grass & Grid) ───────────────────────────
      // Vibrant royal lawn
      ctx.fillStyle = '#1e3a1e';
      ctx.fillRect(0, 0, W, H);

      // Checkered stripes
      const stripeHeight = H / 16;
      for (let i = 0; i < 16; i++) {
        ctx.fillStyle = i % 2 === 0 ? 'rgba(34, 197, 94, 0.08)' : 'rgba(21, 128, 61, 0.05)';
        ctx.fillRect(0, i * stripeHeight, W, stripeHeight);
      }

      // ─── 2. THE RIVER & BRIDGES ──────────────────────────────────────
      const riverY = toY(75);
      const riverH = toY(10);

      // River bed
      const riverGrad = ctx.createLinearGradient(0, riverY, 0, riverY + riverH);
      riverGrad.addColorStop(0, '#0284c7');
      riverGrad.addColorStop(0.5, '#0369a1');
      riverGrad.addColorStop(1, '#075985');
      ctx.fillStyle = riverGrad;
      ctx.fillRect(0, riverY, W, riverH);

      // River ripples
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      const rippleOffset = (time / 30) % toX(20);
      for (let rx = -20; rx < 120; rx += 20) {
        ctx.fillRect(toX(rx) + rippleOffset, riverY + riverH * 0.4, toX(8), 2);
      }

      // Bridges (Left Bridge X=21, Right Bridge X=79)
      const drawBridge = (cx: number) => {
        const bx = toX(cx - 6);
        const bw = toX(12);
        const by = riverY - toY(2);
        const bh = riverH + toY(4);

        // Wood planks
        ctx.fillStyle = '#78350f';
        ctx.fillRect(bx, by, bw, bh);

        // Plank lines
        ctx.strokeStyle = '#451a03';
        ctx.lineWidth = 1.5;
        for (let py = by; py <= by + bh; py += toY(2.5)) {
          ctx.beginPath();
          ctx.moveTo(bx, py);
          ctx.lineTo(bx + bw, py);
          ctx.stroke();
        }

        // Stone rope railings
        ctx.fillStyle = '#b45309';
        ctx.fillRect(bx, by, 3, bh);
        ctx.fillRect(bx + bw - 3, by, 3, bh);
      };

      drawBridge(21);
      drawBridge(79);

      // ─── 3. DEPLOY ZONE HIGHLIGHT (If Card Selected) ─────────────────
      if (selectedCard && me && gameState?.status === 'PLAYING') {
        const cardDef = CLASH_CARDS[selectedCard];
        ctx.save();
        if (cardDef.type === 'spell') {
          // Entire arena is deployable
          ctx.fillStyle = 'rgba(245, 158, 11, 0.15)';
          ctx.fillRect(0, 0, W, H);
        } else {
          // Blue deployable zone
          const redLeftDown = !gameState?.towers.some(t => t.id === 'red_princess_left' && t.hp > 0);
          const redRightDown = !gameState?.towers.some(t => t.id === 'red_princess_right' && t.hp > 0);

          ctx.fillStyle = 'rgba(59, 130, 246, 0.18)';
          ctx.fillRect(toX(5), toY(80), toX(90), toY(75));

          if (redLeftDown) {
            ctx.fillStyle = 'rgba(59, 130, 246, 0.18)';
            ctx.fillRect(toX(5), toY(50), toX(45), toY(30));
          }
          if (redRightDown) {
            ctx.fillStyle = 'rgba(59, 130, 246, 0.18)';
            ctx.fillRect(toX(50), toY(50), toX(45), toY(30));
          }
        }
        ctx.restore();
      }

      // ─── 4. TOWERS ──────────────────────────────────────────────────
      if (gameState) {
        gameState.towers.forEach(t => {
          const isAlive = t.hp > 0;
          const isKing = t.type === 'king';
          const isBlue = t.team === 'blue';
          const cx = toX(t.x);
          const cy = toY(t.y);
          const r = toSize(isKing ? 7.5 : 5.5);

          if (!isAlive) {
            // Destroyed Tower Rubble
            ctx.fillStyle = '#44403c';
            ctx.beginPath();
            ctx.arc(cx, cy, r * 0.8, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#78716c';
            ctx.fillText('🪨', cx - 8, cy + 5);
            return;
          }

          // Tower Base Shadow
          ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
          ctx.beginPath();
          ctx.ellipse(cx, cy + r * 0.3, r * 1.1, r * 0.6, 0, 0, Math.PI * 2);
          ctx.fill();

          // Tower Stone Body
          const grad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 2, cx, cy, r);
          grad.addColorStop(0, isBlue ? '#38bdf8' : '#f87171');
          grad.addColorStop(0.5, isBlue ? '#0284c7' : '#dc2626');
          grad.addColorStop(1, '#0f172a');

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = isBlue ? '#60a5fa' : '#fca5a5';
          ctx.lineWidth = 2.5;
          ctx.stroke();

          // Crown Icon / King emblem
          ctx.font = `${isKing ? 20 : 14}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(isKing ? '👑' : '🏰', cx, cy - 1);

          // Tower HP Bar
          const barW = toSize(isKing ? 14 : 10);
          const barH = 5;
          const barX = cx - barW / 2;
          const barY = cy - r - 8;

          ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
          ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);

          const hpRatio = Math.max(0, t.hp / t.maxHp);
          ctx.fillStyle = hpRatio > 0.4 ? '#22c55e' : (hpRatio > 0.2 ? '#eab308' : '#ef4444');
          ctx.fillRect(barX, barY, barW * hpRatio, barH);

          // Text HP
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 9px monospace';
          ctx.fillText(`${t.hp}`, cx, barY - 4);
        });
      }

      // ─── 5. UNITS ───────────────────────────────────────────────────
      if (gameState) {
        gameState.units.forEach(u => {
          const cx = toX(u.x);
          const cy = toY(u.y);
          const isBlue = u.team === 'blue';
          const card = CLASH_CARDS[u.cardId];
          const unitRadius = toSize(u.cardId === 'giant' ? 4.5 : (u.cardId === 'skeletons' ? 2 : 3));

          // Unit Shadow
          ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
          ctx.beginPath();
          ctx.ellipse(cx, cy + (u.isFlying ? 12 : 2), unitRadius * 1.1, unitRadius * 0.5, 0, 0, Math.PI * 2);
          ctx.fill();

          // Unit Circle Body
          ctx.fillStyle = isBlue ? '#1d4ed8' : '#b91c1c';
          ctx.beginPath();
          ctx.arc(cx, cy, unitRadius, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = isBlue ? '#93c5fd' : '#fca5a5';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Emoji Avatar
          ctx.font = `${Math.round(unitRadius * 1.4)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(card?.emoji || '⚔️', cx, cy);

          // Unit Mini HP bar
          const barW = unitRadius * 2.2;
          const barH = 3;
          const barX = cx - barW / 2;
          const barY = cy - unitRadius - 5;

          ctx.fillStyle = '#000000';
          ctx.fillRect(barX - 0.5, barY - 0.5, barW + 1, barH + 1);

          const hpPct = Math.max(0, u.hp / u.maxHp);
          ctx.fillStyle = isBlue ? '#38bdf8' : '#f87171';
          ctx.fillRect(barX, barY, barW * hpPct, barH);
        });
      }

      // ─── 6. PROJECTILES ─────────────────────────────────────────────
      if (gameState) {
        gameState.projectiles.forEach(p => {
          const px = toX(p.currentX);
          const py = toY(p.currentY);

          if (p.type === 'fireball') {
            // Fiery comet
            ctx.fillStyle = '#f97316';
            ctx.beginPath();
            ctx.arc(px, py, 7, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fef08a';
            ctx.beginPath();
            ctx.arc(px, py, 4, 0, Math.PI * 2);
            ctx.fill();
          } else if (p.type === 'cannon') {
            // Heavy black ball
            ctx.fillStyle = '#0f172a';
            ctx.beginPath();
            ctx.arc(px, py, 5, 0, Math.PI * 2);
            ctx.fill();
          } else if (p.type === 'lightning') {
            // Blue electric spark
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(toX(p.fromX), toY(p.fromY));
            ctx.lineTo(px, py);
            ctx.stroke();
          } else {
            // Arrow
            ctx.fillStyle = '#facc15';
            ctx.beginPath();
            ctx.arc(px, py, 2.5, 0, Math.PI * 2);
            ctx.fill();
          }
        });
      }

      // ─── 7. PARTICLES & FLOATING DAMAGE TEXT ─────────────────────────
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const pt = particlesRef.current[i];
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.life -= dt;
        if (pt.life <= 0) {
          particlesRef.current.splice(i, 1);
        } else {
          ctx.fillStyle = pt.color;
          ctx.beginPath();
          ctx.arc(toX(pt.x), toY(pt.y), pt.size * (pt.life / pt.maxLife), 0, Math.PI * 2);
          ctx.fill();
        }
      }

      for (let i = floatingTextsRef.current.length - 1; i >= 0; i--) {
        const ft = floatingTextsRef.current[i];
        ft.y -= 4 * dt;
        ft.life -= dt * 1.5;
        if (ft.life <= 0) {
          floatingTextsRef.current.splice(i, 1);
        } else {
          ctx.save();
          ctx.globalAlpha = Math.max(0, ft.life);
          ctx.font = 'bold 11px sans-serif';
          ctx.fillStyle = ft.color;
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 2;
          ctx.strokeText(ft.text, toX(ft.x), toY(ft.y));
          ctx.fillText(ft.text, toX(ft.x), toY(ft.y));
          ctx.restore();
        }
      }

      // ─── 8. HOVER RETICLE CURSOR ────────────────────────────────────
      if (hoverPos && selectedCard && me && gameState?.status === 'PLAYING') {
        const isValid = isPlacementValid(hoverPos.x, hoverPos.y, selectedCard);
        const cardDef = CLASH_CARDS[selectedCard];
        const hx = toX(hoverPos.x);
        const hy = toY(hoverPos.y);

        ctx.save();
        ctx.strokeStyle = isValid ? '#4ade80' : '#ef4444';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);

        const radius = cardDef.type === 'spell' ? toSize(12) : toSize(6);
        ctx.beginPath();
        ctx.arc(hx, hy, radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = isValid ? 'rgba(74, 222, 128, 0.2)' : 'rgba(239, 68, 68, 0.25)';
        ctx.fill();

        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(isValid ? cardDef.emoji : '🚫', hx, hy);
        ctx.restore();
      }

      animationId = requestAnimationFrame(render);
    };

    animationId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationId);
  }, [gameState, selectedCard, hoverPos, me]);

  // Format timer
  const formatTimer = (sec: number) => {
    const s = Math.max(0, Math.floor(sec));
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}:${rem < 10 ? '0' : ''}${rem}`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans select-none overflow-x-hidden">
      {/* ─── HEADER BAR ──────────────────────────────────────────────────────── */}
      <header className="bg-slate-900/95 border-b border-slate-800 px-4 py-3 flex items-center justify-between shadow-xl sticky top-0 z-40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              soundFx.click();
              navigate('/');
            }}
            className="btn-3d text-xs py-1.5 px-3 rounded-lg text-slate-300 hover:text-white cursor-pointer"
          >
            ← Accueil
          </button>
          <div className="flex items-center gap-2">
            <span className="text-2xl animate-bounce">👑</span>
            <div>
              <h1 className="font-extrabold text-sm tracking-wide text-white uppercase flex items-center gap-2">
                <span>Clash of Realms</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded font-mono">
                  TEMPS RÉEL
                </span>
              </h1>
              {gameState && (
                <div className="text-[10px] text-slate-400 font-mono">
                  Salon : <span className="text-amber-400 font-bold">{gameState.roomCode}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Middle: Timer & Crown Score */}
        {gameState && gameState.status === 'PLAYING' && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1 rounded-xl border border-slate-800">
              <span className="text-blue-400 font-black text-sm">👑 {gameState.blueScore}</span>
              <span className="text-slate-500 text-xs">-</span>
              <span className="text-red-400 font-black text-sm">{gameState.redScore} 👑</span>
            </div>

            <div className={`px-3 py-1 rounded-xl border font-mono font-black text-sm flex items-center gap-1.5 ${
              gameState.isDoubleElixir 
                ? 'bg-amber-950/60 text-amber-300 border-amber-500 animate-pulse' 
                : 'bg-slate-950 text-white border-slate-800'
            }`}>
              <span>⏱️</span>
              <span>{formatTimer(gameState.timer)}</span>
              {gameState.isDoubleElixir && (
                <span className="text-[9px] bg-amber-500 text-slate-950 px-1 rounded font-bold">2X</span>
              )}
            </div>
          </div>
        )}

        {/* Right: Sound toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => soundFx.toggleMute()}
            className="text-slate-400 hover:text-white text-xs bg-slate-800 p-2 rounded-lg border border-slate-700 cursor-pointer"
            title="Activer/Couper le son"
          >
            🔊
          </button>
        </div>
      </header>

      {/* ─── ERROR BANNER ────────────────────────────────────────────────────── */}
      {errorMsg && (
        <div className="bg-red-950/80 border-b border-red-800 text-red-200 text-xs py-2 px-4 text-center font-bold animate-pulse">
          ⚠️ {errorMsg}
        </div>
      )}

      {/* ─── NOT JOINED MODAL ────────────────────────────────────────────────── */}
      {!joined || !gameState ? (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-amber-500/50 p-8 rounded-3xl max-w-md w-full shadow-2xl relative">
            <div className="text-center mb-6">
              <div className="text-6xl mb-2 animate-bounce">👑</div>
              <h2 className="text-2xl font-black text-white uppercase tracking-wider">Rejoindre l'Arène</h2>
              <p className="text-xs text-slate-400 mt-1">Duel de cartes stratégique en temps réel (Style Clash Royale)</p>
            </div>

            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Votre Pseudo</label>
                <input
                  type="text"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="Ex: RoiArthur"
                  maxLength={15}
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Code du Salon</label>
                <input
                  type="text"
                  value={roomCodeInput}
                  onChange={(e) => setRoomCodeInput(e.target.value)}
                  placeholder="Ex: ARENA1"
                  maxLength={10}
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white uppercase font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <button
                type="submit"
                className="btn-3d-amber w-full py-3.5 rounded-xl font-bold text-sm tracking-wider cursor-pointer text-slate-950 shadow-lg mt-2"
              >
                Entrer dans l'Arène ➔
              </button>
            </form>
          </div>
        </div>
      ) : gameState.status === 'LOBBY' ? (
        /* ─── LOBBY VIEW ──────────────────────────────────────────────────────── */
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-slate-900 border-2 border-amber-500/50 p-8 rounded-3xl max-w-lg w-full shadow-2xl relative">
            <div className="text-5xl mb-2 animate-bounce">🏰</div>
            <h2 className="text-xl font-black text-white uppercase tracking-wider">Salon de Duel</h2>
            <p className="text-xs text-slate-400 mb-6">Code du salon : <span className="font-mono text-amber-400 font-black text-sm">{gameState.roomCode}</span></p>

            {/* Players slots */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {/* Blue Slot */}
              <div className="bg-blue-950/40 border-2 border-blue-500/50 p-4 rounded-2xl flex flex-col items-center justify-center">
                <span className="text-xs font-bold text-blue-300 uppercase mb-1">Camp Bleu 🔷</span>
                {gameState.players[0] ? (
                  <div className="font-extrabold text-sm text-white">
                    {gameState.players[0].username}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 italic">En attente...</div>
                )}
              </div>

              {/* Red Slot */}
              <div className="bg-red-950/40 border-2 border-red-500/50 p-4 rounded-2xl flex flex-col items-center justify-center">
                <span className="text-xs font-bold text-red-300 uppercase mb-1">Camp Rouge 🔴</span>
                {gameState.players[1] ? (
                  <div className="font-extrabold text-sm text-white">
                    {gameState.players[1].username} {gameState.players[1].isBot && '🤖'}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 italic">En attente...</div>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-3">
              {isHost && gameState.players.length === 1 && (
                <button
                  onClick={handleAddBot}
                  className="w-full bg-slate-800 hover:bg-slate-750 text-amber-300 border border-amber-500/40 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>🤖</span>
                  <span>Ajouter un Adversaire IA (Pour tester solo)</span>
                </button>
              )}

              {isHost ? (
                <button
                  onClick={handleStartGame}
                  className="btn-3d-amber w-full py-3.5 rounded-xl font-black text-sm text-slate-950 shadow-xl cursor-pointer"
                >
                  Démarrer le Combat ⚔️
                </button>
              ) : (
                <div className="text-xs text-slate-400 italic py-2">
                  En attente de l'hôte pour lancer la partie...
                </div>
              )}
            </div>

            {/* Cards Preview Deck */}
            <div className="mt-6 pt-6 border-t border-slate-800 text-left">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Cartes de votre Deck :</h4>
              <div className="grid grid-cols-4 gap-2">
                {Object.values(CLASH_CARDS).map(c => (
                  <div key={c.id} className="bg-slate-950 p-2 rounded-xl border border-slate-800 text-center">
                    <div className="text-xl mb-0.5">{c.emoji}</div>
                    <div className="text-[10px] font-bold text-slate-200 truncate">{c.name}</div>
                    <div className="text-[9px] text-purple-400 font-bold font-mono">⚡ {c.cost}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ─── IN-GAME ARENA VIEW ──────────────────────────────────────────────── */
        <div className="flex-1 flex flex-col lg:flex-row items-center justify-center p-3 gap-4 max-w-6xl mx-auto w-full">
          {/* Main Battlefield Canvas */}
          <div className="flex flex-col items-center relative">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-slate-800 bg-black">
              <canvas
                ref={canvasRef}
                width={460}
                height={700}
                onClick={handleCanvasClick}
                onMouseMove={handleCanvasMouseMove}
                onMouseLeave={() => setHoverPos(null)}
                className="cursor-crosshair block"
              />

              {/* Sudden Death Banner Overlay */}
              {gameState?.isSuddenDeath && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-600/90 text-white font-black text-xs px-4 py-1.5 rounded-full border-2 border-white shadow-xl animate-bounce">
                  ⚡ MORT SUBITE ! PROCHAINE TOUR = VICTOIRE !
                </div>
              )}
            </div>

            {/* Hint prompt when card is selected */}
            {selectedCard && (
              <div className="mt-2 text-xs font-bold text-amber-400 animate-pulse bg-slate-900 px-4 py-1.5 rounded-full border border-amber-500/40">
                🎯 Cliquez sur l'arène pour déployer "{CLASH_CARDS[selectedCard].name}" !
              </div>
            )}
          </div>

          {/* Right/Bottom Panel: Deck, Elixir Bar & Logs */}
          <div className="w-full lg:w-80 flex flex-col justify-between gap-4 self-stretch">
            {/* Elixir Gauge & Hand Console */}
            {me && (
              <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-4 shadow-xl flex flex-col gap-4">
                {/* Elixir Bar */}
                <div>
                  <div className="flex justify-between items-center text-xs font-extrabold mb-1">
                    <span className="text-purple-400 flex items-center gap-1">
                      <span>⚡</span>
                      <span>ÉLIXIR</span>
                    </span>
                    <span className="font-mono text-purple-300 font-black">
                      {Math.floor(me.elixir)} / 10
                    </span>
                  </div>
                  <div className="w-full bg-slate-950 h-4 rounded-full overflow-hidden border border-purple-500/40 p-0.5 shadow-inner">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500 transition-all duration-150 shadow"
                      style={{ width: `${(me.elixir / 10) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Hand Cards */}
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400 mb-2 flex justify-between items-center">
                    <span>Votre Main</span>
                    <span className="text-slate-500 font-mono">
                      Suivante: {CLASH_CARDS[me.nextCard]?.emoji} {CLASH_CARDS[me.nextCard]?.name}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {me.hand.map((cardId, idx) => {
                      const card = CLASH_CARDS[cardId];
                      const canAfford = me.elixir >= card.cost;
                      const isSelected = selectedCard === cardId;

                      return (
                        <button
                          key={idx}
                          onClick={() => {
                            if (canAfford) {
                              soundFx.click();
                              setSelectedCard(isSelected ? null : cardId);
                            }
                          }}
                          disabled={!canAfford}
                          className={`btn-3d flex flex-col items-center justify-between p-2 rounded-2xl border-2 transition relative cursor-pointer ${
                            isSelected
                              ? 'ring-4 ring-amber-400 border-amber-400 bg-amber-950/60 scale-105'
                              : canAfford
                              ? 'border-purple-500/60 bg-slate-850 hover:scale-105 shadow-lg'
                              : 'border-slate-800 bg-slate-950 opacity-50 cursor-not-allowed'
                          }`}
                        >
                          {/* Elixir Cost Badge */}
                          <div className="absolute -top-2 -left-2 bg-purple-600 text-white font-mono font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center border border-white shadow">
                            {card.cost}
                          </div>

                          <div className="text-2xl mt-1">{card.emoji}</div>
                          <div className="text-[9px] font-extrabold text-white text-center leading-tight truncate w-full mt-1">
                            {card.name}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Combat Chronicle Log */}
            <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-4 shadow-xl flex-1 flex flex-col max-h-48">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>📜 Chronique de Bataille</span>
                <span className="font-mono text-[9px] text-slate-500">{gameState?.log?.length ?? 0} entrées</span>
              </h4>
              <div
                ref={logContainerRef}
                className="overflow-y-auto space-y-1 font-mono text-[10px] text-slate-300 pr-1 flex-1"
              >
                {gameState?.log?.map((entry, idx) => (
                  <div key={idx} className="border-b border-slate-850/60 pb-0.5 last:border-none">
                    {entry}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── VICTORY MODAL ──────────────────────────────────────────────────── */}
      {gameState?.status === 'FINISHED' && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border-4 border-amber-500 p-8 rounded-3xl max-w-md w-full text-center shadow-2xl">
            <div className="text-6xl mb-3 animate-bounce">👑</div>
            <h2 className="text-2xl font-black text-white uppercase tracking-wider mb-1">Fin du Duel !</h2>
            
            {gameState.winnerTeam === 'DRAW' ? (
              <p className="text-sm text-slate-300 mb-6 font-bold">Match Nul héroïque ! Les défenses ont tenu bon.</p>
            ) : (
              <div className="my-6">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Vainqueur suprême de l'arène :</p>
                <div className={`text-2xl font-black p-4 rounded-2xl border-2 ${
                  gameState.winnerTeam === 'blue' 
                    ? 'bg-blue-950/60 text-blue-300 border-blue-500' 
                    : 'bg-red-950/60 text-red-300 border-red-500'
                }`}>
                  {gameState.winnerUsername} ({gameState.winnerTeam === 'blue' ? 'Camp Bleu 🔷' : 'Camp Rouge 🔴'})
                </div>
                <div className="text-xs text-amber-400 font-mono mt-3 font-bold">
                  Score final : {gameState.blueScore} - {gameState.redScore} Couronnes
                </div>
              </div>
            )}

            {isHost ? (
              <button
                onClick={handleResetGame}
                className="btn-3d-amber w-full py-3.5 rounded-xl font-black text-sm text-slate-950 cursor-pointer shadow-xl"
              >
                Rejouer un Duel 🔄
              </button>
            ) : (
              <div className="text-xs text-slate-500 italic">En attente de l'hôte pour relancer...</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
