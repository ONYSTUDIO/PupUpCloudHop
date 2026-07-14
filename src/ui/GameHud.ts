import Phaser from 'phaser';
import type { ScoreData } from '@game-types/game';
import { BASE_WIDTH } from '@config/gameConfig';
import { EVENTS, DEPTH } from '@config/constants';

export class GameHud {
  private scene: Phaser.Scene;
  private scoreText: Phaser.GameObjects.Text;
  private bestText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, bestScore: number) {
    this.scene = scene;

    this.scoreText = scene.add
      .text(BASE_WIDTH / 2, 64, '0', {
        fontSize: '108px',
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#003399',
        strokeThickness: 9,
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH.HUD);

    this.bestText = scene.add
      .text(BASE_WIDTH / 2, 188, `BEST  ${bestScore}`, {
        fontSize: '46px',
        color: '#ffe066',
        stroke: '#003399',
        strokeThickness: 5,
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH.HUD);

    // 일시정지 버튼 자리 (P1 구현)
    scene.add
      .text(BASE_WIDTH - 56, 72, '⏸', {
        fontSize: '58px',
        color: '#ffffff',
      })
      .setAlpha(0.7)
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH.HUD)
      .setInteractive({ useHandCursor: true });

    this.scene.events.on(EVENTS.SCORE_UPDATE, this.onScoreUpdate, this);
  }

  private onScoreUpdate(data: ScoreData): void {
    this.scoreText.setText(String(data.current));
    this.bestText.setText(`BEST  ${data.best}`);
  }

  destroy(): void {
    this.scene.events.off(EVENTS.SCORE_UPDATE, this.onScoreUpdate, this);
    this.scoreText.destroy();
    this.bestText.destroy();
  }
}
