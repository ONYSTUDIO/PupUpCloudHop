import Phaser from 'phaser';
import { ObstacleType } from '@game-types/game';
import { DEPTH, OBSTACLE_CONFIG } from '@config/constants';

// 메인 클러스터 기준 오프셋: [dx, dy, size, phaseOffset]
const FLOCK_LAYERS: ReadonlyArray<[number, number, number, number]> = [
  [   0,   0, 280, 0.00],  // 중앙 주무리
  [ 115, -58, 250, 0.04],  // 앞쪽 오른쪽 위
  [-130,  60, 240, 0.08],  // 뒤쪽 왼쪽 아래
  [-180, -95, 230, 0.06],  // 왼쪽 위 (대각선 보완)
];

export class BirdFlock {
  readonly obstacleType = ObstacleType.BIRD_FLOCK;

  private images: Phaser.GameObjects.Image[];
  private _x: number;
  private _y: number;
  private readonly speed: number;
  private _time: number;

  readonly halfW = OBSTACLE_CONFIG.BIRD_FLOCK_HALF_W;
  readonly halfH = OBSTACLE_CONFIG.BIRD_FLOCK_HALF_H;

  constructor(scene: Phaser.Scene, x: number, y: number, speed: number) {
    this._x = x;
    this._y = y;
    this.speed = speed;
    this._time = Phaser.Math.FloatBetween(0, OBSTACLE_CONFIG.BIRD_FLOCK_FRAME_INTERVAL * 2);

    this.images = FLOCK_LAYERS.map(([dx, dy, size]) =>
      scene.add.image(x + dx, y + dy, 'bird_flock_01')
        .setDisplaySize(size, size)
        .setDepth(DEPTH.OBSTACLE),
    );
  }

  get x(): number { return this._x; }
  get y(): number { return this._y; }

  update(delta: number): void {
    this._x += this.speed * (delta / 1000);
    this._time += delta / 1000;

    const interval = OBSTACLE_CONFIG.BIRD_FLOCK_FRAME_INTERVAL;
    FLOCK_LAYERS.forEach(([dx, dy, , phase], i) => {
      this.images[i]!.setPosition(this._x + dx, this._y + dy);
      const frame = Math.floor((this._time + phase) / interval) % 2;
      this.images[i]!.setTexture(frame === 0 ? 'bird_flock_01' : 'bird_flock_02');
    });
  }

  get isOffScreen(): boolean {
    return this._x > 1080 + 200;
  }

  destroy(): void {
    this.images.forEach((img) => img.destroy());
  }
}
