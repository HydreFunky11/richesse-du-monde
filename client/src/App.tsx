import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type { GameState } from './types/game';
import { RESOURCE_DEFINITIONS } from './data/board';
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

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !roomCode.trim() || !socket) return;
    socket.emit('joinGame', { username, roomCode });
  };

  const handleStartGame = () => {
    if (socket) socket.emit('startGame');
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

  // Calcul du placement dans la double-boucle (grille 11x11)
  const getCellGridCoords = (index: number) => {
    // Boucle 1 (extérieure) : index 0 à 39
    if (index >= 0 && index <= 39) {
      if (index <= 10) return { gridRow: 1, gridColumn: index + 1 };
      if (index <= 19) return { gridRow: index - 9, gridColumn: 11 };
      if (index <= 30) return { gridRow: 11, gridColumn: 11 - (index - 20) };
      return { gridRow: 11 - (index - 30), gridColumn: 1 };
    }
    
    // Boucle 2 (intérieure) : index 40 à 71
    if (index >= 40 && index <= 71) {
      const inner = index - 40;
      if (inner <= 8) return { gridRow: 2, gridColumn: inner + 2 };
      if (inner <= 15) return { gridRow: (inner - 9) + 3, gridColumn: 10 };
      if (inner <= 24) return { gridRow: 10, gridColumn: 10 - (inner - 16) };
      return { gridRow: 9 - (inner - 25), gridColumn: 2 };
    }
    
    // Boucle 3 (spirale la plus interne) : index 72 à 77
    const innermost = index - 72;
    return { gridRow: 3, gridColumn: innermost + 3 };
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col p-4">
      {/* Header */}
      <header className="flex justify-between items-center bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-md mb-4">
        <div>
          <h1 className="text-xl font-bold tracking-wider text-amber-500">RICHESSES DU MONDE</h1>
          <p className="text-xs text-slate-400">Code du salon : <span className="font-mono text-white font-bold">{gameState.gameId}</span></p>
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
        /* Playing / Finished Game State */
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4">
          
          {/* Plateau 2D à Gauche (Prend 3 colonnes sur LG) */}
          <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex items-center justify-center overflow-auto">
            
            {/* Grille du plateau 11x11 */}
            <div className="grid grid-cols-11 grid-rows-11 gap-0.5 w-[760px] h-[760px] relative text-slate-100 font-sans">
              
              {/* Rendu des 78 cases du plateau spiralé */}
              {gameState.board.map((cell) => {
                const coords = getCellGridCoords(cell.index);
                const royaltyRes = cell.royaltyResourceType ? RESOURCE_DEFINITIONS[cell.royaltyResourceType] : null;

                
                return (
                  <div
                    key={cell.index}
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
                    }`}
                    title={`${cell.name} - Case #${cell.index}`}
                  >
                    {/* Nom de la case */}
                    <div className="font-bold text-slate-300 leading-tight truncate">
                      {cell.name}
                    </div>

                    {/* Plaquette Royaltie ou Détails */}
                    {royaltyRes ? (
                      <div className="text-[7.5px] bg-slate-950/80 rounded px-0.5 py-0.5 border border-slate-800 font-semibold text-slate-100 flex items-center justify-center truncate">
                        {royaltyRes.name}
                      </div>
                    ) : (
                      <div className="text-[7.5px] text-slate-500 truncate">
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
                      {/* Dés de lancer */}
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
                        <div className="text-slate-400 text-xs italic">Dés non lancés.</div>
                      )}

                      {/* Actions disponibles pour le joueur actif */}
                      {isMyTurn && (
                        <div className="w-full space-y-2">
                          {gameState.lastDiceRoll === null && (
                            <button
                              onClick={handleRollDice}
                              className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold py-2 rounded-lg shadow transition transform hover:-translate-y-0.5 text-xs"
                            >
                              Lancer les dés 🎲
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

                            return (
                              <div className="space-y-2">
                                {/* Achat de titres */}
                                {availableTitles.length > 0 && (
                                  <div className="bg-slate-900 p-2 rounded border border-slate-800 space-y-1">
                                    <div className="text-[10px] font-semibold text-slate-400">Acheter titres de {cell.name} :</div>
                                    <div className="grid grid-cols-1 gap-1">
                                      {availableTitles.map((t) => (
                                        <button
                                          key={t.id}
                                          onClick={() => handleBuyTitle(t.id)}
                                          disabled={(me?.cash ?? 0) < t.purchasePrice}
                                          className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 text-white font-bold py-1 px-2 rounded text-[10px] flex justify-between"
                                        >
                                          <span>{RESOURCE_DEFINITIONS[t.resourceType].name}</span>
                                          <span>{t.purchasePrice.toLocaleString()} F</span>
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Achat Choix */}
                                {isChoix && (me?.lapsCompleted ?? 0) >= 1 && (
                                  <div className="bg-slate-900 p-2 rounded border border-slate-800 space-y-1">
                                    <div className="text-[10px] font-semibold text-teal-400">Choix : Acheter titre existant</div>
                                    {availableChoixTitles.length > 0 ? (
                                      <div className="max-h-20 overflow-y-auto space-y-0.5">
                                        {availableChoixTitles.map((t) => (
                                          <button
                                            key={t.id}
                                            onClick={() => handleBuyTitle(t.id)}
                                            disabled={(me?.cash ?? 0) < t.purchasePrice}
                                            className="w-full bg-teal-800 hover:bg-teal-700 disabled:bg-slate-700 text-white py-0.5 px-2 rounded text-[9px] flex justify-between"
                                          >
                                            <span>{t.country} ({RESOURCE_DEFINITIONS[t.resourceType].name})</span>
                                            <span>{t.purchasePrice.toLocaleString()} F</span>
                                          </button>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="text-[9px] text-slate-500 italic">Aucun titre éligible.</div>
                                    )}
                                  </div>
                                )}

                                {/* Joker */}
                                {cell.type === 'JOKER' && !me?.hasJokerCard && (
                                  <button
                                    onClick={handleBuyJokerCard}
                                    disabled={(me?.cash ?? 0) < 3000000}
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1.5 rounded-lg text-xs"
                                  >
                                    Acheter Joker (3 000 000 F) 🃏
                                  </button>
                                )}

                                {/* Utiliser Joker */}
                                {cell.type === 'ENCHERES' && me?.hasJokerCard && (
                                  <button
                                    onClick={handleUseJokerCard}
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1.5 rounded-lg text-xs"
                                  >
                                    Utiliser Joker (Annuler) 🃏
                                  </button>
                                )}

                                {/* Enchères */}
                                {cell.type === 'ENCHERES' && (me?.lapsCompleted ?? 0) >= 1 && (
                                  <div className="bg-slate-900 p-2 rounded border border-slate-800 space-y-1">
                                    <div className="text-[10px] font-semibold text-red-400">
                                      Démarrez l'enchère (Dé rouge = {gameState.lastDiceRoll[1]}) :
                                    </div>
                                    <div className="max-h-20 overflow-y-auto space-y-0.5 bg-slate-950 p-1 rounded border border-slate-800">
                                      {Object.values(gameState.titles)
                                        .filter((t) => t.ownerId === me?.id)
                                        .map((t) => (
                                          <label key={t.id} className="flex items-center gap-2 text-[10px] text-slate-200 cursor-pointer">
                                            <input
                                              type="checkbox"
                                              checked={selectedTitlesForAuction.includes(t.id)}
                                              onChange={() => toggleSelectTitleForAuction(t.id)}
                                              className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 w-3 h-3"
                                            />
                                            <span>{t.country} ({RESOURCE_DEFINITIONS[t.resourceType].name})</span>
                                          </label>
                                        ))}
                                    </div>
                                    <button
                                      onClick={handleStartAuction}
                                      disabled={
                                        selectedTitlesForAuction.length === 0 &&
                                        Object.values(gameState.titles).filter((t) => t.ownerId === me?.id).length > 0
                                      }
                                      className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-1 rounded text-xs transition"
                                    >
                                      Lancer l'Enchère 🔨
                                    </button>
                                  </div>
                                )}

                                <button
                                  onClick={handlePassTurn}
                                  className="w-full bg-slate-800 hover:bg-slate-750 text-white font-bold py-1.5 rounded-lg border border-slate-700 text-xs transition"
                                >
                                  Passer son tour ➡️
                                </button>
                              </div>
                            );
                          })()}
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
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow max-h-96 overflow-y-auto">
              <h3 className="font-bold text-sm text-slate-400 mb-3 uppercase tracking-wider">Vos Monopoles</h3>
              <div className="space-y-2">
                {Object.values(RESOURCE_DEFINITIONS).map((res) => {
                  const myTitles = Object.values(gameState.titles).filter(
                    (t) => t.resourceType === res.type && t.ownerId === me?.id
                  );
                  
                  if (myTitles.length === 0) return null;

                  return (
                    <div key={res.type} className="bg-slate-800/60 p-2 rounded-lg border border-slate-700/60">
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="font-bold" style={{ color: res.color }}>
                          {res.name}
                        </span>
                        <span className="text-slate-400 font-semibold text-[9px]">
                          {myTitles.length} / 6
                        </span>
                      </div>
                      <div className="text-[9px] text-slate-500 flex flex-wrap gap-1">
                        {myTitles.map(t => (
                          <span key={t.id} className="bg-slate-700/50 px-1 py-0.5 rounded border border-slate-650">
                            {t.country}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {Object.values(gameState.titles).filter((t) => t.ownerId === me?.id).length === 0 && (
                  <div className="text-slate-500 text-xs italic text-center py-4">
                    Aucun titre d'exploitation détenu.
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>
      )}
    </div>
  );
}
