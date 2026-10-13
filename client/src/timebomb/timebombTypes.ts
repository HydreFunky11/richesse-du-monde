export type TimeBombRole = 'DEMINEUR' | 'TERRORISTE';

export type TimeBombWireType = 'DEFUSE' | 'BOMB' | 'NEUTRAL';

export type TimeBombVariant = 'STANDARD' | 'MORT_SUBITE' | 'DEBUTANT' | 'EXPERT';

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

export interface TimeBombGameState {
  roomCode: string;
  status: 'LOBBY' | 'PLAYING' | 'FINISHED';
  variant: TimeBombVariant;
  round: number;
  maxRounds: number;
  cutsThisRound: number;
  totalCutsThisRoundTarget: number;
  defusesFound: number;
  totalDefusesNeeded: number;
  bombsFound: number;
  totalBombsInGame: number;
  activeCutterId: string | null;
  lastCutterId: string | null;
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
