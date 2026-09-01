import Phaser from 'phaser';
import { BASE_WIDTH, BASE_HEIGHT } from '@config/baseDimensions';
import { DEPTH, ITEM_CONFIG } from '@config/constants';

const CX = BASE_WIDTH / 2;
const CY = BASE_HEIGHT / 2;
const PANEL_W = 700;
const PANEL_H = 680;

export class RevivePopup {
  private container: Phaser.GameObjects.Container;
  private destroyed: boolean = false;

  /**
   * @param revivalItemCount - 보유 중인 부활 아이템 수 (0이면 비활성)
   * @param diamondCount     - 보유 다이아몬드 수 (REVIVE_DIAMOND_COST 미만이면 비활성)
   * @param onRevive         - 부활하기 버튼 클릭 (아이템 or 다이아 소비는 호출자가 처리)
   * @param onForfeit        - 포기하기 클릭
   */
  constructor(
    scene: Phaser.Scene,
    currentScore: number,
    revivalItemCount: number,
    diamondCount: number,
    onRevive: () => void,
    onForfeit: () => void,
  ) {
    const hasItem    = revivalItemCount > 0;
    const hasDiamond = diamondCount >= ITEM_CONFIG.REVIVE_DIAMOND_COST;
    const canRevive  = hasItem || hasDiamond;

    // 전체화면 dim
    const dim = scene.add
      .rectangle(0, 0, BASE_WIDTH, BASE_HEIGHT, 0x000020, 0.70)
      .setOrigin(0).setScrollFactor(0);

    // 중앙 패널
    const panel = scene.add
      .rectangle(CX, CY, PANEL_W, PANEL_H, 0xfff6ee, 0.97)
      .setOrigin(0.5)
      .setStrokeStyle(5, 0xaa4422);

    // 제목
    const title = scene.add
      .text(CX, CY - 285, '💀  부활하시겠어요?', {
        fontSize: '66px', fontStyle: 'bold',
        color: '#661100', stroke: '#220000', strokeThickness: 4,
      }).setOrigin(0.5);

    // 현재 점수
    const scoreLabel = scene.add
      .text(CX, CY - 185, `현재 점수  ${currentScore}`, {
        fontSize: '56px', color: '#334466',
        stroke: '#000022', strokeThickness: 3,
      }).setOrigin(0.5);

    // ── 메인 버튼: 아이템 > 다이아 > 비활성 ─────────────────────
    let mainLabel: string;
    let mainColor: number;
    if (hasItem) {
      mainLabel = `🔮  부활하기  (아이템 ${revivalItemCount}개 보유)`;
      mainColor = 0x7733cc;
    } else if (hasDiamond) {
      mainLabel = `💎  부활하기  (💎${ITEM_CONFIG.REVIVE_DIAMOND_COST}개 사용)`;
      mainColor = 0x1155cc;
    } else {
      mainLabel = `부활하기  (재화 부족)`;
      mainColor = 0x888888;
    }

    const reviveBtn = this.makeFilledBtn(
      scene, CX, CY - 55,
      mainLabel, mainColor,
      () => { if (!this.destroyed && canRevive) onRevive(); },
      !canRevive,
    );

    // ── 광고 버튼 (준비 중 — 비활성) ─────────────────────────────
    const adBtn = this.makeFilledBtn(
      scene, CX, CY + 105,
      '📺  광고 보기  (준비 중)', 0x888888,
      () => {},
      true,
    );

    // ── 포기하기 텍스트 링크 ──────────────────────────────────────
    const forfeitText = scene.add
      .text(CX, CY + 266, '포기하기', {
        fontSize: '52px', color: '#999999',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', function (this: Phaser.GameObjects.Text) {
        this.setStyle({ color: '#555555' });
      })
      .on('pointerout', function (this: Phaser.GameObjects.Text) {
        this.setStyle({ color: '#999999' });
      })
      .on('pointerdown', () => {
        if (!this.destroyed) onForfeit();
      });

    this.container = scene.add
      .container(0, 0, [dim, panel, title, scoreLabel, reviveBtn, adBtn, forfeitText])
      .setDepth(DEPTH.POPUP)
      .setScrollFactor(0);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.container.destroy();
  }

  // ─── private ────────────────────────────────────────────────

  private makeFilledBtn(
    scene: Phaser.Scene,
    x: number,
    y: number,
    label: string,
    color: number,
    onClick: () => void,
    disabled: boolean,
  ): Phaser.GameObjects.Text {
    const hex = '#' + color.toString(16).padStart(6, '0');
    const btn = scene.add
      .text(x, y, label, {
        fontSize: '50px', fontStyle: 'bold',
        color: disabled ? '#cccccc' : '#ffffff',
        backgroundColor: hex,
        padding: { x: 40, y: 22 },
      })
      .setOrigin(0.5)
      .setAlpha(disabled ? 0.55 : 1);

    if (!disabled) {
      btn.setInteractive({ useHandCursor: true })
        .on('pointerover', function (this: Phaser.GameObjects.Text) { this.setAlpha(0.82); })
        .on('pointerout',  function (this: Phaser.GameObjects.Text) { this.setAlpha(1); })
        .on('pointerdown', onClick);
    }
    return btn;
  }
}
