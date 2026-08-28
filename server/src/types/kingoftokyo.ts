export interface KotCard {
  id: string;
  name: string;
  cost: number;
  effect: 'keep' | 'discard';
  description: string;
}

export interface KotPlayer {
  id: string;
  username: string;
  color: string;
  monsterName: string;
  hp: number; // 0 to 10
  vp: number; // 0 to 20
  energy: number;
  cards: KotCard[];
  isDead: boolean;
}

export interface KotGameState {
  status: 'LOBBY' | 'PLAYING' | 'RESOLVING_ATTACK' | 'FINISHED';
  players: KotPlayer[];
  currentPlayerIndex: number;
  tokyoMonsterId: string | null; // Player ID in Tokyo
  dice: string[]; // 6 dice values e.g. ["1", "2", "3", "ATTACK", "HEAL", "ENERGY"]
  diceKept: boolean[]; // 6 elements, true if kept
  rollCount: number; // 0 to 3
  store: KotCard[]; // 3 cards
  log: string[];
  winner: KotPlayer | null;
  pendingYieldRequest: {
    tokyoMonsterId: string;
    attackerId: string;
    damage: number;
  } | null;
}
