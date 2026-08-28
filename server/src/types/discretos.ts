export interface DiscretosPlayer {
  id: string;
  username: string;
  color: string;
  role: string; // The goofy role (or "L'Intrus (Discretos)" for the spy)
  isSpy: boolean;
  hasVotedToAccuse: string | null; // ID of player accused by this player
}

export interface DiscretosLocation {
  name: string;
  roles: string[];
}

export interface DiscretosGameState {
  status: 'LOBBY' | 'PLAYING' | 'REVEAL' | 'FINISHED';
  players: DiscretosPlayer[];
  location: string | null; // Null for everyone during lobby, and hidden from the spy during playing
  locationsList: string[]; // List of all possible locations for reference
  timerDuration: number; // in seconds (e.g. 300)
  timerRemaining: number; // in seconds
  timerActive: boolean;
  log: string[];
  winner: 'CITIZENS' | 'SPY' | null;
  winReason: string | null;
}
