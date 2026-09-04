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
import { KingOfTokyoEngine } from './engine/kingoftokyoEngine';
import { DungeonMayhemEngine } from './engine/dungeonMayhemEngine';
import { ClashEngine } from './engine/clashEngine';
import { SumoEngine } from './engine/sumoEngine';
import { RtsEngine } from './engine/rtsEngine';
import { MobaEngine } from './engine/mobaEngine';
import { ChampionId, SpellKey } from './types/moba';
import fs from 'fs';
import path from 'path';

// Load .env locally if present
try {
  const candidates = [
    path.resolve(__dirname, '../.env'),
    path.resolve(__dirname, '../../.env'),
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), 'server/.env'),
  ];
  for (const envPath of candidates) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
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
} catch (e) {
  // ignore
}

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
const kingOfTokyoGames: { [roomCode: string]: KingOfTokyoEngine } = {};
const mayhemGames: { [roomCode: string]: DungeonMayhemEngine } = {};
const clashGames: { [roomCode: string]: ClashEngine } = {};
const sumoGames: { [roomCode: string]: SumoEngine } = {};
const rtsGames: { [roomCode: string]: RtsEngine } = {};
const mobaGames: { [roomCode: string]: MobaEngine } = {};
const PLAYER_COLORS = ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];



app.get('/health', (req, res) => {
  res.send({ status: 'ok', activeGames: Object.keys(games).length });
});

io.on('connection', (socket) => {
  console.log(`Un joueur s'est connecté : ${socket.id}`);

  socket.on('joinGame', ({ username, roomCode, gameType }: { username: string, roomCode: string, gameType?: string }) => {
    const formattedRoomCode = roomCode.toUpperCase().trim();
    const validTypes = ['uno', 'chaos', 'loveletter', 'discretos', 'skyjo', 'kingoftokyo', 'mayhem', 'clash', 'sumo', 'rts', 'moba'];
    let type = 'richesse';
    if (gameType === 'dungeonmayhem') type = 'mayhem';
    else if (gameType && validTypes.includes(gameType)) type = gameType;
    (socket as any).gameType = type;

    if (type === 'uno') {
      if (!unoGames[formattedRoomCode] || unoGames[formattedRoomCode].getState().status === 'FINISHED' || unoGames[formattedRoomCode].getPlayers().length === 0) {
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
      if (!chaosGames[formattedRoomCode] || chaosGames[formattedRoomCode].getState().status === 'FINISHED' || chaosGames[formattedRoomCode].getPlayers().length === 0) {
        chaosGames[formattedRoomCode] = new ChaosEngine(formattedRoomCode);
      }
      const game = chaosGames[formattedRoomCode];
      const color = PLAYER_COLORS[game.getPlayers().length] || '#F59E0B';
      const success = game.addPlayer(socket.id, username, color);

      if (success) {
        socket.join(formattedRoomCode);
        (socket as any).roomCode = formattedRoomCode;
        (socket as any).username = username;
        socket.emit('chaosStateUpdate', game.getState());
        io.to(formattedRoomCode).emit('chaosStateUpdate', game.getState());
        console.log(`[CHAOS LOBBY] ${username} a rejoint le salon ${formattedRoomCode}`);
      } else {
        socket.emit('error', 'Impossible de rejoindre le salon Chaos (partie commencée ou salon plein).');
      }
    } else if (type === 'loveletter') {
      if (!loveLetterGames[formattedRoomCode] || loveLetterGames[formattedRoomCode].getState().status === 'FINISHED' || loveLetterGames[formattedRoomCode].getPlayers().length === 0) {
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
      if (!discretosGames[formattedRoomCode] || discretosGames[formattedRoomCode].getState().status === 'FINISHED' || discretosGames[formattedRoomCode].getPlayers().length === 0) {
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
      if (!skyjoGames[formattedRoomCode] || skyjoGames[formattedRoomCode].getState().status === 'FINISHED' || skyjoGames[formattedRoomCode].getPlayers().length === 0) {
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
    } else if (type === 'kingoftokyo') {
      if (!kingOfTokyoGames[formattedRoomCode] || kingOfTokyoGames[formattedRoomCode].getState().status === 'FINISHED' || kingOfTokyoGames[formattedRoomCode].getPlayers().length === 0) {
        kingOfTokyoGames[formattedRoomCode] = new KingOfTokyoEngine(formattedRoomCode);
      }
      const game = kingOfTokyoGames[formattedRoomCode];
      const color = PLAYER_COLORS[game.getPlayers().length] || '#6B7280';
      const success = game.addPlayer(socket.id, username, color);

      if (success) {
        socket.join(formattedRoomCode);
        (socket as any).roomCode = formattedRoomCode;
        (socket as any).username = username;
        io.to(formattedRoomCode).emit('kingStateUpdate', game.getState());
        console.log(`[KING LOBBY] ${username} a rejoint le salon ${formattedRoomCode}`);
      } else {
        socket.emit('error', 'Impossible de rejoindre le salon King of Tokyo (partie commencée ou salon plein).');
      }
    } else if (type === 'mayhem') {
      if (!mayhemGames[formattedRoomCode] || mayhemGames[formattedRoomCode].getState().status === 'FINISHED' || mayhemGames[formattedRoomCode].getPlayers().length === 0 || mayhemGames[formattedRoomCode].getPlayers().every(p => p.isEliminated)) {
        mayhemGames[formattedRoomCode] = new DungeonMayhemEngine(formattedRoomCode);
      }
      const game = mayhemGames[formattedRoomCode];
      const color = PLAYER_COLORS[game.getPlayers().length] || '#6B7280';
      const success = game.addPlayer(socket.id, username, color);

      if (success) {
        socket.join(formattedRoomCode);
        (socket as any).roomCode = formattedRoomCode;
        (socket as any).username = username;
        io.to(formattedRoomCode).emit('mayhemStateUpdate', game.getState());
        console.log(`[MAYHEM LOBBY] ${username} a rejoint le salon ${formattedRoomCode}`);
      } else {
        socket.emit('error', 'Impossible de rejoindre le salon Dungeon Mayhem (partie commencée ou salon plein).');
      }
        } else if (type === 'sumo') {
      if (!sumoGames[formattedRoomCode] || sumoGames[formattedRoomCode].getState().status === 'MATCH_FINISHED' || sumoGames[formattedRoomCode].getPlayers().length === 0) {
        sumoGames[formattedRoomCode] = new SumoEngine(formattedRoomCode);
        sumoGames[formattedRoomCode].onStateChange((state) => {
          io.to(formattedRoomCode).emit('sumoStateUpdate', state);
        });
      }
      const game = sumoGames[formattedRoomCode];
      const color = PLAYER_COLORS[game.getPlayers().length] || '#3B82F6';
      const success = game.addPlayer(socket.id, username, color);

      if (success) {
        socket.join(formattedRoomCode);
        (socket as any).roomCode = formattedRoomCode;
        (socket as any).username = username;
        socket.emit('sumoStateUpdate', game.getState());
        io.to(formattedRoomCode).emit('sumoStateUpdate', game.getState());
        console.log(`[SUMO LOBBY] ${username} a rejoint le salon ${formattedRoomCode}`);
      } else {
        socket.emit('error', 'Impossible de rejoindre le salon Sumo.');
      }
    } else if (type === 'clash') {
      if (!clashGames[formattedRoomCode] || clashGames[formattedRoomCode].getState().status === 'FINISHED' || clashGames[formattedRoomCode].getPlayers().length === 0) {
        clashGames[formattedRoomCode] = new ClashEngine(formattedRoomCode);
      }
      const game = clashGames[formattedRoomCode];
      const color = PLAYER_COLORS[game.getPlayers().length] || '#3B82F6';
      const success = game.addPlayer(socket.id, username, color);

      if (success) {
        socket.join(formattedRoomCode);
        (socket as any).roomCode = formattedRoomCode;
        (socket as any).username = username;
        socket.emit('clashStateUpdate', game.getState());
        io.to(formattedRoomCode).emit('clashStateUpdate', game.getState());
        console.log(`[CLASH LOBBY] ${username} a rejoint le salon ${formattedRoomCode}`);
      } else {
        socket.emit('error', 'Impossible de rejoindre le salon Clash (partie commencée ou salon plein).');
      }
    } else if (type === 'moba') {
      if (!mobaGames[formattedRoomCode] || mobaGames[formattedRoomCode].getState().players.length === 0) {
        mobaGames[formattedRoomCode] = new MobaEngine(formattedRoomCode);
        mobaGames[formattedRoomCode].setOnUpdate((state) => {
          io.to(formattedRoomCode).emit('mobaStateUpdate', state);
        });
      }
      const game = mobaGames[formattedRoomCode];
      game.addPlayer(socket.id, username);

      socket.join(formattedRoomCode);
      (socket as any).roomCode = formattedRoomCode;
      (socket as any).username = username;
      socket.emit('mobaStateUpdate', game.getState());
      io.to(formattedRoomCode).emit('mobaStateUpdate', game.getState());
      console.log(`[MOBA LOBBY] ${username} a rejoint le salon ${formattedRoomCode}`);
    } else if (type === 'rts') {
      if (!rtsGames[formattedRoomCode] || rtsGames[formattedRoomCode].getState().status === 'FINISHED' || rtsGames[formattedRoomCode].getPlayers().length === 0) {
        rtsGames[formattedRoomCode] = new RtsEngine(formattedRoomCode, (state) => {
          io.to(formattedRoomCode).emit('rtsStateUpdate', state);
        });
      }
      const game = rtsGames[formattedRoomCode];
      const color = PLAYER_COLORS[game.getPlayers().length] || '#10B981';
      const success = game.addPlayer(socket.id, username, color);

      if (success) {
        socket.join(formattedRoomCode);
        (socket as any).roomCode = formattedRoomCode;
        (socket as any).username = username;
        socket.emit('rtsStateUpdate', game.getState());
        io.to(formattedRoomCode).emit('rtsStateUpdate', game.getState());
        console.log(`[RTS LOBBY] ${username} a rejoint le salon ${formattedRoomCode}`);
      } else {
        socket.emit('error', 'Impossible de rejoindre le salon RTS (partie commencée ou salon plein).');
      }
    } else {
      if (!games[formattedRoomCode] || games[formattedRoomCode].getStatus() === 'FINISHED' || games[formattedRoomCode].getPlayers().length === 0 || games[formattedRoomCode].getPlayers().every(p => p.isBankrupt)) {
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

  socket.on('chaos:move', ({ targetCellId }: { targetCellId: string }) => {
    const roomCode = (socket as any).roomCode;
    if (!roomCode || !chaosGames[roomCode]) return;
    const game = chaosGames[roomCode];
    if (game.movePlayer(socket.id, targetCellId)) {
      io.to(roomCode).emit('chaosStateUpdate', game.getState());
    }
  });

  socket.on('chaos:draftRule', async ({ ruleText }: { ruleText: string }) => {
    const roomCode = (socket as any).roomCode;
    if (!roomCode || !chaosGames[roomCode]) return;
    const game = chaosGames[roomCode];
    game.getState().isAiGenerating = true;
    io.to(roomCode).emit('chaosStateUpdate', game.getState());
    await game.submitNewRule(socket.id, ruleText, () => {
      io.to(roomCode).emit('chaosStateUpdate', game.getState());
    });
    io.to(roomCode).emit('chaosStateUpdate', game.getState());
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

  socket.on('skyjo:swapDrawnCard', ({ row, col }: { row: number, col: number }) => {
    const roomCode = (socket as any).roomCode;
    if (!roomCode || !skyjoGames[roomCode]) return;
    const game = skyjoGames[roomCode];
    if (game.swapDrawnCard(socket.id, row, col)) {
      io.to(roomCode).emit('skyjoStateUpdate', game.getState());
    }
  });

  socket.on('skyjo:discardDrawnCard', () => {
    const roomCode = (socket as any).roomCode;
    if (!roomCode || !skyjoGames[roomCode]) return;
    const game = skyjoGames[roomCode];
    if (game.discardDrawnCard(socket.id)) {
      io.to(roomCode).emit('skyjoStateUpdate', game.getState());
    }
  });

  socket.on('skyjo:revealCard', ({ row, col }: { row: number, col: number }) => {
    const roomCode = (socket as any).roomCode;
    if (!roomCode || !skyjoGames[roomCode]) return;
    const game = skyjoGames[roomCode];
    if (game.revealCard(socket.id, row, col)) {
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

  // ─── King of Tokyo handlers ────────────────────────────────────────────────

  socket.on('king:startGame', () => {
    const roomCode = (socket as any).roomCode;
    if (!roomCode || !kingOfTokyoGames[roomCode]) return;
    const game = kingOfTokyoGames[roomCode];
    if (game.startGame()) {
      io.to(roomCode).emit('kingStateUpdate', game.getState());
      console.log(`[KING] Partie démarrée dans ${roomCode}`);
    }
  });

  socket.on('king:toggleKeep', ({ index }: { index: number }) => {
    const roomCode = (socket as any).roomCode;
    if (!roomCode || !kingOfTokyoGames[roomCode]) return;
    const game = kingOfTokyoGames[roomCode];
    if (game.toggleKeep(socket.id, index)) {
      io.to(roomCode).emit('kingStateUpdate', game.getState());
    }
  });

  socket.on('king:rollDice', () => {
    const roomCode = (socket as any).roomCode;
    if (!roomCode || !kingOfTokyoGames[roomCode]) return;
    const game = kingOfTokyoGames[roomCode];
    if (game.rollDice(socket.id)) {
      io.to(roomCode).emit('kingStateUpdate', game.getState());
    }
  });

  socket.on('king:resolveDice', () => {
    const roomCode = (socket as any).roomCode;
    if (!roomCode || !kingOfTokyoGames[roomCode]) return;
    const game = kingOfTokyoGames[roomCode];
    if (game.resolveDice(socket.id)) {
      io.to(roomCode).emit('kingStateUpdate', game.getState());
    }
  });

  socket.on('king:respondYield', ({ yieldTokyo }: { yieldTokyo: boolean }) => {
    const roomCode = (socket as any).roomCode;
    if (!roomCode || !kingOfTokyoGames[roomCode]) return;
    const game = kingOfTokyoGames[roomCode];
    if (game.respondYield(socket.id, yieldTokyo)) {
      io.to(roomCode).emit('kingStateUpdate', game.getState());
    }
  });

  socket.on('king:buyCard', ({ cardId }: { cardId: string }) => {
    const roomCode = (socket as any).roomCode;
    if (!roomCode || !kingOfTokyoGames[roomCode]) return;
    const game = kingOfTokyoGames[roomCode];
    if (game.buyCard(socket.id, cardId)) {
      io.to(roomCode).emit('kingStateUpdate', game.getState());
    }
  });

  socket.on('king:endTurn', () => {
    const roomCode = (socket as any).roomCode;
    if (!roomCode || !kingOfTokyoGames[roomCode]) return;
    const game = kingOfTokyoGames[roomCode];
    if (game.endTurn(socket.id)) {
      io.to(roomCode).emit('kingStateUpdate', game.getState());
    }
  });

  socket.on('king:resetGame', () => {
    const roomCode = (socket as any).roomCode;
    if (!roomCode || !kingOfTokyoGames[roomCode]) return;
    const game = kingOfTokyoGames[roomCode];
    game.resetGame();
    io.to(roomCode).emit('kingStateUpdate', game.getState());
  });

  // ─── Dungeon Mayhem Sockets ──────────────────────────────────────────────────

  socket.on('mayhem:selectCharacter', ({ characterClass }: { characterClass: any }) => {
    const roomCode = (socket as any).roomCode;
    if (!roomCode || !mayhemGames[roomCode]) return;
    const game = mayhemGames[roomCode];
    if (game.selectCharacter(socket.id, characterClass)) {
      io.to(roomCode).emit('mayhemStateUpdate', game.getState());
    }
  });

  socket.on('mayhem:startGame', () => {
    const roomCode = (socket as any).roomCode;
    if (!roomCode || !mayhemGames[roomCode]) return;
    const game = mayhemGames[roomCode];
    if (game.startGame()) {
      io.to(roomCode).emit('mayhemStateUpdate', game.getState());
    }
  });

  socket.on('mayhem:playCard', ({ cardId, targetPlayerId, targetShieldId }: { cardId: string; targetPlayerId?: string; targetShieldId?: string }) => {
    const roomCode = (socket as any).roomCode;
    if (!roomCode || !mayhemGames[roomCode]) return;
    const game = mayhemGames[roomCode];
    if (game.playCard(socket.id, cardId, targetPlayerId, targetShieldId)) {
      io.to(roomCode).emit('mayhemStateUpdate', game.getState());
    }
  });

  socket.on('mayhem:endTurn', () => {
    const roomCode = (socket as any).roomCode;
    if (!roomCode || !mayhemGames[roomCode]) return;
    const game = mayhemGames[roomCode];
    if (game.endTurn(socket.id)) {
      io.to(roomCode).emit('mayhemStateUpdate', game.getState());
    }
  });

  socket.on('mayhem:resetGame', () => {
    const roomCode = (socket as any).roomCode;
    if (!roomCode || !mayhemGames[roomCode]) return;
    const game = mayhemGames[roomCode];
    game.resetGame();
    io.to(roomCode).emit('mayhemStateUpdate', game.getState());
  });

  // ─── CLASH OF REALMS ───────────────────────────────────────────────────────

  socket.on('clash:startGame', () => {
    const roomCode = (socket as any).roomCode;
    if (!roomCode || !clashGames[roomCode]) return;
    const game = clashGames[roomCode];
    if (game.startGame()) {
      game.startLoop((state) => {
        io.to(roomCode).emit('clashStateUpdate', state);
      });
      io.to(roomCode).emit('clashStateUpdate', game.getState());
    }
  });

  socket.on('clash:addBot', () => {
    const roomCode = (socket as any).roomCode;
    if (!roomCode || !clashGames[roomCode]) return;
    const game = clashGames[roomCode];
    if (game.addBot()) {
      io.to(roomCode).emit('clashStateUpdate', game.getState());
    }
  });

  socket.on('clash:playCard', ({ cardId, x, y }: { cardId: any, x: number, y: number }) => {
    const roomCode = (socket as any).roomCode;
    if (!roomCode || !clashGames[roomCode]) return;
    const game = clashGames[roomCode];
    if (game.playCard(socket.id, cardId, x, y)) {
      io.to(roomCode).emit('clashStateUpdate', game.getState());
    }
  });

  socket.on('clash:resetGame', () => {
    const roomCode = (socket as any).roomCode;
    if (!roomCode || !clashGames[roomCode]) return;
    const game = clashGames[roomCode];
    game.resetGame();
    io.to(roomCode).emit('clashStateUpdate', game.getState());
  });

  // ─── Sumo Smash Listeners ──────────────────────────────────────────────────

  socket.on('sumo:push', ({ key }: { key: string }) => {
    const roomCode = (socket as any).roomCode;
    if (!roomCode || !sumoGames[roomCode]) return;
    const game = sumoGames[roomCode];
    game.handlePush(socket.id, key);
  });

  socket.on('sumo:startGame', () => {
    const roomCode = (socket as any).roomCode;
    if (!roomCode || !sumoGames[roomCode]) return;
    const game = sumoGames[roomCode];
    game.startGame();
  });

  socket.on('sumo:resetMatch', () => {
    const roomCode = (socket as any).roomCode;
    if (!roomCode || !sumoGames[roomCode]) return;
    const game = sumoGames[roomCode];
    game.resetMatch();
  });

  // ─── RTS (Nexus Wars) Listeners ────────────────────────────────────────────

  socket.on('rts:selectFaction', ({ faction }: { faction: any }) => {
    const roomCode = (socket as any).roomCode;
    if (!roomCode || !rtsGames[roomCode]) return;
    const game = rtsGames[roomCode];
    if (game.selectFaction(socket.id, faction)) {
      io.to(roomCode).emit('rtsStateUpdate', game.getState());
    }
  });

  socket.on('rts:startGame', () => {
    const roomCode = (socket as any).roomCode;
    if (!roomCode || !rtsGames[roomCode]) return;
    const game = rtsGames[roomCode];
    if (game.startGame()) {
      io.to(roomCode).emit('rtsStateUpdate', game.getState());
    }
  });

  socket.on('rts:addBot', () => {
    const roomCode = (socket as any).roomCode;
    if (!roomCode || !rtsGames[roomCode]) return;
    const game = rtsGames[roomCode];
    if (game.addBot()) {
      io.to(roomCode).emit('rtsStateUpdate', game.getState());
    }
  });

  socket.on('rts:order', ({ unitIds, orderType, targetX, targetY, targetId }: { unitIds: string[], orderType: any, targetX?: number, targetY?: number, targetId?: string }) => {
    const roomCode = (socket as any).roomCode;
    if (!roomCode || !rtsGames[roomCode]) return;
    const game = rtsGames[roomCode];
    game.handleOrder(socket.id, unitIds, orderType, targetX, targetY, targetId);
  });

  socket.on('rts:build', ({ buildingType, x, y }: { buildingType: any, x: number, y: number }) => {
    const roomCode = (socket as any).roomCode;
    if (!roomCode || !rtsGames[roomCode]) return;
    const game = rtsGames[roomCode];
    if (game.handleBuild(socket.id, buildingType, x, y)) {
      io.to(roomCode).emit('rtsStateUpdate', game.getState());
    }
  });

  socket.on('rts:produce', ({ buildingId, unitType }: { buildingId: string, unitType: any }) => {
    const roomCode = (socket as any).roomCode;
    if (!roomCode || !rtsGames[roomCode]) return;
    const game = rtsGames[roomCode];
    if (game.handleProduceUnit(socket.id, buildingId, unitType)) {
      io.to(roomCode).emit('rtsStateUpdate', game.getState());
    }
  });

  socket.on('rts:upgrade', ({ buildingId }: { buildingId: string }) => {
    const roomCode = (socket as any).roomCode;
    if (!roomCode || !rtsGames[roomCode]) return;
    const game = rtsGames[roomCode];
    if (game.handleUpgradePlant(socket.id, buildingId)) {
      io.to(roomCode).emit('rtsStateUpdate', game.getState());
    }
  });

  socket.on('rts:research', ({ techId }: { techId: any }) => {
    const roomCode = (socket as any).roomCode;
    if (!roomCode || !rtsGames[roomCode]) return;
    const game = rtsGames[roomCode];
    if (game.handleResearch(socket.id, techId)) {
      io.to(roomCode).emit('rtsStateUpdate', game.getState());
    }
  });

  socket.on('rts:ability', ({ targetX, targetY }: { targetX: number, targetY: number }) => {
    const roomCode = (socket as any).roomCode;
    if (!roomCode || !rtsGames[roomCode]) return;
    const game = rtsGames[roomCode];
    if (game.handleActivateUltimate(socket.id, targetX, targetY)) {
      io.to(roomCode).emit('rtsStateUpdate', game.getState());
    }
  });

  socket.on('rts:resetGame', () => {
    const roomCode = (socket as any).roomCode;
    if (!roomCode || !rtsGames[roomCode]) return;
    const game = rtsGames[roomCode];
    game.resetGame();
    io.to(roomCode).emit('rtsStateUpdate', game.getState());
  });

  // ─── MOBA Handlers ───────────────────────────────────────────────────────

  socket.on('moba:selectChampion', ({ championId }: { championId: ChampionId }) => {
    const roomCode = (socket as any).roomCode;
    if (!roomCode || !mobaGames[roomCode]) return;
    const game = mobaGames[roomCode];
    game.selectChampion(socket.id, championId);
    io.to(roomCode).emit('mobaStateUpdate', game.getState());
  });

  socket.on('moba:switchTeam', () => {
    const roomCode = (socket as any).roomCode;
    if (!roomCode || !mobaGames[roomCode]) return;
    const game = mobaGames[roomCode];
    game.switchTeam(socket.id);
    io.to(roomCode).emit('mobaStateUpdate', game.getState());
  });

  socket.on('moba:addBot', ({ team, championId }: { team?: any, championId?: any } = {}) => {
    const roomCode = (socket as any).roomCode;
    if (!roomCode || !mobaGames[roomCode]) return;
    const game = mobaGames[roomCode];
    game.addBot(team, championId);
    io.to(roomCode).emit('mobaStateUpdate', game.getState());
  });

  socket.on('moba:startGame', () => {
    const roomCode = (socket as any).roomCode;
    if (!roomCode || !mobaGames[roomCode]) return;
    const game = mobaGames[roomCode];
    game.startGame();
    io.to(roomCode).emit('mobaStateUpdate', game.getState());
  });

  socket.on('moba:move', ({ targetX, targetY }: { targetX: number, targetY: number }) => {
    const roomCode = (socket as any).roomCode;
    if (!roomCode || !mobaGames[roomCode]) return;
    mobaGames[roomCode].handleMove(socket.id, targetX, targetY);
  });

  socket.on('moba:inputVelocity', ({ vx, vy }: { vx: number, vy: number }) => {
    const roomCode = (socket as any).roomCode;
    if (!roomCode || !mobaGames[roomCode]) return;
    mobaGames[roomCode].handleInputVelocity(socket.id, vx, vy);
  });

  socket.on('moba:attack', ({ targetId }: { targetId: string }) => {
    const roomCode = (socket as any).roomCode;
    if (!roomCode || !mobaGames[roomCode]) return;
    mobaGames[roomCode].handleAttack(socket.id, targetId);
  });

  socket.on('moba:castSpell', ({ spellKey, mouseX, mouseY, targetId }: { spellKey: SpellKey, mouseX: number, mouseY: number, targetId?: string }) => {
    const roomCode = (socket as any).roomCode;
    if (!roomCode || !mobaGames[roomCode]) return;
    mobaGames[roomCode].handleCastSpell(socket.id, spellKey, mouseX, mouseY, targetId);
  });

  socket.on('moba:summonerSpell', ({ key, mouseX, mouseY }: { key: 'd' | 'f', mouseX: number, mouseY: number }) => {
    const roomCode = (socket as any).roomCode;
    if (!roomCode || !mobaGames[roomCode]) return;
    mobaGames[roomCode].handleSummonerSpell(socket.id, key, mouseX, mouseY);
  });

  socket.on('moba:recall', () => {
    const roomCode = (socket as any).roomCode;
    if (!roomCode || !mobaGames[roomCode]) return;
    mobaGames[roomCode].handleRecall(socket.id);
  });

  socket.on('moba:upgradeSpell', ({ spellKey }: { spellKey: SpellKey }) => {
    const roomCode = (socket as any).roomCode;
    if (!roomCode || !mobaGames[roomCode]) return;
    const game = mobaGames[roomCode];
    game.handleUpgradeSpell(socket.id, spellKey);
    io.to(roomCode).emit('mobaStateUpdate', game.getState());
  });

  socket.on('moba:buyItem', ({ itemId }: { itemId: string }) => {
    const roomCode = (socket as any).roomCode;
    if (!roomCode || !mobaGames[roomCode]) return;
    const game = mobaGames[roomCode];
    game.handleBuyItem(socket.id, itemId);
    io.to(roomCode).emit('mobaStateUpdate', game.getState());
  });

  socket.on('moba:sellItem', ({ itemIndex }: { itemIndex: number }) => {
    const roomCode = (socket as any).roomCode;
    if (!roomCode || !mobaGames[roomCode]) return;
    const game = mobaGames[roomCode];
    game.handleSellItem(socket.id, itemIndex);
    io.to(roomCode).emit('mobaStateUpdate', game.getState());
  });

  socket.on('moba:resetGame', () => {
    const roomCode = (socket as any).roomCode;
    if (!roomCode || !mobaGames[roomCode]) return;
    const game = mobaGames[roomCode];
    game.resetGame();
    io.to(roomCode).emit('mobaStateUpdate', game.getState());
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
    } else if (gameType === 'kingoftokyo' && roomCode && kingOfTokyoGames[roomCode]) {
      const game = kingOfTokyoGames[roomCode];
      game.removePlayer(socket.id);
      io.to(roomCode).emit('kingStateUpdate', game.getState());
      console.log(`[KING] Déconnexion de ${username} du salon ${roomCode}`);
      if (game.getPlayers().length === 0) {
        delete kingOfTokyoGames[roomCode];
      }
    } else if (gameType === 'mayhem' && roomCode && mayhemGames[roomCode]) {
      const game = mayhemGames[roomCode];
      game.removePlayer(socket.id);
      io.to(roomCode).emit('mayhemStateUpdate', game.getState());
      console.log(`[MAYHEM] Déconnexion de ${username} du salon ${roomCode}`);
      if (game.getPlayers().length === 0 || game.getPlayers().every(p => p.isEliminated)) {
        delete mayhemGames[roomCode];
      }
    } else if (gameType === 'clash' && roomCode && clashGames[roomCode]) {
      const game = clashGames[roomCode];
      game.removePlayer(socket.id);
      io.to(roomCode).emit('clashStateUpdate', game.getState());
      console.log(`[CLASH] Déconnexion de ${username} du salon ${roomCode}`);
      if (game.getPlayers().length === 0) {
        game.stopLoop();
        delete clashGames[roomCode];
      }
    } else if (gameType === 'moba' && roomCode && mobaGames[roomCode]) {
      const game = mobaGames[roomCode];
      game.removePlayer(socket.id);
      io.to(roomCode).emit('mobaStateUpdate', game.getState());
      console.log(`[MOBA] Déconnexion de ${username} du salon ${roomCode}`);
      if (game.getState().players.filter(p => !p.isBot).length === 0) {
        game.stop();
        delete mobaGames[roomCode];
      }
    } else if (gameType === 'rts' && roomCode && rtsGames[roomCode]) {
      const game = rtsGames[roomCode];
      game.removePlayer(socket.id);
      io.to(roomCode).emit('rtsStateUpdate', game.getState());
      console.log(`[RTS] Déconnexion de ${username} du salon ${roomCode}`);
      if (game.getPlayers().length === 0) {
        game.stopLoop();
        delete rtsGames[roomCode];
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
      if (game.getPlayers().length === 0 || game.getPlayers().every(p => p.isBankrupt)) {
        delete games[roomCode];
      }
    }
  });

});

httpServer.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
