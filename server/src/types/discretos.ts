export interface DiscretosPlayer {
  id: string;
  username: string;
  color: string;
  role: string; // The goofy role (or "L'Intrus (Discretos)" for the spy)
  isSpy: boolean;
  hasVotedToAccuse: string | null; // ID of player accused by this player during voting stage
}

export interface DiscretosLocation {
  name: string;
  roles: string[];
}

export interface DiscretosClue {
  playerId: string;
  username: string;
  clueText: string;
  round: number;
}

export interface DiscretosGameState {
  status: 'LOBBY' | 'PLAYING' | 'VOTING' | 'FINISHED';
  players: DiscretosPlayer[];
  currentPlayerIndex: number; // For turn-by-turn clue giving
  currentRound: number; // 1, 2, or 3
  location: string | null;
  locationsList: string[];
  clues: DiscretosClue[];
  log: string[];
  winner: 'CITIZENS' | 'SPY' | null;
  winReason: string | null;
}
