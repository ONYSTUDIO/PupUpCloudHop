import Phaser from 'phaser';
import { DEPTH } from '@config/constants';

export type CorgiDirection = 'left' | 'right';
export type CorgiState     = 'idle' | 'jumping' | 'idle-anim' | 'shock' | 'gameover' | 'gameover-fly' | 'fly-anim';

const DISPLAY_SIZE       = 200;
const ANIM_FRAME_MS      = 500; // 프레임 전환 간격 (ms)

const IDLE_ANIM_FRAMES: ['corgi_idle_1', 'corgi_idle_2'] = ['corgi_idle_1', 'corgi_idle_2'];

// 충격 애니메이션: shock_01, shock_02 각 2회씩 교번 (200ms × 4프레임 = 800ms)
const SHOCK_FRAMES = ['corgi_shock_01', 'corgi_shock_02'] as const;
const SHOCK_FRAME_MS    = 200;
const SHOCK_TOTAL_FRAMES = 4; // 01→02→01→02

// gameover-fly 회전 속도 (deg/ms): 600ms 당 360도
const GAMEOVER_FLY_ROT_SPEED = 360 / 600;

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

  // shock 전용
  private _shockFrameIdx: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.x = x;
    this.y = y;
    this.sprite = scene.add.image(x, y, getTextureKey('idle', this._direction));
    this.sprite.setDepth(DEPTH.PLAYER);
    this.sprite.setOrigin(0.5, 0.5);
    this.sprite.setDisplaySize(DISPLAY_SIZE, DISPLAY_SIZE);
  }

  /** 매 프레임 호출 — idle-anim / shock 상태일 때 프레임을 전환한다. */
  update(delta: number): void {
    if (this._state === 'idle-anim') {
      this._animTimer += delta;
      if (this._animTimer >= ANIM_FRAME_MS) {
        this._animTimer -= ANIM_FRAME_MS;
        this._animFrame = this._animFrame === 0 ? 1 : 0;
        this.sprite.setTexture(IDLE_ANIM_FRAMES[this._animFrame]);
        this.sprite.setDisplaySize(DISPLAY_SIZE, DISPLAY_SIZE);
      }
    } else if (this._state === 'gameover-fly' || this._state === 'fly-anim') {
      this.sprite.angle += GAMEOVER_FLY_ROT_SPEED * delta;
    } else if (this._state === 'shock') {
      this._animTimer += delta;
      if (this._animTimer >= SHOCK_FRAME_MS) {
        this._animTimer -= SHOCK_FRAME_MS;
        this._shockFrameIdx++;
        if (this._shockFrameIdx >= SHOCK_TOTAL_FRAMES) {
          // 애니메이션 완료 → idle 복귀
          this._state = 'idle';
          this.sprite.setTexture(getTextureKey('idle', this._direction));
          this.sprite.setDisplaySize(DISPLAY_SIZE, DISPLAY_SIZE);
        } else {
          this.sprite.setTexture(SHOCK_FRAMES[this._shockFrameIdx % 2]!);
          this.sprite.setDisplaySize(DISPLAY_SIZE, DISPLAY_SIZE);
        }
      }
    }
  }

  sync(): void {
    this.sprite.setPosition(this.x, this.y);
  }

  get bottom(): number { return this.y + this.HALF_H; }
  get top():    number { return this.y - this.HALF_H; }
  get left():   number { return this.x - this.HALF_W; }
  get right():  number { return this.x + this.HALF_W; }

  /** 착지/대기 상태로 전환하고 방향을 설정한다. idle-anim도 해제된다. 충격/게임오버 연출 중이면 무시한다. */
  setIdleDirection(dir: CorgiDirection): void {
    if (this._state === 'shock' || this._state === 'gameover' || this._state === 'gameover-fly') return;
    this._direction = dir;
    this._state = 'idle';
    this._animTimer = 0;
    this.sprite.angle = 0; // fly-anim에서 복귀 시 회전 초기화
    this.sprite.setTexture(getTextureKey('idle', dir));
    this.sprite.setDisplaySize(DISPLAY_SIZE, DISPLAY_SIZE);
  }

  /** 점프 시작 — 방향을 확정하고 점프 이미지로 전환한다. 충격/게임오버 연출 중이면 무시한다. */
  startJump(dir: CorgiDirection): void {
    if (this._state === 'shock' || this._state === 'gameover' || this._state === 'gameover-fly') return;
    this._direction = dir;
    this._state = 'jumping';
    this._animTimer = 0;
    this.sprite.setTexture(getTextureKey('jumping', dir));
    this.sprite.setDisplaySize(DISPLAY_SIZE, DISPLAY_SIZE);
  }

  /** idle-anim 시작 — 이미 애니메이션 중이거나 충격/게임오버 연출 중이면 무시한다. */
  startIdleAnimation(): void {
    if (this._state === 'idle-anim' || this._state === 'shock' || this._state === 'gameover' || this._state === 'gameover-fly') return;
    this._state = 'idle-anim';
    this._animTimer = 0;
    this._animFrame = 0;
    this.sprite.setTexture(IDLE_ANIM_FRAMES[0]);
    this.sprite.setDisplaySize(DISPLAY_SIZE, DISPLAY_SIZE);
  }

  /** 게임오버 이미지로 전환 — 이후 상태 변경 불가 */
  playGameOver(): void {
    this._state = 'gameover';
    this.sprite.setTexture('corgi_gameover');
    this.sprite.setDisplaySize(DISPLAY_SIZE, DISPLAY_SIZE);
  }

  /** 카메라 줌인 비행 연출: fly 이미지 + 연속 회전. 착지 성공 시 setIdleDirection()으로 복귀 가능. */
  startFlyAnim(): void {
    if (this._state === 'shock' || this._state === 'gameover' || this._state === 'gameover-fly') return;
    this._state = 'fly-anim';
    this.sprite.angle = 0;
    this.sprite.setTexture('corgi_gameover_fly');
    this.sprite.setDisplaySize(DISPLAY_SIZE, DISPLAY_SIZE);
  }

  /** 낙사·풍선 튕김 게임오버: fly 이미지로 전환 + 연속 회전 — 이후 상태 변경 불가 */
  playGameOverFly(): void {
    this._state = 'gameover-fly';
    this.sprite.angle = 0;
    this.sprite.setTexture('corgi_gameover_fly');
    this.sprite.setDisplaySize(DISPLAY_SIZE, DISPLAY_SIZE);
  }

  /** 충격 애니메이션 시작 (shock_01→02→01→02, 각 200ms, 총 800ms 후 idle 복귀) */
  playShock(): void {
    this._state         = 'shock';
    this._animTimer     = 0;
    this._shockFrameIdx = 0;
    this.sprite.setTexture(SHOCK_FRAMES[0]);
    this.sprite.setDisplaySize(DISPLAY_SIZE, DISPLAY_SIZE);
  }

  get direction(): CorgiDirection { return this._direction; }
  get state(): CorgiState         { return this._state; }

  destroy(): void {
    this.sprite.destroy();
  }
}
