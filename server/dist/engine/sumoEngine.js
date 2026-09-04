"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SumoEngine = void 0;
const KEY_POOL_COMMON = ['ESPACE', 'A', 'Z', 'E', 'R', 'F', 'C', 'ENTRÉE'];
const KEY_POOL_LEFT = ['A', 'Z', 'E', 'Q', 'S', 'D', 'W', 'X'];
const KEY_POOL_RIGHT = ['I', 'O', 'P', 'J', 'K', 'L', 'Flèche Haut', 'Flèche Droite'];
class SumoEngine {
    state;
    tickInterval = null;
    pushTimestamps = {};
    nextKeySwitchTimer = 5 + Math.random() * 10;
    nextSpecialEventTimer = 8;
    stateChangeCallback = null;
    constructor(roomCode, targetScore = 3) {
        this.state = {
            status: 'LOBBY',
            roomCode,
            players: [],
            position: 50,
            targetScore,
            currentRound: 1,
            countdown: 3,
            eventState: 'NORMAL',
            eventTimer: 0,
            lastEventNotice: null,
            roundWinner: null,
            matchWinner: null,
            spectators: []
        };
    }
    onStateChange(cb) {
        this.stateChangeCallback = cb;
    }
    notify() {
        if (this.stateChangeCallback) {
            this.stateChangeCallback(this.getState());
        }
    }
    getState() {
        return JSON.parse(JSON.stringify(this.state));
    }
    getPlayers() {
        return this.state.players;
    }
    addPlayer(socketId, username, color) {
        // Reconnecting player
        const existing = this.state.players.find(p => p.username.toLowerCase() === username.toLowerCase());
        if (existing) {
            existing.id = socketId;
            this.notify();
            return true;
        }
        if (this.state.players.length >= 2) {
            this.state.spectators.push({ id: socketId, username });
            this.notify();
            return true;
        }
        const side = this.state.players.length === 0 ? 'left' : 'right';
        const playerColor = side === 'left' ? '#3B82F6' : '#EF4444';
        const initialKey = side === 'left' ? 'A' : 'P';
        const newPlayer = {
            id: socketId,
            username,
            side,
            color: playerColor,
            score: 0,
            currentKey: initialKey,
            cps: 0,
            isStunned: false,
            stunTimer: 0,
            totalPushes: 0
        };
        this.state.players.push(newPlayer);
        this.pushTimestamps[socketId] = [];
        this.notify();
        return true;
    }
    removePlayer(socketId) {
        this.state.players = this.state.players.filter(p => p.id !== socketId);
        this.state.spectators = this.state.spectators.filter(s => s.id !== socketId);
        delete this.pushTimestamps[socketId];
        if (this.state.players.length < 2 && this.state.status === 'PLAYING') {
            this.state.status = 'LOBBY';
            this.stopLoop();
        }
        this.notify();
    }
    startGame() {
        if (this.state.players.length < 2)
            return false;
        this.state.status = 'COUNTDOWN';
        this.state.countdown = 3;
        this.state.position = 50;
        this.state.currentRound = 1;
        this.state.roundWinner = null;
        this.state.matchWinner = null;
        this.state.players.forEach(p => {
            p.score = 0;
            p.totalPushes = 0;
            p.isStunned = false;
            p.stunTimer = 0;
        });
        this.pickNewKeys();
        this.startLoop();
        this.notify();
        return true;
    }
    startRound() {
        this.state.status = 'PLAYING';
        this.state.position = 50;
        this.state.roundWinner = null;
        this.state.eventState = 'NORMAL';
        this.state.eventTimer = 0;
        this.state.lastEventNotice = 'HAKKEYOI ! POUSSEZ !';
        this.nextKeySwitchTimer = 5 + Math.random() * 10; // Between 5s and 15s
        this.nextSpecialEventTimer = 7 + Math.random() * 8;
        this.state.players.forEach(p => {
            p.isStunned = false;
            p.stunTimer = 0;
        });
        this.pickNewKeys();
        this.notify();
    }
    pickNewKeys() {
        const p1 = this.state.players[0];
        const p2 = this.state.players[1];
        if (p1) {
            const candidatesLeft = ['A', 'Z', 'E', 'Q', 'S', 'D', 'W', 'ESPACE'];
            const filtered = candidatesLeft.filter(k => k !== p1.currentKey);
            p1.currentKey = filtered[Math.floor(Math.random() * filtered.length)];
        }
        if (p2) {
            const candidatesRight = ['I', 'O', 'P', 'J', 'K', 'L', 'Flèche Haut', 'ESPACE'];
            const filtered = candidatesRight.filter(k => k !== p2.currentKey);
            p2.currentKey = filtered[Math.floor(Math.random() * filtered.length)];
        }
    }
    handlePush(socketId, pressedKey) {
        if (this.state.status !== 'PLAYING')
            return { success: false, reason: 'not_playing' };
        const player = this.state.players.find(p => p.id === socketId);
        if (!player)
            return { success: false, reason: 'not_in_game' };
        // Record press for CPS calculation
        const now = Date.now();
        if (!this.pushTimestamps[socketId])
            this.pushTimestamps[socketId] = [];
        this.pushTimestamps[socketId].push(now);
        // Stunned
        if (player.isStunned) {
            return { success: false, reason: 'stunned' };
        }
        // 1. FEINTE CHECK: If player pushed during a FEINT, they slip and lose ground!
        if (this.state.eventState === 'FEINT') {
            player.isStunned = true;
            player.stunTimer = 0.8;
            const penalty = 7;
            if (player.side === 'left') {
                this.state.position = Math.max(0, this.state.position - penalty);
            }
            else {
                this.state.position = Math.min(100, this.state.position + penalty);
            }
            this.state.lastEventNotice = `⚠️ FEINTE SUBIE ! ${player.username} a trébuché !`;
            this.checkRoundEnd();
            this.notify();
            return { success: false, reason: 'feint_fumble' };
        }
        // 2. WRONG KEY CHECK
        const normExpected = player.currentKey.trim().toUpperCase();
        const normPressed = pressedKey.trim().toUpperCase();
        // Map common key representations (e.g. ' ' -> 'ESPACE')
        const matches = (normExpected === 'ESPACE' && (normPressed === ' ' || normPressed === 'SPACE' || normPressed === 'ESPACE')) ||
            (normExpected === 'ENTRÉE' && (normPressed === 'ENTER' || normPressed === 'ENTRÉE')) ||
            (normExpected === normPressed);
        if (!matches) {
            // Small fumble for hitting wrong key
            player.isStunned = true;
            player.stunTimer = 0.35;
            const slipPenalty = 2.5;
            if (player.side === 'left') {
                this.state.position = Math.max(0, this.state.position - slipPenalty);
            }
            else {
                this.state.position = Math.min(100, this.state.position + slipPenalty);
            }
            this.checkRoundEnd();
            this.notify();
            return { success: false, reason: 'wrong_key' };
        }
        // 3. SUCCESSFUL PUSH
        let pushPower = 1.6;
        if (this.state.eventState === 'TURBO') {
            pushPower = 4.2;
        }
        player.totalPushes++;
        if (player.side === 'left') {
            this.state.position = Math.min(100, this.state.position + pushPower);
        }
        else {
            this.state.position = Math.max(0, this.state.position - pushPower);
        }
        this.checkRoundEnd();
        this.notify();
        return { success: true };
    }
    checkRoundEnd() {
        if (this.state.position >= 100) {
            // Left player pushed Right out -> Left wins round
            this.handleRoundWon('left');
        }
        else if (this.state.position <= 0) {
            // Right player pushed Left out -> Right wins round
            this.handleRoundWon('right');
        }
    }
    handleRoundWon(winnerSide) {
        this.state.status = 'ROUND_END';
        this.state.roundWinner = winnerSide;
        const winner = this.state.players.find(p => p.side === winnerSide);
        if (winner) {
            winner.score++;
            this.state.lastEventNotice = `💥 SORTIE DE RING ! ${winner.username} remporte la manche !`;
        }
        // Check Match Win (First to targetScore)
        if (winner && winner.score >= this.state.targetScore) {
            this.state.status = 'MATCH_FINISHED';
            this.state.matchWinner = winnerSide;
            this.state.lastEventNotice = `🏆 VICTOIRE SUPRÊME ! ${winner.username} EST LE YOKOZUNA !`;
            this.notify();
            return;
        }
        // Next round after 3 seconds
        setTimeout(() => {
            if (this.state.status === 'ROUND_END') {
                this.state.currentRound++;
                this.state.status = 'COUNTDOWN';
                this.state.countdown = 3;
                this.state.position = 50;
                this.notify();
            }
        }, 3000);
    }
    startLoop() {
        if (this.tickInterval)
            clearInterval(this.tickInterval);
        this.tickInterval = setInterval(() => {
            const dt = 0.05; // 50ms tick
            const now = Date.now();
            // Update CPS for each player (pushes in last 1000ms)
            for (const p of this.state.players) {
                const timestamps = this.pushTimestamps[p.id] || [];
                this.pushTimestamps[p.id] = timestamps.filter(t => now - t <= 1000);
                p.cps = this.pushTimestamps[p.id].length;
                // Update stun timers
                if (p.isStunned) {
                    p.stunTimer -= dt;
                    if (p.stunTimer <= 0) {
                        p.isStunned = false;
                        p.stunTimer = 0;
                    }
                }
            }
            // Handle COUNTDOWN
            if (this.state.status === 'COUNTDOWN') {
                this.state.countdown -= dt;
                if (this.state.countdown <= 0) {
                    this.startRound();
                }
                this.notify();
                return;
            }
            // Handle PLAYING loop
            if (this.state.status === 'PLAYING') {
                // Gentle center gravity (drifts slightly towards 50 if untouched)
                const diff = this.state.position - 50;
                if (Math.abs(diff) > 2) {
                    this.state.position -= Math.sign(diff) * 0.15 * dt * 10;
                }
                // Active event countdown
                if (this.state.eventTimer > 0) {
                    this.state.eventTimer -= dt;
                    if (this.state.eventTimer <= 0) {
                        this.state.eventState = 'NORMAL';
                        this.state.eventTimer = 0;
                        this.state.lastEventNotice = null;
                    }
                }
                // 1. DEDICATED KEY SWITCH TIMER (Every 5s to 15s)
                this.nextKeySwitchTimer -= dt;
                if (this.nextKeySwitchTimer <= 0) {
                    this.pickNewKeys();
                    this.state.eventState = 'SWITCH_WARNING';
                    this.state.eventTimer = 1.0;
                    this.state.lastEventNotice = '⚠️ SWITCH ! NOUVELLE TOUCHE !';
                    this.nextKeySwitchTimer = 5 + Math.random() * 10; // Exactly 5s to 15s
                }
                // 2. DEDICATED SPECIAL EVENT TIMER (Feinte ou Turbo)
                if (this.state.eventTimer <= 0) {
                    this.nextSpecialEventTimer -= dt;
                    if (this.nextSpecialEventTimer <= 0) {
                        const isFeint = Math.random() < 0.6;
                        if (isFeint) {
                            this.state.eventState = 'FEINT';
                            this.state.eventTimer = 1.3;
                            this.state.lastEventNotice = '🚫 FEINTE ! NE TOUCHEZ À RIEN !';
                        }
                        else {
                            this.state.eventState = 'TURBO';
                            this.state.eventTimer = 2.2;
                            this.state.lastEventNotice = '⚡ RAFALE TSUPPARI X3 ! SPAMMEZ !';
                        }
                        this.nextSpecialEventTimer = 8 + Math.random() * 8;
                    }
                }
                this.notify();
            }
        }, 50);
    }
    resetMatch() {
        this.state.status = 'LOBBY';
        this.state.position = 50;
        this.state.currentRound = 1;
        this.state.roundWinner = null;
        this.state.matchWinner = null;
        this.state.eventState = 'NORMAL';
        this.state.eventTimer = 0;
        this.state.lastEventNotice = null;
        this.state.players.forEach(p => {
            p.score = 0;
            p.totalPushes = 0;
            p.isStunned = false;
            p.stunTimer = 0;
        });
        this.stopLoop();
        this.notify();
    }
    stopLoop() {
        if (this.tickInterval) {
            clearInterval(this.tickInterval);
            this.tickInterval = null;
        }
    }
}
exports.SumoEngine = SumoEngine;
