import Phaser from 'phaser';
import type { ScoreData } from '@game-types/game';
import { GAMEPLAY } from '@config/gameplayConfig';
import { EVENTS } from '@config/constants';

export class ScoreSystem {
  private scene: Phaser.Scene;
  private data: ScoreData;
  private lastLandedTopY: number | null = null;

  constructor(scene: Phaser.Scene, bestScore: number) {
    this.scene = scene;
    this.data = { current: 0, best: bestScore, jumps: 0 };
  }

  /**
   * @param cloudTopY 착지한 구름의 topY (world 좌표, 위로 올라갈수록 값이 작아짐)
   */
  onLand(cloudTopY: number): void {
    this.data.jumps += 1;

    const heightGained = this.lastLandedTopY !== null
      ? Math.max(0, this.lastLandedTopY - cloudTopY)
      : 0;

    const points = GAMEPLAY.MIN_SCORE_PER_LAND
      + Math.round(heightGained / GAMEPLAY.HEIGHT_UNIT * GAMEPLAY.SCORE_PER_LAYER);

    this.lastLandedTopY = cloudTopY;
    this.data.current += points;

    if (this.data.current > this.data.best) {
      this.data.best = this.data.current;
    }
    this.scene.events.emit(EVENTS.SCORE_UPDATE, { ...this.data });
  }

  getScore(): Readonly<ScoreData> {
    return this.data;
  }

  getCurrentScore(): number {
    return this.data.current;
  }

  getJumps(): number {
    return this.data.jumps;
  }
}
