import Phaser from 'phaser';
import { BASE_WIDTH } from '@config/baseDimensions';
import { DEPTH } from '@config/constants';
import { UI_LAYOUT } from '@config/uiLayout';

const TOP  = UI_LAYOUT.hud.top;   // 40
const SIDE = UI_LAYOUT.hud.side;  // 24

// Row 1: [프로필]  [🪙 코인][💎 다이아]  [⏸]
const ROW1_CY = TOP + 52;

// 프로필 (좌)
const AVATAR_R  = 38;
const AVATAR_CX = SIDE + AVATAR_R + 8;   // 70
const NAME_X    = AVATAR_CX + AVATAR_R + 14;

// 재화 (중앙)
const CX        = BASE_WIDTH / 2;        // 540
const COIN_X    = CX - 80;              // 460 — 코인 우측 정렬 기준
const DIAMOND_X = CX + 80;              // 620 — 다이아 좌측 정렬 기준
const CURRENCY_FS = '44px';

// 일시정지 (우)
const PAUSE_X = BASE_WIDTH - SIDE - 8;  // 1048

export class TopHud {
  // 프로필 (Row 1 좌)
  private avatarBg: Phaser.GameObjects.Graphics;
  private avatarInitial: Phaser.GameObjects.Text;
  private nameText: Phaser.GameObjects.Text;

  // 재화 (Row 1 중앙)
  private coinText: Phaser.GameObjects.Text;
  private diamondText: Phaser.GameObjects.Text;

  // 일시정지 (Row 1 우, onPause 있을 때만 생성)
  private pauseBtn: Phaser.GameObjects.Text | null = null;

  constructor(
    scene: Phaser.Scene,
    initialCoins: number,
    initialDiamonds: number,
    onPause?: () => void,
  ) {
    // ─── Row 1 좌: 프로필 ────────────────────────────────────
    this.avatarBg = scene.add.graphics()
      .setScrollFactor(0).setDepth(DEPTH.HUD);
    this.drawAvatarCircle(0x445588);

    this.avatarInitial = scene.add
      .text(AVATAR_CX, ROW1_CY, '?', {
        fontSize: '42px', fontStyle: 'bold', color: '#ffffff',
      })
      .setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.HUD);

    this.nameText = scene.add
      .text(NAME_X, ROW1_CY, '...', {
        fontSize: '36px', color: '#ddeeff',
        stroke: '#001133', strokeThickness: 4,
      })
      .setOrigin(0, 0.5).setScrollFactor(0).setDepth(DEPTH.HUD);

    // ─── Row 1 중앙: 재화 ────────────────────────────────────
    this.coinText = scene.add
      .text(COIN_X, ROW1_CY, `🪙 ${initialCoins}`, {
        fontSize: CURRENCY_FS, fontStyle: 'bold',
        color: '#ffcc00', stroke: '#442200', strokeThickness: 4,
      })
      .setOrigin(1, 0.5).setScrollFactor(0).setDepth(DEPTH.HUD);

    this.diamondText = scene.add
      .text(DIAMOND_X, ROW1_CY, `💎 ${initialDiamonds}`, {
        fontSize: CURRENCY_FS, fontStyle: 'bold',
        color: '#66ddff', stroke: '#003344', strokeThickness: 4,
      })
      .setOrigin(0, 0.5).setScrollFactor(0).setDepth(DEPTH.HUD);

    // ─── Row 1 우: 일시정지 (onPause 있을 때만) ──────────────
    if (onPause) {
      this.pauseBtn = scene.add
        .text(PAUSE_X, ROW1_CY, '⏸', { fontSize: '56px', color: '#ffffff' })
        .setAlpha(0.7).setOrigin(1, 0.5).setScrollFactor(0).setDepth(DEPTH.HUD)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', onPause)
        .on('pointerover', () => this.pauseBtn?.setAlpha(1))
        .on('pointerout',  () => this.pauseBtn?.setAlpha(0.7));
    }
  }

  // ─── 외부 업데이트 API ──────────────────────────────────────

  updateProfile(displayName: string, isGuest: boolean): void {
    this.drawAvatarCircle(isGuest ? 0x556677 : 0x2266cc);
    this.avatarInitial.setText(displayName.charAt(0).toUpperCase());
    this.nameText.setText(displayName);
  }

  updateCurrency(coins: number, diamonds: number): void {
    this.coinText.setText(`🪙 ${coins}`);
    this.diamondText.setText(`💎 ${diamonds}`);
  }

  destroy(): void {
    this.avatarBg.destroy();
    this.avatarInitial.destroy();
    this.nameText.destroy();
    this.coinText.destroy();
    this.diamondText.destroy();
    this.pauseBtn?.destroy();
  }

  // ─── private ────────────────────────────────────────────────

  private drawAvatarCircle(color: number): void {
    this.avatarBg.clear();
    this.avatarBg.fillStyle(0x000033, 0.45);
    this.avatarBg.fillCircle(AVATAR_CX, ROW1_CY, AVATAR_R + 3);
    this.avatarBg.fillStyle(color, 1);
    this.avatarBg.fillCircle(AVATAR_CX, ROW1_CY, AVATAR_R);
  }
}
