import Phaser from 'phaser';
import { CloudPatternType, CloudType, type CloudIslandConfig } from '@game-types/game';
import { DEPTH } from '@config/constants';
import { GAMEPLAY } from '@config/gameplayConfig';

// 이미지 원본 크기 (aspect ratio 계산용)
const ISLAND_NATURAL: Record<CloudType, { w: number; h: number }> = {
  A: { w: 846, h: 500 },
  B: { w: 621, h: 399 },
  C: { w: 619, h: 434 },
  D: { w: 563, h: 369 },
};
const BALLOON_NATURAL = { w: 411, h: 265 };

// 레이아웃 상수 — 조정 필요 시 이 값만 수정
const ISLAND_ORIGIN_Y    = 0.72; // 이미지 높이의 몇 % 지점이 컨테이너 원점과 일치하는지
const SURFACE_TOP_FRAC   = 0.10; // 이미지 상단으로부터 착지 표면까지의 비율
const BALLOON_WIDTH_RATIO = 0.60; // 풍선 표시 너비 / 섬 표시 너비
const BALLOON_OVERLAP_Y  = 18;   // 풍선이 구름 하단과 겹치는 픽셀 (틈 제거)

export class CloudIsland {
  private container: Phaser.GameObjects.Container;
  private _config: CloudIslandConfig;
  private _currentAngle: number;
  private _patternType: CloudPatternType;
  private orbitGraphics?: Phaser.GameObjects.Graphics;

  // 착지 영역
  private _islandLocalTopY: number = 0;
  private _islandHalfW: number = 0;

  // 풍선 충돌 구역
  private _balloonTopLocalY: number = 0;
  private _balloonBottomLocalY: number = 0;
  private _balloonHalfW: number = 0;

  // 구름 본체 충돌 구역
  private _cloudBodyTopLocalY: number = 0;
  private _cloudBodyBottomLocalY: number = 0;
  private _cloudBodyHalfW: number = 0;

  // 낙하 / 동결 상태
  private _isFalling: boolean = false;
  private _fallVy: number = 0;
  private _isFrozen: boolean = false;

  readonly vortexAngleOffset: number;

  x: number = 0;
  y: number = 0;

  constructor(scene: Phaser.Scene, config: CloudIslandConfig) {
    this._config = config;
    this._patternType = config.patternType ?? CloudPatternType.PATTERN_1;
    this.vortexAngleOffset = config.vortexAngleOffset ?? 0;
    this._currentAngle = config.startAngle;

    const cloudType: CloudType = config.cloudType ?? 'A';
    const nat = ISLAND_NATURAL[cloudType];

    // 섬 이미지 표시 크기
    const islandW = config.width;
    const islandH = islandW * (nat.h / nat.w);

    // 풍선 이미지 표시 크기
    const balloonW = islandW * BALLOON_WIDTH_RATIO;
    const balloonH = balloonW * (BALLOON_NATURAL.h / BALLOON_NATURAL.w);

    // ── 착지 영역 계산 ────────────────────────────────────────
    // 이미지 상단 = -ISLAND_ORIGIN_Y * islandH (컨테이너 로컬)
    // 착지 표면  = 이미지 상단 + SURFACE_TOP_FRAC * islandH
    this._islandLocalTopY = -islandH * (ISLAND_ORIGIN_Y - SURFACE_TOP_FRAC);
    this._islandHalfW     = islandW * 0.40;

    // ── 풍선 구역 계산 ────────────────────────────────────────
    const islandBottomLocalY   = islandH * (1 - ISLAND_ORIGIN_Y);
    this._balloonTopLocalY     = islandBottomLocalY;
    this._balloonBottomLocalY  = islandBottomLocalY + balloonH;
    this._balloonHalfW         = balloonW * 0.50;

    // ── 구름 본체 구역 (새떼/번개 충돌용) ────────────────────
    this._cloudBodyTopLocalY    = -islandH * (ISLAND_ORIGIN_Y - 0.30);
    this._cloudBodyBottomLocalY =  islandH * (0.80 - ISLAND_ORIGIN_Y);
    this._cloudBodyHalfW        = islandW * 0.45;

    // ── 궤도 초기 위치 ─────────────────────────────────────
    if (this._patternType === CloudPatternType.PATTERN_2) {
      this.x = config.centerX;
      this.y = config.centerY;
    } else {
      const pos = this.calcPosition(this._currentAngle);
      this.x = pos.x;
      this.y = pos.y;

      const og = scene.add.graphics();
      og.setDepth(DEPTH.DECOR_CLOUD);
      og.lineStyle(3.0, 0x88aaff, 0.45);
      og.strokeEllipse(config.centerX, config.centerY, config.orbitRadiusX * 2, config.orbitRadiusY * 2);
      this.orbitGraphics = og;
    }

    // ── 스프라이트 생성 ────────────────────────────────────
    const balloonImg = scene.add.image(0, islandBottomLocalY - BALLOON_OVERLAP_Y, 'ballon');
    balloonImg.setOrigin(0.5, 0);
    balloonImg.setDisplaySize(balloonW, balloonH);

    const islandImg = scene.add.image(0, 0, `type_${cloudType}`);
    islandImg.setOrigin(0.5, ISLAND_ORIGIN_Y);
    islandImg.setDisplaySize(islandW, islandH);

    this.container = scene.add.container(this.x, this.y, [islandImg, balloonImg]);
    this.container.setDepth(DEPTH.CLOUD_ISLAND);
  }

  update(delta: number): void {
    if (this._isFalling) {
      this._fallVy += GAMEPLAY.CLOUD_FALL_GRAVITY * (delta / 1000);
      this.y += this._fallVy * (delta / 1000);
      this.container.setPosition(this.x, this.y);
      return;
    }
    if (this._patternType === CloudPatternType.PATTERN_2) return;
    if (this._isFrozen) return;

    this._currentAngle +=
      this._config.orbitSpeed * this._config.rotationDirection * (delta / 1000);
    const pos = this.calcPosition(this._currentAngle);
    this.x = pos.x;
    this.y = pos.y;
    this.container.setPosition(this.x, this.y);
  }

  get isFalling(): boolean { return this._isFalling; }
  get isFrozen():  boolean { return this._isFrozen; }

  startFalling(): void { this._isFalling = true; this._fallVy = 0; }
  freeze():   void { this._isFrozen = true; }
  unfreeze(): void { this._isFrozen = false; }

  setWorldXY(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.container.setPosition(x, y);
  }

  get id(): string { return this._config.id; }

  // ── 착지 영역 ───────────────────────────────────────────
  get topY():  number { return this.y + this._islandLocalTopY; }
  get halfW(): number { return this._islandHalfW; }
  get leftX(): number { return this.x - this._islandHalfW; }
  get rightX(): number { return this.x + this._islandHalfW; }

  // ── 구름 본체 구역 ──────────────────────────────────────
  get cloudBodyTopY():    number { return this.y + this._cloudBodyTopLocalY; }
  get cloudBodyBottomY(): number { return this.y + this._cloudBodyBottomLocalY; }
  get cloudBodyHalfW():   number { return this._cloudBodyHalfW; }

  // ── 풍선 구역 ───────────────────────────────────────────
  get balloonZoneTopY():    number { return this.y + this._balloonTopLocalY; }
  get balloonZoneBottomY(): number { return this.y + this._balloonBottomLocalY; }
  get balloonZoneHalfW():   number { return this._balloonHalfW; }

  // ── 호환용 ─────────────────────────────────────────────
  get halfH(): number { return this._config.height / 2; }
  get orbitCenterX(): number { return this._config.centerX; }
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
}
