import Phaser from 'phaser';
import type { ScoreData } from '@game-types/game';
import { BASE_WIDTH } from '@config/baseDimensions';
import { EVENTS, DEPTH } from '@config/constants';
import { UI_LAYOUT } from '@config/uiLayout';

const TOP = UI_LAYOUT.hud.top;

// Row 1 중심Y (TopHud 참고)
const ROW1_CY = TOP + 52;

// Row 2: 점수
const SCORE_Y = ROW1_CY + 74;
const BEST_Y  = SCORE_Y + 112;

// 로켓 타이머 (점수 아래)
const ROCKET_TEXT_Y = BEST_Y + 60;
const ROCKET_BAR_Y  = ROCKET_TEXT_Y + 62;

// 자석 타이머 (로켓 타이머 아래)
const MAGNET_TEXT_Y = ROCKET_BAR_Y + 52;
const MAGNET_BAR_Y  = MAGNET_TEXT_Y + 54;

const CX = BASE_WIDTH / 2; // 540

export class ScoreHud {
  private scene: Phaser.Scene;

  // 점수 (Row 2)
  private scoreText: Phaser.GameObjects.Text;
  private bestText: Phaser.GameObjects.Text;

  // 로켓 타이머
  private rocketTimerBg: Phaser.GameObjects.Graphics | null = null;
  private rocketTimerText: Phaser.GameObjects.Text | null = null;

  // 자석 타이머
  private magnetTimerBg: Phaser.GameObjects.Graphics | null = null;
  private magnetTimerText: Phaser.GameObjects.Text | null = null;

  constructor(scene: Phaser.Scene, bestScore: number) {
    this.scene = scene;

    // ─── Row 2 중앙: 점수 ────────────────────────────────────
    this.scoreText = scene.add
      .text(CX, SCORE_Y, '0', {
        fontSize: '108px', fontStyle: 'bold',
        color: '#ffffff', stroke: '#003399', strokeThickness: 9,
      })
      .setOrigin(0.5, 0).setScrollFactor(0).setDepth(DEPTH.HUD);

    this.bestText = scene.add
      .text(CX, BEST_Y, `BEST  ${bestScore}`, {
        fontSize: '44px', color: '#ffe066',
        stroke: '#003399', strokeThickness: 5,
      })
      .setOrigin(0.5, 0).setScrollFactor(0).setDepth(DEPTH.HUD);

    this.scene.events.on(EVENTS.SCORE_UPDATE, this.onScoreUpdate, this);
  }

  // ─── 로켓 타이머 ────────────────────────────────────────────

  showRocketTimer(seconds: number): void {
    if (!this.rocketTimerBg) {
      this.rocketTimerBg = this.scene.add.graphics()
        .setScrollFactor(0).setDepth(DEPTH.HUD);
    }
    if (!this.rocketTimerText) {
      this.rocketTimerText = this.scene.add
        .text(CX, ROCKET_TEXT_Y, '', {
          fontSize: '52px', fontStyle: 'bold',
          color: '#FFD700', stroke: '#7A3800', strokeThickness: 7,
        })
        .setOrigin(0.5, 0).setScrollFactor(0).setDepth(DEPTH.HUD);
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
    const barW = 280;
    const barH = 14;
    const ratio = s / 3;
    bg.fillStyle(0x000000, 0.38);
    bg.fillRoundedRect(CX - barW / 2 - 4, ROCKET_BAR_Y - 4, barW + 8, barH + 8, 8);
    bg.fillStyle(0xFFAA00, 0.85);
    bg.fillRoundedRect(CX - barW / 2, ROCKET_BAR_Y, barW * ratio, barH, 6);
    bg.fillStyle(0x555555, 0.4);
    bg.fillRoundedRect(CX - barW / 2 + barW * ratio, ROCKET_BAR_Y, barW * (1 - ratio), barH, 6);
  }

  hideRocketTimer(): void {
    this.rocketTimerBg?.setVisible(false);
    this.rocketTimerText?.setVisible(false);
  }

  // ─── 자석 타이머 ────────────────────────────────────────────

  showMagnetTimer(seconds: number): void {
    if (!this.magnetTimerBg) {
      this.magnetTimerBg = this.scene.add.graphics()
        .setScrollFactor(0).setDepth(DEPTH.HUD);
    }
    if (!this.magnetTimerText) {
      this.magnetTimerText = this.scene.add
        .text(CX, MAGNET_TEXT_Y, '', {
          fontSize: '48px', fontStyle: 'bold',
          color: '#88ccff', stroke: '#001144', strokeThickness: 6,
        })
        .setOrigin(0.5, 0).setScrollFactor(0).setDepth(DEPTH.HUD);
    }
    this.updateMagnetTimer(seconds);
    this.magnetTimerBg.setVisible(true);
    this.magnetTimerText.setVisible(true);
  }

  updateMagnetTimer(seconds: number): void {
    const s = Math.max(0, seconds);
    this.magnetTimerText?.setText(`🧲  ${s.toFixed(1)}`);

    const bg = this.magnetTimerBg;
    if (!bg) return;
    bg.clear();
    const barW = 260;
    const barH = 12;
    const ratio = s / 10; // MAGNET_DURATION_SEC = 10
    bg.fillStyle(0x000000, 0.35);
    bg.fillRoundedRect(CX - barW / 2 - 4, MAGNET_BAR_Y - 4, barW + 8, barH + 8, 7);
    bg.fillStyle(0x44aaff, 0.85);
    bg.fillRoundedRect(CX - barW / 2, MAGNET_BAR_Y, barW * ratio, barH, 5);
    bg.fillStyle(0x555555, 0.4);
    bg.fillRoundedRect(CX - barW / 2 + barW * ratio, MAGNET_BAR_Y, barW * (1 - ratio), barH, 5);
  }

  hideMagnetTimer(): void {
    this.magnetTimerBg?.setVisible(false);
    this.magnetTimerText?.setVisible(false);
  }

  // ─── destroy ────────────────────────────────────────────────

  destroy(): void {
    this.scene.events.off(EVENTS.SCORE_UPDATE, this.onScoreUpdate, this);
    this.scoreText.destroy();
    this.bestText.destroy();
    this.rocketTimerBg?.destroy();
    this.rocketTimerText?.destroy();
    this.magnetTimerBg?.destroy();
    this.magnetTimerText?.destroy();
  }

  // ─── private ────────────────────────────────────────────────

  private onScoreUpdate(data: ScoreData): void {
    this.scoreText.setText(String(data.current));
    this.bestText.setText(`BEST  ${data.best}`);
  }
}
