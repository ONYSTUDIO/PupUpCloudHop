import Phaser from 'phaser';
import type { CloudIsland } from '@entities/CloudIsland';
import { DEPTH, ITEM_CONFIG } from '@config/constants';

export class IceItemSystem {
  private scene: Phaser.Scene;

  private attachedCloud: CloudIsland | null = null;
  private iceGraphics: Phaser.GameObjects.Graphics | null = null;
  private iceActive: boolean = false;
  private floatTime: number = 0;

  private p1CloudCount: number = 0;
  private nextSpawnAt: number;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.nextSpawnAt = 3; // 첫 등장은 3번째 구름, 이후 scheduleNext()로 4~9 간격
  }

  get attachedCloudId(): string | null { return this.attachedCloud?.id ?? null; }

  /**
   * 패턴1 구름이 스폰될 때 호출.
   * 별·자석과 같은 구름이면 1칸 뒤로 미룬다.
   */
  onPattern1CloudSpawned(
    cloud: CloudIsland,
    starCloudId: string | null,
    magnetCloudId: string | null,
  ): void {
    this.p1CloudCount++;
    if (this.iceActive || this.p1CloudCount < this.nextSpawnAt) return;

    if (cloud.id === starCloudId || cloud.id === magnetCloudId) {
      this.nextSpawnAt = this.p1CloudCount + 1;
      return;
    }

    this.attachToCloud(cloud);
    this.scheduleNext();
  }

  /** 매 프레임 — 구름과 함께 이동 + 부유 애니메이션 */
  update(delta: number, cameraScrollY: number): void {
    if (!this.iceActive || !this.iceGraphics || !this.attachedCloud) return;

    if (this.attachedCloud.isFalling) {
      this.removeIce();
      return;
    }

    this.floatTime += delta / 1000;
    const floatOffset = Math.sin(this.floatTime * Math.PI * 1.2) * 8;

    this.iceGraphics.setPosition(
      this.attachedCloud.x,
      this.attachedCloud.topY - ITEM_CONFIG.ICE_ITEM_HOVER_Y + floatOffset,
    );

    if (this.attachedCloud.y > cameraScrollY + 2100) {
      this.removeIce();
    }
  }

  /**
   * 플레이어가 구름에 착지했을 때 호출.
   * 해당 구름에 얼음이 있으면 수집 처리 후 true 반환.
   */
  checkLanding(cloud: CloudIsland): boolean {
    if (!this.iceActive || this.attachedCloud?.id !== cloud.id) return false;
    this.removeIce();
    return true;
  }

  /** 구름이 디스폰 제거될 때 호출 */
  onCloudRemoved(cloud: CloudIsland): void {
    if (this.attachedCloud?.id === cloud.id) {
      this.removeIce();
    }
  }

  clearAll(): void {
    this.removeIce();
  }

  // ─── private ───────────────────────────────────────────

  private attachToCloud(cloud: CloudIsland): void {
    this.attachedCloud = cloud;
    this.iceActive = true;
    this.floatTime = 0;

    this.iceGraphics = this.scene.add.graphics().setDepth(DEPTH.ITEM);
    this.drawIceShape(this.iceGraphics);
  }

  private removeIce(): void {
    this.iceActive = false;
    this.attachedCloud = null;
    this.iceGraphics?.destroy();
    this.iceGraphics = null;
  }

  private scheduleNext(): void {
    const interval = Phaser.Math.Between(
      ITEM_CONFIG.ICE_ITEM_SPAWN_MIN,
      ITEM_CONFIG.ICE_ITEM_SPAWN_MAX,
    );
    this.nextSpawnAt = this.p1CloudCount + interval;
  }

  // ─── 얼음 눈송이 아이콘 드로잉 ─────────────────────────────

  private drawIceShape(g: Phaser.GameObjects.Graphics): void {
    const R = 26;

    // 외곽 글로우
    g.fillStyle(0xaaddff, 0.15);
    g.fillCircle(0, 0, R + 18);

    // 내부 글로우
    g.fillStyle(0x66bbff, 0.22);
    g.fillCircle(0, 0, R + 8);

    // 눈송이 6각 가지
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const ex = Math.cos(angle) * R;
      const ey = Math.sin(angle) * R;

      // 메인 가지
      g.lineStyle(5, 0x88ccff, 1);
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(ex, ey);
      g.strokePath();

      // 가지에서 뻗는 2개 분기
      for (const side of [-1, 1]) {
        const branchAngle = angle + (side * Math.PI) / 3;
        const bLen = R * 0.38;
        const midX = ex * 0.55;
        const midY = ey * 0.55;
        const bx = midX + Math.cos(branchAngle) * bLen;
        const by = midY + Math.sin(branchAngle) * bLen;

        g.lineStyle(2.5, 0xbbddff, 0.9);
        g.beginPath();
        g.moveTo(midX, midY);
        g.lineTo(bx, by);
        g.strokePath();
      }

      // 가지 끝 포인트
      g.fillStyle(0xffffff, 0.9);
      g.fillCircle(ex, ey, 3.5);
    }

    // 중심 원
    g.fillStyle(0xffffff, 1);
    g.fillCircle(0, 0, 7);
    g.fillStyle(0x66aaff, 1);
    g.fillCircle(0, 0, 4.5);

    // 하이라이트
    g.fillStyle(0xffffff, 0.6);
    g.fillEllipse(-3, -3, 5, 3);
  }
}
