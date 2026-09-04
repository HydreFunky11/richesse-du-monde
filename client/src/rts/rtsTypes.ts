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
  angle: number;
  turretAngle: number;
  speed: number;
  hp: number;
  maxHp: number;
  shield: number;
  maxShield: number;
  damage: number;
  attackRange: number;
  attackCooldown: number;
  attackRate: number;
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
  constructionProgress: number;
  isConstructed: boolean;
  powerProduction: number;
  powerConsumption: number;
  fuelType?: 'wood' | 'coal';
  fuelStock?: number;
  isUpgraded?: boolean;
  isConnectedToPower: boolean;
  isPowered: boolean;
  queue: {
    unitType: UnitType;
    progress: number;
    totalTicks: number;
  }[];
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
  researchProgress: number;
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
    efficiency: number;
  };
  tech: PlayerTechState;
  ultimateCooldown: number;
  maxUltimateCooldown: number;
  activeShieldDomes: {
    id: string;
    x: number;
    y: number;
    radius: number;
    remainingTicks: number;
  }[];
  empRemainingTicks: number;
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
  progress: number;
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

export const TECH_TREE: Record<TechId, TechNode> = {
  advanced_mining: {
    id: 'advanced_mining',
    name: 'Minage Avancé & Charbon',
    description: 'Débloque la récolte du charbon et l\'amélioration de la Centrale Thermique (+180W).',
    scienceCost: 40,
    researchTimeTicks: 200,
    prerequisites: []
  },
  reinforced_shields: {
    id: 'reinforced_shields',
    name: 'Blindages & Boucliers Renforcés',
    description: '+30% de PV et boucliers énergétiques sur toutes les unités.',
    scienceCost: 70,
    researchTimeTicks: 300,
    prerequisites: ['advanced_mining']
  },
  heavy_vehicles: {
    id: 'heavy_vehicles',
    name: 'Usine de Véhicules & Blindés Lourds',
    description: 'Débloque l\'Usine et les Mechas colossaux, Chars Plasma et Aéroglisseurs.',
    scienceCost: 110,
    researchTimeTicks: 400,
    prerequisites: ['advanced_mining']
  },
  plasma_turrets: {
    id: 'plasma_turrets',
    name: 'Tourelles de Défense Plasma',
    description: 'Débloque les tourelles plasma à haute fréquence défensives.',
    scienceCost: 140,
    researchTimeTicks: 400,
    prerequisites: ['reinforced_shields']
  },
  ultimate_protocol: {
    id: 'ultimate_protocol',
    name: 'Protocole Ultime de Commandant',
    description: 'Débloque l\'arme ultime spécifique à votre faction.',
    scienceCost: 200,
    researchTimeTicks: 500,
    prerequisites: ['heavy_vehicles', 'plasma_turrets']
  }
};

export const UNIT_CONFIGS: Record<UnitType, {
  name: string;
  cost: { metal: number; wood: number; coal: number };
  hp: number;
  shield: number;
  damage: number;
  range: number;
  rate: number;
  speed: number;
  radius: number;
  isFlying: boolean;
  timeTicks: number;
}> = {
  harvester: {
    name: 'Moissonneur / Ouvrier',
    cost: { metal: 50, wood: 0, coal: 0 },
    hp: 150,
    shield: 0,
    damage: 5,
    range: 30,
    rate: 20,
    speed: 2.2,
    radius: 12,
    isFlying: false,
    timeTicks: 120
  },
  scout: {
    name: 'Éclaireur Léger',
    cost: { metal: 70, wood: 10, coal: 0 },
    hp: 130,
    shield: 20,
    damage: 12,
    range: 90,
    rate: 15,
    speed: 3.5,
    radius: 10,
    isFlying: false,
    timeTicks: 140
  },
  assault: {
    name: 'Infanterie d\'Assaut',
    cost: { metal: 110, wood: 20, coal: 0 },
    hp: 220,
    shield: 40,
    damage: 22,
    range: 120,
    rate: 22,
    speed: 2.3,
    radius: 13,
    isFlying: false,
    timeTicks: 200
  },
  heavy_mecha: {
    name: 'Titan Mecha Lourd',
    cost: { metal: 240, wood: 0, coal: 50 },
    hp: 550,
    shield: 150,
    damage: 48,
    range: 140,
    rate: 35,
    speed: 1.6,
    radius: 18,
    isFlying: false,
    timeTicks: 350
  },
  hover_tank: {
    name: 'Char Plasma Aéroglisseur',
    cost: { metal: 200, wood: 30, coal: 30 },
    hp: 420,
    shield: 90,
    damage: 38,
    range: 150,
    rate: 28,
    speed: 2.6,
    radius: 16,
    isFlying: false,
    timeTicks: 300
  },
  dropship: {
    name: 'Chasseur Aérien Gunship',
    cost: { metal: 210, wood: 0, coal: 40 },
    hp: 340,
    shield: 60,
    damage: 30,
    range: 130,
    rate: 20,
    speed: 3.2,
    radius: 15,
    isFlying: true,
    timeTicks: 280
  }
};

export const BUILDING_CONFIGS: Record<BuildingType, {
  name: string;
  cost: { metal: number; wood: number; coal: number };
  hp: number;
  shield: number;
  width: number;
  height: number;
  powerProd: number;
  powerCons: number;
  constructionTicks: number;
  damage?: number;
  range?: number;
  rate?: number;
}> = {
  nexus: {
    name: 'QG / Nexus Central',
    cost: { metal: 500, wood: 0, coal: 0 },
    hp: 3000,
    shield: 500,
    width: 60,
    height: 60,
    powerProd: 40,
    powerCons: 0,
    constructionTicks: 600
  },
  solar_panel: {
    name: 'Panneau Solaire',
    cost: { metal: 80, wood: 0, coal: 0 },
    hp: 350,
    shield: 0,
    width: 32,
    height: 32,
    powerProd: 20,
    powerCons: 0,
    constructionTicks: 100
  },
  wind_turbine: {
    name: 'Éolienne de Haute Altitude',
    cost: { metal: 110, wood: 0, coal: 0 },
    hp: 450,
    shield: 0,
    width: 28,
    height: 28,
    powerProd: 25,
    powerCons: 0,
    constructionTicks: 120
  },
  thermal_plant: {
    name: 'Centrale Thermique Biomasse',
    cost: { metal: 150, wood: 0, coal: 0 },
    hp: 750,
    shield: 0,
    width: 44,
    height: 44,
    powerProd: 60,
    powerCons: 0,
    constructionTicks: 180
  },
  pylon: {
    name: 'Pylône Électrique Relais',
    cost: { metal: 35, wood: 0, coal: 0 },
    hp: 220,
    shield: 0,
    width: 20,
    height: 20,
    powerProd: 0,
    powerCons: 2,
    constructionTicks: 60
  },
  barracks: {
    name: 'Caserne d\'Infanterie',
    cost: { metal: 130, wood: 20, coal: 0 },
    hp: 850,
    shield: 50,
    width: 42,
    height: 42,
    powerProd: 0,
    powerCons: 15,
    constructionTicks: 200
  },
  factory: {
    name: 'Usine de Blindés & Méchas',
    cost: { metal: 230, wood: 40, coal: 0 },
    hp: 1200,
    shield: 100,
    width: 52,
    height: 52,
    powerProd: 0,
    powerCons: 30,
    constructionTicks: 300
  },
  science_lab: {
    name: 'Laboratoire de Recherche',
    cost: { metal: 180, wood: 0, coal: 0 },
    hp: 700,
    shield: 50,
    width: 40,
    height: 40,
    powerProd: 0,
    powerCons: 20,
    constructionTicks: 220
  },
  plasma_turret: {
    name: 'Tourelle Plasma Lourde',
    cost: { metal: 140, wood: 10, coal: 0 },
    hp: 800,
    shield: 150,
    width: 32,
    height: 32,
    powerProd: 0,
    powerCons: 25,
    constructionTicks: 160,
    damage: 32,
    range: 190,
    rate: 22
  }
};
