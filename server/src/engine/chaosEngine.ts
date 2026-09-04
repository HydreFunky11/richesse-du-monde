import {
  ChaosGameState,
  ChaosPlayer,
  ChaosCell,
  ChaosCellType,
  ChaosRule
} from '../types/chaos';
import { interpretChaosRule, getCellDefaultMeta } from './chaosAi';

const INITIAL_BOARD: Omit<ChaosCell, 'index'>[] = [
  { type: 'DEPART', name: 'Départ', icon: '🏁', description: '+300 Or et +20 PV en passant' },
  { type: 'NORMAL', name: 'Chemin Paisible', icon: '🌲', description: 'Une case calme... pour l\'instant.' },
  { type: 'GAMBLE', name: 'Casino Maudit', icon: '🎰', description: 'Pariez votre or au jeu du hasard !' },
  { type: 'CHEST', name: 'Coffre Mystère', icon: '📦', description: 'Trésor, or ou relique inconnue.' },
  { type: 'DEBT', name: 'Banque Toxique', icon: '🏦', description: 'Empruntez 400g, mais payez des intérêts mortels.' },
  { type: 'NORMAL', name: 'Plaine Nue', icon: '🌾', description: 'Rien à signaler... méfiez-vous.' },
  { type: 'FIGHT', name: 'Antre du Monstre', icon: '⚔️', description: 'Combattez une bête pour du butin !' },
  { type: 'LAVA', name: 'Fosse de Lave', icon: '🔥', description: 'Chaleur insoutenable : -25 PV !' },
  { type: 'PORTAL', name: 'Vortex Dimensionnel', icon: '🌀', description: 'Téléportation aléatoire sur le plateau.' },
  { type: 'NORMAL', name: 'Sentier Oublié', icon: '🍂', description: 'Un vent mystique souffle ici.' },
  { type: 'BUFF', name: 'Autel de Force', icon: '💪', description: '+5 Force permanente pour vos combats.' },
  { type: 'GAMBLE', name: 'Taverne des Joueurs', icon: '🎲', description: 'Double ou rien sur un coup de dé !' },
  { type: 'NORMAL', name: 'Clairière Sombre', icon: '🌑', description: 'Les ombres vous observent.' },
  { type: 'FIGHT', name: 'Colosse Gardien', icon: '👾', description: 'Un monstre redoutable garde ce passage.' },
  { type: 'CURSE', name: 'Cercle Maudit', icon: '💀', description: 'Malédiction : perte de force et d\'or.' },
  { type: 'CHEST', name: 'Urne Sacrée', icon: '🏺', description: 'Un cadeau des anciens dieux du chaos.' },
  { type: 'LAVA', name: 'Lac de Magma', icon: '🌋', description: 'Danger mortel : -30 PV brûlants !' },
  { type: 'NORMAL', name: 'Passage Étroit', icon: '🧱', description: 'Respirez un grand coup.' },
  { type: 'DEBT', name: 'Usurier de l\'Ombre', icon: '💸', description: 'Vos dettes augmentent de 15% ici.' },
  { type: 'CHAOS', name: 'Roue du Chaos', icon: '🔮', description: 'Effet totalement imprévisible !' }
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
      maxRounds: 5,
      players: [],
      currentPlayerIndex: 0,
      board: INITIAL_BOARD.map((c, idx) => ({ ...c, index: idx })),
      lastDiceRoll: null,
      activeRules: [],
      draftingPlayerId: null,
      draftingPlayerName: null,
      draftingReason: null,
      isAiGenerating: false,
      lastAnnouncement: null,
      winner: null,
      log: ['Arène du Chaos prête. Rejoignez le salon et préparez-vous au pire !'],
      aiLogs: []
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

    this.state.players.push({
      id,
      username,
      color,
      position: 0,
      health: 100,
      maxHealth: 100,
      gold: 500,
      power: 10,
      debt: 0,
      isEliminated: false,
      roundsWon: 0,
      lapsCompleted: 0
    });

    this.state.log.push(`${username} a rejoint le Conseil du Chaos.`);
    return true;
  }

  public removePlayer(id: string) {
    const idx = this.state.players.findIndex(p => p.id === id);
    if (idx !== -1) {
      const p = this.state.players[idx];
      this.state.log.push(`${p.username} a fui le Chaos.`);
      this.state.players.splice(idx, 1);
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
    this.state.log.push('🏁 La Manche 1 commence ! Aucune règle chaotique pour l\'instant... profitez-en.');
    return true;
  }

  public rollDice(socketId: string): boolean {
    const activePlayer = this.state.players[this.state.currentPlayerIndex];
    if (
      !activePlayer ||
      activePlayer.id !== socketId ||
      this.state.status !== 'PLAYING' ||
      this.state.lastDiceRoll !== null
    ) {
      return false;
    }

    // Roll 1 to 6
    const roll = Math.floor(Math.random() * 6) + 1;
    this.state.lastDiceRoll = roll;

    this.state.log.push(`🎲 ${activePlayer.username} a lancé un ${roll} !`);

    // 1. Evaluate ON_DICE_ROLL rules
    this.evaluateRules('ON_DICE_ROLL', { roll, activePlayer });
    if ((this.state.status as string) === 'DRAFTING_RULE') return true;

    // 2. Move player
    const prevPos = activePlayer.position;
    const newPos = (prevPos + roll) % this.state.board.length;
    activePlayer.position = newPos;

    // Check if passed or landed on DEPART
    if (newPos < prevPos || newPos === 0) {
      activePlayer.gold += 300;
      activePlayer.health = Math.min(activePlayer.maxHealth, activePlayer.health + 20);
      activePlayer.lapsCompleted++;
      this.state.log.push(`🏁 ${activePlayer.username} passe par le DEPART (+300 Or, +20 PV).`);

      this.evaluateRules('ON_PASS_DEPART', { activePlayer });
      if ((this.state.status as string) === 'DRAFTING_RULE') return true;
    }

    // 3. Resolve cell landing
    this.resolveCellLanding(activePlayer);

    return true;
  }

  private resolveCellLanding(player: ChaosPlayer) {
    const cell = this.state.board[player.position];
    this.state.log.push(`📍 ${player.username} atterrit sur [${cell.icon} ${cell.name}].`);

    // Standard cell resolutions
    switch (cell.type) {
      case 'NORMAL':
        break;
      case 'LAVA':
        player.health -= 25;
        this.state.log.push(`🔥 Brûlure ! ${player.username} perd 25 PV dans la lave !`);
        break;
      case 'BUFF':
        player.power += 5;
        this.state.log.push(`💪 Bénédiction : ${player.username} gagne +5 Puissance !`);
        break;
      case 'CURSE':
        player.power = Math.max(0, player.power - 5);
        player.gold = Math.max(0, player.gold - 50);
        this.state.log.push(`💀 Malédiction : ${player.username} perd 5 Puissance et 50 Or !`);
        break;
      case 'GOLD':
        player.gold += 150;
        this.state.log.push(`💰 Mine d'Or : ${player.username} récolte 150 pièces d'or !`);
        break;
      case 'CHEST':
        const chestGold = Math.floor(Math.random() * 200) + 100;
        player.gold += chestGold;
        this.state.log.push(`📦 Coffre : ${player.username} trouve ${chestGold} pièces d'or !`);
        break;
      case 'PORTAL':
        const targetCell = Math.floor(Math.random() * this.state.board.length);
        player.position = targetCell;
        this.state.log.push(`🌀 VORTEX : ${player.username} est téléporté sur la case #${targetCell} !`);
        break;
      case 'DEBT':
        player.gold += 400;
        player.debt += 500;
        this.state.log.push(`🏦 Banque Toxique : ${player.username} emprunte 400 Or (Dette: ${player.debt}g).`);
        break;
      case 'CHAOS':
        const chaosChoices = [
          () => { player.health += 30; this.state.log.push(`🔮 Roue du Chaos : Soin mystique +30 PV !`); },
          () => { player.gold += 400; this.state.log.push(`🔮 Roue du Chaos : Pluie d'or +400g !`); },
          () => { player.health -= 20; this.state.log.push(`🔮 Roue du Chaos : Coup de foudre -20 PV !`); },
          () => { player.power += 10; this.state.log.push(`🔮 Roue du Chaos : Puissance divine +10 Force !`); }
        ];
        chaosChoices[Math.floor(Math.random() * chaosChoices.length)]();
        break;
      default:
        // GAMBLE and FIGHT require interactive actions
        break;
    }

    // 4. Evaluate ON_LAND_CELL rules
    this.evaluateRules('ON_LAND_CELL', { activePlayer: player, cell });

    // Check elimination
    this.checkElimination(player, `Atterrissage sur ${cell.name}`);
  }

  public playAction(socketId: string, actionType: 'GAMBLE' | 'FIGHT', params: any = {}): boolean {
    const activePlayer = this.state.players[this.state.currentPlayerIndex];
    if (!activePlayer || activePlayer.id !== socketId || this.state.status !== 'PLAYING') {
      return false;
    }

    const cell = this.state.board[activePlayer.position];

    if (actionType === 'GAMBLE') {
      const bet = Math.max(50, Math.min(activePlayer.gold, Number(params.betAmount) || 100));
      if (activePlayer.gold < bet) return false;

      const win = Math.random() > 0.48;
      if (win) {
        activePlayer.gold += bet;
        this.state.log.push(`🎰 JACKPOT ! ${activePlayer.username} mise ${bet}g et remporte le double (+${bet}g) !`);
      } else {
        activePlayer.gold -= bet;
        this.state.log.push(`🎰 RÂTÉ ! ${activePlayer.username} perd sa mise de ${bet}g.`);
      }

      this.evaluateRules('ON_GAMBLE', { activePlayer, bet, win });
    } else if (actionType === 'FIGHT') {
      const monsterPower = Math.floor(Math.random() * 15) + 8; // 8 to 22
      this.state.log.push(`⚔️ Duel : ${activePlayer.username} (Force ${activePlayer.power}) affronte une abomination (Force ${monsterPower}).`);

      if (activePlayer.power >= monsterPower) {
        const reward = 250 + (activePlayer.power - monsterPower) * 10;
        activePlayer.gold += reward;
        activePlayer.power += 2;
        this.state.log.push(`🏆 VICTOIRE ! ${activePlayer.username} terrasse la bête et gagne ${reward}g et +2 Force !`);
      } else {
        const diff = monsterPower - activePlayer.power;
        const dmg = diff * 4;
        activePlayer.health -= dmg;
        this.state.log.push(`💥 DÉFAITE ! Le monstre blesse lourdement ${activePlayer.username} (-${dmg} PV).`);
      }

      this.evaluateRules('ON_FIGHT', { activePlayer, monsterPower });
    }

    this.checkElimination(activePlayer, actionType === 'FIGHT' ? 'Mort en combat' : 'Faillite au casino');
    return true;
  }

  public passTurn(socketId: string): boolean {
    const activePlayer = this.state.players[this.state.currentPlayerIndex];
    if (
      !activePlayer ||
      activePlayer.id !== socketId ||
      this.state.status !== 'PLAYING' ||
      this.state.lastDiceRoll === null
    ) {
      return false;
    }

    // Apply debt interest at end of turn
    if (activePlayer.debt > 0) {
      const interest = Math.floor(activePlayer.debt * 0.12);
      activePlayer.debt += interest;
      this.state.log.push(`💸 Dette : ${activePlayer.username} accumule ${interest}g d'intérêts (Total: ${activePlayer.debt}g).`);
      if (activePlayer.debt >= 2000) {
        this.checkElimination(activePlayer, 'Endettement mortel (Dette > 2000g)');
        if ((this.state.status as string) === 'DRAFTING_RULE') return true;
      }
    }

    // Reset roll
    this.state.lastDiceRoll = null;

    // Advance turn
    this.nextTurn();
    return true;
  }

  public modifyCell(socketId: string, cellIndex: number, newType: ChaosCellType): boolean {
    if (cellIndex >= 0 && cellIndex < this.state.board.length) {
      this.state.board[cellIndex].type = newType;
      return true;
    }
    return false;
  }

  private nextTurn() {
    this.state.currentPlayerIndex = (this.state.currentPlayerIndex + 1) % this.state.players.length;
    const activePlayer = this.state.players[this.state.currentPlayerIndex];

    this.state.log.push(`👉 C'est au tour de ${activePlayer.username}.`);

    // Evaluate ON_TURN_START
    this.evaluateRules('ON_TURN_START', { activePlayer });
  }

  // ─── ELIMINATION & DEATH TRIGGER ──────────────────────────────────────────
  private checkElimination(player: ChaosPlayer, reason: string) {
    if (player.health <= 0 || player.debt >= 2000) {
      player.isEliminated = true;
      player.health = 0;

      // TRIGGER THE CORE HOOK: STOP THE ROUND AND ENTER DRAFTING_RULE!
      this.state.status = 'DRAFTING_RULE';
      this.state.draftingPlayerId = player.id;
      this.state.draftingPlayerName = player.username;
      this.state.draftingReason = reason;

      this.state.log.push(
        `💀💀💀 ${player.username.toUpperCase()} A ÉTÉ ÉLIMINÉ (${reason}) ! LA MANCHE S'ARRÊTE ! 💀💀💀`
      );
      this.state.log.push(
        `📜 ${player.username} devient le Législateur du Chaos et prépare une nouvelle règle pour la prochaine manche...`
      );
    }
  }

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
      // Ask OpenRouter AI to parse, flavour and structure the rule
      const parsedRule = await interpretChaosRule(
        ruleText,
        author,
        this.state.roundNumber,
        (aiLog) => {
          this.state.aiLogs.push(aiLog);
          this.state.log.push(aiLog.message);
          onStepUpdate?.();
        }
      );

      // Append to active cumulative rules
      this.state.activeRules.push(parsedRule);

      // Apply any board modifications (Creating new cells or mutating existing ones)
      if (parsedRule.boardModifications && parsedRule.boardModifications.length > 0) {
        for (const mod of parsedRule.boardModifications) {
          const meta = getCellDefaultMeta(mod.newType);
          const cellName = mod.name || meta.name;
          const cellIcon = mod.icon || meta.icon;
          const cellDesc = mod.description || meta.description;

          if (mod.action === 'ADD' || (mod.cellIndex === undefined && !mod.filter)) {
            const newIndex = this.state.board.length;
            this.state.board.push({
              index: newIndex,
              type: mod.newType,
              name: cellName,
              icon: cellIcon,
              description: cellDesc
            });
            this.state.log.push(`🗺️ NOUVELLE CASE #${newIndex} CRÉÉE : [${cellName} ${cellIcon}] - ${cellDesc}`);
          } else if (mod.cellIndex !== undefined && this.state.board[mod.cellIndex]) {
            const c = this.state.board[mod.cellIndex];
            c.type = mod.newType;
            c.name = cellName;
            c.icon = cellIcon;
            c.description = cellDesc;
            this.state.log.push(`🔄 CASE #${mod.cellIndex} MUTÉE : devient [${cellName} ${cellIcon}] !`);
          } else if (mod.filter === 'even') {
            this.state.board.forEach((c, idx) => {
              if (idx > 0 && idx % 2 === 0) {
                c.type = mod.newType;
                c.name = cellName;
                c.icon = cellIcon;
                c.description = cellDesc;
              }
            });
            this.state.log.push(`🔄 TOUTES LES CASES PAIRES MUTÉES en [${cellName} ${cellIcon}] !`);
          } else if (mod.filter === 'odd') {
            this.state.board.forEach((c, idx) => {
              if (idx % 2 === 1) {
                c.type = mod.newType;
                c.name = cellName;
                c.icon = cellIcon;
                c.description = cellDesc;
              }
            });
            this.state.log.push(`🔄 TOUTES LES CASES IMPAIRES MUTÉES en [${cellName} ${cellIcon}] !`);
          }
        }
      }

      // Announce the new rule with a unique ID
      this.state.lastAnnouncement = {
        id: parsedRule.id,
        title: parsedRule.title,
        message: `${parsedRule.flavorText} — ${parsedRule.description}`,
        author
      };

      this.state.log.push(`🔥 DÉCRET OFFICIEL #${this.state.activeRules.length} : [${parsedRule.title}]`);
      this.state.log.push(`📜 ${parsedRule.description}`);

      // Start Next Round!
      this.startNextRound();
      return true;
    } finally {
      this.state.isAiGenerating = false;
    }
  }

  private startNextRound() {
    this.state.roundNumber++;

    if (this.state.roundNumber > this.state.maxRounds) {
      // Game over! Winner has highest gold or survived rounds
      const sorted = [...this.state.players].sort((a, b) => b.gold - a.gold);
      this.state.winner = sorted[0];
      this.state.status = 'FINISHED';
      this.state.log.push(`🏆 FIN DE LA PARTIE DU CHAOS ! ${sorted[0].username} est couronné Vainqueur Suprême !`);
      return;
    }

    // Reset all players for next round
    for (const p of this.state.players) {
      p.position = 0;
      p.health = 100;
      p.gold = 500;
      p.power = 10;
      p.debt = 0;
      p.isEliminated = false;
    }

    this.state.status = 'PLAYING';
    this.state.draftingPlayerId = null;
    this.state.draftingPlayerName = null;
    this.state.draftingReason = null;
    this.state.lastDiceRoll = null;
    this.state.currentPlayerIndex = 0;

    this.state.log.push(`✨ MANCHE ${this.state.roundNumber} COMMENCE ! Tous les joueurs ressuscitent.`);
    this.state.log.push(`⚠️ ${this.state.activeRules.length} RÈGLE(S) DU CHAOS SONT ACTIVES DANS CETTE MANCHE !`);

    // Evaluate ON_ROUND_START rules
    this.evaluateRules('ON_ROUND_START', {});
  }

  // ─── DYNAMIC RULE EXECUTION ENGINE ────────────────────────────────────────
  private evaluateRules(trigger: ChaosRule['trigger'], ctx: any) {
    for (const rule of this.state.activeRules) {
      if (rule.trigger !== trigger) continue;

      // Check condition
      if (!this.checkRuleCondition(rule.condition, ctx)) continue;

      this.state.log.push(`⚡ Règle active [${rule.title}] déclenchée !`);

      // Apply each effect
      for (const eff of rule.effects) {
        const targets = this.resolveEffectTargets(eff.target, ctx);

        for (const target of targets) {
          switch (eff.type) {
            case 'DAMAGE':
              target.health -= eff.value;
              this.state.log.push(`💥 ${target.username} subit ${eff.value} dégâts (${rule.title}) !`);
              this.checkElimination(target, `Tué par [${rule.title}]`);
              break;
            case 'HEAL':
              target.health = Math.min(target.maxHealth, target.health + eff.value);
              this.state.log.push(`💚 ${target.username} récupère ${eff.value} PV (${rule.title}) !`);
              break;
            case 'GOLD_CHANGE':
              target.gold = Math.max(0, target.gold + eff.value);
              this.state.log.push(`🪙 ${target.username} ${eff.value >= 0 ? '+' : ''}${eff.value} Or (${rule.title}).`);
              break;
            case 'POWER_CHANGE':
              target.power = Math.max(0, target.power + eff.value);
              this.state.log.push(`💪 ${target.username} ${eff.value >= 0 ? '+' : ''}${eff.value} Puissance (${rule.title}).`);
              break;
            case 'DEBT_CHANGE':
              target.debt = Math.max(0, target.debt + eff.value);
              this.state.log.push(`💸 Dette de ${target.username} modifiée de ${eff.value}g (${rule.title}).`);
              break;
            case 'EXTRA_MOVE':
              target.position = (target.position + eff.value + this.state.board.length) % this.state.board.length;
              this.state.log.push(`🏃 ${target.username} est propulsé de ${eff.value} cases (${rule.title}) !`);
              break;
          }
        }
      }
    }
  }

  private checkRuleCondition(cond: ChaosRule['condition'], ctx: any): boolean {
    if (!cond || cond.type === 'ALWAYS') return true;

    if (cond.type === 'ROLL_EQUALS') {
      return ctx.roll === cond.value;
    }
    if (cond.type === 'ROLL_IS_EVEN') {
      return ctx.roll % 2 === 0;
    }
    if (cond.type === 'ROLL_IS_ODD') {
      return ctx.roll % 2 === 1;
    }
    if (cond.type === 'ROLL_GREATER_THAN') {
      return ctx.roll > (cond.value || 3);
    }
    if (cond.type === 'CELL_TYPE') {
      return ctx.cell?.type === cond.value;
    }

    return true;
  }

  private resolveEffectTargets(targetType: string, ctx: any): ChaosPlayer[] {
    const active = ctx.activePlayer || this.state.players[this.state.currentPlayerIndex];

    switch (targetType) {
      case 'CURRENT_PLAYER':
        return active ? [active] : [];
      case 'ALL_PLAYERS':
        return this.state.players;
      case 'ALL_OTHER_PLAYERS':
        return this.state.players.filter(p => p.id !== active?.id);
      case 'RICHEST_PLAYER':
        const richest = [...this.state.players].sort((a, b) => b.gold - a.gold)[0];
        return richest ? [richest] : [];
      case 'POOREST_PLAYER':
        const poorest = [...this.state.players].sort((a, b) => a.gold - b.gold)[0];
        return poorest ? [poorest] : [];
      default:
        return active ? [active] : [];
    }
  }

  public resetGame(): boolean {
    this.state.status = 'LOBBY';
    this.state.roundNumber = 1;
    this.state.activeRules = [];
    this.state.lastDiceRoll = null;
    this.state.winner = null;
    this.state.draftingPlayerId = null;
    this.state.lastAnnouncement = null;
    this.state.board = INITIAL_BOARD.map((c, idx) => ({ ...c, index: idx }));
    for (const p of this.state.players) {
      p.position = 0;
      p.health = 100;
      p.gold = 500;
      p.power = 10;
      p.debt = 0;
      p.isEliminated = false;
      p.roundsWon = 0;
      p.lapsCompleted = 0;
    }
    this.state.aiLogs = [];
    this.state.log = ['Partie réinitialisée. En attente du départ...'];
    return true;
  }
}
