import Phaser from 'phaser';
import { DEPTH } from '@config/constants';

export type CorgiDirection = 'left' | 'right';
export type CorgiState     = 'idle' | 'jumping' | 'idle-anim';

const DISPLAY_SIZE       = 200;
const ANIM_FRAME_MS      = 500; // 프레임 전환 간격 (ms)

const IDLE_ANIM_FRAMES: ['corgi_idle_1', 'corgi_idle_2'] = ['corgi_idle_1', 'corgi_idle_2'];

function getTextureKey(state: 'idle' | 'jumping', dir: CorgiDirection): string {
  if (state === 'jumping') {
    return dir === 'left' ? 'corgi_jump_left' : 'corgi_jump_right';
  }
  return dir === 'left' ? 'corgi_left' : 'corgi_right';
}

export class Player {
  x: number;
  y: number;
  vx: number = 0;
  vy: number = 0;
  isOnGround: boolean = false;
  isDead: boolean = false;

  readonly HALF_W = 22;
  readonly HALF_H = 28;

  private sprite: Phaser.GameObjects.Image;
  private _direction: CorgiDirection = 'left';
  private _state: CorgiState = 'idle';

  // idle-anim 전용
  private _animTimer: number = 0;
  private _animFrame: 0 | 1 = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.x = x;
    this.y = y;
    this.sprite = scene.add.image(x, y, getTextureKey('idle', this._direction));
    this.sprite.setDepth(DEPTH.PLAYER);
    this.sprite.setOrigin(0.5, 0.5);
    this.sprite.setDisplaySize(DISPLAY_SIZE, DISPLAY_SIZE);
  }

  /** 매 프레임 호출 — idle-anim 상태일 때 프레임을 전환한다. */
  update(delta: number): void {
    if (this._state !== 'idle-anim') return;
    this._animTimer += delta;
    if (this._animTimer >= ANIM_FRAME_MS) {
      this._animTimer -= ANIM_FRAME_MS;
      this._animFrame = this._animFrame === 0 ? 1 : 0;
      this.sprite.setTexture(IDLE_ANIM_FRAMES[this._animFrame]);
      this.sprite.setDisplaySize(DISPLAY_SIZE, DISPLAY_SIZE);
    }
  }

  sync(): void {
    this.sprite.setPosition(this.x, this.y);
  }

  get bottom(): number { return this.y + this.HALF_H; }
  get top():    number { return this.y - this.HALF_H; }
  get left():   number { return this.x - this.HALF_W; }
  get right():  number { return this.x + this.HALF_W; }

  /** 착지/대기 상태로 전환하고 방향을 설정한다. idle-anim도 해제된다. */
  setIdleDirection(dir: CorgiDirection): void {
    this._direction = dir;
    this._state = 'idle';
    this._animTimer = 0;
    this.sprite.setTexture(getTextureKey('idle', dir));
    this.sprite.setDisplaySize(DISPLAY_SIZE, DISPLAY_SIZE);
  }

  /** 점프 시작 — 방향을 확정하고 점프 이미지로 전환한다. */
  startJump(dir: CorgiDirection): void {
    this._direction = dir;
    this._state = 'jumping';
    this._animTimer = 0;
    this.sprite.setTexture(getTextureKey('jumping', dir));
    this.sprite.setDisplaySize(DISPLAY_SIZE, DISPLAY_SIZE);
  }

  /** idle-anim 시작 — 이미 애니메이션 중이면 무시한다. */
  startIdleAnimation(): void {
    if (this._state === 'idle-anim') return;
    this._state = 'idle-anim';
    this._animTimer = 0;
    this._animFrame = 0;
    this.sprite.setTexture(IDLE_ANIM_FRAMES[0]);
    this.sprite.setDisplaySize(DISPLAY_SIZE, DISPLAY_SIZE);
  }

  get direction(): CorgiDirection { return this._direction; }
  get state(): CorgiState         { return this._state; }

  destroy(): void {
    this.sprite.destroy();
  }
}
