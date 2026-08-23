import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { GameEngine } from './engine/gameEngine';

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
const PLAYER_COLORS = ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];

app.get('/health', (req, res) => {
  res.send({ status: 'ok', activeGames: Object.keys(games).length });
});

io.on('connection', (socket) => {
  console.log(`Un joueur s'est connecté : ${socket.id}`);

  socket.on('joinGame', ({ username, roomCode }: { username: string, roomCode: string }) => {
    const formattedRoomCode = roomCode.toUpperCase().trim();

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

  socket.on('disconnect', () => {
    const roomCode = (socket as any).roomCode;
    const username = (socket as any).username;

    if (roomCode && games[roomCode]) {
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
