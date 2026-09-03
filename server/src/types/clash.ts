export type ClashTeam = 'blue' | 'red';

export type ClashCardId = 
  | 'knight'
  | 'archers'
  | 'skeletons'
  | 'giant'
  | 'wizard'
  | 'dragon'
  | 'tesla'
  | 'fireball';

export interface ClashCardDef {
  id: ClashCardId;
  name: string;
  cost: number;
  type: 'troop' | 'building' | 'spell';
  description: string;
  emoji: string;
  count?: number;
  targetAir: boolean;
  targetOnlyBuildings: boolean;
}

export interface ClashTower {
  id: string;
  type: 'king' | 'princess_left' | 'princess_right';
  team: ClashTeam;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  range: number;
  damage: number;
  attackSpeed: number; // in seconds
  lastAttackTime: number;
  isActive: boolean; // King tower activates on damage or if princess tower dies
}

export interface ClashUnit {
  id: string;
  cardId: ClashCardId;
  team: ClashTeam;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  damage: number;
  attackSpeed: number; // in seconds
  lastAttackTime: number;
  speed: number;
  range: number;
  isFlying: boolean;
  targetOnlyBuildings: boolean;
  targetAir: boolean;
  aoeRadius?: number;
  targetId?: string | null;
  lifetime?: number; // for buildings
  maxLifetime?: number;
}

export interface ClashProjectile {
  id: string;
  fromX: number;
  fromY: number;
  targetX: number;
  targetY: number;
  currentX: number;
  currentY: number;
  speed: number;
  damage: number;
  aoeRadius?: number;
  type: 'arrow' | 'fireball' | 'cannon' | 'lightning';
  team: ClashTeam;
  targetUnitId?: string;
}

export interface ClashPlayer {
  id: string;
  username: string;
  color: string;
  team: ClashTeam;
  elixir: number;
  hand: ClashCardId[];
  nextCard: ClashCardId;
  deck: ClashCardId[];
  isBot?: boolean;
}

export interface ClashGameState {
  status: 'LOBBY' | 'PLAYING' | 'FINISHED';
  roomCode: string;
  players: ClashPlayer[];
  spectators: { id: string; username: string }[];
  towers: ClashTower[];
  units: ClashUnit[];
  projectiles: ClashProjectile[];
  timer: number; // remaining seconds (e.g. 180s)
  isDoubleElixir: boolean;
  isSuddenDeath: boolean;
  winnerTeam: ClashTeam | 'DRAW' | null;
  winnerUsername: string | null;
  blueScore: number;
  redScore: number;
  log: string[];
}
