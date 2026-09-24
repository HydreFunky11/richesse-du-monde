export type VehicleType = 'f1' | 'nascar' | 'moto' | 'twingo';

export interface TrackPoint {
  x: number;
  z: number;
}

export interface RacingPlayer {
  id: string;
  username: string;
  color: string;
  vehicle: VehicleType | null;
  // Position along track (0 to totalLength * laps)
  trackProgress: number; // distance traveled along the spline
  lap: number; // current lap (1-indexed)
  finished: boolean;
  finishTime: number | null;
  position: { x: number; y: number; z: number };
  rotation: number; // yaw in radians
  speed: number;
}

export interface RacingGameState {
  status: 'LOBBY' | 'DRAWING' | 'VEHICLE_SELECT' | 'COUNTDOWN' | 'RACING' | 'FINISHED';
  players: RacingPlayer[];
  hostId: string;
  track: TrackPoint[] | null; // smoothed track points (closed loop)
  trackLength: number; // total track length in world units
  laps: number; // total laps to race
  countdown: number; // 3..0
  rankings: { playerId: string; username: string; finishTime: number }[];
  log: string[];
}
