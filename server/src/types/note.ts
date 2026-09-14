export type NotePhase =
  | 'LOBBY'
  | 'CHOOSING_QUESTION'
  | 'ANSWERING'
  | 'GUESSING'
  | 'REVEAL'
  | 'FINISHED';

export interface NoteRoundHistory {
  round: number;
  question: string;
  secretRating: number;
  guess: number;
  points: number;
  diff: number;
}

export interface NotePlayer {
  id: string;
  username: string;
  color: string;
  avatar: string;
  isBot: boolean;
  score: number;
  hasAnswered: boolean;
  history: NoteRoundHistory[];
}

export interface NoteAnswer {
  playerId: string;
  username: string;
  color: string;
  avatar: string;
  text: string;
  timestamp: number;
}

export interface NoteGameState {
  roomCode: string;
  phase: NotePhase;
  players: NotePlayer[];
  currentRound: number; // 1 to 5
  maxRounds: number;    // 5
  activePlayerIndex: number;
  secretRating: number | null; // Hidden from active player until REVEAL
  currentQuestion: string | null;
  questionOptions: string[];
  usedQuestions: string[];
  answers: NoteAnswer[];
  guess: number | null;
  pointsAwarded: number | null;
  guessDiff: number | null;
  winner: NotePlayer | null;
  log: string[];
}
