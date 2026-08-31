import Phaser from 'phaser';
import { DEPTH, ITEM_CONFIG } from '@config/constants';
import { BASE_WIDTH, BASE_HEIGHT } from '@config/baseDimensions';

interface TimeDot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  phase: number;
}

export class TimeSlowSystem {
  private scene: Phaser.Scene;

  private overlayGraphics: Phaser.GameObjects.Graphics | null = null;
  private dotsGraphics: Phaser.GameObjects.Graphics | null = null;

  private _isActive: boolean = false;
  private _timer: number = 0;
  private time: number = 0;

  private dots: TimeDot[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  get isActive(): boolean { return this._isActive; }
  get timer(): number { return this._timer; }

  activate(): void {
    if (this._isActive) {
      this._timer = ITEM_CONFIG.TIME_SLOW_DURATION_SEC;
      return;
    }
    this._isActive = true;
    this._timer = ITEM_CONFIG.TIME_SLOW_DURATION_SEC;
    this.time = 0;

    this.overlayGraphics = this.scene.add.graphics()
      .setDepth(DEPTH.EFFECT)
      .setScrollFactor(0);
    this.dotsGraphics = this.scene.add.graphics()
      .setDepth(DEPTH.EFFECT + 1)
      .setScrollFactor(0);

    this.initDots();
  }

  /** 매 프레임 — 실제 delta(슬로우 미적용)로 타이머 카운트다운 */
  update(delta: number): void {
    if (!this._isActive) return;

    this._timer -= delta / 1000;
    this.time += delta / 1000;

    if (this._timer <= 0) {
      this._timer = 0;
      this.deactivate();
      return;
    }

    const ratio = this._timer / ITEM_CONFIG.TIME_SLOW_DURATION_SEC;
    this.drawOverlay(ratio);
    this.updateDots(delta / 1000);
    this.drawDots(ratio);
  }

  deactivate(): void {
    this._isActive = false;
    this._timer = 0;
    this.overlayGraphics?.destroy();
    this.overlayGraphics = null;
    this.dotsGraphics?.destroy();
    this.dotsGraphics = null;
    this.dots = [];
  }

  clearAll(): void {
    if (this._isActive) this.deactivate();
  }

  // ─── 부유 도트 파티클 ───────────────────────────────────────

  private initDots(): void {
    this.dots = [];
    for (let i = 0; i < 28; i++) {
      this.dots.push({
        x: Math.random() * BASE_WIDTH,
        y: Math.random() * BASE_HEIGHT,
        vx: (Math.random() - 0.5) * 30,
        vy: -20 - Math.random() * 40, // 위로 서서히 부유
        size: 2.5 + Math.random() * 5,
        alpha: 0.3 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  private updateDots(dt: number): void {
    for (const d of this.dots) {
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.phase += dt * 1.8;

      if (d.y < -20) {
        d.y = BASE_HEIGHT + 20;
        d.x = Math.random() * BASE_WIDTH;
      }
      if (d.x < -20)              d.x = BASE_WIDTH + 20;
      if (d.x > BASE_WIDTH + 20)  d.x = -20;
    }
  }

  private drawDots(ratio: number): void {
    const g = this.dotsGraphics!;
    g.clear();

    const fadeIn = Math.min(this.time / 0.5, 1);

    for (const d of this.dots) {
      const pulse = (Math.sin(d.phase) + 1) * 0.5;
      const alpha = d.alpha * fadeIn * (0.55 + pulse * 0.45) * Math.min(ratio * 2, 1);
      if (alpha <= 0.01) continue;

      // 십자 (+) 형태의 작은 시계 틱 마크
      const r = d.size;
      g.lineStyle(1.5, 0xdd99ff, alpha);
      g.beginPath();
      g.moveTo(d.x - r, d.y);
      g.lineTo(d.x + r, d.y);
      g.strokePath();
      g.beginPath();
      g.moveTo(d.x, d.y - r);
      g.lineTo(d.x, d.y + r);
      g.strokePath();

      g.fillStyle(0xeeccff, alpha * 0.8);
      g.fillCircle(d.x, d.y, r * 0.35);
    }
  }

  // ─── 화면 오버레이 (보라색 비네트) ─────────────────────────

  private drawOverlay(ratio: number): void {
    const g = this.overlayGraphics!;
    g.clear();

    const fadeIn = Math.min(this.time / 0.6, 1);
    const alpha  = fadeIn * Math.min(ratio * 1.6, 0.85);
    if (alpha <= 0.01) return;

    // 보라색 틴트
    g.fillStyle(0x6633aa, alpha * 0.08);
    g.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

    // 가장자리 비네트 (상/하/좌/우)
    const edgeDepth = 80 + ratio * 40;
    this.drawVignetteEdge(g, 'top',    edgeDepth,        alpha * 0.5);
    this.drawVignetteEdge(g, 'bottom', edgeDepth * 0.65, alpha * 0.38);
    this.drawVignetteEdge(g, 'left',   edgeDepth * 0.75, alpha * 0.42);
    this.drawVignetteEdge(g, 'right',  edgeDepth * 0.75, alpha * 0.42);

    // 모서리 시계 링 (4 코너)
    this.drawCornerRings(g, alpha * 0.6);
  }

  private drawVignetteEdge(
    g: Phaser.GameObjects.Graphics,
    side: 'top' | 'bottom' | 'left' | 'right',
    depth: number,
    alpha: number,
  ): void {
    const isHorizontal = side === 'top' || side === 'bottom';
    const segments  = isHorizontal ? 16 : 12;
    const totalLen  = isHorizontal ? BASE_WIDTH : BASE_HEIGHT;
    const segW      = totalLen / segments;

    for (let i = 0; i < segments; i++) {
      // 물결 깊이 (시간에 따라 부드럽게 흔들림)
      const h = depth * (0.5 + 0.38 * Math.abs(Math.sin(i * 2.17 + this.time * 0.55)));
      const localAlpha = alpha * (0.6 + 0.3 * Math.abs(Math.sin(i * 3.1)));
      const base = i * segW;

      g.fillStyle(0x9955cc, localAlpha);

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

      // 하이라이트
      g.fillStyle(0xeeccff, localAlpha * 0.4);
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

  private drawCornerRings(g: Phaser.GameObjects.Graphics, alpha: number): void {
    // 회전하는 시계 링을 4 모서리에 그림
    const corners = [
      { cx: 0,          cy: 0          },
      { cx: BASE_WIDTH, cy: 0          },
      { cx: 0,          cy: BASE_HEIGHT },
      { cx: BASE_WIDTH, cy: BASE_HEIGHT },
    ];

    const ringR = 55;
    const spinAngle = this.time * 0.8; // 서서히 회전

    for (const { cx, cy } of corners) {
      // 외곽 링
      g.lineStyle(2.5, 0xbb77ee, alpha * 0.55);
      g.strokeCircle(cx, cy, ringR);

      // 시계 눈금 (12개)
      for (let tick = 0; tick < 12; tick++) {
        const a = (tick / 12) * Math.PI * 2 + spinAngle;
        const isMain = tick % 3 === 0;
        const inner = ringR - (isMain ? 11 : 7);
        const outer = ringR;
        const tx1 = cx + Math.cos(a) * inner;
        const ty1 = cy + Math.sin(a) * inner;
        const tx2 = cx + Math.cos(a) * outer;
        const ty2 = cy + Math.sin(a) * outer;

        g.lineStyle(isMain ? 2.5 : 1.5, 0xdd99ff, alpha * (isMain ? 0.75 : 0.45));
        g.beginPath();
        g.moveTo(tx1, ty1);
        g.lineTo(tx2, ty2);
        g.strokePath();
      }

      // 시침 (짧은 바늘 — 천천히 회전)
      const hourA = spinAngle * 0.4;
      g.lineStyle(3, 0xeeccff, alpha * 0.7);
      g.beginPath();
      g.moveTo(cx, cy);
      g.lineTo(cx + Math.cos(hourA) * ringR * 0.5, cy + Math.sin(hourA) * ringR * 0.5);
      g.strokePath();

      // 분침 (긴 바늘 — 조금 더 빠르게)
      const minA = spinAngle * 1.2;
      g.lineStyle(2, 0xffeeff, alpha * 0.65);
      g.beginPath();
      g.moveTo(cx, cy);
      g.lineTo(cx + Math.cos(minA) * ringR * 0.75, cy + Math.sin(minA) * ringR * 0.75);
      g.strokePath();

      // 중심 점
      g.fillStyle(0xffeeff, alpha * 0.9);
      g.fillCircle(cx, cy, 4);
    }
  }
}
