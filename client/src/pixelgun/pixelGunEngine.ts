import * as THREE from 'three';
import type { TargetDummy, FloatingText, ParticleVoxel, BulletTracer, JumpPad, GameStats } from './pixelGunTypes';
import { pixelGunSound } from './pixelGunSound';

export class PixelGunEngine {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;

  // Viewmodel (Gun attached to player's view)
  public gunGroup: THREE.Group;
  public muzzleFlashMesh: THREE.Mesh;
  public muzzleLight: THREE.PointLight;
  private gunBasePos = new THREE.Vector3(0.24, -0.22, -0.45);
  private gunRecoilZ = 0;
  private gunRecoilRotX = 0;
  private walkBobTimer = 0;

  // Player & Controls
  public position = new THREE.Vector3(0, 1.8, 15);
  public velocity = new THREE.Vector3(0, 0, 0);
  public yaw = 0;
  public pitch = 0;
  public isGrounded = false;
  public isLocked = false;
  public sensitivity = 0.0022;

  public keys = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false,
    sprint: false
  };

  // Game Stats
  public stats: GameStats = {
    score: 0,
    kills: 0,
    headshots: 0,
    shotsFired: 0,
    shotsHit: 0,
    ammo: 30,
    maxAmmo: 30,
    isReloading: false,
    reloadProgress: 0,
    hp: 100,
    maxHp: 100,
    shield: 100,
    maxShield: 100
  };

  // World objects
  private colliders: THREE.Box3[] = [];
  public dummies: TargetDummy[] = [];
  private jumpPads: JumpPad[] = [];
  private particles: ParticleVoxel[] = [];
  private tracers: BulletTracer[] = [];
  public floatingTexts: FloatingText[] = [];

  // Weapon fire rate control
  private lastShootTime = 0;
  private shootCooldownMs = 120; // Fast assault rifle fire rate (~500 RPM)
  public isMouseDown = false;
  private reloadDuration = 1.2; // 1.2s reload
  private reloadTimer = 0;

  // Clouds
  private clouds: THREE.Group[] = [];

  // Raycasting
  private raycaster = new THREE.Raycaster();
  private centerScreen = new THREE.Vector2(0, 0);

  // Callbacks to UI
  public onHitmarker: ((isHeadshot: boolean) => void) | null = null;
  public onStatsChange: ((stats: GameStats) => void) | null = null;

  private isDisposed = false;
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    // 1. SCENE SETUP
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x7ec0ee); // Pixel Gun vibrant sky blue
    this.scene.fog = new THREE.FogExp2(0x7ec0ee, 0.012);

    // 2. CAMERA SETUP
    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 500);
    this.camera.position.copy(this.position);

    // 3. RENDERER SETUP
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    // 4. LIGHTS
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    this.scene.add(ambientLight);

    const sun = new THREE.DirectionalLight(0xfff7e6, 1.2);
    sun.position.set(40, 70, 30);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 250;
    const d = 45;
    sun.shadow.camera.left = -d;
    sun.shadow.camera.right = d;
    sun.shadow.camera.top = d;
    sun.shadow.camera.bottom = -d;
    this.scene.add(sun);

    // 5. BUILD VOXEL GUN VIEWMODEL
    const { gun, muzzleFlash, muzzleLight } = this.createVoxelGun();
    this.gunGroup = gun;
    this.muzzleFlashMesh = muzzleFlash;
    this.muzzleLight = muzzleLight;
    this.camera.add(this.gunGroup);
    this.scene.add(this.camera);

    // 6. BUILD ARENA & TARGETS
    this.buildArena();
    this.spawnDummies();
    this.createClouds();

    // 7. EVENT LISTENERS
    this.initControls();
  }

  // ─── VOXEL GUN MODEL (Pixel Gun 3D Style) ──────────────────────────────────
  private createVoxelGun() {
    const gun = new THREE.Group();

    // Pixelated materials
    const redMat = new THREE.MeshLambertMaterial({ color: 0xd32f2f }); // Primary body
    const darkMat = new THREE.MeshLambertMaterial({ color: 0x212121 }); // Frame / barrel
    const goldMat = new THREE.MeshLambertMaterial({ color: 0xffb300 }); // Gold trim
    const magMat = new THREE.MeshLambertMaterial({ color: 0x424242 }); // Magazine
    const sightMat = new THREE.MeshLambertMaterial({ color: 0x00e676 }); // Neon green sights

    // Main Receiver Body
    const bodyGeo = new THREE.BoxGeometry(0.09, 0.12, 0.36);
    const body = new THREE.Mesh(bodyGeo, redMat);
    body.position.set(0, 0, 0);
    gun.add(body);

    // Top rail / Gold stripes
    const railGeo = new THREE.BoxGeometry(0.07, 0.03, 0.34);
    const rail = new THREE.Mesh(railGeo, goldMat);
    rail.position.set(0, 0.07, 0);
    gun.add(rail);

    // Front Barrel
    const barrelGeo = new THREE.BoxGeometry(0.05, 0.05, 0.28);
    const barrel = new THREE.Mesh(barrelGeo, darkMat);
    barrel.position.set(0, 0.03, -0.28);
    gun.add(barrel);

    // Muzzle tip / flash hider
    const tipGeo = new THREE.BoxGeometry(0.065, 0.065, 0.06);
    const tip = new THREE.Mesh(tipGeo, goldMat);
    tip.position.set(0, 0.03, -0.44);
    gun.add(tip);

    // Curved Banana Magazine
    const magGeo = new THREE.BoxGeometry(0.055, 0.18, 0.09);
    const mag = new THREE.Mesh(magGeo, magMat);
    mag.position.set(0, -0.12, -0.06);
    mag.rotation.x = 0.25;
    gun.add(mag);

    // Handle / Grip
    const gripGeo = new THREE.BoxGeometry(0.06, 0.14, 0.07);
    const grip = new THREE.Mesh(gripGeo, darkMat);
    grip.position.set(0, -0.11, 0.1);
    grip.rotation.x = -0.3;
    gun.add(grip);

    // Stock
    const stockGeo = new THREE.BoxGeometry(0.07, 0.09, 0.18);
    const stock = new THREE.Mesh(stockGeo, redMat);
    stock.position.set(0, -0.02, 0.24);
    gun.add(stock);

    // Holographic Sight
    const sightGeo = new THREE.BoxGeometry(0.03, 0.04, 0.04);
    const sight = new THREE.Mesh(sightGeo, sightMat);
    sight.position.set(0, 0.1, -0.1);
    gun.add(sight);

    // Muzzle Flash
    const flashGeo = new THREE.BoxGeometry(0.14, 0.14, 0.14);
    const flashMat = new THREE.MeshBasicMaterial({ color: 0xffea00, transparent: true, opacity: 0 });
    const muzzleFlash = new THREE.Mesh(flashGeo, flashMat);
    muzzleFlash.position.set(0, 0.03, -0.52);
    gun.add(muzzleFlash);

    const muzzleLight = new THREE.PointLight(0xffea00, 0, 8);
    muzzleLight.position.copy(muzzleFlash.position);
    gun.add(muzzleLight);

    gun.position.copy(this.gunBasePos);
    return { gun, muzzleFlash, muzzleLight };
  }

  // ─── ARENA BUILDER ────────────────────────────────────────────────────────
  private buildArena() {
    // Shared materials
    const grassLight = new THREE.MeshLambertMaterial({ color: 0x4caf50 });
    const stoneMat = new THREE.MeshLambertMaterial({ color: 0x78909c });
    const stoneDark = new THREE.MeshLambertMaterial({ color: 0x546e7a });
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x8d6e63 });
    const woodDark = new THREE.MeshLambertMaterial({ color: 0x6d4c41 });

    // Ground (80x80 blocks)
    const arenaSize = 80;
    const blockSize = 2;
    const half = arenaSize / 2;

    // Ground plane with shadows
    const groundMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(arenaSize * blockSize, arenaSize * blockSize),
      grassLight
    );
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.receiveShadow = true;
    this.scene.add(groundMesh);

    // Perimeter Walls (4 blocks high)
    const wallH = 8;
    const wallThick = 2;
    const wallLen = arenaSize * blockSize;

    const createWall = (x: number, z: number, w: number, d: number) => {
      const geo = new THREE.BoxGeometry(w, wallH, d);
      const mesh = new THREE.Mesh(geo, stoneDark);
      mesh.position.set(x, wallH / 2, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      this.colliders.push(new THREE.Box3().setFromObject(mesh));
    };

    createWall(0, -half * blockSize, wallLen + wallThick * 2, wallThick); // North
    createWall(0, half * blockSize, wallLen + wallThick * 2, wallThick);  // South
    createWall(-half * blockSize, 0, wallThick, wallLen);                 // West
    createWall(half * blockSize, 0, wallThick, wallLen);                  // East

    // Elevated Sniper Towers with Ramps
    this.buildTower(-25, -25, stoneMat);
    this.buildTower(25, -25, stoneMat);
    this.buildTower(0, 30, stoneMat);

    // Stacked Wooden Crates in center & courtyard
    this.createCrateCluster(-6, 0, woodMat, woodDark);
    this.createCrateCluster(8, -8, woodMat, woodDark);
    this.createCrateCluster(-14, 12, woodMat, woodDark);
    this.createCrateCluster(16, 14, woodMat, woodDark);

    // Jump Pads (launch player into the air)
    this.createJumpPad(0, 0, 22);
    this.createJumpPad(-18, -10, 20);
    this.createJumpPad(18, 10, 20);
  }

  private buildTower(x: number, z: number, mat: THREE.Material) {
    // Central Pillar
    const towerH = 6;
    const pillarGeo = new THREE.BoxGeometry(8, towerH, 8);
    const pillar = new THREE.Mesh(pillarGeo, mat);
    pillar.position.set(x, towerH / 2, z);
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    this.scene.add(pillar);
    this.colliders.push(new THREE.Box3().setFromObject(pillar));

    // Guard rails
    const railMat = new THREE.MeshLambertMaterial({ color: 0x37474f });
    const railNorth = new THREE.Mesh(new THREE.BoxGeometry(8, 1.2, 0.6), railMat);
    railNorth.position.set(x, towerH + 0.6, z - 3.7);
    this.scene.add(railNorth);
    this.colliders.push(new THREE.Box3().setFromObject(railNorth));

    // Ramp to climb up
    const rampLen = 14;
    const rampGeo = new THREE.BoxGeometry(3.5, 0.6, rampLen);
    const ramp = new THREE.Mesh(rampGeo, mat);
    ramp.position.set(x, towerH / 2, z + 4 + rampLen / 2 - 1);
    ramp.rotation.x = Math.atan2(towerH, rampLen);
    ramp.castShadow = true;
    ramp.receiveShadow = true;
    this.scene.add(ramp);
    this.colliders.push(new THREE.Box3().setFromObject(ramp));
  }

  private createCrateCluster(x: number, z: number, mat1: THREE.Material, mat2: THREE.Material) {
    const size = 2.4;
    const crateGeo = new THREE.BoxGeometry(size, size, size);

    const addCrate = (cx: number, cy: number, cz: number) => {
      const c = new THREE.Mesh(crateGeo, Math.random() > 0.5 ? mat1 : mat2);
      c.position.set(cx, cy + size / 2, cz);
      c.castShadow = true;
      c.receiveShadow = true;
      this.scene.add(c);
      this.colliders.push(new THREE.Box3().setFromObject(c));
    };

    addCrate(x, 0, z);
    addCrate(x + size, 0, z);
    addCrate(x, 0, z + size);
    addCrate(x + 0.5, size, z + 0.5); // Second layer
  }

  private createJumpPad(x: number, z: number, boostVelocity: number) {
    const pad = new THREE.Group();

    // Base plate
    const baseGeo = new THREE.BoxGeometry(3.6, 0.3, 3.6);
    const baseMat = new THREE.MeshLambertMaterial({ color: 0x263238 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    pad.add(base);

    // Glowing Neon Center Arrow
    const neonGeo = new THREE.BoxGeometry(2.4, 0.35, 2.4);
    const neonMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
    const neon = new THREE.Mesh(neonGeo, neonMat);
    pad.add(neon);

    pad.position.set(x, 0.15, z);
    this.scene.add(pad);

    this.jumpPads.push({
      mesh: pad,
      x,
      y: 0.15,
      z,
      radius: 2.2,
      boostVelocity,
      cooldown: 0
    });
  }

  private createClouds() {
    const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });

    for (let i = 0; i < 15; i++) {
      const cloud = new THREE.Group();
      const numBlocks = 4 + Math.floor(Math.random() * 5);
      for (let j = 0; j < numBlocks; j++) {
        const bGeo = new THREE.BoxGeometry(
          8 + Math.random() * 8,
          3 + Math.random() * 2,
          8 + Math.random() * 8
        );
        const b = new THREE.Mesh(bGeo, cloudMat);
        b.position.set(j * 6 - 12, 0, Math.random() * 6 - 3);
        cloud.add(b);
      }
      cloud.position.set(
        (Math.random() - 0.5) * 200,
        35 + Math.random() * 15,
        (Math.random() - 0.5) * 200
      );
      this.scene.add(cloud);
      this.clouds.push(cloud);
    }
  }

  // ─── TARGET DUMMIES ───────────────────────────────────────────────────────
  private spawnDummies() {
    // 6 Targets with various positions and movement styles
    const configs = [
      { x: 0, z: -10, isPatrol: true, pEnd: { x: 12, z: -10 }, speed: 2.5 },
      { x: -14, z: -4, isPatrol: false },
      { x: 14, z: 0, isPatrol: false },
      { x: -25, y: 6.2, z: -25, isPatrol: false }, // On sniper tower 1
      { x: 25, y: 6.2, z: -25, isPatrol: false },  // On sniper tower 2
      { x: -8, z: 20, isPatrol: true, pEnd: { x: 8, z: 20 }, speed: 3.2 }
    ];

    configs.forEach((cfg, idx) => {
      this.createDummy(`dummy_${idx}`, cfg.x, cfg.y || 0, cfg.z, cfg.isPatrol, cfg.pEnd, cfg.speed);
    });
  }

  private createDummy(
    id: string,
    x: number,
    y: number,
    z: number,
    isPatrolling = false,
    pEnd?: { x: number; z: number },
    speed = 2
  ) {
    const group = new THREE.Group();

    // Voxel body parts
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x1e88e5 }); // Blue shirt
    const pantsMat = new THREE.MeshLambertMaterial({ color: 0x3949ab }); // Dark blue pants
    const skinMat = new THREE.MeshLambertMaterial({ color: 0xffcc80 }); // Voxel skin

    // Head (Headshot target zone)
    const headGeo = new THREE.BoxGeometry(0.7, 0.7, 0.7);
    const headMesh = new THREE.Mesh(headGeo, skinMat);
    headMesh.position.set(0, 2.05, 0);
    headMesh.castShadow = true;
    (headMesh as any).dummyId = id;
    (headMesh as any).isHead = true;
    group.add(headMesh);

    // Target Bullseye ring on front of head
    const eyeGeo = new THREE.BoxGeometry(0.3, 0.3, 0.02);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xd32f2f });
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(0, 2.05, 0.36);
    group.add(eye);

    // Torso (Body hit zone)
    const torsoGeo = new THREE.BoxGeometry(1.0, 1.1, 0.6);
    const bodyMesh = new THREE.Mesh(torsoGeo, bodyMat);
    bodyMesh.position.set(0, 1.25, 0);
    bodyMesh.castShadow = true;
    (bodyMesh as any).dummyId = id;
    (bodyMesh as any).isHead = false;
    group.add(bodyMesh);

    // Arms
    const armGeo = new THREE.BoxGeometry(0.35, 1.0, 0.35);
    const leftArm = new THREE.Mesh(armGeo, skinMat);
    leftArm.position.set(-0.7, 1.2, 0);
    group.add(leftArm);

    const rightArm = new THREE.Mesh(armGeo, skinMat);
    rightArm.position.set(0.7, 1.2, 0);
    group.add(rightArm);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.4, 0.8, 0.45);
    const leftLeg = new THREE.Mesh(legGeo, pantsMat);
    leftLeg.position.set(-0.25, 0.4, 0);
    group.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, pantsMat);
    rightLeg.position.set(0.25, 0.4, 0);
    group.add(rightLeg);

    group.position.set(x, y, z);
    this.scene.add(group);

    const dummy: TargetDummy = {
      id,
      group,
      headMesh,
      bodyMesh,
      hp: 100,
      maxHp: 100,
      isDead: false,
      respawnTimer: 0,
      isPatrolling,
      patrolStart: { x, z },
      patrolEnd: pEnd || { x, z },
      patrolProgress: 0,
      patrolSpeed: speed,
      hitFlashTimer: 0
    };

    this.dummies.push(dummy);
  }

  // ─── SHOOTING & COMBAT ────────────────────────────────────────────────────
  public shoot() {
    if (this.stats.isReloading) return;
    if (this.stats.ammo <= 0) {
      pixelGunSound.empty();
      this.reload();
      return;
    }

    const now = performance.now();
    if (now - this.lastShootTime < this.shootCooldownMs) return;
    this.lastShootTime = now;

    // Consume ammo
    this.stats.ammo--;
    this.stats.shotsFired++;
    this.notifyStats();

    // Audio & Recoil
    pixelGunSound.shoot();
    this.gunRecoilZ = 0.09;
    this.gunRecoilRotX = 0.12;

    // Flash
    this.triggerMuzzleFlash();

    // Raycast from center screen
    this.raycaster.setFromCamera(this.centerScreen, this.camera);

    // Intersectable meshes (heads, bodies, environment)
    const targetMeshes: THREE.Object3D[] = [];
    for (const d of this.dummies) {
      if (!d.isDead) {
        targetMeshes.push(d.headMesh, d.bodyMesh);
      }
    }

    // Intersect colliders / arena
    const worldObjects: THREE.Object3D[] = [];
    this.scene.traverse(obj => {
      if (obj instanceof THREE.Mesh && obj !== this.muzzleFlashMesh && !targetMeshes.includes(obj)) {
        worldObjects.push(obj);
      }
    });

    const hits = this.raycaster.intersectObjects([...targetMeshes, ...worldObjects], false);

    let endPoint = this.raycaster.ray.origin.clone().add(this.raycaster.ray.direction.clone().multiplyScalar(150));

    if (hits.length > 0) {
      const hit = hits[0];
      endPoint = hit.point;

      // Check if we hit a dummy
      const dummyId = (hit.object as any).dummyId;
      if (dummyId) {
        const dummy = this.dummies.find(d => d.id === dummyId);
        if (dummy && !dummy.isDead) {
          this.stats.shotsHit++;
          const isHeadshot = !!(hit.object as any).isHead;
          const damage = isHeadshot ? 75 : 30; // Headshot critical

          dummy.hp -= damage;
          dummy.hitFlashTimer = 0.12;

          // Sound & Screen Hitmarker
          if (isHeadshot) {
            this.stats.headshots++;
            pixelGunSound.headshot();
            this.onHitmarker?.(true);
          } else {
            pixelGunSound.hitmarker();
            this.onHitmarker?.(false);
          }

          // Floating damage number
          this.floatingTexts.push({
            id: `dmg_${Date.now()}_${Math.random()}`,
            text: isHeadshot ? `CRIT -${damage}!` : `-${damage}`,
            color: isHeadshot ? '#ffd700' : '#ffffff',
            x: hit.point.x,
            y: hit.point.y + 0.3,
            z: hit.point.z,
            life: 0.85,
            maxLife: 0.85,
            isHeadshot
          });

          // Impact blood/voxel particles
          this.spawnHitParticles(hit.point, isHeadshot ? 0xffd700 : 0xef4444, 12);

          // Check target death
          if (dummy.hp <= 0) {
            this.killDummy(dummy);
          }

          this.notifyStats();
        }
      } else {
        // Hit environment (spark & dust debris)
        this.spawnHitParticles(hit.point, 0xffeb3b, 8);
      }
    }

    // Spawn Tracer
    this.createBulletTracer(endPoint);
  }

  private triggerMuzzleFlash() {
    (this.muzzleFlashMesh.material as THREE.MeshBasicMaterial).opacity = 1.0;
    this.muzzleLight.intensity = 4.0;

    setTimeout(() => {
      if (!this.isDisposed) {
        (this.muzzleFlashMesh.material as THREE.MeshBasicMaterial).opacity = 0;
        this.muzzleLight.intensity = 0;
      }
    }, 45);
  }

  private createBulletTracer(endPoint: THREE.Vector3) {
    const muzzleWorld = new THREE.Vector3();
    this.muzzleFlashMesh.getWorldPosition(muzzleWorld);

    const geo = new THREE.BufferGeometry().setFromPoints([muzzleWorld, endPoint]);
    const mat = new THREE.LineBasicMaterial({ color: 0xffea00, linewidth: 2, transparent: true, opacity: 0.9 });
    const line = new THREE.Line(geo, mat);
    this.scene.add(line);

    this.tracers.push({
      line,
      life: 0.08,
      maxLife: 0.08
    });
  }

  private spawnHitParticles(pos: THREE.Vector3, color: number, count: number) {
    const geo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
    const mat = new THREE.MeshBasicMaterial({ color });

    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos);
      this.scene.add(mesh);

      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      this.particles.push({
        mesh,
        vx: Math.cos(angle) * speed,
        vy: 2 + Math.random() * 5,
        vz: Math.sin(angle) * speed,
        life: 0.4 + Math.random() * 0.3,
        maxLife: 0.7,
        rotSpeedX: Math.random() * 8,
        rotSpeedY: Math.random() * 8
      });
    }
  }

  private killDummy(dummy: TargetDummy) {
    dummy.isDead = true;
    dummy.group.visible = false;
    dummy.respawnTimer = 3.0; // 3 seconds respawn

    this.stats.kills++;
    this.stats.score += 100;
    pixelGunSound.targetDestroyed();

    // Voxel explosion of the mannequin
    const geo = new THREE.BoxGeometry(0.24, 0.24, 0.24);
    const colors = [0x1e88e5, 0x3949ab, 0xffcc80, 0xd32f2f];

    for (let i = 0; i < 20; i++) {
      const col = colors[Math.floor(Math.random() * colors.length)];
      const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: col }));
      mesh.position.set(
        dummy.group.position.x + (Math.random() - 0.5) * 0.8,
        dummy.group.position.y + 0.5 + Math.random() * 1.5,
        dummy.group.position.z + (Math.random() - 0.5) * 0.8
      );
      this.scene.add(mesh);

      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 7;
      this.particles.push({
        mesh,
        vx: Math.cos(angle) * speed,
        vy: 3 + Math.random() * 6,
        vz: Math.sin(angle) * speed,
        life: 1.0 + Math.random() * 0.5,
        maxLife: 1.5,
        rotSpeedX: Math.random() * 10,
        rotSpeedY: Math.random() * 10
      });
    }
  }

  public reload() {
    if (this.stats.isReloading || this.stats.ammo === this.stats.maxAmmo) return;
    this.stats.isReloading = true;
    this.reloadTimer = this.reloadDuration;
    pixelGunSound.reload();
    this.notifyStats();
  }

  // ─── CONTROLS & POINTER LOCK ──────────────────────────────────────────────
  private initControls() {
    const dom = this.container;

    dom.addEventListener('click', () => {
      if (!this.isLocked) {
        dom.requestPointerLock();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isLocked = document.pointerLockElement === dom;
    });

    document.addEventListener('mousemove', e => {
      if (!this.isLocked) return;
      this.yaw -= e.movementX * this.sensitivity;
      this.pitch -= e.movementY * this.sensitivity;
      this.pitch = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, this.pitch));
    });

    window.addEventListener('keydown', e => {
      switch (e.code) {
        case 'KeyW':
        case 'KeyZ':
          this.keys.forward = true;
          break;
        case 'KeyS':
          this.keys.backward = true;
          break;
        case 'KeyA':
        case 'KeyQ':
          this.keys.left = true;
          break;
        case 'KeyD':
          this.keys.right = true;
          break;
        case 'Space':
          this.keys.jump = true;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          this.keys.sprint = true;
          break;
        case 'KeyR':
          this.reload();
          break;
      }
    });

    window.addEventListener('keyup', e => {
      switch (e.code) {
        case 'KeyW':
        case 'KeyZ':
          this.keys.forward = false;
          break;
        case 'KeyS':
          this.keys.backward = false;
          break;
        case 'KeyA':
        case 'KeyQ':
          this.keys.left = false;
          break;
        case 'KeyD':
          this.keys.right = false;
          break;
        case 'Space':
          this.keys.jump = false;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          this.keys.sprint = false;
          break;
      }
    });

    dom.addEventListener('mousedown', e => {
      if (e.button === 0 && this.isLocked) {
        this.isMouseDown = true;
        this.shoot();
      }
    });

    window.addEventListener('mouseup', e => {
      if (e.button === 0) {
        this.isMouseDown = false;
      }
    });

    window.addEventListener('resize', () => this.handleResize());
  }

  public handleResize() {
    if (!this.container) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  // ─── MAIN GAME LOOP (TICK & RENDER) ───────────────────────────────────────
  public update(dt: number) {
    if (this.isDisposed) return;

    // Automatic fire when holding mouse button
    if (this.isMouseDown && this.isLocked) {
      this.shoot();
    }

    // 1. Reloading logic
    if (this.stats.isReloading) {
      this.reloadTimer -= dt;
      this.stats.reloadProgress = 1 - Math.max(0, this.reloadTimer / this.reloadDuration);
      if (this.reloadTimer <= 0) {
        this.stats.ammo = this.stats.maxAmmo;
        this.stats.isReloading = false;
        this.stats.reloadProgress = 0;
        this.notifyStats();
      }
    }

    // 2. Camera Orientation
    const qYaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
    const qPitch = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), this.pitch);
    this.camera.quaternion.copy(qYaw).multiply(qPitch);

    // 3. Movement & Physics
    const speed = this.keys.sprint ? 16 : 10;
    const moveDir = new THREE.Vector3();

    if (this.keys.forward) moveDir.z -= 1;
    if (this.keys.backward) moveDir.z += 1;
    if (this.keys.left) moveDir.x -= 1;
    if (this.keys.right) moveDir.x += 1;

    if (moveDir.lengthSq() > 0) {
      moveDir.normalize();
      moveDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
      this.velocity.x = moveDir.x * speed;
      this.velocity.z = moveDir.z * speed;
      this.walkBobTimer += dt * (this.keys.sprint ? 14 : 9);
    } else {
      // Damping
      this.velocity.x *= 0.75;
      this.velocity.z *= 0.75;
    }

    // Jump
    if (this.keys.jump && this.isGrounded) {
      this.velocity.y = 11;
      this.isGrounded = false;
      pixelGunSound.jump();
    }

    // Gravity
    this.velocity.y -= 26 * dt;

    // Update Position
    const nextPos = this.position.clone().add(this.velocity.clone().multiplyScalar(dt));

    // Collision with ground
    if (nextPos.y <= 1.8) {
      nextPos.y = 1.8;
      this.velocity.y = 0;
      this.isGrounded = true;
    }

    // Jump Pads check
    for (const pad of this.jumpPads) {
      const dist = Math.hypot(nextPos.x - pad.x, nextPos.z - pad.z);
      if (dist < pad.radius && nextPos.y <= 2.8) {
        this.velocity.y = pad.boostVelocity;
        this.isGrounded = false;
        pixelGunSound.jumpPad();
        this.spawnHitParticles(new THREE.Vector3(pad.x, 0.4, pad.z), 0x00e5ff, 15);
      }
    }

    // Simple AABB Box Collisions
    const playerRadius = 0.5;
    const playerBox = new THREE.Box3(
      new THREE.Vector3(nextPos.x - playerRadius, nextPos.y - 1.6, nextPos.z - playerRadius),
      new THREE.Vector3(nextPos.x + playerRadius, nextPos.y + 0.2, nextPos.z + playerRadius)
    );

    for (const box of this.colliders) {
      if (playerBox.intersectsBox(box)) {
        // Push out horizontally
        const overlapX = Math.min(playerBox.max.x - box.min.x, box.max.x - playerBox.min.x);
        const overlapZ = Math.min(playerBox.max.z - box.min.z, box.max.z - playerBox.min.z);

        if (overlapX < overlapZ) {
          if (nextPos.x > (box.min.x + box.max.x) / 2) nextPos.x += overlapX;
          else nextPos.x -= overlapX;
        } else {
          if (nextPos.z > (box.min.z + box.max.z) / 2) nextPos.z += overlapZ;
          else nextPos.z -= overlapZ;
        }
      }
    }

    this.position.copy(nextPos);
    this.camera.position.copy(this.position);

    // 4. Viewmodel Sway & Bobbing
    const bobX = Math.cos(this.walkBobTimer * 0.5) * 0.015;
    const bobY = Math.sin(this.walkBobTimer) * 0.018;

    // Recoil recovery
    this.gunRecoilZ = THREE.MathUtils.lerp(this.gunRecoilZ, 0, dt * 18);
    this.gunRecoilRotX = THREE.MathUtils.lerp(this.gunRecoilRotX, 0, dt * 18);

    this.gunGroup.position.set(
      this.gunBasePos.x + bobX,
      this.gunBasePos.y + bobY,
      this.gunBasePos.z + this.gunRecoilZ
    );
    this.gunGroup.rotation.x = this.gunRecoilRotX;

    // 5. Update Targets / Dummies
    for (const d of this.dummies) {
      if (d.isDead) {
        d.respawnTimer -= dt;
        if (d.respawnTimer <= 0) {
          d.isDead = false;
          d.hp = d.maxHp;
          d.group.visible = true;
          d.group.position.set(d.patrolStart.x, 0, d.patrolStart.z);
          this.spawnHitParticles(d.group.position, 0x4caf50, 10);
        }
      } else {
        // Flash recover
        if (d.hitFlashTimer > 0) {
          d.hitFlashTimer -= dt;
          (d.bodyMesh.material as THREE.MeshLambertMaterial).color.setHex(0xff5252);
          (d.headMesh.material as THREE.MeshLambertMaterial).color.setHex(0xff5252);
        } else {
          (d.bodyMesh.material as THREE.MeshLambertMaterial).color.setHex(0x1e88e5);
          (d.headMesh.material as THREE.MeshLambertMaterial).color.setHex(0xffcc80);
        }

        // Patrol movement
        if (d.isPatrolling) {
          d.patrolProgress += d.patrolSpeed * dt;
          const pingPong = (Math.sin(d.patrolProgress) + 1) / 2;
          d.group.position.x = THREE.MathUtils.lerp(d.patrolStart.x, d.patrolEnd.x, pingPong);
          d.group.position.z = THREE.MathUtils.lerp(d.patrolStart.z, d.patrolEnd.z, pingPong);
          // Face patrol direction
          d.group.rotation.y = Math.cos(d.patrolProgress) > 0 ? 0 : Math.PI;
        }
      }
    }

    // 6. Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        this.particles.splice(i, 1);
      } else {
        p.vy -= 16 * dt; // Particle gravity
        p.mesh.position.x += p.vx * dt;
        p.mesh.position.y += p.vy * dt;
        p.mesh.position.z += p.vz * dt;
        p.mesh.rotation.x += p.rotSpeedX * dt;
        p.mesh.rotation.y += p.rotSpeedY * dt;
        if (p.mesh.position.y < 0.05) {
          p.mesh.position.y = 0.05;
          p.vy = -p.vy * 0.4;
        }
      }
    }

    // 7. Update Tracers
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const tr = this.tracers[i];
      tr.life -= dt;
      if (tr.life <= 0) {
        this.scene.remove(tr.line);
        tr.line.geometry.dispose();
        this.tracers.splice(i, 1);
      }
    }

    // 8. Update Floating Damage Texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life -= dt;
      ft.y += dt * 0.9;
      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }

    // 9. Clouds Drift
    for (const c of this.clouds) {
      c.position.x += dt * 1.2;
      if (c.position.x > 120) c.position.x = -120;
    }

    // 10. Render 3D Scene
    this.renderer.render(this.scene, this.camera);
  }

  private notifyStats() {
    this.onStatsChange?.({ ...this.stats });
  }

  public dispose() {
    this.isDisposed = true;
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
    this.renderer.dispose();
  }
}
