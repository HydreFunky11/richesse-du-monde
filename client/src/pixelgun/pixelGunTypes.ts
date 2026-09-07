import * as THREE from 'three';

export interface TargetDummy {
  id: string;
  group: THREE.Group;
  headMesh: THREE.Mesh;
  bodyMesh: THREE.Mesh;
  hp: number;
  maxHp: number;
  isDead: boolean;
  respawnTimer: number;
  isPatrolling: boolean;
  patrolStart: { x: number; z: number };
  patrolEnd: { x: number; z: number };
  patrolProgress: number;
  patrolSpeed: number;
  hitFlashTimer: number;
}

export interface FloatingText {
  id: string;
  text: string;
  color: string;
  x: number;
  y: number;
  z: number;
  life: number;
  maxLife: number;
  isHeadshot?: boolean;
}

export interface ParticleVoxel {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  rotSpeedX: number;
  rotSpeedY: number;
}

export interface BulletTracer {
  line: THREE.Line;
  life: number;
  maxLife: number;
}

export interface JumpPad {
  mesh: THREE.Group;
  x: number;
  y: number;
  z: number;
  radius: number;
  boostVelocity: number;
  cooldown: number;
}

export interface GameStats {
  score: number;
  kills: number;
  headshots: number;
  shotsFired: number;
  shotsHit: number;
  ammo: number;
  maxAmmo: number;
  isReloading: boolean;
  reloadProgress: number;
  hp: number;
  maxHp: number;
  shield: number;
  maxShield: number;
}
