import { DiscretosGameState, DiscretosPlayer, DiscretosLocation } from '../types/discretos';

const LOCATIONS: DiscretosLocation[] = [
  {
    name: "Kebab Spatial 🛸",
    roles: ["Chef Kebabier cosmique", "Client affamé", "Livreur Deliveroo en jetpack", "Critique gastronomique galactique", "Cafard de l'espace caché", "Robot-aspirateur fou"]
  },
  {
    name: "Piscine de Lave Municipale 🌋",
    roles: ["Maître-nageur en slip pare-feu", "Baigneur téméraire", "Vendeur de glaces fondues", "Volcanologue en vacances", "Diablotin qui barbote", "Bouée canard en kevlar"]
  },
  {
    name: "Bureau du Père Noël en Été ☀️",
    roles: ["Père Noël en short", "Lutin syndicaliste en grève", "Renne qui fait la sieste", "Vendeur de climatiseurs", "Inspecteur des impôts des jouets", "Bonhomme de neige fondu"]
  },
  {
    name: "Salon de Coiffure pour Chauves 💈",
    roles: ["Coiffeur optimiste", "Client qui espère un miracle", "Vendeur de perruques en carton", "Lustreur de crânes professionnel", "Balayeur de poussière imaginaire", "Chauve insouciant"]
  },
  {
    name: "Planque des Super-Héros Nuls 🦸‍♂️",
    roles: ["Homme-Papillon", "Captain Procrastination", "L'Incroyable Homme-Éponge", "Traducteur de miaulements de chats", "Super-Râleur", "Pigeon-Man"]
  },
  {
    name: "Club de Tricot pour Dinosaures 🧶",
    roles: ["T-Rex en colère (bras trop courts)", "Vélociraptor pressé", "Diplodocus qui s'emmêle le cou", "Tricoteuse professionnelle", "Vendeur de laine préhistorique", "Tricératops débutant"]
  },
  {
    name: "Pôle Emploi pour Licornes 🦄",
    roles: ["Conseiller désabusé", "Licorne sans magie", "Vendeur de paillettes d'occasion", "Arc-en-cieliste professionnel", "Chasseur de têtes féérique", "Pégase fatigué"]
  },
  {
    name: "Supermarché 🛒",
    roles: ["Caissier fatigué", "Client avec coupons", "Chef de rayon", "Vigile suspect", "Voleur à la tire", "Client perdu"]
  },
  {
    name: "Hôpital 🏥",
    roles: ["Médecin urgentiste", "Infirmier débordé", "Patient plâtré", "Chirurgien concentré", "Visiteur bruyant", "Interne fatigué"]
  },
  {
    name: "École Primaire 🏫",
    roles: ["Maître d'école", "Élève bavard", "Directeur stressé", "Agent de cantine", "Concierge ronchon", "Parent d'élève en retard"]
  },
  {
    name: "Mairie 🏛️",
    roles: ["Maire souriant", "Secrétaire d'accueil", "Citoyen qui râle", "Agent d'urbanisme", "Adjoint au maire", "Journaliste local"]
  },
  {
    name: "Gare ferroviaire 🚉",
    roles: ["Conducteur de train", "Contrôleur de billets", "Voyageur pressé", "Chef de gare", "Vendeur de sandwichs", "Pickpocket agile"]
  },
  {
    name: "Plage de sable 🏖️",
    roles: ["Touriste en maillot", "Vendeur de beignets", "Sauveteur aux aguets", "Enfant qui fait un château", "Surfeur cool", "Bronzo-addict"]
  },
  {
    name: "Cinéma 🎬",
    roles: ["Spectateur avec pop-corn", "Ouvreur de salle", "Vendeur de tickets", "Projectionniste caché", "Réalisateur incognito", "Personne qui parle fort"]
  },
  {
    name: "Restaurant Chic 🍽️",
    roles: ["Chef cuisinier", "Serveur guindé", "Sommelier expert", "Client riche", "Critique gastronomique", "Plongeur fatigué"]
  }
];

export class DiscretosEngine {
  private roomCode: string;
  private state: DiscretosGameState;
  private selectedLocation: DiscretosLocation | null = null;

  constructor(roomCode: string) {
    this.roomCode = roomCode;
    this.state = {
      status: 'LOBBY',
      players: [],
      currentPlayerIndex: 0,
      currentRound: 1,
      location: null,
      locationsList: LOCATIONS.map(l => l.name),
      clues: [],
      log: ['Salon de jeu créé. En attente des joueurs...'],
      winner: null,
      winReason: null
    };
  }

  public getPlayers(): DiscretosPlayer[] {
    return this.state.players;
  }

  public getState(): DiscretosGameState {
    return this.state;
  }

  public addPlayer(id: string, username: string, color: string): boolean {
    if (this.state.status !== 'LOBBY' || this.state.players.length >= 8) {
      return false;
    }
    this.state.players.push({
      id,
      username,
      color,
      role: 'Spectateur',
      isSpy: false,
      hasVotedToAccuse: null
    });
    this.state.log.push(`${username} a rejoint le salon.`);
    return true;
  }

  public removePlayer(socketId: string) {
    this.state.players = this.state.players.filter(p => p.id !== socketId);
    if (this.state.status !== 'LOBBY') {
      this.state.log.push(`⚠️ Un joueur s'est déconnecté. Partie réinitialisée.`);
      this.resetGame();
    }
  }

  public startGame(): boolean {
    if (this.state.players.length < 3 || this.state.status !== 'LOBBY') {
      return false;
    }

    // Pick location
    const locIdx = Math.floor(Math.random() * LOCATIONS.length);
    this.selectedLocation = LOCATIONS[locIdx];
    this.state.location = this.selectedLocation.name;

    // Pick spy
    const spyIdx = Math.floor(Math.random() * this.state.players.length);
    const spyPlayer = this.state.players[spyIdx];

    // Assign roles
    const shuffledRoles = [...this.selectedLocation.roles];
    for (let i = shuffledRoles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledRoles[i], shuffledRoles[j]] = [shuffledRoles[j], shuffledRoles[i]];
    }

    let roleIdx = 0;
    this.state.players.forEach((p, idx) => {
      p.hasVotedToAccuse = null;
      if (idx === spyIdx) {
        p.isSpy = true;
        p.role = "L'Intrus 🥸 (Discretos)";
      } else {
        p.isSpy = false;
        p.role = shuffledRoles[roleIdx % shuffledRoles.length];
        roleIdx++;
      }
    });

    this.state.status = 'PLAYING';
    this.state.winner = null;
    this.state.winReason = null;
    this.state.currentPlayerIndex = 0;
    this.state.currentRound = 1;
    this.state.clues = [];
    this.state.log.push('La partie de Discretos commence ! Donnez à tour de rôle un indice pas trop évident.');

    return true;
  }

  public submitClue(socketId: string, clueText: string): boolean {
    if (this.state.status !== 'PLAYING') return false;

    const activePlayer = this.state.players[this.state.currentPlayerIndex];
    if (!activePlayer || activePlayer.id !== socketId) return false;

    const cleanClue = clueText.trim();
    if (!cleanClue) return false;

    this.state.clues.push({
      playerId: activePlayer.id,
      username: activePlayer.username,
      clueText: cleanClue,
      round: this.state.currentRound
    });

    this.state.log.push(`📝 Indice de ${activePlayer.username} (Tour ${this.state.currentRound}) : "${cleanClue}"`);

    // Advance turn
    this.state.currentPlayerIndex++;

    // Check if round finished
    if (this.state.currentPlayerIndex >= this.state.players.length) {
      this.state.currentPlayerIndex = 0;
      this.state.currentRound++;

      if (this.state.currentRound > 3) {
        this.state.status = 'VOTING';
        this.state.log.push("⏱️ Fin des 3 tours d'indices ! Place aux accusations de l'imposteur.");
      } else {
        this.state.log.push(`--- Début du tour d'indices ${this.state.currentRound} ---`);
      }
    }

    return true;
  }

  public accusePlayer(voterId: string, targetId: string): boolean {
    if (this.state.status !== 'VOTING') {
      return false;
    }

    const voter = this.state.players.find(p => p.id === voterId);
    if (!voter) return false;

    voter.hasVotedToAccuse = targetId;
    const target = this.state.players.find(p => p.id === targetId)!;
    this.state.log.push(`📣 ${voter.username} vote contre ${target.username}.`);

    // Check if everyone voted
    const allVoted = this.state.players.every(p => p.hasVotedToAccuse !== null);
    if (allVoted) {
      // Tally votes
      const voteTally: { [playerId: string]: number } = {};
      this.state.players.forEach(p => {
        const targetId = p.hasVotedToAccuse!;
        voteTally[targetId] = (voteTally[targetId] || 0) + 1;
      });

      // Find player with most votes
      let maxVotes = -1;
      let accusedId = '';
      this.state.players.forEach(p => {
        const votes = voteTally[p.id] || 0;
        if (votes > maxVotes) {
          maxVotes = votes;
          accusedId = p.id;
        }
      });

      const accusedPlayer = this.state.players.find(p => p.id === accusedId)!;
      const spy = this.state.players.find(p => p.isSpy)!;

      this.state.status = 'FINISHED';
      if (accusedPlayer.isSpy) {
        this.state.winner = 'CITIZENS';
        this.state.winReason = `L'intrus ${accusedPlayer.username} a été démasqué avec le plus grand nombre de votes ! Le lieu était : ${this.selectedLocation?.name}.`;
        this.state.log.push(`👑 CITOYENS GAGNENT : L'intrus était bien ${accusedPlayer.username}.`);
      } else {
        this.state.winner = 'SPY';
        this.state.winReason = `L'intrus ${spy.username} gagne ! Le village a failli en accusant ${accusedPlayer.username} (rôle: ${accusedPlayer.role}). Le lieu était : ${this.selectedLocation?.name}.`;
        this.state.log.push(`🥸 L'INTRUS GAGNE : Les citoyens se sont trompés d'intrus.`);
      }
    }

    return true;
  }

  public resetGame(): boolean {
    this.state.status = 'LOBBY';
    this.state.location = null;
    this.state.winner = null;
    this.state.winReason = null;
    this.state.currentPlayerIndex = 0;
    this.state.currentRound = 1;
    this.state.clues = [];
    this.state.players.forEach(p => {
      p.role = 'Spectateur';
      p.isSpy = false;
      p.hasVotedToAccuse = null;
    });
    this.state.log = ['Partie réinitialisée. En attente du départ...'];
    return true;
  }

  public destroy() {
    // No-op since timer is removed
  }
}
