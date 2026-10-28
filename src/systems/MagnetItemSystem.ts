import Phaser from 'phaser';
import type { CloudIsland } from '@entities/CloudIsland';
import { DEPTH, ITEM_CONFIG } from '@config/constants';

export class MagnetItemSystem {
  private scene: Phaser.Scene;

  private attachedCloud: CloudIsland | null = null;
  private magnetImage: Phaser.GameObjects.Image | null = null;
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
    if (!this.magnetActive || !this.magnetImage || !this.attachedCloud) return;

    if (this.attachedCloud.isFalling) {
      this.removeMagnet();
      return;
    }

    this.floatTime += delta / 1000;
    const floatOffset = Math.sin(this.floatTime * Math.PI * 1.3) * 9;

    this.magnetImage.setPosition(
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

  get attachedCloudId(): string | null { return this.attachedCloud?.id ?? null; }

  clearAll(): void {
    this.removeMagnet();
  }

  // ─── private ───────────────────────────────────────────

  private attachToCloud(cloud: CloudIsland): void {
    this.attachedCloud = cloud;
    this.magnetActive = true;
    this.floatTime = 0;

    this.magnetImage = this.scene.add.image(cloud.x, cloud.topY - ITEM_CONFIG.MAGNET_ITEM_HOVER_Y, 'item_magnet')
      .setDisplaySize(120, 120)
      .setDepth(DEPTH.ITEM);
  }

  private removeMagnet(): void {
    this.magnetActive = false;
    this.attachedCloud = null;
    this.magnetImage?.destroy();
    this.magnetImage = null;
  }

  private scheduleNext(): void {
    const interval = Phaser.Math.Between(
      ITEM_CONFIG.MAGNET_ITEM_SPAWN_MIN,
      ITEM_CONFIG.MAGNET_ITEM_SPAWN_MAX,
    );
    this.nextSpawnAt = this.p1CloudCount + interval;
  }

}
