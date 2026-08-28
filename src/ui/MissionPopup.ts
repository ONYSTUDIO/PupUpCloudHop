import Phaser from 'phaser';
import { BASE_WIDTH, BASE_HEIGHT } from '@config/baseDimensions';
import { DEPTH } from '@config/constants';
import { LANDING_MISSIONS, SCORE_MISSIONS, type MissionDef } from '@config/missions';
import type { SaveManager } from '@managers/SaveManager';
import { missionService } from '@services/MissionService';

const CX = BASE_WIDTH / 2;
const PANEL_W = 760;
const PANEL_H = 1020;
const PANEL_TOP  = BASE_HEIGHT / 2 - PANEL_H / 2;
const PANEL_BOT  = PANEL_TOP + PANEL_H;

const ROW_W    = PANEL_W - 60;
const ROW_H    = 96;
const ROW_GAP  = 6;
const ROW_STEP = ROW_H + ROW_GAP;
const ROW_LEFT  = CX - ROW_W / 2;
const ROW_RIGHT = CX + ROW_W / 2;
const CONTENT_TOP = PANEL_TOP + 192;

const firstRowCY = (idx: number): number =>
  CONTENT_TOP + ROW_H / 2 + idx * ROW_STEP;

type TabKey = 'landing' | 'score';

export class MissionPopup {
  private objs: Phaser.GameObjects.GameObject[] = [];
  private destroyed = false;

  private landingTabObjs: Phaser.GameObjects.GameObject[] = [];
  private scoreTabObjs:   Phaser.GameObjects.GameObject[] = [];

  private landingTabBg!: Phaser.GameObjects.Graphics;
  private scoreTabBg!:   Phaser.GameObjects.Graphics;
  private landingTabText!: Phaser.GameObjects.Text;
  private scoreTabText!:   Phaser.GameObjects.Text;

  // 탭별 수령 가능 행 트리거 목록
  private landingClaimableRows: Array<() => void> = [];
  private scoreClaimableRows:   Array<() => void> = [];
  private currentTab: TabKey = 'landing';
  private claimAllBtn: Phaser.GameObjects.Text | null = null;

  constructor(
    scene: Phaser.Scene,
    saveManager: SaveManager,
    onCoinsChanged: () => void,
    onClose: () => void,
  ) {
    // ── dim ────────────────────────────────────────────────
    this.reg(
      scene.add.rectangle(0, 0, BASE_WIDTH, BASE_HEIGHT, 0x000020, 0.65)
        .setOrigin(0).setScrollFactor(0).setDepth(DEPTH.POPUP),
    );

    // ── 패널 ───────────────────────────────────────────────
    this.reg(
      scene.add.rectangle(CX, BASE_HEIGHT / 2, PANEL_W, PANEL_H, 0x0a1628, 0.97)
        .setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.POPUP)
        .setStrokeStyle(3, 0x3366aa),
    );

    // ── 제목 ───────────────────────────────────────────────
    this.reg(
      scene.add.text(CX, PANEL_TOP + 58, '미션', {
        fontSize: '68px', fontStyle: 'bold',
        color: '#ffffff', stroke: '#001133', strokeThickness: 5,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.POPUP),
    );

    // ── 탭 바 ──────────────────────────────────────────────
    this.buildTabs(scene);

    // ── 미션 행 ────────────────────────────────────────────
    const claimed = saveManager.getClaimedMissions();
    const bestLandings = saveManager.getBestLandings();
    const bestScore    = saveManager.getBestScore();

    LANDING_MISSIONS.forEach((m, i) => {
      let myTrigger: (() => void) | undefined;
      const { objs, triggerClaim } = this.buildRow(
        scene, m, firstRowCY(i), bestLandings, claimed.has(m.id), this.landingTabObjs,
        () => {
          const reward = saveManager.claimMission(m.id);
          if (reward > 0) {
            onCoinsChanged();
            if (myTrigger) {
              const idx = this.landingClaimableRows.indexOf(myTrigger);
              if (idx >= 0) this.landingClaimableRows.splice(idx, 1);
            }
            this.refreshClaimAllBtn();
            missionService.claimMission(m).catch((e: unknown) => {
              console.warn('[MissionService] claim failed', e);
            });
          }
        },
      );
      myTrigger = triggerClaim;
      objs.forEach((o) => { this.reg(o); this.landingTabObjs.push(o); });
      if (triggerClaim) this.landingClaimableRows.push(triggerClaim);
    });

    SCORE_MISSIONS.forEach((m, i) => {
      let myTrigger: (() => void) | undefined;
      const { objs, triggerClaim } = this.buildRow(
        scene, m, firstRowCY(i), bestScore, claimed.has(m.id), this.scoreTabObjs,
        () => {
          const reward = saveManager.claimMission(m.id);
          if (reward > 0) {
            onCoinsChanged();
            if (myTrigger) {
              const idx = this.scoreClaimableRows.indexOf(myTrigger);
              if (idx >= 0) this.scoreClaimableRows.splice(idx, 1);
            }
            this.refreshClaimAllBtn();
            missionService.claimMission(m).catch((e: unknown) => {
              console.warn('[MissionService] claim failed', e);
            });
          }
        },
      );
      myTrigger = triggerClaim;
      objs.forEach((o) => { this.reg(o); this.scoreTabObjs.push(o); });
      if (triggerClaim) this.scoreClaimableRows.push(triggerClaim);
    });

    // ── 모두 수령 버튼 ─────────────────────────────────────
    this.claimAllBtn = scene.add
      .text(CX, PANEL_BOT - 160, '모두 수령', {
        fontSize: '48px', fontStyle: 'bold', color: '#ffffff',
        backgroundColor: '#996600', padding: { x: 60, y: 18 },
      })
      .setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.POPUP)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', function (this: Phaser.GameObjects.Text) { this.setAlpha(0.85); })
      .on('pointerout',  function (this: Phaser.GameObjects.Text) { this.setAlpha(1); })
      .on('pointerdown', () => {
        if (this.destroyed) return;
        const rows = this.currentTab === 'landing'
          ? [...this.landingClaimableRows]
          : [...this.scoreClaimableRows];
        if (rows.length < 2) return;
        rows.forEach((trigger) => trigger());
      });
    this.reg(this.claimAllBtn);

    this.showTab('landing');

    // ── 닫기 버튼 ──────────────────────────────────────────
    this.reg(
      scene.add.text(CX, PANEL_BOT - 60, '닫기', {
        fontSize: '54px', fontStyle: 'bold', color: '#ffffff',
        backgroundColor: '#2a4a66', padding: { x: 80, y: 20 },
      }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.POPUP)
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

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    for (const o of this.objs) o.destroy();
    this.objs = [];
  }

  // ─── 탭 ─────────────────────────────────────────────────

  private buildTabs(scene: Phaser.Scene): void {
    const TAB_Y = PANEL_TOP + 128;
    const TAB_W = PANEL_W / 2;

    this.landingTabBg = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH.POPUP);
    this.reg(this.landingTabBg);

    this.landingTabText = scene.add
      .text(CX - TAB_W / 2, TAB_Y, '착지 미션', {
        fontSize: '40px', fontStyle: 'bold', color: '#ffffff',
      })
      .setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.POPUP)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.showTab('landing'));
    this.reg(this.landingTabText);

    this.scoreTabBg = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH.POPUP);
    this.reg(this.scoreTabBg);

    this.scoreTabText = scene.add
      .text(CX + TAB_W / 2, TAB_Y, '점수 미션', {
        fontSize: '40px', fontStyle: 'bold', color: '#ffffff',
      })
      .setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.POPUP)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.showTab('score'));
    this.reg(this.scoreTabText);

    const divG = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH.POPUP);
    divG.lineStyle(1, 0x334466, 0.6);
    divG.beginPath();
    divG.moveTo(CX - PANEL_W / 2 + 20, PANEL_TOP + 160);
    divG.lineTo(CX + PANEL_W / 2 - 20, PANEL_TOP + 160);
    divG.strokePath();
    this.reg(divG);

    this.drawTabBgs('landing');
  }

  private showTab(tab: TabKey): void {
    this.currentTab = tab;
    const showLanding = tab === 'landing';
    this.landingTabObjs.forEach((o) => { if ('setVisible' in o) (o as Phaser.GameObjects.GameObject & { setVisible: (v: boolean) => void }).setVisible(showLanding); });
    this.scoreTabObjs.forEach((o)   => { if ('setVisible' in o) (o as Phaser.GameObjects.GameObject & { setVisible: (v: boolean) => void }).setVisible(!showLanding); });
    this.drawTabBgs(tab);
    this.refreshClaimAllBtn();
  }

  private refreshClaimAllBtn(): void {
    if (!this.claimAllBtn) return;
    const rows = this.currentTab === 'landing' ? this.landingClaimableRows : this.scoreClaimableRows;
    const active = rows.length >= 2;
    this.claimAllBtn.setStyle({
      color:           active ? '#ffffff' : '#555566',
      backgroundColor: active ? '#996600' : '#1e1e2a',
    });
  }

  private drawTabBgs(active: TabKey): void {
    const TAB_Y  = PANEL_TOP + 128;
    const TAB_W  = PANEL_W / 2 - 4;
    const TAB_H  = 56;
    const HALF_W = PANEL_W / 2;

    const drawTab = (g: Phaser.GameObjects.Graphics, cx: number, isActive: boolean): void => {
      g.clear();
      g.fillStyle(isActive ? 0x1a3a5c : 0x0d1624, isActive ? 1 : 0.6);
      g.fillRoundedRect(cx - TAB_W / 2, TAB_Y - TAB_H / 2, TAB_W, TAB_H, { tl: 10, tr: 10, bl: 0, br: 0 });
      if (isActive) {
        g.lineStyle(2, 0x4488cc, 1);
        g.beginPath();
        g.moveTo(cx - TAB_W / 2, TAB_Y + TAB_H / 2);
        g.lineTo(cx - TAB_W / 2, TAB_Y - TAB_H / 2 + 10);
        g.arc(cx - TAB_W / 2 + 10, TAB_Y - TAB_H / 2 + 10, 10, Math.PI, Math.PI * 1.5, false);
        g.lineTo(cx + TAB_W / 2 - 10, TAB_Y - TAB_H / 2);
        g.arc(cx + TAB_W / 2 - 10, TAB_Y - TAB_H / 2 + 10, 10, Math.PI * 1.5, 0, false);
        g.lineTo(cx + TAB_W / 2, TAB_Y + TAB_H / 2);
        g.strokePath();
      }
    };

    drawTab(this.landingTabBg, CX - HALF_W / 2, active === 'landing');
    drawTab(this.scoreTabBg,   CX + HALF_W / 2, active === 'score');

    this.landingTabText.setColor(active === 'landing' ? '#ffffff' : '#667788');
    this.scoreTabText.setColor(active === 'score'    ? '#ffffff' : '#667788');
  }

  // ─── 미션 행 ─────────────────────────────────────────────

  private buildRow(
    scene: Phaser.Scene,
    mission: MissionDef,
    rowCY: number,
    progress: number,
    isClaimed: boolean,
    tabObjs: Phaser.GameObjects.GameObject[],
    onClaim: () => void,
  ): { objs: Phaser.GameObjects.GameObject[]; triggerClaim?: () => void } {
    const isComplete = progress >= mission.target;
    const ratio = Math.min(1, progress / mission.target);

    const bgColor     = isClaimed ? 0x0f2216 : isComplete ? 0x1e1200 : 0x0d1624;
    const borderColor = isClaimed ? 0x336644 : isComplete ? 0xaa6600 : 0x263852;

    const bgG = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH.POPUP);
    bgG.fillStyle(bgColor, 0.9);
    bgG.fillRoundedRect(ROW_LEFT, rowCY - ROW_H / 2, ROW_W, ROW_H, 12);
    bgG.lineStyle(2, borderColor, 0.9);
    bgG.strokeRoundedRect(ROW_LEFT, rowCY - ROW_H / 2, ROW_W, ROW_H, 12);

    const iconText  = isClaimed ? '✓' : isComplete ? '!' : '○';
    const iconColor = isClaimed ? '#44bb66' : isComplete ? '#ffbb22' : '#445566';
    const statusIcon = scene.add
      .text(ROW_LEFT + 30, rowCY, iconText, {
        fontSize: '40px', fontStyle: 'bold', color: iconColor,
      })
      .setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.POPUP);

    const labelColor = isClaimed ? '#557766' : '#ddeeff';
    const label = scene.add
      .text(ROW_LEFT + 62, rowCY - (isComplete || isClaimed ? 0 : 14), mission.label, {
        fontSize: '36px', color: labelColor,
      })
      .setOrigin(0, 0.5).setScrollFactor(0).setDepth(DEPTH.POPUP);

    const rowObjs: Phaser.GameObjects.GameObject[] = [bgG, statusIcon, label];

    if (isClaimed) {
      // ── 완료 표시 ────────────────────────────────────────
      const doneText = scene.add
        .text(ROW_RIGHT - 20, rowCY - 12, '완료', {
          fontSize: '34px', color: '#44bb66', fontStyle: 'bold',
        })
        .setOrigin(1, 0.5).setScrollFactor(0).setDepth(DEPTH.POPUP);
      const rewardClaimed = scene.add
        .text(ROW_RIGHT - 20, rowCY + 16, `🪙 ${mission.coinReward}`, {
          fontSize: '26px', color: '#3d6650',
        })
        .setOrigin(1, 0.5).setScrollFactor(0).setDepth(DEPTH.POPUP);
      rowObjs.push(doneText, rewardClaimed);
      return { objs: rowObjs };

    } else if (isComplete) {
      // ── 수령 버튼 ────────────────────────────────────────
      const claimBtn = scene.add
        .text(ROW_RIGHT - 16, rowCY, `🪙 +${mission.coinReward}`, {
          fontSize: '36px', fontStyle: 'bold', color: '#ffffff',
          backgroundColor: '#bb6600', padding: { x: 18, y: 10 },
        })
        .setOrigin(1, 0.5).setScrollFactor(0).setDepth(DEPTH.POPUP)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', function (this: Phaser.GameObjects.Text) { this.setAlpha(0.85); })
        .on('pointerout',  function (this: Phaser.GameObjects.Text) { this.setAlpha(1); });

      let alreadyClaimed = false;

      const doClaimRow = () => {
        if (alreadyClaimed) return;
        alreadyClaimed = true;
        claimBtn.setVisible(false);
        bgG.clear();
        bgG.fillStyle(0x0f2216, 0.9);
        bgG.fillRoundedRect(ROW_LEFT, rowCY - ROW_H / 2, ROW_W, ROW_H, 12);
        bgG.lineStyle(2, 0x336644, 0.9);
        bgG.strokeRoundedRect(ROW_LEFT, rowCY - ROW_H / 2, ROW_W, ROW_H, 12);
        statusIcon.setText('✓').setColor('#44bb66');
        label.setColor('#557766');
        const doneText = scene.add
          .text(ROW_RIGHT - 20, rowCY - 12, '완료', {
            fontSize: '34px', color: '#44bb66', fontStyle: 'bold',
          })
          .setOrigin(1, 0.5).setScrollFactor(0).setDepth(DEPTH.POPUP);
        const rewardDone = scene.add
          .text(ROW_RIGHT - 20, rowCY + 16, `🪙 ${mission.coinReward}`, {
            fontSize: '26px', color: '#3d6650',
          })
          .setOrigin(1, 0.5).setScrollFactor(0).setDepth(DEPTH.POPUP);
        // tabObjs 등록: 탭 전환 시 가시성 올바르게 관리됨
        this.objs.push(doneText, rewardDone);
        tabObjs.push(doneText, rewardDone);
        onClaim();
      };

      claimBtn.on('pointerdown', () => {
        if (!claimBtn.visible) return;
        doClaimRow();
      });

      rowObjs.push(claimBtn);
      return { objs: rowObjs, triggerClaim: doClaimRow };

    } else {
      // ── 진행 바 + 수치 ───────────────────────────────────
      const barY    = rowCY + 22;
      const barMaxW = ROW_W - 170;
      const barH    = 10;
      const barLeft = ROW_LEFT + 62;

      const barG = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH.POPUP);
      barG.fillStyle(0x1a2a3a, 1);
      barG.fillRoundedRect(barLeft, barY - barH / 2, barMaxW, barH, 5);
      if (ratio > 0) {
        barG.fillStyle(0x4488ff, 1);
        barG.fillRoundedRect(barLeft, barY - barH / 2, barMaxW * ratio, barH, 5);
      }

      const progressText = scene.add
        .text(ROW_RIGHT - 16, rowCY + 10, `${progress} / ${mission.target}`, {
          fontSize: '32px', color: '#7799bb',
        })
        .setOrigin(1, 0.5).setScrollFactor(0).setDepth(DEPTH.POPUP);

      const rewardHint = scene.add
        .text(ROW_RIGHT - 16, rowCY - 20, `🪙 ${mission.coinReward}`, {
          fontSize: '28px', color: '#997722',
        })
        .setOrigin(1, 0.5).setScrollFactor(0).setDepth(DEPTH.POPUP);

      rowObjs.push(rewardHint, barG, progressText);
      return { objs: rowObjs };
    }
  }

  // ─── 헬퍼 ────────────────────────────────────────────────

  private reg(obj: Phaser.GameObjects.GameObject): Phaser.GameObjects.GameObject {
    this.objs.push(obj);
    return obj;
  }
}
