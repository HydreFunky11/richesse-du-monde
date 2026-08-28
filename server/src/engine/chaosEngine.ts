import { ChaosGameState, ChaosPlayer, ChaosCell, ChaosCellType } from '../types/chaos';

const INITIAL_BOARD_TYPES: ChaosCellType[] = [
  'DEPART', 'NORMAL', 'GAMBLE', 'NORMAL', 'DEBT',
  'NORMAL', 'FIGHT', 'NORMAL', 'PATCH', 'NORMAL',
  'GAMBLE', 'NORMAL', 'FIGHT', 'NORMAL', 'DEBT',
  'NORMAL', 'FIGHT', 'NORMAL', 'PATCH', 'NORMAL'
];

export class ChaosEngine {
  private roomCode: string;
  private state: ChaosGameState;

  constructor(roomCode: string) {
    this.roomCode = roomCode;
    this.state = {
      status: 'LOBBY',
      players: [],
      currentPlayerIndex: 0,
      board: INITIAL_BOARD_TYPES.map((type, idx) => ({ index: idx, type })),
      lastDiceRoll: null,
      globalModifiers: [],
      winner: null,
      log: ['Salon de jeu créé. En attente des joueurs...']
    };
  }

  public getPlayers(): ChaosPlayer[] {
    return this.state.players;
  }

  public getState(): ChaosGameState {
    return this.state;
  }

  public addPlayer(id: string, username: string, color: string): boolean {
    if (this.state.status !== 'LOBBY' || this.state.players.length >= 6) {
      return false;
    }
    this.state.players.push({
      id,
      username,
      color,
      position: 0,
      health: 100,
      gold: 1000,
      power: 10,
      debt: 0,
      isEliminated: false
    });
    this.state.log.push(`${username} a rejoint la partie.`);
    return true;
  }

  public startGame(): boolean {
    if (this.state.players.length < 2 || this.state.status !== 'LOBBY') {
      return false;
    }
    this.state.status = 'PLAYING';
    this.state.log.push('La partie de Chaos Board commence ! Survivez aux pièges !');
    return true;
  }

  public rollDice(socketId: string): boolean {
    const activePlayer = this.state.players[this.state.currentPlayerIndex];
    if (!activePlayer || activePlayer.id !== socketId || this.state.status !== 'PLAYING' || this.state.lastDiceRoll !== null) {
      return false;
    }

    // Roll 1 to 6
    const roll = Math.floor(Math.random() * 6) + 1;
    this.state.lastDiceRoll = roll;
    
    // Apply movement
    const prevPos = activePlayer.position;
    activePlayer.position = (prevPos + roll) % this.state.board.length;
    
    this.state.log.push(`${activePlayer.username} a lancé un ${roll} et s'est déplacé de la case ${prevPos} à la case ${activePlayer.position}.`);

    // Check if passed DEPART to earn gold
    if (activePlayer.position < prevPos) {
      activePlayer.gold += 300;
      this.state.log.push(`${activePlayer.username} est passé par la case DEPART et reçoit 300 pièces.`);
    }

    // Land on cell and execute automatic basic resolutions
    this.resolveCellLanding(activePlayer);
    
    return true;
  }

  private resolveCellLanding(player: ChaosPlayer) {
    const cell = this.state.board[player.position];
    this.state.log.push(`${player.username} atterrit sur une case de type ${cell.type}.`);

    switch (cell.type) {
      case 'NORMAL':
        // Nothing happens
        break;
      case 'LAVA':
        const lavaDamage = this.state.globalModifiers.includes('LAVA_BUFF') ? 50 : 30;
        player.health -= lavaDamage;
        this.state.log.push(`🔥 Aïe ! ${player.username} brûle dans la lave et perd ${lavaDamage} PV !`);
        break;
      case 'BUFF':
        player.power += 5;
        this.state.log.push(`💪 ${player.username} gagne +5 Puissance !`);
        break;
      case 'CURSE':
        player.power = Math.max(0, player.power - 5);
        this.state.log.push(`💀 ${player.username} subit une malédiction et perd 5 Puissance !`);
        break;
      case 'DEBT':
        player.debt += 500;
        player.gold += 400;
        this.state.log.push(`🏦 ${player.username} contracte un emprunt de 500 d'or avec 400 d'or en main.`);
        break;
      default:
        // Wait for player interactive action for GAMBLE, FIGHT, PATCH
        break;
    }

    this.checkElimination(player);
  }

  public playAction(socketId: string, actionType: string, params: any): boolean {
    const activePlayer = this.state.players[this.state.currentPlayerIndex];
    if (!activePlayer || activePlayer.id !== socketId || this.state.status !== 'PLAYING') {
      return false;
    }

    const cell = this.state.board[activePlayer.position];

    if (actionType === 'GAMBLE') {
      const bet = Number(params.betAmount) || 100;
      if (activePlayer.gold < bet) {
        return false;
      }
      const win = Math.random() > 0.5;
      if (win) {
        activePlayer.gold += bet;
        this.state.log.push(`🎰 Succès ! ${activePlayer.username} parie ${bet} d'or et gagne le double !`);
      } else {
        activePlayer.gold -= bet;
        this.state.log.push(`🎰 Échec ! ${activePlayer.username} perd son pari de ${bet} d'or !`);
      }
    } else if (actionType === 'FIGHT') {
      const monsterPower = Math.floor(Math.random() * 20) + 5; // 5 to 25
      this.state.log.push(`⚔️ Combat : ${activePlayer.username} (Puissance ${activePlayer.power}) contre un monstre de force ${monsterPower}.`);
      if (activePlayer.power >= monsterPower) {
        const reward = 300;
        activePlayer.gold += reward;
        this.state.log.push(`🏆 Victoire ! ${activePlayer.username} terrasse le monstre et gagne ${reward} d'or.`);
      } else {
        const diff = monsterPower - activePlayer.power;
        const damage = diff * 3;
        activePlayer.health -= damage;
        this.state.log.push(`💥 Défaite ! Le monstre inflige ${damage} blessures à ${activePlayer.username}.`);
      }
    } else if (actionType === 'PATCH') {
      const rules = [
        { key: 'LAVA_BUFF', desc: 'La Lave inflige désormais 50 dégâts au lieu de 30 !' },
        { key: 'INTEREST_BUFF', desc: 'Le taux d\'intérêt de la dette augmente de 10% !' },
        { key: 'GOLD_BOOST', desc: 'Chaque passage au DEPART rapporte 500 d\'or !' }
      ];
      const patch = rules[Math.floor(Math.random() * rules.length)];
      if (!this.state.globalModifiers.includes(patch.key)) {
        this.state.globalModifiers.push(patch.key);
      }
      this.state.log.push(`🛠️ MAJ DU JEU (Patch) : ${patch.desc}`);
    }

    this.checkElimination(activePlayer);
    return true;
  }

  public modifyCell(socketId: string, cellIndex: number, newType: ChaosCellType): boolean {
    const player = this.state.players.find(p => p.id === socketId);
    if (!player || !player.isEliminated || cellIndex <= 0 || cellIndex >= this.state.board.length) {
      return false;
    }
    
    this.state.board[cellIndex].type = newType;
    this.state.log.push(`🎭 Spectateur Chaos : ${player.username} a modifié la case #${cellIndex} en case [${newType}] !`);
    return true;
  }

  public passTurn(socketId: string): boolean {
    const activePlayer = this.state.players[this.state.currentPlayerIndex];
    if (!activePlayer || activePlayer.id !== socketId || this.state.status !== 'PLAYING' || this.state.lastDiceRoll === null) {
      return false;
    }

    // Apply debt interest at the end of the turn
    if (activePlayer.debt > 0) {
      const interestRate = this.state.globalModifiers.includes('INTEREST_BUFF') ? 0.20 : 0.10;
      const interest = Math.floor(activePlayer.debt * interestRate);
      activePlayer.debt += interest;
      this.state.log.push(`💸 Dette : ${activePlayer.username} accumule ${interest} d'or d'intérêts sur sa dette.`);
    }

    this.checkElimination(activePlayer);

    // Reset last roll
    this.state.lastDiceRoll = null;

    // Advance turn to next non-eliminated player
    this.nextTurn();
    return true;
  }

  private nextTurn() {
    let attempts = 0;
    do {
      this.state.currentPlayerIndex = (this.state.currentPlayerIndex + 1) % this.state.players.length;
      attempts++;
    } while (this.state.players[this.state.currentPlayerIndex].isEliminated && attempts < this.state.players.length);

    const activePlayer = this.state.players[this.state.currentPlayerIndex];
    if (activePlayer.isEliminated) {
      // Everyone is eliminated
      this.state.status = 'FINISHED';
      this.state.log.push('🏁 Fin de la partie. Aucun survivant dans cette arène du chaos.');
    } else {
      this.state.log.push(`C'est au tour de ${activePlayer.username}.`);
    }
  }

  private checkElimination(player: ChaosPlayer) {
    if (player.isEliminated) return;

    if (player.health <= 0 || player.debt >= 2000) {
      player.isEliminated = true;
      this.state.log.push(`💀 ÉLIMINATION : ${player.username} succombe au chaos ! (Santé: ${player.health}, Dette: ${player.debt}). Il devient spectateur et peut modifier le plateau !`);
      
      // Check if only one player remains
      const survivors = this.state.players.filter(p => !p.isEliminated);
      if (survivors.length === 1) {
        this.state.status = 'FINISHED';
        this.state.winner = survivors[0];
        this.state.log.push(`👑 VICTOIRE : ${survivors[0].username} est le dernier survivant et remporte le jeu !`);
      } else if (survivors.length === 0) {
        this.state.status = 'FINISHED';
        this.state.log.push('🏁 Fin de la partie. Aucun survivant.');
      }
    }
  }

  public resetGame(): boolean {
    this.state.status = 'LOBBY';
    this.state.board = INITIAL_BOARD_TYPES.map((type, idx) => ({ index: idx, type }));
    this.state.globalModifiers = [];
    this.state.lastDiceRoll = null;
    this.state.winner = null;
    this.state.players.forEach(p => {
      p.position = 0;
      p.health = 100;
      p.gold = 1000;
      p.power = 10;
      p.debt = 0;
      p.isEliminated = false;
    });
    this.state.log = ['Partie réinitialisée. En attente du départ...'];
    return true;
  }
}
