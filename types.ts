
export type Photo = {
  id: string;
  blob?: Blob; 
  dataUrl: string; 
  label: string;
  direction?: 'north' | 'south' | 'east' | 'west' | 'center' | string;
  timestamp?: string;
  markerId?: string;
};

export type WorkflowStep = 
  | 'preparation'   
  | 'floor_drafting' 
  | 'entry_setup'    
  | 'underfloor'    
  | 'completion';   

export type MarkerType = 
  // Inspection markers
  'photo' | 'intrusion' | 'presence' | 'access_point' | 
  'foundation_line' | 'foundation_line_free' | 'foundation_line_block' | 'foundation_line_block_free' |
  'access_opening' | 'ventilation_opening' | 'crack_line' |
  // New construction marker types
  'impassable_area' | 'spray_arrow' | 'chipping_expand' | 'chipping_full' |
  'drilling_injection' | 'agitator_fan' | 'blower_fan' | 'timer' | 'bamboo_charcoal' |
  // Room Drafting
  'room' |
  // Name/Annotation
  'comment_box' | 'rectangle_outline' |
  // Fixed Text Markers
  'text_entrance' | 'text_kitchen' | 'text_hall' | 'text_porch' |
  'text_living' | 'text_dining' | 'text_k' |
  'text_tatami1' | 'text_tatami2' | 'text_tatami3' | 'text_tatami4' | 'text_tatami5' |
  'text_toilet' | 'text_washroom' | 'text_tiled_bath' | 'text_ub' |
  'text_service_entrance' | 'text_pantry' | 'text_sc' | 'text_closet' |
  'text_storage' | 'text_stairs' | 'text_doma' | 'text_parking' | 'text_warehouse' |
  // New Text Markers
  'text_laundry' | 'text_laundry_room' | 'text_nando' | 'text_western' |
  'text_free_room' | 'text_butsu' | 'text_toko' | 'text_lcl' |
  // Newly requested text markers
  'text_washitsu' | 'text_hallway' | 'text_changing' | 'text_wash_change' |
  'text_closet_katakana' | 'text_oshiire' | 'text_monoire' | 'text_balcony' |
  'text_terrace' | 'text_back_door' | 'text_veranda' | 'text_den' | 'text_atrium';

export type Marker = {
  id: string;
  x: number; 
  y: number; 
  type: MarkerType;
  number?: number;
  rotation?: number; 
  length?: number;   
  width?: number;    
  height?: number;   
  gridW?: number; 
  gridH?: number; 
  text?: string;
  comment?: string;
  targetX?: number; 
  targetY?: number; 
  lineThickness?: number; 
  color?: string; 
  photoId?: string; 
  metadata?: Record<string, unknown>;
};

export type TutorialStep = 
  | 'none'
  | 'welcome'
  | 'place_room'
  | 'place_access'
  | 'underfloor_photo'
  | 'finish';
