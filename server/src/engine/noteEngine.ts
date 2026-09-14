import { NoteGameState, NotePlayer, NoteAnswer, NoteRoundHistory } from '../types/note';

export interface QuestionTemplate {
  id: string;
  category: string;
  question: string;
  botAnswers: {
    // 0-1: Catastrophique / Honteux
    tier0: string[];
    // 2-3: Médiocre / Mauvais
    tier1: string[];
    // 4-5: Passable / Moyen
    tier2: string[];
    // 6-7: Bon / Sympa
    tier3: string[];
    // 8-9: Excellent / Impressionnant
    tier4: string[];
    // 10: Légendaire / Divin / Perfection absolue
    tier5: string[];
  };
}

export const QUESTION_BANK: QuestionTemplate[] = [
  {
    id: 'cuisine',
    category: '🍳 Cuisine & Repas',
    question: 'Quel plat me prépares-tu pour dîner ce soir ?',
    botAnswers: {
      tier0: ['Des coquillettes brûlées réchauffées dans de l\'eau croupie', 'Un toast de cendre avec du dentifrice'],
      tier1: ['Une boîte de conserve froide de raviolis périmés depuis 2 mois', 'Un cordon bleu encore congelé au milieu'],
      tier2: ['Des pâtes au beurre avec un peu d\'emmental râpé', 'Un steak haché un peu trop cuit avec de la purée mousseline'],
      tier3: ['Un bon burger maison avec frites croustillantes et cheddar fondu', 'Un risotto crémeux aux champignons de Paris'],
      tier4: ['Un magret de canard rôti au miel avec purée de patates douces maison', 'Des sushis d\'exception préparés à la minute avec saumon bio'],
      tier5: ['Un festin royal 3 étoiles Michelin : bœuf Wagyu A5 et truffe noire d\'Alba', 'Un banquet gastronomique divin servi par les plus grands chefs du monde']
    }
  },
  {
    id: 'film',
    category: '🎬 Cinéma & Séries',
    question: 'Quel film ou série me recommandes-tu de regarder ?',
    botAnswers: {
      tier0: ['Une parodie amateur filmée sur un vieux téléphone Nokia en 144p', 'Un navet tellement incompréhensible qu\'il donne mal au crâne'],
      tier1: ['Un film d\'action raté des années 90 avec des effets spéciaux risibles', 'Une comédie lourdingue où aucune blague ne fonctionne'],
      tier2: ['Un téléfilm du dimanche après-midi qui s\'oublie en 10 minutes', 'Une série moyenne qui passe bien pendant qu\'on fait la vaisselle'],
      tier3: ['Un bon blockbuster divertissant et bien rythmé', 'Une comédie culte qui met tout le monde de bonne humeur'],
      tier4: ['Un chef-d\'œuvre captivant qui te scotche à ton siège du début à la fin', 'Une série légendaire comme Breaking Bad ou Game of Thrones (saisons 1 à 4)'],
      tier5: ['Le plus grand chef-d\'œuvre absolu du 7e art qui va changer ta vision de la vie', 'Une fresque cinématographique divine récompensée par 15 Oscars']
    }
  },
  {
    id: 'superpouvoir',
    category: '🦸 Super-Héros & Fantastique',
    question: 'Quel super-pouvoir m\'attribues-tu ?',
    botAnswers: {
      tier0: ['Le pouvoir d\'attirer immédiatement tous les moustiques du quartier', 'Le pouvoir de faire griller le pain... uniquement après qu\'il a moisi'],
      tier1: ['Faire clignoter les ampoules quand tu tousses', 'Deviner la couleur des chaussettes des gens avec 40% d\'erreur'],
      tier2: ['Faire pousser tes ongles deux fois plus vite que la normale', 'Faire léviter une bille en plastique à 2 cm du sol pendant 3 secondes'],
      tier3: ['Vision nocturne et réflexes ultra-rapides en combat', 'Super ouïe pour entendre des conversations à 100 mètres'],
      tier4: ['Téléportation instantanée partout sur la Terre et invisibilité à volonté', 'Maîtrise du feu et des éclairs comme un dieu de la foudre'],
      tier5: ['Contrôle total du temps, de l\'espace et de la réalité à l\'échelle cosmique', 'Immortalité absolue et création d\'univers entiers d\'un claquement de doigts']
    }
  },
  {
    id: 'retard',
    category: '⏰ Vie Quotidienne & Excuses',
    question: 'Quelle est ton excuse pour justifier mon retard au travail ?',
    botAnswers: {
      tier0: ['"Désolé patron, j\'avais la flemme de me lever alors j\'ai traîné sur TikTok"', '"Je me suis endormi sur le carrelage des toilettes après une soirée arrosée"'],
      tier1: ['"Mon réveil n\'a pas sonné pour la 4e fois cette semaine"', '"J\'ai oublié que c\'était lundi aujourd\'hui"'],
      tier2: ['"Mon bus avait un peu de retard à cause de la pluie"', '"Impossible de retrouver mes clés de maison pendant 15 minutes"'],
      tier3: ['"Panne de train sur la ligne principale avec annonce officielle de la SNCF"', '"Un pneu crevé sur l\'autoroute avec dépanneuse à l\'appui"'],
      tier4: ['"J\'ai dû pratiquer les premiers secours sur un passant qui s\'est évanoui dans la rue"', '"Témoin clé d\'un braquage, j\'ai aidé la police à interpeller le suspect"'],
      tier5: ['"J\'ai sauvé une famille entière d\'un immeuble en flammes et le président m\'a décoré"', '"Empêché une collision d\'astéroïde avec la Terre à mains nues ce matin"']
    }
  },
  {
    id: 'zombie',
    category: '🧟 Survie & Apocalypse',
    question: 'Quel est mon plan d\'action pour survivre à une apocalypse zombie ?',
    botAnswers: {
      tier0: ['Courir vers le premier zombie en criant "Faites-moi un câlin !"', 'Te barricader dans une cabine téléphonique transparente sans provisions'],
      tier1: ['T\'armer d\'une cuillère en plastique et d\'un sac poubelle comme armure', 'Te cacher sous ta couette en espérant qu\'ils partent'],
      tier2: ['T\'enfermer dans un supermarché jusqu\'à épuisement des chips', 'Partir dans la forêt sans boussole avec deux conserves'],
      tier3: ['Fortifier une maison de campagne avec grilles et provisions pour 6 mois', 'Rejoindre un groupe de survivants organisés avec armes et radio'],
      tier4: ['Construire un camp autonome sur une île fortifiée avec potager et énergie solaire', 'Conduire un convoi de véhicules blindés militarisés avec stock de carburant'],
      tier5: ['Découvrir le vaccin universel en laboratoire et rebâtir une civilisation futuriste', 'Prendre le contrôle d\'une forteresse souterraine high-tech autonome pendant 50 ans']
    }
  },
  {
    id: 'cadeau',
    category: '🎁 Rendez-vous & Séduction',
    question: 'Quel cadeau m\'offres-tu pour notre premier rendez-vous ?',
    botAnswers: {
      tier0: ['Un ticket de caisse froissé avec une tache de café', 'Un sachet de frites mangé à moitié trouvé sur un banc'],
      tier1: ['Un paquet de chewing-gums entamé et un stylo publicitaire qui ne marche pas', 'Une fleur en plastique poussiéreuse'],
      tier2: ['Une boîte de chocolats basique achetée à la station-service', 'Une tasse amusante avec un jeu de mots moyen'],
      tier3: ['Un joli bouquet de roses fraîches et une boîte de macarons artisanaux', 'Un livre soigné de son auteur préféré avec un mot personnalisé'],
      tier4: ['Un parfum de grande maison sur-mesure et un dîner dans un restaurant panoramique', 'Un bijou élégant en argent dans un écrin raffiné'],
      tier5: ['Un voyage romantique tout compris pour deux dans un palace aux Maldives', 'Une étoile baptisée à ton nom avec acte officiel et bague sertie de diamants']
    }
  },
  {
    id: 'musique',
    category: '🎵 Musique & Ambiance',
    question: 'Quelle musique mets-tu pour mettre le feu à ma soirée ?',
    botAnswers: {
      tier0: ['Un enregistrement de bruits de travaux de perceuse en boucle', 'Une chanson de fête foraine saturée et stridente'],
      tier1: ['Un générique de dessin animé joué à la flûte à bec par un débutant', 'Un morceau de heavy metal inaudible avec micro qui grésille'],
      tier2: ['Une compilation radio des tubes de l\'année dernière qu\'on a trop entendus', 'Une musique d\'ascenseur sympa mais sans grande énergie'],
      tier3: ['Le tube pop-dance du moment qui fait chanter tout le monde en chœur', 'Un classique funk intemporel comme Earth Wind & Fire qui remplit la piste'],
      tier4: ['Un banger électro survolté digne des plus grands festivals comme Tomorrowland', 'Un hymne légendaire comme Queen ou Daft Punk qui rend la foule hystérique'],
      tier5: ['Une performance live surprise des plus grandes légendes mondiales de la musique', 'Le set DJ du siècle qui fait danser la ville entière jusqu\'à l\'aube']
    }
  },
  {
    id: 'danger',
    category: '⚠️ Courage & Frissons',
    question: 'Quel défi extrême suis-je capable de relever ?',
    botAnswers: {
      tier0: ['Regarder une coccinelle voler à 5 mètres sans crier au secours', 'Toucher l\'eau tiède de la piscine du bout de l\'orteil'],
      tier1: ['Prendre l\'ascenseur jusqu\'au deuxième étage sans fermer les yeux', 'Traverser un pont piéton sans regarder le vide'],
      tier2: ['Monter sur un manège de fête foraine qui tourne gentiment', 'Faire du camping sous une tente par nuit étoilée'],
      tier3: ['Faire un parcours d\'accrobranche au sommet des arbres à 15 mètres', 'Plonger d\'un plongeoir de 5 mètres dans une piscine olympique'],
      tier4: ['Faire du saut en parachute à 4000 mètres d\'altitude sans hésiter', 'Nager en pleine mer ouverte avec des requins dans une cage'],
      tier5: ['Gravir l\'Everest en solo en pleine tempête sans bouteille d\'oxygène', 'Effectuer un saut en wingsuit à ras des falaises comme une légende vivante']
    }
  },
  {
    id: 'vehicule',
    category: '🚗 Transports & Bolides',
    question: 'Dans quel véhicule m\'imagines-tu arriver en ville ?',
    botAnswers: {
      tier0: ['Une trottinette rouillée à laquelle il manque une roue', 'Un monocycle grinçant avec une selle déchirée'],
      tier1: ['Une vieille voiture cabossée qui crache de la fumée noire avec un pare-brise fissuré', 'Un vieux vélo sans freins avec un panier tordu'],
      tier2: ['Une citadine compacte d\'occasion tout à fait banale et grise', 'Un scooter 50cc qui peine à monter les côtes'],
      tier3: ['Une belle berline moderne, propre et confortable avec toit ouvrant', 'Une moto roadster racée avec un joli bruit de moteur'],
      tier4: ['Une sportive italienne rutilante type Ferrari avec jantes dorées', 'Un SUV de luxe blindé noir mat avec chauffeur privé'],
      tier5: ['Un jet privé supersonique doré ou une Batmobile futuriste unique au monde', 'Un vaisseau spatial chromé qui atterrit en lévitation magnétique']
    }
  },
  {
    id: 'maison',
    category: '🏰 Logement & Décoration',
    question: 'À quoi ressemble ma maison idéale ?',
    botAnswers: {
      tier0: ['Une cabane en carton sous un pont avec des fuites d\'eau', 'Un cagibi de 3m² sans fenêtre avec odeur de renfermé'],
      tier1: ['Un studio mal isolé où le frigo fait un bruit d\'avion au décollage', 'Un appartement humide avec tapisserie arrachée des années 70'],
      tier2: ['Un appartement deux-pièces classique et propre en périphérie', 'Une petite maison de banlieue simple avec un jardinet'],
      tier3: ['Une jolie villa contemporaine lumineuse avec petite piscine et terrasse en bois', 'Un bel appartement haussmannien rénové avec parquet et moulures'],
      tier4: ['Une immense propriété d\'architecte avec piscine à débordement et vue panoramique sur la mer', 'Un loft de 400m² avec salle de cinéma privée et spa'],
      tier5: ['Un somptueux château royal ultra-moderne sur une île privée avec héliport et cascade naturelle', 'Un palais futuriste de verre et de marbre digne des plus grands souverains']
    }
  },
  {
    id: 'tenue',
    category: '👔 Mode & Élégance',
    question: 'Quelle tenue portes-tu pour mon gala de prestige ?',
    botAnswers: {
      tier0: ['Un jogging troué avec des claquettes-chaussettes sales', 'Un pyjama taché de soupe et des pantoufles canard'],
      tier1: ['Un t-shirt publicitaire délavé et un short informe', 'Un costume synthétique brillant mal taillé acheté en solde'],
      tier2: ['Une chemise simple bien repassée avec un jean propre', 'Une petite robe noire basique de prêt-à-porter'],
      tier3: ['Un costume deux-pièces bien coupé avec souliers cirés', 'Une robe de soirée élégante avec des bijoux discrets'],
      tier4: ['Un smoking sur-mesure confectionné par un tailleur de renom', 'Une robe de haute couture époustouflante qui attire tous les regards'],
      tier5: ['Une parure d\'apparat impériale sertie de pierres précieuses digne d\'un sacre royal', 'Une tenue légendaire taillée dans des tissus rares au summum absolu du chic mondial']
    }
  },
  {
    id: 'talent',
    category: '🌟 Spectacle & Talents',
    question: 'Quel talent caché révèles-tu sur scène devant 10 000 personnes ?',
    botAnswers: {
      tier0: ['Faire craquer ton pouce trois fois avant d\'avoir mal', 'Éternuer sur commande avec des postillons'],
      tier1: ['Réciter l\'alphabet à l\'envers en bégayant à la moitié', 'Faire tourner un stylo sur ton doigt pendant 2 secondes avant qu\'il tombe'],
      tier2: ['Faire un tour de magie simple avec un jeu de 32 cartes', 'Chanter un refrain connu sans trop de fausses notes'],
      tier3: ['Jouer un magnifique solo de guitare rock avec assurance', 'Faire un numéro de stand-up hilarant qui fait rire toute la salle'],
      tier4: ['Une chorégraphie d\'acrobatie aérienne millimétrée à couper le souffle', 'Un numéro d\'illusionnisme spectaculaire qui fait disparaître une voiture'],
      tier5: ['Un concert symphonique improvisé en jouant de 5 instruments à la fois sous une standing ovation historique', 'Une prouesse artistique miraculeuse qui entre instantanément dans l\'Histoire mondiale']
    }
  }
];

const BOT_NAMES = ['Robotron 🤖', 'PixelBot 👾', 'Sophie IA 💅', 'GigaBot 🦾', 'Atlas 🚀', 'Lumina ✨'];
const BOT_AVATARS = ['🤖', '👾', '🦾', '🧠', '⚡', '✨'];
const PLAYER_COLORS = ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

export class NoteEngine {
  private roomCode: string;
  private state: NoteGameState;

  constructor(roomCode: string) {
    this.roomCode = roomCode;
    this.state = {
      roomCode,
      phase: 'LOBBY',
      players: [],
      currentRound: 1,
      maxRounds: 5, // Exactement 5 manches
      activePlayerIndex: 0,
      secretRating: null,
      currentQuestion: null,
      questionOptions: [],
      usedQuestions: [],
      answers: [],
      guess: null,
      pointsAwarded: null,
      guessDiff: null,
      winner: null,
      log: ['Bienvenue dans Le Jeu de la Note ! 🔟']
    };
  }

  public getPlayers(): NotePlayer[] {
    return this.state.players;
  }

  public addPlayer(socketId: string, username: string, color?: string, avatar?: string): NotePlayer {
    const existing = this.state.players.find(p => p.id === socketId);
    if (existing) return existing;

    const availableColors = PLAYER_COLORS.filter(c => !this.state.players.some(p => p.color === c));
    const playerColor = color || (availableColors.length > 0 ? availableColors[0] : PLAYER_COLORS[this.state.players.length % PLAYER_COLORS.length]);

    const player: NotePlayer = {
      id: socketId,
      username: username.trim() || `Joueur ${this.state.players.length + 1}`,
      color: playerColor,
      avatar: avatar || '👤',
      isBot: false,
      score: 0,
      hasAnswered: false,
      history: []
    };

    this.state.players.push(player);
    this.addLog(`👋 ${player.username} a rejoint la partie.`);
    return player;
  }

  public removePlayer(socketId: string): void {
    const idx = this.state.players.findIndex(p => p.id === socketId);
    if (idx !== -1) {
      const removed = this.state.players[idx];
      this.state.players.splice(idx, 1);
      this.addLog(`🚪 ${removed.username} a quitté le salon.`);

      if (this.state.players.length === 0) {
        this.resetGame();
      } else if (this.state.activePlayerIndex >= this.state.players.length) {
        this.state.activePlayerIndex = 0;
      }
    }
  }

  public addBot(): NotePlayer | null {
    if (this.state.players.length >= 8) return null;

    const usedNames = this.state.players.map(p => p.username);
    const availableNames = BOT_NAMES.filter(n => !usedNames.includes(n));
    const botName = availableNames.length > 0 ? availableNames[0] : `Bot ${this.state.players.length + 1} 🤖`;

    const usedAvatars = this.state.players.map(p => p.avatar);
    const availableAvatars = BOT_AVATARS.filter(a => !usedAvatars.includes(a));
    const botAvatar = availableAvatars.length > 0 ? availableAvatars[0] : '🤖';

    const usedColors = this.state.players.map(p => p.color);
    const availableColors = PLAYER_COLORS.filter(c => !usedColors.includes(c));
    const botColor = availableColors.length > 0 ? availableColors[0] : '#64748B';

    const bot: NotePlayer = {
      id: `bot_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      username: botName,
      color: botColor,
      avatar: botAvatar,
      isBot: true,
      score: 0,
      hasAnswered: false,
      history: []
    };

    this.state.players.push(bot);
    this.addLog(`🤖 ${bot.username} a été ajouté à la partie.`);
    return bot;
  }

  public removeBot(botId: string): void {
    const idx = this.state.players.findIndex(p => p.id === botId && p.isBot);
    if (idx !== -1) {
      const removed = this.state.players[idx];
      this.state.players.splice(idx, 1);
      this.addLog(`🤖 ${removed.username} a été retiré.`);
    }
  }

  public startGame(): boolean {
    if (this.state.players.length < 2) {
      // Si le joueur est tout seul, ajouter automatiquement 2 bots pour une partie fun et conviviale !
      this.addBot();
      this.addBot();
    }

    this.state.currentRound = 1;
    this.state.maxRounds = 5;
    this.state.usedQuestions = [];
    this.state.players.forEach(p => {
      p.score = 0;
      p.history = [];
      p.hasAnswered = false;
    });

    this.state.activePlayerIndex = 0;
    this.startActivePlayerTurn();
    this.addLog(`🚀 La partie commence ! 5 Manches au programme.`);
    return true;
  }

  private startActivePlayerTurn(): void {
    const activePlayer = this.state.players[this.state.activePlayerIndex];
    if (!activePlayer) return;

    // 1. Secret Rating from 0 to 10
    this.state.secretRating = Math.floor(Math.random() * 11); // 0, 1, ..., 10
    this.state.currentQuestion = null;
    this.state.answers = [];
    this.state.guess = null;
    this.state.pointsAwarded = null;
    this.state.guessDiff = null;
    this.state.phase = 'CHOOSING_QUESTION';

    this.state.players.forEach(p => (p.hasAnswered = false));

    // 2. Pick unique question options from question bank
    const availableQuestions = QUESTION_BANK.filter(q => !this.state.usedQuestions.includes(q.question));
    const shuffled = [...availableQuestions].sort(() => 0.5 - Math.random());
    this.state.questionOptions = shuffled.slice(0, 4).map(q => q.question);

    this.addLog(`🎲 Manche ${this.state.currentRound}/5 : C'est au tour de ${activePlayer.username} de deviner sa note !`);

    // If active player is a bot, automatically pick a question after a short delay
    if (activePlayer.isBot) {
      setTimeout(() => {
        if (this.state.phase === 'CHOOSING_QUESTION') {
          const randomQ = this.state.questionOptions[Math.floor(Math.random() * this.state.questionOptions.length)] || 'Quel plat me prépares-tu ce soir ?';
          this.chooseQuestion(activePlayer.id, randomQ);
        }
      }, 1200);
    }
  }

  public chooseQuestion(playerId: string, question: string): boolean {
    const activePlayer = this.state.players[this.state.activePlayerIndex];
    if (!activePlayer || activePlayer.id !== playerId) return false;
    if (this.state.phase !== 'CHOOSING_QUESTION') return false;

    const trimmedQ = question.trim();
    if (!trimmedQ) return false;

    // Check uniqueness
    if (this.state.usedQuestions.includes(trimmedQ)) {
      this.addLog(`⚠️ La question "${trimmedQ}" a déjà été posée dans cette partie !`);
      return false;
    }

    this.state.currentQuestion = trimmedQ;
    this.state.usedQuestions.push(trimmedQ);
    this.state.phase = 'ANSWERING';
    this.addLog(`❓ ${activePlayer.username} a posé la question : "${trimmedQ}"`);

    // Generate answers for bots among other players
    this.generateBotAnswers();

    return true;
  }

  private generateBotAnswers(): void {
    const activePlayer = this.state.players[this.state.activePlayerIndex];
    if (!activePlayer || this.state.secretRating === null) return;

    const rating = this.state.secretRating;
    const template = QUESTION_BANK.find(q => q.question === this.state.currentQuestion);

    // Find all bots that are NOT the active player
    const nonActiveBots = this.state.players.filter(p => p.isBot && p.id !== activePlayer.id);

    nonActiveBots.forEach((bot, index) => {
      let answerText = '';

      if (template) {
        let tierList: string[];
        if (rating <= 1) tierList = template.botAnswers.tier0;
        else if (rating <= 3) tierList = template.botAnswers.tier1;
        else if (rating <= 5) tierList = template.botAnswers.tier2;
        else if (rating <= 7) tierList = template.botAnswers.tier3;
        else if (rating <= 9) tierList = template.botAnswers.tier4;
        else tierList = template.botAnswers.tier5;

        answerText = tierList[Math.floor(Math.random() * tierList.length)];
      } else {
        // Generic fallback for custom questions
        if (rating <= 1) answerText = 'Un désastre total, le pire truc possible ! (0-1/10)';
        else if (rating <= 3) answerText = 'Très médiocre, vraiment pas terrible du tout.';
        else if (rating <= 5) answerText = 'Assez moyen, passable mais rien d\'extraordinaire.';
        else if (rating <= 7) answerText = 'Plutôt bon et agréable, franchement sympa !';
        else if (rating <= 9) answerText = 'Vraiment excellent, très impressionnant et maîtrisé !';
        else answerText = 'La perfection absolue ! Un chef-d\'œuvre légendaire (10/10) !';
      }

      // Add a slight delay for realistic chat feel
      setTimeout(() => {
        if (this.state.phase === 'ANSWERING' && this.state.currentQuestion) {
          this.submitAnswer(bot.id, answerText);
        }
      }, 800 + index * 900);
    });
  }

  public submitAnswer(playerId: string, text: string): boolean {
    if (this.state.phase !== 'ANSWERING') return false;

    const activePlayer = this.state.players[this.state.activePlayerIndex];
    if (!activePlayer || activePlayer.id === playerId) return false; // Active player cannot answer their own question!

    const player = this.state.players.find(p => p.id === playerId);
    if (!player) return false;

    // Check if player already answered
    const existingIndex = this.state.answers.findIndex(a => a.playerId === playerId);
    const answerObj: NoteAnswer = {
      playerId: player.id,
      username: player.username,
      color: player.color,
      avatar: player.avatar,
      text: text.trim(),
      timestamp: Date.now()
    };

    if (existingIndex !== -1) {
      this.state.answers[existingIndex] = answerObj;
    } else {
      this.state.answers.push(answerObj);
    }
    player.hasAnswered = true;

    // Check if all non-active players have answered
    const otherPlayers = this.state.players.filter(p => p.id !== activePlayer.id);
    const allAnswered = otherPlayers.every(p => this.state.answers.some(a => a.playerId === p.id));

    if (allAnswered && otherPlayers.length > 0) {
      this.state.phase = 'GUESSING';
      this.addLog(`💡 Toutes les réponses sont arrivées ! À ${activePlayer.username} de deviner sa note.`);

      // If active player is a bot, auto guess
      if (activePlayer.isBot) {
        setTimeout(() => {
          if (this.state.phase === 'GUESSING') {
            const actual = this.state.secretRating || 5;
            // Bot has a realistic variance (-1, 0, or +1)
            const variance = Math.floor(Math.random() * 3) - 1;
            const botGuess = Math.max(0, Math.min(10, actual + variance));
            this.submitGuess(activePlayer.id, botGuess);
          }
        }, 2200);
      }
    }

    return true;
  }

  // Active player can also manually proceed to guessing if needed
  public forceGuessingPhase(requesterId: string): boolean {
    const activePlayer = this.state.players[this.state.activePlayerIndex];
    if (!activePlayer || activePlayer.id !== requesterId) return false;
    if (this.state.phase !== 'ANSWERING' || this.state.answers.length === 0) return false;

    this.state.phase = 'GUESSING';
    this.addLog(`💡 ${activePlayer.username} passe à l'estimation de sa note avec les réponses actuelles.`);
    return true;
  }

  public submitGuess(playerId: string, guess: number): boolean {
    const activePlayer = this.state.players[this.state.activePlayerIndex];
    if (!activePlayer || activePlayer.id !== playerId) return false;
    if (this.state.phase !== 'GUESSING') return false;

    const clampedGuess = Math.max(0, Math.min(10, Math.round(guess)));
    const secret = this.state.secretRating ?? 5;
    const diff = Math.abs(clampedGuess - secret);

    // Règle spécifiée par l'utilisateur :
    // "il marque plus ou moins de point en fonction de si il est proche ou non (plus de 2 = 0 points)"
    let points = 0;
    if (diff === 0) {
      points = 3; // Note exacte !
    } else if (diff === 1) {
      points = 2; // À 1 point près
    } else if (diff === 2) {
      points = 1; // À 2 points près
    } else {
      points = 0; // Écart > 2 = 0 point !
    }

    this.state.guess = clampedGuess;
    this.state.guessDiff = diff;
    this.state.pointsAwarded = points;
    activePlayer.score += points;

    // Record round history
    const historyEntry: NoteRoundHistory = {
      round: this.state.currentRound,
      question: this.state.currentQuestion || '',
      secretRating: secret,
      guess: clampedGuess,
      points,
      diff
    };
    activePlayer.history.push(historyEntry);

    this.state.phase = 'REVEAL';

    if (diff === 0) {
      this.addLog(`🎯 INCROYABLE ! ${activePlayer.username} a deviné sa note exacte (${secret}/10) ! +3 points`);
    } else if (diff <= 2) {
      this.addLog(`✨ BIEN JOUÉ ! ${activePlayer.username} a estimé ${clampedGuess}/10 (Vraie note: ${secret}/10, écart de ${diff}) ! +${points} point${points > 1 ? 's' : ''}`);
    } else {
      this.addLog(`❌ TROP LOIN ! ${activePlayer.username} a estimé ${clampedGuess}/10 (Vraie note: ${secret}/10, écart de ${diff}). 0 point`);
    }

    return true;
  }

  public nextTurn(): boolean {
    if (this.state.phase !== 'REVEAL') return false;

    // Advance to next player
    this.state.activePlayerIndex++;

    // If all players have had their turn in this round:
    if (this.state.activePlayerIndex >= this.state.players.length) {
      this.state.activePlayerIndex = 0;
      this.state.currentRound++;

      // Check if 5 rounds completed
      if (this.state.currentRound > this.state.maxRounds) {
        this.state.phase = 'FINISHED';

        // Determine winner
        const sorted = [...this.state.players].sort((a, b) => b.score - a.score);
        this.state.winner = sorted[0] || null;
        this.addLog(`🏆 Fin de la partie ! ${this.state.winner ? `${this.state.winner.username} remporte la victoire avec ${this.state.winner.score} points !` : 'Égalité !'}`);
        return true;
      }
    }

    this.startActivePlayerTurn();
    return true;
  }

  public resetGame(): void {
    this.state.phase = 'LOBBY';
    this.state.currentRound = 1;
    this.state.maxRounds = 5;
    this.state.activePlayerIndex = 0;
    this.state.secretRating = null;
    this.state.currentQuestion = null;
    this.state.questionOptions = [];
    this.state.usedQuestions = [];
    this.state.answers = [];
    this.state.guess = null;
    this.state.pointsAwarded = null;
    this.state.guessDiff = null;
    this.state.winner = null;
    this.state.players.forEach(p => {
      p.score = 0;
      p.hasAnswered = false;
      p.history = [];
    });
    this.addLog(`🔄 Le jeu a été réinitialisé au salon d'attente.`);
  }

  private addLog(msg: string): void {
    this.state.log.push(msg);
    if (this.state.log.length > 50) {
      this.state.log.shift();
    }
  }

  // Returns state filtered for client: hides secretRating if requester is the active player during question/answer/guessing phases!
  public getState(forSocketId?: string): NoteGameState {
    const copy = JSON.parse(JSON.stringify(this.state));

    const activePlayer = this.state.players[this.state.activePlayerIndex];
    if (
      activePlayer &&
      forSocketId === activePlayer.id &&
      (this.state.phase === 'CHOOSING_QUESTION' ||
        this.state.phase === 'ANSWERING' ||
        this.state.phase === 'GUESSING')
    ) {
      // HIDE SECRET RATING FROM ACTIVE PLAYER!
      copy.secretRating = null;
    }

    return copy;
  }
}
