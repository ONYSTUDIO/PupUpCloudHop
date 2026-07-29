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
  totalJumps: number;
  gamesPlayed: number;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

export type SceneKey = 'BootScene' | 'PreloadScene' | 'TitleScene' | 'GameScene' | 'ResultScene';
