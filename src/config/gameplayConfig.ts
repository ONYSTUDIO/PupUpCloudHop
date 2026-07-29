export const GAMEPLAY = {
  // 중력 / 낙하
  GRAVITY: 2600,
  MAX_FALL_SPEED: 1800,

  // 착지 허용 범위 (픽셀)
  LAND_TOLERANCE_Y: 28,

  // 점프 직후 출발 구름 무시 시간 (ms)
  JUMP_GRACE_MS: 280,

  // ── 충전 점프 (hold to charge, release to jump) ──────────
  // 이 시간(ms) 미만은 최소 점프로 처리
  JUMP_CHARGE_MIN_MS: 60,
  // 이 시간(ms) 이상은 모두 최대 파워로 처리
  JUMP_CHARGE_MAX_MS: 680,

  // ── 패턴 1 포물선 전용 ─────────────────────────────────
  // VY: 충전량에 비례해 선형 증가 (높이 결정)
  //   JUMP_MIN_VY_MAG²/(2×2600) ≈  60px (약 0.2층)
  //   JUMP_MAX_VY_MAG²/(2×2600) ≈ 595px (약 2층, 상한선)
  JUMP_MIN_VY_MAG: 560,
  JUMP_MAX_VY_MAG: 1760,
  // VX: 충전량에 비례해 선형 증가 (수평 도달 거리)
  JUMP_MIN_VX: 160,
  JUMP_MAX_VX: 740,

  // 카메라
  CAMERA_FOLLOW_THRESHOLD: 0.42,
  CAMERA_LERP: 0.09,

  // 직선 이동
  JUMP_STRAIGHT_MIN_SPEED: 1400,
  JUMP_STRAIGHT_MAX_SPEED: 2600,
  JUMP_STRAIGHT_TIMEOUT_MS: 3500, // 이 시간 내 미착지 시 게임오버

  // 점수
  SCORE_PER_JUMP: 1,
} as const;

export const ANIM = {
  PLAYER_IDLE_FRAME_RATE: 8,
  PLAYER_JUMP_FRAME_RATE: 12,
  PLAYER_FALL_FRAME_RATE: 10,
  PLAYER_LAND_FRAME_RATE: 16,
} as const;
