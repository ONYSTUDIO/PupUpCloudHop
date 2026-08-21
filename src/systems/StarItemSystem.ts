import Phaser from 'phaser';
import type { CloudIsland } from '@entities/CloudIsland';
import { DEPTH, ITEM_CONFIG } from '@config/constants';

export class StarItemSystem {
  private scene: Phaser.Scene;

  private attachedCloud: CloudIsland | null = null;

  get attachedCloudId(): string | null { return this.attachedCloud?.id ?? null; }
  private starGraphics: Phaser.GameObjects.Graphics | null = null;
  private starActive: boolean = false;
  private floatTime: number = 0;

  // 패턴1 구름 카운터 (패턴2 제외)
  private p1CloudCount: number = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * 패턴1 구름이 스폰될 때 호출.
   * N번째마다 해당 구름 위에 별을 붙인다.
   */
  onPattern1CloudSpawned(cloud: CloudIsland): void {
    this.p1CloudCount++;
    if (!this.starActive && this.p1CloudCount % ITEM_CONFIG.STAR_SPAWN_EVERY_N_CLOUDS === 0) {
      this.attachToCloud(cloud);
    }
  }

  /** 매 프레임 — 구름과 함께 이동 + 부유 애니메이션 */
  update(delta: number, cameraScrollY: number): void {
    if (!this.starActive || !this.starGraphics || !this.attachedCloud) return;

    // 낙하 중인 구름이면 별도 제거
    if (this.attachedCloud.isFalling) {
      this.removeStar();
      return;
    }

    this.floatTime += delta / 1000;
    const floatOffset = Math.sin(this.floatTime * Math.PI * 1.4) * 10;

    // 구름의 현재 월드 좌표를 매 프레임 추적
    this.starGraphics.setPosition(
      this.attachedCloud.x,
      this.attachedCloud.topY - ITEM_CONFIG.STAR_HOVER_Y + floatOffset,
    );

    // 카메라 아래로 완전히 벗어나면 제거
    if (this.attachedCloud.y > cameraScrollY + 2100) {
      this.removeStar();
    }
  }

  /**
   * 플레이어가 구름에 착지했을 때 호출.
   * 해당 구름에 별이 있으면 수집 처리 후 true 반환.
   */
  checkLanding(cloud: CloudIsland): boolean {
    if (!this.starActive || this.attachedCloud?.id !== cloud.id) return false;
    this.removeStar();
    return true;
  }

  /** 구름이 디스폰 제거될 때 호출 — 별이 붙어있으면 함께 제거 */
  onCloudRemoved(cloud: CloudIsland): void {
    if (this.attachedCloud?.id === cloud.id) {
      this.removeStar();
    }
  }

  clearAll(): void {
    this.removeStar();
  }

  // ─── private ───────────────────────────────────────────

  private attachToCloud(cloud: CloudIsland): void {
    this.attachedCloud = cloud;
    this.starActive = true;
    this.floatTime = 0;

    this.starGraphics = this.scene.add.graphics().setDepth(DEPTH.ITEM);
    this.drawStarShape(this.starGraphics);
    // 초기 위치는 첫 update()에서 설정됨
  }

  private removeStar(): void {
    this.starActive = false;
    this.attachedCloud = null;
    this.starGraphics?.destroy();
    this.starGraphics = null;
  }

  private drawStarShape(g: Phaser.GameObjects.Graphics): void {
    const outerR = ITEM_CONFIG.STAR_OUTER_RADIUS;
    const innerR = ITEM_CONFIG.STAR_INNER_RADIUS;
    const pts = this.buildStarPoints(outerR, innerR);

    // 바깥 글로우
    g.fillStyle(0xFFEE44, 0.20);
    g.fillCircle(0, 0, outerR + 20);

    // 별 본체
    g.fillStyle(0xFFD700, 1);
    g.fillPoints(pts, true);

    // 외곽선
    g.lineStyle(3, 0xFFF59D, 0.95);
    g.strokePoints(pts, true);

    // 하이라이트
    g.fillStyle(0xFFFFFF, 0.55);
    g.fillEllipse(-outerR * 0.18, -outerR * 0.22, outerR * 0.46, outerR * 0.28);
  }

  private buildStarPoints(outerR: number, innerR: number): Phaser.Types.Math.Vector2Like[] {
    const pts: Phaser.Types.Math.Vector2Like[] = [];
    for (let i = 0; i < 10; i++) {
      const angle = (i * Math.PI) / 5 - Math.PI / 2;
      const r = i % 2 === 0 ? outerR : innerR;
      pts.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
    }
    return pts;
  }
}
