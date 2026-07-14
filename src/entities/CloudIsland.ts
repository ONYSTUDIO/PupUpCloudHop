import Phaser from 'phaser';
import type { CloudIslandConfig } from '@game-types/game';
import { DEPTH } from '@config/constants';

export class CloudIsland {
  private container: Phaser.GameObjects.Container;
  private _config: CloudIslandConfig;
  private _currentAngle: number;

  x: number = 0;
  y: number = 0;

  constructor(scene: Phaser.Scene, config: CloudIslandConfig) {
    this._config = config;
    this._currentAngle = config.startAngle;

    const pos = this.calcPosition(this._currentAngle);
    this.x = pos.x;
    this.y = pos.y;

    const g = scene.add.graphics();
    this.drawCloud(g, config.width, config.height);

    this.container = scene.add.container(this.x, this.y, [g]);
    this.container.setDepth(DEPTH.CLOUD_ISLAND);
  }

  update(delta: number): void {
    this._currentAngle +=
      this._config.orbitSpeed * this._config.rotationDirection * (delta / 1000);
    const pos = this.calcPosition(this._currentAngle);
    this.x = pos.x;
    this.y = pos.y;
    this.container.setPosition(this.x, this.y);
  }

  get id(): string { return this._config.id; }
  get halfW(): number { return this._config.width / 2; }
  get halfH(): number { return this._config.height / 2; }
  get topY(): number { return this.y - this.halfH; }
  get leftX(): number { return this.x - this.halfW; }
  get rightX(): number { return this.x + this.halfW; }

  destroy(): void {
    this.container.destroy();
  }

  private calcPosition(angle: number): { x: number; y: number } {
    return {
      x: this._config.centerX + Math.cos(angle) * this._config.orbitRadiusX,
      y: this._config.centerY + Math.sin(angle) * this._config.orbitRadiusY,
    };
  }

  private drawCloud(g: Phaser.GameObjects.Graphics, w: number, h: number): void {
    const hw = w / 2;
    const hh = h / 2;

    // 메인 구름 몸체
    g.fillStyle(0xffffff, 0.96);
    g.fillEllipse(0, 0, w, h);

    // 윗면 볼록한 구름 모양
    g.fillStyle(0xf0f8ff, 1);
    g.fillEllipse(-hw * 0.28, -hh * 0.25, w * 0.42, h * 0.68);
    g.fillEllipse(hw * 0.12, -hh * 0.38, w * 0.38, h * 0.58);

    // 아랫면 그림자
    g.fillStyle(0xc5dff5, 0.65);
    g.fillEllipse(0, hh * 0.28, w * 0.82, h * 0.32);

    // 착지 가능 표시 (미묘한 초록 하이라이트)
    g.lineStyle(3, 0x88dd88, 0.4);
    g.strokeEllipse(0, 0, w - 6, h - 6);
  }
}
