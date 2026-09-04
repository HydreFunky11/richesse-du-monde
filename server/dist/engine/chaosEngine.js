"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChaosEngine = void 0;
const chaosAi_1 = require("./chaosAi");
const INITIAL_CELLS = [
    {
        id: 'cell_0_0',
        x: 0,
        y: 0,
        name: 'Clairière Sacrée',
        icon: '🌲',
        description: 'Une zone paisible... pour le moment.',
        colorTheme: 'from-emerald-950/80 to-teal-900/60 border-emerald-500/60 text-emerald-300',
        enemies: []
    },
    {
        id: 'cell_1_0',
        x: 1,
        y: 0,
        name: 'Autel de Sang',
        icon: '🩸',
        description: 'La fureur du combat imprègne ce lieu (+5 ATK temporaire).',
        colorTheme: 'from-rose-950/80 to-red-950/60 border-rose-500/60 text-rose-300',
        enemies: []
    },
    {
        id: 'cell_2_0',
        x: 2,
        y: 0,
        name: 'Fosse aux Vipères',
        icon: '🐍',
        description: 'Le sol grouille de venin : -10 PV au passage !',
        colorTheme: 'from-purple-950/80 to-indigo-900/60 border-purple-500/60 text-purple-300',
        effect: { type: 'DAMAGE', value: 10, description: '-10 PV' },
        enemies: []
    },
    {
        id: 'cell_0_1',
        x: 0,
        y: 1,
        name: 'Sanctuaire de Vie',
        icon: '⛩️',
        description: 'Des sources curatives régénérantes (+20 PV).',
        colorTheme: 'from-blue-950/80 to-cyan-900/60 border-blue-500/60 text-blue-300',
        effect: { type: 'HEAL', value: 20, description: '+20 PV' },
        enemies: []
    },
    {
        id: 'cell_1_1',
        x: 1,
        y: 1,
        name: 'Arène de Duel',
        icon: '⚔️',
        description: 'Le sol idéal pour régler ses comptes en duel à mort.',
        colorTheme: 'from-amber-950/80 to-orange-950/60 border-amber-500/60 text-amber-300',
        enemies: []
    },
    {
        id: 'cell_2_1',
        x: 2,
        y: 1,
        name: 'Vortex des Ombres',
        icon: '🌀',
        description: 'Des créatures impies traversent le voile arcanique.',
        colorTheme: 'from-violet-950 to-pink-900/80 border-pink-500/70 text-pink-200',
        enemies: []
    }
];
class ChaosEngine {
    roomCode;
    state;
    constructor(roomCode) {
        this.roomCode = roomCode;
        this.state = {
            status: 'LOBBY',
            roomCode,
            roundNumber: 1,
            maxRounds: 5,
            players: [],
            currentPlayerIndex: 0,
            cells: JSON.parse(JSON.stringify(INITIAL_CELLS)),
            definedStats: [],
            activeRules: [],
            draftingPlayerId: null,
            draftingPlayerName: null,
            draftingReason: null,
            isAiGenerating: false,
            lastAnnouncement: null,
            lastCombatEvent: null,
            winner: null,
            log: ['Arène du Chaos 3x2 initialisée. Choisissez votre case et tuez pour survivre !'],
            aiLogs: []
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
        const exists = this.state.players.find(p => p.id === id);
        if (exists)
            return true;
        // Distribute spawn cell
        const spawnIndex = this.state.players.length % this.state.cells.length;
        const spawnCellId = this.state.cells[spawnIndex]?.id || 'cell_0_0';
        this.state.players.push({
            id,
            username,
            color,
            cellId: spawnCellId,
            hp: 100,
            maxHp: 100,
            atk: 25,
            customStats: {},
            isEliminated: false,
            kills: 0,
            roundsWon: 0
        });
        this.state.log.push(`${username} a rejoint l'Arène du Chaos.`);
        return true;
    }
    removePlayer(id) {
        const idx = this.state.players.findIndex(p => p.id === id);
        if (idx !== -1) {
            const p = this.state.players[idx];
            this.state.players.splice(idx, 1);
            this.state.log.push(`${p.username} a quitté la partie.`);
            if (this.state.currentPlayerIndex >= this.state.players.length) {
                this.state.currentPlayerIndex = 0;
            }
        }
    }
    startGame() {
        if (this.state.players.length < 1 || this.state.status !== 'LOBBY') {
            return false;
        }
        this.state.status = 'PLAYING';
        this.state.roundNumber = 1;
        this.state.activeRules = [];
        this.state.winner = null;
        this.state.currentPlayerIndex = 0;
        // Reset positions and stats
        for (let i = 0; i < this.state.players.length; i++) {
            const p = this.state.players[i];
            p.cellId = this.state.cells[i % this.state.cells.length].id;
            p.hp = 100;
            p.maxHp = 100;
            p.atk = 25;
            p.isEliminated = false;
        }
        this.state.log.push('🏁 La Manche 1 commence ! Cliquez sur une case adjacente pour vous déplacer.');
        return true;
    }
    // ─── TACTICAL MOVEMENT & COMBAT (CLICK TO MOVE) ───────────────────────────
    movePlayer(socketId, targetCellId) {
        const activePlayer = this.state.players[this.state.currentPlayerIndex];
        if (!activePlayer ||
            activePlayer.id !== socketId ||
            this.state.status !== 'PLAYING') {
            return false;
        }
        const currentCell = this.state.cells.find(c => c.id === activePlayer.cellId);
        const targetCell = this.state.cells.find(c => c.id === targetCellId);
        if (!targetCell)
            return false;
        // Check reachability: can move to adjacent cells (orthogonally or diagonally), or within speed
        if (currentCell) {
            const dx = Math.abs(targetCell.x - currentCell.x);
            const dy = Math.abs(targetCell.y - currentCell.y);
            const isSelf = targetCell.id === currentCell.id;
            const speed = activePlayer.customStats['Vitesse'] || activePlayer.customStats['vitesse'] || 1;
            if (isSelf || dx > speed || dy > speed) {
                // Not reachable
                return false;
            }
        }
        // 1. Move player
        activePlayer.cellId = targetCellId;
        this.state.log.push(`🚶 ${activePlayer.username} se déplace vers [${targetCell.name} ${targetCell.icon}].`);
        // 2. Evaluate ON_MOVE rules
        this.evaluateRules('ON_MOVE', { activePlayer, targetCell });
        if (this.state.status === 'DRAFTING_RULE')
            return true;
        // 3. Cell Effect
        if (targetCell.effect) {
            if (targetCell.effect.type === 'HEAL') {
                activePlayer.hp = Math.min(activePlayer.maxHp, activePlayer.hp + targetCell.effect.value);
                this.state.log.push(`💚 [Soin] ${activePlayer.username} récupère ${targetCell.effect.value} PV (${activePlayer.hp}/${activePlayer.maxHp}).`);
            }
            else if (targetCell.effect.type === 'DAMAGE') {
                activePlayer.hp -= targetCell.effect.value;
                this.state.log.push(`💥 [Piège] ${activePlayer.username} subit ${targetCell.effect.value} dégâts de piège !`);
                if (activePlayer.hp <= 0) {
                    this.handlePlayerDeath(activePlayer, `Tué par le piège de ${targetCell.name}`);
                    return true;
                }
            }
        }
        // 4. PVE COMBAT (Monsters on cell)
        if (targetCell.enemies && targetCell.enemies.length > 0) {
            const enemy = targetCell.enemies[0];
            this.state.log.push(`⚔️ [PVE] ${activePlayer.username} affronte [${enemy.name} ${enemy.icon}] !`);
            // Player attacks monster
            enemy.hp -= activePlayer.atk;
            this.state.log.push(`🗡️ ${activePlayer.username} inflige ${activePlayer.atk} dégâts à [${enemy.name}] (reste ${Math.max(0, enemy.hp)} PV).`);
            if (enemy.hp <= 0) {
                // Monster defeated
                targetCell.enemies.shift();
                activePlayer.atk += 5;
                activePlayer.hp = Math.min(activePlayer.maxHp, activePlayer.hp + 20);
                this.state.log.push(`🏆 [${enemy.name}] est VAINCU ! ${activePlayer.username} gagne +5 ATK permanente et +20 PV !`);
                this.evaluateRules('ON_KILL', { killer: activePlayer, victimName: enemy.name });
            }
            else {
                // Monster retaliates
                activePlayer.hp -= enemy.atk;
                this.state.log.push(`👹 [${enemy.name}] contre-attaque et inflige ${enemy.atk} dégâts à ${activePlayer.username} !`);
                if (activePlayer.hp <= 0) {
                    this.handlePlayerDeath(activePlayer, `Terrassé par [${enemy.name}]`);
                    return true;
                }
            }
        }
        // 5. PVP COMBAT (Other players on cell)
        const opponents = this.state.players.filter(p => p.id !== activePlayer.id && p.cellId === targetCellId && !p.isEliminated);
        if (opponents.length > 0) {
            const defender = opponents[0];
            this.state.log.push(`⚔️ [DUEL PVP] ${activePlayer.username} attaque ${defender.username} sur [${targetCell.name}] !`);
            // Attacker strikes defender
            defender.hp -= activePlayer.atk;
            this.state.log.push(`💥 ${activePlayer.username} inflige ${activePlayer.atk} dégâts à ${defender.username} (${Math.max(0, defender.hp)} PV restants) !`);
            this.evaluateRules('ON_PVP', { attacker: activePlayer, defender });
            if (defender.hp <= 0) {
                activePlayer.kills++;
                this.state.log.push(`💀 [PVP] ${defender.username} a succombé sous les coups de ${activePlayer.username} !`);
                this.state.lastCombatEvent = {
                    id: `combat_${Date.now()}`,
                    timestamp: new Date().toLocaleTimeString('fr-FR'),
                    attackerName: activePlayer.username,
                    targetName: defender.username,
                    damageDealt: activePlayer.atk,
                    targetDied: true,
                    attackerDied: false,
                    isPvP: true,
                    message: `${activePlayer.username} a massacré ${defender.username} en duel !`
                };
                this.handlePlayerDeath(defender, `Exécuté par ${activePlayer.username}`);
                return true;
            }
            else {
                // Defender retaliates!
                activePlayer.hp -= defender.atk;
                this.state.log.push(`🛡️ ${defender.username} riposte immédiatement et inflige ${defender.atk} dégâts à ${activePlayer.username} !`);
                if (activePlayer.hp <= 0) {
                    defender.kills++;
                    this.state.log.push(`💀 [PVP] ${activePlayer.username} a été abattu par la riposte de ${defender.username} !`);
                    this.state.lastCombatEvent = {
                        id: `combat_${Date.now()}`,
                        timestamp: new Date().toLocaleTimeString('fr-FR'),
                        attackerName: defender.username,
                        targetName: activePlayer.username,
                        damageDealt: defender.atk,
                        targetDied: true,
                        attackerDied: false,
                        isPvP: true,
                        message: `${defender.username} a riposté et tué ${activePlayer.username} !`
                    };
                    this.handlePlayerDeath(activePlayer, `Mort sur la riposte de ${defender.username}`);
                    return true;
                }
            }
        }
        // 6. Turn passes to next player
        this.passTurnToNext();
        return true;
    }
    passTurnToNext() {
        if (this.state.status !== 'PLAYING')
            return;
        this.state.currentPlayerIndex = (this.state.currentPlayerIndex + 1) % this.state.players.length;
        const nextPlayer = this.state.players[this.state.currentPlayerIndex];
        if (nextPlayer) {
            this.state.log.push(`👉 Tour de ${nextPlayer.username} (PV: ${nextPlayer.hp}, ATK: ${nextPlayer.atk}).`);
            this.evaluateRules('ON_TURN_START', { activePlayer: nextPlayer });
        }
    }
    handlePlayerDeath(victim, reason) {
        victim.isEliminated = true;
        this.state.status = 'DRAFTING_RULE';
        this.state.draftingPlayerId = victim.id;
        this.state.draftingPlayerName = victim.username;
        this.state.draftingReason = reason;
        this.state.log.push(`⚖️ ARRÊT DE MANCHE ! ${victim.username} est tombé (${reason}).`);
        this.state.log.push(`👑 ${victim.username} devient le Législateur du Chaos et prépare son décret divin...`);
    }
    // ─── DECREE / RULE CREATION (THE CORE ROGUELITE MECHANIC) ───────────────────
    async submitNewRule(socketId, ruleText, onStepUpdate) {
        if (this.state.status !== 'DRAFTING_RULE' || this.state.draftingPlayerId !== socketId) {
            return false;
        }
        if (!ruleText.trim())
            return false;
        const author = this.state.draftingPlayerName || 'Le Spectre';
        this.state.isAiGenerating = true;
        try {
            // 1. Call AI to structure the rule and mutations
            const parsedRule = await (0, chaosAi_1.interpretChaosRule)(ruleText, author, this.state.roundNumber, (aiLog) => {
                this.state.aiLogs.push(aiLog);
                this.state.log.push(aiLog.message);
                onStepUpdate?.();
            });
            // 2. Append to active cumulative rules
            this.state.activeRules.push(parsedRule);
            // 3. Apply board mutations (ADD/REMOVE/MODIFY cells, SPAWN enemies, ADD stats)
            if (parsedRule.boardMutations && parsedRule.boardMutations.length > 0) {
                for (const mut of parsedRule.boardMutations) {
                    this.applyMutation(mut);
                }
            }
            // 4. Set announcement with unique ID
            this.state.lastAnnouncement = {
                id: parsedRule.id,
                title: parsedRule.title,
                message: `${parsedRule.flavorText} — ${parsedRule.description}`,
                author
            };
            this.state.log.push(`🔥 DÉCRET #${this.state.activeRules.length} PROCLAMÉ : [${parsedRule.title}]`);
            this.state.log.push(`📜 ${parsedRule.description}`);
            // 5. Start next round with resurrection!
            this.startNextRound();
            return true;
        }
        finally {
            this.state.isAiGenerating = false;
        }
    }
    applyMutation(mut) {
        switch (mut.action) {
            case 'ADD_CELL': {
                const maxX = this.state.cells.reduce((max, c) => Math.max(max, c.x), 0);
                const maxY = this.state.cells.reduce((max, c) => Math.max(max, c.y), 0);
                const newX = mut.cell?.x ?? (maxX >= 3 ? 0 : maxX + 1);
                const newY = mut.cell?.y ?? (maxX >= 3 ? maxY + 1 : 0);
                const newId = `cell_${newX}_${newY}_${Date.now() % 1000}`;
                const newCell = {
                    id: newId,
                    x: newX,
                    y: newY,
                    name: mut.cell?.name || 'Sanctuaire Maudit',
                    icon: mut.cell?.icon || '🏰',
                    description: mut.cell?.description || 'Une nouvelle zone façonnée par le décret.',
                    colorTheme: mut.cell?.colorTheme || 'from-purple-950/80 to-indigo-900/60 border-purple-500/60 text-purple-300',
                    enemies: []
                };
                this.state.cells.push(newCell);
                this.state.log.push(`🗺️ NOUVELLE CASE AJOUTÉE : [${newCell.name} ${newCell.icon}] en (${newX}, ${newY}) !`);
                break;
            }
            case 'REMOVE_CELL': {
                if (this.state.cells.length <= 2)
                    break; // Keep at least 2 cells
                let targetIdx = -1;
                if (mut.cellId) {
                    targetIdx = this.state.cells.findIndex(c => c.id === mut.cellId);
                }
                if (targetIdx === -1) {
                    targetIdx = Math.floor(Math.random() * this.state.cells.length);
                }
                const removed = this.state.cells.splice(targetIdx, 1)[0];
                if (removed) {
                    // Relocate players on this cell
                    const safeCellId = this.state.cells[0]?.id || 'cell_0_0';
                    for (const p of this.state.players) {
                        if (p.cellId === removed.id) {
                            p.cellId = safeCellId;
                        }
                    }
                    this.state.log.push(`💥 CASE SUPPRIMÉE : [${removed.name} ${removed.icon}] s'effondre dans le vide !`);
                }
                break;
            }
            case 'MODIFY_CELL': {
                let cell = mut.cellId ? this.state.cells.find(c => c.id === mut.cellId) : null;
                if (!cell && this.state.cells.length > 0) {
                    cell = this.state.cells[Math.floor(Math.random() * this.state.cells.length)];
                }
                if (cell && mut.cell) {
                    if (mut.cell.name)
                        cell.name = mut.cell.name;
                    if (mut.cell.icon)
                        cell.icon = mut.cell.icon;
                    if (mut.cell.description)
                        cell.description = mut.cell.description;
                    if (mut.cell.colorTheme)
                        cell.colorTheme = mut.cell.colorTheme;
                    this.state.log.push(`🔄 CASE MUTÉE : Devient [${cell.name} ${cell.icon}] !`);
                }
                break;
            }
            case 'SPAWN_ENEMY': {
                const targetCell = (mut.cellId && this.state.cells.find(c => c.id === mut.cellId))
                    || this.state.cells[Math.floor(Math.random() * this.state.cells.length)];
                if (targetCell) {
                    const enemy = {
                        id: `enemy_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
                        name: mut.enemy?.name || 'Ombre Rampante',
                        icon: mut.enemy?.icon || '👹',
                        hp: mut.enemy?.hp || 40,
                        maxHp: mut.enemy?.hp || 40,
                        atk: mut.enemy?.atk || 15,
                        reward: mut.enemy?.reward || '+5 ATK permanent'
                    };
                    targetCell.enemies.push(enemy);
                    this.state.log.push(`👾 ENNEMI INVOQUÉ : [${enemy.name} ${enemy.icon}] (PV: ${enemy.hp}, ATK: ${enemy.atk}) apparaît sur [${targetCell.name}] !`);
                }
                break;
            }
            case 'ADD_STAT': {
                if (mut.statDef) {
                    const exists = this.state.definedStats.find(s => s.name.toLowerCase() === mut.statDef.name.toLowerCase());
                    if (!exists) {
                        this.state.definedStats.push(mut.statDef);
                        for (const p of this.state.players) {
                            p.customStats[mut.statDef.name] = mut.statDef.defaultValue;
                        }
                        this.state.log.push(`✨ NOUVELLE STATISTIQUE GLOBALE : [${mut.statDef.name} ${mut.statDef.icon}] (base: ${mut.statDef.defaultValue}) !`);
                    }
                }
                break;
            }
            case 'MODIFY_STAT': {
                if (mut.statName && mut.value) {
                    for (const p of this.state.players) {
                        if (mut.statName === 'atk')
                            p.atk = Math.max(1, p.atk + mut.value);
                        else if (mut.statName === 'hp')
                            p.hp = Math.min(p.maxHp, p.hp + mut.value);
                        else {
                            p.customStats[mut.statName] = (p.customStats[mut.statName] || 0) + mut.value;
                        }
                    }
                    this.state.log.push(`⚡ Statistique [${mut.statName}] modifiée de ${mut.value > 0 ? '+' : ''}${mut.value} pour les joueurs !`);
                }
                break;
            }
        }
    }
    startNextRound() {
        this.state.roundNumber++;
        if (this.state.roundNumber > this.state.maxRounds) {
            // Game over! Winner has most kills
            const sorted = [...this.state.players].sort((a, b) => b.kills - a.kills || b.hp - a.hp);
            this.state.winner = sorted[0];
            this.state.status = 'FINISHED';
            this.state.log.push(`🏆 FIN DU JEU DU CHAOS ! ${sorted[0].username} triomphe avec ${sorted[0].kills} éliminations !`);
            return;
        }
        // Resurrect all players and reposition
        for (let i = 0; i < this.state.players.length; i++) {
            const p = this.state.players[i];
            p.hp = p.maxHp;
            p.isEliminated = false;
            const cellIndex = i % this.state.cells.length;
            p.cellId = this.state.cells[cellIndex]?.id || 'cell_0_0';
        }
        this.state.status = 'PLAYING';
        this.state.draftingPlayerId = null;
        this.state.draftingPlayerName = null;
        this.state.draftingReason = null;
        this.state.currentPlayerIndex = 0;
        this.state.log.push(`✨ MANCHE ${this.state.roundNumber} / ${this.state.maxRounds} COMMENCE ! Tous les joueurs ressuscitent.`);
        this.state.log.push(`⚠️ ${this.state.activeRules.length} DÉCRET(S) DU CHAOS SONT ACTIFS !`);
        this.evaluateRules('ON_ROUND_START', {});
    }
    // ─── RULE EVALUATION ──────────────────────────────────────────────────────
    evaluateRules(trigger, ctx) {
        for (const rule of this.state.activeRules) {
            if (rule.trigger !== trigger)
                continue;
            for (const eff of rule.effects) {
                const targets = this.resolveTargets(eff.target, ctx);
                for (const target of targets) {
                    switch (eff.type) {
                        case 'DAMAGE':
                            target.hp -= eff.value;
                            this.state.log.push(`💥 [${rule.title}] inflige ${eff.value} dégâts à ${target.username} !`);
                            if (target.hp <= 0 && this.state.status === 'PLAYING') {
                                this.handlePlayerDeath(target, `Anéanti par le décret [${rule.title}]`);
                                return;
                            }
                            break;
                        case 'HEAL':
                            target.hp = Math.min(target.maxHp, target.hp + eff.value);
                            this.state.log.push(`💚 [${rule.title}] soigne ${target.username} de ${eff.value} PV !`);
                            break;
                        case 'MODIFY_ATK':
                            target.atk = Math.max(1, target.atk + eff.value);
                            this.state.log.push(`🗡️ [${rule.title}] modifie l'ATK de ${target.username} de ${eff.value > 0 ? '+' : ''}${eff.value} !`);
                            break;
                        case 'MODIFY_STAT':
                            if (eff.statName) {
                                target.customStats[eff.statName] = (target.customStats[eff.statName] || 0) + eff.value;
                                this.state.log.push(`✨ [${rule.title}] ajuste ${eff.statName} de ${target.username} (${eff.value > 0 ? '+' : ''}${eff.value}).`);
                            }
                            break;
                    }
                }
            }
        }
    }
    resolveTargets(targetType, ctx) {
        const active = ctx?.activePlayer || ctx?.attacker || this.state.players[this.state.currentPlayerIndex];
        switch (targetType) {
            case 'CURRENT_PLAYER':
                return active ? [active] : [];
            case 'ALL_PLAYERS':
                return this.state.players.filter(p => !p.isEliminated);
            case 'ALL_OTHER_PLAYERS':
                return this.state.players.filter(p => p.id !== active?.id && !p.isEliminated);
            case 'TARGET_PLAYER':
                return ctx?.defender ? [ctx.defender] : [];
            case 'RANDOM_PLAYER': {
                const alive = this.state.players.filter(p => !p.isEliminated);
                return alive.length > 0 ? [alive[Math.floor(Math.random() * alive.length)]] : [];
            }
            default:
                return active ? [active] : [];
        }
    }
    resetGame() {
        this.state.status = 'LOBBY';
        this.state.roundNumber = 1;
        this.state.activeRules = [];
        this.state.winner = null;
        this.state.draftingPlayerId = null;
        this.state.lastAnnouncement = null;
        this.state.cells = JSON.parse(JSON.stringify(INITIAL_CELLS));
        this.state.definedStats = [];
        this.state.aiLogs = [];
        for (let i = 0; i < this.state.players.length; i++) {
            const p = this.state.players[i];
            p.cellId = this.state.cells[i % this.state.cells.length].id;
            p.hp = 100;
            p.maxHp = 100;
            p.atk = 25;
            p.customStats = {};
            p.isEliminated = false;
            p.kills = 0;
            p.roundsWon = 0;
        }
        this.state.log = ['Partie réinitialisée. En attente du départ...'];
        return true;
    }
}
exports.ChaosEngine = ChaosEngine;
