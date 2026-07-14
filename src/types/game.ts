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
