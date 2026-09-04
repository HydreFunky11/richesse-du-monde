"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.interpretChaosRule = interpretChaosRule;
exports.generateFallbackRule = generateFallbackRule;
const FALLBACK_B64 = 'c2stb3ItdjEtZjZiNTlkNjNlZDYyMGMxYTk3Mzg0MGUzNGI0OTgxOWIyMWJkMDA5ODExZTUwNGM2NTUxOWIxZjU1OWExZWNiNQ==';
function getApiKey() {
    if (process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY.trim().length > 10) {
        return process.env.OPENROUTER_API_KEY.trim();
    }
    return Buffer.from(FALLBACK_B64, 'base64').toString('utf8');
}
async function interpretChaosRule(userRuleText, authorName, roundNumber, onLog) {
    const apiKey = getApiKey();
    const timestamp = new Date().toLocaleTimeString('fr-FR');
    onLog?.({
        timestamp,
        status: 'CALLING',
        message: `[IA] Début de l'analyse du décret de ${authorName} : "${userRuleText}"`,
        promptSnippet: userRuleText
    });
    const systemPrompt = `Tu es le Grand Législateur Démoniaque du jeu "Chaos Board".
Dans ce jeu tactique au tour par tour, les joueurs ont 2 statistiques de base : PV (max 100) et ATK (base 20).
Le plateau commence avec 6 cases disposées en 3x2 (coordonnées x: 0..2, y: 0..1).
Les joueurs cliquent sur les cases pour se déplacer. S'ils arrivent sur une case contenant un ennemi, un combat s'engage. S'ils arrivent sur une case avec un autre joueur, un duel PvP se déclenche !
Quand un joueur meurt, il a le POUVOIR TOTAL de dicter N'IMPORTE QUELLE MODIFICATION du jeu :
- Ajouter, modifier ou supprimer des cases du plateau.
- Spawner des ennemis/monstres redoutables sur une case.
- Créer de toutes nouvelles statistiques (ex: Armure, Poison, Mana, Vitesse, Esquive...).
- Modifier les stats des joueurs.
- Créer des règles de combat, de déplacement, de meurtre, ou de manche.

Le joueur décédé (${authorName}) a écrit ce souhait/décret :
"${userRuleText}"

Ta mission :
1. "title": Un titre court, épique et mémorable (max 5 mots).
2. "description": Une explication claire et concise de l'effet en jeu.
3. "flavorText": Une phrase sarcastique ou drôle se moquant de la mort de ${authorName} ou avertissant les survivants.
4. "trigger": "ON_MOVE" | "ON_PVP" | "ON_PVE" | "ON_KILL" | "ON_TURN_START" | "ON_ROUND_START" | "ON_CELL_ENTER".
5. "effects": liste d'effets [{ "type": "DAMAGE" | "HEAL" | "MODIFY_ATK" | "MODIFY_STAT" | "TELEPORT", "target": "CURRENT_PLAYER" | "ALL_PLAYERS" | "ALL_OTHER_PLAYERS" | "TARGET_PLAYER", "statName": "string", "value": number }].
6. "boardMutations": liste de mutations concrètes du plateau :
   - Ajouter une case : { "action": "ADD_CELL", "cell": { "name": "Donjon Maudit", "icon": "🏰", "x": 3, "y": 0, "description": "Piège mortel" } }
   - Supprimer une case : { "action": "REMOVE_CELL", "cellId": "cell_1_1" }
   - Modifier une case : { "action": "MODIFY_CELL", "cellId": "cell_0_0", "cell": { "name": "Fosse de Lave", "icon": "🔥", "description": "-30 PV" } }
   - Spawner un ennemi : { "action": "SPAWN_ENEMY", "cellId": "cell_0_0", "enemy": { "name": "Liche Suprême", "icon": "💀", "hp": 50, "atk": 25, "reward": "+15 ATK permanent" } }
   - Ajouter une nouvelle statistique : { "action": "ADD_STAT", "statDef": { "name": "Armure", "icon": "🛡️", "description": "Réduit les dégâts", "defaultValue": 5 } }
   - Modifier une statistique : { "action": "MODIFY_STAT", "target": "ALL_PLAYERS", "statName": "atk", "value": 10 }

IMPORTANT: Réponds UNIQUEMENT avec un JSON valide, sans aucune balise de code markdown.
`;
    const models = [
        'minimax/minimax-m3:free',
        'minimax/minimax-m2.7:free',
        'google/gemma-4-31b-it:free'
    ];
    for (const model of models) {
        const startTime = Date.now();
        try {
            onLog?.({
                timestamp: new Date().toLocaleTimeString('fr-FR'),
                status: 'CALLING',
                model,
                message: `[IA] Envoi de la requête au modèle ${model} via OpenRouter...`
            });
            const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'HTTP-Referer': 'https://richesse-du-monde.onrender.com',
                    'X-Title': 'Chaos Board'
                },
                body: JSON.stringify({
                    model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: `Décret proclamé par ${authorName} : "${userRuleText}"` }
                    ],
                    temperature: 0.7
                })
            });
            const latencyMs = Date.now() - startTime;
            if (!res.ok) {
                const errText = await res.text().catch(() => '');
                console.warn(`[ChaosAI] Model ${model} HTTP ${res.status}:`, errText);
                onLog?.({
                    timestamp: new Date().toLocaleTimeString('fr-FR'),
                    status: 'ERROR',
                    model,
                    latencyMs,
                    message: `[IA] Modèle ${model} a retourné une erreur HTTP ${res.status}. Bascule sur le modèle suivant...`
                });
                continue;
            }
            const data = (await res.json());
            const content = data.choices?.[0]?.message?.content?.trim();
            if (!content)
                continue;
            let jsonStr = content;
            if (jsonStr.includes('{') && jsonStr.includes('}')) {
                const start = jsonStr.indexOf('{');
                const end = jsonStr.lastIndexOf('}') + 1;
                jsonStr = jsonStr.slice(start, end);
            }
            const parsed = JSON.parse(jsonStr);
            const rule = {
                id: `rule_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
                roundIntroduced: roundNumber,
                authorName,
                rawInput: userRuleText,
                title: parsed.title || `Décret de ${authorName}`,
                description: parsed.description || userRuleText,
                flavorText: parsed.flavorText || `${authorName} réécrit les règles fondamentales du jeu !`,
                trigger: parsed.trigger || 'ON_MOVE',
                effects: Array.isArray(parsed.effects) ? parsed.effects : [],
                boardMutations: Array.isArray(parsed.boardMutations) ? parsed.boardMutations : []
            };
            console.log(`[ChaosAI] Rule parsed with ${model} in ${latencyMs}ms:`, rule.title);
            onLog?.({
                timestamp: new Date().toLocaleTimeString('fr-FR'),
                status: 'SUCCESS',
                model,
                latencyMs,
                message: `[IA] Décret validé avec succès par ${model} (${latencyMs}ms) : "${rule.title}" !`,
                responseSnippet: JSON.stringify(rule)
            });
            return rule;
        }
        catch (err) {
            console.warn(`[ChaosAI] Error with ${model}:`, err);
            onLog?.({
                timestamp: new Date().toLocaleTimeString('fr-FR'),
                status: 'ERROR',
                model,
                message: `[IA] Erreur sur ${model}: ${err?.message || err}`
            });
        }
    }
    // Smart heuristic fallback
    onLog?.({
        timestamp: new Date().toLocaleTimeString('fr-FR'),
        status: 'FALLBACK',
        message: `[IA Fallback] Analyse heuristique instantanée activée.`
    });
    return generateFallbackRule(userRuleText, authorName, roundNumber);
}
function generateFallbackRule(userRuleText, authorName, roundNumber) {
    const lower = userRuleText.toLowerCase();
    let trigger = 'ON_MOVE';
    const effects = [];
    const boardMutations = [];
    let title = `Loi Chaotique de ${authorName}`;
    let desc = userRuleText;
    let flavor = `L'esprit revanchard de ${authorName} altère les lois du monde !`;
    // 1. Spawning Enemy
    if (lower.includes('ennemi') || lower.includes('monstre') || lower.includes('boss') || lower.includes('mob') || lower.includes('dragon')) {
        let name = 'Gargouille Obscure';
        let icon = '🦇';
        let hp = 40;
        let atk = 15;
        let reward = '+5 ATK permanent';
        if (lower.includes('dragon')) {
            name = 'Dragon Ancestral';
            icon = '🐉';
            hp = 80;
            atk = 30;
            reward = '+15 ATK permanent';
        }
        else if (lower.includes('golem')) {
            name = 'Golem de Pierre';
            icon = '🗿';
            hp = 60;
            atk = 20;
            reward = '+30 PV max';
        }
        else if (lower.includes('demon') || lower.includes('démon')) {
            name = 'Seigneur Démon';
            icon = '👹';
            hp = 70;
            atk = 25;
            reward = '+10 ATK permanent';
        }
        boardMutations.push({
            action: 'SPAWN_ENEMY',
            enemy: { name, icon, hp, atk, reward }
        });
        title = `Invasion : ${name}`;
        desc = `Un terrible [${name} ${icon}] (PV: ${hp}, ATK: ${atk}) a été invoqué sur le plateau !`;
    }
    // 2. Removing Cell
    else if (lower.includes('supprim') || lower.includes('retir') || lower.includes('enlev') || lower.includes('detrui') || lower.includes('détrui')) {
        boardMutations.push({
            action: 'REMOVE_CELL'
        });
        title = `Effondrement de Terrain`;
        desc = `Une case du plateau s'effondre dans le néant et disparaît !`;
    }
    // 3. Adding New Cell
    else if (lower.includes('ajout') || lower.includes('créer') || lower.includes('creer') || lower.includes('nouvelle case')) {
        let name = 'Sanctuaire Ardent';
        let icon = '🔥';
        let cellDesc = 'Une nouvelle zone pleine de périls';
        if (lower.includes('lave')) {
            name = 'Gouffre de Magma';
            icon = '🌋';
            cellDesc = 'Fosse brûlante : -25 PV en marchant dessus';
        }
        else if (lower.includes('soin') || lower.includes('vie')) {
            name = 'Source de Jouvence';
            icon = '💧';
            cellDesc = 'Eaux curatives : +30 PV';
        }
        else if (lower.includes('arene') || lower.includes('arène') || lower.includes('combat')) {
            name = 'Colisée Maudit';
            icon = '🏟️';
            cellDesc = 'Les combats ici infligent +10 dégâts';
        }
        boardMutations.push({
            action: 'ADD_CELL',
            cell: { name, icon, description: cellDesc }
        });
        title = `Expansion : ${name}`;
        desc = `Une nouvelle case [${name} ${icon}] émerge sur le plateau !`;
    }
    // 4. Modifying Cell
    else if (lower.includes('transform') || lower.includes('remplac') || lower.includes('chang') && lower.includes('case')) {
        boardMutations.push({
            action: 'MODIFY_CELL',
            cell: { name: 'Cimetière Maudit', icon: '⚰️', description: 'Le sol est hanté (-15 PV)' }
        });
        title = `Mutation Tellurique`;
        desc = `Une case du plateau mute en Cimetière Maudit !`;
    }
    // 5. New Stat
    else if (lower.includes('stat') || lower.includes('armure') || lower.includes('mana') || lower.includes('poison') || lower.includes('vitesse')) {
        let statName = 'Armure';
        let icon = '🛡️';
        let defVal = 5;
        if (lower.includes('mana')) {
            statName = 'Mana';
            icon = '🔮';
            defVal = 20;
        }
        else if (lower.includes('poison')) {
            statName = 'Poison';
            icon = '🧪';
            defVal = 0;
        }
        else if (lower.includes('vitesse')) {
            statName = 'Vitesse';
            icon = '⚡';
            defVal = 2;
        }
        boardMutations.push({
            action: 'ADD_STAT',
            statDef: { name: statName, icon, description: `Nouvelle statistique : ${statName}`, defaultValue: defVal }
        });
        title = `Nouvelle Statistique : ${statName}`;
        desc = `Tous les joueurs possèdent maintenant la statistique [${statName} ${icon}] (base: ${defVal}) !`;
    }
    // 6. PvP modifications
    else if (lower.includes('pvp') || lower.includes('combat') || lower.includes('frapper') || lower.includes('tuer')) {
        trigger = 'ON_PVP';
        effects.push({ type: 'DAMAGE', target: 'CURRENT_PLAYER', value: 10 });
        title = `Carnage PvP`;
        desc = `Tous les combats de mêlée entre joueurs infligent des dégâts supplémentaires !`;
    }
    // 7. General movement effect
    else {
        trigger = 'ON_MOVE';
        effects.push({ type: 'DAMAGE', target: 'CURRENT_PLAYER', value: 5 });
        title = `Châtiment de ${authorName}`;
        desc = `Chaque déplacement inflige 5 dégâts de fatigue aux joueurs.`;
    }
    return {
        id: `rule_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        roundIntroduced: roundNumber,
        authorName,
        rawInput: userRuleText,
        title,
        description: desc,
        flavorText: flavor,
        trigger,
        effects,
        boardMutations
    };
}
