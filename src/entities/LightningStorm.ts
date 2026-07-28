import Phaser from 'phaser';
import { ObstacleType } from '@game-types/game';
import { OBSTACLE_CONFIG } from '@config/constants';

const SCREEN_W = 1080;
const SCREEN_H = 1920;

// 레이어 깊이 (HUD=20 미만, Player=10 이상)
const DEPTH_RAIN   = 15;
const DEPTH_BOLT   = 16;
const DEPTH_WARN   = 17;

type StormPhase = 'rain' | 'warning' | 'strike' | 'hit' | 'done';

interface RainDrop { x: number; y: number; len: number; speed: number; alpha: number }
interface BoltPoint { x: number; y: number }

export class LightningStorm {
  readonly obstacleType = ObstacleType.LIGHTNING_STORM;

  // ── 상태 머신 ───────────────────────────────────────────
  private phase: StormPhase = 'rain';
  private elapsed = 0;

  // ── 타겟 (WARNING 진입 시 GameScene이 주입) ─────────────
  private _targetCloudId = '';
  private _targetWorldX  = 0;
  private _targetWorldY  = 0;

  // ── 번개 경로 (STRIKE 시작 시 한 번 생성) ─────────────────
  private _boltPts: BoltPoint[] = [];

  // ── 그래픽 레이어 ────────────────────────────────────────
  private rainGfx: Phaser.GameObjects.Graphics;  // scrollFactor 0 — 화면 고정
  private warnGfx: Phaser.GameObjects.Graphics;  // scrollFactor 0 — 화면 고정
  private boltGfx: Phaser.GameObjects.Graphics;  // scrollFactor 1 — 월드 좌표

  private drops: RainDrop[];

  // ── 외부 소비 플래그 ─────────────────────────────────────
  needsTarget = false;
  isDone      = false;

  private _didHit     = false;
  private _hitCloudId = '';

  /** 이 프레임에 충돌 발생 여부 (한 번 읽으면 false 로 리셋) */
  get didHit(): boolean {
    const v = this._didHit;
    this._didHit = false;
    return v;
  }
  get hitCloudId(): string { return this._hitCloudId; }

  constructor(scene: Phaser.Scene) {
    this.rainGfx = scene.add.graphics().setDepth(DEPTH_RAIN).setScrollFactor(0);
    this.warnGfx = scene.add.graphics().setDepth(DEPTH_WARN).setScrollFactor(0);
    this.boltGfx = scene.add.graphics().setDepth(DEPTH_BOLT).setScrollFactor(1);

    this.drops = Array.from({ length: OBSTACLE_CONFIG.STORM_RAIN_DROP_COUNT }, () => ({
      x:     Math.random() * SCREEN_W,
      y:     Math.random() * SCREEN_H,
      len:   18 + Math.random() * 18,
      speed: 900 + Math.random() * 500,
      alpha: 0.35 + Math.random() * 0.4,
    }));
  }

  /** GameScene 이 WARNING 진입 직후 호출 */
  setTarget(cloudId: string, worldX: number, worldY: number): void {
    this._targetCloudId = cloudId;
    this._targetWorldX  = worldX;
    this._targetWorldY  = worldY;
    this.needsTarget    = false;
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
    this.warnGfx.destroy();
    this.boltGfx.destroy();
  }

  // ── 단계별 처리 ─────────────────────────────────────────

  private tickRain(delta: number): void {
    this.elapsed += delta;
    this.drawRain(delta, 1.0);

    if (this.elapsed >= OBSTACLE_CONFIG.STORM_RAIN_DURATION_MS) {
      this.elapsed     = 0;
      this.phase       = 'warning';
      this.needsTarget = true;
    }
  }

  private tickWarning(delta: number, cameraScrollY: number): void {
    if (this.needsTarget) return; // 타겟 주입 대기
    this.elapsed += delta;
    this.drawRain(delta, 0.9);
    this.drawWarning(cameraScrollY);

    if (this.elapsed >= OBSTACLE_CONFIG.STORM_WARNING_DURATION_MS) {
      this.generateBolt(cameraScrollY);
      this.elapsed = 0;
      this.phase   = 'strike';
      this.warnGfx.clear();
    }
  }

  private tickStrike(delta: number): void {
    this.elapsed += delta;
    this.drawRain(delta, 0.7);
    const progress = Math.min(this.elapsed / OBSTACLE_CONFIG.STORM_STRIKE_DURATION_MS, 1);
    this.drawBolt(progress);

    if (this.elapsed >= OBSTACLE_CONFIG.STORM_STRIKE_DURATION_MS) {
      this._didHit     = true;
      this._hitCloudId = this._targetCloudId;
      this.elapsed     = 0;
      this.phase       = 'hit';
      this.boltGfx.clear();
    }
  }

  private tickHit(delta: number): void {
    this.elapsed += delta;
    const t = 1 - Math.min(this.elapsed / OBSTACLE_CONFIG.STORM_HIT_DURATION_MS, 1);
    this.rainGfx.clear();
    this.warnGfx.clear();
    this.warnGfx.fillStyle(0xffffff, t * 0.75);
    this.warnGfx.fillRect(0, 0, SCREEN_W, SCREEN_H);

    if (this.elapsed >= OBSTACLE_CONFIG.STORM_HIT_DURATION_MS) {
      this.warnGfx.clear();
      this.isDone = true;
      this.phase  = 'done';
    }
  }

  // ── 드로잉 ──────────────────────────────────────────────

  private drawRain(delta: number, intensity: number): void {
    const dt = delta / 1000;
    const g  = this.rainGfx;
    g.clear();

    // 어두운 폭풍 오버레이
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
      g.moveTo(d.x - d.len * 0.1,  d.y);
      g.lineTo(d.x + d.len * 0.1,  d.y + d.len);
      g.strokePath();
    }
  }

  /**
   * 타겟 구름 위의 경고 연출 (화면 좌표 — scrollFactor 0)
   *   · 타겟 주변 맥동 링
   *   · 십자 조준선
   *   · 번개 기호
   *   · 화면 상단 균열 효과
   */
  private drawWarning(cameraScrollY: number): void {
    const g  = this.warnGfx;
    g.clear();

    // 월드 좌표 → 화면 좌표 변환 (수평 스크롤 없음)
    const sx = this._targetWorldX;
    const sy = this._targetWorldY - cameraScrollY;

    const pulse = 0.5 + 0.5 * Math.sin(this.elapsed * 0.01);

    // 맥동 링
    g.lineStyle(4, 0xff3300, 0.35 + 0.65 * pulse);
    g.strokeCircle(sx, sy, 90 + pulse * 22);
    g.lineStyle(3, 0xff8800, 0.25 + 0.55 * pulse);
    g.strokeCircle(sx, sy, 60 + pulse * 12);

    // 십자 조준선
    const arm = 100, gap = 65;
    g.lineStyle(2, 0xff5500, 0.7);
    [[sx - arm, sy, sx - gap, sy], [sx + gap, sy, sx + arm, sy],
     [sx, sy - arm, sx, sy - gap], [sx, sy + gap, sx, sy + arm]]
      .forEach(([x1, y1, x2, y2]) => {
        g.beginPath(); g.moveTo(x1!, y1!); g.lineTo(x2!, y2!); g.strokePath();
      });

    // 번개 기호 (타겟 위)
    const lx = sx, ly = sy - 130;
    const glow = 0.7 + 0.3 * Math.sin(this.elapsed * 0.015);
    g.lineStyle(5, 0xffee00, glow);
    g.beginPath();
    g.moveTo(lx - 10, ly - 28);
    g.lineTo(lx + 6,  ly);
    g.lineTo(lx - 6,  ly);
    g.lineTo(lx + 10, ly + 28);
    g.strokePath();

    // 화면 상단 균열 (120ms 마다 갱신)
    if (Math.floor(this.elapsed / 120) % 3 !== 0) {
      let cx = sx + (Math.random() - 0.5) * 60;
      let cy = 0;
      g.lineStyle(3, 0xddbfff, 0.85);
      g.beginPath();
      g.moveTo(cx, cy);
      for (let i = 0; i < 7; i++) {
        cx += (Math.random() - 0.5) * 30;
        cy += 12 + Math.random() * 10;
        g.lineTo(cx, cy);
      }
      g.strokePath();
    }
  }

  /** 번개 경로 생성 (STRIKE 진입 시 한 번만 호출) */
  private generateBolt(cameraScrollY: number): void {
    const sx   = this._targetWorldX;
    const sy   = cameraScrollY;          // 월드 Y — 화면 최상단
    const ey   = this._targetWorldY;
    const SEGS = 14;
    this._boltPts = [];

    for (let i = 0; i <= SEGS; i++) {
      const t = i / SEGS;
      const y = sy + (ey - sy) * t;
      let   x = sx;
      if (i > 0 && i < SEGS) {
        const spread = 40 * Math.sin(t * Math.PI);
        x = sx + (Math.random() - 0.5) * 2 * spread;
      }
      this._boltPts.push({ x, y });
    }
  }

  /** 번개 볼트 드로잉 (월드 좌표 — scrollFactor 1) */
  private drawBolt(progress: number): void {
    const g    = this.boltGfx;
    g.clear();

    const ptCount = Math.max(2, Math.ceil(this._boltPts.length * progress));
    const pts     = this._boltPts.slice(0, ptCount);

    // 외곽 글로우
    g.lineStyle(22, 0x4444ff, 0.12);
    this.strokePts(g, pts);
    // 중간 글로우
    g.lineStyle(10, 0x9999ff, 0.4);
    this.strokePts(g, pts);
    // 내부
    g.lineStyle(5, 0xccccff, 0.85);
    this.strokePts(g, pts);
    // 코어
    g.lineStyle(2.5, 0xffffff, 1.0);
    this.strokePts(g, pts);

    // 끝점 충격 플래시
    if (progress > 0.85) {
      const fa  = (progress - 0.85) / 0.15;
      const tip = pts[pts.length - 1]!;
      g.fillStyle(0xffffff, fa * 0.9);
      g.fillCircle(tip.x, tip.y, 35 * fa);
      g.lineStyle(3, 0xffffff, fa);
      g.strokeCircle(tip.x, tip.y, 55 * fa);
    }
  }

  private strokePts(g: Phaser.GameObjects.Graphics, pts: BoltPoint[]): void {
    if (pts.length < 2) return;
    g.beginPath();
    g.moveTo(pts[0]!.x, pts[0]!.y);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i]!.x, pts[i]!.y);
    g.strokePath();
  }
}
