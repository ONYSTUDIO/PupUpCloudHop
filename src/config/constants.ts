export const SCENE_KEYS = {
  BOOT: 'BootScene',
  PRELOAD: 'PreloadScene',
  TITLE: 'TitleScene',
  GAME: 'GameScene',
  RESULT: 'ResultScene',
} as const;

export const STORAGE_KEYS = {
  SAVE_DATA: 'pup_up_save',
} as const;

export const EVENTS = {
  SCORE_UPDATE: 'score_update',
  GAME_OVER: 'game_over',
  GAME_START: 'game_start',
} as const;

export const DEPTH = {
  BACKGROUND: 0,
  DECOR_CLOUD: 1,
  CLOUD_ISLAND: 2,
  PLAYER: 10,
  HUD: 20,
} as const;

// 동적 구름 스폰 / 디스폰 설정
export const SPAWN_CONFIG = {
  // 카메라 상단 기준 이 거리만큼 위에 구름을 미리 생성
  LOOKAHEAD: 2400,
  // 카메라 하단 기준 이 거리 아래 구름 제거
  DESPAWN_BUFFER: 500,
  // 패턴 1 구름 수직 간격
  CLOUD_SPACING_MIN: 280,
  CLOUD_SPACING_MAX: 340,
  // 패턴 2 회오리 궤도 크기
  VORTEX_RADIUS_X_MIN: 180,
  VORTEX_RADIUS_X_MAX: 240,
  VORTEX_RADIUS_Y_MIN: 80,
  VORTEX_RADIUS_Y_MAX: 120,
  // 이 수 이상 패턴 생성 후 패턴 2 허용
  PATTERN_THRESHOLD: 5,
  // 패턴 2 배치 실패 시 재시도 횟수
  MAX_PATTERN_CREATE_RETRY: 10,
} as const;

// 초기 구름섬 배치 — 프로토타입용 고정 레이아웃
// world Y 는 0(상단) → 1920(하단). 플레이어는 아래서 위로 올라간다.
export const INITIAL_CLOUD_LAYOUT = [
  { id: 'c0', centerX: 540, centerY: 1650, orbitRadiusX: 75,  orbitRadiusY: 22, orbitSpeed: 0.55, startAngle: 0,              rotationDirection:  1 as const, width: 280, height: 72 },
  { id: 'c1', centerX: 260, centerY: 1360, orbitRadiusX: 100, orbitRadiusY: 32, orbitSpeed: 0.80, startAngle: Math.PI / 3,     rotationDirection: -1 as const, width: 230, height: 64 },
  { id: 'c2', centerX: 770, centerY: 1060, orbitRadiusX: 115, orbitRadiusY: 38, orbitSpeed: 0.70, startAngle: Math.PI,         rotationDirection:  1 as const, width: 245, height: 66 },
  { id: 'c3', centerX: 380, centerY:  760, orbitRadiusX: 90,  orbitRadiusY: 28, orbitSpeed: 0.95, startAngle: Math.PI / 2,     rotationDirection: -1 as const, width: 210, height: 60 },
  { id: 'c4', centerX: 680, centerY:  460, orbitRadiusX: 105, orbitRadiusY: 35, orbitSpeed: 0.85, startAngle: Math.PI * 1.5,   rotationDirection:  1 as const, width: 215, height: 58 },
  { id: 'c5', centerX: 450, centerY:  170, orbitRadiusX: 70,  orbitRadiusY: 22, orbitSpeed: 1.10, startAngle: Math.PI * 0.7,   rotationDirection: -1 as const, width: 195, height: 56 },
] as const;
