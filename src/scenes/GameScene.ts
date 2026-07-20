import Phaser from 'phaser';
import { Player } from '@entities/Player';
import { CloudIsland } from '@entities/CloudIsland';
import { JumpSystem } from '@systems/JumpSystem';
import { CollisionSystem } from '@systems/CollisionSystem';
import { PlatformMovementSystem } from '@systems/PlatformMovementSystem';
import { ScoreSystem } from '@systems/ScoreSystem';
import { SpawnSystem } from '@systems/SpawnSystem';
import { AudioManager } from '@managers/AudioManager';
import { InputManager } from '@managers/InputManager';
import { SaveManager } from '@managers/SaveManager';
import { GameHud } from '@ui/GameHud';
import { DirectionWheel } from '@ui/DirectionWheel';
import { JumpPatternType } from '@game-types/game';
import { SCENE_KEYS, DEPTH, EVENTS, INITIAL_CLOUD_LAYOUT } from '@config/constants';
import { BASE_WIDTH, BASE_HEIGHT } from '@config/gameConfig';
import { GAMEPLAY } from '@config/gameplayConfig';

// ─── 하단 버튼 레이아웃 상수 ────────────────────────────────
const JUMP_BTN_CX = 860;
const JUMP_BTN_CY = 1760;
const JUMP_BTN_RADIUS = 120;

const DIR_WHEEL_CX = 220;
const DIR_WHEEL_CY = 1760;
const DIR_WHEEL_RADIUS = 145;

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

  // 매니저 / UI
  private audioManager!: AudioManager;
  private inputManager!: InputManager;
  private saveManager!: SaveManager;
  private hud!: GameHud;
  private directionWheel!: DirectionWheel;

  // 그래픽
  private chargeIndicator!: Phaser.GameObjects.Graphics;
  private jumpButtonGraphics!: Phaser.GameObjects.Graphics;
  private directionArrow!: Phaser.GameObjects.Graphics;

  // 테스트 디버그
  private debugPatternText!: Phaser.GameObjects.Text;

  // 게임 상태
  private currentCloudId: string = '';
  private jumpedFromId: string = '';
  private jumpTime: number = 0;
  private isGameOver: boolean = false;
  private jumpPattern: JumpPatternType = JumpPatternType.PATTERN_1;
  private landingOffsetX: number = 0;
  private showDirectionArrow: boolean = true;

  private _onVisibilityChange: (() => void) | null = null;

  constructor() {
    super({ key: SCENE_KEYS.GAME });
  }

  create(): void {
    this.isGameOver = false;
    this.clouds = [];
    this.currentCloudId = INITIAL_CLOUD_LAYOUT[0].id;
    this.jumpedFromId = '';
    this.jumpTime = 0;
    this.landingOffsetX = 0;

    this.saveManager = new SaveManager();
    this.audioManager = new AudioManager(this, this.saveManager.isSoundEnabled());
    this.movementSystem = new PlatformMovementSystem();
    this.jumpSystem = new JumpSystem();
    this.collisionSystem = new CollisionSystem();
    this.scoreSystem = new ScoreSystem(this, this.saveManager.getBestScore());
    this.hud = new GameHud(this, this.saveManager.getBestScore());

    this.setupBackground();
    this.createClouds();
    this.createPlayer();
    this.setupBottomControls();
    this.setupInput();
    this.setupCamera();
    this.setupVisibilityPause();

    this.chargeIndicator = this.add.graphics().setDepth(DEPTH.PLAYER + 1);
    this.directionArrow = this.add.graphics().setDepth(DEPTH.PLAYER + 1);

    this.debugPatternText = this.add
      .text(20, 100, '', { fontSize: '28px', color: '#ffff00', stroke: '#000000', strokeThickness: 4 })
      .setScrollFactor(0)
      .setDepth(DEPTH.HUD + 1);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
  }

  update(_time: number, delta: number): void {
    if (this.isGameOver) return;

    const dt = delta / 1000;

    // 1. 구름섬 위치 갱신
    this.movementSystem.update(delta);
    this.spawnSystem.updateVortexPositions(delta);

    // 2. 동적 스폰 / 디스폰
    this.updateSpawn();

    // 3. 플레이어 물리 / 위치 처리
    if (this.player.isOnGround) {
      this.followCurrentCloud();
    } else {
      this.applyPhysics(dt);
      this.checkLanding();
      this.checkFallDeath();
    }

    // 4. 그래픽 동기화
    this.player.sync();

    // 5. 충전 표시 (PATTERN_1 전용)
    this.updateChargeIndicator();

    // 6. 방향 화살표
    this.updateDirectionArrow();

    // 7. JUMP 버튼 시각 상태
    this.updateJumpButton();

    // 8. 카메라
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
      for (const cloud of this.spawnSystem.spawnNext(this)) {
        this.clouds.push(cloud);
        this.movementSystem.register(cloud);
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

  /** 하단 컨트롤 UI: 방향 휠 + JUMP 버튼 */
  private setupBottomControls(): void {
    // 방향 휠 — 손을 놓으면 바로 점프
    this.directionWheel = new DirectionWheel(
      this, DIR_WHEEL_CX, DIR_WHEEL_CY, DIR_WHEEL_RADIUS,
    );
    this.directionWheel.onPress(() => {
      this.showDirectionArrow = true;
    });
    this.directionWheel.onRelease((holdDuration) => {
      this.handleJump(holdDuration);
    });

    // JUMP 버튼 배경 (정적 — 상태 갱신은 updateJumpButton에서)
    this.jumpButtonGraphics = this.add.graphics()
      .setScrollFactor(0)
      .setDepth(DEPTH.HUD);

    this.drawJumpButton(false);
  }

  private drawJumpButton(pressed: boolean): void {
    const g = this.jumpButtonGraphics;
    g.clear();

    const alpha = pressed ? 0.55 : 0.32;
    const scale = pressed ? 0.92 : 1;
    const r = JUMP_BTN_RADIUS * scale;

    g.fillStyle(0x000000, alpha);
    g.fillCircle(JUMP_BTN_CX, JUMP_BTN_CY, r + 4);

    g.lineStyle(4, 0xffffff, pressed ? 0.9 : 0.5);
    g.strokeCircle(JUMP_BTN_CX, JUMP_BTN_CY, r);

    g.fillStyle(0xffffff, pressed ? 0.9 : 0.6);
    // "JUMP" 텍스트 대신 위쪽 화살표 삼각형
    const tipX = JUMP_BTN_CX;
    const tipY = JUMP_BTN_CY - r * 0.38;
    const baseHalf = r * 0.4;
    const baseY = JUMP_BTN_CY + r * 0.22;
    g.fillTriangle(tipX, tipY, tipX - baseHalf, baseY, tipX + baseHalf, baseY);
  }

  private setupInput(): void {
    this.inputManager = new InputManager(
      this,
      JUMP_BTN_CX,
      JUMP_BTN_CY,
      JUMP_BTN_RADIUS + 20,
    );
    // PATTERN_1은 방향 휠 release로 점프 — JUMP 버튼은 시각 효과만 유지

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
      for (const cloud of this.spawnSystem.spawnNext(this)) {
        this.clouds.push(cloud);
        this.movementSystem.register(cloud);
      }
      spawnsThisFrame++;
    }

    const removed = this.spawnSystem.removeOldClouds(
      scrollY, this.currentCloudId, this.clouds,
    );
    for (const cloud of removed) {
      this.movementSystem.unregister(cloud);
      cloud.destroy();
    }
    if (removed.length > 0) {
      const removedIds = new Set(removed.map((c) => c.id));
      this.clouds = this.clouds.filter((c) => !removedIds.has(c.id));
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
  }

  private applyPhysics(dt: number): void {
    // 두 패턴 모두 직선 이동 — 중력 없음
    this.player.x += this.player.vx * dt;
    this.player.y += this.player.vy * dt;
  }

  private checkLanding(): void {
    // 직선 이동이므로 상승 중에도 착지 판정 허용
    const landed = this.collisionSystem.check(
      this.player,
      this.clouds,
      this.jumpedFromId,
      this.jumpTime,
      this.time.now,
      false,
    );
    if (landed !== null) this.handleLand(landed);
  }

  private checkFallDeath(): void {
    const scrollY = this.cameras.main.scrollY;
    const offBottom = this.player.y > scrollY + BASE_HEIGHT + 40;
    const offLeft   = this.player.x < -60;
    const offRight  = this.player.x > BASE_WIDTH + 60;

    if (offBottom || offLeft || offRight) {
      this.triggerGameOver();
      return;
    }
    // 미착지 타임아웃
    if (this.time.now - this.jumpTime > GAMEPLAY.JUMP_STRAIGHT_TIMEOUT_MS) {
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

    const isPattern1 = this.jumpPattern === JumpPatternType.PATTERN_1;
    if (!isPattern1 || !this.directionWheel.isDragging || !this.player.isOnGround || this.player.isDead || this.isGameOver) {
      return;
    }

    const duration = this.directionWheel.getDragDuration();
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
    if (this.jumpPattern !== JumpPatternType.PATTERN_1) return;
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
    this.drawJumpButton(this.inputManager.isPressed);
  }

  // ─── 이벤트 처리 ───────────────────────────────────────

  private handleJump(chargeDuration: number): void {
    if (!this.player.isOnGround || this.player.isDead) return;

    // TODO: 테스트 완료 후 아래 주석 교체
    // 랜덤: this.jumpPattern = Phaser.Math.RND.pick([JumpPatternType.PATTERN_1, JumpPatternType.PATTERN_2]);
    this.jumpPattern = JumpPatternType.PATTERN_1; // 테스트: 방향 휠 항상 활성

    this.debugPatternText.setText(`JUMP: ${this.jumpPattern}`);

    const jumped = this.jumpSystem.jump(
      this.player,
      this.clouds,
      this.currentCloudId,
      chargeDuration,
      this.jumpPattern,
      this.directionWheel.angle,
    );

    if (jumped) {
      this.jumpedFromId = this.currentCloudId;
      this.jumpTime = this.time.now;
    }
  }

  private handleLand(cloud: CloudIsland): void {
    const prevId = this.currentCloudId;

    const maxOffset = cloud.halfW - this.player.HALF_W * 0.6;
    this.landingOffsetX = Phaser.Math.Clamp(this.player.x - cloud.x, -maxOffset, maxOffset);

    this.player.isOnGround = true;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.y = cloud.topY - this.player.HALF_H;
    this.currentCloudId = cloud.id;

    // 착지 시 화살표 숨기고 방향 초기화
    this.showDirectionArrow = false;
    this.directionWheel.resetAngle();

    if (cloud.id !== prevId) {
      this.scoreSystem.onLand();
      this.events.emit(EVENTS.SCORE_UPDATE, this.scoreSystem.getScore());
    }
  }

  private triggerGameOver(): void {
    if (this.isGameOver) return;
    this.isGameOver = true;

    this.player.isDead = true;
    this.inputManager.disable();
    this.audioManager.stopBgm();

    const score = this.scoreSystem.getScore();
    const isNewBest = this.saveManager.submitScore(score.current, score.jumps);

    this.events.emit(EVENTS.GAME_OVER);

    this.time.delayedCall(1000, () => {
      this.scene.start(SCENE_KEYS.RESULT, { score: { ...score }, isNewBest });
    });
  }

  // ─── 씬 정리 ───────────────────────────────────────────

  shutdown(): void {
    if (this._onVisibilityChange) {
      document.removeEventListener('visibilitychange', this._onVisibilityChange);
      this._onVisibilityChange = null;
    }
    this.hud?.destroy();
    this.debugPatternText?.destroy();
    this.directionWheel?.destroy();
    this.inputManager?.destroy();
    this.movementSystem?.clear();
    this.spawnSystem?.clearAll();
    this.clouds?.forEach((c) => c.destroy());
    this.clouds = [];
    this.player?.destroy();
    this.chargeIndicator?.destroy();
    this.directionArrow?.destroy();
    this.jumpButtonGraphics?.destroy();
  }
}
