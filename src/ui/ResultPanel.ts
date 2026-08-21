import Phaser from 'phaser';
import type { ScoreData, JumpPatternType } from '@game-types/game';
import { BASE_WIDTH, BASE_HEIGHT } from '@config/gameConfig';
import { SCENE_KEYS, DEPTH } from '@config/constants';

export class ResultPanel {
  private container: Phaser.GameObjects.Container;

  constructor(
    scene: Phaser.Scene,
    score: ScoreData,
    isNewBest: boolean,
    pattern: JumpPatternType,
    coinsEarned: number,
    totalCoins: number,
  ) {
    const cx = BASE_WIDTH / 2;
    const cy = BASE_HEIGHT / 2;

    const dim = scene.add
      .rectangle(0, 0, BASE_WIDTH, BASE_HEIGHT, 0x000020, 0.55)
      .setOrigin(0);

    const panel = scene.add
      .rectangle(cx, cy, 740, 940, 0xeef8ff, 0.96)
      .setOrigin(0.5)
      .setStrokeStyle(6, 0x2255aa);

    // ─── 타이틀 ──────────────────────────────────────
    const titleStr = isNewBest ? '🎉  NEW BEST!' : 'GAME OVER';
    const titleColor = isNewBest ? '#e06000' : '#003399';
    const title = scene.add
      .text(cx, cy - 380, titleStr, {
        fontSize: '76px', fontStyle: 'bold',
        color: titleColor, stroke: '#000033', strokeThickness: 5,
      })
      .setOrigin(0.5);

    // ─── 점수 ────────────────────────────────────────
    const scoreLabel = scene.add
      .text(cx, cy - 235, 'SCORE', { fontSize: '50px', color: '#667799' })
      .setOrigin(0.5);

    const scoreValue = scene.add
      .text(cx, cy - 155, String(score.current), {
        fontSize: '130px', fontStyle: 'bold', color: '#002288',
      })
      .setOrigin(0.5);

    const bestLabel = scene.add
      .text(cx, cy + 20, `최고 기록  ${score.best}`, {
        fontSize: '54px', fontStyle: 'bold', color: '#bb7700',
      })
      .setOrigin(0.5);

    // ─── 구분선 ──────────────────────────────────────
    const divider = scene.add.graphics();
    divider.lineStyle(2, 0xaabbcc, 0.6);
    divider.beginPath();
    divider.moveTo(cx - 300, cy + 100);
    divider.lineTo(cx + 300, cy + 100);
    divider.strokePath();

    // ─── 코인 획득 ───────────────────────────────────
    const coinEarned = scene.add
      .text(cx, cy + 155, `🪙  +${coinsEarned}`, {
        fontSize: '72px', fontStyle: 'bold', color: '#cc8800',
        stroke: '#664400', strokeThickness: 4,
      })
      .setOrigin(0.5);

    const coinTotal = scene.add
      .text(cx, cy + 240, `총 코인  ${totalCoins}`, {
        fontSize: '42px', color: '#557799',
      })
      .setOrigin(0.5);

    // ─── 버튼 ────────────────────────────────────────
    const retryBtn = this.makeButton(scene, cx, cy + 340, '다시 하기', 0x1155cc, () => {
      scene.scene.start(SCENE_KEYS.GAME, { pattern });
    });

    const titleBtn = this.makeButton(scene, cx, cy + 450, '타이틀로', 0x448866, () => {
      scene.scene.start(SCENE_KEYS.TITLE);
    });

    this.container = scene.add
      .container(0, 0, [
        dim, panel, title,
        scoreLabel, scoreValue, bestLabel,
        divider, coinEarned, coinTotal,
        retryBtn, titleBtn,
      ])
      .setDepth(DEPTH.HUD)
      .setScrollFactor(0);
  }

  private makeButton(
    scene: Phaser.Scene,
    x: number, y: number,
    label: string, color: number,
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

  destroy(): void {
    this.container.destroy();
  }
}
