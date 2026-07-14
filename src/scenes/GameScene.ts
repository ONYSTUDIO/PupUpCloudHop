import Phaser from 'phaser';
import { Player } from '@entities/Player';
import { CloudIsland } from '@entities/CloudIsland';
import { JumpSystem } from '@systems/JumpSystem';
import { CollisionSystem } from '@systems/CollisionSystem';
import { PlatformMovementSystem } from '@systems/PlatformMovementSystem';
import { ScoreSystem } from '@systems/ScoreSystem';
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
  // 착지 시 계산하고, 탑승 중에는 이 값을 유지해 착지 지점에 고정
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

    // Phaser 3.87은 씬 재시작 시 user-defined shutdown()을 자동 호출하지 않으므로 명시적으로 등록
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
  }

  update(_time: number, delta: number): void {
    if (this.isGameOver) return;

    const dt = delta / 1000;

    // 1. 구름섬 위치 갱신
    this.movementSystem.update(delta);

    // 2. 플레이어 물리 / 위치 처리
    if (this.player.isOnGround) {
      this.followCurrentCloud();
    } else {
      this.applyPhysics(dt);
      this.checkLanding();
      this.checkFallDeath();
    }

    // 3. 그래픽 동기화
    this.player.sync();

    // 4. 충전 표시 업데이트
    this.updateChargeIndicator();

    // 5. 카메라 따라가기
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
  }

  private createPlayer(): void {
    const startCloud = this.clouds.find((c) => c.id === this.currentCloudId);
    const sx = startCloud?.x ?? BASE_WIDTH / 2;
    const sy = startCloud ? startCloud.topY - this.getPlayerHalfH() : BASE_HEIGHT - 400;

    this.player = new Player(this, sx, sy);
    this.player.isOnGround = true;
    this.landingOffsetX = 0; // 시작 위치는 구름 중심
  }

  private getPlayerHalfH(): number {
    return 28; // Player.HALF_H — 인스턴스 없이 상수값 참조
  }

  private setupInput(): void {
    this.inputManager = new InputManager(this);

    // 손가락을 떼는 순간 점프 실행 (충전 시간 전달)
    this.inputManager.onRelease((chargeDuration) => {
      this.handleJump(chargeDuration);
    });

    // ResultScene 버튼의 POINTER_UP이 새 GameScene으로 유입되지 않도록
    // 씬 전환 직후 짧은 시간 동안 입력을 잠근다
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

  // ─── 게임 루프 ─────────────────────────────────────────

  /** 탑승 중인 구름섬과 함께 이동 — 착지 오프셋 유지 */
  private followCurrentCloud(): void {
    const cloud = this.clouds.find((c) => c.id === this.currentCloudId);
    if (!cloud) return;
    // 구름 중심에서 착지 오프셋만큼 떨어진 위치에 고정
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

  /**
   * 화면을 누르고 있는 동안 플레이어 주위에 충전 링을 표시한다.
   * 색상: 파랑(작은 힘) → 노랑(중간) → 주황(최대)
   */
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

    // 배경 링 (항상 표시)
    this.chargeIndicator.lineStyle(3, 0xffffff, 0.22);
    this.chargeIndicator.strokeCircle(0, 0, radius);

    if (t <= 0) return;

    // 충전 호 (시계 방향, 12시 방향 시작)
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + Math.PI * 2 * t;

    // t에 따라 색상 변화: 파랑 → 노랑 → 주황
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

  /** 손가락을 뗐을 때 충전 시간을 받아 점프 실행 */
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

  /**
   * 착지 처리.
   * 착지 순간의 player.x 를 기준으로 구름 중심과의 오프셋을 저장하고
   * 이후 followCurrentCloud()에서 해당 위치를 유지한다.
   * (구름 중심으로 자동 이동하지 않음)
   */
  private handleLand(cloud: CloudIsland): void {
    const prevId = this.currentCloudId;

    // 착지 위치 오프셋 계산
    // 구름 가장자리를 넘지 않도록 플레이어 폭의 절반만큼 여유를 둠
    const maxOffset = cloud.halfW - this.player.HALF_W * 0.6;
    this.landingOffsetX = Phaser.Math.Clamp(this.player.x - cloud.x, -maxOffset, maxOffset);

    this.player.isOnGround = true;
    this.player.vx = 0;
    this.player.vy = 0;
    // Y만 구름 윗면으로 보정, X는 그대로 유지
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
    this.clouds?.forEach((c) => c.destroy());
    this.clouds = [];
    this.player?.destroy();
    this.chargeIndicator?.destroy();
  }
}
