export interface SkyjoCard {
  id: string;
  value: number;
  faceUp: boolean;
}

export interface SkyjoPlayer {
  id: string;
  username: string;
  color: string;
  grid: SkyjoCard[][]; // 3 rows, 4 columns (grid[row][col])
  roundScore: number;
  totalScore: number;
  hasFinished: boolean; // Turned all cards face up in this round
}

export interface SkyjoGameState {
  status: 'LOBBY' | 'REVEAL_TWO' | 'PLAYING' | 'ROUND_END' | 'FINISHED';
  players: SkyjoPlayer[];
  currentPlayerIndex: number;
  discardPile: SkyjoCard[];
  drawPileCount: number;
  drawnCard: SkyjoCard | null; // Currently drawn card
  isDrawnFromDiscard: boolean; // True if the card in hand came from discard pile (cannot be discarded)
  mustRevealCard: boolean; // True after discarding a drawn card from draw pile; player must reveal a face-down card to finish turn
  roundEnderId: string | null; // Player who turned all their cards face up first
  log: string[];
  winner: SkyjoPlayer | null;
}
