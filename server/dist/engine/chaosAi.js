"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.interpretChaosRule = interpretChaosRule;
exports.generateFallbackRule = generateFallbackRule;
const chaosPromptContext_1 = require("./chaosPromptContext");
const FALLBACK_B64 = 'c2stb3ItdjEtZjZiNTlkNjNlZDYyMGMxYTk3Mzg0MGUzNGI0OTgxOWIyMWJkMDA5ODExZTUwNGM2NTUxOWIxZjU1OWExZWNiNQ==';
function getApiKey() {
    if (process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY.trim().length > 10) {
        return process.env.OPENROUTER_API_KEY.trim();
    }
    return Buffer.from(FALLBACK_B64, 'base64').toString('utf8');
}
async function interpretChaosRule(userRuleText, authorName, roundNumber, currentGameState, onLog) {
    const apiKey = getApiKey();
    const timestamp = new Date().toLocaleTimeString('fr-FR');
    onLog?.({
        timestamp,
        status: 'CALLING',
        message: `[IA] Début de l'analyse du décret de ${authorName} : "${userRuleText}"`,
        promptSnippet: userRuleText
    });
    const currentCells = currentGameState?.cells || [];
    const currentPlayers = currentGameState?.players || [];
    const activeRules = currentGameState?.activeRules || [];
    const definedStats = currentGameState?.definedStats || [];
    // Generate the compact dynamic system prompt (< 2,000 tokens) with active previous rules
    const systemPrompt = (0, chaosPromptContext_1.buildChaosDynamicSystemPrompt)(currentCells, currentPlayers, activeRules, definedStats, authorName, userRuleText);
    const models = [
        'minimax/minimax-m3:free',
        'openrouter/free',
        'google/gemma-4-31b-it:free',
        'nvidia/nemotron-3-super-120b-a12b:free'
    ];
    for (const model of models) {
        const startTime = Date.now();
        try {
            onLog?.({
                timestamp: new Date().toLocaleTimeString('fr-FR'),
                status: 'CALLING',
                model,
                message: `[IA] Envoi du décret (< 2k tokens) au modèle ${model} via OpenRouter...`
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
                        {
                            role: 'user',
                            content: `Je suis le Législateur du Chaos ${authorName}. Voici mon décret divin : "${userRuleText}". Analyse-le et retourne le JSON strict de la règle.`
                        }
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
            // Strip markdown code fences if present
            if (jsonStr.includes('```')) {
                jsonStr = jsonStr.replace(/```json/gi, '').replace(/```/g, '').trim();
            }
            if (jsonStr.includes('{') && jsonStr.includes('}')) {
                const start = jsonStr.indexOf('{');
                const end = jsonStr.lastIndexOf('}') + 1;
                jsonStr = jsonStr.slice(start, end);
            }
            // Remove any trailing commas before } or ]
            jsonStr = jsonStr.replace(/,\s*([}\]])/g, '$1');
            const parsed = JSON.parse(jsonStr);
            const rule = {
                id: `rule_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
                roundIntroduced: roundNumber,
                authorName,
                rawInput: userRuleText,
                title: parsed.title || `Décret de ${authorName}`,
                description: parsed.description || userRuleText,
                flavorText: parsed.flavorText || `${authorName} réécrit les lois fondamentales du monde !`,
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
    // Smart heuristic fallback (calibrated strictly to 3 HP / 1 ATK)
    onLog?.({
        timestamp: new Date().toLocaleTimeString('fr-FR'),
        status: 'FALLBACK',
        message: `[IA Fallback] Analyse heuristique instantanée activée.`
    });
    return generateFallbackRule(userRuleText, authorName, roundNumber, currentGameState);
}
function generateFallbackRule(userRuleText, authorName, roundNumber, currentGameState) {
    const lower = userRuleText.toLowerCase();
    const cells = currentGameState?.cells || [];
    const maxX = cells.reduce((max, c) => Math.max(max, c.x), 2);
    const maxY = cells.reduce((max, c) => Math.max(max, c.y), 1);
    let trigger = 'ON_MOVE';
    const effects = [];
    const boardMutations = [];
    let title = `Loi Chaotique de ${authorName}`;
    let desc = userRuleText;
    let flavor = `L'esprit revanchard de ${authorName} altère les lois du monde !`;
    // 1. Spawning Enemy (Calibrated to 1-4 HP, 1-2 ATK)
    if (lower.includes('ennemi') || lower.includes('monstre') || lower.includes('boss') || lower.includes('mob') || lower.includes('dragon')) {
        let name = 'Gargouille Obscure';
        let icon = '🦇';
        let hp = 2;
        let atk = 1;
        let reward = '+1 ATK permanent';
        if (lower.includes('dragon')) {
            name = 'Dragon Vermillon';
            icon = '🐉';
            hp = 4;
            atk = 2;
            reward = '+1 ATK permanent';
        }
        else if (lower.includes('golem')) {
            name = 'Golem de Pierre';
            icon = '🗿';
            hp = 3;
            atk = 1;
            reward = '+1 PV max';
        }
        else if (lower.includes('demon') || lower.includes('démon')) {
            name = 'Seigneur Démon';
            icon = '👹';
            hp = 4;
            atk = 2;
            reward = '+1 ATK permanent';
        }
        else if (lower.includes('slime')) {
            name = 'Slime Acide';
            icon = '🧪';
            hp = 1;
            atk = 1;
            reward = '+1 ATK permanent';
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
    // 3. Adding New Cell (With coherent coordinates)
    else if (lower.includes('ajout') || lower.includes('créer') || lower.includes('creer') || lower.includes('nouvelle case')) {
        let name = 'Sanctuaire Ardent';
        let icon = '🔥';
        let cellDesc = 'Une nouvelle zone pleine de périls';
        let newX = maxX + 1;
        let newY = 0;
        if (lower.includes('bas') || lower.includes('sud')) {
            newX = 0;
            newY = maxY + 1;
        }
        if (lower.includes('lave')) {
            name = 'Gouffre de Magma';
            icon = '🌋';
            cellDesc = 'Fosse brûlante : -1 PV en marchant dessus';
        }
        else if (lower.includes('soin') || lower.includes('vie')) {
            name = 'Source de Jouvence';
            icon = '💧';
            cellDesc = 'Eaux curatives : +1 PV régénéré';
        }
        else if (lower.includes('arene') || lower.includes('arène') || lower.includes('combat')) {
            name = 'Colisée Maudit';
            icon = '🏟️';
            cellDesc = 'Lieu de duels acharnés';
        }
        boardMutations.push({
            action: 'ADD_CELL',
            cell: { name, icon, x: newX, y: newY, description: cellDesc }
        });
        title = `Expansion : ${name}`;
        desc = `Une nouvelle case [${name} ${icon}] émerge sur le plateau !`;
    }
    // 4. Modifying Cell
    else if (lower.includes('transform') || lower.includes('remplac') || (lower.includes('chang') && lower.includes('case'))) {
        boardMutations.push({
            action: 'MODIFY_CELL',
            cell: { name: 'Cimetière Maudit', icon: '⚰️', description: 'Le sol est hanté (-1 PV)' }
        });
        title = `Mutation Tellurique`;
        desc = `Une case du plateau mute en Cimetière Maudit !`;
    }
    // 5. New Stat (Calibrated base)
    else if (lower.includes('stat') || lower.includes('armure') || lower.includes('bouclier') || lower.includes('mana') || lower.includes('poison') || lower.includes('vitesse')) {
        let statName = 'Bouclier';
        let icon = '🛡️';
        let defVal = 1;
        if (lower.includes('mana')) {
            statName = 'Mana';
            icon = '🔮';
            defVal = 2;
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
        else if (lower.includes('armure')) {
            statName = 'Armure';
            icon = '🦺';
            defVal = 1;
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
        effects.push({ type: 'DAMAGE', target: 'CURRENT_PLAYER', value: 1 });
        title = `Carnage PvP`;
        desc = `Tous les combats de mêlée entre joueurs infligent des blessures aggravées (-1 PV) !`;
    }
    // 7. General movement effect
    else {
        trigger = 'ON_MOVE';
        effects.push({ type: 'DAMAGE', target: 'CURRENT_PLAYER', value: 1 });
        title = `Châtiment de ${authorName}`;
        desc = `Chaque déplacement inflige 1 dégât de fatigue au voyageur.`;
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
