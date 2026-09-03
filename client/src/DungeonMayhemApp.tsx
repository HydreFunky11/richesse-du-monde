import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import { soundFx } from './utils/audio';

const SERVER_URL = import.meta.env.VITE_WS_SERVER_URL || 'http://localhost:3001';

export type CharacterClass = 'barbarian' | 'paladin' | 'rogue' | 'wizard';

interface CharacterInfo {
  id: CharacterClass;
  name: string;
  title: string;
  avatar: string;
  color: string;
  badgeColor: string;
  borderColor: string;
  bgGradient: string;
  description: string;
  playstyle: string;
}

const CHARACTERS: Record<CharacterClass, CharacterInfo> = {
  barbarian: {
    id: 'barbarian',
    name: 'Sutha le Barbare',
    title: 'Le Briseur de Crânes',
    avatar: '👹',
    color: '#EF4444',
    badgeColor: 'bg-red-500/20 text-red-300 border-red-500/30',
    borderColor: 'border-red-500',
    bgGradient: 'from-red-950/60 to-slate-900',
    description: 'Une force brute dévastatrice. Inflige des dégâts colossaux et pulvérise les boucliers.',
    playstyle: 'Attaque & Dégâts bruts',
  },
  paladin: {
    id: 'paladin',
    name: 'Lia la Paladine',
    title: "L'Éclatante",
    avatar: '🧝‍♀️',
    color: '#F59E0B',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    borderColor: 'border-amber-500',
    bgGradient: 'from-amber-950/60 to-slate-900',
    description: 'Une gardienne de la lumière. Maîtrise les soins sacrés et dresse des boucliers impénétrables.',
    playstyle: 'Défense & Soins',
  },
  rogue: {
    id: 'rogue',
    name: 'Oriax le Voleur',
    title: 'Le Roublard Futé',
    avatar: '😈',
    color: '#8B5CF6',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    borderColor: 'border-purple-500',
    bgGradient: 'from-purple-950/60 to-slate-900',
    description: 'Vif et insaisissable. Enchaîne les actions, vole des cartes et frappe en traître.',
    playstyle: 'Combos & Vol de cartes',
  },
  wizard: {
    id: 'wizard',
    name: 'Marvon le Magicien',
    title: 'Le Magnifique',
    avatar: '🧙‍♂️',
    color: '#06B6D4',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    borderColor: 'border-cyan-500',
    bgGradient: 'from-cyan-950/60 to-slate-900',
    description: 'Le maître des sorts chaotiques. Pioche des flots de cartes et lance de redoutables Boules de Feu.',
    playstyle: 'Pioche & Dégâts de zone',
  },
};

interface MayhemCard {
  id: string;
  name: string;
  characterClass: CharacterClass;
  type: 'action' | 'defense';
  shieldHp?: number;
  currentShieldHp?: number;
  attack: number;
  heal: number;
  draw: number;
  playAgain: number;
  specialEffect?: 'FIREBALL' | 'SWAP_HP' | 'PICKPOCKET' | 'DESTROY_SHIELD' | 'WAVE_OF_FORCE' | 'RESTORE_SHIELDS';
  description: string;
}

interface MayhemPlayer {
  id: string;
  username: string;
  color: string;
  characterClass: CharacterClass;
  hp: number;
  maxHp: number;
  shields: MayhemCard[];
  hand: MayhemCard[];
  deckCount: number;
  discardCount: number;
  isEliminated: boolean;
}

interface MayhemGameState {
  status: 'LOBBY' | 'PLAYING' | 'FINISHED';
  players: MayhemPlayer[];
  currentPlayerIndex: number;
  playsLeft: number;
  winner: MayhemPlayer | null;
  log: string[];
  lastPlayedCard: {
    card: MayhemCard;
    playerName: string;
  } | null;
}

export default function DungeonMayhemApp() {
  const navigate = useNavigate();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameState, setGameState] = useState<MayhemGameState | null>(null);
  const [username, setUsername] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState('');

  // Targeting state
  const [targetingCard, setTargetingCard] = useState<MayhemCard | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [muted, setMuted] = useState(soundFx.isMuted());
  const prevLastCardRef = useRef<string | null>(null);

  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const s = io(SERVER_URL);
    setSocket(s);

    s.on('mayhemStateUpdate', (state: MayhemGameState) => {
      setGameState(state);
      setJoined(true);
      setError('');

      // Play audio & trigger screen shake on new cards played
      if (state.lastPlayedCard) {
        const cardKey = `${state.lastPlayedCard.playerName}_${state.lastPlayedCard.card.id}_${state.log.length}`;
        if (prevLastCardRef.current !== cardKey) {
          prevLastCardRef.current = cardKey;
          const card = state.lastPlayedCard.card;
          if (card.attack > 0 || card.specialEffect === 'FIREBALL' || card.specialEffect === 'DESTROY_SHIELD') {
            soundFx.attack();
            setIsShaking(true);
            setTimeout(() => setIsShaking(false), 450);
          } else if (card.type === 'defense') {
            soundFx.shield();
          } else if (card.heal > 0) {
            soundFx.heal();
          } else {
            soundFx.playCard();
          }
        }
      }

      if (state.status === 'FINISHED') {
        soundFx.victory();
      }

      // Clear targeting if no longer our turn
      const isMyTurn = state.status === 'PLAYING' && state.players[state.currentPlayerIndex]?.id === s.id;
      if (!isMyTurn || state.playsLeft <= 0) {
        setTargetingCard(null);
      }
    });

    s.on('error', (msg: string) => {
      setError(msg);
    });

    s.on('connect_error', (err) => {
      console.error('[Dungeon Mayhem] Erreur connexion socket:', err);
      setError(`Connexion au serveur impossible : ${err.message}`);
    });

    return () => {
      s.disconnect();
    };
  }, []);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [gameState?.log]);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !roomCode.trim()) return;
    if (!socket || !socket.connected) {
      setError("Connexion au serveur en cours... Réessayez dans un instant.");
      return;
    }
    soundFx.click();
    socket.emit('joinGame', { username, roomCode, gameType: 'mayhem' });
  };

  const handleSelectCharacter = (characterClass: CharacterClass) => {
    if (socket) {
      socket.emit('mayhem:selectCharacter', { characterClass });
    }
  };

  const handleStartGame = () => {
    if (socket) {
      socket.emit('mayhem:startGame');
    }
  };

  const handleEndTurn = () => {
    if (socket) {
      setTargetingCard(null);
      socket.emit('mayhem:endTurn');
    }
  };

  const handleResetGame = () => {
    if (socket) {
      setTargetingCard(null);
      socket.emit('mayhem:resetGame');
    }
  };

  const handleCardClick = (card: MayhemCard) => {
    if (!socket || !gameState || gameState.status !== 'PLAYING') return;
    const me = gameState.players.find((p) => p.id === socket.id);
    const isMyTurn = gameState.players[gameState.currentPlayerIndex]?.id === socket.id;
    if (!isMyTurn || gameState.playsLeft <= 0 || !me) return;

    // Determine if card needs a target
    const aliveOpponents = gameState.players.filter((p) => !p.isEliminated && p.id !== me.id);

    const needsTarget =
      (card.attack > 0 && aliveOpponents.length > 0) ||
      card.specialEffect === 'PICKPOCKET' ||
      card.specialEffect === 'SWAP_HP' ||
      (card.specialEffect === 'DESTROY_SHIELD' && aliveOpponents.some((p) => p.shields.length > 0));

    if (needsTarget) {
      if (targetingCard?.id === card.id) {
        setTargetingCard(null); // toggle off
      } else {
        setTargetingCard(card);
      }
    } else {
      // Play immediately (Defenses, Heals, Draws, Fireball, Wave of force, etc.)
      setTargetingCard(null);
      socket.emit('mayhem:playCard', { cardId: card.id });
    }
  };

  const handleTargetClick = (targetPlayerId: string, targetShieldId?: string) => {
    if (!socket || !targetingCard) return;
    socket.emit('mayhem:playCard', {
      cardId: targetingCard.id,
      targetPlayerId,
      targetShieldId,
    });
    setTargetingCard(null);
  };

  const me = gameState?.players.find((p) => p.id === socket?.id);
  const isHost = gameState && gameState.players[0]?.id === socket?.id;
  const isMyTurn = gameState && gameState.status === 'PLAYING' && gameState.players[gameState.currentPlayerIndex]?.id === socket?.id;
  const activePlayer = gameState && gameState.status === 'PLAYING' ? gameState.players[gameState.currentPlayerIndex] : null;

  // ─── Join View ─────────────────────────────────────────────────────────────

  if (!joined || !gameState) {
    return (
      <div className="min-h-screen bg-dungeon-stone text-slate-100 flex items-center justify-center p-4 relative">
        <div className="bg-stone-950/90 border-2 border-amber-600/40 p-8 rounded-3xl shadow-2xl w-full max-w-md backdrop-blur-sm relative z-10">
          <div className="flex justify-between items-center mb-6">
            <button
              onClick={() => {
                soundFx.click();
                navigate('/');
              }}
              className="text-xs text-amber-400/80 hover:text-amber-300 transition flex items-center gap-1 cursor-pointer font-medieval font-bold"
            >
              ← Accueil
            </button>
            <span className="bg-amber-950 text-amber-300 border border-amber-500/40 text-[10px] uppercase font-bold px-2.5 py-1 rounded-full font-medieval tracking-wider">
              DUNGEON MAYHEM ⚔️
            </span>
          </div>

          <div className="text-center mb-6">
            <div className="text-5xl mb-2 animate-bounce">⚔️</div>
            <h1 className="text-3xl font-medieval font-black tracking-wider bg-gradient-to-r from-amber-300 via-orange-400 to-red-500 bg-clip-text text-transparent">
              Dungeon Mayhem
            </h1>
            <p className="text-slate-400 text-xs mt-1 font-serif italic">
              Bagarre déjantée dans les profondeurs du donjon • 2 à 4 joueurs
            </p>
          </div>

          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-amber-300/90 uppercase tracking-wider mb-1 font-medieval">Votre Pseudo de Combattant</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ex: Conan le Barbare"
                className="w-full bg-stone-900 border border-stone-700 rounded-xl px-4 py-2.5 text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-amber-300/90 uppercase tracking-wider mb-1 font-medieval">Code de l'Arène</label>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                placeholder="Ex: DONJON"
                className="w-full bg-stone-900 border border-stone-700 rounded-xl px-4 py-2.5 text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm uppercase font-mono"
                required
              />
            </div>

            {error && (
              <div className="bg-red-950/60 border border-red-500/40 text-red-300 text-xs p-3 rounded-xl font-mono">
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              onClick={() => soundFx.click()}
              className="btn-3d-amber w-full py-3.5 rounded-xl font-medieval font-black tracking-wider text-sm cursor-pointer shadow-lg mt-2"
            >
              Rejoindre l'Arène ⚔️
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ─── Main App View ─────────────────────────────────────────────────────────

  return (
    <div className={`min-h-screen bg-dungeon-stone text-slate-100 flex flex-col justify-between select-none transition-transform ${isShaking ? 'animate-shake-heavy' : ''}`}>
      {/* Header */}
      <header className="bg-stone-950/90 backdrop-blur border-b border-amber-900/40 px-4 py-3 flex justify-between items-center shadow-2xl z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              soundFx.click();
              navigate('/');
            }}
            className="text-xs bg-stone-900 hover:bg-stone-850 px-3 py-1.5 rounded-xl text-amber-300 border border-amber-500/30 flex items-center gap-1 cursor-pointer transition font-medieval font-bold"
          >
            ← Accueil
          </button>
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚔️</span>
            <span className="font-medieval font-black text-lg tracking-wider bg-gradient-to-r from-amber-300 via-orange-400 to-red-500 bg-clip-text text-transparent">
              Dungeon Mayhem
            </span>
          </div>
          <span className="text-amber-400 text-xs font-mono font-bold bg-stone-900 px-2.5 py-1 rounded-lg border border-amber-500/30">
            Salon : {roomCode.toUpperCase()}
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
            className="bg-stone-900 hover:bg-stone-800 border border-amber-500/30 px-3 py-1.5 rounded-xl text-xs text-amber-200 cursor-pointer transition flex items-center gap-1.5"
            title="Activer / Désactiver les effets sonores"
          >
            <span>{muted ? '🔇' : '🔊'}</span>
            <span className="font-mono text-[10px] hidden sm:inline">{muted ? 'Muet' : 'Audio ON'}</span>
          </button>

          {gameState.status === 'LOBBY' && isHost && (
            <button
              onClick={() => {
                soundFx.click();
                handleStartGame();
              }}
              disabled={gameState.players.length < 2}
              className="btn-3d-amber disabled:opacity-40 disabled:cursor-not-allowed font-medieval font-extrabold text-xs px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5"
            >
              <span>Lancer la Bagarre</span> ⚔️ ({gameState.players.length}/4)
            </button>
          )}

          {gameState.status === 'PLAYING' && isMyTurn && (
            <button
              onClick={() => {
                soundFx.click();
                handleEndTurn();
              }}
              className="btn-3d-red font-medieval font-extrabold text-xs px-3.5 py-2 rounded-xl transition cursor-pointer"
            >
              Fin du tour ⏳
            </button>
          )}

          {gameState.status === 'FINISHED' && isHost && (
            <button
              onClick={() => {
                soundFx.click();
                handleResetGame();
              }}
              className="btn-3d-amber font-medieval font-extrabold text-xs px-4 py-2 rounded-xl transition cursor-pointer"
            >
              Rejouer 🔄
            </button>
          )}
        </div>
      </header>

      {/* Main Body */}
      {gameState.status === 'LOBBY' ? (
        /* ─── LOBBY VIEW ──────────────────────────────────────────────────────── */
        <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-5xl mx-auto w-full">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-extrabold mb-2 text-white">Choisissez votre Héros</h2>
            <p className="text-slate-400 text-xs max-w-lg mx-auto">
              Chaque héros possède son propre deck unique de 28 cartes avec ses tactiques et pouvoirs spéciaux.
            </p>
          </div>

          {/* Characters Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full mb-8">
            {(Object.keys(CHARACTERS) as CharacterClass[]).map((cClass) => {
              const char = CHARACTERS[cClass];
              const isChosenByMe = me?.characterClass === cClass;
              const chosenByPlayer = gameState.players.find((p) => p.characterClass === cClass);
              const isTakenByOther = chosenByPlayer && chosenByPlayer.id !== socket?.id;

              return (
                <div
                  key={cClass}
                  onClick={() => !isTakenByOther && handleSelectCharacter(cClass)}
                  className={`relative p-5 rounded-2xl border-2 transition-all flex flex-col justify-between ${char.bgGradient} ${
                    isChosenByMe
                      ? `${char.borderColor} ring-4 ring-amber-500/30 shadow-2xl scale-[1.02]`
                      : isTakenByOther
                      ? 'border-slate-800 opacity-50 cursor-not-allowed'
                      : 'border-slate-850 hover:border-slate-700 cursor-pointer hover:scale-[1.01]'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-4xl">{char.avatar}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${char.badgeColor}`}>
                        {char.playstyle}
                      </span>
                    </div>

                    <h3 className="text-base font-extrabold text-white">{char.name}</h3>
                    <p className="text-xs text-amber-400/90 font-medium mb-3">{char.title}</p>
                    <p className="text-xs text-slate-300 leading-relaxed mb-4">{char.description}</p>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80">
                    {isChosenByMe ? (
                      <span className="w-full block text-center text-xs font-bold text-green-400 bg-green-950/40 py-1.5 rounded-lg border border-green-500/40">
                        ✓ Votre choix
                      </span>
                    ) : isTakenByOther ? (
                      <span className="w-full block text-center text-xs text-slate-400 font-medium py-1.5">
                        Choisi par <span className="text-white font-bold">{chosenByPlayer.username}</span>
                      </span>
                    ) : (
                      <span className="w-full block text-center text-xs text-slate-400 hover:text-white font-bold py-1.5">
                        Cliquer pour choisir →
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Connected Players list */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-xl shadow-xl">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex justify-between">
              <span>Combattants dans le salon ({gameState.players.length}/4)</span>
              <span className="text-amber-400 font-normal">Min. 2 joueurs</span>
            </h3>

            <div className="space-y-2">
              {gameState.players.map((p, idx) => (
                <div
                  key={p.id}
                  className="bg-slate-850 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{CHARACTERS[p.characterClass].avatar}</span>
                    <div>
                      <span className="font-bold text-white">
                        {p.username} {p.id === socket?.id && <span className="text-amber-400">(Vous)</span>}
                      </span>
                      <div className="text-xs text-slate-400">{CHARACTERS[p.characterClass].name}</div>
                    </div>
                  </div>
                  {idx === 0 && (
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded font-bold uppercase">
                      Hôte
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* ─── PLAYING / ARENA VIEW ────────────────────────────────────────────── */
        <div className="flex-1 flex flex-col justify-between p-4 max-w-7xl mx-auto w-full gap-4 overflow-hidden">
          {/* Top Row: Opponents Dashboard */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {gameState.players
              .filter((p) => p.id !== socket?.id)
              .map((opp) => {
                const char = CHARACTERS[opp.characterClass];
                const isOppTurn = gameState.status === 'PLAYING' && gameState.players[gameState.currentPlayerIndex]?.id === opp.id;
                const canDirectAttack = opp.shields.length === 0 && !opp.isEliminated;

                const isTargetablePlayer =
                  targetingCard &&
                  !opp.isEliminated &&
                  (targetingCard.specialEffect === 'PICKPOCKET' ||
                    targetingCard.specialEffect === 'SWAP_HP' ||
                    (targetingCard.attack > 0 && canDirectAttack));

                return (
                  <div
                    key={opp.id}
                    onClick={() => {
                      if (isTargetablePlayer) handleTargetClick(opp.id);
                    }}
                    className={`relative p-3 rounded-2xl border-2 transition-all flex flex-col justify-between bg-slate-900/90 shadow-lg ${
                      opp.isEliminated
                        ? 'border-slate-850 opacity-40 grayscale'
                        : isOppTurn
                        ? `${char.borderColor} ring-2 ring-amber-500/40 shadow-amber-950/30`
                        : isTargetablePlayer
                        ? 'border-red-500 ring-4 ring-red-500/50 cursor-pointer hover:scale-[1.02] animate-pulse bg-red-950/20'
                        : 'border-slate-800'
                    }`}
                  >
                    {/* Opponent Header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{char.avatar}</span>
                        <div>
                          <div className="font-extrabold text-sm text-white flex items-center gap-1.5">
                            {opp.username}
                            {isOppTurn && (
                              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400">{char.name}</div>
                        </div>
                      </div>

                      {/* Health Indicator */}
                      <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
                        <span className="text-red-400 text-xs">❤️</span>
                        <span className={`font-mono font-extrabold text-sm ${opp.hp <= 3 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
                          {opp.hp}/10
                        </span>
                      </div>
                    </div>

                    {/* Health Bar */}
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mb-3">
                      <div
                        className="h-full bg-gradient-to-r from-red-600 to-green-500 transition-all duration-300"
                        style={{ width: `${(opp.hp / 10) * 100}%` }}
                      />
                    </div>

                    {/* Active Shields Row */}
                    <div className="min-h-[44px] flex flex-wrap gap-1.5 items-center mb-2 bg-slate-950/60 p-1.5 rounded-xl border border-slate-850">
                      {opp.shields.length === 0 ? (
                        <span className="text-[10px] text-slate-500 italic px-2">Aucun bouclier actif</span>
                      ) : (
                        opp.shields.map((sh) => {
                          const isTargetableShield =
                            targetingCard &&
                            !opp.isEliminated &&
                            (targetingCard.attack > 0 || targetingCard.specialEffect === 'DESTROY_SHIELD');

                          return (
                            <div
                              key={sh.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isTargetableShield) handleTargetClick(opp.id, sh.id);
                              }}
                              className={`text-[10px] px-2 py-1 rounded-lg border flex items-center gap-1 font-mono transition ${
                                isTargetableShield
                                  ? 'bg-red-900 text-white border-red-500 cursor-pointer animate-bounce'
                                  : 'bg-slate-850 text-amber-300 border-amber-500/40'
                              }`}
                            >
                              <span>🛡️</span>
                              <span className="font-bold">{sh.name}</span>
                              <span className="bg-slate-900 px-1 rounded text-[9px] text-white">
                                {sh.currentShieldHp}/{sh.shieldHp} PV
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Footer: Cards count */}
                    <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
                      <span>🎴 {opp.hand.length} en main</span>
                      <span>🃏 {opp.deckCount} dans le deck</span>
                      {opp.isEliminated && (
                        <span className="text-red-400 font-bold uppercase">💀 Éliminé</span>
                      )}
                    </div>

                    {/* Targeting Overlay Prompt */}
                    {isTargetablePlayer && (
                      <div className="absolute inset-0 bg-red-600/10 rounded-2xl flex items-center justify-center pointer-events-none">
                        <span className="bg-red-600 text-white text-xs font-extrabold px-3 py-1 rounded-full shadow-lg">
                          🎯 CIBLER CE JOUEUR
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>

          {/* Center Area: Turn indicator & Combat Logs */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Turn status & Action points */}
            <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                    Phase de combat
                  </span>
                  {activePlayer && (
                    <span className="text-xs font-bold text-amber-400">
                      Tour de {activePlayer.username}
                    </span>
                  )}
                </div>

                {isMyTurn ? (
                  <div className="bg-amber-950/30 border border-amber-500/40 rounded-xl p-3 text-center mb-2">
                    <div className="text-xl font-extrabold text-amber-300 flex items-center justify-center gap-2">
                      <span>⚡</span>
                      <span>{gameState.playsLeft} action(s) restante(s)</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {targetingCard
                        ? `🎯 Cliquez sur un adversaire ou un bouclier pour lancer "${targetingCard.name}".`
                        : 'Cliquez sur une carte de votre main pour la jouer.'}
                    </p>
                    {targetingCard && (
                      <button
                        onClick={() => setTargetingCard(null)}
                        className="mt-2 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1 rounded border border-slate-700 cursor-pointer"
                      >
                        Annuler le ciblage ✕
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 text-center text-xs text-slate-400 italic mb-2">
                    ⏳ Attente de {activePlayer?.username}...
                  </div>
                )}
              </div>

              {/* Last Played Card Highlight */}
              {gameState.lastPlayedCard && (
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center gap-3">
                  <span className="text-2xl">🃏</span>
                  <div className="text-xs">
                    <div className="text-slate-400 text-[10px]">Dernière carte jouée par {gameState.lastPlayedCard.playerName} :</div>
                    <div className="font-extrabold text-white">{gameState.lastPlayedCard.card.name}</div>
                    <div className="text-[10px] text-amber-400/90">{gameState.lastPlayedCard.card.description}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Combat Log */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col max-h-44">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                <span>📜 Journal de la Bagarre</span>
                <span className="text-slate-500 font-mono text-[9px]">{gameState.log.length} actions</span>
              </h4>
              <div className="overflow-y-auto space-y-1 font-mono text-[11px] text-slate-300 pr-1 flex-1">
                {gameState.log.map((entry, idx) => (
                  <div key={idx} className="border-b border-slate-850/60 pb-0.5 last:border-none">
                    {entry}
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            </div>
          </div>

          {/* Bottom Area: Current Player Hand & Player Bar */}
          {me && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-2xl flex flex-col gap-3">
              {/* My Stats Banner */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{CHARACTERS[me.characterClass].avatar}</span>
                  <div>
                    <div className="font-extrabold text-base text-white flex items-center gap-2">
                      {me.username} (Vous)
                      <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-normal">
                        {CHARACTERS[me.characterClass].name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                      <span>🃏 Pioche : {me.deckCount}</span>
                      <span>🗑️ Défausse : {me.discardCount}</span>
                    </div>
                  </div>
                </div>

                {/* HP Gauge & Shields */}
                <div className="flex items-center gap-4">
                  {/* Active Shields */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400 font-bold mr-1">Mes Boucliers :</span>
                    {me.shields.length === 0 ? (
                      <span className="text-[11px] text-slate-500 italic">Aucun</span>
                    ) : (
                      me.shields.map((sh) => (
                        <div
                          key={sh.id}
                          className="bg-amber-950/60 text-amber-300 border border-amber-500/40 px-2 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1"
                        >
                          <span>🛡️</span>
                          <span>{sh.name}</span>
                          <span className="bg-slate-900 px-1 rounded text-[10px] text-white">
                            {sh.currentShieldHp}/{sh.shieldHp} PV
                          </span>
                        </div>
                      ))
                    )}
                  </div>

                  {/* HP Box */}
                  <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                    <span className="text-base text-red-400">❤️</span>
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Points de Vie</div>
                      <div className="font-mono font-extrabold text-lg text-white">
                        {me.hp} <span className="text-slate-500 text-xs">/ 10</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Hand of Cards */}
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex justify-between">
                  <span>Votre main ({me.hand.length} cartes)</span>
                  {isMyTurn && me.hand.length === 0 && (
                    <span className="text-amber-400 animate-pulse">Main vide ! Vous allez piocher 2 cartes.</span>
                  )}
                </div>

                {me.isEliminated ? (
                  <div className="py-8 text-center text-red-400 font-bold text-sm bg-red-950/20 rounded-xl border border-red-900/40">
                    💀 Vous avez succombé lors de la bagarre. Observez la fin de la partie !
                  </div>
                ) : (
                  <div className="flex gap-3 overflow-x-auto pb-2 pt-1 pr-2">
                    {me.hand.map((card) => {
                      const isSelectedTargeting = targetingCard?.id === card.id;
                      const isPlayable = isMyTurn && gameState.playsLeft > 0;

                      return (
                        <div
                          key={card.id}
                          onMouseEnter={() => isPlayable && soundFx.click()}
                          onClick={() => isPlayable && handleCardClick(card)}
                          className={`holo-card min-w-[175px] max-w-[195px] rounded-2xl p-3.5 border-2 transition-all duration-150 flex flex-col justify-between shadow-xl ${
                            card.type === 'defense'
                              ? 'bg-gradient-to-b from-amber-950/80 via-stone-900 to-stone-950 border-amber-500/70 shadow-amber-950/40'
                              : 'bg-gradient-to-b from-stone-850 via-stone-900 to-stone-950 border-stone-600/70 shadow-black/60'
                          } ${
                            isSelectedTargeting
                              ? 'ring-4 ring-red-500 border-red-500 scale-105 -translate-y-3'
                              : isPlayable
                              ? 'hover:-translate-y-2 hover:shadow-2xl hover:border-amber-400 cursor-pointer active:translate-y-0'
                              : 'opacity-50 cursor-not-allowed'
                          }`}
                        >
                          <div>
                            {/* Card Top Icons */}
                            <div className="flex flex-wrap gap-1 items-center justify-end mb-1.5 text-xs">
                              {card.attack > 0 && (
                                <span className="bg-red-950 text-red-200 border border-red-500/60 px-1.5 py-0.5 rounded-lg font-bold font-mono shadow-sm">
                                  ⚔️ {card.attack}
                                </span>
                              )}
                              {card.shieldHp && (
                                <span className="bg-amber-950 text-amber-200 border border-amber-500/60 px-1.5 py-0.5 rounded-lg font-bold font-mono shadow-sm">
                                  🛡️ {card.shieldHp}
                                </span>
                              )}
                              {card.heal > 0 && (
                                <span className="bg-emerald-950 text-emerald-200 border border-emerald-500/60 px-1.5 py-0.5 rounded-lg font-bold font-mono shadow-sm">
                                  ❤️ {card.heal}
                                </span>
                              )}
                              {card.draw > 0 && (
                                <span className="bg-blue-950 text-blue-200 border border-blue-500/60 px-1.5 py-0.5 rounded-lg font-bold font-mono shadow-sm">
                                  🃏 {card.draw}
                                </span>
                              )}
                              {card.playAgain > 0 && (
                                <span className="bg-purple-950 text-purple-200 border border-purple-500/60 px-1.5 py-0.5 rounded-lg font-bold font-mono shadow-sm">
                                  ⚡ +{card.playAgain}
                                </span>
                              )}
                            </div>

                            {/* Card Title with Medieval Font */}
                            <h5 className="font-medieval font-black text-xs text-white leading-tight mb-1.5 tracking-wide">
                              {card.name}
                            </h5>

                            {/* Card Description */}
                            <p className="text-[11px] text-stone-300 leading-snug font-normal">
                              {card.description}
                            </p>
                          </div>

                          <div className="mt-3 pt-2 border-t border-stone-800/80 flex justify-between items-center text-[9px] font-mono text-stone-400">
                            <span className="uppercase font-bold tracking-wider">{card.type === 'defense' ? '🛡️ DÉFENSE' : '⚔️ ACTION'}</span>
                            {isPlayable && (
                              <span className="text-amber-400 font-black tracking-wider">
                                {isSelectedTargeting ? '🎯 CIBLER' : 'JOUER →'}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Victory Modal */}
      {gameState.status === 'FINISHED' && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border-2 border-amber-500 p-8 rounded-3xl max-w-md w-full text-center shadow-2xl">
            <div className="text-6xl mb-3 animate-bounce">🏆</div>
            <h2 className="text-2xl font-black text-white mb-2">Fin de la Bagarre !</h2>
            {gameState.winner ? (
              <div>
                <p className="text-slate-300 text-sm mb-4">
                  Le vainqueur suprême du donjon est :
                </p>
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 mb-6">
                  <div className="text-4xl mb-1">{CHARACTERS[gameState.winner.characterClass].avatar}</div>
                  <div className="text-xl font-extrabold text-amber-400">{gameState.winner.username}</div>
                  <div className="text-xs text-slate-400">{CHARACTERS[gameState.winner.characterClass].name}</div>
                </div>
              </div>
            ) : (
              <p className="text-slate-400 text-sm mb-6">Tous les combattants ont péri... C'est un match nul !</p>
            )}

            {isHost ? (
              <button
                onClick={handleResetGame}
                className="w-full bg-gradient-to-r from-amber-600 to-red-600 hover:from-amber-500 hover:to-red-500 text-white font-bold py-3 rounded-xl shadow-lg transition cursor-pointer text-sm"
              >
                Recommencer une partie 🔄
              </button>
            ) : (
              <p className="text-xs text-slate-500 italic">En attente de l'hôte pour relancer...</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
