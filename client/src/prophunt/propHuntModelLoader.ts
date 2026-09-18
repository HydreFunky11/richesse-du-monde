import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export interface ModelOptions {
  scale?: number | [number, number, number];
  position?: [number, number, number];
  rotationY?: number;
  normalizeBottom?: boolean;
}

class PropHuntModelLoader {
  private loader = new GLTFLoader();
  private cache = new Map<string, THREE.Group>();
  private normalizedTemplates = new Map<string, THREE.Group>();
  private preloaded = false;

  // Prop ID to GLB path mapping with realistic physical proportions
  public readonly PROP_MODELS: Record<string, { url: string; scale: number }> = {
    soda_can: { url: '/models/props/can.glb', scale: 0.8 }, // ~26cm height
    cereal_box: { url: '/models/props/carton.glb', scale: 0.65 }, // ~38cm height
    milk_carton: { url: '/models/props/carton-small.glb', scale: 0.7 }, // ~27cm height
    apple: { url: '/models/props/apple.glb', scale: 0.5 }, // ~10cm
    apple_basket: { url: '/models/props/shopping-basket.glb', scale: 1.4 }, // ~35cm height, 49cm width
    shopping_cart: { url: '/models/props/shopping-cart.glb', scale: 2.6 }, // ~1.01m height (human waist), 1.25m length
    cash_register: { url: '/models/props/cash-register.glb', scale: 2.2 }, // ~1.30m height
    oil_drum: { url: '/models/props/barrel.glb', scale: 1.4 }, // ~0.95m height
    barrel: { url: '/models/props/barrel.glb', scale: 1.4 }, // ~0.95m height
    burger: { url: '/models/props/burger.glb', scale: 0.8 },
    bread: { url: '/models/props/bread.glb', scale: 0.9 },
    bottle_ketchup: { url: '/models/props/bottle-ketchup.glb', scale: 0.4 },
    bottle_oil: { url: '/models/props/bottle-oil.glb', scale: 0.6 },
    metal_shelf: { url: '/models/market/shelf-end.glb', scale: 3.8 }, // ~3.04m height
  };

  // Map furniture models
  public readonly MARKET_MODELS = {
    shelfBoxes: '/models/market/shelf-boxes.glb',
    shelfBags: '/models/market/shelf-bags.glb',
    shelfEnd: '/models/market/shelf-end.glb',
    freezersStanding: '/models/market/freezers-standing.glb',
    freezer: '/models/market/freezer.glb',
    displayBread: '/models/market/display-bread.glb',
    displayFruit: '/models/market/display-fruit.glb',
    cashRegister: '/models/market/cash-register.glb',
    shoppingCart: '/models/market/shopping-cart.glb',
    shoppingBasket: '/models/market/shopping-basket.glb',
    bottleReturn: '/models/market/bottle-return.glb',
    fence: '/models/market/fence.glb',
  };

  public async preloadAll(): Promise<void> {
    if (this.preloaded) return;

    const urlsToLoad = [
      ...Object.values(this.PROP_MODELS).map((p) => p.url),
      ...Object.values(this.MARKET_MODELS)
    ];

    const uniqueUrls = Array.from(new Set(urlsToLoad));
    await Promise.all(uniqueUrls.map((url) => this.loadRawModel(url)));

    // Prepare normalized templates for all props
    for (const [propId, info] of Object.entries(this.PROP_MODELS)) {
      const raw = this.cache.get(info.url);
      if (raw) {
        const normalized = this.createNormalizedClone(raw, info.scale);
        this.normalizedTemplates.set(propId, normalized);
      }
    }

    this.preloaded = true;
    console.log('[PropHuntModelLoader] All 3D models successfully preloaded and normalized.');
  }

  private loadRawModel(url: string): Promise<THREE.Group> {
    if (this.cache.has(url)) {
      return Promise.resolve(this.cache.get(url)!);
    }

    return new Promise((resolve) => {
      this.loader.load(
        url,
        (gltf) => {
          const model = gltf.scene;
          model.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const mesh = child as THREE.Mesh;
              mesh.castShadow = true;
              mesh.receiveShadow = true;
              if (mesh.material) {
                const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
                mats.forEach((m) => {
                  const stdMat = m as THREE.MeshStandardMaterial;
                  if (stdMat.map) {
                    stdMat.map.colorSpace = THREE.SRGBColorSpace;
                    stdMat.map.needsUpdate = true;
                  }
                  stdMat.roughness = 0.6;
                  stdMat.metalness = 0.1;
                });
              }
            }
          });
          this.cache.set(url, model);
          resolve(model);
        },
        undefined,
        (err) => {
          console.warn(`[ModelLoader] Failed loading ${url}, fallback to placeholder`, err);
          const fallback = new THREE.Group();
          resolve(fallback);
        }
      );
    });
  }

  /**
   * Strictly normalizes the pivot point of any model so its lowest vertex sits at y = 0.
   */
  private createNormalizedClone(source: THREE.Group, scale: number = 1): THREE.Group {
    const clone = source.clone(true);
    clone.scale.set(scale, scale, scale);
    clone.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(clone);
    const minY = box.min.y;

    const root = new THREE.Group();
    const inner = new THREE.Group();
    inner.position.y = -minY; // shift up so bottom is strictly at y=0

    while (clone.children.length > 0) {
      inner.add(clone.children[0]);
    }
    root.add(inner);
    return root;
  }

  /**
   * Synchronously get a normalized prop mesh (cloned from preloaded templates)
   */
  public getPropMesh(propId: string): THREE.Group {
    if (this.normalizedTemplates.has(propId)) {
      const template = this.normalizedTemplates.get(propId)!;
      return template.clone(true);
    }

    // If template not preloaded yet or unknown prop, check if raw model is in cache
    const propInfo = this.PROP_MODELS[propId];
    if (propInfo && this.cache.has(propInfo.url)) {
      const raw = this.cache.get(propInfo.url)!;
      const normalized = this.createNormalizedClone(raw, propInfo.scale);
      this.normalizedTemplates.set(propId, normalized);
      return normalized.clone(true);
    }

    // Fallback: procedural shapes with bottom strictly at y = 0
    const fallback = new THREE.Group();
    switch (propId) {
      case 'cardboard_box': {
        const box = new THREE.Mesh(
          new THREE.BoxGeometry(0.8, 0.8, 0.8),
          new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.8 })
        );
        box.position.y = 0.4;
        fallback.add(box);
        break;
      }
      case 'wooden_crate': {
        const crate = new THREE.Mesh(
          new THREE.BoxGeometry(1.0, 1.0, 1.0),
          new THREE.MeshStandardMaterial({ color: 0x713f12, roughness: 0.7 })
        );
        crate.position.y = 0.5;
        fallback.add(crate);
        break;
      }
      case 'pallet': {
        const pallet = new THREE.Mesh(
          new THREE.BoxGeometry(1.5, 0.2, 1.5),
          new THREE.MeshStandardMaterial({ color: 0xa16207, roughness: 0.8 })
        );
        pallet.position.y = 0.1;
        fallback.add(pallet);
        break;
      }
      case 'office_chair': {
        const seat = new THREE.Mesh(
          new THREE.BoxGeometry(0.7, 0.12, 0.7),
          new THREE.MeshStandardMaterial({ color: 0x18181b })
        );
        seat.position.y = 0.45;
        const back = new THREE.Mesh(
          new THREE.BoxGeometry(0.7, 0.7, 0.12),
          new THREE.MeshStandardMaterial({ color: 0x18181b })
        );
        back.position.set(0, 0.85, -0.3);
        const leg = new THREE.Mesh(
          new THREE.CylinderGeometry(0.04, 0.04, 0.45, 8),
          new THREE.MeshStandardMaterial({ color: 0x52525b, metalness: 0.8 })
        );
        leg.position.y = 0.225;
        fallback.add(seat, back, leg);
        break;
      }
      case 'traffic_cone': {
        const cone = new THREE.Mesh(
          new THREE.ConeGeometry(0.25, 0.7, 16),
          new THREE.MeshStandardMaterial({ color: 0xf97316 })
        );
        cone.position.y = 0.35;
        const base = new THREE.Mesh(
          new THREE.BoxGeometry(0.6, 0.05, 0.6),
          new THREE.MeshStandardMaterial({ color: 0x18181b })
        );
        base.position.y = 0.025;
        fallback.add(cone, base);
        break;
      }
      default: {
        const boxMesh = new THREE.Mesh(
          new THREE.BoxGeometry(0.6, 0.6, 0.6),
          new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.6 })
        );
        boxMesh.position.y = 0.3; // base at 0
        fallback.add(boxMesh);
        break;
      }
    }
    return fallback;
  }

  /**
   * Get an instantiated market furniture model with exact bottom at y=0
   */
  public getMarketFurniture(modelUrl: string, scale: number = 1): THREE.Group {
    const raw = this.cache.get(modelUrl);
    if (!raw) {
      // Return empty group if not yet loaded
      const g = new THREE.Group();
      return g;
    }
    return this.createNormalizedClone(raw, scale);
  }
}

export const modelLoader = new PropHuntModelLoader();
