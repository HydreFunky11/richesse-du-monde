import { 
  RtsFaction, 
  ResourceType, 
  ResourceNode, 
  UnitType, 
  BuildingType, 
  UnitOrder, 
  RtsUnit, 
  RtsBuilding, 
  TechId, 
  TechNode, 
  RtsPlayer, 
  RtsProjectile, 
  RtsParticleEffect, 
  RtsPowerLine, 
  RtsGameState 
} from '../types/rts';

export const TECH_TREE: Record<TechId, TechNode> = {
  advanced_mining: {
    id: 'advanced_mining',
    name: 'Minage Avancé & Charbon',
    description: 'Débloque la récolte du charbon et l\'amélioration de la Centrale Thermique (+180W).',
    scienceCost: 40,
    researchTimeTicks: 200, // 10s at 20tps
    prerequisites: []
  },
  reinforced_shields: {
    id: 'reinforced_shields',
    name: 'Blindages & Boucliers Renforcés',
    description: '+30% de PV et boucliers énergétiques sur toutes les unités.',
    scienceCost: 70,
    researchTimeTicks: 300, // 15s
    prerequisites: ['advanced_mining']
  },
  heavy_vehicles: {
    id: 'heavy_vehicles',
    name: 'Usine de Véhicules & Blindés Lourds',
    description: 'Débloque l\'Usine et les Mechas colossaux, Chars Plasma et Aéroglisseurs.',
    scienceCost: 110,
    researchTimeTicks: 400, // 20s
    prerequisites: ['advanced_mining']
  },
  plasma_turrets: {
    id: 'plasma_turrets',
    name: 'Tourelles de Défense Plasma',
    description: 'Débloque les tourelles plasma à haute fréquence défensives.',
    scienceCost: 140,
    researchTimeTicks: 400, // 20s
    prerequisites: ['reinforced_shields']
  },
  orbital_satellite: {
    id: 'orbital_satellite',
    name: 'Surveillance Orbitale & Satellites',
    description: 'Débloque la Station Satellite. Une fois alimentée, elle déploie un satellite orbital levant le brouillard de guerre sur toute la planète !',
    scienceCost: 160,
    researchTimeTicks: 400, // 20s
    prerequisites: ['heavy_vehicles']
  },
  ultimate_protocol: {
    id: 'ultimate_protocol',
    name: 'Protocole Ultime de Commandant',
    description: 'Débloque l\'arme ultime spécifique à votre faction.',
    scienceCost: 200,
    researchTimeTicks: 500, // 25s
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
    powerProd: 20, // Vanguard gets +35% -> 27W
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
    powerProd: 60, // upgraded to coal: 180
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
  },
  satellite_uplink: {
    name: 'Station Uplink Satellite',
    cost: { metal: 280, wood: 0, coal: 70 },
    hp: 950,
    shield: 150,
    width: 48,
    height: 48,
    powerProd: 0,
    powerCons: 50,
    constructionTicks: 280
  }
};

export class RtsEngine {
  private state: RtsGameState;
  private intervalId: NodeJS.Timeout | null = null;
  private onUpdateCallback?: (state: RtsGameState) => void;

  constructor(roomCode: string, onUpdate?: (state: RtsGameState) => void) {
    this.onUpdateCallback = onUpdate;
    this.state = {
      status: 'LOBBY',
      roomCode: roomCode.toUpperCase(),
      players: [],
      mapWidth: 3200,
      mapHeight: 2200,
      resourceNodes: [],
      units: [],
      buildings: [],
      projectiles: [],
      powerLines: [],
      winner: null,
      gameTicks: 0,
      log: ['🚀 Salon Cyber-Grid créé. Choisissez vos factions.']
    };
  }

  public getState(): RtsGameState {
    return this.state;
  }

  public getPlayers(): RtsPlayer[] {
    return this.state.players;
  }

  public addPlayer(id: string, username: string, color: string): boolean {
    if (this.state.status !== 'LOBBY' || this.state.players.length >= 2) {
      return false;
    }

    const factions: RtsFaction[] = ['nanite', 'aegis', 'phantom', 'vanguard'];
    const assignedFaction = factions[this.state.players.length % factions.length];

    const player: RtsPlayer = {
      id,
      username,
      color,
      faction: assignedFaction,
      isBot: false,
      isAlive: true,
      resources: { metal: 250, wood: 80, coal: 0, science: 0 },
      power: { production: 0, consumption: 0, net: 0, efficiency: 1.0 },
      tech: {
        researched: [],
        currentlyResearching: null,
        researchProgress: 0,
        researchTotalTicks: 0
      },
      ultimateCooldown: 0,
      maxUltimateCooldown: 900, // 45s at 20tps
      activeShieldDomes: [],
      empRemainingTicks: 0,
      hasSatelliteVision: false
    };

    this.state.players.push(player);
    this.state.log.push(`👤 ${username} a rejoint les rangs (${assignedFaction.toUpperCase()}).`);
    return true;
  }

  public selectFaction(playerId: string, faction: RtsFaction): boolean {
    const player = this.state.players.find(p => p.id === playerId);
    if (!player || this.state.status !== 'LOBBY') return false;
    player.faction = faction;
    this.state.log.push(`🔄 ${player.username} a choisi la faction ${faction.toUpperCase()}.`);
    return true;
  }

  public addBot(): boolean {
    if (this.state.status !== 'LOBBY' || this.state.players.length >= 2) return false;
    const botId = `bot_${Date.now()}`;
    const botFaction: RtsFaction = 'aegis';
    const player: RtsPlayer = {
      id: botId,
      username: 'IA Synth-Nexus',
      color: '#EF4444',
      faction: botFaction,
      isBot: true,
      isAlive: true,
      resources: { metal: 300, wood: 100, coal: 0, science: 0 },
      power: { production: 0, consumption: 0, net: 0, efficiency: 1.0 },
      tech: {
        researched: [],
        currentlyResearching: null,
        researchProgress: 0,
        researchTotalTicks: 0
      },
      ultimateCooldown: 0,
      maxUltimateCooldown: 900,
      activeShieldDomes: [],
      empRemainingTicks: 0,
      hasSatelliteVision: false
    };
    this.state.players.push(player);
    this.state.log.push(`🤖 IA Synth-Nexus a rejoint le secteur (AEGIS).`);
    return true;
  }

  public removePlayer(playerId: string): void {
    if (this.state.status === 'LOBBY') {
      this.state.players = this.state.players.filter(p => p.id !== playerId);
    } else {
      const p = this.state.players.find(pl => pl.id === playerId);
      if (p) {
        p.isAlive = false;
        this.checkVictory();
      }
    }
  }

  public startGame(): boolean {
    if (this.state.players.length < 1) return false;

    // If only 1 human player, auto add Bot
    if (this.state.players.length === 1) {
      this.addBot();
    }

    this.state.status = 'PLAYING';
    this.state.gameTicks = 0;
    this.state.units = [];
    this.state.buildings = [];
    this.state.projectiles = [];
    this.state.powerLines = [];

    this.spawnBasesAndResources();

    this.state.log.push(`⚔️ Déploiement initial commencé ! Énergie et réseau connectés.`);

    this.startLoop();
    return true;
  }

  private spawnBasesAndResources(): void {
    const W = this.state.mapWidth;
    const H = this.state.mapHeight;

    const p1 = this.state.players[0];
    const p2 = this.state.players[1];

    // Band 1: West (X: 350 to 600, Y: 350 to H - 350)
    const p1X = 350 + Math.floor(Math.random() * 250);
    const p1Y = 350 + Math.floor(Math.random() * (H - 700));

    // Band 2: East (X: W - 600 to W - 350, Y: 350 to H - 350)
    // Ensure not in horizontal straight line: |p1Y - p2Y| >= 450
    const p2X = W - 600 + Math.floor(Math.random() * 250);
    let p2Y = 350 + Math.floor(Math.random() * (H - 700));
    let attempts = 0;
    while (Math.abs(p1Y - p2Y) < 450 && attempts < 50) {
      p2Y = 350 + Math.floor(Math.random() * (H - 700));
      attempts++;
    }

    const nodes: ResourceNode[] = [];

    // Helper to spawn starter resources around a base
    const spawnBaseCluster = (baseX: number, baseY: number, prefix: string) => {
      // 2 Metal patches
      nodes.push({ id: `${prefix}_m1`, type: 'metal', x: baseX - 120, y: baseY - 70, amount: 3500, maxAmount: 3500, radius: 26 });
      nodes.push({ id: `${prefix}_m2`, type: 'metal', x: baseX - 120, y: baseY + 70, amount: 3500, maxAmount: 3500, radius: 26 });
      // 2 Wood groves
      nodes.push({ id: `${prefix}_w1`, type: 'wood', x: baseX + 130, y: baseY - 80, amount: 2500, maxAmount: 2500, radius: 32 });
      nodes.push({ id: `${prefix}_w2`, type: 'wood', x: baseX + 130, y: baseY + 80, amount: 2500, maxAmount: 2500, radius: 32 });
      // 1 Coal deposit
      nodes.push({ id: `${prefix}_c1`, type: 'coal', x: baseX, y: baseY + (baseY > H / 2 ? -150 : 150), amount: 3000, maxAmount: 3000, radius: 28 });
    };

    if (p1) {
      this.createBuilding(p1.id, 'nexus', p1X, p1Y, true);
      this.createBuilding(p1.id, 'solar_panel', p1X, p1Y - 70, true);
      this.createUnit(p1.id, 'harvester', p1X - 50, p1Y - 20);
      this.createUnit(p1.id, 'harvester', p1X - 50, p1Y + 20);
      spawnBaseCluster(p1X, p1Y, 'p1');
    }

    if (p2) {
      this.createBuilding(p2.id, 'nexus', p2X, p2Y, true);
      this.createBuilding(p2.id, 'solar_panel', p2X, p2Y - 70, true);
      this.createUnit(p2.id, 'harvester', p2X + 50, p2Y - 20);
      this.createUnit(p2.id, 'harvester', p2X + 50, p2Y + 20);
      spawnBaseCluster(p2X, p2Y, 'p2');
    }

    // Neutral Strategic Outposts across the 3200x2200 map
    nodes.push({ id: 'center_m1', type: 'metal', x: W / 2, y: H / 2 - 250, amount: 5000, maxAmount: 5000, radius: 35 });
    nodes.push({ id: 'center_m2', type: 'metal', x: W / 2, y: H / 2 + 250, amount: 5000, maxAmount: 5000, radius: 35 });
    nodes.push({ id: 'center_c1', type: 'coal', x: W / 2 - 120, y: H / 2, amount: 4500, maxAmount: 4500, radius: 30 });
    nodes.push({ id: 'center_c2', type: 'coal', x: W / 2 + 120, y: H / 2, amount: 4500, maxAmount: 4500, radius: 30 });
    nodes.push({ id: 'center_w1', type: 'wood', x: W / 2, y: H / 2, amount: 3500, maxAmount: 3500, radius: 38 });

    // North & South contested expansions
    nodes.push({ id: 'north_m', type: 'metal', x: W / 2 - 400, y: 350, amount: 4000, maxAmount: 4000, radius: 30 });
    nodes.push({ id: 'north_c', type: 'coal', x: W / 2 + 400, y: 350, amount: 3500, maxAmount: 3500, radius: 28 });
    nodes.push({ id: 'north_w', type: 'wood', x: W / 2, y: 250, amount: 3000, maxAmount: 3000, radius: 35 });

    nodes.push({ id: 'south_m', type: 'metal', x: W / 2 + 400, y: H - 350, amount: 4000, maxAmount: 4000, radius: 30 });
    nodes.push({ id: 'south_c', type: 'coal', x: W / 2 - 400, y: H - 350, amount: 3500, maxAmount: 3500, radius: 28 });
    nodes.push({ id: 'south_w', type: 'wood', x: W / 2, y: H - 250, amount: 3000, maxAmount: 3000, radius: 35 });

    // Flank outposts
    nodes.push({ id: 'west_outpost_m', type: 'metal', x: 1000, y: H / 2, amount: 3500, maxAmount: 3500, radius: 28 });
    nodes.push({ id: 'east_outpost_m', type: 'metal', x: W - 1000, y: H / 2, amount: 3500, maxAmount: 3500, radius: 28 });

    this.state.resourceNodes = nodes;
  }

  public createBuilding(playerId: string, type: BuildingType, x: number, y: number, instant: boolean = false): RtsBuilding | null {
    const player = this.state.players.find(p => p.id === playerId);
    if (!player) return null;

    const conf = BUILDING_CONFIGS[type];
    if (!conf) return null;

    // Deduct cost if not instant
    if (!instant) {
      if (player.resources.metal < conf.cost.metal ||
          player.resources.wood < conf.cost.wood ||
          player.resources.coal < conf.cost.coal) {
        return null;
      }
      player.resources.metal -= conf.cost.metal;
      player.resources.wood -= conf.cost.wood;
      player.resources.coal -= conf.cost.coal;
    }

    let prod = conf.powerProd;
    if (type === 'solar_panel' && player.faction === 'vanguard') {
      prod = Math.round(prod * 1.35); // Vanguard solar bonus
    }

    let hp = conf.hp;
    let shield = conf.shield;
    if (player.tech.researched.includes('reinforced_shields')) {
      hp = Math.round(hp * 1.3);
      shield += 100;
    }

    const building: RtsBuilding = {
      id: `b_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      playerId,
      faction: player.faction,
      type,
      x,
      y,
      width: conf.width,
      height: conf.height,
      hp: instant ? hp : Math.round(hp * 0.1),
      maxHp: hp,
      shield: instant ? shield : 0,
      maxShield: shield,
      constructionProgress: instant ? 100 : 0,
      isConstructed: instant,
      powerProduction: prod,
      powerConsumption: conf.powerCons,
      fuelType: type === 'thermal_plant' ? 'wood' : undefined,
      fuelStock: type === 'thermal_plant' ? 20 : undefined,
      isUpgraded: false,
      isConnectedToPower: false,
      isPowered: true,
      queue: [],
      damage: conf.damage,
      attackRange: conf.range,
      attackCooldown: 0,
      attackRate: conf.rate,
      targetUnitId: null
    };

    this.state.buildings.push(building);
    return building;
  }

  public createUnit(playerId: string, type: UnitType, x: number, y: number): RtsUnit | null {
    const player = this.state.players.find(p => p.id === playerId);
    if (!player) return null;

    const conf = UNIT_CONFIGS[type];
    if (!conf) return null;

    let hp = conf.hp;
    let shield = conf.shield;
    let speed = conf.speed;

    if (player.faction === 'aegis') {
      shield += 40;
    } else if (player.faction === 'vanguard') {
      speed *= 1.25;
    }

    if (player.tech.researched.includes('reinforced_shields')) {
      hp = Math.round(hp * 1.3);
      shield += 30;
    }

    const unit: RtsUnit = {
      id: `u_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      playerId,
      faction: player.faction,
      type,
      x,
      y,
      targetX: x,
      targetY: y,
      angle: 0,
      turretAngle: 0,
      speed,
      hp,
      maxHp: hp,
      shield,
      maxShield: shield,
      damage: conf.damage,
      attackRange: conf.range,
      attackCooldown: 0,
      attackRate: conf.rate,
      order: 'idle',
      targetUnitId: null,
      targetBuildingId: null,
      targetNodeId: null,
      cargoType: null,
      cargoAmount: 0,
      maxCargo: 20,
      radius: conf.radius,
      isFlying: conf.isFlying,
      isStealthed: player.faction === 'phantom'
    };

    this.state.units.push(unit);
    return unit;
  }

  // Handle Orders from Player Client
  public handleOrder(playerId: string, unitIds: string[], orderType: UnitOrder, targetX?: number, targetY?: number, targetId?: string): boolean {
    const player = this.state.players.find(p => p.id === playerId);
    if (!player) return false;

    const myUnits = this.state.units.filter(u => u.playerId === playerId && unitIds.includes(u.id));
    if (myUnits.length === 0) return false;

    for (const unit of myUnits) {
      unit.order = orderType;
      unit.targetUnitId = null;
      unit.targetBuildingId = null;
      unit.targetNodeId = null;

      if (orderType === 'move' && targetX !== undefined && targetY !== undefined) {
        unit.targetX = targetX;
        unit.targetY = targetY;
      } else if (orderType === 'attack' && targetId) {
        const targetUnit = this.state.units.find(u => u.id === targetId);
        const targetBld = this.state.buildings.find(b => b.id === targetId);
        if (targetUnit) {
          unit.targetUnitId = targetId;
          unit.targetX = targetUnit.x;
          unit.targetY = targetUnit.y;
        } else if (targetBld) {
          unit.targetBuildingId = targetId;
          unit.targetX = targetBld.x;
          unit.targetY = targetBld.y;
        }
      } else if (orderType === 'gather' && targetId) {
        const node = this.state.resourceNodes.find(n => n.id === targetId);
        if (node && unit.type === 'harvester') {
          unit.targetNodeId = targetId;
          unit.targetX = node.x;
          unit.targetY = node.y;
        }
      } else if (orderType === 'hold' || orderType === 'idle') {
        unit.targetX = unit.x;
        unit.targetY = unit.y;
      }
    }
    return true;
  }

  public handleBuild(playerId: string, buildingType: BuildingType, x: number, y: number): boolean {
    const player = this.state.players.find(p => p.id === playerId);
    if (!player) return false;

    // Check tech prerequisites
    if (buildingType === 'factory' && !player.tech.researched.includes('heavy_vehicles')) return false;
    if (buildingType === 'plasma_turret' && !player.tech.researched.includes('plasma_turrets')) return false;
    if (buildingType === 'satellite_uplink' && !player.tech.researched.includes('orbital_satellite')) return false;

    const conf = BUILDING_CONFIGS[buildingType];
    if (!conf) return false;

    // Check cost
    let metalCost = conf.cost.metal;
    if (player.faction === 'nanite' && (buildingType === 'solar_panel' || buildingType === 'wind_turbine')) {
      metalCost = Math.round(metalCost * 0.85);
    }

    if (player.resources.metal < metalCost ||
        player.resources.wood < conf.cost.wood ||
        player.resources.coal < conf.cost.coal) {
      return false;
    }

    // Check bounds & collision with existing buildings
    if (x < 50 || x > this.state.mapWidth - 50 || y < 50 || y > this.state.mapHeight - 50) return false;

    for (const b of this.state.buildings) {
      const dist = Math.hypot(b.x - x, b.y - y);
      if (dist < (b.width + conf.width) / 2 + 10) {
        return false; // too close / overlapping
      }
    }

    const bld = this.createBuilding(playerId, buildingType, x, y, false);
    if (bld) {
      this.state.log.push(`🏗️ ${player.username} a lancé la construction : ${conf.name}.`);
      return true;
    }
    return false;
  }

  public handleProduceUnit(playerId: string, buildingId: string, unitType: UnitType): boolean {
    const player = this.state.players.find(p => p.id === playerId);
    const building = this.state.buildings.find(b => b.id === buildingId && b.playerId === playerId);
    if (!player || !building || !building.isConstructed) return false;

    // Validate factory / barracks types
    if (building.type === 'nexus' && unitType !== 'harvester') return false;
    if (building.type === 'barracks' && unitType !== 'scout' && unitType !== 'assault') return false;
    if (building.type === 'factory' && (unitType !== 'heavy_mecha' && unitType !== 'hover_tank' && unitType !== 'dropship')) return false;

    const conf = UNIT_CONFIGS[unitType];
    if (!conf) return false;

    let metalCost = conf.cost.metal;
    if (player.faction === 'nanite' && (unitType === 'harvester' || unitType === 'scout')) {
      metalCost = Math.round(metalCost * 0.8);
    }

    if (player.resources.metal < metalCost ||
        player.resources.wood < conf.cost.wood ||
        player.resources.coal < conf.cost.coal) {
      return false;
    }

    player.resources.metal -= metalCost;
    player.resources.wood -= conf.cost.wood;
    player.resources.coal -= conf.cost.coal;

    building.queue.push({
      unitType,
      progress: 0,
      totalTicks: conf.timeTicks
    });

    return true;
  }

  public handleUpgradePlant(playerId: string, buildingId: string): boolean {
    const player = this.state.players.find(p => p.id === playerId);
    const building = this.state.buildings.find(b => b.id === buildingId && b.playerId === playerId);
    if (!player || !building || building.type !== 'thermal_plant' || building.isUpgraded) return false;

    if (!player.tech.researched.includes('advanced_mining')) return false;
    if (player.resources.metal < 100) return false;

    player.resources.metal -= 100;
    building.isUpgraded = true;
    building.fuelType = 'coal';
    building.powerProduction = 180;
    this.state.log.push(`🔥 Centrale thermique de ${player.username} convertie au CHARBON (+180W) !`);
    return true;
  }

  public handleResearch(playerId: string, techId: TechId): boolean {
    const player = this.state.players.find(p => p.id === playerId);
    if (!player) return false;

    const tech = TECH_TREE[techId];
    if (!tech) return false;

    if (player.tech.researched.includes(techId) || player.tech.currentlyResearching === techId) return false;

    // Check prerequisites
    for (const prereq of tech.prerequisites) {
      if (!player.tech.researched.includes(prereq)) return false;
    }

    // Check science labs
    const hasPoweredLab = this.state.buildings.some(b => b.playerId === playerId && b.type === 'science_lab' && b.isConstructed && b.isPowered);
    if (!hasPoweredLab) return false;

    if (player.resources.science < tech.scienceCost) return false;

    player.resources.science -= tech.scienceCost;
    player.tech.currentlyResearching = techId;
    player.tech.researchProgress = 0;
    player.tech.researchTotalTicks = tech.researchTimeTicks;

    this.state.log.push(`🔬 ${player.username} a lancé la recherche : ${tech.name}.`);
    return true;
  }

  public handleActivateUltimate(playerId: string, targetX: number, targetY: number): boolean {
    const player = this.state.players.find(p => p.id === playerId);
    if (!player || player.ultimateCooldown > 0) return false;
    if (!player.tech.researched.includes('ultimate_protocol')) return false;

    player.ultimateCooldown = player.maxUltimateCooldown;

    if (player.faction === 'nanite') {
      // Reconstitution d'Urgence (10s = 200 ticks)
      (player as any).reconstitutionTicks = 200;
      this.state.log.push(`🤖 ULTIME : Reconstitution d'Urgence activée par ${player.username} ! (50% de respawn pendant 10s)`);
    } else if (player.faction === 'aegis') {
      // Dôme d'Invulnérabilité (6s = 120 ticks, radius 160)
      player.activeShieldDomes.push({
        id: `dome_${Date.now()}`,
        x: targetX,
        y: targetY,
        radius: 160,
        remainingTicks: 120
      });
      this.state.log.push(`🛡️ ULTIME : Dôme d'Invulnérabilité déployé en (${Math.round(targetX)}, ${Math.round(targetY)}) !`);
    } else if (player.faction === 'phantom') {
      // Blackout EMP (10s = 200 ticks) on all enemies
      for (const enemy of this.state.players) {
        if (enemy.id !== playerId) {
          enemy.empRemainingTicks = 200;
        }
      }
      this.state.log.push(`⚡ ULTIME : BLACKOUT EMP mondial ! Les réseaux électriques ennemis sont foudroyés !`);
    } else if (player.faction === 'vanguard') {
      // Orbital Drop: 3 heavy mechas drop at target location
      this.createUnit(playerId, 'heavy_mecha', targetX - 25, targetY);
      this.createUnit(playerId, 'heavy_mecha', targetX + 25, targetY);
      this.createUnit(playerId, 'heavy_mecha', targetX, targetY - 30);
      this.state.log.push(`🚀 ULTIME : Capsule Orbitale larguée ! 3 Mechas lourds ont atterri !`);
    }

    return true;
  }

  // ─── TICK LOOP (20 TPS = 50ms) ──────────────────────────────────────────

  private startLoop(): void {
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = setInterval(() => {
      this.tick();
      if (this.onUpdateCallback) {
        this.onUpdateCallback(this.state);
      }
    }, 50);
  }

  public stopLoop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private tick(): void {
    if (this.state.status !== 'PLAYING') return;
    this.state.gameTicks++;

    // 1. Solve Power Grid
    this.solvePowerGrid();

    // 2. Update Construction & Production
    this.updateBuildings();

    // 3. Update Science & Tech Trees
    this.updateScience();

    // 4. Update Units (Movement, Harvester AI, Steering)
    this.updateUnits();

    // 5. Combat, Turrets & Projectiles
    this.updateCombat();

    // 6. Bot AI Execution
    this.updateBotAI();

    // 7. Check Victory
    this.checkVictory();
  }

  // ─── POWER GRID SYSTEM (Cables, Pylons, Watts balance) ─────────────────

  private solvePowerGrid(): void {
    const lines: RtsPowerLine[] = [];

    for (const player of this.state.players) {
      if (player.empRemainingTicks > 0) {
        player.empRemainingTicks--;
      }

      if ((player as any).reconstitutionTicks > 0) {
        (player as any).reconstitutionTicks--;
      }

      // Decrement ultimate cooldown
      if (player.ultimateCooldown > 0) {
        player.ultimateCooldown--;
      }

      // Update active shield domes
      player.activeShieldDomes = player.activeShieldDomes.filter(d => {
        d.remainingTicks--;
        return d.remainingTicks > 0;
      });

      const playerBuildings = this.state.buildings.filter(b => b.playerId === player.id && b.isConstructed);
      const nexus = playerBuildings.find(b => b.type === 'nexus');

      if (!nexus) {
        // Base destroyed
        player.power = { production: 0, consumption: 0, net: 0, efficiency: 0 };
        continue;
      }

      // Build graph adjacency: Nexus and Pylons act as relays
      // Connection range: Nexus: 220px, Pylon: 260px, Other buildings: within range of any relay
      const RELAY_RANGE = 260;
      const connectedSet = new Set<string>();
      connectedSet.add(nexus.id);

      let changed = true;
      while (changed) {
        changed = false;
        for (const b of playerBuildings) {
          if (connectedSet.has(b.id)) continue;
          // Check if within range of any already connected relay (nexus or pylon)
          for (const connectedId of connectedSet) {
            const connectedBld = playerBuildings.find(cb => cb.id === connectedId);
            if (!connectedBld) continue;
            const isRelay = connectedBld.type === 'nexus' || connectedBld.type === 'pylon';
            if (!isRelay && b.type !== 'pylon') continue;

            const dist = Math.hypot(b.x - connectedBld.x, b.y - connectedBld.y);
            if (dist <= RELAY_RANGE) {
              connectedSet.add(b.id);
              changed = true;
              break;
            }
          }
        }
      }

      // Collect power lines between connected relays/buildings
      for (let i = 0; i < playerBuildings.length; i++) {
        for (let j = i + 1; j < playerBuildings.length; j++) {
          const b1 = playerBuildings[i];
          const b2 = playerBuildings[j];
          const dist = Math.hypot(b1.x - b2.x, b1.y - b2.y);
          if (dist <= RELAY_RANGE) {
            const bothRelays = (b1.type === 'nexus' || b1.type === 'pylon') && (b2.type === 'nexus' || b2.type === 'pylon');
            const oneRelay = (b1.type === 'nexus' || b1.type === 'pylon') || (b2.type === 'nexus' || b2.type === 'pylon');
            if (bothRelays || oneRelay) {
              const active = connectedSet.has(b1.id) && connectedSet.has(b2.id) && player.empRemainingTicks <= 0;
              lines.push({
                playerId: player.id,
                fromX: b1.x,
                fromY: b1.y,
                toX: b2.x,
                toY: b2.y,
                active
              });
            }
          }
        }
      }

      // Calculate production & consumption
      let totalProd = 0;
      let totalCons = 0;

      for (const b of playerBuildings) {
        b.isConnectedToPower = connectedSet.has(b.id);

        if (b.isConnectedToPower) {
          // Fuel consumption for thermal plants
          if (b.type === 'thermal_plant') {
            if (b.isUpgraded) {
              // Consumes 1 coal every 100 ticks (5s)
              if (this.state.gameTicks % 100 === 0) {
                if (player.resources.coal > 0) {
                  player.resources.coal -= 1;
                  b.powerProduction = 180;
                } else {
                  b.powerProduction = 0; // out of coal!
                }
              }
            } else {
              // Consumes 1 wood every 80 ticks (4s)
              if (this.state.gameTicks % 80 === 0) {
                if (player.resources.wood > 0) {
                  player.resources.wood -= 1;
                  b.powerProduction = 60;
                } else {
                  b.powerProduction = 0; // out of wood!
                }
              }
            }
          }

          totalProd += b.powerProduction;
          totalCons += b.powerConsumption;
        }
      }

      // EMP Blackout sets production to 0
      if (player.empRemainingTicks > 0) {
        totalProd = 0;
      }

      const net = totalProd - totalCons;
      const efficiency = totalProd >= totalCons ? 1.0 : (totalProd / Math.max(1, totalCons));

      player.power = {
        production: totalProd,
        consumption: totalCons,
        net,
        efficiency
      };

      // Mark powered status for buildings
      for (const b of playerBuildings) {
        b.isPowered = b.isConnectedToPower && efficiency >= 0.5 && player.empRemainingTicks <= 0;
      }

      // Satellite vision active if player has an operational, powered satellite uplink
      player.hasSatelliteVision = playerBuildings.some(b => b.type === 'satellite_uplink' && b.isPowered);
    }

    this.state.powerLines = lines;
  }

  // ─── BUILDINGS & PRODUCTION ─────────────────────────────────────────────

  private updateBuildings(): void {
    for (const b of this.state.buildings) {
      const player = this.state.players.find(p => p.id === b.playerId);
      if (!player) continue;

      // Nanite passive building auto-regen
      if (player.faction === 'nanite' && b.isConstructed && b.hp < b.maxHp) {
        if (this.state.gameTicks % 20 === 0) {
          b.hp = Math.min(b.maxHp, b.hp + Math.round(b.maxHp * 0.01));
        }
      }

      // Construction progress
      if (!b.isConstructed) {
        const speed = player.power.efficiency;
        b.constructionProgress += (100 / (BUILDING_CONFIGS[b.type].constructionTicks || 100)) * Math.max(0.2, speed);
        b.hp = Math.min(b.maxHp, Math.round((b.constructionProgress / 100) * b.maxHp));
        if (b.constructionProgress >= 100) {
          b.isConstructed = true;
          b.constructionProgress = 100;
          this.state.log.push(`✅ Construction terminée : ${BUILDING_CONFIGS[b.type].name}.`);
        }
      }

      // Unit queue progression
      if (b.isConstructed && b.isPowered && b.queue.length > 0) {
        const item = b.queue[0];
        const eff = player.power.efficiency;
        item.progress += Math.max(0.2, eff);

        if (item.progress >= item.totalTicks) {
          // Spawn unit right outside building
          const spawnAngle = Math.random() * Math.PI * 2;
          const spawnDist = (b.width / 2) + 25;
          const spawnX = b.x + Math.cos(spawnAngle) * spawnDist;
          const spawnY = b.y + Math.sin(spawnAngle) * spawnDist;

          this.createUnit(b.playerId, item.unitType, spawnX, spawnY);
          b.queue.shift();
        }
      }
    }
  }

  // ─── SCIENCE & TECH TREES ───────────────────────────────────────────────

  private updateScience(): void {
    // Every 20 ticks (1s), generate science from active Labs
    if (this.state.gameTicks % 20 === 0) {
      for (const player of this.state.players) {
        const labs = this.state.buildings.filter(b => b.playerId === player.id && b.type === 'science_lab' && b.isConstructed && b.isPowered);
        player.resources.science += labs.length; // +1 science/s per lab
      }
    }

    // Advance currently researching tech
    for (const player of this.state.players) {
      if (player.tech.currentlyResearching) {
        const eff = player.power.efficiency;
        player.tech.researchProgress += Math.max(0.1, eff);

        if (player.tech.researchProgress >= player.tech.researchTotalTicks) {
          const techId = player.tech.currentlyResearching;
          player.tech.researched.push(techId);
          player.tech.currentlyResearching = null;
          player.tech.researchProgress = 0;

          const techDef = TECH_TREE[techId];
          this.state.log.push(`🎓 RECHERCHE COMPLÉTÉE : ${techDef.name} (${player.username}) !`);

          // Apply instant buffs
          if (techId === 'reinforced_shields') {
            for (const u of this.state.units.filter(unit => unit.playerId === player.id)) {
              u.maxHp = Math.round(u.maxHp * 1.3);
              u.hp = Math.min(u.maxHp, u.hp + 50);
              u.maxShield += 30;
              u.shield += 30;
            }
          }
        }
      }
    }
  }

  // ─── UNITS, MOVEMENT & HARVESTING ───────────────────────────────────────

  private updateUnits(): void {
    const W = this.state.mapWidth;
    const H = this.state.mapHeight;

    for (const unit of this.state.units) {
      const player = this.state.players.find(p => p.id === unit.playerId);
      if (!player) continue;

      // Nanite unit passive self-repair
      if (player.faction === 'nanite' && unit.hp < unit.maxHp && this.state.gameTicks % 40 === 0) {
        unit.hp = Math.min(unit.maxHp, unit.hp + 2);
      }

      // Shield regeneration (if powered and not recently damaged)
      if (unit.shield < unit.maxShield && this.state.gameTicks % 30 === 0 && player.power.efficiency >= 0.5) {
        unit.shield = Math.min(unit.maxShield, unit.shield + 2);
      }

      // Harvester logic
      if (unit.type === 'harvester') {
        this.updateHarvester(unit, player);
      }

      // Movement & Steering toward targetX, targetY
      const dx = unit.targetX - unit.x;
      const dy = unit.targetY - unit.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 5) {
        const moveAngle = Math.atan2(dy, dx);
        unit.angle = moveAngle;

        const moveSpeed = Math.min(dist, unit.speed);
        unit.x += Math.cos(moveAngle) * moveSpeed;
        unit.y += Math.sin(moveAngle) * moveSpeed;

        // Keep inside map bounds
        unit.x = Math.max(unit.radius, Math.min(W - unit.radius, unit.x));
        unit.y = Math.max(unit.radius, Math.min(H - unit.radius, unit.y));
      } else if (unit.order === 'move') {
        unit.order = 'idle';
      }

      // Turret tracking
      if (unit.targetUnitId) {
        const target = this.state.units.find(u => u.id === unit.targetUnitId);
        if (target) {
          unit.turretAngle = Math.atan2(target.y - unit.y, target.x - unit.x);
        }
      } else if (unit.targetBuildingId) {
        const targetBld = this.state.buildings.find(b => b.id === unit.targetBuildingId);
        if (targetBld) {
          unit.turretAngle = Math.atan2(targetBld.y - unit.y, targetBld.x - unit.x);
        }
      } else {
        unit.turretAngle = unit.angle;
      }
    }
  }

  private updateHarvester(unit: RtsUnit, player: RtsPlayer): void {
    if (unit.order === 'gather' && unit.targetNodeId) {
      const node = this.state.resourceNodes.find(n => n.id === unit.targetNodeId);
      if (!node || node.amount <= 0) {
        // Node depleted! Find nearest node of same type
        const nextNode = this.state.resourceNodes
          .filter(n => n.type === unit.cargoType || n.type === 'metal')
          .filter(n => n.amount > 0)
          .sort((a, b) => Math.hypot(a.x - unit.x, a.y - unit.y) - Math.hypot(b.x - unit.x, b.y - unit.y))[0];

        if (nextNode) {
          unit.targetNodeId = nextNode.id;
          unit.targetX = nextNode.x;
          unit.targetY = nextNode.y;
        } else {
          unit.order = 'idle';
        }
        return;
      }

      const dist = Math.hypot(node.x - unit.x, node.y - unit.y);
      if (dist <= node.radius + unit.radius + 15) {
        // Mine resource
        unit.cargoType = node.type;
        const mineRate = 1;
        const toMine = Math.min(mineRate, Math.min(node.amount, unit.maxCargo - unit.cargoAmount));
        unit.cargoAmount += toMine;
        node.amount -= toMine;

        if (unit.cargoAmount >= unit.maxCargo) {
          // Full! Return cargo to nearest Nexus
          unit.order = 'return_cargo';
          const nexus = this.state.buildings.find(b => b.playerId === player.id && b.type === 'nexus');
          if (nexus) {
            unit.targetX = nexus.x;
            unit.targetY = nexus.y;
          }
        }
      }
    } else if (unit.order === 'return_cargo') {
      const nexus = this.state.buildings.find(b => b.playerId === player.id && b.type === 'nexus');
      if (nexus) {
        const dist = Math.hypot(nexus.x - unit.x, nexus.y - unit.y);
        if (dist <= (nexus.width / 2) + unit.radius + 15) {
          // Unload cargo
          if (unit.cargoType === 'metal') player.resources.metal += unit.cargoAmount;
          else if (unit.cargoType === 'wood') player.resources.wood += unit.cargoAmount;
          else if (unit.cargoType === 'coal') player.resources.coal += unit.cargoAmount;

          unit.cargoAmount = 0;

          // Resume gathering
          if (unit.targetNodeId) {
            const node = this.state.resourceNodes.find(n => n.id === unit.targetNodeId);
            if (node && node.amount > 0) {
              unit.order = 'gather';
              unit.targetX = node.x;
              unit.targetY = node.y;
            } else {
              unit.order = 'idle';
            }
          } else {
            unit.order = 'idle';
          }
        }
      }
    }
  }

  // ─── COMBAT, TURRETS & PROJECTILES ──────────────────────────────────────

  private updateCombat(): void {
    // 1. Plasma Turrets firing
    for (const b of this.state.buildings) {
      if (b.type === 'plasma_turret' && b.isConstructed && b.isPowered && b.damage && b.attackRange && b.attackRate) {
        if (b.attackCooldown && b.attackCooldown > 0) {
          b.attackCooldown--;
          continue;
        }

        // Find nearest enemy unit in range
        const enemy = this.state.units
          .filter(u => u.playerId !== b.playerId && !u.isStealthed)
          .find(u => Math.hypot(u.x - b.x, u.y - b.y) <= b.attackRange!);

        if (enemy) {
          b.attackCooldown = b.attackRate;
          this.spawnProjectile(b.id, enemy.id, b.x, b.y, enemy.x, enemy.y, b.damage, '#38BDF8', 'laser');
        }
      }
    }

    // 2. Unit Attacks & Auto-Aggro
    for (const unit of this.state.units) {
      if (unit.damage <= 0) continue;

      if (unit.attackCooldown > 0) {
        unit.attackCooldown--;
      }

      // If idle, auto-acquire closest visible enemy in range
      if (unit.order === 'idle' && !unit.targetUnitId && !unit.targetBuildingId) {
        const enemy = this.state.units
          .filter(u => u.playerId !== unit.playerId && !u.isStealthed)
          .find(u => Math.hypot(u.x - unit.x, u.y - unit.y) <= unit.attackRange + 50);

        if (enemy) {
          unit.targetUnitId = enemy.id;
        }
      }

      // Attack targeted unit
      if (unit.targetUnitId) {
        const enemy = this.state.units.find(u => u.id === unit.targetUnitId);
        if (!enemy || enemy.hp <= 0) {
          unit.targetUnitId = null;
          unit.order = 'idle';
          continue;
        }

        const dist = Math.hypot(enemy.x - unit.x, enemy.y - unit.y);
        if (dist <= unit.attackRange) {
          // In range: stop and shoot
          unit.targetX = unit.x;
          unit.targetY = unit.y;

          if (unit.attackCooldown <= 0) {
            unit.attackCooldown = unit.attackRate;
            unit.isStealthed = false; // reveal stealth on fire

            const projType = unit.type === 'heavy_mecha' ? 'plasma' : (unit.type === 'hover_tank' ? 'missile' : 'bullet');
            const color = unit.faction === 'nanite' ? '#10B981' : (unit.faction === 'aegis' ? '#3B82F6' : (unit.faction === 'phantom' ? '#A855F7' : '#F97316'));
            this.spawnProjectile(unit.id, enemy.id, unit.x, unit.y, enemy.x, enemy.y, unit.damage, color, projType);
          }
        } else if (unit.order === 'attack') {
          // Pursue enemy
          unit.targetX = enemy.x;
          unit.targetY = enemy.y;
        }
      }

      // Attack targeted building
      else if (unit.targetBuildingId) {
        const enemyBld = this.state.buildings.find(b => b.id === unit.targetBuildingId);
        if (!enemyBld || enemyBld.hp <= 0) {
          unit.targetBuildingId = null;
          unit.order = 'idle';
          continue;
        }

        const dist = Math.hypot(enemyBld.x - unit.x, enemyBld.y - unit.y);
        if (dist <= unit.attackRange + (enemyBld.width / 2)) {
          unit.targetX = unit.x;
          unit.targetY = unit.y;

          if (unit.attackCooldown <= 0) {
            unit.attackCooldown = unit.attackRate;
            unit.isStealthed = false;
            const color = '#F59E0B';
            this.spawnProjectile(unit.id, enemyBld.id, unit.x, unit.y, enemyBld.x, enemyBld.y, unit.damage, color, 'plasma');
          }
        } else if (unit.order === 'attack') {
          unit.targetX = enemyBld.x;
          unit.targetY = enemyBld.y;
        }
      }
    }

    // 3. Update Projectiles
    const activeProjectiles: RtsProjectile[] = [];
    for (const p of this.state.projectiles) {
      p.progress += 0.2; // 5 ticks travel time

      // Check Aegis Shield Dome interception
      let intercepted = false;
      for (const player of this.state.players) {
        for (const dome of player.activeShieldDomes) {
          const distToDome = Math.hypot(p.x - dome.x, p.y - dome.y);
          if (distToDome <= dome.radius) {
            intercepted = true;
            break;
          }
        }
        if (intercepted) break;
      }

      if (intercepted) {
        continue; // blocked by shield dome!
      }

      if (p.progress >= 1.0) {
        // Hit target
        if (p.targetId) {
          const targetUnit = this.state.units.find(u => u.id === p.targetId);
          const targetBld = this.state.buildings.find(b => b.id === p.targetId);

          if (targetUnit) {
            this.applyDamageToUnit(targetUnit, p.damage);
          } else if (targetBld) {
            this.applyDamageToBuilding(targetBld, p.damage);
          }
        }
      } else {
        p.x = p.startX + (p.targetX - p.startX) * p.progress;
        p.y = p.startY + (p.targetY - p.startY) * p.progress;
        activeProjectiles.push(p);
      }
    }
    this.state.projectiles = activeProjectiles;

    // Filter out dead units & buildings
    this.state.units = this.state.units.filter(u => u.hp > 0);
    this.state.buildings = this.state.buildings.filter(b => b.hp > 0);
  }

  private spawnProjectile(shooterId: string, targetId: string, startX: number, startY: number, targetX: number, targetY: number, damage: number, color: string, type: 'bullet' | 'laser' | 'plasma' | 'missile'): void {
    this.state.projectiles.push({
      id: `proj_${Date.now()}_${Math.random()}`,
      shooterId,
      targetId,
      startX,
      startY,
      x: startX,
      y: startY,
      targetX,
      targetY,
      speed: 15,
      damage,
      color,
      type,
      progress: 0
    });
  }

  private applyDamageToUnit(unit: RtsUnit, rawDamage: number): void {
    const player = this.state.players.find(p => p.id === unit.playerId);
    let dmg = rawDamage;

    // Shield absorbs first
    if (unit.shield > 0) {
      if (unit.shield >= dmg) {
        unit.shield -= dmg;
        dmg = 0;
      } else {
        dmg -= unit.shield;
        unit.shield = 0;
      }
    }

    unit.hp -= dmg;

    // Check destruction & Nanite Emergency Reconstitution
    if (unit.hp <= 0 && player) {
      const hasReconstitution = (player as any).reconstitutionTicks > 0;
      if (hasReconstitution && Math.random() < 0.5) {
        // Respawn on site at 50% HP!
        unit.hp = Math.round(unit.maxHp * 0.5);
        unit.shield = 0;
        this.state.log.push(`✨ Drone réassemblé par Reconstitution d'Urgence !`);
      }
    }
  }

  private applyDamageToBuilding(building: RtsBuilding, rawDamage: number): void {
    let dmg = rawDamage;
    if (building.shield > 0) {
      if (building.shield >= dmg) {
        building.shield -= dmg;
        dmg = 0;
      } else {
        dmg -= building.shield;
        building.shield = 0;
      }
    }
    building.hp -= dmg;
  }

  // ─── BOT AI LOGIC ───────────────────────────────────────────────────────

  private updateBotAI(): void {
    for (const bot of this.state.players.filter(p => p.isBot && p.isAlive)) {
      if (this.state.gameTicks % 40 !== 0) continue; // Run every 2s

      const myBuildings = this.state.buildings.filter(b => b.playerId === bot.id);
      const myUnits = this.state.units.filter(u => u.playerId === bot.id);
      const myNexus = myBuildings.find(b => b.type === 'nexus');
      if (!myNexus) continue;

      const harvesters = myUnits.filter(u => u.type === 'harvester');

      // 1. Assign idle harvesters to gather resources
      for (const h of harvesters) {
        if (h.order === 'idle') {
          // Prioritize metal, then wood, then coal
          let targetType: ResourceType = 'metal';
          if (bot.resources.metal > 250 && bot.resources.wood < 80) targetType = 'wood';
          if (bot.tech.researched.includes('advanced_mining') && bot.resources.coal < 60) targetType = 'coal';

          const nearestNode = this.state.resourceNodes
            .filter(n => n.type === targetType && n.amount > 0)
            .sort((a, b) => Math.hypot(a.x - h.x, a.y - h.y) - Math.hypot(b.x - h.x, b.y - h.y))[0];

          if (nearestNode) {
            this.handleOrder(bot.id, [h.id], 'gather', nearestNode.x, nearestNode.y, nearestNode.id);
          }
        }
      }

      // 2. Build harvesters up to 4
      if (harvesters.length < 4 && bot.resources.metal >= 50 && myNexus.queue.length === 0) {
        this.handleProduceUnit(bot.id, myNexus.id, 'harvester');
      }

      // 3. Power management
      if (bot.power.net < 15 && bot.resources.metal >= 80) {
        const offsetAngle = Math.random() * Math.PI * 2;
        const bx = myNexus.x + Math.cos(offsetAngle) * 90;
        const by = myNexus.y + Math.sin(offsetAngle) * 90;
        this.handleBuild(bot.id, 'solar_panel', bx, by);
      }

      // 4. Build Barracks
      const hasBarracks = myBuildings.some(b => b.type === 'barracks');
      if (!hasBarracks && bot.resources.metal >= 130 && bot.resources.wood >= 20) {
        this.handleBuild(bot.id, 'barracks', myNexus.x - 80, myNexus.y - 70);
      }

      // 5. Produce Troops from Barracks
      const barracks = myBuildings.find(b => b.type === 'barracks' && b.isConstructed);
      if (barracks && barracks.queue.length < 2 && bot.resources.metal >= 110) {
        this.handleProduceUnit(bot.id, barracks.id, 'assault');
      }

      // 6. Build Science Lab & Research
      const hasLab = myBuildings.some(b => b.type === 'science_lab');
      if (!hasLab && bot.resources.metal >= 180 && hasBarracks) {
        this.handleBuild(bot.id, 'science_lab', myNexus.x - 100, myNexus.y + 70);
      }

      // Auto-Research tech order
      if (hasLab && !bot.tech.currentlyResearching) {
        const order: TechId[] = ['advanced_mining', 'reinforced_shields', 'heavy_vehicles', 'orbital_satellite', 'plasma_turrets', 'ultimate_protocol'];
        for (const t of order) {
          if (!bot.tech.researched.includes(t)) {
            if (bot.resources.science >= TECH_TREE[t].scienceCost) {
              this.handleResearch(bot.id, t);
            }
            break;
          }
        }
      }

      // Build Satellite Uplink if researched
      const hasSatellite = myBuildings.some(b => b.type === 'satellite_uplink');
      if (bot.tech.researched.includes('orbital_satellite') && !hasSatellite && bot.resources.metal >= 280 && bot.resources.coal >= 70) {
        this.handleBuild(bot.id, 'satellite_uplink', myNexus.x + 100, myNexus.y + 70);
      }

      // 7. Attack enemy base when army >= 6
      const army = myUnits.filter(u => u.type !== 'harvester');
      if (army.length >= 6) {
        const enemyPlayer = this.state.players.find(p => p.id !== bot.id);
        const enemyNexus = this.state.buildings.find(b => b.playerId === enemyPlayer?.id && b.type === 'nexus');
        if (enemyNexus) {
          const unitIds = army.map(u => u.id);
          this.handleOrder(bot.id, unitIds, 'attack', enemyNexus.x, enemyNexus.y, enemyNexus.id);
        }
      }
    }
  }

  // ─── VICTORY CHECK ──────────────────────────────────────────────────────

  private checkVictory(): void {
    if (this.state.status !== 'PLAYING') return;

    for (const player of this.state.players) {
      const hasNexus = this.state.buildings.some(b => b.playerId === player.id && b.type === 'nexus');
      if (!hasNexus) {
        player.isAlive = false;
      }
    }

    const alivePlayers = this.state.players.filter(p => p.isAlive);
    if (alivePlayers.length === 1 && this.state.players.length >= 2) {
      this.state.status = 'FINISHED';
      this.state.winner = alivePlayers[0];
      this.state.log.push(`🏆 VICTOIRE ÉCLATANTE de ${alivePlayers[0].username} (${alivePlayers[0].faction.toUpperCase()}) !`);
      this.stopLoop();
    }
  }

  public resetGame(): void {
    this.stopLoop();
    this.state.status = 'LOBBY';
    this.state.units = [];
    this.state.buildings = [];
    this.state.projectiles = [];
    this.state.powerLines = [];
    this.state.winner = null;
    this.state.gameTicks = 0;
    this.state.log = ['🔄 Salon réinitialisé. Préparez vos tactiques.'];
  }
}
