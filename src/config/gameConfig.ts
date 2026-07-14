import Phaser from 'phaser';
import { BootScene } from '@scenes/BootScene';
import { PreloadScene } from '@scenes/PreloadScene';
import { TitleScene } from '@scenes/TitleScene';
import { GameScene } from '@scenes/GameScene';
import { ResultScene } from '@scenes/ResultScene';

export const BASE_WIDTH = 1080;
export const BASE_HEIGHT = 1920;

export const phaserConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#87CEEB',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: BASE_WIDTH,
    height: BASE_HEIGHT,
  },
  // 수동 물리 사용 — Arcade Physics 비활성화
  scene: [BootScene, PreloadScene, TitleScene, GameScene, ResultScene],
  input: {
    activePointers: 2,
  },
  render: {
    antialias: true,
    pixelArt: false,
  },
};
