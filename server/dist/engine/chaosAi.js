"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCellDefaultMeta = getCellDefaultMeta;
exports.interpretChaosRule = interpretChaosRule;
exports.generateFallbackRule = generateFallbackRule;
const FALLBACK_B64 = 'c2stb3ItdjEtZjZiNTlkNjNlZDYyMGMxYTk3Mzg0MGUzNGI0OTgxOWIyMWJkMDA5ODExZTUwNGM2NTUxOWIxZjU1OWExZWNiNQ==';
function getApiKey() {
    if (process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY.trim().length > 10) {
        return process.env.OPENROUTER_API_KEY.trim();
    }
    return Buffer.from(FALLBACK_B64, 'base64').toString('utf8');
}
function getCellDefaultMeta(type) {
    switch (type) {
        case 'LAVA':
            return { name: 'Fosse de Lave', icon: '🔥', description: 'Chaleur insoutenable : -25 PV brûlants !' };
        case 'GAMBLE':
            return { name: 'Casino Maudit', icon: '🎰', description: 'Pariez votre or au jeu du hasard !' };
        case 'FIGHT':
            return { name: 'Antre du Monstre', icon: '⚔️', description: 'Combattez un monstre redoutable pour du butin !' };
        case 'CURSE':
            return { name: 'Cercle Maudit', icon: '💀', description: 'Malédiction funeste : perte de force et d\'or.' };
        case 'BUFF':
            return { name: 'Autel de Force', icon: '💪', description: '+5 Force permanente pour vos combats.' };
        case 'CHEST':
            return { name: 'Coffre Mystère', icon: '📦', description: 'Trésor, or ou relique sacrée inconnue.' };
        case 'PORTAL':
            return { name: 'Vortex Instable', icon: '🌀', description: 'Téléportation aléatoire sur une autre case.' };
        case 'DEBT':
            return { name: 'Banque Toxique', icon: '🏦', description: 'Intérêts mortels et dettes toxiques !' };
        case 'CHAOS':
            return { name: 'Roue du Chaos', icon: '🔮', description: 'Effet totalement imprévisible et déjanté !' };
        case 'GOLD':
            return { name: 'Mine d\'Or', icon: '💰', description: 'Récolte immédiate de 150 pièces d\'or.' };
        default:
            return { name: 'Case Neutre', icon: '🌲', description: 'Une case paisible... pour l\'instant.' };
    }
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
    const systemPrompt = `Tu es l'Arbitre Suprême et Démoniaque du jeu "Chaos Board".
Dans ce jeu de plateau roguelite multijoueur déjanté, un joueur (${authorName}) vient de mourir et a le pouvoir divin d'inventer une NOUVELLE RÈGLE pour punir les survivants ou changer le cours de la partie dès la prochaine manche.

Le joueur a écrit ce souhait/décret :
"${userRuleText}"

Ta mission :
1. "title": Donner un titre court, épique et percutant à cette règle (max 5 mots).
2. "description": Fournir une explication claire et concise de l'effet en jeu.
3. "flavorText": Rédiger une phrase d'ambiance sarcastique, drôle ou apocalyptique se moquant de la mort de ${authorName} ou avertissant les survivants.
4. "trigger": "ON_DICE_ROLL" (quand un dé est lancé) | "ON_PASS_DEPART" (au passage case départ) | "ON_TURN_START" (début de tour) | "ON_LAND_CELL" (à l'atterrissage sur une case) | "ON_FIGHT" (en combat) | "ON_GAMBLE" (au casino) | "ON_ROUND_START" (début de manche).
5. "condition": { "type": "ROLL_EQUALS" | "ROLL_IS_EVEN" | "ROLL_IS_ODD" | "ROLL_GREATER_THAN" | "CELL_TYPE" | "ALWAYS", "value": nombre ou string }.
6. "effects": liste d'effets [{ "type": "DAMAGE" | "HEAL" | "GOLD_CHANGE" | "POWER_CHANGE" | "DEBT_CHANGE" | "EXTRA_MOVE", "target": "CURRENT_PLAYER" | "ALL_PLAYERS" | "ALL_OTHER_PLAYERS" | "RICHEST_PLAYER" | "POOREST_PLAYER", "value": nombre }].
7. "boardModifications": Si le joueur veut ajouter une nouvelle case, transformer une case, ou modifier le plateau :
   - Pour CRÉER/AJOUTER une case : { "action": "ADD", "newType": "LAVA" | "GAMBLE" | "FIGHT" | "CURSE" | "BUFF" | "CHEST" | "PORTAL" | "DEBT" | "CHAOS", "name": "Nom de la case", "icon": "emoji", "description": "Effet de la case" }
   - Pour TRANSFORMER une case existante : { "action": "MODIFY", "cellIndex": 4, "newType": "LAVA", "name": "Nom", "icon": "emoji", "description": "Effet" }
   - Pour TRANSFORMER plusieurs cases : { "action": "MODIFY", "filter": "even" | "odd", "newType": "LAVA" }

IMPORTANT: Tu DOIS répondre STRICTEMENT avec un objet JSON valide, sans balises markdown de code.
Exemple JSON :
{
  "title": "Le Casino de la Mort",
  "description": "Une nouvelle case Casino clandestin est ajoutée au plateau !",
  "flavorText": "${authorName} a péri ruiné et ouvre son propre établissement de perdition !",
  "trigger": "ON_ROUND_START",
  "condition": { "type": "ALWAYS" },
  "effects": [],
  "boardModifications": [
    {
      "action": "ADD",
      "newType": "GAMBLE",
      "name": "Casino Clandestin",
      "icon": "🎰",
      "description": "Doublez votre or ou repartez en slip !"
    }
  ]
}`;
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
                        { role: 'user', content: `Décret proposé par ${authorName} : "${userRuleText}"` }
                    ],
                    temperature: 0.7
                })
            });
            const latencyMs = Date.now() - startTime;
            if (!res.ok) {
                const errorText = await res.text().catch(() => '');
                console.warn(`[ChaosAI] Model ${model} HTTP ${res.status}:`, errorText);
                onLog?.({
                    timestamp: new Date().toLocaleTimeString('fr-FR'),
                    status: 'ERROR',
                    model,
                    latencyMs,
                    message: `[IA] Modèle ${model} a retourné une erreur HTTP ${res.status} (${errorText.slice(0, 80)}). Bascule sur le modèle suivant...`
                });
                continue;
            }
            const data = (await res.json());
            const content = data.choices?.[0]?.message?.content?.trim();
            if (!content) {
                onLog?.({
                    timestamp: new Date().toLocaleTimeString('fr-FR'),
                    status: 'ERROR',
                    model,
                    latencyMs,
                    message: `[IA] Modèle ${model} a renvoyé un contenu vide.`
                });
                continue;
            }
            // Extract JSON if wrapped in markdown
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
                flavorText: parsed.flavorText || `${authorName} a modifié la réalité du jeu !`,
                trigger: parsed.trigger || 'ON_DICE_ROLL',
                condition: parsed.condition || { type: 'ALWAYS' },
                effects: Array.isArray(parsed.effects) ? parsed.effects : [
                    { type: 'DAMAGE', target: 'CURRENT_PLAYER', value: 15 }
                ],
                boardModifications: Array.isArray(parsed.boardModifications) ? parsed.boardModifications : []
            };
            console.log(`[ChaosAI] Rule successfully parsed with ${model} in ${latencyMs}ms:`, rule.title);
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
            console.warn(`[ChaosAI] Error calling ${model}:`, err);
            onLog?.({
                timestamp: new Date().toLocaleTimeString('fr-FR'),
                status: 'ERROR',
                model,
                message: `[IA] Exception lors de l'appel à ${model}: ${err?.message || err}`
            });
        }
    }
    // Safe Fallback Rule if all AI models are unreachable or rate-limited
    console.log('[ChaosAI] Using heuristic fallback for rule:', userRuleText);
    onLog?.({
        timestamp: new Date().toLocaleTimeString('fr-FR'),
        status: 'FALLBACK',
        message: `[IA Fallback] Tous les modèles distants sont occupés. Structuration heuristique instantanée appliquée.`
    });
    return generateFallbackRule(userRuleText, authorName, roundNumber);
}
function generateFallbackRule(userRuleText, authorName, roundNumber) {
    const lower = userRuleText.toLowerCase();
    let trigger = 'ON_DICE_ROLL';
    let condition = { type: 'ALWAYS' };
    const effects = [];
    const boardModifications = [];
    let title = `Loi Chaotique de ${authorName}`;
    let flavor = `Le spectre de ${authorName} revient d'entre les morts pour dicter sa volonté !`;
    let desc = userRuleText;
    const isCaseRequest = lower.includes('case') || lower.includes('plateau') || lower.includes('tuile');
    const isAdd = lower.includes('ajout') || lower.includes('créer') || lower.includes('creer') || lower.includes('nouvelle');
    const isModify = lower.includes('transform') || lower.includes('remplac') || lower.includes('chang');
    if (isCaseRequest && (isAdd || isModify)) {
        trigger = 'ON_ROUND_START';
        let targetType = 'CHAOS';
        let name = 'Case Mystère';
        let icon = '🔮';
        let cellDesc = 'Une case étrange créée par décret divin.';
        if (lower.includes('lave') || lower.includes('feu') || lower.includes('magma')) {
            targetType = 'LAVA';
            name = 'Fosse de Lave';
            icon = '🔥';
            cellDesc = 'Chaleur insoutenable : -25 PV brûlants !';
        }
        else if (lower.includes('casino') || lower.includes('pari') || lower.includes('roulette') || lower.includes('jeu')) {
            targetType = 'GAMBLE';
            name = 'Casino Maudit';
            icon = '🎰';
            cellDesc = 'Pariez votre or au jeu du hasard !';
        }
        else if (lower.includes('combat') || lower.includes('monstre') || lower.includes('fight') || lower.includes('boss')) {
            targetType = 'FIGHT';
            name = 'Repaire de Monstre';
            icon = '⚔️';
            cellDesc = 'Affrontez une bête pour du butin !';
        }
        else if (lower.includes('dette') || lower.includes('banque') || lower.includes('taxe') || lower.includes('prison')) {
            targetType = 'DEBT';
            name = 'Banque Corrompue';
            icon = '🏦';
            cellDesc = 'Vos dettes s\'alourdissent ici !';
        }
        else if (lower.includes('coffre') || lower.includes('trésor') || lower.includes('tresor') || lower.includes('or')) {
            targetType = 'CHEST';
            name = 'Coffre Secret';
            icon = '📦';
            cellDesc = 'Un trésor attend les aventuriers.';
        }
        else if (lower.includes('soin') || lower.includes('vie') || lower.includes('buff') || lower.includes('force')) {
            targetType = 'BUFF';
            name = 'Autel Sacré';
            icon = '💪';
            cellDesc = '+5 Force permanente.';
        }
        else if (lower.includes('portail') || lower.includes('tp') || lower.includes('teleport')) {
            targetType = 'PORTAL';
            name = 'Vortex Temporel';
            icon = '🌀';
            cellDesc = 'Téléportation aléatoire sur le plateau.';
        }
        if (isAdd) {
            boardModifications.push({
                action: 'ADD',
                newType: targetType,
                name,
                icon,
                description: cellDesc
            });
            title = `Expansion : ${name}`;
            desc = `Une nouvelle case [${name} ${icon}] a été ajoutée au plateau !`;
            flavor = `${authorName} a façonné une nouvelle portion de réalité sur le plateau !`;
        }
        else {
            // Modify
            const matchNum = lower.match(/\b(\d+)\b/);
            const cellIdx = matchNum ? parseInt(matchNum[1], 10) : 3;
            boardModifications.push({
                action: 'MODIFY',
                cellIndex: cellIdx,
                newType: targetType,
                name,
                icon,
                description: cellDesc
            });
            title = `Mutation : Case #${cellIdx}`;
            desc = `La case #${cellIdx} se transforme en [${name} ${icon}] !`;
            flavor = `${authorName} a maudit la case #${cellIdx} à tout jamais !`;
        }
    }
    else if (lower.includes('6') || lower.includes('six')) {
        condition = { type: 'ROLL_EQUALS', value: 6 };
        effects.push({ type: 'DAMAGE', target: 'CURRENT_PLAYER', value: 20 });
        title = 'La Malédiction du 6';
        desc = 'Obtenir un 6 inflige 20 dégâts au joueur.';
    }
    else if (lower.includes('pair')) {
        condition = { type: 'ROLL_IS_EVEN' };
        effects.push({ type: 'DAMAGE', target: 'CURRENT_PLAYER', value: 15 });
        title = 'Le Sortilège des Pairs';
        desc = 'Tous les lancers pairs infligent 15 dégâts au joueur.';
    }
    else if (lower.includes('impair')) {
        condition = { type: 'ROLL_IS_ODD' };
        effects.push({ type: 'GOLD_CHANGE', target: 'CURRENT_PLAYER', value: -50 });
        title = 'La Taxe des Impairs';
        desc = 'Les lancers impairs font perdre 50 pièces d\'or au lanceur.';
    }
    else if (lower.includes('lave')) {
        trigger = 'ON_ROUND_START';
        boardModifications.push({ action: 'MODIFY', filter: 'even', newType: 'LAVA' });
        title = 'Sol de Magma';
        desc = 'Toutes les cases paires deviennent de la lave bouillante !';
    }
    else if (lower.includes('depart') || lower.includes('départ')) {
        trigger = 'ON_PASS_DEPART';
        effects.push({ type: 'DAMAGE', target: 'CURRENT_PLAYER', value: 25 });
        title = 'Départ Sanglant';
        desc = 'Passer par la case Départ inflige 25 dégâts.';
    }
    else {
        // General chaos
        condition = { type: 'ROLL_GREATER_THAN', value: 4 };
        effects.push({ type: 'DAMAGE', target: 'CURRENT_PLAYER', value: 15 });
        title = `Châtiment de ${authorName}`;
        desc = 'Les lancers supérieurs à 4 infligent 15 dégâts au lanceur.';
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
        condition,
        effects: effects.length > 0 ? effects : [{ type: 'DAMAGE', target: 'CURRENT_PLAYER', value: 15 }],
        boardModifications
    };
}
