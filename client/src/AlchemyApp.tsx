import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { soundFx } from './utils/audio';

// ─── TYPES & DATA STRUCTURES ──────────────────────────────────────────────────

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
}

export interface UpgradeDef {
  id: string;
  name: string;
  emoji: string;
  cost: number;
  desc: string;
  reqWorkshop?: { id: string; count: number };
  reqMatter?: number;
  reqClicks?: number;
  effectType: 'click_flat' | 'click_cps_pct' | 'workshop_mult' | 'global_mult' | 'crit_chance' | 'crit_mult';
  targetWorkshop?: string;
  multiplier?: number;
  percent?: number;
}

export interface CelestialRelicDef {
  id: string;
  name: string;
  emoji: string;
  cost: number; // In Elixir Drops
  desc: string;
  maxLevel: number;
  effect: (level: number) => {
    elixirBonusPct: number;
    startMatter: number;
    clickCpsPct: number;
    offlineRatio: number;
    critBonus: number;
  };
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
  type: 'frenzy' | 'wealth';
  duration: number;
}

// ─── 12 TRANSMUTATION ERAS (LES 12 ÉTAPES ALCHIMIQUES) ─────────────────────────

export const ALCHEMY_ERAS: TransmutationEra[] = [
  {
    id: 1,
    name: 'Nigredo (Plomb Vil)',
    sub: 'L\'Œuvre au Noir',
    desc: 'La matière brute, vile et opaque extraite de la terre humide.',
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
    desc: 'L\'action du feu fait poindre les premiers reflets chauds et métalliques.',
    threshold: 1_000,
    color: 'from-amber-900 to-stone-900',
    badgeStyle: 'bg-amber-950 text-amber-300 border-amber-800',
    cauldronBg: '#451a03',
    liquidColor: '#b45309',
    bubblesColor: '#f59e0b',
    glowColor: 'rgba(245, 158, 11, 0.4)',
    emoji: '🪨',
    multiplier: 2,
  },
  {
    id: 3,
    name: 'Fer & Vif-Argent (Mercure)',
    sub: 'L\'Union des Opposés',
    desc: 'Le solide inébranlable et le fluide fuyant se mêlent dans l\'alambic.',
    threshold: 30_000,
    color: 'from-cyan-950 to-slate-900',
    badgeStyle: 'bg-cyan-950 text-cyan-300 border-cyan-800',
    cauldronBg: '#083344',
    liquidColor: '#06b6d4',
    bubblesColor: '#67e8f9',
    glowColor: 'rgba(6, 182, 212, 0.4)',
    emoji: '⚙️',
    multiplier: 4,
  },
  {
    id: 4,
    name: 'Albedo (Argent Lunaire)',
    sub: 'L\'Œuvre au Blanc',
    desc: 'Purification absolue de la scorie. Une vapeur argentée et glaciale monte.',
    threshold: 800_000,
    color: 'from-slate-700 to-zinc-900',
    badgeStyle: 'bg-slate-800 text-slate-200 border-slate-600',
    cauldronBg: '#334155',
    liquidColor: '#e2e8f0',
    bubblesColor: '#ffffff',
    glowColor: 'rgba(255, 255, 255, 0.5)',
    emoji: '⚪',
    multiplier: 8,
  },
  {
    id: 5,
    name: 'Citrinitas (Or Solaire)',
    sub: 'L\'Œuvre au Jaune',
    desc: 'L\'énergie du soleil distillée dans le creuset. L\'or pur rayonne.',
    threshold: 20_000_000,
    color: 'from-yellow-900 to-amber-950',
    badgeStyle: 'bg-yellow-950 text-yellow-300 border-yellow-700',
    cauldronBg: '#713f12',
    liquidColor: '#eab308',
    bubblesColor: '#fef08a',
    glowColor: 'rgba(234, 179, 8, 0.5)',
    emoji: '🟡',
    multiplier: 16,
  },
  {
    id: 6,
    name: 'Cristal de Mana Primordial',
    sub: 'Éveil Arcanique',
    desc: 'La matière physique se cristallise pour canaliser la magie pure.',
    threshold: 500_000_000,
    color: 'from-indigo-950 to-purple-950',
    badgeStyle: 'bg-indigo-950 text-indigo-300 border-indigo-700',
    cauldronBg: '#312e81',
    liquidColor: '#6366f1',
    bubblesColor: '#a5b4fc',
    glowColor: 'rgba(99, 102, 241, 0.5)',
    emoji: '💎',
    multiplier: 32,
  },
  {
    id: 7,
    name: 'Poussière d\'Éther Vaporeuse',
    sub: 'Le Voile Astrale',
    desc: 'Substance céleste impalpable reliant la Terre aux galaxies lointaines.',
    threshold: 15_000_000_000,
    color: 'from-teal-950 to-emerald-950',
    badgeStyle: 'bg-teal-950 text-teal-300 border-teal-700',
    cauldronBg: '#042f2e',
    liquidColor: '#14b8a6',
    bubblesColor: '#5eead4',
    glowColor: 'rgba(20, 184, 166, 0.5)',
    emoji: '🌌',
    multiplier: 64,
  },
  {
    id: 8,
    name: 'Rubedo (Sang de Dragon)',
    sub: 'L\'Œuvre au Rouge',
    desc: 'La braise incandescente de la vie éternelle. Chaleur vivante et triomphe.',
    threshold: 400_000_000_000,
    color: 'from-red-950 to-rose-950',
    badgeStyle: 'bg-red-950 text-rose-300 border-rose-700',
    cauldronBg: '#4c0519',
    liquidColor: '#f43f5e',
    bubblesColor: '#fda4af',
    glowColor: 'rgba(244, 63, 94, 0.5)',
    emoji: '🩸',
    multiplier: 128,
  },
  {
    id: 9,
    name: 'Quintessence Stellaire',
    sub: 'Le Cinquième Élément',
    desc: 'L\'essence dérobée au vide cosmique, pulsant au rythme des nébuleuses.',
    threshold: 10_000_000_000_000,
    color: 'from-violet-950 to-fuchsia-950',
    badgeStyle: 'bg-violet-950 text-fuchsia-300 border-violet-700',
    cauldronBg: '#3b0764',
    liquidColor: '#c026d3',
    bubblesColor: '#f0abfc',
    glowColor: 'rgba(192, 38, 211, 0.6)',
    emoji: '🌟',
    multiplier: 256,
  },
  {
    id: 10,
    name: 'Orichalque Cosmique',
    sub: 'Métal des Dieux',
    desc: 'Forgé au cœur des supernovas agonisantes, indestructible et omnipotent.',
    threshold: 300_000_000_000_000,
    color: 'from-amber-950 via-purple-950 to-slate-950',
    badgeStyle: 'bg-gradient-to-r from-amber-900 to-purple-900 text-amber-200 border-amber-500',
    cauldronBg: '#581c87',
    liquidColor: '#fbbf24',
    bubblesColor: '#c084fc',
    glowColor: 'rgba(251, 191, 36, 0.6)',
    emoji: '🔮',
    multiplier: 512,
  },
  {
    id: 11,
    name: 'La Pierre Philosophale',
    sub: 'Le Magnum Opus',
    desc: 'L\'artefact légendaire absolu. Tout ce qu\'il effleure se transmute en gloire.',
    threshold: 10_000_000_000_000_000, // 10 Qa
    color: 'from-rose-950 via-amber-950 to-red-950',
    badgeStyle: 'bg-gradient-to-r from-red-900 to-amber-700 text-amber-100 border-amber-400 animate-pulse',
    cauldronBg: '#7f1d1d',
    liquidColor: '#ef4444',
    bubblesColor: '#fef08a',
    glowColor: 'rgba(239, 68, 68, 0.7)',
    emoji: '🔴',
    multiplier: 1024,
  },
  {
    id: 12,
    name: 'L\'Oméga Éternel (Singularité)',
    sub: 'Transmutation Infinie',
    desc: 'La réalité même s\'incline. L\'alchimie transcende les limites de l\'univers.',
    threshold: 500_000_000_000_000_000, // 500 Qa
    color: 'from-purple-950 via-indigo-950 to-amber-950',
    badgeStyle: 'bg-gradient-to-r from-purple-800 via-fuchsia-700 to-amber-500 text-white border-white animate-pulse',
    cauldronBg: '#18181b',
    liquidColor: '#a855f7',
    bubblesColor: '#ffffff',
    glowColor: 'rgba(255, 255, 255, 0.8)',
    emoji: '♾️',
    multiplier: 2048,
  }
];

// ─── 12 WORKSHOPS / BÂTIMENTS AUTOMATIQUES ─────────────────────────────────────

export const WORKSHOPS: WorkshopDef[] = [
  {
    id: 'herbalist',
    name: 'Apprenti Herboriste',
    emoji: '🌿',
    baseCost: 15,
    baseCps: 0.5,
    desc: 'Cueille des racines étranges et des fleurs de belladone dans les bois.'
  },
  {
    id: 'mortar',
    name: 'Mortier en Bronze',
    emoji: '🪨',
    baseCost: 100,
    baseCps: 4,
    desc: 'Pilonne la roche brute et les minerais en fine poudre calcinée.'
  },
  {
    id: 'alembic',
    name: 'Alambic de Verre Soufflé',
    emoji: '⚗️',
    baseCost: 1_100,
    baseCps: 32,
    desc: 'Distille la rosée des marais pour isoler les vapeurs soufrées.'
  },
  {
    id: 'crucible',
    name: 'Creuset Élémentaire',
    emoji: '🕯️',
    baseCost: 12_000,
    baseCps: 260,
    desc: 'Maintient un feu magique inextinguible pour fondre les alliages complexes.'
  },
  {
    id: 'homunculus',
    name: 'Homoncule Artificiel',
    emoji: '🧬',
    baseCost: 130_000,
    baseCps: 1_800,
    desc: 'Créature d\'argile et d\'étincelle vitale travaillant sans relâche.'
  },
  {
    id: 'arcane_sphere',
    name: 'Sphère Arcanique',
    emoji: '🔮',
    baseCost: 1_400_000,
    baseCps: 12_000,
    desc: 'Capte les flux telluriques invisibles et condense le mana ambiant.'
  },
  {
    id: 'transmutation_tower',
    name: 'Tour de Transmutation',
    emoji: '🏰',
    baseCost: 20_000_000,
    baseCps: 95_000,
    desc: 'Flèche royale où une confrérie d\'adeptes transmute le plomb en argent.'
  },
  {
    id: 'dragon_forge',
    name: 'Forge Draconique',
    emoji: '🐉',
    baseCost: 330_000_000,
    baseCps: 750_000,
    desc: 'Fournaise volcanique réchauffée par le souffle d\'un dragon millénaire.'
  },
  {
    id: 'aether_condenser',
    name: 'Condensateur d\'Éther',
    emoji: '🌌',
    baseCost: 5_000_000_000,
    baseCps: 6_500_000,
    desc: 'Aspire la matière subtile voyageant dans le vide entre les astres.'
  },
  {
    id: 'particle_accelerator',
    name: 'Collisionneur Arcanique',
    emoji: '🌀',
    baseCost: 85_000_000_000,
    baseCps: 58_000_000,
    desc: 'Propulse des atomes d\'or contre des particules de lumière divine.'
  },
  {
    id: 'magnum_sanctuary',
    name: 'Sanctuaire du Grand Œuvre',
    emoji: '🏛️',
    baseCost: 1_500_000_000_000,
    baseCps: 520_000_000,
    desc: 'Lieu saint où les lois chimiques de la nature sont réécrites par la volonté.'
  },
  {
    id: 'cosmic_rift',
    name: 'Faille Dimensionnelle',
    emoji: '🕳️',
    baseCost: 30_000_000_000_000,
    baseCps: 4_800_000_000,
    desc: 'Trou de ver cosmique déversant des galaxies de matière précieuse.'
  }
];

// ─── AMÉLIORATIONS DU GRIMOIRE ────────────────────────────────────────────────

export const UPGRADES: UpgradeDef[] = [
  {
    id: 'click_1',
    name: 'Pilon Renforcé',
    emoji: '🔨',
    cost: 100,
    desc: 'Vos clics manuels produisent 2x plus de matière.',
    effectType: 'click_flat',
    multiplier: 2
  },
  {
    id: 'click_2',
    name: 'Doigts d\'Or',
    emoji: '✨',
    cost: 1_000,
    desc: 'Vos clics manuels produisent 2x plus de matière.',
    effectType: 'click_flat',
    multiplier: 2
  },
  {
    id: 'click_synergy_1',
    name: 'Synergie de l\'Athanor',
    emoji: '🧪',
    cost: 50_000,
    desc: 'Chaque clic gagne +1% de la production passive totale par seconde (CPS).',
    effectType: 'click_cps_pct',
    percent: 0.01
  },
  {
    id: 'click_synergy_2',
    name: 'Toucher de Midas',
    emoji: '👑',
    cost: 5_000_000,
    desc: 'Chaque clic gagne +2% supplémentaire de votre CPS total.',
    effectType: 'click_cps_pct',
    percent: 0.02
  },
  {
    id: 'crit_1',
    name: 'Transmutation Critique',
    emoji: '🎯',
    cost: 2_500,
    desc: '+5% de chance de coup critique (multiplie la valeur du clic par x10).',
    effectType: 'crit_chance',
    percent: 0.05
  },
  {
    id: 'crit_2',
    name: 'Fulgurance Hermétique',
    emoji: '⚡',
    cost: 250_000,
    desc: 'Les coups critiques passent à un multiplicateur dévastateur de x25 !',
    effectType: 'crit_mult',
    multiplier: 25
  },
  {
    id: 'crit_3',
    name: 'Éclair Philosophal',
    emoji: '💥',
    cost: 50_000_000,
    desc: 'Les coups critiques atteignent la perfection alchimique : x77 !',
    effectType: 'crit_mult',
    multiplier: 77
  },
  // Spécifiques aux Bâtiments
  {
    id: 'herb_boost_1',
    name: 'Sécateurs d\'Argent',
    emoji: '🌿',
    cost: 200,
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
    cost: 1_500,
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
    cost: 15_000,
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
    cost: 150_000,
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
    cost: 1_800_000,
    desc: 'Les Homoncules sont 2x plus rapides.',
    reqWorkshop: { id: 'homunculus', count: 10 },
    effectType: 'workshop_mult',
    targetWorkshop: 'homunculus',
    multiplier: 2
  },
  {
    id: 'sphere_boost_1',
    name: 'Alignement Tellurique',
    emoji: '🔮',
    cost: 25_000_000,
    desc: 'Les Sphères Arcaniques sont 2x plus puissantes.',
    reqWorkshop: { id: 'arcane_sphere', count: 10 },
    effectType: 'workshop_mult',
    targetWorkshop: 'arcane_sphere',
    multiplier: 2
  },
  {
    id: 'global_boost_1',
    name: 'Catalyseur Universel',
    emoji: '🌟',
    cost: 100_000_000,
    desc: 'Toute votre production globale de matière est doublée (x2) !',
    effectType: 'global_mult',
    multiplier: 2
  },
  {
    id: 'global_boost_2',
    name: 'Loi d\'Équivalence Parfaite',
    emoji: '♾️',
    cost: 10_000_000_000,
    desc: 'Toute votre production globale de matière est triplée (x3) !',
    effectType: 'global_mult',
    multiplier: 3
  }
];

// ─── RELIQUES CÉLESTES (ARBRE DE PRESTIGE DU GRAND ŒUVRE) ─────────────────────

export const CELESTIAL_RELICS: CelestialRelicDef[] = [
  {
    id: 'athanor_flame',
    name: 'Flamme d\'Athanor',
    emoji: '🔥',
    cost: 1,
    desc: 'Chaque Goutte d\'Élixir confère +15% de bonus supplémentaire.',
    maxLevel: 20,
    effect: (lvl) => ({
      elixirBonusPct: lvl * 0.15,
      startMatter: 0,
      clickCpsPct: 0,
      offlineRatio: 0,
      critBonus: 0
    })
  },
  {
    id: 'hermes_legacy',
    name: 'Héritage d\'Hermès',
    emoji: '📜',
    cost: 3,
    desc: 'Démarre chaque nouvelle vie avec un pactole d\'or instantané.',
    maxLevel: 10,
    effect: (lvl) => ({
      elixirBonusPct: 0,
      startMatter: Math.pow(10, lvl + 2),
      clickCpsPct: 0,
      offlineRatio: 0,
      critBonus: 0
    })
  },
  {
    id: 'ouroboros_eye',
    name: 'Œil d\'Ouroboros',
    emoji: '🐉',
    cost: 5,
    desc: 'Vos clics manuels absorbent +1% permanent de votre CPS total.',
    maxLevel: 10,
    effect: (lvl) => ({
      elixirBonusPct: 0,
      startMatter: 0,
      clickCpsPct: lvl * 0.01,
      offlineRatio: 0,
      critBonus: 0
    })
  },
  {
    id: 'chronos_chalice',
    name: 'Calice de Chronos',
    emoji: '⏳',
    cost: 10,
    desc: 'La production hors-ligne passe à 100% d\'efficacité.',
    maxLevel: 5,
    effect: (lvl) => ({
      elixirBonusPct: 0,
      startMatter: 0,
      clickCpsPct: 0,
      offlineRatio: lvl * 0.1,
      critBonus: 0
    })
  },
  {
    id: 'celestial_lightning',
    name: 'Foudre Céleste',
    emoji: '⚡',
    cost: 15,
    desc: '+2% de chance de coup critique permanent par niveau.',
    maxLevel: 10,
    effect: (lvl) => ({
      elixirBonusPct: 0,
      startMatter: 0,
      clickCpsPct: 0,
      offlineRatio: 0,
      critBonus: lvl * 0.02
    })
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
  { id: 'c100', name: 'Alchimiste Déterminé', emoji: '💪', desc: 'Cliquez 100 fois sur le chaudron.', condition: (s) => s.totalClicks >= 100 },
  { id: 'c1000', name: 'Maître Touilleur', emoji: '🌪️', desc: 'Cliquez 1 000 fois sur le chaudron.', condition: (s) => s.totalClicks >= 1_000 },
  { id: 'c5000', name: 'Doigts Frénétiques', emoji: '⚡', desc: 'Cliquez 5 000 fois sur le chaudron.', condition: (s) => s.totalClicks >= 5_000 },
  { id: 'm1k', name: 'Petite Bourse', emoji: '🪙', desc: 'Amasser 1 000 matières au total.', condition: (s) => s.lifetimeMatter >= 1_000 },
  { id: 'm1m', name: 'Fortune Dorée', emoji: '💰', desc: 'Amasser 1 Million de matières au total.', condition: (s) => s.lifetimeMatter >= 1_000_000 },
  { id: 'm1b', name: 'Milliardaire Arcanique', emoji: '👑', desc: 'Amasser 1 Milliard de matières au total.', condition: (s) => s.lifetimeMatter >= 1_000_000_000 },
  { id: 'm1t', name: 'Trésor Royal', emoji: '💎', desc: 'Amasser 1 Trillion de matières au total.', condition: (s) => s.lifetimeMatter >= 1_000_000_000_000 },
  { id: 'm1qa', name: 'L\'Ère des Quadrillions', emoji: '🌌', desc: 'Amasser 1 Quadrillion de matières au total.', condition: (s) => s.lifetimeMatter >= 1e15 },
  { id: 'w1', name: 'Premier Compagnon', emoji: '🌿', desc: 'Engagez votre premier Apprenti Herboriste.', condition: (s) => (s.workshops['herbalist'] || 0) >= 1 },
  { id: 'w50', name: 'Atelier Prospère', emoji: '🏰', desc: 'Possédez au moins 50 bâtiments cumulés.', condition: (s) => Object.values(s.workshops).reduce((a, b) => a + b, 0) >= 50 },
  { id: 'w100', name: 'Manufacture Impériale', emoji: '🏭', desc: 'Possédez au moins 100 bâtiments cumulés.', condition: (s) => Object.values(s.workshops).reduce((a, b) => a + b, 0) >= 100 },
  { id: 'p1', name: 'Le Grand Œuvre', emoji: '⚗️', desc: 'Réalisez votre première Renaissance (Prestige).', condition: (s) => s.prestigeCount >= 1 },
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
  relics: Record<string, number>;
  elixirDrops: number;
  totalElixirEarned: number;
  prestigeCount: number;
  furyTriggeredCount: number;
  fairiesCaught: number;
  achievements: string[];
  lastSaveTime: number;
}

const DEFAULT_SAVE: AlchemySave = {
  matter: 0,
  lifetimeMatter: 0,
  totalClicks: 0,
  workshops: {},
  upgrades: [],
  relics: {},
  elixirDrops: 0,
  totalElixirEarned: 0,
  prestigeCount: 0,
  furyTriggeredCount: 0,
  fairiesCaught: 0,
  achievements: [],
  lastSaveTime: Date.now()
};

const STORAGE_KEY = 'alchimiste_supreme_save_v1';

// ─── HELPER: LARGE NUMBER FORMATTER ───────────────────────────────────────────

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

  // Scientific notation beyond Vg (10^63)
  return num.toExponential(2).replace('e+', 'e');
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function AlchemyApp() {
  const navigate = useNavigate();

  // Core Game State
  const [save, setSave] = useState<AlchemySave>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_SAVE, ...JSON.parse(stored) };
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

  const [buyMultiplier, setBuyMultiplier] = useState<1 | 10 | 100 | 'MAX'>(1);
  const [activeTab, setActiveTab] = useState<'workshops' | 'grimoire' | 'prestige' | 'achievements'>('workshops');

  const [cauldronSquish, setCauldronSquish] = useState(false);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [goldenSprites, setGoldenSprites] = useState<GoldenSprite[]>([]);

  const [offlineModalData, setOfflineModalData] = useState<{ seconds: number; earned: number } | null>(null);
  const [showPrestigeModal, setShowPrestigeModal] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [importSaveInput, setImportSaveInput] = useState('');
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  const cauldronRef = useRef<HTMLDivElement | null>(null);

  // ─── COMPUTED STATS (CPS & CLICK VALUE) ──────────────────────────────────────

  // Current Transmutation Era based on lifetime matter
  const currentEra = useMemo(() => {
    let active = ALCHEMY_ERAS[0];
    for (const era of ALCHEMY_ERAS) {
      if (save.lifetimeMatter >= era.threshold) {
        active = era;
      }
    }
    return active;
  }, [save.lifetimeMatter]);

  const nextEra = useMemo(() => {
    const idx = ALCHEMY_ERAS.findIndex(e => e.id === currentEra.id);
    return ALCHEMY_ERAS[idx + 1] || null;
  }, [currentEra]);

  // Relic bonuses
  const relicBonuses = useMemo(() => {
    let elixirBonusPct = 0;
    let startMatter = 0;
    let clickCpsPct = 0;
    let offlineRatio = 0.5; // Base 50% offline
    let critBonus = 0;

    for (const relic of CELESTIAL_RELICS) {
      const lvl = save.relics[relic.id] || 0;
      if (lvl > 0) {
        const res = relic.effect(lvl);
        elixirBonusPct += res.elixirBonusPct;
        startMatter += res.startMatter;
        clickCpsPct += res.clickCpsPct;
        offlineRatio += res.offlineRatio;
        critBonus += res.critBonus;
      }
    }

    return {
      elixirBonusPct,
      startMatter,
      clickCpsPct,
      offlineRatio: Math.min(1.0, offlineRatio),
      critBonus
    };
  }, [save.relics]);

  // Prestige multiplier (+10% per drop + relic bonus)
  const prestigeMultiplier = useMemo(() => {
    const pctPerDrop = 0.10 + relicBonuses.elixirBonusPct;
    return 1 + save.elixirDrops * pctPerDrop;
  }, [save.elixirDrops, relicBonuses.elixirBonusPct]);

  // Base and upgraded CPS
  const totalCps = useMemo(() => {
    let cps = 0;

    // Sum workshop contributions with milestone boosts
    for (const def of WORKSHOPS) {
      const count = save.workshops[def.id] || 0;
      if (count > 0) {
        // Milestone bonuses: 25 -> x2, 50 -> x2, 100 -> x4, 150 -> x2, 200 -> x5, etc.
        let milestoneMult = 1;
        if (count >= 25) milestoneMult *= 2;
        if (count >= 50) milestoneMult *= 2;
        if (count >= 100) milestoneMult *= 4;
        if (count >= 150) milestoneMult *= 2;
        if (count >= 200) milestoneMult *= 5;
        if (count >= 250) milestoneMult *= 2;
        if (count >= 300) milestoneMult *= 10;

        // Upgrade multipliers for this specific workshop
        let upgradeMult = 1;
        for (const upId of save.upgrades) {
          const up = UPGRADES.find(u => u.id === upId);
          if (up && up.effectType === 'workshop_mult' && up.targetWorkshop === def.id) {
            upgradeMult *= up.multiplier || 1;
          }
        }

        cps += count * def.baseCps * milestoneMult * upgradeMult;
      }
    }

    // Global upgrade multipliers
    for (const upId of save.upgrades) {
      const up = UPGRADES.find(u => u.id === upId);
      if (up && up.effectType === 'global_mult') {
        cps *= up.multiplier || 1;
      }
    }

    // Era multiplier
    cps *= currentEra.multiplier;

    // Prestige multiplier
    cps *= prestigeMultiplier;

    // Achievements multiplier (+2% per achievement)
    const achievementMult = 1 + save.achievements.length * 0.02;
    cps *= achievementMult;

    // Frenzy / Fever multipliers
    if (isFuryActive) cps *= 3;
    if (feverActive) cps *= 7;

    return cps;
  }, [save.workshops, save.upgrades, currentEra, prestigeMultiplier, save.achievements, isFuryActive, feverActive]);

  // Click power calculation
  const clickPower = useMemo(() => {
    let base = 1;

    for (const upId of save.upgrades) {
      const up = UPGRADES.find(u => u.id === upId);
      if (up && up.effectType === 'click_flat') {
        base *= up.multiplier || 1;
      }
    }

    // Era boost
    base *= Math.sqrt(currentEra.multiplier);

    // Click synergy with total CPS
    let cpsPct = 0;
    for (const upId of save.upgrades) {
      const up = UPGRADES.find(u => u.id === upId);
      if (up && up.effectType === 'click_cps_pct') {
        cpsPct += up.percent || 0;
      }
    }
    // Relic click synergy
    cpsPct += relicBonuses.clickCpsPct;

    base += totalCps * cpsPct;

    // Prestige & Achievement multipliers
    base *= prestigeMultiplier;
    base *= (1 + save.achievements.length * 0.02);

    if (isFuryActive) base *= 5;
    if (feverActive) base *= 7;

    return Math.max(1, base);
  }, [save.upgrades, currentEra, totalCps, relicBonuses.clickCpsPct, prestigeMultiplier, save.achievements, isFuryActive, feverActive]);

  // Critical strike chance and multiplier
  const { critChance, critMultiplier } = useMemo(() => {
    let chance = 0.05 + relicBonuses.critBonus; // base 5%
    let mult = 10; // base x10

    for (const upId of save.upgrades) {
      const up = UPGRADES.find(u => u.id === upId);
      if (up && up.effectType === 'crit_chance') {
        chance += up.percent || 0;
      }
      if (up && up.effectType === 'crit_mult') {
        mult = Math.max(mult, up.multiplier || mult);
      }
    }

    return { critChance: Math.min(1.0, chance), critMultiplier: mult };
  }, [save.upgrades, relicBonuses.critBonus]);

  // Potential Elixir Drops earned on Rebirth
  const pendingElixirDrops = useMemo(() => {
    // Formula: Math.floor(Math.cbrt(lifetimeMatter / 1e9))
    if (save.lifetimeMatter < 1e9) return 0;
    const totalPotential = Math.floor(Math.cbrt(save.lifetimeMatter / 1e9));
    return Math.max(0, totalPotential - save.totalElixirEarned);
  }, [save.lifetimeMatter, save.totalElixirEarned]);

  // ─── OFFLINE PROGRESS & INITIAL LOAD ─────────────────────────────────────────

  useEffect(() => {
    const now = Date.now();
    const elapsedSeconds = Math.floor((now - save.lastSaveTime) / 1000);

    if (elapsedSeconds > 15 && totalCps > 0) {
      const earned = Math.floor(elapsedSeconds * totalCps * relicBonuses.offlineRatio);
      if (earned > 0) {
        setSave(prev => ({
          ...prev,
          matter: prev.matter + earned,
          lifetimeMatter: prev.lifetimeMatter + earned,
          lastSaveTime: now
        }));
        setOfflineModalData({ seconds: elapsedSeconds, earned });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── AUTOSAVE & CPS TICK LOOP ────────────────────────────────────────────────

  useEffect(() => {
    const interval = setInterval(() => {
      setSave(prev => {
        const addedMatter = totalCps / 10; // 10 ticks per second
        const newMatter = prev.matter + addedMatter;
        const newLifetime = prev.lifetimeMatter + addedMatter;

        // Check new achievements
        const newlyUnlocked: string[] = [];
        const draftSave = { ...prev, matter: newMatter, lifetimeMatter: newLifetime };
        for (const ach of ACHIEVEMENTS) {
          if (!prev.achievements.includes(ach.id) && ach.condition(draftSave)) {
            newlyUnlocked.push(ach.id);
          }
        }

        if (newlyUnlocked.length > 0) {
          soundFx.victory();
          const firstAch = ACHIEVEMENTS.find(a => a.id === newlyUnlocked[0]);
          if (firstAch) {
            triggerNotification(`🏆 Succès Débloqué : ${firstAch.name} !`);
          }
        }

        return {
          ...prev,
          matter: newMatter,
          lifetimeMatter: newLifetime,
          achievements: [...prev.achievements, ...newlyUnlocked],
          lastSaveTime: Date.now()
        };
      });
    }, 100);

    return () => clearInterval(interval);
  }, [totalCps]);

  // Save to localStorage every 3 seconds
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

  // Decay Fury Gauge and handle timers
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
        setFuryGauge(prev => Math.max(0, prev - 2)); // slow natural decay
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
    }, 1000);

    return () => clearInterval(timer);
  }, [isFuryActive, feverActive]);

  // Random Golden Sprite (Fée d'Éther) Spawner every 90-180 seconds
  useEffect(() => {
    const spawnTimer = setInterval(() => {
      if (Math.random() < 0.5 && goldenSprites.length === 0) {
        const isFrenzy = Math.random() < 0.5;
        const newSprite: GoldenSprite = {
          id: Math.random().toString(),
          x: 10 + Math.random() * 80,
          y: 20 + Math.random() * 60,
          vx: (Math.random() - 0.5) * 1.5,
          vy: (Math.random() - 0.5) * 1.5,
          type: isFrenzy ? 'frenzy' : 'wealth',
          duration: 15
        };
        setGoldenSprites([newSprite]);
      }
    }, 30_000);

    return () => clearInterval(spawnTimer);
  }, [goldenSprites.length]);

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

  // ─── INTERACTIVE ACTIONS ────────────────────────────────────────────────────

  const triggerNotification = (msg: string) => {
    setNotificationMsg(msg);
    setTimeout(() => setNotificationMsg(null), 3500);
  };

  const handleCauldronClick = (e: React.MouseEvent) => {
    const isCrit = Math.random() < critChance;
    const gain = isCrit ? clickPower * critMultiplier : clickPower;

    // Visual Feedback
    setCauldronSquish(true);
    setTimeout(() => setCauldronSquish(false), 90);

    // Audio
    if (isCrit) {
      soundFx.attack();
    } else {
      soundFx.click();
    }

    // Coordinates for floating text
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

    spawnSplashParticles(clickX, clickY, currentEra.liquidColor, isCrit ? 14 : 7);

    // Advance Fury Gauge
    if (!isFuryActive) {
      setFuryGauge(prev => {
        const next = prev + 5;
        if (next >= 100) {
          setIsFuryActive(true);
          setFuryTimer(15);
          soundFx.victory();
          triggerNotification('🔥 FUREUR ALCHIMIQUE ACTIVÉE ! Clics x5 & Vitesse x3 !');
          setSave(s => ({ ...s, furyTriggeredCount: s.furyTriggeredCount + 1 }));
          return 100;
        }
        return next;
      });
    }

    // Apply matter
    setSave(prev => ({
      ...prev,
      matter: prev.matter + gain,
      lifetimeMatter: prev.lifetimeMatter + gain,
      totalClicks: prev.totalClicks + 1
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
        vy: Math.sin(angle) * speed - 20, // slight upward bias
        color,
        size: 2 + Math.random() * 4,
        life: 0.5,
        maxLife: 0.5
      });
    }
    setParticles(prev => [...prev, ...newPts]);
  };

  // Particles animation loop
  useEffect(() => {
    let animId: number;
    let last = performance.now();

    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;

      // Update particles
      setParticles(prev =>
        prev
          .map(p => ({
            ...p,
            x: p.x + p.vx * dt,
            y: p.y + p.vy * dt,
            vy: p.vy + 120 * dt, // gravity
            life: p.life - dt
          }))
          .filter(p => p.life > 0)
      );

      // Update floating texts
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
      triggerNotification('🧚 FIEVRE D\'ÉTHER ! Production multipliée par x7 pendant 30s !');
    } else {
      const instantWealth = Math.max(10_000, totalCps * 900); // 15 minutes of CPS
      setSave(s => ({
        ...s,
        matter: s.matter + instantWealth,
        lifetimeMatter: s.lifetimeMatter + instantWealth
      }));
      triggerNotification(`🪙 Trésor Dérobé : +${formatNumber(instantWealth)} Matières !`);
    }

    setGoldenSprites(prev => prev.filter(s => s.id !== sprite.id));
  };

  // ─── WORKSHOPS PURCHASE LOGIC ────────────────────────────────────────────────

  const getWorkshopCost = (def: WorkshopDef, currentCount: number, amount: number): number => {
    // Formula: cost = base * 1.15^count
    let total = 0;
    for (let i = 0; i < amount; i++) {
      total += def.baseCost * Math.pow(1.15, currentCount + i);
    }
    return Math.floor(total);
  };

  const getMaxAffordableWorkshops = (def: WorkshopDef, currentCount: number, availableMatter: number): { count: number; cost: number } => {
    let count = 0;
    let totalCost = 0;
    while (true) {
      const nextCost = def.baseCost * Math.pow(1.15, currentCount + count);
      if (totalCost + nextCost > availableMatter) break;
      totalCost += nextCost;
      count++;
      if (count >= 1000) break; // safety guard
    }
    return { count, cost: Math.floor(totalCost) };
  };

  const handleBuyWorkshop = (def: WorkshopDef) => {
    const current = save.workshops[def.id] || 0;
    let amountToBuy = 1;
    let cost = 0;

    if (buyMultiplier === 'MAX') {
      const maxRes = getMaxAffordableWorkshops(def, current, save.matter);
      amountToBuy = maxRes.count;
      cost = maxRes.cost;
    } else {
      amountToBuy = buyMultiplier;
      cost = getWorkshopCost(def, current, amountToBuy);
    }

    if (amountToBuy > 0 && save.matter >= cost) {
      soundFx.playCard();
      setSave(prev => ({
        ...prev,
        matter: prev.matter - cost,
        workshops: {
          ...prev.workshops,
          [def.id]: (prev.workshops[def.id] || 0) + amountToBuy
        }
      }));
    } else {
      soundFx.shield();
    }
  };

  // ─── UPGRADES PURCHASE LOGIC ────────────────────────────────────────────────

  const handleBuyUpgrade = (up: UpgradeDef) => {
    if (save.matter >= up.cost && !save.upgrades.includes(up.id)) {
      soundFx.heal();
      setSave(prev => ({
        ...prev,
        matter: prev.matter - up.cost,
        upgrades: [...prev.upgrades, up.id]
      }));
      triggerNotification(`✨ Grimoire Appris : "${up.name}" !`);
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
    const startingMatter = relicBonuses.startMatter;

    setSave(prev => ({
      ...prev,
      matter: startingMatter,
      lifetimeMatter: startingMatter,
      workshops: {},
      upgrades: [],
      elixirDrops: newTotalDrops,
      totalElixirEarned: newTotalEarned,
      prestigeCount: prev.prestigeCount + 1,
      lastSaveTime: Date.now()
    }));

    setShowPrestigeModal(false);
    triggerNotification(`⚗️ RENAISSANCE ACCOMPLIE ! +${pendingElixirDrops} Gouttes d'Élixir d'Immortalité !`);
  };

  const handleBuyRelic = (relic: CelestialRelicDef) => {
    const currentLvl = save.relics[relic.id] || 0;
    const cost = relic.cost * (currentLvl + 1);

    if (currentLvl < relic.maxLevel && save.elixirDrops >= cost) {
      soundFx.heal();
      setSave(prev => ({
        ...prev,
        elixirDrops: prev.elixirDrops - cost,
        relics: {
          ...prev.relics,
          [relic.id]: currentLvl + 1
        }
      }));
      triggerNotification(`🔮 Relique Céleste : "${relic.name}" Nv. ${currentLvl + 1} !`);
    } else {
      soundFx.shield();
    }
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
        triggerNotification('✅ Partie importée avec succès !');
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
      setSave(DEFAULT_SAVE);
      setShowOptionsModal(false);
      triggerNotification('🔄 Jeu réinitialisé à zéro.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-x-hidden">
      {/* ─── HEADER BAR ──────────────────────────────────────────────────────── */}
      <header className="bg-slate-900/90 border-b border-slate-800 px-4 py-3 flex items-center justify-between shadow-2xl sticky top-0 z-40 backdrop-blur-md">
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
                <span>L'Alchimiste Suprême</span>
                <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded font-mono">
                  SOLO • INCRÉMENTAL 🧪
                </span>
              </h1>
              <div className="text-[10px] text-slate-400 font-serif">
                Ère actuelle : <span className="text-amber-400 font-bold">{currentEra.name}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right header tools */}
        <div className="flex items-center gap-2">
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

          {/* Options Button */}
          <button
            onClick={() => {
              soundFx.click();
              setShowOptionsModal(true);
            }}
            className="text-slate-400 hover:text-white text-xs bg-slate-800 p-2 rounded-lg border border-slate-700 cursor-pointer"
            title="Options & Sauvegardes"
          >
            ⚙️
          </button>

          {/* Sound Mute Toggle */}
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

      {/* ─── FLOATING GOLDEN SPRITES (FÉES D'ÉTHER) ─────────────────────────── */}
      {goldenSprites.map(sprite => (
        <button
          key={sprite.id}
          onClick={() => handleCatchSprite(sprite)}
          style={{ left: `${sprite.x}%`, top: `${sprite.y}%` }}
          className="fixed z-40 transform -translate-x-1/2 -translate-y-1/2 cursor-pointer animate-pulse transition hover:scale-125"
        >
          <div className="relative flex flex-col items-center">
            <span className="text-4xl drop-shadow-[0_0_15px_rgba(251,191,36,0.9)]">
              {sprite.type === 'frenzy' ? '🧚' : '☄️'}
            </span>
            <span className="text-[9px] bg-amber-400 text-slate-950 font-black px-1.5 rounded-full shadow">
              Cliquez-moi !
            </span>
          </div>
        </button>
      ))}

      {/* ─── MAIN TWO-COLUMN LAYOUT ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col lg:flex-row items-stretch justify-center max-w-7xl w-full mx-auto p-3 gap-4">
        {/* ─── LEFT COLUMN : LE CHAUDRON ALCHIMIQUE & COMPTEURS ─────────────── */}
        <div className="flex-1 flex flex-col items-center justify-between bg-slate-900/60 border-2 border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
          {/* Top Era Progression Banner */}
          <div className="w-full flex flex-col items-center gap-1.5 mb-4">
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
          <div className="text-center my-2">
            <div className="text-4xl sm:text-5xl font-black tracking-tight text-white font-mono flex items-center justify-center gap-2">
              <span className="text-amber-400 text-3xl sm:text-4xl">⚗️</span>
              <span>{formatNumber(save.matter)}</span>
            </div>
            <div className="text-xs sm:text-sm font-bold text-purple-400 mt-1 font-mono flex items-center justify-center gap-2">
              <span>Production : +{formatNumber(totalCps)} / sec</span>
              {feverActive && (
                <span className="bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full text-[10px] font-black animate-pulse">
                  FIEVRE x7 ({feverTimer}s)
                </span>
              )}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Clic : +{formatNumber(clickPower)} {critChance > 0 && `(${Math.round(critChance * 100)}% Crit x${critMultiplier})`}
            </div>
          </div>

          {/* ─── THE INTERACTIVE CHAUDRON ──────────────────────────────────── */}
          <div className="relative my-4 flex items-center justify-center">
            {/* Glow Halo */}
            <div
              className="absolute w-72 h-72 rounded-full blur-3xl pointer-events-none transition-all duration-700"
              style={{
                backgroundColor: isFuryActive ? 'rgba(234, 179, 8, 0.4)' : currentEra.glowColor
              }}
            />

            {/* Main Clickable Cauldron */}
            <div
              ref={cauldronRef}
              onClick={handleCauldronClick}
              className={`relative cursor-pointer transition-transform duration-75 select-none touch-none ${
                cauldronSquish ? 'scale-90' : 'hover:scale-105 active:scale-95'
              }`}
            >
              {/* Cauldron Cast Iron Exterior */}
              <div
                className="w-56 h-56 sm:w-64 sm:h-64 rounded-full border-8 border-slate-800 flex items-center justify-center relative shadow-2xl"
                style={{ backgroundColor: isFuryActive ? '#78350f' : currentEra.cauldronBg }}
              >
                {/* Boiling Liquid Surface */}
                <div
                  className="w-44 h-44 sm:w-52 sm:h-52 rounded-full flex flex-col items-center justify-center shadow-inner relative overflow-hidden"
                  style={{ backgroundColor: isFuryActive ? '#f59e0b' : currentEra.liquidColor }}
                >
                  {/* Boiling animated ripples / waves */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-white/20 animate-pulse" />

                  {/* Boiling bubbles emojis */}
                  <div className="text-4xl sm:text-5xl animate-bounce mb-1 z-10">
                    {isFuryActive ? '🔥' : currentEra.emoji}
                  </div>
                  <div className="text-[11px] font-black uppercase tracking-wider text-slate-950 bg-white/70 px-2 py-0.5 rounded-full z-10 font-mono shadow">
                    {isFuryActive ? 'FUREUR !' : 'TRANSMUTER'}
                  </div>
                </div>

                {/* Left & Right Iron Cauldron Handles */}
                <div className="absolute -left-4 w-5 h-12 rounded-l-xl bg-slate-800 border-2 border-slate-700" />
                <div className="absolute -right-4 w-5 h-12 rounded-r-xl bg-slate-800 border-2 border-slate-700" />
              </div>

              {/* Floating Damage / Value Texts */}
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
          <div className="w-full max-w-xs mt-2">
            <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 mb-1">
              <span className="flex items-center gap-1">
                <span>🔥</span>
                <span>Fureur Alchimique</span>
              </span>
              <span className="font-mono">
                {isFuryActive ? `ACTIF (${furyTimer}s)` : `${Math.floor(furyGauge)}%`}
              </span>
            </div>
            <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800 p-0.5">
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

        {/* ─── RIGHT COLUMN : GRIMOIRE, ATELIERS & PRESTIGE TABS ─────────────── */}
        <div className="w-full lg:w-[480px] bg-slate-900/80 border-2 border-slate-800 rounded-3xl p-4 flex flex-col shadow-2xl">
          {/* Navigation Tabs */}
          <div className="grid grid-cols-4 gap-1.5 mb-3 bg-slate-950 p-1 rounded-2xl border border-slate-800">
            <button
              onClick={() => { soundFx.click(); setActiveTab('workshops'); }}
              className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer flex flex-col items-center gap-0.5 ${
                activeTab === 'workshops'
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>🏰</span>
              <span>Ateliers</span>
            </button>
            <button
              onClick={() => { soundFx.click(); setActiveTab('grimoire'); }}
              className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer flex flex-col items-center gap-0.5 ${
                activeTab === 'grimoire'
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>📜</span>
              <span>Grimoire</span>
            </button>
            <button
              onClick={() => { soundFx.click(); setActiveTab('prestige'); }}
              className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer flex flex-col items-center gap-0.5 ${
                activeTab === 'prestige'
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>⚗️</span>
              <span>Prestige</span>
            </button>
            <button
              onClick={() => { soundFx.click(); setActiveTab('achievements'); }}
              className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer flex flex-col items-center gap-0.5 ${
                activeTab === 'achievements'
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>🏆</span>
              <span>Succès</span>
            </button>
          </div>

          {/* Tab 1: Workshops List */}
          {activeTab === 'workshops' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Buy Multiplier Selector */}
              <div className="flex justify-between items-center mb-2 px-1 text-xs">
                <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Achat groupé :</span>
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  {([1, 10, 100, 'MAX'] as const).map(m => (
                    <button
                      key={m}
                      onClick={() => { soundFx.click(); setBuyMultiplier(m); }}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono transition cursor-pointer ${
                        buyMultiplier === m
                          ? 'bg-amber-500 text-slate-950 shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {m === 'MAX' ? 'MAX' : `x${m}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Workshops Scrollable List */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[520px]">
                {WORKSHOPS.map(def => {
                  const count = save.workshops[def.id] || 0;
                  const isMax = buyMultiplier === 'MAX';
                  const cost = isMax
                    ? getMaxAffordableWorkshops(def, count, save.matter).cost
                    : getWorkshopCost(def, count, buyMultiplier);
                  const buyCount = isMax
                    ? getMaxAffordableWorkshops(def, count, save.matter).count
                    : buyMultiplier;

                  const canAfford = save.matter >= cost && buyCount > 0;

                  return (
                    <div
                      key={def.id}
                      onClick={() => handleBuyWorkshop(def)}
                      className={`btn-3d p-3 rounded-2xl border-2 transition flex items-center justify-between cursor-pointer ${
                        canAfford
                          ? 'bg-slate-850 hover:bg-slate-800 border-purple-500/50 hover:border-amber-400 shadow-md'
                          : 'bg-slate-950 border-slate-850 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-3xl bg-slate-950 p-2 rounded-xl border border-slate-800">
                          {def.emoji}
                        </div>
                        <div>
                          <div className="font-extrabold text-xs text-white flex items-center gap-1.5">
                            <span>{def.name}</span>
                            <span className="font-mono text-purple-400 text-[10px]">Nv. {count}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            +{formatNumber(def.baseCps)} / sec par unité
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className={`font-mono font-black text-xs ${canAfford ? 'text-amber-400' : 'text-slate-500'}`}>
                          ⚗️ {formatNumber(cost)}
                        </div>
                        <div className="text-[9px] text-slate-500 font-mono">
                          +{buyCount} atelier{buyCount > 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab 2: Grimoire Upgrades */}
          {activeTab === 'grimoire' && (
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[560px]">
              <div className="text-xs font-serif text-slate-400 mb-2 px-1 italic">
                Découvrez les formules ésotériques pour décupler votre puissance alchimique.
              </div>

              {UPGRADES.map(up => {
                const isOwned = save.upgrades.includes(up.id);
                const canAfford = save.matter >= up.cost && !isOwned;

                return (
                  <div
                    key={up.id}
                    onClick={() => !isOwned && handleBuyUpgrade(up)}
                    className={`btn-3d p-3 rounded-2xl border-2 transition flex items-center justify-between ${
                      isOwned
                        ? 'bg-emerald-950/40 border-emerald-500/40 opacity-70 cursor-default'
                        : canAfford
                        ? 'bg-slate-850 hover:bg-slate-800 border-amber-500/60 cursor-pointer shadow-lg'
                        : 'bg-slate-950 border-slate-850 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-3xl bg-slate-950 p-2 rounded-xl border border-slate-800">
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
                        <div className="text-[10px] text-slate-300 mt-0.5 leading-tight max-w-[240px]">
                          {up.desc}
                        </div>
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

          {/* Tab 3: Prestige (Le Grand Œuvre) */}
          {activeTab === 'prestige' && (
            <div className="flex-1 flex flex-col overflow-y-auto pr-1 max-h-[560px]">
              <div className="bg-gradient-to-br from-purple-950/80 to-amber-950/40 border-2 border-purple-500/40 p-4 rounded-2xl mb-4 text-center">
                <div className="text-4xl mb-1 animate-bounce">⚗️</div>
                <h3 className="text-sm font-black text-amber-300 uppercase tracking-wider">Le Grand Œuvre</h3>
                <p className="text-[11px] text-slate-300 font-serif my-2 leading-relaxed">
                  Consommez votre matière accumulée pour distiller des <strong>Gouttes d'Élixir d'Immortalité</strong>.
                  Chaque goutte confère un bonus permanent de <strong>+{Math.round((0.10 + relicBonuses.elixirBonusPct) * 100)}% de production</strong>.
                </p>

                <div className="flex justify-center items-center gap-4 my-3 bg-slate-950 p-2 rounded-xl border border-slate-800">
                  <div className="text-center">
                    <span className="text-[10px] text-slate-400 uppercase">Élixir Actuel</span>
                    <div className="text-base font-black text-purple-300 font-mono">💧 {save.elixirDrops}</div>
                  </div>
                  <div className="text-center">
                    <span className="text-[10px] text-slate-400 uppercase">À Récolter</span>
                    <div className="text-base font-black text-amber-400 font-mono">+{pendingElixirDrops}</div>
                  </div>
                </div>

                <button
                  onClick={() => setShowPrestigeModal(true)}
                  disabled={pendingElixirDrops <= 0}
                  className="btn-3d-amber w-full py-2.5 rounded-xl font-black text-xs text-slate-950 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xl"
                >
                  {pendingElixirDrops > 0
                    ? `Renaître (+${pendingElixirDrops} Gouttes) ➔`
                    : 'Matière insuffisante (Requis : 1 Md)'}
                </button>
              </div>

              {/* Celestial Relics Shop */}
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Reliques Célestes :</h4>
              <div className="space-y-2">
                {CELESTIAL_RELICS.map(relic => {
                  const lvl = save.relics[relic.id] || 0;
                  const isMax = lvl >= relic.maxLevel;
                  const cost = relic.cost * (lvl + 1);
                  const canAfford = save.elixirDrops >= cost && !isMax;

                  return (
                    <div
                      key={relic.id}
                      onClick={() => !isMax && handleBuyRelic(relic)}
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
                          {relic.emoji}
                        </div>
                        <div>
                          <div className="font-extrabold text-xs text-white flex items-center gap-1.5">
                            <span>{relic.name}</span>
                            <span className="font-mono text-amber-400 text-[10px]">
                              {isMax ? 'MAX' : `Nv. ${lvl}/${relic.maxLevel}`}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 leading-tight">
                            {relic.desc}
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

          {/* Tab 4: Achievements */}
          {activeTab === 'achievements' && (
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[560px]">
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center mb-2">
                <span className="text-xs font-bold text-amber-300">
                  🏆 Succès Accomplis : {save.achievements.length} / {ACHIEVEMENTS.length}
                </span>
                <span className="block text-[10px] text-slate-400 mt-0.5 font-mono">
                  Bonus permanent conféré : +{save.achievements.length * 2}% Production globale
                </span>
              </div>

              {ACHIEVEMENTS.map(ach => {
                const isUnlocked = save.achievements.includes(ach.id);

                return (
                  <div
                    key={ach.id}
                    className={`p-2.5 rounded-2xl border-2 flex items-center gap-3 transition ${
                      isUnlocked
                        ? 'bg-amber-950/30 border-amber-500/50'
                        : 'bg-slate-950 border-slate-850 opacity-40'
                    }`}
                  >
                    <div className="text-3xl bg-slate-900 p-2 rounded-xl border border-slate-800">
                      {isUnlocked ? ach.emoji : '🔒'}
                    </div>
                    <div>
                      <div className="font-extrabold text-xs text-white flex items-center gap-1.5">
                        <span>{ach.name}</span>
                        {isUnlocked && (
                          <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded font-mono">
                            +2% Global
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
              Êtes-vous prêt à sacrifier toute votre matière et vos ateliers actuels pour distiller la pureté ultime de l'Élixir ?
            </p>

            <div className="bg-purple-950/60 border-2 border-purple-500/60 p-4 rounded-2xl mb-6">
              <span className="text-[10px] text-purple-300 uppercase font-bold">Gain de Renaissance</span>
              <div className="text-3xl font-black text-amber-400 font-mono mt-1">
                +{pendingElixirDrops} Goutte{pendingElixirDrops > 1 ? 's' : ''} d'Élixir 💧
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Bonus permanent de production : +{Math.round(pendingElixirDrops * (0.10 + relicBonuses.elixirBonusPct) * 100)}%
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
              {/* Export / Import Save */}
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

              {/* Hard Reset */}
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
