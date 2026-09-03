export type CharacterClass = 'barbarian' | 'paladin' | 'rogue' | 'wizard';

export interface CharacterInfo {
  id: CharacterClass;
  name: string;
  title: string;
  avatar: string;
  color: string;
  badgeColor: string;
  description: string;
  playstyle: string;
}

export interface MayhemCard {
  id: string;
  name: string;
  characterClass: CharacterClass;
  type: 'action' | 'defense';
  shieldHp?: number;
  currentShieldHp?: number;
  attack: number;
  heal: number;
  draw: number;
  playAgain: number;
  specialEffect?: 'FIREBALL' | 'SWAP_HP' | 'PICKPOCKET' | 'DESTROY_SHIELD' | 'WAVE_OF_FORCE' | 'RESTORE_SHIELDS';
  description: string;
}

export interface MayhemPlayer {
  id: string;
  username: string;
  color: string;
  characterClass: CharacterClass;
  hp: number;
  maxHp: number;
  shields: MayhemCard[];
  hand: MayhemCard[];
  deckCount: number;
  discardCount: number;
  isEliminated: boolean;
}

export interface MayhemGameState {
  status: 'LOBBY' | 'PLAYING' | 'FINISHED';
  players: MayhemPlayer[];
  currentPlayerIndex: number;
  playsLeft: number;
  winner: MayhemPlayer | null;
  log: string[];
  lastPlayedCard: {
    card: MayhemCard;
    playerName: string;
  } | null;
}
