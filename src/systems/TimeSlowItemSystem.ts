import Phaser from 'phaser';
import type { CloudIsland } from '@entities/CloudIsland';
import { DEPTH, ITEM_CONFIG } from '@config/constants';

export class TimeSlowItemSystem {
  private scene: Phaser.Scene;

  private attachedCloud: CloudIsland | null = null;
  private itemGraphics: Phaser.GameObjects.Graphics | null = null;
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
    if (!this.itemActive || !this.itemGraphics || !this.attachedCloud) return;

    if (this.attachedCloud.isFalling) {
      this.removeItem();
      return;
    }

    this.floatTime += delta / 1000;
    const floatOffset = Math.sin(this.floatTime * Math.PI * 1.1) * 8;

    this.itemGraphics.setPosition(
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

    this.itemGraphics = this.scene.add.graphics().setDepth(DEPTH.ITEM);
    this.drawSlowShape(this.itemGraphics);
  }

  private removeItem(): void {
    this.itemActive = false;
    this.attachedCloud = null;
    this.itemGraphics?.destroy();
    this.itemGraphics = null;
  }

  private scheduleNext(): void {
    const interval = Phaser.Math.Between(
      ITEM_CONFIG.TIME_SLOW_ITEM_SPAWN_MIN,
      ITEM_CONFIG.TIME_SLOW_ITEM_SPAWN_MAX,
    );
    this.nextSpawnAt = this.p1CloudCount + interval;
  }

  // ─── 모래시계 아이콘 드로잉 ────────────────────────────────

  private drawSlowShape(g: Phaser.GameObjects.Graphics): void {
    const hw = 20;  // 모래시계 반폭
    const hh = 24;  // 모래시계 반높이

    // 외곽 글로우
    g.fillStyle(0xcc88ff, 0.14);
    g.fillCircle(0, 0, 38);

    // 내부 글로우
    g.fillStyle(0xaa66ff, 0.22);
    g.fillCircle(0, 0, 27);

    // 위 삼각형 (모래 상단)
    g.fillStyle(0xeeccff, 0.92);
    g.fillTriangle(-hw, -hh, hw, -hh, 0, 0);

    // 아래 삼각형 (모래 하단)
    g.fillStyle(0xcc99ff, 0.92);
    g.fillTriangle(-hw, hh, hw, hh, 0, 0);

    // 상단/하단 테두리 바
    g.lineStyle(4.5, 0xdd99ff, 0.9);
    g.beginPath();
    g.moveTo(-hw - 2, -hh);
    g.lineTo(hw + 2, -hh);
    g.strokePath();
    g.beginPath();
    g.moveTo(-hw - 2, hh);
    g.lineTo(hw + 2, hh);
    g.strokePath();

    // 중심 핀치 (모래 떨어지는 지점)
    g.fillStyle(0xffeeff, 0.95);
    g.fillCircle(0, 0, 5.5);
    g.fillStyle(0xaa55ee, 1);
    g.fillCircle(0, 0, 3.5);

    // 하단 쌓인 모래 도트
    for (let i = 0; i < 3; i++) {
      g.fillStyle(0xffeeff, 0.65);
      g.fillCircle((i - 1) * 5, hh - 7, 3);
    }

    // 하이라이트
    g.fillStyle(0xffffff, 0.55);
    g.fillEllipse(-4, -hh + 6, 6, 4);
  }
}
