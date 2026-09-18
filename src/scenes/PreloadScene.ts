import Phaser from 'phaser';
import { SCENE_KEYS } from '@config/constants';
import { BASE_WIDTH, BASE_HEIGHT } from '@config/gameConfig';
import { authService } from '../services/AuthService';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.PRELOAD });
  }

  preload(): void {
    this.showLoadingBar();
    this.load.image('bg_1', 'assets/images/backgrounds/bg_1.png');
    this.load.image('bg_2', 'assets/images/backgrounds/bg_2.png');
    this.load.image('bg_ig_sky',   'assets/images/backgrounds/bg_ig_sky.png');
    this.load.image('bg_ig_cloud', 'assets/images/backgrounds/bg_ig_cloud.png');
    this.load.image('bg_ig_town',  'assets/images/backgrounds/bg_ig_town.png');
  }

  async create(): Promise<void> {
    const user = await authService.getUser();
    if (user) {
      this.scene.start(SCENE_KEYS.MAIN);
    } else {
      this.scene.start(SCENE_KEYS.TITLE);
    }
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
