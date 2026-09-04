export type ChaosCellType = 
  | 'DEPART' 
  | 'NORMAL' 
  | 'GOLD' 
  | 'GAMBLE' 
  | 'DEBT' 
  | 'FIGHT' 
  | 'LAVA' 
  | 'BUFF' 
  | 'CURSE' 
  | 'CHEST' 
  | 'PORTAL' 
  | 'CHAOS';

export interface ChaosCell {
  index: number;
  type: ChaosCellType;
  name: string;
  icon: string;
  description: string;
}

export interface ChaosRuleEffect {
  type: 'DAMAGE' | 'HEAL' | 'GOLD_CHANGE' | 'POWER_CHANGE' | 'DEBT_CHANGE' | 'EXTRA_MOVE';
  target: 'CURRENT_PLAYER' | 'ALL_PLAYERS' | 'ALL_OTHER_PLAYERS' | 'RICHEST_PLAYER' | 'POOREST_PLAYER';
  value: number;
}

export interface ChaosRuleCondition {
  type: 'ROLL_EQUALS' | 'ROLL_IS_EVEN' | 'ROLL_IS_ODD' | 'ROLL_GREATER_THAN' | 'CELL_TYPE' | 'ALWAYS';
  value?: any;
}

export interface ChaosBoardMod {
  cellIndex?: number;
  filter?: 'even' | 'odd' | 'all';
  newType: ChaosCellType;
}

export interface ChaosRule {
  id: string;
  roundIntroduced: number;
  authorName: string;
  rawInput: string;
  title: string;
  description: string;
  flavorText: string;
  trigger: 'ON_DICE_ROLL' | 'ON_PASS_DEPART' | 'ON_TURN_START' | 'ON_LAND_CELL' | 'ON_FIGHT' | 'ON_GAMBLE' | 'ON_ROUND_START';
  condition: ChaosRuleCondition;
  effects: ChaosRuleEffect[];
  boardModifications?: ChaosBoardMod[];
}

export interface ChaosPlayer {
  id: string;
  username: string;
  color: string;
  position: number;
  health: number;
  maxHealth: number;
  gold: number;
  power: number;
  debt: number;
  isEliminated: boolean;
  roundsWon: number;
  lapsCompleted: number;
}

export interface ChaosGameState {
  status: 'LOBBY' | 'PLAYING' | 'DRAFTING_RULE' | 'FINISHED';
  roomCode: string;
  roundNumber: number;
  maxRounds: number;
  players: ChaosPlayer[];
  currentPlayerIndex: number;
  board: ChaosCell[];
  lastDiceRoll: number | null;
  activeRules: ChaosRule[];
  draftingPlayerId: string | null;
  draftingPlayerName: string | null;
  draftingReason: string | null;
  isAiGenerating: boolean;
  lastAnnouncement: {
    title: string;
    message: string;
    author: string;
  } | null;
  winner: ChaosPlayer | null;
  log: string[];
}
