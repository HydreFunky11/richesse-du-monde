import {
  ChaosGameState,
  ChaosPlayer,
  ChaosCell,
  ChaosRule,
  ChaosEnemy,
  ChaosStatDef,
  ChaosCombatEvent,
  ChaosRuleEffect,
  ChaosDuelState
} from '../types/chaos';
import { interpretChaosRule } from './chaosAi';

const INITIAL_CELLS: ChaosCell[] = [
  {
    id: 'cell_0_0',
    x: 0,
    y: 0,
    name: 'Case (0, 0)',
    icon: '⬜',
    description: 'Case de base neutre.',
    colorTheme: 'from-slate-900 to-slate-950 border-slate-800 text-slate-300',
    enemies: []
  },
  {
    id: 'cell_1_0',
    x: 1,
    y: 0,
    name: 'Case (1, 0)',
    icon: '⬜',
    description: 'Case de base neutre.',
    colorTheme: 'from-slate-900 to-slate-950 border-slate-800 text-slate-300',
    enemies: []
  },
  {
    id: 'cell_2_0',
    x: 2,
    y: 0,
    name: 'Case (2, 0)',
    icon: '⬜',
    description: 'Case de base neutre.',
    colorTheme: 'from-slate-900 to-slate-950 border-slate-800 text-slate-300',
    enemies: []
  },
  {
    id: 'cell_0_1',
    x: 0,
    y: 1,
    name: 'Case (0, 1)',
    icon: '⬜',
    description: 'Case de base neutre.',
    colorTheme: 'from-slate-900 to-slate-950 border-slate-800 text-slate-300',
    enemies: []
  },
  {
    id: 'cell_1_1',
    x: 1,
    y: 1,
    name: 'Case (1, 1)',
    icon: '⬜',
    description: 'Case de base neutre.',
    colorTheme: 'from-slate-900 to-slate-950 border-slate-800 text-slate-300',
    enemies: []
  },
  {
    id: 'cell_2_1',
    x: 2,
    y: 1,
    name: 'Case (2, 1)',
    icon: '⬜',
    description: 'Case de base neutre.',
    colorTheme: 'from-slate-900 to-slate-950 border-slate-800 text-slate-300',
    enemies: []
  }
];

export class ChaosEngine {
  private roomCode: string;
  private state: ChaosGameState;

  constructor(roomCode: string) {
    this.roomCode = roomCode;
    this.state = {
      status: 'LOBBY',
      roomCode,
      roundNumber: 1,
      players: [],
      currentPlayerIndex: 0,
      cells: JSON.parse(JSON.stringify(INITIAL_CELLS)),
      definedStats: [],
      activeRules: [],
      draftingPlayerId: null,
      draftingPlayerName: null,
      draftingReason: null,
      isAiGenerating: false,
      lastAnnouncement: null,
      lastCombatEvent: null,
      winner: null,
      log: ['Arène du Chaos 3x2 initialisée. Choisissez votre case et tuez pour survivre !'],
      aiLogs: [],
      activeDuel: null
    };
  }

  public getPlayers(): ChaosPlayer[] {
    return this.state.players;
  }

  public getState(): ChaosGameState {
    return this.state;
  }

  public addPlayer(id: string, username: string, color: string): boolean {
    if (this.state.status !== 'LOBBY' || this.state.players.length >= 8) {
      return false;
    }
    const exists = this.state.players.find(p => p.id === id);
    if (exists) return true;

    // Distribute spawn cell
    const spawnIndex = this.state.players.length % this.state.cells.length;
    const spawnCellId = this.state.cells[spawnIndex]?.id || 'cell_0_0';

    this.state.players.push({
      id,
      username,
      color,
      cellId: spawnCellId,
      hp: 3,
      maxHp: 3,
      atk: 1,
      customStats: {},
      isEliminated: false,
      kills: 0,
      roundsWon: 0
    });

    this.state.log.push(`${username} a rejoint l'Arène du Chaos.`);
    return true;
  }

  public removePlayer(id: string): void {
    const idx = this.state.players.findIndex(p => p.id === id);
    if (idx !== -1) {
      const p = this.state.players[idx];
      this.state.players.splice(idx, 1);
      this.state.log.push(`${p.username} a quitté la partie.`);
      if (this.state.currentPlayerIndex >= this.state.players.length) {
        this.state.currentPlayerIndex = 0;
      }
    }
  }

  public startGame(): boolean {
    if (this.state.players.length < 1 || this.state.status !== 'LOBBY') {
      return false;
    }
    this.state.status = 'PLAYING';
    this.state.roundNumber = 1;
    this.state.activeRules = [];
    this.state.winner = null;
    this.state.currentPlayerIndex = 0;

    // Reset positions and stats
    for (let i = 0; i < this.state.players.length; i++) {
      const p = this.state.players[i];
      p.cellId = this.state.cells[i % this.state.cells.length].id;
      p.hp = 3;
      p.maxHp = 3;
      p.atk = 1;
      p.isEliminated = false;
    }

    this.state.log.push('🏁 La Manche 1 commence ! Cliquez sur une case adjacente pour vous déplacer.');
    return true;
  }

  // ─── TACTICAL MOVEMENT & COMBAT (CLICK TO MOVE) ───────────────────────────
  public movePlayer(socketId: string, targetCellId: string): boolean {
    const activePlayer = this.state.players[this.state.currentPlayerIndex];
    if (
      !activePlayer ||
      activePlayer.id !== socketId ||
      this.state.status !== 'PLAYING'
    ) {
      return false;
    }

    const currentCell = this.state.cells.find(c => c.id === activePlayer.cellId);
    const targetCell = this.state.cells.find(c => c.id === targetCellId);

    if (!targetCell) return false;

    // Check reachability: can move to adjacent cells (orthogonally or diagonally), or within speed
    if (currentCell) {
      const dx = Math.abs(targetCell.x - currentCell.x);
      const dy = Math.abs(targetCell.y - currentCell.y);
      const isSelf = targetCell.id === currentCell.id;
      const speed = activePlayer.customStats['Vitesse'] || activePlayer.customStats['vitesse'] || 1;

      if (isSelf || dx > speed || dy > speed) {
        // Not reachable
        return false;
      }
    }

    // 1. Move player
    activePlayer.cellId = targetCellId;
    this.state.log.push(`🚶 ${activePlayer.username} se déplace vers [${targetCell.name} ${targetCell.icon}].`);

    // 2. Evaluate ON_MOVE rules
    this.evaluateRules('ON_MOVE', { activePlayer, targetCell });
    if ((this.state.status as string) === 'DRAFTING_RULE') return true;

    // 3. Cell Effect
    if (targetCell.effect) {
      if (targetCell.effect.type === 'HEAL') {
        activePlayer.hp = Math.min(activePlayer.maxHp, activePlayer.hp + targetCell.effect.value);
        this.state.log.push(`💚 [Soin] ${activePlayer.username} récupère ${targetCell.effect.value} PV (${activePlayer.hp}/${activePlayer.maxHp}).`);
      } else if (targetCell.effect.type === 'DAMAGE') {
        activePlayer.hp -= targetCell.effect.value;
        this.state.log.push(`💥 [Piège] ${activePlayer.username} subit ${targetCell.effect.value} dégâts de piège !`);
        if (activePlayer.hp <= 0) {
          this.handlePlayerDeath(activePlayer, `Tué par le piège de ${targetCell.name}`);
          return true;
        }
      }
    }

    // 4. PVE COMBAT (Monsters on cell)
    if (targetCell.enemies && targetCell.enemies.length > 0) {
      const enemy = targetCell.enemies[0];
      this.state.log.push(`⚔️ [PVE] ${activePlayer.username} (${activePlayer.atk} ATK) affronte [${enemy.name} ${enemy.icon}] (${enemy.atk} ATK) !`);

      if (activePlayer.atk >= enemy.atk) {
        // Player wins combat: defeats monster and gains +1 ATK
        targetCell.enemies.shift();
        activePlayer.atk += 1;
        this.state.log.push(`🏆 ${activePlayer.username} remporte le combat et terrasse [${enemy.name}] ! (+1 ATK, passe à ${activePlayer.atk} ATK).`);
        this.evaluateRules('ON_KILL', { killer: activePlayer, victimName: enemy.name });
      } else {
        // Player loses combat: loses 1 HP
        activePlayer.hp -= 1;
        this.state.log.push(`💥 [${enemy.name}] remporte le combat ! ${activePlayer.username} perd 1 PV (${Math.max(0, activePlayer.hp)}/${activePlayer.maxHp} PV restants).`);
        if (activePlayer.hp <= 0) {
          this.handlePlayerDeath(activePlayer, `Terrassé par [${enemy.name}]`);
          return true;
        }
      }
    }

    // 5. PVP COMBAT (Roulette du Destin)
    const opponents = this.state.players.filter(
      p => p.id !== activePlayer.id && p.cellId === targetCellId && !p.isEliminated
    );

    if (opponents.length > 0) {
      const defender = opponents[0];

      // Calculate chances based on ATK:
      // "si ils ont la meme atk alors c'est 50/50 sinon c'est des pourcentage en fonction de l'atk"
      let attackerChance: number;
      let defenderChance: number;
      const totalAtk = Math.max(1, activePlayer.atk + defender.atk);

      if (activePlayer.atk === defender.atk) {
        attackerChance = 50;
        defenderChance = 50;
      } else {
        attackerChance = Math.round((activePlayer.atk / totalAtk) * 100);
        defenderChance = 100 - attackerChance;
      }

      // Determine winner with weighted probability
      const roll = Math.random() * 100;
      const attackerWins = roll < attackerChance;
      const winner = attackerWins ? activePlayer : defender;
      const loser = attackerWins ? defender : activePlayer;

      // Calculate stop angle for the roulette:
      const attackerSliceDeg = (attackerChance / 100) * 360;
      let landingAngle: number;

      if (attackerWins) {
        landingAngle = attackerSliceDeg * 0.5;
      } else {
        landingAngle = attackerSliceDeg + (360 - attackerSliceDeg) * 0.5;
      }

      // 5 full rotations (1800 deg) + angle alignment with top pointer
      const targetAngle = 1800 + (360 - landingAngle);

      const duel: ChaosDuelState = {
        id: `duel_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        attackerId: activePlayer.id,
        attackerName: activePlayer.username,
        attackerColor: activePlayer.color,
        attackerAtk: activePlayer.atk,
        attackerChance,
        defenderId: defender.id,
        defenderName: defender.username,
        defenderColor: defender.color,
        defenderAtk: defender.atk,
        defenderChance,
        winnerId: winner.id,
        winnerName: winner.username,
        loserId: loser.id,
        loserName: loser.username,
        targetAngle,
        startedAt: Date.now(),
        durationMs: 3500,
        isResolved: false
      };

      this.state.activeDuel = duel;
      this.state.log.push(
        `🎰 [ROULETTE DU DESTIN] Duel entre ${activePlayer.username} (${attackerChance}%) et ${defender.username} (${defenderChance}%) ! La roulette tourne...`
      );

      this.evaluateRules('ON_PVP', { attacker: activePlayer, defender });

      return true;
    }

    // 6. Turn passes to next player (if no duel)
    this.passTurnToNext();
    return true;
  }

  public resolveDuel(): boolean {
    if (!this.state.activeDuel || this.state.activeDuel.isResolved) {
      return false;
    }
    const duel = this.state.activeDuel;
    duel.isResolved = true;

    const winner = this.state.players.find(p => p.id === duel.winnerId);
    const loser = this.state.players.find(p => p.id === duel.loserId);

    if (!winner || !loser) {
      this.state.activeDuel = null;
      return false;
    }

    // Loser loses 1 HP
    loser.hp -= 1;
    winner.kills++;

    this.state.log.push(
      `🏆 La roulette s'est arrêtée sur ${winner.username} ! ${loser.username} perd 1 PV (${Math.max(0, loser.hp)}/${loser.maxHp} PV).`
    );

    this.state.lastCombatEvent = {
      id: `combat_${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('fr-FR'),
      attackerName: duel.attackerName,
      targetName: duel.defenderName,
      damageDealt: 1,
      targetDied: loser.hp <= 0,
      attackerDied: false,
      isPvP: true,
      message: `${winner.username} a triomphé à la roulette face à ${loser.username} (-1 PV) !`
    };

    this.state.activeDuel = null;

    if (loser.hp <= 0) {
      this.state.log.push(`💀 [MORT] ${loser.username} est tombé à 0 PV !`);
      this.handlePlayerDeath(loser, `Vaincu en duel à la roulette par ${winner.username}`);
      return true;
    }

    this.passTurnToNext();
    return true;
  }

  private passTurnToNext() {
    if (this.state.status !== 'PLAYING') return;
    this.state.currentPlayerIndex = (this.state.currentPlayerIndex + 1) % this.state.players.length;
    const nextPlayer = this.state.players[this.state.currentPlayerIndex];
    if (nextPlayer) {
      this.state.log.push(`👉 Tour de ${nextPlayer.username} (PV: ${nextPlayer.hp}, ATK: ${nextPlayer.atk}).`);
      this.evaluateRules('ON_TURN_START', { activePlayer: nextPlayer });
    }
  }

  private handlePlayerDeath(victim: ChaosPlayer, reason: string) {
    victim.isEliminated = true;
    this.state.status = 'DRAFTING_RULE';
    this.state.draftingPlayerId = victim.id;
    this.state.draftingPlayerName = victim.username;
    this.state.draftingReason = reason;

    this.state.log.push(`⚖️ ARRÊT DE MANCHE ! ${victim.username} est tombé (${reason}).`);
    this.state.log.push(`👑 ${victim.username} devient le Législateur du Chaos et prépare son décret divin...`);
  }

  // ─── DECREE / RULE CREATION (THE CORE ROGUELITE MECHANIC) ───────────────────
  public async submitNewRule(
    socketId: string,
    ruleText: string,
    onStepUpdate?: () => void
  ): Promise<boolean> {
    if (this.state.status !== 'DRAFTING_RULE' || this.state.draftingPlayerId !== socketId) {
      return false;
    }
    if (!ruleText.trim()) return false;

    const author = this.state.draftingPlayerName || 'Le Spectre';
    this.state.isAiGenerating = true;

    try {
      // 1. Call AI to structure the rule and mutations
      const parsedRule = await interpretChaosRule(
        ruleText,
        author,
        this.state.roundNumber,
        this.state,
        (aiLog) => {
          this.state.aiLogs.push(aiLog);
          this.state.log.push(aiLog.message);
          onStepUpdate?.();
        }
      );

      // 2. Append to active cumulative rules
      this.state.activeRules.push(parsedRule);

      // 3. Apply board mutations (ADD/REMOVE/MODIFY cells, SPAWN enemies, ADD stats)
      if (parsedRule.boardMutations && parsedRule.boardMutations.length > 0) {
        for (const mut of parsedRule.boardMutations) {
          this.applyMutation(mut);
        }
      }

      // 4. Set announcement with unique ID
      this.state.lastAnnouncement = {
        id: parsedRule.id,
        title: parsedRule.title,
        message: `${parsedRule.flavorText} — ${parsedRule.description}`,
        author
      };

      this.state.log.push(`🔥 DÉCRET #${this.state.activeRules.length} PROCLAMÉ : [${parsedRule.title}]`);
      this.state.log.push(`📜 ${parsedRule.description}`);

      // 5. Start next round with resurrection!
      this.startNextRound();
      return true;
    } finally {
      this.state.isAiGenerating = false;
    }
  }

  public getCoherentPlacement(requestedX?: number, requestedY?: number): { x: number; y: number } {
    const cells = this.state.cells;
    const occupied = new Set(cells.map(c => `${c.x},${c.y}`));

    // 1. If requested coordinates are provided, non-negative, and unoccupied:
    if (
      typeof requestedX === 'number' &&
      typeof requestedY === 'number' &&
      requestedX >= 0 &&
      requestedY >= 0 &&
      !occupied.has(`${requestedX},${requestedY}`)
    ) {
      // Must be adjacent (distance <= 1) to at least one existing cell
      const isAdjacent = cells.length === 0 || cells.some(c =>
        Math.abs(c.x - requestedX) <= 1 && Math.abs(c.y - requestedY) <= 1
      );
      if (isAdjacent) {
        return { x: requestedX, y: requestedY };
      }
    }

    const maxX = cells.reduce((max, c) => Math.max(max, c.x), 2);
    const maxY = cells.reduce((max, c) => Math.max(max, c.y), 1);

    // 2. Check for holes inside existing bounding box [0..maxX, 0..maxY]
    for (let y = 0; y <= maxY; y++) {
      for (let x = 0; x <= maxX; x++) {
        if (!occupied.has(`${x},${y}`)) {
          const isAdj = cells.some(c => Math.abs(c.x - x) <= 1 && Math.abs(c.y - y) <= 1);
          if (isAdj) {
            return { x, y };
          }
        }
      }
    }

    // 3. Expand naturally: maintain aspect ratio
    const width = maxX + 1;
    const height = maxY + 1;

    if (width <= height * 1.5) {
      // Expand to the right (x = maxX + 1)
      for (let y = 0; y <= maxY; y++) {
        if (!occupied.has(`${maxX + 1},${y}`)) {
          return { x: maxX + 1, y };
        }
      }
    } else {
      // Expand downwards (y = maxY + 1)
      for (let x = 0; x <= maxX; x++) {
        if (!occupied.has(`${x},${maxY + 1}`)) {
          return { x, y: maxY + 1 };
        }
      }
    }

    // Fallback: next slot to the right
    return { x: maxX + 1, y: 0 };
  }

  private applyMutation(mut: any) {
    switch (mut.action) {
      case 'ADD_CELL': {
        const { x: newX, y: newY } = this.getCoherentPlacement(mut.cell?.x, mut.cell?.y);
        const newId = `cell_${newX}_${newY}_${Date.now() % 1000}`;

        const newCell: ChaosCell = {
          id: newId,
          x: newX,
          y: newY,
          name: mut.cell?.name || 'Sanctuaire Maudit',
          icon: mut.cell?.icon || '🏰',
          description: mut.cell?.description || 'Une nouvelle zone façonnée par le décret.',
          colorTheme: mut.cell?.colorTheme || 'from-purple-950/80 to-indigo-900/60 border-purple-500/60 text-purple-300',
          enemies: []
        };
        this.state.cells.push(newCell);
        this.state.log.push(`🗺️ NOUVELLE CASE AJOUTÉE : [${newCell.name} ${newCell.icon}] en (${newX}, ${newY}) !`);
        break;
      }

      case 'REMOVE_CELL': {
        if (this.state.cells.length <= 2) break; // Keep at least 2 cells
        let targetIdx = -1;
        if (mut.cellId) {
          targetIdx = this.state.cells.findIndex(c => c.id === mut.cellId);
        }
        if (targetIdx === -1) {
          targetIdx = Math.floor(Math.random() * this.state.cells.length);
        }
        const removed = this.state.cells.splice(targetIdx, 1)[0];
        if (removed) {
          // Relocate players on this cell
          const safeCellId = this.state.cells[0]?.id || 'cell_0_0';
          for (const p of this.state.players) {
            if (p.cellId === removed.id) {
              p.cellId = safeCellId;
            }
          }
          this.state.log.push(`💥 CASE SUPPRIMÉE : [${removed.name} ${removed.icon}] s'effondre dans le vide !`);
        }
        break;
      }

      case 'MODIFY_CELL': {
        let cell = mut.cellId ? this.state.cells.find(c => c.id === mut.cellId) : null;
        if (!cell && this.state.cells.length > 0) {
          cell = this.state.cells[Math.floor(Math.random() * this.state.cells.length)];
        }
        if (cell && mut.cell) {
          if (mut.cell.name) cell.name = mut.cell.name;
          if (mut.cell.icon) cell.icon = mut.cell.icon;
          if (mut.cell.description) cell.description = mut.cell.description;
          if (mut.cell.colorTheme) cell.colorTheme = mut.cell.colorTheme;
          this.state.log.push(`🔄 CASE MUTÉE : Devient [${cell.name} ${cell.icon}] !`);
        }
        break;
      }

      case 'SPAWN_ENEMY': {
        const targetCell = (mut.cellId && this.state.cells.find(c => c.id === mut.cellId))
          || this.state.cells[Math.floor(Math.random() * this.state.cells.length)];

        if (targetCell) {
          const enemyHp = Math.min(5, Math.max(1, mut.enemy?.hp ?? 2));
          const enemyAtk = Math.min(3, Math.max(1, mut.enemy?.atk ?? 1));
          const enemy: ChaosEnemy = {
            id: `enemy_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            name: mut.enemy?.name || 'Ombre Rampante',
            icon: mut.enemy?.icon || '👹',
            hp: enemyHp,
            maxHp: enemyHp,
            atk: enemyAtk,
            reward: mut.enemy?.reward || '+1 ATK permanent'
          };
          targetCell.enemies.push(enemy);
          this.state.log.push(`👾 ENNEMI INVOQUÉ : [${enemy.name} ${enemy.icon}] (PV: ${enemy.hp}, ATK: ${enemy.atk}) apparaît sur [${targetCell.name}] !`);
        }
        break;
      }

      case 'ADD_STAT': {
        if (mut.statDef) {
          const exists = this.state.definedStats.find(s => s.name.toLowerCase() === mut.statDef.name.toLowerCase());
          if (!exists) {
            this.state.definedStats.push(mut.statDef);
            for (const p of this.state.players) {
              p.customStats[mut.statDef.name] = mut.statDef.defaultValue;
            }
            this.state.log.push(`✨ NOUVELLE STATISTIQUE GLOBALE : [${mut.statDef.name} ${mut.statDef.icon}] (base: ${mut.statDef.defaultValue}) !`);
          }
        }
        break;
      }

      case 'MODIFY_STAT': {
        if (mut.statName && mut.value) {
          for (const p of this.state.players) {
            if (mut.statName === 'atk') p.atk = Math.max(1, p.atk + mut.value);
            else if (mut.statName === 'hp') p.hp = Math.min(p.maxHp, p.hp + mut.value);
            else {
              p.customStats[mut.statName] = (p.customStats[mut.statName] || 0) + mut.value;
            }
          }
          this.state.log.push(`⚡ Statistique [${mut.statName}] modifiée de ${mut.value > 0 ? '+' : ''}${mut.value} pour les joueurs !`);
        }
        break;
      }
    }
  }

  private startNextRound() {
    // Endless rounds: no round limit!
    this.state.roundNumber++;

    // Resurrect all players and reposition
    for (let i = 0; i < this.state.players.length; i++) {
      const p = this.state.players[i];
      p.hp = p.maxHp;
      p.isEliminated = false;
      const cellIndex = i % this.state.cells.length;
      p.cellId = this.state.cells[cellIndex]?.id || 'cell_0_0';
    }

    this.state.status = 'PLAYING';
    this.state.draftingPlayerId = null;
    this.state.draftingPlayerName = null;
    this.state.draftingReason = null;
    this.state.currentPlayerIndex = 0;

    this.state.log.push(`✨ MANCHE ${this.state.roundNumber} (INFINIE ♾️) COMMENCE ! Tous les joueurs ressuscitent.`);
    this.state.log.push(`⚠️ ${this.state.activeRules.length} DÉCRET(S) DU CHAOS SONT ACTIFS !`);

    this.evaluateRules('ON_ROUND_START', {});
  }

  // ─── RULE EVALUATION ──────────────────────────────────────────────────────
  private evaluateRules(trigger: ChaosRule['trigger'], ctx: any) {
    for (const rule of this.state.activeRules) {
      if (rule.trigger !== trigger) continue;

      for (const eff of rule.effects) {
        const targets = this.resolveTargets(eff.target, ctx);
        for (const target of targets) {
          switch (eff.type) {
            case 'DAMAGE':
              target.hp -= eff.value;
              this.state.log.push(`💥 [${rule.title}] inflige ${eff.value} dégâts à ${target.username} !`);
              if (target.hp <= 0 && this.state.status === 'PLAYING') {
                this.handlePlayerDeath(target, `Anéanti par le décret [${rule.title}]`);
                return;
              }
              break;
            case 'HEAL':
              target.hp = Math.min(target.maxHp, target.hp + eff.value);
              this.state.log.push(`💚 [${rule.title}] soigne ${target.username} de ${eff.value} PV !`);
              break;
            case 'MODIFY_ATK':
              target.atk = Math.max(1, target.atk + eff.value);
              this.state.log.push(`🗡️ [${rule.title}] modifie l'ATK de ${target.username} de ${eff.value > 0 ? '+' : ''}${eff.value} !`);
              break;
            case 'MODIFY_STAT':
              if (eff.statName) {
                target.customStats[eff.statName] = (target.customStats[eff.statName] || 0) + eff.value;
                this.state.log.push(`✨ [${rule.title}] ajuste ${eff.statName} de ${target.username} (${eff.value > 0 ? '+' : ''}${eff.value}).`);
              }
              break;
          }
        }
      }
    }
  }

  private resolveTargets(targetType: ChaosRuleEffect['target'], ctx: any): ChaosPlayer[] {
    const active = ctx?.activePlayer || ctx?.attacker || this.state.players[this.state.currentPlayerIndex];
    switch (targetType) {
      case 'CURRENT_PLAYER':
        return active ? [active] : [];
      case 'ALL_PLAYERS':
        return this.state.players.filter(p => !p.isEliminated);
      case 'ALL_OTHER_PLAYERS':
        return this.state.players.filter(p => p.id !== active?.id && !p.isEliminated);
      case 'TARGET_PLAYER':
        return ctx?.defender ? [ctx.defender] : [];
      case 'RANDOM_PLAYER': {
        const alive = this.state.players.filter(p => !p.isEliminated);
        return alive.length > 0 ? [alive[Math.floor(Math.random() * alive.length)]] : [];
      }
      default:
        return active ? [active] : [];
    }
  }

  public resetGame(): boolean {
    this.state.status = 'LOBBY';
    this.state.roundNumber = 1;
    this.state.activeRules = [];
    this.state.winner = null;
    this.state.draftingPlayerId = null;
    this.state.lastAnnouncement = null;
    this.state.cells = JSON.parse(JSON.stringify(INITIAL_CELLS));
    this.state.definedStats = [];
    this.state.aiLogs = [];
    this.state.activeDuel = null;

    for (let i = 0; i < this.state.players.length; i++) {
      const p = this.state.players[i];
      p.cellId = this.state.cells[i % this.state.cells.length].id;
      p.hp = 3;
      p.maxHp = 3;
      p.atk = 1;
      p.customStats = {};
      p.isEliminated = false;
      p.kills = 0;
      p.roundsWon = 0;
    }
    this.state.log = ['Partie réinitialisée. En attente du départ...'];
    return true;
  }
}
