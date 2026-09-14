export type PropHuntMapId = 'superette' | 'warehouse' | 'office' | 'lab';

export type PropHuntRole = 'SEEKER' | 'HIDER' | 'SPECTATOR';

export type PropHuntPhase = 'LOBBY' | 'HIDING' | 'HUNTING' | 'FINISHED';

export interface PropDefinition {
  id: string;
  name: string;
  category: string;
  scale: [number, number, number];
  color: string;
}

export interface PropHuntPlayer {
  id: string;
  username: string;
  role: PropHuntRole;
  health: number;
  maxHealth: number;
  position: [number, number, number];
  rotation: [number, number, number];
  currentProp: string; // prop ID
  isFrozen: boolean;
  dashCooldownUntil: number;
  changePropCooldownUntil: number;
  lastTauntTime: number;
  color: string;
  kills: number;
  isHost: boolean;
}

export interface PropHuntTaunt {
  id: string;
  playerId: string;
  position: [number, number, number];
  sound: string;
  timestamp: number;
}

export interface PropHuntGameState {
  roomCode: string;
  phase: PropHuntPhase;
  players: PropHuntPlayer[];
  selectedMap: PropHuntMapId;
  mapVotes: Record<string, PropHuntMapId>; // playerId -> mapId
  hidingTimeRemaining: number;
  roundTimeRemaining: number;
  roundDuration: number;
  hunterId: string | null;
  winner: 'HUNTER' | 'HIDERS' | null;
  activeTaunts: PropHuntTaunt[];
  logs: string[];
}
