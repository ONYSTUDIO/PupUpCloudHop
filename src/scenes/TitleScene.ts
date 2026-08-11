import Phaser from 'phaser';
import { SCENE_KEYS, DEPTH } from '@config/constants';
import { BASE_WIDTH, BASE_HEIGHT } from '@config/gameConfig';
import { SaveManager } from '@managers/SaveManager';
import { JumpPatternType } from '@game-types/game';

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

export class TitleScene extends Phaser.Scene {
  private saveManager!: SaveManager;
  private selectedPattern: JumpPatternType = JumpPatternType.PATTERN_3;
  private patternLabel!: Phaser.GameObjects.Text;
  private useShield: boolean = true;
  private shieldCheckGraphics!: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: SCENE_KEYS.TITLE });
  }

  create(): void {
    this.saveManager = new SaveManager();
    this.drawBackground();
    this.addTitle();
    this.addBestScore();
    this.addPatternSelector();
    this.addShieldToggle();
    this.addStartButton();
  }

  // ─── 배경 ────────────────────────────────────────────────

  private drawBackground(): void {
    const g = this.add.graphics().setDepth(DEPTH.BACKGROUND);
    g.fillGradientStyle(0x87ceeb, 0x87ceeb, 0x2277cc, 0x2277cc, 1);
    g.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

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

  // ─── 타이틀 ───────────────────────────────────────────────

  private addTitle(): void {
    const cx = BASE_WIDTH / 2;
    this.add
      .rectangle(cx, BASE_HEIGHT * 0.3, 900, 380, 0x003399, 0.35)
      .setOrigin(0.5)
      .setDepth(DEPTH.HUD - 1);

    this.add
      .text(cx, BASE_HEIGHT * 0.23, '안 떨어질개', {
        fontSize: '110px', fontStyle: 'bold',
        color: '#ffffff', stroke: '#001166', strokeThickness: 10,
      })
      .setOrigin(0.5).setDepth(DEPTH.HUD);

    this.add
      .text(cx, BASE_HEIGHT * 0.35, 'Pup Up!  Cloud Hop', {
        fontSize: '58px', color: '#ffe066',
        stroke: '#001166', strokeThickness: 6,
      })
      .setOrigin(0.5).setDepth(DEPTH.HUD);

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

  // ─── 최고 기록 ────────────────────────────────────────────

  private addBestScore(): void {
    const best = this.saveManager.getBestScore();
    this.add
      .text(BASE_WIDTH / 2, BASE_HEIGHT * 0.66, `최고 기록  ${best}`, {
        fontSize: '58px', fontStyle: 'bold',
        color: '#ffdd44', stroke: '#003399', strokeThickness: 6,
      })
      .setOrigin(0.5).setDepth(DEPTH.HUD);
  }

  // ─── 패턴 셀렉터 ─────────────────────────────────────────

  private addPatternSelector(): void {
    const cx = BASE_WIDTH / 2;
    const cy = BASE_HEIGHT * 0.76;
    const panelW = 860;
    const panelH = 140;

    // 패널 배경
    this.add
      .rectangle(cx, cy, panelW, panelH, 0x001166, 0.55)
      .setOrigin(0.5).setDepth(DEPTH.HUD - 1)
      .setStrokeStyle(2, 0x4466cc, 0.7);

    // 라벨
    this.add
      .text(cx, cy - 34, '조작 방식', {
        fontSize: '36px', color: '#99aaee',
      })
      .setOrigin(0.5).setDepth(DEPTH.HUD);

    // 왼쪽 화살표
    this.add
      .text(cx - 370, cy + 22, '◀', {
        fontSize: '60px', color: '#ffffff',
      })
      .setOrigin(0.5).setDepth(DEPTH.HUD)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.cyclePattern(-1))
      .on('pointerover', function (this: Phaser.GameObjects.Text) { this.setAlpha(0.7); })
      .on('pointerout',  function (this: Phaser.GameObjects.Text) { this.setAlpha(1); });

    // 패턴 이름 (중앙)
    this.patternLabel = this.add
      .text(cx, cy + 22, '', {
        fontSize: '52px', fontStyle: 'bold', color: '#ffffff',
      })
      .setOrigin(0.5).setDepth(DEPTH.HUD);

    // 오른쪽 화살표
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

  // ─── 방어막 토글 (테스트 전용) ───────────────────────────

  private addShieldToggle(): void {
    const cx = BASE_WIDTH / 2;
    const cy = BASE_HEIGHT * 0.845;
    const panelW = 860;
    const panelH = 100;

    // 패널 배경
    this.add
      .rectangle(cx, cy, panelW, panelH, 0x001144, 0.50)
      .setOrigin(0.5).setDepth(DEPTH.HUD - 1)
      .setStrokeStyle(2, 0x4466cc, 0.5);

    // 체크박스 그래픽
    this.shieldCheckGraphics = this.add.graphics().setDepth(DEPTH.HUD);
    this.drawShieldCheckbox();

    // 체크박스 히트 영역
    const checkSize = 52;
    const checkX = cx - 340;
    this.add
      .rectangle(checkX, cy, checkSize, checkSize, 0xffffff, 0)
      .setOrigin(0.5).setDepth(DEPTH.HUD)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.useShield = !this.useShield;
        this.drawShieldCheckbox();
      });

    // 레이블
    this.add
      .text(cx - 300, cy, '🫧  방어막 사용  (테스트)', {
        fontSize: '38px', color: '#aaccff',
      })
      .setOrigin(0, 0.5).setDepth(DEPTH.HUD);
  }

  private drawShieldCheckbox(): void {
    const cx = BASE_WIDTH / 2;
    const cy = BASE_HEIGHT * 0.845;
    const checkX = cx - 340;
    const s = 44;

    const g = this.shieldCheckGraphics;
    g.clear();

    // 박스 배경
    g.fillStyle(0x002266, 0.8);
    g.fillRoundedRect(checkX - s / 2, cy - s / 2, s, s, 8);

    // 테두리
    g.lineStyle(2.5, this.useShield ? 0x66aaff : 0x445588, 0.9);
    g.strokeRoundedRect(checkX - s / 2, cy - s / 2, s, s, 8);

    // 체크 표시
    if (this.useShield) {
      g.lineStyle(4, 0x88ddff, 1);
      g.beginPath();
      g.moveTo(checkX - s * 0.28, cy + s * 0.02);
      g.lineTo(checkX - s * 0.06, cy + s * 0.26);
      g.lineTo(checkX + s * 0.32, cy - s * 0.22);
      g.strokePath();
    }
  }

  // ─── 시작 버튼 ────────────────────────────────────────────

  private addStartButton(): void {
    const cx = BASE_WIDTH / 2;
    const cy = BASE_HEIGHT * 0.934;

    const btn = this.add
      .text(cx, cy, '  게임 시작  ', {
        fontSize: '72px', fontStyle: 'bold',
        color: '#ffffff', backgroundColor: '#1155cc',
        padding: { x: 60, y: 28 },
      })
      .setOrigin(0.5).setDepth(DEPTH.HUD)
      .setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => btn.setAlpha(0.85));
    btn.on('pointerout',  () => btn.setAlpha(1));
    btn.on('pointerdown', () =>
      this.scene.start(SCENE_KEYS.GAME, {
        pattern: this.selectedPattern,
        useShield: this.useShield,
      }),
    );

    this.tweens.add({
      targets: btn,
      scaleX: 1.04, scaleY: 1.04,
      duration: 700, ease: 'Sine.easeInOut',
      yoyo: true, repeat: -1,
    });
  }
}
