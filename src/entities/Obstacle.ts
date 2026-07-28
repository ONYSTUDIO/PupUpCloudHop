import Phaser from 'phaser';
import { ObstacleType } from '@game-types/game';
import { DEPTH, OBSTACLE_CONFIG } from '@config/constants';

const BIRD_OFFSETS: ReadonlyArray<{ readonly dx: number; readonly dy: number }> = [
  { dx:    0, dy: -40 },
  { dx:  -38, dy: -22 },
  { dx:   38, dy: -22 },
  { dx:  -76, dy:  -6 },
  { dx:   76, dy:  -6 },
  { dx: -110, dy:  12 },
  { dx:  110, dy:  12 },
  { dx:  -20, dy:   8 },
  { dx:   55, dy:  28 },
  { dx:  -90, dy:  35 },
];

export class BirdFlock {
  readonly obstacleType = ObstacleType.BIRD_FLOCK;

  private graphics: Phaser.GameObjects.Graphics;
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
    this._time = Phaser.Math.FloatBetween(0, Math.PI * 2);

    this.graphics = scene.add.graphics();
    this.graphics.setDepth(DEPTH.OBSTACLE);
    this.graphics.setPosition(this._x, this._y);
    this.draw();
  }

  get x(): number { return this._x; }
  get y(): number { return this._y; }

  update(delta: number): void {
    this._x += this.speed * (delta / 1000);
    this._time += delta / 1000;
    this.graphics.setPosition(this._x, this._y);
    this.draw();
  }

  get isOffScreen(): boolean {
    return this._x > 1080 + 200;
  }

  destroy(): void {
    this.graphics.destroy();
  }

  private draw(): void {
    const g = this.graphics;
    g.clear();

    g.lineStyle(4, 0x222244, 0.92);

    BIRD_OFFSETS.forEach(({ dx, dy }, i) => {
      const phase = this._time * 5.5 + i * 0.55;
      const wingDip = 4 + Math.sin(phase) * 5;
      const bw = 10;

      g.beginPath();
      g.moveTo(dx - bw, dy + wingDip);
      g.lineTo(dx,      dy);
      g.lineTo(dx + bw, dy + wingDip);
      g.strokePath();
    });
  }
}
