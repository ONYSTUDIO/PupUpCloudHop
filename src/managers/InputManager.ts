import Phaser from 'phaser';

type PressCallback = () => void;
type ReleaseCallback = (chargeDuration: number) => void;

export class InputManager {
  private scene: Phaser.Scene;
  private pressCallbacks: PressCallback[] = [];
  private releaseCallbacks: ReleaseCallback[] = [];
  private enabled: boolean = true;
  private _isPressed: boolean = false;
  private pressStartTime: number = 0;
  private activePointerId: number = -1;

  // JUMP 버튼 존 (원형)
  private readonly jumpCX: number;
  private readonly jumpCY: number;
  private readonly jumpRadius: number;

  constructor(
    scene: Phaser.Scene,
    jumpCX: number,
    jumpCY: number,
    jumpRadius: number,
  ) {
    this.scene = scene;
    this.jumpCX = jumpCX;
    this.jumpCY = jumpCY;
    this.jumpRadius = jumpRadius;

    scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
    scene.input.on(Phaser.Input.Events.POINTER_UP, this.onUp, this);
  }

  private onDown(pointer: Phaser.Input.Pointer): void {
    if (!this.enabled || this._isPressed) return;

    // JUMP 버튼 존 내부 터치만 처리
    const dx = pointer.x - this.jumpCX;
    const dy = pointer.y - this.jumpCY;
    if (Math.hypot(dx, dy) > this.jumpRadius) return;

    this._isPressed = true;
    this.activePointerId = pointer.id;
    this.pressStartTime = this.scene.time.now;
    for (const cb of this.pressCallbacks) cb();
  }

  private onUp(pointer: Phaser.Input.Pointer): void {
    if (!this.enabled || !this._isPressed) return;
    if (pointer.id !== this.activePointerId) return;

    this._isPressed = false;
    this.activePointerId = -1;
    const duration = this.scene.time.now - this.pressStartTime;
    for (const cb of this.releaseCallbacks) cb(duration);
  }

  /** 손가락을 누른 순간 발동 */
  onPress(cb: PressCallback): void {
    this.pressCallbacks.push(cb);
  }

  /** 손가락을 뗀 순간 발동. 인자로 누른 시간(ms)을 받음 */
  onRelease(cb: ReleaseCallback): void {
    this.releaseCallbacks.push(cb);
  }

  get isPressed(): boolean { return this._isPressed; }

  getChargeDuration(): number {
    if (!this._isPressed) return 0;
    return this.scene.time.now - this.pressStartTime;
  }

  enable(): void {
    this._isPressed = false;
    this.activePointerId = -1;
    this.enabled = true;
  }

  disable(): void {
    this._isPressed = false;
    this.activePointerId = -1;
    this.enabled = false;
  }

  destroy(): void {
    this.scene.input.off(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
    this.scene.input.off(Phaser.Input.Events.POINTER_UP, this.onUp, this);
    this.pressCallbacks = [];
    this.releaseCallbacks = [];
  }
}
