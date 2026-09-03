import Phaser from 'phaser';
import type { ScoreData, JumpPatternType } from '@game-types/game';
import { BASE_WIDTH, BASE_HEIGHT } from '@config/gameConfig';
import { SCENE_KEYS, DEPTH } from '@config/constants';

// ─── 레이아웃 상수 ────────────────────────────────────────────
const BAG_X_OFFSET  = 195;  // 점수 오른쪽 주머니 X 오프셋
const BAG_START_DY  = -100; // 점수 행 기준 첫 주머니 Δy
const BAG_SPACING_Y = 65;   // 주머니 세로 간격
const MAX_BAG_ICONS = 4;    // 최대 표시 주머니 수
const BAG_RADIUS    = 22;   // 주머니 몸통 반지름

export class ResultPanel {
  private container: Phaser.GameObjects.Container;
  private bagIcons: Phaser.GameObjects.Container[] = [];

  constructor(
    scene: Phaser.Scene,
    score: ScoreData,
    isNewBest: boolean,
    pattern: JumpPatternType,
    coinsEarned: number,
    totalCoins: number,
    milestoneCount: number,
    coinBags: { coins: number }[],
  ) {
    const cx = BASE_WIDTH / 2;
    const cy = BASE_HEIGHT / 2;
    const hasBags = coinBags.length > 0;

    // ─── 배경 ────────────────────────────────────────
    const dim = scene.add
      .rectangle(0, 0, BASE_WIDTH, BASE_HEIGHT, 0x000020, 0.55)
      .setOrigin(0);

    const panel = scene.add
      .rectangle(cx, cy, 740, 1100, 0xeef8ff, 0.96)
      .setOrigin(0.5)
      .setStrokeStyle(6, 0x2255aa);

    // ─── 타이틀 ──────────────────────────────────────
    const titleStr   = isNewBest ? '🎉  NEW BEST!' : 'GAME OVER';
    const titleColor = isNewBest ? '#e06000' : '#003399';
    const title = scene.add
      .text(cx, cy - 454, titleStr, {
        fontSize: '76px', fontStyle: 'bold',
        color: titleColor, stroke: '#000033', strokeThickness: 5,
      })
      .setOrigin(0.5);

    // ─── 점수 ────────────────────────────────────────
    const scoreLabel = scene.add
      .text(cx, cy - 353, 'SCORE', { fontSize: '50px', color: '#667799' })
      .setOrigin(0.5);

    // 주머니가 있으면 점수 텍스트를 왼쪽으로 이동해 오른쪽 공간 확보
    const scoreValueX = hasBags ? cx - 70 : cx;
    const scoreValue  = scene.add
      .text(scoreValueX, cy - 230, String(score.current), {
        fontSize: '130px', fontStyle: 'bold', color: '#002288',
      })
      .setOrigin(0.5);

    // ─── 코인 주머니 아이콘 (점수 오른쪽 세로 배열) ──────
    const bagCenterX   = cx + BAG_X_OFFSET;
    const bagBaseY     = cy - 230 + BAG_START_DY;
    const visibleCount = Math.min(coinBags.length, MAX_BAG_ICONS);

    for (let i = 0; i < visibleCount; i++) {
      const bag = this.makeBagIcon(scene, BAG_RADIUS);
      bag.setPosition(bagCenterX, bagBaseY + i * BAG_SPACING_Y)
        .setAlpha(0)
        .setScale(0.4);
      this.bagIcons.push(bag);
    }

    const overflowCount = coinBags.length - visibleCount;
    const overflowLabel = overflowCount > 0
      ? scene.add
        .text(bagCenterX, bagBaseY + visibleCount * BAG_SPACING_Y,
          `+${overflowCount}`, { fontSize: '36px', fontStyle: 'bold', color: '#886600' })
        .setOrigin(0.5)
      : null;

    // ─── 최고 기록 ───────────────────────────────────
    const bestLabel = scene.add
      .text(cx, cy - 100, `최고 기록  ${score.best}`, {
        fontSize: '54px', fontStyle: 'bold', color: '#bb7700',
      })
      .setOrigin(0.5);

    // ─── 구분선 ──────────────────────────────────────
    const divider = scene.add.graphics();
    divider.lineStyle(2, 0xaabbcc, 0.6);
    divider.beginPath();
    divider.moveTo(cx - 300, cy - 48);
    divider.lineTo(cx + 300, cy - 48);
    divider.strokePath();

    // ─── 획득 코인 섹션 (항상 표시) ──────────────────
    // 섹션 배경
    const coinSectionBg = scene.add.graphics();
    coinSectionBg.fillStyle(0xFFF8DC, 0.72);
    coinSectionBg.fillRoundedRect(cx - 310, cy - 28, 620, 158, 18);
    coinSectionBg.lineStyle(2, 0xFFD700, 0.7);
    coinSectionBg.strokeRoundedRect(cx - 310, cy - 28, 620, 158, 18);

    const coinSectionLabel = scene.add
      .text(cx, cy - 4, '획득 코인', {
        fontSize: '38px', fontStyle: 'bold', color: '#886600',
      })
      .setOrigin(0.5);

    // 초기 표시값 = 점수 환산 코인 (주머니 팝 시 증가)
    const bonusTotal = coinBags.reduce((s, b) => s + b.coins, 0);
    const initCoin   = coinsEarned - bonusTotal;

    const coinAmountLabel = scene.add
      .text(cx, cy + 67, `🪙  +${initCoin}`, {
        fontSize: '68px', fontStyle: 'bold', color: '#cc7700',
        stroke: '#664400', strokeThickness: 4,
      })
      .setOrigin(0.5);

    // ─── 총 코인 ─────────────────────────────────────
    const coinTotal = scene.add
      .text(cx, cy + 170, `총 코인  ${totalCoins}`, {
        fontSize: '40px', color: '#557799',
      })
      .setOrigin(0.5);

    // ─── 마일스톤 달성 수 ─────────────────────────────
    const milestoneLabel = scene.add
      .text(cx, cy + 231, `이번 판 마일스톤  ${milestoneCount}개 달성`, {
        fontSize: '36px', color: '#2266aa', fontStyle: 'bold',
      })
      .setOrigin(0.5);

    // ─── 버튼 ────────────────────────────────────────
    const retryBtn = this.makeButton(scene, cx, cy + 330, '다시 하기', 0x1155cc, () => {
      scene.scene.start(SCENE_KEYS.GAME, { pattern });
    });

    const titleBtn = this.makeButton(scene, cx, cy + 452, '홈으로', 0x448866, () => {
      scene.scene.start(SCENE_KEYS.MAIN);
    });

    // ─── 컨테이너 구성 ───────────────────────────────
    const children: Phaser.GameObjects.GameObject[] = [
      dim, panel, title,
      scoreLabel, scoreValue,
      ...this.bagIcons,
      bestLabel, divider,
      coinSectionBg, coinSectionLabel, coinAmountLabel,
      coinTotal, milestoneLabel,
      retryBtn, titleBtn,
    ];
    if (overflowLabel) children.push(overflowLabel);

    this.container = scene.add
      .container(0, 0, children)
      .setDepth(DEPTH.HUD)
      .setScrollFactor(0);

    // ─── 주머니 등장 → 팝 → 코인 카운트업 예약 ─────────
    this.scheduleBagAnimation(scene, coinBags, coinAmountLabel, initCoin);
  }

  // ─── 주머니 애니메이션 ────────────────────────────────

  private scheduleBagAnimation(
    scene: Phaser.Scene,
    coinBags: { coins: number }[],
    coinLabel: Phaser.GameObjects.Text,
    initCoin: number,
  ): void {
    if (coinBags.length === 0) return;

    const visibleCount = this.bagIcons.length;

    // 1단계: 주머니 순서대로 등장
    for (let i = 0; i < visibleCount; i++) {
      const bag = this.bagIcons[i]!;
      scene.time.delayedCall(200 + i * 110, () => {
        scene.tweens.add({
          targets: bag,
          alpha: 1, scaleX: 1, scaleY: 1,
          duration: 320, ease: 'Back.easeOut',
        });
      });
    }

    // 2단계: 등장 완료 + 0.5초 후 하나씩 팝
    const popStartDelay = 200 + visibleCount * 110 + 500;

    // 단계별 코인 목표값 미리 계산
    const stages: { start: number; end: number }[] = [];
    let running = initCoin;
    for (const bag of coinBags) {
      stages.push({ start: running, end: running + bag.coins });
      running += bag.coins;
    }

    for (let i = 0; i < visibleCount; i++) {
      const bag   = this.bagIcons[i]!;
      const stage = stages[i]!;

      scene.time.delayedCall(popStartDelay + i * 680, () => {
        // 주머니 축소 → 소멸
        scene.tweens.add({
          targets: bag,
          scaleX: 0.05, scaleY: 0.05, alpha: 0,
          duration: 360, ease: 'Back.easeIn',
        });

        // 코인 카운트업
        const counter = { value: stage.start };
        scene.tweens.add({
          targets: counter,
          value: stage.end,
          duration: 480,
          ease: 'Quad.easeOut',
          onUpdate: () => {
            if (coinLabel.active) {
              coinLabel.setText(`🪙  +${Math.round(counter.value)}`);
            }
          },
          onComplete: () => {
            if (coinLabel.active) coinLabel.setText(`🪙  +${stage.end}`);
          },
        });

        // 팝 파티클
        this.spawnBagPopParticles(scene, bag.x, bag.y);

        // +n 플로팅 텍스트
        this.spawnCoinPopLabel(scene, stage.end - stage.start, coinLabel.x, coinLabel.y);
      });
    }
  }

  /** 주머니 팝 시 황금 파티클 */
  private spawnBagPopParticles(scene: Phaser.Scene, x: number, y: number): void {
    const count = 8;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const speed = 55 + Math.random() * 75;
      const dot   = scene.add
        .graphics()
        .setDepth(DEPTH.POPUP + 1)
        .setScrollFactor(0);
      dot.fillStyle(0xFFD700, 1);
      dot.fillCircle(0, 0, 4 + Math.random() * 5);
      dot.setPosition(x, y);

      scene.tweens.add({
        targets: dot,
        x: x + Math.cos(angle) * speed,
        y: y + Math.sin(angle) * speed,
        alpha: 0, scaleX: 0.1, scaleY: 0.1,
        duration: 480 + Math.random() * 200,
        ease: 'Cubic.easeOut',
        onComplete: () => dot.destroy(),
      });
    }
  }

  /** 주머니 팝 시 코인 획득량 플로팅 텍스트 */
  private spawnCoinPopLabel(
    scene: Phaser.Scene,
    amount: number,
    refX: number,
    refY: number,
  ): void {
    const label = scene.add
      .text(refX + 160, refY - 16, `+${amount}`, {
        fontSize: '52px', fontStyle: 'bold',
        color: '#ffcc00', stroke: '#885500', strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.POPUP + 2)
      .setScrollFactor(0)
      .setAlpha(0);

    scene.tweens.add({
      targets: label,
      y: refY - 68,
      alpha: 1,
      scaleX: 1.15, scaleY: 1.15,
      duration: 220,
      ease: 'Back.easeOut',
      onComplete: () => {
        scene.tweens.add({
          targets: label,
          y: refY - 120,
          alpha: 0,
          scaleX: 0.9, scaleY: 0.9,
          delay: 120,
          duration: 420,
          ease: 'Quad.easeIn',
          onComplete: () => label.destroy(),
        });
      },
    });
  }

  /** 코인 주머니 그래픽 Container 생성 */
  private makeBagIcon(scene: Phaser.Scene, r: number): Phaser.GameObjects.Container {
    const g = scene.add.graphics();

    g.fillStyle(0xBB8800, 1);
    g.fillCircle(0, r * 0.55 + 2, r);       // 몸통 그림자

    g.fillStyle(0xFFD700, 1);
    g.fillCircle(0, r * 0.55, r);            // 몸통

    g.fillStyle(0xFFFAA0, 0.55);
    g.fillCircle(-r * 0.28, r * 0.15, r * 0.42); // 하이라이트

    g.fillStyle(0xFFD700, 1);
    g.fillRoundedRect(-r * 0.36, -r * 0.52, r * 0.72, r * 0.65, 3); // 목

    g.fillStyle(0xBB7700, 1);
    g.fillCircle(0, -r * 0.52, r * 0.36);   // 매듭

    g.fillStyle(0xFFCC44, 0.7);
    g.fillCircle(-r * 0.1, -r * 0.60, r * 0.18); // 매듭 하이라이트

    return scene.add.container(0, 0, [g]);
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
