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
