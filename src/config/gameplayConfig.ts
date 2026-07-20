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

  // 수직 속도 크기 (높이 결정)
  JUMP_MIN_VY_MAG: 560,  // 짧은 탭 — 낮게 오름
  JUMP_MAX_VY_MAG: 1350, // 최대치 — 이 이상 높이 상한
  // 이 t(0~1) 지점에서 VY가 최대치에 도달 → 이후엔 VX만 계속 증가
  JUMP_VY_RAMP_END: 0.45,

  // 수평 최대속도 (넓이 결정)
  JUMP_MIN_VX: 160,  // 짧은 탭 최대 수평속도
  JUMP_MAX_VX: 740,  // 길게 누를수록 최대 수평속도 증가

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
