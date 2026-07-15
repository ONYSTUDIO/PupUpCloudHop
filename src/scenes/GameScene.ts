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
import { SCENE_KEYS, DEPTH, EVENTS, INITIAL_CLOUD_LAYOUT } from '@config/constants';
import { BASE_WIDTH, BASE_HEIGHT } from '@config/gameConfig';
import { GAMEPLAY } from '@config/gameplayConfig';

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

  // 매니저
  private audioManager!: AudioManager;
  private inputManager!: InputManager;
  private saveManager!: SaveManager;
  private hud!: GameHud;

  // 게임 상태
  private currentCloudId: string = '';
  private jumpedFromId: string = '';
  private jumpTime: number = 0;
  private isGameOver: boolean = false;

  // 착지 위치: 구름 중심에서의 수평 오프셋
  private landingOffsetX: number = 0;

  // 충전 표시 그래픽
  private chargeIndicator!: Phaser.GameObjects.Graphics;

  // visibility 핸들러 참조 (shutdown 시 직접 제거)
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
    this.setupInput();
    this.setupCamera();
    this.setupVisibilityPause();

    this.chargeIndicator = this.add.graphics().setDepth(DEPTH.PLAYER + 1);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
  }

  update(_time: number, delta: number): void {
    if (this.isGameOver) return;

    const dt = delta / 1000;

    // 1. 구름섬 위치 갱신 (패턴 1: 개별 궤도, 패턴 2: 회오리 그룹)
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

    // 5. 충전 표시 업데이트
    this.updateChargeIndicator();

    // 6. 카메라 따라가기
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
    // 초기 고정 레이아웃 (패턴 1)
    for (const cfg of INITIAL_CLOUD_LAYOUT) {
      const cloud = new CloudIsland(this, cfg);
      this.clouds.push(cloud);
      this.movementSystem.register(cloud);
    }

    // 초기 레이아웃 최상단 구름 기준으로 스폰 시스템 시작
    const topCloud = INITIAL_CLOUD_LAYOUT[INITIAL_CLOUD_LAYOUT.length - 1]!;
    this.spawnSystem = new SpawnSystem(
      topCloud.centerY,
      INITIAL_CLOUD_LAYOUT.length,
      BASE_WIDTH,
      BASE_HEIGHT,
    );

    // 초기 카메라 위치(scrollY=0) 기준 충분한 구름 미리 생성
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

  private getPlayerHalfH(): number {
    return 28;
  }

  private setupInput(): void {
    this.inputManager = new InputManager(this);

    this.inputManager.onRelease((chargeDuration) => {
      this.handleJump(chargeDuration);
    });

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

    // 플레이어가 위로 올라감에 따라 새 구름 생성 (한 프레임에 최대 2패턴)
    let spawnsThisFrame = 0;
    while (this.spawnSystem.needsSpawn(scrollY) && spawnsThisFrame < 2) {
      for (const cloud of this.spawnSystem.spawnNext(this)) {
        this.clouds.push(cloud);
        this.movementSystem.register(cloud);
      }
      spawnsThisFrame++;
    }

    // 카메라 하단 밖으로 벗어난 구름 제거
    const removed = this.spawnSystem.removeOldClouds(
      scrollY,
      this.currentCloudId,
      this.clouds,
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

  /** 탑승 중인 구름섬과 함께 이동 — 착지 오프셋 유지 */
  private followCurrentCloud(): void {
    const cloud = this.clouds.find((c) => c.id === this.currentCloudId);
    if (!cloud) return;
    this.player.x = cloud.x + this.landingOffsetX;
    this.player.y = cloud.topY - this.player.HALF_H;
    this.player.vx = 0;
    this.player.vy = 0;
  }

  private applyPhysics(dt: number): void {
    this.player.vy += GAMEPLAY.GRAVITY * dt;
    this.player.vy = Math.min(this.player.vy, GAMEPLAY.MAX_FALL_SPEED);
    this.player.x += this.player.vx * dt;
    this.player.y += this.player.vy * dt;
  }

  private checkLanding(): void {
    const landed = this.collisionSystem.check(
      this.player,
      this.clouds,
      this.jumpedFromId,
      this.jumpTime,
      this.time.now,
    );
    if (landed !== null) this.handleLand(landed);
  }

  private checkFallDeath(): void {
    const deathLineY = this.cameras.main.scrollY + BASE_HEIGHT + 220;
    if (this.player.y > deathLineY) {
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

  // ─── 충전 표시 ─────────────────────────────────────────

  private updateChargeIndicator(): void {
    this.chargeIndicator.clear();

    if (!this.inputManager.isPressed || !this.player.isOnGround || this.player.isDead || this.isGameOver) {
      return;
    }

    const duration = this.inputManager.getChargeDuration();
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

    let color: number;
    if (t < 0.5) {
      color = 0x66ccff;
    } else if (t < 0.9) {
      color = 0xffdd00;
    } else {
      color = 0xff7700;
    }

    this.chargeIndicator.lineStyle(5, color, 0.92);
    this.chargeIndicator.beginPath();
    this.chargeIndicator.arc(0, 0, radius, startAngle, endAngle, false);
    this.chargeIndicator.strokePath();
  }

  // ─── 이벤트 처리 ───────────────────────────────────────

  private handleJump(chargeDuration: number): void {
    if (!this.player.isOnGround || this.player.isDead) return;

    const jumped = this.jumpSystem.jump(
      this.player,
      this.clouds,
      this.currentCloudId,
      chargeDuration,
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
    this.inputManager?.destroy();
    this.movementSystem?.clear();
    this.spawnSystem?.clearAll();
    this.clouds?.forEach((c) => c.destroy());
    this.clouds = [];
    this.player?.destroy();
    this.chargeIndicator?.destroy();
  }
}
