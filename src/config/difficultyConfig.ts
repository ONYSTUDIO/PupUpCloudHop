/**
 * 난이도 지수 D 및 파라미터 테이블
 *
 * 모든 게임플레이 수치를 이 파일 한 곳에서 조정한다.
 * 변경 시 타입체크 통과 여부만 확인하면 됨.
 */

// ─── D 함수 (smoothstep) ────────────────────────────────────────
/**
 * 착지 횟수 → 난이도 지수 D (0~1)
 *   착지 10회까지 : D = 0
 *   착지 100회에  : D = 1
 *   smoothstep    : 초반·후반 완만, 중간 가파름
 */
export function calcDifficulty(landings: number): number {
  const t = Math.min(1, Math.max(0, (landings - 10) / 90));
  return t * t * (3 - 2 * t);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// ─── 초반 구름 궤도 상수 ────────────────────────────────────────
/**
 * c0~c4 궤도값. 아주 천천히 움직이는 "입문용" 난이도.
 * 착지 0~5회는 이 값 그대로, 6~10회는 D=0 값으로 선형 전환.
 *
 * C0_*: 시작 구름(c0) 전용 — 더 느리고 움직임이 작아 착지 직후 안정감 제공.
 * RADIUS_X_MIN/MAX·SPEED_MIN/MAX: c1~c4 스폰 시 사용하는 범위.
 * LANDING_FULL_END / LANDING_RAMP_END: 초반 → D=0 전환 구간 경계.
 */
export const EARLY_ORBIT = {
  // ── c0 전용 ─────────────────────────────────────────────────
  C0_SPEED:     0.10,  // rad/s  (주기 ≈ 63s)
  C0_RADIUS_X:  30,    // px
  C0_RADIUS_Y:  8,     // px
  // ── c1~c4 범위 ──────────────────────────────────────────────
  SPEED_MIN:    0.15,  // rad/s  (주기 ≈ 42s)
  SPEED_MAX:    0.25,  // rad/s  (주기 ≈ 25s)
  RADIUS_X_MIN: 40,    // px
  RADIUS_X_MAX: 60,    // px
  RADIUS_Y_MIN: 10,    // px
  RADIUS_Y_MAX: 16,    // px
  // ── 전환 구간 ────────────────────────────────────────────────
  LANDING_FULL_END: 5,   // 이 이하: earlyFactor = 1 (완전 초반값)
  LANDING_RAMP_END: 10,  // 이 이상: earlyFactor = 0 (D 함수만 사용)
} as const;

/**
 * c1~c4 수동 배치 레이아웃 — 지그재그 left/right 교차.
 *
 * centerX 근거:
 *   RADIUS_X_MAX=60, width=300 → margin = 60+150+30 = 240.
 *   궤도 최대 이동 시 화면 edge gap ≥ 40px: centerX ≥ 250 (left) / ≤ 830 (right).
 *   c0(540) 기준 지그재그: |ΔX| = 290(c0→c1), 580(c1↔c2), …
 *
 * dY: c0.centerY(=1470) 기준 오프셋. constants.ts buildInitialLayout() 에서 사용.
 */
export const EARLY_LAYOUT = [
  { centerX: 250, dY:  -430, width: 300, height: 88 }, // c1: left,  |ΔX|=290 from c0
  { centerX: 830, dY:  -860, width: 300, height: 88 }, // c2: right, |ΔX|=580 from c1
  { centerX: 250, dY: -1290, width: 300, height: 88 }, // c3: left,  |ΔX|=580 from c2
  { centerX: 830, dY: -1720, width: 300, height: 88 }, // c4: right, |ΔX|=580 from c3
] as const;

// ─── 파라미터 타입 ──────────────────────────────────────────────
export interface DifficultyParams {
  /** 방향 휠 진자 각속도 (rad/s) */
  oscillationSpeed: number;
  /** P1 구름 개별 궤도 속도 범위 (rad/s) */
  orbitSpeedP1Min: number;
  orbitSpeedP1Max: number;
  /** P2 vortex 그룹 궤도 속도 범위 (rad/s) */
  orbitSpeedP2Min: number;
  orbitSpeedP2Max: number;
  /** P1 구름 궤도 반지름 X 범위 (px) */
  orbitRadiusXMin: number;
  orbitRadiusXMax: number;
  /** P1 구름 궤도 반지름 Y 범위 (px) */
  orbitRadiusYMin: number;
  orbitRadiusYMax: number;
  /** 구름 폭(착지면) 범위 (px) */
  cloudWidthMin: number;
  cloudWidthMax: number;
  /**
   * 착지 판정 Y 허용 범위 (px)
   * 구름 상단을 기준으로 ±이 값 안에서 착지 인정.
   * 자석 활성 시 이 값에 MAGNET_TOLERANCE_MULT를 곱해 적용.
   */
  landToleranceY: number;
  /**
   * 착지 판정 X 여유 (px) — 구름 가장자리 바깥으로 이 거리까지 허용.
   * D와 무관하게 항상 6px로 고정 (억울한 낙사 방지용).
   * 자석 활성 시 이 값에 MAGNET_TOLERANCE_X를 더해 적용.
   */
  landToleranceX: number;
  /** 새떼 스폰 간격 범위 (ms) — 해금(착지 25회) 이후에만 적용 */
  birdSpawnIntervalMin: number;
  birdSpawnIntervalMax: number;
  /** 번개 스폰 간격 범위 (ms) — 해금(착지 50회) 이후에만 적용 */
  stormSpawnIntervalMin: number;
  stormSpawnIntervalMax: number;

  // ── 층간 간격 (이번 스프린트 제외) ────────────────────────────
  // cloudGapMin / cloudGapMax 는 이후 적용 예정.
  // CLOUD_VERTICAL_GAP_MIN/MAX (constants.ts) 변경 시
  // HEIGHT_UNIT(310px, gameplayConfig.ts)과 함께 재검토 필요.
}

// ─── D=0 기준값 (착지 ≤ 10) ──────────────────────────────────
// 괄호 안은 현재값 대비 적용 배율
const D0: DifficultyParams = {
  oscillationSpeed:      Math.PI * 0.40,  // Math.PI×0.8 × 0.5
  orbitSpeedP1Min:       0.275,           // 0.55 × 0.5
  orbitSpeedP1Max:       0.55,            // 1.10 × 0.5
  orbitSpeedP2Min:       0.15,            // base omega (보정 전); VORTEX_SPEED_REF_RY=160 기준 실제 속도
  orbitSpeedP2Max:       0.24,            //
  orbitRadiusXMin:       38,              // 95  × 0.4
  orbitRadiusXMax:       66,              // 165 × 0.4
  orbitRadiusYMin:       14,              // 34  × 0.4
  orbitRadiusYMax:       24,              // 60  × 0.4
  cloudWidthMin:         338,             // 270 × 1.25
  cloudWidthMax:         450,             // 360 × 1.25
  landToleranceY:        42,              // 28 × 1.5
  landToleranceX:        6,               // 고정
  birdSpawnIntervalMin:  8_000,           // 해금 전 미사용 — 현재값과 동일
  birdSpawnIntervalMax:  15_000,
  stormSpawnIntervalMin: 30_000,
  stormSpawnIntervalMax: 60_000,
};

// ─── D=1 기준값 (착지 ≥ 100) ─────────────────────────────────
// 괄호 안은 현재값 대비 적용 배율
const D1: DifficultyParams = {
  oscillationSpeed:      Math.PI * 0.88,  // Math.PI×0.8 × 1.1
  orbitSpeedP1Min:       0.66,            // 0.55 × 1.2
  orbitSpeedP1Max:       1.32,            // 1.10 × 1.2
  orbitSpeedP2Min:       0.35,            // base omega (보정 전)
  orbitSpeedP2Max:       0.58,            //
  orbitRadiusXMin:       105,             // 95  × 1.1
  orbitRadiusXMax:       182,             // 165 × 1.1
  orbitRadiusYMin:       37,              // 34  × 1.1
  orbitRadiusYMax:       66,              // 60  × 1.1
  cloudWidthMin:         230,             // 270 × 0.85
  cloudWidthMax:         306,             // 360 × 0.85
  landToleranceY:        28,              // 현재값 유지
  landToleranceX:        6,               // 고정
  birdSpawnIntervalMin:  5_600,           // 8000  × 0.7
  birdSpawnIntervalMax:  10_500,          // 15000 × 0.7
  stormSpawnIntervalMin: 21_000,          // 30000 × 0.7
  stormSpawnIntervalMax: 42_000,          // 60000 × 0.7
};

// ─── 초반 전환 계수 ─────────────────────────────────────────────
/**
 * 착지 횟수 → 초반 구름 궤도 가중치 (1 = 완전 초반, 0 = D=0 이후).
 * LANDING_FULL_END 이하 → 1, LANDING_RAMP_END 이상 → 0, 그 사이 선형.
 */
function earlyFactor(landings: number): number {
  const { LANDING_FULL_END, LANDING_RAMP_END } = EARLY_ORBIT;
  if (landings <= LANDING_FULL_END) return 1;
  if (landings >= LANDING_RAMP_END) return 0;
  return 1 - (landings - LANDING_FULL_END) / (LANDING_RAMP_END - LANDING_FULL_END);
}

// ─── 착지 횟수 → 파라미터 ──────────────────────────────────────
/**
 * 착지 횟수를 받아 현재 난이도에 맞는 파라미터를 반환한다.
 *
 * 착지  0~ 5: EARLY_ORBIT 값
 * 착지  6~10: EARLY_ORBIT → D=0 선형 전환 (갑작스러운 가속 방지)
 * 착지 10~  : D 함수(smoothstep) 기반 D0→D1 lerp
 */
export function getDifficultyParams(landings: number): DifficultyParams {
  const D    = calcDifficulty(landings);
  const ef   = earlyFactor(landings);

  // D0→D1 기반 lerp (10회 이후 순수 D 함수 구간)
  const baseSpeedP1Min   = lerp(D0.orbitSpeedP1Min,  D1.orbitSpeedP1Min,  D);
  const baseSpeedP1Max   = lerp(D0.orbitSpeedP1Max,  D1.orbitSpeedP1Max,  D);
  const baseRadiusXMin   = lerp(D0.orbitRadiusXMin,  D1.orbitRadiusXMin,  D);
  const baseRadiusXMax   = lerp(D0.orbitRadiusXMax,  D1.orbitRadiusXMax,  D);
  const baseRadiusYMin   = lerp(D0.orbitRadiusYMin,  D1.orbitRadiusYMin,  D);
  const baseRadiusYMax   = lerp(D0.orbitRadiusYMax,  D1.orbitRadiusYMax,  D);

  return {
    oscillationSpeed:      lerp(D0.oscillationSpeed,      D1.oscillationSpeed,      D),
    // 초반 전환 구간: EARLY_ORBIT 값 → D0 값으로 부드럽게 연결
    orbitSpeedP1Min:       lerp(baseSpeedP1Min,  EARLY_ORBIT.SPEED_MIN,    ef),
    orbitSpeedP1Max:       lerp(baseSpeedP1Max,  EARLY_ORBIT.SPEED_MAX,    ef),
    orbitSpeedP2Min:       lerp(D0.orbitSpeedP2Min,  D1.orbitSpeedP2Min,  D),
    orbitSpeedP2Max:       lerp(D0.orbitSpeedP2Max,  D1.orbitSpeedP2Max,  D),
    orbitRadiusXMin:       lerp(baseRadiusXMin,  EARLY_ORBIT.RADIUS_X_MIN, ef),
    orbitRadiusXMax:       lerp(baseRadiusXMax,  EARLY_ORBIT.RADIUS_X_MAX, ef),
    orbitRadiusYMin:       lerp(baseRadiusYMin,  EARLY_ORBIT.RADIUS_Y_MIN, ef),
    orbitRadiusYMax:       lerp(baseRadiusYMax,  EARLY_ORBIT.RADIUS_Y_MAX, ef),
    cloudWidthMin:         lerp(D0.cloudWidthMin,         D1.cloudWidthMin,         D),
    cloudWidthMax:         lerp(D0.cloudWidthMax,         D1.cloudWidthMax,         D),
    landToleranceY:        lerp(D0.landToleranceY,        D1.landToleranceY,        D),
    landToleranceX:        6,
    birdSpawnIntervalMin:  lerp(D0.birdSpawnIntervalMin,  D1.birdSpawnIntervalMin,  D),
    birdSpawnIntervalMax:  lerp(D0.birdSpawnIntervalMax,  D1.birdSpawnIntervalMax,  D),
    stormSpawnIntervalMin: lerp(D0.stormSpawnIntervalMin, D1.stormSpawnIntervalMin, D),
    stormSpawnIntervalMax: lerp(D0.stormSpawnIntervalMax, D1.stormSpawnIntervalMax, D),
  };
}
