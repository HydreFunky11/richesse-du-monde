import React, { useState } from 'react';
import type { HellItem, HellPlayer, SkinRarity } from './types';
import { RARITY_CONFIG } from './types';
import { formatCurrency } from './skinsData';
import { soundFx } from '../utils/audio';

interface InventoryViewProps {
  myPlayer: HellPlayer;
  onSellItem: (itemId: string) => Promise<boolean>;
  onSellAll: (maxPrice?: number) => Promise<{ count: number; totalGained: number }>;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  myPlayer,
  onSellItem,
  onSellAll,
}) => {
  const [selectedRarity, setSelectedRarity] = useState<SkinRarity | 'ALL'>('ALL');
  const [sortBy, setSortBy] = useState<'VALUE_DESC' | 'VALUE_ASC' | 'NEWEST'>('VALUE_DESC');
  const [isSelling, setIsSelling] = useState(false);

  const inventory = myPlayer.inventory || [];
  const totalInventoryValue = inventory.reduce((sum, item) => sum + item.value, 0);

  const handleSellOne = async (item: HellItem) => {
    if (isSelling) return;
    setIsSelling(true);
    soundFx.coinsCash();
    await onSellItem(item.id);
    setIsSelling(false);
  };

  const handleQuickSell = async (maxPrice?: number) => {
    if (isSelling || inventory.length === 0) return;
    setIsSelling(true);
    soundFx.coinsCash();
    await onSellAll(maxPrice);
    setIsSelling(false);
  };

  // Filtrage
  let displayList = inventory.filter(item => {
    if (selectedRarity !== 'ALL' && item.rarity !== selectedRarity) return false;
    return true;
  });

  // Tri
  displayList.sort((a, b) => {
    if (sortBy === 'VALUE_DESC') return b.value - a.value;
    if (sortBy === 'VALUE_ASC') return a.value - b.value;
    return b.obtainedAt - a.obtainedAt;
  });

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-in">
      {/* ─── BANNIERE STATS & ACTIONS DE VENTE ─── */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-blue-950/80 via-slate-950 to-indigo-950/80 border border-blue-500/30 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-3xl shadow-lg shadow-blue-950">
            🎒
          </div>
          <div>
            <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-teal-300">
              Inventaire & Armurerie
            </h2>
            <p className="text-sm text-slate-300">
              {inventory.length} skin(s) en possession • Valeur marchande : <strong className="text-emerald-400 font-mono text-base">{formatCurrency(totalInventoryValue)}</strong>
            </p>
          </div>
        </div>

        {/* Boutons de vente groupée */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleQuickSell(5)}
            disabled={isSelling || inventory.length === 0}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer"
          >
            Vendre &lt; $5
          </button>
          <button
            onClick={() => handleQuickSell(20)}
            disabled={isSelling || inventory.length === 0}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer"
          >
            Vendre &lt; $20
          </button>
          <button
            onClick={() => handleQuickSell(undefined)}
            disabled={isSelling || inventory.length === 0}
            className="px-4 py-2 rounded-xl bg-red-600/80 hover:bg-red-500 text-white text-xs font-black transition-all cursor-pointer shadow-lg shadow-red-950"
          >
            🔥 Tout Vendre
          </button>
        </div>
      </div>

      {/* ─── FILTRES ET TRI ─── */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl border border-slate-800 bg-slate-900/60">
        {/* Filtre par rareté */}
        <div className="flex flex-wrap items-center gap-1.5">
          {(['ALL', 'milspec', 'restricted', 'classified', 'covert', 'special', 'contraband'] as const).map(rar => (
            <button
              key={rar}
              onClick={() => setSelectedRarity(rar)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedRarity === rar
                  ? 'bg-amber-500 text-slate-950 font-black'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              {rar === 'ALL' ? 'Tous' : RARITY_CONFIG[rar].label}
            </button>
          ))}
        </div>

        {/* Tri */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-semibold">Trier par :</span>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 outline-none"
          >
            <option value="VALUE_DESC">Prix le plus cher</option>
            <option value="VALUE_ASC">Prix le moins cher</option>
            <option value="NEWEST">Plus récent</option>
          </select>
        </div>
      </div>

      {/* ─── GRILLE DES SKINS ─── */}
      {displayList.length === 0 ? (
        <div className="p-12 rounded-3xl border border-dashed border-slate-800 bg-slate-900/30 text-center text-slate-500">
          <span className="text-5xl block mb-3">🔫</span>
          <p className="text-base font-bold">Votre armurerie ne contient aucun skin correspondant.</p>
          <p className="text-xs mt-1">Ouvrez des caisses ou remportez des battles pour remplir votre inventaire !</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {displayList.map(item => {
            const cfg = RARITY_CONFIG[item.rarity] || RARITY_CONFIG.consumer;
            return (
              <div
                key={item.id}
                className={`p-3 rounded-2xl border-2 flex flex-col justify-between items-center text-center transition-all hover:scale-102 ${cfg.border} bg-gradient-to-b ${cfg.bgGradient}`}
              >
                {/* Rareté & Wear */}
                <div className="w-full flex items-center justify-between text-[10px] font-bold">
                  <span className={`px-1.5 py-0.5 rounded bg-black/60 ${cfg.textColor}`}>
                    {cfg.label}
                  </span>
                  <span className="text-slate-400 font-mono bg-slate-950/60 px-1.5 py-0.5 rounded">
                    {item.wear}
                  </span>
                </div>

                {/* Icône de l'arme */}
                <span className="text-4xl my-3">
                  {item.skinId.includes('knife') ? '🗡️' : '🔫'}
                </span>

                {/* Nom et arme */}
                <div className="w-full truncate">
                  <p className="text-[11px] font-semibold text-slate-400 truncate">{item.weapon}</p>
                  <p className={`text-xs font-black truncate ${cfg.textColor}`}>{item.name}</p>
                </div>

                {/* Prix et action */}
                <div className="w-full mt-3 pt-2 border-t border-slate-800/80 flex flex-col items-center gap-1.5">
                  <span className="text-sm font-black font-mono text-emerald-400">
                    {formatCurrency(item.value)}
                  </span>
                  <button
                    onClick={() => handleSellOne(item)}
                    disabled={isSelling}
                    className="w-full py-1.5 rounded-lg bg-emerald-600/80 hover:bg-emerald-500 text-white font-bold text-xs transition-colors cursor-pointer"
                  >
                    💵 Vendre
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
