import Phaser from 'phaser';
import { ObstacleType } from '@game-types/game';
import { OBSTACLE_CONFIG } from '@config/constants';

const SCREEN_W = 1080;
const SCREEN_H = 1920;

const DEPTH_RAIN   = 15;
const DEPTH_SPRITE = 16;
const DEPTH_FLASH  = 17;
const DEPTH_IMPACT = 18;

// 먹구름 표시 크기 (원본 1709×920)
const CLOUD_W = 520;
const CLOUD_H = Math.round(CLOUD_W * (920 / 1709)); // ≈ 280

// 번개 볼트 시각 너비 (볼트 이미지는 landscape 2048×768, -90° 회전 후 표시)
const BOLT_VISUAL_W = 190;

// 경고 아이콘 크기 (원본 1254×1254)
const WARN_ICON_SIZE = 120;

// 충격 이펙트 표시 크기 (원본 ~2172×724)
const IMPACT_W = 500;
const IMPACT_H = Math.round(IMPACT_W * (724 / 2172)); // ≈ 167

// 애니메이션 인터벌
const CLOUD_FLASH_MS  = 300;
const BOLT_FRAME_MS   = 70;
const IMPACT_FRAME_MS = [180, 300, 320] as const; // 3프레임 각 지속 ms

type StormPhase = 'rain' | 'warning' | 'strike' | 'hit' | 'done';
interface RainDrop { x: number; y: number; len: number; speed: number; alpha: number }

export class LightningStorm {
  readonly obstacleType = ObstacleType.LIGHTNING_STORM;

  private phase:   StormPhase = 'rain';
  private elapsed = 0;

  private _targetCloudId = '';
  private _targetWorldX  = 0;
  private _targetWorldY  = 0;

  // ── 그래픽 (비 + 화면 플래시) ───────────────────────────
  private rainGfx:  Phaser.GameObjects.Graphics;
  private flashGfx: Phaser.GameObjects.Graphics;

  // ── 스프라이트 ───────────────────────────────────────────
  private thunderCloudImg: Phaser.GameObjects.Image | null = null;
  private warnIconImg:     Phaser.GameObjects.Image | null = null;
  private boltImg:         Phaser.GameObjects.Image | null = null;
  private impactImg:       Phaser.GameObjects.Image | null = null;

  // ── 애니메이션 타이머 ────────────────────────────────────
  private cloudFlashTimer    = 0;
  private cloudFlashFrame    = 1;
  private boltFrameTimer     = 0;
  private boltFrame          = 1;
  private impactFrameIdx     = 0;
  private impactFrameElapsed = 0;

  private drops: RainDrop[];

  needsTarget = false;
  isDone      = false;

  private _didHit     = false;
  private _hitCloudId = '';

  get didHit(): boolean { const v = this._didHit; this._didHit = false; return v; }
  get hitCloudId(): string { return this._hitCloudId; }

  constructor(private scene: Phaser.Scene) {
    this.rainGfx  = scene.add.graphics().setDepth(DEPTH_RAIN).setScrollFactor(0);
    this.flashGfx = scene.add.graphics().setDepth(DEPTH_FLASH).setScrollFactor(0);

    this.drops = Array.from({ length: OBSTACLE_CONFIG.STORM_RAIN_DROP_COUNT }, () => ({
      x: Math.random() * SCREEN_W, y: Math.random() * SCREEN_H,
      len: 18 + Math.random() * 18, speed: 900 + Math.random() * 500,
      alpha: 0.35 + Math.random() * 0.4,
    }));
  }

  setTarget(cloudId: string, worldX: number, worldY: number): void {
    this._targetCloudId = cloudId;
    this._targetWorldX  = worldX;
    this._targetWorldY  = worldY;
    this.needsTarget    = false;
    this.spawnWarningVisuals();
  }

  update(delta: number, cameraScrollY: number): void {
    switch (this.phase) {
      case 'rain':    this.tickRain(delta);                    break;
      case 'warning': this.tickWarning(delta, cameraScrollY); break;
      case 'strike':  this.tickStrike(delta);                  break;
      case 'hit':     this.tickHit(delta);                     break;
    }
  }

  destroy(): void {
    this.rainGfx.destroy();
    this.flashGfx.destroy();
    this.thunderCloudImg?.destroy();
    this.warnIconImg?.destroy();
    this.boltImg?.destroy();
    this.impactImg?.destroy();
  }

  // ── 단계별 처리 ─────────────────────────────────────────

  private tickRain(delta: number): void {
    this.elapsed += delta;
    this.drawRain(delta, 1.0);

    if (this.elapsed >= OBSTACLE_CONFIG.STORM_RAIN_DURATION_MS) {
      this.elapsed = 0; this.phase = 'warning'; this.needsTarget = true;
    }
  }

  private tickWarning(delta: number, cameraScrollY: number): void {
    if (this.needsTarget) return;
    this.elapsed += delta;
    this.drawRain(delta, 0.9);
    this.updateCloudFlash(delta);
    this.updateWarnIconPulse();

    if (this.elapsed >= OBSTACLE_CONFIG.STORM_WARNING_DURATION_MS) {
      this.destroyWarningVisuals();
      this.spawnBolt(cameraScrollY);
      this.elapsed = 0;
      this.phase   = 'strike';
    }
  }

  private tickStrike(delta: number): void {
    this.elapsed += delta;
    this.drawRain(delta, 0.7);
    this.updateBoltFrame(delta);
    this.updateCloudFlash(delta);

    if (this.elapsed >= OBSTACLE_CONFIG.STORM_STRIKE_DURATION_MS) {
      this._didHit     = true;
      this._hitCloudId = this._targetCloudId;
      this.boltImg?.destroy(); this.boltImg = null;
      this.spawnImpact();
      this.elapsed = 0;
      this.phase   = 'hit';
    }
  }

  private tickHit(delta: number): void {
    this.elapsed += delta;
    const t = 1 - Math.min(this.elapsed / OBSTACLE_CONFIG.STORM_HIT_DURATION_MS, 1);
    this.rainGfx.clear();
    this.flashGfx.clear();
    this.flashGfx.fillStyle(0xffffff, t * 0.75);
    this.flashGfx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    this.updateImpactFrame(delta);

    if (this.elapsed >= OBSTACLE_CONFIG.STORM_HIT_DURATION_MS) {
      this.flashGfx.clear();
      this.impactImg?.destroy();      this.impactImg      = null;
      this.thunderCloudImg?.destroy(); this.thunderCloudImg = null;
      this.isDone = true; this.phase = 'done';
    }
  }

  // ── 스프라이트 생성/파괴 ─────────────────────────────────

  private spawnWarningVisuals(): void {
    const x = this._targetWorldX;
    const y = this._targetWorldY;

    // 먹구름 — 화면 상단, X는 타겟 구름과 동일 (수평 스크롤 없으므로 world X = screen X)
    this.thunderCloudImg = this.scene.add.image(x, CLOUD_H / 2 + 10, 'thunder_cloud_01')
      .setDisplaySize(CLOUD_W, CLOUD_H)
      .setDepth(DEPTH_SPRITE)
      .setScrollFactor(0);

    // 경고 아이콘 — 타겟 구름 바로 위 (world 좌표, 어느 구름이 타겟인지 표시)
    this.warnIconImg = this.scene.add.image(x, y - WARN_ICON_SIZE / 2 - 20, 'lightning_warning_icon')
      .setDisplaySize(WARN_ICON_SIZE, WARN_ICON_SIZE)
      .setDepth(DEPTH_SPRITE + 1)
      .setScrollFactor(1);
  }

  private destroyWarningVisuals(): void {
    // 경고 아이콘만 제거 — 먹구름은 strike 내내 유지하다 hit 종료 시 일괄 삭제
    this.warnIconImg?.destroy(); this.warnIconImg = null;
  }

  private spawnBolt(cameraScrollY: number): void {
    const boltStartY = cameraScrollY;
    const distance   = this._targetWorldY - boltStartY;
    const centerY    = boltStartY + distance / 2;

    // 볼트 이미지: landscape 2048×768, 세로 볼트가 높이 방향으로 그려져 있음
    // 회전 없이 setDisplaySize(BOLT_VISUAL_W, distance) 로 세로 표시
    this.boltImg = this.scene.add.image(this._targetWorldX, centerY, 'lightning_bolt_01')
      .setDisplaySize(BOLT_VISUAL_W, distance)
      .setDepth(DEPTH_SPRITE)
      .setScrollFactor(1);

    this.boltFrame      = 1;
    this.boltFrameTimer = 0;
  }

  private spawnImpact(): void {
    this.impactImg = this.scene.add.image(
      this._targetWorldX, this._targetWorldY,
      'lightning_impact_01',
    )
      .setDisplaySize(IMPACT_W, IMPACT_H)
      .setDepth(DEPTH_IMPACT)
      .setScrollFactor(1);

    this.impactFrameIdx     = 0;
    this.impactFrameElapsed = 0;
  }

  // ── 애니메이션 업데이트 ──────────────────────────────────

  private updateCloudFlash(delta: number): void {
    if (!this.thunderCloudImg) return;
    this.cloudFlashTimer += delta;
    if (this.cloudFlashTimer >= CLOUD_FLASH_MS) {
      this.cloudFlashTimer = 0;
      this.cloudFlashFrame = this.cloudFlashFrame === 1 ? 2 : 1;
      this.thunderCloudImg.setTexture(`thunder_cloud_0${this.cloudFlashFrame}`);
    }
  }

  private updateWarnIconPulse(): void {
    if (!this.warnIconImg) return;
    const pulse = 0.55 + 0.45 * Math.sin(this.elapsed * 0.01);
    this.warnIconImg.setAlpha(pulse);
  }

  private updateBoltFrame(delta: number): void {
    if (!this.boltImg) return;
    this.boltFrameTimer += delta;
    if (this.boltFrameTimer >= BOLT_FRAME_MS) {
      this.boltFrameTimer = 0;
      this.boltFrame      = (this.boltFrame % 4) + 1;
      this.boltImg.setTexture(`lightning_bolt_0${this.boltFrame}`);
    }
  }

  private updateImpactFrame(delta: number): void {
    if (!this.impactImg || this.impactFrameIdx >= IMPACT_FRAME_MS.length) return;
    this.impactFrameElapsed += delta;
    if (this.impactFrameElapsed >= IMPACT_FRAME_MS[this.impactFrameIdx]!) {
      this.impactFrameElapsed = 0;
      this.impactFrameIdx++;
      if (this.impactFrameIdx < IMPACT_FRAME_MS.length) {
        this.impactImg.setTexture(`lightning_impact_0${this.impactFrameIdx + 1}`);
      } else {
        this.impactImg.destroy();
        this.impactImg = null;
      }
    }
  }

  // ── 비 드로잉 ────────────────────────────────────────────

  private drawRain(delta: number, intensity: number): void {
    const dt = delta / 1000;
    const g  = this.rainGfx;
    g.clear();

    g.fillStyle(0x000d33, 0.32 * intensity);
    g.fillRect(0, 0, SCREEN_W, SCREEN_H);

    for (const d of this.drops) {
      d.y += d.speed * dt;
      if (d.y > SCREEN_H + d.len) {
        d.y = -d.len - Math.random() * 150;
        d.x = Math.random() * SCREEN_W;
      }
      g.lineStyle(1.5, 0x88bbff, d.alpha * intensity);
      g.beginPath();
      g.moveTo(d.x - d.len * 0.1, d.y);
      g.lineTo(d.x + d.len * 0.1, d.y + d.len);
      g.strokePath();
    }
  }
}
