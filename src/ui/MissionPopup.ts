import Phaser from 'phaser';
import { BASE_WIDTH, BASE_HEIGHT } from '@config/baseDimensions';
import { DEPTH } from '@config/constants';
import {
  LANDING_MISSIONS,
  SCORE_MISSIONS,
  DAILY_MISSIONS,
  WEEKLY_MISSIONS,
  type MissionDef,
} from '@config/missions';
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

type TabKey = 'daily' | 'weekly';

/** 미션 행 수령 결과 타입 */
interface ClaimResult {
  coins: number;
  fragments: number;
  revival: number;
}

export class MissionPopup {
  private objs: Phaser.GameObjects.GameObject[] = [];
  private destroyed = false;

  private dailyTabObjs:  Phaser.GameObjects.GameObject[] = [];
  private weeklyTabObjs: Phaser.GameObjects.GameObject[] = [];

  private dailyTabBg!:  Phaser.GameObjects.Graphics;
  private weeklyTabBg!: Phaser.GameObjects.Graphics;
  private dailyTabText!:  Phaser.GameObjects.Text;
  private weeklyTabText!: Phaser.GameObjects.Text;

  // 탭별 수령 가능 행 트리거 목록
  private dailyClaimableRows:  Array<() => void> = [];
  private weeklyClaimableRows: Array<() => void> = [];
  private currentTab: TabKey = 'daily';
  private claimAllBtn: Phaser.GameObjects.Text | null = null;

  constructor(
    scene: Phaser.Scene,
    saveManager: SaveManager,
    onCoinsChanged: () => void,
    onClose: () => void,
  ) {
    // 팝업 열릴 때 리셋 체크
    saveManager.checkAndResetDailyMissions();
    saveManager.checkAndResetWeeklyMissions();

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

    // ── 일일 탭 콘텐츠 ─────────────────────────────────────
    this.buildDailyTab(scene, saveManager, onCoinsChanged);

    // ── 주간 탭 콘텐츠 ─────────────────────────────────────
    this.buildWeeklyTab(scene, saveManager, onCoinsChanged);

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
        const rows = this.currentTab === 'daily'
          ? [...this.dailyClaimableRows]
          : [...this.weeklyClaimableRows];
        if (rows.length < 2) return;
        rows.forEach((trigger) => trigger());
      });
    this.reg(this.claimAllBtn);

    this.showTab('daily');

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

  // ─── 일일 탭 빌드 ────────────────────────────────────────

  private buildDailyTab(
    scene: Phaser.Scene,
    saveManager: SaveManager,
    onCoinsChanged: () => void,
  ): void {
    // 리셋 타이머 텍스트
    const resetLabel = scene.add
      .text(CX, CONTENT_TOP - 24, '오늘 자정 리셋', {
        fontSize: '28px', color: '#667799',
      })
      .setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.POPUP);
    this.reg(resetLabel);
    this.dailyTabObjs.push(resetLabel);

    // 일일 미션 3행
    DAILY_MISSIONS.forEach((m, i) => {
      let myTrigger: (() => void) | undefined;
      const progress = saveManager.getDailyMissionProgress(m.id);
      const isClaimed = saveManager.isDailyMissionClaimed(m.id);

      const { objs, triggerClaim } = this.buildRow(
        scene, m, firstRowCY(i), progress, isClaimed, this.dailyTabObjs,
        () => {
          const reward = saveManager.claimDailyMission(m.id);
          if (reward.coins > 0 || reward.fragments > 0 || reward.revival > 0) {
            onCoinsChanged();
            if (myTrigger) {
              const idx = this.dailyClaimableRows.indexOf(myTrigger);
              if (idx >= 0) this.dailyClaimableRows.splice(idx, 1);
            }
            this.refreshClaimAllBtn();
          }
        },
      );
      myTrigger = triggerClaim;
      objs.forEach((o) => { this.reg(o); this.dailyTabObjs.push(o); });
      if (triggerClaim) this.dailyClaimableRows.push(triggerClaim);
    });

    // 구분선 + 장기 목표 헤더
    const separatorY = firstRowCY(DAILY_MISSIONS.length) + ROW_H / 2 + 14;
    const divG = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH.POPUP);
    divG.lineStyle(1, 0x334466, 0.7);
    divG.beginPath();
    divG.moveTo(ROW_LEFT, separatorY);
    divG.lineTo(ROW_RIGHT, separatorY);
    divG.strokePath();
    this.reg(divG);
    this.dailyTabObjs.push(divG);

    const sectionHeader = scene.add
      .text(ROW_LEFT + 8, separatorY + 16, '장기 목표', {
        fontSize: '32px', color: '#8899aa', fontStyle: 'bold',
      })
      .setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH.POPUP);
    this.reg(sectionHeader);
    this.dailyTabObjs.push(sectionHeader);

    // 고정 미션 행 (LANDING_MISSIONS + SCORE_MISSIONS)
    const permanentMissions: MissionDef[] = [...LANDING_MISSIONS, ...SCORE_MISSIONS];
    const permanentTopY  = separatorY + 52;

    const claimed = saveManager.getClaimedMissions();
    permanentMissions.forEach((m, i) => {
      const progress  = m.condition === 'score'
        ? saveManager.getBestScore()
        : saveManager.getBestLandings();
      const isClaimed = claimed.has(m.id);
      const rowCY     = permanentTopY + ROW_H / 2 + i * ROW_STEP;

      // 패널 하단 클리핑: 닫기 버튼 위쪽으로만 표시
      if (rowCY + ROW_H / 2 > PANEL_BOT - 180) return;

      let myTrigger: (() => void) | undefined;
      const { objs, triggerClaim } = this.buildRow(
        scene, m, rowCY, progress, isClaimed, this.dailyTabObjs,
        () => {
          const reward = saveManager.claimMission(m.id);
          if (reward > 0) {
            onCoinsChanged();
            if (myTrigger) {
              const idx = this.dailyClaimableRows.indexOf(myTrigger);
              if (idx >= 0) this.dailyClaimableRows.splice(idx, 1);
            }
            this.refreshClaimAllBtn();
            missionService.claimMission(m).catch((e: unknown) => {
              console.warn('[MissionService] claim failed', e);
            });
          }
        },
      );
      myTrigger = triggerClaim;
      objs.forEach((o) => { this.reg(o); this.dailyTabObjs.push(o); });
      if (triggerClaim) this.dailyClaimableRows.push(triggerClaim);
    });
  }

  // ─── 주간 탭 빌드 ────────────────────────────────────────

  private buildWeeklyTab(
    scene: Phaser.Scene,
    saveManager: SaveManager,
    onCoinsChanged: () => void,
  ): void {
    // 리셋 텍스트
    const resetLabel = scene.add
      .text(CX, CONTENT_TOP - 24, '이번 주 월요일 리셋', {
        fontSize: '28px', color: '#667799',
      })
      .setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.POPUP);
    this.reg(resetLabel);
    this.weeklyTabObjs.push(resetLabel);

    // 주간 미션 3행
    WEEKLY_MISSIONS.forEach((m, i) => {
      let myTrigger: (() => void) | undefined;
      const progress  = saveManager.getWeeklyMissionProgress(m.id);
      const isClaimed = saveManager.isWeeklyMissionClaimed(m.id);

      const { objs, triggerClaim } = this.buildRow(
        scene, m, firstRowCY(i), progress, isClaimed, this.weeklyTabObjs,
        () => {
          const reward = saveManager.claimWeeklyMission(m.id);
          if (reward.coins > 0 || reward.fragments > 0 || reward.revival > 0) {
            onCoinsChanged();
            if (myTrigger) {
              const idx = this.weeklyClaimableRows.indexOf(myTrigger);
              if (idx >= 0) this.weeklyClaimableRows.splice(idx, 1);
            }
            this.refreshClaimAllBtn();
          }
        },
      );
      myTrigger = triggerClaim;
      objs.forEach((o) => { this.reg(o); this.weeklyTabObjs.push(o); });
      if (triggerClaim) this.weeklyClaimableRows.push(triggerClaim);
    });
  }

  // ─── 탭 ─────────────────────────────────────────────────

  private buildTabs(scene: Phaser.Scene): void {
    const TAB_Y = PANEL_TOP + 128;
    const TAB_W = PANEL_W / 2;

    this.dailyTabBg = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH.POPUP);
    this.reg(this.dailyTabBg);

    this.dailyTabText = scene.add
      .text(CX - TAB_W / 2, TAB_Y, '일일', {
        fontSize: '40px', fontStyle: 'bold', color: '#ffffff',
      })
      .setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.POPUP)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.showTab('daily'));
    this.reg(this.dailyTabText);

    this.weeklyTabBg = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH.POPUP);
    this.reg(this.weeklyTabBg);

    this.weeklyTabText = scene.add
      .text(CX + TAB_W / 2, TAB_Y, '주간', {
        fontSize: '40px', fontStyle: 'bold', color: '#ffffff',
      })
      .setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.POPUP)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.showTab('weekly'));
    this.reg(this.weeklyTabText);

    const divG = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH.POPUP);
    divG.lineStyle(1, 0x334466, 0.6);
    divG.beginPath();
    divG.moveTo(CX - PANEL_W / 2 + 20, PANEL_TOP + 160);
    divG.lineTo(CX + PANEL_W / 2 - 20, PANEL_TOP + 160);
    divG.strokePath();
    this.reg(divG);

    this.drawTabBgs('daily');
  }

  private showTab(tab: TabKey): void {
    this.currentTab = tab;
    const showDaily = tab === 'daily';
    this.dailyTabObjs.forEach((o)  => { if ('setVisible' in o) (o as Phaser.GameObjects.GameObject & { setVisible: (v: boolean) => void }).setVisible(showDaily); });
    this.weeklyTabObjs.forEach((o) => { if ('setVisible' in o) (o as Phaser.GameObjects.GameObject & { setVisible: (v: boolean) => void }).setVisible(!showDaily); });
    this.drawTabBgs(tab);
    this.refreshClaimAllBtn();
  }

  private refreshClaimAllBtn(): void {
    if (!this.claimAllBtn) return;
    const rows = this.currentTab === 'daily' ? this.dailyClaimableRows : this.weeklyClaimableRows;
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

    drawTab(this.dailyTabBg,  CX - HALF_W / 2, active === 'daily');
    drawTab(this.weeklyTabBg, CX + HALF_W / 2, active === 'weekly');

    this.dailyTabText.setColor(active === 'daily'   ? '#ffffff' : '#667788');
    this.weeklyTabText.setColor(active === 'weekly'  ? '#ffffff' : '#667788');
  }

  // ─── 미션 행 ─────────────────────────────────────────────

  /**
   * 보상 텍스트 문자열 생성 헬퍼.
   * 코인, 조각, 부활권 중 0이 아닌 것만 표시.
   */
  private rewardText(mission: MissionDef): string {
    const parts: string[] = [];
    if (mission.coinReward    > 0) parts.push(`🪙+${mission.coinReward}`);
    if (mission.fragmentReward > 0) parts.push(`🧩+${mission.fragmentReward}`);
    if (mission.revivalReward  > 0) parts.push(`🎟️+${mission.revivalReward}`);
    return parts.join('  ') || '보상 없음';
  }

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
        .text(ROW_RIGHT - 20, rowCY + 16, this.rewardText(mission), {
          fontSize: '26px', color: '#3d6650',
        })
        .setOrigin(1, 0.5).setScrollFactor(0).setDepth(DEPTH.POPUP);
      rowObjs.push(doneText, rewardClaimed);
      return { objs: rowObjs };

    } else if (isComplete) {
      // ── 수령 버튼 ────────────────────────────────────────
      const claimBtn = scene.add
        .text(ROW_RIGHT - 16, rowCY, this.rewardText(mission), {
          fontSize: '34px', fontStyle: 'bold', color: '#ffffff',
          backgroundColor: '#bb6600', padding: { x: 14, y: 10 },
        })
        .setOrigin(1, 0.5).setScrollFactor(0).setDepth(DEPTH.POPUP)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', function (this: Phaser.GameObjects.Text) { this.setAlpha(0.85); })
        .on('pointerout',  function (this: Phaser.GameObjects.Text) { this.setAlpha(1); });

      let alreadyClaimed = false;

      const doClaimRow = (): void => {
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
          .text(ROW_RIGHT - 20, rowCY + 16, this.rewardText(mission), {
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
        .text(ROW_RIGHT - 16, rowCY - 20, this.rewardText(mission), {
          fontSize: '26px', color: '#997722',
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

// ClaimResult 타입은 내부에서만 사용되지만 명시적으로 export하지 않음
export type { ClaimResult };
