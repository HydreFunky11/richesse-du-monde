import * as THREE from 'three';
import type { PropHuntGameState, PropHuntMapId, PropHuntPlayer, PropHuntRole } from './propHuntTypes';
import { propAudio } from './propHuntAudio';

export interface PropHuntEngineCallbacks {
  onShoot?: (hitPlayerId: string | null) => void;
  onDash?: () => void;
  onChangeProp?: () => void;
  onToggleFreeze?: () => void;
  onTaunt?: () => void;
  onMovement?: (position: [number, number, number], rotation: [number, number, number]) => void;
}

export class PropHunt3DScene {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;
  private callbacks: PropHuntEngineCallbacks;

  // Local Player state
  private myPlayerId: string | null = null;
  private myRole: PropHuntRole = 'HIDER';
  private currentMapId: PropHuntMapId = 'superette';
  private currentPhase: string = 'LOBBY';
  private isPointerLocked: boolean = false;
  private isFrozen: boolean = false;
  private dashUntil: number = 0;

  // Camera & Orbit settings
  private pitch: number = 0.2;
  private yaw: number = 0;
  private cameraDistance: number = 3.5;

  // Physics & Movement
  private position: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private verticalVelocity: number = 0;
  private isGrounded: boolean = true;
  private keys: Record<string, boolean> = {};

  // Colliders for all obstacles in map
  private colliders: THREE.Box3[] = [];

  // Hunter Weapon
  private weaponMesh: THREE.Group | null = null;
  private isReloading: boolean = false;
  private hasAmmo: boolean = true;
  private reloadProgress: number = 1;
  private isShootingAnimation: boolean = false;

  // Scene Meshes & Raycasting
  private playerMeshes: Map<string, THREE.Group> = new Map();
  private staticDecoyMeshes: THREE.Object3D[] = [];
  private mapEnvironmentGroup: THREE.Group = new THREE.Group();
  private raycaster: THREE.Raycaster = new THREE.Raycaster();

  // Animation Loop
  private animationFrameId: number | null = null;
  private lastMovementEmitTime: number = 0;

  constructor(container: HTMLElement, callbacks: PropHuntEngineCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.clock = new THREE.Clock();

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f172a);
    this.scene.fog = new THREE.FogExp2(0x0f172a, 0.015);

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      70,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      200
    );
    this.camera.position.set(0, 2, 5);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    this.scene.add(this.mapEnvironmentGroup);

    // Setup Weapon (1st person view model for Hunter)
    this.createWeaponModel();
    if (this.weaponMesh) {
      this.weaponMesh.visible = false; // Hidden by default until player is confirmed hunter!
    }

    // Input listeners
    this.initInputs();

    // Window resize
    window.addEventListener('resize', this.onResize);

    // Build default map
    this.buildMap('superette');

    // Start loop
    this.animate();
  }

  public setMyPlayerId(id: string) {
    this.myPlayerId = id;
  }

  public getAmmoStatus() {
    return {
      hasAmmo: this.hasAmmo,
      isReloading: this.isReloading,
      reloadProgress: this.reloadProgress
    };
  }

  // ─── COLLISION MANAGEMENT ──────────────────────────────────────────────────


  private addBoxCollider(center: [number, number, number], size: [number, number, number]) {
    const halfX = size[0] / 2;
    const halfY = size[1] / 2;
    const halfZ = size[2] / 2;
    const min = new THREE.Vector3(center[0] - halfX, center[1] - halfY, center[2] - halfZ);
    const max = new THREE.Vector3(center[0] + halfX, center[1] + halfY, center[2] + halfZ);
    this.colliders.push(new THREE.Box3(min, max));
  }

  private checkHorizontalCollision(x: number, y: number, z: number, radius: number, height: number): boolean {
    const minX = x - radius;
    const maxX = x + radius;
    const minZ = z - radius;
    const maxZ = z + radius;
    const minY = y;
    const maxY = y + height;

    // Check static colliders (walls, environment)
    for (const col of this.colliders) {
      if (
        maxX > col.min.x &&
        minX < col.max.x &&
        maxY > col.min.y &&
        minY < col.max.y &&
        maxZ > col.min.z &&
        minZ < col.max.z
      ) {
        return true;
      }
    }

    // Check static props (decoy meshes)
    for (const mesh of this.staticDecoyMeshes) {
      const box = new THREE.Box3().setFromObject(mesh);
      if (
        maxX > box.min.x &&
        minX < box.max.x &&
        maxY > box.min.y &&
        minY < box.max.y &&
        maxZ > box.min.z &&
        minZ < box.max.z
      ) {
        return true;
      }
    }

    // Check other players (acting as props)
    for (const [playerId, mesh] of this.playerMeshes.entries()) {
      if (playerId === this.myPlayerId) continue; // Don't collide with self
      if (!mesh.visible) continue; // Don't collide with invisible hunters
      const box = new THREE.Box3().setFromObject(mesh);
      // Give players slightly smaller hitboxes so it's not too janky
      box.expandByScalar(-0.1);
      if (
        maxX > box.min.x &&
        minX < box.max.x &&
        maxY > box.min.y &&
        minY < box.max.y &&
        maxZ > box.min.z &&
        minZ < box.max.z
      ) {
        return true;
      }
    }

    return false;
  }

  // ─── MAP BUILDERS ────────────────────────────────────────────────────────────

  public buildMap(mapId: PropHuntMapId) {
    this.currentMapId = mapId;

    // Reset previous environment and colliders
    while (this.mapEnvironmentGroup.children.length > 0) {
      const obj = this.mapEnvironmentGroup.children[0];
      this.mapEnvironmentGroup.remove(obj);
    }
    this.staticDecoyMeshes = [];
    this.colliders = [];

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    this.mapEnvironmentGroup.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.85);
    dirLight.position.set(15, 25, 15);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    this.mapEnvironmentGroup.add(dirLight);

    switch (mapId) {
      case 'superette':
        this.buildSuperette();
        break;
      case 'warehouse':
        this.buildWarehouse();
        break;
      case 'office':
        this.buildOffice();
        break;
      case 'lab':
        this.buildLab();
        break;
    }
  }

  // 🛒 MAP: SUPERETTE (Supérette / Épicerie)
  private buildSuperette() {
    this.scene.background = new THREE.Color(0x0f172a);
    this.scene.fog = new THREE.FogExp2(0x0f172a, 0.015);

    // Floor (50 x 50)
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(50, 50),
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.3 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.mapEnvironmentGroup.add(floor);

    // Outer Room Walls & Colliders
    this.createRoomWallsWithColliders(50, 50, 8, 0x1e293b, 0x0284c7);

    // Ceiling Lights
    for (let x = -15; x <= 15; x += 15) {
      for (let z = -15; z <= 15; z += 10) {
        const lightBox = new THREE.Mesh(
          new THREE.BoxGeometry(1.2, 0.15, 4.5),
          new THREE.MeshBasicMaterial({ color: 0xffffff })
        );
        lightBox.position.set(x, 7.9, z);
        this.mapEnvironmentGroup.add(lightBox);

        const pLight = new THREE.PointLight(0xfff7ed, 0.45, 16);
        pLight.position.set(x, 7.4, z);
        this.mapEnvironmentGroup.add(pLight);
      }
    }

    // 3 Double-Sided Gondola Aisles with solid colliders
    [-10, 0, 10].forEach((aisleX) => {
      this.createSupermarketAisle(aisleX, 0, 18);
      // Add solid box collider for each aisle: x ± 1.2, y 0 to 3.2, z -9 to +9
      this.addBoxCollider([aisleX, 1.6, 0], [2.5, 3.2, 18.5]);
    });

    // 2 Checkout Counters with solid colliders
    this.createCheckoutCounter(-8, -16);
    this.addBoxCollider([-8, 0.6, -16], [4.2, 1.2, 1.6]);

    this.createCheckoutCounter(4, -16);
    this.addBoxCollider([4, 0.6, -16], [4.2, 1.2, 1.6]);

    // Beverage Fridges along back wall (z = 23.5) with colliders
    for (let x = -16; x <= 16; x += 8) {
      this.createBeverageFridge(x, 23.5);
      this.addBoxCollider([x, 2.0, 23.5], [4.2, 4.2, 1.8]);
    }

    // Fruit and Vegetable Market Islands with colliders
    this.createFruitStand(-16, -4);
    this.addBoxCollider([-16, 0.6, -4], [3.2, 1.3, 4.2]);

    this.createFruitStand(-16, 6);
    this.addBoxCollider([-16, 0.6, 6], [3.2, 1.3, 4.2]);

    // Shopping Carts cluster
    this.createShoppingCartCluster(16, -18);
    this.addBoxCollider([16, 0.6, -16], [3.0, 1.2, 6.0]);

    // Decoy props in superette
    this.spawnDecoyProp('soda_can', -8, 1.25, -16.2);
    this.spawnDecoyProp('soda_can', 4, 1.25, -16.2);
    this.spawnDecoyProp('cereal_box', -10, 1.5, 4);
    this.spawnDecoyProp('cereal_box', 0, 2.2, -2);
    this.spawnDecoyProp('cereal_box', 10, 1.5, -4);
    this.spawnDecoyProp('milk_carton', -16, 1.5, 23);
    this.spawnDecoyProp('apple_basket', -16, 1.1, -4);
    this.spawnDecoyProp('apple_basket', -16, 1.1, 6);
    this.spawnDecoyProp('cash_register', -6.5, 1.25, -16);
    this.spawnDecoyProp('cash_register', 5.5, 1.25, -16);
    this.spawnDecoyProp('cardboard_box', -18, 0.5, 18);
  }

  // 📦 MAP: WAREHOUSE (Entrepôt)
  private buildWarehouse() {
    this.scene.background = new THREE.Color(0x0a0f1d);
    this.scene.fog = new THREE.FogExp2(0x0a0f1d, 0.016);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(55, 55),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.mapEnvironmentGroup.add(floor);

    this.createRoomWallsWithColliders(55, 55, 10, 0x111827, 0xf59e0b);

    // High metal storage racks with colliders
    [-14, 0, 14].forEach((rackX) => {
      this.createWarehouseRack(rackX, -5, 22);
      this.addBoxCollider([rackX, 3.5, -5], [2.4, 7.0, 22.5]);
    });

    // Shipping Containers with colliders
    this.createShippingContainer(-18, 18, 0x3b82f6);
    this.addBoxCollider([-18, 2.25, 18], [5.2, 4.6, 10.2]);

    this.createShippingContainer(16, 18, 0xef4444);
    this.addBoxCollider([16, 2.25, 18], [5.2, 4.6, 10.2]);

    // Decoy props
    this.spawnDecoyProp('wooden_crate', -8, 0.6, 2);
    this.spawnDecoyProp('wooden_crate', 6, 0.6, -8);
    this.spawnDecoyProp('oil_drum', 18, 0.8, -10);
    this.spawnDecoyProp('pallet', 0, 0.2, 12);
  }

  // 🏢 MAP: OFFICE (Open Space)
  private buildOffice() {
    this.scene.background = new THREE.Color(0x18181b);
    this.scene.fog = new THREE.FogExp2(0x18181b, 0.018);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(50, 50),
      new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.8 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.mapEnvironmentGroup.add(floor);

    this.createRoomWallsWithColliders(50, 50, 7, 0x3f3f46, 0x10b981);

    // Desks with colliders
    [-12, 0, 12].forEach((x) => {
      [-8, 4, 16].forEach((z) => {
        this.createOfficeDesk(x, z);
        this.addBoxCollider([x, 0.6, z], [3.2, 1.3, 1.8]);
      });
    });

    this.spawnDecoyProp('water_cooler', -20, 1.1, -18);
    this.addBoxCollider([-20, 1.1, -18], [1.0, 2.2, 1.0]);

    this.spawnDecoyProp('office_chair', -12, 0.6, -6.5);
    this.spawnDecoyProp('pc_monitor', 12, 1.3, 16);
    this.spawnDecoyProp('plant', 20, 0.8, -20);
  }

  // 🧪 MAP: LAB (Laboratoire Sci-Fi)
  private buildLab() {
    this.scene.background = new THREE.Color(0x030712);
    this.scene.fog = new THREE.FogExp2(0x030712, 0.02);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(50, 50),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1, metalness: 0.6 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.mapEnvironmentGroup.add(floor);

    this.createRoomWallsWithColliders(50, 50, 8, 0x1e1b4b, 0x8b5cf6);

    // Cryo pods with colliders
    [-10, 0, 10].forEach((x) => {
      this.createCryoPod(x, 0);
      this.addBoxCollider([x, 2.0, 0], [2.6, 4.0, 2.6]);
    });

    // Server Racks with colliders
    for (let x = -18; x <= 18; x += 6) {
      this.createServerRack(x, -22);
      this.addBoxCollider([x, 2.25, -22], [2.2, 4.6, 1.8]);
    }

    this.spawnDecoyProp('hazard_barrel', 14, 0.8, -10);
    this.spawnDecoyProp('chemical_canister', -8, 0.5, 12);
  }

  // ─── ENVIRONMENT HELPERS ───────────────────────────────────────────────────

  private createRoomWallsWithColliders(width: number, length: number, height: number, color: number, accentColor: number) {
    const wallMat = new THREE.MeshStandardMaterial({ color, roughness: 0.5 });
    const accentMat = new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.3 });

    const halfW = width / 2;
    const halfL = length / 2;

    // 4 Walls
    const walls = [
      { size: [width, height, 1], pos: [0, height / 2, -halfL] },
      { size: [width, height, 1], pos: [0, height / 2, halfL] },
      { size: [1, height, length], pos: [-halfW, height / 2, 0] },
      { size: [1, height, length], pos: [halfW, height / 2, 0] }
    ];

    walls.forEach((w) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w.size[0], w.size[1], w.size[2]), wallMat);
      m.position.set(w.pos[0], w.pos[1], w.pos[2]);
      m.receiveShadow = true;
      this.mapEnvironmentGroup.add(m);

      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(w.size[0] > 1 ? w.size[0] : 1.1, 0.3, w.size[2] > 1 ? w.size[2] : 1.1),
        accentMat
      );
      stripe.position.set(w.pos[0], height - 0.5, w.pos[2]);
      this.mapEnvironmentGroup.add(stripe);

      // Add wall collider (infinite height barrier)
      this.addBoxCollider(
        [w.pos[0], height / 2, w.pos[2]],
        [w.size[0] > 1 ? w.size[0] + 0.5 : 1.5, height * 2, w.size[2] > 1 ? w.size[2] + 0.5 : 1.5]
      );
    });
  }

  private createSupermarketAisle(x: number, z: number, length: number) {
    const shelfGroup = new THREE.Group();
    shelfGroup.position.set(x, 0, z);

    const frameMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.4 });
    const shelfMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3 });

    [0.4, 1.4, 2.4].forEach((y) => {
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, length), shelfMat);
      shelf.position.y = y;
      shelf.castShadow = true;
      shelfGroup.add(shelf);

      for (let sz = -length / 2 + 1; sz <= length / 2 - 1; sz += 1.4) {
        const cereal = new THREE.Mesh(
          new THREE.BoxGeometry(0.35, 0.6, 0.2),
          new THREE.MeshStandardMaterial({
            color: [0xef4444, 0x3b82f6, 0x10b981, 0xf59e0b][Math.floor(Math.random() * 4)]
          })
        );
        cereal.position.set(-0.6, y + 0.3, sz);
        shelfGroup.add(cereal);

        const can = new THREE.Mesh(
          new THREE.CylinderGeometry(0.12, 0.12, 0.35, 12),
          new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.6 })
        );
        can.position.set(0.6, y + 0.18, sz);
        shelfGroup.add(can);
      }
    });

    const back = new THREE.Mesh(new THREE.BoxGeometry(0.1, 3.2, length), frameMat);
    back.position.y = 1.6;
    shelfGroup.add(back);

    this.mapEnvironmentGroup.add(shelfGroup);
  }

  private createCheckoutCounter(x: number, z: number) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const table = new THREE.Mesh(
      new THREE.BoxGeometry(4, 1.1, 1.4),
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.3 })
    );
    table.position.y = 0.55;
    table.castShadow = true;
    group.add(table);

    const belt = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 0.05, 0.9),
      new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9 })
    );
    belt.position.set(-0.4, 1.12, 0);
    group.add(belt);

    this.mapEnvironmentGroup.add(group);
  }

  private createBeverageFridge(x: number, z: number) {
    const fridge = new THREE.Group();
    fridge.position.set(x, 0, z);

    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(4, 4, 1.5),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.5 })
    );
    frame.position.y = 2;
    fridge.add(frame);

    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(3.6, 3.6, 0.05),
      new THREE.MeshPhysicalMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.35, roughness: 0.1 })
    );
    glass.position.set(0, 2, 0.76);
    fridge.add(glass);

    const coldLight = new THREE.PointLight(0x38bdf8, 0.8, 6);
    coldLight.position.set(0, 2, 0.3);
    fridge.add(coldLight);

    this.mapEnvironmentGroup.add(fridge);
  }

  private createFruitStand(x: number, z: number) {
    const stand = new THREE.Group();
    stand.position.set(x, 0, z);

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.8 });
    const base = new THREE.Mesh(new THREE.BoxGeometry(3, 1, 4), woodMat);
    base.position.y = 0.5;
    base.castShadow = true;
    stand.add(base);

    this.mapEnvironmentGroup.add(stand);
  }

  private createShoppingCartCluster(x: number, z: number) {
    for (let i = 0; i < 4; i++) {
      const cart = this.buildPropMesh('shopping_cart');
      cart.position.set(x, 0.5, z + i * 0.9);
      cart.rotation.y = Math.PI / 2;
      this.mapEnvironmentGroup.add(cart);
      this.staticDecoyMeshes.push(cart);
    }
  }

  private createWarehouseRack(x: number, z: number, length: number) {
    const rack = new THREE.Group();
    rack.position.set(x, 0, z);
    const orangeMat = new THREE.MeshStandardMaterial({ color: 0xea580c });
    const blueMat = new THREE.MeshStandardMaterial({ color: 0x2563eb });

    for (let sz = -length / 2; sz <= length / 2; sz += 4) {
      [-1, 1].forEach((px) => {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.15, 7, 0.15), blueMat);
        post.position.set(px, 3.5, sz);
        rack.add(post);
      });
    }

    [1.5, 3.5, 5.5].forEach((y) => {
      const beam1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, length), orangeMat);
      beam1.position.set(-1, y, 0);
      const beam2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, length), orangeMat);
      beam2.position.set(1, y, 0);
      rack.add(beam1, beam2);
    });

    this.mapEnvironmentGroup.add(rack);
  }

  private createShippingContainer(x: number, z: number, color: number) {
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(5, 4.5, 10),
      new THREE.MeshStandardMaterial({ color, roughness: 0.6 })
    );
    box.position.set(x, 2.25, z);
    box.castShadow = true;
    this.mapEnvironmentGroup.add(box);
  }

  private createOfficeDesk(x: number, z: number) {
    const desk = new THREE.Group();
    desk.position.set(x, 0, z);

    const top = new THREE.Mesh(
      new THREE.BoxGeometry(3, 0.1, 1.6),
      new THREE.MeshStandardMaterial({ color: 0xd4d4d8 })
    );
    top.position.y = 1.2;
    top.castShadow = true;
    desk.add(top);

    [-1.4, 1.4].forEach((lx) => {
      const leg = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 1.2, 1.4),
        new THREE.MeshStandardMaterial({ color: 0x27272a, metalness: 0.7 })
      );
      leg.position.set(lx, 0.6, 0);
      desk.add(leg);
    });

    this.mapEnvironmentGroup.add(desk);
  }

  private createCryoPod(x: number, z: number) {
    const pod = new THREE.Group();
    pod.position.set(x, 0, z);

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 1.4, 0.6, 16),
      new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8 })
    );
    base.position.y = 0.3;
    pod.add(base);

    const tube = new THREE.Mesh(
      new THREE.CylinderGeometry(1, 1, 3.5, 16),
      new THREE.MeshPhysicalMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.4 })
    );
    tube.position.y = 2.2;
    pod.add(tube);

    this.mapEnvironmentGroup.add(pod);
  }

  private createServerRack(x: number, z: number) {
    const rack = new THREE.Mesh(
      new THREE.BoxGeometry(2, 4.5, 1.5),
      new THREE.MeshStandardMaterial({ color: 0x09090b, metalness: 0.8 })
    );
    rack.position.set(x, 2.25, z);
    this.mapEnvironmentGroup.add(rack);
  }

  // ─── PROP MESH FACTORY ─────────────────────────────────────────────────────

  public buildPropMesh(propId: string): THREE.Group {
    const group = new THREE.Group();

    switch (propId) {
      case 'soda_can': {
        const can = new THREE.Mesh(
          new THREE.CylinderGeometry(0.2, 0.2, 0.6, 16),
          new THREE.MeshStandardMaterial({ color: 0xdc2626, metalness: 0.8, roughness: 0.2 })
        );
        can.position.y = 0.3;
        can.castShadow = true;
        group.add(can);
        break;
      }
      case 'cereal_box': {
        const box = new THREE.Mesh(
          new THREE.BoxGeometry(0.6, 0.9, 0.3),
          new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4 })
        );
        box.position.y = 0.45;
        box.castShadow = true;
        group.add(box);
        break;
      }
      case 'shopping_cart': {
        const cartMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8 });
        const basket = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.6, 1.2), cartMat);
        basket.position.y = 0.5;
        group.add(basket);
        break;
      }
      case 'cash_register': {
        const base = new THREE.Mesh(
          new THREE.BoxGeometry(0.8, 0.4, 0.7),
          new THREE.MeshStandardMaterial({ color: 0x334155 })
        );
        base.position.y = 0.2;
        const screen = new THREE.Mesh(
          new THREE.BoxGeometry(0.4, 0.3, 0.1),
          new THREE.MeshBasicMaterial({ color: 0x22c55e })
        );
        screen.position.set(0, 0.45, -0.2);
        group.add(base, screen);
        break;
      }
      case 'milk_carton': {
        const carton = new THREE.Mesh(
          new THREE.BoxGeometry(0.35, 0.8, 0.35),
          new THREE.MeshStandardMaterial({ color: 0x38bdf8 })
        );
        carton.position.y = 0.4;
        group.add(carton);
        break;
      }
      case 'apple_basket': {
        const basket = new THREE.Mesh(
          new THREE.CylinderGeometry(0.5, 0.35, 0.4, 12),
          new THREE.MeshStandardMaterial({ color: 0x78350f })
        );
        basket.position.y = 0.2;
        const apple = new THREE.Mesh(
          new THREE.SphereGeometry(0.2),
          new THREE.MeshStandardMaterial({ color: 0xef4444 })
        );
        apple.position.y = 0.45;
        group.add(basket, apple);
        break;
      }
      case 'cardboard_box': {
        const box = new THREE.Mesh(
          new THREE.BoxGeometry(0.9, 0.9, 0.9),
          new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.8 })
        );
        box.position.y = 0.45;
        box.castShadow = true;
        group.add(box);
        break;
      }
      case 'wooden_crate': {
        const crate = new THREE.Mesh(
          new THREE.BoxGeometry(1.2, 1.2, 1.2),
          new THREE.MeshStandardMaterial({ color: 0x713f12, roughness: 0.7 })
        );
        crate.position.y = 0.6;
        crate.castShadow = true;
        group.add(crate);
        break;
      }
      case 'oil_drum': {
        const drum = new THREE.Mesh(
          new THREE.CylinderGeometry(0.5, 0.5, 1.4, 16),
          new THREE.MeshStandardMaterial({ color: 0x1d4ed8, metalness: 0.6 })
        );
        drum.position.y = 0.7;
        drum.castShadow = true;
        group.add(drum);
        break;
      }
      case 'pallet': {
        const p = new THREE.Mesh(
          new THREE.BoxGeometry(1.6, 0.25, 1.6),
          new THREE.MeshStandardMaterial({ color: 0xa16207 })
        );
        p.position.y = 0.125;
        group.add(p);
        break;
      }
      case 'office_chair': {
        const seat = new THREE.Mesh(
          new THREE.BoxGeometry(0.8, 0.15, 0.8),
          new THREE.MeshStandardMaterial({ color: 0x18181b })
        );
        seat.position.y = 0.45;
        const back = new THREE.Mesh(
          new THREE.BoxGeometry(0.8, 0.8, 0.15),
          new THREE.MeshStandardMaterial({ color: 0x18181b })
        );
        back.position.set(0, 0.9, -0.35);
        group.add(seat, back);
        break;
      }
      default: {
        const box = new THREE.Mesh(
          new THREE.BoxGeometry(0.8, 0.8, 0.8),
          new THREE.MeshStandardMaterial({ color: 0x64748b })
        );
        box.position.y = 0.4;
        group.add(box);
        break;
      }
    }

    group.userData = { isProp: true, propId };
    return group;
  }

  private spawnDecoyProp(propId: string, x: number, y: number, z: number) {
    const mesh = this.buildPropMesh(propId);
    mesh.position.set(x, y, z);
    mesh.rotation.y = Math.random() * Math.PI * 2;
    mesh.userData = { isDecoy: true, propId };
    this.mapEnvironmentGroup.add(mesh);
    this.staticDecoyMeshes.push(mesh);
  }

  // ─── 1-BULLET HUNTER WEAPON (VISIBLE ONLY FOR HUNTER) ──────────────────────

  private createWeaponModel() {
    if (this.weaponMesh) {
      this.camera.remove(this.weaponMesh);
    }
    const weaponGroup = new THREE.Group();

    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.035, 1.2, 12),
      new THREE.MeshStandardMaterial({ color: 0x18181b, metalness: 0.9, roughness: 0.2 })
    );
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0, -0.4);

    const stock = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.14, 0.6),
      new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.5 })
    );
    stock.position.set(0, -0.06, 0.2);

    const breach = new THREE.Mesh(
      new THREE.BoxGeometry(0.09, 0.09, 0.15),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.9 })
    );
    breach.position.set(0, 0.02, 0);

    weaponGroup.add(barrel, stock, breach);

    weaponGroup.position.set(0.35, -0.32, -0.65);
    weaponGroup.rotation.y = -0.08;
    this.camera.add(weaponGroup);
    this.scene.add(this.camera);

    this.weaponMesh = weaponGroup;
    this.weaponMesh.visible = false;
  }

  public shootWeapon(): { success: boolean; reason?: string } {
    if (this.myRole !== 'SEEKER') return { success: false };
    if (!this.hasAmmo) {
      propAudio.playDryFire();
      return { success: false, reason: 'OUT_OF_AMMO' };
    }
    if (this.isReloading) {
      return { success: false, reason: 'RELOADING' };
    }
    if (this.isShootingAnimation) {
      return { success: false, reason: 'ANIMATING' };
    }

    this.hasAmmo = false;
    propAudio.playGunshot();

    this.isShootingAnimation = true;
    if (this.weaponMesh) {
      this.weaponMesh.position.z += 0.15;
      this.weaponMesh.rotation.x -= 0.2;
      setTimeout(() => {
        if (this.weaponMesh) {
          this.weaponMesh.position.z = -0.65;
          this.weaponMesh.rotation.x = 0;
          this.isShootingAnimation = false;
        }
      }, 120);
    }

    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);

    const playerTargets: THREE.Object3D[] = [];
    this.playerMeshes.forEach((mesh, playerId) => {
      if (playerId !== this.myPlayerId) {
        playerTargets.push(mesh);
      }
    });

    const playerIntersects = this.raycaster.intersectObjects(playerTargets, true);
    if (playerIntersects.length > 0) {
      let hitObj: THREE.Object3D | null = playerIntersects[0].object;
      while (hitObj && !hitObj.userData?.playerId && hitObj.parent) {
        hitObj = hitObj.parent;
      }
      const hitPlayerId = hitObj?.userData?.playerId || null;
      if (hitPlayerId) {
        propAudio.playHitmarker();
        this.callbacks.onShoot?.(hitPlayerId);
        return { success: true };
      }
    }

    const decoyIntersects = this.raycaster.intersectObjects(this.staticDecoyMeshes, true);
    if (decoyIntersects.length > 0) {
      propAudio.playDamage();
      this.callbacks.onShoot?.(null);
      return { success: true };
    }

    this.callbacks.onShoot?.(null);
    return { success: true };
  }

  public reloadWeapon() {
    if (this.myRole !== 'SEEKER' || this.isReloading || this.hasAmmo) return;
    this.isReloading = true;
    this.reloadProgress = 0;
    propAudio.playReload();

    const startTime = Date.now();
    const duration = 1500;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      this.reloadProgress = Math.min(1, elapsed / duration);

      if (this.weaponMesh) {
        this.weaponMesh.position.y = -0.32 - Math.sin(this.reloadProgress * Math.PI) * 0.15;
      }

      if (elapsed >= duration) {
        clearInterval(interval);
        this.isReloading = false;
        this.hasAmmo = true;
        this.reloadProgress = 1;
        if (this.weaponMesh) {
          this.weaponMesh.position.y = -0.32;
        }
      }
    }, 30);
  }

  // ─── STATE SYNC FROM SERVER ────────────────────────────────────────────────

  public triggerDash() {
    this.dashUntil = Date.now() + 500; // 500ms of dash speed
  }

  public updateGameState(gameState: PropHuntGameState) {
    this.currentPhase = gameState.phase;

    if (gameState.selectedMap && gameState.selectedMap !== this.currentMapId) {
      this.buildMap(gameState.selectedMap);
    }

    // Sync my player role & state
    const me = gameState.players.find((p) => p.id === this.myPlayerId);
    if (me) {
      this.myRole = me.role;
      this.isFrozen = me.isFrozen;

      // Update weapon visibility: ONLY visible for SEEKER during active hunting!
      if (this.weaponMesh) {
        this.weaponMesh.visible = (this.myRole === 'SEEKER' && gameState.phase === 'HUNTING');
      }
    }

    // Player meshes sync
    const currentIds = new Set(gameState.players.map((p) => p.id));
    this.playerMeshes.forEach((mesh, id) => {
      if (!currentIds.has(id)) {
        this.scene.remove(mesh);
        this.playerMeshes.delete(id);
      }
    });

    gameState.players.forEach((player) => {
      const isMe = player.id === this.myPlayerId;

      if (!this.playerMeshes.has(player.id)) {
        const mesh = this.buildPlayerMesh(player);
        this.scene.add(mesh);
        this.playerMeshes.set(player.id, mesh);
      }

      const mesh = this.playerMeshes.get(player.id)!;

      if (mesh.userData.currentProp !== player.currentProp || mesh.userData.role !== player.role) {
        this.scene.remove(mesh);
        const newMesh = this.buildPlayerMesh(player);
        this.scene.add(newMesh);
        this.playerMeshes.set(player.id, newMesh);
      }

      if (!isMe) {
        mesh.position.set(player.position[0], player.position[1], player.position[2]);
        mesh.rotation.set(player.rotation[0], player.rotation[1], player.rotation[2]);
        mesh.visible = player.role !== 'SPECTATOR';
      } else {
        // For local player:
        // Visible in 3rd person if HIDER!
        // Hidden in 1st person if SEEKER!
        mesh.visible = (player.role === 'HIDER');
      }
    });

    // Play taunt if active
    if (gameState.activeTaunts && gameState.activeTaunts.length > 0) {
      const latest = gameState.activeTaunts[gameState.activeTaunts.length - 1];
      if (Date.now() - latest.timestamp < 1000) {
        propAudio.playTaunt(latest.sound);
      }
    }
  }

  private buildPlayerMesh(player: PropHuntPlayer): THREE.Group {
    const group = new THREE.Group();
    group.userData = { playerId: player.id, role: player.role, currentProp: player.currentProp };

    if (player.role === 'SEEKER') {
      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.4, 1.4, 12),
        new THREE.MeshStandardMaterial({ color: 0x1e293b })
      );
      body.position.y = 0.7;
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.25),
        new THREE.MeshStandardMaterial({ color: 0xfcd34d })
      );
      head.position.y = 1.6;
      const hat = new THREE.Mesh(
        new THREE.CylinderGeometry(0.4, 0.4, 0.1),
        new THREE.MeshStandardMaterial({ color: 0x0f172a })
      );
      hat.position.y = 1.8;
      group.add(body, head, hat);
    } else {
      const prop = this.buildPropMesh(player.currentProp);
      group.add(prop);
    }

    return group;
  }

  // ─── INPUTS & POINTER LOCK ─────────────────────────────────────────────────

  private initInputs() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;

      // Handle French AZERTY key equivalents
      if (e.key === 'z' || e.key === 'Z') this.keys['KeyW'] = true;
      if (e.key === 'q' || e.key === 'Q') this.keys['KeyA'] = true;

      if (e.code === 'KeyR' && this.myRole === 'SEEKER') {
        this.reloadWeapon();
      }
      if (e.code === 'KeyE') {
        this.callbacks.onChangeProp?.();
      }
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        this.callbacks.onDash?.();
      }
      if (e.code === 'KeyF') {
        this.callbacks.onToggleFreeze?.();
      }
      if (e.code === 'KeyT') {
        this.callbacks.onTaunt?.();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
      if (e.key === 'z' || e.key === 'Z') this.keys['KeyW'] = false;
      if (e.key === 'q' || e.key === 'Q') this.keys['KeyA'] = false;
    });

    // Mouse scroll for 3rd person camera distance
    window.addEventListener('wheel', (e) => {
      if (this.myRole === 'HIDER') {
        this.cameraDistance = Math.max(1.8, Math.min(6.5, this.cameraDistance + e.deltaY * 0.003));
      }
    });

    this.container.addEventListener('click', () => {
      if (!this.isPointerLocked) {
        this.container.requestPointerLock();
      } else {
        // ONLY HUNTER CAN SHOOT!
        if (this.myRole === 'SEEKER') {
          this.shootWeapon();
        }
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === this.container;
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.isPointerLocked) return;

      const sensitivity = 0.0022;
      this.yaw -= e.movementX * sensitivity;
      this.pitch -= e.movementY * sensitivity;

      if (this.myRole === 'SEEKER') {
        // 1st person FPS pitch
        this.pitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, this.pitch));
      } else {
        // 3rd person orbit camera pitch
        this.pitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, this.pitch));
      }
    });
  }

  // ─── ANIMATION LOOP ────────────────────────────────────────────────────────

  private animate = () => {
    this.animationFrameId = requestAnimationFrame(this.animate);

    const delta = Math.min(this.clock.getDelta(), 0.1);
    this.updateMovementAndCamera(delta);
    this.renderer.render(this.scene, this.camera);
  };

  private updateMovementAndCamera(delta: number) {
    if (!this.isPointerLocked && this.currentPhase !== 'LOBBY') {
      // Still apply camera orientation so user is not disoriented
    }

    const isHunter = this.myRole === 'SEEKER';
    const isSpectator = this.myRole === 'SPECTATOR';
    const playerRadius = isHunter ? 0.45 : 0.35;
    const playerHeight = isHunter ? 1.8 : 0.6;
    let moveSpeed = isHunter ? 10 : 8;
    if (Date.now() < this.dashUntil) {
      moveSpeed = 20; // Dash speed boost
    }

    // ─── 1. MOVEMENT VECTOR COMPUTATION ─────────────────────────────────────
    const inputVector = new THREE.Vector3();

    const forward = this.keys['KeyW'] || this.keys['ArrowUp'];
    const backward = this.keys['KeyS'] || this.keys['ArrowDown'];
    const left = this.keys['KeyA'] || this.keys['ArrowLeft'];
    const right = this.keys['KeyD'] || this.keys['ArrowRight'];

    if (forward) inputVector.z -= 1;
    if (backward) inputVector.z += 1;
    if (left) inputVector.x -= 1;
    if (right) inputVector.x += 1;

    // If frozen, movement is disabled
    const canMove = !this.isFrozen || isHunter || isSpectator;

    if (canMove && inputVector.lengthSq() > 0) {
      inputVector.normalize();
      inputVector.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);

      const deltaMoveX = inputVector.x * moveSpeed * delta;
      const deltaMoveZ = inputVector.z * moveSpeed * delta;

      if (!isSpectator) {
        // Collision-checked horizontal movement (with slide on walls)
        const nextX = this.position.x + deltaMoveX;
        if (!this.checkHorizontalCollision(nextX, this.position.y, this.position.z, playerRadius, playerHeight)) {
          this.position.x = nextX;
        }

        const nextZ = this.position.z + deltaMoveZ;
        if (!this.checkHorizontalCollision(this.position.x, this.position.y, nextZ, playerRadius, playerHeight)) {
          this.position.z = nextZ;
        }
      } else {
        // Spectator free noclip fly
        this.position.x += deltaMoveX;
        this.position.z += deltaMoveZ;
      }
    }

    // ─── 2. VERTICAL PHYSICS / GRAVITY / JUMPING ────────────────────────────
    if (!isSpectator) {
      // Apply gravity
      this.verticalVelocity -= 26 * delta;
      let nextPosY = this.position.y + this.verticalVelocity * delta;

      // Find highest ground surface under player (floor y=0 or obstacle top)
      let groundY = 0;
      for (const col of this.colliders) {
        if (
          this.position.x + playerRadius > col.min.x &&
          this.position.x - playerRadius < col.max.x &&
          this.position.z + playerRadius > col.min.z &&
          this.position.z - playerRadius < col.max.z
        ) {
          // If standing on or landing on top surface of collider
          if (this.position.y >= col.max.y - 0.25 && col.max.y > groundY) {
            groundY = col.max.y;
          }
        }
      }

      if (nextPosY <= groundY) {
        nextPosY = groundY;
        this.verticalVelocity = 0;
        this.isGrounded = true;
      } else {
        this.isGrounded = false;
      }

      this.position.y = nextPosY;

      // Jump (Space key)
      if (this.keys['Space'] && this.isGrounded && canMove) {
        this.verticalVelocity = 8.5;
        this.isGrounded = false;
      }
    } else {
      // Spectator fly up/down
      if (this.keys['Space']) this.position.y += 8 * delta;
      if (this.keys['ShiftLeft'] || this.keys['KeyC']) this.position.y -= 8 * delta;
    }

    // Outer boundary clamp
    this.position.x = Math.max(-24, Math.min(24, this.position.x));
    this.position.z = Math.max(-24, Math.min(24, this.position.z));

    // ─── 3. UPDATE LOCAL PLAYER MESH ────────────────────────────────────────
    if (this.myPlayerId && this.playerMeshes.has(this.myPlayerId)) {
      const myMesh = this.playerMeshes.get(this.myPlayerId)!;
      myMesh.position.set(this.position.x, this.position.y, this.position.z);

      if (!isHunter) {
        // Prop in 3rd person is visible!
        myMesh.visible = !isSpectator;
        // If not frozen and moving, rotate prop to face direction of movement
        if (!this.isFrozen && inputVector.lengthSq() > 0) {
          const targetAngle = Math.atan2(inputVector.x, inputVector.z);
          myMesh.rotation.y = targetAngle;
        }
      } else {
        // Hunter 1st person mesh is hidden
        myMesh.visible = false;
      }
    }

    // ─── 4. CAMERA POSITIONING & VIEW MODE ──────────────────────────────────
    if (isHunter) {
      // 🎯 1ST PERSON FPS VIEW FOR HUNTER
      this.camera.position.set(this.position.x, this.position.y + 1.6, this.position.z);
      this.camera.rotation.set(0, 0, 0);
      this.camera.rotation.y = this.yaw;
      this.camera.rotation.x = this.pitch;
    } else if (isSpectator) {
      // 👻 FREE SPECTATOR CAMERA
      this.camera.position.set(this.position.x, this.position.y + 1.6, this.position.z);
      this.camera.rotation.set(0, 0, 0);
      this.camera.rotation.y = this.yaw;
      this.camera.rotation.x = this.pitch;
    } else {
      // 🎭 3RD PERSON ORBITAL FOLLOW CAMERA FOR PROP
      const targetLookAt = new THREE.Vector3(
        this.position.x,
        this.position.y + 0.45,
        this.position.z
      );

      const hDist = this.cameraDistance * Math.cos(this.pitch);
      const idealCamX = this.position.x - Math.sin(this.yaw) * hDist;
      const idealCamY = this.position.y + 0.45 + this.cameraDistance * Math.sin(this.pitch);
      const idealCamZ = this.position.z - Math.cos(this.yaw) * hDist;

      let actualCamX = idealCamX;
      let actualCamY = idealCamY;
      let actualCamZ = idealCamZ;

      // Simple Raycast to avoid camera clipping through colliders
      const origin = targetLookAt.clone();
      const dest = new THREE.Vector3(idealCamX, idealCamY, idealCamZ);
      const dir = dest.clone().sub(origin);
      const dist = dir.length();
      dir.normalize();

      const camRay = new THREE.Raycaster(origin, dir, 0, dist);

      let hitDistance = dist;
      for (const col of this.colliders) {
          const hit = camRay.ray.intersectBox(col, new THREE.Vector3());
          if (hit) {
              const d = origin.distanceTo(hit);
              if (d < hitDistance) {
                  hitDistance = Math.max(0, d - 0.2); // keep a little distance from wall, clamped to 0
              }
          }
      }

      if (hitDistance < dist) {
          actualCamX = origin.x + dir.x * hitDistance;
          actualCamY = origin.y + dir.y * hitDistance;
          actualCamZ = origin.z + dir.z * hitDistance;
      }

      // Keep camera inside room and above floor
      this.camera.position.set(
        Math.max(-24.2, Math.min(24.2, actualCamX)),
        Math.max(0.3, Math.min(7.5, actualCamY)),
        Math.max(-24.2, Math.min(24.2, actualCamZ))
      );
      this.camera.lookAt(targetLookAt);
    }

    // ─── 5. EMIT POSITION TO SERVER (50ms interval) ─────────────────────────
    const now = Date.now();
    if (now - this.lastMovementEmitTime > 50) {
      this.lastMovementEmitTime = now;
      this.callbacks.onMovement?.(
        [this.position.x, this.position.y, this.position.z],
        [this.pitch, this.yaw, 0]
      );
    }
  }

  private onResize = () => {
    if (!this.container) return;
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  };

  public destroy() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    window.removeEventListener('resize', this.onResize);
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
