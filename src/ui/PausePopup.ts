import Phaser from 'phaser';
import { BASE_WIDTH, BASE_HEIGHT } from '@config/baseDimensions';
import { DEPTH } from '@config/constants';

const CX = BASE_WIDTH / 2;
const CY = BASE_HEIGHT / 2;

const PANEL_W = 680;
const PANEL_H = 820;

export class PausePopup {
  private objs: Phaser.GameObjects.GameObject[] = [];
  private destroyed: boolean = false;

  private soundEnabled: boolean;
  private vibrationEnabled: boolean;
  private soundBtn!: Phaser.GameObjects.Text;
  private vibrationBtn!: Phaser.GameObjects.Text;

  constructor(
    scene: Phaser.Scene,
    soundEnabled: boolean,
    vibrationEnabled: boolean,
    onRetry: () => void,
    onGoMain: () => void,
    onResume: () => void,
    onSoundChange: (enabled: boolean) => void,
    onVibrationChange: (enabled: boolean) => void,
  ) {
    this.soundEnabled = soundEnabled;
    this.vibrationEnabled = vibrationEnabled;

    // ─── 전체화면 dim overlay ─────────────────────────────────
    this.reg(
      scene.add
        .rectangle(0, 0, BASE_WIDTH, BASE_HEIGHT, 0x000020, 0.55)
        .setOrigin(0)
        .setScrollFactor(0)
        .setDepth(DEPTH.POPUP),
    );

    // ─── 중앙 패널 ───────────────────────────────────────────
    this.reg(
      scene.add
        .rectangle(CX, CY, PANEL_W, PANEL_H, 0xeef4ff, 0.97)
        .setOrigin(0.5)
        .setStrokeStyle(5, 0x2255aa)
        .setScrollFactor(0)
        .setDepth(DEPTH.POPUP),
    );

    // ─── 제목 ────────────────────────────────────────────────
    this.reg(
      scene.add
        .text(CX, CY - 340, '일시정지', {
          fontSize: '80px', fontStyle: 'bold',
          color: '#003399',
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(DEPTH.POPUP),
    );

    // ─── 버튼 3개 ─────────────────────────────────────────────
    this.reg(
      this.makeButton(scene, CX, CY - 200, '다시하기', 0x1155cc, () => {
        if (this.destroyed) return;
        onRetry();
      }),
    );

    this.reg(
      this.makeButton(scene, CX, CY - 60, '메인으로', 0x448866, () => {
        if (this.destroyed) return;
        onGoMain();
      }),
    );

    this.reg(
      this.makeButton(scene, CX, CY + 80, '계속하기', 0x886622, () => {
        if (this.destroyed) return;
        onResume();
      }),
    );

    // ─── 구분선 ──────────────────────────────────────────────
    const divG = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH.POPUP);
    divG.lineStyle(1, 0x334466, 0.7);
    divG.beginPath();
    divG.moveTo(CX - PANEL_W / 2 + 40, CY + 165);
    divG.lineTo(CX + PANEL_W / 2 - 40, CY + 165);
    divG.strokePath();
    this.reg(divG);

    // ─── 사운드 토글 ──────────────────────────────────────────
    this.reg(
      scene.add
        .text(CX - 80, CY + 240, '사운드', {
          fontSize: '46px', color: '#003399',
        })
        .setOrigin(1, 0.5)
        .setScrollFactor(0)
        .setDepth(DEPTH.POPUP),
    );

    this.soundBtn = this.makeToggleBtn(scene, CX + 120, CY + 240, this.soundEnabled, () => {
      if (this.destroyed) return;
      this.soundEnabled = !this.soundEnabled;
      this.refreshToggle(this.soundBtn, this.soundEnabled);
      onSoundChange(this.soundEnabled);
    });
    this.reg(this.soundBtn);

    // ─── 진동 토글 ────────────────────────────────────────────
    this.reg(
      scene.add
        .text(CX - 80, CY + 350, '진동', {
          fontSize: '46px', color: '#003399',
        })
        .setOrigin(1, 0.5)
        .setScrollFactor(0)
        .setDepth(DEPTH.POPUP),
    );

    this.vibrationBtn = this.makeToggleBtn(scene, CX + 120, CY + 350, this.vibrationEnabled, () => {
      if (this.destroyed) return;
      this.vibrationEnabled = !this.vibrationEnabled;
      this.refreshToggle(this.vibrationBtn, this.vibrationEnabled);
      onVibrationChange(this.vibrationEnabled);
    });
    this.reg(this.vibrationBtn);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    for (const o of this.objs) o.destroy();
    this.objs = [];
  }

  // ─── private ────────────────────────────────────────────────

  private reg(obj: Phaser.GameObjects.GameObject): Phaser.GameObjects.GameObject {
    this.objs.push(obj);
    return obj;
  }

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
      .setScrollFactor(0)
      .setDepth(DEPTH.POPUP)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', function (this: Phaser.GameObjects.Text) { this.setAlpha(0.85); })
      .on('pointerout',  function (this: Phaser.GameObjects.Text) { this.setAlpha(1); })
      .on('pointerdown', onClick);
  }

  private makeToggleBtn(
    scene: Phaser.Scene,
    x: number,
    y: number,
    initialOn: boolean,
    onClick: () => void,
  ): Phaser.GameObjects.Text {
    return scene.add
      .text(x, y, initialOn ? 'ON' : 'OFF', {
        fontSize: '44px', fontStyle: 'bold', color: '#ffffff',
        backgroundColor: initialOn ? '#1a7a38' : '#7a2222',
        padding: { x: 32, y: 14 },
        fixedWidth: 160,
        align: 'center',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH.POPUP)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', function (this: Phaser.GameObjects.Text) { this.setAlpha(0.85); })
      .on('pointerout',  function (this: Phaser.GameObjects.Text) { this.setAlpha(1); })
      .on('pointerdown', onClick);
  }

  private refreshToggle(btn: Phaser.GameObjects.Text, on: boolean): void {
    btn.setText(on ? 'ON' : 'OFF');
    btn.setStyle({ backgroundColor: on ? '#1a7a38' : '#7a2222' });
  }
}
