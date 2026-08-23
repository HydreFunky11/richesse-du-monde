export type ResourceType =
  | 'PETROLE'
  | 'HOUILLE'
  | 'ACIER'
  | 'COTON'
  | 'FER'
  | 'LAINE'
  | 'CUIVRE'
  | 'CAFE'
  | 'COBALT'
  | 'OR'
  | 'TUNGSTENE'
  | 'SUCRE'
  | 'ARGENT'
  | 'RIZ'
  | 'AUTO'
  | 'BLE'
  | 'NAVALE'
  | 'THE'
  | 'ALUMINIUM'
  | 'CACAO'
  | 'PLOMB'
  | 'CAOUTCHOUC'
  | 'URANIUM'
  | 'NICKEL';

export interface ResourceDefinition {
  type: ResourceType;
  name: string;
  color: string;
  totalTitles: number;
  royalties: number[]; 
}

export interface Title {
  id: string;
  resourceType: ResourceType;
  country: string;
  purchasePrice: number;
  ownerId: string | null;
}

export type CellType =
  | 'DEPART'
  | 'RICHESSE'
  | 'CHOIX_MONDIAL'
  | 'CHOIX_CONTINENTAL'
  | 'ACTUALITE'
  | 'JOKER'
  | 'BANQUE'
  | 'ENCHERES';

export interface BoardCell {
  index: number;
  name: string;
  type: CellType;
  countryId?: string;
  titleIds?: string[];
  royaltyResourceType?: ResourceType;
  continent?: string;
}

export interface Player {
  id: string;
  username: string;
  cash: number;
  position: number;
  isBankrupt: boolean;
  color: string;
  lapsCompleted: number;
  hasJokerCard: boolean;
}

export interface GameCard {
  id: string;
  type: 'ACTUALITE' | 'JOKER';
  text: string;
}

export type GameStatus = 'LOBBY' | 'PLAYING' | 'AUCTION' | 'FINISHED';

// Interface pour stocker l'état d'une enchère en cours
export interface AuctionState {
  titleIds: string[];
  sellerId: string;
  currentHighestBidderId: string | null;
  currentBid: number;
  playersWhoBidOrPassed: { [playerId: string]: 'BID' | 'PASS' }; // Permet de suivre le tour d'enchère
}

export interface GameState {
  gameId: string;
  status: GameStatus;
  players: Player[];
  currentPlayerIndex: number;
  titles: { [id: string]: Title };
  board: BoardCell[];
  turnNumber: number;
  lastDiceRoll: [number, number] | null;
  log: string[];
  auction: AuctionState | null; // État de l'enchère si status === 'AUCTION'
}
export type GameCardEvent = {
  text: string;
  amount: number;
};
