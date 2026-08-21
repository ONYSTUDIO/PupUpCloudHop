export const SCENE_KEYS = {
  BOOT: 'BootScene',
  PRELOAD: 'PreloadScene',
  TITLE: 'TitleScene',
  GAME: 'GameScene',
  RESULT: 'ResultScene',
  SHOP: 'ShopScene',
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
  BACKGROUND:  0,
  DECOR_CLOUD: 1,
  CLOUD_ISLAND: 2,
  OBSTACLE:    5,
  ITEM:        7,
  PLAYER:     10,
  EFFECT:     20,  // 파티클·이펙트
  HUD:       100,  // 모든 UI 오버레이 (HUD, 메타 아이콘, 버튼 패널)
  POPUP:     200,  // 팝업·모달
} as const;

// 별 아이템 / 로켓 모드 설정
export const ITEM_CONFIG = {
  STAR_SPAWN_EVERY_N_CLOUDS: 2, // N번째 구름마다 별 1개 등장 (패턴1 구름 기준)
  STAR_OUTER_RADIUS: 32,
  STAR_INNER_RADIUS: 14,
  STAR_HOVER_Y: 82,             // 구름 상단 표면 위로 띄우는 높이 (px)
  ROCKET_DURATION_SEC: 3,       // 로켓 모드 지속 시간 (초)
  ROCKET_SPEED: 1000,           // 로켓 상승 속도 (px/s)
  ROCKET_END_VY: -180,          // 로켓 종료 후 초기 상승 속도
  // 자석 부스터
  MAGNET_DURATION_SEC: 10,      // 자석 지속 시간 (초)
  MAGNET_TOLERANCE_MULT: 3.5,   // LAND_TOLERANCE_Y 배율 (28 → 98px)
  MAGNET_TOLERANCE_X: 60,       // 착지 X 허용 범위 확장 (구름 양쪽 끝 바깥 px)
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
  // 패턴 2 등장 확률 (0~1). 기존 50% → 낮춰서 빈도 조절
  PATTERN_2_CHANCE: 0.30,
  // 패턴 2 이후 최소 패턴 1 개수 (연속 방지 + 호흡 구간 확보)
  PATTERN_2_MIN_GAP: 3,
  // 패턴 2 진입 시 추가 Y 간격 (보텍스 하단 구름이 이전 구름과 충분히 떨어지도록)
  PATTERN_2_ENTRY_EXTRA: 130,
} as const;

// 장애물 설정
export const OBSTACLE_CONFIG = {
  // 새떼
  BIRD_FLOCK_HALF_W: 140,
  BIRD_FLOCK_HALF_H: 55,
  BIRD_FLOCK_SPEED_MIN: 220,
  BIRD_FLOCK_SPEED_MAX: 380,
  FIRST_SPAWN_DELAY_MS: 10000,
  SPAWN_INTERVAL_MIN_MS: 8000,
  SPAWN_INTERVAL_MAX_MS: 15000,
  SPAWN_Y_MARGIN_TOP: 150,
  SPAWN_Y_MARGIN_BOTTOM: 350,
  // 번개 폭풍
  STORM_FIRST_SPAWN_DELAY_MS: 25000,
  STORM_SPAWN_INTERVAL_MIN_MS: 30000,
  STORM_SPAWN_INTERVAL_MAX_MS: 60000,
  STORM_RAIN_DROP_COUNT: 80,
  STORM_RAIN_DURATION_MS: 3000,
  STORM_WARNING_DURATION_MS: 3000,
  STORM_STRIKE_DURATION_MS: 600,
  STORM_HIT_DURATION_MS: 800,
} as const;

// 초기 구름섬 배치 — 프로토타입용 고정 레이아웃
// world Y 는 0(상단) → 1920(하단). 플레이어는 아래서 위로 올라간다.
export const INITIAL_CLOUD_LAYOUT = [
  // centerY: ACTION_AREA_TOP(1680) - bottomGap(60) - orbitRadiusY(22) - balloon_tip_local(128) = 1470
  // 풍선 꼭지(+128px)가 구름 body 하단(+36px)보다 훨씬 아래까지 내려오므로 balloon 기준으로 계산
  { id: 'c0', centerX: 540, centerY: 1470, orbitRadiusX: 75,  orbitRadiusY: 22, orbitSpeed: 0.55, startAngle: 0,              rotationDirection:  1 as const, width: 280, height: 72 },
  { id: 'c1', centerX: 260, centerY: 1360, orbitRadiusX: 100, orbitRadiusY: 32, orbitSpeed: 0.80, startAngle: Math.PI / 3,     rotationDirection: -1 as const, width: 230, height: 64 },
  { id: 'c2', centerX: 770, centerY: 1060, orbitRadiusX: 115, orbitRadiusY: 38, orbitSpeed: 0.70, startAngle: Math.PI,         rotationDirection:  1 as const, width: 245, height: 66 },
  { id: 'c3', centerX: 380, centerY:  760, orbitRadiusX: 90,  orbitRadiusY: 28, orbitSpeed: 0.95, startAngle: Math.PI / 2,     rotationDirection: -1 as const, width: 210, height: 60 },
  { id: 'c4', centerX: 680, centerY:  460, orbitRadiusX: 105, orbitRadiusY: 35, orbitSpeed: 0.85, startAngle: Math.PI * 1.5,   rotationDirection:  1 as const, width: 215, height: 58 },
  { id: 'c5', centerX: 450, centerY:  170, orbitRadiusX: 70,  orbitRadiusY: 22, orbitSpeed: 1.10, startAngle: Math.PI * 0.7,   rotationDirection: -1 as const, width: 195, height: 56 },
] as const;
