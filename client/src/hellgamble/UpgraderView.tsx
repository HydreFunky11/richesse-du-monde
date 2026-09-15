import React, { useState } from 'react';
import type { HellItem, HellPlayer } from './types';
import { RARITY_CONFIG } from './types';
import { SKINS_DATABASE, formatCurrency } from './skinsData';
import { soundFx } from '../utils/audio';

interface UpgraderViewProps {
  myPlayer: HellPlayer;
  onUpgrade: (wagerItemIds: string[], cashWager: number, targetSkinId: string) => Promise<{
    success: boolean;
    error?: string;
    won?: boolean;
    roll?: number;
    prob?: number;
    targetItem?: HellItem;
    rollAngle?: number;
  }>;
}

export const UpgraderView: React.FC<UpgraderViewProps> = ({
  myPlayer,
  onUpgrade,
}) => {
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [cashWager, setCashWager] = useState<number>(0);
  const [targetSkinId, setTargetSkinId] = useState<string>(SKINS_DATABASE[12].id); // default AK Cartel or similar
  const [isSpinning, setIsSpinning] = useState(false);
  const [needleAngle, setNeedleAngle] = useState(0);
  const [upgradeOutcome, setUpgradeOutcome] = useState<{
    won: boolean;
    item?: HellItem;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const targetSkin = SKINS_DATABASE.find(s => s.id === targetSkinId) || SKINS_DATABASE[0];

  // Calcul de la mise totale
  const selectedItems = myPlayer.inventory.filter(i => selectedItemIds.includes(i.id));
  const itemsValue = selectedItems.reduce((sum, item) => sum + item.value, 0);
  const totalWager = parseFloat((itemsValue + cashWager).toFixed(2));

  // Calcul du pourcentage de chance (RTP 95%)
  let rawProb = targetSkin.baseValue > 0 ? (totalWager / targetSkin.baseValue) * 0.95 : 0;
  let chancePercent = Math.min(90, Math.max(0, rawProb * 100));
  const multiplier = totalWager > 0 ? parseFloat((targetSkin.baseValue / totalWager).toFixed(2)) : 0;

  const handleToggleItem = (itemId: string) => {
    if (isSpinning) return;
    setErrorMessage(null);
    setUpgradeOutcome(null);
    soundFx.click();
    if (selectedItemIds.includes(itemId)) {
      setSelectedItemIds(selectedItemIds.filter(id => id !== itemId));
    } else {
      setSelectedItemIds([...selectedItemIds, itemId]);
    }
  };

  const handleStartUpgrade = async () => {
    if (isSpinning || totalWager <= 0 || chancePercent <= 0) return;
    if (targetSkin.baseValue <= totalWager) {
      setErrorMessage('Le skin cible doit avoir une valeur supérieure à votre mise.');
      return;
    }

    setErrorMessage(null);
    setUpgradeOutcome(null);
    setIsSpinning(true);

    soundFx.click();

    const result = await onUpgrade(selectedItemIds, cashWager, targetSkin.id);
    if (!result.success || result.rollAngle === undefined) {
      setErrorMessage(result.error || 'Erreur lors du calcul de l\'upgrade.');
      setIsSpinning(false);
      return;
    }

    // Animation de rotation de l'aiguille
    const finalAngle = result.rollAngle;
    setNeedleAngle(finalAngle);

    // Durée de la rotation (4.2 secondes)
    setTimeout(() => {
      setIsSpinning(false);
      if (result.won) {
        soundFx.upgradeSuccess();
        setUpgradeOutcome({ won: true, item: result.targetItem });
      } else {
        soundFx.upgradeFail();
        setUpgradeOutcome({ won: false });
      }
      // Reset sélection
      setSelectedItemIds([]);
      setCashWager(0);
    }, 4300);
  };

  // Helper arc SVG pour le secteur vert gagnant
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * (chancePercent / 100));

  const targetCfg = RARITY_CONFIG[targetSkin.rarity];

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-in">
      {/* ─── BANNIERE TITRE ─── */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-purple-950/80 via-slate-950 to-pink-950/80 border border-purple-500/30 shadow-2xl flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-3xl shadow-lg shadow-purple-950">
            ⚡
          </div>
          <div>
            <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-pink-300 to-amber-300">
              L'Upgrader Hellcase
            </h2>
            <p className="text-sm text-slate-300">
              Misez des skins ou du faux cash, choisissez un skin cible et tentez votre chance avec la roue circulaire de probabilité !
            </p>
          </div>
        </div>
      </div>

      {/* ─── ZONE PRINCIPALE DE L'UPGRADE ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
        {/* 1. GAUCHE : MISE ACTUELLE */}
        <div className="p-5 rounded-3xl border border-slate-800 bg-slate-900/70 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <span>🎒 Votre Mise</span>
            </h3>
            <span className="text-base font-black font-mono text-emerald-400">
              {formatCurrency(totalWager)}
            </span>
          </div>

          {/* Ajustement cash rapide */}
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              Ajouter du cash liquide (Solde: {formatCurrency(myPlayer.cash)}) :
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max={Math.min(myPlayer.cash, 1000)}
                step="5"
                value={cashWager}
                onChange={e => {
                  setCashWager(parseFloat(e.target.value));
                  setUpgradeOutcome(null);
                }}
                disabled={isSpinning}
                className="flex-1 accent-purple-500 cursor-pointer"
              />
              <span className="text-xs font-mono font-bold text-slate-200 w-16 text-right">
                {formatCurrency(cashWager)}
              </span>
            </div>
          </div>

          {/* Skins sélectionnés dans l'inventaire */}
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              Skins sélectionnés ({selectedItemIds.length}) :
            </label>
            <div className="max-h-48 overflow-y-auto pr-1 flex flex-col gap-1.5">
              {myPlayer.inventory.length === 0 ? (
                <p className="text-xs text-slate-500 py-3 text-center">
                  Votre inventaire est vide. Ouvrez des caisses pour obtenir des skins !
                </p>
              ) : (
                myPlayer.inventory.map(item => {
                  const isSelected = selectedItemIds.includes(item.id);
                  const cfg = RARITY_CONFIG[item.rarity];
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleToggleItem(item.id)}
                      disabled={isSpinning}
                      className={`p-2 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                        isSelected
                          ? 'border-purple-400 bg-purple-950/40 text-purple-200 ring-1 ring-purple-400'
                          : 'border-slate-800 bg-slate-950 hover:border-slate-700 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span>{item.skinId.includes('knife') ? '🗡️' : '🔫'}</span>
                        <div className="truncate">
                          <p className="text-xs font-bold text-slate-200 truncate">{item.name}</p>
                          <span className={`text-[10px] uppercase font-bold ${cfg.textColor}`}>
                            {item.wear}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-mono font-bold text-emerald-400">
                        {formatCurrency(item.value)}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* 2. CENTRE : LA ROUE RADIALE HELLCASE */}
        <div className="p-6 rounded-3xl border-2 border-slate-700 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center gap-4 shadow-2xl relative overflow-hidden">
          {/* Lueur centrale */}
          <div className="absolute w-48 h-48 rounded-full bg-purple-600/10 blur-3xl pointer-events-none" />

          {/* Roue SVG */}
          <div className="relative w-64 h-64 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 220 220">
              {/* Cercle rouge/sombre (Danger / Fail zone) */}
              <circle
                cx="110"
                cy="110"
                r={radius}
                className="text-red-950/60"
                strokeWidth="16"
                stroke="currentColor"
                fill="transparent"
              />
              {/* Arc vert (Zone de succès gagnante) */}
              <circle
                cx="110"
                cy="110"
                r={radius}
                className="text-emerald-500 transition-all duration-300"
                strokeWidth="16"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
                style={{ filter: 'drop-shadow(0 0 8px rgba(16,185,129,0.7))' }}
              />
            </svg>

            {/* Aiguille pivotante */}
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none will-change-transform"
              style={{
                transform: `rotate(${needleAngle}deg)`,
                transition: isSpinning ? 'transform 4.2s cubic-bezier(0.12, 0.8, 0.2, 1)' : 'none',
              }}
            >
              {/* Marqueur d'aiguille néon */}
              <div className="absolute top-2 flex flex-col items-center">
                <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[16px] border-t-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,1)]" />
              </div>
            </div>

            {/* Centre de la roue (Affichage du % de chance) */}
            <div className="absolute flex flex-col items-center justify-center text-center p-4">
              <span className="text-3xl font-black text-slate-100 font-mono tracking-tight">
                {chancePercent.toFixed(1)}%
              </span>
              <span className="text-[10px] uppercase tracking-widest font-black text-emerald-400">
                CHANCE
              </span>
              {multiplier > 0 && (
                <span className="mt-1 px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold">
                  {multiplier}x
                </span>
              )}
            </div>
          </div>

          {/* Résultat de l'upgrade */}
          {upgradeOutcome && (
            <div className={`w-full p-3 rounded-2xl border text-center animate-scale-in ${
              upgradeOutcome.won
                ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-lg shadow-emerald-950'
                : 'bg-red-950/80 border-red-500 text-red-300 shadow-lg shadow-red-950'
            }`}>
              {upgradeOutcome.won ? (
                <>
                  <p className="font-black text-base">🎉 UPGRADE RÉUSSI !</p>
                  <p className="text-xs mt-0.5">
                    Vous remportez {upgradeOutcome.item?.weapon} | {upgradeOutcome.item?.name} ({formatCurrency(upgradeOutcome.item?.value || 0)}) !
                  </p>
                </>
              ) : (
                <>
                  <p className="font-black text-base">💥 ÉCHEC...</p>
                  <p className="text-xs mt-0.5">L'aiguille a atterri hors de la zone. Mise détruite !</p>
                </>
              )}
            </div>
          )}

          {errorMessage && (
            <p className="text-xs text-red-400 font-semibold bg-red-950 px-3 py-1 rounded-lg border border-red-500/40 text-center">
              ⚠️ {errorMessage}
            </p>
          )}

          {/* Bouton de spin */}
          <button
            onClick={handleStartUpgrade}
            disabled={isSpinning || totalWager <= 0 || chancePercent <= 0}
            className={`w-full py-4 rounded-2xl font-black text-base uppercase tracking-wider shadow-xl transition-all active:scale-95 cursor-pointer ${
              totalWager > 0 && chancePercent > 0 && !isSpinning
                ? 'bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:brightness-110 text-white shadow-purple-950 ring-2 ring-purple-400'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            {isSpinning ? 'SPIN EN COURS...' : '⚡ TENTER L\'UPGRADE'}
          </button>
        </div>

        {/* 3. DROITE : SKIN CIBLE SÉLECTIONNÉ */}
        <div className="p-5 rounded-3xl border border-slate-800 bg-slate-900/70 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <span>🎯 Skin Cible</span>
            </h3>
            <span className="text-base font-black font-mono text-emerald-400">
              {formatCurrency(targetSkin.baseValue)}
            </span>
          </div>

          {/* Carte du skin cible */}
          <div className={`p-4 rounded-2xl border-2 flex flex-col items-center text-center bg-gradient-to-b ${targetCfg.bgGradient} ${targetCfg.border}`}>
            <span className="text-5xl my-2">{targetSkin.icon}</span>
            <p className="text-xs text-slate-400 font-semibold">{targetSkin.weapon}</p>
            <h4 className={`text-sm font-black ${targetCfg.textColor}`}>{targetSkin.name}</h4>
            <span className="text-xs font-mono font-bold text-emerald-400 mt-1">
              Valeur : {formatCurrency(targetSkin.baseValue)}
            </span>
          </div>

          {/* Liste des skins cibles à choisir */}
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              Choisir un autre skin cible :
            </label>
            <div className="max-h-48 overflow-y-auto pr-1 grid grid-cols-2 gap-1.5">
              {SKINS_DATABASE.map(s => {
                const isSelected = s.id === targetSkinId;
                const cfg = RARITY_CONFIG[s.rarity];
                return (
                  <button
                    key={s.id}
                    onClick={() => {
                      if (!isSpinning) {
                        setTargetSkinId(s.id);
                        setUpgradeOutcome(null);
                        soundFx.click();
                      }
                    }}
                    className={`p-2 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'border-amber-400 bg-amber-500/20 ring-1 ring-amber-400'
                        : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span>{s.icon}</span>
                      <span className={`text-[11px] font-bold truncate ${cfg.textColor}`}>
                        {s.name}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 mt-1">
                      {formatCurrency(s.baseValue)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
