import Phaser from 'phaser';
import { CloudPatternType, type CloudIslandConfig } from '@game-types/game';
import { DEPTH } from '@config/constants';

export class CloudIsland {
  private container: Phaser.GameObjects.Container;
  private _config: CloudIslandConfig;
  private _currentAngle: number;
  private _patternType: CloudPatternType;
  private orbitGraphics?: Phaser.GameObjects.Graphics;

  readonly vortexAngleOffset: number;

  x: number = 0;
  y: number = 0;

  constructor(scene: Phaser.Scene, config: CloudIslandConfig) {
    this._config = config;
    this._patternType = config.patternType ?? CloudPatternType.PATTERN_1;
    this.vortexAngleOffset = config.vortexAngleOffset ?? 0;
    this._currentAngle = config.startAngle;

    if (this._patternType === CloudPatternType.PATTERN_2) {
      this.x = config.centerX;
      this.y = config.centerY;
    } else {
      const pos = this.calcPosition(this._currentAngle);
      this.x = pos.x;
      this.y = pos.y;

      // 테스트용 궤도 표시선 (PATTERN_1 개별 궤도)
      const og = scene.add.graphics();
      og.setDepth(DEPTH.DECOR_CLOUD);
      og.lineStyle(3.0, 0x88aaff, 0.45);
      og.strokeEllipse(
        config.centerX,
        config.centerY,
        config.orbitRadiusX * 2,
        config.orbitRadiusY * 2,
      );
      this.orbitGraphics = og;
    }

    const g = scene.add.graphics();
    this.drawCloud(g, config.width, config.height);

    this.container = scene.add.container(this.x, this.y, [g]);
    this.container.setDepth(DEPTH.CLOUD_ISLAND);
  }

  update(delta: number): void {
    if (this._patternType === CloudPatternType.PATTERN_2) return;

    this._currentAngle +=
      this._config.orbitSpeed * this._config.rotationDirection * (delta / 1000);
    const pos = this.calcPosition(this._currentAngle);
    this.x = pos.x;
    this.y = pos.y;
    this.container.setPosition(this.x, this.y);
  }

  setWorldXY(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.container.setPosition(x, y);
  }

  get id(): string { return this._config.id; }
  get halfW(): number { return this._config.width / 2; }
  get halfH(): number { return this._config.height / 2; }
  get topY(): number { return this.y - this.halfH; }
  get leftX(): number { return this.x - this.halfW; }
  get rightX(): number { return this.x + this.halfW; }
  get orbitCenterY(): number { return this._config.centerY; }

  destroy(): void {
    this.orbitGraphics?.destroy();
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

    g.fillStyle(0xffffff, 0.96);
    g.fillEllipse(0, 0, w, h);

    g.fillStyle(0xf0f8ff, 1);
    g.fillEllipse(-hw * 0.28, -hh * 0.25, w * 0.42, h * 0.68);
    g.fillEllipse(hw * 0.12, -hh * 0.38, w * 0.38, h * 0.58);

    g.fillStyle(0xc5dff5, 0.65);
    g.fillEllipse(0, hh * 0.28, w * 0.82, h * 0.32);

    g.lineStyle(3, 0x88dd88, 0.4);
    g.strokeEllipse(0, 0, w - 6, h - 6);
  }
}
