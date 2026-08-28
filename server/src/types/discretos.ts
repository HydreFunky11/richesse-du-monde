export interface DiscretosPlayer {
  id: string;
  username: string;
  color: string;
  role: string; // The character name assigned to this player (or "L'Intrus 🥸" for the spy, who has their own character)
  isSpy: boolean;
  hasVotedToAccuse: string | null; // ID of player accused by this player during voting stage
}

export interface DiscretosTheme {
  name: string;       // Theme name, e.g. "🧙 Sorciers / Vieux Sages"
  characters: string[]; // Pool of characters for this theme
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
  location: string | null;      // The citizen character name (kept as "location" for backward compat)
  spyCharacter: string | null;  // The impostor's different character from the same theme
  themeName: string | null;     // The theme name, shown to everyone
  locationsList: string[];      // List of theme names for reference panel
  clues: DiscretosClue[];
  log: string[];
  winner: 'CITIZENS' | 'SPY' | null;
  winReason: string | null;
}
