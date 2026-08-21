import Phaser from 'phaser';
import type { CloudIsland } from '@entities/CloudIsland';
import { DEPTH, ITEM_CONFIG } from '@config/constants';

export class MagnetItemSystem {
  private scene: Phaser.Scene;

  private attachedCloud: CloudIsland | null = null;
  private magnetGraphics: Phaser.GameObjects.Graphics | null = null;
  private magnetActive: boolean = false;
  private floatTime: number = 0;

  private p1CloudCount: number = 0;
  private nextSpawnAt: number;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.nextSpawnAt = Phaser.Math.Between(
      ITEM_CONFIG.MAGNET_ITEM_SPAWN_MIN,
      ITEM_CONFIG.MAGNET_ITEM_SPAWN_MAX,
    );
  }

  /**
   * 패턴1 구름이 스폰될 때 호출.
   * starCloudId 와 같은 구름이면 다음 간격으로 미룬다.
   */
  onPattern1CloudSpawned(cloud: CloudIsland, starCloudId: string | null): void {
    this.p1CloudCount++;
    if (this.magnetActive || this.p1CloudCount < this.nextSpawnAt) return;

    if (cloud.id === starCloudId) {
      // 별 아이템과 겹침 → 1칸 뒤로
      this.nextSpawnAt = this.p1CloudCount + 1;
      return;
    }

    this.attachToCloud(cloud);
    this.scheduleNext();
  }

  /** 매 프레임 — 구름과 함께 이동 + 부유 애니메이션 */
  update(delta: number, cameraScrollY: number): void {
    if (!this.magnetActive || !this.magnetGraphics || !this.attachedCloud) return;

    if (this.attachedCloud.isFalling) {
      this.removeMagnet();
      return;
    }

    this.floatTime += delta / 1000;
    const floatOffset = Math.sin(this.floatTime * Math.PI * 1.3) * 9;

    this.magnetGraphics.setPosition(
      this.attachedCloud.x,
      this.attachedCloud.topY - ITEM_CONFIG.MAGNET_ITEM_HOVER_Y + floatOffset,
    );

    if (this.attachedCloud.y > cameraScrollY + 2100) {
      this.removeMagnet();
    }
  }

  /**
   * 플레이어가 구름에 착지했을 때 호출.
   * 해당 구름에 자석이 있으면 수집 처리 후 true 반환.
   */
  checkLanding(cloud: CloudIsland): boolean {
    if (!this.magnetActive || this.attachedCloud?.id !== cloud.id) return false;
    this.removeMagnet();
    return true;
  }

  /** 구름이 디스폰 제거될 때 호출 */
  onCloudRemoved(cloud: CloudIsland): void {
    if (this.attachedCloud?.id === cloud.id) {
      this.removeMagnet();
    }
  }

  clearAll(): void {
    this.removeMagnet();
  }

  // ─── private ───────────────────────────────────────────

  private attachToCloud(cloud: CloudIsland): void {
    this.attachedCloud = cloud;
    this.magnetActive = true;
    this.floatTime = 0;

    this.magnetGraphics = this.scene.add.graphics().setDepth(DEPTH.ITEM);
    this.drawMagnetShape(this.magnetGraphics);
  }

  private removeMagnet(): void {
    this.magnetActive = false;
    this.attachedCloud = null;
    this.magnetGraphics?.destroy();
    this.magnetGraphics = null;
  }

  private scheduleNext(): void {
    const interval = Phaser.Math.Between(
      ITEM_CONFIG.MAGNET_ITEM_SPAWN_MIN,
      ITEM_CONFIG.MAGNET_ITEM_SPAWN_MAX,
    );
    this.nextSpawnAt = this.p1CloudCount + interval;
  }

  // ─── 자석 아이콘 드로잉 ───────────────────────────────────

  private drawMagnetShape(g: Phaser.GameObjects.Graphics): void {
    const outerR  = 22;
    const armW    = 12;
    const midR    = outerR - armW / 2;  // 호 스트로크 중심 반지름
    const poleLen = 19;
    const oy      = 5;                  // 전체 도형을 살짝 아래로 (시각적 중심 맞춤)

    // ── 외곽 글로우 ─────────────────────────────────────────
    g.fillStyle(0x00ff88, 0.15);
    g.fillCircle(0, oy - midR * 0.5, outerR + 15);

    // ── 말굽 호 본체 (∩ 모양, 위쪽이 둥근 U) ─────────────────
    // arc(cx, cy, r, startAngle, endAngle, anticlockwise=false)
    // clockwise from π to 0 = 왼쪽→위→오른쪽 = 위쪽 반원 ✓
    g.lineStyle(armW, 0x00bb55, 1);
    g.beginPath();
    g.arc(0, oy, midR, Math.PI, 0, false);
    g.strokePath();

    // ── 왼쪽 팔 ──────────────────────────────────────────────
    g.fillStyle(0x00bb55, 1);
    g.fillRect(-outerR, oy - 1, armW, poleLen + 1);

    // ── 오른쪽 팔 ────────────────────────────────────────────
    g.fillRect(outerR - armW, oy - 1, armW, poleLen + 1);

    // ── 왼쪽 극 팁 (N — 빨강) ────────────────────────────────
    g.fillStyle(0xff3344, 1);
    g.fillRect(-outerR, oy + poleLen - 6, armW, 7);

    // ── 오른쪽 극 팁 (S — 파랑) ─────────────────────────────
    g.fillStyle(0x2255ee, 1);
    g.fillRect(outerR - armW, oy + poleLen - 6, armW, 7);

    // ── 호 하이라이트 ────────────────────────────────────────
    g.lineStyle(2, 0x88ffcc, 0.55);
    g.beginPath();
    g.arc(0, oy, midR - 3, Math.PI * 1.12, Math.PI * 0.05, false);
    g.strokePath();

    // ── 반짝이 포인트 ────────────────────────────────────────
    g.fillStyle(0xffffff, 0.40);
    g.fillCircle(-5, oy - midR * 0.65, 3.5);

    // ── N / S 극 레이블 (작은 텍스트 대신 흰 선으로 표현) ────
    // N: 왼쪽 팁 중앙에 수직선
    g.lineStyle(2, 0xffffff, 0.7);
    g.beginPath();
    g.moveTo(-outerR + armW / 2 - 3, oy + poleLen - 5);
    g.lineTo(-outerR + armW / 2 - 3, oy + poleLen + 0);
    g.moveTo(-outerR + armW / 2 - 3, oy + poleLen - 5);
    g.lineTo(-outerR + armW / 2 + 3, oy + poleLen + 0);
    g.moveTo(-outerR + armW / 2 + 3, oy + poleLen - 5);
    g.lineTo(-outerR + armW / 2 + 3, oy + poleLen + 0);
    g.strokePath();

    // S: 오른쪽 팁 (작은 S 커브 느낌 — 두 수평선)
    g.lineStyle(2, 0xffffff, 0.7);
    g.beginPath();
    g.moveTo(outerR - armW + 2, oy + poleLen - 5);
    g.lineTo(outerR - 2, oy + poleLen - 5);
    g.moveTo(outerR - armW + 2, oy + poleLen);
    g.lineTo(outerR - 2, oy + poleLen);
    g.strokePath();
  }
}
