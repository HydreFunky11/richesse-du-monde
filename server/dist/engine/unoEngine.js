"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnoEngine = void 0;
const uuid_1 = require("uuid");
function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}
function buildDeck() {
    const colors = ['rouge', 'bleu', 'vert', 'jaune'];
    const cards = [];
    for (const color of colors) {
        // One 0
        cards.push({ id: (0, uuid_1.v4)(), color, type: 'number', value: 0 });
        // Two of 1-9
        for (let v = 1; v <= 9; v++) {
            cards.push({ id: (0, uuid_1.v4)(), color, type: 'number', value: v });
            cards.push({ id: (0, uuid_1.v4)(), color, type: 'number', value: v });
        }
        // Two skip
        cards.push({ id: (0, uuid_1.v4)(), color, type: 'skip' });
        cards.push({ id: (0, uuid_1.v4)(), color, type: 'skip' });
        // Two reverse
        cards.push({ id: (0, uuid_1.v4)(), color, type: 'reverse' });
        cards.push({ id: (0, uuid_1.v4)(), color, type: 'reverse' });
        // Two draw two
        cards.push({ id: (0, uuid_1.v4)(), color, type: 'draw_two' });
        cards.push({ id: (0, uuid_1.v4)(), color, type: 'draw_two' });
    }
    // 4 wild
    for (let i = 0; i < 4; i++) {
        cards.push({ id: (0, uuid_1.v4)(), color: 'special', type: 'wild' });
    }
    // 4 wild draw four
    for (let i = 0; i < 4; i++) {
        cards.push({ id: (0, uuid_1.v4)(), color: 'special', type: 'wild_draw_four' });
    }
    return shuffle(cards);
}
class UnoEngine {
    roomCode;
    deck = [];
    discardPile = [];
    state;
    constructor(roomCode) {
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
    addPlayer(socketId, username, color) {
        if (this.state.status !== 'LOBBY')
            return false;
        if (this.state.players.length >= 10)
            return false;
        if (this.state.players.find(p => p.id === socketId))
            return false;
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
    startGame() {
        if (this.state.players.length < 2)
            return false;
        if (this.state.status !== 'LOBBY')
            return false;
        this.deck = buildDeck();
        this.discardPile = [];
        // Deal 7 cards per player
        for (const player of this.state.players) {
            player.hand = [];
            player.saidUno = false;
            for (let i = 0; i < 7; i++) {
                const card = this.deck.pop();
                if (card)
                    player.hand.push(card);
            }
        }
        // Flip first card - reroll if wild
        let firstCard;
        do {
            firstCard = this.deck.pop();
            if (firstCard && (firstCard.type === 'wild' || firstCard.type === 'wild_draw_four')) {
                this.deck.unshift(firstCard);
                firstCard = undefined;
            }
        } while (!firstCard);
        this.discardPile.push(firstCard);
        this.state.topCard = firstCard;
        this.state.currentColor = firstCard.color;
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
    _applyFirstCardEffect(card) {
        switch (card.type) {
            case 'skip':
                this._advanceTurn();
                this.state.log.push(`⏭️ La première carte est un Skip ! ${this._currentPlayer().username} commence.`);
                break;
            case 'reverse':
                if (this.state.players.length === 2) {
                    this._advanceTurn();
                }
                else {
                    this.state.direction = -1;
                    this.state.log.push(`🔄 La première carte est un Sens Interdit !`);
                }
                break;
            case 'draw_two':
                this.state.mustDraw = 2;
                this.state.log.push(`+2 La première carte est un +2 !`);
                break;
        }
    }
    playCard(socketId, cardId, chosenColor) {
        if (this.state.status !== 'PLAYING')
            return { success: false, error: 'Partie non commencée.' };
        const player = this._currentPlayer();
        if (player.id !== socketId)
            return { success: false, error: 'Ce n\'est pas votre tour.' };
        // If mustDraw > 0 and card isn't a stackable +2, player must draw
        const cardIdx = player.hand.findIndex(c => c.id === cardId);
        if (cardIdx === -1)
            return { success: false, error: 'Carte introuvable dans votre main.' };
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
        }
        else {
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
    _applyCardEffect(card) {
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
                }
                else {
                    this.state.direction = (this.state.direction * -1);
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
    drawCard(socketId) {
        if (this.state.status !== 'PLAYING')
            return { success: false, error: 'Partie non commencée.' };
        const player = this._currentPlayer();
        if (player.id !== socketId)
            return { success: false, error: 'Ce n\'est pas votre tour.' };
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
        }
        else {
            // Draw 1: check if drawable card can be played
            const drawn = player.hand[player.hand.length - 1];
            this.state.log.push(`📦 ${player.username} pioche une carte.`);
            if (drawn && this._isPlayable(drawn)) {
                this.state.log.push(`✅ La carte piochée est jouable, ${player.username} peut la jouer.`);
                // Player can play it - client will decide. We don't auto-play.
                // Just leave it in hand, player can still play. We'll pass turn if they don't.
            }
            else {
                this.state.log.push(`❌ La carte piochée n'est pas jouable. Tour passé.`);
                this._advanceTurn();
                this.state.log.push(`🎯 C'est au tour de ${this._currentPlayer().username}.`);
            }
        }
        this.state.deckCount = this.deck.length;
        return { success: true };
    }
    sayUno(socketId) {
        const player = this.state.players.find(p => p.id === socketId);
        if (!player)
            return false;
        player.saidUno = true;
        this.state.log.push(`🔔 ${player.username} dit UNO !`);
        return true;
    }
    challengeUno(callerId, targetId) {
        const target = this.state.players.find(p => p.id === targetId);
        const caller = this.state.players.find(p => p.id === callerId);
        if (!target || !caller)
            return { success: false, error: 'Joueur introuvable.' };
        if (target.hand.length !== 1) {
            return { success: false, error: `${target.username} n'a pas 1 carte, défi invalide.` };
        }
        if (target.saidUno) {
            this.state.log.push(`✅ ${target.username} avait bien dit UNO ! ${caller.username} est pénalisé de 2 cartes.`);
            // Penalize challenger
            for (let i = 0; i < 2; i++) {
                this._ensureDeck();
                const card = this.deck.pop();
                if (card)
                    caller.hand.push(card);
            }
            return { success: true, penalized: false };
        }
        else {
            this.state.log.push(`⚠️ ${target.username} n'avait pas dit UNO ! Il pioche 2 cartes.`);
            for (let i = 0; i < 2; i++) {
                this._ensureDeck();
                const card = this.deck.pop();
                if (card)
                    target.hand.push(card);
            }
            target.saidUno = false;
            return { success: true, penalized: true };
        }
    }
    resetGame() {
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
    removePlayer(socketId) {
        const idx = this.state.players.findIndex(p => p.id === socketId);
        if (idx === -1)
            return;
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
        }
        else {
            this.state.log.push(`👋 ${username} a quitté le salon.`);
        }
    }
    getState() {
        return this.state;
    }
    getPlayers() {
        return this.state.players;
    }
    _currentPlayer() {
        return this.state.players[this.state.currentPlayerIndex];
    }
    _advanceTurn() {
        const n = this.state.players.length;
        if (n === 0)
            return;
        this.state.currentPlayerIndex = ((this.state.currentPlayerIndex + this.state.direction) % n + n) % n;
    }
    _isPlayable(card) {
        const top = this.state.topCard;
        if (!top)
            return true;
        if (card.type === 'wild' || card.type === 'wild_draw_four')
            return true;
        if (card.color === this.state.currentColor)
            return true;
        if (card.type === top.type)
            return true;
        if (card.type === 'number' && top.type === 'number' && card.value === top.value)
            return true;
        return false;
    }
    _ensureDeck() {
        if (this.deck.length > 0)
            return;
        // Shuffle discard pile back (keep top card)
        if (this.discardPile.length <= 1)
            return;
        const top = this.discardPile.pop();
        this.deck = shuffle(this.discardPile);
        this.discardPile = [top];
        this.state.log.push(`🔀 Pioche vide, la défausse a été mélangée.`);
    }
    _cardLabel(card) {
        const colorMap = {
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
exports.UnoEngine = UnoEngine;
