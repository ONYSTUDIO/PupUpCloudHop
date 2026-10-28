import Phaser from 'phaser';
import { DEPTH, ITEM_CONFIG } from '@config/constants';
import { BASE_WIDTH, BASE_HEIGHT } from '@config/baseDimensions';

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  phase: number;
}

export class TimeBoostSystem {
  private scene: Phaser.Scene;

  private overlayGraphics: Phaser.GameObjects.Graphics | null = null;
  private sparksGraphics: Phaser.GameObjects.Graphics | null = null;

  private _isActive: boolean = false;
  private _timer: number = 0;
  private time: number = 0;

  private sparks: Spark[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  get isActive(): boolean { return this._isActive; }
  get timer(): number { return this._timer; }

  activate(): void {
    if (this._isActive) {
      this._timer = ITEM_CONFIG.TIME_BOOST_DURATION_SEC;
      return;
    }
    this._isActive = true;
    this._timer = ITEM_CONFIG.TIME_BOOST_DURATION_SEC;
    this.time = 0;

    this.overlayGraphics = this.scene.add.graphics()
      .setDepth(DEPTH.EFFECT)
      .setScrollFactor(0);
    this.sparksGraphics = this.scene.add.graphics()
      .setDepth(DEPTH.EFFECT + 1)
      .setScrollFactor(0);

    this.initSparks();
  }

  /** 매 프레임 — 실제 delta(부스트 미적용)로 타이머 카운트다운 */
  update(delta: number): void {
    if (!this._isActive) return;

    this._timer -= delta / 1000;
    this.time += delta / 1000;

    if (this._timer <= 0) {
      this._timer = 0;
      this.deactivate();
      return;
    }

    const ratio = this._timer / ITEM_CONFIG.TIME_BOOST_DURATION_SEC;
    this.drawOverlay(ratio);
    this.updateSparks(delta / 1000);
    this.drawSparks(ratio);
  }

  deactivate(): void {
    this._isActive = false;
    this._timer = 0;
    this.overlayGraphics?.destroy();
    this.overlayGraphics = null;
    this.sparksGraphics?.destroy();
    this.sparksGraphics = null;
    this.sparks = [];
  }

  clearAll(): void {
    if (this._isActive) this.deactivate();
  }

  // ─── 스파크 파티클 ──────────────────────────────────────────

  private initSparks(): void {
    this.sparks = [];
    for (let i = 0; i < 32; i++) {
      this.sparks.push({
        x: Math.random() * BASE_WIDTH,
        y: Math.random() * BASE_HEIGHT,
        vx: (Math.random() - 0.5) * 80,
        vy: -40 - Math.random() * 80,
        size: 2 + Math.random() * 5,
        alpha: 0.4 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  private updateSparks(dt: number): void {
    for (const s of this.sparks) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.phase += dt * 3.5;

      if (s.y < -20) {
        s.y = BASE_HEIGHT + 20;
        s.x = Math.random() * BASE_WIDTH;
      }
      if (s.x < -20)             s.x = BASE_WIDTH + 20;
      if (s.x > BASE_WIDTH + 20) s.x = -20;
    }
  }

  private drawSparks(ratio: number): void {
    const g = this.sparksGraphics!;
    g.clear();

    const fadeIn = Math.min(this.time / 0.4, 1);

    for (const s of this.sparks) {
      const pulse = (Math.sin(s.phase) + 1) * 0.5;
      const alpha = s.alpha * fadeIn * (0.5 + pulse * 0.5) * Math.min(ratio * 2, 1);
      if (alpha <= 0.01) continue;

      // 작은 별 형태 (사선 십자)
      const r = s.size;
      g.lineStyle(1.5, 0xffcc44, alpha);
      g.beginPath();
      g.moveTo(s.x - r, s.y - r);
      g.lineTo(s.x + r, s.y + r);
      g.strokePath();
      g.beginPath();
      g.moveTo(s.x + r, s.y - r);
      g.lineTo(s.x - r, s.y + r);
      g.strokePath();

      g.fillStyle(0xffffff, alpha * 0.85);
      g.fillCircle(s.x, s.y, r * 0.3);
    }
  }

  // ─── 화면 오버레이 (주황-노랑 비네트) ──────────────────────

  private drawOverlay(ratio: number): void {
    const g = this.overlayGraphics!;
    g.clear();

    const fadeIn = Math.min(this.time / 0.5, 1);
    const alpha  = fadeIn * Math.min(ratio * 1.6, 0.85);
    if (alpha <= 0.01) return;

    // 주황 틴트
    g.fillStyle(0xff8800, alpha * 0.07);
    g.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

    // 가장자리 비네트
    const edgeDepth = 70 + ratio * 35;
    this.drawVignetteEdge(g, 'top',    edgeDepth,        alpha * 0.5);
    this.drawVignetteEdge(g, 'bottom', edgeDepth * 0.65, alpha * 0.38);
    this.drawVignetteEdge(g, 'left',   edgeDepth * 0.75, alpha * 0.42);
    this.drawVignetteEdge(g, 'right',  edgeDepth * 0.75, alpha * 0.42);
  }

  private drawVignetteEdge(
    g: Phaser.GameObjects.Graphics,
    side: 'top' | 'bottom' | 'left' | 'right',
    depth: number,
    alpha: number,
  ): void {
    const isHorizontal = side === 'top' || side === 'bottom';
    const segments = isHorizontal ? 16 : 12;
    const totalLen  = isHorizontal ? BASE_WIDTH : BASE_HEIGHT;
    const segW      = totalLen / segments;

    for (let i = 0; i < segments; i++) {
      const h = depth * (0.5 + 0.38 * Math.abs(Math.sin(i * 2.17 + this.time * 1.2)));
      const localAlpha = alpha * (0.6 + 0.3 * Math.abs(Math.sin(i * 3.1)));
      const base = i * segW;

      g.fillStyle(0xff9900, localAlpha);

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

      g.fillStyle(0xffee88, localAlpha * 0.4);
      switch (side) {
        case 'top':
          g.fillTriangle(base + segW * 0.22, 0, base + segW * 0.5, h * 0.6, base + segW * 0.78, 0);
          break;
        case 'bottom':
          g.fillTriangle(base + segW * 0.22, BASE_HEIGHT, base + segW * 0.5, BASE_HEIGHT - h * 0.6, base + segW * 0.78, BASE_HEIGHT);
          break;
        case 'left':
          g.fillTriangle(0, base + segW * 0.22, h * 0.6, base + segW * 0.5, 0, base + segW * 0.78);
          break;
        case 'right':
          g.fillTriangle(BASE_WIDTH, base + segW * 0.22, BASE_WIDTH - h * 0.6, base + segW * 0.5, BASE_WIDTH, base + segW * 0.78);
          break;
      }
    }
  }
}
