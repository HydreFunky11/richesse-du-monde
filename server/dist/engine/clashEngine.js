"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClashEngine = exports.CLASH_CARDS = void 0;
exports.CLASH_CARDS = {
    knight: {
        id: 'knight',
        name: 'Chevalier Loyal',
        cost: 3,
        type: 'troop',
        description: 'Combattant solide et équilibré au corps-à-corps.',
        emoji: '⚔️',
        targetAir: false,
        targetOnlyBuildings: false
    },
    archers: {
        id: 'archers',
        name: 'Archères Royales',
        cost: 3,
        type: 'troop',
        description: 'Duo d\'archères rapides attaquant au sol et en l\'air.',
        emoji: '🏹',
        count: 2,
        targetAir: true,
        targetOnlyBuildings: false
    },
    skeletons: {
        id: 'skeletons',
        name: 'Nuée de Squelettes',
        cost: 3,
        type: 'troop',
        description: 'Horde de 6 squelettes fragiles mais redoutables contre les gros tanks.',
        emoji: '💀',
        count: 6,
        targetAir: false,
        targetOnlyBuildings: false
    },
    giant: {
        id: 'giant',
        name: 'Géant de Pierre',
        cost: 5,
        type: 'troop',
        description: 'Colosse ignorant les troupes ennemies pour pulvériser les tours.',
        emoji: '🗿',
        targetAir: false,
        targetOnlyBuildings: true
    },
    wizard: {
        id: 'wizard',
        name: 'Pyromancien',
        cost: 4,
        type: 'troop',
        description: 'Mage de feu infligeant des dégâts de zone destructeurs.',
        emoji: '🧙',
        targetAir: true,
        targetOnlyBuildings: false
    },
    dragon: {
        id: 'dragon',
        name: 'Dragonnet Arcanique',
        cost: 4,
        type: 'troop',
        description: 'Créature volante cracheuse de feu, traverse la rivière sans pont.',
        emoji: '🐉',
        targetAir: true,
        targetOnlyBuildings: false
    },
    tesla: {
        id: 'tesla',
        name: 'Tour Tesla',
        cost: 4,
        type: 'building',
        description: 'Bâtiment défensif statique foudroyant les cibles au sol et en l\'air.',
        emoji: '⚡',
        targetAir: true,
        targetOnlyBuildings: false
    },
    fireball: {
        id: 'fireball',
        name: 'Boule de Feu Royale',
        cost: 4,
        type: 'spell',
        description: 'Sort lancé n\'importe où sur l\'arène. Dégâts de zone massifs.',
        emoji: '☄️',
        targetAir: true,
        targetOnlyBuildings: false
    }
};
const DECK_TEMPLATE = [
    'knight',
    'archers',
    'skeletons',
    'giant',
    'wizard',
    'dragon',
    'tesla',
    'fireball'
];
function shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}
class ClashEngine {
    roomCode;
    state;
    loopInterval = null;
    onStateUpdateCallback = null;
    lastTickTime = 0;
    botLastPlayTime = 0;
    constructor(roomCode) {
        this.roomCode = roomCode;
        this.state = this.createInitialState();
    }
    createInitialState() {
        return {
            status: 'LOBBY',
            roomCode: this.roomCode,
            players: [],
            spectators: [],
            towers: [],
            units: [],
            projectiles: [],
            timer: 180,
            isDoubleElixir: false,
            isSuddenDeath: false,
            winnerTeam: null,
            winnerUsername: null,
            blueScore: 0,
            redScore: 0,
            log: ['Bienvenue dans Clash of Realms ! En attente du duel...']
        };
    }
    getState() {
        return this.state;
    }
    getPlayers() {
        return this.state.players;
    }
    addPlayer(id, username, color) {
        // Check if player is reconnecting with the same username
        const existing = this.state.players.find(p => p.username.toLowerCase() === username.toLowerCase() || p.id === id);
        if (existing) {
            existing.id = id;
            return true;
        }
        if (this.state.status !== 'LOBBY') {
            // Allow joining as spectator
            if (!this.state.spectators.some(s => s.id === id)) {
                this.state.spectators.push({ id, username });
            }
            return true;
        }
        if (this.state.players.length >= 2) {
            if (!this.state.spectators.some(s => s.id === id)) {
                this.state.spectators.push({ id, username });
            }
            return true;
        }
        const team = this.state.players.length === 0 ? 'blue' : 'red';
        const shuffled = shuffle(DECK_TEMPLATE);
        const hand = shuffled.slice(0, 4);
        const nextCard = shuffled[4];
        const deck = shuffled.slice(5);
        const player = {
            id,
            username,
            color,
            team,
            elixir: 5,
            hand,
            nextCard,
            deck
        };
        this.state.players.push(player);
        this.state.log.push(`${username} a rejoint l'arène dans l'équipe ${team === 'blue' ? 'Bleue 🔷' : 'Rouge 🔴'} !`);
        return true;
    }
    addBot() {
        if (this.state.players.length >= 2)
            return false;
        const shuffled = shuffle(DECK_TEMPLATE);
        const botPlayer = {
            id: 'bot_ai',
            username: 'Chevalier Sombre (IA)',
            color: '#EF4444',
            team: 'red',
            elixir: 5,
            hand: shuffled.slice(0, 4),
            nextCard: shuffled[4],
            deck: shuffled.slice(5),
            isBot: true
        };
        this.state.players.push(botPlayer);
        this.state.log.push(`Chevalier Sombre (IA) a rejoint l'arène !`);
        return true;
    }
    removePlayer(id) {
        this.state.players = this.state.players.filter(p => p.id !== id);
        this.state.spectators = this.state.spectators.filter(s => s.id !== id);
        if (this.state.players.length === 0) {
            this.stopLoop();
            this.state.status = 'FINISHED';
        }
    }
    startGame() {
        if (this.state.players.length < 1)
            return false;
        // If only 1 player, automatically add bot
        if (this.state.players.length === 1) {
            this.addBot();
        }
        this.state.status = 'PLAYING';
        this.state.timer = 180;
        this.state.isDoubleElixir = false;
        this.state.isSuddenDeath = false;
        this.state.units = [];
        this.state.projectiles = [];
        this.state.blueScore = 0;
        this.state.redScore = 0;
        this.state.winnerTeam = null;
        this.state.winnerUsername = null;
        // Reset players elixir & cards
        this.state.players.forEach(p => {
            p.elixir = 5;
            const shuffled = shuffle(DECK_TEMPLATE);
            p.hand = shuffled.slice(0, 4);
            p.nextCard = shuffled[4];
            p.deck = shuffled.slice(5);
        });
        // Initialize 6 Towers (3 Blue, 3 Red)
        // Coords: X from 0 to 100, Y from 0 to 160. River at Y=80.
        this.state.towers = [
            // Red Towers (Top)
            {
                id: 'red_king',
                type: 'king',
                team: 'red',
                x: 50,
                y: 15,
                hp: 3500,
                maxHp: 3500,
                range: 20,
                damage: 120,
                attackSpeed: 1.2,
                lastAttackTime: 0,
                isActive: false
            },
            {
                id: 'red_princess_left',
                type: 'princess_left',
                team: 'red',
                x: 21,
                y: 35,
                hp: 2000,
                maxHp: 2000,
                range: 18,
                damage: 85,
                attackSpeed: 0.8,
                lastAttackTime: 0,
                isActive: true
            },
            {
                id: 'red_princess_right',
                type: 'princess_right',
                team: 'red',
                x: 79,
                y: 35,
                hp: 2000,
                maxHp: 2000,
                range: 18,
                damage: 85,
                attackSpeed: 0.8,
                lastAttackTime: 0,
                isActive: true
            },
            // Blue Towers (Bottom)
            {
                id: 'blue_king',
                type: 'king',
                team: 'blue',
                x: 50,
                y: 145,
                hp: 3500,
                maxHp: 3500,
                range: 20,
                damage: 120,
                attackSpeed: 1.2,
                lastAttackTime: 0,
                isActive: false
            },
            {
                id: 'blue_princess_left',
                type: 'princess_left',
                team: 'blue',
                x: 21,
                y: 125,
                hp: 2000,
                maxHp: 2000,
                range: 18,
                damage: 85,
                attackSpeed: 0.8,
                lastAttackTime: 0,
                isActive: true
            },
            {
                id: 'blue_princess_right',
                type: 'princess_right',
                team: 'blue',
                x: 79,
                y: 125,
                hp: 2000,
                maxHp: 2000,
                range: 18,
                damage: 85,
                attackSpeed: 0.8,
                lastAttackTime: 0,
                isActive: true
            }
        ];
        this.state.log.push('⚔️ Le combat commence ! Que les meilleures troupes l\'emportent !');
        return true;
    }
    playCard(playerId, cardId, x, y) {
        if (this.state.status !== 'PLAYING')
            return false;
        const player = this.state.players.find(p => p.id === playerId);
        if (!player)
            return false;
        const cardDef = exports.CLASH_CARDS[cardId];
        if (!cardDef)
            return false;
        if (player.elixir < cardDef.cost)
            return false;
        if (!player.hand.includes(cardId))
            return false;
        // Validate Placement Zone:
        // Blue is Y > 80, Red is Y < 80
        // Spells can be cast anywhere.
        if (cardDef.type !== 'spell') {
            const redLeftDown = !this.state.towers.some(t => t.id === 'red_princess_left' && t.hp > 0);
            const redRightDown = !this.state.towers.some(t => t.id === 'red_princess_right' && t.hp > 0);
            const blueLeftDown = !this.state.towers.some(t => t.id === 'blue_princess_left' && t.hp > 0);
            const blueRightDown = !this.state.towers.some(t => t.id === 'blue_princess_right' && t.hp > 0);
            if (player.team === 'blue') {
                let minY = 80;
                if (redLeftDown && x <= 50)
                    minY = 50;
                if (redRightDown && x > 50)
                    minY = 50;
                if (y < minY)
                    return false;
            }
            else {
                let maxY = 80;
                if (blueLeftDown && x <= 50)
                    maxY = 110;
                if (blueRightDown && x > 50)
                    maxY = 110;
                if (y > maxY)
                    return false;
            }
        }
        // Deduct Elixir
        player.elixir -= cardDef.cost;
        // Cycle card: replace played card with nextCard, draw from deck
        const cardIndex = player.hand.indexOf(cardId);
        player.hand[cardIndex] = player.nextCard;
        player.deck.push(cardId);
        player.nextCard = player.deck.shift();
        // Spawn entity / cast spell
        this.spawnCardEntities(player.team, cardId, x, y);
        return true;
    }
    spawnCardEntities(team, cardId, x, y) {
        const now = Date.now();
        switch (cardId) {
            case 'knight': {
                this.state.units.push({
                    id: `knight_${now}_${Math.random()}`,
                    cardId: 'knight',
                    team,
                    x,
                    y,
                    hp: 1250,
                    maxHp: 1250,
                    damage: 145,
                    attackSpeed: 1.1,
                    lastAttackTime: 0,
                    speed: 1.2,
                    range: 3,
                    isFlying: false,
                    targetOnlyBuildings: false,
                    targetAir: false
                });
                break;
            }
            case 'archers': {
                [-2.5, 2.5].forEach(dx => {
                    this.state.units.push({
                        id: `archer_${now}_${Math.random()}`,
                        cardId: 'archers',
                        team,
                        x: Math.max(5, Math.min(95, x + dx)),
                        y,
                        hp: 400,
                        maxHp: 400,
                        damage: 85,
                        attackSpeed: 1.0,
                        lastAttackTime: 0,
                        speed: 1.2,
                        range: 15,
                        isFlying: false,
                        targetOnlyBuildings: false,
                        targetAir: true
                    });
                });
                break;
            }
            case 'skeletons': {
                const offsets = [
                    [-2, -2], [2, -2],
                    [-3, 0], [3, 0],
                    [-2, 2], [2, 2]
                ];
                offsets.forEach(([dx, dy]) => {
                    this.state.units.push({
                        id: `skel_${now}_${Math.random()}`,
                        cardId: 'skeletons',
                        team,
                        x: Math.max(5, Math.min(95, x + dx)),
                        y: Math.max(10, Math.min(150, y + dy)),
                        hp: 120,
                        maxHp: 120,
                        damage: 85,
                        attackSpeed: 0.8,
                        lastAttackTime: 0,
                        speed: 1.7,
                        range: 2.5,
                        isFlying: false,
                        targetOnlyBuildings: false,
                        targetAir: false
                    });
                });
                break;
            }
            case 'giant': {
                this.state.units.push({
                    id: `giant_${now}_${Math.random()}`,
                    cardId: 'giant',
                    team,
                    x,
                    y,
                    hp: 3300,
                    maxHp: 3300,
                    damage: 210,
                    attackSpeed: 1.5,
                    lastAttackTime: 0,
                    speed: 0.75,
                    range: 3,
                    isFlying: false,
                    targetOnlyBuildings: true,
                    targetAir: false
                });
                break;
            }
            case 'wizard': {
                this.state.units.push({
                    id: `wizard_${now}_${Math.random()}`,
                    cardId: 'wizard',
                    team,
                    x,
                    y,
                    hp: 580,
                    maxHp: 580,
                    damage: 170,
                    attackSpeed: 1.4,
                    lastAttackTime: 0,
                    speed: 1.1,
                    range: 14,
                    isFlying: false,
                    targetOnlyBuildings: false,
                    targetAir: true,
                    aoeRadius: 8
                });
                break;
            }
            case 'dragon': {
                this.state.units.push({
                    id: `dragon_${now}_${Math.random()}`,
                    cardId: 'dragon',
                    team,
                    x,
                    y,
                    hp: 1100,
                    maxHp: 1100,
                    damage: 130,
                    attackSpeed: 1.3,
                    lastAttackTime: 0,
                    speed: 1.4,
                    range: 10,
                    isFlying: true,
                    targetOnlyBuildings: false,
                    targetAir: true,
                    aoeRadius: 6
                });
                break;
            }
            case 'tesla': {
                this.state.units.push({
                    id: `tesla_${now}_${Math.random()}`,
                    cardId: 'tesla',
                    team,
                    x,
                    y,
                    hp: 950,
                    maxHp: 950,
                    damage: 140,
                    attackSpeed: 0.9,
                    lastAttackTime: 0,
                    speed: 0,
                    range: 16,
                    isFlying: false,
                    targetOnlyBuildings: false,
                    targetAir: true,
                    lifetime: 35,
                    maxLifetime: 35
                });
                break;
            }
            case 'fireball': {
                // Projectile launched from king tower towards (x, y)
                const startTower = this.state.towers.find(t => t.team === team && t.type === 'king');
                const startX = startTower ? startTower.x : (team === 'blue' ? 50 : 50);
                const startY = startTower ? startTower.y : (team === 'blue' ? 145 : 15);
                this.state.projectiles.push({
                    id: `fireball_${now}_${Math.random()}`,
                    fromX: startX,
                    fromY: startY,
                    currentX: startX,
                    currentY: startY,
                    targetX: x,
                    targetY: y,
                    speed: 70, // units/sec
                    damage: 550,
                    aoeRadius: 12,
                    type: 'fireball',
                    team
                });
                break;
            }
        }
    }
    startLoop(callback) {
        this.stopLoop();
        this.onStateUpdateCallback = callback;
        this.lastTickTime = Date.now();
        this.botLastPlayTime = Date.now();
        this.loopInterval = setInterval(() => {
            this.tick();
            if (this.onStateUpdateCallback) {
                this.onStateUpdateCallback(this.state);
            }
        }, 50); // 20 FPS simulation
    }
    stopLoop() {
        if (this.loopInterval) {
            clearInterval(this.loopInterval);
            this.loopInterval = null;
        }
    }
    tick() {
        if (this.state.status !== 'PLAYING')
            return;
        const now = Date.now();
        const dt = Math.min((now - this.lastTickTime) / 1000, 0.1);
        this.lastTickTime = now;
        // 1. Timer & Elixir
        this.updateTimerAndElixir(dt);
        // 2. Bot AI
        this.updateBotAI(now);
        // 3. Projectiles
        this.updateProjectiles(dt);
        // 4. Units lifetime, combat, and movement
        this.updateUnits(dt, now);
        // 5. Towers defense
        this.updateTowers(now);
        // 6. Check Win Condition
        this.checkEndConditions();
    }
    updateTimerAndElixir(dt) {
        this.state.timer -= dt;
        if (this.state.timer <= 60 && !this.state.isDoubleElixir) {
            this.state.isDoubleElixir = true;
            this.state.log.push('⚡ DOUBLE ÉLIXIR ! Le rythme s\'accélère !');
        }
        const elixirRate = this.state.isDoubleElixir ? 0.8 : 0.4; // elixir per second
        this.state.players.forEach(p => {
            p.elixir = Math.min(10, p.elixir + elixirRate * dt);
        });
    }
    updateBotAI(now) {
        const bot = this.state.players.find(p => p.isBot);
        if (!bot)
            return;
        if (now - this.botLastPlayTime > 3500 && bot.elixir >= 4) {
            // Pick a random playable card
            const playableCards = bot.hand.filter(c => exports.CLASH_CARDS[c].cost <= bot.elixir);
            if (playableCards.length > 0) {
                const card = playableCards[Math.floor(Math.random() * playableCards.length)];
                const cardDef = exports.CLASH_CARDS[card];
                // Choose lane (left bridge X=21 or right bridge X=79)
                const laneX = Math.random() < 0.5 ? 21 : 79;
                const targetX = Math.max(10, Math.min(90, laneX + (Math.random() * 8 - 4)));
                const targetY = cardDef.type === 'spell'
                    ? (Math.random() < 0.5 ? 125 : 145) // target blue towers
                    : 45 + Math.random() * 25; // deploy in red back half
                this.playCard(bot.id, card, targetX, targetY);
                this.botLastPlayTime = now;
            }
        }
    }
    updateProjectiles(dt) {
        for (let i = this.state.projectiles.length - 1; i >= 0; i--) {
            const p = this.state.projectiles[i];
            // Move projectile towards target
            const dx = p.targetX - p.currentX;
            const dy = p.targetY - p.currentY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const step = p.speed * dt;
            if (dist <= step || dist < 1) {
                // Projectile Arrived!
                this.detonateProjectile(p);
                this.state.projectiles.splice(i, 1);
            }
            else {
                p.currentX += (dx / dist) * step;
                p.currentY += (dy / dist) * step;
            }
        }
    }
    detonateProjectile(p) {
        const enemyTeam = p.team === 'blue' ? 'red' : 'blue';
        if (p.aoeRadius) {
            // AOE hit on units
            this.state.units.forEach(u => {
                if (u.team === enemyTeam) {
                    const d = Math.sqrt((u.x - p.targetX) ** 2 + (u.y - p.targetY) ** 2);
                    if (d <= p.aoeRadius) {
                        u.hp -= p.damage;
                    }
                }
            });
            // AOE hit on towers (reduced damage)
            const towerDamage = Math.round(p.damage * 0.4);
            this.state.towers.forEach(t => {
                if (t.team === enemyTeam && t.hp > 0) {
                    const d = Math.sqrt((t.x - p.targetX) ** 2 + (t.y - p.targetY) ** 2);
                    if (d <= p.aoeRadius + 4) {
                        t.hp = Math.max(0, t.hp - towerDamage);
                        if (t.type === 'king' && !t.isActive)
                            t.isActive = true;
                    }
                }
            });
        }
        else if (p.targetUnitId) {
            // Single target hit
            const unit = this.state.units.find(u => u.id === p.targetUnitId);
            if (unit && unit.hp > 0) {
                unit.hp -= p.damage;
            }
        }
    }
    updateUnits(dt, now) {
        // Filter dead units & reduce building lifetime
        for (let i = this.state.units.length - 1; i >= 0; i--) {
            const u = this.state.units[i];
            if (u.lifetime !== undefined) {
                u.lifetime -= dt;
                if (u.lifetime <= 0)
                    u.hp = 0;
            }
            if (u.hp <= 0) {
                this.state.units.splice(i, 1);
            }
        }
        // Process each living unit
        this.state.units.forEach(unit => {
            if (unit.speed === 0) {
                // Static building (Tesla)
                this.processUnitAttack(unit, now);
                return;
            }
            // Find Target
            const target = this.findTargetForUnit(unit);
            if (!target)
                return;
            const dist = Math.sqrt((target.x - unit.x) ** 2 + (target.y - unit.y) ** 2);
            if (dist <= unit.range) {
                // In attack range -> Attack!
                if (now - unit.lastAttackTime >= unit.attackSpeed * 1000) {
                    unit.lastAttackTime = now;
                    this.executeUnitAttack(unit, target);
                }
            }
            else {
                // Move towards target
                this.moveUnitTowards(unit, target.x, target.y, dt);
            }
        });
    }
    findTargetForUnit(unit) {
        const enemyTeam = unit.team === 'blue' ? 'red' : 'blue';
        // 1. If targetOnlyBuildings -> only look for enemy towers and enemy buildings
        if (unit.targetOnlyBuildings) {
            let closest = null;
            let minDist = Infinity;
            for (const t of this.state.towers) {
                if (t.team === enemyTeam && t.hp > 0) {
                    const d = Math.sqrt((t.x - unit.x) ** 2 + (t.y - unit.y) ** 2);
                    if (d < minDist) {
                        minDist = d;
                        closest = { x: t.x, y: t.y, id: t.id, isTower: true };
                    }
                }
            }
            for (const u of this.state.units) {
                if (u.team === enemyTeam && u.speed === 0 && u.hp > 0) {
                    const d = Math.sqrt((u.x - unit.x) ** 2 + (u.y - unit.y) ** 2);
                    if (d < minDist) {
                        minDist = d;
                        closest = { x: u.x, y: u.y, id: u.id, isTower: false };
                    }
                }
            }
            return closest;
        }
        // 2. Regular unit -> Check for enemy units within sight range (22 units)
        let closestUnit = null;
        let minUnitDist = 22;
        for (const enemy of this.state.units) {
            if (enemy.team === enemyTeam && enemy.hp > 0) {
                if (enemy.isFlying && !unit.targetAir)
                    continue; // cannot target flying
                const d = Math.sqrt((enemy.x - unit.x) ** 2 + (enemy.y - unit.y) ** 2);
                if (d < minUnitDist) {
                    minUnitDist = d;
                    closestUnit = enemy;
                }
            }
        }
        if (closestUnit) {
            const u = closestUnit;
            return { x: u.x, y: u.y, id: u.id, isTower: false };
        }
        // 3. Otherwise, target closest enemy tower
        let closestTower = null;
        let minTowerDist = Infinity;
        for (const t of this.state.towers) {
            if (t.team === enemyTeam && t.hp > 0) {
                const d = Math.sqrt((t.x - unit.x) ** 2 + (t.y - unit.y) ** 2);
                if (d < minTowerDist) {
                    minTowerDist = d;
                    closestTower = t;
                }
            }
        }
        if (closestTower) {
            const ct = closestTower;
            return { x: ct.x, y: ct.y, id: ct.id, isTower: true };
        }
        return null;
    }
    moveUnitTowards(unit, targetX, targetY, dt) {
        let destX = targetX;
        let destY = targetY;
        // Ground units routing through bridges if crossing the river (Y=80)
        if (!unit.isFlying) {
            const isBlueToRed = unit.y > 85 && targetY < 75;
            const isRedToBlue = unit.y < 75 && targetY > 85;
            if (isBlueToRed || isRedToBlue) {
                // Choose closer bridge (X=21 or X=79)
                const bridgeX = Math.abs(unit.x - 21) <= Math.abs(unit.x - 79) ? 21 : 79;
                destX = bridgeX;
                destY = isBlueToRed ? 78 : 82;
            }
        }
        const dx = destX - unit.x;
        const dy = destY - unit.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0.1) {
            const moveStep = unit.speed * 8 * dt; // speed scale
            unit.x += (dx / dist) * moveStep;
            unit.y += (dy / dist) * moveStep;
        }
    }
    executeUnitAttack(unit, target) {
        if (unit.aoeRadius) {
            // Launch AOE projectile or explode
            this.state.projectiles.push({
                id: `proj_${Date.now()}_${Math.random()}`,
                fromX: unit.x,
                fromY: unit.y,
                currentX: unit.x,
                currentY: unit.y,
                targetX: target.x,
                targetY: target.y,
                speed: 40,
                damage: unit.damage,
                aoeRadius: unit.aoeRadius,
                type: 'fireball',
                team: unit.team
            });
        }
        else if (unit.range > 5) {
            // Ranged single target projectile
            this.state.projectiles.push({
                id: `proj_${Date.now()}_${Math.random()}`,
                fromX: unit.x,
                fromY: unit.y,
                currentX: unit.x,
                currentY: unit.y,
                targetX: target.x,
                targetY: target.y,
                speed: 55,
                damage: unit.damage,
                type: unit.cardId === 'tesla' ? 'lightning' : 'arrow',
                team: unit.team,
                targetUnitId: target.isTower ? undefined : target.id
            });
            if (target.isTower) {
                const t = this.state.towers.find(tw => tw.id === target.id);
                if (t) {
                    t.hp = Math.max(0, t.hp - unit.damage);
                    if (t.type === 'king' && !t.isActive)
                        t.isActive = true;
                }
            }
        }
        else {
            // Melee instant hit
            if (target.isTower) {
                const t = this.state.towers.find(tw => tw.id === target.id);
                if (t) {
                    t.hp = Math.max(0, t.hp - unit.damage);
                    if (t.type === 'king' && !t.isActive)
                        t.isActive = true;
                }
            }
            else {
                const u = this.state.units.find(un => un.id === target.id);
                if (u) {
                    u.hp = Math.max(0, u.hp - unit.damage);
                }
            }
        }
    }
    processUnitAttack(unit, now) {
        if (now - unit.lastAttackTime < unit.attackSpeed * 1000)
            return;
        const target = this.findTargetForUnit(unit);
        if (!target)
            return;
        const dist = Math.sqrt((target.x - unit.x) ** 2 + (target.y - unit.y) ** 2);
        if (dist <= unit.range) {
            unit.lastAttackTime = now;
            this.executeUnitAttack(unit, target);
        }
    }
    updateTowers(now) {
        this.state.towers.forEach(tower => {
            if (tower.hp <= 0)
                return;
            if (tower.type === 'king' && !tower.isActive)
                return;
            if (now - tower.lastAttackTime >= tower.attackSpeed * 1000) {
                const enemyTeam = tower.team === 'blue' ? 'red' : 'blue';
                let closest = null;
                let minDist = tower.range;
                this.state.units.forEach(u => {
                    if (u.team === enemyTeam && u.hp > 0) {
                        const d = Math.sqrt((u.x - tower.x) ** 2 + (u.y - tower.y) ** 2);
                        if (d < minDist) {
                            minDist = d;
                            closest = u;
                        }
                    }
                });
                if (closest) {
                    tower.lastAttackTime = now;
                    this.state.projectiles.push({
                        id: `tower_proj_${now}_${Math.random()}`,
                        fromX: tower.x,
                        fromY: tower.y,
                        currentX: tower.x,
                        currentY: tower.y,
                        targetX: closest.x,
                        targetY: closest.y,
                        speed: 55,
                        damage: tower.damage,
                        type: tower.type === 'king' ? 'cannon' : 'arrow',
                        team: tower.team,
                        targetUnitId: closest.id
                    });
                }
            }
        });
        // Count score & check destroyed towers
        const blueDestroyed = this.state.towers.filter(t => t.team === 'red' && t.hp <= 0).length;
        const redDestroyed = this.state.towers.filter(t => t.team === 'blue' && t.hp <= 0).length;
        this.state.blueScore = blueDestroyed;
        this.state.redScore = redDestroyed;
    }
    checkEndConditions() {
        const redKing = this.state.towers.find(t => t.id === 'red_king');
        const blueKing = this.state.towers.find(t => t.id === 'blue_king');
        // 1. King Tower Destroyed (3-Crown Victory)
        if (redKing && redKing.hp <= 0) {
            this.finishGame('blue', 'Victoire écrasante de l\'équipe Bleue (3 Couronnes) ! 👑👑👑');
            return;
        }
        if (blueKing && blueKing.hp <= 0) {
            this.finishGame('red', 'Victoire écrasante de l\'équipe Rouge (3 Couronnes) ! 👑👑👑');
            return;
        }
        // 2. Sudden Death condition
        if (this.state.isSuddenDeath) {
            if (this.state.blueScore > this.state.redScore) {
                this.finishGame('blue', 'Victoire en Mort Subite de l\'équipe Bleue ! ⚡');
                return;
            }
            else if (this.state.redScore > this.state.blueScore) {
                this.finishGame('red', 'Victoire en Mort Subite de l\'équipe Rouge ! ⚡');
                return;
            }
        }
        // 3. Regular Timer Expiration
        if (this.state.timer <= 0) {
            if (this.state.blueScore > this.state.redScore) {
                this.finishGame('blue', 'Temps écoulé : Victoire de l\'équipe Bleue ! 🏆');
            }
            else if (this.state.redScore > this.state.blueScore) {
                this.finishGame('red', 'Temps écoulé : Victoire de l\'équipe Rouge ! 🏆');
            }
            else if (!this.state.isSuddenDeath) {
                // Trigger Sudden Death (60s)
                this.state.isSuddenDeath = true;
                this.state.timer = 60;
                this.state.isDoubleElixir = true;
                this.state.log.push('🚨 ÉGALITÉ ! MORT SUBITE ACTIVÉE (La prochaine tour détruite gagne) !');
            }
            else {
                // Sudden death also expired -> Draw
                this.finishGame('DRAW', 'Fin du temps : Match Nul héroïque ! 🤝');
            }
        }
    }
    finishGame(winnerTeam, logMessage) {
        this.stopLoop();
        this.state.status = 'FINISHED';
        this.state.winnerTeam = winnerTeam;
        this.state.log.push(logMessage);
        if (winnerTeam !== 'DRAW') {
            const winnerPlayer = this.state.players.find(p => p.team === winnerTeam);
            this.state.winnerUsername = winnerPlayer ? winnerPlayer.username : `Équipe ${winnerTeam}`;
        }
    }
    resetGame() {
        this.stopLoop();
        this.state.status = 'LOBBY';
        this.state.units = [];
        this.state.projectiles = [];
        this.state.towers = [];
        this.state.timer = 180;
        this.state.isDoubleElixir = false;
        this.state.isSuddenDeath = false;
        this.state.winnerTeam = null;
        this.state.winnerUsername = null;
        this.state.blueScore = 0;
        this.state.redScore = 0;
        this.state.log.push('Salon réinitialisé. Préparez vos decks pour la revanche !');
    }
}
exports.ClashEngine = ClashEngine;
