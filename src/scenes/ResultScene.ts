import Phaser from 'phaser';
import { SCENE_KEYS } from '@config/constants';
import { ResultPanel } from '@ui/ResultPanel';
import type { ScoreData, JumpPatternType } from '@game-types/game';
import { profileService } from '../services/ProfileService';
import { authService } from '../services/AuthService';

interface ResultSceneData {
  score: ScoreData;
  isNewBest: boolean;
  pattern: JumpPatternType;
  coinsEarned: number;
  totalCoins: number;
}

export class ResultScene extends Phaser.Scene {
  private panel: ResultPanel | null = null;

  constructor() {
    super({ key: SCENE_KEYS.RESULT });
  }

  create(data: ResultSceneData): void {
    this.cameras.main.setBackgroundColor(0x87ceeb);
    this.panel = new ResultPanel(
      this,
      data.score,
      data.isNewBest,
      data.pattern,
      data.coinsEarned,
      data.totalCoins,
    );
    void this.syncToDb(data.score.current, data.coinsEarned);
  }

  private async syncToDb(score: number, coinsEarned: number): Promise<void> {
    const user = await authService.getUser();
    if (!user) return;
    try {
      await Promise.all([
        profileService.addCoins(coinsEarned),
        profileService.submitScore(score),
      ]);
    } catch (e) {
      console.warn('[ResultScene] DB sync failed:', e);
    }
  }

  shutdown(): void {
    this.panel?.destroy();
    this.panel = null;
  }
}
