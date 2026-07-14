import Phaser from 'phaser';
import type { ScoreData } from '@game-types/game';
import { GAMEPLAY } from '@config/gameplayConfig';
import { EVENTS } from '@config/constants';

export class ScoreSystem {
  private scene: Phaser.Scene;
  private data: ScoreData;

  constructor(scene: Phaser.Scene, bestScore: number) {
    this.scene = scene;
    this.data = { current: 0, best: bestScore, jumps: 0 };
  }

  onLand(): void {
    this.data.jumps += 1;
    this.data.current += GAMEPLAY.SCORE_PER_JUMP;
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
