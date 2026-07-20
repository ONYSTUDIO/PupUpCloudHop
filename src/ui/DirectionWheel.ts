import Phaser from 'phaser';
import { DEPTH } from '@config/constants';

export class DirectionWheel {
  private scene: Phaser.Scene;
  private trackGraphics: Phaser.GameObjects.Graphics;
  private handleGraphics: Phaser.GameObjects.Graphics;

  private readonly cx: number;
  private readonly cy: number;
  private readonly radius: number;

  private _angle: number = -Math.PI / 2; // 기본값: 정 위
  private activePointerId: number = -1;
  private dragStartTime: number = 0;
  private releaseCallbacks: ((holdDuration: number) => void)[] = [];
  private pressCallbacks: (() => void)[] = [];

  constructor(scene: Phaser.Scene, cx: number, cy: number, radius: number) {
    this.scene = scene;
    this.cx = cx;
    this.cy = cy;
    this.radius = radius;

    this.trackGraphics = scene.add.graphics()
      .setScrollFactor(0)
      .setDepth(DEPTH.HUD);

    this.handleGraphics = scene.add.graphics()
      .setScrollFactor(0)
      .setDepth(DEPTH.HUD + 1);

    this.drawTrack();
    this.drawHandle();

    scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
    scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.onMove, this);
    scene.input.on(Phaser.Input.Events.POINTER_UP, this.onUp, this);
  }

  get angle(): number { return this._angle; }
  get isDragging(): boolean { return this.activePointerId !== -1; }

  getDragDuration(): number {
    if (this.activePointerId === -1) return 0;
    return this.scene.time.now - this.dragStartTime;
  }

  onPress(cb: () => void): void {
    this.pressCallbacks.push(cb);
  }

  onRelease(cb: (holdDuration: number) => void): void {
    this.releaseCallbacks.push(cb);
  }

  resetAngle(): void {
    this._angle = -Math.PI / 2;
    this.drawHandle();
  }

  // ─── 그리기 ─────────────────────────────────────────────

  private drawTrack(): void {
    const g = this.trackGraphics;
    g.clear();

    // 배경 원반
    g.fillStyle(0x000000, 0.28);
    g.fillCircle(this.cx, this.cy, this.radius + 28);

    // 궤도 아크 (상단 180°)
    g.lineStyle(5, 0xffffff, 0.28);
    g.beginPath();
    g.arc(this.cx, this.cy, this.radius, Math.PI, 0, false);
    g.strokePath();

    // 방향 눈금: 왼쪽(180°), 왼쪽45°, 위(270°=-90°), 오른쪽45°, 오른쪽(0°)
    const ticks: number[] = [-Math.PI, -Math.PI * 0.75, -Math.PI * 0.5, -Math.PI * 0.25, 0];
    for (const a of ticks) {
      const inner = this.radius - 12;
      const outer = this.radius + 12;
      g.lineStyle(3, 0xffffff, 0.45);
      g.beginPath();
      g.moveTo(this.cx + Math.cos(a) * inner, this.cy + Math.sin(a) * inner);
      g.lineTo(this.cx + Math.cos(a) * outer, this.cy + Math.sin(a) * outer);
      g.strokePath();
    }

    // 중심 점
    g.fillStyle(0xffffff, 0.35);
    g.fillCircle(this.cx, this.cy, 7);
  }

  private drawHandle(): void {
    const g = this.handleGraphics;
    g.clear();

    const hx = this.cx + Math.cos(this._angle) * this.radius;
    const hy = this.cy + Math.sin(this._angle) * this.radius;

    // 중심 → 핸들 선
    g.lineStyle(2, 0xffffff, 0.3);
    g.beginPath();
    g.moveTo(this.cx, this.cy);
    g.lineTo(hx, hy);
    g.strokePath();

    // 핸들 원
    g.fillStyle(0x88aaff, 1);
    g.fillCircle(hx, hy, 32);
    g.lineStyle(3, 0xffffff, 0.9);
    g.strokeCircle(hx, hy, 32);

    // 핸들 방향 삼각형 (화살 모양)
    const ax = hx + Math.cos(this._angle) * 10;
    const ay = hy + Math.sin(this._angle) * 10;
    const bx = hx + Math.cos(this._angle + Math.PI * 0.65) * 14;
    const by = hy + Math.sin(this._angle + Math.PI * 0.65) * 14;
    const cx2 = hx + Math.cos(this._angle - Math.PI * 0.65) * 14;
    const cy2 = hy + Math.sin(this._angle - Math.PI * 0.65) * 14;
    g.fillStyle(0xffffff, 0.9);
    g.fillTriangle(ax, ay, bx, by, cx2, cy2);
  }

  // ─── 입력 ───────────────────────────────────────────────

  private onDown(pointer: Phaser.Input.Pointer): void {
    if (this.activePointerId !== -1) return;
    const dx = pointer.x - this.cx;
    const dy = pointer.y - this.cy;
    if (Math.hypot(dx, dy) > this.radius + 55) return;

    this.activePointerId = pointer.id;
    this.dragStartTime = this.scene.time.now;
    this.applyPointer(pointer.x, pointer.y);
    for (const cb of this.pressCallbacks) cb();
  }

  private onMove(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.activePointerId) return;
    this.applyPointer(pointer.x, pointer.y);
  }

  private onUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.activePointerId) return;
    const holdDuration = this.scene.time.now - this.dragStartTime;
    this.activePointerId = -1;
    for (const cb of this.releaseCallbacks) cb(holdDuration);
  }

  private applyPointer(px: number, py: number): void {
    const dx = px - this.cx;
    const dy = py - this.cy;
    if (dx === 0 && dy === 0) return;

    let angle = Math.atan2(dy, dx);

    // 상단 반원 [-π, 0] 으로 제한
    if (angle > 0) {
      angle = dx <= 0 ? -Math.PI : 0;
    }

    this._angle = angle;
    this.drawHandle();
  }

  destroy(): void {
    this.scene.input.off(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
    this.scene.input.off(Phaser.Input.Events.POINTER_MOVE, this.onMove, this);
    this.scene.input.off(Phaser.Input.Events.POINTER_UP, this.onUp, this);
    this.pressCallbacks = [];
    this.releaseCallbacks = [];
    this.trackGraphics.destroy();
    this.handleGraphics.destroy();
  }
}
