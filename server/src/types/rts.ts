export type RtsFaction = 'nanite' | 'aegis' | 'phantom' | 'vanguard';

export type ResourceType = 'metal' | 'wood' | 'coal';

export interface ResourceNode {
  id: string;
  type: ResourceType;
  x: number;
  y: number;
  amount: number;
  maxAmount: number;
  radius: number;
}

export type UnitType = 
  | 'harvester'
  | 'scout'
  | 'assault'
  | 'heavy_mecha'
  | 'hover_tank'
  | 'dropship';

export type BuildingType = 
  | 'nexus'
  | 'solar_panel'
  | 'wind_turbine'
  | 'thermal_plant'
  | 'pylon'
  | 'barracks'
  | 'factory'
  | 'science_lab'
  | 'plasma_turret';

export type UnitOrder = 'idle' | 'move' | 'attack' | 'gather' | 'return_cargo' | 'build' | 'repair' | 'hold';

export interface RtsUnit {
  id: string;
  playerId: string;
  faction: RtsFaction;
  type: UnitType;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  angle: number; // chassis facing angle in radians
  turretAngle: number; // turret facing angle in radians
  speed: number;
  hp: number;
  maxHp: number;
  shield: number;
  maxShield: number;
  damage: number;
  attackRange: number;
  attackCooldown: number; // ticks left before next shot
  attackRate: number; // ticks between shots
  order: UnitOrder;
  targetUnitId: string | null;
  targetBuildingId: string | null;
  targetNodeId: string | null;
  cargoType: ResourceType | null;
  cargoAmount: number;
  maxCargo: number;
  radius: number;
  isFlying: boolean;
  isStealthed: boolean;
}

export interface RtsBuilding {
  id: string;
  playerId: string;
  faction: RtsFaction;
  type: BuildingType;
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  shield: number;
  maxShield: number;
  constructionProgress: number; // 0 to 100
  isConstructed: boolean;
  powerProduction: number; // Watts generated
  powerConsumption: number; // Watts required
  fuelType?: 'wood' | 'coal';
  fuelStock?: number;
  isUpgraded?: boolean; // e.g. thermal plant upgraded to coal
  isConnectedToPower: boolean;
  isPowered: boolean; // has enough power in network
  queue: {
    unitType: UnitType;
    progress: number;
    totalTicks: number;
  }[];
  // Turret combat properties
  damage?: number;
  attackRange?: number;
  attackCooldown?: number;
  attackRate?: number;
  targetUnitId?: string | null;
}

export type TechId = 
  | 'advanced_mining'
  | 'reinforced_shields'
  | 'heavy_vehicles'
  | 'plasma_turrets'
  | 'ultimate_protocol';

export interface TechNode {
  id: TechId;
  name: string;
  description: string;
  scienceCost: number;
  researchTimeTicks: number;
  prerequisites: TechId[];
}

export interface PlayerTechState {
  researched: TechId[];
  currentlyResearching: TechId | null;
  researchProgress: number; // ticks completed
  researchTotalTicks: number;
}

export interface RtsPlayer {
  id: string;
  username: string;
  color: string;
  faction: RtsFaction;
  isBot: boolean;
  isAlive: boolean;
  resources: {
    metal: number;
    wood: number;
    coal: number;
    science: number;
  };
  power: {
    production: number;
    consumption: number;
    net: number;
    efficiency: number; // 0.0 to 1.0 (1.0 = fully powered, <1.0 = brownout)
  };
  tech: PlayerTechState;
  ultimateCooldown: number; // ticks left
  maxUltimateCooldown: number;
  activeShieldDomes: {
    id: string;
    x: number;
    y: number;
    radius: number;
    remainingTicks: number;
  }[];
  empRemainingTicks: number; // affected by enemy EMP blackout
}

export interface RtsProjectile {
  id: string;
  shooterId: string;
  targetId: string | null;
  startX: number;
  startY: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speed: number;
  damage: number;
  color: string;
  type: 'bullet' | 'laser' | 'plasma' | 'missile';
  progress: number; // 0 to 1
}

export interface RtsParticleEffect {
  id: string;
  type: 'explosion' | 'spark' | 'smoke' | 'emp_wave' | 'orbital_drop' | 'heal_pulse';
  x: number;
  y: number;
  radius?: number;
  color?: string;
  durationTicks: number;
}

export interface RtsPowerLine {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  active: boolean;
}

export interface RtsGameState {
  status: 'LOBBY' | 'PLAYING' | 'FINISHED';
  roomCode: string;
  players: RtsPlayer[];
  mapWidth: number;
  mapHeight: number;
  resourceNodes: ResourceNode[];
  units: RtsUnit[];
  buildings: RtsBuilding[];
  projectiles: RtsProjectile[];
  powerLines: RtsPowerLine[];
  winner: RtsPlayer | null;
  gameTicks: number;
  log: string[];
}
