import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { soundFx } from './utils/audio';

// ─── TYPES & DATA STRUCTURES ──────────────────────────────────────────────────

export type EssenceType = 'fire' | 'water' | 'earth' | 'air';

export interface TransmutationEra {
  id: number;
  name: string;
  sub: string;
  desc: string;
  threshold: number; // Lifetime matter required
  color: string;
  badgeStyle: string;
  cauldronBg: string;
  liquidColor: string;
  bubblesColor: string;
  glowColor: string;
  emoji: string;
  multiplier: number;
}

export interface WorkshopDef {
  id: string;
  name: string;
  emoji: string;
  baseCost: number;
  baseCps: number;
  desc: string;
  producesEssence?: EssenceType;
  essenceRate?: number; // essences per second
  reqEssences?: {
    type: EssenceType;
    amount: number;
  }[];
}

export interface UpgradeDef {
  id: string;
  name: string;
  emoji: string;
  cost: number;
  reqEssence?: { type: EssenceType; amount: number };
  desc: string;
  reqWorkshop?: { id: string; count: number };
  effectType: 'click_flat' | 'click_cps_pct' | 'workshop_mult' | 'global_mult' | 'crit_chance' | 'crit_mult' | 'essence_mult';
  targetWorkshop?: string;
  targetEssence?: EssenceType;
  multiplier?: number;
  percent?: number;
}

export interface SacredSealDef {
  id: string;
  name: string;
  planet: string;
  emoji: string;
  metal: string;
  desc: string;
  conditionDesc: string;
  isUnlocked: (s: AlchemySave) => boolean;
  bonusDesc: string;
}

export interface ConstellationDef {
  id: string;
  name: string;
  emoji: string;
  cost: number; // in Elixir Drops
  desc: string;
  maxLevel: number;
}

export interface FloatingText {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  isCrit?: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

export interface GoldenSprite {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: 'frenzy' | 'wealth' | 'essence';
  duration: number;
}

// ─── 12 TRANSMUTATION ERAS (CALIBRÉES SUR LE LONG TERME) ─────────────────────

export const ALCHEMY_ERAS: TransmutationEra[] = [
  {
    id: 1,
    name: 'Nigredo (Plomb Vil)',
    sub: 'L\'Œuvre au Noir',
    desc: 'La matière brute et opaque extraite des entrailles de la terre.',
    threshold: 0,
    color: 'from-stone-800 to-zinc-900',
    badgeStyle: 'bg-zinc-800 text-zinc-300 border-zinc-700',
    cauldronBg: '#27272a',
    liquidColor: '#3f3f46',
    bubblesColor: '#71717a',
    glowColor: 'rgba(113, 113, 122, 0.3)',
    emoji: '🌑',
    multiplier: 1,
  },
  {
    id: 2,
    name: 'Pyrite & Cuivre Brûlé',
    sub: 'Première Étincelle',
    desc: 'L\'action du feu fait poindre les premières lueurs métalliques.',
    threshold: 2_500,
    color: 'from-amber-900 to-stone-900',
    badgeStyle: 'bg-amber-950 text-amber-300 border-amber-800',
    cauldronBg: '#451a03',
    liquidColor: '#b45309',
    bubblesColor: '#f59e0b',
    glowColor: 'rgba(245, 158, 11, 0.4)',
    emoji: '🪨',
    multiplier: 1.5,
  },
  {
    id: 3,
    name: 'Fer & Vif-Argent (Mercure)',
    sub: 'L\'Union des Opposés',
    desc: 'Le solide inébranlable et le fluide fuyant se mêlent dans l\'athanor.',
    threshold: 100_000,
    color: 'from-cyan-950 to-slate-900',
    badgeStyle: 'bg-cyan-950 text-cyan-300 border-cyan-800',
    cauldronBg: '#083344',
    liquidColor: '#06b6d4',
    bubblesColor: '#67e8f9',
    glowColor: 'rgba(6, 182, 212, 0.4)',
    emoji: '⚙️',
    multiplier: 2,
  },
  {
    id: 4,
    name: 'Albedo (Argent Lunaire)',
    sub: 'L\'Œuvre au Blanc',
    desc: 'Purification sacrée. Une vapeur argentée et glaciale monte du creuset.',
    threshold: 5_000_000,
    color: 'from-slate-700 to-zinc-900',
    badgeStyle: 'bg-slate-800 text-slate-200 border-slate-600',
    cauldronBg: '#334155',
    liquidColor: '#e2e8f0',
    bubblesColor: '#ffffff',
    glowColor: 'rgba(255, 255, 255, 0.5)',
    emoji: '⚪',
    multiplier: 3,
  },
  {
    id: 5,
    name: 'Citrinitas (Or Solaire)',
    sub: 'L\'Œuvre au Jaune',
    desc: 'L\'énergie du soleil distillée dans le creuset. L\'or pur rayonne.',
    threshold: 250_000_000,
    color: 'from-yellow-900 to-amber-950',
    badgeStyle: 'bg-yellow-950 text-yellow-300 border-yellow-700',
    cauldronBg: '#713f12',
    liquidColor: '#eab308',
    bubblesColor: '#fef08a',
    glowColor: 'rgba(234, 179, 8, 0.5)',
    emoji: '🟡',
    multiplier: 4,
  },
  {
    id: 6,
    name: 'Cristal de Mana Primordial',
    sub: 'Éveil Arcanique',
    desc: 'La matière physique se cristallise pour canaliser la magie pure.',
    threshold: 10_000_000_000, // 10 Md
    color: 'from-indigo-950 to-purple-950',
    badgeStyle: 'bg-indigo-950 text-indigo-300 border-indigo-700',
    cauldronBg: '#312e81',
    liquidColor: '#6366f1',
    bubblesColor: '#a5b4fc',
    glowColor: 'rgba(99, 102, 241, 0.5)',
    emoji: '💎',
    multiplier: 6,
  },
  {
    id: 7,
    name: 'Poussière d\'Éther Céleste',
    sub: 'Le Voile Astral',
    desc: 'Substance céleste impalpable reliant la Terre aux galaxies lointaines.',
    threshold: 500_000_000_000, // 500 Md
    color: 'from-teal-950 to-emerald-950',
    badgeStyle: 'bg-teal-950 text-teal-300 border-teal-700',
    cauldronBg: '#042f2e',
    liquidColor: '#14b8a6',
    bubblesColor: '#5eead4',
    glowColor: 'rgba(20, 184, 166, 0.5)',
    emoji: '🌌',
    multiplier: 8,
  },
  {
    id: 8,
    name: 'Rubedo (Sang de Dragon)',
    sub: 'L\'Œuvre au Rouge',
    desc: 'La braise incandescente de la vie éternelle. Chaleur vivante et triomphe.',
    threshold: 25_000_000_000_000, // 25 T
    color: 'from-red-950 to-rose-950',
    badgeStyle: 'bg-red-950 text-rose-300 border-rose-700',
    cauldronBg: '#4c0519',
    liquidColor: '#f43f5e',
    bubblesColor: '#fda4af',
    glowColor: 'rgba(244, 63, 94, 0.5)',
    emoji: '🩸',
    multiplier: 12,
  },
  {
    id: 9,
    name: 'Quintessence Stellaire',
    sub: 'Le Cinquième Élément',
    desc: 'L\'essence dérobée au vide cosmique, pulsant au rythme des nébuleuses.',
    threshold: 1_000_000_000_000_000, // 1 Qa
    color: 'from-violet-950 to-fuchsia-950',
    badgeStyle: 'bg-violet-950 text-fuchsia-300 border-violet-700',
    cauldronBg: '#3b0764',
    liquidColor: '#c026d3',
    bubblesColor: '#f0abfc',
    glowColor: 'rgba(192, 38, 211, 0.6)',
    emoji: '🌟',
    multiplier: 16,
  },
  {
    id: 10,
    name: 'Orichalque Cosmique',
    sub: 'Métal des Dieux',
    desc: 'Forgé au cœur des supernovas agonisantes, indestructible et omnipotent.',
    threshold: 50_000_000_000_000_000, // 50 Qa
    color: 'from-amber-950 via-purple-950 to-slate-950',
    badgeStyle: 'bg-gradient-to-r from-amber-900 to-purple-900 text-amber-200 border-amber-500',
    cauldronBg: '#581c87',
    liquidColor: '#fbbf24',
    bubblesColor: '#c084fc',
    glowColor: 'rgba(251, 191, 36, 0.6)',
    emoji: '🔮',
    multiplier: 25,
  },
  {
    id: 11,
    name: 'La Pierre Philosophale',
    sub: 'Le Magnum Opus',
    desc: 'L\'artefact légendaire absolu. Tout ce qu\'il effleure se transmute en gloire.',
    threshold: 2_000_000_000_000_000_000, // 2 Qi
    color: 'from-rose-950 via-amber-950 to-red-950',
    badgeStyle: 'bg-gradient-to-r from-red-900 to-amber-700 text-amber-100 border-amber-400 animate-pulse',
    cauldronBg: '#7f1d1d',
    liquidColor: '#ef4444',
    bubblesColor: '#fef08a',
    glowColor: 'rgba(239, 68, 68, 0.7)',
    emoji: '🔴',
    multiplier: 50,
  },
  {
    id: 12,
    name: 'L\'Oméga Éternel (Singularité)',
    sub: 'Transmutation Infinie',
    desc: 'La réalité même s\'incline. L\'alchimie transcende les limites de l\'univers.',
    threshold: 100_000_000_000_000_000_000, // 100 Qi
    color: 'from-purple-950 via-indigo-950 to-amber-950',
    badgeStyle: 'bg-gradient-to-r from-purple-800 via-fuchsia-700 to-amber-500 text-white border-white animate-pulse',
    cauldronBg: '#18181b',
    liquidColor: '#a855f7',
    bubblesColor: '#ffffff',
    glowColor: 'rgba(255, 255, 255, 0.8)',
    emoji: '♾️',
    multiplier: 100,
  }
];

// ─── 12 WORKSHOPS AVEC PRODUCTION & BESOINS D\'ESSENCES ÉLÉMENTAIRES ─────────────

export const WORKSHOPS: WorkshopDef[] = [
  {
    id: 'herbalist',
    name: 'Apprenti Herboriste',
    emoji: '🌿',
    baseCost: 20,
    baseCps: 0.5,
    desc: 'Cueille des racines étranges et enrichit le sol.',
    producesEssence: 'earth',
    essenceRate: 0.2
  },
  {
    id: 'mortar',
    name: 'Mortier en Bronze',
    emoji: '🪨',
    baseCost: 150,
    baseCps: 3,
    desc: 'Pilonne la roche brute et génère de la terre fine calcinée.',
    producesEssence: 'earth',
    essenceRate: 0.8
  },
  {
    id: 'alembic',
    name: 'Alambic de Verre Soufflé',
    emoji: '⚗️',
    baseCost: 1_800,
    baseCps: 20,
    desc: 'Distille la rosée des marais en essence d\'eau pure.',
    producesEssence: 'water',
    essenceRate: 1.5
  },
  {
    id: 'crucible',
    name: 'Creuset Élémentaire',
    emoji: '🕯️',
    baseCost: 24_000,
    baseCps: 140,
    desc: 'Maintient un feu magique ardent nécessitant de la terre et de l\'eau.',
    producesEssence: 'fire',
    essenceRate: 3.0,
    reqEssences: [
      { type: 'earth', amount: 50 },
      { type: 'water', amount: 30 }
    ]
  },
  {
    id: 'homunculus',
    name: 'Homoncule Artificiel',
    emoji: '🧬',
    baseCost: 350_000,
    baseCps: 900,
    desc: 'Créature d\'argile et d\'étincelle vitale travaillant sans relâche.',
    producesEssence: 'earth',
    essenceRate: 5.0,
    reqEssences: [
      { type: 'fire', amount: 150 },
      { type: 'earth', amount: 200 }
    ]
  },
  {
    id: 'arcane_sphere',
    name: 'Sphère Arcanique',
    emoji: '🔮',
    baseCost: 4_500_000,
    baseCps: 6_000,
    desc: 'Canalise les vents de magie et l\'essence d\'air céleste.',
    producesEssence: 'air',
    essenceRate: 8.0,
    reqEssences: [
      { type: 'water', amount: 400 },
      { type: 'air', amount: 200 }
    ]
  },
  {
    id: 'transmutation_tower',
    name: 'Tour de Transmutation',
    emoji: '🏰',
    baseCost: 75_000_000,
    baseCps: 45_000,
    desc: 'Flèche royale où une confrérie d\'adeptes manipule les courants d\'air.',
    producesEssence: 'air',
    essenceRate: 15.0,
    reqEssences: [
      { type: 'fire', amount: 1_000 },
      { type: 'air', amount: 1_200 }
    ]
  },
  {
    id: 'dragon_forge',
    name: 'Forge Draconique',
    emoji: '🐉',
    baseCost: 1_500_000_000,
    baseCps: 350_000,
    desc: 'Fournaise volcanique crachant des flots d\'essence de feu brûlante.',
    producesEssence: 'fire',
    essenceRate: 35.0,
    reqEssences: [
      { type: 'fire', amount: 5_000 },
      { type: 'earth', amount: 3_000 }
    ]
  },
  {
    id: 'aether_condenser',
    name: 'Condensateur d\'Éther',
    emoji: '🌌',
    baseCost: 35_000_000_000,
    baseCps: 3_000_000,
    desc: 'Aspire la matière subtile et condense des torrents d\'eau astrale.',
    producesEssence: 'water',
    essenceRate: 75.0,
    reqEssences: [
      { type: 'water', amount: 20_000 },
      { type: 'air', amount: 15_000 }
    ]
  },
  {
    id: 'particle_accelerator',
    name: 'Collisionneur Arcanique',
    emoji: '🌀',
    baseCost: 800_000_000_000,
    baseCps: 25_000_000,
    desc: 'Fait entrer en collision les 4 éléments à des vitesses supraluminiques.',
    producesEssence: 'fire',
    essenceRate: 150.0,
    reqEssences: [
      { type: 'fire', amount: 50_000 },
      { type: 'water', amount: 50_000 },
      { type: 'earth', amount: 50_000 },
      { type: 'air', amount: 50_000 }
    ]
  },
  {
    id: 'magnum_sanctuary',
    name: 'Sanctuaire du Grand Œuvre',
    emoji: '🏛️',
    baseCost: 20_000_000_000_000,
    baseCps: 200_000_000,
    desc: 'Lieu saint où la réalité physique est transcendée.',
    producesEssence: 'air',
    essenceRate: 400.0,
    reqEssences: [
      { type: 'fire', amount: 200_000 },
      { type: 'water', amount: 200_000 },
      { type: 'earth', amount: 200_000 },
      { type: 'air', amount: 200_000 }
    ]
  },
  {
    id: 'cosmic_rift',
    name: 'Faille Dimensionnelle',
    emoji: '🕳️',
    baseCost: 500_000_000_000_000,
    baseCps: 1_800_000_000,
    desc: 'Trou de ver déversant une infinité de matière et d\'essences pures.',
    producesEssence: 'water',
    essenceRate: 1_000.0,
    reqEssences: [
      { type: 'fire', amount: 1_000_000 },
      { type: 'water', amount: 1_000_000 },
      { type: 'earth', amount: 1_000_000 },
      { type: 'air', amount: 1_000_000 }
    ]
  }
];

// ─── LES 7 SCEAUX ALCHIMIQUES DE LA PIERRE PHILOSOPHALE ────────────────────────

export const SACRED_SEALS: SacredSealDef[] = [
  {
    id: 'seal_lead',
    name: 'Sceau du Plomb',
    planet: 'Saturne 🪐',
    emoji: '🌑',
    metal: 'Plomb Terrestre',
    desc: 'La première étape de la transmutation : la maîtrise de la lourdeur terrestre.',
    conditionDesc: 'Posséder au moins 30 Herboristes et 30 Mortiers.',
    isUnlocked: (s) => (s.workshops['herbalist'] || 0) >= 30 && (s.workshops['mortar'] || 0) >= 30,
    bonusDesc: '+30% de production d\'Essence de Terre et +15% de CPS global.'
  },
  {
    id: 'seal_tin',
    name: 'Sceau de l\'Étain',
    planet: 'Jupiter ⚡',
    emoji: '🪨',
    metal: 'Étain Brillant',
    desc: 'L\'expansion de l\'énergie martelée sous le pilon de bronze.',
    conditionDesc: 'Effectuer 1 000 clics manuels sur le chaudron.',
    isUnlocked: (s) => s.totalClicks >= 1_000,
    bonusDesc: 'Vos clics manuels produisent 3x plus de matière.'
  },
  {
    id: 'seal_iron',
    name: 'Sceau du Fer',
    planet: 'Mars ⚔️',
    emoji: '⚙️',
    metal: 'Fer Trempé',
    desc: 'La résistance et la force du feu alchimique.',
    conditionDesc: 'Amasser au moins 5 000 Essences de Feu.',
    isUnlocked: (s) => (s.totalEssencesEarned?.fire || 0) >= 5_000,
    bonusDesc: '+50% d\'efficacité pour les Creusets et Forges Draconiques.'
  },
  {
    id: 'seal_copper',
    name: 'Sceau du Cuivre',
    planet: 'Vénus ♀️',
    emoji: '🔥',
    metal: 'Cuivre Rougeoyant',
    desc: 'La passion alchimique et le déclenchement de la fureur incandescente.',
    conditionDesc: 'Déclencher la Fureur Alchimique au moins 3 fois.',
    isUnlocked: (s) => s.furyTriggeredCount >= 3,
    bonusDesc: 'La Fureur Alchimique dure 8 secondes de plus.'
  },
  {
    id: 'seal_mercury',
    name: 'Sceau du Mercure',
    planet: 'Mercure 💧',
    emoji: '🧪',
    metal: 'Vif-Argent',
    desc: 'La fluidité suprême qui connecte tous les éléments entre eux.',
    conditionDesc: 'Posséder 25 Alambics et avoir généré 10 000 Essences d\'Eau.',
    isUnlocked: (s) => (s.workshops['alembic'] || 0) >= 25 && (s.totalEssencesEarned?.water || 0) >= 10_000,
    bonusDesc: '+25% de génération passive pour TOUTES les essences élémentaires.'
  },
  {
    id: 'seal_silver',
    name: 'Sceau de l\'Argent',
    planet: 'La Lune 🌙',
    emoji: '⚪',
    metal: 'Argent Lunaire',
    desc: 'La pureté sacrée de l\'Albedo chassant les impuretés du monde.',
    conditionDesc: 'Atteindre l\'ère Albedo et posséder 25 000 Essences d\'Air.',
    isUnlocked: (s) => s.lifetimeMatter >= 5_000_000 && (s.totalEssencesEarned?.air || 0) >= 25_000,
    bonusDesc: '+5% de chance de coup critique permanent et critique x2.'
  },
  {
    id: 'seal_gold',
    name: 'Sceau de l\'Or',
    planet: 'Le Soleil ☀️',
    emoji: '🟡',
    metal: 'Or Solaire',
    desc: 'L\'apogée de l\'œuvre matérielle avant la révélation de la Pierre Philosophale.',
    conditionDesc: 'Accumuler au moins 1 Trillion (1e12) de matière totale.',
    isUnlocked: (s) => s.lifetimeMatter >= 1_000_000_000_000,
    bonusDesc: 'Toute la production globale est doublée (x2) !'
  }
];

// ─── AMÉLIORATIONS DU GRIMOIRE (PROGRESSIVES & ÉQUILIBRÉES) ───────────────────

export const UPGRADES: UpgradeDef[] = [
  {
    id: 'click_1',
    name: 'Pilon en Granit',
    emoji: '🔨',
    cost: 100,
    desc: 'Vos clics manuels produisent 2x plus de matière.',
    effectType: 'click_flat',
    multiplier: 2
  },
  {
    id: 'click_2',
    name: 'Doigts Métalliques',
    emoji: '✨',
    cost: 1_500,
    desc: 'Vos clics manuels produisent 2x plus de matière.',
    effectType: 'click_flat',
    multiplier: 2
  },
  {
    id: 'click_synergy_1',
    name: 'Synergie Tellurique',
    emoji: '🧪',
    cost: 75_000,
    reqEssence: { type: 'earth', amount: 100 },
    desc: 'Chaque clic gagne +0.01% de votre production passive totale (CPS).',
    effectType: 'click_cps_pct',
    percent: 0.0001
  },
  {
    id: 'click_synergy_2',
    name: 'Toucher d\'Orichalque',
    emoji: '👑',
    cost: 50_000_000,
    reqEssence: { type: 'fire', amount: 2_000 },
    desc: 'Chaque clic gagne +0.02% supplémentaire de votre CPS total.',
    effectType: 'click_cps_pct',
    percent: 0.0002
  },
  {
    id: 'crit_1',
    name: 'Transmutation Critique',
    emoji: '🎯',
    cost: 5_000,
    reqEssence: { type: 'fire', amount: 50 },
    desc: '+4% de chance de coup critique (x5 dégâts).',
    effectType: 'crit_chance',
    percent: 0.04
  },
  {
    id: 'crit_2',
    name: 'Fulgurance d\'Hermès',
    emoji: '⚡',
    cost: 500_000,
    reqEssence: { type: 'air', amount: 500 },
    desc: 'Les coups critiques passent à un multiplicateur de x10 !',
    effectType: 'crit_mult',
    multiplier: 10
  },
  // Bâtiments
  {
    id: 'herb_boost_1',
    name: 'Sécateurs Bénis',
    emoji: '🌿',
    cost: 300,
    desc: 'Les Apprentis Herboristes sont 2x plus efficaces.',
    reqWorkshop: { id: 'herbalist', count: 10 },
    effectType: 'workshop_mult',
    targetWorkshop: 'herbalist',
    multiplier: 2
  },
  {
    id: 'mortar_boost_1',
    name: 'Pilon en Acier Trempé',
    emoji: '🪨',
    cost: 2_500,
    desc: 'Les Mortiers en Bronze sont 2x plus efficaces.',
    reqWorkshop: { id: 'mortar', count: 10 },
    effectType: 'workshop_mult',
    targetWorkshop: 'mortar',
    multiplier: 2
  },
  {
    id: 'alembic_boost_1',
    name: 'Serpentin de Glace',
    emoji: '⚗️',
    cost: 35_000,
    reqEssence: { type: 'water', amount: 200 },
    desc: 'Les Alambics de Verre sont 2x plus efficaces.',
    reqWorkshop: { id: 'alembic', count: 10 },
    effectType: 'workshop_mult',
    targetWorkshop: 'alembic',
    multiplier: 2
  },
  {
    id: 'crucible_boost_1',
    name: 'Braise Draconique',
    emoji: '🕯️',
    cost: 450_000,
    reqEssence: { type: 'fire', amount: 500 },
    desc: 'Les Creusets Élémentaires sont 2x plus efficaces.',
    reqWorkshop: { id: 'crucible', count: 10 },
    effectType: 'workshop_mult',
    targetWorkshop: 'crucible',
    multiplier: 2
  },
  {
    id: 'homunculus_boost_1',
    name: 'Élixir de Vigueur',
    emoji: '🧬',
    cost: 6_000_000,
    reqEssence: { type: 'earth', amount: 1_500 },
    desc: 'Les Homoncules travaillent 2x plus vite.',
    reqWorkshop: { id: 'homunculus', count: 10 },
    effectType: 'workshop_mult',
    targetWorkshop: 'homunculus',
    multiplier: 2
  },
  {
    id: 'essence_boost_1',
    name: 'Condensateur de Vapeur',
    emoji: '💧',
    cost: 12_000_000,
    reqEssence: { type: 'water', amount: 3_000 },
    desc: 'Production de toutes les essences élémentaires augmentée de +50%.',
    effectType: 'essence_mult',
    multiplier: 1.5
  },
  {
    id: 'global_boost_1',
    name: 'Catalyseur Universel',
    emoji: '🌟',
    cost: 250_000_000,
    reqEssence: { type: 'fire', amount: 5_000 },
    desc: 'Toute votre production globale de matière est doublée (x2) !',
    effectType: 'global_mult',
    multiplier: 2
  }
];

// ─── CARTE DU CIEL : LES 12 CONSTELLATIONS CÉLESTES (PRESTIGE PROFOND) ────────

export const CONSTELLATIONS: ConstellationDef[] = [
  {
    id: 'eagle',
    name: 'L\'Aigle Céleste',
    emoji: '🦅',
    cost: 1,
    desc: '+15% de production supplémentaire par Goutte d\'Élixir possédée.',
    maxLevel: 15
  },
  {
    id: 'ouroboros',
    name: 'L\'Ouroboros Éternel',
    emoji: '🐉',
    cost: 2,
    desc: 'Conserve 10% de vos Essences Élémentaires après chaque Renaissance.',
    maxLevel: 5
  },
  {
    id: 'golden_lion',
    name: 'Le Lion Doré',
    emoji: '🦁',
    cost: 3,
    desc: 'Les Fées d\'Éther apparaissent 35% plus fréquemment.',
    maxLevel: 5
  },
  {
    id: 'architect',
    name: 'Le Grand Architecte',
    emoji: '🏛️',
    cost: 4,
    desc: 'Réduit le coût en matière de tous les ateliers de 8%.',
    maxLevel: 5
  },
  {
    id: 'phoenix',
    name: 'Le Phénix Immortel',
    emoji: '🔥',
    cost: 6,
    desc: 'La production hors-ligne passe à 100% d\'efficacité (au lieu de 50%).',
    maxLevel: 5
  },
  {
    id: 'zeus_bolt',
    name: 'L\'Éclair de Zeus',
    emoji: '⚡',
    cost: 8,
    desc: '+2% de chance de coup critique permanent par niveau.',
    maxLevel: 10
  },
  {
    id: 'hermetic_scales',
    name: 'La Balance Hermétique',
    emoji: '⚖️',
    cost: 12,
    desc: '+5% de CPS global pour chaque tranche de 50 000 essences en réserve.',
    maxLevel: 5
  },
  {
    id: 'midas_crown',
    name: 'La Couronne de Midas',
    emoji: '👑',
    cost: 18,
    desc: 'Démarre chaque nouvelle vie avec 500 000 matières et 200 de chaque essence.',
    maxLevel: 5
  },
  {
    id: 'orion_nebula',
    name: 'La Nébuleuse d\'Orion',
    emoji: '🌌',
    cost: 25,
    desc: 'Multiplicateur de matière globale x2 permanent.',
    maxLevel: 5
  },
  {
    id: 'chronos_clock',
    name: 'Le Sablier de Chronos',
    emoji: '⏳',
    cost: 35,
    desc: 'La jauge de Fureur Alchimique se remplit 50% plus vite.',
    maxLevel: 3
  },
  {
    id: 'athanor_shield',
    name: 'L\'Égide d\'Athanor',
    emoji: '🛡️',
    cost: 50,
    desc: 'Le bonus du mini-jeu de stabilisation dure deux fois plus longtemps (6 min).',
    maxLevel: 3
  },
  {
    id: 'divine_omega',
    name: 'L\'Oméga Divin',
    emoji: '♾️',
    cost: 100,
    desc: 'Multiplicateur cosmique x5 sur TOUTES les productions de l\'univers.',
    maxLevel: 3
  }
];

// ─── SUCCÈS (ACHIEVEMENTS) ─────────────────────────────────────────────────────

export interface AchievementDef {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  condition: (s: AlchemySave) => boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'c1', name: 'Premier Pilon', emoji: '🔨', desc: 'Cliquez 1 fois sur le chaudron.', condition: (s) => s.totalClicks >= 1 },
  { id: 'c500', name: 'Doigts d\'Acier', emoji: '💪', desc: 'Cliquez 500 fois sur le chaudron.', condition: (s) => s.totalClicks >= 500 },
  { id: 'c5000', name: 'Alchimiste Frénétique', emoji: '🌪️', desc: 'Cliquez 5 000 fois sur le chaudron.', condition: (s) => s.totalClicks >= 5_000 },
  { id: 'm1k', name: 'Petite Bourse', emoji: '🪙', desc: 'Amasser 1 000 matières au total.', condition: (s) => s.lifetimeMatter >= 1_000 },
  { id: 'm1m', name: 'Fortune Dorée', emoji: '💰', desc: 'Amasser 1 Million de matières au total.', condition: (s) => s.lifetimeMatter >= 1_000_000 },
  { id: 'm1b', name: 'Milliardaire Arcanique', emoji: '👑', desc: 'Amasser 1 Milliard de matières au total.', condition: (s) => s.lifetimeMatter >= 1_000_000_000 },
  { id: 'm1t', name: 'Seigneur du Trillion', emoji: '💎', desc: 'Amasser 1 Trillion de matières au total.', condition: (s) => s.lifetimeMatter >= 1e12 },
  { id: 'm1qa', name: 'L\'Ère des Quadrillions', emoji: '🌌', desc: 'Amasser 1 Quadrillion de matières au total.', condition: (s) => s.lifetimeMatter >= 1e15 },
  { id: 'ess1k', name: 'Élémentaliste Novice', emoji: '🧪', desc: 'Générer au moins 1 000 essences élémentaires cumulées.', condition: (s) => (s.totalEssencesEarned?.fire || 0) + (s.totalEssencesEarned?.water || 0) >= 1_000 },
  { id: 'seal1', name: 'Premier Sceau Brisé', emoji: '🪐', desc: 'Forger votre premier Sceau Planétaire.', condition: (s) => (s.seals || []).length >= 1 },
  { id: 'seal7', name: 'Le Maître des 7 Sceaux', emoji: '☀️', desc: 'Réunir les 7 Sceaux Alchimiques.', condition: (s) => (s.seals || []).length >= 7 },
  { id: 'p1', name: 'Le Grand Œuvre Accompli', emoji: '⚗️', desc: 'Réaliser votre première Renaissance (Prestige).', condition: (s) => s.prestigeCount >= 1 },
  { id: 'fury1', name: 'Fureur Déchaînée', emoji: '🔥', desc: 'Déclenchez le mode Fureur Alchimique.', condition: (s) => s.furyTriggeredCount >= 1 },
  { id: 'fairy1', name: 'Chasseur d\'Éther', emoji: '🧚', desc: 'Attrapez une Fée d\'Éther flottante.', condition: (s) => s.fairiesCaught >= 1 }
];

// ─── SAVE STATE INTERFACE ─────────────────────────────────────────────────────

export interface AlchemySave {
  matter: number;
  lifetimeMatter: number;
  totalClicks: number;
  workshops: Record<string, number>;
  upgrades: string[];
  constellations: Record<string, number>;
  seals: string[];
  elixirDrops: number;
  totalElixirEarned: number;
  prestigeCount: number;
  furyTriggeredCount: number;
  fairiesCaught: number;
  achievements: string[];
  lastSaveTime: number;

  // Elemental Essences
  fireEssence: number;
  waterEssence: number;
  earthEssence: number;
  airEssence: number;
  totalEssencesEarned: {
    fire: number;
    water: number;
    earth: number;
    air: number;
  };
}

const DEFAULT_SAVE: AlchemySave = {
  matter: 0,
  lifetimeMatter: 0,
  totalClicks: 0,
  workshops: {},
  upgrades: [],
  constellations: {},
  seals: [],
  elixirDrops: 0,
  totalElixirEarned: 0,
  prestigeCount: 0,
  furyTriggeredCount: 0,
  fairiesCaught: 0,
  achievements: [],
  lastSaveTime: Date.now(),
  fireEssence: 0,
  waterEssence: 0,
  earthEssence: 0,
  airEssence: 0,
  totalEssencesEarned: {
    fire: 0,
    water: 0,
    earth: 0,
    air: 0
  }
};

const STORAGE_KEY = 'alchimiste_supreme_save_v2';

// ─── LARGE NUMBER FORMATTER ───────────────────────────────────────────────────

const SUFFIXES = [
  '', 'K', 'M', 'Mrd', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 
  'Dc', 'Ud', 'Dd', 'Td', 'Qad', 'Qid', 'Sxd', 'Spd', 'Ocd', 'Nod', 'Vg'
];

export function formatNumber(num: number): string {
  if (num === null || num === undefined || isNaN(num)) return '0';
  if (num < 1000) {
    return num.toLocaleString('fr-FR', { maximumFractionDigits: 1 });
  }

  const exp = Math.floor(Math.log10(Math.abs(num)) / 3);
  if (exp < SUFFIXES.length) {
    const val = num / Math.pow(10, exp * 3);
    return `${val.toFixed(2)} ${SUFFIXES[exp]}`;
  }

  return num.toExponential(2).replace('e+', 'e');
}

// ─── COMPOSANT PRINCIPAL ──────────────────────────────────────────────────────

export default function AlchemyApp() {
  const navigate = useNavigate();

  // Core Game State with safe migration
  const [save, setSave] = useState<AlchemySave>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('alchimiste_supreme_save_v1');
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...DEFAULT_SAVE,
          ...parsed,
          seals: parsed.seals || [],
          constellations: parsed.constellations || {},
          totalEssencesEarned: {
            fire: parsed.totalEssencesEarned?.fire || 0,
            water: parsed.totalEssencesEarned?.water || 0,
            earth: parsed.totalEssencesEarned?.earth || 0,
            air: parsed.totalEssencesEarned?.air || 0,
          }
        };
      }
    } catch (e) {
      console.error('Error loading save:', e);
    }
    return DEFAULT_SAVE;
  });

  // Ephemeral Real-Time States
  const [furyGauge, setFuryGauge] = useState(0); // 0 to 100
  const [isFuryActive, setIsFuryActive] = useState(false);
  const [furyTimer, setFuryTimer] = useState(0);

  const [feverActive, setFeverActive] = useState(false);
  const [feverTimer, setFeverTimer] = useState(0);

  // Athanor Heat Stabilization Boost
  const [athanorBoostActive, setAthanorBoostActive] = useState(false);
  const [athanorBoostTimer, setAthanorBoostTimer] = useState(0);
  const [athanorCooldown, setAthanorCooldown] = useState(0);

  const [buyMultiplier, setBuyMultiplier] = useState<1 | 10 | 100 | 'MAX'>(1);
  const [activeTab, setActiveTab] = useState<'workshops' | 'grimoire' | 'seals' | 'constellations' | 'achievements'>('workshops');

  const [cauldronSquish, setCauldronSquish] = useState(false);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [goldenSprites, setGoldenSprites] = useState<GoldenSprite[]>([]);

  // Modals
  const [showAthanorModal, setShowAthanorModal] = useState(false);
  const [athanorSliderPos, setAthanorSliderPos] = useState(50);
  const [athanorMovingDir, setAthanorMovingDir] = useState(1);

  const [offlineModalData, setOfflineModalData] = useState<{ seconds: number; earned: number } | null>(null);
  const [showPrestigeModal, setShowPrestigeModal] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [importSaveInput, setImportSaveInput] = useState('');
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  const cauldronRef = useRef<HTMLDivElement | null>(null);

  // ─── COMPUTED STATS ──────────────────────────────────────────────────────────

  // Current Transmutation Era based on lifetime matter
  const currentEra = useMemo(() => {
    let active = ALCHEMY_ERAS[0];
    for (const era of ALCHEMY_ERAS) {
      if (save.lifetimeMatter >= era.threshold) {
        // Special case for Philosopher\'s Stone: requires 7 seals!
        if (era.id === 11 && (save.seals || []).length < 7) {
          continue;
        }
        active = era;
      }
    }
    return active;
  }, [save.lifetimeMatter, save.seals]);

  const nextEra = useMemo(() => {
    const idx = ALCHEMY_ERAS.findIndex(e => e.id === currentEra.id);
    return ALCHEMY_ERAS[idx + 1] || null;
  }, [currentEra]);

  // Constellations Bonuses
  const constellationBonuses = useMemo(() => {
    let elixirDropBonusPct = 0;
    let essencePreservePct = 0;
    let fairyChanceMult = 1;
    let costReductionPct = 0;
    let offlineRatio = 0.5;
    let critChanceBonus = 0;
    let essenceReserveScale = 0;
    let globalMult = 1;
    let furySpeedMult = 1;
    let athanorDurationMult = 1;

    for (const c of CONSTELLATIONS) {
      const lvl = save.constellations[c.id] || 0;
      if (lvl > 0) {
        if (c.id === 'eagle') elixirDropBonusPct += lvl * 0.15;
        if (c.id === 'ouroboros') essencePreservePct += lvl * 0.10;
        if (c.id === 'golden_lion') fairyChanceMult += lvl * 0.35;
        if (c.id === 'architect') costReductionPct += lvl * 0.08;
        if (c.id === 'phoenix') offlineRatio = Math.min(1.0, 0.5 + lvl * 0.1);
        if (c.id === 'zeus_bolt') critChanceBonus += lvl * 0.02;
        if (c.id === 'hermetic_scales') essenceReserveScale += lvl * 0.05;
        if (c.id === 'orion_nebula') globalMult *= Math.pow(2, lvl);
        if (c.id === 'chronos_clock') furySpeedMult += lvl * 0.5;
        if (c.id === 'athanor_shield') athanorDurationMult += lvl * 0.33;
        if (c.id === 'divine_omega') globalMult *= Math.pow(5, lvl);
      }
    }

    return {
      elixirDropBonusPct,
      essencePreservePct: Math.min(0.5, essencePreservePct),
      fairyChanceMult,
      costReductionPct: Math.min(0.4, costReductionPct),
      offlineRatio,
      critChanceBonus,
      essenceReserveScale,
      globalMult,
      furySpeedMult,
      athanorDurationMult
    };
  }, [save.constellations]);

  // Prestige multiplier (+10% per drop + eagle constellation)
  const prestigeMultiplier = useMemo(() => {
    const pctPerDrop = 0.10 + constellationBonuses.elixirDropBonusPct;
    return 1 + save.elixirDrops * pctPerDrop;
  }, [save.elixirDrops, constellationBonuses.elixirDropBonusPct]);

  // Essence Reserve Bonus
  const totalEssencesInReserve = save.fireEssence + save.waterEssence + save.earthEssence + save.airEssence;
  const essenceReserveMultiplier = useMemo(() => {
    if (constellationBonuses.essenceReserveScale <= 0) return 1;
    const slices = Math.floor(totalEssencesInReserve / 50_000);
    return 1 + slices * constellationBonuses.essenceReserveScale;
  }, [totalEssencesInReserve, constellationBonuses.essenceReserveScale]);

  // Seals multipliers
  const sealsMultiplier = useMemo(() => {
    let mult = 1;
    if (save.seals.includes('seal_lead')) mult *= 1.15;
    if (save.seals.includes('seal_gold')) mult *= 2.0;
    return mult;
  }, [save.seals]);

  // Base and upgraded CPS
  const totalCps = useMemo(() => {
    let cps = 0;

    for (const def of WORKSHOPS) {
      const count = save.workshops[def.id] || 0;
      if (count > 0) {
        let milestoneMult = 1;
        if (count >= 25) milestoneMult *= 1.5;
        if (count >= 50) milestoneMult *= 1.5;
        if (count >= 100) milestoneMult *= 2;
        if (count >= 150) milestoneMult *= 1.5;
        if (count >= 200) milestoneMult *= 3;
        if (count >= 250) milestoneMult *= 2;
        if (count >= 300) milestoneMult *= 5;

        // Upgrade multipliers
        let upgradeMult = 1;
        for (const upId of save.upgrades) {
          const up = UPGRADES.find(u => u.id === upId);
          if (up && up.effectType === 'workshop_mult' && up.targetWorkshop === def.id) {
            upgradeMult *= up.multiplier || 1;
          }
        }

        if (save.seals.includes('seal_iron') && (def.id === 'crucible' || def.id === 'dragon_forge')) {
          upgradeMult *= 1.5;
        }

        cps += count * def.baseCps * milestoneMult * upgradeMult;
      }
    }

    // Global upgrades
    for (const upId of save.upgrades) {
      const up = UPGRADES.find(u => u.id === upId);
      if (up && up.effectType === 'global_mult') {
        cps *= up.multiplier || 1;
      }
    }

    // Era multiplier
    cps *= currentEra.multiplier;

    // Prestige & Constellations
    cps *= prestigeMultiplier;
    cps *= constellationBonuses.globalMult;
    cps *= essenceReserveMultiplier;
    cps *= sealsMultiplier;

    // Achievements (+1.5% per achievement)
    cps *= (1 + save.achievements.length * 0.015);

    // Dynamic Frenzies
    if (isFuryActive) cps *= 2.5;
    if (feverActive) cps *= 5;
    if (athanorBoostActive) cps *= 2.0;

    return cps;
  }, [save.workshops, save.upgrades, currentEra, prestigeMultiplier, constellationBonuses, essenceReserveMultiplier, sealsMultiplier, save.achievements, isFuryActive, feverActive, athanorBoostActive, save.seals]);

  // Click power calculation
  const clickPower = useMemo(() => {
    let base = 1;

    for (const upId of save.upgrades) {
      const up = UPGRADES.find(u => u.id === upId);
      if (up && up.effectType === 'click_flat') {
        base *= up.multiplier || 1;
      }
    }

    if (save.seals.includes('seal_tin')) {
      base *= 3.0;
    }

    // Era modest scaling
    base *= Math.sqrt(currentEra.multiplier);

    // Synergy with CPS (carefully calibrated to 0.0001 - 0.0003)
    let cpsPct = 0;
    for (const upId of save.upgrades) {
      const up = UPGRADES.find(u => u.id === upId);
      if (up && up.effectType === 'click_cps_pct') {
        cpsPct += up.percent || 0;
      }
    }
    base += totalCps * cpsPct;

    base *= prestigeMultiplier;
    base *= constellationBonuses.globalMult;

    if (isFuryActive) base *= 3.5;
    if (feverActive) base *= 5;

    return Math.max(1, base);
  }, [save.upgrades, save.seals, currentEra, totalCps, prestigeMultiplier, constellationBonuses, isFuryActive, feverActive]);

  // Critical strike chance and multiplier
  const { critChance, critMultiplier } = useMemo(() => {
    let chance = 0.04 + constellationBonuses.critChanceBonus;
    let mult = 5;

    for (const upId of save.upgrades) {
      const up = UPGRADES.find(u => u.id === upId);
      if (up && up.effectType === 'crit_chance') {
        chance += up.percent || 0;
      }
      if (up && up.effectType === 'crit_mult') {
        mult = Math.max(mult, up.multiplier || mult);
      }
    }

    if (save.seals.includes('seal_silver')) {
      chance += 0.05;
      mult *= 2;
    }

    return { critChance: Math.min(0.60, chance), critMultiplier: mult };
  }, [save.upgrades, constellationBonuses.critChanceBonus, save.seals]);

  // Essence generation rates per second
  const essenceRates = useMemo(() => {
    const rates: Record<EssenceType, number> = { fire: 0, water: 0, earth: 0, air: 0 };

    for (const def of WORKSHOPS) {
      const count = save.workshops[def.id] || 0;
      if (count > 0 && def.producesEssence && def.essenceRate) {
        rates[def.producesEssence] += count * def.essenceRate;
      }
    }

    // Upgrades & Seals
    let mult = 1;
    for (const upId of save.upgrades) {
      const up = UPGRADES.find(u => u.id === upId);
      if (up && up.effectType === 'essence_mult') {
        mult *= up.multiplier || 1;
      }
    }

    if (save.seals.includes('seal_mercury')) mult *= 1.25;

    rates.fire *= mult;
    rates.water *= mult;
    rates.earth *= mult;
    rates.air *= mult;

    if (save.seals.includes('seal_lead')) rates.earth *= 1.30;
    if (athanorBoostActive) {
      rates.fire *= 1.5;
      rates.water *= 1.5;
      rates.earth *= 1.5;
      rates.air *= 1.5;
    }

    return rates;
  }, [save.workshops, save.upgrades, save.seals, athanorBoostActive]);

  // Potential Elixir Drops earned on Rebirth (Seuil : 10 Trillions / 1e13)
  const PRESTIGE_THRESHOLD = 10_000_000_000_000; // 10 Trillions
  const pendingElixirDrops = useMemo(() => {
    if (save.lifetimeMatter < PRESTIGE_THRESHOLD) return 0;
    // Paced Fourth-root formula
    const totalPotential = Math.floor(Math.pow(save.lifetimeMatter / PRESTIGE_THRESHOLD, 0.35));
    return Math.max(0, totalPotential - save.totalElixirEarned);
  }, [save.lifetimeMatter, save.totalElixirEarned]);

  // ─── OFFLINE PROGRESS & INITIAL LOAD ─────────────────────────────────────────

  useEffect(() => {
    const now = Date.now();
    const elapsedSeconds = Math.floor((now - save.lastSaveTime) / 1000);

    if (elapsedSeconds > 15 && totalCps > 0) {
      const earned = Math.floor(elapsedSeconds * totalCps * constellationBonuses.offlineRatio);
      const earthEarned = Math.floor(elapsedSeconds * essenceRates.earth * constellationBonuses.offlineRatio);
      const waterEarned = Math.floor(elapsedSeconds * essenceRates.water * constellationBonuses.offlineRatio);
      const fireEarned = Math.floor(elapsedSeconds * essenceRates.fire * constellationBonuses.offlineRatio);
      const airEarned = Math.floor(elapsedSeconds * essenceRates.air * constellationBonuses.offlineRatio);

      if (earned > 0) {
        setSave(prev => ({
          ...prev,
          matter: prev.matter + earned,
          lifetimeMatter: prev.lifetimeMatter + earned,
          earthEssence: prev.earthEssence + earthEarned,
          waterEssence: prev.waterEssence + waterEarned,
          fireEssence: prev.fireEssence + fireEarned,
          airEssence: prev.airEssence + airEarned,
          totalEssencesEarned: {
            fire: prev.totalEssencesEarned.fire + fireEarned,
            water: prev.totalEssencesEarned.water + waterEarned,
            earth: prev.totalEssencesEarned.earth + earthEarned,
            air: prev.totalEssencesEarned.air + airEarned,
          },
          lastSaveTime: now
        }));
        setOfflineModalData({ seconds: elapsedSeconds, earned });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── AUTOSAVE & CPS TICK LOOP (10 TICKS / SEC) ──────────────────────────────

  useEffect(() => {
    const interval = setInterval(() => {
      setSave(prev => {
        const addedMatter = totalCps / 10;
        const addedFire = essenceRates.fire / 10;
        const addedWater = essenceRates.water / 10;
        const addedEarth = essenceRates.earth / 10;
        const addedAir = essenceRates.air / 10;

        const newMatter = prev.matter + addedMatter;
        const newLifetime = prev.lifetimeMatter + addedMatter;

        // Auto-check Seals
        const currentSeals = prev.seals || [];
        const newlyUnlockedSeals: string[] = [];
        const draftSave: AlchemySave = {
          ...prev,
          matter: newMatter,
          lifetimeMatter: newLifetime,
          totalEssencesEarned: {
            fire: prev.totalEssencesEarned.fire + addedFire,
            water: prev.totalEssencesEarned.water + addedWater,
            earth: prev.totalEssencesEarned.earth + addedEarth,
            air: prev.totalEssencesEarned.air + addedAir,
          }
        };

        for (const seal of SACRED_SEALS) {
          if (!currentSeals.includes(seal.id) && seal.isUnlocked(draftSave)) {
            newlyUnlockedSeals.push(seal.id);
          }
        }

        if (newlyUnlockedSeals.length > 0) {
          soundFx.victory();
          const first = SACRED_SEALS.find(s => s.id === newlyUnlockedSeals[0]);
          if (first) {
            triggerNotification(`🪐 Sceau Forgé : ${first.name} (${first.planet}) !`);
          }
        }

        // Check new achievements
        const newlyUnlockedAch: string[] = [];
        for (const ach of ACHIEVEMENTS) {
          if (!prev.achievements.includes(ach.id) && ach.condition(draftSave)) {
            newlyUnlockedAch.push(ach.id);
          }
        }

        if (newlyUnlockedAch.length > 0) {
          soundFx.victory();
          const firstAch = ACHIEVEMENTS.find(a => a.id === newlyUnlockedAch[0]);
          if (firstAch) {
            triggerNotification(`🏆 Succès Débloqué : ${firstAch.name} !`);
          }
        }

        return {
          ...prev,
          matter: newMatter,
          lifetimeMatter: newLifetime,
          fireEssence: prev.fireEssence + addedFire,
          waterEssence: prev.waterEssence + addedWater,
          earthEssence: prev.earthEssence + addedEarth,
          airEssence: prev.airEssence + addedAir,
          totalEssencesEarned: draftSave.totalEssencesEarned,
          seals: [...currentSeals, ...newlyUnlockedSeals],
          achievements: [...prev.achievements, ...newlyUnlockedAch],
          lastSaveTime: Date.now()
        };
      });
    }, 100);

    return () => clearInterval(interval);
  }, [totalCps, essenceRates]);

  // Periodic Save to localStorage
  useEffect(() => {
    const saveInterval = setInterval(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
      } catch (e) {
        console.error('Save error:', e);
      }
    }, 3000);

    return () => clearInterval(saveInterval);
  }, [save]);

  // Timers: Fury, Fever, Athanor
  useEffect(() => {
    const timer = setInterval(() => {
      if (isFuryActive) {
        setFuryTimer(prev => {
          if (prev <= 1) {
            setIsFuryActive(false);
            setFuryGauge(0);
            return 0;
          }
          return prev - 1;
        });
      } else {
        setFuryGauge(prev => Math.max(0, prev - 1.5));
      }

      if (feverActive) {
        setFeverTimer(prev => {
          if (prev <= 1) {
            setFeverActive(false);
            return 0;
          }
          return prev - 1;
        });
      }

      if (athanorBoostActive) {
        setAthanorBoostTimer(prev => {
          if (prev <= 1) {
            setAthanorBoostActive(false);
            return 0;
          }
          return prev - 1;
        });
      }

      if (athanorCooldown > 0) {
        setAthanorCooldown(prev => Math.max(0, prev - 1));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isFuryActive, feverActive, athanorBoostActive, athanorCooldown]);

  // Athanor Gauge Animation inside modal
  useEffect(() => {
    if (!showAthanorModal) return;
    const gaugeInterval = setInterval(() => {
      setAthanorSliderPos(prev => {
        let next = prev + athanorMovingDir * 3;
        if (next >= 95) {
          setAthanorMovingDir(-1);
          return 95;
        }
        if (next <= 5) {
          setAthanorMovingDir(1);
          return 5;
        }
        return next;
      });
    }, 30);

    return () => clearInterval(gaugeInterval);
  }, [showAthanorModal, athanorMovingDir]);

  // Golden Sprite Spawner
  useEffect(() => {
    const spawnTimer = setInterval(() => {
      const baseChance = 0.35 * constellationBonuses.fairyChanceMult;
      if (Math.random() < baseChance && goldenSprites.length === 0) {
        const roll = Math.random();
        const type: 'frenzy' | 'wealth' | 'essence' = roll < 0.35 ? 'frenzy' : (roll < 0.70 ? 'wealth' : 'essence');
        const newSprite: GoldenSprite = {
          id: Math.random().toString(),
          x: 10 + Math.random() * 80,
          y: 20 + Math.random() * 60,
          vx: (Math.random() - 0.5) * 1.5,
          vy: (Math.random() - 0.5) * 1.5,
          type,
          duration: 15
        };
        setGoldenSprites([newSprite]);
      }
    }, 45_000);

    return () => clearInterval(spawnTimer);
  }, [goldenSprites.length, constellationBonuses.fairyChanceMult]);

  // Move Golden Sprites
  useEffect(() => {
    if (goldenSprites.length === 0) return;
    const moveTimer = setInterval(() => {
      setGoldenSprites(prev =>
        prev
          .map(s => ({
            ...s,
            x: Math.max(5, Math.min(95, s.x + s.vx)),
            y: Math.max(10, Math.min(90, s.y + s.vy)),
            duration: s.duration - 0.2
          }))
          .filter(s => s.duration > 0)
      );
    }, 200);

    return () => clearInterval(moveTimer);
  }, [goldenSprites]);

  // ─── ACTIONS & GAMEPLAY ──────────────────────────────────────────────────────

  const triggerNotification = (msg: string) => {
    setNotificationMsg(msg);
    setTimeout(() => setNotificationMsg(null), 3500);
  };

  const handleCauldronClick = (e: React.MouseEvent) => {
    const isCrit = Math.random() < critChance;
    const gain = isCrit ? clickPower * critMultiplier : clickPower;

    setCauldronSquish(true);
    setTimeout(() => setCauldronSquish(false), 90);

    if (isCrit) {
      soundFx.attack();
    } else {
      soundFx.click();
    }

    const rect = cauldronRef.current?.getBoundingClientRect();
    const clickX = e.clientX - (rect?.left || 0);
    const clickY = e.clientY - (rect?.top || 0);

    spawnFloatingText(
      clickX,
      clickY,
      isCrit ? `CRITIQUE ! +${formatNumber(gain)}` : `+${formatNumber(gain)}`,
      isCrit ? '#fbbf24' : '#e2e8f0',
      isCrit
    );

    spawnSplashParticles(clickX, clickY, currentEra.liquidColor, isCrit ? 12 : 6);

    // Chance to drop random raw essences on click (2%)
    let dropEarth = 0;
    let dropFire = 0;
    let dropWater = 0;
    let dropAir = 0;
    if (Math.random() < 0.05) {
      const essences: EssenceType[] = ['fire', 'water', 'earth', 'air'];
      const picked = essences[Math.floor(Math.random() * essences.length)];
      if (picked === 'fire') dropFire = 1;
      if (picked === 'water') dropWater = 1;
      if (picked === 'earth') dropEarth = 1;
      if (picked === 'air') dropAir = 1;
    }

    // Advance Fury
    if (!isFuryActive) {
      setFuryGauge(prev => {
        const next = prev + 3.5 * constellationBonuses.furySpeedMult;
        if (next >= 100) {
          const furyDuration = 15 + (save.seals.includes('seal_copper') ? 8 : 0);
          setIsFuryActive(true);
          setFuryTimer(furyDuration);
          soundFx.victory();
          triggerNotification(`🔥 FUREUR ALCHIMIQUE ACTIVÉE ! Clics x3.5 pendant ${furyDuration}s !`);
          setSave(s => ({ ...s, furyTriggeredCount: s.furyTriggeredCount + 1 }));
          return 100;
        }
        return next;
      });
    }

    setSave(prev => ({
      ...prev,
      matter: prev.matter + gain,
      lifetimeMatter: prev.lifetimeMatter + gain,
      totalClicks: prev.totalClicks + 1,
      fireEssence: prev.fireEssence + dropFire,
      waterEssence: prev.waterEssence + dropWater,
      earthEssence: prev.earthEssence + dropEarth,
      airEssence: prev.airEssence + dropAir,
      totalEssencesEarned: {
        fire: prev.totalEssencesEarned.fire + dropFire,
        water: prev.totalEssencesEarned.water + dropWater,
        earth: prev.totalEssencesEarned.earth + dropEarth,
        air: prev.totalEssencesEarned.air + dropAir,
      }
    }));
  };

  const spawnFloatingText = (x: number, y: number, text: string, color: string, isCrit: boolean = false) => {
    const id = Math.random().toString();
    setFloatingTexts(prev => [...prev, { id, x, y, text, color, life: 1.0, isCrit }]);
  };

  const spawnSplashParticles = (x: number, y: number, color: string, count: number = 8) => {
    const newPts: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 20 + Math.random() * 60;
      newPts.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 15,
        color,
        size: 2 + Math.random() * 4,
        life: 0.5,
        maxLife: 0.5
      });
    }
    setParticles(prev => [...prev, ...newPts]);
  };

  // Particles animation
  useEffect(() => {
    let animId: number;
    let last = performance.now();

    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;

      setParticles(prev =>
        prev
          .map(p => ({
            ...p,
            x: p.x + p.vx * dt,
            y: p.y + p.vy * dt,
            vy: p.vy + 120 * dt,
            life: p.life - dt
          }))
          .filter(p => p.life > 0)
      );

      setFloatingTexts(prev =>
        prev
          .map(ft => ({
            ...ft,
            y: ft.y - 30 * dt,
            life: ft.life - dt * 1.3
          }))
          .filter(ft => ft.life > 0)
      );

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Catch Golden Sprite
  const handleCatchSprite = (sprite: GoldenSprite) => {
    soundFx.victory();
    setSave(s => ({ ...s, fairiesCaught: s.fairiesCaught + 1 }));

    if (sprite.type === 'frenzy') {
      setFeverActive(true);
      setFeverTimer(30);
      triggerNotification('🧚 FIÈVRE D\'ÉTHER ! Production globale x5 pendant 30s !');
    } else if (sprite.type === 'wealth') {
      const instantWealth = Math.max(50_000, totalCps * 450); // 7.5 minutes of CPS
      setSave(s => ({
        ...s,
        matter: s.matter + instantWealth,
        lifetimeMatter: s.lifetimeMatter + instantWealth
      }));
      triggerNotification(`🪙 Trésor Dérobé : +${formatNumber(instantWealth)} Matières !`);
    } else {
      // Essence burst
      const burst = 200 + Math.floor(Math.random() * 300);
      setSave(s => ({
        ...s,
        fireEssence: s.fireEssence + burst,
        waterEssence: s.waterEssence + burst,
        earthEssence: s.earthEssence + burst,
        airEssence: s.airEssence + burst,
        totalEssencesEarned: {
          fire: s.totalEssencesEarned.fire + burst,
          water: s.totalEssencesEarned.water + burst,
          earth: s.totalEssencesEarned.earth + burst,
          air: s.totalEssencesEarned.air + burst,
        }
      }));
      triggerNotification(`✨ Pluie d\'Essences : +${burst} de chaque élément !`);
    }

    setGoldenSprites(prev => prev.filter(s => s.id !== sprite.id));
  };

  // ─── ATHANOR HEAT STABILIZATION MINI-GAME ───────────────────────────────────

  const handleOpenAthanorModal = () => {
    if (athanorCooldown > 0) return;
    soundFx.click();
    setShowAthanorModal(true);
  };

  const handleValidateAthanor = () => {
    setShowAthanorModal(false);
    setAthanorCooldown(180); // 3 minutes cooldown

    // Optimal green zone is between 38% and 62%
    const dist = Math.abs(athanorSliderPos - 50);
    if (dist <= 12) {
      // Perfect stabilization
      soundFx.victory();
      const boostDuration = Math.round(180 * constellationBonuses.athanorDurationMult);
      setAthanorBoostActive(true);
      setAthanorBoostTimer(boostDuration);

      const essenceBurst = 150;
      setSave(s => ({
        ...s,
        fireEssence: s.fireEssence + essenceBurst,
        waterEssence: s.waterEssence + essenceBurst,
        earthEssence: s.earthEssence + essenceBurst,
        airEssence: s.airEssence + essenceBurst,
        totalEssencesEarned: {
          fire: s.totalEssencesEarned.fire + essenceBurst,
          water: s.totalEssencesEarned.water + essenceBurst,
          earth: s.totalEssencesEarned.earth + essenceBurst,
          air: s.totalEssencesEarned.air + essenceBurst,
        }
      }));
      triggerNotification(`🎯 RENDEMENT PARFAIT ! Production x2 & Essences x1.5 pendant ${Math.floor(boostDuration / 60)} min !`);
    } else if (dist <= 25) {
      // Partial success
      soundFx.heal();
      setAthanorBoostActive(true);
      setAthanorBoostTimer(60);
      triggerNotification('⚖️ Stabilisation réussie : Production x1.5 pendant 1 min.');
    } else {
      soundFx.shield();
      triggerNotification('⚠️ Température instable : Pression évacuée sans dommage.');
    }
  };

  // ─── WORKSHOPS PURCHASE (WITH ESSENCE REQUIREMENTS) ──────────────────────────

  const getDiscountedCost = (base: number) => {
    return Math.floor(base * (1 - constellationBonuses.costReductionPct));
  };

  const getWorkshopCost = (def: WorkshopDef, currentCount: number, amount: number): number => {
    let total = 0;
    const discountedBase = getDiscountedCost(def.baseCost);
    for (let i = 0; i < amount; i++) {
      total += discountedBase * Math.pow(1.15, currentCount + i);
    }
    return Math.floor(total);
  };

  const hasRequiredEssences = (def: WorkshopDef, amount: number = 1): boolean => {
    if (!def.reqEssences || def.reqEssences.length === 0) return true;
    for (const req of def.reqEssences) {
      const needed = req.amount * amount;
      if (req.type === 'fire' && save.fireEssence < needed) return false;
      if (req.type === 'water' && save.waterEssence < needed) return false;
      if (req.type === 'earth' && save.earthEssence < needed) return false;
      if (req.type === 'air' && save.airEssence < needed) return false;
    }
    return true;
  };

  const handleBuyWorkshop = (def: WorkshopDef) => {
    const current = save.workshops[def.id] || 0;
    let amountToBuy = 1;

    if (buyMultiplier === 'MAX') {
      // Find maximum affordable by matter & essences
      let count = 0;
      let costAcc = 0;
      const discountedBase = getDiscountedCost(def.baseCost);

      while (true) {
        const nextCost = discountedBase * Math.pow(1.15, current + count);
        if (costAcc + nextCost > save.matter) break;
        if (!hasRequiredEssences(def, count + 1)) break;
        costAcc += nextCost;
        count++;
        if (count >= 100) break;
      }
      amountToBuy = count;
    } else {
      amountToBuy = buyMultiplier;
    }

    if (amountToBuy <= 0) {
      soundFx.shield();
      return;
    }

    const cost = getWorkshopCost(def, current, amountToBuy);
    const hasEss = hasRequiredEssences(def, amountToBuy);

    if (save.matter >= cost && hasEss) {
      soundFx.playCard();

      // Deduct essences
      let dFire = 0, dWater = 0, dEarth = 0, dAir = 0;
      if (def.reqEssences) {
        for (const req of def.reqEssences) {
          const totalReq = req.amount * amountToBuy;
          if (req.type === 'fire') dFire += totalReq;
          if (req.type === 'water') dWater += totalReq;
          if (req.type === 'earth') dEarth += totalReq;
          if (req.type === 'air') dAir += totalReq;
        }
      }

      setSave(prev => ({
        ...prev,
        matter: prev.matter - cost,
        fireEssence: prev.fireEssence - dFire,
        waterEssence: prev.waterEssence - dWater,
        earthEssence: prev.earthEssence - dEarth,
        airEssence: prev.airEssence - dAir,
        workshops: {
          ...prev.workshops,
          [def.id]: (prev.workshops[def.id] || 0) + amountToBuy
        }
      }));
    } else {
      soundFx.shield();
    }
  };

  // ─── UPGRADES PURCHASE ──────────────────────────────────────────────────────

  const handleBuyUpgrade = (up: UpgradeDef) => {
    const hasMatter = save.matter >= up.cost;
    let hasEssence = true;
    if (up.reqEssence) {
      if (up.reqEssence.type === 'fire' && save.fireEssence < up.reqEssence.amount) hasEssence = false;
      if (up.reqEssence.type === 'water' && save.waterEssence < up.reqEssence.amount) hasEssence = false;
      if (up.reqEssence.type === 'earth' && save.earthEssence < up.reqEssence.amount) hasEssence = false;
      if (up.reqEssence.type === 'air' && save.airEssence < up.reqEssence.amount) hasEssence = false;
    }

    if (hasMatter && hasEssence && !save.upgrades.includes(up.id)) {
      soundFx.heal();

      let dFire = 0, dWater = 0, dEarth = 0, dAir = 0;
      if (up.reqEssence) {
        if (up.reqEssence.type === 'fire') dFire = up.reqEssence.amount;
        if (up.reqEssence.type === 'water') dWater = up.reqEssence.amount;
        if (up.reqEssence.type === 'earth') dEarth = up.reqEssence.amount;
        if (up.reqEssence.type === 'air') dAir = up.reqEssence.amount;
      }

      setSave(prev => ({
        ...prev,
        matter: prev.matter - up.cost,
        fireEssence: prev.fireEssence - dFire,
        waterEssence: prev.waterEssence - dWater,
        earthEssence: prev.earthEssence - dEarth,
        airEssence: prev.airEssence - dAir,
        upgrades: [...prev.upgrades, up.id]
      }));
      triggerNotification(`✨ Grimoire Appris : "${up.name}" !`);
    } else {
      soundFx.shield();
    }
  };

  // ─── CONSTELLATION PURCHASE (PRESTIGE TREE) ─────────────────────────────────

  const handleBuyConstellation = (c: ConstellationDef) => {
    const lvl = save.constellations[c.id] || 0;
    const cost = c.cost * (lvl + 1);

    if (lvl < c.maxLevel && save.elixirDrops >= cost) {
      soundFx.victory();
      setSave(prev => ({
        ...prev,
        elixirDrops: prev.elixirDrops - cost,
        constellations: {
          ...prev.constellations,
          [c.id]: lvl + 1
        }
      }));
      triggerNotification(`🌌 Constellation Illuminée : "${c.name}" Nv. ${lvl + 1} !`);
    } else {
      soundFx.shield();
    }
  };

  // ─── PRESTIGE (LE GRAND ŒUVRE) ──────────────────────────────────────────────

  const handlePrestigeRebirth = () => {
    if (pendingElixirDrops <= 0) return;
    soundFx.victory();

    const newTotalDrops = save.elixirDrops + pendingElixirDrops;
    const newTotalEarned = save.totalElixirEarned + pendingElixirDrops;

    const midasLevel = save.constellations['midas_crown'] || 0;
    const startingMatter = midasLevel * 500_000;
    const startEssenceBonus = midasLevel * 200;

    const preserveRatio = constellationBonuses.essencePreservePct;

    setSave(prev => ({
      ...prev,
      matter: startingMatter,
      lifetimeMatter: startingMatter,
      fireEssence: Math.floor(prev.fireEssence * preserveRatio) + startEssenceBonus,
      waterEssence: Math.floor(prev.waterEssence * preserveRatio) + startEssenceBonus,
      earthEssence: Math.floor(prev.earthEssence * preserveRatio) + startEssenceBonus,
      airEssence: Math.floor(prev.airEssence * preserveRatio) + startEssenceBonus,
      workshops: {},
      upgrades: [],
      elixirDrops: newTotalDrops,
      totalElixirEarned: newTotalEarned,
      prestigeCount: prev.prestigeCount + 1,
      lastSaveTime: Date.now()
    }));

    setShowPrestigeModal(false);
    triggerNotification(`⚗️ RENAISSANCE DU GRAND ŒUVRE ! +${pendingElixirDrops} Gouttes d\'Élixir d\'Immortalité !`);
  };

  // ─── EXPORT / IMPORT SAVE ───────────────────────────────────────────────────

  const handleExportSave = () => {
    const str = btoa(JSON.stringify(save));
    navigator.clipboard.writeText(str);
    triggerNotification('📋 Sauvegarde copiée dans votre presse-papier !');
  };

  const handleImportSave = () => {
    try {
      const parsed = JSON.parse(atob(importSaveInput.trim()));
      if (parsed && typeof parsed.lifetimeMatter === 'number') {
        setSave({ ...DEFAULT_SAVE, ...parsed });
        setShowOptionsModal(false);
        setImportSaveInput('');
        triggerNotification('✅ Partie restaurée avec succès !');
      } else {
        alert('Code de sauvegarde invalide.');
      }
    } catch (e) {
      alert('Erreur lors du déchiffrement de la sauvegarde.');
    }
  };

  const handleHardReset = () => {
    if (confirm('⚠️ Voulez-vous VRAIMENT réinitialiser TOUTE votre progression alchimique ? Cette action est irréversible !')) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem('alchimiste_supreme_save_v1');
      setSave(DEFAULT_SAVE);
      setShowOptionsModal(false);
      triggerNotification('🔄 Jeu réinitialisé à zéro.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-x-hidden">
      {/* ─── HEADER BAR ──────────────────────────────────────────────────────── */}
      <header className="bg-slate-900/95 border-b border-slate-800 px-4 py-3 flex items-center justify-between shadow-2xl sticky top-0 z-40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              soundFx.click();
              navigate('/');
            }}
            className="btn-3d text-xs py-1.5 px-3 rounded-lg text-slate-300 hover:text-white cursor-pointer"
          >
            ← Accueil
          </button>
          <div className="flex items-center gap-2">
            <span className="text-2xl animate-bounce">⚗️</span>
            <div>
              <h1 className="font-extrabold text-sm tracking-wide text-white uppercase flex items-center gap-2">
                <span>L\'Alchimiste Suprême</span>
                <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded font-mono">
                  SOLO IDLE ♾️
                </span>
              </h1>
              <div className="text-[10px] text-slate-400 font-serif">
                Ère : <span className="text-amber-400 font-bold">{currentEra.name}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right header tools */}
        <div className="flex items-center gap-2">
          {/* Athanor Heat Regulator Button */}
          <button
            onClick={handleOpenAthanorModal}
            disabled={athanorCooldown > 0}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer shadow ${
              athanorBoostActive
                ? 'bg-amber-500 text-slate-950 border-white animate-pulse'
                : athanorCooldown > 0
                ? 'bg-slate-950 text-slate-500 border-slate-800 cursor-not-allowed'
                : 'bg-slate-850 hover:bg-slate-800 text-orange-300 border-orange-500/40'
            }`}
          >
            <span>🌡️</span>
            <span className="hidden md:inline">Athanor</span>
            {athanorBoostActive && <span className="text-[10px] font-mono font-black">{athanorBoostTimer}s</span>}
            {athanorCooldown > 0 && !athanorBoostActive && <span className="text-[10px] font-mono">{athanorCooldown}s</span>}
          </button>

          {/* Prestige Button */}
          <button
            onClick={() => {
              soundFx.click();
              setShowPrestigeModal(true);
            }}
            className="bg-gradient-to-r from-purple-900 via-pink-900 to-amber-900 hover:from-purple-800 hover:to-amber-800 text-amber-200 border border-amber-500/50 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition shadow-lg flex items-center gap-1.5"
          >
            <span>⚗️</span>
            <span className="hidden sm:inline">Grand Œuvre</span>
            {pendingElixirDrops > 0 && (
              <span className="bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded-full font-mono text-[10px] font-black animate-pulse">
                +{pendingElixirDrops}
              </span>
            )}
          </button>

          {/* Options & Sound */}
          <button
            onClick={() => { soundFx.click(); setShowOptionsModal(true); }}
            className="text-slate-400 hover:text-white text-xs bg-slate-800 p-2 rounded-lg border border-slate-700 cursor-pointer"
            title="Options & Sauvegardes"
          >
            ⚙️
          </button>
          <button
            onClick={() => soundFx.toggleMute()}
            className="text-slate-400 hover:text-white text-xs bg-slate-800 p-2 rounded-lg border border-slate-700 cursor-pointer"
            title="Activer/Couper le son"
          >
            🔊
          </button>
        </div>
      </header>

      {/* ─── NOTIFICATION TOAST ──────────────────────────────────────────────── */}
      {notificationMsg && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 bg-amber-500 text-slate-950 font-black text-xs px-5 py-2 rounded-full shadow-2xl border-2 border-white z-50 animate-bounce">
          {notificationMsg}
        </div>
      )}

      {/* ─── FLOATING GOLDEN SPRITES ─────────────────────────────────────────── */}
      {goldenSprites.map(sprite => (
        <button
          key={sprite.id}
          onClick={() => handleCatchSprite(sprite)}
          style={{ left: `${sprite.x}%`, top: `${sprite.y}%` }}
          className="fixed z-40 transform -translate-x-1/2 -translate-y-1/2 cursor-pointer animate-pulse transition hover:scale-125"
        >
          <div className="relative flex flex-col items-center">
            <span className="text-4xl drop-shadow-[0_0_15px_rgba(251,191,36,0.9)]">
              {sprite.type === 'frenzy' ? '🧚' : sprite.type === 'wealth' ? '☄️' : '✨'}
            </span>
            <span className="text-[9px] bg-amber-400 text-slate-950 font-black px-1.5 rounded-full shadow font-mono">
              {sprite.type === 'frenzy' ? 'Fièvre' : sprite.type === 'wealth' ? 'Trésor' : 'Essences'}
            </span>
          </div>
        </button>
      ))}

      {/* ─── 4 ELEMENTAL ESSENCES INVENTORY STRIP ────────────────────────────── */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex items-center justify-center gap-3 sm:gap-6 text-xs font-mono">
        <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-xl border border-red-900/60 shadow">
          <span className="text-base">🔥</span>
          <span className="font-bold text-red-400">{formatNumber(save.fireEssence)}</span>
          <span className="text-[10px] text-slate-500 hidden sm:inline">(+{formatNumber(essenceRates.fire)}/s)</span>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-xl border border-cyan-900/60 shadow">
          <span className="text-base">💧</span>
          <span className="font-bold text-cyan-400">{formatNumber(save.waterEssence)}</span>
          <span className="text-[10px] text-slate-500 hidden sm:inline">(+{formatNumber(essenceRates.water)}/s)</span>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-xl border border-emerald-900/60 shadow">
          <span className="text-base">🌿</span>
          <span className="font-bold text-emerald-400">{formatNumber(save.earthEssence)}</span>
          <span className="text-[10px] text-slate-500 hidden sm:inline">(+{formatNumber(essenceRates.earth)}/s)</span>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-xl border border-indigo-900/60 shadow">
          <span className="text-base">💨</span>
          <span className="font-bold text-indigo-400">{formatNumber(save.airEssence)}</span>
          <span className="text-[10px] text-slate-500 hidden sm:inline">(+{formatNumber(essenceRates.air)}/s)</span>
        </div>
      </div>

      {/* ─── MAIN TWO-COLUMN LAYOUT ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col lg:flex-row items-stretch justify-center max-w-7xl w-full mx-auto p-3 gap-4">
        {/* ─── LEFT COLUMN : LE CHAUDRON ALCHIMIQUE & COMPTEURS ─────────────── */}
        <div className="flex-1 flex flex-col items-center justify-between bg-slate-900/60 border-2 border-slate-800 rounded-3xl p-5 shadow-2xl relative overflow-hidden">
          {/* Top Era Progression Banner */}
          <div className="w-full flex flex-col items-center gap-1.5 mb-2">
            <div className="flex justify-between items-center w-full text-xs font-serif text-slate-400">
              <span className="flex items-center gap-1.5 font-bold text-amber-300">
                <span>{currentEra.emoji}</span>
                <span>{currentEra.name}</span>
                <span className="text-[10px] text-slate-500 font-mono">({currentEra.multiplier}x)</span>
              </span>
              {nextEra ? (
                <span className="text-[10px] text-slate-400 font-mono">
                  Suivante: {nextEra.name} ({formatNumber(nextEra.threshold)})
                </span>
              ) : (
                <span className="text-[10px] text-amber-400 font-bold font-mono">Pinnacle Atteint ♾️</span>
              )}
            </div>

            {/* Era progress bar */}
            {nextEra && (
              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800 p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-purple-500 transition-all duration-300"
                  style={{
                    width: `${Math.min(100, Math.max(0, ((save.lifetimeMatter - currentEra.threshold) / (nextEra.threshold - currentEra.threshold)) * 100))}%`
                  }}
                />
              </div>
            )}
          </div>

          {/* Main Counters */}
          <div className="text-center my-1">
            <div className="text-4xl sm:text-5xl font-black tracking-tight text-white font-mono flex items-center justify-center gap-2">
              <span className="text-amber-400 text-3xl sm:text-4xl">⚗️</span>
              <span>{formatNumber(save.matter)}</span>
            </div>
            <div className="text-xs sm:text-sm font-bold text-purple-400 mt-1 font-mono flex items-center justify-center gap-2">
              <span>Production : +{formatNumber(totalCps)} / sec</span>
              {feverActive && (
                <span className="bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full text-[10px] font-black animate-pulse">
                  FIEVRE x5 ({feverTimer}s)
                </span>
              )}
              {athanorBoostActive && (
                <span className="bg-orange-500 text-slate-950 px-2 py-0.5 rounded-full text-[10px] font-black animate-pulse">
                  ATHANOR x2
                </span>
              )}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Clic : +{formatNumber(clickPower)} {critChance > 0 && `(${Math.round(critChance * 100)}% Crit x${critMultiplier})`}
            </div>
          </div>

          {/* ─── THE INTERACTIVE CHAUDRON ──────────────────────────────────── */}
          <div className="relative my-3 flex items-center justify-center">
            <div
              className="absolute w-64 h-64 rounded-full blur-3xl pointer-events-none transition-all duration-700"
              style={{
                backgroundColor: isFuryActive ? 'rgba(234, 179, 8, 0.4)' : currentEra.glowColor
              }}
            />

            <div
              ref={cauldronRef}
              onClick={handleCauldronClick}
              className={`relative cursor-pointer transition-transform duration-75 select-none touch-none ${
                cauldronSquish ? 'scale-90' : 'hover:scale-105 active:scale-95'
              }`}
            >
              <div
                className="w-52 h-52 sm:w-60 sm:h-60 rounded-full border-8 border-slate-800 flex items-center justify-center relative shadow-2xl"
                style={{ backgroundColor: isFuryActive ? '#78350f' : currentEra.cauldronBg }}
              >
                <div
                  className="w-40 h-40 sm:w-48 sm:h-48 rounded-full flex flex-col items-center justify-center shadow-inner relative overflow-hidden"
                  style={{ backgroundColor: isFuryActive ? '#f59e0b' : currentEra.liquidColor }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-white/20 animate-pulse" />
                  <div className="text-4xl sm:text-5xl animate-bounce mb-1 z-10">
                    {isFuryActive ? '🔥' : currentEra.emoji}
                  </div>
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-950 bg-white/75 px-2.5 py-0.5 rounded-full z-10 font-mono shadow">
                    {isFuryActive ? 'FUREUR !' : 'TRANSMUTER'}
                  </div>
                </div>

                <div className="absolute -left-3.5 w-4 h-10 rounded-l-xl bg-slate-800 border-2 border-slate-700" />
                <div className="absolute -right-3.5 w-4 h-10 rounded-r-xl bg-slate-800 border-2 border-slate-700" />
              </div>

              {/* Floating Texts */}
              {floatingTexts.map(ft => (
                <div
                  key={ft.id}
                  className="absolute pointer-events-none font-mono font-black text-sm z-30 transition-none"
                  style={{
                    left: ft.x,
                    top: ft.y,
                    color: ft.color,
                    opacity: ft.life,
                    transform: `scale(${ft.isCrit ? 1.4 : 1})`
                  }}
                >
                  {ft.text}
                </div>
              ))}

              {/* Splash Particles */}
              {particles.map((p, idx) => (
                <div
                  key={idx}
                  className="absolute pointer-events-none rounded-full z-30 transition-none"
                  style={{
                    left: p.x,
                    top: p.y,
                    width: `${p.size}px`,
                    height: `${p.size}px`,
                    backgroundColor: p.color,
                    opacity: p.life / p.maxLife,
                    transform: 'translate(-50%, -50%)'
                  }}
                />
              ))}
            </div>
          </div>

          {/* ─── FURY COMBO METER ─────────────────────────────────────────── */}
          <div className="w-full max-w-xs mt-1">
            <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 mb-1">
              <span className="flex items-center gap-1">
                <span>🔥</span>
                <span>Fureur Alchimique</span>
              </span>
              <span className="font-mono">
                {isFuryActive ? `ACTIF (${furyTimer}s)` : `${Math.floor(furyGauge)}%`}
              </span>
            </div>
            <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800 p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-100 ${
                  isFuryActive
                    ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 animate-pulse'
                    : 'bg-gradient-to-r from-purple-600 to-pink-500'
                }`}
                style={{ width: `${isFuryActive ? (furyTimer / 15) * 100 : furyGauge}%` }}
              />
            </div>
          </div>
        </div>

        {/* ─── RIGHT COLUMN : TABS (ATELIERS, GRIMOIRE, 7 SCEAUX, CONSTELLATIONS) ─ */}
        <div className="w-full lg:w-[500px] bg-slate-900/80 border-2 border-slate-800 rounded-3xl p-4 flex flex-col shadow-2xl">
          {/* Navigation Tabs */}
          <div className="grid grid-cols-5 gap-1 mb-3 bg-slate-950 p-1 rounded-2xl border border-slate-800">
            <button
              onClick={() => { soundFx.click(); setActiveTab('workshops'); }}
              className={`py-2 rounded-xl text-[11px] font-bold transition cursor-pointer flex flex-col items-center gap-0.5 ${
                activeTab === 'workshops' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>🏰</span>
              <span>Ateliers</span>
            </button>
            <button
              onClick={() => { soundFx.click(); setActiveTab('grimoire'); }}
              className={`py-2 rounded-xl text-[11px] font-bold transition cursor-pointer flex flex-col items-center gap-0.5 ${
                activeTab === 'grimoire' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>📜</span>
              <span>Grimoire</span>
            </button>
            <button
              onClick={() => { soundFx.click(); setActiveTab('seals'); }}
              className={`py-2 rounded-xl text-[11px] font-bold transition cursor-pointer flex flex-col items-center gap-0.5 ${
                activeTab === 'seals' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>🪐</span>
              <span>7 Sceaux</span>
            </button>
            <button
              onClick={() => { soundFx.click(); setActiveTab('constellations'); }}
              className={`py-2 rounded-xl text-[11px] font-bold transition cursor-pointer flex flex-col items-center gap-0.5 ${
                activeTab === 'constellations' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>🌌</span>
              <span>Prestige</span>
            </button>
            <button
              onClick={() => { soundFx.click(); setActiveTab('achievements'); }}
              className={`py-2 rounded-xl text-[11px] font-bold transition cursor-pointer flex flex-col items-center gap-0.5 ${
                activeTab === 'achievements' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>🏆</span>
              <span>Succès</span>
            </button>
          </div>

          {/* TAB 1: WORKSHOPS LIST */}
          {activeTab === 'workshops' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex justify-between items-center mb-2 px-1 text-xs">
                <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Achat groupé :</span>
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  {([1, 10, 100, 'MAX'] as const).map(m => (
                    <button
                      key={m}
                      onClick={() => { soundFx.click(); setBuyMultiplier(m); }}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono transition cursor-pointer ${
                        buyMultiplier === m ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {m === 'MAX' ? 'MAX' : `x${m}`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[500px]">
                {WORKSHOPS.map(def => {
                  const count = save.workshops[def.id] || 0;
                  const isMax = buyMultiplier === 'MAX';
                  const amountToBuy = isMax ? 1 : buyMultiplier;
                  const cost = getWorkshopCost(def, count, amountToBuy);
                  const hasEss = hasRequiredEssences(def, amountToBuy);
                  const canAfford = save.matter >= cost && hasEss;

                  return (
                    <div
                      key={def.id}
                      onClick={() => handleBuyWorkshop(def)}
                      className={`btn-3d p-2.5 rounded-2xl border-2 transition flex items-center justify-between cursor-pointer ${
                        canAfford
                          ? 'bg-slate-850 hover:bg-slate-800 border-purple-500/50 hover:border-amber-400 shadow-md'
                          : 'bg-slate-950 border-slate-850 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="text-2xl bg-slate-950 p-2 rounded-xl border border-slate-800">
                          {def.emoji}
                        </div>
                        <div>
                          <div className="font-extrabold text-xs text-white flex items-center gap-1.5">
                            <span>{def.name}</span>
                            <span className="font-mono text-purple-400 text-[10px]">Nv. {count}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                            <span>+{formatNumber(def.baseCps)}/s</span>
                            {def.producesEssence && (
                              <span className="text-amber-300 font-mono">
                                +{def.essenceRate}/s {def.producesEssence === 'fire' ? '🔥' : def.producesEssence === 'water' ? '💧' : def.producesEssence === 'earth' ? '🌿' : '💨'}
                              </span>
                            )}
                          </div>
                          {/* Required Essences Badges */}
                          {def.reqEssences && (
                            <div className="flex gap-1.5 mt-1">
                              {def.reqEssences.map((req, i) => (
                                <span key={i} className="text-[9px] font-mono bg-slate-950 px-1.5 py-0.2 rounded border border-slate-800 text-slate-300">
                                  {req.type === 'fire' ? '🔥' : req.type === 'water' ? '💧' : req.type === 'earth' ? '🌿' : '💨'} {formatNumber(req.amount * amountToBuy)}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className={`font-mono font-black text-xs ${canAfford ? 'text-amber-400' : 'text-slate-500'}`}>
                          ⚗️ {formatNumber(cost)}
                        </div>
                        <div className="text-[9px] text-slate-500 font-mono">
                          +{amountToBuy}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: GRIMOIRE UPGRADES */}
          {activeTab === 'grimoire' && (
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[540px]">
              <div className="text-xs font-serif text-slate-400 mb-2 px-1 italic">
                Formules ésotériques exigeant de l'or et des essences élémentaires.
              </div>

              {UPGRADES.map(up => {
                const isOwned = save.upgrades.includes(up.id);
                const hasMatter = save.matter >= up.cost;
                let hasEss = true;
                if (up.reqEssence) {
                  if (up.reqEssence.type === 'fire' && save.fireEssence < up.reqEssence.amount) hasEss = false;
                  if (up.reqEssence.type === 'water' && save.waterEssence < up.reqEssence.amount) hasEss = false;
                  if (up.reqEssence.type === 'earth' && save.earthEssence < up.reqEssence.amount) hasEss = false;
                  if (up.reqEssence.type === 'air' && save.airEssence < up.reqEssence.amount) hasEss = false;
                }
                const canAfford = hasMatter && hasEss && !isOwned;

                return (
                  <div
                    key={up.id}
                    onClick={() => !isOwned && handleBuyUpgrade(up)}
                    className={`btn-3d p-2.5 rounded-2xl border-2 transition flex items-center justify-between ${
                      isOwned
                        ? 'bg-emerald-950/40 border-emerald-500/40 opacity-70 cursor-default'
                        : canAfford
                        ? 'bg-slate-850 hover:bg-slate-800 border-amber-500/60 cursor-pointer shadow-lg'
                        : 'bg-slate-950 border-slate-850 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="text-2xl bg-slate-950 p-2 rounded-xl border border-slate-800">
                        {up.emoji}
                      </div>
                      <div>
                        <div className="font-extrabold text-xs text-white flex items-center gap-1.5">
                          <span>{up.name}</span>
                          {isOwned && (
                            <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.2 rounded">
                              Acquis ✓
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-300 mt-0.5 leading-tight max-w-[220px]">
                          {up.desc}
                        </div>
                        {up.reqEssence && !isOwned && (
                          <div className="text-[9px] text-amber-300 font-mono mt-0.5">
                            Requis : {up.reqEssence.type === 'fire' ? '🔥' : up.reqEssence.type === 'water' ? '💧' : up.reqEssence.type === 'earth' ? '🌿' : '💨'} {formatNumber(up.reqEssence.amount)}
                          </div>
                        )}
                      </div>
                    </div>

                    {!isOwned && (
                      <div className="text-right font-mono font-black text-xs text-amber-400">
                        ⚗️ {formatNumber(up.cost)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 3: LES 7 SCEAUX PLANÉTAIRES */}
          {activeTab === 'seals' && (
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-[540px]">
              <div className="bg-slate-950 p-3 rounded-2xl border border-amber-500/40 text-center mb-2">
                <h4 className="text-xs font-black text-amber-300 uppercase tracking-wider">La Quête de la Pierre Philosophale</h4>
                <p className="text-[10px] text-slate-300 font-serif mt-1 leading-relaxed">
                  Réunissez les 7 sceaux planétaires pour lever les verrous de la réalité et débloquer l'Ère Mythique de la Pierre Philosophale !
                </p>
                <div className="mt-2 text-xs font-mono font-black text-purple-300">
                  Sceaux Forgés : {save.seals.length} / 7
                </div>
              </div>

              {SACRED_SEALS.map(seal => {
                const isUnlocked = save.seals.includes(seal.id);

                return (
                  <div
                    key={seal.id}
                    className={`p-3 rounded-2xl border-2 transition ${
                      isUnlocked
                        ? 'bg-amber-950/40 border-amber-400/80 shadow-lg'
                        : 'bg-slate-950 border-slate-850 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{seal.emoji}</span>
                        <div>
                          <div className="font-black text-xs text-white flex items-center gap-1.5">
                            <span>{seal.name}</span>
                            <span className="text-[10px] text-amber-400 font-serif">({seal.planet})</span>
                          </div>
                          <div className="text-[9px] text-slate-400 font-mono">{seal.metal}</div>
                        </div>
                      </div>
                      {isUnlocked ? (
                        <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold">
                          FORGÉ ✓
                        </span>
                      ) : (
                        <span className="text-[9px] bg-slate-850 text-slate-500 px-2 py-0.5 rounded-full font-bold">
                          VERROUILLÉ 🔒
                        </span>
                      )}
                    </div>

                    <p className="text-[10px] text-slate-300 font-serif mb-1 leading-tight">{seal.desc}</p>
                    <div className="text-[9px] text-purple-300 font-mono bg-slate-900/80 p-1.5 rounded-xl border border-slate-800">
                      <strong>Condition :</strong> {seal.conditionDesc}
                    </div>
                    <div className="text-[9px] text-emerald-400 font-bold mt-1">
                      ✦ {seal.bonusDesc}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 4: CARTE DU CIEL (CONSTELLATIONS & PRESTIGE) */}
          {activeTab === 'constellations' && (
            <div className="flex-1 flex flex-col overflow-y-auto pr-1 max-h-[540px]">
              <div className="bg-gradient-to-br from-purple-950/80 to-amber-950/40 border-2 border-purple-500/40 p-3.5 rounded-2xl mb-3 text-center">
                <div className="text-3xl mb-1 animate-bounce">⚗️</div>
                <h3 className="text-xs font-black text-amber-300 uppercase tracking-wider">Le Grand Œuvre (Renaissance)</h3>
                <p className="text-[10px] text-slate-300 font-serif my-1.5 leading-relaxed">
                  Consommez votre matière accumulée (Seuil : 10 Trillions) pour distiller des <strong>Gouttes d'Élixir d'Immortalité 💧</strong>.
                </p>

                <div className="flex justify-center items-center gap-4 my-2 bg-slate-950 p-2 rounded-xl border border-slate-800 text-xs font-mono">
                  <div>
                    <span className="text-[9px] text-slate-400 block">Élixir Actuel</span>
                    <span className="font-black text-purple-300">💧 {save.elixirDrops}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 block">À Récolter</span>
                    <span className="font-black text-amber-400">+{pendingElixirDrops}</span>
                  </div>
                </div>

                <button
                  onClick={() => setShowPrestigeModal(true)}
                  disabled={pendingElixirDrops <= 0}
                  className="btn-3d-amber w-full py-2 rounded-xl font-black text-xs text-slate-950 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xl"
                >
                  {pendingElixirDrops > 0
                    ? `Renaître (+${pendingElixirDrops} Gouttes) ➔`
                    : 'Matière insuffisante (Seuil : 10 T)'}
                </button>
              </div>

              {/* Constellations Grid */}
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Les 12 Constellations Célestes :</h4>
              <div className="space-y-2">
                {CONSTELLATIONS.map(c => {
                  const lvl = save.constellations[c.id] || 0;
                  const isMax = lvl >= c.maxLevel;
                  const cost = c.cost * (lvl + 1);
                  const canAfford = save.elixirDrops >= cost && !isMax;

                  return (
                    <div
                      key={c.id}
                      onClick={() => !isMax && handleBuyConstellation(c)}
                      className={`btn-3d p-2.5 rounded-2xl border-2 transition flex items-center justify-between ${
                        isMax
                          ? 'bg-slate-950 border-slate-800 opacity-60 cursor-default'
                          : canAfford
                          ? 'bg-slate-850 hover:bg-slate-800 border-purple-500/60 cursor-pointer'
                          : 'bg-slate-950 border-slate-850 opacity-40 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="text-2xl bg-slate-950 p-1.5 rounded-xl border border-slate-800">
                          {c.emoji}
                        </div>
                        <div>
                          <div className="font-extrabold text-xs text-white flex items-center gap-1.5">
                            <span>{c.name}</span>
                            <span className="font-mono text-amber-400 text-[10px]">
                              {isMax ? 'MAX' : `Nv. ${lvl}/${c.maxLevel}`}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 leading-tight">
                            {c.desc}
                          </div>
                        </div>
                      </div>

                      {!isMax && (
                        <div className="text-right font-mono font-black text-xs text-purple-300">
                          💧 {cost}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 5: ACHIEVEMENTS */}
          {activeTab === 'achievements' && (
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[540px]">
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center mb-2">
                <span className="text-xs font-bold text-amber-300">
                  🏆 Succès Accomplis : {save.achievements.length} / {ACHIEVEMENTS.length}
                </span>
                <span className="block text-[10px] text-slate-400 mt-0.5 font-mono">
                  Bonus permanent : +{Math.round(save.achievements.length * 1.5)}% Production globale
                </span>
              </div>

              {ACHIEVEMENTS.map(ach => {
                const isUnlocked = save.achievements.includes(ach.id);

                return (
                  <div
                    key={ach.id}
                    className={`p-2 rounded-2xl border-2 flex items-center gap-2.5 transition ${
                      isUnlocked
                        ? 'bg-amber-950/30 border-amber-500/50'
                        : 'bg-slate-950 border-slate-850 opacity-40'
                    }`}
                  >
                    <div className="text-2xl bg-slate-900 p-1.5 rounded-xl border border-slate-800">
                      {isUnlocked ? ach.emoji : '🔒'}
                    </div>
                    <div>
                      <div className="font-extrabold text-xs text-white flex items-center gap-1.5">
                        <span>{ach.name}</span>
                        {isUnlocked && (
                          <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded font-mono">
                            +1.5% Global
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {ach.desc}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ─── ATHANOR HEAT STABILIZATION MINI-GAME MODAL ───────────────────────── */}
      {showAthanorModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border-4 border-orange-500 p-6 rounded-3xl max-w-md w-full text-center shadow-2xl relative">
            <div className="text-5xl mb-2 animate-bounce">🌡️</div>
            <h3 className="text-xl font-black text-white uppercase tracking-wider mb-1">Régulation de l'Athanor</h3>
            <p className="text-xs text-slate-400 font-serif mb-6">
              Stabilisez la température du fourneau au cœur de la zone verte pour décupler votre rendement alchimique !
            </p>

            {/* Gauge slider track */}
            <div className="relative w-full h-10 bg-slate-950 rounded-2xl border-2 border-slate-800 overflow-hidden mb-6 p-1 flex items-center">
              {/* Green sweet spot zone in middle (38% to 62%) */}
              <div className="absolute left-[38%] right-[38%] top-0 bottom-0 bg-emerald-500/40 border-x-2 border-emerald-400" />
              {/* Needle cursor */}
              <div
                className="absolute w-3 h-8 rounded-lg bg-orange-400 border border-white shadow-[0_0_10px_rgba(249,115,22,1)]"
                style={{ left: `${athanorSliderPos}%`, transform: 'translateX(-50%)' }}
              />
            </div>

            <button
              onClick={handleValidateAthanor}
              className="btn-3d-amber w-full py-3.5 rounded-xl font-black text-sm text-slate-950 cursor-pointer shadow-xl"
            >
              Fixer la Température 🎯
            </button>
          </div>
        </div>
      )}

      {/* ─── OFFLINE PROGRESS MODAL ─────────────────────────────────────────── */}
      {offlineModalData && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border-4 border-amber-500 p-8 rounded-3xl max-w-md w-full text-center shadow-2xl relative">
            <div className="text-6xl mb-3 animate-bounce">📜</div>
            <h2 className="text-2xl font-black text-white uppercase tracking-wider mb-1">Rapport d'Absence</h2>
            <p className="text-xs text-slate-400 font-serif italic mb-6">
              Pendant vos {Math.floor(offlineModalData.seconds / 60)} minutes d'absence, vos ateliers alchimiques ont continué à transmuter :
            </p>

            <div className="bg-slate-950 border-2 border-amber-500/40 p-4 rounded-2xl mb-6 font-mono text-3xl font-black text-amber-400">
              +{formatNumber(offlineModalData.earned)} ⚗️
            </div>

            <button
              onClick={() => { soundFx.click(); setOfflineModalData(null); }}
              className="btn-3d-amber w-full py-3 rounded-xl font-black text-sm text-slate-950 cursor-pointer shadow-xl"
            >
              Collecter les Matières ➔
            </button>
          </div>
        </div>
      )}

      {/* ─── PRESTIGE CONFIRMATION MODAL ─────────────────────────────────────── */}
      {showPrestigeModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border-4 border-purple-500 p-8 rounded-3xl max-w-md w-full text-center shadow-2xl relative">
            <div className="text-6xl mb-3 animate-bounce">⚗️</div>
            <h2 className="text-2xl font-black text-white uppercase tracking-wider mb-1">Le Grand Œuvre</h2>
            <p className="text-xs text-slate-300 font-serif leading-relaxed mb-4">
              Êtes-vous prêt à sacrifier votre matière et vos ateliers actuels pour distiller la pureté ultime de l'Élixir d'Immortalité ?
            </p>

            <div className="bg-purple-950/60 border-2 border-purple-500/60 p-4 rounded-2xl mb-6">
              <span className="text-[10px] text-purple-300 uppercase font-bold">Gain de Renaissance</span>
              <div className="text-3xl font-black text-amber-400 font-mono mt-1">
                +{pendingElixirDrops} Goutte{pendingElixirDrops > 1 ? 's' : ''} d'Élixir 💧
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Bonus permanent : +{Math.round(pendingElixirDrops * (0.10 + constellationBonuses.elixirDropBonusPct) * 100)}% de production globale
              </span>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowPrestigeModal(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-xl font-bold text-xs transition cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={handlePrestigeRebirth}
                className="flex-1 btn-3d-amber py-3 rounded-xl font-black text-xs text-slate-950 cursor-pointer shadow-xl"
              >
                Renaître Maintenant ➔
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── OPTIONS & SAVE MANAGEMENT MODAL ─────────────────────────────────── */}
      {showOptionsModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border-2 border-slate-700 p-6 rounded-3xl max-w-md w-full shadow-2xl relative">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                <span>⚙️</span>
                <span>Paramètres & Sauvegardes</span>
              </h3>
              <button
                onClick={() => setShowOptionsModal(false)}
                className="text-slate-400 hover:text-white text-xs bg-slate-800 p-1.5 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">
                  Exporter / Importer la Sauvegarde
                </label>
                <div className="flex gap-2 mb-2">
                  <button
                    onClick={handleExportSave}
                    className="flex-1 bg-slate-850 hover:bg-slate-800 text-purple-300 border border-purple-500/40 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    📋 Copier la Sauvegarde
                  </button>
                </div>
                <input
                  type="text"
                  value={importSaveInput}
                  onChange={(e) => setImportSaveInput(e.target.value)}
                  placeholder="Collez votre code de sauvegarde ici..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white mb-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  onClick={handleImportSave}
                  disabled={!importSaveInput.trim()}
                  className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white py-2 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Charger la Sauvegarde ➔
                </button>
              </div>

              <div className="pt-4 border-t border-slate-800">
                <button
                  onClick={handleHardReset}
                  className="w-full bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  ⚠️ Réinitialiser Tout le Jeu à Zéro
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
