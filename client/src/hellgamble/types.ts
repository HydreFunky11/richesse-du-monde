export type SkinRarity = 
  | 'consumer'    // Gris (Ordinaire)
  | 'milspec'     // Bleu (Mil-Spec)
  | 'restricted'  // Violet (Restricted)
  | 'classified'  // Rose (Classified)
  | 'covert'      // Rouge (Covert)
  | 'special'     // Or ★ (Couteaux & Gants)
  | 'contraband'; // Ambre Flamboyant (Contrebande / Légendaire)

export interface SkinDefinition {
  id: string;
  name: string;
  weapon: string;
  rarity: SkinRarity;
  baseValue: number;
  icon: string;
  accentColor: string;
}

export interface HellItem {
  id: string;
  skinId: string;
  name: string;
  weapon: string;
  rarity: SkinRarity;
  value: number;
  wear: 'FN' | 'MW' | 'FT' | 'WW' | 'BS';
  float: number;
  obtainedAt: number;
  obtainedFrom: string;
}

export interface CaseDefinition {
  id: string;
  name: string;
  description: string;
  price: number;
  icon: string;
  tag: string;
  color: string;
  skinPool: {
    skinId: string;
    weight: number;
  }[];
}

export interface HellPlayer {
  id: string;
  username: string;
  avatar: string;
  cash: number;
  inventory: HellItem[];
  totalOpened: number;
  totalBattlesWon: number;
  bestDrop: HellItem | null;
  netWorth: number;
}

export interface LiveDrop {
  id: string;
  playerId: string;
  playerName: string;
  item: HellItem;
  timestamp: number;
  source: 'CASE' | 'BATTLE' | 'UPGRADE' | 'TRADEUP';
}

export interface BattleParticipant {
  playerId: string;
  username: string;
  avatar: string;
  pulls: HellItem[];
  totalValue: number;
}

export interface CaseBattle {
  id: string;
  name: string;
  hostId: string;
  hostName: string;
  maxPlayers: 2 | 3 | 4;
  caseIds: string[];
  costPerPlayer: number;
  status: 'WAITING' | 'ROLLING' | 'FINISHED';
  participants: BattleParticipant[];
  currentRound: number;
  winnerId: string | null;
  allLoot: HellItem[];
  createdAt: number;
}

export interface HellGambleState {
  roomCode: string;
  players: HellPlayer[];
  liveFeed: LiveDrop[];
  activeBattles: CaseBattle[];
  recentBattles: CaseBattle[];
}

export const RARITY_CONFIG: Record<SkinRarity, {
  label: string;
  color: string;
  bgGradient: string;
  border: string;
  glow: string;
  textColor: string;
}> = {
  consumer: {
    label: 'Standard',
    color: '#94a3b8',
    bgGradient: 'from-slate-900 via-slate-800 to-slate-900',
    border: 'border-slate-600',
    glow: 'shadow-slate-500/20',
    textColor: 'text-slate-300',
  },
  milspec: {
    label: 'Mil-Spec',
    color: '#3b82f6',
    bgGradient: 'from-blue-950/90 via-slate-900 to-blue-900/30',
    border: 'border-blue-500',
    glow: 'shadow-blue-500/30',
    textColor: 'text-blue-400',
  },
  restricted: {
    label: 'Restricted',
    color: '#a855f7',
    bgGradient: 'from-purple-950/90 via-slate-900 to-purple-900/30',
    border: 'border-purple-500',
    glow: 'shadow-purple-500/40',
    textColor: 'text-purple-400',
  },
  classified: {
    label: 'Classified',
    color: '#ec4899',
    bgGradient: 'from-pink-950/90 via-slate-900 to-pink-900/30',
    border: 'border-pink-500',
    glow: 'shadow-pink-500/40',
    textColor: 'text-pink-400',
  },
  covert: {
    label: 'Covert',
    color: '#ef4444',
    bgGradient: 'from-red-950/90 via-slate-900 to-red-900/40',
    border: 'border-red-500',
    glow: 'shadow-red-500/50',
    textColor: 'text-red-400',
  },
  special: {
    label: '★ Couteaux / Gants',
    color: '#fbbf24',
    bgGradient: 'from-amber-950/90 via-slate-900 to-yellow-900/40',
    border: 'border-amber-400',
    glow: 'shadow-amber-400/60 ring-1 ring-amber-400/50',
    textColor: 'text-amber-300',
  },
  contraband: {
    label: 'Légendaire / Grail',
    color: '#f97316',
    bgGradient: 'from-orange-950 via-amber-950 to-red-950',
    border: 'border-orange-500',
    glow: 'shadow-orange-500/80 ring-2 ring-orange-400 animate-pulse',
    textColor: 'text-orange-300 font-bold',
  },
};
