export const ObstacleType = {
  BIRD_FLOCK: 'BIRD_FLOCK',
  LIGHTNING_STORM: 'LIGHTNING_STORM',
} as const;
export type ObstacleType = (typeof ObstacleType)[keyof typeof ObstacleType];

export const JumpPatternType = {
  PATTERN_1: 'PATTERN_1', // auto-aim 직선
  PATTERN_2: 'PATTERN_2', // 드래그 휠 방향
  PATTERN_3: 'PATTERN_3', // 진자 휠 + 버튼 타이밍
} as const;
export type JumpPatternType = (typeof JumpPatternType)[keyof typeof JumpPatternType];

export const CloudPatternType = {
  PATTERN_1: 'PATTERN_1',
  PATTERN_2: 'PATTERN_2',
} as const;
export type CloudPatternType = (typeof CloudPatternType)[keyof typeof CloudPatternType];

export interface CloudIslandConfig {
  id: string;
  centerX: number;
  centerY: number;
  orbitRadiusX: number;
  orbitRadiusY: number;
  orbitSpeed: number;
  startAngle: number;
  rotationDirection: 1 | -1;
  width: number;
  height: number;
  patternType?: CloudPatternType;
  vortexAngleOffset?: number;
}

export interface ScoreData {
  current: number;
  best: number;
  jumps: number;
}

export interface SaveData {
  bestScore: number;
  bestLandings: number;           // 단일 판 최고 착지 수
  totalJumps: number;
  gamesPlayed: number;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  coins: number;
  diamonds: number;
  ownedSkins: string[];
  equippedSkin: string;
  lastRouletteDate: string;       // 'YYYY-MM-DD' — 마지막 무료 스핀 날짜
  roulettePaidSpinsToday: number; // 오늘 유료 스핀 횟수 (날짜 바뀌면 0 리셋)
  shieldItems: number;            // 룰렛 등으로 획득한 방어막 아이템 수량
  magnetItems: number;            // 룰렛 등으로 획득한 자석 아이템 수량
  claimedMissions: string[];      // 수령 완료한 미션 ID 목록
}

export type SceneKey = 'BootScene' | 'PreloadScene' | 'TitleScene' | 'GameScene' | 'ResultScene' | 'ShopScene' | 'RouletteScene';
