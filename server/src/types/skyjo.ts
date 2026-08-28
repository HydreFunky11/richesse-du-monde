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
  drawnCard: SkyjoCard | null; // Currently drawn card from draw pile (waiting to be placed or discarded)
  roundEnderId: string | null; // Player who turned all their cards face up first
  log: string[];
  winner: SkyjoPlayer | null;
}
