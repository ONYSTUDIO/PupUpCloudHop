import type { CloudIslandConfig, CloudType } from '@game-types/game';

export const SCENE_KEYS = {
  BOOT: 'BootScene',
  PRELOAD: 'PreloadScene',
  TITLE: 'TitleScene',
  MAIN: 'MainScene',
  GAME: 'GameScene',
  RESULT: 'ResultScene',
  SHOP: 'ShopScene',
  ROULETTE: 'RouletteScene',
} as const;

export const STORAGE_KEYS = {
  SAVE_DATA: 'pup_up_save',
} as const;

export const EVENTS = {
  SCORE_UPDATE: 'score_update',
  GAME_OVER: 'game_over',
  GAME_START: 'game_start',
  BIG_JUMP: 'big_jump',
  MILESTONE: 'milestone',
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
  // 인게임 자석 아이템
  MAGNET_ITEM_SPAWN_MIN: 3,     // 자석 아이템 최소 스폰 간격 (패턴1 구름 기준)
  MAGNET_ITEM_SPAWN_MAX: 7,     // 자석 아이템 최대 스폰 간격
  MAGNET_ITEM_HOVER_Y: 90,      // 구름 상단에서 아이템 띄우는 높이 (px)
  // 인게임 얼음 아이템 / 구름 동결 효과
  ICE_FREEZE_DURATION_SEC: 10,  // 구름 동결 지속 시간 (초)
  ICE_ITEM_SPAWN_MIN: 4,        // 얼음 아이템 최소 스폰 간격 (패턴1 구름 기준)
  ICE_ITEM_SPAWN_MAX: 9,        // 얼음 아이템 최대 스폰 간격
  ICE_ITEM_HOVER_Y: 88,         // 구름 상단에서 아이템 띄우는 높이 (px)
  // 부활
  REVIVE_DIAMOND_COST: 3,         // 다이아몬드로 부활 시 소모량
  // 인게임 타임슬로우 아이템
  TIME_SLOW_DURATION_SEC: 8,    // 타임슬로우 지속 시간 (초)
  TIME_SLOW_FACTOR: 0.25,       // 게임 세계 delta 배율 (0.25 = 25% 속도, 75% 감속)
  TIME_SLOW_ITEM_SPAWN_MIN: 5,  // 아이템 최소 스폰 간격 (패턴1 구름 기준)
  TIME_SLOW_ITEM_SPAWN_MAX: 10, // 아이템 최대 스폰 간격
  TIME_SLOW_ITEM_HOVER_Y: 86,   // 구름 상단에서 아이템 띄우는 높이 (px)
} as const;

// 동적 구름 스폰 / 디스폰 설정
export const SPAWN_CONFIG = {
  // 카메라 상단 기준 이 거리만큼 위에 구름을 미리 생성
  LOOKAHEAD: 2400,
  // 카메라 하단 기준 이 거리 아래 구름 제거
  DESPAWN_BUFFER: 500,
  // 구름섬 세로 간격 — 이전 구름 풍선 하단 ~ 다음 구름 섬 상단(이미지 기준) 추가 여유 간격
  // 이 두 값이 0이어도 CLOUD_SAFE_VISUAL_BOTTOM + CLOUD_SAFE_VISUAL_TOP 만큼은 자동 확보됨
  CLOUD_VERTICAL_GAP_MIN: 20,
  CLOUD_VERTICAL_GAP_MAX: 70,
  // 겹침 방지 정적 안전 버퍼 (궤도 최대 오프셋 + 스프라이트 시각 크기 최대 추정값)
  // centerY ~ 풍선 하단: orbitRadiusY 최대 50 + balloonBottomLocalY 최대 ≈ 181 → 보수적 200
  CLOUD_SAFE_VISUAL_BOTTOM: 200,
  // centerY ~ 섬 이미지 상단: orbitRadiusY 최대 50 + islandH*ISLAND_ORIGIN_Y 최대 ≈ 156 → 보수적 185
  CLOUD_SAFE_VISUAL_TOP: 185,
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
  // 점수 기반 해금 임계값
  BIRD_UNLOCK_SCORE: 10,
  STORM_UNLOCK_SCORE: 30,
  // 해금 직후 첫 스폰까지 유예 시간
  BIRD_UNLOCK_DELAY_MS: 3000,
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

// ─── 초기 구름섬 레이아웃 생성 ─────────────────────────────────────────────
// 매 게임 시작 시 buildInitialLayout()을 호출해 랜덤 배치를 생성한다.
// 가로 3등분 룰(LEFT/CENTER/RIGHT), center 연속 방지, 세로 간격 모두 SpawnSystem과 동일 기준 적용.
//
// c0 위치 근거: ACTION_AREA_TOP(1680) - bottomGap(60) - orbitRadiusY(22) - balloonH(128) = 1470
//   → c0 풍선 하단이 액션 패널 바로 위에 위치하도록 역산. c0는 매번 고정.

const _CLOUD_TYPES: CloudType[] = ['A', 'B', 'C', 'D'];
const _INITIAL_COUNT = 6;
const _C0_Y   = 1470;
const _C0_X   = 540;
const _BW     = 1080; // BASE_WIDTH (순환 참조 없이 인라인)

function _ri(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function buildInitialLayout(): CloudIslandConfig[] {
  const layout: CloudIslandConfig[] = [];
  let prevY    = _C0_Y;
  let lastZone: 'left' | 'center' | 'right' = 'center'; // c0 고정 위치는 center

  for (let i = 0; i < _INITIAL_COUNT; i++) {
    if (i === 0) {
      layout.push({
        id: 'c0', centerX: _C0_X, centerY: _C0_Y,
        orbitRadiusX: 90, orbitRadiusY: 28,
        orbitSpeed: 0.55, startAngle: 0, rotationDirection: 1,
        width: 330, height: 80, cloudType: 'A',
      });
      continue;
    }

    const width        = _ri(240, 310);
    const orbitRadiusX = _ri(80, 145);
    const orbitRadiusY = _ri(28, 50);
    const margin       = orbitRadiusX + width / 2 + 30;
    const lo           = Math.ceil(margin);
    const hi           = Math.floor(_BW - margin);
    const third        = _BW / 3;

    let centerX: number;
    if (lastZone === 'center') {
      // center 연속 방지: 좌/우 존만 허용
      const leftHi  = Math.min(Math.floor(third) - 1, hi);
      const rightLo = Math.max(Math.ceil(third * 2) + 1, lo);
      const canL = lo <= leftHi;
      const canR = rightLo <= hi;
      if (canL && canR) {
        centerX = Math.random() < 0.5 ? _ri(lo, leftHi) : _ri(rightLo, hi);
      } else if (canL) {
        centerX = _ri(lo, leftHi);
      } else if (canR) {
        centerX = _ri(rightLo, hi);
      } else {
        centerX = _ri(lo, hi);
      }
    } else {
      centerX = _ri(lo, hi);
    }

    lastZone = centerX < third ? 'left' : centerX > third * 2 ? 'right' : 'center';

    // 세로 간격: SPAWN_CONFIG.CLOUD_SAFE_VISUAL_BOTTOM(200) + TOP(185) + 랜덤 여유(20~70)
    prevY -= _ri(405, 455);

    layout.push({
      id: `c${i}`,
      centerX,
      centerY: prevY,
      orbitRadiusX,
      orbitRadiusY,
      orbitSpeed:        0.55 + Math.random() * 0.55,
      startAngle:        Math.random() * Math.PI * 2,
      rotationDirection: (Math.random() < 0.5 ? 1 : -1) as (1 | -1),
      width,
      height:    _ri(60, 80),
      cloudType: _CLOUD_TYPES[_ri(0, 3)]!,
    });
  }

  return layout;
}
