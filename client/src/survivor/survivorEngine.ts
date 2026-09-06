import type {
  PlayerStats,
  WeaponId,
  Enemy,
  EnemyType,
  BossType,
  Projectile,
  ExpOrb,
  DamageNumber,
  Particle,
  GameState,
  UpgradeOption,
  Rarity,
  PickupType,
  PickupItem
} from './survivorTypes';
import { WEAPONS, RARITIES, BASE_UPGRADES, WAVES_CONFIG } from './survivorConfig';
import { survivorSound } from './survivorSound';

const STORAGE_UNLOCKED_WEAPONS = 'minecraft_survivor_unlocked_weapons_v1';
const STORAGE_WEAPON_LEVELS = 'minecraft_survivor_weapon_levels_v1';

export class SurvivorEngine {
  public player: PlayerStats;
  public enemies: Enemy[] = [];
  public projectiles: Projectile[] = [];
  public expOrbs: ExpOrb[] = [];
  public pickups: PickupItem[] = [];
  public damageNumbers: DamageNumber[] = [];
  public particles: Particle[] = [];

  public currentWave: number = 1;
  public waveTimer: number = 0; // Countdown in seconds
  public waveDuration: number = 30;
  public waveTargetKills: number = 18;
  public waveCurrentKills: number = 0;
  public waveSpawnedCount: number = 0;
  public waveClearCountdown: number | null = null;

  public freezeTimer: number = 0;
  public notification: { text: string; color: string; timer: number } | null = null;
  public timeAlive: number = 0;
  public gameState: GameState = 'SELECT_CLASS';

  // Aiming Mode: mouse crosshair tracking or automatic nearest enemy
  public aimMode: 'mouse' | 'auto' = 'mouse';
  public mouseScreenX: number = 400;
  public mouseScreenY: number = 300;
  public viewportWidth: number = 800;
  public viewportHeight: number = 600;

  public unlockedWeapons: Record<WeaponId, boolean>;
  public weaponMasteryLevels: Record<WeaponId, number>;
  public levelUpChoices: UpgradeOption[] = [];

  public activeBoss: Enemy | null = null;
  public newUnlockAnnounced: string | null = null;

  private spawnCooldown: number = 0;
  private lastTimestamp: number = 0;
  private nextEntityId: number = 1;

  // Spatial partitioning grid for buttery 60 FPS performance with 500+ mobs
  private gridBucketSize = 120;
  private enemyGrid: Map<string, Enemy[]> = new Map();

  constructor() {
    this.unlockedWeapons = this.loadUnlockedWeapons();
    this.weaponMasteryLevels = this.loadWeaponLevels();
    this.player = this.createDefaultPlayer('sword');

    const savedAim = localStorage.getItem('minecraft_survivor_aim_mode');
    if (savedAim === 'auto' || savedAim === 'mouse') {
      this.aimMode = savedAim;
    } else {
      this.aimMode = 'mouse';
    }
  }

  public setAimMode(mode: 'mouse' | 'auto') {
    this.aimMode = mode;
    localStorage.setItem('minecraft_survivor_aim_mode', mode);
  }

  public toggleAimMode(): 'mouse' | 'auto' {
    const next = this.aimMode === 'mouse' ? 'auto' : 'mouse';
    this.setAimMode(next);
    return next;
  }

  public setMousePos(x: number, y: number) {
    this.mouseScreenX = x;
    this.mouseScreenY = y;
  }

  public setViewportSize(w: number, h: number) {
    this.viewportWidth = w;
    this.viewportHeight = h;
  }

  // --- PERSISTENCE ---

  private loadUnlockedWeapons(): Record<WeaponId, boolean> {
    try {
      const saved = localStorage.getItem(STORAGE_UNLOCKED_WEAPONS);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          sword: true,
          bow: !!parsed.bow,
          crossbow: !!parsed.crossbow,
          spear: !!parsed.spear,
          trident: !!parsed.trident,
          mace: !!parsed.mace
        };
      }
    } catch (e) {
      console.warn('Failed to load unlocked weapons', e);
    }
    return {
      sword: true,
      bow: false,
      crossbow: false,
      spear: false,
      trident: false,
      mace: false
    };
  }

  private saveUnlockedWeapons() {
    try {
      localStorage.setItem(STORAGE_UNLOCKED_WEAPONS, JSON.stringify(this.unlockedWeapons));
    } catch (e) {
      console.warn('Failed to save unlocked weapons', e);
    }
  }

  private loadWeaponLevels(): Record<WeaponId, number> {
    try {
      const saved = localStorage.getItem(STORAGE_WEAPON_LEVELS);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to load weapon levels', e);
    }
    return {
      sword: 1,
      bow: 1,
      crossbow: 1,
      spear: 1,
      trident: 1,
      mace: 1
    };
  }

  private saveWeaponLevels() {
    try {
      localStorage.setItem(STORAGE_WEAPON_LEVELS, JSON.stringify(this.weaponMasteryLevels));
    } catch (e) {
      console.warn('Failed to save weapon levels', e);
    }
  }

  // --- GAME INITIALIZATION ---

  public startRun(weaponId: WeaponId) {
    this.player = this.createDefaultPlayer(weaponId);
    this.enemies = [];
    this.projectiles = [];
    this.expOrbs = [];
    this.pickups = [];
    this.damageNumbers = [];
    this.particles = [];

    this.currentWave = 1;
    const waveCfg = WAVES_CONFIG[0];
    this.waveDuration = waveCfg?.durationSec || 30;
    this.waveTimer = this.waveDuration;
    this.waveTargetKills = waveCfg?.targetKills || 18;
    this.waveCurrentKills = 0;
    this.waveSpawnedCount = 0;
    this.waveClearCountdown = null;
    this.freezeTimer = 0;
    this.notification = null;

    this.timeAlive = 0;
    this.activeBoss = null;
    this.newUnlockAnnounced = null;

    this.gameState = 'PLAYING';
    this.lastTimestamp = performance.now();
    survivorSound.uiClick();
  }

  private createDefaultPlayer(weaponId: WeaponId): PlayerStats {
    const def = WEAPONS[weaponId];
    return {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      facingAngle: 0,
      radius: 18,
      hp: 20, // 10 Minecraft Hearts (2 HP per heart)
      maxHp: 20,
      armor: 0,
      moveSpeed: 180,
      damageMultiplier: 1.0,
      expMultiplier: 1.0, // EXP Multiplier upgradeable!
      pickupRange: 80,
      critChance: 0.05,
      critMultiplier: 2.0,
      regenPerSec: 0,

      weaponId,
      weaponCooldown: def.baseCooldownMs,
      weaponRange: def.baseRange,
      weaponProjectiles: def.baseProjectiles,
      weaponPierce: def.basePierce,
      weaponProjSpeed: def.baseSpeed,
      weaponArea: def.baseArea,
      lastAttackTime: 0,

      level: 1,
      currentExp: 0,
      nextLevelExp: 15,
      kills: 0
    };
  }

  // --- MAIN LOOP ---

  public update(now: number, keys: { up: boolean; down: boolean; left: boolean; right: boolean }) {
    if (this.gameState !== 'PLAYING') {
      this.lastTimestamp = now;
      return;
    }

    const dt = Math.min((now - this.lastTimestamp) / 1000, 0.1); // Clamp to prevent spiral on lag spike
    this.lastTimestamp = now;

    this.timeAlive += dt;

    // 1. Player Movement & Facing
    let dx = 0;
    let dy = 0;
    if (keys.up) dy -= 1;
    if (keys.down) dy += 1;
    if (keys.left) dx -= 1;
    if (keys.right) dx += 1;

    if (dx !== 0 && dy !== 0) {
      const len = Math.hypot(dx, dy);
      dx /= len;
      dy /= len;
    }

    this.player.vx = dx * this.player.moveSpeed;
    this.player.vy = dy * this.player.moveSpeed;

    this.player.x += this.player.vx * dt;
    this.player.y += this.player.vy * dt;

    if (this.aimMode === 'mouse') {
      const mdx = this.mouseScreenX - this.viewportWidth / 2;
      const mdy = this.mouseScreenY - this.viewportHeight / 2;
      if (Math.hypot(mdx, mdy) > 5) {
        this.player.facingAngle = Math.atan2(mdy, mdx);
      }
    } else if (dx !== 0 || dy !== 0) {
      this.player.facingAngle = Math.atan2(dy, dx);
    }

    // Passive regeneration (nerfed)
    if (this.player.regenPerSec > 0 && this.player.hp < this.player.maxHp) {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + this.player.regenPerSec * dt);
    }

    // Freeze timer update
    if (this.freezeTimer > 0) {
      this.freezeTimer = Math.max(0, this.freezeTimer - dt);
    }

    // Toast notification timer
    if (this.notification) {
      this.notification.timer -= dt;
      if (this.notification.timer <= 0) {
        this.notification = null;
      }
    }

    // 2. Wave Progression & 3-second Countdown
    if (this.waveClearCountdown !== null) {
      this.waveClearCountdown -= dt;
      if (this.waveClearCountdown <= 0) {
        this.waveClearCountdown = null;
        this.advanceWave();
      }
    } else {
      this.waveTimer -= dt;
      if (this.waveTimer <= 0) {
        // Wave time limit elapsed: advance to next wave even if mobs remain!
        this.advanceWave();
      }
    }

    // 3. Mob Spawning
    this.handleMobSpawning(dt);

    // 4. Weapon Automatic Attack
    this.handleWeaponAttack(now);

    // 5. Update Projectiles
    this.updateProjectiles(dt);

    // 6. Build Spatial Partitioning Grid for Enemies
    this.buildEnemyGrid();

    // 7. Update Enemies (Movement, AI, Collisions)
    this.updateEnemies(dt, now);

    // 8. Update EXP Orbs & Magnet Pull
    this.updateExpOrbs(dt);

    // 9. Update Rare Pickups (Magnet, Freeze, Nuke)
    this.updatePickups(dt);

    // 10. Update Damage Numbers & Particles
    this.updateVFX(dt);
  }

  // --- WAVE PROGRESSION ---

  private advanceWave() {
    if (this.currentWave >= 50) {
      // Victory! Finished all 50 waves!
      this.gameState = 'VICTORY';
      survivorSound.levelUp();
      return;
    }

    this.currentWave++;
    const cfg = WAVES_CONFIG[this.currentWave - 1];
    this.waveDuration = cfg?.durationSec || 30;
    this.waveTimer = this.waveDuration;
    this.waveTargetKills = cfg?.targetKills || (15 + this.currentWave * 3);
    this.waveCurrentKills = 0;
    this.waveSpawnedCount = 0;
    this.waveClearCountdown = null;

    // Boss Spawn Check
    if (cfg?.bossType) {
      this.spawnBoss(cfg.bossType, cfg.bossName || 'Grand Boss');
    }
  }

  private spawnBoss(bossType: BossType, bossName: string) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 450;
    const x = this.player.x + Math.cos(angle) * dist;
    const y = this.player.y + Math.sin(angle) * dist;

    let hp = 450 + this.currentWave * 90;
    let speed = 75;
    let radius = 36;
    let color = '#ef4444';

    if (bossType === 'iron_golem') {
      hp = 500;
      speed = 70;
      radius = 40;
      color = '#e2e8f0';
    } else if (bossType === 'guardian') {
      hp = 950;
      speed = 90;
      radius = 44;
      color = '#06b6d4';
    } else if (bossType === 'wither') {
      hp = 1600;
      speed = 110;
      radius = 46;
      color = '#334155';
    } else if (bossType === 'ender_dragon') {
      hp = 2500;
      speed = 135;
      radius = 52;
      color = '#a855f7';
    } else if (bossType === 'warden') {
      hp = 4000;
      speed = 100;
      radius = 56;
      color = '#0f766e';
    }

    const boss: Enemy = {
      id: `boss_${this.nextEntityId++}`,
      x,
      y,
      vx: 0,
      vy: 0,
      radius,
      hp,
      maxHp: hp,
      speed,
      damage: 8 + Math.floor(this.currentWave * 0.4),
      type: 'zombie',
      isBoss: true,
      bossType,
      bossName,
      color,
      expValue: 120 + this.currentWave * 20,
      lastAttackTime: 0
    };

    this.enemies.push(boss);
    this.activeBoss = boss;
    survivorSound.bossRoar();
  }

  // --- MOB SPAWNING ---

  private handleMobSpawning(dt: number) {
    const cfg = WAVES_CONFIG[this.currentWave - 1] || WAVES_CONFIG[0];
    this.spawnCooldown -= dt;

    if (this.spawnCooldown <= 0 && this.waveSpawnedCount < this.waveTargetKills && this.enemies.length < 350) {
      const rate = cfg.spawnRatePerSec;
      this.spawnCooldown = 1.0 / rate;

      // Pick random mob type for this wave
      const mobType = cfg.mobTypes[Math.floor(Math.random() * cfg.mobTypes.length)] || 'zombie';
      this.spawnEnemy(mobType);
      this.waveSpawnedCount++;
    }
  }

  private spawnEnemy(type: EnemyType, customX?: number, customY?: number, slimeSize: 1 | 2 | 3 = 3) {
    let x = customX;
    let y = customY;

    if (x === undefined || y === undefined) {
      // Spawn in a ring outside screen (dist 500-650 px from player)
      const angle = Math.random() * Math.PI * 2;
      const dist = 520 + Math.random() * 120;
      x = this.player.x + Math.cos(angle) * dist;
      y = this.player.y + Math.sin(angle) * dist;
    }

    // Stat scaling per wave (increased slightly from 0.08 to 0.12)
    const waveMult = 1 + (this.currentWave - 1) * 0.12;

    let hp = 10 * waveMult;
    let speed = 90;
    let damage = 3 + Math.floor(this.currentWave * 0.15);
    let radius = 16;
    let color = '#22c55e';
    let expValue = 2 + Math.floor(this.currentWave * 0.3);

    switch (type) {
      case 'zombie':
        hp = 14 * waveMult;
        speed = 85;
        radius = 16;
        color = '#22c55e';
        break;
      case 'spider':
        hp = 10 * waveMult;
        speed = 135; // Fast!
        radius = 15;
        color = '#78350f';
        damage = 3;
        break;
      case 'skeleton':
        hp = 12 * waveMult;
        speed = 80;
        radius = 15;
        color = '#e2e8f0';
        expValue += 1;
        break;
      case 'creeper':
        hp = 13 * waveMult;
        speed = 95;
        radius = 17;
        color = '#16a34a';
        damage = 18; // High explosion damage
        expValue += 2;
        break;
      case 'enderman':
        hp = 28 * waveMult;
        speed = 140;
        radius = 18;
        color = '#3b0764';
        damage = 5;
        expValue += 4;
        break;
      case 'slime':
        if (slimeSize === 3) {
          hp = 22 * waveMult;
          speed = 65;
          radius = 24;
          damage = 4;
          expValue = 3;
        } else if (slimeSize === 2) {
          hp = 11 * waveMult;
          speed = 80;
          radius = 16;
          damage = 2;
          expValue = 2;
        } else {
          hp = 6 * waveMult;
          speed = 95;
          radius = 10;
          damage = 1;
          expValue = 1;
        }
        color = '#86efac';
        break;
      case 'blaze':
        hp = 22 * waveMult;
        speed = 100;
        radius = 16;
        color = '#f97316';
        damage = 5;
        expValue += 3;
        break;
      case 'phantom':
        hp = 15 * waveMult;
        speed = 150;
        radius = 15;
        color = '#4338ca';
        expValue += 3;
        break;
      case 'witch':
        hp = 30 * waveMult;
        speed = 80;
        radius = 17;
        color = '#7e22ce';
        damage = 6;
        expValue += 5;
        break;
    }

    const enemy: Enemy = {
      id: `enemy_${this.nextEntityId++}`,
      x,
      y,
      vx: 0,
      vy: 0,
      radius,
      hp,
      maxHp: hp,
      speed,
      damage,
      type,
      isBoss: false,
      color,
      expValue,
      lastAttackTime: 0,
      slimeSize: type === 'slime' ? slimeSize : undefined
    };

    this.enemies.push(enemy);
  }

  // --- WEAPON ATTACKS ---

  private handleWeaponAttack(now: number) {
    if (now - this.player.lastAttackTime < this.player.weaponCooldown) {
      return;
    }

    this.player.lastAttackTime = now;
    const def = WEAPONS[this.player.weaponId];

    // Target Angle based on Aiming Mode
    let targetAngle = this.player.facingAngle;

    if (this.aimMode === 'mouse') {
      const mdx = this.mouseScreenX - this.viewportWidth / 2;
      const mdy = this.mouseScreenY - this.viewportHeight / 2;
      if (Math.hypot(mdx, mdy) > 5) {
        targetAngle = Math.atan2(mdy, mdx);
        this.player.facingAngle = targetAngle;
      }
    } else {
      // Auto targeting: nearest enemy
      const nearestEnemy = this.findNearestEnemy();
      if (nearestEnemy) {
        const edx = nearestEnemy.x - this.player.x;
        const edy = nearestEnemy.y - this.player.y;
        targetAngle = Math.atan2(edy, edx);
        this.player.facingAngle = targetAngle;
      }
    }

    const count = this.player.weaponProjectiles;
    const baseDmg = def.baseDamage * this.player.damageMultiplier;

    switch (this.player.weaponId) {
      case 'sword': {
        survivorSound.swordSlash();
        // Sweeping slash arc in front
        const slash: Projectile = {
          id: `proj_${this.nextEntityId++}`,
          x: this.player.x + Math.cos(targetAngle) * 35,
          y: this.player.y + Math.sin(targetAngle) * 35,
          vx: 0,
          vy: 0,
          radius: this.player.weaponRange,
          damage: baseDmg,
          pierceLeft: 99,
          rangeLeft: 0.15, // Duration in seconds
          color: def.color,
          type: 'slash',
          isEnemy: false,
          angle: targetAngle,
          hitEnemies: new Set()
        };
        this.projectiles.push(slash);
        break;
      }

      case 'bow': {
        survivorSound.bowShoot();
        const spreadAngle = 0.16;
        for (let i = 0; i < count; i++) {
          const angleOffset = (i - (count - 1) / 2) * spreadAngle;
          const a = targetAngle + angleOffset;
          const speed = this.player.weaponProjSpeed;
          this.projectiles.push({
            id: `proj_${this.nextEntityId++}`,
            x: this.player.x + Math.cos(a) * 20,
            y: this.player.y + Math.sin(a) * 20,
            vx: Math.cos(a) * speed,
            vy: Math.sin(a) * speed,
            radius: 5,
            damage: baseDmg,
            pierceLeft: this.player.weaponPierce,
            rangeLeft: this.player.weaponRange,
            color: def.color,
            type: 'arrow',
            isEnemy: false,
            angle: a,
            hitEnemies: new Set()
          });
        }
        break;
      }

      case 'crossbow': {
        survivorSound.bowShoot();
        const spreadAngle = 0.22;
        for (let i = 0; i < count; i++) {
          const angleOffset = (i - (count - 1) / 2) * spreadAngle;
          const a = targetAngle + angleOffset;
          const speed = this.player.weaponProjSpeed;
          this.projectiles.push({
            id: `proj_${this.nextEntityId++}`,
            x: this.player.x + Math.cos(a) * 20,
            y: this.player.y + Math.sin(a) * 20,
            vx: Math.cos(a) * speed,
            vy: Math.sin(a) * speed,
            radius: 8,
            damage: baseDmg,
            pierceLeft: this.player.weaponPierce,
            rangeLeft: this.player.weaponRange,
            color: def.color,
            type: 'bolt',
            isEnemy: false,
            angle: a,
            hitEnemies: new Set()
          });
        }
        break;
      }

      case 'spear': {
        survivorSound.spearThrust();
        // SPEAR DAMAGE SCALES WITH CURRENT PLAYER SPEED! (Speed-based class requirement)
        const currentSpeed = Math.hypot(this.player.vx, this.player.vy);
        const speedBonusRatio = 1 + (currentSpeed / this.player.moveSpeed) * 0.8; // Up to +80% bonus when sprinting!
        const spearDmg = baseDmg * speedBonusRatio;

        const a = targetAngle;
        this.projectiles.push({
          id: `proj_${this.nextEntityId++}`,
          x: this.player.x + Math.cos(a) * (this.player.weaponRange * 0.5),
          y: this.player.y + Math.sin(a) * (this.player.weaponRange * 0.5),
          vx: 0,
          vy: 0,
          radius: 35,
          length: this.player.weaponRange,
          damage: spearDmg,
          pierceLeft: this.player.weaponPierce,
          rangeLeft: 0.18, // Short thrust duration
          color: def.color,
          type: 'spear',
          isEnemy: false,
          angle: a,
          speedBonusRatio,
          hitEnemies: new Set()
        });
        break;
      }

      case 'trident': {
        survivorSound.tridentThrow();
        const a = targetAngle;
        const speed = this.player.weaponProjSpeed;
        this.projectiles.push({
          id: `proj_${this.nextEntityId++}`,
          x: this.player.x,
          y: this.player.y,
          vx: Math.cos(a) * speed,
          vy: Math.sin(a) * speed,
          radius: 12,
          damage: baseDmg,
          pierceLeft: this.player.weaponPierce,
          rangeLeft: this.player.weaponRange,
          color: def.color,
          type: 'trident',
          isEnemy: false,
          angle: a,
          originX: this.player.x,
          originY: this.player.y,
          returning: false,
          hitEnemies: new Set()
        });
        break;
      }

      case 'mace': {
        survivorSound.maceSmash();
        // Ground smashing shockwave ring
        this.projectiles.push({
          id: `proj_${this.nextEntityId++}`,
          x: this.player.x,
          y: this.player.y,
          vx: 0,
          vy: 0,
          radius: this.player.weaponArea,
          damage: baseDmg,
          pierceLeft: 99,
          rangeLeft: 0.28,
          color: def.color,
          type: 'smash',
          isEnemy: false,
          angle: 0,
          hitEnemies: new Set()
        });
        break;
      }
    }
  }

  private findNearestEnemy(): Enemy | null {
    let nearest: Enemy | null = null;
    let minDist = Infinity;

    for (const e of this.enemies) {
      const dist = Math.hypot(e.x - this.player.x, e.y - this.player.y);
      if (dist < minDist) {
        minDist = dist;
        nearest = e;
      }
    }
    return nearest;
  }

  // --- PROJECTILES UPDATE & COLLISION ---

  private updateProjectiles(dt: number) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];

      // Frozen time: enemy projectiles are paused
      if (p.isEnemy && this.freezeTimer > 0) {
        continue;
      }

      if (p.type === 'slash' || p.type === 'spear' || p.type === 'smash') {
        // Melee/instant active duration projectiles
        p.rangeLeft -= dt;
        if (p.type === 'slash') {
          // Keep slash attached to player's front
          p.x = this.player.x + Math.cos(p.angle) * 35;
          p.y = this.player.y + Math.sin(p.angle) * 35;
        } else if (p.type === 'spear') {
          p.x = this.player.x + Math.cos(p.angle) * (this.player.weaponRange * 0.5);
          p.y = this.player.y + Math.sin(p.angle) * (this.player.weaponRange * 0.5);
        } else if (p.type === 'smash') {
          p.x = this.player.x;
          p.y = this.player.y;
        }

        this.checkProjectileHits(p);

        if (p.rangeLeft <= 0) {
          this.projectiles.splice(i, 1);
        }
        continue;
      }

      if (p.type === 'trident' && p.returning) {
        // Trident flying back to player with Loyalty!
        const dx = this.player.x - p.x;
        const dy = this.player.y - p.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 30) {
          this.projectiles.splice(i, 1);
          continue;
        }
        const speed = this.player.weaponProjSpeed * 1.4;
        p.vx = (dx / dist) * speed;
        p.vy = (dy / dist) * speed;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.angle = Math.atan2(p.vy, p.vx);

        this.checkProjectileHits(p);
        continue;
      }

      // Normal flying projectiles (arrow, bolt, trident forward, fireballs)
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const stepDist = Math.hypot(p.vx, p.vy) * dt;
      p.rangeLeft -= stepDist;

      this.checkProjectileHits(p);

      if (p.type === 'trident' && p.rangeLeft <= 0 && !p.returning) {
        // Trident reaches peak and starts loyalty return!
        p.returning = true;
        p.hitEnemies.clear(); // Can hit enemies again on the way back!
        continue;
      }

      if (p.rangeLeft <= 0 || p.pierceLeft <= 0) {
        // Explosion effects for bolts
        if (p.type === 'bolt') {
          this.triggerExplosion(p.x, p.y, this.player.weaponArea, p.damage * 0.6);
        }
        this.projectiles.splice(i, 1);
      }
    }
  }

  private checkProjectileHits(p: Projectile) {
    if (p.isEnemy) {
      // Enemy projectile hitting player
      const dist = Math.hypot(p.x - this.player.x, p.y - this.player.y);
      if (dist < p.radius + this.player.radius) {
        this.damagePlayer(p.damage);
        p.pierceLeft = 0;
      }
      return;
    }

    // Player projectile hitting enemies via spatial grid
    const nearby = this.getNearbyEnemies(p.x, p.y, p.radius + 40);

    for (const enemy of nearby) {
      if (p.hitEnemies.has(enemy.id)) continue;

      const dist = Math.hypot(p.x - enemy.x, p.y - enemy.y);
      if (dist < p.radius + enemy.radius) {
        p.hitEnemies.add(enemy.id);
        p.pierceLeft--;

        const isCrit = Math.random() < this.player.critChance;
        let finalDamage = p.damage * (isCrit ? this.player.critMultiplier : 1.0);

        this.damageEnemy(enemy, finalDamage, isCrit);

        // Knockback
        const kAngle = Math.atan2(enemy.y - this.player.y, enemy.x - this.player.x);
        enemy.x += Math.cos(kAngle) * 15;
        enemy.y += Math.sin(kAngle) * 15;

        // Visual sparks
        this.spawnSparks(enemy.x, enemy.y, p.color, 4);

        if (p.pierceLeft <= 0 && p.type !== 'slash' && p.type !== 'smash' && p.type !== 'spear') {
          break;
        }
      }
    }
  }

  private triggerExplosion(x: number, y: number, radius: number, damage: number) {
    survivorSound.explosion();
    this.spawnSparks(x, y, '#f97316', 16);

    const nearby = this.getNearbyEnemies(x, y, radius);
    for (const e of nearby) {
      const dist = Math.hypot(e.x - x, e.y - y);
      if (dist < radius) {
        this.damageEnemy(e, damage, false);
      }
    }
  }

  // --- DAMAGE & COMBAT ---

  public damageEnemy(enemy: Enemy, amount: number, isCrit: boolean) {
    enemy.hp -= amount;
    survivorSound.mobHurt();

    this.damageNumbers.push({
      id: `dmg_${this.nextEntityId++}`,
      x: enemy.x + (Math.random() * 20 - 10),
      y: enemy.y - 15,
      text: `${Math.round(amount)}`,
      color: isCrit ? '#f59e0b' : '#ffffff',
      isCrit,
      life: 0.6,
      maxLife: 0.6
    });

    if (enemy.hp <= 0) {
      this.killEnemy(enemy);
    }
  }

  private killEnemy(enemy: Enemy) {
    const idx = this.enemies.indexOf(enemy);
    if (idx !== -1) {
      this.enemies.splice(idx, 1);
    }

    this.player.kills++;
    this.waveCurrentKills++;

    // Check wave clear requirement (quota met and no boss alive)
    const bossAlive = this.activeBoss !== null;
    if (this.waveCurrentKills >= this.waveTargetKills && !bossAlive && this.waveClearCountdown === null) {
      this.waveClearCountdown = 3.0;
      this.notification = {
        text: '✨ VAGUE TERMINÉE ! Suivante dans 3s...',
        color: '#4ade80',
        timer: 3.0
      };
      survivorSound.levelUp();
    }

    // Slime splitting on death! (Large -> 2 Medium -> 2 Small)
    if (enemy.type === 'slime' && enemy.slimeSize && enemy.slimeSize > 1) {
      const nextSize = (enemy.slimeSize - 1) as 1 | 2;
      for (let s = 0; s < 2; s++) {
        const offAngle = (Math.PI * 2 * s) / 2 + (Math.random() - 0.5) * 0.7;
        const sx = enemy.x + Math.cos(offAngle) * 16;
        const sy = enemy.y + Math.sin(offAngle) * 16;
        this.spawnEnemy('slime', sx, sy, nextSize);
      }
      this.spawnSparks(enemy.x, enemy.y, '#86efac', 10);
    }

    // Rare drop roll
    const dropChance = enemy.isBoss ? 1.0 : 0.025; // 100% on boss, 2.5% on regular mobs
    if (Math.random() < dropChance) {
      const dropTypes: PickupType[] = ['magnet', 'freeze', 'nuke'];
      const chosen = dropTypes[Math.floor(Math.random() * dropTypes.length)];
      this.spawnPickup(enemy.x, enemy.y, chosen);
    }

    // Drop EXP Orb with EXP MULTIPLIER applied!
    const finalExp = Math.max(1, Math.round(enemy.expValue * this.player.expMultiplier));
    this.expOrbs.push({
      id: `exp_${this.nextEntityId++}`,
      x: enemy.x,
      y: enemy.y,
      vx: 0,
      vy: 0,
      value: finalExp,
      radius: 7,
      color: '#4ade80'
    });

    // Blood / death smoke particles
    this.spawnSparks(enemy.x, enemy.y, '#94a3b8', 8);

    if (enemy.isBoss) {
      this.activeBoss = null;
      // Extra rare drop from boss!
      const bonusTypes: PickupType[] = ['magnet', 'freeze', 'nuke'];
      this.spawnPickup(enemy.x + 20, enemy.y + 20, bonusTypes[Math.floor(Math.random() * bonusTypes.length)]);

      // Boss drops giant shower of orbs
      for (let k = 0; k < 6; k++) {
        this.expOrbs.push({
          id: `exp_boss_${this.nextEntityId++}`,
          x: enemy.x + (Math.random() * 40 - 20),
          y: enemy.y + (Math.random() * 40 - 20),
          vx: 0,
          vy: 0,
          value: Math.round(finalExp * 0.4),
          radius: 9,
          color: '#facc15'
        });
      }

      if (this.waveCurrentKills >= this.waveTargetKills && this.waveClearCountdown === null) {
        this.waveClearCountdown = 3.0;
        this.notification = {
          text: '👑 BOSS VAINCU ! Vague suivante dans 3s...',
          color: '#f59e0b',
          timer: 3.0
        };
        survivorSound.levelUp();
      }
    }
  }

  public damagePlayer(rawAmount: number) {
    // Armor flat reduction (minimum 1 damage)
    const finalDmg = Math.max(1, rawAmount - this.player.armor);
    this.player.hp = Math.max(0, this.player.hp - finalDmg);
    survivorSound.playerHurt();

    this.damageNumbers.push({
      id: `dmg_player_${this.nextEntityId++}`,
      x: this.player.x + (Math.random() * 20 - 10),
      y: this.player.y - 20,
      text: `-${Math.round(finalDmg)}`,
      color: '#ef4444',
      isCrit: true,
      life: 0.7,
      maxLife: 0.7
    });

    if (this.player.hp <= 0) {
      this.gameState = 'GAME_OVER';
    }
  }

  // --- ENEMIES UPDATE ---

  private updateEnemies(dt: number, now: number) {
    if (this.freezeTimer > 0) {
      // Time is frozen: mobs do not move, shoot, or attack!
      return;
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];

      const dx = this.player.x - e.x;
      const dy = this.player.y - e.y;
      const dist = Math.hypot(dx, dy);

      // SKELETON SPECIAL AI: Stops in bow range instead of rushing the player!
      if (e.type === 'skeleton') {
        if (dist <= 300 && dist >= 130) {
          // Sweet spot: stand ground and shoot!
          e.vx = 0;
          e.vy = 0;
        } else if (dist < 130) {
          // Too close: backpedal away from player!
          e.vx = -(dx / dist) * (e.speed * 0.7);
          e.vy = -(dy / dist) * (e.speed * 0.7);
        } else {
          // Approach towards player
          e.vx = (dx / dist) * e.speed;
          e.vy = (dy / dist) * e.speed;
        }
      } else if (dist > 5) {
        e.vx = (dx / dist) * e.speed;
        e.vy = (dy / dist) * e.speed;
      } else {
        e.vx = 0;
        e.vy = 0;
      }

      // CREEPER SPECIAL AI: Clignotement blanc et explosion !
      if (e.type === 'creeper') {
        if (dist < 55) {
          if (!e.isHissing) {
            e.isHissing = true;
            e.hissTimer = 1.3;
            survivorSound.creeperHiss();
          } else if (e.hissTimer !== undefined) {
            e.hissTimer -= dt;
            if (e.hissTimer <= 0) {
              // BOOM!
              this.triggerExplosion(e.x, e.y, 85, e.damage);
              this.enemies.splice(i, 1);
              continue;
            }
          }
        } else if (e.isHissing && e.hissTimer !== undefined) {
          e.hissTimer = Math.min(1.3, e.hissTimer + dt * 0.5);
        }
      }

      // SKELETON / BLAZE SPECIAL AI: Shoot projectiles at player
      if ((e.type === 'skeleton' || e.type === 'blaze') && dist < 320 && dist > 70) {
        if (e.shootCooldown === undefined) e.shootCooldown = 2.0;
        e.shootCooldown -= dt;
        if (e.shootCooldown <= 0) {
          e.shootCooldown = e.type === 'skeleton' ? 2.2 : 2.6;
          const a = Math.atan2(this.player.y - e.y, this.player.x - e.x);
          this.projectiles.push({
            id: `enemy_proj_${this.nextEntityId++}`,
            x: e.x,
            y: e.y,
            vx: Math.cos(a) * (e.type === 'skeleton' ? 260 : 220),
            vy: Math.sin(a) * (e.type === 'skeleton' ? 260 : 220),
            radius: e.type === 'skeleton' ? 4 : 6,
            damage: e.damage,
            pierceLeft: 1,
            rangeLeft: 420,
            color: e.type === 'blaze' ? '#ea580c' : '#cbd5e1',
            type: e.type === 'skeleton' ? 'arrow' : 'fireball',
            isEnemy: true,
            angle: a,
            hitEnemies: new Set()
          });
        }
      }

      e.x += e.vx * dt;
      e.y += e.vy * dt;

      // Contact damage to player
      if (dist < e.radius + this.player.radius) {
        if (now - e.lastAttackTime > 800) {
          e.lastAttackTime = now;
          this.damagePlayer(e.damage);
        }
      }
    }
  }

  // --- EXP ORBS & LEVEL UP ---

  private updateExpOrbs(dt: number) {
    for (let i = this.expOrbs.length - 1; i >= 0; i--) {
      const orb = this.expOrbs[i];
      const dx = this.player.x - orb.x;
      const dy = this.player.y - orb.y;
      const dist = Math.hypot(dx, dy);

      const isPulled = (orb as any).isMagnetPulled || dist < this.player.pickupRange;

      // Inside magnet pickup radius or pulled by global magnet
      if (isPulled && dist > 0.01) {
        const pullSpeed = (orb as any).isMagnetPulled ? 950 : 480;
        orb.vx = (dx / dist) * pullSpeed;
        orb.vy = (dy / dist) * pullSpeed;
        orb.x += orb.vx * dt;
        orb.y += orb.vy * dt;

        if (dist < this.player.radius + orb.radius + 15) {
          // Collect orb
          this.collectExp(orb.value);
          this.expOrbs.splice(i, 1);
        }
      }
    }
  }

  private collectExp(amount: number) {
    this.player.currentExp += amount;
    survivorSound.expPickup();

    if (this.player.currentExp >= this.player.nextLevelExp) {
      this.triggerLevelUp();
    }
  }

  // --- RARE DROPS & PICKUPS ---

  private spawnPickup(x: number, y: number, type: PickupType) {
    this.pickups.push({
      id: `pickup_${this.nextEntityId++}`,
      x,
      y,
      type,
      radius: 16,
      life: 30,
      maxLife: 30,
      pulseAngle: Math.random() * Math.PI * 2
    });
  }

  private updatePickups(dt: number) {
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      p.life -= dt;
      p.pulseAngle += dt * 4;

      if (p.life <= 0) {
        this.pickups.splice(i, 1);
        continue;
      }

      const dx = this.player.x - p.x;
      const dy = this.player.y - p.y;
      const dist = Math.hypot(dx, dy);

      // Light attraction if inside player magnet range
      if (dist < this.player.pickupRange) {
        p.x += (dx / dist) * 350 * dt;
        p.y += (dy / dist) * 350 * dt;
      }

      // Collect when close
      if (dist < this.player.radius + p.radius + 10) {
        this.collectPickup(p.type);
        this.pickups.splice(i, 1);
      }
    }
  }

  private collectPickup(type: PickupType) {
    survivorSound.pickupItem();

    if (type === 'magnet') {
      // Attract all existing EXP orbs on map!
      for (const orb of this.expOrbs) {
        (orb as any).isMagnetPulled = true;
      }
      this.notification = {
        text: '🧲 AIMANT D\'EXP ACTIVÉ !',
        color: '#38bdf8',
        timer: 2.5
      };
      this.spawnSparks(this.player.x, this.player.y, '#38bdf8', 25);
    } else if (type === 'freeze') {
      // Freeze all enemies for 5 seconds!
      this.freezeTimer = 5.0;
      survivorSound.freezeTime();
      this.notification = {
        text: '⏱️ GEL DU TEMPS (5s) !',
        color: '#06b6d4',
        timer: 2.5
      };
      this.spawnSparks(this.player.x, this.player.y, '#06b6d4', 25);
    } else if (type === 'nuke') {
      // Wipe all active non-boss mobs and damage bosses!
      survivorSound.nukeExplosion();
      this.notification = {
        text: '💣 DESTRUCTION TOTALE !',
        color: '#ef4444',
        timer: 2.5
      };

      const regularMobs = this.enemies.filter(e => !e.isBoss);
      for (const mob of regularMobs) {
        this.killEnemy(mob);
      }

      if (this.activeBoss) {
        this.damageEnemy(this.activeBoss, Math.round(this.activeBoss.maxHp * 0.3), true);
      }

      this.spawnSparks(this.player.x, this.player.y, '#f59e0b', 40);
    }
  }

  private triggerLevelUp() {
    this.player.level++;
    this.player.currentExp -= this.player.nextLevelExp;
    this.player.nextLevelExp = Math.floor(this.player.nextLevelExp * 1.28 + 12);

    survivorSound.levelUp();

    // Check weapon mastery unlock at Level 30!
    this.checkWeaponMastery();

    // Generate 3 or 4 upgrades
    this.levelUpChoices = this.rollUpgradeChoices(3);
    this.gameState = 'LEVEL_UP';
  }

  private checkWeaponMastery() {
    const currentWeapon = this.player.weaponId;
    const currentMastery = this.weaponMasteryLevels[currentWeapon] || 1;

    if (this.player.level > currentMastery) {
      this.weaponMasteryLevels[currentWeapon] = this.player.level;
      this.saveWeaponLevels();
    }

    // Check if reaching 30 unlocks next weapon!
    if (this.player.level >= 30) {
      const unlockChain: Record<WeaponId, WeaponId | null> = {
        sword: 'bow',
        bow: 'crossbow',
        crossbow: 'spear',
        spear: 'trident',
        trident: 'mace',
        mace: null
      };

      const nextWeapon = unlockChain[currentWeapon];
      if (nextWeapon && !this.unlockedWeapons[nextWeapon]) {
        this.unlockedWeapons[nextWeapon] = true;
        this.saveUnlockedWeapons();
        const nextDef = WEAPONS[nextWeapon];
        this.newUnlockAnnounced = `FÉLICITATIONS ! Palier 30 atteint : [${nextDef.name} ${nextDef.icon}] débloquée pour vos prochaines parties !`;
      }
    }
  }

  public selectUpgrade(upgrade: UpgradeOption) {
    survivorSound.uiClick();

    if (upgrade.category === 'player') {
      const key = upgrade.statKey as keyof PlayerStats;
      if (upgrade.isMultiplier) {
        (this.player[key] as number) += upgrade.value;
      } else {
        (this.player[key] as number) += upgrade.value;
        if (key === 'maxHp') {
          this.player.hp = Math.min(this.player.maxHp, this.player.hp + upgrade.value);
        }
      }
    } else if (upgrade.category === 'weapon') {
      if (upgrade.statKey === 'weaponCooldown') {
        // Cooldown reduction (e.g. -12% cooldown)
        this.player.weaponCooldown = Math.max(120, this.player.weaponCooldown * (1 - upgrade.value));
      } else if (upgrade.statKey === 'weaponProjectiles') {
        this.player.weaponProjectiles += upgrade.value;
      } else if (upgrade.statKey === 'weaponPierce') {
        this.player.weaponPierce += upgrade.value;
      } else if (upgrade.statKey === 'weaponRange') {
        this.player.weaponRange *= (1 + upgrade.value);
      } else if (upgrade.statKey === 'weaponArea') {
        this.player.weaponArea *= (1 + upgrade.value);
      } else if (upgrade.statKey === 'weaponProjSpeed') {
        this.player.weaponProjSpeed *= (1 + upgrade.value);
      }
    }

    this.gameState = 'PLAYING';
    this.lastTimestamp = performance.now();
  }

  private rollUpgradeChoices(count: number): UpgradeOption[] {
    const choices: UpgradeOption[] = [];
    const pool = [...BASE_UPGRADES];

    // Shuffle pool
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    for (let i = 0; i < count && i < pool.length; i++) {
      const template = pool[i];
      const rarity = this.rollRarity();
      const rarityCfg = RARITIES[rarity];

      const scaledVal = template.isMultiplier
        ? template.baseValue * rarityCfg.multiplier
        : Math.max(1, Math.round(template.baseValue * rarityCfg.multiplier));

      choices.push({
        id: `opt_${template.id}_${Date.now()}_${i}`,
        name: `${template.name} (${rarityCfg.name})`,
        icon: template.icon,
        description: template.descTemplate(scaledVal),
        rarity,
        category: template.category,
        statKey: template.statKey,
        value: scaledVal,
        isMultiplier: template.isMultiplier
      });
    }

    return choices;
  }

  private rollRarity(): Rarity {
    const roll = Math.random() * 100;
    let accumulated = 0;

    const tiers: Rarity[] = ['legendary', 'epic', 'rare', 'uncommon', 'common'];
    for (const r of tiers) {
      accumulated += RARITIES[r].weight;
      if (roll <= accumulated) {
        return r;
      }
    }
    return 'common';
  }

  // --- SPATIAL PARTITIONING GRID ---

  private buildEnemyGrid() {
    this.enemyGrid.clear();
    for (const e of this.enemies) {
      const gx = Math.floor(e.x / this.gridBucketSize);
      const gy = Math.floor(e.y / this.gridBucketSize);
      const key = `${gx},${gy}`;
      let list = this.enemyGrid.get(key);
      if (!list) {
        list = [];
        this.enemyGrid.set(key, list);
      }
      list.push(e);
    }
  }

  private getNearbyEnemies(x: number, y: number, radius: number): Enemy[] {
    const minGx = Math.floor((x - radius) / this.gridBucketSize);
    const maxGx = Math.floor((x + radius) / this.gridBucketSize);
    const minGy = Math.floor((y - radius) / this.gridBucketSize);
    const maxGy = Math.floor((y + radius) / this.gridBucketSize);

    const result: Enemy[] = [];
    for (let gx = minGx; gx <= maxGx; gx++) {
      for (let gy = minGy; gy <= maxGy; gy++) {
        const list = this.enemyGrid.get(`${gx},${gy}`);
        if (list) {
          result.push(...list);
        }
      }
    }
    return result;
  }

  // --- VFX & PARTICLES ---

  private updateVFX(dt: number) {
    for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
      const dn = this.damageNumbers[i];
      dn.life -= dt;
      dn.y -= 35 * dt; // Float upward
      if (dn.life <= 0) {
        this.damageNumbers.splice(i, 1);
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  public spawnSparks(x: number, y: number, color: string, count: number) {
    for (let k = 0; k < count; k++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 40 + Math.random() * 80;
      this.particles.push({
        id: `pt_${this.nextEntityId++}`,
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        color,
        size: 3 + Math.random() * 3,
        life: 0.3 + Math.random() * 0.2,
        maxLife: 0.5,
        shape: 'square'
      });
    }
  }
}
