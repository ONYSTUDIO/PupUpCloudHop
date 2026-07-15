import Phaser from 'phaser';
import { CloudIsland } from '@entities/CloudIsland';
import { CloudPatternType } from '@game-types/game';
import { DEPTH, SPAWN_CONFIG } from '@config/constants';

interface VortexCloudGroup {
  id: string;
  centerX: number;
  centerY: number;
  radiusX: number;
  radiusY: number;
  speed: number;
  direction: 1 | -1;
  angle: number;
  clouds: CloudIsland[];
  swirlGraphics: Phaser.GameObjects.Graphics;
}

export class SpawnSystem {
  private nextSpawnY: number;
  private generatedPatternCount: number;
  private vortexGroups: VortexCloudGroup[] = [];
  private cloudIdCounter: number = 0;

  constructor(
    initialTopY: number,
    initialPatternCount: number,
    private readonly baseWidth: number,
    private readonly baseHeight: number,
  ) {
    this.nextSpawnY = initialTopY - SPAWN_CONFIG.CLOUD_SPACING_MIN;
    this.generatedPatternCount = initialPatternCount;
  }

  needsSpawn(cameraScrollY: number): boolean {
    return this.nextSpawnY > cameraScrollY - SPAWN_CONFIG.LOOKAHEAD;
  }

  /** 다음 패턴을 생성하고 포함된 구름 목록을 반환한다 */
  spawnNext(scene: Phaser.Scene): CloudIsland[] {
    if (this.generatedPatternCount < SPAWN_CONFIG.PATTERN_THRESHOLD) {
      return [this.spawnPattern1(scene)];
    }

    if (Phaser.Math.RND.pick([true, false])) {
      return this.trySpawnPattern2(scene);
    }
    return [this.spawnPattern1(scene)];
  }

  /** 매 프레임 회오리 그룹의 회전 각도를 갱신하고 구름 위치를 계산한다 */
  updateVortexPositions(delta: number): void {
    const dt = delta / 1000;
    for (const group of this.vortexGroups) {
      group.angle += group.speed * group.direction * dt;
      for (const cloud of group.clouds) {
        cloud.setWorldXY(
          group.centerX + Math.cos(group.angle + cloud.vortexAngleOffset) * group.radiusX,
          group.centerY + Math.sin(group.angle + cloud.vortexAngleOffset) * group.radiusY,
        );
      }
    }
  }

  /**
   * 카메라 하단 밖으로 벗어난 구름을 찾아 반환한다.
   * 반환된 구름은 호출자가 destroy() 및 목록에서 제거해야 한다.
   */
  removeOldClouds(
    cameraScrollY: number,
    currentCloudId: string,
    allClouds: CloudIsland[],
  ): CloudIsland[] {
    const despawnY = cameraScrollY + this.baseHeight + SPAWN_CONFIG.DESPAWN_BUFFER;
    const removed: CloudIsland[] = [];

    const vortexCloudIds = new Set(
      this.vortexGroups.flatMap((g) => g.clouds.map((c) => c.id)),
    );

    // 패턴 1 개별 구름 — 궤도 중심 Y로 판단
    for (const cloud of allClouds) {
      if (vortexCloudIds.has(cloud.id)) continue;
      if (cloud.id === currentCloudId) continue;
      if (cloud.orbitCenterY > despawnY) {
        removed.push(cloud);
      }
    }

    // 패턴 2 그룹 — 그룹 중심 Y로 판단, 탑승 중인 구름 포함 그룹은 유지
    const keepGroups: VortexCloudGroup[] = [];
    for (const group of this.vortexGroups) {
      const hasCurrentCloud = group.clouds.some((c) => c.id === currentCloudId);
      if (!hasCurrentCloud && group.centerY > despawnY) {
        removed.push(...group.clouds);
        group.swirlGraphics.destroy();
      } else {
        keepGroups.push(group);
      }
    }
    this.vortexGroups = keepGroups;

    return removed;
  }

  clearAll(): void {
    for (const group of this.vortexGroups) {
      group.swirlGraphics.destroy();
    }
    this.vortexGroups = [];
  }

  // ─── 패턴 1 ────────────────────────────────────────────

  private spawnPattern1(scene: Phaser.Scene): CloudIsland {
    const width = Phaser.Math.Between(190, 260);
    const height = Phaser.Math.Between(55, 68);
    const orbitRadiusX = Phaser.Math.Between(65, 120);
    const orbitRadiusY = Phaser.Math.Between(20, 40);
    const margin = orbitRadiusX + width / 2 + 30;
    const centerX = Phaser.Math.Between(
      Math.ceil(margin),
      Math.floor(this.baseWidth - margin),
    );

    const cloud = new CloudIsland(scene, {
      id: `dc${this.cloudIdCounter++}`,
      centerX,
      centerY: this.nextSpawnY,
      orbitRadiusX,
      orbitRadiusY,
      orbitSpeed: Phaser.Math.FloatBetween(0.55, 1.1),
      startAngle: Phaser.Math.FloatBetween(0, Math.PI * 2),
      rotationDirection: Phaser.Math.RND.pick([1, -1]) as 1 | -1,
      width,
      height,
      patternType: CloudPatternType.PATTERN_1,
    });

    this.nextSpawnY -= Phaser.Math.Between(
      SPAWN_CONFIG.CLOUD_SPACING_MIN,
      SPAWN_CONFIG.CLOUD_SPACING_MAX,
    );
    this.generatedPatternCount++;
    return cloud;
  }

  // ─── 패턴 2 ────────────────────────────────────────────

  private trySpawnPattern2(scene: Phaser.Scene): CloudIsland[] {
    for (let attempt = 0; attempt < SPAWN_CONFIG.MAX_PATTERN_CREATE_RETRY; attempt++) {
      const result = this.tryCreateVortexGroup(scene);
      if (result !== null) return result;
    }
    return [this.spawnPattern1(scene)];
  }

  private tryCreateVortexGroup(scene: Phaser.Scene): CloudIsland[] | null {
    const radiusX = Phaser.Math.Between(
      SPAWN_CONFIG.VORTEX_RADIUS_X_MIN,
      SPAWN_CONFIG.VORTEX_RADIUS_X_MAX,
    );
    const radiusY = Phaser.Math.Between(
      SPAWN_CONFIG.VORTEX_RADIUS_Y_MIN,
      SPAWN_CONFIG.VORTEX_RADIUS_Y_MAX,
    );
    const cloudCount = Phaser.Math.Between(2, 3) as 2 | 3;
    const cloudWidth = Phaser.Math.Between(180, 220);
    const cloudHeight = Phaser.Math.Between(52, 65);
    const halfCW = cloudWidth / 2;

    const minCX = radiusX + halfCW + 40;
    const maxCX = this.baseWidth - radiusX - halfCW - 40;
    if (minCX >= maxCX) return null;

    const centerX = Phaser.Math.Between(Math.ceil(minCX), Math.floor(maxCX));
    const centerY = this.nextSpawnY;
    const direction = Phaser.Math.RND.pick([1, -1]) as 1 | -1;
    const speed = Phaser.Math.FloatBetween(0.45, 0.75);
    const angleOffset = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const groupId = `vg${this.cloudIdCounter++}`;

    const clouds: CloudIsland[] = [];
    for (let i = 0; i < cloudCount; i++) {
      const cloudAngle = angleOffset + i * ((Math.PI * 2) / cloudCount);
      const initX = centerX + Math.cos(cloudAngle) * radiusX;
      const initY = centerY + Math.sin(cloudAngle) * radiusY;

      clouds.push(
        new CloudIsland(scene, {
          id: `${groupId}_c${i}`,
          centerX: initX,
          centerY: initY,
          orbitRadiusX: 0,
          orbitRadiusY: 0,
          orbitSpeed: 0,
          startAngle: 0,
          rotationDirection: 1,
          width: cloudWidth,
          height: cloudHeight,
          patternType: CloudPatternType.PATTERN_2,
          vortexAngleOffset: cloudAngle,
        }),
      );
    }

    const swirlGraphics = this.drawVortexIndicator(scene, centerX, centerY, radiusX, radiusY);

    this.vortexGroups.push({
      id: groupId,
      centerX,
      centerY,
      radiusX,
      radiusY,
      speed,
      direction,
      angle: 0,
      clouds,
      swirlGraphics,
    });

    // 그룹 전체 높이(radiusY * 2) 만큼 + 여유 간격 확보 후 다음 스폰 위치 갱신
    this.nextSpawnY -= radiusY + Phaser.Math.Between(280, 320);
    this.generatedPatternCount++;
    return clouds;
  }

  /** 회오리 패턴 시각 표시 — 중심에 저알파 동심 타원 */
  private drawVortexIndicator(
    scene: Phaser.Scene,
    cx: number,
    cy: number,
    rx: number,
    ry: number,
  ): Phaser.GameObjects.Graphics {
    const g = scene.add.graphics();
    g.setDepth(DEPTH.DECOR_CLOUD);

    const rings = 4;
    for (let i = 1; i <= rings; i++) {
      const t = i / rings;
      g.lineStyle(3 - t * 1.5, 0x88bbff, 0.06 + t * 0.05);
      g.strokeEllipse(cx, cy, rx * t * 2.4, ry * t * 2.4);
    }

    return g;
  }
}
