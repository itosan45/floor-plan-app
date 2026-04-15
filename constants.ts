
import { MarkerType } from './types';

export type MarkerCategory = 'inspection' | 'construction' | 'name';
export type InteractionType = 'point' | 'line' | 'area' | 'photo_drag';

// Grid configuration
export const GRID_CELL_COUNT = 50;
export const BASE_CONTAINER_WIDTH = 752;
export const GRID_DRAWING_SUBDIVISIONS = 2; // 0.5マス = 455mm, 1マス = 910mm

export interface MarkerDef {
    label: string;
    category: MarkerCategory;
    interaction: InteractionType;
    isOrthogonal?: boolean; 
    isFree?: boolean; 
    fixedLength?: boolean; 
    autoSelect?: boolean; 
    defaultText?: string;
    shouldSnap?: boolean; // 新規: グリッドにスナップさせるかどうか
}

export const MARKER_DEFINITIONS: Record<MarkerType, MarkerDef> = {
    // Inspection
    photo: { label: '撮影箇所', category: 'inspection', interaction: 'photo_drag', shouldSnap: false },
    intrusion: { label: '白蟻侵入 (✖)', category: 'inspection', interaction: 'point', shouldSnap: true },
    presence: { label: '白蟻生息 (太✖)', category: 'inspection', interaction: 'point', shouldSnap: true },
    access_point: { label: '床下侵入口 (■×)', category: 'inspection', interaction: 'point', shouldSnap: true },
    
    foundation_line: { label: '基礎(直交)', category: 'inspection', interaction: 'line', isOrthogonal: true, shouldSnap: true },
    foundation_line_free: { label: '基礎(自由線)', category: 'inspection', interaction: 'line', isFree: true, shouldSnap: false },
    foundation_line_block: { label: '基礎(ブロック)', category: 'inspection', interaction: 'line', isOrthogonal: true, shouldSnap: true },
    foundation_line_block_free: { label: '基礎(ブロック自由線)', category: 'inspection', interaction: 'line', isFree: true, shouldSnap: false },
    
    access_opening: { label: '人通口', category: 'inspection', interaction: 'area', shouldSnap: true },
    ventilation_opening: { label: '通気口(網)', category: 'inspection', interaction: 'area', shouldSnap: true },
    crack_line: { label: 'クラック(波線)', category: 'inspection', interaction: 'line', isFree: true, shouldSnap: false },

    rectangle_outline: { label: '四角形(枠)', category: 'inspection', interaction: 'area', shouldSnap: true },

    // Construction
    impassable_area: { label: '検査困難エリア', category: 'construction', interaction: 'area', shouldSnap: true },
    spray_arrow: { label: '薬剤吹付', category: 'construction', interaction: 'photo_drag', shouldSnap: false },
    
    chipping_expand: { label: 'ハツリ(拡)', category: 'construction', interaction: 'point', shouldSnap: false },
    chipping_full: { label: 'ハツリ(全)', category: 'construction', interaction: 'point', shouldSnap: false },
    
    drilling_injection: { label: '穿孔注入エリア', category: 'construction', interaction: 'area', shouldSnap: true },
    
    agitator_fan: { label: '攪拌ファン', category: 'construction', interaction: 'point', shouldSnap: true },
    blower_fan: { label: 'ブロワー', category: 'construction', interaction: 'photo_drag', shouldSnap: true },
    
    timer: { label: 'タイマー', category: 'construction', interaction: 'point', shouldSnap: true },
    bamboo_charcoal: { label: '竹炭天国', category: 'construction', interaction: 'point', shouldSnap: false },
    
    // Name (formerly Annotation)
    comment_box: { label: '吹き出し', category: 'name', interaction: 'point', defaultText: 'コメントを入力', shouldSnap: false },
    
    // Fixed Text Markers
    text_entrance: { label: '玄関', category: 'name', interaction: 'photo_drag', shouldSnap: false },
    text_kitchen: { label: 'キッチン', category: 'name', interaction: 'photo_drag', shouldSnap: false },
    text_hall: { label: 'ホール', category: 'name', interaction: 'photo_drag', shouldSnap: false },
    text_porch: { label: 'ポーチ', category: 'name', interaction: 'photo_drag', shouldSnap: false },
    text_living: { label: 'L', category: 'name', interaction: 'photo_drag', shouldSnap: false },
    text_dining: { label: 'D', category: 'name', interaction: 'photo_drag', shouldSnap: false },
    text_k: { label: 'K', category: 'name', interaction: 'photo_drag', shouldSnap: false },
    text_tatami1: { label: '和室1', category: 'name', interaction: 'photo_drag', shouldSnap: false },
    text_tatami2: { label: '和室2', category: 'name', interaction: 'photo_drag', shouldSnap: false },
    text_tatami3: { label: '和室3', category: 'name', interaction: 'photo_drag', shouldSnap: false },
    text_tatami4: { label: '和室4', category: 'name', interaction: 'photo_drag', shouldSnap: false },
    text_tatami5: { label: '和室5', category: 'name', interaction: 'photo_drag', shouldSnap: false },
    text_toilet: { label: 'WC', category: 'name', interaction: 'photo_drag', shouldSnap: false },
    text_washroom: { label: '洗面', category: 'name', interaction: 'photo_drag', shouldSnap: false },
    text_tiled_bath: { label: 'タイル浴室', category: 'name', interaction: 'photo_drag', shouldSnap: false },
    text_ub: { label: 'UB', category: 'name', interaction: 'photo_drag', shouldSnap: false },
    text_service_entrance: { label: '勝手', category: 'name', interaction: 'photo_drag', shouldSnap: false },
    text_pantry: { label: 'パントリー', category: 'name', interaction: 'photo_drag', shouldSnap: false },
    text_sc: { label: 'SC', category: 'name', interaction: 'photo_drag', shouldSnap: false },
    text_closet: { label: '押入れ', category: 'name', interaction: 'photo_drag', shouldSnap: false },
    text_storage: { label: '収納', category: 'name', interaction: 'photo_drag', shouldSnap: false },
    text_stairs: { label: '階段', category: 'name', interaction: 'photo_drag', shouldSnap: false },
    text_doma: { label: '土間収納', category: 'name', interaction: 'photo_drag', shouldSnap: false },
    text_parking: { label: '駐車場', category: 'name', interaction: 'photo_drag', shouldSnap: false },
    text_warehouse: { label: '倉庫', category: 'name', interaction: 'photo_drag', shouldSnap: false },
    
    // New text markers
    text_laundry: { label: 'ランドリー', category: 'name', interaction: 'photo_drag', shouldSnap: false },
    text_laundry_room: { label: '洗濯室', category: 'name', interaction: 'photo_drag', shouldSnap: false },
    text_nando: { label: '納戸', category: 'name', interaction: 'photo_drag', shouldSnap: false },
    text_western: { label: '洋室', category: 'name', interaction: 'photo_drag', shouldSnap: false },
    text_free_room: { label: 'フリールーム', category: 'name', interaction: 'photo_drag', shouldSnap: false },
    text_butsu: { label: '仏', category: 'name', interaction: 'photo_drag', shouldSnap: false },
    text_toko: { label: '床', category: 'name', interaction: 'photo_drag', shouldSnap: false },
    text_lcl: { label: 'LCL', category: 'name', interaction: 'photo_drag', shouldSnap: false },

    // Newly requested markers
    text_washitsu: { label: '和室', category: 'name', interaction: 'photo_drag', shouldSnap: false },
    text_hallway: { label: '廊下', category: 'name', interaction: 'photo_drag', shouldSnap: false },
    text_changing: { label: '脱衣所', category: 'name', interaction: 'photo_drag', shouldSnap: false },
    text_wash_change: { label: '洗面脱衣', category: 'name', interaction: 'photo_drag', shouldSnap: false },
    text_closet_katakana: { label: 'クローゼット', category: 'name', interaction: 'photo_drag', shouldSnap: false },
    text_oshiire: { label: '押入', category: 'name', interaction: 'photo_drag', shouldSnap: false },
    text_monoire: { label: '物入', category: 'name', interaction: 'photo_drag', shouldSnap: false },
    text_balcony: { label: 'バルコニー', category: 'name', interaction: 'photo_drag', shouldSnap: false },
    text_terrace: { label: 'テラス', category: 'name', interaction: 'photo_drag', shouldSnap: false },
    text_back_door: { label: '勝手口', category: 'name', interaction: 'photo_drag', shouldSnap: false },
    text_veranda: { label: '縁側', category: 'name', interaction: 'photo_drag', shouldSnap: false },
    text_den: { label: '書斎', category: 'name', interaction: 'photo_drag', shouldSnap: false },
    text_atrium: { label: '吹抜', category: 'name', interaction: 'photo_drag', shouldSnap: false },
};

export const MARKER_SORT_ORDER: MarkerType[] = [
    'rectangle_outline', 
    'access_opening',
    'foundation_line', 
    'foundation_line_free',
    'foundation_line_block', 
    'foundation_line_block_free',
    'crack_line',
    'ventilation_opening',
    'photo', 
    'intrusion', 
    'presence', 
    'access_point',
    'impassable_area',
    'spray_arrow', 
    'drilling_injection', 
    'chipping_expand', 
    'chipping_full',
    'agitator_fan', 
    'blower_fan', 
    'timer', 
    'bamboo_charcoal', 
    'comment_box',
    'text_entrance', 'text_kitchen', 'text_hall', 'text_hallway', 'text_porch',
    'text_living', 'text_dining', 'text_k',
    'text_washitsu', 'text_tatami1', 'text_tatami2', 'text_tatami3', 'text_tatami4', 'text_tatami5',
    'text_western', 'text_free_room', 'text_den',
    'text_toilet', 'text_washroom', 'text_changing', 'text_wash_change', 'text_laundry', 'text_laundry_room', 
    'text_tiled_bath', 'text_ub',
    'text_service_entrance', 'text_back_door', 'text_pantry', 'text_sc',
    'text_closet', 'text_closet_katakana', 'text_oshiire', 'text_storage', 'text_monoire', 'text_nando', 'text_lcl', 'text_butsu', 'text_toko', 
    'text_stairs', 'text_doma', 'text_atrium', 'text_veranda',
    'text_balcony', 'text_terrace', 'text_parking', 'text_warehouse'
];

export const APP_INFO = {
    VERSION: 'v1.1.6',
    UPDATED_AT: '2026/04/16 03:14',
    RELEASES_API_URL: 'https://api.github.com/repos/itosan45/floor-plan-app/releases/latest'
};
