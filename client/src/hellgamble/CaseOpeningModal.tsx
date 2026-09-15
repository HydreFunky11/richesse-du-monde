import React, { useState } from 'react';
import type { CaseDefinition, HellItem } from './types';
import { RARITY_CONFIG } from './types';
import type { ReelCard } from './RouletteReel';
import { RouletteReel } from './RouletteReel';
import { getSkinDefinition, formatCurrency } from './skinsData';
import { soundFx } from '../utils/audio';

interface CaseOpeningModalProps {
  caseDef: CaseDefinition;
  playerCash: number;
  isOpen: boolean;
  onClose: () => void;
  onOpenCase: (caseId: string, count: number) => Promise<{
    success: boolean;
    error?: string;
    item?: HellItem;
    items?: HellItem[];
    reelItems?: ReelCard[];
    winningIndex?: number;
    drops?: {
      item: HellItem;
      reelItems: ReelCard[];
      winningIndex: number;
    }[];
  }>;
  onSellItem: (itemId: string) => Promise<boolean>;
}

export const CaseOpeningModal: React.FC<CaseOpeningModalProps> = ({
  caseDef,
  playerCash,
  isOpen,
  onClose,
  onOpenCase,
  onSellItem,
}) => {
  const [selectedCount, setSelectedCount] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [isOpening, setIsOpening] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [activeDrops, setActiveDrops] = useState<{
    item: HellItem;
    reelItems: ReelCard[];
    winningIndex: number;
  }[]>([]);
  const [wonItems, setWonItems] = useState<HellItem[]>([]);
  const [soldItemIds, setSoldItemIds] = useState<string[]>([]);
  const [hasSoldAll, setHasSoldAll] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const totalCost = parseFloat((caseDef.price * selectedCount).toFixed(2));
  const canAfford = playerCash >= totalCost;

  const handleStartOpen = async () => {
    if (isSpinning || isOpening || !canAfford) return;

    setErrorMessage(null);
    setWonItems([]);
    setSoldItemIds([]);
    setHasSoldAll(false);
    setIsOpening(true);

    soundFx.coinsCash();

    const result = await onOpenCase(caseDef.id, selectedCount);
    if (!result.success) {
      setErrorMessage(result.error || 'Erreur lors du tirage.');
      setIsOpening(false);
      return;
    }

    const resolvedDrops = result.drops && result.drops.length > 0
      ? result.drops
      : result.item && result.reelItems
      ? [{ item: result.item, reelItems: result.reelItems, winningIndex: result.winningIndex ?? 38 }]
      : [];

    if (resolvedDrops.length === 0) {
      setErrorMessage('Aucun tirage reçu.');
      setIsOpening(false);
      return;
    }

    setActiveDrops(resolvedDrops);
    setWonItems(resolvedDrops.map(d => d.item));
    setIsSpinning(true);
  };

  const handleSpinComplete = () => {
    setIsSpinning(false);
    setIsOpening(false);
  };

  const handleSellOneItem = async (item: HellItem) => {
    if (soldItemIds.includes(item.id)) return;
    soundFx.coinsCash();
    const success = await onSellItem(item.id);
    if (success) {
      setSoldItemIds(prev => [...prev, item.id]);
    }
  };

  const handleSellAllWonItems = async () => {
    if (wonItems.length === 0 || hasSoldAll) return;
    soundFx.coinsCash();
    for (const item of wonItems) {
      if (!soldItemIds.includes(item.id)) {
        await onSellItem(item.id);
      }
    }
    setSoldItemIds(wonItems.map(i => i.id));
    setHasSoldAll(true);
  };

  // Calcul du profit/perte pour les ouvertures
  const totalWonValue = wonItems.reduce((sum, i) => sum + i.value, 0);
  const profit = parseFloat((totalWonValue - totalCost).toFixed(2));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/90 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-5xl rounded-3xl bg-slate-950 border border-slate-700/80 shadow-2xl p-5 md:p-8 flex flex-col items-center max-h-[96vh] overflow-y-auto">
        {/* Fermer */}
        {!isSpinning && (
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-10 h-10 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-lg font-bold transition-colors cursor-pointer"
          >
            ✕
          </button>
        )}

        {/* Header Caisse */}
        <div className="text-center mb-3">
          <div className="flex items-center justify-center gap-3">
            <span className="text-4xl">{caseDef.icon}</span>
            <h2 className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500">
              {caseDef.name}
            </h2>
            <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 text-xs font-black tracking-wider">
              {caseDef.tag}
            </span>
          </div>
          <p className="text-xs md:text-sm text-slate-400 mt-1 max-w-md mx-auto">
            {caseDef.description}
          </p>
        </div>

        {/* ─── SÉLECTEUR DE QUANTITÉ MULTI-CAISSES (1x, 2x, 3x, 4x, 5x) ─── */}
        {!isSpinning && wonItems.length === 0 && (
          <div className="flex flex-col items-center gap-2 mb-4">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              Quantité de caisses à ouvrir en même temps :
            </span>
            <div className="flex items-center gap-2 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800">
              {([1, 2, 3, 4, 5] as const).map(count => {
                const countCost = caseDef.price * count;
                const canAffordCount = playerCash >= countCost;
                const isSelected = selectedCount === count;

                return (
                  <button
                    key={count}
                    onClick={() => {
                      setSelectedCount(count);
                      soundFx.click();
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex flex-col items-center cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 shadow-md shadow-amber-950 scale-105 ring-2 ring-yellow-300'
                        : canAffordCount
                        ? 'text-slate-300 hover:bg-slate-800'
                        : 'text-slate-600 hover:bg-slate-900 opacity-60'
                    }`}
                  >
                    <span className="text-sm font-black">{count}x</span>
                    <span className="text-[10px] font-mono font-bold mt-0.5">
                      {formatCurrency(countCost)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── ZONE DE ROULETTES SIMULTANÉES ─── */}
        <div className="w-full my-3">
          {isSpinning || activeDrops.length > 0 ? (
            <div className="flex flex-col gap-3">
              {activeDrops.map((drop, idx) => (
                <div key={idx} className="relative flex flex-col gap-1">
                  {activeDrops.length > 1 && (
                    <div className="flex items-center justify-between text-xs font-bold px-1 text-slate-400">
                      <span>Caisse #{idx + 1}</span>
                      {!isSpinning && (
                        <span className="text-emerald-400 font-mono">
                          +{formatCurrency(drop.item.value)}
                        </span>
                      )}
                    </div>
                  )}
                  <RouletteReel
                    items={drop.reelItems}
                    winningIndex={drop.winningIndex}
                    isSpinning={isSpinning}
                    compact={activeDrops.length > 1}
                    onSpinEnd={idx === 0 ? handleSpinComplete : undefined}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="w-full h-52 rounded-2xl border-2 border-dashed border-slate-800 bg-slate-900/40 flex flex-col items-center justify-center text-slate-500">
              <span className="text-6xl animate-pulse">{caseDef.icon}</span>
              <p className="mt-3 text-sm font-semibold">
                Choisissez le nombre de caisses (1x à 5x) et lancez l'ouverture simultanée !
              </p>
            </div>
          )}
        </div>

        {/* ─── RÉVÉLATION DU BUTIN (MONO OU MULTI-DROPS) ─── */}
        {wonItems.length > 0 && !isSpinning && (
          <div className="w-full my-4 flex flex-col items-center gap-4 animate-scale-in">
            {/* BILAN GLOBAL PROFIT / PERTE */}
            <div className="w-full p-4 rounded-2xl bg-slate-900 border border-slate-700 flex flex-wrap items-center justify-between gap-4 shadow-xl">
              <div>
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">
                  Bilan du tirage ({wonItems.length} caisse{wonItems.length > 1 ? 's' : ''})
                </span>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-sm text-slate-300">
                    Coût : <strong className="font-mono text-slate-100">{formatCurrency(totalCost)}</strong>
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className="text-sm text-slate-300">
                    Butin : <strong className="font-mono text-emerald-400 font-bold">{formatCurrency(totalWonValue)}</strong>
                  </span>
                </div>
              </div>

              {/* Badge Profit / Perte */}
              <div className="flex items-center gap-3">
                <div className={`px-4 py-2 rounded-xl border text-sm font-black font-mono ${
                  profit >= 0
                    ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-400 shadow-md shadow-emerald-950'
                    : 'bg-red-950/80 border-red-500/60 text-red-400 shadow-md shadow-red-950'
                }`}>
                  {profit >= 0 ? `+${formatCurrency(profit)} (PROFIT 🔥)` : `${formatCurrency(profit)} (PERTE)`}
                </div>

                {!hasSoldAll ? (
                  <button
                    onClick={handleSellAllWonItems}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-950 cursor-pointer transition-transform active:scale-95"
                  >
                    💵 Tout Vendre (+{formatCurrency(totalWonValue)})
                  </button>
                ) : (
                  <div className="px-4 py-2 rounded-xl bg-emerald-950 border border-emerald-500/50 text-emerald-300 font-bold text-xs">
                    ✅ Tous les skins ont été vendus !
                  </div>
                )}
              </div>
            </div>

            {/* GRILLE DE TOUS LES SKINS OBTENUS */}
            <div className={`w-full grid gap-3 ${
              wonItems.length === 1
                ? 'grid-cols-1 max-w-md mx-auto'
                : wonItems.length === 2
                ? 'grid-cols-1 sm:grid-cols-2'
                : wonItems.length === 3
                ? 'grid-cols-1 sm:grid-cols-3'
                : wonItems.length === 4
                ? 'grid-cols-2 sm:grid-cols-4'
                : 'grid-cols-2 sm:grid-cols-5'
            }`}>
              {wonItems.map(item => {
                const sDef = getSkinDefinition(item.skinId);
                const cfg = RARITY_CONFIG[item.rarity];
                const isSold = soldItemIds.includes(item.id);

                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-2xl border-2 flex flex-col justify-between items-center text-center transition-all bg-gradient-to-b ${cfg.bgGradient} ${cfg.border} shadow-lg`}
                  >
                    <div className="w-full flex items-center justify-between text-[10px] font-bold">
                      <span className={`px-1.5 py-0.5 rounded bg-black/60 ${cfg.textColor}`}>
                        {cfg.label}
                      </span>
                      <span className="text-slate-400 font-mono bg-slate-950/60 px-1.5 py-0.5 rounded">
                        {item.wear}
                      </span>
                    </div>

                    <span className="text-5xl my-3 drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)]">
                      {sDef?.icon || '🔫'}
                    </span>

                    <div className="w-full truncate">
                      <p className="text-[11px] font-semibold text-slate-400 truncate">{item.weapon}</p>
                      <p className={`text-xs font-black truncate ${cfg.textColor}`}>{item.name}</p>
                    </div>

                    <div className="w-full mt-3 pt-2 border-t border-slate-800/80 flex flex-col items-center gap-1.5">
                      <span className="text-sm font-black font-mono text-emerald-400">
                        {formatCurrency(item.value)}
                      </span>
                      {!isSold ? (
                        <button
                          onClick={() => handleSellOneItem(item)}
                          className="w-full py-1 rounded-lg bg-emerald-600/80 hover:bg-emerald-500 text-white font-bold text-[11px] cursor-pointer"
                        >
                          💵 Vendre
                        </button>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-400/80">
                          ✓ Vendu
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bouton pour rouvrir avec la même quantité */}
            <div className="flex items-center justify-center gap-3 mt-2">
              <button
                onClick={handleStartOpen}
                disabled={!canAfford}
                className={`px-8 py-3.5 rounded-2xl font-black text-sm uppercase tracking-wider shadow-lg transition-transform active:scale-95 cursor-pointer flex items-center gap-2 ${
                  canAfford
                    ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 hover:brightness-110 shadow-amber-950 ring-2 ring-yellow-300'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                🔄 Rouvrir {selectedCount}x ({formatCurrency(totalCost)})
              </button>
            </div>
          </div>
        )}

        {/* ─── BOUTON D'OUVERTURE INITIALE ─── */}
        {wonItems.length === 0 && !isSpinning && (
          <div className="flex flex-col items-center gap-3 mt-2">
            {errorMessage && (
              <p className="text-red-400 text-sm font-semibold bg-red-950/80 px-4 py-1.5 rounded-lg border border-red-500/40">
                ⚠️ {errorMessage}
              </p>
            )}

            <button
              onClick={handleStartOpen}
              disabled={!canAfford || isOpening}
              className={`px-8 py-4 rounded-2xl font-black text-lg tracking-wider uppercase transition-all shadow-xl active:scale-95 cursor-pointer flex items-center gap-3 ${
                canAfford
                  ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 hover:brightness-110 shadow-amber-900/60 ring-2 ring-yellow-300'
                  : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
              }`}
            >
              <span>🎰 OUVRIR {selectedCount > 1 ? `${selectedCount}X CAISSES` : 'CETTE CAISSE'}</span>
              <span className="bg-slate-950/30 px-3 py-1 rounded-xl text-sm font-mono">
                {formatCurrency(totalCost)}
              </span>
            </button>

            {!canAfford && (
              <p className="text-xs text-amber-400/80">
                Solde insuffisant ({formatCurrency(playerCash)} disponible pour {formatCurrency(totalCost)}).
              </p>
            )}
          </div>
        )}

        {/* ─── APERÇU DU POOL DE SKINS DE LA CAISSE ─── */}
        <div className="w-full mt-6 border-t border-slate-800/80 pt-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 text-center">
            Contenu potentiel de cette caisse ({caseDef.skinPool.length} skins)
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-44 overflow-y-auto pr-1">
            {caseDef.skinPool.map(entry => {
              const sDef = getSkinDefinition(entry.skinId);
              const cfg = RARITY_CONFIG[sDef.rarity];
              return (
                <div
                  key={sDef.id}
                  className={`p-2 rounded-xl border flex flex-col items-center justify-between text-center bg-gradient-to-b ${cfg.bgGradient} ${cfg.border}`}
                >
                  <span className="text-2xl">{sDef.icon}</span>
                  <p className="text-[10px] text-slate-400 font-semibold truncate w-full mt-1">
                    {sDef.weapon}
                  </p>
                  <p className={`text-[11px] font-black truncate w-full ${cfg.textColor}`}>
                    {sDef.name}
                  </p>
                  <span className="text-[10px] font-mono text-emerald-400 mt-1">
                    ~{formatCurrency(sDef.baseValue)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
