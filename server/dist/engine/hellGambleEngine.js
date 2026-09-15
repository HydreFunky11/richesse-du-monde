"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HellGambleEngine = void 0;
const skinsData_1 = require("../data/skinsData");
class HellGambleEngine {
    roomCode;
    players = new Map();
    liveFeed = [];
    activeBattles = [];
    recentBattles = [];
    onUpdate;
    constructor(roomCode, onUpdate) {
        this.roomCode = roomCode;
        this.onUpdate = onUpdate;
    }
    // ─── PLAYER MANAGEMENT ──────────────────────────────────────────────────────
    addPlayer(id, username, avatar) {
        let player = this.players.get(id);
        if (!player) {
            player = {
                id,
                username: username || 'Gambler',
                avatar: avatar || '🎰',
                cash: 1000.00, // $1 000 de faux cash de départ !
                inventory: [],
                totalOpened: 0,
                totalBattlesWon: 0,
                bestDrop: null,
                netWorth: 1000.00,
            };
            this.players.set(id, player);
        }
        else {
            player.username = username || player.username;
        }
        this.recalculateNetWorth(player);
        this.broadcastState();
        return player;
    }
    removePlayer(id) {
        // Si le joueur était dans des battles en attente, le rembourser et le retirer
        for (const battle of this.activeBattles) {
            if (battle.status === 'WAITING') {
                const pIndex = battle.participants.findIndex(p => p.playerId === id);
                if (pIndex !== -1) {
                    battle.participants.splice(pIndex, 1);
                }
            }
        }
        // Nettoyer les battles orphelines
        this.activeBattles = this.activeBattles.filter(b => b.participants.length > 0 || b.status !== 'WAITING');
        this.players.delete(id);
        this.broadcastState();
    }
    getPlayer(id) {
        return this.players.get(id);
    }
    getPlayers() {
        return Array.from(this.players.values());
    }
    recalculateNetWorth(player) {
        const invValue = player.inventory.reduce((sum, item) => sum + item.value, 0);
        player.netWorth = parseFloat((player.cash + invValue).toFixed(2));
    }
    broadcastState() {
        this.onUpdate(this.getState());
    }
    getState() {
        return {
            roomCode: this.roomCode,
            players: Array.from(this.players.values()).sort((a, b) => b.netWorth - a.netWorth),
            liveFeed: this.liveFeed.slice(0, 30),
            activeBattles: this.activeBattles,
            recentBattles: this.recentBattles.slice(0, 10),
        };
    }
    // ─── CASE OPENING ───────────────────────────────────────────────────────────
    openCase(playerId, caseId, count = 1) {
        const player = this.players.get(playerId);
        if (!player)
            return { success: false, error: 'Joueur introuvable.' };
        const caseDef = skinsData_1.CASES_DATABASE.find(c => c.id === caseId);
        if (!caseDef)
            return { success: false, error: 'Caisse introuvable.' };
        const actualCount = Math.max(1, Math.min(5, Math.floor(count || 1)));
        const totalCost = parseFloat((caseDef.price * actualCount).toFixed(2));
        if (player.cash < totalCost) {
            return { success: false, error: `Fonds insuffisants ($${player.cash.toFixed(2)} / $${totalCost.toFixed(2)} requis).` };
        }
        // Déduire le prix total
        player.cash = parseFloat((player.cash - totalCost).toFixed(2));
        player.totalOpened += actualCount;
        const drops = [];
        const createdItems = [];
        for (let k = 0; k < actualCount; k++) {
            const roll = (0, skinsData_1.rollCaseDrop)(caseDef);
            const newItem = {
                id: `${Date.now()}_${Math.random().toString(36).substr(2, 6)}_${k}`,
                skinId: roll.skin.id,
                name: roll.skin.name,
                weapon: roll.skin.weapon,
                rarity: roll.skin.rarity,
                value: roll.value,
                wear: roll.wear,
                float: roll.float,
                obtainedAt: Date.now() + k,
                obtainedFrom: caseDef.name,
            };
            player.inventory.unshift(newItem);
            createdItems.push(newItem);
            if (!player.bestDrop || newItem.value > player.bestDrop.value) {
                player.bestDrop = newItem;
            }
            // Générer séquence de roulette de 45 items pour ce slot
            const winningIndex = 38;
            const reelItems = [];
            for (let i = 0; i < 45; i++) {
                if (i === winningIndex) {
                    reelItems.push({
                        skinId: newItem.skinId,
                        name: newItem.name,
                        weapon: newItem.weapon,
                        rarity: newItem.rarity,
                        value: newItem.value,
                        accentColor: roll.skin.accentColor,
                        icon: roll.skin.icon,
                    });
                }
                else {
                    const randDrop = (0, skinsData_1.rollCaseDrop)(caseDef);
                    reelItems.push({
                        skinId: randDrop.skin.id,
                        name: randDrop.skin.name,
                        weapon: randDrop.skin.weapon,
                        rarity: randDrop.skin.rarity,
                        value: randDrop.value,
                        accentColor: randDrop.skin.accentColor,
                        icon: randDrop.skin.icon,
                    });
                }
            }
            drops.push({
                item: newItem,
                reelItems,
                winningIndex,
            });
            this.addLiveFeed(player, newItem, 'CASE');
        }
        this.recalculateNetWorth(player);
        this.broadcastState();
        return {
            success: true,
            item: drops[0].item,
            items: createdItems,
            reelItems: drops[0].reelItems,
            winningIndex: drops[0].winningIndex,
            drops,
        };
    }
    // ─── INVENTORY & SELLING ────────────────────────────────────────────────────
    sellItem(playerId, itemId) {
        const player = this.players.get(playerId);
        if (!player)
            return { success: false, error: 'Joueur introuvable.' };
        const itemIdx = player.inventory.findIndex(i => i.id === itemId);
        if (itemIdx === -1)
            return { success: false, error: 'Item introuvable dans l\'inventaire.' };
        const [sold] = player.inventory.splice(itemIdx, 1);
        player.cash = parseFloat((player.cash + sold.value).toFixed(2));
        this.recalculateNetWorth(player);
        this.broadcastState();
        return { success: true, soldValue: sold.value };
    }
    sellAll(playerId, maxPrice) {
        const player = this.players.get(playerId);
        if (!player)
            return { success: false, count: 0, totalGained: 0 };
        let totalGained = 0;
        const kept = [];
        for (const item of player.inventory) {
            if (maxPrice === undefined || item.value <= maxPrice) {
                totalGained += item.value;
            }
            else {
                kept.push(item);
            }
        }
        player.inventory = kept;
        player.cash = parseFloat((player.cash + totalGained).toFixed(2));
        this.recalculateNetWorth(player);
        this.broadcastState();
        return { success: true, count: player.inventory.length, totalGained: parseFloat(totalGained.toFixed(2)) };
    }
    claimBankruptBonus(playerId) {
        const player = this.players.get(playerId);
        if (!player)
            return { success: false, error: 'Joueur introuvable.' };
        const invValue = player.inventory.reduce((sum, item) => sum + item.value, 0);
        if (player.cash >= 10 || invValue >= 25) {
            return { success: false, error: 'Tu n\'es pas en faillite ! Tu as encore des ressources à revendre ou miser.' };
        }
        const bonus = 100.00;
        player.cash = parseFloat((player.cash + bonus).toFixed(2));
        this.recalculateNetWorth(player);
        this.broadcastState();
        return { success: true, bonusAmount: bonus };
    }
    // ─── UPGRADER HELLCASE ──────────────────────────────────────────────────────
    upgrade(playerId, wagerItemIds, cashWager, targetSkinId) {
        const player = this.players.get(playerId);
        if (!player)
            return { success: false, error: 'Joueur introuvable.' };
        const targetDef = (0, skinsData_1.getSkinDefinition)(targetSkinId);
        if (!targetDef)
            return { success: false, error: 'Skin cible invalide.' };
        // Calculer la mise
        let totalWager = 0;
        const itemsToBurn = [];
        for (const itemId of wagerItemIds) {
            const item = player.inventory.find(i => i.id === itemId);
            if (!item)
                return { success: false, error: 'Item sélectionné introuvable.' };
            itemsToBurn.push(item);
            totalWager += item.value;
        }
        if (cashWager > 0) {
            if (player.cash < cashWager)
                return { success: false, error: 'Fonds insuffisants pour la mise cash.' };
            totalWager += cashWager;
        }
        if (totalWager <= 0) {
            return { success: false, error: 'La mise totale doit être supérieure à $0.' };
        }
        const targetValue = targetDef.baseValue;
        if (targetValue <= totalWager) {
            return { success: false, error: 'Le skin cible doit avoir une valeur supérieure à votre mise.' };
        }
        // Calcul du pourcentage de chance Hellcase (95% RTP)
        const exactProb = (totalWager / targetValue) * 0.95;
        const clampedProb = Math.min(0.90, Math.max(0.01, exactProb)); // entre 1% et 90%
        // Retirer les items et le cash du joueur
        player.inventory = player.inventory.filter(i => !wagerItemIds.includes(i.id));
        if (cashWager > 0) {
            player.cash = parseFloat((player.cash - cashWager).toFixed(2));
        }
        // Tirer le roll entre 0 et 1
        const roll = Math.random();
        const won = roll <= clampedProb;
        // Angle d'arrêt de l'aiguille (360° total, le secteur gagnant va de 0 à clampedProb * 360)
        // On ajoute plusieurs tours complets (ex: 5 tours = 1800°) pour l'effet de rotation
        let landingSliceAngle = 0;
        if (won) {
            // Tombe dans le secteur vert [0, clampedProb * 360]
            landingSliceAngle = Math.random() * (clampedProb * 360);
        }
        else {
            // Tombe dans le secteur rouge/sombre [clampedProb * 360, 360]
            landingSliceAngle = (clampedProb * 360) + Math.random() * ((1 - clampedProb) * 360);
        }
        const totalRollAngle = 1800 + landingSliceAngle;
        let targetInstance;
        if (won) {
            const generated = (0, skinsData_1.generateSkinInstance)(targetDef.id, 'Upgrader');
            targetInstance = {
                id: `${Date.now()}_upg_${Math.random().toString(36).substr(2, 6)}`,
                skinId: generated.skin.id,
                name: generated.skin.name,
                weapon: generated.skin.weapon,
                rarity: generated.skin.rarity,
                value: generated.value,
                wear: generated.wear,
                float: generated.float,
                obtainedAt: Date.now(),
                obtainedFrom: 'Upgrader',
            };
            player.inventory.unshift(targetInstance);
            if (!player.bestDrop || targetInstance.value > player.bestDrop.value) {
                player.bestDrop = targetInstance;
            }
            this.addLiveFeed(player, targetInstance, 'UPGRADE');
        }
        this.recalculateNetWorth(player);
        this.broadcastState();
        return {
            success: true,
            won,
            roll,
            prob: clampedProb,
            targetItem: targetInstance,
            rollAngle: totalRollAngle,
        };
    }
    // ─── TRADE-UP CONTRACT (CONTRAT D'ÉCHANGE) ──────────────────────────────────
    tradeUp(playerId, itemIds) {
        const player = this.players.get(playerId);
        if (!player)
            return { success: false, error: 'Joueur introuvable.' };
        if (itemIds.length !== 10) {
            return { success: false, error: 'Il faut exactement 10 skins pour signer un contrat d\'échange.' };
        }
        const items = [];
        for (const id of itemIds) {
            const item = player.inventory.find(i => i.id === id);
            if (!item)
                return { success: false, error: 'Un ou plusieurs skins sélectionnés sont introuvables.' };
            items.push(item);
        }
        // Vérifier que tous les 10 items ont la même rareté
        const firstRarity = items[0].rarity;
        if (!items.every(i => i.rarity === firstRarity)) {
            return { success: false, error: 'Les 10 skins doivent tous être de la même rareté.' };
        }
        const rarityProgression = {
            consumer: 'milspec',
            milspec: 'restricted',
            restricted: 'classified',
            classified: 'covert',
            covert: 'special',
            special: 'contraband',
            contraband: null,
        };
        const targetRarity = rarityProgression[firstRarity];
        if (!targetRarity) {
            return { success: false, error: 'Impossible d\'améliorer cette rareté (déjà au niveau maximum).' };
        }
        // Trouver tous les skins de la rareté supérieure
        const candidateSkins = skinsData_1.SKINS_DATABASE.filter(s => s.rarity === targetRarity);
        if (candidateSkins.length === 0) {
            return { success: false, error: 'Aucun skin disponible dans le palier supérieur.' };
        }
        // Choisir un skin au hasard
        const chosenDef = candidateSkins[Math.floor(Math.random() * candidateSkins.length)];
        const generated = (0, skinsData_1.generateSkinInstance)(chosenDef.id, "Contrat d'échange");
        const wonItem = {
            id: `${Date.now()}_trade_${Math.random().toString(36).substr(2, 6)}`,
            skinId: generated.skin.id,
            name: generated.skin.name,
            weapon: generated.skin.weapon,
            rarity: generated.skin.rarity,
            value: generated.value,
            wear: generated.wear,
            float: generated.float,
            obtainedAt: Date.now(),
            obtainedFrom: "Contrat d'échange",
        };
        // Retirer les 10 skins de l'inventaire
        player.inventory = player.inventory.filter(i => !itemIds.includes(i.id));
        player.inventory.unshift(wonItem);
        if (!player.bestDrop || wonItem.value > player.bestDrop.value) {
            player.bestDrop = wonItem;
        }
        this.recalculateNetWorth(player);
        this.addLiveFeed(player, wonItem, 'TRADEUP');
        this.broadcastState();
        return { success: true, itemWon: wonItem };
    }
    // ─── CASE BATTLES (PVP MULTIJOUEUR SIMULTANÉ) ───────────────────────────────
    createBattle(playerId, caseIds, maxPlayers) {
        const player = this.players.get(playerId);
        if (!player)
            return { success: false, error: 'Joueur introuvable.' };
        if (!caseIds || caseIds.length === 0 || caseIds.length > 8) {
            return { success: false, error: 'Sélectionnez entre 1 et 8 caisses pour la battle.' };
        }
        // Calculer le coût
        let totalCost = 0;
        for (const cId of caseIds) {
            const cDef = skinsData_1.CASES_DATABASE.find(c => c.id === cId);
            if (!cDef)
                return { success: false, error: `Caisse invalide: ${cId}` };
            totalCost += cDef.price;
        }
        if (player.cash < totalCost) {
            return { success: false, error: `Fonds insuffisants ($${player.cash.toFixed(2)} / $${totalCost.toFixed(2)} requis).` };
        }
        // Déduire la mise du créateur
        player.cash = parseFloat((player.cash - totalCost).toFixed(2));
        this.recalculateNetWorth(player);
        const battle = {
            id: `battle_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            name: `Battle de ${player.username}`,
            hostId: player.id,
            hostName: player.username,
            maxPlayers,
            caseIds,
            costPerPlayer: totalCost,
            status: 'WAITING',
            participants: [
                {
                    playerId: player.id,
                    username: player.username,
                    avatar: player.avatar,
                    pulls: [],
                    totalValue: 0,
                }
            ],
            currentRound: 0,
            winnerId: null,
            allLoot: [],
            createdAt: Date.now(),
        };
        this.activeBattles.unshift(battle);
        this.broadcastState();
        return { success: true, battle };
    }
    joinBattle(playerId, battleId) {
        const player = this.players.get(playerId);
        if (!player)
            return { success: false, error: 'Joueur introuvable.' };
        const battle = this.activeBattles.find(b => b.id === battleId);
        if (!battle)
            return { success: false, error: 'Battle introuvable.' };
        if (battle.status !== 'WAITING') {
            return { success: false, error: 'Cette battle a déjà commencé ou est terminée.' };
        }
        if (battle.participants.some(p => p.playerId === playerId)) {
            return { success: false, error: 'Vous participez déjà à cette battle.' };
        }
        if (battle.participants.length >= battle.maxPlayers) {
            return { success: false, error: 'La battle est complète.' };
        }
        if (player.cash < battle.costPerPlayer) {
            return { success: false, error: `Fonds insuffisants ($${player.cash.toFixed(2)} / $${battle.costPerPlayer.toFixed(2)} requis).` };
        }
        // Déduire la mise
        player.cash = parseFloat((player.cash - battle.costPerPlayer).toFixed(2));
        this.recalculateNetWorth(player);
        battle.participants.push({
            playerId: player.id,
            username: player.username,
            avatar: player.avatar,
            pulls: [],
            totalValue: 0,
        });
        this.broadcastState();
        return { success: true };
    }
    leaveBattle(playerId, battleId) {
        const battle = this.activeBattles.find(b => b.id === battleId);
        if (!battle)
            return { success: false, error: 'Battle introuvable.' };
        if (battle.status !== 'WAITING') {
            return { success: false, error: 'Impossible de quitter une battle en cours.' };
        }
        const pIndex = battle.participants.findIndex(p => p.playerId === playerId);
        if (pIndex === -1)
            return { success: false, error: 'Vous ne participez pas à cette battle.' };
        // Rembourser le joueur
        const player = this.players.get(playerId);
        if (player) {
            player.cash = parseFloat((player.cash + battle.costPerPlayer).toFixed(2));
            this.recalculateNetWorth(player);
        }
        battle.participants.splice(pIndex, 1);
        // Si plus aucun participant, supprimer la battle
        if (battle.participants.length === 0) {
            this.activeBattles = this.activeBattles.filter(b => b.id !== battleId);
        }
        else if (battle.hostId === playerId) {
            // Désigner un nouvel hôte
            battle.hostId = battle.participants[0].playerId;
            battle.hostName = battle.participants[0].username;
        }
        this.broadcastState();
        return { success: true };
    }
    startBattle(playerId, battleId) {
        const battle = this.activeBattles.find(b => b.id === battleId);
        if (!battle)
            return { success: false, error: 'Battle introuvable.' };
        if (battle.hostId !== playerId) {
            return { success: false, error: 'Seul l\'hôte peut lancer la battle.' };
        }
        if (battle.participants.length < 2) {
            return { success: false, error: 'Il faut au moins 2 joueurs pour démarrer une battle.' };
        }
        battle.status = 'ROLLING';
        // Pré-calculer tous les tirages pour toutes les manches
        const allLoot = [];
        const roundsData = [];
        for (let roundIdx = 0; roundIdx < battle.caseIds.length; roundIdx++) {
            const caseId = battle.caseIds[roundIdx];
            const caseDef = skinsData_1.CASES_DATABASE.find(c => c.id === caseId);
            const participantPulls = [];
            for (const participant of battle.participants) {
                const roll = (0, skinsData_1.rollCaseDrop)(caseDef);
                const item = {
                    id: `${Date.now()}_bat_${Math.random().toString(36).substr(2, 6)}`,
                    skinId: roll.skin.id,
                    name: roll.skin.name,
                    weapon: roll.skin.weapon,
                    rarity: roll.skin.rarity,
                    value: roll.value,
                    wear: roll.wear,
                    float: roll.float,
                    obtainedAt: Date.now(),
                    obtainedFrom: `Battle: ${caseDef.name}`,
                };
                participant.pulls.push(item);
                participant.totalValue = parseFloat((participant.totalValue + item.value).toFixed(2));
                allLoot.push(item);
                // Reel items
                const winningIndex = 38;
                const reelItems = [];
                for (let i = 0; i < 45; i++) {
                    if (i === winningIndex) {
                        reelItems.push({
                            skinId: item.skinId,
                            name: item.name,
                            weapon: item.weapon,
                            rarity: item.rarity,
                            value: item.value,
                            accentColor: roll.skin.accentColor,
                            icon: roll.skin.icon,
                        });
                    }
                    else {
                        const rand = (0, skinsData_1.rollCaseDrop)(caseDef);
                        reelItems.push({
                            skinId: rand.skin.id,
                            name: rand.skin.name,
                            weapon: rand.skin.weapon,
                            rarity: rand.skin.rarity,
                            value: rand.value,
                            accentColor: rand.skin.accentColor,
                            icon: rand.skin.icon,
                        });
                    }
                }
                participantPulls.push({
                    playerId: participant.playerId,
                    item,
                    reelItems,
                    winningIndex,
                });
            }
            roundsData.push({
                caseDef,
                participantPulls,
            });
        }
        // Déterminer le vainqueur (score total le plus élevé)
        let bestScore = -1;
        let winnerId = battle.participants[0].playerId;
        for (const p of battle.participants) {
            if (p.totalValue > bestScore) {
                bestScore = p.totalValue;
                winnerId = p.playerId;
            }
        }
        battle.winnerId = winnerId;
        battle.allLoot = allLoot;
        battle.status = 'FINISHED';
        // Donner TOUS les skins unboxed au vainqueur ! (Winner Takes All)
        const winnerPlayer = this.players.get(winnerId);
        if (winnerPlayer) {
            winnerPlayer.inventory.unshift(...allLoot);
            winnerPlayer.totalBattlesWon += 1;
            for (const item of allLoot) {
                if (!winnerPlayer.bestDrop || item.value > winnerPlayer.bestDrop.value) {
                    winnerPlayer.bestDrop = item;
                }
            }
            this.recalculateNetWorth(winnerPlayer);
            this.addLiveFeed(winnerPlayer, allLoot[0], 'BATTLE');
        }
        // Recalculer pour tous les participants
        for (const p of battle.participants) {
            const pl = this.players.get(p.playerId);
            if (pl)
                this.recalculateNetWorth(pl);
        }
        // Déplacer dans recentBattles
        this.activeBattles = this.activeBattles.filter(b => b.id !== battleId);
        this.recentBattles.unshift(battle);
        this.broadcastState();
        const totalLootValue = parseFloat(allLoot.reduce((s, i) => s + i.value, 0).toFixed(2));
        return {
            success: true,
            battleResults: {
                rounds: roundsData,
                winnerId,
                totalLootValue,
            },
        };
    }
    // ─── LIVE FEED ──────────────────────────────────────────────────────────────
    addLiveFeed(player, item, source) {
        this.liveFeed.unshift({
            id: `${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            playerId: player.id,
            playerName: player.username,
            item,
            timestamp: Date.now(),
            source,
        });
        if (this.liveFeed.length > 50) {
            this.liveFeed = this.liveFeed.slice(0, 50);
        }
    }
}
exports.HellGambleEngine = HellGambleEngine;
