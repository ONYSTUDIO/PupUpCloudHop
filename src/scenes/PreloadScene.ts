import Phaser from 'phaser';
import { SCENE_KEYS } from '@config/constants';
import { BASE_WIDTH, BASE_HEIGHT } from '@config/gameConfig';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.PRELOAD });
  }

  preload(): void {
    // 실제 에셋이 없으므로 로딩 바만 표시 후 바로 이동
    // 에셋 추가 시 이 블록에 load.image / load.audio 등을 추가
    this.showLoadingBar();
  }

  create(): void {
    this.scene.start(SCENE_KEYS.TITLE);
  }

  private showLoadingBar(): void {
    const cx = BASE_WIDTH / 2;
    const cy = BASE_HEIGHT / 2;

    this.add.rectangle(cx, cy, 640, 48, 0x334455).setOrigin(0.5);
    const bar = this.add.rectangle(cx - 320, cy, 0, 48, 0x66aaff).setOrigin(0, 0.5);

    this.add
      .text(cx, cy - 70, 'Loading...', { fontSize: '52px', color: '#ffffff' })
      .setOrigin(0.5);

    this.load.on(Phaser.Loader.Events.PROGRESS, (v: number) => {
      bar.width = 640 * v;
    });
  }
}
