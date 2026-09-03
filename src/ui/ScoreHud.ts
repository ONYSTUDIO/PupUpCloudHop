import Phaser from 'phaser';
import type { ScoreData } from '@game-types/game';
import { BASE_WIDTH } from '@config/baseDimensions';
import { EVENTS, DEPTH, ITEM_CONFIG } from '@config/constants';
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

// 구름 동결 타이머 (자석 타이머 아래)
const FREEZE_TEXT_Y = MAGNET_BAR_Y + 52;
const FREEZE_BAR_Y  = FREEZE_TEXT_Y + 54;

// 타임슬로우 타이머 (구름 동결 타이머 아래)
const SLOW_TEXT_Y = FREEZE_BAR_Y + 52;
const SLOW_BAR_Y  = SLOW_TEXT_Y + 54;

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

  // 구름 동결 타이머
  private freezeTimerBg: Phaser.GameObjects.Graphics | null = null;
  private freezeTimerText: Phaser.GameObjects.Text | null = null;

  // 타임슬로우 타이머
  private slowTimerBg: Phaser.GameObjects.Graphics | null = null;
  private slowTimerText: Phaser.GameObjects.Text | null = null;

  // 마일스톤 코인 주머니 (점수 오른쪽에 나열)
  private bagIcons: Phaser.GameObjects.Container[] = [];

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

  // ─── 구름 동결 타이머 ────────────────────────────────────────

  showFreezeTimer(seconds: number): void {
    if (!this.freezeTimerBg) {
      this.freezeTimerBg = this.scene.add.graphics()
        .setScrollFactor(0).setDepth(DEPTH.HUD);
    }
    if (!this.freezeTimerText) {
      this.freezeTimerText = this.scene.add
        .text(CX, FREEZE_TEXT_Y, '', {
          fontSize: '48px', fontStyle: 'bold',
          color: '#aaddff', stroke: '#002244', strokeThickness: 6,
        })
        .setOrigin(0.5, 0).setScrollFactor(0).setDepth(DEPTH.HUD);
    }
    this.updateFreezeTimer(seconds);
    this.freezeTimerBg.setVisible(true);
    this.freezeTimerText.setVisible(true);
  }

  updateFreezeTimer(seconds: number): void {
    const s = Math.max(0, seconds);
    this.freezeTimerText?.setText(`🧊  ${s.toFixed(1)}`);

    const bg = this.freezeTimerBg;
    if (!bg) return;
    bg.clear();
    const barW  = 260;
    const barH  = 12;
    const ratio = s / 10; // ICE_FREEZE_DURATION_SEC = 10
    bg.fillStyle(0x000000, 0.35);
    bg.fillRoundedRect(CX - barW / 2 - 4, FREEZE_BAR_Y - 4, barW + 8, barH + 8, 7);
    bg.fillStyle(0x66aaff, 0.88);
    bg.fillRoundedRect(CX - barW / 2, FREEZE_BAR_Y, barW * ratio, barH, 5);
    bg.fillStyle(0x555555, 0.4);
    bg.fillRoundedRect(CX - barW / 2 + barW * ratio, FREEZE_BAR_Y, barW * (1 - ratio), barH, 5);
  }

  hideFreezeTimer(): void {
    this.freezeTimerBg?.setVisible(false);
    this.freezeTimerText?.setVisible(false);
  }

  // ─── 타임슬로우 타이머 ──────────────────────────────────────

  showSlowTimer(seconds: number): void {
    if (!this.slowTimerBg) {
      this.slowTimerBg = this.scene.add.graphics()
        .setScrollFactor(0).setDepth(DEPTH.HUD);
    }
    if (!this.slowTimerText) {
      this.slowTimerText = this.scene.add
        .text(CX, SLOW_TEXT_Y, '', {
          fontSize: '48px', fontStyle: 'bold',
          color: '#dd99ff', stroke: '#220033', strokeThickness: 6,
        })
        .setOrigin(0.5, 0).setScrollFactor(0).setDepth(DEPTH.HUD);
    }
    this.updateSlowTimer(seconds);
    this.slowTimerBg.setVisible(true);
    this.slowTimerText.setVisible(true);
  }

  updateSlowTimer(seconds: number): void {
    const s = Math.max(0, seconds);
    this.slowTimerText?.setText(`⏱  ${s.toFixed(1)}`);

    const bg = this.slowTimerBg;
    if (!bg) return;
    bg.clear();
    const barW  = 260;
    const barH  = 12;
    const ratio = s / ITEM_CONFIG.TIME_SLOW_DURATION_SEC;
    bg.fillStyle(0x000000, 0.35);
    bg.fillRoundedRect(CX - barW / 2 - 4, SLOW_BAR_Y - 4, barW + 8, barH + 8, 7);
    bg.fillStyle(0xaa55ee, 0.88);
    bg.fillRoundedRect(CX - barW / 2, SLOW_BAR_Y, barW * ratio, barH, 5);
    bg.fillStyle(0x555555, 0.4);
    bg.fillRoundedRect(CX - barW / 2 + barW * ratio, SLOW_BAR_Y, barW * (1 - ratio), barH, 5);
  }

  hideSlowTimer(): void {
    this.slowTimerBg?.setVisible(false);
    this.slowTimerText?.setVisible(false);
  }

  // ─── 마일스톤 코인 주머니 ──────────────────────────────────

  /** 마일스톤 달성 시 점수 오른쪽에 주머니 아이콘 1개 추가 */
  addCoinBag(): void {
    const idx = this.bagIcons.length;
    // 점수 텍스트(CX=540) 오른쪽에 46px 간격으로 수평 나열
    const bagX = CX + 290 + idx * 46;
    const bagY = SCORE_Y + 54;  // 점수 텍스트 수직 중앙

    const bag = this.makeBagIcon(18);
    bag.setPosition(bagX, bagY)
      .setScrollFactor(0)
      .setDepth(DEPTH.HUD)
      .setAlpha(0)
      .setScale(0.3);

    this.bagIcons.push(bag);

    this.scene.tweens.add({
      targets: bag,
      alpha: 1, scaleX: 1, scaleY: 1,
      duration: 340, ease: 'Back.easeOut',
    });
  }

  /** 코인 주머니 그래픽 생성 (r = 몸통 반지름) */
  private makeBagIcon(r: number): Phaser.GameObjects.Container {
    const g = this.scene.add.graphics();

    // 몸통 그림자
    g.fillStyle(0xBB8800, 1);
    g.fillCircle(0, r * 0.55 + 2, r);

    // 몸통
    g.fillStyle(0xFFD700, 1);
    g.fillCircle(0, r * 0.55, r);

    // 하이라이트
    g.fillStyle(0xFFFAA0, 0.55);
    g.fillCircle(-r * 0.28, r * 0.15, r * 0.42);

    // 목 부분
    g.fillStyle(0xFFD700, 1);
    g.fillRoundedRect(-r * 0.36, -r * 0.52, r * 0.72, r * 0.65, 3);

    // 매듭
    g.fillStyle(0xBB7700, 1);
    g.fillCircle(0, -r * 0.52, r * 0.36);

    // 매듭 하이라이트
    g.fillStyle(0xFFCC44, 0.7);
    g.fillCircle(-r * 0.1, -r * 0.60, r * 0.18);

    return this.scene.add.container(0, 0, [g]);
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
    this.freezeTimerBg?.destroy();
    this.freezeTimerText?.destroy();
    this.slowTimerBg?.destroy();
    this.slowTimerText?.destroy();
    this.bagIcons.forEach((b) => b.destroy());
    this.bagIcons = [];
  }

  // ─── private ────────────────────────────────────────────────

  private onScoreUpdate(data: ScoreData): void {
    this.scoreText.setText(String(data.current));
    this.bestText.setText(`BEST  ${data.best}`);
  }
}
