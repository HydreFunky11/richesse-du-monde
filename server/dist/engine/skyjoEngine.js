"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SkyjoEngine = void 0;
const LOCATIONS = [
// Keeping this file structure consistent
];
const CARD_DISTRIBUTION = [
    { val: -2, count: 5 },
    { val: 0, count: 15 },
    { val: -1, count: 10 },
    { val: 1, count: 10 },
    { val: 2, count: 10 },
    { val: 3, count: 10 },
    { val: 4, count: 10 },
    { val: 5, count: 10 },
    { val: 6, count: 10 },
    { val: 7, count: 10 },
    { val: 8, count: 10 },
    { val: 9, count: 10 },
    { val: 10, count: 10 },
    { val: 11, count: 10 },
    { val: 12, count: 10 }
];
class SkyjoEngine {
    roomCode;
    state;
    deck = [];
    constructor(roomCode) {
        this.roomCode = roomCode;
        this.state = {
            status: 'LOBBY',
            players: [],
            currentPlayerIndex: 0,
            discardPile: [],
            drawPileCount: 0,
            drawnCard: null,
            isDrawnFromDiscard: false,
            mustRevealCard: false,
            roundEnderId: null,
            log: ['Salon de jeu créé. En attente des joueurs...'],
            winner: null
        };
    }
    getPlayers() {
        return this.state.players;
    }
    getState() {
        return this.state;
    }
    addPlayer(id, username, color) {
        if (this.state.status !== 'LOBBY' || this.state.players.length >= 8) {
            return false;
        }
        this.state.players.push({
            id,
            username,
            color,
            grid: [],
            roundScore: 0,
            totalScore: 0,
            hasFinished: false
        });
        this.state.log.push(`${username} a rejoint le salon.`);
        return true;
    }
    removePlayer(socketId) {
        this.state.players = this.state.players.filter(p => p.id !== socketId);
        if (this.state.status !== 'LOBBY') {
            this.state.log.push(`⚠️ Un joueur s'est déconnecté. Partie réinitialisée.`);
            this.resetGame();
        }
    }
    startGame() {
        if (this.state.players.length < 2 || this.state.status !== 'LOBBY') {
            return false;
        }
        this.state.players.forEach(p => {
            p.totalScore = 0;
        });
        this.initRound();
        return true;
    }
    generateDeck() {
        const deck = [];
        let idCounter = 0;
        CARD_DISTRIBUTION.forEach(item => {
            for (let i = 0; i < item.count; i++) {
                deck.push({
                    id: `card_${item.val}_${idCounter++}`,
                    value: item.val,
                    faceUp: false
                });
            }
        });
        // Shuffle deck
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        return deck;
    }
    initRound() {
        this.deck = this.generateDeck();
        this.state.players.forEach(p => {
            p.roundScore = 0;
            p.hasFinished = false;
            p.grid = [];
            // Create a 3 rows x 4 cols grid
            for (let r = 0; r < 3; r++) {
                const row = [];
                for (let c = 0; c < 4; c++) {
                    const card = this.deck.pop();
                    row.push(card);
                }
                p.grid.push(row);
            }
        });
        // Start discard pile with 1 card face up
        const firstDiscard = this.deck.pop();
        firstDiscard.faceUp = true;
        this.state.discardPile = [firstDiscard];
        this.state.drawPileCount = this.deck.length;
        this.state.drawnCard = null;
        this.state.isDrawnFromDiscard = false;
        this.state.mustRevealCard = false;
        this.state.roundEnderId = null;
        this.state.status = 'REVEAL_TWO';
        this.state.log.push('Nouvelle manche ! Choisissez 2 cartes de votre grille à retourner face visible.');
    }
    revealCardInitial(socketId, row, col) {
        if (this.state.status !== 'REVEAL_TWO')
            return false;
        const player = this.state.players.find(p => p.id === socketId);
        if (!player)
            return false;
        const card = player.grid[row]?.[col];
        if (!card || card.faceUp)
            return false;
        // Count face up cards for this player before revealing
        let faceUpCount = 0;
        player.grid.forEach(r => r.forEach(c => { if (c.faceUp)
            faceUpCount++; }));
        if (faceUpCount >= 2)
            return false;
        card.faceUp = true;
        this.state.log.push(`${player.username} a retourné une carte de valeur ${card.value}.`);
        // Check if everyone has revealed 2 cards
        const everyoneReady = this.state.players.every(p => {
            let count = 0;
            p.grid.forEach(r => r.forEach(c => { if (c.faceUp)
                count++; }));
            return count >= 2;
        });
        if (everyoneReady) {
            // Find starting player (highest sum of 2 revealed cards)
            let highestSum = -999;
            let startIdx = 0;
            this.state.players.forEach((p, idx) => {
                let sum = 0;
                p.grid.forEach(r => r.forEach(c => { if (c.faceUp)
                    sum += c.value; }));
                if (sum > highestSum) {
                    highestSum = sum;
                    startIdx = idx;
                }
            });
            this.state.currentPlayerIndex = startIdx;
            this.state.status = 'PLAYING';
            this.state.log.push(`Début de la phase de jeu. Le joueur le plus fort est ${this.state.players[startIdx].username} avec un total de ${highestSum} points. C'est à son tour !`);
        }
        return true;
    }
    drawFromDrawPile(socketId) {
        if (this.state.status !== 'PLAYING' || this.state.drawnCard || this.state.mustRevealCard)
            return false;
        const activePlayer = this.state.players[this.state.currentPlayerIndex];
        if (activePlayer.id !== socketId)
            return false;
        if (this.deck.length === 0) {
            this.recycleDiscardPile();
        }
        const card = this.deck.pop();
        if (!card)
            return false;
        card.faceUp = true;
        this.state.drawnCard = card;
        this.state.isDrawnFromDiscard = false;
        this.state.mustRevealCard = false;
        this.state.drawPileCount = this.deck.length;
        this.state.log.push(`${activePlayer.username} a pioché une carte cachée de valeur ${card.value}.`);
        return true;
    }
    drawFromDiscardPile(socketId) {
        if (this.state.status !== 'PLAYING' || this.state.drawnCard || this.state.mustRevealCard || this.state.discardPile.length === 0)
            return false;
        const activePlayer = this.state.players[this.state.currentPlayerIndex];
        if (activePlayer.id !== socketId)
            return false;
        const card = this.state.discardPile.pop();
        if (!card)
            return false;
        card.faceUp = true;
        this.state.drawnCard = card;
        this.state.isDrawnFromDiscard = true;
        this.state.mustRevealCard = false;
        this.state.log.push(`${activePlayer.username} a pioché la carte de la défausse de valeur ${card.value}.`);
        return true;
    }
    swapDrawnCard(socketId, row, col) {
        if (this.state.status !== 'PLAYING' || !this.state.drawnCard || this.state.mustRevealCard)
            return false;
        const activePlayer = this.state.players[this.state.currentPlayerIndex];
        if (activePlayer.id !== socketId)
            return false;
        const targetCard = activePlayer.grid[row]?.[col];
        if (!targetCard)
            return false;
        const drawn = this.state.drawnCard;
        activePlayer.grid[row][col] = drawn;
        targetCard.faceUp = true;
        this.state.discardPile.push(targetCard);
        this.state.drawnCard = null;
        this.state.isDrawnFromDiscard = false;
        this.state.log.push(`${activePlayer.username} a remplacé sa carte en position [${row + 1}, ${col + 1}] par la carte de valeur ${drawn.value}. L'ancienne carte (${targetCard.value}) est défaussée.`);
        this.endTurnTasks(activePlayer);
        return true;
    }
    discardDrawnCard(socketId) {
        if (this.state.status !== 'PLAYING' || !this.state.drawnCard || this.state.isDrawnFromDiscard || this.state.mustRevealCard)
            return false;
        const activePlayer = this.state.players[this.state.currentPlayerIndex];
        if (activePlayer.id !== socketId)
            return false;
        const drawn = this.state.drawnCard;
        this.state.discardPile.push(drawn);
        this.state.drawnCard = null;
        this.state.mustRevealCard = true;
        this.state.log.push(`${activePlayer.username} a défaussé la carte piochée (${drawn.value}) et doit maintenant révéler une carte cachée de sa grille.`);
        return true;
    }
    revealCard(socketId, row, col) {
        if (this.state.status !== 'PLAYING' || !this.state.mustRevealCard)
            return false;
        const activePlayer = this.state.players[this.state.currentPlayerIndex];
        if (activePlayer.id !== socketId)
            return false;
        const targetCard = activePlayer.grid[row]?.[col];
        if (!targetCard || targetCard.faceUp)
            return false;
        targetCard.faceUp = true;
        this.state.mustRevealCard = false;
        this.state.log.push(`${activePlayer.username} a révélé sa carte cachée en position [${row + 1}, ${col + 1}] qui est un ${targetCard.value}.`);
        this.endTurnTasks(activePlayer);
        return true;
    }
    recycleDiscardPile() {
        if (this.state.discardPile.length <= 1)
            return;
        const topCard = this.state.discardPile.pop();
        const newDeck = [...this.state.discardPile];
        newDeck.forEach(c => c.faceUp = false);
        // Shuffle
        for (let i = newDeck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
        }
        this.deck = newDeck;
        this.state.discardPile = [topCard];
        this.state.drawPileCount = this.deck.length;
        this.state.log.push('♻️ La défausse a été mélangée pour reformer la pioche.');
    }
    checkColumnAlignment(player) {
        const numCols = player.grid[0]?.length || 0;
        const numRows = player.grid.length;
        for (let col = numCols - 1; col >= 0; col--) {
            // Check if all cards in this column are faceUp and have the same value
            let allFaceUp = true;
            let firstVal = null;
            let matches = true;
            for (let row = 0; row < numRows; row++) {
                const card = player.grid[row][col];
                if (!card) {
                    matches = false;
                    break;
                }
                if (!card.faceUp) {
                    allFaceUp = false;
                    break;
                }
                if (firstVal === null) {
                    firstVal = card.value;
                }
                else if (card.value !== firstVal) {
                    matches = false;
                }
            }
            if (allFaceUp && matches && firstVal !== null) {
                // Discard all 3 cards
                this.state.log.push(`✨ Alignement ! ${player.username} supprime une colonne complète de ${firstVal} ! (-3 cartes de sa grille)`);
                for (let row = 0; row < numRows; row++) {
                    const removedCard = player.grid[row][col];
                    this.state.discardPile.push(removedCard);
                }
                // Delete the column from the grid
                for (let row = 0; row < numRows; row++) {
                    player.grid[row].splice(col, 1);
                }
            }
        }
    }
    endTurnTasks(player) {
        this.checkColumnAlignment(player);
        // Check if player has finished (all remaining cards are faceUp)
        let allFaceUp = true;
        player.grid.forEach(r => r.forEach(c => { if (!c.faceUp)
            allFaceUp = false; }));
        if (allFaceUp) {
            player.hasFinished = true;
            if (this.state.roundEnderId === null) {
                this.state.roundEnderId = player.id;
                this.state.log.push(`🏁 ${player.username} a révélé toutes ses cartes ! Dernier tour de table pour les autres.`);
            }
        }
        // Advance turn
        this.state.currentPlayerIndex = (this.state.currentPlayerIndex + 1) % this.state.players.length;
        const nextPlayer = this.state.players[this.state.currentPlayerIndex];
        // If next turn reaches the round ender, end the round
        if (this.state.roundEnderId !== null && nextPlayer.id === this.state.roundEnderId) {
            this.endRound();
        }
    }
    endRound() {
        this.state.log.push(' Manche terminée ! Révélation de toutes les cartes.');
        // Reveal all players' remaining face-down cards
        this.state.players.forEach(p => {
            p.grid.forEach(r => r.forEach(c => c.faceUp = true));
        });
        // Calculate score
        const scores = {};
        this.state.players.forEach(p => {
            let sum = 0;
            p.grid.forEach(r => r.forEach(c => sum += c.value));
            scores[p.id] = sum;
        });
        const roundEnderId = this.state.roundEnderId;
        const roundEnderScore = scores[roundEnderId];
        // Check if round ender had strictly the lowest score
        let enderHadLowest = true;
        this.state.players.forEach(p => {
            if (p.id !== roundEnderId && scores[p.id] <= roundEnderScore) {
                enderHadLowest = false;
            }
        });
        // Double ender's score if they failed to be strictly lowest (and if it's positive)
        if (!enderHadLowest && roundEnderScore > 0) {
            scores[roundEnderId] = roundEnderScore * 2;
            this.state.log.push(`⚠️ Doublage ! ${this.state.players.find(pl => pl.id === roundEnderId)?.username} a terminé la manche mais n'a pas le score le plus bas. Son score est doublé : ${roundEnderScore} ➔ ${roundEnderScore * 2} points.`);
        }
        // Save round scores & add to total
        this.state.players.forEach(p => {
            p.roundScore = scores[p.id];
            p.totalScore += p.roundScore;
            this.state.log.push(`📊 Score de la manche pour ${p.username} : ${p.roundScore} pts (Total: ${p.totalScore} pts).`);
        });
        // Check if anyone reached 100 points
        const maxScore = Math.max(...this.state.players.map(p => p.totalScore));
        if (maxScore >= 100) {
            // Game over, find lowest total score
            let minScore = 9999;
            let winnerPlayer = null;
            for (const p of this.state.players) {
                if (p.totalScore < minScore) {
                    minScore = p.totalScore;
                    winnerPlayer = p;
                }
            }
            this.state.winner = winnerPlayer;
            this.state.status = 'FINISHED';
            this.state.log.push(`🏆 FIN DE PARTIE : Le vainqueur est ${winnerPlayer?.username} avec ${minScore} points au total !`);
        }
        else {
            this.state.status = 'ROUND_END';
        }
    }
    nextRound() {
        if (this.state.status !== 'ROUND_END')
            return false;
        this.initRound();
        return true;
    }
    resetGame() {
        this.state.status = 'LOBBY';
        this.state.players.forEach(p => {
            p.grid = [];
            p.roundScore = 0;
            p.totalScore = 0;
            p.hasFinished = false;
        });
        this.state.discardPile = [];
        this.state.drawPileCount = 0;
        this.state.drawnCard = null;
        this.state.isDrawnFromDiscard = false;
        this.state.mustRevealCard = false;
        this.state.roundEnderId = null;
        this.state.winner = null;
        this.state.log = ['Partie réinitialisée. En attente du départ...'];
    }
}
exports.SkyjoEngine = SkyjoEngine;
