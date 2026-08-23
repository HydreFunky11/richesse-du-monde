import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type { GameState } from './types/game';
import { RESOURCE_DEFINITIONS, COUNTRY_CONTINENT_MAP } from './data/board';
import './App.css';

const SERVER_URL = import.meta.env.VITE_WS_SERVER_URL || 'http://localhost:3001';


export default function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [username, setUsername] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [joined, setJoined] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Pour la sélection des titres à mettre aux enchères
  const [selectedTitlesForAuction, setSelectedTitlesForAuction] = useState<string[]>([]);
  const [bidValue, setBidValue] = useState(0);
  const [selectedCellIndex, setSelectedCellIndex] = useState<number | null>(null);
  const [monopolySortMode, setMonopolySortMode] = useState<'DEFAULT' | 'PERCENTAGE' | 'ROYALTIES' | 'ALPHABETICAL'>('DEFAULT');
  const [showActionModal, setShowActionModal] = useState(false);
  const [boardZoom, setBoardZoom] = useState(1.0);
  const [auctionSearchQuery, setAuctionSearchQuery] = useState('');
  const [auctionContinentFilter, setAuctionContinentFilter] = useState<'ALL' | 'Europe' | 'Asie' | 'Afrique' | 'Amérique'>('ALL');







  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const newSocket = io(SERVER_URL);
    setSocket(newSocket);

    newSocket.on('gameStateUpdate', (state: GameState) => {
      setGameState(state);
      setJoined(true);
      setErrorMsg('');
    });

    newSocket.on('error', (msg: string) => {
      setErrorMsg(msg);
    });

    newSocket.on('lobbyClosed', () => {
      alert("Le salon a été fermé par l'hôte. Retour à l'accueil.");
      setJoined(false);
      setGameState(null);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);


  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [gameState?.log]);

  // Initialiser la valeur de l'offre quand l'enchère commence
  useEffect(() => {
    if (gameState?.auction) {
      const minBid = gameState.auction.currentHighestBidderId === null
        ? gameState.auction.currentBid
        : gameState.auction.currentBid + 100000;
      setBidValue(minBid);
    }
  }, [gameState?.auction?.currentBid, gameState?.auction?.currentHighestBidderId]);

  // Réinitialiser la sélection de titres d'enchères et les filtres quand le tour ou le statut change (évite l'accumulation)
  useEffect(() => {
    setSelectedTitlesForAuction([]);
    setAuctionSearchQuery('');
    setAuctionContinentFilter('ALL');
  }, [gameState?.currentPlayerIndex, gameState?.status]);


  // Retarder l'ouverture du pop-up d'action pour laisser le pion glisser sur le plateau (0.8s d'anim + 0.4s de pause)
  useEffect(() => {
    if (!gameState || !socket) return;
    const isMyTurn = gameState.players[gameState.currentPlayerIndex]?.id === socket.id;
    
    if (isMyTurn && gameState.lastDiceRoll !== null && gameState.status === 'PLAYING') {
      const timer = setTimeout(() => {
        setShowActionModal(true);
      }, 1200);
      return () => clearTimeout(timer);
    } else {
      setShowActionModal(false);
    }
  }, [gameState?.currentPlayerIndex, gameState?.lastDiceRoll, gameState?.status, socket?.id]);



  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !roomCode.trim() || !socket) return;
    socket.emit('joinGame', { username, roomCode });
  };

  const handleStartGame = () => {
    if (socket) socket.emit('startGame');
  };

  const handleCloseLobby = () => {
    if (socket && window.confirm("Voulez-vous vraiment fermer et supprimer ce salon de jeu ? Tous les joueurs seront redirigés vers l'accueil.")) {
      socket.emit('closeLobby');
    }
  };


  const handleRollDice = () => {
    if (socket) socket.emit('rollDice');
  };

  const handleBuyTitle = (titleId: string) => {
    if (socket) socket.emit('buyTitle', { titleId });
  };

  const handleBuyJokerCard = () => {
    if (socket) socket.emit('buyJokerCard');
  };

  const handleUseJokerCard = () => {
    if (socket) socket.emit('useJokerCard');
  };

  const handleStartAuction = () => {
    if (socket && selectedTitlesForAuction.length > 0) {
      socket.emit('startAuction', { titleIds: selectedTitlesForAuction });
      setSelectedTitlesForAuction([]);
    }
  };

  const handlePlaceBid = () => {
    if (socket) {
      socket.emit('placeBid', { bidAmount: bidValue });
    }
  };

  const handlePassBid = () => {
    if (socket) {
      socket.emit('passBid');
    }
  };

  const handlePassTurn = () => {
    if (socket) socket.emit('passTurn');
  };

  const toggleSelectTitleForAuction = (titleId: string) => {
    setSelectedTitlesForAuction((prev) =>
      prev.includes(titleId) ? prev.filter((id) => id !== titleId) : [...prev, titleId]
    );
  };

  // Calcul du placement dans la double-boucle (grille 11x11, 70 cases)
  const getCellGridCoords = (index: number) => {
    // Boucle 1 (extérieure) : index 0 à 39
    if (index >= 0 && index <= 39) {
      if (index <= 10) return { gridRow: 1, gridColumn: index + 1 };
      if (index <= 19) return { gridRow: index - 9, gridColumn: 11 };
      if (index <= 30) return { gridRow: 11, gridColumn: 11 - (index - 20) };
      return { gridRow: 11 - (index - 30), gridColumn: 1 };
    }
    
    // Boucle 2 (intérieure) : index 40 à 69 (30 cases)
    const inner = index - 40;
    if (inner <= 8) return { gridRow: 2, gridColumn: inner + 2 }; // col 2 à 10
    if (inner <= 14) return { gridRow: (inner - 9) + 3, gridColumn: 10 }; // row 3 à 8
    if (inner <= 23) return { gridRow: 10, gridColumn: 10 - (inner - 15) }; // col 10 à 2
    return { gridRow: 9 - (inner - 24), gridColumn: 2 }; // row 9 à 4
  };


  if (!joined || !gameState) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="bg-slate-900 p-8 rounded-2xl shadow-2xl w-full max-w-md border border-slate-800">
          <h1 className="text-3xl font-extrabold text-center mb-2 tracking-tight bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
            Richesses du Monde
          </h1>
          <p className="text-center text-slate-400 text-sm mb-6">Rejouez au jeu de société économique culte</p>

          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Votre Pseudo</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ex: Alexandre"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Code de la Partie</label>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                placeholder="Ex: LOBBY123"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 uppercase"
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
              className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-slate-950 font-bold py-3 rounded-lg shadow-lg hover:shadow-xl transition duration-200"
            >
              Rejoindre ou Créer le Salon
            </button>
          </form>
        </div>
      </div>
    );
  }

  const me = gameState.players.find((p) => p.id === socket?.id);
  const isMyTurn = gameState.players[gameState.currentPlayerIndex]?.id === socket?.id;
  const currentTurnPlayer = gameState.players[gameState.currentPlayerIndex];
  const isHost = gameState.players[0]?.id === socket?.id;


  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col p-4">
      {/* Header */}
      <header className="flex justify-between items-center bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-md mb-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-wider text-amber-500 font-sans">RICHESSES DU MONDE</h1>
            <p className="text-xs text-slate-400">Code du salon : <span className="font-mono text-white font-bold">{gameState.gameId}</span></p>
          </div>
          <button
            onClick={() => {
              if (socket && window.confirm("Voulez-vous vraiment réinitialiser la partie ? Tout sera remis à zéro.")) {
                socket.emit('resetGame');
              }
            }}
            className="bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white font-bold py-1.5 px-3 rounded-lg text-[10px] border border-slate-700 transition"
          >
            🔄 Réinitialiser la Partie
          </button>

          {isHost && (
            <button
              onClick={handleCloseLobby}
              className="bg-red-950/40 hover:bg-red-900/60 text-red-400 hover:text-red-200 font-bold py-1.5 px-3 rounded-lg text-[10px] border border-red-900/50 transition"
            >
              🚪 Fermer le Salon
            </button>
          )}

        </div>

        <div className="flex items-center gap-3">
          {me && (
            <div className="flex items-center gap-3 bg-slate-800 px-4 py-2 rounded-lg border border-slate-700 shadow-sm">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: me.color }} />
              <span className="font-semibold text-sm">{me.username} (Vous)</span>
              <span className="text-amber-400 font-bold ml-2">{me.cash.toLocaleString()} F</span>
              {me.hasJokerCard && (
                <span className="bg-indigo-900 border border-indigo-500 text-indigo-200 text-[10px] px-1.5 py-0.5 rounded font-bold">
                  🃏 JOKER
                </span>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Lobby State */}
      {gameState.status === 'LOBBY' ? (
        <div className="flex-1 flex flex-col items-center justify-center max-w-xl mx-auto w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center shadow-lg">
          <h2 className="text-2xl font-bold mb-6 text-slate-200">Salon d'attente</h2>
          <div className="w-full space-y-3 mb-8">
            <h3 className="text-sm font-semibold text-slate-400 text-left">Joueurs connectés ({gameState.players.length}) :</h3>
            {gameState.players.map((p) => (
              <div key={p.id} className="flex items-center justify-between bg-slate-800 p-3.5 rounded-lg border border-slate-700">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                  <span className="font-medium text-white">{p.username}</span>
                </div>
                <span className="text-slate-400 text-xs">{p.id === socket?.id ? 'Hôte (Vous)' : 'Prêt'}</span>
              </div>
            ))}
          </div>

          {gameState.players.length < 2 ? (
            <div className="text-amber-400/80 text-sm mb-4">
              En attente d'autres joueurs pour démarrer (minimum 2 joueurs requis)...
            </div>
          ) : (
            <button
              onClick={handleStartGame}
              className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-3 rounded-lg shadow-md hover:shadow-lg transition duration-200"
            >
              Lancer la Partie 🚀
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Playing / Finished Game State */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4">

          
          {/* Plateau 2D à Gauche (Prend 3 colonnes sur LG) */}
          <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex items-center justify-center overflow-auto relative min-h-[600px]">
            
            {/* Zoom Controls Overlay */}
            <div className="absolute top-4 right-4 z-30 bg-slate-950/85 backdrop-blur-sm border border-slate-800 p-1.5 rounded-lg flex items-center gap-2 shadow-lg select-none">
              <span className="text-[10px] text-slate-400 font-bold px-1.5 uppercase tracking-wider">Plateau :</span>
              <button
                onClick={() => setBoardZoom(prev => Math.max(0.6, parseFloat((prev - 0.1).toFixed(1))))}
                className="w-7 h-7 bg-slate-800 hover:bg-slate-750 active:bg-slate-700 text-slate-100 rounded flex items-center justify-center font-black text-xs transition"
                title="Zoomer arrière"
              >
                ➖
              </button>
              <span className="text-xs font-mono font-bold text-amber-400 min-w-[40px] text-center">
                {Math.round(boardZoom * 100)}%
              </span>
              <button
                onClick={() => setBoardZoom(prev => Math.min(2.0, parseFloat((prev + 0.1).toFixed(1))))}
                className="w-7 h-7 bg-slate-800 hover:bg-slate-750 active:bg-slate-700 text-slate-100 rounded flex items-center justify-center font-black text-xs transition"
                title="Zoomer avant"
              >
                ➕
              </button>
              <button
                onClick={() => setBoardZoom(1.0)}
                className="text-[9px] bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white px-2 py-1 rounded font-bold border border-slate-800 transition"
                title="Rétablir zoom à 100%"
              >
                Réinit
              </button>
            </div>

            {/* Wrapper pour calculer les dimensions réelles après zoom et permettre le défilement (scroll) */}
            <div 
              style={{ width: `${880 * boardZoom}px`, height: `${880 * boardZoom}px` }} 
              className="relative flex items-center justify-center overflow-hidden flex-none"
            >
              {/* Grille du plateau 11x11 */}
              <div 
                style={{
                  transform: `scale(${boardZoom})`,
                  transformOrigin: 'center center',
                  width: '880px',
                  height: '880px'
                }}
                className="grid grid-cols-11 grid-rows-11 gap-0.5 absolute text-slate-100 font-sans transition-transform duration-350 ease-out"
              >


              
              {/* Rendu des 78 cases du plateau spiralé */}
              {gameState.board.map((cell) => {
                const coords = getCellGridCoords(cell.index);
                const royaltyRes = cell.royaltyResourceType ? RESOURCE_DEFINITIONS[cell.royaltyResourceType] : null;

                
                return (
                  <div
                    key={cell.index}
                    onClick={() => setSelectedCellIndex(cell.index)}
                    style={{
                      gridRow: coords.gridRow,
                      gridColumn: coords.gridColumn,
                      borderColor: royaltyRes ? royaltyRes.color : 'transparent'
                    }}
                    className={`bg-slate-800 border-t-2 p-1 flex flex-col justify-between overflow-hidden text-[9px] relative hover:bg-slate-700/60 transition cursor-pointer select-none rounded-sm border-slate-700 ${
                      cell.type === 'DEPART' ? 'bg-amber-950/40 border-2 border-amber-500 font-bold animate-pulse' : ''
                    } ${cell.type === 'BANQUE' ? 'bg-emerald-950/20 border-t-emerald-500' : ''} ${
                      cell.type === 'ACTUALITE' || cell.type === 'JOKER' ? 'bg-indigo-950/30 border-t-indigo-500' : ''
                    } ${
                      cell.type === 'CHOIX_CONTINENTAL' || cell.type === 'CHOIX_MONDIAL' || cell.type === 'ENCHERES' ? 'bg-teal-950/30 border-t-teal-500 font-semibold' : ''
                    } ${
                      selectedCellIndex === cell.index ? 'ring-2 ring-amber-400 bg-slate-750' : ''
                    }`}
                    title={`${cell.name} - Case #${cell.index}`}
                  >

                    {/* Nom de la case */}
                    <div className="font-bold text-slate-300 leading-tight truncate">
                      {cell.name}
                    </div>

                    {/* Ressources produites par ce pays */}
                    {cell.type === 'RICHESSE' && cell.titleIds && (
                      <div className="flex flex-col gap-0.5 my-1 text-[7px] text-slate-400 leading-none">
                        {cell.titleIds.map((tId) => {
                          const t = gameState.titles[tId];
                          const ownerColor = t.ownerId ? gameState.players.find(p => p.id === t.ownerId)?.color : null;
                          return (
                            <div key={tId} className="flex justify-between items-center pr-0.5">
                              <span className="truncate" style={{ color: RESOURCE_DEFINITIONS[t.resourceType].color }}>
                                {RESOURCE_DEFINITIONS[t.resourceType].name.substring(0, 6)}.
                              </span>
                              <span
                                style={{ color: ownerColor || '#94a3b8' }}
                                className={`font-mono font-bold ${ownerColor ? 'underline decoration-dotted' : ''}`}
                              >
                                {t.percentage}%
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Plaquette Royaltie ou Détails */}
                    {royaltyRes ? (
                      <div className="text-[7.5px] bg-slate-950/80 rounded px-0.5 py-0.5 border border-slate-800 font-semibold text-slate-100 flex items-center justify-center truncate mt-auto">
                        Plaq: {royaltyRes.name}
                      </div>
                    ) : (
                      <div className="text-[7.5px] text-slate-500 truncate mt-auto">
                        {cell.type !== 'RICHESSE' ? cell.type.replace('_', ' ') : ''}
                      </div>
                    )}


                  </div>
                );
              })}

              {/* Rendu des pions des joueurs animés en surcouche */}
              {gameState.players
                .filter((p) => !p.isBankrupt)
                .map((p) => {
                  const coords = getCellGridCoords(p.position);
                  const playersOnSameCell = gameState.players.filter(
                    (other) => other.position === p.position && !other.isBankrupt
                  );
                  const playerIndexInCell = playersOnSameCell.findIndex((other) => other.id === p.id);
                  const cellWidthPercent = 100 / 11;
                  const baseLeft = (coords.gridColumn - 1) * cellWidthPercent;
                  const baseTop = (coords.gridRow - 1) * cellWidthPercent;
                  
                  // Positionnement à l'intérieur de la case
                  const offsetX = 10 + (playerIndexInCell % 3) * 14;
                  const offsetY = 44 + Math.floor(playerIndexInCell / 3) * 14;
                  
                  return (
                    <span
                      key={p.id}
                      style={{
                        left: `calc(${baseLeft}% + ${offsetX}px)`,
                        top: `calc(${baseTop}% + ${offsetY}px)`,
                        backgroundColor: p.color,
                        transition: 'left 0.8s cubic-bezier(0.25, 1, 0.5, 1), top 0.8s cubic-bezier(0.25, 1, 0.5, 1)',
                      }}
                      className="absolute w-4 h-4 rounded-full flex items-center justify-center font-bold text-[9px] text-white border border-slate-950 shadow-md z-20 pointer-events-none transform -translate-x-1/2 -translate-y-1/2"
                      title={p.username}
                    >
                      {p.username[0].toUpperCase()}
                    </span>
                  );
                })}
              {/* Console Centrale (Dice, Actions, Log) placée au centre de la grille (lignes 4 à 9, colonnes 3 à 9) */}

              <div 
                style={{ gridRow: "4 / 10", gridColumn: "3 / 10" }}
                className="bg-slate-950 rounded-xl border border-slate-800 p-4 flex flex-col justify-between shadow-inner overflow-hidden z-10"
              >
                {selectedCellIndex !== null ? (
                  <div className="flex flex-col justify-between h-full space-y-3">
                    <div className="space-y-2 flex-1 flex flex-col min-h-0">
                      <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                        <div className="flex flex-col">
                          <span className="text-[9px] text-amber-500 font-bold uppercase tracking-wider">
                            Détails Case #{selectedCellIndex}
                          </span>
                          <span className="text-sm font-black text-slate-100 uppercase tracking-wide truncate max-w-[150px]">
                            {gameState.board[selectedCellIndex].name}
                          </span>
                        </div>
                        <button
                          onClick={() => setSelectedCellIndex(null)}
                          className="text-[9.5px] bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold py-1.5 px-2.5 rounded border border-slate-700 transition"
                        >
                          ✖ Fermer
                        </button>
                      </div>

                      <div className="text-[10px] text-slate-400 leading-normal flex-none">
                        {(() => {
                          const cell = gameState.board[selectedCellIndex];
                          if (cell.type === 'DEPART') return "Case Départ : Tous les joueurs démarrent ici.";
                          if (cell.type === 'BANQUE') return "Case Banque : Vous recevez 500 000 F multiplié par le résultat de vos dés.";
                          if (cell.type === 'ACTUALITE') return "Case Actualité : Vous piochez une carte Actualité (effet financier direct).";
                          if (cell.type === 'JOKER') return "Case Joker : Vous pouvez acquérir une carte Joker pour 3 000 000 F (protection contre les enchères).";
                          if (cell.type === 'ENCHERES') return "Case Enchères : Vous devez mettre aux enchères un ou plusieurs de vos titres.";
                          if (cell.type === 'CHOIX_MONDIAL') return "Case Choix Mondial : Permet d'acheter un titre existant de votre choix.";
                          if (cell.type === 'CHOIX_CONTINENTAL') return `Case Choix Continental (${cell.continent}) : Permet d'acheter un titre libre sur le continent ${cell.continent}.`;
                          return `Pays d'exploitation. Si vous tombez sur une case de redevance correspondante, vous payez des royalties au propriétaire du monopole.`;
                        })()}
                      </div>

                      {/* Liste des titres d'exploitation pour cette case Richesse */}
                      {(() => {
                        const cell = gameState.board[selectedCellIndex];
                        if (cell.type !== 'RICHESSE' || !cell.titleIds) return null;
                        const countryTitles = cell.titleIds.map(id => gameState.titles[id]);
                        return (
                          <div className="space-y-1.5 pt-1.5 flex-1 flex flex-col min-h-0">
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider flex-none">
                              Titres de production :
                            </span>
                            <div className="overflow-y-auto space-y-1 pr-1 flex-1 min-h-0 max-h-[160px]">
                              {countryTitles.map((t) => {
                                const owner = t.ownerId ? gameState.players.find(p => p.id === t.ownerId) : null;
                                return (
                                  <div key={t.id} className="bg-slate-900 p-2 rounded border border-slate-800 flex justify-between items-center text-[10px] gap-2">
                                    <div className="flex items-center gap-1.5 font-semibold truncate min-w-0">
                                      <span className="w-2 h-2 rounded-full flex-none" style={{ backgroundColor: RESOURCE_DEFINITIONS[t.resourceType].color }} />
                                      <span className="truncate" style={{ color: RESOURCE_DEFINITIONS[t.resourceType].color }}>
                                        {RESOURCE_DEFINITIONS[t.resourceType].name}
                                      </span>
                                      <span className="text-slate-400 font-mono text-[9px]">({t.percentage}%)</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 flex-none">
                                      <span className="text-slate-500 font-mono text-[9px]">{t.purchasePrice.toLocaleString()} F</span>
                                      {owner ? (
                                        <span
                                          className="px-1.5 py-0.5 rounded font-bold text-[8px] truncate max-w-[80px]"
                                          style={{ backgroundColor: `${owner.color}15`, color: owner.color, border: `1px solid ${owner.color}30` }}
                                        >
                                          {owner.username}
                                        </span>
                                      ) : (
                                        <span className="bg-emerald-950/20 border border-emerald-900/50 text-emerald-400 px-1 py-0.5 rounded font-bold text-[8px]">
                                          LIBRE
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    <div className="text-[8.5px] text-slate-500 italic text-center border-t border-slate-850/50 pt-1.5 flex-none">
                      Cliquez sur une autre case ou sur Fermer.
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full border border-slate-950"
                            style={{ backgroundColor: currentTurnPlayer?.color }}
                          />
                          <h3 className="font-bold text-sm text-slate-100 truncate max-w-xs">
                            Tour de {currentTurnPlayer?.username} {isMyTurn && "(Vous)"}
                          </h3>
                        </div>
                        <div className="text-xs font-semibold text-slate-400">
                          Tour #{gameState.turnNumber}
                        </div>
                      </div>

                      {/* Zone d'action centrale */}
                      {gameState.status === 'AUCTION' && gameState.auction ? (
                        /* --- INTERFACE D'ENCHÈRE --- */
                        <div className="bg-slate-900 border border-indigo-500/50 p-3 rounded-lg space-y-2 shadow-inner">
                          <div className="text-center font-bold text-indigo-400 text-[10px] tracking-wider uppercase">
                            ⚠️ ENCHÈRE EN COURS
                          </div>
                          <div className="text-center text-[10px] text-slate-300">
                            Vente de <span className="text-white font-bold font-mono">{gameState.auction.titleIds.length}</span> titre(s) par <span className="font-bold">{gameState.players.find((p) => p.id === gameState.auction?.sellerId)?.username}</span>
                          </div>

                          <div className="max-h-16 overflow-y-auto space-y-1 bg-slate-950 p-1.5 rounded border border-slate-800 text-[10px]">
                            {gameState.auction.titleIds.map((id) => {
                              const title = gameState.titles[id];
                              return (
                                <div key={id} className="flex justify-between">
                                  <span>{title.country}</span>
                                  <span className="font-bold" style={{ color: RESOURCE_DEFINITIONS[title.resourceType].color }}>
                                    {RESOURCE_DEFINITIONS[title.resourceType].name}
                                  </span>
                                </div>
                              );
                            })}
                          </div>

                          <div className="flex justify-between items-center bg-slate-950 p-2 rounded border border-slate-800">
                            <div>
                              <div className="text-[8px] text-slate-400 uppercase font-bold">Meilleure offre</div>
                              <div className="text-sm font-black text-amber-400">
                                {gameState.auction.currentBid.toLocaleString()} F
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-[8px] text-slate-400 uppercase font-bold">Offrant</div>
                              <div className="text-xs font-bold text-white">
                                {gameState.auction.currentHighestBidderId
                                  ? gameState.players.find((p) => p.id === gameState.auction?.currentHighestBidderId)?.username
                                  : 'Banque'}
                              </div>
                            </div>
                          </div>

                          {/* Formulaire d'enchère pour les autres joueurs */}
                          {socket?.id !== gameState.auction.sellerId && !me?.isBankrupt && (
                            <div className="space-y-1.5">
                              <div className="flex gap-2">
                                <input
                                  type="number"
                                  value={bidValue}
                                  onChange={(e) => setBidValue(Math.max(0, parseInt(e.target.value) || 0))}
                                  step="100000"
                                  className="w-24 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs font-bold"
                                />
                                <button
                                  onClick={handlePlaceBid}
                                  disabled={bidValue < (gameState.auction.currentHighestBidderId === null ? gameState.auction.currentBid : gameState.auction.currentBid + 100000) || (me?.cash ?? 0) < bidValue}
                                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-700 text-white font-bold py-1 rounded text-xs transition"
                                >
                                  Enchérir 💰
                                </button>
                              </div>
                              <button
                                onClick={handlePassBid}
                                className="w-full bg-slate-850 hover:bg-slate-800 text-white font-semibold py-1 rounded text-[10px] border border-slate-700 transition"
                              >
                                Passer l'offre ➡️
                              </button>
                            </div>
                          )}

                          {socket?.id === gameState.auction.sellerId && (
                            <div className="text-[10px] text-amber-400/80 text-center italic">
                              En attente des offres des autres joueurs...
                            </div>
                          )}
                        </div>
                      ) : (
                        /* --- INTERFACE DE JEU NORMALE --- */
                        <div className="flex flex-col items-center justify-center py-2 space-y-2">
                          {/* Lancement de dés */}
                          {gameState.lastDiceRoll ? (
                            <div className="flex gap-2">
                              <div className="w-10 h-10 bg-white text-slate-900 rounded-lg flex items-center justify-center font-extrabold text-lg shadow border border-slate-350">
                                {gameState.lastDiceRoll[0]}
                              </div>
                              <div className="w-10 h-10 bg-red-600 text-white rounded-lg flex items-center justify-center font-extrabold text-lg shadow border border-red-500">
                                {gameState.lastDiceRoll[1]}
                              </div>
                            </div>
                          ) : (
                            <div className="text-slate-400 text-xs italic">Les dés ne sont pas encore lancés.</div>
                          )}

                          {/* Actions disponibles pour le joueur actif */}
                          {isMyTurn && (
                            <div className="w-full space-y-2">
                              {gameState.lastDiceRoll === null && (
                                <button
                                  onClick={handleRollDice}
                                  className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold py-2.5 rounded-lg shadow transition transform hover:-translate-y-0.5 text-xs"
                                >
                                  Lancer les dés (Blanc + Rouge) 🎲
                                </button>
                              )}

                              {gameState.lastDiceRoll !== null && (() => {
                                const cell = gameState.board[me?.position ?? 0];
                                const availableTitles = cell.type === 'RICHESSE'
                                  ? cell.titleIds?.map(id => gameState.titles[id]).filter(t => t.ownerId === null) || []
                                  : [];
                                const isChoix = cell.type === 'CHOIX_MONDIAL' || cell.type === 'CHOIX_CONTINENTAL';
                                const availableChoixTitles = isChoix && (me?.lapsCompleted ?? 0) >= 1
                                  ? Object.values(gameState.titles).filter(
                                      t => t.ownerId === null && 
                                      Object.values(gameState.titles).some(myT => myT.resourceType === t.resourceType && myT.ownerId === me?.id)
                                    )
                                  : [];

                                const hasRichesseAction = cell.type === 'RICHESSE' && availableTitles.length > 0;
                                const hasChoixAction = isChoix && (me?.lapsCompleted ?? 0) >= 1 && availableChoixTitles.length > 0;
                                const hasJokerAction = cell.type === 'JOKER' && !me?.hasJokerCard && (me?.cash ?? 0) >= 3000000;
                                const hasEnchereAction = cell.type === 'ENCHERES' && (me?.lapsCompleted ?? 0) >= 1;
                                const hasAnyAction = hasRichesseAction || hasChoixAction || hasJokerAction || hasEnchereAction;

                                return (
                                  <div className="space-y-2 text-center">
                                    {hasAnyAction ? (
                                      <div className="text-[11px] text-amber-400 font-semibold py-1 animate-pulse">
                                        Sélectionnez vos actions dans le pop-up à l'écran.
                                      </div>
                                    ) : (
                                      <div className="text-[11px] text-slate-400 py-1">
                                        Aucune action disponible sur cette case.
                                      </div>
                                    )}
                                    <button
                                      onClick={handlePassTurn}
                                      disabled={cell.type === 'ENCHERES' && Object.values(gameState.titles).some(t => t.ownerId === me?.id)}
                                      className="w-full bg-slate-800 hover:bg-slate-750 disabled:bg-slate-900 disabled:text-slate-550 disabled:border-slate-850 text-white font-bold py-2 rounded-lg border border-slate-700 text-xs transition"
                                    >
                                      Terminer mon tour ➡️
                                    </button>

                                  </div>
                                );
                              })()}
                            </div>
                          )}

                          {!isMyTurn && (
                            <div className="text-xs text-slate-500 italic py-2">
                              En attente du lancer de {currentTurnPlayer?.username}...
                            </div>
                          )}
                        </div>

                      )}
                    </div>

                    {/* Historique du jeu (log) */}
                    <div className="h-28 bg-slate-900 border border-slate-800 rounded p-2 overflow-y-auto font-mono text-[9.5px] text-slate-300 shadow-inner">
                      {gameState.log.map((logLine, index) => (
                        <div key={index} className="border-b border-slate-950/30 pb-0.5 mb-0.5 last:border-0 last:pb-0">
                          {logLine}
                        </div>
                      ))}
                      <div ref={logsEndRef} />
                    </div>
                  </>
                )}
              </div>

            </div>
          </div>
        </div>



          {/* Fiches Joueurs à Droite (Prend 1 colonne sur LG) */}
          <div className="lg:col-span-1 space-y-4 max-h-[780px] overflow-y-auto pr-1">
            
            {/* Section Joueurs */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow">
              <h3 className="font-bold text-sm text-slate-400 mb-3 uppercase tracking-wider">État des Joueurs</h3>
              <div className="space-y-2">
                {gameState.players.map((p) => (
                  <div
                    key={p.id}
                    className={`p-2.5 rounded-lg border flex flex-col justify-between ${
                      p.isBankrupt ? 'bg-red-950/20 border-red-900/50 opacity-60' : 'bg-slate-800/80 border-slate-700/80'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                        <span className={`font-semibold text-xs ${p.isBankrupt ? 'line-through text-slate-500' : 'text-slate-100'}`}>
                          {p.username}
                        </span>
                      </div>
                      {p.isBankrupt && <span className="text-[9px] bg-red-900 text-red-200 px-1 rounded font-bold">FAILLITE</span>}
                    </div>
                    
                    {!p.isBankrupt && (
                      <div className="flex justify-between items-center mt-1.5 pt-1.5 border-t border-slate-700/30 text-[11px]">
                        <span className="text-slate-400">Fortune :</span>
                        <span className="text-amber-400 font-bold">{p.cash.toLocaleString()} F</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Section Titres Possédés */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow max-h-[680px] overflow-y-auto flex flex-col min-h-0">
              <div className="flex flex-col gap-1.5 border-b border-slate-800 pb-2.5 mb-2.5 flex-none">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-xs text-slate-400 uppercase tracking-wider">Vos Monopoles</h3>
                  <span className="text-[9px] bg-slate-850 text-slate-400 px-1.5 py-0.5 rounded font-mono">
                    Tri : {monopolySortMode === 'DEFAULT' ? 'Sabot' : monopolySortMode === 'PERCENTAGE' ? 'Parts %' : monopolySortMode === 'ROYALTIES' ? 'Gains' : 'A-Z'}
                  </span>
                </div>
                
                {/* Contrôles de tri */}
                <div className="grid grid-cols-4 gap-1 text-[9px]">
                  <button
                    onClick={() => setMonopolySortMode('DEFAULT')}
                    className={`py-1 rounded font-bold transition text-center ${monopolySortMode === 'DEFAULT' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'bg-slate-800 hover:bg-slate-750 text-slate-300'}`}
                    title="Ordre officiel du sabot de jeu"
                  >
                    Sabot
                  </button>
                  <button
                    onClick={() => setMonopolySortMode('PERCENTAGE')}
                    className={`py-1 rounded font-bold transition text-center ${monopolySortMode === 'PERCENTAGE' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'bg-slate-800 hover:bg-slate-750 text-slate-300'}`}
                    title="Trier par pourcentage de production détenu"
                  >
                    Parts %
                  </button>
                  <button
                    onClick={() => setMonopolySortMode('ROYALTIES')}
                    className={`py-1 rounded font-bold transition text-center ${monopolySortMode === 'ROYALTIES' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'bg-slate-800 hover:bg-slate-750 text-slate-300'}`}
                    title="Trier par montant de royalties"
                  >
                    Gains
                  </button>
                  <button
                    onClick={() => setMonopolySortMode('ALPHABETICAL')}
                    className={`py-1 rounded font-bold transition text-center ${monopolySortMode === 'ALPHABETICAL' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'bg-slate-800 hover:bg-slate-750 text-slate-300'}`}
                    title="Trier par ordre alphabétique"
                  >
                    A-Z
                  </button>
                </div>
              </div>

              <div className="space-y-2 overflow-y-auto pr-0.5 flex-1 min-h-0">
                {(() => {
                  const ownedResources = Object.values(RESOURCE_DEFINITIONS)
                    .map((res) => {
                      const myTitles = Object.values(gameState.titles).filter(
                        (t) => t.resourceType === res.type && t.ownerId === me?.id
                      );
                      const totalPercentage = myTitles.reduce((sum, t) => sum + (t.percentage ?? 0), 0);
                      const royaltiesAmount = myTitles.length >= 2 ? res.royalties[myTitles.length - 2] : 0;
                      return { res, myTitles, totalPercentage, royaltiesAmount };
                    })
                    .filter((item) => item.myTitles.length > 0);

                  // Tri en fonction du mode choisi
                  if (monopolySortMode === 'ALPHABETICAL') {
                    ownedResources.sort((a, b) => a.res.name.localeCompare(b.res.name));
                  } else if (monopolySortMode === 'PERCENTAGE') {
                    ownedResources.sort((a, b) => b.totalPercentage - a.totalPercentage);
                  } else if (monopolySortMode === 'ROYALTIES') {
                    ownedResources.sort((a, b) => b.royaltiesAmount - a.royaltiesAmount);
                  }

                  if (ownedResources.length === 0) {
                    return (
                      <div className="text-slate-500 text-xs italic text-center py-4">
                        Aucun titre d'exploitation détenu.
                      </div>
                    );
                  }

                  return ownedResources.map(({ res, myTitles, totalPercentage, royaltiesAmount }) => (
                    <div key={res.type} className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/60 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold" style={{ color: res.color }}>
                          {res.name}
                        </span>
                        <span className="text-slate-200 font-bold text-[10px]">
                          {totalPercentage}%
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center text-[9px]">
                        <span className="text-slate-400">Parts : {myTitles.length}/6</span>
                        <span className="text-amber-400 font-bold">
                          {royaltiesAmount > 0 ? `${royaltiesAmount.toLocaleString()} F / passage` : '0 F (sans monopole)'}
                        </span>
                      </div>

                      <div className="text-[9px] text-slate-500 flex flex-wrap gap-1 pt-1 border-t border-slate-700/20">
                        {myTitles.map(t => (
                          <span key={t.id} className="bg-slate-700/40 px-1 py-0.5 rounded border border-slate-650/50">
                            {t.country} ({t.percentage}%)
                          </span>
                        ))}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>

          </div>
        </div>



      {/* Rendu du pop-up modal d'action principal */}
      {showActionModal && (() => {
        const cell = gameState.board[me?.position ?? 0];

        
        // Achat titres pays
        const availableTitles = cell.type === 'RICHESSE'
          ? cell.titleIds?.map(id => gameState.titles[id]).filter(t => t.ownerId === null) || []
          : [];

        // Achat titres Choix
        const isChoix = cell.type === 'CHOIX_MONDIAL' || cell.type === 'CHOIX_CONTINENTAL';
        const availableChoixTitles = isChoix && (me?.lapsCompleted ?? 0) >= 1
          ? Object.values(gameState.titles).filter(t => {
              if (t.ownerId !== null) return false;
              const ownsResource = Object.values(gameState.titles).some(
                myT => myT.resourceType === t.resourceType && myT.ownerId === me?.id
              );
              if (!ownsResource) return false;

              if (cell.type === 'CHOIX_CONTINENTAL') {
                const titleContinent = COUNTRY_CONTINENT_MAP[t.country];
                return titleContinent === cell.continent;
              }
              return true;
            })
          : [];


        // Vérifier si des actions sont disponibles sur cette case
        const hasRichesseAction = cell.type === 'RICHESSE' && availableTitles.length > 0;
        const hasChoixAction = isChoix && (me?.lapsCompleted ?? 0) >= 1 && availableChoixTitles.length > 0;
        const hasJokerAction = cell.type === 'JOKER' && !me?.hasJokerCard && (me?.cash ?? 0) >= 3000000;
        const hasEnchereAction = cell.type === 'ENCHERES' && (me?.lapsCompleted ?? 0) >= 1;

        if (!hasRichesseAction && !hasChoixAction && !hasJokerAction && !hasEnchereAction) {
          return null;
        }

        return (
          <div className="fixed inset-0 bg-slate-950/85 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-850 rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-4">
              <div className="text-center space-y-1">
                <span className="text-[10px] bg-amber-500/20 text-amber-400 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Action Disponible
                </span>
                <h2 className="text-xl font-black text-slate-100 uppercase tracking-wide">
                  {cell.name}
                </h2>
                <p className="text-slate-400 text-[11px] pb-1">
                  Vous avez atterri sur cette case. Choisissez votre action :
                </p>
                {/* Affichage de l'argent et compteur d'achats dans le pop-up */}
                <div className="flex justify-center gap-2 items-center mt-1.5 flex-wrap">
                  <div className="bg-slate-800 border border-slate-700/80 px-4 py-1 rounded-full text-xs font-bold shadow-inner">
                    Votre Fortune : <span className="text-amber-400 font-mono font-extrabold">{(me?.cash ?? 0).toLocaleString()} F</span>
                  </div>
                  <div className="bg-slate-800 border border-slate-700/80 px-4 py-1 rounded-full text-xs font-bold shadow-inner text-slate-350">
                    Achats ce tour : <span className={`font-mono font-extrabold ${gameState.purchasesThisTurn >= 6 ? 'text-red-400' : 'text-slate-200'}`}>{gameState.purchasesThisTurn}/6</span>
                  </div>
                </div>

                {gameState.purchasesThisTurn >= 6 && (
                  <div className="bg-red-950/45 border border-red-900/50 text-red-400 p-2.5 rounded-lg text-[10px] font-bold text-center mt-2 animate-pulse">
                    ⚠️ Limite de 6 achats par tour atteinte ! Vous ne pouvez plus acheter de titres ce tour-ci.
                  </div>
                )}
              </div>



              {/* Section Achat Richesse */}
              {hasRichesseAction && (
                <div className="space-y-2">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Titres disponibles :</h3>
                  <div className="grid grid-cols-1 gap-2">
                    {availableTitles.map((t) => {
                      const myCurrentTitles = Object.values(gameState.titles).filter(
                        (title) => title.resourceType === t.resourceType && title.ownerId === me?.id
                      );
                      const currentCount = myCurrentTitles.length;
                      const currentRoyalties = currentCount >= 2 ? RESOURCE_DEFINITIONS[t.resourceType].royalties[currentCount - 2] : 0;
                      const nextCount = currentCount + 1;
                      const nextRoyalties = nextCount >= 2 ? RESOURCE_DEFINITIONS[t.resourceType].royalties[nextCount - 2] : 0;

                      return (
                        <div key={t.id} className="bg-slate-850 p-2.5 rounded-lg border border-slate-750 flex justify-between items-center text-xs">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-200 flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: RESOURCE_DEFINITIONS[t.resourceType].color }} />
                              {RESOURCE_DEFINITIONS[t.resourceType].name} ({t.percentage}%)
                            </span>
                            <span className="text-[9px] text-slate-500">{t.purchasePrice.toLocaleString()} F</span>
                            <div className="text-[8.5px] text-slate-400 mt-0.5 leading-none">
                              Possédé : {currentCount}/6 ({myCurrentTitles.reduce((s, curr) => s + (curr.percentage ?? 0), 0)}%) — Redevance : {currentRoyalties.toLocaleString()} F
                              {nextRoyalties > currentRoyalties && (
                                <span className="text-emerald-400 font-bold ml-1">
                                  ➔ {nextRoyalties.toLocaleString()} F après achat !
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => handleBuyTitle(t.id)}
                            disabled={(me?.cash ?? 0) < t.purchasePrice || gameState.purchasesThisTurn >= 6}
                            className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-800 text-white font-bold py-1.5 px-3 rounded text-[11px] transition shadow ml-2"
                          >
                            Acheter
                          </button>

                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Section Achat Choix */}
              {hasChoixAction && (
                <div className="space-y-2">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Choix : Acheter un titre mondial/continental :</h3>
                  <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                    {availableChoixTitles.map((t) => {
                      const myCurrentTitles = Object.values(gameState.titles).filter(
                        (title) => title.resourceType === t.resourceType && title.ownerId === me?.id
                      );
                      const currentCount = myCurrentTitles.length;
                      const currentRoyalties = currentCount >= 2 ? RESOURCE_DEFINITIONS[t.resourceType].royalties[currentCount - 2] : 0;
                      const nextCount = currentCount + 1;
                      const nextRoyalties = nextCount >= 2 ? RESOURCE_DEFINITIONS[t.resourceType].royalties[nextCount - 2] : 0;

                      return (
                        <div key={t.id} className="bg-slate-850 p-2.5 rounded-lg border border-slate-750 flex justify-between items-center text-xs">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-200 flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: RESOURCE_DEFINITIONS[t.resourceType].color }} />
                              {t.country} - {RESOURCE_DEFINITIONS[t.resourceType].name} ({t.percentage}%)
                            </span>
                            <span className="text-[9px] text-slate-500">{t.purchasePrice.toLocaleString()} F</span>
                            <div className="text-[8.5px] text-slate-400 mt-0.5 leading-none">
                              Possédé : {currentCount}/6 ({myCurrentTitles.reduce((s, curr) => s + (curr.percentage ?? 0), 0)}%) — Redevance : {currentRoyalties.toLocaleString()} F
                              {nextRoyalties > currentRoyalties && (
                                <span className="text-teal-400 font-bold ml-1">
                                  ➔ {nextRoyalties.toLocaleString()} F après achat !
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => handleBuyTitle(t.id)}
                            disabled={(me?.cash ?? 0) < t.purchasePrice || gameState.purchasesThisTurn >= 6}
                            className="bg-teal-600 hover:bg-teal-700 disabled:bg-slate-800 text-white font-bold py-1.5 px-3 rounded text-[11px] transition ml-2"
                          >
                            Acheter
                          </button>

                        </div>
                      );
                    })}

                  </div>
                </div>
              )}

              {/* Section Achat Joker */}
              {hasJokerAction && (
                <div className="bg-slate-850 p-4 rounded-lg border border-slate-750 flex flex-col items-center text-center space-y-2">
                  <span className="text-2xl">🃏</span>
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-200 text-xs">Carte Joker disponible</span>
                    <p className="text-[9.5px] text-slate-400">Permet d'annuler les enchères obligatoires si vous y tombez dessus.</p>
                  </div>
                  <button
                    onClick={handleBuyJokerCard}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1.5 px-4 rounded text-xs transition"
                  >
                    Acheter le Joker (3 000 000 F)
                  </button>
                </div>
              )}

              {/* Section Enchères */}
              {hasEnchereAction && (
                <div className="space-y-2">
                  <h3 className="text-[10px] font-bold text-red-400 uppercase tracking-wider">
                    🔨 Enchères (Dé rouge = {gameState.lastDiceRoll?.[1]} titres)
                  </h3>

                  <p className="text-[9.5px] text-slate-400">
                    Sélectionnez les titres à mettre aux enchères. Les monopoles ne peuvent pas être dépareillés (ils seront vendus ensemble).
                  </p>

                  {/* Barre de recherche et filtres de continent */}
                  <div className="space-y-1.5 bg-slate-950 p-2 rounded-lg border border-slate-800">
                    <input
                      type="text"
                      placeholder="Rechercher par pays ou matière première..."
                      value={auctionSearchQuery}
                      onChange={(e) => setAuctionSearchQuery(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-250 text-[10px] placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                    
                    <div className="flex flex-wrap gap-1 text-[8.5px] items-center">
                      <span className="text-slate-500 font-bold mr-0.5 uppercase tracking-wider text-[8px]">Continent :</span>
                      {(['ALL', 'Europe', 'Asie', 'Afrique', 'Amérique'] as const).map((cont) => (
                        <button
                          key={cont}
                          type="button"
                          onClick={() => setAuctionContinentFilter(cont)}
                          className={`px-2 py-0.5 rounded font-bold transition ${
                            auctionContinentFilter === cont
                              ? 'bg-indigo-650 text-white'
                              : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                          }`}
                        >
                          {cont === 'ALL' ? 'Tous' : cont}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Liste des titres de l'hôte avec filtres et recherche */}
                  <div className="max-h-28 overflow-y-auto space-y-1 bg-slate-950 p-1.5 rounded border border-slate-800">
                    {(() => {
                      const allMyTitles = Object.values(gameState.titles).filter((t) => t.ownerId === me?.id);
                      
                      const filteredTitles = allMyTitles.filter((t) => {
                        // 1. Filtrer par continent
                        if (auctionContinentFilter !== 'ALL') {
                          const titleContinent = COUNTRY_CONTINENT_MAP[t.country];
                          if (titleContinent !== auctionContinentFilter) return false;
                        }
                        // 2. Filtrer par requête de recherche (pays ou ressource)
                        if (auctionSearchQuery.trim() !== '') {
                          const q = auctionSearchQuery.toLowerCase();
                          const matchesCountry = t.country.toLowerCase().includes(q);
                          const matchesResource = RESOURCE_DEFINITIONS[t.resourceType].name.toLowerCase().includes(q);
                          if (!matchesCountry && !matchesResource) return false;
                        }
                        return true;
                      });

                      if (filteredTitles.length === 0) {
                        return (
                          <div className="text-[10px] text-slate-500 italic text-center py-2">
                            {allMyTitles.length === 0 ? "Vous n'avez aucun titre à vendre." : "Aucun titre ne correspond à vos filtres."}
                          </div>
                        );
                      }

                      return filteredTitles.map((t) => (
                        <label key={t.id} className="flex items-center justify-between text-xs text-slate-350 cursor-pointer p-1 hover:bg-slate-900 rounded select-none">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={selectedTitlesForAuction.includes(t.id)}
                              onChange={() => toggleSelectTitleForAuction(t.id)}
                              className="rounded border-slate-800 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                            />
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: RESOURCE_DEFINITIONS[t.resourceType].color }} />
                            <span>{t.country} ({RESOURCE_DEFINITIONS[t.resourceType].name} - {t.percentage}%)</span>
                          </div>
                          <span className="text-[9px] text-slate-500 font-mono pr-1">
                            {COUNTRY_CONTINENT_MAP[t.country]}
                          </span>
                        </label>
                      ));
                    })()}
                  </div>


                  <div className="flex gap-2 pt-1.5">
                    {me?.hasJokerCard && (
                      <button
                        onClick={handleUseJokerCard}
                        className="flex-1 bg-indigo-650 hover:bg-indigo-700 text-white font-bold py-2 rounded text-xs transition"
                      >
                        Utiliser mon Joker 🃏
                      </button>
                    )}
                    <button
                      onClick={handleStartAuction}
                      disabled={
                        selectedTitlesForAuction.length === 0 &&
                        Object.values(gameState.titles).filter((t) => t.ownerId === me?.id).length > 0
                      }
                      className="flex-1 bg-red-650 hover:bg-red-700 disabled:bg-slate-800 text-white font-bold py-2 rounded text-xs transition"
                    >
                      Lancer l'Enchère
                    </button>
                  </div>
                </div>
              )}

              {/* Bouton de Fermeture / Passage de Tour */}
              <div className="border-t border-slate-800 pt-3">
                {!(cell.type === 'ENCHERES' && Object.values(gameState.titles).some((t) => t.ownerId === me?.id)) ? (
                  <button
                    onClick={handlePassTurn}
                    className="w-full bg-slate-800 hover:bg-slate-750 text-slate-200 font-bold py-1.5 rounded text-xs transition border border-slate-700"
                  >
                    Passer mon tour / Fermer ➡️
                  </button>
                ) : (
                  <div className="text-[10px] text-center text-red-400 font-semibold bg-red-950/20 border border-red-900/40 p-2 rounded-lg">
                    ⚠️ Case Enchères : Vous devez obligatoirement vendre un ou plusieurs titres (ou utiliser un Joker) pour pouvoir passer votre tour.
                  </div>
                )}
              </div>

            </div>
          </div>
        );
      })()}

      {/* Rendu d'une carte de fin de partie en plein écran si le jeu est terminé */}
      {gameState.status === 'FINISHED' && (
        <div className="fixed inset-0 bg-slate-950/90 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border-2 border-emerald-500/30 rounded-2xl p-8 w-full max-w-2xl shadow-2xl text-center space-y-6">
            <span className="text-5xl animate-bounce block">🏆</span>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-emerald-400 uppercase tracking-wider">
                Partie Terminée
              </h2>
              <p className="text-xs text-slate-400">
                Un grand magnat économique a vaincu tous ses adversaires !
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Carte du Vainqueur */}
              <div className="md:col-span-1 bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col justify-center items-center space-y-1">
                <span className="text-xs text-slate-500 uppercase font-semibold block">Vainqueur</span>
                <span className="text-lg font-bold text-white uppercase tracking-wider">
                  {gameState.players.find(p => !p.isBankrupt)?.username || 'Inconnu'}
                </span>
                <span className="text-[10px] text-emerald-400 font-mono font-bold mt-1">
                  {(gameState.players.find(p => !p.isBankrupt)?.cash ?? 0).toLocaleString()} F
                </span>
              </div>

              {/* Classement général final */}
              <div className="md:col-span-2 bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-left">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block border-b border-slate-800 pb-1">
                  Classement final
                </span>
                <div className="space-y-1.5 pt-1">
                  {gameState.players
                    .slice()
                    .sort((a, b) => b.cash - a.cash)
                    .map((p, idx) => (
                      <div key={p.id} className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-slate-500 font-bold">#{idx + 1}</span>
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                          <span className="font-bold text-slate-350">{p.username}</span>
                        </div>
                        <span className="font-mono font-bold text-slate-100">
                          {p.isBankrupt ? 'FAILLITE' : `${p.cash.toLocaleString()} F`}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {/* Graphique d'historique de l'argent des joueurs */}
            {(() => {
              // Récupérer l'historique le plus long
              const maxHistoryLength = Math.max(...gameState.players.map(p => p.cashHistory?.length || 0), 0);
              if (maxHistoryLength < 2) {
                return (
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-slate-500 italic">
                    Pas assez de tours joués pour afficher le graphique d'évolution.
                  </div>
                );
              }

              // Trouver la valeur max de cash atteinte pour l'échelle Y
              let maxCashEver = 20000000;
              gameState.players.forEach(p => {
                p.cashHistory?.forEach(val => {
                  if (val > maxCashEver) maxCashEver = val;
                });
              });

              // Dimensions de l'SVG
              const svgW = 500;
              const svgH = 200;
              const padLeft = 60;
              const padRight = 20;
              const padTop = 15;
              const padBottom = 25;

              const getX = (index: number) => {
                return padLeft + (index / (maxHistoryLength - 1)) * (svgW - padLeft - padRight);
              };

              const getY = (cash: number) => {
                return padTop + (1 - cash / maxCashEver) * (svgH - padTop - padBottom);
              };

              // Paliers Y pour le quadrillage (5 lignes : 0, 25%, 50%, 75%, 100%)
              const gridYValues = [0, 0.25, 0.5, 0.75, 1].map(k => k * maxCashEver);

              return (
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 text-left">
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block border-b border-slate-800 pb-1.5">
                    Graphique d'évolution des fortunes (par tour)
                  </span>
                  
                  <div className="relative">
                    <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-auto text-slate-400">
                      {/* Quadrillage Horizontal */}
                      {gridYValues.map((val, idx) => {
                        const y = getY(val);
                        return (
                          <g key={idx} className="opacity-30">
                            <line
                              x1={padLeft}
                              y1={y}
                              x2={svgW - padRight}
                              y2={y}
                              stroke="#475569"
                              strokeWidth="0.5"
                              strokeDasharray="4 4"
                            />
                            <text
                              x={padLeft - 8}
                              y={y + 3}
                              textAnchor="end"
                              className="fill-slate-400 text-[8px] font-mono"
                            >
                              {(val / 1000000).toFixed(1)}M F
                            </text>
                          </g>
                        );
                      })}

                      {/* Ligne verticale de fin */}
                      <line
                        x1={padLeft}
                        y1={padTop}
                        x2={padLeft}
                        y2={svgH - padBottom}
                        stroke="#475569"
                        strokeWidth="1"
                        className="opacity-50"
                      />
                      <line
                        x1={padLeft}
                        y1={svgH - padBottom}
                        x2={svgW - padRight}
                        y2={svgH - padBottom}
                        stroke="#475569"
                        strokeWidth="1"
                        className="opacity-50"
                      />

                      {/* Label axe X */}
                      <text
                        x={padLeft + (svgW - padLeft - padRight) / 2}
                        y={svgH - 4}
                        textAnchor="middle"
                        className="fill-slate-500 text-[8px] font-bold uppercase tracking-wider"
                      >
                        Progression des Tours (Passez sur les points pour les détails)
                      </text>

                      {/* Courbes des Joueurs */}
                      {gameState.players.map((p) => {
                        if (!p.cashHistory || p.cashHistory.length === 0) return null;
                        const points = p.cashHistory.map((val, idx) => `${getX(idx)},${getY(val)}`).join(' ');

                        return (
                          <g key={p.id}>
                            <polyline
                              points={points}
                              fill="none"
                              stroke={p.color}
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="opacity-80 hover:opacity-100 transition-opacity"
                            />
                            {/* Points interactifs */}
                            {p.cashHistory.map((val, idx) => (
                              <circle
                                key={idx}
                                cx={getX(idx)}
                                cy={getY(val)}
                                r="3.5"
                                fill={p.color}
                                stroke="#020617"
                                strokeWidth="1"
                                className="cursor-pointer hover:scale-125 transition-transform origin-center"
                              >
                                <title>
                                  {p.username} : {val.toLocaleString()} F (Tour {idx + 1})
                                </title>
                              </circle>
                            ))}
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                </div>
              );
            })()}

            <button
              onClick={() => {
                if (socket) socket.emit('resetGame');
              }}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold py-3 rounded-lg shadow-lg hover:shadow-xl transition"
            >
              Relancer une nouvelle partie 🔄
            </button>
          </div>
        </div>
      )}

        </>
      )}
    </div>
  );
}


