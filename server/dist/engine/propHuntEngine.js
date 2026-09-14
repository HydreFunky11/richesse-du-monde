"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PropHuntEngine = void 0;
const MAP_PROPS = {
    superette: [
        'soda_can',
        'cereal_box',
        'shopping_cart',
        'cash_register',
        'milk_carton',
        'apple_basket',
        'cardboard_box'
    ],
    warehouse: [
        'wooden_crate',
        'oil_drum',
        'pallet',
        'cardboard_box',
        'metal_shelf',
        'traffic_cone'
    ],
    office: [
        'office_chair',
        'pc_monitor',
        'water_cooler',
        'coffee_mug',
        'trash_can',
        'plant'
    ],
    lab: [
        'cryo_tank',
        'server_rack',
        'chemical_canister',
        'microscope',
        'hazard_barrel'
    ]
};
const TAUNT_SOUNDS = ['pouet', 'whistle', 'quack', 'bell', 'giggle', 'boing'];
const PLAYER_COLORS = [
    '#EF4444', '#3B82F6', '#10B981', '#F59E0B',
    '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'
];
class PropHuntEngine {
    roomCode;
    phase = 'LOBBY';
    players = [];
    selectedMap = 'superette';
    mapVotes = {};
    hidingTimeRemaining = 25; // 25s for props to hide
    roundTimeRemaining = 300; // 5 min minimum
    roundDuration = 300;
    hunterId = null;
    winner = null;
    activeTaunts = [];
    logs = [];
    lastAutoTauntCheck = 0;
    intervalTimer = null;
    onStateChange;
    constructor(roomCode, onStateChange) {
        this.roomCode = roomCode;
        this.onStateChange = onStateChange;
    }
    getPlayers() {
        return this.players;
    }
    addPlayer(id, username) {
        if (this.players.find(p => p.id === id))
            return true;
        if (this.players.length >= 10)
            return false;
        const isHost = this.players.length === 0;
        const color = PLAYER_COLORS[this.players.length % PLAYER_COLORS.length];
        const player = {
            id,
            username: username || `Joueur ${this.players.length + 1}`,
            role: 'HIDER',
            health: 100,
            maxHealth: 100,
            position: [0, 1, 0],
            rotation: [0, 0, 0],
            currentProp: 'cardboard_box',
            isFrozen: false,
            dashCooldownUntil: 0,
            changePropCooldownUntil: 0,
            lastTauntTime: 0,
            color,
            kills: 0,
            isHost
        };
        this.players.push(player);
        // Default vote for superette
        this.mapVotes[id] = 'superette';
        this.log(`👋 ${player.username} a rejoint le salon.`);
        this.broadcast();
        return true;
    }
    removePlayer(id) {
        const idx = this.players.findIndex(p => p.id === id);
        if (idx === -1)
            return;
        const player = this.players[idx];
        this.players.splice(idx, 1);
        delete this.mapVotes[id];
        this.log(`🚪 ${player.username} a quitté le salon.`);
        if (player.isHost && this.players.length > 0) {
            this.players[0].isHost = true;
            this.log(`👑 ${this.players[0].username} est le nouvel hôte.`);
        }
        if (this.phase !== 'LOBBY' && this.phase !== 'FINISHED') {
            if (player.id === this.hunterId) {
                this.winner = 'HIDERS';
                this.phase = 'FINISHED';
                this.log(`🏆 Le chasseur est parti ! Victoire des Cachés !`);
                this.stopTimer();
            }
            else {
                this.checkWinConditions();
            }
        }
        this.broadcast();
    }
    voteMap(playerId, mapId) {
        if (this.phase !== 'LOBBY')
            return;
        this.mapVotes[playerId] = mapId;
        this.broadcast();
    }
    startGame(initiatorId) {
        if (this.phase !== 'LOBBY' && this.phase !== 'FINISHED') {
            return { success: false, error: 'Une partie est déjà en cours' };
        }
        const initiator = this.players.find(p => p.id === initiatorId);
        if (!initiator || !initiator.isHost) {
            return { success: false, error: 'Seul l’hôte peut lancer la partie' };
        }
        if (this.players.length < 2) {
            return { success: false, error: 'Il faut au moins 2 joueurs humains (pas de bots)' };
        }
        // Tally votes
        const voteCounts = {
            superette: 0,
            warehouse: 0,
            office: 0,
            lab: 0
        };
        Object.values(this.mapVotes).forEach(m => {
            if (voteCounts[m] !== undefined)
                voteCounts[m]++;
        });
        let bestMap = 'superette';
        let maxVotes = -1;
        Object.keys(voteCounts).forEach(m => {
            if (voteCounts[m] > maxVotes) {
                maxVotes = voteCounts[m];
                bestMap = m;
            }
        });
        this.selectedMap = bestMap;
        // Pick 1 random Hunter
        const hunterIndex = Math.floor(Math.random() * this.players.length);
        const hunter = this.players[hunterIndex];
        this.hunterId = hunter.id;
        // Available props for chosen map
        const mapProps = MAP_PROPS[this.selectedMap];
        // Reset players
        this.players.forEach((p, idx) => {
            p.health = 100;
            p.maxHealth = 100;
            p.isFrozen = false;
            p.dashCooldownUntil = 0;
            p.changePropCooldownUntil = 0;
            p.lastTauntTime = 0;
            p.kills = 0;
            if (p.id === hunter.id) {
                p.role = 'SEEKER';
                p.currentProp = 'hunter';
                // Spawn hunter in the designated hunter spawn room / cage
                p.position = [0, 1.5, -20];
                p.rotation = [0, 0, 0];
            }
            else {
                p.role = 'HIDER';
                // Give random base prop from map
                p.currentProp = mapProps[idx % mapProps.length];
                // Spread hiders in map center
                const angle = (idx / (this.players.length - 1)) * Math.PI * 2;
                p.position = [Math.cos(angle) * 4, 0.8, Math.sin(angle) * 4];
                p.rotation = [0, angle, 0];
            }
        });
        // Duration: minimum 5 minutes (300s) + 30s per hider beyond 1
        const hidersCount = this.players.length - 1;
        this.roundDuration = Math.max(300, 300 + (hidersCount - 1) * 30);
        this.roundTimeRemaining = this.roundDuration;
        this.hidingTimeRemaining = 25; // 25s black screen hiding time
        this.phase = 'HIDING';
        this.winner = null;
        this.activeTaunts = [];
        this.lastAutoTauntCheck = this.roundDuration;
        this.log(`🎮 La partie commence sur la map : ${this.selectedMap.toUpperCase()} !`);
        this.log(`🎯 Chasseur désigné : ${hunter.username}. Les cachés ont 25s pour se cacher !`);
        this.startTimer();
        this.broadcast();
        return { success: true };
    }
    startTimer() {
        this.stopTimer();
        this.intervalTimer = setInterval(() => {
            this.tick();
        }, 1000);
    }
    stopTimer() {
        if (this.intervalTimer) {
            clearInterval(this.intervalTimer);
            this.intervalTimer = null;
        }
    }
    tick() {
        if (this.phase === 'HIDING') {
            this.hidingTimeRemaining--;
            if (this.hidingTimeRemaining <= 0) {
                this.phase = 'HUNTING';
                this.log(`🔔 C'EST PARTI ! Le chercheur est libéré ! La chasse commence !`);
            }
            this.broadcast();
            return;
        }
        if (this.phase === 'HUNTING') {
            this.roundTimeRemaining--;
            // Clean old visual taunts (> 4s old)
            const now = Date.now();
            this.activeTaunts = this.activeTaunts.filter(t => now - t.timestamp < 4000);
            // Check Automatic Taunts:
            // If roundTimeRemaining > 120s: every 60s
            // If roundTimeRemaining <= 120s: every 30s
            const isUrgent = this.roundTimeRemaining <= 120;
            const tauntInterval = isUrgent ? 30 : 60;
            if (this.roundTimeRemaining > 0 && (this.roundDuration - this.roundTimeRemaining) % tauntInterval === 0) {
                this.triggerAutomaticTaunts();
            }
            if (this.roundTimeRemaining <= 0) {
                this.phase = 'FINISHED';
                this.winner = 'HIDERS';
                this.log(`⏰ TEMPS ÉCOULÉ ! Les Cachés remportent la partie ! 🎉`);
                this.stopTimer();
            }
            this.checkWinConditions();
            this.broadcast();
        }
    }
    triggerAutomaticTaunts() {
        const aliveHiders = this.players.filter(p => p.role === 'HIDER' && p.health > 0);
        if (aliveHiders.length === 0)
            return;
        aliveHiders.forEach(hider => {
            const sound = TAUNT_SOUNDS[Math.floor(Math.random() * TAUNT_SOUNDS.length)];
            this.activeTaunts.push({
                id: `taunt_${Date.now()}_${Math.random()}`,
                playerId: hider.id,
                position: [...hider.position],
                sound,
                timestamp: Date.now()
            });
        });
        this.log(`📢 TAUNT AUTOMATIQUE ! Les objets vibrent et font du bruit !`);
    }
    updatePlayerMovement(playerId, position, rotation) {
        const player = this.players.find(p => p.id === playerId);
        if (!player)
            return;
        if (player.role === 'SPECTATOR') {
            player.position = position;
            player.rotation = rotation;
            return;
        }
        if (player.isFrozen)
            return;
        player.position = position;
        player.rotation = rotation;
    }
    dash(playerId) {
        const player = this.players.find(p => p.id === playerId);
        if (!player || player.role !== 'HIDER' || player.health <= 0) {
            return { success: false };
        }
        const now = Date.now();
        if (player.dashCooldownUntil > now) {
            return { success: false, cooldownRemaining: Math.ceil((player.dashCooldownUntil - now) / 1000) };
        }
        // 5 seconds cooldown
        player.dashCooldownUntil = now + 5000;
        this.broadcast();
        return { success: true };
    }
    changeProp(playerId) {
        const player = this.players.find(p => p.id === playerId);
        if (!player || player.role !== 'HIDER' || player.health <= 0) {
            return { success: false };
        }
        const now = Date.now();
        if (player.changePropCooldownUntil > now) {
            return {
                success: false,
                cooldownRemaining: Math.ceil((player.changePropCooldownUntil - now) / 1000)
            };
        }
        // 2 minutes cooldown (120 seconds)
        player.changePropCooldownUntil = now + 120000;
        const availableProps = MAP_PROPS[this.selectedMap].filter(p => p !== player.currentProp);
        const newProp = availableProps[Math.floor(Math.random() * availableProps.length)] || availableProps[0];
        player.currentProp = newProp;
        this.log(`✨ ${player.username} s'est métamorphosé en un autre objet !`);
        this.broadcast();
        return { success: true, newProp };
    }
    toggleFreeze(playerId) {
        const player = this.players.find(p => p.id === playerId);
        if (!player || player.role !== 'HIDER' || player.health <= 0)
            return false;
        player.isFrozen = !player.isFrozen;
        this.broadcast();
        return player.isFrozen;
    }
    triggerManualTaunt(playerId) {
        const player = this.players.find(p => p.id === playerId);
        if (!player || player.role !== 'HIDER' || player.health <= 0)
            return false;
        const now = Date.now();
        if (now - player.lastTauntTime < 5000)
            return false; // 5s min cooldown between manual taunts
        player.lastTauntTime = now;
        const sound = TAUNT_SOUNDS[Math.floor(Math.random() * TAUNT_SOUNDS.length)];
        this.activeTaunts.push({
            id: `taunt_manual_${Date.now()}_${Math.random()}`,
            playerId: player.id,
            position: [...player.position],
            sound,
            timestamp: now
        });
        this.log(`🎺 ${player.username} a nargué le chercheur !`);
        this.broadcast();
        return true;
    }
    hunterShoot(hunterId, hitPlayerId) {
        if (this.phase !== 'HUNTING') {
            return { hit: false, killed: false, hunterDamageTaken: 0 };
        }
        const hunter = this.players.find(p => p.id === hunterId);
        if (!hunter || hunter.role !== 'SEEKER' || hunter.health <= 0) {
            return { hit: false, killed: false, hunterDamageTaken: 0 };
        }
        if (hitPlayerId) {
            const target = this.players.find(p => p.id === hitPlayerId);
            if (target && target.role === 'HIDER' && target.health > 0) {
                // Hit a real player! 50 damage
                target.health -= 50;
                let killed = false;
                if (target.health <= 0) {
                    target.health = 0;
                    target.role = 'SPECTATOR';
                    hunter.kills++;
                    killed = true;
                    this.log(`💥 ${hunter.username} a éliminé ${target.username} !`);
                    this.log(`👻 ${target.username} passe en mode Spectateur jusqu'à la fin de la partie.`);
                }
                else {
                    this.log(`🎯 ${hunter.username} a touché ${target.username} (-50 PV) !`);
                }
                this.checkWinConditions();
                this.broadcast();
                return { hit: true, killed, hunterDamageTaken: 0 };
            }
        }
        // Missed or shot an innocent decoy prop: 5 damage penalty to hunter
        const penalty = 5;
        hunter.health -= penalty;
        this.log(`❌ ${hunter.username} a tiré sur un faux objet (-${penalty} PV) !`);
        if (hunter.health <= 0) {
            hunter.health = 0;
            this.winner = 'HIDERS';
            this.phase = 'FINISHED';
            this.log(`💀 Le chercheur s'est épuisé en tirant sur les décors ! Victoire des Cachés !`);
            this.stopTimer();
        }
        this.broadcast();
        return { hit: false, killed: false, hunterDamageTaken: penalty };
    }
    checkWinConditions() {
        if (this.phase !== 'HUNTING')
            return;
        const remainingHiders = this.players.filter(p => p.role === 'HIDER' && p.health > 0);
        if (remainingHiders.length === 0) {
            this.phase = 'FINISHED';
            this.winner = 'HUNTER';
            const hunter = this.players.find(p => p.id === this.hunterId);
            this.log(`🏆 TOUS LES CACHÉS ONT ÉTÉ DÉBUSQUÉS ! Victoire de ${hunter?.username || 'Chasseur'} !`);
            this.stopTimer();
        }
    }
    resetGame() {
        this.stopTimer();
        this.phase = 'LOBBY';
        this.hunterId = null;
        this.winner = null;
        this.activeTaunts = [];
        this.hidingTimeRemaining = 25;
        this.roundTimeRemaining = 300;
        this.players.forEach(p => {
            p.role = 'HIDER';
            p.health = 100;
            p.isFrozen = false;
            p.dashCooldownUntil = 0;
            p.changePropCooldownUntil = 0;
            p.lastTauntTime = 0;
        });
        this.log(`🔄 Retour au salon d'attente.`);
        this.broadcast();
        return true;
    }
    log(message) {
        this.logs.push(message);
        if (this.logs.length > 50) {
            this.logs.shift();
        }
    }
    broadcast() {
        if (this.onStateChange) {
            this.onStateChange(this.getState());
        }
    }
    getState() {
        return {
            roomCode: this.roomCode,
            phase: this.phase,
            players: this.players,
            selectedMap: this.selectedMap,
            mapVotes: this.mapVotes,
            hidingTimeRemaining: this.hidingTimeRemaining,
            roundTimeRemaining: this.roundTimeRemaining,
            roundDuration: this.roundDuration,
            hunterId: this.hunterId,
            winner: this.winner,
            activeTaunts: this.activeTaunts,
            logs: this.logs
        };
    }
}
exports.PropHuntEngine = PropHuntEngine;
