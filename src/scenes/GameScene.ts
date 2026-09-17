import Phaser from 'phaser';
import { Player } from '@entities/Player';
import { CloudIsland } from '@entities/CloudIsland';
import { JumpSystem } from '@systems/JumpSystem';
import { CollisionSystem } from '@systems/CollisionSystem';
import { PlatformMovementSystem } from '@systems/PlatformMovementSystem';
import { ScoreSystem } from '@systems/ScoreSystem';
import { SpawnSystem } from '@systems/SpawnSystem';
import { ObstacleSystem } from '@systems/ObstacleSystem';
import { StarItemSystem } from '@systems/StarItemSystem';
import { MagnetItemSystem } from '@systems/MagnetItemSystem';
import { ShieldSystem } from '@systems/ShieldSystem';
import { MagnetSystem } from '@systems/MagnetSystem';
import { IceItemSystem } from '@systems/IceItemSystem';
import { CloudFreezeSystem } from '@systems/CloudFreezeSystem';
import { TimeSlowItemSystem } from '@systems/TimeSlowItemSystem';
import { TimeSlowSystem } from '@systems/TimeSlowSystem';
import { AudioManager } from '@managers/AudioManager';
import { InputManager } from '@managers/InputManager';
import { SaveManager } from '@managers/SaveManager';
import { authService } from '../services/AuthService';
import { TopHud } from '@ui/TopHud';
import { ScoreHud } from '@ui/ScoreHud';
import { PausePopup } from '@ui/PausePopup';
import { DirectionWheel } from '@ui/DirectionWheel';
import { ActionPanel } from '@ui/ActionPanel';
import { MetaIconPanel } from '@ui/MetaIconPanel';
import { JumpPatternType } from '@game-types/game';
import { SCENE_KEYS, DEPTH, EVENTS, INITIAL_CLOUD_LAYOUT, ITEM_CONFIG } from '@config/constants';
import { BASE_WIDTH, BASE_HEIGHT } from '@config/gameConfig';
import { GAMEPLAY } from '@config/gameplayConfig';
import { UI_LAYOUT } from '@config/uiLayout';

// ─── 버튼 컨트롤 크기 상수 ───────────────────────────────────
const JUMP_BTN_RADIUS  = 120;
const DIR_WHEEL_RADIUS = 145;

// ─── UI 영역 디버그 표시 (확인 후 false 로 변경) ────────────
const DEBUG_SHOW_UI_BOUNDS = false;

export class GameScene extends Phaser.Scene {
  // 엔티티
  private player!: Player;
  private clouds: CloudIsland[] = [];

  // 시스템
  private movementSystem!: PlatformMovementSystem;
  private jumpSystem!: JumpSystem;
  private collisionSystem!: CollisionSystem;
  private scoreSystem!: ScoreSystem;
  private spawnSystem!: SpawnSystem;
  private obstacleSystem!: ObstacleSystem;
  private starItemSystem!: StarItemSystem;
  private magnetItemSystem!: MagnetItemSystem;
  private shieldSystem!: ShieldSystem;
  private magnetSystem!: MagnetSystem;
  private iceItemSystem!: IceItemSystem;
  private cloudFreezeSystem!: CloudFreezeSystem;
  private timeSlowItemSystem!: TimeSlowItemSystem;
  private timeSlowSystem!: TimeSlowSystem;

  // 매니저 / UI
  private audioManager!: AudioManager;
  private inputManager!: InputManager;
  private saveManager!: SaveManager;
  private topHud!: TopHud;
  private scoreHud!: ScoreHud;
  private pausePopup: PausePopup | null = null;
  private directionWheel!: DirectionWheel;
  private actionPanel!: ActionPanel;
  private leftMetaPanel!: MetaIconPanel;
  private rightMetaPanel!: MetaIconPanel;

  // 그래픽
  private chargeIndicator!: Phaser.GameObjects.Graphics;
  private jumpButtonGraphics!: Phaser.GameObjects.Graphics;
  private directionArrow!: Phaser.GameObjects.Graphics;
  private rocketTrailGraphics!: Phaser.GameObjects.Graphics;

  // 패턴별 버튼 위치 (setupBottomControls에서 결정)
  private jumpBtnCX: number = 0;
  private jumpBtnCY: number = 0;
  private showJumpBtn: boolean = true;

  // 게임 상태
  private currentCloudId: string = '';
  private jumpedFromId: string = '';
  private jumpTime: number = 0;
  private isGameOver: boolean = false;
  private isDangerSlow: boolean = false;
  private dangerSlowElapsed: number = 0;
  private isFlyOutDramatic: boolean = false;           // true = Fly-Out 연출 중
  private jumpTargetCloud: CloudIsland | null = null;  // 이번 점프의 확정 Target Cloud
  private dramaticTriggeredThisJump: boolean = false;  // Landing Miss 점프당 1회 제한
  private flyOutDramaticTriggeredThisJump: boolean = false; // Fly-Out 점프당 1회 제한
  private airborneDistAccum: number = 0;  // 공중 누적 이동 거리 (px)
  private airbornePrevX: number = 0;
  private airbornePrevY: number = 0;
  private isPaused: boolean = false;
  private jumpPattern: JumpPatternType = JumpPatternType.PATTERN_3;
  private landingOffsetX: number = 0;
  private showDirectionArrow: boolean = true;
  private _physicsGravity: boolean = false;  // 풍선 충돌 후 중력 낙하
  private _parabolicJump: boolean = false;    // 패턴 1 비행 중 중력
  private capturedAngle: number = -Math.PI / 2; // 패턴 3 전용: 버튼 누른 순간 각도

  // 인-런 보너스 코인 (BIG JUMP / 마일스톤) 누적
  private bonusCoinsEarned: number = 0;
  // 결과 화면 주머니 연출용: 획득 순서대로 코인 주머니 기록
  private coinBags: { coins: number }[] = [];

  // 로켓 모드
  private isRocketMode: boolean = false;
  private rocketTimer: number = 0;
  private rocketLanding: boolean = false;       // 3초 이후 착지 탐색 단계
  private rocketLandTarget: CloudIsland | null = null;
  private rocketLandTimeout: number = 0;        // 착지 탐색 안전 타임아웃
  private rocketPassedCloudIds: Set<string> = new Set();

  // 자석 당기기
  private isMagnetPulling: boolean = false;
  private magnetPullTarget: CloudIsland | null = null;
  private magnetPullTimer: number = 0;

  private _onVisibilityChange: (() => void) | null = null;

  constructor() {
    super({ key: SCENE_KEYS.GAME });
  }

  create(data?: { pattern?: JumpPatternType; startWithShield?: boolean; startWithMagnet?: boolean }): void {
    this.jumpPattern = data?.pattern ?? JumpPatternType.PATTERN_3;
    this.isGameOver = false;
    this.isDangerSlow = false;
    this.dangerSlowElapsed = 0;
    this.isFlyOutDramatic = false;
    this.jumpTargetCloud = null;
    this.dramaticTriggeredThisJump = false;
    this.flyOutDramaticTriggeredThisJump = false;
    this.airborneDistAccum = 0;
    this.airbornePrevX = 0;
    this.airbornePrevY = 0;
    this.isPaused = false;
    this.bonusCoinsEarned = 0;
    this.coinBags = [];
    this._physicsGravity = false;
    this._parabolicJump = false;
    this.isRocketMode = false;
    this.rocketTimer = 0;
    this.rocketLanding = false;
    this.rocketLandTarget = null;
    this.rocketLandTimeout = 0;
    this.rocketPassedCloudIds = new Set();
    this.isMagnetPulling = false;
    this.magnetPullTarget = null;
    this.magnetPullTimer = 0;
    this.clouds = [];
    this.currentCloudId = INITIAL_CLOUD_LAYOUT[0].id;
    this.jumpedFromId = '';
    this.jumpTime = 0;
    this.landingOffsetX = 0;
    this.capturedAngle = -Math.PI / 2;
    this.showDirectionArrow = true;

    this.saveManager = new SaveManager();
    this.audioManager = new AudioManager(this, this.saveManager.isSoundEnabled());
    this.movementSystem = new PlatformMovementSystem();
    this.jumpSystem = new JumpSystem();
    this.collisionSystem = new CollisionSystem();
    this.scoreSystem = new ScoreSystem(this, this.saveManager.getBestScore());
    this.events.on(EVENTS.BIG_JUMP, this.onBigJump, this);
    this.events.on(EVENTS.MILESTONE, this.onMilestone, this);
    this.obstacleSystem = new ObstacleSystem(this, this.time.now);
    this.starItemSystem = new StarItemSystem(this);
    this.magnetItemSystem = new MagnetItemSystem(this);
    this.shieldSystem = new ShieldSystem(this);
    this.magnetSystem = new MagnetSystem(this);
    this.iceItemSystem = new IceItemSystem(this);
    this.cloudFreezeSystem = new CloudFreezeSystem(this);
    this.timeSlowItemSystem = new TimeSlowItemSystem(this);
    this.timeSlowSystem = new TimeSlowSystem(this);
    this.topHud = new TopHud(
      this,
      this.saveManager.getCoins(),
      this.saveManager.getDiamonds(),
      () => this.togglePause(),
    );
    this.scoreHud = new ScoreHud(this, this.saveManager.getBestScore());
    this.pausePopup = null;
    void this.initHudProfile();

    this.setupBackground();
    this.createClouds();
    this.createPlayer();
    this.setupUILayers();
    this.setupBottomControls();
    this.setupInput();
    this.setupCamera();
    this.setupVisibilityPause();

    // 치트 설정 적용
    if (data?.startWithShield) {
      this.shieldSystem.activate();
    }
    if (data?.startWithMagnet) {
      this.magnetSystem.activate();
      this.scoreHud.showMagnetTimer(this.magnetSystem.timer);
    }

    this.chargeIndicator = this.add.graphics().setDepth(DEPTH.PLAYER + 1);
    this.directionArrow = this.add.graphics().setDepth(DEPTH.PLAYER + 1);
    this.rocketTrailGraphics = this.add.graphics().setDepth(DEPTH.PLAYER - 1);

    if (DEBUG_SHOW_UI_BOUNDS) this.drawDebugUiBounds();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
  }

  update(_time: number, delta: number): void {
    if (this.isGameOver || this.isPaused) return;
    if (this.isDangerSlow) {
      this.updateDangerSlow(delta);
      return;
    }

    const dt = delta / 1000;
    const scrollY = this.cameras.main.scrollY;

    // 타임슬로우 활성 시 방향 휠 진자만 감속 (구름·장애물·플레이어는 실제 속도 유지)
    const wheelDelta = this.timeSlowSystem?.isActive
      ? delta * ITEM_CONFIG.TIME_SLOW_FACTOR
      : delta;

    // 1. 구름섬 위치 갱신 + 방향 휠 진자 갱신(슬로우 적용)
    this.movementSystem.update(delta);
    this.spawnSystem.updateVortexPositions(delta);
    this.directionWheel.update(wheelDelta);

    // 2. 아이템·효과 시스템 업데이트
    this.starItemSystem.update(delta, scrollY);
    this.magnetItemSystem.update(delta, scrollY);
    this.iceItemSystem.update(delta, scrollY);
    this.timeSlowItemSystem.update(delta, scrollY);
    this.shieldSystem.update(delta, this.player.x, this.player.y);
    // 자석·동결·타임슬로우 타이머는 실제 시간으로 카운트다운
    const wasActive = this.magnetSystem.isActive;
    this.magnetSystem.update(delta, this.player.x, this.player.y, this.clouds);
    if (this.magnetSystem.isActive) {
      this.scoreHud.updateMagnetTimer(this.magnetSystem.timer);
    } else if (wasActive) {
      this.scoreHud.hideMagnetTimer();
    }
    const wasFreezeActive = this.cloudFreezeSystem.isActive;
    this.cloudFreezeSystem.update(delta, this.clouds);
    if (this.cloudFreezeSystem.isActive) {
      this.scoreHud.updateFreezeTimer(this.cloudFreezeSystem.timer);
    } else if (wasFreezeActive) {
      this.scoreHud.hideFreezeTimer();
      this.obstacleSystem.unfreeze();
    }
    const wasSlowActive = this.timeSlowSystem.isActive;
    this.timeSlowSystem.update(delta);
    if (this.timeSlowSystem.isActive) {
      this.scoreHud.updateSlowTimer(this.timeSlowSystem.timer);
    } else if (wasSlowActive) {
      this.scoreHud.hideSlowTimer();
    }

    // ── 로켓 모드 분기 ──────────────────────────────────────
    if (this.isRocketMode) {
      this.updateRocketMode(dt);
      this.updateSpawn();
      this.player.sync();
      this.updateCamera();
      return;
    }

    // 3. 장애물 업데이트 (새떼 + 번개)
    const currentScore = this.scoreSystem.getScore().current;
    this.obstacleSystem.update(delta, this.time.now, scrollY, currentScore);
    this.checkObstacleCollisions();

    const currentCloud = this.player.isOnGround
      ? (this.clouds.find((c) => c.id === this.currentCloudId) ?? null)
      : null;
    const stormHitId = this.obstacleSystem.updateStorm(
      delta, this.time.now, scrollY, currentCloud, currentScore,
    );
    if (stormHitId !== null) {
      // 방어막이 활성 상태이고 플레이어가 탑승 중인 구름이 번개에 맞은 경우 → 방어막 소모로 무효화
      const isCurrentCloud = stormHitId === this.currentCloudId && this.player.isOnGround;
      if (isCurrentCloud && this.shieldSystem.consume()) {
        // 방어막 소모 — 구름 추락 없음
      } else {
        this.clouds.find((c) => c.id === stormHitId)?.startFalling();
      }
    }

    // 4. 동적 스폰 / 디스폰
    this.updateSpawn();

    // 5. 플레이어 물리 / 위치 처리
    if (this.isMagnetPulling) {
      // 자석 당기기: 캐릭터만 따로 처리, 게임 세계는 위에서 이미 정상 진행됨
      this.updateMagnetPull(dt);
    } else if (this.player.isOnGround) {
      this.followCurrentCloud();
    } else {
      this.applyPhysics(dt);
      this.accumulateAirborneDistance();
      this.checkLanding();
      this.checkFallDeath();
      this.checkDangerSlowTrigger();
      this.checkFlyOutDramaticTrigger();
    }

    // 6. 그래픽 동기화
    this.player.sync();

    // 7. 충전 표시 (PATTERN_1 전용)
    this.updateChargeIndicator();

    // 8. 방향 화살표
    this.updateDirectionArrow();

    // 9. JUMP 버튼 시각 상태
    this.updateJumpButton();

    // 10. 카메라
    this.updateCamera();
  }

  // ─── 초기화 ────────────────────────────────────────────

  private setupBackground(): void {
    const g = this.add.graphics().setDepth(DEPTH.BACKGROUND).setScrollFactor(1);

    g.fillGradientStyle(0x87ceeb, 0x87ceeb, 0x1a5fa0, 0x1a5fa0, 1);
    g.fillRect(0, -4000, BASE_WIDTH, BASE_HEIGHT + 4000);

    const decorPositions = [
      { x: 160,  y: 220,  w: 300, h: 78, sf: 0.25 },
      { x: 880,  y: 500,  w: 260, h: 65, sf: 0.3  },
      { x: 100,  y: 800,  w: 290, h: 72, sf: 0.2  },
      { x: 820,  y: 1050, w: 310, h: 78, sf: 0.28 },
      { x: 280,  y: 1350, w: 250, h: 63, sf: 0.25 },
      { x: 780,  y: 1580, w: 270, h: 68, sf: 0.22 },
      { x: 130,  y: -300, w: 280, h: 70, sf: 0.3  },
      { x: 900,  y: -600, w: 240, h: 60, sf: 0.25 },
      { x: 400,  y: -900, w: 260, h: 65, sf: 0.2  },
    ];

    decorPositions.forEach(({ x, y, w, h, sf }) => {
      const dg = this.add.graphics().setDepth(DEPTH.DECOR_CLOUD).setScrollFactor(sf);
      dg.fillStyle(0xffffff, 0.18);
      dg.fillEllipse(x, y, w, h);
      dg.fillEllipse(x - w * 0.22, y - h * 0.28, w * 0.42, h * 0.65);
      dg.fillEllipse(x + w * 0.12, y - h * 0.35, w * 0.36, h * 0.55);
    });
  }

  private createClouds(): void {
    for (let i = 0; i < INITIAL_CLOUD_LAYOUT.length; i++) {
      const cfg = INITIAL_CLOUD_LAYOUT[i]!;
      const cloud = new CloudIsland(this, cfg);
      this.clouds.push(cloud);
      this.movementSystem.register(cloud);
      // 시작 구름(i=0)은 제외하고 초기 구름도 얼음 아이템 카운터에 포함
      // → nextSpawnAt=3이면 c3(시작 기준 3번째 위 구름)에 얼음 아이템 등장
      if (i > 0) {
        this.iceItemSystem.onPattern1CloudSpawned(cloud, null, null);
        this.timeSlowItemSystem.onPattern1CloudSpawned(cloud, null, null, null);
      }
    }

    const topCloud = INITIAL_CLOUD_LAYOUT[INITIAL_CLOUD_LAYOUT.length - 1]!;
    this.spawnSystem = new SpawnSystem(
      topCloud.centerY,
      INITIAL_CLOUD_LAYOUT.length,
      BASE_WIDTH,
      BASE_HEIGHT,
    );

    const initialScrollY = 0;
    let safetyLimit = 30;
    while (this.spawnSystem.needsSpawn(initialScrollY) && safetyLimit-- > 0) {
      const batch = this.spawnSystem.spawnNext(this);
      for (const cloud of batch) {
        this.clouds.push(cloud);
        this.movementSystem.register(cloud);
      }
      // 패턴1 구름(단독 스폰)만 별·자석·얼음·타임슬로우 후보로 등록
      if (batch.length === 1) {
        const cloud = batch[0]!;
        this.starItemSystem.onPattern1CloudSpawned(cloud);
        this.magnetItemSystem.onPattern1CloudSpawned(cloud, this.starItemSystem.attachedCloudId);
        this.iceItemSystem.onPattern1CloudSpawned(
          cloud,
          this.starItemSystem.attachedCloudId,
          this.magnetItemSystem.attachedCloudId,
        );
        this.timeSlowItemSystem.onPattern1CloudSpawned(
          cloud,
          this.starItemSystem.attachedCloudId,
          this.magnetItemSystem.attachedCloudId,
          this.iceItemSystem.attachedCloudId,
        );
      }
    }
  }

  private createPlayer(): void {
    const startCloud = this.clouds.find((c) => c.id === this.currentCloudId);
    const sx = startCloud?.x ?? BASE_WIDTH / 2;
    const sy = startCloud ? startCloud.topY - this.getPlayerHalfH() : BASE_HEIGHT - 400;

    this.player = new Player(this, sx, sy);
    this.player.isOnGround = true;
    this.landingOffsetX = 0;
  }

  private getPlayerHalfH(): number { return 28; }

  // ─── 디버그: UI 영역 경계선 시각화 ───────────────────────────

  private drawDebugUiBounds(): void {
    const g = this.add.graphics().setScrollFactor(0).setDepth(DEPTH.HUD - 1);

    const label = (x: number, y: number, text: string, color: string): void => {
      this.add.text(x, y, text, {
        fontSize: '30px', fontStyle: 'bold',
        color,
        backgroundColor: '#000000bb',
        padding: { x: 8, y: 4 },
      }).setScrollFactor(0).setDepth(DEPTH.HUD + 1);
    };

    // ── HUD 영역 (상단) ────────────────────────────────────────
    const hudAreaH = UI_LAYOUT.hud.top + 260;
    g.fillStyle(0x00aaff, 0.10);
    g.fillRect(0, 0, BASE_WIDTH, hudAreaH);
    g.lineStyle(3, 0x00aaff, 0.9);
    g.strokeRect(1, 1, BASE_WIDTH - 2, hudAreaH - 1);
    label(UI_LAYOUT.hud.side, 4, `HUD  (0 ~ ${hudAreaH}px)`, '#00aaff');

    // ── 우측 메타 아이콘 영역 ─────────────────────────────────
    const slotCount = 3; // 예시: 3개 슬롯 높이
    const metaColH = slotCount * (UI_LAYOUT.meta.iconSize + UI_LAYOUT.meta.gap);
    const rightMetaX = BASE_WIDTH - UI_LAYOUT.meta.right - UI_LAYOUT.meta.iconSize;
    const rightMetaW = UI_LAYOUT.meta.iconSize + UI_LAYOUT.meta.right;
    g.fillStyle(0xffaa00, 0.12);
    g.fillRect(rightMetaX, UI_LAYOUT.meta.top, rightMetaW, metaColH);
    g.lineStyle(3, 0xffaa00, 0.9);
    g.strokeRect(rightMetaX, UI_LAYOUT.meta.top, rightMetaW, metaColH);
    label(rightMetaX + 4, UI_LAYOUT.meta.top + 4, 'RIGHT META', '#ffaa00');

    // ── 좌측 메타 아이콘 영역 ─────────────────────────────────
    const leftMetaW = UI_LAYOUT.meta.left + UI_LAYOUT.meta.iconSize;
    g.fillStyle(0xffaa00, 0.12);
    g.fillRect(0, UI_LAYOUT.meta.top, leftMetaW, metaColH);
    g.lineStyle(3, 0xffaa00, 0.9);
    g.strokeRect(0, UI_LAYOUT.meta.top, leftMetaW, metaColH);
    label(UI_LAYOUT.meta.left + 4, UI_LAYOUT.meta.top + 4, 'LEFT META', '#ffaa00');

    // ── 시작 구름 하단 안전선 ─────────────────────────────────
    const safeLineY = this.actionPanel.top - UI_LAYOUT.startPlatform.bottomGap;
    g.lineStyle(2, 0xffff00, 0.80);
    for (let x = 0; x < BASE_WIDTH; x += 40) {
      g.beginPath();
      g.moveTo(x, safeLineY);
      g.lineTo(Math.min(x + 22, BASE_WIDTH), safeLineY);
      g.strokePath();
    }
    label(4, safeLineY - 48, `↑ 구름 하단 안전선  y=${safeLineY}`, '#ffff00');

    // ── 액션 패널 영역 (하단) ─────────────────────────────────
    g.fillStyle(0xff4466, 0.12);
    g.fillRect(0, this.actionPanel.top, BASE_WIDTH, this.actionPanel.height);
    g.lineStyle(3, 0xff4466, 0.9);
    g.strokeRect(1, this.actionPanel.top, BASE_WIDTH - 2, this.actionPanel.height - 1);
    label(
      UI_LAYOUT.hud.side,
      this.actionPanel.top + 8,
      `ACTION PANEL  (top: ${this.actionPanel.top}px, h: ${this.actionPanel.height}px)`,
      '#ff4466',
    );
  }

  // ─────────────────────────────────────────────────────────────

  /** UI 레이어 초기화: 좌/우 메타 아이콘 패널 생성. */
  private setupUILayers(): void {
    this.leftMetaPanel  = new MetaIconPanel(this, 'left');
    this.rightMetaPanel = new MetaIconPanel(this, 'right');

    this.rightMetaPanel.addIcon(this.createShopIcon());
    this.rightMetaPanel.addIcon(this.createRouletteIcon());
  }

  /** 상점 아이콘 (임시 그래픽 — 추후 스프라이트 리소스로 교체 예정) */
  private createShopIcon(): Phaser.GameObjects.Container {
    const size = UI_LAYOUT.meta.iconSize;
    const half = size / 2;

    const container = this.add.container(0, 0);
    container.setSize(size, size).setInteractive({ useHandCursor: true });

    // 배경
    const bg = this.add.graphics();
    bg.fillStyle(0xffffff, 0.88);
    bg.fillRoundedRect(-half, -half, size, size, 20);
    bg.lineStyle(3, 0x88aaee, 1);
    bg.strokeRoundedRect(-half, -half, size, size, 20);

    // 장바구니 그래픽 (임시)
    const cart = this.add.graphics();
    cart.lineStyle(6, 0x2255cc, 1);
    cart.fillStyle(0x2255cc, 1);
    cart.strokeRect(-22, -18, 44, 30);        // 바구니 몸통
    cart.beginPath();
    cart.moveTo(-22, -18);
    cart.lineTo(-32, -34);
    cart.lineTo(-46, -34);
    cart.strokePath();                          // 손잡이
    cart.fillCircle(-12, 22, 8);               // 왼쪽 바퀴
    cart.fillCircle(16, 22, 8);                // 오른쪽 바퀴

    // 레이블
    const label = this.add.text(0, half - 24, '상점', {
      fontSize: '26px',
      color: '#2255cc',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0.5);

    container.add([bg, cart, label]);

    container.on('pointerdown', () => {
      this.scene.launch(SCENE_KEYS.SHOP, { from: SCENE_KEYS.GAME });
      this.scene.pause();
    });

    return container;
  }

  /** 룰렛 아이콘 (임시 그래픽 — 추후 스프라이트로 교체 예정) */
  private createRouletteIcon(): Phaser.GameObjects.Container {
    const size = UI_LAYOUT.meta.iconSize;
    const half = size / 2;

    const container = this.add.container(0, 0);
    container.setSize(size, size).setInteractive({ useHandCursor: true });

    // 배경
    const bg = this.add.graphics();
    bg.fillStyle(0xffffff, 0.88);
    bg.fillRoundedRect(-half, -half, size, size, 20);
    bg.lineStyle(3, 0xcc88ee, 1);
    bg.strokeRoundedRect(-half, -half, size, size, 20);

    // 룰렛 휠 임시 그래픽
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

    // 레이블
    const label = this.add.text(0, half - 24, '룰렛', {
      fontSize: '26px',
      color: '#882299',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0.5);

    container.add([bg, wheel, label]);

    // 무료 스핀 뱃지
    const canFree = this.saveManager.canFreeRoulette();
    if (canFree) {
      const badgeBg = this.add.graphics();
      badgeBg.fillStyle(0xee2222, 1);
      badgeBg.fillRoundedRect(half - 52, -half, 52, 28, 8);

      const badgeText = this.add.text(half - 26, -half + 14, 'FREE', {
        fontSize: '20px',
        color: '#ffffff',
        fontStyle: 'bold',
      }).setOrigin(0.5, 0.5);

      container.add([badgeBg, badgeText]);
    }

    container.on('pointerdown', () => {
      this.scene.launch(SCENE_KEYS.ROULETTE, { from: SCENE_KEYS.GAME });
      this.scene.pause();
    });

    return container;
  }

  /** 하단 액션 패널 + 조작 컨트롤(방향 휠·점프 버튼) 구성 */
  private setupBottomControls(): void {
    // ── 액션 패널 배경 ───────────────────────────────────────
    this.actionPanel = new ActionPanel(this);
    const btnCY = this.actionPanel.centerY; // 버튼 컨트롤 수직 중심

    // ── 패턴별 버튼 배치 결정 ────────────────────────────────
    const isDragPattern = this.jumpPattern === JumpPatternType.PATTERN_1 ||
                          this.jumpPattern === JumpPatternType.PATTERN_2;

    let wheelX: number;
    let wheelY: number;

    if (this.jumpPattern === JumpPatternType.PATTERN_2) {
      // 방향 휠만 중앙
      wheelX = BASE_WIDTH / 2;
      wheelY = btnCY;
      this.jumpBtnCX = BASE_WIDTH / 2;
      this.jumpBtnCY = btnCY;
      this.showJumpBtn = false;
    } else if (this.jumpPattern === JumpPatternType.PATTERN_3) {
      // 점프 버튼만 중앙, 휠은 숨김
      wheelX = BASE_WIDTH / 2;
      wheelY = btnCY;
      this.jumpBtnCX = BASE_WIDTH / 2;
      this.jumpBtnCY = btnCY;
      this.showJumpBtn = true;
    } else {
      // 패턴 1: 휠 좌측, 점프 우측
      wheelX = 220;
      wheelY = btnCY;
      this.jumpBtnCX = BASE_WIDTH - 220;
      this.jumpBtnCY = btnCY;
      this.showJumpBtn = true;
    }

    // ── 방향 휠 생성 ─────────────────────────────────────────
    this.directionWheel = new DirectionWheel(
      this, wheelX, wheelY, DIR_WHEEL_RADIUS,
      isDragPattern ? 'drag' : 'oscillate',
    );
    // 패턴 3: 휠은 내부 각도 계산만, 시각적으로는 숨김
    if (this.jumpPattern === JumpPatternType.PATTERN_3) {
      this.directionWheel.setVisible(false);
    }

    // 패턴 1·2: 드래그 릴리즈로 점프
    if (isDragPattern) {
      this.directionWheel.onPress(() => { this.showDirectionArrow = true; });
      this.directionWheel.onRelease((holdDuration) => { this.handleJump(holdDuration); });
    }

    // ── JUMP 버튼 그래픽 ─────────────────────────────────────
    this.jumpButtonGraphics = this.add.graphics()
      .setScrollFactor(0)
      .setDepth(DEPTH.HUD);

    if (this.showJumpBtn) this.drawJumpButton(false);
  }

  private drawJumpButton(pressed: boolean): void {
    const g = this.jumpButtonGraphics;
    g.clear();
    if (!this.showJumpBtn) return;

    const alpha = pressed ? 0.55 : 0.32;
    const scale = pressed ? 0.92 : 1;
    const r = JUMP_BTN_RADIUS * scale;

    g.fillStyle(0x000000, alpha);
    g.fillCircle(this.jumpBtnCX, this.jumpBtnCY, r + 4);

    g.lineStyle(4, 0xffffff, pressed ? 0.9 : 0.5);
    g.strokeCircle(this.jumpBtnCX, this.jumpBtnCY, r);

    g.fillStyle(0xffffff, pressed ? 0.9 : 0.6);
    const tipX = this.jumpBtnCX;
    const tipY = this.jumpBtnCY - r * 0.38;
    const baseHalf = r * 0.4;
    const baseY = this.jumpBtnCY + r * 0.22;
    g.fillTriangle(tipX, tipY, tipX - baseHalf, baseY, tipX + baseHalf, baseY);
  }

  private setupInput(): void {
    this.inputManager = new InputManager(
      this,
      this.jumpBtnCX,
      this.jumpBtnCY,
      JUMP_BTN_RADIUS + 20,
    );

    // 패턴 3: 버튼 누른 순간 휠 각도 확정 → 릴리즈 시 점프
    if (this.jumpPattern === JumpPatternType.PATTERN_3) {
      this.inputManager.onPress(() => {
        this.capturedAngle = this.directionWheel.angle;
        this.directionWheel.stop();
        this.showDirectionArrow = true;
      });
      this.inputManager.onRelease((holdDuration) => {
        this.handleJump(holdDuration);
      });
    }

    this.inputManager.disable();
    this.time.delayedCall(300, () => {
      if (!this.isGameOver) this.inputManager.enable();
    });
  }

  private setupCamera(): void {
    this.cameras.main.setBackgroundColor(0x87ceeb);
    this.cameras.main.setBounds(-Infinity, -Infinity, Infinity, Infinity);
    this.cameras.main.setScroll(0, 0);
    this.cameras.main.setZoom(1);
  }

  private setupVisibilityPause(): void {
    this._onVisibilityChange = (): void => {
      if (this.isGameOver) return;
      if (document.hidden) {
        if (this.scene.isActive()) this.scene.pause();
      } else {
        if (this.scene.isPaused()) this.scene.resume();
      }
    };
    document.addEventListener('visibilitychange', this._onVisibilityChange);
  }

  // ─── 동적 스폰 / 디스폰 ────────────────────────────────

  private updateSpawn(): void {
    const scrollY = this.cameras.main.scrollY;

    let spawnsThisFrame = 0;
    while (this.spawnSystem.needsSpawn(scrollY) && spawnsThisFrame < 2) {
      const batch = this.spawnSystem.spawnNext(this);
      for (const cloud of batch) {
        this.clouds.push(cloud);
        this.movementSystem.register(cloud);
        // 동결 효과 발동 중이면 새로 스폰되는 모든 구름 즉시 동결
        this.cloudFreezeSystem.onCloudSpawned(cloud);
      }
      // 패턴1 구름(단독 스폰)만 별·자석·얼음·타임슬로우 아이템 후보로 등록
      if (batch.length === 1) {
        const cloud = batch[0]!;
        this.starItemSystem.onPattern1CloudSpawned(cloud);
        this.magnetItemSystem.onPattern1CloudSpawned(cloud, this.starItemSystem.attachedCloudId);
        this.iceItemSystem.onPattern1CloudSpawned(
          cloud,
          this.starItemSystem.attachedCloudId,
          this.magnetItemSystem.attachedCloudId,
        );
        this.timeSlowItemSystem.onPattern1CloudSpawned(
          cloud,
          this.starItemSystem.attachedCloudId,
          this.magnetItemSystem.attachedCloudId,
          this.iceItemSystem.attachedCloudId,
        );
      }
      spawnsThisFrame++;
    }

    const removed = this.spawnSystem.removeOldClouds(
      scrollY, this.currentCloudId, this.clouds,
    );
    for (const cloud of removed) {
      this.starItemSystem.onCloudRemoved(cloud);
      this.magnetItemSystem.onCloudRemoved(cloud);
      this.iceItemSystem.onCloudRemoved(cloud);
      this.timeSlowItemSystem.onCloudRemoved(cloud);
      this.movementSystem.unregister(cloud);
      cloud.destroy();
    }
    if (removed.length > 0) {
      const removedIds = new Set(removed.map((c) => c.id));
      this.clouds = this.clouds.filter((c) => !removedIds.has(c.id));
    }
  }

  // ─── 장애물 충돌 ───────────────────────────────────────

  private checkObstacleCollisions(): void {
    const hit = this.collisionSystem.checkBirdFlockCloud(
      this.obstacleSystem.getFlocks(),
      this.clouds,
    );
    if (hit !== null) {
      hit.cloud.startFalling();
    }
  }

  // ─── 게임 루프 ─────────────────────────────────────────

  private followCurrentCloud(): void {
    const cloud = this.clouds.find((c) => c.id === this.currentCloudId);
    if (!cloud) return;
    this.player.x = cloud.x + this.landingOffsetX;
    this.player.y = cloud.topY - this.player.HALF_H;
    this.player.vx = 0;
    this.player.vy = 0;

    // 탑승 중인 구름이 새떼/번개에 맞아 낙하 중 → 함께 추락 → 화면 이탈 시 게임 오버
    if (cloud.isFalling) {
      const scrollY = this.cameras.main.scrollY;
      if (cloud.y > scrollY + BASE_HEIGHT + 60) {
        this.triggerGameOver(0);
      }
    }
  }

  private applyPhysics(dt: number): void {
    // 포물선 점프(패턴 1) 비행 중 또는 풍선 충돌 낙하 중 중력 적용
    if (this._physicsGravity || this._parabolicJump) {
      this.player.vy = Math.min(
        this.player.vy + GAMEPLAY.GRAVITY * dt,
        GAMEPLAY.MAX_FALL_SPEED,
      );
    }
    this.player.x += this.player.vx * dt;
    this.player.y += this.player.vy * dt;
  }

  private checkLanding(): void {
    if (this.player.isDead && !this._physicsGravity) return;

    // physics fall 중에는 하강 중일 때만 착지 허용
    const requireFalling = this._physicsGravity;

    if (this.magnetSystem.isActive) {
      // 자석 활성: 확장된 범위에 닿으면 즉시 착지 대신 당기기 시작
      const magnetTarget = this.collisionSystem.check(
        this.player,
        this.clouds,
        this.jumpedFromId,
        this.jumpTime,
        this.time.now,
        requireFalling,
        this.magnetSystem.landToleranceY,
        this.magnetSystem.landToleranceX,
      );
      if (magnetTarget !== null) {
        this.startMagnetPull(magnetTarget);
        return;
      }
    } else {
      // 자석 비활성: 기존 즉시 착지
      const landed = this.collisionSystem.check(
        this.player,
        this.clouds,
        this.jumpedFromId,
        this.jumpTime,
        this.time.now,
        requireFalling,
      );
      if (landed !== null) {
        this.handleLand(landed);
        return;
      }
    }

    // 풍선 위험 판정: physics fall 중에는 스킵 (구름·풍선 통과)
    if (!this.player.isDead) {
      const danger = this.collisionSystem.checkDanger(
        this.player,
        this.clouds,
        this.jumpedFromId,
        this.jumpTime,
        this.time.now,
      );
      if (danger !== null) {
        this.handleDangerHit();
      }
    }
  }

  private checkFallDeath(): void {
    const scrollY = this.cameras.main.scrollY;
    const offBottom = this.player.y > scrollY + BASE_HEIGHT + 40;
    const offLeft   = this.player.x < -60;
    const offRight  = this.player.x > BASE_WIDTH + 60;

    if (offBottom || offLeft || offRight) {
      // 물리 낙하 중이면 화면 이탈 즉시 팝업, 아니면 기존 1초 딜레이
      this.triggerGameOver(this._physicsGravity ? 0 : 1000);
      return;
    }
    // 타임아웃 — 물리 낙하 중 또는 포물선 비행 중엔 무시 (자연스럽게 낙하로 종료)
    if (!this.player.isDead && !this._parabolicJump &&
        this.time.now - this.jumpTime > GAMEPLAY.JUMP_STRAIGHT_TIMEOUT_MS) {
      this.triggerGameOver();
    }
  }

  private updateCamera(): void {
    if (this.isDangerSlow) return;
    const targetScrollY = this.player.y - BASE_HEIGHT * GAMEPLAY.CAMERA_FOLLOW_THRESHOLD;
    const currentScrollY = this.cameras.main.scrollY;
    if (targetScrollY < currentScrollY) {
      const next = Phaser.Math.Linear(currentScrollY, targetScrollY, GAMEPLAY.CAMERA_LERP);
      this.cameras.main.setScroll(0, next);
    }
  }

  // ─── 충전 표시 (PATTERN_1 전용) ────────────────────────

  private updateChargeIndicator(): void {
    this.chargeIndicator.clear();

    const isDirectional = this.jumpPattern === JumpPatternType.PATTERN_1 ||
                          this.jumpPattern === JumpPatternType.PATTERN_2 ||
                          this.jumpPattern === JumpPatternType.PATTERN_3;
    if (!isDirectional || !this.player.isOnGround || this.player.isDead || this.isGameOver) return;

    const isCharging = this.jumpPattern === JumpPatternType.PATTERN_3
      ? this.inputManager.isPressed
      : this.directionWheel.isDragging; // 패턴 1·2: 드래그 중
    if (!isCharging) return;

    const duration = this.jumpPattern === JumpPatternType.PATTERN_3
      ? this.inputManager.getChargeDuration()
      : this.directionWheel.getDragDuration();
    const t = Phaser.Math.Clamp(
      (duration - GAMEPLAY.JUMP_CHARGE_MIN_MS) /
        (GAMEPLAY.JUMP_CHARGE_MAX_MS - GAMEPLAY.JUMP_CHARGE_MIN_MS),
      0,
      1,
    );

    this.chargeIndicator.setPosition(this.player.x, this.player.y);

    const radius = 44;
    this.chargeIndicator.lineStyle(3, 0xffffff, 0.22);
    this.chargeIndicator.strokeCircle(0, 0, radius);

    if (t <= 0) return;

    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + Math.PI * 2 * t;
    const color = t < 0.5 ? 0x66ccff : t < 0.9 ? 0xffdd00 : 0xff7700;

    this.chargeIndicator.lineStyle(5, color, 0.92);
    this.chargeIndicator.beginPath();
    this.chargeIndicator.arc(0, 0, radius, startAngle, endAngle, false);
    this.chargeIndicator.strokePath();
  }

  // ─── 방향 화살표 ────────────────────────────────────────

  /** 플레이어 위치에서 방향 휠 각도 방향으로 화살표 표시 */
  private updateDirectionArrow(): void {
    this.directionArrow.clear();

    if (!this.player.isOnGround || this.player.isDead || this.isGameOver) return;
    if (this.jumpPattern !== JumpPatternType.PATTERN_1 &&
        this.jumpPattern !== JumpPatternType.PATTERN_2 &&
        this.jumpPattern !== JumpPatternType.PATTERN_3) return;
    if (!this.showDirectionArrow) return;

    const angle = this.directionWheel.angle;
    const length = 280;
    const isSlow = this.timeSlowSystem?.isActive ?? false;

    const ex = this.player.x + Math.cos(angle) * length;
    const ey = this.player.y + Math.sin(angle) * length;

    // 타임슬로우: 보라색 글로우 레이어 (넓은 → 좁은 순서로 겹쳐서 빛나는 느낌)
    if (isSlow) {
      this.directionArrow.lineStyle(14, 0xaa44ff, 0.12);
      this.directionArrow.beginPath();
      this.directionArrow.moveTo(this.player.x, this.player.y);
      this.directionArrow.lineTo(ex, ey);
      this.directionArrow.strokePath();

      this.directionArrow.lineStyle(7, 0xcc77ff, 0.28);
      this.directionArrow.beginPath();
      this.directionArrow.moveTo(this.player.x, this.player.y);
      this.directionArrow.lineTo(ex, ey);
      this.directionArrow.strokePath();
    }

    // 점선 효과
    const segments = 8;
    const lineColor = isSlow ? 0xeeccff : 0xffffff;
    const lineAlpha = isSlow ? 0.92 : 0.75;
    const lineWidth = isSlow ? 4 : 3;

    // 타임슬로우: 점선 오프셋이 시간에 따라 화살표 방향으로 흘러감
    const flowOffset = isSlow ? (this.time.now / 600) % (1 / segments) : 0;

    this.directionArrow.lineStyle(lineWidth, lineColor, lineAlpha);
    for (let i = 0; i < segments; i++) {
      if (i % 2 === 1) continue;
      const t0 = Math.min(i / segments + flowOffset, 1);
      const t1 = Math.min((i + 0.65) / segments + flowOffset, 1);
      if (t0 >= 1) continue;
      this.directionArrow.beginPath();
      this.directionArrow.moveTo(
        this.player.x + Math.cos(angle) * length * t0,
        this.player.y + Math.sin(angle) * length * t0,
      );
      this.directionArrow.lineTo(
        this.player.x + Math.cos(angle) * length * t1,
        this.player.y + Math.sin(angle) * length * t1,
      );
      this.directionArrow.strokePath();
    }

    // 화살촉
    const headSize = 22;
    const lx = ex + Math.cos(angle + Math.PI * 0.78) * headSize;
    const ly = ey + Math.sin(angle + Math.PI * 0.78) * headSize;
    const rx = ex + Math.cos(angle - Math.PI * 0.78) * headSize;
    const ry = ey + Math.sin(angle - Math.PI * 0.78) * headSize;

    this.directionArrow.fillStyle(isSlow ? 0xeeccff : 0xffffff, isSlow ? 0.95 : 0.85);
    this.directionArrow.fillTriangle(ex, ey, lx, ly, rx, ry);
  }

  // ─── JUMP 버튼 상태 갱신 ───────────────────────────────

  private updateJumpButton(): void {
    if (!this.showJumpBtn) return;
    this.drawJumpButton(this.inputManager.isPressed);
  }

  // ─── 이벤트 처리 ───────────────────────────────────────

  private handleJump(chargeDuration: number): void {
    if (!this.player.isOnGround || this.player.isDead) return;

    // 패턴 3: 버튼 누른 순간 확정된 각도 / 패턴 2: 드래그 릴리즈 시의 휠 각도
    const angle = this.jumpPattern === JumpPatternType.PATTERN_3
      ? this.capturedAngle
      : this.directionWheel.angle;

    const jumped = this.jumpSystem.jump(
      this.player,
      this.clouds,
      this.currentCloudId,
      chargeDuration,
      this.jumpPattern,
      angle,
    );

    if (jumped) {
      this.jumpedFromId = this.currentCloudId;
      this.jumpTime = this.time.now;
      this.resetMissDetection();
      this.jumpTargetCloud = this.findJumpTarget();
      this._parabolicJump = (this.jumpPattern === JumpPatternType.PATTERN_1);
    }
  }

  private handleLand(cloud: CloudIsland): void {
    if (this.isDangerSlow) this.cancelDangerSlow();
    this.resetMissDetection();

    this._parabolicJump = false;
    const prevId = this.currentCloudId;

    const maxOffset = cloud.halfW - this.player.HALF_W * 0.6;
    this.landingOffsetX = Phaser.Math.Clamp(this.player.x - cloud.x, -maxOffset, maxOffset);

    this.player.isOnGround = true;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.y = cloud.topY - this.player.HALF_H;
    this.currentCloudId = cloud.id;

    // 착지 시 화살표 숨기고 휠 상태 복원
    this.showDirectionArrow = false;
    this.resetWheelOnLand();

    if (cloud.id !== prevId) {
      this.scoreSystem.onLand(cloud.topY, cloud.x);
    }

    // 별 착지 수집 — 해당 구름에 별이 있으면 로켓 모드 발동
    if (this.starItemSystem.checkLanding(cloud)) {
      this.startRocketMode();
      return;
    }

    // 자석 아이템 수집 — 자석 효과 활성화
    if (this.magnetItemSystem.checkLanding(cloud)) {
      this.magnetSystem.activate();
      this.scoreHud.showMagnetTimer(this.magnetSystem.timer);
    }

    // 얼음 아이템 수집 — 구름 동결 + 장애물 홀딩 효과 활성화
    if (this.iceItemSystem.checkLanding(cloud)) {
      this.cloudFreezeSystem.activate(this.clouds);
      this.obstacleSystem.freeze();
      this.scoreHud.showFreezeTimer(this.cloudFreezeSystem.timer);
    }

    // 타임슬로우 아이템 수집 — 게임 세계 속도 절반으로 감소
    if (this.timeSlowItemSystem.checkLanding(cloud)) {
      this.timeSlowSystem.activate();
      this.scoreHud.showSlowTimer(this.timeSlowSystem.timer);
    }

    // 풍선 충돌 낙하 중 착지 → 게임 계속
    if (this._physicsGravity) {
      this.player.isDead = false;
      this._physicsGravity = false;
      this.time.delayedCall(300, () => {
        if (!this.isGameOver) {
          this.inputManager.enable();
          const isDragPat = this.jumpPattern === JumpPatternType.PATTERN_1 ||
                            this.jumpPattern === JumpPatternType.PATTERN_2;
          if (isDragPat) this.directionWheel.enable();
        }
      });
    }
  }

  /** 착지 시 패턴별 휠 상태 복원 */
  private resetWheelOnLand(): void {
    const isDragPattern = this.jumpPattern === JumpPatternType.PATTERN_1 ||
                          this.jumpPattern === JumpPatternType.PATTERN_2;
    if (isDragPattern) {
      this.directionWheel.resetAngle(); // 드래그 핸들 중앙 복귀
      // 패턴 1·2: 드래그 시작 시 화살표 표시 (showDirectionArrow = false 유지)
    } else {
      this.directionWheel.resume();   // 패턴 3: 진자 재개
      this.showDirectionArrow = true; // 진자 방향 항상 표시
    }
  }

  /** 풍선 충돌: 0.3초 제자리 대기 → 살짝 위로 팝 → 중력 낙하 → 화면 이탈 시 팝업 */
  private handleDangerHit(): void {
    if (this.isGameOver || this.player.isDead) return;

    this.player.isDead = true;
    this.player.isOnGround = false;
    this._parabolicJump = false;

    // 충돌 당시 수평 속도 보존 (0.3초 후 낙하 방향에 반영)
    const savedVx = this.player.vx * 0.6;

    // 제자리 정지
    this.player.vx = 0;
    this.player.vy = 0;

    this.inputManager.disable();
    this.audioManager.stopBgm();
    const isDragPattern = this.jumpPattern === JumpPatternType.PATTERN_1 ||
                          this.jumpPattern === JumpPatternType.PATTERN_2;
    if (isDragPattern) this.directionWheel.disable();

    // 0.3초 대기 후 살짝 위로 튀어 오르며 중력 낙하 시작
    this.time.delayedCall(300, () => {
      this.player.vx = savedVx;
      this.player.vy = -320; // 위로 살짝 팝
      this._physicsGravity = true;
    });
  }

  private togglePause(): void {
    if (this.isGameOver) return;
    this.isPaused = !this.isPaused;

    const isDragPattern = this.jumpPattern === JumpPatternType.PATTERN_1 ||
                          this.jumpPattern === JumpPatternType.PATTERN_2;

    if (this.isPaused) {
      this.inputManager.disable();
      if (isDragPattern) this.directionWheel.disable();

      this.pausePopup = new PausePopup(
        this,
        () => {
          // 다시하기
          this.scene.start(SCENE_KEYS.GAME, { pattern: this.jumpPattern });
        },
        () => {
          // 메인으로
          this.scene.start(SCENE_KEYS.MAIN);
        },
        () => {
          // 계속하기
          this.isPaused = false;
          this.pausePopup?.destroy();
          this.pausePopup = null;
          if (!this.player.isDead) {
            this.inputManager.enable();
            if (isDragPattern) this.directionWheel.enable();
          }
        },
      );
    } else {
      if (!this.player.isDead) {
        this.inputManager.enable();
        if (isDragPattern) this.directionWheel.enable();
      }
      this.pausePopup?.destroy();
      this.pausePopup = null;
    }
  }

  private async initHudProfile(): Promise<void> {
    const user = await authService.getUser();
    if (!user || !this.scene.isActive(SCENE_KEYS.GAME)) return;
    const isGuest = user.is_anonymous === true;
    const name = isGuest
      ? '게스트'
      : ((user.user_metadata?.['full_name'] as string | undefined)
          ?? user.email
          ?? '플레이어');
    this.topHud.updateProfile(name, isGuest);
  }

  private triggerGameOver(_delay: number = 1000): void {
    if (this.isGameOver) return;

    // danger slow 진행 중이면 연출 즉시 정리
    if (this.isDangerSlow) this.cleanupDangerSlow();

    this.isGameOver = true;
    this.player.isDead = true;
    this.inputManager.disable();
    this.audioManager.stopBgm();

    const isDragPattern = this.jumpPattern === JumpPatternType.PATTERN_1 ||
                          this.jumpPattern === JumpPatternType.PATTERN_2;
    if (isDragPattern) this.directionWheel.disable();

    this.events.emit(EVENTS.GAME_OVER);

    this.time.delayedCall(600, () => {
      if (this.scene.isActive(SCENE_KEYS.GAME)) this.finalizeGameOver();
    });
  }

  // ─── Dramatic 연출 (위험 상황 줌인 + 슬로우모션) ──────────

  private updateDangerSlow(delta: number): void {
    // Fly-Out은 전용 Slow Factor 사용 (Landing Miss보다 더 강한 슬로우)
    const slowFactor = this.isFlyOutDramatic
      ? GAMEPLAY.FLYOUT_DRAMATIC_SLOW_FACTOR
      : GAMEPLAY.DRAMATIC_SLOW_FACTOR;
    const slowDelta = delta * slowFactor;
    const dt        = slowDelta / 1000;

    this.dangerSlowElapsed += delta; // real-time 기준 누적

    // 월드 슬로모션
    this.movementSystem.update(slowDelta);
    this.spawnSystem.updateVortexPositions(slowDelta);

    // 플레이어 물리 슬로모션
    this.applyPhysics(dt);
    this.player.sync();
    // 카메라 추적은 startFollow가 preRender에서 자동으로 처리함 (수동 setScroll 불필요)

    // 착지 체크 → 성공 시 연출 취소 후 정상 게임 복귀
    this.checkLanding();
    if (this.player.isOnGround) return; // handleLand → cancelDangerSlow 에서 처리

    if (this.isFlyOutDramatic) {
      // Fly-Out 3단계: ZOOM_IN(0~ZOOM_IN_MS) → HOLD(~+HOLD_MS) → RETURN(endFlyOutDramatic 호출)
      // ZOOM_IN / HOLD 는 slow motion + camera follow 유지.
      // HOLD 종료 시점에 endFlyOutDramatic() → camera 복귀 + time scale 정상화.
      // 게임오버 예약 X — 실제 화면 이탈 시 checkFallDeath 가 처리.
      const holdEndMs = GAMEPLAY.FLYOUT_DRAMATIC_ZOOM_IN_MS + GAMEPLAY.FLYOUT_DRAMATIC_HOLD_MS;
      if (this.dangerSlowElapsed >= holdEndMs) {
        this.endFlyOutDramatic();
      }
    } else {
      // Landing Miss: 시간 초과 후 게임오버 (안전장치)
      if (this.dangerSlowElapsed >= GAMEPLAY.DRAMATIC_DURATION_MS) {
        this.cleanupDangerSlow();
        this.triggerGameOver(0);
      }
    }
  }

  private startDangerSlow(): void {
    this.isDangerSlow          = true;
    this.dangerSlowElapsed     = 0;
    this.dramaticTriggeredThisJump = true;

    const cam = this.cameras.main;
    // player 객체의 x/y를 Phaser Camera Follow Target으로 직접 등록.
    // startFollow는 즉시 scrollX = player.x - cam.width/2 로 세팅 후
    // 이후 매 preRender 마다 플레이어 위치를 따라 scroll을 갱신하므로
    // zoom 변화 중에도 플레이어가 항상 화면 정중앙에 위치한다.
    cam.startFollow(this.player as unknown as Phaser.GameObjects.GameObject, false, 1, 1);
    cam.zoomTo(GAMEPLAY.DRAMATIC_ZOOM, GAMEPLAY.DRAMATIC_ZOOM_IN_MS, 'Quad.easeOut');
  }

  private cancelDangerSlow(): void {
    const scrollY = this.cameras.main.scrollY;
    this.isFlyOutDramatic = false;
    this.cleanupDangerSlow();
    const cam = this.cameras.main;
    // 일반 모드 scrollX = 0 으로 즉시 복귀 (일반 카메라는 항상 scrollX=0 사용)
    cam.setScroll(0, scrollY);
    cam.zoomTo(1, GAMEPLAY.DRAMATIC_ZOOM_OUT_MS, 'Quad.easeOut');
  }

  private cleanupDangerSlow(): void {
    this.isDangerSlow      = false;
    this.dangerSlowElapsed = 0;
    this.cameras.main.stopFollow();
  }

  private resetMissDetection(): void {
    this.jumpTargetCloud               = null;
    this.dramaticTriggeredThisJump     = false;
    this.flyOutDramaticTriggeredThisJump = false;
    this.airborneDistAccum             = 0;
    this.airbornePrevX                 = this.player.x;
    this.airbornePrevY                 = this.player.y;
  }

  /**
   * 이번 점프의 Target Cloud를 결정한다.
   * JumpSystem.findTarget()과 동일한 선택 기준 (위쪽 구름 우선, 없으면 가장 가까운 구름).
   */
  private findJumpTarget(): CloudIsland | null {
    const others = this.clouds.filter(c => !c.isFalling && c.id !== this.jumpedFromId);
    if (others.length === 0) return null;

    const above = others.filter(c => c.y < this.player.y - 60);
    const pool  = above.length > 0 ? above : others;

    return pool.reduce<CloudIsland>((best, c) => {
      const db = Math.hypot(best.x - this.player.x, best.y - this.player.y);
      const dc = Math.hypot(c.x    - this.player.x, c.y    - this.player.y);
      return dc < db ? c : best;
    }, pool[0] as CloudIsland);
  }

  /**
   * MISS 판정 — Target Cloud의 실제 착지 가능 Y 범위를 하강 중에 통과했고
   * 그 시점에 X overlap이 없으면 MISS 확정.
   */
  private checkDangerSlowTrigger(): void {
    if (this.player.isOnGround || this.isDangerSlow || this.isGameOver) return;
    if (this.isMagnetPulling || this.isRocketMode || this.dramaticTriggeredThisJump) return;

    // 상승 중에는 MISS 판정 안 함 (vy < 0 = 위로 이동)
    if (this.player.vy <= 0) return;

    // Target이 낙하 중이면 더 이상 추적 불가 → 폴백만 사용
    if (this.jumpTargetCloud?.isFalling) {
      this.jumpTargetCloud = null;
    }

    if (this.jumpTargetCloud !== null) {
      const cloud = this.jumpTargetCloud;

      // 착지 판정 Y 범위: cloudTop - LAND_TOLERANCE_Y ~ cloudTop + LAND_TOLERANCE_Y + 18
      // (CollisionSystem.check 와 동일한 범위)
      const landingWindowBottom = cloud.topY + GAMEPLAY.LAND_TOLERANCE_Y + 18;

      // 하강 중 착지 가능 Y 범위를 완전히 통과했는지 확인
      if (this.player.bottom > landingWindowBottom) {
        const hasXOverlap = this.player.right > cloud.leftX && this.player.left < cloud.rightX;
        if (!hasXOverlap) {
          // X 영역 overlap 없이 착지 높이를 통과 → MISS 확정
          this.startDangerSlow();
          return;
        }
        // X overlap 있으면 이미 CollisionSystem에서 착지 처리됐거나 곧 처리됨
      }
    } else {
      // Target을 특정할 수 없을 때만 안전장치 시간 트리거
      const elapsedSec = (this.time.now - this.jumpTime) / 1000;
      if (elapsedSec > GAMEPLAY.DRAMATIC_SAFETY_SEC) {
        this.startDangerSlow();
      }
    }
  }

  // ─── Fly-Out Dramatic (긴 비행 + 화면 이탈 직전 연출) ─────

  /** 공중 이동 중 매 프레임 실제 비행 거리를 누적한다. */
  private accumulateAirborneDistance(): void {
    const dx = this.player.x - this.airbornePrevX;
    const dy = this.player.y - this.airbornePrevY;
    this.airborneDistAccum += Math.hypot(dx, dy);
    this.airbornePrevX = this.player.x;
    this.airbornePrevY = this.player.y;
  }

  /**
   * Player가 viewport 가장자리 Danger Zone에 있는지 판정.
   * 좌/우 이탈이 주 케이스이므로 Top edge는 제외 (카메라가 위를 따라가므로 오탐 방지).
   * 모두 일반 카메라 기준 (scrollX=0, zoom=1) world 좌표 계산.
   */
  private isInEdgeDangerZone(): boolean {
    const cam    = this.cameras.main;
    const ratio  = GAMEPLAY.FLYOUT_EDGE_DANGER_RATIO;
    const marginX = BASE_WIDTH  * ratio;
    const marginY = BASE_HEIGHT * ratio;

    // Normal camera: scrollX=0, zoom=1 → player screen X = player.x
    const screenX = this.player.x;
    const screenY = this.player.y - cam.scrollY;

    return (
      screenX < marginX ||                    // 왼쪽 이탈 직전
      screenX > BASE_WIDTH - marginX ||       // 오른쪽 이탈 직전
      screenY > BASE_HEIGHT - marginY         // 아래쪽 이탈 직전 (위는 카메라가 따라가므로 제외)
    );
  }

  /**
   * Fly-Out Dramatic Trigger.
   * 조건: AIRBORNE + 누적 비행거리 ≥ 임계값 + Edge Danger Zone 진입 + 점프당 1회
   */
  private checkFlyOutDramaticTrigger(): void {
    if (this.player.isOnGround || this.isDangerSlow || this.isGameOver) return;
    if (this.isMagnetPulling || this.isRocketMode) return;
    if (this.flyOutDramaticTriggeredThisJump) return;

    const diagonal   = Math.hypot(BASE_WIDTH, BASE_HEIGHT); // ≈ 2203px
    const minDist    = diagonal * GAMEPLAY.FLYOUT_DRAMATIC_MIN_DISTANCE_RATIO;

    if (this.airborneDistAccum < minDist) return;
    if (!this.isInEdgeDangerZone()) return;

    this.startFlyOutDramatic();
  }

  private startFlyOutDramatic(): void {
    this.flyOutDramaticTriggeredThisJump = true;
    this.dramaticTriggeredThisJump       = true; // Landing Miss도 재발동 방지
    this.isDangerSlow                    = true;
    this.isFlyOutDramatic                = true;
    this.dangerSlowElapsed               = 0;

    const cam = this.cameras.main;
    cam.startFollow(this.player as unknown as Phaser.GameObjects.GameObject, false, 1, 1);
    // zoomTo는 Phaser TweenManager로 실행 → 우리 slow factor와 무관하게 real-time 기준
    cam.zoomTo(GAMEPLAY.DRAMATIC_ZOOM, GAMEPLAY.FLYOUT_DRAMATIC_ZOOM_IN_MS, 'Quad.easeOut');
  }

  /**
   * Fly-Out Dramatic 종료.
   * 연출 후 카메라를 일반 상태로 복귀, 플레이어 물리는 그대로 유지.
   * 게임오버 직접 호출 X — Player가 실제 화면 밖으로 나갈 때 checkFallDeath가 처리.
   */
  private endFlyOutDramatic(): void {
    this.isFlyOutDramatic = false;
    const scrollY = this.cameras.main.scrollY;
    this.cleanupDangerSlow(); // stopFollow + isDangerSlow=false → 다음 프레임부터 일반 루프 재개
    const cam = this.cameras.main;
    cam.setScroll(0, scrollY);
    // [RETURN 단계] real-time 기준 zoom 복귀 — 이후 Player는 정상 속도로 계속 이동
    // checkFallDeath가 실제 화면 이탈을 감지하면 그때 triggerGameOver
    cam.zoomTo(1, GAMEPLAY.FLYOUT_DRAMATIC_RETURN_MS, 'Quad.easeOut');
  }

  private finalizeGameOver(): void {
    const score       = this.scoreSystem.getScore();
    const isNewBest   = this.saveManager.submitScore(score.current, score.jumps);
    const scoreCoin   = score.current * GAMEPLAY.COIN_PER_SCORE;
    this.saveManager.addCoins(scoreCoin); // 보너스 코인은 이미 플레이 중 추가됨
    const coinsEarned = scoreCoin + this.bonusCoinsEarned;
    const totalCoins  = this.saveManager.getCoins();

    this.scene.start(SCENE_KEYS.RESULT, {
      score: { ...score },
      isNewBest,
      pattern: this.jumpPattern,
      coinsEarned,
      totalCoins,
      milestoneCount: this.scoreSystem.getAchievedMilestoneCount(),
      coinBags: [...this.coinBags],
    });
  }

  // ─── 자석 당기기 ───────────────────────────────────────

  private startMagnetPull(cloud: CloudIsland): void {
    this.isMagnetPulling = true;
    this.magnetPullTarget = cloud;
    this.magnetPullTimer = 1.0;
    this._parabolicJump = false;
    this._physicsGravity = false;
    this.player.isOnGround = false;
    this.player.isDead = false;
    this.showDirectionArrow = false;

    this.magnetSystem.startPull();

    this.inputManager.disable();
    const isDragPattern = this.jumpPattern === JumpPatternType.PATTERN_1 ||
                          this.jumpPattern === JumpPatternType.PATTERN_2;
    if (isDragPattern) this.directionWheel.disable();
  }

  private updateMagnetPull(dt: number): void {
    const cloud = this.magnetPullTarget;
    if (!cloud) {
      this.isMagnetPulling = false;
      return;
    }

    // 당기는 도중 구름이 낙하하기 시작하면 취소 → 중력 낙하로 전환
    if (cloud.isFalling) {
      this.magnetSystem.endPull();
      this.isMagnetPulling = false;
      this.magnetPullTarget = null;
      this._physicsGravity = true;
      this.jumpTime = this.time.now;
      this.resetMissDetection();
      this.jumpTargetCloud = this.findJumpTarget();
      return;
    }

    this.magnetPullTimer -= dt;

    // 타깃: 구름 중앙 위. 구름이 궤도를 계속 이동하므로 매 프레임 갱신
    const targetX = cloud.x;
    const targetY = cloud.topY - this.getPlayerHalfH();

    // 진행률(0→1)에 따라 당기는 속도를 점점 빠르게 (ease-in)
    const progress = 1 - Math.max(0, this.magnetPullTimer) / 1.0;
    const lerpSpeed = 2.5 + progress * 14;
    const lerpT = Math.min(1, dt * lerpSpeed);

    this.player.x = Phaser.Math.Linear(this.player.x, targetX, lerpT);
    this.player.y = Phaser.Math.Linear(this.player.y, targetY, lerpT);
    this.player.vx = 0;
    this.player.vy = 0;

    // 당기기 이펙트 매 프레임 갱신
    this.magnetSystem.updatePull(this.player.x, this.player.y, cloud.x, cloud.topY, progress);

    if (this.magnetPullTimer <= 0) {
      // 1초 완료 → 중앙에 스냅 후 착지 처리
      this.player.x = cloud.x;
      this.player.y = cloud.topY - this.getPlayerHalfH();
      this.magnetSystem.endPull();
      this.isMagnetPulling = false;
      this.magnetPullTarget = null;

      this.handleLand(cloud);

      this.time.delayedCall(250, () => {
        if (!this.isGameOver && !this.player.isDead) {
          this.inputManager.enable();
          const isDragPattern = this.jumpPattern === JumpPatternType.PATTERN_1 ||
                                this.jumpPattern === JumpPatternType.PATTERN_2;
          if (isDragPattern) this.directionWheel.enable();
        }
      });
    }
  }

  // ─── 로켓 모드 ─────────────────────────────────────────

  private startRocketMode(): void {
    this.isRocketMode = true;
    this.rocketTimer = ITEM_CONFIG.ROCKET_DURATION_SEC;
    this.rocketLanding = false;
    this.rocketLandTarget = null;
    this.rocketLandTimeout = 0;
    this.rocketPassedCloudIds.clear();

    this.player.isOnGround = false;
    this.player.isDead = false;
    this.player.vx = 0;
    this.player.vy = 0;
    this._parabolicJump = false;
    this._physicsGravity = false;

    this.inputManager.disable();
    const isDragPattern = this.jumpPattern === JumpPatternType.PATTERN_1 ||
                          this.jumpPattern === JumpPatternType.PATTERN_2;
    if (isDragPattern) this.directionWheel.disable();

    this.scoreHud.showRocketTimer(this.rocketTimer);
  }

  private updateRocketMode(dt: number): void {
    if (this.rocketLanding) {
      // 착지 탐색 단계: 타깃 구름까지 계속 상승
      this.player.y -= ITEM_CONFIG.ROCKET_SPEED * dt;
      this.player.vx = 0;
      this.player.vy = -ITEM_CONFIG.ROCKET_SPEED;
      this.drawRocketTrail();
      this.checkRocketCloudPass();

      this.rocketLandTimeout -= dt;

      if (this.rocketLandTarget) {
        const margin = 55;
        const horzOk =
          this.player.x >= this.rocketLandTarget.leftX - margin &&
          this.player.x <= this.rocketLandTarget.rightX + margin;
        const reachedCloud = this.player.y <= this.rocketLandTarget.topY;

        if (horzOk && reachedCloud) {
          this.landAfterRocket(this.rocketLandTarget);
          return;
        }
      }

      if (this.rocketLandTimeout <= 0) {
        this.endRocketMode(); // 안전 타임아웃: 중력 낙하로 전환
      }
      return;
    }

    // 활성 단계: 카운트다운
    this.rocketTimer -= dt;

    if (this.rocketTimer <= 0) {
      const target = this.findNearestCloudAbove();
      if (target) {
        this.rocketLanding = true;
        this.rocketLandTarget = target;
        this.rocketLandTimeout = 2; // 최대 2초 추가 비행
        this.scoreHud.hideRocketTimer();
      } else {
        this.endRocketMode();
      }
      return;
    }

    // 직선 상승
    this.player.y -= ITEM_CONFIG.ROCKET_SPEED * dt;
    this.player.vx = 0;
    this.player.vy = -ITEM_CONFIG.ROCKET_SPEED;
    this.drawRocketTrail();
    this.checkRocketCloudPass();
    this.scoreHud.updateRocketTimer(this.rocketTimer);
  }

  private endRocketMode(): void {
    this.isRocketMode = false;
    this.rocketTimer = 0;
    this.rocketLanding = false;
    this.rocketLandTarget = null;
    this.rocketLandTimeout = 0;
    this.rocketTrailGraphics.clear();
    this.scoreHud.hideRocketTimer();

    // 로켓 종료 후 약한 상승→중력 낙하로 자연스럽게 전환
    this.player.vy = ITEM_CONFIG.ROCKET_END_VY;
    this.player.vx = 0;
    this._physicsGravity = true;
    this.jumpTime = this.time.now;
    this.jumpedFromId = '';
    this.resetMissDetection();
    this.jumpTargetCloud = this.findJumpTarget();

    this.time.delayedCall(250, () => {
      if (!this.isGameOver && !this.player.isDead) {
        this.inputManager.enable();
        const isDragPattern = this.jumpPattern === JumpPatternType.PATTERN_1 ||
                              this.jumpPattern === JumpPatternType.PATTERN_2;
        if (isDragPattern) this.directionWheel.enable();
      }
    });
  }

  private drawRocketTrail(): void {
    const g = this.rocketTrailGraphics;
    g.clear();

    const trailColors = [0xFF5500, 0xFF8800, 0xFFCC00, 0xFFEE66];
    for (let i = 0; i < 7; i++) {
      const t = i / 7;
      const cy = this.player.y + 32 + i * 24;
      const r = 13 * (1 - t * 0.65);
      const alpha = 0.9 * (1 - t * 0.82);
      const colorIdx = Math.min(Math.floor(t * trailColors.length), trailColors.length - 1);
      g.fillStyle(trailColors[colorIdx]!, alpha);
      g.fillCircle(this.player.x, cy, r);
    }
  }

  private checkRocketCloudPass(): void {
    for (const cloud of this.clouds) {
      if (this.rocketPassedCloudIds.has(cloud.id)) continue;
      if (cloud.id === this.currentCloudId) continue;
      if (cloud.id === this.rocketLandTarget?.id) continue; // 착지 타깃은 handleLand()에서 스코어

      // 플레이어가 구름 상단면을 통과했는지 (위로 지나쳤는지) 판정
      const horzOverlap =
        this.player.x >= cloud.leftX - 20 &&
        this.player.x <= cloud.rightX + 20;
      const vertPassed = this.player.top < cloud.topY;

      if (horzOverlap && vertPassed) {
        this.rocketPassedCloudIds.add(cloud.id);
        this.scoreSystem.onLand(cloud.topY, cloud.x);
      }
    }
  }

  /** 플레이어 정면 상방 직선상에 있는 가장 가까운 구름 반환 */
  private findNearestCloudAbove(): CloudIsland | null {
    const playerTop = this.player.y - this.player.HALF_H;
    let nearest: CloudIsland | null = null;
    let nearestDist = Infinity;

    for (const cloud of this.clouds) {
      if (cloud.id === this.currentCloudId) continue;
      if (cloud.isFalling) continue;
      // 구름 상단이 플레이어 상단보다 위(작은 Y)에 있어야 함
      if (cloud.topY >= playerTop) continue;
      // 수평 겹침 — 직선 경로 내
      const margin = 55;
      if (this.player.x < cloud.leftX - margin || this.player.x > cloud.rightX + margin) continue;
      // 가장 가까운(topY 가 가장 큰) 구름 선택
      const dist = playerTop - cloud.topY;
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = cloud;
      }
    }

    return nearest;
  }

  /** 로켓 착지 단계 완료 — 구름 위에 플레이어를 올려놓고 정상 착지 처리 */
  private landAfterRocket(cloud: CloudIsland): void {
    this.isRocketMode = false;
    this.rocketLanding = false;
    this.rocketLandTarget = null;
    this.rocketLandTimeout = 0;
    this.rocketTrailGraphics.clear();
    this.scoreHud.hideRocketTimer();

    // 구름 상단에 스냅
    this.player.y = cloud.topY - this.player.HALF_H;

    this.handleLand(cloud);

    // handleLand 의 일반 흐름에서는 입력을 재활성화하지 않으므로 여기서 처리
    this.time.delayedCall(250, () => {
      if (!this.isGameOver && !this.player.isDead) {
        this.inputManager.enable();
        const isDragPattern = this.jumpPattern === JumpPatternType.PATTERN_1 ||
                              this.jumpPattern === JumpPatternType.PATTERN_2;
        if (isDragPattern) this.directionWheel.enable();
      }
    });
  }

  // ─── BIG JUMP / 마일스톤 이벤트 핸들러 ───────────────────

  private onBigJump(payload: { text: string; coins: number; worldX: number; worldY: number }): void {
    this.bonusCoinsEarned += payload.coins;
    this.coinBags.push({ coins: payload.coins });
    this.saveManager.addCoins(payload.coins);
    this.showFloatingText(payload.worldX, payload.worldY, payload.text, payload.coins);
    this.spawnCoinParticles(payload.worldX, payload.worldY, payload.text === 'AMAZING!' ? 10 : 6);
  }

  private onMilestone(payload: { landingCount: number; coins: number; level: string }): void {
    this.bonusCoinsEarned += payload.coins;
    this.coinBags.push({ coins: payload.coins });
    this.saveManager.addCoins(payload.coins);
    this.scoreHud.addCoinBag();
    this.showMilestoneFanfare(payload.level, payload.coins);
  }

  /** 착지 지점 위에서 위로 떠오르며 사라지는 텍스트 연출 (world 좌표) */
  private showFloatingText(worldX: number, worldY: number, text: string, coins: number): void {
    const label = this.add.text(worldX, worldY - 30, text, {
      fontSize: '58px', fontStyle: 'bold',
      color: '#ffee00', stroke: '#774400', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(DEPTH.EFFECT);

    const coinLabel = this.add.text(worldX, worldY + 38, `+${coins} coin`, {
      fontSize: '38px', fontStyle: 'bold',
      color: '#ffcc44', stroke: '#664400', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(DEPTH.EFFECT);

    this.tweens.add({
      targets: [label, coinLabel],
      y: `-=${160}`,
      alpha: 0,
      duration: 1300,
      ease: 'Cubic.easeOut',
      onComplete: () => { label.destroy(); coinLabel.destroy(); },
    });
  }

  /** 코인 파티클 분출 (Graphics 도트 사용) */
  private spawnCoinParticles(worldX: number, worldY: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.6;
      const speed = 90 + Math.random() * 130;
      const dot = this.add.graphics().setDepth(DEPTH.EFFECT);
      const r = 7 + Math.random() * 6;
      dot.fillStyle(0xffcc00, 1);
      dot.fillCircle(0, 0, r);
      dot.setPosition(worldX, worldY);

      this.tweens.add({
        targets: dot,
        x: worldX + Math.cos(angle) * speed,
        y: worldY + Math.sin(angle) * speed - 60,
        alpha: 0,
        scaleX: 0.15,
        scaleY: 0.15,
        duration: 650 + Math.random() * 350,
        ease: 'Cubic.easeOut',
        onComplete: () => dot.destroy(),
      });
    }
  }

  /** HUD 위에 팡파레 텍스트 표시 (screen 고정) */
  private showMilestoneFanfare(level: string, coins: number): void {
    const cx = BASE_WIDTH / 2;
    const cy = BASE_HEIGHT * 0.33;

    const sizeMap: Record<string, string> = {
      small: '52px', medium: '62px', large: '72px', full: '84px',
    };
    const fontSize = sizeMap[level] ?? '52px';
    const labelText = `착지 마일스톤! +${coins} coin`;

    const label = this.add
      .text(cx, cy, labelText, {
        fontSize,
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#1133aa',
        strokeThickness: 7,
        backgroundColor: '#00224488',
        padding: { x: 36, y: 18 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH.HUD + 2)
      .setAlpha(0);

    // 전체 화면 플래시 (full 마일스톤 전용)
    if (level === 'full') {
      const flash = this.add
        .rectangle(0, 0, BASE_WIDTH, BASE_HEIGHT, 0xffffff, 0.28)
        .setOrigin(0)
        .setScrollFactor(0)
        .setDepth(DEPTH.HUD + 1);
      this.tweens.add({
        targets: flash,
        alpha: 0,
        duration: 400,
        ease: 'Sine.easeIn',
        onComplete: () => flash.destroy(),
      });
    }

    this.tweens.add({
      targets: label,
      alpha: 1,
      duration: 280,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.time.delayedCall(1100, () => {
          this.tweens.add({
            targets: label,
            alpha: 0,
            y: cy - 70,
            duration: 550,
            ease: 'Sine.easeIn',
            onComplete: () => label.destroy(),
          });
        });
      },
    });
  }

  // ─── 씬 정리 ───────────────────────────────────────────

  shutdown(): void {
    this.events.off(EVENTS.BIG_JUMP, this.onBigJump, this);
    this.events.off(EVENTS.MILESTONE, this.onMilestone, this);
    if (this._onVisibilityChange) {
      document.removeEventListener('visibilitychange', this._onVisibilityChange);
      this._onVisibilityChange = null;
    }
    this.topHud?.destroy();
    this.scoreHud?.destroy();
    this.pausePopup?.destroy();
    this.pausePopup = null;
    this.actionPanel?.destroy();
    this.leftMetaPanel?.destroy();
    this.rightMetaPanel?.destroy();
    this.directionWheel?.destroy();
    this.inputManager?.destroy();
    this.movementSystem?.clear();
    this.spawnSystem?.clearAll();
    this.obstacleSystem?.clearAll();
    this.starItemSystem?.clearAll();
    this.magnetItemSystem?.clearAll();
    this.iceItemSystem?.clearAll();
    this.timeSlowItemSystem?.clearAll();
    this.shieldSystem?.clearAll();
    this.magnetSystem?.clearAll();
    this.cloudFreezeSystem?.clearAll(this.clouds ?? []);
    this.timeSlowSystem?.clearAll();
    this.clouds?.forEach((c) => c.destroy());
    this.clouds = [];
    this.player?.destroy();
    this.chargeIndicator?.destroy();
    this.directionArrow?.destroy();
    this.rocketTrailGraphics?.destroy();
    this.jumpButtonGraphics?.destroy();
  }
}
