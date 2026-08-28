import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';

const SERVER_URL = import.meta.env.VITE_WS_SERVER_URL || import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

type LoveLetterCardType = 'GARDE' | 'PRETRE' | 'BARON' | 'SERVANTE' | 'PRINCE' | 'ROI' | 'COMTESSE' | 'PRINCESSE';

interface LoveLetterCard {
  id: string;
  type: LoveLetterCardType;
  value: number;
  name: string;
  description: string;
}

interface LoveLetterPlayer {
  id: string;
  username: string;
  color: string;
  hand: LoveLetterCard[];
  discardPile: LoveLetterCard[];
  isProtected: boolean;
  isEliminated: boolean;
  tokens: number;
}

interface LoveLetterGameState {
  status: 'LOBBY' | 'PLAYING' | 'ROUND_END' | 'FINISHED';
  players: LoveLetterPlayer[];
  currentPlayerIndex: number;
  deck: LoveLetterCard[];
  burnCards: LoveLetterCard[];
  discardedTopCard: LoveLetterCard | null;
  winner: LoveLetterPlayer | null;
  roundWinner: LoveLetterPlayer | null;
  targetSelectionNeeded: {
    cardId: string;
    cardType: LoveLetterCardType;
    possibleTargets: string[];
    needsCardGuess?: boolean;
  } | null;
  log: string[];
  deckCount: number;
}

const CARD_COLORS: { [key in LoveLetterCardType]: string } = {
  GARDE: 'border-red-500 bg-red-950/20 text-red-300',
  PRETRE: 'border-slate-500 bg-slate-900 text-slate-300',
  BARON: 'border-emerald-500 bg-emerald-950/20 text-emerald-300',
  SERVANTE: 'border-amber-500 bg-amber-950/20 text-amber-300',
  PRINCE: 'border-cyan-500 bg-cyan-950/20 text-cyan-300',
  ROI: 'border-indigo-500 bg-indigo-950/20 text-indigo-300',
  COMTESSE: 'border-purple-500 bg-purple-950/20 text-purple-300',
  PRINCESSE: 'border-pink-500 bg-pink-950/20 text-pink-300'
};

const GUESSABLE_CARDS: { type: LoveLetterCardType; value: number; name: string }[] = [
  { type: 'PRETRE', value: 2, name: 'Prêtre' },
  { type: 'BARON', value: 3, name: 'Baron' },
  { type: 'SERVANTE', value: 4, name: 'Servante' },
  { type: 'PRINCE', value: 5, name: 'Prince' },
  { type: 'ROI', value: 6, name: 'Roi' },
  { type: 'COMTESSE', value: 7, name: 'Comtesse' },
  { type: 'PRINCESSE', value: 8, name: 'Princesse' }
];

export default function LoveLetterApp() {
  const navigate = useNavigate();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameState, setGameState] = useState<LoveLetterGameState | null>(null);
  const [username, setUsername] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState('');

  // Targeting UI state
  const [selectedTargetId, setSelectedTargetId] = useState<string>('');
  const [selectedGuess, setSelectedGuess] = useState<LoveLetterCardType>('PRETRE');

  // Privately seen card (for Prêtre)
  const [privateSeenCard, setPrivateSeenCard] = useState<{ player: string; card: LoveLetterCard } | null>(null);

  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const s = io(SERVER_URL);
    setSocket(s);

    s.on('loveletterStateUpdate', (state: LoveLetterGameState) => {
      setGameState(state);
      setJoined(true);
      setError('');

      // Auto-clear target selection if not needed
      if (!state.targetSelectionNeeded) {
        setSelectedTargetId('');
      }

      // Check if we were looking at a card but target changed or round ended
      setPrivateSeenCard(null);
    });

    s.on('error', (msg: string) => {
      setError(msg);
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
    if (!username.trim() || !roomCode.trim() || !socket) return;
    socket.emit('joinGame', { username, roomCode, gameType: 'loveletter' });
  };

  const handleStartGame = () => {
    if (socket) socket.emit('loveletter:startGame');
  };

  const handlePlayCard = (cardId: string) => {
    const activePlayer = gameState?.players[gameState.currentPlayerIndex];
    if (!activePlayer || activePlayer.id !== socket?.id || gameState?.status !== 'PLAYING') return;

    // Check if COMTESSE constraint applies
    const card = activePlayer.hand.find(c => c.id === cardId);
    if (!card) return;

    const hasComtesse = activePlayer.hand.some(c => c.type === 'COMTESSE');
    const hasKingOrPrince = activePlayer.hand.some(c => c.type === 'ROI' || c.type === 'PRINCE');
    if (hasComtesse && hasKingOrPrince && card.type !== 'COMTESSE') {
      setError("⚠️ Contrainte de la Comtesse : Vous devez obligatoirement défausser la Comtesse si vous avez le Prince ou le Roi !");
      setTimeout(() => setError(''), 4000);
      return;
    }

    if (socket) {
      socket.emit('loveletter:playCard', { cardId });
    }
  };

  const handleSubmitTarget = () => {
    if (!gameState?.targetSelectionNeeded || !socket) return;
    const { cardId, cardType } = gameState.targetSelectionNeeded;

    if (!selectedTargetId) {
      setError('⚠️ Veuillez sélectionner une cible !');
      setTimeout(() => setError(''), 3000);
      return;
    }

    // Special Prêtre local reveal
    if (cardType === 'PRETRE') {
      const target = gameState.players.find(p => p.id === selectedTargetId);
      if (target && target.hand[0]) {
        setPrivateSeenCard({
          player: target.username,
          card: target.hand[0]
        });
      }
    }

    socket.emit('loveletter:playCard', {
      cardId,
      targetPlayerId: selectedTargetId,
      guessedCardType: cardType === 'GARDE' ? selectedGuess : undefined
    });
  };

  const handleNextRound = () => {
    if (socket) socket.emit('loveletter:nextRound');
  };

  const handleResetGame = () => {
    if (socket) socket.emit('loveletter:resetGame');
  };

  const me = gameState?.players.find(p => p.id === socket?.id);
  const isMyTurn = gameState && gameState.players[gameState.currentPlayerIndex]?.id === socket?.id;

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
            <span className="bg-pink-500/20 text-pink-400 border border-pink-500/30 text-[10px] uppercase font-bold px-2 py-0.5 rounded">
              LOVE LETTER
            </span>
          </div>

          <h1 className="text-3xl font-extrabold text-center mb-2 tracking-tight bg-gradient-to-r from-pink-400 to-rose-500 bg-clip-text text-transparent">
            Love Letter ❤️
          </h1>
          <p className="text-center text-slate-400 text-sm mb-6">
            Conquérez le cœur de la Princesse avec ruse et bluff
          </p>

          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Votre Pseudo</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ex: Clara"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Code de la Salle</label>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                placeholder="Ex: LOVE"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500"
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
              className="w-full bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-bold py-3 rounded-lg shadow-lg hover:shadow-pink-950/30 transition transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              Rejoindre / Créer le salon
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* Navbar */}
      <header className="bg-slate-900 border-b border-slate-850 p-4 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="text-xs bg-slate-800 hover:bg-slate-750 px-3 py-1.5 rounded text-slate-300 border border-slate-700 flex items-center gap-1 cursor-pointer"
          >
            ← Accueil
          </button>
          <span className="font-bold text-lg bg-gradient-to-r from-pink-400 to-rose-500 bg-clip-text text-transparent">
            Love Letter ❤️
          </span>
          <span className="text-slate-500 text-xs font-mono font-bold bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800">
            Salon : {roomCode.toUpperCase()}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {gameState.status === 'LOBBY' && gameState.players[0]?.id === socket?.id && (
            <button
              onClick={handleStartGame}
              className="bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs px-4 py-2 rounded shadow transition cursor-pointer"
            >
              Démarrer la partie 🚀
            </button>
          )}
          {gameState.status === 'ROUND_END' && gameState.players[0]?.id === socket?.id && (
            <button
              onClick={handleNextRound}
              className="bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs px-4 py-2 rounded shadow transition cursor-pointer animate-pulse"
            >
              Manche suivante ➡️
            </button>
          )}
          {gameState.status === 'FINISHED' && (
            <button
              onClick={handleResetGame}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-4 py-2 rounded shadow transition cursor-pointer"
            >
              Réinitialiser la partie 🔄
            </button>
          )}
        </div>
      </header>

      {gameState.status === 'LOBBY' ? (
        /* Lobby State */
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl max-w-md w-full shadow-2xl">
            <div className="text-5xl mb-4 animate-bounce">💌</div>
            <h2 className="text-xl font-bold mb-4">Salon de jeu</h2>
            <div className="space-y-2 mb-6">
              {gameState.players.map((p, idx) => (
                <div key={p.id} className="bg-slate-850 p-2.5 rounded border border-slate-800 flex items-center gap-2 text-sm justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full block" style={{ backgroundColor: p.color }} />
                    <span className="font-semibold">{p.username}</span>
                  </div>
                  {idx === 0 && <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-bold uppercase">Hôte</span>}
                </div>
              ))}
            </div>
            <p className="text-slate-500 text-xs leading-relaxed mb-6">
              Il faut entre 2 et 4 joueurs pour démarrer une partie.
            </p>

            {/* Section Règles */}
            <div className="pt-6 border-t border-slate-800 text-left w-full">
              <h3 className="text-xs font-bold text-pink-400 uppercase tracking-wider mb-3">📜 Règles de Love Letter :</h3>
              <ul className="text-xs text-slate-400 space-y-2 list-disc list-inside leading-relaxed">
                <li>Chaque joueur commence la manche avec **1 carte en main**.</li>
                <li>À votre tour, piochez une carte puis jouez-en une de votre choix pour appliquer son effet.</li>
                <li>Éliminez les autres courtisans par déduction (Garde, Baron) ou forçage (Prince).</li>
                <li>Protégez-vous grâce à la Servante (4) ou échangez votre main avec le Roi (6).</li>
                <li>La manche prend fin si un seul joueur survit ou si la pioche est vide (la carte la plus forte l'emporte).</li>
              </ul>
            </div>
          </div>
        </div>
      ) : (
        /* Game Playing State */
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 p-6 overflow-hidden">
          
          {/* Left panel: Opponent Hands & Tokens */}
          <div className="lg:col-span-1 space-y-4 overflow-y-auto max-h-[calc(100vh-220px)] pr-1">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
              <h3 className="font-bold text-xs text-slate-400 mb-3 uppercase tracking-wider">Joueurs</h3>
              <div className="space-y-4">
                {gameState.players.map((p, idx) => {
                  const isCurrent = idx === gameState.currentPlayerIndex;
                  const isSelf = p.id === socket?.id;
                  return (
                    <div
                      key={p.id}
                      className={`p-3 rounded-lg border flex flex-col gap-2 transition ${
                        p.isEliminated
                          ? 'bg-red-950/10 border-red-900/50 opacity-55'
                          : isCurrent
                          ? 'bg-pink-950/20 border-pink-500/80 ring-2 ring-pink-500/30'
                          : 'bg-slate-850 border-slate-750'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                          <span className="font-semibold text-sm">
                            {p.username} {isSelf && '(Vous)'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          {p.isProtected && (
                            <span className="text-[9px] bg-amber-500/20 border border-amber-500/30 text-amber-300 px-1.5 py-0.5 rounded font-bold uppercase">
                              🛡️ PROTEGÉ
                            </span>
                          )}
                          {p.isEliminated ? (
                            <span className="text-[9px] bg-red-900/40 border border-red-900/50 text-red-400 px-1.5 py-0.5 rounded font-bold uppercase">
                              ☠️ ÉLIMINÉ
                            </span>
                          ) : (
                            isCurrent && (
                              <span className="text-[9px] bg-pink-500 text-white px-1.5 py-0.5 rounded font-bold uppercase animate-pulse">
                                TOUR
                              </span>
                            )
                          )}
                        </div>
                      </div>

                      {/* Display Tokens of Affection */}
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800">
                        <span className="text-slate-400">Pions d'affection :</span>
                        <span className="text-pink-400 font-bold flex items-center gap-0.5">
                          {Array.from({ length: p.tokens }).map((_, i) => (
                            <span key={i}>❤️</span>
                          ))}
                          {p.tokens === 0 && 'Aucun'}
                        </span>
                      </div>

                      {/* Display Discard Pile summary */}
                      {p.discardPile.length > 0 && (
                        <div className="text-[10px] text-slate-400 flex flex-wrap gap-1 mt-1">
                          <span>Défausse :</span>
                          {p.discardPile.map((c, i) => (
                            <span
                              key={i}
                              className="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 font-semibold"
                            >
                              {c.name} ({c.value})
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Center Column: The Deck & Card Actions */}
          <div className="lg:col-span-2 flex flex-col gap-6 justify-between">
            {/* The table (deck representation) */}
            <div className="bg-slate-900 border border-slate-850 rounded-2xl p-6 shadow-inner flex flex-col items-center justify-center relative min-h-[300px]">
              
              {gameState.status === 'ROUND_END' && gameState.roundWinner && (
                <div className="text-center bg-slate-950/80 border border-pink-500/30 p-6 rounded-xl shadow-2xl max-w-sm absolute z-30">
                  <div className="text-4xl mb-3">🌹</div>
                  <h3 className="text-lg font-bold text-pink-400">Fin de la manche !</h3>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    Le vainqueur de cette manche est <span className="font-extrabold text-white">{gameState.roundWinner.username}</span> !
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1 italic">
                    Attendez que l'hôte lance la manche suivante.
                  </p>
                </div>
              )}

              {gameState.status === 'FINISHED' && gameState.winner && (
                <div className="text-center bg-slate-950/80 border border-yellow-500/30 p-6 rounded-xl shadow-2xl max-w-sm absolute z-30 animate-pulse">
                  <div className="text-4xl mb-3">👑</div>
                  <h3 className="text-lg font-bold text-yellow-400">Victoire Finale !</h3>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    <span className="font-extrabold text-white">{gameState.winner.username}</span> a remporté la partie en séduisant la Princesse !
                  </p>
                </div>
              )}

              {/* Main Deck pile layout */}
              <div className="flex gap-8 items-center justify-center">
                {/* Draw pile card back */}
                <div className="relative group">
                  <div className="w-24 h-36 bg-gradient-to-br from-pink-900 to-rose-950 border-2 border-pink-700/80 rounded-xl shadow-2xl flex flex-col justify-between p-3 select-none">
                    <div className="border border-pink-800/40 rounded-lg h-full flex flex-col justify-center items-center">
                      <div className="text-xl text-pink-400 font-bold">L.L</div>
                    </div>
                  </div>
                  {/* Deck count badge */}
                  <span className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-pink-600 border-2 border-slate-950 flex items-center justify-center text-xs font-bold font-mono">
                    {gameState.deckCount}
                  </span>
                </div>

                {/* Face down Burned Card */}
                {gameState.discardedTopCard && (
                  <div className="relative opacity-65">
                    <div className="w-24 h-36 bg-slate-950 border-2 border-slate-800 border-dashed rounded-xl flex items-center justify-center p-3 select-none">
                      <div className="text-slate-600 text-xs font-bold uppercase tracking-wider text-center rotate-45">
                        Brûlée
                      </div>
                    </div>
                  </div>
                )}

                {/* Face Up Burn Cards (if 2 players) */}
                {gameState.burnCards.length > 0 && (
                  <div className="flex flex-col gap-1 items-center">
                    <div className="text-[10px] text-slate-500 font-bold uppercase">Cartes Dévoilées :</div>
                    <div className="flex gap-2">
                      {gameState.burnCards.map((c) => (
                        <div
                          key={c.id}
                          className="w-16 h-24 bg-slate-950 border border-slate-800 rounded-lg flex flex-col justify-between p-1.5 text-[8px] font-semibold"
                        >
                          <div className="font-bold">{c.name}</div>
                          <div className="text-right text-xs">{c.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Private Prêtre Card Peek Reveal Panel */}
              {privateSeenCard && (
                <div className="mt-6 bg-slate-950 border border-slate-850 p-3 rounded-lg shadow max-w-xs flex gap-3 items-center">
                  <div className="text-xl">🔍</div>
                  <div className="text-xs">
                    <div>Carte de <span className="font-bold">{privateSeenCard.player}</span> :</div>
                    <div className="font-bold text-pink-400">{privateSeenCard.card.name} ({privateSeenCard.card.value})</div>
                  </div>
                  <button
                    onClick={() => setPrivateSeenCard(null)}
                    className="ml-auto text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400 hover:text-white cursor-pointer"
                  >
                    Fermer
                  </button>
                </div>
              )}
            </div>

            {/* Targeting Modal / Selection Controls */}
            {gameState.targetSelectionNeeded && isMyTurn && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col gap-4">
                <div className="text-xs font-bold text-pink-400 flex items-center gap-1.5">
                  🎯 Cible requise pour l'effet du/de la <span className="underline">{gameState.targetSelectionNeeded.cardType}</span> :
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Select target player */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-slate-400 font-semibold uppercase">Joueur cible :</label>
                    <select
                      value={selectedTargetId}
                      onChange={(e) => setSelectedTargetId(e.target.value)}
                      className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-pink-500"
                    >
                      <option value="">-- Choisir un joueur --</option>
                      {gameState.targetSelectionNeeded.possibleTargets.map((id) => {
                        const targetPlayer = gameState.players.find(p => p.id === id);
                        return (
                          <option key={id} value={id}>
                            {targetPlayer ? targetPlayer.username : id}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Card Guess select dropdown (Only for GARDE) */}
                  {gameState.targetSelectionNeeded.needsCardGuess && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-slate-400 font-semibold uppercase">Deviner la carte :</label>
                      <select
                        value={selectedGuess}
                        onChange={(e) => setSelectedGuess(e.target.value as LoveLetterCardType)}
                        className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-pink-500"
                      >
                        {GUESSABLE_CARDS.map((c) => (
                          <option key={c.type} value={c.type}>
                            {c.name} ({c.value})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="text-[10px] text-red-400 bg-red-950/20 px-2.5 py-1.5 rounded border border-red-900/30">
                    {error}
                  </div>
                )}

                <button
                  onClick={handleSubmitTarget}
                  className="bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs py-2 rounded shadow transition cursor-pointer"
                >
                  Confirmer l'Action 💥
                </button>
              </div>
            )}
          </div>

          {/* Right Column: Game Logs */}
          <div className="lg:col-span-1">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg h-full flex flex-col justify-between max-h-[calc(100vh-220px)]">
              <h3 className="font-bold text-xs text-slate-400 mb-3 uppercase tracking-wider">Historique de la Cour</h3>
              <div className="flex-1 overflow-y-auto font-mono text-[10px] text-slate-300 space-y-2 pr-1">
                {gameState.log.map((line, idx) => (
                  <div key={idx} className="border-b border-slate-850/50 pb-1.5 last:border-none">
                    {line}
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Bottom bar: Player's own hand */}
      {gameState.status === 'PLAYING' && me && (
        <div className="bg-slate-900 border-t border-slate-850 p-6 flex flex-col items-center gap-4 shadow-2xl">
          <div className="text-xs font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
            {isMyTurn ? (
              <span className="text-pink-400 animate-pulse">✨ C'est votre tour ! Choisissez une carte à défausser :</span>
            ) : (
              <span>Main de {me.username} ({isMyTurn ? '2' : '1'} carte) :</span>
            )}
          </div>

          <div className="flex gap-4 justify-center items-center max-w-full overflow-x-auto pb-1">
            {me.isEliminated ? (
              <div className="text-xs text-red-400 font-bold italic py-4">
                ☠️ Vous êtes éliminé de cette manche. Attendez le début de la prochaine manche !
              </div>
            ) : (
              me.hand.map((c) => {
                const colorScheme = CARD_COLORS[c.type] || 'border-slate-700 bg-slate-800 text-slate-300';
                return (
                  <button
                    key={c.id}
                    onClick={() => isMyTurn && !gameState.targetSelectionNeeded && handlePlayCard(c.id)}
                    disabled={!isMyTurn || !!gameState.targetSelectionNeeded}
                    className={`
                      w-40 h-56 border-2 rounded-xl flex flex-col justify-between p-3.5 text-left transition select-none
                      ${colorScheme}
                      ${isMyTurn && !gameState.targetSelectionNeeded ? 'hover:scale-105 hover:shadow-2xl hover:border-white cursor-pointer' : 'opacity-70 cursor-default'}
                    `}
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-extrabold text-sm tracking-tight">{c.name}</span>
                      <span className="text-xs font-mono font-extrabold bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800">
                        {c.value}
                      </span>
                    </div>
                    
                    <p className="text-[9.5px] leading-relaxed text-slate-400 italic">
                      {c.description}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
