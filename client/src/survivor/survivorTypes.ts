// Types and Interfaces for Minecraft Survivor

export type WeaponId = 'sword' | 'bow' | 'crossbow' | 'spear' | 'trident' | 'mace';

export interface WeaponDef {
  id: WeaponId;
  name: string;
  className: string;
  icon: string;
  description: string;
  baseDamage: number;
  baseCooldownMs: number;
  baseRange: number;
  baseProjectiles: number;
  basePierce: number;
  baseSpeed: number;
  baseArea: number;
  color: string;
  unlockReq?: {
    weaponId: WeaponId;
    level: number;
  };
}

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface RarityConfig {
  name: string;
  color: string;
  bgGradient: string;
  border: string;
  multiplier: number;
  weight: number;
}

export type UpgradeCategory = 'player' | 'weapon';

export interface UpgradeOption {
  id: string;
  name: string;
  icon: string;
  description: string;
  rarity: Rarity;
  category: UpgradeCategory;
  statKey: string;
  value: number;
  isMultiplier?: boolean;
}

export interface PlayerStats {
  x: number;
  y: number;
  vx: number;
  vy: number;
  facingAngle: number;
  radius: number;
  hp: number;
  maxHp: number;
  armor: number; // Flat damage reduction
  moveSpeed: number; // Base speed in px/s
  damageMultiplier: number; // Global damage multiplier (1.0 = 100%)
  expMultiplier: number; // EXP gain multiplier (1.0 = 100%, can be upgraded!)
  pickupRange: number; // Magnet radius for exp orbs
  critChance: number; // 0.05 = 5%
  critMultiplier: number; // 2.0 = +100% damage
  regenPerSec: number; // Health regenerated per second
  
  // Weapon stats (dynamic per run)
  weaponId: WeaponId;
  weaponCooldown: number; // Attack interval in ms
  weaponRange: number;
  weaponProjectiles: number;
  weaponPierce: number;
  weaponProjSpeed: number;
  weaponArea: number;
  lastAttackTime: number;

  // Level & progression
  level: number;
  currentExp: number;
  nextLevelExp: number;
  kills: number;
}

export type EnemyType =
  | 'zombie'
  | 'skeleton'
  | 'spider'
  | 'creeper'
  | 'enderman'
  | 'slime'
  | 'blaze'
  | 'phantom'
  | 'witch';

export type BossType =
  | 'iron_golem'
  | 'guardian'
  | 'wither'
  | 'ender_dragon'
  | 'warden';

export interface Enemy {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  type: EnemyType;
  isBoss: boolean;
  bossType?: BossType;
  bossName?: string;
  color: string;
  expValue: number;
  lastAttackTime: number;
  
  // Special states
  isHissing?: boolean; // Creeper countdown
  hissTimer?: number;
  isTeleporting?: boolean; // Enderman
  teleportCooldown?: number;
  shootCooldown?: number; // Skeleton / Blaze / Witch
  slimeSize?: 1 | 2 | 3;
  laserCharging?: boolean; // Elder Guardian
  laserTargetAngle?: number;
  laserTimer?: number;
  witherShield?: boolean; // Wither phase 2
  sonicBoomTimer?: number; // Warden
}

export interface Projectile {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  pierceLeft: number;
  rangeLeft: number;
  color: string;
  type: 'arrow' | 'bolt' | 'spear' | 'trident' | 'slash' | 'smash' | 'fireball' | 'wither_skull' | 'sonic_boom' | 'potion';
  isEnemy: boolean;
  angle: number;
  length?: number;
  returning?: boolean; // Trident loyalty return
  originX?: number;
  originY?: number;
  speedBonusRatio?: number; // Spear speed scaling
  hitEnemies: Set<string>;
}

export interface ExpOrb {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  value: number;
  radius: number;
  color: string;
}

export interface DamageNumber {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  isCrit: boolean;
  life: number;
  maxLife: number;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
  shape?: 'square' | 'circle' | 'spark' | 'smoke';
}

export interface WaveConfig {
  wave: number;
  durationSec: number;
  mobTypes: EnemyType[];
  spawnRatePerSec: number;
  bossType?: BossType;
  bossName?: string;
}

export type GameState =
  | 'SELECT_CLASS'
  | 'PLAYING'
  | 'LEVEL_UP'
  | 'PAUSED'
  | 'GAME_OVER'
  | 'VICTORY';
