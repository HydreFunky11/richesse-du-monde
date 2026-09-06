import { SurvivorEngine } from './survivorEngine';
import type { Enemy, Projectile, ExpOrb, DamageNumber, Particle, PlayerStats, PickupItem } from './survivorTypes';
import { WEAPONS } from './survivorConfig';

export class SurvivorRenderer {
  private ctx: CanvasRenderingContext2D;
  private width: number = 800;
  private height: number = 600;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  public setSize(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  public render(engine: SurvivorEngine) {
    const ctx = this.ctx;
    const player = engine.player;

    ctx.save();
    ctx.clearRect(0, 0, this.width, this.height);

    // Camera transform: keep player centered
    const camX = this.width / 2 - player.x;
    const camY = this.height / 2 - player.y;

    ctx.translate(camX, camY);

    // 1. Minecraft Tiled Terrain
    this.drawTerrain(player.x, player.y);

    // 2. EXP Orbs
    this.drawExpOrbs(engine.expOrbs);

    // 3. Rare Drops / Pickups (Magnet, Freeze, Nuke)
    this.drawPickups(engine.pickups);

    // 4. Projectiles (Under mobs/player or over)
    this.drawProjectiles(engine.projectiles);

    // 4. Enemies & Bosses
    this.drawEnemies(engine.enemies);

    // 5. Player (Steve / Hero with animated weapon)
    this.drawPlayer(player);

    // 6. Particles
    this.drawParticles(engine.particles);

    // 7. Damage Numbers
    this.drawDamageNumbers(engine.damageNumbers);

    ctx.restore();

    // 8. Minecraft HUD (Screen space)
    this.drawHUD(engine);

    // 9. Minecraft Crosshair (When Mouse Aiming Mode is Active)
    if (engine.aimMode === 'mouse') {
      this.drawCrosshair(engine.mouseScreenX, engine.mouseScreenY);
    }
  }

  // --- MINECRAFT TERRAIN (Procedural Grass Blocks & Flowers) ---

  private drawTerrain(px: number, py: number) {
    const ctx = this.ctx;
    const tileSize = 64;

    const startCol = Math.floor((px - this.width / 2) / tileSize) - 1;
    const endCol = Math.floor((px + this.width / 2) / tileSize) + 1;
    const startRow = Math.floor((py - this.height / 2) / tileSize) - 1;
    const endRow = Math.floor((py + this.height / 2) / tileSize) + 1;

    for (let c = startCol; c <= endCol; c++) {
      for (let r = startRow; r <= endRow; r++) {
        const x = c * tileSize;
        const y = r * tileSize;

        // Pseudo-random grass tone based on grid coords
        const hash = Math.abs(Math.sin(c * 12.9898 + r * 78.233) * 43758.5453) % 1;
        
        // Base grass color variations
        if (hash > 0.8) {
          ctx.fillStyle = '#4c873b'; // Lush grass
        } else if (hash > 0.4) {
          ctx.fillStyle = '#477e37'; // Standard grass
        } else {
          ctx.fillStyle = '#417532'; // Darker grass
        }
        ctx.fillRect(x, y, tileSize, tileSize);

        // Pixel grid border
        ctx.strokeStyle = '#386629';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, tileSize, tileSize);

        // Occasional flower or stone pebble
        if (hash > 0.94) {
          // Red Poppy Flower
          ctx.fillStyle = '#dc2626';
          ctx.fillRect(x + 24, y + 24, 6, 6);
          ctx.fillStyle = '#eab308';
          ctx.fillRect(x + 26, y + 26, 2, 2);
        } else if (hash < 0.05) {
          // Dandelion Yellow Flower
          ctx.fillStyle = '#facc15';
          ctx.fillRect(x + 36, y + 36, 5, 5);
        } else if (hash > 0.72 && hash < 0.75) {
          // Grey Stone pebble
          ctx.fillStyle = '#64748b';
          ctx.fillRect(x + 18, y + 42, 8, 4);
        }
      }
    }
  }

  // --- PLAYER RENDERING ---

  private drawPlayer(p: PlayerStats) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(p.x, p.y);

    const isMoving = Math.hypot(p.vx, p.vy) > 10;
    const walkBob = isMoving ? Math.sin(Date.now() * 0.015) * 3 : 0;

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 16, 14, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body rotation towards facing direction
    const faceRight = Math.cos(p.facingAngle) >= 0;

    // Legs (Blue pants)
    ctx.fillStyle = '#1e3a8a';
    ctx.fillRect(-8, 8 + walkBob, 6, 10);
    ctx.fillRect(2, 8 - walkBob, 6, 10);

    // Torso (Cyan shirt)
    ctx.fillStyle = '#06b6d4';
    ctx.fillRect(-10, -8, 20, 16);

    // Arms
    ctx.fillStyle = '#0891b2';
    ctx.fillRect(-14, -7, 4, 13);
    ctx.fillRect(10, -7, 4, 13);

    // Head (Steve skin tone + brown hair)
    ctx.fillStyle = '#d97706'; // Skin
    ctx.fillRect(-8, -22, 16, 14);

    // Hair
    ctx.fillStyle = '#451a03';
    ctx.fillRect(-8, -24, 16, 5);
    ctx.fillRect(faceRight ? -8 : 4, -22, 4, 6);

    // Eyes
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(faceRight ? 0 : -6, -17, 3, 3);
    ctx.fillRect(faceRight ? 4 : -2, -17, 3, 3);
    ctx.fillStyle = '#2563eb'; // Blue pupil
    ctx.fillRect(faceRight ? 2 : -5, -17, 2, 3);
    ctx.fillRect(faceRight ? 6 : -1, -17, 2, 3);

    // WEAPON IN HAND
    ctx.save();
    ctx.rotate(p.facingAngle);
    this.drawWeaponInHand(p);
    ctx.restore();

    ctx.restore();
  }

  private drawWeaponInHand(p: PlayerStats) {
    const ctx = this.ctx;

    switch (p.weaponId) {
      case 'sword':
        // Diamond sword
        ctx.fillStyle = '#38bdf8'; // Diamond blade
        ctx.fillRect(14, -2, 24, 4);
        ctx.fillStyle = '#0284c7'; // Blade border
        ctx.strokeRect(14, -2, 24, 4);
        ctx.fillStyle = '#78350f'; // Handle
        ctx.fillRect(10, -2, 4, 4);
        ctx.fillStyle = '#eab308'; // Guard
        ctx.fillRect(12, -6, 2, 12);
        break;

      case 'bow':
        // Wooden bow with drawn string
        ctx.strokeStyle = '#92400e';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(16, 0, 16, -Math.PI / 3, Math.PI / 3);
        ctx.stroke();
        // Bow string
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(8, -14);
        ctx.lineTo(14, 0);
        ctx.lineTo(8, 14);
        ctx.stroke();
        break;

      case 'crossbow':
        // Heavy crossbow
        ctx.fillStyle = '#78350f';
        ctx.fillRect(8, -4, 20, 8);
        ctx.fillStyle = '#94a3b8'; // Metal limb
        ctx.fillRect(20, -14, 3, 28);
        ctx.fillStyle = '#ef4444'; // Loaded bolt
        ctx.fillRect(14, -1, 14, 2);
        break;

      case 'spear':
        // Long steel spear with speed wrap
        ctx.fillStyle = '#78350f'; // Shaft
        ctx.fillRect(10, -2, 36, 4);
        ctx.fillStyle = '#cbd5e1'; // Spear head
        ctx.beginPath();
        ctx.moveTo(46, -6);
        ctx.lineTo(60, 0);
        ctx.lineTo(46, 6);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#9333ea'; // Purple speed glow
        ctx.lineWidth = 1.5;
        ctx.stroke();
        break;

      case 'trident':
        // Prismarine Trident
        ctx.fillStyle = '#06b6d4'; // Cyan shaft
        ctx.fillRect(12, -2, 34, 4);
        ctx.fillStyle = '#eab308'; // Gold prongs
        ctx.fillRect(38, -8, 12, 3);
        ctx.fillRect(40, -2, 16, 4);
        ctx.fillRect(38, 5, 12, 3);
        break;

      case 'mace':
        // Heavy Mace
        ctx.fillStyle = '#475569'; // Heavy iron shaft
        ctx.fillRect(10, -3, 26, 6);
        ctx.fillStyle = '#1e293b'; // Giant blocky mace head
        ctx.fillRect(32, -10, 16, 20);
        ctx.fillStyle = '#eab308'; // Gold core
        ctx.fillRect(36, -6, 8, 12);
        break;
    }
  }

  // --- ENEMIES & BOSSES ---

  private drawEnemies(enemies: Enemy[]) {
    const ctx = this.ctx;

    for (const e of enemies) {
      ctx.save();
      ctx.translate(e.x, e.y);

      // Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.ellipse(0, e.radius * 0.8, e.radius * 0.9, e.radius * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();

      if (e.isBoss) {
        this.drawBoss(e);
      } else {
        this.drawNormalMob(e);
      }

      // Small Mob Health Bar (if damaged)
      if (e.hp < e.maxHp) {
        const barW = e.radius * 2;
        const barH = 4;
        const pct = Math.max(0, e.hp / e.maxHp);

        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-barW / 2, -e.radius - 8, barW, barH);
        ctx.fillStyle = e.isBoss ? '#a855f7' : '#ef4444';
        ctx.fillRect(-barW / 2, -e.radius - 8, barW * pct, barH);
      }

      ctx.restore();
    }
  }

  private drawNormalMob(e: Enemy) {
    const ctx = this.ctx;
    const r = e.radius;

    switch (e.type) {
      case 'zombie':
        // Green head
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(-r * 0.6, -r * 1.2, r * 1.2, r * 1.2);
        // Black eyes & mouth
        ctx.fillStyle = '#052e16';
        ctx.fillRect(-r * 0.4, -r * 0.8, 4, 4);
        ctx.fillRect(r * 0.1, -r * 0.8, 4, 4);
        // Cyan torso & outstretched arms
        ctx.fillStyle = '#0891b2';
        ctx.fillRect(-r * 0.7, 0, r * 1.4, r * 0.9);
        break;

      case 'skeleton':
        // White bone skull
        ctx.fillStyle = '#f1f5f9';
        ctx.fillRect(-r * 0.6, -r * 1.2, r * 1.2, r * 1.2);
        // Hollow grey eye sockets
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-r * 0.4, -r * 0.8, 5, 5);
        ctx.fillRect(r * 0.1, -r * 0.8, 5, 5);
        // Ribcage
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(-r * 0.5, 0, r, r * 0.8);
        break;

      case 'spider':
        // Low dark spider body
        ctx.fillStyle = '#1c1917';
        ctx.fillRect(-r, -r * 0.6, r * 2, r * 1.2);
        // Glowing red eyes (2 pairs)
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(r * 0.3, -r * 0.3, 3, 3);
        ctx.fillRect(r * 0.6, -r * 0.3, 3, 3);
        ctx.fillRect(r * 0.3, 0.1, 3, 3);
        ctx.fillRect(r * 0.6, 0.1, 3, 3);
        // 8 angled legs
        ctx.strokeStyle = '#292524';
        ctx.lineWidth = 2;
        [-r * 0.6, -r * 0.2, r * 0.2, r * 0.6].forEach(ly => {
          ctx.beginPath();
          ctx.moveTo(-r * 0.8, ly);
          ctx.lineTo(-r * 1.5, ly - 4);
          ctx.lineTo(-r * 1.8, ly + 8);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(r * 0.8, ly);
          ctx.lineTo(r * 1.5, ly - 4);
          ctx.lineTo(r * 1.8, ly + 8);
          ctx.stroke();
        });
        break;

      case 'creeper':
        // Flashing white if hissing!
        const isBlinking = e.isHissing && Math.floor(Date.now() / 80) % 2 === 0;
        ctx.fillStyle = isBlinking ? '#ffffff' : '#16a34a';

        // Green mottled cube head
        ctx.fillRect(-r * 0.7, -r * 1.2, r * 1.4, r * 1.3);

        // Classic Creeper Frown
        ctx.fillStyle = '#022c22';
        ctx.fillRect(-r * 0.45, -r * 0.85, 5, 5); // Left eye
        ctx.fillRect(r * 0.15, -r * 0.85, 5, 5); // Right eye
        ctx.fillRect(-r * 0.2, -r * 0.5, 6, 8); // Nose
        ctx.fillRect(-r * 0.4, -r * 0.25, 4, 8); // Mouth left
        ctx.fillRect(r * 0.15, -r * 0.25, 4, 8); // Mouth right
        break;

      case 'enderman':
        // Tall black figure
        ctx.fillStyle = '#09090b';
        ctx.fillRect(-r * 0.5, -r * 1.8, r, r * 2.2);
        // Glowing purple pixel eyes
        ctx.fillStyle = '#c084fc';
        ctx.fillRect(-r * 0.4, -r * 1.5, 4, 2);
        ctx.fillRect(r * 0.1, -r * 1.5, 4, 2);
        // Purple particles around
        ctx.fillStyle = 'rgba(192, 132, 252, 0.4)';
        ctx.fillRect(Math.sin(Date.now() * 0.01) * 12, -r - 5, 3, 3);
        break;

      case 'slime':
        // Translucent green cube with squash
        const squash = Math.sin(Date.now() * 0.012) * 2;
        ctx.fillStyle = 'rgba(134, 239, 172, 0.85)';
        ctx.fillRect(-r - squash, -r + squash, (r + squash) * 2, (r - squash) * 2);
        // Inner core
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(-r * 0.5, -r * 0.5, r, r);
        break;

      case 'blaze':
        // Floating yellow/orange rods
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(-r * 0.6, -r * 0.6, r * 1.2, r * 1.2);
        ctx.fillStyle = '#ef4444'; // Glowing red eyes
        ctx.fillRect(-r * 0.3, -r * 0.2, 4, 3);
        ctx.fillRect(r * 0.1, -r * 0.2, 4, 3);
        // Orbiting rods
        const rodAngle = Date.now() * 0.005;
        for (let k = 0; k < 4; k++) {
          const a = rodAngle + (k * Math.PI) / 2;
          const rx = Math.cos(a) * (r + 8);
          const ry = Math.sin(a) * (r + 8);
          ctx.fillStyle = '#ea580c';
          ctx.fillRect(rx - 2, ry - 6, 4, 12);
        }
        break;

      case 'phantom':
        // Navy blue winged creature
        ctx.fillStyle = '#1e1b4b';
        ctx.fillRect(-r * 0.8, -r * 0.4, r * 1.6, r * 0.8);
        ctx.fillStyle = '#4ade80'; // Emerald eyes
        ctx.fillRect(-r * 0.4, -r * 0.2, 3, 3);
        ctx.fillRect(r * 0.2, -r * 0.2, 3, 3);
        break;

      case 'witch':
        // Purple robe & witch hat
        ctx.fillStyle = '#581c87';
        ctx.fillRect(-r * 0.6, -r * 0.5, r * 1.2, r * 1.3);
        ctx.fillStyle = '#d97706'; // Skin
        ctx.fillRect(-r * 0.4, -r * 1.1, r * 0.8, r * 0.6);
        // Pointed black hat
        ctx.fillStyle = '#18181b';
        ctx.fillRect(-r * 0.8, -r * 1.2, r * 1.6, 3);
        ctx.fillRect(-r * 0.4, -r * 1.8, r * 0.8, r * 0.6);
        break;
    }
  }

  // --- THE 5 MAJOR BOSSES ---

  private drawBoss(e: Enemy) {
    const ctx = this.ctx;
    const r = e.radius;

    switch (e.bossType) {
      case 'iron_golem':
        // Massive Iron Golem colossus
        ctx.fillStyle = '#e2e8f0'; // Iron body
        ctx.fillRect(-r * 0.8, -r * 0.9, r * 1.6, r * 1.8);
        ctx.fillStyle = '#cbd5e1'; // Head
        ctx.fillRect(-r * 0.5, -r * 1.5, r, r * 0.7);
        // Red glowing eyes
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-r * 0.3, -r * 1.3, 5, 5);
        ctx.fillRect(r * 0.1, -r * 1.3, 5, 5);
        // Rose vine across chest
        ctx.fillStyle = '#15803d';
        ctx.fillRect(-r * 0.4, -r * 0.5, r * 0.8, 4);
        ctx.fillStyle = '#dc2626'; // Red poppy in hand
        ctx.fillRect(r * 0.7, -r * 0.2, 8, 8);
        break;

      case 'guardian':
        // Elder Guardian: giant spiked fish with huge rotating eye
        ctx.fillStyle = '#06b6d4';
        ctx.fillRect(-r * 0.9, -r * 0.9, r * 1.8, r * 1.8);
        // Orange spikes
        ctx.fillStyle = '#ea580c';
        [-r, -r * 0.4, 0, r * 0.4, r].forEach(sx => {
          ctx.fillRect(sx - 3, -r * 1.3, 6, 8);
          ctx.fillRect(sx - 3, r * 0.9, 6, 8);
        });
        // Giant central orange eye
        ctx.fillStyle = '#fed7aa';
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.45, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ea580c'; // Pupil tracking player
        ctx.beginPath();
        ctx.arc(Math.cos(Date.now() * 0.003) * 6, Math.sin(Date.now() * 0.003) * 6, r * 0.22, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'wither':
        // 3-headed black skeletal flying monster
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-r * 0.5, -r * 0.5, r, r * 1.5);
        // Center head
        ctx.fillRect(-r * 0.4, -r * 1.2, r * 0.8, r * 0.8);
        ctx.fillStyle = '#ffffff'; // Center eyes
        ctx.fillRect(-r * 0.25, -r * 1.0, 4, 4);
        ctx.fillRect(r * 0.05, -r * 1.0, 4, 4);

        // Left Head
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-r * 1.2, -r * 0.9, r * 0.6, r * 0.6);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-r * 1.05, -r * 0.75, 3, 3);
        ctx.fillRect(-r * 0.8, -r * 0.75, 3, 3);

        // Right Head
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(r * 0.6, -r * 0.9, r * 0.6, r * 0.6);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(r * 0.75, -r * 0.75, 3, 3);
        ctx.fillRect(r * 1.0, -r * 0.75, 3, 3);
        break;

      case 'ender_dragon':
        // Majestic black dragon with massive purple wings
        ctx.fillStyle = '#09090b';
        ctx.fillRect(-r * 0.8, -r * 0.8, r * 1.6, r * 1.6);
        // Flapping wings
        const wingFlap = Math.sin(Date.now() * 0.008) * 18;
        ctx.fillStyle = '#18181b';
        ctx.beginPath();
        ctx.moveTo(-r * 0.8, -r * 0.4);
        ctx.lineTo(-r * 2.2, -r * 1.2 + wingFlap);
        ctx.lineTo(-r * 1.8, r * 0.8);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(r * 0.8, -r * 0.4);
        ctx.lineTo(r * 2.2, -r * 1.2 + wingFlap);
        ctx.lineTo(r * 1.8, r * 0.8);
        ctx.closePath();
        ctx.fill();

        // Glowing purple eyes
        ctx.fillStyle = '#a855f7';
        ctx.fillRect(-r * 0.4, -r * 0.5, 6, 6);
        ctx.fillRect(r * 0.1, -r * 0.5, 6, 6);
        break;

      case 'warden':
        // The Warden: terrifying sculk beast with glowing ribcage
        ctx.fillStyle = '#042f2e'; // Dark teal body
        ctx.fillRect(-r * 0.8, -r * 0.9, r * 1.6, r * 2.0);
        // Sculpted sculk horns / antennae
        ctx.fillStyle = '#0f766e';
        ctx.fillRect(-r * 0.9, -r * 1.7, 8, r * 0.9);
        ctx.fillRect(r * 0.6, -r * 1.7, 8, r * 0.9);
        // Glowing cyan sculk ribcage pulsing
        const pulse = 0.6 + Math.sin(Date.now() * 0.008) * 0.35;
        ctx.fillStyle = `rgba(6, 182, 212, ${pulse})`;
        ctx.fillRect(-r * 0.4, -r * 0.3, r * 0.8, 5);
        ctx.fillRect(-r * 0.4, 0, r * 0.8, 5);
        ctx.fillRect(-r * 0.3, r * 0.3, r * 0.6, 5);
        // Roaring blind mouth
        ctx.fillStyle = '#021e1d';
        ctx.fillRect(-r * 0.4, -r * 1.1, r * 0.8, r * 0.5);
        break;
    }
  }

  // --- PROJECTILES ---

  private drawProjectiles(projectiles: Projectile[]) {
    const ctx = this.ctx;

    for (const p of projectiles) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);

      switch (p.type) {
        case 'arrow':
          // Wooden Minecraft arrow
          ctx.fillStyle = '#78350f'; // Shaft
          ctx.fillRect(-12, -1.5, 24, 3);
          ctx.fillStyle = '#94a3b8'; // Flint tip
          ctx.beginPath();
          ctx.moveTo(12, -4);
          ctx.lineTo(18, 0);
          ctx.lineTo(12, 4);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#f8fafc'; // White feathers
          ctx.fillRect(-14, -3, 4, 6);
          break;

        case 'bolt':
          // Heavy crossbow bolt with spark
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(-14, -3, 28, 6);
          ctx.fillStyle = '#facc15';
          ctx.fillRect(8, -2, 6, 4);
          break;

        case 'slash':
          // Sweeping cyan sword arc
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.arc(0, 0, p.radius, -Math.PI / 3, Math.PI / 3);
          ctx.stroke();
          ctx.strokeStyle = '#e0f2fe';
          ctx.lineWidth = 2;
          ctx.stroke();
          break;

        case 'spear':
          // Spear thrust line with purple velocity wind
          ctx.fillStyle = '#a855f7';
          ctx.fillRect(0, -3, p.length || 180, 6);
          ctx.fillStyle = '#f3e8ff';
          ctx.beginPath();
          ctx.moveTo((p.length || 180) - 10, -8);
          ctx.lineTo((p.length || 180) + 12, 0);
          ctx.lineTo((p.length || 180) - 10, 8);
          ctx.closePath();
          ctx.fill();
          break;

        case 'trident':
          // Cyan glowing trident
          ctx.fillStyle = '#06b6d4';
          ctx.fillRect(-16, -2, 32, 4);
          ctx.fillStyle = '#facc15';
          ctx.fillRect(10, -6, 8, 12);
          // Electric particles
          ctx.fillStyle = '#67e8f9';
          ctx.fillRect(16, -2, 4, 4);
          break;

        case 'smash':
          // Expanding stone shockwave ring for Mace
          ctx.strokeStyle = '#eab308';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.strokeStyle = 'rgba(234, 179, 8, 0.3)';
          ctx.lineWidth = 12;
          ctx.stroke();
          break;

        case 'fireball':
          // Blaze fireball
          ctx.fillStyle = '#ea580c';
          ctx.beginPath();
          ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#facc15';
          ctx.beginPath();
          ctx.arc(0, 0, p.radius * 0.5, 0, Math.PI * 2);
          ctx.fill();
          break;
      }

      ctx.restore();
    }
  }

  // --- EXP ORBS (Glowing Diamonds) ---

  private drawExpOrbs(orbs: ExpOrb[]) {
    const ctx = this.ctx;
    const pulse = Math.sin(Date.now() * 0.01) * 2;

    for (const orb of orbs) {
      ctx.save();
      ctx.translate(orb.x, orb.y);
      ctx.rotate(Math.PI / 4); // Diamond rotation

      const r = orb.radius + pulse;
      ctx.fillStyle = orb.color;
      ctx.fillRect(-r / 2, -r / 2, r, r);

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-r / 2, -r / 2, r, r);

      ctx.restore();
    }
  }

  // --- RARE DROPS & PICKUPS (Magnet, Freeze, Nuke) ---

  private drawPickups(pickups: PickupItem[]) {
    const ctx = this.ctx;
    const now = Date.now();

    for (const p of pickups) {
      ctx.save();
      const bob = Math.sin(now * 0.006 + p.pulseAngle) * 4;
      ctx.translate(p.x, p.y + bob);

      // Glowing aura circle on ground
      const pulseRadius = p.radius + 6 + Math.sin(now * 0.008) * 3;
      ctx.fillStyle = p.type === 'magnet' ? 'rgba(56, 189, 248, 0.25)' :
                      p.type === 'freeze' ? 'rgba(6, 182, 212, 0.3)' :
                      'rgba(239, 68, 68, 0.3)';
      ctx.beginPath();
      ctx.arc(0, 0, pulseRadius, 0, Math.PI * 2);
      ctx.fill();

      // Draw specific icon/sprite
      if (p.type === 'magnet') {
        // Red U-shape Magnet
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-10, -12, 6, 18);
        ctx.fillRect(4, -12, 6, 18);
        ctx.fillRect(-10, 2, 20, 6);
        // Silver tips
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(-10, -12, 6, 5);
        ctx.fillRect(4, -12, 6, 5);
        // Spark
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(-2, -8, 4, 4);
      } else if (p.type === 'freeze') {
        // Cyan Pocket Watch / Clock
        ctx.fillStyle = '#06b6d4';
        ctx.beginPath();
        ctx.arc(0, 0, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        // Clock hands
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -6);
        ctx.moveTo(0, 0);
        ctx.lineTo(5, 0);
        ctx.stroke();
      } else if (p.type === 'nuke') {
        // TNT Block
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(-10, -10, 20, 20);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-10, -3, 20, 6);
        ctx.font = 'bold 7px monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#000000';
        ctx.fillText('TNT', 0, 2);
        // Fuse spark
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(-1, -14, 3, 4);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(Math.sin(now * 0.02) * 2, -16, 2, 2);
      }

      ctx.restore();
    }
  }

  // --- PARTICLES & DAMAGE NUMBERS ---

  private drawParticles(particles: Particle[]) {
    const ctx = this.ctx;
    for (const p of particles) {
      const alpha = p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      ctx.restore();
    }
  }

  private drawDamageNumbers(dns: DamageNumber[]) {
    const ctx = this.ctx;
    ctx.save();
    ctx.font = 'bold 15px monospace';
    ctx.textAlign = 'center';

    for (const dn of dns) {
      const alpha = dn.life / dn.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = dn.color;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.strokeText(dn.text, dn.x, dn.y);
      ctx.fillText(dn.text, dn.x, dn.y);
    }
    ctx.restore();
  }

  // --- HUD (MINECRAFT STYLE) ---

  private drawHUD(engine: SurvivorEngine) {
    const ctx = this.ctx;
    const p = engine.player;

    ctx.save();

    // 1. TOP MINECRAFT EXPERIENCE BAR
    const barW = Math.min(600, this.width - 40);
    const barH = 12;
    const barX = (this.width - barW) / 2;
    const barY = 22;

    const expPct = Math.min(1.0, Math.max(0, p.currentExp / p.nextLevelExp));

    // Grey frame
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);
    ctx.fillStyle = '#334155';
    ctx.fillRect(barX, barY, barW, barH);

    // Green EXP Fill
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(barX, barY, barW * expPct, barH);

    // Level number in center
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#000000';
    ctx.fillText(`${p.level}`, this.width / 2, barY - 6);
    ctx.fillStyle = '#86efac';
    ctx.fillText(`${p.level}`, this.width / 2 - 1, barY - 7);

    // 2. MINECRAFT HEARTS ROW (Bottom-Left)
    // 20 HP = 10 full hearts. 1 heart = 2 HP.
    const heartStartX = 24;
    const heartStartY = this.height - 40;
    const totalHearts = Math.ceil(p.maxHp / 2);

    for (let i = 0; i < totalHearts; i++) {
      const hx = heartStartX + i * 22;
      const currentHeartHp = p.hp - i * 2;

      // Heart outline background
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(hx, heartStartY, 18, 16);

      if (currentHeartHp >= 2) {
        // Full heart (Red)
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(hx + 1, heartStartY + 1, 16, 14);
        ctx.fillStyle = '#fca5a5';
        ctx.fillRect(hx + 3, heartStartY + 3, 4, 4); // Highlight
      } else if (currentHeartHp >= 1) {
        // Half heart
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(hx + 1, heartStartY + 1, 8, 14);
      }
    }

    // HP Text
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${Math.ceil(p.hp)} / ${p.maxHp} PV`, heartStartX, heartStartY - 6);

    // 3. TOP-CENTER: WAVE & TIMER & TARGET QUOTA
    const mins = Math.floor(engine.waveTimer / 60);
    const secs = Math.floor(engine.waveTimer % 60);
    const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

    const isClearCountdown = engine.waveClearCountdown !== null;
    const boxW = isClearCountdown ? 340 : 300;

    ctx.fillStyle = isClearCountdown ? 'rgba(6, 78, 59, 0.95)' : 'rgba(15, 23, 42, 0.88)';
    ctx.strokeStyle = isClearCountdown ? '#22c55e' : '#475569';
    ctx.lineWidth = 2;
    ctx.fillRect(this.width / 2 - boxW / 2, 48, boxW, 36);
    ctx.strokeRect(this.width / 2 - boxW / 2, 48, boxW, 36);

    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    if (isClearCountdown) {
      ctx.fillStyle = '#4ade80';
      ctx.fillText(`✨ VAGUE NETTOYÉE ! Suivante dans ${Math.ceil(engine.waveClearCountdown!)}s`, this.width / 2, 71);
    } else {
      ctx.fillStyle = engine.currentWave % 10 === 0 ? '#f43f5e' : '#facc15';
      ctx.fillText(`VAGUE ${engine.currentWave}/50   🎯 ${engine.waveCurrentKills}/${engine.waveTargetKills}   ⏱️ ${timeStr}`, this.width / 2, 71);
    }

    // 4. TOP-LEFT: KILLS & WEAPON
    const def = WEAPONS[p.weaponId];
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(20, 48, 210, 46);
    ctx.strokeRect(20, 48, 210, 46);

    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText(`💀 Éliminations: ${p.kills}`, 32, 68);
    ctx.fillStyle = def.color;
    ctx.fillText(`${def.icon} ${def.name}`, 32, 85);

    // 5. TOP-RIGHT: STATS OVERVIEW (EXP MULTIPLIER, SPEED, ARMOR, LUCK)
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(this.width - 200, 44, 185, 72);
    ctx.strokeRect(this.width - 200, 44, 185, 72);

    ctx.font = '11px monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#4ade80';
    ctx.fillText(`🧪 Multiplicateur EXP: x${p.expMultiplier.toFixed(2)}`, this.width - 190, 60);
    ctx.fillStyle = '#60a5fa';
    ctx.fillText(`🛡️ Armure: +${p.armor}  🥾 Vit: ${p.moveSpeed}`, this.width - 190, 76);
    ctx.fillStyle = '#f59e0b';
    ctx.fillText(`💪 Dégâts: +${Math.round((p.damageMultiplier - 1) * 100)}%`, this.width - 190, 92);
    ctx.fillStyle = '#a7f3d0';
    ctx.fillText(`🍀 Chance: +${Math.round((p.luck - 1) * 100)}%`, this.width - 190, 106);

    // 6. BOSS BAR (When Boss is Active)
    if (engine.activeBoss) {
      const boss = engine.activeBoss;
      const bBarW = Math.min(500, this.width - 80);
      const bBarH = 16;
      const bBarX = (this.width - bBarW) / 2;
      const bBarY = 96;
      const bPct = Math.max(0, boss.hp / boss.maxHp);

      ctx.fillStyle = '#020617';
      ctx.fillRect(bBarX - 3, bBarY - 3, bBarW + 6, bBarH + 6);
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 2;
      ctx.strokeRect(bBarX - 3, bBarY - 3, bBarW + 6, bBarH + 6);

      // Boss HP fill
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(bBarX, bBarY, bBarW * bPct, bBarH);

      // Boss Name
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`👑 ${boss.bossName || 'GRAND BOSS'} (${Math.ceil(boss.hp)} / ${boss.maxHp} PV)`, this.width / 2, bBarY - 6);
    }

    // 7. FROZEN TIME OVERLAY & INDICATOR
    if (engine.freezeTimer > 0) {
      ctx.save();
      // Icy screen vignette border
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.65)';
      ctx.lineWidth = 10;
      ctx.strokeRect(0, 0, this.width, this.height);

      // Freeze indicator tag
      const fW = 180;
      ctx.fillStyle = 'rgba(6, 182, 212, 0.9)';
      ctx.fillRect(this.width / 2 - fW / 2, 14, fW, 24);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(this.width / 2 - fW / 2, 14, fW, 24);

      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`❄️ TEMPS GELÉ : ${engine.freezeTimer.toFixed(1)}s`, this.width / 2, 30);
      ctx.restore();
    }

    // 8. TOAST NOTIFICATION BANNER
    if (engine.notification) {
      ctx.save();
      const notifY = engine.activeBoss ? 122 : 94;
      const notifW = 340;
      const notifH = 34;
      const notifX = (this.width - notifW) / 2;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
      ctx.fillRect(notifX, notifY, notifW, notifH);
      ctx.strokeStyle = engine.notification.color;
      ctx.lineWidth = 2;
      ctx.strokeRect(notifX, notifY, notifW, notifH);

      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = engine.notification.color;
      ctx.fillText(engine.notification.text, this.width / 2, notifY + 22);
      ctx.restore();
    }

    ctx.restore();
  }

  // --- MINECRAFT PIXEL CROSSHAIR ---

  private drawCrosshair(mx: number, my: number) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(mx, my);

    // Dark drop shadow / outline
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(-8, -2.5, 16, 5);
    ctx.fillRect(-2.5, -8, 5, 16);

    // Crisp white crosshair plus sign
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(-7, -1.5, 14, 3);
    ctx.fillRect(-1.5, -7, 3, 14);

    // Cyan diamond center dot
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(-1, -1, 2, 2);

    ctx.restore();
  }
}
