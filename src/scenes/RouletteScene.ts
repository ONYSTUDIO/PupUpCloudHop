import Phaser from 'phaser';
import { SCENE_KEYS, DEPTH } from '@config/constants';
import { BASE_WIDTH, BASE_HEIGHT } from '@config/gameConfig';
import { SaveManager } from '@managers/SaveManager';

interface RouletteSceneData {
  from?: string;
}

export class RouletteScene extends Phaser.Scene {
  private saveManager!: SaveManager;
  private fromScene: string = SCENE_KEYS.TITLE;

  constructor() {
    super({ key: SCENE_KEYS.ROULETTE });
  }

  create(data?: RouletteSceneData): void {
    this.saveManager = new SaveManager();
    this.fromScene = data?.from ?? SCENE_KEYS.TITLE;

    this.createBackground();
    this.createHeader();
    this.createBody();
    this.createCloseButton();
  }

  private createBackground(): void {
    this.add
      .rectangle(0, 0, BASE_WIDTH, BASE_HEIGHT, 0x000000, 0.72)
      .setOrigin(0, 0)
      .setDepth(DEPTH.HUD)
      .setScrollFactor(0);

    const panelW = BASE_WIDTH - 80;
    const panelH = BASE_HEIGHT - 200;
    const panelX = BASE_WIDTH / 2;
    const panelY = BASE_HEIGHT / 2;

    const g = this.add.graphics().setDepth(DEPTH.HUD + 1).setScrollFactor(0);
    g.fillStyle(0x1a2a4a, 1);
    g.fillRoundedRect(panelX - panelW / 2, panelY - panelH / 2, panelW, panelH, 28);
    g.lineStyle(3, 0x5588cc, 1);
    g.strokeRoundedRect(panelX - panelW / 2, panelY - panelH / 2, panelW, panelH, 28);
  }

  private createHeader(): void {
    const depth = DEPTH.HUD + 2;

    this.add.text(BASE_WIDTH / 2, 130, '🎡 룰렛', {
      fontSize: '64px',
      fontStyle: 'bold',
      color: '#ffe066',
      stroke: '#aa6600',
      strokeThickness: 6,
    }).setOrigin(0.5).setDepth(depth).setScrollFactor(0);

    const coins = this.saveManager.getCoins();
    const diamonds = this.saveManager.getDiamonds();

    this.add.text(BASE_WIDTH / 2, 210, `🪙 ${coins}   💎 ${diamonds}`, {
      fontSize: '38px',
      color: '#ffffff',
    }).setOrigin(0.5).setDepth(depth).setScrollFactor(0);
  }

  private createBody(): void {
    const depth = DEPTH.HUD + 2;
    const cx = BASE_WIDTH / 2;

    // 룰렛 휠 임시 그래픽
    this.drawWheelPlaceholder(cx, 430, 160, depth);

    // 스핀 가능 여부 안내
    const canFree = this.saveManager.canFreeRoulette();
    const paidUsed = this.saveManager.getPaidRouletteSpinsToday();
    const costs = [2, 3, 5];

    const freeLabel = canFree ? '무료 스핀 1회 남음!' : '오늘 무료 스핀 사용 완료';
    this.add.text(cx, 630, freeLabel, {
      fontSize: '36px',
      color: canFree ? '#66ff88' : '#888888',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(depth).setScrollFactor(0);

    if (paidUsed < costs.length) {
      const nextCost = costs[paidUsed]!;
      this.add.text(cx, 690, `다음 유료 스핀: 💎 ${nextCost}  (${paidUsed}/3 사용)`, {
        fontSize: '30px',
        color: '#aaddff',
      }).setOrigin(0.5).setDepth(depth).setScrollFactor(0);
    } else {
      this.add.text(cx, 690, '오늘 추가 스핀 소진 (내일 초기화)', {
        fontSize: '30px',
        color: '#888888',
      }).setOrigin(0.5).setDepth(depth).setScrollFactor(0);
    }

    this.add.text(cx, BASE_HEIGHT - 260, '— 스핀 기능 개발 중 —', {
      fontSize: '32px',
      color: '#556688',
      fontStyle: 'italic',
    }).setOrigin(0.5).setDepth(depth).setScrollFactor(0);
  }

  private drawWheelPlaceholder(cx: number, cy: number, radius: number, depth: number): void {
    const g = this.add.graphics().setDepth(depth).setScrollFactor(0);
    const slotCount = 8;
    const slotColors = [0x2255cc, 0xffcc00, 0x2255cc, 0xff4444, 0x2255cc, 0xffcc00, 0x2255cc, 0x44cc88];
    const sliceAngle = (Math.PI * 2) / slotCount;

    for (let i = 0; i < slotCount; i++) {
      const startAngle = i * sliceAngle - Math.PI / 2;
      const endAngle = startAngle + sliceAngle;
      g.fillStyle(slotColors[i]!, 1);
      g.beginPath();
      g.moveTo(cx, cy);
      g.arc(cx, cy, radius, startAngle, endAngle, false);
      g.closePath();
      g.fillPath();
    }

    // 테두리
    g.lineStyle(4, 0xffffff, 0.9);
    g.strokeCircle(cx, cy, radius);
    for (let i = 0; i < slotCount; i++) {
      const angle = i * sliceAngle - Math.PI / 2;
      g.beginPath();
      g.moveTo(cx, cy);
      g.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
      g.strokePath();
    }

    // 중앙 핀
    g.fillStyle(0xffffff, 1);
    g.fillCircle(cx, cy, 16);
    g.fillStyle(0x333333, 1);
    g.fillCircle(cx, cy, 8);
  }

  private createCloseButton(): void {
    const depth = DEPTH.HUD + 3;
    const bx = BASE_WIDTH - 80;
    const by = 80;

    const bg = this.add.graphics().setDepth(depth).setScrollFactor(0);
    bg.fillStyle(0xcc3333, 1);
    bg.fillCircle(bx, by, 36);

    const label = this.add.text(bx, by, '✕', {
      fontSize: '48px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(depth + 1).setScrollFactor(0);

    const hitArea = this.add
      .circle(bx, by, 44)
      .setDepth(depth + 2)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true });

    hitArea.on('pointerover', () => { bg.setAlpha(0.8); label.setAlpha(0.8); });
    hitArea.on('pointerout',  () => { bg.setAlpha(1);   label.setAlpha(1); });
    hitArea.on('pointerdown', () => this.closeScene());
  }

  private closeScene(): void {
    this.scene.stop();
    this.scene.resume(this.fromScene);
  }

  shutdown(): void { /* 정리 필요 시 여기에 추가 */ }
}
