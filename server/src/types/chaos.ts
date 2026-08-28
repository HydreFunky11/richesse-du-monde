export type ChaosCellType = 'DEPART' | 'NORMAL' | 'GOLD' | 'GAMBLE' | 'DEBT' | 'FIGHT' | 'PATCH' | 'LAVA' | 'BUFF' | 'CURSE';

export interface ChaosCell {
  index: number;
  type: ChaosCellType;
  modifier?: string; // e.g. custom trap description
}

export interface ChaosPlayer {
  id: string;
  username: string;
  color: string;
  position: number;
  health: number;
  gold: number;
  power: number;
  debt: number;
  isEliminated: boolean;
  eliminatedBy?: string;
}

export interface ChaosGameState {
  status: 'LOBBY' | 'PLAYING' | 'FINISHED';
  players: ChaosPlayer[];
  currentPlayerIndex: number;
  board: ChaosCell[];
  lastDiceRoll: number | null;
  globalModifiers: string[];
  winner: ChaosPlayer | null;
  log: string[];
}
