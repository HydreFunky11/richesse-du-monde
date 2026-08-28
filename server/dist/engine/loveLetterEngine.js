"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoveLetterEngine = void 0;
const uuid_1 = require("uuid");
const CARD_TEMPLATES = [
    { type: 'GARDE', value: 1, name: 'Garde', description: 'Devinez la carte en main d\'un autre joueur. S\'il s\'agit de cette carte, il est éliminé.', count: 5 },
    { type: 'PRETRE', value: 2, name: 'Prêtre', description: 'Regardez la main d\'un autre joueur en privé.', count: 2 },
    { type: 'BARON', value: 3, name: 'Baron', description: 'Comparez votre carte avec celle d\'un autre joueur. La plus petite valeur est éliminée.', count: 2 },
    { type: 'SERVANTE', value: 4, name: 'Servante', description: 'Protège contre tous les effets jusqu\'à votre prochain tour.', count: 2 },
    { type: 'PRINCE', value: 5, name: 'Prince', description: 'Force n\'importe quel joueur (y compris vous-même) à défausser sa carte et en piocher une nouvelle.', count: 2 },
    { type: 'ROI', value: 6, name: 'Roi', description: 'Échangez votre carte avec un autre joueur.', count: 1 },
    { type: 'COMTESSE', value: 7, name: 'Comtesse', description: 'Doit être défaussée si vous avez également un Prince ou un Roi en main.', count: 1 },
    { type: 'PRINCESSE', value: 8, name: 'Princesse', description: 'Si vous défaussez cette carte, vous êtes immédiatement éliminé.', count: 1 }
];
class LoveLetterEngine {
    roomCode;
    state;
    constructor(roomCode) {
        this.roomCode = roomCode;
        this.state = {
            status: 'LOBBY',
            players: [],
            currentPlayerIndex: 0,
            deck: [],
            burnCards: [],
            discardedTopCard: null,
            winner: null,
            roundWinner: null,
            targetSelectionNeeded: null,
            log: ['Salon de jeu créé. En attente des joueurs...'],
            deckCount: 0
        };
    }
    getPlayers() {
        return this.state.players;
    }
    getState() {
        return this.state;
    }
    addPlayer(id, username, color) {
        if (this.state.status !== 'LOBBY' || this.state.players.length >= 4) {
            return false;
        }
        this.state.players.push({
            id,
            username,
            color,
            hand: [],
            discardPile: [],
            isProtected: false,
            isEliminated: false,
            tokens: 0
        });
        this.state.log.push(`${username} a rejoint la partie.`);
        return true;
    }
    removePlayer(socketId) {
        this.state.players = this.state.players.filter(p => p.id !== socketId);
        if (this.state.status !== 'LOBBY') {
            this.state.log.push(`⚠️ Un joueur est parti. Partie réinitialisée.`);
            this.resetGame();
        }
    }
    startGame() {
        if (this.state.players.length < 2 || this.state.status !== 'LOBBY') {
            return false;
        }
        this.state.status = 'PLAYING';
        this.state.log.push('La partie de Love Letter commence !');
        this.startNewRound();
        return true;
    }
    startNewRound() {
        this.state.roundWinner = null;
        this.state.targetSelectionNeeded = null;
        // Reset players for the round
        this.state.players.forEach(p => {
            p.hand = [];
            p.discardPile = [];
            p.isProtected = false;
            p.isEliminated = false;
        });
        // Build the deck
        let cards = [];
        CARD_TEMPLATES.forEach(tmpl => {
            for (let i = 0; i < tmpl.count; i++) {
                cards.push({
                    id: (0, uuid_1.v4)(),
                    type: tmpl.type,
                    value: tmpl.value,
                    name: tmpl.name,
                    description: tmpl.description
                });
            }
        });
        // Shuffle
        for (let i = cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [cards[i], cards[j]] = [cards[j], cards[i]];
        }
        // Burn 1 card face down
        this.state.discardedTopCard = cards.pop() || null;
        // If 2 players, burn 3 cards face up
        this.state.burnCards = [];
        if (this.state.players.length === 2) {
            for (let i = 0; i < 3; i++) {
                const c = cards.pop();
                if (c)
                    this.state.burnCards.push(c);
            }
            this.state.log.push(`ℹ️ Partie à 2 joueurs : 3 cartes sont brûlées face visible.`);
        }
        this.state.deck = cards;
        this.state.deckCount = cards.length;
        // Deal 1 card to everyone
        this.state.players.forEach(p => {
            const c = this.state.deck.pop();
            if (c)
                p.hand.push(c);
        });
        this.state.deckCount = this.state.deck.length;
        // Start of turn for currentPlayer
        const current = this.state.players[this.state.currentPlayerIndex];
        this.state.log.push(`--- Début du tour de ${current.username} ---`);
        this.drawCardForCurrentPlayer();
    }
    drawCardForCurrentPlayer() {
        const player = this.state.players[this.state.currentPlayerIndex];
        // Remove protection at the start of turn
        player.isProtected = false;
        if (this.state.deck.length === 0) {
            this.resolveRoundEnd();
            return;
        }
        const card = this.state.deck.pop();
        if (card) {
            player.hand.push(card);
        }
        this.state.deckCount = this.state.deck.length;
    }
    playCard(socketId, cardId, targetPlayerId, guessedCardType) {
        const activePlayer = this.state.players[this.state.currentPlayerIndex];
        if (!activePlayer || activePlayer.id !== socketId || this.state.status !== 'PLAYING') {
            return false;
        }
        // Find card in hand
        const cardIdx = activePlayer.hand.findIndex(c => c.id === cardId);
        if (cardIdx === -1)
            return false;
        const card = activePlayer.hand[cardIdx];
        // COMTESSE restriction check
        const hasComtesse = activePlayer.hand.some(c => c.type === 'COMTESSE');
        const hasKingOrPrince = activePlayer.hand.some(c => c.type === 'ROI' || c.type === 'PRINCE');
        if (hasComtesse && hasKingOrPrince && card.type !== 'COMTESSE') {
            // Must discard Comtesse first
            return false;
        }
        // Remove from hand
        activePlayer.hand.splice(cardIdx, 1);
        activePlayer.discardPile.push(card);
        this.state.log.push(`🃏 ${activePlayer.username} a joué : ${card.name}.`);
        // Princesse self-elimination
        if (card.type === 'PRINCESSE') {
            this.eliminatePlayer(activePlayer, 'Défausse forcée de la Princesse');
            this.finishTurn();
            return true;
        }
        // Servante self-protection
        if (card.type === 'SERVANTE') {
            activePlayer.isProtected = true;
            this.state.log.push(`🛡️ ${activePlayer.username} est protégé par la Servante.`);
            this.finishTurn();
            return true;
        }
        // Find targetable players (neither eliminated, nor protected, nor self - except for Prince)
        const possibleTargets = this.state.players.filter(p => {
            if (p.isEliminated)
                return false;
            if (p.isProtected)
                return false;
            if (card.type === 'PRINCE') {
                return true; // Can target self
            }
            else {
                return p.id !== activePlayer.id; // Others only
            }
        });
        // If no targets available, card has no effect
        if (possibleTargets.length === 0) {
            this.state.log.push(`ℹ️ Aucun joueur n'est ciblable. L'effet de ${card.name} est annulé.`);
            this.finishTurn();
            return true;
        }
        // Interactive targeting resolution
        if (!targetPlayerId) {
            this.state.targetSelectionNeeded = {
                cardId: card.id,
                cardType: card.type,
                possibleTargets: possibleTargets.map(t => t.id),
                needsCardGuess: card.type === 'GARDE'
            };
            return true;
        }
        this.resolveCardEffect(card.type, activePlayer, targetPlayerId, guessedCardType);
        this.finishTurn();
        return true;
    }
    resolveCardEffect(type, actor, targetId, guessed) {
        const target = this.state.players.find(p => p.id === targetId);
        switch (type) {
            case 'GARDE':
                if (!guessed)
                    return;
                const targetCard = target.hand[0];
                if (targetCard.type === guessed) {
                    this.state.log.push(`🎯 Vrai ! ${actor.username} a deviné que ${target.username} possède un(e) ${targetCard.name}.`);
                    this.eliminatePlayer(target, `Découvert par le Garde de ${actor.username}`);
                }
                else {
                    this.state.log.push(`❌ Faux ! ${actor.username} a deviné ${guessed} pour ${target.username}, mais ce n'est pas ça.`);
                }
                break;
            case 'PRETRE':
                // The look action will be logged. The actual cards are sent to the client (handled in getState/room socket logic)
                this.state.log.push(`🔍 ${actor.username} regarde secrètement la main de ${target.username}.`);
                break;
            case 'BARON':
                const myVal = actor.hand[0].value;
                const targetVal = target.hand[0].value;
                this.state.log.push(`⚔️ Duel de Baron entre ${actor.username} (${actor.hand[0].name}) et ${target.username} (${target.hand[0].name}).`);
                if (myVal > targetVal) {
                    this.eliminatePlayer(target, 'Battu en duel de Baron');
                }
                else if (myVal < targetVal) {
                    this.eliminatePlayer(actor, 'Battu en duel de Baron');
                }
                else {
                    this.state.log.push(`🤝 Égalité ! Les deux cartes ont la même valeur.`);
                }
                break;
            case 'PRINCE':
                const discarded = target.hand.pop();
                if (discarded) {
                    target.discardPile.push(discarded);
                    this.state.log.push(`👑 Le Prince force ${target.username} à défausser son/sa ${discarded.name}.`);
                    if (discarded.type === 'PRINCESSE') {
                        this.eliminatePlayer(target, 'Princesse défaussée par le Prince');
                    }
                    else {
                        // Draw a new one
                        if (this.state.deck.length === 0) {
                            // Draw the face down burn card
                            if (this.state.discardedTopCard) {
                                target.hand.push(this.state.discardedTopCard);
                                this.state.discardedTopCard = null;
                            }
                        }
                        else {
                            const c = this.state.deck.pop();
                            if (c)
                                target.hand.push(c);
                        }
                        this.state.deckCount = this.state.deck.length;
                    }
                }
                break;
            case 'ROI':
                const myCard = actor.hand.pop();
                const targetCardRoi = target.hand.pop();
                actor.hand.push(targetCardRoi);
                target.hand.push(myCard);
                this.state.log.push(`👑 ${actor.username} a échangé sa carte avec ${target.username}.`);
                break;
        }
    }
    eliminatePlayer(p, reason) {
        p.isEliminated = true;
        const card = p.hand.pop();
        if (card) {
            p.discardPile.push(card);
        }
        this.state.log.push(`💀 ÉLIMINATION : ${p.username} est éliminé ! (Raison: ${reason}). Sa carte était : ${card ? card.name : 'aucune'}.`);
    }
    finishTurn() {
        this.state.targetSelectionNeeded = null;
        // Check if round should end because of survivor count
        const survivors = this.state.players.filter(p => !p.isEliminated);
        if (survivors.length === 1) {
            this.awardRoundWinner(survivors[0]);
            return;
        }
        if (this.state.deck.length === 0) {
            this.resolveRoundEnd();
            return;
        }
        // Go to next active player
        do {
            this.state.currentPlayerIndex = (this.state.currentPlayerIndex + 1) % this.state.players.length;
        } while (this.state.players[this.state.currentPlayerIndex].isEliminated);
        const nextPlayer = this.state.players[this.state.currentPlayerIndex];
        this.state.log.push(`--- C'est au tour de ${nextPlayer.username} ---`);
        this.drawCardForCurrentPlayer();
    }
    resolveRoundEnd() {
        this.state.log.push('🏁 Fin du tour : pioche épuisée ! Comparaison des cartes en main...');
        const survivors = this.state.players.filter(p => !p.isEliminated);
        let bestVal = -1;
        let roundWinners = [];
        survivors.forEach(s => {
            const val = s.hand[0]?.value ?? 0;
            this.state.log.push(`ℹ️ ${s.username} possède un(e) ${s.hand[0]?.name} (${val}).`);
            if (val > bestVal) {
                bestVal = val;
                roundWinners = [s];
            }
            else if (val === bestVal) {
                roundWinners.push(s);
            }
        });
        if (roundWinners.length === 1) {
            this.awardRoundWinner(roundWinners[0]);
        }
        else {
            // In case of a tie, compare total discard pile values
            let bestDiscardSum = -1;
            let tieWinner = roundWinners[0];
            roundWinners.forEach(w => {
                const sum = w.discardPile.reduce((acc, c) => acc + c.value, 0);
                if (sum > bestDiscardSum) {
                    bestDiscardSum = sum;
                    tieWinner = w;
                }
            });
            this.state.log.push(`ℹ️ Égalité résolue par la somme de la défausse. ${tieWinner.username} gagne avec une somme de ${bestDiscardSum}.`);
            this.awardRoundWinner(tieWinner);
        }
    }
    awardRoundWinner(winner) {
        winner.tokens += 1;
        this.state.roundWinner = winner;
        this.state.status = 'ROUND_END';
        this.state.log.push(`🎉 ${winner.username} remporte cette manche et gagne un pion d'affection (${winner.tokens} au total) !`);
        // Check if player won the entire game
        const limit = this.state.players.length === 2 ? 7 : (this.state.players.length === 3 ? 5 : 4);
        if (winner.tokens >= limit) {
            this.state.status = 'FINISHED';
            this.state.winner = winner;
            this.state.log.push(`👑 VICTOIRE FINALE : ${winner.username} a conquis le cœur de la Princesse avec ${winner.tokens} pions d'affection !`);
        }
    }
    nextRound() {
        if (this.state.status !== 'ROUND_END')
            return false;
        this.state.status = 'PLAYING';
        this.startNewRound();
        return true;
    }
    resetGame() {
        this.state.status = 'LOBBY';
        this.state.currentPlayerIndex = 0;
        this.state.deck = [];
        this.state.burnCards = [];
        this.state.discardedTopCard = null;
        this.state.winner = null;
        this.state.roundWinner = null;
        this.state.targetSelectionNeeded = null;
        this.state.players.forEach(p => {
            p.hand = [];
            p.discardPile = [];
            p.isProtected = false;
            p.isEliminated = false;
            p.tokens = 0;
        });
        this.state.log = ['Partie réinitialisée. En attente du départ...'];
        return true;
    }
}
exports.LoveLetterEngine = LoveLetterEngine;
