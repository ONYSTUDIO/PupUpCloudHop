import Phaser from 'phaser';
import { BirdFlock } from '@entities/Obstacle';
import { OBSTACLE_CONFIG } from '@config/constants';
import { BASE_WIDTH, BASE_HEIGHT } from '@config/gameConfig';

export class ObstacleSystem {
  private flocks: BirdFlock[] = [];
  private nextSpawnTime: number = OBSTACLE_CONFIG.FIRST_SPAWN_DELAY_MS;

  constructor(private readonly scene: Phaser.Scene) {}

  update(delta: number, now: number, cameraScrollY: number): void {
    if (now >= this.nextSpawnTime) {
      this.spawnBirdFlock(cameraScrollY);
      this.nextSpawnTime = now + Phaser.Math.Between(
        OBSTACLE_CONFIG.SPAWN_INTERVAL_MIN_MS,
        OBSTACLE_CONFIG.SPAWN_INTERVAL_MAX_MS,
      );
    }

    for (const flock of this.flocks) {
      flock.update(delta);
    }

    const offScreen = this.flocks.filter((f) => f.isOffScreen);
    for (const f of offScreen) f.destroy();
    this.flocks = this.flocks.filter((f) => !f.isOffScreen);
  }

  getFlocks(): BirdFlock[] {
    return this.flocks;
  }

  clearAll(): void {
    for (const f of this.flocks) f.destroy();
    this.flocks = [];
  }

  private spawnBirdFlock(cameraScrollY: number): void {
    const minY = cameraScrollY + OBSTACLE_CONFIG.SPAWN_Y_MARGIN_TOP;
    const maxY = cameraScrollY + BASE_HEIGHT - OBSTACLE_CONFIG.SPAWN_Y_MARGIN_BOTTOM;
    if (minY >= maxY) return;

    const y = Phaser.Math.Between(Math.ceil(minY), Math.floor(maxY));
    const speed = Phaser.Math.Between(
      OBSTACLE_CONFIG.BIRD_FLOCK_SPEED_MIN,
      OBSTACLE_CONFIG.BIRD_FLOCK_SPEED_MAX,
    );

    this.flocks.push(new BirdFlock(this.scene, -BASE_WIDTH * 0.15, y, speed));
  }
}
