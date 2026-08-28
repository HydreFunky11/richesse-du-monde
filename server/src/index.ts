import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { GameEngine } from './engine/gameEngine';
import { UnoEngine } from './engine/unoEngine';
import { ChaosEngine } from './engine/chaosEngine';
import { LoveLetterEngine } from './engine/loveLetterEngine';
import { DiscretosEngine } from './engine/discretosEngine';
import { SkyjoEngine } from './engine/skyjoEngine';

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3001;

const games: { [roomCode: string]: GameEngine } = {};
const unoGames: { [roomCode: string]: UnoEngine } = {};
const chaosGames: { [roomCode: string]: ChaosEngine } = {};
const loveLetterGames: { [roomCode: string]: LoveLetterEngine } = {};
const discretosGames: { [roomCode: string]: DiscretosEngine } = {};
const skyjoGames: { [roomCode: string]: SkyjoEngine } = {};
const PLAYER_COLORS = ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];



app.get('/health', (req, res) => {
  res.send({ status: 'ok', activeGames: Object.keys(games).length });
});

io.on('connection', (socket) => {
  console.log(`Un joueur s'est connecté : ${socket.id}`);

  socket.on('joinGame', ({ username, roomCode, gameType }: { username: string, roomCode: string, gameType?: string }) => {
    const formattedRoomCode = roomCode.toUpperCase().trim();
    const type = gameType === 'uno' ? 'uno' : (gameType === 'chaos' ? 'chaos' : (gameType === 'loveletter' ? 'loveletter' : (gameType === 'discretos' ? 'discretos' : (gameType === 'skyjo' ? 'skyjo' : 'richesse'))));
    (socket as any).gameType = type;

    if (type === 'uno') {
      if (!unoGames[formattedRoomCode]) {
        unoGames[formattedRoomCode] = new UnoEngine(formattedRoomCode);
      }
      const game = unoGames[formattedRoomCode];
      const color = PLAYER_COLORS[game.getPlayers().length] || '#6B7280';
      const success = game.addPlayer(socket.id, username, color);

      if (success) {
        socket.join(formattedRoomCode);
        (socket as any).roomCode = formattedRoomCode;
        (socket as any).username = username;
        io.to(formattedRoomCode).emit('unoStateUpdate', game.getState());
        console.log(`[UNO LOBBY] ${username} a rejoint le salon ${formattedRoomCode}`);
      } else {
        socket.emit('error', 'Impossible de rejoindre le salon UNO (partie commencée ou salon plein).');
      }
    } else if (type === 'chaos') {
      socket.emit('error', 'Le jeu Chaos Board est temporairement fermé.');
      return;
    } else if (type === 'loveletter') {
      if (!loveLetterGames[formattedRoomCode]) {
        loveLetterGames[formattedRoomCode] = new LoveLetterEngine(formattedRoomCode);
      }
      const game = loveLetterGames[formattedRoomCode];
      const color = PLAYER_COLORS[game.getPlayers().length] || '#6B7280';
      const success = game.addPlayer(socket.id, username, color);

      if (success) {
        socket.join(formattedRoomCode);
        (socket as any).roomCode = formattedRoomCode;
        (socket as any).username = username;
        io.to(formattedRoomCode).emit('loveletterStateUpdate', game.getState());
        console.log(`[LOVELETTER LOBBY] ${username} a rejoint le salon ${formattedRoomCode}`);
      } else {
        socket.emit('error', 'Impossible de rejoindre le salon Love Letter (partie commencée ou salon plein).');
      }
    } else if (type === 'discretos') {
      if (!discretosGames[formattedRoomCode]) {
        discretosGames[formattedRoomCode] = new DiscretosEngine(formattedRoomCode);
      }
      const game = discretosGames[formattedRoomCode];
      const color = PLAYER_COLORS[game.getPlayers().length] || '#6B7280';
      const success = game.addPlayer(socket.id, username, color);

      if (success) {
        socket.join(formattedRoomCode);
        (socket as any).roomCode = formattedRoomCode;
        (socket as any).username = username;
        io.to(formattedRoomCode).emit('discretosStateUpdate', game.getState());
        console.log(`[DISCRETOS LOBBY] ${username} a rejoint le salon ${formattedRoomCode}`);
      } else {
        socket.emit('error', 'Impossible de rejoindre le salon Discretos (partie commencée ou salon plein).');
      }
    } else if (type === 'skyjo') {
      if (!skyjoGames[formattedRoomCode]) {
        skyjoGames[formattedRoomCode] = new SkyjoEngine(formattedRoomCode);
      }
      const game = skyjoGames[formattedRoomCode];
      const color = PLAYER_COLORS[game.getPlayers().length] || '#6B7280';
      const success = game.addPlayer(socket.id, username, color);

      if (success) {
        socket.join(formattedRoomCode);
        (socket as any).roomCode = formattedRoomCode;
        (socket as any).username = username;
        io.to(formattedRoomCode).emit('skyjoStateUpdate', game.getState());
        console.log(`[SKYJO LOBBY] ${username} a rejoint le salon ${formattedRoomCode}`);
      } else {
        socket.emit('error', 'Impossible de rejoindre le salon Skyjo (partie commencée ou salon plein).');
      }
    } else {
      if (!games[formattedRoomCode]) {
        games[formattedRoomCode] = new GameEngine(formattedRoomCode);
      }
      const game = games[formattedRoomCode];
      const color = PLAYER_COLORS[game.getPlayers().length] || '#6B7280';
      const success = game.addPlayer(socket.id, username, color);

      if (success) {
        socket.join(formattedRoomCode);
        (socket as any).roomCode = formattedRoomCode;
        (socket as any).username = username;
        io.to(formattedRoomCode).emit('gameStateUpdate', game.getState());
        console.log(`[LOBBY] ${username} a rejoint le salon ${formattedRoomCode}`);
      } else {
        socket.emit('error', 'Impossible de rejoindre le salon (partie commencée ou salon plein).');
      }
    }
  });

  socket.on('startGame', () => {
    const roomCode = (socket as any).roomCode;
    if (!roomCode || !games[roomCode]) return;

    const game = games[roomCode];
    const success = game.startGame();

    if (success) {
      io.to(roomCode).emit('gameStateUpdate', game.getState());
      console.log(`[GAME] Partie démarrée dans le salon ${roomCode}`);
    } else {
      socket.emit('error', 'Impossible de démarrer la partie (minimum 2 joueurs requis).');
    }
  });

  socket.on('rollDice', () => {
    const roomCode = (socket as any).roomCode;
    if (!roomCode || !games[roomCode]) return;

    const game = games[roomCode];
    const result = game.rollDice(socket.id);

    if (result) {
      io.to(roomCode).emit('gameStateUpdate', game.getState());
      console.log(`[GAME] ${ (socket as any).username } a lancé les dés dans ${roomCode}`);
    } else {
      socket.emit('error', 'Action non autorisée (ce n\'est pas votre tour ou dés déjà lancés).');
    }
  });

  socket.on('buyTitle', ({ titleId }: { titleId: string }) => {
    const roomCode = (socket as any).roomCode;
    if (!roomCode || !games[roomCode]) return;

    const game = games[roomCode];
    const success = game.buyTitle(socket.id, titleId);

    if (success) {
      io.to(roomCode).emit('gameStateUpdate', game.getState());
      console.log(`[GAME] Titre acheté dans le salon ${roomCode} : ${titleId}`);
    } else {
      socket.emit('error', 'Impossible d\'acheter le titre (fonds insuffisants ou mauvais titre).');
    }
  });

  socket.on('buyJokerCard', () => {
    const roomCode = (socket as any).roomCode;
    if (!roomCode || !games[roomCode]) return;

    const game = games[roomCode];
    const success = game.buyJokerCard(socket.id);

    if (success) {
      io.to(roomCode).emit('gameStateUpdate', game.getState());
      console.log(`[GAME] Joker acheté par ${ (socket as any).username }`);
    } else {
      socket.emit('error', 'Impossible d\'acheter la carte Joker (fonds insuffisants ou mauvaise case).');
    }
  });

  socket.on('useJokerCard', () => {
    const roomCode = (socket as any).roomCode;
    if (!roomCode || !games[roomCode]) return;

    const game = games[roomCode];
    const success = game.useJokerCard(socket.id);

    if (success) {
      io.to(roomCode).emit('gameStateUpdate', game.getState());
      console.log(`[GAME] Joker utilisé par ${ (socket as any).username }`);
    } else {
      socket.emit('error', 'Impossible d\'utiliser le Joker.');
    }
  });

  socket.on('startAuction', ({ titleIds }: { titleIds: string[] }) => {
    const roomCode = (socket as any).roomCode;
    if (!roomCode || !games[roomCode]) return;

    const game = games[roomCode];
    const success = game.startAuction(socket.id, titleIds);

    if (success) {
      io.to(roomCode).emit('gameStateUpdate', game.getState());
      console.log(`[GAME] Enchère démarrée par ${ (socket as any).username }`);
    } else {
      socket.emit('error', 'Impossible de démarrer l\'enchère (sélection incorrecte de titres).');
    }
  });

  socket.on('placeBid', ({ bidAmount }: { bidAmount: number }) => {
    const roomCode = (socket as any).roomCode;
    if (!roomCode || !games[roomCode]) return;

    const game = games[roomCode];
    const success = game.placeBid(socket.id, bidAmount);

    if (success) {
      io.to(roomCode).emit('gameStateUpdate', game.getState());
      console.log(`[GAME] Offre placée par ${ (socket as any).username } : ${bidAmount}`);
    } else {
      socket.emit('error', 'Offre non valide (montant insuffisant ou ce n\'est pas le moment).');
    }
  });

  socket.on('passBid', () => {
    const roomCode = (socket as any).roomCode;
    if (!roomCode || !games[roomCode]) return;

    const game = games[roomCode];
    const success = game.passBid(socket.id);

    if (success) {
      io.to(roomCode).emit('gameStateUpdate', game.getState());
      console.log(`[GAME] Enchère passée par ${ (socket as any).username }`);
    } else {
      socket.emit('error', 'Impossible de passer.');
    }
  });

  socket.on('resetGame', () => {
    const roomCode = (socket as any).roomCode;

    if (!roomCode || !games[roomCode]) return;

    const game = games[roomCode];
    const success = game.resetGame();

    if (success) {
      io.to(roomCode).emit('gameStateUpdate', game.getState());
      console.log(`[GAME] Partie réinitialisée dans le salon ${roomCode}`);
    }
  });

  socket.on('passTurn', () => {

    const roomCode = (socket as any).roomCode;
    if (!roomCode || !games[roomCode]) return;

    const game = games[roomCode];
    const success = game.passTurn(socket.id);

    if (success) {
      io.to(roomCode).emit('gameStateUpdate', game.getState());
      console.log(`[GAME] Tour passé par ${ (socket as any).username }`);
    } else {
      socket.emit('error', 'Impossible de passer votre tour (vous devez d\'abord lancer les dés).');
    }
  });

  socket.on('closeLobby', () => {
    const roomCode = (socket as any).roomCode;
    if (!roomCode || !games[roomCode]) return;

    console.log(`[LOBBY] Le salon ${roomCode} a été fermé par ${(socket as any).username}`);
    io.to(roomCode).emit('lobbyClosed');
    delete games[roomCode];
  });

  // ─── UNO event handlers ────────────────────────────────────────────────────

  socket.on('uno:startGame', () => {
    const roomCode = (socket as any).roomCode;
    if (!roomCode || !unoGames[roomCode]) return;
    const game = unoGames[roomCode];
    const success = game.startGame();
    if (success) {
      io.to(roomCode).emit('unoStateUpdate', game.getState());
      console.log(`[UNO] Partie démarrée dans le salon ${roomCode}`);
    } else {
      socket.emit('error', 'Impossible de démarrer la partie UNO (minimum 2 joueurs requis).');
    }
  });

  socket.on('uno:playCard', ({ cardId, chosenColor }: { cardId: string; chosenColor?: string }) => {
    const roomCode = (socket as any).roomCode;
    if (!roomCode || !unoGames[roomCode]) return;
    const game = unoGames[roomCode];
    const result = game.playCard(socket.id, cardId, chosenColor as any);
    if (result.success) {
      io.to(roomCode).emit('unoStateUpdate', game.getState());
    } else {
      socket.emit('error', result.error ?? 'Impossible de jouer cette carte.');
    }
  });

  socket.on('uno:drawCard', () => {
    const roomCode = (socket as any).roomCode;
    if (!roomCode || !unoGames[roomCode]) return;
    const game = unoGames[roomCode];
    const result = game.drawCard(socket.id);
    if (result.success) {
      io.to(roomCode).emit('unoStateUpdate', game.getState());
    } else {
      socket.emit('error', result.error ?? 'Impossible de piocher.');
    }
  });

  socket.on('uno:sayUno', () => {
    const roomCode = (socket as any).roomCode;
    if (!roomCode || !unoGames[roomCode]) return;
    const game = unoGames[roomCode];
    game.sayUno(socket.id);
    io.to(roomCode).emit('unoStateUpdate', game.getState());
  });

  socket.on('uno:challengeUno', ({ targetId }: { targetId: string }) => {
    const roomCode = (socket as any).roomCode;
    if (!roomCode || !unoGames[roomCode]) return;
    const game = unoGames[roomCode];
    const result = game.challengeUno(socket.id, targetId);
    if (result.success) {
      io.to(roomCode).emit('unoStateUpdate', game.getState());
    } else {
      socket.emit('error', result.error ?? 'Défi invalide.');
    }
  });

  socket.on('uno:resetGame', () => {
    const roomCode = (socket as any).roomCode;
    if (!roomCode || !unoGames[roomCode]) return;
    const game = unoGames[roomCode];
    game.resetGame();
    io.to(roomCode).emit('unoStateUpdate', game.getState());
    console.log(`[UNO] Partie réinitialisée dans le salon ${roomCode}`);
  });

  // ─── Chaos Board handlers ──────────────────────────────────────────────────

  socket.on('chaos:startGame', () => {
    const roomCode = (socket as any).roomCode;
    if (!roomCode || !chaosGames[roomCode]) return;
    const game = chaosGames[roomCode];
    if (game.startGame()) {
      io.to(roomCode).emit('chaosStateUpdate', game.getState());
      console.log(`[CHAOS] Partie démarrée dans ${roomCode}`);
    }
  });

  socket.on('chaos:rollDice', () => {
    const roomCode = (socket as any).roomCode;
    if (!roomCode || !chaosGames[roomCode]) return;
    const game = chaosGames[roomCode];
    if (game.rollDice(socket.id)) {
      io.to(roomCode).emit('chaosStateUpdate', game.getState());
    }
  });

  socket.on('chaos:playAction', ({ actionType, params }: { actionType: string, params: any }) => {
    const roomCode = (socket as any).roomCode;
    if (!roomCode || !chaosGames[roomCode]) return;
    const game = chaosGames[roomCode];
    if (game.playAction(socket.id, actionType, params)) {
      io.to(roomCode).emit('chaosStateUpdate', game.getState());
    }
  });

  socket.on('chaos:modifyCell', ({ cellIndex, newType }: { cellIndex: number, newType: any }) => {
    const roomCode = (socket as any).roomCode;
    if (!roomCode || !chaosGames[roomCode]) return;
    const game = chaosGames[roomCode];
    if (game.modifyCell(socket.id, cellIndex, newType)) {
      io.to(roomCode).emit('chaosStateUpdate', game.getState());
    }
  });

  socket.on('chaos:passTurn', () => {
    const roomCode = (socket as any).roomCode;
    if (!roomCode || !chaosGames[roomCode]) return;
    const game = chaosGames[roomCode];
    if (game.passTurn(socket.id)) {
      io.to(roomCode).emit('chaosStateUpdate', game.getState());
    }
  });

  socket.on('chaos:resetGame', () => {
    const roomCode = (socket as any).roomCode;
    if (!roomCode || !chaosGames[roomCode]) return;
    const game = chaosGames[roomCode];
    game.resetGame();
    io.to(roomCode).emit('chaosStateUpdate', game.getState());
  });

  // ─── Love Letter handlers ──────────────────────────────────────────────────

  socket.on('loveletter:startGame', () => {
    const roomCode = (socket as any).roomCode;
    if (!roomCode || !loveLetterGames[roomCode]) return;
    const game = loveLetterGames[roomCode];
    if (game.startGame()) {
      io.to(roomCode).emit('loveletterStateUpdate', game.getState());
      console.log(`[LOVELETTER] Partie démarrée dans ${roomCode}`);
    }
  });

  socket.on('loveletter:playCard', ({ cardId, targetPlayerId, guessedCardType }: { cardId: string, targetPlayerId?: string, guessedCardType?: any }) => {
    const roomCode = (socket as any).roomCode;
    if (!roomCode || !loveLetterGames[roomCode]) return;
    const game = loveLetterGames[roomCode];
    if (game.playCard(socket.id, cardId, targetPlayerId, guessedCardType)) {
      io.to(roomCode).emit('loveletterStateUpdate', game.getState());
    }
  });

  socket.on('loveletter:nextRound', () => {
    const roomCode = (socket as any).roomCode;
    if (!roomCode || !loveLetterGames[roomCode]) return;
    const game = loveLetterGames[roomCode];
    if (game.nextRound()) {
      io.to(roomCode).emit('loveletterStateUpdate', game.getState());
    }
  });

  socket.on('loveletter:resetGame', () => {
    const roomCode = (socket as any).roomCode;
    if (!roomCode || !loveLetterGames[roomCode]) return;
    const game = loveLetterGames[roomCode];
    game.resetGame();
    io.to(roomCode).emit('loveletterStateUpdate', game.getState());
  });

  // ─── Discretos handlers ────────────────────────────────────────────────────

  socket.on('discretos:startGame', () => {
    const roomCode = (socket as any).roomCode;
    if (!roomCode || !discretosGames[roomCode]) return;
    const game = discretosGames[roomCode];
    if (game.startGame()) {
      io.to(roomCode).emit('discretosStateUpdate', game.getState());
      console.log(`[DISCRETOS] Partie démarrée dans ${roomCode}`);
    }
  });

  socket.on('discretos:submitClue', ({ clueText }: { clueText: string }) => {
    const roomCode = (socket as any).roomCode;
    if (!roomCode || !discretosGames[roomCode]) return;
    const game = discretosGames[roomCode];
    if (game.submitClue(socket.id, clueText)) {
      io.to(roomCode).emit('discretosStateUpdate', game.getState());
    }
  });

  socket.on('discretos:accusePlayer', ({ targetId }: { targetId: string }) => {
    const roomCode = (socket as any).roomCode;
    if (!roomCode || !discretosGames[roomCode]) return;
    const game = discretosGames[roomCode];
    if (game.accusePlayer(socket.id, targetId)) {
      io.to(roomCode).emit('discretosStateUpdate', game.getState());
    }
  });

  socket.on('discretos:resetGame', () => {
    const roomCode = (socket as any).roomCode;
    if (!roomCode || !discretosGames[roomCode]) return;
    const game = discretosGames[roomCode];
    game.resetGame();
    io.to(roomCode).emit('discretosStateUpdate', game.getState());
  });

  // ─── Skyjo handlers ────────────────────────────────────────────────────────

  socket.on('skyjo:startGame', () => {
    const roomCode = (socket as any).roomCode;
    if (!roomCode || !skyjoGames[roomCode]) return;
    const game = skyjoGames[roomCode];
    if (game.startGame()) {
      io.to(roomCode).emit('skyjoStateUpdate', game.getState());
      console.log(`[SKYJO] Partie démarrée dans ${roomCode}`);
    }
  });

  socket.on('skyjo:revealCardInitial', ({ row, col }: { row: number, col: number }) => {
    const roomCode = (socket as any).roomCode;
    if (!roomCode || !skyjoGames[roomCode]) return;
    const game = skyjoGames[roomCode];
    if (game.revealCardInitial(socket.id, row, col)) {
      io.to(roomCode).emit('skyjoStateUpdate', game.getState());
    }
  });

  socket.on('skyjo:drawFromDrawPile', () => {
    const roomCode = (socket as any).roomCode;
    if (!roomCode || !skyjoGames[roomCode]) return;
    const game = skyjoGames[roomCode];
    if (game.drawFromDrawPile(socket.id)) {
      io.to(roomCode).emit('skyjoStateUpdate', game.getState());
    }
  });

  socket.on('skyjo:drawFromDiscardPile', () => {
    const roomCode = (socket as any).roomCode;
    if (!roomCode || !skyjoGames[roomCode]) return;
    const game = skyjoGames[roomCode];
    if (game.drawFromDiscardPile(socket.id)) {
      io.to(roomCode).emit('skyjoStateUpdate', game.getState());
    }
  });

  socket.on('skyjo:swapWithDiscard', ({ row, col }: { row: number, col: number }) => {
    const roomCode = (socket as any).roomCode;
    if (!roomCode || !skyjoGames[roomCode]) return;
    const game = skyjoGames[roomCode];
    if (game.swapWithDiscard(socket.id, row, col)) {
      io.to(roomCode).emit('skyjoStateUpdate', game.getState());
    }
  });

  socket.on('skyjo:swapDrawnCard', ({ row, col }: { row: number, col: number }) => {
    const roomCode = (socket as any).roomCode;
    if (!roomCode || !skyjoGames[roomCode]) return;
    const game = skyjoGames[roomCode];
    if (game.swapDrawnCard(socket.id, row, col)) {
      io.to(roomCode).emit('skyjoStateUpdate', game.getState());
    }
  });

  socket.on('skyjo:discardDrawnCardAndReveal', ({ row, col }: { row: number, col: number }) => {
    const roomCode = (socket as any).roomCode;
    if (!roomCode || !skyjoGames[roomCode]) return;
    const game = skyjoGames[roomCode];
    if (game.discardDrawnCardAndReveal(socket.id, row, col)) {
      io.to(roomCode).emit('skyjoStateUpdate', game.getState());
    }
  });

  socket.on('skyjo:nextRound', () => {
    const roomCode = (socket as any).roomCode;
    if (!roomCode || !skyjoGames[roomCode]) return;
    const game = skyjoGames[roomCode];
    if (game.nextRound()) {
      io.to(roomCode).emit('skyjoStateUpdate', game.getState());
    }
  });

  socket.on('skyjo:resetGame', () => {
    const roomCode = (socket as any).roomCode;
    if (!roomCode || !skyjoGames[roomCode]) return;
    const game = skyjoGames[roomCode];
    game.resetGame();
    io.to(roomCode).emit('skyjoStateUpdate', game.getState());
  });

  // ─── Disconnect ────────────────────────────────────────────────────────────

  socket.on('disconnect', () => {

    const roomCode = (socket as any).roomCode;
    const username = (socket as any).username;
    const gameType = (socket as any).gameType;

    if (gameType === 'uno' && roomCode && unoGames[roomCode]) {
      const game = unoGames[roomCode];
      game.removePlayer(socket.id);
      io.to(roomCode).emit('unoStateUpdate', game.getState());
      console.log(`[UNO] Déconnexion de ${username} du salon ${roomCode}`);
      if (game.getPlayers().length === 0) {
        delete unoGames[roomCode];
      }
    } else if (gameType === 'loveletter' && roomCode && loveLetterGames[roomCode]) {
      const game = loveLetterGames[roomCode];
      game.removePlayer(socket.id);
      io.to(roomCode).emit('loveletterStateUpdate', game.getState());
      console.log(`[LOVELETTER] Déconnexion de ${username} du salon ${roomCode}`);
      if (game.getPlayers().length === 0) {
        delete loveLetterGames[roomCode];
      }
    } else if (gameType === 'discretos' && roomCode && discretosGames[roomCode]) {
      const game = discretosGames[roomCode];
      game.removePlayer(socket.id);
      io.to(roomCode).emit('discretosStateUpdate', game.getState());
      console.log(`[DISCRETOS] Déconnexion de ${username} du salon ${roomCode}`);
      if (game.getPlayers().length === 0) {
        game.destroy();
        delete discretosGames[roomCode];
      }
    } else if (gameType === 'skyjo' && roomCode && skyjoGames[roomCode]) {
      const game = skyjoGames[roomCode];
      game.removePlayer(socket.id);
      io.to(roomCode).emit('skyjoStateUpdate', game.getState());
      console.log(`[SKYJO] Déconnexion de ${username} du salon ${roomCode}`);
      if (game.getPlayers().length === 0) {
        delete skyjoGames[roomCode];
      }
    } else if (gameType === 'discretos' && roomCode && discretosGames[roomCode]) {
      const game = discretosGames[roomCode];
      game.removePlayer(socket.id);
      io.to(roomCode).emit('discretosStateUpdate', game.getState());
      console.log(`[DISCRETOS] Déconnexion de ${username} du salon ${roomCode}`);
      if (game.getPlayers().length === 0) {
        game.destroy();
        delete discretosGames[roomCode];
      }
    } else if (gameType === 'chaos' && roomCode && chaosGames[roomCode]) {
      const game = chaosGames[roomCode];
      // Simple lobby check
      if (game.getState().status === 'LOBBY') {
        game.getState().players = game.getState().players.filter(p => p.id !== socket.id);
        game.getState().log.push(`⚠️ ${username} a quitté le salon.`);
      } else {
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
    } else if (roomCode && games[roomCode]) {
      const game = games[roomCode];
      
      if (game.getState().status === 'PLAYING' || game.getState().status === 'AUCTION') {
        // En cours de partie, la déconnexion équivaut à une faillite pour ne pas bloquer les autres
        game.getState().log.push(`⚠️ ${username} s'est déconnecté et a été déclaré en faillite.`);
        game.handleDisconnectBankruptcy(socket.id);
      } else if (game.getState().status === 'LOBBY') {
        // Dans le lobby, on retire simplement le joueur de la liste
        game.getState().players = game.getState().players.filter(p => p.id !== socket.id);
        game.getState().log.push(`⚠️ ${username} a quitté le salon.`);
      } else {
        // Partie déjà terminée ou autre
        game.getState().log.push(`⚠️ ${username} s'est déconnecté.`);
      }

      io.to(roomCode).emit('gameStateUpdate', game.getState());
      console.log(`[GAME] Déconnexion de ${username} du salon ${roomCode}`);
    }
  });

});

httpServer.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
