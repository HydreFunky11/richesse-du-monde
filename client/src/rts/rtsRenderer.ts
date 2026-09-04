import type {
  RtsFaction,
  ResourceType,
  ResourceNode,
  RtsUnit,
  RtsBuilding,
  RtsProjectile,
  RtsPowerLine,
  RtsPlayer
} from './rtsTypes';

export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

export const FACTION_COLORS: Record<RtsFaction, { primary: string; secondary: string; glow: string; text: string }> = {
  nanite: {
    primary: '#10B981',
    secondary: '#064E3B',
    glow: '#34D399',
    text: 'text-emerald-400'
  },
  aegis: {
    primary: '#3B82F6',
    secondary: '#1E3A8A',
    glow: '#60A5FA',
    text: 'text-blue-400'
  },
  phantom: {
    primary: '#A855F7',
    secondary: '#581C87',
    glow: '#C084FC',
    text: 'text-purple-400'
  },
  vanguard: {
    primary: '#F97316',
    secondary: '#7C2D12',
    glow: '#FB923C',
    text: 'text-orange-400'
  }
};

export function getUnitSightRadius(type: string): number {
  switch (type) {
    case 'scout': return 420;
    case 'dropship': return 360;
    case 'assault': return 280;
    case 'hover_tank': return 300;
    case 'heavy_mecha': return 300;
    case 'harvester': return 220;
    default: return 240;
  }
}

export function getBuildingSightRadius(type: string): number {
  switch (type) {
    case 'nexus': return 440;
    case 'plasma_turret': return 380;
    case 'satellite_uplink': return 360;
    case 'pylon': return 260;
    case 'science_lab': return 260;
    case 'barracks': return 240;
    case 'factory': return 240;
    default: return 220;
  }
}

export class RtsRenderer {
  private ctx: CanvasRenderingContext2D;
  private animTime: number = 0;
  private smokeParticles: { x: number; y: number; vx: number; vy: number; radius: number; life: number; maxLife: number }[] = [];
  private sparks: { x: number; y: number; vx: number; vy: number; life: number; color: string }[] = [];

  // Fog of War offscreen buffers & explored grid
  private exploredCanvas: HTMLCanvasElement | null = null;
  private exploredCtx: CanvasRenderingContext2D | null = null;
  private fogCanvas: HTMLCanvasElement | null = null;
  private fogCtx: CanvasRenderingContext2D | null = null;
  private exploredGrid: Uint8Array | null = null;
  private gridCols: number = 0;
  private gridRows: number = 0;
  private readonly TILE_SIZE: number = 32;

  // Active sight tracking
  private activeSightCenters: { x: number; y: number; radius: number }[] = [];
  private hasGlobalSatellite: boolean = false;
  private satelliteWorldPos: { x: number; y: number } = { x: 100, y: 300 };

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  public isPointInActiveSight(wx: number, wy: number): boolean {
    if (this.hasGlobalSatellite) return true;
    for (let i = 0; i < this.activeSightCenters.length; i++) {
      const s = this.activeSightCenters[i];
      const dx = wx - s.x;
      const dy = wy - s.y;
      if (dx * dx + dy * dy <= s.radius * s.radius) {
        return true;
      }
    }
    return false;
  }

  public isPointExplored(wx: number, wy: number): boolean {
    if (this.hasGlobalSatellite) return true;
    if (!this.exploredGrid) return false;
    const c = Math.floor(wx / this.TILE_SIZE);
    const r = Math.floor(wy / this.TILE_SIZE);
    if (c < 0 || c >= this.gridCols || r < 0 || r >= this.gridRows) return false;
    return this.exploredGrid[r * this.gridCols + c] === 1;
  }

  public update(dt: number) {
    this.animTime += dt;

    // Advance orbital satellite across the sky
    this.satelliteWorldPos.x += dt * 55;
    this.satelliteWorldPos.y += dt * 20;
    if (this.satelliteWorldPos.x > 3600) {
      this.satelliteWorldPos.x = -400;
      this.satelliteWorldPos.y = (this.satelliteWorldPos.y + 450) % 2200;
    }

    // Update smoke
    for (let i = this.smokeParticles.length - 1; i >= 0; i--) {
      const p = this.smokeParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.radius += 0.15;
      p.life -= dt;
      if (p.life <= 0) {
        this.smokeParticles.splice(i, 1);
      }
    }

    // Update sparks
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.x += s.vx;
      s.y += s.vy;
      s.life -= dt * 2.5;
      if (s.life <= 0) {
        this.sparks.splice(i, 1);
      }
    }
  }

  private markExplored(wx: number, wy: number, radius: number) {
    if (!this.exploredGrid) return;
    const minCol = Math.max(0, Math.floor((wx - radius) / this.TILE_SIZE));
    const maxCol = Math.min(this.gridCols - 1, Math.floor((wx + radius) / this.TILE_SIZE));
    const minRow = Math.max(0, Math.floor((wy - radius) / this.TILE_SIZE));
    const maxRow = Math.min(this.gridRows - 1, Math.floor((wy + radius) / this.TILE_SIZE));
    const rSq = radius * radius;

    for (let r = minRow; r <= maxRow; r++) {
      const centerY = (r + 0.5) * this.TILE_SIZE;
      const dy = wy - centerY;
      const dySq = dy * dy;
      const rowOffset = r * this.gridCols;
      for (let c = minCol; c <= maxCol; c++) {
        const centerX = (c + 0.5) * this.TILE_SIZE;
        const dx = wx - centerX;
        if (dx * dx + dySq <= rSq) {
          this.exploredGrid[rowOffset + c] = 1;
        }
      }
    }

    if (this.exploredCtx) {
      const scale = 0.25;
      this.exploredCtx.fillStyle = '#ffffff';
      this.exploredCtx.beginPath();
      this.exploredCtx.arc(wx * scale, wy * scale, radius * scale, 0, Math.PI * 2);
      this.exploredCtx.fill();
    }
  }

  public render(
    canvasW: number,
    canvasH: number,
    camera: Camera,
    mapW: number,
    mapH: number,
    players: RtsPlayer[],
    myPlayerId: string,
    resourceNodes: ResourceNode[],
    buildings: RtsBuilding[],
    units: RtsUnit[],
    projectiles: RtsProjectile[],
    powerLines: RtsPowerLine[],
    selectedUnitIds: string[],
    selectedBuildingId: string | null,
    placementGhost: { type: string; x: number; y: number; valid: boolean } | null,
    selectionBox: { startX: number; startY: number; currentX: number; currentY: number } | null
  ) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, canvasW, canvasH);

    ctx.save();
    // Apply camera transformation
    ctx.translate(canvasW / 2, canvasH / 2);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);

    // 0. Update Vision & Exploration
    const myPlayer = players.find(p => p.id === myPlayerId);
    this.hasGlobalSatellite = !!myPlayer?.hasSatelliteVision;

    const cols = Math.ceil(mapW / this.TILE_SIZE);
    const rows = Math.ceil(mapH / this.TILE_SIZE);
    if (!this.exploredGrid || this.gridCols !== cols || this.gridRows !== rows) {
      this.gridCols = cols;
      this.gridRows = rows;
      this.exploredGrid = new Uint8Array(cols * rows);

      this.exploredCanvas = document.createElement('canvas');
      this.exploredCanvas.width = Math.ceil(mapW / 4);
      this.exploredCanvas.height = Math.ceil(mapH / 4);
      this.exploredCtx = this.exploredCanvas.getContext('2d');
      if (this.exploredCtx) {
        this.exploredCtx.clearRect(0, 0, this.exploredCanvas.width, this.exploredCanvas.height);
      }

      this.fogCanvas = document.createElement('canvas');
      this.fogCanvas.width = this.exploredCanvas.width;
      this.fogCanvas.height = this.exploredCanvas.height;
      this.fogCtx = this.fogCanvas.getContext('2d');
    }

    // Collect active sight centers for current frame
    this.activeSightCenters = [];
    if (this.hasGlobalSatellite) {
      if (this.exploredGrid) this.exploredGrid.fill(1);
      if (this.exploredCtx && this.exploredCanvas) {
        this.exploredCtx.fillStyle = '#ffffff';
        this.exploredCtx.fillRect(0, 0, this.exploredCanvas.width, this.exploredCanvas.height);
      }
    } else {
      // My units
      for (let i = 0; i < units.length; i++) {
        const u = units[i];
        if (u.playerId === myPlayerId) {
          const r = getUnitSightRadius(u.type);
          this.activeSightCenters.push({ x: u.x, y: u.y, radius: r });
          this.markExplored(u.x, u.y, r);
        }
      }
      // My buildings
      for (let i = 0; i < buildings.length; i++) {
        const b = buildings[i];
        if (b.playerId === myPlayerId) {
          const r = getBuildingSightRadius(b.type);
          this.activeSightCenters.push({ x: b.x, y: b.y, radius: r });
          this.markExplored(b.x, b.y, r);
        }
      }
    }

    // 1. Terrain & Grid
    this.drawTerrain(mapW, mapH);

    // 2. Power Lines & Electric Grid
    this.drawPowerLines(powerLines, myPlayerId);

    // 3. Resource Nodes (Faceted Crystals, Trees, Coal Rocks)
    this.drawResourceNodes(resourceNodes);

    // 4. Buildings (Pylons, Solar, Wind, Factories, Labs...)
    this.drawBuildings(buildings, myPlayerId, selectedBuildingId);

    // 5. Units (Harvesters, Scouts, Mechas, Tanks, Flyers)
    this.drawUnits(units, myPlayerId, selectedUnitIds);

    // 6. Shield Domes (Aegis Force Fields)
    this.drawShieldDomes(players);

    // 7. Projectiles (Lasers, Missiles, Plasma)
    this.drawProjectiles(projectiles);

    // 8. VFX Particles (Smoke & Sparks)
    this.drawParticles();

    // 9. Placement Ghost
    if (placementGhost) {
      this.drawPlacementGhost(placementGhost);
    }

    // 10. Fog of War Mask
    this.drawFogOfWar(mapW, mapH);

    ctx.restore();

    // 11. Selection Box (Screen Space)
    if (selectionBox) {
      this.drawSelectionBox(selectionBox);
    }
  }

  // ─── 1. TERRAIN & SCI-FI PLATES ───────────────────────────────────────────

  private drawTerrain(mapW: number, mapH: number) {
    const ctx = this.ctx;

    // Dark titanium alien ground base
    const grad = ctx.createLinearGradient(0, 0, mapW, mapH);
    grad.addColorStop(0, '#090d16');
    grad.addColorStop(0.5, '#0d131f');
    grad.addColorStop(1, '#080c14');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, mapW, mapH);

    // Grid panels
    ctx.strokeStyle = 'rgba(30, 41, 59, 0.45)';
    ctx.lineWidth = 1;
    const tileSize = 60;

    for (let x = 0; x <= mapW; x += tileSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, mapH);
      ctx.stroke();
    }
    for (let y = 0; y <= mapH; y += tileSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(mapW, y);
      ctx.stroke();
    }

    // Map Borders with neon hazard glow
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 4;
    ctx.strokeRect(0, 0, mapW, mapH);

    // Corner decorative sci-fi brackets
    this.drawCornerBracket(0, 0, 1, 1);
    this.drawCornerBracket(mapW, 0, -1, 1);
    this.drawCornerBracket(0, mapH, 1, -1);
    this.drawCornerBracket(mapW, mapH, -1, -1);
  }

  private drawCornerBracket(x: number, y: number, sx: number, sy: number) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(sx, sy);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 40);
    ctx.lineTo(40, 0);
    ctx.lineTo(70, 0);
    ctx.stroke();
    ctx.restore();
  }

  // ─── 2. ELECTRIC POWER GRID & CABLES ──────────────────────────────────────

  private drawPowerLines(lines: RtsPowerLine[], myPlayerId: string) {
    const ctx = this.ctx;
    const time = this.animTime * 3;

    for (const line of lines) {
      const isAlly = line.playerId === myPlayerId;

      // In Fog of War:
      if (!this.hasGlobalSatellite) {
        // Enemy power lines: completely invisible unless at least one endpoint is in active sight
        if (!isAlly) {
          const fromInSight = this.isPointInActiveSight(line.fromX, line.fromY);
          const toInSight = this.isPointInActiveSight(line.toX, line.toY);
          if (!fromInSight && !toInSight) {
            continue; // Completely hidden in unexplored fog or shroud!
          }
        } else {
          // Ally power lines: only draw if at least one endpoint has been explored
          const fromExplored = this.isPointExplored(line.fromX, line.fromY);
          const toExplored = this.isPointExplored(line.toX, line.toY);
          if (!fromExplored && !toExplored) {
            continue; // Not yet discovered
          }
        }
      }

      const midX = (line.fromX + line.toX) / 2;
      const midY = (line.fromY + line.toY) / 2;
      const dist = Math.hypot(line.toX - line.fromX, line.toY - line.fromY);
      const sag = Math.min(25, dist * 0.08); // realistic catenary cable sag

      // Active sight along cable
      const isLineInActiveSight = this.hasGlobalSatellite ||
        this.isPointInActiveSight(line.fromX, line.fromY) ||
        this.isPointInActiveSight(line.toX, line.toY) ||
        this.isPointInActiveSight(midX, midY);

      ctx.save();

      // If in shroud (explored territory but currently shrouded / no active sight):
      // Draw as a quiet, dimmed gray memory cable with NO glowing pulses
      if (!isLineInActiveSight) {
        ctx.strokeStyle = 'rgba(71, 85, 105, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(line.fromX, line.fromY);
        ctx.quadraticCurveTo(midX, midY + sag, line.toX, line.toY);
        ctx.stroke();
        ctx.restore();
        continue;
      }

      // Cable shadow
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(line.fromX, line.fromY + 6);
      ctx.quadraticCurveTo(midX, midY + sag + 6, line.toX, line.toY + 6);
      ctx.stroke();

      if (line.active) {
        // Glowing electric cable
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(line.fromX, line.fromY);
        ctx.quadraticCurveTo(midX, midY + sag, line.toX, line.toY);
        ctx.stroke();

        // High-voltage traveling pulses along cable
        const pulses = 3;
        for (let p = 0; p < pulses; p++) {
          const t = ((time + (p / pulses)) % 1);
          // Quadratic bezier interpolation
          const px = (1 - t) * (1 - t) * line.fromX + 2 * (1 - t) * t * midX + t * t * line.toX;
          const py = (1 - t) * (1 - t) * line.fromY + 2 * (1 - t) * t * (midY + sag) + t * t * line.toY;

          ctx.fillStyle = '#67e8f9';
          ctx.shadowColor = '#06b6d4';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(px, py, 3, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.shadowBlur = 0;
      } else {
        // Inactive / severed / brownout cable
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(line.fromX, line.fromY);
        ctx.quadraticCurveTo(midX, midY + sag, line.toX, line.toY);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  // ─── 3. RESOURCE NODES (Crystals, Forest, Coal) ───────────────────────────

  private drawResourceNodes(nodes: ResourceNode[]) {
    const ctx = this.ctx;

    for (const node of nodes) {
      if (node.amount <= 0) continue;
      if (!this.isPointExplored(node.x, node.y)) continue;
      const ratio = node.amount / node.maxAmount;
      const r = node.radius * Math.max(0.6, ratio);

      ctx.save();
      ctx.translate(node.x, node.y);

      // Ambient glow
      const glowGrad = ctx.createRadialGradient(0, 0, 5, 0, 0, r * 1.6);
      if (node.type === 'metal') {
        glowGrad.addColorStop(0, 'rgba(14, 165, 233, 0.4)');
        glowGrad.addColorStop(1, 'rgba(14, 165, 233, 0)');
      } else if (node.type === 'wood') {
        glowGrad.addColorStop(0, 'rgba(16, 185, 129, 0.35)');
        glowGrad.addColorStop(1, 'rgba(16, 185, 129, 0)');
      } else {
        glowGrad.addColorStop(0, 'rgba(239, 68, 68, 0.35)');
        glowGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
      }
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.6, 0, Math.PI * 2);
      ctx.fill();

      if (node.type === 'metal') {
        // Crystalline formation: 6 faceted crystal spires
        const crystals = 6;
        for (let i = 0; i < crystals; i++) {
          const angle = (i / crystals) * Math.PI * 2 + 0.3;
          const len = r * (0.7 + (i % 3) * 0.2);
          const cx = Math.cos(angle) * (r * 0.45);
          const cy = Math.sin(angle) * (r * 0.45);

          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(angle + Math.PI / 2);

          // Crystal spire
          ctx.fillStyle = i % 2 === 0 ? '#0284c7' : '#38bdf8';
          ctx.beginPath();
          ctx.moveTo(-4, 0);
          ctx.lineTo(0, -len);
          ctx.lineTo(4, 0);
          ctx.closePath();
          ctx.fill();

          // Specular glint
          ctx.strokeStyle = '#bae6fd';
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.restore();
        }

        // Center crystal
        ctx.fillStyle = '#e0f2fe';
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();
      } else if (node.type === 'wood') {
        // Bioluminescent alien tree cluster
        const clusters = 5;
        for (let i = 0; i < clusters; i++) {
          const angle = (i / clusters) * Math.PI * 2;
          const dist = r * 0.5;
          const bx = Math.cos(angle) * dist;
          const by = Math.sin(angle) * dist;

          ctx.fillStyle = i % 2 === 0 ? '#047857' : '#10b981';
          ctx.beginPath();
          ctx.arc(bx, by, r * 0.45, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = '#6ee7b7';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        // Trunk core
        ctx.fillStyle = '#064e3b';
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.3, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Coal: volcanic obsidian jagged rocks with molten fissures
        ctx.fillStyle = '#1c1917';
        ctx.beginPath();
        ctx.moveTo(-r, -r * 0.4);
        ctx.lineTo(-r * 0.3, -r);
        ctx.lineTo(r * 0.7, -r * 0.6);
        ctx.lineTo(r, r * 0.5);
        ctx.lineTo(0, r);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#44403c';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Molten ember crack
        ctx.strokeStyle = '#f97316';
        ctx.lineWidth = 1.5;
        ctx.shadowColor = '#ea580c';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.moveTo(-r * 0.5, 0);
        ctx.lineTo(0, -r * 0.2);
        ctx.lineTo(r * 0.4, r * 0.3);
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  // ─── 4. BUILDINGS ─────────────────────────────────────────────────────────

  private drawBuildings(buildings: RtsBuilding[], myPlayerId: string, selectedBuildingId: string | null) {
    const ctx = this.ctx;

    for (const b of buildings) {
      const isSelected = b.id === selectedBuildingId;
      const isAlly = b.playerId === myPlayerId;
      const colors = FACTION_COLORS[b.faction] || FACTION_COLORS.aegis;

      // Enemy building visibility in fog of war: must be at least explored
      if (!isAlly && !this.isPointExplored(b.x, b.y)) {
        continue;
      }
      const inActiveSight = isAlly || this.isPointInActiveSight(b.x, b.y);

      ctx.save();
      ctx.translate(b.x, b.y);

      // If explored enemy building but currently in shroud (memory):
      if (!isAlly && !inActiveSight) {
        ctx.globalAlpha = 0.45;
      }

      // Building footprint shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(-b.width / 2 - 2, -b.height / 2 + 6, b.width + 4, b.height);

      // Industrial Base Foundation with Chamfered Corners
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = isSelected ? '#38bdf8' : (isAlly ? colors.primary : '#ef4444');
      ctx.lineWidth = isSelected ? 3 : 2;

      const bw = b.width;
      const bh = b.height;
      const c = 8; // chamfer
      ctx.beginPath();
      ctx.moveTo(-bw / 2 + c, -bh / 2);
      ctx.lineTo(bw / 2 - c, -bh / 2);
      ctx.lineTo(bw / 2, -bh / 2 + c);
      ctx.lineTo(bw / 2, bh / 2 - c);
      ctx.lineTo(bw / 2 - c, bh / 2);
      ctx.lineTo(-bw / 2 + c, bh / 2);
      ctx.lineTo(-bw / 2, bh / 2 - c);
      ctx.lineTo(-bw / 2, -bh / 2 + c);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Scaffolding / Unfinished building hatch
      if (!b.isConstructed) {
        ctx.fillStyle = 'rgba(245, 158, 11, 0.2)';
        ctx.fill();
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-bw / 2, -bh / 2);
        ctx.lineTo(bw / 2, bh / 2);
        ctx.moveTo(bw / 2, -bh / 2);
        ctx.lineTo(-bw / 2, bh / 2);
        ctx.stroke();

        // Mini build bar
        if (inActiveSight) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
          ctx.fillRect(-bw / 2, bh / 2 + 5, bw, 4);
          ctx.fillStyle = '#f59e0b';
          ctx.fillRect(-bw / 2, bh / 2 + 5, bw * (b.constructionProgress / 100), 4);
        }
        ctx.restore();
        continue;
      }

      // Specific Building Graphics
      if (b.type === 'nexus') {
        this.drawNexusGraphics(bw, bh, colors);
      } else if (b.type === 'solar_panel') {
        this.drawSolarPanelGraphics(bw, bh);
      } else if (b.type === 'wind_turbine') {
        this.drawWindTurbineGraphics(bw, bh);
      } else if (b.type === 'thermal_plant') {
        this.drawThermalPlantGraphics(bw, bh, b.isUpgraded, b.isPowered);
      } else if (b.type === 'pylon') {
        this.drawPylonGraphics(bw, bh, b.isConnectedToPower);
      } else if (b.type === 'science_lab') {
        this.drawScienceLabGraphics(bw, bh, b.isPowered);
      } else if (b.type === 'barracks') {
        this.drawBarracksGraphics(bw, bh, colors);
      } else if (b.type === 'factory') {
        this.drawFactoryGraphics(bw, bh, colors);
      } else if (b.type === 'plasma_turret') {
        this.drawPlasmaTurretGraphics(bw, bh, b.targetUnitId);
      } else if (b.type === 'satellite_uplink') {
        this.drawSatelliteUplinkGraphics(bw, bh, b.isPowered);
      }

      // Brownout / Powered Status Indicator LED
      if (inActiveSight) {
        ctx.fillStyle = b.isPowered ? '#10b981' : '#ef4444';
        ctx.shadowColor = b.isPowered ? '#10b981' : '#ef4444';
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.arc(bw / 2 - 6, -bh / 2 + 6, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Selection Halo
      if (isSelected) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(-bw / 2 - 4, -bh / 2 - 4, bw + 8, bh + 8);
        ctx.setLineDash([]);
      }

      // Health Bar (only if ally or in active sight)
      if (isAlly || inActiveSight) {
        const barW = bw;
        const barH = 4;
        const barX = -barW / 2;
        const barY = -bh / 2 - 9;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);

        const hpRatio = Math.max(0, b.hp / b.maxHp);
        ctx.fillStyle = hpRatio > 0.5 ? '#10b981' : (hpRatio > 0.2 ? '#f59e0b' : '#ef4444');
        ctx.fillRect(barX, barY, barW * hpRatio, barH);

        // Shield Bar if present
        if (b.maxShield > 0) {
          const shieldRatio = Math.max(0, b.shield / b.maxShield);
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(barX, barY - 3, barW * shieldRatio, 2);
        }
      }

      ctx.restore();
    }
  }

  private drawNexusGraphics(w: number, h: number, colors: { primary: string; glow: string }) {
    const ctx = this.ctx;
    // Central reactor dome
    const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, w * 0.35);
    grad.addColorStop(0, '#e0f2fe');
    grad.addColorStop(0.4, colors.primary);
    grad.addColorStop(1, '#0f172a');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, w * 0.32, 0, Math.PI * 2);
    ctx.fill();

    // Pulsing inner ring
    const pulse = 0.8 + Math.sin(this.animTime * 3) * 0.2;
    ctx.strokeStyle = colors.glow;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, w * 0.2 * pulse, 0, Math.PI * 2);
    ctx.stroke();

    // 4 Corner Antenna Pylons
    const corners = [[-w * 0.35, -h * 0.35], [w * 0.35, -h * 0.35], [-w * 0.35, h * 0.35], [w * 0.35, h * 0.35]];
    ctx.fillStyle = '#334155';
    for (const [cx, cy] of corners) {
      ctx.fillRect(cx - 3, cy - 3, 6, 6);
    }
  }

  private drawSolarPanelGraphics(w: number, h: number) {
    const ctx = this.ctx;
    // 6 Blue Photovoltaic cells
    const rows = 2;
    const cols = 3;
    const cellW = (w - 8) / cols;
    const cellH = (h - 8) / rows;

    ctx.fillStyle = '#0284c7';
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = -w / 2 + 4 + c * cellW;
        const y = -h / 2 + 4 + r * cellH;
        ctx.fillRect(x + 1, y + 1, cellW - 2, cellH - 2);
      }
    }
    // Specular reflective diagonal glare
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-w / 2 + 4, h / 2 - 4);
    ctx.lineTo(w / 2 - 4, -h / 2 + 4);
    ctx.stroke();
  }

  private drawWindTurbineGraphics(w: number, _h: number) {
    const ctx = this.ctx;
    // Central nacelle
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();

    // 3 Aerodynamic Spinning Blades
    const bladeAngle = this.animTime * 2.5;
    ctx.fillStyle = '#cbd5e1';
    for (let i = 0; i < 3; i++) {
      const angle = bladeAngle + (i / 3) * Math.PI * 2;
      ctx.save();
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(-1.5, 0);
      ctx.lineTo(0, -w * 0.85);
      ctx.lineTo(1.5, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  private drawThermalPlantGraphics(w: number, h: number, isUpgraded?: boolean, isPowered?: boolean) {
    const ctx = this.ctx;
    // Twin chimneys
    ctx.fillStyle = isUpgraded ? '#1c1917' : '#78350f';
    ctx.fillRect(-w * 0.35, -h * 0.45, 8, 12);
    ctx.fillRect(w * 0.35 - 8, -h * 0.45, 8, 12);

    // Glowing combustion core
    if (isPowered) {
      const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, w * 0.25);
      glow.addColorStop(0, isUpgraded ? '#f97316' : '#ea580c');
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, w * 0.3, 0, Math.PI * 2);
      ctx.fill();

      // Spawn chimney smoke
      if (Math.random() < 0.15) {
        this.smokeParticles.push({
          x: ctx.getTransform().e - w * 0.3,
          y: ctx.getTransform().f - h * 0.45,
          vx: (Math.random() - 0.5) * 0.3,
          vy: -0.8 - Math.random() * 0.5,
          radius: 3,
          life: 1.2,
          maxLife: 1.2
        });
      }
    }
  }

  private drawPylonGraphics(w: number, h: number, isConnected: boolean) {
    const ctx = this.ctx;
    // Metal lattice X
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-w / 2 + 4, -h / 2 + 4);
    ctx.lineTo(w / 2 - 4, h / 2 - 4);
    ctx.moveTo(w / 2 - 4, -h / 2 + 4);
    ctx.lineTo(-w / 2 + 4, h / 2 - 4);
    ctx.stroke();

    // Top Tesla sphere
    ctx.fillStyle = isConnected ? '#38bdf8' : '#64748b';
    ctx.beginPath();
    ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
    ctx.fill();

    if (isConnected) {
      ctx.shadowColor = '#0284c7';
      ctx.shadowBlur = 6;
      ctx.strokeStyle = '#bae6fd';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  private drawScienceLabGraphics(w: number, _h: number, isPowered: boolean) {
    const ctx = this.ctx;
    // Glass dome
    const domeGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, w * 0.35);
    domeGrad.addColorStop(0, isPowered ? 'rgba(56, 189, 248, 0.6)' : 'rgba(100, 116, 139, 0.4)');
    domeGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = domeGrad;
    ctx.beginPath();
    ctx.arc(0, 0, w * 0.35, 0, Math.PI * 2);
    ctx.fill();

    // Rotating holographic gyroscope rings
    if (isPowered) {
      const ringAngle = this.animTime * 2;
      ctx.save();
      ctx.rotate(ringAngle);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, w * 0.25, w * 0.1, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.rotate(-ringAngle * 1.3);
      ctx.strokeStyle = '#818cf8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, w * 0.25, w * 0.1, Math.PI / 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawBarracksGraphics(w: number, h: number, colors: { primary: string }) {
    const ctx = this.ctx;
    // Armored entrance bunker gates
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-w * 0.35, h * 0.15, w * 0.7, h * 0.3);
    ctx.strokeStyle = colors.primary;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-w * 0.35, h * 0.15, w * 0.7, h * 0.3);

    // Antenna dish
    ctx.strokeStyle = '#94a3b8';
    ctx.beginPath();
    ctx.arc(0, -h * 0.15, 6, Math.PI, 0);
    ctx.stroke();
  }

  private drawFactoryGraphics(w: number, _h: number, colors: { primary: string }) {
    const ctx = this.ctx;
    // Heavy gantry crane roof
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-w * 0.4, 0);
    ctx.lineTo(w * 0.4, 0);
    ctx.stroke();

    // Faction trim on hangar roof
    ctx.strokeStyle = colors.primary;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-w * 0.35, -w * 0.25, w * 0.7, w * 0.5);

    // Laser welding spark
    if (Math.random() < 0.2) {
      ctx.fillStyle = '#67e8f9';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawPlasmaTurretGraphics(w: number, h: number, _targetUnitId?: string | null) {
    const ctx = this.ctx;
    // Turret ball base
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.arc(0, 0, w * 0.35, 0, Math.PI * 2);
    ctx.fill();

    // Dual railgun barrels
    const barrelAngle = this.animTime; // rotates in idle or points to target
    ctx.save();
    ctx.rotate(barrelAngle);
    ctx.fillStyle = '#0ea5e9';
    ctx.fillRect(-3, -h * 0.55, 2, h * 0.35);
    ctx.fillRect(1, -h * 0.55, 2, h * 0.35);
    ctx.restore();
  }

  private drawSatelliteUplinkGraphics(w: number, _h: number, isPowered: boolean) {
    const ctx = this.ctx;

    // Octagonal reinforced foundation
    const rad = w * 0.42;
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = isPowered ? '#06b6d4' : '#64748b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      const px = Math.cos(a) * rad;
      const py = Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Concentric telemetry ring
    ctx.strokeStyle = isPowered ? 'rgba(6, 182, 212, 0.6)' : 'rgba(100, 116, 139, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, rad * 0.7, 0, Math.PI * 2);
    ctx.stroke();

    // Motorized Parabolic Dish
    const dishAngle = this.animTime * 0.5;
    ctx.save();
    ctx.rotate(dishAngle);

    // Dish ellipse
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = isPowered ? '#38bdf8' : '#94a3b8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, -2, rad * 0.6, rad * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Central transmitter horn & antenna
    ctx.strokeStyle = isPowered ? '#22d3ee' : '#64748b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -2);
    ctx.lineTo(0, -rad * 0.7);
    ctx.stroke();

    // Glowing antenna tip
    ctx.fillStyle = isPowered ? '#67e8f9' : '#ef4444';
    ctx.shadowColor = isPowered ? '#06b6d4' : '#ef4444';
    ctx.shadowBlur = isPowered ? 8 : 2;
    ctx.beginPath();
    ctx.arc(0, -rad * 0.7, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Radio transmission pulse waves towards the sky when powered
    if (isPowered) {
      const wavePhase = (this.animTime * 2.5) % 1;
      const waveRadius = rad * 0.5 + wavePhase * (rad * 0.8);
      ctx.strokeStyle = `rgba(34, 211, 238, ${1 - wavePhase})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, -rad * 0.7, waveRadius, -Math.PI * 0.8, -Math.PI * 0.2);
      ctx.stroke();
    }

    ctx.restore();
  }

  // ─── 5. UNITS ─────────────────────────────────────────────────────────────

  private drawUnits(units: RtsUnit[], myPlayerId: string, selectedUnitIds: string[]) {
    const ctx = this.ctx;

    for (const u of units) {
      const isSelected = selectedUnitIds.includes(u.id);
      const isAlly = u.playerId === myPlayerId;
      const colors = FACTION_COLORS[u.faction] || FACTION_COLORS.aegis;

      // Enemy unit in Fog of War: invisible if not in active sight
      if (!isAlly && !this.isPointInActiveSight(u.x, u.y)) {
        continue;
      }

      ctx.save();
      ctx.translate(u.x, u.y);

      // Stealth opacity
      if (u.isStealthed) {
        ctx.globalAlpha = isAlly ? 0.45 : 0; // invisible to enemies!
      }

      // Unit Shadow (higher if flying)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      ctx.ellipse(0, u.isFlying ? 14 : 3, u.radius * 1.1, u.radius * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();

      // Draw Chassis based on angle
      ctx.save();
      ctx.rotate(u.angle);

      if (u.type === 'harvester') {
        this.drawHarvesterUnit(u.radius, colors, u.cargoAmount > 0, u.cargoType);
      } else if (u.type === 'scout') {
        this.drawScoutUnit(u.radius, colors);
      } else if (u.type === 'assault') {
        this.drawAssaultUnit(u.radius, colors);
      } else if (u.type === 'heavy_mecha') {
        this.drawMechaUnit(u.radius, colors);
      } else if (u.type === 'hover_tank') {
        this.drawHoverTankUnit(u.radius, colors);
      } else if (u.type === 'dropship') {
        this.drawDropshipUnit(u.radius, colors);
      }
      ctx.restore();

      // Independent Rotating Turret (if applicable)
      if (u.type === 'hover_tank' || u.type === 'heavy_mecha' || u.type === 'assault') {
        ctx.save();
        ctx.rotate(u.turretAngle);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-2, -u.radius * 1.2, 4, u.radius * 0.8);
        ctx.fillStyle = colors.primary;
        ctx.beginPath();
        ctx.arc(0, 0, u.radius * 0.45, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Selection Reticle
      if (isSelected) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        const selR = u.radius + 6;
        ctx.beginPath();
        ctx.arc(0, 0, selR, 0, Math.PI * 2);
        ctx.stroke();

        // 4 Reticle Brackets
        const bracketLen = 4;
        ctx.strokeStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(-selR - 2, 0); ctx.lineTo(-selR + bracketLen, 0);
        ctx.moveTo(selR + 2, 0); ctx.lineTo(selR - bracketLen, 0);
        ctx.moveTo(0, -selR - 2); ctx.lineTo(0, -selR + bracketLen);
        ctx.moveTo(0, selR + 2); ctx.lineTo(0, selR - bracketLen);
        ctx.stroke();
      }

      // Mini Health / Shield Bar
      const barW = u.radius * 2.2;
      const barH = 3;
      const barX = -barW / 2;
      const barY = -u.radius - 8;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.fillRect(barX - 0.5, barY - 0.5, barW + 1, barH + 1);

      const hpRatio = Math.max(0, u.hp / u.maxHp);
      ctx.fillStyle = isAlly ? '#10b981' : '#ef4444';
      ctx.fillRect(barX, barY, barW * hpRatio, barH);

      if (u.maxShield > 0) {
        const shieldRatio = Math.max(0, u.shield / u.maxShield);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(barX, barY - 2.5, barW * shieldRatio, 1.5);
      }

      ctx.restore();
    }
  }

  private drawHarvesterUnit(r: number, colors: { primary: string }, hasCargo: boolean, cargoType: ResourceType | null) {
    const ctx = this.ctx;
    // Caterpillar treads
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-r, -r * 0.8, r * 2, r * 0.35);
    ctx.fillRect(-r, r * 0.45, r * 2, r * 0.35);

    // Body
    ctx.fillStyle = '#334155';
    ctx.fillRect(-r * 0.7, -r * 0.5, r * 1.4, r);

    // Faction cab plating
    ctx.fillStyle = colors.primary;
    ctx.fillRect(-r * 0.4, -r * 0.35, r * 0.8, r * 0.7);

    // Front mining drills
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.moveTo(r * 0.7, -r * 0.4);
    ctx.lineTo(r * 1.3, -r * 0.2);
    ctx.lineTo(r * 0.7, 0);
    ctx.moveTo(r * 0.7, 0);
    ctx.lineTo(r * 1.3, r * 0.2);
    ctx.lineTo(r * 0.7, r * 0.4);
    ctx.fill();

    // Cargo Container in the back
    if (hasCargo) {
      let cargoColor = '#0284c7'; // metal
      if (cargoType === 'wood') cargoColor = '#10b981';
      else if (cargoType === 'coal') cargoColor = '#f97316';

      ctx.fillStyle = cargoColor;
      ctx.fillRect(-r * 0.6, -r * 0.3, r * 0.5, r * 0.6);
    }
  }

  private drawScoutUnit(r: number, colors: { primary: string; glow: string }) {
    const ctx = this.ctx;
    // Aerodynamic wedge speeder
    ctx.fillStyle = colors.primary;
    ctx.beginPath();
    ctx.moveTo(r * 1.3, 0);
    ctx.lineTo(-r, -r * 0.7);
    ctx.lineTo(-r * 0.5, 0);
    ctx.lineTo(-r, r * 0.7);
    ctx.closePath();
    ctx.fill();

    // Rear thruster glow
    ctx.fillStyle = colors.glow;
    ctx.shadowColor = colors.glow;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(-r * 0.7, 0, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  private drawAssaultUnit(r: number, colors: { primary: string }) {
    const ctx = this.ctx;
    // Armored chassis
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(-r, -r * 0.7, r * 2, r * 1.4, 4);
    ctx.fill();

    // Armor plates
    ctx.fillStyle = colors.primary;
    ctx.fillRect(-r * 0.5, -r * 0.5, r, r);
  }

  private drawMechaUnit(r: number, colors: { primary: string }) {
    const ctx = this.ctx;
    // Heavy Titan pauldrons
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-r, -r * 0.9, r * 0.6, r * 1.8);

    // Torso armor
    ctx.fillStyle = colors.primary;
    ctx.beginPath();
    ctx.moveTo(r * 0.9, 0);
    ctx.lineTo(-r * 0.4, -r * 0.7);
    ctx.lineTo(-r * 0.4, r * 0.7);
    ctx.closePath();
    ctx.fill();

    // Cockpit glass
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(r * 0.2, 0, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawHoverTankUnit(r: number, colors: { primary: string; glow: string }) {
    const ctx = this.ctx;
    // Cyan levitation cushion glow underneath
    ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.2, r * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Skirt chassis
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(-r * 1.1, -r * 0.7, r * 2.2, r * 1.4, 6);
    ctx.fill();

    ctx.strokeStyle = colors.primary;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  private drawDropshipUnit(r: number, colors: { primary: string }) {
    const ctx = this.ctx;
    // Delta swept wings
    ctx.fillStyle = colors.primary;
    ctx.beginPath();
    ctx.moveTo(r * 1.4, 0);
    ctx.lineTo(-r, -r * 1.2);
    ctx.lineTo(-r * 0.4, 0);
    ctx.lineTo(-r, r * 1.2);
    ctx.closePath();
    ctx.fill();

    // Wingtip lights
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(-r * 0.9, -r * 1.2, 3, 3);
    ctx.fillRect(-r * 0.9, r * 1.2 - 3, 3, 3);
  }

  // ─── 6. SHIELD DOMES (Aegis Force Fields) ─────────────────────────────────

  private drawShieldDomes(players: RtsPlayer[]) {
    const ctx = this.ctx;

    for (const player of players) {
      for (const dome of player.activeShieldDomes) {
        ctx.save();
        ctx.translate(dome.x, dome.y);

        // Radial shimmer
        const grad = ctx.createRadialGradient(0, 0, dome.radius * 0.4, 0, 0, dome.radius);
        grad.addColorStop(0, 'rgba(56, 189, 248, 0.05)');
        grad.addColorStop(0.8, 'rgba(56, 189, 248, 0.25)');
        grad.addColorStop(1, 'rgba(56, 189, 248, 0.7)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, dome.radius, 0, Math.PI * 2);
        ctx.fill();

        // Hexagonal grid shimmer
        this.drawHexGrid(dome.radius);

        // Pulsing border ring
        ctx.strokeStyle = '#67e8f9';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(0, 0, dome.radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
      }
    }
  }

  private drawHexGrid(radius: number) {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = 'rgba(103, 232, 249, 0.25)';
    ctx.lineWidth = 1;
    const hexSize = 16;

    for (let x = -radius; x <= radius; x += hexSize * 1.5) {
      for (let y = -radius; y <= radius; y += hexSize * Math.sqrt(3)) {
        if (Math.hypot(x, y) <= radius - 4) {
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const hx = x + Math.cos(angle) * (hexSize * 0.5);
            const hy = y + Math.sin(angle) * (hexSize * 0.5);
            if (i === 0) ctx.moveTo(hx, hy);
            else ctx.lineTo(hx, hy);
          }
          ctx.closePath();
          ctx.stroke();
        }
      }
    }
    ctx.restore();
  }

  // ─── 7. PROJECTILES ───────────────────────────────────────────────────────

  private drawProjectiles(projectiles: RtsProjectile[]) {
    const ctx = this.ctx;

    for (const p of projectiles) {
      ctx.save();
      ctx.translate(p.x, p.y);

      if (p.type === 'laser') {
        // Glowing laser line
        ctx.strokeStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(p.startX - p.x, p.startY - p.y);
        ctx.lineTo(0, 0);
        ctx.stroke();

        // White hot core
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
      } else if (p.type === 'plasma') {
        // Glowing plasma orb
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Bullet or missile
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  // ─── 8. PARTICLES (Smoke & Sparks) ────────────────────────────────────────

  private drawParticles() {
    const ctx = this.ctx;

    // Smoke
    for (const p of this.smokeParticles) {
      const alpha = (p.life / p.maxLife) * 0.4;
      ctx.fillStyle = `rgba(148, 163, 184, ${alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Sparks
    for (const s of this.sparks) {
      ctx.fillStyle = s.color;
      ctx.fillRect(s.x, s.y, 2, 2);
    }
  }

  // ─── 9. PLACEMENT GHOST ───────────────────────────────────────────────────

  private drawPlacementGhost(ghost: { type: string; x: number; y: number; valid: boolean }) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(ghost.x, ghost.y);

    const size = 40;
    ctx.fillStyle = ghost.valid ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)';
    ctx.strokeStyle = ghost.valid ? '#10b981' : '#ef4444';
    ctx.lineWidth = 2;
    ctx.fillRect(-size / 2, -size / 2, size, size);
    ctx.strokeRect(-size / 2, -size / 2, size, size);

    // Power connection radius indicator
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(0, 0, 240, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  // ─── 10. FOG OF WAR (3-Tier Real-Time Masking) ────────────────────────────

  public getExploredCanvas(): HTMLCanvasElement | null {
    return this.exploredCanvas;
  }

  private drawFogOfWar(mapW: number, mapH: number) {
    const ctx = this.ctx;

    // If global satellite surveillance is online:
    if (this.hasGlobalSatellite) {
      this.drawOrbitalSatelliteAndHUD(mapW, mapH);
      return;
    }

    if (!this.fogCanvas || !this.fogCtx || !this.exploredCanvas) return;

    const fCtx = this.fogCtx;
    const fw = this.fogCanvas.width;
    const fh = this.fogCanvas.height;
    const scale = fw / mapW;

    // 1. Reset composite and fill with pitch-black unexplored fog
    fCtx.globalCompositeOperation = 'source-over';
    fCtx.globalAlpha = 1.0;
    fCtx.fillStyle = '#000000'; // 100% pure black, completely opaque
    fCtx.fillRect(0, 0, fw, fh);

    // 2. Carve explored regions into shrouded darkness (semi-transparent)
    fCtx.globalCompositeOperation = 'destination-out';
    fCtx.globalAlpha = 0.55; // leaves 45% dark shroud over explored terrain
    fCtx.drawImage(this.exploredCanvas, 0, 0);

    // 3. Punch out active vision circles with radial feathering (100% clear)
    fCtx.globalAlpha = 1.0;
    for (let i = 0; i < this.activeSightCenters.length; i++) {
      const s = this.activeSightCenters[i];
      const cx = s.x * scale;
      const cy = s.y * scale;
      const cr = s.radius * scale;

      const grad = fCtx.createRadialGradient(cx, cy, Math.max(0, cr * 0.72), cx, cy, cr);
      grad.addColorStop(0, 'rgba(0, 0, 0, 1)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      fCtx.fillStyle = grad;
      fCtx.beginPath();
      fCtx.arc(cx, cy, cr, 0, Math.PI * 2);
      fCtx.fill();
    }

    // 4. Render the fog canvas across the entire world
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.fogCanvas, 0, 0, mapW, mapH);
    ctx.restore();
  }

  private drawOrbitalSatelliteAndHUD(mapW: number, mapH: number) {
    const ctx = this.ctx;

    // Atmospheric orbital scan line sweeping across world
    const scanY = (this.animTime * 180) % mapH;
    const grad = ctx.createLinearGradient(0, scanY - 60, 0, scanY + 60);
    grad.addColorStop(0, 'rgba(6, 182, 212, 0)');
    grad.addColorStop(0.5, 'rgba(6, 182, 212, 0.12)');
    grad.addColorStop(1, 'rgba(6, 182, 212, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, scanY - 60, mapW, 120);

    ctx.strokeStyle = 'rgba(34, 211, 238, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, scanY);
    ctx.lineTo(mapW, scanY);
    ctx.stroke();

    // Draw the Orbital Reconnaissance Satellite flying across space
    const sat = this.satelliteWorldPos;
    ctx.save();
    ctx.translate(sat.x, sat.y);

    // Downward orbital scanning cone projection
    const coneGrad = ctx.createRadialGradient(0, 0, 10, 0, 140, 260);
    coneGrad.addColorStop(0, 'rgba(6, 182, 212, 0.35)');
    coneGrad.addColorStop(1, 'rgba(6, 182, 212, 0)');
    ctx.fillStyle = coneGrad;
    ctx.beginPath();
    ctx.moveTo(-20, 0);
    ctx.lineTo(-240, 320);
    ctx.lineTo(240, 320);
    ctx.lineTo(20, 0);
    ctx.closePath();
    ctx.fill();

    // Satellite shadow below
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 160, 45, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    // Main Satellite Bus Chassis (Hexagonal gold/titanium)
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-18, -12);
    ctx.lineTo(18, -12);
    ctx.lineTo(26, 0);
    ctx.lineTo(18, 12);
    ctx.lineTo(-18, 12);
    ctx.lineTo(-26, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Gold foil thermal blanket panels
    ctx.fillStyle = '#d97706';
    ctx.fillRect(-12, -8, 24, 16);

    // High-Gain Optical Lens (aperture glow)
    ctx.fillStyle = '#06b6d4';
    ctx.shadowColor = '#06b6d4';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Dual Extended Solar Panels
    const panelW = 60;
    const panelH = 22;

    // Left Solar Wing
    ctx.fillStyle = '#0369a1';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.fillRect(-26 - panelW, -panelH / 2, panelW, panelH);
    ctx.strokeRect(-26 - panelW, -panelH / 2, panelW, panelH);

    // Solar cells grid
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(-26 - (i * panelW) / 4, -panelH / 2);
      ctx.lineTo(-26 - (i * panelW) / 4, panelH / 2);
      ctx.stroke();
    }

    // Right Solar Wing
    ctx.fillStyle = '#0369a1';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.fillRect(26, -panelH / 2, panelW, panelH);
    ctx.strokeRect(26, -panelH / 2, panelW, panelH);

    for (let i = 1; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(26 + (i * panelW) / 4, -panelH / 2);
      ctx.lineTo(26 + (i * panelW) / 4, panelH / 2);
      ctx.stroke();
    }

    // Ion Drive Engine Plume
    const plumePulse = Math.sin(this.animTime * 10) * 4;
    ctx.fillStyle = '#38bdf8';
    ctx.shadowColor = '#06b6d4';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(-6, -14);
    ctx.lineTo(6, -14);
    ctx.lineTo(0, -28 - plumePulse);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.restore();
  }

  // ─── 11. SELECTION BOX ────────────────────────────────────────────────────

  private drawSelectionBox(box: { startX: number; startY: number; currentX: number; currentY: number }) {
    const ctx = this.ctx;
    const x = Math.min(box.startX, box.currentX);
    const y = Math.min(box.startY, box.currentY);
    const w = Math.abs(box.currentX - box.startX);
    const h = Math.abs(box.currentY - box.startY);

    ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
    ctx.fillRect(x, y, w, h);

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, w, h);
  }
}
