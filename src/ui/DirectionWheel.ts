import Phaser from 'phaser';
import { DEPTH } from '@config/constants';

type WheelMode = 'drag' | 'oscillate';

/**
 * 방향 휠.
 * - 'drag'      모드: 터치/드래그로 각도 설정, release 로 점프 (패턴 2)
 * - 'oscillate' 모드: 자동 진자 왕복, JUMP 버튼 터치 순간 각도 확정 (패턴 3)
 */
export class DirectionWheel {
  private scene: Phaser.Scene;
  private trackGraphics: Phaser.GameObjects.Graphics;
  private handleGraphics: Phaser.GameObjects.Graphics;

  private readonly cx: number;
  private readonly cy: number;
  private readonly radius: number;

  private _angle: number = -Math.PI / 2;
  private readonly mode: WheelMode;
  private _enabled: boolean = true;

  // — oscillate mode —
  private _isOscillating: boolean = false;
  private _oscillationTime: number = 0;
  private readonly OSCILLATION_SPEED = Math.PI * 0.8; // ~2.5s 한 사이클

  // — drag mode —
  private activePointerId: number = -1;
  private dragStartTime: number = 0;
  private releaseCallbacks: ((holdDuration: number) => void)[] = [];
  private pressCallbacks: (() => void)[] = [];

  constructor(scene: Phaser.Scene, cx: number, cy: number, radius: number, mode: WheelMode = 'oscillate') {
    this.scene = scene;
    this.cx = cx;
    this.cy = cy;
    this.radius = radius;
    this.mode = mode;

    this.trackGraphics = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH.HUD);
    this.handleGraphics = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH.HUD + 1);

    this.drawTrack();
    this.drawHandle();

    if (mode === 'drag') {
      scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
      scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.onMove, this);
      scene.input.on(Phaser.Input.Events.POINTER_UP,   this.onUp,   this);
    } else {
      this._isOscillating = true;
    }
  }

  // ─── 공통 API ────────────────────────────────────────────

  get angle(): number { return this._angle; }

  /** 휠 그래픽 표시 여부 (oscillate 모드에서 내부 각도 계산은 계속 진행) */
  setVisible(visible: boolean): void {
    this.trackGraphics.setVisible(visible);
    this.handleGraphics.setVisible(visible);
  }

  /** 인터랙션 / 진자 활성화 */
  enable(): void {
    this._enabled = true;
    if (this.mode === 'oscillate') this._isOscillating = true;
  }

  /** 인터랙션 / 진자 비활성화 */
  disable(): void {
    this._enabled = false;
    if (this.mode === 'oscillate') this._isOscillating = false;
  }

  resetAngle(): void {
    this._angle = -Math.PI / 2;
    if (this.mode === 'oscillate') this._oscillationTime = 0;
    this.drawHandle();
  }

  // ─── oscillate 모드 전용 ──────────────────────────────────

  /** 매 프레임 호출 — oscillate 모드에서만 동작 */
  update(delta: number): void {
    if (this.mode !== 'oscillate' || !this._isOscillating) return;
    this._oscillationTime += delta / 1000;
    this._angle = -Math.PI / 2 + (Math.PI / 2) * Math.sin(this._oscillationTime * this.OSCILLATION_SPEED);
    this.drawHandle();
  }

  /** 진자 정지 (각도 유지) */
  stop(): void {
    if (this.mode === 'oscillate') this._isOscillating = false;
  }

  /** 진자 재개 (멈춘 지점에서 이어서) */
  resume(): void {
    if (this.mode === 'oscillate') this._isOscillating = true;
  }

  // ─── drag 모드 전용 ────────────────────────────────────────

  get isDragging(): boolean { return this.activePointerId !== -1; }

  getDragDuration(): number {
    if (this.activePointerId === -1) return 0;
    return this.scene.time.now - this.dragStartTime;
  }

  onPress(cb: () => void): void { this.pressCallbacks.push(cb); }
  onRelease(cb: (holdDuration: number) => void): void { this.releaseCallbacks.push(cb); }

  // ─── drag 입력 핸들러 ────────────────────────────────────

  private onDown(pointer: Phaser.Input.Pointer): void {
    if (!this._enabled || this.activePointerId !== -1) return;
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
    if (angle > 0) angle = dx <= 0 ? -Math.PI : 0;
    this._angle = angle;
    this.drawHandle();
  }

  // ─── 그리기 ─────────────────────────────────────────────

  private drawTrack(): void {
    const g = this.trackGraphics;
    g.clear();

    g.fillStyle(0x000000, 0.28);
    g.fillCircle(this.cx, this.cy, this.radius + 28);

    g.lineStyle(5, 0xffffff, 0.28);
    g.beginPath();
    g.arc(this.cx, this.cy, this.radius, Math.PI, 0, false);
    g.strokePath();

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

    g.fillStyle(0xffffff, 0.35);
    g.fillCircle(this.cx, this.cy, 7);
  }

  private drawHandle(): void {
    const g = this.handleGraphics;
    g.clear();

    const hx = this.cx + Math.cos(this._angle) * this.radius;
    const hy = this.cy + Math.sin(this._angle) * this.radius;

    g.lineStyle(2, 0xffffff, 0.3);
    g.beginPath();
    g.moveTo(this.cx, this.cy);
    g.lineTo(hx, hy);
    g.strokePath();

    g.fillStyle(0x88aaff, 1);
    g.fillCircle(hx, hy, 32);
    g.lineStyle(3, 0xffffff, 0.9);
    g.strokeCircle(hx, hy, 32);

    const ax  = hx + Math.cos(this._angle) * 10;
    const ay  = hy + Math.sin(this._angle) * 10;
    const bx  = hx + Math.cos(this._angle + Math.PI * 0.65) * 14;
    const by  = hy + Math.sin(this._angle + Math.PI * 0.65) * 14;
    const cx2 = hx + Math.cos(this._angle - Math.PI * 0.65) * 14;
    const cy2 = hy + Math.sin(this._angle - Math.PI * 0.65) * 14;
    g.fillStyle(0xffffff, 0.9);
    g.fillTriangle(ax, ay, bx, by, cx2, cy2);
  }

  destroy(): void {
    if (this.mode === 'drag') {
      this.scene.input.off(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
      this.scene.input.off(Phaser.Input.Events.POINTER_MOVE, this.onMove, this);
      this.scene.input.off(Phaser.Input.Events.POINTER_UP,   this.onUp,   this);
    }
    this.pressCallbacks = [];
    this.releaseCallbacks = [];
    this.trackGraphics.destroy();
    this.handleGraphics.destroy();
  }
}
