import Phaser from 'phaser';
import { DEPTH, ITEM_CONFIG } from '@config/constants';
import { BASE_WIDTH, BASE_HEIGHT } from '@config/baseDimensions';
import type { CloudIsland } from '@entities/CloudIsland';

interface Snowflake {
  x: number;
  y: number;
  vy: number;
  vx: number;
  size: number;
  alpha: number;
  rotation: number;
  rotSpeed: number;
}

export class CloudFreezeSystem {
  private scene: Phaser.Scene;

  // 월드 좌표 — 구름 얼음 오버레이
  private iceOverlayGraphics: Phaser.GameObjects.Graphics | null = null;
  // 화면 고정 — 테두리 프로스트 + 파란 틴트
  private frostGraphics: Phaser.GameObjects.Graphics | null = null;
  // 화면 고정 — 눈송이 파티클
  private snowGraphics: Phaser.GameObjects.Graphics | null = null;

  private _isActive: boolean = false;
  private _timer: number = 0;
  private time: number = 0;

  private snowflakes: Snowflake[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  get isActive(): boolean { return this._isActive; }
  get timer(): number { return this._timer; }

  activate(clouds: CloudIsland[]): void {
    if (this._isActive) {
      this._timer = ITEM_CONFIG.ICE_FREEZE_DURATION_SEC;
      return;
    }
    this._isActive = true;
    this._timer = ITEM_CONFIG.ICE_FREEZE_DURATION_SEC;
    this.time = 0;

    for (const cloud of clouds) {
      if (!cloud.isFalling) cloud.freeze();
    }

    this.iceOverlayGraphics = this.scene.add.graphics().setDepth(DEPTH.CLOUD_ISLAND + 1);
    this.frostGraphics = this.scene.add.graphics()
      .setDepth(DEPTH.EFFECT)
      .setScrollFactor(0);
    this.snowGraphics = this.scene.add.graphics()
      .setDepth(DEPTH.EFFECT + 1)
      .setScrollFactor(0);

    this.initSnowflakes();
  }

  /** 동결 중 새로 스폰된 구름도 즉시 동결 */
  onCloudSpawned(cloud: CloudIsland): void {
    if (this._isActive && !cloud.isFalling) cloud.freeze();
  }

  /** 매 프레임: 타이머 + 비주얼 갱신 */
  update(delta: number, clouds: CloudIsland[]): void {
    if (!this._isActive) return;

    this._timer -= delta / 1000;
    this.time += delta / 1000;

    if (this._timer <= 0) {
      this._timer = 0;
      this.deactivate(clouds);
      return;
    }

    const ratio = this._timer / ITEM_CONFIG.ICE_FREEZE_DURATION_SEC;

    this.drawIceOverlays(clouds);
    this.drawFrost(ratio);
    this.updateSnowflakes(delta / 1000);
    this.drawSnowflakes(ratio);
  }

  deactivate(clouds: CloudIsland[]): void {
    this._isActive = false;
    this._timer = 0;

    for (const cloud of clouds) cloud.unfreeze();

    this.iceOverlayGraphics?.destroy();
    this.iceOverlayGraphics = null;
    this.frostGraphics?.destroy();
    this.frostGraphics = null;
    this.snowGraphics?.destroy();
    this.snowGraphics = null;
    this.snowflakes = [];
  }

  clearAll(clouds: CloudIsland[]): void {
    if (this._isActive) this.deactivate(clouds);
  }

  // ─── 눈송이 파티클 ──────────────────────────────────────────

  private initSnowflakes(): void {
    this.snowflakes = [];
    for (let i = 0; i < 45; i++) {
      this.snowflakes.push({
        x: Math.random() * BASE_WIDTH,
        y: Math.random() * BASE_HEIGHT,
        vy: 70 + Math.random() * 130,
        vx: (Math.random() - 0.5) * 50,
        size: 3 + Math.random() * 7,
        alpha: 0.35 + Math.random() * 0.5,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 2.5,
      });
    }
  }

  private updateSnowflakes(dt: number): void {
    for (const sf of this.snowflakes) {
      sf.y += sf.vy * dt;
      sf.x += sf.vx * dt;
      sf.rotation += sf.rotSpeed * dt;

      if (sf.y > BASE_HEIGHT + 20) {
        sf.y = -20;
        sf.x = Math.random() * BASE_WIDTH;
      }
      if (sf.x < -20)            sf.x = BASE_WIDTH + 20;
      if (sf.x > BASE_WIDTH + 20) sf.x = -20;
    }
  }

  private drawSnowflakes(_ratio: number): void {
    const g = this.snowGraphics!;
    g.clear();

    // 처음 0.5초 동안 페이드인
    const fadeIn = Math.min(this.time / 0.5, 1);

    for (const sf of this.snowflakes) {
      const alpha = sf.alpha * fadeIn;
      if (alpha <= 0.01) continue;

      // 눈송이: 6가지 방사형
      for (let i = 0; i < 6; i++) {
        const a = sf.rotation + (i / 6) * Math.PI * 2;
        g.lineStyle(1.5, 0xffffff, alpha);
        g.beginPath();
        g.moveTo(sf.x, sf.y);
        g.lineTo(sf.x + Math.cos(a) * sf.size, sf.y + Math.sin(a) * sf.size);
        g.strokePath();

        // 짧은 크로스 분기
        const midX = sf.x + Math.cos(a) * sf.size * 0.55;
        const midY = sf.y + Math.sin(a) * sf.size * 0.55;
        const ca = a + Math.PI / 2;
        const cl = sf.size * 0.28;
        g.lineStyle(1, 0xddeeff, alpha * 0.7);
        g.beginPath();
        g.moveTo(midX - Math.cos(ca) * cl, midY - Math.sin(ca) * cl);
        g.lineTo(midX + Math.cos(ca) * cl, midY + Math.sin(ca) * cl);
        g.strokePath();
      }

      g.fillStyle(0xffffff, alpha * 0.85);
      g.fillCircle(sf.x, sf.y, sf.size * 0.22);
    }
  }

  // ─── 화면 프로스트 효과 ───────────────────────────────────────

  private drawFrost(ratio: number): void {
    const g = this.frostGraphics!;
    g.clear();

    const fadeIn = Math.min(this.time / 0.6, 1);
    const alpha   = fadeIn * Math.min(ratio * 1.5, 0.8);
    if (alpha <= 0.01) return;

    // 파란 틴트
    g.fillStyle(0x88bbff, alpha * 0.07);
    g.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

    // 테두리 얼음 결정
    const depth = 90 + ratio * 30;
    this.drawIceEdge(g, 'top',    depth,        alpha * 0.55);
    this.drawIceEdge(g, 'bottom', depth * 0.60, alpha * 0.40);
    this.drawIceEdge(g, 'left',   depth * 0.70, alpha * 0.45);
    this.drawIceEdge(g, 'right',  depth * 0.70, alpha * 0.45);
  }

  private drawIceEdge(
    g: Phaser.GameObjects.Graphics,
    side: 'top' | 'bottom' | 'left' | 'right',
    depth: number,
    alpha: number,
  ): void {
    const isHorizontal = side === 'top' || side === 'bottom';
    const segments = isHorizontal ? 20 : 14;
    const totalLen  = isHorizontal ? BASE_WIDTH : BASE_HEIGHT;
    const segW      = totalLen / segments;

    for (let i = 0; i < segments; i++) {
      // sin 기반 결정 높이 (프레임마다 조금씩 흔들림)
      const h = depth * (0.45 + 0.35 * Math.abs(Math.sin(i * 1.91 + this.time * 0.4)));
      const localAlpha = alpha * (0.55 + 0.38 * Math.abs(Math.sin(i * 2.73)));
      const base = i * segW;

      g.fillStyle(0xbbddf8, localAlpha);

      switch (side) {
        case 'top':
          g.fillTriangle(base, 0, base + segW * 0.5, h, base + segW, 0);
          break;
        case 'bottom':
          g.fillTriangle(base, BASE_HEIGHT, base + segW * 0.5, BASE_HEIGHT - h, base + segW, BASE_HEIGHT);
          break;
        case 'left':
          g.fillTriangle(0, base, h, base + segW * 0.5, 0, base + segW);
          break;
        case 'right':
          g.fillTriangle(BASE_WIDTH, base, BASE_WIDTH - h, base + segW * 0.5, BASE_WIDTH, base + segW);
          break;
      }

      // 결정 안쪽 하이라이트
      g.fillStyle(0xeef6ff, localAlpha * 0.55);
      switch (side) {
        case 'top':
          g.fillTriangle(base + segW * 0.2, 0, base + segW * 0.5, h * 0.65, base + segW * 0.8, 0);
          break;
        case 'bottom':
          g.fillTriangle(base + segW * 0.2, BASE_HEIGHT, base + segW * 0.5, BASE_HEIGHT - h * 0.65, base + segW * 0.8, BASE_HEIGHT);
          break;
        case 'left':
          g.fillTriangle(0, base + segW * 0.2, h * 0.65, base + segW * 0.5, 0, base + segW * 0.8);
          break;
        case 'right':
          g.fillTriangle(BASE_WIDTH, base + segW * 0.2, BASE_WIDTH - h * 0.65, base + segW * 0.5, BASE_WIDTH, base + segW * 0.8);
          break;
      }
    }
  }

  // ─── 구름 얼음 오버레이 ───────────────────────────────────────

  private drawIceOverlays(clouds: CloudIsland[]): void {
    const g = this.iceOverlayGraphics!;
    g.clear();

    const pulse  = Math.sin(this.time * Math.PI * 2.2) * 0.07;
    const fadeIn = Math.min(this.time / 0.4, 1);

    for (const cloud of clouds) {
      if (!cloud.isFrozen || cloud.isFalling) continue;

      const cx = cloud.x;
      const cy = cloud.y;
      const w  = cloud.cloudBodyHalfW * 2;
      const h  = cloud.halfH * 2;

      // 구름 본체 얼음 오버레이
      g.fillStyle(0x99ccff, fadeIn * (0.30 + pulse));
      g.fillEllipse(cx, cy, w * 1.06, h * 0.92);

      // 테두리
      g.lineStyle(2.5, 0xddeeff, fadeIn * (0.65 + pulse));
      g.strokeEllipse(cx, cy, w * 1.06, h * 0.92);

      // 상단 얼음 스파이크
      const numSpikes = 6;
      const topY = cloud.cloudBodyTopY;
      for (let i = 0; i < numSpikes; i++) {
        const t = i / (numSpikes - 1);
        const sx = cx + (t - 0.5) * w * 0.72;
        const spikeH = (10 + 7 * Math.abs(Math.sin(i * 1.4 + this.time * 1.8))) * fadeIn;

        g.fillStyle(0xddeeff, fadeIn * 0.85);
        g.fillTriangle(sx - 4, topY, sx, topY - spikeH, sx + 4, topY);

        g.fillStyle(0xffffff, fadeIn * 0.45);
        g.fillTriangle(sx - 1.5, topY, sx, topY - spikeH * 0.7, sx + 1.5, topY);
      }

      // 반짝이 포인트
      for (let j = 0; j < 4; j++) {
        const a = (j / 4) * Math.PI * 2 + this.time * 0.9;
        const sx = cx + Math.cos(a) * w * 0.28;
        const sy = cy + Math.sin(a) * h * 0.20;
        const sparkAlpha = ((Math.sin(this.time * 5 + j * 1.7) + 1) * 0.5) * fadeIn * 0.55;

        g.fillStyle(0xffffff, sparkAlpha);
        g.fillCircle(sx, sy, 4.5);
        g.fillStyle(0xaaddff, sparkAlpha * 0.7);
        g.fillCircle(sx, sy, 2.5);
      }
    }
  }
}
