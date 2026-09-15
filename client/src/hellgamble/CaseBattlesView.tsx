import React, { useState, useEffect } from 'react';
import type { CaseBattle, HellPlayer } from './types';
import { CASES_DATABASE, formatCurrency } from './skinsData';
import { RouletteReel } from './RouletteReel';
import { soundFx } from '../utils/audio';

interface CaseBattlesViewProps {
  myPlayer: HellPlayer;
  activeBattles: CaseBattle[];
  recentBattles?: CaseBattle[];
  activeBattleLiveResult: {
    battleId: string;
    battleResults: {
      rounds: {
        caseDef: any;
        participantPulls: {
          playerId: string;
          item: any;
          reelItems: any[];
          winningIndex: number;
        }[];
      }[];
      winnerId: string;
      totalLootValue: number;
    };
  } | null;
  onClearActiveBattleLive: () => void;
  onCreateBattle: (caseIds: string[], maxPlayers: 2 | 3 | 4) => Promise<boolean>;
  onJoinBattle: (battleId: string) => Promise<boolean>;
  onLeaveBattle: (battleId: string) => Promise<boolean>;
  onStartBattle: (battleId: string) => Promise<boolean>;
}

export const CaseBattlesView: React.FC<CaseBattlesViewProps> = ({
  myPlayer,
  activeBattles,
  recentBattles: _recentBattles,
  activeBattleLiveResult,
  onClearActiveBattleLive,
  onCreateBattle,
  onJoinBattle,
  onLeaveBattle,
  onStartBattle,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedMaxPlayers, setSelectedMaxPlayers] = useState<2 | 3 | 4>(2);
  const [selectedCaseIds, setSelectedCaseIds] = useState<string[]>(['starter_case', 'chroma_case']);
  const [isCreating, setIsCreating] = useState(false);

  // Animation de la battle en direct
  const [liveRoundIndex, setLiveRoundIndex] = useState(0);
  const [isRoundSpinning, setIsRoundSpinning] = useState(false);
  const [accumulatedScores, setAccumulatedScores] = useState<{ [playerId: string]: number }>({});
  const [battleFinished, setBattleFinished] = useState(false);

  // Calcul du coût de création
  const totalBattleCost = selectedCaseIds.reduce((sum, cId) => {
    const c = CASES_DATABASE.find(item => item.id === cId);
    return sum + (c ? c.price : 0);
  }, 0);

  // Gestion du déroulement d'une battle en direct
  useEffect(() => {
    if (!activeBattleLiveResult) {
      setLiveRoundIndex(0);
      setIsRoundSpinning(false);
      setAccumulatedScores({});
      setBattleFinished(false);
      return;
    }

    const { battleResults } = activeBattleLiveResult;
    setLiveRoundIndex(0);
    setAccumulatedScores({});
    setBattleFinished(false);
    setIsRoundSpinning(true);

    let currentRound = 0;
    const totalRounds = battleResults.rounds.length;

    const playRound = (roundIdx: number) => {
      setLiveRoundIndex(roundIdx);
      setIsRoundSpinning(true);

      // Le spin dure 5.2s, on attend 6s pour passer à la manche suivante
      setTimeout(() => {
        setIsRoundSpinning(false);

        // Mettre à jour les scores cumulés
        const roundData = battleResults.rounds[roundIdx];
        setAccumulatedScores(prev => {
          const nextScores = { ...prev };
          for (const pull of roundData.participantPulls) {
            nextScores[pull.playerId] = parseFloat(((nextScores[pull.playerId] || 0) + pull.item.value).toFixed(2));
          }
          return nextScores;
        });

        if (roundIdx + 1 < totalRounds) {
          setTimeout(() => {
            currentRound++;
            playRound(currentRound);
          }, 1800);
        } else {
          // Fin de la battle !
          setTimeout(() => {
            setBattleFinished(true);
            soundFx.upgradeSuccess();
          }, 1200);
        }
      }, 5500);
    };

    playRound(0);
  }, [activeBattleLiveResult]);

  const handleAddCaseToQueue = (caseId: string) => {
    if (selectedCaseIds.length >= 6) return;
    setSelectedCaseIds([...selectedCaseIds, caseId]);
    soundFx.click();
  };

  const handleRemoveCaseFromQueue = (index: number) => {
    const next = [...selectedCaseIds];
    next.splice(index, 1);
    setSelectedCaseIds(next);
    soundFx.click();
  };

  const handleCreateSubmit = async () => {
    if (selectedCaseIds.length === 0 || isCreating || myPlayer.cash < totalBattleCost) return;
    setIsCreating(true);
    soundFx.coinsCash();
    const success = await onCreateBattle(selectedCaseIds, selectedMaxPlayers);
    setIsCreating(false);
    if (success) {
      setShowCreateModal(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-in">
      {/* ─── BANNIERE TITRE & EXPLICATIONS ─── */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-red-950/80 via-slate-950 to-amber-950/80 border border-red-500/30 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-amber-600 flex items-center justify-center text-3xl shadow-lg shadow-red-950">
            ⚔️
          </div>
          <div>
            <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-amber-300 to-yellow-400">
              Case Battles Multijoueur
            </h2>
            <p className="text-sm text-slate-300 max-w-xl">
              Défiez vos amis en face-à-face ! Ouvrez simultanément les mêmes caisses manche par manche. Le joueur avec le plus gros score de valeur <strong className="text-amber-400 font-bold">RAFLE TOUT LE BUTIN</strong> !
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-red-600 to-amber-500 hover:brightness-110 text-slate-950 font-black tracking-wider uppercase text-sm shadow-xl shadow-red-950 transition-transform active:scale-95 cursor-pointer flex items-center gap-2 flex-shrink-0"
        >
          <span>➕ Créer une Battle</span>
        </button>
      </div>

      {/* ─── MODAL D'ARENE LIVE LORS D'UNE BATTLE EN COURS ─── */}
      {activeBattleLiveResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-5xl rounded-3xl bg-slate-950 border-2 border-amber-500/60 shadow-2xl p-6 md:p-8 flex flex-col items-center max-h-[95vh] overflow-y-auto">
            {/* Header de la Battle Live */}
            <div className="w-full flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl animate-spin">⚔️</span>
                <div>
                  <h3 className="text-xl font-black text-amber-400">
                    BATTLE EN DIRECT ({liveRoundIndex + 1} / {activeBattleLiveResult.battleResults.rounds.length})
                  </h3>
                  <p className="text-xs text-slate-400">
                    Caisse actuelle : <strong className="text-slate-200">{activeBattleLiveResult.battleResults.rounds[liveRoundIndex]?.caseDef?.name}</strong>
                  </p>
                </div>
              </div>

              {battleFinished && (
                <button
                  onClick={onClearActiveBattleLive}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm cursor-pointer shadow-lg"
                >
                  Fermer l'arène ✕
                </button>
              )}
            </div>

            {/* Vainqueur annoncé */}
            {battleFinished && (
              <div className="w-full p-4 mb-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-500/30 to-amber-500/20 border-2 border-amber-400 text-center animate-bounce">
                <p className="text-xs uppercase font-black tracking-widest text-amber-300">
                  🏆 VICTOIRE ÉCLATANTE - WINNER TAKES ALL !
                </p>
                <h2 className="text-2xl md:text-3xl font-black text-amber-300 mt-1">
                  Le gagnant empoche tout le pactole ({formatCurrency(activeBattleLiveResult.battleResults.totalLootValue)}) !
                </h2>
              </div>
            )}

            {/* Colonnes des participants avec roulettes simultanées */}
            <div className={`w-full grid gap-4 ${
              activeBattleLiveResult.battleResults.rounds[0].participantPulls.length === 2
                ? 'grid-cols-1 md:grid-cols-2'
                : activeBattleLiveResult.battleResults.rounds[0].participantPulls.length === 3
                ? 'grid-cols-1 md:grid-cols-3'
                : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-4'
            }`}>
              {activeBattleLiveResult.battleResults.rounds[liveRoundIndex]?.participantPulls.map(pull => {
                const isWinner = battleFinished && activeBattleLiveResult.battleResults.winnerId === pull.playerId;
                const score = accumulatedScores[pull.playerId] || 0;

                return (
                  <div
                    key={pull.playerId}
                    className={`flex flex-col p-4 rounded-2xl border-2 transition-all ${
                      isWinner
                        ? 'border-amber-400 bg-amber-950/30 shadow-[0_0_25px_rgba(251,191,36,0.5)] ring-2 ring-amber-400'
                        : 'border-slate-800 bg-slate-900/60'
                    }`}
                  >
                    {/* Header Joueur */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">👤</span>
                        <span className="font-black text-sm text-slate-200 truncate max-w-[120px]">
                          {pull.playerId === myPlayer.id ? 'Vous' : 'Adversaire'}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block uppercase font-bold">Valeur</span>
                        <span className="text-sm font-black font-mono text-emerald-400">
                          {formatCurrency(score)}
                        </span>
                      </div>
                    </div>

                    {/* Roulette de la manche */}
                    <div className="w-full my-2">
                      <RouletteReel
                        items={pull.reelItems}
                        winningIndex={pull.winningIndex}
                        isSpinning={isRoundSpinning}
                        compact={true}
                      />
                    </div>

                    {/* Item tiré à cette manche */}
                    {!isRoundSpinning && pull.item && (
                      <div className="mt-3 p-2 rounded-xl bg-slate-950 border border-slate-700 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{pull.item.skinId.includes('knife') ? '🗡️' : '🔫'}</span>
                          <div className="truncate">
                            <p className="text-[11px] font-bold text-slate-300 truncate">
                              {pull.item.weapon} | {pull.item.name}
                            </p>
                            <span className="text-[10px] font-mono text-slate-400">
                              {pull.item.wear}
                            </span>
                          </div>
                        </div>
                        <span className="text-xs font-black font-mono text-emerald-400">
                          +{formatCurrency(pull.item.value)}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─── LISTE DES BATTLES ACTIVES DANS LE SALON ─── */}
      <div className="flex flex-col gap-4">
        <h3 className="text-lg font-black text-slate-200 flex items-center gap-2">
          <span>🔥 Battles en cours dans ce salon</span>
          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-xs text-slate-400">
            {activeBattles.length}
          </span>
        </h3>

        {activeBattles.length === 0 ? (
          <div className="p-8 rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 text-center text-slate-500">
            <span className="text-4xl block mb-2">📦</span>
            <p className="text-sm font-semibold">Aucune battle active pour le moment.</p>
            <p className="text-xs mt-1">Cliquez sur « Créer une Battle » ci-dessus pour lancer un défi à vos amis !</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeBattles.map(battle => {
              const isHost = battle.hostId === myPlayer.id;
              const isJoined = battle.participants.some(p => p.playerId === myPlayer.id);
              const canAfford = myPlayer.cash >= battle.costPerPlayer;
              const isFull = battle.participants.length >= battle.maxPlayers;

              return (
                <div
                  key={battle.id}
                  className="p-5 rounded-2xl border border-slate-800 bg-slate-900/70 hover:border-slate-700 transition-all flex flex-col justify-between gap-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-base text-slate-100">{battle.name}</span>
                        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[10px] font-black uppercase">
                          {battle.maxPlayers === 2 ? '1v1' : battle.maxPlayers === 3 ? '1v1v1' : '4 FFA'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Hôte : <strong className="text-slate-300">{battle.hostName}</strong>
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-slate-400 block">Prix d'entrée</span>
                      <span className="text-lg font-black font-mono text-emerald-400">
                        {formatCurrency(battle.costPerPlayer)}
                      </span>
                    </div>
                  </div>

                  {/* Caisses à ouvrir */}
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                      {battle.caseIds.length} Caisse(s) au programme :
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {battle.caseIds.map((cId, idx) => {
                        const cDef = CASES_DATABASE.find(c => c.id === cId);
                        return (
                          <span
                            key={`${cId}_${idx}`}
                            className="px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs font-semibold text-slate-300 flex items-center gap-1"
                          >
                            <span>{cDef?.icon || '📦'}</span>
                            <span>{cDef?.name.split(' ')[0]}</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Joueurs inscrits */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-400 font-bold">
                        Participants ({battle.participants.length}/{battle.maxPlayers})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {battle.participants.map(p => (
                        <span
                          key={p.playerId}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1"
                        >
                          <span>👤</span>
                          <span>{p.username}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                    {isHost && battle.participants.length >= 2 && (
                      <button
                        onClick={() => onStartBattle(battle.id)}
                        className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:brightness-110 text-slate-950 font-black text-sm uppercase tracking-wider shadow-lg shadow-emerald-950 transition-transform active:scale-95 cursor-pointer"
                      >
                        🚀 Démarrer la Battle ({battle.participants.length}/{battle.maxPlayers})
                      </button>
                    )}

                    {!isJoined && !isFull && (
                      <button
                        onClick={() => onJoinBattle(battle.id)}
                        disabled={!canAfford}
                        className={`flex-1 py-2.5 rounded-xl font-black text-sm uppercase tracking-wider shadow-lg transition-transform active:scale-95 cursor-pointer ${
                          canAfford
                            ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        Rejoindre ({formatCurrency(battle.costPerPlayer)})
                      </button>
                    )}

                    {isJoined && battle.status === 'WAITING' && (
                      <button
                        onClick={() => onLeaveBattle(battle.id)}
                        className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-red-950 hover:text-red-300 text-slate-400 font-bold text-xs transition-colors cursor-pointer"
                      >
                        Quitter
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── MODAL CREATION DE BATTLE ─── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-2xl rounded-3xl bg-slate-950 border border-slate-700 shadow-2xl p-6 md:p-8 flex flex-col gap-5">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-5 right-5 w-9 h-9 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center font-bold hover:bg-slate-700 cursor-pointer"
            >
              ✕
            </button>

            <h3 className="text-xl font-black text-slate-100 flex items-center gap-2">
              <span>⚔️ Créer une Case Battle</span>
            </h3>

            {/* Sélection du format */}
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Nombre de participants
              </label>
              <div className="grid grid-cols-3 gap-2">
                {([2, 3, 4] as const).map(num => (
                  <button
                    key={num}
                    onClick={() => {
                      setSelectedMaxPlayers(num);
                      soundFx.click();
                    }}
                    className={`py-2.5 rounded-xl font-black text-sm border-2 transition-all cursor-pointer ${
                      selectedMaxPlayers === num
                        ? 'border-amber-400 bg-amber-500/20 text-amber-300'
                        : 'border-slate-800 bg-slate-900/80 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {num === 2 ? '1v1 (2 Joueurs)' : num === 3 ? '1v1v1 (3 Joueurs)' : '4 Joueurs (FFA)'}
                  </button>
                ))}
              </div>
            </div>

            {/* Caisses dans la file */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Caisses à ouvrir ({selectedCaseIds.length} / 6 max)
                </label>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  Total : {formatCurrency(totalBattleCost)}
                </span>
              </div>

              <div className="min-h-[50px] p-2.5 rounded-xl border border-slate-800 bg-slate-900/50 flex flex-wrap gap-2 items-center">
                {selectedCaseIds.length === 0 ? (
                  <p className="text-xs text-slate-500">Ajoutez des caisses depuis la liste ci-dessous.</p>
                ) : (
                  selectedCaseIds.map((cId, idx) => {
                    const cDef = CASES_DATABASE.find(c => c.id === cId);
                    return (
                      <span
                        key={`${cId}_${idx}`}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5"
                      >
                        <span>{cDef?.icon}</span>
                        <span>{cDef?.name.split(' ')[0]}</span>
                        <button
                          onClick={() => handleRemoveCaseFromQueue(idx)}
                          className="text-slate-400 hover:text-red-400 ml-1 font-black"
                        >
                          ×
                        </button>
                      </span>
                    );
                  })
                )}
              </div>
            </div>

            {/* Catalogue de sélection de caisses */}
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Ajouter une caisse au combat :
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {CASES_DATABASE.map(cDef => (
                  <button
                    key={cDef.id}
                    onClick={() => handleAddCaseToQueue(cDef.id)}
                    className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/60 hover:border-amber-500/50 flex items-center justify-between text-left transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-xl">{cDef.icon}</span>
                      <div className="truncate">
                        <p className="text-xs font-bold text-slate-200 truncate">{cDef.name.split(' ')[0]}</p>
                        <p className="text-[10px] font-mono text-emerald-400">{formatCurrency(cDef.price)}</p>
                      </div>
                    </div>
                    <span className="text-xs text-slate-400 font-bold">+</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Bouton de confirmation */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 block">Votre mise :</span>
                <span className="text-lg font-black font-mono text-emerald-400">
                  {formatCurrency(totalBattleCost)}
                </span>
              </div>

              <button
                onClick={handleCreateSubmit}
                disabled={selectedCaseIds.length === 0 || isCreating || myPlayer.cash < totalBattleCost}
                className={`px-6 py-3 rounded-xl font-black text-sm uppercase tracking-wider shadow-lg transition-transform active:scale-95 cursor-pointer ${
                  myPlayer.cash >= totalBattleCost && selectedCaseIds.length > 0
                    ? 'bg-gradient-to-r from-red-600 to-amber-500 text-slate-950 hover:brightness-110 shadow-red-950'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                Créer la Battle ⚔️
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
