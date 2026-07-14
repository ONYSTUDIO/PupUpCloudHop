import Phaser from 'phaser';
import { SCENE_KEYS } from '@config/constants';
import { ResultPanel } from '@ui/ResultPanel';
import type { ScoreData } from '@game-types/game';

interface ResultSceneData {
  score: ScoreData;
  isNewBest: boolean;
}

export class ResultScene extends Phaser.Scene {
  private panel: ResultPanel | null = null;

  constructor() {
    super({ key: SCENE_KEYS.RESULT });
  }

  create(data: ResultSceneData): void {
    this.cameras.main.setBackgroundColor(0x87ceeb);
    this.panel = new ResultPanel(this, data.score, data.isNewBest);
  }

  shutdown(): void {
    this.panel?.destroy();
    this.panel = null;
  }
}
