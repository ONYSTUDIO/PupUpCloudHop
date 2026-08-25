import Phaser from 'phaser';
import { SCENE_KEYS, DEPTH } from '@config/constants';
import { BASE_WIDTH, BASE_HEIGHT } from '@config/baseDimensions';
import { SaveManager } from '@managers/SaveManager';
import { authService } from '../services/AuthService';
import { TopHud } from '@ui/TopHud';
import { MetaIconPanel } from '@ui/MetaIconPanel';
import { JumpPatternType } from '@game-types/game';
import { UI_LAYOUT } from '@config/uiLayout';

const SELECTABLE_PATTERNS: JumpPatternType[] = [
  JumpPatternType.PATTERN_1,
  JumpPatternType.PATTERN_2,
  JumpPatternType.PATTERN_3,
];

const PATTERN_NAMES: Record<string, string> = {
  [JumpPatternType.PATTERN_1]: '패턴 1  포물선',
  [JumpPatternType.PATTERN_2]: '패턴 2  드래그',
  [JumpPatternType.PATTERN_3]: '패턴 3  타이밍',
};

export class MainScene extends Phaser.Scene {
  private saveManager!: SaveManager;
  private topHud!: TopHud;
  private rightMetaPanel!: MetaIconPanel;
  private selectedPattern: JumpPatternType = JumpPatternType.PATTERN_3;
  private patternLabel!: Phaser.GameObjects.Text;
  private authUnsub: (() => void) | null = null;

  constructor() {
    super({ key: SCENE_KEYS.MAIN });
  }

  create(): void {
    this.saveManager = new SaveManager();
    const coins    = this.saveManager.getCoins();
    const diamonds = this.saveManager.getDiamonds();

    this.drawBackground();

    // TopHud (일시정지 버튼 없음)
    this.topHud = new TopHud(this, coins, diamonds);

    // 프로필 비동기 갱신
    void this.initHudProfile();

    // 우측 메타 아이콘 패널
    this.setupMetaPanel();

    // 최고기록 텍스트
    this.addBestScore();

    // 캐릭터 (bounce tween)
    this.addCharacter();

    // 패턴 셀렉터
    this.addPatternSelector();

    // 하단 버튼 2개
    this.addBottomButtons();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
  }

  // ─── 배경 ─────────────────────────────────────────────────

  private drawBackground(): void {
    const g = this.add.graphics().setDepth(DEPTH.BACKGROUND);

    // 하늘 그라디언트 (상단 밝은 파랑 → 하단 진한 파랑)
    g.fillGradientStyle(0x87ceeb, 0x87ceeb, 0x2277cc, 0x2277cc, 1);
    g.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

    // 하단 초록 언덕
    g.fillStyle(0x55aa44, 1);
    g.fillEllipse(BASE_WIDTH / 2, BASE_HEIGHT + 80, BASE_WIDTH * 1.4, 360);
    g.fillStyle(0x44994a, 1);
    g.fillEllipse(BASE_WIDTH * 0.2, BASE_HEIGHT + 40, BASE_WIDTH * 0.9, 260);
    g.fillStyle(0x66bb55, 1);
    g.fillEllipse(BASE_WIDTH * 0.85, BASE_HEIGHT + 60, BASE_WIDTH * 0.75, 220);

    // 배경 장식 구름
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

  private drawDecorCloud(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number): void {
    g.fillStyle(0xffffff, 0.22);
    g.fillEllipse(x, y, w, h);
    g.fillEllipse(x - w * 0.22, y - h * 0.25, w * 0.42, h * 0.65);
    g.fillEllipse(x + w * 0.12, y - h * 0.35, w * 0.36, h * 0.56);
  }

  // ─── 메타 아이콘 패널 ─────────────────────────────────────

  private setupMetaPanel(): void {
    this.rightMetaPanel = new MetaIconPanel(this, 'right');
    this.rightMetaPanel.addIcon(this.createShopIcon());
    this.rightMetaPanel.addIcon(this.createRouletteIcon());
  }

  private createShopIcon(): Phaser.GameObjects.Container {
    const size = UI_LAYOUT.meta.iconSize;
    const half = size / 2;
    const container = this.add.container(0, 0);
    container.setSize(size, size).setInteractive({ useHandCursor: true });

    const bg = this.add.graphics();
    bg.fillStyle(0xffffff, 0.88);
    bg.fillRoundedRect(-half, -half, size, size, 20);
    bg.lineStyle(3, 0x88aaee, 1);
    bg.strokeRoundedRect(-half, -half, size, size, 20);

    const cart = this.add.graphics();
    cart.lineStyle(6, 0x2255cc, 1);
    cart.fillStyle(0x2255cc, 1);
    cart.strokeRect(-22, -18, 44, 30);
    cart.beginPath();
    cart.moveTo(-22, -18);
    cart.lineTo(-32, -34);
    cart.lineTo(-46, -34);
    cart.strokePath();
    cart.fillCircle(-12, 22, 8);
    cart.fillCircle(16, 22, 8);

    const label = this.add.text(0, half - 24, '상점', {
      fontSize: '26px', color: '#2255cc', fontStyle: 'bold',
    }).setOrigin(0.5, 0.5);

    container.add([bg, cart, label]);
    container.on('pointerdown', () => {
      this.scene.launch(SCENE_KEYS.SHOP, { from: SCENE_KEYS.MAIN });
    });

    return container;
  }

  private createRouletteIcon(): Phaser.GameObjects.Container {
    const size = UI_LAYOUT.meta.iconSize;
    const half = size / 2;
    const container = this.add.container(0, 0);
    container.setSize(size, size).setInteractive({ useHandCursor: true });

    const bg = this.add.graphics();
    bg.fillStyle(0xffffff, 0.88);
    bg.fillRoundedRect(-half, -half, size, size, 20);
    bg.lineStyle(3, 0xcc88ee, 1);
    bg.strokeRoundedRect(-half, -half, size, size, 20);

    const wheel = this.add.graphics();
    const wCx = 0;
    const wCy = -12;
    const wR = 28;
    const slotCount = 8;
    const sliceAngle = (Math.PI * 2) / slotCount;
    const wheelColors = [0x2255cc, 0xffcc00, 0xcc2222, 0x22aa66, 0x2255cc, 0xffcc00, 0xcc2222, 0x22aa66];
    for (let i = 0; i < slotCount; i++) {
      const sa = i * sliceAngle - Math.PI / 2;
      const ea = sa + sliceAngle;
      wheel.fillStyle(wheelColors[i]!, 1);
      wheel.beginPath();
      wheel.moveTo(wCx, wCy);
      wheel.arc(wCx, wCy, wR, sa, ea, false);
      wheel.closePath();
      wheel.fillPath();
    }
    wheel.lineStyle(2, 0x333333, 0.8);
    wheel.strokeCircle(wCx, wCy, wR);
    wheel.fillStyle(0xffffff, 1);
    wheel.fillCircle(wCx, wCy, 7);
    wheel.fillStyle(0x333333, 1);
    wheel.fillCircle(wCx, wCy, 4);

    const label = this.add.text(0, half - 24, '룰렛', {
      fontSize: '26px', color: '#882299', fontStyle: 'bold',
    }).setOrigin(0.5, 0.5);

    container.add([bg, wheel, label]);

    // 무료 스핀 뱃지
    if (this.saveManager.canFreeRoulette()) {
      const badgeBg = this.add.graphics();
      badgeBg.fillStyle(0xee2222, 1);
      badgeBg.fillRoundedRect(half - 52, -half, 52, 28, 8);
      const badgeText = this.add.text(half - 26, -half + 14, 'FREE', {
        fontSize: '20px', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5, 0.5);
      container.add([badgeBg, badgeText]);
    }

    container.on('pointerdown', () => {
      this.scene.launch(SCENE_KEYS.ROULETTE, { from: SCENE_KEYS.MAIN });
    });

    return container;
  }

  // ─── 최고기록 ──────────────────────────────────────────────

  private addBestScore(): void {
    const best = this.saveManager.getBestScore();
    this.add
      .text(BASE_WIDTH / 2, BASE_HEIGHT * 0.38, `최고 기록  ${best}`, {
        fontSize: '54px', fontStyle: 'bold',
        color: '#ffdd44', stroke: '#003399', strokeThickness: 6,
      })
      .setOrigin(0.5).setDepth(DEPTH.HUD);
  }

  // ─── 캐릭터 ───────────────────────────────────────────────

  private addCharacter(): void {
    const cx = BASE_WIDTH / 2;
    const cy = BASE_HEIGHT * 0.52;

    const dogG = this.add.graphics().setDepth(DEPTH.HUD);
    dogG.setPosition(cx, cy);
    this.drawMiniDog(dogG);

    // 위아래 bounce tween
    this.tweens.add({
      targets: dogG,
      y: cy - 15,
      duration: 1000,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });
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

  // ─── 패턴 셀렉터 ──────────────────────────────────────────

  private addPatternSelector(): void {
    const cx = BASE_WIDTH / 2;
    const cy = BASE_HEIGHT * 0.72;
    const panelW = 860;
    const panelH = 140;

    this.add
      .rectangle(cx, cy, panelW, panelH, 0x001166, 0.55)
      .setOrigin(0.5).setDepth(DEPTH.HUD - 1)
      .setStrokeStyle(2, 0x4466cc, 0.7);

    this.add
      .text(cx, cy - 34, '조작 방식', {
        fontSize: '36px', color: '#99aaee',
      })
      .setOrigin(0.5).setDepth(DEPTH.HUD);

    this.add
      .text(cx - 370, cy + 22, '◀', {
        fontSize: '60px', color: '#ffffff',
      })
      .setOrigin(0.5).setDepth(DEPTH.HUD)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.cyclePattern(-1))
      .on('pointerover', function (this: Phaser.GameObjects.Text) { this.setAlpha(0.7); })
      .on('pointerout',  function (this: Phaser.GameObjects.Text) { this.setAlpha(1); });

    this.patternLabel = this.add
      .text(cx, cy + 22, '', {
        fontSize: '52px', fontStyle: 'bold', color: '#ffffff',
      })
      .setOrigin(0.5).setDepth(DEPTH.HUD);

    this.add
      .text(cx + 370, cy + 22, '▶', {
        fontSize: '60px', color: '#ffffff',
      })
      .setOrigin(0.5).setDepth(DEPTH.HUD)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.cyclePattern(1))
      .on('pointerover', function (this: Phaser.GameObjects.Text) { this.setAlpha(0.7); })
      .on('pointerout',  function (this: Phaser.GameObjects.Text) { this.setAlpha(1); });

    this.updatePatternLabel();
  }

  private cyclePattern(dir: 1 | -1): void {
    const idx = SELECTABLE_PATTERNS.indexOf(this.selectedPattern);
    const next = (idx + dir + SELECTABLE_PATTERNS.length) % SELECTABLE_PATTERNS.length;
    this.selectedPattern = SELECTABLE_PATTERNS[next]!;
    this.updatePatternLabel();
  }

  private updatePatternLabel(): void {
    this.patternLabel.setText(PATTERN_NAMES[this.selectedPattern] ?? '');
  }

  // ─── 하단 버튼 2개 ────────────────────────────────────────

  private addBottomButtons(): void {
    const cx = BASE_WIDTH / 2;
    const cy = BASE_HEIGHT * 0.88;
    const btnW = 380;
    const btnH = 120;
    const gap  = 40;

    // 업그레이드 버튼 (좌)
    const upgradeX = cx - btnW / 2 - gap / 2;
    const upgradeBg = this.add.graphics();
    upgradeBg.fillStyle(0x445599, 1);
    upgradeBg.fillRoundedRect(upgradeX - btnW / 2, cy - btnH / 2, btnW, btnH, 20);
    this.add
      .text(upgradeX, cy, '업그레이드', {
        fontSize: '48px', fontStyle: 'bold', color: '#ffffff',
      })
      .setOrigin(0.5).setDepth(DEPTH.HUD)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.scene.launch(SCENE_KEYS.SHOP, { from: SCENE_KEYS.MAIN, tab: 'upgrade' });
      })
      .on('pointerover', () => upgradeBg.setAlpha(0.8))
      .on('pointerout',  () => upgradeBg.setAlpha(1));

    upgradeBg.setDepth(DEPTH.HUD - 1);

    // 게임 시작 버튼 (우)
    const startX = cx + btnW / 2 + gap / 2;
    const startBg = this.add.graphics();
    startBg.fillStyle(0x1155cc, 1);
    startBg.fillRoundedRect(startX - btnW / 2, cy - btnH / 2, btnW, btnH, 20);
    const startTxt = this.add
      .text(startX, cy, '게임 시작', {
        fontSize: '54px', fontStyle: 'bold', color: '#ffffff',
      })
      .setOrigin(0.5).setDepth(DEPTH.HUD)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.scene.start(SCENE_KEYS.GAME, { pattern: this.selectedPattern });
      })
      .on('pointerover', () => startBg.setAlpha(0.8))
      .on('pointerout',  () => startBg.setAlpha(1));

    startBg.setDepth(DEPTH.HUD - 1);

    // 게임 시작 버튼 pulse tween
    this.tweens.add({
      targets: startTxt,
      scaleX: 1.04, scaleY: 1.04,
      duration: 700, ease: 'Sine.easeInOut',
      yoyo: true, repeat: -1,
    });
  }

  // ─── 프로필 비동기 갱신 ───────────────────────────────────

  private async initHudProfile(): Promise<void> {
    const user = await authService.getUser();
    if (!user || !this.scene.isActive(SCENE_KEYS.MAIN)) return;
    const isGuest = user.is_anonymous === true;
    const name = isGuest
      ? '게스트'
      : ((user.user_metadata?.['full_name'] as string | undefined)
          ?? user.email
          ?? '플레이어');
    this.topHud.updateProfile(name, isGuest);
  }

  // ─── shutdown ─────────────────────────────────────────────

  private shutdown(): void {
    this.authUnsub?.();
    this.authUnsub = null;
    this.topHud?.destroy();
    this.rightMetaPanel?.destroy();
  }
}
