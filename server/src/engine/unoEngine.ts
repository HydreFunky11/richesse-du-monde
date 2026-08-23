import { v4 as uuidv4 } from 'uuid';
import type { UnoCard, UnoColor, UnoCardType, UnoPlayer, UnoGameState } from '../types/uno';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildDeck(): UnoCard[] {
  const colors: UnoColor[] = ['rouge', 'bleu', 'vert', 'jaune'];
  const cards: UnoCard[] = [];

  for (const color of colors) {
    // One 0
    cards.push({ id: uuidv4(), color, type: 'number', value: 0 });
    // Two of 1-9
    for (let v = 1; v <= 9; v++) {
      cards.push({ id: uuidv4(), color, type: 'number', value: v });
      cards.push({ id: uuidv4(), color, type: 'number', value: v });
    }
    // Two skip
    cards.push({ id: uuidv4(), color, type: 'skip' });
    cards.push({ id: uuidv4(), color, type: 'skip' });
    // Two reverse
    cards.push({ id: uuidv4(), color, type: 'reverse' });
    cards.push({ id: uuidv4(), color, type: 'reverse' });
    // Two draw two
    cards.push({ id: uuidv4(), color, type: 'draw_two' });
    cards.push({ id: uuidv4(), color, type: 'draw_two' });
  }

  // 4 wild
  for (let i = 0; i < 4; i++) {
    cards.push({ id: uuidv4(), color: 'special', type: 'wild' });
  }
  // 4 wild draw four
  for (let i = 0; i < 4; i++) {
    cards.push({ id: uuidv4(), color: 'special', type: 'wild_draw_four' });
  }

  return shuffle(cards);
}

export class UnoEngine {
  private roomCode: string;
  private deck: UnoCard[] = [];
  private discardPile: UnoCard[] = [];
  private state: UnoGameState;

  constructor(roomCode: string) {
    this.roomCode = roomCode;
    this.state = {
      status: 'LOBBY',
      players: [],
      currentPlayerIndex: 0,
      direction: 1,
      topCard: null,
      currentColor: 'rouge',
      drawStack: 0,
      mustDraw: 0,
      winner: null,
      log: [`🎴 Salon UNO ${roomCode} créé. En attente de joueurs...`],
      deckCount: 0,
    };
  }

  addPlayer(socketId: string, username: string, color: string): boolean {
    if (this.state.status !== 'LOBBY') return false;
    if (this.state.players.length >= 10) return false;
    if (this.state.players.find(p => p.id === socketId)) return false;

    this.state.players.push({
      id: socketId,
      username,
      color,
      hand: [],
      saidUno: false,
    });
    this.state.log.push(`👤 ${username} a rejoint le salon.`);
    return true;
  }

  startGame(): boolean {
    if (this.state.players.length < 2) return false;
    if (this.state.status !== 'LOBBY') return false;

    this.deck = buildDeck();
    this.discardPile = [];

    // Deal 7 cards per player
    for (const player of this.state.players) {
      player.hand = [];
      player.saidUno = false;
      for (let i = 0; i < 7; i++) {
        const card = this.deck.pop();
        if (card) player.hand.push(card);
      }
    }

    // Flip first card - reroll if wild
    let firstCard: UnoCard | undefined;
    do {
      firstCard = this.deck.pop();
      if (firstCard && (firstCard.type === 'wild' || firstCard.type === 'wild_draw_four')) {
        this.deck.unshift(firstCard);
        firstCard = undefined;
      }
    } while (!firstCard);

    this.discardPile.push(firstCard);
    this.state.topCard = firstCard;
    this.state.currentColor = firstCard.color as UnoColor;
    this.state.currentPlayerIndex = 0;
    this.state.direction = 1;
    this.state.drawStack = 0;
    this.state.mustDraw = 0;
    this.state.winner = null;
    this.state.status = 'PLAYING';
    this.state.deckCount = this.deck.length;

    // Apply effect of first card
    this._applyFirstCardEffect(firstCard);

    this.state.log.push(`🎮 La partie commence ! Première carte : ${this._cardLabel(firstCard)}.`);
    this.state.log.push(`🎯 C'est au tour de ${this._currentPlayer().username}.`);

    return true;
  }

  private _applyFirstCardEffect(card: UnoCard): void {
    switch (card.type) {
      case 'skip':
        this._advanceTurn();
        this.state.log.push(`⏭️ La première carte est un Skip ! ${this._currentPlayer().username} commence.`);
        break;
      case 'reverse':
        if (this.state.players.length === 2) {
          this._advanceTurn();
        } else {
          this.state.direction = -1 as -1;
          this.state.log.push(`🔄 La première carte est un Sens Interdit !`);
        }
        break;
      case 'draw_two':
        this.state.mustDraw = 2;
        this.state.log.push(`+2 La première carte est un +2 !`);
        break;
    }
  }

  playCard(socketId: string, cardId: string, chosenColor?: UnoColor): { success: boolean; error?: string } {
    if (this.state.status !== 'PLAYING') return { success: false, error: 'Partie non commencée.' };
    const player = this._currentPlayer();
    if (player.id !== socketId) return { success: false, error: 'Ce n\'est pas votre tour.' };

    // If mustDraw > 0 and card isn't a stackable +2, player must draw
    const cardIdx = player.hand.findIndex(c => c.id === cardId);
    if (cardIdx === -1) return { success: false, error: 'Carte introuvable dans votre main.' };
    const card = player.hand[cardIdx];

    if (this.state.mustDraw > 0) {
      // Can only play draw_two on draw_two stack
      if (card.type !== 'draw_two') {
        return { success: false, error: `Vous devez piocher ${this.state.mustDraw} cartes.` };
      }
    }

    // Validate card is playable
    if (!this._isPlayable(card)) {
      return { success: false, error: 'Cette carte n\'est pas jouable.' };
    }

    // Remove from hand
    player.hand.splice(cardIdx, 1);
    player.saidUno = false; // reset - will be set by sayUno

    // Put on discard
    this.discardPile.push(card);
    this.state.topCard = card;

    // Set color
    if (card.type === 'wild' || card.type === 'wild_draw_four') {
      this.state.currentColor = chosenColor && chosenColor !== 'special' ? chosenColor : 'rouge';
    } else {
      this.state.currentColor = card.color;
    }

    this.state.log.push(`🃏 ${player.username} joue ${this._cardLabel(card)}${(card.type === 'wild' || card.type === 'wild_draw_four') ? ` (→ ${this.state.currentColor})` : ''}.`);

    // Check UNO
    if (player.hand.length === 1 && !player.saidUno) {
      this.state.log.push(`⚠️ ${player.username} a 1 carte et n'a pas dit UNO !`);
    }

    // Check win
    if (player.hand.length === 0) {
      this.state.status = 'FINISHED';
      this.state.winner = player;
      this.state.log.push(`🏆 ${player.username} a gagné la partie !`);
      this.state.deckCount = this.deck.length;
      return { success: true };
    }

    // Apply card effect
    this._applyCardEffect(card);

    this.state.deckCount = this.deck.length;
    return { success: true };
  }

  private _applyCardEffect(card: UnoCard): void {
    const n = this.state.players.length;
    switch (card.type) {
      case 'skip':
        this._advanceTurn(); // skip next
        this._advanceTurn();
        this.state.log.push(`⏭️ ${this._currentPlayer().username} passe son tour (Skip).`);
        break;
      case 'reverse':
        if (n === 2) {
          // acts like skip
          this._advanceTurn();
          this._advanceTurn();
          this.state.log.push(`⏭️ ${this._currentPlayer().username} passe son tour (Reverse = Skip à 2 joueurs).`);
        } else {
          this.state.direction = (this.state.direction * -1) as 1 | -1;
          this._advanceTurn();
          this.state.log.push(`🔄 Direction inversée. C'est au tour de ${this._currentPlayer().username}.`);
        }
        break;
      case 'draw_two':
        this.state.mustDraw += 2;
        this._advanceTurn();
        this.state.log.push(`+2 ${this._currentPlayer().username} doit piocher ${this.state.mustDraw} cartes.`);
        break;
      case 'wild':
        this._advanceTurn();
        this.state.log.push(`🌈 Wild joué. C'est au tour de ${this._currentPlayer().username}.`);
        break;
      case 'wild_draw_four':
        this.state.mustDraw += 4;
        this._advanceTurn();
        this.state.log.push(`💥 Wild +4 ! ${this._currentPlayer().username} doit piocher ${this.state.mustDraw} cartes.`);
        break;
      default:
        this._advanceTurn();
        this.state.log.push(`🎯 C'est au tour de ${this._currentPlayer().username}.`);
        break;
    }
  }

  drawCard(socketId: string): { success: boolean; error?: string } {
    if (this.state.status !== 'PLAYING') return { success: false, error: 'Partie non commencée.' };
    const player = this._currentPlayer();
    if (player.id !== socketId) return { success: false, error: 'Ce n\'est pas votre tour.' };

    const drawCount = this.state.mustDraw > 0 ? this.state.mustDraw : 1;
    this.state.mustDraw = 0;

    for (let i = 0; i < drawCount; i++) {
      this._ensureDeck();
      const card = this.deck.pop();
      if (card) {
        player.hand.push(card);
      }
    }

    player.saidUno = false;

    if (drawCount > 1) {
      this.state.log.push(`📦 ${player.username} pioche ${drawCount} cartes.`);
      // After forced draw, skip to next player
      this._advanceTurn();
      this.state.log.push(`🎯 C'est au tour de ${this._currentPlayer().username}.`);
    } else {
      // Draw 1: check if drawable card can be played
      const drawn = player.hand[player.hand.length - 1];
      this.state.log.push(`📦 ${player.username} pioche une carte.`);
      if (drawn && this._isPlayable(drawn)) {
        this.state.log.push(`✅ La carte piochée est jouable, ${player.username} peut la jouer.`);
        // Player can play it - client will decide. We don't auto-play.
        // Just leave it in hand, player can still play. We'll pass turn if they don't.
      } else {
        this.state.log.push(`❌ La carte piochée n'est pas jouable. Tour passé.`);
        this._advanceTurn();
        this.state.log.push(`🎯 C'est au tour de ${this._currentPlayer().username}.`);
      }
    }

    this.state.deckCount = this.deck.length;
    return { success: true };
  }

  sayUno(socketId: string): boolean {
    const player = this.state.players.find(p => p.id === socketId);
    if (!player) return false;
    player.saidUno = true;
    this.state.log.push(`🔔 ${player.username} dit UNO !`);
    return true;
  }

  challengeUno(callerId: string, targetId: string): { success: boolean; penalized?: boolean; error?: string } {
    const target = this.state.players.find(p => p.id === targetId);
    const caller = this.state.players.find(p => p.id === callerId);
    if (!target || !caller) return { success: false, error: 'Joueur introuvable.' };

    if (target.hand.length !== 1) {
      return { success: false, error: `${target.username} n'a pas 1 carte, défi invalide.` };
    }

    if (target.saidUno) {
      this.state.log.push(`✅ ${target.username} avait bien dit UNO ! ${caller.username} est pénalisé de 2 cartes.`);
      // Penalize challenger
      for (let i = 0; i < 2; i++) {
        this._ensureDeck();
        const card = this.deck.pop();
        if (card) caller.hand.push(card);
      }
      return { success: true, penalized: false };
    } else {
      this.state.log.push(`⚠️ ${target.username} n'avait pas dit UNO ! Il pioche 2 cartes.`);
      for (let i = 0; i < 2; i++) {
        this._ensureDeck();
        const card = this.deck.pop();
        if (card) target.hand.push(card);
      }
      target.saidUno = false;
      return { success: true, penalized: true };
    }
  }

  resetGame(): boolean {
    this.state.status = 'LOBBY';
    this.state.players.forEach(p => { p.hand = []; p.saidUno = false; });
    this.state.topCard = null;
    this.state.currentPlayerIndex = 0;
    this.state.direction = 1;
    this.state.drawStack = 0;
    this.state.mustDraw = 0;
    this.state.winner = null;
    this.state.currentColor = 'rouge';
    this.state.log = ['🔄 Partie réinitialisée. En attente du démarrage...'];
    this.deck = [];
    this.discardPile = [];
    this.state.deckCount = 0;
    return true;
  }

  removePlayer(socketId: string): void {
    const idx = this.state.players.findIndex(p => p.id === socketId);
    if (idx === -1) return;
    const username = this.state.players[idx].username;
    this.state.players.splice(idx, 1);

    if (this.state.status === 'PLAYING') {
      // Adjust current player index if needed
      if (this.state.currentPlayerIndex >= this.state.players.length) {
        this.state.currentPlayerIndex = 0;
      }
      this.state.log.push(`⚠️ ${username} s'est déconnecté.`);

      if (this.state.players.length < 2) {
        this.state.status = 'FINISHED';
        this.state.winner = this.state.players[0] ?? null;
        this.state.log.push(`🏆 Partie terminée par manque de joueurs.`);
      }
    } else {
      this.state.log.push(`👋 ${username} a quitté le salon.`);
    }
  }

  getState(): UnoGameState {
    return this.state;
  }

  getPlayers(): UnoPlayer[] {
    return this.state.players;
  }

  private _currentPlayer(): UnoPlayer {
    return this.state.players[this.state.currentPlayerIndex];
  }

  private _advanceTurn(): void {
    const n = this.state.players.length;
    if (n === 0) return;
    this.state.currentPlayerIndex = ((this.state.currentPlayerIndex + this.state.direction) % n + n) % n;
  }

  private _isPlayable(card: UnoCard): boolean {
    const top = this.state.topCard;
    if (!top) return true;
    if (card.type === 'wild' || card.type === 'wild_draw_four') return true;
    if (card.color === this.state.currentColor) return true;
    if (card.type === top.type) return true;
    if (card.type === 'number' && top.type === 'number' && card.value === top.value) return true;
    return false;
  }

  private _ensureDeck(): void {
    if (this.deck.length > 0) return;
    // Shuffle discard pile back (keep top card)
    if (this.discardPile.length <= 1) return;
    const top = this.discardPile.pop()!;
    this.deck = shuffle(this.discardPile);
    this.discardPile = [top];
    this.state.log.push(`🔀 Pioche vide, la défausse a été mélangée.`);
  }

  private _cardLabel(card: UnoCard): string {
    const colorMap: Record<UnoColor, string> = {
      rouge: '🔴',
      bleu: '🔵',
      vert: '🟢',
      jaune: '🟡',
      special: '🌈',
    };
    const col = colorMap[card.color] ?? '';
    switch (card.type) {
      case 'number': return `${col} ${card.value}`;
      case 'skip': return `${col} Skip`;
      case 'reverse': return `${col} Reverse`;
      case 'draw_two': return `${col} +2`;
      case 'wild': return `🌈 Wild`;
      case 'wild_draw_four': return `🌈 Wild +4`;
      default: return 'Carte';
    }
  }
}
