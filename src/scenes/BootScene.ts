import Phaser from 'phaser';
import { SCENE_KEYS } from '@config/constants';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.BOOT });
  }

  create(): void {
    // 기기 픽셀 밀도에 따라 캔버스 해상도 제한
    const dpr = Math.min(window.devicePixelRatio ?? 1, 2);
    this.scale.setParentSize(
      this.scale.parentSize.width,
      this.scale.parentSize.height,
    );
    void dpr;

    this.scene.start(SCENE_KEYS.PRELOAD);
  }
}
