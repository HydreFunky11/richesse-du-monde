"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const gameEngine_1 = require("./engine/gameEngine");
const unoEngine_1 = require("./engine/unoEngine");
const chaosEngine_1 = require("./engine/chaosEngine");
const loveLetterEngine_1 = require("./engine/loveLetterEngine");
const discretosEngine_1 = require("./engine/discretosEngine");
const skyjoEngine_1 = require("./engine/skyjoEngine");
const kingoftokyoEngine_1 = require("./engine/kingoftokyoEngine");
const dungeonMayhemEngine_1 = require("./engine/dungeonMayhemEngine");
const clashEngine_1 = require("./engine/clashEngine");
const sumoEngine_1 = require("./engine/sumoEngine");
const rtsEngine_1 = require("./engine/rtsEngine");
const mobaEngine_1 = require("./engine/mobaEngine");
const noteEngine_1 = require("./engine/noteEngine");
const propHuntEngine_1 = require("./engine/propHuntEngine");
const hellGambleEngine_1 = require("./engine/hellGambleEngine");
const racingEngine_1 = require("./engine/racingEngine");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// Load .env locally if present
try {
    const candidates = [
        path_1.default.resolve(__dirname, '../.env'),
        path_1.default.resolve(__dirname, '../../.env'),
        path_1.default.resolve(process.cwd(), '.env'),
        path_1.default.resolve(process.cwd(), 'server/.env'),
    ];
    for (const envPath of candidates) {
        if (fs_1.default.existsSync(envPath)) {
            const content = fs_1.default.readFileSync(envPath, 'utf8');
            content.split('\n').forEach(line => {
                const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
                if (match) {
                    const key = match[1];
                    let value = (match[2] || '').trim();
                    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                        value = value.slice(1, -1);
                    }
                    if (!process.env[key]) {
                        process.env[key] = value;
                    }
                }
            });
        }
    }
}
catch (e) {
    // ignore
}
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    },
    perMessageDeflate: {
        threshold: 1024
    }
});
const PORT = process.env.PORT || 3001;
const games = {};
const unoGames = {};
const chaosGames = {};
const loveLetterGames = {};
const discretosGames = {};
const skyjoGames = {};
const kingOfTokyoGames = {};
const mayhemGames = {};
const clashGames = {};
const sumoGames = {};
const rtsGames = {};
const mobaGames = {};
const noteGames = {};
const prophuntGames = {};
const hellgambleGames = {};
const racingGames = {};
const PLAYER_COLORS = ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];
function broadcastNoteState(roomCode, game) {
    const roomSockets = io.sockets.adapter.rooms.get(roomCode);
    if (roomSockets) {
        for (const sid of roomSockets) {
            io.to(sid).emit('noteStateUpdate', game.getState(sid));
        }
    }
    else {
        io.to(roomCode).emit('noteStateUpdate', game.getState());
    }
}
app.get('/health', (req, res) => {
    res.send({ status: 'ok', activeGames: Object.keys(games).length });
});
io.on('connection', (socket) => {
    console.log(`Un joueur s'est connecté : ${socket.id}`);
    socket.on('joinGame', ({ username, roomCode, gameType }) => {
        const formattedRoomCode = roomCode.toUpperCase().trim();
        const validTypes = ['uno', 'chaos', 'loveletter', 'discretos', 'skyjo', 'kingoftokyo', 'mayhem', 'clash', 'sumo', 'rts', 'moba', 'note', 'prophunt', 'hellgamble', 'racing'];
        let type = 'richesse';
        if (gameType === 'dungeonmayhem')
            type = 'mayhem';
        else if (gameType === 'hideseek')
            type = 'prophunt';
        else if (gameType === 'caseclash' || gameType === 'gamble')
            type = 'hellgamble';
        else if (gameType === 'course' || gameType === 'race')
            type = 'racing';
        else if (gameType && validTypes.includes(gameType))
            type = gameType;
        socket.gameType = type;
        if (type === 'uno') {
            if (!unoGames[formattedRoomCode] || unoGames[formattedRoomCode].getState().status === 'FINISHED' || unoGames[formattedRoomCode].getPlayers().length === 0) {
                unoGames[formattedRoomCode] = new unoEngine_1.UnoEngine(formattedRoomCode);
            }
            const game = unoGames[formattedRoomCode];
            const color = PLAYER_COLORS[game.getPlayers().length] || '#6B7280';
            const success = game.addPlayer(socket.id, username, color);
            if (success) {
                socket.join(formattedRoomCode);
                socket.roomCode = formattedRoomCode;
                socket.username = username;
                io.to(formattedRoomCode).emit('unoStateUpdate', game.getState());
                console.log(`[UNO LOBBY] ${username} a rejoint le salon ${formattedRoomCode}`);
            }
            else {
                socket.emit('error', 'Impossible de rejoindre le salon UNO (partie commencée ou salon plein).');
            }
        }
        else if (type === 'chaos') {
            if (!chaosGames[formattedRoomCode] || chaosGames[formattedRoomCode].getState().status === 'FINISHED' || chaosGames[formattedRoomCode].getPlayers().length === 0) {
                chaosGames[formattedRoomCode] = new chaosEngine_1.ChaosEngine(formattedRoomCode);
            }
            const game = chaosGames[formattedRoomCode];
            const color = PLAYER_COLORS[game.getPlayers().length] || '#F59E0B';
            const success = game.addPlayer(socket.id, username, color);
            if (success) {
                socket.join(formattedRoomCode);
                socket.roomCode = formattedRoomCode;
                socket.username = username;
                socket.emit('chaosStateUpdate', game.getState());
                io.to(formattedRoomCode).emit('chaosStateUpdate', game.getState());
                console.log(`[CHAOS LOBBY] ${username} a rejoint le salon ${formattedRoomCode}`);
            }
            else {
                socket.emit('error', 'Impossible de rejoindre le salon Chaos (partie commencée ou salon plein).');
            }
        }
        else if (type === 'loveletter') {
            if (!loveLetterGames[formattedRoomCode] || loveLetterGames[formattedRoomCode].getState().status === 'FINISHED' || loveLetterGames[formattedRoomCode].getPlayers().length === 0) {
                loveLetterGames[formattedRoomCode] = new loveLetterEngine_1.LoveLetterEngine(formattedRoomCode);
            }
            const game = loveLetterGames[formattedRoomCode];
            const color = PLAYER_COLORS[game.getPlayers().length] || '#6B7280';
            const success = game.addPlayer(socket.id, username, color);
            if (success) {
                socket.join(formattedRoomCode);
                socket.roomCode = formattedRoomCode;
                socket.username = username;
                io.to(formattedRoomCode).emit('loveletterStateUpdate', game.getState());
                console.log(`[LOVELETTER LOBBY] ${username} a rejoint le salon ${formattedRoomCode}`);
            }
            else {
                socket.emit('error', 'Impossible de rejoindre le salon Love Letter (partie commencée ou salon plein).');
            }
        }
        else if (type === 'discretos') {
            if (!discretosGames[formattedRoomCode] || discretosGames[formattedRoomCode].getState().status === 'FINISHED' || discretosGames[formattedRoomCode].getPlayers().length === 0) {
                discretosGames[formattedRoomCode] = new discretosEngine_1.DiscretosEngine(formattedRoomCode);
            }
            const game = discretosGames[formattedRoomCode];
            const color = PLAYER_COLORS[game.getPlayers().length] || '#6B7280';
            const success = game.addPlayer(socket.id, username, color);
            if (success) {
                socket.join(formattedRoomCode);
                socket.roomCode = formattedRoomCode;
                socket.username = username;
                io.to(formattedRoomCode).emit('discretosStateUpdate', game.getState());
                console.log(`[DISCRETOS LOBBY] ${username} a rejoint le salon ${formattedRoomCode}`);
            }
            else {
                socket.emit('error', 'Impossible de rejoindre le salon Discretos (partie commencée ou salon plein).');
            }
        }
        else if (type === 'skyjo') {
            if (!skyjoGames[formattedRoomCode] || skyjoGames[formattedRoomCode].getState().status === 'FINISHED' || skyjoGames[formattedRoomCode].getPlayers().length === 0) {
                skyjoGames[formattedRoomCode] = new skyjoEngine_1.SkyjoEngine(formattedRoomCode);
            }
            const game = skyjoGames[formattedRoomCode];
            const color = PLAYER_COLORS[game.getPlayers().length] || '#6B7280';
            const success = game.addPlayer(socket.id, username, color);
            if (success) {
                socket.join(formattedRoomCode);
                socket.roomCode = formattedRoomCode;
                socket.username = username;
                io.to(formattedRoomCode).emit('skyjoStateUpdate', game.getState());
                console.log(`[SKYJO LOBBY] ${username} a rejoint le salon ${formattedRoomCode}`);
            }
            else {
                socket.emit('error', 'Impossible de rejoindre le salon Skyjo (partie commencée ou salon plein).');
            }
        }
        else if (type === 'kingoftokyo') {
            if (!kingOfTokyoGames[formattedRoomCode] || kingOfTokyoGames[formattedRoomCode].getState().status === 'FINISHED' || kingOfTokyoGames[formattedRoomCode].getPlayers().length === 0) {
                kingOfTokyoGames[formattedRoomCode] = new kingoftokyoEngine_1.KingOfTokyoEngine(formattedRoomCode);
            }
            const game = kingOfTokyoGames[formattedRoomCode];
            const color = PLAYER_COLORS[game.getPlayers().length] || '#6B7280';
            const success = game.addPlayer(socket.id, username, color);
            if (success) {
                socket.join(formattedRoomCode);
                socket.roomCode = formattedRoomCode;
                socket.username = username;
                io.to(formattedRoomCode).emit('kingStateUpdate', game.getState());
                console.log(`[KING LOBBY] ${username} a rejoint le salon ${formattedRoomCode}`);
            }
            else {
                socket.emit('error', 'Impossible de rejoindre le salon King of Tokyo (partie commencée ou salon plein).');
            }
        }
        else if (type === 'mayhem') {
            if (!mayhemGames[formattedRoomCode] || mayhemGames[formattedRoomCode].getState().status === 'FINISHED' || mayhemGames[formattedRoomCode].getPlayers().length === 0 || mayhemGames[formattedRoomCode].getPlayers().every(p => p.isEliminated)) {
                mayhemGames[formattedRoomCode] = new dungeonMayhemEngine_1.DungeonMayhemEngine(formattedRoomCode);
            }
            const game = mayhemGames[formattedRoomCode];
            const color = PLAYER_COLORS[game.getPlayers().length] || '#6B7280';
            const success = game.addPlayer(socket.id, username, color);
            if (success) {
                socket.join(formattedRoomCode);
                socket.roomCode = formattedRoomCode;
                socket.username = username;
                io.to(formattedRoomCode).emit('mayhemStateUpdate', game.getState());
                console.log(`[MAYHEM LOBBY] ${username} a rejoint le salon ${formattedRoomCode}`);
            }
            else {
                socket.emit('error', 'Impossible de rejoindre le salon Dungeon Mayhem (partie commencée ou salon plein).');
            }
        }
        else if (type === 'sumo') {
            if (!sumoGames[formattedRoomCode] || sumoGames[formattedRoomCode].getState().status === 'MATCH_FINISHED' || sumoGames[formattedRoomCode].getPlayers().length === 0) {
                sumoGames[formattedRoomCode] = new sumoEngine_1.SumoEngine(formattedRoomCode);
                sumoGames[formattedRoomCode].onStateChange((state) => {
                    io.to(formattedRoomCode).emit('sumoStateUpdate', state);
                });
            }
            const game = sumoGames[formattedRoomCode];
            const color = PLAYER_COLORS[game.getPlayers().length] || '#3B82F6';
            const success = game.addPlayer(socket.id, username, color);
            if (success) {
                socket.join(formattedRoomCode);
                socket.roomCode = formattedRoomCode;
                socket.username = username;
                socket.emit('sumoStateUpdate', game.getState());
                io.to(formattedRoomCode).emit('sumoStateUpdate', game.getState());
                console.log(`[SUMO LOBBY] ${username} a rejoint le salon ${formattedRoomCode}`);
            }
            else {
                socket.emit('error', 'Impossible de rejoindre le salon Sumo.');
            }
        }
        else if (type === 'clash') {
            if (!clashGames[formattedRoomCode] || clashGames[formattedRoomCode].getState().status === 'FINISHED' || clashGames[formattedRoomCode].getPlayers().length === 0) {
                clashGames[formattedRoomCode] = new clashEngine_1.ClashEngine(formattedRoomCode);
            }
            const game = clashGames[formattedRoomCode];
            const color = PLAYER_COLORS[game.getPlayers().length] || '#3B82F6';
            const success = game.addPlayer(socket.id, username, color);
            if (success) {
                socket.join(formattedRoomCode);
                socket.roomCode = formattedRoomCode;
                socket.username = username;
                socket.emit('clashStateUpdate', game.getState());
                io.to(formattedRoomCode).emit('clashStateUpdate', game.getState());
                console.log(`[CLASH LOBBY] ${username} a rejoint le salon ${formattedRoomCode}`);
            }
            else {
                socket.emit('error', 'Impossible de rejoindre le salon Clash (partie commencée ou salon plein).');
            }
        }
        else if (type === 'moba') {
            if (!mobaGames[formattedRoomCode] || mobaGames[formattedRoomCode].getState().players.length === 0) {
                mobaGames[formattedRoomCode] = new mobaEngine_1.MobaEngine(formattedRoomCode);
                mobaGames[formattedRoomCode].setOnUpdate((state) => {
                    io.to(formattedRoomCode).emit('mobaStateUpdate', state);
                });
            }
            const game = mobaGames[formattedRoomCode];
            game.addPlayer(socket.id, username);
            socket.join(formattedRoomCode);
            socket.roomCode = formattedRoomCode;
            socket.username = username;
            socket.emit('mobaStateUpdate', game.getState());
            io.to(formattedRoomCode).emit('mobaStateUpdate', game.getState());
        }
        else if (type === 'note') {
            if (!noteGames[formattedRoomCode] || noteGames[formattedRoomCode].getState().phase === 'FINISHED' || noteGames[formattedRoomCode].getPlayers().length === 0) {
                noteGames[formattedRoomCode] = new noteEngine_1.NoteEngine(formattedRoomCode);
            }
            const game = noteGames[formattedRoomCode];
            game.addPlayer(socket.id, username);
            socket.join(formattedRoomCode);
            socket.roomCode = formattedRoomCode;
            socket.username = username;
            socket.emit('noteStateUpdate', game.getState(socket.id));
            broadcastNoteState(formattedRoomCode, game);
            console.log(`[NOTE LOBBY] ${username} a rejoint le salon ${formattedRoomCode}`);
        }
        else if (type === 'rts') {
            if (!rtsGames[formattedRoomCode] || rtsGames[formattedRoomCode].getState().status === 'FINISHED' || rtsGames[formattedRoomCode].getPlayers().length === 0) {
                rtsGames[formattedRoomCode] = new rtsEngine_1.RtsEngine(formattedRoomCode, (state) => {
                    io.to(formattedRoomCode).emit('rtsStateUpdate', state);
                });
            }
            const game = rtsGames[formattedRoomCode];
            const color = PLAYER_COLORS[game.getPlayers().length] || '#10B981';
            const success = game.addPlayer(socket.id, username, color);
            if (success) {
                socket.join(formattedRoomCode);
                socket.roomCode = formattedRoomCode;
                socket.username = username;
                socket.emit('rtsStateUpdate', game.getState());
                io.to(formattedRoomCode).emit('rtsStateUpdate', game.getState());
                console.log(`[RTS LOBBY] ${username} a rejoint le salon ${formattedRoomCode}`);
            }
            else {
                socket.emit('error', 'Impossible de rejoindre le salon RTS (partie commencée ou salon plein).');
            }
        }
        else if (type === 'prophunt') {
            if (!prophuntGames[formattedRoomCode] || prophuntGames[formattedRoomCode].getState().phase === 'FINISHED' || prophuntGames[formattedRoomCode].getPlayers().length === 0) {
                prophuntGames[formattedRoomCode] = new propHuntEngine_1.PropHuntEngine(formattedRoomCode, (state) => {
                    io.to(formattedRoomCode).emit('prophuntStateUpdate', state);
                });
            }
            const game = prophuntGames[formattedRoomCode];
            const success = game.addPlayer(socket.id, username);
            if (success) {
                socket.join(formattedRoomCode);
                socket.roomCode = formattedRoomCode;
                socket.username = username;
                socket.emit('prophuntStateUpdate', game.getState());
                io.to(formattedRoomCode).emit('prophuntStateUpdate', game.getState());
                console.log(`[PROPHUNT LOBBY] ${username} a rejoint le salon ${formattedRoomCode}`);
            }
            else {
                socket.emit('error', 'Impossible de rejoindre le salon Prop Hunt (salon plein).');
            }
        }
        else if (type === 'hellgamble') {
            if (!hellgambleGames[formattedRoomCode]) {
                hellgambleGames[formattedRoomCode] = new hellGambleEngine_1.HellGambleEngine(formattedRoomCode, (state) => {
                    io.to(formattedRoomCode).emit('hellgambleStateUpdate', state);
                });
            }
            const game = hellgambleGames[formattedRoomCode];
            game.addPlayer(socket.id, username);
            socket.join(formattedRoomCode);
            socket.roomCode = formattedRoomCode;
            socket.username = username;
            socket.emit('hellgambleStateUpdate', game.getState());
            io.to(formattedRoomCode).emit('hellgambleStateUpdate', game.getState());
            console.log(`[HELLGAMBLE LOBBY] ${username} a rejoint le casino ${formattedRoomCode}`);
        }
        else if (type === 'racing') {
            if (!racingGames[formattedRoomCode] || racingGames[formattedRoomCode].getState().status === 'FINISHED' || racingGames[formattedRoomCode].getPlayers().length === 0) {
                racingGames[formattedRoomCode] = new racingEngine_1.RacingEngine(formattedRoomCode, (state) => {
                    io.to(formattedRoomCode).emit('racingStateUpdate', state);
                });
            }
            const game = racingGames[formattedRoomCode];
            const color = PLAYER_COLORS[game.getPlayers().length] || '#6B7280';
            const success = game.addPlayer(socket.id, username, color);
            if (success) {
                socket.join(formattedRoomCode);
                socket.roomCode = formattedRoomCode;
                socket.username = username;
                socket.emit('racingStateUpdate', game.getState());
                io.to(formattedRoomCode).emit('racingStateUpdate', game.getState());
                console.log(`[RACING LOBBY] ${username} a rejoint le salon ${formattedRoomCode}`);
            }
            else {
                socket.emit('error', 'Impossible de rejoindre le salon Course (partie commencée ou salon plein).');
            }
        }
        else {
            if (!games[formattedRoomCode] || games[formattedRoomCode].getStatus() === 'FINISHED' || games[formattedRoomCode].getPlayers().length === 0 || games[formattedRoomCode].getPlayers().every(p => p.isBankrupt)) {
                games[formattedRoomCode] = new gameEngine_1.GameEngine(formattedRoomCode);
            }
            const game = games[formattedRoomCode];
            const color = PLAYER_COLORS[game.getPlayers().length] || '#6B7280';
            const success = game.addPlayer(socket.id, username, color);
            if (success) {
                socket.join(formattedRoomCode);
                socket.roomCode = formattedRoomCode;
                socket.username = username;
                io.to(formattedRoomCode).emit('gameStateUpdate', game.getState());
                console.log(`[LOBBY] ${username} a rejoint le salon ${formattedRoomCode}`);
            }
            else {
                socket.emit('error', 'Impossible de rejoindre le salon (partie commencée ou salon plein).');
            }
        }
    });
    socket.on('startGame', () => {
        const roomCode = socket.roomCode;
        if (!roomCode || !games[roomCode])
            return;
        const game = games[roomCode];
        const success = game.startGame();
        if (success) {
            io.to(roomCode).emit('gameStateUpdate', game.getState());
            console.log(`[GAME] Partie démarrée dans le salon ${roomCode}`);
        }
        else {
            socket.emit('error', 'Impossible de démarrer la partie (minimum 2 joueurs requis).');
        }
    });
    socket.on('rollDice', () => {
        const roomCode = socket.roomCode;
        if (!roomCode || !games[roomCode])
            return;
        const game = games[roomCode];
        const result = game.rollDice(socket.id);
        if (result) {
            io.to(roomCode).emit('gameStateUpdate', game.getState());
            console.log(`[GAME] ${socket.username} a lancé les dés dans ${roomCode}`);
        }
        else {
            socket.emit('error', 'Action non autorisée (ce n\'est pas votre tour ou dés déjà lancés).');
        }
    });
    socket.on('buyTitle', ({ titleId }) => {
        const roomCode = socket.roomCode;
        if (!roomCode || !games[roomCode])
            return;
        const game = games[roomCode];
        const success = game.buyTitle(socket.id, titleId);
        if (success) {
            io.to(roomCode).emit('gameStateUpdate', game.getState());
            console.log(`[GAME] Titre acheté dans le salon ${roomCode} : ${titleId}`);
        }
        else {
            socket.emit('error', 'Impossible d\'acheter le titre (fonds insuffisants ou mauvais titre).');
        }
    });
    socket.on('buyJokerCard', () => {
        const roomCode = socket.roomCode;
        if (!roomCode || !games[roomCode])
            return;
        const game = games[roomCode];
        const success = game.buyJokerCard(socket.id);
        if (success) {
            io.to(roomCode).emit('gameStateUpdate', game.getState());
            console.log(`[GAME] Joker acheté par ${socket.username}`);
        }
        else {
            socket.emit('error', 'Impossible d\'acheter la carte Joker (fonds insuffisants ou mauvaise case).');
        }
    });
    socket.on('useJokerCard', () => {
        const roomCode = socket.roomCode;
        if (!roomCode || !games[roomCode])
            return;
        const game = games[roomCode];
        const success = game.useJokerCard(socket.id);
        if (success) {
            io.to(roomCode).emit('gameStateUpdate', game.getState());
            console.log(`[GAME] Joker utilisé par ${socket.username}`);
        }
        else {
            socket.emit('error', 'Impossible d\'utiliser le Joker.');
        }
    });
    socket.on('startAuction', ({ titleIds }) => {
        const roomCode = socket.roomCode;
        if (!roomCode || !games[roomCode])
            return;
        const game = games[roomCode];
        const success = game.startAuction(socket.id, titleIds);
        if (success) {
            io.to(roomCode).emit('gameStateUpdate', game.getState());
            console.log(`[GAME] Enchère démarrée par ${socket.username}`);
        }
        else {
            socket.emit('error', 'Impossible de démarrer l\'enchère (sélection incorrecte de titres).');
        }
    });
    socket.on('placeBid', ({ bidAmount }) => {
        const roomCode = socket.roomCode;
        if (!roomCode || !games[roomCode])
            return;
        const game = games[roomCode];
        const success = game.placeBid(socket.id, bidAmount);
        if (success) {
            io.to(roomCode).emit('gameStateUpdate', game.getState());
            console.log(`[GAME] Offre placée par ${socket.username} : ${bidAmount}`);
        }
        else {
            socket.emit('error', 'Offre non valide (montant insuffisant ou ce n\'est pas le moment).');
        }
    });
    socket.on('passBid', () => {
        const roomCode = socket.roomCode;
        if (!roomCode || !games[roomCode])
            return;
        const game = games[roomCode];
        const success = game.passBid(socket.id);
        if (success) {
            io.to(roomCode).emit('gameStateUpdate', game.getState());
            console.log(`[GAME] Enchère passée par ${socket.username}`);
        }
        else {
            socket.emit('error', 'Impossible de passer.');
        }
    });
    socket.on('resetGame', () => {
        const roomCode = socket.roomCode;
        if (!roomCode || !games[roomCode])
            return;
        const game = games[roomCode];
        const success = game.resetGame();
        if (success) {
            io.to(roomCode).emit('gameStateUpdate', game.getState());
            console.log(`[GAME] Partie réinitialisée dans le salon ${roomCode}`);
        }
    });
    socket.on('passTurn', () => {
        const roomCode = socket.roomCode;
        if (!roomCode || !games[roomCode])
            return;
        const game = games[roomCode];
        const success = game.passTurn(socket.id);
        if (success) {
            io.to(roomCode).emit('gameStateUpdate', game.getState());
            console.log(`[GAME] Tour passé par ${socket.username}`);
        }
        else {
            socket.emit('error', 'Impossible de passer votre tour (vous devez d\'abord lancer les dés).');
        }
    });
    socket.on('closeLobby', () => {
        const roomCode = socket.roomCode;
        if (!roomCode || !games[roomCode])
            return;
        console.log(`[LOBBY] Le salon ${roomCode} a été fermé par ${socket.username}`);
        io.to(roomCode).emit('lobbyClosed');
        delete games[roomCode];
    });
    // ─── UNO event handlers ────────────────────────────────────────────────────
    socket.on('uno:startGame', () => {
        const roomCode = socket.roomCode;
        if (!roomCode || !unoGames[roomCode])
            return;
        const game = unoGames[roomCode];
        const success = game.startGame();
        if (success) {
            io.to(roomCode).emit('unoStateUpdate', game.getState());
            console.log(`[UNO] Partie démarrée dans le salon ${roomCode}`);
        }
        else {
            socket.emit('error', 'Impossible de démarrer la partie UNO (minimum 2 joueurs requis).');
        }
    });
    socket.on('uno:playCard', ({ cardId, chosenColor }) => {
        const roomCode = socket.roomCode;
        if (!roomCode || !unoGames[roomCode])
            return;
        const game = unoGames[roomCode];
        const result = game.playCard(socket.id, cardId, chosenColor);
        if (result.success) {
            io.to(roomCode).emit('unoStateUpdate', game.getState());
        }
        else {
            socket.emit('error', result.error ?? 'Impossible de jouer cette carte.');
        }
    });
    socket.on('uno:drawCard', () => {
        const roomCode = socket.roomCode;
        if (!roomCode || !unoGames[roomCode])
            return;
        const game = unoGames[roomCode];
        const result = game.drawCard(socket.id);
        if (result.success) {
            io.to(roomCode).emit('unoStateUpdate', game.getState());
        }
        else {
            socket.emit('error', result.error ?? 'Impossible de piocher.');
        }
    });
    socket.on('uno:sayUno', () => {
        const roomCode = socket.roomCode;
        if (!roomCode || !unoGames[roomCode])
            return;
        const game = unoGames[roomCode];
        game.sayUno(socket.id);
        io.to(roomCode).emit('unoStateUpdate', game.getState());
    });
    socket.on('uno:challengeUno', ({ targetId }) => {
        const roomCode = socket.roomCode;
        if (!roomCode || !unoGames[roomCode])
            return;
        const game = unoGames[roomCode];
        const result = game.challengeUno(socket.id, targetId);
        if (result.success) {
            io.to(roomCode).emit('unoStateUpdate', game.getState());
        }
        else {
            socket.emit('error', result.error ?? 'Défi invalide.');
        }
    });
    socket.on('uno:resetGame', () => {
        const roomCode = socket.roomCode;
        if (!roomCode || !unoGames[roomCode])
            return;
        const game = unoGames[roomCode];
        game.resetGame();
        io.to(roomCode).emit('unoStateUpdate', game.getState());
        console.log(`[UNO] Partie réinitialisée dans le salon ${roomCode}`);
    });
    // ─── Chaos Board handlers ──────────────────────────────────────────────────
    socket.on('chaos:startGame', () => {
        const roomCode = socket.roomCode;
        if (!roomCode || !chaosGames[roomCode])
            return;
        const game = chaosGames[roomCode];
        if (game.startGame()) {
            io.to(roomCode).emit('chaosStateUpdate', game.getState());
            console.log(`[CHAOS] Partie démarrée dans ${roomCode}`);
        }
    });
    socket.on('chaos:move', ({ targetCellId }) => {
        const roomCode = socket.roomCode;
        if (!roomCode || !chaosGames[roomCode])
            return;
        const game = chaosGames[roomCode];
        if (game.movePlayer(socket.id, targetCellId)) {
            io.to(roomCode).emit('chaosStateUpdate', game.getState());
            const duel = game.getState().activeDuel;
            if (duel) {
                setTimeout(() => {
                    if (game.getState().activeDuel?.id === duel.id) {
                        if (game.resolveDuel()) {
                            io.to(roomCode).emit('chaosStateUpdate', game.getState());
                        }
                    }
                }, 4500);
            }
        }
    });
    socket.on('chaos:resolveDuel', () => {
        const roomCode = socket.roomCode;
        if (!roomCode || !chaosGames[roomCode])
            return;
        const game = chaosGames[roomCode];
        if (game.resolveDuel()) {
            io.to(roomCode).emit('chaosStateUpdate', game.getState());
        }
    });
    socket.on('chaos:draftRule', async ({ ruleText }) => {
        const roomCode = socket.roomCode;
        if (!roomCode || !chaosGames[roomCode])
            return;
        const game = chaosGames[roomCode];
        game.getState().isAiGenerating = true;
        io.to(roomCode).emit('chaosStateUpdate', game.getState());
        await game.submitNewRule(socket.id, ruleText, () => {
            io.to(roomCode).emit('chaosStateUpdate', game.getState());
        });
        io.to(roomCode).emit('chaosStateUpdate', game.getState());
    });
    socket.on('chaos:resetGame', () => {
        const roomCode = socket.roomCode;
        if (!roomCode || !chaosGames[roomCode])
            return;
        const game = chaosGames[roomCode];
        game.resetGame();
        io.to(roomCode).emit('chaosStateUpdate', game.getState());
    });
    // ─── Love Letter handlers ──────────────────────────────────────────────────
    socket.on('loveletter:startGame', () => {
        const roomCode = socket.roomCode;
        if (!roomCode || !loveLetterGames[roomCode])
            return;
        const game = loveLetterGames[roomCode];
        if (game.startGame()) {
            io.to(roomCode).emit('loveletterStateUpdate', game.getState());
            console.log(`[LOVELETTER] Partie démarrée dans ${roomCode}`);
        }
    });
    socket.on('loveletter:playCard', ({ cardId, targetPlayerId, guessedCardType }) => {
        const roomCode = socket.roomCode;
        if (!roomCode || !loveLetterGames[roomCode])
            return;
        const game = loveLetterGames[roomCode];
        if (game.playCard(socket.id, cardId, targetPlayerId, guessedCardType)) {
            io.to(roomCode).emit('loveletterStateUpdate', game.getState());
        }
    });
    socket.on('loveletter:nextRound', () => {
        const roomCode = socket.roomCode;
        if (!roomCode || !loveLetterGames[roomCode])
            return;
        const game = loveLetterGames[roomCode];
        if (game.nextRound()) {
            io.to(roomCode).emit('loveletterStateUpdate', game.getState());
        }
    });
    socket.on('loveletter:resetGame', () => {
        const roomCode = socket.roomCode;
        if (!roomCode || !loveLetterGames[roomCode])
            return;
        const game = loveLetterGames[roomCode];
        game.resetGame();
        io.to(roomCode).emit('loveletterStateUpdate', game.getState());
    });
    // ─── Discretos handlers ────────────────────────────────────────────────────
    socket.on('discretos:startGame', () => {
        const roomCode = socket.roomCode;
        if (!roomCode || !discretosGames[roomCode])
            return;
        const game = discretosGames[roomCode];
        if (game.startGame()) {
            io.to(roomCode).emit('discretosStateUpdate', game.getState());
            console.log(`[DISCRETOS] Partie démarrée dans ${roomCode}`);
        }
    });
    socket.on('discretos:submitClue', ({ clueText }) => {
        const roomCode = socket.roomCode;
        if (!roomCode || !discretosGames[roomCode])
            return;
        const game = discretosGames[roomCode];
        if (game.submitClue(socket.id, clueText)) {
            io.to(roomCode).emit('discretosStateUpdate', game.getState());
        }
    });
    socket.on('discretos:accusePlayer', ({ targetId }) => {
        const roomCode = socket.roomCode;
        if (!roomCode || !discretosGames[roomCode])
            return;
        const game = discretosGames[roomCode];
        if (game.accusePlayer(socket.id, targetId)) {
            io.to(roomCode).emit('discretosStateUpdate', game.getState());
        }
    });
    socket.on('discretos:resetGame', () => {
        const roomCode = socket.roomCode;
        if (!roomCode || !discretosGames[roomCode])
            return;
        const game = discretosGames[roomCode];
        game.resetGame();
        io.to(roomCode).emit('discretosStateUpdate', game.getState());
    });
    // ─── Skyjo handlers ────────────────────────────────────────────────────────
    socket.on('skyjo:startGame', () => {
        const roomCode = socket.roomCode;
        if (!roomCode || !skyjoGames[roomCode])
            return;
        const game = skyjoGames[roomCode];
        if (game.startGame()) {
            io.to(roomCode).emit('skyjoStateUpdate', game.getState());
            console.log(`[SKYJO] Partie démarrée dans ${roomCode}`);
        }
    });
    socket.on('skyjo:revealCardInitial', ({ row, col }) => {
        const roomCode = socket.roomCode;
        if (!roomCode || !skyjoGames[roomCode])
            return;
        const game = skyjoGames[roomCode];
        if (game.revealCardInitial(socket.id, row, col)) {
            io.to(roomCode).emit('skyjoStateUpdate', game.getState());
        }
    });
    socket.on('skyjo:drawFromDrawPile', () => {
        const roomCode = socket.roomCode;
        if (!roomCode || !skyjoGames[roomCode])
            return;
        const game = skyjoGames[roomCode];
        if (game.drawFromDrawPile(socket.id)) {
            io.to(roomCode).emit('skyjoStateUpdate', game.getState());
        }
    });
    socket.on('skyjo:drawFromDiscardPile', () => {
        const roomCode = socket.roomCode;
        if (!roomCode || !skyjoGames[roomCode])
            return;
        const game = skyjoGames[roomCode];
        if (game.drawFromDiscardPile(socket.id)) {
            io.to(roomCode).emit('skyjoStateUpdate', game.getState());
        }
    });
    socket.on('skyjo:swapDrawnCard', ({ row, col }) => {
        const roomCode = socket.roomCode;
        if (!roomCode || !skyjoGames[roomCode])
            return;
        const game = skyjoGames[roomCode];
        if (game.swapDrawnCard(socket.id, row, col)) {
            io.to(roomCode).emit('skyjoStateUpdate', game.getState());
        }
    });
    socket.on('skyjo:discardDrawnCard', () => {
        const roomCode = socket.roomCode;
        if (!roomCode || !skyjoGames[roomCode])
            return;
        const game = skyjoGames[roomCode];
        if (game.discardDrawnCard(socket.id)) {
            io.to(roomCode).emit('skyjoStateUpdate', game.getState());
        }
    });
    socket.on('skyjo:revealCard', ({ row, col }) => {
        const roomCode = socket.roomCode;
        if (!roomCode || !skyjoGames[roomCode])
            return;
        const game = skyjoGames[roomCode];
        if (game.revealCard(socket.id, row, col)) {
            io.to(roomCode).emit('skyjoStateUpdate', game.getState());
        }
    });
    socket.on('skyjo:nextRound', () => {
        const roomCode = socket.roomCode;
        if (!roomCode || !skyjoGames[roomCode])
            return;
        const game = skyjoGames[roomCode];
        if (game.nextRound()) {
            io.to(roomCode).emit('skyjoStateUpdate', game.getState());
        }
    });
    socket.on('skyjo:resetGame', () => {
        const roomCode = socket.roomCode;
        if (!roomCode || !skyjoGames[roomCode])
            return;
        const game = skyjoGames[roomCode];
        game.resetGame();
        io.to(roomCode).emit('skyjoStateUpdate', game.getState());
    });
    // ─── King of Tokyo handlers ────────────────────────────────────────────────
    socket.on('king:startGame', () => {
        const roomCode = socket.roomCode;
        if (!roomCode || !kingOfTokyoGames[roomCode])
            return;
        const game = kingOfTokyoGames[roomCode];
        if (game.startGame()) {
            io.to(roomCode).emit('kingStateUpdate', game.getState());
            console.log(`[KING] Partie démarrée dans ${roomCode}`);
        }
    });
    socket.on('king:toggleKeep', ({ index }) => {
        const roomCode = socket.roomCode;
        if (!roomCode || !kingOfTokyoGames[roomCode])
            return;
        const game = kingOfTokyoGames[roomCode];
        if (game.toggleKeep(socket.id, index)) {
            io.to(roomCode).emit('kingStateUpdate', game.getState());
        }
    });
    socket.on('king:rollDice', () => {
        const roomCode = socket.roomCode;
        if (!roomCode || !kingOfTokyoGames[roomCode])
            return;
        const game = kingOfTokyoGames[roomCode];
        if (game.rollDice(socket.id)) {
            io.to(roomCode).emit('kingStateUpdate', game.getState());
        }
    });
    socket.on('king:resolveDice', () => {
        const roomCode = socket.roomCode;
        if (!roomCode || !kingOfTokyoGames[roomCode])
            return;
        const game = kingOfTokyoGames[roomCode];
        if (game.resolveDice(socket.id)) {
            io.to(roomCode).emit('kingStateUpdate', game.getState());
        }
    });
    socket.on('king:respondYield', ({ yieldTokyo }) => {
        const roomCode = socket.roomCode;
        if (!roomCode || !kingOfTokyoGames[roomCode])
            return;
        const game = kingOfTokyoGames[roomCode];
        if (game.respondYield(socket.id, yieldTokyo)) {
            io.to(roomCode).emit('kingStateUpdate', game.getState());
        }
    });
    socket.on('king:buyCard', ({ cardId }) => {
        const roomCode = socket.roomCode;
        if (!roomCode || !kingOfTokyoGames[roomCode])
            return;
        const game = kingOfTokyoGames[roomCode];
        if (game.buyCard(socket.id, cardId)) {
            io.to(roomCode).emit('kingStateUpdate', game.getState());
        }
    });
    socket.on('king:endTurn', () => {
        const roomCode = socket.roomCode;
        if (!roomCode || !kingOfTokyoGames[roomCode])
            return;
        const game = kingOfTokyoGames[roomCode];
        if (game.endTurn(socket.id)) {
            io.to(roomCode).emit('kingStateUpdate', game.getState());
        }
    });
    socket.on('king:resetGame', () => {
        const roomCode = socket.roomCode;
        if (!roomCode || !kingOfTokyoGames[roomCode])
            return;
        const game = kingOfTokyoGames[roomCode];
        game.resetGame();
        io.to(roomCode).emit('kingStateUpdate', game.getState());
    });
    // ─── Dungeon Mayhem Sockets ──────────────────────────────────────────────────
    socket.on('mayhem:selectCharacter', ({ characterClass }) => {
        const roomCode = socket.roomCode;
        if (!roomCode || !mayhemGames[roomCode])
            return;
        const game = mayhemGames[roomCode];
        if (game.selectCharacter(socket.id, characterClass)) {
            io.to(roomCode).emit('mayhemStateUpdate', game.getState());
        }
    });
    socket.on('mayhem:startGame', () => {
        const roomCode = socket.roomCode;
        if (!roomCode || !mayhemGames[roomCode])
            return;
        const game = mayhemGames[roomCode];
        if (game.startGame()) {
            io.to(roomCode).emit('mayhemStateUpdate', game.getState());
        }
    });
    socket.on('mayhem:playCard', ({ cardId, targetPlayerId, targetShieldId }) => {
        const roomCode = socket.roomCode;
        if (!roomCode || !mayhemGames[roomCode])
            return;
        const game = mayhemGames[roomCode];
        if (game.playCard(socket.id, cardId, targetPlayerId, targetShieldId)) {
            io.to(roomCode).emit('mayhemStateUpdate', game.getState());
        }
    });
    socket.on('mayhem:endTurn', () => {
        const roomCode = socket.roomCode;
        if (!roomCode || !mayhemGames[roomCode])
            return;
        const game = mayhemGames[roomCode];
        if (game.endTurn(socket.id)) {
            io.to(roomCode).emit('mayhemStateUpdate', game.getState());
        }
    });
    socket.on('mayhem:resetGame', () => {
        const roomCode = socket.roomCode;
        if (!roomCode || !mayhemGames[roomCode])
            return;
        const game = mayhemGames[roomCode];
        game.resetGame();
        io.to(roomCode).emit('mayhemStateUpdate', game.getState());
    });
    // ─── CLASH OF REALMS ───────────────────────────────────────────────────────
    socket.on('clash:startGame', () => {
        const roomCode = socket.roomCode;
        if (!roomCode || !clashGames[roomCode])
            return;
        const game = clashGames[roomCode];
        if (game.startGame()) {
            game.startLoop((state) => {
                io.to(roomCode).emit('clashStateUpdate', state);
            });
            io.to(roomCode).emit('clashStateUpdate', game.getState());
        }
    });
    socket.on('clash:addBot', () => {
        const roomCode = socket.roomCode;
        if (!roomCode || !clashGames[roomCode])
            return;
        const game = clashGames[roomCode];
        if (game.addBot()) {
            io.to(roomCode).emit('clashStateUpdate', game.getState());
        }
    });
    socket.on('clash:playCard', ({ cardId, x, y }) => {
        const roomCode = socket.roomCode;
        if (!roomCode || !clashGames[roomCode])
            return;
        const game = clashGames[roomCode];
        if (game.playCard(socket.id, cardId, x, y)) {
            io.to(roomCode).emit('clashStateUpdate', game.getState());
        }
    });
    socket.on('clash:resetGame', () => {
        const roomCode = socket.roomCode;
        if (!roomCode || !clashGames[roomCode])
            return;
        const game = clashGames[roomCode];
        game.resetGame();
        io.to(roomCode).emit('clashStateUpdate', game.getState());
    });
    // ─── Sumo Smash Listeners ──────────────────────────────────────────────────
    socket.on('sumo:push', ({ key }) => {
        const roomCode = socket.roomCode;
        if (!roomCode || !sumoGames[roomCode])
            return;
        const game = sumoGames[roomCode];
        game.handlePush(socket.id, key);
    });
    socket.on('sumo:startGame', () => {
        const roomCode = socket.roomCode;
        if (!roomCode || !sumoGames[roomCode])
            return;
        const game = sumoGames[roomCode];
        game.startGame();
    });
    socket.on('sumo:resetMatch', () => {
        const roomCode = socket.roomCode;
        if (!roomCode || !sumoGames[roomCode])
            return;
        const game = sumoGames[roomCode];
        game.resetMatch();
    });
    // ─── RTS (Nexus Wars) Listeners ────────────────────────────────────────────
    socket.on('rts:selectFaction', ({ faction }) => {
        const roomCode = socket.roomCode;
        if (!roomCode || !rtsGames[roomCode])
            return;
        const game = rtsGames[roomCode];
        if (game.selectFaction(socket.id, faction)) {
            io.to(roomCode).emit('rtsStateUpdate', game.getState());
        }
    });
    socket.on('rts:startGame', () => {
        const roomCode = socket.roomCode;
        if (!roomCode || !rtsGames[roomCode])
            return;
        const game = rtsGames[roomCode];
        if (game.startGame()) {
            io.to(roomCode).emit('rtsStateUpdate', game.getState());
        }
    });
    socket.on('rts:addBot', () => {
        const roomCode = socket.roomCode;
        if (!roomCode || !rtsGames[roomCode])
            return;
        const game = rtsGames[roomCode];
        if (game.addBot()) {
            io.to(roomCode).emit('rtsStateUpdate', game.getState());
        }
    });
    socket.on('rts:order', ({ unitIds, orderType, targetX, targetY, targetId }) => {
        const roomCode = socket.roomCode;
        if (!roomCode || !rtsGames[roomCode])
            return;
        const game = rtsGames[roomCode];
        game.handleOrder(socket.id, unitIds, orderType, targetX, targetY, targetId);
    });
    socket.on('rts:build', ({ buildingType, x, y }) => {
        const roomCode = socket.roomCode;
        if (!roomCode || !rtsGames[roomCode])
            return;
        const game = rtsGames[roomCode];
        if (game.handleBuild(socket.id, buildingType, x, y)) {
            io.to(roomCode).emit('rtsStateUpdate', game.getState());
        }
    });
    socket.on('rts:produce', ({ buildingId, unitType }) => {
        const roomCode = socket.roomCode;
        if (!roomCode || !rtsGames[roomCode])
            return;
        const game = rtsGames[roomCode];
        if (game.handleProduceUnit(socket.id, buildingId, unitType)) {
            io.to(roomCode).emit('rtsStateUpdate', game.getState());
        }
    });
    socket.on('rts:upgrade', ({ buildingId }) => {
        const roomCode = socket.roomCode;
        if (!roomCode || !rtsGames[roomCode])
            return;
        const game = rtsGames[roomCode];
        if (game.handleUpgradePlant(socket.id, buildingId)) {
            io.to(roomCode).emit('rtsStateUpdate', game.getState());
        }
    });
    socket.on('rts:research', ({ techId }) => {
        const roomCode = socket.roomCode;
        if (!roomCode || !rtsGames[roomCode])
            return;
        const game = rtsGames[roomCode];
        if (game.handleResearch(socket.id, techId)) {
            io.to(roomCode).emit('rtsStateUpdate', game.getState());
        }
    });
    socket.on('rts:ability', ({ targetX, targetY }) => {
        const roomCode = socket.roomCode;
        if (!roomCode || !rtsGames[roomCode])
            return;
        const game = rtsGames[roomCode];
        if (game.handleActivateUltimate(socket.id, targetX, targetY)) {
            io.to(roomCode).emit('rtsStateUpdate', game.getState());
        }
    });
    socket.on('rts:resetGame', () => {
        const roomCode = socket.roomCode;
        if (!roomCode || !rtsGames[roomCode])
            return;
        const game = rtsGames[roomCode];
        game.resetGame();
        io.to(roomCode).emit('rtsStateUpdate', game.getState());
    });
    // ─── MOBA Handlers ───────────────────────────────────────────────────────
    socket.on('moba:selectChampion', ({ championId }) => {
        const roomCode = socket.roomCode;
        if (!roomCode || !mobaGames[roomCode])
            return;
        const game = mobaGames[roomCode];
        game.selectChampion(socket.id, championId);
        io.to(roomCode).emit('mobaStateUpdate', game.getState());
    });
    socket.on('moba:switchTeam', () => {
        const roomCode = socket.roomCode;
        if (!roomCode || !mobaGames[roomCode])
            return;
        const game = mobaGames[roomCode];
        game.switchTeam(socket.id);
        io.to(roomCode).emit('mobaStateUpdate', game.getState());
    });
    socket.on('moba:addBot', ({ team, championId } = {}) => {
        const roomCode = socket.roomCode;
        if (!roomCode || !mobaGames[roomCode])
            return;
        const game = mobaGames[roomCode];
        game.addBot(team, championId);
        io.to(roomCode).emit('mobaStateUpdate', game.getState());
    });
    socket.on('moba:startGame', () => {
        const roomCode = socket.roomCode;
        if (!roomCode || !mobaGames[roomCode])
            return;
        const game = mobaGames[roomCode];
        game.startGame();
        io.to(roomCode).emit('mobaStateUpdate', game.getState());
    });
    socket.on('moba:move', ({ targetX, targetY }) => {
        const roomCode = socket.roomCode;
        if (!roomCode || !mobaGames[roomCode])
            return;
        mobaGames[roomCode].handleMove(socket.id, targetX, targetY);
    });
    socket.on('moba:inputVelocity', ({ vx, vy }) => {
        const roomCode = socket.roomCode;
        if (!roomCode || !mobaGames[roomCode])
            return;
        mobaGames[roomCode].handleInputVelocity(socket.id, vx, vy);
    });
    socket.on('moba:attack', ({ targetId }) => {
        const roomCode = socket.roomCode;
        if (!roomCode || !mobaGames[roomCode])
            return;
        mobaGames[roomCode].handleAttack(socket.id, targetId);
    });
    socket.on('moba:castSpell', ({ spellKey, mouseX, mouseY, targetId }) => {
        const roomCode = socket.roomCode;
        if (!roomCode || !mobaGames[roomCode])
            return;
        mobaGames[roomCode].handleCastSpell(socket.id, spellKey, mouseX, mouseY, targetId);
    });
    socket.on('moba:summonerSpell', ({ key, mouseX, mouseY }) => {
        const roomCode = socket.roomCode;
        if (!roomCode || !mobaGames[roomCode])
            return;
        mobaGames[roomCode].handleSummonerSpell(socket.id, key, mouseX, mouseY);
    });
    socket.on('moba:recall', () => {
        const roomCode = socket.roomCode;
        if (!roomCode || !mobaGames[roomCode])
            return;
        mobaGames[roomCode].handleRecall(socket.id);
    });
    socket.on('moba:upgradeSpell', ({ spellKey }) => {
        const roomCode = socket.roomCode;
        if (!roomCode || !mobaGames[roomCode])
            return;
        const game = mobaGames[roomCode];
        game.handleUpgradeSpell(socket.id, spellKey);
        io.to(roomCode).emit('mobaStateUpdate', game.getState());
    });
    socket.on('moba:buyItem', ({ itemId }) => {
        const roomCode = socket.roomCode;
        if (!roomCode || !mobaGames[roomCode])
            return;
        const game = mobaGames[roomCode];
        game.handleBuyItem(socket.id, itemId);
        io.to(roomCode).emit('mobaStateUpdate', game.getState());
    });
    socket.on('moba:sellItem', ({ itemIndex }) => {
        const roomCode = socket.roomCode;
        if (!roomCode || !mobaGames[roomCode])
            return;
        const game = mobaGames[roomCode];
        game.handleSellItem(socket.id, itemIndex);
        io.to(roomCode).emit('mobaStateUpdate', game.getState());
    });
    // ─── LE JEU DE LA NOTE ───────────────────────────────────────────────────
    socket.on('note:startGame', () => {
        const roomCode = socket.roomCode;
        if (!roomCode || !noteGames[roomCode])
            return;
        const game = noteGames[roomCode];
        if (game.startGame()) {
            broadcastNoteState(roomCode, game);
            console.log(`[NOTE] Partie lancée dans ${roomCode}`);
        }
    });
    socket.on('note:addBot', () => {
        const roomCode = socket.roomCode;
        if (!roomCode || !noteGames[roomCode])
            return;
        const game = noteGames[roomCode];
        if (game.addBot()) {
            broadcastNoteState(roomCode, game);
        }
    });
    socket.on('note:removeBot', ({ botId }) => {
        const roomCode = socket.roomCode;
        if (!roomCode || !noteGames[roomCode])
            return;
        const game = noteGames[roomCode];
        game.removeBot(botId);
        broadcastNoteState(roomCode, game);
    });
    socket.on('note:chooseQuestion', ({ question }) => {
        const roomCode = socket.roomCode;
        if (!roomCode || !noteGames[roomCode])
            return;
        const game = noteGames[roomCode];
        if (game.chooseQuestion(socket.id, question)) {
            broadcastNoteState(roomCode, game);
            // Interval to update UI as bots respond
            let ticks = 0;
            const interval = setInterval(() => {
                if (!noteGames[roomCode]) {
                    clearInterval(interval);
                    return;
                }
                broadcastNoteState(roomCode, game);
                ticks++;
                if (game.getState().phase !== 'ANSWERING' || ticks > 10) {
                    clearInterval(interval);
                }
            }, 700);
        }
        else {
            socket.emit('error', 'Cette question a déjà été posée dans cette partie ! Veuillez en poser une autre.');
        }
    });
    socket.on('note:submitAnswer', ({ text }) => {
        const roomCode = socket.roomCode;
        if (!roomCode || !noteGames[roomCode])
            return;
        const game = noteGames[roomCode];
        if (game.submitAnswer(socket.id, text)) {
            broadcastNoteState(roomCode, game);
            // In case bot was active and auto guesses
            let ticks = 0;
            const interval = setInterval(() => {
                if (!noteGames[roomCode]) {
                    clearInterval(interval);
                    return;
                }
                broadcastNoteState(roomCode, game);
                ticks++;
                if (game.getState().phase !== 'GUESSING' || ticks > 8) {
                    clearInterval(interval);
                }
            }, 700);
        }
    });
    socket.on('note:forceGuessing', () => {
        const roomCode = socket.roomCode;
        if (!roomCode || !noteGames[roomCode])
            return;
        const game = noteGames[roomCode];
        if (game.forceGuessingPhase(socket.id)) {
            broadcastNoteState(roomCode, game);
        }
    });
    socket.on('note:submitGuess', ({ guess }) => {
        const roomCode = socket.roomCode;
        if (!roomCode || !noteGames[roomCode])
            return;
        const game = noteGames[roomCode];
        if (game.submitGuess(socket.id, guess)) {
            broadcastNoteState(roomCode, game);
        }
    });
    socket.on('note:nextTurn', () => {
        const roomCode = socket.roomCode;
        if (!roomCode || !noteGames[roomCode])
            return;
        const game = noteGames[roomCode];
        if (game.nextTurn()) {
            broadcastNoteState(roomCode, game);
        }
    });
    socket.on('note:resetGame', () => {
        const roomCode = socket.roomCode;
        if (!roomCode || !noteGames[roomCode])
            return;
        const game = noteGames[roomCode];
        game.resetGame();
        broadcastNoteState(roomCode, game);
    });
    // ─── Prop Hunt 3D (Hide & Seek) Event Listeners ───────────────────────────
    socket.on('prophunt:voteMap', ({ mapId }) => {
        const roomCode = socket.roomCode;
        if (!roomCode || !prophuntGames[roomCode])
            return;
        prophuntGames[roomCode].voteMap(socket.id, mapId);
    });
    socket.on('prophunt:startGame', () => {
        const roomCode = socket.roomCode;
        if (!roomCode || !prophuntGames[roomCode])
            return;
        const res = prophuntGames[roomCode].startGame(socket.id);
        if (!res.success && res.error) {
            socket.emit('error', res.error);
        }
    });
    socket.on('prophunt:playerMove', ({ position, rotation }) => {
        const roomCode = socket.roomCode;
        if (!roomCode || !prophuntGames[roomCode])
            return;
        const accepted = prophuntGames[roomCode].updatePlayerMovement(socket.id, position, rotation);
        if (accepted) {
            socket.to(roomCode).emit('prophunt:playerMoved', { id: socket.id, position, rotation });
        }
    });
    socket.on('prophunt:dash', () => {
        const roomCode = socket.roomCode;
        if (!roomCode || !prophuntGames[roomCode])
            return;
        const res = prophuntGames[roomCode].dash(socket.id);
        if (!res.success && res.cooldownRemaining) {
            socket.emit('prophunt:dashCooldown', res.cooldownRemaining);
        }
    });
    socket.on('prophunt:changeProp', () => {
        const roomCode = socket.roomCode;
        if (!roomCode || !prophuntGames[roomCode])
            return;
        const res = prophuntGames[roomCode].changeProp(socket.id);
        if (!res.success && res.cooldownRemaining) {
            socket.emit('prophunt:changePropCooldown', res.cooldownRemaining);
        }
    });
    socket.on('prophunt:freeze', () => {
        const roomCode = socket.roomCode;
        if (!roomCode || !prophuntGames[roomCode])
            return;
        prophuntGames[roomCode].toggleFreeze(socket.id);
    });
    socket.on('prophunt:taunt', () => {
        const roomCode = socket.roomCode;
        if (!roomCode || !prophuntGames[roomCode])
            return;
        prophuntGames[roomCode].triggerManualTaunt(socket.id);
    });
    socket.on('prophunt:shoot', ({ hitPlayerId }) => {
        const roomCode = socket.roomCode;
        if (!roomCode || !prophuntGames[roomCode])
            return;
        const result = prophuntGames[roomCode].hunterShoot(socket.id, hitPlayerId);
        socket.emit('prophunt:shootResult', result);
    });
    socket.on('prophunt:resetGame', () => {
        const roomCode = socket.roomCode;
        if (!roomCode || !prophuntGames[roomCode])
            return;
        prophuntGames[roomCode].resetGame();
    });
    // ─── HELL GAMBLE / CASE CLASH EVENT HANDLERS ──────────────────────────────
    socket.on('hellgamble:openCase', ({ caseId, count }) => {
        const roomCode = socket.roomCode;
        if (!roomCode || !hellgambleGames[roomCode])
            return;
        const result = hellgambleGames[roomCode].openCase(socket.id, caseId, count || 1);
        socket.emit('hellgamble:openCaseResult', result);
    });
    socket.on('hellgamble:sellItem', ({ itemId }) => {
        const roomCode = socket.roomCode;
        if (!roomCode || !hellgambleGames[roomCode])
            return;
        const result = hellgambleGames[roomCode].sellItem(socket.id, itemId);
        socket.emit('hellgamble:sellItemResult', result);
    });
    socket.on('hellgamble:sellAll', ({ maxPrice }) => {
        const roomCode = socket.roomCode;
        if (!roomCode || !hellgambleGames[roomCode])
            return;
        const result = hellgambleGames[roomCode].sellAll(socket.id, maxPrice);
        socket.emit('hellgamble:sellAllResult', result);
    });
    socket.on('hellgamble:claimBankrupt', () => {
        const roomCode = socket.roomCode;
        if (!roomCode || !hellgambleGames[roomCode])
            return;
        const result = hellgambleGames[roomCode].claimBankruptBonus(socket.id);
        socket.emit('hellgamble:claimBankruptResult', result);
    });
    socket.on('hellgamble:createBattle', ({ caseIds, maxPlayers }) => {
        const roomCode = socket.roomCode;
        if (!roomCode || !hellgambleGames[roomCode])
            return;
        const result = hellgambleGames[roomCode].createBattle(socket.id, caseIds, maxPlayers);
        socket.emit('hellgamble:createBattleResult', result);
    });
    socket.on('hellgamble:joinBattle', ({ battleId }) => {
        const roomCode = socket.roomCode;
        if (!roomCode || !hellgambleGames[roomCode])
            return;
        const result = hellgambleGames[roomCode].joinBattle(socket.id, battleId);
        socket.emit('hellgamble:joinBattleResult', result);
    });
    socket.on('hellgamble:leaveBattle', ({ battleId }) => {
        const roomCode = socket.roomCode;
        if (!roomCode || !hellgambleGames[roomCode])
            return;
        const result = hellgambleGames[roomCode].leaveBattle(socket.id, battleId);
        socket.emit('hellgamble:leaveBattleResult', result);
    });
    socket.on('hellgamble:startBattle', ({ battleId }) => {
        const roomCode = socket.roomCode;
        if (!roomCode || !hellgambleGames[roomCode])
            return;
        const result = hellgambleGames[roomCode].startBattle(socket.id, battleId);
        if (result.success && result.battleResults) {
            io.to(roomCode).emit('hellgamble:battleStarted', { battleId, battleResults: result.battleResults });
        }
        else {
            socket.emit('error', result.error || 'Erreur au démarrage de la battle.');
        }
    });
    socket.on('hellgamble:upgrade', ({ wagerItemIds, cashWager, targetSkinId }) => {
        const roomCode = socket.roomCode;
        if (!roomCode || !hellgambleGames[roomCode])
            return;
        const result = hellgambleGames[roomCode].upgrade(socket.id, wagerItemIds, cashWager, targetSkinId);
        socket.emit('hellgamble:upgradeResult', result);
    });
    socket.on('hellgamble:tradeUp', ({ itemIds }) => {
        const roomCode = socket.roomCode;
        if (!roomCode || !hellgambleGames[roomCode])
            return;
        const result = hellgambleGames[roomCode].tradeUp(socket.id, itemIds);
        socket.emit('hellgamble:tradeUpResult', result);
    });
    // ===================== RACING EVENTS =====================
    socket.on('racing:startDrawing', () => {
        const roomCode = socket.roomCode;
        const game = racingGames[roomCode];
        if (!game)
            return;
        if (game.getState().hostId !== socket.id)
            return;
        game.startDrawing();
        io.to(roomCode).emit('racingStateUpdate', game.getState());
    });
    socket.on('racing:setTrack', ({ points, laps }) => {
        const roomCode = socket.roomCode;
        const game = racingGames[roomCode];
        if (!game)
            return;
        if (game.getState().hostId !== socket.id)
            return; // only host can set track
        game.setTrack(points, laps);
        io.to(roomCode).emit('racingStateUpdate', game.getState());
    });
    socket.on('racing:selectVehicle', ({ vehicle }) => {
        const roomCode = socket.roomCode;
        const game = racingGames[roomCode];
        if (!game)
            return;
        game.selectVehicle(socket.id, vehicle);
        io.to(roomCode).emit('racingStateUpdate', game.getState());
    });
    socket.on('racing:startRace', () => {
        const roomCode = socket.roomCode;
        const game = racingGames[roomCode];
        if (!game)
            return;
        if (game.getState().hostId !== socket.id)
            return;
        game.startRace();
        io.to(roomCode).emit('racingStateUpdate', game.getState());
    });
    socket.on('racing:input', ({ throttle, steer }) => {
        const roomCode = socket.roomCode;
        const game = racingGames[roomCode];
        if (!game)
            return;
        game.setInput(socket.id, throttle, steer);
    });
    socket.on('racing:reset', () => {
        const roomCode = socket.roomCode;
        const game = racingGames[roomCode];
        if (!game)
            return;
        if (game.getState().hostId !== socket.id)
            return;
        game.resetToLobby();
        io.to(roomCode).emit('racingStateUpdate', game.getState());
    });
    // ─── Disconnect ────────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
        const roomCode = socket.roomCode;
        const username = socket.username;
        const gameType = socket.gameType;
        if (gameType === 'uno' && roomCode && unoGames[roomCode]) {
            const game = unoGames[roomCode];
            game.removePlayer(socket.id);
            io.to(roomCode).emit('unoStateUpdate', game.getState());
            console.log(`[UNO] Déconnexion de ${username} du salon ${roomCode}`);
            if (game.getPlayers().length === 0) {
                delete unoGames[roomCode];
            }
        }
        else if (gameType === 'loveletter' && roomCode && loveLetterGames[roomCode]) {
            const game = loveLetterGames[roomCode];
            game.removePlayer(socket.id);
            io.to(roomCode).emit('loveletterStateUpdate', game.getState());
            console.log(`[LOVELETTER] Déconnexion de ${username} du salon ${roomCode}`);
            if (game.getPlayers().length === 0) {
                delete loveLetterGames[roomCode];
            }
        }
        else if (gameType === 'discretos' && roomCode && discretosGames[roomCode]) {
            const game = discretosGames[roomCode];
            game.removePlayer(socket.id);
            io.to(roomCode).emit('discretosStateUpdate', game.getState());
            console.log(`[DISCRETOS] Déconnexion de ${username} du salon ${roomCode}`);
            if (game.getPlayers().length === 0) {
                game.destroy();
                delete discretosGames[roomCode];
            }
        }
        else if (gameType === 'skyjo' && roomCode && skyjoGames[roomCode]) {
            const game = skyjoGames[roomCode];
            game.removePlayer(socket.id);
            io.to(roomCode).emit('skyjoStateUpdate', game.getState());
            console.log(`[SKYJO] Déconnexion de ${username} du salon ${roomCode}`);
            if (game.getPlayers().length === 0) {
                delete skyjoGames[roomCode];
            }
        }
        else if (gameType === 'kingoftokyo' && roomCode && kingOfTokyoGames[roomCode]) {
            const game = kingOfTokyoGames[roomCode];
            game.removePlayer(socket.id);
            io.to(roomCode).emit('kingStateUpdate', game.getState());
            console.log(`[KING] Déconnexion de ${username} du salon ${roomCode}`);
            if (game.getPlayers().length === 0) {
                delete kingOfTokyoGames[roomCode];
            }
        }
        else if (gameType === 'mayhem' && roomCode && mayhemGames[roomCode]) {
            const game = mayhemGames[roomCode];
            game.removePlayer(socket.id);
            io.to(roomCode).emit('mayhemStateUpdate', game.getState());
            console.log(`[MAYHEM] Déconnexion de ${username} du salon ${roomCode}`);
            if (game.getPlayers().length === 0 || game.getPlayers().every(p => p.isEliminated)) {
                delete mayhemGames[roomCode];
            }
        }
        else if (gameType === 'clash' && roomCode && clashGames[roomCode]) {
            const game = clashGames[roomCode];
            game.removePlayer(socket.id);
            io.to(roomCode).emit('clashStateUpdate', game.getState());
            console.log(`[CLASH] Déconnexion de ${username} du salon ${roomCode}`);
            if (game.getPlayers().filter(p => !p.isBot).length === 0) {
                game.stopLoop();
                delete clashGames[roomCode];
            }
        }
        else if (gameType === 'sumo' && roomCode && sumoGames[roomCode]) {
            const game = sumoGames[roomCode];
            game.removePlayer(socket.id);
            io.to(roomCode).emit('sumoStateUpdate', game.getState());
            console.log(`[SUMO] Déconnexion de ${username} du salon ${roomCode}`);
            if (game.getPlayers().length === 0) {
                game.stopLoop();
                delete sumoGames[roomCode];
            }
        }
        else if (gameType === 'moba' && roomCode && mobaGames[roomCode]) {
            const game = mobaGames[roomCode];
            game.removePlayer(socket.id);
            io.to(roomCode).emit('mobaStateUpdate', game.getState());
            console.log(`[MOBA] Déconnexion de ${username} du salon ${roomCode}`);
            if (game.getState().players.filter(p => !p.isBot).length === 0) {
                game.stop();
                delete mobaGames[roomCode];
            }
        }
        else if (gameType === 'rts' && roomCode && rtsGames[roomCode]) {
            const game = rtsGames[roomCode];
            game.removePlayer(socket.id);
            io.to(roomCode).emit('rtsStateUpdate', game.getState());
            console.log(`[RTS] Déconnexion de ${username} du salon ${roomCode}`);
            if (game.getPlayers().filter(p => !p.isBot).length === 0) {
                game.stopLoop();
                delete rtsGames[roomCode];
            }
        }
        else if (gameType === 'note' && roomCode && noteGames[roomCode]) {
            const game = noteGames[roomCode];
            game.removePlayer(socket.id);
            broadcastNoteState(roomCode, game);
            console.log(`[NOTE] Déconnexion de ${username} du salon ${roomCode}`);
            if (game.getPlayers().length === 0) {
                delete noteGames[roomCode];
            }
        }
        else if (gameType === 'prophunt' && roomCode && prophuntGames[roomCode]) {
            const game = prophuntGames[roomCode];
            game.removePlayer(socket.id);
            console.log(`[PROPHUNT] Déconnexion de ${username} du salon ${roomCode}`);
            if (game.getPlayers().length === 0) {
                delete prophuntGames[roomCode];
            }
        }
        else if (gameType === 'hellgamble' && roomCode && hellgambleGames[roomCode]) {
            const game = hellgambleGames[roomCode];
            game.removePlayer(socket.id);
            console.log(`[HELLGAMBLE] Déconnexion de ${username} du casino ${roomCode}`);
            if (game.getPlayers().length === 0) {
                delete hellgambleGames[roomCode];
            }
        }
        else if (gameType === 'racing' && roomCode && racingGames[roomCode]) {
            const game = racingGames[roomCode];
            game.removePlayer(socket.id);
            console.log(`[RACING] Déconnexion de ${username} du salon ${roomCode}`);
            if (game.getPlayers().length === 0) {
                game.destroy();
                delete racingGames[roomCode];
            }
            else {
                io.to(roomCode).emit('racingStateUpdate', game.getState());
            }
        }
        else if (gameType === 'chaos' && roomCode && chaosGames[roomCode]) {
            const game = chaosGames[roomCode];
            // Simple lobby check
            if (game.getState().status === 'LOBBY') {
                game.getState().players = game.getState().players.filter(p => p.id !== socket.id);
                game.getState().log.push(`⚠️ ${username} a quitté le salon.`);
            }
            else {
                const p = game.getState().players.find(pl => pl.id === socket.id);
                if (p) {
                    p.isEliminated = true;
                    game.getState().log.push(`⚠️ ${username} s'est déconnecté et a été éliminé.`);
                }
            }
            io.to(roomCode).emit('chaosStateUpdate', game.getState());
            if (game.getPlayers().length === 0) {
                delete chaosGames[roomCode];
            }
        }
        else if (roomCode && games[roomCode]) {
            const game = games[roomCode];
            if (game.getState().status === 'PLAYING' || game.getState().status === 'AUCTION') {
                // En cours de partie, la déconnexion équivaut à une faillite pour ne pas bloquer les autres
                game.getState().log.push(`⚠️ ${username} s'est déconnecté et a été déclaré en faillite.`);
                game.handleDisconnectBankruptcy(socket.id);
            }
            else if (game.getState().status === 'LOBBY') {
                // Dans le lobby, on retire simplement le joueur de la liste
                game.getState().players = game.getState().players.filter(p => p.id !== socket.id);
                game.getState().log.push(`⚠️ ${username} a quitté le salon.`);
            }
            else {
                // Partie déjà terminée ou autre
                game.getState().log.push(`⚠️ ${username} s'est déconnecté.`);
            }
            io.to(roomCode).emit('gameStateUpdate', game.getState());
            console.log(`[GAME] Déconnexion de ${username} du salon ${roomCode}`);
            if (game.getPlayers().length === 0 || game.getPlayers().every(p => p.isBankrupt)) {
                delete games[roomCode];
            }
        }
    });
});
// ─── BACKGROUND CLEANUP JANITOR (Runs every 60s) ─────────────────────────────
setInterval(() => {
    try {
        // 1. Clash
        for (const [code, game] of Object.entries(clashGames)) {
            const room = io.sockets.adapter.rooms.get(code);
            const humanCount = game.getPlayers().filter(p => !p.isBot).length;
            if (!room || room.size === 0 || humanCount === 0) {
                console.log(`[JANITOR] Nettoyage salon Clash orphelin: ${code}`);
                game.stopLoop();
                delete clashGames[code];
            }
        }
        // 2. RTS
        for (const [code, game] of Object.entries(rtsGames)) {
            const room = io.sockets.adapter.rooms.get(code);
            const humanCount = game.getPlayers().filter(p => !p.isBot).length;
            if (!room || room.size === 0 || humanCount === 0) {
                console.log(`[JANITOR] Nettoyage salon RTS orphelin: ${code}`);
                game.stopLoop();
                delete rtsGames[code];
            }
        }
        // 3. MOBA
        for (const [code, game] of Object.entries(mobaGames)) {
            const room = io.sockets.adapter.rooms.get(code);
            const humanCount = game.getState().players.filter(p => !p.isBot).length;
            if (!room || room.size === 0 || humanCount === 0) {
                console.log(`[JANITOR] Nettoyage salon MOBA orphelin: ${code}`);
                game.stop();
                delete mobaGames[code];
            }
        }
        // 4. Sumo
        for (const [code, game] of Object.entries(sumoGames)) {
            const room = io.sockets.adapter.rooms.get(code);
            const humanCount = game.getPlayers().length;
            if (!room || room.size === 0 || humanCount === 0) {
                console.log(`[JANITOR] Nettoyage salon Sumo orphelin: ${code}`);
                game.stopLoop();
                delete sumoGames[code];
            }
        }
    }
    catch (err) {
        console.error('[JANITOR] Erreur lors du nettoyage périodique:', err);
    }
}, 60000);
httpServer.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
});
