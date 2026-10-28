import Phaser from 'phaser';
import type { CloudIsland } from '@entities/CloudIsland';
import { DEPTH, ITEM_CONFIG } from '@config/constants';

export class IceItemSystem {
  private scene: Phaser.Scene;

  private attachedCloud: CloudIsland | null = null;
  private iceImage: Phaser.GameObjects.Image | null = null;
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
    if (!this.iceActive || !this.iceImage || !this.attachedCloud) return;

    if (this.attachedCloud.isFalling) {
      this.removeIce();
      return;
    }

    this.floatTime += delta / 1000;
    const floatOffset = Math.sin(this.floatTime * Math.PI * 1.2) * 8;

    this.iceImage.setPosition(
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

    this.iceImage = this.scene.add.image(cloud.x, cloud.topY - ITEM_CONFIG.ICE_ITEM_HOVER_Y, 'item_freeze')
      .setDisplaySize(120, 120)
      .setDepth(DEPTH.ITEM);
  }

  private removeIce(): void {
    this.iceActive = false;
    this.attachedCloud = null;
    this.iceImage?.destroy();
    this.iceImage = null;
  }

  private scheduleNext(): void {
    const interval = Phaser.Math.Between(
      ITEM_CONFIG.ICE_ITEM_SPAWN_MIN,
      ITEM_CONFIG.ICE_ITEM_SPAWN_MAX,
    );
    this.nextSpawnAt = this.p1CloudCount + interval;
  }

}

