import Phaser from 'phaser';
import { DEPTH, ITEM_CONFIG } from '@config/constants';
import { GAMEPLAY } from '@config/gameplayConfig';
import type { CloudIsland } from '@entities/CloudIsland';

// 캐릭터 방어막 색 — 밝은 전기 초록
const COLOR_SHIELD = 0x00ff88;
const COLOR_SHIELD_INNER = 0x88ffcc;

// 구름 범위 표시 색 — 민트/연두 계열 (방어막과 구분)
const COLOR_CLOUD_RANGE = 0x66ffaa;
const COLOR_CLOUD_SURFACE = 0x99ffcc;


export class MagnetSystem {
  private scene: Phaser.Scene;

  /** 플레이어 위치 기준 방어막 */
  private fieldGraphics: Phaser.GameObjects.Graphics | null = null;
  /** 월드 좌표 — 구름 착지 범위 표시 */
  private cloudRangeGraphics: Phaser.GameObjects.Graphics | null = null;
  /** 월드 좌표 — 당기기 이펙트 (빔 + 글로우 + 파티클) */
  private pullGraphics: Phaser.GameObjects.Graphics | null = null;

  private _isActive: boolean = false;
  private _timer: number = 0;
  private _isPulling: boolean = false;
  private time: number = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  get isActive(): boolean { return this._isActive; }
  get timer(): number { return this._timer; }

  get landToleranceY(): number {
    return this._isActive
      ? GAMEPLAY.LAND_TOLERANCE_Y * ITEM_CONFIG.MAGNET_TOLERANCE_MULT
      : GAMEPLAY.LAND_TOLERANCE_Y;
  }

  get landToleranceX(): number {
    return this._isActive ? ITEM_CONFIG.MAGNET_TOLERANCE_X : 0;
  }

  activate(): void {
    if (this._isActive) return;
    this._isActive = true;
    this._timer = ITEM_CONFIG.MAGNET_DURATION_SEC;
    this.time = 0;
    this.fieldGraphics = this.scene.add.graphics().setDepth(DEPTH.PLAYER - 1);
    this.cloudRangeGraphics = this.scene.add.graphics().setDepth(DEPTH.CLOUD_ISLAND + 1);
  }

  /** 자석 당기기 시작 */
  startPull(): void {
    this._isPulling = true;
    this.pullGraphics = this.scene.add.graphics().setDepth(DEPTH.EFFECT);
  }

  /** 매 프레임: 타이머 감소 + 방어막·범위 비주얼 갱신 */
  update(delta: number, playerX: number, playerY: number, clouds: CloudIsland[]): void {
    if (!this._isActive) return;

    this._timer -= delta / 1000;
    this.time += delta / 1000;

    if (this._timer <= 0) {
      this._timer = 0;
      this._isActive = false;
      this._isPulling = false;
      this.fieldGraphics?.destroy();
      this.fieldGraphics = null;
      this.cloudRangeGraphics?.destroy();
      this.cloudRangeGraphics = null;
      this.pullGraphics?.destroy();
      this.pullGraphics = null;
      return;
    }

    this.drawShield(playerX, playerY);
    if (!this._isPulling) this.drawCloudRanges(clouds);
  }

  /** 당기기 이펙트 갱신 — GameScene.updateMagnetPull() 에서 매 프레임 호출 */
  updatePull(
    playerX: number, playerY: number,
    cloudX: number, cloudTopY: number,
    progress: number,
  ): void {
    const g = this.pullGraphics;
    if (!g) return;
    g.clear();

    this.drawPullBeams(g, playerX, playerY, cloudX, cloudTopY, progress);
    this.drawPullCloudGlow(g, cloudX, cloudTopY, progress);
    this.drawPullParticles(g, playerX, playerY, cloudX, cloudTopY, progress);
  }

  /** 당기기 이펙트 종료 */
  endPull(): void {
    this._isPulling = false;
    this.pullGraphics?.destroy();
    this.pullGraphics = null;
  }

  clearAll(): void {
    this._isActive = false;
    this._timer = 0;
    this._isPulling = false;
    this.fieldGraphics?.destroy();
    this.fieldGraphics = null;
    this.cloudRangeGraphics?.destroy();
    this.cloudRangeGraphics = null;
    this.pullGraphics?.destroy();
    this.pullGraphics = null;
  }

  // ─── 캐릭터 방어막 ────────────────────────────────────────

  private drawShield(cx: number, cy: number): void {
    const g = this.fieldGraphics!;
    g.clear();
    g.setPosition(cx, cy);

    const baseR = 58;
    const pulse = Math.sin(this.time * Math.PI * 3.2) * 0.06;
    const r = baseR * (1 + pulse);

    g.fillStyle(COLOR_SHIELD, 0.06);
    g.fillCircle(0, 0, r + 22);

    g.fillStyle(COLOR_SHIELD, this._isPulling ? 0.14 : 0.08);
    g.fillCircle(0, 0, r);

    g.lineStyle(this._isPulling ? 4 : 3, COLOR_SHIELD, this._isPulling ? 0.95 : 0.78);
    g.strokeCircle(0, 0, r);

    g.lineStyle(1.5, COLOR_SHIELD_INNER, 0.38);
    g.strokeCircle(0, 0, r - 6);

    // 당기는 중: 크래클 더 많고 강하게
    if (this._isPulling) {
      this.drawCrackle(g, r, 12, 30);
    } else {
      this.drawCrackle(g, r, 7, 22);
    }

    g.fillStyle(0xffffff, 0.18);
    g.fillEllipse(-r * 0.25, -r * 0.30, r * 0.34, r * 0.17);
  }

  private drawCrackle(
    g: Phaser.GameObjects.Graphics,
    r: number,
    count: number,
    maxDist: number,
  ): void {
    for (let i = 0; i < count; i++) {
      const baseAngle = (i / count) * Math.PI * 2 + this.time * 0.9;
      const flicker = Math.abs(Math.sin(this.time * 15 + i * 2.4));
      if (flicker < 0.28) continue;

      g.lineStyle(2, COLOR_SHIELD, flicker * 0.85);
      g.beginPath();
      g.moveTo(Math.cos(baseAngle) * r, Math.sin(baseAngle) * r);

      for (let s = 1; s <= 3; s++) {
        const t = s / 3;
        const dist = r + t * maxDist;
        const jitter = Math.sin(this.time * 22 + i * 5.7 + s * 4.1) * 11 * (1 - t * 0.4);
        const nx = Math.cos(baseAngle) * dist - Math.sin(baseAngle) * jitter;
        const ny = Math.sin(baseAngle) * dist + Math.cos(baseAngle) * jitter;
        g.lineTo(nx, ny);
      }
      g.strokePath();
    }
  }

  // ─── 구름섬 착지 범위 표시 ─────────────────────────────────

  private drawCloudRanges(clouds: CloudIsland[]): void {
    const g = this.cloudRangeGraphics!;
    g.clear();

    const tolerance = this.landToleranceY;

    for (const cloud of clouds) {
      if (cloud.isFalling) continue;

      const cx = cloud.x;
      const topY = cloud.topY;
      const halfW = cloud.halfW;

      const zoneTop    = topY - tolerance;
      const zoneBottom = cloud.balloonZoneBottomY;
      const zoneH      = zoneBottom - zoneTop;
      const zoneCY     = (zoneTop + zoneBottom) / 2;
      const zoneW      = (cloud.halfW + ITEM_CONFIG.MAGNET_TOLERANCE_X) * 2;

      g.fillStyle(COLOR_CLOUD_RANGE, 0.07);
      g.fillEllipse(cx, zoneCY, zoneW, zoneH);

      const segments = 12;
      g.lineStyle(1.5, COLOR_CLOUD_RANGE, 0.45);
      for (let s = 0; s < segments; s++) {
        if (s % 2 === 1) continue;
        const startA = (s / segments) * Math.PI * 2;
        const endA   = ((s + 0.7) / segments) * Math.PI * 2;
        g.beginPath();
        const steps = 8;
        for (let p = 0; p <= steps; p++) {
          const a = startA + (endA - startA) * (p / steps);
          const px = cx + Math.cos(a) * (zoneW / 2);
          const py = zoneCY + Math.sin(a) * (zoneH / 2);
          if (p === 0) g.moveTo(px, py);
          else g.lineTo(px, py);
        }
        g.strokePath();
      }

      g.lineStyle(2.5, COLOR_CLOUD_SURFACE, 0.55);
      g.beginPath();
      g.moveTo(cx - halfW, topY);
      g.lineTo(cx + halfW, topY);
      g.strokePath();

      g.fillStyle(COLOR_CLOUD_SURFACE, 0.6);
      g.fillCircle(cx - halfW, topY, 4);
      g.fillCircle(cx + halfW, topY, 4);
    }
  }

  // ─── 당기기 이펙트 ────────────────────────────────────────

  /** player → cloud 사이 번개 빔 3가닥 */
  private drawPullBeams(
    g: Phaser.GameObjects.Graphics,
    x1: number, y1: number,
    x2: number, y2: number,
    progress: number,
  ): void {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1) return;

    // 수직 단위벡터 (빔 간격용)
    const perpX = -dy / len;
    const perpY =  dx / len;

    // 3가닥: 가운데 굵은 주빔, 좌우 얇은 보조빔
    const beams: { offset: number; width: number }[] = [
      { offset: -12, width: 1.5 },
      { offset:   0, width: 2.5 },
      { offset:  12, width: 1.5 },
    ];

    for (let b = 0; b < beams.length; b++) {
      const { offset, width } = beams[b]!;

      const bx1 = x1 + perpX * offset;
      const by1 = y1 + perpY * offset;
      const bx2 = x2 + perpX * offset;
      const by2 = y2 + perpY * offset;

      const flicker = Math.abs(Math.sin(this.time * 18 + b * 2.7));
      const alpha = (0.45 + progress * 0.4) * (0.55 + flicker * 0.45);

      g.lineStyle(width, COLOR_SHIELD, alpha);
      g.beginPath();
      g.moveTo(bx1, by1);

      const segments = 10;
      for (let i = 1; i < segments; i++) {
        const t = i / segments;
        // 양끝에서 0, 중간에서 최대인 envelope으로 지그재그 폭 제어
        const envelope = Math.sin(t * Math.PI) * 16;
        const jitter   = Math.sin(this.time * 26 + b * 3.3 + i * 1.9) * envelope;
        g.lineTo(
          bx1 + (bx2 - bx1) * t + perpX * jitter,
          by1 + (by2 - by1) * t + perpY * jitter,
        );
      }
      g.lineTo(bx2, by2);
      g.strokePath();
    }
  }

  /** 목표 구름 중앙에 수렴 글로우 + 링 */
  private drawPullCloudGlow(
    g: Phaser.GameObjects.Graphics,
    cx: number, cy: number,
    progress: number,
  ): void {
    const pulse = Math.sin(this.time * 10) * 0.12;
    const baseR  = 28 + progress * 38;
    const r      = baseR * (1 + pulse);

    // 외곽 글로우
    g.fillStyle(COLOR_SHIELD, 0.06 + progress * 0.06);
    g.fillCircle(cx, cy, r);

    // 외곽 링
    g.lineStyle(1.5, COLOR_SHIELD, 0.30 + progress * 0.20);
    g.strokeCircle(cx, cy, r);

    // 중간 링 — 더 밝게
    g.lineStyle(2.5, COLOR_SHIELD, 0.60 + progress * 0.30);
    g.strokeCircle(cx, cy, r * 0.55);

    // 중앙 수렴 포인트 — 착지할 위치 강조
    const dotPulse = Math.sin(this.time * 12) * 0.4 + 0.6;
    g.fillStyle(COLOR_SHIELD_INNER, 0.85 * dotPulse);
    g.fillCircle(cx, cy, 7 + progress * 5);

    // 수렴선 (방사형 짧은 선 4방향)
    const spokeLen = 12 + progress * 14;
    g.lineStyle(1.5, COLOR_SHIELD_INNER, 0.5 + progress * 0.3);
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + this.time * 1.5;
      g.beginPath();
      g.moveTo(cx + Math.cos(a) * 10, cy + Math.sin(a) * 10);
      g.lineTo(cx + Math.cos(a) * (10 + spokeLen), cy + Math.sin(a) * (10 + spokeLen));
      g.strokePath();
    }
  }

  /** 빔 위를 player → cloud 방향으로 이동하는 파티클 */
  private drawPullParticles(
    g: Phaser.GameObjects.Graphics,
    x1: number, y1: number,
    x2: number, y2: number,
    progress: number,
  ): void {
    const numParticles = 7;
    for (let i = 0; i < numParticles; i++) {
      // 각 파티클은 위상 차이를 두고 player→cloud 방향으로 순환
      const phase = ((this.time * 1.4 + i / numParticles) % 1);
      const px = x1 + (x2 - x1) * phase;
      const py = y1 + (y2 - y1) * phase;

      // 여정 중간에서 가장 밝음, 양끝 페이드
      const brightness = Math.sin(phase * Math.PI);
      const alpha = brightness * (0.55 + progress * 0.35);
      const dotR  = (3 + brightness * 3) * (0.7 + progress * 0.5);

      g.fillStyle(COLOR_SHIELD, Math.max(0, alpha));
      g.fillCircle(px, py, dotR);

      // 파티클 코어 (더 밝은 흰색 포인트)
      g.fillStyle(0xffffff, Math.max(0, alpha * 0.6));
      g.fillCircle(px, py, dotR * 0.45);
    }
  }
}
