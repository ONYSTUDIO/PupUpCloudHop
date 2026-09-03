import Phaser from 'phaser';
import type { ScoreData } from '@game-types/game';
import { GAMEPLAY, MILESTONES } from '@config/gameplayConfig';
import { EVENTS } from '@config/constants';

export class ScoreSystem {
  private scene: Phaser.Scene;
  private data: ScoreData;
  private lastLandedTopY: number | null = null;
  private landingCount: number = 0;
  private achievedMilestoneCount: number = 0;

  constructor(scene: Phaser.Scene, bestScore: number) {
    this.scene = scene;
    this.data = { current: 0, best: bestScore, jumps: 0 };
  }

  /**
   * @param cloudTopY 착지한 구름의 topY (world 좌표, 위로 올라갈수록 값이 작아짐)
   * @param cloudX    착지한 구름의 world X (BIG JUMP 연출 위치용)
   */
  onLand(cloudTopY: number, cloudX: number = 0): void {
    this.data.jumps += 1;
    this.landingCount += 1;

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

    // BIG JUMP 체크 (첫 착지는 heightGained=0이므로 자동으로 건너뜀)
    if (heightGained > 0) {
      const layers = heightGained / GAMEPLAY.HEIGHT_UNIT;
      if (layers >= GAMEPLAY.BIG_JUMP_LAYERS_3) {
        this.scene.events.emit(EVENTS.BIG_JUMP, {
          text: 'AMAZING!',
          coins: GAMEPLAY.BIG_JUMP_COINS_3,
          worldX: cloudX,
          worldY: cloudTopY,
        });
      } else if (layers >= GAMEPLAY.BIG_JUMP_LAYERS_2) {
        this.scene.events.emit(EVENTS.BIG_JUMP, {
          text: 'BIG JUMP!',
          coins: GAMEPLAY.BIG_JUMP_COINS_2,
          worldX: cloudX,
          worldY: cloudTopY,
        });
      }
    }

    // 마일스톤 체크 — 이미 달성한 마일스톤 이후부터만 순서대로 확인
    for (let i = this.achievedMilestoneCount; i < MILESTONES.length; i++) {
      const ms = MILESTONES[i]!;
      if (this.landingCount >= ms.landings) {
        this.achievedMilestoneCount++;
        this.scene.events.emit(EVENTS.MILESTONE, {
          landingCount: ms.landings,
          coins: ms.coins,
          level: ms.level,
          index: i,
        });
      } else {
        break;
      }
    }
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

  getLandingCount(): number {
    return this.landingCount;
  }

  getAchievedMilestoneCount(): number {
    return this.achievedMilestoneCount;
  }
}
