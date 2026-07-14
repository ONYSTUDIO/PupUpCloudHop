import Phaser from 'phaser';
import { DEPTH } from '@config/constants';

export class Player {
  x: number;
  y: number;
  vx: number = 0;
  vy: number = 0;
  isOnGround: boolean = false;
  isDead: boolean = false;

  // 플레이어 충돌 박스 반지름
  readonly HALF_W = 22;
  readonly HALF_H = 28;

  private graphics: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.x = x;
    this.y = y;
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(DEPTH.PLAYER);
    this.redraw();
    this.sync();
  }

  sync(): void {
    this.graphics.setPosition(this.x, this.y);
  }

  get bottom(): number { return this.y + this.HALF_H; }
  get top(): number    { return this.y - this.HALF_H; }
  get left(): number   { return this.x - this.HALF_W; }
  get right(): number  { return this.x + this.HALF_W; }

  destroy(): void {
    this.graphics.destroy();
  }

  private redraw(): void {
    const g = this.graphics;
    g.clear();

    // 몸통 (샌드 브라운)
    g.fillStyle(0xe8a87c, 1);
    g.fillEllipse(0, 10, 42, 34);

    // 머리
    g.fillStyle(0xf0b88a, 1);
    g.fillEllipse(2, -14, 38, 34);

    // 귀 (진한 갈색)
    g.fillStyle(0xb06a2a, 1);
    g.fillEllipse(-14, -28, 14, 22);
    g.fillEllipse(18, -28, 13, 20);

    // 귀 안쪽 (연한 핑크)
    g.fillStyle(0xffccaa, 1);
    g.fillEllipse(-14, -27, 8, 13);
    g.fillEllipse(18, -27, 7, 11);

    // 눈 흰자
    g.fillStyle(0xffffff, 1);
    g.fillCircle(-8, -17, 6);
    g.fillCircle(10, -17, 6);

    // 눈 동자
    g.fillStyle(0x222222, 1);
    g.fillCircle(-7, -16, 3);
    g.fillCircle(11, -16, 3);

    // 눈 반짝이
    g.fillStyle(0xffffff, 1);
    g.fillCircle(-6, -17, 1);
    g.fillCircle(12, -17, 1);

    // 코
    g.fillStyle(0x553311, 1);
    g.fillEllipse(2, -7, 10, 7);

    // 입
    g.lineStyle(2, 0x553311, 1);
    g.beginPath();
    g.moveTo(-3, -3);
    g.lineTo(2, -1);
    g.lineTo(7, -3);
    g.strokePath();

    // 꼬리
    g.fillStyle(0xe8a87c, 1);
    g.fillEllipse(21, 4, 18, 11);
    g.fillEllipse(28, -2, 12, 9);

    // 다리 (앉은 자세)
    g.fillStyle(0xe8a87c, 1);
    g.fillEllipse(-10, 23, 14, 12);
    g.fillEllipse(10, 23, 14, 12);
  }
}
