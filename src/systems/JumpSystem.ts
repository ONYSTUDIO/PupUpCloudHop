import Phaser from 'phaser';
import type { Player } from '@entities/Player';
import type { CloudIsland } from '@entities/CloudIsland';
import { JumpPatternType } from '@game-types/game';
import { GAMEPLAY } from '@config/gameplayConfig';

export class JumpSystem {
  /**
   * 충전 시간과 패턴에 따라 플레이어 속도를 적용한다.
   * @param directionAngle PATTERN_1 전용. 방향 휠 각도(라디안). 기본값: 정 위(-π/2)
   */
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
      // 방향 휠이 지정한 각도로 직선 이동
      this.applyDirectionalVelocity(player, directionAngle, chargeDuration);
    } else {
      // 가장 가까운 구름으로 자동 조준 직선 이동
      const target = this.findTarget(player, clouds, currentCloudId);
      this.applyStraightVelocity(player, target, chargeDuration);
    }

    return true;
  }

  // ─── 패턴 1: 방향 휠 직선 ──────────────────────────────

  private applyDirectionalVelocity(
    player: Player,
    angle: number,
    chargeDuration: number,
  ): void {
    const speed = this.calcSpeed(chargeDuration);
    player.vx = Math.cos(angle) * speed;
    player.vy = Math.sin(angle) * speed;
  }

  // ─── 패턴 2: 자동 조준 직선 ────────────────────────────

  private applyStraightVelocity(
    player: Player,
    target: CloudIsland | null,
    chargeDuration: number,
  ): void {
    const speed = this.calcSpeed(chargeDuration);

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

  // ─── 공통 유틸 ─────────────────────────────────────────

  private calcSpeed(chargeDuration: number): number {
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
