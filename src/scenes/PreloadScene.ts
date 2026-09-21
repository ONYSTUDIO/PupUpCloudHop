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

    this.load.image('corgi_left',       'assets/images/characters/corgi_left.png');
    this.load.image('corgi_right',      'assets/images/characters/corgi_right.png');
    this.load.image('corgi_jump_left',  'assets/images/characters/corgi_jump_left.png');
    this.load.image('corgi_jump_right', 'assets/images/characters/corgi_jump_right.png');
    this.load.image('corgi_idle_1',     'assets/images/characters/corgi_idle_1.png');
    this.load.image('corgi_idle_2',     'assets/images/characters/corgi_idle_2.png');

    this.load.image('type_A',  'assets/images/platforms/type_A.png');
    this.load.image('type_B',  'assets/images/platforms/type_B.png');
    this.load.image('type_C',  'assets/images/platforms/type_C.png');
    this.load.image('type_D',  'assets/images/platforms/type_D.png');
    this.load.image('ballon',  'assets/images/platforms/ballon.png');
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
