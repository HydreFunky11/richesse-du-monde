import * as THREE from 'three';
import type { PropHuntGameState, PropHuntMapId, PropHuntPlayer } from './propHuntTypes';
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

  // Local state
  private myPlayerId: string | null = null;
  private currentMapId: PropHuntMapId = 'superette';
  private currentPhase: string = 'LOBBY';
  private isPointerLocked: boolean = false;

  // Hunter weapon & camera
  private pitch: number = 0;
  private yaw: number = 0;
  private weaponMesh: THREE.Group | null = null;
  private isReloading: boolean = false;
  private hasAmmo: boolean = true;
  private reloadProgress: number = 1;
  private isShootingAnimation: boolean = false;

  // Movement
  private keys: Record<string, boolean> = {};
  private position: THREE.Vector3 = new THREE.Vector3(0, 1, 0);

  // Prop player models & scene objects
  private playerMeshes: Map<string, THREE.Group> = new Map();
  private staticDecoyMeshes: THREE.Object3D[] = [];
  private mapEnvironmentGroup: THREE.Group = new THREE.Group();
  private raycaster: THREE.Raycaster = new THREE.Raycaster();

  // Animation frame
  private animationFrameId: number | null = null;
  private lastMovementEmitTime: number = 0;

  constructor(container: HTMLElement, callbacks: PropHuntEngineCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.clock = new THREE.Clock();

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x111827);
    this.scene.fog = new THREE.FogExp2(0x111827, 0.018);

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      200
    );
    this.camera.position.set(0, 1.6, 5);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    this.scene.add(this.mapEnvironmentGroup);

    // Setup input listeners
    this.initInputs();
    this.createWeaponModel();

    // Window resize
    window.addEventListener('resize', this.onResize);

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

  // ─── MAP BUILDERS ────────────────────────────────────────────────────────────

  public buildMap(mapId: PropHuntMapId) {
    this.currentMapId = mapId;

    // Clear previous map
    while (this.mapEnvironmentGroup.children.length > 0) {
      const obj = this.mapEnvironmentGroup.children[0];
      this.mapEnvironmentGroup.remove(obj);
    }
    this.staticDecoyMeshes = [];

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
    this.mapEnvironmentGroup.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight.position.set(15, 25, 15);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 80;
    dirLight.shadow.camera.left = -30;
    dirLight.shadow.camera.right = 30;
    dirLight.shadow.camera.top = 30;
    dirLight.shadow.camera.bottom = -30;
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

    // Main floor (Checkered tiles)
    const floorGeo = new THREE.PlaneGeometry(50, 50);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.25,
      metalness: 0.1
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.mapEnvironmentGroup.add(floor);

    // Tile stripes
    const lineMat = new THREE.MeshStandardMaterial({ color: 0x475569 });
    for (let x = -24; x <= 24; x += 3) {
      const tile = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 50), lineMat);
      tile.rotation.x = -Math.PI / 2;
      tile.position.set(x, 0.01, 0);
      this.mapEnvironmentGroup.add(tile);
    }
    for (let z = -24; z <= 24; z += 3) {
      const tile = new THREE.Mesh(new THREE.PlaneGeometry(50, 0.1), lineMat);
      tile.rotation.x = -Math.PI / 2;
      tile.position.set(0, 0.01, z);
      this.mapEnvironmentGroup.add(tile);
    }

    // Outer Walls (Supermarket mint/slate wall)
    this.createRoomWalls(50, 50, 8, 0x1e293b, 0x0284c7);

    // Ceiling with Fluorescent tube lights
    for (let x = -15; x <= 15; x += 15) {
      for (let z = -15; z <= 15; z += 10) {
        const lightBox = new THREE.Mesh(
          new THREE.BoxGeometry(1.2, 0.2, 5),
          new THREE.MeshBasicMaterial({ color: 0xffffff })
        );
        lightBox.position.set(x, 7.9, z);
        this.mapEnvironmentGroup.add(lightBox);

        const pLight = new THREE.PointLight(0xfff7ed, 0.5, 14);
        pLight.position.set(x, 7.5, z);
        this.mapEnvironmentGroup.add(pLight);
      }
    }

    // Superette Rayons (3 big Double-Sided Gondola Aisles)
    [-10, 0, 10].forEach((aisleX) => {
      this.createSupermarketAisle(aisleX, 0, 18);
    });

    // Checkout / Caisse lane at z = -16
    this.createCheckoutCounter(-8, -16);
    this.createCheckoutCounter(4, -16);

    // Beverage Glass Fridges at back wall (z = 23)
    for (let x = -16; x <= 16; x += 8) {
      this.createBeverageFridge(x, 23.5);
    }

    // Fruit and Vegetable Market Island
    this.createFruitStand(-16, -4);
    this.createFruitStand(-16, 6);

    // Shopping Carts and Baskets
    this.createShoppingCartCluster(16, -18);
    this.createShoppingCartCluster(19, -16);

    // Decoy props scattered in Superette
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
    this.spawnDecoyProp('shopping_cart', 17, 0.6, -12);
    this.spawnDecoyProp('cardboard_box', -18, 0.6, 18);
  }

  // 📦 MAP: WAREHOUSE (Entrepôt Industriel)
  private buildWarehouse() {
    this.scene.background = new THREE.Color(0x0a0f1d);
    this.scene.fog = new THREE.FogExp2(0x0a0f1d, 0.016);

    // Concrete floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(55, 55),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.mapEnvironmentGroup.add(floor);

    this.createRoomWalls(55, 55, 10, 0x111827, 0xf59e0b);

    // High metal storage racks
    [-14, 0, 14].forEach((rackX) => {
      this.createWarehouseRack(rackX, -5, 22);
    });

    // Shipping Containers
    this.createShippingContainer(-18, 18, 0x3b82f6);
    this.createShippingContainer(16, 18, 0xef4444);

    // Decoy props
    this.spawnDecoyProp('wooden_crate', -8, 0.6, 2);
    this.spawnDecoyProp('wooden_crate', -7.5, 1.6, 2);
    this.spawnDecoyProp('wooden_crate', 6, 0.6, -8);
    this.spawnDecoyProp('oil_drum', 18, 0.8, -10);
    this.spawnDecoyProp('oil_drum', 19.5, 0.8, -10);
    this.spawnDecoyProp('pallet', 0, 0.2, 12);
    this.spawnDecoyProp('cardboard_box', 2, 0.6, 12);
    this.spawnDecoyProp('traffic_cone', 8, 0.4, 0);
  }

  // 🏢 MAP: OFFICE (L'Open Space)
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

    this.createRoomWalls(50, 50, 7, 0x3f3f46, 0x10b981);

    // Desks & Cubicles
    [-12, 0, 12].forEach((x) => {
      [-8, 4, 16].forEach((z) => {
        this.createOfficeDesk(x, z);
      });
    });

    // Decoys
    this.spawnDecoyProp('office_chair', -12, 0.6, -6.5);
    this.spawnDecoyProp('office_chair', 0, 0.6, 5.5);
    this.spawnDecoyProp('pc_monitor', 12, 1.3, 16);
    this.spawnDecoyProp('water_cooler', -20, 1.1, -18);
    this.spawnDecoyProp('plant', 20, 0.8, -20);
    this.spawnDecoyProp('trash_can', -10, 0.4, -8);
    this.spawnDecoyProp('coffee_mug', 0, 1.25, -8);
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

    this.createRoomWalls(50, 50, 8, 0x1e1b4b, 0x8b5cf6);

    // Glowing Cryo Tanks in center
    [-10, 0, 10].forEach((x) => {
      this.createCryoPod(x, 0);
    });

    // Server Racks along walls
    for (let x = -18; x <= 18; x += 6) {
      this.createServerRack(x, -22);
    }

    // Decoys
    this.spawnDecoyProp('cryo_tank', 0, 1.8, 8);
    this.spawnDecoyProp('server_rack', 18, 1.8, 14);
    this.spawnDecoyProp('chemical_canister', -8, 0.5, 12);
    this.spawnDecoyProp('hazard_barrel', 14, 0.8, -10);
    this.spawnDecoyProp('microscope', -10, 1.2, -12);
  }

  // ─── ENVIRONMENT HELPERS ───────────────────────────────────────────────────

  private createRoomWalls(width: number, length: number, height: number, color: number, accentColor: number) {
    const wallMat = new THREE.MeshStandardMaterial({ color, roughness: 0.5 });
    const accentMat = new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.3 });

    const halfW = width / 2;
    const halfL = length / 2;

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

      // Accent border stripe
      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(
          w.size[0] > 1 ? w.size[0] : 1.1,
          0.3,
          w.size[2] > 1 ? w.size[2] : 1.1
        ),
        accentMat
      );
      stripe.position.set(w.pos[0], height - 0.5, w.pos[2]);
      this.mapEnvironmentGroup.add(stripe);
    });
  }

  // Superette Gondola Shelf
  private createSupermarketAisle(x: number, z: number, length: number) {
    const shelfGroup = new THREE.Group();
    shelfGroup.position.set(x, 0, z);

    // Base frame
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.4 });
    const shelfMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3 });

    // 3 Tiers of shelves on both sides
    const tiers = [0.4, 1.4, 2.4];
    tiers.forEach((y) => {
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, length), shelfMat);
      shelf.position.y = y;
      shelf.castShadow = true;
      shelfGroup.add(shelf);

      // Populate with grocery items (cereals, pasta, cans)
      for (let sz = -length / 2 + 1; sz <= length / 2 - 1; sz += 1.2) {
        // Cereal box
        const cereal = new THREE.Mesh(
          new THREE.BoxGeometry(0.35, 0.6, 0.2),
          new THREE.MeshStandardMaterial({
            color: [0xef4444, 0x3b82f6, 0x10b981, 0xf59e0b][Math.floor(Math.random() * 4)]
          })
        );
        cereal.position.set(-0.6, y + 0.3, sz);
        shelfGroup.add(cereal);

        // Can
        const can = new THREE.Mesh(
          new THREE.CylinderGeometry(0.12, 0.12, 0.35, 12),
          new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.6 })
        );
        can.position.set(0.6, y + 0.18, sz);
        shelfGroup.add(can);
      }
    });

    // Central back divider panel
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.1, 3.2, length), frameMat);
    back.position.y = 1.6;
    shelfGroup.add(back);

    this.mapEnvironmentGroup.add(shelfGroup);
  }

  private createCheckoutCounter(x: number, z: number) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    // Counter table
    const table = new THREE.Mesh(
      new THREE.BoxGeometry(4, 1.1, 1.4),
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.3 })
    );
    table.position.y = 0.55;
    table.castShadow = true;
    group.add(table);

    // Conveyor belt black rubber
    const belt = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 0.05, 0.9),
      new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9 })
    );
    belt.position.set(-0.4, 1.12, 0);
    group.add(belt);

    // Scanner plate (red glow)
    const scanner = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.06, 0.4),
      new THREE.MeshBasicMaterial({ color: 0xff0000 })
    );
    scanner.position.set(1.1, 1.13, 0);
    group.add(scanner);

    this.mapEnvironmentGroup.add(group);
  }

  private createBeverageFridge(x: number, z: number) {
    const fridge = new THREE.Group();
    fridge.position.set(x, 0, z);

    // Frame
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(4, 4, 1.5),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.5 })
    );
    frame.position.y = 2;
    fridge.add(frame);

    // Glass door with blue reflection
    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(3.6, 3.6, 0.05),
      new THREE.MeshPhysicalMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.35,
        roughness: 0.1,
        transmission: 0.8
      })
    );
    glass.position.set(0, 2, 0.76);
    fridge.add(glass);

    // Cold interior glow
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

    // Fruit heaps
    for (let bx = -1; bx <= 1; bx += 0.8) {
      for (let bz = -1.2; bz <= 1.2; bz += 0.8) {
        const fruit = new THREE.Mesh(
          new THREE.DodecahedronGeometry(0.18),
          new THREE.MeshStandardMaterial({
            color: Math.random() > 0.5 ? 0xdc2626 : 0xf97316
          })
        );
        fruit.position.set(bx, 1.1, bz);
        stand.add(fruit);
      }
    }

    this.mapEnvironmentGroup.add(stand);
  }

  private createShoppingCartCluster(x: number, z: number) {
    for (let i = 0; i < 4; i++) {
      const cart = this.buildPropMesh('shopping_cart');
      cart.position.set(x, 0.5, z + i * 0.9);
      cart.rotation.y = Math.PI / 2 + (Math.random() - 0.5) * 0.1;
      this.mapEnvironmentGroup.add(cart);
      this.staticDecoyMeshes.push(cart);
    }
  }

  private createWarehouseRack(x: number, z: number, length: number) {
    const rack = new THREE.Group();
    rack.position.set(x, 0, z);
    const orangeMat = new THREE.MeshStandardMaterial({ color: 0xea580c });
    const blueMat = new THREE.MeshStandardMaterial({ color: 0x2563eb });

    // Uprights
    for (let sz = -length / 2; sz <= length / 2; sz += 4) {
      [-1, 1].forEach((px) => {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.15, 7, 0.15), blueMat);
        post.position.set(px, 3.5, sz);
        rack.add(post);
      });
    }

    // Beams
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

    // Desktop
    const top = new THREE.Mesh(
      new THREE.BoxGeometry(3, 0.1, 1.6),
      new THREE.MeshStandardMaterial({ color: 0xd4d4d8 })
    );
    top.position.y = 1.2;
    top.castShadow = true;
    desk.add(top);

    // Metal legs
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

    // Base
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 1.4, 0.6, 16),
      new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8 })
    );
    base.position.y = 0.3;
    pod.add(base);

    // Glass tube
    const tube = new THREE.Mesh(
      new THREE.CylinderGeometry(1, 1, 3.5, 16),
      new THREE.MeshPhysicalMaterial({
        color: 0x06b6d4,
        transparent: true,
        opacity: 0.4,
        roughness: 0.1,
        transmission: 0.9
      })
    );
    tube.position.y = 2.2;
    pod.add(tube);

    const light = new THREE.PointLight(0x06b6d4, 1, 5);
    light.position.y = 2.2;
    pod.add(light);

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
      // 🥤 Soda Can
      case 'soda_can': {
        const can = new THREE.Mesh(
          new THREE.CylinderGeometry(0.2, 0.2, 0.6, 16),
          new THREE.MeshStandardMaterial({ color: 0xdc2626, metalness: 0.8, roughness: 0.2 })
        );
        can.castShadow = true;
        group.add(can);
        break;
      }

      // 🥣 Cereal Box
      case 'cereal_box': {
        const box = new THREE.Mesh(
          new THREE.BoxGeometry(0.6, 0.9, 0.3),
          new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4 })
        );
        box.castShadow = true;
        group.add(box);
        break;
      }

      // 🛒 Shopping Cart
      case 'shopping_cart': {
        const cartMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, wireframe: false });
        const basket = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.6, 1.2), cartMat);
        basket.position.y = 0.4;
        const wheel1 = new THREE.Mesh(new THREE.SphereGeometry(0.1), cartMat);
        wheel1.position.set(-0.4, -0.2, -0.4);
        const wheel2 = new THREE.Mesh(new THREE.SphereGeometry(0.1), cartMat);
        wheel2.position.set(0.4, -0.2, -0.4);
        group.add(basket, wheel1, wheel2);
        break;
      }

      // 📟 Cash Register
      case 'cash_register': {
        const base = new THREE.Mesh(
          new THREE.BoxGeometry(0.8, 0.4, 0.7),
          new THREE.MeshStandardMaterial({ color: 0x334155 })
        );
        const screen = new THREE.Mesh(
          new THREE.BoxGeometry(0.4, 0.3, 0.1),
          new THREE.MeshBasicMaterial({ color: 0x22c55e })
        );
        screen.position.set(0, 0.35, -0.2);
        group.add(base, screen);
        break;
      }

      // 🥛 Milk Carton
      case 'milk_carton': {
        const carton = new THREE.Mesh(
          new THREE.BoxGeometry(0.35, 0.8, 0.35),
          new THREE.MeshStandardMaterial({ color: 0x38bdf8 })
        );
        group.add(carton);
        break;
      }

      // 🍎 Apple Basket
      case 'apple_basket': {
        const basket = new THREE.Mesh(
          new THREE.CylinderGeometry(0.5, 0.35, 0.4, 12),
          new THREE.MeshStandardMaterial({ color: 0x78350f })
        );
        const apple = new THREE.Mesh(
          new THREE.SphereGeometry(0.2),
          new THREE.MeshStandardMaterial({ color: 0xef4444 })
        );
        apple.position.y = 0.25;
        group.add(basket, apple);
        break;
      }

      // 📦 Cardboard Box
      case 'cardboard_box': {
        const box = new THREE.Mesh(
          new THREE.BoxGeometry(0.9, 0.9, 0.9),
          new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.8 })
        );
        box.castShadow = true;
        group.add(box);
        break;
      }

      // 🪵 Wooden Crate
      case 'wooden_crate': {
        const crate = new THREE.Mesh(
          new THREE.BoxGeometry(1.2, 1.2, 1.2),
          new THREE.MeshStandardMaterial({ color: 0x713f12, roughness: 0.7 })
        );
        crate.castShadow = true;
        group.add(crate);
        break;
      }

      // 🛢️ Oil Drum
      case 'oil_drum': {
        const drum = new THREE.Mesh(
          new THREE.CylinderGeometry(0.5, 0.5, 1.4, 16),
          new THREE.MeshStandardMaterial({ color: 0x1d4ed8, metalness: 0.6 })
        );
        drum.castShadow = true;
        group.add(drum);
        break;
      }

      // 🪵 Pallet
      case 'pallet': {
        const p = new THREE.Mesh(
          new THREE.BoxGeometry(1.6, 0.25, 1.6),
          new THREE.MeshStandardMaterial({ color: 0xa16207 })
        );
        group.add(p);
        break;
      }

      // 🚧 Traffic Cone
      case 'traffic_cone': {
        const cone = new THREE.Mesh(
          new THREE.ConeGeometry(0.35, 1, 16),
          new THREE.MeshStandardMaterial({ color: 0xf97316 })
        );
        const base = new THREE.Mesh(
          new THREE.BoxGeometry(0.8, 0.08, 0.8),
          new THREE.MeshStandardMaterial({ color: 0x0f172a })
        );
        base.position.y = -0.5;
        group.add(cone, base);
        break;
      }

      // 🪑 Office Chair
      case 'office_chair': {
        const seat = new THREE.Mesh(
          new THREE.BoxGeometry(0.8, 0.15, 0.8),
          new THREE.MeshStandardMaterial({ color: 0x18181b })
        );
        const back = new THREE.Mesh(
          new THREE.BoxGeometry(0.8, 0.8, 0.15),
          new THREE.MeshStandardMaterial({ color: 0x18181b })
        );
        back.position.set(0, 0.45, -0.35);
        const pole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08, 0.08, 0.6),
          new THREE.MeshStandardMaterial({ color: 0x71717a, metalness: 0.8 })
        );
        pole.position.y = -0.35;
        group.add(seat, back, pole);
        break;
      }

      // 🖥️ PC Monitor
      case 'pc_monitor': {
        const screen = new THREE.Mesh(
          new THREE.BoxGeometry(1, 0.6, 0.08),
          new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
        );
        const stand = new THREE.Mesh(
          new THREE.CylinderGeometry(0.05, 0.15, 0.4),
          new THREE.MeshStandardMaterial({ color: 0x09090b })
        );
        stand.position.y = -0.4;
        group.add(screen, stand);
        break;
      }

      // 💧 Water Cooler
      case 'water_cooler': {
        const stand = new THREE.Mesh(
          new THREE.CylinderGeometry(0.4, 0.4, 1.4, 16),
          new THREE.MeshStandardMaterial({ color: 0xf4f4f5 })
        );
        const bottle = new THREE.Mesh(
          new THREE.CylinderGeometry(0.35, 0.35, 0.9, 16),
          new THREE.MeshPhysicalMaterial({ color: 0x0284c7, transparent: true, opacity: 0.6 })
        );
        bottle.position.y = 1.1;
        group.add(stand, bottle);
        break;
      }

      // 🪴 Plant
      case 'plant': {
        const pot = new THREE.Mesh(
          new THREE.CylinderGeometry(0.35, 0.25, 0.6, 12),
          new THREE.MeshStandardMaterial({ color: 0x9a3412 })
        );
        const leaf = new THREE.Mesh(
          new THREE.SphereGeometry(0.5, 8, 8),
          new THREE.MeshStandardMaterial({ color: 0x15803d })
        );
        leaf.position.y = 0.55;
        group.add(pot, leaf);
        break;
      }

      // 🗑️ Trash Can
      case 'trash_can': {
        const can = new THREE.Mesh(
          new THREE.CylinderGeometry(0.35, 0.3, 0.7, 16),
          new THREE.MeshStandardMaterial({ color: 0x52525b, metalness: 0.7 })
        );
        group.add(can);
        break;
      }

      // Default fallback
      default: {
        const box = new THREE.Mesh(
          new THREE.BoxGeometry(0.8, 0.8, 0.8),
          new THREE.MeshStandardMaterial({ color: 0x64748b })
        );
        group.add(box);
        break;
      }
    }

    // Tag group for easy raycast detection
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

  // ─── 1-BULLET HUNTER WEAPON ────────────────────────────────────────────────

  private createWeaponModel() {
    const weaponGroup = new THREE.Group();

    // Rifle / Shotgun barrel
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.035, 1.2, 12),
      new THREE.MeshStandardMaterial({ color: 0x18181b, metalness: 0.9, roughness: 0.2 })
    );
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0, -0.4);

    // Wooden stock
    const stock = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.14, 0.6),
      new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.5 })
    );
    stock.position.set(0, -0.06, 0.2);

    // Single bullet breach chamber
    const breach = new THREE.Mesh(
      new THREE.BoxGeometry(0.09, 0.09, 0.15),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.9 })
    );
    breach.position.set(0, 0.02, 0);

    weaponGroup.add(barrel, stock, breach);

    // Position relative to camera (bottom-right 1st-person view)
    weaponGroup.position.set(0.35, -0.32, -0.65);
    weaponGroup.rotation.y = -0.08;
    this.camera.add(weaponGroup);
    this.scene.add(this.camera);

    this.weaponMesh = weaponGroup;
  }

  public shootWeapon(): { success: boolean; reason?: string } {
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

    // Shoot!
    this.hasAmmo = false;
    propAudio.playGunshot();

    // Kickback animation
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

    // Raycast center
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);

    // Check collision with other player props first
    const playerTargets: THREE.Object3D[] = [];
    this.playerMeshes.forEach((mesh, playerId) => {
      if (playerId !== this.myPlayerId) {
        playerTargets.push(mesh);
      }
    });

    const playerIntersects = this.raycaster.intersectObjects(playerTargets, true);
    if (playerIntersects.length > 0) {
      // Find top group
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

    // Check collision with static decoys
    const decoyIntersects = this.raycaster.intersectObjects(this.staticDecoyMeshes, true);
    if (decoyIntersects.length > 0) {
      // Shot an innocent decoy! Miss penalty
      propAudio.playDamage();
      this.callbacks.onShoot?.(null);
      return { success: true };
    }

    // Shot a wall / floor
    this.callbacks.onShoot?.(null);
    return { success: true };
  }

  public reloadWeapon() {
    if (this.isReloading || this.hasAmmo) return;
    this.isReloading = true;
    this.reloadProgress = 0;
    propAudio.playReload();

    // 1.5s reload animation
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

  public updateGameState(gameState: PropHuntGameState) {
    this.currentPhase = gameState.phase;

    // Check if map changed
    if (gameState.selectedMap && gameState.selectedMap !== this.currentMapId) {
      this.buildMap(gameState.selectedMap);
    }

    // Update or spawn player meshes
    const currentIds = new Set(gameState.players.map((p) => p.id));

    // Remove disconnected
    this.playerMeshes.forEach((mesh, id) => {
      if (!currentIds.has(id)) {
        this.scene.remove(mesh);
        this.playerMeshes.delete(id);
      }
    });

    gameState.players.forEach((player) => {
      const isMe = player.id === this.myPlayerId;

      if (!this.playerMeshes.has(player.id)) {
        // Create new player mesh
        const mesh = this.buildPlayerMesh(player);
        this.scene.add(mesh);
        this.playerMeshes.set(player.id, mesh);
      }

      const mesh = this.playerMeshes.get(player.id)!;

      // If prop changed, rebuild mesh
      if (mesh.userData.currentProp !== player.currentProp || mesh.userData.role !== player.role) {
        this.scene.remove(mesh);
        const newMesh = this.buildPlayerMesh(player);
        this.scene.add(newMesh);
        this.playerMeshes.set(player.id, newMesh);
      }

      // Update positions
      if (!isMe) {
        mesh.position.set(player.position[0], player.position[1], player.position[2]);
        mesh.rotation.set(player.rotation[0], player.rotation[1], player.rotation[2]);
        // Hide eliminated spectators
        mesh.visible = player.role !== 'SPECTATOR';
      } else {
        // For local player: hide local mesh if in 1st person hunter mode
        mesh.visible = player.role === 'HIDER';
      }
    });

    // Play taunt sound if any active
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
      // Hunter character model (Trench coat + hat)
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
      // Prop model for Hider
      const prop = this.buildPropMesh(player.currentProp);
      group.add(prop);
    }

    return group;
  }

  // ─── INPUTS & POINTER LOCK ─────────────────────────────────────────────────

  private initInputs() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;

      if (e.code === 'KeyR') {
        this.reloadWeapon();
      }
      if (e.code === 'KeyE') {
        this.callbacks.onChangeProp?.();
      }
      if (e.code === 'ShiftLeft' || e.code === 'KeyQ') {
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
    });

    this.container.addEventListener('click', () => {
      if (!this.isPointerLocked) {
        this.container.requestPointerLock();
      } else {
        this.shootWeapon();
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
      this.pitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, this.pitch));
    });
  }

  // ─── ANIMATION LOOP ────────────────────────────────────────────────────────

  private animate = () => {
    this.animationFrameId = requestAnimationFrame(this.animate);

    const delta = Math.min(this.clock.getDelta(), 0.1);
    this.updateMovement(delta);
    this.renderer.render(this.scene, this.camera);
  };

  private updateMovement(delta: number) {
    // If not pointer locked, do nothing
    if (!this.isPointerLocked && this.currentPhase !== 'LOBBY') {
      // Still apply camera rotation
      return;
    }

    const moveSpeed = 10;
    const inputVector = new THREE.Vector3();

    if (this.keys['KeyW'] || this.keys['ArrowUp']) inputVector.z -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) inputVector.z += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) inputVector.x -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) inputVector.x += 1;

    if (inputVector.lengthSq() > 0) {
      inputVector.normalize();
      inputVector.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
      this.position.addScaledVector(inputVector, moveSpeed * delta);
    }

    // Boundary clamping (-23 to 23)
    this.position.x = Math.max(-23, Math.min(23, this.position.x));
    this.position.z = Math.max(-23, Math.min(23, this.position.z));

    // Update Camera
    this.camera.position.set(this.position.x, this.position.y + 1.6, this.position.z);
    this.camera.rotation.set(0, 0, 0);
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;

    // Update local player mesh if hider
    if (this.myPlayerId && this.playerMeshes.has(this.myPlayerId)) {
      const myMesh = this.playerMeshes.get(this.myPlayerId)!;
      myMesh.position.set(this.position.x, this.position.y, this.position.z);
      myMesh.rotation.y = this.yaw;
    }

    // Emit movement to server periodically (every 50ms)
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
