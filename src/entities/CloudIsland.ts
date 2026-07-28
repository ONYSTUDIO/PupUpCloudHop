import Phaser from 'phaser';
import { CloudPatternType, type CloudIslandConfig } from '@game-types/game';
import { DEPTH } from '@config/constants';
import { GAMEPLAY } from '@config/gameplayConfig';

export class CloudIsland {
  private container: Phaser.GameObjects.Container;
  private _config: CloudIslandConfig;
  private _currentAngle: number;
  private _patternType: CloudPatternType;
  private orbitGraphics?: Phaser.GameObjects.Graphics;

  // 섬 착지 영역 (컨테이너 로컬 좌표 기준)
  private _islandLocalTopY: number = 0;
  private _islandHalfW: number = 0;

  // 낙하 상태 (새떼 충돌 시)
  private _isFalling: boolean = false;
  private _fallVy: number = 0;

  readonly vortexAngleOffset: number;

  x: number = 0;
  y: number = 0;

  constructor(scene: Phaser.Scene, config: CloudIslandConfig) {
    this._config = config;
    this._patternType = config.patternType ?? CloudPatternType.PATTERN_1;
    this.vortexAngleOffset = config.vortexAngleOffset ?? 0;
    this._currentAngle = config.startAngle;

    const w = config.width;
    const h = config.height;

    // 착지 영역 사전 계산 (컨테이너 중심 = 구름 레이어 중심)
    const islandW = w;
    const islandH = h * 0.85;
    const islandCenterLocalY = -(h * 0.5 + islandH * 0.5);

    // 잔디 타원 중심에서 27% 위 = 플레이어가 서는 표면
    this._islandLocalTopY = islandCenterLocalY - islandH * 0.27;
    // 착지 가능 너비 = 섬 시각 폭의 50% (잔디 타원 끝단과 일치)
    this._islandHalfW = islandW * 0.50;

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
      og.strokeEllipse(
        config.centerX,
        config.centerY,
        config.orbitRadiusX * 2,
        config.orbitRadiusY * 2,
      );
      this.orbitGraphics = og;
    }

    const g = scene.add.graphics();
    this.drawCloudIsland(g, w, h);

    this.container = scene.add.container(this.x, this.y, [g]);
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

    this._currentAngle +=
      this._config.orbitSpeed * this._config.rotationDirection * (delta / 1000);
    const pos = this.calcPosition(this._currentAngle);
    this.x = pos.x;
    this.y = pos.y;
    this.container.setPosition(this.x, this.y);
  }

  get isFalling(): boolean { return this._isFalling; }

  startFalling(): void {
    this._isFalling = true;
    this._fallVy = 0;
  }

  setWorldXY(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.container.setPosition(x, y);
  }

  get id(): string { return this._config.id; }

  // ── 착지 영역 — 섬(잔디) 표면 기준 ────────────────────────
  get topY(): number  { return this.y + this._islandLocalTopY; }
  get halfW(): number { return this._islandHalfW; }
  get leftX(): number { return this.x - this._islandHalfW; }
  get rightX(): number { return this.x + this._islandHalfW; }

  // ── 위험 구역 — 구름 레이어 ────────────────────────────────
  // 구름 본체 AABB (섬 착지 판정보다 낮은 위치)
  get cloudBodyTopY(): number    { return this.y - this._config.height * 0.5; }
  get cloudBodyBottomY(): number { return this.y + this._config.height * 0.5; }
  get cloudBodyHalfW(): number   { return this._config.width * 0.5; }

  // ── 위험 구역 — 풍선 레이어 ────────────────────────────────
  // 풍선 끈 시작점 ~ 풍선 하단 꼭지 (drawCloudIsland 파라미터와 동기화)
  get balloonZoneTopY(): number {
    return this.y + this._config.height * 0.44;
  }
  get balloonZoneBottomY(): number {
    const br = this._config.width * 0.095;
    return this.balloonZoneTopY + br * 3.6; // balloonCY + balloonR * (2.15 + 1.48)
  }
  get balloonZoneHalfW(): number { return this._config.width * 0.305; } // 3개 풍선 전체 너비

  // ── 내부 / 호환용 ────────────────────────────────────────────
  get halfH(): number { return this._config.height / 2; }
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

  /**
   * 구름섬 3레이어 드로잉 (컨테이너 로컬 좌표, 원점 = 구름 중심)
   *
   * 레이어 순서 (아래 → 위):
   *   1. 풍선 : 구름 하단에 매달린 컬러 풍선 3개
   *   2. 구름 : 가운데 흰 뭉게구름
   *   3. 섬   : 구름 위 잔디+흙 섬 (펜스, 꽃 포함)
   *
   * 착지 판정은 섬(잔디) 표면만 유효.
   * 구름·풍선 위치에 닿으면 충돌 미감지 → 낙하 → 게임 오버.
   */
  private drawCloudIsland(g: Phaser.GameObjects.Graphics, w: number, h: number): void {
    const islandW  = w * 0.88;
    const islandH  = h * 0.85;
    const islandCY = -(h * 0.5 + islandH * 0.5); // 섬 중심 로컬 Y

    const balloonR  = w * 0.095;
    const bStringY  = h * 0.44;                   // 구름 하단 끈 연결점
    const balloonCY = bStringY + balloonR * 2.15; // 풍선 중심 Y

    // ── 1. 풍선 ────────────────────────────────────────────
    const bxList: number[]  = [-w * 0.21, 0, w * 0.21];
    const bColors: number[] = [0xb039d6, 0xff7700, 0xe63030]; // 보라·주황·빨강

    // 풍선 간 연결 끈
    g.lineStyle(2, 0xddcc77, 0.9);
    g.beginPath();
    g.moveTo(bxList[0]!, balloonCY + balloonR * 0.75);
    g.lineTo(bxList[2]!, balloonCY + balloonR * 0.75);
    g.strokePath();

    // 풍선별 줄
    bxList.forEach((bx) => {
      g.lineStyle(2, 0xddcc77, 0.85);
      g.beginPath();
      g.moveTo(bx, bStringY);
      g.lineTo(bx, balloonCY - balloonR);
      g.strokePath();
    });

    // 풍선 본체
    bColors.forEach((color, i) => {
      const bx = bxList[i]!;
      const by = i === 1 ? balloonCY - balloonR * 0.18 : balloonCY; // 가운데 풍선 살짝 위

      g.fillStyle(color, 0.93);
      g.fillEllipse(bx, by, balloonR * 2.05, balloonR * 2.55);

      // 광택 하이라이트
      g.fillStyle(0xffffff, 0.38);
      g.fillEllipse(bx - balloonR * 0.26, by - balloonR * 0.42, balloonR * 0.62, balloonR * 0.40);

      // 묶음 꼭지
      g.fillStyle(color, 1);
      g.fillTriangle(
        bx - 3, by + balloonR * 1.22,
        bx + 3, by + balloonR * 1.22,
        bx,     by + balloonR * 1.48,
      );
    });

    // ── 2. 구름 레이어 ─────────────────────────────────────
    g.fillStyle(0xffffff, 0.97);
    g.fillEllipse(0, 0, w, h);

    // 뭉게 볼록 (위쪽)
    g.fillStyle(0xf4f7ff, 1);
    g.fillEllipse(-w * 0.25, -h * 0.18, w * 0.52, h * 0.74);
    g.fillEllipse( w * 0.18, -h * 0.26, w * 0.46, h * 0.64);
    g.fillEllipse( w * 0.01, -h * 0.12, w * 0.32, h * 0.52);

    // 하단 그림자
    g.fillStyle(0xbacfde, 0.42);
    g.fillEllipse(0, h * 0.30, w * 0.85, h * 0.30);

    // ── 3. 섬 ──────────────────────────────────────────────
    // 흙 하단 타원
    g.fillStyle(0x7a4928, 1);
    g.fillEllipse(0, islandCY + islandH * 0.22, islandW * 0.92, islandH * 0.66);

    // 흙 측면 (직사각형 → 깔끔한 절벽 경계)
    g.fillStyle(0x8c5c38, 1);
    g.fillRect(
      -islandW * 0.50,
      islandCY - islandH * 0.04,
      islandW * 1.00,
      islandH * 0.36,
    );

    // 잔디 (착지 가능 영역)
    g.fillStyle(0x4caf50, 1);
    g.fillEllipse(0, islandCY, islandW, islandH * 0.65);

    // 잔디 하이라이트
    g.fillStyle(0x7ecb7e, 0.58);
    g.fillEllipse(-islandW * 0.10, islandCY - islandH * 0.12, islandW * 0.54, islandH * 0.28);

    // ── 꽃 ────────────────────────────────────────────────
    const flowerY = islandCY - islandH * 0.22;
    const flowers: { dx: number; petal: number; center: number }[] = [
      { dx: -islandW * 0.25, petal: 0xff8fab, center: 0xffee58 },
      { dx:  islandW * 0.19, petal: 0xffffff, center: 0xffc107 },
      { dx:  islandW * 0.04, petal: 0xce93d8, center: 0xfff176 },
    ];
    flowers.forEach(({ dx, petal, center }) => {
      const fr = 4.2;
      g.fillStyle(petal, 1);
      g.fillCircle(dx - fr, flowerY, fr * 0.88);
      g.fillCircle(dx + fr, flowerY, fr * 0.88);
      g.fillCircle(dx, flowerY - fr, fr * 0.88);
      g.fillCircle(dx, flowerY + fr, fr * 0.88);
      g.fillStyle(center, 1);
      g.fillCircle(dx, flowerY, fr * 0.68);
    });

    // ── 펜스 ──────────────────────────────────────────────
    const fenceTopY = islandCY - islandH * 0.30;
    const fenceW    = islandW * 0.68;
    const postH     = islandH * 0.46;
    const postW     = 5;
    const numPosts  = 5;

    // 가로대
    g.fillStyle(0xa0724e, 1);
    g.fillRect(-fenceW * 0.5, fenceTopY - postH * 0.60, fenceW, 4);
    g.fillRect(-fenceW * 0.5, fenceTopY - postH * 0.22, fenceW, 4);

    // 세로 기둥 (상단 뾰족)
    for (let i = 0; i < numPosts; i++) {
      const px    = -fenceW * 0.5 + (fenceW / (numPosts - 1)) * i;
      const ptTop = fenceTopY - postH;

      g.fillStyle(0x8d5a35, 1);
      g.fillRect(px - postW / 2, ptTop + 7, postW, postH);
      g.fillTriangle(
        px - postW / 2, ptTop + 9,
        px + postW / 2, ptTop + 9,
        px,             ptTop,
      );
    }
  }
}
