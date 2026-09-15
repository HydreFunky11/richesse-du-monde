import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import type {
  HellGambleState,
  HellPlayer,
  CaseDefinition
} from './types';
import { RARITY_CONFIG } from './types';
import { CASES_DATABASE, formatCurrency } from './skinsData';
import { CaseOpeningModal } from './CaseOpeningModal';
import { CaseBattlesView } from './CaseBattlesView';
import { UpgraderView } from './UpgraderView';
import { TradeUpView } from './TradeUpView';
import { InventoryView } from './InventoryView';
import { LeaderboardView } from './LeaderboardView';
import { soundFx } from '../utils/audio';

const SERVER_URL = import.meta.env.VITE_WS_SERVER_URL || import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

type ActiveTab = 'CASES' | 'BATTLES' | 'UPGRADER' | 'TRADEUP' | 'INVENTORY' | 'LEADERBOARD';

export const HellGambleApp: React.FC = () => {
  const navigate = useNavigate();

  // État de connexion & salon
  const [username, setUsername] = useState(() => localStorage.getItem('hellgamble_username') || `Player_${Math.floor(Math.random() * 900 + 100)}`);
  const [roomCode, setRoomCode] = useState(() => localStorage.getItem('hellgamble_room') || 'CASINO1');
  const [joined, setJoined] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('CASES');

  // État du jeu synchronisé
  const [gameState, setGameState] = useState<HellGambleState | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // Caisse sélectionnée pour ouverture
  const [selectedCaseForOpening, setSelectedCaseForOpening] = useState<CaseDefinition | null>(null);

  // Battle multijoueur en cours d'exécution
  const [activeBattleLiveResult, setActiveBattleLiveResult] = useState<{
    battleId: string;
    battleResults: any;
  } | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Socket Connection
  useEffect(() => {
    const socket = io(SERVER_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[HELLGAMBLE] Connecté au serveur Socket.IO:', socket.id);
    });

    socket.on('hellgambleStateUpdate', (state: HellGambleState) => {
      setGameState(state);
    });

    socket.on('hellgamble:battleStarted', ({ battleId, battleResults }: { battleId: string; battleResults: any }) => {
      setActiveBattleLiveResult({ battleId, battleResults });
    });

    socket.on('error', (err: string) => {
      setErrorMessage(err);
      setTimeout(() => setErrorMessage(null), 5000);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleJoin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!username.trim() || !roomCode.trim() || !socketRef.current) return;

    const trimmedUser = username.trim();
    const formattedRoom = roomCode.toUpperCase().trim();

    localStorage.setItem('hellgamble_username', trimmedUser);
    localStorage.setItem('hellgamble_room', formattedRoom);

    soundFx.click();

    socketRef.current.emit('joinGame', {
      username: trimmedUser,
      roomCode: formattedRoom,
      gameType: 'hellgamble'
    });

    setJoined(true);
  };

  const myPlayer: HellPlayer | undefined = gameState?.players.find(p => p.id === socketRef.current?.id);

  // Actions API vers le serveur via Socket.IO
  const handleOpenCase = (caseId: string): Promise<any> => {
    return new Promise((resolve) => {
      if (!socketRef.current) return resolve({ success: false, error: 'Non connecté' });

      socketRef.current.emit('hellgamble:openCase', { caseId });
      socketRef.current.once('hellgamble:openCaseResult', (res) => {
        resolve(res);
      });
    });
  };

  const handleSellItem = (itemId: string): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!socketRef.current) return resolve(false);

      socketRef.current.emit('hellgamble:sellItem', { itemId });
      socketRef.current.once('hellgamble:sellItemResult', (res) => {
        resolve(res.success);
      });
    });
  };

  const handleSellAll = (maxPrice?: number): Promise<{ count: number; totalGained: number }> => {
    return new Promise((resolve) => {
      if (!socketRef.current) return resolve({ count: 0, totalGained: 0 });

      socketRef.current.emit('hellgamble:sellAll', { maxPrice });
      socketRef.current.once('hellgamble:sellAllResult', (res) => {
        resolve(res);
      });
    });
  };

  const handleClaimBankrupt = () => {
    if (!socketRef.current) return;
    soundFx.coinsCash();
    socketRef.current.emit('hellgamble:claimBankrupt');
  };

  const handleCreateBattle = (caseIds: string[], maxPlayers: 2 | 3 | 4): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!socketRef.current) return resolve(false);

      socketRef.current.emit('hellgamble:createBattle', { caseIds, maxPlayers });
      socketRef.current.once('hellgamble:createBattleResult', (res) => {
        if (!res.success) {
          setErrorMessage(res.error || 'Erreur création battle.');
        }
        resolve(res.success);
      });
    });
  };

  const handleJoinBattle = (battleId: string): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!socketRef.current) return resolve(false);

      soundFx.coinsCash();
      socketRef.current.emit('hellgamble:joinBattle', { battleId });
      socketRef.current.once('hellgamble:joinBattleResult', (res) => {
        if (!res.success) {
          setErrorMessage(res.error || 'Erreur pour rejoindre la battle.');
        }
        resolve(res.success);
      });
    });
  };

  const handleLeaveBattle = (battleId: string): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!socketRef.current) return resolve(false);

      socketRef.current.emit('hellgamble:leaveBattle', { battleId });
      socketRef.current.once('hellgamble:leaveBattleResult', (res) => {
        resolve(res.success);
      });
    });
  };

  const handleStartBattle = (battleId: string): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!socketRef.current) return resolve(false);

      soundFx.click();
      socketRef.current.emit('hellgamble:startBattle', { battleId });
      resolve(true);
    });
  };

  const handleUpgrade = (wagerItemIds: string[], cashWager: number, targetSkinId: string): Promise<any> => {
    return new Promise((resolve) => {
      if (!socketRef.current) return resolve({ success: false, error: 'Non connecté' });

      socketRef.current.emit('hellgamble:upgrade', { wagerItemIds, cashWager, targetSkinId });
      socketRef.current.once('hellgamble:upgradeResult', (res) => {
        resolve(res);
      });
    });
  };

  const handleTradeUp = (itemIds: string[]): Promise<any> => {
    return new Promise((resolve) => {
      if (!socketRef.current) return resolve({ success: false, error: 'Non connecté' });

      socketRef.current.emit('hellgamble:tradeUp', { itemIds });
      socketRef.current.once('hellgamble:tradeUpResult', (res) => {
        resolve(res);
      });
    });
  };

  // ─── ÉCRAN DE CONNEXION / LOBBY ─────────────────────────────────────────────
  if (!joined || !myPlayer) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
        {/* Background glow effects */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Bouton retour accueil */}
        <button
          onClick={() => navigate('/')}
          className="absolute top-6 left-6 px-4 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 text-sm font-bold border border-slate-700/50 transition-colors flex items-center gap-2 cursor-pointer"
        >
          ← Accueil
        </button>

        <div className="w-full max-w-md p-8 rounded-3xl bg-slate-900/90 border border-slate-700/60 shadow-2xl backdrop-blur-xl flex flex-col items-center text-center relative z-10 animate-fade-in">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-600 flex items-center justify-center text-4xl shadow-xl shadow-amber-950 mb-4 animate-bounce">
            🎰
          </div>

          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500">
            Hell Gamble
          </h1>
          <p className="text-xs uppercase tracking-widest font-black text-amber-400/80 mt-1">
            Case Opening & Battles • Faux Cash 100% Gratuit
          </p>

          <p className="text-sm text-slate-400 mt-3">
            Ouvrez des caisses de skins, affrontez vos amis en Case Battles où le vainqueur rafle tout, tentez l'Upgrader et devenez le plus riche du salon !
          </p>

          <form onSubmit={handleJoin} className="w-full flex flex-col gap-4 mt-6">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block text-left mb-1.5">
                Pseudo du Joueur
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Votre pseudo..."
                maxLength={18}
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 font-bold focus:border-amber-400 focus:outline-none transition-colors"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block text-left mb-1.5">
                Code du Salon (Rejoindre ou Créer)
              </label>
              <input
                type="text"
                value={roomCode}
                onChange={e => setRoomCode(e.target.value.toUpperCase())}
                placeholder="Ex: CASINO1"
                maxLength={12}
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 font-bold font-mono tracking-wider focus:border-amber-400 focus:outline-none uppercase transition-colors"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:brightness-110 text-slate-950 font-black text-base uppercase tracking-wider shadow-lg shadow-amber-950 transition-transform active:scale-95 cursor-pointer mt-2"
            >
              🚀 Rejoindre ou Créer le Casino
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ─── ÉCRAN PRINCIPAL DE JEU DU CASINO ───────────────────────────────────────
  const invValue = myPlayer.inventory.reduce((sum, item) => sum + item.value, 0);
  const isBankrupt = myPlayer.cash < 10 && invValue < 25;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* ─── LIVE TICKER EN HAUT (DROPS EN DIRECT DE LA ROOM) ─── */}
      <div className="w-full h-11 bg-slate-900 border-b border-slate-800 flex items-center overflow-x-auto overflow-y-hidden px-4 gap-3 select-none text-xs flex-shrink-0 z-30">
        <span className="font-black text-amber-400 flex items-center gap-1.5 whitespace-nowrap uppercase tracking-wider text-[11px] pr-2 border-r border-slate-800">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          En Direct :
        </span>

        {gameState?.liveFeed && gameState.liveFeed.length > 0 ? (
          gameState.liveFeed.map(feed => {
            const cfg = RARITY_CONFIG[feed.item.rarity];
            return (
              <div
                key={feed.id}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border flex-shrink-0 bg-slate-950/80 ${cfg.border}`}
              >
                <span className="font-bold text-slate-300">{feed.playerName}</span>
                <span className="text-slate-500">a tiré</span>
                <span className="text-base">{feed.item.skinId.includes('knife') ? '🗡️' : '🔫'}</span>
                <span className={`font-bold truncate max-w-[120px] ${cfg.textColor}`}>
                  {feed.item.name}
                </span>
                <span className="font-mono text-emerald-400 font-bold">
                  ({formatCurrency(feed.item.value)})
                </span>
              </div>
            );
          })
        ) : (
          <span className="text-slate-500 italic">Ouvrez des caisses pour voir apparaître les drops du salon ici !</span>
        )}
      </div>

      {/* ─── HEADER PRINCIPAL ─── */}
      <header className="w-full bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80 px-4 md:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-40">
        {/* Logo & Retour */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
          >
            ← Accueil
          </button>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎰</span>
            <span className="font-black text-lg text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-300">
              Hell Gamble
            </span>
          </div>
          <span className="px-2 py-0.5 rounded bg-slate-800 text-[11px] font-mono text-slate-400 font-bold">
            Salon : {gameState?.roomCode}
          </span>
        </div>

        {/* Portefeuille & Fortune */}
        <div className="flex items-center gap-3">
          {/* Bouton Bonus Faillite si le joueur est fauché */}
          {isBankrupt && (
            <button
              onClick={handleClaimBankrupt}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-red-600 to-amber-500 hover:brightness-110 text-white font-black text-xs uppercase tracking-wider animate-bounce shadow-lg shadow-red-950 cursor-pointer"
            >
              🆘 Bonus Faillite (+$100)
            </button>
          )}

          {/* Cash */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-emerald-500/30">
            <span className="text-xs text-slate-400 font-bold">Cash :</span>
            <span className="text-sm font-mono font-black text-emerald-400">
              {formatCurrency(myPlayer.cash)}
            </span>
          </div>

          {/* Valeur Inventaire */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-purple-500/30">
            <span className="text-xs text-slate-400 font-bold">Inventaire :</span>
            <span className="text-sm font-mono font-black text-purple-400">
              {formatCurrency(invValue)}
            </span>
          </div>

          {/* Fortune Totale */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40">
            <span className="text-xs text-amber-300 font-bold">Fortune :</span>
            <span className="text-sm font-mono font-black text-amber-300">
              {formatCurrency(myPlayer.netWorth)}
            </span>
          </div>
        </div>
      </header>

      {/* ─── NAVIGATION PAR ONGLETS ─── */}
      <div className="w-full bg-slate-950 border-b border-slate-800/80 px-4 md:px-8 py-2.5 flex items-center justify-center gap-2 overflow-x-auto flex-shrink-0">
        <div className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-2xl border border-slate-800">
          {(
            [
              { id: 'CASES', label: 'Caisses 📦' },
              { id: 'BATTLES', label: 'Case Battles ⚔️' },
              { id: 'UPGRADER', label: 'L\'Upgrader ⚡' },
              { id: 'TRADEUP', label: 'Contrats 📜' },
              { id: 'INVENTORY', label: `Inventaire (${myPlayer.inventory.length}) 🎒` },
              { id: 'LEADERBOARD', label: 'Classement 🏆' },
            ] as const
          ).map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                soundFx.click();
              }}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-950 scale-102'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Messages d'erreur globaux */}
      {errorMessage && (
        <div className="mx-4 md:mx-8 mt-4 p-3 rounded-xl bg-red-950 border border-red-500 text-red-300 text-sm font-bold text-center">
          ⚠️ {errorMessage}
        </div>
      )}

      {/* ─── CONTENU DE L'ONGLET SÉLECTIONNÉ ─── */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8">
        {/* 1. ONGLETS CAISSES */}
        {activeTab === 'CASES' && (
          <div className="flex flex-col gap-6 animate-fade-in">
            <div className="p-6 rounded-3xl bg-gradient-to-r from-amber-950/60 via-slate-950 to-orange-950/60 border border-amber-500/30 shadow-2xl flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-300 to-amber-500">
                  Ouverture de Caisses CS
                </h2>
                <p className="text-sm text-slate-300 mt-1">
                  Choisissez une caisse, observez le défilement de la roulette et encaissez vos skins rares !
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {CASES_DATABASE.map(cDef => {
                const canAfford = myPlayer.cash >= cDef.price;
                return (
                  <div
                    key={cDef.id}
                    onClick={() => {
                      setSelectedCaseForOpening(cDef);
                      soundFx.click();
                    }}
                    className={`group relative p-6 rounded-3xl border-2 transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden hover:scale-102 hover:shadow-2xl ${
                      canAfford
                        ? 'border-slate-700/80 bg-slate-900/60 hover:border-amber-400 hover:shadow-amber-950/50'
                        : 'border-slate-800 bg-slate-950/60 opacity-80'
                    }`}
                  >
                    {/* Badge de catégorie */}
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-full bg-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-300">
                        {cDef.tag}
                      </span>
                      <span className="text-lg font-black font-mono text-emerald-400">
                        {formatCurrency(cDef.price)}
                      </span>
                    </div>

                    {/* Icône & Halo coloré */}
                    <div className="relative my-6 flex flex-col items-center justify-center">
                      <span className="text-7xl group-hover:scale-110 transition-transform duration-300 drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)]">
                        {cDef.icon}
                      </span>
                      <div
                        className={`absolute w-32 h-32 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity bg-gradient-to-r ${cDef.color}`}
                      />
                    </div>

                    {/* Titre & Description */}
                    <div>
                      <h3 className="text-lg font-black text-slate-100 group-hover:text-amber-300 transition-colors">
                        {cDef.name}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                        {cDef.description}
                      </p>
                    </div>

                    {/* Bouton d'ouverture */}
                    <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-xs text-slate-400 font-semibold">
                        {cDef.skinPool.length} skins possibles
                      </span>
                      <span className="px-4 py-2 rounded-xl bg-amber-500 group-hover:bg-amber-400 text-slate-950 text-xs font-black uppercase tracking-wider transition-colors shadow-md">
                        Ouvrir ➜
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. ONGLETS CASE BATTLES */}
        {activeTab === 'BATTLES' && (
          <CaseBattlesView
            myPlayer={myPlayer}
            activeBattles={gameState?.activeBattles || []}
            recentBattles={gameState?.recentBattles || []}
            activeBattleLiveResult={activeBattleLiveResult}
            onClearActiveBattleLive={() => setActiveBattleLiveResult(null)}
            onCreateBattle={handleCreateBattle}
            onJoinBattle={handleJoinBattle}
            onLeaveBattle={handleLeaveBattle}
            onStartBattle={handleStartBattle}
          />
        )}

        {/* 3. ONGLETS UPGRADER */}
        {activeTab === 'UPGRADER' && (
          <UpgraderView
            myPlayer={myPlayer}
            onUpgrade={handleUpgrade}
          />
        )}

        {/* 4. ONGLETS TRADE-UP */}
        {activeTab === 'TRADEUP' && (
          <TradeUpView
            myPlayer={myPlayer}
            onTradeUp={handleTradeUp}
          />
        )}

        {/* 5. ONGLETS INVENTAIRE */}
        {activeTab === 'INVENTORY' && (
          <InventoryView
            myPlayer={myPlayer}
            onSellItem={handleSellItem}
            onSellAll={handleSellAll}
          />
        )}

        {/* 6. ONGLETS CLASSEMENT */}
        {activeTab === 'LEADERBOARD' && (
          <LeaderboardView
            players={gameState?.players || []}
            myPlayerId={socketRef.current?.id || ''}
          />
        )}
      </main>

      {/* Modal d'ouverture de caisse individuelle */}
      {selectedCaseForOpening && (
        <CaseOpeningModal
          caseDef={selectedCaseForOpening}
          playerCash={myPlayer.cash}
          isOpen={!!selectedCaseForOpening}
          onClose={() => setSelectedCaseForOpening(null)}
          onOpenCase={handleOpenCase}
          onSellItem={handleSellItem}
        />
      )}
    </div>
  );
};
