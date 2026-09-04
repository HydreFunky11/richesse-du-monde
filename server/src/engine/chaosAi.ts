import { ChaosRule, ChaosRuleEffect, ChaosRuleCondition, ChaosBoardMod } from '../types/chaos';

export async function interpretChaosRule(
  userRuleText: string,
  authorName: string,
  roundNumber: number
): Promise<ChaosRule> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.warn('[ChaosAi] OPENROUTER_API_KEY not set in environment. Using smart heuristic fallback.');
    return generateFallbackRule(userRuleText, authorName, roundNumber);
  }

  const systemPrompt = `Tu es l'Arbitre Suprême et Démoniaque du jeu "Chaos Board".
Dans ce jeu de plateau multijoueur déjanté, un joueur (${authorName}) vient de mourir et a le droit divin d'inventer une NOUVELLE RÈGLE pour punir les survivants dès la prochaine manche.

Le joueur a écrit cette règle :
"${userRuleText}"

Ta mission :
1. Donner un titre court, épique et drôle à cette règle (max 5 mots).
2. Fournir une explication claire et concise de l'effet en jeu.
3. Rédiger une phrase d'ambiance sarcastique ou drôle (flavorText) se moquant de la mort de ${authorName} ou avertissant les survivants.
4. Structurer l'effet mécanique dans les paramètres suivants :
   - trigger: "ON_DICE_ROLL" (quand un dé est lancé) | "ON_PASS_DEPART" (au passage par la case départ) | "ON_TURN_START" (au début de chaque tour) | "ON_LAND_CELL" (à l'atterrissage sur une case) | "ON_FIGHT" (en combat) | "ON_GAMBLE" (au casino) | "ON_ROUND_START" (début de manche)
   - condition.type: "ROLL_EQUALS" (ex: value 6) | "ROLL_IS_EVEN" (pairs) | "ROLL_IS_ODD" (impairs) | "ROLL_GREATER_THAN" (ex: value 4) | "CELL_TYPE" (ex: value "LAVA") | "ALWAYS"
   - effects: liste d'effets [{ "type": "DAMAGE" | "HEAL" | "GOLD_CHANGE" | "POWER_CHANGE" | "DEBT_CHANGE" | "EXTRA_MOVE", "target": "CURRENT_PLAYER" | "ALL_PLAYERS" | "ALL_OTHER_PLAYERS" | "RICHEST_PLAYER" | "POOREST_PLAYER", "value": nombre }]
   - boardModifications: optionnel [{ "cellIndex": 3, "newType": "LAVA" | "GAMBLE" | "FIGHT" | "CURSE" | "BUFF" | "CHEST" | "PORTAL" }] ou [{ "filter": "even" | "odd", "newType": "LAVA" }]

IMPORTANT: Tu DOIS répondre STRICTEMENT et UNIQUEMENT avec un objet JSON valide (sans balises markdown).
Exemple de JSON attendu :
{
  "title": "La Vengeance du 6",
  "description": "Faire un 6 inflige 20 dégâts et retire 50 d'or au joueur !",
  "flavorText": "${authorName} a péri lamentablement et décrète que la chance est désormais maudite !",
  "trigger": "ON_DICE_ROLL",
  "condition": { "type": "ROLL_EQUALS", "value": 6 },
  "effects": [
    { "type": "DAMAGE", "target": "CURRENT_PLAYER", "value": 20 },
    { "type": "GOLD_CHANGE", "target": "CURRENT_PLAYER", "value": -50 }
  ],
  "boardModifications": []
}`;

  const models = [
    'minimax/minimax-m3:free',
    'minimax/minimax-m2.7:free',
    'google/gemma-4-31b-it:free'
  ];

  for (const model of models) {
    try {
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
            { role: 'user', content: `Règle proposée par ${authorName} : "${userRuleText}"` }
          ],
          temperature: 0.7
        })
      });

      if (!res.ok) {
        console.warn(`[ChaosAI] Model ${model} returned HTTP ${res.status}`);
        continue;
      }

      const data = (await res.json()) as any;
      const content = data.choices?.[0]?.message?.content?.trim();
      if (!content) continue;

      // Extract JSON if wrapped in markdown
      let jsonStr = content;
      if (jsonStr.includes('{') && jsonStr.includes('}')) {
        const start = jsonStr.indexOf('{');
        const end = jsonStr.lastIndexOf('}') + 1;
        jsonStr = jsonStr.slice(start, end);
      }

      const parsed = JSON.parse(jsonStr);

      const rule: ChaosRule = {
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

      console.log(`[ChaosAI] Rule successfully parsed with ${model}:`, rule.title);
      return rule;
    } catch (err) {
      console.warn(`[ChaosAI] Error calling ${model}:`, err);
    }
  }

  // Safe Fallback Rule if all AI models are unreachable or rate-limited
  console.log('[ChaosAI] Using heuristic fallback for rule:', userRuleText);
  return generateFallbackRule(userRuleText, authorName, roundNumber);
}

function generateFallbackRule(
  userRuleText: string,
  authorName: string,
  roundNumber: number
): ChaosRule {
  const lower = userRuleText.toLowerCase();

  let trigger: ChaosRule['trigger'] = 'ON_DICE_ROLL';
  let condition: ChaosRuleCondition = { type: 'ALWAYS' };
  const effects: ChaosRuleEffect[] = [];
  const boardModifications: ChaosBoardMod[] = [];

  if (lower.includes('6') || lower.includes('six')) {
    condition = { type: 'ROLL_EQUALS', value: 6 };
    effects.push({ type: 'DAMAGE', target: 'CURRENT_PLAYER', value: 20 });
  } else if (lower.includes('pair')) {
    condition = { type: 'ROLL_IS_EVEN' };
    effects.push({ type: 'DAMAGE', target: 'CURRENT_PLAYER', value: 15 });
  } else if (lower.includes('impair')) {
    condition = { type: 'ROLL_IS_ODD' };
    effects.push({ type: 'GOLD_CHANGE', target: 'CURRENT_PLAYER', value: -50 });
  } else if (lower.includes('lave')) {
    trigger = 'ON_ROUND_START';
    boardModifications.push({ filter: 'even', newType: 'LAVA' });
  } else if (lower.includes('depart') || lower.includes('départ')) {
    trigger = 'ON_PASS_DEPART';
    effects.push({ type: 'DAMAGE', target: 'CURRENT_PLAYER', value: 25 });
  } else {
    // General chaos damage on roll
    condition = { type: 'ROLL_GREATER_THAN', value: 4 };
    effects.push({ type: 'DAMAGE', target: 'CURRENT_PLAYER', value: 15 });
  }

  return {
    id: `rule_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    roundIntroduced: roundNumber,
    authorName,
    rawInput: userRuleText,
    title: `Loi Chaotique de ${authorName}`,
    description: userRuleText,
    flavorText: `Le fantôme de ${authorName} hante le plateau et impose sa volonté !`,
    trigger,
    condition,
    effects: effects.length > 0 ? effects : [{ type: 'DAMAGE', target: 'CURRENT_PLAYER', value: 15 }],
    boardModifications
  };
}
