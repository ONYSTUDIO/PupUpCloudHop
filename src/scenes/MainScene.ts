import Phaser from 'phaser';
import { SCENE_KEYS, DEPTH } from '@config/constants';
import { BASE_WIDTH, BASE_HEIGHT } from '@config/baseDimensions';
import { SaveManager } from '@managers/SaveManager';
import { authService } from '../services/AuthService';
import { missionService } from '@services/MissionService';
import { TopHud } from '@ui/TopHud';
import { MetaIconPanel } from '@ui/MetaIconPanel';
import { CheatPopup, CheatSettings } from '@ui/CheatPopup';
import { MissionPopup } from '@ui/MissionPopup';
import { AttendancePopup } from '@ui/AttendancePopup';
import { JumpPatternType } from '@game-types/game';
import { UI_LAYOUT } from '@config/uiLayout';

export class MainScene extends Phaser.Scene {
  private saveManager!: SaveManager;
  private topHud!: TopHud;
  private rightMetaPanel!: MetaIconPanel;
  private leftMetaPanel!: MetaIconPanel;
  private attendanceBadge!: Phaser.GameObjects.Graphics;
  private cheatSettings: CheatSettings = {
    pattern: JumpPatternType.PATTERN_3,
    startWithShield: false,
    startWithMagnet: false,
  };
  private cheatPopup: CheatPopup | null = null;
  private missionPopup: MissionPopup | null = null;
  private attendancePopup: AttendancePopup | null = null;
  private missionBadge!: Phaser.GameObjects.Graphics;
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

    // 테스트 버튼
    this.addTestButton();

    // 하단 버튼 2개
    this.addBottomButtons();

    // 출석 체크 팝업 (날짜 바뀐 첫 진입 시)
    this.checkAndShowAttendance();

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
    this.rightMetaPanel.addIcon(this.createMissionIcon());

    this.leftMetaPanel = new MetaIconPanel(this, 'left');
    this.leftMetaPanel.addIcon(this.createAttendanceIcon());
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

  private createMissionIcon(): Phaser.GameObjects.Container {
    const size = UI_LAYOUT.meta.iconSize;
    const half = size / 2;
    const container = this.add.container(0, 0);
    container.setSize(size, size).setInteractive({ useHandCursor: true });

    // 배경
    const bg = this.add.graphics();
    bg.fillStyle(0xffffff, 0.88);
    bg.fillRoundedRect(-half, -half, size, size, 20);
    bg.lineStyle(3, 0x44bb66, 1);
    bg.strokeRoundedRect(-half, -half, size, size, 20);

    // 체크리스트 아이콘 (3행)
    const icon = this.add.graphics();
    const rows = [
      { y: -24, checked: true },
      { y:  -4, checked: true },
      { y:  16, checked: false },
    ];
    const boxX = -26;
    const boxSize = 14;
    const lineEndX = 24;

    rows.forEach(({ y, checked }) => {
      // 체크박스 테두리
      icon.lineStyle(3, checked ? 0x44bb66 : 0xaaaaaa, 1);
      icon.strokeRect(boxX, y - boxSize / 2, boxSize, boxSize);

      // 체크 표시 (완료 항목)
      if (checked) {
        icon.fillStyle(0x44bb66, 1);
        icon.fillRect(boxX, y - boxSize / 2, boxSize, boxSize);
        icon.lineStyle(2.5, 0xffffff, 1);
        icon.beginPath();
        icon.moveTo(boxX + 2,         y + 1);
        icon.lineTo(boxX + 6,         y + boxSize / 2 - 1);
        icon.lineTo(boxX + boxSize - 1, y - boxSize / 2 + 3);
        icon.strokePath();
      }

      // 항목 텍스트 라인
      icon.lineStyle(2.5, checked ? 0x888888 : 0xbbbbbb, checked ? 0.5 : 0.8);
      icon.beginPath();
      icon.moveTo(boxX + boxSize + 6, y);
      icon.lineTo(lineEndX,           y);
      icon.strokePath();
    });

    const label = this.add.text(0, half - 24, '미션', {
      fontSize: '26px', color: '#44bb66', fontStyle: 'bold',
    }).setOrigin(0.5, 0.5);

    // 수령 대기 배지 (빨간 점)
    this.missionBadge = this.add.graphics();
    this.refreshMissionBadge();

    container.add([bg, icon, label, this.missionBadge]);

    container.on('pointerdown', () => this.openMissionPopup());

    return container;
  }

  private refreshMissionBadge(): void {
    this.missionBadge.clear();
    if (!this.saveManager.hasPendingMissions()) return;
    const half = UI_LAYOUT.meta.iconSize / 2;
    this.missionBadge.fillStyle(0xee2222, 1);
    this.missionBadge.fillCircle(half - 10, -half + 10, 14);
  }

  // ─── 출석 아이콘 ──────────────────────────────────────────

  private createAttendanceIcon(): Phaser.GameObjects.Container {
    const size = UI_LAYOUT.meta.iconSize;
    const half = size / 2;
    const container = this.add.container(0, 0);
    container.setSize(size, size).setInteractive({ useHandCursor: true });

    // 배경
    const bg = this.add.graphics();
    bg.fillStyle(0xffffff, 0.88);
    bg.fillRoundedRect(-half, -half, size, size, 20);
    bg.lineStyle(3, 0xcc7700, 1);
    bg.strokeRoundedRect(-half, -half, size, size, 20);

    // 달력 그래픽
    const cal = this.add.graphics();
    const cW = 68; const cH = 60;
    const cX = -cW / 2; const cY = -half + 12;

    // 헤더 바 (주황)
    cal.fillStyle(0xcc7700, 1);
    cal.fillRoundedRect(cX, cY, cW, 18, { tl: 6, tr: 6, bl: 0, br: 0 });
    // 바디
    cal.fillStyle(0xf0f0f8, 1);
    cal.fillRoundedRect(cX, cY + 18, cW, cH - 18, { tl: 0, tr: 0, bl: 6, br: 6 });
    cal.lineStyle(1.5, 0xcc7700, 0.8);
    cal.strokeRoundedRect(cX, cY, cW, cH, 6);
    // 링 바인딩
    cal.fillStyle(0x444444, 1);
    cal.fillRoundedRect(cX + 14, cY - 5, 6, 12, 3);
    cal.fillRoundedRect(cX + cW - 20, cY - 5, 6, 12, 3);
    // 날짜 점 그리드 (3열 × 2행)
    const dotX0 = cX + 11; const dotY0 = cY + 26;
    const dxStep = 22; const dyStep = 17;
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 3; col++) {
        const dx = dotX0 + col * dxStep;
        const dy = dotY0 + row * dyStep;
        if (row === 0 && col === 1) {
          cal.fillStyle(0xff9900, 1);
          cal.fillCircle(dx, dy, 6);
        } else {
          cal.fillStyle(0x99aacc, 1);
          cal.fillCircle(dx, dy, 4);
        }
      }
    }

    const label = this.add.text(0, half - 24, '출석', {
      fontSize: '26px', color: '#cc7700', fontStyle: 'bold',
    }).setOrigin(0.5);

    // 미수령 배지
    this.attendanceBadge = this.add.graphics();
    this.refreshAttendanceBadge();

    container.add([bg, cal, label, this.attendanceBadge]);
    container.on('pointerdown', () => this.openAttendancePopup());

    return container;
  }

  private refreshAttendanceBadge(): void {
    this.attendanceBadge.clear();
    if (!this.saveManager.checkAttendance().isNewDay) return;
    const half = UI_LAYOUT.meta.iconSize / 2;
    this.attendanceBadge.fillStyle(0xee2222, 1);
    this.attendanceBadge.fillCircle(half - 10, -half + 10, 14);
  }

  // ─── 출석 체크 팝업 ───────────────────────────────────────

  private checkAndShowAttendance(): void {
    const { isNewDay } = this.saveManager.checkAttendance();
    if (!isNewDay) return;
    this.openAttendancePopup();
  }

  private openAttendancePopup(): void {
    if (this.attendancePopup) return;
    this.attendancePopup = new AttendancePopup(
      this,
      this.saveManager,
      () => {
        this.topHud.updateCurrency(
          this.saveManager.getCoins(),
          this.saveManager.getDiamonds(),
        );
        this.refreshAttendanceBadge();
      },
      () => {
        this.attendancePopup = null;
      },
    );
  }

  private openMissionPopup(): void {
    if (this.missionPopup) return;
    this.missionPopup = new MissionPopup(
      this,
      this.saveManager,
      () => {
        this.topHud.updateCurrency(
          this.saveManager.getCoins(),
          this.saveManager.getDiamonds(),
        );
        this.refreshMissionBadge();
      },
      () => {
        this.missionPopup = null;
        this.refreshMissionBadge();
      },
    );
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

  // ─── 테스트 버튼 ──────────────────────────────────────────

  private addTestButton(): void {
    const cx = BASE_WIDTH / 2;
    const cy = BASE_HEIGHT * 0.75;
    const btnW = 300;
    const btnH = 90;

    const bg = this.add.graphics().setDepth(DEPTH.HUD - 1);
    bg.lineStyle(3, 0xffbb22, 0.9);
    bg.strokeRoundedRect(cx - btnW / 2, cy - btnH / 2, btnW, btnH, 18);
    bg.fillStyle(0x1a1a00, 0.6);
    bg.fillRoundedRect(cx - btnW / 2, cy - btnH / 2, btnW, btnH, 18);

    this.add
      .text(cx, cy, '⚙ 테스트', {
        fontSize: '44px', fontStyle: 'bold', color: '#ffbb22',
      })
      .setOrigin(0.5).setDepth(DEPTH.HUD)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.openCheatPopup())
      .on('pointerover', () => bg.setAlpha(0.7))
      .on('pointerout',  () => bg.setAlpha(1));
  }

  private openCheatPopup(): void {
    if (this.cheatPopup) return;
    this.cheatPopup = new CheatPopup(
      this,
      this.cheatSettings,
      (settings) => {
        this.cheatSettings = settings;
        this.cheatPopup = null;
      },
      () => {
        this.saveManager.resetClaimedMissions();
        this.refreshMissionBadge();
        missionService.resetClaimedMissions().catch((e: unknown) => {
          console.warn('[MissionService] reset failed', e);
        });
      },
      () => {
        this.saveManager.addRevivalItem(1);
      },
      () => {
        this.saveManager.resetAttendanceState();
        this.refreshAttendanceBadge();
      },
    );
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
        this.scene.start(SCENE_KEYS.GAME, {
          pattern: this.cheatSettings.pattern,
          startWithShield: this.cheatSettings.startWithShield,
          startWithMagnet: this.cheatSettings.startWithMagnet,
        });
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
    this.leftMetaPanel?.destroy();
    this.cheatPopup?.destroy();
    this.cheatPopup = null;
    this.missionPopup?.destroy();
    this.missionPopup = null;
    this.attendancePopup?.destroy();
    this.attendancePopup = null;
  }
}
