import Phaser from 'phaser';
import { BASE_WIDTH, BASE_HEIGHT } from '@config/baseDimensions';
import { DEPTH } from '@config/constants';

const CX = BASE_WIDTH / 2;
const CY = BASE_HEIGHT / 2;

const PANEL_W = 680;
const PANEL_H = 560;

export class PausePopup {
  private container: Phaser.GameObjects.Container;
  private destroyed: boolean = false;

  constructor(
    scene: Phaser.Scene,
    onRetry: () => void,
    onGoMain: () => void,
    onResume: () => void,
  ) {

    // ─── 전체화면 dim overlay ─────────────────────────────────
    const dim = scene.add
      .rectangle(0, 0, BASE_WIDTH, BASE_HEIGHT, 0x000020, 0.55)
      .setOrigin(0)
      .setScrollFactor(0);

    // ─── 중앙 패널 ───────────────────────────────────────────
    const panel = scene.add
      .rectangle(CX, CY, PANEL_W, PANEL_H, 0xeef4ff, 0.97)
      .setOrigin(0.5)
      .setStrokeStyle(5, 0x2255aa);

    // ─── 제목 ────────────────────────────────────────────────
    const title = scene.add
      .text(CX, CY - 210, '일시정지', {
        fontSize: '80px', fontStyle: 'bold',
        color: '#003399', stroke: '#000022', strokeThickness: 5,
      })
      .setOrigin(0.5);

    // ─── 버튼 3개 ─────────────────────────────────────────────
    const retryBtn = this.makeButton(scene, CX, CY - 60, '다시하기', 0x1155cc, () => {
      if (this.destroyed) return;
      onRetry();
    });

    const mainBtn = this.makeButton(scene, CX, CY + 80, '메인으로', 0x448866, () => {
      if (this.destroyed) return;
      onGoMain();
    });

    const resumeBtn = this.makeButton(scene, CX, CY + 220, '계속하기', 0x886622, () => {
      if (this.destroyed) return;
      onResume();
    });

    // ─── 컨테이너 조립 ────────────────────────────────────────
    this.container = scene.add
      .container(0, 0, [dim, panel, title, retryBtn, mainBtn, resumeBtn])
      .setDepth(DEPTH.POPUP)
      .setScrollFactor(0);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.container.destroy();
  }

  // ─── private ────────────────────────────────────────────────

  private makeButton(
    scene: Phaser.Scene,
    x: number,
    y: number,
    label: string,
    color: number,
    onClick: () => void,
  ): Phaser.GameObjects.Text {
    const colorHex = '#' + color.toString(16).padStart(6, '0');
    return scene.add
      .text(x, y, label, {
        fontSize: '60px', fontStyle: 'bold',
        color: '#ffffff', backgroundColor: colorHex,
        padding: { x: 48, y: 22 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', function (this: Phaser.GameObjects.Text) { this.setAlpha(0.85); })
      .on('pointerout',  function (this: Phaser.GameObjects.Text) { this.setAlpha(1); })
      .on('pointerdown', onClick);
  }
}
