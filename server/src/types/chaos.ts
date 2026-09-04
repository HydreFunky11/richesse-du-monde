export interface ChaosEnemy {
  id: string;
  name: string;
  icon: string;
  hp: number;
  maxHp: number;
  atk: number;
  reward?: string;
}

export interface ChaosCellEffect {
  type: 'HEAL' | 'DAMAGE' | 'BUFF_ATK' | 'DEBUFF_ATK' | 'CUSTOM_STAT' | 'NONE';
  value: number;
  statName?: string;
  description: string;
}

export interface ChaosCell {
  id: string;
  name: string;
  icon: string;
  x: number;
  y: number;
  description: string;
  colorTheme?: string;
  effect?: ChaosCellEffect;
  enemies: ChaosEnemy[];
}

export interface ChaosStatDef {
  name: string;
  icon: string;
  description: string;
  defaultValue: number;
}

export interface ChaosPlayer {
  id: string;
  username: string;
  color: string;
  cellId: string;
  hp: number;
  maxHp: number;
  atk: number;
  customStats: Record<string, number>;
  isEliminated: boolean;
  kills: number;
  roundsWon: number;
}

export interface ChaosRuleEffect {
  type: 'DAMAGE' | 'HEAL' | 'MODIFY_ATK' | 'MODIFY_STAT' | 'SPAWN_ENEMY' | 'TELEPORT';
  target: 'CURRENT_PLAYER' | 'ALL_PLAYERS' | 'ALL_OTHER_PLAYERS' | 'TARGET_PLAYER' | 'RANDOM_PLAYER';
  statName?: string;
  value: number;
}

export interface ChaosBoardMutation {
  action: 'ADD_CELL' | 'MODIFY_CELL' | 'REMOVE_CELL' | 'SPAWN_ENEMY' | 'ADD_STAT' | 'MODIFY_STAT';
  cellId?: string;
  cell?: {
    id?: string;
    name?: string;
    icon?: string;
    x?: number;
    y?: number;
    description?: string;
    colorTheme?: string;
  };
  enemy?: {
    name: string;
    icon: string;
    hp: number;
    atk: number;
    reward?: string;
  };
  statDef?: {
    name: string;
    icon: string;
    description: string;
    defaultValue: number;
  };
  target?: 'ALL_PLAYERS' | 'CURRENT_PLAYER' | 'KILLER' | 'VICTIM';
  statName?: string;
  value?: number;
}

export interface ChaosRule {
  id: string;
  roundIntroduced: number;
  authorName: string;
  rawInput: string;
  title: string;
  description: string;
  flavorText: string;
  trigger: 'ON_MOVE' | 'ON_PVP' | 'ON_PVE' | 'ON_KILL' | 'ON_TURN_START' | 'ON_ROUND_START' | 'ON_CELL_ENTER';
  effects: ChaosRuleEffect[];
  boardMutations?: ChaosBoardMutation[];
}

export interface ChaosAiLog {
  timestamp: string;
  status: 'CALLING' | 'SUCCESS' | 'ERROR' | 'FALLBACK';
  model?: string;
  message: string;
  promptSnippet?: string;
  responseSnippet?: string;
  latencyMs?: number;
}

export interface ChaosCombatEvent {
  id: string;
  timestamp: string;
  attackerName: string;
  targetName: string;
  damageDealt: number;
  targetRetaliationDamage?: number;
  targetDied: boolean;
  attackerDied: boolean;
  isPvP: boolean;
  message: string;
}

export interface ChaosDuelState {
  id: string;
  attackerId: string;
  attackerName: string;
  attackerColor: string;
  attackerAtk: number;
  attackerChance: number;
  defenderId: string;
  defenderName: string;
  defenderColor: string;
  defenderAtk: number;
  defenderChance: number;
  winnerId: string;
  winnerName: string;
  loserId: string;
  loserName: string;
  targetAngle: number;
  startedAt: number;
  durationMs: number;
  isResolved: boolean;
}

export interface ChaosGameState {
  status: 'LOBBY' | 'PLAYING' | 'DRAFTING_RULE' | 'FINISHED';
  roomCode: string;
  roundNumber: number;
  maxRounds?: number;
  players: ChaosPlayer[];
  currentPlayerIndex: number;
  cells: ChaosCell[];
  definedStats: ChaosStatDef[];
  activeRules: ChaosRule[];
  draftingPlayerId: string | null;
  draftingPlayerName: string | null;
  draftingReason: string | null;
  isAiGenerating: boolean;
  lastAnnouncement: {
    id: string;
    title: string;
    message: string;
    author: string;
  } | null;
  lastCombatEvent: ChaosCombatEvent | null;
  winner: ChaosPlayer | null;
  log: string[];
  aiLogs: ChaosAiLog[];
  activeDuel: ChaosDuelState | null;
}
