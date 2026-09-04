export type MobaTeam = "blue" | "red";

export type ChampionId = 
  | "ignis"
  | "aegis"
  | "kage"
  | "nova"
  | "zephyr"
  | "dr_volt"
  | "flora"
  | "gromm"
  | "chronos"
  | "valkyrie";

export type SpellKey = "q" | "w" | "e" | "r";
export type SummonerKey = "d" | "f";

export interface SpellDef {
  key: SpellKey;
  name: string;
  description: string;
  cooldown: number; // ticks (at 20 ticks/sec, 100 ticks = 5s)
  manaCost: number;
  targetType: "skillshot" | "target" | "self" | "area" | "dash";
  range: number;
  damage?: number;
  damageType?: "physical" | "magic" | "true";
  ratio?: number;
  icon: string;
}

export interface ChampionDef {
  id: ChampionId;
  name: string;
  title: string;
  role: "Mage" | "Tank" | "Assassin" | "ADC" | "Fighter" | "Support";
  color: string;
  passive: {
    name: string;
    description: string;
    icon: string;
  };
  spells: {
    q: SpellDef;
    w: SpellDef;
    e: SpellDef;
    r: SpellDef;
  };
  baseStats: {
    hp: number;
    hpRegen: number;
    mana: number;
    manaRegen: number;
    attackDamage: number;
    abilityPower: number;
    armor: number;
    magicResist: number;
    attackSpeed: number;
    attackRange: number;
    moveSpeed: number;
  };
}

export interface MobaItem {
  id: string;
  name: string;
  description: string;
  cost: number;
  icon: string;
  stats: {
    hp?: number;
    mana?: number;
    attackDamage?: number;
    abilityPower?: number;
    armor?: number;
    magicResist?: number;
    attackSpeed?: number;
    moveSpeed?: number;
    lifesteal?: number;
    cooldownReduction?: number;
  };
}

export interface MobaPlayer {
  id: string;
  username: string;
  team: MobaTeam;
  championId: ChampionId;
  isBot: boolean;
  isAlive: boolean;
  respawnTimer: number;
  
  // Progression
  level: number;
  xp: number;
  maxXp: number;
  gold: number;
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
  items: string[];
  
  // Real-time Stats
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  shield: number;
  attackDamage: number;
  abilityPower: number;
  armor: number;
  magicResist: number;
  attackSpeed: number;
  attackRange: number;
  moveSpeed: number;

  // Transform & Movement
  x: number;
  y: number;
  targetX: number | null;
  targetY: number | null;
  vx: number;
  vy: number;
  angle: number;
  radius: number;

  // State flags
  isInBush: boolean;
  isStealthed: boolean;
  isStunned: boolean;
  stunRemaining: number;
  isRooted: boolean;
  rootRemaining: number;
  isSilenced: boolean;
  isInvulnerable: boolean;
  invulnerableRemaining: number;
  isRecalling: boolean;
  recallProgress: number;

  // Combat Timers
  attackCooldown: number;
  spellsCooldown: {
    q: number;
    w: number;
    e: number;
    r: number;
  };
  spellsLevel: {
    q: number;
    w: number;
    e: number;
    r: number;
  };
  availableSpellPoints: number;

  summonerSpells: {
    d: { id: string; cooldown: number };
    f: { id: string; cooldown: number };
  };

  // Champion-specific passive/buff state
  passiveStacks: number;
  passiveTimer: number;
}

export type MinionType = "melee" | "caster" | "cannon";

export interface MobaMinion {
  id: string;
  team: MobaTeam;
  type: MinionType;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  targetId: string | null;
  hp: number;
  maxHp: number;
  damage: number;
  range: number;
  attackCooldown: number;
  speed: number;
  radius: number;
  bountyGold: number;
  bountyXp: number;
}

export interface MobaTurret {
  id: string;
  team: MobaTeam;
  tier: "outer" | "inner" | "nexus";
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  damage: number;
  range: number;
  attackCooldown: number;
  currentTargetId: string | null;
  radius: number;
}

export interface MobaNexus {
  team: MobaTeam;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  radius: number;
}

export interface MobaJungleMonster {
  id: string;
  name: string;
  type: "camp" | "boss";
  campId: string;
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  hp: number;
  maxHp: number;
  damage: number;
  range: number;
  attackCooldown: number;
  speed: number;
  radius: number;
  bountyGold: number;
  bountyXp: number;
  targetId: string | null;
  respawnTicks: number;
  isAlive: boolean;
}

export interface MobaBush {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MobaProjectile {
  id: string;
  sourceId: string;
  sourceTeam: MobaTeam;
  targetId: string | null;
  x: number;
  y: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  speed: number;
  damage: number;
  damageType: "physical" | "magic" | "true";
  radius: number;
  color: string;
  type: "bullet" | "laser" | "skillshot" | "aoe" | "turret_beam";
  progress: number;
  maxDistance?: number;
  onHitEffect?: string;
}

export interface MobaFloatingText {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

export interface MobaKillEvent {
  id: string;
  killerName: string;
  killerChampion: ChampionId;
  killerTeam: MobaTeam;
  victimName: string;
  victimChampion: ChampionId;
  victimTeam: MobaTeam;
  timestamp: number;
}

export interface MobaGameState {
  status: "LOBBY" | "PLAYING" | "FINISHED";
  roomCode: string;
  mapWidth: number;
  mapHeight: number;
  players: MobaPlayer[];
  minions: MobaMinion[];
  turrets: MobaTurret[];
  nexuses: MobaNexus[];
  jungleMonsters: MobaJungleMonster[];
  bushes: MobaBush[];
  projectiles: MobaProjectile[];
  floatingTexts: MobaFloatingText[];
  killsBlue: number;
  killsRed: number;
  winner: MobaTeam | null;
  gameTicks: number;
  killFeed: MobaKillEvent[];
  log: string[];
}
