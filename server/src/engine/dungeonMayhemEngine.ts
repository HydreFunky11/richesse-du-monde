import { CharacterClass, CharacterInfo, MayhemCard, MayhemGameState, MayhemPlayer } from '../types/dungeonMayhem';

export const CHARACTERS: Record<CharacterClass, CharacterInfo> = {
  barbarian: {
    id: 'barbarian',
    name: 'Sutha le Barbare',
    title: 'Le Briseur de Crânes',
    avatar: '👹',
    color: '#EF4444',
    badgeColor: 'bg-red-500/20 text-red-300 border-red-500/30',
    description: 'Une force brute dévastatrice. Inflige des dégâts massifs et pulvérise les boucliers.',
    playstyle: 'Attaque & Dégâts bruts',
  },
  paladin: {
    id: 'paladin',
    name: 'Lia la Paladine',
    title: "L'Éclatante",
    avatar: '🧝‍♀️',
    color: '#F59E0B',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    description: 'Une gardienne de la lumière. Maîtrise les soins divins et dresse des boucliers impénétrables.',
    playstyle: 'Défense & Soins',
  },
  rogue: {
    id: 'rogue',
    name: 'Oriax le Voleur',
    title: 'Le Roublard Futé',
    avatar: '😈',
    color: '#8B5CF6',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    description: 'Vif et insaisissable. Enchaîne les actions, vole des cartes et frappe en traître.',
    playstyle: 'Combos & Vol de cartes',
  },
  wizard: {
    id: 'wizard',
    name: 'Marvon le Magicien',
    title: 'Le Magnifique',
    avatar: '🧙‍♂️',
    color: '#06B6D4',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    description: 'Le maître des sorts chaotiques. Pioche des flots de cartes et lance de redoutables Boules de Feu.',
    playstyle: 'Pioche & Dégâts de zone',
  },
};

export function createDeckForClass(characterClass: CharacterClass): MayhemCard[] {
  let counter = 1;
  const make = (
    name: string,
    opts: Partial<MayhemCard> & { count?: number }
  ): MayhemCard[] => {
    const count = opts.count ?? 1;
    const cards: MayhemCard[] = [];
    for (let i = 0; i < count; i++) {
      cards.push({
        id: `${characterClass}_${counter++}_${Math.random().toString(36).substring(2, 6)}`,
        name,
        characterClass,
        type: opts.type ?? 'action',
        shieldHp: opts.shieldHp,
        currentShieldHp: opts.shieldHp,
        attack: opts.attack ?? 0,
        heal: opts.heal ?? 0,
        draw: opts.draw ?? 0,
        playAgain: opts.playAgain ?? 0,
        specialEffect: opts.specialEffect,
        description: opts.description ?? '',
      });
    }
    return cards;
  };

  if (characterClass === 'barbarian') {
    return [
      ...make('Coup de Hache', { count: 4, attack: 1, description: 'Inflige 1 dégât.' }),
      ...make('Double Tranchant', { count: 4, attack: 2, description: 'Inflige 2 dégâts.' }),
      ...make('Fracas Total', { count: 2, attack: 3, description: 'Inflige 3 dégâts massifs.' }),
      ...make('Hurlement Sauvage', { count: 3, attack: 1, playAgain: 1, description: 'Inflige 1 dégât. Rejouez 1 carte.' }),
      ...make('Hache Tournoyante', { count: 2, attack: 2, playAgain: 1, description: 'Inflige 2 dégâts. Rejouez 1 carte.' }),
      ...make('Fureur Berserk', { count: 2, playAgain: 2, draw: 1, description: 'Piochez 1 carte. Rejouez 2 cartes.' }),
      ...make('Second Souffle', { count: 2, heal: 2, playAgain: 1, description: 'Soignez 2 PV. Rejouez 1 carte.' }),
      ...make('Bouclier à Pointes', { count: 2, type: 'defense', shieldHp: 2, description: 'Bouclier de 2 PV.' }),
      ...make("Peau d'Écorce", { count: 2, type: 'defense', shieldHp: 3, description: 'Bouclier lourd de 3 PV.' }),
      ...make('Grande Hache Enragée', { count: 2, attack: 2, draw: 1, description: 'Inflige 2 dégâts. Piochez 1 carte.' }),
      ...make('Brise-Crâne', { count: 1, specialEffect: 'DESTROY_SHIELD', description: 'Détruit immédiatement un bouclier adverse ciblé.' }),
      ...make('Cri de Guerre Primordial', { count: 2, draw: 2, playAgain: 2, description: 'Piochez 2 cartes. Rejouez 2 cartes.' }),
    ];
  }

  if (characterClass === 'paladin') {
    return [
      ...make('Épée Sacrée', { count: 4, attack: 1, description: 'Inflige 1 dégât.' }),
      ...make('Châtiment Divin', { count: 3, attack: 2, description: 'Inflige 2 dégâts.' }),
      ...make('Lumière Purificatrice', { count: 2, attack: 1, heal: 1, description: 'Inflige 1 dégât. Soignez 1 PV.' }),
      ...make('Imposition des Mains', { count: 3, heal: 2, draw: 1, description: 'Soignez 2 PV. Piochez 1 carte.' }),
      ...make('Grâce Divine', { count: 2, heal: 3, description: 'Soignez 3 PV.' }),
      ...make('Bouclier de Foi', { count: 3, type: 'defense', shieldHp: 2, description: 'Bouclier divin de 2 PV.' }),
      ...make('Forteresse Inébranlable', { count: 2, type: 'defense', shieldHp: 3, description: 'Bouclier sacré de 3 PV.' }),
      ...make('Aura Protectrice', { count: 2, type: 'defense', shieldHp: 1, heal: 1, description: 'Bouclier de 1 PV. Soignez 1 PV.' }),
      ...make('Bénédiction Céleste', { count: 2, draw: 2, playAgain: 1, description: 'Piochez 2 cartes. Rejouez 1 carte.' }),
      ...make('Zèle Sacré', { count: 2, attack: 1, playAgain: 1, description: 'Inflige 1 dégât. Rejouez 1 carte.' }),
      ...make('Châtiment Suprême', { count: 1, attack: 3, heal: 2, description: 'Inflige 3 dégâts et vous soigne de 2 PV.' }),
      ...make('Mur de Lumière', { count: 1, type: 'defense', shieldHp: 3, playAgain: 1, description: 'Bouclier de 3 PV. Rejouez 1 carte.' }),
      ...make('Restauration Totale', { count: 1, specialEffect: 'RESTORE_SHIELDS', heal: 2, description: 'Répare tous vos boucliers au max et soigne 2 PV.' }),
    ];
  }

  if (characterClass === 'rogue') {
    return [
      ...make('Dague Rapide', { count: 4, attack: 1, playAgain: 1, description: 'Inflige 1 dégât. Rejouez 1 carte.' }),
      ...make('Dague Empoisonnée', { count: 3, attack: 1, draw: 1, description: 'Inflige 1 dégât. Piochez 1 carte.' }),
      ...make('Poignard dans le Dos', { count: 3, attack: 2, description: 'Inflige 2 dégâts.' }),
      ...make('Attaque Sournoise', { count: 2, attack: 3, playAgain: 1, description: 'Inflige 3 dégâts. Rejouez 1 carte.' }),
      ...make('Doigts Agiles', { count: 3, draw: 2, playAgain: 1, description: 'Piochez 2 cartes. Rejouez 1 carte.' }),
      ...make('Passe-Passe', { count: 2, playAgain: 2, draw: 1, description: 'Piochez 1 carte. Rejouez 2 cartes.' }),
      ...make('Bombe Fumigène', { count: 2, type: 'defense', shieldHp: 2, description: 'Bouclier furtif de 2 PV.' }),
      ...make("Clone d'Ombre", { count: 2, type: 'defense', shieldHp: 1, playAgain: 1, description: 'Bouclier de 1 PV. Rejouez 1 carte.' }),
      ...make('Armure de Cuir Renforcée', { count: 1, type: 'defense', shieldHp: 3, description: 'Bouclier de 3 PV.' }),
      ...make('Vol à la Tire', { count: 2, specialEffect: 'PICKPOCKET', description: 'Volez 1 carte au hasard dans la main de la cible.' }),
      ...make('Potion de Vitalité', { count: 2, heal: 2, playAgain: 1, description: 'Soignez 2 PV. Rejouez 1 carte.' }),
      ...make('Feinte Mortelle', { count: 2, attack: 2, draw: 2, description: 'Inflige 2 dégâts. Piochez 2 cartes.' }),
    ];
  }

  // wizard
  return [
    ...make('Projectile Magique', { count: 4, attack: 1, playAgain: 1, description: 'Inflige 1 dégât. Rejouez 1 carte.' }),
    ...make("Éclair d'Énergie", { count: 3, attack: 2, description: 'Inflige 2 dégâts arcaniques.' }),
    ...make('Boule de Feu', { count: 2, specialEffect: 'FIREBALL', description: 'Inflige 3 dégâts à TOUS les autres joueurs !' }),
    ...make('Intelligence des Arcanes', { count: 3, draw: 3, description: 'Piochez 3 cartes.' }),
    ...make('Armure du Mage', { count: 2, type: 'defense', shieldHp: 2, description: 'Bouclier magique de 2 PV.' }),
    ...make('Image Miroir', { count: 2, type: 'defense', shieldHp: 1, playAgain: 1, description: 'Bouclier de 1 PV. Rejouez 1 carte.' }),
    ...make('Bouclier Arcanique', { count: 2, type: 'defense', shieldHp: 3, description: 'Bouclier lourd de 3 PV.' }),
    ...make('Canalisation de Mana', { count: 2, playAgain: 2, draw: 1, description: 'Piochez 1 carte. Rejouez 2 cartes.' }),
    ...make('Drain de Vie', { count: 2, attack: 1, heal: 2, description: 'Inflige 1 dégât. Soignez 2 PV.' }),
    ...make('Vortex Arcanique', { count: 2, draw: 2, playAgain: 1, description: 'Piochez 2 cartes. Rejouez 1 carte.' }),
    ...make('Téléportation', { count: 1, specialEffect: 'SWAP_HP', description: 'Échangez vos points de vie avec un joueur ciblé !' }),
    ...make('Vague Déferlante', { count: 1, specialEffect: 'WAVE_OF_FORCE', description: 'Détruit TOUS les boucliers en jeu de tous les joueurs !' }),
    ...make("Nova d'Énergie", { count: 1, attack: 2, playAgain: 2, description: 'Inflige 2 dégâts. Rejouez 2 cartes.' }),
    ...make('Potion Mystique', { count: 1, heal: 2, draw: 1, description: 'Soignez 2 PV. Piochez 1 carte.' }),
  ];
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export class DungeonMayhemEngine {
  private roomCode: string;
  private state: MayhemGameState;
  private playerDecks: Record<string, MayhemCard[]> = {};
  private playerDiscards: Record<string, MayhemCard[]> = {};

  constructor(roomCode: string) {
    this.roomCode = roomCode;
    this.state = {
      status: 'LOBBY',
      players: [],
      currentPlayerIndex: 0,
      playsLeft: 1,
      winner: null,
      log: ['Bienvenue dans Dungeon Mayhem ! Choisissez vos héros.'],
      lastPlayedCard: null,
    };
  }

  public getState(): MayhemGameState {
    return this.state;
  }

  public getPlayers(): MayhemPlayer[] {
    return this.state.players;
  }

  public addPlayer(id: string, username: string, color: string): boolean {
    if (this.state.status !== 'LOBBY' || this.state.players.length >= 4) {
      return false;
    }

    // Auto-select first available character class
    const availableClasses: CharacterClass[] = ['barbarian', 'paladin', 'rogue', 'wizard'];
    const takenClasses = this.state.players.map((p) => p.characterClass);
    const chosenClass = availableClasses.find((c) => !takenClasses.includes(c)) || 'barbarian';

    this.state.players.push({
      id,
      username,
      color,
      characterClass: chosenClass,
      hp: 10,
      maxHp: 10,
      shields: [],
      hand: [],
      deckCount: 28,
      discardCount: 0,
      isEliminated: false,
    });

    this.state.log.push(`${username} a rejoint l'arène avec ${CHARACTERS[chosenClass].name}.`);
    return true;
  }

  public selectCharacter(socketId: string, characterClass: CharacterClass): boolean {
    if (this.state.status !== 'LOBBY') return false;
    const player = this.state.players.find((p) => p.id === socketId);
    if (!player) return false;

    // Check if another player already took this class
    const taken = this.state.players.some((p) => p.id !== socketId && p.characterClass === characterClass);
    if (taken) return false;

    player.characterClass = characterClass;
    this.state.log.push(`${player.username} a choisi ${CHARACTERS[characterClass].name}.`);
    return true;
  }

  public removePlayer(socketId: string) {
    const player = this.state.players.find((p) => p.id === socketId);
    if (!player) return;

    if (this.state.status === 'LOBBY') {
      this.state.players = this.state.players.filter((p) => p.id !== socketId);
      delete this.playerDecks[socketId];
      delete this.playerDiscards[socketId];
      this.state.log.push(`${player.username} a quitté le salon.`);
    } else if (this.state.status === 'PLAYING') {
      player.isEliminated = true;
      player.hp = 0;
      player.shields = [];
      this.state.log.push(`⚠️ ${player.username} s'est déconnecté et a été éliminé.`);
      this.checkEndGame();
      if (this.state.status === 'PLAYING' && this.getCurrentPlayer()?.id === socketId) {
        this.nextTurn();
      }
    }
  }

  public startGame(): boolean {
    if (this.state.players.length < 2 || this.state.status !== 'LOBBY') {
      return false;
    }

    // Initialize decks and starting hands
    this.state.players.forEach((p) => {
      p.hp = 10;
      p.maxHp = 10;
      p.shields = [];
      p.isEliminated = false;

      const fullDeck = shuffleArray(createDeckForClass(p.characterClass));
      this.playerDecks[p.id] = fullDeck;
      this.playerDiscards[p.id] = [];

      // Draw 3 starting cards
      p.hand = this.drawCards(p.id, 3);
      p.deckCount = this.playerDecks[p.id].length;
      p.discardCount = 0;
    });

    this.state.status = 'PLAYING';
    this.state.currentPlayerIndex = Math.floor(Math.random() * this.state.players.length);
    this.state.playsLeft = 1;
    this.state.winner = null;

    const firstPlayer = this.getCurrentPlayer()!;
    this.state.log.push(`⚔️ La bagarre commence ! ${firstPlayer.username} (${CHARACTERS[firstPlayer.characterClass].name}) commence.`);

    // First player draws 1 card at the start of their turn
    this.drawCardsToHand(firstPlayer.id, 1);
    this.checkEmptyHand(firstPlayer.id);

    return true;
  }

  private getCurrentPlayer(): MayhemPlayer | null {
    return this.state.players[this.state.currentPlayerIndex] || null;
  }

  private drawCards(socketId: string, count: number): MayhemCard[] {
    const drawn: MayhemCard[] = [];
    let deck = this.playerDecks[socketId] || [];
    let discard = this.playerDiscards[socketId] || [];

    for (let i = 0; i < count; i++) {
      if (deck.length === 0) {
        if (discard.length === 0) break;
        deck = shuffleArray(discard);
        discard = [];
        this.playerDecks[socketId] = deck;
        this.playerDiscards[socketId] = discard;
      }
      const card = deck.pop();
      if (card) drawn.push(card);
    }

    this.playerDecks[socketId] = deck;
    this.playerDiscards[socketId] = discard;
    return drawn;
  }

  private drawCardsToHand(socketId: string, count: number) {
    const player = this.state.players.find((p) => p.id === socketId);
    if (!player) return;
    const cards = this.drawCards(socketId, count);
    player.hand.push(...cards);
    player.deckCount = (this.playerDecks[socketId] || []).length;
    player.discardCount = (this.playerDiscards[socketId] || []).length;
  }

  private checkEmptyHand(socketId: string) {
    const player = this.state.players.find((p) => p.id === socketId);
    if (!player || player.isEliminated) return;
    if (player.hand.length === 0) {
      this.state.log.push(`✨ Main vide ! ${player.username} pioche immédiatement 2 cartes.`);
      this.drawCardsToHand(socketId, 2);
    }
  }

  public playCard(
    socketId: string,
    cardId: string,
    targetPlayerId?: string,
    targetShieldId?: string
  ): boolean {
    if (this.state.status !== 'PLAYING') return false;
    const current = this.getCurrentPlayer();
    if (!current || current.id !== socketId) return false;
    if (this.state.playsLeft <= 0) return false;

    const cardIndex = current.hand.findIndex((c) => c.id === cardId);
    if (cardIndex === -1) return false;

    const card = current.hand[cardIndex];

    // Validate targeting requirements
    const aliveOpponents = this.state.players.filter((p) => !p.isEliminated && p.id !== current.id);

    // If card has targeted special effect or attack > 0 and needs a target
    if (card.specialEffect === 'PICKPOCKET' || card.specialEffect === 'SWAP_HP') {
      if (!targetPlayerId || !aliveOpponents.some((p) => p.id === targetPlayerId)) {
        return false;
      }
    }

    if (card.specialEffect === 'DESTROY_SHIELD') {
      const allEnemyShields: { playerId: string; shield: MayhemCard }[] = [];
      aliveOpponents.forEach((op) => {
        op.shields.forEach((sh) => allEnemyShields.push({ playerId: op.id, shield: sh }));
      });
      if (allEnemyShields.length > 0 && !targetShieldId) {
        return false;
      }
    }

    if (card.attack > 0) {
      // If there are alive opponents and no target provided, pick target if only 1 opponent, else return false
      if (!targetPlayerId && aliveOpponents.length === 1) {
        targetPlayerId = aliveOpponents[0].id;
      }
      if (!targetPlayerId || !aliveOpponents.some((p) => p.id === targetPlayerId)) {
        return false;
      }
    }

    // Remove card from hand
    current.hand.splice(cardIndex, 1);
    this.state.playsLeft--;
    this.state.lastPlayedCard = { card, playerName: current.username };

    // Resolve card effects
    this.resolveCard(current, card, targetPlayerId, targetShieldId);

    // After resolving, update discard/shield location
    if (card.type === 'defense') {
      current.shields.push({ ...card, currentShieldHp: card.shieldHp || 1 });
      this.state.log.push(`🛡️ ${current.username} pose le bouclier "${card.name}" (${card.shieldHp} PV).`);
    } else {
      this.playerDiscards[current.id] = this.playerDiscards[current.id] || [];
      this.playerDiscards[current.id].push(card);
      current.discardCount = this.playerDiscards[current.id].length;
    }

    // Add extra plays
    if (card.playAgain > 0) {
      this.state.playsLeft += card.playAgain;
      this.state.log.push(`⚡ +${card.playAgain} action(s) supplémentaire(s) pour ${current.username}.`);
    }

    // Draw cards
    if (card.draw > 0) {
      this.drawCardsToHand(current.id, card.draw);
      this.state.log.push(`🃏 ${current.username} pioche ${card.draw} carte(s).`);
    }

    // Check empty hand rule
    this.checkEmptyHand(current.id);

    // Check eliminations and win condition
    this.checkEndGame();

    // If still playing and no plays left, pass turn automatically
    if (this.state.status === 'PLAYING' && this.state.playsLeft <= 0) {
      this.nextTurn();
    }

    return true;
  }

  private resolveCard(
    caster: MayhemPlayer,
    card: MayhemCard,
    targetPlayerId?: string,
    targetShieldId?: string
  ) {
    // 1. Healing
    if (card.heal > 0) {
      const oldHp = caster.hp;
      caster.hp = Math.min(caster.maxHp, caster.hp + card.heal);
      const gained = caster.hp - oldHp;
      this.state.log.push(`❤️ ${caster.username} se soigne de ${gained} PV (${caster.hp}/10).`);
    }

    // 2. Direct attacks
    if (card.attack > 0 && targetPlayerId) {
      const target = this.state.players.find((p) => p.id === targetPlayerId);
      if (target && !target.isEliminated) {
        this.applyAttackDamage(caster, target, card.attack, targetShieldId);
      }
    }

    // 3. Special Effects
    if (card.specialEffect === 'FIREBALL') {
      this.state.log.push(`🔥 ${caster.username} lance une BOULE DE FEU dévastatrice (3 dégâts à TOUS les adversaires) !`);
      const opponents = this.state.players.filter((p) => !p.isEliminated && p.id !== caster.id);
      opponents.forEach((op) => {
        this.applyAttackDamage(caster, op, 3);
      });
    } else if (card.specialEffect === 'SWAP_HP' && targetPlayerId) {
      const target = this.state.players.find((p) => p.id === targetPlayerId);
      if (target && !target.isEliminated) {
        const temp = caster.hp;
        caster.hp = target.hp;
        target.hp = temp;
        this.state.log.push(`🌀 TÉLÉPORTATION ! ${caster.username} échange ses PV avec ${target.username} ! (${caster.username}: ${caster.hp} PV, ${target.username}: ${target.hp} PV)`);
      }
    } else if (card.specialEffect === 'PICKPOCKET' && targetPlayerId) {
      const target = this.state.players.find((p) => p.id === targetPlayerId);
      if (target && target.hand.length > 0) {
        const stolenIdx = Math.floor(Math.random() * target.hand.length);
        const [stolenCard] = target.hand.splice(stolenIdx, 1);
        caster.hand.push(stolenCard);
        this.state.log.push(`🦹 ${caster.username} vole une carte dans la main de ${target.username} avec Vol à la Tire !`);
        this.checkEmptyHand(target.id);
      } else {
        this.state.log.push(`🦹 ${caster.username} tente de faire les poches de ${target?.username}, mais sa main est vide !`);
      }
    } else if (card.specialEffect === 'DESTROY_SHIELD') {
      let destroyed = false;
      this.state.players.forEach((p) => {
        if (p.id !== caster.id && !destroyed) {
          const sIdx = p.shields.findIndex((s) => s.id === targetShieldId);
          if (sIdx !== -1) {
            const sh = p.shields.splice(sIdx, 1)[0];
            this.state.log.push(`💥 ${caster.username} détruit complètement le bouclier "${sh.name}" de ${p.username} !`);
            destroyed = true;
          }
        }
      });
      // If no specific shield given, destroy first available enemy shield
      if (!destroyed) {
        for (const op of this.state.players) {
          if (op.id !== caster.id && op.shields.length > 0) {
            const sh = op.shields.shift()!;
            this.state.log.push(`💥 ${caster.username} détruit le bouclier "${sh.name}" de ${op.username} !`);
            break;
          }
        }
      }
    } else if (card.specialEffect === 'WAVE_OF_FORCE') {
      this.state.log.push(`🌊 VAGUE DÉFERLANTE ! Tous les boucliers de tous les joueurs volent en éclats !`);
      this.state.players.forEach((p) => {
        if (p.shields.length > 0) {
          this.state.log.push(`💥 Les ${p.shields.length} bouclier(s) de ${p.username} sont détruits.`);
          p.shields = [];
        }
      });
    } else if (card.specialEffect === 'RESTORE_SHIELDS') {
      caster.shields.forEach((sh) => {
        sh.currentShieldHp = sh.shieldHp || 1;
      });
      this.state.log.push(`✨ ${caster.username} restaure tous ses boucliers à leur durabilité maximale !`);
    }
  }

  private applyAttackDamage(
    attacker: MayhemPlayer,
    target: MayhemPlayer,
    amount: number,
    preferredShieldId?: string
  ) {
    let damageRemaining = amount;

    // Must hit shields first
    while (damageRemaining > 0 && target.shields.length > 0) {
      // Find shield
      let targetShieldIndex = 0;
      if (preferredShieldId) {
        const found = target.shields.findIndex((s) => s.id === preferredShieldId);
        if (found !== -1) targetShieldIndex = found;
        preferredShieldId = undefined; // only first hit prefers that shield
      }

      const shield = target.shields[targetShieldIndex];
      const shieldHp = shield.currentShieldHp ?? shield.shieldHp ?? 1;

      if (damageRemaining >= shieldHp) {
        damageRemaining -= shieldHp;
        target.shields.splice(targetShieldIndex, 1);
        this.state.log.push(`🛡️ Le bouclier "${shield.name}" de ${target.username} a été détruit par ${attacker.username} !`);
      } else {
        shield.currentShieldHp = shieldHp - damageRemaining;
        this.state.log.push(`🛡️ Le bouclier "${shield.name}" de ${target.username} encaisse ${damageRemaining} dégâts (${shield.currentShieldHp}/${shield.shieldHp} PV restants).`);
        damageRemaining = 0;
      }
    }

    // Remaining damage hits player HP
    if (damageRemaining > 0) {
      target.hp = Math.max(0, target.hp - damageRemaining);
      this.state.log.push(`💥 ${attacker.username} inflige ${damageRemaining} dégât(s) directs à ${target.username} (${target.hp}/10 PV).`);

      if (target.hp <= 0) {
        target.isEliminated = true;
        target.shields = [];
        this.state.log.push(`💀 ${target.username} est éliminé de l'arène !`);
      }
    }
  }

  public endTurn(socketId: string): boolean {
    if (this.state.status !== 'PLAYING') return false;
    const current = this.getCurrentPlayer();
    if (!current || current.id !== socketId) return false;

    this.state.log.push(`${current.username} termine son tour.`);
    this.nextTurn();
    return true;
  }

  private nextTurn() {
    const alivePlayers = this.state.players.filter((p) => !p.isEliminated);
    if (alivePlayers.length <= 1) {
      this.checkEndGame();
      return;
    }

    let nextIndex = (this.state.currentPlayerIndex + 1) % this.state.players.length;
    while (this.state.players[nextIndex].isEliminated) {
      nextIndex = (nextIndex + 1) % this.state.players.length;
    }

    this.state.currentPlayerIndex = nextIndex;
    this.state.playsLeft = 1;

    const nextPlayer = this.getCurrentPlayer()!;
    this.state.log.push(`--- C'est au tour de ${nextPlayer.username} (${CHARACTERS[nextPlayer.characterClass].name}) ---`);

    // Draw 1 card at the start of turn
    this.drawCardsToHand(nextPlayer.id, 1);
    this.checkEmptyHand(nextPlayer.id);
  }

  private checkEndGame() {
    const alivePlayers = this.state.players.filter((p) => !p.isEliminated);
    if (alivePlayers.length === 1) {
      this.state.status = 'FINISHED';
      this.state.winner = alivePlayers[0];
      this.state.log.push(`🏆 VICTOIRE ÉPIQUE ! ${alivePlayers[0].username} (${CHARACTERS[alivePlayers[0].characterClass].name}) remporte la bagarre de Dungeon Mayhem !`);
    } else if (alivePlayers.length === 0) {
      this.state.status = 'FINISHED';
      this.state.winner = null;
      this.state.log.push(`💀 Tous les héros ont péri dans les profondeurs du donjon... Match nul !`);
    }
  }

  public resetGame(): boolean {
    this.state.status = 'LOBBY';
    this.state.playsLeft = 1;
    this.state.winner = null;
    this.state.lastPlayedCard = null;
    this.state.log = ['Partie réinitialisée. Choisissez vos héros !'];

    this.state.players.forEach((p) => {
      p.hp = 10;
      p.shields = [];
      p.hand = [];
      p.isEliminated = false;
      p.deckCount = 28;
      p.discardCount = 0;
    });

    this.playerDecks = {};
    this.playerDiscards = {};
    return true;
  }
}
