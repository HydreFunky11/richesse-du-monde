"use strict";
// ============================================================================
// CHAOS BOARD - GRAND CODEX & CONTEXTE OMNISCIENT IA (~20 000 TOKENS)
// Manuel encyclopédique de règles, géométrie cartésienne 2D, balance des stats (3 PV / 1 ATK),
// bestiaire calibré, dictionnaire d'intentions sémantiques, et 100 exemples concrets.
// ============================================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.CHAOS_TACTICAL_MANEUVERS = exports.CHAOS_EXTRA_FEW_SHOTS = exports.CHAOS_COMBOS_AND_STATUS_THEORY = exports.CHAOS_FEW_SHOT_ENCYCLOPEDIA = exports.CHAOS_BESTIARY = exports.CHAOS_INTENT_DICTIONARY = exports.CHAOS_CORE_MANUAL = void 0;
exports.buildChaosDynamicSystemPrompt = buildChaosDynamicSystemPrompt;
exports.CHAOS_CORE_MANUAL = `
══════════════════════════════════════════════════════════════════════════════
   LE GRAND LIVRE DES LOIS FONDAMENTALES DU CHAOS BOARD (ÉDITION ROGUELITE)   
══════════════════════════════════════════════════════════════════════════════

1. PRÉSENTATION FONDAMENTALE DU JEU :
Chaos Board est un jeu de société tactique et roguelite multijoueur sur grille 2D au tour par tour.
Chaque joueur incarne un champion dans une arène impitoyable où la survie dépend des choix tactiques
et de la roulette des duels. Mais la véritable âme du jeu réside dans la MORT :
Lorsqu'un joueur meurt (PV = 0), le cours de la manche s'interrompt instantanément.
Le défunt ressuscite sous la forme du "LÉGISLATEUR DU CHAOS" et se voit accorder le POUVOIR DIVIN
de dicter N'IMPORTE QUELLE MODIFICATION du jeu en langage naturel libre.
Il peut façonner la géographie (ajouter, supprimer ou altérer des cases), invoquer des créatures,
introduire de nouvelles statistiques RPG, inventer des malédictions ou manipuler le destin.
Toutes les lois proclamées s'accumulent manche après manche SANS LIMITE DE MANCHES (manches infinies ♾️).
Au début de chaque manche, tous les joueurs ressuscitent avec leurs PV au maximum, prêts à affronter
les nouvelles règles forgées par les morts successives.

2. ÉCONOMIE STRICTE DES STATISTIQUES & SCALING DE DÉGÂTS (RÈGLE D'OR) :
Attention extrême : ce jeu N'EST PAS un MMO avec 10 000 PV et 500 de DPS !
- POINTS DE VIE DE BASE : 3 PV (Maximum 3 PV au départ).
  Chaque point de vie est vital. 1 PV perdu représente un tiers de la survie d'un joueur !
- ATTAQUE DE BASE : 1 ATK. C'est la force offensive initiale.
- RÈGLE DU COMBAT : Perdre un combat (en PvP à la roulette ou en PvE contre un monstre) fait perdre STRICTEMENT 1 PV au perdant.
- BARÈME D'ÉQUILIBRAGE OBLIGATOIRE DES MONSTRES / BOSS (SPAWN_ENEMY) :
  * Larve / Insecte / Gobelin / Rat / Slime : 1 à 2 PV, 1 ATK (Monstre facile à battre pour gagner de l'ATK).
  * Squelette / Loup / Zombie / Bandite / Gargouille : 2 à 3 PV, 1 à 2 ATK.
  * Mini-boss / Gardien d'Arène / Golem / Mage Noir : 3 à 4 PV, 2 ATK.
  * Boss Suprême / Dragon Ancestral / Seigneur Démon : 4 à 5 PV, 2 à 3 ATK (Le boss ultime ne doit JAMAIS dépasser 5 PV !).
  * Récompense en cas de victoire PvE : +1 ATK permanent, +1 PV max, ou un bonus d'une stat personnalisée.
  INTERDICTION FORMELLE : Ne jamais donner 20, 50 ou 100 PV à un monstre ! Cela rendrait le monstre immortel.

3. LA ROULETTE DU DESTIN (RÉSOLUTION DES DUELS PVP) :
Lorsqu'un joueur clique sur une case occupée par un autre joueur, un Duel PvP éclate immédiatement.
Une roulette animée apparaît alors sur l'écran de tous les participants :
- Si les deux combattants ont la MÊME ATK (ex: 1 vs 1, ou 2 vs 2) : la chance de victoire est STRICTEMENT 50% / 50%.
- Si les deux combattants ont des ATK DIFFÉRENTES (ex: 2 vs 1) : les chances sont proportionnelles :
  Pourcentage Joueur A = (ATK_A / (ATK_A + ATK_B)) * 100%
  Pourcentage Joueur B = (ATK_B / (ATK_A + ATK_B)) * 100%
La roue tourne pendant ~3,5 secondes et l'aiguille supérieure s'arrête sur le vainqueur.
Le vainqueur reste indemne et gagne +1 Kill.
Le perdant subit 1 DÉGÂT (-1 PV). S'il atteint 0 PV, il s'écroule et la manche se termine.

4. GÉOMÉTRIE CARTÉSIENNE 2D & COHÉRENCE SPATIALE DU PLATEAU (FONDAMENTAL) :
Le plateau repose sur une matrice cartésienne discrète à coordonnées entières positives : (x, y).
- x représente la colonne horizontale (0 = gauche, 1 = centre, 2 = droite, 3 = extrême droite, etc.).
- y représente la ligne verticale (0 = haut/nord, 1 = milieu/sud, 2 = bas/sud profond, etc.).

SCHÉMA DU PLATEAU INITIAL 3x2 (6 CASES NEUTRES DE DÉPART) :
┌──────────────────────┬──────────────────────┬──────────────────────┐
│ (x=0, y=0)           │ (x=1, y=0)           │ (x=2, y=0)           │
│ [Haut-Gauche]        │ [Haut-Centre]        │ [Haut-Droite]        │
├──────────────────────┼──────────────────────┼──────────────────────┤
│ (x=0, y=1)           │ (x=1, y=1)           │ (x=2, y=1)           │
│ [Bas-Gauche]         │ [Bas-Centre]         │ [Bas-Droite]         │
└──────────────────────┴──────────────────────┴──────────────────────┘
Coordonnées initiales exactes :
- cell_0_0 en (0, 0)
- cell_1_0 en (1, 0)
- cell_2_0 en (2, 0)
- cell_0_1 en (0, 1)
- cell_1_1 en (1, 1)
- cell_2_1 en (2, 1)

DISTANCE ET ADJACENCE PHYSIQUE :
La distance entre la case A(x1, y1) et la case B(x2, y2) est la distance de Tchebychev :
Distance = max(|x1 - x2|, |y1 - y2|).
Une case est directement accessible si Distance <= 1 (les 8 cases adjacentes : orthogonales et diagonales).
Si un joueur possède de la Vitesse (ex: Vitesse = 2), il peut se déplacer jusqu'à Distance <= 2.

RÈGLES IMPÉRATIVES DE PLACEMENT COHÉRENT DES NOUVELLES CASES (ADD_CELL) :
1. NON-CHEVITEMENT STRICT : Ne JAMAIS placer une nouvelle case sur des coordonnées (x, y) déjà occupées par une case existante.
2. CONNEXITÉ IMMÉDIATE : Une nouvelle case DOIT être adjacente (distance <= 1) à au moins une case existante.
   Une case isolée en (10, 10) est strictement interdite car aucun joueur ne pourrait jamais l'atteindre !
3. COHÉRENCE GÉOGRAPHIQUE DU TEXTE DU JOUEUR :
   - "à droite" ou "vers l'est" : choisir x = maxX + 1 sur une ligne y existante (ex: (3, 0) ou (3, 1)).
   - "en bas" ou "vers le sud" : choisir y = maxY + 1 sur une colonne x existante (ex: (0, 2), (1, 2), (2, 2)).
   - "à gauche" : combler un trou sur x=0 si disponible.
   - "en haut" : combler un trou sur y=0 si disponible.
   - "au milieu" : cibler une case centrale comme (1, 0) ou (1, 1) pour MODIFY_CELL.
   - "si aucune coordonnée n'est spécifiée" :
     a) Chercher en priorité s'il y a des trous vides dans le rectangle actuel [0..maxX] x [0..maxY].
     b) Si le rectangle est plein (ex: 3x2 = 6 cases complètes) : agrandir naturellement :
        - Soit en largeur : ajouter (3, 0) puis (3, 1) pour former un 4x2.
        - Soit en hauteur : ajouter (0, 2), (1, 2), (2, 2) pour former un 3x3.

5. SYSTÈME DES MUTATIONS ET ACTIONS (boardMutations) :
Chaque décret peut inclure un tableau de "boardMutations" contenant des opérations concrètes :

A) ADD_CELL : Crée une nouvelle case permanente sur la grille.
   Format :
   {
     "action": "ADD_CELL",
     "cell": {
       "name": "Nom de la Case",
       "icon": "Emoji représentatif (ex: 🌋, 💧, 🏰, 🎁, 🌲, ⚔️)",
       "x": number,
       "y": number,
       "description": "Courte description de ce que fait la case",
       "colorTheme": "from-red-950/80 to-orange-900/60 border-red-500/60 text-orange-200"
     }
   }

B) REMOVE_CELL : Supprime une case du plateau (sécurité : le plateau garde toujours au moins 2 cases).
   Format : { "action": "REMOVE_CELL", "cellId": "cell_0_0" }

C) MODIFY_CELL : Modifie une case existante (change son terrain, son nom, son icône ou son effet de passage).
   Format :
   {
     "action": "MODIFY_CELL",
     "cellId": "cell_1_0",
     "cell": {
       "name": "Fosse de Magma",
       "icon": "🔥",
       "description": "Lave incandescente : -1 PV à l'arrêt",
       "colorTheme": "from-red-950 to-orange-950 border-red-500 text-orange-200"
     }
   }

D) SPAWN_ENEMY : Fait apparaître un ennemi sur une case.
   Format :
   {
     "action": "SPAWN_ENEMY",
     "cellId": "cell_2_0",
     "enemy": {
       "name": "Dragon Vermillon",
       "icon": "🐉",
       "hp": 4,
       "maxHp": 4,
       "atk": 2,
       "reward": "+1 ATK permanent"
     }
   }

E) ADD_STAT : Ajoute une nouvelle caractéristique globale visible pour TOUS les joueurs.
   Format :
   {
     "action": "ADD_STAT",
     "statDef": {
       "name": "Bouclier",
       "icon": "🛡️",
       "description": "Points d'armure magique absorbant les coups",
       "defaultValue": 1
     }
   }

F) MODIFY_STAT : Modifie une statistique (ATK, PV, ou stat personnalisée) pour les joueurs.
   Format :
   {
     "action": "MODIFY_STAT",
     "target": "ALL_PLAYERS",
     "statName": "atk",
     "value": 1
   }

6. DÉCLENCHEURS (trigger) ET EFFETS (effects) :
- Triggers disponibles :
  * ON_MOVE : à chaque déplacement d'un joueur.
  * ON_CELL_ENTER : à l'entrée sur une case.
  * ON_PVP : lors d'un duel entre joueurs à la roulette.
  * ON_PVE : lors d'un combat contre un monstre.
  * ON_KILL : quand un joueur élimine un rival ou un monstre.
  * ON_TURN_START : au début du tour d'un joueur.
  * ON_ROUND_START : au début de la manche.
- Types d'effets :
  * DAMAGE : value = 1 (voire 2 grand maximum).
  * HEAL : value = 1 ou 2.
  * MODIFY_ATK : value = 1 ou -1.
  * MODIFY_STAT : modifie une stat par son nom.
  * TELEPORT : téléporte le joueur.
`;
exports.CHAOS_INTENT_DICTIONARY = `
══════════════════════════════════════════════════════════════════════════════
   DICTIONNAIRE SÉMANTIQUE DES INTENTIONS JOUEUR (FRANÇAIS & ARGO GAMING)   
══════════════════════════════════════════════════════════════════════════════

Voici comment interpréter fidèlement le langage des joueurs :
1. "fous de la lave", "du feu", "brûle", "volcan", "enfer" :
   -> Action : MODIFY_CELL ou ADD_CELL avec nom de lave, icône 🌋 ou 🔥, effet DAMAGE de 1 PV.
2. "one shot", "déglingue", "instakill", "fume-le", "mort subite" :
   -> Action : Dégâts mortels ou trigger ON_PVP où le perdant subit 2 ou 3 dégâts (PV max étant 3).
3. "cheh", "vengeance", "karma", "retour de karma", "œil pour œil" :
   -> Action : Règle ON_PVP ou ON_KILL infligeant des dégâts au vainqueur ou renforçant les perdants.
4. "fais spawn un mob", "rajoute un monstre", "un boss", "un streum", "un dragon", "un démon" :
   -> Action : SPAWN_ENEMY avec HP compris entre 1 et 4, ATK entre 1 et 2.
5. "retire une case", "casse la case", "détruis le sol", "fais un trou", "un gouffre" :
   -> Action : REMOVE_CELL sur la case ciblée.
6. "soin", "heal", "medic", "potion", "fontaine de fée", "coeur" :
   -> Action : MODIFY_CELL ou ADD_CELL avec effet HEAL de 1 PV.
7. "ajoute de la mana", "du bouclier", "de la rage", "de l'armure", "de la vitesse", "du poison" :
   -> Action : ADD_STAT créant cette statistique avec valeur par défaut équilibrée.
8. "agrandis la map", "plus de cases", "ajoute à droite", "en bas", "au sud", "à l'est" :
   -> Action : ADD_CELL avec coordonnées adjacentes cohérentes (x = maxX + 1 ou y = maxY + 1).
9. "tout le monde a plus d'attaque", "buff d'attaque", "grosse épée" :
   -> Action : MODIFY_STAT statName: "atk", value: 1 pour ALL_PLAYERS.
10. "le sol c'est de la lave", "chaque pas fait mal", "fatigue" :
   -> Trigger : ON_MOVE, effet DAMAGE: 1.
`;
exports.CHAOS_BESTIARY = `
══════════════════════════════════════════════════════════════════════════════
   LE BESTIAIRE OFFICIEL DU CHAOS BOARD (CALIBRATION PV & ATK ÉQUILIBRÉE)   
══════════════════════════════════════════════════════════════════════════════

Tous les monstres sont strictement calibrés pour l'économie 3 PV / 1 ATK du jeu :
- Slime Visqueux 🧪 : PV: 1, ATK: 1 | Récompense: +1 ATK permanent
- Rat Pestiféré 🐀 : PV: 1, ATK: 1 | Récompense: +1 ATK permanent
- Gobelin Chapardeur 👺 : PV: 1, ATK: 1 | Récompense: +1 ATK permanent
- Chauve-souris d'Ombre 🦇 : PV: 1, ATK: 1 | Récompense: +1 Vitesse
- Araignée Épineuse 🕷️ : PV: 2, ATK: 1 | Récompense: +1 ATK permanent
- Loup Affamé 🐺 : PV: 2, ATK: 1 | Récompense: +1 ATK permanent
- Squelette Soldat 💀 : PV: 2, ATK: 1 | Récompense: +1 ATK permanent
- Zombie Rampant 🧟 : PV: 2, ATK: 1 | Récompense: +1 PV max
- Voleur des Ombres 🗡️ : PV: 2, ATK: 2 | Récompense: +1 ATK permanent
- Spectre Maudit 👻 : PV: 2, ATK: 2 | Récompense: +1 Mana
- Golem d'Argile 🗿 : PV: 3, ATK: 1 | Récompense: +1 Bouclier
- Gargouille de Pierre 🗿 : PV: 3, ATK: 2 | Récompense: +1 ATK permanent
- Chevalier Noir 🛡️ : PV: 3, ATK: 2 | Récompense: +1 ATK permanent
- Nécromancien Sombre 🔮 : PV: 3, ATK: 2 | Récompense: +1 PV max
- Mimique Trésor 📦 : PV: 3, ATK: 2 | Récompense: +1 ATK et +1 PV
- Minotaure Furieux 🐂 : PV: 4, ATK: 2 | Récompense: +1 ATK permanent
- Golem de Granite 🗿 : PV: 4, ATK: 2 | Récompense: +1 Bouclier permanent
- Liche Immortelle 💀 : PV: 4, ATK: 2 | Récompense: +1 ATK permanent
- Hydre des Marais 🐍 : PV: 4, ATK: 2 | Récompense: +1 PV max
- Seigneur Démon 👹 : PV: 5, ATK: 3 | Récompense: +2 ATK permanents
- Dragon Ancestral 🐉 : PV: 5, ATK: 3 | Récompense: +2 ATK permanents
`;
exports.CHAOS_FEW_SHOT_ENCYCLOPEDIA = `
══════════════════════════════════════════════════════════════════════════════
   ARCHIVE DE 100 EXEMPLES RÉALISTES D'INTERPRÉTATION DE DÉCRETS DU CHAOS    
══════════════════════════════════════════════════════════════════════════════

--- EXEMPLE DÉCRET #1 ---
Entrée joueur : "ajoute une case tout à droite avec un coffre au trésor"
JSON Attendu :
{
  "title": "Trésor du Levant",
  "description": "Une case [Trésor Ancien] émerge à droite en (3, 0). Les aventuriers y trouvent +1 ATK.",
  "flavorText": "Le trésor n'attend que vous !",
  "trigger": "ON_CELL_ENTER",
  "effects": [
    {
      "type": "MODIFY_ATK",
      "target": "CURRENT_PLAYER",
      "value": 1
    }
  ],
  "boardMutations": [
    {
      "action": "ADD_CELL",
      "cell": {
        "name": "Trésor Ancien",
        "icon": "🎁",
        "x": 3,
        "y": 0,
        "description": "+1 ATK permanent à l'entrée",
        "colorTheme": "from-amber-950/80 to-yellow-900/60 border-amber-500/60 text-amber-300"
      }
    }
  ]
}

--- EXEMPLE DÉCRET #2 ---
Entrée joueur : "ajoute une case en bas à gauche qui est un donjon sombre"
JSON Attendu :
{
  "title": "Donjon Obscur",
  "description": "Une nouvelle case [Donjon Sombre] s'ouvre en (0, 2).",
  "flavorText": "Les ombres s'épaississent...",
  "trigger": "ON_MOVE",
  "effects": [],
  "boardMutations": [
    {
      "action": "ADD_CELL",
      "cell": {
        "name": "Donjon Sombre",
        "icon": "🏰",
        "x": 0,
        "y": 2,
        "description": "Repaire sinistre taillé dans la roche.",
        "colorTheme": "from-purple-950/80 to-slate-900 border-purple-600/60 text-purple-200"
      }
    }
  ]
}

--- EXEMPLE DÉCRET #3 ---
Entrée joueur : "fous une case lave à côté de la case (2,1)"
JSON Attendu :
{
  "title": "Coulée Magmatique",
  "description": "Une fosse de lave émerge en (3, 1). Marcher dedans inflige 1 dégât.",
  "flavorText": "Ça va chauffer sous les semelles !",
  "trigger": "ON_CELL_ENTER",
  "effects": [
    {
      "type": "DAMAGE",
      "target": "CURRENT_PLAYER",
      "value": 1
    }
  ],
  "boardMutations": [
    {
      "action": "ADD_CELL",
      "cell": {
        "name": "Fosse de Lave",
        "icon": "🌋",
        "x": 3,
        "y": 1,
        "description": "Sol en fusion : -1 PV à l'arrêt.",
        "colorTheme": "from-red-950/80 to-orange-950/60 border-red-500/80 text-orange-200"
      }
    }
  ]
}

--- EXEMPLE DÉCRET #4 ---
Entrée joueur : "ajoute une case sanctuaire de soin au sud en (1,2)"
JSON Attendu :
{
  "title": "Fontaine Astrale",
  "description": "Une fontaine d'eau pure apparaît en (1, 2). Elle régénère 1 PV.",
  "flavorText": "Une gorgée et la vie reprend.",
  "trigger": "ON_CELL_ENTER",
  "effects": [
    {
      "type": "HEAL",
      "target": "CURRENT_PLAYER",
      "value": 1
    }
  ],
  "boardMutations": [
    {
      "action": "ADD_CELL",
      "cell": {
        "name": "Fontaine Astrale",
        "icon": "💧",
        "x": 1,
        "y": 2,
        "description": "+1 PV récupéré en s'arrêtant ici.",
        "colorTheme": "from-emerald-950 to-teal-900 border-emerald-400 text-emerald-200"
      }
    }
  ]
}

--- EXEMPLE DÉCRET #5 ---
Entrée joueur : "fais spawn un boss dragon avec 4 pv et 2 d'attaque"
JSON Attendu :
{
  "title": "Éveil du Dragon",
  "description": "Un Dragon Écarlate (PV: 4, ATK: 2) se perche sur le plateau.",
  "flavorText": "Son souffle embrase l'horizon !",
  "trigger": "ON_PVE",
  "effects": [],
  "boardMutations": [
    {
      "action": "SPAWN_ENEMY",
      "cellId": "cell_1_0",
      "enemy": {
        "name": "Dragon Écarlate",
        "icon": "🐉",
        "hp": 4,
        "maxHp": 4,
        "atk": 2,
        "reward": "+1 ATK permanent"
      }
    }
  ]
}

--- EXEMPLE DÉCRET #6 ---
Entrée joueur : "ajoute une stat bouclier qui commence à 1"
JSON Attendu :
{
  "title": "Protection Gardienne",
  "description": "Tous les joueurs reçoivent 1 point de [Bouclier 🛡️] au départ.",
  "flavorText": "Une carapace magique pour parer un coup.",
  "trigger": "ON_ROUND_START",
  "effects": [],
  "boardMutations": [
    {
      "action": "ADD_STAT",
      "statDef": {
        "name": "Bouclier",
        "icon": "🛡️",
        "description": "Protection magique absorbant les chocs",
        "defaultValue": 1
      }
    }
  ]
}

--- EXEMPLE DÉCRET #7 ---
Entrée joueur : "la case (1,0) se transforme en lave"
JSON Attendu :
{
  "title": "Éruption Volcanique",
  "description": "La case (1, 0) devient une fournaise incandescente (-1 PV).",
  "flavorText": "Attention où vous marchez !",
  "trigger": "ON_CELL_ENTER",
  "effects": [
    {
      "type": "DAMAGE",
      "target": "CURRENT_PLAYER",
      "value": 1
    }
  ],
  "boardMutations": [
    {
      "action": "MODIFY_CELL",
      "cellId": "cell_1_0",
      "cell": {
        "name": "Lave Ardente",
        "icon": "🔥",
        "description": "Sol brûlant : -1 PV en marchant dessus",
        "colorTheme": "from-red-950 to-orange-900 border-red-500 text-orange-200"
      }
    }
  ]
}

--- EXEMPLE DÉCRET #8 ---
Entrée joueur : "supprime la case du coin en haut à gauche"
JSON Attendu :
{
  "title": "Effondrement Néant",
  "description": "La case (0, 0) s'effondre dans le vide sidéral !",
  "flavorText": "Le sol se dérobe...",
  "trigger": "ON_MOVE",
  "effects": [],
  "boardMutations": [
    {
      "action": "REMOVE_CELL",
      "cellId": "cell_0_0"
    }
  ]
}

--- EXEMPLE DÉCRET #9 ---
Entrée joueur : "si on perd un duel à la roulette on perd 2 pv au lieu de 1"
JSON Attendu :
{
  "title": "Duels Mortels",
  "description": "Les duels deviennent impitoyables : perdre coûte désormais 2 PV !",
  "flavorText": "Plus le droit à l'erreur.",
  "trigger": "ON_PVP",
  "effects": [
    {
      "type": "DAMAGE",
      "target": "CURRENT_PLAYER",
      "value": 1
    }
  ],
  "boardMutations": []
}

--- EXEMPLE DÉCRET #10 ---
Entrée joueur : "celui qui gagne un combat gagne 1 point d'atk permanent"
JSON Attendu :
{
  "title": "Soif de Sang",
  "description": "Chaque meurtre récompense le vainqueur par +1 ATK permanent.",
  "flavorText": "Le sang appelle le fer.",
  "trigger": "ON_KILL",
  "effects": [
    {
      "type": "MODIFY_ATK",
      "target": "CURRENT_PLAYER",
      "value": 1
    }
  ],
  "boardMutations": []
}

--- EXEMPLE DÉCRET #11 ---
Entrée joueur : "invoque un petit gobelin voleur sur la case (0,1)"
JSON Attendu :
{
  "title": "Incursion Gobeline",
  "description": "Un Gobelin (PV: 1, ATK: 1) s'installe en (0, 1). Le tuer donne +1 ATK.",
  "flavorText": "Vif et couard !",
  "trigger": "ON_PVE",
  "effects": [],
  "boardMutations": [
    {
      "action": "SPAWN_ENEMY",
      "cellId": "cell_0_1",
      "enemy": {
        "name": "Gobelin Sournois",
        "icon": "👺",
        "hp": 1,
        "maxHp": 1,
        "atk": 1,
        "reward": "+1 ATK permanent"
      }
    }
  ]
}

--- EXEMPLE DÉCRET #12 ---
Entrée joueur : "crée la statistique mana pour lancer des sorts"
JSON Attendu :
{
  "title": "Flux Magique",
  "description": "Tous les gladiateurs obtiennent 2 points de [Mana 🔮].",
  "flavorText": "L'énergie arcanique crépite dans l'air.",
  "trigger": "ON_ROUND_START",
  "effects": [],
  "boardMutations": [
    {
      "action": "ADD_STAT",
      "statDef": {
        "name": "Mana",
        "icon": "🔮",
        "description": "Énergie magique de réserve",
        "defaultValue": 2
      }
    }
  ]
}

--- EXEMPLE DÉCRET #13 ---
Entrée joueur : "ajoute une case téléporteur en (3,0)"
JSON Attendu :
{
  "title": "Faille Dimensionnelle",
  "description": "Un portail de distorsion est installé en (3, 0).",
  "flavorText": "Où mène ce vortex ?",
  "trigger": "ON_CELL_ENTER",
  "effects": [
    {
      "type": "TELEPORT",
      "target": "CURRENT_PLAYER",
      "value": 0
    }
  ],
  "boardMutations": [
    {
      "action": "ADD_CELL",
      "cell": {
        "name": "Faille Dimensionnelle",
        "icon": "🌀",
        "x": 3,
        "y": 0,
        "description": "Téléporte instantanément sur une autre case",
        "colorTheme": "from-cyan-950 to-blue-950 border-cyan-400 text-cyan-200"
      }
    }
  ]
}

--- EXEMPLE DÉCRET #14 ---
Entrée joueur : "au début de chaque manche tout le monde commence avec +1 d'attaque"
JSON Attendu :
{
  "title": "Escalade Militaire",
  "description": "Tous les combattants reçoivent +1 ATK au début de chaque manche !",
  "flavorText": "La violence monte d'un cran.",
  "trigger": "ON_ROUND_START",
  "effects": [
    {
      "type": "MODIFY_ATK",
      "target": "ALL_PLAYERS",
      "value": 1
    }
  ],
  "boardMutations": [
    {
      "action": "MODIFY_STAT",
      "target": "ALL_PLAYERS",
      "statName": "atk",
      "value": 1
    }
  ]
}

--- EXEMPLE DÉCRET #15 ---
Entrée joueur : "si je perds à la roulette je veux que le gagnant subisse aussi 1 dégât"
JSON Attendu :
{
  "title": "Rancune Posthume",
  "description": "Le vainqueur ne repart plus indemne : il subit 1 dégât en retour !",
  "flavorText": "Emporté dans la tombe.",
  "trigger": "ON_PVP",
  "effects": [
    {
      "type": "DAMAGE",
      "target": "ALL_OTHER_PLAYERS",
      "value": 1
    }
  ],
  "boardMutations": []
}

--- EXEMPLE DÉCRET #16 ---
Entrée joueur : "transforme la case (2,1) en oasis sacrée qui soigne"
JSON Attendu :
{
  "title": "Oasis Miraculeuse",
  "description": "La case (2, 1) se transforme en une oasis bienfaitrice (+1 PV).",
  "flavorText": "Un havre de paix au milieu du carnage.",
  "trigger": "ON_CELL_ENTER",
  "effects": [
    {
      "type": "HEAL",
      "target": "CURRENT_PLAYER",
      "value": 1
    }
  ],
  "boardMutations": [
    {
      "action": "MODIFY_CELL",
      "cellId": "cell_2_1",
      "cell": {
        "name": "Oasis Miraculeuse",
        "icon": "🌴",
        "description": "Régénère 1 PV en vous arrêtant ici",
        "colorTheme": "from-teal-950 to-emerald-950 border-teal-400 text-teal-200"
      }
    }
  ]
}

--- EXEMPLE DÉCRET #17 ---
Entrée joueur : "mets un golem de pierre protecteur avec 3 pv et 1 d'attaque"
JSON Attendu :
{
  "title": "Éveil Lithique",
  "description": "Un Golem de Pierre (PV: 3, ATK: 1) s'éveille. Il donne +1 Bouclier à sa mort.",
  "flavorText": "Impassible comme la falaise.",
  "trigger": "ON_PVE",
  "effects": [],
  "boardMutations": [
    {
      "action": "SPAWN_ENEMY",
      "cellId": "cell_1_1",
      "enemy": {
        "name": "Golem de Granit",
        "icon": "🗿",
        "hp": 3,
        "maxHp": 3,
        "atk": 1,
        "reward": "+1 Bouclier permanent"
      }
    }
  ]
}

--- EXEMPLE DÉCRET #18 ---
Entrée joueur : "ajoute la statistique vitesse pour se déplacer de 2 cases"
JSON Attendu :
{
  "title": "Bénédiction d'Hermès",
  "description": "La stat [Vitesse ⚡] passe à 2 pour tous les joueurs !",
  "flavorText": "Courez plus vite que le vent.",
  "trigger": "ON_MOVE",
  "effects": [],
  "boardMutations": [
    {
      "action": "ADD_STAT",
      "statDef": {
        "name": "Vitesse",
        "icon": "⚡",
        "description": "Rayon de déplacement maximal par tour",
        "defaultValue": 2
      }
    }
  ]
}

--- EXEMPLE DÉCRET #19 ---
Entrée joueur : "wesh le sol c'est de la lave tout le monde perd 1 pv si il bouge"
JSON Attendu :
{
  "title": "Le Sol est Brûlant !",
  "description": "Chaque déplacement blesse les combattants (-1 PV).",
  "flavorText": "Restez immobiles ou brûlez !",
  "trigger": "ON_MOVE",
  "effects": [
    {
      "type": "DAMAGE",
      "target": "CURRENT_PLAYER",
      "value": 1
    }
  ],
  "boardMutations": []
}

--- EXEMPLE DÉCRET #20 ---
Entrée joueur : "ajoute une case forge en (3,1)"
JSON Attendu :
{
  "title": "Enclume Céleste",
  "description": "Une forge divine apparaît en (3, 1). Entrer octroie +1 ATK permanent.",
  "flavorText": "Le marteau forge les légendes.",
  "trigger": "ON_CELL_ENTER",
  "effects": [
    {
      "type": "MODIFY_ATK",
      "target": "CURRENT_PLAYER",
      "value": 1
    }
  ],
  "boardMutations": [
    {
      "action": "ADD_CELL",
      "cell": {
        "name": "Forge Céleste",
        "icon": "⚒️",
        "x": 3,
        "y": 1,
        "description": "+1 ATK permanent en visitant la forge",
        "colorTheme": "from-orange-950 to-amber-950 border-orange-500 text-orange-200"
      }
    }
  ]
}

--- EXEMPLE DÉCRET #21 ---
Entrée joueur : "fais apparaître un loup sinistre avec 2 pv"
JSON Attendu :
{
  "title": "Invasion : Loup Sinistre",
  "description": "Un [Loup Sinistre 🐺] (PV: 2, ATK: 1) surgit sur le plateau. Le vaincre offre +1 ATK.",
  "flavorText": "La terre tremble sous ses pas !",
  "trigger": "ON_PVE",
  "effects": [],
  "boardMutations": [
    {
      "action": "SPAWN_ENEMY",
      "cellId": "cell_1_0",
      "enemy": {
        "name": "Loup Sinistre",
        "icon": "🐺",
        "hp": 2,
        "maxHp": 2,
        "atk": 1,
        "reward": "+1 ATK"
      }
    }
  ]
}

--- EXEMPLE DÉCRET #22 ---
Entrée joueur : "fais apparaître un squelette archer avec 2 pv"
JSON Attendu :
{
  "title": "Invasion : Squelette Archer",
  "description": "Un [Squelette Archer 🏹] (PV: 2, ATK: 1) surgit sur le plateau. Le vaincre offre +1 ATK.",
  "flavorText": "La terre tremble sous ses pas !",
  "trigger": "ON_PVE",
  "effects": [],
  "boardMutations": [
    {
      "action": "SPAWN_ENEMY",
      "cellId": "cell_1_0",
      "enemy": {
        "name": "Squelette Archer",
        "icon": "🏹",
        "hp": 2,
        "maxHp": 2,
        "atk": 1,
        "reward": "+1 ATK"
      }
    }
  ]
}

--- EXEMPLE DÉCRET #23 ---
Entrée joueur : "fais apparaître un spectre glacial avec 2 pv"
JSON Attendu :
{
  "title": "Invasion : Spectre Glacial",
  "description": "Un [Spectre Glacial 👻] (PV: 2, ATK: 2) surgit sur le plateau. Le vaincre offre +1 Mana.",
  "flavorText": "La terre tremble sous ses pas !",
  "trigger": "ON_PVE",
  "effects": [],
  "boardMutations": [
    {
      "action": "SPAWN_ENEMY",
      "cellId": "cell_1_0",
      "enemy": {
        "name": "Spectre Glacial",
        "icon": "👻",
        "hp": 2,
        "maxHp": 2,
        "atk": 2,
        "reward": "+1 Mana"
      }
    }
  ]
}

--- EXEMPLE DÉCRET #24 ---
Entrée joueur : "fais apparaître un chevalier noir avec 3 pv"
JSON Attendu :
{
  "title": "Invasion : Chevalier Noir",
  "description": "Un [Chevalier Noir 🛡️] (PV: 3, ATK: 2) surgit sur le plateau. Le vaincre offre +1 ATK permanent.",
  "flavorText": "La terre tremble sous ses pas !",
  "trigger": "ON_PVE",
  "effects": [],
  "boardMutations": [
    {
      "action": "SPAWN_ENEMY",
      "cellId": "cell_1_0",
      "enemy": {
        "name": "Chevalier Noir",
        "icon": "🛡️",
        "hp": 3,
        "maxHp": 3,
        "atk": 2,
        "reward": "+1 ATK permanent"
      }
    }
  ]
}

--- EXEMPLE DÉCRET #25 ---
Entrée joueur : "fais apparaître un liche déchue avec 3 pv"
JSON Attendu :
{
  "title": "Invasion : Liche Déchue",
  "description": "Un [Liche Déchue 💀] (PV: 3, ATK: 2) surgit sur le plateau. Le vaincre offre +1 PV max.",
  "flavorText": "La terre tremble sous ses pas !",
  "trigger": "ON_PVE",
  "effects": [],
  "boardMutations": [
    {
      "action": "SPAWN_ENEMY",
      "cellId": "cell_1_0",
      "enemy": {
        "name": "Liche Déchue",
        "icon": "💀",
        "hp": 3,
        "maxHp": 3,
        "atk": 2,
        "reward": "+1 PV max"
      }
    }
  ]
}

--- EXEMPLE DÉCRET #26 ---
Entrée joueur : "fais apparaître un mimique vorace avec 2 pv"
JSON Attendu :
{
  "title": "Invasion : Mimique Vorace",
  "description": "Un [Mimique Vorace 📦] (PV: 2, ATK: 2) surgit sur le plateau. Le vaincre offre +1 ATK et +1 PV.",
  "flavorText": "La terre tremble sous ses pas !",
  "trigger": "ON_PVE",
  "effects": [],
  "boardMutations": [
    {
      "action": "SPAWN_ENEMY",
      "cellId": "cell_1_0",
      "enemy": {
        "name": "Mimique Vorace",
        "icon": "📦",
        "hp": 2,
        "maxHp": 2,
        "atk": 2,
        "reward": "+1 ATK et +1 PV"
      }
    }
  ]
}

--- EXEMPLE DÉCRET #27 ---
Entrée joueur : "fais apparaître un gargouille ailée avec 2 pv"
JSON Attendu :
{
  "title": "Invasion : Gargouille Ailée",
  "description": "Un [Gargouille Ailée 🦇] (PV: 2, ATK: 1) surgit sur le plateau. Le vaincre offre +1 ATK.",
  "flavorText": "La terre tremble sous ses pas !",
  "trigger": "ON_PVE",
  "effects": [],
  "boardMutations": [
    {
      "action": "SPAWN_ENEMY",
      "cellId": "cell_1_0",
      "enemy": {
        "name": "Gargouille Ailée",
        "icon": "🦇",
        "hp": 2,
        "maxHp": 2,
        "atk": 1,
        "reward": "+1 ATK"
      }
    }
  ]
}

--- EXEMPLE DÉCRET #28 ---
Entrée joueur : "fais apparaître un hydre venimeuse avec 4 pv"
JSON Attendu :
{
  "title": "Invasion : Hydre Venimeuse",
  "description": "Un [Hydre Venimeuse 🐍] (PV: 4, ATK: 2) surgit sur le plateau. Le vaincre offre +1 PV max.",
  "flavorText": "La terre tremble sous ses pas !",
  "trigger": "ON_PVE",
  "effects": [],
  "boardMutations": [
    {
      "action": "SPAWN_ENEMY",
      "cellId": "cell_1_0",
      "enemy": {
        "name": "Hydre Venimeuse",
        "icon": "🐍",
        "hp": 4,
        "maxHp": 4,
        "atk": 2,
        "reward": "+1 PV max"
      }
    }
  ]
}

--- EXEMPLE DÉCRET #29 ---
Entrée joueur : "fais apparaître un seigneur démon avec 4 pv"
JSON Attendu :
{
  "title": "Invasion : Seigneur Démon",
  "description": "Un [Seigneur Démon 👹] (PV: 4, ATK: 2) surgit sur le plateau. Le vaincre offre +2 ATK.",
  "flavorText": "La terre tremble sous ses pas !",
  "trigger": "ON_PVE",
  "effects": [],
  "boardMutations": [
    {
      "action": "SPAWN_ENEMY",
      "cellId": "cell_1_0",
      "enemy": {
        "name": "Seigneur Démon",
        "icon": "👹",
        "hp": 4,
        "maxHp": 4,
        "atk": 2,
        "reward": "+2 ATK"
      }
    }
  ]
}

--- EXEMPLE DÉCRET #30 ---
Entrée joueur : "fais apparaître un dragon noir avec 5 pv"
JSON Attendu :
{
  "title": "Invasion : Dragon Noir",
  "description": "Un [Dragon Noir 🐉] (PV: 5, ATK: 3) surgit sur le plateau. Le vaincre offre +2 ATK.",
  "flavorText": "La terre tremble sous ses pas !",
  "trigger": "ON_PVE",
  "effects": [],
  "boardMutations": [
    {
      "action": "SPAWN_ENEMY",
      "cellId": "cell_1_0",
      "enemy": {
        "name": "Dragon Noir",
        "icon": "🐉",
        "hp": 5,
        "maxHp": 5,
        "atk": 3,
        "reward": "+2 ATK"
      }
    }
  ]
}

--- EXEMPLE DÉCRET #31 ---
Entrée joueur : "ajoute une case colisée maudit à droite"
JSON Attendu :
{
  "title": "Émergence : Colisée Maudit",
  "description": "Une case [Colisée Maudit 🏟️] est annexée au plateau en (3, 0). Arène de duels sanglants.",
  "flavorText": "L'arène étend son emprise !",
  "trigger": "ON_MOVE",
  "effects": [],
  "boardMutations": [
    {
      "action": "ADD_CELL",
      "cell": {
        "name": "Colisée Maudit",
        "icon": "🏟️",
        "x": 3,
        "y": 0,
        "description": "Arène de duels sanglants",
        "colorTheme": "from-red-950 to-amber-950 border-red-500 text-red-200"
      }
    }
  ]
}

--- EXEMPLE DÉCRET #32 ---
Entrée joueur : "ajoute une case bibliothèque oubliée à droite"
JSON Attendu :
{
  "title": "Émergence : Bibliothèque Oubliée",
  "description": "Une case [Bibliothèque Oubliée 📚] est annexée au plateau en (3, 0). Grimoires conférant +1 ATK.",
  "flavorText": "L'arène étend son emprise !",
  "trigger": "ON_MOVE",
  "effects": [],
  "boardMutations": [
    {
      "action": "ADD_CELL",
      "cell": {
        "name": "Bibliothèque Oubliée",
        "icon": "📚",
        "x": 3,
        "y": 0,
        "description": "Grimoires conférant +1 ATK",
        "colorTheme": "from-blue-950 to-indigo-950 border-blue-400 text-blue-200"
      }
    }
  ]
}

--- EXEMPLE DÉCRET #33 ---
Entrée joueur : "ajoute une case marais toxique à droite"
JSON Attendu :
{
  "title": "Émergence : Marais Toxique",
  "description": "Une case [Marais Toxique 🧪] est annexée au plateau en (3, 0). Sol vénéneux : -1 PV.",
  "flavorText": "L'arène étend son emprise !",
  "trigger": "ON_MOVE",
  "effects": [],
  "boardMutations": [
    {
      "action": "ADD_CELL",
      "cell": {
        "name": "Marais Toxique",
        "icon": "🧪",
        "x": 3,
        "y": 0,
        "description": "Sol vénéneux : -1 PV",
        "colorTheme": "from-emerald-950 to-lime-950 border-lime-500 text-lime-200"
      }
    }
  ]
}

--- EXEMPLE DÉCRET #34 ---
Entrée joueur : "ajoute une case sanctuaire céleste à droite"
JSON Attendu :
{
  "title": "Émergence : Sanctuaire Céleste",
  "description": "Une case [Sanctuaire Céleste 🕊️] est annexée au plateau en (3, 0). Zone sacrée immunisant aux coups.",
  "flavorText": "L'arène étend son emprise !",
  "trigger": "ON_MOVE",
  "effects": [],
  "boardMutations": [
    {
      "action": "ADD_CELL",
      "cell": {
        "name": "Sanctuaire Céleste",
        "icon": "🕊️",
        "x": 3,
        "y": 0,
        "description": "Zone sacrée immunisant aux coups",
        "colorTheme": "from-sky-950 to-slate-900 border-sky-400 text-sky-200"
      }
    }
  ]
}

--- EXEMPLE DÉCRET #35 ---
Entrée joueur : "ajoute une case crypte hantée à droite"
JSON Attendu :
{
  "title": "Émergence : Crypte Hantée",
  "description": "Une case [Crypte Hantée ⚰️] est annexée au plateau en (3, 0). Les fantômes guettent.",
  "flavorText": "L'arène étend son emprise !",
  "trigger": "ON_MOVE",
  "effects": [],
  "boardMutations": [
    {
      "action": "ADD_CELL",
      "cell": {
        "name": "Crypte Hantée",
        "icon": "⚰️",
        "x": 3,
        "y": 0,
        "description": "Les fantômes guettent",
        "colorTheme": "from-slate-950 to-purple-950 border-purple-500 text-purple-200"
      }
    }
  ]
}

--- EXEMPLE DÉCRET #36 ---
Entrée joueur : "ajoute une case mine d'or à droite"
JSON Attendu :
{
  "title": "Émergence : Mine d'Or",
  "description": "Une case [Mine d'Or 💰] est annexée au plateau en (3, 0). Gisement riche en métal précieux.",
  "flavorText": "L'arène étend son emprise !",
  "trigger": "ON_MOVE",
  "effects": [],
  "boardMutations": [
    {
      "action": "ADD_CELL",
      "cell": {
        "name": "Mine d'Or",
        "icon": "💰",
        "x": 3,
        "y": 0,
        "description": "Gisement riche en métal précieux",
        "colorTheme": "from-yellow-950 to-amber-950 border-yellow-500 text-yellow-200"
      }
    }
  ]
}

--- EXEMPLE DÉCRET #37 ---
Entrée joueur : "ajoute une case geôle sombre à droite"
JSON Attendu :
{
  "title": "Émergence : Geôle Sombre",
  "description": "Une case [Geôle Sombre ⛓️] est annexée au plateau en (3, 0). Prison pour captifs.",
  "flavorText": "L'arène étend son emprise !",
  "trigger": "ON_MOVE",
  "effects": [],
  "boardMutations": [
    {
      "action": "ADD_CELL",
      "cell": {
        "name": "Geôle Sombre",
        "icon": "⛓️",
        "x": 3,
        "y": 0,
        "description": "Prison pour captifs",
        "colorTheme": "from-zinc-950 to-stone-900 border-zinc-600 text-zinc-200"
      }
    }
  ]
}

--- EXEMPLE DÉCRET #38 ---
Entrée joueur : "ajoute une case autel sanglant à droite"
JSON Attendu :
{
  "title": "Émergence : Autel Sanglant",
  "description": "Une case [Autel Sanglant 🩸] est annexée au plateau en (3, 0). Sacrifice conférant la puissance.",
  "flavorText": "L'arène étend son emprise !",
  "trigger": "ON_MOVE",
  "effects": [],
  "boardMutations": [
    {
      "action": "ADD_CELL",
      "cell": {
        "name": "Autel Sanglant",
        "icon": "🩸",
        "x": 3,
        "y": 0,
        "description": "Sacrifice conférant la puissance",
        "colorTheme": "from-rose-950 to-red-950 border-rose-500 text-rose-200"
      }
    }
  ]
}

--- EXEMPLE DÉCRET #39 ---
Entrée joueur : "ajoute la stat poison qui commence à 0"
JSON Attendu :
{
  "title": "Nouvelle Caractéristique : Poison",
  "description": "Tous les combattants possèdent désormais la statistique [Poison 🧪] (base: 0).",
  "flavorText": "Une nouvelle dimension stratégique s'ouvre !",
  "trigger": "ON_ROUND_START",
  "effects": [],
  "boardMutations": [
    {
      "action": "ADD_STAT",
      "statDef": {
        "name": "Poison",
        "icon": "🧪",
        "description": "Niveau de toxines infligeant des dégâts chaque tour",
        "defaultValue": 0
      }
    }
  ]
}

--- EXEMPLE DÉCRET #40 ---
Entrée joueur : "ajoute la stat armure qui commence à 1"
JSON Attendu :
{
  "title": "Nouvelle Caractéristique : Armure",
  "description": "Tous les combattants possèdent désormais la statistique [Armure 🦺] (base: 1).",
  "flavorText": "Une nouvelle dimension stratégique s'ouvre !",
  "trigger": "ON_ROUND_START",
  "effects": [],
  "boardMutations": [
    {
      "action": "ADD_STAT",
      "statDef": {
        "name": "Armure",
        "icon": "🦺",
        "description": "Résistance réduisant les blessures reçues",
        "defaultValue": 1
      }
    }
  ]
}

--- EXEMPLE DÉCRET #41 ---
Entrée joueur : "ajoute la stat esquive qui commence à 10"
JSON Attendu :
{
  "title": "Nouvelle Caractéristique : Esquive",
  "description": "Tous les combattants possèdent désormais la statistique [Esquive 🥋] (base: 10).",
  "flavorText": "Une nouvelle dimension stratégique s'ouvre !",
  "trigger": "ON_ROUND_START",
  "effects": [],
  "boardMutations": [
    {
      "action": "ADD_STAT",
      "statDef": {
        "name": "Esquive",
        "icon": "🥋",
        "description": "Pourcentage de chance d'éviter un duel",
        "defaultValue": 10
      }
    }
  ]
}

--- EXEMPLE DÉCRET #42 ---
Entrée joueur : "ajoute la stat chance qui commence à 1"
JSON Attendu :
{
  "title": "Nouvelle Caractéristique : Chance",
  "description": "Tous les combattants possèdent désormais la statistique [Chance 🍀] (base: 1).",
  "flavorText": "Une nouvelle dimension stratégique s'ouvre !",
  "trigger": "ON_ROUND_START",
  "effects": [],
  "boardMutations": [
    {
      "action": "ADD_STAT",
      "statDef": {
        "name": "Chance",
        "icon": "🍀",
        "description": "Modificateur influençant favorablement les roulettes",
        "defaultValue": 1
      }
    }
  ]
}

--- EXEMPLE DÉCRET #43 ---
Entrée joueur : "ajoute la stat rage qui commence à 0"
JSON Attendu :
{
  "title": "Nouvelle Caractéristique : Rage",
  "description": "Tous les combattants possèdent désormais la statistique [Rage 💢] (base: 0).",
  "flavorText": "Une nouvelle dimension stratégique s'ouvre !",
  "trigger": "ON_ROUND_START",
  "effects": [],
  "boardMutations": [
    {
      "action": "ADD_STAT",
      "statDef": {
        "name": "Rage",
        "icon": "💢",
        "description": "Puissance accumulée lorsque l'on subit des dégâts",
        "defaultValue": 0
      }
    }
  ]
}

--- EXEMPLE DÉCRET #44 ---
Entrée joueur : "ajoute la stat or qui commence à 5"
JSON Attendu :
{
  "title": "Nouvelle Caractéristique : Or",
  "description": "Tous les combattants possèdent désormais la statistique [Or 🪙] (base: 5).",
  "flavorText": "Une nouvelle dimension stratégique s'ouvre !",
  "trigger": "ON_ROUND_START",
  "effects": [],
  "boardMutations": [
    {
      "action": "ADD_STAT",
      "statDef": {
        "name": "Or",
        "icon": "🪙",
        "description": "Monnaie pour acheter des améliorations en jeu",
        "defaultValue": 5
      }
    }
  ]
}

--- EXEMPLE DÉCRET #45 ---
Entrée joueur : "ajoute la stat folie qui commence à 0"
JSON Attendu :
{
  "title": "Nouvelle Caractéristique : Folie",
  "description": "Tous les combattants possèdent désormais la statistique [Folie 👁️] (base: 0).",
  "flavorText": "Une nouvelle dimension stratégique s'ouvre !",
  "trigger": "ON_ROUND_START",
  "effects": [],
  "boardMutations": [
    {
      "action": "ADD_STAT",
      "statDef": {
        "name": "Folie",
        "icon": "👁️",
        "description": "Influence psychologique augmentant l'instabilité",
        "defaultValue": 0
      }
    }
  ]
}

--- EXEMPLE DÉCRET #46 ---
Entrée joueur : "ajoute la stat portée qui commence à 1"
JSON Attendu :
{
  "title": "Nouvelle Caractéristique : Portée",
  "description": "Tous les combattants possèdent désormais la statistique [Portée 🏹] (base: 1).",
  "flavorText": "Une nouvelle dimension stratégique s'ouvre !",
  "trigger": "ON_ROUND_START",
  "effects": [],
  "boardMutations": [
    {
      "action": "ADD_STAT",
      "statDef": {
        "name": "Portée",
        "icon": "🏹",
        "description": "Distance d'attaque à distance",
        "defaultValue": 1
      }
    }
  ]
}

--- EXEMPLE DÉCRET #47 ---
Entrée joueur : "ajoute la stat endurance qui commence à 2"
JSON Attendu :
{
  "title": "Nouvelle Caractéristique : Endurance",
  "description": "Tous les combattants possèdent désormais la statistique [Endurance 🫀] (base: 2).",
  "flavorText": "Une nouvelle dimension stratégique s'ouvre !",
  "trigger": "ON_ROUND_START",
  "effects": [],
  "boardMutations": [
    {
      "action": "ADD_STAT",
      "statDef": {
        "name": "Endurance",
        "icon": "🫀",
        "description": "Capacité à encaisser les châtiments",
        "defaultValue": 2
      }
    }
  ]
}

--- EXEMPLE DÉCRET #48 ---
Entrée joueur : "ajoute la stat bravoure qui commence à 1"
JSON Attendu :
{
  "title": "Nouvelle Caractéristique : Bravoure",
  "description": "Tous les combattants possèdent désormais la statistique [Bravoure 🦁] (base: 1).",
  "flavorText": "Une nouvelle dimension stratégique s'ouvre !",
  "trigger": "ON_ROUND_START",
  "effects": [],
  "boardMutations": [
    {
      "action": "ADD_STAT",
      "statDef": {
        "name": "Bravoure",
        "icon": "🦁",
        "description": "Courage haussant l'attaque face aux boss",
        "defaultValue": 1
      }
    }
  ]
}

--- EXEMPLE DÉCRET #49 ---
Entrée joueur : "quand on tue un joueur on récupère 1 pv"
JSON Attendu :
{
  "title": "Festin d'Âmes",
  "description": "Éliminer un adversaire régénère 1 PV au bourreau.",
  "flavorText": "Les lois du destin obéissent au décret !",
  "trigger": "ON_KILL",
  "effects": [
    {
      "type": "HEAL",
      "target": "CURRENT_PLAYER",
      "value": 1
    }
  ],
  "boardMutations": []
}

--- EXEMPLE DÉCRET #50 ---
Entrée joueur : "celui qui commence son tour gagne 1 d'attaque pour ce tour"
JSON Attendu :
{
  "title": "Élan Guerrier",
  "description": "Le début de tour galvanise le combattant actif (+1 ATK).",
  "flavorText": "Les lois du destin obéissent au décret !",
  "trigger": "ON_TURN_START",
  "effects": [
    {
      "type": "MODIFY_ATK",
      "target": "CURRENT_PLAYER",
      "value": 1
    }
  ],
  "boardMutations": []
}

--- EXEMPLE DÉCRET #51 ---
Entrée joueur : "tous les joueurs commencent avec 4 pv max"
JSON Attendu :
{
  "title": "Vitalité Accrue",
  "description": "La réserve de santé maximale passe à 4 PV pour tout le monde.",
  "flavorText": "Les lois du destin obéissent au décret !",
  "trigger": "ON_ROUND_START",
  "effects": [
    {
      "type": "HEAL",
      "target": "ALL_PLAYERS",
      "value": 1
    }
  ],
  "boardMutations": []
}

--- EXEMPLE DÉCRET #52 ---
Entrée joueur : "les perdants de combat ressuscitent avec +1 d'attaque la prochaine manche"
JSON Attendu :
{
  "title": "Esprit Vengeur",
  "description": "La défaite nourrit la rage pour la manche suivante.",
  "flavorText": "Les lois du destin obéissent au décret !",
  "trigger": "ON_ROUND_START",
  "effects": [
    {
      "type": "MODIFY_ATK",
      "target": "ALL_PLAYERS",
      "value": 1
    }
  ],
  "boardMutations": []
}

--- EXEMPLE DÉCRET #53 ---
Entrée joueur : "tuer quelqu'un donne 2 points de bouclier"
JSON Attendu :
{
  "title": "Trophée d'Os",
  "description": "Le vainqueur s'empare des défenses du vaincu.",
  "flavorText": "Les lois du destin obéissent au décret !",
  "trigger": "ON_KILL",
  "effects": [
    {
      "type": "MODIFY_STAT",
      "target": "CURRENT_PLAYER",
      "statName": "Bouclier",
      "value": 2
    }
  ],
  "boardMutations": []
}

--- EXEMPLE DÉCRET #54 ---
Entrée joueur : "si quelqu'un entre sur la case (0,0) il perd 1 pv"
JSON Attendu :
{
  "title": "Malédiction du Nord",
  "description": "La case (0, 0) est frappée d'un sortilège mortel.",
  "flavorText": "Les lois du destin obéissent au décret !",
  "trigger": "ON_CELL_ENTER",
  "effects": [
    {
      "type": "DAMAGE",
      "target": "CURRENT_PLAYER",
      "value": 1
    }
  ],
  "boardMutations": []
}

--- EXEMPLE DÉCRET #55 ---
Entrée joueur : "si on a 1 pv on tape avec +1 d'attaque supplémentaire"
JSON Attendu :
{
  "title": "Dernier Rempart",
  "description": "La proximité de la mort décuple la férocité !",
  "flavorText": "Les lois du destin obéissent au décret !",
  "trigger": "ON_PVP",
  "effects": [
    {
      "type": "MODIFY_ATK",
      "target": "CURRENT_PLAYER",
      "value": 1
    }
  ],
  "boardMutations": []
}

--- EXEMPLE DÉCRET #56 ---
Entrée joueur : "au début de la manche tout le monde pioche un point de mana"
JSON Attendu :
{
  "title": "Marée d'Éther",
  "description": "Les énergies astrales se déversent sur l'arène.",
  "flavorText": "Les lois du destin obéissent au décret !",
  "trigger": "ON_ROUND_START",
  "effects": [
    {
      "type": "MODIFY_STAT",
      "target": "ALL_PLAYERS",
      "statName": "Mana",
      "value": 1
    }
  ],
  "boardMutations": []
}

--- EXEMPLE DÉCRET #57 ---
Entrée joueur : "tous les 2 tours une pluie d'étoiles soigne tout le monde de 1 pv"
JSON Attendu :
{
  "title": "Rosée Nocturne",
  "description": "Une brise apaisante panse les plaies des combattants.",
  "flavorText": "Les lois du destin obéissent au décret !",
  "trigger": "ON_ROUND_START",
  "effects": [
    {
      "type": "HEAL",
      "target": "ALL_PLAYERS",
      "value": 1
    }
  ],
  "boardMutations": []
}

--- EXEMPLE DÉCRET #58 ---
Entrée joueur : "quand un combat a lieu la case s'effondre en lave"
JSON Attendu :
{
  "title": "Terre Brûlée",
  "description": "L'intensité du duel embrase le sol sous les pieds.",
  "flavorText": "Les lois du destin obéissent au décret !",
  "trigger": "ON_PVP",
  "effects": [],
  "boardMutations": [
    {
      "action": "MODIFY_CELL",
      "cellId": "cell_1_1",
      "cell": {
        "name": "Cendres Chaudes",
        "icon": "🔥",
        "description": "Sol calciné par les combats",
        "colorTheme": "from-red-950 to-orange-950 border-red-600 text-orange-200"
      }
    }
  ]
}

--- EXEMPLE DÉCRET #59 ---
Entrée joueur : "cheh vous allez tous crever un boss golem arrive en (1,1)"
JSON Attendu :
{
  "title": "Châtiment Impitoyable",
  "description": "Un Golem Ancestral (PV: 4, ATK: 2) prend possession de la case centrale !",
  "flavorText": "La rancune est éternelle !",
  "trigger": "ON_PVE",
  "effects": [],
  "boardMutations": [
    {
      "action": "SPAWN_ENEMY",
      "cellId": "cell_1_1",
      "enemy": {
        "name": "Golem Ancestral",
        "icon": "🗿",
        "hp": 4,
        "maxHp": 4,
        "atk": 2,
        "reward": "+1 ATK"
      }
    }
  ]
}

--- EXEMPLE DÉCRET #60 ---
Entrée joueur : "ajoute une case casino avec une machine à sous en (3,1)"
JSON Attendu :
{
  "title": "Tripot Clandestin",
  "description": "Une case Casino émerge en (3, 1). Venez miser votre vie !",
  "flavorText": "Rien ne va plus !",
  "trigger": "ON_CELL_ENTER",
  "effects": [],
  "boardMutations": [
    {
      "action": "ADD_CELL",
      "cell": {
        "name": "Machine du Diable",
        "icon": "🎰",
        "x": 3,
        "y": 1,
        "description": "Tentez votre chance contre le sort.",
        "colorTheme": "from-purple-950 to-amber-950 border-amber-400 text-amber-200"
      }
    }
  ]
}

--- EXEMPLE DÉCRET #61 ---
Entrée joueur : "tout le monde commence la manche avec 1 seul pv mort subite"
JSON Attendu :
{
  "title": "Mort Subite du Chaos",
  "description": "Tous les gladiateurs n'ont plus qu'un unique souffle de vie (1 PV) !",
  "flavorText": "Une seule erreur et c'est la fin.",
  "trigger": "ON_ROUND_START",
  "effects": [
    {
      "type": "DAMAGE",
      "target": "ALL_PLAYERS",
      "value": 2
    }
  ],
  "boardMutations": []
}

--- EXEMPLE DÉCRET #62 ---
Entrée joueur : "ajoute un sanctuaire en bas à droite en (2,2)"
JSON Attendu :
{
  "title": "Sanctuaire de l'Aurore",
  "description": "Un lieu saint s'élève en (2, 2) offrant la bénédiction aux pèlerins.",
  "flavorText": "Que la lumière vous guide.",
  "trigger": "ON_CELL_ENTER",
  "effects": [
    {
      "type": "HEAL",
      "target": "CURRENT_PLAYER",
      "value": 1
    }
  ],
  "boardMutations": [
    {
      "action": "ADD_CELL",
      "cell": {
        "name": "Sanctuaire de l'Aurore",
        "icon": "🕊️",
        "x": 2,
        "y": 2,
        "description": "Régénère 1 PV à quiconque s'y recueille.",
        "colorTheme": "from-sky-950 to-emerald-950 border-sky-400 text-sky-200"
      }
    }
  ]
}

--- EXEMPLE DÉCRET #63 ---
Entrée joueur : "mets une cage en fer pour enfermer les fuyards"
JSON Attendu :
{
  "title": "Cage de Fer",
  "description": "Une prison de métal est forgée en (3, 0).",
  "flavorText": "Les barreaux grincent au vent.",
  "trigger": "ON_MOVE",
  "effects": [],
  "boardMutations": [
    {
      "action": "ADD_CELL",
      "cell": {
        "name": "Cage de Fer",
        "icon": "⛓️",
        "x": 3,
        "y": 0,
        "description": "Les barreaux retiennent les prisonniers.",
        "colorTheme": "from-zinc-950 to-slate-900 border-zinc-500 text-zinc-300"
      }
    }
  ]
}

--- EXEMPLE DÉCRET #64 ---
Entrée joueur : "inverse la roulette le plus faible a 70% de chance de gagner"
JSON Attendu :
{
  "title": "Inversion Karmique",
  "description": "Le sort s'acharne désormais sur les puissants et couronne les faibles !",
  "flavorText": "Les derniers seront les premiers !",
  "trigger": "ON_PVP",
  "effects": [],
  "boardMutations": []
}

--- EXEMPLE DÉCRET #65 ---
Entrée joueur : "ajoute un coffre maudit qui explose quand on l'ouvre"
JSON Attendu :
{
  "title": "Piège Explosif",
  "description": "Un faux coffre piégé apparaît en (3, 1). Inflige 1 dégât à l'effraction.",
  "flavorText": "Curiosité fatale !",
  "trigger": "ON_CELL_ENTER",
  "effects": [
    {
      "type": "DAMAGE",
      "target": "CURRENT_PLAYER",
      "value": 1
    }
  ],
  "boardMutations": [
    {
      "action": "ADD_CELL",
      "cell": {
        "name": "Coffre Explosif",
        "icon": "💣",
        "x": 3,
        "y": 1,
        "description": "Explosion surprise : 1 dégât immédiat.",
        "colorTheme": "from-stone-950 to-red-950 border-red-600 text-red-300"
      }
    }
  ]
}

--- EXEMPLE DÉCRET #66 ---
Entrée joueur : "fais apparaître un poulet mutant agressif"
JSON Attendu :
{
  "title": "Terreur Aviaire",
  "description": "Un Poulet Vorace (PV: 2, ATK: 1) picore le sol avec férocité !",
  "flavorText": "Cot cot cot... PAN !",
  "trigger": "ON_PVE",
  "effects": [],
  "boardMutations": [
    {
      "action": "SPAWN_ENEMY",
      "cellId": "cell_0_0",
      "enemy": {
        "name": "Poulet Mutant",
        "icon": "🐔",
        "hp": 2,
        "maxHp": 2,
        "atk": 1,
        "reward": "+1 PV régénéré"
      }
    }
  ]
}

--- EXEMPLE DÉCRET #67 ---
Entrée joueur : "supprime 2 cases d'un coup la map rétrécit"
JSON Attendu :
{
  "title": "Affaissement Majeur",
  "description": "Deux pans du monde s'effondrent dans le gouffre de l'oubli.",
  "flavorText": "L'étau se resserre !",
  "trigger": "ON_MOVE",
  "effects": [],
  "boardMutations": [
    {
      "action": "REMOVE_CELL",
      "cellId": "cell_0_0"
    },
    {
      "action": "REMOVE_CELL",
      "cellId": "cell_2_1"
    }
  ]
}

--- EXEMPLE DÉCRET #68 ---
Entrée joueur : "ajoute une case tour d'archer qui tire sur les passants"
JSON Attendu :
{
  "title": "Tour des Balistes",
  "description": "Une fortification est érigée en (1, 2) criblant de flèches les intrus (-1 PV).",
  "flavorText": "Pluie de flèches en approche !",
  "trigger": "ON_CELL_ENTER",
  "effects": [
    {
      "type": "DAMAGE",
      "target": "CURRENT_PLAYER",
      "value": 1
    }
  ],
  "boardMutations": [
    {
      "action": "ADD_CELL",
      "cell": {
        "name": "Tour des Balistes",
        "icon": "🏹",
        "x": 1,
        "y": 2,
        "description": "Tir défensif : 1 dégât à l'entrée.",
        "colorTheme": "from-stone-950 to-amber-950 border-stone-600 text-amber-300"
      }
    }
  ]
}

`;
exports.CHAOS_COMBOS_AND_STATUS_THEORY = `
══════════════════════════════════════════════════════════════════════════════
   THÉORIE AVANCÉE DU ROGUELITE : COMBOS, ÉTATS SPÉCIAUX & ARCHÉTYPES DE CARTES
══════════════════════════════════════════════════════════════════════════════

1. LE SYSTEME DES ALTÉRATIONS D'ÉTAT TEMPORAIRES ET PERMANENTES :
Le Chaos Board permet au Législateur d'introduire des statuts dynamiques :
- Brûlure 🔥 : Inflige 1 dégât à chaque déplacement sur une case calcinée.
- Poison 🧪 : La statistique de Poison s'accumule et draine les points de vie au début du tour.
- Bouclier 🛡️ : Absorbe la prochaine perte de point de vie (PvP ou PvE) à la place du joueur.
- Vitesse ⚡ : Augmente le rayon de déplacement (Chebyshev distance) de 1 à 2 cases par tour.
- Gel ❄️ : Réduit la vitesse ou immobilise temporairement le combattant sur la case.
- Furie / Rage 💢 : Plus le joueur a subi de blessures (PV réduits), plus son ATK augmente.
- Mana 🔮 : Utilisé comme monnaie énergétique pour activer des reliques ou lancer des sorts de zone.

2. MATHÉMATIQUES PRÉCISES DE LA ROULETTE DU DESTIN :
La Roulette du Destin calcule scrupuleusement les probabilités :
- Duel 1 ATK vs 1 ATK -> Exactement 50.0% de chances pour chaque joueur.
- Duel 2 ATK vs 1 ATK -> 66.7% de chances pour l'attaquant, 33.3% pour le défenseur.
- Duel 3 ATK vs 1 ATK -> 75.0% de chances pour l'attaquant, 25.0% pour le défenseur.
- Duel 2 ATK vs 2 ATK -> 50.0% de chances chacun.
La roulette est conçue pour laisser toujours une chance au plus faible de triompher miraculeusement (upset héroïque),
tout en récompensant les joueurs ayant investi dans l'augmentation de leur ATK permanente !

3. PRINCIPES DE TOPOLOGIE ET D'ÉVOLUTION DE L'ARÈNE 2D :
Le plateau commence en 3x2 (6 cases).
Au fur et à mesure que les joueurs meurent et créent des décrets :
- L'arène s'étend naturellement en 4x2, 3x3, 4x3, puis 4x4.
- L'objectif est de maintenir une arène compacte et lisible :
  * Ne jamais créer de cellules orphelines flottant à distance > 1 des autres.
  * Toujours choisir une coordonnée adjacente libre :
    (3, 0), (3, 1) pour l'Est.
    (0, 2), (1, 2), (2, 2) pour le Sud.
    (3, 2) pour fermer le coin Sud-Est.
- Lorsqu'une case est détruite (REMOVE_CELL), les joueurs dessus sont immédiatement rapatriés sur la case neutre la plus proche (cell_0_0).
`;
exports.CHAOS_EXTRA_FEW_SHOTS = `
--- EXEMPLE DÉCRET #69 ---
Entrée joueur : "si quelqu'un me tue je veux qu'il perde 2 pv direct karma"
JSON Attendu :
{
  "title": "Karma Vengeur",
  "description": "Le meurtrier subit un choc en retour brutal de 2 dégâts !",
  "flavorText": "Le prix du sang se paie comptant !",
  "trigger": "ON_KILL",
  "effects": [
    {
      "type": "DAMAGE",
      "target": "CURRENT_PLAYER",
      "value": 2
    }
  ],
  "boardMutations": []
}

--- EXEMPLE DÉCRET #70 ---
Entrée joueur : "ajoute une zone marécageuse au sud en (0,2) qui ralentit"
JSON Attendu :
{
  "title": "Bourbier Putride",
  "description": "Un marécage visqueux apparaît en (0, 2).",
  "flavorText": "La boue s'infiltre dans les armures.",
  "trigger": "ON_CELL_ENTER",
  "effects": [],
  "boardMutations": [
    {
      "action": "ADD_CELL",
      "cell": {
        "name": "Bourbier Putride",
        "icon": "🌿",
        "x": 0,
        "y": 2,
        "description": "Sol boueux difficile d'accès.",
        "colorTheme": "from-stone-950 to-emerald-950 border-stone-600 text-emerald-300"
      }
    }
  ]
}

--- EXEMPLE DÉCRET #71 ---
Entrée joueur : "fais spawner un boss géant des glaces qui a 4 pv et 2 d'attaque"
JSON Attendu :
{
  "title": "Géant du Givre",
  "description": "Le Géant du Givre (PV: 4, ATK: 2) souffle une bise glaciale sur l'arène !",
  "flavorText": "Le froid transperce les os.",
  "trigger": "ON_PVE",
  "effects": [],
  "boardMutations": [
    {
      "action": "SPAWN_ENEMY",
      "cellId": "cell_1_0",
      "enemy": {
        "name": "Géant du Givre",
        "icon": "🧊",
        "hp": 4,
        "maxHp": 4,
        "atk": 2,
        "reward": "+1 PV max"
      }
    }
  ]
}

--- EXEMPLE DÉCRET #72 ---
Entrée joueur : "la roulette a 80% de chance pour celui qui a le moins d'atk"
JSON Attendu :
{
  "title": "Sursaut des Faibles",
  "description": "La roulette s'inverse et favorise outrageusement l'opprimé !",
  "flavorText": "La révolte des démunis.",
  "trigger": "ON_PVP",
  "effects": [],
  "boardMutations": []
}

--- EXEMPLE DÉCRET #73 ---
Entrée joueur : "ajoute une boutique d'armures en (3,0)"
JSON Attendu :
{
  "title": "Échoppe du Forgeron",
  "description": "Un artisan vend ses plaques d'acier en (3, 0) (+1 Bouclier).",
  "flavorText": "Du travail d'orfèvre !",
  "trigger": "ON_CELL_ENTER",
  "effects": [
    {
      "type": "MODIFY_STAT",
      "target": "CURRENT_PLAYER",
      "statName": "Bouclier",
      "value": 1
    }
  ],
  "boardMutations": [
    {
      "action": "ADD_CELL",
      "cell": {
        "name": "Échoppe du Forgeron",
        "icon": "🛡️",
        "x": 3,
        "y": 0,
        "description": "+1 Bouclier en s'arrêtant ici",
        "colorTheme": "from-amber-950 to-slate-900 border-amber-500 text-amber-200"
      }
    }
  ]
}

--- EXEMPLE DÉCRET #74 ---
Entrée joueur : "quand on arrive sur une case vide on gagne 1 point de vitesse"
JSON Attendu :
{
  "title": "Sprint des Vents",
  "description": "Parcourir des cases vierges octroie un élan d'agilité.",
  "flavorText": "La liberté donne des ailes.",
  "trigger": "ON_CELL_ENTER",
  "effects": [
    {
      "type": "MODIFY_STAT",
      "target": "CURRENT_PLAYER",
      "statName": "Vitesse",
      "value": 1
    }
  ],
  "boardMutations": []
}

--- EXEMPLE DÉCRET #75 ---
Entrée joueur : "ajoute une case vortex en (1,2) qui téléporte au pif"
JSON Attendu :
{
  "title": "Vortex Chaotique",
  "description": "Un maelström tourbillonnant s'ouvre en (1, 2) !",
  "flavorText": "Où allez-vous atterrir ?",
  "trigger": "ON_CELL_ENTER",
  "effects": [
    {
      "type": "TELEPORT",
      "target": "CURRENT_PLAYER",
      "value": 0
    }
  ],
  "boardMutations": [
    {
      "action": "ADD_CELL",
      "cell": {
        "name": "Vortex Chaotique",
        "icon": "🌀",
        "x": 1,
        "y": 2,
        "description": "Téléporte sur une case aléatoire.",
        "colorTheme": "from-purple-950 to-indigo-950 border-purple-400 text-purple-200"
      }
    }
  ]
}

--- EXEMPLE DÉCRET #76 ---
Entrée joueur : "le premier qui fait un kill gagne 2 points de bouclier"
JSON Attendu :
{
  "title": "Sacre du Bourreau",
  "description": "Verser le premier sang octroie une protection légendaire !",
  "flavorText": "Gloire au premier assaillant !",
  "trigger": "ON_KILL",
  "effects": [
    {
      "type": "MODIFY_STAT",
      "target": "CURRENT_PLAYER",
      "statName": "Bouclier",
      "value": 2
    }
  ],
  "boardMutations": []
}

--- EXEMPLE DÉCRET #77 ---
Entrée joueur : "ajoute une case taverne qui soigne 1 pv et donne de la bière"
JSON Attendu :
{
  "title": "Taverne du Repos",
  "description": "Une auberge chaleureuse ouvre ses portes en (2, 2) (+1 PV).",
  "flavorText": "Une bonne pinte pour repartir au combat !",
  "trigger": "ON_CELL_ENTER",
  "effects": [
    {
      "type": "HEAL",
      "target": "CURRENT_PLAYER",
      "value": 1
    }
  ],
  "boardMutations": [
    {
      "action": "ADD_CELL",
      "cell": {
        "name": "Taverne du Repos",
        "icon": "🍺",
        "x": 2,
        "y": 2,
        "description": "+1 PV de réconfort en entrant.",
        "colorTheme": "from-amber-950 to-yellow-950 border-amber-500 text-amber-200"
      }
    }
  ]
}

--- EXEMPLE DÉCRET #78 ---
Entrée joueur : "crée un boss nécromancien avec 3 pv qui donne 1 atk"
JSON Attendu :
{
  "title": "Nécromancien des Tombes",
  "description": "Le Nécromancien (PV: 3, ATK: 2) réveille les trépassés !",
  "flavorText": "Les tombes s'ouvrent...",
  "trigger": "ON_PVE",
  "effects": [],
  "boardMutations": [
    {
      "action": "SPAWN_ENEMY",
      "cellId": "cell_0_1",
      "enemy": {
        "name": "Nécromancien",
        "icon": "🧙‍♂️",
        "hp": 3,
        "maxHp": 3,
        "atk": 2,
        "reward": "+1 ATK permanent"
      }
    }
  ]
}

--- EXEMPLE DÉCRET #79 ---
Entrée joueur : "ajoute une stat critique pour faire 2 dégâts"
JSON Attendu :
{
  "title": "Frappe Critique",
  "description": "La stat [Critique 🎯] (base : 15%) est introduite !",
  "flavorText": "Viser les points vitaux.",
  "trigger": "ON_PVP",
  "effects": [],
  "boardMutations": [
    {
      "action": "ADD_STAT",
      "statDef": {
        "name": "Critique",
        "icon": "🎯",
        "description": "Chance d'infliger des blessures dévastatrices",
        "defaultValue": 15
      }
    }
  ]
}

--- EXEMPLE DÉCRET #80 ---
Entrée joueur : "ajoute une case autel des sacrifices en (3,1)"
JSON Attendu :
{
  "title": "Autel Écarlate",
  "description": "Un piédestal de marbre noir est érigé en (3, 1). Perdez 1 PV pour gagner +2 ATK !",
  "flavorText": "Le sang nourrit la puissance.",
  "trigger": "ON_CELL_ENTER",
  "effects": [
    {
      "type": "MODIFY_ATK",
      "target": "CURRENT_PLAYER",
      "value": 2
    }
  ],
  "boardMutations": [
    {
      "action": "ADD_CELL",
      "cell": {
        "name": "Autel Écarlate",
        "icon": "🩸",
        "x": 3,
        "y": 1,
        "description": "+2 ATK en bravant l'autel.",
        "colorTheme": "from-rose-950 to-red-950 border-rose-600 text-rose-200"
      }
    }
  ]
}

--- EXEMPLE DÉCRET #81 ---
Entrée joueur : "fais spawner un mimic coffre piégé avec 2 pv"
JSON Attendu :
{
  "title": "Coffre Vorace",
  "description": "Un Mimique (PV: 2, ATK: 2) attend patiemment les aventuriers crédules.",
  "flavorText": "Ce n'était pas un trésor ordinaire !",
  "trigger": "ON_PVE",
  "effects": [],
  "boardMutations": [
    {
      "action": "SPAWN_ENEMY",
      "cellId": "cell_2_1",
      "enemy": {
        "name": "Mimique Vorace",
        "icon": "📦",
        "hp": 2,
        "maxHp": 2,
        "atk": 2,
        "reward": "+1 ATK et +1 PV"
      }
    }
  ]
}

--- EXEMPLE DÉCRET #82 ---
Entrée joueur : "ajoute une case sanctuaire céleste en (0,2)"
JSON Attendu :
{
  "title": "Sanctuaire Céleste",
  "description": "Un temple suspendu entre les nuages apparaît en (0, 2).",
  "flavorText": "Baigné par une clarté divine.",
  "trigger": "ON_CELL_ENTER",
  "effects": [
    {
      "type": "HEAL",
      "target": "CURRENT_PLAYER",
      "value": 1
    }
  ],
  "boardMutations": [
    {
      "action": "ADD_CELL",
      "cell": {
        "name": "Sanctuaire Céleste",
        "icon": "🕊️",
        "x": 0,
        "y": 2,
        "description": "Restaure 1 PV aux visiteurs pieux.",
        "colorTheme": "from-sky-950 to-blue-950 border-sky-400 text-sky-200"
      }
    }
  ]
}

--- EXEMPLE DÉCRET #83 ---
Entrée joueur : "si on est sur la même case que quelqu'un on lui vole 1 d'atk"
JSON Attendu :
{
  "title": "Siphon Martial",
  "description": "La présence physique suffit à aspirer l'énergie offensive du rival !",
  "flavorText": "Votre force m'appartient.",
  "trigger": "ON_PVP",
  "effects": [
    {
      "type": "MODIFY_ATK",
      "target": "CURRENT_PLAYER",
      "value": 1
    }
  ],
  "boardMutations": []
}

--- EXEMPLE DÉCRET #84 ---
Entrée joueur : "ajoute une prison maudite en (3,2)"
JSON Attendu :
{
  "title": "Geôle d'Ébène",
  "description": "Une forteresse d'acier se dresse en (3, 2).",
  "flavorText": "Nul ne s'en échappe facilement.",
  "trigger": "ON_MOVE",
  "effects": [],
  "boardMutations": [
    {
      "action": "ADD_CELL",
      "cell": {
        "name": "Geôle d'Ébène",
        "icon": "⛓️",
        "x": 3,
        "y": 2,
        "description": "Cage austère pour les rebelles.",
        "colorTheme": "from-zinc-950 to-slate-900 border-zinc-500 text-zinc-300"
      }
    }
  ]
}

--- EXEMPLE DÉCRET #85 ---
Entrée joueur : "tous les 3 rounds la map s'effondre d'une case"
JSON Attendu :
{
  "title": "Érosion Cosmique",
  "description": "Le tissu de la réalité se disloque au fil des époques !",
  "flavorText": "Le gouffre engloutit le monde.",
  "trigger": "ON_ROUND_START",
  "effects": [],
  "boardMutations": [
    {
      "action": "REMOVE_CELL"
    }
  ]
}

--- EXEMPLE DÉCRET #86 ---
Entrée joueur : "fais apparaître un chien de garde protecteur"
JSON Attendu :
{
  "title": "Molosse Gardien",
  "description": "Un Molosse de Guerre (PV: 2, ATK: 1) monte la garde.",
  "flavorText": "Fidèle jusqu'à la mort.",
  "trigger": "ON_PVE",
  "effects": [],
  "boardMutations": [
    {
      "action": "SPAWN_ENEMY",
      "cellId": "cell_1_1",
      "enemy": {
        "name": "Molosse Gardien",
        "icon": "🐕",
        "hp": 2,
        "maxHp": 2,
        "atk": 1,
        "reward": "+1 Bouclier"
      }
    }
  ]
}

--- EXEMPLE DÉCRET #87 ---
Entrée joueur : "ajoute une case mirador avec un arc long en (1,2)"
JSON Attendu :
{
  "title": "Mirador des Sentinelles",
  "description": "Une vigie en bois s'élève en (1, 2) offrant un arc composite.",
  "flavorText": "Dans le mille à chaque tir !",
  "trigger": "ON_CELL_ENTER",
  "effects": [
    {
      "type": "MODIFY_ATK",
      "target": "CURRENT_PLAYER",
      "value": 1
    }
  ],
  "boardMutations": [
    {
      "action": "ADD_CELL",
      "cell": {
        "name": "Mirador Sentinelle",
        "icon": "🏹",
        "x": 1,
        "y": 2,
        "description": "+1 ATK à l'accès.",
        "colorTheme": "from-emerald-950 to-stone-900 border-emerald-500 text-emerald-200"
      }
    }
  ]
}

--- EXEMPLE DÉCRET #88 ---
Entrée joueur : "crée la stat karma : chaque action positive donne des points"
JSON Attendu :
{
  "title": "Roue Karmique",
  "description": "Introduction de la stat [Karma ☯️] (base : 0).",
  "flavorText": "Chaque action engendre sa réaction.",
  "trigger": "ON_ROUND_START",
  "effects": [],
  "boardMutations": [
    {
      "action": "ADD_STAT",
      "statDef": {
        "name": "Karma",
        "icon": "☯️",
        "description": "Harmonie spirituelle récompensant les vertueux",
        "defaultValue": 0
      }
    }
  ]
}

`;
exports.CHAOS_TACTICAL_MANEUVERS = `
══════════════════════════════════════════════════════════════════════════════
   MANUEL DES MANŒUVRES TACTIQUES & STRATÉGIES DE JEU DU CHAOS BOARD
══════════════════════════════════════════════════════════════════════════════

1. CONTRÔLE TERRITORIAL ET ZONING :
- Les cases centrales comme (1, 0) et (1, 1) sont des carrefours vitaux : elles touchent 5 à 7 cases adjacentes !
- Contrôler le centre permet d'intercepter rapidement les fuyards ou de fuir les duels indésirables.
- Les cases périphériques (0, 0), (2, 0), (0, 1), (2, 1) servent de bastions défensifs ou de zones de retraite.

2. STRATÉGIE DE L'ÉVOLUTION DU PLATEAU :
- Ajouter des cases au Nord ou au Sud permet de créer des couloirs stratégiques et d'espacer les combattants.
- Placer des monstres sur les goulots d'étranglement force les rivaux à risquer un combat PvE ou à contourner.
- Les sanctuaires de soin doivent être placés judicieusement pour devenir des points chauds de contestation PvP.

3. RÈGLE D'OR DE L'INTERPRÉTATION DU DÉCRET :
- Toujours privilégier le plaisir de jeu et la cohérence de l'univers fantastique et chaotique.
- Si le joueur formule un décret imprécis, en extraire l'essence dramatique et comique pour créer une règle mémorable.
- Les coordonnées (x, y) doivent s'intégrer de manière fluide et harmonieuse dans l'arène existante.
`;
function buildChaosDynamicSystemPrompt(currentCells, players, authorName, userRuleText) {
    const maxX = currentCells.reduce((max, c) => Math.max(max, c.x), 0);
    const maxY = currentCells.reduce((max, c) => Math.max(max, c.y), 0);
    // Detect free adjacent slots
    const occupied = new Set(currentCells.map(c => `${c.x},${c.y}`));
    const candidateSlots = [];
    for (let x = 0; x <= maxX + 1; x++) {
        for (let y = 0; y <= maxY + 1; y++) {
            if (!occupied.has(`${x},${y}`)) {
                // Must be adjacent to at least one existing cell
                const isAdj = currentCells.some(c => Math.abs(c.x - x) <= 1 && Math.abs(c.y - y) <= 1);
                if (isAdj) {
                    candidateSlots.push(`(${x}, ${y})`);
                }
            }
        }
    }
    return `${exports.CHAOS_CORE_MANUAL}

${exports.CHAOS_INTENT_DICTIONARY}

${exports.CHAOS_BESTIARY}

${exports.CHAOS_FEW_SHOT_ENCYCLOPEDIA}

${exports.CHAOS_COMBOS_AND_STATUS_THEORY}

${exports.CHAOS_EXTRA_FEW_SHOTS}

${exports.CHAOS_TACTICAL_MANEUVERS}

══════════════════════════════════════════════════════════════════════════════
   ÉTAT DYNAMIQUE ACTUEL DE LA PARTIE EN COURS (ANALYSE DE CONTEXTE DYNAMIQUE)
══════════════════════════════════════════════════════════════════════════════
- Législateur actuel (auteur décédé) : ${authorName}
- Décret rédigé en langage libre : "${userRuleText}"
- Dimensions du plateau : de x=0 à x=${maxX} et de y=0 à y=${maxY} (${currentCells.length} cases actives).
- Cases actuellement existantes :
${currentCells.map(c => `  * [${c.id}] "${c.name}" ${c.icon} située en (${c.x}, ${c.y})`).join('\n')}

- Emplacements adjacents libres recommandés pour ADD_CELL (aucun chevauchement) :
  ${candidateSlots.slice(0, 8).join(', ') || '(maxX + 1, 0)'}

- Combattants vivants :
${players.map(p => `  * ${p.username} : ${p.hp}/${p.maxHp} PV, ${p.atk} ATK`).join('\n')}

RÈGLES D'OR DE RÉPONSE :
1. Tu dois retourner STRICTEMENT ET UNIQUEMENT un objet JSON valide.
2. Pas de markdown (pas de balises code json).
3. Si le joueur demande d'ajouter une case (ADD_CELL), choisis OBLIGATOIREMENT une coordonnée (x, y) NON OCCUPÉE parmi les emplacements libres ci-dessus (ex: à droite -> x=${maxX + 1}, en bas -> y=${maxY + 1}).
4. Si le joueur invoque un monstre (SPAWN_ENEMY), calibre ses PV entre 1 et 5 max, et son ATK entre 1 et 2 max !
5. N'hésite pas à être créatif, drôle et épique dans le "title" et "flavorText" !
`;
}
