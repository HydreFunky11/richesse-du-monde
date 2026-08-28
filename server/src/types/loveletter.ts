export type LoveLetterCardType = 'GARDE' | 'PRETRE' | 'BARON' | 'SERVANTE' | 'PRINCE' | 'ROI' | 'COMTESSE' | 'PRINCESSE';

export interface LoveLetterCard {
  id: string;
  type: LoveLetterCardType;
  value: number;
  name: string;
  description: string;
}

export interface LoveLetterPlayer {
  id: string;
  username: string;
  color: string;
  hand: LoveLetterCard[];
  discardPile: LoveLetterCard[];
  isProtected: boolean;
  isEliminated: boolean;
  tokens: number;
}

export interface LoveLetterGameState {
  status: 'LOBBY' | 'PLAYING' | 'ROUND_END' | 'FINISHED';
  players: LoveLetterPlayer[];
  currentPlayerIndex: number;
  deck: LoveLetterCard[];
  burnCards: LoveLetterCard[]; // Burned cards at round start
  discardedTopCard: LoveLetterCard | null; // Face down burn card
  winner: LoveLetterPlayer | null;
  roundWinner: LoveLetterPlayer | null;
  targetSelectionNeeded: {
    cardId: string;
    cardType: LoveLetterCardType;
    possibleTargets: string[]; // Player IDs
    needsCardGuess?: boolean; // For Garde
  } | null;
  log: string[];
  deckCount: number;
}
