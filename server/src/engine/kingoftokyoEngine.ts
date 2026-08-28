import { KotGameState, KotPlayer, KotCard } from '../types/kingoftokyo';

const MONSTERS = [
  'Giga-Gros-Chien 🐶',
  'Miaou-Zilla 🐱',
  'Pigeon-Garou 🐦',
  'Konga-Giga 🦍',
  'Mega-Lapin 🐰',
  'Cyber-Rat 🐭'
];

const CARDS_POOL: KotCard[] = [
  { id: 'card_acid', name: "Jet d'Acide 🧪", cost: 4, effect: 'keep', description: "Vos attaques infligent +1 dégât." },
  { id: 'card_regen', name: "Régénération Rapide 🧬", cost: 3, effect: 'keep', description: "Vous gagnez +1 PV à chaque fois que vous vous soignez." },
  { id: 'card_feet', name: "Grands Pieds 🐾", cost: 5, effect: 'keep', description: "Vous gagnez +1 point de victoire au début de votre tour." },
  { id: 'card_death', name: "Rayon de la Mort ⚡", cost: 4, effect: 'discard', description: "Infligez 2 dégâts à tous les autres monstres immédiatement." },
  { id: 'card_drink', name: "Boisson Énergisante 🥤", cost: 3, effect: 'discard', description: "Gagnez 3 PV et 2 énergies immédiatement." },
  { id: 'card_armor', name: "Super Blindage 🛡️", cost: 5, effect: 'keep', description: "Vous subissez 1 dégât de moins lorsque vous êtes attaqué." },
  { id: 'card_bolt', name: "Éclair d'Énergie ✴️", cost: 3, effect: 'discard', description: "Gagnez +4 points de victoire immédiatement." }
];

export class KingOfTokyoEngine {
  private roomCode: string;
  private state: KotGameState;

  constructor(roomCode: string) {
    this.roomCode = roomCode;
    this.state = {
      status: 'LOBBY',
      players: [],
      currentPlayerIndex: 0,
      tokyoMonsterId: null,
      dice: ["1", "2", "3", "ATTACK", "HEAL", "ENERGY"],
      diceKept: [false, false, false, false, false, false],
      rollCount: 0,
      store: [],
      log: ['Salon de jeu créé. En attente des monstres...'],
      winner: null,
      pendingYieldRequest: null
    };
  }

  public getPlayers(): KotPlayer[] {
    return this.state.players;
  }

  public getState(): KotGameState {
    return this.state;
  }

  public addPlayer(id: string, username: string, color: string): boolean {
    if (this.state.status !== 'LOBBY' || this.state.players.length >= 6) {
      return false;
    }

    const monsterName = MONSTERS[this.state.players.length] || 'Monstre Inconnu 👾';

    this.state.players.push({
      id,
      username,
      color,
      monsterName,
      hp: 10,
      vp: 0,
      energy: 0,
      cards: [],
      isDead: false
    });

    this.state.log.push(`${username} a rejoint en tant que ${monsterName}.`);
    return true;
  }

  public removePlayer(socketId: string) {
    this.state.players = this.state.players.filter(p => p.id !== socketId);
    if (this.state.status !== 'LOBBY') {
      this.state.log.push(`⚠️ Un joueur s'est déconnecté. Partie réinitialisée.`);
      this.resetGame();
    }
  }

  public startGame(): boolean {
    if (this.state.players.length < 2 || this.state.status !== 'LOBBY') {
      return false;
    }

    this.state.players.forEach(p => {
      p.hp = 10;
      p.vp = 0;
      p.energy = 0;
      p.cards = [];
      p.isDead = false;
    });

    this.state.currentPlayerIndex = Math.floor(Math.random() * this.state.players.length);
    this.state.tokyoMonsterId = null;
    this.state.rollCount = 0;
    this.state.dice = ["1", "2", "3", "ATTACK", "HEAL", "ENERGY"];
    this.state.diceKept = [false, false, false, false, false, false];
    this.state.status = 'PLAYING';
    this.state.winner = null;
    this.state.pendingYieldRequest = null;

    // Shuffle store
    this.refreshStore();

    const activePlayer = this.state.players[this.state.currentPlayerIndex];
    this.state.log.push(`🔥 La bataille de Tokyo commence ! C'est au tour de ${activePlayer.username} (${activePlayer.monsterName}).`);

    return true;
  }

  private refreshStore() {
    const shuffled = [...CARDS_POOL].sort(() => Math.random() - 0.5);
    this.state.store = shuffled.slice(0, 3);
  }

  public toggleKeep(socketId: string, index: number): boolean {
    if (this.state.status !== 'PLAYING' || this.state.rollCount === 0 || this.state.rollCount >= 3) return false;

    const activePlayer = this.state.players[this.state.currentPlayerIndex];
    if (activePlayer.id !== socketId) return false;

    this.state.diceKept[index] = !this.state.diceKept[index];
    return true;
  }

  public rollDice(socketId: string): boolean {
    if (this.state.status !== 'PLAYING' || this.state.rollCount >= 3) return false;

    const activePlayer = this.state.players[this.state.currentPlayerIndex];
    if (activePlayer.id !== socketId) return false;

    const faces = ["1", "2", "3", "ATTACK", "HEAL", "ENERGY"];

    for (let i = 0; i < 6; i++) {
      if (!this.state.diceKept[i]) {
        this.state.dice[i] = faces[Math.floor(Math.random() * faces.length)];
      }
    }

    this.state.rollCount++;
    this.state.log.push(`${activePlayer.username} lance les dés (Lancer ${this.state.rollCount}/3) : [${this.state.dice.join(', ')}]`);

    return true;
  }

  public resolveDice(socketId: string): boolean {
    if (this.state.status !== 'PLAYING' || this.state.rollCount === 0) return false;

    const activePlayer = this.state.players[this.state.currentPlayerIndex];
    if (activePlayer.id !== socketId) return false;

    const dice = this.state.dice;

    // 1. Energy
    let energyCount = dice.filter(d => d === 'ENERGY').length;
    if (energyCount > 0) {
      activePlayer.energy += energyCount;
      this.state.log.push(`🔋 ${activePlayer.username} gagne +${energyCount} énergies.`);
    }

    // 2. Hearts (Heal)
    let healCount = dice.filter(d => d === 'HEAL').length;
    if (healCount > 0) {
      if (this.state.tokyoMonsterId === activePlayer.id) {
        this.state.log.push(`❌ ${activePlayer.username} ne peut pas se soigner car il est dans Tokyo.`);
      } else {
        const initialHp = activePlayer.hp;
        let bonus = activePlayer.cards.some(c => c.id === 'card_regen') ? 1 : 0;
        activePlayer.hp = Math.min(10, activePlayer.hp + healCount + (bonus * healCount));
        this.state.log.push(`❤️ ${activePlayer.username} se soigne de ${activePlayer.hp - initialHp} PV.`);
      }
    }

    // 3. Victory Points (1, 2, 3)
    ['1', '2', '3'].forEach(num => {
      const count = dice.filter(d => d === num).length;
      if (count >= 3) {
        const points = parseInt(num) + (count - 3);
        activePlayer.vp += points;
        this.state.log.push(`⭐ ${activePlayer.username} marque +${points} points de victoire avec les dés [${num}].`);
      }
    });

    // 4. Attacks (Claw)
    let attackCount = dice.filter(d => d === 'ATTACK').length;
    if (attackCount > 0) {
      // Acid Jet Card (+1 attack damage)
      if (activePlayer.cards.some(c => c.id === 'card_acid')) {
        attackCount++;
      }

      if (this.state.tokyoMonsterId === activePlayer.id) {
        // Attack everyone else
        this.state.log.push(`💥 ${activePlayer.username} griffe depuis Tokyo !`);
        this.state.players.forEach(p => {
          if (p.id !== activePlayer.id && !p.isDead) {
            let dmg = attackCount;
            if (p.cards.some(c => c.id === 'card_armor')) {
              dmg = Math.max(0, dmg - 1);
            }
            p.hp = Math.max(0, p.hp - dmg);
            this.state.log.push(`💥 ${p.username} subit ${dmg} dégâts.`);
            if (p.hp <= 0) {
              p.isDead = true;
              this.state.log.push(`💀 ${p.username} a été éliminé !`);
            }
          }
        });
      } else {
        // Active player is outside. Attack the monster in Tokyo.
        if (this.state.tokyoMonsterId === null) {
          // Tokyo is empty, player enters Tokyo
          this.enterTokyo(activePlayer);
        } else {
          const tokyoMonster = this.state.players.find(p => p.id === this.state.tokyoMonsterId);
          if (tokyoMonster && !tokyoMonster.isDead) {
            let dmg = attackCount;
            if (tokyoMonster.cards.some(c => c.id === 'card_armor')) {
              dmg = Math.max(0, dmg - 1);
            }
            tokyoMonster.hp = Math.max(0, tokyoMonster.hp - dmg);
            this.state.log.push(`💥 ${activePlayer.username} attaque Tokyo ! ${tokyoMonster.username} subit ${dmg} dégâts.`);

            if (tokyoMonster.hp <= 0) {
              tokyoMonster.isDead = true;
              this.state.log.push(`💀 ${tokyoMonster.username} a été éliminé !`);
              this.state.tokyoMonsterId = null;
              this.enterTokyo(activePlayer);
            } else {
              // Trigger yield request
              this.state.status = 'RESOLVING_ATTACK';
              this.state.pendingYieldRequest = {
                tokyoMonsterId: tokyoMonster.id,
                attackerId: activePlayer.id,
                damage: dmg
              };
              this.state.log.push(`❓ ${tokyoMonster.username}, voulez-vous fuir Tokyo ?`);
              return true;
            }
          } else {
            this.enterTokyo(activePlayer);
          }
        }
      }
    } else {
      // No attacks. If Tokyo is empty, current player must enter Tokyo
      if (this.state.tokyoMonsterId === null) {
        this.enterTokyo(activePlayer);
      }
    }

    this.checkWinConditions();
    return true;
  }

  private enterTokyo(player: KotPlayer) {
    this.state.tokyoMonsterId = player.id;
    player.vp += 1;
    this.state.log.push(`👑 ${player.username} entre dans Tokyo et gagne +1 point de victoire !`);
  }

  public respondYield(socketId: string, yieldTokyo: boolean): boolean {
    if (this.state.status !== 'RESOLVING_ATTACK' || !this.state.pendingYieldRequest) return false;
    if (this.state.pendingYieldRequest.tokyoMonsterId !== socketId) return false;

    const req = this.state.pendingYieldRequest;
    const defender = this.state.players.find(p => p.id === req.tokyoMonsterId)!;
    const attacker = this.state.players.find(p => p.id === req.attackerId)!;

    if (yieldTokyo) {
      this.state.log.push(`🏃 ${defender.username} fuit Tokyo.`);
      this.state.tokyoMonsterId = null;
      this.enterTokyo(attacker);
    } else {
      this.state.log.push(`🛡️ ${defender.username} choisit de rester dans Tokyo.`);
    }

    this.state.status = 'PLAYING';
    this.state.pendingYieldRequest = null;

    this.checkWinConditions();
    return true;
  }

  public buyCard(socketId: string, cardId: string): boolean {
    if (this.state.status !== 'PLAYING') return false;

    const activePlayer = this.state.players[this.state.currentPlayerIndex];
    if (activePlayer.id !== socketId) return false;

    const cardIndex = this.state.store.findIndex(c => c.id === cardId);
    if (cardIndex === -1) return false;

    const card = this.state.store[cardIndex];
    if (activePlayer.energy < card.cost) return false;

    activePlayer.energy -= card.cost;
    this.state.store.splice(cardIndex, 1);

    this.state.log.push(`🛒 ${activePlayer.username} achète la carte [${card.name}] pour ${card.cost} énergies.`);

    // Apply immediate discard cards
    if (card.effect === 'discard') {
      if (card.id === 'card_death') {
        this.state.players.forEach(p => {
          if (p.id !== activePlayer.id && !p.isDead) {
            p.hp = Math.max(0, p.hp - 2);
            if (p.hp <= 0) {
              p.isDead = true;
              this.state.log.push(`💀 ${p.username} a été éliminé !`);
            }
          }
        });
      } else if (card.id === 'card_drink') {
        activePlayer.hp = Math.min(10, activePlayer.hp + 3);
        activePlayer.energy += 2;
      } else if (card.id === 'card_bolt') {
        activePlayer.vp += 4;
      }
    } else {
      activePlayer.cards.push(card);
    }

    // Refresh store item
    const remainingPool = CARDS_POOL.filter(c => 
      !this.state.store.some(sc => sc.id === c.id) &&
      !this.state.players.some(p => p.cards.some(pc => pc.id === c.id))
    );
    if (remainingPool.length > 0) {
      const nextCard = remainingPool[Math.floor(Math.random() * remainingPool.length)];
      this.state.store.push(nextCard);
    }

    this.checkWinConditions();
    return true;
  }

  public endTurn(socketId: string): boolean {
    if (this.state.status !== 'PLAYING') return false;

    const activePlayer = this.state.players[this.state.currentPlayerIndex];
    if (activePlayer.id !== socketId) return false;

    // Reset roll counter
    this.state.rollCount = 0;
    this.state.diceKept = [false, false, false, false, false, false];

    // Find next alive player
    let nextIdx = (this.state.currentPlayerIndex + 1) % this.state.players.length;
    while (this.state.players[nextIdx].isDead) {
      nextIdx = (nextIdx + 1) % this.state.players.length;
    }

    this.state.currentPlayerIndex = nextIdx;
    const nextPlayer = this.state.players[this.state.currentPlayerIndex];

    // Apply start turn points if in Tokyo
    if (this.state.tokyoMonsterId === nextPlayer.id) {
      nextPlayer.vp += 2;
      this.state.log.push(`👑 ${nextPlayer.username} commence son tour dans Tokyo et gagne +2 points de victoire !`);
    }

    // Apply Grand Pieds card bonus (+1 VP at start of turn)
    if (nextPlayer.cards.some(c => c.id === 'card_feet')) {
      nextPlayer.vp += 1;
      this.state.log.push(`🐾 Le bonus [Grands Pieds] donne +1 point de victoire à ${nextPlayer.username}.`);
    }

    this.state.log.push(`➔ C'est au tour de ${nextPlayer.username} (${nextPlayer.monsterName}).`);

    this.checkWinConditions();
    return true;
  }

  private checkWinConditions() {
    // 1. Victory Points (20 VP)
    const vpWinner = this.state.players.find(p => p.vp >= 20 && !p.isDead);
    if (vpWinner) {
      this.declareWinner(vpWinner, `${vpWinner.username} a atteint 20 points de victoire !`);
      return;
    }

    // 2. Last standing monster
    const alivePlayers = this.state.players.filter(p => !p.isDead);
    if (alivePlayers.length === 1) {
      this.declareWinner(alivePlayers[0], `${alivePlayers[0].username} est le dernier monstre encore debout !`);
    }
  }

  private declareWinner(player: KotPlayer, reason: string) {
    this.state.winner = player;
    this.state.status = 'FINISHED';
    this.state.log.push(`🏆 VICTOIRE : ${player.username} l'emporte ! Rationale: ${reason}`);
  }

  public resetGame() {
    this.state.status = 'LOBBY';
    this.state.players.forEach(p => {
      p.hp = 10;
      p.vp = 0;
      p.energy = 0;
      p.cards = [];
      p.isDead = false;
    });
    this.state.tokyoMonsterId = null;
    this.state.rollCount = 0;
    this.state.winner = null;
    this.state.pendingYieldRequest = null;
    this.state.log = ['Bataille réinitialisée. En attente de départ...'];
  }
}
