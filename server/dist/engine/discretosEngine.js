"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiscretosEngine = void 0;
const THEMES = [
    {
        name: '🧙 Sorciers & Vieux Sages',
        characters: ['Gandalf', 'Dumbledore', 'Merlin', 'Docteur Strange', 'Yoda', 'Gargamel', 'Radagast le Brun', 'Nicolas Flamel']
    },
    {
        name: '🦸 Super-Héros Surpuissants',
        characters: ['Saitama', 'Goku', 'Superman', 'Thor', 'Hulk', 'Captain Marvel', 'Flash', 'Silver Surfer']
    },
    {
        name: '🦹 Grands Méchants Charismatiques',
        characters: ['Le Joker', 'Thanos', 'Lex Luthor', 'Magneto', 'Walter White', 'Hannibal Lecter', 'Doctor Doom', 'Megatron']
    },
    {
        name: '🔍 Détectives & Enquêteurs Géniaux',
        characters: ['Sherlock Holmes', 'Hercule Poirot', 'Columbo', 'Batman', 'L (Death Note)', 'Adrian Monk', 'Jessica Fletcher', 'Benoit Blanc']
    },
    {
        name: '🤖 Robots & Intelligences Artificielles',
        characters: ['R2-D2', 'C-3PO', 'Wall-E', 'Terminator', 'Optimus Prime', 'Megatron', 'HAL 9000', 'Data (Star Trek)', 'RoboCop', 'Ultron']
    },
    {
        name: '🧹 Personnages qui Nettoient / Rangent',
        characters: ['Monsieur Propre', 'Bob l\'Éponge', 'Cendrillon', 'Alfred Pennyworth', 'Fantomas', 'Wall-E', 'Marie Kondo']
    },
    {
        name: '🏋️ Guerriers & Combattants Légendaires',
        characters: ['Rocky Balboa', 'Bruce Lee', 'Achille', 'Leonidas (300)', 'Aragorn', 'Geralt de Riv', 'Kratos', 'Mulan', 'Conan le Barbare']
    },
    {
        name: '👴 Pères Sages & Mentors',
        characters: ['Obi-Wan Kenobi', 'Mufasa', 'Iroh (Avatar)', 'Splinter (TMNT)', 'Pa Kent', 'Alfred Pennyworth', 'Hedwig le hibou', 'Morgan Freeman (en vrai)']
    },
    {
        name: '🎭 Clowns & Bouffons Célèbres',
        characters: ['Pennywise', 'Le Joker (Ledger)', 'Krusty le Clown', 'Ronald McDonald', 'Pipo le Clown', 'Le Bouffon (Roi Lear)', 'Arlequin']
    },
    {
        name: '🧛 Monstres & Créatures Légendaires',
        characters: ['Dracula', 'Frankenstein', 'Le Loup-Garou', 'La Momie', 'Godzilla', 'King Kong', 'La Créature du Lagon Noir', 'Medusa']
    },
    {
        name: '🧜 Personnages des Fonds Marins',
        characters: ['Ariel (La Petite Sirène)', 'Aquaman', 'Nemo', 'Bob l\'Éponge', 'Patrick l\'Étoile', 'Le Roi Triton', 'Ursula', 'Davy Jones']
    },
    {
        name: '👸 Princesses & Reines Puissantes',
        characters: ['Mulan', 'Moana', 'Elsa', 'Merida (Rebelle)', 'Daenerys Targaryen', 'Reine des Neiges', 'Cléopâtre', 'Princesse Leia']
    },
    {
        name: '🤠 Cowboys & Hors-La-Loi',
        characters: ['Jesse James', 'Billy the Kid', 'Doc Holliday', 'Wyatt Earp', 'Woody (Toy Story)', 'Clint Eastwood (The Good)', 'Django', 'John Marston']
    },
    {
        name: '🧑‍🚀 Explorateurs de l\'Espace',
        characters: ['Neil Armstrong', 'Buzz l\'Éclair', 'Captain Kirk', 'Spock', 'Han Solo', 'Ripley (Alien)', 'Matt Damon (Seul sur Mars)', 'Wall-E']
    },
    {
        name: '🦊 Renards & Filous Rusés',
        characters: ['Renard (Zootopie)', 'Goupil', 'Loki', 'Jack Sparrow', 'Arsène Lupin', 'Tom (Tom & Jerry)', 'Wile E. Coyote', 'Ratatouille (Rémi)']
    },
    {
        name: '🎸 Rockstars & Légendes de la Musique',
        characters: ['Freddie Mercury', 'David Bowie', 'Elvis Presley', 'Jimi Hendrix', 'Kurt Cobain', 'Mick Jagger', 'Amy Winehouse', 'Prince']
    },
    {
        name: '🏃 Coureurs & Personnages Ultra-Rapides',
        characters: ['Flash', 'Sonic', 'Forrest Gump', 'Usain Bolt', 'Naruto', 'Road Runner', 'Quicksilver', 'Speedy Gonzales']
    },
    {
        name: '🐉 Dresseurs & Maîtres de Bêtes',
        characters: ['Dresseur Pokémon (Sacha)', 'Daenerys Targaryen', 'Tarzan', 'Hiccup (Dragons)', 'Steve Irwin', 'Beastmaster', 'Sigourney Weaver (Gorilles)']
    },
    {
        name: '🍕 Personnages qui Mangent Tout le Temps',
        characters: ['Scooby-Doo', 'Shaggy Rogers', 'Homer Simpson', 'Kirby', 'Garfield', 'Gargantua', 'Takeshi (Beyblade)', 'Luffy (One Piece)']
    },
    {
        name: '🕵️ Espions & Agents Secrets',
        characters: ['James Bond', 'Ethan Hunt (Mission Impossible)', 'Jason Bourne', 'Natasha Romanoff (Black Widow)', 'OSS 117', 'Austin Powers', 'Alias (Sydney Bristow)', 'George Smiley']
    },
];
function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}
class DiscretosEngine {
    roomCode;
    state;
    selectedTheme = null;
    constructor(roomCode) {
        this.roomCode = roomCode;
        this.state = {
            status: 'LOBBY',
            players: [],
            currentPlayerIndex: 0,
            currentRound: 1,
            location: null,
            spyCharacter: null,
            themeName: null,
            locationsList: THEMES.map(t => t.name),
            clues: [],
            log: ['Salon de jeu créé. En attente des joueurs...'],
            winner: null,
            winReason: null
        };
    }
    getPlayers() {
        return this.state.players;
    }
    getState() {
        // During PLAYING and VOTING, hide isSpy — nobody knows if they're the impostor
        if (this.state.status === 'PLAYING' || this.state.status === 'VOTING') {
            return {
                ...this.state,
                players: this.state.players.map(p => ({ ...p, isSpy: false })),
                // Also hide spyCharacter and citizen character from the broadcast
                // (clients only see their own role via p.role, which is already personalised per-player)
                spyCharacter: null,
                location: null,
            };
        }
        return this.state;
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
        // Pick a theme
        const themeIdx = Math.floor(Math.random() * THEMES.length);
        this.selectedTheme = THEMES[themeIdx];
        this.state.themeName = this.selectedTheme.name;
        // Shuffle characters from the pool
        const shuffledChars = shuffle(this.selectedTheme.characters);
        // Need at least 2 different characters: one for citizens, one for spy
        const citizenCharacter = shuffledChars[0];
        const spyCharacter = shuffledChars[1] ?? shuffledChars[0]; // fallback (shouldn't happen with pools of 7+)
        this.state.location = citizenCharacter; // shown to citizens
        this.state.spyCharacter = spyCharacter; // shown only to spy
        // Pick spy
        const spyIdx = Math.floor(Math.random() * this.state.players.length);
        // Assign characters
        this.state.players.forEach((p, idx) => {
            p.hasVotedToAccuse = null;
            if (idx === spyIdx) {
                p.isSpy = true;
                p.role = spyCharacter; // spy gets THEIR character
            }
            else {
                p.isSpy = false;
                p.role = citizenCharacter; // all citizens get the same character
            }
        });
        this.state.status = 'PLAYING';
        this.state.winner = null;
        this.state.winReason = null;
        this.state.currentPlayerIndex = 0;
        this.state.currentRound = 1;
        this.state.clues = [];
        this.state.log.push(`🎭 La partie commence ! Thème : ${this.selectedTheme.name}`);
        this.state.log.push('Donnez à tour de rôle un indice sur votre personnage sans le nommer directement !');
        return true;
    }
    submitClue(socketId, clueText) {
        if (this.state.status !== 'PLAYING')
            return false;
        const activePlayer = this.state.players[this.state.currentPlayerIndex];
        if (!activePlayer || activePlayer.id !== socketId)
            return false;
        const cleanClue = clueText.trim();
        if (!cleanClue)
            return false;
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
            }
            else {
                this.state.log.push(`--- Début du tour d'indices ${this.state.currentRound} ---`);
            }
        }
        return true;
    }
    accusePlayer(voterId, targetId) {
        if (this.state.status !== 'VOTING') {
            return false;
        }
        const voter = this.state.players.find(p => p.id === voterId);
        if (!voter)
            return false;
        voter.hasVotedToAccuse = targetId;
        const target = this.state.players.find(p => p.id === targetId);
        this.state.log.push(`📣 ${voter.username} vote contre ${target.username}.`);
        // Check if everyone voted
        const allVoted = this.state.players.every(p => p.hasVotedToAccuse !== null);
        if (allVoted) {
            // Tally votes
            const voteTally = {};
            this.state.players.forEach(p => {
                const tId = p.hasVotedToAccuse;
                voteTally[tId] = (voteTally[tId] || 0) + 1;
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
            const accusedPlayer = this.state.players.find(p => p.id === accusedId);
            const spy = this.state.players.find(p => p.isSpy);
            this.state.status = 'FINISHED';
            if (accusedPlayer.isSpy) {
                this.state.winner = 'CITIZENS';
                this.state.winReason = `L'intrus ${accusedPlayer.username} a été démasqué ! Il jouait le rôle de "${this.state.spyCharacter}" (thème : ${this.state.themeName}). Les citoyens incarnaient "${this.state.location}".`;
                this.state.log.push(`👑 CITOYENS GAGNENT : L'intrus était bien ${accusedPlayer.username} (${this.state.spyCharacter}).`);
            }
            else {
                this.state.winner = 'SPY';
                this.state.winReason = `L'intrus ${spy.username} gagne ! Le village a failli en accusant ${accusedPlayer.username}. L'intrus était "${this.state.spyCharacter}", les citoyens étaient "${this.state.location}" (thème : ${this.state.themeName}).`;
                this.state.log.push(`🥸 L'INTRUS GAGNE : Les citoyens se sont trompés d'intrus.`);
            }
        }
        return true;
    }
    resetGame() {
        this.state.status = 'LOBBY';
        this.state.location = null;
        this.state.spyCharacter = null;
        this.state.themeName = null;
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
    destroy() {
        // No-op
    }
}
exports.DiscretosEngine = DiscretosEngine;
