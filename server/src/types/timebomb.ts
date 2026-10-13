export type TimeBombRole = 'DEMINEUR' | 'TERRORISTE';

export type TimeBombWireType = 'DEFUSE' | 'BOMB' | 'NEUTRAL';

export type TimeBombVariant = 'STANDARD' | 'MORT_SUBITE' | 'DEBUTANT' | 'EXPERT';

export interface TimeBombCard {
  id: string;
  type: TimeBombWireType;
  label: string; // e.g. "As de Cœur" | "Valet de Pique" | "7 de Carreau"
  suit?: '♠' | '♥' | '♦' | '♣';
  value?: string; // "A", "J", "Q", "2", "3", etc.
  isCut: boolean;
}

export interface TimeBombPlayer {
  id: string;
  username: string;
  color: string;
  isBot?: boolean;
  role: TimeBombRole;
  roleCardName: string; // "Roi de Cœur", "Roi de Pique", etc.
  cards: TimeBombCard[]; // Player's face-down cards on table for current round
  roundKnowledge: {
    defuses: number;
    bombs: number;
    neutrals: number;
    total: number;
  };
  announcement?: {
    claimedDefuses?: number;
    claimsBomb?: boolean;
    text?: string;
  };
}

export interface TimeBombChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderColor: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

export interface TimeBombCutHistory {
  cutterId: string;
  cutterName: string;
  targetId: string;
  targetName: string;
  cardIndex: number;
  cardType: TimeBombWireType;
  cardLabel: string;
  round: number;
}

export interface TimeBombCardView {
  id: string;
  isCut: boolean;
  type?: TimeBombWireType;
  label?: string;
  suit?: '♠' | '♥' | '♦' | '♣';
  value?: string;
}

export interface TimeBombPlayerView {
  id: string;
  username: string;
  color: string;
  isBot?: boolean;
  cardCount: number;
  role?: TimeBombRole;
  roleCardName?: string;
  cards: TimeBombCardView[];
  announcement?: {
    claimedDefuses?: number;
    claimsBomb?: boolean;
    text?: string;
  };
}

export interface TimeBombGameState {
  roomCode: string;
  status: 'LOBBY' | 'PLAYING' | 'FINISHED';
  variant: TimeBombVariant;
  round: number; // 1 to 4
  maxRounds: number; // 4
  cutsThisRound: number; // 0 to numPlayers
  totalCutsThisRoundTarget: number; // numPlayers
  defusesFound: number;
  totalDefusesNeeded: number;
  bombsFound: number;
  totalBombsInGame: number;
  activeCutterId: string | null;
  lastCutterId: string | null; // Anti-ping-pong: player who just cut at current cutter's cards
  lastCutResult: {
    cutterId: string;
    cutterName: string;
    targetId: string;
    targetName: string;
    cardType: TimeBombWireType;
    cardLabel: string;
  } | null;
  winner: 'DEMINEURS' | 'TERRORISTES' | null;
  winReason: string | null;
  history: TimeBombCutHistory[];
  messages: TimeBombChatMessage[];
  log: string[];
  players: TimeBombPlayerView[];
  mySecret?: {
    role: TimeBombRole;
    roleCardName: string;
    roundKnowledge: {
      defuses: number;
      bombs: number;
      neutrals: number;
      total: number;
    };
  };
}
