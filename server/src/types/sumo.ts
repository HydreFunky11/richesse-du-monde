export type SumoPlayerSide = 'left' | 'right';
export type SumoEventState = 'NORMAL' | 'FEINT' | 'TURBO' | 'SWITCH_WARNING';

export interface SumoPlayer {
  id: string;
  username: string;
  side: SumoPlayerSide;
  color: string;
  score: number;
  currentKey: string;
  cps: number;
  isStunned: boolean;
  stunTimer: number;
  totalPushes: number;
}

export interface SumoGameState {
  status: 'LOBBY' | 'COUNTDOWN' | 'PLAYING' | 'ROUND_END' | 'MATCH_FINISHED';
  roomCode: string;
  players: SumoPlayer[];
  position: number; // 0 to 100, 50 is center. <= 0: Right wins round. >= 100: Left wins round.
  targetScore: number; // First to 3 (BO5)
  currentRound: number;
  countdown: number;
  eventState: SumoEventState;
  eventTimer: number;
  lastEventNotice: string | null;
  roundWinner: SumoPlayerSide | null;
  matchWinner: SumoPlayerSide | null;
  spectators: { id: string; username: string }[];
}
