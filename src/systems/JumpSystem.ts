import Phaser from 'phaser';
import type { Player } from '@entities/Player';
import type { CloudIsland } from '@entities/CloudIsland';
import { JumpPatternType } from '@game-types/game';
import { GAMEPLAY } from '@config/gameplayConfig';

export class JumpSystem {
  jump(
    player: Player,
    clouds: CloudIsland[],
    currentCloudId: string,
    chargeDuration: number,
    pattern: JumpPatternType,
    directionAngle: number = -Math.PI / 2,
  ): boolean {
    if (!player.isOnGround || player.isDead) return false;

    player.isOnGround = false;

    if (pattern === JumpPatternType.PATTERN_1) {
      // 포물선: 드래그 휠 방향 + VX/VY 분리 계산 + 비행 중 중력 적용 (GameScene에서 처리)
      this.applyParabolicVelocity(player, directionAngle, chargeDuration);
    } else if (pattern === JumpPatternType.PATTERN_2 || pattern === JumpPatternType.PATTERN_3) {
      // 직선: 드래그 휠 or 진자 타이밍 방향 + 단일 속도
      this.applyDirectionalVelocity(player, directionAngle, chargeDuration);
    } else {
      const target = this.findTarget(player, clouds, currentCloudId);
      this.applyStraightVelocity(player, target, chargeDuration);
    }

    return true;
  }

  // ─── 패턴 1: 포물선 ────────────────────────────────────────
  // VY(높이): 충전량에 비례해 선형 증가, 항상 위 방향 고정.
  //   → 게이지를 많이 채울수록 무조건 더 높이 올라감 (최대 ~2층).
  // VX(좌우): 드래그 각도의 수평 성분 × 충전량.
  //   → 각도가 좌우로 기울수록 수평 이동, 정 위(−π/2)면 VX = 0.
  // GameScene이 비행 중 중력을 적용해 포물선 궤도를 만든다.

  private applyParabolicVelocity(player: Player, angle: number, chargeDuration: number): void {
    const t = Phaser.Math.Clamp(
      (chargeDuration - GAMEPLAY.JUMP_CHARGE_MIN_MS) /
        (GAMEPLAY.JUMP_CHARGE_MAX_MS - GAMEPLAY.JUMP_CHARGE_MIN_MS),
      0,
      1,
    );

    // VY: 충전량 전 구간에서 선형 증가 (상한 = JUMP_MAX_VY_MAG ≈ 2층 높이)
    const vyMag = Phaser.Math.Linear(GAMEPLAY.JUMP_MIN_VY_MAG, GAMEPLAY.JUMP_MAX_VY_MAG, t);

    // VX: 각도 수평 성분 × 충전량 (cos(−π/2) = 0 → 정 위면 좌우 이동 없음)
    const vxMag = Phaser.Math.Linear(GAMEPLAY.JUMP_MIN_VX, GAMEPLAY.JUMP_MAX_VX, t);

    player.vy = -vyMag;                   // 항상 위 방향 (높이는 충전량만이 결정)
    player.vx = Math.cos(angle) * vxMag;  // 좌우는 휠 각도로 결정
  }

  // ─── 패턴 2·3: 방향 휠 직선 ────────────────────────────────

  private applyDirectionalVelocity(player: Player, angle: number, chargeDuration: number): void {
    const speed = this.calcStraightSpeed(chargeDuration);
    player.vx = Math.cos(angle) * speed;
    player.vy = Math.sin(angle) * speed;
  }

  // ─── auto-aim 직선 ──────────────────────────────────────────

  private applyStraightVelocity(
    player: Player,
    target: CloudIsland | null,
    chargeDuration: number,
  ): void {
    const speed = this.calcStraightSpeed(chargeDuration);

    if (target !== null) {
      const dx = target.x - player.x;
      const dy = target.topY - player.bottom;
      const dist = Math.hypot(dx, dy);
      if (dist > 0) {
        player.vx = (dx / dist) * speed;
        player.vy = (dy / dist) * speed;
        return;
      }
    }

    player.vx = 0;
    player.vy = -speed;
  }

  // ─── 공통 유틸 ─────────────────────────────────────────────

  private calcStraightSpeed(chargeDuration: number): number {
    const t = Phaser.Math.Clamp(
      (chargeDuration - GAMEPLAY.JUMP_CHARGE_MIN_MS) /
        (GAMEPLAY.JUMP_CHARGE_MAX_MS - GAMEPLAY.JUMP_CHARGE_MIN_MS),
      0,
      1,
    );
    return Phaser.Math.Linear(GAMEPLAY.JUMP_STRAIGHT_MIN_SPEED, GAMEPLAY.JUMP_STRAIGHT_MAX_SPEED, t);
  }

  findTarget(player: Player, clouds: CloudIsland[], currentCloudId: string): CloudIsland | null {
    const others = clouds.filter((c) => c.id !== currentCloudId);
    if (others.length === 0) return null;

    const above = others.filter((c) => c.y < player.y - 60);
    const pool = above.length > 0 ? above : others;

    return pool.reduce<CloudIsland>((best, c) => {
      const db = Math.hypot(best.x - player.x, best.y - player.y);
      const dc = Math.hypot(c.x - player.x, c.y - player.y);
      return dc < db ? c : best;
    }, pool[0] as CloudIsland);
  }
}
