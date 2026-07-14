import Phaser from 'phaser';
import { SCENE_KEYS, DEPTH } from '@config/constants';
import { BASE_WIDTH, BASE_HEIGHT } from '@config/gameConfig';
import { SaveManager } from '@managers/SaveManager';

export class TitleScene extends Phaser.Scene {
  private saveManager!: SaveManager;

  constructor() {
    super({ key: SCENE_KEYS.TITLE });
  }

  create(): void {
    this.saveManager = new SaveManager();
    this.drawBackground();
    this.addTitle();
    this.addBestScore();
    this.addStartButton();
  }

  private drawBackground(): void {
    const g = this.add.graphics().setDepth(DEPTH.BACKGROUND);

    // 하늘 그라데이션 (위: 연한 하늘색, 아래: 진한 파란색)
    g.fillGradientStyle(0x87ceeb, 0x87ceeb, 0x2277cc, 0x2277cc, 1);
    g.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

    // 장식용 구름
    const decorClouds = [
      { x: 180,  y: 280,  w: 320, h: 80 },
      { x: 880,  y: 480,  w: 260, h: 65 },
      { x: 120,  y: 720,  w: 280, h: 72 },
      { x: 820,  y: 950,  w: 300, h: 75 },
      { x: 300,  y: 1200, w: 240, h: 60 },
      { x: 750,  y: 1420, w: 280, h: 70 },
      { x: 200,  y: 1650, w: 220, h: 55 },
      { x: 870,  y: 1820, w: 260, h: 65 },
    ];
    decorClouds.forEach((c) => this.drawDecorCloud(g, c.x, c.y, c.w, c.h));
  }

  private drawDecorCloud(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
  ): void {
    g.fillStyle(0xffffff, 0.22);
    g.fillEllipse(x, y, w, h);
    g.fillEllipse(x - w * 0.22, y - h * 0.25, w * 0.42, h * 0.65);
    g.fillEllipse(x + w * 0.12, y - h * 0.35, w * 0.36, h * 0.56);
  }

  private addTitle(): void {
    // 타이틀 배경 플레이트
    const cx = BASE_WIDTH / 2;
    this.add
      .rectangle(cx, BASE_HEIGHT * 0.3, 900, 380, 0x003399, 0.35)
      .setOrigin(0.5)
      .setDepth(DEPTH.HUD - 1);

    this.add
      .text(cx, BASE_HEIGHT * 0.23, '안 떨어질개', {
        fontSize: '110px',
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#001166',
        strokeThickness: 10,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.HUD);

    this.add
      .text(cx, BASE_HEIGHT * 0.35, 'Pup Up!  Cloud Hop', {
        fontSize: '58px',
        color: '#ffe066',
        stroke: '#001166',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.HUD);

    // 임시 강아지 아이콘
    const dogG = this.add.graphics().setDepth(DEPTH.HUD);
    dogG.setPosition(cx, BASE_HEIGHT * 0.52);
    this.drawMiniDog(dogG);
  }

  private drawMiniDog(g: Phaser.GameObjects.Graphics): void {
    g.fillStyle(0xf0b88a, 1);
    g.fillEllipse(0, 10, 80, 60);
    g.fillEllipse(4, -22, 68, 58);
    g.fillStyle(0xb06a2a, 1);
    g.fillEllipse(-24, -44, 24, 36);
    g.fillEllipse(28, -44, 22, 32);
    g.fillStyle(0x222222, 1);
    g.fillCircle(-12, -26, 7);
    g.fillCircle(16, -26, 7);
    g.fillStyle(0x553311, 1);
    g.fillEllipse(3, -10, 18, 12);
  }

  private addBestScore(): void {
    const best = this.saveManager.getBestScore();
    this.add
      .text(BASE_WIDTH / 2, BASE_HEIGHT * 0.68, `최고 기록  ${best}`, {
        fontSize: '58px',
        fontStyle: 'bold',
        color: '#ffdd44',
        stroke: '#003399',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.HUD);
  }

  private addStartButton(): void {
    const cx = BASE_WIDTH / 2;
    const cy = BASE_HEIGHT * 0.81;

    const btn = this.add
      .text(cx, cy, '  게임 시작  ', {
        fontSize: '72px',
        fontStyle: 'bold',
        color: '#ffffff',
        backgroundColor: '#1155cc',
        padding: { x: 60, y: 28 },
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.HUD)
      .setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => btn.setAlpha(0.85));
    btn.on('pointerout',  () => btn.setAlpha(1));
    btn.on('pointerdown', () => this.scene.start(SCENE_KEYS.GAME));

    // 깜빡 애니메이션
    this.tweens.add({
      targets: btn,
      scaleX: 1.04,
      scaleY: 1.04,
      duration: 700,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });
  }
}
