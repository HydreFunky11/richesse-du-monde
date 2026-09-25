import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import * as THREE from 'three';
import { SERVER_URL } from '../config/serverUrl';

type VehicleType = 'f1' | 'nascar' | 'moto' | 'twingo';
type GameStatus = 'LOBBY' | 'DRAWING' | 'VEHICLE_SELECT' | 'COUNTDOWN' | 'RACING' | 'FINISHED';

interface TrackPoint { x: number; z: number; }
interface Player {
  id: string;
  username: string;
  color: string;
  vehicle: VehicleType | null;
  trackProgress: number;
  lap: number;
  finished: boolean;
  finishTime: number | null;
  position: { x: number; y: number; z: number };
  rotation: number;
  speed: number;
}
interface GameState {
  status: GameStatus;
  players: Player[];
  hostId: string;
  track: TrackPoint[] | null;
  trackLength: number;
  laps: number;
  countdown: number;
  rankings: { playerId: string; username: string; finishTime: number }[];
  log: string[];
}

const VEHICLE_INFO = {
  f1: { name: 'F1', emoji: '🏎️', desc: 'Ultra-rapide, difficile à maîtriser', color: '#EF4444', maxSpeed: 28 },
  nascar: { name: 'NASCAR', emoji: '🏁', desc: 'Rapide, bonne stabilité', color: '#3B82F6', maxSpeed: 22 },
  moto: { name: 'Moto', emoji: '🏍️', desc: 'Agile, vitesse moyenne', color: '#F97316', maxSpeed: 18 },
  twingo: { name: 'Twingo', emoji: '🚗', desc: 'Lente mais facile à contrôler', color: '#10B981', maxSpeed: 14 },
};

// ======= THREE.JS VEHICLE BUILDER =======
function buildVehicleMesh(type: VehicleType, color: string): THREE.Group {
  const group = new THREE.Group();
  const mat = new THREE.MeshPhongMaterial({ color });
  const darkMat = new THREE.MeshPhongMaterial({ color: 0x111111 });
  const glassMat = new THREE.MeshPhongMaterial({ color: 0x88CCFF, transparent: true, opacity: 0.7 });

  if (type === 'f1') {
    // Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.35, 1.4), mat);
    body.position.y = 0.35;
    group.add(body);
    // Nose cone
    const noseGeo = new THREE.CylinderGeometry(0.05, 0.45, 1.2, 6);
    noseGeo.rotateZ(Math.PI / 2);
    const nose = new THREE.Mesh(noseGeo, mat);
    nose.position.set(2.4, 0.3, 0);
    group.add(nose);
    // Cockpit
    const cockpit = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.45, 0.85), glassMat);
    cockpit.position.set(-0.3, 0.7, 0);
    group.add(cockpit);
    // Front wing
    const fWing = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.08, 2.2), mat);
    fWing.position.set(1.95, 0.2, 0);
    group.add(fWing);
    // Rear wing
    const rWing = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.5, 1.8), mat);
    rWing.position.set(-1.85, 0.7, 0);
    group.add(rWing);
    const rWingPost = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.08), darkMat);
    rWingPost.position.set(-1.85, 0.45, 0);
    group.add(rWingPost);
    // 4 Wheels (exposed)
    const wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.45, 12);
    wheelGeo.rotateX(Math.PI / 2);
    const wheelPositions: [number, number, number][] = [
      [1.3, 0.32, 0.9], [1.3, 0.32, -0.9],
      [-1.2, 0.32, 0.95], [-1.2, 0.32, -0.95],
    ];
    for (const [x, y, z] of wheelPositions) {
      const wheel = new THREE.Mesh(wheelGeo, darkMat);
      wheel.position.set(x, y, z);
      group.add(wheel);
    }

  } else if (type === 'nascar') {
    // Main boxy body
    const body = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.7, 1.8), mat);
    body.position.y = 0.55;
    group.add(body);
    // Roof/cabin
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.55, 1.75), mat);
    cabin.position.set(-0.1, 1.15, 0);
    group.add(cabin);
    // Windshield
    const wind = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 1.6), glassMat);
    wind.position.set(0.8, 1.1, 0);
    group.add(wind);
    // 4 wheels inside fenders
    const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.4, 12);
    wheelGeo.rotateX(Math.PI / 2);
    const wPositions: [number, number, number][] = [
      [1.1, 0.35, 0.95], [1.1, 0.35, -0.95],
      [-1.1, 0.35, 0.95], [-1.1, 0.35, -0.95],
    ];
    for (const [x, y, z] of wPositions) {
      const w = new THREE.Mesh(wheelGeo, darkMat);
      w.position.set(x, y, z);
      group.add(w);
    }

  } else if (type === 'moto') {
    // Frame/body
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.5, 0.45), mat);
    frame.position.y = 0.65;
    group.add(frame);
    // Fuel tank / fairing
    const fairing = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.55, 0.48), mat);
    fairing.position.set(0.5, 0.95, 0);
    group.add(fairing);
    // Rider
    const rider = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.7, 0.42), new THREE.MeshPhongMaterial({ color: 0x222222 }));
    rider.position.set(-0.1, 1.35, 0);
    group.add(rider);
    // Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.2, 14);
    wheelGeo.rotateX(Math.PI / 2);
    const fWheel = new THREE.Mesh(wheelGeo, darkMat);
    fWheel.position.set(0.75, 0.38, 0);
    group.add(fWheel);
    const rWheel = new THREE.Mesh(wheelGeo, darkMat);
    rWheel.position.set(-0.75, 0.38, 0);
    group.add(rWheel);
    // Fork
    const fork = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.6, 0.08), darkMat);
    fork.position.set(0.55, 0.65, 0);
    group.add(fork);

  } else {
    // twingo - compact hatchback
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.65, 1.55), mat);
    body.position.y = 0.55;
    group.add(body);
    // Tall cabin
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.7, 1.5), mat);
    cabin.position.set(-0.15, 1.25, 0);
    group.add(cabin);
    // Windshields
    const frontWind = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.62, 1.42), glassMat);
    frontWind.position.set(0.65, 1.22, 0);
    group.add(frontWind);
    const rearWind = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.62, 1.42), glassMat);
    rearWind.position.set(-0.95, 1.22, 0);
    group.add(rearWind);
    // 4 wheels
    const wheelGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.35, 12);
    wheelGeo.rotateX(Math.PI / 2);
    const wPos: [number, number, number][] = [
      [0.9, 0.3, 0.85], [0.9, 0.3, -0.85],
      [-0.9, 0.3, 0.85], [-0.9, 0.3, -0.85],
    ];
    for (const [x, y, z] of wPos) {
      const w = new THREE.Mesh(wheelGeo, darkMat);
      w.position.set(x, y, z);
      group.add(w);
    }
  }

  group.rotation.y = Math.PI; // face forward (along -Z)
  return group;
}

// ======= CIRCUIT DRAWING COMPONENT =======
function CircuitEditor({ isHost, onSubmit }: {
  isHost: boolean;
  onSubmit: (points: TrackPoint[], laps: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const pointsRef = useRef<{ x: number; y: number }[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [laps, setLaps] = useState(3);

  const getCanvasPoint = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    let clientX: number, clientY: number;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const redraw = useCallback((closed: boolean) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background grid
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 50) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 50) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    const pts = pointsRef.current;
    if (pts.length < 2) return;

    // Draw track outline (thick)
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 24;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    if (closed) ctx.lineTo(pts[0].x, pts[0].y);
    ctx.stroke();

    // Draw track surface
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 18;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    if (closed) ctx.lineTo(pts[0].x, pts[0].y);
    ctx.stroke();

    // Center line (dashed)
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.setLineDash([15, 10]);
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    if (closed) ctx.lineTo(pts[0].x, pts[0].y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Start/Finish line
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    const sp = pts[0];
    ctx.moveTo(sp.x - 12, sp.y - 12);
    ctx.lineTo(sp.x + 12, sp.y + 12);
    ctx.stroke();

    // Direction arrow
    if (pts.length > 10) {
      const midIdx = Math.floor(pts.length / 2);
      const a = pts[midIdx];
      const b = pts[Math.min(midIdx + 1, pts.length - 1)];
      const angle = Math.atan2(b.y - a.y, b.x - a.x);
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(angle);
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.moveTo(10, 0); ctx.lineTo(-8, 7); ctx.lineTo(-8, -7);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }, []);

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isHost) return;
    e.preventDefault();
    drawingRef.current = true;
    setIsDrawing(true);
    setHasDrawn(false);
    pointsRef.current = [];
    const pt = getCanvasPoint(e);
    pointsRef.current.push({ x: pt.x, y: pt.y });
    redraw(false);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || !isHost) return;
    e.preventDefault();
    const pt = getCanvasPoint(e);
    const last = pointsRef.current[pointsRef.current.length - 1];
    const dist = Math.sqrt((pt.x - last.x) ** 2 + (pt.y - last.y) ** 2);
    if (dist > 8) {
      pointsRef.current.push({ x: pt.x, y: pt.y });
      redraw(false);
    }
  };

  const endDraw = () => {
    if (!drawingRef.current || !isHost) return;
    drawingRef.current = false;
    setIsDrawing(false);
    if (pointsRef.current.length > 5) {
      setHasDrawn(true);
      redraw(true);
    }
  };

  useEffect(() => {
    redraw(hasDrawn);
  }, [redraw, hasDrawn]);

  const handleSubmit = () => {
    if (!hasDrawn || pointsRef.current.length < 5) return;
    const canvas = canvasRef.current!;
    // Convert canvas coords to world coords (normalize to ~200x200 world units)
    const scaleX = 200 / canvas.width;
    const scaleZ = 200 / canvas.height;
    const worldPoints: TrackPoint[] = pointsRef.current.map(p => ({
      x: (p.x - canvas.width / 2) * scaleX,
      z: (p.y - canvas.height / 2) * scaleZ,
    }));
    onSubmit(worldPoints, laps);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {isHost ? (
        <>
          <p className="text-slate-300 text-center">
            🖊️ <strong>Dessine ton circuit</strong> à la souris (ou au doigt). Trace une forme fermée — elle sera automatiquement lissée.
          </p>
          <canvas
            ref={canvasRef}
            width={700}
            height={500}
            className="border-2 border-slate-600 rounded-xl bg-slate-900 cursor-crosshair touch-none"
            style={{ maxWidth: '100%' }}
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={endDraw}
            onMouseLeave={endDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={endDraw}
          />
          <div className="flex items-center gap-4">
            <label className="text-white">Nombre de tours :</label>
            <input
              type="range" min={1} max={10} value={laps}
              onChange={e => setLaps(Number(e.target.value))}
              className="w-40"
            />
            <span className="text-yellow-400 font-bold text-xl">{laps}</span>
          </div>
          <button
            onClick={handleSubmit}
            disabled={!hasDrawn}
            className="px-8 py-3 bg-green-600 hover:bg-green-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold rounded-xl transition-colors"
          >
            ✅ Valider le Circuit
          </button>
          {isDrawing && <p className="text-yellow-400 text-sm">Relâche la souris pour terminer le tracé</p>}
          {!hasDrawn && !isDrawing && <p className="text-slate-500 text-sm">Trace ton circuit ci-dessus</p>}
        </>
      ) : (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">✏️</div>
          <p className="text-slate-300 text-xl">Le host est en train de dessiner le circuit...</p>
          <div className="animate-pulse mt-4 text-slate-500">En attente</div>
        </div>
      )}
    </div>
  );
}

// ======= VEHICLE SELECT COMPONENT =======
function VehicleSelect({ myId, players, onSelect, isHost, onStartRace }: {
  myId: string;
  players: Player[];
  onSelect: (v: VehicleType) => void;
  isHost: boolean;
  onStartRace: () => void;
}) {
  const me = players.find(p => p.id === myId);
  const allSelected = players.every(p => p.vehicle !== null);

  return (
    <div className="flex flex-col items-center gap-6">
      <h2 className="text-2xl font-bold text-white">🚗 Choisis ton véhicule</h2>
      <div className="grid grid-cols-2 gap-4">
        {(Object.entries(VEHICLE_INFO) as [VehicleType, typeof VEHICLE_INFO.f1][]).map(([type, info]) => (
          <button
            key={type}
            onClick={() => onSelect(type)}
            className={`p-6 rounded-2xl border-2 transition-all text-left ${
              me?.vehicle === type
                ? 'border-green-400 bg-green-950/50 scale-105'
                : 'border-slate-600 bg-slate-800 hover:border-slate-400'
            }`}
          >
            <div className="text-4xl mb-2">{info.emoji}</div>
            <div className="font-bold text-white text-lg">{info.name}</div>
            <div className="text-slate-400 text-sm mt-1">{info.desc}</div>
            <div className="flex items-center gap-1 mt-2">
              <div className="text-xs text-slate-500">Vitesse max :</div>
              <div className="flex-1 bg-slate-700 h-2 rounded-full">
                <div
                  className="h-2 rounded-full"
                  style={{ width: `${(info.maxSpeed / 28) * 100}%`, backgroundColor: info.color }}
                />
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="w-full max-w-md">
        <h3 className="text-slate-400 text-sm mb-2">Joueurs :</h3>
        {players.map(p => (
          <div key={p.id} className="flex items-center gap-3 py-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-white">{p.username}</span>
            <span className="ml-auto text-sm">
              {p.vehicle ? `${VEHICLE_INFO[p.vehicle].emoji} ${VEHICLE_INFO[p.vehicle].name}` : '⏳ En choix...'}
            </span>
          </div>
        ))}
      </div>

      {isHost && (
        <button
          onClick={onStartRace}
          disabled={!allSelected}
          className="px-10 py-4 bg-red-600 hover:bg-red-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold text-xl rounded-2xl transition-colors"
        >
          {allSelected ? '🏁 LANCER LA COURSE !' : '⏳ En attente des sélections...'}
        </button>
      )}
    </div>
  );
}

// ======= 3D RACING SCENE COMPONENT =======
function buildTrackGroup(trackPoints: TrackPoint[]): THREE.Group {
  const group = new THREE.Group();
  const roadMat = new THREE.MeshLambertMaterial({ color: 0x2d3748 });
  const ROAD_WIDTH = 14;
  const pts = trackPoints;

  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const dx = b.x - a.x, dz = b.z - a.z;
    const len = Math.sqrt(dx * dx + dz * dz);
    if (len < 0.01) continue;
    const angle = Math.atan2(dx, dz);

    // Road segment — BoxGeometry, thin slab lying flat
    const seg = new THREE.Mesh(new THREE.BoxGeometry(ROAD_WIDTH, 0.05, len), roadMat);
    seg.position.set((a.x + b.x) / 2, 0.01, (a.z + b.z) / 2);
    seg.rotation.y = angle;
    group.add(seg);

    // Barriers
    const barrierMat = new THREE.MeshPhongMaterial({ color: i % 4 < 2 ? 0xff3333 : 0xffffff });
    const barrierGeo = new THREE.BoxGeometry(len, 0.8, 0.4);
    const barrier1 = new THREE.Mesh(barrierGeo, barrierMat);
    const barrier2 = new THREE.Mesh(barrierGeo, barrierMat);
    const perpX = Math.cos(angle) * (ROAD_WIDTH / 2 + 0.5);
    const perpZ = -Math.sin(angle) * (ROAD_WIDTH / 2 + 0.5);
    barrier1.position.set((a.x + b.x) / 2 + perpX, 0.4, (a.z + b.z) / 2 + perpZ);
    barrier2.position.set((a.x + b.x) / 2 - perpX, 0.4, (a.z + b.z) / 2 - perpZ);
    barrier1.rotation.y = angle;
    barrier2.rotation.y = angle;
    group.add(barrier1);
    group.add(barrier2);
  }

  // Start/finish line
  if (pts.length > 1) {
    const sfMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const startLine = new THREE.Mesh(new THREE.BoxGeometry(ROAD_WIDTH, 0.06, 1.5), sfMat);
    const angle = Math.atan2(pts[1].x - pts[0].x, pts[1].z - pts[0].z);
    startLine.rotation.y = angle;
    startLine.position.set(pts[0].x, 0.02, pts[0].z);
    group.add(startLine);
  }

  return group;
}

function RacingScene({ gameState, myId, onInput }: {
  gameState: GameState;
  myId: string;
  onInput: (throttle: number, steer: number) => void;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const vehicleMeshesRef = useRef<Map<string, THREE.Group>>(new Map());
  const trackGroupRef = useRef<THREE.Group | null>(null);
  const keysRef = useRef({ up: false, down: false, left: false, right: false });
  const animFrameRef = useRef<number>(0);
  const inputIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const trackBuiltRef = useRef(false);

  // Build the 3D scene once
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f1729);
    scene.fog = new THREE.Fog(0x0f1729, 80, 250);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(70, container.clientWidth / container.clientHeight, 0.1, 500);
    camera.position.set(0, 10, 20);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambient);
    const sun = new THREE.DirectionalLight(0xfff8e7, 1.2);
    sun.position.set(50, 100, 50);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 400;
    sun.shadow.camera.left = -150;
    sun.shadow.camera.right = 150;
    sun.shadow.camera.top = 150;
    sun.shadow.camera.bottom = -150;
    scene.add(sun);

    // Ground
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(600, 600),
      new THREE.MeshLambertMaterial({ color: 0x1a3a1a }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Stars
    const starGeo = new THREE.BufferGeometry();
    const starVerts: number[] = [];
    for (let i = 0; i < 2000; i++) {
      starVerts.push(
        (Math.random() - 0.5) * 800,
        Math.random() * 200 + 20,
        (Math.random() - 0.5) * 800,
      );
    }
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starVerts, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.4 })));

    // Animate loop
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const onResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(animFrameRef.current);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []); // only once

  // Update vehicles + track each game state tick
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Build track once
    if (!trackBuiltRef.current && gameState.track && gameState.track.length > 2) {
      const tg = buildTrackGroup(gameState.track);
      scene.add(tg);
      trackGroupRef.current = tg;
      trackBuiltRef.current = true;
    }

    // Update/create vehicle meshes
    const seenIds = new Set<string>();
    for (const player of gameState.players) {
      seenIds.add(player.id);
      let mesh = vehicleMeshesRef.current.get(player.id);
      if (!mesh) {
        const v = player.vehicle || 'twingo';
        mesh = buildVehicleMesh(v, player.color);
        mesh.castShadow = true;
        scene.add(mesh);
        vehicleMeshesRef.current.set(player.id, mesh);
      }
      mesh.position.set(player.position.x, player.position.y, player.position.z);
      mesh.rotation.y = player.rotation + Math.PI; // face forward
    }

    // Remove departed players' meshes
    for (const [pid, mesh] of vehicleMeshesRef.current.entries()) {
      if (!seenIds.has(pid)) {
        scene.remove(mesh);
        vehicleMeshesRef.current.delete(pid);
      }
    }

    // Camera follow local player
    const me = gameState.players.find(p => p.id === myId);
    const camera = cameraRef.current;
    if (me && camera) {
      const behindX = me.position.x - Math.sin(me.rotation) * 12;
      const behindZ = me.position.z - Math.cos(me.rotation) * 12;
      camera.position.lerp(new THREE.Vector3(behindX, me.position.y + 6, behindZ), 0.15);
      camera.lookAt(me.position.x, me.position.y + 1.5, me.position.z);
    }
  }, [gameState.players, gameState.track, myId]);

  // Keyboard input
  useEffect(() => {
    const onKey = (e: KeyboardEvent, down: boolean) => {
      if (['ArrowUp', 'z', 'Z'].includes(e.key)) keysRef.current.up = down;
      if (['ArrowDown', 's', 'S'].includes(e.key)) keysRef.current.down = down;
      if (['ArrowLeft', 'q', 'Q'].includes(e.key)) keysRef.current.left = down;
      if (['ArrowRight', 'd', 'D'].includes(e.key)) keysRef.current.right = down;
    };
    const kd = (e: KeyboardEvent) => onKey(e, true);
    const ku = (e: KeyboardEvent) => onKey(e, false);
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);

    // Send inputs at 20Hz
    inputIntervalRef.current = setInterval(() => {
      const k = keysRef.current;
      const throttle = k.up ? 1 : k.down ? 0 : 0.85; // gentle default throttle
      const steer = k.left ? -1 : k.right ? 1 : 0;
      onInput(throttle, steer);
    }, 50);

    return () => {
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
      if (inputIntervalRef.current) clearInterval(inputIntervalRef.current);
    };
  }, [onInput]);

  const me = gameState.players.find(p => p.id === myId);
  const rankings = [...gameState.players].sort((a, b) => b.trackProgress - a.trackProgress);

  return (
    <div className="relative w-full" style={{ height: '100vh' }}>
      <div ref={mountRef} className="w-full h-full" />

      {/* HUD */}
      <div className="absolute top-4 left-4 bg-black/70 rounded-xl p-3 backdrop-blur">
        <div className="text-yellow-400 font-bold text-xl">Tour {me?.lap ?? 1} / {gameState.laps}</div>
        <div className="text-white text-sm">
          {me?.vehicle ? `${VEHICLE_INFO[me.vehicle].emoji} ${VEHICLE_INFO[me.vehicle].name}` : ''}
        </div>
        <div className="text-slate-300 text-sm mt-1">
          Vitesse : {Math.round((me?.speed ?? 0) * 3.6)} km/h
        </div>
      </div>

      {/* Countdown */}
      {gameState.status === 'COUNTDOWN' && gameState.countdown > 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-8xl font-black text-yellow-400 drop-shadow-2xl animate-pulse">
            {gameState.countdown}
          </div>
        </div>
      )}
      {gameState.status === 'COUNTDOWN' && gameState.countdown === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-7xl font-black text-green-400 drop-shadow-2xl">GO!</div>
        </div>
      )}

      {/* Leaderboard */}
      <div className="absolute top-4 right-4 bg-black/70 rounded-xl p-3 backdrop-blur min-w-44">
        <div className="text-slate-400 text-xs mb-2">Classement</div>
        {rankings.map((p, idx) => (
          <div
            key={p.id}
            className={`flex items-center gap-2 py-1 text-sm ${p.id === myId ? 'text-yellow-400 font-bold' : 'text-white'}`}
          >
            <span className="text-slate-400">{idx + 1}.</span>
            <span>{p.username}</span>
            {p.finished && <span className="text-green-400 ml-auto">✓</span>}
          </div>
        ))}
      </div>

      {/* Controls hint */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 rounded-lg px-4 py-2 text-slate-400 text-xs">
        ↑↓ Accélérer/Freiner • ←→ Braquer • (ZQSD aussi)
      </div>
    </div>
  );
}

// ======= MAIN APP COMPONENT =======
export default function RacingApp() {
  const navigate = useNavigate();
  const socketRef = useRef<Socket | null>(null);
  const [phase, setPhase] = useState<'join' | 'game'>('join');
  const [username, setUsername] = useState(() => localStorage.getItem('racing_username') || '');
  const [roomCode, setRoomCode] = useState('');
  const [myId, setMyId] = useState('');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const s = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      timeout: 60000,
      reconnection: true,
      reconnectionAttempts: 30,
      reconnectionDelay: 1500,
      reconnectionDelayMax: 5000,
    });
    socketRef.current = s;

    s.on('connect', () => {
      console.log('[Racing] Connecté au serveur !', s.id);
      setIsConnected(true);
      setMyId(s.id || '');
      setError('');
    });

    s.on('disconnect', (reason) => {
      console.log('[Racing] Déconnecté:', reason);
      setIsConnected(false);
      if (reason === 'io server disconnect') {
        s.connect();
      }
    });

    s.on('connect_error', (err) => {
      console.error('[Racing] Erreur connexion:', err);
      setIsConnected(false);
      if (err.message.includes('timeout')) {
        setError('Réveil du serveur Render en cours (~30-60s au premier chargement)... Reconnexion automatique...');
      } else {
        setError(`Connexion au serveur : ${err.message}. Nouvelle tentative...`);
      }
    });

    s.on('racingStateUpdate', (state: GameState) => {
      setGameState(state);
      if (s.id && state.players.some(p => p.id === s.id)) {
        setPhase('game');
        setError('');
      }
    });

    s.on('error', (msg: string) => {
      setError(msg);
    });

    return () => {
      s.disconnect();
    };
  }, []);

  const joinGame = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanUser = username.trim();
    const cleanRoom = roomCode.trim().toUpperCase();
    if (!cleanUser) {
      setError('Veuillez entrer votre pseudo');
      return;
    }
    if (!cleanRoom) {
      setError('Veuillez entrer un code de salon');
      return;
    }
    if (!socketRef.current?.connected) {
      setError('Connexion au serveur en cours (réveil Render ~30s)... Veuillez patienter.');
      return;
    }

    localStorage.setItem('racing_username', cleanUser);
    setError('');
    socketRef.current.emit('joinGame', {
      username: cleanUser,
      roomCode: cleanRoom,
      gameType: 'racing',
    });
  };

  const handleSetTrack = useCallback((points: TrackPoint[], laps: number) => {
    socketRef.current?.emit('racing:setTrack', { points, laps });
  }, []);

  const handleSelectVehicle = useCallback((vehicle: VehicleType) => {
    socketRef.current?.emit('racing:selectVehicle', { vehicle });
  }, []);

  const handleStartRace = useCallback(() => {
    socketRef.current?.emit('racing:startRace');
  }, []);

  const handleInput = useCallback((throttle: number, steer: number) => {
    socketRef.current?.emit('racing:input', { throttle, steer });
  }, []);

  const handleReset = useCallback(() => {
    socketRef.current?.emit('racing:reset');
  }, []);

  // ─── Join screen ─────────────────────────────────────────────────────────
  if (phase === 'join') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md p-8 bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl">
          <button
            onClick={() => navigate('/')}
            className="text-slate-400 hover:text-white text-sm mb-6 flex items-center gap-1 transition-colors"
          >
            ← Accueil
          </button>
          <div className="text-5xl mb-3 text-center">🏁</div>
          <h1 className="text-3xl font-black text-white text-center mb-1">Course Libre</h1>
          <p className="text-slate-400 text-center text-sm mb-4">
            Dessine ton circuit, choisis ton véhicule, fonce !
          </p>

          {/* Server connection indicator */}
          <div className="flex items-center justify-center gap-2 mb-6 text-xs font-bold">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isConnected ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-amber-400 animate-ping'
              }`}
            />
            <span className={isConnected ? 'text-emerald-400' : 'text-amber-300'}>
              {isConnected ? 'Serveur en ligne' : 'Connexion au serveur... (hébergement Render)'}
            </span>
          </div>

          {error && (
            <div className="bg-red-900/50 border border-red-500 text-red-300 p-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={joinGame} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Votre Pseudo
              </label>
              <input
                className="w-full bg-slate-800 border border-slate-600 text-white p-3 rounded-xl focus:border-red-500 focus:outline-none transition"
                placeholder="Ex: MaxVerstappen"
                maxLength={16}
                value={username}
                onChange={e => setUsername(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Code du Salon
              </label>
              <input
                className="w-full bg-slate-800 border border-slate-600 text-white p-3 rounded-xl uppercase font-mono focus:border-red-500 focus:outline-none transition"
                placeholder="Ex: CIRCUIT1"
                maxLength={10}
                value={roomCode}
                onChange={e => setRoomCode(e.target.value.toUpperCase())}
              />
            </div>
            <button
              type="submit"
              disabled={!isConnected}
              className={`w-full py-4 font-bold text-lg rounded-xl transition-all shadow-xl cursor-pointer ${
                isConnected
                  ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/30'
                  : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-80'
              }`}
            >
              {isConnected ? 'Rejoindre / Créer une Course 🏁' : 'Connexion au serveur en cours... ⏳'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        Connexion...
      </div>
    );
  }

  const isHost = gameState.hostId === myId;

  // ─── 3D Race ─────────────────────────────────────────────────────────────
  if (gameState.status === 'RACING' || gameState.status === 'COUNTDOWN') {
    return <RacingScene gameState={gameState} myId={myId} onInput={handleInput} />;
  }

  // ─── Finished ────────────────────────────────────────────────────────────
  if (gameState.status === 'FINISHED') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🏆</div>
          <h2 className="text-4xl font-black text-white mb-6">Fin de Course !</h2>
          <div className="bg-slate-900 rounded-2xl p-6 mb-6">
            {gameState.rankings.map((r, i) => (
              <div
                key={r.playerId}
                className={`flex items-center gap-4 py-3 text-xl ${
                  i === 0 ? 'text-yellow-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-600' : 'text-slate-500'
                }`}
              >
                <span className="text-2xl">{['🥇', '🥈', '🥉'][i] ?? `${i + 1}.`}</span>
                <span className="font-bold">{r.username}</span>
              </div>
            ))}
          </div>
          {isHost && (
            <button
              onClick={handleReset}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl"
            >
              🔄 Rejouer
            </button>
          )}
        </div>
      </div>
    );
  }

  // ─── Lobby / Drawing / Vehicle Select ────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate('/')} className="text-slate-400 hover:text-white text-sm">
            ← Accueil
          </button>
          <div className="flex-1" />
          <div className="text-slate-400 text-sm">
            Salon : <span className="text-white font-mono font-bold">{roomCode}</span>
          </div>
        </div>

        {/* LOBBY */}
        {gameState.status === 'LOBBY' && (
          <div className="text-center">
            <div className="text-5xl mb-3">🏁</div>
            <h1 className="text-3xl font-black mb-2">Course Libre</h1>
            <p className="text-slate-400 mb-8">
              {isHost
                ? 'Tu es le host. Clique sur "Dessiner le circuit" quand tout le monde est là.'
                : 'En attente du host...'}
            </p>
            <div className="mb-6">
              {gameState.players.map(p => (
                <div key={p.id} className="flex items-center gap-3 py-2 justify-center">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                  <span>{p.username}</span>
                  {p.id === gameState.hostId && (
                    <span className="text-xs text-yellow-400 ml-1">👑 HOST</span>
                  )}
                </div>
              ))}
            </div>
            {isHost && (
              <button
                onClick={() => socketRef.current?.emit('racing:startDrawing')}
                className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg rounded-2xl"
              >
                ✏️ Dessiner le Circuit
              </button>
            )}
          </div>
        )}

        {/* DRAWING */}
        {gameState.status === 'DRAWING' && (
          <CircuitEditor isHost={isHost} onSubmit={handleSetTrack} />
        )}

        {/* VEHICLE SELECT */}
        {gameState.status === 'VEHICLE_SELECT' && (
          <VehicleSelect
            myId={myId}
            players={gameState.players}
            onSelect={handleSelectVehicle}
            isHost={isHost}
            onStartRace={handleStartRace}
          />
        )}

        {/* Log */}
        {gameState.log.length > 0 && (
          <div className="mt-8 bg-slate-900 rounded-xl p-4 max-h-40 overflow-y-auto">
            {gameState.log.map((l, i) => (
              <div key={i} className="text-slate-400 text-sm py-0.5">{l}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
