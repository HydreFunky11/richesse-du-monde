import React, { useEffect, useRef, useState } from 'react';
import type { SkinRarity } from './types';
import { RARITY_CONFIG } from './types';
import { soundFx } from '../utils/audio';

export interface ReelCard {
  skinId: string;
  name: string;
  weapon: string;
  rarity: SkinRarity;
  value: number;
  accentColor: string;
  icon: string;
}

interface RouletteReelProps {
  items: ReelCard[];
  winningIndex: number;
  isSpinning: boolean;
  onSpinEnd?: () => void;
  compact?: boolean;
}

const CARD_WIDTH = 150; // px
const CARD_GAP = 10;   // px
const TOTAL_CARD_WIDTH = CARD_WIDTH + CARD_GAP;

export const RouletteReel: React.FC<RouletteReelProps> = ({
  items,
  winningIndex,
  isSpinning,
  onSpinEnd,
  compact = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [translateX, setTranslateX] = useState(0);
  const [hasLanded, setHasLanded] = useState(false);
  const lastTickIndexRef = useRef<number>(-1);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isSpinning) {
      setTranslateX(0);
      setHasLanded(false);
      lastTickIndexRef.current = -1;
      return;
    }

    // Calcul de la cible
    // On veut centrer items[winningIndex]
    // La position du centre de la carte `winningIndex` depuis le début est :
    // offset = winningIndex * TOTAL_CARD_WIDTH + (CARD_WIDTH / 2)
    // On ajoute un léger jitter aléatoire [-CARD_WIDTH * 0.35, +CARD_WIDTH * 0.35] pour rendre chaque atterrissage unique
    const jitter = (Math.random() - 0.5) * (CARD_WIDTH * 0.65);
    const containerWidth = containerRef.current ? containerRef.current.clientWidth : 800;
    const centerOffset = containerWidth / 2;

    const targetOffset = winningIndex * TOTAL_CARD_WIDTH + (CARD_WIDTH / 2) + jitter;
    const finalTranslate = -(targetOffset - centerOffset);

    const spinDuration = 5200; // 5.2 secondes de suspense intense
    const startTime = performance.now();

    // Easing cubic custom (démarrage ultra-rapide puis longue décélération réaliste CS)
    const easeOutQuint = (t: number) => 1 - Math.pow(1 - t, 4.5);

    const tickAudio = () => {
      soundFx.rouletteTick();
    };

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / spinDuration);
      const easedProgress = easeOutQuint(progress);

      const currentX = finalTranslate * easedProgress;
      setTranslateX(currentX);

      // Calculer quelle carte passe sous l'aiguille pour le son
      const currentCardUnderCenter = Math.floor((-currentX + centerOffset) / TOTAL_CARD_WIDTH);
      if (currentCardUnderCenter !== lastTickIndexRef.current) {
        lastTickIndexRef.current = currentCardUnderCenter;
        tickAudio();
      }

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        setHasLanded(true);
        const wonCard = items[winningIndex];
        if (wonCard) {
          soundFx.skinReveal(wonCard.rarity);
        }
        if (onSpinEnd) {
          onSpinEnd();
        }
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isSpinning, winningIndex, items, onSpinEnd]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden rounded-2xl bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border-2 border-slate-700/80 shadow-2xl ${
        compact ? 'h-36' : 'h-52'
      }`}
    >
      {/* ─── AIGUILLE CENTRALE DE DÉCISION CS ─── */}
      <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 z-30 pointer-events-none flex flex-col items-center justify-between">
        {/* Flèche du haut */}
        <div className="w-0 h-0 border-l-[9px] border-l-transparent border-r-[9px] border-r-transparent border-t-[14px] border-t-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.9)]" />
        {/* Ligne néon lumineuse */}
        <div className="w-[2px] h-full bg-gradient-to-b from-amber-400 via-yellow-300 to-amber-500 shadow-[0_0_12px_rgba(251,191,36,0.9)]" />
        {/* Flèche du bas */}
        <div className="w-0 h-0 border-l-[9px] border-l-transparent border-r-[9px] border-r-transparent border-b-[14px] border-b-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.9)]" />
      </div>

      {/* Dégradés d'ombrage sur les bords (Vignette) */}
      <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent z-20 pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-slate-950 via-slate-950/80 to-transparent z-20 pointer-events-none" />

      {/* ─── BANDE DE CARTES DÉFILANTES ─── */}
      <div
        className="flex items-center h-full will-change-transform"
        style={{
          transform: `translateX(${translateX}px)`,
          gap: `${CARD_GAP}px`,
        }}
      >
        {items.map((card, idx) => {
          const cfg = RARITY_CONFIG[card.rarity] || RARITY_CONFIG.consumer;
          const isWinning = hasLanded && idx === winningIndex;

          return (
            <div
              key={`${card.skinId}_${idx}`}
              style={{ width: `${CARD_WIDTH}px` }}
              className={`flex-shrink-0 flex flex-col justify-between items-center p-3 rounded-xl border-2 transition-all duration-300 select-none ${
                compact ? 'h-32' : 'h-44'
              } ${cfg.border} bg-gradient-to-b ${cfg.bgGradient} ${
                isWinning
                  ? `scale-105 z-20 ring-4 ring-amber-400 shadow-[0_0_35px_${card.accentColor}]`
                  : 'opacity-90'
              }`}
            >
              {/* Rareté & Valeur */}
              <div className="w-full flex justify-between items-center text-[10px] font-bold">
                <span className={`px-1.5 py-0.5 rounded bg-black/50 ${cfg.textColor} uppercase tracking-wider`}>
                  {cfg.label}
                </span>
                <span className="text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-500/40">
                  ${card.value.toFixed(2)}
                </span>
              </div>

              {/* Icône / Visuel de l'arme */}
              <div className="relative my-auto flex flex-col items-center justify-center">
                <span className={`transition-transform duration-300 ${compact ? 'text-3xl' : 'text-5xl'} ${
                  isWinning ? 'scale-125 animate-bounce' : ''
                }`}>
                  {card.icon}
                </span>
                {/* Lueur de fond selon rareté */}
                <div
                  className="absolute w-16 h-16 rounded-full blur-xl opacity-40 pointer-events-none"
                  style={{ backgroundColor: card.accentColor }}
                />
              </div>

              {/* Nom du skin & Arme */}
              <div className="w-full text-center truncate">
                <p className="text-[11px] font-semibold text-slate-400 leading-tight truncate">
                  {card.weapon}
                </p>
                <p className={`text-[12px] font-black leading-tight truncate ${cfg.textColor}`}>
                  {card.name}
                </p>
              </div>

              {/* Barre de rareté inférieure */}
              <div
                className="w-full h-1 rounded-full mt-1"
                style={{ backgroundColor: card.accentColor }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
