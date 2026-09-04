import {
  ChampionId,
  MobaBush,
  MobaGameState,
  MobaItem,
  MobaJungleMonster,
  MobaKillEvent,
  MobaMinion,
  MobaNexus,
  MobaPlayer,
  MobaProjectile,
  MobaTeam,
  MobaTurret,
  SpellKey
} from "../types/moba";
import { CHAMPIONS, MOBA_ITEMS } from "./mobaConstants";

const MAP_WIDTH = 2400;
const MAP_HEIGHT = 1400;
const LANE_Y = 700;
const TICK_RATE = 20; // 20 updates per second

export class MobaEngine {
  public state: MobaGameState;
  private nextId: number = 1;
  private intervalId: NodeJS.Timeout | null = null;
  private onUpdateCallback?: (state: MobaGameState) => void;

  constructor(roomCode: string) {
    this.state = {
      status: "LOBBY",
      roomCode,
      mapWidth: MAP_WIDTH,
      mapHeight: MAP_HEIGHT,
      players: [],
      minions: [],
      turrets: [],
      nexuses: [],
      jungleMonsters: [],
      bushes: [],
      projectiles: [],
      floatingTexts: [],
      killsBlue: 0,
      killsRed: 0,
      winner: null,
      gameTicks: 0,
      killFeed: [],
      log: ["Arène initialisée. Choisissez votre Champion !"]
    };

    this.initMap();
  }

  public setOnUpdate(cb: (state: MobaGameState) => void) {
    this.onUpdateCallback = cb;
  }

  private initMap() {
    // Bushes
    this.state.bushes = [
      // Top jungle bushes
      { id: "bush_top_1", x: 950, y: 320, width: 140, height: 70 },
      { id: "bush_top_2", x: 1350, y: 320, width: 140, height: 70 },
      // Mid lane bushes
      { id: "bush_mid_top", x: 1100, y: 560, width: 200, height: 60 },
      { id: "bush_mid_bot", x: 1100, y: 780, width: 200, height: 60 },
      // Bot jungle bushes
      { id: "bush_bot_1", x: 950, y: 1010, width: 140, height: 70 },
      { id: "bush_bot_2", x: 1350, y: 1010, width: 140, height: 70 },
      // River bushes
      { id: "bush_river_top", x: 1150, y: 200, width: 120, height: 60 },
      { id: "bush_river_bot", x: 1150, y: 1140, width: 120, height: 60 },
    ];

    // Nexuses
    this.state.nexuses = [
      { team: "blue", x: 180, y: LANE_Y, hp: 5000, maxHp: 5000, radius: 65 },
      { team: "red", x: 2220, y: LANE_Y, hp: 5000, maxHp: 5000, radius: 65 }
    ];

    // Turrets: 2 per team along mid lane
    this.state.turrets = [
      // Blue Turrets
      {
        id: "turret_b_inner",
        team: "blue",
        tier: "inner",
        x: 480,
        y: LANE_Y,
        hp: 3200,
        maxHp: 3200,
        damage: 130,
        range: 260,
        attackCooldown: 0,
        currentTargetId: null,
        radius: 38
      },
      {
        id: "turret_b_outer",
        team: "blue",
        tier: "outer",
        x: 820,
        y: LANE_Y,
        hp: 3500,
        maxHp: 3500,
        damage: 120,
        range: 280,
        attackCooldown: 0,
        currentTargetId: null,
        radius: 38
      },
      // Red Turrets
      {
        id: "turret_r_outer",
        team: "red",
        tier: "outer",
        x: 1580,
        y: LANE_Y,
        hp: 3500,
        maxHp: 3500,
        damage: 120,
        range: 280,
        attackCooldown: 0,
        currentTargetId: null,
        radius: 38
      },
      {
        id: "turret_r_inner",
        team: "red",
        tier: "inner",
        x: 1920,
        y: LANE_Y,
        hp: 3200,
        maxHp: 3200,
        damage: 130,
        range: 260,
        attackCooldown: 0,
        currentTargetId: null,
        radius: 38
      }
    ];

    // Jungle Camps & Bosses
    this.state.jungleMonsters = [
      // Baron / Herald Top Boss
      {
        id: "boss_herald",
        name: "Héraut du Néant",
        type: "boss",
        campId: "boss_top",
        x: 1200,
        y: 180,
        homeX: 1200,
        homeY: 180,
        hp: 5500,
        maxHp: 5500,
        damage: 95,
        range: 160,
        attackCooldown: 0,
        speed: 1.8,
        radius: 40,
        bountyGold: 250,
        bountyXp: 350,
        targetId: null,
        respawnTicks: 0,
        isAlive: true
      },
      // Dragon Bottom Boss
      {
        id: "boss_dragon",
        name: "Dragon Élémentaire",
        type: "boss",
        campId: "boss_bot",
        x: 1200,
        y: 1220,
        homeX: 1200,
        homeY: 1220,
        hp: 4800,
        maxHp: 4800,
        damage: 85,
        range: 180,
        attackCooldown: 0,
        speed: 1.8,
        radius: 38,
        bountyGold: 220,
        bountyXp: 300,
        targetId: null,
        respawnTicks: 0,
        isAlive: true
      },
      // Blue Top Wolves
      {
        id: "camp_b_top",
        name: "Loups Cybernétiques",
        type: "camp",
        campId: "b_top",
        x: 650,
        y: 350,
        homeX: 650,
        homeY: 350,
        hp: 1200,
        maxHp: 1200,
        damage: 40,
        range: 50,
        attackCooldown: 0,
        speed: 2.2,
        radius: 25,
        bountyGold: 85,
        bountyXp: 110,
        targetId: null,
        respawnTicks: 0,
        isAlive: true
      },
      // Red Top Wolves
      {
        id: "camp_r_top",
        name: "Loups Cybernétiques",
        type: "camp",
        campId: "r_top",
        x: 1750,
        y: 350,
        homeX: 1750,
        homeY: 350,
        hp: 1200,
        maxHp: 1200,
        damage: 40,
        range: 50,
        attackCooldown: 0,
        speed: 2.2,
        radius: 25,
        bountyGold: 85,
        bountyXp: 110,
        targetId: null,
        respawnTicks: 0,
        isAlive: true
      },
      // Blue Bot Golems
      {
        id: "camp_b_bot",
        name: "Golems d'Énergie",
        type: "camp",
        campId: "b_bot",
        x: 650,
        y: 1050,
        homeX: 650,
        homeY: 1050,
        hp: 1400,
        maxHp: 1400,
        damage: 45,
        range: 55,
        attackCooldown: 0,
        speed: 2.0,
        radius: 28,
        bountyGold: 95,
        bountyXp: 120,
        targetId: null,
        respawnTicks: 0,
        isAlive: true
      },
      // Red Bot Golems
      {
        id: "camp_r_bot",
        name: "Golems d'Énergie",
        type: "camp",
        campId: "r_bot",
        x: 1750,
        y: 1050,
        homeX: 1750,
        homeY: 1050,
        hp: 1400,
        maxHp: 1400,
        damage: 45,
        range: 55,
        attackCooldown: 0,
        speed: 2.0,
        radius: 28,
        bountyGold: 95,
        bountyXp: 120,
        targetId: null,
        respawnTicks: 0,
        isAlive: true
      }
    ];
  }

  public addPlayer(id: string, username: string, championId: ChampionId = "ignis"): MobaPlayer {
    const blueCount = this.state.players.filter(p => p.team === "blue").length;
    const redCount = this.state.players.filter(p => p.team === "red").length;
    const team: MobaTeam = blueCount <= redCount ? "blue" : "red";

    const p = this.createPlayerEntity(id, username, team, championId, false);
    this.state.players.push(p);
    this.state.log.push(`${username} a rejoint l'équipe ${team.toUpperCase()} avec ${CHAMPIONS[championId].name}.`);
    return p;
  }

  public addBot(team?: MobaTeam, championId?: ChampionId): MobaPlayer {
    const blueCount = this.state.players.filter(p => p.team === "blue").length;
    const redCount = this.state.players.filter(p => p.team === "red").length;
    const assignedTeam: MobaTeam = team || (blueCount <= redCount ? "blue" : "red");

    const allChamps: ChampionId[] = Object.keys(CHAMPIONS) as ChampionId[];
    const chosenChamp = championId || allChamps[Math.floor(Math.random() * allChamps.length)];
    const botId = `bot_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const botName = `Bot ${CHAMPIONS[chosenChamp].name}`;

    const bot = this.createPlayerEntity(botId, botName, assignedTeam, chosenChamp, true);
    this.state.players.push(bot);
    this.state.log.push(`${botName} a rejoint l'équipe ${assignedTeam.toUpperCase()}.`);
    return bot;
  }

  public removePlayer(id: string) {
    const idx = this.state.players.findIndex(p => p.id === id);
    if (idx !== -1) {
      const p = this.state.players[idx];
      this.state.log.push(`${p.username} a quitté la partie.`);
      this.state.players.splice(idx, 1);
    }
  }

  public switchTeam(playerId: string) {
    const p = this.state.players.find(pl => pl.id === playerId);
    if (!p || this.state.status !== "LOBBY") return;
    p.team = p.team === "blue" ? "red" : "blue";
    const spawn = this.getSpawnPoint(p.team);
    p.x = spawn.x;
    p.y = spawn.y;
  }

  public selectChampion(playerId: string, champId: ChampionId) {
    const p = this.state.players.find(pl => pl.id === playerId);
    if (!p || this.state.status !== "LOBBY") return;
    if (!CHAMPIONS[champId]) return;
    p.championId = champId;
    this.applyChampionStats(p, champId);
    this.state.log.push(`${p.username} a sélectionné ${CHAMPIONS[champId].name}.`);
  }

  private getSpawnPoint(team: MobaTeam) {
    return team === "blue" ? { x: 180, y: LANE_Y } : { x: 2220, y: LANE_Y };
  }

  private createPlayerEntity(
    id: string,
    username: string,
    team: MobaTeam,
    championId: ChampionId,
    isBot: boolean
  ): MobaPlayer {
    const spawn = this.getSpawnPoint(team);
    const champ = CHAMPIONS[championId] || CHAMPIONS.ignis;

    const p: MobaPlayer = {
      id,
      username,
      team,
      championId,
      isBot,
      isAlive: true,
      respawnTimer: 0,
      level: 1,
      xp: 0,
      maxXp: 180,
      gold: 500,
      kills: 0,
      deaths: 0,
      assists: 0,
      cs: 0,
      items: [],
      hp: champ.baseStats.hp,
      maxHp: champ.baseStats.hp,
      mana: champ.baseStats.mana,
      maxMana: champ.baseStats.mana,
      shield: 0,
      attackDamage: champ.baseStats.attackDamage,
      abilityPower: champ.baseStats.abilityPower,
      armor: champ.baseStats.armor,
      magicResist: champ.baseStats.magicResist,
      attackSpeed: champ.baseStats.attackSpeed,
      attackRange: champ.baseStats.attackRange,
      moveSpeed: champ.baseStats.moveSpeed,
      x: spawn.x + (Math.random() * 40 - 20),
      y: spawn.y + (Math.random() * 40 - 20),
      targetX: null,
      targetY: null,
      vx: 0,
      vy: 0,
      angle: team === "blue" ? 0 : Math.PI,
      radius: 24,
      isInBush: false,
      isStealthed: false,
      isStunned: false,
      stunRemaining: 0,
      isRooted: false,
      rootRemaining: 0,
      isSilenced: false,
      isInvulnerable: false,
      invulnerableRemaining: 0,
      isRecalling: false,
      recallProgress: 0,
      attackCooldown: 0,
      spellsCooldown: { q: 0, w: 0, e: 0, r: 0 },
      spellsLevel: { q: 1, w: 0, e: 0, r: 0 },
      availableSpellPoints: 0,
      summonerSpells: {
        d: { id: "flash", cooldown: 0 },
        f: { id: "heal", cooldown: 0 }
      },
      passiveStacks: 0,
      passiveTimer: 0
    };

    return p;
  }

  private applyChampionStats(p: MobaPlayer, champId: ChampionId) {
    const champ = CHAMPIONS[champId];
    if (!champ) return;
    const lvlMultiplier = 1 + (p.level - 1) * 0.08;
    p.maxHp = Math.round(champ.baseStats.hp * lvlMultiplier);
    p.hp = Math.min(p.hp, p.maxHp);
    p.maxMana = Math.round(champ.baseStats.mana * lvlMultiplier);
    p.mana = Math.min(p.mana, p.maxMana);
    p.attackDamage = Math.round(champ.baseStats.attackDamage * lvlMultiplier);
    p.abilityPower = Math.round(champ.baseStats.abilityPower * lvlMultiplier);
    p.armor = Math.round(champ.baseStats.armor + (p.level - 1) * 3);
    p.magicResist = Math.round(champ.baseStats.magicResist + (p.level - 1) * 1.5);
    p.attackSpeed = champ.baseStats.attackSpeed * (1 + (p.level - 1) * 0.03);
    p.attackRange = champ.baseStats.attackRange;
    p.moveSpeed = champ.baseStats.moveSpeed;

    // Apply items
    for (const itemId of p.items) {
      const it = MOBA_ITEMS[itemId];
      if (!it || !it.stats) continue;
      if (it.stats.hp) p.maxHp += it.stats.hp;
      if (it.stats.mana) p.maxMana += it.stats.mana;
      if (it.stats.attackDamage) p.attackDamage += it.stats.attackDamage;
      if (it.stats.abilityPower) p.abilityPower += it.stats.abilityPower;
      if (it.stats.armor) p.armor += it.stats.armor;
      if (it.stats.magicResist) p.magicResist += it.stats.magicResist;
      if (it.stats.attackSpeed) p.attackSpeed += it.stats.attackSpeed;
      if (it.stats.moveSpeed) p.moveSpeed += it.stats.moveSpeed;
    }
  }

  public startGame() {
    if (this.state.status === "PLAYING") return;
    this.state.status = "PLAYING";
    this.state.gameTicks = 0;
    this.state.winner = null;
    this.state.killsBlue = 0;
    this.state.killsRed = 0;
    this.state.killFeed = [];
    this.state.log.push("Bienvenue dans la Faille de l'Arène ! Les sbires apparaîtront sous peu.");

    // Spawn players at bases
    for (const p of this.state.players) {
      const spawn = this.getSpawnPoint(p.team);
      p.x = spawn.x + (Math.random() * 40 - 20);
      p.y = spawn.y + (Math.random() * 40 - 20);
      p.hp = p.maxHp;
      p.mana = p.maxMana;
      p.isAlive = true;
      p.respawnTimer = 0;
      p.targetX = null;
      p.targetY = null;
    }

    if (!this.intervalId) {
      this.intervalId = setInterval(() => this.tick(), 1000 / TICK_RATE);
    }
  }

  public resetGame() {
    this.state.status = "LOBBY";
    this.state.winner = null;
    this.state.gameTicks = 0;
    this.state.minions = [];
    this.state.projectiles = [];
    this.state.floatingTexts = [];
    this.initMap();
    for (const p of this.state.players) {
      p.level = 1;
      p.xp = 0;
      p.gold = 500;
      p.kills = 0;
      p.deaths = 0;
      p.assists = 0;
      p.cs = 0;
      p.items = [];
      p.isAlive = true;
      p.respawnTimer = 0;
      p.spellsLevel = { q: 1, w: 0, e: 0, r: 0 };
      p.spellsCooldown = { q: 0, w: 0, e: 0, r: 0 };
      p.availableSpellPoints = 0;
      this.applyChampionStats(p, p.championId);
      const spawn = this.getSpawnPoint(p.team);
      p.x = spawn.x;
      p.y = spawn.y;
    }
  }

  public stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  // --- Input Handlers ---
  public handleMove(playerId: string, targetX: number, targetY: number) {
    const p = this.state.players.find(pl => pl.id === playerId);
    if (!p || !p.isAlive || p.isStunned) return;
    p.targetX = Math.max(20, Math.min(MAP_WIDTH - 20, targetX));
    p.targetY = Math.max(20, Math.min(MAP_HEIGHT - 20, targetY));
    p.vx = 0;
    p.vy = 0;
    p.isRecalling = false;
  }

  public handleInputVelocity(playerId: string, vx: number, vy: number) {
    const p = this.state.players.find(pl => pl.id === playerId);
    if (!p || !p.isAlive || p.isStunned) return;
    p.vx = vx;
    p.vy = vy;
    if (vx !== 0 || vy !== 0) {
      p.targetX = null;
      p.targetY = null;
      p.isRecalling = false;
    }
  }

  public handleAttack(playerId: string, targetId: string) {
    const p = this.state.players.find(pl => pl.id === playerId);
    if (!p || !p.isAlive || p.isStunned) return;
    p.isRecalling = false;

    // Find target
    const target = this.findTarget(targetId);
    if (!target || !target.isAlive) return;

    const dx = target.x - p.x;
    const dy = target.y - p.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= p.attackRange + target.radius) {
      // Within attack range
      if (p.attackCooldown <= 0) {
        this.performBasicAttack(p, target);
        p.attackCooldown = Math.round(TICK_RATE / Math.max(0.4, p.attackSpeed));
      }
    } else {
      // Walk towards target
      p.targetX = target.x;
      p.targetY = target.y;
    }
  }

  public handleCastSpell(playerId: string, spellKey: SpellKey, mouseX: number, mouseY: number, targetId?: string) {
    const p = this.state.players.find(pl => pl.id === playerId);
    if (!p || !p.isAlive || p.isStunned || p.isSilenced) return;
    if (p.spellsLevel[spellKey] <= 0) return;
    if (p.spellsCooldown[spellKey] > 0) return;

    const champ = CHAMPIONS[p.championId];
    if (!champ) return;
    const spell = champ.spells[spellKey];
    if (!spell) return;

    if (p.mana < spell.manaCost) {
      this.addFloatingText(p.x, p.y - 20, "Pas assez de Mana !", "#60A5FA");
      return;
    }

    p.mana -= spell.manaCost;
    p.spellsCooldown[spellKey] = spell.cooldown;
    p.isRecalling = false;

    this.executeSpellEffect(p, champ, spellKey, spell, mouseX, mouseY, targetId);
  }

  public handleSummonerSpell(playerId: string, key: "d" | "f", mouseX: number, mouseY: number) {
    const p = this.state.players.find(pl => pl.id === playerId);
    if (!p || !p.isAlive || p.isStunned) return;

    const sSpell = p.summonerSpells[key];
    if (!sSpell || sSpell.cooldown > 0) return;

    p.isRecalling = false;

    if (sSpell.id === "flash") {
      // Flash: instant blink up to 260px
      const dx = mouseX - p.x;
      const dy = mouseY - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const range = Math.min(260, dist);
      p.x = Math.max(30, Math.min(MAP_WIDTH - 30, p.x + (dx / dist) * range));
      p.y = Math.max(30, Math.min(MAP_HEIGHT - 30, p.y + (dy / dist) * range));
      p.targetX = null;
      p.targetY = null;
      sSpell.cooldown = 90 * TICK_RATE; // 90s
      this.addFloatingText(p.x, p.y - 25, "Saut Éclair !", "#FBBF24");
    } else if (sSpell.id === "heal") {
      // Heal: heals 25% max HP + 30% speed boost for 2s
      const healAmt = Math.round(p.maxHp * 0.25);
      p.hp = Math.min(p.maxHp, p.hp + healAmt);
      p.moveSpeed *= 1.3;
      setTimeout(() => {
        p.moveSpeed /= 1.3;
      }, 2000);
      sSpell.cooldown = 60 * TICK_RATE; // 60s
      this.addFloatingText(p.x, p.y - 25, `+${healAmt} Soins !`, "#10B981");
    }
  }

  public handleRecall(playerId: string) {
    const p = this.state.players.find(pl => pl.id === playerId);
    if (!p || !p.isAlive || p.isStunned || p.isRecalling) return;
    p.isRecalling = true;
    p.recallProgress = 0;
    p.targetX = null;
    p.targetY = null;
    p.vx = 0;
    p.vy = 0;
    this.addFloatingText(p.x, p.y - 25, "Rappel en cours...", "#38BDF8");
  }

  public handleUpgradeSpell(playerId: string, spellKey: SpellKey) {
    const p = this.state.players.find(pl => pl.id === playerId);
    if (!p || p.availableSpellPoints <= 0) return;
    if (spellKey === "r" && p.level < 6) return;
    if (p.spellsLevel[spellKey] >= 5) return;
    if (spellKey === "r" && p.spellsLevel[spellKey] >= 3) return;

    p.spellsLevel[spellKey]++;
    p.availableSpellPoints--;
    this.addFloatingText(p.x, p.y - 30, `${spellKey.toUpperCase()} Amélioré !`, "#F59E0B");
  }

  public handleBuyItem(playerId: string, itemId: string) {
    const p = this.state.players.find(pl => pl.id === playerId);
    if (!p || !p.isAlive) return;

    // Must be in base (within 350px of nexus)
    const nexus = this.state.nexuses.find(n => n.team === p.team);
    if (nexus) {
      const dist = Math.hypot(p.x - nexus.x, p.y - nexus.y);
      if (dist > 380) {
        this.addFloatingText(p.x, p.y - 25, "Boutique accessible à la base !", "#EF4444");
        return;
      }
    }

    const item = MOBA_ITEMS[itemId];
    if (!item) return;
    if (p.gold < item.cost) {
      this.addFloatingText(p.x, p.y - 25, "Or insuffisant !", "#F59E0B");
      return;
    }
    if (p.items.length >= 6) {
      this.addFloatingText(p.x, p.y - 25, "Inventaire plein (6/6) !", "#EF4444");
      return;
    }

    p.gold -= item.cost;
    p.items.push(itemId);
    this.applyChampionStats(p, p.championId);
    this.addFloatingText(p.x, p.y - 25, `Acheté: ${item.name}`, "#10B981");
  }

  // --- Core Game Loop ---
  private tick() {
    if (this.state.status !== "PLAYING") return;
    this.state.gameTicks++;

    // Periodic Spawns & Passive Income
    this.handleEconomyAndWaves();

    // Entity Updates
    this.updatePlayers();
    this.updateMinions();
    this.updateTurrets();
    this.updateJungleMonsters();
    this.updateProjectiles();
    this.updateFloatingTexts();
    this.updateBushes();

    // Check Win Condition
    this.checkNexusDestroyed();

    if (this.onUpdateCallback) {
      this.onUpdateCallback(this.state);
    }
  }

  private handleEconomyAndWaves() {
    // Passive Gold: +1 gold every 7 ticks (~3 gold/sec)
    if (this.state.gameTicks % 7 === 0) {
      for (const p of this.state.players) {
        p.gold += 1;
      }
    }

    // Minion wave every 25s (500 ticks)
    if (this.state.gameTicks % 500 === 1) {
      this.spawnMinionWave();
    }

    // Passive regeneration for players
    if (this.state.gameTicks % 20 === 0) {
      for (const p of this.state.players) {
        if (p.isAlive) {
          const champ = CHAMPIONS[p.championId];
          if (champ) {
            p.hp = Math.min(p.maxHp, p.hp + champ.baseStats.hpRegen);
            p.mana = Math.min(p.maxMana, p.mana + champ.baseStats.manaRegen);
          }
          // Fountain mega-regen if at base
          const base = this.getSpawnPoint(p.team);
          if (Math.hypot(p.x - base.x, p.y - base.y) < 220) {
            p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.1);
            p.mana = Math.min(p.maxMana, p.mana + p.maxMana * 0.1);
          }
        }
      }
    }
  }

  private spawnMinionWave() {
    const isCannonWave = Math.floor(this.state.gameTicks / 500) % 3 === 0;

    for (const team of ["blue", "red"] as MobaTeam[]) {
      const isBlue = team === "blue";
      const startX = isBlue ? 220 : 2180;
      const targetX = isBlue ? 2220 : 180;

      // 2 Melee
      for (let i = 0; i < 2; i++) {
        this.state.minions.push({
          id: `minion_${this.nextId++}`,
          team,
          type: "melee",
          x: startX + (isBlue ? i * 20 : -i * 20),
          y: LANE_Y + (i % 2 === 0 ? -15 : 15),
          targetX,
          targetY: LANE_Y,
          targetId: null,
          hp: 480,
          maxHp: 480,
          damage: 18,
          range: 50,
          attackCooldown: 0,
          speed: 2.2,
          radius: 16,
          bountyGold: 21,
          bountyXp: 45
        });
      }

      // 2 Casters
      for (let i = 0; i < 2; i++) {
        this.state.minions.push({
          id: `minion_${this.nextId++}`,
          team,
          type: "caster",
          x: startX + (isBlue ? -30 - i * 20 : 30 + i * 20),
          y: LANE_Y + (i % 2 === 0 ? -20 : 20),
          targetX,
          targetY: LANE_Y,
          targetId: null,
          hp: 300,
          maxHp: 300,
          damage: 25,
          range: 220,
          attackCooldown: 0,
          speed: 2.2,
          radius: 14,
          bountyGold: 15,
          bountyXp: 35
        });
      }

      // Cannon if applicable
      if (isCannonWave) {
        this.state.minions.push({
          id: `minion_${this.nextId++}`,
          team,
          type: "cannon",
          x: startX + (isBlue ? -60 : 60),
          y: LANE_Y,
          targetX,
          targetY: LANE_Y,
          targetId: null,
          hp: 900,
          maxHp: 900,
          damage: 42,
          range: 240,
          attackCooldown: 0,
          speed: 2.0,
          radius: 20,
          bountyGold: 65,
          bountyXp: 85
        });
      }
    }
  }

  private updatePlayers() {
    for (const p of this.state.players) {
      if (!p.isAlive) {
        p.respawnTimer--;
        if (p.respawnTimer <= 0) {
          p.isAlive = true;
          const spawn = this.getSpawnPoint(p.team);
          p.x = spawn.x;
          p.y = spawn.y;
          p.hp = p.maxHp;
          p.mana = p.maxMana;
          p.isStunned = false;
          p.isRooted = false;
          p.isSilenced = false;
          this.addFloatingText(p.x, p.y - 20, "Réapparition !", "#34D399");
        }
        continue;
      }

      // CC Timers
      if (p.isStunned) {
        p.stunRemaining--;
        if (p.stunRemaining <= 0) p.isStunned = false;
      }
      if (p.isRooted) {
        p.rootRemaining--;
        if (p.rootRemaining <= 0) p.isRooted = false;
      }
      if (p.isInvulnerable) {
        p.invulnerableRemaining--;
        if (p.invulnerableRemaining <= 0) p.isInvulnerable = false;
      }

      // Spell Cooldowns
      for (const k of ["q", "w", "e", "r"] as SpellKey[]) {
        if (p.spellsCooldown[k] > 0) p.spellsCooldown[k]--;
      }
      if (p.summonerSpells.d.cooldown > 0) p.summonerSpells.d.cooldown--;
      if (p.summonerSpells.f.cooldown > 0) p.summonerSpells.f.cooldown--;
      if (p.attackCooldown > 0) p.attackCooldown--;

      // Recall Channeling
      if (p.isRecalling) {
        p.recallProgress += 1 / (4 * TICK_RATE); // 4s
        if (p.recallProgress >= 1) {
          const spawn = this.getSpawnPoint(p.team);
          p.x = spawn.x;
          p.y = spawn.y;
          p.hp = p.maxHp;
          p.mana = p.maxMana;
          p.isRecalling = false;
          p.recallProgress = 0;
          this.addFloatingText(p.x, p.y - 20, "Retour à la base !", "#60A5FA");
        }
      }

      // Movement Execution
      if (!p.isStunned && !p.isRooted && !p.isRecalling) {
        if (p.vx !== 0 || p.vy !== 0) {
          const len = Math.hypot(p.vx, p.vy) || 1;
          p.x += (p.vx / len) * p.moveSpeed;
          p.y += (p.vy / len) * p.moveSpeed;
          p.angle = Math.atan2(p.vy, p.vx);
        } else if (p.targetX !== null && p.targetY !== null) {
          const dx = p.targetX - p.x;
          const dy = p.targetY - p.y;
          const dist = Math.hypot(dx, dy);
          if (dist > p.moveSpeed) {
            p.x += (dx / dist) * p.moveSpeed;
            p.y += (dy / dist) * p.moveSpeed;
            p.angle = Math.atan2(dy, dx);
          } else {
            p.x = p.targetX;
            p.y = p.targetY;
            p.targetX = null;
            p.targetY = null;
          }
        }
      }

      // Boundary clamp
      p.x = Math.max(30, Math.min(MAP_WIDTH - 30, p.x));
      p.y = Math.max(30, Math.min(MAP_HEIGHT - 30, p.y));

      // Check Bush presence
      let insideBush = false;
      for (const bush of this.state.bushes) {
        if (
          p.x >= bush.x - bush.width / 2 &&
          p.x <= bush.x + bush.width / 2 &&
          p.y >= bush.y - bush.height / 2 &&
          p.y <= bush.y + bush.height / 2
        ) {
          insideBush = true;
          break;
        }
      }
      p.isInBush = insideBush;

      // Bot AI Execution
      if (p.isBot) {
        this.updateBotAi(p);
      }
    }
  }

  private updateBotAi(bot: MobaPlayer) {
    if (!bot.isAlive || bot.isStunned) return;

    // Retreat if low HP
    if (bot.hp < bot.maxHp * 0.3) {
      const base = this.getSpawnPoint(bot.team);
      bot.targetX = base.x;
      bot.targetY = base.y;
      bot.vx = 0;
      bot.vy = 0;
      // If at base, buy items!
      if (Math.hypot(bot.x - base.x, bot.y - base.y) < 250) {
        const itemKeys = Object.keys(MOBA_ITEMS);
        for (const ik of itemKeys) {
          if (bot.gold >= MOBA_ITEMS[ik].cost && bot.items.length < 6) {
            this.handleBuyItem(bot.id, ik);
          }
        }
      }
      return;
    }

    // Look for enemy champions nearby
    const enemies = this.state.players.filter(p => p.team !== bot.team && p.isAlive);
    let nearestEnemy: MobaPlayer | null = null;
    let minDist = 9999;
    for (const e of enemies) {
      const d = Math.hypot(e.x - bot.x, e.y - bot.y);
      if (d < minDist) {
        minDist = d;
        nearestEnemy = e;
      }
    }

    if (nearestEnemy && minDist < 450) {
      // Cast spells if available
      for (const k of ["r", "q", "w", "e"] as SpellKey[]) {
        if (bot.spellsLevel[k] > 0 && bot.spellsCooldown[k] <= 0) {
          this.handleCastSpell(bot.id, k, nearestEnemy.x, nearestEnemy.y, nearestEnemy.id);
          break;
        }
      }
      // Basic attack
      if (minDist <= bot.attackRange) {
        this.handleAttack(bot.id, nearestEnemy.id);
      } else {
        bot.targetX = nearestEnemy.x;
        bot.targetY = nearestEnemy.y;
      }
      return;
    }

    // Farm nearest enemy minion
    const enemyMinions = this.state.minions.filter(m => m.team !== bot.team);
    let nearestMinion: MobaMinion | null = null;
    let minMDist = 9999;
    for (const m of enemyMinions) {
      const d = Math.hypot(m.x - bot.x, m.y - bot.y);
      if (d < minMDist) {
        minMDist = d;
        nearestMinion = m;
      }
    }

    if (nearestMinion && minMDist < 500) {
      if (minMDist <= bot.attackRange) {
        this.handleAttack(bot.id, nearestMinion.id);
      } else {
        bot.targetX = nearestMinion.x;
        bot.targetY = nearestMinion.y;
      }
    } else {
      // Advance along lane
      const targetX = bot.team === "blue" ? 2100 : 300;
      bot.targetX = targetX;
      bot.targetY = LANE_Y + (Math.random() * 80 - 40);
    }
  }

  private updateMinions() {
    for (let i = this.state.minions.length - 1; i >= 0; i--) {
      const m = this.state.minions[i];
      if (m.hp <= 0) {
        this.state.minions.splice(i, 1);
        continue;
      }

      if (m.attackCooldown > 0) m.attackCooldown--;

      // Find target: enemy minions, champions, or turrets
      const target = this.findMinionTarget(m);

      if (target) {
        const dist = Math.hypot(target.x - m.x, target.y - m.y);
        if (dist <= m.range + target.radius) {
          // In range, attack
          if (m.attackCooldown <= 0) {
            this.minionAttack(m, target);
            m.attackCooldown = Math.round(TICK_RATE * 1.2);
          }
        } else {
          // Walk towards target
          const dx = target.x - m.x;
          const dy = target.y - m.y;
          m.x += (dx / dist) * m.speed;
          m.y += (dy / dist) * m.speed;
        }
      } else {
        // March along lane
        const dx = m.targetX - m.x;
        const dy = m.targetY - m.y;
        const dist = Math.hypot(dx, dy);
        if (dist > m.speed) {
          m.x += (dx / dist) * m.speed;
          m.y += (dy / dist) * m.speed;
        }
      }
    }
  }

  private findMinionTarget(m: MobaMinion): any {
    // 1. Enemy minions in range 350
    const enemyMinions = this.state.minions.filter(other => other.team !== m.team);
    let closestM: MobaMinion | null = null;
    let minMDist = 350;
    for (const em of enemyMinions) {
      const d = Math.hypot(em.x - m.x, em.y - m.y);
      if (d < minMDist) {
        minMDist = d;
        closestM = em;
      }
    }
    if (closestM) return closestM;

    // 2. Enemy Turret in range 400
    const enemyTurret = this.state.turrets.find(
      t => t.team !== m.team && t.hp > 0 && Math.hypot(t.x - m.x, t.y - m.y) < 400
    );
    if (enemyTurret) return enemyTurret;

    // 3. Enemy Nexus in range 400
    const enemyNexus = this.state.nexuses.find(
      n => n.team !== m.team && n.hp > 0 && Math.hypot(n.x - m.x, n.y - m.y) < 400
    );
    if (enemyNexus) return enemyNexus;

    // 4. Enemy champions in range 250
    const enemyChamps = this.state.players.filter(p => p.team !== m.team && p.isAlive && !p.isInBush);
    for (const ep of enemyChamps) {
      if (Math.hypot(ep.x - m.x, ep.y - m.y) < 250) return ep;
    }

    return null;
  }

  private minionAttack(m: MobaMinion, target: any) {
    if (m.type === "caster") {
      this.createHomingProjectile(
        m.id,
        m.team,
        target.id || "target",
        m.x,
        m.y,
        target.x,
        target.y,
        8,
        m.damage,
        "magic",
        "#818CF8",
        "bullet"
      );
    } else {
      this.dealDamage(m.damage, "physical", target, m);
    }
  }

  private updateTurrets() {
    for (const t of this.state.turrets) {
      if (t.hp <= 0) continue;
      if (t.attackCooldown > 0) t.attackCooldown--;

      // Find target
      let target: any = null;

      // Prefer target attacking friendly champions under tower
      // Next prefer enemy minions
      const minionsInRange = this.state.minions.filter(
        m => m.team !== t.team && Math.hypot(m.x - t.x, m.y - t.y) <= t.range
      );
      if (minionsInRange.length > 0) {
        target = minionsInRange[0];
      } else {
        // Target enemy champions in range
        const champsInRange = this.state.players.filter(
          p => p.team !== t.team && p.isAlive && Math.hypot(p.x - t.x, p.y - t.y) <= t.range
        );
        if (champsInRange.length > 0) {
          target = champsInRange[0];
        }
      }

      t.currentTargetId = target ? (target.id || null) : null;

      if (target && t.attackCooldown <= 0) {
        t.attackCooldown = Math.round(TICK_RATE * 1.3); // Every 1.3s
        this.createHomingProjectile(
          t.id,
          t.team,
          target.id,
          t.x,
          t.y,
          target.x,
          target.y,
          9,
          t.damage,
          "physical",
          t.team === "blue" ? "#38BDF8" : "#F43F5E",
          "turret_beam"
        );
      }
    }
  }

  private updateJungleMonsters() {
    for (const monster of this.state.jungleMonsters) {
      if (!monster.isAlive) {
        monster.respawnTicks--;
        if (monster.respawnTicks <= 0) {
          monster.isAlive = true;
          monster.hp = monster.maxHp;
          monster.x = monster.homeX;
          monster.y = monster.homeY;
          this.state.log.push(`${monster.name} est réapparu !`);
        }
        continue;
      }

      if (monster.attackCooldown > 0) monster.attackCooldown--;

      // Find nearby aggro target
      const nearbyPlayer = this.state.players.find(
        p => p.isAlive && Math.hypot(p.x - monster.x, p.y - monster.y) < monster.range + 80
      );

      if (nearbyPlayer) {
        monster.targetId = nearbyPlayer.id;
        const dist = Math.hypot(nearbyPlayer.x - monster.x, nearbyPlayer.y - monster.y);
        if (dist <= monster.range) {
          if (monster.attackCooldown <= 0) {
            monster.attackCooldown = Math.round(TICK_RATE * 1.2);
            this.dealDamage(monster.damage, "physical", nearbyPlayer, monster);
          }
        } else {
          // Walk towards
          const dx = nearbyPlayer.x - monster.x;
          const dy = nearbyPlayer.y - monster.y;
          monster.x += (dx / dist) * monster.speed;
          monster.y += (dy / dist) * monster.speed;
        }
      } else {
        // Return home
        const dx = monster.homeX - monster.x;
        const dy = monster.homeY - monster.y;
        const dist = Math.hypot(dx, dy);
        if (dist > monster.speed) {
          monster.x += (dx / dist) * monster.speed;
          monster.y += (dy / dist) * monster.speed;
        } else {
          monster.x = monster.homeX;
          monster.y = monster.homeY;
          monster.hp = Math.min(monster.maxHp, monster.hp + 5);
        }
      }
    }
  }

  private updateProjectiles() {
    for (let i = this.state.projectiles.length - 1; i >= 0; i--) {
      const proj = this.state.projectiles[i];

      if (proj.type === "turret_beam" || proj.type === "bullet") {
        // Homing projectile towards target
        const target = this.findTarget(proj.targetId || "");
        if (target && target.hp > 0) {
          const dx = target.x - proj.x;
          const dy = target.y - proj.y;
          const dist = Math.hypot(dx, dy);
          if (dist <= proj.speed + 5) {
            this.dealDamage(proj.damage, proj.damageType, target, { id: proj.sourceId, team: proj.sourceTeam });
            this.state.projectiles.splice(i, 1);
            continue;
          } else {
            proj.x += (dx / dist) * proj.speed;
            proj.y += (dy / dist) * proj.speed;
          }
        } else {
          // Target gone
          this.state.projectiles.splice(i, 1);
          continue;
        }
      } else if (proj.type === "skillshot") {
        // Linear skillshot
        const dx = proj.targetX - proj.startX;
        const dy = proj.targetY - proj.startY;
        const totalDist = Math.hypot(dx, dy) || 1;
        proj.x += (dx / totalDist) * proj.speed;
        proj.y += (dy / totalDist) * proj.speed;
        proj.progress += proj.speed;

        // Check collision with enemy players or minions
        let hit = false;
        const enemies = [
          ...this.state.players.filter(p => p.team !== proj.sourceTeam && p.isAlive),
          ...this.state.minions.filter(m => m.team !== proj.sourceTeam && m.hp > 0)
        ];

        for (const ent of enemies) {
          if (Math.hypot(ent.x - proj.x, ent.y - proj.y) <= proj.radius + ent.radius) {
            this.dealDamage(proj.damage, proj.damageType, ent, { id: proj.sourceId, team: proj.sourceTeam });
            hit = true;
            break;
          }
        }

        if (hit || proj.progress >= (proj.maxDistance || 500)) {
          this.state.projectiles.splice(i, 1);
        }
      } else if (proj.type === "aoe") {
        // Delay then explode
        proj.progress += 1;
        if (proj.progress >= 16) { // ~0.8s explosion
          // Deal AoE damage
          const enemies = [
            ...this.state.players.filter(p => p.team !== proj.sourceTeam && p.isAlive),
            ...this.state.minions.filter(m => m.team !== proj.sourceTeam && m.hp > 0),
            ...this.state.jungleMonsters.filter(j => j.isAlive)
          ];
          for (const ent of enemies) {
            if (Math.hypot(ent.x - proj.x, ent.y - proj.y) <= proj.radius) {
              this.dealDamage(proj.damage, proj.damageType, ent, { id: proj.sourceId, team: proj.sourceTeam });
            }
          }
          this.state.projectiles.splice(i, 1);
        }
      }
    }
  }

  private updateFloatingTexts() {
    for (let i = this.state.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.state.floatingTexts[i];
      ft.life++;
      ft.y -= 0.6;
      if (ft.life >= ft.maxLife) {
        this.state.floatingTexts.splice(i, 1);
      }
    }
  }

  private updateBushes() {
    // Bushes logic checked in player loop
  }

  // --- Combat Helpers ---
  private performBasicAttack(attacker: MobaPlayer, target: any) {
    const isRanged = attacker.attackRange > 200;
    const damage = attacker.attackDamage;

    // Trigger champion passives on attack
    this.handleAttackPassive(attacker, target);

    if (isRanged) {
      this.createHomingProjectile(
        attacker.id,
        attacker.team,
        target.id,
        attacker.x,
        attacker.y,
        target.x,
        target.y,
        12,
        damage,
        "physical",
        attacker.team === "blue" ? "#60A5FA" : "#F87171",
        "bullet"
      );
    } else {
      this.dealDamage(damage, "physical", target, attacker);
    }
  }

  private handleAttackPassive(attacker: MobaPlayer, target: any) {
    if (attacker.championId === "kage" && attacker.isInBush) {
      // Kage bush crit
      attacker.attackDamage *= 1.5;
      setTimeout(() => {
        attacker.attackDamage = Math.round(attacker.attackDamage / 1.5);
      }, 50);
      this.addFloatingText(attacker.x, attacker.y - 20, "CRITIQUE DE L'OMBRE !", "#A855F7");
    } else if (attacker.championId === "gromm") {
      // Gromm blood rage lifesteal
      const lifesteal = Math.round(attacker.attackDamage * 0.25);
      attacker.hp = Math.min(attacker.maxHp, attacker.hp + lifesteal);
    }
  }

  private executeSpellEffect(
    player: MobaPlayer,
    champ: any,
    key: SpellKey,
    spell: any,
    mouseX: number,
    mouseY: number,
    targetId?: string
  ) {
    const totalDmg = (spell.damage || 0) + (spell.ratio || 0) * (player.abilityPower || 0);

    if (spell.targetType === "skillshot") {
      this.state.projectiles.push({
        id: `proj_${this.nextId++}`,
        sourceId: player.id,
        sourceTeam: player.team,
        targetId: null,
        x: player.x,
        y: player.y,
        startX: player.x,
        startY: player.y,
        targetX: mouseX,
        targetY: mouseY,
        speed: 14,
        damage: totalDmg,
        damageType: spell.damageType || "magic",
        radius: 20,
        color: champ.color || "#F59E0B",
        type: "skillshot",
        progress: 0,
        maxDistance: spell.range || 500
      });
    } else if (spell.targetType === "area") {
      this.state.projectiles.push({
        id: `aoe_${this.nextId++}`,
        sourceId: player.id,
        sourceTeam: player.team,
        targetId: null,
        x: mouseX,
        y: mouseY,
        startX: mouseX,
        startY: mouseY,
        targetX: mouseX,
        targetY: mouseY,
        speed: 0,
        damage: totalDmg,
        damageType: spell.damageType || "magic",
        radius: 90,
        color: champ.color || "#EF4444",
        type: "aoe",
        progress: 0
      });
    } else if (spell.targetType === "dash") {
      const dx = mouseX - player.x;
      const dy = mouseY - player.y;
      const dist = Math.hypot(dx, dy) || 1;
      const dashDist = Math.min(spell.range || 250, dist);
      player.x += (dx / dist) * dashDist;
      player.y += (dy / dist) * dashDist;
      player.targetX = null;
      player.targetY = null;
      // Dash impact damage
      const enemies = this.state.players.filter(p => p.team !== player.team && p.isAlive);
      for (const e of enemies) {
        if (Math.hypot(e.x - player.x, e.y - player.y) < 60) {
          this.dealDamage(totalDmg, spell.damageType || "physical", e, player);
          e.isStunned = true;
          e.stunRemaining = 20; // 1s stun
        }
      }
    } else if (spell.targetType === "self") {
      // Shield or self buff
      player.shield += Math.round(totalDmg);
      this.addFloatingText(player.x, player.y - 25, `Bouclier +${Math.round(totalDmg)}`, "#3B82F6");
    }

    this.addFloatingText(player.x, player.y - 35, spell.name, champ.color);
  }

  private dealDamage(
    rawDmg: number,
    type: "physical" | "magic" | "true",
    target: any,
    source: { id: string; team?: MobaTeam }
  ) {
    if (!target || target.hp <= 0) return;
    if (target.isInvulnerable) return;

    let finalDmg = rawDmg;
    if (type === "physical" && target.armor) {
      finalDmg = Math.round(rawDmg * (100 / (100 + target.armor)));
    } else if (type === "magic" && target.magicResist) {
      finalDmg = Math.round(rawDmg * (100 / (100 + target.magicResist)));
    }

    finalDmg = Math.max(1, finalDmg);

    // Absorb shield first
    if (target.shield && target.shield > 0) {
      if (target.shield >= finalDmg) {
        target.shield -= finalDmg;
        this.addFloatingText(target.x, target.y - 20, `-${finalDmg}`, "#93C5FD");
        return;
      } else {
        finalDmg -= target.shield;
        target.shield = 0;
      }
    }

    target.hp = Math.max(0, target.hp - finalDmg);

    // Floating text color
    const color = type === "magic" ? "#A855F7" : type === "true" ? "#FFFFFF" : "#F87171";
    this.addFloatingText(target.x, target.y - 18, `-${finalDmg}`, color);

    // Target died
    if (target.hp <= 0) {
      this.handleEntityDeath(target, source);
    }
  }

  private handleEntityDeath(victim: any, killer: { id: string; team?: MobaTeam }) {
    const killerPlayer = this.state.players.find(p => p.id === killer.id);

    // If victim is a player
    const victimPlayer = this.state.players.find(p => p.id === victim.id);
    if (victimPlayer) {
      victimPlayer.isAlive = false;
      victimPlayer.deaths++;
      victimPlayer.respawnTimer = (8 + victimPlayer.level * 2) * TICK_RATE;

      if (killerPlayer) {
        killerPlayer.kills++;
        killerPlayer.gold += 300;
        this.rewardXp(killerPlayer, 150 + victimPlayer.level * 30);
        this.addFloatingText(killerPlayer.x, killerPlayer.y - 30, "+300 Or !", "#FBBF24");

        const evt: MobaKillEvent = {
          id: `kill_${Date.now()}`,
          killerName: killerPlayer.username,
          killerChampion: killerPlayer.championId,
          killerTeam: killerPlayer.team,
          victimName: victimPlayer.username,
          victimChampion: victimPlayer.championId,
          victimTeam: victimPlayer.team,
          timestamp: Date.now()
        };
        this.state.killFeed.unshift(evt);
        if (this.state.killFeed.length > 8) this.state.killFeed.pop();

        if (killerPlayer.team === "blue") this.state.killsBlue++;
        else this.state.killsRed++;

        this.state.log.push(`${killerPlayer.username} a éliminé ${victimPlayer.username} !`);
      }
    }

    // If victim is a minion
    if (victim.type && (victim.type === "melee" || victim.type === "caster" || victim.type === "cannon")) {
      if (killerPlayer) {
        killerPlayer.cs++;
        killerPlayer.gold += victim.bountyGold;
        this.rewardXp(killerPlayer, victim.bountyXp);
        this.addFloatingText(victim.x, victim.y - 15, `+${victim.bountyGold}g`, "#FBBF24");
      }
    }

    // If victim is a jungle monster or boss
    if (victim.campId) {
      victim.isAlive = false;
      victim.respawnTicks = victim.type === "boss" ? 180 * TICK_RATE : 90 * TICK_RATE;
      if (killerPlayer) {
        killerPlayer.gold += victim.bountyGold;
        this.rewardXp(killerPlayer, victim.bountyXp);
        this.state.log.push(`${killerPlayer.username} a vaincu ${victim.name} !`);
        // If boss, grant team buff
        if (victim.type === "boss") {
          for (const teammate of this.state.players.filter(p => p.team === killerPlayer.team)) {
            teammate.gold += 150;
            teammate.attackDamage += 20;
            teammate.abilityPower += 30;
            this.addFloatingText(teammate.x, teammate.y - 25, "BUFF MAJEUR OBTENU !", "#F59E0B");
          }
        }
      }
    }

    // If victim is a turret
    if (victim.tier) {
      this.state.log.push(`La tourelle ennemie (${victim.team}) a été détruite !`);
      for (const teammate of this.state.players.filter(p => p.team !== victim.team)) {
        teammate.gold += 250;
        this.addFloatingText(teammate.x, teammate.y - 25, "+250g Tourelle détruite !", "#FBBF24");
      }
    }
  }

  private rewardXp(player: MobaPlayer, amount: number) {
    player.xp += amount;
    while (player.xp >= player.maxXp && player.level < 10) {
      player.xp -= player.maxXp;
      player.level++;
      player.maxXp = Math.round(player.maxXp * 1.35);
      player.availableSpellPoints++;
      this.applyChampionStats(player, player.championId);
      player.hp = player.maxHp;
      player.mana = player.maxMana;
      this.addFloatingText(player.x, player.y - 40, `NIVEAU SUPÉRIEUR (${player.level}) !`, "#34D399");
    }
  }

  private checkNexusDestroyed() {
    for (const n of this.state.nexuses) {
      if (n.hp <= 0 && !this.state.winner) {
        this.state.winner = n.team === "blue" ? "red" : "blue";
        this.state.status = "FINISHED";
        this.state.log.push(`VICTOIRE DE L'ÉQUIPE ${this.state.winner.toUpperCase()} !`);
        this.stop();
        break;
      }
    }
  }

  private findTarget(id: string): any {
    return (
      this.state.players.find(p => p.id === id) ||
      this.state.minions.find(m => m.id === id) ||
      this.state.turrets.find(t => t.id === id) ||
      this.state.jungleMonsters.find(j => j.id === id) ||
      this.state.nexuses.find(n => (n.team === "blue" ? "nexus_blue" : "nexus_red") === id)
    );
  }

  private createHomingProjectile(
    sourceId: string,
    sourceTeam: MobaTeam,
    targetId: string,
    x: number,
    y: number,
    targetX: number,
    targetY: number,
    speed: number,
    damage: number,
    damageType: "physical" | "magic" | "true",
    color: string,
    type: "bullet" | "turret_beam"
  ) {
    this.state.projectiles.push({
      id: `proj_${this.nextId++}`,
      sourceId,
      sourceTeam,
      targetId,
      x,
      y,
      startX: x,
      startY: y,
      targetX,
      targetY,
      speed,
      damage,
      damageType,
      radius: 12,
      color,
      type,
      progress: 0
    });
  }

  private addFloatingText(x: number, y: number, text: string, color: string) {
    this.state.floatingTexts.push({
      id: `ft_${this.nextId++}`,
      x: x + (Math.random() * 16 - 8),
      y,
      text,
      color,
      life: 0,
      maxLife: 30
    });
    if (this.state.floatingTexts.length > 50) {
      this.state.floatingTexts.shift();
    }
  }

  public getState(): MobaGameState {
    return this.state;
  }
}
