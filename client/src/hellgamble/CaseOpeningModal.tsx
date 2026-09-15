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
  onOpenCase: (caseId: string) => Promise<{
    success: boolean;
    error?: string;
    item?: HellItem;
    reelItems?: ReelCard[];
    winningIndex?: number;
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
  const [isOpening, setIsOpening] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [reelCards, setReelCards] = useState<ReelCard[]>([]);
  const [winningIndex, setWinningIndex] = useState(0);
  const [wonItem, setWonItem] = useState<HellItem | null>(null);
  const [hasSold, setHasSold] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const canAfford = playerCash >= caseDef.price;

  const handleStartOpen = async () => {
    if (isSpinning || isOpening || !canAfford) return;

    setErrorMessage(null);
    setWonItem(null);
    setHasSold(false);
    setIsOpening(true);

    soundFx.click();

    const result = await onOpenCase(caseDef.id);
    if (!result.success || !result.item || !result.reelItems) {
      setErrorMessage(result.error || 'Erreur lors du tirage.');
      setIsOpening(false);
      return;
    }

    setReelCards(result.reelItems);
    setWinningIndex(result.winningIndex ?? 38);
    setWonItem(result.item);
    setIsSpinning(true);
  };

  const handleSpinComplete = () => {
    setIsSpinning(false);
    setIsOpening(false);
  };

  const handleSellWonItem = async () => {
    if (!wonItem || hasSold) return;
    soundFx.coinsCash();
    const success = await onSellItem(wonItem.id);
    if (success) {
      setHasSold(true);
    }
  };

  const wonSkinDef = wonItem ? getSkinDefinition(wonItem.skinId) : null;
  const wonCfg = wonItem ? RARITY_CONFIG[wonItem.rarity] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl rounded-3xl bg-slate-950 border border-slate-700/80 shadow-2xl p-6 md:p-8 flex flex-col items-center">
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
        <div className="text-center mb-5">
          <div className="flex items-center justify-center gap-3">
            <span className="text-4xl">{caseDef.icon}</span>
            <h2 className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500">
              {caseDef.name}
            </h2>
            <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 text-xs font-black tracking-wider">
              {caseDef.tag}
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
            {caseDef.description}
          </p>
        </div>

        {/* ─── ZONE DE ROULETTE OU REVEAL ─── */}
        <div className="w-full my-4">
          {isSpinning || reelCards.length > 0 ? (
            <RouletteReel
              items={reelCards}
              winningIndex={winningIndex}
              isSpinning={isSpinning}
              onSpinEnd={handleSpinComplete}
            />
          ) : (
            <div className="w-full h-52 rounded-2xl border-2 border-dashed border-slate-800 bg-slate-900/40 flex flex-col items-center justify-center text-slate-500">
              <span className="text-6xl animate-pulse">{caseDef.icon}</span>
              <p className="mt-3 text-sm font-semibold">
                Cliquez ci-dessous pour lancer la roulette de tirage !
              </p>
            </div>
          )}
        </div>

        {/* ─── REVELATION APRES LE SPIN ─── */}
        {wonItem && wonCfg && !isSpinning && (
          <div className="w-full max-w-xl my-4 p-5 rounded-2xl border-2 bg-gradient-to-b from-slate-900 to-slate-950 flex flex-col items-center animate-scale-in"
            style={{ borderColor: wonCfg.color }}
          >
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-xs font-black uppercase bg-black/60 tracking-wider"
                style={{ color: wonCfg.color }}
              >
                {wonCfg.label}
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                {wonItem.wear} (Float: {wonItem.float})
              </span>
            </div>

            <div className="relative my-3 flex flex-col items-center">
              <span className="text-7xl drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)]">
                {wonSkinDef?.icon || '🔫'}
              </span>
              <div
                className="absolute w-24 h-24 rounded-full blur-2xl opacity-50 pointer-events-none"
                style={{ backgroundColor: wonCfg.color }}
              />
            </div>

            <h3 className="text-xl font-bold text-slate-200 text-center">
              {wonItem.weapon} <span style={{ color: wonCfg.color }}>| {wonItem.name}</span>
            </h3>

            <div className="mt-2 text-2xl font-black text-emerald-400 font-mono">
              +{formatCurrency(wonItem.value)}
            </div>

            {/* Actions post-drop */}
            <div className="flex flex-wrap items-center justify-center gap-3 mt-4 w-full">
              {!hasSold ? (
                <button
                  onClick={handleSellWonItem}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm shadow-lg shadow-emerald-950 transition-transform active:scale-95 cursor-pointer flex items-center gap-2"
                >
                  💵 Vendre immédiatement (+{formatCurrency(wonItem.value)})
                </button>
              ) : (
                <div className="px-4 py-2 rounded-xl bg-emerald-950 border border-emerald-500/50 text-emerald-300 font-bold text-sm">
                  ✅ Vendu avec succès pour {formatCurrency(wonItem.value)} !
                </div>
              )}

              <button
                onClick={handleStartOpen}
                disabled={!canAfford}
                className={`px-5 py-2.5 rounded-xl font-black text-sm shadow-lg transition-transform active:scale-95 cursor-pointer flex items-center gap-2 ${
                  canAfford
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-950'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                🔄 Rouvrir ({formatCurrency(caseDef.price)})
              </button>
            </div>
          </div>
        )}

        {/* ─── CONTROLES D'OUVERTURE DE BASE ─── */}
        {!wonItem && !isSpinning && (
          <div className="flex flex-col items-center gap-3 mt-3">
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
              <span>🎰 OUVRIR CETTE CAISSE</span>
              <span className="bg-slate-950/30 px-3 py-1 rounded-xl text-sm font-mono">
                {formatCurrency(caseDef.price)}
              </span>
            </button>

            {!canAfford && (
              <p className="text-xs text-amber-400/80">
                Solde insuffisant ({formatCurrency(playerCash)} disponible). Utilisez le Bonus Faillite ou vendez des skins !
              </p>
            )}
          </div>
        )}

        {/* ─── APERÇU DU POOL DE SKINS DE LA CAISSE ─── */}
        <div className="w-full mt-6 border-t border-slate-800/80 pt-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 text-center">
            Contenu potentiel de cette caisse ({caseDef.skinPool.length} skins)
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-48 overflow-y-auto pr-1">
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
