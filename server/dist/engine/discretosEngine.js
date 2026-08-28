"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiscretosEngine = void 0;
const LOCATIONS = [
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
    }
];
class DiscretosEngine {
    roomCode;
    state;
    selectedLocation = null;
    timerInterval = null;
    onTickCallback = null;
    constructor(roomCode) {
        this.roomCode = roomCode;
        this.state = {
            status: 'LOBBY',
            players: [],
            location: null,
            locationsList: LOCATIONS.map(l => l.name),
            timerDuration: 360, // 6 minutes
            timerRemaining: 360,
            timerActive: false,
            log: ['Salon de jeu créé. En attente des joueurs...'],
            winner: null,
            winReason: null
        };
    }
    getPlayers() {
        return this.state.players;
    }
    getState() {
        return this.state;
    }
    setOnTickCallback(callback) {
        this.onTickCallback = callback;
    }
    addPlayer(id, username, color) {
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
    removePlayer(socketId) {
        this.state.players = this.state.players.filter(p => p.id !== socketId);
        if (this.state.status !== 'LOBBY') {
            this.state.log.push(`⚠️ Un joueur s'est déconnecté. Partie réinitialisée.`);
            this.resetGame();
        }
    }
    startGame() {
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
            }
            else {
                p.isSpy = false;
                p.role = shuffledRoles[roleIdx % shuffledRoles.length];
                roleIdx++;
            }
        });
        this.state.status = 'PLAYING';
        this.state.winner = null;
        this.state.winReason = null;
        this.state.timerRemaining = this.state.timerDuration;
        this.state.timerActive = true;
        this.state.log.push('La partie de Discretos commence ! Posez-vous des questions pour démasquer l\'intrus.');
        // Start timer interval
        this.startInterval();
        return true;
    }
    startInterval() {
        this.stopInterval();
        this.timerInterval = setInterval(() => {
            if (this.state.timerActive && this.state.timerRemaining > 0) {
                this.state.timerRemaining--;
                if (this.state.timerRemaining <= 0) {
                    this.state.timerActive = false;
                    this.state.status = 'REVEAL';
                    this.state.log.push('⏱️ Le temps est écoulé ! Vote final requis ou l\'intrus gagne.');
                    this.stopInterval();
                }
                if (this.onTickCallback) {
                    this.onTickCallback();
                }
            }
        }, 1000);
    }
    stopInterval() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }
    accusePlayer(voterId, targetId) {
        if (this.state.status !== 'PLAYING' && this.state.status !== 'REVEAL') {
            return false;
        }
        const voter = this.state.players.find(p => p.id === voterId);
        if (!voter)
            return false;
        voter.hasVotedToAccuse = targetId;
        if (targetId) {
            const target = this.state.players.find(p => p.id === targetId);
            this.state.log.push(`📣 ${voter.username} suspecte ${target ? target.username : targetId}.`);
        }
        else {
            this.state.log.push(`📣 ${voter.username} retire sa suspicion.`);
        }
        // Check if majority of all players (including the accused themselves? Yes, simple majority of all active players)
        // is reached for any player.
        const activeCount = this.state.players.length;
        const majority = Math.floor(activeCount / 2) + 1;
        for (const player of this.state.players) {
            const votesForHim = this.state.players.filter(p => p.hasVotedToAccuse === player.id).length;
            if (votesForHim >= majority) {
                // Accused! Resolve game
                this.stopInterval();
                this.state.status = 'FINISHED';
                if (player.isSpy) {
                    this.state.winner = 'CITIZENS';
                    this.state.winReason = `Félicitations ! L'intrus ${player.username} a été démasqué avec ${votesForHim} votes !`;
                    this.state.log.push(`👑 CITOYENS GAGNENT : L'intrus était bien ${player.username}.`);
                }
                else {
                    const spy = this.state.players.find(p => p.isSpy);
                    this.state.winner = 'SPY';
                    this.state.winReason = `Erreur ! Les citoyens ont accusé ${player.username} à tort. L'intrus était ${spy.username}.`;
                    this.state.log.push(`🥸 L'INTRUS GAGNE : ${spy.username} a réussi à monter les citoyens les uns contre les autres.`);
                }
                return true;
            }
        }
        return true;
    }
    guessLocation(spyId, locationName) {
        if (this.state.status !== 'PLAYING') {
            return false;
        }
        const player = this.state.players.find(p => p.id === spyId);
        if (!player || !player.isSpy || !this.selectedLocation) {
            return false;
        }
        this.stopInterval();
        this.state.status = 'FINISHED';
        if (locationName === this.selectedLocation.name) {
            this.state.winner = 'SPY';
            this.state.winReason = `L'intrus ${player.username} s'est révélé et a correctement deviné le lieu : ${locationName} !`;
            this.state.log.push(`🥸 L'INTRUS GAGNE : ${player.username} a deviné le lieu correct !`);
        }
        else {
            this.state.winner = 'CITIZENS';
            this.state.winReason = `L'intrus ${player.username} s'est trompé de lieu ! Il a deviné ${locationName} mais c'était ${this.selectedLocation.name}.`;
            this.state.log.push(`👑 CITOYENS GAGNENT : Mauvaise déduction de l'intrus !`);
        }
        return true;
    }
    resetGame() {
        this.stopInterval();
        this.state.status = 'LOBBY';
        this.state.location = null;
        this.state.winner = null;
        this.state.winReason = null;
        this.state.timerActive = false;
        this.state.players.forEach(p => {
            p.role = 'Spectateur';
            p.isSpy = false;
            p.hasVotedToAccuse = null;
        });
        this.state.log = ['Partie réinitialisée. En attente du départ...'];
        return true;
    }
    destroy() {
        this.stopInterval();
    }
}
exports.DiscretosEngine = DiscretosEngine;
