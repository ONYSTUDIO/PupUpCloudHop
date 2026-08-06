import Phaser from 'phaser';
import type { ScoreData } from '@game-types/game';
import { BASE_WIDTH } from '@config/gameConfig';
import { EVENTS, DEPTH } from '@config/constants';

export class GameHud {
  private scene: Phaser.Scene;
  private scoreText: Phaser.GameObjects.Text;
  private bestText: Phaser.GameObjects.Text;
  private pauseBtn: Phaser.GameObjects.Text;
  private rocketTimerBg: Phaser.GameObjects.Graphics | null = null;
  private rocketTimerText: Phaser.GameObjects.Text | null = null;

  constructor(scene: Phaser.Scene, bestScore: number, onTogglePause: () => void) {
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

    this.pauseBtn = scene.add
      .text(BASE_WIDTH - 56, 72, '⏸', {
        fontSize: '58px',
        color: '#ffffff',
      })
      .setAlpha(0.7)
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH.HUD)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', onTogglePause)
      .on('pointerover', () => this.pauseBtn.setAlpha(1))
      .on('pointerout',  () => this.pauseBtn.setAlpha(0.7));

    this.scene.events.on(EVENTS.SCORE_UPDATE, this.onScoreUpdate, this);
  }

  setPaused(paused: boolean): void {
    this.pauseBtn.setText(paused ? '▶' : '⏸');
  }

  showRocketTimer(seconds: number): void {
    if (!this.rocketTimerBg) {
      this.rocketTimerBg = this.scene.add.graphics()
        .setScrollFactor(0)
        .setDepth(DEPTH.HUD);
    }
    if (!this.rocketTimerText) {
      this.rocketTimerText = this.scene.add
        .text(BASE_WIDTH / 2, 260, '', {
          fontSize: '52px',
          fontStyle: 'bold',
          color: '#FFD700',
          stroke: '#7A3800',
          strokeThickness: 7,
        })
        .setOrigin(0.5, 0)
        .setScrollFactor(0)
        .setDepth(DEPTH.HUD);
    }
    this.updateRocketTimer(seconds);
    this.rocketTimerBg.setVisible(true);
    this.rocketTimerText.setVisible(true);
  }

  updateRocketTimer(seconds: number): void {
    const s = Math.max(0, seconds);
    this.rocketTimerText?.setText(`🚀  ${s.toFixed(1)}`);

    const bg = this.rocketTimerBg;
    if (!bg) return;
    bg.clear();
    const cx = BASE_WIDTH / 2;
    const cy = 276;
    const barW = 280;
    const barH = 14;
    const ratio = s / 3;
    bg.fillStyle(0x000000, 0.38);
    bg.fillRoundedRect(cx - barW / 2 - 4, cy - 4, barW + 8, barH + 8, 8);
    bg.fillStyle(0xFFAA00, 0.85);
    bg.fillRoundedRect(cx - barW / 2, cy, barW * ratio, barH, 6);
    bg.fillStyle(0x555555, 0.4);
    bg.fillRoundedRect(cx - barW / 2 + barW * ratio, cy, barW * (1 - ratio), barH, 6);
  }

  hideRocketTimer(): void {
    this.rocketTimerBg?.setVisible(false);
    this.rocketTimerText?.setVisible(false);
  }

  private onScoreUpdate(data: ScoreData): void {
    this.scoreText.setText(String(data.current));
    this.bestText.setText(`BEST  ${data.best}`);
  }

  destroy(): void {
    this.scene.events.off(EVENTS.SCORE_UPDATE, this.onScoreUpdate, this);
    this.scoreText.destroy();
    this.bestText.destroy();
    this.pauseBtn.destroy();
    this.rocketTimerBg?.destroy();
    this.rocketTimerText?.destroy();
  }
}
