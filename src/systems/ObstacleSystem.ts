import Phaser from 'phaser';
import { BirdFlock } from '@entities/Obstacle';
import { LightningStorm } from '@entities/LightningStorm';
import type { CloudIsland } from '@entities/CloudIsland';
import { OBSTACLE_CONFIG } from '@config/constants';
import { BASE_WIDTH, BASE_HEIGHT } from '@config/gameConfig';

export class ObstacleSystem {
  // ── 새떼 ────────────────────────────────────────────────
  private flocks: BirdFlock[] = [];
  private nextFlockTime: number;

  // ── 번개 폭풍 ───────────────────────────────────────────
  private storm: LightningStorm | null = null;
  private nextStormTime: number;

  /**
   * @param now - 씬 생성 시점의 this.time.now
   *   Phaser 시각은 게임 전체 누적이므로 절대값(DELAY_MS)으로 비교하면
   *   재시작 시 즉시 스폰되는 버그가 발생. 상대값(now + DELAY)으로 설정.
   */
  constructor(private readonly scene: Phaser.Scene, now: number) {
    this.nextFlockTime = now + OBSTACLE_CONFIG.FIRST_SPAWN_DELAY_MS;
    this.nextStormTime = now + OBSTACLE_CONFIG.STORM_FIRST_SPAWN_DELAY_MS;
  }

  // ── 새떼 업데이트 ────────────────────────────────────────

  update(delta: number, now: number, cameraScrollY: number): void {
    if (now >= this.nextFlockTime) {
      this.spawnBirdFlock(cameraScrollY);
      this.nextFlockTime = now + Phaser.Math.Between(
        OBSTACLE_CONFIG.SPAWN_INTERVAL_MIN_MS,
        OBSTACLE_CONFIG.SPAWN_INTERVAL_MAX_MS,
      );
    }

    for (const flock of this.flocks) flock.update(delta);

    const offScreen = this.flocks.filter((f) => f.isOffScreen);
    for (const f of offScreen) f.destroy();
    this.flocks = this.flocks.filter((f) => !f.isOffScreen);
  }

  getFlocks(): BirdFlock[] { return this.flocks; }

  // ── 번개 폭풍 업데이트 ───────────────────────────────────

  /**
   * @param currentCloud - 플레이어가 현재 탑승 중인 구름섬 (WARNING 진입 시 타겟으로 잠금)
   * @returns 이 프레임에 번개가 충돌한 구름섬 id, 없으면 null
   */
  updateStorm(
    delta: number,
    now: number,
    cameraScrollY: number,
    currentCloud: CloudIsland | null,
  ): string | null {
    // 폭풍 없음 → 스폰 여부 확인
    if (this.storm === null) {
      if (now >= this.nextStormTime) {
        this.storm = new LightningStorm(this.scene);
        this.nextStormTime = now + Phaser.Math.Between(
          OBSTACLE_CONFIG.STORM_SPAWN_INTERVAL_MIN_MS,
          OBSTACLE_CONFIG.STORM_SPAWN_INTERVAL_MAX_MS,
        );
      }
      return null;
    }

    // WARNING 단계에서 타겟 주입
    if (this.storm.needsTarget && currentCloud !== null && !currentCloud.isFalling) {
      this.storm.setTarget(
        currentCloud.id,
        currentCloud.x,
        currentCloud.balloonZoneTopY,
      );
    }

    this.storm.update(delta, cameraScrollY);

    const hitId = this.storm.didHit ? this.storm.hitCloudId : null;

    if (this.storm.isDone) {
      this.storm.destroy();
      this.storm = null;
    }

    return hitId;
  }

  // ── 정리 ────────────────────────────────────────────────

  clearAll(): void {
    for (const f of this.flocks) f.destroy();
    this.flocks = [];
    this.storm?.destroy();
    this.storm = null;
  }

  // ── 내부 ────────────────────────────────────────────────

  private spawnBirdFlock(cameraScrollY: number): void {
    const minY = cameraScrollY + OBSTACLE_CONFIG.SPAWN_Y_MARGIN_TOP;
    const maxY = cameraScrollY + BASE_HEIGHT - OBSTACLE_CONFIG.SPAWN_Y_MARGIN_BOTTOM;
    if (minY >= maxY) return;

    const y     = Phaser.Math.Between(Math.ceil(minY), Math.floor(maxY));
    const speed = Phaser.Math.Between(
      OBSTACLE_CONFIG.BIRD_FLOCK_SPEED_MIN,
      OBSTACLE_CONFIG.BIRD_FLOCK_SPEED_MAX,
    );
    this.flocks.push(new BirdFlock(this.scene, -BASE_WIDTH * 0.15, y, speed));
  }
}
