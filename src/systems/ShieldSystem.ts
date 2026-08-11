import Phaser from 'phaser';
import { DEPTH } from '@config/constants';

const SHIELD_RADIUS = 68;
const POP_DURATION = 0.32; // 소멸 연출 길이 (초)

export class ShieldSystem {
  private scene: Phaser.Scene;
  private shieldGraphics: Phaser.GameObjects.Graphics | null = null;
  private _isActive: boolean = false;
  private time: number = 0;

  // 소멸 연출 상태
  private popping: boolean = false;
  private popTime: number = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  get isActive(): boolean { return this._isActive; }

  activate(): void {
    if (this._isActive) return;
    this._isActive = true;
    this.popping = false;
    this.popTime = 0;
    this.time = 0;
    this.shieldGraphics = this.scene.add.graphics().setDepth(DEPTH.PLAYER - 1);
  }

  /** 매 프레임: 플레이어 위치를 따라 이동 + 펄스 애니메이션 */
  update(delta: number, playerX: number, playerY: number): void {
    if (!this.shieldGraphics) return;

    if (this.popping) {
      this.popTime += delta / 1000;
      const t = Math.min(this.popTime / POP_DURATION, 1);
      this.drawPop(playerX, playerY, t);
      if (t >= 1) {
        this.shieldGraphics.destroy();
        this.shieldGraphics = null;
        this.popping = false;
      }
      return;
    }

    if (!this._isActive) return;

    this.time += delta / 1000;
    this.drawShield(playerX, playerY);
  }

  /** 번개 충돌 시 방어막 1회 소멸 — true 반환 시 피해 무효화 */
  consume(): boolean {
    if (!this._isActive) return false;
    this._isActive = false;
    this.popping = true;
    this.popTime = 0;
    return true;
  }

  clearAll(): void {
    this._isActive = false;
    this.popping = false;
    this.shieldGraphics?.destroy();
    this.shieldGraphics = null;
  }

  // ─── private ───────────────────────────────────────────

  private drawShield(cx: number, cy: number): void {
    const g = this.shieldGraphics!;
    g.clear();
    g.setPosition(cx, cy);

    const pulse = Math.sin(this.time * Math.PI * 1.1) * 0.06; // ±6% 크기 맥동
    const r = SHIELD_RADIUS * (1 + pulse);

    // 외곽 글로우
    g.fillStyle(0x88ddff, 0.12);
    g.fillCircle(0, 0, r + 18);

    // 비눗방울 본체 — 여러 반투명 레이어
    g.fillStyle(0xaaeeff, 0.10);
    g.fillCircle(0, 0, r);

    g.lineStyle(3, 0xccf4ff, 0.70);
    g.strokeCircle(0, 0, r);

    g.lineStyle(1.5, 0xffffff, 0.45);
    g.strokeCircle(0, 0, r - 5);

    // 무지갯빛 테두리 (세그먼트별 색상)
    const colors = [0xff88cc, 0xffcc44, 0x88ffcc, 0x66aaff, 0xcc88ff];
    for (let i = 0; i < colors.length; i++) {
      const startA = (i / colors.length) * Math.PI * 2 + this.time * 0.4;
      const endA   = startA + (Math.PI * 2) / colors.length;
      g.lineStyle(2.5, colors[i]!, 0.45);
      g.beginPath();
      g.arc(0, 0, r + 1, startA, endA, false);
      g.strokePath();
    }

    // 하이라이트 (좌상단 반사)
    g.fillStyle(0xffffff, 0.35);
    g.fillEllipse(-r * 0.28, -r * 0.30, r * 0.38, r * 0.22);

    // 작은 보조 하이라이트
    g.fillStyle(0xffffff, 0.18);
    g.fillEllipse(r * 0.30, -r * 0.45, r * 0.18, r * 0.10);
  }

  private drawPop(cx: number, cy: number, t: number): void {
    const g = this.shieldGraphics!;
    g.clear();
    g.setPosition(cx, cy);

    // 원이 빠르게 확장되며 사라짐
    const r = SHIELD_RADIUS * (1 + t * 0.6);
    const alpha = (1 - t) * 0.7;

    g.lineStyle(3, 0xccf4ff, alpha);
    g.strokeCircle(0, 0, r);

    // 작은 기포 파편들
    const fragCount = 8;
    for (let i = 0; i < fragCount; i++) {
      const angle = (i / fragCount) * Math.PI * 2;
      const dist  = SHIELD_RADIUS * (0.9 + t * 1.2);
      const fx    = Math.cos(angle) * dist;
      const fy    = Math.sin(angle) * dist;
      const fr    = 7 * (1 - t);
      g.fillStyle(0x88eeff, alpha * 0.9);
      g.fillCircle(fx, fy, Math.max(fr, 0));
    }
  }
}
