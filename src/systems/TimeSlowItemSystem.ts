import Phaser from 'phaser';
import type { CloudIsland } from '@entities/CloudIsland';
import { DEPTH, ITEM_CONFIG } from '@config/constants';

export class TimeSlowItemSystem {
  private scene: Phaser.Scene;

  private attachedCloud: CloudIsland | null = null;
  private itemImage: Phaser.GameObjects.Image | null = null;
  private itemActive: boolean = false;
  private floatTime: number = 0;

  private p1CloudCount: number = 0;
  private nextSpawnAt: number;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.nextSpawnAt = 4; // 첫 등장은 4번째 구름, 이후 scheduleNext()로 5~10 간격
  }

  get attachedCloudId(): string | null { return this.attachedCloud?.id ?? null; }

  /**
   * 패턴1 구름이 스폰될 때 호출.
   * 별·자석·얼음과 같은 구름이면 1칸 뒤로 미룬다.
   */
  onPattern1CloudSpawned(
    cloud: CloudIsland,
    starCloudId: string | null,
    magnetCloudId: string | null,
    iceCloudId: string | null,
  ): void {
    this.p1CloudCount++;
    if (this.itemActive || this.p1CloudCount < this.nextSpawnAt) return;

    if (
      cloud.id === starCloudId ||
      cloud.id === magnetCloudId ||
      cloud.id === iceCloudId
    ) {
      this.nextSpawnAt = this.p1CloudCount + 1;
      return;
    }

    this.attachToCloud(cloud);
    this.scheduleNext();
  }

  /** 매 프레임 — 구름과 함께 이동 + 부유 애니메이션 */
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
      this.attachedCloud.topY - ITEM_CONFIG.TIME_SLOW_ITEM_HOVER_Y + floatOffset,
    );

    if (this.attachedCloud.y > cameraScrollY + 2100) {
      this.removeItem();
    }
  }

  /**
   * 플레이어가 구름에 착지했을 때 호출.
   * 해당 구름에 타임슬로우 아이템이 있으면 수집 처리 후 true 반환.
   */
  checkLanding(cloud: CloudIsland): boolean {
    if (!this.itemActive || this.attachedCloud?.id !== cloud.id) return false;
    this.removeItem();
    return true;
  }

  /** 구름이 디스폰 제거될 때 호출 */
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

    this.itemImage = this.scene.add.image(cloud.x, cloud.topY - ITEM_CONFIG.TIME_SLOW_ITEM_HOVER_Y, 'item_time_slow')
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
    const interval = Phaser.Math.Between(
      ITEM_CONFIG.TIME_SLOW_ITEM_SPAWN_MIN,
      ITEM_CONFIG.TIME_SLOW_ITEM_SPAWN_MAX,
    );
    this.nextSpawnAt = this.p1CloudCount + interval;
  }

}

