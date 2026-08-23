import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';

// ─── Types ──────────────────────────────────────────────────────────────────

type UnoColor = 'rouge' | 'bleu' | 'vert' | 'jaune' | 'special';
type UnoCardType = 'number' | 'skip' | 'reverse' | 'draw_two' | 'wild' | 'wild_draw_four';

interface UnoCard {
  id: string;
  color: UnoColor;
  type: UnoCardType;
  value?: number;
}

interface UnoPlayer {
  id: string;
  username: string;
  color: string;
  hand: UnoCard[];
  saidUno: boolean;
}

interface UnoGameState {
  status: 'LOBBY' | 'PLAYING' | 'FINISHED';
  players: UnoPlayer[];
  currentPlayerIndex: number;
  direction: 1 | -1;
  topCard: UnoCard | null;
  currentColor: UnoColor;
  drawStack: number;
  mustDraw: number;
  winner: UnoPlayer | null;
  log: string[];
  deckCount: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const SERVER_URL = import.meta.env.VITE_WS_SERVER_URL || import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

const COLOR_BG: Record<UnoColor, string> = {
  rouge: 'bg-red-600',
  bleu: 'bg-blue-600',
  vert: 'bg-green-600',
  jaune: 'bg-yellow-500',
  special: 'bg-slate-800',
};

const COLOR_LABEL: Record<UnoColor, string> = {
  rouge: 'Rouge',
  bleu: 'Bleu',
  vert: 'Vert',
  jaune: 'Jaune',
  special: 'Spécial',
};

const CARD_SYMBOL: Record<UnoCardType, string> = {
  number: '',
  skip: '⊘',
  reverse: '↺',
  draw_two: '+2',
  wild: '🌈',
  wild_draw_four: '+4',
};

// ─── Card Component ──────────────────────────────────────────────────────────

interface CardProps {
  card: UnoCard;
  size?: 'sm' | 'md' | 'lg';
  playable?: boolean;
  selected?: boolean;
  onClick?: () => void;
  faceDown?: boolean;
}

function UnoCardView({ card, size = 'md', playable, selected, onClick, faceDown }: CardProps) {
  const sizeClasses = {
    sm: 'w-10 h-14 text-xs rounded-md',
    md: 'w-16 h-24 text-sm rounded-lg',
    lg: 'w-24 h-36 text-xl rounded-xl',
  };

  if (faceDown) {
    return (
      <div className={`${sizeClasses[size]} bg-slate-700 border-2 border-slate-600 flex items-center justify-center shadow-md`}>
        <span className="text-slate-500 font-black">UNO</span>
      </div>
    );
  }

  const isWild = card.type === 'wild' || card.type === 'wild_draw_four';
  const bgClass = isWild
    ? 'bg-gradient-to-br from-red-600 via-yellow-500 to-blue-600'
    : COLOR_BG[card.color];

  const label = card.type === 'number' ? String(card.value ?? '') : CARD_SYMBOL[card.type];

  return (
    <div
      onClick={onClick}
      className={`
        ${sizeClasses[size]} ${bgClass}
        border-2 border-white/30
        flex flex-col items-center justify-center
        shadow-lg font-black text-white select-none
        transition-all duration-150
        ${onClick ? 'cursor-pointer' : ''}
        ${playable ? 'ring-4 ring-green-400 ring-offset-2 ring-offset-slate-950 scale-105 hover:scale-110' : ''}
        ${selected ? 'ring-4 ring-white scale-110' : ''}
        ${onClick && !playable && !selected ? 'opacity-50 hover:opacity-70' : ''}
      `}
      title={`${COLOR_LABEL[card.color]} ${label}`}
    >
      {size !== 'sm' && (
        <span className="text-[10px] absolute top-1 left-1.5 opacity-70">{label}</span>
      )}
      <span className={size === 'lg' ? 'text-3xl' : size === 'md' ? 'text-xl' : 'text-xs'}>
        {label}
      </span>
      {size !== 'sm' && (
        <span className="text-[10px] absolute bottom-1 right-1.5 opacity-70 rotate-180">{label}</span>
      )}
    </div>
  );
}

// ─── Color Picker ────────────────────────────────────────────────────────────

interface ColorPickerProps {
  onPick: (color: UnoColor) => void;
  onCancel: () => void;
}

function ColorPicker({ onPick, onCancel }: ColorPickerProps) {
  const colors: UnoColor[] = ['rouge', 'bleu', 'vert', 'jaune'];
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl text-center">
        <h3 className="text-white font-bold text-lg mb-4">Choisissez une couleur</h3>
        <div className="grid grid-cols-2 gap-3 mb-4">
          {colors.map(c => (
            <button
              key={c}
              onClick={() => onPick(c)}
              className={`${COLOR_BG[c]} w-24 h-16 rounded-xl font-bold text-white text-sm hover:scale-105 transition-transform shadow-lg`}
            >
              {COLOR_LABEL[c]}
            </button>
          ))}
        </div>
        <button onClick={onCancel} className="text-slate-400 hover:text-white text-sm transition-colors">
          Annuler
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function UnoApp() {
  const navigate = useNavigate();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameState, setGameState] = useState<UnoGameState | null>(null);
  const [username, setUsername] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [joined, setJoined] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [pendingWild, setPendingWild] = useState<string | null>(null); // cardId waiting for color
  const [notification, setNotification] = useState<string | null>(null);

  const logsEndRef = useRef<HTMLDivElement>(null);
  const prevLogLengthRef = useRef(0);

  useEffect(() => {
    const newSocket = io(SERVER_URL);
    setSocket(newSocket);

    newSocket.on('unoStateUpdate', (state: UnoGameState) => {
      setGameState(state);
      setJoined(true);
      setErrorMsg('');
    });

    newSocket.on('error', (msg: string) => {
      setErrorMsg(msg);
    });

    return () => { newSocket.disconnect(); };
  }, []);

  // Auto-scroll logs
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [gameState?.log]);

  // Show notification on new log entries that are relevant
  useEffect(() => {
    if (!gameState) return;
    const log = gameState.log;
    if (log.length > prevLogLengthRef.current) {
      const newEntries = log.slice(prevLogLengthRef.current);
      const unoEntry = newEntries.find(e => e.includes('UNO') || e.includes('gagné') || e.includes('pioche'));
      if (unoEntry) {
        setNotification(unoEntry);
        setTimeout(() => setNotification(null), 3000);
      }
    }
    prevLogLengthRef.current = log.length;
  }, [gameState?.log]);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !roomCode.trim() || !socket) return;
    socket.emit('joinGame', { username, roomCode, gameType: 'uno' });
  };

  const me = gameState?.players.find(p => p.id === socket?.id);
  const isMyTurn = gameState ? gameState.players[gameState.currentPlayerIndex]?.id === socket?.id : false;
  const isHost = gameState?.players[0]?.id === socket?.id;

  const isPlayable = (card: UnoCard): boolean => {
    if (!gameState || !isMyTurn) return false;
    const top = gameState.topCard;
    if (!top) return true;
    if (card.type === 'wild' || card.type === 'wild_draw_four') return true;
    if (gameState.mustDraw > 0) return card.type === 'draw_two';
    if (card.color === gameState.currentColor) return true;
    if (card.type === top.type) return true;
    if (card.type === 'number' && top.type === 'number' && card.value === top.value) return true;
    return false;
  };

  const handlePlayCard = (cardId: string) => {
    if (!socket || !isMyTurn) return;
    const card = me?.hand.find(c => c.id === cardId);
    if (!card || !isPlayable(card)) return;

    if (card.type === 'wild' || card.type === 'wild_draw_four') {
      setPendingWild(cardId);
    } else {
      socket.emit('uno:playCard', { cardId });
    }
  };

  const handleColorPick = (color: UnoColor) => {
    if (!socket || !pendingWild) return;
    socket.emit('uno:playCard', { cardId: pendingWild, chosenColor: color });
    setPendingWild(null);
  };

  const handleDrawCard = () => {
    if (!socket || !isMyTurn) return;
    socket.emit('uno:drawCard');
  };

  const handleSayUno = () => {
    if (!socket) return;
    socket.emit('uno:sayUno');
  };

  const handleChallenge = (targetId: string) => {
    if (!socket) return;
    socket.emit('uno:challengeUno', { targetId });
  };

  const handleStartGame = () => {
    if (!socket) return;
    socket.emit('uno:startGame');
  };

  const handleResetGame = () => {
    if (!socket) return;
    socket.emit('uno:resetGame');
  };

  // ── Join screen ────────────────────────────────────────────────────────────

  if (!joined || !gameState) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        {/* Back button */}
        <button
          onClick={() => navigate('/')}
          className="absolute top-4 left-4 flex items-center gap-1.5 text-slate-400 hover:text-slate-100 text-sm font-medium transition-colors"
        >
          ← Accueil
        </button>
        <div className="bg-slate-900 p-8 rounded-2xl shadow-2xl w-full max-w-md border border-slate-800">
          <h1 className="text-4xl font-extrabold text-center mb-2 tracking-tight bg-gradient-to-r from-red-400 to-rose-500 bg-clip-text text-transparent">
            UNO
          </h1>
          <p className="text-center text-slate-400 text-sm mb-6">Le jeu de cartes classique</p>

          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Votre Pseudo</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Ex: Alexandre"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Code du Salon</label>
              <input
                type="text"
                value={roomCode}
                onChange={e => setRoomCode(e.target.value.toUpperCase())}
                placeholder="Ex: UNO123"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 uppercase"
                required
              />
            </div>

            {errorMsg && (
              <div className="bg-red-900/50 border border-red-500 text-red-200 text-sm rounded-lg p-3 text-center">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-bold py-3 rounded-lg shadow-lg hover:shadow-xl transition duration-200"
            >
              Rejoindre ou Créer le Salon
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Lobby ──────────────────────────────────────────────────────────────────

  if (gameState.status === 'LOBBY') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6">
        <button
          onClick={() => navigate('/')}
          className="absolute top-4 left-4 flex items-center gap-1.5 text-slate-400 hover:text-slate-100 text-sm font-medium transition-colors"
        >
          ← Accueil
        </button>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 w-full max-w-md shadow-2xl">
          <h1 className="text-3xl font-extrabold text-center mb-1 bg-gradient-to-r from-red-400 to-rose-500 bg-clip-text text-transparent">UNO</h1>
          <p className="text-center text-slate-500 text-sm mb-2">Code : <span className="font-mono text-white font-bold">{roomCode.toUpperCase()}</span></p>

          <div className="mt-6 space-y-2 mb-6">
            <p className="text-slate-400 text-sm font-medium mb-2">Joueurs ({gameState.players.length}/10) :</p>
            {gameState.players.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 bg-slate-800 rounded-lg px-4 py-2.5">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }}></div>
                <span className="font-medium text-sm text-white">{p.username}</span>
                {i === 0 && <span className="ml-auto text-xs text-amber-400 font-semibold">Hôte</span>}
                {p.id === socket?.id && <span className="ml-auto text-xs text-slate-400">(Vous)</span>}
              </div>
            ))}
          </div>

          {errorMsg && (
            <div className="bg-red-900/50 border border-red-500 text-red-200 text-sm rounded-lg p-3 text-center mb-4">
              {errorMsg}
            </div>
          )}

          {isHost ? (
            <button
              onClick={handleStartGame}
              disabled={gameState.players.length < 2}
              className="w-full bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg shadow-lg transition"
            >
              {gameState.players.length < 2 ? 'En attente de joueurs...' : '🃏 Démarrer la partie'}
            </button>
          ) : (
            <p className="text-center text-slate-500 text-sm">En attente que l'hôte démarre la partie...</p>
          )}
        </div>
      </div>
    );
  }

  // ── Finished ───────────────────────────────────────────────────────────────

  if (gameState.status === 'FINISHED') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6">
        <button
          onClick={() => navigate('/')}
          className="absolute top-4 left-4 flex items-center gap-1.5 text-slate-400 hover:text-slate-100 text-sm font-medium transition-colors"
        >
          ← Accueil
        </button>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 w-full max-w-md shadow-2xl text-center">
          <div className="text-6xl mb-4">🏆</div>
          <h2 className="text-3xl font-extrabold text-amber-400 mb-2">Victoire !</h2>
          <p className="text-xl text-white font-semibold mb-6">
            {gameState.winner?.username ?? 'Quelqu\'un'} a gagné la partie !
          </p>

          <div className="bg-slate-800 rounded-xl p-4 mb-6">
            <p className="text-slate-400 text-sm mb-2">Résultats :</p>
            {gameState.players.map(p => (
              <div key={p.id} className="flex items-center justify-between py-1.5">
                <span className="text-sm font-medium" style={{ color: p.color }}>{p.username}</span>
                <span className="text-xs text-slate-400">{p.hand.length} carte(s) restante(s)</span>
              </div>
            ))}
          </div>

          {isHost && (
            <button
              onClick={handleResetGame}
              className="w-full bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-bold py-3 rounded-lg shadow-lg transition"
            >
              🔄 Rejouer
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Playing ────────────────────────────────────────────────────────────────

  const currentTurnPlayer = gameState.players[gameState.currentPlayerIndex];
  const otherPlayers = gameState.players.filter(p => p.id !== socket?.id);
  const myHand = me?.hand ?? [];
  const canSayUno = isMyTurn && myHand.length === 2;
  const challengeablePlayers = gameState.players.filter(
    p => p.id !== socket?.id && p.hand.length === 1 && !p.saidUno
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col h-screen overflow-hidden">
      {/* Notification toast */}
      {notification && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-800 border border-slate-600 text-white text-sm px-5 py-3 rounded-full shadow-xl animate-pulse">
          {notification}
        </div>
      )}

      {/* Color picker modal */}
      {pendingWild && (
        <ColorPicker onPick={handleColorPick} onCancel={() => setPendingWild(null)} />
      )}

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 shrink-0">
        <button
          onClick={() => navigate('/')}
          className="text-slate-400 hover:text-white text-xs font-medium transition-colors"
        >
          ← Accueil
        </button>
        <div className="text-center">
          <h1 className="text-lg font-extrabold bg-gradient-to-r from-red-400 to-rose-500 bg-clip-text text-transparent">UNO</h1>
          <p className="text-xs text-slate-500">{roomCode.toUpperCase()}</p>
        </div>
        <div className="text-xs text-slate-500">
          {gameState.deckCount} cartes
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Main game area */}
        <div className="flex flex-col flex-1 overflow-hidden p-3 gap-3">
          {/* Other players */}
          <div className="flex gap-2 flex-wrap justify-center shrink-0">
            {otherPlayers.map(player => {
              const isTheirTurn = player.id === currentTurnPlayer?.id;
              return (
                <div
                  key={player.id}
                  className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl border transition-all ${
                    isTheirTurn
                      ? 'border-yellow-400 bg-yellow-400/10 ring-2 ring-yellow-400'
                      : 'border-slate-700 bg-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: player.color }}></div>
                    <span className="text-xs font-semibold text-white">{player.username}</span>
                    {player.saidUno && <span className="text-xs font-black text-red-400">UNO!</span>}
                  </div>
                  <div className="flex gap-0.5">
                    {Array.from({ length: Math.min(player.hand.length, 10) }).map((_, i) => (
                      <div key={i} className="w-4 h-6 bg-slate-700 rounded-sm border border-slate-600"></div>
                    ))}
                    {player.hand.length > 10 && (
                      <span className="text-xs text-slate-400 self-center ml-1">+{player.hand.length - 10}</span>
                    )}
                    {player.hand.length === 0 && <span className="text-xs text-slate-500">aucune</span>}
                  </div>
                  <span className="text-[10px] text-slate-500">{player.hand.length} carte{player.hand.length > 1 ? 's' : ''}</span>

                  {/* Challenge button */}
                  {challengeablePlayers.some(c => c.id === player.id) && (
                    <button
                      onClick={() => handleChallenge(player.id)}
                      className="text-[10px] bg-red-700 hover:bg-red-600 text-white px-2 py-0.5 rounded font-bold transition"
                    >
                      Défi UNO!
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Center: discard pile + current color */}
          <div className="flex items-center justify-center gap-6 shrink-0 py-2">
            {/* Deck */}
            <div className="flex flex-col items-center gap-1">
              <div
                onClick={isMyTurn ? handleDrawCard : undefined}
                className={`w-16 h-24 bg-slate-700 border-2 border-slate-600 rounded-lg flex items-center justify-center shadow-lg font-black text-slate-500 text-xs transition-all ${
                  isMyTurn ? 'cursor-pointer hover:border-slate-400 hover:bg-slate-600 hover:scale-105' : ''
                }`}
              >
                UNO
              </div>
              <span className="text-[10px] text-slate-500">Piocher</span>
            </div>

            {/* Top card */}
            <div className="flex flex-col items-center gap-1">
              {gameState.topCard ? (
                <UnoCardView card={gameState.topCard} size="lg" />
              ) : (
                <div className="w-24 h-36 border-2 border-dashed border-slate-700 rounded-xl flex items-center justify-center text-slate-600 text-xs">
                  Vide
                </div>
              )}
              <span className="text-[10px] text-slate-500">Défausse</span>
            </div>

            {/* Current color indicator */}
            <div className="flex flex-col items-center gap-2">
              <div className={`w-12 h-12 rounded-full ${COLOR_BG[gameState.currentColor]} border-4 border-white/20 shadow-lg`}></div>
              <span className="text-[10px] text-slate-400">{COLOR_LABEL[gameState.currentColor]}</span>
              <div className="text-xs text-slate-500">
                {gameState.direction === 1 ? '→ Sens horaire' : '← Sens antihoraire'}
              </div>
            </div>
          </div>

          {/* Turn indicator */}
          <div className={`text-center text-sm font-semibold px-3 py-1.5 rounded-lg shrink-0 ${
            isMyTurn ? 'bg-green-900/50 text-green-300 border border-green-700' : 'bg-slate-800 text-slate-400'
          }`}>
            {isMyTurn ? '🟢 C\'est votre tour !' : `⏳ Tour de ${currentTurnPlayer?.username ?? '...'}`}
            {gameState.mustDraw > 0 && isMyTurn && (
              <span className="ml-2 text-red-400 font-black">Piochez {gameState.mustDraw} !</span>
            )}
          </div>

          {/* Action buttons */}
          {isMyTurn && (
            <div className="flex gap-2 justify-center shrink-0">
              <button
                onClick={handleDrawCard}
                className="bg-slate-700 hover:bg-slate-600 text-white font-bold px-4 py-2 rounded-lg text-sm transition"
              >
                📦 Piocher{gameState.mustDraw > 0 ? ` (${gameState.mustDraw})` : ''}
              </button>
              {canSayUno && (
                <button
                  onClick={handleSayUno}
                  className="bg-red-600 hover:bg-red-500 text-white font-black px-4 py-2 rounded-lg text-sm transition animate-pulse"
                >
                  UNO!
                </button>
              )}
            </div>
          )}
          {!isMyTurn && me?.hand.length === 1 && !me.saidUno && (
            <div className="flex justify-center shrink-0">
              <button
                onClick={handleSayUno}
                className="bg-red-600 hover:bg-red-500 text-white font-black px-4 py-2 rounded-lg text-sm transition"
              >
                UNO! (préventif)
              </button>
            </div>
          )}

          {/* My hand */}
          <div className="flex-1 overflow-y-auto">
            <p className="text-xs text-slate-500 text-center mb-2">
              Votre main ({myHand.length} carte{myHand.length > 1 ? 's' : ''})
              {me?.saidUno && <span className="ml-2 text-red-400 font-black">UNO!</span>}
            </p>
            <div className="flex flex-wrap gap-2 justify-center pb-2">
              {myHand.map(card => (
                <UnoCardView
                  key={card.id}
                  card={card}
                  size="md"
                  playable={isPlayable(card)}
                  onClick={isMyTurn && isPlayable(card) ? () => handlePlayCard(card.id) : undefined}
                />
              ))}
              {myHand.length === 0 && (
                <p className="text-slate-500 text-sm py-4">Vous n'avez plus de cartes !</p>
              )}
            </div>
          </div>
        </div>

        {/* Side log */}
        <div className="w-52 shrink-0 bg-slate-900 border-l border-slate-800 flex flex-col overflow-hidden hidden lg:flex">
          <div className="px-3 py-2 border-b border-slate-800">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Journal</p>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {gameState.log.map((entry, i) => (
              <p key={i} className="text-xs text-slate-400 leading-snug">{entry}</p>
            ))}
            <div ref={logsEndRef} />
          </div>
        </div>
      </div>

      {/* Error message */}
      {errorMsg && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-red-900/90 border border-red-500 text-red-200 text-sm rounded-lg px-4 py-2 z-50">
          {errorMsg}
        </div>
      )}
    </div>
  );
}
