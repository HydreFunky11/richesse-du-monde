export type PropHuntMapId = 'superette' | 'warehouse' | 'office' | 'lab';

export type PropHuntRole = 'SEEKER' | 'HIDER' | 'SPECTATOR';

export type PropHuntPhase = 'LOBBY' | 'HIDING' | 'HUNTING' | 'FINISHED';

export interface PropHuntPlayer {
  id: string;
  username: string;
  role: PropHuntRole;
  health: number;
  maxHealth: number;
  position: [number, number, number];
  rotation: [number, number, number];
  currentProp: string;
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
  mapVotes: Record<string, PropHuntMapId>;
  hidingTimeRemaining: number;
  roundTimeRemaining: number;
  roundDuration: number;
  hunterId: string | null;
  winner: 'HUNTER' | 'HIDERS' | null;
  activeTaunts: PropHuntTaunt[];
  logs: string[];
}

export interface MapMetadata {
  id: PropHuntMapId;
  name: string;
  icon: string;
  description: string;
  tag: string;
  props: string[];
  ambientColor: number;
  bgColor: number;
}

export const MAP_METADATA: Record<PropHuntMapId, MapMetadata> = {
  superette: {
    id: 'superette',
    name: 'La Supérette',
    icon: '🛒',
    description: 'Rayons de supermarché, caisses, boissons fraîches et caddies.',
    tag: 'Nouveau',
    props: ['soda_can', 'cereal_box', 'shopping_cart', 'cash_register', 'milk_carton', 'apple_basket', 'cardboard_box'],
    ambientColor: 0xffffff,
    bgColor: 0x111827
  },
  warehouse: {
    id: 'warehouse',
    name: 'L’Entrepôt',
    icon: '📦',
    description: 'Hangar industriel avec caisses empilées, palettes et barils d’huile.',
    tag: 'Classique',
    props: ['wooden_crate', 'oil_drum', 'pallet', 'cardboard_box', 'metal_shelf', 'traffic_cone'],
    ambientColor: 0xe0e7ff,
    bgColor: 0x0f172a
  },
  office: {
    id: 'office',
    name: 'L’Open Space',
    icon: '🏢',
    description: 'Bureaux d’entreprise, fauteuils à roulettes, écrans et fontaine.',
    tag: 'Infiltration',
    props: ['office_chair', 'pc_monitor', 'water_cooler', 'coffee_mug', 'trash_can', 'plant'],
    ambientColor: 0xf3f4f6,
    bgColor: 0x18181b
  },
  lab: {
    id: 'lab',
    name: 'Labo Sci-Fi',
    icon: '🧪',
    description: 'Centre de recherche haute technologie, capsules cryo et serveurs.',
    tag: 'Futuriste',
    props: ['cryo_tank', 'server_rack', 'chemical_canister', 'microscope', 'hazard_barrel'],
    ambientColor: 0xc7d2fe,
    bgColor: 0x030712
  }
};

export const PROP_NAMES: Record<string, { label: string; icon: string }> = {
  soda_can: { label: 'Canette Soda', icon: '🥤' },
  cereal_box: { label: 'Boîte de Céréales', icon: '🥣' },
  shopping_cart: { label: 'Caddie de courses', icon: '🛒' },
  cash_register: { label: 'Caisse enregistreuse', icon: '📟' },
  milk_carton: { label: 'Brique de Lait', icon: '🥛' },
  apple_basket: { label: 'Panier de Pommes', icon: '🍎' },
  cardboard_box: { label: 'Carton d’emballage', icon: '📦' },
  wooden_crate: { label: 'Caisse en bois', icon: '🪵' },
  oil_drum: { label: 'Baril de pétrole', icon: '🛢️' },
  pallet: { label: 'Palette en bois', icon: '🪵' },
  metal_shelf: { label: 'Étagère métallique', icon: '🗄️' },
  traffic_cone: { label: 'Cône de chantier', icon: '🚧' },
  office_chair: { label: 'Chaise de bureau', icon: '🪑' },
  pc_monitor: { label: 'Écran d’ordinateur', icon: '🖥️' },
  water_cooler: { label: 'Fontaine à eau', icon: '💧' },
  coffee_mug: { label: 'Tasse à café', icon: '☕' },
  trash_can: { label: 'Poubelle de bureau', icon: '🗑️' },
  plant: { label: 'Plante verte', icon: '🪴' },
  cryo_tank: { label: 'Capsule cryo', icon: '🧊' },
  server_rack: { label: 'Baie de serveurs', icon: '🗄️' },
  chemical_canister: { label: 'Bonbonne chimique', icon: '☣️' },
  microscope: { label: 'Microscope', icon: '🔬' },
  hazard_barrel: { label: 'Fût radioactif', icon: '☢️' }
};
