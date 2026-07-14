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

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
    scene.input.on(Phaser.Input.Events.POINTER_UP, this.onUp, this);
  }

  private onDown(): void {
    if (!this.enabled || this._isPressed) return;
    this._isPressed = true;
    this.pressStartTime = this.scene.time.now;
    for (const cb of this.pressCallbacks) cb();
  }

  private onUp(): void {
    if (!this.enabled || !this._isPressed) return;
    this._isPressed = false;
    const duration = this.scene.time.now - this.pressStartTime;
    for (const cb of this.releaseCallbacks) cb(duration);
  }

  /** 손가락을 누른 순간 발동 (충전 시작 표시 등에 사용) */
  onPress(cb: PressCallback): void {
    this.pressCallbacks.push(cb);
  }

  /** 손가락을 뗀 순간 발동. 인자로 누른 시간(ms)을 받음 */
  onRelease(cb: ReleaseCallback): void {
    this.releaseCallbacks.push(cb);
  }

  /** 현재 누르고 있는 중인지 */
  get isPressed(): boolean {
    return this._isPressed;
  }

  /** 현재까지 충전된 시간(ms). 누르지 않으면 0 반환 */
  getChargeDuration(): number {
    if (!this._isPressed) return 0;
    return this.scene.time.now - this.pressStartTime;
  }

  enable(): void {
    this._isPressed = false;
    this.enabled = true;
  }

  disable(): void {
    this._isPressed = false;
    this.enabled = false;
  }

  destroy(): void {
    this.scene.input.off(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
    this.scene.input.off(Phaser.Input.Events.POINTER_UP, this.onUp, this);
    this.pressCallbacks = [];
    this.releaseCallbacks = [];
  }
}
