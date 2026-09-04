import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { soundFx } from './utils/audio';

const SERVER_URL = import.meta.env.VITE_WS_SERVER_URL || import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

export type SumoPlayerSide = 'left' | 'right';
export type SumoEventState = 'NORMAL' | 'FEINT' | 'TURBO' | 'SWITCH_WARNING';
export type GameMode = 'ONLINE' | 'LOCAL' | 'AI';
export type AIDifficulty = 'EASY' | 'MEDIUM' | 'HARD' | 'CYBORG';

export interface SumoPlayer {
  id: string;
  username: string;
  side: SumoPlayerSide;
  color: string;
  score: number;
  currentKey: string;
  cps: number;
  isStunned: boolean;
  stunTimer: number;
  totalPushes: number;
}

export interface SumoGameState {
  status: 'LOBBY' | 'COUNTDOWN' | 'PLAYING' | 'ROUND_END' | 'MATCH_FINISHED';
  roomCode: string;
  players: SumoPlayer[];
  position: number; // 0 to 100, 50 is center. >= 100: Left wins, <= 0: Right wins
  targetScore: number;
  currentRound: number;
  countdown: number;
  eventState: SumoEventState;
  eventTimer: number;
  lastEventNotice: string | null;
  roundWinner: SumoPlayerSide | null;
  matchWinner: SumoPlayerSide | null;
}

// Procedural Taiko Drum & Gong Audio Synth
class SumoAudio {
  private ctx: AudioContext | null = null;

  private getContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // Deep Taiko Drum Boom on Push
  playTaiko(side: SumoPlayerSide) {
    if (soundFx.isMuted()) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    const baseFreq = side === 'left' ? 95 : 85;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  }

  // Gong Chime for Key Switch
  playGong() {
    if (soundFx.isMuted()) return;
    const ctx = this.getContext();
    if (!ctx) return;

    [260, 390, 520].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(0.25 / (i + 1), ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.8);
    });
  }

  // Comic Fumble / Slip sound
  playSlip() {
    if (soundFx.isMuted()) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(120, ctx.currentTime + 0.25);

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  }
}

const sumoAudio = new SumoAudio();

export default function SumoApp() {
  const navigate = useNavigate();

  // Mode Selection
  const [gameMode, setGameMode] = useState<GameMode>('LOCAL');
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>('MEDIUM');

  // Socket & Online State
  const [socket, setSocket] = useState<Socket | null>(null);
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [joined, setJoined] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Local / AI Engine State (Mirroring the server state format)
  const [gameState, setGameState] = useState<SumoGameState>({
    status: 'LOBBY',
    roomCode: 'LOCAL',
    players: [
      {
        id: 'p1',
        username: 'Joueur Bleu',
        side: 'left',
        color: '#3B82F6',
        score: 0,
        currentKey: 'A',
        cps: 0,
        isStunned: false,
        stunTimer: 0,
        totalPushes: 0
      },
      {
        id: 'p2',
        username: 'Joueur Rouge',
        side: 'right',
        color: '#EF4444',
        score: 0,
        currentKey: 'P',
        cps: 0,
        isStunned: false,
        stunTimer: 0,
        totalPushes: 0
      }
    ],
    position: 50,
    targetScore: 3,
    currentRound: 1,
    countdown: 3,
    eventState: 'NORMAL',
    eventTimer: 0,
    lastEventNotice: null,
    roundWinner: null,
    matchWinner: null
  });

  // Track key presses timestamps for local CPS calculation
  const p1Timestamps = useRef<number[]>([]);
  const p2Timestamps = useRef<number[]>([]);

  // Push animation squish triggers
  const [leftPushPulse, setLeftPushPulse] = useState(false);
  const [rightPushPulse, setRightPushPulse] = useState(false);

  // ─── ONLINE SOCKET CONNECTION ───────────────────────────────────────────────

  useEffect(() => {
    if (gameMode !== 'ONLINE') return;

    const s = io(SERVER_URL);
    setSocket(s);

    s.on('connect', () => {
      setErrorMsg(null);
    });

    s.on('connect_error', (err) => {
      console.warn('[Sumo] Erreur socket:', err);
    });

    s.on('sumoStateUpdate', (newState: SumoGameState) => {
      setJoined(true);
      setErrorMsg(null);
      setGameState(newState);
    });

    s.on('error', (msg: string) => {
      setErrorMsg(msg);
    });

    return () => {
      s.disconnect();
    };
  }, [gameMode]);

  const handleJoinOnline = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socket || !usernameInput.trim() || !roomCodeInput.trim()) return;
    setErrorMsg(null);
    soundFx.click();

    socket.emit('joinGame', {
      username: usernameInput.trim(),
      roomCode: roomCodeInput.trim(),
      gameType: 'sumo'
    });
  };

  const handleStartOnlineGame = () => {
    if (!socket) return;
    soundFx.click();
    socket.emit('sumo:startGame');
  };

  const handleResetOnlineGame = () => {
    if (!socket) return;
    soundFx.click();
    socket.emit('sumo:resetMatch');
  };

  // ─── LOCAL & AI GAME ENGINE LOOP ───────────────────────────────────────────

  const pickLocalKeys = useCallback(() => {
    const leftKeys = ['A', 'Z', 'E', 'Q', 'S', 'D', 'W', 'ESPACE'];
    const rightKeys = ['I', 'O', 'P', 'J', 'K', 'L', 'Flèche Haut', 'ESPACE'];

    setGameState(prev => {
      const p1Current = prev.players[0]?.currentKey;
      const p2Current = prev.players[1]?.currentKey;

      const filteredLeft = leftKeys.filter(k => k !== p1Current);
      const filteredRight = rightKeys.filter(k => k !== p2Current);

      const k1 = filteredLeft[Math.floor(Math.random() * filteredLeft.length)];
      const k2 = filteredRight[Math.floor(Math.random() * filteredRight.length)];

      return {
        ...prev,
        players: [
          { ...prev.players[0], currentKey: k1 },
          { ...prev.players[1], currentKey: k2 }
        ]
      };
    });
    sumoAudio.playGong();
  }, []);

  const startLocalMatch = () => {
    soundFx.click();
    p1Timestamps.current = [];
    p2Timestamps.current = [];

    setGameState(prev => ({
      ...prev,
      status: 'COUNTDOWN',
      countdown: 3,
      position: 50,
      currentRound: 1,
      roundWinner: null,
      matchWinner: null,
      lastEventNotice: null,
      players: [
        { ...prev.players[0], score: 0, isStunned: false, stunTimer: 0, totalPushes: 0 },
        {
          ...prev.players[1],
          username: gameMode === 'AI' ? `IA (${aiDifficulty})` : 'Joueur Rouge',
          score: 0,
          isStunned: false,
          stunTimer: 0,
          totalPushes: 0
        }
      ]
    }));
    pickLocalKeys();
  };

  const startLocalRound = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      status: 'PLAYING',
      position: 50,
      roundWinner: null,
      eventState: 'NORMAL',
      eventTimer: 0,
      lastEventNotice: 'HAKKEYOI ! POUSSEZ !',
      players: prev.players.map(p => ({ ...p, isStunned: false, stunTimer: 0 }))
    }));
    pickLocalKeys();
  }, [pickLocalKeys]);

  const handleLocalRoundWon = useCallback((winnerSide: SumoPlayerSide) => {
    soundFx.victory();
    setGameState(prev => {
      const winner = prev.players.find(p => p.side === winnerSide);
      const newScore = (winner?.score || 0) + 1;
      const updatedPlayers = prev.players.map(p =>
        p.side === winnerSide ? { ...p, score: newScore } : p
      );

      const isMatchOver = newScore >= prev.targetScore;

      return {
        ...prev,
        status: isMatchOver ? 'MATCH_FINISHED' : 'ROUND_END',
        roundWinner: winnerSide,
        matchWinner: isMatchOver ? winnerSide : null,
        lastEventNotice: isMatchOver
          ? `🏆 VICTOIRE SUPRÊME ! ${winner?.username} EST LE YOKOZUNA !`
          : `💥 SORTIE DE RING ! ${winner?.username} remporte la manche !`,
        players: updatedPlayers
      };
    });

    setTimeout(() => {
      setGameState(prev => {
        if (prev.status === 'ROUND_END') {
          return {
            ...prev,
            status: 'COUNTDOWN',
            countdown: 3,
            position: 50,
            currentRound: prev.currentRound + 1
          };
        }
        return prev;
      });
    }, 3000);
  }, []);

  // Real-time Local Engine Loop (Countdown, Event cycle, Gravity, Timers)
  useEffect(() => {
    if (gameMode === 'ONLINE') return;

    let nextKeySwitchTimer = 5 + Math.random() * 10; // Exactly 5s to 15s
    let nextSpecialEventTimer = 7 + Math.random() * 8;

    const loop = setInterval(() => {
      const dt = 0.05;
      const now = Date.now();

      // Clean CPS timestamps
      p1Timestamps.current = p1Timestamps.current.filter(t => now - t <= 1000);
      p2Timestamps.current = p2Timestamps.current.filter(t => now - t <= 1000);

      setGameState(prev => {
        // CPS update
        const updatedPlayers = prev.players.map(p => {
          const cps = p.side === 'left' ? p1Timestamps.current.length : p2Timestamps.current.length;
          let newStunTimer = p.stunTimer;
          let isStunned = p.isStunned;

          if (isStunned) {
            newStunTimer -= dt;
            if (newStunTimer <= 0) {
              isStunned = false;
              newStunTimer = 0;
            }
          }
          return { ...p, cps, isStunned, stunTimer: newStunTimer };
        });

        // 1. COUNTDOWN STATE
        if (prev.status === 'COUNTDOWN') {
          const newCd = prev.countdown - dt;
          if (newCd <= 0) {
            startLocalRound();
            nextKeySwitchTimer = 5 + Math.random() * 10;
            nextSpecialEventTimer = 7 + Math.random() * 8;
          }
          return { ...prev, countdown: newCd, players: updatedPlayers };
        }

        // 2. PLAYING STATE
        if (prev.status === 'PLAYING') {
          let pos = prev.position;

          // Check round victory
          if (pos >= 100) {
            handleLocalRoundWon('left');
            return { ...prev, position: 100, players: updatedPlayers };
          }
          if (pos <= 0) {
            handleLocalRoundWon('right');
            return { ...prev, position: 0, players: updatedPlayers };
          }

          // Center drift
          const diff = pos - 50;
          if (Math.abs(diff) > 2) {
            pos -= Math.sign(diff) * 0.15 * dt * 8;
          }

          // Active event countdown
          let evState = prev.eventState;
          let evTimer = prev.eventTimer;
          let notice = prev.lastEventNotice;

          if (evTimer > 0) {
            evTimer -= dt;
            if (evTimer <= 0) {
              evState = 'NORMAL';
              evTimer = 0;
              notice = null;
            }
          }

          // 1. DEDICATED KEY SWITCH TIMER (Every 5s to 15s)
          nextKeySwitchTimer -= dt;
          if (nextKeySwitchTimer <= 0) {
            pickLocalKeys();
            evState = 'SWITCH_WARNING';
            evTimer = 1.0;
            notice = '⚠️ SWITCH ! NOUVELLE TOUCHE !';
            nextKeySwitchTimer = 5 + Math.random() * 10; // Reset between 5s and 15s
          }

          // 2. SPECIAL EVENT TIMER (Feinte ou Turbo)
          if (evTimer <= 0) {
            nextSpecialEventTimer -= dt;
            if (nextSpecialEventTimer <= 0) {
              const isFeint = Math.random() < 0.6;
              if (isFeint) {
                sumoAudio.playSlip();
                evState = 'FEINT';
                evTimer = 1.3;
                notice = '🚫 FEINTE DU GYŌJI ! NE TOUCHEZ À RIEN !';
              } else {
                soundFx.attack();
                evState = 'TURBO';
                evTimer = 2.2;
                notice = '⚡ RAFALE TSUPPARI X3 ! SPAMMEZ !';
              }
              nextSpecialEventTimer = 8 + Math.random() * 8;
            }
          }

          return {
            ...prev,
            position: pos,
            eventState: evState,
            eventTimer: evTimer,
            lastEventNotice: notice,
            players: updatedPlayers
          };
        }

        return { ...prev, players: updatedPlayers };
      });
    }, 50);

    return () => clearInterval(loop);
  }, [gameMode, handleLocalRoundWon, pickLocalKeys, startLocalRound]);

  // AI Opponent simulation loop (When in AI mode)
  useEffect(() => {
    if (gameMode !== 'AI' || gameState.status !== 'PLAYING') return;

    // AI CPS speed based on difficulty:
    // EASY: 5 CPS, reacts slowly to switch, 50% chance to fall for feints
    // MEDIUM: 9 CPS, 20% chance to fall for feints
    // HARD: 15 CPS, rarely falls for feints
    // CYBORG: 22 CPS, machine accuracy
    const cpsTarget =
      aiDifficulty === 'EASY' ? 5 : aiDifficulty === 'MEDIUM' ? 9 : aiDifficulty === 'HARD' ? 15 : 22;
    const intervalMs = Math.round(1000 / cpsTarget);

    const aiInterval = setInterval(() => {
      // Check if in FEINT
      if (gameState.eventState === 'FEINT') {
        const fallChance = aiDifficulty === 'EASY' ? 0.6 : aiDifficulty === 'MEDIUM' ? 0.25 : 0.05;
        if (Math.random() < fallChance) {
          handleLocalPush('right', gameState.players[1].currentKey);
        }
        return;
      }

      handleLocalPush('right', gameState.players[1].currentKey);
    }, intervalMs);

    return () => clearInterval(aiInterval);
  }, [gameMode, gameState.status, gameState.eventState, gameState.players, aiDifficulty]);

  // ─── PUSH HANDLERS (LOCAL & ONLINE) ─────────────────────────────────────────

  const handleLocalPush = (side: SumoPlayerSide, pressedKey: string) => {
    if (gameState.status !== 'PLAYING') return;

    const player = gameState.players.find(p => p.side === side);
    if (!player || player.isStunned) return;

    if (side === 'left') {
      p1Timestamps.current.push(Date.now());
      setLeftPushPulse(true);
      setTimeout(() => setLeftPushPulse(false), 80);
    } else {
      p2Timestamps.current.push(Date.now());
      setRightPushPulse(true);
      setTimeout(() => setRightPushPulse(false), 80);
    }

    // 1. FEINTE CHECK: If player pushed during a FEINT, they fumble!
    if (gameState.eventState === 'FEINT') {
      sumoAudio.playSlip();
      setGameState(prev => {
        const penalty = 8;
        const pos = side === 'left' ? Math.max(0, prev.position - penalty) : Math.min(100, prev.position + penalty);
        const updated = prev.players.map(p =>
          p.side === side ? { ...p, isStunned: true, stunTimer: 0.8 } : p
        );
        return {
          ...prev,
          position: pos,
          lastEventNotice: `⚠️ FEINTE SUBIE ! ${player.username} a trébuché !`,
          players: updated
        };
      });
      return;
    }

    // 2. WRONG KEY CHECK
    const normExpected = player.currentKey.trim().toUpperCase();
    const normPressed = pressedKey.trim().toUpperCase();

    const matches =
      (normExpected === 'ESPACE' && (normPressed === ' ' || normPressed === 'SPACE' || normPressed === 'ESPACE')) ||
      (normExpected === 'FLÈCHE HAUT' && (normPressed === 'ARROWUP' || normPressed === 'FLÈCHE HAUT')) ||
      (normExpected === 'FLÈCHE DROITE' && (normPressed === 'ARROWRIGHT' || normPressed === 'FLÈCHE DROITE')) ||
      (normExpected === 'ENTRÉE' && (normPressed === 'ENTER' || normPressed === 'ENTRÉE')) ||
      normExpected === normPressed;

    if (!matches) {
      sumoAudio.playSlip();
      setGameState(prev => {
        const slip = 3.0;
        const pos = side === 'left' ? Math.max(0, prev.position - slip) : Math.min(100, prev.position + slip);
        const updated = prev.players.map(p =>
          p.side === side ? { ...p, isStunned: true, stunTimer: 0.35 } : p
        );
        return { ...prev, position: pos, players: updated };
      });
      return;
    }

    // 3. SUCCESSFUL PUSH
    sumoAudio.playTaiko(side);
    const pushPower = gameState.eventState === 'TURBO' ? 4.5 : 1.7;

    setGameState(prev => {
      const pos = side === 'left' ? Math.min(100, prev.position + pushPower) : Math.max(0, prev.position - pushPower);
      const updated = prev.players.map(p =>
        p.side === side ? { ...p, totalPushes: p.totalPushes + 1 } : p
      );
      return { ...prev, position: pos, players: updated };
    });
  };

  // Keyboard Event Listener for inputs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid firing if typing in form inputs
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;

      const key = e.key.toUpperCase();

      if (gameMode === 'ONLINE') {
        if (!socket || gameState.status !== 'PLAYING') return;
        socket.emit('sumo:push', { key: e.key });
      } else {
        // In Local / AI mode: check both players keys
        const p1Key = gameState.players[0]?.currentKey.toUpperCase();
        const p2Key = gameState.players[1]?.currentKey.toUpperCase();

        const isP1 =
          (p1Key === 'ESPACE' && e.code === 'Space') ||
          (p1Key === key) ||
          ['A', 'Z', 'E', 'Q', 'S', 'D', 'W', 'X'].includes(key);

        const isP2 =
          (p2Key === 'FLÈCHE HAUT' && e.code === 'ArrowUp') ||
          (p2Key === 'FLÈCHE DROITE' && e.code === 'ArrowRight') ||
          (p2Key === key) ||
          ['I', 'O', 'P', 'J', 'K', 'L', 'M'].includes(key);

        if (isP1) {
          handleLocalPush('left', e.key);
        } else if (isP2 && gameMode === 'LOCAL') {
          handleLocalPush('right', e.key);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameMode, socket, gameState.status, gameState.players]);

  const p1 = gameState.players[0] || null;
  const p2 = gameState.players[1] || null;

  // Visual displacement offset for sumos based on position (0 to 100, 50 center)
  // -300px to +300px
  const dohyoOffsetPx = (gameState.position - 50) * 4.5;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-x-hidden">
      {/* ─── HEADER ──────────────────────────────────────────────────────────── */}
      <header className="bg-slate-900/90 border-b border-slate-800 px-4 py-3 flex items-center justify-between shadow-2xl sticky top-0 z-40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { soundFx.click(); navigate('/'); }}
            className="btn-3d text-xs py-1.5 px-3 rounded-lg text-slate-300 hover:text-white cursor-pointer"
          >
            ← Accueil
          </button>
          <div className="flex items-center gap-2">
            <span className="text-2xl animate-bounce">🤼</span>
            <div>
              <h1 className="font-extrabold text-sm tracking-wide text-white uppercase flex items-center gap-2">
                <span>Sumo Smash</span>
                <span className="text-[10px] bg-red-500/20 text-red-300 border border-red-500/40 px-2 py-0.5 rounded font-mono">
                  1V1 SPAM TUG-OF-WAR ⚡
                </span>
              </h1>
              <div className="text-[10px] text-slate-400 font-serif">
                Manche {gameState.currentRound} / 5 • Premier à 3 Victoires !
              </div>
            </div>
          </div>
        </div>

        {/* Mode switcher tabs in header */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold">
          <button
            onClick={() => { soundFx.click(); setGameMode('LOCAL'); }}
            className={`px-3 py-1 rounded-lg transition cursor-pointer ${
              gameMode === 'LOCAL' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            1 Écran (Local)
          </button>
          <button
            onClick={() => { soundFx.click(); setGameMode('AI'); }}
            className={`px-3 py-1 rounded-lg transition cursor-pointer ${
              gameMode === 'AI' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Solo vs IA 🤖
          </button>
          <button
            onClick={() => { soundFx.click(); setGameMode('ONLINE'); }}
            className={`px-3 py-1 rounded-lg transition cursor-pointer ${
              gameMode === 'ONLINE' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            En Ligne 🌐
          </button>
        </div>

        {/* Sound toggle */}
        <button
          onClick={() => soundFx.toggleMute()}
          className="text-slate-400 hover:text-white text-xs bg-slate-800 p-2 rounded-lg border border-slate-700 cursor-pointer"
        >
          🔊
        </button>
      </header>

      {/* ─── ONLINE JOIN FORM (IF ONLINE MODE AND NOT JOINED) ─────────────────── */}
      {gameMode === 'ONLINE' && (!joined || gameState.status === 'LOBBY') ? (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-red-500/50 p-8 rounded-3xl max-w-md w-full shadow-2xl relative text-center">
            <div className="text-6xl mb-2 animate-bounce">🤼</div>
            <h2 className="text-2xl font-black text-white uppercase tracking-wider">Arène Sumo En Ligne</h2>
            <p className="text-xs text-slate-400 mt-1 mb-6">Duel de spam de touches en direct avec feintes et QTE !</p>

            {errorMsg && (
              <div className="bg-red-950 border border-red-800 text-red-200 text-xs py-2 px-3 rounded-xl mb-4 font-bold">
                ⚠️ {errorMsg}
              </div>
            )}

            {!joined ? (
              <form onSubmit={handleJoinOnline} className="space-y-4 text-left">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Votre Nom de Rikishi</label>
                  <input
                    type="text"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="Ex: Hakuho"
                    maxLength={15}
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Code du Salon</label>
                  <input
                    type="text"
                    value={roomCodeInput}
                    onChange={(e) => setRoomCodeInput(e.target.value)}
                    placeholder="Ex: DOHYO1"
                    maxLength={10}
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white uppercase font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <button
                  type="submit"
                  className="btn-3d-amber w-full py-3.5 rounded-xl font-bold text-sm tracking-wider cursor-pointer text-slate-950 shadow-lg mt-2"
                >
                  Entrer dans le Dohyo ➔
                </button>
              </form>
            ) : (
              <div>
                <p className="text-xs text-slate-400 mb-4 font-mono">Salon : <strong className="text-amber-400">{gameState.roomCode}</strong></p>
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="bg-blue-950/60 border-2 border-blue-500 p-3 rounded-2xl">
                    <span className="text-[10px] text-blue-300 font-bold uppercase block">Sumo Bleu 🔷</span>
                    <span className="font-extrabold text-sm text-white">{p1?.username || 'En attente...'}</span>
                  </div>
                  <div className="bg-red-950/60 border-2 border-red-500 p-3 rounded-2xl">
                    <span className="text-[10px] text-red-300 font-bold uppercase block">Sumo Rouge 🔴</span>
                    <span className="font-extrabold text-sm text-white">{p2?.username || 'En attente...'}</span>
                  </div>
                </div>

                {gameState.players.length >= 2 ? (
                  <button
                    onClick={handleStartOnlineGame}
                    className="btn-3d-amber w-full py-3.5 rounded-xl font-black text-sm text-slate-950 shadow-xl cursor-pointer"
                  >
                    Lancer le Combat ⚔️
                  </button>
                ) : (
                  <div className="text-xs text-slate-400 italic">En attente d'un adversaire...</div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ─── MAIN ARENA VIEW (LOCAL, AI & ACTIVE ONLINE) ──────────────────────── */
        <div className="flex-1 flex flex-col items-center justify-between p-3 sm:p-6 max-w-5xl mx-auto w-full">
          {/* Top Scoreboard & Crowns */}
          <div className="w-full flex items-center justify-between bg-slate-900/90 border-2 border-slate-800 rounded-3xl p-4 shadow-xl mb-4">
            {/* Player 1 Info (Left / Blue) */}
            <div className="flex items-center gap-3">
              <div className="text-3xl bg-blue-950/80 p-2 rounded-2xl border-2 border-blue-500">🔷</div>
              <div>
                <div className="font-black text-sm text-blue-400 flex items-center gap-2">
                  <span>{p1?.username || 'Joueur 1'}</span>
                  <span className="text-[10px] bg-blue-500/20 px-2 py-0.5 rounded font-mono">
                    {p1?.cps || 0} CPS
                  </span>
                </div>
                <div className="flex gap-1.5 mt-1">
                  {[...Array(gameState.targetScore)].map((_, i) => (
                    <span key={i} className="text-base">{i < (p1?.score || 0) ? '👑' : '⚪'}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Middle Event Banner */}
            <div className="text-center px-4">
              {gameState.status === 'COUNTDOWN' ? (
                <div className="text-3xl sm:text-4xl font-black text-amber-400 animate-ping font-mono">
                  {Math.ceil(gameState.countdown)}
                </div>
              ) : gameState.eventState === 'FEINT' ? (
                <div className="bg-red-600/90 text-white font-black text-xs sm:text-sm px-4 py-1.5 rounded-full border-2 border-white shadow-xl animate-bounce">
                  🚫 FEINTE ! NE TOUCHEZ À RIEN !
                </div>
              ) : gameState.eventState === 'TURBO' ? (
                <div className="bg-amber-500 text-slate-950 font-black text-xs sm:text-sm px-4 py-1.5 rounded-full border-2 border-white shadow-xl animate-pulse">
                  ⚡ RAFALE TSUPPARI X3 !
                </div>
              ) : gameState.eventState === 'SWITCH_WARNING' ? (
                <div className="bg-yellow-500 text-slate-950 font-black text-xs sm:text-sm px-4 py-1.5 rounded-full border-2 border-white shadow-xl animate-bounce">
                  ⚠️ SWITCH ! NOUVELLE TOUCHE !
                </div>
              ) : (
                <div className="font-serif italic text-xs text-slate-400">
                  {gameState.lastEventNotice || 'HAKKEYOI ! POUSSEZ !'}
                </div>
              )}
            </div>

            {/* Player 2 Info (Right / Red) */}
            <div className="flex items-center gap-3 flex-row-reverse text-right">
              <div className="text-3xl bg-red-950/80 p-2 rounded-2xl border-2 border-red-500">🔴</div>
              <div>
                <div className="font-black text-sm text-red-400 flex items-center gap-2 justify-end">
                  <span className="text-[10px] bg-red-500/20 px-2 py-0.5 rounded font-mono">
                    {p2?.cps || 0} CPS
                  </span>
                  <span>{p2?.username || 'Joueur 2'}</span>
                </div>
                <div className="flex gap-1.5 mt-1 justify-end">
                  {[...Array(gameState.targetScore)].map((_, i) => (
                    <span key={i} className="text-base">{i < (p2?.score || 0) ? '👑' : '⚪'}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ─── THE DOHYO ARENA (SAND RING WITH COLLIDING SUMOS) ───────────── */}
          <div className="w-full relative bg-gradient-to-b from-amber-950/40 via-stone-900 to-amber-950/60 border-4 border-amber-600/50 rounded-3xl p-6 shadow-2xl h-72 sm:h-80 flex flex-col justify-between overflow-hidden">
            {/* Dohyo Sacred Circular Ropes Background */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
              <div className="w-[500px] h-[500px] rounded-full border-8 border-dashed border-amber-300/40" />
            </div>

            {/* Central Ring-Out Warning Lines */}
            <div className="absolute left-6 top-0 bottom-0 w-2 bg-red-600/60 pointer-events-none" />
            <div className="absolute right-6 top-0 bottom-0 w-2 bg-red-600/60 pointer-events-none" />

            {/* Top Tension Tug-of-War Gauge */}
            <div className="relative w-full bg-slate-950 h-5 rounded-full overflow-hidden border-2 border-slate-800 p-0.5 shadow-inner">
              {/* Blue Push Progress */}
              <div
                className="h-full bg-gradient-to-r from-blue-600 via-cyan-400 to-amber-400 transition-all duration-75 shadow"
                style={{ width: `${gameState.position}%` }}
              />
              {/* Center Line Marker */}
              <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-white shadow pointer-events-none transform -translate-x-1/2" />
            </div>

            {/* ─── ANIMATED GRAPPLING SUMOS ───────────────────────────────── */}
            <div className="relative flex-1 flex items-center justify-center">
              <div
                className="relative flex items-center gap-2 transition-transform duration-75"
                style={{ transform: `translateX(${dohyoOffsetPx}px)` }}
              >
                {/* BLUE SUMO (LEFT) */}
                <div
                  className={`flex flex-col items-center transition-transform duration-75 select-none ${
                    leftPushPulse ? 'scale-110 -rotate-6' : ''
                  } ${p1?.isStunned ? 'opacity-50 animate-pulse' : ''}`}
                >
                  {p1?.isStunned && <span className="text-xl animate-spin mb-1">💫</span>}
                  <div className="relative">
                    <span className="text-6xl sm:text-7xl drop-shadow-xl filter">🤼</span>
                    <div className="absolute -bottom-1 -left-2 bg-blue-600 text-white font-mono font-black text-[9px] px-1.5 rounded-full border border-white">
                      🔷
                    </div>
                  </div>
                  <span className="text-[10px] font-black text-blue-300 font-mono mt-1">
                    {p1?.username}
                  </span>
                </div>

                {/* CLASH IMPACT SPARK EMITTER */}
                <div className="text-3xl sm:text-4xl animate-pulse pointer-events-none">
                  {gameState.eventState === 'TURBO' ? '🔥' : '💥'}
                </div>

                {/* RED SUMO (RIGHT) */}
                <div
                  className={`flex flex-col items-center transition-transform duration-75 select-none ${
                    rightPushPulse ? 'scale-110 rotate-6' : ''
                  } ${p2?.isStunned ? 'opacity-50 animate-pulse' : ''}`}
                >
                  {p2?.isStunned && <span className="text-xl animate-spin mb-1">💫</span>}
                  <div className="relative transform -scale-x-100">
                    <span className="text-6xl sm:text-7xl drop-shadow-xl filter">🤼</span>
                    <div className="absolute -bottom-1 -right-2 bg-red-600 text-white font-mono font-black text-[9px] px-1.5 rounded-full border border-white">
                      🔴
                    </div>
                  </div>
                  <span className="text-[10px] font-black text-red-300 font-mono mt-1">
                    {p2?.username}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Dohyo Ring-Out Labels */}
            <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 font-bold px-4 pointer-events-none">
              <span className="text-red-400">◄ LIGNE DE DÉFAITE BLEUE</span>
              <span className="text-amber-400 font-serif">DOHYO CENTRAL</span>
              <span className="text-blue-400">LIGNE DE DÉFAITE ROUGE ►</span>
            </div>
          </div>

          {/* ─── DYNAMIC BUTTON MASHER DOCKS ─────────────────────────────────── */}
          <div className="w-full grid grid-cols-2 gap-4 sm:gap-8 mt-4">
            {/* PLAYER 1 PUSH DOCK (LEFT / BLUE) */}
            <div className="flex flex-col items-center">
              <div className="text-xs font-bold text-blue-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                <span>Joueur 1 (Bleu)</span>
                {p1?.isStunned && <span className="text-amber-400 font-mono text-[10px]">Étourdi !</span>}
              </div>

              {/* Huge Interactive Touch/Click Button */}
              <button
                onClick={() => handleLocalPush('left', p1?.currentKey || 'A')}
                disabled={p1?.isStunned || gameState.status !== 'PLAYING'}
                className={`w-full max-w-xs h-32 sm:h-36 rounded-3xl border-4 transition-all duration-75 flex flex-col items-center justify-center shadow-2xl cursor-pointer select-none active:scale-90 ${
                  p1?.isStunned
                    ? 'bg-slate-900 border-slate-700 opacity-40 cursor-not-allowed'
                    : gameState.eventState === 'TURBO'
                    ? 'bg-gradient-to-br from-amber-500 to-yellow-600 border-white text-slate-950 animate-pulse'
                    : 'bg-gradient-to-br from-blue-600 to-indigo-800 border-blue-400 text-white hover:brightness-110 shadow-blue-500/50'
                }`}
              >
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-blue-200">
                  {gameState.eventState === 'FEINT' ? '🚫 STOP !' : 'SPAMMEZ LA TOUCHE'}
                </span>
                <span className="text-4xl sm:text-5xl font-black font-mono my-1 tracking-wider">
                  [{p1?.currentKey}]
                </span>
                <span className="text-[10px] font-mono opacity-80">
                  (ou cliquez ici !)
                </span>
              </button>
            </div>

            {/* PLAYER 2 PUSH DOCK (RIGHT / RED) */}
            <div className="flex flex-col items-center">
              <div className="text-xs font-bold text-red-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                <span>{gameMode === 'AI' ? `IA (${aiDifficulty})` : 'Joueur 2 (Rouge)'}</span>
                {p2?.isStunned && <span className="text-amber-400 font-mono text-[10px]">Étourdi !</span>}
              </div>

              {/* Huge Interactive Touch/Click Button */}
              <button
                onClick={() => gameMode === 'LOCAL' && handleLocalPush('right', p2?.currentKey || 'P')}
                disabled={p2?.isStunned || gameState.status !== 'PLAYING' || gameMode === 'AI'}
                className={`w-full max-w-xs h-32 sm:h-36 rounded-3xl border-4 transition-all duration-75 flex flex-col items-center justify-center shadow-2xl cursor-pointer select-none active:scale-90 ${
                  p2?.isStunned
                    ? 'bg-slate-900 border-slate-700 opacity-40 cursor-not-allowed'
                    : gameState.eventState === 'TURBO'
                    ? 'bg-gradient-to-br from-amber-500 to-yellow-600 border-white text-slate-950 animate-pulse'
                    : 'bg-gradient-to-br from-red-600 to-rose-800 border-red-400 text-white hover:brightness-110 shadow-red-500/50'
                }`}
              >
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-red-200">
                  {gameState.eventState === 'FEINT' ? '🚫 STOP !' : gameMode === 'AI' ? "L'IA SPAMME" : 'SPAMMEZ LA TOUCHE'}
                </span>
                <span className="text-4xl sm:text-5xl font-black font-mono my-1 tracking-wider">
                  [{p2?.currentKey}]
                </span>
                <span className="text-[10px] font-mono opacity-80">
                  {gameMode === 'AI' ? '(Automatique)' : '(ou cliquez ici !)'}
                </span>
              </button>
            </div>
          </div>

          {/* ─── BOTTOM CONTROLS & AI DIFFICULTY ─────────────────────────────── */}
          <div className="w-full flex items-center justify-between mt-6 pt-4 border-t border-slate-800">
            {gameMode === 'AI' && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400 uppercase">Difficulté IA :</span>
                {(['EASY', 'MEDIUM', 'HARD', 'CYBORG'] as const).map(diff => (
                  <button
                    key={diff}
                    onClick={() => { soundFx.click(); setAiDifficulty(diff); }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      aiDifficulty === diff ? 'bg-red-600 text-white shadow' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {diff === 'EASY' ? '😴 Facile' : diff === 'MEDIUM' ? '🥋 Moyen' : diff === 'HARD' ? '🏆 Yokozuna' : '🤖 Cyborg'}
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3 ml-auto">
              {gameState.status === 'LOBBY' || gameState.status === 'MATCH_FINISHED' ? (
                <button
                  onClick={gameMode === 'ONLINE' ? handleStartOnlineGame : startLocalMatch}
                  className="btn-3d-amber px-6 py-3 rounded-2xl font-black text-sm text-slate-950 cursor-pointer shadow-xl"
                >
                  Lancer le Combat 🤼
                </button>
              ) : (
                <button
                  onClick={gameMode === 'ONLINE' ? handleResetOnlineGame : startLocalMatch}
                  className="bg-slate-800 hover:bg-slate-750 text-slate-300 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition"
                >
                  Recommencer 🔄
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── MATCH FINISHED VICTORY MODAL ────────────────────────────────────── */}
      {gameState.status === 'MATCH_FINISHED' && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border-4 border-amber-500 p-8 rounded-3xl max-w-md w-full text-center shadow-2xl relative">
            <div className="text-6xl mb-3 animate-bounce">🏆</div>
            <h2 className="text-2xl font-black text-white uppercase tracking-wider mb-1">Le Grand Yokozuna !</h2>
            <p className="text-xs text-slate-400 font-serif mb-6">
              Combat épique terminé au bout de {gameState.currentRound} manches !
            </p>

            <div className={`p-4 rounded-2xl border-2 mb-6 ${
              gameState.matchWinner === 'left' ? 'bg-blue-950/80 border-blue-500 text-blue-300' : 'bg-red-950/80 border-red-500 text-red-300'
            }`}>
              <div className="text-3xl font-black mb-1">
                {gameState.matchWinner === 'left' ? p1?.username : p2?.username}
              </div>
              <div className="text-xs font-mono font-bold text-amber-400">
                Score Final : {p1?.score} - {p2?.score}
              </div>
            </div>

            <button
              onClick={gameMode === 'ONLINE' ? handleResetOnlineGame : startLocalMatch}
              className="btn-3d-amber w-full py-3.5 rounded-xl font-black text-sm text-slate-950 cursor-pointer shadow-xl"
            >
              Rejouer une Revanche 🔄
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
