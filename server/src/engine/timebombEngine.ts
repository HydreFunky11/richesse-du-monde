import {
  TimeBombGameState,
  TimeBombPlayer,
  TimeBombCard,
  TimeBombRole,
  TimeBombWireType,
  TimeBombVariant,
  TimeBombChatMessage,
  TimeBombCutHistory,
  TimeBombPlayerView,
} from '../types/timebomb';

const SUITS: ('♠' | '♥' | '♦' | '♣')[] = ['♠', '♥', '♦', '♣'];
const BOT_NAMES = ['Sherlock 🤖', 'Moriarty 🤖', 'Watson 🤖', 'Irene 🤖', 'Lestrade 🤖', 'Mycroft 🤖', 'Hudson 🤖'];

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export class TimeBombEngine {
  private roomCode: string;
  private status: 'LOBBY' | 'PLAYING' | 'FINISHED' = 'LOBBY';
  private variant: TimeBombVariant = 'STANDARD';
  private players: TimeBombPlayer[] = [];
  private round: number = 1;
  private maxRounds: number = 4;
  private cutsThisRound: number = 0;
  private defusesFound: number = 0;
  private totalDefusesNeeded: number = 0;
  private bombsFound: number = 0;
  private totalBombsInGame: number = 1;
  private activeCutterId: string | null = null;
  private lastCutterId: string | null = null;
  private lastCutResult: TimeBombGameState['lastCutResult'] = null;
  private winner: 'DEMINEURS' | 'TERRORISTES' | null = null;
  private winReason: string | null = null;
  private history: TimeBombCutHistory[] = [];
  private messages: TimeBombChatMessage[] = [];
  private log: string[] = [];
  private onUpdateCallback?: () => void;
  private botTimer: NodeJS.Timeout | null = null;

  constructor(roomCode: string, onUpdate?: () => void) {
    this.roomCode = roomCode;
    this.onUpdateCallback = onUpdate;
    this.addLog('Salon Time Bomb créé. En attente de démineurs et terroristes...');
  }

  public setOnUpdate(cb: () => void) {
    this.onUpdateCallback = cb;
  }

  private notify() {
    if (this.onUpdateCallback) {
      this.onUpdateCallback();
    }
  }

  private addLog(msg: string) {
    this.log.unshift(msg);
    if (this.log.length > 50) this.log.pop();
  }

  public addPlayer(id: string, username: string, color: string): boolean {
    if (this.status !== 'LOBBY') return false;
    if (this.players.length >= 8) return false;
    if (this.players.some(p => p.id === id)) return false;

    this.players.push({
      id,
      username,
      color,
      isBot: false,
      role: 'DEMINEUR',
      roleCardName: 'Roi Rouge',
      cards: [],
      roundKnowledge: { defuses: 0, bombs: 0, neutrals: 0, total: 0 },
    });

    this.addLog(`${username} a rejoint le salon.`);
    this.notify();
    return true;
  }

  public addBot(): boolean {
    if (this.status !== 'LOBBY') return false;
    if (this.players.length >= 8) return false;

    const usedNames = new Set(this.players.map(p => p.username));
    const availableName = BOT_NAMES.find(n => !usedNames.has(n)) || `Bot ${this.players.length + 1} 🤖`;
    const botId = `bot_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const botColors = ['#9333ea', '#2563eb', '#059669', '#d97706', '#dc2626', '#0891b2', '#4f46e5'];
    const color = botColors[this.players.length % botColors.length];

    this.players.push({
      id: botId,
      username: availableName,
      color,
      isBot: true,
      role: 'DEMINEUR',
      roleCardName: 'Roi Rouge',
      cards: [],
      roundKnowledge: { defuses: 0, bombs: 0, neutrals: 0, total: 0 },
    });

    this.addLog(`${availableName} a été ajouté au salon.`);
    this.notify();
    return true;
  }

  public removeBot(botId: string): boolean {
    if (this.status !== 'LOBBY') return false;
    const idx = this.players.findIndex(p => p.id === botId && p.isBot);
    if (idx === -1) return false;
    const bot = this.players[idx];
    this.players.splice(idx, 1);
    this.addLog(`${bot.username} a été retiré.`);
    this.notify();
    return true;
  }

  public removePlayer(id: string) {
    const idx = this.players.findIndex(p => p.id === id);
    if (idx !== -1) {
      const p = this.players[idx];
      this.players.splice(idx, 1);
      this.addLog(`${p.username} a quitté la partie.`);

      if (this.status === 'PLAYING') {
        const humanCount = this.players.filter(pl => !pl.isBot).length;
        if (this.players.length < 3 || humanCount === 0) {
          this.status = 'FINISHED';
          this.winReason = 'Partie interrompue : pas assez de joueurs restants.';
          this.clearBotTimer();
        } else if (this.activeCutterId === id) {
          // Reassign active cutter if they left
          const nextPlayer = this.players.find(pl => pl.cards.some(c => !c.isCut)) || this.players[0];
          this.activeCutterId = nextPlayer.id;
          this.lastCutterId = null;
          this.addLog(`La pince coupante est confiée à ${nextPlayer.username}.`);
          this.checkBotTurn();
        }
      }
      this.notify();
    }
  }

  public setVariant(variant: TimeBombVariant) {
    if (this.status !== 'LOBBY') return;
    this.variant = variant;
    this.notify();
  }

  public startGame(): boolean {
    const n = this.players.length;
    if (n < 3 || n > 8) return false;

    // 1. Roles Setup
    let terroristesCount = 1;
    if (n === 5 || n === 6 || n === 7) terroristesCount = 2;
    else if (n === 8) terroristesCount = 3;

    const demineursCount = n - terroristesCount;

    const redKings = ['Roi de Cœur ❤️', 'Roi de Carreau ♦️'];
    const blackKings = ['Roi de Pique ♠️', 'Roi de Trèfle ♣️'];

    const roleCards: { role: TimeBombRole; roleCardName: string }[] = [];
    for (let i = 0; i < demineursCount; i++) {
      roleCards.push({ role: 'DEMINEUR', roleCardName: redKings[i % redKings.length] });
    }
    for (let i = 0; i < terroristesCount; i++) {
      roleCards.push({ role: 'TERRORISTE', roleCardName: blackKings[i % blackKings.length] });
    }

    const shuffledRoles = shuffle(roleCards);
    this.players.forEach((p, i) => {
      p.role = shuffledRoles[i].role;
      p.roleCardName = shuffledRoles[i].roleCardName;
      p.announcement = undefined;
    });

    // 2. Wire Deck Setup
    const totalCards = n * 5;
    this.totalBombsInGame = this.variant === 'MORT_SUBITE' ? 2 : 1;

    let defuses = n;
    if (this.variant === 'DEBUTANT') defuses = Math.max(1, n - 1);
    else if (this.variant === 'EXPERT') defuses = n + 1;

    this.totalDefusesNeeded = defuses;
    this.defusesFound = 0;
    this.bombsFound = 0;

    const deck: Omit<TimeBombCard, 'id' | 'isCut'>[] = [];

    // Bombs
    deck.push({ type: 'BOMB', label: 'Valet de Pique ♠️', suit: '♠', value: 'J' });
    if (this.totalBombsInGame === 2) {
      deck.push({ type: 'BOMB', label: 'Valet de Trèfle ♣️', suit: '♣', value: 'J' });
    }

    // Defuses
    const defuseLabels = [
      { label: 'As de Cœur ♥️', suit: '♥' as const, value: 'A' },
      { label: 'As de Carreau ♦️', suit: '♦' as const, value: 'A' },
      { label: 'As de Pique ♠️', suit: '♠' as const, value: 'A' },
      { label: 'As de Trèfle ♣️', suit: '♣' as const, value: 'A' },
      { label: 'Dame de Cœur ♥️', suit: '♥' as const, value: 'Q' },
      { label: 'Dame de Carreau ♦️', suit: '♦' as const, value: 'Q' },
      { label: 'Dame de Pique ♠️', suit: '♠' as const, value: 'Q' },
      { label: 'Dame de Trèfle ♣️', suit: '♣' as const, value: 'Q' },
    ];
    for (let i = 0; i < defuses; i++) {
      const d = defuseLabels[i % defuseLabels.length];
      deck.push({ type: 'DEFUSE', label: d.label, suit: d.suit, value: d.value });
    }

    // Neutrals
    const neutralValues = ['2', '3', '4', '5', '6', '7', '8', '9', '10'];
    const neutralsNeeded = totalCards - deck.length;
    for (let i = 0; i < neutralsNeeded; i++) {
      const val = neutralValues[i % neutralValues.length];
      const suit = SUITS[Math.floor(i / neutralValues.length) % SUITS.length];
      deck.push({ type: 'NEUTRAL', label: `${val} de ${suit}`, suit, value: val });
    }

    // 3. Initial Deal (5 cards per player)
    const shuffledDeck = shuffle(deck);
    let cardIdCounter = 1;

    this.players.forEach((p, pIndex) => {
      const playerCards = shuffledDeck.slice(pIndex * 5, (pIndex + 1) * 5);
      p.roundKnowledge = {
        defuses: playerCards.filter(c => c.type === 'DEFUSE').length,
        bombs: playerCards.filter(c => c.type === 'BOMB').length,
        neutrals: playerCards.filter(c => c.type === 'NEUTRAL').length,
        total: 5,
      };

      // Shuffle individual hand so position is secret even to the player
      p.cards = shuffle(playerCards).map(c => ({
        ...c,
        id: `c_${cardIdCounter++}`,
        isCut: false,
      }));
    });

    // 4. Starting Cutter
    const starterIdx = Math.floor(Math.random() * n);
    this.activeCutterId = this.players[starterIdx].id;
    this.lastCutterId = null;

    this.round = 1;
    this.cutsThisRound = 0;
    this.status = 'PLAYING';
    this.winner = null;
    this.winReason = null;
    this.lastCutResult = null;
    this.history = [];

    this.addLog(`🚀 La partie commence ! ${demineursCount} Démineurs contre ${terroristesCount} Terroristes.`);
    this.addLog(`✂️ Objectif Démineurs : trouver ${this.totalDefusesNeeded} désamorçages avant la fin de la manche 4.`);
    this.addLog(`💣 Objectif Terroristes : faire exploser la bombe ou survivre 4 manches.`);
    this.addLog(`✂️ ${this.players[starterIdx].username} commence avec la pince coupante !`);

    // Trigger initial bot announcements
    this.triggerBotAnnouncements();

    this.notify();
    this.checkBotTurn();
    return true;
  }

  private triggerBotAnnouncements() {
    this.players.forEach(p => {
      if (!p.isBot) return;
      if (p.role === 'DEMINEUR') {
        // Honest claim
        p.announcement = {
          claimedDefuses: p.roundKnowledge.defuses,
          claimsBomb: p.roundKnowledge.bombs > 0,
          text: p.roundKnowledge.defuses > 0
            ? `J'ai ${p.roundKnowledge.defuses} désamorçage(s) ! Venez couper chez moi ✂️`
            : p.roundKnowledge.bombs > 0
            ? `⚠️ ATTENTION j'ai la bombe, ne coupez surtout pas chez moi !`
            : `Rien d'intéressant chez moi, que des fils neutres ⚪`,
        };
      } else {
        // Terrorist bluff: pretend to be demineur, bait or hide bomb
        const pretendDefuses = p.roundKnowledge.bombs > 0 ? 1 : Math.random() < 0.5 ? 1 : 0;
        p.announcement = {
          claimedDefuses: pretendDefuses,
          claimsBomb: false, // hide the bomb
          text: pretendDefuses > 0
            ? `J'ai ${pretendDefuses} désamorçage(s) garanti(s) ! Coupez ici ✂️`
            : `Je suis clean, aucun danger chez moi !`,
        };
      }
    });
  }

  public cutWire(cutterId: string, targetId: string, cardIndex: number): boolean {
    if (this.status !== 'PLAYING') return false;
    if (this.activeCutterId !== cutterId) return false;
    if (cutterId === targetId) return false;

    // Check anti-ping-pong rule (Aller-retour interdit)
    const cutterPlayer = this.players.find(p => p.id === cutterId);
    const targetPlayer = this.players.find(p => p.id === targetId);
    if (!cutterPlayer || !targetPlayer) return false;

    // If target has no uncut cards, invalid
    const uncutCards = targetPlayer.cards.filter(c => !c.isCut);
    if (uncutCards.length === 0) return false;

    // Ping-pong check: cannot cut player who just cut at current cutter
    // Exception: if ONLY the last cutter has uncut cards among all other players
    if (this.lastCutterId === targetId) {
      const otherPlayersWithCards = this.players.filter(
        p => p.id !== cutterId && p.id !== this.lastCutterId && p.cards.some(c => !c.isCut)
      );
      if (otherPlayersWithCards.length > 0) {
        // Strict anti-ping-pong applies!
        return false;
      }
    }

    if (cardIndex < 0 || cardIndex >= targetPlayer.cards.length) return false;
    const targetCard = targetPlayer.cards[cardIndex];
    if (targetCard.isCut) return false;

    // Cut the card!
    targetCard.isCut = true;
    this.cutsThisRound++;

    this.lastCutResult = {
      cutterId: cutterPlayer.id,
      cutterName: cutterPlayer.username,
      targetId: targetPlayer.id,
      targetName: targetPlayer.username,
      cardType: targetCard.type,
      cardLabel: targetCard.label,
    };

    this.history.unshift({
      cutterId: cutterPlayer.id,
      cutterName: cutterPlayer.username,
      targetId: targetPlayer.id,
      targetName: targetPlayer.username,
      cardIndex,
      cardType: targetCard.type,
      cardLabel: targetCard.label,
      round: this.round,
    });

    // Check wire outcome
    if (targetCard.type === 'BOMB') {
      this.bombsFound++;
      this.addLog(`💥 BOOM ! ${cutterPlayer.username} a coupé la Bombe (${targetCard.label}) chez ${targetPlayer.username} !`);
      this.endGame('TERRORISTES', `La Bombe (${targetCard.label}) a explosé ! Victoire des Terroristes ! 👿`);
      this.notify();
      return true;
    }

    if (targetCard.type === 'DEFUSE') {
      this.defusesFound++;
      this.addLog(`✂️ DÉSAMORÇAGE trouvé (${targetCard.label}) chez ${targetPlayer.username} ! (${this.defusesFound}/${this.totalDefusesNeeded})`);
      if (this.defusesFound >= this.totalDefusesNeeded) {
        this.endGame('DEMINEURS', `Tous les ${this.totalDefusesNeeded} désamorçages ont été trouvés ! Victoire des Démineurs ! 🕵️‍♂️`);
        this.notify();
        return true;
      }
    } else {
      this.addLog(`⚪ Fil neutre coupé (${targetCard.label}) chez ${targetPlayer.username}. Rien ne se passe.`);
    }

    // Transfer cutter
    this.lastCutterId = cutterPlayer.id;
    this.activeCutterId = targetPlayer.id;

    // Check round end
    if (this.cutsThisRound >= this.players.length) {
      this.finishRound();
    } else {
      this.addLog(`✂️ ${targetPlayer.username} prend la pince coupante ! (Fils coupés cette manche: ${this.cutsThisRound}/${this.players.length})`);
    }

    this.notify();
    this.checkBotTurn();
    return true;
  }

  private finishRound() {
    this.addLog(`🔔 Fin de la Manche ${this.round} !`);

    if (this.round >= this.maxRounds) {
      // 4 rounds over, defuses not completed -> Terrorists win!
      this.endGame('TERRORISTES', `Temps écoulé ! Les 4 manches sont terminées sans désamorcer la bombe. Victoire des Terroristes ! 👿`);
      return;
    }

    // Collect all uncut cards
    const remainingCards: Omit<TimeBombCard, 'id' | 'isCut'>[] = [];
    this.players.forEach(p => {
      p.cards.forEach(c => {
        if (!c.isCut) {
          remainingCards.push({
            type: c.type,
            label: c.label,
            suit: c.suit,
            value: c.value,
          });
        }
      });
    });

    const nextRound = this.round + 1;
    const cardsPerPlayer = 5 - (nextRound - 1); // R2=4, R3=3, R4=2
    const shuffledRemaining = shuffle(remainingCards);

    let cardIdCounter = 1;
    this.players.forEach((p, pIndex) => {
      const dealt = shuffledRemaining.slice(pIndex * cardsPerPlayer, (pIndex + 1) * cardsPerPlayer);
      p.roundKnowledge = {
        defuses: dealt.filter(c => c.type === 'DEFUSE').length,
        bombs: dealt.filter(c => c.type === 'BOMB').length,
        neutrals: dealt.filter(c => c.type === 'NEUTRAL').length,
        total: dealt.length,
      };

      p.cards = shuffle(dealt).map(c => ({
        ...c,
        id: `c_r${nextRound}_${cardIdCounter++}`,
        isCut: false,
      }));
      p.announcement = undefined;
    });

    this.round = nextRound;
    this.cutsThisRound = 0;
    this.lastCutterId = null; // Reset anti-ping-pong at start of new round
    const activePlayer = this.players.find(p => p.id === this.activeCutterId) || this.players[0];
    this.activeCutterId = activePlayer.id;

    this.addLog(`🏁 Début de la Manche ${this.round} ! Chacun reçoit ${cardsPerPlayer} cartes.`);
    this.addLog(`✂️ ${activePlayer.username} garde la pince coupante pour ouvrir la manche.`);

    this.triggerBotAnnouncements();
  }

  private endGame(winner: 'DEMINEURS' | 'TERRORISTES', reason: string) {
    this.status = 'FINISHED';
    this.winner = winner;
    this.winReason = reason;
    this.clearBotTimer();
    this.addLog(`🏆 PARTIE TERMINÉE : ${reason}`);
  }

  public restartGame(): boolean {
    if (this.status !== 'FINISHED') return false;
    this.status = 'LOBBY';
    this.round = 1;
    this.cutsThisRound = 0;
    this.defusesFound = 0;
    this.bombsFound = 0;
    this.winner = null;
    this.winReason = null;
    this.lastCutResult = null;
    this.history = [];
    this.players.forEach(p => {
      p.cards = [];
      p.roundKnowledge = { defuses: 0, bombs: 0, neutrals: 0, total: 0 };
      p.announcement = undefined;
    });
    this.addLog('Partie réinitialisée. Prêt pour une nouvelle manche !');
    this.notify();
    return true;
  }

  public setAnnouncement(playerId: string, announcement: { claimedDefuses?: number; claimsBomb?: boolean; text?: string }) {
    const player = this.players.find(p => p.id === playerId);
    if (!player) return;
    player.announcement = announcement;
    if (announcement.text) {
      this.addMessage(playerId, announcement.text);
    }
    this.notify();
  }

  public addMessage(senderId: string, text: string) {
    const player = this.players.find(p => p.id === senderId);
    if (!player) return;
    this.messages.push({
      id: `m_${Date.now()}_${Math.random()}`,
      senderId,
      senderName: player.username,
      senderColor: player.color,
      text: text.trim().slice(0, 160),
      timestamp: Date.now(),
    });
    if (this.messages.length > 80) this.messages.shift();
    this.notify();
  }

  private checkBotTurn() {
    this.clearBotTimer();
    if (this.status !== 'PLAYING') return;

    const activePlayer = this.players.find(p => p.id === this.activeCutterId);
    if (!activePlayer || !activePlayer.isBot) return;

    this.botTimer = setTimeout(() => {
      this.executeBotCut(activePlayer);
    }, 1800);
  }

  private clearBotTimer() {
    if (this.botTimer) {
      clearTimeout(this.botTimer);
      this.botTimer = null;
    }
  }

  private executeBotCut(bot: TimeBombPlayer) {
    if (this.status !== 'PLAYING') return;
    if (this.activeCutterId !== bot.id) return;

    // Eligible target players
    const candidates = this.players.filter(p => {
      if (p.id === bot.id) return false;
      if (this.lastCutterId === p.id) {
        // Check if there are other candidates
        const others = this.players.filter(o => o.id !== bot.id && o.id !== this.lastCutterId && o.cards.some(c => !c.isCut));
        if (others.length > 0) return false;
      }
      return p.cards.some(c => !c.isCut);
    });

    if (candidates.length === 0) return;

    let target: TimeBombPlayer;

    if (bot.role === 'DEMINEUR') {
      // Prioritize player who claimed defuses and NOT bomb
      const goodCandidates = candidates.filter(c => c.announcement?.claimedDefuses && c.announcement.claimedDefuses > 0 && !c.announcement.claimsBomb);
      if (goodCandidates.length > 0) {
        target = goodCandidates[Math.floor(Math.random() * goodCandidates.length)];
      } else {
        // Avoid anyone claiming the bomb
        const safeCandidates = candidates.filter(c => !c.announcement?.claimsBomb);
        target = safeCandidates.length > 0
          ? safeCandidates[Math.floor(Math.random() * safeCandidates.length)]
          : candidates[Math.floor(Math.random() * candidates.length)];
      }
    } else {
      // Terrorist bot: bait, cut randomly, or cut someone suspected of having bomb
      target = candidates[Math.floor(Math.random() * candidates.length)];
    }

    // Pick an uncut card on target
    const uncutIndices: number[] = [];
    target.cards.forEach((c, idx) => {
      if (!c.isCut) uncutIndices.push(idx);
    });

    if (uncutIndices.length === 0) return;
    const cardIdx = uncutIndices[Math.floor(Math.random() * uncutIndices.length)];

    this.cutWire(bot.id, target.id, cardIdx);
  }

  public getState(socketId?: string): TimeBombGameState {
    const isFinished = this.status === 'FINISHED';
    const thisPlayer = this.players.find(p => p.id === socketId);

    const playersView: TimeBombPlayerView[] = this.players.map(p => ({
      id: p.id,
      username: p.username,
      color: p.color,
      isBot: p.isBot,
      cardCount: p.cards.filter(c => !c.isCut).length,
      role: isFinished ? p.role : (p.id === socketId ? p.role : undefined),
      roleCardName: isFinished ? p.roleCardName : (p.id === socketId ? p.roleCardName : undefined),
      announcement: p.announcement,
      cards: p.cards.map(c => ({
        id: c.id,
        isCut: c.isCut,
        type: c.isCut || isFinished || p.id === socketId ? c.type : undefined,
        label: c.isCut || isFinished || p.id === socketId ? c.label : undefined,
        suit: c.isCut || isFinished || p.id === socketId ? c.suit : undefined,
        value: c.isCut || isFinished || p.id === socketId ? c.value : undefined,
      })),
    }));

    return {
      roomCode: this.roomCode,
      status: this.status,
      variant: this.variant,
      round: this.round,
      maxRounds: this.maxRounds,
      cutsThisRound: this.cutsThisRound,
      totalCutsThisRoundTarget: this.players.length,
      defusesFound: this.defusesFound,
      totalDefusesNeeded: this.totalDefusesNeeded,
      bombsFound: this.bombsFound,
      totalBombsInGame: this.totalBombsInGame,
      activeCutterId: this.activeCutterId,
      lastCutterId: this.lastCutterId,
      lastCutResult: this.lastCutResult,
      winner: this.winner,
      winReason: this.winReason,
      history: this.history,
      messages: this.messages,
      log: this.log,
      players: playersView,
      mySecret: thisPlayer && this.status === 'PLAYING' ? {
        role: thisPlayer.role,
        roleCardName: thisPlayer.roleCardName,
        roundKnowledge: thisPlayer.roundKnowledge,
      } : undefined,
    };
  }

  public getPlayers() {
    return this.players;
  }

  public destroy() {
    this.clearBotTimer();
  }
}
