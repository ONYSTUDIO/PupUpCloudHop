import Phaser from 'phaser';
import { BASE_WIDTH, BASE_HEIGHT } from '@config/baseDimensions';
import { DEPTH } from '@config/constants';
import type { SaveManager } from '@managers/SaveManager';

const CX = BASE_WIDTH / 2;

const PANEL_W = 1020;
const PANEL_H = 720;
const PANEL_L = CX - PANEL_W / 2;
const PANEL_T = BASE_HEIGHT / 2 - PANEL_H / 2;
const PANEL_B = PANEL_T + PANEL_H;

const CELL_W = 128;
const CELL_H = 240;
const CELL_GAP = 12;
const CELLS_LEFT = CX - (7 * CELL_W + 6 * CELL_GAP) / 2;

const TITLE_Y     = PANEL_T + 80;
const GRID_CY     = PANEL_T + 290;
const CLAIM_BTN_Y = PANEL_B - 210;
const CLOSE_BTN_Y = PANEL_B - 90;

const REWARD_DEFS = [
  { icon: '🪙', val: '30' },
  { icon: '🪙', val: '50' },
  { icon: '🛡️', val: '방어막' },
  { icon: '🪙', val: '80' },
  { icon: '💫', val: '부활' },
  { icon: '🪙', val: '100' },
  { icon: '💎', val: '×3' },
] as const;

function cellCX(i: number): number {
  return CELLS_LEFT + i * (CELL_W + CELL_GAP) + CELL_W / 2;
}

export class AttendancePopup {
  private objs: Phaser.GameObjects.GameObject[] = [];
  private destroyed = false;

  constructor(
    scene: Phaser.Scene,
    saveManager: SaveManager,
    onClaimed: () => void,
    onClose: () => void,
  ) {
    const { isNewDay, dayIndex } = saveManager.checkAttendance();
    const dayClaimed = saveManager.getAttendanceDayClaimed();
    const alreadyClaimed = !isNewDay;

    // ── 어둠 오버레이
    this.reg(
      scene.add
        .rectangle(0, 0, BASE_WIDTH, BASE_HEIGHT, 0x000010, 0.72)
        .setOrigin(0)
        .setScrollFactor(0)
        .setDepth(DEPTH.POPUP),
    );

    // ── 패널
    const panelG = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH.POPUP);
    panelG.fillStyle(0x0a1628, 0.97);
    panelG.fillRoundedRect(PANEL_L, PANEL_T, PANEL_W, PANEL_H, 20);
    panelG.lineStyle(3, 0x3366aa, 1);
    panelG.strokeRoundedRect(PANEL_L, PANEL_T, PANEL_W, PANEL_H, 20);
    this.reg(panelG);

    // ── 제목
    this.reg(
      scene.add
        .text(CX, TITLE_Y, '📅  오늘의 출석 보상', {
          fontSize: '56px',
          fontStyle: 'bold',
          color: '#ffffff',
          stroke: '#001133',
          strokeThickness: 5,
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(DEPTH.POPUP),
    );

    // ── 구분선
    const sepG = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH.POPUP);
    sepG.lineStyle(1, 0x334466, 0.7);
    sepG.beginPath();
    sepG.moveTo(PANEL_L + 30, TITLE_Y + 56);
    sepG.lineTo(PANEL_L + PANEL_W - 30, TITLE_Y + 56);
    sepG.strokePath();
    this.reg(sepG);

    // ── 7일 칸 그리드
    for (let i = 0; i < 7; i++) {
      this.buildCell(scene, i, dayIndex, dayClaimed);
    }

    // ── 수령 버튼
    let claimed = alreadyClaimed;

    const claimBtnW = 560;
    const claimBtnH = 92;
    const claimBtnBg = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH.POPUP);

    const drawClaimBg = (active: boolean): void => {
      claimBtnBg.clear();
      claimBtnBg.fillStyle(active ? 0xbb8800 : 0x1e1e2a, 1);
      claimBtnBg.fillRoundedRect(
        CX - claimBtnW / 2, CLAIM_BTN_Y - claimBtnH / 2, claimBtnW, claimBtnH, 18,
      );
      if (active) {
        claimBtnBg.lineStyle(2, 0xffcc22, 1);
        claimBtnBg.strokeRoundedRect(
          CX - claimBtnW / 2, CLAIM_BTN_Y - claimBtnH / 2, claimBtnW, claimBtnH, 18,
        );
      }
    };
    drawClaimBg(!alreadyClaimed);
    this.reg(claimBtnBg);

    const claimBtnTxt = scene.add
      .text(CX, CLAIM_BTN_Y, alreadyClaimed ? '내일 또 만나요!' : '오늘 보상 받기', {
        fontSize: '48px',
        fontStyle: 'bold',
        color: alreadyClaimed ? '#556677' : '#ffffff',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH.POPUP)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => { if (!claimed) claimBtnBg.setAlpha(0.85); })
      .on('pointerout',  () => { claimBtnBg.setAlpha(1); })
      .on('pointerdown', () => {
        if (claimed || this.destroyed) return;
        claimed = true;
        saveManager.claimAttendance();
        onClaimed();

        drawClaimBg(false);
        claimBtnTxt
          .setText('내일 또 만나요!')
          .setColor('#556677')
          .removeInteractive();

        // 오늘 칸 위에 수령 완료 ✅ 오버레이
        const todayCX = cellCX(dayIndex);
        this.reg(
          scene.add
            .rectangle(todayCX, GRID_CY, CELL_W, CELL_H, 0x000000, 0.48)
            .setScrollFactor(0)
            .setDepth(DEPTH.POPUP),
        );
        this.reg(
          scene.add
            .text(todayCX, GRID_CY + (CELL_H / 2 - 34), '✅', { fontSize: '38px' })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(DEPTH.POPUP),
        );
      });
    this.reg(claimBtnTxt);

    // ── 닫기 버튼
    this.reg(
      scene.add
        .text(CX, CLOSE_BTN_Y, '닫기', {
          fontSize: '52px',
          fontStyle: 'bold',
          color: '#ffffff',
          backgroundColor: '#2a4a66',
          padding: { x: 80, y: 20 },
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(DEPTH.POPUP)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', function (this: Phaser.GameObjects.Text) { this.setAlpha(0.85); })
        .on('pointerout',  function (this: Phaser.GameObjects.Text) { this.setAlpha(1); })
        .on('pointerdown', () => {
          if (this.destroyed) return;
          onClose();
          this.destroy();
        }),
    );
  }

  // ─── 칸 빌드 ─────────────────────────────────────────────

  private buildCell(
    scene: Phaser.Scene,
    i: number,
    dayIndex: number,
    dayClaimed: boolean[],
  ): void {
    const cx   = cellCX(i);
    const cy   = GRID_CY;
    const top  = cy - CELL_H / 2;
    const left = cx - CELL_W / 2;

    const isClaimed = dayClaimed[i] ?? false;
    const isToday   = i === dayIndex;
    const isFuture  = i > dayIndex;

    // 배경
    const bgG = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH.POPUP);
    if (isClaimed) {
      bgG.fillStyle(0x0f1f0f, 1);
      bgG.fillRoundedRect(left, top, CELL_W, CELL_H, 12);
      bgG.lineStyle(2, 0x2a4a2a, 1);
      bgG.strokeRoundedRect(left, top, CELL_W, CELL_H, 12);
    } else if (isToday) {
      bgG.fillStyle(0x1a1600, 1);
      bgG.fillRoundedRect(left, top, CELL_W, CELL_H, 12);
      bgG.lineStyle(3, 0xffcc00, 1);
      bgG.strokeRoundedRect(left, top, CELL_W, CELL_H, 12);
      // 오늘 강조 내부 글로우
      bgG.lineStyle(1, 0xffdd44, 0.3);
      bgG.strokeRoundedRect(left + 4, top + 4, CELL_W - 8, CELL_H - 8, 9);
    } else {
      bgG.fillStyle(0x0d1220, 1);
      bgG.fillRoundedRect(left, top, CELL_W, CELL_H, 12);
      bgG.lineStyle(2, 0x1a2a3a, 1);
      bgG.strokeRoundedRect(left, top, CELL_W, CELL_H, 12);
    }
    this.reg(bgG);

    // 일차 라벨
    const dayColor = isClaimed ? '#2a4a2a' : isToday ? '#ffee88' : '#334455';
    this.reg(
      scene.add
        .text(cx, top + 26, `${i + 1}일`, {
          fontSize: isToday ? '30px' : '26px',
          fontStyle: isToday ? 'bold' : 'normal',
          color: dayColor,
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(DEPTH.POPUP),
    );

    // 보상 아이콘
    const reward = REWARD_DEFS[i]!;
    this.reg(
      scene.add
        .text(cx, top + 92, reward.icon, {
          fontSize: isToday ? '52px' : '38px',
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(DEPTH.POPUP)
        .setAlpha(isFuture ? 0.35 : isClaimed ? 0.5 : 1),
    );

    // 보상 수치
    const valColor = isClaimed ? '#2a4a2a' : isToday ? '#ffffff' : '#334455';
    this.reg(
      scene.add
        .text(cx, top + 152, reward.val, {
          fontSize: isToday ? '34px' : isClaimed ? '22px' : '22px',
          fontStyle: isToday ? 'bold' : 'normal',
          color: valColor,
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(DEPTH.POPUP),
    );

    // 상태 아이콘 (수령 완료 / 잠금)
    if (isClaimed) {
      this.reg(
        scene.add
          .text(cx, top + 206, '✅', { fontSize: '30px' })
          .setOrigin(0.5)
          .setScrollFactor(0)
          .setDepth(DEPTH.POPUP),
      );
    } else if (isFuture) {
      this.reg(
        scene.add
          .text(cx, top + 206, '🔒', { fontSize: '26px' })
          .setOrigin(0.5)
          .setScrollFactor(0)
          .setDepth(DEPTH.POPUP)
          .setAlpha(0.5),
      );
    }
  }

  // ─── 헬퍼 ────────────────────────────────────────────────

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    for (const o of this.objs) o.destroy();
    this.objs = [];
  }

  private reg(obj: Phaser.GameObjects.GameObject): Phaser.GameObjects.GameObject {
    this.objs.push(obj);
    return obj;
  }
}
