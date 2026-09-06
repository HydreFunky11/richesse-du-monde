import type { WeaponDef, WeaponId, Rarity, RarityConfig, WaveConfig } from './survivorTypes';

// ============================================================================
// WEAPONS & CLASSES CONFIGURATION
// ============================================================================

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  sword: {
    id: 'sword',
    name: 'Épée en Diamant',
    className: 'Guerrier de l\'Overworld',
    icon: '🗡️',
    description: 'Balayage circulaire (Sweeping Edge) dévastateur. Repousse les hordes et protège au corps-à-corps.',
    baseDamage: 22,
    baseCooldownMs: 650,
    baseRange: 110,
    baseProjectiles: 1,
    basePierce: 99,
    baseSpeed: 0,
    baseArea: 100,
    color: '#38bdf8'
  },
  bow: {
    id: 'bow',
    name: 'Arc Puissant (Power V)',
    className: 'Rôdeur Sylvestre',
    icon: '🏹',
    description: 'Tir rapide de flèches affûtées. Excellente portée et pénétration en ligne droite.',
    baseDamage: 18,
    baseCooldownMs: 500,
    baseRange: 600,
    baseProjectiles: 1,
    basePierce: 2,
    baseSpeed: 450,
    baseArea: 20,
    color: '#f59e0b',
    unlockReq: {
      weaponId: 'sword',
      level: 30
    }
  },
  crossbow: {
    id: 'crossbow',
    name: 'Arbalète à Répétition',
    className: 'Chasseur de Pillards',
    icon: '🎯',
    description: 'Projectiles lourds perforants et salves multiples explosives (Multishot & Fireworks).',
    baseDamage: 28,
    baseCooldownMs: 900,
    baseRange: 550,
    baseProjectiles: 2,
    basePierce: 4,
    baseSpeed: 520,
    baseArea: 50,
    color: '#ef4444',
    unlockReq: {
      weaponId: 'bow',
      level: 30
    }
  },
  spear: {
    id: 'spear',
    name: 'Pique de Cavalier',
    className: 'Lancier Tempête (Vitesse)',
    icon: '🔱',
    description: 'Attaques d\'estoc perçantes en ligne. Les dégâts augmentent massivement selon votre VITESSE de déplacement !',
    baseDamage: 26,
    baseCooldownMs: 550,
    baseRange: 240,
    baseProjectiles: 1,
    basePierce: 6,
    baseSpeed: 600,
    baseArea: 40,
    color: '#a855f7',
    unlockReq: {
      weaponId: 'crossbow',
      level: 30
    }
  },
  trident: {
    id: 'trident',
    name: 'Trident des Abîmes (Loyalty & Channeling)',
    className: 'Maître des Tempêtes',
    icon: '🔱',
    description: 'Lancé à longue distance, transperce les ennemis puis revient vers le joueur en invoquant des éclairs.',
    baseDamage: 32,
    baseCooldownMs: 800,
    baseRange: 500,
    baseProjectiles: 1,
    basePierce: 8,
    baseSpeed: 480,
    baseArea: 75,
    color: '#06b6d4',
    unlockReq: {
      weaponId: 'spear',
      level: 30
    }
  },
  mace: {
    id: 'mace',
    name: 'Masse des Épreuves (Breach)',
    className: 'Titan Sismique',
    icon: '🔨',
    description: 'Frappe lourde écrasant le sol. Génère une immense onde de choc sismique pulvérisant tout autour.',
    baseDamage: 55,
    baseCooldownMs: 1200,
    baseRange: 160,
    baseProjectiles: 1,
    basePierce: 99,
    baseSpeed: 0,
    baseArea: 160,
    color: '#eab308',
    unlockReq: {
      weaponId: 'trident',
      level: 30
    }
  }
};

// ============================================================================
// RARITY SYSTEM
// ============================================================================

export const RARITIES: Record<Rarity, RarityConfig> = {
  common: {
    name: 'Commun',
    color: '#94a3b8',
    bgGradient: 'from-slate-900 via-slate-950 to-slate-900',
    border: 'border-slate-600',
    multiplier: 1.0,
    weight: 58
  },
  uncommon: {
    name: 'Peu Commun',
    color: '#22c55e',
    bgGradient: 'from-emerald-950/80 via-slate-950 to-slate-900',
    border: 'border-emerald-500',
    multiplier: 1.5,
    weight: 24
  },
  rare: {
    name: 'Rare',
    color: '#3b82f6',
    bgGradient: 'from-blue-950/80 via-slate-950 to-slate-900',
    border: 'border-blue-500',
    multiplier: 2.2,
    weight: 12
  },
  epic: {
    name: 'Épique',
    color: '#a855f7',
    bgGradient: 'from-purple-950/80 via-slate-950 to-slate-900',
    border: 'border-purple-500',
    multiplier: 3.5,
    weight: 5
  },
  legendary: {
    name: 'Légendaire',
    color: '#f59e0b',
    bgGradient: 'from-amber-950/80 via-slate-950 to-yellow-950/40',
    border: 'border-amber-400',
    multiplier: 5.2,
    weight: 1
  }
};

// ============================================================================
// BASE UPGRADES CATALOG
// ============================================================================

export interface BaseUpgradeTemplate {
  id: string;
  name: string;
  icon: string;
  category: 'player' | 'weapon';
  statKey: string;
  baseValue: number;
  isMultiplier?: boolean;
  descTemplate: (val: number) => string;
}

export const BASE_UPGRADES: BaseUpgradeTemplate[] = [
  // --- PLAYER UPGRADES ---
  {
    id: 'exp_boost',
    name: 'Bouteille d\'Enchantement',
    icon: '🧪',
    category: 'player',
    statKey: 'expMultiplier',
    baseValue: 0.15,
    isMultiplier: true,
    descTemplate: (val) => `+${Math.round(val * 100)}% d'EXP gagnée par orbe (Multiplicateur d'EXP)`
  },
  {
    id: 'player_damage',
    name: 'Force Brute',
    icon: '💪',
    category: 'player',
    statKey: 'damageMultiplier',
    baseValue: 0.10,
    isMultiplier: true,
    descTemplate: (val) => `+${Math.round(val * 100)}% de dégâts globaux infligés`
  },
  {
    id: 'player_armor',
    name: 'Plastron en Netherite',
    icon: '🛡️',
    category: 'player',
    statKey: 'armor',
    baseValue: 1,
    descTemplate: (val) => `+${Math.round(val)} Armure (réduit les dégâts subis)`
  },
  {
    id: 'player_speed',
    name: 'Bottes de Célérité',
    icon: '🥾',
    category: 'player',
    statKey: 'moveSpeed',
    baseValue: 20,
    descTemplate: (val) => `+${Math.round(val)} Vitesse de déplacement`
  },
  {
    id: 'player_pickup',
    name: 'Aimant à Redstone',
    icon: '🧲',
    category: 'player',
    statKey: 'pickupRange',
    baseValue: 35,
    descTemplate: (val) => `+${Math.round(val)} Rayon d'attraction des orbes d'EXP`
  },
  {
    id: 'player_hp',
    name: 'Cœurs d\'Énergie',
    icon: '❤️',
    category: 'player',
    statKey: 'maxHp',
    baseValue: 4,
    descTemplate: (val) => `+${Math.round(val)} PV Max (soigne également d'autant)`
  },
  {
    id: 'player_regen',
    name: 'Pomme d\'Or Enchantée',
    icon: '🍏',
    category: 'player',
    statKey: 'regenPerSec',
    baseValue: 0.05,
    descTemplate: (val) => `+${val.toFixed(2)} PV/s régénéré (1 PV toutes les ${Math.round(1 / val)}s)`
  },
  {
    id: 'player_crit',
    name: 'Étoile du Nether',
    icon: '⭐',
    category: 'player',
    statKey: 'critChance',
    baseValue: 0.05,
    isMultiplier: true,
    descTemplate: (val) => `+${Math.round(val * 100)}% de chance de Coup Critique (x2 dégâts)`
  },

  // --- WEAPON UPGRADES ---
  {
    id: 'weapon_cooldown',
    name: 'Hâte & Vivacité',
    icon: '⚡',
    category: 'weapon',
    statKey: 'weaponCooldown',
    baseValue: 0.08,
    isMultiplier: true,
    descTemplate: (val) => `+${Math.round(val * 100)}% de Cadence d'attaque (recharge plus vite)`
  },
  {
    id: 'weapon_projectiles',
    name: 'Poudre à Canon & Multishot',
    icon: '🎆',
    category: 'weapon',
    statKey: 'weaponProjectiles',
    baseValue: 1,
    descTemplate: (val) => `+${Math.round(val)} Projectile / Attaque simultanée`
  },
  {
    id: 'weapon_pierce',
    name: 'Flèches Transperçantes',
    icon: '🎯',
    category: 'weapon',
    statKey: 'weaponPierce',
    baseValue: 1,
    descTemplate: (val) => `+${Math.round(val)} Cible perforée par attaque`
  },
  {
    id: 'weapon_range',
    name: 'Allonge & Longue-vue',
    icon: '🔭',
    category: 'weapon',
    statKey: 'weaponRange',
    baseValue: 0.15,
    isMultiplier: true,
    descTemplate: (val) => `+${Math.round(val * 100)}% de Portée et Allonge d'attaque`
  },
  {
    id: 'weapon_area',
    name: 'Charge Explosive de TNT',
    icon: '🧨',
    category: 'weapon',
    statKey: 'weaponArea',
    baseValue: 0.20,
    isMultiplier: true,
    descTemplate: (val) => `+${Math.round(val * 100)}% de Rayon de Frappe / Zone d'Impact`
  },
  {
    id: 'weapon_proj_speed',
    name: 'Piston de Propulsion',
    icon: '💨',
    category: 'weapon',
    statKey: 'weaponProjSpeed',
    baseValue: 0.25,
    isMultiplier: true,
    descTemplate: (val) => `+${Math.round(val * 100)}% de Vélocité des projectiles`
  }
];

// ============================================================================
// 50 WAVES SPECIFICATIONS & 5 MAJOR BOSSES
// ============================================================================

export function generateWaves(): WaveConfig[] {
  const waves: WaveConfig[] = [];

  for (let w = 1; w <= 50; w++) {
    let duration = 30; // Max duration before wave auto-advances
    let spawnRate = 2.2 + w * 0.22; // Faster spawn rate to deliver wave quota quickly
    let targetKills = 15 + w * 3; // Wave quota: killing all advances in 3s
    let mobTypes: WaveConfig['mobTypes'] = ['zombie'];

    // Mob variety unlocks as waves advance
    if (w >= 3) mobTypes.push('spider');
    if (w >= 6) mobTypes.push('skeleton');
    if (w >= 8) mobTypes.push('creeper');
    if (w >= 12) mobTypes.push('slime');
    if (w >= 16) mobTypes.push('enderman');
    if (w >= 22) mobTypes.push('blaze');
    if (w >= 26) mobTypes.push('phantom');
    if (w >= 32) mobTypes.push('witch');

    // Boss waves every 10 waves!
    let bossType: WaveConfig['bossType'];
    let bossName: string | undefined;

    if (w === 10) {
      bossType = 'iron_golem';
      bossName = 'Golem de Fer Enragé';
      duration = 45;
    } else if (w === 20) {
      bossType = 'guardian';
      bossName = 'Grand Gardien des Mers (Elder Guardian)';
      duration = 50;
    } else if (w === 30) {
      bossType = 'wither';
      bossName = 'Le Wither Déchaîné';
      duration = 55;
    } else if (w === 40) {
      bossType = 'ender_dragon';
      bossName = 'Ender Dragon du Néant';
      duration = 60;
    } else if (w === 50) {
      bossType = 'warden';
      bossName = 'The Warden (Le Gardien des Tréfonds)';
      duration = 65;
    }

    waves.push({
      wave: w,
      durationSec: duration,
      mobTypes,
      spawnRatePerSec: spawnRate,
      targetKills,
      bossType,
      bossName
    });
  }

  return waves;
}

export const WAVES_CONFIG = generateWaves();
