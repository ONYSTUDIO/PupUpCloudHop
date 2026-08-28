import Phaser from 'phaser';
import { BASE_WIDTH, BASE_HEIGHT } from '@config/baseDimensions';
import { DEPTH } from '@config/constants';
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

export interface CheatSettings {
  pattern: JumpPatternType;
  startWithShield: boolean;
  startWithMagnet: boolean;
}

const CX = BASE_WIDTH / 2;
const CY = BASE_HEIGHT / 2;
const PANEL_W = 780;
const PANEL_H = 880;

export class CheatPopup {
  private objs: Phaser.GameObjects.GameObject[] = [];
  private destroyed = false;

  private pattern: JumpPatternType;
  private shield: boolean;
  private magnet: boolean;

  private patternLbl!: Phaser.GameObjects.Text;
  private shieldBtn!: Phaser.GameObjects.Text;
  private magnetBtn!: Phaser.GameObjects.Text;

  constructor(
    scene: Phaser.Scene,
    initial: CheatSettings,
    onClose: (s: CheatSettings) => void,
    onResetMissions: () => void,
  ) {
    this.pattern = initial.pattern;
    this.shield = initial.startWithShield;
    this.magnet = initial.startWithMagnet;

    // ── dim overlay ──────────────────────────────────────────
    this.reg(
      scene.add.rectangle(0, 0, BASE_WIDTH, BASE_HEIGHT, 0x000020, 0.65)
        .setOrigin(0).setScrollFactor(0).setDepth(DEPTH.POPUP),
    );

    // ── 패널 ─────────────────────────────────────────────────
    this.reg(
      scene.add.rectangle(CX, CY, PANEL_W, PANEL_H, 0x0d1b33, 0.97)
        .setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.POPUP)
        .setStrokeStyle(4, 0x4488cc),
    );

    // ── 제목 ─────────────────────────────────────────────────
    this.reg(
      scene.add.text(CX, CY - 325, '테스트 설정', {
        fontSize: '64px', fontStyle: 'bold',
        color: '#ffee44', stroke: '#443300', strokeThickness: 5,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.POPUP),
    );

    // ── 패턴 선택 ────────────────────────────────────────────
    this.reg(
      scene.add.text(CX, CY - 200, '조작 방식', {
        fontSize: '40px', color: '#99aaee',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.POPUP),
    );

    this.reg(
      scene.add.text(CX - 320, CY - 120, '◀', {
        fontSize: '64px', color: '#ffffff',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.POPUP)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.cyclePattern(-1))
        .on('pointerover', function (this: Phaser.GameObjects.Text) { this.setAlpha(0.7); })
        .on('pointerout',  function (this: Phaser.GameObjects.Text) { this.setAlpha(1); }),
    );

    this.patternLbl = scene.add.text(CX, CY - 120, '', {
      fontSize: '50px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.POPUP);
    this.reg(this.patternLbl);
    this.updatePatternLabel();

    this.reg(
      scene.add.text(CX + 320, CY - 120, '▶', {
        fontSize: '64px', color: '#ffffff',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.POPUP)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.cyclePattern(1))
        .on('pointerover', function (this: Phaser.GameObjects.Text) { this.setAlpha(0.7); })
        .on('pointerout',  function (this: Phaser.GameObjects.Text) { this.setAlpha(1); }),
    );

    // ── 구분선 ───────────────────────────────────────────────
    const divG = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH.POPUP);
    divG.lineStyle(1, 0x334466, 0.7);
    divG.beginPath();
    divG.moveTo(CX - PANEL_W / 2 + 40, CY + 0);
    divG.lineTo(CX + PANEL_W / 2 - 40, CY + 0);
    divG.strokePath();
    this.reg(divG);

    // ── 방어막 토글 ──────────────────────────────────────────
    this.reg(
      scene.add.text(CX - 80, CY + 75, '방어막 시작', {
        fontSize: '46px', color: '#ccddff',
      }).setOrigin(1, 0.5).setScrollFactor(0).setDepth(DEPTH.POPUP),
    );
    this.shieldBtn = this.makeToggleBtn(scene, CX + 120, CY + 75, this.shield, () => {
      this.shield = !this.shield;
      this.refreshToggle(this.shieldBtn, this.shield);
    });

    // ── 자석 토글 ────────────────────────────────────────────
    this.reg(
      scene.add.text(CX - 80, CY + 195, '자석 시작', {
        fontSize: '46px', color: '#ccddff',
      }).setOrigin(1, 0.5).setScrollFactor(0).setDepth(DEPTH.POPUP),
    );
    this.magnetBtn = this.makeToggleBtn(scene, CX + 120, CY + 195, this.magnet, () => {
      this.magnet = !this.magnet;
      this.refreshToggle(this.magnetBtn, this.magnet);
    });

    // ── 구분선 2 ─────────────────────────────────────────────
    const divG2 = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH.POPUP);
    divG2.lineStyle(1, 0x334466, 0.7);
    divG2.beginPath();
    divG2.moveTo(CX - PANEL_W / 2 + 40, CY + 238);
    divG2.lineTo(CX + PANEL_W / 2 - 40, CY + 238);
    divG2.strokePath();
    this.reg(divG2);

    // ── 미션 초기화 ──────────────────────────────────────────
    this.reg(
      scene.add.text(CX - 80, CY + 300, '미션 초기화', {
        fontSize: '46px', color: '#ffccaa',
      }).setOrigin(1, 0.5).setScrollFactor(0).setDepth(DEPTH.POPUP),
    );
    const resetBtn = scene.add.text(CX + 120, CY + 300, '초기화', {
      fontSize: '44px', fontStyle: 'bold', color: '#ffffff',
      backgroundColor: '#883311', padding: { x: 32, y: 14 },
      fixedWidth: 160, align: 'center',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.POPUP)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', function (this: Phaser.GameObjects.Text) { this.setAlpha(0.85); })
      .on('pointerout',  function (this: Phaser.GameObjects.Text) { this.setAlpha(1); })
      .on('pointerdown', () => {
        onResetMissions();
        resetBtn.setText('완료!');
        scene.time.delayedCall(1200, () => {
          if (!this.destroyed) resetBtn.setText('초기화');
        });
      });
    this.reg(resetBtn);

    // ── 닫기 버튼 ────────────────────────────────────────────
    this.reg(
      scene.add.text(CX, CY + 410, '닫기', {
        fontSize: '56px', fontStyle: 'bold', color: '#ffffff',
        backgroundColor: '#2a5a80', padding: { x: 80, y: 22 },
      }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.POPUP)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', function (this: Phaser.GameObjects.Text) { this.setAlpha(0.85); })
        .on('pointerout',  function (this: Phaser.GameObjects.Text) { this.setAlpha(1); })
        .on('pointerdown', () => {
          if (this.destroyed) return;
          onClose({
            pattern: this.pattern,
            startWithShield: this.shield,
            startWithMagnet: this.magnet,
          });
          this.destroy();
        }),
    );
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

  private makeToggleBtn(
    scene: Phaser.Scene,
    x: number,
    y: number,
    initialOn: boolean,
    onClick: () => void,
  ): Phaser.GameObjects.Text {
    const btn = scene.add.text(x, y, initialOn ? 'ON' : 'OFF', {
      fontSize: '44px', fontStyle: 'bold', color: '#ffffff',
      backgroundColor: initialOn ? '#1a7a38' : '#7a2222',
      padding: { x: 32, y: 14 },
      fixedWidth: 160,
      align: 'center',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.POPUP)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', function (this: Phaser.GameObjects.Text) { this.setAlpha(0.85); })
      .on('pointerout',  function (this: Phaser.GameObjects.Text) { this.setAlpha(1); })
      .on('pointerdown', onClick);
    this.reg(btn);
    return btn;
  }

  private refreshToggle(btn: Phaser.GameObjects.Text, on: boolean): void {
    btn.setText(on ? 'ON' : 'OFF');
    btn.setStyle({ backgroundColor: on ? '#1a7a38' : '#7a2222' });
  }

  private cyclePattern(dir: 1 | -1): void {
    const idx = SELECTABLE_PATTERNS.indexOf(this.pattern);
    const next = (idx + dir + SELECTABLE_PATTERNS.length) % SELECTABLE_PATTERNS.length;
    this.pattern = SELECTABLE_PATTERNS[next]!;
    this.updatePatternLabel();
  }

  private updatePatternLabel(): void {
    this.patternLbl.setText(PATTERN_NAMES[this.pattern] ?? '');
  }
}
