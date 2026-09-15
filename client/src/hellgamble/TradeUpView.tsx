import React, { useState } from 'react';
import type { HellItem, HellPlayer, SkinRarity } from './types';
import { RARITY_CONFIG } from './types';
import { formatCurrency } from './skinsData';
import { soundFx } from '../utils/audio';

interface TradeUpViewProps {
  myPlayer: HellPlayer;
  onTradeUp: (itemIds: string[]) => Promise<{
    success: boolean;
    error?: string;
    itemWon?: HellItem;
  }>;
}

export const TradeUpView: React.FC<TradeUpViewProps> = ({
  myPlayer,
  onTradeUp,
}) => {
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [activeRarityFilter, setActiveRarityFilter] = useState<SkinRarity | 'ALL'>('ALL');
  const [isSigning, setIsSigning] = useState(false);
  const [tradeUpResult, setTradeUpResult] = useState<HellItem | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Déterminer la rareté requise si au moins 1 item est sélectionné
  const firstSelectedItem = myPlayer.inventory.find(i => selectedItemIds.includes(i.id));
  const lockedRarity = firstSelectedItem ? firstSelectedItem.rarity : null;

  const handleToggleItem = (item: HellItem) => {
    if (isSigning) return;
    setErrorMessage(null);
    setTradeUpResult(null);

    // Si on a déjà un item sélectionné, tous les suivants doivent être de la même rareté
    if (lockedRarity && item.rarity !== lockedRarity && !selectedItemIds.includes(item.id)) {
      setErrorMessage(`Vous devez sélectionner des skins de rareté identique (${RARITY_CONFIG[lockedRarity].label}).`);
      return;
    }

    if (selectedItemIds.includes(item.id)) {
      setSelectedItemIds(selectedItemIds.filter(id => id !== item.id));
      soundFx.click();
    } else {
      if (selectedItemIds.length >= 10) {
        setErrorMessage('Le contrat est déjà complet (10 skins maximum).');
        return;
      }
      setSelectedItemIds([...selectedItemIds, item.id]);
      soundFx.click();
    }
  };

  const handleSignContract = async () => {
    if (selectedItemIds.length !== 10 || isSigning) return;

    setIsSigning(true);
    setErrorMessage(null);
    setTradeUpResult(null);

    soundFx.playCard();

    const result = await onTradeUp(selectedItemIds);
    setIsSigning(false);

    if (result.success && result.itemWon) {
      soundFx.skinReveal(result.itemWon.rarity);
      setTradeUpResult(result.itemWon);
      setSelectedItemIds([]);
    } else {
      setErrorMessage(result.error || 'Erreur lors du contrat d\'échange.');
    }
  };

  // Filtrage de l'inventaire
  const filteredInventory = myPlayer.inventory.filter(item => {
    if (activeRarityFilter !== 'ALL' && item.rarity !== activeRarityFilter) return false;
    return true;
  });

  const selectedItems = myPlayer.inventory.filter(i => selectedItemIds.includes(i.id));
  const totalValueCommitted = selectedItems.reduce((sum, i) => sum + i.value, 0);

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-in">
      {/* ─── BANNIERE TITRE ─── */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-amber-950/80 via-slate-950 to-emerald-950/80 border border-amber-500/30 shadow-2xl flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-emerald-600 flex items-center justify-center text-3xl shadow-lg shadow-amber-950">
            📜
          </div>
          <div>
            <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-300 to-emerald-300">
              Contrats d'Échange (Trade-Up)
            </h2>
            <p className="text-sm text-slate-300">
              Sacrifiez 10 skins de la même rareté pour forger 1 skin de rareté immédiatement supérieure !
            </p>
          </div>
        </div>
      </div>

      {/* ─── TABLE DU CONTRAT (10 SLOTS) ─── */}
      <div className="p-6 rounded-3xl border border-slate-800 bg-slate-900/80 flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-200">
              Skins engagés dans le contrat ({selectedItemIds.length} / 10)
            </h3>
            {lockedRarity && (
              <span className="text-xs text-slate-400">
                Rareté requise : <strong className={RARITY_CONFIG[lockedRarity].textColor}>{RARITY_CONFIG[lockedRarity].label}</strong>
              </span>
            )}
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-400">
              Valeur totale engagée : <strong className="text-emerald-400 font-mono text-sm">{formatCurrency(totalValueCommitted)}</strong>
            </span>
            {selectedItemIds.length > 0 && (
              <button
                onClick={() => setSelectedItemIds([])}
                className="text-xs text-slate-400 hover:text-red-400 underline cursor-pointer"
              >
                Vider la table
              </button>
            )}
          </div>
        </div>

        {/* Grille des 10 emplacements de signature */}
        <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-10 gap-2.5">
          {Array.from({ length: 10 }).map((_, index) => {
            const item = selectedItems[index];
            if (item) {
              const cfg = RARITY_CONFIG[item.rarity];
              return (
                <div
                  key={item.id}
                  onClick={() => handleToggleItem(item)}
                  className={`relative p-2.5 rounded-2xl border-2 flex flex-col items-center justify-between text-center cursor-pointer transition-all hover:scale-105 ${cfg.border} bg-gradient-to-b ${cfg.bgGradient}`}
                >
                  <span className="text-2xl my-1">{item.skinId.includes('knife') ? '🗡️' : '🔫'}</span>
                  <p className="text-[10px] font-bold text-slate-200 truncate w-full">{item.name}</p>
                  <span className="text-[10px] font-mono text-emerald-400">
                    {formatCurrency(item.value)}
                  </span>
                  <button className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-600 text-white text-xs flex items-center justify-center font-black">
                    ×
                  </button>
                </div>
              );
            }

            return (
              <div
                key={index}
                className="h-28 rounded-2xl border-2 border-dashed border-slate-800 bg-slate-950/50 flex flex-col items-center justify-center text-slate-600 text-xs font-bold"
              >
                <span>Slot {index + 1}</span>
              </div>
            );
          })}
        </div>

        {/* Bouton de signature du contrat */}
        <div className="flex flex-col items-center gap-3 pt-2">
          {errorMessage && (
            <p className="text-xs text-red-400 font-semibold bg-red-950 px-4 py-1.5 rounded-lg border border-red-500/40">
              ⚠️ {errorMessage}
            </p>
          )}

          <button
            onClick={handleSignContract}
            disabled={selectedItemIds.length !== 10 || isSigning}
            className={`px-8 py-4 rounded-2xl font-black text-base uppercase tracking-wider shadow-xl transition-all active:scale-95 cursor-pointer ${
              selectedItemIds.length === 10 && !isSigning
                ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-500 text-slate-950 hover:brightness-110 shadow-amber-950 ring-2 ring-yellow-300'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            {isSigning ? 'SIGNATURE EN COURS...' : '📜 SIGNER LE CONTRAT D\'ÉCHANGE (10/10)'}
          </button>
        </div>

        {/* Résultat obtenu */}
        {tradeUpResult && (
          <div className="w-full max-w-md mx-auto p-5 rounded-2xl border-2 border-emerald-400 bg-gradient-to-b from-slate-900 to-slate-950 flex flex-col items-center text-center animate-scale-in shadow-2xl">
            <span className="text-xs uppercase tracking-widest font-black text-emerald-400">
              🎉 NOUVEAU SKIN DÉBLOQUÉ PAR LE CONTRAT !
            </span>
            <span className="text-6xl my-3">
              {tradeUpResult.skinId.includes('knife') ? '🗡️' : '🔥'}
            </span>
            <h4 className="text-lg font-black text-slate-100">
              {tradeUpResult.weapon} | {tradeUpResult.name}
            </h4>
            <div className="mt-2 text-2xl font-black font-mono text-emerald-400">
              {formatCurrency(tradeUpResult.value)}
            </div>
            <span className="text-xs text-slate-400 mt-1">
              Rareté supérieure : {RARITY_CONFIG[tradeUpResult.rarity].label}
            </span>
          </div>
        )}
      </div>

      {/* ─── SÉLECTION DANS L'INVENTAIRE ─── */}
      <div className="p-6 rounded-3xl border border-slate-800 bg-slate-900/60 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-300">
            Choisissez des skins dans votre inventaire ({myPlayer.inventory.length}) :
          </h3>

          {/* Filtres de rareté */}
          <div className="flex flex-wrap gap-1.5">
            {(['ALL', 'milspec', 'restricted', 'classified', 'covert'] as const).map(rar => (
              <button
                key={rar}
                onClick={() => setActiveRarityFilter(rar)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeRarityFilter === rar
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {rar === 'ALL' ? 'Tous' : RARITY_CONFIG[rar].label}
              </button>
            ))}
          </div>
        </div>

        {/* Grille de skins disponibles */}
        {filteredInventory.length === 0 ? (
          <p className="text-xs text-slate-500 py-8 text-center">
            Aucun skin correspondant dans votre inventaire.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 max-h-80 overflow-y-auto pr-1">
            {filteredInventory.map(item => {
              const isSelected = selectedItemIds.includes(item.id);
              const cfg = RARITY_CONFIG[item.rarity];
              const isRarityMismatch = lockedRarity !== null && item.rarity !== lockedRarity;

              return (
                <div
                  key={item.id}
                  onClick={() => !isRarityMismatch && handleToggleItem(item)}
                  className={`p-2.5 rounded-2xl border-2 flex flex-col items-center justify-between text-center transition-all select-none ${
                    isRarityMismatch
                      ? 'opacity-30 cursor-not-allowed border-slate-800'
                      : isSelected
                      ? 'border-yellow-400 ring-2 ring-yellow-400 scale-95'
                      : 'cursor-pointer hover:border-slate-600'
                  } ${cfg.border} bg-gradient-to-b ${cfg.bgGradient}`}
                >
                  <span className="text-3xl my-1">{item.skinId.includes('knife') ? '🗡️' : '🔫'}</span>
                  <p className="text-[10px] font-bold text-slate-300 truncate w-full">{item.name}</p>
                  <span className="text-[10px] font-mono text-emerald-400 mt-1">
                    {formatCurrency(item.value)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
