import Phaser from 'phaser';
import { BirdFlock } from '@entities/Obstacle';
import { LightningStorm } from '@entities/LightningStorm';
import type { CloudIsland } from '@entities/CloudIsland';
import { OBSTACLE_CONFIG } from '@config/constants';
import { BASE_WIDTH, BASE_HEIGHT } from '@config/gameConfig';

export class ObstacleSystem {
  // ── 새떼 ────────────────────────────────────────────────
  private flocks: BirdFlock[] = [];
  private nextFlockTime: number;
  private birdsUnlocked: boolean = false;
  private _birdIntervalMin: number = OBSTACLE_CONFIG.SPAWN_INTERVAL_MIN_MS;
  private _birdIntervalMax: number = OBSTACLE_CONFIG.SPAWN_INTERVAL_MAX_MS;

  // ── 번개 폭풍 ───────────────────────────────────────────
  private storm: LightningStorm | null = null;
  private nextStormTime: number;
  private stormUnlocked: boolean = false;
  private _stormIntervalMin: number = OBSTACLE_CONFIG.STORM_SPAWN_INTERVAL_MIN_MS;
  private _stormIntervalMax: number = OBSTACLE_CONFIG.STORM_SPAWN_INTERVAL_MAX_MS;

  // ── 전역 쿨다운 (새떼·번개 동시 등장 방지) ─────────────
  private static readonly GLOBAL_COOLDOWN_MS = 5000;

  // ── 동결 상태 (얼음 아이템 효과) ────────────────────────
  private _isFrozen: boolean = false;

  // ── 첫 등장 콜백 ────────────────────────────────────────
  private _onFirstBirdUnlock?: () => void;
  private _onFirstStormUnlock?: () => void;

  /**
   * @param now - 씬 생성 시점의 this.time.now
   *   Phaser 시각은 게임 전체 누적이므로 절대값(DELAY_MS)으로 비교하면
   *   재시작 시 즉시 스폰되는 버그가 발생. 상대값(now + DELAY)으로 설정.
   */
  constructor(private readonly scene: Phaser.Scene, now: number) {
    this.nextFlockTime = now + OBSTACLE_CONFIG.FIRST_SPAWN_DELAY_MS;
    this.nextStormTime = now + OBSTACLE_CONFIG.STORM_FIRST_SPAWN_DELAY_MS;
  }

  /**
   * 첫 장애물 등장 시 호출할 콜백을 설정한다.
   * GameScene에서 경고 UI를 표시하는 데 사용.
   */
  setFirstUnlockCallbacks(onBird: () => void, onStorm: () => void): void {
    this._onFirstBirdUnlock = onBird;
    this._onFirstStormUnlock = onStorm;
  }

  /**
   * D 기반 스폰 간격을 갱신한다.
   * GameScene이 착지 시마다 호출하면 된다.
   */
  setSpawnIntervals(
    birdMin: number, birdMax: number,
    stormMin: number, stormMax: number,
  ): void {
    this._birdIntervalMin  = birdMin;
    this._birdIntervalMax  = birdMax;
    this._stormIntervalMin = stormMin;
    this._stormIntervalMax = stormMax;
  }

  freeze(): void   { this._isFrozen = true; }
  unfreeze(): void { this._isFrozen = false; }

  // ── 새떼 업데이트 ────────────────────────────────────────

  update(delta: number, now: number, cameraScrollY: number, landings: number): void {
    if (this._isFrozen) {
      // 스폰 타이머를 동결 시간만큼 밀어 해제 후 즉시 스폰 방지
      this.nextFlockTime += delta;
      // 현재 위치에서 렌더링만 유지 (delta=0으로 위치·날갯짓 정지)
      for (const flock of this.flocks) flock.update(0);
      return;
    }

    // 착지 횟수 미달 시 스폰 타이머를 밀어 해금 직후 즉시 스폰 방지
    if (landings < OBSTACLE_CONFIG.BIRD_UNLOCK_LANDINGS) {
      this.nextFlockTime += delta;
      for (const flock of this.flocks) flock.update(delta);
      return;
    }

    // 새떼 첫 해금 시 유예 타이머 세팅 + 경고 콜백
    if (!this.birdsUnlocked) {
      this.birdsUnlocked = true;
      this.nextFlockTime = now + OBSTACLE_CONFIG.BIRD_UNLOCK_DELAY_MS;
      this._onFirstBirdUnlock?.();
    }

    if (now >= this.nextFlockTime) {
      this.spawnBirdFlock(cameraScrollY);
      // 번개 쿨다운 적용 (새떼·번개 5초 이내 동시 등장 방지)
      this.nextStormTime = Math.max(
        this.nextStormTime,
        now + ObstacleSystem.GLOBAL_COOLDOWN_MS,
      );
      this.nextFlockTime = now + Phaser.Math.Between(
        Math.round(this._birdIntervalMin),
        Math.round(this._birdIntervalMax),
      );
    }

    for (const flock of this.flocks) flock.update(delta);

    const offScreen = this.flocks.filter((f) => f.isOffScreen);
    for (const f of offScreen) f.destroy();
    this.flocks = this.flocks.filter((f) => !f.isOffScreen);
  }

  getFlocks(): BirdFlock[] { return this.flocks; }

  // ── 번개 폭풍 업데이트 ───────────────────────────────────

  /**
   * @param currentCloud - 플레이어가 현재 탑승 중인 구름섬 (WARNING 진입 시 타겟으로 잠금)
   * @returns 이 프레임에 번개가 충돌한 구름섬 id, 없으면 null
   */
  updateStorm(
    delta: number,
    now: number,
    cameraScrollY: number,
    currentCloud: CloudIsland | null,
    landings: number,
  ): string | null {
    if (this._isFrozen) {
      // 스폰 타이머 밀기
      this.nextStormTime += delta;
      // 진행 중인 폭풍은 현재 단계에서 렌더링만 유지 (delta=0)
      this.storm?.update(0, cameraScrollY);
      return null;
    }

    // 폭풍 없음 → 스폰 여부 확인
    if (this.storm === null) {
      // 착지 횟수 미달 시 스폰 타이머를 밀어 해금 직후 즉시 스폰 방지
      if (landings < OBSTACLE_CONFIG.STORM_UNLOCK_LANDINGS) {
        this.nextStormTime += delta;
        return null;
      }

      // 번개 첫 해금 시 유예 타이머 세팅 + 경고 콜백
      if (!this.stormUnlocked) {
        this.stormUnlocked = true;
        this.nextStormTime = now + OBSTACLE_CONFIG.STORM_FIRST_SPAWN_DELAY_MS;
        this._onFirstStormUnlock?.();
      }

      if (now >= this.nextStormTime) {
        this.storm = new LightningStorm(this.scene);
        // 새떼 쿨다운 적용 (새떼·번개 5초 이내 동시 등장 방지)
        this.nextFlockTime = Math.max(
          this.nextFlockTime,
          now + ObstacleSystem.GLOBAL_COOLDOWN_MS,
        );
        this.nextStormTime = now + Phaser.Math.Between(
          Math.round(this._stormIntervalMin),
          Math.round(this._stormIntervalMax),
        );
      }
      return null;
    }

    // WARNING 단계에서 타겟 주입
    if (this.storm.needsTarget && currentCloud !== null && !currentCloud.isFalling) {
      this.storm.setTarget(
        currentCloud.id,
        currentCloud.x,
        currentCloud.balloonZoneTopY,
      );
    }

    this.storm.update(delta, cameraScrollY);

    const hitId = this.storm.didHit ? this.storm.hitCloudId : null;

    if (this.storm.isDone) {
      this.storm.destroy();
      this.storm = null;
    }

    return hitId;
  }

  // ── 정리 ────────────────────────────────────────────────

  clearAll(): void {
    for (const f of this.flocks) f.destroy();
    this.flocks = [];
    this.storm?.destroy();
    this.storm = null;
  }

  // ── 내부 ────────────────────────────────────────────────

  private spawnBirdFlock(cameraScrollY: number): void {
    const minY = cameraScrollY + OBSTACLE_CONFIG.SPAWN_Y_MARGIN_TOP;
    const maxY = cameraScrollY + BASE_HEIGHT - OBSTACLE_CONFIG.SPAWN_Y_MARGIN_BOTTOM;
    if (minY >= maxY) return;

    const y     = Phaser.Math.Between(Math.ceil(minY), Math.floor(maxY));
    const speed = Phaser.Math.Between(
      OBSTACLE_CONFIG.BIRD_FLOCK_SPEED_MIN,
      OBSTACLE_CONFIG.BIRD_FLOCK_SPEED_MAX,
    );
    this.flocks.push(new BirdFlock(this.scene, -BASE_WIDTH * 0.15, y, speed));
  }
}
