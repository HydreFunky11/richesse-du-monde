import { SkinDefinition, CaseDefinition } from '../types/hellgamble';

export const SKINS_DATABASE: SkinDefinition[] = [
  // ─── CONSUMER / MIL-SPEC (BLEU) ─────────────────────────────────────────────
  { id: 'p250_sand_dune', name: 'Sand Dune', weapon: 'P250', rarity: 'consumer', baseValue: 0.08, icon: '🔫', accentColor: '#94a3b8' },
  { id: 'mp7_olive', name: 'Olive Light', weapon: 'MP7', rarity: 'consumer', baseValue: 0.12, icon: '🔫', accentColor: '#94a3b8' },
  { id: 'glock_offworld', name: 'Off World', weapon: 'Glock-18', rarity: 'milspec', baseValue: 1.10, icon: '🔫', accentColor: '#3b82f6' },
  { id: 'usps_blueprint', name: 'Blueprint', weapon: 'USP-S', rarity: 'milspec', baseValue: 3.40, icon: '🔫', accentColor: '#3b82f6' },
  { id: 'm4a4_magnesium', name: 'Magnesium', weapon: 'M4A4', rarity: 'milspec', baseValue: 1.80, icon: '🔫', accentColor: '#3b82f6' },
  { id: 'ak47_safari', name: 'Safari Mesh', weapon: 'AK-47', rarity: 'milspec', baseValue: 2.20, icon: '🔫', accentColor: '#3b82f6' },
  { id: 'galil_rocket', name: 'Rocket Pop', weapon: 'Galil AR', rarity: 'milspec', baseValue: 1.95, icon: '🔫', accentColor: '#3b82f6' },
  { id: 'famas_valence', name: 'Valence', weapon: 'FAMAS', rarity: 'milspec', baseValue: 2.60, icon: '🔫', accentColor: '#3b82f6' },
  { id: 'mac10_carnivore', name: 'Carnivore', weapon: 'MAC-10', rarity: 'milspec', baseValue: 1.50, icon: '🔫', accentColor: '#3b82f6' },
  { id: 'ssg_necropos', name: 'Necropos', weapon: 'SSG 08', rarity: 'milspec', baseValue: 2.90, icon: '🔫', accentColor: '#3b82f6' },

  // ─── RESTRICTED (VIOLET) ───────────────────────────────────────────────────
  { id: 'deagle_conspiracy', name: 'Conspiracy', weapon: 'Desert Eagle', rarity: 'restricted', baseValue: 9.80, icon: '🔫', accentColor: '#a855f7' },
  { id: 'm4a4_evil_daimyo', name: 'Evil Daimyo', weapon: 'M4A4', rarity: 'restricted', baseValue: 8.50, icon: '🔫', accentColor: '#a855f7' },
  { id: 'ak47_cartel', name: 'Cartel', weapon: 'AK-47', rarity: 'restricted', baseValue: 16.50, icon: '🔫', accentColor: '#a855f7' },
  { id: 'awp_mortis', name: 'Mortis', weapon: 'AWP', rarity: 'restricted', baseValue: 14.00, icon: '🎯', accentColor: '#a855f7' },
  { id: 'glock_water_elemental', name: 'Water Elemental', weapon: 'Glock-18', rarity: 'restricted', baseValue: 12.50, icon: '🔫', accentColor: '#a855f7' },
  { id: 'm4a1s_night_terror', name: 'Night Terror', weapon: 'M4A1-S', rarity: 'restricted', baseValue: 7.80, icon: '🔫', accentColor: '#a855f7' },
  { id: 'usps_cyrex', name: 'Cyrex', weapon: 'USP-S', rarity: 'restricted', baseValue: 11.20, icon: '🔫', accentColor: '#a855f7' },
  { id: 'awp_atheris', name: 'Atheris', weapon: 'AWP', rarity: 'restricted', baseValue: 18.00, icon: '🎯', accentColor: '#a855f7' },

  // ─── CLASSIFIED (ROSE) ─────────────────────────────────────────────────────
  { id: 'ak47_neon_rider', name: 'Neon Rider', weapon: 'AK-47', rarity: 'classified', baseValue: 95.00, icon: '🔫', accentColor: '#ec4899' },
  { id: 'm4a1s_decimator', name: 'Decimator', weapon: 'M4A1-S', rarity: 'classified', baseValue: 38.00, icon: '🔫', accentColor: '#ec4899' },
  { id: 'awp_hyper_beast', name: 'Hyper Beast', weapon: 'AWP', rarity: 'classified', baseValue: 110.00, icon: '🎯', accentColor: '#ec4899' },
  { id: 'deagle_code_red', name: 'Code Red', weapon: 'Desert Eagle', rarity: 'classified', baseValue: 68.00, icon: '🔫', accentColor: '#ec4899' },
  { id: 'usps_neo_noir', name: 'Neo-Noir', weapon: 'USP-S', rarity: 'classified', baseValue: 45.00, icon: '🔫', accentColor: '#ec4899' },
  { id: 'm4a4_neo_noir', name: 'Neo-Noir', weapon: 'M4A4', rarity: 'classified', baseValue: 55.00, icon: '🔫', accentColor: '#ec4899' },
  { id: 'ak47_redline', name: 'Redline', weapon: 'AK-47', rarity: 'classified', baseValue: 75.00, icon: '🔫', accentColor: '#ec4899' },
  { id: 'awp_asiimov', name: 'Asiimov', weapon: 'AWP', rarity: 'classified', baseValue: 135.00, icon: '🎯', accentColor: '#ec4899' },

  // ─── COVERT (ROUGE) ────────────────────────────────────────────────────────
  { id: 'ak47_vulcan', name: 'Vulcan', weapon: 'AK-47', rarity: 'covert', baseValue: 340.00, icon: '🔥', accentColor: '#ef4444' },
  { id: 'm4a4_the_emperor', name: 'The Emperor', weapon: 'M4A4', rarity: 'covert', baseValue: 190.00, icon: '🔥', accentColor: '#ef4444' },
  { id: 'awp_wildfire', name: 'Wildfire', weapon: 'AWP', rarity: 'covert', baseValue: 230.00, icon: '🔥', accentColor: '#ef4444' },
  { id: 'deagle_printstream', name: 'Printstream', weapon: 'Desert Eagle', rarity: 'covert', baseValue: 260.00, icon: '🔥', accentColor: '#ef4444' },
  { id: 'm4a1s_printstream', name: 'Printstream', weapon: 'M4A1-S', rarity: 'covert', baseValue: 380.00, icon: '🔥', accentColor: '#ef4444' },
  { id: 'ak47_fire_serpent', name: 'Fire Serpent', weapon: 'AK-47', rarity: 'covert', baseValue: 780.00, icon: '🔥', accentColor: '#ef4444' },
  { id: 'awp_containment', name: 'Containment Breach', weapon: 'AWP', rarity: 'covert', baseValue: 290.00, icon: '🔥', accentColor: '#ef4444' },
  { id: 'usps_kill_confirmed', name: 'Kill Confirmed', weapon: 'USP-S', rarity: 'covert', baseValue: 210.00, icon: '🔥', accentColor: '#ef4444' },

  // ─── SPECIAL (OR ★ COUTEAUX & GANTS) ────────────────────────────────────────
  { id: 'knife_karambit_doppler', name: '★ Karambit | Doppler (Phase 2)', weapon: 'Couteau Karambit', rarity: 'special', baseValue: 1650.00, icon: '🗡️', accentColor: '#fbbf24' },
  { id: 'knife_butterfly_fade', name: '★ Butterfly Knife | Fade (99%)', weapon: 'Couteau Papillon', rarity: 'special', baseValue: 2450.00, icon: '🗡️', accentColor: '#fbbf24' },
  { id: 'knife_m9_lore', name: '★ M9 Bayonet | Lore', weapon: 'Baïonnette M9', rarity: 'special', baseValue: 1250.00, icon: '🗡️', accentColor: '#fbbf24' },
  { id: 'gloves_sport_vice', name: '★ Sport Gloves | Vice', weapon: 'Gants de Sport', rarity: 'special', baseValue: 3400.00, icon: '🥊', accentColor: '#fbbf24' },
  { id: 'knife_skeleton_slaughter', name: '★ Skeleton Knife | Slaughter', weapon: 'Couteau Squelette', rarity: 'special', baseValue: 1100.00, icon: '🗡️', accentColor: '#fbbf24' },
  { id: 'knife_karambit_tiger', name: '★ Karambit | Tiger Tooth', weapon: 'Couteau Karambit', rarity: 'special', baseValue: 1380.00, icon: '🗡️', accentColor: '#fbbf24' },

  // ─── CONTRABAND & GRAILS (LÉGENDAIRE) ───────────────────────────────────────
  { id: 'awp_dragon_lore', name: 'Dragon Lore (Souvenir)', weapon: 'AWP', rarity: 'contraband', baseValue: 4950.00, icon: '🐉', accentColor: '#f97316' },
  { id: 'm4a4_howl', name: 'Howl (Contrebande)', weapon: 'M4A4', rarity: 'contraband', baseValue: 4100.00, icon: '🐺', accentColor: '#f97316' },
  { id: 'ak47_blue_gem', name: 'Case Hardened (Tier 1 Blue Gem #661)', weapon: 'AK-47', rarity: 'contraband', baseValue: 6800.00, icon: '💎', accentColor: '#f97316' },
];

export const CASES_DATABASE: CaseDefinition[] = [
  // 1. STARTER NOOB CRATE ($5)
  {
    id: 'starter_case',
    name: 'Starter Recrue Case',
    description: 'Parfait pour se faire la main sans se ruiner. Des skins propres avec chance de drop violet et rose !',
    price: 5,
    icon: '📦',
    tag: 'BUDGET',
    color: 'from-blue-600 to-indigo-900',
    skinPool: [
      { skinId: 'p250_sand_dune', weight: 45 },
      { skinId: 'glock_offworld', weight: 25 },
      { skinId: 'usps_blueprint', weight: 15 },
      { skinId: 'm4a4_magnesium', weight: 15 },
      { skinId: 'deagle_conspiracy', weight: 8 },
      { skinId: 'm4a4_evil_daimyo', weight: 6 },
      { skinId: 'awp_mortis', weight: 4 },
      { skinId: 'm4a1s_decimator', weight: 1.5 },
    ]
  },

  // 2. CHROMA & RIDER CRATE ($25)
  {
    id: 'chroma_case',
    name: 'Chroma Neon Case',
    description: 'Couleurs vives et néons rétro. Contient la redoutable AWP Hyper Beast et une infime chance de couteau !',
    price: 25,
    icon: '🔮',
    tag: 'POPULAIRE',
    color: 'from-purple-600 to-pink-900',
    skinPool: [
      { skinId: 'usps_blueprint', weight: 30 },
      { skinId: 'ak47_safari', weight: 25 },
      { skinId: 'deagle_conspiracy', weight: 20 },
      { skinId: 'ak47_cartel', weight: 18 },
      { skinId: 'glock_water_elemental', weight: 15 },
      { skinId: 'm4a1s_decimator', weight: 8 },
      { skinId: 'ak47_neon_rider', weight: 4 },
      { skinId: 'awp_hyper_beast', weight: 3 },
      { skinId: 'knife_skeleton_slaughter', weight: 0.6 },
    ]
  },

  // 3. COVERT HEAVYWEIGHT ($80)
  {
    id: 'covert_case',
    name: 'Covert Syndicate Case',
    description: 'Zéro bleu garanti ! Uniquement du Restricted, Classified, et les plus beaux Coverts du jeu.',
    price: 80,
    icon: '🔥',
    tag: 'HIGH ROLLER',
    color: 'from-rose-600 to-red-950',
    skinPool: [
      { skinId: 'deagle_conspiracy', weight: 25 },
      { skinId: 'awp_atheris', weight: 25 },
      { skinId: 'ak47_cartel', weight: 20 },
      { skinId: 'deagle_code_red', weight: 16 },
      { skinId: 'awp_asiimov', weight: 12 },
      { skinId: 'ak47_redline', weight: 10 },
      { skinId: 'm4a4_the_emperor', weight: 6 },
      { skinId: 'awp_wildfire', weight: 4 },
      { skinId: 'deagle_printstream', weight: 3.5 },
      { skinId: 'ak47_vulcan', weight: 2.5 },
      { skinId: 'knife_m9_lore', weight: 1.2 },
    ]
  },

  // 4. KNIFE & GLOVES MANIA ($250)
  {
    id: 'knife_case',
    name: '★ Knife & Glove Mania',
    description: 'La caisse de rêve pour flex en lobby ! 20% de chances réelles de toucher un couteau légendaire ou des gants Vice.',
    price: 250,
    icon: '🗡️',
    tag: 'GOLD ONLY',
    color: 'from-amber-500 to-yellow-900',
    skinPool: [
      { skinId: 'm4a1s_decimator', weight: 20 },
      { skinId: 'ak47_redline', weight: 18 },
      { skinId: 'awp_asiimov', weight: 16 },
      { skinId: 'm4a4_the_emperor', weight: 15 },
      { skinId: 'm4a1s_printstream', weight: 12 },
      { skinId: 'ak47_vulcan', weight: 10 },
      { skinId: 'knife_skeleton_slaughter', weight: 5 },
      { skinId: 'knife_m9_lore', weight: 4 },
      { skinId: 'knife_karambit_tiger', weight: 3.5 },
      { skinId: 'knife_karambit_doppler', weight: 2.5 },
      { skinId: 'knife_butterfly_fade', weight: 1.8 },
      { skinId: 'gloves_sport_vice', weight: 1.2 },
    ]
  },

  // 5. LEGEND & CONTRABAND ($800)
  {
    id: 'legend_case',
    name: '👑 Dragon & Mythic Grail',
    description: 'L\'élite du marché. Dragon Lore Souvenir, M4A4 Howl et Karambit Doppler. Du très lourd.',
    price: 800,
    icon: '🐉',
    tag: 'LÉGENDAIRE',
    color: 'from-orange-500 to-amber-950',
    skinPool: [
      { skinId: 'm4a1s_printstream', weight: 25 },
      { skinId: 'ak47_fire_serpent', weight: 20 },
      { skinId: 'knife_skeleton_slaughter', weight: 15 },
      { skinId: 'knife_karambit_tiger', weight: 12 },
      { skinId: 'knife_karambit_doppler', weight: 10 },
      { skinId: 'knife_butterfly_fade', weight: 8 },
      { skinId: 'gloves_sport_vice', weight: 5 },
      { skinId: 'm4a4_howl', weight: 3 },
      { skinId: 'awp_dragon_lore', weight: 2 },
      { skinId: 'ak47_blue_gem', weight: 1 },
    ]
  },

  // 6. ALL-IN YOLO VAULT ($2,500)
  {
    id: 'yolo_case',
    name: '💀 All-In YOLO Jackpot',
    description: 'Quitte ou double ultime ! Soit tu repars avec une P250 Sand Dune à 8 centimes, soit tu décroches le Blue Gem #661 ou la Dragon Lore !',
    price: 2500,
    icon: '💀',
    tag: 'EXTRÊME',
    color: 'from-red-600 via-purple-700 to-black',
    skinPool: [
      { skinId: 'p250_sand_dune', weight: 62 }, // Le troll légendaire !
      { skinId: 'knife_karambit_doppler', weight: 12 },
      { skinId: 'knife_butterfly_fade', weight: 10 },
      { skinId: 'gloves_sport_vice', weight: 7 },
      { skinId: 'm4a4_howl', weight: 5 },
      { skinId: 'awp_dragon_lore', weight: 3 },
      { skinId: 'ak47_blue_gem', weight: 2 },
    ]
  }
];

// Helper pour trouver un skin par ID
export function getSkinDefinition(id: string): SkinDefinition {
  const found = SKINS_DATABASE.find(s => s.id === id);
  if (!found) {
    return SKINS_DATABASE[0]; // fallback sand dune
  }
  return found;
}

// Tirer un float réaliste et un coefficient d'usure
export function generateSkinInstance(skinId: string, sourceName: string): {
  skin: SkinDefinition;
  wear: 'FN' | 'MW' | 'FT' | 'WW' | 'BS';
  float: number;
  value: number;
} {
  const skin = getSkinDefinition(skinId);
  const float = Math.random();
  let wear: 'FN' | 'MW' | 'FT' | 'WW' | 'BS' = 'FT';
  let mult = 1.0;

  if (float < 0.07) {
    wear = 'FN'; // Factory New (très recherché !)
    mult = 1.25 + (0.07 - float) * 2;
  } else if (float < 0.15) {
    wear = 'MW'; // Minimal Wear
    mult = 1.10;
  } else if (float < 0.38) {
    wear = 'FT'; // Field-Tested
    mult = 0.95;
  } else if (float < 0.45) {
    wear = 'WW'; // Well-Worn
    mult = 0.82;
  } else {
    wear = 'BS'; // Battle-Scarred
    mult = 0.70;
  }

  // Petites variations aléatoires de 2%
  const randomVar = 0.98 + Math.random() * 0.04;
  const value = parseFloat((skin.baseValue * mult * randomVar).toFixed(2));

  return {
    skin,
    wear,
    float: parseFloat(float.toFixed(4)),
    value
  };
}

// Effectuer un tirage dans une caisse
export function rollCaseDrop(caseDef: CaseDefinition): {
  skin: SkinDefinition;
  wear: 'FN' | 'MW' | 'FT' | 'WW' | 'BS';
  float: number;
  value: number;
} {
  const totalWeight = caseDef.skinPool.reduce((acc, item) => acc + item.weight, 0);
  let randomVal = Math.random() * totalWeight;

  let selectedSkinId = caseDef.skinPool[0].skinId;
  for (const item of caseDef.skinPool) {
    if (randomVal <= item.weight) {
      selectedSkinId = item.skinId;
      break;
    }
    randomVal -= item.weight;
  }

  return generateSkinInstance(selectedSkinId, caseDef.name);
}
