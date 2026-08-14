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
import { ShieldSystem } from '@systems/ShieldSystem';
import { AudioManager } from '@managers/AudioManager';
import { InputManager } from '@managers/InputManager';
import { SaveManager } from '@managers/SaveManager';
import { GameHud } from '@ui/GameHud';
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
const DEBUG_SHOW_UI_BOUNDS = true;

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
  private shieldSystem!: ShieldSystem;

  // 매니저 / UI
  private audioManager!: AudioManager;
  private inputManager!: InputManager;
  private saveManager!: SaveManager;
  private hud!: GameHud;
  private directionWheel!: DirectionWheel;
  private actionPanel!: ActionPanel;
  private leftMetaPanel!: MetaIconPanel;
  private rightMetaPanel!: MetaIconPanel;

  // 그래픽
  private chargeIndicator!: Phaser.GameObjects.Graphics;
  private jumpButtonGraphics!: Phaser.GameObjects.Graphics;
  private directionArrow!: Phaser.GameObjects.Graphics;
  private rocketTrailGraphics!: Phaser.GameObjects.Graphics;
  private pauseOverlayBg!: Phaser.GameObjects.Rectangle;
  private pauseOverlayText!: Phaser.GameObjects.Text;

  // 패턴별 버튼 위치 (setupBottomControls에서 결정)
  private jumpBtnCX: number = 0;
  private jumpBtnCY: number = 0;
  private showJumpBtn: boolean = true;

  // 게임 상태
  private currentCloudId: string = '';
  private jumpedFromId: string = '';
  private jumpTime: number = 0;
  private isGameOver: boolean = false;
  private isPaused: boolean = false;
  private jumpPattern: JumpPatternType = JumpPatternType.PATTERN_3;
  private landingOffsetX: number = 0;
  private showDirectionArrow: boolean = true;
  private _physicsGravity: boolean = false;  // 풍선 충돌 후 중력 낙하
  private _parabolicJump: boolean = false;    // 패턴 1 비행 중 중력
  private capturedAngle: number = -Math.PI / 2; // 패턴 3 전용: 버튼 누른 순간 각도

  // 로켓 모드
  private isRocketMode: boolean = false;
  private rocketTimer: number = 0;
  private rocketLanding: boolean = false;       // 3초 이후 착지 탐색 단계
  private rocketLandTarget: CloudIsland | null = null;
  private rocketLandTimeout: number = 0;        // 착지 탐색 안전 타임아웃
  private rocketPassedCloudIds: Set<string> = new Set();

  private _onVisibilityChange: (() => void) | null = null;

  constructor() {
    super({ key: SCENE_KEYS.GAME });
  }

  create(data?: { pattern?: JumpPatternType; useShield?: boolean }): void {
    this.jumpPattern = data?.pattern ?? JumpPatternType.PATTERN_3;
    this.isGameOver = false;
    this.isPaused = false;
    this._physicsGravity = false;
    this._parabolicJump = false;
    this.isRocketMode = false;
    this.rocketTimer = 0;
    this.rocketLanding = false;
    this.rocketLandTarget = null;
    this.rocketLandTimeout = 0;
    this.rocketPassedCloudIds = new Set();
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
    this.obstacleSystem = new ObstacleSystem(this, this.time.now);
    this.starItemSystem = new StarItemSystem(this);
    this.shieldSystem = new ShieldSystem(this);
    this.hud = new GameHud(this, this.saveManager.getBestScore(), () => this.togglePause());

    this.setupBackground();
    this.createClouds();
    this.createPlayer();
    this.setupUILayers();
    this.setupBottomControls();
    this.setupInput();
    this.setupCamera();
    this.setupVisibilityPause();

    this.chargeIndicator = this.add.graphics().setDepth(DEPTH.PLAYER + 1);
    this.directionArrow = this.add.graphics().setDepth(DEPTH.PLAYER + 1);
    this.rocketTrailGraphics = this.add.graphics().setDepth(DEPTH.PLAYER - 1);

    this.pauseOverlayBg = this.add
      .rectangle(BASE_WIDTH / 2, BASE_HEIGHT / 2, BASE_WIDTH, BASE_HEIGHT, 0x000000, 0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH.HUD + 10)
      .setVisible(false);

    this.pauseOverlayText = this.add
      .text(BASE_WIDTH / 2, BASE_HEIGHT / 2, '일시정지', {
        fontSize: '100px', fontStyle: 'bold',
        color: '#ffffff', stroke: '#003399', strokeThickness: 10,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH.HUD + 11)
      .setVisible(false);

    if (data?.useShield) this.shieldSystem.activate();

    if (DEBUG_SHOW_UI_BOUNDS) this.drawDebugUiBounds();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
  }

  update(_time: number, delta: number): void {
    if (this.isGameOver || this.isPaused) return;

    const dt = delta / 1000;
    const scrollY = this.cameras.main.scrollY;

    // 1. 구름섬 위치 갱신 + 방향 휠 진자 갱신
    this.movementSystem.update(delta);
    this.spawnSystem.updateVortexPositions(delta);
    this.directionWheel.update(delta);

    // 2. 별 아이템 / 방어막 업데이트
    this.starItemSystem.update(delta, scrollY);
    this.shieldSystem.update(delta, this.player.x, this.player.y);

    // ── 로켓 모드 분기 ──────────────────────────────────────
    if (this.isRocketMode) {
      this.updateRocketMode(dt);
      this.updateSpawn();
      this.player.sync();
      this.updateCamera();
      return;
    }

    // 3. 장애물 업데이트 (새떼 + 번개)
    this.obstacleSystem.update(delta, this.time.now, scrollY);
    this.checkObstacleCollisions();

    const currentCloud = this.player.isOnGround
      ? (this.clouds.find((c) => c.id === this.currentCloudId) ?? null)
      : null;
    const stormHitId = this.obstacleSystem.updateStorm(
      delta, this.time.now, scrollY, currentCloud,
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
    if (this.player.isOnGround) {
      this.followCurrentCloud();
    } else {
      this.applyPhysics(dt);
      this.checkLanding();
      this.checkFallDeath();
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
    for (const cfg of INITIAL_CLOUD_LAYOUT) {
      const cloud = new CloudIsland(this, cfg);
      this.clouds.push(cloud);
      this.movementSystem.register(cloud);
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
      // 패턴1 구름(단독 스폰)만 별 후보로 등록
      if (batch.length === 1) this.starItemSystem.onPattern1CloudSpawned(batch[0]!);
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
    // 향후 아이콘 추가 예시:
    //   this.rightMetaPanel.addIcon(shopButton);
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
      }
      // 패턴1 구름(단독 스폰)만 별 후보로 등록
      if (batch.length === 1) this.starItemSystem.onPattern1CloudSpawned(batch[0]!);
      spawnsThisFrame++;
    }

    const removed = this.spawnSystem.removeOldClouds(
      scrollY, this.currentCloudId, this.clouds,
    );
    for (const cloud of removed) {
      this.starItemSystem.onCloudRemoved(cloud); // 별이 붙어있으면 함께 제거
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

    const ex = this.player.x + Math.cos(angle) * length;
    const ey = this.player.y + Math.sin(angle) * length;

    // 점선 효과: 선분 여러 개
    const segments = 8;
    const segLen = length / segments;
    this.directionArrow.lineStyle(3, 0xffffff, 0.75);
    for (let i = 0; i < segments; i++) {
      if (i % 2 === 1) continue; // 홀수는 공백
      const t0 = i / segments;
      const t1 = (i + 0.65) / segments;
      this.directionArrow.beginPath();
      this.directionArrow.moveTo(
        this.player.x + Math.cos(angle) * segLen * segments * t0,
        this.player.y + Math.sin(angle) * segLen * segments * t0,
      );
      this.directionArrow.lineTo(
        this.player.x + Math.cos(angle) * segLen * segments * t1,
        this.player.y + Math.sin(angle) * segLen * segments * t1,
      );
      this.directionArrow.strokePath();
    }

    // 화살촉
    const headSize = 22;
    const lx = ex + Math.cos(angle + Math.PI * 0.78) * headSize;
    const ly = ey + Math.sin(angle + Math.PI * 0.78) * headSize;
    const rx = ex + Math.cos(angle - Math.PI * 0.78) * headSize;
    const ry = ey + Math.sin(angle - Math.PI * 0.78) * headSize;

    this.directionArrow.fillStyle(0xffffff, 0.85);
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
      this._parabolicJump = (this.jumpPattern === JumpPatternType.PATTERN_1);
    }
  }

  private handleLand(cloud: CloudIsland): void {
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
      this.scoreSystem.onLand();
      this.events.emit(EVENTS.SCORE_UPDATE, this.scoreSystem.getScore());
    }

    // 별 착지 수집 — 해당 구름에 별이 있으면 로켓 모드 발동
    if (this.starItemSystem.checkLanding(cloud)) {
      this.startRocketMode();
      return;
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
      this.pauseOverlayBg.setVisible(true);
      this.pauseOverlayText.setVisible(true);
    } else {
      if (!this.player.isDead) {
        this.inputManager.enable();
        if (isDragPattern) this.directionWheel.enable();
      }
      this.pauseOverlayBg.setVisible(false);
      this.pauseOverlayText.setVisible(false);
    }

    this.hud.setPaused(this.isPaused);
  }

  private triggerGameOver(delay: number = 1000): void {
    if (this.isGameOver) return;
    this.isGameOver = true;

    this.player.isDead = true;
    this.inputManager.disable();
    this.audioManager.stopBgm();

    const score = this.scoreSystem.getScore();
    const isNewBest = this.saveManager.submitScore(score.current, score.jumps);

    this.events.emit(EVENTS.GAME_OVER);

    this.time.delayedCall(delay, () => {
      this.scene.start(SCENE_KEYS.RESULT, { score: { ...score }, isNewBest, pattern: this.jumpPattern });
    });
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

    this.hud.showRocketTimer(this.rocketTimer);
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
        this.hud.hideRocketTimer();
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
    this.hud.updateRocketTimer(this.rocketTimer);
  }

  private endRocketMode(): void {
    this.isRocketMode = false;
    this.rocketTimer = 0;
    this.rocketLanding = false;
    this.rocketLandTarget = null;
    this.rocketLandTimeout = 0;
    this.rocketTrailGraphics.clear();
    this.hud.hideRocketTimer();

    // 로켓 종료 후 약한 상승→중력 낙하로 자연스럽게 전환
    this.player.vy = ITEM_CONFIG.ROCKET_END_VY;
    this.player.vx = 0;
    this._physicsGravity = true;
    this.jumpTime = this.time.now;
    this.jumpedFromId = '';

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
        this.scoreSystem.onLand(); // onLand()가 내부에서 SCORE_UPDATE 이벤트 발행
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
    this.hud.hideRocketTimer();

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

  // ─── 씬 정리 ───────────────────────────────────────────

  shutdown(): void {
    if (this._onVisibilityChange) {
      document.removeEventListener('visibilitychange', this._onVisibilityChange);
      this._onVisibilityChange = null;
    }
    this.hud?.destroy();
    this.actionPanel?.destroy();
    this.leftMetaPanel?.destroy();
    this.rightMetaPanel?.destroy();
    this.directionWheel?.destroy();
    this.inputManager?.destroy();
    this.movementSystem?.clear();
    this.spawnSystem?.clearAll();
    this.obstacleSystem?.clearAll();
    this.starItemSystem?.clearAll();
    this.shieldSystem?.clearAll();
    this.clouds?.forEach((c) => c.destroy());
    this.clouds = [];
    this.player?.destroy();
    this.chargeIndicator?.destroy();
    this.directionArrow?.destroy();
    this.rocketTrailGraphics?.destroy();
    this.jumpButtonGraphics?.destroy();
    this.pauseOverlayBg?.destroy();
    this.pauseOverlayText?.destroy();
  }
}
