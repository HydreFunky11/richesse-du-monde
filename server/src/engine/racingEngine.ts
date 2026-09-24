import { RacingGameState, RacingPlayer, TrackPoint, VehicleType } from '../types/racing';

const VEHICLE_SPEEDS: Record<VehicleType, number> = {
  f1: 28,      // fastest, hardest to steer
  nascar: 22,  // fast, moderate handling
  moto: 18,    // medium speed, good handling
  twingo: 14,  // slowest, best handling
};

const VEHICLE_HANDLING: Record<VehicleType, number> = {
  f1: 0.8,
  nascar: 1.1,
  moto: 1.4,
  twingo: 1.8,
};

export class RacingEngine {
  private state: RacingGameState;
  private onUpdate: (state: RacingGameState) => void;
  private gameLoop: NodeJS.Timeout | null = null;
  private splinePoints: TrackPoint[] = [];
  private cumulativeLengths: number[] = []; // cumulative arc length at each spline point
  private lastTick: number = 0;
  private playerInputs: Map<string, { throttle: number; steer: number }> = new Map();

  constructor(roomCode: string, onUpdate: (state: RacingGameState) => void) {
    this.onUpdate = onUpdate;
    this.state = {
      status: 'LOBBY',
      players: [],
      hostId: '',
      track: null,
      trackLength: 0,
      laps: 3,
      countdown: 3,
      rankings: [],
      log: ['En attente de joueurs...'],
    };
  }

  addPlayer(socketId: string, username: string, color: string): boolean {
    if (this.state.players.length >= 8) return false;
    if (this.state.status !== 'LOBBY') return false;
    if (this.state.players.find(p => p.id === socketId)) return false;

    const player: RacingPlayer = {
      id: socketId,
      username,
      color,
      vehicle: null,
      trackProgress: 0,
      lap: 1,
      finished: false,
      finishTime: null,
      position: { x: 0, y: 0, z: 0 },
      rotation: 0,
      speed: 0,
    };

    this.state.players.push(player);
    if (!this.state.hostId) this.state.hostId = socketId;
    this.log(`${username} a rejoint la course`);
    return true;
  }

  removePlayer(socketId: string) {
    this.state.players = this.state.players.filter(p => p.id !== socketId);
    if (this.state.hostId === socketId && this.state.players.length > 0) {
      this.state.hostId = this.state.players[0].id;
    }
    this.playerInputs.delete(socketId);
  }

  startDrawing() {
    if (this.state.status !== 'LOBBY') return;
    this.state.status = 'DRAWING';
    this.log('Le host dessine le circuit...');
  }

  setTrack(points: TrackPoint[], laps: number) {
    if (this.state.status !== 'DRAWING') return;
    // Smooth and close the track using Catmull-Rom-like interpolation
    const smoothed = this.smoothAndCloseTrack(points);
    this.splinePoints = smoothed;
    this.cumulativeLengths = this.computeArcLengths(smoothed);
    const totalLength = this.cumulativeLengths[this.cumulativeLengths.length - 1] || 1;
    this.state.track = smoothed;
    this.state.trackLength = totalLength;
    this.state.laps = Math.max(1, Math.min(10, laps));
    this.state.status = 'VEHICLE_SELECT';
    this.log(`Circuit dessiné ! Longueur: ${Math.round(totalLength)}m, ${this.state.laps} tours`);
  }

  private smoothAndCloseTrack(rawPoints: TrackPoint[]): TrackPoint[] {
    if (rawPoints.length < 3) return rawPoints;
    // Subsample to ~80 points max
    const subsampled = this.subsample(rawPoints, 80);
    // Close by connecting last to first
    const closed = [...subsampled, subsampled[0]];
    // Apply multiple rounds of smoothing
    let result = closed;
    for (let i = 0; i < 3; i++) {
      result = this.laplacianSmooth(result);
    }
    return result;
  }

  private subsample(points: TrackPoint[], maxCount: number): TrackPoint[] {
    if (points.length <= maxCount) return points;
    const step = points.length / maxCount;
    const result: TrackPoint[] = [];
    for (let i = 0; i < maxCount; i++) {
      result.push(points[Math.floor(i * step)]);
    }
    return result;
  }

  private laplacianSmooth(points: TrackPoint[]): TrackPoint[] {
    const n = points.length;
    return points.map((p, i) => {
      const prev = points[(i - 1 + n) % n];
      const next = points[(i + 1) % n];
      return {
        x: p.x * 0.5 + prev.x * 0.25 + next.x * 0.25,
        z: p.z * 0.5 + prev.z * 0.25 + next.z * 0.25,
      };
    });
  }

  private computeArcLengths(points: TrackPoint[]): number[] {
    const lengths = [0];
    for (let i = 1; i < points.length; i++) {
      const dx = points[i].x - points[i - 1].x;
      const dz = points[i].z - points[i - 1].z;
      lengths.push(lengths[i - 1] + Math.sqrt(dx * dx + dz * dz));
    }
    return lengths;
  }

  selectVehicle(socketId: string, vehicle: VehicleType) {
    const player = this.state.players.find(p => p.id === socketId);
    if (!player) return;
    player.vehicle = vehicle;
    this.log(`${player.username} a choisi ${vehicle.toUpperCase()}`);
  }

  startRace() {
    if (this.state.status !== 'VEHICLE_SELECT') return;
    if (!this.state.track || this.state.track.length === 0) return;

    // Set all players without vehicle to a default
    this.state.players.forEach(p => {
      if (!p.vehicle) p.vehicle = 'twingo';
    });

    // Place players at start positions (spaced along first segment)
    const startPoint = this.splinePoints[0];
    const secondPoint = this.splinePoints[1] || { x: startPoint.x + 1, z: startPoint.z };
    const angle = Math.atan2(secondPoint.x - startPoint.x, secondPoint.z - startPoint.z);

    this.state.players.forEach((player, idx) => {
      const offset = (idx - (this.state.players.length - 1) / 2) * 2.5;
      const perpX = Math.cos(angle) * offset;
      const perpZ = -Math.sin(angle) * offset;
      player.position = {
        x: startPoint.x + perpX - Math.sin(angle) * idx * 4,
        y: 0,
        z: startPoint.z + perpZ - Math.cos(angle) * idx * 4,
      };
      player.rotation = angle;
      player.trackProgress = -idx * 4;
      player.lap = 1;
      player.finished = false;
      player.finishTime = null;
      player.speed = 0;
    });

    this.state.status = 'COUNTDOWN';
    this.state.countdown = 3;
    this.state.rankings = [];

    // Countdown then start
    let count = 3;
    const countInterval = setInterval(() => {
      this.state.countdown = count;
      this.onUpdate(this.state);
      count--;
      if (count < 0) {
        clearInterval(countInterval);
        this.state.status = 'RACING';
        this.state.countdown = 0;
        this.lastTick = Date.now();
        this.startGameLoop();
        this.onUpdate(this.state);
      }
    }, 1000);
  }

  private startGameLoop() {
    this.lastTick = Date.now();
    this.gameLoop = setInterval(() => {
      const now = Date.now();
      const dt = Math.min((now - this.lastTick) / 1000, 0.1);
      this.lastTick = now;
      this.tick(dt);
    }, 50); // 20 Hz tick
  }

  setInput(socketId: string, throttle: number, steer: number) {
    this.playerInputs.set(socketId, { throttle, steer });
  }

  private tick(dt: number) {
    if (this.state.status !== 'RACING') return;

    const totalTrackLen = this.state.trackLength;
    const totalDist = totalTrackLen * this.state.laps;

    let allFinished = true;

    for (const player of this.state.players) {
      if (player.finished) continue;
      allFinished = false;

      const vehicle = player.vehicle || 'twingo';
      const maxSpeed = VEHICLE_SPEEDS[vehicle];
      const input = this.playerInputs.get(player.id) || { throttle: 0.8, steer: 0 };

      // Accelerate / decelerate
      const targetSpeed = maxSpeed * Math.max(0, Math.min(1, input.throttle));
      const accel = vehicle === 'f1' ? 15 : vehicle === 'nascar' ? 10 : 8;
      if (player.speed < targetSpeed) {
        player.speed = Math.min(player.speed + accel * dt, targetSpeed);
      } else {
        player.speed = Math.max(player.speed - accel * 0.5 * dt, targetSpeed);
      }

      // Advance along track
      player.trackProgress += player.speed * dt;

      // Compute current lap
      player.lap = Math.min(this.state.laps, Math.floor(player.trackProgress / totalTrackLen) + 1);

      // Update position from spline
      const loopedProgress = ((player.trackProgress % totalTrackLen) + totalTrackLen) % totalTrackLen;
      const pos = this.getPositionOnTrack(loopedProgress);
      const tangent = this.getTangentOnTrack(loopedProgress);

      // Apply steering as lateral offset
      const handling = VEHICLE_HANDLING[vehicle];
      const steer = Math.max(-1, Math.min(1, input.steer || 0));
      const lateralOffset = steer * handling * 3;

      player.position = {
        x: pos.x + Math.cos(tangent) * lateralOffset,
        y: 0,
        z: pos.z - Math.sin(tangent) * lateralOffset,
      };
      player.rotation = tangent;

      // Check finish
      if (player.trackProgress >= totalDist) {
        player.finished = true;
        player.finishTime = Date.now();
        const rank = this.state.rankings.length + 1;
        this.state.rankings.push({ playerId: player.id, username: player.username, finishTime: player.finishTime });
        this.log(`🏆 ${player.username} termine ${rank}${rank === 1 ? 'er' : 'ème'} !`);
      }
    }

    if (allFinished || this.state.players.filter(p => !p.finished).length === 0) {
      this.state.status = 'FINISHED';
      if (this.gameLoop) { clearInterval(this.gameLoop); this.gameLoop = null; }
    }

    this.onUpdate(this.state);
  }

  private getPositionOnTrack(dist: number): TrackPoint {
    const lengths = this.cumulativeLengths;
    const points = this.splinePoints;
    if (!points.length) return { x: 0, z: 0 };

    // Binary search for segment
    let lo = 0, hi = lengths.length - 1;
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1;
      if (lengths[mid] <= dist) lo = mid;
      else hi = mid;
    }
    const t = lengths[lo] === lengths[hi] ? 0 : (dist - lengths[lo]) / (lengths[hi] - lengths[lo]);
    const a = points[lo % points.length];
    const b = points[hi % points.length];
    return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
  }

  private getTangentOnTrack(dist: number): number {
    const eps = 0.5;
    const a = this.getPositionOnTrack(Math.max(0, dist - eps));
    const b = this.getPositionOnTrack(Math.min(this.state.trackLength - 0.01, dist + eps));
    return Math.atan2(b.x - a.x, b.z - a.z);
  }

  resetToLobby() {
    if (this.gameLoop) { clearInterval(this.gameLoop); this.gameLoop = null; }
    const players = this.state.players.map(p => ({ ...p, vehicle: null, trackProgress: 0, lap: 1, finished: false, finishTime: null, speed: 0 }));
    this.state = {
      status: 'LOBBY',
      players,
      hostId: this.state.hostId,
      track: null,
      trackLength: 0,
      laps: 3,
      countdown: 3,
      rankings: [],
      log: ['Nouvelle partie ! En attente du tracé de circuit...'],
    };
    this.playerInputs.clear();
    this.splinePoints = [];
    this.cumulativeLengths = [];
  }

  getState(): RacingGameState { return this.state; }
  getPlayers() { return this.state.players; }

  private log(msg: string) {
    this.state.log = [msg, ...this.state.log.slice(0, 19)];
  }

  destroy() {
    if (this.gameLoop) { clearInterval(this.gameLoop); this.gameLoop = null; }
  }
}
