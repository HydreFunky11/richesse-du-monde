import type {
  MobaGameState,
  MobaPlayer,
  MobaMinion,
  MobaTurret,
  MobaNexus,
  MobaJungleMonster,
  MobaBush,
  MobaProjectile,
  MobaFloatingText,
  SpellKey
} from "./mobaTypes";
import { CHAMPIONS } from "./mobaConstants";

export interface Camera {
  x: number;
  y: number;
}

export interface ClickFx {
  x: number;
  y: number;
  type: "move" | "attack";
  life: number;
  maxLife: number;
}

export function renderMoba(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: MobaGameState,
  localPlayerId: string,
  camera: Camera,
  mouseWorld: { x: number; y: number },
  aimingSpell: SpellKey | null,
  clickFxList: ClickFx[]
) {
  ctx.clearRect(0, 0, width, height);

  ctx.save();
  // Camera transform (camera.x, camera.y is center of screen)
  ctx.translate(width / 2 - camera.x, height / 2 - camera.y);

  // 1. Arena Map Background
  renderMapBackground(ctx, state);

  // 2. Bushes (Floor layer)
  renderBushes(ctx, state.bushes);

  // 3. Objectives & Structures
  renderNexuses(ctx, state.nexuses);
  renderTurrets(ctx, state.turrets);
  renderJungleMonsters(ctx, state.jungleMonsters);

  // 4. Minions
  renderMinions(ctx, state.minions);

  // 5. Champions / Players
  const localPlayer = state.players.find(p => p.id === localPlayerId);
  renderPlayers(ctx, state.players, localPlayer, state.bushes);

  // 6. Projectiles & VFX
  renderProjectiles(ctx, state.projectiles);

  // 7. Aiming Indicators (Skillshot arrows / Range circles)
  if (localPlayer && localPlayer.isAlive && aimingSpell) {
    renderAimingIndicators(ctx, localPlayer, aimingSpell, mouseWorld);
  }

  // 8. Click FX
  renderClickFx(ctx, clickFxList);

  // 9. Floating Combat Text
  renderFloatingTexts(ctx, state.floatingTexts);

  ctx.restore();
}

function renderMapBackground(ctx: CanvasRenderingContext2D, state: MobaGameState) {
  const w = state.mapWidth;
  const h = state.mapHeight;
  const midY = 700;

  // Background Ground (Dark jungle terrain)
  ctx.fillStyle = "#0B131E";
  ctx.fillRect(0, 0, w, h);

  // Arena Border
  ctx.strokeStyle = "#1E293B";
  ctx.lineWidth = 12;
  ctx.strokeRect(0, 0, w, h);

  // River running vertically at center
  ctx.fillStyle = "rgba(14, 116, 144, 0.25)";
  ctx.beginPath();
  ctx.ellipse(1200, 700, 160, 680, 0, 0, Math.PI * 2);
  ctx.fill();

  // River water currents / details
  ctx.strokeStyle = "rgba(56, 189, 248, 0.2)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(1200, 40);
  ctx.bezierCurveTo(1160, 350, 1240, 1050, 1200, 1360);
  ctx.stroke();

  // Mid Lane (Stone road)
  ctx.fillStyle = "#1E293B";
  ctx.fillRect(160, midY - 90, w - 320, 180);

  // Lane Cobblestone Grid texture
  ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
  ctx.lineWidth = 1.5;
  for (let x = 160; x < w - 160; x += 60) {
    ctx.beginPath();
    ctx.moveTo(x, midY - 90);
    ctx.lineTo(x, midY + 90);
    ctx.stroke();
  }

  // Central lane dividing dashed line
  ctx.strokeStyle = "rgba(245, 158, 11, 0.2)";
  ctx.lineWidth = 2;
  ctx.setLineDash([12, 12]);
  ctx.beginPath();
  ctx.moveTo(180, midY);
  ctx.lineTo(w - 180, midY);
  ctx.stroke();
  ctx.setLineDash([]);

  // Blue Fountain / Base Platform
  ctx.fillStyle = "rgba(37, 99, 235, 0.2)";
  ctx.beginPath();
  ctx.arc(180, midY, 190, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#2563EB";
  ctx.lineWidth = 3;
  ctx.stroke();

  // Red Fountain / Base Platform
  ctx.fillStyle = "rgba(225, 29, 72, 0.2)";
  ctx.beginPath();
  ctx.arc(w - 180, midY, 190, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#E11D48";
  ctx.lineWidth = 3;
  ctx.stroke();

  // Boss Pits
  // Top Boss Pit (Herald)
  ctx.fillStyle = "rgba(168, 85, 247, 0.15)";
  ctx.beginPath();
  ctx.arc(1200, 180, 130, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(168, 85, 247, 0.4)";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Bot Boss Pit (Dragon)
  ctx.fillStyle = "rgba(239, 68, 68, 0.15)";
  ctx.beginPath();
  ctx.arc(1200, 1220, 130, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(239, 68, 68, 0.4)";
  ctx.lineWidth = 2;
  ctx.stroke();
}

function renderBushes(ctx: CanvasRenderingContext2D, bushes: MobaBush[]) {
  for (const b of bushes) {
    ctx.save();
    // Bush shadow & glow
    ctx.fillStyle = "rgba(22, 101, 52, 0.7)";
    ctx.strokeStyle = "#22C55E";
    ctx.lineWidth = 2;

    const rx = b.x - b.width / 2;
    const ry = b.y - b.height / 2;
    const r = 20;

    // Rounded bush rectangle
    ctx.beginPath();
    ctx.roundRect(rx, ry, b.width, b.height, r);
    ctx.fill();
    ctx.stroke();

    // Leaf details inside
    ctx.fillStyle = "rgba(74, 222, 128, 0.35)";
    for (let i = 1; i <= 3; i++) {
      ctx.beginPath();
      ctx.arc(rx + (b.width * i) / 4, ry + b.height / 2, 16, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

function renderNexuses(ctx: CanvasRenderingContext2D, nexuses: MobaNexus[]) {
  for (const n of nexuses) {
    const isBlue = n.team === "blue";
    const color = isBlue ? "#3B82F6" : "#EF4444";
    const glowColor = isBlue ? "rgba(59, 130, 246, 0.4)" : "rgba(239, 68, 68, 0.4)";

    ctx.save();
    // Outer platform glow
    ctx.fillStyle = glowColor;
    ctx.beginPath();
    ctx.arc(n.x, n.y, n.radius + 15, 0, Math.PI * 2);
    ctx.fill();

    // Nexus Base
    ctx.fillStyle = "#1E293B";
    ctx.strokeStyle = color;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Inner Gem / Crystal Diamond
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(n.x, n.y - 35);
    ctx.lineTo(n.x + 30, n.y);
    ctx.lineTo(n.x, n.y + 35);
    ctx.lineTo(n.x - 30, n.y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Nexus Core Text
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 13px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(isBlue ? "NEXUS BLEU" : "NEXUS ROUGE", n.x, n.y + 5);

    // HP Bar
    renderHealthBar(ctx, n.x, n.y - n.radius - 20, 110, 10, n.hp, n.maxHp, color);

    ctx.restore();
  }
}

function renderTurrets(ctx: CanvasRenderingContext2D, turrets: MobaTurret[]) {
  for (const t of turrets) {
    if (t.hp <= 0) continue;
    const isBlue = t.team === "blue";
    const color = isBlue ? "#38BDF8" : "#F43F5E";

    ctx.save();
    // Base circle
    ctx.fillStyle = "#0F172A";
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Inner Turret Cannon/Gem
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.radius * 0.5, 0, Math.PI * 2);
    ctx.fill();

    // Targeting Laser Line
    if (t.currentTargetId) {
      ctx.strokeStyle = isBlue ? "rgba(56, 189, 248, 0.6)" : "rgba(244, 63, 94, 0.6)";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      // Laser will be pointed towards target in state or drawn generally
    }

    // Health Bar
    renderHealthBar(ctx, t.x, t.y - t.radius - 16, 70, 7, t.hp, t.maxHp, color);

    // Tier label
    ctx.fillStyle = "#94A3B8";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(t.tier === "outer" ? "T1" : "T2", t.x, t.y + 4);

    ctx.restore();
  }
}

function renderJungleMonsters(ctx: CanvasRenderingContext2D, monsters: MobaJungleMonster[]) {
  for (const m of monsters) {
    if (!m.isAlive) continue;
    const isBoss = m.type === "boss";

    ctx.save();
    // Monster Body
    ctx.fillStyle = isBoss ? "#4C1D95" : "#1E293B";
    ctx.strokeStyle = isBoss ? "#A855F7" : "#F59E0B";
    ctx.lineWidth = isBoss ? 4 : 2;

    ctx.beginPath();
    ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Boss Aura
    if (isBoss) {
      ctx.strokeStyle = "rgba(168, 85, 247, 0.3)";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.radius + 8, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Icon / Symbol inside
    ctx.fillStyle = "#FFFFFF";
    ctx.font = isBoss ? "22px sans-serif" : "14px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(isBoss ? (m.campId === "boss_top" ? "👾" : "🐲") : "🐺", m.x, m.y);

    // Name & HP Bar
    ctx.font = "bold 11px sans-serif";
    ctx.fillStyle = isBoss ? "#E9D5FF" : "#CBD5E1";
    ctx.fillText(m.name, m.x, m.y - m.radius - 14);

    const barW = isBoss ? 110 : 55;
    renderHealthBar(ctx, m.x, m.y - m.radius - 6, barW, 6, m.hp, m.maxHp, isBoss ? "#A855F7" : "#EAB308");

    ctx.restore();
  }
}

function renderMinions(ctx: CanvasRenderingContext2D, minions: MobaMinion[]) {
  for (const m of minions) {
    const isBlue = m.team === "blue";
    const color = isBlue ? "#3B82F6" : "#EF4444";

    ctx.save();
    ctx.fillStyle = isBlue ? "#1E3A8A" : "#7F1D1D";
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Minion type emblem
    ctx.fillStyle = "#FFFFFF";
    ctx.font = m.type === "cannon" ? "12px sans-serif" : "9px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const icon = m.type === "melee" ? "⚔️" : m.type === "caster" ? "✨" : "💣";
    ctx.fillText(icon, m.x, m.y);

    // Small HP Bar
    renderHealthBar(ctx, m.x, m.y - m.radius - 6, 28, 4, m.hp, m.maxHp, color);

    ctx.restore();
  }
}

function renderPlayers(
  ctx: CanvasRenderingContext2D,
  players: MobaPlayer[],
  localPlayer: MobaPlayer | undefined,
  bushes: MobaBush[]
) {
  for (const p of players) {
    if (!p.isAlive) continue;

    const isSelf = localPlayer && localPlayer.id === p.id;
    const isAlly = localPlayer && localPlayer.team === p.team;

    // Bush Stealth Check:
    // If enemy is in bush, and neither local player nor any alive ally is in that same bush -> hidden!
    if (!isAlly && p.isInBush) {
      const playerBush = findBushContaining(bushes, p.x, p.y);
      if (playerBush) {
        let revealed = false;
        if (localPlayer && isInsideBush(playerBush, localPlayer.x, localPlayer.y)) {
          revealed = true;
        } else {
          // Check if any teammate is in that same bush
          for (const teammate of players.filter(pl => pl.team === localPlayer?.team && pl.isAlive)) {
            if (isInsideBush(playerBush, teammate.x, teammate.y)) {
              revealed = true;
              break;
            }
          }
        }
        if (!revealed) {
          continue; // Player is stealthed in fog!
        }
      }
    }

    const champ = CHAMPIONS[p.championId] || CHAMPIONS.ignis;
    const teamColor = p.team === "blue" ? "#38BDF8" : "#F43F5E";

    ctx.save();
    if (p.isInBush) {
      ctx.globalAlpha = 0.65; // Semi-transparent when in bush
    }

    // Recalling aura ring
    if (p.isRecalling) {
      ctx.strokeStyle = "#38BDF8";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius + 12, 0, Math.PI * 2 * p.recallProgress);
      ctx.stroke();
    }

    // Shield Aura
    if (p.shield > 0) {
      ctx.strokeStyle = "rgba(147, 197, 253, 0.8)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius + 6, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Champion Body Circle
    ctx.fillStyle = champ.color;
    ctx.strokeStyle = isSelf ? "#FBBF24" : teamColor;
    ctx.lineWidth = isSelf ? 4 : 3;

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Facing direction pointer
    ctx.fillStyle = "#FFFFFF";
    const dirX = p.x + Math.cos(p.angle) * (p.radius + 4);
    const dirY = p.y + Math.sin(p.angle) * (p.radius + 4);
    ctx.beginPath();
    ctx.arc(dirX, dirY, 4, 0, Math.PI * 2);
    ctx.fill();

    // Champion passive icon / emoji inside avatar
    ctx.font = "14px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(champ.passive.icon || "⭐", p.x, p.y);

    // CC Status text (Stunned / Rooted)
    if (p.isStunned) {
      ctx.fillStyle = "#F59E0B";
      ctx.font = "bold 12px sans-serif";
      ctx.fillText("💫 ÉTOURDI", p.x, p.y - p.radius - 28);
    } else if (p.isRooted) {
      ctx.fillStyle = "#10B981";
      ctx.font = "bold 12px sans-serif";
      ctx.fillText("🕸️ IMMOBILISÉ", p.x, p.y - p.radius - 28);
    }

    // Health & Mana Bar
    const barW = 60;
    const hpColor = isSelf ? "#22C55E" : isAlly ? "#38BDF8" : "#EF4444";
    renderHealthBar(ctx, p.x, p.y - p.radius - 12, barW, 6, p.hp, p.maxHp, hpColor, p.shield);

    // Mana Bar
    ctx.fillStyle = "#0F172A";
    ctx.fillRect(p.x - barW / 2, p.y - p.radius - 5, barW, 3);
    const manaPct = Math.max(0, Math.min(1, p.mana / Math.max(1, p.maxMana)));
    ctx.fillStyle = "#3B82F6";
    ctx.fillRect(p.x - barW / 2, p.y - p.radius - 5, barW * manaPct, 3);

    // Level Badge
    ctx.fillStyle = "#1E293B";
    ctx.strokeStyle = "#FBBF24";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(p.x - barW / 2 - 8, p.y - p.radius - 8, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 9px sans-serif";
    ctx.fillText(`${p.level}`, p.x - barW / 2 - 8, p.y - p.radius - 5);

    // Username & Champion Name
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 11px sans-serif";
    ctx.fillText(`${p.username}`, p.x, p.y - p.radius - 20);

    ctx.restore();
  }
}

function renderProjectiles(ctx: CanvasRenderingContext2D, projectiles: MobaProjectile[]) {
  for (const proj of projectiles) {
    ctx.save();

    if (proj.type === "turret_beam") {
      ctx.strokeStyle = proj.color;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(proj.startX, proj.startY);
      ctx.lineTo(proj.x, proj.y);
      ctx.stroke();
    } else if (proj.type === "aoe") {
      // Expanding warning circle before detonation
      ctx.strokeStyle = proj.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = `${proj.color}33`;
      ctx.fill();
    } else {
      // Skillshot or bullet
      ctx.fillStyle = proj.color;
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2);
      ctx.fill();

      // Glowing trail
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    ctx.restore();
  }
}

function renderAimingIndicators(
  ctx: CanvasRenderingContext2D,
  player: MobaPlayer,
  spellKey: SpellKey,
  mouseWorld: { x: number; y: number }
) {
  const champ = CHAMPIONS[player.championId];
  if (!champ) return;
  const spell = champ.spells[spellKey];
  if (!spell) return;

  ctx.save();

  // Spell Range Circle
  ctx.strokeStyle = "rgba(56, 189, 248, 0.45)";
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.arc(player.x, player.y, spell.range, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Skillshot Direction Arrow towards mouse
  if (spell.targetType === "skillshot" || spell.targetType === "dash") {
    const dx = mouseWorld.x - player.x;
    const dy = mouseWorld.y - player.y;
    const angle = Math.atan2(dy, dx);
    const arrowLen = Math.min(spell.range, Math.hypot(dx, dy));

    ctx.strokeStyle = "rgba(251, 191, 36, 0.8)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.lineTo(player.x + Math.cos(angle) * arrowLen, player.y + Math.sin(angle) * arrowLen);
    ctx.stroke();
  } else if (spell.targetType === "area") {
    // Area targeting circle at mouse pos
    ctx.fillStyle = "rgba(239, 68, 68, 0.25)";
    ctx.strokeStyle = "#EF4444";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(mouseWorld.x, mouseWorld.y, 90, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}

function renderClickFx(ctx: CanvasRenderingContext2D, list: ClickFx[]) {
  for (let i = list.length - 1; i >= 0; i--) {
    const fx = list[i];
    fx.life++;
    const progress = fx.life / fx.maxLife;
    const radius = 10 + progress * 25;
    const alpha = 1 - progress;

    ctx.save();
    ctx.strokeStyle = fx.type === "move" ? `rgba(34, 197, 94, ${alpha})` : `rgba(239, 68, 68, ${alpha})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(fx.x, fx.y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    if (fx.life >= fx.maxLife) {
      list.splice(i, 1);
    }
  }
}

function renderFloatingTexts(ctx: CanvasRenderingContext2D, texts: MobaFloatingText[]) {
  for (const ft of texts) {
    ctx.save();
    const alpha = Math.max(0, 1 - ft.life / ft.maxLife);
    ctx.fillStyle = ft.color;
    ctx.globalAlpha = alpha;
    ctx.font = "bold 13px sans-serif";
    ctx.textAlign = "center";
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2.5;
    ctx.strokeText(ft.text, ft.x, ft.y);
    ctx.fillText(ft.text, ft.x, ft.y);
    ctx.restore();
  }
}

function renderHealthBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  current: number,
  max: number,
  color: string,
  shield: number = 0
) {
  ctx.save();
  // Bar background
  ctx.fillStyle = "#0F172A";
  ctx.fillRect(x - w / 2, y, w, h);

  // Health fill
  const pct = Math.max(0, Math.min(1, current / Math.max(1, max)));
  ctx.fillStyle = color;
  ctx.fillRect(x - w / 2, y, w * pct, h);

  // Shield fill overlay
  if (shield > 0) {
    const shieldPct = Math.min(1, shield / Math.max(1, max));
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.fillRect(x - w / 2 + w * pct - w * shieldPct, y, w * shieldPct, h);
  }

  // Border outline
  ctx.strokeStyle = "#1E293B";
  ctx.lineWidth = 1;
  ctx.strokeRect(x - w / 2, y, w, h);
  ctx.restore();
}

function findBushContaining(bushes: MobaBush[], x: number, y: number): MobaBush | undefined {
  return bushes.find(b => isInsideBush(b, x, y));
}

function isInsideBush(b: MobaBush, x: number, y: number): boolean {
  return (
    x >= b.x - b.width / 2 &&
    x <= b.x + b.width / 2 &&
    y >= b.y - b.height / 2 &&
    y <= b.y + b.height / 2
  );
}
