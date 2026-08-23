export type UnoColor = 'rouge' | 'bleu' | 'vert' | 'jaune' | 'special';
export type UnoCardType = 'number' | 'skip' | 'reverse' | 'draw_two' | 'wild' | 'wild_draw_four';

export interface UnoCard {
  id: string;
  color: UnoColor;
  type: UnoCardType;
  value?: number; // 0-9 for number cards
}

export interface UnoPlayer {
  id: string;
  username: string;
  color: string;
  hand: UnoCard[];
  saidUno: boolean;
}

export interface UnoGameState {
  status: 'LOBBY' | 'PLAYING' | 'FINISHED';
  players: UnoPlayer[];
  currentPlayerIndex: number;
  direction: 1 | -1;
  topCard: UnoCard | null;
  currentColor: UnoColor;
  drawStack: number;
  mustDraw: number;
  winner: UnoPlayer | null;
  log: string[];
  deckCount: number;
}
