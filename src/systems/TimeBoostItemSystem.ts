import Phaser from 'phaser';
import type { CloudIsland } from '@entities/CloudIsland';
import { DEPTH, ITEM_CONFIG } from '@config/constants';

export class TimeBoostItemSystem {
  private scene: Phaser.Scene;
  private itemRateMultiplier: number;

  private attachedCloud: CloudIsland | null = null;
  private itemImage: Phaser.GameObjects.Image | null = null;
  private itemActive: boolean = false;
  private floatTime: number = 0;

  private p1CloudCount: number = 0;
  private nextSpawnAt: number;

  constructor(scene: Phaser.Scene, itemRateMultiplier: number = 1) {
    this.scene = scene;
    this.itemRateMultiplier = itemRateMultiplier;
    this.nextSpawnAt = Math.round(3 * this.itemRateMultiplier);
  }

  get attachedCloudId(): string | null { return this.attachedCloud?.id ?? null; }

  onPattern1CloudSpawned(
    cloud: CloudIsland,
    starCloudId: string | null,
    magnetCloudId: string | null,
    iceCloudId: string | null,
    slowCloudId: string | null,
  ): void {
    this.p1CloudCount++;
    if (this.itemActive || this.p1CloudCount < this.nextSpawnAt) return;

    if (
      cloud.id === starCloudId ||
      cloud.id === magnetCloudId ||
      cloud.id === iceCloudId ||
      cloud.id === slowCloudId
    ) {
      this.nextSpawnAt = this.p1CloudCount + 1;
      return;
    }

    this.attachToCloud(cloud);
    this.scheduleNext();
  }

  update(delta: number, cameraScrollY: number): void {
    if (!this.itemActive || !this.itemImage || !this.attachedCloud) return;

    if (this.attachedCloud.isFalling) {
      this.removeItem();
      return;
    }

    this.floatTime += delta / 1000;
    const floatOffset = Math.sin(this.floatTime * Math.PI * 1.1) * 8;

    this.itemImage.setPosition(
      this.attachedCloud.x,
      this.attachedCloud.topY - ITEM_CONFIG.TIME_BOOST_ITEM_HOVER_Y + floatOffset,
    );

    if (this.attachedCloud.y > cameraScrollY + 2100) {
      this.removeItem();
    }
  }

  checkLanding(cloud: CloudIsland): boolean {
    if (!this.itemActive || this.attachedCloud?.id !== cloud.id) return false;
    this.removeItem();
    return true;
  }

  onCloudRemoved(cloud: CloudIsland): void {
    if (this.attachedCloud?.id === cloud.id) {
      this.removeItem();
    }
  }

  clearAll(): void {
    this.removeItem();
  }

  // ─── private ───────────────────────────────────────────

  private attachToCloud(cloud: CloudIsland): void {
    this.attachedCloud = cloud;
    this.itemActive = true;
    this.floatTime = 0;

    this.itemImage = this.scene.add.image(cloud.x, cloud.topY - ITEM_CONFIG.TIME_BOOST_ITEM_HOVER_Y, 'item_time_boost')
      .setDisplaySize(120, 120)
      .setDepth(DEPTH.ITEM);
  }

  private removeItem(): void {
    this.itemActive = false;
    this.attachedCloud = null;
    this.itemImage?.destroy();
    this.itemImage = null;
  }

  private scheduleNext(): void {
    const interval = Math.round(Phaser.Math.Between(
      ITEM_CONFIG.TIME_BOOST_ITEM_SPAWN_MIN,
      ITEM_CONFIG.TIME_BOOST_ITEM_SPAWN_MAX,
    ) * this.itemRateMultiplier);
    this.nextSpawnAt = this.p1CloudCount + Math.max(1, interval);
  }
}
