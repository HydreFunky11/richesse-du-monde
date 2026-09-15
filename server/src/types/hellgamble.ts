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
  baseValue: number; // Valeur marchande en faux $
  icon: string;      // Emoji ou tag icône
  accentColor: string;
}

export interface HellItem {
  id: string;              // Identifiant unique de l'instance
  skinId: string;
  name: string;
  weapon: string;
  rarity: SkinRarity;
  value: number;           // Valeur réelle calculée avec float/usure
  wear: 'FN' | 'MW' | 'FT' | 'WW' | 'BS'; // Factory New, etc.
  float: number;           // 0.00 - 1.00
  obtainedAt: number;
  obtainedFrom: string;    // Nom de la caisse ou battle
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
    weight: number; // Probabilité relative
  }[];
}

export interface HellPlayer {
  id: string;              // Socket ID
  username: string;
  avatar: string;
  cash: number;            // Solde disponible (départ $1,000)
  inventory: HellItem[];
  totalOpened: number;
  totalBattlesWon: number;
  bestDrop: HellItem | null;
  netWorth: number;        // cash + somme(inventory.value)
  isReady?: boolean;
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
  caseIds: string[];        // Liste des caisses ouvertes dans l'ordre
  costPerPlayer: number;    // Somme des prix des caisses
  status: 'WAITING' | 'ROLLING' | 'FINISHED';
  participants: BattleParticipant[];
  currentRound: number;     // Index de la caisse actuelle (0 à caseIds.length - 1)
  winnerId: string | null;  // Le joueur ayant le score total le plus élevé
  allLoot: HellItem[];      // Tous les skins ouverts dans la battle
  createdAt: number;
}

export interface HellGambleState {
  roomCode: string;
  players: HellPlayer[];
  liveFeed: LiveDrop[];
  activeBattles: CaseBattle[];
  recentBattles: CaseBattle[];
}
